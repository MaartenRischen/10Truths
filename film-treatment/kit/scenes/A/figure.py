"""Figure line extraction from the three.js label/depth buffers.

Produces, per figure, a set of polylines in OUTPUT px (1x):
  sil      : closed silhouette loops (outer contour of the visible figure)
  inner    : open occluding contours (a part in front of another part)
  joints   : dict joint -> (cx, cy, r) projected ball circles (visible-part masks applied later)
  cons     : construction curves (head centre line, eye line, chest/pelvis rings & centre lines)
and assembles them into ONE continuous pen path with cursive joint loops.
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure

from ink import resample, smooth_path, arclen

H = 0.25
PART_JOINT = {1: 'head', 2: 'chest', 3: 'pelvis', 4: 'lShoulder', 5: 'lElbow', 6: 'lWrist', 7: 'rShoulder', 8: 'rElbow',
              9: 'rWrist', 10: 'lHip', 11: 'lKnee', 12: 'lAnkle', 13: 'rHip', 14: 'rKnee', 15: 'rAnkle'}
BALLS = {  # joint -> (ball radius, part label that owns it, local offset y)
    'lShoulder': (0.27 * H, 4, 0.0), 'rShoulder': (0.27 * H, 7, 0.0),
    'lElbow': (0.175 * H, 5, 0.0), 'rElbow': (0.175 * H, 8, 0.0),
    'lWrist': (0.115 * H, 6, 0.0), 'rWrist': (0.115 * H, 9, 0.0),
    'lHip': (0.30 * H, 10, 0.0), 'rHip': (0.30 * H, 13, 0.0),
    'lKnee': (0.20 * H, 11, 0.0), 'rKnee': (0.20 * H, 14, 0.0),
    'lAnkle': (0.13 * H, 12, 0.0), 'rAnkle': (0.13 * H, 15, 0.0),
}


class Extract:
    def __init__(self, prefix, ss=2):
        L = np.array(Image.open(prefix + '_labels.png').convert('RGB'))
        self.fig = L[..., 0].astype(np.int32)
        self.part = L[..., 1].astype(np.int32)
        self.meta = json.load(open(prefix + '_meta.json'))
        Dp = np.array(Image.open(prefix + '_depth.png').convert('RGB')).astype(np.int64)
        near, far = self.meta['near'], self.meta['far']
        self.depth = ((Dp[..., 0] * 65536 + Dp[..., 1] * 256 + Dp[..., 2]) / 16777215.0 * (far - near) + near).astype(np.float32)
        self.depth[self.fig == 0] = 1e6
        self.ss = ss  # label px per output px
        self.Pm = np.array(self.meta['proj']).reshape(4, 4).T
        self.Vm = np.array(self.meta['view']).reshape(4, 4).T
        self.lw, self.lh = self.meta['w'], self.meta['h']

    # ---------------------------------------------------------------- camera
    def project(self, X):
        X = np.atleast_2d(np.asarray(X, np.float64))
        Xh = np.c_[X, np.ones(len(X))]
        v = Xh @ self.Vm.T
        c = v @ self.Pm.T
        ndc = c[:, :3] / c[:, 3:4]
        px = (ndc[:, 0] + 1) / 2 * self.lw / self.ss
        py = (1 - ndc[:, 1]) / 2 * self.lh / self.ss
        return np.c_[px, py], -v[:, 2]

    def px_per_unit(self, X):
        """Projected pixels (1x) per world unit at point X (for radii)."""
        X = np.asarray(X, np.float64)
        v = np.r_[X, 1.0] @ self.Vm.T
        f = self.Pm[1, 1]
        return f * (self.lh / self.ss) / 2 / (-v[2])

    def jmat(self, fi, name):
        return np.array(self.meta['figures'][fi]['joints'][name]).reshape(4, 4).T

    def jpos(self, fi, name):
        return self.jmat(fi, name)[:3, 3]

    def label_at(self, P):
        """(fig, part, depth) at output px positions P (N,2)."""
        x = np.clip((P[:, 0] * self.ss).astype(int), 0, self.lw - 1)
        y = np.clip((P[:, 1] * self.ss).astype(int), 0, self.lh - 1)
        return self.fig[y, x], self.part[y, x], self.depth[y, x]

    def mask(self, fi=None):
        if fi is None:
            return (self.fig > 0) & (self.fig < 255)
        return self.fig == fi + 1

    def bbox(self, fi, pad=6):
        if not hasattr(self, '_bb'):
            self._bb = {}
            f = self.fig.ravel()
            idx = np.nonzero(f)[0]
            ys, xs = np.divmod(idx, self.fig.shape[1])
            fv = f[idx]
            order = np.argsort(fv, kind='stable')
            fv, ys, xs = fv[order], ys[order], xs[order]
            bounds = np.searchsorted(fv, np.arange(1, 257))
            for k in range(1, 256):
                a, b = bounds[k - 1], bounds[k] if k < 256 else len(fv)
                if b > a:
                    self._bb[k] = (ys[a:b].min(), ys[a:b].max(), xs[a:b].min(), xs[a:b].max())
        bb = self._bb.get(fi + 1)
        if bb is None:
            return None
        y0, y1, x0, x1 = bb
        H, W = self.fig.shape
        return max(0, y0 - pad), min(H, y1 + pad + 1), max(0, x0 - pad), min(W, x1 + pad + 1)


# -------------------------------------------------------------------- contours
def _contours(mask, sigma=0.9):
    m = ndi.gaussian_filter(mask.astype(np.float32), sigma)
    cs = measure.find_contours(np.pad(m, 2), 0.5)
    return [c[:, ::-1] - 2 for c in cs]  # (x, y) in label px


def figure_lines(ex, fi, dthr=0.03, seam=False, min_len=6, smooth=1.2, parts_merge=None, inner=True):
    """Silhouette loops + occluding interior lines for figure fi (0-based). Output px (1x)."""
    ss = ex.ss
    bb = ex.bbox(fi)
    if bb is None:
        return [], []
    y0, y1, x0, x1 = bb
    fm = ex.fig[y0:y1, x0:x1] == fi + 1
    pc = ex.part[y0:y1, x0:x1]
    off = np.array([x0, y0], np.float64)
    sil = []
    for c in _contours(fm):
        P = (c + off) / ss
        if len(P) < 8 or arclen(P)[-1] < min_len * 2:
            continue
        # drop portions where the neighbour across the boundary is a NEARER figure (occluded by it)
        keep = _classify_sil(ex, fi, P) & _off_border(ex, P)
        for seg, closed in _runs(P, keep, closed=True):
            Q, _ = resample(seg, 0.8)
            Q = smooth_path(Q, smooth / 0.8, closed=closed)
            sil.append((Q, closed))
    inner_l = []
    parts = np.unique(pc[fm]) if inner else []
    for p in parts:
        if p == 0:
            continue
        pm = fm & (pc == p)
        if pm.sum() < 20:
            continue
        for c in _contours(pm, 0.8):
            P = (c + off) / ss
            if len(P) < 6:
                continue
            keep = _classify_inner(ex, fi, p, P, dthr, seam) & _off_border(ex, P)
            for seg, closed in _runs(P, keep, closed=True):
                if arclen(seg)[-1] < min_len:
                    continue
                Q, _ = resample(seg, 0.8)
                Q = smooth_path(Q, smooth / 0.8, closed=closed)
                inner_l.append((Q, closed))
    return sil, inner_l


def _off_border(ex, P, m=1.2):
    w, h = ex.lw / ex.ss, ex.lh / ex.ss
    return (P[:, 0] > m) & (P[:, 0] < w - m) & (P[:, 1] > m) & (P[:, 1] < h - m)


def _normals_closed(P):
    d = np.roll(P, -1, 0) - np.roll(P, 1, 0)
    n = np.stack([d[:, 1], -d[:, 0]], 1)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-9)


def _probe(ex, P, fi, part=None, rad=1.6):
    """Return (outside labels, inside depth, outside depth) probing both normal directions."""
    n = _normals_closed(P)
    a = P + n * rad
    b = P - n * rad
    fa, pa, da = ex.label_at(a)
    fb, pb, db = ex.label_at(b)
    if part is None:
        ina = fa == fi + 1
    else:
        ina = (fa == fi + 1) & (pa == part)
    # choose the side that is inside
    fo = np.where(ina, fb, fa)
    po = np.where(ina, pb, pa)
    di = np.where(ina, da, db)
    do = np.where(ina, db, da)
    return fo, po, di, do


def _classify_sil(ex, fi, P):
    fo, po, di, do = _probe(ex, P, fi)
    # drop only where a DIFFERENT, nearer object lies across the boundary (we are occluded there)
    occluded = (fo != 0) & (fo != fi + 1) & (do < di - 0.02)
    if len(occluded) > 5:
        occluded = ndi.binary_opening(occluded, np.ones(3), border_value=0)
    return ~occluded


SKIP_PAIRS = {10: (3,), 13: (3,), 3: (10, 13)}


def _classify_inner(ex, fi, part, P, dthr, seam):
    fo, po, di, do = _probe(ex, P, fi, part)
    other = (fo != 0) & ~((fo == fi + 1) & (po == part))
    if part in SKIP_PAIRS:
        other &= ~((fo == fi + 1) & np.isin(po, SKIP_PAIRS[part]))
    samefig = fo == fi + 1
    occl = other & (do > di + dthr)
    if seam:
        occl |= other & samefig & (np.abs(do - di) <= dthr)
    # only interior (not the silhouette with background): background handled by sil
    k = occl
    # clean tiny gaps / specks
    k = ndi.binary_closing(k, np.ones(5), border_value=0) if len(k) > 5 else k
    k = ndi.binary_opening(k, np.ones(3), border_value=0) if len(k) > 3 else k
    return k


def _runs(P, keep, closed=True):
    """Split polyline P into runs where keep is True. Returns list of (seg, closed)."""
    n = len(P)
    if keep.all():
        return [(P, closed)]
    if not keep.any():
        return []
    out = []
    if closed:
        # rotate so we start at a False
        i0 = int(np.argmin(keep))
        P = np.roll(P, -i0, 0)
        keep = np.roll(keep, -i0)
    idx = np.where(np.diff(np.r_[0, keep.astype(int), 0]) != 0)[0]
    for a, b in zip(idx[::2], idx[1::2]):
        if b - a >= 3:
            out.append((P[a:b], False))
    return out


# -------------------------------------------------------------- construction
def _egg_point(u, v, w=0.72 * H, h=1.0 * H, d=0.86 * H):
    """Head egg surface point for unit-sphere params (x,y,z on radius .5 sphere)."""
    x, y, z = u
    t = np.where(y < 0, 1 - 0.26 * np.power(np.clip(-y / 0.5, 0, None), 1.3), 1 + 0.04 * (y / 0.5))
    x = x * t
    z = z * t * np.where(y < 0, 0.96, 1.0)
    return np.stack([x * w, (y + 0.5) * h, z * d], -1)


def head_curves(ex, fi):
    """Face centre line (front meridian) and eye line, as 3D->2D with visibility."""
    M = ex.jmat(fi, 'head')
    neckL = 0.42 * H
    # egg mesh local transform: pos (0, neckL*0.62, 0.03H), rot x = -0.1
    c, s = np.cos(-0.1), np.sin(-0.1)
    Rx = np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    off = np.array([0, neckL * 0.62, 0.03 * H])
    curves = []
    # meridian: phi from top (0) to bottom (pi), front z>0
    ph = np.linspace(0.02, np.pi - 0.05, 90)
    u = np.stack([np.zeros_like(ph), 0.5 * np.cos(ph), 0.5 * np.sin(ph)], 0)
    curves.append(_egg_point(u, None))
    # eye line: latitude slightly below centre, front half
    lat = -0.04
    th = np.linspace(-np.pi * 0.62, np.pi * 0.62, 90)
    rr = np.sqrt(0.25 - lat ** 2)
    u = np.stack([rr * np.sin(th), np.full_like(th, lat), rr * np.cos(th)], 0)
    curves.append(_egg_point(u, None))
    out = []
    for Cl in curves:
        Pw = (Rx @ Cl.T).T + off
        Pw = (M[:3, :3] @ Pw.T).T + M[:3, 3]
        # normals approx: from egg centre
        ctr = (M[:3, :3] @ (Rx @ np.array([0, 0.5 * H, 0]) + off)) + M[:3, 3]
        out.append(_visible_curve(ex, fi, Pw, Pw - ctr, part=1))
    return out


def lathe_ring(ex, fi, joint, y, r, sx=1.0, sz=1.0, oy=0.0, part=2, frac=1.0, phase=0.0):
    M = ex.jmat(fi, joint)
    th = np.linspace(-np.pi * frac + phase, np.pi * frac + phase, 120)
    Pl = np.stack([r * sx * np.sin(th), np.full_like(th, y + oy), r * sz * np.cos(th)], 1)
    Nl = np.stack([np.sin(th) / max(sx, 1e-3), np.zeros_like(th), np.cos(th) / max(sz, 1e-3)], 1)
    Pw = (M[:3, :3] @ Pl.T).T + M[:3, 3]
    Nw = (M[:3, :3] @ Nl.T).T
    return _visible_curve(ex, fi, Pw, Nw, part=part)


def lathe_meridian(ex, fi, joint, prof, sz=1.0, oy=0.0, part=2, sx=1.0):
    """Front centre line of a lathe with profile [(r,y),...] scaled z by sz."""
    M = ex.jmat(fi, joint)
    prof = np.asarray(prof)
    Pl = np.stack([np.zeros(len(prof)), prof[:, 1] + oy, prof[:, 0] * sz], 1)
    Nl = np.tile(np.array([0, 0, 1.0]), (len(prof), 1))
    Pw = (M[:3, :3] @ Pl.T).T + M[:3, 3]
    Nw = (M[:3, :3] @ Nl.T).T
    return _visible_curve(ex, fi, Pw, Nw, part=part)


def _visible_curve(ex, fi, Pw, Nw, part=None, tol=0.02):
    P2, dep = ex.project(Pw)
    cam = np.array(ex.meta['camPos'])
    facing = ((cam[None] - Pw) * Nw).sum(1) > 0
    f, p, d = ex.label_at(P2)
    vis = facing & (f == fi + 1) & (d > dep - tol) & (d < dep + tol * 3)
    if part is not None:
        parts = part if isinstance(part, (list, tuple)) else [part]
        vis &= np.isin(p, parts)
    segs = []
    for seg, _ in _runs(P2, vis, closed=False):
        if len(seg) > 4:
            segs.append(seg)
    return segs


def joint_circles(ex, fi, names=None, scale=1.0):
    out = {}
    for j, (r, part, oy) in BALLS.items():
        if names is not None and j not in names:
            continue
        Xw = ex.jpos(fi, j)
        P2, dep = ex.project(Xw[None])
        rp = r * ex.px_per_unit(Xw) * scale
        out[j] = (P2[0, 0], P2[0, 1], rp, part, dep[0])
    return out


def circle_visible(ex, fi, c, n=64):
    """Visible arcs of a projected joint ball (checks the owning part just inside the rim)."""
    cx, cy, r, part, dep = c
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    P = np.stack([cx + r * np.cos(th), cy + r * np.sin(th)], 1)
    Pin = np.stack([cx + (r - 1.2) * np.cos(th), cy + (r - 1.2) * np.sin(th)], 1)
    f, p, d = ex.label_at(Pin)
    vis = (f == fi + 1) & (np.abs(d - dep) < r / max(ex.px_per_unit(ex.jpos(fi, 'chest')), 1) * 3 + 0.05)
    return th, vis


# ------------------------------------------------------------------ assembly
CHEST_PROF = [(0.0001, 0.0), (0.38 * H, 0.05 * H), (0.52 * H, 0.35 * H), (0.7 * H, 0.9 * H), (0.78 * H, 1.22 * H),
              (0.66 * H, 1.5 * H), (0.3 * H, 1.66 * H), (0.0001, 1.7 * H)]
PELVIS_PROF = [(0.0001, -0.58 * H), (0.4 * H, -0.54 * H), (0.66 * H, -0.28 * H), (0.7 * H, 0.0), (0.6 * H, 0.26 * H),
               (0.42 * H, 0.42 * H), (0.0001, 0.46 * H)]


def _catmull(prof, n=60):
    P = np.asarray(prof, np.float64)
    P = np.vstack([P[:1], P, P[-1:]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n // (len(P) - 3) + 2)[:-1]:
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)


def construction(ex, fi, head=True, chest=True, pelvis=True):
    """Construction curves (lists of 2D polylines)."""
    cons = []
    if head:
        for segs in head_curves(ex, fi):
            cons += segs
    if chest:
        prof = _catmull(CHEST_PROF)
        sel = prof[(prof[:, 1] > 0.12 * H) & (prof[:, 1] < 1.62 * H)]
        cons += lathe_meridian(ex, fi, 'chest', sel, sz=0.66, oy=0.1 * H, part=2)
        cons += lathe_ring(ex, fi, 'chest', 0.42 * H, 0.56 * H, sx=1.1, sz=0.66, oy=0.1 * H, part=2, frac=0.5)
    if pelvis:
        prof = _catmull(PELVIS_PROF)
        sel = prof[(prof[:, 1] > -0.5 * H) & (prof[:, 1] < 0.38 * H)]
        cons += lathe_meridian(ex, fi, 'pelvis', sel, sz=0.74, part=3)
        cons += lathe_ring(ex, fi, 'pelvis', 0.12 * H, 0.66 * H, sx=1.0, sz=0.74, part=3, frac=0.5)
    return cons


def nearest_idx(P, q):
    d = ((P - np.asarray(q)[None]) ** 2).sum(1)
    i = int(np.argmin(d))
    return i, float(np.sqrt(d[i]))


def circle_path(cx, cy, r, th0, direction=1, overshoot=0.35, step=0.8):
    n = max(12, int(2 * np.pi * r * (1 + overshoot / (2 * np.pi)) / step))
    th = th0 + direction * np.linspace(0, 2 * np.pi + overshoot, n)
    return np.stack([cx + r * np.cos(th), cy + r * np.sin(th)], 1)


class FigureDrawing:
    """Holds the ordered pen path of one figure as a list of segments.
    Each segment: dict(P=polyline, role='sil'|'joint'|'inner'|'cons'|'travel')."""

    def __init__(self, ex, fi, joints='limbs', dthr=0.012, cons=True, start=None, direction=1,
                 joint_scale=1.0, min_joint_vis=0.55, skip_joints=('lHip', 'rHip'), inner=True, cons_opts=None):
        self.ex, self.fi = ex, fi
        sil, inn = figure_lines(ex, fi, dthr=dthr, inner=inner)
        sil = sorted(sil, key=lambda s: -arclen(s[0])[-1])
        self.segs = []
        self.main = np.zeros((0, 2))
        self.sil_raw = []
        if not sil:
            return
        main, closed = sil[0]
        self.sil_raw = [x[0] for x in sil]
        if closed:
            main = main[:-1] if np.allclose(main[0], main[-1]) else main
            # orientation: make it clockwise on screen if direction=1
            area = 0.5 * np.sum(main[:-1, 0] * main[1:, 1] - main[1:, 0] * main[:-1, 1])
            if (area > 0) != (direction > 0):
                main = main[::-1]
            if start is None:
                i0 = int(np.argmax(main[:, 1]))  # lowest point
            else:
                i0, _ = nearest_idx(main, start)
            main = np.roll(main, -i0, 0)
            main = np.vstack([main, main[:12]])  # overshoot past the start
        # joint circles as cursive loops
        jc = joint_circles(ex, fi, scale=joint_scale) if joints else {}
        inserts = []
        for j, c in jc.items():
            if j in skip_joints:
                continue
            th, vis = circle_visible(ex, fi, c)
            if vis.mean() < min_joint_vis:
                continue
            cx, cy, r = c[0], c[1], c[2]
            if r < 1.6:
                continue
            # nearest main-loop point to the rim
            d = np.sqrt(((main - np.array([cx, cy])) ** 2).sum(1)) - r
            k = int(np.argmin(np.abs(d)))
            if abs(d[k]) > 3.5:
                # joint not on the silhouette: draw later as an isolated loop
                inserts.append((None, j, c))
                continue
            inserts.append((k, j, c))
        inserts_on = sorted([x for x in inserts if x[0] is not None], key=lambda x: x[0])
        pieces = []
        last = 0
        for k, j, c in inserts_on:
            cx, cy, r = c[0], c[1], c[2]
            pieces.append(('sil', main[last:k + 1]))
            p = main[k]
            th0 = np.arctan2(p[1] - cy, p[0] - cx)
            tan = main[min(k + 2, len(main) - 1)] - main[max(k - 2, 0)]
            radial = np.array([np.cos(th0), np.sin(th0)])
            # choose loop direction so the pen leaves along its travel direction
            cross = radial[0] * tan[1] - radial[1] * tan[0]
            dirn = 1 if cross > 0 else -1
            loop = circle_path(cx, cy, r, th0, dirn, overshoot=0.0)
            pieces.append(('joint', np.vstack([p[None], loop, p[None]])))
            last = k
        pieces.append(('sil', main[last:]))
        # merge into one main path, remembering roles per point
        P = []
        roles = []
        for role, Q in pieces:
            if P:
                Q = Q[1:] if len(Q) > 1 else Q
            P.append(Q)
            roles += [role] * len(Q)
        self.main = np.vstack(P)
        self.main_roles = np.array(roles)
        self.segs.append(dict(P=self.main, role='main'))
        for s, cl in sil[1:]:
            self.segs.append(dict(P=s, role='sil2'))
        for k, j, c in inserts:
            if k is None:
                th, vis = circle_visible(ex, fi, c)
                self.segs.append(dict(P=circle_path(c[0], c[1], c[2], 0, 1, overshoot=0.4), role='joint'))
        if inner:
            for s, cl in inn:
                self.segs.append(dict(P=s, role='inner'))
        if cons:
            for s in construction(ex, fi, **(cons_opts or {})):
                self.segs.append(dict(P=s, role='cons'))

    def height(self):
        m = self.main
        if len(m) == 0:
            return 0.0
        return m[:, 1].max() - m[:, 1].min()
