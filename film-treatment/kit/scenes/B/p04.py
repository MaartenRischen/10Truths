# P04 SELF-BLAME: one manikin in a small bathroom set, facing a mirror, one hand on its chest.
# The room is subtly wrong: the door too tall, the ceiling too low.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
CEIL = 0.325
BY = 0.26
paint = simple('paint_bath', srgb('#a3ad9e'), 0.75)
tiles = mat_tiles('wall_tiles', '#e4e2da', '#a7a398', 0.013, rot=True)
tiles_side = mat_tiles('wall_tiles_side', '#e4e2da', '#a7a398', 0.013, rot=False)
floor_t = mat_tiles('floor_tiles', '#5f6468', '#2e3134', 0.02)
place(box_mesh('bfloor', 0.6, 0.6, 0.01, mat=floor_t), (0, 0.0, -0.01))
# back wall: tiles to 0.15 then paint
place(box_mesh('back_t', 0.56, 0.01, 0.15, mat=tiles), (0, BY + 0.005, 0))
place(box_mesh('back_p', 0.56, 0.01, CEIL - 0.15, mat=paint), (0, BY + 0.005, 0.15))
for sx in (-1, 1):
    w = box_mesh('side_t', 0.01, 0.6, 0.15, mat=tiles_side); place(w, (sx * 0.28, -0.03, 0))
    w = box_mesh('side_p', 0.01, 0.6, CEIL - 0.15, mat=paint); place(w, (sx * 0.28, -0.03, 0.15))
place(box_mesh('ceiling', 0.58, 0.62, 0.012, mat=simple('ceil_paint', srgb('#cfd2c8'), 0.85)), (0, -0.03, CEIL))
# the too-tall door on the right wall: runs up into the ceiling
door = box_mesh('door', 0.004, 0.075, 0.46, mat=mat_beech_prop('door_wood', 'Z'), bevel=0.0008)
place(door, (0.274, 0.09, 0.0))
for dy in (-0.041, 0.041):
    place(box_mesh('jamb', 0.006, 0.006, 0.46, mat=simple('jamb_paint', srgb('#e2e0d8'), 0.5)), (0.273, 0.09 + dy, 0.0))
knob = rock_mesh('knob', 1, r=0.0035, rough=0.0, mat=mat_brass()); place(knob, (0.268, 0.06, 0.14))
# sink + mirror + fluorescent bar
sink_p = [(0.009, 0.0), (0.007, 0.03), (0.006, 0.075), (0.012, 0.09), (0.034, 0.1), (0.04, 0.112), (0.036, 0.114), (0.03, 0.105), (0.0005, 0.1)]
porc = simple('porcelain', srgb('#f1f0ec'), 0.12, Coat_Weight=0.6)
place(lathe_mesh('sink', sink_p, 40, porc), (0.0, BY - 0.045, 0.0))
tap = tube_path([Vector((0, BY - 0.004, 0.118)), Vector((0, BY - 0.01, 0.128)), Vector((0, BY - 0.022, 0.126))], 0.0022, sides=10)
place(mesh_from('tap', tap[0], tap[1], mat=simple('chrome', (0.9, 0.9, 0.9), 0.06, 1.0)))
mirror = box_mesh('mirror', 0.12, 0.004, 0.13, mat=simple('mirror', (0.93, 0.93, 0.93), 0.015, 1.0), origin='center')
place(mirror, (0.0, BY - 0.002, 0.215))
place(box_mesh('mframe', 0.128, 0.003, 0.138, mat=simple('mframe_black', srgb('#2a2a2a'), 0.4), origin='center'), (0.0, BY - 0.0001, 0.215))
bar = box_mesh('fluoro', 0.1, 0.012, 0.01, mat=emissive('fluoro_glow', kelv_wb(5200) and tuple(x * y for x, y in zip(kelv_wb(5200), (0.92, 1.0, 0.86))), 9.0), origin='center')
place(bar, (0.0, BY - 0.01, 0.295))
light('AREA', (0.0, BY - 0.025, 0.29), (0.0, 0.0, 0.15), energy=E('BARW', '3.2'), kelv=5200, size=(0.1, 0.02), name='bar')
man = manikin('heartHand', (E('MX', '0.055'), E('MY', '0.1'), 0.0), face=(0.0, 0.5))
light('AREA', (-0.1, -0.6, 0.22), (0, 0.1, 0.18), energy=E('FILLW', '0.35'), kelv=4600, size=0.3, name='fill')
set_world((0.004, 0.004, 0.004), 1.0)
bpy.context.view_layer.update()
head = jpos(man, 'head', (0, 0, 0.2))
cam_loc = Vector((E('CX', '-0.2'), E('CY', '-0.3'), E('CZ', '0.19')))
mpt = Vector((0.0, BY - 0.004, 0.22))
fd = (mpt - cam_loc).length + (mpt - head).length
cam = camera(cam_loc, (E('TX', '0.05'), BY, E('TZ', '0.2')), lens=E('LENS', '30'), fstop=E('FSTOP', '2.8'), focus=fd)
out = A['out'] or (OUT + '/p04.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.34, grain=0.016, bloom=0.12, veil=0.1, veil_col=[0.85, 1.0, 0.85])
