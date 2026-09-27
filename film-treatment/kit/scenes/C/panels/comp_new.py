# Direction C — composite the new world (P15): world painted in the figure's language + its people painted exactly
# like the figure (earth pigments) + the hero walking in.   usage: comp_new.py <tag> <out.png>
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from era_new import stylize_new
from figure import paint_figure, premul_resize, OCHRE
from cavekit import paint_named


def new_world(tag, skip=()):
    pre = os.path.join(WORK, tag)
    idx = {int(k): v for k, v in json.load(open(pre + '_w.index.json'))['objects'].items()}
    lids = [k for k, v in idx.items() if v.startswith(('left_win', 'back_win', 'right_win', 'farR_win', 'bulb', 'tram_win'))]
    b = np.load(pre + '_beauty.npy'); H, W = b.shape[:2]
    img = stylize_new(pre, W, H, light_ids=lids)
    meta = json.load(open(pre + '_fig.meta.json'))
    fidx = {int(k): v for k, v in json.load(open(pre + '_fig.index.json'))['objects'].items()}
    names = sorted(set(v.split('.')[0] for v in fidx.values()))
    dm = np.load(pre + '_fig_depth.npy')
    idm = np.load(pre + '_fig_id.npy')
    fid = np.rint(idm[..., 0]).astype(np.int32) * (idm[..., 3] > 0.5)
    pigs = ['#b5532e', '#c98a4c', '#8c3e22', '#a9552f', '#6e3a22', '#b86a3a', '#9c4526', '#d09a5a']
    # paint far figures first
    order = []
    for n in names:
        ids = [k for k, v in fidx.items() if v.split('.')[0] == n]
        m = np.isin(fid, ids)
        if m.sum() < 10:
            continue
        order.append((float(np.median(dm[..., 0][m])), n, ids))
    order.sort(reverse=True)
    for i, (z, n, ids) in enumerate(order):
        if n in skip:
            continue
        u1 = meta['fpx'] * 2.0 / z * (0.62 if n == 's2' else 1.0)
        f = np.where(np.isin(fid, ids), fid, 0)
        nm = np.load(pre + '_fig_normal.npy')
        lay = paint_figure(f, nm[..., :3], dm[..., 0], u1 * meta['ss'], seed=40 + 7 * i,
                           pigment=None if n == 'hero' else hexrgb(pigs[i % len(pigs)]), smears=1)
        lay = premul_resize(lay, W, H)
        img = over(img, lay)
    img = img * vignette(H, W, 0.3, 2.2)[..., None]
    return np.clip(img, 0, 1)


if __name__ == '__main__':
    tag, out = sys.argv[1], sys.argv[2]
    save(out, new_world(tag))
    print('wrote', out)
