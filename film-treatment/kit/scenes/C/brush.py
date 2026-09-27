# Direction C — a paintbrush loaded with ochre, over the picture plane (z = 0), with its shadow (shadow catcher).
# usage: python brush.py <tag> <W> <H>   env OV: {tip:[px,py] (pixels), yaw: deg (handle direction in the plane),
#                                              tilt: deg from vertical, lift: gap above plane}
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *
import bpy

tag = sys.argv[1]; W = int(sys.argv[2]); H = int(sys.argv[3])
OV = json.loads(os.environ.get('OV', '{}'))
reset()
world_color((0.35, 0.3, 0.26), 0.35)
CAMZ, LENS = 10.0, 50.0
vw = 2 * CAMZ * math.tan(math.atan(18 / LENS)); vh = vw * H / W
fx, fy = OV.get('tip', [0.55, 0.4])
X = (fx - 0.5) * vw; Y = (0.5 - fy) * vh
M = {
    'handle': principled('handle', (0.12, 0.035, 0.025), 0.3, coat=0.9, coat_rough=0.08),
    'ferrule': principled('ferrule', (0.85, 0.82, 0.76), 0.18, metal=1.0),
    'hair': principled('hair', (0.62, 0.5, 0.36), 0.6, sheen=0.5),
    'paint': principled('paintb', (0.62, 0.2, 0.08), 0.22, coat=0.8, coat_rough=0.1),
}
L = 5.2  # brush length (scene units) - big, close to camera
# build along +Z from the tip at the origin, then rotate into place
parts = []
# flat (filbert) brush: bristle head, paint load on the tip, crimped ferrule, long lacquered handle
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(0, 0, 0.36), segments=48, ring_count=24)
tipc = bpy.context.active_object; tipc.scale = (0.95, 0.34, 1.35); parts.append(tipc); tipc.data.materials.append(M['paint'])
bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.27, radius2=0.25, depth=0.5, location=(0, 0, 0.72))
hair = bpy.context.active_object; hair.scale = (1.0, 0.36, 1.0); parts.append(hair); hair.data.materials.append(M['hair'])
bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.26, radius2=0.14, depth=0.8, location=(0, 0, 1.3))
fer = bpy.context.active_object; fer.scale = (1.0, 0.42, 1.0); parts.append(fer); fer.data.materials.append(M['ferrule'])
bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.15, radius2=0.1, depth=L - 1.7, location=(0, 0, 1.7 + (L - 1.7) / 2))
hdl = bpy.context.active_object; parts.append(hdl); hdl.data.materials.append(M['handle'])
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(0, 0, L), segments=32, ring_count=16)
cap = bpy.context.active_object; parts.append(cap); cap.data.materials.append(M['handle'])
for p in parts:
    for f in p.data.polygons: f.use_smooth = True
root = bpy.data.objects.new('brush', None); bpy.context.scene.collection.objects.link(root)
for p in parts:
    p.parent = root
tilt = math.radians(OV.get('tilt', 52)); yaw = math.radians(OV.get('yaw', 35))
root.rotation_euler = (0, 0, 0)
root.rotation_euler.rotate(Euler((0, tilt, 0)))
root.rotation_euler.rotate(Euler((0, 0, yaw)))
root.location = (X, Y, OV.get('lift', 0.02))
# picture plane as shadow catcher
pl = plane('plane', (vw * 1.6, vh * 1.6), (0, 0, 0), mat=principled('pl', (0.8, 0.8, 0.8), 0.9))
pl.is_shadow_catcher = True
light('key', 'AREA', (X - 4, Y + 3, 7), 900, color=(1.0, 0.86, 0.66), size=1.2, target=(X, Y, 0))
light('fill', 'AREA', (X + 5, Y - 4, 5), 150, color=(0.8, 0.85, 1.0), size=4, target=(X, Y, 0))
cam = camera((0, 0, CAMZ), (0, 0, 0), lens=LENS)
cam.rotation_euler = (0, 0, 0)
render_beauty(f'{WORK}/{tag}_brush.npy', W, H, samples=int(os.environ.get('SPP', '64')), transparent=True, bounces=6)
print('done')
