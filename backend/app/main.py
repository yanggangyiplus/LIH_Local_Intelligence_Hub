"""
Local Intelligence Hub - FastAPI 애플리케이션 진입점.
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
        description="로컬 파일 기반 AI 워크스페이스 - File Intelligence, RAG, Study Engine",
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
