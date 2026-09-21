from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from app.twitch.automation import AutomationEvent


@dataclass(frozen=True, slots=True)
class TwitchEvent:
    """Provider-neutral envelope produced from TwitchIO EventSub payloads."""

    kind: str
    data: Mapping[str, str]

    def automation_event(self) -> AutomationEvent:
        return AutomationEvent(self.kind, self.data)


def _name(value: Any, default: str = "") -> str:
    return str(
        getattr(value, "name", None)
        or getattr(value, "display_name", None)
        or default
    )


def _text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value)


def _message_id(payload: Any) -> str:
    metadata = getattr(payload, "metadata", None)
    value = getattr(metadata, "message_id", None)
    if value is None:
        value = getattr(payload, "message_id", None)
    return _text(value)


def normalize_twitch_event(kind: str, payload: Any) -> TwitchEvent:
    """Normalize supported EventSub events into stable string data."""
    normalized_kind = kind.strip().lower()
    data: dict[str, str] = {}

    event_id = _message_id(payload)
    if event_id:
        data["event_id"] = event_id

    user = getattr(payload, "user", None)
    if user is not None:
        data["user"] = _name(user)
        user_id = getattr(user, "id", None)
        if user_id is not None:
            data["user_id"] = _text(user_id)

    if normalized_kind == "follow":
        return TwitchEvent(normalized_kind, data)

    if normalized_kind in {"subscribe", "subscription_message"}:
        data["tier"] = _text(getattr(payload, "tier", None))
        message = getattr(payload, "message", None)
        if message is not None:
            data["message"] = _text(getattr(message, "text", message))
        return TwitchEvent(normalized_kind, data)

    if normalized_kind == "subscription_gift":
        data["total"] = _text(getattr(payload, "total", None), "0")
        data["cumulative_total"] = _text(
            getattr(payload, "cumulative_total", None),
            "0",
        )
        data["tier"] = _text(getattr(payload, "tier", None))
        return TwitchEvent(normalized_kind, data)

    if normalized_kind == "cheer":
        data["bits"] = _text(getattr(payload, "bits", None), "0")
        data["message"] = _text(getattr(payload, "message", None))
        return TwitchEvent(normalized_kind, data)

    if normalized_kind == "raid":
        raider = (
            getattr(payload, "from_broadcaster", None)
            or getattr(payload, "from_broadcaster_user", None)
        )
        data["raider"] = _name(raider)
        data["viewers"] = _text(getattr(payload, "viewers", None), "0")
        return TwitchEvent(normalized_kind, data)

    if normalized_kind == "channel_points":
        reward = getattr(payload, "reward", None)
        data["reward_id"] = _text(getattr(reward, "id", None))
        data["reward"] = _text(getattr(reward, "title", None))
        data["input"] = _text(getattr(payload, "user_input", None))
        return TwitchEvent(normalized_kind, data)

    if normalized_kind in {
        "poll_begin",
        "poll_end",
        "prediction_begin",
        "prediction_end",
    }:
        entity_id = getattr(payload, "id", None)
        if entity_id is not None:
            data["entity_id"] = _text(entity_id)
        title = getattr(payload, "title", None)
        if title is not None:
            data["title"] = _text(title)
        return TwitchEvent(normalized_kind, data)

    return TwitchEvent(normalized_kind, data)
