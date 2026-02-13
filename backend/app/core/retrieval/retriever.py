"""
시맨틱 검색 모듈.
ChromaDB를 이용한 유사도 검색.
"""

from pathlib import Path
from typing import Optional

import chromadb

from app.core.config import get_settings
from app.core.indexing.embedder import Embedder
from app.core.indexing.indexer import COLLECTION_NAME, KnowledgeIndexer
from app.core.logging_config import get_logger
from app.models.schemas import QueryChunk

logger = get_logger(__name__)


class Retriever:
    """
    벡터 DB 기반 시맨틱 검색.
    scope에 따라 전체/폴더/파일 필터링 지원.
    """

    def __init__(self) -> None:
        self.indexer = KnowledgeIndexer()
        self.embedder = Embedder()

    def search(
        self,
        query: str,
        top_k: int = 5,
        scope: str = "all",
        scope_path: Optional[str] = None,
    ) -> list[QueryChunk]:
        """
        시맨틱 검색 수행.
        Args:
            query: 검색 쿼리
            top_k: 반환할 상위 k개
            scope: all | folder | project | file
            scope_path: scope가 folder/project/file일 때 경로
        """
        collection = self.indexer.get_collection(COLLECTION_NAME)
        where = None
        if scope == "folder" and scope_path:
            where = {"folder_path": scope_path}
        elif scope == "file" and scope_path:
            where = {"file_path": scope_path}
        elif scope == "project" and scope_path:
            where = {"folder_path": scope_path}

        # 인덱싱 시점과 쿼리 시점 임베딩 모델이 다를 수 있음 (384 vs 768)
        # dimension mismatch 시 sentence-transformers로 재시도
        for use_st in [False, True]:
            query_embedding = self.embedder.embed([query], force_sentence_transformers=use_st)[0]
            try:
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where=where,
                    include=["documents", "metadatas", "distances"],
                )
                break
            except Exception as e:
                err_str = str(e)
                if "dimension" in err_str.lower() and not use_st:
                    logger.warning("임베딩 차원 불일치, sentence-transformers로 재시도", error=err_str)
                    continue
                logger.warning("ChromaDB 검색 실패", error=err_str)
                return []

        chunks: list[QueryChunk] = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]

        for i, (doc, meta, dist) in enumerate(zip(docs, metas, dists)):
            # ChromaDB distance: 낮을수록 가까움. 1 - normalized로 score화 가능
            score = 1.0 / (1.0 + dist) if dist is not None else 1.0
            chunks.append(
                QueryChunk(
                    content=doc or "",
                    file_path=meta.get("file_path", ""),
                    chunk_index=meta.get("chunk_index", i),
                    score=round(score, 4),
                )
            )
        return chunks
