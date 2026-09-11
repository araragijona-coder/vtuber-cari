import unittest

from .acting_state import AvatarActingState
from .avatar_engine import AvatarEngine
from .fake_renderer import FakeRenderer


class FailingRenderer(FakeRenderer):
    def update(self, delta_seconds: float) -> None:
        raise RuntimeError("renderer exploded")


class AvatarEngineTests(unittest.TestCase):
    def test_load_applies_initial_state(self) -> None:
        renderer = FakeRenderer()
        engine = AvatarEngine(renderer)

        self.assertTrue(engine.load("cari-test.vrm"))
        self.assertTrue(engine.status().loaded)
        self.assertEqual(renderer.acting_state, AvatarActingState())

    def test_acting_state_is_forwarded(self) -> None:
        renderer = FakeRenderer()
        engine = AvatarEngine(renderer)
        engine.load("cari-test.vrm")
        state = AvatarActingState(emotion="happy", gaze="left", head_tilt=0.4)

        self.assertTrue(engine.set_acting_state(state))
        self.assertEqual(renderer.acting_state, state)

    def test_renderer_failure_enters_degraded_mode_without_crashing(self) -> None:
        engine = AvatarEngine(FailingRenderer())
        self.assertTrue(engine.load("cari-test.vrm"))

        self.assertFalse(engine.update(0.016))
        status = engine.status()
        self.assertTrue(status.degraded)
        self.assertEqual(status.last_error, "renderer exploded")

    def test_negative_delta_is_programmer_error(self) -> None:
        engine = AvatarEngine(FakeRenderer())
        with self.assertRaises(ValueError):
            engine.update(-0.1)


if __name__ == "__main__":
    unittest.main()
