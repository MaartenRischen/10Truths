# loop.mp4 motion test: "Everything changed, except you" - motion-control orbit around one still manikin while the
# diorama is rebuilt around it in stop-motion steps (set changes on twos / 12 fps, camera moves every frame at 24 fps).
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
sc = bpy.context.scene
NF = int(E('NF', '96'))
F0, F1 = int(E('F0', '0')), int(E('F1', str(NF)))
studio_floor(); round_table(); board()
ground, hgt = ground_disc(ash_r=0.001)
z = 0.024
def grab(fn):
    before = set(bpy.data.objects)
    fn()
    return [o for o in bpy.data.objects if o not in before]
old, new = [], []
rng = random.Random(8)
old.append(grab(lambda: ploughed_field(-0.36, -0.12, 0.26, 0.22, rows=10)))
old.append(grab(lambda: ploughed_field(-0.3, 0.2, 0.22, 0.2, rows=8, ang=0.5)))
old.append(grab(lambda: place(box_mesh('brickwall', 0.26, 0.018, 0.055, mat=mat_brick(), bevel=0.001), (-0.2, 0.34, z), (0, 0, 0.35))))
old.append(grab(lambda: windmill((-0.34, 0.38, z), h=0.24)))
hutm = hut_mesh(door=math.radians(270))
for (x, y, r) in ((-0.5, -0.05, 1.2), (0.3, -0.35, 2.2), (0.42, 0.2, 3.0)):
    old.append(grab(lambda x=x, y=y, r=r: place_hut(hutm, (x, y, z), r, 0.8)))
for (x, y, s_) in ((-0.16, 0.46, 2), (-0.55, 0.3, 5), (0.25, 0.42, 7)):
    old.append(grab(lambda x=x, y=y, s_=s_: round_tree((x, y, z), h=0.18, r=0.05, seed=s_)))
old.append(grab(lambda: fence((-0.5, -0.28, z), (-0.2, -0.46, z), n=12)))
old.append(grab(lambda: acacia((0.15, 0.5, z), h=0.36, seed=3, crown=0.1)))
fac = mat_facade('facade_mod', base='#8f8c86', lit=0.35, warm=0.3, strength=3.0, floor_h=0.028)
boxes = [(0.3, 0.3, 0.1, 0.1, 0.62, z), (0.44, 0.12, 0.09, 0.12, 0.48, z), (0.2, 0.44, 0.08, 0.08, 0.4, z), (0.47, -0.12, 0.1, 0.08, 0.36, z),
         (0.34, -0.3, 0.08, 0.1, 0.28, z), (0.12, 0.3, 0.07, 0.07, 0.24, z), (-0.3, 0.3, 0.1, 0.1, 0.5, z), (-0.45, 0.05, 0.09, 0.1, 0.42, z),
         (-0.35, -0.25, 0.1, 0.08, 0.34, z), (-0.15, 0.45, 0.08, 0.08, 0.56, z), (0.05, 0.52, 0.09, 0.07, 0.7, z), (-0.5, -0.2, 0.07, 0.07, 0.3, z)]
for b in boxes:
    new.append(grab(lambda b=b: place(blocks_mesh('tower', [b], fac))))
new.append(grab(lambda: lattice_tower((0.22, -0.18, z), h=0.46, w=0.05)))
new.append(grab(lambda: antenna_mast((0.37, 0.04, z), h=0.66)))
new.append(grab(lambda: billboard((0.16, -0.36, z), 0.09, 0.056, 'bb_heart.png', strength=8, rot=0.3, post_h=0.05)))
new.append(grab(lambda: billboard((-0.2, -0.4, z), 0.08, 0.05, 'bb_stars.png', strength=8, rot=-0.4, post_h=0.12)))
new.append(grab(lambda: billboard((-0.1, 0.2, z), 0.07, 0.045, 'bb_247.png', strength=8, rot=0.9, post_h=0.1)))
man = manikin('standTall', (0, 0, hgt(0, 0)), rot=0)
# timing: set changes happen on twos; old items leave in [16, 60], new arrive in [24, 80] (frames at 24 fps)
def step(f): return f - (f % 2)
outs = [(g, rng.randint(14, 58)) for g in old]
ins = [(g, rng.randint(22, 82)) for g in new]
light('SPOT', (-1.3, -0.5, 0.6), (0, 0, 0.15), energy=180, kelv=2900, size=0.05, spot=45, blend=0.6, name='warm')
cold = light('SPOT', (1.3, -0.4, 0.7), (0, 0, 0.15), energy=160, kelv=11000, size=0.05, spot=45, blend=0.6, name='cold')
light('AREA', (0, -1.2, 1.4), (0, 0, 0), energy=20, kelv=5500, size=1.0, name='fill')
light('SPOT', (0.0, 0.2, 1.6), (0, 0, 0), energy=40, kelv=4300, size=0.05, spot=12, blend=0.4, name='pin')
set_world((0.008, 0.008, 0.01), 1.0)
cam = camera((0, -1.0, 0.3), (0, 0, 0.15), lens=35, fstop=4, focus=(0, 0, 0.18))
os.makedirs(WORK + '/loop', exist_ok=True)
for f in range(F0, F1):
    fs = step(f)
    for g, t in outs:
        for o in g: o.hide_render = fs >= t
    for g, t in ins:
        for o in g: o.hide_render = fs < t
    # warm -> cold key crossfade as the world modernises
    k = min(1.0, max(0.0, (fs - 20) / 60))
    bpy.data.objects['warm'].data.energy = 180 * (1 - 0.7 * k)
    cold.data.energy = 60 + 140 * k
    az = math.radians(-118 + 56 * f / NF)
    R = 1.0; hz = 0.3 + 0.04 * math.sin(math.pi * f / NF)
    cam.location = (R * math.cos(az), R * math.sin(az), hz)
    d = Vector((0, 0, 0.15)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam.data.dof.focus_distance = (Vector((0, 0, 0.18)) - cam.location).length
    out = WORK + '/loop/f%03d.png' % f
    render(out, res=A['res'] or (960, 540), spp=A['spp'] or 12)
