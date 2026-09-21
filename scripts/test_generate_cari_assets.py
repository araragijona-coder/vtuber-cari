import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import generate_cari_assets as generator


class CariAssetGeneratorTests(unittest.TestCase):
    def test_slugify(self):
        self.assertEqual(generator.slugify(" Cari Happy!! "), "cari-happy")

    def test_stable_seed_is_repeatable(self):
        one = generator.stable_seed("cari-happy", "smile", 42)
        two = generator.stable_seed("cari-happy", "smile", 42)
        self.assertEqual(one, two)

    def test_style_suffix(self):
        self.assertIn("cel shading", generator.style_suffix("cel-shading", ""))

    def test_custom_style_suffix_wins(self):
        self.assertEqual(
            generator.style_suffix("anime-classic", "custom finish"),
            "custom finish",
        )

    def test_builds_prompt_without_duplicate_comma(self):
        result = generator.compose_prompt("Cari, happy", "none", "")
        self.assertEqual(result, "Cari, happy")

    def test_client_forwards_model_and_provider(self):
        fake = Mock()
        fake.text_to_image.return_value = Mock()
        generator.generate_image(
            fake,
            "Cari anime character",
            model="custom/model",
            width=512,
            height=768,
            guidance_scale=6.5,
            steps=12,
            seed=123,
            negative_prompt="bad anatomy",
        )
        fake.text_to_image.assert_called_once_with(
            prompt="Cari anime character",
            model="custom/model",
            width=512,
            height=768,
            guidance_scale=6.5,
            negative_prompt="bad anatomy",
            num_inference_steps=12,
            seed=123,
        )

    def test_dry_run_needs_no_hf_token(self):
        with patch.dict(os.environ, {}, clear=True):
            exit_code = generator.main(
                [
                    "--dry-run",
                    "--style",
                    "cel-shading",
                    "--output-dir",
                    tempfile.mkdtemp(),
                ]
            )
        self.assertEqual(exit_code, 0)


if __name__ == "__main__":
    unittest.main()
