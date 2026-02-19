"""
의미(시맨틱) 검색 모듈. RAG 질의응답의 검색 단계.

ChromaDB 유사도 검색. 프로젝트·주제 단위 검색 지원.
짧은/모호한 질문은 쿼리 확장으로 검색 품질 개선. 로컬 인덱스만 사용.
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

# 짧은/모호한 질문용 확장 키워드 (프로젝트/폴더 설명 검색용)
QUERY_EXPANSION_KEYWORDS = "프로젝트 설명 README 아키텍처 개요 목적 기능 로컬 AI"

# "이 폴더가 뭐야" 질문 시 README/문서 검색용 전용 쿼리 (코드 파일 대신 설명 문서 우선)
README_FIRST_QUERY = "README 프로젝트 소개 Local Intelligence Hub LIH 로컬 AI 파일 정리 RAG"


def _is_folder_what_question(query: str) -> bool:
    """'이 폴더가 뭐야'류 질문인지 판별."""
    q = query.strip().lower()
    if len(q) > 30:
        return False
    triggers = ("폴더", "뭐", "무엇", "무슨", "이거", "이게", "이 폴더", "이 프로젝트", "설명", "개요", "소개")
    return any(t in q for t in triggers)


def _expand_query_for_short_questions(query: str) -> list[str]:
    """
    짧거나 '이 폴더/프로젝트가 뭐야'류 질문일 때 검색 쿼리 확장.
    Returns:
        [원본, 확장쿼리] - 둘 다 검색 후 결과 병합
    """
    q = query.strip()
    if len(q) < 25:  # 짧은 질문
        triggers = ("폴더", "뭐", "무엇", "무슨", "이거", "이게", "이 폴더", "이 프로젝트", "설명", "개요", "소개")
        if any(t in q for t in triggers):
            expanded = f"{q} {QUERY_EXPANSION_KEYWORDS}"
            return [q, expanded]
    return [q]


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
        if collection.count() == 0:
            logger.info("ChromaDB 컬렉션이 비어있음. 인덱싱을 먼저 진행해주세요.")
            return []

        where = None
        if scope == "folder" and scope_path:
            where = {"folder_path": scope_path}
        elif scope == "file" and scope_path:
            where = {"file_path": scope_path}
        elif scope == "project" and scope_path:
            where = {"folder_path": scope_path}

        def _do_search(q: str) -> list[QueryChunk]:
            """단일 쿼리로 검색 수행."""
            for use_st in [False, True]:
                try:
                    query_embedding = self.embedder.embed([q], force_sentence_transformers=use_st)[0]
                    results = collection.query(
                        query_embeddings=[query_embedding],
                        n_results=top_k,
                        where=where,
                        include=["documents", "metadatas", "distances"],
                    )
                    docs = results.get("documents", [[]])[0]
                    metas = results.get("metadatas", [[]])[0]
                    dists = results.get("distances", [[]])[0]
                    out: list[QueryChunk] = []
                    for i, (doc, meta, dist) in enumerate(zip(docs, metas, dists)):
                        score = 1.0 / (1.0 + dist) if dist is not None else 1.0
                        out.append(
                            QueryChunk(
                                content=doc or "",
                                file_path=meta.get("file_path", ""),
                                chunk_index=meta.get("chunk_index", i),
                                score=round(score, 4),
                            )
                        )
                    return out
                except Exception as e:
                    err_str = str(e)
                    if "dimension" in err_str.lower() and not use_st:
                        logger.warning("임베딩 차원 불일치, sentence-transformers로 재시도", error=err_str)
                        continue
                    logger.warning("ChromaDB 검색 실패", error=err_str)
                    return []
            return []

        # "이 폴더가 뭐야"류 질문: README/문서 전용 검색을 먼저 수행해 설명 문서 우선 확보
        seen_keys: set[tuple[str, int]] = set()
        all_chunks: list[QueryChunk] = []

        if _is_folder_what_question(query):
            readme_chunks = _do_search(README_FIRST_QUERY)
            for c in readme_chunks:
                key = (c.file_path, c.chunk_index)
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_chunks.append(c)

        # 기존 시맨틱 검색 (확장 쿼리 포함)
        queries_to_try = _expand_query_for_short_questions(query)
        for q in queries_to_try:
            chunks = _do_search(q)
            for c in chunks:
                key = (c.file_path, c.chunk_index)
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_chunks.append(c)

        # "이 폴더가 뭐야"류: README/docs 청크를 반드시 상위에 (코드 파일 __init__.py 등 제외)
        def _sort_key(c: QueryChunk) -> tuple:
            fp = (c.file_path or "").lower()
            # README, docs 문서는 최우선. 코드/__init__ 등은 하위로
            if "readme" in fp:
                return (0, -c.score, fp)  # 0 = 최우선
            if "arch" in fp or "/docs/" in fp or fp.endswith("architecture.md"):
                return (1, -c.score, fp)
            if fp.endswith(".md"):
                return (2, -c.score, fp)
            if "__init__.py" in fp or ".py" in fp:  # 코드 파일은 후순위
                return (4, -c.score, fp)
            return (3, -c.score, fp)

        all_chunks.sort(key=_sort_key)

        return all_chunks[:top_k]
