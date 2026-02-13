"""
로깅 시스템 설정.
structlog 기반 구조화 로깅.
"""

import logging
import sys
from typing import Any

import structlog


def configure_logging(log_level: str = "INFO") -> None:
    """
    애플리케이션 로깅 구성을 수행합니다.
    structlog와 stdlib logging을 연동합니다.
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    # 공통 프로세서
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    structlog.configure(
        processors=shared_processors
        + [
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
            if log_level == "DEBUG"
            else structlog.dev.ConsoleRenderer(colors=True),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # stdlib 로깅 레벨 설정
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """모듈별 로거 반환."""
    return structlog.get_logger(name)
