# P04 SELF-BLAME — composite: CGI room + the figure rubbing its arm (pigment wiped thin, smeared onto its hand)
# + its painted reflection in the black glass.
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from era_cgi import cgi_grade, region, floor_reflection
from figure import figure_layer, fig_u, OCHRE, OCHRE_DARK

tag, out = sys.argv[1], sys.argv[2]
pre = os.path.join(WORK, tag)
b = np.load(pre + '_beauty.npy')[..., :3]
H, W = b.shape[:2]
s = W / 1280
img = cgi_grade(b, exposure=1.25)


def seg_mask(fpre, key):
    idx = {int(k): v for k, v in json.load(open(fpre + '.index.json'))['objects'].items()}
    ids = [k for k, v in idx.items() if key in v]
    idm = np.load(fpre + '_id.npy')
    fid = np.rint(idm[..., 0]).astype(np.int32) * (idm[..., 3] > 0.5)
    m = np.isin(fid, ids).astype(np.float32)
    return cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA)


def rub(lay, fpre, u, arm='lElbow', hand='rWrist', seed=3):
    lay = lay.copy()
    fore = blur(seg_mask(fpre, arm), 1.2 * s)
    hm = blur(seg_mask(fpre, hand), 1.0 * s)
    # rub streaks along the forearm direction
    ys, xs = np.nonzero(fore > 0.5)
    if len(ys) > 10:
        cov = np.cov(np.stack([xs - xs.mean(), ys - ys.mean()])); ev, evec = np.linalg.eigh(cov); ax = evec[:, 1]
        ang = np.degrees(np.arctan2(ax[1], ax[0]))
        n = rng(seed).random((H, W)).astype(np.float32)
        k = int(max(9, 0.09 * u)) | 1
        kern = np.zeros((k, k), np.float32); kern[k // 2, :] = 1.0 / k
        M = cv2.getRotationMatrix2D((k / 2, k / 2), -ang, 1.0)
        kern = cv2.warpAffine(kern, M, (k, k)); kern /= kern.sum()
        streak = cv2.filter2D(n, -1, kern)
        streak = (streak - streak.mean()) / (streak.std() + 1e-6)
        wipe = fore * np.clip(0.55 + 0.35 * streak, 0, 1)
        pale = np.array([0.86, 0.66, 0.52])
        lay[..., :3] = lay[..., :3] * (1 - wipe[..., None] * 0.7) + pale * wipe[..., None] * 0.7
        lay[..., 3] = lay[..., 3] * (1 - 0.45 * wipe * (streak > 0.6))
    # the hand, loaded with the pigment it rubbed off
    lay[..., :3] = lay[..., :3] * (1 - hm[..., None] * 0.6) + (OCHRE_DARK * 1.12)[None, None, :] * hm[..., None] * 0.6
    return lay

u = fig_u(pre + '_fig')
lay = rub(figure_layer(pre + '_fig', u, seed=11), pre + '_fig', u)
um = fig_u(pre + '_mir')
mlay = rub(figure_layer(pre + '_mir', um, seed=11), pre + '_mir', um, arm='rElbow', hand='lWrist')
tv = region(pre, 'tv')
mlay[..., :3] = mlay[..., :3] * np.array([0.8, 0.82, 0.95])
mlay[..., 3] *= blur(tv, 0.7) * 0.55
img = over(img, mlay)
img = over(img, floor_reflection(lay, region(pre, 'floor'), u))
img = over(img, lay)
# a single ochre fingerprint smear on the pristine glass (the only human mark in a world without texture)
ma = mlay[..., 3] > 0.2
if ma.sum() > 50:
    ys, xs = np.nonzero(ma)
    fx_, fy_ = xs.min() - 0.02 * W, ys.min() + (ys.max() - ys.min()) * 0.3
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rr = 0.011 * W
    d = np.sqrt(((xx - fx_) / 1.0) ** 2 + ((yy - fy_) / 1.25) ** 2)
    ridges = 0.6 + 0.4 * np.sin(d / (rr * 0.13) * 2 * np.pi + fbm(H, W, rr * 0.5, 2, seed=5) * 2)
    blob = smoothstep(rr, rr * 0.55, d) * ridges
    drag = np.exp(-(((xx - fx_ - 0.4 * (yy - fy_)) / (rr * 0.7)) ** 2)) * smoothstep(0, rr * 0.4, yy - fy_) * (1 - smoothstep(rr, rr * 3.2, yy - fy_))
    smear = np.clip(blob * 0.85 + drag * 0.35 * (0.6 + 0.4 * fbm(H, W, 3 * s, 2, seed=6)), 0, 1) * tv
    img = img * (1 - smear[..., None] * 0.8) + OCHRE[None, None, :] * smear[..., None] * 0.8
img = img * vignette(H, W, 0.14, 2.5)[..., None]
save(out, img)
print('wrote', out)
