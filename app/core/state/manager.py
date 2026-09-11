from __future__ import annotations

from enum import StrEnum
from typing import Awaitable, Callable


class RuntimeState(StrEnum):
    OFFLINE = "offline"
    STARTING = "starting"
    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"
    SLEEP = "sleep"
    STOPPING = "stopping"


Listener = Callable[[RuntimeState, RuntimeState], Awaitable[None] | None]


class StateManager:
    def __init__(self, initial: RuntimeState = RuntimeState.OFFLINE) -> None:
        self._state = initial
        self._listeners: list[Listener] = []

    @property
    def state(self) -> RuntimeState:
        return self._state

    def add_listener(self, listener: Listener) -> None:
        self._listeners.append(listener)

    async def transition(self, target: RuntimeState) -> None:
        previous = self._state
        if previous is target:
            return
        self._state = target
        for listener in tuple(self._listeners):
            try:
                result = listener(previous, target)
                if result is not None:
                    await result
            except Exception:
                # A listener must not corrupt the runtime state transition.
                continue
