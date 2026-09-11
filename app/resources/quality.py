from __future__ import annotations

from enum import StrEnum


class QualityLevel(StrEnum):
    FULL = "full"
    BALANCED = "balanced"
    ECO = "eco"


class QualityGovernor:
    """Central, dependency-free policy for reducing non-essential work."""

    def __init__(self, level: QualityLevel = QualityLevel.BALANCED) -> None:
        self.level = level

    @property
    def allow_idle_microbehaviors(self) -> bool:
        return self.level != QualityLevel.ECO

    @property
    def allow_proactive(self) -> bool:
        return self.level == QualityLevel.FULL

    @property
    def render_cache_enabled(self) -> bool:
        return self.level != QualityLevel.FULL or True

    def set_level(self, level: QualityLevel) -> None:
        self.level = QualityLevel(level)
