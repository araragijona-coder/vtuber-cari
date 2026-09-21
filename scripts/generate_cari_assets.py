#!/usr/bin/env python3
"""Generate Cari gallery images through the public Pollinations image endpoint.

No account, API key, token, model selection, provider selection, or repository secret
is required. Each image is downloaded with a plain HTTP GET and stored as a
validated PNG under assets/cari-gallery/ by default.

The GitHub Actions workflow owns git commit/push responsibilities so this
script stays usable locally without repository credentials.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit(
        "Pillow is required. Install with: "
        "python -m pip install -r scripts/requirements-assets.txt"
    ) from exc


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "assets" / "cari-gallery"
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1024
DEFAULT_TIMEOUT = 180
DEFAULT_RETRIES = 4
POLLINATIONS_BASE_URL = "https://image.pollinations.ai/prompt"

STYLE_PRESETS: dict[str, str] = {
    "anime-classic": (
        "classic Japanese anime illustration, clean line art, expressive eyes, "
        "balanced cel shading, polished character art"
    ),
    "cel-shading": (
        "strong cel shading, crisp anime line art, hard-edged shadow shapes, "
        "clean graphic rendering, saturated but controlled palette"
    ),
    "ecchi": (
        "tasteful ecchi-style anime illustration, adult character, fashionable "
        "pose, playful mood, non-explicit, fully clothed, no nudity"
    ),
    "soft-illustration": (
        "soft anime illustration, delicate line art, gentle gradients, subtle "
        "lighting, polished character design"
    ),
}

DEFAULT_PROMPTS: tuple[tuple[str, str], ...] = (
    (
        "cari-neutral",
        "Cari anime girl, adult character, neutral friendly expression, "
        "upper body character portrait, simple modern urban streetwear, "
        "light uncluttered background, character reference sheet feel",
    ),
    (
        "cari-happy",
        "Cari anime girl, adult character, bright happy expression, warm smile, "
        "sparkling eyes, upper body character portrait, simple modern urban "
        "streetwear, light uncluttered background",
    ),
    (
        "cari-fairy-cosplay",
        "Cari anime girl, adult character, playful fantasy mage cosplay, "
        "blue-and-gold outfit accents, confident smile, upper body portrait, "
        "clean background, polished character design",
    ),
)


@dataclass(frozen=True)
class AssetPrompt:
    name: str
    prompt: str


class GenerationError(RuntimeError):
    """Expected image download or validation failure."""


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "cari-asset"


def selected_prompts(prompt_file: Path | None) -> list[AssetPrompt]:
    if prompt_file is None:
        return [AssetPrompt(slugify(name), prompt) for name, prompt in DEFAULT_PROMPTS]

    try:
        data = json.loads(prompt_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON prompt file: {exc}") from exc

    if not isinstance(data, list):
        raise ValueError("Prompt file must contain a JSON list.")

    prompts: list[AssetPrompt] = []
    for index, item in enumerate(data, start=1):
        if isinstance(item, str):
            name = f"cari-{index:02d}"
            prompt = item
        elif isinstance(item, dict):
            name = str(item.get("name", f"cari-{index:02d}"))
            prompt = str(item.get("prompt", ""))
        else:
            raise ValueError(f"Invalid prompt entry at index {index}.")

        prompt = prompt.strip()
        if not prompt:
            raise ValueError(f"Empty prompt at index {index}.")
        prompts.append(AssetPrompt(slugify(name), prompt))

    return prompts


def style_suffix(style: str, custom_suffix: str) -> str:
    if custom_suffix.strip():
        return custom_suffix.strip()
    if style == "none":
        return ""
    if style not in STYLE_PRESETS:
        choices = ", ".join(sorted(STYLE_PRESETS))
        raise ValueError(f"Unknown style {style!r}. Choose one of: {choices}, none.")
    return STYLE_PRESETS[style]


def compose_prompt(prompt: str, style: str, custom_suffix: str) -> str:
    suffix = style_suffix(style, custom_suffix)
    return f"{prompt}, {suffix}" if suffix else prompt


def build_image_url(
    prompt: str,
    width: int = DEFAULT_WIDTH,
    height: int = DEFAULT_HEIGHT,
) -> str:
    if width <= 0 or height <= 0:
        raise ValueError("width and height must be positive.")

    encoded_prompt = quote(prompt.strip(), safe="")
    if not encoded_prompt:
        raise ValueError("Prompt must not be empty.")

    return (
        f"{POLLINATIONS_BASE_URL}/{encoded_prompt}"
        f"?width={width}&height={height}&nologo=true"
    )


def download_image(url: str, target: Path, timeout: int) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)

    request = Request(
        url,
        headers={
            "Accept": "image/*",
            "User-Agent": "Cari-Studio-Asset-Generator/1.0",
        },
        method="GET",
    )

    temp_path: Path | None = None
    png_temp = target.with_suffix(".tmp.png")
    try:
        with urlopen(request, timeout=timeout) as response:
            status = getattr(response, "status", response.getcode())
            if status != 200:
                raise GenerationError(f"Pollinations returned HTTP {status}.")

            content_type = response.headers.get_content_type()
            if not content_type.startswith("image/"):
                raise GenerationError(
                    f"Pollinations returned unexpected content type: {content_type}."
                )

            with tempfile.NamedTemporaryFile(
                dir=target.parent,
                prefix=f".{target.stem}.",
                suffix=".download",
                delete=False,
            ) as temp:
                temp_path = Path(temp.name)
                shutil.copyfileobj(response, temp)

        with Image.open(temp_path) as image:
            image.load()
            if image.width != DEFAULT_WIDTH or image.height != DEFAULT_HEIGHT:
                raise GenerationError(
                    f"Expected {DEFAULT_WIDTH}x{DEFAULT_HEIGHT}, "
                    f"received {image.width}x{image.height}."
                )

            image.convert("RGBA").save(png_temp, format="PNG", optimize=True)

        png_temp.replace(target)
    except HTTPError as exc:
        raise GenerationError(f"Pollinations HTTP {exc.code}: {exc.reason}") from exc
    except URLError as exc:
        raise GenerationError(f"Pollinations connection failed: {exc.reason}") from exc
    except TimeoutError as exc:
        raise GenerationError("Pollinations request timed out.") from exc
    except OSError as exc:
        raise GenerationError(f"Could not write generated image: {exc}") from exc
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()
        if png_temp.exists():
            png_temp.unlink()


def generate_asset(
    item: AssetPrompt,
    output_dir: Path,
    width: int,
    height: int,
    timeout: int,
    retries: int,
    overwrite: bool,
) -> bool:
    target = output_dir / f"{item.name}.png"
    if target.exists() and not overwrite:
        print(f"[skip] {target} already exists")
        return False

    url = build_image_url(item.prompt, width=width, height=height)
    print(f"[generate] {item.name}")
    print(f"[url] {url}")

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            download_image(url, target, timeout)
            print(f"[saved] {target}")
            return True
        except GenerationError as exc:
            last_error = exc
            if attempt < retries:
                delay = min(2**attempt, 60)
                print(
                    f"[retry] {item.name} attempt={attempt + 1}/{retries} "
                    f"after {delay}s: {exc}",
                    file=sys.stderr,
                )
                time.sleep(delay)

    raise GenerationError(f"{item.name}: {last_error}")


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt-file", type=Path)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--style",
        choices=[*STYLE_PRESETS, "none"],
        default="anime-classic",
    )
    parser.add_argument("--style-suffix", default="")
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)

    if args.width != DEFAULT_WIDTH or args.height != DEFAULT_HEIGHT:
        raise SystemExit(
            "Cari gallery generation is fixed to the requested 1024x1024 Pollinations endpoint."
        )
    if args.timeout <= 0 or args.retries <= 0:
        raise SystemExit("timeout and retries must be positive.")

    prompt_file = args.prompt_file.resolve() if args.prompt_file else None
    output_dir = args.output_dir.resolve()

    prompts = selected_prompts(prompt_file)
    composed = [
        AssetPrompt(item.name, compose_prompt(item.prompt, args.style, args.style_suffix))
        for item in prompts
    ]

    print(
        f"Generating {len(composed)} Cari assets through the public Pollinations "
        f"endpoint at {args.width}x{args.height}."
    )

    if args.dry_run:
        for item in composed:
            print(f"[dry-run] {item.name}")
            print(f"[dry-run] prompt={item.prompt}")
            print(
                f"[dry-run] url={build_image_url(item.prompt, args.width, args.height)}"
            )
        return 0

    failures = 0
    generated = 0
    for item in composed:
        try:
            if generate_asset(
                item=item,
                output_dir=output_dir,
                width=args.width,
                height=args.height,
                timeout=args.timeout,
                retries=args.retries,
                overwrite=args.overwrite,
            ):
                generated += 1
        except GenerationError as exc:
            failures += 1
            print(f"[error] {exc}", file=sys.stderr)

    if failures:
        print(
            f"Generation completed with {failures} failure(s); "
            f"{generated} asset(s) generated.",
            file=sys.stderr,
        )
        return 1

    print(f"Generation completed successfully: {generated} asset(s) generated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
