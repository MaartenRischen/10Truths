# P08 EVERYTHING CHANGED — the repaint in progress: vertical bands of the world in successive styles (cave, fresco
# village, industrial impasto, night city, glossy CGI), each newer era brushed over the older one; the ochre figure
# stands unchanged in the middle.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, stencil, dots, charcoal_stroke, horse_lines
from cavekit import figpass, paint_named, ortho_u, lit_wall
from figure import OCHRE, CHARCOAL

W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 720))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p08.png')
s = W / 1280
R = rng(8)


def src(path, offset):
    im = load_rgb(os.path.join(WORK, path)) if not path.startswith('/') else load_rgb(path)
    im = resize(im, int(im.shape[1] * H / im.shape[0]), H)
    M = np.float32([[1, 0, -offset * s], [0, 1, 0]])
    return cv2.warpAffine(im, M, (W, H), borderMode=cv2.BORDER_REFLECT)

# era 1: the cave wall
wall = Wall(H, W, seed=91, crack_mask=np.zeros((H, W), np.float32))
st = hand_mask(H, W, 0.085 * W, 0.24 * H, 0.16 * H, angle=0.2, seed=3, spread=1.2)
wall.deposit(stencil(H, W, st, 24 * s, seed=4) * 0.7, hexrgb('#8f3a22'), dry=0.4, seed=1)
wall.deposit(dots(H, W, [(0.025 * W + i * 15 * s, 0.86 * H + np.sin(i) * 6 * s) for i in range(10)], 5 * s, seed=5), hexrgb('#a2462a'), dry=0.5, seed=2)
for k, P in enumerate(horse_lines(0.012 * W, 0.47 * H, 0.17 * W, 0.26 * H, facing=1)):
    wall.deposit(charcoal_stroke(H, W, P, 3.4 * s, seed=10 + k, taper=0.2) * 0.8, CHARCOAL, dry=0.6, seed=10 + k)
torches = [{'pos': (0.1, 0.9, 0.3), 'power': 1.0, 'color': (1.0, 0.85, 0.62), 'radius': 0.4, 'falloff': 1.4}]
cave, _ = lit_wall(wall, torches, focus=(0.1, 0.5), ambient=0.03, falloff_gamma=1.2)

eras = [cave,
        src('village_fresco.png', 330),
        src('indus_paint.png', 0),
        src('night_nofig.png', 60),
        src('cgi_nofig.png', -40)]
bounds = [0.2, 0.4, 0.6, 0.8]

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def sweep_mask(b, seed):
    """newer era on the right of x=b, brushed leftwards over the older one in horizontal strokes whose reach varies
    smoothly down the frame; stroke ends break up into dry bristle marks."""
    Rm = rng(seed)
    reach_field = vnoise(H, 8, 90 * s, seed + 1, angle=0)[:, 0] * 45 * s + 30 * s
    m = np.zeros((H, W), np.float32)
    lip = np.zeros((H, W), np.float32)
    y = -Rm.uniform(0, 10) * s
    while y < H:
        sw = Rm.uniform(14, 30) * s
        yc = int(np.clip(y + sw / 2, 0, H - 1))
        ext = reach_field[yc] + Rm.normal(0, 14) * s + (Rm.uniform(40, 110) * s if Rm.random() < 0.12 else 0)
        x_end = b * W - ext
        Ldry = Rm.uniform(18, 45) * s
        rows = (yy >= y) & (yy < y + sw)
        tt = np.clip((yy - y) / sw, 0, 1)
        edge_round = np.clip(np.sin(tt * np.pi), 0, 1) ** 0.5
        endx = x_end + (1 - edge_round) * 10 * s
        # bristle streaks: per-row random values, constant along x within this stroke
        br = rng(seed * 1000 + int(y)).random(H).astype(np.float32)
        br = cv2.GaussianBlur(br.reshape(-1, 1), (1, 3), 0.7).ravel()
        streak = br[yy.astype(int)]
        ramp = np.clip((xx - endx) / Ldry, 0, 1)            # 0 at the tip .. 1 where the paint is solid
        a = smoothstep(0.0, 0.25, ramp) * smoothstep(1 - ramp - 0.15, 1 - ramp + 0.15, streak) + smoothstep(0.85, 1.0, ramp)
        a = np.clip(a, 0, 1) * rows
        m = np.maximum(m, a)
        lip = np.maximum(lip, np.exp(-((xx - endx - Ldry * 0.9) / (4 * s)) ** 2) * rows * edge_round * 0.5)
        y += sw * Rm.uniform(0.55, 0.85)
    return np.clip(m, 0, 1), lip

img = eras[0].copy()
for i, b in enumerate(bounds):
    m, ridge = sweep_mask(b, 30 + i)
    img = img * (1 - m[..., None]) + eras[i + 1] * m[..., None]
    # the wet lip of the fresh paint: a faint highlight
    img = img + 0.05 * ridge[..., None] * m[..., None]
img = np.clip(img, 0, 1)

# the figure: unchanged, centre
hf = 0.58
VW = 2.0 / hf * W / H
feet = 0.93
cz = (feet - 0.5) * (VW * H / W)
figs = [{'name': 'hero', 'pose': 'stand', 'yaw': 18, 'ground': 0.0, 'pos': [0, 0, 0],
         'mods': {'head': [-2, 10, 0], 'chest': [0, 4, 0], 'rShoulder': [-6, 0, -6], 'lShoulder': [4, 0, 6], 'rElbow': [-10, 0, 0], 'lElbow': [-8, 0, 0]}}]
pre = figpass('p08', W, H, figs, {'ortho': VW, 'center': [0.0, cz]})
u = ortho_u(pre)
hero = paint_named(pre, 'hero', u, seed=11)
# a soft contact shadow so it stands in every world
sh = blur((hero[..., 3] > 0.5).astype(np.float32), 1)
ys, xs = np.nonzero(sh > 0.5)
fy = ys.max(); fx = xs.mean()
shadow = np.exp(-(((xx - fx) / (0.09 * W)) ** 2 + ((yy - fy) / (0.012 * H)) ** 2)) * 0.45
img = img * (1 - shadow[..., None])
img = over(img, hero)
img = img * vignette(H, W, 0.25, 2.2)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out)
