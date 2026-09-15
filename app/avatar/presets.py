from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from app.avatar.profile import AvatarAttachment, AvatarProfile


SCHEMA_VERSION = 1


class AvatarPresetStore:
    """Persist appearance-only presets outside the live acting state."""

    def __init__(self, directory: str | Path) -> None:
        self.directory = Path(directory)

    def save(self, profile: AvatarProfile) -> Path:
        self.directory.mkdir(parents=True, exist_ok=True)
        target = self.directory / f"{_safe_name(profile.name)}.json"
        target.write_text(json.dumps(_to_mapping(profile), ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
        return target

    def load(self, name: str) -> AvatarProfile:
        target = self.directory / f"{_safe_name(name)}.json"
        with target.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        return _from_mapping(data)

    def exists(self, name: str) -> bool:
        return (self.directory / f"{_safe_name(name)}.json").is_file()

    def list_names(self) -> tuple[str, ...]:
        if not self.directory.is_dir():
            return ()
        return tuple(sorted(path.stem for path in self.directory.glob("*.json")))


def _safe_name(value: str) -> str:
    name = value.strip()
    if not name or name in {".", ".."} or any(char in name for char in '/\\'):
        raise ValueError("invalid avatar preset name")
    return name


def _to_mapping(profile: AvatarProfile) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "name": profile.name,
        "base_model": profile.base_model,
        "hair_style": profile.hair_style,
        "hair_color": profile.hair_color,
        "outfit": profile.outfit,
        "accessories": [asdict(item) for item in profile.accessories],
    }


def _from_mapping(data: Any) -> AvatarProfile:
    if not isinstance(data, dict):
        raise ValueError("avatar preset must be a JSON object")
    if int(data.get("schema_version", -1)) != SCHEMA_VERSION:
        raise ValueError("unsupported avatar preset schema version")

    raw_accessories = data.get("accessories", [])
    if not isinstance(raw_accessories, list):
        raise ValueError("accessories must be a JSON array")
    accessories: list[AvatarAttachment] = []
    for raw in raw_accessories:
        if not isinstance(raw, dict):
            raise ValueError("each accessory must be a JSON object")
        accessories.append(AvatarAttachment(**raw))

    return AvatarProfile(
        name=str(data.get("name", "default")),
        base_model=str(data.get("base_model", "cari-base")),
        hair_style=data.get("hair_style"),
        hair_color=data.get("hair_color"),
        outfit=data.get("outfit"),
        accessories=tuple(accessories),
    )
