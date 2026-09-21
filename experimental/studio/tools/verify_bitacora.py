#!/usr/bin/env python3
"""Validate Cari Studio engineering continuity files without network access."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BITACORA = ROOT / "experimental" / "studio" / "BITACORA.md"
STATUS = ROOT / "experimental" / "studio" / "PROJECT_STATUS.md"
ENGINEERING = ROOT / "experimental" / "studio" / "ENGINEERING_LOG.md"
CHANGELOG = ROOT / "experimental" / "studio" / "CHANGELOG_ENGINEERING.md"

PERCENT_PATTERNS = {
    "engineering": re.compile(r"ingeniería(?: canónica actual|):\s*\*?\*?~?(\d+)%", re.I),
    "product": re.compile(r"Producto usable(?:/end-user|):\s*\*?\*?~?(\d+)%", re.I),
    "tracking": re.compile(r"Seguimiento global:\s*\*?\*?~?(\d+)%", re.I),
}
LOG_HEADER = re.compile(r"^## LOG-(\d+)\b", re.M)
HEAD_PATTERN = re.compile(r"(?:Último head auditado|HEAD auditado|HEAD de trabajo):\s*`?([0-9a-f]{7,64})`?", re.I)

class ValidationError(RuntimeError):
    """Raised when engineering memory is inconsistent."""


def read(path: Path) -> str:
    if not path.is_file():
        raise ValidationError(f"MISSING: {path}")
    return path.read_text(encoding="utf-8")


def first_percentage(text: str, key: str) -> int | None:
    match = PERCENT_PATTERNS[key].search(text[:5000])
    return int(match.group(1)) if match else None


def log_ids(text: str) -> list[int]:
    return [int(value) for value in LOG_HEADER.findall(text)]


def latest_head(text: str) -> str | None:
    state_match = re.search(r"## Estado actual(?P<body>.*?)(?:^## |\Z)", text, re.M | re.S)
    body = state_match.group("body") if state_match else text
    match = HEAD_PATTERN.search(body)
    return match.group(1) if match else None


def validate(root: Path = ROOT, expected_head: str | None = None) -> dict[str, object]:
    studio = root / "experimental" / "studio"
    bitacora = read(studio / "BITACORA.md")
    status = read(studio / "PROJECT_STATUS.md")
    engineering = read(studio / "ENGINEERING_LOG.md")
    changelog = read(studio / "CHANGELOG_ENGINEERING.md")

    for required in ("## Estados de trabajo", "# NO REPETIR", "## LOG-"):
        if required not in bitacora:
            raise ValidationError(f"BITACORA missing required section: {required}")

    ids = log_ids(bitacora)
    if not ids:
        raise ValidationError("BITACORA has no LOG entries")
    if len(ids) != len(set(ids)):
        raise ValidationError("BITACORA contains duplicate LOG IDs")
    if ids != sorted(ids):
        raise ValidationError("BITACORA LOG IDs are not monotonic")

    values = {
        "engineering": first_percentage(bitacora, "engineering"),
        "product": first_percentage(bitacora, "product"),
        "tracking": first_percentage(bitacora, "tracking"),
    }
    status_values = {
        "engineering": first_percentage(status, "engineering"),
        "product": first_percentage(status, "product"),
        "tracking": first_percentage(status, "tracking"),
    }
    if None in values.values() or None in status_values.values():
        raise ValidationError("canonical percentage missing in BITACORA or PROJECT_STATUS")
    if values != status_values:
        raise ValidationError(f"percentage drift: BITACORA={values}, STATUS={status_values}")

    blocks = re.split(r"^## LOG-\d+\b.*$", bitacora, flags=re.M)[1:]
    for block_index, block in enumerate(blocks, start=1):
        normalized = block.lower()
        for required in ("estado:", "### no repetir", "### siguiente acción"):
            if required not in normalized:
                raise ValidationError(f"LOG block {block_index} missing: {required}")

    if "Fuente canónica de continuidad" not in engineering:
        raise ValidationError("ENGINEERING_LOG missing continuity declaration")
    if f"LOG-{ids[-1]:03d}" not in engineering and f"LOG-{ids[-1]}" not in engineering:
        raise ValidationError(f"ENGINEERING_LOG missing latest LOG-{ids[-1]}")
    if "NO REPETIR" not in engineering.upper():
        raise ValidationError("ENGINEERING_LOG missing NO REPETIR guidance")
    if "No usar cantidad de commits" not in changelog and "no usar cantidad de commits" not in changelog.lower():
        raise ValidationError("CHANGELOG missing commit-count progress rule")

    documented_head = latest_head(bitacora)
    if expected_head is not None:
        if documented_head is None:
            raise ValidationError("BITACORA missing documented HEAD")
        if documented_head.lower() != expected_head.lower():
            raise ValidationError(
                f"HEAD drift: documented={documented_head}, expected={expected_head}"
            )

    return {
        "percentages": values,
        "last_log": ids[-1],
        "documented_head": documented_head,
        "studio_exists": studio.is_dir(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Cari Studio engineering memory")
    parser.add_argument("--head", default=None, help="Expected HEAD when running an external audit")
    args = parser.parse_args()
    try:
        result = validate(expected_head=args.head)
    except (OSError, ValidationError) as exc:
        print(f" Cari Studio continuity check: FAIL — {exc}")
        return 1

    p = result["percentages"]
    print(
        "Cari Studio continuity check: PASS — "
        f"engineering={p['engineering']}%, "
        f"product={p['product']}%, "
        f"tracking={p['tracking']}%, "
        f"latest LOG-{result['last_log']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
