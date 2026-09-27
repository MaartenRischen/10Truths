# Direction C — era 5 look: the screen age. No strokes at all: physically based render, bloom, a clean cool grade.
import numpy as np, json, os
from cutil import *


def cgi_grade(lin, exposure=1.0, bloom_thresh=2.0, bloom_w=(0.3, 0.2, 0.14, 0.1), white_pt=6.0, cool=0.03):
    H, W = lin.shape[:2]
    x = bloom(lin * exposure, thresh=bloom_thresh, weights=bloom_w, scale=W / 1920)
    img = tonemap(x, exposure=1.0, white_pt=white_pt)
    img = img * np.array([1 - cool, 1.0, 1 + cool])
    # gentle S-curve for that product-render punch
    img = np.clip(img, 0, 1)
    img = img + 0.08 * (img - 0.5) * (1 - np.abs(2 * img - 1))
    return np.clip(img, 0, 1)


def ids_named(pre, *prefixes):
    idx = {int(k): v for k, v in json.load(open(pre + '_w.index.json'))['objects'].items()}
    return [k for k, v in idx.items() if v.startswith(prefixes)]


def region(pre, *prefixes):
    wid = np.rint(np.load(pre + '_w_id.npy')[..., 0]).astype(np.int32)
    return np.isin(wid, ids_named(pre, *prefixes)).astype(np.float32)


def fingerprint(H, W, cx, cy, r, seed=5, drag=(0.4, 1.0)):
    """an ochre fingerprint smudge: whorl ridges, a pressed core and a short drag (alpha mask)"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ang = np.arctan2(yy - cy, xx - cx)
    d = np.sqrt((xx - cx) ** 2 + ((yy - cy) / 1.28) ** 2)
    warp = fbm(H, W, r * 0.6, 2, seed=seed) * r * 0.25
    ridges = 0.5 + 0.5 * np.sin((d + warp + 0.12 * r * np.sin(ang * 2)) / (r * 0.12) * 2 * np.pi)
    core = smoothstep(r, r * 0.45, d + warp * 0.6)
    blob = core * (0.45 + 0.55 * ridges)
    dx, dy = drag
    t = ((xx - cx) * dx + (yy - cy) * dy) / (dx * dx + dy * dy) ** 0.5
    n = ((xx - cx) * -dy + (yy - cy) * dx) / (dx * dx + dy * dy) ** 0.5
    smear = np.exp(-(n / (r * 0.7)) ** 2) * smoothstep(0, r * 0.3, t) * (1 - smoothstep(r * 0.6, r * 3.0, t))
    smear *= 0.55 + 0.45 * fbm(H, W, max(1.5, r * 0.15), 2, seed=seed + 1)
    return np.clip(blob * 0.9 + smear * 0.4, 0, 1)


def floor_reflection(lay, floor_mask, u, strength=0.3, fade=0.3, blur_px=2.2, warm=True):
    """mirror the painted figure below its lowest point (a glossy floor reflects the painting, not a 3D body)"""
    a = lay[..., 3]
    rows = np.nonzero(a.max(1) > 0.4)[0]
    if len(rows) == 0:
        return np.zeros_like(lay)
    y0 = rows.max()
    H = lay.shape[0]
    out = np.zeros_like(lay)
    n = min(y0, H - 1 - y0)
    src = lay[y0 - n:y0 + 1][::-1]
    out[y0:y0 + n + 1] = src
    k = np.arange(H, dtype=np.float32) - y0
    fall = np.clip(np.exp(-np.clip(k, 0, None) / (fade * u)), 0, 1) * (k >= 0)
    out[..., 3] *= fall[:, None] * strength * floor_mask
    if blur_px > 0:
        pm = out.copy(); pm[..., :3] *= pm[..., 3:4]
        # smudged: soft, and dragged a little downwards like a warm streak in the polish
        pm = blur(pm, blur_px)
        k = int(max(3, blur_px * 5)) | 1
        kern = np.zeros((k, 1), np.float32); kern[k // 2:, 0] = 1; kern /= kern.sum()
        pm = cv2.filter2D(pm, -1, kern)
        out = pm.copy(); out[..., :3] = np.where(pm[..., 3:4] > 1e-5, pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5), 0)
    if warm:
        out[..., :3] = np.clip(out[..., :3] * np.array([1.12, 0.95, 0.8]), 0, 1)
    return out
