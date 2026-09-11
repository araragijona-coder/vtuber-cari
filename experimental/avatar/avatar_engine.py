"""Renderer-independent orchestration for the experimental Cari avatar.

The engine owns lifecycle and acting state, while a concrete renderer owns
VRM/Three.js details. This keeps failures contained until the real renderer
is proven safe for the main application.
"""

from __future__ import annotations

from dataclasses import dataclass

from .acting_state import AvatarActingState
from .renderer_protocol import AvatarRenderer


@dataclass(frozen=True, slots=True)
class AvatarEngineStatus:
    loaded: bool
    degraded: bool
    last_error: str | None


class AvatarEngine:
    """Small lifecycle coordinator around an ``AvatarRenderer`` backend."""

    def __init__(self, renderer: AvatarRenderer) -> None:
        self._renderer = renderer
        self._last_error: str | None = None
        self._degraded = False
        self._state = AvatarActingState()

    @property
    def state(self) -> AvatarActingState:
        return self._state

    def load(self, model_path: str) -> bool:
        try:
            self._renderer.load(model_path)
            if not self._renderer.is_loaded():
                raise RuntimeError("renderer reported an unloaded avatar after load")
        except Exception as exc:  # renderer boundary must not crash Cari
            self._last_error = str(exc) or exc.__class__.__name__
            self._degraded = True
            return False
        self._last_error = None
        self._degraded = False
        self._renderer.set_acting_state(self._state)
        return True

    def unload(self) -> None:
        try:
            self._renderer.unload()
        finally:
            self._degraded = False

    def set_acting_state(self, state: AvatarActingState) -> bool:
        self._state = state
        try:
            self._renderer.set_acting_state(state)
        except Exception as exc:
            self._last_error = str(exc) or exc.__class__.__name__
            self._degraded = True
            return False
        self._last_error = None
        return True

    def set_camera_preset(self, name: str) -> bool:
        try:
            self._renderer.set_camera_preset(name)
        except Exception as exc:
            self._last_error = str(exc) or exc.__class__.__name__
            self._degraded = True
            return False
        self._last_error = None
        return True

    def update(self, delta_seconds: float) -> bool:
        if delta_seconds < 0:
            raise ValueError("delta_seconds must not be negative")
        try:
            self._renderer.update(delta_seconds)
        except Exception as exc:
            self._last_error = str(exc) or exc.__class__.__name__
            self._degraded = True
            return False
        return True

    def status(self) -> AvatarEngineStatus:
        try:
            loaded = bool(self._renderer.is_loaded())
        except Exception:
            loaded = False
        return AvatarEngineStatus(
            loaded=loaded,
            degraded=self._degraded,
            last_error=self._last_error,
        )

    def metrics(self) -> dict[str, float | int | bool | None]:
        try:
            return dict(self._renderer.get_metrics())
        except Exception as exc:
            self._last_error = str(exc) or exc.__class__.__name__
            self._degraded = True
            return {"loaded": False, "last_error": self._last_error}
