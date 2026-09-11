from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SceneZone:
    name: str
    x: float
    y: float
    width: float
    height: float
    priority: int = 0
    forbidden: bool = False

    def contains(self, x: float, y: float) -> bool:
        return self.x <= x <= self.x + self.width and self.y <= y <= self.y + self.height


@dataclass(frozen=True, slots=True)
class StageReservation:
    reservation_id: str
    zone: str
    priority: int = 0


class SceneDirector:
    """Chooses safe normalized placement without depending on a renderer."""

    def __init__(self, zones: list[SceneZone] | None = None) -> None:
        self.zones = zones or [
            SceneZone("left", 0.08, 0.20, 0.30, 0.70, 1),
            SceneZone("center", 0.35, 0.16, 0.30, 0.76, 2),
            SceneZone("right", 0.62, 0.20, 0.30, 0.70, 1),
        ]
        self._reservations: dict[str, StageReservation] = {}

    def reserve(self, reservation: StageReservation) -> None:
        self._reservations[reservation.reservation_id] = reservation

    def release(self, reservation_id: str) -> None:
        self._reservations.pop(reservation_id, None)

    def choose_zone(self, *, preferred: str | None = None) -> SceneZone:
        occupied = {r.zone for r in self._reservations.values()}
        candidates = [z for z in self.zones if not z.forbidden and z.name not in occupied]
        if preferred:
            for zone in candidates:
                if zone.name == preferred:
                    return zone
        if not candidates:
            candidates = [z for z in self.zones if not z.forbidden]
        if not candidates:
            raise RuntimeError("no usable scene zone")
        return max(candidates, key=lambda z: z.priority)
