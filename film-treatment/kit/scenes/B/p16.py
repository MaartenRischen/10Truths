# P16 CLOSE: evening. The long table, lamps on, manikins close together. The camera pulls back through the studio door.
# On the workbench in the foreground, "demismatch.com" is carved into the wood.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
FL = -0.76
people, card, hgt = new_world_set(evening=True)
# string lights over the long table
Rm = Matrix.Rotation(math.radians(8), 3, 'Z')
a = Rm @ Vector((-0.24, 0, 0)); b = Rm @ Vector((0.24, 0, 0))
string_lights((a.x, a.y, 0.36), (b.x, b.y, 0.36), n=12, sag=0.05, strength=E('BULBS', '120'))
for q in (a, b):
    dowel((q.x, q.y, 0.024), (q.x, q.y, 0.37), r=0.0025)
# evening light on the set: low warm lamp, dusk-blue fill, sky card dimmer & bluer
key = light('SPOT', (-1.62, -0.52, 0.3), (0.1, 0.06, 0.05), energy=E('KEYW', '200'), kelv=2600, size=0.06, spot=50, blend=0.6, name='sunlamp')
exclude_from_light(key, [card], 'keyexcl')
keyc = light('SPOT', (-1.62, -0.52, 0.3), (0.1, 0.06, 0.05), energy=18, kelv=3000, size=0.06, spot=50, blend=0.6, name='sunlamp_card')
link_light_to(keyc, [card], 'keycard')
light('AREA', (0.8, -1.6, 1.4), (0, 0, 0), energy=E('DUSKW', '30'), kelv=9000, size=1.2, name='dusk')
# studio wall with a door between the camera and the table
wallm = simple('studio_wall2', srgb('#3a3834'), 0.9)
WY = -1.35
place(box_mesh('wallL', 3.0, 0.12, 3.2, mat=wallm), (-1.95, WY, FL))
place(box_mesh('wallR', 3.0, 0.12, 3.2, mat=wallm), (1.95, WY, FL))
place(box_mesh('wallT', 0.9, 0.12, 1.1, mat=wallm), (0.0, WY, FL + 2.1))
trim = simple('door_trim', srgb('#6f6a62'), 0.6)
for sx in (-1, 1):
    place(box_mesh('jamb', 0.06, 0.16, 2.1, mat=trim), (sx * 0.48, WY, FL))
place(box_mesh('head', 1.02, 0.16, 0.06, mat=trim), (0, WY, FL + 2.1))
dr = box_mesh('door', 0.86, 0.04, 2.05, mat=mat_beech_prop('door_leaf', 'Z'), bevel=0.004)
place(dr, (-0.45 + 0.02, WY - 0.03, FL), (0, 0, math.radians(-78)))
# the workshop side: a workbench with the carved name, a desk lamp raking across it
bench = box_mesh('bench', 1.8, 0.7, 0.06, mat=mat_oak_bench(), bevel=0.004)
bo = place(bench, (0.0, -2.75, 0.09))
carved_text('demismatch.com', (0.0, -2.6, 0.15 - 0.0025), size=E('TXT', '0.066'), depth=0.006, rot_z=0.0, target=bo)
for sx in (-0.8, 0.8):
    for sy in (-2.45, -3.05):
        place(box_mesh('bleg', 0.07, 0.07, 0.85, mat=mat_oak_bench()), (sx, sy, FL))
chisel = capsule_mesh('chisel_handle', 0.09, 0.011, 0.012, mat_beech_prop('chisel_wood', 'Z'))
place(chisel, (0.26, -2.52, 0.162), (math.radians(90), 0, math.radians(100)))
blade = box_mesh('chisel_blade', 0.012, 0.07, 0.003, mat=simple('steel_blade', (0.7, 0.7, 0.72), 0.25, 1.0), origin='center')
place(blade, (0.345, -2.527, 0.1545), (0, 0, math.radians(10)))
shav = loose_fibres((0.15, -2.55, 0.15), n=25, spread=0.03)
lamp_head((0.55, -2.42, 0.42), (-0.12, -2.6, 0.15), r=0.06, depth=0.09, glow=4, kelv=2700)
light('SPOT', (0.52, -2.43, 0.4), (-0.12, -2.6, 0.15), energy=E('DESKW', '11'), kelv=2700, size=0.02, spot=55, blend=0.6, name='desklamp')
set_world((0.006, 0.006, 0.008), 1.0)
for k in range(4):
    a_ = math.radians(40 + 90 * k)
    lt = light('POINT', (0.2 * math.cos(a_), 0.2 * math.sin(a_), 0.3), energy=E('WARMPTS', '1.2'), kelv=2400, size=0.01, name='bulbfill')
cam = camera((E('CX', '0.0'), E('CY', '-3.1'), E('CZ', '0.43')), (0.0, E('TY', '-2.05'), E('TZ', '0.11')), lens=E('LENS', '35'), fstop=E('FSTOP', '3.5'), focus=(0.0, -2.6, 0.15))
out = A['out'] or (OUT + '/p16.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.34, grain=0.015, bloom=0.2, veil=0.22)
