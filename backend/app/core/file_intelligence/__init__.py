"""
File Intelligence Engine.

파일·폴더의 구조·내용·메타데이터를 분석하고, AI 정리 계획(이동·리네이밍·중복 정리 등)을 생성.
미리보기 제시 → 사용자 확인·승인 시에만 Apply Engine으로 실제 파일 시스템에 반영.
모든 작업 기록 저장으로 Undo(되돌리기) 지원. 흐름: 이해 → 판단 → 계획 → 실행 → Undo.
"""

from app.core.file_intelligence.scanner import FileScanner
from app.core.file_intelligence.analyzer import FileAnalyzer
from app.core.file_intelligence.planner import OrganizationPlanner
from app.core.file_intelligence.executor import ReorganizationExecutor

__all__ = [
    "FileScanner",
    "FileAnalyzer",
    "OrganizationPlanner",
    "ReorganizationExecutor",
]
