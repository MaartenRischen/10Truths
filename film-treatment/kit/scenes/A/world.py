"""Procedural 'accelerating world' generators (screen-space line art) for P08 / hero."""
import numpy as np
from PIL import Image, ImageDraw
from scene import *


class Occluder:
    """Front-to-back painter: lines of farther shapes are hidden inside nearer shapes' regions."""

    def __init__(self, W, H, base=None):
        self.W, self.H = W, H
        self.m = np.zeros((H, W), bool) if base is None else base.copy()

    def lines(self, polys, region=None, margin=0):
        out = []
        for P in polys:
            out += hide(P, self.m)
        if region is not None:
            self.add(region, margin)
        return out

    def add(self, region, margin=0):
        im = Image.new('L', (self.W, self.H), 0)
        d = ImageDraw.Draw(im)
        for poly_ in (region if isinstance(region, list) else [region]):
            d.polygon([tuple(map(float, p)) for p in poly_], fill=255)
        a = np.asarray(im) > 0
        if margin > 0:
            from scipy import ndimage as ndi
            a = ndi.binary_dilation(a, iterations=int(margin))
        self.m |= a


def rect(x0, y0, x1, y1):
    return np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], float)


def tower(rng, x, base, w, h, detail=1.0):
    """Returns (lines, region). Tower with a window grid; top variants."""
    L = []
    top = base - h
    kind = rng.randint(4)
    outline = rect(x, top, x + w, base)
    if kind == 1:   # stepped crown
        s = w * 0.2
        outline = np.array([[x, base], [x, top + h * 0.08], [x + s, top + h * 0.08], [x + s, top], [x + w - s, top],
                            [x + w - s, top + h * 0.08], [x + w, top + h * 0.08], [x + w, base]], float)
    elif kind == 2:  # antenna
        L.append(seg((x + w * 0.5, top), (x + w * 0.5, top - min(40, h * 0.18))))
    elif kind == 3:  # slanted roof
        outline = np.array([[x, base], [x, top + w * 0.35], [x + w, top], [x + w, base]], float)
    L.append(outline)
    # window grid
    rows = int(h / (7 + 5 / detail))
    cols = max(1, int(w / (6 + 5 / detail)))
    gx = np.linspace(x + w * 0.12, x + w * 0.88, cols + 1)
    gy = np.linspace(base - 6, top + h * 0.14, rows + 1)
    if rng.rand() < 0.5:
        for yy in gy[1:-1]:
            L.append(seg((x + 2, yy), (x + w - 2, yy)))
        for xx in gx[1:-1]:
            L.append(seg((xx, base - 3), (xx, top + h * 0.12)))
    else:
        cw = (gx[1] - gx[0]) * 0.55 if cols > 0 else w * 0.5
        rh = abs(gy[1] - gy[0]) * 0.5 if rows > 0 else 4
        for yy in gy[1:]:
            for xx in gx[:-1]:
                if rng.rand() < 0.8:
                    L.append(rect(xx + 1, yy - rh, xx + 1 + cw, yy))
    region = outline if kind != 3 else outline
    return L, region


def screen(rng, x, y, w, h):
    L = [rrect(x, y, w, h, min(w, h) * 0.08)]
    k = rng.randint(4)
    cx, cy = x + w / 2, y + h / 2
    if k == 0:   # play triangle
        s = min(w, h) * 0.22
        L.append(np.array([[cx - s * 0.6, cy - s], [cx + s, cy], [cx - s * 0.6, cy + s], [cx - s * 0.6, cy - s]]))
    elif k == 1:  # bar chart
        n = 5
        for i in range(n):
            bh = h * rng.uniform(0.15, 0.6)
            bx = x + w * 0.15 + i * w * 0.14
            L.append(rect(bx, y + h * 0.85 - bh, bx + w * 0.09, y + h * 0.85))
    elif k == 2:  # feed rows
        for i in range(4):
            yy = y + h * (0.2 + 0.18 * i)
            L.append(rect(x + w * 0.1, yy, x + w * 0.24, yy + h * 0.12))
            L.append(seg((x + w * 0.3, yy + h * 0.04), (x + w * rng.uniform(0.6, 0.9), yy + h * 0.04)))
    else:        # heart
        s = min(w, h) * 0.18
        t = np.linspace(0, 2 * np.pi, 80)
        hx = 16 * np.sin(t) ** 3
        hy = -(13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t))
        L.append(np.stack([cx + hx * s / 16, cy + hy * s / 16], 1))
    return L, rrect(x, y, w, h, min(w, h) * 0.08)


def lattice(rng, n, box, dens_fn, k=3):
    x0, y0, x1, y1 = box
    pts = []
    while len(pts) < n:
        p = np.array([rng.uniform(x0, x1), rng.uniform(y0, y1)])
        if rng.rand() < dens_fn(p):
            pts.append(p)
    pts = np.array(pts)
    edges = set()
    for i in range(len(pts)):
        d = np.sqrt(((pts - pts[i]) ** 2).sum(1))
        for j in np.argsort(d)[1:k + 1]:
            edges.add((min(i, j), max(i, j)))
    return pts, sorted(edges)
