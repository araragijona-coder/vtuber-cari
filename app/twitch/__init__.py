from .models import ChatMessage

__all__ = [
    "AutomationAction",
    "AutomationEngine",
    "AutomationEvent",
    "AutomationRule",
    "ChatMessage",
    "ChatVoiceRequest",
    "ChatVoiceRouter",
    "CommandContext",
    "CommandDefinition",
    "CommandResult",
    "TwitchAdapter",
    "TwitchChatRateLimiter",
    "TwitchCommandEngine",
    "TwitchConfig",
    "TwitchEvent",
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
    if name == "TwitchEvent":
        from .events import TwitchEvent

        return TwitchEvent
    if name in {"ChatVoiceRequest", "ChatVoiceRouter"}:
        from .chat_voice import ChatVoiceRequest, ChatVoiceRouter

        return {"ChatVoiceRequest": ChatVoiceRequest, "ChatVoiceRouter": ChatVoiceRouter}[name]
    if name == "TwitchChatRateLimiter":
        from .rate_limit import TwitchChatRateLimiter

        return TwitchChatRateLimiter
    if name in {"CommandContext", "CommandDefinition", "CommandResult", "TwitchCommandEngine"}:
        from .commands import CommandContext, CommandDefinition, CommandResult, TwitchCommandEngine

        return {
            "CommandContext": CommandContext,
            "CommandDefinition": CommandDefinition,
            "CommandResult": CommandResult,
            "TwitchCommandEngine": TwitchCommandEngine,
        }[name]
    if name in {"AutomationAction", "AutomationEngine", "AutomationEvent", "AutomationRule"}:
        from .automation import AutomationAction, AutomationEngine, AutomationEvent, AutomationRule

        return {
            "AutomationAction": AutomationAction,
            "AutomationEngine": AutomationEngine,
            "AutomationEvent": AutomationEvent,
            "AutomationRule": AutomationRule,
        }[name]
    raise AttributeError(name)
