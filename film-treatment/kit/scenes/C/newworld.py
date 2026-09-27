# Direction C — era 6: the new world, built on purpose. Homes around a courtyard, rooftop gardens, solar roofs, a tram,
# a long table under string lights. Everyone here is painted like the figure (people rendered as figure passes).
# usage: python newworld.py <tag> <W> <H> [preset]   env: SPP, OV
import sys, os, math, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *
import bpy

tag = sys.argv[1]; W = int(sys.argv[2]); H = int(sys.argv[3])
preset = sys.argv[4] if len(sys.argv) > 4 else 'p15'
samples = int(os.environ.get('SPP', '24'))
OV = json.loads(os.environ.get('OV', '{}'))
reset()
world_color((0.5, 0.4, 0.34), 0.32)
rr = random.Random(5)
M = {
    'pave': principled('pave', (0.46, 0.36, 0.26), 0.85),
    'grass': principled('grassN', (0.3, 0.3, 0.14), 0.9),
    'wall': principled('wallN', (0.72, 0.56, 0.4), 0.85),
    'wall2': principled('wallN2', (0.62, 0.42, 0.28), 0.85),
    'wood': principled('woodN', (0.42, 0.26, 0.14), 0.7),
    'roof': principled('roofN', (0.36, 0.18, 0.1), 0.8),
    'solar': principled('solar', (0.03, 0.04, 0.07), 0.15, coat=0.6),
    'green': principled('greenN', (0.2, 0.26, 0.1), 0.9),
    'win': emission_mat('winN', (1.0, 0.72, 0.38), 2.2),
    'windim': principled('windim', (0.12, 0.08, 0.06), 0.4),
    'bulb': emission_mat('bulb', (1.0, 0.8, 0.45), 30.0),
    'tram': principled('tram', (0.85, 0.72, 0.5), 0.5),
    'tramwin': emission_mat('tramwin', (1.0, 0.82, 0.52), 4.5),
    'rail': principled('rail', (0.2, 0.18, 0.16), 0.5, metal=0.5),
    'cloth': principled('clothN', (0.85, 0.78, 0.66), 0.8),
    'person': principled('personN', (0.5, 0.3, 0.18), 0.7),
    'pot': principled('potN', (0.55, 0.3, 0.18), 0.8),
}
world = []
def add(o):
    world.append(o); return o

add(plane('ground', (80, 80), (0, 10, 0), mat=M['pave']))
add(plane('lawnL', (5, 10), (-6.5, 8, 0.01), mat=M['grass']))
add(plane('lawnR', (4, 8), (6.8, 6, 0.01), mat=M['grass']))

def block(name, x, y, w, d, floors, rot=0, roof='flat', mat='wall'):
    h = floors * 2.6
    add(box(name, (w, d, h), (x, y, h / 2), rot=(0, 0, rot), mat=M[mat]))
    # windows on the courtyard-facing side (-Y in local frame after rot)
    ca, sa = math.cos(rot), math.sin(rot)
    for f in range(floors):
        n = int(w / 1.6)
        for i in range(n):
            lx = -w / 2 + 0.8 + i * (w - 1.6) / max(1, n - 1)
            lit = rr.random() < 0.65
            wx, wy = x + lx * ca - (-d / 2 - 0.02) * sa, y + lx * sa + (-d / 2 - 0.02) * ca
            add(box(name + '_win', (0.9, 0.06, 1.3), (wx, wy, 0.9 + f * 2.6 + 0.4), rot=(0, 0, rot), mat=M['win'] if lit else M['windim']))
        # end walls get windows too
        for side_ in (-1, 1):
            for j in range(2):
                ly = -d / 2 + 1.4 + j * (d - 2.8)
                ex, ey = x + (side_ * (w / 2 + 0.02)) * ca - ly * sa, y + (side_ * (w / 2 + 0.02)) * sa + ly * ca
                lit = rr.random() < 0.6
                add(box(name + '_win', (0.06, 0.9, 1.3), (ex, ey, 0.9 + f * 2.6 + 0.4), rot=(0, 0, rot), mat=M['win'] if lit else M['windim']))
        # balcony slab with planters every other floor
        if f > 0 and f % 2 == 1:
            bx, by = x - (-d / 2 - 0.45) * sa, y + (-d / 2 - 0.45) * ca
            add(box(name + '_balc', (w * 0.8, 0.9, 0.12), (bx, by, f * 2.6), rot=(0, 0, rot), mat=M['wood']))
            for k in range(int(w * 0.8 / 1.2)):
                ox = -w * 0.4 + 0.6 + k * 1.2
                px, py = bx + ox * ca, by + ox * sa
                add(sphere(name + '_plant', 0.32, (px, py, f * 2.6 + 0.4), mat=M['green'], seg=12, ring=8))
    if roof == 'solar':
        # pitched solar roof
        bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=d * 0.6, depth=w, location=(x, y, h + d * 0.3), rotation=(0, math.pi / 2, 0))
        r = bpy.context.active_object; r.name = name + '_roof'
        r.rotation_euler = (0, 0, 0); r.rotation_euler.rotate(Euler((0, 0, math.pi))); r.rotation_euler.rotate(Euler((0, math.pi / 2, 0))); r.rotation_euler.rotate(Euler((0, 0, rot)))
        r.data.materials.append(M['roof']); add(r)
        for i in range(int(w / 1.3)):
            lx = -w / 2 + 0.7 + i * 1.3
            px, py = x + lx * ca - (-d * 0.22) * sa, y + lx * sa + (-d * 0.22) * ca
            add(box(name + '_pv', (1.15, d * 0.42, 0.06), (px, py, h + d * 0.36), rot=(math.radians(-30), 0, rot), mat=M['solar']))
    else:
        # rooftop garden: parapet, shrubs, a small tree
        add(box(name + '_parapet', (w, d, 0.3), (x, y, h + 0.15), rot=(0, 0, rot), mat=M['wall2']))
        for k in range(7):
            lx, ly = rr.uniform(-w / 2 + 0.5, w / 2 - 0.5), rr.uniform(-d / 2 + 0.5, d / 2 - 0.5)
            add(sphere(name + '_shrub', rr.uniform(0.35, 0.7), (x + lx * ca - ly * sa, y + lx * sa + ly * ca, h + 0.4), mat=M['green'], seg=12, ring=8))
        add(cyl(name + '_trunk', 0.08, 1.2, (x, y, h + 0.6), mat=M['wood'], verts=8))
        add(sphere(name + '_tree', 0.9, (x, y, h + 1.6), mat=M['green'], seg=14, ring=10))

# courtyard: left block, back block (solar), right block, with a gap back-right for the tram street
block('left', -9.5, 9.0, 12, 5, 3, rot=math.radians(90), roof='garden')
block('back', -2.5, 17.5, 13, 5, 4, rot=0, roof='solar', mat='wall2')
block('right', 11.2, 6.0, 8, 5, 3, rot=math.radians(-90), roof='garden')
block('farR', 11.0, 24.0, 10, 5, 5, rot=0, roof='solar')
# tram street in front of the courtyard: rails + a tram gliding past, catenary poles
TY_ = OV.get('tram_y', -4.2)
add(box('street_n', (60, 3.2, 0.02), (0, TY_, 0.01), mat=M['rail']))
add(box('rail1', (60, 0.08, 0.05), (0, TY_ - 0.5, 0.04), mat=M['rail']))
add(box('rail2', (60, 0.08, 0.05), (0, TY_ + 0.5, 0.04), mat=M['rail']))
TX0 = OV.get('tram_x', 7.5)
add(box('tram', (10.0, 2.3, 2.6), (TX0, TY_, 1.55), mat=M['tram'], bevel=0.4, segs=4))
for i in range(6):
    add(box('tram_win', (1.1, 2.36, 1.0), (TX0 - 3.8 + i * 1.5, TY_, 2.0), mat=M['tramwin']))
add(box('tram_roof', (8.0, 1.6, 0.25), (TX0, TY_, 2.95), mat=M['rail']))
add(cyl('catenary', 0.02, 60, (0, TY_, 4.3), rot=(0, math.pi / 2, 0), mat=M['rail'], verts=6))
for x in (-14, -6.8, 1.6, 10.5):
    add(cyl('cpole', 0.06, 4.6, (x, TY_ - 2.0, 2.3), mat=M['rail'], verts=8))
    add(box('carm', (0.05, 2.1, 0.05), (x, TY_ - 1.0, 4.4), mat=M['rail']))
# bike racks / planters along the pavement
for x in (-9, -7.5, 3.0, 4.5):
    add(box('planter', (1.0, 0.5, 0.45), (x, -1.9, 0.22), mat=M['pot']))
    add(sphere('pshrub', 0.45, (x, -1.9, 0.62), mat=M['green'], seg=12, ring=8))
# courtyard trees
for (x, y) in [(-5.5, 4.0), (7.2, 3.0), (-6.5, 14.0)]:
    add(cyl('ctrunk', 0.15, 2.4, (x, y, 1.2), mat=M['wood'], verts=10))
    add(sphere('ccanopy', 1.6, (x, y, 3.3), mat=M['green'], seg=18, ring=12, scale=(1, 1, 0.85)))
# the long table under string lights
TX, TY, TL = 0.6, 9.0, 7.0
add(box('table', (TL, 1.1, 0.08), (TX, TY, 0.95), mat=M['cloth']))
for dx in (-TL / 2 + 0.3, TL / 2 - 0.3):
    add(box('tleg', (0.1, 0.9, 0.9), (TX + dx, TY, 0.45), mat=M['wood']))
for side in (-1, 1):
    add(box('bench', (TL, 0.4, 0.06), (TX, TY + side * 1.0, 0.55), mat=M['wood']))
for i in range(9):
    add(cyl('cup', 0.06, 0.13, (TX - TL / 2 + 0.6 + i * 0.75, TY + rr.uniform(-0.3, 0.3), 1.05), mat=M['pot'], verts=10))
    if i % 3 == 1:
        add(cyl('bowl', 0.22, 0.08, (TX - TL / 2 + 0.9 + i * 0.75, TY, 1.03), mat=M['pot'], verts=16))
# string lights: three catenaries across the courtyard, over the table
for k, (a, b, sag) in enumerate([((-8.0, 6.0, 5.6), (8.2, 10.0, 5.6), 1.4), ((-8.0, 10.5, 5.6), (8.2, 5.0, 5.4), 1.3), ((-8.0, 13.5, 6.0), (8.2, 13.0, 6.0), 1.2)]):
    n = 34
    for i in range(n + 1):
        t = i / n
        x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
        z = a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)
        add(sphere('bulb', 0.085, (x, y, z), mat=M['bulb'], seg=8, ring=6))
    light(f'sl{k}', 'AREA', ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 - sag), 900, color=(1.0, 0.78, 0.45), size=14, size_y=0.3,
          rot=(0, 0, math.atan2(b[1] - a[1], b[0] - a[0])))
# people: seated along both sides of the table, a few standing, a child; the hero walking in from the left
spec = []
seat = 0.58
for i in range(5):
    x = TX - TL / 2 + 0.8 + i * 1.45
    spec.append({'name': f'n{i}', 'pose': 'sitChair', 'mods': {'head': [rr.uniform(-5, 12), rr.uniform(-30, 30), 0], 'chest': [rr.uniform(0, 12), rr.uniform(-10, 10), 0],
                 'lShoulder': [-40, 0, 10], 'rShoulder': [-40, 0, -10], 'lElbow': [-60, 0, 0], 'rElbow': [-60, 0, 0]}, 'pos': [x, TY + 1.0, 0], 'yaw': 180, 'sit': seat})
for i in range(5):
    x = TX - TL / 2 + 1.4 + i * 1.45
    spec.append({'name': f'f{i}', 'pose': 'sitChair', 'mods': {'head': [rr.uniform(-8, 10), rr.uniform(-40, 40), 0], 'chest': [rr.uniform(-4, 10), rr.uniform(-15, 15), 0],
                 'lShoulder': [-45, 0, 10], 'rShoulder': [-45, 0, -10] if i % 2 else [-10, 0, -60], 'lElbow': [-55, 0, 0], 'rElbow': [-55, 0, 0]}, 'pos': [x, TY - 1.0, 0], 'yaw': 0, 'sit': seat})
spec.append({'name': 's0', 'pose': 'armsOpen', 'pos': [TX + TL / 2 + 1.0, TY + 0.2, 0], 'yaw': -90, 'ground': 0.0})
spec.append({'name': 's1', 'pose': 'carry', 'pos': [TX + TL / 2 + 0.6, TY + 1.8, 0], 'yaw': -120, 'ground': 0.0})
spec.append({'name': 's2', 'pose': 'reachUp', 'pos': [TX + TL / 2 + 1.6, TY - 0.9, 0], 'yaw': -60, 'ground': 0.0, 'scale': 0.62})
hp = OV.get('hero_pos', [-3.6, 3.2, 0])
spec.append({'name': 'hero', 'pose': 'walk', 'pos': hp, 'yaw': OV.get('hero_yaw', -125), 'ground': 0.0,
             'mods': OV.get('hero_mods', {'head': [0, 10, 0]})})
figs = import_figs(export_figs({'figs': spec}, f'nw_{tag}'))
people = []
for n, objs in figs.items():
    for o in objs:
        o.data.materials.clear(); o.data.materials.append(M['person'])
    people += [o for o in objs if not is_pin(o)]
# light: low warm sun from the left-back, sky fill, windows, string lights
light('sun', 'SUN', (0, 0, 20), 1.3, color=(1.0, 0.66, 0.38), size=math.radians(3), rot=(math.radians(75), 0, math.radians(-120)))
c = OV.get('cam', [[-4.5, -6.5, 1.6], [2.0, 12.0, 2.6], 28])
cam = camera(c[0], c[1], lens=c[2])
pre = f'{WORK}/{tag}'
render_beauty(pre + '_beauty.npy', W, H, samples=samples, bounces=4)
world_passes(pre + '_w', world + people, W, H)
json.dump({'objects': {o.pass_index: o.name for o in world + people}}, open(pre + '_w.index.json', 'w'))
figure_passes(pre + '_fig', people, W, H, ss=2, holdout=world)
print('done')
