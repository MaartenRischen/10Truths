# Direction C — composite the lonely night city (hero-1 v2 / P10): painting pass + customers simplified + phone glow
# + the ochre figure in the dark street.   usage: comp_diner2.py <tag> <out.png>
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from era_night import grade_night, flatten, plane_angles, big_regions
from strokes import paint, canvas_texture
from figure import figure_layer, fig_u

tag, out = sys.argv[1], sys.argv[2]
pre = os.path.join(WORK, tag)
b = np.load(pre + '_beauty.npy')[..., :3]
H, W = b.shape[:2]
s = W / 1920
idx = {int(k): v for k, v in json.load(open(pre + '_w.index.json'))['objects'].items()}
wid = np.rint(np.load(pre + '_w_id.npy')[..., 0]).astype(np.int32)
wa = np.load(pre + '_w_id.npy')[..., 3]
def ids(*pref):
    return [k for k, v in idx.items() if v.startswith(pref)]
cust = np.isin(wid, [k for k, v in idx.items() if v[0] == 'c' and len(v) > 1 and v[1].isdigit()]).astype(np.float32)
scr = np.isin(wid, ids('screen')).astype(np.float32)
img = grade_night(b)
# customers: flat, darker, cooler (the phone light on their faces survives as the brightest note on them)
cm = blur(cust, 0.7)[..., None]
lum = luma(img)[..., None]
img = img * (1 - cm) + (img * np.array([0.62, 0.66, 0.74]) * (0.75 + 0.6 * smoothstep(0.35, 0.8, lum))) * cm
img = flatten(img, wid, levels=5, strength=0.55)
ang = plane_angles(pre, wid)
big = big_regions(wid, 0.02); med = big_regions(wid, 0.003)
img = paint(img, [
    {'r': 30 * s, 'len': 3.2, 'grid': 1.0, 'alpha': 0.75, 'kind': 'flat', 'blur': 0.45, 'thresh': 0.0, 'mask': big},
    {'r': 15 * s, 'len': 3.0, 'grid': 0.9, 'alpha': 0.7, 'kind': 'flat', 'blur': 0.3, 'thresh': 0.03, 'mask': med},
    {'r': 7 * s, 'len': 2.6, 'grid': 0.9, 'alpha': 0.72, 'kind': 'flat', 'blur': 0.2, 'thresh': 0.05},
    {'r': 3.5 * s, 'len': 2.2, 'grid': 0.9, 'alpha': 0.7, 'kind': 'flat', 'blur': 0.1, 'thresh': 0.07, 'mask': 1 - med},
], region=wid, angle=ang, coh=np.ones_like(ang), seed=5, jitter_ang=0.08, color_jitter=0.012, value_jitter=0.035)
# sky: deep green-black, brushed
yy = np.mgrid[0:H, 0:W][0].astype(np.float32) / H
sky = np.stack([0.012 + 0.02 * yy, 0.03 + 0.03 * yy, 0.028 + 0.03 * yy], -1) * (1 + 0.1 * fbm(H, W, 80 * s, 3, seed=9))[..., None]
skym = blur((wa < 0.5).astype(np.float32), 1.0)[..., None]
img = img * (1 - skym) + sky * skym
# phones: each face lit from below by its screen, and a cold halo around each phone
ph = np.isin(wid, ids('phone', 'screen')).astype(np.float32)
glow = blur(ph, 4 * s) * 1.6 + blur(ph, 14 * s) * 0.9
img = img + glow[..., None] * np.array([0.4, 0.62, 1.0]) * 0.45
cool = np.array([0.62, 0.8, 1.0])
for ci in range(12):
    hm = np.isin(wid, [k for k, v in idx.items() if v.startswith(f'c{ci}.head.')]).astype(np.float32)
    if hm.sum() < 4:
        continue
    ys_, xs_ = np.nonzero(hm > 0.5)
    ytop, ybot = ys_.min(), ys_.max()
    grad = np.clip((yy * H - ytop) / max(1, ybot - ytop), 0, 1) ** 1.5      # brighter towards the chin
    face = hm * grad
    img = img * (1 - 0.55 * face[..., None]) + cool * 0.95 * 0.55 * face[..., None]
    img = img + blur(face, 5 * s)[..., None] * cool * 0.25
img = img * 0.72 + blur(img, 1.6 * max(1.0, s * 1.5)) * 0.28           # slightly soft edges
img = img * canvas_texture(H, W, scale=W / 1280, seed=5, strength=0.075)[..., None]
img = img + grain(H, W, 0.01, seed=6)[..., None]
img = np.clip(img, 0, 1)
u = fig_u(pre + '_fig')
if os.environ.get('NOFIG') != '1':
    img = over(img, figure_layer(pre + '_fig', u, seed=11))
img = img * vignette(H, W, 0.35, 2.2, 0.5, 0.52)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out, 'u=%.0f' % u)
