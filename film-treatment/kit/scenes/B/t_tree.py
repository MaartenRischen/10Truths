import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
reset()
board(); ground, hgt = ground_disc(ash_r=0.001, rings=30, segs=120)
acacia((-0.1, 0.0, hgt(-0.1, 0)), h=0.4, seed=3, crown=0.12)
round_tree((0.2, 0.05, hgt(0.2, 0.05)), h=0.17, r=0.05, seed=10)
manikin('stand', (0.05, -0.05, hgt(0, 0)), rot=20)
set_world((0.01, 0.009, 0.01), 1.0)
light('SPOT', (-1.62, -0.52, 0.36), (0.1, 0.06, 0.05), energy=200, kelv=2900, size=0.06, spot=50, blend=0.6)
light('AREA', (1.2, -2.2, 1.6), (0, 0, 0), energy=30, kelv=5600, size=1.2)
camera((0.2, -1.2, 0.3), (0.0, 0.0, 0.2), lens=60, fstop=5.6, focus=(0, 0, 0.2))
out = WORK + '/test/t_tree.png'
render(out, res=(640, 360), spp=16)
post(out)
