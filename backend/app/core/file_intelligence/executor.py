"""
재구성 계획 실행 모듈.
안전한 파일 작업 레이어를 통해 계획을 적용하고 로그를 기록합니다.
"""

import json
import uuid
from pathlib import Path
from typing import Optional

from app.core.logging_config import get_logger
from app.models.schemas import ProposedAction, ReorganizationAction, ReorganizationPlan
from app.utils.safe_file_ops import SafeFileOperations, create_safe_ops_for_root, PathSecurityError

logger = get_logger(__name__)


class ReorganizationExecutor:
    """
    재구성 계획 실행기.
    - dry_run 모드 지원
    - 작업 로그 기록 (Undo 지원용)
    - SafeFileOperations 사용
    """

    def __init__(self, plan: ReorganizationPlan, root_path: Path) -> None:
        self.plan = plan
        self.root = Path(root_path).resolve()
        self.safe_ops = create_safe_ops_for_root(self.root)
        self._executed: list[dict] = []

    def _log_operation(
        self,
        op_type: str,
        source: str,
        target: Optional[str],
        original_state: dict,
        dry_run: bool,
    ) -> None:
        """작업 로그 기록 (DB 연동은 API 레이어에서)."""
        self._executed.append(
            {
                "id": str(uuid.uuid4()),
                "plan_id": self.plan.plan_id,
                "operation_type": op_type,
                "source_path": source,
                "target_path": target,
                "original_state_json": json.dumps(original_state, ensure_ascii=False),
                "dry_run": dry_run,
            }
        )

    def execute(
        self,
        action_ids: Optional[list[str]] = None,
        dry_run: bool = True,
    ) -> list[dict]:
        """
        계획 실행.
        Args:
            action_ids: 실행할 액션 ID 목록 (None이면 전체). 현재는 인덱스로 매칭.
            dry_run: True면 실제 적용 없이 시뮬레이션만.
        Returns:
            실행된 작업 로그 목록
        """
        to_run = self.plan.actions
        if action_ids:
            id_set = set(action_ids)
            to_run = []
            for i, a in enumerate(self.plan.actions):
                if (a.id and a.id in id_set) or (not a.id and str(i) in id_set):
                    to_run.append(a)

        for action in to_run:
            try:
                self._execute_one(action, dry_run)
            except (PathSecurityError, FileNotFoundError, FileExistsError) as e:
                logger.error("실행 실패", action=action, error=str(e))
                raise

        return self._executed

    def _execute_one(self, action: ReorganizationAction, dry_run: bool) -> None:
        """단일 액션 실행."""
        src = Path(action.source_path) if action.source_path else None
        tgt = Path(action.target_path) if action.target_path else None

        if action.action_type == ProposedAction.RENAME and src and tgt:
            original = {"path": str(src), "exists": src.exists()}
            if not dry_run:
                self.safe_ops.safe_rename(src, tgt)
            self._log_operation("rename", str(src), str(tgt), original, dry_run)

        elif action.action_type == ProposedAction.MOVE and src and tgt:
            original = {"path": str(src), "exists": src.exists()}
            if not dry_run:
                self.safe_ops.safe_move(src, tgt)
            self._log_operation("move", str(src), str(tgt), original, dry_run)

        elif action.action_type == ProposedAction.CREATE_FOLDER and tgt:
            original = {}
            if not dry_run:
                self.safe_ops.safe_mkdir(tgt)
            self._log_operation("create_folder", "", str(tgt), original, dry_run)

        elif action.action_type == ProposedAction.DELETE_DUPLICATE and src:
            original = {"path": str(src), "exists": src.exists()}
            if not dry_run:
                self.safe_ops.validate_path(src)
                src.unlink()
            self._log_operation("delete_duplicate", str(src), None, original, dry_run)

        else:
            logger.warning("미지원 액션 타입", action_type=action.action_type)
