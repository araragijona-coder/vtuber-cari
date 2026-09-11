from __future__ import annotations

from enum import StrEnum


class Lifecycle(StrEnum):
    OFF = "off"
    STARTING = "starting"
    READY = "ready"
    BUSY = "busy"
    IDLE = "idle"
    SUSPENDING = "suspending"
    SUSPENDED = "suspended"
    FAILED = "failed"


_ALLOWED: dict[Lifecycle, set[Lifecycle]] = {
    Lifecycle.OFF: {Lifecycle.STARTING},
    Lifecycle.STARTING: {Lifecycle.READY, Lifecycle.FAILED, Lifecycle.OFF},
    Lifecycle.READY: {Lifecycle.BUSY, Lifecycle.IDLE, Lifecycle.SUSPENDING, Lifecycle.FAILED},
    Lifecycle.BUSY: {Lifecycle.READY, Lifecycle.IDLE, Lifecycle.FAILED},
    Lifecycle.IDLE: {Lifecycle.BUSY, Lifecycle.SUSPENDING, Lifecycle.FAILED},
    Lifecycle.SUSPENDING: {Lifecycle.SUSPENDED, Lifecycle.FAILED},
    Lifecycle.SUSPENDED: {Lifecycle.STARTING, Lifecycle.OFF},
    Lifecycle.FAILED: {Lifecycle.STARTING, Lifecycle.OFF},
}


class LifecycleManager:
    def __init__(self) -> None:
        self.state = Lifecycle.OFF

    def transition(self, target: Lifecycle) -> Lifecycle:
        target = Lifecycle(target)
        if target not in _ALLOWED[self.state]:
            raise ValueError(f"invalid lifecycle transition: {self.state} -> {target}")
        self.state = target
        return self.state
