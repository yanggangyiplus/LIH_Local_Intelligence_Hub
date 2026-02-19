"""
로컬 파일 인덱싱 모듈.

사용자 지정 폴더의 문서·프로젝트·개인 자료를 인덱싱해 AI가 이해·검색 가능하게 함.
텍스트 추출 → 청킹 → 임베딩 → ChromaDB 저장. 완전 로컬 처리, 외부 전송 없음.
RAG 의미 검색·질의응답의 기반.
"""

from app.core.indexing.extractor import TextExtractor
from app.core.indexing.chunker import TextChunker
from app.core.indexing.embedder import Embedder
from app.core.indexing.indexer import KnowledgeIndexer

__all__ = [
    "TextExtractor",
    "TextChunker",
    "Embedder",
    "KnowledgeIndexer",
]
