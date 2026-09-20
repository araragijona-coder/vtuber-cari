import unittest

from experimental.studio.capture_contract import CaptureHealth, CaptureKind, CaptureSource


class CaptureContractTests(unittest.TestCase):
    def test_source_contract(self) -> None:
        source = CaptureSource("game-1", "Mi juego", CaptureKind.GAME)
        self.assertEqual(source.kind, CaptureKind.GAME)
        self.assertTrue(source.enabled)

    def test_health_contract(self) -> None:
        health = CaptureHealth(fps=60, dropped_frames=0, frame_time_ms=16.7)
        self.assertEqual(health.dropped_frames, 0)

    def test_invalid_source(self) -> None:
        with self.assertRaises(ValueError):
            CaptureSource("", "Pantalla", CaptureKind.DISPLAY)

    def test_invalid_health(self) -> None:
        with self.assertRaises(ValueError):
            CaptureHealth(fps=-1, dropped_frames=0, frame_time_ms=16.7)


if __name__ == "__main__":
    unittest.main()
