"""Pass 1 (slow, AI): save the model's raw product mask for each photo.
usage: mask_batch.py MODEL LIST_FILE   (lines: <input>\t<mask .png>; existing masks are skipped)"""
import sys, os
from PIL import Image
from rembg import new_session, remove
model, listfile = sys.argv[1], sys.argv[2]
session = new_session(model)
for line in open(listfile):
    src, out = line.rstrip("\n").split("\t")
    if os.path.exists(out):
        continue
    try:
        mask = remove(Image.open(src).convert("RGB"), session=session, only_mask=True, post_process_mask=True)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        mask.save(out)
        print("ok", out, flush=True)
    except Exception as e:
        print("FAIL", out, repr(e), flush=True)
