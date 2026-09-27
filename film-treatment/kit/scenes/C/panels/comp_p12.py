# P12 ON PURPOSE — the ochre figure being scanned into a glossy advertisement: a laser line passes over it, a loupe
# samples its pigment, and the sample lands as a colour swatch on the price tag hanging from its wrist.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from era_cgi import cgi_grade
from figure import figure_layer, fig_u, OCHRE

tag = sys.argv[1]; out = sys.argv[2]
pre = os.path.join(WORK, tag)
b = np.load(pre + '_beauty.npy')[..., :3]
H, W = b.shape[:2]
s = W / 1280
img = cgi_grade(b, 1.0, cool=0.04)
u = fig_u(pre + '_fig')
lay = figure_layer(pre + '_fig', u, seed=11)
fa = lay[..., 3]
ys, xs = np.nonzero(fa > 0.5)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# contact shadow on the plinth
cx = xs[ys > y1 - 6 * s].mean()
cs = np.exp(-(((xx - cx) / (0.07 * W)) ** 2 + ((yy - y1 - 2 * s) / (0.008 * H)) ** 2)) * 0.35
img = img * (1 - cs[..., None])
img = over(img, lay)
# the scan: a laser plane at hip height sweeping down; above it the figure is 'captured' (faint cool grid)
ysc = y0 + 0.56 * (y1 - y0)
line = np.exp(-((yy - ysc) / (1.2 * s)) ** 2) * ((xx > x0 - 60 * s) & (xx < x1 + 60 * s))
glow = blur(line, 6 * s) * 3 + blur(line, 20 * s) * 1.5
img = img + (line[..., None] * np.array([0.7, 0.95, 1.0]) + glow[..., None] * np.array([0.2, 0.55, 0.9]) * 0.4)
cap = (yy < ysc) * blur(fa, 0.8)
grid = (np.sin(yy * 2 * np.pi / (6 * s)) > 0.8).astype(np.float32) * 0.07
img = img * (1 - cap[..., None] * 0.06) + cap[..., None] * np.array([0.55, 0.8, 1.0]) * (0.04 + grid[..., None])
# corner brackets around the figure (crisp UI)
ui = np.zeros((H, W), np.float32)
pad = 22 * s; L = 34 * s; th = max(1, int(2 * s))
bx0, by0, bx1, by1 = int(x0 - pad), int(y0 - pad), int(x1 + pad), int(y1 + pad * 0.4)
for (px, py, dx, dy) in ((bx0, by0, 1, 1), (bx1, by0, -1, 1), (bx0, by1, 1, -1), (bx1, by1, -1, -1)):
    cv2.line(ui, (px, py), (int(px + dx * L), py), 1.0, th, cv2.LINE_AA)
    cv2.line(ui, (px, py), (px, int(py + dy * L)), 1.0, th, cv2.LINE_AA)
# the loupe: sample a patch of the chest, show it magnified in a lens to the right, line to the tag swatch
sx, sy = int(x0 + 0.52 * (x1 - x0)), int(y0 + 0.27 * (y1 - y0))
r_s = int(10 * s)
cv2.rectangle(ui, (sx - r_s, sy - r_s), (sx + r_s, sy + r_s), 1.0, th, cv2.LINE_AA)
lx, ly, lr = int(x1 + 190 * s), int(y0 + 0.16 * (y1 - y0)), int(92 * s)
crop = img[max(0, sy - 24):sy + 24, max(0, sx - 24):sx + 24]
zoom = cv2.resize(crop, (2 * lr, 2 * lr), interpolation=cv2.INTER_CUBIC)
disc = np.zeros((H, W), np.float32); cv2.circle(disc, (lx, ly), lr, 1.0, -1, cv2.LINE_AA)
zl = np.zeros_like(img); zl[ly - lr:ly + lr, lx - lr:lx + lr] = zoom[:2 * lr, :2 * lr]
shadow = blur(disc, 10 * s) * 0.25
img = img * (1 - shadow[..., None])
img = img * (1 - disc[..., None]) + zl * disc[..., None]
ring = np.zeros((H, W), np.float32); cv2.circle(ring, (lx, ly), lr, 1.0, max(2, int(3 * s)), cv2.LINE_AA)
ui = np.maximum(ui, ring)
# lens glint
gl = np.exp(-(((xx - lx + 0.35 * lr) / (0.25 * lr)) ** 2 + ((yy - ly + 0.45 * lr) / (0.12 * lr)) ** 2)) * disc * 0.35
img = img + gl[..., None]
cv2.line(ui, (sx + r_s, sy), (int(lx - lr * 0.99), ly), 0.8, max(1, int(1.2 * s)), cv2.LINE_AA)
# the tag
t = np.load(pre + '_tag.npy'); ta = t[..., 3:4]
tc = tonemap(t[..., :3] / np.maximum(ta, 1e-4), 1.0, white_pt=6.0)
img = img * (1 - ta) + tc * ta
tys, txs = np.nonzero(t[..., 3] > 0.5)
if len(tys):
    # line from the loupe to the swatch on the tag
    tsx, tsy = int(txs.mean()), int(tys.min() + 0.33 * (tys.max() - tys.min()))
    ex = int(txs.max() + 8 * s)
    cv2.line(ui, (lx, ly + lr), (lx, tsy), 0.8, max(1, int(1.2 * s)), cv2.LINE_AA)
    cv2.line(ui, (lx, tsy), (ex, tsy), 0.8, max(1, int(1.2 * s)), cv2.LINE_AA)
    cv2.circle(ui, (ex, tsy), max(2, int(4 * s)), 1.0, -1, cv2.LINE_AA)
uic = np.array([0.18, 0.5, 0.95])
img = img * (1 - ui[..., None] * 0.9) + uic * ui[..., None] * 0.9
img = img * vignette(H, W, 0.1, 2.5)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out)
