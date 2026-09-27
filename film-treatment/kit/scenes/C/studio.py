# Direction C — P12: a glossy product studio. The figure stands on a plinth (painted separately); a price tag hangs
# from its wrist. Renders: studio beauty (figure shadow-only, tag hidden), tag beauty (transparent, figure holdout),
# figure passes.   usage: python studio.py <tag> <W> <H>
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *
import bpy

tag = sys.argv[1]; W = int(sys.argv[2]); H = int(sys.argv[3])
OV = json.loads(os.environ.get('OV', '{}'))
spp = int(os.environ.get('SPP', '48'))
reset()
world_color((0.9, 0.92, 0.95), 0.6)
M = {
    'cyc': principled('cyc', (0.9, 0.9, 0.9), 0.35, coat=0.3),
    'plinth': principled('plinthS', (0.95, 0.95, 0.96), 0.08, coat=1.0, coat_rough=0.02),
    'chrome': principled('chromeS', (0.95, 0.95, 0.97), 0.05, metal=1.0),
    'fig': principled('figS', (0.5, 0.2, 0.1), 0.8),
    'string': principled('stringS', (0.85, 0.8, 0.7), 0.6),
}
world = []
def add(o):
    world.append(o); return o
# seamless cyc: floor + curved wall
bpy.ops.mesh.primitive_plane_add(size=1)
cyc = bpy.context.active_object; cyc.name = 'cyc'
me = cyc.data
import bmesh
bm = bmesh.new()
R_ = 3.0; D0, D1 = -8.0, 6.0; X0, X1 = -12, 12
prof = [(y, 0.0) for y in np.linspace(D0, D1 - R_, 12)]
for a in np.linspace(0, math.pi / 2, 16)[1:]:
    prof.append((D1 - R_ + math.sin(a) * R_, R_ - math.cos(a) * R_))
prof += [(D1, z) for z in np.linspace(R_ + 0.5, 14, 8)]
verts = []
for (y, z) in prof:
    verts.append((bm.verts.new((X0, y, z)), bm.verts.new((X1, y, z))))
for i in range(len(verts) - 1):
    bm.faces.new((verts[i][0], verts[i][1], verts[i + 1][1], verts[i + 1][0]))
bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
cyc.data.materials.append(M['cyc']); world.append(cyc)
# plinth with chrome ring
PH = 0.5
add(cyl('plinth', 0.6, PH, (0, 0, PH / 2), mat=M['plinth'], verts=96))
add(cyl('ring', 0.615, 0.03, (0, 0, PH - 0.02), mat=M['chrome'], verts=96))
add(cyl('ringb', 0.615, 0.03, (0, 0, 0.03), mat=M['chrome'], verts=96))
# the figure on the plinth
pose = OV.get('pose', {'head': [-4, 18, 0], 'chest': [0, 6, 0], 'rShoulder': [-8, 0, -12], 'rElbow': [-18, 0, 0], 'lShoulder': [2, 0, 8],
                       'lElbow': [-8, 0, 0], 'lHip': [0, 0, 3], 'rHip': [2, 0, -3]})
figs = import_figs(export_figs({'figs': [{'name': 'hero', 'pose': 'stand', 'mods': pose, 'pos': [0, 0, 0], 'yaw': OV.get('yaw', 12), 'ground': PH}]}, f'st_{tag}'))
hero = figs['hero']
set_mat(hero, M['fig'])
# price tag hanging from the right wrist on a string
rw = [o for o in hero if o.name.startswith('hero.' + OV.get('tag_hand', 'l') + 'Wrist.')]
v = Vector((0, 0, 0)); n = 0
for o in rw:
    for c in o.bound_box:
        v += o.matrix_world @ Vector(c); n += 1
wrist = v / n
tag_c = wrist + Vector(OV.get('tag_off', (0.1, -0.5, -0.46)))
timg = bpy.data.images.load(os.path.join(WORK, 'tag_face.png'))
tm = bpy.data.materials.new('tagm'); tm.use_nodes = True
b = tm.node_tree.nodes['Principled BSDF']
tx = tm.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = timg
tm.node_tree.links.new(tx.outputs[0], b.inputs['Base Color'])
b.inputs['Roughness'].default_value = 0.25; b.inputs['Coat Weight'].default_value = 1.0; b.inputs['Coat Roughness'].default_value = 0.03
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
card = bpy.context.active_object; card.name = 'tagcard'; card.scale = (0.25, 0.417, 1)
bpy.ops.object.transform_apply(scale=True)
sol = card.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.006
bev = card.modifiers.new('bev', 'BEVEL'); bev.width = 0.02; bev.segments = 6; bev.limit_method = 'ANGLE'
card.data.materials.append(tm)
card.location = tag_c
card.rotation_euler = (math.radians(OV.get('tag_tilt', 4)), 0, math.radians(OV.get('tag_yaw', 10)))
# string: wrist -> top of the tag
top = tag_c + Vector((0, 0, 0.19))
crv = bpy.data.curves.new('str', 'CURVE'); crv.dimensions = '3D'; crv.bevel_depth = 0.004
sp = crv.splines.new('BEZIER'); sp.bezier_points.add(1)
sp.bezier_points[0].co = wrist + Vector((0, -0.02, -0.08)); sp.bezier_points[1].co = top
for bp in sp.bezier_points:
    bp.handle_left_type = bp.handle_right_type = 'AUTO'
st = bpy.data.objects.new('string', crv); bpy.context.scene.collection.objects.link(st); st.data.materials.append(M['string'])
tagobjs = [card, st]
# studio lights: big soft top light, two strip lights for glossy rims, a cool back glow on the cyc
light('top', 'AREA', (0, -1.0, 5.5), 900, color=(1.0, 0.99, 0.97), size=4.0, target=(0, 0, 1))
light('stripL', 'AREA', (-3.2, -1.5, 2.2), 400, color=(1.0, 1.0, 1.0), size=0.3, size_y=3.5, target=(0, 0, 1.2))
light('stripR', 'AREA', (3.2, -1.2, 2.2), 400, color=(0.95, 0.97, 1.0), size=0.3, size_y=3.5, target=(0, 0, 1.2))
light('back', 'AREA', (0, 5.0, 1.0), 300, color=(0.85, 0.9, 1.0), size=6, target=(0, 6, 3))
c = OV.get('cam', [[0.7, -4.8, 0.95], [0.05, 0, 1.3], 40])
cam = camera(c[0], c[1], lens=c[2])
pre = f'{WORK}/{tag}'
# 1) studio (figure casts shadow only, tag hidden)
shadow_only(hero)
for o in tagobjs:
    o.hide_render = True
render_beauty(pre + '_beauty.npy', W, H, samples=spp, bounces=6)
world_passes(pre + '_w', world, W, H, kinds=('id', 'depth'))
json.dump({'objects': {o.pass_index: o.name for o in world}}, open(pre + '_w.index.json', 'w'))
figure_passes(pre + '_fig', hero, W, H, ss=2, holdout=world)
# 2) the tag alone (figure as holdout: parts of the figure in front of it occlude it)
for o in world:
    o.hide_render = True
for o in hero:
    o.visible_camera = True; o.is_holdout = True
for o in tagobjs:
    o.hide_render = False
render_beauty(pre + '_tag.npy', W, H, samples=spp, transparent=True, bounces=6)
print('done')
