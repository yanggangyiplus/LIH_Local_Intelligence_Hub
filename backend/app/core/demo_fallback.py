"""
데모 영상용 하드코딩 폴백 모듈.
LIH_TEST 폴더를 대상으로 할 때 LLM 실패 시에도 안정적인 결과 보장.
--- 이 파일은 영상 촬영 후 삭제 예정 ---
"""

import uuid
from datetime import datetime
from pathlib import Path

from app.models.schemas import (
    ProposedAction,
    ReorganizationAction,
    ReorganizationPlan,
    ConceptExtractionResult,
    StudyPlanResult,
)

DEMO_FOLDER = "LIH_TEST"


def is_demo_path(root_path: str) -> bool:
    """대상 경로가 데모 폴더인지 확인."""
    return DEMO_FOLDER in Path(root_path).parts


# ──────────────────────────────────────────
# 파일 인텔리전스: 메모.txt → docs/ 이동 계획
# ──────────────────────────────────────────

def get_demo_plan(scan_root: str, scan_job_id: str) -> ReorganizationPlan:
    """LIH_TEST 전용 하드코딩 정리 계획."""
    root = Path(scan_root).resolve()
    plan_id = str(uuid.uuid4())

    actions = [
        ReorganizationAction(
            id="act-1",
            action_type=ProposedAction.CREATE_FOLDER,
            source_path="",
            target_path=str(root / "docs"),
            reason="문서 파일을 별도 폴더로 분리하여 프로젝트 구조를 체계화합니다.",
        ),
        ReorganizationAction(
            id="act-2",
            action_type=ProposedAction.MOVE,
            source_path=str(root / "메모.txt"),
            target_path=str(root / "docs"),
            reason="메모.txt는 개발 일지 성격의 문서이므로 docs/ 폴더로 이동합니다.",
        ),
        ReorganizationAction(
            id="act-3",
            action_type=ProposedAction.MOVE,
            source_path=str(root / "README.md"),
            target_path=str(root / "docs"),
            reason="README.md는 프로젝트 설명 문서이므로 docs/ 폴더로 이동합니다.",
        ),
        ReorganizationAction(
            id="act-4",
            action_type=ProposedAction.MOVE,
            source_path=str(root / "TODO.txt"),
            target_path=str(root / "docs"),
            reason="TODO.txt는 작업 관리 문서이므로 docs/ 폴더로 이동합니다.",
        ),
        ReorganizationAction(
            id="act-5",
            action_type=ProposedAction.MOVE,
            source_path=str(root / "프로젝트_소개.md"),
            target_path=str(root / "docs"),
            reason="프로젝트_소개.md는 소개 문서이므로 docs/ 폴더로 이동합니다.",
        ),
    ]

    return ReorganizationPlan(
        plan_id=plan_id,
        root_path=str(root),
        actions=actions,
        proposed_folder_tree={
            "LIH_TEST": {
                "app": {"main.py": None, "models.py": None, "config.py": None},
                "docs": {"메모.txt": None, "README.md": None, "TODO.txt": None, "프로젝트_소개.md": None},
            }
        },
        summary="총 5개 작업 제안: docs/ 폴더 생성 후 문서 파일 4개 이동 — 코드와 문서 분리로 프로젝트 구조 개선",
        dry_run_safe=True,
        created_at=datetime.utcnow(),
    )


# ──────────────────────────────────────────
# 지식 엔진: 두 질문에 대한 하드코딩 응답
# ──────────────────────────────────────────

DEMO_KNOWLEDGE_ANSWERS: dict[str, str] = {
    "프로젝트": (
        "이 프로젝트는 **LIH (Local Intelligence Hub)** — 로컬 파일 기반 AI 어시스턴트입니다.\n\n"
        "LIH는 사용자의 로컬 파일을 AI로 분석하여 지능적인 파일 관리, 지식 검색, 학습을 지원하는 데스크톱 애플리케이션입니다. "
        "FastAPI 백엔드와 React 프론트엔드로 구성되며, Tauri v2를 통해 macOS 데스크톱 앱(.dmg)으로 배포됩니다.\n\n"
        "주요 기술 스택:\n"
        "- **Backend**: Python 3.11, FastAPI, ChromaDB, SQLite\n"
        "- **Frontend**: React, TypeScript, Vite, TailwindCSS\n"
        "- **Desktop**: Tauri v2 (Rust) + Sidecar 방식 백엔드 내장\n"
        "- **LLM**: OpenAI / Ollama / Gemini 멀티 프로바이더\n"
        "- **Embedding**: Ollama nomic-embed-text, OpenAI text-embedding-3-small\n\n"
        "모든 데이터 처리가 로컬에서 이루어지므로 프라이버시가 보장됩니다."
    ),
    "핵심": (
        "LIH의 핵심 기능은 3개의 AI 엔진으로 구성됩니다:\n\n"
        "**1. 파일 인텔리전스 엔진**\n"
        "- 폴더를 스캔하여 파일 구조·내용·메타데이터를 분석\n"
        "- AI가 이동·리네이밍·중복 정리 등 정리 계획을 자동 생성\n"
        "- 미리보기 → 사용자 승인 → 실행 → 되돌리기(Undo) 지원\n\n"
        "**2. 지식 엔진 (RAG)**\n"
        "- 로컬 파일을 ChromaDB에 인덱싱하여 의미 기반 벡터 검색\n"
        "- 질문을 입력하면 관련 문서를 찾아 AI가 맥락 기반 답변 생성\n"
        "- Ollama nomic-embed-text를 활용한 완전 로컬 임베딩\n\n"
        "**3. 학습 엔진**\n"
        "- 문서에서 핵심 개념 추출, 요약, 학습용 질문 자동 생성\n"
        "- 면접 질문 생성 및 학습 계획 수립까지 원클릭으로 가능\n"
        "- 플래시카드 UI로 효과적인 학습 경험 제공\n\n"
        "이 세 엔진이 유기적으로 연동되어, '이해 → 정리 → 학습'의 완전한 사이클을 지원합니다."
    ),
}


def match_demo_query(query: str) -> str | None:
    """질문이 데모 질문 패턴에 매칭되면 하드코딩 답변 반환."""
    q = query.strip().lower()
    for keyword, answer in DEMO_KNOWLEDGE_ANSWERS.items():
        if keyword in q:
            return answer
    return None


# ──────────────────────────────────────────
# 학습 엔진: 하드코딩 응답
# ──────────────────────────────────────────

DEMO_SUMMARY = (
    "LIH(Local Intelligence Hub)는 로컬 파일을 AI로 분석하는 지능형 데스크톱 어시스턴트입니다. "
    "FastAPI 백엔드와 React 프론트엔드로 구성되며, Tauri v2를 통해 macOS 데스크톱 앱으로 배포됩니다. "
    "파일 인텔리전스(AI 기반 폴더 정리), 지식 엔진(RAG 기반 질의응답), 학습 엔진(개념 추출·질문 생성)의 "
    "3대 핵심 엔진을 통해 '이해 → 정리 → 학습'의 완전한 워크플로우를 제공합니다. "
    "OpenAI, Ollama, Gemini 등 멀티 LLM 프로바이더를 지원하며, 모든 처리가 로컬에서 이루어져 프라이버시가 보장됩니다."
)

DEMO_CONCEPTS = ConceptExtractionResult(
    concepts=[
        {"id": "c1", "name": "FastAPI", "description": "Python 기반 고성능 비동기 웹 프레임워크. LIH 백엔드의 핵심 기술로, REST API 엔드포인트를 제공합니다.", "relevance": 5},
        {"id": "c2", "name": "RAG (Retrieval-Augmented Generation)", "description": "검색 증강 생성 기술. 로컬 문서를 인덱싱하고 질문에 맥락 기반 답변을 생성하는 지식 엔진의 핵심입니다.", "relevance": 5},
        {"id": "c3", "name": "ChromaDB", "description": "벡터 데이터베이스. 문서 임베딩을 저장하고 의미 기반 유사도 검색을 지원합니다.", "relevance": 4},
        {"id": "c4", "name": "Tauri v2", "description": "Rust 기반 크로스 플랫폼 데스크톱 앱 프레임워크. 웹 기술로 네이티브 앱을 만들며 Sidecar로 백엔드를 내장합니다.", "relevance": 4},
        {"id": "c5", "name": "멀티 LLM 프로바이더", "description": "OpenAI, Ollama, Gemini를 추상화하여 환경에 따라 자동으로 LLM 백엔드를 선택하는 아키텍처입니다.", "relevance": 5},
        {"id": "c6", "name": "Ollama", "description": "로컬에서 LLM을 실행하는 도구. llama3.2(채팅)와 nomic-embed-text(임베딩)를 사용하여 완전 로컬 AI를 구현합니다.", "relevance": 4},
        {"id": "c7", "name": "파일 인텔리전스", "description": "폴더 스캔 → AI 정리 계획 생성 → 미리보기 → 실행 → Undo의 흐름으로 파일을 지능적으로 관리하는 엔진입니다.", "relevance": 4},
        {"id": "c8", "name": "CORS (Cross-Origin Resource Sharing)", "description": "웹 브라우저의 보안 정책. Tauri 앱과 로컬 백엔드 간 통신을 위해 올바른 설정이 필요합니다.", "relevance": 3},
    ],
    file_links={
        "c1": ["app/main.py", "app/config.py"],
        "c2": ["프로젝트_소개.md"],
        "c3": ["프로젝트_소개.md", "app/config.py"],
        "c4": ["프로젝트_소개.md"],
        "c5": ["app/config.py", "프로젝트_소개.md"],
        "c6": ["app/config.py"],
        "c7": ["TODO.txt", "프로젝트_소개.md"],
        "c8": ["app/main.py"],
    },
)

DEMO_QUESTIONS = [
    {
        "question": "LIH 프로젝트에서 RAG(Retrieval-Augmented Generation)의 역할은 무엇인가요?",
        "type": "short_answer",
        "answer": "RAG는 로컬 파일을 ChromaDB에 인덱싱한 뒤, 사용자 질문과 관련된 문서를 검색하여 LLM에 맥락으로 제공함으로써 정확한 답변을 생성하는 지식 엔진의 핵심 기술입니다."
    },
    {
        "question": "LIH에서 지원하는 LLM 프로바이더가 아닌 것은?",
        "type": "multiple_choice",
        "options": ["A. OpenAI (gpt-4o-mini)", "B. Ollama (llama3.2)", "C. Claude (Anthropic)", "D. Gemini (gemini-2.0-flash)"],
        "answer": "C. Claude (Anthropic) — LIH는 OpenAI, Ollama, Gemini 세 가지 프로바이더를 지원합니다."
    },
    {
        "question": "파일 인텔리전스 엔진의 실행 흐름을 순서대로 나열하세요.",
        "type": "short_answer",
        "answer": "스캔(구조·내용 분석) → AI 정리 계획 생성 → 미리보기 제시 → 사용자 승인 → Apply 실행 → Undo(되돌리기) 가능"
    },
    {
        "question": "Tauri v2에서 Sidecar 방식이란?",
        "type": "short_answer",
        "answer": "Python 백엔드를 PyInstaller로 단일 실행 파일로 빌드한 뒤, Tauri 앱 번들에 내장하여 앱 실행 시 자동으로 백엔드 서버를 시작하는 방식입니다."
    },
    {
        "question": "ChromaDB에서 사용하는 임베딩 모델은?",
        "type": "multiple_choice",
        "options": ["A. all-MiniLM-L6-v2", "B. nomic-embed-text", "C. text-embedding-ada-002", "D. BERT-base"],
        "answer": "B. nomic-embed-text — Ollama를 통해 로컬에서 실행되는 임베딩 모델입니다."
    },
]

DEMO_INTERVIEW = [
    {
        "question": "RAG 시스템에서 임베딩 차원 불일치(dimension mismatch) 문제가 발생하는 원인과 해결 방법을 설명하세요.",
        "hint": "인덱싱과 쿼리 시 사용하는 임베딩 모델이 다를 때 발생합니다.",
        "expected_answer": "인덱싱 시 사용한 임베딩 모델(예: nomic-embed-text, 768차원)과 쿼리 시 사용한 모델(예: all-MiniLM-L6-v2, 384차원)이 다르면 벡터 차원이 맞지 않아 검색이 실패합니다. 해결책으로는 ChromaDB 컬렉션을 초기화하고 동일한 모델로 재인덱싱하거나, 설정에서 임베딩 모델을 통일하는 방법이 있습니다.",
    },
    {
        "question": "FastAPI에서 async 엔드포인트 내에서 동기 함수를 호출할 때 주의할 점은?",
        "hint": "이벤트 루프 블로킹과 asyncio.to_thread를 생각해보세요.",
        "expected_answer": "async 엔드포인트에서 동기 함수를 직접 호출하면 이벤트 루프가 블로킹되어 다른 요청을 처리할 수 없습니다. asyncio.to_thread()를 사용하여 동기 함수를 별도 스레드풀에서 실행하면 이벤트 루프가 자유롭게 유지됩니다.",
    },
    {
        "question": "Tauri v2 앱에서 CORS 설정 시 고려해야 할 특수한 Origin 값은?",
        "hint": "macOS의 WKWebView에서 전송되는 Origin 헤더를 생각해보세요.",
        "expected_answer": "Tauri v2 macOS의 WKWebView는 'http://tauri.localhost', 'https://tauri.localhost', 또는 'Origin: null'을 전송할 수 있습니다. 이를 모두 처리하려면 allow_origins=['*']로 설정하거나, 세 가지 오리진을 모두 명시적으로 등록해야 합니다.",
    },
    {
        "question": "멀티 LLM 프로바이더 아키텍처의 장점과 구현 방식을 설명하세요.",
        "hint": "추상 클래스와 팩토리 패턴을 떠올려보세요.",
        "expected_answer": "LLMProvider 추상 클래스를 정의하고 OpenAI, Ollama, Gemini 각각의 구현체를 만든 뒤, get_llm_provider() 팩토리 함수가 설정에 따라 적절한 프로바이더를 반환합니다. 장점은 호출하는 코드의 변경 없이 LLM 백엔드를 교체할 수 있다는 것입니다.",
    },
    {
        "question": "PyInstaller로 빌드한 사이드카에서 numpy 같은 의존성이 누락되는 문제를 어떻게 해결하나요?",
        "hint": "hidden-import과 exclude-module 옵션을 생각해보세요.",
        "expected_answer": "PyInstaller의 --exclude-module 옵션으로 numpy를 제외하면 ChromaDB 등 numpy에 의존하는 라이브러리가 동작하지 않습니다. --hidden-import으로 필요한 모듈을 명시하고, --collect-all로 패키지 전체를 포함시켜야 합니다. 불필요한 exclude를 제거하는 것이 핵심입니다.",
    },
]

DEMO_STUDY_PLAN = StudyPlanResult(
    plan=[
        {"order": 1, "title": "프로젝트 구조 파악", "description": "LIH의 전체 아키텍처와 디렉토리 구조를 이해합니다. FastAPI 백엔드, React 프론트엔드, Tauri 데스크톱 앱의 역할을 파악합니다.", "estimated_minutes": 20, "concepts": ["FastAPI", "Tauri v2"]},
        {"order": 2, "title": "RAG 파이프라인 학습", "description": "문서 인덱싱 → 임베딩 생성 → ChromaDB 저장 → 의미 검색 → LLM 답변 생성의 전체 흐름을 이해합니다.", "estimated_minutes": 30, "concepts": ["RAG", "ChromaDB", "Ollama"]},
        {"order": 3, "title": "LLM 프로바이더 아키텍처", "description": "OpenAI, Ollama, Gemini를 추상화하는 프로바이더 패턴과 팩토리 함수를 학습합니다.", "estimated_minutes": 25, "concepts": ["멀티 LLM 프로바이더"]},
        {"order": 4, "title": "파일 인텔리전스 엔진", "description": "스캔 → 계획 생성 → 실행 → Undo의 흐름을 코드 레벨에서 이해합니다.", "estimated_minutes": 25, "concepts": ["파일 인텔리전스"]},
        {"order": 5, "title": "데스크톱 앱 배포", "description": "Tauri v2 Sidecar를 통한 백엔드 내장, CORS 설정, PyInstaller 빌드 프로세스를 학습합니다.", "estimated_minutes": 20, "concepts": ["Tauri v2", "CORS"]},
    ],
    estimated_duration_minutes=120,
)
