# Direction C — P11: the screen age as a wall of perfect product shots. Glossy display cells, each lit like an ad:
# a five-star rating, a vending machine, an office chair, a bright bed at 3 a.m., a wall of breaking news, an endless
# feed, a candy bar, a like badge, a trophy score. The ochre figure walks past (painted separately).
# usage: python productwall.py <tag> <W> <H>
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *
import bpy, bmesh

tag = sys.argv[1]; W = int(sys.argv[2]); H = int(sys.argv[3])
OV = json.loads(os.environ.get('OV', '{}'))
spp = int(os.environ.get('SPP', '40'))
reset()
world_color((0.02, 0.022, 0.03), 1.0)
M = {
    'floor': principled('floorP', (0.05, 0.05, 0.06), 0.03, coat=1.0, coat_rough=0.01),
    'wall': principled('wallP', (0.08, 0.08, 0.09), 0.2, coat=0.6),
    'gold': principled('gold', (1.0, 0.72, 0.28), 0.12, metal=1.0),
    'chrome': principled('chromeP', (0.95, 0.95, 0.97), 0.05, metal=1.0),
    'blackgloss': principled('blackgloss', (0.01, 0.01, 0.012), 0.05, coat=1.0, coat_rough=0.0),
    'white': principled('whiteP', (0.92, 0.92, 0.94), 0.12, coat=1.0, coat_rough=0.02),
    'red': principled('redP', (0.8, 0.04, 0.05), 0.15, coat=1.0, coat_rough=0.02),
    'choc': principled('choc', (0.16, 0.07, 0.035), 0.4),
    'duvet': principled('duvet', (0.75, 0.82, 0.95), 0.5, sheen=0.6),
    'mesh': principled('meshP', (0.05, 0.05, 0.06), 0.4),
}
pastel = [(0.62, 0.8, 0.92), (0.95, 0.72, 0.8), (0.7, 0.9, 0.78), (0.8, 0.74, 0.95), (0.98, 0.86, 0.66)]
world = []
def add(o):
    world.append(o); return o
def img_emit(name, path, strength=1.5):
    return image_emission_mat(name, os.path.join(WORK, path), strength)

add(plane('floor', (60, 30), (8, -6, 0), mat=M['floor']))
add(box('backwall', (60, 0.3, 8), (8, 0.9, 4), mat=M['wall']))
CW, CH, CD = 2.3, 1.7, 0.9           # cell size
cols = 5
cells = []
for r_ in range(2):
    for c_ in range(cols):
        x = c_ * (CW + 0.18); z = 0.35 + r_ * (CH + 0.16)
        cells.append((x, z))
# cell shells: glossy pastel interior with a soft light in the top
for i, (x, z) in enumerate(cells):
    pm = principled(f'cell{i}', (0.03, 0.04, 0.09) if i == 3 else pastel[i % 5], 0.25, coat=0.8, coat_rough=0.05)
    add(box(f'cellback{i}', (CW, 0.05, CH), (x, 0.7, z + CH / 2), mat=pm))
    add(box(f'cellfloor{i}', (CW, CD, 0.05), (x, 0.7 - CD / 2, z), mat=pm))
    add(box(f'celltop{i}', (CW, CD, 0.05), (x, 0.7 - CD / 2, z + CH), mat=pm))
    add(box(f'cellL{i}', (0.05, CD, CH), (x - CW / 2, 0.7 - CD / 2, z + CH / 2), mat=pm))
    add(box(f'cellR{i}', (0.05, CD, CH), (x + CW / 2, 0.7 - CD / 2, z + CH / 2), mat=pm))
    add(box(f'cellstrip{i}', (CW - 0.1, 0.03, 0.02), (x, 0.7 - CD + 0.05, z + CH - 0.03), mat=emission_mat(f'strip{i}', (1, 1, 1), 5.0)))
    if i != 3:
        light(f'cl{i}', 'AREA', (x, 0.7 - CD * 0.6, z + CH - 0.1), 28, color=(1.0, 0.98, 0.96), size=CW * 0.8, size_y=0.3)
def C(i):
    x, z = cells[i]; return x, 0.7 - CD * 0.5, z

# 0: five-star rating (gold stars)
def star(name, cx, cy, cz, r=0.16, t=0.05):
    bm = bmesh.new()
    pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5; rr = r if k % 2 == 0 else r * 0.45
        pts.append(bm.verts.new((math.cos(a) * rr, 0, math.sin(a) * rr)))
    f = bm.faces.new(pts)
    bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in bm.verts:
        if abs(v.co.y) < 1e-6 and v not in pts:
            pass
    # move extruded verts back
    for v in bm.verts[10:]:
        v.co.y += t
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.location = (cx, cy, cz)
    bev = o.modifiers.new('b', 'BEVEL'); bev.width = 0.012; bev.segments = 3
    o.data.materials.append(M['gold']); world.append(o); return o
x, y, z = C(0)
for k in range(5):
    star(f'star{k}', x - 0.8 + k * 0.4, y - 0.1, z + CH * 0.5)
# 1: vending machine
x, y, z = C(1)
add(box('vm', (0.9, 0.55, 1.5), (x, y, z + 0.76), mat=M['red'], bevel=0.02))
add(box('vmglass', (0.62, 0.02, 1.1), (x - 0.1, y - 0.28, z + 0.86), mat=emission_mat('vmlight', (0.9, 0.95, 1.0), 2.0)))
for rr_ in range(4):
    for cc in range(4):
        add(cyl('can', 0.045, 0.14, (x - 0.33 + cc * 0.15, y - 0.3, z + 0.45 + rr_ * 0.26), mat=[M['red'], M['white'], M['gold'], M['chrome']][(rr_ + cc) % 4], verts=16))
add(box('vmslot', (0.14, 0.03, 0.5), (x + 0.33, y - 0.29, z + 1.0), mat=M['blackgloss']))
# 2: office chair
x, y, z = C(2)
add(box('seat', (0.62, 0.58, 0.1), (x, y, z + 0.62), mat=M['blackgloss'], bevel=0.04))
bk = add(box('back', (0.58, 0.08, 0.72), (x, y + 0.3, z + 1.06), mat=M['mesh'], bevel=0.04)); bk.rotation_euler = (math.radians(-8), 0, 0)
add(cyl('lift', 0.035, 0.45, (x, y, z + 0.36), mat=M['chrome']))
for k in range(5):
    a = k * 2 * math.pi / 5 + 0.3
    arm = add(box('arm', (0.36, 0.05, 0.04), (x + math.cos(a) * 0.18, y + math.sin(a) * 0.18, z + 0.1), mat=M['chrome']))
    arm.rotation_euler = (0, 0, a)
    add(sphere('caster', 0.04, (x + math.cos(a) * 0.36, y + math.sin(a) * 0.36, z + 0.05), mat=M['blackgloss'], seg=16, ring=8))
for sx in (-1, 1):
    add(box('armrest', (0.06, 0.34, 0.04), (x + sx * 0.34, y + 0.02, z + 0.84), mat=M['blackgloss'], bevel=0.015))
# 3: a bright bed at 3 a.m. (cell darkened, phone glowing on the pillow)
x, y, z = C(3)
add(box('bedbase', (1.7, 0.8, 0.22), (x, y, z + 0.14), mat=M['white'], bevel=0.03))
add(box('mattress', (1.66, 0.76, 0.14), (x, y, z + 0.32), mat=M['white'], bevel=0.05))
add(box('duvet', (1.2, 0.8, 0.12), (x + 0.24, y - 0.01, z + 0.42), mat=M['duvet'], bevel=0.05))
add(box('pillow', (0.36, 0.55, 0.12), (x - 0.6, y, z + 0.44), mat=M['white'], bevel=0.05))
add(box('bphone', (0.08, 0.15, 0.01), (x - 0.35, y - 0.05, z + 0.49), rot=(0, 0, 0.4), mat=emission_mat('bphl', (0.6, 0.78, 1.0), 12.0)))
light('bphone_l', 'POINT', (x - 0.35, y - 0.05, z + 0.6), 45, color=(0.55, 0.75, 1.0), size=0.05)
add(box('clockx', (0.3, 0.1, 0.12), (x + 0.75, y + 0.25, z + 0.95), mat=emission_mat('clk', (1.0, 0.2, 0.15), 6.0)))
# 4: wall of breaking news (3x3 screens)
x, y, z = C(4)
for rr_ in range(3):
    for cc in range(3):
        add(box('news', (0.62, 0.03, 0.36), (x - 0.68 + cc * 0.68, y + 0.3, z + 0.28 + rr_ * 0.42), rot=(math.pi / 2 * 0, 0, 0), mat=M['blackgloss']))
        pl = add(plane('newsscr', (0.6, 0.34), (x - 0.68 + cc * 0.68, y + 0.28, z + 0.28 + rr_ * 0.42), rot=(math.pi / 2, 0, 0), mat=img_emit(f'newsm{rr_}{cc}', 'tex_news.png', 2.2)))
# 5: endless feed: a phone with cards running past its top and bottom
x, y, z = C(5)
add(box('fphone', (0.46, 0.04, 0.9), (x, y + 0.1, z + CH / 2), mat=M['blackgloss'], bevel=0.05))
for k in range(-2, 4):
    add(plane('card', (0.38, 0.42), (x, y + 0.07, z + 0.2 + k * 0.46), rot=(math.pi / 2, 0, 0), mat=img_emit(f'cardm{k}', 'tex_card.png', 1.6)))
# 6: candy bar (glossy wrapper, a bite showing chocolate)
x, y, z = C(6)
cb = add(box('candy', (1.2, 0.36, 0.18), (x - 0.05, y, z + 0.6), mat=M['red'], bevel=0.05)); cb.rotation_euler = (0, math.radians(-12), math.radians(-15))
for sx in (-1, 1):
    sl = add(box('seal', (0.1, 0.38, 0.2), (x - 0.05 + sx * 0.62, y, z + 0.6 + sx * -0.13), mat=M['chrome'], bevel=0.01)); sl.rotation_euler = cb.rotation_euler
ch = add(box('chocend', (0.3, 0.3, 0.14), (x + 0.72, y - 0.08, z + 0.36), mat=M['choc'], bevel=0.02)); ch.rotation_euler = (0, 0, math.radians(20))
# 7: like badge (a heart and a number)
x, y, z = C(7)
bm = bmesh.new(); pts = []
for k in range(64):
    t = k / 64 * 2 * math.pi
    hx = 16 * math.sin(t) ** 3; hz = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
    pts.append(bm.verts.new((hx * 0.028, 0, hz * 0.028)))
f = bm.faces.new(pts)
ext = bmesh.ops.extrude_face_region(bm, geom=[f])
for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]:
    v.co.y += 0.12
me = bpy.data.meshes.new('heart'); bm.to_mesh(me); bm.free()
ho = bpy.data.objects.new('heart', me); bpy.context.scene.collection.objects.link(ho)
ho.location = (x - 0.15, y - 0.05, z + CH * 0.5); bv = ho.modifiers.new('b', 'BEVEL'); bv.width = 0.04; bv.segments = 5
ho.data.materials.append(M['red']); world.append(ho)
bd = add(cyl('badge', 0.22, 0.04, (x + 0.42, y - 0.12, z + CH * 0.5 + 0.38), rot=(math.pi / 2, 0, 0), mat=img_emit('badgem', 'tex_badge.png', 1.4)))
# 8: trophy (a score you can never win)
x, y, z = C(8)
prof = [(0.001, 0), (0.28, 0), (0.28, 0.06), (0.12, 0.1), (0.05, 0.2), (0.05, 0.45), (0.1, 0.52), (0.3, 0.6), (0.34, 0.9), (0.33, 1.05), (0.001, 0.62)]
bm = bmesh.new()
me = bpy.data.meshes.new('trophy')
import mathutils
verts = []
segs = 48
ring_prev = None
rings = []
for (r, h) in prof[:-1]:
    ring = [bm.verts.new((math.cos(a) * r, math.sin(a) * r, h)) for a in np.linspace(0, 2 * math.pi, segs, endpoint=False)]
    rings.append(ring)
for i in range(len(rings) - 1):
    for k in range(segs):
        bm.faces.new((rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]))
bm.to_mesh(me); bm.free()
tr = bpy.data.objects.new('trophy', me); bpy.context.scene.collection.objects.link(tr)
for p in tr.data.polygons: p.use_smooth = True
tr.location = (x, y, z + 0.05); tr.data.materials.append(M['gold']); world.append(tr)
# 9: a glossy empty display: 'your score' bars (three chrome bars, the tallest missing)
x, y, z = C(9)
for k, hh in enumerate([0.5, 0.8, 1.15]):
    add(box('bar', (0.3, 0.3, hh), (x - 0.45 + k * 0.45, y, z + hh / 2 + 0.03), mat=M['chrome'], bevel=0.02))
add(box('barghost', (0.3, 0.3, 1.5), (x + 0.9, y, z + 0.78), mat=principled('ghostbar', (0.9, 0.95, 1.0), 0.0, transmission=1.0, ior=1.2)))

# ambient: big soft top light and a cool rim, reflections on the floor
light('top', 'AREA', (4.7, -4.0, 6.0), 700, color=(0.9, 0.93, 1.0), size=10, size_y=3, target=(4.7, 0, 1))
figs_spec = [{'name': 'hero', 'pose': 'walk', 'mods': {'head': [-2, -8, 0]}, 'pos': OV.get('hero_pos', [1.9, -1.5, 0]), 'yaw': OV.get('hero_yaw', -100), 'ground': 0.0}]
hero = import_figs(export_figs({'figs': figs_spec}, f'pw_{tag}'))['hero']
set_mat(hero, principled('pwfig', (0.5, 0.2, 0.1), 0.8)); shadow_only(hero)
c = OV.get('cam', [[-1.5, -4.9, 1.5], [3.6, 0.5, 1.8], 26])
cam = camera(c[0], c[1], lens=c[2])
pre = f'{WORK}/{tag}'
render_beauty(pre + '_beauty.npy', W, H, samples=spp, bounces=6, clamp=8.0)
world_passes(pre + '_w', world, W, H, kinds=('id', 'depth'))
json.dump({'objects': {o.pass_index: o.name for o in world}}, open(pre + '_w.index.json', 'w'))
figure_passes(pre + '_fig', hero, W, H, ss=2, holdout=world)
print('done')
