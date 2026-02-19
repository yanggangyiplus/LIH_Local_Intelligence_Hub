"""
Study & Context Engine.

로컬 폴더를 학습 공간으로: 개념 추출, 요약, 질문 생성, 학습 계획 생성.
(핵심 엔진 3종 중 하나)
"""

from app.core.study.service import StudyService

__all__ = ["StudyService"]
