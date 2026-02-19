"""
AI 정리 계획(Plan) 생성 모듈.

파일·폴더 구조·내용·메타데이터 분석 결과 + 파일 내용을 바탕으로
LLM(OpenAI/Ollama)이 이동·리네이밍·중복 정리 등 정리 계획을 생성.
LLM Provider 추상화 레이어를 통해 백엔드 자동 선택.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.core.indexing.extractor import TextExtractor
from app.core.llm.provider import get_llm_provider
from app.core.logging_config import get_logger
from app.models.schemas import (
    ProposedAction,
    ReorganizationAction,
    ReorganizationPlan,
    ScanResult,
)

logger = get_logger(__name__)


class PlanOptions:
    """정리 계획 생성 시 사용자 옵션."""

    def __init__(
        self,
        organize_by: str = "content",
        focus: str = "both",
    ):
        self.organize_by = organize_by
        self.focus = focus


class OrganizationPlanner:
    """
    AI 기반 폴더/파일 재구성 계획 생성.
    LLM Provider를 통해 OpenAI 또는 Ollama 자동 선택.
    """

    def __init__(self, scan_result: ScanResult, options: Optional[PlanOptions] = None) -> None:
        self.scan = scan_result
        self.settings = get_settings()
        self.options = options or PlanOptions()
        self._extractor = TextExtractor()

    def _resolve_to_root(self, root: Path, path_str: str) -> Path:
        """경로를 root 기준 절대 경로로 변환."""
        p = Path(path_str.strip())
        if p.is_absolute():
            try:
                p.relative_to(root)
                return p.resolve()
            except ValueError:
                pass
        return (root / path_str.lstrip("/")).resolve()

    def _is_noop_rename(self, root: Path, source: str, target: str) -> bool:
        """rename 작업이 no-op인지 확인."""
        try:
            src = self._resolve_to_root(root, source)
            tgt = self._resolve_to_root(root, target)
            return src == tgt
        except Exception:
            return False

    def _is_noop_move(self, root: Path, source: str, target: str) -> bool:
        """move 작업이 no-op인지 확인."""
        try:
            src = self._resolve_to_root(root, source)
            tgt_dir = self._resolve_to_root(root, target)
            dest = tgt_dir / Path(source).name
            return src == dest.resolve()
        except Exception:
            return False

    def _get_file_content_preview(self, path: Path, max_chars: int = 200) -> str:
        """파일 내용 일부 추출 (텍스트 파일만)."""
        try:
            if not self._extractor.can_extract(path):
                return ""
            text = self._extractor.extract(path)
            if text:
                cleaned = " ".join(text.split())[:max_chars]
                return cleaned + ("..." if len(text) > max_chars else "")
        except Exception:
            pass
        return ""

    def _build_context(self) -> str:
        """LLM에 전달할 컨텍스트 문자열 생성."""
        root = Path(self.scan.root_path)
        lines = [
            f"루트 경로: {root}",
            f"파일 수: {self.scan.total_files}, 폴더 수: {self.scan.total_dirs}",
            f"총 크기: {self.scan.total_size_bytes / (1024*1024):.1f} MB",
            f"\n[정리 기준] organize_by={self.options.organize_by}, focus={self.options.focus}",
        ]
        if self.scan.duplicates:
            lines.append("\n[중복 파일]")
            for d in self.scan.duplicates[:10]:
                lines.append(f"  - {d.file_paths}")
        if self.scan.naming_patterns:
            lines.append("\n[네이밍 패턴 이슈]")
            for n in self.scan.naming_patterns[:5]:
                lines.append(f"  - {n.pattern_type}: {n.description}")

        lines.append("\n[파일/폴더 목록 (이름, 확장자, 내용 미리보기)]")
        for f in self.scan.files[:40]:
            if f.is_dir:
                lines.append(f"  DIR  {f.path}")
            else:
                p = Path(f.path)
                if not p.is_absolute():
                    p = root / f.path
                content = self._get_file_content_preview(p)
                suffix = f" | 내용: {content}" if content else ""
                lines.append(f"  FILE {f.path} (확장자:{f.extension}, {f.size_bytes}B){suffix}")
        return "\n".join(lines)

    def _call_llm(self, prompt: str) -> Optional[str]:
        """LLM Provider를 통한 동기 LLM 호출."""
        try:
            llm = get_llm_provider()
            return llm.chat_sync([{"role": "user", "content": prompt}])
        except Exception as e:
            logger.error("LLM 호출 실패", error=str(e))
            return None

    def generate_plan(self) -> ReorganizationPlan:
        """스캔 결과 기반 AI 재구성 계획 생성."""
        plan_id = str(uuid.uuid4())
        actions: list[ReorganizationAction] = []

        # 1) 중복 파일 제거 제안
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
        organize_desc = {
            "content": "파일 내용(내부 텍스트)이 비슷한 것끼리 묶어 정리",
            "name": "파일/폴더 이름이나 확장자가 비슷한 것끼리 묶어 정리",
            "time": "수정 시각 기준으로 그룹핑",
        }.get(self.options.organize_by, "content")
        focus_desc = {
            "names": "파일·폴더 이름만 개선 (위치는 그대로)",
            "locations": "위치(폴더 구조)만 개선 (이름은 그대로)",
            "both": "이름과 위치 모두 개선",
        }.get(self.options.focus, "both")

        prompt = f"""당신은 폴더/파일 정리 전문가입니다. 아래 스캔 결과를 분석하고 **실제로 변경이 있는** 정리 계획만 JSON으로 제안하세요.

## 필수 규칙 (위반 시 해당 작업은 출력하지 마세요)
1. rename A→A, move X→X 처럼 source와 target이 같거나 효과가 없으면 출력 금지
2. 파일 내용을 보고 비슷한 것끼리 묶고, 내용에 맞는 적절한 이름을 제안
3. 정리 기준: {organize_desc}
4. 초점: {focus_desc}

## 작업 유형
- rename: 같은 폴더 내 이름만 변경. target=전체 경로(이름 포함)
- move: 다른 폴더로 이동. target=목적지 폴더 경로(디렉터리)
- create_folder: 새 폴더 생성 후 관련 파일 move

## 스캔 결과 (경로는 그대로 사용)
{context}

## 출력 형식 (JSON 배열만, 다른 텍스트 없이)
[
  {{"action": "rename"|"move"|"create_folder", "source": "원본경로", "target": "대상경로", "reason": "이유"}},
  ...
]

delete_duplicate는 이미 처리됨. move 시 target은 폴더 경로. create_folder 시 source 없이 target만.
유의미한 정리만 제안하고, 변경 없는 작업은 절대 포함하지 마세요.
"""

        llm_out = self._call_llm(prompt)
        if llm_out:
            try:
                text = llm_out.strip()
                if "```" in text:
                    start = text.find("[")
                    end = text.rfind("]") + 1
                    if start >= 0 and end > start:
                        text = text[start:end]
                arr = json.loads(text)
                root = Path(self.scan.root_path).resolve()
                for item in arr:
                    action = item.get("action", "").lower()
                    source = (item.get("source") or "").strip()
                    target = (item.get("target") or "").strip()
                    reason = item.get("reason", "")

                    if action == "rename" and source and target:
                        if self._is_noop_rename(root, source, target):
                            continue
                        actions.append(
                            ReorganizationAction(
                                action_type=ProposedAction.RENAME,
                                source_path=source,
                                target_path=target,
                                reason=reason,
                            )
                        )
                    elif action == "move" and source and target:
                        if self._is_noop_move(root, source, target):
                            continue
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
        provider = get_llm_provider()
        summary = (
            f"총 {len(actions)}개 작업 제안 (중복 {len(self.scan.duplicates)}그룹 포함)"
            + (f" — AI: {provider.provider_name}/{provider.default_model}" if llm_used else ". (LLM 미실행)")
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
