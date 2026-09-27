# Direction C — era 3 look: industry in heavy impasto. Smoke painted over a sooty sky, gaslight, thick knife and
# bristle strokes with lit paint relief.
import numpy as np, cv2, json
from cutil import *
from strokes import paint, light_impasto, canvas_texture


def stack_tops(prefix):
    idx = {int(k): v for k, v in json.load(open(prefix + '_w.index.json'))['objects'].items()}
    wid = np.rint(np.load(prefix + '_w_id.npy')[..., 0]).astype(np.int32)
    tops = []
    for k, v in idx.items():
        if v.startswith('stack') and not v.startswith('stacktop'):
            ys, xs = np.nonzero(wid == k)
            if len(ys) > 20:
                y0 = ys.min(); tops.append((float(xs[ys < y0 + 3].mean()), float(y0), float(xs.max() - xs.min())))
    return tops


def smoke_layer(H, W, tops, seed=0):
    s = W / 1280
    dens = np.zeros((H, W), np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    warp = fbm(H, W, 60 * s, 3, seed=seed) * 40 * s
    for i, (x, y, w) in enumerate(tops):
        # plume rises and drifts right, widening
        t = np.clip((y - yy) / (y + 1e-3), 0, 1)       # 0 at the stack top, 1 at the frame top
        cx = x + t * (180 + 60 * i) * s + warp
        wid = (w * 0.6 + t * 260 * s)
        plume = np.exp(-((xx - cx) / np.maximum(wid, 1)) ** 2) * (yy < y + 4) * (1 - t * 0.35)
        dens = np.maximum(dens, plume)
    bill = smoothstep(-0.2, 0.7, fbm(H, W, 45 * s, 4, seed=seed + 2) + 0.3)
    dens = np.clip(dens * (0.6 + 0.6 * bill), 0, 1)
    haze = smoothstep(0.75, 0.0, yy / H) * 0.25
    return np.clip(np.maximum(dens, haze * (0.7 + 0.3 * bill)), 0, 1), bill


def stylize_impasto(prefix, W, H, seed=4):
    b = np.load(prefix + '_beauty.npy')[..., :3]
    wid = np.rint(np.load(prefix + '_w_id.npy')[..., 0]).astype(np.int32)
    alpha = np.load(prefix + '_w_id.npy')[..., 3]
    s = W / 1280
    img = tonemap(b, exposure=1.35, white_pt=5.0)
    # sooty grade: brown shadows, amber gaslight
    L = luma(img)[..., None]
    img = L + (img - L) * 0.9
    img = img * np.array([1.06, 0.95, 0.8])
    img = img * (0.85 + 0.15 * smoothstep(0.0, 0.5, L))
    # smoke and smog
    tops = stack_tops(prefix)
    dens, bill = smoke_layer(H, W, tops, seed=seed)
    yy = np.mgrid[0:H, 0:W][0].astype(np.float32) / H
    smoke_col = np.stack([0.2 + 0.2 * bill, 0.18 + 0.17 * bill, 0.16 + 0.13 * bill], -1) * (0.85 + 0.3 * (1 - yy))[..., None]
    skym = (alpha < 0.5).astype(np.float32)
    sky = np.stack([0.86 - 0.3 * yy, 0.74 - 0.28 * yy, 0.5 - 0.2 * yy], -1) * (1 + 0.08 * fbm(H, W, 120 * s, 3, seed=seed + 7))[..., None]
    img = img * (1 - skym[..., None]) + sky * skym[..., None]
    occl = np.clip(skym + (1 - skym) * smoothstep(0.55, 0.25, yy) * 0.6, 0, 1)   # smoke behind buildings mostly shows in sky
    a = np.clip(dens * occl, 0, 0.92)[..., None]
    img = img * (1 - a) + smoke_col * a
    # gaslight bloom (warm)
    lin = srgb2lin(np.clip(img, 0, 1))
    bright = np.clip(luma(lin) - 0.35, 0, None)[..., None] * np.array([1.0, 0.7, 0.35])
    img = np.clip(img + lin2srgb(np.clip(blur(bright, 14 * s) * 0.7 + blur(bright, 40 * s) * 0.4, 0, 1)) * 0.45, 0, 1)
    # heavy strokes with paint relief
    img, hmap = paint(img, [
        {'r': 26 * s, 'len': 1.8, 'grid': 0.95, 'alpha': 0.92, 'kind': 'knife', 'blur': 0.6, 'clip_region': False},
        {'r': 14 * s, 'len': 2.2, 'grid': 0.9, 'alpha': 0.9, 'kind': 'flat', 'blur': 0.4, 'thresh': 0.035},
        {'r': 7 * s, 'len': 2.4, 'grid': 0.9, 'alpha': 0.9, 'kind': 'flat', 'blur': 0.25, 'thresh': 0.05},
    ], region=wid, seed=seed, jitter_ang=0.35, color_jitter=0.025, value_jitter=0.05, impasto=True)
    img = light_impasto(img, hmap, strength=2.4, light=(-0.5, -0.8, 0.8), spec=0.22, shininess=14)
    img = img * canvas_texture(H, W, scale=W / 1280, seed=seed, strength=0.035)[..., None]
    img = img * vignette(H, W, 0.35, 2.0)[..., None]
    return np.clip(img, 0, 1)
