#!/usr/bin/env python3
"""
Generate Cari reference/gallery images through Pollinations.ai.

The generator intentionally uses a public, unauthenticated Pollinations image
endpoint:
- no OpenAI/DALL-E usage;
- no API key or secret is read;
- generated images are written as real PNG files;
- existing files are preserved unless --overwrite is passed.

The endpoint is the public image route:
https://image.pollinations.ai/prompt/{prompt}

The public endpoint can be rate-limited or changed by the provider; the script
therefore keeps retries/backoff and treats provider failure as a failed asset
generation rather than silently producing placeholder files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit(
        "Pillow is required to normalize Pollinations responses to PNG. "
        "Install with: python -m pip install -r scripts/requirements-assets.txt"
    ) from exc


API_BASE = "https://image.pollinations.ai/prompt"
DEFAULT_OUTPUT_DIR = Path("assets/cari-gallery")
DEFAULT_MODEL = "zimage"
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1536
DEFAULT_SAFE = "true"
DEFAULT_TIMEOUT = 180
DEFAULT_RETRIES = 4

DEFAULT_PROMPTS: tuple[tuple[str, str], ...] = (
    (
        "cari-neutral",
        "Cari anime girl, adult character, neutral friendly expression, "
        "full upper body, clean cel shading, polished fantasy shonen anime aesthetic, "
        "simple modern streetwear, light background, character reference sheet feel",
    ),
    (
        "cari-happy",
        "Cari anime girl, adult character, bright happy expression, warm smile, "
        "sparkling eyes, upper body portrait, polished fantasy shonen anime aesthetic, "
        "simple modern streetwear, clean cel shading, light background",
    ),
    (
        "cari-fairy-cosplay",
        "Cari anime girl, adult character, playful mage cosplay inspired by a classic "
        "fantasy guild adventure, blue-and-gold outfit accents, confident smile, "
        "upper body portrait, polished fantasy shonen anime aesthetic, clean cel shading",
    ),
)


@dataclass(frozen=True)
class AssetPrompt:
    name: str
    prompt: str


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "cari-asset"


def parse_prompts_file(path: Path) -> list[AssetPrompt]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Prompt file must contain a JSON list.")

    prompts: list[AssetPrompt] = []
    for index, item in enumerate(raw, start=1):
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


def selected_prompts(prompt_file: Path | None) -> list[AssetPrompt]:
    if prompt_file is not None:
        return parse_prompts_file(prompt_file)
    return [AssetPrompt(name, prompt) for name, prompt in DEFAULT_PROMPTS]


def stable_seed(name: str, prompt: str, base_seed: int) -> int:
    if base_seed < 0:
        return -1
    digest = hashlib.sha256(f"{name}\n{prompt}".encode("utf-8")).digest()
    offset = int.from_bytes(digest[:4], "big") & 0x7FFFFFFF
    return (base_seed + offset) & 0x7FFFFFFF


def build_url(prompt: str, model: str, width: int, height: int, seed: int, safe: str) -> str:
    encoded_prompt = urllib.parse.quote(prompt, safe="")
    query = urllib.parse.urlencode(
        {
            "model": model,
            "width": width,
            "height": height,
            "seed": seed,
            "safe": safe,
            "nologo": "true",
        }
    )
    return f"{API_BASE}/{encoded_prompt}?{query}"


def request_bytes(url: str, timeout: int, retries: int) -> tuple[bytes, str]:
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "image/png, image/jpeg, image/webp, image/*;q=0.8",
                "User-Agent": "vtuber-cari-asset-generator/1.1-public-endpoint",
            },
            method="GET",
        )

        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                content_type = response.headers.get("Content-Type", "")
                body = response.read()
                if not body:
                    raise RuntimeError("Pollinations returned an empty response.")
                return body, content_type
        except urllib.error.HTTPError as exc:
            retry_after = exc.headers.get("Retry-After")
            last_error = exc
            if exc.code in {429, 502, 503, 504} and attempt < retries:
                delay = float(retry_after) if retry_after and retry_after.isdigit() else 2**attempt
                time.sleep(min(delay, 60))
                continue
            details = exc.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError(
                f"Pollinations HTTP {exc.code}: {details or exc.reason}"
            ) from exc
        except (urllib.error.URLError, TimeoutError, OSError, RuntimeError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(min(2**attempt, 60))
                continue
            raise RuntimeError(
                f"Pollinations request failed after {retries} attempts: {exc}"
            ) from exc

    raise RuntimeError(f"Pollinations request failed: {last_error}")


def save_as_png(raw: bytes, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix(".tmp.png")
    try:
        from io import BytesIO

        with Image.open(BytesIO(raw)) as image:
            image.load()
            normalized = image.convert("RGBA") if "A" in image.getbands() else image.convert("RGB")
            normalized.save(temp, format="PNG", optimize=True)
        temp.replace(target)
    finally:
        if temp.exists():
            temp.unlink()


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt-file", type=Path, help="JSON file with prompts.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--safe", default=DEFAULT_SAFE)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Regenerate files that already exist.",
    )
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)

    if args.width <= 0 or args.height <= 0:
        raise SystemExit("width and height must be positive.")
    if args.retries <= 0:
        raise SystemExit("retries must be positive.")
    if args.timeout <= 0:
        raise SystemExit("timeout must be positive.")

    prompts = selected_prompts(args.prompt_file)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(
        f"Generating {len(prompts)} Cari assets with model={args.model}, "
        f"size={args.width}x{args.height}, output={args.output_dir}"
    )

    failures = 0
    for asset in prompts:
        target = args.output_dir / f"{asset.name}.png"

        if target.exists() and not args.overwrite:
            print(f"[skip] {target} already exists (use --overwrite to regenerate)")
            continue

        seed = stable_seed(asset.name, asset.prompt, args.seed)
        url = build_url(
            asset.prompt,
            model=args.model,
            width=args.width,
            height=args.height,
            seed=seed,
            safe=args.safe,
        )
        print(f"[generate] {asset.name} seed={seed}")

        try:
            raw, _ = request_bytes(
                url,
                timeout=args.timeout,
                retries=args.retries,
            )
            save_as_png(raw, target)
            print(f"[saved] {target}")
        except Exception as exc:
            failures += 1
            print(f"[error] {asset.name}: {exc}", file=sys.stderr)

    if failures:
        print(f"Generation completed with {failures} failure(s).", file=sys.stderr)
        return 1

    print("Generation completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
