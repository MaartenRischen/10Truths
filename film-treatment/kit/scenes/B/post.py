# Lens + film finish on a display-referred PNG: bloom, chromatic aberration, vignette, grain.
import sys, json, math
import numpy as np
from PIL import Image, ImageFilter
src, dst, kw = sys.argv[1], sys.argv[2], json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
vignette = kw.get('vignette', 0.22); grain = kw.get('grain', 0.012); bloom = kw.get('bloom', 0.10)
thr = kw.get('bloom_thr', 0.78); ca = kw.get('ca', 0.6); warm = kw.get('warm', [1, 1, 1]); lift = kw.get('lift', 0.0)
sat = kw.get('sat', 1.0); gamma = kw.get('gamma', 1.0); veil = kw.get('veil', 0.0); veil_col = kw.get('veil_col', [1.0, 0.85, 0.65])
def box1(a, r, axis):
    r = max(1, int(r))
    pad = [(0, 0)] * a.ndim; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * r + 1)
def blur(a, sigma):
    if sigma < 0.5: return a
    r = int(round(math.sqrt(12 * sigma * sigma / 3 + 1) / 2))
    for _ in range(3):
        a = box1(a, r, 0); a = box1(a, r, 1)
    return a
im = Image.open(src)
a = np.asarray(im).astype(np.float32)
a = a / (65535.0 if a.max() > 255 else 255.0)
a = a[..., :3] if a.ndim == 3 else np.stack([a] * 3, 2)
h, w, _ = a.shape
if bloom > 0:
    lum = a.mean(axis=2, keepdims=True)
    hi = np.clip((lum - thr) / (1 - thr), 0, 1) * a
    acc = np.zeros_like(a)
    for r, wgt in ((w * 0.003, 0.45), (w * 0.012, 0.35), (w * 0.04, 0.2)):
        acc += blur(hi, r) * wgt
    a = 1 - (1 - a) * (1 - np.clip(acc * bloom * 4, 0, 1))
if veil > 0:
    lum = a.mean(axis=2, keepdims=True)
    big = blur(a * (0.3 + 0.7 * lum), w * 0.06)
    a = 1 - (1 - a) * (1 - np.clip(big * veil * np.array(veil_col, dtype=np.float32), 0, 1))
if ca > 0:
    k = ca / 1000.0
    def rs(ch, s):
        img = Image.fromarray(ch.astype(np.float32), mode='F')
        nw, nh = int(round(w * s)), int(round(h * s))
        img = img.resize((nw, nh), Image.BICUBIC)
        l, t = (nw - w) // 2, (nh - h) // 2
        return np.asarray(img.crop((l, t, l + w, t + h)))
    a = np.stack([rs(a[..., 0], 1 + k), a[..., 1], rs(a[..., 2], 1 - k)], axis=2)
if sat != 1.0:
    l = a.mean(axis=2, keepdims=True); a = l + (a - l) * sat
if gamma != 1.0:
    a = np.clip(a, 0, 1) ** gamma
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
topdark = kw.get('topdark', 0.0)
if topdark > 0:
    t0 = kw.get('topdark_from', 0.5)
    g = np.clip((t0 - yy / h) / t0, 0, 1) ** 1.3
    a = a * (1 - topdark * g[..., None])
rr = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / math.sqrt(2)
a = a * (1 - vignette * rr[..., None] ** 2.0)
a = a * np.array(warm, dtype=np.float32)
if lift: a = a + lift * (1 - a)
if grain > 0:
    rng = np.random.default_rng(int(kw.get('seed', 7)))
    g = rng.normal(0, 1, (h, w)).astype(np.float32)
    g = 0.6 * g + 0.4 * blur(g, 0.8)
    g = g / (g.std() + 1e-6)
    lum = a.mean(axis=2, keepdims=True)
    a = a + g[..., None] * grain * (0.3 + 0.7 * np.sqrt(np.clip(lum, 0, 1)))
Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst)
print('post ok', dst)
