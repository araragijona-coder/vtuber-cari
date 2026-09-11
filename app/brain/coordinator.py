from __future__ import annotations

from .arbiter import Intent, IntentArbiter
from .state_policy import IntentAdmissionPolicy
from app.core.state.manager import RuntimeState


class IntentCoordinator:
    """Applies lifecycle admission before deterministic arbitration."""

    def __init__(
        self,
        *,
        arbiter: IntentArbiter | None = None,
        admission: IntentAdmissionPolicy | None = None,
    ) -> None:
        self.arbiter = arbiter or IntentArbiter()
        self.admission = admission or IntentAdmissionPolicy()

    def choose(self, intents: list[Intent], *, state: RuntimeState, now: float) -> Intent | None:
        admitted = self.admission.filter(intents, state)
        if not admitted:
            return None
        return self.arbiter.choose(admitted, now=now)
