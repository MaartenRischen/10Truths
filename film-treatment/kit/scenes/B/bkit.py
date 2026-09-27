# Direction B "Human-sized" - shared Blender/Cycles kit.
# Units: metres. A painter's manikin is 0.30 m tall (rig units x 0.15).
import bpy, bmesh, math, random, os, sys, json, time
from mathutils import Vector, Matrix, Euler, noise
import numpy as np

ROOT = '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad'
KIT = ROOT + '/kit'
HERE = KIT + '/scenes/B'
WORK = ROOT + '/work/B'
OUT = ROOT + '/sb/opt-B'
GLB = WORK + '/glb'
MS = 0.15  # rig unit -> metres
sys.path.insert(0, HERE)
import poses as P

os.makedirs(WORK, exist_ok=True); os.makedirs(OUT, exist_ok=True)

def args():
    """CLI: --test (480x270/16spp) | --res WxH --spp N --out path"""
    a = sys.argv
    o = {'test': '--test' in a, 'res': None, 'spp': None, 'out': None, 'hero': '--hero' in a}
    for i, t in enumerate(a):
        if t == '--res': o['res'] = tuple(int(x) for x in a[i + 1].split('x'))
        if t == '--spp': o['spp'] = int(a[i + 1])
        if t == '--out': o['out'] = a[i + 1]
    return o

# ------------------------------------------------------------------ scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    cy = sc.cycles
    cy.device = 'CPU'
    cy.use_denoising = True
    cy.denoiser = 'OPENIMAGEDENOISE'
    try:
        cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
        cy.denoising_prefilter = 'ACCURATE'
        cy.denoising_quality = 'HIGH'
    except Exception:
        pass
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.015
    cy.use_light_tree = True
    cy.max_bounces = 6; cy.diffuse_bounces = 2; cy.glossy_bounces = 2
    cy.transmission_bounces = 4; cy.volume_bounces = 0; cy.transparent_max_bounces = 4
    if os.environ.get('BOUNCE'):
        b = int(os.environ['BOUNCE']); cy.max_bounces = b + 2; cy.diffuse_bounces = b; cy.glossy_bounces = b
    cy.sample_clamp_indirect = 6.0
    cy.blur_glossy = 1.0
    cy.caustics_reflective = False; cy.caustics_refractive = False
    cy.film_exposure = 1.0
    sc.render.threads_mode = 'FIXED'; sc.render.threads = 4
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_depth = '16'
    sc.render.film_transparent = False
    w = bpy.data.worlds.new('World'); sc.world = w
    set_world((0.0, 0.0, 0.0), 0.0)
    return sc

def set_world(col, strength):
    w = bpy.context.scene.world
    nt = w.node_tree if w.node_tree else None
    if nt is None:
        w.use_nodes = True; nt = w.node_tree
    bg = nt.nodes.get('Background')
    if bg is None:
        nt.nodes.clear(); bg = nt.nodes.new('ShaderNodeBackground'); o = nt.nodes.new('ShaderNodeOutputWorld')
        nt.links.new(bg.outputs[0], o.inputs[0])
    bg.inputs['Color'].default_value = (*col, 1)
    bg.inputs['Strength'].default_value = strength

WB = 4300.0
def kelv_wb(t, wb=None):
    a = kelvin(t); b = kelvin(wb or WB)
    c = [x / y for x, y in zip(a, b)]; m = max(c)
    return tuple(x / m for x in c)

def kelvin(t):
    """approx blackbody -> linear rgb (normalized)"""
    t = t / 100.0
    if t <= 66: r = 255
    else: r = 329.698727446 * ((t - 60) ** -0.1332047592)
    if t <= 66: g = 99.4708025861 * math.log(t) - 161.1195681661
    else: g = 288.1221695283 * ((t - 60) ** -0.0755148492)
    if t >= 66: b = 255
    elif t <= 19: b = 0
    else: b = 138.5177312231 * math.log(t - 10) - 305.0447927307
    c = [max(0, min(255, x)) / 255 for x in (r, g, b)]
    c = [x ** 2.2 for x in c]
    m = max(c)
    return tuple(x / m for x in c)

# ------------------------------------------------------------------ node helper
def mat_new(name):
    m = bpy.data.materials.get(name)
    if m: return m, None
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    return m, nt

def N(nt, typ, x=0, y=0, **inp):
    n = nt.nodes.new(typ); n.location = (x, y)
    for k, v in inp.items():
        if k.startswith('p_'):
            setattr(n, k[2:], v)
        else:
            key = k.replace('_', ' ')
            if key in n.inputs:
                n.inputs[key].default_value = v
            else:
                n.inputs[k].default_value = v
    return n

def L(nt, a, b):
    nt.links.new(a, b)

def out_node(nt, shader):
    o = nt.nodes.new('ShaderNodeOutputMaterial'); o.location = (1200, 0)
    L(nt, shader, o.inputs['Surface'])
    return o

def principled(nt, **kw):
    p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.location = (800, 0)
    for k, v in kw.items():
        p.inputs[k.replace('_', ' ')].default_value = v
    return p

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1.0,)

def ramp(nt, stops, x=400, y=0):
    r = nt.nodes.new('ShaderNodeValToRGB'); r.location = (x, y)
    el = r.color_ramp.elements
    while len(el) > 1: el.remove(el[-1])
    el[0].position = stops[0][0]; el[0].color = stops[0][1]
    for pos, col in stops[1:]:
        e = el.new(pos); e.color = col
    return r

def simple(name, col, rough=0.5, metal=0.0, **kw):
    m, nt = mat_new(name)
    if nt is None: return m
    p = principled(nt, Base_Color=col if len(col) == 4 else (*col, 1), Roughness=rough, Metallic=metal)
    for k, v in kw.items(): p.inputs[k.replace('_', ' ')].default_value = v
    out_node(nt, p.outputs[0])
    return m

# ------------------------------------------------------------------ materials
def mat_beech_manikin():
    """Pale beech with fine straight grain following each turned part (attribute gco = part-local metres,
    rings around local Z = turning axis), per-part tone (attribute pr), ray flecks, satin lacquer."""
    m, nt = mat_new('beech_manikin')
    if nt is None: return m
    gco = N(nt, 'ShaderNodeAttribute', -1400, 0, p_attribute_name='gco')
    pr = N(nt, 'ShaderNodeAttribute', -1400, -300, p_attribute_name='pr')
    # per-part offset of the growth-ring centre (so every part shows a different figure)
    off = N(nt, 'ShaderNodeCombineXYZ', -1200, -300)
    mx = N(nt, 'ShaderNodeMath', -1300, -250, p_operation='MULTIPLY'); L(nt, pr.outputs['Fac'], mx.inputs[0]); mx.inputs[1].default_value = 0.35
    my = N(nt, 'ShaderNodeMath', -1300, -350, p_operation='MULTIPLY_ADD'); L(nt, pr.outputs['Fac'], my.inputs[0]); my.inputs[1].default_value = -0.21; my.inputs[2].default_value = 0.09
    L(nt, mx.outputs[0], off.inputs[0]); L(nt, my.outputs[0], off.inputs[1])
    # domain warp for gentle grain drift
    nz = N(nt, 'ShaderNodeTexNoise', -1200, 200, Scale=60.0, Detail=3.0, Roughness=0.5)
    L(nt, gco.outputs['Vector'], nz.inputs['Vector'])
    nzc = N(nt, 'ShaderNodeVectorMath', -1000, 200, p_operation='SUBTRACT'); L(nt, nz.outputs['Color'], nzc.inputs[0]); nzc.inputs[1].default_value = (0.5, 0.5, 0.5)
    nzs = N(nt, 'ShaderNodeVectorMath', -850, 200, p_operation='SCALE'); L(nt, nzc.outputs[0], nzs.inputs[0]); nzs.inputs['Scale'].default_value = 0.0035
    p1 = N(nt, 'ShaderNodeVectorMath', -850, 0, p_operation='ADD'); L(nt, gco.outputs['Vector'], p1.inputs[0]); L(nt, off.outputs[0], p1.inputs[1])
    p2 = N(nt, 'ShaderNodeVectorMath', -700, 0, p_operation='ADD'); L(nt, p1.outputs[0], p2.inputs[0]); L(nt, nzs.outputs[0], p2.inputs[1])
    sep = N(nt, 'ShaderNodeSeparateXYZ', -550, 0); L(nt, p2.outputs[0], sep.inputs[0])
    # ring radius around Z axis
    xx = N(nt, 'ShaderNodeMath', -400, 60, p_operation='MULTIPLY'); L(nt, sep.outputs[0], xx.inputs[0]); L(nt, sep.outputs[0], xx.inputs[1])
    yy = N(nt, 'ShaderNodeMath', -400, -60, p_operation='MULTIPLY'); L(nt, sep.outputs[1], yy.inputs[0]); L(nt, sep.outputs[1], yy.inputs[1])
    rr = N(nt, 'ShaderNodeMath', -250, 0, p_operation='ADD'); L(nt, xx.outputs[0], rr.inputs[0]); L(nt, yy.outputs[0], rr.inputs[1])
    r = N(nt, 'ShaderNodeMath', -100, 0, p_operation='SQRT'); L(nt, rr.outputs[0], r.inputs[0])
    # rings: ~1.4 mm spacing, sharpened late-wood lines
    rs = N(nt, 'ShaderNodeMath', 50, 0, p_operation='MULTIPLY'); L(nt, r.outputs[0], rs.inputs[0]); rs.inputs[1].default_value = 1.0 / 0.0014
    ph = N(nt, 'ShaderNodeMath', 50, -120, p_operation='MULTIPLY'); L(nt, pr.outputs['Fac'], ph.inputs[0]); ph.inputs[1].default_value = 7.0
    rs2 = N(nt, 'ShaderNodeMath', 200, 0, p_operation='ADD'); L(nt, rs.outputs[0], rs2.inputs[0]); L(nt, ph.outputs[0], rs2.inputs[1])
    fr = N(nt, 'ShaderNodeMath', 350, 0, p_operation='FRACT'); L(nt, rs2.outputs[0], fr.inputs[0])
    # asymmetric ring profile: sharp late-wood edge
    pw = N(nt, 'ShaderNodeMath', 500, 0, p_operation='POWER'); L(nt, fr.outputs[0], pw.inputs[0]); pw.inputs[1].default_value = 3.0
    # fine fibre streaks along Z
    fib = N(nt, 'ShaderNodeTexNoise', 200, -300, Detail=2.0, Roughness=0.6)
    fsc = N(nt, 'ShaderNodeMapping', 50, -300)
    fsc.inputs['Scale'].default_value = (1400, 1400, 60)
    L(nt, p2.outputs[0], fsc.inputs['Vector']); L(nt, fsc.outputs[0], fib.inputs['Vector'])
    # broad colour streaks (figure) along the part
    stk = N(nt, 'ShaderNodeTexNoise', 200, -800, Detail=1.0, Roughness=0.4)
    ssc = N(nt, 'ShaderNodeMapping', 50, -800); ssc.inputs['Scale'].default_value = (160, 160, 12)
    L(nt, p2.outputs[0], ssc.inputs['Vector']); L(nt, ssc.outputs[0], stk.inputs['Vector'])
    # ray flecks: small short dark streaks
    vor = N(nt, 'ShaderNodeTexVoronoi', 200, -520, p_feature='F1')
    vsc = N(nt, 'ShaderNodeMapping', 50, -520); vsc.inputs['Scale'].default_value = (900, 900, 260)
    L(nt, p2.outputs[0], vsc.inputs['Vector']); L(nt, vsc.outputs[0], vor.inputs['Vector'])
    fl = N(nt, 'ShaderNodeMapRange', 400, -520, From_Min=0.0, From_Max=0.10, To_Min=1.0, To_Max=0.0)
    L(nt, vor.outputs['Distance'], fl.inputs['Value'])
    # combine into grain factor
    g1 = N(nt, 'ShaderNodeMath', 650, 0, p_operation='MULTIPLY'); L(nt, pw.outputs[0], g1.inputs[0]); g1.inputs[1].default_value = 0.78
    g2 = N(nt, 'ShaderNodeMath', 650, -300, p_operation='MULTIPLY_ADD'); L(nt, fib.outputs['Fac'], g2.inputs[0]); g2.inputs[1].default_value = 0.4; g2.inputs[2].default_value = -0.14
    g3 = N(nt, 'ShaderNodeMath', 800, -150, p_operation='ADD'); L(nt, g1.outputs[0], g3.inputs[0]); L(nt, g2.outputs[0], g3.inputs[1])
    g3b = N(nt, 'ShaderNodeMath', 850, -450, p_operation='MULTIPLY_ADD'); L(nt, stk.outputs['Fac'], g3b.inputs[0]); g3b.inputs[1].default_value = 0.45; L(nt, g3.outputs[0], g3b.inputs[2])
    g3c = N(nt, 'ShaderNodeMath', 900, -520, p_operation='SUBTRACT'); L(nt, g3b.outputs[0], g3c.inputs[0]); g3c.inputs[1].default_value = 0.2
    g4 = N(nt, 'ShaderNodeMath', 950, -300, p_operation='MULTIPLY_ADD'); L(nt, fl.outputs[0], g4.inputs[0]); g4.inputs[1].default_value = 0.3; L(nt, g3c.outputs[0], g4.inputs[2])
    g4.use_clamp = True
    col = ramp(nt, [(0.0, srgb('#f0dcba')), (0.35, srgb('#e0c197')), (0.7, srgb('#c19368')), (1.0, srgb('#9a6a40'))], 1100, 0)
    L(nt, g4.outputs[0], col.inputs[0])
    # per-part tone variation (hue/value)
    tone = ramp(nt, [(0.0, srgb('#f3dcc0')), (0.5, srgb('#ffffff')), (1.0, srgb('#e6c9a3'))], 1100, -300)
    L(nt, pr.outputs['Fac'], tone.inputs[0])
    mul = N(nt, 'ShaderNodeMix', 1350, 0, p_data_type='RGBA', p_blend_type='MULTIPLY', Factor=1.0)
    L(nt, col.outputs[0], mul.inputs[6]); L(nt, tone.outputs[0], mul.inputs[7])
    # roughness & bump
    rgh = N(nt, 'ShaderNodeMapRange', 1100, -600, To_Min=0.42, To_Max=0.62); L(nt, g4.outputs[0], rgh.inputs['Value'])
    # micro dents / sanding marks on top of the grain
    dn = N(nt, 'ShaderNodeTexNoise', 1100, -900, Scale=2500.0, Detail=2.0)
    L(nt, gco.outputs['Vector'], dn.inputs['Vector'])
    hsum = N(nt, 'ShaderNodeMath', 1250, -800, p_operation='MULTIPLY_ADD'); L(nt, dn.outputs['Fac'], hsum.inputs[0]); hsum.inputs[1].default_value = 0.35; L(nt, g4.outputs[0], hsum.inputs[2])
    bmp = N(nt, 'ShaderNodeBump', 1400, -700, Strength=0.10, Distance=0.0003)
    L(nt, hsum.outputs[0], bmp.inputs['Height'])
    p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.location = (1600, 0)
    L(nt, mul.outputs[2], p.inputs['Base Color'])
    L(nt, rgh.outputs[0], p.inputs['Roughness'])
    L(nt, bmp.outputs[0], p.inputs['Normal'])
    p.inputs['Coat Weight'].default_value = 0.4
    p.inputs['Coat Roughness'].default_value = 0.18
    p.inputs['Coat Tint'].default_value = srgb('#fff1dc')
    p.inputs['Specular IOR Level'].default_value = 0.45
    p.inputs['Sheen Weight'].default_value = 0.08
    p.inputs['Sheen Tint'].default_value = srgb('#ffe2c0')
    o = nt.nodes.new('ShaderNodeOutputMaterial'); o.location = (1900, 0)
    L(nt, p.outputs[0], o.inputs['Surface'])
    return m

def mat_pin():
    return simple('pin_steel', (0.62, 0.60, 0.57), rough=0.28, metal=1.0)

def wood_generic(name, light, mid, dark, ring=0.0025, stretch=(1, 1, 18), rough=(0.45, 0.65), coat=0.1,
                 axis='X', warp=0.004, bump=0.08, planks=0, scale=1.0, dirt=0.0):
    """Wood for props, using object coords. Grain runs along `axis`."""
    m, nt = mat_new(name)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -1500, 0)
    src = tc.outputs['Object']
    # rotate so that grain axis -> Z
    mp = N(nt, 'ShaderNodeMapping', -1350, 0)
    if axis == 'X': mp.inputs['Rotation'].default_value = (0, math.radians(90), 0)
    elif axis == 'Y': mp.inputs['Rotation'].default_value = (math.radians(90), 0, 0)
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    L(nt, src, mp.inputs['Vector'])
    nz = N(nt, 'ShaderNodeTexNoise', -1200, 200, Scale=35.0, Detail=3.0)
    L(nt, mp.outputs[0], nz.inputs['Vector'])
    nzc = N(nt, 'ShaderNodeVectorMath', -1050, 200, p_operation='SUBTRACT'); L(nt, nz.outputs['Color'], nzc.inputs[0]); nzc.inputs[1].default_value = (0.5, 0.5, 0.5)
    nzs = N(nt, 'ShaderNodeVectorMath', -900, 200, p_operation='SCALE'); L(nt, nzc.outputs[0], nzs.inputs[0]); nzs.inputs['Scale'].default_value = warp
    off = N(nt, 'ShaderNodeVectorMath', -900, 0, p_operation='ADD'); L(nt, mp.outputs[0], off.inputs[0]); off.inputs[1].default_value = (0.23, -0.31, 0.0)
    p2 = N(nt, 'ShaderNodeVectorMath', -750, 0, p_operation='ADD'); L(nt, off.outputs[0], p2.inputs[0]); L(nt, nzs.outputs[0], p2.inputs[1])
    sep = N(nt, 'ShaderNodeSeparateXYZ', -600, 0); L(nt, p2.outputs[0], sep.inputs[0])
    xx = N(nt, 'ShaderNodeMath', -450, 60, p_operation='MULTIPLY'); L(nt, sep.outputs[0], xx.inputs[0]); L(nt, sep.outputs[0], xx.inputs[1])
    yy = N(nt, 'ShaderNodeMath', -450, -60, p_operation='MULTIPLY'); L(nt, sep.outputs[1], yy.inputs[0]); L(nt, sep.outputs[1], yy.inputs[1])
    rr = N(nt, 'ShaderNodeMath', -300, 0, p_operation='ADD'); L(nt, xx.outputs[0], rr.inputs[0]); L(nt, yy.outputs[0], rr.inputs[1])
    r = N(nt, 'ShaderNodeMath', -150, 0, p_operation='SQRT'); L(nt, rr.outputs[0], r.inputs[0])
    rs = N(nt, 'ShaderNodeMath', 0, 0, p_operation='MULTIPLY'); L(nt, r.outputs[0], rs.inputs[0]); rs.inputs[1].default_value = 1.0 / ring
    if planks:
        # per-plank phase: floor(x / plank width)
        pf = N(nt, 'ShaderNodeMath', -300, -250, p_operation='DIVIDE'); L(nt, sep.outputs[1], pf.inputs[0]); pf.inputs[1].default_value = planks
        pfl = N(nt, 'ShaderNodeMath', -150, -250, p_operation='FLOOR'); L(nt, pf.outputs[0], pfl.inputs[0])
        wn = N(nt, 'ShaderNodeTexWhiteNoise', 0, -250, p_noise_dimensions='1D'); L(nt, pfl.outputs[0], wn.inputs['W'])
        ph = N(nt, 'ShaderNodeMath', 100, -150, p_operation='MULTIPLY'); L(nt, wn.outputs['Value'], ph.inputs[0]); ph.inputs[1].default_value = 37.0
        rs2 = N(nt, 'ShaderNodeMath', 150, 0, p_operation='ADD'); L(nt, rs.outputs[0], rs2.inputs[0]); L(nt, ph.outputs[0], rs2.inputs[1]); rs = rs2
    fr = N(nt, 'ShaderNodeMath', 300, 0, p_operation='FRACT'); L(nt, rs.outputs[0], fr.inputs[0])
    pw = N(nt, 'ShaderNodeMath', 450, 0, p_operation='POWER'); L(nt, fr.outputs[0], pw.inputs[0]); pw.inputs[1].default_value = 4.0
    fib = N(nt, 'ShaderNodeTexNoise', 300, -300, Detail=2.0)
    fsc = N(nt, 'ShaderNodeMapping', 150, -300); fsc.inputs['Scale'].default_value = (900 * stretch[0], 900 * stretch[1], 900 / stretch[2])
    L(nt, p2.outputs[0], fsc.inputs['Vector']); L(nt, fsc.outputs[0], fib.inputs['Vector'])
    g1 = N(nt, 'ShaderNodeMath', 600, 0, p_operation='MULTIPLY'); L(nt, pw.outputs[0], g1.inputs[0]); g1.inputs[1].default_value = 0.6
    g2 = N(nt, 'ShaderNodeMath', 600, -300, p_operation='MULTIPLY_ADD'); L(nt, fib.outputs['Fac'], g2.inputs[0]); g2.inputs[1].default_value = 0.4; g2.inputs[2].default_value = -0.15
    g3 = N(nt, 'ShaderNodeMath', 750, -150, p_operation='ADD'); L(nt, g1.outputs[0], g3.inputs[0]); L(nt, g2.outputs[0], g3.inputs[1]); g3.use_clamp = True
    col = ramp(nt, [(0.0, light), (0.45, mid), (1.0, dark)], 900, 0)
    L(nt, g3.outputs[0], col.inputs[0])
    colout = col.outputs[0]
    if planks:
        # plank tone variation
        tv = ramp(nt, [(0.0, (0.82, 0.8, 0.78, 1)), (1.0, (1.08, 1.04, 1.0, 1))], 900, -500)
        L(nt, wn.outputs['Value'], tv.inputs[0])
        mm = N(nt, 'ShaderNodeMix', 1150, 0, p_data_type='RGBA', p_blend_type='MULTIPLY', Factor=1.0)
        L(nt, colout, mm.inputs[6]); L(nt, tv.outputs[0], mm.inputs[7]); colout = mm.outputs[2]
    if dirt > 0:
        dn = N(nt, 'ShaderNodeTexNoise', 900, -700, Scale=6.0, Detail=6.0, Roughness=0.65)
        L(nt, tc.outputs['Object'], dn.inputs['Vector'])
        dr = N(nt, 'ShaderNodeMapRange', 1050, -700, From_Min=0.45, From_Max=0.75, To_Min=0.0, To_Max=dirt)
        L(nt, dn.outputs['Fac'], dr.inputs['Value'])
        md = N(nt, 'ShaderNodeMix', 1300, -100, p_data_type='RGBA', p_blend_type='MULTIPLY')
        L(nt, dr.outputs[0], md.inputs['Factor']); L(nt, colout, md.inputs[6]); md.inputs[7].default_value = (0.55, 0.5, 0.45, 1)
        colout = md.outputs[2]
    rgh = N(nt, 'ShaderNodeMapRange', 900, -350, To_Min=rough[0], To_Max=rough[1]); L(nt, g3.outputs[0], rgh.inputs['Value'])
    bmp = N(nt, 'ShaderNodeBump', 1100, -450, Strength=bump, Distance=0.0005); L(nt, g3.outputs[0], bmp.inputs['Height'])
    p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.location = (1500, 0)
    L(nt, colout, p.inputs['Base Color']); L(nt, rgh.outputs[0], p.inputs['Roughness']); L(nt, bmp.outputs[0], p.inputs['Normal'])
    p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = 0.3
    o = nt.nodes.new('ShaderNodeOutputMaterial'); o.location = (1800, 0); L(nt, p.outputs[0], o.inputs['Surface'])
    return m

def mat_walnut():
    return wood_generic('walnut', srgb('#6b4a33'), srgb('#553725'), srgb('#2e1d13'), ring=0.004, rough=(0.32, 0.5),
                        coat=0.35, axis='X', warp=0.012, bump=0.05, planks=0.14, dirt=0.25)

def mat_beech_prop(name='beech_prop', axis='Z'):
    return wood_generic(name, srgb('#e6c79c'), srgb('#d9b486'), srgb('#b78a5c'), ring=0.0016, rough=(0.45, 0.62),
                        coat=0.12, axis=axis, warp=0.003, bump=0.1)

def mat_oak_bench():
    return wood_generic('oak_bench', srgb('#b38a5e'), srgb('#9a7148'), srgb('#5e4128'), ring=0.003, rough=(0.5, 0.75),
                        coat=0.05, axis='X', warp=0.015, bump=0.15, planks=0.16, dirt=0.5)

# ------------------------------------------------------------------ manikin
_manikin_cache = {}
JOINTS = {}

def manikin_mesh(pose_name):
    """Import pose GLB, bake part-local grain coords, join, scale to metres. Returns mesh datablock (cached)."""
    if pose_name in _manikin_cache: return _manikin_cache[pose_name]
    path = P.glb_for(pose_name, KIT, GLB)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    new_names = [o.name for o in new]
    bpy.context.view_layer.update()
    meshes = [o for o in new if o.type == 'MESH']
    S = Matrix.Scale(MS, 4)
    JOINTS[pose_name] = {o.name.split('.')[0]: (S @ o.matrix_world.copy()) for o in new if o.type == 'EMPTY'}
    rng = random.Random(hash(pose_name) & 0xffff)
    for i, o in enumerate(meshes):
        o.data = o.data.copy()
        me = o.data
        s = o.matrix_world.to_scale()
        n = len(me.vertices)
        co = np.zeros(n * 3, dtype=np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        co = co * np.array([s.x, s.y, s.z], dtype=np.float32) * MS
        a = me.attributes.new('gco', 'FLOAT_VECTOR', 'POINT'); a.data.foreach_set('vector', co.ravel())
        b = me.attributes.new('pr', 'FLOAT', 'POINT'); b.data.foreach_set('value', np.full(n, (i * 0.618 + rng.random() * 0.3) % 1.0, dtype=np.float32))
    # join
    for o in meshes:
        o.data.transform(o.matrix_world)
    # new object holding everything
    bm = bmesh.new()
    target = bpy.data.meshes.new('manikin_' + pose_name)
    ctx_objs = []
    for o in meshes:
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
    with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes, selected_objects=meshes):
        bpy.ops.object.join()
    j = meshes[0]
    me = j.data
    me.transform(Matrix.Scale(MS, 4))
    me.name = 'manikin_' + pose_name
    # materials
    beech = mat_beech_manikin(); pin = mat_pin()
    for i, s in enumerate(me.materials):
        nm = s.name if s else ''
        me.materials[i] = pin if nm.startswith('Material') else beech
    for p in me.polygons: p.use_smooth = True
    me.use_fake_user = True
    # remove imported objects
    for nm in new_names:
        o = bpy.data.objects.get(nm)
        if o is not None:
            bpy.data.objects.remove(o, do_unlink=True)
    for mm in list(bpy.data.materials):
        if mm.users == 0: bpy.data.materials.remove(mm)
    _manikin_cache[pose_name] = me
    return me

def jpos(obj, joint, local=(0, 0, 0)):
    """world position of a manikin joint (+ local offset in metres, joint frame; hand runs along local -Z?)."""
    pose_name = obj.get('pose')
    M = JOINTS[pose_name][joint]
    return obj.matrix_world @ (M @ Vector(local))

def jmat(obj, joint):
    return obj.matrix_world @ JOINTS[obj.get('pose')][joint]

def add_obj(name, data, coll=None):
    o = bpy.data.objects.new(name, data)
    (coll or bpy.context.scene.collection).objects.link(o)
    return o

def manikin(pose_name, pos=(0, 0, 0), face=None, rot=0.0, coll=None, scale=1.0, tilt=(0, 0)):
    """Place a manikin. face=(x,y) point to face towards, or rot = heading in degrees (0 = facing -Y)."""
    me = manikin_mesh(pose_name)
    o = add_obj('M_' + pose_name, me, coll)
    o['pose'] = pose_name
    if face is not None:
        dx, dy = face[0] - pos[0], face[1] - pos[1]
        th = math.atan2(dx, -dy)
    else:
        th = math.radians(rot)
    o.rotation_euler = (math.radians(tilt[0]), math.radians(tilt[1]), th)
    o.location = pos
    o.scale = (scale, scale, scale)
    return o

# ------------------------------------------------------------------ camera / lights
def camera(loc, target, lens=100, fstop=2.8, focus=None, sensor=36, shift=(0, 0), roll=0.0, name='Cam'):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens; cd.sensor_width = sensor; cd.sensor_fit = 'HORIZONTAL'
    cd.shift_x, cd.shift_y = shift
    cd.clip_start = 0.005; cd.clip_end = 200
    c = add_obj(name, cd)
    c.location = loc
    d = Vector(target) - Vector(loc)
    c.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if roll: c.rotation_euler.rotate_axis('Z', math.radians(roll))
    cd.dof.use_dof = fstop is not None
    if fstop:
        cd.dof.aperture_fstop = fstop
        cd.dof.aperture_blades = 7
        cd.dof.aperture_rotation = math.radians(12)
        if focus is None: focus = target
        if isinstance(focus, (int, float)):
            cd.dof.focus_distance = focus
        else:
            cd.dof.focus_distance = (Vector(focus) - Vector(loc)).length
    bpy.context.scene.camera = c
    return c

def light(kind, loc, target=None, energy=10, color=(1, 1, 1), size=0.05, spot=45, blend=0.3, name=None, kelv=None):
    ld = bpy.data.lights.new(name or kind, kind)
    ld.energy = energy
    if kelv: color = kelv_wb(kelv)
    ld.color = color[:3]
    if kind in ('POINT', 'SPOT'): ld.shadow_soft_size = size
    if kind == 'SPOT': ld.spot_size = math.radians(spot); ld.spot_blend = blend
    if kind == 'AREA':
        ld.shape = 'RECTANGLE' if isinstance(size, (tuple, list)) else 'DISK'
        if isinstance(size, (tuple, list)): ld.size, ld.size_y = size
        else: ld.size = size
    if kind == 'SUN': ld.angle = math.radians(size)
    o = add_obj(name or kind, ld)
    o.location = loc
    if target is not None:
        d = Vector(target) - Vector(loc)
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o

def haze(center, size, density=0.02, color=(1, 1, 1), aniso=0.35, name='haze'):
    if density <= 0: return None
    me = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    o = add_obj(name, me); o.location = center; o.scale = size
    m, nt = mat_new(name + '_mat')
    if nt is not None:
        vs = nt.nodes.new('ShaderNodeVolumePrincipled')
        vs.inputs['Density'].default_value = density
        vs.inputs['Color'].default_value = (*color, 1)
        vs.inputs['Anisotropy'].default_value = aniso
        o2 = nt.nodes.new('ShaderNodeOutputMaterial'); L(nt, vs.outputs[0], o2.inputs['Volume'])
    me.materials.append(m)
    o.visible_shadow = False
    return o

# ------------------------------------------------------------------ render
def render(path, res=(1280, 720), spp=64, test=False, adaptive=0.015):
    sc = bpy.context.scene
    if test:
        res = (480, 270); spp = 16
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.cycles.samples = spp
    sc.cycles.adaptive_threshold = adaptive
    sc.cycles.adaptive_min_samples = min(16, spp)
    sc.render.filepath = path
    import resource
    t = time.time(); c0 = resource.getrusage(resource.RUSAGE_SELF).ru_utime
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t; cpu = resource.getrusage(resource.RUSAGE_SELF).ru_utime - c0
    print(f'RENDERED {path} {res} spp={spp} in {dt:.1f}s wall, {cpu:.1f} cpu-s', flush=True)
    return dt

def post(path, out=None, **kw):
    """Lens/film finish via system python (PIL lives there)."""
    import subprocess
    cmd = ['python3', HERE + '/post.py', path, out or path, json.dumps(kw)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print('POST FAILED', r.stdout, r.stderr)
    return out or path

def dark_fog(center, size, density=0.15, name='darkfog'):
    """absorption-only volume: things recede into darkness (cheap: no scattering)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    o = add_obj(name, me); o.location = center; o.scale = size
    m, nt = mat_new(name + '_mat')
    if nt is not None:
        va = nt.nodes.new('ShaderNodeVolumeAbsorption')
        va.inputs['Density'].default_value = density
        va.inputs['Color'].default_value = (0.0, 0.0, 0.0, 1)
        o2 = nt.nodes.new('ShaderNodeOutputMaterial'); L(nt, va.outputs[0], o2.inputs['Volume'])
    me.materials.append(m)
    o.visible_shadow = False
    return o
