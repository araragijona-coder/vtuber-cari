from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path
import subprocess


@dataclass(frozen=True)
class FileObservation:
    path: str
    exists: bool
    type: str | None
    size: int | None
    hash: str | None


class RepositoryObserver:
    READ_ONLY_GIT = {"status", "branch", "rev-parse", "diff"}

    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        if not (self.root / ".git").exists():
            raise ValueError(f"not a git repository: {self.root}")

    def _git(self, *args: str) -> str:
        if args[0] not in self.READ_ONLY_GIT:
            raise ValueError("observer only permits read-only git commands")
        completed = subprocess.run(
            ["git", *args], cwd=self.root, text=True, capture_output=True, check=True
        )
        return completed.stdout.rstrip("\n")

    def root_path(self) -> Path:
        return Path(self._git("rev-parse", "--show-toplevel"))

    def branch(self) -> str:
        return self._git("branch", "--show-current")

    def head_sha(self) -> str:
        return self._git("rev-parse", "HEAD")

    def status(self) -> str:
        return self._git("status", "--short")

    def changed_files(self) -> list[dict[str, str]]:
        output = self._git("status", "--short")
        if not output:
            return []
        result = []
        for line in output.splitlines():
            result.append({"status": line[:2].strip(), "path": line[3:] if len(line) > 3 else ""})
        return result

    def diff_name_status(self, base_sha: str) -> list[dict[str, str]]:
        output = self._git("diff", "--name-status", f"{base_sha}..HEAD")
        result = []
        for line in output.splitlines():
            parts = line.split("\t")
            if len(parts) >= 2:
                item = {"status": parts[0], "path": parts[-1]}
                if len(parts) >= 3:
                    item["previous_path"] = parts[1]
                result.append(item)
        return result

    def diff_stat(self, base_sha: str) -> str:
        return self._git("diff", "--stat", f"{base_sha}..HEAD")

    def observe_file(self, relative_path: str) -> FileObservation:
        path = (self.root / relative_path).resolve()
        if self.root not in path.parents and path != self.root:
            raise ValueError("path escapes repository root")
        if not path.exists():
            return FileObservation(relative_path, False, None, None, None)
        if path.is_dir():
            return FileObservation(relative_path, True, "directory", None, None)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        return FileObservation(relative_path, True, "file", path.stat().st_size, digest)
