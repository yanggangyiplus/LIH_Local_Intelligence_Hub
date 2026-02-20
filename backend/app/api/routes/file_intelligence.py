"""
File Intelligence API 라우트.

흐름: 스캔(구조·내용·메타데이터) → AI 정리 계획 생성 → 미리보기 제시 → 사용자 확인
→ 승인된 작업만 Apply 실행. 모든 작업 로그 저장(Undo 지원).
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.file_intelligence.analyzer import FileAnalyzer
from app.core.file_intelligence.executor import ReorganizationExecutor
from app.core.file_intelligence.planner import OrganizationPlanner, PlanOptions
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
    """폴더 스캔: 구조·메타데이터 수집 (파일 정리 흐름의 1단계)."""
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

    # scan_cache DB에 기록 (대시보드용)
    try:
        import json as _json
        async with get_connection() as db:
            await db.execute(
                "INSERT OR REPLACE INTO scan_cache (root_path, scan_result_json) VALUES (?, ?)",
                (str(root), _json.dumps({"total_files": result.total_files, "job_id": job_id})),
            )
            await db.commit()
    except Exception:
        pass

    return {"job_id": job_id, "status": "completed", "total_files": result.total_files}


@router.get("/scan/{job_id}")
async def get_scan_result(job_id: str) -> ScanResult:
    """스캔 결과 조회."""
    if job_id not in _scan_cache:
        raise HTTPException(status_code=404, detail="스캔 결과를 찾을 수 없습니다.")
    return _scan_cache[job_id]


class PlanRequest(BaseModel):
    job_id: str
    organize_by: str = "content"  # content | name | time
    focus: str = "both"  # names | locations | both


@router.post("/plan")
async def generate_plan(req: PlanRequest) -> ReorganizationPlan:
    """AI 정리 계획(Plan) 생성. 이동·리네이밍·중복 정리 등, 정리 이유 제시."""
    import asyncio

    if req.job_id not in _scan_cache:
        raise HTTPException(status_code=404, detail="스캔 결과를 찾을 수 없습니다.")
    scan = _scan_cache[req.job_id]
    options = PlanOptions(organize_by=req.organize_by, focus=req.focus)
    planner = OrganizationPlanner(scan, options)
    try:
        plan = await asyncio.to_thread(planner.generate_plan)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"계획 생성 중 오류: {str(e)}")
    _plan_cache[plan.plan_id] = plan
    return plan


class PreviewRequest(BaseModel):
    plan_id: str
    action_ids: list[str] = []


@router.post("/preview")
async def preview_changes(req: PreviewRequest) -> dict:
    """정리 계획 미리보기. 사용자 확인 후 승인 시에만 실제 반영 가능."""
    if req.plan_id not in _plan_cache:
        raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
    plan = _plan_cache[req.plan_id]
    root = Path(plan.root_path)
    executor = ReorganizationExecutor(plan, root)
    logs = executor.execute(action_ids=req.action_ids or [], dry_run=True)
    return {"plan_id": req.plan_id, "dry_run": True, "actions_count": len(logs), "logs": logs}


@router.post("/apply")
async def apply_reorganization(req: ApplyReorganizationRequest) -> dict:
    """Apply Engine: 승인된 작업만 실제 파일 시스템에 반영. 작업 로그 저장(Undo 지원)."""
    if req.plan_id not in _plan_cache:
        raise HTTPException(status_code=404, detail="계획을 찾을 수 없습니다.")
    if not req.confirm:
        return {"message": "confirm=false. 실제 적용하려면 confirm=true로 요청하세요.", "applied": False}

    plan = _plan_cache[req.plan_id]
    root = Path(plan.root_path)

    try:
        executor = ReorganizationExecutor(plan, root)
        logs = executor.execute(action_ids=req.action_ids or [], dry_run=req.dry_run)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 정리 실행 중 오류: {str(e)}")

    try:
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
    except Exception as e:
        # DB 저장 실패해도 파일 작업은 이미 완료됨
        return {"applied": True, "dry_run": req.dry_run, "logs_count": len(logs), "db_warning": str(e)}

    return {"applied": True, "dry_run": req.dry_run, "logs_count": len(logs)}


@router.post("/undo/{plan_id}")
async def undo_plan(plan_id: str) -> dict:
    """Undo(되돌리기): plan_id에 해당하는 실행 완료 작업을 역순으로 되돌림."""
    async with get_connection() as db:
        db.row_factory = lambda c, r: dict(zip([col[0] for col in c.description], r))
        cursor = await db.execute(
            "SELECT * FROM reorganization_logs WHERE plan_id = ? AND dry_run = 0 ORDER BY executed_at ASC",
            (plan_id,),
        )
        logs = await cursor.fetchall()

    if not logs:
        raise HTTPException(status_code=404, detail="해당 plan_id의 실행 이력이 없습니다.")

    # root_path 복원: plan 캐시에 있으면 사용, 없으면 source_path에서 추론
    root_path = None
    if plan_id in _plan_cache:
        root_path = Path(_plan_cache[plan_id].root_path)
    else:
        first_src = logs[0].get("source_path", "")
        if first_src:
            root_path = Path(first_src).parent
        else:
            first_tgt = logs[0].get("target_path", "")
            root_path = Path(first_tgt).parent if first_tgt else None

    if not root_path or not root_path.exists():
        raise HTTPException(status_code=400, detail="루트 경로를 확인할 수 없습니다.")

    undone = ReorganizationExecutor.undo_operations(logs, root_path)

    # Undo 완료 후 해당 로그를 DB에서 삭제
    async with get_connection() as db:
        await db.execute("DELETE FROM reorganization_logs WHERE plan_id = ? AND dry_run = 0", (plan_id,))
        await db.commit()

    ok_count = sum(1 for u in undone if u.get("status") == "ok")
    return {"plan_id": plan_id, "undone_count": ok_count, "total": len(undone), "details": undone}


@router.get("/history")
async def get_history(limit: int = 50) -> list:
    """재구성 작업 이력 조회. Undo(되돌리기) 지원용 로그."""
    async with get_connection() as db:
        db.row_factory = lambda c, r: dict(zip([col[0] for col in c.description], r))
        cursor = await db.execute(
            "SELECT * FROM reorganization_logs ORDER BY executed_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
    return rows
