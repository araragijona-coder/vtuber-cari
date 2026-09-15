import unittest

from app.avatar.profile import AvatarAttachment, AvatarProfile


class AvatarProfileTests(unittest.TestCase):
    def test_attachment_normalizes_cosmetic_metadata(self) -> None:
        item = AvatarAttachment(" Pin-Star ", " PIN ", " Left-Hair ", color="#aabbcc")
        self.assertEqual(item.item_id, "Pin-Star")
        self.assertEqual(item.category, "pin")
        self.assertEqual(item.anchor, "left-hair")
        self.assertEqual(item.color, "#AABBCC")

    def test_profile_can_replace_attachment_without_touching_acting_state(self) -> None:
        profile = AvatarProfile(name="stream", hair_style="hair-1")
        first = AvatarAttachment("pin", "pin", "left-hair")
        second = AvatarAttachment("pin", "pin", "right-hair")
        changed = profile.with_accessory(first).with_accessory(second)
        self.assertEqual(len(changed.accessories), 1)
        self.assertEqual(changed.accessories[0].anchor, "right-hair")
        self.assertEqual(changed.hair_style, "hair-1")

    def test_randomized_profile_is_reproducible_with_seed(self) -> None:
        profile = AvatarProfile()
        catalog = {
            "pin": (
                AvatarAttachment("pin-a", "pin", "hair"),
                AvatarAttachment("pin-b", "pin", "hair"),
            ),
            "hat": (
                AvatarAttachment("hat-a", "hat", "head"),
                AvatarAttachment("hat-b", "hat", "head"),
            ),
        }
        first = profile.randomized(catalog, seed=42)
        second = profile.randomized(catalog, seed=42)
        self.assertEqual(first.accessories, second.accessories)

    def test_invalid_color_and_scale_are_rejected(self) -> None:
        with self.assertRaises(ValueError):
            AvatarAttachment("pin", "pin", "hair", scale=0)
        with self.assertRaises(ValueError):
            AvatarAttachment("pin", "pin", "hair", color="red")


if __name__ == "__main__":
    unittest.main()
