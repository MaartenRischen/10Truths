# Direction C — era 4 (v2): the lonely night city. A corner diner cut diagonally across the frame, a sharp wedge of
# cool yellow-green fluorescent light on the pavement, manikins at the counter each lit by a phone.
# usage: python diner2.py <tag> <W> <H> [preset]   env: SPP, OV
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *
import bpy

tag = sys.argv[1]; W = int(sys.argv[2]); H = int(sys.argv[3])
preset = sys.argv[4] if len(sys.argv) > 4 else 'hero'
samples = int(os.environ.get('SPP', '32'))
OV = json.loads(os.environ.get('OV', '{}'))
reset()
world_color((0.002, 0.006, 0.005), 1.0)
M = {
    'street': principled('street2', (0.016, 0.024, 0.021), 0.8),
    'walk': principled('walk2', (0.2, 0.22, 0.19), 0.9),
    'curb': principled('curb2', (0.26, 0.27, 0.24), 0.9),
    'upper': principled('upper2', (0.08, 0.075, 0.065), 0.9),
    'trim': principled('trim2', (0.015, 0.06, 0.045), 0.6),
    'band': principled('band2', (0.36, 0.34, 0.24), 0.7),
    'wallin': principled('wallin2', (0.66, 0.66, 0.36), 0.85),
    'wallin2': principled('wallin3', (0.5, 0.56, 0.4), 0.85),
    'ceil': principled('ceil2', (0.7, 0.76, 0.56), 0.8),
    'floorin': principled('floorin2', (0.32, 0.3, 0.22), 0.7),
    'cfront': principled('cfront2', (0.46, 0.4, 0.26), 0.7),
    'ctop': principled('ctop2', (0.26, 0.09, 0.05), 0.4),
    'chrome': principled('chrome2', (0.75, 0.76, 0.72), 0.2, metal=1.0),
    'seat': principled('seat2', (0.32, 0.05, 0.03), 0.5),
    'man': principled('man2', (0.28, 0.2, 0.13), 0.6),
    'dark': principled('dark2', (0.008, 0.012, 0.011), 0.3),
    'tube': emission_mat('tube2', (0.88, 1.0, 0.72), 7.0),
    'screen': emission_mat('screen2', (0.66, 0.84, 1.0), 9.0),
    'phone': principled('phone2', (0.02, 0.02, 0.02), 0.3),
    'upwin': emission_mat('upwin2', (1.0, 0.72, 0.4), 0.45),
    'board': principled('board2', (0.05, 0.1, 0.07), 0.6),
    'cup': principled('cup2', (0.82, 0.8, 0.72), 0.4),
}
world = []
def add(o):
    world.append(o); return o

# ground: street, pavement wrapping the corner (building occupies x<0, y>0; corner chamfered at the origin)
add(plane('street', (80, 80), (0, 0, 0), mat=M['street']))
add(box('walkA', (40, 3.2, 0.15), (-14, -1.6, 0.075), mat=M['walk']))
add(box('walkB', (3.2, 40, 0.15), (1.6, 14, 0.075), mat=M['walk']))
add(box('walkC', (3.2, 3.2, 0.15), (1.6, -1.6, 0.075), mat=M['walk']))
add(box('curbA', (40, 0.22, 0.17), (-14, -3.3, 0.085), mat=M['curb']))
add(box('curbB', (0.22, 40, 0.17), (3.3, 14, 0.085), mat=M['curb']))
add(box('curbC', (0.22, 3.5, 0.17), (3.3, -1.55, 0.085), mat=M['curb']))
add(box('curbD', (3.5, 0.22, 0.17), (1.55, -3.3, 0.085), mat=M['curb']))
# building shell above the diner (dark), windows mostly dark, one lit
Z0, Z1 = 0.9, 3.2           # window band
add(box('upperA', (30, 0.4, 12), (-15, 0.2, Z1 + 0.9 + 6), mat=M['upper']))
add(box('upperB', (0.4, 30, 12), (-0.2, 15, Z1 + 0.9 + 6), mat=M['upper']))
for i in range(7):
    x = -2.8 - i * 3.1
    for fl in range(3):
        lit = (i == 3 and fl == 0) or (i == 5 and fl == 1)
        add(box('upwA', (1.3, 0.1, 1.7), (x, -0.02, Z1 + 2.0 + fl * 3.0), mat=M['upwin'] if lit else M['dark']))
for i in range(3):
    y = 2.6 + i * 3.1
    for fl in range(3):
        add(box('upwB', (0.1, 1.3, 1.7), (0.02, y, Z1 + 2.0 + fl * 3.0), mat=M['dark']))
# diner facade: low wall, sign band, trim, mullions; the corner is glass (chamfer)
LA = 15.0; LB = 7.0
add(box('lowA', (LA, 0.3, Z0 - 0.15), (-LA / 2 - 0.9, 0.15, 0.15 + (Z0 - 0.15) / 2), mat=M['trim']))
add(box('lowB', (0.3, LB, Z0 - 0.15), (-0.15, LB / 2 + 0.9, 0.15 + (Z0 - 0.15) / 2), mat=M['trim']))
add(box('bandA', (LA + 1.2, 0.36, 0.8), (-LA / 2 - 0.4, 0.1, Z1 + 0.45), mat=M['band']))
add(box('bandB', (0.36, LB + 1.2, 0.8), (-0.1, LB / 2 + 0.4, Z1 + 0.45), mat=M['band']))
add(box('corniceA', (LA + 1.4, 0.55, 0.14), (-LA / 2 - 0.4, 0.0, Z1 + 0.9), mat=M['trim']))
add(box('corniceB', (0.55, LB + 1.4, 0.14), (0.0, LB / 2 + 0.4, Z1 + 0.9), mat=M['trim']))
for i, x in enumerate([-0.9, -2.3, -5.6, -8.9, -12.2, -15.5]):
    add(box('mullA', (0.1, 0.14, Z1 - Z0), (x, 0.05, (Z0 + Z1) / 2), mat=M['trim']))
for i, y in enumerate([0.9, 2.3, 5.1, 7.9]):
    add(box('mullB', (0.14, 0.1, Z1 - Z0), (0.05, y, (Z0 + Z1) / 2), mat=M['trim']))
add(box('transomA', (LA, 0.12, 0.07), (-LA / 2 - 0.9, 0.05, Z1 - 0.04), mat=M['trim']))
add(box('transomB', (0.12, LB, 0.07), (0.05, LB / 2 + 0.9, Z1 - 0.04), mat=M['trim']))
# roller blinds pulled half down on every bay except the two corner bays: the light pours out of the corner
BL = emission_mat('blind', (0.9, 0.86, 0.58), 1.25)
BZ = 2.05
add(box('blindA', (15.5 - 2.3, 0.04, Z1 - BZ), (-(2.3 + 15.5) / 2, 0.35, (BZ + Z1) / 2), mat=BL))
add(box('blindB', (0.04, 7.9 - 2.3, Z1 - BZ), (-0.35, (2.3 + 7.9) / 2, (BZ + Z1) / 2), mat=BL))
# corner post (chamfer) and a dark door further along facade A
add(box('cornerpost', (0.1, 0.1, Z1 - Z0 + 0.1), (0.05, 0.05, (Z0 + Z1) / 2), mat=M['trim']))
add(box('cornerlow', (0.3, 0.3, Z0 - 0.15), (0.0, 0.0, 0.15 + (Z0 - 0.15) / 2), mat=M['trim']))
add(box('doorA', (1.0, 0.1, 2.3), (-17.5, -0.02, 1.3), mat=M['dark']))
# interior
IX0, IY1 = -18.0, 9.0
add(box('floor_in', (18.5, 9.5, 0.15), (-9, 4.4, 0.075), mat=M['floorin']))
add(box('ceiling', (18.5, 9.5, 0.1), (-9, 4.4, 3.8), mat=M['ceil']))
add(box('backA', (18.5, 0.2, 3.8), (-9, IY1, 1.9), mat=M['wallin']))
add(box('backB', (0.2, 9.5, 3.8), (IX0, 4.4, 1.9), mat=M['wallin2']))
add(box('board', (2.4, 0.05, 0.8), (-7.0, IY1 - 0.12, 2.5), mat=M['board']))
add(box('pass', (2.6, 0.05, 0.9), (-11.5, IY1 - 0.12, 1.95), mat=emission_mat('pass2', (1.0, 0.85, 0.55), 0.9)))
for i, x in enumerate([-3.2, -3.8]):
    add(cyl('urn', 0.24, 0.72, (x, IY1 - 0.45, 1.85), mat=M['chrome']))
add(box('backctr', (14, 0.6, 1.1), (-9, IY1 - 0.4, 0.55), mat=M['cfront']))
add(box('backctr_t', (14, 0.7, 0.06), (-9, IY1 - 0.42, 1.12), mat=M['ctop']))
# counters along both windows (customers behind them, facing out)
CA = 1.05
add(box('counterA', (13.0, 0.5, 0.98), (-8.6, CA, 0.64), mat=M['cfront']))
add(box('ctopA', (13.2, 0.72, 0.07), (-8.6, CA + 0.05, 1.16), mat=M['ctop']))
add(box('counterB', (0.5, 5.4, 0.98), (-CA, 4.5, 0.64), mat=M['cfront']))
add(box('ctopB', (0.72, 5.6, 0.07), (-CA - 0.05, 4.5, 1.16), mat=M['ctop']))
for i, x in enumerate([-2.4, -5.3, -8.1, -10.9, -13.7]):
    add(box('tube', (2.0, 0.12, 0.06), (x, 3.0, 3.72), mat=M['tube']))
# customers: along A facing -Y (yaw 0), along B facing +X (yaw 90)
seatZ = 0.95
cust = [('A', -2.5, 0), ('A', -4.4, 6), ('A', -7.3, -5), ('A', -9.2, 4), ('A', -12.3, -3), ('B', 3.2, 88), ('B', 5.9, 94)]
spec = []
for i, (side, t, yaw) in enumerate(cust):
    pos = [t, CA + 0.95, 0] if side == 'A' else [-CA - 0.95, t, 0]
    spec.append({'name': f'c{i}', 'pose': 'sitPhone', 'mods': {'head': [26 + (i % 3) * 5, (i % 2) * 8 - 4, 0], 'chest': [16 + (i % 2) * 6, 0, 0]},
                 'pos': pos, 'yaw': yaw, 'sit': seatZ})
hp = OV.get('hero_pos', [-2.3, -7.3, 0])
spec.append({'name': 'hero', 'pose': 'stand', 'mods': OV.get('hero_mods', {'head': [-3, -10, 0], 'chest': [2, -4, 0], 'rShoulder': [-6, 0, -5], 'lShoulder': [4, 0, 5], 'rElbow': [-12, 0, 0], 'lElbow': [-8, 0, 0]}),
             'pos': hp, 'yaw': OV.get('hero_yaw', 163), 'ground': 0.0})
figs = import_figs(export_figs({'figs': spec}, f'd2_{tag}'))
for n, objs in figs.items():
    if n == 'hero':
        continue
    set_mat(objs, M['man'])
    for o in objs:
        if is_pin(o): o.data.materials.clear(); o.data.materials.append(M['chrome'])
    world.extend(objs)
for i, (side, t, yaw) in enumerate(cust):
    objs = figs[f'c{i}']
    lw = [o for o in objs if o.name.startswith(f'c{i}.lWrist')][0]
    rw = [o for o in objs if o.name.startswith(f'c{i}.rWrist')][0]
    p = (lw.matrix_world.translation + rw.matrix_world.translation) / 2
    f = Vector((math.sin(math.radians(yaw)), -math.cos(math.radians(yaw)), 0))
    c = p + f * 0.12 + Vector((0, 0, 0.05))
    add(box('phone', (0.15, 0.012, 0.26), tuple(c), rot=(math.radians(-35), 0, math.radians(yaw)), mat=M['phone']))
    add(box('screen', (0.13, 0.004, 0.23), tuple(c - f * 0.008), rot=(math.radians(-35), 0, math.radians(yaw)), mat=M['screen']))
    lp = p - f * 0.05 + Vector((0, 0, 0.3))
    light(f'phl{i}', 'POINT', tuple(lp), 18.0, color=(0.35, 0.62, 1.0), size=0.04)
    pos = (t, CA + 0.95) if side == 'A' else (-CA - 0.95, t)
    add(cyl('stool', 0.3, 0.1, (pos[0], pos[1], seatZ - 0.07), mat=M['seat']))
    if i % 2 == 0:
        add(cyl('cup', 0.08, 0.14, (c.x + f.x * 0.25 + 0.3 * f.y, c.y + f.y * 0.25, 1.27), mat=M['cup']))
# light: soft fluorescent fill + one hard cool key near the corner that throws a sharp wedge onto the pavement
for i, x in enumerate([-2.4, -5.3, -8.1, -10.9, -13.7]):
    light(f'fl{i}', 'AREA', (x, 3.0, 3.65), 26, color=(0.9, 1.0, 0.78), size=2.0, size_y=0.2)
light('key', 'POINT', (-1.8, 2.6, 3.62), OV.get('key', 5200), color=(0.84, 1.0, 0.6), size=0.015)
light('key2', 'POINT', (-9.5, 4.2, 3.6), 1500, color=(0.9, 1.0, 0.7), size=0.02)
light('street_far', 'SPOT', (14, -16, 9), 260, color=(0.5, 0.7, 0.62), size=0.1, target=(4, -6, 0), spot=35, blend=0.7)
c = OV.get('cam', [[4.6, -11.4, 1.3], [-4.6, 0.8, 2.05], 24])
cam = camera(c[0], c[1], lens=c[2])
hero = figs['hero']
shadow_only(hero)
for o in hero:
    o.data.materials.clear(); o.data.materials.append(M['man'])
pre = f'{WORK}/{tag}'
render_beauty(pre + '_beauty.npy', W, H, samples=samples, bounces=4)
if os.environ.get('BEAUTY_ONLY') == '1':
    figure_passes(pre + '_fig', hero, W, H, ss=1, holdout=world); sys.exit(0)
world_passes(pre + '_w', world, W, H, kinds=('id', 'normal', 'depth', 'position'))
figure_passes(pre + '_fig', hero, W, H, ss=2, holdout=world)
json.dump({'objects': {o.pass_index: o.name for o in world}}, open(pre + '_w.index.json', 'w'))
print('done')
