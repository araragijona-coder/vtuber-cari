import unittest

from app.avatar.controller import AvatarController
from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage


class RuntimeSmokeTests(unittest.TestCase):
    def test_local_greeting_reaches_voice_and_avatar_contracts(self) -> None:
        pipeline = LocalPipeline()
        result = pipeline.handle(ChatMessage.now("1", "viewer", "hola"))
        self.assertIsNotNone(result)
        assert result is not None
        self.assertIn("hola", result.response_text.casefold())
        self.assertEqual(result.voice_request.text, result.response_text)
        self.assertEqual(result.avatar_command.animation, "wave")

    def test_avatar_controller_clamps_intensity(self) -> None:
        controller = AvatarController()
        command = controller.current
        self.assertEqual(command.intensity, 0.5)
        updated = controller.apply(type(command)(command.emotion, 4.0, "talk", True))
        self.assertEqual(updated.intensity, 1.0)


if __name__ == "__main__":
    unittest.main()
