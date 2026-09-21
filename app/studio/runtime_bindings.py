from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Protocol

from app.brain.event_bus import EventBus, RuntimeEvent
from app.studio.actions import StudioAction


class BackendPreference(StrEnum):
    AUTO = "auto"
    NATIVE = "native"
    OBS = "obs"


Handler = Callable[[StudioAction], object]
AvailabilityCheck = Callable[[], bool]


class StudioBackend(Protocol):
    name: str
    priority: int
    optional: bool

    def register(self, kind: str, handler: Handler) -> None: ...
    def unregister(self, kind: str) -> None: ...
    def available(self) -> bool: ...
    def supports(self, kind: str) -> bool: ...
    def execute(self, action: StudioAction) -> object: ...
    def snapshot(self) -> dict[str, Any]: ...


@dataclass(frozen=True, slots=True)
class BackendExecution:
    ok: bool
    handled: bool
    backend: str | None
    message: str
    error: str | None = None
    fallback: bool = False


@dataclass(slots=True)
class StudioRuntimeMetrics:
    dispatched: int = 0
    handled: int = 0
    errors: int = 0
    invalid: int = 0
    unavailable: int = 0
    unsupported: int = 0
    fallback_count: int = 0
    native_handled: int = 0
    obs_handled: int = 0
    forwarded: int = 0
    last_action: str | None = None
    last_backend: str | None = None
    last_error: str | None = None


class _CallableBackend:
    def __init__(
        self,
        name: str,
        *,
        priority: int,
        optional: bool,
        handlers: Mapping[str, Handler] | None = None,
        availability: AvailabilityCheck | None = None,
    ) -> None:
        self.name = name
        self.priority = priority
        self.optional = optional
        self._handlers: dict[str, Handler] = dict(handlers or {})
        self._availability = availability or (lambda: True)

    def register(self, kind: str, handler: Handler) -> None:
        normalized = kind.strip().lower()
        if normalized not in StudioAction._EVENT_NAMES:
            raise ValueError(f"unsupported studio action: {kind!r}")
        self._handlers[normalized] = handler

    def unregister(self, kind: str) -> None:
        self._handlers.pop(kind.strip().lower(), None)

    def available(self) -> bool:
        try:
            return bool(self._availability())
        except Exception:
            return False

    def supports(self, kind: str) -> bool:
        return kind.strip().lower() in self._handlers

    def execute(self, action: StudioAction) -> object:
        handler = self._handlers.get(action.kind)
        if handler is None:
            raise LookupError(f"{self.name} backend does not support {action.kind!r}")
        return handler(action)

    def snapshot(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "priority": self.priority,
            "optional": self.optional,
            "available": self.available(),
            "capabilities": sorted(self._handlers),
        }


class NativeBackend(_CallableBackend):
    """Primary local-engine adapter; concrete IPC is injected."""

    def __init__(
        self,
        handlers: Mapping[str, Handler] | None = None,
        *,
        availability: AvailabilityCheck | None = None,
    ) -> None:
        super().__init__(
            "native",
            priority=100,
            optional=False,
            handlers=handlers,
            availability=availability,
        )


class OBSBackend(_CallableBackend):
    """Optional OBS adapter; never required by the native core."""

    def __init__(
        self,
        handlers: Mapping[str, Handler] | None = None,
        *,
        availability: AvailabilityCheck | None = None,
    ) -> None:
        super().__init__(
            "obs",
            priority=50,
            optional=True,
            handlers=handlers,
            availability=availability,
        )


class StudioRuntimeBindings:
    """Route studio actions through NativeBackend first, with optional OBS fallback.

    AUTO mode falls back only when the native backend is unavailable or lacks
    the capability. Execution errors do not fall back because the first
    backend may have already produced a partial side effect.
    """

    def __init__(
        self,
        event_bus: EventBus,
        *,
        native: NativeBackend | None = None,
        obs: OBSBackend | None = None,
        preference: BackendPreference = BackendPreference.AUTO,
        metrics: StudioRuntimeMetrics | None = None,
    ) -> None:
        self.event_bus = event_bus
        self.metrics = metrics or StudioRuntimeMetrics()
        self.native = native or NativeBackend()
        self.obs = obs
        self.preference = BackendPreference(preference)
        event_bus.subscribe("studio_action", self._on_event)

    @property
    def backends(self) -> tuple[StudioBackend, ...]:
        candidates: list[StudioBackend] = [self.native]
        if self.obs is not None:
            candidates.append(self.obs)
        return tuple(sorted(candidates, key=lambda item: item.priority, reverse=True))

    def register(
        self,
        kind: str,
        handler: Handler,
        *,
        backend: BackendPreference = BackendPreference.NATIVE,
    ) -> None:
        target = self._backend_for(backend)
        if target is None:
            raise ValueError(f"backend is not configured: {backend}")
        target.register(kind, handler)

    def unregister(
        self,
        kind: str,
        *,
        backend: BackendPreference = BackendPreference.NATIVE,
    ) -> None:
        target = self._backend_for(backend)
        if target is not None:
            target.unregister(kind)

    def set_preference(self, preference: BackendPreference) -> None:
        self.preference = BackendPreference(preference)
        self.event_bus.publish(
            RuntimeEvent(
                "studio_backend_preference_changed",
                {"preference": self.preference.value},
            )
        )

    def dispatch(self, action: StudioAction) -> BackendExecution:
        self.metrics.dispatched += 1
        self.metrics.last_action = action.kind

        for index, backend in enumerate(self._routing_order()):
            fallback = index > 0
            if fallback:
                self.metrics.fallback_count += 1

            if not backend.available():
                self.metrics.unavailable += 1
                self.event_bus.publish(
                    RuntimeEvent(
                        "studio_backend_unavailable",
                        {
                            "backend": backend.name,
                            "kind": action.kind,
                            "value": action.value,
                        },
                    )
                )
                continue

            if not backend.supports(action.kind):
                self.metrics.unsupported += 1
                self.event_bus.publish(
                    RuntimeEvent(
                        "studio_backend_unsupported",
                        {
                            "backend": backend.name,
                            "kind": action.kind,
                            "value": action.value,
                        },
                    )
                )
                continue

            self.event_bus.publish(
                RuntimeEvent(
                    "studio_backend_selected",
                    {
                        "backend": backend.name,
                        "kind": action.kind,
                        "value": action.value,
                        "fallback": fallback,
                    },
                )
            )

            try:
                backend.execute(action)
            except Exception as exc:  # noqa: BLE001 - isolate backend side effects
                error = str(exc) or exc.__class__.__name__
                self.metrics.errors += 1
                self.metrics.last_error = error
                self.event_bus.publish(
                    RuntimeEvent(
                        "studio_backend_error",
                        {
                            "backend": backend.name,
                            "kind": action.kind,
                            "value": action.value,
                            "error": error,
                        },
                    )
                )
                return BackendExecution(
                    False,
                    False,
                    backend.name,
                    "backend execution failed",
                    error,
                    fallback,
                )

            self.metrics.handled += 1
            self.metrics.last_backend = backend.name
            if backend.name == "native":
                self.metrics.native_handled += 1
            elif backend.name == "obs":
                self.metrics.obs_handled += 1

            if fallback:
                self.event_bus.publish(
                    RuntimeEvent(
                        "studio_backend_fallback",
                        {
                            "backend": backend.name,
                            "kind": action.kind,
                            "value": action.value,
                        },
                    )
                )

            self.event_bus.publish(
                RuntimeEvent(
                    "studio_action_handled",
                    {
                        "kind": action.kind,
                        "value": action.value,
                        "backend": backend.name,
                        "fallback": fallback,
                    },
                )
            )
            return BackendExecution(
                True,
                True,
                backend.name,
                "studio action handled",
                fallback=fallback,
            )

        self.metrics.forwarded += 1
        self.event_bus.publish(
            RuntimeEvent(
                StudioAction._EVENT_NAMES[action.kind],
                {"kind": action.kind, "value": action.value, "backend": None},
            )
        )
        self.event_bus.publish(
            RuntimeEvent(
                "studio_action_unhandled",
                {
                    "kind": action.kind,
                    "value": action.value,
                    "preference": self.preference.value,
                },
            )
        )
        return BackendExecution(
            False,
            False,
            None,
            "no configured backend supports this action",
        )

    def dispatch_payload(self, payload: dict[str, Any]) -> bool:
        if not isinstance(payload, dict):
            self.metrics.invalid += 1
            self.event_bus.publish(
                RuntimeEvent(
                    "studio_action_invalid",
                    {"error": "studio action payload must be an object"},
                )
            )
            return False
        try:
            action = StudioAction(
                str(payload.get("kind", "")),
                str(payload.get("value", "")),
            )
        except (TypeError, ValueError) as exc:
            self.metrics.invalid += 1
            self.event_bus.publish(
                RuntimeEvent(
                    "studio_action_invalid",
                    {"error": str(exc) or exc.__class__.__name__},
                )
            )
            return False
        return self.dispatch(action).ok

    def snapshot(self) -> dict[str, Any]:
        metrics = {
            "dispatched": self.metrics.dispatched,
            "handled": self.metrics.handled,
            "errors": self.metrics.errors,
            "invalid": self.metrics.invalid,
            "unavailable": self.metrics.unavailable,
            "unsupported": self.metrics.unsupported,
            "fallback_count": self.metrics.fallback_count,
            "native_handled": self.metrics.native_handled,
            "obs_handled": self.metrics.obs_handled,
            "forwarded": self.metrics.forwarded,
            "last_action": self.metrics.last_action,
            "last_backend": self.metrics.last_backend,
            "last_error": self.metrics.last_error,
        }
        # Keep the original flat keys for compatibility while exposing the
        # richer backend/runtime view for new callers.
        return {
            "preference": self.preference.value,
            "backends": [backend.snapshot() for backend in self.backends],
            **metrics,
            "metrics": metrics,
        }

    def _routing_order(self) -> tuple[StudioBackend, ...]:
        if self.preference == BackendPreference.NATIVE:
            return (self.native,)
        if self.preference == BackendPreference.OBS:
            return (self.obs,) if self.obs is not None else ()
        return self.backends

    def _backend_for(
        self, preference: BackendPreference
    ) -> StudioBackend | None:
        selected = BackendPreference(preference)
        if selected == BackendPreference.NATIVE:
            return self.native
        if selected == BackendPreference.OBS:
            return self.obs
        return None

    def _on_event(self, event: RuntimeEvent) -> None:
        self.dispatch_payload(event.payload)
