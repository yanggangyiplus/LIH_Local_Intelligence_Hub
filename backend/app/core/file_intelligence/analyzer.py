"""
파일 분석 모듈.
스캔 결과를 기반으로 중복, 패턴, 구조 분석을 수행합니다.
"""

import re
from collections import defaultdict
from pathlib import Path
from typing import Optional

from app.core.logging_config import get_logger
from app.models.schemas import (
    DuplicateGroup,
    FileMetadata,
    NamingPattern,
    ScanResult,
)

logger = get_logger(__name__)


class FileAnalyzer:
    """
    스캔된 파일 목록을 분석합니다.
    - 중복 감지 (해시 기반)
    - 네이밍 패턴 불일치 감지
    - 폴더 구조 통계
    """

    def __init__(
        self,
        files: list[FileMetadata],
        hash_to_paths: dict[str, list[str]],
    ) -> None:
        self.files = files
        self.hash_to_paths = hash_to_paths

    def find_duplicates(self) -> list[DuplicateGroup]:
        """해시 기반 중복 그룹 추출."""
        groups: list[DuplicateGroup] = []
        seen_hashes: set[str] = set()

        for h, paths in self.hash_to_paths.items():
            if h == "empty" or len(paths) < 2:
                continue
            if h in seen_hashes:
                continue
            seen_hashes.add(h)
            # 짧은 경로를 유지 권장 (보통 더 상위)
            suggested = min(paths, key=len)
            groups.append(
                DuplicateGroup(
                    file_hashes=[h],
                    file_paths=sorted(paths),
                    suggested_keep=suggested,
                )
            )
        return groups

    def detect_naming_patterns(self) -> list[NamingPattern]:
        """네이밍 일관성 분석."""
        patterns: list[NamingPattern] = []

        # 폴더별 파일명 확장자/케이스 패턴
        by_folder: dict[str, list[FileMetadata]] = defaultdict(list)
        for f in self.files:
            if not f.is_dir:
                parent = str(Path(f.path).parent)
                by_folder[parent].append(f)

        # 같은 폴더 내 대소문자 혼용
        for folder, files in by_folder.items():
            names = [f.filename for f in files]
            lower_names = [n.lower() for n in names]
            if len(set(lower_names)) != len(set(names)):
                patterns.append(
                    NamingPattern(
                        pattern_type="inconsistent_case",
                        description="같은 폴더 내 대소문자만 다른 파일명 존재",
                        affected_paths=names,
                        suggestion="일관된 케이스 규칙 적용 (예: snake_case)",
                    )
                )

        # 날짜/숫자 prefix 패턴 (일부만 있음)
        date_pattern = re.compile(r"^\d{4}[-_]?\d{2}[-_]?\d{2}")
        for folder, files in by_folder.items():
            with_prefix = [f for f in files if date_pattern.match(f.filename)]
            without_prefix = [f for f in files if not date_pattern.match(f.filename) and not f.filename.startswith(".")]
            if with_prefix and without_prefix and len(with_prefix) >= 2:
                patterns.append(
                    NamingPattern(
                        pattern_type="mixed_date_prefix",
                        description="일부 파일만 날짜 prefix 사용",
                        affected_paths=[f.path for f in with_prefix + without_prefix[:3]],
                        suggestion="날짜 prefix 규칙 통일 또는 제거",
                    )
                )

        return patterns

    def build_scan_result(
        self,
        job_id: str,
        root_path: str,
        status: str = "completed",
        error: Optional[str] = None,
    ) -> ScanResult:
        """분석 결과를 ScanResult로 조립."""
        duplicates = self.find_duplicates()
        naming = self.detect_naming_patterns()
        total_size = sum(f.size_bytes for f in self.files if not f.is_dir)
        total_files = sum(1 for f in self.files if not f.is_dir)
        total_dirs = sum(1 for f in self.files if f.is_dir)

        return ScanResult(
            job_id=job_id,
            root_path=root_path,
            status=status,
            total_files=total_files,
            total_dirs=total_dirs,
            total_size_bytes=total_size,
            files=self.files,
            duplicates=duplicates,
            naming_patterns=naming,
            scanned_at=None,
            error=error,
        )
