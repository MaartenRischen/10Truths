# P07 TUNED DRIVES — a cave frieze of small scenes: desire and the jealous third; sharing meat; a dance around the fire
# with one turned away; a stranger in a different pigment; two hands touching; a burial with flowers.
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, print_hand, stencil, dots, charcoal_stroke, catmull
from cavekit import figpass, paint_named, ortho_u, lit_wall, relief_shade, dust_motes
from figure import OCHRE, CHARCOAL

W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 720))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p07.png')
PREVIEW = os.environ.get('PREVIEW') == '1'
s = W / 1280
VW = 12.8; VH = VW * H / W; cz = 0.0
G1, G2 = 0.28, -2.95            # ground lines of the two rows (world z)
C = [-4.25, 0.0, 4.25]          # column centres
SC = 0.84                       # figure scale


def px(x, z):
    return ((x - 0.0) / VW + 0.5) * W, (0.5 - (z - cz) / VH) * H

figs = [
    # 1 desire + the jealous third
    {'name': 'd1', 'pose': 'stand', 'yaw': 90, 'pos': [C[0] - 1.05, 0, 0], 'mods': {'rShoulder': [-58, 0, 0], 'rElbow': [-14, 0, 0], 'head': [4, 0, 0], 'chest': [4, 0, 0], 'lShoulder': [18, 0, 8]}},
    {'name': 'd2', 'pose': 'stand', 'yaw': -90, 'pos': [C[0] - 0.2, 0, 0], 'mods': {'lShoulder': [-58, 0, 0], 'lElbow': [-14, 0, 0], 'head': [4, 0, 0], 'chest': [4, 0, 0], 'rShoulder': [18, 0, -8]}},
    {'name': 'd3', 'pose': 'stand', 'yaw': 60, 'pos': [C[0] + 1.35, 0, 0], 'mods': {'head': [10, -70, 0], 'chest': [4, -20, 0],
        'lShoulder': [-20, 30, -30], 'lElbow': [-125, 0, 0], 'rShoulder': [-20, -30, 30], 'rElbow': [-125, 0, 0], 'lHip': [0, 0, 6], 'rHip': [2, 0, -2]}},
    # 2 reciprocity: sharing meat
    {'name': 'm1', 'pose': 'stand', 'yaw': 90, 'pos': [C[1] - 0.72, 0, 0], 'mods': {'rShoulder': [-78, 0, 0], 'rElbow': [-12, 0, 0], 'chest': [6, 0, 0], 'lShoulder': [14, 0, 8], 'lHip': [-14, 0, 2], 'rHip': [8, 0, -2], 'rKnee': [10, 0, 0]}},
    {'name': 'm2', 'pose': 'stand', 'yaw': -90, 'pos': [C[1] + 0.72, 0, 0], 'mods': {'lShoulder': [-66, 0, 0], 'lElbow': [-26, 0, 0], 'chest': [8, 0, 0], 'head': [10, 0, 0], 'rShoulder': [10, 0, -8]}},
    # 3 belonging and shame: a dance around the fire, one turned away
    {'name': 'n1', 'pose': 'walk', 'yaw': 70, 'pos': [C[2] - 1.35, 0, 0], 'mods': {'lShoulder': [-150, 0, 30], 'rShoulder': [-160, 0, -22], 'lElbow': [-20, 0, 0], 'rElbow': [-20, 0, 0], 'head': [-10, 0, 0]}},
    {'name': 'n2', 'pose': 'walk', 'yaw': -10, 'pos': [C[2] - 0.35, 0, 0], 'mods': {'lShoulder': [-20, 0, 120], 'rShoulder': [-20, 0, -120], 'lElbow': [-30, 0, 0], 'rElbow': [-30, 0, 0], 'head': [-12, 0, 0]}},
    {'name': 'n3', 'pose': 'walk', 'yaw': -70, 'pos': [C[2] + 0.55, 0, 0], 'mods': {'lShoulder': [-160, 0, 22], 'rShoulder': [-150, 0, -30], 'lElbow': [-20, 0, 0], 'rElbow': [-20, 0, 0], 'head': [-10, 0, 0]}},
    {'name': 'n4', 'pose': 'slump', 'yaw': 88, 'pos': [C[2] + 1.75, 0, 0], 'mods': {'head': [38, 0, 0], 'chest': [20, 0, 0], 'lShoulder': [6, 0, 4], 'rShoulder': [6, 0, -4], 'lHip': [-6, 0, 0], 'rHip': [6, 0, 0]}},
    # 4 wariness of strangers: the band on the right, a stranger in another pigment at the left edge
    {'name': 's1', 'pose': 'stand', 'yaw': 90, 'pos': [C[0] - 1.45, 0, 0], 'mods': {'head': [0, 0, 0], 'lShoulder': [-8, 0, 10], 'rShoulder': [-8, 0, -10]}},
    {'name': 's2', 'pose': 'walk', 'yaw': -90, 'pos': [C[0] + 0.35, 0, 0], 'mods': {'rShoulder': [-150, 0, -10], 'rElbow': [-30, 0, 0], 'chest': [-8, 0, 0], 'lShoulder': [-40, 0, 20], 'lElbow': [-60, 0, 0], 'lHip': [14, 0, 2], 'rHip': [-18, 0, -2]}},
    {'name': 's3', 'pose': 'stand', 'yaw': -90, 'pos': [C[0] + 1.25, 0, 0], 'mods': {'chest': [-10, 0, 0], 'head': [-6, 0, 0], 'lShoulder': [-60, 0, 30], 'lElbow': [-70, 0, 0], 'rShoulder': [10, 0, -8]}},
    # 6 grief: the dead curled on its side, a mourner kneeling
    {'name': 'g1', 'pose': 'lieCurl', 'rot': [0, 0, 90], 'pos': [C[2] - 0.55, 0, 0], 'mods': {'head': [30, 0, 0]}},
    {'name': 'g2', 'pose': 'kneelGrief', 'yaw': -90, 'pos': [C[2] + 0.85, 0, 0], 'mods': {}},
]
for f in figs:
    f['scale'] = SC
    row1 = f['name'][0] in 'dmn'
    f['ground'] = G1 if row1 else G2
    f['pos'][1] = 0.0
pre = figpass('p07', W, H, figs, {'ortho': VW, 'center': [0.0, cz]})
u1 = ortho_u(pre, SC)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
wall = Wall(H, W, seed=57, crack_mask=np.zeros((H, W), np.float32))
R = rng(9)
pig = {'s1': hexrgb('#2c2622')}   # the stranger: manganese black
lays = {}
for i, f in enumerate(figs):
    lays[f['name']] = paint_named(pre, f['name'], u1, seed=200 + 17 * i, pigment=pig.get(f['name'], None if f['name'] in ('d1', 'm2', 'n4', 'g2') else [hexrgb('#a9492a'), hexrgb('#b95f36'), hexrgb('#9a4127')][i % 3]), smears=1)

# props: meat (sharing), the small fire (dance), spear (wariness), grave + flowers (grief), two hands (touch)
Xm, Ym = px(C[1], G1 + 1.1 * SC)
meat = np.zeros((H, W), np.float32)
cv2.ellipse(meat, (int(Xm - 4 * s), int(Ym)), (int(22 * s), int(12 * s)), -12, 0, 360, 1.0, -1, cv2.LINE_AA)
bone = charcoal_stroke(H, W, [(Xm + 14 * s, Ym - 5 * s), (Xm + 36 * s, Ym - 10 * s)], 5 * s, seed=3, taper=0.0)
wall.deposit(blur(meat, 0.8), hexrgb('#7c2f1c'), dry=0.4, seed=1)
wall.deposit(bone, hexrgb('#e3d6bd'), dry=0.3, seed=2)
Xf, Yf = px(C[2] - 0.35 - 0.5, G1 + 0.02)
fire = np.zeros((H, W), np.float32)
for k in range(4):
    cx_ = Xf + R.normal(0, 6) * s; hh = R.uniform(28, 46) * s; ww = R.uniform(7, 10) * s
    P = [(cx_ - ww, Yf), (cx_ - ww * 0.5, Yf - hh * 0.5), (cx_ + R.normal(0, 3) * s, Yf - hh), (cx_ + ww * 0.5, Yf - hh * 0.5), (cx_ + ww, Yf)]
    cv2.fillPoly(fire, [np.array(catmull(P, 8), np.int32)], 1.0, cv2.LINE_AA)
wall.deposit(blur(fire, 0.8), hexrgb('#c9772f'), dry=0.3, seed=3)
X1, Y1 = px(C[0] + 0.35, G2 + 1.5 * SC)
wall.deposit(charcoal_stroke(H, W, [(X1 - 20 * s, Y1 + 70 * s), (X1 + 16 * s, Y1 - 60 * s)], 2.8 * s, seed=5, taper=0.25), CHARCOAL, dry=0.5, seed=5)
# grave: charcoal oval around the curled body, flowers (yellow and red ochre dots with little stems)
ga = lays['g1'][..., 3]
gy_, gx_ = np.nonzero(ga > 0.5)
Xg, Yg = float(gx_.mean()), float(gy_.mean())
gw = (gx_.max() - gx_.min()) * 0.62 + 14 * s; gh = (gy_.max() - gy_.min()) * 0.5 + 16 * s
t = np.linspace(0, 2 * np.pi, 300)
P = np.stack([Xg + gw * np.cos(t), Yg + gh * np.sin(t)], 1)
wall.deposit(charcoal_stroke(H, W, np.vstack([P, P[:10]]), 3.2 * s, seed=6, taper=0.0) * 0.8, CHARCOAL, dry=0.6, seed=6)
fl = [(Xg + gw * np.cos(a) * R.uniform(0.7, 1.0), Yg - gh * abs(np.sin(a)) - R.uniform(4, 14) * s) for a in np.linspace(0.35, np.pi - 0.35, 14)]
for k, (fx_, fy_) in enumerate(fl):
    wall.deposit(charcoal_stroke(H, W, [(fx_, fy_), (fx_ + R.normal(0, 2) * s, fy_ + 10 * s)], 1.3 * s, seed=100 + k, taper=0.2) * 0.6, hexrgb('#3d4a2a'), dry=0.4, seed=100 + k)
wall.deposit(dots(H, W, fl[::2], 3.4 * s, seed=7), hexrgb('#dca64c'), dry=0.3, seed=7)
wall.deposit(dots(H, W, fl[1::2], 3.2 * s, seed=8), hexrgb('#b8452a'), dry=0.3, seed=8)
# touch: two handprints meeting at the fingertips
Xt, Yt = px(C[1], G2 + 0.95)
HL = 120 * s
h1 = hand_mask(H, W, Xt - 0.9 * HL, Yt + 10 * s, HL, angle=-1.57 + 0.12, seed=21, spread=0.8)
h2 = hand_mask(H, W, Xt + 0.9 * HL, Yt - 4 * s, HL, angle=1.57 + 0.12, seed=22, spread=0.8)
wall.deposit(print_hand(H, W, h1, seed=23), OCHRE, dry=0.5, seed=9)
wall.deposit(print_hand(H, W, h2, seed=24) * 0.95, hexrgb('#8f3a22'), dry=0.5, seed=10)
# a few ground-line ledges and ancient dots between scenes
for k, (x, z) in enumerate([(-2.1, G1 + 0.8), (2.1, G1 + 0.8), (-2.1, G2 + 0.8), (2.1, G2 + 0.8)]):
    X, Y = px(x, z)
    wall.deposit(dots(H, W, [(X, Y - i * 16 * s) for i in range(4)], 3.6 * s, seed=30 + k) * 0.7, hexrgb('#a4462a'), dry=0.5, seed=30 + k)

for name, lay in lays.items():
    wall.deposit_rgba(lay)
torches = [{'pos': (0.5, 0.5, 0.45), 'power': 1.0, 'color': (1.0, 0.85, 0.62), 'radius': 0.55, 'falloff': 1.3}]
img, Lf = lit_wall(wall, torches, focus=(0.5, 0.45), ambient=0.03, falloff_gamma=1.1)
dm = dust_motes(H, W, 40, (0.5, 0.45), 0.2, seed=8, size=1.1)
img = img + dm[..., None] * np.array([1.0, 0.75, 0.45]) * 0.35
img = img * vignette(H, W, 0.42, 2.0, 0.5, 0.5)[..., None]
img = img + grain(H, W, 0.01, seed=3)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out)
