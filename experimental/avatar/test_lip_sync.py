import unittest

from experimental.avatar.lip_sync import LipSyncController, LipSyncFrame, VISEMS


class LipSyncFrameTests(unittest.TestCase):
    def test_frame_has_five_named_visemes(self):
        frame = LipSyncFrame((1.0, 0.5, 0.0, 0.25, 0.75))
        self.assertEqual(len(VISEMS), 5)
        self.assertEqual(frame.to_dict()["aa"], 1.0)
        self.assertTrue(frame.to_dict()["speaking"])

    def test_silence_is_not_speaking(self):
        self.assertFalse(LipSyncFrame.silence().speaking)

    def test_invalid_weights_are_rejected(self):
        with self.assertRaises(ValueError):
            LipSyncFrame((0.0, 0.0, 0.0, 0.0))
        with self.assertRaises(ValueError):
            LipSyncFrame((0.0, 0.0, 0.0, 0.0, 1.1))


class LipSyncControllerTests(unittest.TestCase):
    def test_external_frame_is_kept_until_replaced(self):
        controller = LipSyncController()
        frame = LipSyncFrame((1.0, 0.0, 0.0, 0.0, 0.0))
        controller.set_frame(frame)
        self.assertEqual(controller.advance(1.0), frame)

    def test_silence_is_released_after_configured_delay(self):
        controller = LipSyncController(release_seconds=0.1)
        controller.set_frame(LipSyncFrame((1.0, 0.0, 0.0, 0.0, 0.0), speaking=False))
        controller.advance(0.09)
        self.assertEqual(controller.frame.weights[0], 1.0)
        controller.advance(0.01)
        self.assertEqual(controller.frame, LipSyncFrame.silence())

    def test_negative_delta_is_rejected(self):
        with self.assertRaises(ValueError):
            LipSyncController().advance(-0.01)


if __name__ == "__main__":
    unittest.main()
