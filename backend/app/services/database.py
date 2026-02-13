"""
SQLite 데이터베이스 초기화 및 스키마.
"""

import aiosqlite
from pathlib import Path

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

SCHEMA = """
-- 인덱싱 작업 및 상태
CREATE TABLE IF NOT EXISTS index_jobs (
    id TEXT PRIMARY KEY,
    root_path TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    config_json TEXT,
    error_message TEXT
);

-- 인덱싱된 파일 메타데이터
CREATE TABLE IF NOT EXISTS indexed_files (
    id TEXT PRIMARY KEY,
    file_path TEXT UNIQUE NOT NULL,
    index_job_id TEXT REFERENCES index_jobs(id),
    last_modified TIMESTAMP,
    file_hash TEXT,
    chunk_count INTEGER DEFAULT 0,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_indexed_files_job ON indexed_files(index_job_id);
CREATE INDEX IF NOT EXISTS idx_indexed_files_path ON indexed_files(file_path);

-- 파일 정리 작업 로그 (Undo 지원)
CREATE TABLE IF NOT EXISTS reorganization_logs (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    source_path TEXT NOT NULL,
    target_path TEXT,
    original_state_json TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dry_run INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_reorg_plan ON reorganization_logs(plan_id);

-- 스캔 캐시
CREATE TABLE IF NOT EXISTS scan_cache (
    root_path TEXT PRIMARY KEY,
    scan_result_json TEXT,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


async def init_db() -> None:
    """데이터베이스 초기화 및 스키마 적용."""
    settings = get_settings()
    db_path = settings.sqlite_db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(str(db_path)) as db:
        await db.executescript(SCHEMA)
        await db.commit()
    logger.info("데이터베이스 초기화 완료", db_path=str(db_path))


def get_db_path() -> Path:
    """DB 파일 경로 반환."""
    return get_settings().sqlite_db_path


def get_connection():
    """비동기 DB 연결 컨텍스트. 사용: async with get_connection() as db"""
    path = get_db_path()
    return aiosqlite.connect(str(path))
