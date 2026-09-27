# P14 THE ANSWER — the brush has turned away from the figure and is repainting the world around it: the left of the
# frame is freshly repainted in warm earth strokes, the right is still glossy CGI; the figure is untouched.
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from era_cgi import cgi_grade, region, floor_reflection
from era_new import stylize_new
from figure import figure_layer, fig_u, OCHRE

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p14.png')
pre = os.path.join(WORK, 'p03')
TIP = json.loads(os.environ.get('TIP', '[0.63, 0.47]'))
b = np.load(pre + '_beauty.npy')[..., :3]
H, W = b.shape[:2]
s = W / 1280
cgi = cgi_grade(b, exposure=1.2)
idx = {int(k): v for k, v in json.load(open(pre + '_w.index.json'))['objects'].items()}
lids = [k for k, v in idx.items() if v.startswith(('city', 'dl', 'lamp_shade', 'globe', 'sphone_scr'))]
warm = stylize_new(pre, W, H, seed=14, light_ids=lids)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
tx, ty = TIP[0] * W, TIP[1] * H
# repainted region: horizontal strokes whose reach varies smoothly; the stroke being laid now reaches the brush tip
R = rng(14)
reach = 0.5 * W + vnoise(H, 8, 120 * s, 5, angle=0)[:, 0] * 60 * s
m = np.zeros((H, W), np.float32); lip = np.zeros((H, W), np.float32)
y = 0.0
while y < H:
    sw = R.uniform(18, 34) * s
    yc = min(H - 1, int(y + sw / 2))
    xe = reach[yc] + R.normal(0, 16) * s
    if abs(yc - ty) < 30 * s:
        xe = tx - 6 * s                     # the fresh stroke under the brush
    rows = (yy >= y) & (yy < y + sw)
    tt = np.clip((yy - y) / sw, 0, 1)
    rnd = np.clip(np.sin(tt * np.pi), 0, 1) ** 0.5
    endx = xe - (1 - rnd) * 12 * s
    br = rng(int(y) + 7).random(H).astype(np.float32)
    streak = br[yy.astype(int)]
    Ldry = R.uniform(20, 50) * s
    ramp = np.clip((endx - xx) / Ldry, 0, 1)          # 0 at the stroke end .. 1 where solid (stroke comes from the left)
    a = smoothstep(0.0, 0.25, ramp) * smoothstep(1 - ramp - 0.15, 1 - ramp + 0.15, streak) + smoothstep(0.85, 1.0, ramp)
    m = np.maximum(m, np.clip(a, 0, 1) * rows)
    lip = np.maximum(lip, np.exp(-((xx - endx + 4 * s) / (4 * s)) ** 2) * rows * rnd)
    y += sw * R.uniform(0.55, 0.85)
img = cgi * (1 - m[..., None]) + warm * m[..., None]
img = img + (lip * m)[..., None] * 0.06
# the stroke under the brush is still wet: extra-thick fresh ochre with a glossy ridge
hw = 24 * s + fbm(H, W, 30 * s, 2, seed=41) * 5 * s                       # ragged half-width of the stroke
band = smoothstep(hw + 1.5, hw - 1.5, np.abs(yy - ty))
end = smoothstep(tx + 2 * s, tx - 14 * s, xx + (np.abs(yy - ty) / (hw + 1e-3)) ** 2 * 14 * s)   # rounded end at the tip
start = smoothstep(tx - 260 * s, tx - 120 * s, xx)
br = rng(43).random(H).astype(np.float32); br = cv2.GaussianBlur(br.reshape(-1, 1), (1, 5), 1.2).ravel()
bristle = 0.55 + 0.45 * br[yy.astype(int)]
fr = np.clip(band * end * start, 0, 1)
load = fr * bristle
img = img * (1 - 0.6 * load[..., None]) + (OCHRE * 1.08)[None, None, :] * 0.6 * load[..., None]
# wet highlight along the ridges of the fresh paint
ridge = np.clip(np.gradient(blur(load, 1.0), axis=0) * -8, 0, 1) * fr
img = img + ridge[..., None] * 0.18
img = np.clip(img, 0, 1)
# the figure: untouched, as always (its floor reflection only survives on the glossy side)
u = fig_u(pre + '_fig')
lay = figure_layer(pre + '_fig', u, seed=11)
refl = floor_reflection(lay, region(pre, 'floor') * (1 - m), u)
img = over(img, refl)
img = over(img, lay)
# the brush and its shadow
bb = np.load(os.path.join(WORK, 'p14_brush.npy'))
ba = bb[..., 3:4]
bc = tonemap(bb[..., :3] / np.maximum(ba, 1e-4), 1.0, white_pt=4.0) * ba
img = img * (1 - ba) + bc
img = img * vignette(H, W, 0.2, 2.2)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out)
