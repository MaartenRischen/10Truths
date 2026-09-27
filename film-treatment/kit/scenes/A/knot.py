"""Knot / yarn-ball generator for Direction A."""
import numpy as np
from ink import fbm1, Noise1D


def rot_basis(n):
    n = n / np.linalg.norm(n)
    a = np.array([0, 1.0, 0]) if abs(n[1]) < 0.9 else np.array([1.0, 0, 0])
    u = np.cross(n, a); u /= np.linalg.norm(u)
    v = np.cross(n, u)
    return u, v


def yarn(n_pts, wraps, seed=0, prec=1.3, nut=0.55, tilt0=0.9, rad_noise=0.08):
    """Unit yarn-ball curve in 3D (n_pts,3): great circles with slowly precessing normal."""
    t = np.linspace(0, 1, n_pts)
    rng = np.random.RandomState(seed)
    ph0 = rng.uniform(0, 2 * np.pi)
    b0 = rng.uniform(0, 2 * np.pi)
    phi = 2 * np.pi * wraps * t + ph0
    beta = b0 + 2 * np.pi * prec * t + 0.6 * Noise1D(seed + 3)(t * 6)
    alpha = tilt0 + nut * np.sin(2 * np.pi * 0.7 * t + rng.uniform(0, 6)) + 0.25 * Noise1D(seed + 4)(t * 9)
    n = np.stack([np.sin(alpha) * np.cos(beta), np.cos(alpha), np.sin(alpha) * np.sin(beta)], 1)
    out = np.zeros((n_pts, 3))
    for i in range(n_pts):
        u, v = rot_basis(n[i])
        out[i] = u * np.cos(phi[i]) + v * np.sin(phi[i])
    r = 1 + rad_noise * fbm1(seed + 7, t * 400, ((40.0, 1.0), (13.0, 0.4)))
    return out * r[:, None], t


def project_ellipsoid(Pu, center, axes, rot=0.0):
    """Scale unit curve by axes (ax, ay, az) and place at center (x,y) in screen px; returns xy, z (towards viewer +)."""
    ax, ay, az = axes
    x = Pu[:, 0] * ax
    y = -Pu[:, 1] * ay
    z = Pu[:, 2] * az
    c, s = np.cos(rot), np.sin(rot)
    X = center[0] + c * x - s * y
    Y = center[1] + s * x + c * y
    return np.stack([X, Y], 1), z


def thread(obj_pt, center, axes, wraps, seed, n=None, prec=0.3, nut=0.4, tilt0=0.6, rad_noise=0.03, rot=0.0,
           approach_bend=0.25):
    """An ember thread from an object point that winds `wraps` times around an ellipsoid.
    Returns (xy (N,2), z (N,) front>0, t (N,) 0..1 along the thread)."""
    from scene import spline, join
    n = n or int(700 * wraps)
    Pu, _ = yarn(n, wraps, seed=seed, prec=prec, nut=nut, tilt0=tilt0, rad_noise=rad_noise)
    xy, z = project_ellipsoid(Pu, center, axes, rot=rot)
    # start the orbit where it is closest to the object and facing front
    d = np.sqrt(((xy - np.asarray(obj_pt)) ** 2).sum(1)) - 40 * (z > 0)
    k = int(np.argmin(d[: max(10, n // max(1, int(wraps * 2)))]))
    xy, z = xy[k:], z[k:]
    tan = xy[min(4, len(xy) - 1)] - xy[0]
    tan /= np.linalg.norm(tan) + 1e-9
    o = np.asarray(obj_pt, float)
    dist = np.linalg.norm(xy[0] - o)
    mid = (o + xy[0]) / 2 + np.array([-(xy[0] - o)[1], (xy[0] - o)[0]]) * approach_bend
    app = spline([o, mid, xy[0] - tan * min(80, dist * 0.35), xy[0]], n_per=30, tension=0.5)
    path = join(app, xy)
    zz = np.concatenate([np.ones(len(app) - 1), z])
    zz = zz[: len(path)]
    if len(zz) < len(path):
        zz = np.concatenate([zz, np.full(len(path) - len(zz), zz[-1])])
    t = np.linspace(0, 1, len(path))
    return path, zz, t


def front_back_runs(xy, z):
    front = z > 0
    idx = np.where(np.diff(front.astype(int)) != 0)[0] + 1
    out = []
    for pidx in np.split(np.arange(len(xy)), idx):
        if len(pidx) > 2:
            out.append((pidx, bool(front[pidx[0]])))
    return out


def rodrigues(v, axis, ang):
    axis = axis / np.linalg.norm(axis)
    c, s = np.cos(ang), np.sin(ang)
    return v * c[:, None] + np.cross(axis, v) * s[:, None] + axis[None] * ((v @ axis) * (1 - c))[:, None]


def band(n, wraps, normal0, prec_axis=(0, 1, 0), prec=0.9, phase=0.0, wobble=0.0, seed=0):
    """Smooth yarn band: a great circle with normal `normal0` precessing about prec_axis by `prec` radians
    over the whole thread. Returns unit-sphere points (n,3)."""
    t = np.linspace(0, 1, n)
    n0 = np.asarray(normal0, float)
    n0 /= np.linalg.norm(n0)
    ax = np.asarray(prec_axis, float)
    normals = rodrigues(np.tile(n0, (n, 1)), ax, prec * t)
    a = np.array([0, 1.0, 0]) if abs(n0[1]) < 0.9 else np.array([1.0, 0, 0])
    u0 = np.cross(n0, a)
    u0 /= np.linalg.norm(u0)
    us = rodrigues(np.tile(u0, (n, 1)), ax, prec * t)
    vs = np.cross(normals, us)
    phi = 2 * np.pi * wraps * t + phase
    P = us * np.cos(phi)[:, None] + vs * np.sin(phi)[:, None]
    if wobble > 0:
        P *= (1 + wobble * np.sin(2 * np.pi * (wraps * 0.5) * t + seed))[:, None]
    return P


def fib_normals(k, seed=0):
    i = np.arange(k) + 0.5
    phi = np.arccos(1 - 2 * i / k)
    th = np.pi * (1 + 5 ** 0.5) * i + seed
    return np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)


def thread2(obj_pt, center, axes, wraps, normal0, prec=0.9, phase=0.0, rot=0.0, approach_bend=0.2, n=None, wobble=0.0, seed=0):
    from scene import spline, join
    n = n or int(600 * wraps)
    Pu = band(n, wraps, normal0, prec=prec, phase=phase, wobble=wobble, seed=seed)
    xy, z = project_ellipsoid(Pu, center, axes, rot=rot)
    # enter at the front point nearest the object during the first wrap
    first = max(10, int(n / wraps))
    d = np.sqrt(((xy[:first] - np.asarray(obj_pt)) ** 2).sum(1)) + 1e4 * (z[:first] < 0)
    k = int(np.argmin(d))
    xy, z = xy[k:], z[k:]
    tan = xy[min(4, len(xy) - 1)] - xy[0]
    tan /= np.linalg.norm(tan) + 1e-9
    o = np.asarray(obj_pt, float)
    dist = np.linalg.norm(xy[0] - o)
    mid = (o + xy[0]) / 2 + np.array([-(xy[0] - o)[1], (xy[0] - o)[0]]) * approach_bend
    app = spline([o, mid, xy[0] - tan * min(90, dist * 0.4), xy[0]], n_per=30, tension=0.5)
    path = join(app, xy)
    zz = np.concatenate([np.ones(len(path) - len(xy)), z])
    return path, zz, np.linspace(0, 1, len(path))
