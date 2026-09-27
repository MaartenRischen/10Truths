# Direction C — THE FIGURE. One treatment, every panel: red ochre (#b5532e) finger-painted onto rock, rock-pigment
# grain, a dry charcoal contour (heavier on the shadow side, re-traced in places), faint charcoal joint seams, and
# charcoal rubbed into the shadow side. Sized relative to u = figure height (2.0 units) in px at working resolution,
# so it looks identical at any scale. The figure carries its own light (upper left), never the world's.
import numpy as np, cv2
from scipy import ndimage
from cutil import fbm, vnoise, white, smoothstep, blur, hexrgb, rng

OCHRE = hexrgb('#b5532e')
CHARCOAL = hexrgb('#1f1914')
ROCK = hexrgb('#c9ad86')
OCHRE_DARK = hexrgb('#8a3719')
OCHRE_WARM = hexrgb('#c86538')
MANGANESE = hexrgb('#2a221d')


def _sd(mask):
    m = mask.astype(np.uint8)
    din = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    dout = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
    return din - dout


def _finger_strokes(lab, u, fw, R):
    h, w = lab.shape
    body = np.zeros((h, w), np.float32)   # pigment coverage of finger drags
    ridge = np.zeros((h, w), np.float32)  # pigment pushed to the stroke sides
    objs = ndimage.find_objects(lab)
    for sid, sl in enumerate(objs, start=1):
        if sl is None:
            continue
        sub = lab[sl] == sid
        yy, xx = np.nonzero(sub)
        if len(yy) < (0.028 * u) ** 2:
            continue
        yy = yy + sl[0].start; xx = xx + sl[1].start
        my, mx = yy.mean(), xx.mean()
        cov = np.cov(np.stack([xx - mx, yy - my]))
        ev, evec = np.linalg.eigh(cov)
        ax = evec[:, 1]
        if ev[1] < 1.6 * ev[0]:  # round-ish (joint balls, head from front): random drag direction
            a = R.uniform(0, np.pi); ax = np.array([np.cos(a), np.sin(a)])
        px = np.array([-ax[1], ax[0]])
        s = (xx - mx) * ax[0] + (yy - my) * ax[1]
        t = (xx - mx) * px[0] + (yy - my) * px[1]
        smin, smax = np.percentile(s, 1), np.percentile(s, 99)
        tmin, tmax = np.percentile(t, 3), np.percentile(t, 97)
        width = tmax - tmin
        n = int(np.clip(round(width / (0.75 * fw)), 1, 8))
        m = int(fw * 1.2)
        by0, by1 = max(0, sl[0].start - m), min(h, sl[0].stop + m)
        bx0, bx1 = max(0, sl[1].start - m), min(w, sl[1].stop + m)
        gy, gx = np.mgrid[by0:by1, bx0:bx1].astype(np.float32)
        for k in range(n):
            ang = R.normal(0, 0.06)
            ca, sa = np.cos(ang), np.sin(ang)
            a2 = np.array([ax[0] * ca - ax[1] * sa, ax[0] * sa + ax[1] * ca]); p2 = np.array([-a2[1], a2[0]])
            tc = tmin + (k + 0.5) * width / n + R.normal(0, 0.1 * fw)
            s0 = smin - R.uniform(0, 0.3) * fw; s1 = smax + R.uniform(0, 0.3) * fw
            if R.random() < 0.5:
                s0, s1 = s1, s0
            fwk = fw * R.uniform(0.85, 1.15)
            cx, cy = mx + p2[0] * tc, my + p2[1] * tc
            ls = (gx - cx) * a2[0] + (gy - cy) * a2[1]
            lt = (gx - cx) * p2[0] + (gy - cy) * p2[1]
            ss = (ls - s0) / (s1 - s0 + 1e-6)
            # slight lateral wander of the finger
            lt = lt + np.sin(ss * np.pi * R.uniform(1, 2.5) + R.uniform(0, 6)) * 0.12 * fwk
            tt = lt / (fwk * 0.5)
            ends = smoothstep(-0.04, 0.03, ss) * (1 - smoothstep(0.93, 1.04, ss))
            cov_ = np.clip(1.15 - tt * tt, 0, 1) ** 0.6 * ends
            load = 1.0 - 0.35 * smoothstep(0.35, 1.0, ss)          # paint runs out along the drag
            streak = 0.82 + 0.18 * np.sin(lt * 2 * np.pi / max(1.6, fwk / 5.0) + ss * 3)
            body[by0:by1, bx0:bx1] = np.maximum(body[by0:by1, bx0:bx1], cov_ * load * streak)
            rd = np.exp(-((np.abs(tt) - 1.0) / 0.22) ** 2) * ends * load
            rd += 0.8 * np.exp(-(ss / 0.05) ** 2) * np.clip(1 - tt * tt, 0, 1)  # blob where the finger landed
            ridge[by0:by1, bx0:bx1] = np.maximum(ridge[by0:by1, bx0:bx1], rd)
    return body, ridge


def paint_figure(fid, fn, fz, u, seed=11, pigment=None, light=(-0.55, 0.62, 0.56), smears=3, boil=0,
                 line_scale=1.0, wet=0.0):
    """fid: (H,W) int segment ids (0 = empty); fn: (H,W,3) camera normals encoded 0..1; fz: depth.
    u: figure height (2.0 units) in px at this resolution. Returns straight RGBA float32 (H,W,4)."""
    H, W = fid.shape
    out = np.zeros((H, W, 4), np.float32)
    ys, xs = np.nonzero(fid > 0)
    if len(ys) == 0:
        return out
    pad = int(0.12 * u) + 10
    y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad)
    lab = fid[y0:y1, x0:x1]; nrm = fn[y0:y1, x0:x1] * 2 - 1; dep = fz[y0:y1, x0:x1]
    h, w = lab.shape
    S = seed
    Sb = seed + 1000 * boil          # boil (12 fps): only the hand-drawn outline and silhouette wobble change
    pig = OCHRE if pigment is None else pigment
    mask = lab > 0
    R = rng(S)

    # --- silhouette with hand-painted wobble
    sd = _sd(mask)
    wob = fbm(h, w, max(3, 0.05 * u), 3, seed=Sb + 1) * 0.004 * u + vnoise(h, w, max(2, 0.013 * u), Sb + 2) * 0.0012 * u
    sdw = sd + wob
    fill = smoothstep(-0.9, 0.9, sdw)

    # --- own light (upper left) and form
    L = np.array(light, np.float32); L /= np.linalg.norm(L)
    ndl = np.clip((nrm * L).sum(-1), -1, 1)
    mb = np.maximum(blur(mask.astype(np.float32), max(1, 0.01 * u)), 1e-3)
    ndl_s = blur(ndl * mask, max(1, 0.01 * u)) / mb

    # --- the figure carries its own piece of limestone: relief, albedo mottling, pits
    rock = (fbm(h, w, max(4, 0.05 * u), 3, seed=S + 3) * 0.45 + fbm(h, w, max(2.5, 0.016 * u), 3, seed=S + 4) * 0.4
            + fbm(h, w, max(1.2, 0.0045 * u), 2, seed=S + 21) * 0.15)
    hollow = smoothstep(0.05, 0.6, -rock)          # pigment pools here
    peak = smoothstep(0.15, 0.65, rock)            # pigment worn thin here
    pits = smoothstep(0.35, 0.75, -fbm(h, w, max(1.2, 0.004 * u), 2, seed=S + 22)) * smoothstep(-0.2, 0.4, -rock)
    lime_m = fbm(h, w, max(5, 0.09 * u), 3, seed=S + 23)
    limestone = ROCK[None, None, :] * (1 + 0.1 * lime_m[..., None]) + np.array([0.04, 0.03, 0.0]) * lime_m[..., None]
    limestone = limestone * (1 - 0.18 * pits[..., None])

    # --- pigment density: uneven wash, finger drags, pooled in hollows, worn on peaks, flaked patches
    fw = max(3.0, 0.036 * u)
    body, ridge = _finger_strokes(lab, u, fw, R)
    wash = 0.52 + 0.2 * fbm(h, w, max(5, 0.11 * u), 3, seed=S + 5) + 0.08 * fbm(h, w, max(3, 0.03 * u), 2, seed=S + 6)
    dens = wash + (0.95 - wash) * body * 0.85 + 0.12 * ridge
    dens = dens + 0.3 * hollow - 0.2 * peak + 0.1 * fbm(h, w, max(1.2, 0.004 * u), 2, seed=S + 27)
    flake = smoothstep(0.5, 0.68, fbm(h, w, max(1.6, 0.011 * u), 3, seed=S + 24)) * smoothstep(0.1, 0.6, fbm(h, w, max(6, 0.12 * u), 2, seed=S + 25))
    dens = dens * (1 - 0.65 * flake)
    dens = np.clip(dens, 0.08, 1.25)

    # --- colour: thin pigment reads orange over pale rock, thick pigment pools deep red-brown
    mott = fbm(h, w, max(6, 0.16 * u), 3, seed=S + 7)
    mott2 = fbm(h, w, max(5, 0.09 * u), 3, seed=S + 8)
    base = pig[None, None, :] * (1 + 0.06 * mott[..., None])
    if pigment is None:
        base = base + (OCHRE_WARM - pig)[None, None, :] * np.clip(mott2 * 0.9, 0, 0.45)[..., None]
    thick = np.clip(dens - 0.85, 0, 0.4)[..., None] / 0.4
    deep = OCHRE_DARK if pigment is None else pig * 0.62
    col = limestone + (base - limestone) * np.clip(dens, 0, 1)[..., None] ** 0.85
    col = col + (deep - col) * thick * 0.75
    # manganese flecks and a few charcoal specks carried in the paint
    wn = blur(white(h, w, S + 9), max(0.7, 0.0022 * u)); wn = (wn - wn.mean()) / (wn.std() + 1e-6)
    wn2 = blur(white(h, w, S + 26), max(1.2, 0.005 * u)); wn2 = (wn2 - wn2.mean()) / (wn2.std() + 1e-6)
    mang = np.clip(smoothstep(2.3, 2.9, wn) * 0.85 + smoothstep(2.7, 3.2, wn2) * 0.9, 0, 0.92)
    col = col + (MANGANESE - col) * mang[..., None]

    # --- light: the figure's own form (upper-left firelight) and the relief of its rock
    shade = 0.87 + 0.16 * ndl_s
    rg_y, rg_x = np.gradient(blur(rock, max(0.7, 0.0015 * u)))
    k_b = 1.0 / max(1e-3, np.percentile(np.abs(rg_x * L[0] - rg_y * L[1]), 95))
    bump = 1 + np.clip((rg_x * L[0] - rg_y * L[1]) * k_b, -1, 1) * 0.16
    col *= (shade * bump)[..., None]

    # --- calibrate: where the pigment is solid, its median colour IS the pigment (#b5532e for the hero)
    core = (sdw > 0.04 * u) & (dens > 0.7) & (mang < 0.1)
    if core.sum() > 50:
        med = np.median(col[core], axis=0)
        col = col * np.clip(pig / np.maximum(med, 1e-3), 0.6, 1.6)[None, None, :]

    # --- charcoal rubbed into the shadow side along the contour
    smt = 0.5 + 0.5 * fbm(h, w, max(3, 0.03 * u), 3, seed=S + 11)
    smudge = np.exp(-np.clip(sdw, 0, None) / (0.026 * u)) * np.clip(0.4 - 0.95 * ndl_s, 0, 1) * 0.5 * smt
    col = col + (CHARCOAL - col) * smudge[..., None]

    # --- inner lines: occlusion edges (strong) and joint seams (faint)
    lp = np.pad(lab, 1, mode='edge'); dp = np.pad(dep, 1, mode='edge')
    occ = np.zeros((h, w), bool); seam = np.zeros((h, w), bool)
    zthr = 0.03
    for dy, dx in ((1, 0), (0, 1), (-1, 0), (0, -1)):
        nb = lp[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        nz = dp[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        diff = (nb != lab) & (nb > 0) & (lab > 0)
        big = np.abs(nz - dep) > zthr
        occ |= diff & big & (dep < nz)
        seam |= diff & ~big
    w0 = max(2.2, 0.0085 * u) * line_scale
    d_occ = cv2.distanceTransform((~occ).astype(np.uint8), cv2.DIST_L2, 5)
    d_seam = cv2.distanceTransform((~seam).astype(np.uint8), cv2.DIST_L2, 5)
    press = np.clip(1 + 0.45 * vnoise(h, w, max(4, 0.08 * u), Sb + 12), 0.5, 1.6)
    dryf = fbm(h, w, max(1.3, 0.0035 * u), 2, seed=S + 13)
    char_tex = smoothstep(-0.6, 0.15, dryf + 0.35 * vnoise(h, w, max(3, 0.03 * u), S + 14) + 0.6 * rock - 0.4 * pits)
    l_occ = smoothstep(0.5 * w0 * press + 0.8, 0.5 * w0 * press - 0.8, d_occ) * (0.35 + 0.65 * char_tex) * 0.88
    l_seam = smoothstep(0.3 * w0 + 0.7, 0.3 * w0 - 0.7, d_seam) * (0.4 + 0.6 * char_tex) * 0.62
    inner = np.clip(l_occ + l_seam, 0, 1) * mask
    col = col + (CHARCOAL - col) * inner[..., None]

    # --- a few finger smears dragged past the contour (under the outline)
    smear_a = np.zeros((h, w), np.float32)
    if smears:
        gy_, gx_ = np.gradient(blur(sd, 2.0))
        cand = np.argwhere((np.abs(sd) < 1.0))
        R2 = rng(S + 15)
        if len(cand):
            picks = cand[R2.choice(len(cand), size=min(smears, len(cand)), replace=False)]
            for (py, px_) in picks:
                ny, nx = -gy_[py, px_], -gx_[py, px_]
                nl = np.hypot(ny, nx) + 1e-6; ny /= nl; nx /= nl
                ang = np.arctan2(ny, nx) + R2.normal(0, 0.45)
                dy, dx = np.sin(ang), np.cos(ang)
                Lm = R2.uniform(0.025, 0.06) * u
                r = int(Lm * 1.2 + fw)
                by0, by1 = max(0, py - r), min(h, py + r); bx0, bx1 = max(0, px_ - r), min(w, px_ + r)
                yy, xx = np.mgrid[by0:by1, bx0:bx1].astype(np.float32)
                sx0, sy0 = px_ - dx * 0.25 * Lm, py - dy * 0.25 * Lm
                ls = (xx - sx0) * dx + (yy - sy0) * dy
                lt = (xx - sx0) * -dy + (yy - sy0) * dx
                ss = ls / Lm
                a = np.exp(-(lt / (0.4 * fw)) ** 4) * smoothstep(-0.05, 0.1, ss) * (1 - smoothstep(0.3, 1.0, ss))
                smear_a[by0:by1, bx0:bx1] = np.maximum(smear_a[by0:by1, bx0:bx1], a * 0.5)
    smear_a *= (0.55 + 0.45 * smoothstep(-0.5, 0.3, dryf)) * (1 - fill)
    col_out = np.where(fill[..., None] > 0.02, col, (pig * 0.92)[None, None, :] * np.ones_like(col))

    # --- contour: hand-applied charcoal. Pressure swells and thins, it skips on the rock, breaks, and is
    #     re-traced (doubled) in places; heavier on the shadow side.
    side = 1 + 0.6 * np.clip(-ndl_s, 0, 1) - 0.25 * np.clip(ndl_s, 0, 1)
    press2 = np.clip(1 + 0.6 * vnoise(h, w, max(4, 0.06 * u), Sb + 30) + 0.25 * vnoise(h, w, max(3, 0.02 * u), Sb + 31), 0.3, 1.9)
    wline = w0 * press2 * side
    dl = sdw - 0.2 * wline
    line = smoothstep(wline * 0.5 + 0.9, wline * 0.5 - 0.9, np.abs(dl))
    gaps = smoothstep(-0.62, -0.42, vnoise(h, w, max(4, 0.045 * u), Sb + 32))        # the charcoal lifted
    skip = 0.3 + 0.7 * char_tex                                                       # dry skips on the grain
    line = line * gaps * (0.45 + 0.55 * skip) * 0.96
    # re-traced passes: a second, thinner line wandering off the first on part of the contour, and a third faint one
    off2 = 0.009 * u * vnoise(h, w, max(5, 0.08 * u), Sb + 19) + 0.004 * u
    d2 = np.abs(sdw + off2)
    line2 = smoothstep(0.3 * w0 + 0.7, 0.3 * w0 - 0.7, d2) * smoothstep(0.0, 0.45, vnoise(h, w, max(5, 0.12 * u), Sb + 20))
    line2 *= 0.75 * (0.35 + 0.65 * char_tex)
    off3 = -0.006 * u * vnoise(h, w, max(5, 0.07 * u), Sb + 33) - 0.003 * u
    d3 = np.abs(sdw + off3)
    line3 = smoothstep(0.2 * w0 + 0.6, 0.2 * w0 - 0.6, d3) * smoothstep(0.25, 0.6, vnoise(h, w, max(5, 0.1 * u), Sb + 34)) * 0.45 * char_tex
    lines = blur(np.clip(line + line2 + line3, 0, 1), 0.55)

    # premultiplied "over": fill+smears, then charcoal lines
    a1 = np.clip(np.maximum(fill, smear_a), 0, 1)
    Pc = col_out * a1[..., None]; Pa = a1
    a2 = lines
    Pc = CHARCOAL * a2[..., None] + Pc * (1 - a2[..., None]); Pa = a2 + Pa * (1 - a2)
    rgb = Pc / np.maximum(Pa, 1e-5)[..., None]
    out[y0:y1, x0:x1, :3] = np.clip(rgb, 0, 1)
    out[y0:y1, x0:x1, 3] = np.clip(Pa, 0, 1)
    return out


def figure_layer(prefix, u1, ss=2, ids=None, **kw):
    """load <prefix>_id/_normal/_depth .npy rendered at ss x resolution; u1 = figure height in px at 1x.
    ids: optional set of object indices to include (to paint one figure out of several). Returns RGBA at 1x."""
    idm = np.load(prefix + '_id.npy'); nm = np.load(prefix + '_normal.npy'); dm = np.load(prefix + '_depth.npy')
    fid = np.rint(idm[..., 0]).astype(np.int32) * (idm[..., 3] > 0.5)
    if ids is not None:
        fid = np.where(np.isin(fid, list(ids)), fid, 0)
    lay = paint_figure(fid, nm[..., :3], dm[..., 0], u1 * ss, **kw)
    if ss != 1:
        H, W = fid.shape
        lay = premul_resize(lay, W // ss, H // ss)
    return lay


def premul_resize(rgba, w, h):
    p = rgba.copy(); p[..., :3] *= p[..., 3:4]
    p = cv2.resize(p, (w, h), interpolation=cv2.INTER_AREA)
    a = p[..., 3:4]
    p[..., :3] = np.where(a > 1e-5, p[..., :3] / np.maximum(a, 1e-5), 0)
    return p


def fig_u(prefix, scale=1.0):
    """figure height in px at 1x from the depth pass + camera meta"""
    import json
    meta = json.load(open(prefix + '.meta.json'))
    d = np.load(prefix + '_depth.npy'); m = d[..., 3] > 0.5
    if meta.get('ortho'):
        return 2.0 * scale * meta['w'] / meta['ortho']
    return meta['fpx'] * 2.0 * scale / np.median(d[..., 0][m])
