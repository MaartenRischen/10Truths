# P01 OPEN — torch-lit limestone wall; the oldest ochre handprint; beside it the ochre manikin, just come alive.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, print_hand, stencil, dots, polyline_mask, catmull, horse_lines
from cavekit import figpass, paint_named, ortho_u, lit_wall, relief_shade, dust_motes
from figure import OCHRE

W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 720))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p01.png')
s = W / 1280

# --- figure: ortho camera; frame spans view width VW world units
VW = 6.0 * 16 / 9 * 0.62 * 1.0          # tune: figure height fraction
hf = 0.6                                  # figure height as fraction of frame
VW = 2.0 / hf * W / H
fx, fy_feet = 0.6, 0.86                   # where the figure stands in the frame
cx = -(fx - 0.5) * VW
cz = (fy_feet - 0.5) * (VW * H / W) + 0.0
figs = [{'name': 'hero', 'pose': 'stand', 'yaw': -14, 'ground': 0.0, 'pos': [0, 0, 0],
         'mods': {'head': [-4, -38, 4], 'chest': [0, -10, 0], 'rShoulder': [-38, 0, -20], 'rElbow': [-24, 0, 0],
                  'rWrist': [0, 0, 10], 'lShoulder': [4, 0, 7], 'lElbow': [-10, 0, 0], 'lHip': [-2, 0, 4], 'rHip': [4, 0, -2], 'rKnee': [6, 0, 0]}}]
pre = figpass('p01', W, H, figs, {'ortho': VW, 'center': [cx, cz]})
u = ortho_u(pre)
hero = paint_named(pre, 'hero', u, seed=11)

# --- wall
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cm = 1 - np.exp(-(((xx / W - 0.6) / 0.16) ** 2 + ((yy / H - 0.55) / 0.4) ** 2))
wall = Wall(H, W, seed=21, crack_mask=cm)
# faded older marks first (under), then the handprint
st = hand_mask(H, W, 0.13 * W, 0.3 * H, 0.2 * H, angle=0.25, seed=5, spread=1.3)
wall.deposit(stencil(H, W, st, 30 * s, seed=6) * 0.55, hexrgb('#8f3a22'), dry=0.4, seed=1)
st2 = hand_mask(H, W, 0.2 * W, 0.2 * H, 0.17 * H, angle=-0.35, seed=7, spread=1.1)
wall.deposit(stencil(H, W, st2, 26 * s, seed=8) * 0.35, hexrgb('#6d2d1c'), dry=0.5, seed=2)
pts = [(0.08 * W + i * 0.028 * W, 0.8 * H + np.sin(i * 0.6) * 0.012 * H) for i in range(9)]
wall.deposit(dots(H, W, pts, 7 * s, seed=9) * 0.8, hexrgb('#a2462a'), dry=0.55, seed=3)
pts2 = [(0.84 * W + (i % 3) * 0.025 * W, 0.2 * H + (i // 3) * 0.04 * H) for i in range(9)]
wall.deposit(dots(H, W, pts2, 5.5 * s, seed=10) * 0.5, hexrgb('#2a211c'), dry=0.6, seed=4)
for k, P in enumerate(horse_lines(0.8 * W, 0.36 * H, 0.26 * W, 0.42 * H)):
    wall.deposit(polyline_mask(H, W, P, 4.2 * s, seed=11 + k, wobble=0.5 * s) * 0.8, hexrgb('#231c17'), dry=0.6, seed=5 + k)
hand = hand_mask(H, W, 0.35 * W, 0.44 * H, 0.26 * H, angle=0.12, seed=2, spread=1.15)
wall.deposit(print_hand(H, W, hand, seed=3), OCHRE, dry=0.55, seed=6)

torches = [{'pos': (0.26, 1.02, 0.36), 'power': 1.0, 'color': (1.0, 0.86, 0.66), 'radius': 0.4, 'falloff': 1.7},
           {'pos': (1.1, 0.25, 0.25), 'power': 0.08, 'color': (1.0, 0.6, 0.35), 'radius': 0.4}]
img, Lf = lit_wall(wall, torches, focus=(0.47, 0.5), ambient=0.012, falloff_gamma=1.55)
# hero figure: its own paint, laid onto the rock relief
rs = relief_shade(wall)
hero_rgb = hero[..., :3] * ((0.92 + 0.08 * rs) * (0.85 + 0.15 * np.clip(Lf, 0, 1.0)))[..., None]
img = over(img, np.concatenate([hero_rgb, hero[..., 3:4]], -1))
# warm dust in the torchlight: the moment it comes alive
dm = dust_motes(H, W, 90, (0.55, 0.42), 0.13, seed=4, size=1.3)
img = img + dm[..., None] * np.array([1.0, 0.75, 0.45]) * 0.6
img = img * vignette(H, W, 0.55, 1.8, 0.47, 0.5)[..., None]
img = img + grain(H, W, 0.01, seed=2)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out, 'u=%.0f' % u)
