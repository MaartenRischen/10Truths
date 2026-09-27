# Direction C — the cave wall: limestone relief lit by torchlight, with pigment marks deposited into the rock.
import numpy as np, cv2
from cutil import fbm, vnoise, ridged, white, smoothstep, blur, hexrgb, srgb2lin, lin2srgb, rng, luma

LIME = [hexrgb('#dccaa6'), hexrgb('#c7a97f'), hexrgb('#a89c8a'), hexrgb('#e6dcc6')]
IRON = hexrgb('#a86a3e')
SOOT = hexrgb('#2a2420')


def aniso_noise(h, w, cell_x, cell_y, seed):
    """noise stretched along y (drips / rills)"""
    k = cell_y / cell_x
    small = vnoise(max(8, int(h / k)), w, cell_x, seed, angle=0)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)


class Wall:
    def __init__(self, H, W, seed=3, relief=1.0, scale=1.0, crack_mask=None):
        self.H, self.W, self.seed = H, W, seed
        s = scale * W / 1280.0
        self.s = s
        r = rng(seed)
        big = fbm(H, W, 520 * s, 3, seed=seed + 1)
        med = fbm(H, W, 120 * s, 4, seed=seed + 2)
        lump = fbm(H, W, 45 * s, 3, seed=seed + 13)
        drip = aniso_noise(H, W, 14 * s, 110 * s, seed + 3) * smoothstep(0.1, 0.7, fbm(H, W, 260 * s, 2, seed=seed + 4))
        cn = vnoise(H, W, 190 * s, seed + 5) + 0.05 * vnoise(H, W, 30 * s, seed + 15) + 0.015 * vnoise(H, W, 8 * s, seed + 16)
        crack = np.exp(-(cn / 0.016) ** 2) * smoothstep(0.25, 0.7, fbm(H, W, 300 * s, 2, seed=seed + 6))
        if crack_mask is not None:
            crack = crack * crack_mask
        fine = fbm(H, W, 6 * s, 3, seed=seed + 7)
        smooth = smoothstep(0.0, 0.6, fbm(H, W, 150 * s, 2, seed=seed + 17))  # calcite-smoothed patches
        pitn = fbm(H, W, 3.0 * s, 2, seed=seed + 8)
        pits = smoothstep(0.35, 0.8, pitn) * (1 - 0.7 * smooth)
        hgt = big * 70 * s + med * 11 * s + lump * 2.6 * s + drip * 2.5 * s - crack * 4 * s + fine * 0.75 * s * (1 - 0.7 * smooth) - pits * 0.55 * s
        self.hgt = hgt * relief
        self.crack = crack; self.pits = pits; self.fine = fine; self.big = big; self.med = med; self.drip = drip
        t1 = smoothstep(-0.5, 0.6, fbm(H, W, 300 * s, 3, seed=seed + 9))
        t2 = smoothstep(-0.2, 0.7, fbm(H, W, 90 * s, 3, seed=seed + 10))
        alb = LIME[0][None, None, :] * (1 - t1[..., None]) + LIME[1][None, None, :] * t1[..., None]
        alb = alb * (1 - 0.3 * t2[..., None]) + LIME[2][None, None, :] * 0.3 * t2[..., None]
        iron = smoothstep(0.2, 0.9, aniso_noise(H, W, 26 * s, 200 * s, seed + 11) + 0.5 * fbm(H, W, 160 * s, 2, seed=seed + 12))
        alb = alb + (IRON - alb) * (iron * 0.28)[..., None]
        calc = np.clip(smoothstep(0.3, 0.9, med + 0.3 * big) * 0.6 + drip.clip(0, 1) * 0.5, 0, 1)
        alb = alb + (LIME[3] - alb) * (calc * 0.5)[..., None]
        alb = alb * (1 - 0.08 * pits[..., None]) * (1 - 0.45 * crack[..., None])
        alb = alb * (0.95 + 0.05 * fine[..., None])
        self.alb = np.clip(alb, 0, 1).astype(np.float32)
        self.pigment_lit = np.zeros((H, W), np.float32)

    # ---------- pigment deposition ----------
    def deposit(self, dens, color, dry=0.5, seed=0):
        """dens: (H,W) 0..1 pigment density; dry: how much rock texture breaks the pigment (0 wet .. 1 dry)"""
        g = fbm(self.H, self.W, 2.6 * self.s, 2, seed=self.seed + 900 + seed)
        brk = smoothstep(-0.7 + 0.5 * dry, 0.3, g - 0.8 * self.pits * dry)
        d = np.clip(dens * (1 - dry * 0.55 + dry * 0.55 * brk), 0, 1)
        col = np.asarray(color, np.float32)
        self.alb = self.alb + (col[None, None, :] * (0.92 + 0.08 * self.fine[..., None]) - self.alb) * d[..., None]
        self.pigment_lit = np.maximum(self.pigment_lit, d)

    def deposit_rgba(self, rgba):
        a = rgba[..., 3:4]
        self.alb = self.alb * (1 - a) + rgba[..., :3] * a

    # ---------- lighting ----------
    def light(self, torches, ambient=(0.05, 0.035, 0.025), relief_k=1.0, exposure=1.0, ao=0.6, spec=0.15):
        H, W = self.H, self.W
        hg = blur(self.hgt, 0.7)
        gy, gx = np.gradient(hg)
        nx, ny, nz = -gx * relief_k, -gy * relief_k, np.ones_like(hg)
        nl = np.sqrt(nx * nx + ny * ny + nz * nz); nx /= nl; ny /= nl; nz /= nl
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        lin_alb = srgb2lin(self.alb)
        acc = np.zeros((H, W, 3), np.float32)
        for t in torches:
            tx, ty, tz = t['pos'][0] * W, t['pos'][1] * H, t['pos'][2] * W
            lx, ly, lz = tx - xx, ty - yy, tz - hg
            d = np.sqrt(lx * lx + ly * ly + lz * lz); lx /= d; ly /= d; lz /= d
            lam = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
            r0 = t.get('radius', 0.5) * W
            att = (tz * tz + r0 * r0) / (d * d + r0 * r0)
            att = att ** t.get('falloff', 1.0)
            col = np.asarray(t.get('color', (1.0, 0.6, 0.28)), np.float32) * t.get('power', 1.0)
            acc += (lam * att)[..., None] * col[None, None, :]
            # wet sheen
            if spec > 0:
                hx, hy, hz = lx, ly, lz + 1.0
                hl = np.sqrt(hx * hx + hy * hy + hz * hz)
                sp = np.clip((nx * hx + ny * hy + nz * hz) / hl, 0, 1) ** 40 * att
                acc += (sp * spec * (1 - self.pigment_lit * 0.7))[..., None] * col[None, None, :]
        cav = np.clip(1 + (hg - blur(hg, 25 * self.s)) / (9 * self.s), 0.2, 1.3)
        cav = 1 - ao * (1 - np.clip(cav, 0, 1))
        light = (acc + np.asarray(ambient, np.float32)[None, None, :]) * cav[..., None]
        return lin_alb * light * exposure


def hand_mask(H, W, cx, cy, size, angle=0.0, spread=1.0, seed=0):
    """filled hand silhouette (palm + 5 fingers) as a soft mask; size = hand length in px"""
    R = rng(seed)
    m = np.zeros((H, W), np.uint8)
    ss = 4
    big = np.zeros((H * 1, W * 1), np.uint8)
    ca, sa = np.cos(angle), np.sin(angle)

    def P(x, y):  # local hand coords (x right, y up along fingers), units of size
        X = cx + (x * ca - y * sa) * size
        Y = cy - (x * sa + y * ca) * size
        return (int(X * ss), int(Y * ss))

    canvas = np.zeros((H * ss, W * ss), np.uint8) if max(H, W) * ss < 9000 else None
    if canvas is None:
        ss = 2; canvas = np.zeros((H * ss, W * ss), np.uint8)
    # palm
    palm = [(-0.2, 0.0), (0.2, 0.0), (0.24, 0.2), (0.23, 0.45), (-0.22, 0.47), (-0.24, 0.2)]
    cv2.fillPoly(canvas, [np.array([P(*p) for p in palm], np.int32)], 255, cv2.LINE_AA)
    # wrist
    cv2.fillPoly(canvas, [np.array([P(-0.16, -0.18), P(0.16, -0.18), P(0.2, 0.02), P(-0.2, 0.02)], np.int32)], 255, cv2.LINE_AA)
    fingers = [(-0.17, 0.43, 0.31, 0.043, 0.30), (-0.058, 0.47, 0.41, 0.046, 0.10), (0.058, 0.47, 0.43, 0.046, -0.08),
               (0.168, 0.44, 0.37, 0.044, -0.26)]
    for (bx, by, L, r, a) in fingers:
        a = a * spread + R.normal(0, 0.03)
        tx, ty = bx + np.sin(-a) * L, by + np.cos(a) * L
        cv2.line(canvas, P(bx, by), P(tx, ty), 255, max(1, int(2 * r * size * ss)), cv2.LINE_AA)
        cv2.circle(canvas, P(tx, ty), max(1, int(r * size * ss)), 255, -1, cv2.LINE_AA)
    # thumb
    tb = (0.2, 0.12); tm = (0.3 + 0.06 * spread, 0.24); tt = (0.36 + 0.12 * spread, 0.36)
    cv2.line(canvas, P(*tb), P(*tm), 255, max(1, int(0.12 * size * ss)), cv2.LINE_AA)
    cv2.line(canvas, P(*tm), P(*tt), 255, max(1, int(0.095 * size * ss)), cv2.LINE_AA)
    cv2.circle(canvas, P(*tt), max(1, int(0.048 * size * ss)), 255, -1, cv2.LINE_AA)
    out = cv2.resize(canvas, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    return out


def stencil(H, W, hand, radius, seed=0, strength=1.0):
    """negative hand stencil: sprayed pigment density around a hand mask"""
    m = (hand > 0.5).astype(np.uint8)
    dout = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
    n = fbm(H, W, radius * 0.5, 3, seed=seed)
    spray = np.exp(-(dout / (radius * (0.8 + 0.3 * n))) ** 2) * (1 - hand)
    spray *= smoothstep(0.0, 3.0, dout)
    sp = white(H, W, seed + 5)
    dots = smoothstep(0.35, 0.9, sp) * 0.5 + 0.5
    edge = smoothstep(0.02, 0.3, spray)
    return np.clip(spray * dots * strength * (0.6 + 0.4 * edge), 0, 1)


def print_hand(H, W, hand, seed=0):
    """positive handprint: pigment where the hand pressed, uneven (palm centre lighter, fingertips dense)"""
    n = fbm(H, W, 6, 3, seed=seed)
    core = blur(hand, 1.0)
    inner = cv2.erode((hand > 0.5).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32)
    d = core * (0.75 + 0.25 * n) * (1 - 0.25 * blur(inner, 6))
    return np.clip(d, 0, 1)


def dots(H, W, pts, r, seed=0, jitter=0.25):
    """finger dots: list of (x,y) px"""
    R = rng(seed)
    m = np.zeros((H, W), np.float32)
    for (x, y) in pts:
        rr = r * R.uniform(1 - jitter, 1 + jitter)
        x0, x1 = int(max(0, x - rr * 2)), int(min(W, x + rr * 2 + 1)); y0, y1 = int(max(0, y - rr * 2)), int(min(H, y + rr * 2 + 1))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        ang = np.arctan2(yy - y, xx - x)
        rad = rr * (1 + 0.15 * np.sin(ang * 3 + R.uniform(0, 6)) + 0.08 * np.sin(ang * 5 + R.uniform(0, 6)))
        d = np.hypot(xx - x, yy - y)
        m[y0:y1, x0:x1] = np.maximum(m[y0:y1, x0:x1], smoothstep(rad + 0.8, rad - 0.8, d) * R.uniform(0.75, 1.0))
    return m


def polyline_mask(H, W, pts, width, seed=0, taper=True, wobble=0.0, ss=2):
    """a hand-drawn charcoal/pigment line along pts (list of (x,y) px); width px"""
    c = np.zeros((H * ss, W * ss), np.uint8)
    R = rng(seed)
    pts = np.asarray(pts, np.float32)
    if wobble > 0:
        pts = pts + R.normal(0, wobble, pts.shape)
    n = len(pts)
    for i in range(n - 1):
        t = i / max(1, n - 2)
        wv = width * (0.55 + 0.45 * np.sin(np.pi * t) if taper else 1.0) * R.uniform(0.85, 1.15)
        cv2.line(c, tuple((pts[i] * ss).astype(int)), tuple((pts[i + 1] * ss).astype(int)), 255, max(1, int(wv * ss)), cv2.LINE_AA)
    return cv2.resize(c, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


def catmull(pts, n=16):
    pts = np.asarray(pts, np.float32)
    P = np.vstack([pts[0], pts, pts[-1]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)


def horse_lines(x0, y0, w, h, facing=-1):
    """a Chauvet-style horse head, neck and back as charcoal polylines (list of point arrays, px). facing -1 = left"""
    def T(pts):
        return [((x if facing < 0 else 1 - x) * w + x0, y * h + y0) for x, y in pts]
    back = catmull(T([(1.0, 0.42), (0.86, 0.36), (0.72, 0.33), (0.62, 0.28)]), 10)
    crest = catmull(T([(0.62, 0.28), (0.56, 0.18), (0.5, 0.1), (0.46, 0.08)]), 10)
    head = catmull(T([(0.46, 0.08), (0.4, 0.14), (0.33, 0.25), (0.3, 0.33), (0.34, 0.37), (0.4, 0.36), (0.47, 0.33)]), 8)
    throat = catmull(T([(0.47, 0.33), (0.54, 0.42), (0.58, 0.52), (0.6, 0.62)]), 10)
    belly = catmull(T([(0.66, 0.66), (0.78, 0.7), (0.92, 0.68)]), 8)
    eye = catmull(T([(0.41, 0.17), (0.425, 0.18)]), 2)
    mane = [catmull(T([(0.6 - i * 0.02, 0.26 - i * 0.03), (0.63 - i * 0.02, 0.22 - i * 0.03)]), 2) for i in range(6)]
    return [back, crest, head, throat, belly, eye] + mane


def resample(P, step=0.6):
    P = np.asarray(P, np.float32)
    d = np.sqrt(((P[1:] - P[:-1]) ** 2).sum(1))
    s = np.concatenate([[0], np.cumsum(d)])
    n = max(2, int(s[-1] / step))
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, P[:, 0]), np.interp(t, s, P[:, 1])], 1), t


def charcoal_stroke(H, W, P, width, seed=0, taper=0.15, press_var=0.35, ss=3):
    """smooth hand-drawn stroke: resampled path, width varies smoothly with 'pressure', tapered ends"""
    Q, t = resample(P, 0.5)
    L = t[-1] + 1e-6
    R = rng(seed)
    ph = R.uniform(0, 6.28, 3)
    u = t / L
    press = 1 + press_var * (0.6 * np.sin(u * 2 * np.pi * 1.3 + ph[0]) + 0.4 * np.sin(u * 2 * np.pi * 3.7 + ph[1]))
    tap = np.clip(np.minimum(u, 1 - u) / max(taper, 1e-3), 0, 1) ** 0.5 if taper > 0 else np.ones_like(u)
    r = np.maximum(0.3, 0.5 * width * press * (0.35 + 0.65 * tap))
    c = np.zeros((H * ss, W * ss), np.uint8)
    for (x, y), rr in zip(Q, r):
        cv2.circle(c, (int(x * ss), int(y * ss)), max(1, int(rr * ss)), 255, -1, cv2.LINE_AA)
    return cv2.resize(c, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
