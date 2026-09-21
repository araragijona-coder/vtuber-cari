import unittest

from experimental.avatar.acting_state import AvatarActingState


class AvatarActingStateTests(unittest.TestCase):
    def test_default_state_is_safe_and_renderer_independent(self) -> None:
        state = AvatarActingState()

        self.assertEqual(state.emotion, "neutral")
        self.assertEqual(state.gaze, "camera")
        self.assertEqual(state.head_tilt, 0.0)
        self.assertEqual(state.body_animation, "idle")
        self.assertIsNone(state.lip_sync)

    def test_state_updates_are_immutable(self) -> None:
        original = AvatarActingState()
        updated = original.with_updates(
            emotion="thinking",
            pose="thinking",
            body_animation="think",
            gaze="up",
        )

        self.assertEqual(original.emotion, "neutral")
        self.assertEqual(updated.emotion, "thinking")
        self.assertEqual(updated.pose, "thinking")
        self.assertEqual(updated.body_animation, "think")
        self.assertEqual(updated.gaze, "up")

    def test_head_tilt_is_bounded(self) -> None:
        AvatarActingState(head_tilt=-1.0)
        AvatarActingState(head_tilt=1.0)

        with self.assertRaisesRegex(ValueError, "head_tilt"):
            AvatarActingState(head_tilt=1.01)

    def test_runtime_enums_are_rejected(self) -> None:
        for field in (
            "emotion", "gaze", "pose", "body_animation", "facial_expression"
        ):
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError, f"invalid {field}"):
                    AvatarActingState(**{field: "not-a-valid-value"})

    def test_numeric_and_lip_sync_types_are_checked(self) -> None:
        with self.assertRaisesRegex(TypeError, "head_tilt"):
            AvatarActingState(head_tilt="0.5")  # type: ignore[arg-type]

        with self.assertRaisesRegex(TypeError, "lip_sync"):
            AvatarActingState(lip_sync=123)  # type: ignore[arg-type]

        self.assertIsNone(AvatarActingState(lip_sync="   ").lip_sync)

    def test_unknown_update_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "unknown acting fields"):
            AvatarActingState().with_updates(magic_animation="wave")

    def test_serialization_is_stable(self) -> None:
        state = AvatarActingState(
            emotion="happy",
            gaze="camera",
            head_tilt=0.25,
            pose="greeting",
            body_animation="wave",
            facial_expression="smile",
            lip_sync="AA",
        )

        self.assertEqual(
            state.to_dict(),
            {
                "emotion": "happy",
                "gaze": "camera",
                "head_tilt": 0.25,
                "pose": "greeting",
                "body_animation": "wave",
                "facial_expression": "smile",
                "lip_sync": "AA",
            },
        )


if __name__ == "__main__":
    unittest.main()
