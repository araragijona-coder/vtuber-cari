#!/usr/bin/env python3
"""Regenerate the automatic Cari anime album section in README.md.

Only PNG files are catalogued. Category names come from the directory tree,
so uploading a PNG is enough to make it appear in the gallery.
"""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1] / "assets" / "cari-album"
README = ROOT / "README.md"

START = "<!-- CARI-ALBUM:AUTO-START -->"
END = "<!-- CARI-ALBUM:AUTO-END -->"


def display_name(path: Path) -> str:
    return path.stem.replace("_", " ").replace("-", " ").strip()


def build_gallery() -> str:
    pngs = sorted(
        (p for p in ROOT.rglob("*") if p.is_file() and p.suffix.lower() == ".png"),
        key=lambda p: p.as_posix().lower(),
    )

    if not pngs:
        return (
            "## Galería automática\n\n"
            "Todavía no hay PNG registrados en este álbum."
        )

    sections: dict[str, list[Path]] = {}
    for path in pngs:
        relative = path.relative_to(ROOT)
        category = relative.parent.as_posix() or "root"
        sections.setdefault(category, []).append(relative)

    lines = ["## Galería automática", "", f"**{len(pngs)} PNG** registrados.", ""]

    for category, items in sections.items():
        title = category.replace("/", " / ").replace("-", " ").title()
        lines.extend([f"### {title}", ""])
        for relative in items:
            label = display_name(relative)
            href = relative.as_posix()
            lines.extend(
                [
                    f'<a href="{href}"><img src="{href}" alt="{label}" width="180"></a>',
                    "",
                    f"**{label}**  ",
                    f"`{href}`",
                    "",
                ]
            )

    return "\n".join(lines).rstrip()


def update_readme(readme: str, gallery: str) -> str:
    start = readme.find(START)
    end = readme.find(END)

    if start < 0 or end < 0 or end < start:
        raise ValueError(
            "README.md must contain CARI-ALBUM:AUTO-START and AUTO-END markers."
        )

    before = readme[:start]
    after = readme[end + len(END):]
    return f"{before}{START}\n{gallery}\n\n{END}{after}"


def main() -> int:
    if not README.exists():
        raise FileNotFoundError(README)

    original = README.read_text(encoding="utf-8")
    updated = update_readme(original, build_gallery())

    if updated != original:
        README.write_text(updated, encoding="utf-8", newline="\n")
        print(f"Updated {README}")
    else:
        print("Album catalog already up to date.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
