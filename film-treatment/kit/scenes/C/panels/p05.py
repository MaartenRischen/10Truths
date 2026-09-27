# P05 MISMATCH — split frame. Left: the figure on the cave wall, where it fits. Right: the same figure, same size,
# same place, in the glossy CGI room, where it does not.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, stencil, dots, charcoal_stroke, horse_lines
from cavekit import lit_wall, relief_shade, dust_motes
from era_cgi import cgi_grade, region, floor_reflection
from figure import figure_layer, fig_u, OCHRE, CHARCOAL

W, H = 1280, 720
HW = 640
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p05.png')
pre = os.path.join(WORK, 'p05r')
u = fig_u(pre + '_fig')
fig = figure_layer(pre + '_fig', u, seed=11)          # (720, 640, 4): the one painted figure

# right: CGI room
b = np.load(pre + '_beauty.npy')[..., :3]
right = cgi_grade(b, exposure=1.2)
right = over(right, floor_reflection(fig, region(pre, 'floor'), u))
right = over(right, fig)
right = right * vignette(H, HW, 0.12, 2.5)[..., None]

# left: the cave wall, torchlit, older marks around; the same figure painted onto it
s = 1.0
wall = Wall(H, HW, seed=71, crack_mask=np.zeros((H, HW), np.float32))
st = hand_mask(H, HW, 0.18 * HW, 0.22 * H, 0.14 * H, angle=0.3, seed=4, spread=1.2)
wall.deposit(stencil(H, HW, st, 22, seed=5) * 0.5, hexrgb('#8f3a22'), dry=0.4, seed=1)
wall.deposit(dots(H, HW, [(0.08 * HW + i * 18, 0.86 * H + np.sin(i) * 5) for i in range(8)], 5, seed=6) * 0.7, hexrgb('#a2462a'), dry=0.5, seed=2)
for k, P in enumerate(horse_lines(0.66 * HW, 0.12 * H, 0.34 * HW, 0.3 * H, facing=1)):
    wall.deposit(charcoal_stroke(H, HW, P, 3.2, seed=20 + k, taper=0.2) * 0.55, CHARCOAL, dry=0.6, seed=20 + k)
torches = [{'pos': (0.3, 1.02, 0.4), 'power': 1.0, 'color': (1.0, 0.85, 0.62), 'radius': 0.5, 'falloff': 1.5}]
left, Lf = lit_wall(wall, torches, focus=(0.5, 0.5), ambient=0.02, falloff_gamma=1.3)
rs = relief_shade(wall)
lrgb = fig[..., :3] * ((0.92 + 0.08 * rs) * (0.85 + 0.15 * np.clip(Lf, 0, 1.0)))[..., None]
left = over(left, np.concatenate([lrgb, fig[..., 3:4]], -1))
dm = dust_motes(H, HW, 30, (0.5, 0.45), 0.2, seed=3, size=1.2)
left = left + dm[..., None] * np.array([1.0, 0.75, 0.45]) * 0.35
left = left * vignette(H, HW, 0.4, 2.0)[..., None]
left = left + grain(H, HW, 0.01, seed=4)[..., None]

img = np.concatenate([np.clip(left, 0, 1), np.clip(right, 0, 1)], 1)
img[:, HW - 2:HW + 2] = np.array([0.03, 0.028, 0.025])
save(out, img)
print('wrote', out)
