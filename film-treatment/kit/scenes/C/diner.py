# Direction C — era 4: the night diner. Blender scene -> beauty (EXR->npy) + world passes + hero figure passes.
# usage: python diner.py <tag> <W> <H> [camera preset]
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *

tag = sys.argv[1] if len(sys.argv) > 1 else 'diner'
W = int(sys.argv[2]) if len(sys.argv) > 2 else 960
H = int(sys.argv[3]) if len(sys.argv) > 3 else 540
preset = sys.argv[4] if len(sys.argv) > 4 else 'hero'
samples = int(os.environ.get('SPP', '48'))
OV = json.loads(os.environ.get('OV', '{}'))
BEAUTY_ONLY = os.environ.get('BEAUTY_ONLY') == '1'
reset()
world_color((0.003, 0.0085, 0.0085), 1.0)

M = {
    'asphalt': principled('asphalt', (0.012, 0.019, 0.018), 0.75),
    'walk': principled('walk', (0.1, 0.11, 0.1), 0.85),
    'curb': principled('curb', (0.16, 0.17, 0.15), 0.8),
    'trim': principled('trim', (0.02, 0.07, 0.05), 0.5),
    'sign': principled('sign', (0.3, 0.26, 0.17), 0.7),
    'brick': principled('brick', (0.075, 0.09, 0.08), 0.9),
    'far': principled('far', (0.01, 0.014, 0.014), 0.9),
    'board': principled('board', (0.03, 0.07, 0.05), 0.6),
    'wallin': principled('wallin', (0.68, 0.46, 0.12), 0.85),
    'ceil': principled('ceil', (0.62, 0.72, 0.52), 0.8),
    'floorin': principled('floorin', (0.35, 0.3, 0.2), 0.6),
    'counterf': principled('counterf', (0.5, 0.36, 0.18), 0.6),
    'countert': principled('countert', (0.22, 0.05, 0.035), 0.35),
    'chrome': principled('chrome', (0.8, 0.8, 0.78), 0.18, metal=1.0),
    'stoolseat': principled('stoolseat', (0.35, 0.05, 0.03), 0.4),
    'wood': principled('wood', (0.3, 0.19, 0.11), 0.55),
    'dark': principled('darkglass', (0.01, 0.015, 0.014), 0.15),
    'kitchen': emission_mat('kitchen', (1.0, 0.72, 0.36), 1.1),
    'tube': emission_mat('tube', (0.92, 1.0, 0.86), 6.0),
    'screen': emission_mat('screen', (0.7, 0.85, 1.0), 9.0),
    'phone': principled('phone', (0.02, 0.02, 0.02), 0.3),
    'upwin': emission_mat('upwin', (1.0, 0.7, 0.35), 0.35),
    'cup': principled('cup', (0.8, 0.78, 0.7), 0.4),
}
world = []

def add(o):
    world.append(o); return o

# street and sidewalk (facade plane y = 6)
add(plane('street', (60, 40), (4, -6, 0), mat=M['asphalt']))
add(box('sidewalk', (60, 4.0, 0.15), (4, 4.0, 0.075), mat=M['walk']))
add(box('curb', (60, 0.25, 0.17), (4, 2.0, 0.085), mat=M['curb']))
# facade: window opening x 1.2..13.2, z 0.95..3.2
FX0, FX1, FZ0, FZ1, FY = 1.2, 13.2, 0.95, 3.25, 6.0
add(box('fac_low', (FX1 - FX0 + 0.4, 0.3, FZ0 - 0.15), (0.5 * (FX0 + FX1), FY + 0.15, 0.15 + 0.5 * (FZ0 - 0.15)), mat=M['trim']))
add(box('fac_sign', (FX1 - FX0 + 0.6, 0.35, 0.75), (0.5 * (FX0 + FX1), FY + 0.1, FZ1 + 0.42), mat=M['sign']))
add(box('fac_cornice', (FX1 - FX0 + 0.9, 0.55, 0.14), (0.5 * (FX0 + FX1), FY + 0.05, FZ1 + 0.86), mat=M['trim']))
add(box('fac_upper', (26, 0.3, 8), (6, FY + 0.35, FZ1 + 0.93 + 4), mat=M['brick']))
add(box('fac_left', (3.2, 0.3, FZ1 + 1), (FX0 - 1.6 - 0.1, FY + 0.15, (FZ1 + 1) / 2), mat=M['brick']))
add(box('fac_right', (6, 0.3, FZ1 + 1), (FX1 + 3.1, FY + 0.15, (FZ1 + 1) / 2), mat=M['brick']))
# mullions
for i, x in enumerate([FX0, 4.2, 7.2, 10.2, FX1]):
    add(box(f'mull{i}', (0.12, 0.14, FZ1 - FZ0), (x, FY + 0.05, 0.5 * (FZ0 + FZ1)), mat=M['trim']))
add(box('transom', (FX1 - FX0, 0.12, 0.08), (0.5 * (FX0 + FX1), FY + 0.05, FZ1 - 0.05), mat=M['trim']))
for i, (x, y, w_, d_, h_) in enumerate([(-14, 14, 8, 6, 17), (-24, 22, 10, 8, 26), (-8.5, 30, 7, 7, 34), (-34, 18, 12, 8, 14)]):
    add(box(f'far{i}', (w_, d_, h_), (x, y, h_ / 2), mat=M['far']))
    add(box(f'fartank{i}', (1.6, 1.6, 1.6), (x + 1.5, y, h_ + 1.3), mat=M['far'])) if i == 0 else None
# a dark neighbour doorway on the left
add(box('door_l', (1.1, 0.1, 2.4), (-0.4, FY - 0.02, 1.35), mat=M['dark']))
# upper floor windows (dim)
for i, x in enumerate([-4.0, -1.0, 2.0, 5.0, 8.0, 11.0, 14.0]):
    lit = (i == 4)
    add(box(f'upw{i}', (1.3, 0.08, 1.8), (x, FY + 0.18, 5.9), mat=M['upwin'] if lit else M['dark']))
    add(box(f'upwsill{i}', (1.5, 0.2, 0.1), (x, FY + 0.12, 4.95), mat=M['trim']))

# interior
IY0, IY1 = FY + 0.3, 11.0
add(box('floor_in', (FX1 - FX0 + 2, IY1 - IY0, 0.15), (0.5 * (FX0 + FX1), 0.5 * (IY0 + IY1), 0.075), mat=M['floorin']))
add(box('ceiling', (FX1 - FX0 + 2, IY1 - IY0, 0.1), (0.5 * (FX0 + FX1), 0.5 * (IY0 + IY1), 3.75), mat=M['ceil']))
add(box('backwall', (FX1 - FX0 + 2, 0.2, 3.8), (0.5 * (FX0 + FX1), IY1, 1.9), mat=M['wallin']))
add(box('sidewall_l', (0.2, IY1 - IY0, 3.8), (FX0 - 0.8, 0.5 * (IY0 + IY1), 1.9), mat=M['wallin']))
add(box('sidewall_r', (0.2, IY1 - IY0, 3.8), (FX1 + 0.8, 0.5 * (IY0 + IY1), 1.9), mat=M['wallin']))
# kitchen pass-through (bright) and a door
add(box('pass', (2.2, 0.05, 0.7), (8.5, IY1 - 0.11, 2.45), mat=M['board']))
add(box('passsill', (3.3, 0.35, 0.08), (8.5, IY1 - 0.2, 1.42), mat=M['chrome']))
add(box('kdoor', (1.0, 0.05, 2.3), (12.0, IY1 - 0.11, 1.3), mat=M['trim']))
# coffee urns
for i, x in enumerate([3.0, 3.7]):
    add(cyl(f'urn{i}', 0.25, 0.75, (x, IY1 - 0.45, 1.85), mat=M['chrome']))
add(box('backcounter', (FX1 - FX0, 0.6, 1.1), (0.5 * (FX0 + FX1), IY1 - 0.4, 0.55), mat=M['counterf']))
add(box('backcounter_t', (FX1 - FX0, 0.7, 0.06), (0.5 * (FX0 + FX1), IY1 - 0.42, 1.12), mat=M['countert']))
# window counter (customers sit behind it, facing the street)
CY = FY + 0.9
add(box('counter', (FX1 - FX0 - 0.4, 0.55, 0.98), (0.5 * (FX0 + FX1), CY, 0.15 + 0.49), mat=M['counterf']))
add(box('countertop', (FX1 - FX0 - 0.3, 0.75, 0.07), (0.5 * (FX0 + FX1), CY + 0.05, 1.16), mat=M['countert']))
# fluorescent tubes
for i, x in enumerate([2.5, 5.2, 7.9, 10.6]):
    add(box(f'tube{i}', (2.0, 0.12, 0.06), (x, 8.2, 3.66), mat=M['tube']))

# customers: sit behind the counter facing -Y (towards window/camera); yaw 0 faces -Y
seatZ = 0.95
customers = [(2.4, 0), (4.1, 8), (6.1, -6), (8.9, 5), (10.7, -4), (12.3, 10)]
figs_spec = []
for i, (x, yaw) in enumerate(customers):
    head = [26 + (i % 3) * 4, (i % 2) * 8 - 4, 0]
    figs_spec.append({'name': f'c{i}', 'pose': 'sitPhone', 'mods': {'head': head, 'chest': [18 + (i % 2) * 6, 0, 0]},
                      'pos': [x, CY + 0.95, 0], 'yaw': yaw, 'sit': seatZ})
# the hero (painted separately): outside, on the street side, facing the window
hero_pos = {'hero': [10.35, 1.15, 0], 'p10': [10.35, 1.15, 0]}.get(preset, [10.35, 1.15, 0])
figs_spec.append({'name': 'hero', 'pose': 'stand', 'mods': {'head': [-3, 13, 0], 'chest': [2, 4, 0],
                  'rShoulder': [-6, 0, -5], 'lShoulder': [4, 0, 5], 'rElbow': [-12, 0, 0], 'lElbow': [-8, 0, 0]},
                  'pos': OV.get('hero_pos', hero_pos), 'yaw': OV.get('hero_yaw', 198), 'ground': 0.0})
if 'hero_mods' in OV: figs_spec[-1]['mods'].update(OV['hero_mods'])
figs = import_figs(export_figs({'figs': figs_spec}, 'diner_figs'))
for n, objs in figs.items():
    if n == 'hero':
        continue
    set_mat(objs, M['wood'])
    for o in objs:
        if is_pin(o): o.data.materials.clear(); o.data.materials.append(M['chrome'])
    world.extend(objs)
# stools, phones, phone lights, cups
for i, (x, yaw) in enumerate(customers):
    add(cyl(f'stool{i}', 0.3, 0.1, (x, CY + 0.95, seatZ - 0.07), mat=M['stoolseat']))
    add(cyl(f'stoolp{i}', 0.05, seatZ - 0.15, (x, CY + 0.95, 0.15 + (seatZ - 0.15) / 2), mat=M['chrome']))
for i, (x, yaw) in enumerate(customers):
    objs = figs[f'c{i}']
    lw = [o for o in objs if o.name.startswith(f'c{i}.lWrist')][0]
    rw = [o for o in objs if o.name.startswith(f'c{i}.rWrist')][0]
    p = (lw.matrix_world.translation + rw.matrix_world.translation) / 2
    ph = add(box(f'phone{i}', (0.16, 0.012, 0.28), (p.x, p.y - 0.12, p.z + 0.05), rot=(math.radians(-35), 0, math.radians(yaw)), mat=M['phone']))
    sc_ = add(box(f'screen{i}', (0.14, 0.004, 0.25), (p.x, p.y - 0.128, p.z + 0.055), rot=(math.radians(-35), 0, math.radians(yaw)), mat=M['screen']))
    light(f'phl{i}', 'POINT', (p.x, p.y - 0.2, p.z + 0.22), 26.0, color=(0.3, 0.6, 1.0), size=0.04)
    if i % 2 == 0:
        add(cyl(f'cup{i}', 0.08, 0.14, (x + 0.45, CY - 0.1, 1.27), mat=M['cup']))

# lights: fluorescent ceiling (soft) + one hard key high in the room that throws the window onto the street
for i, x in enumerate([2.5, 5.2, 7.9, 10.6]):
    light(f'fl{i}', 'AREA', (x, 8.2, 3.6), 45, color=(1.0, 0.97, 0.82), size=2.0, size_y=0.2, rot=(0, 0, 0), shadow=True)
light('key', 'POINT', (7.6, 8.7, 3.55), 4300, color=(1.0, 0.94, 0.74), size=0.02)
light('backfill', 'AREA', (7.2, 7.0, 3.2), 120, color=(1.0, 0.95, 0.8), size=10, size_y=1.0, rot=(math.radians(-60), 0, 0))
light('facade_wash', 'AREA', (7.4, 4.6, 3.9), 150, color=(1.0, 0.86, 0.58), size=12, size_y=0.5, rot=(math.radians(112), 0, 0))
light('street', 'SPOT', (-10, -3, 8), 160, color=(0.5, 0.72, 0.66), size=0.1, target=(-4, 2, 0), spot=40, blend=0.6)

# camera presets
if preset in ('hero', 'p10'):
    cam = camera((16.0, -1.7, 1.35), (5.3, 6.3, 1.95), lens=25)
elif preset == 'band':
    cam = camera((-1.5, -6.5, 1.6), (0.8, 6.0, 1.9), lens=35)
elif preset == 'test':
    cam = camera(OV['cam'], OV['tgt'], lens=OV.get('lens', 24))

hero = figs['hero']
shadow_only(hero)
for o in hero:
    o.data.materials.clear(); o.data.materials.append(M['wood'])
pre = f'{WORK}/{tag}'
render_beauty(pre + '_beauty.npy', W, H, samples=samples, bounces=4)
if BEAUTY_ONLY:
    figure_passes(pre + '_fig', hero, W, H, ss=1, holdout=world); sys.exit(0)
world_passes(pre + '_w', world, W, H)
figure_passes(pre + '_fig', hero, W, H, ss=2, holdout=world)
json.dump({'objects': {o.pass_index: o.name for o in world}}, open(pre + '_w.index.json', 'w'))
print('done')
