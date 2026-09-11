import unittest

from app.brain.router import RuleRouter


class RuleRouterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.router = RuleRouter()

    def test_common_chat_is_handled_locally(self) -> None:
        cases = {
            "hola": "¡Holaaa! ♡ ¿Cómo están?",
            "buenas noches": "¡Holaaa! ♡ ¿Cómo están?",
            "hola!!!": "¡Holaaa! ♡ ¿Cómo están?",
            "hola cari": "¡Holaaa! ♡ ¿Cómo están?",
            "cómo estás?": "¡Estoy muy bien! ♡ Lista para charlar y acompañarlos.",
            "qué tal!!!": "¡Estoy muy bien! ♡ Lista para charlar y acompañarlos.",
            "quién sos": "Soy Cari ♡ Tu compañera virtual.",
            "gracias cari": "¡De nada! ♡",
            "nos vemos": "¡Nos vemos! Gracias por pasar por el stream ♡",
            "alguien tiene un pedido": "¡A ver, a ver! ¿Qué hacemos ahora? Si tienen algún pedido, tírenlo al chat ♡",
            "qué hacemos ahora?": "¡A ver, a ver! ¿Qué hacemos ahora? Si tienen algún pedido, tírenlo al chat ♡",
            "estoy aburrido": "¡Eso se arregla! ♡ Inventemos algo para hacer en el stream.",
            "buen stream": "Aaaah, gracias ♡ Me voy a poner toda orgullosa ahora.",
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                response = self.router.route("viewer", text)
                self.assertIsNotNone(response)
                self.assertEqual(response.text, expected)

    def test_longer_message_containing_thanks_is_not_swallowed(self) -> None:
        response = self.router.route("viewer", "gracias por responder, ¿cómo funciona tu memoria?")
        self.assertIsNone(response)

    def test_whitespace_is_normalized_before_rules(self) -> None:
        response = self.router.route("viewer", "  hola   ")
        self.assertIsNotNone(response)
        self.assertEqual(response.text, "¡Holaaa! ♡ ¿Cómo están?")


if __name__ == "__main__":
    unittest.main()
