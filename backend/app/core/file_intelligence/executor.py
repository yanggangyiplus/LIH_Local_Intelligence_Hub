"""
Apply Engine - 재구성 계획 실행 모듈.

승인된 작업만 SafeFileOperations를 통해 실제 파일 시스템에 반영.
모든 작업을 로그로 기록하여 Undo(되돌리기) 지원. dry_run으로 미리보기 지원.
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
    Apply Engine: 재구성 계획 실행기.

    - 승인된 작업만 실제 반영 (SafeFileOperations)
    - dry_run: 미리보기용 시뮬레이션
    - 작업 로그 기록 → DB 저장으로 Undo(되돌리기) 지원
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

    @staticmethod
    def undo_operations(logs: list[dict], root_path: Path) -> list[dict]:
        """
        실행된 작업 로그를 역순으로 되돌리기(Undo).
        rename/move는 역방향 실행, create_folder는 빈 폴더면 삭제.
        delete_duplicate는 복원 불가(파일 이미 삭제됨).
        Returns:
            되돌린 작업 로그 목록
        """
        safe_ops = create_safe_ops_for_root(root_path)
        undone: list[dict] = []
        # 역순으로 처리해야 의존성 문제 없음
        for log in reversed(logs):
            op = log.get("operation_type", "")
            src = log.get("source_path", "")
            tgt = log.get("target_path", "")
            try:
                if op == "rename" and src and tgt:
                    tgt_path = Path(tgt)
                    src_path = Path(src)
                    if tgt_path.exists():
                        src_path.parent.mkdir(parents=True, exist_ok=True)
                        safe_ops.safe_rename(tgt_path, src_path)
                        undone.append({"operation": "undo_rename", "from": tgt, "to": src, "status": "ok"})
                    else:
                        undone.append({"operation": "undo_rename", "from": tgt, "to": src, "status": "skip", "reason": "target not found"})

                elif op == "move" and src and tgt:
                    # move: source → target_dir. 실제 파일은 target_dir/source.name에 있음
                    src_name = Path(src).name
                    moved_path = Path(tgt) / src_name
                    original_path = Path(src)
                    if moved_path.exists():
                        original_path.parent.mkdir(parents=True, exist_ok=True)
                        safe_ops.safe_rename(moved_path, original_path)
                        undone.append({"operation": "undo_move", "from": str(moved_path), "to": src, "status": "ok"})
                    else:
                        undone.append({"operation": "undo_move", "from": str(moved_path), "to": src, "status": "skip", "reason": "moved file not found"})

                elif op == "create_folder" and tgt:
                    tgt_path = Path(tgt)
                    if tgt_path.is_dir() and not any(tgt_path.iterdir()):
                        tgt_path.rmdir()
                        undone.append({"operation": "undo_create_folder", "path": tgt, "status": "ok"})
                    else:
                        undone.append({"operation": "undo_create_folder", "path": tgt, "status": "skip", "reason": "not empty or not found"})

                elif op == "delete_duplicate":
                    undone.append({"operation": "undo_delete_duplicate", "path": src, "status": "skip", "reason": "삭제된 파일은 복원 불가"})

                else:
                    undone.append({"operation": f"undo_{op}", "status": "skip", "reason": "미지원 작업 유형"})

            except Exception as e:
                logger.error("Undo 실패", op=op, error=str(e))
                undone.append({"operation": f"undo_{op}", "status": "error", "error": str(e)})

        return undone
