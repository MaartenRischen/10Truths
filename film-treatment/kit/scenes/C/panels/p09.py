# P09 THE LOOP — on the cave wall the figure's own hand has drawn a charcoal loop from its chest to another figure's
# chest and back. The loop is closed. Warm firelight.
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, stencil, dots, polyline_mask, catmull, charcoal_stroke
from cavekit import figpass, paint_named, ortho_u, lit_wall, relief_shade, dust_motes
from figure import OCHRE, CHARCOAL

W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 720))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p09.png')
s = W / 1280
hf = 0.56
VW = 2.0 / hf * W / H
VH = VW * H / W
# world layout: hero at x=-1.35 facing right (+X), other at x=+1.35 facing left
figs = [
    {'name': 'hero', 'pose': 'stand', 'yaw': 72, 'ground': 0.0, 'pos': [-1.25, 0, 0],
     'mods': {'head': [4, 4, 0], 'chest': [4, 4, 0], 'rShoulder': [-44, 0, -12], 'rElbow': [-112, -26, 0], 'rWrist': [0, 0, -10],
              'lShoulder': [26, 0, 12], 'lElbow': [-14, 0, 0], 'lHip': [-8, 0, 2], 'rHip': [8, 0, -2], 'rKnee': [8, 0, 0]}},
    {'name': 'other', 'pose': 'stand', 'yaw': -72, 'ground': 0.0, 'pos': [1.25, 0, 0],
     'mods': {'head': [6, -4, 0], 'chest': [4, -4, 0], 'lShoulder': [-44, 0, 12], 'lElbow': [-112, 26, 0], 'lWrist': [0, 0, 10],
              'rShoulder': [26, 0, -12], 'rElbow': [-14, 0, 0], 'rHip': [-8, 0, -2], 'lHip': [8, 0, 2], 'lKnee': [8, 0, 0]}},
]
cz = 1.02
pre = figpass('p09', W, H, figs, {'ortho': VW, 'center': [0.0, cz]})
u = ortho_u(pre)
hero = paint_named(pre, 'hero', u, seed=11)
other = paint_named(pre, 'other', u, seed=23, pigment=hexrgb('#9c4526'))


def to_px(x, z):
    return ((x - 0.0) / VW + 0.5) * W, (0.5 - (z - cz) / VH) * H

# --- wall
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cm = 1 - np.exp(-(((xx / W - 0.5) / 0.42) ** 2 + ((yy / H - 0.5) / 0.5) ** 2))
wall = Wall(H, W, seed=33, crack_mask=cm)
st = hand_mask(H, W, 0.1 * W, 0.26 * H, 0.18 * H, angle=0.3, seed=12, spread=1.2)
wall.deposit(stencil(H, W, st, 26 * s, seed=13) * 0.4, hexrgb('#7e3420'), dry=0.5, seed=1)
pts = [(0.86 * W + (i % 4) * 0.022 * W, 0.16 * H + (i // 4) * 0.04 * H) for i in range(12)]
wall.deposit(dots(H, W, pts, 5 * s, seed=14) * 0.45, hexrgb('#a2462a'), dry=0.6, seed=2)
torches = [{'pos': (0.5, 1.02, 0.3), 'power': 1.0, 'color': (1.0, 0.85, 0.62), 'radius': 0.45, 'falloff': 1.6}]
img, Lf = lit_wall(wall, torches, focus=(0.5, 0.4), ambient=0.012, falloff_gamma=1.5)
rs = relief_shade(wall)
for lay in (other, hero):
    rgb = lay[..., :3] * ((0.92 + 0.08 * rs) * (0.85 + 0.15 * np.clip(Lf, 0, 1.0)))[..., None]
    img = over(img, np.concatenate([rgb, lay[..., 3:4]], -1))

# --- the loop: charcoal, from the hero's chest out to the other's chest and back; closed where the hand is
A = np.array(to_px(-1.02, 1.36)); B = np.array(to_px(1.02, 1.36))
C = (A + B) / 2; a = np.linalg.norm(B - A) / 2; b = 0.15 * H
t = np.linspace(0, 2 * np.pi, 500)
wob = 1 + 0.03 * np.sin(t * 3 + 1.0) + 0.016 * np.sin(t * 7 + 2.0) + 0.008 * np.sin(t * 13 + 0.5)
# starts at the hero's heart (t=pi -> leftmost point), up and over to the other's heart, under and back
P = np.stack([C[0] + a * np.cos(t + np.pi) * wob, C[1] - b * np.sin(t) * (1 + 0.08 * np.cos(t))], 1)
P = np.vstack([P, P[:18]])  # overlap the start: the loop is closed
lw = charcoal_stroke(H, W, P, 7.5 * s, seed=6, taper=0.03, press_var=0.28)
dry = smoothstep(-0.8, 0.1, fbm(H, W, 2.0 * s, 2, seed=7) - 0.6 * wall.pits)
loop_a = np.clip(lw * (0.72 + 0.28 * dry), 0, 1) * 0.95
# charcoal dust along the fresh line
loop_a = np.maximum(loop_a, blur(lw, 3 * s) * 0.18)
lit = (0.85 + 0.15 * np.clip(Lf, 0, 1.0))
img = img * (1 - loop_a[..., None]) + (CHARCOAL * 0.9)[None, None, :] * loop_a[..., None] * lit[..., None]
# embers of light where the loop closes (between the two chests the drive lets go)
glow = np.exp(-(((xx - C[0]) / (0.2 * W)) ** 2 + ((yy - C[1]) / (0.16 * H)) ** 2))
img = img + glow[..., None] * np.array([1.0, 0.7, 0.4]) * 0.06
dm = dust_motes(H, W, 60, (0.5, 0.45), 0.16, seed=8, size=1.2)
img = img + dm[..., None] * np.array([1.0, 0.75, 0.45]) * 0.45
img = img * vignette(H, W, 0.5, 1.9, 0.5, 0.5)[..., None]
img = img + grain(H, W, 0.01, seed=3)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out, 'u=%.0f' % u)
