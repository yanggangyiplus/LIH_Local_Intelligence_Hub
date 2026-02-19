"""
지식 인덱서 (로컬 전용).

로컬 파일만 대상: 파일 스캔 → 텍스트 추출 → 청킹 → 임베딩 → ChromaDB 저장.
클라우드 업로드·외부 데이터 전송 없음. 프로젝트·주제 단위 검색을 위한 벡터 저장.
"""

import asyncio
import uuid
from pathlib import Path
from typing import AsyncGenerator, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings
from app.core.indexing.chunker import TextChunker
from app.core.indexing.embedder import Embedder
from app.core.indexing.extractor import TextExtractor
from app.core.logging_config import get_logger
from app.utils.safe_file_ops import create_safe_ops_for_root

logger = get_logger(__name__)

COLLECTION_NAME = "local_knowledge"

# 항상 제외할 디렉토리 (fnmatch가 ** 패턴을 제대로 처리 못하므로 이름으로 직접 체크)
_ALWAYS_EXCLUDE_DIRS = frozenset({
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    ".tox", ".mypy_cache", ".pytest_cache", ".next", ".nuxt",
    "dist", "build", ".cache", ".parcel-cache", "target",
})


class KnowledgeIndexer:
    """
    로컬 파일 기반 RAG 인덱싱.

    문서·프로젝트·개인 자료를 인덱싱해 의미 검색·질의응답 가능하게 함.
    ChromaDB에 벡터 저장. 모든 처리 로컬 수행.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.extractor = TextExtractor()
        self.chunker = TextChunker()
        self.embedder = Embedder()
        self._client: Optional[chromadb.PersistentClient] = None

    @property
    def client(self) -> chromadb.PersistentClient:
        """ChromaDB 클라이언트 lazy 초기화."""
        if self._client is None:
            path = self.settings.chroma_persist_dir
            path.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(
                path=str(path),
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self._client

    def get_collection(self, name: str = COLLECTION_NAME):
        """컬렉션 가져오기 (없으면 생성)."""
        return self.client.get_or_create_collection(
            name=name,
            metadata={"description": "Local Intelligence Hub knowledge base"},
        )

    def _collect_files(self, root: Path, exclude_patterns: list[str]) -> list[Path]:
        """인덱싱할 파일 목록 수집."""
        safe_ops = create_safe_ops_for_root(root)
        files: list[Path] = []

        def walk(p: Path, depth: int) -> None:
            if depth > self.settings.max_scan_depth:
                return
            for item in safe_ops.list_dir_safe(p, include_files=True, include_dirs=True):
                if item.is_dir():
                    # 디렉토리명으로 빠른 제외 (node_modules, .git 등)
                    if item.name in _ALWAYS_EXCLUDE_DIRS:
                        continue
                    rel = str(item.relative_to(root))
                    skip = any(
                        _fnmatch(rel, pat) for pat in exclude_patterns
                    )
                    if not skip:
                        walk(item, depth + 1)
                elif self.extractor.can_extract(item):
                    files.append(item)

        walk(root, 0)
        return files

    async def index_folder(
        self,
        root_path: str,
        job_id: str,
        include_patterns: Optional[list[str]] = None,
        exclude_patterns: Optional[list[str]] = None,
        force_reindex: bool = False,
    ) -> AsyncGenerator[dict, None]:
        """
        폴더 인덱싱 (비동기 스트리밍).
        진행 상황을 yield로 전달.
        """
        root = Path(root_path).resolve()
        exclude = exclude_patterns or [
            "**/node_modules/**",
            "**/.git/**",
            "**/__pycache__/**",
            "**/*.pyc",
        ]

        files = await asyncio.to_thread(
            self._collect_files, root, exclude
        )
        total = len(files)

        collection = self.get_collection()

        # 동일 폴더의 이전 인덱스 데이터 삭제 (재인덱싱 시 오래된 결과 방지)
        try:
            existing = collection.get(where={"folder_path": str(root)})
            if existing and existing["ids"]:
                logger.info("이전 인덱스 삭제", folder=str(root), count=len(existing["ids"]))
                for batch_start in range(0, len(existing["ids"]), 500):
                    batch_ids = existing["ids"][batch_start:batch_start + 500]
                    collection.delete(ids=batch_ids)
        except Exception as e:
            logger.warning("이전 인덱스 삭제 실패 (계속 진행)", error=str(e))
        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict] = []

        for i, fpath in enumerate(files):
            text = await asyncio.to_thread(self.extractor.extract, fpath)
            if not text or not text.strip():
                yield {"progress": (i + 1) / total, "current": str(fpath), "status": "skipped"}
                continue

            rel_path = str(fpath.relative_to(root))
            for chunk_text, chunk_idx in self.chunker.chunk(text, str(fpath)):
                doc_id = f"{job_id}_{uuid.uuid4().hex[:12]}"
                ids.append(doc_id)
                documents.append(chunk_text)
                metadatas.append({
                    "file_path": str(fpath),
                    "chunk_index": chunk_idx,
                    "source_type": fpath.suffix.lower(),
                    "index_job_id": job_id,
                    "folder_path": str(root),
                    "relative_path": rel_path,
                })

            # 배치 임베딩 (청크 수가 많으면 나눠서)
            if len(documents) >= 32:
                embeds = await asyncio.to_thread(self.embedder.embed, documents)
                collection.add(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeds)
                ids, documents, metadatas = [], [], []

            yield {"progress": (i + 1) / total, "current": str(fpath), "status": "indexed"}

        if documents:
            embeds = await asyncio.to_thread(self.embedder.embed, documents)
            collection.add(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeds)

        yield {"progress": 1.0, "current": "", "status": "completed", "total_files": total}


def _fnmatch(path: str, pattern: str) -> bool:
    """간단한 fnmatch 스타일 매칭."""
    import fnmatch
    return fnmatch.fnmatch(path, pattern)
