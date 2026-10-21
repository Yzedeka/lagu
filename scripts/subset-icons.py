#!/usr/bin/env python3
"""Build the trimmed Material Symbols Rounded font the app ships.

The full variable font from the `material-symbols` package is ~5 MB and holds
thousands of glyphs; Lagu uses a few dozen, at one weight/grade/optical size.
This pins those axes (keeping FILL for the filled variants) and keeps only the
glyphs named in src/renderer/src/icons/index.tsx.

Re-run after adding or renaming an icon:

    pip install fonttools brotli
    npm run icons:subset
"""

import io
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'node_modules/material-symbols/material-symbols-rounded.woff2'
ICONS = ROOT / 'src/renderer/src/icons/index.tsx'
OUTPUT = ROOT / 'src/renderer/src/assets/fonts/material-symbols-rounded-subset.woff2'

# Must match the font-variation-settings in styles/global.css.
PINNED_AXES = {'wght': 400, 'GRAD': 0, 'opsz': 24}


def icon_names() -> list[str]:
    names = sorted(set(re.findall(r'<Icon name="([a-z0-9_]+)"', ICONS.read_text())))
    if not names:
        sys.exit(f'no icon names found in {ICONS}')
    return names


def ligature_glyphs(font: TTFont) -> dict[str, str]:
    """Map each ligature's text (e.g. 'remove_circle_outline') to its glyph."""
    chars = {glyph: chr(code) for code, glyph in font['cmap'].getBestCmap().items()}
    result: dict[str, str] = {}
    for lookup in font['GSUB'].table.LookupList.Lookup:
        for table in lookup.SubTable:
            if lookup.LookupType == 7:
                table = table.ExtSubTable
            for first, ligatures in getattr(table, 'ligatures', {}).items():
                for lig in ligatures:
                    parts = [first, *lig.Component]
                    if all(p in chars for p in parts):
                        result[''.join(chars[p] for p in parts)] = lig.LigGlyph
    return result


def main() -> None:
    names = icon_names()
    font = TTFont(SOURCE)
    glyph_order = set(font.getGlyphOrder())
    ligatures = ligature_glyphs(font)

    missing = [n for n in names if n not in ligatures]
    if missing:
        sys.exit(f'not in Material Symbols Rounded: {", ".join(missing)}')

    font = instancer.instantiateVariableFont(font, PINNED_AXES)
    # Round-trip so the subsetter sees fully compiled tables, not the
    # instancer's partially loaded ones.
    buffer = io.BytesIO()
    font.save(buffer)
    buffer.seek(0)
    font = TTFont(buffer)

    # Ligature inputs (the letters of each name) plus the icon glyphs and their
    # filled variants. Layout closure is off, otherwise every ligature that can
    # be spelled from those letters - i.e. the whole font - would be kept.
    text = ''.join(sorted(set(''.join(names))))
    targets = {ligatures[name] for name in names}
    glyphs = [g for t in sorted(targets) for g in (t, f'{t}.fill') if g in glyph_order]

    options = subset.Options()
    options.layout_features = ['*']
    options.layout_closure = False
    options.flavor = 'woff2'
    options.name_IDs = ['*']
    options.notdef_outline = True

    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text, glyphs=glyphs)
    subsetter.subset(font)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(OUTPUT), options)
    print(f'{len(names)} icons -> {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size / 1024:.1f} KiB)')


if __name__ == '__main__':
    main()
