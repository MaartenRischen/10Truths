# P16 CLOSE — pull back: the new world is painted on the same cave wall as P01, continuous with the first handprint.
# A second, fresh handprint sits beside the first.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, print_hand, stencil, dots, charcoal_stroke, horse_lines
from cavekit import lit_wall, dust_motes
from figure import OCHRE, CHARCOAL

W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 720))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p16.png')
s = W / 1280
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
wall = Wall(H, W, seed=21, crack_mask=np.zeros((H, W), np.float32))

# the old marks of P01, now seen from further back
st = hand_mask(H, W, 0.06 * W, 0.24 * H, 0.1 * H, angle=0.25, seed=5, spread=1.3)
wall.deposit(stencil(H, W, st, 16 * s, seed=6) * 0.5, hexrgb('#8f3a22'), dry=0.4, seed=1)
wall.deposit(dots(H, W, [(0.03 * W + i * 13 * s, 0.84 * H + np.sin(i * 0.6) * 4 * s) for i in range(9)], 4 * s, seed=9) * 0.8, hexrgb('#a2462a'), dry=0.55, seed=3)
old = hand_mask(H, W, 0.14 * W, 0.5 * H, 0.15 * H, angle=0.12, seed=2, spread=1.15)
wall.deposit(print_hand(H, W, old, seed=3) * 0.8, hexrgb('#9c4a2c'), dry=0.7, seed=6)       # the first handprint, old
new = hand_mask(H, W, 0.235 * W, 0.47 * H, 0.155 * H, angle=-0.1, seed=12, spread=1.1)
wall.deposit(print_hand(H, W, new, seed=13), OCHRE * 1.06, dry=0.25, seed=7)                   # the fresh one

# the mural: the new world, painted onto the rock with a brushed, irregular edge
mural = load_rgb(os.path.join(OUT, 'p15.png'))
mx0, mx1, my0, my1 = 0.33 * W, 0.97 * W, 0.12 * H, 0.84 * H
mw, mh = int(mx1 - mx0), int(my1 - my0)
mimg = resize(mural, mw, mh)
M = np.float32([[1, 0, int(mx0)], [0, 1, int(my0)]])
canvas = cv2.warpAffine(mimg, M, (W, H), borderMode=cv2.BORDER_REFLECT)
cxm, cym = (mx0 + mx1) / 2, (my0 + my1) / 2
dx = (xx - cxm) / ((mx1 - mx0) / 2); dy = (yy - cym) / ((my1 - my0) / 2)
r = np.maximum(np.abs(dx) ** 4 + np.abs(dy) ** 4, 0) ** 0.25          # squircle
edge = 1 - r + 0.05 * fbm(H, W, 40 * s, 3, seed=31) + 0.03 * vnoise(H, W, 8 * s, 32)
ma = smoothstep(0.0, 0.07, edge)
ma = ma * (0.88 + 0.12 * smoothstep(-0.4, 0.3, fbm(H, W, 3 * s, 2, seed=33)))
wall.deposit_rgba(np.concatenate([canvas, ma[..., None] * 0.97], -1))
wall.pigment_lit = np.maximum(wall.pigment_lit, ma)

torches = [{'pos': (0.25, 1.05, 0.45), 'power': 1.0, 'color': (1.0, 0.86, 0.64), 'radius': 0.6, 'falloff': 1.2},
           {'pos': (0.85, 1.1, 0.4), 'power': 0.7, 'color': (1.0, 0.8, 0.55), 'radius': 0.6, 'falloff': 1.2}]
img, Lf = lit_wall(wall, torches, focus=(0.6, 0.45), ambient=0.03, falloff_gamma=1.1)
# the fresh print is still wet: a faint sheen on it
wet = blur(new, 1.0) * smoothstep(0.55, 0.95, luma(img))
img = img + wet[..., None] * 0.04
dm = dust_motes(H, W, 60, (0.4, 0.45), 0.25, seed=7, size=1.1)
img = img + dm[..., None] * np.array([1.0, 0.75, 0.45]) * 0.3
img = img * vignette(H, W, 0.5, 1.9, 0.52, 0.5)[..., None]
img = img + grain(H, W, 0.01, seed=5)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out)
