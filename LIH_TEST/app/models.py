from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ScanResult(BaseModel):
    job_id: str
    folder_path: str
    total_files: int
    total_size_mb: float
    file_types: dict[str, int]

class IndexJob(BaseModel):
    id: int
    root_path: str
    total_files: int
    indexed_files: int
    status: str = "pending"
    created_at: datetime

class ReorganizationPlan(BaseModel):
    plan_id: str
    actions: list[dict]
    summary: Optional[str] = None
