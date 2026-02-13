"""
API 의존성.
"""

from pathlib import Path

from app.utils.safe_file_ops import PathSecurityError, create_safe_ops_for_root


def validate_root_path(path: str) -> Path:
    """루트 경로 검증 후 Path 반환."""
    p = Path(path).resolve()
    if not p.exists():
        raise ValueError(f"경로가 존재하지 않습니다: {path}")
    if not p.is_dir():
        raise ValueError(f"디렉토리만 허용됩니다: {path}")
    create_safe_ops_for_root(p)  # 보안 검증
    return p
