# Direction C — shared 2D utilities: noise, IO, compositing (numpy + OpenCV).
import numpy as np, cv2, os, json
from PIL import Image

SCR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
WORK = os.path.join(SCR, 'workC')
OUT = os.path.join(SCR, 'sb', 'opt-C')


def rng(seed):
    return np.random.default_rng(seed)


def vnoise(h, w, cell, seed=0, angle=None):
    """smooth value noise in ~[-1,1]; cell = feature size in px. Rotated lattice to hide axis alignment."""
    r = rng(seed)
    if angle is None:
        angle = r.uniform(0, 180)
    diag = int(np.ceil(np.hypot(h, w))) + 4
    gh = int(diag / cell) + 4
    g = r.standard_normal((gh, gh)).astype(np.float32)
    big = cv2.resize(g, (int(gh * cell), int(gh * cell)), interpolation=cv2.INTER_CUBIC)
    c = big.shape[0] / 2
    M = cv2.getRotationMatrix2D((c, c), angle, 1.0)
    M[0, 2] -= (c - w / 2); M[1, 2] -= (c - h / 2)
    out = cv2.warpAffine(big, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return out * 0.9


def fbm(h, w, cell, octaves=5, gain=0.5, lac=2.0, seed=0):
    tot = np.zeros((h, w), np.float32); amp = 1.0; norm = 0.0; c = cell
    for i in range(octaves):
        if c < 1.2:
            break
        tot += amp * vnoise(h, w, c, seed + 101 * i)
        norm += amp; amp *= gain; c /= lac
    return tot / max(norm, 1e-6)


def ridged(h, w, cell, octaves=4, seed=0):
    tot = np.zeros((h, w), np.float32); amp = 1.0; norm = 0; c = cell
    for i in range(octaves):
        if c < 1.2:
            break
        n = 1.0 - np.abs(vnoise(h, w, c, seed + 77 * i))
        tot += amp * n * n; norm += amp; amp *= 0.5; c /= 2
    return tot / norm


def white(h, w, seed=0):
    return rng(seed).random((h, w), dtype=np.float32)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def blur(x, sigma):
    if sigma <= 0:
        return x
    k = int(sigma * 3) * 2 + 1
    return cv2.GaussianBlur(x, (k, k), sigma, borderType=cv2.BORDER_REFLECT)


def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def lerp(a, b, t):
    return a + (b - a) * t


def over(dst_rgb, src_rgba):
    a = src_rgba[..., 3:4]
    return dst_rgb * (1 - a) + src_rgba[..., :3] * a


def save(path, rgb, quality_note=None):
    a = np.clip(rgb, 0, 1)
    if a.ndim == 3 and a.shape[2] == 4:
        im = Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGBA')
    else:
        im = Image.fromarray((a[..., :3] * 255 + 0.5).astype(np.uint8), 'RGB')
    im.save(path, optimize=False, compress_level=6)


def load_rgb(path):
    return np.asarray(Image.open(path).convert('RGB'), np.float32) / 255


def resize(img, w, h, interp=None):
    if interp is None:
        interp = cv2.INTER_AREA if img.shape[1] > w else cv2.INTER_CUBIC
    return cv2.resize(img, (w, h), interpolation=interp)


def lin2srgb(x):
    x = np.clip(x, 0, None)
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def srgb2lin(x):
    return np.where(x <= 0.04045, x / 12.92, np.power((x + 0.055) / 1.055, 2.4))


def tonemap(lin, exposure=1.0, contrast=1.0, white_pt=6.0):
    """filmic-ish (Hable-like) curve on linear HDR -> display sRGB 0..1"""
    x = lin * exposure
    A, B, C, D, E, F = 0.22, 0.30, 0.10, 0.20, 0.01, 0.30
    def f(v):
        return ((v * (A * v + C * B) + D * E) / (v * (A * v + B) + D * F)) - E / F
    y = f(x) / f(np.float32(white_pt))
    y = np.clip(y, 0, 1)
    s = lin2srgb(y)
    if contrast != 1.0:
        s = np.clip(0.5 + (s - 0.5) * contrast, 0, 1)
    return s


def luma(rgb):
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def grain(h, w, amt=0.02, seed=0, size=1.0):
    n = rng(seed).standard_normal((int(h / size) + 1, int(w / size) + 1)).astype(np.float32)
    if size != 1.0:
        n = cv2.resize(n, (w, h), interpolation=cv2.INTER_LINEAR)
    return n[:h, :w] * amt


def vignette(h, w, strength=0.35, power=2.2, cx=0.5, cy=0.5):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (x / w - cx) * (w / h); dy = (y / h - cy)
    r = np.sqrt(dx * dx + dy * dy) / np.sqrt((0.5 * w / h) ** 2 + 0.25)
    return 1 - strength * np.power(np.clip(r, 0, 1.5), power)


def load_meta(prefix):
    p = prefix + '.meta.json'
    return json.load(open(p)) if os.path.exists(p) else {}


def bloom(rgb_lin, thresh=1.0, sigmas=(4, 12, 32, 80), weights=(0.4, 0.3, 0.2, 0.15), scale=1.0):
    br = np.clip(rgb_lin - thresh, 0, None)
    h, w = br.shape[:2]
    out = np.zeros_like(rgb_lin)
    for s, wt in zip(sigmas, weights):
        s = s * scale
        f = max(1, int(s / 4))
        small = cv2.resize(br, (max(1, w // f), max(1, h // f)), interpolation=cv2.INTER_AREA)
        small = blur(small, s / f)
        out += wt * cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
    return rgb_lin + out
