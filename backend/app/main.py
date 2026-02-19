"""
Local Intelligence Hub (LIH) - FastAPI 애플리케이션 진입점.

로컬 파일 기반 AI 워크스페이스. File Intelligence(스캔·분석·정리 계획·미리보기·Apply·Undo),
RAG(의미 검색·질의응답), Study Engine(개념·요약·학습 계획) 제공.
모든 데이터 처리는 로컬에서 수행되며 외부 전송 없음.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import file_intelligence, knowledge, study, system
from app.core.config import get_settings
from app.core.logging_config import configure_logging, get_logger
from app.services.database import init_db

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행."""
    configure_logging(get_settings().log_level)
    await init_db()
    logger.info("Local Intelligence Hub started")
    yield
    logger.info("Local Intelligence Hub shutting down")


def create_app() -> FastAPI:
    """FastAPI 앱 생성."""
    app = FastAPI(
        title="Local Intelligence Hub",
        description=(
            "로컬 우선 AI 시스템. 로컬 파일 인덱싱·RAG 의미 검색·질의응답, "
            "파일/폴더 분석·AI 정리 계획·미리보기·승인 후 실행·작업 로그(Undo 지원). "
            "완전 로컬 처리(파일·임베딩·벡터 DB·AI 추론), 외부 전송 없음."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS (Tauri/React from different origin)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "tauri://localhost"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API 라우트
    app.include_router(file_intelligence.router, prefix="/api/v1")
    app.include_router(knowledge.router, prefix="/api/v1")
    app.include_router(study.router, prefix="/api/v1")
    app.include_router(system.router, prefix="/api/v1")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    s = get_settings()
    uvicorn.run(
        "app.main:app",
        host=s.host,
        port=s.port,
        reload=s.debug,
    )
