import tempfile
import unittest
from pathlib import Path

from app.integrity.manager import IntegrityError
from app.memory.persistent import PersistentMemoryStore
from app.memory.session import MemoryItem


class PersistentMemoryTests(unittest.TestCase):
    def test_save_and_load_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = PersistentMemoryStore(Path(tmp) / "memory.json")
            source = (MemoryItem("name", "Cari", "conversation", 1),)
            store.save(source)
            self.assertEqual(store.load(), source)
            self.assertTrue((Path(tmp) / "memory.json").is_file())

    def test_corrupt_store_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "memory.json"
            path.write_text('{"version": 999, "items": []}', encoding="utf-8")
            with self.assertRaises(IntegrityError):
                PersistentMemoryStore(path).load()

    def test_save_keeps_latest_bounded_items(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = PersistentMemoryStore(Path(tmp) / "memory.json", max_items=2)
            store.save([
                MemoryItem("a", "1", timestamp=1),
                MemoryItem("b", "2", timestamp=2),
                MemoryItem("c", "3", timestamp=3),
            ])
            self.assertEqual([item.key for item in store.load()], ["b", "c"])


if __name__ == "__main__":
    unittest.main()
