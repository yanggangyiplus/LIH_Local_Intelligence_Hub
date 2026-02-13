"""
AI 기반 재구성 계획 생성 모듈.
스캔/분석 결과를 바탕으로 LLM을 활용해 정리 계획을 생성합니다.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from ollama import Client as OllamaClient

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.models.schemas import (
    ProposedAction,
    ReorganizationAction,
    ReorganizationPlan,
    ScanResult,
)

logger = get_logger(__name__)


class OrganizationPlanner:
    """
    AI 기반 폴더/파일 재구성 계획 생성.
    Ollama LLM을 사용하여 자연어 기반 계획 생성.
    """

    def __init__(self, scan_result: ScanResult) -> None:
        self.scan = scan_result
        self.settings = get_settings()

    def _build_context(self) -> str:
        """LLM에 전달할 컨텍스트 문자열 생성."""
        lines = [
            f"루트 경로: {self.scan.root_path}",
            f"파일 수: {self.scan.total_files}, 폴더 수: {self.scan.total_dirs}",
            f"총 크기: {self.scan.total_size_bytes / (1024*1024):.1f} MB",
        ]
        if self.scan.duplicates:
            lines.append("\n[중복 파일]")
            for d in self.scan.duplicates[:10]:
                lines.append(f"  - {d.file_paths}")
        if self.scan.naming_patterns:
            lines.append("\n[네이밍 패턴 이슈]")
            for n in self.scan.naming_patterns[:5]:
                lines.append(f"  - {n.pattern_type}: {n.description}")
        lines.append("\n[파일/폴더 샘플 (상위 30개)]")
        for f in self.scan.files[:30]:
            prefix = "DIR " if f.is_dir else "FILE"
            lines.append(f"  {prefix} {f.path} ({f.extension}, {f.size_bytes} bytes)")
        return "\n".join(lines)

    def _call_llm(self, prompt: str) -> Optional[str]:
        """Ollama LLM 호출."""
        try:
            client = OllamaClient(host=self.settings.ollama_base_url)
            response = client.chat(
                model=self.settings.ollama_chat_model,
                messages=[{"role": "user", "content": prompt}],
            )
            msg = getattr(response, "message", None) or response.get("message", {})
            content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else None)
            return content
        except Exception as e:
            logger.error("LLM 호출 실패", error=str(e))
            return None

    def generate_plan(self) -> ReorganizationPlan:
        """
        스캔 결과 기반 AI 재구성 계획 생성.
        LLM 실패 시 기본 규칙 기반 계획만 반환.
        """
        plan_id = str(uuid.uuid4())
        actions: list[ReorganizationAction] = []

        # 1) 중복 파일 제거 제안 (유지 제외 삭제)
        for dup in self.scan.duplicates:
            for p in dup.file_paths:
                if p != dup.suggested_keep:
                    actions.append(
                        ReorganizationAction(
                            action_type=ProposedAction.DELETE_DUPLICATE,
                            source_path=p,
                            target_path=None,
                            reason=f"중복 파일 (유지: {dup.suggested_keep})",
                            metadata={"duplicate_group": dup.file_paths},
                        )
                    )

        # 2) LLM 기반 추가 제안
        context = self._build_context()
        prompt = f"""다음은 로컬 폴더 구조 스캔 결과입니다. 개선된 정리 계획을 JSON 배열로 제안해주세요.

{context}

다음 형식의 JSON 배열만 출력하세요 (다른 텍스트 없이):
[
  {{"action": "rename"|"move"|"archive"|"create_folder", "source": "원본경로", "target": "대상경로", "reason": "이유"}},
  ...
]

주의: delete_duplicate는 이미 제안되어 있으므로 제외. move 시 target은 폴더 경로. create_folder 시 source 없이 target만.
"""

        llm_out = self._call_llm(prompt)
        if llm_out:
            try:
                # JSON 블록 추출
                text = llm_out.strip()
                if "```" in text:
                    start = text.find("[")
                    end = text.rfind("]") + 1
                    if start >= 0 and end > start:
                        text = text[start:end]
                arr = json.loads(text)
                for item in arr:
                    action = item.get("action", "").lower()
                    source = item.get("source", "")
                    target = item.get("target", "")
                    reason = item.get("reason", "")
                    if action == "rename" and source and target:
                        actions.append(
                            ReorganizationAction(
                                action_type=ProposedAction.RENAME,
                                source_path=source,
                                target_path=target,
                                reason=reason,
                            )
                        )
                    elif action == "move" and source and target:
                        actions.append(
                            ReorganizationAction(
                                action_type=ProposedAction.MOVE,
                                source_path=source,
                                target_path=target,
                                reason=reason,
                            )
                        )
                    elif action == "create_folder" and target:
                        actions.append(
                            ReorganizationAction(
                                action_type=ProposedAction.CREATE_FOLDER,
                                source_path="",
                                target_path=target,
                                reason=reason,
                            )
                        )
            except json.JSONDecodeError as e:
                logger.warning("LLM JSON 파싱 실패", error=str(e))

        llm_used = llm_out is not None
        summary = (
            f"총 {len(actions)}개 작업 제안 (중복 {len(self.scan.duplicates)}그룹 포함)"
            + ("" if llm_used else ". (Ollama 미실행으로 AI 추가 제안 없음 - ollama serve 실행 후 재시도)")
        )
        return ReorganizationPlan(
            plan_id=plan_id,
            root_path=self.scan.root_path,
            actions=actions,
            proposed_folder_tree=None,
            summary=summary,
            dry_run_safe=True,
            created_at=datetime.utcnow(),
        )
