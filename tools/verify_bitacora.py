#!/usr/bin/env python3
"""Validate Cari Studio engineering memory without external services."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PERCENT_PATTERNS = {
    "engineering": re.compile(r"ingeniería canónica actual:\s*\*\*(\d+)%\*\*", re.I),
    "product": re.compile(r"Producto usable/end-user:\s*\*\*(\d+)%\*\*", re.I),
    "tracking": re.compile(r"Seguimiento global:\s*\*\*(\d+)%\*\*", re.I),
}
LOG_HEADER = re.compile(r"^## LOG-(\d+)\s*(?:—|-)?", re.M)
HEAD_PATTERN = re.compile(r"(?:Último head auditado|HEAD auditado|HEAD de trabajo):\s*`?([0-9a-f]{7,64})`?", re.I)

class ValidationError(RuntimeError):
    """Engineering-memory validation error."""


def _read(root: Path, relative: str) -> str:
    path = root / relative
    if not path.exists():
        raise ValidationError(f"missing required file: {relative}")
    return path.read_text(encoding="utf-8")


def _percentages(text: str, label: str) -> dict[str, int]:
    values = {}
    for key, pattern in PERCENT_PATTERNS.items():
        match = pattern.search(text)
        if match is None:
            raise ValidationError(f"{label}: missing canonical percentage: {key}")
        values[key] = int(match.group(1))
    return values


def _log_ids(bitacora: str) -> list[int]:
    ids = [int(value) for value in LOG_HEADER.findall(bitacora)]
    if not ids:
        raise ValidationError("BITACORA.md: no LOG-* entries found")
    if len(ids) != len(set(ids)):
        raise ValidationError("BITACORA.md: duplicate LOG-* id detected")
    if ids != sorted(ids):
        raise ValidationError("BITACORA.md: LOG-* ids are not monotonic")
    return ids


def _validate_log_sections(bitacora: str) -> None:
    blocks = re.split(r"^## LOG-\d+.*$", bitacora, flags=re.M)[1:]
    for block_index, block in enumerate(blocks, start=1):
        normalized = block.lower()
        for required in ("estado:", "### no repetir", "### siguiente acción"):
            if required not in normalized:
                raise ValidationError(
                    f"BITACORA.md: LOG block {block_index} missing section: {required}"
                )


def _latest_head(bitacora: str) -> str | None:
    state_match = re.search(
        r"## Estado actual(?P<state>.*?)(?:^## |\\Z)",
        bitacora,
        flags=re.M | re.S,
    )
    state = state_match.group("state") if state_match else bitacora
    match = HEAD_PATTERN.search(state)
    return match.group(1) if match else None


def validate(root: Path = ROOT, expected_head: str | None = None) -> dict[str, object]:
    studio = root / "experimental" / "studio"
    bitacora = _read(root, "experimental/studio/BITACORA.md")
    project_status = _read(root, "experimental/studio/PROJECT_STATUS.md")
    engineering_log = _read(root, "experimental/studio/ENGINEERING_LOG.md")

    if "# NO REPETIR" not in bitacora:
        raise ValidationError("BITACORA.md: missing # NO REPETIR")
    if "Fuente canónica de continuidad" not in engineering_log:
        raise ValidationError("ENGINEERING_LOG.md: continuity declaration missing")

    bitacora_percentages = _percentages(bitacora, "BITACORA.md")
    status_percentages = _percentages(project_status, "PROJECT_STATUS.md")
    if bitacora_percentages != status_percentages:
        raise ValidationError(
            f"percentage drift: BITACORA={bitacora_percentages}, PROJECT_STATUS={status_percentages}"
        )

    ids = _log_ids(bitacora)
    _validate_log_sections(bitacora)
    documented_head = _latest_head(bitacora)
    if expected_head is not None:
        if documented_head is None:
            raise ValidationError("BITACORA.md: no documented HEAD")
        if documented_head.lower() != expected_head.lower():
            raise ValidationError(
                f"HEAD drift: documented={documented_head}, expected={expected_head}"
            )

    return {
        "percentages": bitacora_percentages,
        "last_log": ids[-1],
        "documented_head": documented_head,
        "studio_exists": studio.exists(),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--head", default=None)
    args = parser.parse_args()
    try:
        result = validate(expected_head=args.head)
    except (OSError, ValidationError) as exc:
        print(f"BITACORA VALIDATION: FAIL — {exc}")
        return 1

    percentages = result["percentages"]
    print(
        "BITACORA VALIDATION: PASS — "
        f"engineering={percentages['engineering']}%, "
        f"product={percentages['product']}%, "
        f"tracking={percentages['tracking']}%, "
        f"last_log={result['last_log']}, "
        f"head={result['documented_head']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
