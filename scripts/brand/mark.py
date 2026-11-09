"""GridAnchor mark: an anchor that is also a "power on" symbol.
The anchor's curved arms are the power symbol's open ring, the shank is the
power stroke rising through the gap, topped by the anchor's crossbar and
ring. Coordinates are for a 100 x 100 tile."""
import math

INK = "#1e1e1c"
SUN = "#ffc414"
CX, CY, R, GAP = 50, 53, 26, 116
W = 9.5

def tips():
    a = math.radians(GAP / 2)
    dx, dy = R * math.sin(a), R * math.cos(a)
    return (CX + dx, CY - dy), (CX - dx, CY - dy)

def paths(flukes=False):
    (rx, ry), (lx, ly) = tips()
    d = {
        "arms": f"M{rx:.2f} {ry:.2f}A{R} {R} 0 1 1 {lx:.2f} {ly:.2f}",
        "shank": f"M{CX} {CY + R}V21",
        "stock": f"M39 30H61",
        "ring": (CX, 14.5, 5.5),
    }
    if flukes:
        d["flukes"] = f"M{rx:.2f} {ry:.2f}l7 3.5M{lx:.2f} {ly:.2f}l-7 3.5"
    return d

def mark(fg=INK, bg=SUN, tile=True, radius=22, flukes=False):
    d = paths(flukes)
    p = []
    if tile:
        p.append(f'<rect width="100" height="100" rx="{radius}" fill="{bg}"/>')
    p.append(f'<g fill="none" stroke="{fg}" stroke-linecap="round" stroke-linejoin="round">')
    p.append(f'<path d="{d["arms"]}" stroke-width="{W}"/>')
    p.append(f'<path d="{d["shank"]}" stroke-width="{W}"/>')
    p.append(f'<path d="{d["stock"]}" stroke-width="{W * 0.75}"/>')
    if flukes:
        p.append(f'<path d="{d["flukes"]}" stroke-width="{W * 0.75}"/>')
    cx, cy, r = d["ring"]
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" stroke-width="{W * 0.62}"/>')
    p.append("</g>")
    return "".join(p)

def svg(inner, w=100, h=100, title="GridAnchor"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>'

def mark_simple(fg=INK, bg=SUN):
    """For 16 px: no ring (it blurs), a longer shank and a heavier stroke."""
    (rx, ry), (lx, ly) = tips()
    return (
        f'<rect width="100" height="100" rx="22" fill="{bg}"/>'
        f'<g fill="none" stroke="{fg}" stroke-linecap="round" stroke-width="12">'
        f'<path d="M{rx:.2f} {ry:.2f}A{R} {R} 0 1 1 {lx:.2f} {ly:.2f}"/><path d="M{CX} {CY + R}V13"/><path d="M37 28H63" stroke-width="10"/></g>'
    )
