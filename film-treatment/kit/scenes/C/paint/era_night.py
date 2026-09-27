# Direction C — era 4 look: the night city. Flat planes of hard electric light, deep green-black night, crisp
# geometric shadows, very few strokes, a whisper of canvas. (Inspired by American realist night painting; not a copy.)
import numpy as np, cv2, json
from cutil import *
from strokes import paint, canvas_texture


def grade_night(lin, exposure=1.0):
    img = tonemap(lin, exposure=exposure, white_pt=7.0)
    L = luma(img)
    sh = (1 - smoothstep(0.0, 0.35, L))[..., None]
    img = img * (1 - 0.25 * sh) + sh * np.array([0.004, 0.022, 0.018]) * 1.0          # green-black shadows
    img = img * np.array([0.93, 1.0, 0.96])
    hi = smoothstep(0.45, 0.95, L)[..., None]
    img = img + hi * (np.array([1.0, 0.93, 0.66]) - img) * 0.18                           # warm electric highlights
    return np.clip(img, 0, 1)


def flatten(img, wid, levels=5, strength=0.5):
    """simplify to planes: bilateral + per-region value banding (kept soft)"""
    x = img.astype(np.float32)
    for _ in range(3):
        x = cv2.bilateralFilter(x, 9, 0.06, 7)
    L = luma(x)
    Lq = np.round(L * levels) / levels
    Lq = blur(Lq, 1.2)
    k = np.where(L > 1e-4, (L + (Lq - L) * strength) / np.maximum(L, 1e-4), 1)
    x = x * np.clip(k, 0.6, 1.6)[..., None]
    # per-region smoothing that respects region borders; only large regions get simplified
    out = x.copy()
    N = wid.size
    for rid in np.unique(wid):
        m = (wid == rid).astype(np.float32)
        area = m.sum() / N
        if area < 0.004:
            continue
        sg = 1.0 + 3.0 * smoothstep(0.004, 0.08, area)
        bm = blur(m, sg)
        bx = blur(x * m[..., None], sg) / np.maximum(bm, 1e-4)[..., None]
        out = np.where(m[..., None] > 0.5, bx, out)
    return np.clip(out, 0, 1)


def big_regions(wid, frac=0.012):
    N = wid.size
    ids, cnt = np.unique(wid, return_counts=True)
    big = ids[cnt / N > frac]
    return np.isin(wid, big).astype(np.float32)


def stylize_night(prefix, W, H, fig_rgba=None, seed=3, stroke_scale=1.0):
    b = np.load(prefix + '_beauty.npy')[..., :3]
    wid = np.rint(np.load(prefix + '_w_id.npy')[..., 0]).astype(np.int32)
    img = grade_night(b)
    img = flatten(img, wid)
    s = W / 1920.0 * stroke_scale
    # very few, broad strokes; clipped to regions so the geometry stays crisp
    bigm = big_regions(wid)
    img = paint(img, [
        {'r': 24 * s, 'len': 2.6, 'grid': 1.2, 'alpha': 0.5, 'kind': 'flat', 'blur': 0.35, 'thresh': 0.0},
        {'r': 10 * s, 'len': 2.4, 'grid': 1.2, 'alpha': 0.3, 'kind': 'flat', 'blur': 0.25, 'thresh': 0.04},
    ], region=wid, seed=seed, jitter_ang=0.15, color_jitter=0.01, value_jitter=0.03, mask=bigm)
    img = img * canvas_texture(H, W, scale=W / 1280, seed=seed, strength=0.05)[..., None]
    img = img + grain(H, W, 0.008, seed=seed + 1)[..., None]
    return np.clip(img, 0, 1)


def plane_angles(prefix, wid):
    """stroke direction that follows the planes: along perspective 'horizontal courses' on vertical surfaces
    (perpendicular to the screen gradient of world height), parallel to the facades on horizontal ones."""
    P = np.load(prefix + '_w_position.npy')[..., :3]
    a = np.load(prefix + '_w_id.npy')[..., 3] > 0.5
    Pz, Px, Py = blur(P[..., 2], 1.0), blur(P[..., 0], 1.0), blur(P[..., 1], 1.0)
    gzy, gzx = np.gradient(Pz); gxy, gxx = np.gradient(Px); gyy, gyx = np.gradient(Py)
    mz = np.hypot(gzx, gzy); mh = np.hypot(gxx, gxy) + np.hypot(gyx, gyy) + 1e-6
    vertical = mz > 0.25 * mh
    # facade B side (x > 0 region, beyond the corner) uses x-gradient, facade A side uses y-gradient
    useB = (P[..., 0] > 0.3) & (P[..., 1] > -P[..., 0])
    gx_ = np.where(vertical, gzx, np.where(useB, gxx, gyx))
    gy_ = np.where(vertical, gzy, np.where(useB, gxy, gyy))
    ang = np.arctan2(gy_, gx_) + np.pi / 2          # perpendicular to the gradient
    # smooth as a doubled-angle field
    c, s = np.cos(2 * ang), np.sin(2 * ang)
    c, s = blur(c * a, 3.0), blur(s * a, 3.0)
    ang = 0.5 * np.arctan2(s, c)
    ang = np.where(a, ang, 0.0)                     # sky: horizontal
    return ang.astype(np.float32)


def stylize_night2(prefix, W, H, seed=3):
    b = np.load(prefix + '_beauty.npy')[..., :3]
    wid = np.rint(np.load(prefix + '_w_id.npy')[..., 0]).astype(np.int32)
    img = grade_night(b)
    # flatten into planes: strong edge-preserving smoothing + gentle value banding (keeps the light shapes)
    img = flatten(img, wid, levels=5, strength=0.55)
    s = W / 1920.0
    ang = plane_angles(prefix, wid)
    coh = np.ones_like(ang)
    big = big_regions(wid, 0.02); med = big_regions(wid, 0.003)
    img = paint(img, [
        {'r': 30 * s, 'len': 3.2, 'grid': 1.0, 'alpha': 0.75, 'kind': 'flat', 'blur': 0.45, 'thresh': 0.0, 'mask': big},
        {'r': 15 * s, 'len': 3.0, 'grid': 0.9, 'alpha': 0.7, 'kind': 'flat', 'blur': 0.3, 'thresh': 0.03, 'mask': med},
        {'r': 7 * s, 'len': 2.6, 'grid': 0.9, 'alpha': 0.75, 'kind': 'flat', 'blur': 0.2, 'thresh': 0.05},
        {'r': 3.5 * s, 'len': 2.2, 'grid': 0.9, 'alpha': 0.7, 'kind': 'flat', 'blur': 0.1, 'thresh': 0.08, 'mask': 1 - med},
    ], region=wid, angle=ang, coh=coh, seed=seed, jitter_ang=0.08, color_jitter=0.012, value_jitter=0.035)
    # slightly soft edges, then canvas
    img = img * 0.7 + blur(img, 1.1 * max(1.0, s * 1.5)) * 0.3
    img = img * canvas_texture(H, W, scale=W / 1280, seed=seed, strength=0.075)[..., None]
    img = img + grain(H, W, 0.01, seed=seed + 1)[..., None]
    return np.clip(img, 0, 1)
