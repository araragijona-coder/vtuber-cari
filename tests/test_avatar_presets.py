import tempfile
import unittest
from pathlib import Path

from app.avatar.presets import AvatarPresetStore
from app.avatar.profile import AvatarAttachment, AvatarProfile


class AvatarPresetStoreTests(unittest.TestCase):
    def test_round_trip_preserves_appearance_only_state(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = AvatarPresetStore(Path(tmp))
            profile = AvatarProfile(
                name="Cari casual",
                base_model="cari-base",
                hair_style="short-02",
                hair_color="#6B4435",
                outfit="casual-01",
                accessories=(
                    AvatarAttachment(
                        item_id="star-pin",
                        category="pin",
                        anchor="hair-left",
                        x=0.1,
                        y=-0.2,
                        scale=0.8,
                        rotation=15,
                        color="#FFD166",
                    ),
                ),
            )

            target = store.save(profile)
            loaded = store.load(profile.name)

            self.assertEqual(target.name, "Cari casual.json")
            self.assertEqual(loaded, profile)
            self.assertTrue(store.exists(profile.name))
            self.assertEqual(store.list_names(), ("Cari casual",))

    def test_invalid_path_characters_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = AvatarPresetStore(tmp)
            with self.assertRaises(ValueError):
                store.save(AvatarProfile(name="../escape"))

    def test_unknown_schema_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "broken.json"
            path.write_text('{"schema_version": 99, "name": "broken"}', encoding="utf-8")
            with self.assertRaises(ValueError):
                AvatarPresetStore(tmp).load("broken")


if __name__ == "__main__":
    unittest.main()
