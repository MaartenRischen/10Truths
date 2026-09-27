# P14 THE ANSWER: a wooden hand moves a cardboard wall aside and lifts away a tower of glowing screens;
# behind it a window of daylight opens onto the set.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
sc = bpy.context.scene
top = box_mesh('tabletop', 2.4, 1.6, 0.04, mat=mat_walnut(), bevel=0.004); place(top, (0, 0.3, -0.04))
studio_floor()
card = mat_cardboard('card_wall', '#a88256')
# back wall of the set (cardboard) with a window opening at x in [0.02, 0.34]
WY = 0.42
for (cx, w) in ((-0.45, 0.94), (0.62, 0.56)):
    slab('backwall', cx, WY, 0.25, w, 0.5, 0.006, mat=card).rotation_euler = (math.radians(90), 0, 0)
slab('lintel', 0.18, WY, 0.43, 0.32, 0.14, 0.006, mat=card).rotation_euler = (math.radians(90), 0, 0)
slab('sill', 0.18, WY, 0.05, 0.32, 0.1, 0.006, mat=card).rotation_euler = (math.radians(90), 0, 0)
# daylight beyond the window: bright sky card + sun
skyb = box_mesh('daysky', 0.7, 0.01, 0.5, mat=emissive('daysky', (0.75, 0.86, 1.0), E('SKYE', '4.0')), origin='bottom')
place(skyb, (0.18, 0.9, -0.05))
sun = light('SPOT', (0.36, 1.25, 0.62), (0.0, -0.12, 0.0), energy=E('SUNW', '1000'), kelv=5400, size=0.04, spot=26, blend=0.15, name='sun')
haze((0.1, 0.1, 0.25), (1.2, 0.9, 0.6), density=E('HAZE', '0.22'), aniso=0.6)
# the cardboard wall panel being slid aside (left of the window)
panel = slab('slidewall', -0.12, WY - 0.05, 0.24, 0.3, 0.44, 0.006, mat=card)
panel.rotation_euler = (math.radians(90), 0, math.radians(12))
# the tower of glowing screens, lifted and tilted by the hand
tw = bpy.data.objects.new('tower', None); sc.collection.objects.link(tw)
tw.location = (0.27, 0.24, 0.05); tw.rotation_euler = (math.radians(-6), math.radians(9), math.radians(-14))
body = place(box_mesh('tbody', 0.12, 0.09, 0.34, mat=mat_cardboard('card_tower', '#8f7a60')), (0, 0, 0)); body.parent = tw
imgs = ['feed0.png', 'bb_heart.png', 'feed2.png', 'bb_stars.png', 'bb_247.png', 'feed1.png', 'bb_grid.png', 'feed3.png']
k = 0
for row in range(6):
    for col in range(2):
        s_ = place(quad_uv('tscr', 0.05, 0.045, mat_screen(imgs[k % len(imgs)], 5.0)), (-0.028 + col * 0.056, -0.0455, 0.035 + row * 0.052))
        s_.parent = tw; k += 1
tw.keyframe_insert('location', frame=0)
tw.location = (0.27, 0.24, 0.075); tw.keyframe_insert('location', frame=2)
sc.frame_set(1); sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.6
bpy.context.view_layer.update()
grip = tw.matrix_world @ Vector((0, 0.0, 0.345))
hand = wooden_hand(grip + Vector((0.0, 0.06, 0.05)), palm_dir=(0.0, -0.35, -1.0), finger_dir=(0.0, -1.0, 0.25), curl=(55, 50, 35), thumb_curl=35)
arm = capsule_mesh('forearm', 0.5, 0.03, 0.028, mat_beech_prop('hand_beech', 'Z'))
place(arm, grip + Vector((0.0, 0.1, 0.08)), (math.radians(-30), 0, 0))
# the manikin in the foreground, turning to the light
man = manikin('standOpen', (E('MX', '-0.04'), E('MY', '0.05'), 0.0), face=(0.18, 1.0))
light('AREA', (-0.6, -0.8, 0.5), (0, 0.1, 0.1), energy=E('FILLW', '6'), kelv=3400, size=0.6, name='fill')
set_world((0.008, 0.008, 0.009), 1.0)
cam = camera((E('CX', '-0.3'), E('CY', '-0.82'), E('CZ', '0.13')), (E('TX', '0.12'), 0.3, E('TZ', '0.26')), lens=E('LENS', '27'), fstop=E('FSTOP', '4'), focus=(0.0, 0.02, 0.2))
out = A['out'] or (OUT + '/p14.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.3, grain=0.014, bloom=0.16, veil=0.2, veil_col=[0.9, 0.95, 1.0])
