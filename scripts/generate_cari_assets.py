#!/usr/bin/env python3
"""Generate Cari gallery assets through Hugging Face Inference Providers.

The generator is deliberately provider/model configurable:
- Hugging Face Inference Providers routes text-to-image requests to a supported
  provider selected by the user or automatically by Hugging Face.
- The script requires a Hugging Face User Access Token with Inference Providers
  permission; the token is read only from an environment variable.
- Generated files are normalized to PNG and written under assets/cari-gallery/.
- Git commit/push is opt-in so local use never changes repository history unless
  explicitly requested.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit(
        "Pillow is required. Install with: "
        "python -m pip install -r scripts/requirements-assets.txt"
    ) from exc

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "assets" / "cari-gallery"
DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
DEFAULT_PROVIDER = "auto"
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1536
DEFAULT_TIMEOUT = 180
DEFAULT_RETRIES = 4
DEFAULT_GUIDANCE = 7.0
DEFAULT_STEPS = 28
DEFAULT_TOKEN_ENV = "HF_TOKEN"

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

DEFAULT_NEGATIVE_PROMPT = (
    "low quality, lowest quality, blurry, jpeg artifacts, watermark, signature, "
    "text, logo, bad anatomy, bad proportions, extra fingers, missing fingers, "
    "duplicate, deformed hands, cropped head"
)

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
    """Expected provider/generation failure."""


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "cari-asset"


def selected_prompts(prompt_file: Path | None) -> list[AssetPrompt]:
    if prompt_file is None:
        raw = DEFAULT_PROMPTS
        return [AssetPrompt(slugify(name), prompt) for name, prompt in raw]

    data = json.loads(prompt_file.read_text(encoding="utf-8"))
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


def stable_seed(name: str, prompt: str, base_seed: int) -> int:
    if base_seed < 0:
        return -1
    digest = hashlib.sha256(f"{name}\n{prompt}".encode("utf-8")).digest()
    offset = int.from_bytes(digest[:4], "big") & 0x7FFFFFFF
    return (base_seed + offset) & 0x7FFFFFFF


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


def build_client(token: str, provider: str):
    try:
        from huggingface_hub import InferenceClient
    except ImportError as exc:
        raise GenerationError(
            "huggingface_hub is required. Install scripts/requirements-assets.txt."
        ) from exc

    if not token:
        raise GenerationError(
            "Missing Hugging Face token. Set HF_TOKEN (or --token-env) with a "
            "User Access Token that has Inference Providers permission."
        )

    try:
        return InferenceClient(api_key=token, provider=provider)
    except TypeError:
        # Compatibility with older huggingface_hub releases.
        return InferenceClient(token=token, provider=provider)


def generate_image(
    client,
    prompt: str,
    model: str,
    width: int,
    height: int,
    guidance_scale: float,
    steps: int,
    seed: int,
    negative_prompt: str,
):
    try:
        return client.text_to_image(
            prompt=prompt,
            model=model,
            width=width,
            height=height,
            guidance_scale=guidance_scale,
            negative_prompt=negative_prompt or None,
            num_inference_steps=steps,
            seed=None if seed < 0 else seed,
        )
    except Exception as exc:
        raise GenerationError(f"Hugging Face image generation failed: {exc}") from exc


def save_as_png(image, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix(".tmp.png")
    try:
        image.save(temp, format="PNG", optimize=True)
        with Image.open(temp) as verified:
            verified.load()
            if verified.width <= 0 or verified.height <= 0:
                raise GenerationError("Provider returned an invalid image size.")
        temp.replace(target)
    finally:
        if temp.exists():
            temp.unlink()


def run_git(args: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )


def current_branch() -> str:
    explicit = os.getenv("GITHUB_REF_NAME", "").strip()
    if explicit:
        return explicit
    result = run_git(["branch", "--show-current"], REPO_ROOT)
    branch = result.stdout.strip()
    if not branch:
        raise GenerationError(
            "Git is in detached HEAD state. Pass --git-branch explicitly."
        )
    return branch


def commit_generated_assets(output_dir: Path, message: str) -> bool:
    relative_output = str(output_dir.relative_to(REPO_ROOT))
    run_git(["add", "--", relative_output], REPO_ROOT)

    user_name = run_git(["config", "--get", "user.name"], REPO_ROOT).stdout.strip()
    user_email = run_git(["config", "--get", "user.email"], REPO_ROOT).stdout.strip()
    if not user_name:
        run_git(["config", "user.name", "Cari Studio Bot"], REPO_ROOT)
    if not user_email:
        run_git(
            ["config", "user.email", "cari-studio-bot@users.noreply.github.com"],
            REPO_ROOT,
        )

    staged = run_git(
        ["diff", "--cached", "--name-only", "--", relative_output],
        REPO_ROOT,
    ).stdout.strip()
    if not staged:
        print("[git] no asset changes to commit")
        return False

    # --only ensures unrelated files already staged by a user are not included.
    run_git(
        [
            "commit",
            "--only",
            "-m",
            message,
            "--",
            relative_output,
        ],
        REPO_ROOT,
    )
    print(f"[git] committed generated assets: {message}")
    return True


def push_branch(remote: str, branch: str) -> None:
    run_git(["push", remote, f"HEAD:refs/heads/{branch}"], REPO_ROOT)
    print(f"[git] pushed HEAD to {remote}/{branch}")


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt-file", type=Path)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--provider", default=DEFAULT_PROVIDER)
    parser.add_argument("--style", choices=[*STYLE_PRESETS, "none"], default="anime-classic")
    parser.add_argument("--style-suffix", default="")
    parser.add_argument("--negative-prompt", default=DEFAULT_NEGATIVE_PROMPT)
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--guidance-scale", type=float, default=DEFAULT_GUIDANCE)
    parser.add_argument("--steps", type=int, default=DEFAULT_STEPS)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    parser.add_argument("--token-env", default=DEFAULT_TOKEN_ENV)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--git-commit", action="store_true")
    parser.add_argument("--git-push", action="store_true")
    parser.add_argument("--git-remote", default="origin")
    parser.add_argument("--git-branch", default="")
    parser.add_argument(
        "--git-message",
        default="assets(cari): generate gallery with Hugging Face",
    )
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)

    if args.width <= 0 or args.height <= 0:
        raise SystemExit("width and height must be positive.")
    if args.guidance_scale < 0:
        raise SystemExit("guidance-scale must be non-negative.")
    if args.steps <= 0:
        raise SystemExit("steps must be positive.")
    if args.timeout <= 0 or args.retries <= 0:
        raise SystemExit("timeout and retries must be positive.")
    if args.git_push and not args.git_commit:
        raise SystemExit("--git-push requires --git-commit.")

    prompt_file = args.prompt_file.resolve() if args.prompt_file else None
    output_dir = args.output_dir.resolve()

    prompts = selected_prompts(prompt_file)
    composed = [
        AssetPrompt(item.name, compose_prompt(item.prompt, args.style, args.style_suffix))
        for item in prompts
    ]

    print(
        f"Generating {len(composed)} Cari assets via Hugging Face: "
        f"model={args.model}, provider={args.provider}, "
        f"size={args.width}x{args.height}, style={args.style}"
    )

    if args.dry_run:
        for item in composed:
            seed = stable_seed(item.name, item.prompt, args.seed)
            print(f"[dry-run] {item.name} seed={seed}")
            print(f"[dry-run] prompt={item.prompt}")
        return 0

    token = os.getenv(args.token_env, "")
    client = build_client(token, args.provider)

    failures = 0
    generated = 0
    for item in composed:
        target = output_dir / f"{item.name}.png"

        if target.exists() and not args.overwrite:
            print(f"[skip] {target} already exists (use --overwrite to regenerate)")
            continue

        seed = stable_seed(item.name, item.prompt, args.seed)
        print(f"[generate] {item.name} seed={seed}")

        last_error: Exception | None = None
        for attempt in range(1, args.retries + 1):
            try:
                image = generate_image(
                    client,
                    prompt=item.prompt,
                    model=args.model,
                    width=args.width,
                    height=args.height,
                    guidance_scale=args.guidance_scale,
                    steps=args.steps,
                    seed=seed,
                    negative_prompt=args.negative_prompt,
                )
                save_as_png(image, target)
                generated += 1
                print(f"[saved] {target}")
                break
            except GenerationError as exc:
                last_error = exc
                if attempt < args.retries:
                    delay = min(2**attempt, 60)
                    print(
                        f"[retry] {item.name} attempt={attempt + 1}/{args.retries} "
                        f"after {delay}s: {exc}",
                        file=sys.stderr,
                    )
                    time.sleep(delay)
        else:
            failures += 1
            print(f"[error] {item.name}: {last_error}", file=sys.stderr)

    if failures:
        print(
            f"Generation completed with {failures} failure(s); "
            f"{generated} asset(s) generated.",
            file=sys.stderr,
        )
        return 1

    if args.git_commit:
        branch = args.git_branch.strip() or current_branch()
        changed = commit_generated_assets(output_dir, args.git_message)
        if args.git_push and changed:
            push_branch(args.git_remote, branch)

    print(f"Generation completed successfully: {generated} asset(s) generated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
