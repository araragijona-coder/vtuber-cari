from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path


class IntegrityError(RuntimeError):
    pass


class IntegrityManager:
    """Fail-closed atomic persistence helper."""

    def atomic_json_update(self, path: Path, payload: object) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        try:
            fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as handle:
                    handle.write(data)
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(tmp_name, path)
            finally:
                if os.path.exists(tmp_name):
                    os.unlink(tmp_name)
        except OSError as exc:
            raise IntegrityError("atomic persistence failed") from exc

    @staticmethod
    def sha256(path: Path) -> str:
        try:
            digest = hashlib.sha256()
            with Path(path).open("rb") as handle:
                for chunk in iter(lambda: handle.read(65536), b""):
                    digest.update(chunk)
            return digest.hexdigest()
        except OSError as exc:
            raise IntegrityError("could not hash file") from exc
