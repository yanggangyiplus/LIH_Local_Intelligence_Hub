"""
대시보드 API.
인덱싱 문서 수, 스캔 히스토리, 최근 활동 등 통계 제공.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from aiosqlite import Connection
from pydantic import BaseModel

from app.api.deps import get_db
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class ClearDataRequest(BaseModel):
    """데이터 삭제 요청."""
    clear_indexed_files: bool = False
    clear_reorganization_logs: bool = False
    clear_index_jobs: bool = False
    clear_scan_cache: bool = False
    clear_all: bool = False


class DeleteActivityRequest(BaseModel):
    """활동 삭제 요청."""
    activity_id: str
    activity_type: str  # "indexing" | "reorganization"


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


@router.post("/clear")
async def clear_dashboard_data(req: ClearDataRequest, db: Connection = Depends(get_db)):
    """대시보드 데이터 초기화 (선택적 또는 전체)."""
    try:
        cleared = []
        
        if req.clear_all or req.clear_indexed_files:
            await db.execute("DELETE FROM indexed_files")
            cleared.append("indexed_files")
        
        if req.clear_all or req.clear_reorganization_logs:
            await db.execute("DELETE FROM reorganization_logs")
            cleared.append("reorganization_logs")
        
        if req.clear_all or req.clear_index_jobs:
            await db.execute("DELETE FROM index_jobs")
            cleared.append("index_jobs")
        
        if req.clear_all or req.clear_scan_cache:
            await db.execute("DELETE FROM scan_cache")
            cleared.append("scan_cache")
        
        await db.commit()
        logger.info("대시보드 데이터 초기화", cleared=cleared)
        return {"status": "ok", "cleared": cleared, "message": f"{len(cleared)}개 테이블이 초기화되었습니다."}
    except Exception as e:
        logger.error("대시보드 데이터 초기화 실패", error=str(e))
        raise HTTPException(status_code=500, detail=f"초기화 실패: {str(e)}")


@router.delete("/activity/{activity_type}/{activity_id}")
async def delete_activity(activity_type: str, activity_id: str, db: Connection = Depends(get_db)):
    """개별 활동 삭제."""
    try:
        if activity_type == "indexing":
            cursor = await db.execute("DELETE FROM index_jobs WHERE id = ?", (activity_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="인덱싱 작업을 찾을 수 없습니다.")
            # 관련된 indexed_files도 삭제
            await db.execute("DELETE FROM indexed_files WHERE index_job_id = ?", (activity_id,))
        elif activity_type == "reorganization":
            cursor = await db.execute("DELETE FROM reorganization_logs WHERE plan_id = ?", (activity_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="정리 작업을 찾을 수 없습니다.")
        else:
            raise HTTPException(status_code=400, detail="유효하지 않은 활동 타입입니다.")
        
        await db.commit()
        logger.info("활동 삭제 완료", type=activity_type, id=activity_id)
        return {"status": "ok", "message": "활동이 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("활동 삭제 실패", error=str(e))
        raise HTTPException(status_code=500, detail=f"삭제 실패: {str(e)}")
