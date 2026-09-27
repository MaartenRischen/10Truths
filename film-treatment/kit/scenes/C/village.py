# Direction C — era 2: farming and villages (to be painted as an earthy fresco / Flemish panel).
# usage: python village.py <tag> <W> <H>
import sys, os, math, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *
import bpy

tag = sys.argv[1]; W = int(sys.argv[2]); H = int(sys.argv[3])
samples = int(os.environ.get('SPP', '16'))
reset()
world_color((0.55, 0.62, 0.7), 0.9)
rr = random.Random(7)
M = {
    'grass': principled('grass', (0.2, 0.24, 0.1), 0.9),
    'wheat': principled('wheat', (0.62, 0.45, 0.14), 0.9),
    'plough': principled('plough', (0.26, 0.17, 0.09), 0.95),
    'green2': principled('green2', (0.15, 0.19, 0.08), 0.9),
    'road': principled('road', (0.45, 0.38, 0.26), 0.95),
    'wall': principled('wallv', (0.62, 0.52, 0.38), 0.9),
    'wall2': principled('wallv2', (0.55, 0.4, 0.28), 0.9),
    'roof': principled('roof', (0.36, 0.14, 0.07), 0.8),
    'roof2': principled('roof2', (0.3, 0.24, 0.16), 0.85),
    'stone': principled('stone', (0.5, 0.48, 0.44), 0.9),
    'tree': principled('treev', (0.07, 0.1, 0.045), 0.9),
    'trunk': principled('trunk', (0.15, 0.1, 0.06), 0.9),
    'hay': principled('hay', (0.7, 0.55, 0.2), 0.9),
    'cloth': principled('clothv', (0.55, 0.42, 0.3), 0.8),
    'water': principled('water', (0.35, 0.45, 0.5), 0.2),
}
world = []
def add(o):
    world.append(o); return o

# rolling ground (subdivided + displaced)
bpy.ops.mesh.primitive_plane_add(size=240, location=(0, 60, 0))
g = bpy.context.active_object; g.name = 'ground'
m = g.modifiers.new('sub', 'SUBSURF'); m.levels = 6; m.render_levels = 6; m.subdivision_type = 'SIMPLE'
tex = bpy.data.textures.new('hills', 'CLOUDS'); tex.noise_scale = 22.0; tex.noise_depth = 1
d = g.modifiers.new('disp', 'DISPLACE'); d.texture = tex; d.strength = 5.0; d.mid_level = 0.5
g.data.materials.append(M['grass']); add(g)

def field(x, y, w, dd, rot, mat, z=0.0):
    o = plane('field', (w, dd), (x, y, z), rot=(0, 0, rot), mat=mat)
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = 4; m.render_levels = 4; m.subdivision_type = 'SIMPLE'
    sw = o.modifiers.new('sw', 'SHRINKWRAP'); sw.target = g; sw.wrap_method = 'PROJECT'; sw.use_project_z = True; sw.use_negative_direction = True; sw.use_positive_direction = True; sw.offset = 0.03
    return add(o)

mats = ['wheat', 'wheat', 'plough', 'green2', 'wheat', 'grass', 'plough', 'wheat']
k = 0
for row in range(5):
    for col in range(-4, 5):
        x = col * 9 + rr.uniform(-2, 2) + row * 2.0; y = 6 + row * 9 + rr.uniform(-1.5, 1.5)
        field(x, y, rr.uniform(6.5, 9.5), rr.uniform(6, 9), rr.uniform(-0.25, 0.25), M[mats[k % len(mats)]])
        k += 1
# road winding up to the village
for i in range(22):
    t = i / 21
    x = -2 + math.sin(t * 3.2) * 6 + t * 8; y = 1 + t * 42
    field(x, y, 1.6, 2.6, math.cos(t * 3.2) * 0.5, M['road'])

def ground_z(x, y):
    # sample the evaluated ground height (ray cast)
    dg = bpy.context.evaluated_depsgraph_get()
    hit, loc, n, idx, ob, mx = bpy.context.scene.ray_cast(dg, Vector((x, y, 50)), Vector((0, 0, -1)))
    return loc.z if hit else 0.0

def house(x, y, w, dd, h, rot, wall, roof):
    z = ground_z(x, y)
    b = add(box('house', (w, dd, h), (x, y, z + h / 2 - 0.1), rot=(0, 0, rot), mat=M[wall]))
    bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=dd * 0.62, depth=w * 1.04, location=(x, y, z + h - 0.1 + dd * 0.31),
                                        rotation=(0, math.pi / 2, rot))
    r = bpy.context.active_object; r.name = 'roof'; r.rotation_euler = (math.pi / 2 * 0 + 0, math.pi / 2, rot)
    r.rotation_mode = 'XYZ'
    r.rotation_euler = (0, 0, 0)
    r.rotation_euler.rotate(Euler((0, 0, math.pi)))
    r.rotation_euler.rotate(Euler((0, math.pi / 2, 0)))
    r.rotation_euler.rotate(Euler((0, 0, rot)))
    r.data.materials.append(M[roof]); add(r)
    return b

# houses strung along a village street, both sides, gables to the street
for i in range(14):
    t = i / 13
    sx, sy = -2 + t * 26, 32 + t * 20
    side = 1 if i % 2 else -1
    ang = math.atan2(20, 26)
    ox, oy = -math.sin(ang) * 3.2 * side, math.cos(ang) * 3.2 * side
    house(sx + ox + rr.uniform(-0.4, 0.4), sy + oy + rr.uniform(-0.4, 0.4), rr.uniform(2.4, 3.2), rr.uniform(2.0, 2.5), rr.uniform(1.5, 2.1),
          ang + rr.uniform(-0.08, 0.08), 'wall' if i % 3 else 'wall2', 'roof' if i % 2 else 'roof2')
# church with tower and spire
cz_ = ground_z(27, 56)
add(box('nave', (3.2, 8, 4.2), (27, 56, cz_ + 2.0), mat=M['stone']))
bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=2.0, depth=8.2, location=(27, 56, cz_ + 4.9), rotation=(math.pi / 2, 0, 0))
nr = bpy.context.active_object; nr.name = 'naveroof'; nr.data.materials.append(M['roof2']); add(nr)
add(box('tower', (2.4, 2.4, 9), (27, 51.2, cz_ + 4.4), mat=M['stone']))
add(cyl('spire', 1.75, 5.5, (27, 51.2, cz_ + 11.6), verts=4, r2=0.02, mat=M['roof2']))
# windmill on a rise
wz = ground_z(-16, 34)
add(cyl('mill', 1.3, 5, (-16, 34, wz + 2.4), r2=0.9, mat=M['wall']))
add(cyl('millcap', 1.1, 1.2, (-16, 34, wz + 5.3), verts=16, r2=0.1, mat=M['roof']))
for a in range(4):
    bl = add(box('blade', (0.5, 0.08, 4.6), (-16, 32.8, wz + 4.9), mat=M['cloth']))
    bl.rotation_euler = (0, math.radians(a * 90 + 20), 0)
    bl.location = (-16 + math.sin(math.radians(a * 90 + 20)) * 2.2, 32.8, wz + 4.9 + math.cos(math.radians(a * 90 + 20)) * 2.2)
# trees and poplars
for i in range(70):
    x, y = rr.uniform(-40, 40), rr.uniform(8, 80)
    if abs((x + 2) * 20 - (y - 32) * 26) < 140 and 28 < y < 58:
        continue
    z = ground_z(x, y)
    if rr.random() < 0.5:
        add(cyl('trunk', 0.18, 1.4, (x, y, z + 0.7), mat=M['trunk'], verts=8))
        add(sphere('canopy', rr.uniform(1.0, 1.8), (x, y, z + 2.0), mat=M['tree'], seg=16, ring=10, scale=(1, 1, 0.85)))
    else:
        add(cyl('poplar', 0.7, rr.uniform(4, 6), (x, y, z + 2.5), verts=10, r2=0.05, mat=M['tree']))
# haystacks and sheaves in the near fields
for i in range(16):
    x, y = rr.uniform(-12, 14), rr.uniform(6, 20)
    z = ground_z(x, y)
    add(cyl('hay', 0.55, 1.1, (x, y, z + 0.5), verts=12, r2=0.1, mat=M['hay']))
# a pond
field(-6, 24, 6, 3.2, 0.3, M['water'], z=0.02)
# peasants at work (small manikins), foreground and midground
field(1.5, 9.5, 12, 6, 0.05, M['wheat'])
spec = []
REAP = {'chest': [48, 0, 0], 'head': [10, 0, 0], 'rShoulder': [-70, 0, -10], 'rElbow': [-10, 0, 0], 'lShoulder': [-50, 0, 12], 'lElbow': [-30, 0, 0], 'lHip': [-20, 0, 4], 'rHip': [10, 0, -4], 'lKnee': [20, 0, 0], 'rKnee': [16, 0, 0]}
for i in range(6):
    x, y = -3.5 + i * 1.5 + rr.uniform(-0.3, 0.3), 8.2 + rr.uniform(-0.6, 0.6)
    spec.append({'name': f'p{i}', 'pose': REAP, 'pos': [x, y, 0], 'yaw': -75 + rr.uniform(-15, 15), 'scale': 0.55, 'ground': ground_z(x, y)})
extra = [('carry', 6.5, 11.5, 150), ('walk', 8.0, 6.0, -120), ('sitCrossFire', -7.2, 12.2, 30), ('sitHugKnees', -6.2, 12.9, -20),
         ('kneel', -1.0, 12.5, 160), ('walk', 12.0, 16.0, 200), ('reachForward', 3.0, 13.0, 90), ('stand', -9.5, 6.5, 60)]
for j, (p, x, y, yaw) in enumerate(extra):
    spec.append({'name': f'p{6 + j}', 'pose': p, 'pos': [x, y, 0], 'yaw': yaw, 'scale': 0.55, 'ground': ground_z(x, y)})
tz = ground_z(-6.7, 13.8)
add(cyl('trunk', 0.22, 1.8, (-6.7, 13.8, tz + 0.9), mat=M['trunk'], verts=8))
add(sphere('canopy', 2.0, (-6.7, 13.8, tz + 2.8), mat=M['tree'], seg=16, ring=10, scale=(1.1, 1.1, 0.8)))
figs = import_figs(export_figs({'figs': spec}, f'vil_{tag}'))
for n, objs in figs.items():
    set_mat(objs, [M['cloth'], M['roof'], M['trunk'], M['wall2']][int(n[1:]) % 4])
    world.extend(objs)

light('sun', 'SUN', (0, 0, 30), 3.2, color=(1.0, 0.93, 0.8), size=math.radians(2.0), rot=(math.radians(55), 0, math.radians(-40)))
cam = camera((1.5, -9.0, 7.5), (4.0, 30.0, 1.0), lens=32)
pre = f'{WORK}/{tag}'
render_beauty(pre + '_beauty.npy', W, H, samples=samples, bounces=3)
world_passes(pre + '_w', world, W, H)
json.dump({'objects': {o.pass_index: o.name for o in world}}, open(pre + '_w.index.json', 'w'))
print('done')
