"""
Local Knowledge Engine (RAG) - 검색 및 질의응답 모듈.

로컬 인덱스만 사용: 시맨틱(의미) 검색, 파일 내용·맥락 반영 질의응답.
Ollama LLM + ChromaDB. 프로젝트·주제 단위 검색 지원. 외부 전송 없음.
"""

from app.core.retrieval.retriever import Retriever
from app.core.retrieval.generator import RAGGenerator

__all__ = ["Retriever", "RAGGenerator"]
