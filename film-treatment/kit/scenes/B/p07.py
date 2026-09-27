# P07 TUNED DRIVES: macro at the fire.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
people, walkers, card, hgt = ancestral_set(fire_w=E('FIREW', '2.0'), grass=420, with_people=False, flame_scale=E('FLAME', '1.9'),
                                           huts=[(62, 0.45), (116, 0.45), (170, 0.44), (20, 0.44)])
def put(pose, x, y, face=(0, 0), scale=1.0):
    return manikin(pose, (x, y, hgt(x, y) - 0.001), face=face, scale=scale)

def local_hand(pose, side):
    M = JOINTS[pose][side + 'Wrist']
    return (M @ Vector((0, 0, -0.1)))

# handover pair on the east side: A's right hand meets B's left hand
ax, ay = polar(322, 0.2)
ga = put('giveA', ax, ay)
bpy.context.view_layer.update()
hA = jpos(ga, 'rWrist', (0, 0, -0.11))
bx, by = polar(350, 0.2)
gb = put('giveB', bx, by)
bpy.context.view_layer.update()
hB = jpos(gb, 'lWrist', (0, 0, -0.11))
gb.location.x += hA.x - hB.x; gb.location.y += hA.y - hB.y
gb.location.z = hgt(gb.location.x, gb.location.y) - 0.001
bpy.context.view_layer.update()
hB = jpos(gb, 'lWrist', (0, 0, -0.11))
print('hand gap', (hA - hB).length, 'B at', tuple(gb.location))
food = rock_mesh('tuber', 11, r=0.011, squash=(1.6, 0.85, 0.8), rough=0.22, mat=simple('tuber', srgb('#9a5a2c'), 0.55))
place(food, hA.lerp(hB, 0.5) + Vector((0, 0, 0.007)), (0, 0.3, 0.7))
# heads leaning together behind the fire (north)
lx, ly = polar(103, 0.215); put('leanL', lx, ly)
rx_, ry_ = polar(86, 0.21); put('leanR', rx_, ry_)
# one apart, head down (west)
px, py = polar(152, 0.285); put('apart', px, py)
# the stranger at the edge of the light (north-east, against the painted sky)
sx, sy = polar(40, 0.575); st = put('stranger', sx, sy)
key = light('SPOT', (-1.62, -0.52, 0.36), (0.1, 0.06, 0.05), energy=E('KEYW', '120'), kelv=2900, size=0.06, spot=50, blend=0.6, name='sunlamp')
exclude_from_light(key, [card, st], 'keyexcl')
keyc = light('SPOT', (-1.62, -0.52, 0.36), (0.1, 0.06, 0.05), energy=E('KEYCW', '120'), kelv=3900, size=0.06, spot=50, blend=0.6, name='sunlamp_card')
link_light_to(keyc, [card], 'keycard')
rim = light('SPOT', (0.9, 1.4, 0.5), (0, 0.1, 0.06), energy=E('RIMW', '40'), kelv=3300, size=0.05, spot=40, blend=0.5, name='rim')
set_world((0.006, 0.006, 0.007), 1.0)
bpy.context.scene.cycles.film_exposure = 1.25
if os.environ.get('TOP'):
    cam = camera((0.0, 0.05, 1.2), (0.0, 0.05, 0.0), lens=50, fstop=None); cam.data.type = 'ORTHO'; cam.data.ortho_scale = 0.9
    for o in bpy.data.objects:
        if o.name.startswith('M_'): print(o.name, tuple(round(v, 3) for v in o.location))
    render(WORK + '/test/p07top.png', res=(480, 480), spp=8); sys.exit()
cx, cy = polar(236, 0.64)
cam = camera((cx, cy, 0.14), (0.03, 0.05, 0.07), lens=E('LENS', '50'), fstop=E('FSTOP', '2.8'), focus=hA)
out = A['out'] or (OUT + '/p07.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.3, grain=0.016, bloom=0.14, veil=0.25)
