"""
파일 업로드 API.
웹 환경(Vercel+Railway)에서 로컬 파일 경로 대신 파일을 직접 업로드하여
인덱싱/학습 등에 활용할 수 있도록 지원.
"""

import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Form
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_BASE = Path("/app/data/uploads") if Path("/app").exists() else Path("./data/uploads")
# 허용 파일 확장자
ALLOWED_EXTENSIONS = {
    ".txt", ".md", ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yaml", ".yml",
    ".html", ".css", ".csv", ".xml", ".toml", ".cfg", ".ini", ".sh", ".bash",
    ".java", ".c", ".cpp", ".h", ".hpp", ".go", ".rs", ".rb", ".php", ".sql",
    ".pdf", ".docx", ".pptx", ".doc",
    ".log", ".env.example", ".gitignore", ".dockerfile",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("")
async def upload_files(
    files: list[UploadFile] = File(...),
    session_id: Optional[str] = Form(None),
):
    """
    파일 업로드. 업로드된 파일은 세션 디렉토리에 저장되며,
    반환된 upload_path를 인덱싱/학습 API의 root_path로 사용.
    """
    sid = session_id or str(uuid.uuid4())[:12]
    upload_dir = UPLOAD_BASE / sid
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    skipped = []

    for f in files:
        if not f.filename:
            continue
        ext = Path(f.filename).suffix.lower()
        # 확장자가 없으면 허용 (README, Makefile 등)
        if ext and ext not in ALLOWED_EXTENSIONS:
            skipped.append({"name": f.filename, "reason": f"허용되지 않는 형식: {ext}"})
            continue

        content = await f.read()
        if len(content) > MAX_FILE_SIZE:
            skipped.append({"name": f.filename, "reason": "50MB 초과"})
            continue

        # 하위 경로 구조 유지 (webkitRelativePath 대응)
        safe_name = f.filename.replace("..", "").lstrip("/")
        dest = upload_dir / safe_name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)
        saved.append({"name": f.filename, "size": len(content)})

    logger.info("파일 업로드 완료", session=sid, saved=len(saved), skipped=len(skipped))

    return {
        "session_id": sid,
        "upload_path": str(upload_dir),
        "saved_count": len(saved),
        "saved_files": saved,
        "skipped_files": skipped,
    }


@router.get("/sessions")
async def list_sessions():
    """업로드 세션 목록 조회."""
    UPLOAD_BASE.mkdir(parents=True, exist_ok=True)
    sessions = []
    for d in sorted(UPLOAD_BASE.iterdir(), reverse=True):
        if d.is_dir():
            file_count = sum(1 for _ in d.rglob("*") if _.is_file())
            total_size = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())
            sessions.append({
                "session_id": d.name,
                "path": str(d),
                "file_count": file_count,
                "total_size_mb": round(total_size / 1024 / 1024, 2),
            })
    return {"sessions": sessions}


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """업로드 세션(폴더) 삭제."""
    target = UPLOAD_BASE / session_id
    if target.exists() and target.is_dir():
        shutil.rmtree(target)
        return {"deleted": session_id}
    return JSONResponse(status_code=404, content={"error": "세션을 찾을 수 없습니다."})
