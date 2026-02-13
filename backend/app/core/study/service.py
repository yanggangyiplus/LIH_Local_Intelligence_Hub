"""
Study & Context Engine 서비스.
개념 추출, 요약, 질문 생성, 학습 계획, 개념 연결.
"""

import json
from pathlib import Path
from typing import Any, Optional

from ollama import AsyncClient

from app.core.config import get_settings
from app.core.indexing.extractor import TextExtractor
from app.core.indexing.indexer import KnowledgeIndexer
from app.core.logging_config import get_logger
from app.core.retrieval.retriever import Retriever
from app.models.schemas import ConceptExtractionResult, StudyPlanResult

logger = get_logger(__name__)


class StudyService:
    """학습 및 컨텍스트 엔진."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.extractor = TextExtractor()
        self.indexer = KnowledgeIndexer()
        self.retriever = Retriever()
        self._client: Optional[AsyncClient] = None

    @property
    def client(self) -> AsyncClient:
        if self._client is None:
            self._client = AsyncClient(host=self.settings.ollama_base_url)
        return self._client

    async def extract_concepts(self, root_path: str, options: dict[str, Any] | None = None) -> ConceptExtractionResult:
        """선택 폴더에서 핵심 개념 추출."""
        root = Path(root_path)
        texts: list[tuple[str, str]] = []
        for f in root.rglob("*"):
            if f.is_file() and self.extractor.can_extract(f):
                t = self.extractor.extract(f)
                if t and len(t) > 100:
                    texts.append((str(f), t[:8000]))

        if not texts:
            return ConceptExtractionResult(concepts=[], file_links={})

        combined = "\n\n---\n\n".join(f"[{p}]\n{t}" for p, t in texts[:20])
        prompt = f"""다음 문서들에서 핵심 개념(키워드/테마)을 추출해 JSON 배열로 나열하세요.
각 개념에 id, name, description, relevance(1-5)를 포함하세요.

문서:
{combined[:15000]}

출력 형식 (JSON만):
[{{"id": "c1", "name": "개념명", "description": "설명", "relevance": 4}}, ...]"""

        try:
            response = await self.client.chat(
                model=self.settings.ollama_chat_model,
                messages=[{"role": "user", "content": prompt}],
            )
            content = getattr(response.message, "content", "") or ""
            arr = _extract_json_array(content)
            concepts = arr if isinstance(arr, list) else []
            file_links: dict[str, list[str]] = {}
            for c in concepts:
                cid = c.get("id", str(len(file_links)))
                file_links[cid] = [p for p, _ in texts[:10]]
            return ConceptExtractionResult(concepts=concepts, file_links=file_links)
        except Exception as e:
            logger.error("개념 추출 실패", error=str(e))
            return ConceptExtractionResult(concepts=[], file_links={})

    async def generate_summary(self, root_path: str, options: dict[str, Any] | None = None) -> str:
        """폴더/문서 요약 생성."""
        chunks = self.retriever.search(
            "이 폴더/프로젝트의 전반적인 내용을 요약해주세요.",
            top_k=10,
            scope="folder",
            scope_path=root_path,
        )
        if not chunks:
            return "인덱싱된 내용이 없습니다. 먼저 해당 폴더를 인덱싱해주세요."

        context = "\n\n".join(c.content for c in chunks)
        prompt = f"""다음 내용을 3-5문장으로 간결히 요약해주세요. 한국어로 작성하세요.

{context[:6000]}"""

        try:
            response = await self.client.chat(
                model=self.settings.ollama_chat_model,
                messages=[{"role": "user", "content": prompt}],
            )
            return getattr(response.message, "content", "") or "요약을 생성할 수 없습니다."
        except Exception as e:
            logger.error("요약 생성 실패", error=str(e))
            return f"요약 생성 중 오류: {e}"

    async def generate_questions(self, root_path: str, options: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """학습용 질문 생성."""
        chunks = self.retriever.search("핵심 내용", top_k=8, scope="folder", scope_path=root_path)
        if not chunks:
            return []

        context = "\n\n".join(c.content for c in chunks)
        prompt = f"""다음 내용을 기반으로 학습용 객관식/주관식 질문 5개를 만들어주세요.
JSON 배열로 출력하세요: [{{"question": "질문", "type": "multiple_choice|short_answer", "options": ["A","B"] (객관식일 때), "answer": "정답"}}]

내용:
{context[:5000]}"""

        try:
            response = await self.client.chat(
                model=self.settings.ollama_chat_model,
                messages=[{"role": "user", "content": prompt}],
            )
            content = getattr(response.message, "content", "") or ""
            arr = _extract_json_array(content)
            return arr if isinstance(arr, list) else []
        except Exception as e:
            logger.error("질문 생성 실패", error=str(e))
            return []

    async def generate_interview_questions(self, root_path: str, options: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """면접 질문 생성."""
        chunks = self.retriever.search("핵심 기술, 개념, 아키텍처", top_k=8, scope="folder", scope_path=root_path)
        if not chunks:
            return []

        context = "\n\n".join(c.content for c in chunks)
        prompt = f"""다음 기술 문서/코드 기반으로 기술 면접 질문 5개를 만들어주세요.
JSON 배열: [{{"question": "질문", "hint": "힌트", "expected_answer": "예상 답변 요약"}}]

내용:
{context[:5000]}"""

        try:
            response = await self.client.chat(
                model=self.settings.ollama_chat_model,
                messages=[{"role": "user", "content": prompt}],
            )
            content = getattr(response.message, "content", "") or ""
            arr = _extract_json_array(content)
            return arr if isinstance(arr, list) else []
        except Exception as e:
            logger.error("면접 질문 생성 실패", error=str(e))
            return []

    async def generate_study_plan(self, root_path: str, options: dict[str, Any] | None = None) -> StudyPlanResult:
        """학습 계획 생성."""
        concepts = await self.extract_concepts(root_path, options)
        summary = await self.generate_summary(root_path, options)

        prompt = f"""다음 요약과 개념을 바탕으로 학습 계획을 JSON 배열로 만들어주세요.
각 단계: {{"order": 1, "title": "단계명", "description": "설명", "estimated_minutes": 30, "concepts": ["개념1"]}}

요약: {summary}
개념: {[c.get('name','') for c in concepts.concepts[:15]]}

출력 (JSON 배열만):"""

        try:
            response = await self.client.chat(
                model=self.settings.ollama_chat_model,
                messages=[{"role": "user", "content": prompt}],
            )
            content = getattr(response.message, "content", "") or ""
            arr = _extract_json_array(content)
            plan = arr if isinstance(arr, list) else []
            total = sum(p.get("estimated_minutes", 0) for p in plan if isinstance(p, dict))
            return StudyPlanResult(plan=plan, estimated_duration_minutes=total or None)
        except Exception as e:
            logger.error("학습 계획 생성 실패", error=str(e))
            return StudyPlanResult(plan=[], estimated_duration_minutes=None)


def _extract_json_array(text: str) -> Any:
    """텍스트에서 JSON 배열 추출."""
    text = text.strip()
    if "```" in text:
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            text = text[start:end]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return []
