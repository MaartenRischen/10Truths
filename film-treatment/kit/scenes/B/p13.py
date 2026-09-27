# P13 NOT BROKEN: work lights on. The whole studio visible: C-stands, a lamp, gaffer tape, the table edge.
# The manikin stands intact at the centre of the set in a pool of light.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
FL = -0.76
studio_floor()
round_table()
wallm = simple('studio_wall', srgb('#34363a'), 0.9)
place(box_mesh('backwall', 9, 0.1, 4.0, mat=wallm), (0, 3.2, FL))
place(box_mesh('sidewall', 0.1, 9, 4.0, mat=wallm), (-3.6, 0, FL))
# acoustic panels on the back wall
for i in range(6):
    place(box_mesh('panel', 0.6, 0.05, 1.2, mat=simple('felt_panel', srgb('#2a2c30'), 0.98), bevel=0.01), (-2.2 + i * 0.85, 3.13, FL + 0.9))
# the modern set left on the table: cardboard blocks + a spiral or two
fac = mat_facade('facade_set', base='#8d8a85', lit=0.0, strength=0.0)
b = city_grid(-0.5, 0.5, 0.05, 0.55, block=0.16, street=0.05, hmin=0.12, hmax=0.5, seed=21, skip=lambda x, y: math.hypot(x, y) > 0.62 or math.hypot(x, y) < 0.2)
place(blocks_mesh('setcity', b, fac))
for k, a in enumerate((165, 20, 110)):
    c = polar(a, 0.42)
    spiral_station(c, top_z=0.24, bot_z=0.06, r=0.046, turns=2.5, a0=math.radians(a), marbles=(0.4,))
MXP = E('MXP', '0.1')
man = manikin('standTall', (MXP, -0.12, 0), face=(0.3, -1.0))
# gaffer tape on the table edge and floor marks
place(box_mesh('edge_tape', 0.3, 0.001, 0.035, mat=mat_gaffer('#2b2b2b')), (0.1, -0.748, -0.038), (0, 0, math.radians(8)))
place(box_mesh('top_tape', 0.12, 0.045, 0.0008, mat=mat_gaffer('#d8d2c2')), (0.12, -0.6, 0.0002), (0, 0, 0.3))
place(box_mesh('mark_x1', 0.05, 0.008, 0.0008, mat=mat_gaffer('#c9a23a')), (MXP, -0.12, 0.0002), (0, 0, 0.785))
place(box_mesh('mark_x2', 0.05, 0.008, 0.0008, mat=mat_gaffer('#c9a23a')), (MXP, -0.12, 0.0002), (0, 0, -0.785))
floor_tape_T((0.9, -1.3), 0.2); floor_tape_T((-1.1, -0.9), -0.5, col='#c9a23a')
# studio gear
c_stand((0.95, 1.3), h=1.9, arm_to=(0.45, 0.75, 0.95))
c_stand((-1.45, 1.7), h=1.7, arm_to=(-0.9, 1.1, 0.85), rot=1.0)
fr = fresnel_on_stand((-0.75, 1.05), 0.55, (MXP, -0.12, 0.15), power=E('FRESW', '160'), kelv=3100)
apple_box((1.35, 2.0), 0.4); apple_box((1.42, 2.02), 0.45, floor=FL + 0.2)
cable([(-0.75, 1.05), (-0.4, 1.6), (0.3, 1.9), (1.1, 2.5), (1.8, 2.9)])
cable([(1.35, 0.55), (1.7, 0.1), (2.3, -0.4), (2.9, -0.6)], r=0.007)
# ladder against the side wall
al = simple('alu', (0.75, 0.76, 0.78), 0.35, 1.0)
for sx in (-0.2, 0.2):
    tube_between((-3.3, 0.8 + sx, FL), (-3.5, 0.8 + sx, FL + 2.2), 0.02, al, 'ladder_rail')
for k in range(8):
    z = FL + 0.25 + k * 0.26; x = -3.3 - 0.2 * (z - FL) / 2.2
    tube_between((x, 0.6, z), (x, 1.0, z), 0.012, al, 'rung')
# work lights: overhead LED panels, cool and bright, plus the pool of light on the manikin
for x, y in ((-1.2, -0.2), (1.2, -0.2), (0.0, 1.6)):
    lp = light('AREA', (x, y, FL + 3.4), (x, y, FL), energy=E('WORKW', '300'), kelv=5200, size=(1.2, 0.3), name='worklight')
    place(box_mesh('ledpanel', 1.22, 0.32, 0.02, mat=emissive('led_panel', kelv_wb(5200), 6.0), origin='center'), (x, y, FL + 3.42))
light('SPOT', (MXP + 0.05, -0.25, 1.3), (MXP, -0.12, 0.0), energy=E('POOLW', '1100'), kelv=3200, size=0.03, spot=10, blend=0.25, name='pool')
set_world((0.03, 0.032, 0.035), 1.0)
cam = camera((E('CX', '0.3'), E('CY', '-1.0'), E('CZ', '0.13')), (E('TX', '-0.14'), 0.6, E('TZ', '0.3')), lens=E('LENS', '24'), fstop=E('FSTOP', '4'), focus=(MXP, -0.12, 0.15))
out = A['out'] or (OUT + '/p13.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.26, grain=0.014, bloom=0.08, veil=0.06, veil_col=[0.9, 0.95, 1.0])
