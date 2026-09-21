import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import generate_cari_assets as generator


class FakeHeaders:
    def __init__(self, content_type: str):
        self._content_type = content_type

    def get_content_type(self):
        return self._content_type


class FakeResponse(io.BytesIO):
    def __init__(self, payload: bytes, content_type: str = "image/png"):
        super().__init__(payload)
        self.status = 200
        self.headers = FakeHeaders(content_type)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()

    def getcode(self):
        return self.status


class CariAssetGeneratorTests(unittest.TestCase):
    def test_slugify(self):
        self.assertEqual(generator.slugify(" Cari Happy!! "), "cari-happy")

    def test_builds_public_pollinations_url(self):
        url = generator.build_image_url("Cari, happy / anime girl")
        self.assertEqual(
            url,
            "https://image.pollinations.ai/prompt/Cari%2C%20happy%20%2F%20anime%20girl"
            "?width=1024&height=1024&nologo=true",
        )

    def test_url_contains_no_authentication_parameters(self):
        url = generator.build_image_url("Cari")
        self.assertNotIn("token=", url)
        self.assertNotIn("api_key=", url)
        self.assertNotIn("model=", url)
        self.assertNotIn("provider=", url)

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

    def test_default_prompts_are_available_without_auth(self):
        prompts = generator.selected_prompts(None)
        self.assertEqual(len(prompts), 3)
        self.assertEqual(prompts[0].name, "cari-neutral")

    def test_dry_run_uses_no_authentication(self):
        with tempfile.TemporaryDirectory() as directory:
            exit_code = generator.main(
                [
                    "--dry-run",
                    "--style",
                    "cel-shading",
                    "--output-dir",
                    directory,
                ]
            )
        self.assertEqual(exit_code, 0)

    def test_downloads_and_normalizes_png_with_get(self):
        from PIL import Image

        buffer = io.BytesIO()
        Image.new("RGB", (1024, 1024), (255, 0, 0)).save(
            buffer,
            format="PNG",
        )

        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "cari-test.png"

            def fake_urlopen(request, timeout):
                self.assertEqual(request.method, "GET")
                self.assertEqual(
                    request.full_url,
                    generator.build_image_url("Cari test"),
                )
                self.assertGreater(timeout, 0)
                return FakeResponse(buffer.getvalue())

            with patch.object(generator, "urlopen", fake_urlopen):
                generator.download_image(
                    generator.build_image_url("Cari test"),
                    target,
                    timeout=10,
                )

            with Image.open(target) as image:
                self.assertEqual(image.size, (1024, 1024))
                self.assertEqual(image.format, "PNG")

    def test_non_image_response_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "bad.png"
            response = FakeResponse(b"not-an-image", "text/plain")

            with patch.object(
                generator,
                "urlopen",
                lambda request, timeout: response,
            ):
                with self.assertRaises(generator.GenerationError):
                    generator.download_image(
                        generator.build_image_url("Cari test"),
                        target,
                        timeout=10,
                    )


if __name__ == "__main__":
    unittest.main()
