"""
Study & Context Engine 서비스.
개념 추출, 요약, 질문 생성, 학습 계획, 면접 질문.
LLM Provider 추상화 레이어를 통해 OpenAI/Ollama 자동 선택.
"""

import json
from pathlib import Path
from typing import Any, Optional

from app.core.config import get_settings
from app.core.indexing.extractor import TextExtractor
from app.core.indexing.indexer import KnowledgeIndexer
from app.core.llm.provider import get_llm_provider
from app.core.logging_config import get_logger
from app.core.retrieval.retriever import Retriever
from app.models.schemas import ConceptExtractionResult, StudyPlanResult

logger = get_logger(__name__)


class StudyService:
    """학습 및 컨텍스트 엔진. LLM Provider 추상화 사용."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.extractor = TextExtractor()
        self.indexer = KnowledgeIndexer()
        self.retriever = Retriever()

    @property
    def llm(self):
        return get_llm_provider()

    _SKIP_DIRS = frozenset({
        "node_modules", ".git", "__pycache__", ".venv", "venv",
        ".tox", ".mypy_cache", ".next", "dist", "build", ".cache", "target",
    })

    def _read_files_directly(self, root_path: str, max_files: int = 20, max_chars: int = 8000) -> str:
        """인덱싱 없이 폴더에서 직접 파일을 읽어 컨텍스트 생성."""
        root = Path(root_path)
        texts: list[str] = []
        for f in root.rglob("*"):
            # node_modules 등 무거운 디렉토리 건너뛰기
            if any(part in self._SKIP_DIRS for part in f.parts):
                continue
            if f.is_file() and self.extractor.can_extract(f):
                t = self.extractor.extract(f)
                if t and len(t.strip()) > 50:
                    texts.append(f"[{f.name}]\n{t[:max_chars]}")
                    if len(texts) >= max_files:
                        break
        return "\n\n---\n\n".join(texts)

    async def extract_concepts(self, root_path: str, options: dict[str, Any] | None = None) -> ConceptExtractionResult:
        """선택 폴더에서 핵심 개념 추출."""
        root = Path(root_path)
        texts: list[tuple[str, str]] = []
        for f in root.rglob("*"):
            if any(part in self._SKIP_DIRS for part in f.parts):
                continue
            if f.is_file() and self.extractor.can_extract(f):
                t = self.extractor.extract(f)
                if t and len(t) > 100:
                    texts.append((str(f), t[:8000]))

        if not texts:
            return ConceptExtractionResult(concepts=[], file_links={})

        combined = "\n\n---\n\n".join(f"[{p}]\n{t}" for p, t in texts[:20])
        sys_msg = "당신은 문서 분석 전문가입니다. 반드시 한국어로만 답하고, 출력은 JSON 배열만 하세요. 다른 언어를 섞지 마세요."
        prompt = f"""다음 문서들에서 핵심 개념(키워드/테마)을 추출해 JSON 배열로 나열하세요.
각 개념에 id(문자열), name, description, relevance(1-5 숫자)를 포함하세요. name과 description은 한국어로 작성하세요.

문서:
{combined[:15000]}

출력 (JSON 배열만, 다른 텍스트 없이):
[{{"id": "c1", "name": "개념명", "description": "설명", "relevance": 4}}, ...]"""

        try:
            content = await self.llm.chat([{"role": "system", "content": sys_msg}, {"role": "user", "content": prompt}])
            arr = _extract_json_array(content)
            concepts = arr if isinstance(arr, list) else []
            file_links: dict[str, list[str]] = {}
            for c in concepts:
                # LLM이 id를 정수로 반환할 수 있으므로 항상 문자열로 변환
                cid = str(c.get("id", len(file_links)))
                file_links[cid] = [p for p, _ in texts[:10]]
            return ConceptExtractionResult(concepts=concepts, file_links=file_links)
        except Exception as e:
            logger.error("개념 추출 실패", error=str(e))
            return ConceptExtractionResult(concepts=[], file_links={})

    async def generate_summary(self, root_path: str, options: dict[str, Any] | None = None) -> str:
        """폴더/문서 요약 생성. 인덱싱된 데이터 우선, 없으면 파일 직접 읽기."""
        chunks = self.retriever.search(
            "이 폴더/프로젝트의 전반적인 내용을 요약해주세요.",
            top_k=10,
            scope="folder",
            scope_path=root_path,
        )
        if chunks:
            context = "\n\n".join(c.content for c in chunks)
        else:
            context = self._read_files_directly(root_path)
            if not context:
                return "분석할 파일이 없습니다. 텍스트 파일이 포함된 폴더 경로를 입력해주세요."
        sys_msg = "당신은 문서 요약 전문가입니다. 반드시 한국어로만 답하세요. 일본어나 영어를 사용하지 마세요."
        prompt = f"""다음 내용을 3~5문장으로 간결히 요약해주세요. 한국어로만 작성하세요.

{context[:6000]}"""

        try:
            return await self.llm.chat([{"role": "system", "content": sys_msg}, {"role": "user", "content": prompt}])
        except Exception as e:
            logger.error("요약 생성 실패", error=str(e))
            return f"요약 생성 중 오류: {e}"

    async def generate_questions(self, root_path: str, options: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """학습용 질문 생성. 인덱싱 데이터 우선, 없으면 파일 직접 읽기."""
        chunks = self.retriever.search("핵심 내용", top_k=8, scope="folder", scope_path=root_path)
        if chunks:
            context = "\n\n".join(c.content for c in chunks)
        else:
            context = self._read_files_directly(root_path)
            if not context:
                return []
        sys_msg = "당신은 학습 도우미입니다. 질문과 정답은 반드시 한국어로만 작성하고, 출력은 JSON 배열만 하세요."
        prompt = f"""다음 내용을 기반으로 학습용 객관식/주관식 질문 5개를 만들어주세요. 질문과 정답은 한국어로만 작성하세요.
JSON 배열로만 출력: [{{"question": "질문", "type": "multiple_choice|short_answer", "options": ["A","B"] (객관식일 때만), "answer": "정답"}}]

내용:
{context[:5000]}"""

        try:
            content = await self.llm.chat([{"role": "system", "content": sys_msg}, {"role": "user", "content": prompt}])
            arr = _extract_json_array(content)
            return arr if isinstance(arr, list) else []
        except Exception as e:
            logger.error("질문 생성 실패", error=str(e))
            return []

    async def generate_interview_questions(self, root_path: str, options: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """면접 질문 생성. 인덱싱 데이터 우선, 없으면 파일 직접 읽기."""
        chunks = self.retriever.search("핵심 기술, 개념, 아키텍처", top_k=8, scope="folder", scope_path=root_path)
        if chunks:
            context = "\n\n".join(c.content for c in chunks)
        else:
            context = self._read_files_directly(root_path)
            if not context:
                return []
        sys_msg = "당신은 기술 면접 전문가입니다. 질문·힌트·예상 답변은 반드시 한국어로만 작성하고, 출력은 JSON 배열만 하세요."
        prompt = f"""다음 기술 문서/코드 기반으로 기술 면접 질문 5개를 만들어주세요. 질문, 힌트, 예상 답변은 모두 한국어로만 작성하세요.
JSON 배열만 출력: [{{"question": "질문", "hint": "힌트", "expected_answer": "예상 답변 요약"}}]

내용:
{context[:5000]}"""

        try:
            content = await self.llm.chat([{"role": "system", "content": sys_msg}, {"role": "user", "content": prompt}])
            arr = _extract_json_array(content)
            return arr if isinstance(arr, list) else []
        except Exception as e:
            logger.error("면접 질문 생성 실패", error=str(e))
            return []

    async def generate_study_plan(self, root_path: str, options: dict[str, Any] | None = None) -> StudyPlanResult:
        """학습 계획 생성."""
        concepts = await self.extract_concepts(root_path, options)
        summary = await self.generate_summary(root_path, options)

        sys_msg = "당신은 학습 설계 전문가입니다. 단계명·설명은 반드시 한국어로만 작성하고, 출력은 JSON 배열만 하세요."
        prompt = f"""다음 요약과 개념을 바탕으로 학습 계획을 JSON 배열로 만들어주세요. title과 description은 한국어로만 작성하세요.
각 단계: {{"order": 1, "title": "단계명", "description": "설명", "estimated_minutes": 30, "concepts": ["개념1"]}}

요약: {summary}
개념: {[c.get('name','') for c in concepts.concepts[:15]]}

출력 (JSON 배열만):"""

        try:
            content = await self.llm.chat([{"role": "system", "content": sys_msg}, {"role": "user", "content": prompt}])
            arr = _extract_json_array(content)
            plan = arr if isinstance(arr, list) else []
            total = sum(p.get("estimated_minutes", 0) for p in plan if isinstance(p, dict))
            return StudyPlanResult(plan=plan, estimated_duration_minutes=total or None)
        except Exception as e:
            logger.error("학습 계획 생성 실패", error=str(e))
            return StudyPlanResult(plan=[], estimated_duration_minutes=None)


def _extract_json_array(text: str) -> Any:
    """텍스트에서 JSON 배열 추출. LLM 출력의 다양한 형식 대응."""
    text = text.strip()

    # 코드 블록 안의 JSON 추출
    if "```" in text:
        import re
        m = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", text)
        if m:
            text = m.group(1)

    # [ ... ] 배열 추출 시도
    start = text.find("[")
    end = text.rfind("]") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    # 전체 텍스트를 JSON으로 파싱 시도
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        if isinstance(result, dict) and any(k in result for k in ("concepts", "questions", "plan")):
            for k in ("concepts", "questions", "plan"):
                if k in result and isinstance(result[k], list):
                    return result[k]
        return result
    except json.JSONDecodeError:
        logger.warning("JSON 파싱 실패", text_preview=text[:200])
        return []
