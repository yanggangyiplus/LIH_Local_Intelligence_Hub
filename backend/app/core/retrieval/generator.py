"""
RAG 답변 생성 모듈.
검색된 컨텍스트 + LLM(Ollama)으로 답변 생성.
스트리밍 지원.
"""

from typing import AsyncGenerator, Optional

from ollama import AsyncClient

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.core.retrieval.retriever import Retriever
from app.models.schemas import QueryChunk

logger = get_logger(__name__)

RAG_SYSTEM_PROMPT = """당신은 로컬 파일 기반 지식 어시스턴트입니다.
참조 문서(컨텍스트)가 주어지면, 반드시 그 내용을 바탕으로 답변하세요.

[중요] "이 폴더가 뭐야?", "이 프로젝트는?", "무슨 폴더야?" 같은 질문:
- 참조 문서에서 프로젝트명(예: LIH, Local Intelligence Hub)을 그대로 추출하여 사용하세요. "OOO" 같은 placeholder를 쓰지 마세요.
- "이 폴더는 LIH(Local Intelligence Hub) 프로젝트입니다. ..." 형태로 참조 문서 내용을 요약해 답하세요.
- 문서에 프로젝트명, 목적, 기능 설명이 있는데 "찾을 수 없습니다"라고 하지 마세요.

정말로 참조 문서에 전혀 관련 내용이 없을 때만 "제공된 문서에서는 해당 정보를 찾을 수 없습니다"라고 하세요.
답변 시 출처를 [파일경로] 형식으로 명시하세요. 예: [README.md], [docs/ARCHITECTURE.md]
한국어로 답변하세요.""" 


class RAGGenerator:
    """RAG 기반 질의응답 생성."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.retriever = Retriever()
        self._client: Optional[AsyncClient] = None

    @property
    def client(self) -> AsyncClient:
        if self._client is None:
            self._client = AsyncClient(host=self.settings.ollama_base_url)
        return self._client

    def _format_chunks_as_answer(self, query: str, chunks: list[QueryChunk]) -> str:
        """Ollama 미사용 시 검색 결과를 요약 형태로 반환."""
        lines = [
            f"질문: {query}",
            "",
            "⚠️ Ollama가 실행 중이지 않아 AI 요약을 생성할 수 없습니다. (ollama serve 실행 후 사용 가능)",
            "",
            "--- 검색된 관련 문서 ---",
        ]
        for i, c in enumerate(chunks[:5], 1):
            lines.append(f"\n[{i}] {c.file_path} (유사도: {c.score:.2f})")
            lines.append(c.content[:500] + ("..." if len(c.content) > 500 else ""))
        return "\n".join(lines)

    def _build_context(self, chunks: list[QueryChunk]) -> str:
        """검색된 청크를 LLM 컨텍스트 문자열로 변환."""
        parts = []
        for c in chunks:
            parts.append(f"[{c.file_path}]\n{c.content}")
        return "\n\n---\n\n".join(parts)

    def _build_messages(self, query: str, context: str) -> list[dict]:
        """LLM 메시지 구성."""
        q = query.strip().lower()
        hint = ""
        if any(t in q for t in ("폴더", "뭐", "무엇", "무슨", "이거", "이게", "프로젝트", "설명", "개요")):
            hint = "\n(참조 문서에 README, 아키텍처, 프로젝트 설명이 있으면 반드시 그 내용을 요약하여 답하세요.)\n\n"
        user_content = f"""참조 문서:
{context}
{hint}질문: {query}"""
        return [
            {"role": "system", "content": RAG_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

    async def generate(
        self,
        query: str,
        top_k: int = 5,
        scope: str = "all",
        scope_path: Optional[str] = None,
    ) -> tuple[str, list[QueryChunk], Optional[str]]:
        """
        RAG 답변 생성 (비스트리밍).
        Returns:
            (답변, 출처 청크 목록, 사용된 모델명)
        """
        chunks = self.retriever.search(query, top_k=top_k, scope=scope, scope_path=scope_path)
        if not chunks:
            return (
                "검색된 관련 문서가 없습니다.\n"
                "• 인덱싱을 먼저 완료했는지 확인해주세요. (로컬 지식 엔진 → 인덱싱 시작)\n"
                "• 인덱싱이 완료된 후에도 검색이 안 되면, 질문을 다르게 표현해보거나 scope(폴더 범위)를 확인해주세요.",
                [],
                None,
            )

        context = self._build_context(chunks)
        messages = self._build_messages(query, context)

        try:
            response = await self.client.chat(
                model=self.settings.ollama_chat_model,
                messages=messages,
            )
            content = getattr(response.message, "content", "") or ""
            return content, chunks, self.settings.ollama_chat_model
        except Exception as e:
            logger.error("RAG 생성 실패 (Ollama 미실행), 검색 결과로 폴백", error=str(e))
            # Ollama 미실행 시 검색된 청크를 요약 형태로 반환
            fallback = self._format_chunks_as_answer(query, chunks)
            return fallback, chunks, None

    async def generate_stream(
        self,
        query: str,
        top_k: int = 5,
        scope: str = "all",
        scope_path: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        RAG 답변 스트리밍 생성.
        Yields: {"type": "sources", "chunks": [...]} | {"type": "token", "content": "..."} | {"type": "done"}
        """
        chunks = self.retriever.search(query, top_k=top_k, scope=scope, scope_path=scope_path)
        yield {
            "type": "sources",
            "chunks": [c.model_dump() for c in chunks],
        }

        if not chunks:
            yield {
                "type": "token",
                "content": "검색된 관련 문서가 없습니다. 인덱싱을 먼저 완료했는지, 질문 표현을 바꿔보세요.",
            }
            yield {"type": "done"}
            return

        context = self._build_context(chunks)
        messages = self._build_messages(query, context)

        try:
            stream = self.client.chat(
                model=self.settings.ollama_chat_model,
                messages=messages,
                stream=True,
            )
            async for part in stream:
                content = getattr(part.message, "content", "") or ""
                if content:
                    yield {"type": "token", "content": content}
            yield {"type": "done"}
        except Exception as e:
            logger.error("RAG 스트리밍 실패 (Ollama 미실행), 검색 결과로 폴백", error=str(e))
            fallback = self._format_chunks_as_answer(query, chunks)
            yield {"type": "token", "content": fallback}
            yield {"type": "done"}
