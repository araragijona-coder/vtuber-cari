from __future__ import annotations

import json
from pathlib import Path

from app.integrity.manager import IntegrityError, IntegrityManager
from .session import MemoryItem


class PersistentMemoryStore:
    """Small fail-closed JSON store for explicitly promoted memory items."""

    VERSION = 1

    def __init__(self, path: Path, *, max_items: int = 128, integrity: IntegrityManager | None = None) -> None:
        if max_items < 1:
            raise ValueError("max_items must be positive")
        self.path = Path(path)
        self.max_items = max_items
        self.integrity = integrity or IntegrityManager()

    def load(self) -> tuple[MemoryItem, ...]:
        if not self.path.exists():
            return ()
        try:
            with self.path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            if payload.get("version") != self.VERSION or not isinstance(payload.get("items"), list):
                raise IntegrityError("unsupported memory store format")
            items = []
            for raw in payload["items"]:
                if not all(key in raw for key in ("key", "value", "source", "timestamp")):
                    raise IntegrityError("invalid memory item")
                items.append(MemoryItem(str(raw["key"]), str(raw["value"]), str(raw["source"]), float(raw["timestamp"])))
            return tuple(items)
        except (OSError, json.JSONDecodeError, TypeError, ValueError, AttributeError) as exc:
            raise IntegrityError("memory store could not be read") from exc

    def save(self, items: tuple[MemoryItem, ...] | list[MemoryItem]) -> None:
        ordered = sorted(items, key=lambda item: item.timestamp)[-self.max_items :]
        payload = {
            "version": self.VERSION,
            "items": [
                {
                    "key": item.key,
                    "value": item.value,
                    "source": item.source,
                    "timestamp": item.timestamp,
                }
                for item in ordered
            ],
        }
        self.integrity.atomic_json_update(self.path, payload)
