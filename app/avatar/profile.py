from __future__ import annotations

from dataclasses import dataclass, field, replace
import random
import re
from typing import Iterable, Mapping


_HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


@dataclass(frozen=True, slots=True)
class AvatarAttachment:
    """A cosmetic item attached to a rig anchor; renderer decides how to draw it."""

    item_id: str
    category: str
    anchor: str
    x: float = 0.0
    y: float = 0.0
    scale: float = 1.0
    rotation: float = 0.0
    color: str | None = None
    enabled: bool = True

    def __post_init__(self) -> None:
        if not self.item_id.strip():
            raise ValueError("item_id must not be empty")
        if not self.category.strip():
            raise ValueError("category must not be empty")
        if not self.anchor.strip():
            raise ValueError("anchor must not be empty")
        if self.scale <= 0:
            raise ValueError("scale must be positive")
        if self.color is not None and not _HEX_COLOR.fullmatch(self.color):
            raise ValueError("color must be a #RRGGBB value")
        object.__setattr__(self, "item_id", self.item_id.strip())
        object.__setattr__(self, "category", self.category.strip().lower())
        object.__setattr__(self, "anchor", self.anchor.strip().lower())
        if self.color is not None:
            object.__setattr__(self, "color", self.color.upper())


@dataclass(frozen=True, slots=True)
class AvatarProfile:
    """Saved appearance only; it deliberately contains no live acting state."""

    name: str = "default"
    base_model: str = "cari-base"
    hair_style: str | None = None
    hair_color: str | None = None
    outfit: str | None = None
    accessories: tuple[AvatarAttachment, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("profile name must not be empty")
        if not self.base_model.strip():
            raise ValueError("base_model must not be empty")
        for value_name, value in (("hair_color", self.hair_color),):
            if value is not None and not _HEX_COLOR.fullmatch(value):
                raise ValueError(f"{value_name} must be a #RRGGBB value")

    def with_accessory(self, accessory: AvatarAttachment) -> "AvatarProfile":
        remaining = tuple(item for item in self.accessories if item.item_id != accessory.item_id)
        return replace(self, accessories=remaining + (accessory,))

    def without_accessory(self, item_id: str) -> "AvatarProfile":
        target = item_id.strip()
        return replace(self, accessories=tuple(item for item in self.accessories if item.item_id != target))

    def accessories_in(self, category: str) -> tuple[AvatarAttachment, ...]:
        normalized = category.strip().lower()
        return tuple(item for item in self.accessories if item.category == normalized and item.enabled)

    def randomized(self, catalog: Mapping[str, Iterable[AvatarAttachment]], *, seed: int | None = None) -> "AvatarProfile":
        """Choose at most one item per catalog category, deterministically when seeded."""
        rng = random.Random(seed)
        choices: list[AvatarAttachment] = []
        for category, items in catalog.items():
            pool = tuple(item for item in items if item.category == category and item.enabled)
            if pool:
                choices.append(rng.choice(pool))
        return replace(self, accessories=tuple(choices))
