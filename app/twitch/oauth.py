from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlencode


DEFAULT_REDIRECT_URI = "http://localhost:4343/oauth/callback"
DEFAULT_SCOPES = (
    "user:read:chat",
    "user:write:chat",
    "user:bot",
    "channel:bot",
)


@dataclass(frozen=True, slots=True)
class TwitchOAuthConfig:
    client_id: str
    redirect_uri: str = DEFAULT_REDIRECT_URI
    scopes: tuple[str, ...] = DEFAULT_SCOPES

    def authorization_url(self, *, state: str, force_verify: bool = True) -> str:
        if not self.client_id.strip():
            raise ValueError("client_id is required")
        if not state.strip():
            raise ValueError("state is required")
        query = urlencode(
            {
                "client_id": self.client_id,
                "redirect_uri": self.redirect_uri,
                "response_type": "code",
                "scope": " ".join(self.scopes),
                "state": state,
                "force_verify": "true" if force_verify else "false",
            }
        )
        return f"https://id.twitch.tv/oauth2/authorize?{query}"

    def validate_redirect(self) -> None:
        if not self.redirect_uri.startswith("http://localhost:") and not self.redirect_uri.startswith("https://"):
            raise ValueError("redirect_uri must be a localhost HTTP callback or HTTPS URL")
