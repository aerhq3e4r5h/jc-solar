# Product photos on white

Supplier photos arrive as marketing tiles (coloured background, banner text,
watermark). These scripts cut the product out and centre it on a clean
1000 x 1000 white square. Everything runs locally, so photos never leave the
machine.

```bash
python3 -m venv .venv-photos
.venv-photos/bin/pip install "rembg[cpu]" scipy

# 1. Masks (slow, AI). masks.tsv lines: "<input image>\t<mask .png>"
.venv-photos/bin/python -I scripts/photos/make_masks.py birefnet-general-lite masks.tsv

# 2. Compose (fast). compose.tsv lines: "<input image>\t<mask .png>\t<output .webp>"
.venv-photos/bin/python -I scripts/photos/compose_white.py compose.tsv
```

- **Model:** BiRefNet general lite (MIT licence), downloaded by rembg on first
  run (about 220 MB). It needs about 12 GB of memory, so run it in chunks of
  about 40 photos if memory is tight. Masks are saved, so you can tune step 2
  without running the model again.
- **What step 2 does:**
  - Drops small islands: banner letters, the supplier's round badge, and the
    vertical watermark on the right edge.
  - Fills holes inside the product.
  - Uses the product's original pixels.
  - Scales the product to leave a 7% margin.
- **Photos already shot on white** (most second and third views) skip both
  steps: trim the margin and centre them on the square.
- **Fallback for some solar panels:** `panel_rectangle.py` handles panels the
  model misses (blue cells on a blue sky). It finds the panel by its grid
  texture and crops the exact rectangle:
  `python -I scripts/photos/panel_rectangle.py IN.webp OUT.webp`.
- **Check every result by eye.** When a cut-out is wrong, use the product's
  next clean photo as the main one, or keep the original.
- **Where files go:** output files are named `w-<n>.webp` in
  `public/products/<slug>/`, and `src/data/product-images.json` maps each SKU
  to them. `sameRange: true` marks a sister model's photo, used where the
  supplier has no photo of the exact model.
- **When the mask misses part of a product** that has a convex outline
  (for example a dark corner of a panel against a dark background), fill
  the mask's convex hull instead (this is how the GCL 625 W photo was fixed).

## Sharper photos from the supplier's full-size uploads

Solar Europe's product pages use 800 x 800 thumbnails (`...-800x800.png`); the
full-size upload sits at the same URL without the size suffix, usually 1000 to
1400 px. `rerender_hires.py` redraws each finished white photo from that
original, so it keeps every cut-out decision already made (islands dropped,
hull fixes, panel rectangles):

```bash
# pairs.tsv lines: "<current w-n.webp>\t<full-size original>\t<new output .webp>"
.venv-photos/bin/pip install opencv-python-headless
.venv-photos/bin/python -I scripts/photos/rerender_hires.py pairs.tsv report.tsv
```

- **How it lines up the two:** SIFT feature matching, with a template-match
  fallback, finds where the original sits in today's photo. ECC refines the fit.
- **How it rebuilds the photo:** it recovers the cut-out's edge from the two
  images and redraws the product from the original's pixels.
- **Sizing:** a product is never enlarged past 1:1 with the original. Small
  originals shrink in the frame, but never below 85% of their old size.
- **Sharpening:** a light unsharp mask is applied to the product, and the file
  is saved as WebP at quality 90.
- **Checking:** `report.tsv` lists the match quality per photo. Look at any row
  marked `check` side by side with the old photo before installing it.
- **Share images:** regenerate `og.jpg` (480 px JPEG of the main photo) in each
  folder afterwards.
