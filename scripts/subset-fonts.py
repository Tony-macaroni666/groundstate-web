#!/usr/bin/env python3
"""Builds the self-hosted Inter WOFF2 files from the brand's TTFs.

The TTFs in src/fonts/ are the brand's files (AI-System brand/ground-state/fonts/)
and stay untouched. This keeps every glyph outline, hint and OpenType feature
(tabular figures included) and drops only the characters outside
src/fonts/subset.json, then stores the result as WOFF2. Nothing is redrawn.

    python3 -m pip install fonttools brotli
    python3 scripts/subset-fonts.py
"""

import json
from pathlib import Path

from fontTools import subset

FONTS = Path(__file__).resolve().parent.parent / "src" / "fonts"


def unicodes(spec: dict) -> list[int]:
    out: set[int] = set()
    for block in ("latin", "latin-ext", "extra"):
        for item in spec[block]:
            lo, _, hi = item.removeprefix("U+").partition("-")
            out.update(range(int(lo, 16), int(hi or lo, 16) + 1))
    return sorted(out)


def main() -> None:
    spec = json.loads((FONTS / "subset.json").read_text())
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.glyph_names = False
    options.hinting = True
    for source, target in spec["fonts"].items():
        font = subset.load_font(str(FONTS / source), options)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=unicodes(spec))
        subsetter.subset(font)
        subset.save_font(font, str(FONTS / target), options)
        print(f"{source} ({(FONTS / source).stat().st_size // 1024} kB) -> {target} ({(FONTS / target).stat().st_size // 1024} kB)")


if __name__ == "__main__":
    main()
