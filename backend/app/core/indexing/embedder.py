"""
임베딩 생성 모듈.
Ollama 임베딩 모델 우선, fallback으로 sentence-transformers 사용.
MPS(Apple Silicon) segfault 방지를 위해 CPU 사용 옵션 제공.
"""

from typing import Optional

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# 전역 모델 싱글톤 (중복 로드 및 segfault 방지)
_st_model_singleton: Optional[object] = None


class Embedder:
    """
    로컬 임베딩 생성.
    - Ollama embed API 우선
    - sentence-transformers fallback (CPU 권장: MPS segfault 방지)
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._ollama_available: Optional[bool] = None

    def _check_ollama(self) -> bool:
        """Ollama 임베딩 사용 가능 여부."""
        if self._ollama_available is not None:
            return self._ollama_available
        try:
            from ollama import Client

            client = Client(host=self.settings.ollama_base_url)
            client.embed(model=self.settings.ollama_embedding_model, input="test")
            self._ollama_available = True
        except Exception as e:
            logger.warning("Ollama 임베딩 사용 불가, sentence-transformers로 전환", error=str(e))
            self._ollama_available = False
        return self._ollama_available

    def _get_st_model(self):
        """sentence-transformers 모델 lazy 로드 (전역 싱글톤)."""
        global _st_model_singleton
        if _st_model_singleton is None:
            from sentence_transformers import SentenceTransformer

            device = "cpu" if self.settings.use_embedding_cpu else None
            _st_model_singleton = SentenceTransformer(
                self.settings.sentence_transformers_model,
                device=device,
            )
            logger.info("sentence-transformers 모델 로드 완료", device=device or "auto")
        return _st_model_singleton

    def embed(self, texts: list[str], force_sentence_transformers: bool = False) -> list[list[float]]:
        """텍스트 리스트를 임베딩 벡터로 변환. 설정 또는 인자로 ST 강제 가능."""
        use_st = force_sentence_transformers or self.settings.force_sentence_transformers
        if use_st:
            return self._embed_st(texts)
        if self._check_ollama():
            return self._embed_ollama(texts)
        return self._embed_st(texts)

    def _embed_ollama(self, texts: list[str]) -> list[list[float]]:
        """Ollama embed API 사용."""
        from ollama import Client

        client = Client(host=self.settings.ollama_base_url)
        result = client.embed(
            model=self.settings.ollama_embedding_model,
            input=texts,
        )
        embeddings = result.get("embeddings", [])
        if isinstance(embeddings, list) and embeddings:
            if isinstance(embeddings[0], list):
                return embeddings
            return [embeddings]
        return []

    def _embed_st(self, texts: list[str]) -> list[list[float]]:
        """sentence-transformers 사용 (CPU로 MPS segfault 방지)."""
        model = self._get_st_model()
        vectors = model.encode(
            texts,
            convert_to_numpy=True,
            batch_size=32,
            show_progress_bar=False,
        )
        return vectors.tolist()
