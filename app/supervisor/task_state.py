from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import json
from typing import Any

PHASES = {
    "INIT", "REPO_SCAN", "UNDERSTANDING", "PLAN", "PRECHECK", "IMPLEMENT",
    "DIFF_REVIEW", "TEST", "POSTCHECK", "REPORT", "CONTINUE", "COMPLETE",
    "BLOCKED", "REPAIR",
}
STATUSES = {"RUNNING", "BLOCKED", "COMPLETED"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass
class TaskState:
    task_id: str
    task: str = ""
    repo: str = ""
    base_sha: str | None = None
    current_sha: str | None = None
    phase: str = "INIT"
    status: str = "RUNNING"
    scope: dict[str, Any] = field(default_factory=lambda: {
        "allowed_files": [], "allowed_directories": [], "allowed_operations": []
    })
    protected_paths: list[str] = field(default_factory=list)
    modified_files: list[str] = field(default_factory=list)
    created_files: list[str] = field(default_factory=list)
    deleted_files: list[str] = field(default_factory=list)
    renamed_files: list[str] = field(default_factory=list)
    tests_required: list[str] = field(default_factory=list)
    tests_executed: list[dict[str, Any]] = field(default_factory=list)
    claims: list[dict[str, Any]] = field(default_factory=list)
    evidence_ids: list[str] = field(default_factory=list)
    blockers: list[str] = field(default_factory=list)
    repair_attempts: list[dict[str, Any]] = field(default_factory=list)
    next_action: str = ""
    created_at: str = field(default_factory=utc_now)
    updated_at: str = field(default_factory=utc_now)

    def __post_init__(self) -> None:
        if self.phase not in PHASES:
            raise ValueError(f"invalid phase: {self.phase}")
        if self.status not in STATUSES:
            raise ValueError(f"invalid status: {self.status}")

    def set_phase(self, phase: str) -> None:
        if phase not in PHASES:
            raise ValueError(f"invalid phase: {phase}")
        self.phase = phase
        self.updated_at = utc_now()

    def touch(self) -> None:
        self.updated_at = utc_now()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def save(self, path: Path) -> None:
        self.touch()
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(self.to_dict(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        tmp.replace(path)

    @classmethod
    def load(cls, path: Path) -> "TaskState":
        return cls(**json.loads(path.read_text(encoding="utf-8")))
