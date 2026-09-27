import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from bkit import *
names = sys.argv[sys.argv.index('--poses')+1].split(',')
view = sys.argv[sys.argv.index('--view')+1] if '--view' in sys.argv else 'front'
out = sys.argv[sys.argv.index('--out')+1]
reset()
sp = 0.26
for i, n in enumerate(names):
    manikin(n, ((i - (len(names)-1)/2) * sp, 0, 0), rot=0)
me = bpy.data.meshes.new('floor'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=20); bm.to_mesh(me); bm.free()
fl = add_obj('floor', me); me.materials.append(simple('grey', (0.3,0.3,0.3), 0.8))
W = len(names) * sp
if view == 'front': loc = (0, -4.5, 0.6)
elif view == 'side': loc = (0.001, -4.5, 0.6)
else: loc = (0, -4.5, 1.2)
tgt = (0, 0, 0.14)
c = camera(loc, tgt, lens=50, fstop=None)
cd = c.data; cd.type = 'ORTHO'; cd.ortho_scale = W + 0.1
if view == 'side':
    # rotate figures 90 deg instead
    for o in bpy.data.objects:
        if o.name.startswith('M_'): o.rotation_euler.z = math.radians(90)
if view == 'q':
    for o in bpy.data.objects:
        if o.name.startswith('M_'): o.rotation_euler.z = math.radians(35)
light('SUN', (1, -2, 3), (0, 0, 0), energy=3.5, size=3)
set_world((0.5, 0.55, 0.6), 0.4)
render(out, res=(min(1600, 200*len(names)), 300 if len(names) > 5 else 420), spp=12)
