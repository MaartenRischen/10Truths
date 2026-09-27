# Direction C — helpers for cave-wall panels: run figure passes, paint figures, light the wall with a torch
# normalised at a focus point (so pigments there read true, matching the unlit hero figure).
import numpy as np, json, os, subprocess, cv2
from cutil import *
from figure import paint_figure, premul_resize, OCHRE, CHARCOAL
from cave import Wall

KITC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BPY = '/tmp/claude-0/bpyenv/bin/python'


def figpass(tag, W, H, figs, cam, ss=2, force=False):
    spec = {'tag': tag, 'W': W, 'H': H, 'ss': ss, 'cam': cam, 'figs': figs}
    sp = os.path.join(WORK, f'{tag}_figspec.json')
    old = json.load(open(sp)) if os.path.exists(sp) else None
    if force or old != spec or not os.path.exists(os.path.join(WORK, f'{tag}_fig_id.npy')):
        json.dump(spec, open(sp, 'w'))
        r = subprocess.run([BPY, os.path.join(KITC, 'figpass.py'), sp], capture_output=True, text=True)
        if 'done' not in r.stdout:
            raise RuntimeError(r.stdout[-3000:] + r.stderr[-3000:])
    return os.path.join(WORK, f'{tag}_fig')


def paint_named(prefix, name, u1, **kw):
    """paint one named figure from a multi-figure pass; returns RGBA at 1x"""
    idx = {int(k): v for k, v in json.load(open(prefix + '.index.json'))['objects'].items()}
    ids = [k for k, v in idx.items() if v.split('.')[0] == name]
    meta = json.load(open(prefix + '.meta.json'))
    ss = meta['ss']
    idm = np.load(prefix + '_id.npy'); nm = np.load(prefix + '_normal.npy'); dm = np.load(prefix + '_depth.npy')
    fid = np.rint(idm[..., 0]).astype(np.int32) * (idm[..., 3] > 0.5)
    fid = np.where(np.isin(fid, ids), fid, 0)
    lay = paint_figure(fid, nm[..., :3], dm[..., 0], u1 * ss, **kw)
    return premul_resize(lay, meta['w'], meta['h'])


def ortho_u(prefix, scale=1.0):
    meta = json.load(open(prefix + '.meta.json'))
    return 2.0 * scale * meta['w'] / meta['ortho']


def lit_wall(wall, torches, focus, tint=(1.05, 0.98, 0.9), ambient=0.035, relief_k=1.0, ao=0.6, spec=0.12,
             far_tint=(1.0, 0.6, 0.34), falloff_gamma=1.0):
    """returns display sRGB; light normalised to 1.0 (x tint) at focus=(fx,fy) in 0..1. Light that falls off also
    warms (firelight read)."""
    lin = wall.light(torches, ambient=(0, 0, 0), relief_k=relief_k, ao=ao, spec=spec)
    alb = srgb2lin(wall.alb)
    Lf = lin / np.maximum(alb, 1e-4)
    fx, fy = int(focus[0] * wall.W), int(focus[1] * wall.H)
    ref = luma(blur(Lf, 12)[fy:fy + 1, fx:fx + 1])[0, 0]
    Lf = Lf / max(ref, 1e-5)
    if falloff_gamma != 1.0:
        lum = np.maximum(luma(Lf), 1e-5)
        Lf = Lf * (np.power(lum, falloff_gamma) / lum)[..., None]
    # compress anything brighter than the focus (no blown hot spots near the flame)
    lum = np.maximum(luma(Lf), 1e-5)
    lc = np.where(lum > 1, 1 + (lum - 1) / (1 + (lum - 1) * 2.5), lum)
    Lf = Lf * (lc / lum)[..., None]
    lum = np.clip(luma(Lf), 0, 1.2)
    tt = np.clip(lum, 0, 1)[..., None] ** 0.6
    tcol = np.asarray(far_tint) + (np.asarray(tint) - np.asarray(far_tint)) * tt
    Lf = Lf + ambient * np.array([1.0, 0.7, 0.5])
    out = alb * Lf * tcol
    # soft shoulder above 0.8 linear
    k = 0.8
    out = np.where(out < k, out, k + (1 - k) * (1 - np.exp(-(out - k) / (1 - k))))
    return lin2srgb(np.clip(out, 0, 1)), luma(Lf)


def relief_shade(wall, light_dir=(-0.5, -0.6, 0.62), k=1.0):
    """normalised bump shading of the rock (1 = flat), to lay the unlit hero onto the rock"""
    hg = blur(wall.hgt, 0.7)
    gy, gx = np.gradient(hg)
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(hg)
    nl = np.sqrt(nx * nx + ny * ny + nz * nz)
    L = np.array(light_dir, np.float32); L /= np.linalg.norm(L)
    d = (nx * L[0] + ny * L[1] + nz * L[2]) / nl
    return np.clip(d / L[2], 0.6, 1.3)


def dust_motes(H, W, n, region_center, spread, seed=0, size=1.5):
    R = rng(seed)
    img = np.zeros((H, W), np.float32)
    for i in range(n):
        x = region_center[0] * W + R.normal(0, spread * W)
        y = region_center[1] * H + R.normal(0, spread * H * 0.8)
        if not (0 <= x < W and 0 <= y < H):
            continue
        r = size * R.uniform(0.5, 2.6) * W / 1280
        cv2.circle(img, (int(x), int(y)), max(1, int(r)), R.uniform(0.3, 1.0), -1, cv2.LINE_AA)
    return blur(img, 0.8 * W / 1280) + blur(img, 3 * W / 1280) * 0.6
