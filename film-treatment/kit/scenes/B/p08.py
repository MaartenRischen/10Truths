# P08 EVERYTHING CHANGED: one manikin standing still at the centre; around it the world in mid-rebuild
# (fields and brick on one side, steel towers, masts and glowing screens on the other). Set motion-blurred, manikin sharp.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
sc = bpy.context.scene
studio_floor(); round_table()
before = set(bpy.data.objects)
board()
ground, hgt = ground_disc(ash_r=0.001)
z = 0.024
# ---- old world (left, -X): fields, wheat rows, brick wall + house, haystack
ploughed_field(-0.36, -0.12, 0.26, 0.22, rows=10)
ploughed_field(-0.3, 0.2, 0.22, 0.2, rows=8, ang=0.5)
rng = random.Random(8)
tufts = [tuft_mesh('wheat%d' % i, 300 + i, n=26, hmin=0.03, hmax=0.05, spread=0.25) for i in range(3)]
for i in range(6):
    for j in range(7):
        x, y = -0.52 + i * 0.03, -0.38 + j * 0.035
        if math.hypot(x, y) < 0.58:
            place(tufts[(i + j) % 3], (x, y, hgt(x, y)), (0, 0, rng.uniform(0, 6)), 0.9)
wall = box_mesh('brickwall', 0.26, 0.018, 0.055, mat=mat_brick(), bevel=0.001)
place(wall, (-0.2, 0.34, z), (0, 0, 0.35))
house = box_mesh('brickhouse', 0.12, 0.1, 0.08, mat=mat_brick(), bevel=0.001)
place(house, (-0.44, 0.2, z), (0, 0, 0.3))
roof = mesh_from('roof', [(-0.07, -0.06, 0), (0.07, -0.06, 0), (0.07, 0.06, 0), (-0.07, 0.06, 0), (-0.07, 0, 0.05), (0.07, 0, 0.05)],
                 [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5)], smooth=False, mat=mat_reed())
place(roof, (-0.44, 0.2, z + 0.08), (0, 0, 0.3))
hay = rock_mesh('hay', 2, r=0.028, squash=(1, 1, 1.1), rough=0.12, mat=mat_reed())
place(hay, (-0.2, -0.3, z + 0.015))
windmill((-0.34, 0.38, z), h=0.24)
hutm = hut_mesh(door=math.radians(270))
place_hut(hutm, (-0.5, -0.05, z), 1.2, 0.8)
round_tree((-0.16, 0.46, z), h=0.2, r=0.06, seed=2)
round_tree((-0.55, 0.3, z), h=0.15, r=0.045, seed=5)
fence((-0.5, -0.28, z), (-0.2, -0.46, z), n=12)
fence((-0.12, 0.08, z), (-0.12, 0.3, z), n=9)
# ---- new world (right, +X): towers, lattice masts, antenna, screens
fac = mat_facade('facade_mod', base='#8f8c86', lit=0.35, warm=0.3, strength=E('WIN', '3'), floor_h=0.028)
boxes = [(0.3, 0.3, 0.1, 0.1, 0.62, z), (0.44, 0.12, 0.09, 0.12, 0.48, z), (0.2, 0.44, 0.08, 0.08, 0.4, z),
         (0.47, -0.12, 0.1, 0.08, 0.36, z), (0.34, -0.3, 0.08, 0.1, 0.28, z), (0.12, 0.3, 0.07, 0.07, 0.24, z)]
place(blocks_mesh('towers', boxes, fac))
lattice_tower((0.22, -0.18, z), h=0.46, w=0.05)
lattice_tower((0.52, 0.28, z), h=0.55, w=0.045)
antenna_mast((0.37, 0.04, z), h=0.66)
billboard((0.16, -0.36, z), 0.09, 0.056, 'bb_heart.png', strength=8, rot=0.3, post_h=0.05)
billboard((0.46, -0.3, z), 0.08, 0.05, 'bb_stars.png', strength=8, rot=-0.4, post_h=0.12)
billboard((0.14, 0.14, z), 0.07, 0.045, 'bb_247.png', strength=8, rot=0.9, post_h=0.1)
billboard((0.32, 0.46, z + 0.2), 0.1, 0.06, 'bb_grid.png', strength=7, rot=-0.2, post_h=0.0)
# a tower in transit (being lowered in)
place(blocks_mesh('transit', [(0.0, 0.0, 0.08, 0.08, 0.3, 0.0)], fac), (0.05, 0.5, 0.42), (0.15, -0.2, 0.4))
setobjs = [o for o in bpy.data.objects if o not in before]
# turntable for motion blur
turn = bpy.data.objects.new('turn', None); sc.collection.objects.link(turn)
for o in setobjs:
    if o.parent is None: o.parent = turn
turn.rotation_euler = (0, 0, 0); turn.keyframe_insert('rotation_euler', frame=0)
turn.rotation_euler = (0, 0, math.radians(E('SWEEP', '18'))); turn.keyframe_insert('rotation_euler', frame=2)
for fc in turn.animation_data.action.fcurves if hasattr(turn.animation_data.action, 'fcurves') else []:
    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
sc.frame_set(1)
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 1.0
man = manikin('standTall', (0, 0, hgt(0, 0)), rot=0)
# light: warm tungsten from the old side, cold screen light from the new side
light('SPOT', (-1.3, -0.5, 0.6), (0, 0, 0.15), energy=E('WARMW', '180'), kelv=2900, size=0.05, spot=45, blend=0.6, name='warm')
light('SPOT', (1.3, -0.4, 0.7), (0, 0, 0.15), energy=E('COLDW', '160'), kelv=11000, size=0.05, spot=45, blend=0.6, name='cold')
light('AREA', (0, -1.2, 1.4), (0, 0, 0), energy=E('FILLW', '20'), kelv=5500, size=1.0, name='fill')
light('SPOT', (0.0, 0.2, 1.6), (0, 0, 0), energy=E('TOPW', '40'), kelv=4300, size=0.05, spot=12, blend=0.4, name='pin')
set_world((0.008, 0.008, 0.01), 1.0)
cam = camera((E('CX', '0.0'), E('CY', '-1.02'), E('CZ', '0.32')), (0, 0.05, E('TZ', '0.15')), lens=E('LENS', '35'), fstop=E('FSTOP', '4'), focus=(0, -0.02, 0.18))
out = A['out'] or (OUT + '/p08.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.3, grain=0.015, bloom=0.14, veil=0.18)
