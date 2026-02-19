"""
대시보드 API.
인덱싱 문서 수, 스캔 히스토리, 최근 활동 등 통계 제공.
"""

from fastapi import APIRouter, Depends
from aiosqlite import Connection

from app.api.deps import get_db
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(db: Connection = Depends(get_db)):
    """대시보드 통계: 인덱싱 문서 수, 정리 히스토리, AI 분석 수."""
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM indexed_files")
        row = await cursor.fetchone()
        indexed_files = row[0] if row else 0

        cursor = await db.execute("SELECT COUNT(*) FROM reorganization_logs")
        row = await cursor.fetchone()
        reorganization_count = row[0] if row else 0

        cursor = await db.execute("SELECT COUNT(*) FROM index_jobs")
        row = await cursor.fetchone()
        index_jobs = row[0] if row else 0

        try:
            cursor = await db.execute("SELECT COUNT(*) FROM scan_cache")
            row = await cursor.fetchone()
            scan_count = row[0] if row else 0
        except Exception:
            scan_count = 0

        return {
            "indexed_files": indexed_files,
            "reorganization_count": reorganization_count,
            "index_jobs": index_jobs,
            "scan_count": scan_count,
            "ai_queries": index_jobs + reorganization_count,
        }
    except Exception as e:
        logger.error("대시보드 통계 조회 실패", error=str(e))
        return {
            "indexed_files": 0,
            "reorganization_count": 0,
            "index_jobs": 0,
            "scan_count": 0,
            "ai_queries": 0,
        }


@router.get("/recent-activity")
async def get_recent_activity(db: Connection = Depends(get_db), limit: int = 10):
    """최근 활동 로그 (인덱싱 + 정리 이벤트)."""
    try:
        activities = []

        cursor = await db.execute(
            "SELECT id, root_path, status, created_at FROM index_jobs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        for r in rows:
            activities.append({
                "type": "indexing",
                "id": r[0],
                "description": f"인덱싱: {r[1]}",
                "status": r[2],
                "created_at": r[3],
            })

        cursor = await db.execute(
            "SELECT plan_id, operation_type, source_path, executed_at FROM reorganization_logs ORDER BY executed_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        for r in rows:
            activities.append({
                "type": "reorganization",
                "id": r[0],
                "description": f"{r[1]}: {r[2]}",
                "status": "applied",
                "created_at": r[3],
            })

        activities.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"activities": activities[:limit]}
    except Exception as e:
        logger.error("최근 활동 조회 실패", error=str(e))
        return {"activities": []}
