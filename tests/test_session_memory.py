import unittest

from app.memory.session import SessionMemory


class SessionMemoryTests(unittest.TestCase):
    def test_turns_are_bounded(self) -> None:
        memory = SessionMemory(max_turns=2)
        memory.add_turn("a", "one", "r1", timestamp=1)
        memory.add_turn("b", "two", "r2", timestamp=2)
        memory.add_turn("c", "three", "r3", timestamp=3)
        self.assertEqual([turn.text for turn in memory.recent_turns(10)], ["two", "three"])

    def test_remembered_items_are_bounded_and_replace_by_key(self) -> None:
        memory = SessionMemory(max_items=2)
        memory.remember(" Name ", "Cari", timestamp=1)
        memory.remember("topic", "Uma Musume", timestamp=2)
        memory.remember("mood", "happy", timestamp=3)
        memory.remember("NAME", "Cari v2", timestamp=4)
        self.assertIsNone(memory.recall("topic"))
        self.assertEqual(memory.recall(" name ").value, "Cari v2")
        self.assertEqual(len(memory.remembered()), 2)

    def test_context_is_provider_neutral(self) -> None:
        memory = SessionMemory()
        memory.add_turn("viewer", "hola", "¡hola!", timestamp=1)
        memory.remember("favorite_game", "Uma Musume", timestamp=2)
        context = memory.context()
        self.assertEqual(context["recent_turns"][0].text, "hola")
        self.assertEqual(context["remembered"][0].value, "Uma Musume")


if __name__ == "__main__":
    unittest.main()
