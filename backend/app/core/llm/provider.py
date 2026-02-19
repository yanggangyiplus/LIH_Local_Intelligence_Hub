"""
LLM Provider 추상화.

OpenAI(gpt-4o-mini)와 Ollama(로컬) 두 백엔드를 공통 인터페이스로 제공.
config.llm_provider 설정에 따라 자동 선택.
임베딩은 이 모듈 범위 밖 (기존 Embedder 유지).
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class LLMProvider(ABC):
    """LLM 호출 공통 인터페이스."""

    @abstractmethod
    async def chat(self, messages: list[dict], model: Optional[str] = None) -> str:
        """메시지 기반 대화 완성 (비스트리밍)."""
        ...

    @abstractmethod
    async def chat_stream(
        self, messages: list[dict], model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """메시지 기반 대화 완성 (스트리밍). 토큰 단위로 yield."""
        ...

    @abstractmethod
    def chat_sync(self, messages: list[dict], model: Optional[str] = None) -> str:
        """동기 대화 완성 (planner 등 sync 컨텍스트용)."""
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...

    @property
    @abstractmethod
    def default_model(self) -> str:
        ...


class OpenAIProvider(LLMProvider):
    """OpenAI API 기반 LLM Provider (gpt-4o-mini 기본)."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None
        self._sync_client = None

    @property
    def client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        return self._client

    @property
    def sync_client(self):
        if self._sync_client is None:
            from openai import OpenAI
            self._sync_client = OpenAI(api_key=self.settings.openai_api_key)
        return self._sync_client

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def default_model(self) -> str:
        return self.settings.openai_chat_model

    async def chat(self, messages: list[dict], model: Optional[str] = None) -> str:
        """OpenAI 비스트리밍 대화 완성."""
        resp = await self.client.chat.completions.create(
            model=model or self.default_model,
            messages=messages,
            temperature=0.7,
        )
        return resp.choices[0].message.content or ""

    async def chat_stream(
        self, messages: list[dict], model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """OpenAI 스트리밍 대화 완성."""
        stream = await self.client.chat.completions.create(
            model=model or self.default_model,
            messages=messages,
            temperature=0.7,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    def chat_sync(self, messages: list[dict], model: Optional[str] = None) -> str:
        """OpenAI 동기 대화 완성."""
        resp = self.sync_client.chat.completions.create(
            model=model or self.default_model,
            messages=messages,
            temperature=0.7,
        )
        return resp.choices[0].message.content or ""


class OllamaProvider(LLMProvider):
    """Ollama(로컬) 기반 LLM Provider."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._async_client = None
        self._sync_client = None

    @property
    def async_client(self):
        if self._async_client is None:
            from ollama import AsyncClient
            self._async_client = AsyncClient(host=self.settings.ollama_base_url)
        return self._async_client

    @property
    def sync_client(self):
        if self._sync_client is None:
            from ollama import Client
            self._sync_client = Client(host=self.settings.ollama_base_url)
        return self._sync_client

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def default_model(self) -> str:
        return self.settings.ollama_chat_model

    async def chat(self, messages: list[dict], model: Optional[str] = None) -> str:
        """Ollama 비스트리밍 대화 완성."""
        response = await self.async_client.chat(
            model=model or self.default_model,
            messages=messages,
        )
        return getattr(response.message, "content", "") or ""

    async def chat_stream(
        self, messages: list[dict], model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Ollama 스트리밍 대화 완성."""
        stream = self.async_client.chat(
            model=model or self.default_model,
            messages=messages,
            stream=True,
        )
        async for part in stream:
            content = getattr(part.message, "content", "") or ""
            if content:
                yield content

    def chat_sync(self, messages: list[dict], model: Optional[str] = None) -> str:
        """Ollama 동기 대화 완성."""
        response = self.sync_client.chat(
            model=model or self.default_model,
            messages=messages,
        )
        msg = getattr(response, "message", None) or response.get("message", {})
        return getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else "") or ""


# --- 싱글톤 팩토리 ---

_provider_instance: Optional[LLMProvider] = None


def get_llm_provider() -> LLMProvider:
    """설정 기반 LLM Provider 싱글톤 반환."""
    global _provider_instance
    if _provider_instance is None:
        settings = get_settings()
        if settings.llm_provider == "openai" and settings.openai_api_key:
            _provider_instance = OpenAIProvider()
            logger.info("LLM Provider: OpenAI", model=settings.openai_chat_model)
        else:
            _provider_instance = OllamaProvider()
            logger.info("LLM Provider: Ollama", model=settings.ollama_chat_model)
    return _provider_instance


def reset_llm_provider():
    """Provider 재초기화 (설정 변경 시)."""
    global _provider_instance
    _provider_instance = None
