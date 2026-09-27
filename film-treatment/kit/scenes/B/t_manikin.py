import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from bkit import *
A = args()
reset()
m = manikin('standTall', (0, 0, 0), rot=-25)
m2 = manikin('walk', (0.18, 0.35, 0), rot=10)
me = bpy.data.meshes.new('top'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bm.to_mesh(me); bm.free()
top = add_obj('top', me); top.scale = (2, 2, 0.04); top.location = (0, 0, -0.02)
me.materials.append(mat_walnut())
close = '--close' in sys.argv
if close:
    camera((0.12, -0.42, 0.27), (0, 0, 0.24), lens=100, fstop=2.8)
else:
    camera((0.35, -0.95, 0.22), (0, 0, 0.16), lens=85, fstop=4)
light('SPOT', (-0.6, -0.5, 0.7), (0, 0, 0.15), energy=60, kelv=3200, size=0.03, spot=40, blend=0.4)
light('AREA', (0.8, 0.4, 0.5), (0, 0, 0.15), energy=5, kelv=7000, size=0.5)
set_world((0.02, 0.018, 0.016), 1.0)
out = WORK + '/test/t_manikin%s.png' % ('_close' if close else '')
render(out, res=A['res'] or (960, 540), spp=A['spp'] or 32, test=A['test'])
post(out)
