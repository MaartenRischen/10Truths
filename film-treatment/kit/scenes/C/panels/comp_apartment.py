# Direction C — composite a CGI apartment render (hero-2 / P03 / P05 right): clean grade + painted figure + its
# painted reflection in the glossy floor.   usage: comp_apartment.py <tag> <out.png> [exposure]
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from era_cgi import cgi_grade, region, floor_reflection, fingerprint
from figure import OCHRE
from figure import figure_layer, fig_u

tag, out = sys.argv[1], sys.argv[2]
expo = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
pre = os.path.join(WORK, tag)
b = np.load(pre + '_beauty.npy')[..., :3]
H, W = b.shape[:2]
img = cgi_grade(b, exposure=expo)
if os.path.exists(pre + '_fig_id.npy'):
    u = fig_u(pre + '_fig')
    lay = figure_layer(pre + '_fig', u, seed=11)
    fl = region(pre, 'floor')
    img = over(img, floor_reflection(lay, fl, u))
    img = over(img, lay)
# phone glow on the sofa
ph = region(pre, 'sphone_scr')
if ph.sum() > 0:
    gl = blur(ph, 5 * W / 1920) * 1.6 + blur(ph, 16 * W / 1920) * 0.8
    img = np.clip(img + gl[..., None] * np.array([0.45, 0.62, 1.0]) * 0.35, 0, 1)
# one ochre fingerprint on the glass table: the only mark in the room besides the figure
gt = region(pre, 'gtable_top')
if gt.sum() > 100:
    ys, xs = np.nonzero(gt > 0.5)
    cx = xs.min() + (xs.max() - xs.min()) * 0.2; cy = ys.min() + (ys.max() - ys.min()) * 0.55
    fp = fingerprint(H, W, cx, cy, 0.0105 * W, seed=5, drag=(0.9, 0.35)) * blur(gt, 0.8)
    img = img * (1 - fp[..., None] * 0.85) + OCHRE[None, None, :] * 1.05 * fp[..., None] * 0.85
img = img * vignette(H, W, 0.12, 2.5)[..., None]
save(out, img)
print('wrote', out)
