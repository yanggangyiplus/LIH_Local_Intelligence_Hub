"""
설정 관리 모듈.
.env 파일 및 환경변수 기반 구성을 로드합니다.
"""

from pathlib import Path
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 설정."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    host: str = Field(default="127.0.0.1", description="API 서버 호스트")
    port: int = Field(default=8000, description="API 서버 포트")
    debug: bool = Field(default=False, description="디버그 모드")

    # Paths
    data_dir: Path = Field(default=Path("./data"), description="데이터 저장 디렉토리")
    chroma_persist_dir: Path = Field(
        default=Path("./data/chroma"), description="ChromaDB 영구 저장 경로"
    )
    sqlite_db_path: Path = Field(default=Path("./data/lih.db"), description="SQLite DB 경로")

    # LLM (Ollama)
    ollama_base_url: str = Field(
        default="http://localhost:11434", description="Ollama API 베이스 URL"
    )
    ollama_embedding_model: str = Field(
        default="nomic-embed-text", description="Ollama 임베딩 모델"
    )
    ollama_chat_model: str = Field(
        default="llama3.2", description="Ollama 채팅/완성 모델"
    )

    # Embedding fallback
    sentence_transformers_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Ollama 미사용 시 sentence-transformers 모델",
    )
    use_embedding_cpu: bool = Field(
        default=True,
        description="sentence-transformers를 CPU로 실행 (MPS segfault 방지)",
    )

    # Indexing
    chunk_size: int = Field(default=512, description="텍스트 청크 크기")
    chunk_overlap: int = Field(default=64, description="청크 오버랩 크기")
    max_file_size_mb: int = Field(default=50, description="인덱싱 최대 파일 크기 (MB)")

    # Security
    max_scan_depth: int = Field(default=20, description="최대 디렉토리 탐색 깊이")
    allowed_root_paths: str = Field(
        default="",
        description="허용 루트 경로 (쉼표 구분, 비어있으면 사용자 지정만)",
    )

    # Logging
    log_level: str = Field(default="INFO", description="로그 레벨")

    @field_validator(
        "data_dir",
        "chroma_persist_dir",
        "sqlite_db_path",
        mode="before",
    )
    @classmethod
    def resolve_path(cls, v: str | Path) -> Path:
        """경로를 절대 경로로 변환."""
        p = Path(v) if isinstance(v, str) else v
        if not p.is_absolute():
            # 프로젝트 루트 기준
            base = Path(__file__).resolve().parent.parent.parent
            p = (base / p).resolve()
        return p

    @property
    def allowed_roots(self) -> list[Path]:
        """허용 루트 경로 목록 (빈 문자열이면 빈 리스트)."""
        if not self.allowed_root_paths.strip():
            return []
        return [Path(p.strip()).resolve() for p in self.allowed_root_paths.split(",") if p.strip()]


# 싱글톤 설정 인스턴스
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """설정 인스턴스 반환."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
