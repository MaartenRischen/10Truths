"""Shared helpers for Direction A panels."""
import hashlib
import html
import json
import os
import re
import subprocess

import numpy as np
from scipy import ndimage as ndi

from ink import Canvas, Stroke, pen, ruled, resample, arclen, smooth_path, fbm1, Noise1D
from figure import Extract, FigureDrawing

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.abspath(os.path.join(KIT, '..', 'sb', 'opt-A'))
WORK = os.path.join(HERE, 'work')
os.makedirs(WORK, exist_ok=True)
os.makedirs(os.path.join(HERE, 'specs'), exist_ok=True)


# ----------------------------------------------------------------- extraction
def extract(name, spec, W, H, ss=2):
    spec = dict(spec)
    spec['w'], spec['h'] = W * ss, H * ss
    js = json.dumps(spec, sort_keys=True)
    hsh = hashlib.md5(js.encode()).hexdigest()[:10]
    sp = os.path.join(HERE, 'specs', name + '.json')
    prefix = os.path.join(WORK, name)
    stamp = prefix + '.hash'
    if not (os.path.exists(stamp) and open(stamp).read() == hsh and os.path.exists(prefix + '_meta.json')):
        open(sp, 'w').write(js)
        rel = os.path.relpath(sp, KIT)
        r = subprocess.run(['node', os.path.join(HERE, 'extract.mjs'), rel, prefix], cwd=KIT, capture_output=True, text=True)
        if 'wrote' not in r.stdout:
            raise RuntimeError('extract failed: ' + r.stdout + r.stderr)
        open(stamp, 'w').write(hsh)
    return Extract(prefix, ss=ss)


def fig(pose='stand', overrides=None, pos=(0, 0, 0), rot=(0, 0, 0), ground=0, show=None, hide=None):
    d = {'pose': pose, 'overrides': overrides or {}, 'root': {'pos': list(pos), 'rot': list(rot)}, 'ground': ground}
    if show:
        d['show'] = list(show)
    if hide:
        d['hide'] = list(hide)
    return d


# ----------------------------------------------------------------- figure style
def fig_weight(h):
    wmax = float(np.clip(2.1 + 0.0062 * h, 2.2, 6.0))
    return wmax * 0.5, wmax


def draw_figure(C, fd, seed=0, weight=1.0, temp=0.0, dens=1.0, cons_dens=0.75, inner=True, cons=True,
                t_offset=0.0, bead=False, main_taper=True, k0=1 / 14.0, wobble=0.45, tscale=1.0, gaps=None, add=True):
    """Adds a figure's strokes. Returns list of strokes in drawing order.
    gaps: bool mask (1x) where the figure's line is interrupted (something passes in front)."""
    h = fd.height()
    wmin, wmax = fig_weight(h)
    wmin *= weight
    wmax *= weight
    strokes = []
    segs = []
    for s in fd.segs:
        if gaps is not None:
            for Q in hide(s['P'], gaps, keep_min=3):
                segs.append(dict(P=Q, role=s['role'] if s['role'] != 'main' else 'sil2'))
        else:
            segs.append(s)
    for i, s in enumerate(segs):
        role = s['role']
        P = s['P']
        if len(P) < 3:
            continue
        if role == 'main':
            st = pen(P, wmin=wmin, wmax=wmax, seed=seed * 97 + i, taper_in=10, taper_out=(14 if main_taper else 0),
                     k0=k0, temp=temp, dens=dens, wobble=wobble)
        elif role == 'sil2':
            st = pen(P, wmin=wmin, wmax=wmax, seed=seed * 97 + i, taper_in=8, taper_out=10, k0=k0, temp=temp, dens=dens, wobble=wobble)
        elif role == 'joint':
            st = pen(P, wmin=wmin * 0.85, wmax=wmax * 0.85, seed=seed * 97 + i, k0=k0, temp=temp, dens=dens, wobble=wobble * 0.6)
        elif role == 'inner':
            if not inner:
                continue
            st = pen(P, wmin=wmin * 0.8, wmax=wmax * 0.85, seed=seed * 97 + i, taper_in=5, taper_out=7, k0=k0, temp=temp,
                     dens=dens, wobble=wobble * 0.7)
        else:
            if not cons:
                continue
            cw = max(0.9, wmin * 0.62)
            st = pen(P, wmin=cw, wmax=cw * 1.45, seed=seed * 97 + i, taper_in=7, taper_out=9, k0=k0, temp=temp,
                     dens=dens * cons_dens, wobble=wobble * 0.5)
        strokes.append(st)
    if add:
        C.add(strokes)
    if bead and strokes:
        x, y = fd.main[-1]
        C.bead(x, y, max(2.6, wmax * 0.72))
    return strokes


def fig_mask(ex, fi=None, W=None, H=None, dilate=0.0):
    """Silhouette mask at 1x (bool), optionally dilated by `dilate` px."""
    m = ex.mask(fi).astype(np.float32)
    ss = ex.ss
    Hh, Ww = m.shape[0] // ss, m.shape[1] // ss
    m = m[:Hh * ss, :Ww * ss].reshape(Hh, ss, Ww, ss).mean(axis=(1, 3)) > 0.25
    if dilate > 0:
        dt = ndi.distance_transform_edt(~m)
        m = dt <= dilate
    return m


def hide(P, mask, keep_min=4):
    """Split polyline P where it passes over mask (True = hidden). Returns list of visible polylines."""
    P = np.asarray(P, np.float64)
    Q, _ = resample(P, 0.8)
    x = np.clip(np.round(Q[:, 0]).astype(int), 0, mask.shape[1] - 1)
    y = np.clip(np.round(Q[:, 1]).astype(int), 0, mask.shape[0] - 1)
    inside = (Q[:, 0] >= 0) & (Q[:, 0] < mask.shape[1]) & (Q[:, 1] >= 0) & (Q[:, 1] < mask.shape[0])
    hid = mask[y, x] & inside
    out = []
    vis = ~hid
    idx = np.where(np.diff(np.r_[0, vis.astype(int), 0]) != 0)[0]
    for a, b in zip(idx[::2], idx[1::2]):
        if b - a >= keep_min:
            out.append(Q[a:b])
    return out


# ----------------------------------------------------------------- shapes
def circle(cx, cy, r, th0=0.0, sweep=2 * np.pi, ry=None, rot=0.0, n=None):
    ry = r if ry is None else ry
    n = n or max(16, int(abs(sweep) * max(r, ry) / 0.8))
    th = th0 + np.linspace(0, sweep, n)
    x = r * np.cos(th)
    y = ry * np.sin(th)
    c, s = np.cos(rot), np.sin(rot)
    return np.stack([cx + c * x - s * y, cy + s * x + c * y], 1)


def spline(pts, n_per=24, closed=False, tension=0.5):
    """Catmull-Rom through points."""
    P = np.asarray(pts, np.float64)
    if closed:
        P = np.vstack([P[-1:], P, P[:2]])
    else:
        P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        seg = np.linalg.norm(p2 - p1)
        n = max(4, int(seg / 2.0)) if n_per is None else n_per
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            m1 = tension * (p2 - p0)
            m2 = tension * (p3 - p1)
            out.append((2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2)
    out.append(P[-2])
    return np.array(out)


def rrect(x, y, w, h, r, start=0.0):
    """Rounded rectangle path (clockwise from top-left corner arc end)."""
    pts = []
    for (cx, cy, a0) in [(x + w - r, y + r, -np.pi / 2), (x + w - r, y + h - r, 0), (x + r, y + h - r, np.pi / 2),
                         (x + r, y + r, np.pi)]:
        th = a0 + np.linspace(0, np.pi / 2, 12)
        pts.append(np.stack([cx + r * np.cos(th), cy + r * np.sin(th)], 1))
    P = np.vstack(pts + [pts[0][:1]])
    return P


def seg(a, b, n=None):
    a, b = np.asarray(a, float), np.asarray(b, float)
    n = n or max(2, int(np.linalg.norm(b - a) / 1.0))
    t = np.linspace(0, 1, n)[:, None]
    return a * (1 - t) + b * t


def poly(*pts):
    out = []
    for i in range(len(pts) - 1):
        s = seg(pts[i], pts[i + 1])
        out.append(s if i == 0 else s[1:])
    return np.vstack(out)


def jitter(P, amp=1.0, lam=40.0, seed=0):
    """Low-frequency hand imprecision for scenery shapes."""
    P = np.asarray(P, np.float64)
    s = arclen(P)
    dx = fbm1(seed * 13 + 1, s, ((lam, 1.0), (lam / 3, 0.3))) * amp
    dy = fbm1(seed * 13 + 2, s, ((lam, 1.0), (lam / 3, 0.3))) * amp
    return P + np.stack([dx, dy], 1)


def connect(a, b, bend=0.25, n=None):
    """Smooth travel curve from point a to b (quadratic with a perpendicular bend)."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    d = b - a
    m = (a + b) / 2 + np.array([-d[1], d[0]]) * bend
    n = n or max(6, int(np.linalg.norm(d) / 1.0))
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * a + 2 * (1 - t) * t * m + t ** 2 * b


def join(*paths):
    out = []
    for i, p in enumerate(paths):
        p = np.asarray(p, float)
        if len(p) == 0:
            continue
        out.append(p if not out else p[1:] if np.allclose(out[-1][-1], p[0]) else p)
    return np.vstack(out)


# ----------------------------------------------------------------- handwriting
_FONT_CACHE = {}


def _load_font(fn='EMSAllure.svg'):
    if fn in _FONT_CACHE:
        return _FONT_CACHE[fn]
    s = open(os.path.join(HERE, 'fonts', 'package', 'svg_fonts', fn)).read()
    g = {}
    for m in re.finditer(r'<glyph([^>]*)/>', s):
        a = m.group(1)
        u = re.search(r'unicode="([^"]*)"', a)
        if not u:
            continue
        ch = html.unescape(u.group(1))
        adv = re.search(r'horiz-adv-x="([^"]*)"', a)
        d = re.search(r' d="([^"]*)"', a)
        g[ch] = (float(adv.group(1)) if adv else 378.0, d.group(1) if d else '')
    _FONT_CACHE[fn] = g
    return g


def _glyph_strokes(d):
    toks = re.findall(r'[MLCQZmlcqz]|-?[\d.]+(?:e-?\d+)?', d)
    out = []
    cur = []
    i = 0
    cmd = None
    while i < len(toks):
        t = toks[i]
        if t in 'MLCQZmlcqz':
            cmd = t
            i += 1
            continue
        if cmd == 'M':
            if len(cur) > 1:
                out.append(np.array(cur))
            cur = [(float(toks[i]), float(toks[i + 1]))]
            i += 2
            cmd = 'L'
        elif cmd == 'L':
            cur.append((float(toks[i]), float(toks[i + 1])))
            i += 2
        elif cmd == 'C':
            p0 = np.array(cur[-1])
            p1 = np.array([float(toks[i]), float(toks[i + 1])])
            p2 = np.array([float(toks[i + 2]), float(toks[i + 3])])
            p3 = np.array([float(toks[i + 4]), float(toks[i + 5])])
            i += 6
            for k in range(1, 9):
                tt = k / 8
                mt = 1 - tt
                cur.append(tuple(mt ** 3 * p0 + 3 * mt * mt * tt * p1 + 3 * mt * tt * tt * p2 + tt ** 3 * p3))
        else:
            i += 1
    if len(cur) > 1:
        out.append(np.array(cur))
    return out


def handwrite(text, x, y, size, font='EMSAllure.svg', tracking=0.0, slant=0.0, seed=0, wobble=0.0):
    """Returns list of polylines (glyph subpaths in writing order), baseline at y, cap/asc ~ size px."""
    g = _load_font(font)
    sc = size / 800.0
    pen_x = 0.0
    out = []
    for ch in text:
        adv, d = g.get(ch, (300.0, ''))
        if ch == '.':
            pen_x += 45.0
        for st in _glyph_strokes(d):
            P = np.stack([x + (pen_x + st[:, 0]) * sc + slant * st[:, 1] * sc, y - st[:, 1] * sc], 1)
            P, _ = resample(P, 0.7)
            P = smooth_path(P, 1.5)
            out.append(P)
        pen_x += adv + tracking + (20.0 if ch == "." else 0.0)
    return out, pen_x * sc


def text_width(text, size, font='EMSAllure.svg', tracking=0.0):
    g = _load_font(font)
    return sum(g.get(ch, (300.0, ''))[0] + tracking + (65.0 if ch == "." else 0.0) for ch in text) * size / 800.0


def chain(polys, max_gap=6.0, bend=0.35):
    """Chain polylines in order into one path, adding smooth hairline connections.
    Returns list of (P, role) with role 'ink' or 'travel'."""
    out = []
    for i, p in enumerate(polys):
        if i > 0:
            a = out[-1][0][-1]
            b = p[0]
            if np.linalg.norm(b - a) > 0.5:
                out.append((connect(a, b, bend=bend * (1 if i % 2 else -1)), 'travel'))
        out.append((p, 'ink'))
    return out


def line_mask(polys, W, H, width):
    """Rasterise polylines to a bool mask (1x) with given width (px)."""
    from PIL import Image, ImageDraw
    im = Image.new('L', (W * 2, H * 2), 0)
    d = ImageDraw.Draw(im)
    for P in polys:
        if len(P) < 2:
            continue
        d.line([(float(x) * 2, float(y) * 2) for x, y in P], fill=255, width=max(1, int(round(width * 2))), joint='curve')
        r = width
        for (x, y) in (P[0], P[-1]):
            d.ellipse([x * 2 - r, y * 2 - r, x * 2 + r, y * 2 + r], fill=255)
    a = np.asarray(im, np.float32).reshape(H, 2, W, 2).mean(axis=(1, 3))
    return a > 64


def split_hidden(strokes_polys, mask):
    out = []
    for P in strokes_polys:
        out += hide(P, mask)
    return out
