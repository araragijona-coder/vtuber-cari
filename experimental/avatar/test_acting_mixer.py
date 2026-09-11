import unittest

from experimental.avatar.acting_mixer import ActingTransition
from experimental.avatar.acting_state import AvatarActingState


class ActingTransitionTests(unittest.TestCase):
    def test_zero_duration_is_finished_and_uses_target(self):
        start = AvatarActingState(head_tilt=-1.0)
        target = AvatarActingState(emotion="happy", head_tilt=1.0)
        transition = ActingTransition(start, target, 0.0)

        self.assertTrue(transition.finished)
        self.assertEqual(transition.sample(), target)

    def test_head_tilt_interpolates_and_discrete_state_switches_at_midpoint(self):
        start = AvatarActingState(head_tilt=-1.0)
        target = AvatarActingState(emotion="happy", head_tilt=1.0)
        transition = ActingTransition(start, target, 2.0).advance(1.0)

        sample = transition.sample()
        self.assertEqual(sample.emotion, "happy")
        self.assertAlmostEqual(sample.head_tilt, 0.0)

    def test_advance_is_bounded_by_duration(self):
        transition = ActingTransition(AvatarActingState(), AvatarActingState(emotion="happy"), 1.0)
        finished = transition.advance(10.0)

        self.assertTrue(finished.finished)
        self.assertEqual(finished.elapsed_seconds, 1.0)

    def test_negative_values_are_rejected(self):
        with self.assertRaises(ValueError):
            ActingTransition(AvatarActingState(), AvatarActingState(), -1.0)
        with self.assertRaises(ValueError):
            ActingTransition(AvatarActingState(), AvatarActingState(), 1.0).advance(-0.1)


if __name__ == "__main__":
    unittest.main()
