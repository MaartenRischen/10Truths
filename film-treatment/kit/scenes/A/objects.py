"""Small line-drawn objects (screen space) for the litany of unmet needs."""
import numpy as np
from scene import circle, rrect, seg, poly, spline, jitter, handwrite


def star(cx, cy, r, filled=False):
    a = np.linspace(-np.pi / 2, -np.pi / 2 + 2 * np.pi, 11)
    rr = np.where(np.arange(11) % 2 == 0, r, r * 0.45)
    return np.stack([cx + rr * np.cos(a), cy + rr * np.sin(a)], 1)


def star_rating(cx, cy, s):
    out = []
    for i in range(5):
        P = star(cx + (i - 2) * s * 2.3, cy, s)
        out.append(P)
        if i < 2:  # two filled-ish: inner star
            out.append(star(cx + (i - 2) * s * 2.3, cy, s * 0.5))
    return out


def bed(cx, cy, s):
    # empty bed in 3/4: mattress box, headboard, pillow, legs
    w, h = 2.6 * s, 0.9 * s
    x0, y0 = cx - w / 2, cy
    L = [poly((x0, y0), (x0 + w, y0), (x0 + w + 0.5 * s, y0 - 0.45 * s), (x0 + 0.5 * s, y0 - 0.45 * s), (x0, y0)),
         poly((x0, y0), (x0, y0 + 0.35 * s), (x0 + w, y0 + 0.35 * s), (x0 + w, y0)),
         poly((x0 + w + 0.5 * s, y0 - 0.45 * s), (x0 + w + 0.5 * s, y0 - 0.1 * s), (x0 + w, y0 + 0.35 * s)),
         poly((x0 + 0.1 * s, y0 - 0.05 * s), (x0 + 0.1 * s, y0 - 1.1 * s), (x0 + 0.6 * s, y0 - 1.45 * s), (x0 + 0.6 * s, y0 - 0.45 * s)),
         rrect(x0 + 0.55 * s, y0 - 0.42 * s, 0.7 * s, 0.25 * s, 0.1 * s),
         seg((x0 + 0.1 * s, y0 + 0.35 * s), (x0 + 0.1 * s, y0 + 0.6 * s)),
         seg((x0 + w - 0.1 * s, y0 + 0.35 * s), (x0 + w - 0.1 * s, y0 + 0.6 * s))]
    return L


def chair(cx, cy, s):
    L = [poly((cx - 0.5 * s, cy), (cx + 0.5 * s, cy), (cx + 0.7 * s, cy - 0.25 * s), (cx - 0.3 * s, cy - 0.25 * s), (cx - 0.5 * s, cy)),
         seg((cx - 0.5 * s, cy), (cx - 0.5 * s, cy + 0.9 * s)), seg((cx + 0.5 * s, cy), (cx + 0.5 * s, cy + 0.9 * s)),
         seg((cx + 0.7 * s, cy - 0.25 * s), (cx + 0.7 * s, cy + 0.6 * s)),
         poly((cx - 0.3 * s, cy - 0.25 * s), (cx - 0.3 * s, cy - 1.3 * s), (cx + 0.7 * s, cy - 1.3 * s), (cx + 0.7 * s, cy - 0.25 * s)),
         seg((cx - 0.3 * s, cy - 0.8 * s), (cx + 0.7 * s, cy - 0.8 * s))]
    return L


def window(cx, cy, s):
    w, h = 1.3 * s, 1.7 * s
    L = [rrect(cx - w / 2, cy - h / 2, w, h, 0.05 * s), seg((cx, cy - h / 2), (cx, cy + h / 2)),
         seg((cx - w / 2, cy - 0.1 * s), (cx + w / 2, cy - 0.1 * s)),
         seg((cx - w / 2 - 0.15 * s, cy + h / 2 + 0.05 * s), (cx + w / 2 + 0.15 * s, cy + h / 2 + 0.05 * s))]
    return L, (cx - w / 2, cy - h / 2, w, h)


def globe(cx, cy, r):
    L = [circle(cx, cy, r)]
    for k in (-0.5, 0.0, 0.5):
        L.append(circle(cx, cy, r * abs(np.cos(k * 1.2)) if k else r * 0.35, -np.pi / 2, np.pi, ry=r) if k else circle(cx, cy, r * 0.35, 0, 2 * np.pi, ry=r))
    for y in (-0.45, 0.0, 0.45):
        rr = r * np.sqrt(1 - y * y)
        L.append(circle(cx, cy + y * r, rr, 0, np.pi, ry=rr * 0.25))
    # small flames licking at the top
    for i, (dx, hh) in enumerate([(-0.35, 0.5), (0.05, 0.75), (0.4, 0.45)]):
        bx, by = cx + dx * r, cy - r * np.sqrt(max(0.0, 1 - dx * dx)) + 2
        t = np.linspace(0, 2 * np.pi, 60)
        x = 0.16 * r * np.sin(t) * (1 + np.cos(t / 2)) / 2 * 1.8
        y = -hh * r * (1 - np.cos(t / 2)) / 2
        L.append(np.stack([bx + x, by + y], 1))
    return L


def zigzag_feed(x, y0, y1, w, n):
    ys = np.linspace(y0, y1, n)
    pts = [(x + (w if i % 2 else 0), yy) for i, yy in enumerate(ys)]
    return [np.array(pts, float)]


def wrapper(cx, cy, s):
    # candy wrapper: pillow with twisted ends
    body = rrect(cx - 0.6 * s, cy - 0.35 * s, 1.2 * s, 0.7 * s, 0.3 * s)
    L = [body]
    for sd in (-1, 1):
        ex = cx + sd * 0.6 * s
        L.append(poly((ex, cy - 0.12 * s), (ex + sd * 0.55 * s, cy - 0.45 * s), (ex + sd * 0.45 * s, cy),
                      (ex + sd * 0.55 * s, cy + 0.45 * s), (ex, cy + 0.12 * s)))
    L.append(seg((cx - 0.25 * s, cy - 0.2 * s), (cx + 0.2 * s, cy + 0.2 * s)))
    return L
