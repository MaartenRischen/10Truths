# P09 THE LOOP: macro of a wooden marble dropping into a small wooden cup at the end of a short track;
# a manikin beside it, relaxed. The one closed loop so far.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
sc = bpy.context.scene
top = box_mesh('bench', 2.0, 1.2, 0.04, mat=mat_oak_bench(), bevel=0.003)
place(top, (0, 0.3, -0.04))
studio_floor()
# short track: from a little tower down to the cup
cupc = Vector((0.0, 0.0, 0.0))
path = catmull([(-0.34, 0.16, 0.2), (-0.24, 0.1, 0.15), (-0.13, 0.05, 0.085), (-0.05, 0.02, 0.045), (-0.025, 0.012, 0.034)], n=12)
channel('track', path)
for pt in (path[4], path[len(path) // 2], path[-6]):
    dowel((pt.x, pt.y, 0), (pt.x, pt.y, pt.z - 0.001))
tower = cyl_mesh('tower', 0.03, 0.22, seg=40, mat=mat_beech_prop('tower_wood', 'Z'))
place(tower, (-0.37, 0.18, 0))
c = cup((cupc.x, cupc.y, 0), r=0.02, h=0.026)
# marbles: one resting in the cup, one mid-drop just above it (slight motion blur), one waiting at the top
marble((0.001, 0.0, 0.0125), '#c43d2b', r=0.0085)
drop = marble((-0.006, 0.004, 0.036), '#2f6fb0', r=0.0085)
drop.keyframe_insert('location', frame=0)
drop.location = (0.0, 0.0, 0.024); drop.keyframe_insert('location', frame=2)
sc.frame_set(1)
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
marble((-0.33, 0.155, 0.212), '#e0b24a')
# the manikin, relaxed beside the cup
man = manikin('relaxSit', (E('MX', '0.14'), E('MY', '0.06'), 0.0), rot=E('ROT', '14'))
# warm, soft window-like key + practical glow
light('AREA', (-0.5, -0.6, 0.6), (0, 0, 0.02), energy=E('KEYW', '16'), kelv=3600, size=0.35, name='key')
light('SPOT', (0.6, 0.5, 0.35), (0, 0, 0.03), energy=E('RIMW', '25'), kelv=3000, size=0.05, spot=30, blend=0.5, name='rim')
light('AREA', (0.2, -0.8, 0.2), (0, 0, 0.03), energy=E('FILLW', '4'), kelv=5000, size=0.6, name='fill')
set_world((0.01, 0.009, 0.009), 1.0)
bokeh_bulbs([(-0.6, 1.4, 0.35), (0.5, 1.6, 0.5), (1.1, 1.2, 0.2)], strength=40, r=0.02, kelv=2600)
cam = camera((E('CX', '0.06'), E('CY', '-0.74'), E('CZ', '0.14')), (E('TX', '0.07'), 0.03, E('TZ', '0.075')), lens=E('LENS', '70'), fstop=E('FSTOP', '2.8'), focus=(0.0, 0.0, 0.025))
out = A['out'] or (OUT + '/p09.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.3, grain=0.015, bloom=0.14, veil=0.2)
