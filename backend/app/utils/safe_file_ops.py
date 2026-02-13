"""
안전한 파일 작업 추상화 계층.
경로 검증, 심볼릭 링크 처리, 위험 작업 차단을 담당합니다.
"""

import os
import shutil
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class PathSecurityError(Exception):
    """경로 보안 검증 실패 시 발생."""

    pass


class SafeFileOperations:
    """
    안전한 파일 시스템 작업을 위한 래퍼.
    - 사용자 지정 루트 이내 경로만 허용
    - 심볼릭 링크 순회 제한
    - 깊이 제한
    """

    def __init__(
        self,
        root_path: Path,
        max_depth: Optional[int] = None,
        follow_symlinks: bool = False,
    ) -> None:
        """
        Args:
            root_path: 허용 최상위 루트 경로
            max_depth: 최대 디렉토리 깊이 (None이면 설정값 사용)
            follow_symlinks: 심볼릭 링크 따라갈지 여부
        """
        self.root = root_path.resolve()
        if not self.root.exists():
            raise PathSecurityError(f"루트 경로가 존재하지 않음: {self.root}")
        if not self.root.is_dir():
            raise PathSecurityError(f"루트 경로는 디렉토리여야 함: {self.root}")
        self.max_depth = max_depth or get_settings().max_scan_depth
        self.follow_symlinks = follow_symlinks

    def validate_path(self, path: Path) -> Path:
        """
        경로가 허용 루트 내에 있는지 검증합니다.
        Returns:
            정규화된 절대 경로
        Raises:
            PathSecurityError: 경로가 허용되지 않은 경우
        """
        resolved = path.resolve()
        try:
            resolved.relative_to(self.root)
        except ValueError:
            raise PathSecurityError(
                f"경로가 허용 루트 외부에 있음: {path} (root: {self.root})"
            )
        return resolved

    def validate_depth(self, path: Path) -> bool:
        """경로 깊이가 max_depth 이내인지 확인."""
        try:
            rel = path.resolve().relative_to(self.root)
        except ValueError:
            return False
        depth = len(rel.parts)
        return depth <= self.max_depth

    def safe_rename(self, source: Path, target: Path) -> None:
        """
        안전한 파일/폴더 이름 변경.
        source, target 모두 root 내부여야 함.
        """
        src = self.validate_path(source)
        tgt = self.validate_path(target)
        if not src.exists():
            raise FileNotFoundError(f"소스가 존재하지 않음: {src}")
        if tgt.exists():
            raise FileExistsError(f"대상이 이미 존재함: {tgt}")
        tgt.parent.mkdir(parents=True, exist_ok=True)
        src.rename(tgt)
        logger.info("safe_rename 완료", source=str(src), target=str(tgt))

    def safe_move(self, source: Path, target_dir: Path) -> Path:
        """
        안전한 파일/폴더 이동.
        Returns:
            이동된 최종 경로
        """
        src = self.validate_path(source)
        tgt_dir = self.validate_path(target_dir)
        if not tgt_dir.is_dir():
            tgt_dir.mkdir(parents=True, exist_ok=True)
        dest = tgt_dir / src.name
        if dest.exists():
            raise FileExistsError(f"대상이 이미 존재함: {dest}")
        shutil.move(str(src), str(dest))
        logger.info("safe_move 완료", source=str(src), dest=str(dest))
        return dest

    def safe_copy(self, source: Path, target: Path) -> None:
        """안전한 복사."""
        src = self.validate_path(source)
        tgt = self.validate_path(target)
        if tgt.exists():
            raise FileExistsError(f"대상이 이미 존재함: {tgt}")
        if src.is_dir():
            shutil.copytree(src, tgt)
        else:
            tgt.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, tgt)
        logger.info("safe_copy 완료", source=str(src), target=str(tgt))

    def safe_mkdir(self, path: Path, parents: bool = True) -> Path:
        """안전한 디렉토리 생성."""
        p = self.validate_path(path)
        p.mkdir(parents=parents, exist_ok=True)
        return p

    def safe_read_text(self, path: Path, encoding: str = "utf-8") -> str:
        """안전한 텍스트 읽기."""
        p = self.validate_path(path)
        return p.read_text(encoding=encoding)

    def safe_write_text(self, path: Path, content: str, encoding: str = "utf-8") -> None:
        """안전한 텍스트 쓰기."""
        p = self.validate_path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding=encoding)

    def list_dir_safe(
        self,
        path: Path,
        include_files: bool = True,
        include_dirs: bool = True,
    ) -> list[Path]:
        """
        안전한 디렉토리 목록 조회.
        max_depth 초과 시 빈 리스트 반환.
        """
        p = self.validate_path(path)
        if not self.validate_depth(p):
            return []
        if not p.is_dir():
            return []
        result: list[Path] = []
        try:
            for item in p.iterdir():
                if item.is_symlink() and not self.follow_symlinks:
                    continue
                try:
                    resolved = item.resolve()
                    resolved.relative_to(self.root)
                except (ValueError, OSError):
                    continue
                if item.is_dir() and include_dirs:
                    result.append(item)
                elif item.is_file() and include_files:
                    result.append(item)
        except PermissionError:
            logger.warning("권한 없음으로 디렉토리 읽기 스킵", path=str(p))
        return result


def create_safe_ops_for_root(root: Path) -> SafeFileOperations:
    """루트 경로에 대한 SafeFileOperations 인스턴스 생성."""
    settings = get_settings()
    if settings.allowed_roots:
        if not any(
            str(root.resolve()).startswith(str(r)) for r in settings.allowed_roots
        ):
            raise PathSecurityError(
                f"경로가 허용된 루트에 포함되지 않음: {root}"
            )
    return SafeFileOperations(root, max_depth=settings.max_scan_depth)
