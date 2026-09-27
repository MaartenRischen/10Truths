"""A patent-drawing machine: ruler and compass only (constant-width, no wobble)."""
import numpy as np
from scene import circle, seg
from ink import ruled


def rect(x0, y0, x1, y1):
    return np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], float)


def gear(c, r, teeth, depth, ph=0.0, n_per=10):
    a = np.linspace(0, 2 * np.pi, teeth * n_per + 1) + ph
    k = (a - ph) / (2 * np.pi / teeth) % 1.0
    rr = r + np.where((k > 0.15) & (k < 0.55), depth, 0.0)
    return np.stack([c[0] + rr * np.cos(a), c[1] + rr * np.sin(a)], 1)


def hatch(poly, spacing, ang=np.pi / 4):
    """Ruled hatching clipped to a convex polygon."""
    P = np.asarray(poly, float)
    d = np.array([np.cos(ang), np.sin(ang)])
    nrm = np.array([-d[1], d[0]])
    proj = P @ nrm
    out = []
    for o in np.arange(proj.min() + spacing / 2, proj.max(), spacing):
        # intersect line {x : x.nrm = o} with polygon edges
        pts = []
        for i in range(len(P) - 1):
            a, b = P[i], P[i + 1]
            pa, pb = a @ nrm - o, b @ nrm - o
            if pa * pb < 0:
                t = pa / (pa - pb)
                pts.append(a + (b - a) * t)
        if len(pts) >= 2:
            pts = sorted(pts, key=lambda p: p @ d)
            out.append(np.array([pts[0], pts[-1]]))
    return out


def machine(C, x0, gy, s=1.0, w=1.5, dens=1.0):
    """Draws the machine with its base at ground gy, left edge x0. Returns anchor points."""
    L = []
    def R(P, ww=None, dd=None):
        C.add(ruled(np.asarray(P, float), w=(ww or w) * s ** 0.5, dens=(dd or dens)))
    # plinth and feet
    px0, px1 = x0, x0 + 400 * s
    R(rect(px0, gy - 22 * s, px1, gy - 4 * s))
    for fx in (px0 + 20 * s, px1 - 44 * s):
        R(rect(fx, gy - 4 * s, fx + 24 * s, gy))
    # cabinet (front face + side face in oblique projection)
    cx0, cx1, cy0, cy1 = x0 + 40 * s, x0 + 250 * s, gy - 250 * s, gy - 22 * s
    dx, dy = 46 * s, -30 * s
    R(rect(cx0, cy0, cx1, cy1))
    side = np.array([[cx1, cy1], [cx1 + dx, cy1 + dy], [cx1 + dx, cy0 + dy], [cx1, cy0], [cx1, cy1]])
    top = np.array([[cx0, cy0], [cx0 + dx, cy0 + dy], [cx1 + dx, cy0 + dy], [cx1, cy0], [cx0, cy0]])
    R(side); R(top)
    for h in hatch(side[:4].tolist() + [side[0].tolist()], 6 * s, ang=np.radians(60)):
        R(h, ww=0.9, dd=0.55 * dens)
    # front panel with rivets and a slot
    R(rect(cx0 + 16 * s, cy0 + 16 * s, cx1 - 16 * s, cy1 - 16 * s), ww=1.1, dd=0.8 * dens)
    for xx in np.linspace(cx0 + 10 * s, cx1 - 10 * s, 9):
        for yy in (cy0 + 8 * s, cy1 - 8 * s):
            R(circle(xx, yy, 2.0 * s), ww=0.9, dd=0.7 * dens)
    # dial (a gauge whose needle is pinned past the red)
    dc = np.array([cx0 + 70 * s, cy0 + 75 * s]); dr = 30 * s
    R(circle(dc[0], dc[1], dr)); R(circle(dc[0], dc[1], dr - 5 * s), ww=0.9, dd=0.6 * dens)
    for a in np.linspace(np.radians(200), np.radians(340), 8):
        R(np.array([dc + (dr - 5 * s) * np.array([np.cos(a), np.sin(a)]), dc + (dr - 11 * s) * np.array([np.cos(a), np.sin(a)])]), ww=0.9)
    a = np.radians(352)
    R(np.array([dc, dc + (dr - 7 * s) * np.array([np.cos(a), np.sin(a)])]), ww=1.6)
    # coin slot on the front, and a chute protruding out to the left
    sl = np.array([cx0 + 28 * s, cy1 - 64 * s])
    R(rect(sl[0], sl[1], sl[0] + 56 * s, sl[1] + 9 * s))
    ch_top = [np.array([sl + [0, 9 * s], sl + [-88 * s, 50 * s]]), np.array([sl + [56 * s, 9 * s], sl + [-32 * s, 50 * s]])]
    for c_ in ch_top:
        R(c_)
    R(np.array([sl + [-88 * s, 50 * s], sl + [-32 * s, 50 * s]]))
    R(np.array([sl + [-88 * s, 50 * s], sl + [-88 * s, 56 * s], sl + [-32 * s, 56 * s], sl + [-32 * s, 50 * s]]), ww=1.0)
    lip = sl + np.array([-64 * s, 58 * s])
    # spool on A-frame supports (where the ember threads wind)
    sp_c = np.array([cx0 + 70 * s, cy0 - 70 * s]); sp_r = 36 * s; sp_len = 90 * s
    for xx in (sp_c[0] - 10 * s, sp_c[0] + sp_len + 10 * s):
        R(np.array([[xx - 24 * s, cy0], [xx, sp_c[1]], [xx + 24 * s, cy0]]))
    R(circle(sp_c[0], sp_c[1], sp_r * 0.33, ry=sp_r))
    R(circle(sp_c[0] + sp_len, sp_c[1], sp_r * 0.33, ry=sp_r, th0=-np.pi / 2, sweep=np.pi))
    R(np.array([[sp_c[0], sp_c[1] - sp_r], [sp_c[0] + sp_len, sp_c[1] - sp_r]]))
    R(np.array([[sp_c[0], sp_c[1] + sp_r], [sp_c[0] + sp_len, sp_c[1] + sp_r]]))
    # gear train from the spool axle to the flywheel
    g1 = np.array([sp_c[0] + sp_len + 34 * s, sp_c[1]])
    R(gear(g1, 20 * s, 12, 5 * s)); R(circle(g1[0], g1[1], 4 * s))
    g2 = g1 + np.array([44 * s, 26 * s])
    R(gear(g2, 30 * s, 18, 5 * s, ph=0.12)); R(circle(g2[0], g2[1], 5 * s))
    # flywheel on the right
    fw = np.array([cx1 + dx + 70 * s, gy - 130 * s]); fr = 108 * s
    R(circle(fw[0], fw[1], fr), ww=2.0); R(circle(fw[0], fw[1], fr - 9 * s), ww=1.0, dd=0.8 * dens)
    R(circle(fw[0], fw[1], 12 * s)); R(circle(fw[0], fw[1], 5 * s))
    for k in range(8):
        a = k * np.pi / 4 + 0.2
        R(np.array([fw + 12 * s * np.array([np.cos(a), np.sin(a)]), fw + (fr - 9 * s) * np.array([np.cos(a), np.sin(a)])]), ww=1.2)
    # support stand for the flywheel axle
    R(np.array([[fw[0] - 40 * s, gy - 22 * s], [fw[0], fw[1]], [fw[0] + 40 * s, gy - 22 * s]]))
    # belt from gear 2 to the flywheel hub pulley
    R(circle(fw[0], fw[1], 26 * s), ww=1.0)
    t1 = np.array([g2[0], g2[1] - 30 * s]); t2 = np.array([fw[0], fw[1] - 26 * s])
    b1 = np.array([g2[0], g2[1] + 30 * s]); b2 = np.array([fw[0], fw[1] + 26 * s])
    R(np.array([t1, t2]), ww=1.1); R(np.array([b1, b2]), ww=1.1)
    # the crank: an arm and handle on the flywheel, turned by the machine itself
    a = np.radians(-50)
    cp = fw + (fr * 0.72) * np.array([np.cos(a), np.sin(a)])
    R(np.array([fw, cp]), ww=2.4)
    R(circle(cp[0], cp[1], 6 * s))
    hdl = cp + np.array([30 * s, 0])
    R(np.array([cp, hdl]), ww=2.2)
    R(circle(hdl[0] + 9 * s, hdl[1], 9 * s, ry=6 * s), ww=1.8)
    # the spinning arrow around the flywheel
    arc = circle(fw[0], fw[1], fr + 20 * s, th0=-2.2, sweep=1.4)
    R(arc, ww=1.2, dd=0.8 * dens)
    e = arc[-1]; d = arc[-1] - arc[-4]; d /= np.linalg.norm(d); nrm = np.array([-d[1], d[0]])
    R(np.array([e - d * 11 * s + nrm * 6 * s, e, e - d * 11 * s - nrm * 6 * s]), ww=1.2, dd=0.8 * dens)
    return {'spool': (sp_c, sp_r, sp_len), 'lip': lip, 'ground': gy}
