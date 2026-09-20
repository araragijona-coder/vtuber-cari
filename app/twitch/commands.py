from __future__ import annotations

from dataclasses import dataclass
import re
import time
from typing import Literal

Permission = Literal["everyone", "subscriber", "vip", "moderator", "broadcaster"]


@dataclass(frozen=True, slots=True)
class CommandContext:
    viewer: str
    is_subscriber: bool = False
    is_vip: bool = False
    is_moderator: bool = False
    is_broadcaster: bool = False

    @property
    def rank(self) -> int:
        if self.is_broadcaster:
            return 4
        if self.is_moderator:
            return 3
        if self.is_vip:
            return 2
        if self.is_subscriber:
            return 1
        return 0


@dataclass(frozen=True, slots=True)
class CommandDefinition:
    name: str
    response: str
    permission: Permission = "everyone"
    cooldown_seconds: float = 0.0


@dataclass(frozen=True, slots=True)
class CommandResult:
    handled: bool
    response: str | None = None
    reason: str | None = None


class TwitchCommandEngine:
    """Small local command/permission/cooldown engine inspired by bot services."""

    _PERMISSION_RANK = {
        "everyone": 0,
        "subscriber": 1,
        "vip": 2,
        "moderator": 3,
        "broadcaster": 4,
    }

    def __init__(self, *, prefix: str = "!") -> None:
        if not prefix or any(character.isspace() for character in prefix):
            raise ValueError("command prefix must be non-empty and contain no whitespace")
        self.prefix = prefix
        self._commands: dict[str, CommandDefinition] = {}
        self._last_used: dict[tuple[str, str], float] = {}

    def register(self, command: CommandDefinition) -> None:
        name = self._normalize_name(command.name)
        if not name:
            raise ValueError("command name is required")
        if command.cooldown_seconds < 0:
            raise ValueError("cooldown cannot be negative")
        self._commands[name] = CommandDefinition(
            name=name,
            response=command.response.strip(),
            permission=command.permission,
            cooldown_seconds=float(command.cooldown_seconds),
        )

    def remove(self, name: str) -> bool:
        normalized = self._normalize_name(name)
        return self._commands.pop(normalized, None) is not None

    def names(self) -> tuple[str, ...]:
        return tuple(sorted(self._commands))

    def execute(self, text: str, context: CommandContext, *, now: float | None = None) -> CommandResult:
        if not text.startswith(self.prefix):
            return CommandResult(False)
        body = text[len(self.prefix):].strip()
        if not body:
            return CommandResult(False)
        parts = body.split(maxsplit=1)
        name = self._normalize_name(parts[0])
        command = self._commands.get(name)
        if command is None:
            return CommandResult(False)

        required = self._PERMISSION_RANK[command.permission]
        if context.rank < required:
            return CommandResult(True, reason="permission_denied")

        current = time.monotonic() if now is None else now
        key = (name, context.viewer.casefold())
        previous = self._last_used.get(key)
        if previous is not None and current - previous < command.cooldown_seconds:
            return CommandResult(True, reason="cooldown")
        self._last_used[key] = current

        response = command.response.replace("{user}", context.viewer)
        if parts[1:] and "{args}" in response:
            response = response.replace("{args}", parts[1])
        else:
            response = response.replace("{args}", "")
        response = re.sub(r"\s+", " ", response).strip()
        return CommandResult(True, response=response[:500] if response else None)

    @staticmethod
    def _normalize_name(name: str) -> str:
        return re.sub(r"[^a-z0-9_\-]", "", name.casefold().removeprefix("!"))


def default_commands() -> tuple[CommandDefinition, ...]:
    return (
        CommandDefinition("hola", "¡Hola {user}! ♡", cooldown_seconds=2),
        CommandDefinition("discord", "Discord: {args}", cooldown_seconds=5),
        CommandDefinition("comandos", "Comandos: !hola, !discord, !comandos", cooldown_seconds=5),
        CommandDefinition("so", "{user} recomienda: {args}", permission="moderator", cooldown_seconds=5),
    )
