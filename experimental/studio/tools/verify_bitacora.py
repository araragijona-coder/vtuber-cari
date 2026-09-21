#!/usr/bin/env python3
"""Validate Cari Studio engineering continuity files without network access."""

from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BITACORA = ROOT / "BITACORA.md"
STATUS = ROOT / "PROJECT_STATUS.md"
ENGINEERING = ROOT / "ENGINEERING_LOG.md"
CHANGELOG = ROOT / "CHANGELOG_ENGINEERING.md"

REQUIRED_FILES = (BITACORA, STATUS, ENGINEERING, CHANGELOG)
REQUIRED_SECTIONS = (
    "## Estados de trabajo",
    "### NO REPETIR",
    "### Siguiente foco",
    "## LOG-",
)


def read(path: Path) -> str:
    if not path.is_file():
        raise SystemExit(f"MISSING: {path}")
    return path.read_text(encoding="utf-8")


def first_percentage(text: str, label: str) -> int | None:
    pattern = re.compile(rf"{re.escape(label)}[^\\n]*?~?(\\d+)%")
    match = pattern.search(text[:4000])
    return int(match.group(1)) if match else None


def log_ids(text: str) -> list[int]:
    return [int(value) for value in re.findall(r"^## LOG-(\\d+)\\b", text, re.MULTILINE)]


def main() -> int:
    contents = {path: read(path) for path in REQUIRED_FILES}
    bitacora = contents[BITACORA]
    status = contents[STATUS]
    engineering = contents[ENGINEERING]
    changelog = contents[CHANGELOG]

    for section in REQUIRED_SECTIONS:
        if section not in bitacora:
            print(f"FAIL: BITACORA missing {section}")
            return 1

    ids = log_ids(bitacora)
    if not ids:
        print("FAIL: BITACORA has no LOG entries")
        return 1
    if len(ids) != len(set(ids)):
        print("FAIL: duplicate LOG IDs in BITACORA")
        return 1
    if ids != sorted(ids):
        print("FAIL: LOG IDs are not monotonic")
        return 1

    labels = (
        ("Ingeniería", "Ingeniería"),
        ("Producto usable", "Producto usable"),
        ("Seguimiento global", "Seguimiento global"),
    )
    for status_label, bit_label in labels:
        left = first_percentage(bitacora, bit_label)
        right = first_percentage(status, status_label)
        if left is None or right is None:
            print(f"FAIL: missing canonical percentage for {status_label}")
            return 1
        if left != right:
            print(f"FAIL: {status_label} mismatch BITACORA={left}% STATUS={right}%")
            return 1

    if "Producción: **NO listo**" not in status and "Producción: **NO listo**" not in bitacora:
        print("FAIL: production readiness state is not explicit")
        return 1

    latest = ids[-1]
    if f"LOG-{latest}" not in engineering:
        print(f"FAIL: ENGINEERING_LOG missing LOG-{latest}")
        return 1

    if "NO REPETIR" not in engineering.upper():
        print("FAIL: ENGINEERING_LOG missing NO REPETIR guidance")
        return 1

    if "no usar cantidad de commits" not in changelog.lower() and "No usar cantidad de commits" not in changelog:
        print("WARN: changelog does not restate commit-count progress rule")

    print(f"Cari Studio continuity check: PASS (latest LOG-{latest})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
