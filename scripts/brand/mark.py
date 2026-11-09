"""The JC Solar mark: the "power on" symbol drawn as a sun.
A thick ring open at the top (the sun), the power stroke rising through the
gap as the noon ray, and six short rays around it (none straight down: the
sun sits on the horizon). Coordinates are for a 100 x 100 tile."""
import math

INK = "#1e1e1c"
SUN = "#ffc414"
CX, CY, R, W = 50, 55, 20, 10
RAYS = (-90, -45, 45, 90, 135, 225)  # clockwise from the top; the top ray is the power stroke

def ring(cx=CX, cy=CY, r=R, gap=66):
    a0 = math.radians(-90 + gap / 2)
    a1 = math.radians(270 - gap / 2)
    x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
    x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
    return f"M{x0:.2f} {y0:.2f}A{r} {r} 0 1 1 {x1:.2f} {y1:.2f}"

def rays(cx=CX, cy=CY, r=R, inner=11, outer=16.5):
    out = []
    for deg in RAYS:
        a = math.radians(deg - 90 + 90 - 90) if False else math.radians(deg - 90)
        x0, y0 = cx + (r + inner) * math.cos(a), cy + (r + inner) * math.sin(a)
        x1, y1 = cx + (r + outer) * math.cos(a), cy + (r + outer) * math.sin(a)
        out.append(f"M{x0:.2f} {y0:.2f}L{x1:.2f} {y1:.2f}")
    return "".join(out)

def mark(fg=INK, bg=SUN, with_rays=True, tile=True, radius=22, ray_w=5.5):
    p = []
    if tile:
        p.append(f'<rect width="100" height="100" rx="{radius}" fill="{bg}"/>')
    p.append(f'<path d="{ring()}" fill="none" stroke="{fg}" stroke-width="{W}" stroke-linecap="round"/>')
    p.append(f'<path d="M{CX} {CY - 2}V{CY - R - 15}" stroke="{fg}" stroke-width="{W}" stroke-linecap="round"/>')
    if with_rays:
        p.append(f'<path d="{rays()}" stroke="{fg}" stroke-width="{ray_w}" stroke-linecap="round"/>')
    return "".join(p)

def svg(inner, w=100, h=100, title="JC Solar"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>'

if __name__ == "__main__":
    open("mark.svg", "w").write(svg(mark()))
    open("mark-simple.svg", "w").write(svg(mark(with_rays=False)))
