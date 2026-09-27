# P01 OPEN: macro on a manikin's face and shoulder in darkness, tungsten lamp warming up, dust in the beam,
# elbow pin catching light; behind, out of focus, a vast dark model city running past the table edge.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
# table (walnut) with the manikin near its front; city on the back of the table and beyond its edge
top = box_mesh('tabletop', 2.4, 1.4, 0.04, mat=mat_walnut(), bevel=0.004)
place(top, (0, 0.55, -0.04))
studio_floor()
fac = mat_facade('facade_dark', base='#4a4744', lit=E('LIT', '0.1'), warm=0.55, strength=E('WIN', '3'))
b1 = city_grid(-1.1, 1.1, 0.25, 1.2, block=0.2, street=0.05, hmin=0.08, hmax=0.55, seed=3)
place(blocks_mesh('city_table', b1, fac))
b2 = city_grid(-3.0, 3.0, 1.35, 7.0, block=0.28, street=0.08, hmin=0.3, hmax=1.4, seed=5, z0=-0.76)
place(blocks_mesh('city_beyond', b2, fac))
m = manikin('p01look', (0, 0, 0), rot=E('ROT', '-28'))
bpy.context.view_layer.update()
head = jpos(m, 'head', (0, -0.03, 0.2))
cam = camera(head + Vector((E('CX', '-0.23'), E('CY', '-0.46'), E('CZ', '0.03'))), head + Vector((E('TX', '-0.04'), 0, E('TZ', '-0.038'))), lens=E('LENS', '75'), fstop=E('FSTOP', '2.0'), focus=head + Vector((0, -0.01, 0)))
bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = 1280, 720
bpy.context.view_layer.update()
# tungsten work lamp just inside the upper-left of frame, beam crossing to the head
lp = Vector((-0.62, -0.02, 0.40))
lamp_head(lp, head, r=0.05, depth=0.08, glow=E('LAMPGLOW', '5'), kelv=2400)
key = light('SPOT', lp + (head - lp).normalized() * 0.02, head, energy=E('KEYW', '10'), kelv=2800, size=0.02, spot=26, blend=0.5, name='lamp')
mid = lp.lerp(head, 0.5)
haze(mid, ((lp - head).length * 1.1, 0.5, 0.4), density=E('HAZE', '0.3'), aniso=0.6)
dust_motes(mid, (0.3, 0.2, 0.16), n=int(E('MOTES', '110')), rmin=0.0003, rmax=0.0007)
rim = light('SPOT', (0.35, 0.9, 0.5), head, energy=E('RIMW', '3'), kelv=5200, size=0.05, spot=30, blend=0.5, name='rim')
set_world((0.004, 0.004, 0.005), 1.0)
out = A['out'] or (OUT + '/p01.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 48, test=A['test'])
post(out, vignette=0.3, grain=0.016, bloom=0.16, veil=0.2)
