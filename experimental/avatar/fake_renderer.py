"""Deterministic renderer substitute used to validate the avatar contract.

This backend intentionally renders nothing. It provides lifecycle, camera,
acting-state, metrics, and error semantics that a real VRM backend must match.
Keeping it in experimental/ lets CI exercise the integration boundary without
pulling a model, browser runtime, or third-party renderer into the project.
"""

from __future__ import annotations

from time import perf_counter

from .acting_state import AvatarActingState


CAMERA_PRESETS = {"full_body", "three_quarter", "bust"}


class FakeRenderer:
    """Small renderer-independent backend for contract and CI testing."""

    def __init__(self) -> None:
        self._loaded = False
        self._model_path: str | None = None
        self._state = AvatarActingState()
        self._camera = "full_body"
        self._last_error: str | None = None
        self._frame_time_ms: float | None = None
        self._updates = 0

    def load(self, model_path: str) -> None:
        if not isinstance(model_path, str) or not model_path.strip():
            raise ValueError("model_path must be a non-empty string")
        self._model_path = model_path
        self._loaded = True
        self._last_error = None

    def unload(self) -> None:
        self._loaded = False
        self._model_path = None

    def is_loaded(self) -> bool:
        return self._loaded

    def update(self, delta_seconds: float) -> None:
        if delta_seconds < 0:
            self._last_error = "delta_seconds must not be negative"
            raise ValueError(self._last_error)
        started = perf_counter()
        self._updates += 1
        self._frame_time_ms = (perf_counter() - started) * 1000.0

    def set_acting_state(self, state: AvatarActingState) -> None:
        if not isinstance(state, AvatarActingState):
            raise TypeError("state must be AvatarActingState")
        self._state = state

    def set_camera_preset(self, name: str) -> None:
        if name not in CAMERA_PRESETS:
            raise ValueError(f"unsupported camera preset: {name}")
        self._camera = name

    def get_metrics(self) -> dict[str, float | int | bool | None]:
        fps = None
        if self._frame_time_ms and self._frame_time_ms > 0:
            fps = 1000.0 / self._frame_time_ms
        return {
            "loaded": self._loaded,
            "frame_time_ms": self._frame_time_ms,
            "fps_estimate": fps,
            "draw_calls": 0,
            "memory_hint_mb": None,
            "updates": self._updates,
            "last_error": self._last_error,
        }

    @property
    def acting_state(self) -> AvatarActingState:
        return self._state

    @property
    def camera_preset(self) -> str:
        return self._camera

    @property
    def model_path(self) -> str | None:
        return self._model_path
