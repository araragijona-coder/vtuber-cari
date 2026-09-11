from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class BehaviorState(StrEnum):
    IDLE = "idle"
    MESSAGE_RECEIVED = "message_received"
    THINKING = "thinking"
    SPEAKING = "speaking"
    SPEECH_FINISHED = "speech_finished"
    ALERT = "alert"
    SUCCESS = "success"
    BLOCKED = "blocked"


@dataclass(frozen=True, slots=True)
class BehaviorCue:
    state: BehaviorState
    animation: str = "idle"
    emotion: str = "neutral"
    attention: str = "chat"
    movement: str = "none"
    priority: int = 0
    interruptible: bool = True
    reserve_stage: bool = False


class AvatarBehaviorDirector:
    """Maps semantic events to safe, renderer-independent behavior cues."""

    def cue(self, state: BehaviorState, *, emotion: str = "neutral", priority: int = 0) -> BehaviorCue:
        defaults = {
            BehaviorState.IDLE: ("idle", "none"),
            BehaviorState.MESSAGE_RECEIVED: ("notice", "attention"),
            BehaviorState.THINKING: ("think", "none"),
            BehaviorState.SPEAKING: ("talk", "none"),
            BehaviorState.SPEECH_FINISHED: ("idle", "none"),
            BehaviorState.ALERT: ("alert", "attention"),
            BehaviorState.SUCCESS: ("celebrate", "none"),
            BehaviorState.BLOCKED: ("blocked", "none"),
        }
        animation, movement = defaults[BehaviorState(state)]
        return BehaviorCue(BehaviorState(state), animation, emotion, priority=priority, movement=movement)
