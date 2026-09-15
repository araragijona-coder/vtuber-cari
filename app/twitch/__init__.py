from .models import ChatMessage

__all__ = [
    "ChatMessage",
    "CommandContext",
    "CommandDefinition",
    "CommandResult",
    "TwitchAdapter",
    "TwitchCommandEngine",
    "TwitchConfig",
    "TwitchLiveBot",
]


def __getattr__(name: str):
    """Lazy-load integration modules to keep core imports acyclic."""
    if name == "TwitchAdapter":
        from .adapter import TwitchAdapter

        return TwitchAdapter
    if name == "TwitchConfig":
        from .client import TwitchConfig

        return TwitchConfig
    if name == "TwitchLiveBot":
        from .live import TwitchLiveBot

        return TwitchLiveBot
    if name in {"CommandContext", "CommandDefinition", "CommandResult", "TwitchCommandEngine"}:
        from .commands import CommandContext, CommandDefinition, CommandResult, TwitchCommandEngine

        return {
            "CommandContext": CommandContext,
            "CommandDefinition": CommandDefinition,
            "CommandResult": CommandResult,
            "TwitchCommandEngine": TwitchCommandEngine,
        }[name]
    raise AttributeError(name)
