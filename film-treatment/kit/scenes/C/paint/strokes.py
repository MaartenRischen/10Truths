# Direction C — painterly stroke engine. Coarse-to-fine layers of oriented, textured brush dabs sampled from a
# source image; orientation from the structure tensor (strokes follow edges) or from normals; optional impasto
# (a height map accumulated from the strokes, lit afterwards). Per-era parameter sets live with the scene scripts.
import numpy as np, cv2
from cutil import blur, smoothstep, fbm, vnoise, rng, luma

_BANK = {}


def make_brush(kind, L=96, Wd=32, seed=0):
    """canonical brush stamp alpha (h=Wd, w=L), long axis along x, plus height texture."""
    R = rng(seed)
    y, x = np.mgrid[0:Wd, 0:L].astype(np.float32)
    u = x / (L - 1); v = (y / (Wd - 1)) * 2 - 1
    if kind == 'flat':      # bristle flat brush
        bristle = np.repeat(R.random((Wd, 1)).astype(np.float32), L, 1)
        bristle = cv2.GaussianBlur(bristle, (1, 3), 0.8)
        edge = 1 - smoothstep(0.75, 1.0, np.abs(v) + 0.06 * np.sin(u * 17 + R.uniform(0, 6)))
        start = smoothstep(0.0, 0.12 + 0.05 * np.abs(v), u)
        dry = smoothstep(0.35, 0.95, u) * (1 - bristle) * 1.2
        end = 1 - smoothstep(0.78 + 0.18 * bristle, 1.0, u)
        a = edge * start * end * np.clip(1 - dry * 0.8, 0, 1) * (0.75 + 0.25 * bristle)
        hgt = a * (0.6 + 0.4 * bristle) * (1 + 0.6 * np.exp(-((u - 0.9) / 0.08) ** 2))  # paint ridge at the end
    elif kind == 'round':   # soft round dab, slightly elongated
        r = np.sqrt(((u - 0.5) * 2) ** 2 + v ** 2)
        a = 1 - smoothstep(0.7, 1.0, r + 0.08 * np.sin(np.arctan2(v, u - 0.5) * 5 + R.uniform(0, 6)))
        t = R.random((Wd, L)).astype(np.float32)
        t = cv2.GaussianBlur(t, (0, 0), 1.2)
        a = a * (0.8 + 0.4 * (t - 0.5))
        hgt = a * (1 - r * 0.5)
    elif kind == 'knife':   # palette knife: flat, sharp-edged slab with scrape streaks
        edge = 1 - smoothstep(0.85, 1.0, np.abs(v))
        start = smoothstep(0.0, 0.05, u); end = 1 - smoothstep(0.9, 1.0, u + 0.1 * v)
        streak = np.repeat(R.random((Wd, 1)).astype(np.float32), L, 1)
        a = edge * start * end * (0.85 + 0.15 * streak)
        hgt = a * (0.3 + 0.7 * u) * (0.8 + 0.2 * streak)
    elif kind == 'dry':     # scumble: broken, textured
        t = R.random((Wd, L)).astype(np.float32)
        t = cv2.GaussianBlur(t, (0, 0), 1.0)
        t = (t - t.mean()) / t.std()
        edge = 1 - smoothstep(0.6, 1.0, np.abs(v))
        env = smoothstep(0.0, 0.2, u) * (1 - smoothstep(0.7, 1.0, u))
        a = edge * env * smoothstep(-0.6, 0.6, t)
        hgt = a * 0.5
    else:
        raise ValueError(kind)
    return np.clip(a, 0, 1).astype(np.float32), np.clip(hgt, 0, None).astype(np.float32)


def get_bank(kind, n_ang=36, seed=0):
    key = (kind, n_ang, seed)
    if key in _BANK:
        return _BANK[key]
    vars_ = []
    for vi in range(4):
        a, h = make_brush(kind, seed=seed * 10 + vi)
        vars_.append((a, h))
    _BANK[key] = vars_
    return vars_


_STAMP_CACHE = {}


def stamp(kind, var, ang_i, n_ang, length, width):
    """rotated+scaled stamp (alpha, height). Quantised for caching."""
    lq = max(3, int(round(length / 2)) * 2); wq = max(2, int(round(width)))
    key = (kind, var, ang_i, n_ang, lq, wq)
    s = _STAMP_CACHE.get(key)
    if s is not None:
        return s
    a0, h0 = get_bank(kind)[var]
    a = cv2.resize(a0, (lq, wq), interpolation=cv2.INTER_AREA)
    h = cv2.resize(h0, (lq, wq), interpolation=cv2.INTER_AREA)
    ang = ang_i * 360.0 / n_ang
    D = int(np.ceil(np.hypot(lq, wq))) + 2
    M = cv2.getRotationMatrix2D((lq / 2, wq / 2), ang, 1.0)
    M[0, 2] += D / 2 - lq / 2; M[1, 2] += D / 2 - wq / 2
    ar = cv2.warpAffine(a, M, (D, D), flags=cv2.INTER_LINEAR)
    hr = cv2.warpAffine(h, M, (D, D), flags=cv2.INTER_LINEAR)
    s = (ar, hr)
    if len(_STAMP_CACHE) < 60000:
        _STAMP_CACHE[key] = s
    return s


def orientation_field(img, sigma=3.0, rho=8.0):
    """structure-tensor edge tangent angle (radians) and coherence"""
    L = luma(img) if img.ndim == 3 else img
    L = blur(L.astype(np.float32), sigma)
    gx = cv2.Sobel(L, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(L, cv2.CV_32F, 0, 1, ksize=3)
    Jxx, Jyy, Jxy = blur(gx * gx, rho), blur(gy * gy, rho), blur(gx * gy, rho)
    ang = 0.5 * np.arctan2(2 * Jxy, Jxx - Jyy) + np.pi / 2  # tangent = perpendicular to gradient
    tr = Jxx + Jyy; det = Jxx * Jyy - Jxy * Jxy
    disc = np.sqrt(np.clip(tr * tr / 4 - det, 0, None))
    l1, l2 = tr / 2 + disc, tr / 2 - disc
    coh = ((l1 - l2) / (l1 + l2 + 1e-6)) ** 2
    return ang.astype(np.float32), coh.astype(np.float32)


def paint(src, layers, canvas=None, angle=None, coh=None, region=None, seed=0, impasto=None, fixed_angle=None,
          jitter_ang=0.25, color_jitter=0.03, value_jitter=0.03, mask=None):
    """src: (H,W,3) float 0..1 reference. layers: list of dicts
         {r: brush width px, len: length/width ratio, grid: spacing factor, thresh: error threshold (0 = paint all),
          alpha: opacity, kind: 'flat'|'round'|'knife'|'dry', blur: ref blur factor, clip_region: bool}
    region: optional (H,W) int map; strokes are clipped to the region of their centre (keeps edges crisp).
    mask: optional (H,W) float; only paint where mask>0.5. Returns canvas (and height map if impasto)."""
    H, W = src.shape[:2]
    R = rng(seed)
    cv_ = src.copy() if canvas is None else canvas.copy()
    hmap = np.zeros((H, W), np.float32)
    if angle is None and fixed_angle is None:
        angle, coh = orientation_field(src)
    n_ang = 36
    for li, Ld in enumerate(layers):
        r = Ld['r']; ratio = Ld.get('len', 3.0); alpha = Ld.get('alpha', 0.9); kind = Ld.get('kind', 'flat')
        ref = blur(src, max(0.0, r * Ld.get('blur', 0.5)))
        g = max(1.0, r * Ld.get('grid', 0.8))
        ys = np.arange(g / 2, H, g); xs = np.arange(g / 2, W, g)
        gy, gx = np.meshgrid(ys, xs, indexing='ij')
        gy = (gy + R.uniform(-0.5, 0.5, gy.shape) * g).clip(0, H - 1).astype(int)
        gx = (gx + R.uniform(-0.5, 0.5, gx.shape) * g).clip(0, W - 1).astype(int)
        pts = np.stack([gy.ravel(), gx.ravel()], 1)
        thresh = Ld.get('thresh', 0.0)
        if thresh > 0:
            diff = np.abs(cv_ - ref).sum(-1)
            diff = blur(diff, g / 2)
            keep = diff[pts[:, 0], pts[:, 1]] > thresh
            pts = pts[keep]
        if mask is not None:
            pts = pts[mask[pts[:, 0], pts[:, 1]] > 0.5]
        lm = Ld.get('mask')
        if lm is not None:
            pts = pts[lm[pts[:, 0], pts[:, 1]] > 0.5]
        R.shuffle(pts)
        rscale = Ld.get('rscale')  # optional (H,W) multiplier map for brush size (e.g. from depth)
        for (py, px) in pts:
            rr = r * (rscale[py, px] if rscale is not None else 1.0) * R.uniform(0.8, 1.2)
            if rr < 1.0:
                rr = 1.0
            if fixed_angle is not None:
                a = fixed_angle + R.normal(0, jitter_ang)
            else:
                a = angle[py, px] + R.normal(0, jitter_ang * (1.5 - (coh[py, px] if coh is not None else 0.5)))
            ai = int(round((-np.degrees(a)) % 360 / (360.0 / n_ang))) % n_ang
            length = rr * ratio * R.uniform(0.75, 1.25)
            sa, sh = stamp(kind, int(R.integers(0, 4)), ai, n_ang, length, rr)
            D = sa.shape[0]
            y0, x0 = py - D // 2, px - D // 2
            y1, x1 = y0 + D, x0 + D
            cy0, cx0, cy1, cx1 = max(0, y0), max(0, x0), min(H, y1), min(W, x1)
            if cy1 <= cy0 or cx1 <= cx0:
                continue
            A = sa[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0] * alpha
            if region is not None and Ld.get('clip_region', True):
                A = A * (region[cy0:cy1, cx0:cx1] == region[py, px])
            c = ref[py, px].copy()
            c = c * (1 + R.normal(0, value_jitter)) + R.normal(0, color_jitter, 3)
            patch = cv_[cy0:cy1, cx0:cx1]
            patch += (c[None, None, :] - patch) * A[..., None]
            if impasto is not None:
                hp = hmap[cy0:cy1, cx0:cx1]
                hs = sh[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0] * (rr / 10.0) ** 0.5
                hmap[cy0:cy1, cx0:cx1] = hp * (1 - A * 0.7) + hs * alpha
    if impasto is not None:
        return cv_, hmap
    return cv_


def light_impasto(img, hmap, strength=1.0, light=(-0.6, -0.7, 0.9), spec=0.25, shininess=18):
    gy, gx = np.gradient(blur(hmap, 0.8))
    nx, ny, nz = -gx * strength, -gy * strength, np.ones_like(hmap)
    nl = np.sqrt(nx * nx + ny * ny + nz * nz); nx /= nl; ny /= nl; nz /= nl
    L = np.array(light, np.float32); L /= np.linalg.norm(L)
    d = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    d0 = L[2]
    shade = 1 + (d - d0) * 1.2
    hx, hy, hz = L[0], L[1], L[2] + 1
    hl = np.sqrt(hx * hx + hy * hy + hz * hz)
    s = np.clip((nx * hx + ny * hy + nz * hz) / hl, 0, 1) ** shininess
    s = s - np.percentile(s, 50)
    out = img * shade[..., None] + np.clip(s, 0, None)[..., None] * spec
    return np.clip(out, 0, 1)


def canvas_texture(H, W, scale=1.0, seed=0, strength=0.06):
    """woven canvas: fine cross-hatch weave + irregularity"""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    p = 3.2 * scale
    wx = np.sin(x * 2 * np.pi / p) * np.sin(y * 2 * np.pi / (p * 2))
    wy = np.sin(y * 2 * np.pi / p) * np.sin(x * 2 * np.pi / (p * 2) + np.pi / 2)
    t = (wx + wy) * 0.5 + 0.35 * fbm(H, W, 6 * scale, 2, seed=seed)
    t = blur(t, 0.5 * scale)
    return 1 + strength * t / (np.abs(t).max() + 1e-6)
