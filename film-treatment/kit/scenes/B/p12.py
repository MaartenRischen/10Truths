# P12 ON PURPOSE: behind the machine, a small coin-operated mechanism; each spiral turns a crank that drops a coin into a box.
# A little price tag hangs from the manikin's wrist.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
sc = bpy.context.scene
studio_floor(); round_table()
words = ['touch', 'rest', 'body', 'safety', 'search', 'food', 'standing']
cam_loc = Vector((E('CX', '0.22'), E('CY', '0.88'), E('CZ', '0.15')))
R = 0.33
stations = []
for i, w in enumerate(words):
    a = math.radians(90 + 360 * i / 7 + 12)
    c = (R * math.cos(a), R * math.sin(a))
    yaw = math.atan2(cam_loc.x - c[0], -(cam_loc.y - c[1]))
    start = Vector((0.08 * math.cos(a), 0.08 * math.sin(a), 0.33))
    spiral_station(c, top_z=0.25 + 0.02 * (i % 2), bot_z=0.06, r=0.046, turns=2.4 + 0.3 * (i % 3), a0=a + math.pi,
                   tagimg=None, marbles=(0.3, 0.7), feed_from=start)
    stations.append(c)
ring = [Vector((0.075 * math.cos(a), 0.075 * math.sin(a), 0.33)) for a in [2 * math.pi * k / 48 for k in range(49)]]
v, f = tube_path(ring, 0.004, sides=8, cap=False)
place(mesh_from('feedring', v, f, mat=mat_beech_prop('ring_wood', 'X')))
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    dowel((0.075 * math.cos(a), 0.075 * math.sin(a), 0), (0.075 * math.cos(a), 0.075 * math.sin(a), 0.33), r=0.0035)
# ---- the mechanism behind the machine (towards +Y, camera side)
box_c = Vector((0.09, 0.47, 0.035))
place(box_mesh('plinth', 0.13, 0.09, 0.035, mat=mat_oak_bench(), bevel=0.002), (0.09, 0.47, 0.0))
coin_box(box_c, w=0.11, d=0.075, h=0.07)
# coin hopper + brass chute into the slot
hop = lathe_mesh('hopper', [(0.012, 0.0), (0.012, 0.16), (0.03, 0.2), (0.032, 0.205)], 32, mat_brass())
hopper_c = Vector((-0.07, 0.43, 0.0)); place(hop, hopper_c)
chute = catmull([hopper_c + Vector((0.01, 0.0, 0.17)), hopper_c.lerp(box_c, 0.5) + Vector((0, 0.01, 0.14)), box_c + Vector((-0.02, 0.0, 0.105))], 10)
channel('chute', chute, W=0.018, D=0.006, t=0.0012, mat=mat_brass())
dowel((hopper_c.x + 0.08, hopper_c.y + 0.01, 0), tuple(chute[len(chute) // 2] + Vector((0, 0, -0.004))), r=0.003)
# coins: sliding down the chute, one mid-drop over the slot, a small pile beside the box
for k, t in enumerate((0.25, 0.55, 0.85)):
    p = chute[int(t * (len(chute) - 1))]
    coin(p + Vector((0, 0, 0.004)), (0.0, -0.45, 0.0))
coin(box_c + Vector((-0.005, 0.0, 0.085)), (math.radians(80), 0, 0.2))
coin(box_c + Vector((0.004, 0.0, 0.1)), (math.radians(70), 0, -0.3))
rng = random.Random(3)
for k in range(9):
    coin(Vector((0.17 + rng.uniform(-0.012, 0.012), 0.4 + rng.uniform(-0.012, 0.012), 0.0007 + 0.0013 * (k % 4))), (rng.uniform(-0.05, 0.05), rng.uniform(-0.05, 0.05), rng.uniform(0, 6)))
# gears + cranks driven from the nearest spirals (twine belts)
gm = gear_mesh('gear_big', r=0.045, teeth=22, t=0.007, mat=mat_walnut())
gs = gear_mesh('gear_small', r=0.026, teeth=13, t=0.007, mat=mat_walnut())
g1c = Vector((0.3, 0.44, 0.11)); g2c = Vector((0.3, 0.44, 0.11 + 0.069))
place(gm, g1c, (math.radians(90), 0, math.radians(8)))
place(gs, g2c, (math.radians(90), 0, math.radians(8)))
dowel((g1c.x, g1c.y + 0.012, 0), (g1c.x, g1c.y + 0.012, g2c.z + 0.03), r=0.004)
crank = tube_path([g1c + Vector((0, -0.012, 0)), g1c + Vector((0.0, -0.02, 0.0)), g1c + Vector((0.03, -0.02, -0.03)), g1c + Vector((0.03, -0.035, -0.03))], 0.0018, sides=6)
place(mesh_from('crank', crank[0], crank[1], mat=mat_brass()))
for (sx, sy) in stations[:3]:
    belt = [Vector((sx, sy, 0.05)), Vector((sx, sy, 0.05)).lerp(g1c, 0.5) + Vector((0, 0, -0.01)), g1c + Vector((0, 0.004, 0.0))]
    v, f = tube_path(catmull(belt, 8), 0.0007, sides=4)
    place(mesh_from('belt', v, f, mat=mat_twine()))
# the manikin with a price tag on its wrist
man = manikin('tagArm', (E('MX', '0.04'), E('MY', '0.13'), 0), rot=E('ROT', '172'))
bpy.context.view_layer.update()
wr = jpos(man, 'rWrist', (0, 0, 0))
loop = [wr + Vector((0.006 * math.cos(a), 0.006 * math.sin(a), 0.001 * math.sin(2 * a))) for a in [2 * math.pi * k / 16 for k in range(17)]]
v, f = tube_path(loop, 0.0004, sides=4, cap=False)
place(mesh_from('wristloop', v, f, mat=mat_twine()))
yaw_t = math.atan2(cam_loc.x - wr.x, -(cam_loc.y - wr.y))
tg = tag('tag_price.png', wr + Vector((0, 0, -0.004)), w=0.03, h=0.018, drop=0.018, yaw=yaw_t)
tg.rotation_euler = (0.0, math.radians(-8), yaw_t)
light('SPOT', (0.9, 1.4, 0.8), (0.05, 0.3, 0.08), energy=E('KEYW', '110'), kelv=3000, size=0.05, spot=40, blend=0.6, name='key')
light('SPOT', (-1.0, -0.6, 1.0), (0, 0, 0.15), energy=E('RIMW', '120'), kelv=4200, size=0.06, spot=40, blend=0.5, name='rim')
light('AREA', (0.4, 1.3, 0.3), (0.1, 0.4, 0.05), energy=E('FILLW', '8'), kelv=5200, size=0.5, name='fill')
set_world((0.006, 0.006, 0.007), 1.0)
cam = camera(cam_loc, (E('TX', '0.03'), E('TY', '0.2'), E('TZ', '0.155')), lens=E('LENS', '44'), fstop=E('FSTOP', '3.2'), focus=wr + Vector((0, 0.01, -0.02)))
out = A['out'] or (OUT + '/p12.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.32, grain=0.015, bloom=0.14, veil=0.15)
