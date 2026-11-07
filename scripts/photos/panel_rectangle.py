"""Cut out a rectangular solar panel by its cell texture, for panels the model misses (blue cells on a blue sky).
usage: panel_rect.py IN OUT [IN OUT ...]"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
SIZE, MARGIN = 1000, 0.07
args = sys.argv[1:]
for src, out in zip(args[::2], args[1::2]):
    im = Image.open(src).convert("RGB")
    g = np.asarray(im.convert("L")).astype(float)
    grad = np.abs(ndimage.sobel(g, 0)) + np.abs(ndimage.sobel(g, 1))
    tex = ndimage.uniform_filter(grad, 9)
    m = tex > np.percentile(tex, 82)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=8))
    lab, n = ndimage.label(m)
    areas = ndimage.sum(m, lab, range(1, n + 1))
    comp = lab == (int(np.argmax(areas)) + 1)

    def longest_run(ok):
        best, start, run = (0, 0), None, 0
        for i, v in enumerate(list(ok) + [False]):
            if v and start is None:
                start = i
            if not v and start is not None:
                if i - start > best[1] - best[0]:
                    best = (start, i)
                start = None
        return best

    rows = comp.sum(axis=1)
    y0, y1 = longest_run(rows > 0.7 * rows.max())
    cols = comp[y0:y1].sum(axis=0)
    x0, x1 = longest_run(cols > 0.7 * cols.max())
    box = (x0 + 3, y0 + 3, x1 - 3, y1 - 3)  # trim the sky fringe
    panel = im.crop(box)
    inner = int(SIZE * (1 - 2 * MARGIN))
    scale = inner / max(panel.size)
    panel = panel.resize((round(panel.width * scale), round(panel.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), "white")
    canvas.paste(panel, ((SIZE - panel.width) // 2, (SIZE - panel.height) // 2))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.save(out, "WEBP", quality=86, method=6)
    print("ok", out, box)
