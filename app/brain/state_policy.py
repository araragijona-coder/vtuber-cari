from __future__ import annotations

from .arbiter import Intent, IntentKind
from app.core.state.manager import RuntimeState


class IntentAdmissionPolicy:
    """Cheap lifecycle gate before intent arbitration."""

    def __init__(self, *, interrupt_priority: int = 8) -> None:
        if not 0 <= interrupt_priority <= 10:
            raise ValueError("interrupt_priority must be between 0 and 10")
        self.interrupt_priority = interrupt_priority

    def admit(self, intent: Intent, state: RuntimeState) -> bool:
        if state in {RuntimeState.OFFLINE, RuntimeState.STARTING, RuntimeState.STOPPING}:
            return False
        if state in {RuntimeState.IDLE, RuntimeState.LISTENING}:
            return True
        if state in {RuntimeState.THINKING, RuntimeState.SPEAKING, RuntimeState.SLEEP}:
            return intent.kind is IntentKind.ALERT and intent.priority >= self.interrupt_priority
        return False

    def filter(self, intents: list[Intent], state: RuntimeState) -> list[Intent]:
        return [item for item in intents if self.admit(item, state)]
