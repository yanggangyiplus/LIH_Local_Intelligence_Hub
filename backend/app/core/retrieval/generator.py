"""
RAG 질의응답 생성 모듈.

검색된 컨텍스트 + LLM(OpenAI/Ollama)으로 파일 내용·맥락 기반 답변 생성.
LLM Provider 추상화 레이어를 통해 백엔드 자동 선택.
"""

from typing import AsyncGenerator, Optional

from app.core.config import get_settings
from app.core.llm.provider import get_llm_provider
from app.core.logging_config import get_logger
from app.core.retrieval.retriever import Retriever
from app.models.schemas import QueryChunk

logger = get_logger(__name__)

RAG_SYSTEM_PROMPT = """당신은 로컬 파일 기반 지식 어시스턴트입니다. 모든 답변은 반드시 한국어로만 작성하세요. 일본어나 영어로 답하지 마세요.

규칙:
1. 참조 문서(컨텍스트)에 있는 내용만 바탕으로 답하세요. 프로젝트명·기능·구조는 문서에 나온 그대로 사용하세요.
2. "이 폴더/프로젝트가 뭐야?" 같은 질문에는 README·설명 파일 내용을 요약해 주세요.
3. 참조 문서에 관련 내용이 없을 때만 "제공된 문서에서는 해당 정보를 찾을 수 없습니다"라고 하세요.
4. 답변 말미에 출처를 [파일경로] 형식으로 명시하세요.
5. 문장은 짧고 명확하게, 불필요한 수식은 줄이세요."""


class RAGGenerator:
    """RAG 기반 질의응답 생성. LLM Provider 추상화 사용."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.retriever = Retriever()

    @property
    def llm(self):
        return get_llm_provider()

    def _format_chunks_as_answer(self, query: str, chunks: list[QueryChunk]) -> str:
        """LLM 미사용 시 검색 결과를 요약 형태로 반환."""
        lines = [
            f"질문: {query}",
            "",
            "⚠️ LLM이 실행 중이지 않아 AI 요약을 생성할 수 없습니다.",
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
        if any(t in q for t in ("폴더", "뭐", "무엇", "무슨", "이거", "이게", "프로젝트", "설명", "개요", "핵심")):
            hint = "\n(참조 문서의 README·아키텍처·프로젝트 설명을 바탕으로 한국어로 요약해 답하세요.)\n\n"
        user_content = f"""참조 문서:
{context}
{hint}질문: {query}
답변은 반드시 한국어로만 작성하세요."""
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
        Returns: (답변, 출처 청크 목록, 사용된 모델명)
        """
        chunks = self.retriever.search(query, top_k=top_k, scope=scope, scope_path=scope_path)
        if not chunks:
            return (
                "검색된 관련 문서가 없습니다.\n"
                "• 인덱싱을 먼저 완료했는지 확인해주세요.\n"
                "• 질문을 다르게 표현해보거나 scope를 확인해주세요.",
                [],
                None,
            )

        context = self._build_context(chunks)
        messages = self._build_messages(query, context)

        try:
            content = await self.llm.chat(messages)
            return content, chunks, self.llm.default_model
        except Exception as e:
            logger.error("RAG 생성 실패, 검색 결과로 폴백", error=str(e))
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
        Yields: {"type": "sources", ...} | {"type": "token", ...} | {"type": "done"}
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
            async for token in self.llm.chat_stream(messages):
                yield {"type": "token", "content": token}
            yield {"type": "done"}
        except Exception as e:
            logger.error("RAG 스트리밍 실패, 검색 결과로 폴백", error=str(e))
            fallback = self._format_chunks_as_answer(query, chunks)
            yield {"type": "token", "content": fallback}
            yield {"type": "done"}
