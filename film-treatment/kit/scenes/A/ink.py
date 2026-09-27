"""Direction A ink engine: one continuous line on warm black paper.

Coordinates for paths are in OUTPUT pixels (1x). Rendering happens at SS x
supersampling. A stroke is a polyline with per-point width (px, 1x), temp
(0 bone .. 1 ember), dens (ink density), and draw time t (0..1 or any order).
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BONE = np.array([0xef, 0xe6, 0xd6], np.float32) / 255.0
EMBER = np.array([0xff, 0x5a, 0x1f], np.float32) / 255.0
EMBER_HOT = np.array([0xff, 0xc4, 0x96], np.float32) / 255.0
PAPER = np.array([0x0f, 0x0d, 0x0b], np.float32) / 255.0


def srgb_to_lin(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


# ----------------------------------------------------------------- noise utils
class Noise1D:
    """Smooth 1D value noise over arc length."""

    def __init__(self, seed, n=4096):
        r = np.random.RandomState(seed)
        self.v = r.uniform(-1, 1, n).astype(np.float32)
        self.n = n

    def __call__(self, x):
        x = np.asarray(x, np.float64)
        i = np.floor(x).astype(np.int64)
        f = x - i
        a = self.v[i % self.n]
        b = self.v[(i + 1) % self.n]
        s = f * f * (3 - 2 * f)
        return a + (b - a) * s


def fbm1(seed, s, scales=((60.0, 1.0), (17.0, 0.35), (5.0, 0.12))):
    out = np.zeros_like(np.asarray(s, np.float64))
    for k, (lam, amp) in enumerate(scales):
        out += Noise1D(seed * 31 + k)(np.asarray(s) / lam + 17.3 * k) * amp
    return out


# ----------------------------------------------------------------- path utils
def arclen(P):
    d = np.sqrt(((P[1:] - P[:-1]) ** 2).sum(1))
    return np.concatenate([[0], np.cumsum(d)])


def resample(P, step=1.0, attrs=None):
    """Uniformly resample polyline P (N,2) by arc length. attrs: dict of (N,) arrays."""
    P = np.asarray(P, np.float64)
    if len(P) < 2:
        return P.copy(), ({k: np.asarray(v, np.float64).copy() for k, v in attrs.items()} if attrs else {})
    s = arclen(P)
    L = s[-1]
    n = max(2, int(np.ceil(L / step)) + 1)
    si = np.linspace(0, L, n)
    Q = np.stack([np.interp(si, s, P[:, 0]), np.interp(si, s, P[:, 1])], 1)
    out = {}
    if attrs:
        for k, v in attrs.items():
            out[k] = np.interp(si, s, np.asarray(v, np.float64))
    return Q, out


def smooth_path(P, sigma, closed=False, keep_ends=True):
    if sigma <= 0 or len(P) < 5:
        return P
    mode = 'wrap' if closed else 'nearest'
    Q = np.stack([ndi.gaussian_filter1d(P[:, 0], sigma, mode=mode), ndi.gaussian_filter1d(P[:, 1], sigma, mode=mode)], 1)
    if keep_ends and not closed:
        # blend back to exact ends over ~2 sigma so junctions stay put
        n = len(P)
        k = min(n // 2, int(3 * sigma) + 1)
        w = np.ones(n)
        ramp = np.linspace(0, 1, k)
        w[:k] = ramp
        w[-k:] = np.minimum(w[-k:], ramp[::-1])
        Q = P * (1 - w[:, None]) + Q * w[:, None]
    return Q


def curvature(P, h=4):
    """Unsigned curvature (1/px) of a uniformly sampled path (spacing ~1px)."""
    n = len(P)
    if n < 2 * h + 1:
        return np.zeros(n)
    i = np.arange(n)
    a = P[np.clip(i - h, 0, n - 1)]
    b = P
    c = P[np.clip(i + h, 0, n - 1)]
    v1 = b - a
    v2 = c - b
    n1 = np.linalg.norm(v1, axis=1) + 1e-9
    n2 = np.linalg.norm(v2, axis=1) + 1e-9
    cos = np.clip((v1 * v2).sum(1) / (n1 * n2), -1, 1)
    ang = np.arccos(cos)
    return ang / (0.5 * (n1 + n2))


def normals(P):
    d = np.gradient(P, axis=0)
    n = np.stack([-d[:, 1], d[:, 0]], 1)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-9)


# ----------------------------------------------------------------- stroke
class Stroke:
    def __init__(self, P, w, temp=0.0, dens=1.0, t=None, kind='ink'):
        self.P = np.asarray(P, np.float64)
        n = len(self.P)
        self.w = np.broadcast_to(np.asarray(w, np.float64), (n,)).copy()
        self.temp = np.broadcast_to(np.asarray(temp, np.float64), (n,)).copy()
        self.dens = np.broadcast_to(np.asarray(dens, np.float64), (n,)).copy()
        self.t = np.linspace(0, 1, n) if t is None else np.broadcast_to(np.asarray(t, np.float64), (n,)).copy()
        self.kind = kind


def pen(P, wmin=2.5, wmax=6.0, k0=1 / 22.0, seed=1, wobble=0.55, taper_in=10, taper_out=16,
        temp=0.0, dens=1.0, closed=False, step=0.75, tremor=0.12, press=None, smooth=0.0, wvar=0.12,
        start_w=0.45, end_w=0.3):
    """Turn a polyline into an ink Stroke with pen-pressure width & hand wobble.
    Width thickens on curves (curvature ~ k0 gives full weight) and thins on straights."""
    P = np.asarray(P, np.float64)
    if closed:
        P = np.vstack([P, P[:1]])
    extra = {}
    if np.ndim(temp) > 0:
        extra['temp'] = temp
    if np.ndim(dens) > 0:
        extra['dens'] = dens
    if press is not None:
        extra['press'] = press
    Q, at = resample(P, step, extra if extra else None)
    if smooth > 0:
        Q = smooth_path(Q, smooth / step, closed=False)
    s = arclen(Q)
    L = s[-1] + 1e-9
    kap = curvature(Q, h=max(2, int(round(4 / step))))
    kap = ndi.gaussian_filter1d(kap, 5 / step, mode='nearest')
    f = np.clip(kap / k0, 0, 1) ** 0.75
    w = wmin + (wmax - wmin) * f
    w *= 1 + wvar * fbm1(seed + 5, s, ((45.0, 1.0), (13.0, 0.4)))
    w = ndi.gaussian_filter1d(w, 3 / step, mode='nearest')
    if 'press' in at:
        w *= at['press']
    # taper
    if taper_in > 0:
        a = np.clip(s / taper_in, 0, 1)
        w *= start_w + (1 - start_w) * (a * a * (3 - 2 * a))
    if taper_out > 0:
        b = np.clip((L - s) / taper_out, 0, 1)
        w *= end_w + (1 - end_w) * (b * (2 - b))
    # wobble along the normal
    if wobble > 0 or tremor > 0:
        nrm = normals(Q)
        dsp = wobble * fbm1(seed, s, ((70.0, 1.0), (23.0, 0.45))) + tremor * Noise1D(seed + 99)(s / 2.2)
        Q = Q + nrm * dsp[:, None]
    tt = at.get('temp', temp)
    dd = at.get('dens', dens)
    return Stroke(Q, w, temp=tt, dens=dd, t=s / L)


def ruled(P, w=1.6, temp=0.0, dens=1.0, step=0.75):
    """Mechanical ruler/technical-pen line: constant width, no wobble."""
    Q, _ = resample(np.asarray(P, np.float64), step)
    s = arclen(Q)
    return Stroke(Q, np.full(len(Q), w), temp=temp, dens=dens, t=s / (s[-1] + 1e-9), kind='ruled')


# ----------------------------------------------------------------- raster
class Canvas:
    def __init__(self, W, H, ss=2, seed=7):
        self.W, self.H, self.ss = W, H, ss
        self.Ws, self.Hs = W * ss, H * ss
        self.D = np.full((self.Hs, self.Ws), -50.0, np.float32)
        self.temp = np.zeros((self.Hs, self.Ws), np.float32)
        self.dens = np.ones((self.Hs, self.Ws), np.float32)
        self.kind = np.zeros((self.Hs, self.Ws), np.uint8)
        self.seed = seed
        self.beads = []
        self.glows = []  # extra soft light sources (x,y,radius,strength,color)
        self.pending = []  # stamps awaiting attribute pass
        import os
        rp = os.environ.get('INK_RECORD')
        self.rec = {'W': W, 'H': H, 'strokes': [], 'dots': [], 'beads': []} if rp else None
        self.rec_path = rp
        self.rec_only = bool(rp)

    def stamps_of(self, st, t0=-1e9, t1=1e9):
        ss = self.ss
        m = (st.t >= t0) & (st.t <= t1)
        if m.sum() == 0:
            return None
        P = st.P[m] * ss
        r = np.maximum(st.w[m] * 0.5 * ss, 0.35)
        # densify so spacing <= 0.3 r
        seg = np.sqrt(((P[1:] - P[:-1]) ** 2).sum(1)) if len(P) > 1 else np.zeros(0)
        if len(P) > 1:
            rr = 0.5 * (r[1:] + r[:-1])
            nsub = np.maximum(1, np.ceil(seg / np.maximum(0.3 * rr, 0.25))).astype(int)
            idx = np.repeat(np.arange(len(P) - 1), nsub)
            frac = np.concatenate([np.arange(k) / k for k in nsub])
            Px = P[idx] + (P[idx + 1] - P[idx]) * frac[:, None]
            rx = r[idx] + (r[idx + 1] - r[idx]) * frac
            tx = st.temp[m][idx] + (st.temp[m][idx + 1] - st.temp[m][idx]) * frac
            dx = st.dens[m][idx] + (st.dens[m][idx + 1] - st.dens[m][idx]) * frac
            Px = np.vstack([Px, P[-1:]])
            rx = np.concatenate([rx, r[-1:]])
            tx = np.concatenate([tx, st.temp[m][-1:]])
            dx = np.concatenate([dx, st.dens[m][-1:]])
        else:
            Px, rx, tx, dx = P, r, st.temp[m], st.dens[m]
        kd = 2 if st.kind == 'ruled' else 1
        return Px, rx, tx, dx, np.full(len(rx), kd, np.uint8)

    def add(self, strokes, t0=-1e9, t1=1e9):
        if isinstance(strokes, Stroke):
            strokes = [strokes]
        if getattr(self, 'rec', None) is not None:
            for st in strokes:
                self.rec['strokes'].append((st.P.copy(), st.w.copy(), st.temp.copy(), st.dens.copy(), st.kind))
            if self.rec_only:
                return
        allP, allr, allt, alld, allk = [], [], [], [], []
        for st in strokes:
            o = self.stamps_of(st, t0, t1)
            if o is None:
                continue
            allP.append(o[0]); allr.append(o[1]); allt.append(o[2]); alld.append(o[3]); allk.append(o[4])
        if not allP:
            return
        P = np.vstack(allP); r = np.concatenate(allr); tp = np.concatenate(allt)
        dn = np.concatenate(alld); kd = np.concatenate(allk)
        self._stamp(P, r, tp, dn, kd, _rec=False)

    def _stamp(self, P, r, tp, dn, kd, _rec=True):
        if _rec and getattr(self, 'rec', None) is not None and len(P) and not getattr(self, '_in_add', False):
            self.rec['dots'].append((P / self.ss, r / self.ss, tp, dn))
            if self.rec_only:
                return
        Hs, Ws = self.Hs, self.Ws
        K = np.ceil(r + 1.5).astype(int)
        for k in np.unique(K):
            sel = np.where(K == k)[0]
            dy, dx = np.mgrid[-k:k + 1, -k:k + 1]
            for c0 in range(0, len(sel), max(1, 400000 // ((2 * k + 1) ** 2))):
                s = sel[c0:c0 + max(1, 400000 // ((2 * k + 1) ** 2))]
                cx = np.floor(P[s, 0]).astype(np.int64)
                cy = np.floor(P[s, 1]).astype(np.int64)
                px = cx[:, None, None] + dx[None]
                py = cy[:, None, None] + dy[None]
                dist = np.sqrt((px + 0.5 - P[s, 0][:, None, None]) ** 2 + (py + 0.5 - P[s, 1][:, None, None]) ** 2)
                v = (r[s][:, None, None] - dist).astype(np.float32)
                ok = (px >= 0) & (px < Ws) & (py >= 0) & (py < Hs) & (v > -1.0)
                pyv, pxv, vv = py[ok], px[ok], v[ok]
                np.maximum.at(self.D, (pyv, pxv), vv)
                # attribute pass (winner takes attributes)
                win = vv >= self.D[pyv, pxv] - 1e-4
                ii = np.broadcast_to(np.arange(len(s))[:, None, None], v.shape)[ok][win]
                self.temp[pyv[win], pxv[win]] = tp[s][ii]
                self.dens[pyv[win], pxv[win]] = dn[s][ii]
                self.kind[pyv[win], pxv[win]] = kd[s][ii]

    def bead(self, x, y, r, temp=0.0):
        self.beads.append((x, y, r, temp))
        if getattr(self, 'rec', None) is not None:
            self.rec['beads'].append((x, y, r, temp))

    # ------------------------------------------------------------- shading
    def paper(self, light=None, vignette=0.55, seed=None):
        seed = self.seed if seed is None else seed
        rng = np.random.RandomState(seed)
        Hs, Ws, ss = self.Hs, self.Ws, self.ss
        # tooth: fine + medium + mottling (computed at reduced res for the large scales)
        fine = ndi.gaussian_filter(rng.standard_normal((Hs, Ws)).astype(np.float32), 0.8 * ss / 2)
        fine /= fine.std() + 1e-6
        small = rng.standard_normal((Hs // 4 + 1, Ws // 4 + 1)).astype(np.float32)
        med = ndi.gaussian_filter(small, 1.2)
        med /= med.std() + 1e-6
        mott = ndi.gaussian_filter(small, 18)
        mott /= mott.std() + 1e-6
        med = np.kron(med, np.ones((4, 4), np.float32))[:Hs, :Ws]
        mott = np.kron(mott, np.ones((4, 4), np.float32))[:Hs, :Ws]
        med = ndi.uniform_filter(med, 4)
        mott = ndi.uniform_filter(mott, 8)
        # fibres: anisotropic streaks
        fib = ndi.gaussian_filter(rng.standard_normal((Hs // 2 + 1, Ws // 2 + 1)).astype(np.float32), (0.6, 5.0))
        fib /= fib.std() + 1e-6
        fib = np.kron(fib, np.ones((2, 2), np.float32))[:Hs, :Ws]
        self.tooth = np.clip(0.5 + 0.22 * fine + 0.18 * med + 0.08 * fib, 0, 1)
        yy, xx = np.mgrid[0:Hs, 0:Ws].astype(np.float32)
        cx, cy = Ws / 2, Hs / 2
        rn = np.sqrt(((xx - cx) / (Ws / 2)) ** 2 * 0.8 + ((yy - cy) / (Hs / 2)) ** 2 * 1.0)
        vig = 1 - vignette * np.clip((rn - 0.45) / 0.9, 0, 1) ** 1.6
        base = PAPER[None, None, :] * vig[..., None]
        if light is not None:
            lx, ly, lr, ls = light
            d2 = ((xx - lx * ss) ** 2 + (yy - ly * ss) ** 2) / (lr * ss) ** 2
            base = base * (1 + ls * np.exp(-d2)[..., None])
        lum = (1.2 * fine + 0.9 * med + 0.9 * mott + 0.5 * fib)[..., None] / 255.0
        paper = base + lum * np.array([1.0, 0.92, 0.82], np.float32)[None, None]
        self.paper_rgb = paper.astype(np.float32)
        return self.paper_rgb

    def fill(self, alpha, color=None, strength=0.08, light=None, vignette=0.55):
        """Add a luminous wash to the paper: alpha is a (H,W) float array at 1x (0..1)."""
        if getattr(self, 'rec', None) is not None:
            return
        if not hasattr(self, 'paper_rgb'):
            self.paper(light=light, vignette=vignette)
        a = np.kron(np.asarray(alpha, np.float32), np.ones((self.ss, self.ss), np.float32))
        col = BONE if color is None else np.asarray(color, np.float32)
        self.paper_rgb = self.paper_rgb + (a * strength)[..., None] * col[None, None]

    def render(self, out_path=None, light=None, vignette=0.55, glow=1.0, bone_glow=0.0, grain=1.0, beads=True):
        if getattr(self, 'rec', None) is not None:
            import pickle
            pickle.dump(self.rec, open(self.rec_path, 'wb'))
            print('recorded', self.rec_path, len(self.rec['strokes']), 'strokes')
            return None
        if not hasattr(self, 'paper_rgb'):
            self.paper(light=light, vignette=vignette)
        ss = self.ss
        D = self.D
        cov = np.clip(D + 0.5, 0, 1)
        Dp = np.maximum(D, 0) / ss  # 1x px inside distance
        rim = np.exp(-Dp / 0.55)
        kind = self.kind
        core = np.where(kind == 2, 0.97, 0.86).astype(np.float32)
        a = cov * self.dens * (core + (1 - core) * rim)
        # ink catches paper tooth: drier where density is low
        dry = (0.20 + 0.45 * (1 - np.clip(self.dens, 0, 1))) * grain
        a = a * (1 - dry * np.clip(0.62 - self.tooth, 0, 1) * 1.6)
        a = np.clip(a, 0, 1)
        temp = self.temp
        hot = np.clip((Dp - 0.3) / 1.4, 0, 1) * 0.55
        ember_col = EMBER[None, None] * (1 - hot[..., None]) + EMBER_HOT[None, None] * hot[..., None]
        col = BONE[None, None] * (1 - temp[..., None]) + ember_col * temp[..., None]
        out = self.paper_rgb * (1 - a[..., None]) + col * a[..., None]
        # ember glow (light), screened on
        E = (a * temp).astype(np.float32)
        if glow > 0 and E.max() > 0:
            g = (0.50 * ndi.gaussian_filter(E, 2.5 * ss) + 0.40 * ndi.gaussian_filter(E, 9 * ss) +
                 0.30 * ndi.gaussian_filter(E, 28 * ss)) * glow
            gl = g[..., None] * EMBER[None, None]
            out = 1 - (1 - out) * (1 - np.clip(gl, 0, 1))
        if bone_glow > 0:
            B = (a * (1 - temp)).astype(np.float32)
            g = ndi.gaussian_filter(B, 3 * ss) * bone_glow
            out = 1 - (1 - out) * (1 - np.clip(g[..., None] * BONE[None, None], 0, 1))
        for (gx, gy, gr, gs, gc) in self.glows:
            yy, xx = np.ogrid[0:self.Hs, 0:self.Ws]
            d2 = ((xx - gx * ss) ** 2 + (yy - gy * ss) ** 2) / (gr * ss) ** 2
            gl = np.exp(-d2)[..., None] * gs * np.asarray(gc, np.float32)[None, None]
            out = 1 - (1 - out) * (1 - np.clip(gl, 0, 1))
        if beads:
            for (bx, by, br, bt) in self.beads:
                out = self._draw_bead(out, bx, by, br, bt)
        # downsample
        img = out.reshape(self.H, ss, self.W, ss, 3).mean(axis=(1, 3))
        img = lin_to_srgb(srgb_to_lin(img)) if False else img
        # dither
        rng = np.random.RandomState(self.seed + 3)
        img = img + (rng.random_sample(img.shape) - rng.random_sample(img.shape)).astype(np.float32) / 255.0
        img8 = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
        im = Image.fromarray(img8)
        if out_path:
            im.save(out_path)
        return im

    def _draw_bead(self, out, bx, by, br, bt):
        ss = self.ss
        x, y, r = bx * ss, by * ss, br * ss
        k = int(r * 11 + 10)
        x0, y0 = int(x) - k, int(y) - k
        x1, y1 = int(x) + k, int(y) + k
        X0, Y0 = max(0, x0), max(0, y0)
        X1, Y1 = min(self.Ws, x1), min(self.Hs, y1)
        if X1 <= X0 or Y1 <= Y0:
            return out
        yy, xx = np.mgrid[Y0:Y1, X0:X1].astype(np.float32)
        d = np.sqrt((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2)
        patch = out[Y0:Y1, X0:X1]
        # soft contact shadow / wet halo
        sh = np.exp(-((xx + 0.5 - x - 0.25 * r) ** 2 + (yy + 0.5 - y - 0.35 * r) ** 2) / (1.3 * r) ** 2) * 0.45
        patch = patch * (1 - sh[..., None])
        cov = np.clip(r - d + 0.5, 0, 1)
        h = np.sqrt(np.clip(1 - (d / max(r, 1e-3)) ** 2, 0, 1))
        base = BONE * (1 - bt) + EMBER * bt
        col = base[None, None] * (0.80 + 0.20 * h[..., None])
        # specular highlight up-left
        hx, hy = x - 0.35 * r, y - 0.38 * r
        spec = np.exp(-((xx + 0.5 - hx) ** 2 + (yy + 0.5 - hy) ** 2) / (0.28 * r) ** 2)
        col = col + spec[..., None] * 0.35
        patch = patch * (1 - cov[..., None]) + np.clip(col, 0, 1.2) * cov[..., None]
        if bt > 0:
            gl = np.exp(-(d / (3.5 * r)) ** 2)[..., None] * 0.35 * bt * EMBER[None, None]
            patch = 1 - (1 - patch) * (1 - gl)
        out[Y0:Y1, X0:X1] = patch
        return out


def tip_of(st):
    """Position and width at the end of a stroke (for the ink bead)."""
    return st.P[-1, 0], st.P[-1, 1], st.w[-1]
