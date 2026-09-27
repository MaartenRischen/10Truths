# P03 HOW WE FEEL: a cardboard apartment block cut in section like a dollhouse; each small room holds one manikin alone.
# Cold light, lateral view.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
W, H, D, t = 0.46, 0.34, 0.36, 0.006
NC, NF = 4, 3
TW = NC * W + (NC + 1) * t
def xl(c): return -TW / 2 + t + c * (W + t)
def zf(f): return f * (H + t) + t
card = mat_cardboard()
for f in range(NF + 1):
    slab('floor%d' % f, 0, D / 2, f * (H + t) + t / 2, TW, D, t, mat=card)
for c in range(NC + 1):
    x = -TW / 2 + t / 2 + c * (W + t)
    slab('wall%d' % c, x, D / 2, (NF * (H + t) + t) / 2, NF * (H + t) + t, D, t, vertical=True, mat=card)
back = box_mesh('back', TW, t, NF * (H + t) + t, mat=card, origin='bottom'); place(back, (0, D + t / 2, 0))
floor_studio = box_mesh('stfloor', 12, 12, 0.01, mat=mat_concrete()); place(floor_studio, (0, 0, -0.01))
night = emissive('night_window', (0.06, 0.12, 0.28), 1.6)
papers = [('#9aa7a6', 'stripes', '#8c9998'), ('#c9c1b0', 'dots', '#b8ae9a'), ('#a9b3bf', 'plain', None), ('#b7a996', 'plain', None),
          ('#8f9c8b', 'stripes', '#859281'), ('#c4b8a8', 'plain', None), ('#9fa5ad', 'dots', '#8e949c'), ('#b3ab9d', 'stripes', '#a59d8f'),
          ('#a4a09a', 'plain', None), ('#9aa3a8', 'plain', None), ('#bdb3a3', 'dots', '#afa594'), ('#98a09a', 'plain', None)]
def room_back(c, f, k, window=True):
    cx = xl(c) + W / 2; z0 = zf(f)
    col, pat, col2 = papers[k % len(papers)]
    wp = box_mesh('wp', W, 0.001, H, mat=mat_wallpaper('wp%d' % k, col, pat, col2), origin='bottom')
    place(wp, (cx, D - 0.0006, z0))
    if window:
        rr = random.Random(k * 7)
        wx = cx + (0.09 if k == 2 else rr.choice([-0.12, 0.1, 0.12, -0.1]))
        wf = box_mesh('winframe', 0.13, 0.004, 0.12, mat=simple('frame_white', srgb('#d8d4cc'), 0.6), bevel=0.001, origin='center')
        place(wf, (wx, D - 0.003, z0 + 0.2))
        tone = rr.choice([(0.05, 0.1, 0.25, 1.4), (0.03, 0.06, 0.16, 0.8), (0.08, 0.13, 0.3, 2.0), (0.02, 0.03, 0.06, 0.5)])
        wm = emissive('night_%d' % k, tone[:3], tone[3])
        wg = box_mesh('winglow', 0.115, 0.002, 0.105, mat=wm, origin='center')
        place(wg, (wx, D - 0.0055, z0 + 0.2))
        # mullion cross
        place(box_mesh('mull', 0.004, 0.005, 0.105, mat=simple('frame_white', srgb('#d8d4cc'), 0.6), origin='center'), (wx, D - 0.007, z0 + 0.2))
        place(box_mesh('mull2', 0.115, 0.005, 0.004, mat=simple('frame_white', srgb('#d8d4cc'), 0.6), origin='center'), (wx, D - 0.007, z0 + 0.2))
    return cx, z0
def phone_glow(p, face, strength=14):
    phone(p, face, img='feed%d.png' % random.randint(0, 3), strength=strength, size=(0.011, 0.02))
    for mt in bpy.data.materials:
        if mt.name.startswith('screen_feed') and mt.node_tree.nodes.get('CamSplit'):
            mt.node_tree.nodes['CamSplit'].inputs[6].default_value = (0.35, 0.58, 1.0, 1)
random.seed(4)
k = 0
# --- floor 2 (top)
cx, z0 = room_back(0, 2, k); k += 1           # bedroom: curled on the bed, phone glowing on the pillow
rbox('bedframe', 0.25, 0.14, 0.05, '#6d5a48', (cx - 0.06, D - 0.09, z0))
rbox('mattress', 0.24, 0.13, 0.022, '#e8e4dc', (cx - 0.06, D - 0.09, z0 + 0.05), rough=0.9)
rbox('duvet', 0.15, 0.135, 0.012, '#7d8ea3', (cx + 0.0, D - 0.09, z0 + 0.07), rough=0.95)
rbox('pillow', 0.05, 0.1, 0.012, '#f0ece4', (cx - 0.15, D - 0.09, z0 + 0.072), rough=0.95)
m = manikin('phoneDesk', (cx - 0.02, D - 0.175, z0 + 0.075 - 0.0759), rot=0)
bpy.context.view_layer.update()
_hl = jpos(m, 'lWrist', (0, 0, -0.11)); _hr = jpos(m, 'rWrist', (0, 0, -0.11))
phone_glow((_hl + _hr) / 2 + Vector((0, -0.004, 0.006)), jpos(m, 'head', (0, -0.12, 0.1)), 14)
cx, z0 = room_back(1, 2, k); k += 1           # desk: slumped over a laptop
rbox('desk', 0.2, 0.1, 0.006, '#cfc9bd', (cx, D - 0.07, z0 + 0.115))
for dx in (-0.095, 0.095): rbox('dleg', 0.005, 0.09, 0.115, '#3a3a3a', (cx + dx, D - 0.07, z0))
rbox('chair', 0.06, 0.058, 0.004, '#3b3f45', (cx, D - 0.16, z0 + 0.069))
for dx in (-0.026, 0.026):
    for dy in (-0.022, 0.022): rbox('cleg', 0.003, 0.003, 0.069, '#222222', (cx + dx, D - 0.16 + dy, z0))
lap = rbox('laptop', 0.07, 0.048, 0.003, '#8e9296', (cx, D - 0.075, z0 + 0.121), rough=0.35)
scr = box_mesh('lapscreen', 0.07, 0.003, 0.046, mat=mat_screen('bb_grid.png', 14.0, name='lap_screen'), origin='bottom')
place(scr, (cx, D - 0.05, z0 + 0.123), (math.radians(-12), 0, 0))
manikin('deskSlump', (cx, D - 0.165, z0), rot=180)
cx, z0 = room_back(2, 2, k); k += 1           # standing at the window, looking out
manikin('windowStand', (cx + 0.09, D - 0.08, z0), rot=180)
cx, z0 = room_back(3, 2, k, window=True); k += 1   # empty, dark
# --- floor 1
cx, z0 = room_back(0, 1, k); k += 1           # sofa, curled up lit by a phone
rbox('sofa_base', 0.22, 0.09, 0.045, '#5b6b7a', (cx - 0.03, D - 0.07, z0), rough=0.95)
rbox('sofa_back', 0.22, 0.03, 0.09, '#566574', (cx - 0.03, D - 0.02, z0), rough=0.95)
for dx in (-0.125, 0.065): rbox('sofa_arm', 0.025, 0.09, 0.065, '#566574', (cx + dx, D - 0.07, z0), rough=0.95)
manikin('sofaHug', (cx - 0.03, D - 0.075, z0 + 0.045), rot=0)
phone_glow(Vector((cx - 0.03, D - 0.13, z0 + 0.12)), Vector((cx - 0.03, D - 0.08, z0 + 0.16)), 14)
cx, z0 = room_back(1, 1, k, window=False); k += 1   # kitchen: alone at a small table, one warm pendant
rbox('ktable', 0.12, 0.09, 0.005, '#d8cfc0', (cx, D - 0.12, z0 + 0.12))
rbox('ktleg', 0.008, 0.008, 0.12, '#5a4a3a', (cx, D - 0.12, z0))
rbox('kchair', 0.06, 0.058, 0.004, '#8a6a4a', (cx, D - 0.21, z0 + 0.069))
for dx in (-0.026, 0.026):
    for dy in (-0.022, 0.022): rbox('kcleg', 0.003, 0.003, 0.069, '#5a4a3a', (cx + dx, D - 0.21 + dy, z0))
manikin('deskSlump', (cx, D - 0.215, z0), rot=180)
rbox('counter', 0.18, 0.07, 0.1, '#e2ddd3', (cx + 0.12, D - 0.035, z0))
cord = tube_path([Vector((cx, D - 0.12, z0 + H)), Vector((cx, D - 0.12, z0 + H - 0.1))], 0.0006, sides=4)
place(mesh_from('cord', cord[0], cord[1], mat=simple('cordblack', (0.02, 0.02, 0.02), 0.5)))
shade = lathe_mesh('shade', [(0.004, 0.0), (0.02, -0.018), (0.021, -0.019)], 24, simple('shade_w', srgb('#e8e2d6'), 0.6))
place(shade, (cx, D - 0.12, z0 + H - 0.1))
lt = light('POINT', (cx, D - 0.12, z0 + H - 0.115), energy=E('PEND', '2.2'), kelv=2700, size=0.006, name='pendant')
cx, z0 = room_back(2, 1, k); k += 1           # on the floor against the wall, head on knees
manikin('apart', (cx - 0.05, D - 0.07, z0), rot=180)
cx, z0 = room_back(3, 1, k); k += 1           # tv glow, figure in an armchair
rbox('arm_seat', 0.08, 0.08, 0.066, '#6a5048', (cx + 0.1, D - 0.14, z0), rough=0.95)
rbox('arm_back', 0.025, 0.08, 0.13, '#62483f', (cx + 0.15, D - 0.14, z0), rough=0.95)
manikin('tvSit', (cx + 0.1, D - 0.14, z0), rot=-90)
rbox('tvstand', 0.035, 0.12, 0.06, '#2a2a2a', (cx - 0.19, D - 0.14, z0))
tv = quad_uv('tv', 0.12, 0.07, mat_screen('bb_stars.png', 12.0, name='tv_screen'))
place(tv, (cx - 0.185, D - 0.14, z0 + 0.1), (0, 0, math.radians(90)))
place(box_mesh('tvbody', 0.006, 0.124, 0.074, mat=simple('tv_black', (0.02, 0.02, 0.022), 0.4), origin='center'), (cx - 0.19, D - 0.14, z0 + 0.1))
# --- floor 0
cx, z0 = room_back(0, 0, k); k += 1           # sitting on the bed edge, head in hands
rbox('bed2', 0.24, 0.13, 0.07, '#e1ddd5', (cx - 0.05, D - 0.08, z0), rough=0.9)
manikin('headInHands', (cx - 0.02, D - 0.17, z0 + 0.07 - 0.075), rot=0)
cx, z0 = room_back(1, 0, k); k += 1           # at a desk with a laptop, lit blue (other side)
rbox('desk2', 0.2, 0.1, 0.006, '#cfc9bd', (cx + 0.05, D - 0.07, z0 + 0.115))
for dx in (-0.095, 0.095): rbox('dleg2', 0.005, 0.09, 0.115, '#3a3a3a', (cx + 0.05 + dx, D - 0.07, z0))
scr2 = box_mesh('lapscreen2', 0.07, 0.003, 0.046, mat=mat_screen('feed1.png', 14.0, name='lap_screen2'), origin='bottom')
place(scr2, (cx + 0.05, D - 0.05, z0 + 0.123), (math.radians(-12), 0, 0))
rbox('laptop2', 0.07, 0.048, 0.003, '#8e9296', (cx + 0.05, D - 0.075, z0 + 0.121), rough=0.35)
manikin('phoneDesk', (cx + 0.05, D - 0.165, z0), rot=180)
cx, z0 = room_back(2, 0, k); k += 1           # lying on the floor, looking at the ceiling
manikin('bedCurl', (cx + 0.07, D - 0.14, z0), rot=0)
cx, z0 = room_back(3, 0, k); k += 1
# ---- lighting: cold wash from the front, dim; each room lit by its screens
light('AREA', (0.4, -2.5, 1.6), (0, D / 2, 0.55), energy=E('WASHW', '30'), kelv=8500, size=2.0, name='wash')
light('AREA', (-1.5, -1.5, 2.2), (0, D / 2, 0.6), energy=E('WASH2', '6'), kelv=6000, size=1.0, name='wash2')
set_world((0.004, 0.005, 0.007), 1.0)
cam = camera((E('CX', '0.0'), E('CY', '-5.2'), E('CZ', '0.53')), (E('TX', '0.0'), D / 2, E('TZ', '0.53')), lens=E('LENS', '96'), fstop=E('FSTOP', '8'), focus=(0, 0.1, 0.5))
out = A['out'] or (OUT + '/p03.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.3, grain=0.015, bloom=0.14, veil=0.12, veil_col=[0.7, 0.8, 1.0])
