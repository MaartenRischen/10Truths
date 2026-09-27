# Direction C — loop.mp4 motion test: "Everything changed, except you." A locked camera; the world repaints itself
# through six eras with brush sweeps while the ochre figure in the middle stays untouched (boiling at 12 fps).
import sys, os, subprocess, shutil
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, stencil, dots, charcoal_stroke, horse_lines
from cavekit import paint_named, ortho_u, lit_wall
from figure import CHARCOAL

W, H = 1280, 720
FPS = 24
fdir = os.path.join(WORK, 'loop_frames')
shutil.rmtree(fdir, ignore_errors=True); os.makedirs(fdir)

# ---- era plates
wall = Wall(H, W, seed=91, crack_mask=np.zeros((H, W), np.float32))
st = hand_mask(H, W, 0.16 * W, 0.28 * H, 0.2 * H, angle=0.2, seed=3, spread=1.2)
wall.deposit(stencil(H, W, st, 30, seed=4) * 0.7, hexrgb('#8f3a22'), dry=0.4, seed=1)
st2 = hand_mask(H, W, 0.84 * W, 0.3 * H, 0.17 * H, angle=-0.3, seed=7, spread=1.1)
wall.deposit(stencil(H, W, st2, 26, seed=8) * 0.5, hexrgb('#6d2d1c'), dry=0.5, seed=2)
wall.deposit(dots(H, W, [(0.1 * W + i * 22, 0.86 * H + np.sin(i) * 6) for i in range(14)], 6, seed=5), hexrgb('#a2462a'), dry=0.5, seed=3)
for k, P in enumerate(horse_lines(0.66 * W, 0.52 * H, 0.26 * W, 0.34 * H, facing=-1)):
    wall.deposit(charcoal_stroke(H, W, P, 4.0, seed=10 + k, taper=0.2) * 0.8, CHARCOAL, dry=0.6, seed=10 + k)
cave, _ = lit_wall(wall, [{'pos': (0.5, 1.0, 0.35), 'power': 1.0, 'color': (1.0, 0.85, 0.62), 'radius': 0.45, 'falloff': 1.4}],
                   focus=(0.5, 0.45), ambient=0.03, falloff_gamma=1.2)
cave = cave * vignette(H, W, 0.45, 2.0)[..., None]
plates = [np.clip(cave, 0, 1)] + [resize(load_rgb(os.path.join(WORK, f)), W, H) for f in
                                  ('village_fresco.png', 'indus_paint.png', 'night_nofig.png', 'cgi_nofig.png', 'new_nofig.png')]

# ---- the figure (P08's pass), three boil drawings cycled at 12 fps
pre = os.path.join(WORK, 'p08_fig')
u = ortho_u(pre)
boils = [paint_named(pre, 'hero', u, seed=11, boil=b) for b in range(3)]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
sh = (boils[0][..., 3] > 0.5)
ys, xs = np.nonzero(sh)
shadow = np.exp(-(((xx - xs.mean()) / (0.09 * W)) ** 2 + ((yy - ys.max()) / (0.012 * H)) ** 2)) * 0.45


def stroke_rows(seed):
    R = rng(seed)
    reach = np.zeros(H, np.float32); Ld = np.zeros(H, np.float32); endoff = np.zeros(H, np.float32)
    smooth = vnoise(H, 8, 90, seed + 1, angle=0)[:, 0] * 70
    y = 0
    while y < H:
        sw = int(R.uniform(14, 30))
        r = smooth[min(H - 1, y + sw // 2)] + R.normal(0, 18) + (R.uniform(40, 120) if R.random() < 0.12 else 0)
        L = R.uniform(20, 55)
        for k in range(y, min(H, y + sw)):
            tt = (k - y) / max(1, sw - 1)
            reach[k] = r; Ld[k] = L; endoff[k] = (1 - np.clip(np.sin(tt * np.pi), 0, 1) ** 0.5) * 12
        y += int(sw * R.uniform(0.6, 0.9)) + 1
    br = cv2.GaussianBlur(R.random(H).astype(np.float32).reshape(-1, 1), (1, 3), 0.7).ravel()
    return reach, Ld, endoff, br


def sweep(b, rows):
    """new paint coming from the left; stroke tips at x = b + reach(y) - endoff(y)"""
    reach, Ld, endoff, br = rows
    xe = (b + reach - endoff)[:, None]
    ramp = np.clip((xe - xx) / Ld[:, None], 0, 1)
    streak = br[:, None]
    a = smoothstep(0.0, 0.25, ramp) * smoothstep(1 - ramp - 0.15, 1 - ramp + 0.15, streak) + smoothstep(0.85, 1.0, ramp)
    lip = np.exp(-((xx - xe + 4) / 4.0) ** 2) * (1 - endoff[:, None] / 12)
    return np.clip(a, 0, 1), lip

# ---- timeline: hold 10, then 5 x (sweep 14 + hold 8), last hold extended to 120 frames
HOLD0, SW, HOLD = 10, 14, 8
events = []
f = 0
for i in range(len(plates) - 1):
    start = HOLD0 + i * (SW + HOLD)
    events.append((start, start + SW, i, stroke_rows(100 + i)))
NF = 120
for fi in range(NF):
    era = 0
    img = plates[0]
    for (s0, s1, i, rows) in events:
        if fi >= s1:
            img = plates[i + 1]; era = i + 1
        elif fi >= s0:
            t = (fi - s0 + 1) / (s1 - s0)
            t = t * t * (3 - 2 * t)
            b = -0.35 * W + t * 1.5 * W
            m, lip = sweep(b, rows)
            img = plates[i] * (1 - m[..., None]) + plates[i + 1] * m[..., None]
            img = img + (lip * m)[..., None] * 0.05
            break
    img = img * (1 - shadow[..., None])
    img = over(img, boils[(fi // 2) % 3])               # 12 fps boil
    img = img + grain(H, W, 0.008, seed=fi)[..., None]
    save(os.path.join(fdir, f'{fi:04d}.png'), np.clip(img, 0, 1))
out = os.path.join(OUT, 'loop.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(fdir, '%04d.png'),
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', out], check=True)
print('wrote', out, os.path.getsize(out) // 1024, 'KB')
