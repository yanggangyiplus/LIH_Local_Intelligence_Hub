"""
설정 API.
LLM Provider 전환, 현재 설정 조회.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.core.config import get_settings
from app.core.llm.provider import get_llm_provider, reset_llm_provider
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsResponse(BaseModel):
    llm_provider: str
    llm_model: str
    openai_api_key_set: bool
    ollama_base_url: str
    ollama_chat_model: str
    openai_chat_model: str
    chunk_size: int
    chunk_overlap: int
    max_file_size_mb: int


class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_chat_model: Optional[str] = None


@router.get("", response_model=SettingsResponse)
async def get_current_settings():
    """현재 설정 조회."""
    settings = get_settings()
    provider = get_llm_provider()
    return SettingsResponse(
        llm_provider=provider.provider_name,
        llm_model=provider.default_model,
        openai_api_key_set=bool(settings.openai_api_key),
        ollama_base_url=settings.ollama_base_url,
        ollama_chat_model=settings.ollama_chat_model,
        openai_chat_model=settings.openai_chat_model,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        max_file_size_mb=settings.max_file_size_mb,
    )


@router.put("")
async def update_settings(body: SettingsUpdate):
    """설정 업데이트 (런타임 전환). 서버 재시작 없이 LLM Provider 교체."""
    settings = get_settings()
    changed = []

    if body.llm_provider and body.llm_provider in ("openai", "ollama"):
        settings.llm_provider = body.llm_provider
        changed.append(f"llm_provider={body.llm_provider}")

    if body.openai_api_key is not None:
        settings.openai_api_key = body.openai_api_key
        changed.append("openai_api_key updated")

    if body.openai_chat_model:
        settings.openai_chat_model = body.openai_chat_model
        changed.append(f"openai_chat_model={body.openai_chat_model}")

    # Provider 재초기화
    reset_llm_provider()
    provider = get_llm_provider()

    logger.info("설정 업데이트", changes=changed, active_provider=provider.provider_name)
    return {
        "updated": changed,
        "active_provider": provider.provider_name,
        "active_model": provider.default_model,
    }
