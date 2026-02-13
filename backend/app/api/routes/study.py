"""
Study & Context API 라우트.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.core.study.service import StudyService
from app.models.schemas import StudyRequest

router = APIRouter(prefix="/study", tags=["study"])


def _validate_path(path: str) -> Path:
    from app.utils.safe_file_ops import create_safe_ops_for_root

    p = Path(path).resolve()
    if not p.exists() or not p.is_dir():
        raise HTTPException(status_code=400, detail="유효한 디렉토리 경로를 입력하세요.")
    create_safe_ops_for_root(p)
    return p


@router.post("/concepts")
async def extract_concepts(req: StudyRequest):
    """개념 추출."""
    _validate_path(req.root_path)
    svc = StudyService()
    return await svc.extract_concepts(req.root_path, req.options)


@router.post("/summary")
async def generate_summary(req: StudyRequest):
    """요약 생성."""
    _validate_path(req.root_path)
    svc = StudyService()
    summary = await svc.generate_summary(req.root_path, req.options)
    return {"summary": summary}


@router.post("/questions")
async def generate_questions(req: StudyRequest):
    """학습용 질문 생성."""
    _validate_path(req.root_path)
    svc = StudyService()
    questions = await svc.generate_questions(req.root_path, req.options)
    return {"questions": questions}


@router.post("/interview-questions")
async def generate_interview_questions(req: StudyRequest):
    """면접 질문 생성."""
    _validate_path(req.root_path)
    svc = StudyService()
    questions = await svc.generate_interview_questions(req.root_path, req.options)
    return {"questions": questions}


@router.post("/plan")
async def generate_study_plan(req: StudyRequest):
    """학습 계획 생성."""
    _validate_path(req.root_path)
    svc = StudyService()
    result = await svc.generate_study_plan(req.root_path, req.options)
    return result
