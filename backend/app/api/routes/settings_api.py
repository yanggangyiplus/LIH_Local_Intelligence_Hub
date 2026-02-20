"""
설정 API.
LLM Provider 전환, 현재 설정 조회.
런타임 변경 사항을 DATA_DIR/.env에 영구 저장하여 앱 재시작 후에도 유지.
"""

import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.core.config import get_settings
from app.core.llm.provider import get_llm_provider, reset_llm_provider
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/settings", tags=["Settings"])

# 학습 도구 기본 목록 및 전체 사용 가능한 도구
DEFAULT_STUDY_TOOLS = ["summary", "concepts", "questions", "interview", "plan"]


def _study_tools_path() -> Path:
    """study_tools 설정 파일 경로."""
    settings = get_settings()
    return settings.data_dir / "study_tools.json"


def _load_study_tools() -> list[str]:
    """저장된 학습 도구 목록 로드. 없으면 기본값."""
    import json
    path = _study_tools_path()
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return DEFAULT_STUDY_TOOLS


def _save_study_tools(tools: list[str]) -> None:
    """학습 도구 목록 저장."""
    import json
    path = _study_tools_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(tools, ensure_ascii=False), encoding="utf-8")


def _persist_env(key: str, value: str) -> None:
    """DATA_DIR/.env 파일에 설정 값을 영구 저장."""
    env_path = Path(os.getcwd()) / ".env"
    if not env_path.exists():
        env_path.write_text("# LIH Settings\n", encoding="utf-8")

    content = env_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    updated = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith(f"{key}=") or stripped.startswith(f"{key} ="):
            lines[i] = f"{key}={value}"
            updated = True
            break
    if not updated:
        lines.append(f"{key}={value}")

    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


class SettingsResponse(BaseModel):
    llm_provider: str
    llm_model: str
    openai_api_key_set: bool
    gemini_api_key_set: bool
    ollama_base_url: str
    ollama_chat_model: str
    openai_chat_model: str
    gemini_chat_model: str
    chunk_size: int
    chunk_overlap: int
    max_file_size_mb: int


class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_chat_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_chat_model: Optional[str] = None
    study_tools: Optional[list[str]] = None


@router.get("")
async def get_current_settings():
    """현재 설정 조회."""
    try:
        settings = get_settings()
        provider = get_llm_provider()
        study_tools = _load_study_tools()
        return {
            "llm_provider": provider.provider_name,
            "llm_model": provider.default_model,
            "openai_api_key_set": bool(settings.openai_api_key),
            "gemini_api_key_set": bool(settings.gemini_api_key),
            "ollama_base_url": settings.ollama_base_url,
            "ollama_chat_model": settings.ollama_chat_model,
            "openai_chat_model": settings.openai_chat_model,
            "gemini_chat_model": settings.gemini_chat_model,
            "chunk_size": settings.chunk_size,
            "chunk_overlap": settings.chunk_overlap,
            "max_file_size_mb": settings.max_file_size_mb,
            "study_tools": study_tools,
        }
    except Exception as e:
        logger.error("설정 조회 실패", error=str(e))
        return {
            "llm_provider": "unknown",
            "llm_model": "unknown",
            "openai_api_key_set": False,
            "gemini_api_key_set": False,
            "ollama_base_url": "",
            "ollama_chat_model": "",
            "openai_chat_model": "",
            "gemini_chat_model": "",
            "chunk_size": 512,
            "chunk_overlap": 64,
            "max_file_size_mb": 50,
            "study_tools": DEFAULT_STUDY_TOOLS,
        }


@router.put("")
async def update_settings(body: SettingsUpdate):
    """설정 업데이트: 런타임 반영 + DATA_DIR/.env에 영구 저장."""
    settings = get_settings()
    changed = []

    if body.llm_provider and body.llm_provider in ("openai", "ollama", "gemini"):
        settings.llm_provider = body.llm_provider
        _persist_env("LLM_PROVIDER", body.llm_provider)
        changed.append(f"llm_provider={body.llm_provider}")

    if body.openai_api_key is not None:
        settings.openai_api_key = body.openai_api_key
        _persist_env("OPENAI_API_KEY", body.openai_api_key)
        changed.append("openai_api_key updated")

    if body.openai_chat_model:
        settings.openai_chat_model = body.openai_chat_model
        _persist_env("OPENAI_CHAT_MODEL", body.openai_chat_model)
        changed.append(f"openai_chat_model={body.openai_chat_model}")

    if body.gemini_api_key is not None:
        settings.gemini_api_key = body.gemini_api_key
        _persist_env("GEMINI_API_KEY", body.gemini_api_key)
        changed.append("gemini_api_key updated")

    if body.gemini_chat_model:
        settings.gemini_chat_model = body.gemini_chat_model
        _persist_env("GEMINI_CHAT_MODEL", body.gemini_chat_model)
        changed.append(f"gemini_chat_model={body.gemini_chat_model}")

    if body.study_tools is not None:
        valid = [t for t in body.study_tools if t in DEFAULT_STUDY_TOOLS]
        _save_study_tools(valid)
        changed.append(f"study_tools={valid}")

    # Provider 재초기화
    reset_llm_provider()
    provider = get_llm_provider()

    logger.info("설정 업데이트 & 저장", changes=changed, active_provider=provider.provider_name)
    return {
        "updated": changed,
        "active_provider": provider.provider_name,
        "active_model": provider.default_model,
    }
