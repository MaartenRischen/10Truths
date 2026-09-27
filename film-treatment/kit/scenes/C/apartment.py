# Direction C — era 5: the screen age. A flawless glossy CGI apartment (Cycles), no strokes at all.
# usage: python apartment.py <tag> <W> <H> <preset>    env: SPP, OV (json overrides), BEAUTY_ONLY
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *

tag = sys.argv[1]; W = int(sys.argv[2]); H = int(sys.argv[3]); preset = sys.argv[4]
samples = int(os.environ.get('SPP', '96'))
OV = json.loads(os.environ.get('OV', '{}'))
reset()
world_color((0.004, 0.006, 0.014), 1.0)

M = {
    'floor': principled('floor', (0.3, 0.31, 0.33), 0.035, coat=1.0, coat_rough=0.01, spec=0.6),
    'wall': principled('wall', (0.8, 0.81, 0.83), 0.5),
    'ceil': principled('ceil', (0.85, 0.86, 0.88), 0.6),
    'sofa': principled('sofa', (0.16, 0.17, 0.19), 0.85, sheen=0.8),
    'sofa_base': principled('sofa_base', (0.05, 0.05, 0.055), 0.3, coat=0.6),
    'chrome': principled('chrome', (0.92, 0.93, 0.95), 0.04, metal=1.0),
    'lacquer': principled('lacquer', (0.86, 0.87, 0.89), 0.08, coat=1.0, coat_rough=0.01),
    'black_glass': principled('black_glass', (0.004, 0.004, 0.005), 0.02, coat=1.0, coat_rough=0.0, spec=0.8),
    'glass': principled('glass', (1, 1, 1), 0.0, transmission=1.0, ior=1.45),
    'mullion': principled('mullion', (0.02, 0.02, 0.022), 0.25, metal=0.6),
    'led': emission_mat('led', (0.55, 0.82, 1.0), 16.0),
    'globe': emission_mat('globe', (1.0, 0.96, 0.9), 2.4),
    'downl': emission_mat('downl', (1.0, 0.97, 0.92), 40.0),
    'screen_glow': emission_mat('screen_glow', (0.35, 0.55, 1.0), 6.0),
    'rubber': principled('rubber', (0.02, 0.02, 0.02), 0.5),
    'leaf': principled('leaf', (0.02, 0.09, 0.05), 0.18, coat=0.8),
    'pot': principled('pot', (0.9, 0.9, 0.9), 0.1, coat=1.0),
    'shadowfig': principled('shadowfig', (0.45, 0.14, 0.06), 0.8),
}
world = []

def add(o):
    world.append(o); return o

X0, X1, Y0, Y1, CZ = -7.5, 7.5, -8.0, 5.0, 3.5
add(plane('floor', (X1 - X0, Y1 - Y0), ((X0 + X1) / 2, (Y0 + Y1) / 2, 0), mat=M['floor']))
add(plane('ceiling', (X1 - X0, Y1 - Y0), ((X0 + X1) / 2, (Y0 + Y1) / 2, CZ), rot=(math.pi, 0, 0), mat=M['ceil']))
add(box('wall_l', (0.2, Y1 - Y0, CZ), (X0 - 0.1, (Y0 + Y1) / 2, CZ / 2), mat=M['wall']))
add(box('wall_r', (0.2, Y1 - Y0, CZ), (X1 + 0.1, (Y0 + Y1) / 2, CZ / 2), mat=M['wall']))
add(box('wall_b', (X1 - X0, 0.2, CZ), ((X0 + X1) / 2, Y0 - 0.1, CZ / 2), mat=M['wall']))
# window wall: glass panes + slim black mullions
add(box('win_sill', (X1 - X0, 0.35, 0.08), (0, Y1, 0.04), mat=M['mullion']))
add(box('win_head', (X1 - X0, 0.35, 0.12), (0, Y1, CZ - 0.06), mat=M['mullion']))
for i, x in enumerate(np.linspace(X0, X1, 6)):
    add(box(f'mull{i}', (0.07, 0.3, CZ), (x, Y1, CZ / 2), mat=M['mullion']))
add(box('glass', (X1 - X0, 0.02, CZ), (0, Y1 + 0.05, CZ / 2), mat=M['glass']))
# city backdrop
DAY = OV.get('day', 0)
sky = add(plane('city', (110, 41), (0, 34, 9.0), rot=(math.pi / 2, 0, 0), mat=image_emission_mat('citym', os.path.join(WORK, 'skyline_day.exr' if DAY else 'skyline.exr'), 1.0)))
if DAY:
    world_color((0.35, 0.5, 0.8), 0.35)
    light('sun', 'SUN', (0, 20, 20), 5.5, color=(1.0, 0.95, 0.86), size=math.radians(0.8), rot=(math.radians(48), 0, math.radians(200)))
# ceiling cove LEDs and downlights
add(box('cove_l', (0.06, Y1 - Y0 - 1, 0.04), (X0 + 0.25, (Y0 + Y1) / 2, CZ - 0.18), mat=M['led']))
add(box('cove_r', (0.06, Y1 - Y0 - 1, 0.04), (X1 - 0.25, (Y0 + Y1) / 2, CZ - 0.18), mat=M['led']))
add(box('soffit_l', (0.5, Y1 - Y0, 0.06), (X0 + 0.25, (Y0 + Y1) / 2, CZ - 0.24), mat=M['ceil']))
add(box('soffit_r', (0.5, Y1 - Y0, 0.06), (X1 - 0.25, (Y0 + Y1) / 2, CZ - 0.24), mat=M['ceil']))
for i, (x, y) in enumerate([(-2.2, 1.6), (2.2, 1.6), (-2.2, -1.6), (2.2, -1.6), (0, 0.0)]):
    add(cyl(f'dl{i}', 0.09, 0.01, (x, y, CZ - 0.006), mat=M['downl']))
    light(f'dls{i}', 'SPOT', (x, y, CZ - 0.05), 650 * (0.35 if OV.get('day', 0) else 1.0), color=(1.0, 0.96, 0.9), size=0.05, rot=(0, 0, 0), spot=62, blend=0.6)
for lo in (light('cove_fill_l', 'AREA', (X0 + 0.5, 0, CZ - 0.3), 520, color=(0.6, 0.82, 1.0), size=12, size_y=0.3, rot=(0, math.radians(-60), 0)),
           light('cove_fill_r', 'AREA', (X1 - 0.5, 0, CZ - 0.3), 520, color=(0.6, 0.82, 1.0), size=12, size_y=0.3, rot=(0, math.radians(60), 0))):
    lo.visible_glossy = False

# sofa (4 seats) centred at x=0, back at y=2.6, facing -Y
SX, SY, SEAT = 0.0, 2.1, 0.52
LEN = 4.6
add(box('sofa_base', (LEN, 1.15, 0.16), (SX, SY, 0.1), mat=M['sofa_base'], bevel=0.03))
for i in range(4):
    x = SX - LEN / 2 + LEN / 8 + i * LEN / 4
    add(box(f'seat{i}', (LEN / 4 - 0.03, 1.02, 0.28), (x, SY - 0.03, 0.34), mat=M['sofa'], bevel=0.09, segs=5))
    add(box(f'back{i}', (LEN / 4 - 0.04, 0.3, 0.52), (x, SY + 0.44, 0.74), rot=(math.radians(-8), 0, 0), mat=M['sofa'], bevel=0.12, segs=5))
for i, x in enumerate([SX - LEN / 2 - 0.16, SX + LEN / 2 + 0.16]):
    add(box(f'arm{i}', (0.3, 1.15, 0.62), (x, SY, 0.38), mat=M['sofa'], bevel=0.12, segs=5))
# cushion
add(box('pillow', (0.55, 0.16, 0.44), (SX + 1.55, SY + 0.22, 0.78), rot=(math.radians(-14), math.radians(8), math.radians(-6)), mat=M['lacquer'], bevel=0.15, segs=5))
# coffee table: lacquered oval slab on a chrome base
CTX = OV.get('ctx', 1.35)
if OV.get('no_table'): CTX = 60.0
ct = add(cyl('ctable', 1.0, 0.07, (CTX, 0.55, 0.42), mat=M['lacquer'])); ct.scale = (1.0, 0.6, 1)
add(cyl('ctbase', 0.3, 0.36, (CTX, 0.55, 0.2), mat=M['chrome'])).scale = (1.0, 0.6, 1)
add(sphere('bowl', 0.17, (CTX + 0.25, 0.55, 0.5), mat=M['chrome'], scale=(1, 1, 0.45)))
# arc lamp from the right
import bpy
curve = bpy.data.curves.new('arc', 'CURVE'); curve.dimensions = '3D'; curve.bevel_depth = 0.028; curve.bevel_resolution = 6
spl = curve.splines.new('BEZIER'); spl.bezier_points.add(2)
pts = [(3.6, 2.9, 0.05), (3.2, 2.4, 2.9), (1.3, 1.2, 2.55)]
for bp, p in zip(spl.bezier_points, pts):
    bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
arc = bpy.data.objects.new('arc', curve); bpy.context.scene.collection.objects.link(arc); arc.data.materials.append(M['chrome']); world.append(arc)
add(cyl('lampbase', 0.32, 0.06, (3.6, 2.9, 0.03), mat=M['chrome']))
add(sphere('globe', 0.2, (1.3, 1.2, 2.35), mat=M['globe']))
light('globe_l', 'POINT', (1.3, 1.2, 2.2), 150, color=(1.0, 0.95, 0.88), size=0.2)
# big black TV / mirror on the right wall
add(box('tv', (0.05, 3.6, 2.0), (X1 - 0.03, -1.5, 1.55), mat=M['black_glass'], bevel=0.01))
add(box('credenza', (0.55, 4.2, 0.45), (X1 - 0.3, -1.5, 0.3), mat=M['lacquer'], bevel=0.03))
# a glass coffee table (plain, low) on a slim chrome frame, centre-right
GTX, GTY = OV.get('gt', [0.85, 0.5])
if not OV.get('no_gtable'):
    add(box('gtable_top', (1.7, 0.85, 0.03), (GTX, GTY, 0.42), mat=M['glass'], bevel=0.008, segs=2))
    for dx in (-0.8, 0.8):
        add(box('gtable_leg', (0.03, 0.8, 0.02), (GTX + dx, GTY, 0.02), mat=M['chrome']))
        add(box('gtable_post', (0.03, 0.03, 0.4), (GTX + dx, GTY - 0.38, 0.21), mat=M['chrome']))
        add(box('gtable_post', (0.03, 0.03, 0.4), (GTX + dx, GTY + 0.38, 0.21), mat=M['chrome']))
    add(box('book', (0.42, 0.3, 0.05), (GTX + 0.35, GTY + 0.05, 0.46), rot=(0, 0, 0.12), mat=M['lacquer'], bevel=0.005))
# a plain sculptural floor lamp (left): black rod, white cylinder shade
add(cyl('lamp_rod', 0.018, 1.75, (-3.35, 2.75, 0.875), mat=M['mullion'], verts=16))
add(cyl('lamp_base', 0.2, 0.03, (-3.35, 2.75, 0.015), mat=M['mullion']))
add(cyl('lamp_shade', 0.22, 0.46, (-3.35, 2.75, 1.85), mat=emission_mat('shade', (1.0, 0.93, 0.82), 3.2)))
light('lamp_l', 'POINT', (-3.35, 2.75, 1.85), 90, color=(1.0, 0.9, 0.78), size=0.22)
# the phone, face up on the sofa beside the figure
if OV.get('phone_on_sofa'):
    px_, py_ = OV['phone_on_sofa']
    add(box('sphone', (0.17, 0.33, 0.014), (px_, py_, 0.52), rot=(math.radians(34), 0, 0.3), mat=M['black_glass'], bevel=0.02, segs=3))
    add(box('sphone_scr', (0.15, 0.3, 0.002), (px_, py_ - 0.004, 0.527), rot=(math.radians(34), 0, 0.3), mat=emission_mat('sphone_glow', (0.62, 0.8, 1.0), 4.0)))
    light('sphone_l', 'POINT', (px_, py_ - 0.12, 0.62), 1.2, color=(0.6, 0.78, 1.0), size=0.05)
# ---------------- figures per preset ----------------
POSE_SLUMP = {'lHip': [-80, 0, 6], 'rHip': [-80, 0, -6], 'lKnee': [96, 0, 0], 'rKnee': [96, 0, 0], 'lAnkle': [-6, 0, 0], 'rAnkle': [-6, 0, 0],
              'chest': [16, 0, 0], 'head': [30, 0, 0], 'lShoulder': [-26, 0, 7], 'rShoulder': [-26, 0, -7],
              'lElbow': [-34, 0, 0], 'rElbow': [-34, 0, 0], 'lWrist': [10, 0, 0], 'rWrist': [10, 0, 0]}
figs_spec = []
cam_spec = None
POSE_H2 = {'lHip': [-84, 0, 6], 'rHip': [-84, 0, -6], 'lKnee': [92, 0, 0], 'rKnee': [92, 0, 0], 'lAnkle': [-4, 0, 0], 'rAnkle': [-4, 0, 0],
           'chest': [40, 0, 0], 'head': [34, 28, 0], 'lShoulder': [-26, 0, 6], 'rShoulder': [-26, 0, -6],
           'lElbow': [-66, 0, 0], 'rElbow': [-66, 0, 0], 'lWrist': [16, 0, 0], 'rWrist': [16, 0, 0]}
POSE_HIH = {'lHip': [-84, 0, 5], 'rHip': [-84, 0, -5], 'lKnee': [90, 0, 0], 'rKnee': [90, 0, 0], 'lAnkle': [-4, 0, 0], 'rAnkle': [-4, 0, 0],
            'chest': [36, 0, 0], 'head': [36, 0, 0], 'lShoulder': [-42, 0, -4], 'rShoulder': [-42, 0, 4],
            'lElbow': [-132, 0, 0], 'rElbow': [-132, 0, 0], 'lWrist': [-18, 0, 0], 'rWrist': [-18, 0, 0]}
if OV.get('pose_name') == 'slump':
    OV['pose'] = POSE_SLUMP
if OV.get('pose_name') == 'h2':
    OV['pose'] = POSE_H2
if preset in ('p03', 'hero2'):
    figs_spec.append({'name': 'hero', 'pose': OV.get('pose', POSE_HIH), 'pos': OV.get('hero_pos', [-1.68, SY - 0.36, 0]), 'yaw': OV.get('hero_yaw', -8), 'sit': OV.get('sit', 0.455)})
    if preset == 'p03':
        cam_spec = OV.get('cam', [[0.8, -6.2, 1.25], [0.0, 2.0, 1.0], 27])
    else:
        cam_spec = OV.get('cam', [[0.0, -3.35, 0.8], [0.0, 2.0, 1.12], 28])
elif preset == 'p04x':
    pass
elif preset == 'p04':
    POSE_RUB = OV.get('pose', {'lShoulder': [-50, -62, 0], 'lElbow': [-95, 0, 0], 'rShoulder': [-60, 48, 0], 'rElbow': [-72, 0, 0],
                                'rWrist': [0, 0, 20], 'head': [30, -12, 0], 'chest': [12, 0, 0], 'lHip': [0, 0, 3], 'rHip': [-4, 0, -3], 'rKnee': [6, 0, 0]})
    hp = OV.get('hero_pos', [6.05, -2.55, 0]); hy = OV.get('hero_yaw', 42)
    figs_spec.append({'name': 'hero', 'pose': POSE_RUB, 'pos': hp, 'yaw': hy, 'ground': 0.0})
    # its reflection in the black glass: the same figure mirrored across the TV plane (x = X1 - 0.005)
    MX = X1 - 0.055
    mir = {k: [v[0], -v[1], -v[2]] for k, v in POSE_RUB.items()}
    mir = {({'l': 'r', 'r': 'l'}.get(k[0], '') + k[1:]) if k[0] in 'lr' else k: v for k, v in mir.items()}
    figs_spec.append({'name': 'mirror', 'pose': mir, 'pos': [2 * MX - hp[0], hp[1], 0], 'yaw': -hy, 'ground': 0.0})
    cam_spec = OV.get('cam', [[3.2, -6.2, 1.42], [6.75, -1.9, 1.22], 30])
elif preset == 'p05r':
    figs_spec.append({'name': 'hero', 'pose': OV.get('pose', 'stand'), 'pos': OV.get('hero_pos', [0.0, -0.8, 0]), 'yaw': OV.get('hero_yaw', 0), 'ground': 0.0})
    cam_spec = OV.get('cam', [[0.0, -6.5, 1.1], [0.0, 2.0, 1.2], 30])
elif preset == 'test':
    figs_spec.append({'name': 'hero', 'pose': OV.get('pose', POSE_SLUMP), 'pos': OV.get('hero_pos', [-1.25, SY - 0.12, 0]), 'yaw': OV.get('hero_yaw', 6), 'sit': OV.get('sit', SEAT + 0.08)})
    cam_spec = OV['cam']
elif preset == 'bg':  # empty room (blur plates, backgrounds)
    cam_spec = OV['cam']

hero = []
mirror = []
if figs_spec:
    figs = import_figs(export_figs({'figs': figs_spec}, f'apt_{tag}'))
    hero = figs['hero']
    mirror = figs.get('mirror', [])
    for o in mirror:
        o.hide_render = True
    for o in hero:
        o.data.materials.clear(); o.data.materials.append(M['shadowfig'])
    shadow_only(hero)
c = cam_spec
cam = camera(c[0], c[1], lens=c[2], dof=OV.get('dof'), fstop=OV.get('fstop', 2.8))
pre = f'{WORK}/{tag}'
render_beauty(pre + '_beauty.npy', W, H, samples=samples, bounces=8, clamp=6.0, adaptive=0.015)
if os.environ.get('BEAUTY_ONLY') == '1':
    if hero:
        figure_passes(pre + '_fig', hero, W, H, ss=1, holdout=world)
    sys.exit(0)
world_passes(pre + '_w', world, W, H, kinds=('id', 'depth'))
if hero:
    figure_passes(pre + '_fig', hero, W, H, ss=2, holdout=world)
if mirror:
    for o in mirror:
        o.hide_render = False
    figure_passes(pre + '_mir', mirror, W, H, ss=2, holdout=[o for o in world if o.name not in ('tv', 'wall_r', 'credenza')])
json.dump({'objects': {o.pass_index: o.name for o in world}}, open(pre + '_w.index.json', 'w'))
print('done')
