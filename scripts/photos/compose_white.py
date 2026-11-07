"""Pass 2 (fast): clean each mask and put the product, in its original pixels, on a white square.
usage: compose.py LIST_FILE   (lines: <input>\t<mask .png>\t<output .webp>)"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
SIZE, MARGIN = 1000, 0.07

def clean_alpha(a):
    m = a > 128
    lab, n = ndimage.label(m)
    if n == 0:
        return a
    areas = ndimage.sum(m, lab, range(1, n + 1))
    objs = ndimage.find_objects(lab)
    biggest = areas.max()
    w = a.shape[1]
    keep = np.zeros(n + 1, bool)
    for i, (area, sl) in enumerate(zip(areas, objs), start=1):
        if area < biggest * 0.15:
            continue  # banner letters, badges, stray specks
        if sl[1].start > w * 0.8 and area < biggest * 0.5:
            continue  # the supplier's badge and vertical watermark on the right edge
        keep[i] = True
    mask = ndimage.binary_fill_holes(keep[lab])
    out = np.where(mask, a, 0).astype(np.uint8)
    out[ndimage.binary_erosion(mask, iterations=2)] = 255
    return out

for line in open(sys.argv[1]):
    src, mpath, out = line.rstrip("\n").split("\t")
    if not os.path.exists(mpath):
        continue
    rgb = Image.open(src).convert("RGB")
    alpha = clean_alpha(np.asarray(Image.open(mpath).convert("L")))
    im = rgb.copy(); im.putalpha(Image.fromarray(alpha))
    box = Image.fromarray(alpha).point(lambda v: 255 if v > 20 else 0).getbbox()
    if not box:
        print("EMPTY", out); continue
    im = im.crop(box)
    inner = int(SIZE * (1 - 2 * MARGIN))
    scale = inner / max(im.size)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), "white")
    canvas.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2), im)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.save(out, "WEBP", quality=86, method=6)
