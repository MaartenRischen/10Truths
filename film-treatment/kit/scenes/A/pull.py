"""The pull: a loosened knot around the figure whose end is pulled out into a straight horizon."""
import numpy as np
from scene import *
from knot import band, project_ellipsoid, front_back_runs, fib_normals


def pulled_thread(ctr, axes, hy, x_coil_end, x_end, n_knot_wraps=4.5, coil_loops=4.5, knot_normal=(0.35, 0.8, 0.45),
                  prec=2.2, phase=0.3, coil_amp=0.5, exit_y=0.15):
    """Returns path (N,2), z (N,) (>0 front), temp (N,), part (N,) 0 knot / 1 coil / 2 straight."""
    ax, ay, az = axes
    Pu = band(int(800 * n_knot_wraps), n_knot_wraps, knot_normal, prec=prec, phase=phase)
    xyA, zA = project_ellipsoid(Pu, ctr, axes)
    last = int(len(xyA) * (1 - 1 / n_knot_wraps))
    score = -xyA[last:, 0] + 1e4 * (zA[last:] < 0) + np.abs(xyA[last:, 1] - (ctr[1] + ay * exit_y)) * 0.8
    j = last + int(np.argmin(score))
    xyA, zA = xyA[:j + 1], zA[:j + 1]
    p0 = xyA[-1]
    tan0 = xyA[-1] - xyA[-6]
    tan0 /= np.linalg.norm(tan0)
    # B: pulled spring: loops shrink and sink to the horizon
    u = np.linspace(0, 1, 2400)
    L = x_coil_end - p0[0]
    r = ay * coil_amp * (1 - u) ** 1.25
    yc = p0[1] + (hy - p0[1]) * (1 - (1 - u) ** 1.6)
    ph = 2 * np.pi * coil_loops * u
    # loop spacing widens as it is pulled (the far end is taut)
    xs = p0[0] + L * (u ** 1.35)
    xB = xs - r * np.sin(ph) * 0.9
    yB = yc - r * (1 - np.cos(ph)) * 0.55
    xyB = np.stack([xB, yB], 1)
    # smooth handoff from the knot's exit tangent
    k = 90
    w = (np.linspace(0, 1, k) ** 2)[:, None]
    lead = p0 + np.cumsum(np.tile(tan0 * (L / 2400 * 1.6 + 0.6), (k, 1)), 0)
    xyB[:k] = lead * (1 - w) + xyB[:k] * w
    xC = np.linspace(xyB[-1, 0], x_end, 400)
    xyC = np.stack([xC, np.full_like(xC, hy)], 1)
    xyC[:, 1] = hy + (xyB[-1, 1] - hy) * np.exp(-(xC - xC[0]) / 20)
    path = np.vstack([xyA, xyB[1:], xyC[1:]])
    z = np.concatenate([zA, np.ones(len(xyB) - 1), np.ones(len(xyC) - 1)])
    part = np.concatenate([np.zeros(len(xyA)), np.ones(len(xyB) - 1), np.full(len(xyC) - 1, 2)])
    s = arclen(path)
    sA = arclen(xyA)[-1]
    sB = sA + arclen(xyB)[-1]
    f = np.clip((s - sA) / (sB - sA), 0, 1)
    temp = np.where(s <= sA, 1.0, (1 - f) ** 1.6)
    return path, z, temp, part
