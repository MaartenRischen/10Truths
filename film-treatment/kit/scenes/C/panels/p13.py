# P13 NOT BROKEN — extreme close-up on the figure's painted chest: grains of ochre, charcoal fibres, the rock surface,
# warm and alive; beyond the contour, the CGI world is a cold blur.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from figure import OCHRE, CHARCOAL, OCHRE_DARK, ROCK, MANGANESE

W, H = 1280, 720
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'p13.png')
R = rng(13)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# contour of the chest: a gentle curve from top to bottom, right of centre; x<curve = painted body
cx = 0.7 * W + 0.06 * W * np.sin(yy / H * 2.6 + 0.4) + 0.04 * W * (yy / H) + fbm(H, W, 60, 3, seed=2) * 8
sd = cx - xx                          # >0 inside the body
body = smoothstep(-1.5, 1.5, sd)

# --- the rock (macro): big swells, lumps, fine grain, pits, calcite crystals
hgt = fbm(H, W, 260, 3, seed=3) * 55 + fbm(H, W, 60, 4, seed=4) * 12 + fbm(H, W, 14, 3, seed=5) * 2.2 + fbm(H, W, 3.5, 2, seed=6) * 0.6
pit = smoothstep(0.3, 0.8, -fbm(H, W, 6, 3, seed=7))
hgt = hgt - pit * 2.2
low = smoothstep(0.1, 0.6, -(hgt - blur(hgt, 30)) / 10)     # local hollows
gy, gx = np.gradient(blur(hgt, 0.8))
Ld = np.array([-0.62, -0.55, 0.56]); Ld /= np.linalg.norm(Ld)
nx, ny, nz = -gx, -gy, np.ones_like(hgt)
nl = np.sqrt(nx * nx + ny * ny + nz * nz)
lam = np.clip((nx * Ld[0] + ny * Ld[1] + nz * Ld[2]) / nl, 0, 1)
shade = 0.5 + 0.7 * lam
lime = ROCK[None, None, :] * (1 + 0.08 * fbm(H, W, 90, 3, seed=8)[..., None]) * (1 - 0.25 * pit[..., None])

# --- pigment: dense ochre grains, clumped in hollows, sparse on the swells
dens = 0.8 + 0.3 * low + 0.12 * fbm(H, W, 40, 3, seed=9) - 0.28 * smoothstep(0.2, 0.8, (hgt - blur(hgt, 30)) / 10)
g1 = white(H, W, 10); g1 = blur(g1, 1.1); g1 = (g1 - g1.mean()) / g1.std()
g2 = white(H, W, 11); g2 = blur(g2, 2.4); g2 = (g2 - g2.mean()) / g2.std()
grains = smoothstep(-0.2, 0.9, g1) * 0.6 + smoothstep(0.0, 1.2, g2) * 0.5
cover = np.clip(dens * (0.7 + 0.45 * grains), 0, 1)
tint = fbm(H, W, 25, 2, seed=12)
pig = OCHRE[None, None, :] * (1 + 0.12 * tint[..., None])
pig = pig + (hexrgb('#d0703c') - OCHRE)[None, None, :] * np.clip(smoothstep(1.2, 2.2, g1), 0, 1)[..., None] * 0.7   # bright orange particles
pig = pig + (OCHRE_DARK - pig) * np.clip(smoothstep(1.0, 2.0, g2) * 0.8 + low * 0.35, 0, 1)[..., None]           # dark red clumps
col = lime + (pig - lime) * cover[..., None]
mang = smoothstep(2.4, 3.0, blur(white(H, W, 14), 1.6) * 0 + g2 * 1.0) * 0.9
col = col + (MANGANESE - col) * mang[..., None] * 0.9

# --- charcoal: the contour band, made of fibres aligned with the edge, skipping over the hollows
band = np.exp(-((sd - 22) / 26) ** 2) + 0.35 * np.exp(-((sd - 70) / 14) ** 2) * smoothstep(0.0, 0.5, fbm(H, W, 200, 2, seed=15))
fib = np.zeros((H, W), np.float32)
for i in range(2600):
    y0 = R.uniform(0, H)
    x0c = 0.7 * W + 0.06 * W * np.sin(y0 / H * 2.6 + 0.4) + 0.04 * W * (y0 / H)
    x0 = x0c - R.normal(30, 28)
    L = R.uniform(8, 40); a = np.pi / 2 + (0.06 * 2.6 * W / H) * np.cos(y0 / H * 2.6 + 0.4) * 0 + R.normal(0, 0.18)
    p1 = (int(x0 - np.cos(a) * L / 2), int(y0 - np.sin(a) * L / 2)); p2 = (int(x0 + np.cos(a) * L / 2), int(y0 + np.sin(a) * L / 2))
    cv2.line(fib, p1, p2, float(R.uniform(0.6, 1.0)), int(R.choice([1, 2, 2, 3, 4])), cv2.LINE_AA)
fib = blur(fib, 0.6)
char = np.clip(band * (0.12 + 1.1 * fib) * (1 - 0.45 * low) + fib * 0.6 * smoothstep(-40, 10, sd) * (1 - smoothstep(10, 180, sd)), 0, 1) * 0.95
col = col + (CHARCOAL - col) * char[..., None]
sheen = blur(fib, 0.5) * band * smoothstep(0.55, 0.95, lam)
col = col + sheen[..., None] * np.array([0.55, 0.52, 0.5]) * 0.35
# light it: warm raking firelight on the relief, a few glinting calcite crystals
col = col * shade[..., None] * np.array([1.08, 1.0, 0.9])
spark = smoothstep(2.8, 3.4, g1) * (lam > 0.8) * (cover < 0.6)
col = col + spark[..., None] * np.array([1.0, 0.92, 0.8]) * 0.6

# --- beyond the edge: the cold CGI world, far out of focus
bg_src = np.load(os.path.join(WORK, 'hero2_beauty.npy'))[..., :3]
crop = bg_src[200:900, 1100:1900]
crop = cv2.resize(crop, (W, H), interpolation=cv2.INTER_CUBIC)
k = 45
disc = np.zeros((k, k), np.float32); cv2.circle(disc, (k // 2, k // 2), k // 2 - 1, 1.0, -1, cv2.LINE_AA); disc /= disc.sum()
crop = crop + np.clip(crop - 0.6, 0, None) * 6.0
bokeh = cv2.filter2D(np.clip(crop, 0, 60), -1, disc)
bg = tonemap(bokeh, exposure=1.3, white_pt=5.0) * np.array([0.86, 0.95, 1.1])
bg = np.clip(bg, 0, 1)

# depth of field on the painted surface: sharp band through the middle, softer top and bottom
foc = np.exp(-((yy / H - 0.52) / 0.42) ** 2)
col_b = blur(col, 3.0)
col = col * foc[..., None] + col_b * (1 - foc[..., None])
edge_soft = smoothstep(-6, 6, sd)
img = col * edge_soft[..., None] + bg * (1 - edge_soft[..., None])
# warm glow bleeding just past the edge (the painting is warm, the world is cold)
img = img + (blur(edge_soft, 40) * (1 - edge_soft))[..., None] * np.array([0.25, 0.12, 0.05]) * 0.5
img = img * vignette(H, W, 0.35, 2.2, 0.42, 0.5)[..., None]
img = img + grain(H, W, 0.008, seed=3)[..., None]
save(out, np.clip(img, 0, 1))
print('wrote', out)
