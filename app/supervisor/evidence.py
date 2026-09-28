from __future__ import annotations

from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import secrets
from typing import Any

EVIDENCE_TYPES = {"GIT", "FILE", "COMMAND"}
_SECRET_PATTERNS = [
    re.compile(r"(?i)(authorization\s*:\s*bearer\s+)[^\s,;]+"),
    re.compile(r"(?i)((?:api[_ -]?key|token|password|passwd|secret|client[_ -]?secret)\s*[:=]\s*)[^\s,;]+"),
]


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(k): (
                "[REDACTED]"
                if re.search(r"(?i)(api[_ -]?key|token|password|secret|authorization)", str(k))
                else redact(v)
            )
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [redact(v) for v in value]
    if not isinstance(value, str):
        return value
    result = value
    for pattern in _SECRET_PATTERNS:
        result = pattern.sub(lambda m: m.group(1) + "[REDACTED]", result)
    return result


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass
class Evidence:
    evidence_id: str
    type: str
    source: str
    timestamp: str
    status: str
    command: str | None = None
    cwd: str | None = None
    exit_code: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    duration_ms: int | None = None
    base_sha: str | None = None
    head_sha: str | None = None
    git_status: str | None = None
    changed_files: list[dict[str, Any]] = field(default_factory=list)
    path: str | None = None
    exists: bool | None = None
    file_type: str | None = None
    size: int | None = None
    hash: str | None = None

    def __post_init__(self) -> None:
        if self.type not in EVIDENCE_TYPES:
            raise ValueError(f"unsupported evidence type: {self.type}")

    def to_dict(self) -> dict[str, Any]:
        return redact(asdict(self))


def new_id(prefix: str = "E") -> str:
    return f"{prefix}-{secrets.token_hex(8)}"


class EvidenceStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.records: list[dict[str, Any]] = []
        if path.exists():
            raw = json.loads(path.read_text(encoding="utf-8"))
            self.records = raw.get("evidence", []) if isinstance(raw, dict) else []

    def add(self, evidence: Evidence) -> str:
        record = evidence.to_dict()
        self.records.append(record)
        self.save()
        return evidence.evidence_id

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"version": 1, "evidence": self.records}
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        tmp.replace(self.path)

    def get(self, evidence_id: str) -> dict[str, Any] | None:
        return next((item for item in self.records if item.get("evidence_id") == evidence_id), None)

    def __len__(self) -> int:
        return len(self.records)
