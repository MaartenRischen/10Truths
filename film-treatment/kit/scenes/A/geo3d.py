"""Simple 3D solids (as meshes for the label/depth pass) + their drawable edges, and depth-tested line drawing."""
import numpy as np


class Solid:
    def __init__(self):
        self.v = []
        self.f = []
        self.edges = []   # list of (N,3) polylines to draw

    def add_quad(self, a, b, c, d):
        i = len(self.v)
        self.v += [a, b, c, d]
        self.f += [i, i + 1, i + 2, i, i + 2, i + 3]

    def add_tri(self, a, b, c):
        i = len(self.v)
        self.v += [a, b, c]
        self.f += [i, i + 1, i + 2]

    def prop(self):
        return {'type': 'mesh', 'v': [float(x) for p in self.v for x in p], 'f': self.f}


def box(x0, x1, y0, y1, z0, z1, edges=True):
    s = Solid()
    P = lambda x, y, z: [x, y, z]
    c = [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]
    for q in [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (3, 2, 6, 7), (0, 3, 7, 4), (1, 2, 6, 5)]:
        s.add_quad(*[c[i] for i in q])
    if edges:
        for a, b in [(0, 1), (1, 2), (2, 3), (3, 0), (4, 5), (5, 6), (6, 7), (7, 4), (0, 4), (1, 5), (2, 6), (3, 7)]:
            s.edges.append(np.array([c[a], c[b]], float))
    return s


def house(x0, x1, z0, z1, h, roof_h, facing='z', solar=True, windows=True, door_side=None, rng=None):
    """House body box + gable roof (ridge along x if facing z). Returns Solid with facade detail edges."""
    s = box(x0, x1, 0, h, z0, z1)
    if facing == 'z':
        xm = (x0 + x1) / 2
        r0, r1 = [xm, h + roof_h, z0 - 0.15], [xm, h + roof_h, z1 + 0.15]
        # roof as two sloped quads over the long side along z? make gable ends on x-sides
        zm = (z0 + z1) / 2
        A = [x0 - 0.15, h, z0 - 0.15]; B = [x1 + 0.15, h, z0 - 0.15]; Cc = [x1 + 0.15, h, z1 + 0.15]; D = [x0 - 0.15, h, z1 + 0.15]
        R0 = [x0 - 0.15, h + roof_h, zm]; R1 = [x1 + 0.15, h + roof_h, zm]
        s.add_quad(A, B, R1, R0); s.add_quad(D, Cc, R1, R0); s.add_tri(A, R0, D); s.add_tri(B, R1, Cc)
        s.edges += [np.array([A, B]), np.array([D, Cc]), np.array([R0, R1]), np.array([A, R0, D]), np.array([B, R1, Cc])]
        front_z = z1
        if solar:
            # solar panel grid on the front roof slope (D-C-R1-R0)
            for i in range(1, 6):
                t = i / 6
                p = [np.array(D) * (1 - t) + np.array(Cc) * t, np.array(R0) * (1 - t) + np.array(R1) * t]
                s.edges.append(np.array([p[0] + (p[1] - p[0]) * 0.12, p[0] + (p[1] - p[0]) * 0.88]))
            for t in (0.12, 0.5, 0.88):
                a = np.array(D) + (np.array(R0) - np.array(D)) * t
                b = np.array(Cc) + (np.array(R1) - np.array(Cc)) * t
                s.edges.append(np.array([a + (b - a) * 0.06, b - (b - a) * 0.06]))
        if windows:
            nw = max(1, int((x1 - x0) / 1.3))
            for fl in range(int(h / 2.6)):
                y = 1.3 + fl * 2.6
                for k in range(nw):
                    cx = x0 + (k + 0.5) * (x1 - x0) / nw
                    if door_side is not None and fl == 0 and k == door_side:
                        s.edges.append(np.array([[cx - 0.45, 0, front_z + 0.01], [cx - 0.45, 2.1, front_z + 0.01], [cx + 0.45, 2.1, front_z + 0.01], [cx + 0.45, 0, front_z + 0.01]]))
                        continue
                    s.edges.append(np.array([[cx - 0.4, y - 0.1, front_z + 0.01], [cx + 0.4, y - 0.1, front_z + 0.01], [cx + 0.4, y + 1.0, front_z + 0.01], [cx - 0.4, y + 1.0, front_z + 0.01], [cx - 0.4, y - 0.1, front_z + 0.01]]))
    return s


def rot_y(s, ang, about=(0, 0, 0)):
    c, sn = np.cos(ang), np.sin(ang)
    a = np.array(about, float)
    R = np.array([[c, 0, sn], [0, 1, 0], [-sn, 0, c]])
    s.v = [list(R @ (np.array(p) - a) + a) for p in s.v]
    s.edges = [(R @ (e - a).T).T + a for e in s.edges]
    return s


def translate(s, d):
    d = np.array(d, float)
    s.v = [list(np.array(p) + d) for p in s.v]
    s.edges = [e + d for e in s.edges]
    return s


def visible_polyline(ex, P3, step_px=1.0, eps=0.035, self_ok=True):
    """Depth-tested projection of a 3D polyline. Returns list of visible 2D runs."""
    P3 = np.asarray(P3, float)
    pts = []
    for i in range(len(P3) - 1):
        a, b = P3[i], P3[i + 1]
        pa, _ = ex.project(a[None])
        pb, _ = ex.project(b[None])
        n = max(2, int(np.linalg.norm(pb[0] - pa[0]) / step_px))
        t = np.linspace(0, 1, n)[:, None]
        seg = a * (1 - t) + b * t
        pts.append(seg if i == 0 else seg[1:])
    X = np.vstack(pts)
    P2, dep = ex.project(X)
    ss = ex.ss
    xi = np.clip((P2[:, 0] * ss).astype(int), 1, ex.lw - 2)
    yi = np.clip((P2[:, 1] * ss).astype(int), 1, ex.lh - 2)
    D = ex.depth
    m = np.minimum.reduce([D[yi + dy, xi + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    vis = dep <= m + eps * dep
    inside = (P2[:, 0] > -50) & (P2[:, 0] < ex.lw / ss + 50) & (P2[:, 1] > -50) & (P2[:, 1] < ex.lh / ss + 50)
    vis &= inside
    out = []
    idx = np.where(np.diff(np.r_[0, vis.astype(int), 0]) != 0)[0]
    for a_, b_ in zip(idx[::2], idx[1::2]):
        if b_ - a_ >= 3:
            out.append(P2[a_:b_])
    return out
