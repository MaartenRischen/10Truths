# Direction C — procedural night-city backdrop (HDR, saved as EXR via Blender or as npy/png) for the CGI apartment.
import numpy as np, cv2, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutil import *


def skyline(W=4096, H=1536, seed=4, mood='night'):
    R = rng(seed)
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    # sky: deep blue-violet at top, magenta-orange urban glow near horizon (y=0.62)
    hz = 0.64
    t = np.clip(y / hz, 0, 1)
    top = np.array([0.015, 0.03, 0.1]); mid = np.array([0.06, 0.1, 0.26]); low = np.array([0.2, 0.2, 0.34])
    tt = t[..., None]
    sky = np.where(tt < 0.6, top + (mid - top) * (tt / 0.6), mid + (low - mid) * (np.clip(tt - 0.6, 0, None) / 0.4) ** 1.6)
    img = np.broadcast_to(sky, (H, W, 3)).copy()
    # continuous low city base (no sky gaps at the bottom)
    yb = int((hz + 0.08) * H)
    img[yb:] = np.array([0.012, 0.013, 0.03])
    for yy in range(yb + 6, H - 6, 16):
        for xx in range(0, W, 12):
            if R.random() < 0.12:
                img[yy:yy + 7, xx:xx + 6] = np.array([1.0, 0.7, 0.4]) * R.uniform(0.2, 0.7)
    # three depth layers of towers
    for layer, (nb, hmin, hmax, wmin, wmax, dim, winb) in enumerate([
            (70, 0.08, 0.3, 30, 90, 0.35, 0.5), (45, 0.12, 0.45, 50, 140, 0.6, 0.8), (22, 0.2, 0.62, 90, 220, 1.0, 1.0)]):
        base = hz + 0.02 * layer
        for i in range(nb):
            bw = int(R.uniform(wmin, wmax) * W / 4096); bh = R.uniform(hmin, hmax)
            x0 = int(R.uniform(-0.05, 1.0) * W); x1 = min(W, x0 + bw); x0 = max(0, x0)
            if x1 <= x0:
                continue
            y0 = int((base - bh) * H); y1 = H
            col = np.array([0.012, 0.014, 0.03]) * (0.6 + 0.4 * dim) * R.uniform(0.7, 1.2)
            img[y0:y1, x0:x1] = col + (1 - dim) * np.array([0.03, 0.03, 0.08])
            # windows grid
            cw = max(3, int(R.uniform(6, 11) * W / 4096)); chh = max(3, int(R.uniform(8, 14) * W / 4096))
            warm = R.random() < 0.6
            for yy in range(y0 + chh, y1 - chh, chh * 2):
                for xx in range(x0 + cw // 2, x1 - cw, int(cw * 1.8)):
                    if R.random() < 0.16 * winb * (0.5 + R.random()):
                        c = np.array([1.0, 0.72, 0.42]) if (warm and R.random() < 0.8) else np.array([0.62, 0.8, 1.0])
                        img[yy:yy + chh, xx:xx + cw] = c * R.uniform(0.3, 1.3) * dim
            if R.random() < 0.4:  # aviation light
                cx = (x0 + x1) // 2
                cv2.circle(img, (cx, y0 - 4), max(2, int(4 * W / 4096)), (3.0, 0.15, 0.1), -1)
    # a few big glowing billboard-ish colour washes (no content)
    for i in range(3):
        cx, cy = int(R.uniform(0.1, 0.9) * W), int(R.uniform(0.35, 0.55) * H)
        rr = int(R.uniform(60, 140) * W / 4096)
        g = np.zeros((H, W), np.float32); cv2.circle(g, (cx, cy), rr, 1.0, -1)
        g = blur(g, rr * 0.6)
        img += g[..., None] * np.array([[0.2, 0.5, 1.2], [1.0, 0.25, 0.6], [0.3, 1.0, 0.9]][i]) * 0.5
    # depth of field
    img = blur(img, 3.5 * W / 4096)
    return img.astype(np.float32)


def skyline_day(W=4096, H=1536, seed=6):
    R = rng(seed)
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    hz = 0.68
    t = np.clip(y / hz, 0, 1)[..., None]
    top = np.array([0.18, 0.36, 0.85]); low = np.array([0.75, 0.85, 1.0])
    img = np.broadcast_to(top + (low - top) * t ** 1.5, (H, W, 3)).copy() * 2.2
    for layer, (nb, hmin, hmax, wmin, wmax, tone) in enumerate([(60, 0.06, 0.25, 40, 110, 0.85), (40, 0.1, 0.42, 60, 160, 0.7), (18, 0.2, 0.6, 110, 260, 0.55)]):
        base = hz + 0.03 * layer
        for i in range(nb):
            bw = int(R.uniform(wmin, wmax) * W / 4096); bh = R.uniform(hmin, hmax)
            x0 = int(R.uniform(-0.05, 1.0) * W); x1 = min(W, x0 + bw); x0 = max(0, x0)
            if x1 <= x0:
                continue
            y0 = int((base - bh) * H)
            glass = np.array([0.55, 0.68, 0.85]) * tone * R.uniform(0.85, 1.15) * 2.0
            img[y0:, x0:x1] = glass
            # vertical sky-reflection gradient + mullion lines
            g = np.linspace(1.25, 0.8, H - y0)[:, None, None]
            img[y0:, x0:x1] *= g
            step = max(4, int(R.uniform(10, 18) * W / 4096))
            img[y0:, x0:x1:step] *= 0.82
            if R.random() < 0.5:  # sun catching one face
                xm = x0 + int((x1 - x0) * R.uniform(0.5, 0.8))
                img[y0:, xm:x1] *= 1.35
    img[int((hz + 0.09) * H):] = np.array([0.5, 0.56, 0.62]) * 1.6
    img = blur(img, 2.5 * W / 4096)
    return img.astype(np.float32)


if __name__ == '__main__':
    out = sys.argv[1]
    im = skyline_day() if 'day' in out else skyline()
    np.save(out, im)
    save(out.replace('.npy', '_preview.png'), tonemap(im, exposure=2.0))
