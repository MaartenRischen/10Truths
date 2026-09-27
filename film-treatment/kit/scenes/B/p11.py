# P11 IT IS EVERYTHING: the marble machine. Seven tracks with hand-lettered tags, each curling into an endless spiral,
# marbles mid-flight, the manikin in the middle of it.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
sc = bpy.context.scene
studio_floor(); round_table()
words = ['touch', 'rest', 'body', 'safety', 'search', 'food', 'standing']
cam_loc = Vector((E('CX', '0.0'), E('CY', '-1.25'), E('CZ', '0.62')))
hub = dowel((0, 0, 0), (0, 0, 0.30), r=0.0)  # placeholder (radius 0)
# central feeder ring on four posts above the manikin's head
ring = [Vector((0.075 * math.cos(a), 0.075 * math.sin(a), 0.33)) for a in [2 * math.pi * k / 48 for k in range(49)]]
v, f = tube_path(ring, 0.004, sides=8, cap=False)
place(mesh_from('feedring', v, f, mat=mat_beech_prop('ring_wood', 'X')))
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    dowel((0.075 * math.cos(a), 0.075 * math.sin(a), 0), (0.075 * math.cos(a), 0.075 * math.sin(a), 0.33), r=0.0035)
R = 0.33
for i, w in enumerate(words):
    a = math.radians(90 + 360 * i / 7 + 38)
    c = (R * math.cos(a), R * math.sin(a))
    yaw = math.atan2(cam_loc.x - c[0], -(cam_loc.y - c[1]))
    start = Vector((0.08 * math.cos(a), 0.08 * math.sin(a), 0.33))
    spiral_station(c, top_z=0.25 + 0.02 * (i % 2), bot_z=0.06, r=0.046, turns=2.4 + 0.3 * (i % 3), a0=a + math.pi,
                   tagimg='tag_%s.png' % w, cam_yaw=yaw, marbles=(0.2 + 0.1 * (i % 3), 0.62), feed_from=start, tag_w=0.04 + 0.007 * len(w))
# marbles mid-flight between feeder ring and tracks
for i in range(5):
    a = math.radians(40 + 67 * i)
    marble((0.16 * math.cos(a), 0.16 * math.sin(a), 0.36 + 0.02 * (i % 2)), ['#c43d2b', '#2f6fb0', '#e0b24a', '#3f8a4a', '#8a4fb0'][i], r=0.0075)
man = manikin('standLookUp', (0, 0, 0), rot=E('ROT', '-8'))
light('SPOT', (-1.1, -0.9, 1.2), (0, 0, 0.12), energy=E('KEYW', '260'), kelv=3100, size=0.06, spot=40, blend=0.6, name='key')
light('SPOT', (1.2, 1.1, 0.9), (0, 0, 0.15), energy=E('RIMW', '140'), kelv=3500, size=0.06, spot=40, blend=0.5, name='rim')
light('AREA', (0.9, -1.3, 0.8), (0, 0, 0.1), energy=E('FILLW', '30'), kelv=6000, size=0.8, name='fill')
set_world((0.008, 0.008, 0.009), 1.0)
cam = camera(cam_loc, (0, 0.02, E('TZ', '0.14')), lens=E('LENS', '42'), fstop=E('FSTOP', '5'), focus=(0, 0, 0.18))
out = A['out'] or (OUT + '/p11.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.3, grain=0.014, bloom=0.12, veil=0.15)
