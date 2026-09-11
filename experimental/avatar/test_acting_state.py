from __future__ import annotations

import pytest

from experimental.avatar.acting_state import AvatarActingState


def test_default_state_is_safe_and_renderer_independent() -> None:
    state = AvatarActingState()

    assert state.emotion == "neutral"
    assert state.gaze == "camera"
    assert state.head_tilt == 0.0
    assert state.body_animation == "idle"
    assert state.lip_sync is None


def test_state_updates_are_immutable() -> None:
    original = AvatarActingState()
    updated = original.with_updates(
        emotion="thinking",
        pose="thinking",
        body_animation="think",
        gaze="up",
    )

    assert original.emotion == "neutral"
    assert updated.emotion == "thinking"
    assert updated.pose == "thinking"
    assert updated.body_animation == "think"
    assert updated.gaze == "up"


def test_head_tilt_is_bounded() -> None:
    AvatarActingState(head_tilt=-1.0)
    AvatarActingState(head_tilt=1.0)

    with pytest.raises(ValueError, match="head_tilt"):
        AvatarActingState(head_tilt=1.01)


def test_unknown_update_is_rejected() -> None:
    with pytest.raises(ValueError, match="unknown acting fields"):
        AvatarActingState().with_updates(magic_animation="wave")


def test_serialization_is_stable() -> None:
    state = AvatarActingState(
        emotion="happy",
        gaze="camera",
        head_tilt=0.25,
        pose="greeting",
        body_animation="wave",
        facial_expression="smile",
        lip_sync="AA",
    )

    assert state.to_dict() == {
        "emotion": "happy",
        "gaze": "camera",
        "head_tilt": 0.25,
        "pose": "greeting",
        "body_animation": "wave",
        "facial_expression": "smile",
        "lip_sync": "AA",
    }
