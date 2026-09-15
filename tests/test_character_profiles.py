import unittest

from app.characters.profile_catalog import CharacterRole, all_characters, get_character


class CharacterProfileTests(unittest.TestCase):
    def test_core_group_has_four_distinct_roles(self) -> None:
        profiles = all_characters()
        self.assertEqual(len(profiles), 4)
        self.assertEqual({profile.id for profile in profiles}, {"cari", "cami", "chie", "sunna"})
        self.assertEqual(
            {profile.role for profile in profiles},
            {
                CharacterRole.LEADER,
                CharacterRole.STRATEGIST,
                CharacterRole.CAREGIVER,
                CharacterRole.IDENTITY_ANCHOR,
            },
        )

    def test_cari_is_the_group_leader(self) -> None:
        cari = get_character("Cari")
        self.assertEqual(cari.role, CharacterRole.LEADER)
        self.assertIn("move the group", cari.primary_drive)

    def test_sister_cami_is_strategist_not_second_leader(self) -> None:
        cami = get_character("cami")
        self.assertEqual(cami.role, CharacterRole.STRATEGIST)
        self.assertIn("analysis", cami.protection_style)

    def test_chie_and_sunna_have_distinct_support_roles(self) -> None:
        chie = get_character("chie")
        sunna = get_character("sunna")
        self.assertEqual(chie.role, CharacterRole.CAREGIVER)
        self.assertEqual(sunna.role, CharacterRole.IDENTITY_ANCHOR)
        self.assertNotEqual(chie.protection_style, sunna.protection_style)

    def test_unknown_character_is_rejected(self) -> None:
        with self.assertRaises(KeyError):
            get_character("nobody")


if __name__ == "__main__":
    unittest.main()
