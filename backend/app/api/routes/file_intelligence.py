"""
File Intelligence API 라우트.
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.file_intelligence.analyzer import FileAnalyzer
from app.core.file_intelligence.executor import ReorganizationExecutor
from app.core.file_intelligence.planner import OrganizationPlanner
from app.core.file_intelligence.scanner import FileScanner
from app.models.schemas import (
    ApplyReorganizationRequest,
    ReorganizationPlan,
    ScanResult,
)
from pydantic import BaseModel
from app.services.database import get_connection

router = APIRouter(prefix="/file-intelligence", tags=["file-intelligence"])

# 인메모리 캐시 (프로덕션에서는 Redis 등 사용)
_scan_cache: dict[str, ScanResult] = {}
_plan_cache: dict[str, ReorganizationPlan] = {}


class ScanRequest(BaseModel):
    root_path: str


@router.post("/scan")
async def start_scan(req: ScanRequest) -> dict:
    """폴더 스캔 시작. 동기 스캔 수행."""
    try:
        root = Path(req.root_path).resolve()
        if not root.exists() or not root.is_dir():
            raise HTTPException(status_code=400, detail="유효한 디렉토리 경로를 입력하세요.")
        from app.utils.safe_file_ops import create_safe_ops_for_root

        create_safe_ops_for_root(root)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    scanner = FileScanner(root)
    files, hash_to_paths = scanner.scan_sync()
    analyzer = FileAnalyzer(files, hash_to_paths)
    job_id = str(uuid.uuid4())
    result = analyzer.build_scan_result(job_id, str(root), "completed")
    _scan_cache[job_id] = result
    return {"job_id": job_id, "status": "completed", "total_files": result.total_files}


@router.get("/scan/{job_id}")
async def get_scan_result(job_id: str) -> ScanResult:
    """스캔 결과 조회."""
    if job_id not in _scan_cache:
        raise HTTPException(status_code=404, detail="스캔 결과를 찾을 수 없습니다.")
    return _scan_cache[job_id]


class PlanRequest(BaseModel):
    job_id: str


@router.post("/plan")
async def generate_plan(req: PlanRequest) -> ReorganizationPlan:
    """스캔 결과 기반 AI 재구성 계획 생성."""
    if req.job_id not in _scan_cache:
        raise HTTPException(status_code=404, detail="스캔 결과를 찾을 수 없습니다.")
    scan = _scan_cache[req.job_id]
    planner = OrganizationPlanner(scan)
    plan = planner.generate_plan()
    _plan_cache[plan.plan_id] = plan
    return plan


class PreviewRequest(BaseModel):
    plan_id: str
    action_ids: list[str] = []


@router.post("/preview")
async def preview_changes(req: PreviewRequest) -> dict:
    """변경 사항 미리보기 (dry_run)."""
    if req.plan_id not in _plan_cache:
        raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
    plan = _plan_cache[req.plan_id]
    root = Path(plan.root_path)
    executor = ReorganizationExecutor(plan, root)
    logs = executor.execute(action_ids=req.action_ids or [], dry_run=True)
    return {"plan_id": req.plan_id, "dry_run": True, "actions_count": len(logs), "logs": logs}


@router.post("/apply")
async def apply_reorganization(req: ApplyReorganizationRequest) -> dict:
    """재구성 적용. confirm=true일 때만 실제 적용."""
    if req.plan_id not in _plan_cache:
        raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
    if not req.confirm:
        return {"message": "confirm=false. 실제 적용하려면 confirm=true로 요청하세요.", "applied": False}

    plan = _plan_cache[req.plan_id]
    root = Path(plan.root_path)
    executor = ReorganizationExecutor(plan, root)
    logs = executor.execute(action_ids=req.action_ids or [], dry_run=req.dry_run)

    # DB에 로그 저장
    async with get_connection() as db:
        for log in logs:
            await db.execute(
                """INSERT INTO reorganization_logs (id, plan_id, operation_type, source_path, target_path, original_state_json, dry_run)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    log["id"],
                    log["plan_id"],
                    log["operation_type"],
                    log["source_path"],
                    log.get("target_path"),
                    log.get("original_state_json"),
                    1 if log.get("dry_run") else 0,
                ),
            )
        await db.commit()

    return {"applied": True, "dry_run": req.dry_run, "logs_count": len(logs)}


@router.get("/history")
async def get_history(limit: int = 50) -> list:
    """재구성 작업 이력 조회."""
    async with get_connection() as db:
        db.row_factory = lambda c, r: dict(zip([col[0] for col in c.description], r))
        cursor = await db.execute(
            "SELECT * FROM reorganization_logs ORDER BY executed_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
    return rows
