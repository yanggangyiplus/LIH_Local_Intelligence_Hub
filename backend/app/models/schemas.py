"""
Pydantic 스키마 정의.
API 요청/응답 및 내부 DTO.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ----- 공통 -----


class JobStatus(str, Enum):
    """작업 상태."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ----- File Intelligence -----


class FileMetadata(BaseModel):
    """파일 메타데이터."""

    path: str
    filename: str
    extension: str
    size_bytes: int
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None
    folder_depth: int
    is_dir: bool = False
    content_summary: Optional[str] = None


class DuplicateGroup(BaseModel):
    """중복 파일 그룹."""

    file_hashes: list[str]
    file_paths: list[str]
    suggested_keep: Optional[str] = None  # 유지 권장 경로


class NamingPattern(BaseModel):
    """네이밍 패턴 불일치."""

    pattern_type: str  # e.g. "inconsistent_case", "missing_prefix"
    description: str
    affected_paths: list[str]
    suggestion: Optional[str] = None


class ScanResult(BaseModel):
    """스캔 결과."""

    job_id: str
    root_path: str
    status: JobStatus
    total_files: int = 0
    total_dirs: int = 0
    total_size_bytes: int = 0
    files: list[FileMetadata] = Field(default_factory=list)
    duplicates: list[DuplicateGroup] = Field(default_factory=list)
    naming_patterns: list[NamingPattern] = Field(default_factory=list)
    scanned_at: Optional[datetime] = None
    error: Optional[str] = None


class ProposedAction(str, Enum):
    """제안된 작업 유형."""

    RENAME = "rename"
    MOVE = "move"
    ARCHIVE = "archive"
    DELETE_DUPLICATE = "delete_duplicate"
    CREATE_FOLDER = "create_folder"


class ReorganizationAction(BaseModel):
    """재구성 작업 단위."""

    id: Optional[str] = None  # 클라이언트 추적용
    action_type: ProposedAction
    source_path: str
    target_path: Optional[str] = None
    reason: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReorganizationPlan(BaseModel):
    """AI 생성 재구성 계획."""

    plan_id: str
    root_path: str
    actions: list[ReorganizationAction] = Field(default_factory=list)
    proposed_folder_tree: Optional[dict[str, Any]] = None
    summary: Optional[str] = None
    dry_run_safe: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApplyReorganizationRequest(BaseModel):
    """재구성 적용 요청."""

    plan_id: str
    action_ids: list[str] = Field(default_factory=list)  # 비어있으면 전체
    dry_run: bool = True
    confirm: bool = False


# ----- Local Knowledge (RAG) -----


class IndexRequest(BaseModel):
    """인덱싱 요청."""

    root_path: str
    include_patterns: list[str] = Field(default_factory=lambda: ["*"])
    exclude_patterns: list[str] = Field(
        default_factory=lambda: [
            "**/node_modules/**",
            "**/.git/**",
            "**/__pycache__/**",
            "**/*.pyc",
        ]
    )
    force_reindex: bool = False


class QueryRequest(BaseModel):
    """RAG 질의 요청."""

    query: str
    scope: str = "all"  # all, folder, project, file
    scope_path: Optional[str] = None
    top_k: int = 8  # 검색 품질 개선을 위해 8개 기본
    include_sources: bool = True


class QueryChunk(BaseModel):
    """검색된 청크."""

    content: str
    file_path: str
    chunk_index: int
    score: float


class QueryResponse(BaseModel):
    """RAG 질의 응답 (비스트리밍)."""

    answer: str
    sources: list[QueryChunk] = Field(default_factory=list)
    model_used: Optional[str] = None


# ----- Study -----


class StudyRequest(BaseModel):
    """학습 엔진 요청 공통."""

    root_path: str
    options: dict[str, Any] = Field(default_factory=dict)


class ConceptExtractionResult(BaseModel):
    """개념 추출 결과."""

    concepts: list[dict[str, Any]]
    file_links: dict[str, list[str]]  # concept_id -> file_paths


class StudyPlanResult(BaseModel):
    """학습 계획 결과."""

    plan: list[dict[str, Any]]
    estimated_duration_minutes: Optional[int] = None
