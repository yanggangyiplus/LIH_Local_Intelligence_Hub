"""
임베딩 생성 모듈.
- use_openai_embedding 시: OpenAI Embeddings API (클라우드/경량 이미지용)
- 그 외: Ollama embed 우선 → sentence-transformers fallback
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
    임베딩 생성.
    - use_openai_embedding + openai_api_key: OpenAI API (경량 배포용)
    - Ollama embed API
    - sentence-transformers fallback (로컬, CPU 권장)
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
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError:
                raise RuntimeError(
                    "sentence-transformers가 설치되지 않았습니다. "
                    "클라우드 배포 시 USE_OPENAI_EMBEDDING=true 및 OPENAI_API_KEY를 설정하세요."
                )

            device = "cpu" if self.settings.use_embedding_cpu else None
            _st_model_singleton = SentenceTransformer(
                self.settings.sentence_transformers_model,
                device=device,
            )
            logger.info("sentence-transformers 모델 로드 완료", device=device or "auto")
        return _st_model_singleton

    def embed(self, texts: list[str], force_sentence_transformers: bool = False) -> list[list[float]]:
        """텍스트 리스트를 임베딩 벡터로 변환. 설정 또는 인자로 ST 강제 가능."""
        if self.settings.use_openai_embedding and self.settings.openai_api_key:
            return self._embed_openai(texts)
        use_st = force_sentence_transformers or self.settings.force_sentence_transformers
        if use_st:
            return self._embed_st(texts)
        if self._check_ollama():
            return self._embed_ollama(texts)
        # sentence_transformers 미설치 환경(경량 이미지)에서는 OpenAI로 폴백
        if self.settings.openai_api_key:
            return self._embed_openai(texts)
        return self._embed_st(texts)

    def _embed_openai(self, texts: list[str]) -> list[list[float]]:
        """OpenAI Embeddings API 사용 (클라우드/경량 이미지용)."""
        from openai import OpenAI

        client = OpenAI(api_key=self.settings.openai_api_key)
        model = self.settings.openai_embedding_model
        # API당 입력 제한 있으므로 배치 처리 (텍스트-임베딩-3-small 기준 충분히 작게)
        batch_size = 100
        out: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            resp = client.embeddings.create(input=batch, model=model)
            for e in sorted(resp.data, key=lambda x: x.index):
                out.append(e.embedding)
        return out

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
