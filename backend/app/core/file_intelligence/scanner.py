"""
파일 스캐너 모듈.

사용자 지정 루트 디렉토리를 스캔하여 구조·메타데이터를 수집.
(파일 정리 기능: 구조·내용·메타데이터 분석의 첫 단계)
"""

import xxhash
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Optional

from app.core.logging_config import get_logger
from app.core.config import get_settings
from app.models.schemas import FileMetadata, JobStatus
from app.utils.safe_file_ops import SafeFileOperations, create_safe_ops_for_root, PathSecurityError

logger = get_logger(__name__)


class FileScanner:
    """
    폴더 스캔을 수행합니다.
    - 메타데이터 추출 (파일명, 확장자, 크기, 날짜, 깊이)
    - xxhash 기반 파일 해시 (중복 감지용)
    - 비동기 스트리밍 지원
    """

    def __init__(self, root_path: Path) -> None:
        self.root = Path(root_path).resolve()
        self.safe_ops = create_safe_ops_for_root(self.root)
        self.settings = get_settings()
        self._max_file_size = self.settings.max_file_size_mb * 1024 * 1024

    def _get_file_hash(self, path: Path) -> Optional[str]:
        """파일 내용 해시 (중복 감지용). 크기 제한 내에서만."""
        try:
            size = path.stat().st_size
            if size > self._max_file_size:
                return None
            if size == 0:
                return "empty"
            with open(path, "rb") as f:
                h = xxhash.xxh64()
                # 대용량 파일은 앞부분만 샘플링
                chunk_size = min(64 * 1024, size)
                data = f.read(chunk_size)
                h.update(data)
                if size > chunk_size:
                    f.seek(-chunk_size, 2)
                    h.update(f.read(chunk_size))
                return h.hexdigest()
        except (OSError, IOError) as e:
            logger.warning("파일 해시 계산 실패", path=str(path), error=str(e))
            return None

    def _collect_metadata(self, path: Path, depth: int) -> Optional[FileMetadata]:
        """단일 파일/폴더에 대한 메타데이터 수집."""
        try:
            stat = path.stat()
        except OSError:
            return None

        is_dir = path.is_dir()
        name = path.name
        ext = path.suffix.lower() if path.suffix else ""

        return FileMetadata(
            path=str(path),
            filename=name,
            extension=ext,
            size_bytes=0 if is_dir else stat.st_size,
            created_at=datetime.fromtimestamp(stat.st_ctime) if stat.st_ctime else None,
            modified_at=datetime.fromtimestamp(stat.st_mtime) if stat.st_mtime else None,
            folder_depth=depth,
            is_dir=is_dir,
        )

    def scan_sync(self) -> tuple[list[FileMetadata], dict[str, list[str]]]:
        """
        동기 스캔. 전체 결과 반환.
        Returns:
            (파일 메타데이터 목록, 해시별 경로 맵)
        """
        files: list[FileMetadata] = []
        hash_to_paths: dict[str, list[str]] = {}

        def _walk(current: Path, depth: int) -> None:
            if depth > self.settings.max_scan_depth:
                return
            items = self.safe_ops.list_dir_safe(current, include_files=True, include_dirs=True)
            for item in items:
                meta = self._collect_metadata(item, depth)
                if meta:
                    files.append(meta)
                    if item.is_file():
                        h = self._get_file_hash(item)
                        if h:
                            hash_to_paths.setdefault(h, []).append(str(item))
                if item.is_dir():
                    _walk(item, depth + 1)

        _walk(self.root, 0)
        return files, hash_to_paths

    async def scan_async(
        self,
    ) -> AsyncGenerator[FileMetadata | dict, None]:
        """
        비동기 스캔. 진행 중 메타데이터를 스트리밍.
        대량 스캔 시 메모리 절약 및 진행률 보고용.
        """
        import asyncio

        def _sync_walk() -> list[tuple[Path, int]]:
            """먼저 경로 목록 수집."""
            stack: list[tuple[Path, int]] = [(self.root, 0)]
            result: list[tuple[Path, int]] = []
            while stack:
                current, depth = stack.pop()
                if depth > self.settings.max_scan_depth:
                    continue
                for item in self.safe_ops.list_dir_safe(current, True, True):
                    result.append((item, depth))
                    if item.is_dir():
                        stack.append((item, depth + 1))
            return result

        paths = await asyncio.to_thread(_sync_walk)
        for path, depth in paths:
            meta = self._collect_metadata(path, depth)
            if meta:
                yield meta
            await asyncio.sleep(0)
