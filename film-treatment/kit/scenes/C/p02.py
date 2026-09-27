# Direction C — P02: the painted figure holds a glossy CGI phone. Renders the figure passes (ortho) and the phone
# (Cycles, transparent film, figure as holdout) with one camera.   usage: python p02.py <W> <H>
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *
import bpy

W = int(sys.argv[1]); H = int(sys.argv[2])
OV = json.loads(os.environ.get('OV', '{}'))
reset()
world_color((0.05, 0.035, 0.025), 1.0)
pose = OV.get('pose', {'rShoulder': [-58, 0, -4], 'rElbow': [-82, 0, 0], 'rWrist': [-10, 0, 0], 'lShoulder': [4, 0, 6], 'lElbow': [-10, 0, 0],
                       'head': [24, -10, 0], 'chest': [8, -6, 0]})
spec = {'figs': [{'name': 'hero', 'pose': 'stand', 'mods': pose, 'pos': [0, 0, 0], 'yaw': OV.get('yaw', 68), 'ground': 0.0}]}
figs = import_figs(export_figs(spec, 'p02'))
hero = figs['hero']
# the phone at the midpoint of both hands, screen facing the head (and a little towards us)
rw = [o for o in hero if o.name.startswith('hero.rWrist.')]
lw = [o for o in hero if o.name.startswith('hero.lWrist.')]
def centroid(objs):
    v = Vector((0, 0, 0)); n = 0
    for o in objs:
        for c in o.bound_box:
            v += o.matrix_world @ Vector(c); n += 1
    return v / n
pr, pl = centroid(rw), centroid(lw)
head = centroid([o for o in hero if o.name.startswith('hero.head.')])
pc = pr + (head - pr).normalized() * OV.get('toward_head', 0.035) + Vector(OV.get('phone_off', (0.0, 0.0, 0.04)))
M = {
    'glass': principled('pglass', (0.01, 0.01, 0.012), 0.02, coat=1.0, coat_rough=0.0, spec=1.0),
    'frame': principled('pframe', (0.9, 0.9, 0.92), 0.12, metal=1.0),
    'lens': principled('plens', (0.02, 0.02, 0.025), 0.05, coat=1.0),
}
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
body = bpy.context.active_object; body.name = 'phone'
body.scale = (0.088, 0.0095, 0.18)
bpy.ops.object.transform_apply(scale=True)
bev = body.modifiers.new('bev', 'BEVEL'); bev.width = 0.012; bev.segments = 8; bev.limit_method = 'NONE'
for p in body.data.polygons: p.use_smooth = True
body.data.materials.append(M['frame'])
# screen: a thin emissive plane just in front of the body face (-Y side = screen)
img = bpy.data.images.load(os.path.join(WORK, 'screen_ui.png'))
sm = bpy.data.materials.new('pscreen'); sm.use_nodes = True
nt = sm.node_tree; nt.nodes.clear()
tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img
em = nt.nodes.new('ShaderNodeEmission'); em.inputs[1].default_value = 2.2
gl = nt.nodes.new('ShaderNodeBsdfGlossy'); gl.inputs[1].default_value = 0.02
ad = nt.nodes.new('ShaderNodeAddShader'); out = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(tx.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], ad.inputs[0]); nt.links.new(gl.outputs[0], ad.inputs[1])
nt.links.new(ad.outputs[0], out.inputs[0])
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.0051, 0), rotation=(math.pi / 2, 0, 0))
scr = bpy.context.active_object; scr.name = 'screen'; scr.scale = (0.08, 0.172, 1)
bpy.ops.object.transform_apply(scale=True)
scr.data.materials.append(sm)
# UVs: the default plane UV maps 0..1; flip so the image is upright when seen from -Y
for loop in scr.data.loops:
    uv = scr.data.uv_layers.active.data[loop.index].uv
    uv.x = 1 - uv.x
# back: glass with a camera bump
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.0051, 0), rotation=(math.pi / 2, 0, 0))
back = bpy.context.active_object; back.name = 'back'; back.scale = (0.08, 0.172, 1)
bpy.ops.object.transform_apply(scale=True); back.data.materials.append(M['glass'])
cam_b = cyl('lensbump', 0.012, 0.004, (0.022, 0.0075, 0.062), rot=(math.pi / 2, 0, 0), mat=M['lens'])
parts = [body, scr, back, cam_b]
root = bpy.data.objects.new('phone_root', None); bpy.context.scene.collection.objects.link(root)
for p in parts:
    p.parent = root
root.location = pc
# orient: screen normal (-Y local) towards a point between the head and the camera
cam_pos = Vector(OV.get('cam_pos', (0.0, -30.0, 1.4)))
tgt = head.lerp(Vector((pc.x, cam_pos.y, pc.z)), OV.get('face_mix', 0.5))
d = (tgt - pc).normalized()
q = (-d).to_track_quat('Y', 'Z')
root.rotation_mode = 'QUATERNION'; root.rotation_quaternion = q
root.rotation_quaternion = root.rotation_quaternion @ Euler((0, math.radians(OV.get('roll', 8)), 0)).to_quaternion()
bpy.context.view_layer.update()

# lights: warm torch from the upper left (the cave's light), a cool rim from the right, a soft top fill
light('torch', 'AREA', (pc.x - 1.2, pc.y - 1.4, pc.z + 1.0), 120, color=(1.0, 0.72, 0.42), size=0.5, target=tuple(pc))
light('rim', 'AREA', (pc.x + 1.0, pc.y + 0.6, pc.z + 0.6), 60, color=(0.6, 0.78, 1.0), size=0.6, target=tuple(pc))
light('top', 'AREA', (pc.x, pc.y - 0.3, pc.z + 1.5), 25, color=(1.0, 0.9, 0.8), size=1.5, target=tuple(pc))
# reflection card so the glass shows a long highlight
card = plane('card', (1.5, 0.3), (pc.x - 0.6, pc.y - 1.2, pc.z + 0.5), mat=emission_mat('cardm', (1.0, 0.85, 0.65), 1.5))
look_at(card, tuple(pc)); card.rotation_euler.rotate_axis('X', math.radians(90))
card.visible_camera = False

VW = OV.get('VW', 2.6)
cz = OV.get('cz', 1.36); cx = OV.get('cx', 0.25)
cam = camera((cx, -30, cz), (cx, 0, cz), ortho=VW)
pre = f'{WORK}/p02'
figure_passes(pre + '_fig', hero, W, H, ss=2)
# phone beauty with the figure as holdout (fingers in front of the phone occlude it)
for o in hero:
    o.is_holdout = True
render_beauty(pre + '_phone.npy', W, H, samples=int(os.environ.get('SPP', '48')), transparent=True, bounces=6)
json.dump({'VW': VW, 'cx': cx, 'cz': cz}, open(pre + '_cam.json', 'w'))
print('done')
