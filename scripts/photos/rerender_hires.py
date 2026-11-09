"""Re-render each white product photo from the supplier's full-size original.

The current photo (already cut out, on white) is the guide: SIFT + ECC find where the
original sits in it, the cut-out's alpha is recovered from the two, and the product is
drawn again from the original's pixels. Never enlarged past 1:1 (MAX_SCALE), and never
smaller than MIN_KEEP of its current size in the frame.
usage: rerender_hires.py PAIRS_TSV REPORT_TSV [--only SUBSTR]"""
import os, sys
import numpy as np, cv2
from PIL import Image
from scipy import ndimage

MAX_SCALE, MIN_KEEP, SIZE = 1.0, 0.85, 1000

def load_rgb(path):
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); im = Image.alpha_composite(bg, im)
    return np.asarray(im.convert("RGB")).astype(np.float32)

def _valid(M):
    if M is None:
        return False
    a, b = M[0, 0], M[1, 0]
    s = float(np.hypot(a, b)); rot = abs(np.degrees(np.arctan2(b, a)))
    return 0.3 < s < 4 and rot < 2

def _sift_match(O, X):
    sift = cv2.SIFT_create(nfeatures=8000, contrastThreshold=0.015)
    go, gx = cv2.cvtColor(O.astype(np.uint8), cv2.COLOR_RGB2GRAY), cv2.cvtColor(X.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    ko, do = sift.detectAndCompute(go, None); kx, dx = sift.detectAndCompute(gx, None)
    if do is None or dx is None or len(ko) < 8 or len(kx) < 8:
        return None, 0
    bf = cv2.BFMatcher()
    fwd = bf.knnMatch(dx, do, k=2)
    back = {m.queryIdx: m.trainIdx for m in bf.match(do, dx)}
    good = [a for a, b in (p for p in fwd if len(p) == 2) if a.distance < 0.8 * b.distance and back.get(a.trainIdx) == a.queryIdx]
    if len(good) < 6:
        return None, len(good)
    src = np.float32([kx[g.queryIdx].pt for g in good]); dst = np.float32([ko[g.trainIdx].pt for g in good])
    best, best_n = None, 0
    for thr in (2.0, 3.5):
        M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=thr, maxIters=20000, confidence=0.999)
        if _valid(M) and inl.sum() > best_n:
            best, best_n = M, int(inl.sum())
    return best, best_n

def _template(O, X):
    """Fallback: multi-scale masked template match on downsized images."""
    f = 0.25
    o = cv2.resize(O, None, fx=f, fy=f, interpolation=cv2.INTER_AREA); x = cv2.resize(X, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    m = (o.min(axis=2) < 246).astype(np.uint8)
    ys, xs = np.nonzero(m)
    if len(ys) < 50:
        return None, 0
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    tpl, tm = o[y0:y1, x0:x1], m[y0:y1, x0:x1]
    best = (-1, None)
    for s in np.exp(np.linspace(np.log(0.3), np.log(3.5), 90)):  # s: X -> O
        w, h = int(round(tpl.shape[1] / s)), int(round(tpl.shape[0] / s))
        if w < 8 or h < 8 or w > x.shape[1] or h > x.shape[0]:
            continue
        t = cv2.resize(tpl, (w, h), interpolation=cv2.INTER_AREA); mm = cv2.resize(tm, (w, h), interpolation=cv2.INTER_NEAREST)
        r = cv2.matchTemplate(x, t, cv2.TM_CCORR_NORMED, mask=np.repeat(mm[..., None], 3, 2).astype(np.float32))
        r[~np.isfinite(r)] = -1
        _, v, _, loc = cv2.minMaxLoc(r)
        if v > best[0]:
            best = (v, (s, loc))
    if best[1] is None:
        return None, 0
    s, (lx, ly) = best[1]
    # X point (lx/f, ly/f) maps to O point (x0/f, y0/f)
    M = np.array([[s, 0, x0 / f - s * lx / f], [0, s, y0 / f - s * ly / f]], np.float32)
    return M, 0

def register(O, X):
    M, inl = _sift_match(O, X)
    how = "sift"
    if M is None or inl < 12:
        M, inl = _template(O, X); how = "template"
    if M is None:
        return None, 0, how
    mask = (O.min(axis=2) < 248).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    go, gx = cv2.cvtColor(O.astype(np.uint8), cv2.COLOR_RGB2GRAY), cv2.cvtColor(X.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    warp = M.astype(np.float32)
    for _ in range(2 if how == "template" else 1):
        try:
            Xw = cv2.warpAffine(gx, warp, (SIZE, SIZE), flags=cv2.INTER_LINEAR, borderValue=255).astype(np.float32)
            d = np.eye(2, 3, dtype=np.float32)
            _, d = cv2.findTransformECC(go.astype(np.float32), Xw, d, cv2.MOTION_AFFINE,
                                        (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-7), mask, 5)
            lim = (0.06, 25) if how == "template" else (0.02, 6)
            if np.abs(d[:, :2] - np.eye(2)).max() < lim[0] and np.abs(d[:, 2]).max() < lim[1]:
                D = np.vstack([d, [0, 0, 1]]); Mm = np.vstack([warp, [0, 0, 1]])
                warp = (np.linalg.inv(D) @ Mm)[:2].astype(np.float32)
        except cv2.error:
            pass
    return warp, inl, how

def recover_alpha(O, W):
    """Alpha of the cut-out, from today's photo O and the original warped onto it (W).
    Only where O has content (it is pure white elsewhere); edges solved per pixel."""
    dO, dW = 255 - O, 255 - W
    den = (dW * dW).sum(2); num = (dO * dW).sum(2)
    a = np.clip(num / np.maximum(den, 1e-3), 0, 1)
    nonwhite = O.min(axis=2) < 251
    flat = den < 3 * 12 ** 2                       # the original is near white here too
    a[flat] = nonwhite[flat].astype(np.float32)
    region = ndimage.binary_dilation(nonwhite, iterations=2)
    inner = ndimage.binary_erosion(nonwhite, iterations=2)
    alpha = np.where(inner, 1.0, np.where(region, a, 0.0)).astype(np.float32)
    # the product's extent (for centring): visible content, without stray specks
    core = O.min(axis=2) < 246
    lab, n = ndimage.label(ndimage.binary_dilation(core, iterations=3))
    if n:
        areas = ndimage.sum(core, lab, range(1, n + 1))
        core = core & np.isin(lab, 1 + np.flatnonzero(areas >= max(30, areas.max() * 0.002)))
    return alpha, core

def main():
    pairs = [l.rstrip("\n").split("\t") for l in open(sys.argv[1]) if l.strip()]
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    rep = open(sys.argv[2], "w")
    rep.write("out\tstatus\tinliers\tscale_before\tscale_after\tkeep\terr\thow\n")
    for cur, hi, out in pairs:
        if only and only not in cur:
            continue
        O, X = load_rgb(cur), load_rgb(hi)
        M, inl, how = register(O, X)
        if M is None:
            rep.write(f"{out}\tno-match\t{inl}\t\t\t\t\t{how}\n"); continue
        s = float(np.sqrt(abs(np.linalg.det(M[:, :2]))))
        W = cv2.warpAffine(X, M, (SIZE, SIZE), flags=cv2.INTER_LANCZOS4 if s > 1 else cv2.INTER_AREA, borderValue=(255, 255, 255))
        alpha, core = recover_alpha(O, W)
        recon = alpha[..., None] * W + (1 - alpha[..., None]) * 255
        err = float(np.abs(recon - O)[core].mean()) if core.any() else 99
        # New size: at most 1:1 with the original's pixels, at least MIN_KEEP of today's size
        keep = min(1.0, max(MIN_KEEP, MAX_SCALE / s))
        ys, xs = np.nonzero(core)
        cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        S2 = np.array([[keep, 0, SIZE / 2 - keep * cx], [0, keep, SIZE / 2 - keep * cy], [0, 0, 1]], np.float64)
        Mn = (S2 @ np.vstack([M, [0, 0, 1]]))[:2]
        sn = s * keep
        if sn < 1:  # shrink with area averaging first, then place with a near-1:1 warp
            Xs = cv2.resize(X, None, fx=sn, fy=sn, interpolation=cv2.INTER_AREA)
            Mn = Mn @ np.array([[1 / sn, 0, 0], [0, 1 / sn, 0], [0, 0, 1]])
        else:
            Xs = X
        Wn = cv2.warpAffine(Xs, Mn.astype(np.float32), (SIZE, SIZE), flags=cv2.INTER_LANCZOS4, borderValue=(255, 255, 255))
        An = cv2.warpAffine(alpha, S2[:2].astype(np.float32), (SIZE, SIZE), flags=cv2.INTER_LINEAR, borderValue=0)
        # light unsharp mask on the product only
        blur = cv2.GaussianBlur(Wn, (0, 0), 0.8)
        Wn = np.clip(Wn + 0.35 * (Wn - blur), 0, 255)
        N = An[..., None] * Wn + (1 - An[..., None]) * 255
        os.makedirs(os.path.dirname(out), exist_ok=True)
        Image.fromarray(np.clip(N + 0.5, 0, 255).astype(np.uint8)).save(out, "WEBP", quality=90, method=6)
        status = "ok" if err < 10 else "check"
        rep.write(f"{out}\t{status}\t{inl}\t{s:.3f}\t{sn:.3f}\t{keep:.3f}\t{err:.2f}\t{how}\n"); rep.flush()

if __name__ == "__main__":
    main()
