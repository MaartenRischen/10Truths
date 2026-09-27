# 540x960 renders -> 720x1280 frames: Lanczos upscale, gentle unsharp, fresh fine film grain (luma-weighted, per-frame seed).
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
only = set(int(x) for x in sys.argv[3].split(',')) if len(sys.argv) > 3 and sys.argv[3] else None
force = len(sys.argv) > 4 and sys.argv[4] == 'force'
os.makedirs(dst, exist_ok=True)
n = 0
for f in sorted(glob.glob(os.path.join(src, 'f_?????.png'))):
    i = int(os.path.basename(f)[2:7])
    if only is not None and i not in only: continue
    out = os.path.join(dst, os.path.basename(f))
    if os.path.exists(out) and not force and os.path.getmtime(out) > os.path.getmtime(f): continue
    im = Image.open(f).convert('RGB')
    if im.size != (720, 1280):
        im = im.resize((720, 1280), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=2))
        a = np.asarray(im).astype(np.float32)
        rng = np.random.default_rng(1000 + i)
        l = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]) / 255.0
        w = 0.35 + 0.65 * (1 - np.abs(l * 2 - 1) ** 1.6)
        g = rng.normal(0, 3.2, a.shape[:2]).astype(np.float32) * w
        a = np.clip(a + g[..., None], 0, 255).astype(np.uint8)
        im = Image.fromarray(a)
    im.save(out + '.tmp.png'); os.replace(out + '.tmp.png', out); n += 1
print('upscaled', n)
