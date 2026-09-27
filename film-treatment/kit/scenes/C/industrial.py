# Direction C — era 3: industry. A cobbled mill street, smokestacks, a railway viaduct, gaslight. (painted as impasto)
# usage: python industrial.py <tag> <W> <H>
import sys, os, math, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *
import bpy

tag = sys.argv[1]; W = int(sys.argv[2]); H = int(sys.argv[3])
samples = int(os.environ.get('SPP', '16'))
reset()
world_color((0.16, 0.14, 0.12), 1.0)
rr = random.Random(11)
M = {
    'cobble': principled('cobble', (0.1, 0.09, 0.08), 0.6),
    'brick': principled('brickI', (0.28, 0.1, 0.06), 0.9),
    'brick2': principled('brickI2', (0.2, 0.08, 0.05), 0.9),
    'soot': principled('soot', (0.05, 0.045, 0.04), 0.9),
    'iron': principled('iron', (0.06, 0.06, 0.065), 0.5, metal=0.6),
    'win': emission_mat('winI', (1.0, 0.62, 0.25), 1.4),
    'windark': principled('windark', (0.03, 0.03, 0.035), 0.3),
    'gas': emission_mat('gas', (1.0, 0.7, 0.32), 3.5),
    'stone': principled('stoneI', (0.3, 0.27, 0.23), 0.9),
    'worker': principled('worker', (0.16, 0.12, 0.09), 0.8),
}
world = []
def add(o):
    world.append(o); return o

add(plane('street', (14, 120), (0, 50, 0), mat=M['cobble']))
add(box('kerbL', (0.5, 120, 0.18), (-3.6, 50, 0.09), mat=M['stone']))
add(box('kerbR', (0.5, 120, 0.18), (3.6, 50, 0.09), mat=M['stone']))
add(box('pathL', (3.0, 120, 0.15), (-5.3, 50, 0.075), mat=M['stone']))
add(box('pathR', (3.0, 120, 0.15), (5.3, 50, 0.075), mat=M['stone']))
# mill buildings both sides, with rows of windows (some lit)
for side in (-1, 1):
    y = 2.0
    while y < 70:
        d = rr.uniform(6, 11); h = rr.uniform(7, 14)
        x0 = side * 6.8
        add(box('mill', (0.6, d, h), (x0 + side * 0.3, y + d / 2, h / 2), mat=M['brick'] if rr.random() < 0.6 else M['brick2']))
        add(box('millbody', (8, d, h), (x0 + side * 4.3, y + d / 2, h / 2), mat=M['soot']))
        for fl in range(int(h / 2.2)):
            for wj in range(int(d / 1.9)):
                lit = rr.random() < 0.35
                add(box('w', (0.1, 0.9, 1.2), (x0 - side * 0.02, y + 0.9 + wj * 1.9, 1.3 + fl * 2.2), mat=M['win'] if lit else M['windark']))
        y += d + rr.uniform(0.2, 1.5)
# smokestacks behind
for i, (x, y, h) in enumerate([(-9, 40, 21), (7, 55, 25), (-3, 75, 29), (13, 34, 18), (-16, 62, 24), (2, 95, 33)]):
    add(cyl('stack', 1.3, h, (x, y, h / 2), r2=0.9, verts=24, mat=M['brick2']))
    add(cyl('stacktop', 1.15, 0.8, (x, y, h + 0.3), verts=24, mat=M['soot']))
# railway viaduct across the street (iron girder on brick piers)
add(box('viaduct', (40, 2.2, 1.4), (0, 30, 8.6), mat=M['iron']))
for x in (-6.2, 6.2):
    add(box('pier', (1.6, 2.4, 8), (x, 30, 4), mat=M['brick2']))
for k in range(16):
    add(box('girder', (0.14, 2.3, 1.9), (-9 + k * 1.2, 30, 7.3), rot=(0, math.radians(35 if k % 2 else -35), 0), mat=M['iron']))
# gas lamps
for i, y in enumerate([4, 13, 22, 38, 50]):
    for side in (-1, 1):
        x = side * 4.1
        add(cyl('post', 0.07, 3.4, (x, y, 1.7), verts=10, mat=M['iron']))
        add(box('lantern', (0.36, 0.36, 0.5), (x, y, 3.55), mat=M['gas']))
        light(f'gl{i}{side}', 'POINT', (x, y, 3.3), 60, color=(1.0, 0.7, 0.36), size=0.2)
# workers walking to the mills
spec = []
for i in range(12):
    x = rr.uniform(-3, 3); y = rr.uniform(6, 34)
    spec.append({'name': f'w{i}', 'pose': 'walk', 'mods': {'chest': [12, 0, 0], 'head': [14, 0, 0]},
                 'pos': [x, y, 0], 'yaw': 180 if rr.random() < 0.7 else 0, 'scale': 0.95, 'ground': 0.0})
figs = import_figs(export_figs({'figs': spec}, f'ind_{tag}'))
for n, objs in figs.items():
    set_mat(objs, M['worker']); world.extend(objs)
light('sky', 'SUN', (0, 0, 30), 1.0, color=(0.9, 0.82, 0.7), size=math.radians(20), rot=(math.radians(35), 0, math.radians(160)))
cam = camera((0.0, -6.5, 1.45), (0.0, 30, 5.0), lens=26)
pre = f'{WORK}/{tag}'
render_beauty(pre + '_beauty.npy', W, H, samples=samples, bounces=3)
world_passes(pre + '_w', world, W, H)
json.dump({'objects': {o.pass_index: o.name for o in world}}, open(pre + '_w.index.json', 'w'))
print('done')
