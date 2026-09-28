from __future__ import annotations

from pathlib import Path
import json
import subprocess
import time
from typing import Any

from .evidence import Evidence, EvidenceStore, new_id, redact, utc_now
from .repository import RepositoryObserver
from .task_state import TaskState


class Supervisor:
    """Passive engineering observer: record, compare, persist, report."""

    def __init__(
        self,
        root: Path,
        state_path: Path | None = None,
        evidence_path: Path | None = None,
    ) -> None:
        self.root = root.resolve()
        self.agent_dir = self.root / ".agent"
        self.state_path = state_path or self.agent_dir / "state.json"
        self.evidence = EvidenceStore(evidence_path or self.agent_dir / "evidence.json")
        self.repository = RepositoryObserver(self.root)

    def create_task(self, task_id: str, task: str = "", repo: str = "") -> TaskState:
        state = TaskState(task_id=task_id, task=task, repo=repo)
        state.save(self.state_path)
        return state

    def load_task(self) -> TaskState:
        return TaskState.load(self.state_path)

    def save_task(self, state: TaskState) -> None:
        state.save(self.state_path)

    def record_evidence(self, evidence: Evidence) -> str:
        evidence_id = self.evidence.add(evidence)
        state = self.load_task()
        if evidence_id not in state.evidence_ids:
            state.evidence_ids.append(evidence_id)
        self.save_task(state)
        return evidence_id

    def observe_repository(self, base_sha: str | None = None) -> dict[str, Any]:
        head = self.repository.head_sha()
        status = self.repository.status()
        changed_files = self.repository.changed_files()
        state = self.load_task()
        state.current_sha = head
        if base_sha is not None:
            state.base_sha = base_sha
        state.modified_files = [
            item["path"] for item in changed_files if item["status"] in {"M", "MM", "AM"}
        ]
        state.created_files = [item["path"] for item in changed_files if item["status"] == "??"]
        self.save_task(state)
        evidence = Evidence(
            evidence_id=new_id("GIT"),
            type="GIT",
            source="RepositoryObserver",
            timestamp=utc_now(),
            status="INSPECTED",
            base_sha=base_sha,
            head_sha=head,
            git_status=status,
            changed_files=changed_files,
        )
        self.record_evidence(evidence)
        return {
            "root": str(self.repository.root_path()),
            "branch": self.repository.branch(),
            "head_sha": head,
            "status": status,
            "changed_files": changed_files,
        }

    def observe_file(self, relative_path: str) -> Any:
        observation = self.repository.observe_file(relative_path)
        evidence = Evidence(
            evidence_id=new_id("FILE"),
            type="FILE",
            source="RepositoryObserver",
            timestamp=utc_now(),
            status="INSPECTED",
            path=observation.path,
            exists=observation.exists,
            file_type=observation.type,
            size=observation.size,
            hash=observation.hash,
        )
        self.record_evidence(evidence)
        return observation

    def record_command(
        self,
        command: list[str],
        cwd: Path | None = None,
        timeout: float | None = None,
    ) -> str:
        start = time.perf_counter()
        try:
            completed = subprocess.run(
                command,
                cwd=cwd or self.root,
                text=True,
                capture_output=True,
                timeout=timeout,
                check=False,
            )
            status = "EXECUTED"
            exit_code = completed.returncode
            stdout, stderr = redact(completed.stdout), redact(completed.stderr)
        except subprocess.TimeoutExpired as exc:
            status = "BLOCKED"
            exit_code = None
            stdout, stderr = redact(exc.stdout or ""), redact(exc.stderr or "")
        duration_ms = int((time.perf_counter() - start) * 1000)
        return self.record_evidence(
            Evidence(
                evidence_id=new_id("CMD"),
                type="COMMAND",
                source="Supervisor.record_command",
                timestamp=utc_now(),
                status=status,
                command=" ".join(command),
                cwd=str(cwd or self.root),
                exit_code=exit_code,
                stdout=stdout,
                stderr=stderr,
                duration_ms=duration_ms,
            )
        )

    def create_checkpoint(self, checkpoint_id: str | None = None) -> Path:
        state = self.load_task()
        checkpoint_id = checkpoint_id or new_id("checkpoint")
        checkpoint_dir = self.agent_dir / "checkpoints"
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "task_id": state.task_id,
            "timestamp": utc_now(),
            "base_sha": state.base_sha,
            "current_sha": state.current_sha,
            "phase": state.phase,
            "status": state.status,
            "scope": state.scope,
            "protected_paths": state.protected_paths,
            "modified_files": state.modified_files,
            "evidence_ids": state.evidence_ids,
        }
        path = checkpoint_dir / f"{checkpoint_id}.json"
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return path

    def consistency(self) -> str:
        state = self.load_task()
        head = self.repository.head_sha()
        return "CONSISTENT" if state.current_sha == head else "INCONSISTENT"
