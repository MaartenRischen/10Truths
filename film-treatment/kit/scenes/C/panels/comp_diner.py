# Direction C — composite the night diner (hero-1 / P10): night-era stylisation + phone glow + glass sheen + figure.
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from era_night import stylize_night
from figure import figure_layer, fig_u

tag, out = sys.argv[1], sys.argv[2]
pre = os.path.join(WORK, tag)
b = np.load(pre + '_beauty.npy')
H, W = b.shape[:2]
img = stylize_night(pre, W, H, seed=5)
wid0 = np.rint(np.load(pre + '_w_id.npy')[..., 0]).astype(np.int32)
wa = np.load(pre + '_w_id.npy')[..., 3]
# night sky where nothing was rendered: deep teal falling to green-black, a little brushwork
yy0 = np.mgrid[0:H, 0:W][0].astype(np.float32) / H
sky = np.stack([0.018 + 0.035 * yy0, 0.04 + 0.06 * yy0, 0.045 + 0.055 * yy0], -1) * (1 + 0.06 * fbm(H, W, 90 * W / 1920, 3, seed=9))[..., None]
skym = blur((wa < 0.5).astype(np.float32), 1.0)[..., None]
img = img * (1 - skym) + sky * skym

idx = {int(k): v for k, v in json.load(open(pre + '_w.index.json'))['objects'].items()}
wid = np.rint(np.load(pre + '_w_id.npy')[..., 0]).astype(np.int32)
ids_screen = [k for k, v in idx.items() if v.startswith('screen')]
ids_cust = [k for k, v in idx.items() if v[0] == 'c' and v[1].isdigit()]
cm = blur(np.isin(wid, ids_cust).astype(np.float32), 0.8)[..., None]
img = img * (1 - cm) + img * cm * np.array([0.7, 0.7, 0.76])
ids_inside = [k for k, v in idx.items() if v.split('.')[0] in ('floor_in', 'ceiling', 'backwall', 'sidewall_l', 'sidewall_r', 'pass',
              'passsill', 'kdoor', 'backcounter', 'backcounter_t', 'counter', 'countertop') or v.startswith(('c', 'urn', 'tube', 'stool', 'phone', 'screen', 'cup'))
              and not v.startswith(('curb',))]
s = W / 1920
# phone glow: cold light blooming off each screen
scr = np.isin(wid, ids_screen).astype(np.float32)
glow = blur(scr, 6 * s) * 2.2 + blur(scr, 18 * s) * 1.2
img = img + glow[..., None] * np.array([0.35, 0.6, 1.0]) * 0.55
# glass: a faint cool sheen band across the window so it reads as glass between figure and diner
win = np.isin(wid, ids_inside).astype(np.float32)
win = blur(win, 1.0)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
band = np.exp(-(((xx / W) * 0.9 + (yy / H) * 0.55 - 0.95) / 0.09) ** 2) * 0.05 + 0.015
img = img + (win * band)[..., None] * np.array([0.8, 0.95, 1.0])
img = np.clip(img, 0, 1)
# the figure (constant treatment)
u = fig_u(pre + '_fig')
lay = figure_layer(pre + '_fig', u, seed=11)
img = over(img, lay)
img = img * vignette(H, W, 0.38, 2.2, 0.45, 0.5)[..., None]
img = np.clip(img * 1.03 - 0.005, 0, 1)
save(out, img)
print('wrote', out, 'u=%.0f' % u)
