import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
reset()
m = manikin('sitPoke', (0, 0, 0), rot=30)
bpy.context.view_layer.update()

sm = simple('red', (1, 0, 0), 0.5)
for j, loc in [('rWrist', (0, 0, -0.1)), ('lWrist', (0, 0, -0.1)), ('rWrist', (0, 0, -0.19)), ('head', (0, 0, 0.2)), ('lAnkle', (0,0,0))]:
    p = jpos(m, j, loc)
    me = rock_mesh('dot', 1, r=0.004, rough=0, mat=sm)
    place(me, p)
    print(j, loc, tuple(round(x, 3) for x in p))
camera((0.3, -0.8, 0.3), (0, 0, 0.2), lens=60, fstop=None)
light('SUN', (1, -2, 3), (0, 0, 0), energy=3, size=3)
set_world((0.5, 0.55, 0.6), 0.5)
render(WORK + '/test/t_joint.png', res=(480, 480), spp=8)
