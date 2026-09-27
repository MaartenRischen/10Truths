# P02 NOT ANTI-TECH: workbench close-up; tiny tools in a row like jewels: flint hand-axe, wooden wheel, brass lens,
# circuit board. A manikin hand rests on the flint.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
place(box_mesh('bench', 1.6, 1.0, 0.05, mat=mat_oak_bench(), bevel=0.004), (0, 0.2, -0.05))
studio_floor()
felt_cloth((0.03, 0.005, 0.0), 0.26, 0.07)
Z = 0.0015
xs = [-0.075, -0.018, 0.037, 0.093]
fl = place(knapped_flint(L_=0.042, W_=0.028, T_=0.013), (xs[0], 0.0, Z + 0.005), (0, 0, math.radians(-70)))
wh = wooden_wheel(); wh.location = (xs[1], 0.0, Z); wh.rotation_euler = (0, 0, 0.3)
ln = brass_lens(); ln.location = (xs[2], 0.0, Z + 0.0019); ln.rotation_euler = (0, 0, math.radians(35))
pc = circuit_board(); pc.location = (xs[3], 0.0, Z); pc.rotation_euler = (0, 0, math.radians(-8))
# the manikin kneels behind the flint, its right hand resting on it
man = manikin('kneelReach', (xs[0], 0.12, 0.0), rot=E('MROT', '62'))
bpy.context.view_layer.update()
hp = jpos(man, 'rWrist', (0, 0, -0.012 * 0 - 0.0))
tip = jpos(man, 'rWrist', (0, -0.015, 0))
target = Vector((xs[0] - 0.008, 0.006, Z + 0.0145))
hc = jpos(man, 'rWrist', (0, -0.012, 0)) if False else None
# hand centre ~ 0.013 m below the wrist joint along the hand: use FK hand point
M = JOINTS['kneelReach']['rWrist']
hand_local = Vector((0, -0.35 * 0.25 * 0.15 / 0.15, 0))
hcw = man.matrix_world @ (M @ Vector((0, -0.35 * 0.25, 0)))
man.location += target - hcw
bpy.context.view_layer.update()
print('hand now', tuple(round(v, 4) for v in (man.matrix_world @ (M @ Vector((0, -0.35 * 0.25, 0))))))
light('AREA', (-0.35, -0.3, 0.45), (0.0, 0.0, 0.0), energy=E('KEYW', '5'), kelv=3200, size=0.25, name='key')
light('SPOT', (0.4, 0.45, 0.25), (0.02, 0.0, 0.0), energy=E('RIMW', '9'), kelv=4200, size=0.02, spot=30, blend=0.4, name='rim')
light('SPOT', (0.05, -0.25, 0.4), (0.03, 0.0, 0.0), energy=E('JEWW', '6'), kelv=3600, size=0.01, spot=18, blend=0.5, name='jewel')
light('SPOT', (xs[0] + 0.12, -0.12, 0.12), (xs[0], 0.0, 0.004), energy=E('FLINTW', '1.2'), kelv=4500, size=0.005, spot=12, blend=0.4, name='flintpin')
set_world((0.006, 0.006, 0.007), 1.0)
cam = camera((E('CX', '0.02'), E('CY', '-0.36'), E('CZ', '0.1')), (E('TX', '-0.03'), 0.02, E('TZ', '0.068')), lens=E('LENS', '45'), fstop=E('FSTOP', '4.5'), shift=(0, E('SHY', '-0.06')), focus=(0.0, 0.0, 0.006))
out = A['out'] or (OUT + '/p02.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.32, grain=0.015, bloom=0.14, veil=0.14)
