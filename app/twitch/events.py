from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from app.twitch.automation import AutomationEvent


@dataclass(frozen=True, slots=True)
class TwitchEvent:
    """Provider-neutral event envelope produced from TwitchIO EventSub payloads."""

    kind: str
    data: Mapping[str, str]

    def automation_event(self) -> AutomationEvent:
        return AutomationEvent(self.kind, self.data)


def _name(value: Any, default: str = "") -> str:
    return str(getattr(value, "name", None) or getattr(value, "display_name", None) or default)


def _text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value)


def normalize_twitch_event(kind: str, payload: Any) -> TwitchEvent:
    """Normalize the common EventSub events used by Cari into stable string data."""
    data: dict[str, str] = {}

    user = getattr(payload, "user", None)
    if user is not None:
        data["user"] = _name(user)
        user_id = getattr(user, "id", None)
        if user_id is not None:
            data["user_id"] = _text(user_id)

    if kind == "follow":
        return TwitchEvent(kind, data)

    if kind in {"subscribe", "subscription_message"}:
        data["tier"] = _text(getattr(payload, "tier", None))
        message = getattr(payload, "message", None)
        if message is not None:
            data["message"] = _text(getattr(message, "text", message))
        return TwitchEvent(kind, data)

    if kind == "cheer":
        data["bits"] = _text(getattr(payload, "bits", None), "0")
        data["message"] = _text(getattr(payload, "message", None))
        return TwitchEvent(kind, data)

    if kind == "raid":
        raider = getattr(payload, "from_broadcaster", None) or getattr(payload, "from_broadcaster_user", None)
        data["raider"] = _name(raider)
        data["viewers"] = _text(getattr(payload, "viewers", None), "0")
        return TwitchEvent(kind, data)

    if kind == "channel_points":
        reward = getattr(payload, "reward", None)
        data["reward_id"] = _text(getattr(reward, "id", None))
        data["reward"] = _text(getattr(reward, "title", None))
        data["input"] = _text(getattr(payload, "user_input", None))
        return TwitchEvent(kind, data)

    if kind in {"poll_begin", "poll_end", "prediction_begin", "prediction_end"}:
        event_id = getattr(payload, "id", None)
        if event_id is not None:
            data["event_id"] = _text(event_id)
        title = getattr(payload, "title", None)
        if title is not None:
            data["title"] = _text(title)
        return TwitchEvent(kind, data)

    return TwitchEvent(kind, data)
