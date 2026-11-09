# Needs the Archivo Expanded ExtraBold and SemiBold TTFs (Google Fonts) next to it: archivo-1.ttf and archivo-0.ttf.
# Run: pip install fonttools uharfbuzz, then python lockups.py (writes out/).
"""Builds the JC Solar logo files: outlined wordmark + the power-sun mark."""
import os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from mark import mark, svg, INK, SUN

WIDE = "archivo-1.ttf"   # Archivo Expanded ExtraBold (the site's .type-wide)
TEXT = "archivo-0.ttf"   # Archivo SemiBold (tagline)

def outline(text, font_path, size, tracking=0.0):
    """SVG path data for `text` set at `size` px (baseline at y=0), shaped with HarfBuzz (kerning)."""
    blob = hb.Blob.from_file_path(font_path)
    face = hb.Face(blob); font = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    tt = TTFont(font_path); gs = tt.getGlyphSet(); upem = tt["head"].unitsPerEm
    order = tt.getGlyphOrder()
    s = size / upem
    x = 0.0; d = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (s, 0, 0, -s, x + pos.x_offset * s, -pos.y_offset * s)))
        d.append(pen.getCommands())
        x += pos.x_advance * s + tracking * size
    width = x - tracking * size
    asc = tt["OS/2"].sCapHeight * s
    return " ".join(d), width, asc

def write(name, content):
    open(os.path.join("out", name), "w").write(content)

os.makedirs("out", exist_ok=True)
word, ww, cap = outline("JC Solar", WIDE, 100, tracking=-0.02)

# Mark tiles
write("jc-solar-mark.svg", svg(mark()))
write("jc-solar-mark-simple.svg", svg(mark(with_rays=False)))
write("jc-solar-mark-ink.svg", svg(mark(tile=False)))          # one colour, no tile
write("jc-solar-mark-white.svg", svg(mark(fg="#ffffff", tile=False)))

def horizontal(text_fill, bg=None):
    # mark 100 high; cap height of the wordmark ~ 46% of the mark, vertically centred
    k = 46 / cap
    gap = 26
    W = 100 + gap + ww * k + 6
    tx, ty = 100 + gap, 50 + 46 / 2
    bgr = f'<rect width="{W:.1f}" height="100" fill="{bg}"/>' if bg else ""
    inner = f'{bgr}{mark()}<g transform="translate({tx:.2f} {ty:.2f}) scale({k:.4f})"><path d="{word}" fill="{text_fill}"/></g>'
    return svg(inner, w=round(W, 1), h=100)

def stacked(text_fill):
    k = 30 / cap
    W = max(100, ww * k) + 12
    mx = (W - 100) / 2
    inner = f'<g transform="translate({mx:.2f} 0)">{mark()}</g><g transform="translate({(W - ww * k) / 2:.2f} {100 + 22 + 30:.2f}) scale({k:.4f})"><path d="{word}" fill="{text_fill}"/></g>'
    return svg(inner, w=round(W, 1), h=100 + 22 + 30 + 8)

write("jc-solar-logo.svg", horizontal(INK))
write("jc-solar-logo-on-dark.svg", horizontal("#ffffff"))
write("jc-solar-logo-stacked.svg", stacked(INK))
write("jc-solar-logo-stacked-on-dark.svg", stacked("#ffffff"))
print("wordmark width", round(ww), "cap", round(cap, 1))
