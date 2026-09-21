#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "assets" / "cari" / "2d" / "layer-manifest.json"
PARAMETERS = ROOT / "assets" / "cari" / "2d" / "parameter-manifest.json"

FORBIDDEN_PARTS = {
    "headband",
    "hairpin",
    "hairpins",
    "jewelry",
    "bag",
    "weapon",
    "prop",
}

def fail(message: str) -> None:
    raise SystemExit(f"ASSET VALIDATION FAILED: {message}")

def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"missing manifest: {path}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")

def main() -> int:
    layer = load_json(MANIFEST)
    params = load_json(PARAMETERS)

    if layer.get("schema_version") != 1:
        fail("unsupported layer manifest schema")
    if layer.get("asset_id") != "cari-base-v1":
        fail("unexpected asset_id")
    if layer.get("backend_neutral") is not True:
        fail("layer manifest must remain backend-neutral")

    parts = layer.get("required_parts")
    if not isinstance(parts, list) or not parts:
        fail("required_parts must be a non-empty list")
    if len(parts) != len(set(parts)):
        fail("required_parts contains duplicate IDs")

    forbidden_found = {
        str(part).lower()
        for part in parts
        if str(part).lower() in FORBIDDEN_PARTS
    }
    if forbidden_found:
        fail(f"forbidden visual part(s): {sorted(forbidden_found)}")

    required_core = {
        "head", "hair_back", "hair_front", "hair_side_L", "hair_side_R",
        "ahoge", "eye_L", "eye_R", "iris_L", "iris_R", "pupil_L", "pupil_R",
        "brow_L", "brow_R", "mouth", "nose_bandage", "torso", "shirt",
        "arm_L", "arm_R", "hand_L", "hand_R", "leg_L", "leg_R", "shorts",
        "shoe_L", "shoe_R", "ponytail",
    }
    missing = required_core - set(parts)
    if missing:
        fail(f"missing canonical part(s): {sorted(missing)}")

    parameters = params.get("parameters")
    if not isinstance(parameters, list) or not parameters:
        fail("parameters must be a non-empty list")

    ids = [item.get("id") for item in parameters]
    if any(not isinstance(item_id, str) or not item_id for item_id in ids):
        fail("every parameter requires a non-empty string id")
    if len(ids) != len(set(ids)):
        fail("parameter IDs are duplicated")

    for item in parameters:
        value_range = item.get("range")
        if not isinstance(value_range, list) or len(value_range) != 2:
            fail(f"invalid parameter range: {item.get('id')}")
        if not value_range[0] < value_range[1]:
            fail(f"non-increasing parameter range: {item.get('id')}")

    print(
        f"PASS: Cari V1 asset manifests are valid "
        f"({len(parts)} layers, {len(parameters)} parameters)."
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
