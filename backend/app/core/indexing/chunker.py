"""
텍스트 청킹 모듈.
의미 단위로 텍스트를 분할하여 RAG 검색 품질을 향상시킵니다.
"""

import re
from pathlib import Path
from typing import Generator

from app.core.config import get_settings


class TextChunker:
    """
    텍스트 청킹.
    - 고정 크기 + 오버랩
    - 문단/문장 경계 우선 분할
    """

    def __init__(
        self,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ) -> None:
        settings = get_settings()
        self.chunk_size = chunk_size or settings.chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap

    def chunk(
        self,
        text: str,
        file_path: str = "",
    ) -> Generator[tuple[str, int], None, None]:
        """
        텍스트를 청크로 분할.
        Yields:
            (청크 텍스트, 청크 인덱스)
        """
        if not text or not text.strip():
            return

        # 문단 단위로 먼저 분리
        paragraphs = re.split(r"\n\s*\n", text.strip())
        current_chunk: list[str] = []
        current_len = 0
        idx = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            para_len = len(para) + 2  # \n\n

            if current_len + para_len <= self.chunk_size:
                current_chunk.append(para)
                current_len += para_len
            else:
                if current_chunk:
                    yield "\n\n".join(current_chunk), idx
                    idx += 1
                # 긴 문단은 문장/단어 단위로 재분할
                if len(para) > self.chunk_size:
                    for sub in self._split_long_paragraph(para):
                        yield sub, idx
                        idx += 1
                    current_chunk = []
                    current_len = 0
                else:
                    current_chunk = [para]
                    current_len = para_len

        if current_chunk:
            yield "\n\n".join(current_chunk), idx

    def _split_long_paragraph(self, para: str) -> Generator[str, None, None]:
        """긴 문단을 chunk_size 이하로 분할 (오버랩 포함)."""
        tokens = para.replace("\n", " ").split()
        start = 0
        while start < len(tokens):
            end = start + (self.chunk_size // 4)  # 대략 단어 수
            chunk_tokens = tokens[start:end]
            text = " ".join(chunk_tokens)
            if text.strip():
                yield text
            start = end - (self.chunk_overlap // 4) if self.chunk_overlap else end
            if start >= len(tokens):
                break
