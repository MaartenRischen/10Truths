import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
reset()
board(); ground, hgt = ground_disc(ash_r=0.075, rings=30, segs=120)
campfire((0, 0, hgt(0, 0) - 0.001), light_power=1.4, flame_scale=1.45)
manikin('sitKnees', (0.2 * math.cos(math.radians(40)), 0.2 * math.sin(math.radians(40)), hgt(0, 0)), face=(0, 0))
set_world((0.01, 0.009, 0.01), 1.0)
light('SPOT', (-1.62, -0.52, 0.36), (0.1, 0.06, 0.05), energy=120, kelv=2900, size=0.06, spot=50, blend=0.6)
haze((0, 0, 0.05), (0.25, 0.25, 0.12), density=float(os.environ.get('FH', '0.8')), aniso=0.3)
camera((0.0, -0.42, 0.12), (0.02, 0.0, 0.035), lens=85, fstop=2.8, focus=(0, 0, 0.03))
out = WORK + '/test/t_fire.png'
render(out, res=(640, 360), spp=24)
post(out, vignette=0.3, grain=0.012, bloom=0.14, veil=0.22)
