from .models import ChatMessage

__all__ = ["ChatMessage", "TwitchAdapter", "TwitchConfig", "TwitchLiveBot"]


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
    raise AttributeError(name)
