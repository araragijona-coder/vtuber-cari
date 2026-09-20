from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


@dataclass(slots=True)
class TwitchContinuityState:
    generation: int = 0
    session_id: str | None = None
    keepalive_timeout_seconds: int | None = None
    reconnects: int = 0
    welcomes: int = 0
    verified_subscription_types: set[str] = field(default_factory=set)
    last_verification_ok: bool = False


class TwitchContinuityLedger:
    """Local observability state for TwitchIO-managed EventSub continuity.

    TwitchIO owns the socket reconnect and subscription recreation. This class
    records websocket generations and post-welcome subscription verification so
    Cari can expose continuity without implementing a second socket manager.
    """

    def __init__(self, expected_subscription_types: Iterable[str] = ()) -> None:
        self.expected_subscription_types = frozenset(expected_subscription_types)
        self.state = TwitchContinuityState()

    def on_welcome(
        self,
        session_id: str,
        keepalive_timeout_seconds: int | None,
    ) -> TwitchContinuityState:
        previous = self.state.session_id
        if previous is not None and previous != session_id:
            self.state.reconnects += 1
        self.state.generation += 1
        self.state.welcomes += 1
        self.state.session_id = session_id
        self.state.keepalive_timeout_seconds = keepalive_timeout_seconds
        self.state.last_verification_ok = False
        self.state.verified_subscription_types.clear()
        return self.state

    def verify_subscription_types(self, active_types: Iterable[str]) -> bool:
        active = frozenset(active_types)
        self.state.verified_subscription_types = set(active)
        self.state.last_verification_ok = self.expected_subscription_types.issubset(active)
        return self.state.last_verification_ok

    def snapshot(self) -> dict[str, object]:
        return {
            "generation": self.state.generation,
            "session_id": self.state.session_id,
            "keepalive_timeout_seconds": self.state.keepalive_timeout_seconds,
            "reconnects": self.state.reconnects,
            "welcomes": self.state.welcomes,
            "verified_subscription_types": sorted(self.state.verified_subscription_types),
            "last_verification_ok": self.state.last_verification_ok,
        }

