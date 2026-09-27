# P02 NOT ANTI-TECH — on the cave wall, the painted figure holds a tool: a glossy CGI phone, crisp and perfect in a
# charcoal-and-ochre hand. Beside it, the first tools, painted: a hand axe, a spear, a bone needle.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, stencil, dots, charcoal_stroke, catmull
from cavekit import ortho_u, lit_wall, relief_shade, dust_motes
from figure import figure_layer, OCHRE, CHARCOAL

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p02.png')
pre = os.path.join(WORK, 'p02')
ph = np.load(pre + '_phone.npy')
H, W = ph.shape[:2]
s = W / 1280
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
wall = Wall(H, W, seed=12, crack_mask=np.zeros((H, W), np.float32))
# painted first tools on the right: hand axe (ochre fill, charcoal knapping marks), spear, needle
ax_c = (0.74 * W, 0.4 * H)
axe = catmull([(ax_c[0], ax_c[1] - 0.17 * H), (ax_c[0] + 0.045 * W, ax_c[1] - 0.02 * H), (ax_c[0] + 0.04 * W, ax_c[1] + 0.1 * H),
               (ax_c[0], ax_c[1] + 0.14 * H), (ax_c[0] - 0.04 * W, ax_c[1] + 0.1 * H), (ax_c[0] - 0.045 * W, ax_c[1] - 0.02 * H),
               (ax_c[0], ax_c[1] - 0.17 * H)], 12)
fill = np.zeros((H, W), np.float32); cv2.fillPoly(fill, [axe.astype(np.int32)], 1.0, cv2.LINE_AA)
wall.deposit(blur(fill, 1.5 * s) * 0.8, hexrgb('#b8672f'), dry=0.6, seed=1)
wall.deposit(charcoal_stroke(H, W, axe, 4.0 * s, seed=2, taper=0.0, press_var=0.35) * 0.9, CHARCOAL, dry=0.5, seed=2)
R = rng(4)
for k in range(9):
    cx_, cy_ = ax_c[0] + R.normal(0, 0.015 * W), ax_c[1] + R.uniform(-0.12, 0.1) * H
    a = R.uniform(-0.6, 0.6)
    P = [(cx_ - np.cos(a) * 12 * s, cy_ - np.sin(a) * 12 * s), (cx_ + np.cos(a) * 12 * s, cy_ + np.sin(a) * 12 * s)]
    wall.deposit(charcoal_stroke(H, W, P, 2.2 * s, seed=10 + k, taper=0.4) * 0.6, CHARCOAL, dry=0.6, seed=10 + k)
sp0 = (0.86 * W, 0.86 * H); sp1 = (0.95 * W, 0.12 * H)
wall.deposit(charcoal_stroke(H, W, [sp0, sp1], 3.0 * s, seed=20, taper=0.1), CHARCOAL, dry=0.5, seed=20)
tip = catmull([(sp1[0], sp1[1]), (sp1[0] - 0.016 * W, sp1[1] + 0.08 * H), (sp1[0] - 0.006 * W, sp1[1] + 0.1 * H), (sp1[0] + 0.012 * W, sp1[1] + 0.07 * H), (sp1[0], sp1[1])], 8)
tf = np.zeros((H, W), np.float32); cv2.fillPoly(tf, [tip.astype(np.int32)], 1.0, cv2.LINE_AA)
wall.deposit(blur(tf, 1.0) * 0.9, hexrgb('#3a2f28'), dry=0.4, seed=21)
nd = [(0.8 * W, 0.83 * H), (0.87 * W, 0.76 * H)]
wall.deposit(charcoal_stroke(H, W, nd, 3.4 * s, seed=22, taper=0.5) * 0.9, hexrgb('#e2d2b0'), dry=0.4, seed=22)
wall.deposit(dots(H, W, [(0.805 * W, 0.825 * H)], 2.2 * s, seed=23), CHARCOAL, dry=0.2, seed=23)
st = hand_mask(H, W, 0.08 * W, 0.26 * H, 0.2 * H, angle=0.25, seed=5, spread=1.25)
wall.deposit(stencil(H, W, st, 30 * s, seed=6) * 0.45, hexrgb('#8f3a22'), dry=0.4, seed=24)

torches = [{'pos': (0.2, 1.0, 0.35), 'power': 1.0, 'color': (1.0, 0.85, 0.62), 'radius': 0.45, 'falloff': 1.5}]
img, Lf = lit_wall(wall, torches, focus=(0.45, 0.45), ambient=0.02, falloff_gamma=1.3)
# the phone's cold light on the rock around it
a = ph[..., 3]
ys, xs = np.nonzero(a > 0.5)
pcx, pcy = xs.mean(), ys.mean()
cold = np.exp(-(((xx - pcx) / (0.16 * W)) ** 2 + ((yy - pcy) / (0.2 * H)) ** 2))
img = img * (1 - 0.25 * cold[..., None]) + cold[..., None] * np.array([0.35, 0.5, 0.8]) * 0.28
# the figure
u = ortho_u(pre + '_fig')
lay = figure_layer(pre + '_fig', u, seed=11)
rs = relief_shade(wall)
lay[..., :3] = lay[..., :3] * ((0.92 + 0.08 * rs) * (0.85 + 0.15 * np.clip(Lf, 0, 1.0)))[..., None]
img = over(img, lay)
# the phone: perfect, glossy, with a little bloom
pc = ph[..., :3] / np.maximum(ph[..., 3:4], 1e-4)
pc = tonemap(bloom(pc, 1.2, weights=(0.25, 0.15, 0.08, 0.04), scale=s), 1.0, white_pt=4.0)
img = img * (1 - ph[..., 3:4]) + pc * ph[..., 3:4]
# a crisp diagonal glint across the glass (the tool is flawless)
pa = cv2.erode((a > 0.5).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
diag = (xx - pcx) * 0.8 + (yy - pcy) * 0.6
glint = (np.exp(-((diag + 6 * s) / (3.5 * s)) ** 2) * 0.55 + np.exp(-((diag - 14 * s) / (1.4 * s)) ** 2) * 0.35) * blur(pa, 0.6)
img = img + glint[..., None] * np.array([1.0, 1.0, 1.0])
glow = blur(a, 6 * s) * 0.5 + blur(a, 20 * s) * 0.3
img = img + (glow * (1 - a))[..., None] * np.array([0.45, 0.65, 1.0]) * 0.35
dm = dust_motes(H, W, 40, (0.4, 0.45), 0.2, seed=6, size=1.1)
img = img + dm[..., None] * np.array([1.0, 0.75, 0.45]) * 0.3
img = img * vignette(H, W, 0.45, 2.0, 0.45, 0.5)[..., None]
img = img + grain(H, W, 0.01, seed=7)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out)
