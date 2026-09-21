#!/usr/bin/env python3
"""Compatibility API for the canonical engineering-memory validator."""

from __future__ import annotations

import importlib.util
from pathlib import Path

CANONICAL = (
    Path(__file__).resolve().parents[1]
    / "experimental" / "studio" / "tools" / "verify_bitacora.py"
)
_spec = importlib.util.spec_from_file_location("cari_bitacora_validator", CANONICAL)
if _spec is None or _spec.loader is None:
    raise ImportError(f"cannot load canonical validator: {CANONICAL}")
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)

ValidationError = _module.ValidationError
validate = _module.validate
main = _module.main


if __name__ == "__main__":
    raise SystemExit(main())
