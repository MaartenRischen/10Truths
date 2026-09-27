# P05 MISMATCH: top-down tilt-shift, a small round board of savanna grass with one manikin,
# set down in the middle of a vast grey grid of modern city blocks. It does not fit.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
R = 0.3
# street base
base = box_mesh('streets', 12, 12, 0.004, mat=simple('street_board', srgb('#3c3c3b'), 0.85))
place(base, (0, 0, -0.004))
# road markings: thin paper strips along streets
fac = mat_facade('facade_grey', base='#8d8b87', lit=E('LIT', '0.12'), warm=0.35, strength=E('WIN', '2.5'), floor_h=0.03)
boxes = city_grid(-3.2, 3.2, -3.2, 3.2, block=0.34, street=0.075, hmin=0.1, hmax=0.95, seed=11,
                  skip=lambda x, y: math.hypot(x, y) < R + 0.17)
place(blocks_mesh('city', boxes, fac))
# rooftop clutter: small boxes (plant rooms, AC units)
rng = random.Random(4); roof = []
for (x, y, w, d, h, z0) in boxes:
    for k in range(rng.randint(0, 3)):
        rw, rd = rng.uniform(0.02, 0.06), rng.uniform(0.02, 0.06)
        roof.append((x + rng.uniform(-w / 3, w / 3), y + rng.uniform(-d / 3, d / 3), rw, rd, rng.uniform(0.01, 0.035), z0 + h))
place(blocks_mesh('roofbits', roof, simple('roof_grey', srgb('#6f6d69'), 0.8)))
# the savanna board
bd = cyl_mesh('sboard', R, 0.02, seg=128, mat=mat_plywood_edge(), bevel=0.0015)
place(bd)
ground, hgt = ground_disc(r=R - 0.004, z=0.02, rings=36, segs=160, ash_r=0.001)
scatter_grass(hgt, r_in=0.05, r_out=R - 0.01, count=int(E('NGRASS', '650')), avoid=[(0.0, 0.0, 0.045)], scale=(1.0, 1.6))
man = manikin('stand', (0.0, 0.0, hgt(0, 0)), rot=E('ROT', '150'))
# lighting: cold overcast on the city, a warm lamp pool on the board
sky = light('AREA', (0.6, -0.8, 4.0), (0, 0, 0), energy=E('SKYW', '260'), kelv=8000, size=4.0, name='overcast')
sun = light('SPOT', (-0.9, -0.5, 2.3), (0, 0, 0.05), energy=E('KEYW', '200'), kelv=3000, size=0.05, spot=13, blend=0.3, name='lamp')
set_world((0.02, 0.022, 0.026), 1.0)
bpy.context.scene.cycles.film_exposure = E('EXPO', '1.0')
cam = camera((E('CX', '0.35'), E('CY', '-0.95'), E('CZ', '2.25')), (0.02, 0.02, 0.0), lens=E('LENS', '55'), fstop=E('FSTOP', '1.4'), focus=(0, 0, 0.15))
out = A['out'] or (OUT + '/p05.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.3, grain=0.014, bloom=0.1, veil=0.1)
