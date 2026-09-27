# P06 HUMAN-SIZED — the cave wall at full glory: a band painted around a fire. Ring 1: five figures at the fire
# (the few you would die for). Ring 2: fifty marks - walkers, children, hunters and dots (the band). Ring 3: 150 faint
# dots (the ones you knew by name). The painted fire is also the light.
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cave import Wall, hand_mask, stencil, dots, charcoal_stroke, catmull
from cavekit import figpass, paint_named, ortho_u, lit_wall, relief_shade, dust_motes
from figure import OCHRE, CHARCOAL

W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 720))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p06.png')
s = W / 1280
VW = 12.8; VH = VW * H / W; cz = 0.0
FX, FZ = 0.0, -0.55          # fire centre (world)
rings = [(1.75, 0.62), (3.9, 1.55), (5.95, 2.75)]


def px(x, z):
    return ((x - 0.0) / VW + 0.5) * W, (0.5 - (z - cz) / VH) * H


def on_ring(i, deg):
    rx, rz = rings[i]
    a = math.radians(deg)
    return FX + rx * math.cos(a), FZ + rz * math.sin(a)

figs = []
# ring 1: five at the fire
r1 = [(112, 'sitCrossFire', 18, 0.5, {'head': [6, 10, 0]}), (160, 'sitCrossFire', 90, 0.52, {'head': [14, 0, 0]}),
      (20, 'kneel', -90, 0.52, {'rShoulder': [-70, 0, -6], 'rElbow': [-20, 0, 0], 'head': [26, 0, 0]}),
      (238, 'sitHugKnees', 150, 0.5, {}), (302, 'sitCrossFire', 212, 0.5, {'lShoulder': [-60, 0, 30], 'lElbow': [-40, 0, 0]})]
for k, (deg, pose, yaw, sc, mods) in enumerate(r1):
    x, z = on_ring(0, deg)
    figs.append({'name': f'a{k}', 'pose': pose, 'mods': mods, 'yaw': yaw, 'scale': sc, 'pos': [x, 0.5 - k * 0.1, 0], 'ground': z})
# ring 2: the band - walkers, a mother and child, hunters, a carrier, a child running
r2 = [(128, 'walk', 90, 0.42, {}), (140, 'walk', 90, 0.27, {'lShoulder': [-40, 0, 20]}),       # adult + child
      (60, 'walk', -90, 0.42, {'rShoulder': [-60, 0, -8], 'rElbow': [-30, 0, 0]}),             # hunter (spear)
      (48, 'walk', -90, 0.42, {'rShoulder': [-60, 0, -8], 'rElbow': [-30, 0, 0]}),             # hunter (spear)
      (200, 'carry', 90, 0.42, {}), (178, 'stand', 30, 0.4, {'rShoulder': [-10, 0, -40]}),
      (250, 'walk', 90, 0.4, {}), (285, 'reachUp', -20, 0.28, {}),                              # child reaching
      (322, 'walk', -90, 0.41, {}), (8, 'stand', -30, 0.4, {'lShoulder': [-20, 0, 50]})]
for k, (deg, pose, yaw, sc, mods) in enumerate(r2):
    x, z = on_ring(1, deg)
    figs.append({'name': f'b{k}', 'pose': pose, 'mods': mods, 'yaw': yaw, 'scale': sc, 'pos': [x, 1.0, 0], 'ground': z})
pre = figpass('p06', W, H, figs, {'ortho': VW, 'center': [0.0, cz]})
u1 = ortho_u(pre)

# --- wall & marks
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
wall = Wall(H, W, seed=44, crack_mask=np.zeros((H, W), np.float32))
R = rng(3)
# ring lines (faint ochre) and dots
for i, (rx, rz) in enumerate(rings):
    t = np.linspace(0, 2 * np.pi, 420)
    P = np.stack([px(FX + rx * np.cos(a) * (1 + 0.01 * np.sin(5 * a + i)), FZ + rz * np.sin(a))[0] for a in t] and
                 [[px(FX + rx * np.cos(a) * (1 + 0.012 * np.sin(5 * a + i)), FZ + rz * np.sin(a) * (1 + 0.01 * np.cos(3 * a)))[0] for a in t],
                  [px(FX + rx * np.cos(a) * (1 + 0.012 * np.sin(5 * a + i)), FZ + rz * np.sin(a) * (1 + 0.01 * np.cos(3 * a)))[1] for a in t]], 1)
    lw = charcoal_stroke(H, W, P, (3.2 - i * 0.7) * s, seed=10 + i, taper=0.0, press_var=0.4)
    wall.deposit(lw * (0.55 - i * 0.12), hexrgb('#a4462a'), dry=0.6, seed=20 + i)
# ring 2 dots: 50 marks in total = 10 figures + 40 dots
pts = []
for k in range(40):
    a = 2 * math.pi * (k + 0.5) / 40 + R.normal(0, 0.03)
    x, z = FX + rings[1][0] * math.cos(a), FZ + rings[1][1] * math.sin(a)
    X, Y = px(x, z)
    if min((X - px(*on_ring(1, d))[0]) ** 2 + (Y - px(*on_ring(1, d))[1]) ** 2 for d, *_ in r2) < (30 * s) ** 2:
        continue
    pts.append((X, Y - 4 * s))
wall.deposit(dots(H, W, pts, 5.2 * s, seed=21), OCHRE, dry=0.5, seed=31)
# ring 3: 150 dots
pts = []
for k in range(150):
    a = 2 * math.pi * (k + 0.5) / 150 + R.normal(0, 0.012)
    X, Y = px(FX + rings[2][0] * math.cos(a), FZ + rings[2][1] * math.sin(a))
    pts.append((X, Y))
wall.deposit(dots(H, W, pts, 3.4 * s, seed=22) * 0.75, hexrgb('#9f4528'), dry=0.55, seed=32)
# hunters' spears (charcoal)
for k in (2, 3):
    x, z = on_ring(1, r2[k][0])
    X, Y = px(x, z)
    P = [(X - 32 * s, Y - 88 * s), (X + 30 * s, Y - 40 * s)]
    wall.deposit(charcoal_stroke(H, W, P, 2.6 * s, seed=40 + k, taper=0.3), CHARCOAL, dry=0.5, seed=41 + k)
# the fire: tongues of red and yellow ochre, charcoal logs, a thin smoke, ember dots
Xf, Yf = px(FX, FZ + 0.02)
outer = np.zeros((H, W), np.float32); inner = np.zeros((H, W), np.float32)
def tongue(canvas, cx, base, hgt, wid, lean, curl):
    P = [(cx - wid, base), (cx - wid * 0.8 + lean * 0.2, base - hgt * 0.3), (cx - wid * 0.35 + lean * 0.6 + curl, base - hgt * 0.68),
         (cx + lean + curl * 1.6, base - hgt), (cx + wid * 0.3 + lean * 0.55, base - hgt * 0.62), (cx + wid * 0.75 + lean * 0.15, base - hgt * 0.28),
         (cx + wid, base)]
    cv2.fillPoly(canvas, [np.array(catmull(P, 10), np.int32)], 1.0, cv2.LINE_AA)
for k in range(7):
    tongue(outer, Xf + R.normal(0, 14) * s, Yf, R.uniform(60, 108) * s, R.uniform(13, 19) * s, R.normal(0, 7) * s, R.normal(0, 6) * s)
for k in range(5):
    tongue(inner, Xf + R.normal(0, 9) * s, Yf, R.uniform(34, 62) * s, R.uniform(8, 12) * s, R.normal(0, 5) * s, R.normal(0, 4) * s)
wall.deposit(blur(outer, 0.9 * s) * 0.95, hexrgb('#b8452a'), dry=0.35, seed=50)
wall.deposit(blur(inner, 0.9 * s) * 0.95, hexrgb('#dca64c'), dry=0.3, seed=51)
logs = [[(Xf - 48 * s, Yf + 9 * s), (Xf + 44 * s, Yf - 4 * s)], [(Xf - 42 * s, Yf - 4 * s), (Xf + 50 * s, Yf + 10 * s)]]
for k, P in enumerate(logs):
    wall.deposit(charcoal_stroke(H, W, P, 7 * s, seed=60 + k, taper=0.25), CHARCOAL, dry=0.5, seed=61 + k)
for k in range(0):
    x0 = Xf + (-6 + 12 * k) * s
    P = catmull([(x0, Yf - 118 * s), (x0 + (10 - 20 * k) * s, Yf - 150 * s), (x0 + (-4 + 10 * k) * s, Yf - 182 * s), (x0 + (12 - 22 * k) * s, Yf - 215 * s)], 10)
    wall.deposit(charcoal_stroke(H, W, P, 2.0 * s, seed=70 + k, taper=0.45) * 0.32, CHARCOAL, dry=0.75, seed=71 + k)
wall.deposit(dots(H, W, [(Xf + R.normal(0, 26) * s, Yf - R.uniform(112, 160) * s) for _ in range(8)], 2.2 * s, seed=80), hexrgb('#dca64c'), dry=0.4, seed=81)
# older marks at the edges
st = hand_mask(H, W, 0.07 * W, 0.2 * H, 0.15 * H, angle=0.3, seed=12, spread=1.2)
wall.deposit(stencil(H, W, st, 22 * s, seed=13) * 0.4, hexrgb('#7e3420'), dry=0.5, seed=90)

# painted band figures deposited onto the wall (they are part of the wall painting, lit by the fire)
pig = {'a': [None, hexrgb('#a9492a'), None, hexrgb('#9a4127'), hexrgb('#b1532f')],
       'b': [hexrgb('#a4462a'), hexrgb('#b95f36'), hexrgb('#3b2f28'), hexrgb('#3b2f28'), hexrgb('#9a4127'),
             hexrgb('#a9492a'), hexrgb('#a4462a'), hexrgb('#b95f36'), hexrgb('#9a4127'), hexrgb('#a9492a')]}
hero_lay = None
for f in figs:
    g, k = f['name'][0], int(f['name'][1:])
    p = pig[g][k]
    lay = paint_named(pre, f['name'], u1 * f['scale'], seed=100 + len(f['name']) * 7 + k * 13, pigment=p, smears=1)
    if f['name'] == 'a0':
        hero_lay = lay           # the hero: the one facing us at the fire - composited unlit like everywhere
        continue
    wall.deposit_rgba(lay)

torches = [{'pos': (Xf / W, (Yf - 40 * s) / H, 0.16), 'power': 1.0, 'color': (1.0, 0.8, 0.55), 'radius': 0.3, 'falloff': 1.4}]
img, Lf = lit_wall(wall, torches, focus=(Xf / W, (Yf - 60 * s) / H), ambient=0.03, falloff_gamma=1.1)
rs = relief_shade(wall)
rgb = hero_lay[..., :3] * ((0.92 + 0.08 * rs) * (0.85 + 0.15 * np.clip(Lf, 0, 1.0)))[..., None]
img = over(img, np.concatenate([rgb, hero_lay[..., 3:4]], -1))
# fire glow
glow = np.exp(-(((xx - Xf) / (0.12 * W)) ** 2 + ((yy - (Yf - 50 * s)) / (0.12 * H)) ** 2))
img = img + glow[..., None] * np.array([1.0, 0.62, 0.3]) * 0.1
dm = dust_motes(H, W, 50, (Xf / W, (Yf - 120 * s) / H), 0.07, seed=8, size=1.1)
img = img + dm[..., None] * np.array([1.0, 0.7, 0.35]) * 0.5
img = img * vignette(H, W, 0.45, 2.0, 0.5, 0.55)[..., None]
img = img + grain(H, W, 0.01, seed=3)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out)
