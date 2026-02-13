"""
시스템 API 라우트.
"""

from fastapi import APIRouter

from app.core.config import get_settings
from app.utils.folder_picker import pick_folder

router = APIRouter(tags=["system"])


@router.get("/pick-folder")
def api_pick_folder():
    """
    네이티브 폴더 선택 다이얼로그를 띄우고 선택된 경로 반환.
    브라우저에서 경로를 얻을 수 없을 때 사용.
    """
    path = pick_folder()
    return {"path": path}  # None이면 취소


@router.get("/health")
async def health():
    """헬스체크."""
    return {"status": "ok", "service": "Local Intelligence Hub"}


@router.get("/config")
async def get_config():
    """설정 조회 (민감 정보 제외)."""
    s = get_settings()
    return {
        "ollama_base_url": s.ollama_base_url,
        "ollama_chat_model": s.ollama_chat_model,
        "ollama_embedding_model": s.ollama_embedding_model,
        "chunk_size": s.chunk_size,
        "chunk_overlap": s.chunk_overlap,
        "max_scan_depth": s.max_scan_depth,
    }


@router.get("/llm/models")
async def list_llm_models():
    """Ollama에서 사용 가능한 모델 목록 조회."""
    try:
        from ollama import Client

        client = Client(host=get_settings().ollama_base_url)
        resp = client.list()
        models_raw = resp.get("models", []) if isinstance(resp, dict) else getattr(resp, "models", [])
        models = []
        for m in models_raw:
            if isinstance(m, dict):
                models.append(m.get("name", m.get("model", "")))
            else:
                models.append(getattr(m, "name", getattr(m, "model", "")))
        return {"models": [n for n in models if n]}
    except Exception as e:
        return {"models": [], "error": str(e)}
