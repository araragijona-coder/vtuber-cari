from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True, slots=True)
class AutomationEvent:
    kind: str
    data: Mapping[str, str]


@dataclass(frozen=True, slots=True)
class AutomationAction:
    kind: str
    value: str
    delay_seconds: float = 0.0


@dataclass(frozen=True, slots=True)
class AutomationRule:
    event_kind: str
    actions: tuple[AutomationAction, ...]
    enabled: bool = True


class AutomationEngine:
    """Deterministic event -> actions layer, independent from Twitch/YouTube/etc."""

    def __init__(self) -> None:
        self._rules: list[AutomationRule] = []

    def add_rule(self, rule: AutomationRule) -> None:
        if not rule.event_kind.strip():
            raise ValueError("automation event kind is required")
        for action in rule.actions:
            if not action.kind.strip():
                raise ValueError("automation action kind is required")
            if action.delay_seconds < 0:
                raise ValueError("automation action delay cannot be negative")
        self._rules.append(rule)

    def clear(self) -> None:
        self._rules.clear()

    def dispatch(self, event: AutomationEvent) -> tuple[AutomationAction, ...]:
        actions: list[AutomationAction] = []
        for rule in self._rules:
            if not rule.enabled or rule.event_kind != event.kind:
                continue
            for action in rule.actions:
                actions.append(
                    AutomationAction(
                        kind=action.kind,
                        value=self._render(action.value, event.data),
                        delay_seconds=action.delay_seconds,
                    )
                )
        return tuple(actions)

    @staticmethod
    def _render(template: str, data: Mapping[str, str]) -> str:
        rendered = template
        for key, value in data.items():
            rendered = rendered.replace("{" + key + "}", value)
        return rendered
