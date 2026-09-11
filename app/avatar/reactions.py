from __future__ import annotations

from dataclasses import dataclass, field
from time import monotonic


@dataclass(frozen=True, slots=True)
class Reaction:
    reaction_id: str
    kind: str
    priority: int = 0
    duration: float = 1.0
    cooldown: float = 0.0
    group: str = "default"
    payload: dict[str, object] = field(default_factory=dict)


class ReactionScheduler:
    """Deterministic reaction arbitration with cooldowns and coalescing."""

    def __init__(self) -> None:
        self._last: dict[str, float] = {}
        self._active: Reaction | None = None
        self._active_until = 0.0

    @property
    def active(self) -> Reaction | None:
        if self._active is not None and monotonic() >= self._active_until:
            self._active = None
        return self._active

    def submit(self, reaction: Reaction) -> bool:
        now = monotonic()
        last = self._last.get(reaction.reaction_id, float("-inf"))
        if now - last < max(0.0, reaction.cooldown):
            return False
        current = self.active
        if current is not None and current.priority > reaction.priority:
            return False
        self._last[reaction.reaction_id] = now
        self._active = reaction
        self._active_until = now + max(0.0, reaction.duration)
        return True
