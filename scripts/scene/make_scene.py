#!/usr/bin/env python3
"""Build the pictures for the house on the "Build your system" page.

From three files generated with Higgsfield (see README.md beside this script):

  house.png      the house by day, 2048 x 1536
  lit.mp4        a clip of the same house in which the lights come on indoors
  clouds.mp4     a clip of the same house, camera still, in which clouds form and clear

it writes into the output folder (public/build/scene):

  day.webp        the house by day
  sky-mask.png    where the sky is, as transparency (the cloud loop only shows through it)
  clouds.mp4/.webm  the sky from the cloud clip, lined up with the still, slowed to a 12 second loop
  night-dark.webp the same picture graded to night, under stars
  night-lit.webp  ... with the lit windows from the first clip, their glow, and the light they throw outside

With a fifth argument it also writes the home page's pictures there (public/home): the same house
at night with twelve panels on its roof, lights off and lights on, on a wide canvas for large
screens (the house low on the right, sky and lawn carried on to the left) and upright for phones.

Usage:  python3 make_scene.py house.png lit.mp4 clouds.mp4 ../../public/build/scene [../../public/home]
Needs:  numpy, opencv-python-headless, and ffmpeg on the PATH.
"""
import os
import subprocess
import sys

import cv2
import numpy as np

HOUSE, LIT, CLOUDS, OUT = sys.argv[1:5]
HOME = sys.argv[5] if len(sys.argv) > 5 else None
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

D8 = cv2.imread(HOUSE)
H, W = D8.shape[:2]
assert (W, H) == (2048, 1536), "the measurements below are for the 2048 x 1536 picture"

# Measured on the picture: the roof face, the glass of the windows and the sliding door, and the entry.
ROOF = np.array([[736, 551], [1264, 551], [2014, 864], [66, 864]], np.int32)
GLASS = [(296, 896, 267, 160), (722, 893, 257, 232), (1247, 895, 93, 166), (1456, 895, 229, 174)]
ENTRY = (700, 884, 405, 276)
LIT_FRAME = 72  # by then every light in the clip is on


def frames_of(path):
    cap = cv2.VideoCapture(path)
    out = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        out.append(f)
    return out


def lin(x):
    return np.power(np.clip(x, 0, 1), 2.2)


def srgb(x):
    return np.power(np.clip(x, 0, 1), 1 / 2.2)


def lum(x):
    return 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]


def save(img8, name, q):
    small = cv2.resize(img8, (1600, 1200), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f"{OUT}/{name}.webp", small, [cv2.IMWRITE_WEBP_QUALITY, q])
    print(name, os.path.getsize(f"{OUT}/{name}.webp") // 1024, "KB")


# ---- the sky: bright and blue or pale, above the horizon, joined to the top edge; clouds ringed by sky count too
hsv = cv2.cvtColor(D8, cv2.COLOR_BGR2HSV)
hh, ss, vv = cv2.split(hsv)
blue = ((hh > 92) & (hh < 120) & (ss > 55) & (vv > 105)).astype(np.uint8)
pale = ((ss < 95) & (vv > 165)).astype(np.uint8)
cand = ((blue | pale) > 0).astype(np.uint8)
cand[int(H * 0.575):] = 0
cv2.fillPoly(cand, [ROOF], 0)
cand = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
_, lab = cv2.connectedComponents(cand, connectivity=8)
sky = np.isin(lab, list(set(np.unique(lab[0])) - {0})).astype(np.uint8)
inv = (1 - sky).astype(np.uint8)
flood = inv.copy()
cv2.floodFill(flood, np.zeros((H + 2, W + 2), np.uint8), (W // 2, H - 1), 2)
sky[(inv == 1) & (flood != 2)] = 1
sky_soft = cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 1.2)
mask = cv2.resize((sky_soft * 255).astype(np.uint8), (1024, 768), interpolation=cv2.INTER_AREA)
cv2.imwrite(f"{OUT}/sky-mask.png", np.dstack([np.full_like(mask, 255)] * 3 + [mask]), [cv2.IMWRITE_PNG_COMPRESSION, 9])
print("sky is", round(float(sky.mean()) * 100), "% of the picture, down to", round(float(np.where((mask > 20).any(1))[0].max()) / 768, 3), "of its height")

save(D8, "day", 80)

# ---- the lit clip: bring one frame onto the still (the clip's camera drifts)
sift = cv2.SIFT_create(6000)
gs = cv2.cvtColor(D8, cv2.COLOR_BGR2GRAY)
house_only = np.zeros_like(gs)
house_only[int(H * 0.34):int(H * 0.76), int(W * 0.03):int(W * 0.97)] = 255
ks, ds = sift.detectAndCompute(gs, house_only)
lit_up = cv2.resize(frames_of(LIT)[LIT_FRAME], (W, H), interpolation=cv2.INTER_CUBIC)
k, d = sift.detectAndCompute(cv2.cvtColor(lit_up, cv2.COLOR_BGR2GRAY), None)
good = [a for a, b in cv2.BFMatcher().knnMatch(d, ds, k=2) if a.distance < 0.72 * b.distance]
Hm, inl = cv2.findHomography(np.float32([k[a.queryIdx].pt for a in good]), np.float32([ks[a.trainIdx].pt for a in good]), cv2.RANSAC, 3.0)
print("lit frame matched on", int(inl.sum()), "points")
L8 = cv2.warpPerspective(lit_up, Hm, (W, H), flags=cv2.INTER_CUBIC)

# ---- night
D = D8[..., ::-1].astype(np.float32) / 255.0
Dl = lin(D)
Ll = lin(L8[..., ::-1].astype(np.float32) / 255.0)
Y = lum(Dl)[..., None]
# A graphite night, barely cool: the site's own dark, with no blue in it.
moonlit = (Y + (Dl - Y) * 0.22) * np.array([0.90, 0.94, 1.0], np.float32) * 0.066 + np.array([0.0016, 0.0017, 0.0019], np.float32)

yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
t = np.clip(yy / 0.58, 0, 1)  # 0 at the top of the picture, 1 at the horizon
SKY_TOP, SKY_LOW = (15, 15, 17), (40, 40, 45)
top_c = lin(np.array(SKY_TOP, np.float32) / 255)
hor_c = lin(np.array(SKY_LOW, np.float32) / 255)
sky_c = (top_c[None, None, :] * (1 - t[..., None] ** 1.6) + hor_c[None, None, :] * (t[..., None] ** 1.6)) * np.ones((1, W, 1), np.float32)
stars = np.zeros((H, W), np.float32)
count = 900
for x, y, m in zip(rng.integers(0, W, count), (rng.random(count) ** 1.25 * H * 0.56).astype(int), rng.pareto(2.2, count) * 0.10 + 0.05):
    if sky[y, x]:
        stars[y, x] = min(1.4, m)
bright = stars > 0.5
stars = cv2.GaussianBlur(stars, (0, 0), 0.9) * 3.2 + cv2.GaussianBlur(np.where(bright, stars, 0).astype(np.float32), (0, 0), 2.6) * 5.0
night_sky = sky_c + stars[..., None] * np.array([0.92, 0.95, 1.0], np.float32) * (1 - 0.6 * t[..., None])
off = moonlit * (1 - sky_soft[..., None]) + night_sky * sky_soft[..., None]

glass = np.zeros((H, W), np.float32)
for x, y, w, h in GLASS:
    glass[y:y + h, x:x + w] = 1
glass = cv2.GaussianBlur(glass, (0, 0), 1.5)

# light from indoors: what is bright in the lit frame, less what was only daylight on the glass
gate = np.clip((lum(Ll) - 0.05) / 0.25, 0, 1) ** 1.2
E = Ll * gate[..., None] * glass[..., None] * np.array([1.9, 1.55, 1.15], np.float32)
E = np.clip(E - np.clip(lum(Dl), 0, 1)[..., None] * glass[..., None] * 0.6, 0, None)
glow = cv2.GaussianBlur(E, (0, 0), 7) * 0.55 + cv2.GaussianBlur(E, (0, 0), 34) * 0.45 + cv2.GaussianBlur(E, (0, 0), 110) * 0.30

# the light that falls outside: pools in front of each lit opening, on the still's own surfaces
Em = lum(E)
yy2, xx2 = np.mgrid[0:H, 0:W].astype(np.float32)
spill = np.zeros((H, W), np.float32)
for x, y, w, h in GLASS:
    strength = float(Em[y:y + h, x:x + w].mean())
    if strength < 0.01:
        continue
    dist = np.clip((yy2 - (y + h)) / h, 0, None)  # in front of the opening, in its own heights
    half = (w / 2) * (1.0 + 1.5 * dist) + 20  # the pool widens as it goes
    spill += np.exp(-((xx2 - (x + w / 2)) / half) ** 2 * 1.4) * np.exp(-dist / 0.85) * (yy2 > y + h - 6) * strength
spill = np.clip(cv2.GaussianBlur(spill, (0, 0), 14) * 7.0, 0, 1.0) * (1 - sky_soft)
warm = np.array([1.0, 0.66, 0.34], np.float32)
lit_ground = Dl * warm * spill[..., None] * 0.55
ex, ey, ew, eh = ENTRY
entry = np.zeros((H, W), np.float32)
entry[ey:ey + eh, ex:ex + ew] = 1
fall = np.exp(-(((xx2 - (ex + ew * 0.50)) / (ew * 0.75)) ** 2 + ((yy2 - (ey + eh * 0.05)) / (eh * 1.25)) ** 2))
lit_ground += Dl * warm * (cv2.GaussianBlur(entry, (0, 0), 10) * fall)[..., None] * 0.50 * (1 - glass[..., None] * 0.5)
on = off + E + glow * np.array([1.0, 0.80, 0.55], np.float32) + lit_ground

for name, img, q in (("night-lit", on, 80), ("night-dark", off, 78)):
    out = srgb(img) + rng.normal(0, 0.004, img.shape).astype(np.float32)
    save((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)[..., ::-1], name, q)

# ---- the home page: the same house at night with panels on its roof, lights off and on
if HOME:
    os.makedirs(HOME, exist_ok=True)
    # The roof as the page draws it (builder-scene.tsx): a true rectangle on the roof face, and the rows of panels on it.
    to_roof = cv2.getPerspectiveTransform(np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]), np.float32([[679.0454, 853], [1345.2747, 853], [1262, 562], [738, 562]]))
    PW, PH, GU, GV, CENTRE, EAVE = 0.262, 0.128, 0.012, 0.014, 0.5385, 0.035
    ROWS = [8, 8, 6, 6, 4]

    def on_roof(u, v, k=2):
        q = to_roof @ np.array([u, v, 1.0])
        return q[:2] / q[2] * k

    def panel_places():
        def from_middle(n):
            return sorted(range(n), key=lambda i: (abs(i - (n - 1) / 2), i))
        order = []
        for row in range(0, len(ROWS), 2):
            lower = from_middle(ROWS[row])
            upper = from_middle(ROWS[row + 1]) if row + 1 < len(ROWS) else []
            for i in range(max(len(lower), len(upper))):
                if i < len(lower):
                    order.append((row, lower[i]))
                if i < len(upper):
                    order.append((row + 1, upper[i]))
        return order

    def with_panels(img8, count, glass_top, glass_low, frame, cell):
        """Lay `count` panels on the roof of a BGR picture. Drawn at twice the size and scaled down, for clean edges."""
        k = 2
        layer = np.zeros((H * k, W * k, 3), np.uint8)
        alpha = np.zeros((H * k, W * k), np.uint8)
        shadow = np.zeros((H * k, W * k), np.uint8)
        for row, col in panel_places()[:count]:
            v0 = EAVE + row * (PH + GV)
            v1 = v0 + PH
            u0 = CENTRE - (ROWS[row] * (PW + GU) - GU) / 2 + col * (PW + GU)
            u1 = u0 + PW
            quad = np.int32([on_roof(u0, v0), on_roof(u1, v0), on_roof(u1, v1), on_roof(u0, v1)])
            cv2.fillPoly(shadow, [quad + np.int32([2 * k, 6 * k])], 255, cv2.LINE_AA)
            mix = (v0 + v1) / 2
            body = tuple(int(round(a + (b - a) * mix)) for a, b in zip(glass_low, glass_top))
            cv2.fillPoly(layer, [quad], body, cv2.LINE_AA)
            cv2.fillPoly(alpha, [quad], 255, cv2.LINE_AA)
            vm = (v0 + v1) / 2
            cv2.line(layer, tuple(np.int32(on_roof(u0, vm))), tuple(np.int32(on_roof(u1, vm))), cell, k, cv2.LINE_AA)
            for j in range(1, 6):
                u = u0 + PW * j / 6
                cv2.line(layer, tuple(np.int32(on_roof(u, v0))), tuple(np.int32(on_roof(u, v1))), cell, k, cv2.LINE_AA)
            cv2.polylines(layer, [quad], True, frame, 3 * k - 1, cv2.LINE_AA)
            cv2.polylines(alpha, [quad], True, 255, 3 * k - 1, cv2.LINE_AA)
        small = lambda m: cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA)
        a = small(alpha).astype(np.float32)[..., None] / 255
        sh = small(shadow).astype(np.float32)[..., None] / 255 * 0.28
        out = img8.astype(np.float32) * (1 - sh)
        return np.clip(out * (1 - a) + small(layer).astype(np.float32) * a + 0.5, 0, 255).astype(np.uint8)

    def to8(img):
        out = srgb(img) + rng.normal(0, 0.004, img.shape).astype(np.float32)
        return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)[..., ::-1]

    PANELS = 12
    night = dict(glass_top=(36, 33, 31), glass_low=(14, 13, 12), frame=(88, 86, 84), cell=(50, 47, 45))  # BGR
    day = dict(glass_top=(82, 58, 43), glass_low=(27, 17, 12), frame=(214, 206, 201), cell=(99, 74, 59))
    house = {"off": with_panels(to8(off), PANELS, **night), "on": with_panels(to8(on), PANELS, **night)}
    cv2.imwrite(f"{HOME}/house-day.webp", cv2.resize(with_panels(D8, PANELS, **day), (1600, 1200), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 80])
    for name, img in house.items():
        cv2.imwrite(f"{HOME}/house-night-{name}.webp", cv2.resize(img, (1400, 1050), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 80])

    # The wide canvas: the house low on the right, its sky and its lawn carried on to the left for the headline.
    CW, CH = 2400, 1600
    hw = int(CW * 0.70)
    hh2 = hw * H // W
    x0, y0 = CW - hw, CH - hh2 + int(hh2 * 0.09)
    fg = cv2.resize((1 - sky_soft), (hw, hh2), interpolation=cv2.INTER_AREA)
    horizon = y0 + 0.58 * hh2
    cy = np.arange(CH, dtype=np.float32)[:, None]
    ct = np.clip(cy / horizon, 0, 1)
    wide_sky = (top_c[None, None, :] * (1 - ct[..., None] ** 1.6) + hor_c[None, None, :] * (ct[..., None] ** 1.6)) * np.ones((1, CW, 1), np.float32)
    field = np.zeros((CH, CW), np.float32)
    many = 1500
    for x, y, m in zip(rng.integers(0, CW, many), (rng.random(many) ** 1.2 * horizon * 0.97).astype(int), rng.pareto(2.2, many) * 0.10 + 0.05):
        field[y, x] = min(1.4, m)
    strong = field > 0.5
    field = cv2.GaussianBlur(field, (0, 0), 1.0) * 3.2 + cv2.GaussianBlur(np.where(strong, field, 0).astype(np.float32), (0, 0), 2.8) * 5.0
    wide_sky = wide_sky + field[..., None] * np.array([0.92, 0.95, 1.0], np.float32) * (1 - 0.6 * ct[..., None])
    sky8 = to8(wide_sky).astype(np.float32)
    depth = np.clip((cy - horizon) / (CH - horizon), 0, 1)[..., None]
    ground = (np.float32([16, 16, 16]) * (1 - depth) + np.float32([34, 36, 33]) * depth) * np.ones((1, CW, 1), np.float32)
    ground = ground + rng.normal(0, 2.2, (CH, CW, 1)).astype(np.float32) * (0.4 + depth)
    trees = np.zeros((CH, CW), np.uint8)
    for x in range(-40, x0 + 120, 15):
        r = int(rng.integers(10, 34) * (1.7 if rng.random() < 0.12 else 1))
        cv2.ellipse(trees, (x + int(rng.integers(-10, 10)), int(horizon) - int(r * rng.uniform(0.1, 0.75))), (int(r * rng.uniform(0.9, 1.5)), r), 0, 0, 360, 255, -1, cv2.LINE_AA)
    cv2.rectangle(trees, (0, int(horizon) - 4), (x0 + 160, int(horizon) + 26), 255, -1)
    trees = cv2.GaussianBlur(trees, (0, 0), 2.2).astype(np.float32) / 255 * 0.92
    trees *= np.clip((x0 + 200 - np.arange(CW, dtype=np.float32)) / 260, 0, 1)[None, :]
    for name, img in house.items():
        small = cv2.resize(img, (hw, hh2), interpolation=cv2.INTER_AREA).astype(np.float32)
        canvas = sky8.copy()
        # the ground to the left of the picture: dark veld under a low line of trees, a touch lighter towards the camera
        canvas[int(horizon):] = ground[int(horizon):]
        canvas = canvas * (1 - trees[..., None]) + np.float32([15, 15, 15]) * trees[..., None]
        # the picture itself, let into that ground over its left fifth
        rows = slice(max(0, -y0), min(hh2, CH - y0))
        a = fg[rows][..., None].copy()
        ramp = np.clip((np.arange(hw, dtype=np.float32) - 30) / 290, 0, 1)[None, :, None] ** 1.5
        region = canvas[y0 + rows.start:y0 + rows.stop, x0:]
        mixed = region * (1 - a) + small[rows] * a
        region[:] = region * (1 - ramp) + mixed * ramp
        out = cv2.resize(np.clip(canvas + 0.5, 0, 255).astype(np.uint8), (2000, 1333), interpolation=cv2.INTER_AREA)
        cv2.imwrite(f"{HOME}/hero-night-{name}.webp", out, [cv2.IMWRITE_WEBP_QUALITY, 82])
    for f in sorted(os.listdir(HOME)):
        print(f, os.path.getsize(f"{HOME}/{f}") // 1024, "KB")

# ---- the cloud loop: the clip's sky, put where the still's is, slowed three times
clip = frames_of(CLOUDS)
ch, cw = clip[0].shape[:2]
first = cv2.resize(clip[0], (W, H), interpolation=cv2.INTER_CUBIC)
k1, d1 = sift.detectAndCompute(cv2.cvtColor(first, cv2.COLOR_BGR2GRAY), None)
k2, d2 = sift.detectAndCompute(gs, None)
good = [a for a, b in cv2.BFMatcher().knnMatch(d1, d2, k=2) if a.distance < 0.7 * b.distance]
A, _ = cv2.estimateAffinePartial2D(np.float32([k1[a.queryIdx].pt for a in good]), np.float32([k2[a.trainIdx].pt for a in good]), method=cv2.RANSAC, ransacReprojThreshold=2)
scale = float(np.hypot(A[0, 0], A[1, 0]))
print("cloud clip against the still: scale %.5f, shift %.1f, %.1f" % (scale, A[0, 2], A[1, 2]))
clip = clip[:-1]  # its last frame is its first again
OW, OH, CROP = 960, 720, 412  # the sky ends 0.557 of the way down
kx = OW / W
M = np.float32([[scale * (W / cw) * kx, 0, A[0, 2] * kx], [0, scale * (H / ch) * kx, A[1, 2] * kx]])
sky_px = sky > 0
gain = (D8[sky_px].mean(0) / first[sky_px].mean(0)).astype(np.float32)  # match the still's sky
warped = [np.clip(cv2.warpAffine(f, M, (OW, OH), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)[:CROP].astype(np.float32) * gain, 0, 255) for f in clip]
STEP = 3
for ext, enc in (
    ("mp4", ["-c:v", "libx264", "-preset", "veryslow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]),
    ("webm", ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p"]),
):
    path = f"{OUT}/clouds.{ext}"
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{CROP}", "-r", "24", "-i", "-", "-an"] + enc + [path], stdin=subprocess.PIPE)
    n = len(warped)
    for i in range(n * STEP):
        a, b, f = warped[(i // STEP) % n], warped[(i // STEP + 1) % n], (i % STEP) / STEP
        ff.stdin.write(np.clip(a * (1 - f) + b * f + 0.5, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close()
    ff.wait()
    print(f"clouds.{ext}", os.path.getsize(path) // 1024, "KB")
