# Direction C — era 2 look: farming and villages as an earthy fresco / Flemish panel. Fine, dense strokes, thin
# brown contours, aerial perspective, a painted sky, plaster grain and faint craquelure.
import numpy as np, cv2
from cutil import *
from strokes import paint, canvas_texture


def id_edges(wid, depth, thr=0.02):
    e = np.zeros(wid.shape, bool)
    for dy, dx in ((1, 0), (0, 1)):
        a = wid; b = np.roll(wid, (dy, dx), (0, 1))
        za = depth; zb = np.roll(depth, (dy, dx), (0, 1))
        e |= (a != b) & (np.abs(za - zb) > thr * np.minimum(za, zb))
    return e.astype(np.float32)


def stylize_fresco(prefix, W, H, seed=2):
    b = np.load(prefix + '_beauty.npy')
    wid = np.rint(np.load(prefix + '_w_id.npy')[..., 0]).astype(np.int32)
    dep = np.load(prefix + '_w_depth.npy')[..., 0]
    alpha = np.load(prefix + '_w_id.npy')[..., 3]
    img = tonemap(b[..., :3], exposure=1.05, white_pt=3.5)
    s = W / 1280
    # earthy grade: warm, a little desaturated, lifted blacks (matte)
    L = luma(img)[..., None]
    img = L + (img - L) * 0.82
    img = img * np.array([1.05, 0.98, 0.84]) + np.array([0.03, 0.025, 0.015])
    # aerial perspective
    d = np.where(alpha > 0.5, dep, dep.max() if (alpha > 0.5).any() else 100.0)
    hz = np.clip((d - 12) / 70, 0, 1)[..., None] ** 0.8
    img = img * (1 - 0.55 * hz) + np.array([0.66, 0.7, 0.68]) * 0.55 * hz
    # painted sky
    yy = np.mgrid[0:H, 0:W][0].astype(np.float32) / H
    sky = np.stack([0.62 + 0.18 * yy, 0.68 + 0.14 * yy, 0.72 + 0.06 * yy], -1)
    cl = smoothstep(0.1, 0.7, fbm(H, W, 160 * s, 4, seed=seed + 3) + 0.3 * (0.5 - yy))
    sky = sky * (1 - 0.5 * cl[..., None]) + np.array([0.9, 0.86, 0.76]) * 0.5 * cl[..., None]
    skym = blur((alpha < 0.5).astype(np.float32), 1.0)[..., None]
    img = img * (1 - skym) + sky * skym
    img = np.clip(img, 0, 1)
    # strokes: dense, fine, following forms
    region = np.where(alpha > 0.5, wid, 0)
    img = paint(img, [
        {'r': 16 * s, 'len': 2.0, 'grid': 1.0, 'alpha': 0.8, 'kind': 'flat', 'blur': 0.5, 'clip_region': False},
        {'r': 8 * s, 'len': 2.2, 'grid': 0.9, 'alpha': 0.8, 'kind': 'flat', 'blur': 0.35, 'thresh': 0.04},
        {'r': 4.5 * s, 'len': 2.4, 'grid': 0.85, 'alpha': 0.85, 'kind': 'flat', 'blur': 0.25, 'thresh': 0.05},
        {'r': 2.6 * s, 'len': 2.2, 'grid': 0.9, 'alpha': 0.85, 'kind': 'round', 'blur': 0.15, 'thresh': 0.07},
    ], region=region, seed=seed, jitter_ang=0.3, color_jitter=0.02, value_jitter=0.035)
    # thin warm-brown contours on object silhouettes (Flemish clarity)
    e = id_edges(wid, dep) * (alpha > 0.5)
    e = blur(e, 0.6 * s) * 1.4
    img = img * (1 - np.clip(e, 0, 0.55)[..., None]) + np.array([0.22, 0.14, 0.08]) * np.clip(e, 0, 0.55)[..., None]
    # plaster: grain, mottling, faint craquelure
    mott = fbm(H, W, 90 * s, 3, seed=seed + 5)
    img = img * (1 + 0.05 * mott[..., None])
    cr = vnoise(H, W, 40 * s, seed + 6) + 0.3 * vnoise(H, W, 9 * s, seed + 7)
    crack = np.exp(-(cr / 0.012) ** 2) * smoothstep(0.1, 0.6, fbm(H, W, 200 * s, 2, seed=seed + 8))
    img = img * (1 - 0.18 * crack[..., None])
    img = img + grain(H, W, 0.012, seed=seed + 9, size=1.2)[..., None]
    img = img * canvas_texture(H, W, scale=W / 1280 * 0.7, seed=seed, strength=0.03)[..., None]
    return np.clip(img, 0, 1)
