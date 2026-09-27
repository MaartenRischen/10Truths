# Direction C — era 6 look: the new world, painted in the figure's own language. Earth pigments (charcoal, umber,
# red and yellow ochre, cream), limestone grain, finger-dab strokes, dry charcoal contours, and warm painted light.
import numpy as np, cv2, json
from cutil import *
from strokes import paint
from figure import CHARCOAL

STOPS = [(0.0, '#1d1713'), (0.16, '#43291a'), (0.34, '#7d3a21'), (0.5, '#a9552f'), (0.66, '#c98a4c'), (0.82, '#e3c38e'), (1.0, '#f8ebcc')]


def earth_map(L):
    xs = np.array([p for p, _ in STOPS], np.float32)
    cs = np.array([hexrgb(c) for _, c in STOPS], np.float32)
    out = np.stack([np.interp(L, xs, cs[:, k]) for k in range(3)], -1)
    return out.astype(np.float32)


def rock_grain(H, W, s, seed=0):
    g = fbm(H, W, 40 * s, 3, seed=seed) * 0.5 + fbm(H, W, 9 * s, 3, seed=seed + 1) * 0.35 + fbm(H, W, 2.2 * s, 2, seed=seed + 2) * 0.15
    gy, gx = np.gradient(blur(g, 0.8))
    k = 1.0 / max(1e-4, np.percentile(np.abs(gx - gy), 95))
    bump = 1 + np.clip((-gx * 0.6 + gy * 0.8) * k, -1, 1) * 0.07
    return g, bump


def edges(wid, dep, thr=0.03):
    e = np.zeros(wid.shape, bool)
    for dy, dx in ((1, 0), (0, 1)):
        b = np.roll(wid, (dy, dx), (0, 1)); zb = np.roll(dep, (dy, dx), (0, 1))
        e |= (wid != b) & (np.abs(dep - zb) > thr * np.minimum(dep, zb) + 0.02)
    return e


def stylize_new(prefix, W, H, seed=6, light_ids=None, sky_top='#7a4e3c', sky_low='#f6e0b0'):
    b = np.load(prefix + '_beauty.npy')[..., :3]
    idp = np.load(prefix + '_w_id.npy')
    wid = np.rint(idp[..., 0]).astype(np.int32); alpha = idp[..., 3]
    dep = np.load(prefix + '_w_depth.npy')[..., 0]
    s = W / 1280
    disp = tonemap(b, exposure=1.5, white_pt=5.0)
    L = luma(disp)
    L = np.clip((L - 0.03) / 0.85, 0, 1) ** 0.78
    col = earth_map(L)
    # keep a memory of the real hue: plants lean to green earth, lights stay warm
    hue = disp / np.maximum(luma(disp)[..., None], 1e-3)
    green = np.clip((hue[..., 1] - hue[..., 0]) * 7.0, 0, 1)[..., None]
    col = col * (1 - 0.6 * green) + (col * np.array([0.66, 0.8, 0.46])) * 0.6 * green
    # sky: dusk painted in earth colours
    yy = np.mgrid[0:H, 0:W][0].astype(np.float32) / H
    st, sl = hexrgb(sky_top), hexrgb(sky_low)
    mid = hexrgb('#d8966a')
    t = np.clip(yy / 0.42, 0, 1)[..., None]
    sky = np.where(t < 0.55, st + (mid - st) * (t / 0.55), mid + (sl - mid) * (np.clip(t - 0.55, 0, None) / 0.45) ** 0.8)
    cl = smoothstep(0.15, 0.6, fbm(H, W, 150 * s, 4, seed=seed + 11)) * smoothstep(0.1, 0.4, yy)[..., None][..., 0]
    sky = sky * (1 - 0.25 * cl[..., None]) + hexrgb('#f3dcae') * 0.25 * cl[..., None]
    sky = sky * (1 + 0.05 * fbm(H, W, 60 * s, 3, seed=seed)[..., None])
    skym = blur((alpha < 0.5).astype(np.float32), 1.0)[..., None]
    col = col * (1 - skym) + sky * skym
    # finger dabs and bristle strokes, following forms
    region = np.where(alpha > 0.5, wid, 0)
    col = paint(col, [
        {'r': 18 * s, 'len': 1.6, 'grid': 1.0, 'alpha': 0.7, 'kind': 'round', 'blur': 0.5, 'clip_region': False},
        {'r': 9 * s, 'len': 2.2, 'grid': 0.9, 'alpha': 0.75, 'kind': 'flat', 'blur': 0.3, 'thresh': 0.035},
        {'r': 4.5 * s, 'len': 2.0, 'grid': 0.9, 'alpha': 0.8, 'kind': 'round', 'blur': 0.15, 'thresh': 0.05},
    ], region=region, seed=seed, jitter_ang=0.3, color_jitter=0.018, value_jitter=0.04)
    # the rock underneath everything (same grain family as the figure)
    g, bump = rock_grain(H, W, s, seed + 3)
    col = col * bump[..., None] * (1 + 0.05 * g[..., None])
    pits = smoothstep(0.35, 0.8, -fbm(H, W, 2.0 * s, 2, seed=seed + 4))
    col = col * (1 - 0.1 * pits[..., None])
    # dry charcoal contours drawn from the geometry, varying, broken, occasionally doubled
    e = edges(wid, dep) & (alpha > 0.5)
    d = cv2.distanceTransform((~e).astype(np.uint8), cv2.DIST_L2, 5)
    press = np.clip(1 + 0.5 * vnoise(H, W, 30 * s, seed + 5), 0.4, 1.7)
    w0 = 1.5 * s * press
    line = smoothstep(w0 + 0.7, w0 - 0.7, d)
    gaps = smoothstep(-0.6, -0.4, vnoise(H, W, 22 * s, seed + 6))
    dry = 0.4 + 0.6 * smoothstep(-0.5, 0.3, g + 0.4 * fbm(H, W, 1.6 * s, 2, seed=seed + 7))
    line = line * gaps * dry * 0.85
    far = np.clip((dep - 8) / 30, 0, 1)
    line = line * (1 - 0.55 * far)
    col = col * (1 - line[..., None]) + CHARCOAL * line[..., None]
    # painted light: windows, bulbs, tram - warm dabs with a soft bloom
    if light_ids is not None:
        lm = np.isin(wid, light_ids).astype(np.float32)
        lcol = np.array([1.0, 0.86, 0.55])
        col = col * (1 - lm[..., None] * 0.85) + lcol * lm[..., None] * 0.85 * (0.9 + 0.1 * g[..., None])
        glow = blur(lm, 3 * s) * 1.4 + blur(lm, 14 * s) * 0.6 + blur(lm, 50 * s) * 0.3
        col = col + glow[..., None] * np.array([1.0, 0.72, 0.38]) * 0.45
    col = col + grain(H, W, 0.012, seed=seed + 8)[..., None]
    return np.clip(col, 0, 1)
