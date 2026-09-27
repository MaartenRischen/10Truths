# Direction B: procedural miniature-set kit (ancestral world + shared studio pieces).
from bkit import *
from mathutils import noise as mnoise

# ------------------------------------------------------------------ mesh helpers
def mesh_from(name, verts, faces, attrs=None, smooth=True, mat=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    if attrs:
        for an, (dom, typ, vals) in attrs.items():
            a = me.attributes.new(an, typ, dom)
            if typ == 'FLOAT': a.data.foreach_set('value', np.asarray(vals, dtype=np.float32).ravel())
            elif typ == 'FLOAT_VECTOR': a.data.foreach_set('vector', np.asarray(vals, dtype=np.float32).ravel())
            elif typ == 'FLOAT_COLOR': a.data.foreach_set('color', np.asarray(vals, dtype=np.float32).ravel())
    if smooth:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    if mat: me.materials.append(mat)
    return me

def tube_path(pts, radii, sides=6, cap=True):
    """Return verts, faces of a tube through pts (list of Vector) with per-point radii."""
    verts, faces = [], []
    n = len(pts)
    prev_side = None
    for i, p in enumerate(pts):
        if i == 0: t = (pts[1] - pts[0])
        elif i == n - 1: t = (pts[-1] - pts[-2])
        else: t = (pts[i + 1] - pts[i - 1])
        t.normalize()
        if prev_side is None:
            a = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            side = t.cross(a).normalized()
        else:
            side = (prev_side - t * prev_side.dot(t)).normalized()
        prev_side = side
        up = t.cross(side).normalized()
        r = radii[i] if hasattr(radii, '__len__') else radii
        for k in range(sides):
            a = 2 * math.pi * k / sides
            verts.append(p + (side * math.cos(a) + up * math.sin(a)) * r)
    for i in range(n - 1):
        for k in range(sides):
            a = i * sides + k; b = i * sides + (k + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    if cap:
        c0 = len(verts); verts.append(pts[0].copy())
        c1 = len(verts); verts.append(pts[-1].copy())
        for k in range(sides):
            faces.append((c0, (k + 1) % sides, k))
            faces.append((c1, (n - 1) * sides + k, (n - 1) * sides + (k + 1) % sides))
    return verts, faces

def merge_parts(parts):
    V, F = [], []
    for v, f in parts:
        o = len(V); V.extend(v); F.extend([tuple(i + o for i in ff) for ff in f])
    return V, F

def rock_mesh(name, seed, r=0.01, squash=(1, 1, 0.7), rough=0.35, subdiv=2, mat=None):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    off = Vector((seed * 1.7, seed * 3.1, seed * 0.7))
    for v in bm.verts:
        d = v.co.normalized()
        n = mnoise.fractal(d * 1.6 + off, 0.5, 2.0, 3)
        v.co = d * (1 + rough * n)
        v.co.x *= squash[0]; v.co.y *= squash[1]; v.co.z *= squash[2]
        v.co *= r
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    if mat: me.materials.append(mat)
    return me

def cyl_mesh(name, r, h, seg=48, mat=None, bevel=0.0, z0=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2 + z0))
    if bevel > 0:
        edges = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6 and e.verts[0].co.z > h * 0.5 + z0]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=3, profile=0.5, affect='EDGES')
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = len(p.vertices) == 4
    if mat: me.materials.append(mat)
    return me

def box_mesh(name, sx, sy, sz, mat=None, bevel=0.0, origin='bottom'):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=bm.verts, vec=(sx, sy, sz))
    if origin == 'bottom': bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, sz / 2))
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, profile=0.5, affect='EDGES')
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if mat: me.materials.append(mat)
    return me

def place(me, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), name=None, coll=None):
    o = add_obj(name or me.name, me, coll)
    o.location = loc; o.rotation_euler = rot
    o.scale = scale if hasattr(scale, '__len__') else (scale, scale, scale)
    return o

# ------------------------------------------------------------------ materials (set)
def mat_earth():
    m, nt = mat_new('earth')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -1200, 0)
    n1 = N(nt, 'ShaderNodeTexNoise', -1000, 200, Scale=9.0, Detail=6.0, Roughness=0.6)
    n2 = N(nt, 'ShaderNodeTexNoise', -1000, -100, Scale=180.0, Detail=4.0, Roughness=0.7)
    vo = N(nt, 'ShaderNodeTexVoronoi', -1000, -400, Scale=420.0)
    for n in (n1, n2, vo): L(nt, tc.outputs['Object'], n.inputs['Vector'])
    ash = N(nt, 'ShaderNodeAttribute', -1000, 500, p_attribute_name='ash')
    col = ramp(nt, [(0.0, srgb('#6e4a2c')), (0.4, srgb('#8f6340')), (0.65, srgb('#a8794c')), (1.0, srgb('#c09a6a'))], -600, 200)
    L(nt, n1.outputs['Fac'], col.inputs[0])
    grit = N(nt, 'ShaderNodeMapRange', -600, -150, From_Min=0.3, From_Max=0.7, To_Min=0.8, To_Max=1.15)
    L(nt, n2.outputs['Fac'], grit.inputs['Value'])
    m1 = N(nt, 'ShaderNodeMix', -300, 200, p_data_type='RGBA', p_blend_type='MULTIPLY', Factor=1.0)
    L(nt, col.outputs[0], m1.inputs[6]); L(nt, grit.outputs[0], m1.inputs[7])
    # ash / soot near fire
    m2 = N(nt, 'ShaderNodeMix', -100, 200, p_data_type='RGBA')
    L(nt, ash.outputs['Fac'], m2.inputs['Factor']); L(nt, m1.outputs[2], m2.inputs[6]); m2.inputs[7].default_value = srgb('#2a2522')
    # sand grains
    gr = N(nt, 'ShaderNodeMapRange', -600, -450, From_Min=0.0, From_Max=0.25, To_Min=1.0, To_Max=0.0)
    L(nt, vo.outputs['Distance'], gr.inputs['Value'])
    hh = N(nt, 'ShaderNodeMath', -300, -300, p_operation='MULTIPLY_ADD'); L(nt, gr.outputs[0], hh.inputs[0]); hh.inputs[1].default_value = 0.5; L(nt, n2.outputs['Fac'], hh.inputs[2])
    bmp = N(nt, 'ShaderNodeBump', 100, -300, Strength=0.35, Distance=0.0006); L(nt, hh.outputs[0], bmp.inputs['Height'])
    p = principled(nt, Roughness=0.92); p.location = (400, 0)
    L(nt, m2.outputs[2], p.inputs['Base Color']); L(nt, bmp.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def mat_jute():
    """dyed jute / paper grass fibres: per-fibre hue (attr fr), darker toward the base (attr ft), translucent."""
    m, nt = mat_new('jute')
    if nt is None: return m
    fr = N(nt, 'ShaderNodeAttribute', -900, 200, p_attribute_name='fr')
    ft = N(nt, 'ShaderNodeAttribute', -900, -100, p_attribute_name='ft')
    col = ramp(nt, [(0.0, srgb('#c9a35c')), (0.25, srgb('#d8bb7a')), (0.45, srgb('#b98f48')), (0.6, srgb('#e3cf98')),
                    (0.75, srgb('#a88b4a')), (0.88, srgb('#8f8a4e')), (1.0, srgb('#b07a45'))], -600, 200)
    L(nt, fr.outputs['Fac'], col.inputs[0])
    gd = ramp(nt, [(0.0, (0.45, 0.4, 0.33, 1)), (0.35, (0.85, 0.82, 0.78, 1)), (1.0, (1.05, 1.02, 0.96, 1))], -600, -100)
    L(nt, ft.outputs['Fac'], gd.inputs[0])
    mm = N(nt, 'ShaderNodeMix', -300, 100, p_data_type='RGBA', p_blend_type='MULTIPLY', Factor=1.0)
    L(nt, col.outputs[0], mm.inputs[6]); L(nt, gd.outputs[0], mm.inputs[7])
    p = principled(nt, Roughness=0.62); p.location = (0, 100)
    p.inputs['Sheen Weight'].default_value = 0.3
    L(nt, mm.outputs[2], p.inputs['Base Color'])
    tr = N(nt, 'ShaderNodeBsdfTranslucent', 0, -250)
    L(nt, mm.outputs[2], tr.inputs['Color'])
    mix = N(nt, 'ShaderNodeMixShader', 300, 0, Fac=0.38)
    L(nt, p.outputs[0], mix.inputs[1]); L(nt, tr.outputs[0], mix.inputs[2])
    out_node(nt, mix.outputs[0])
    return m

def mat_reed():
    m, nt = mat_new('reed')
    if nt is None: return m
    fr = N(nt, 'ShaderNodeAttribute', -900, 200, p_attribute_name='fr')
    tc = N(nt, 'ShaderNodeTexCoord', -900, -200)
    nz = N(nt, 'ShaderNodeTexNoise', -700, -200, Scale=300.0, Detail=2.0)
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    col = ramp(nt, [(0.0, srgb('#8f6d3e')), (0.3, srgb('#b58e55')), (0.6, srgb('#cba66a')), (0.85, srgb('#d9bd85')), (1.0, srgb('#7a5d38'))], -500, 200)
    L(nt, fr.outputs['Fac'], col.inputs[0])
    b = N(nt, 'ShaderNodeBump', -300, -200, Strength=0.3, Distance=0.0003); L(nt, nz.outputs['Fac'], b.inputs['Height'])
    p = principled(nt, Roughness=0.55); p.location = (0, 0)
    p.inputs['Coat Weight'].default_value = 0.1
    L(nt, col.outputs[0], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    tr = N(nt, 'ShaderNodeBsdfTranslucent', 0, -300); L(nt, col.outputs[0], tr.inputs['Color'])
    mix = N(nt, 'ShaderNodeMixShader', 300, 0, Fac=0.2); L(nt, p.outputs[0], mix.inputs[1]); L(nt, tr.outputs[0], mix.inputs[2])
    out_node(nt, mix.outputs[0])
    return m

def mat_thatch_dark():
    return simple('thatch_dark', srgb('#3a2e1f'), rough=0.95)

def mat_twine():
    return simple('twine', srgb('#6d5434'), rough=0.9, Sheen_Weight=0.4)

def mat_stone():
    m, nt = mat_new('stone')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    n1 = N(nt, 'ShaderNodeTexNoise', -700, 100, Scale=300.0, Detail=6.0)
    L(nt, tc.outputs['Object'], n1.inputs['Vector'])
    oi = N(nt, 'ShaderNodeObjectInfo', -900, 300)
    col = ramp(nt, [(0.0, srgb('#3a3632')), (0.5, srgb('#5c544c')), (1.0, srgb('#7d7163'))], -400, 200)
    mx = N(nt, 'ShaderNodeMath', -600, 250, p_operation='MULTIPLY_ADD'); L(nt, oi.outputs['Random'], mx.inputs[0]); mx.inputs[1].default_value = 0.5; L(nt, n1.outputs['Fac'], mx.inputs[2])
    L(nt, mx.outputs[0], col.inputs[0])
    b = N(nt, 'ShaderNodeBump', -300, -200, Strength=0.4, Distance=0.0005); L(nt, n1.outputs['Fac'], b.inputs['Height'])
    p = principled(nt, Roughness=0.8); p.location = (0, 0)
    L(nt, col.outputs[0], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def mat_stick():
    """twig with charred ends + ember glow near the fire centre (object z / attribute)"""
    m, nt = mat_new('stick')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -1000, 0)
    ch = N(nt, 'ShaderNodeAttribute', -1000, 300, p_attribute_name='char')
    nz = N(nt, 'ShaderNodeTexNoise', -800, -100, Scale=900.0, Detail=3.0)
    L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    bark = ramp(nt, [(0.0, srgb('#3b2a1c')), (0.6, srgb('#5a4430')), (1.0, srgb('#7a5f44'))], -500, 0)
    L(nt, nz.outputs['Fac'], bark.inputs[0])
    mx = N(nt, 'ShaderNodeMix', -200, 100, p_data_type='RGBA')
    L(nt, ch.outputs['Fac'], mx.inputs['Factor']); L(nt, bark.outputs[0], mx.inputs[6]); mx.inputs[7].default_value = srgb('#141110')
    # embers: where char > .7 and noise high
    em = N(nt, 'ShaderNodeMapRange', -500, -300, From_Min=0.55, From_Max=0.8, To_Min=0.0, To_Max=1.0)
    L(nt, nz.outputs['Fac'], em.inputs['Value'])
    emm = N(nt, 'ShaderNodeMath', -250, -300, p_operation='MULTIPLY'); L(nt, em.outputs[0], emm.inputs[0]); L(nt, ch.outputs['Fac'], emm.inputs[1])
    ems = N(nt, 'ShaderNodeMath', -100, -300, p_operation='MULTIPLY'); L(nt, emm.outputs[0], ems.inputs[0]); ems.inputs[1].default_value = 6.0
    p = principled(nt, Roughness=0.85); p.location = (100, 0)
    L(nt, mx.outputs[2], p.inputs['Base Color'])
    p.inputs['Emission Color'].default_value = srgb('#ff5a14')
    L(nt, ems.outputs[0], p.inputs['Emission Strength'])
    out_node(nt, p.outputs[0])
    return m

def mat_resin_shell():
    """clear amber casting resin: transmissive, tinted, glossy, with a faint graded self-glow toward the base"""
    m, nt = mat_new('resin_shell')
    if nt is None: return m
    fh = N(nt, 'ShaderNodeAttribute', -900, 0, p_attribute_name='fh')
    tint = ramp(nt, [(0.0, (1.0, 0.62, 0.2, 1)), (0.55, (1.0, 0.45, 0.1, 1)), (1.0, (0.85, 0.28, 0.05, 1))], -600, 0)
    L(nt, fh.outputs['Fac'], tint.inputs[0])
    glow = N(nt, 'ShaderNodeMapRange', -600, -300, To_Min=float(os.environ.get('SHELLW', '0.35')), To_Max=0.04); L(nt, fh.outputs['Fac'], glow.inputs['Value'])
    p = principled(nt, Roughness=0.08); p.location = (0, 0)
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['IOR'].default_value = 1.52
    p.inputs['Coat Weight'].default_value = 0.5; p.inputs['Coat Roughness'].default_value = 0.05
    L(nt, tint.outputs[0], p.inputs['Base Color'])
    ec = ramp(nt, [(0.0, (1.0, 0.6, 0.18, 1)), (1.0, (1.0, 0.36, 0.06, 1))], -300, -300)
    L(nt, fh.outputs['Fac'], ec.inputs[0])
    L(nt, ec.outputs[0], p.inputs['Emission Color']); L(nt, glow.outputs[0], p.inputs['Emission Strength'])
    out_node(nt, p.outputs[0])
    return m

def mat_resin_core():
    """the LED-lit core inside the resin: warm gradient emission, brightest at the base"""
    m, nt = mat_new('resin_core')
    if nt is None: return m
    fh = N(nt, 'ShaderNodeAttribute', -900, 0, p_attribute_name='fh')
    col = ramp(nt, [(0.0, (1.0, 0.72, 0.3, 1)), (0.3, (1.0, 0.55, 0.14, 1)), (0.75, (1.0, 0.4, 0.07, 1)), (1.0, (0.9, 0.26, 0.04, 1))], -600, 0)
    L(nt, fh.outputs['Fac'], col.inputs[0])
    st = N(nt, 'ShaderNodeMapRange', -600, -300, To_Min=float(os.environ.get('COREW', '1.4')), To_Max=0.25); L(nt, fh.outputs['Fac'], st.inputs['Value'])
    em = N(nt, 'ShaderNodeEmission', -200, 0)
    L(nt, col.outputs[0], em.inputs['Color']); L(nt, st.outputs[0], em.inputs['Strength'])
    out_node(nt, em.outputs[0])
    return m

def petal_mesh(name, h, w, t, bend=0.25, twist=0.4, seed=0, mat=None, nr=16, ns=14):
    """flame petal: pointed leaf form, flattened, S-curved; attribute fh = height fraction"""
    rng = random.Random(seed)
    V, F, FH = [], [], []
    ph = rng.uniform(0, 6.28)
    for j in range(nr + 1):
        tt = j / nr
        z = h * tt
        prof = (math.sin(math.pi * min(1.0, tt * 0.85 + 0.15)) ** 0.55) * (1 - tt) ** 0.25 * (1 + 0.25 * math.sin(tt * 5 + ph))
        wr = w * 0.5 * prof; tr = t * 0.5 * prof
        cx = bend * h * 0.35 * (math.sin(tt * 3.4 + ph) * tt + 0.6 * tt * tt)
        tw_ = twist * tt
        for k in range(ns):
            a = 2 * math.pi * k / ns
            x = wr * math.cos(a); y = tr * math.sin(a)
            xr = x * math.cos(tw_) - y * math.sin(tw_); yr = x * math.sin(tw_) + y * math.cos(tw_)
            V.append((cx + xr, yr, z)); FH.append(tt)
    for j in range(nr):
        for k in range(ns):
            a_ = j * ns + k; b_ = j * ns + (k + 1) % ns
            F.append((a_, b_, b_ + ns, a_ + ns))
    V.append((0, 0, 0)); FH.append(0.0); c = len(V) - 1
    for k in range(ns): F.append((c, (k + 1) % ns, k))
    return mesh_from(name, V, F, attrs={'fh': ('POINT', 'FLOAT', FH)}, mat=mat)

def mat_resin_flame():
    m, nt = mat_new('resin_flame')
    if nt is None: return m
    fh = N(nt, 'ShaderNodeAttribute', -900, 0, p_attribute_name='fh')
    col = ramp(nt, [(0.0, srgb('#ffe2a0')), (0.18, srgb('#ffb44a')), (0.5, srgb('#ff7a1c')), (1.0, srgb('#b82e0c'))], -600, 0)
    L(nt, fh.outputs['Fac'], col.inputs[0])
    st = N(nt, 'ShaderNodeMapRange', -600, -300, To_Min=2.4, To_Max=0.5); L(nt, fh.outputs['Fac'], st.inputs['Value'])
    p = principled(nt, Roughness=0.12); p.location = (0, 0)
    p.inputs['Base Color'].default_value = srgb('#ff8a24')
    p.inputs['Transmission Weight'].default_value = 0.7
    p.inputs['IOR'].default_value = 1.54
    L(nt, col.outputs[0], p.inputs['Emission Color']); L(nt, st.outputs[0], p.inputs['Emission Strength'])
    out_node(nt, p.outputs[0])
    return m

def mat_sky_paint(top='#4f7398', mid='#f5cf8c', low='#e8823c', hills='#5e4338', z0=0.0, z1=0.42, sun=(-0.55, 0.36, 0.13), sun_r=0.03, albedo=0.5):
    m, nt = mat_new('sky_paint')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -1400, 0)
    sep = N(nt, 'ShaderNodeSeparateXYZ', -1200, 0); L(nt, tc.outputs['Object'], sep.inputs[0])
    bmap = N(nt, 'ShaderNodeMapping', -1200, -300); bmap.inputs['Scale'].default_value = (6, 6, 70)
    L(nt, tc.outputs['Object'], bmap.inputs['Vector'])
    bn = N(nt, 'ShaderNodeTexNoise', -1000, -300, Scale=1.0, Detail=5.0, Roughness=0.6)
    L(nt, bmap.outputs[0], bn.inputs['Vector'])
    zz = N(nt, 'ShaderNodeMapRange', -1000, 0, From_Min=z0, From_Max=z1); L(nt, sep.outputs[2], zz.inputs['Value'])
    pert = N(nt, 'ShaderNodeMath', -800, 0, p_operation='MULTIPLY_ADD'); L(nt, bn.outputs['Fac'], pert.inputs[0]); pert.inputs[1].default_value = 0.12; L(nt, zz.outputs[0], pert.inputs[2])
    pert2 = N(nt, 'ShaderNodeMath', -650, 0, p_operation='SUBTRACT'); L(nt, pert.outputs[0], pert2.inputs[0]); pert2.inputs[1].default_value = 0.06
    sky = ramp(nt, [(0.0, srgb(low)), (0.14, srgb('#f0a557')), (0.34, srgb(mid)), (0.55, srgb('#efdcb4')), (0.75, srgb('#9fb3bf')), (1.0, srgb(top))], -450, 100)
    L(nt, pert2.outputs[0], sky.inputs[0])
    # painted low sun: disc + halo
    sd = N(nt, 'ShaderNodeVectorMath', -1000, 700, p_operation='DISTANCE'); L(nt, tc.outputs['Object'], sd.inputs[0]); sd.inputs[1].default_value = sun
    disc = N(nt, 'ShaderNodeMapRange', -800, 700, From_Min=sun_r * 0.92, From_Max=sun_r * 1.08, To_Min=1.0, To_Max=0.0); L(nt, sd.outputs['Value'], disc.inputs['Value'])
    halo = N(nt, 'ShaderNodeMapRange', -800, 550, From_Min=sun_r, From_Max=sun_r * 6, To_Min=0.55, To_Max=0.0); L(nt, sd.outputs['Value'], halo.inputs['Value'])
    hmix = N(nt, 'ShaderNodeMix', -300, 300, p_data_type='RGBA', p_blend_type='SCREEN')
    L(nt, halo.outputs[0], hmix.inputs['Factor']); L(nt, sky.outputs[0], hmix.inputs[6]); hmix.inputs[7].default_value = srgb('#ffd88a')
    dmix = N(nt, 'ShaderNodeMix', -150, 300, p_data_type='RGBA')
    L(nt, disc.outputs[0], dmix.inputs['Factor']); L(nt, hmix.outputs[2], dmix.inputs[6]); dmix.inputs[7].default_value = srgb('#fff3d6')
    # hills silhouette band
    rn = N(nt, 'ShaderNodeTexNoise', -1000, 400, Scale=5.0, Detail=3.0, p_noise_dimensions='1D')
    L(nt, sep.outputs[0], rn.inputs['W'])
    ridge = N(nt, 'ShaderNodeMath', -800, 400, p_operation='MULTIPLY_ADD'); L(nt, rn.outputs['Fac'], ridge.inputs[0]); ridge.inputs[1].default_value = 0.07; ridge.inputs[2].default_value = z0 + 0.025
    hm = N(nt, 'ShaderNodeMath', -650, 400, p_operation='LESS_THAN'); L(nt, sep.outputs[2], hm.inputs[0]); L(nt, ridge.outputs[0], hm.inputs[1])
    mix = N(nt, 'ShaderNodeMix', 0, 100, p_data_type='RGBA')
    L(nt, hm.outputs[0], mix.inputs['Factor']); L(nt, dmix.outputs[2], mix.inputs[6]); mix.inputs[7].default_value = srgb(hills)
    pn = N(nt, 'ShaderNodeTexNoise', -400, -500, Scale=2500.0, Detail=2.0)
    L(nt, tc.outputs['Object'], pn.inputs['Vector'])
    b = N(nt, 'ShaderNodeBump', -100, -400, Strength=0.25, Distance=0.0002); L(nt, pn.outputs['Fac'], b.inputs['Height'])
    b2 = N(nt, 'ShaderNodeBump', 50, -300, Strength=0.2, Distance=0.0006); L(nt, bn.outputs['Fac'], b2.inputs['Height']); L(nt, b.outputs[0], b2.inputs['Normal'])
    p = principled(nt, Roughness=0.85); p.location = (200, 0)
    dim = N(nt, 'ShaderNodeMix', 100, 150, p_data_type='RGBA', p_blend_type='MULTIPLY', Factor=1.0)
    L(nt, mix.outputs[2], dim.inputs[6]); dim.inputs[7].default_value = (albedo, albedo, albedo, 1)
    L(nt, dim.outputs[2], p.inputs['Base Color']); L(nt, b2.outputs[0], p.inputs['Normal'])
    # slight self-glow on the painted sun (a real set would back-light a cut-out)
    p.inputs['Emission Color'].default_value = srgb('#fff0c8')
    L(nt, disc.outputs[0], p.inputs['Emission Strength'])
    out_node(nt, p.outputs[0])
    return m

def mat_plywood_edge():
    m, nt = mat_new('plywood_edge')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    sep = N(nt, 'ShaderNodeSeparateXYZ', -700, 0); L(nt, tc.outputs['Object'], sep.inputs[0])
    w = N(nt, 'ShaderNodeMath', -500, 0, p_operation='MULTIPLY'); L(nt, sep.outputs[2], w.inputs[0]); w.inputs[1].default_value = 1 / 0.0028
    fr = N(nt, 'ShaderNodeMath', -350, 0, p_operation='FRACT'); L(nt, w.outputs[0], fr.inputs[0])
    col = ramp(nt, [(0.0, srgb('#6a4c2e')), (0.12, srgb('#d8b98a')), (0.88, srgb('#c9a676')), (1.0, srgb('#6a4c2e'))], -150, 0)
    L(nt, fr.outputs[0], col.inputs[0])
    p = principled(nt, Roughness=0.7); p.location = (200, 0)
    L(nt, col.outputs[0], p.inputs['Base Color'])
    out_node(nt, p.outputs[0])
    return m

def mat_foam(col='#5b6234'):
    m, nt = mat_new('foam_' + col)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    vo = N(nt, 'ShaderNodeTexVoronoi', -700, -200, Scale=900.0)
    L(nt, tc.outputs['Object'], vo.inputs['Vector'])
    n1 = N(nt, 'ShaderNodeTexNoise', -700, 200, Scale=60.0, Detail=4.0)
    L(nt, tc.outputs['Object'], n1.inputs['Vector'])
    c = ramp(nt, [(0.0, srgb('#2c311a')), (0.5, srgb(col)), (1.0, srgb('#8d8a52'))], -400, 200)
    L(nt, n1.outputs['Fac'], c.inputs[0])
    b = N(nt, 'ShaderNodeBump', -300, -200, Strength=0.6, Distance=0.001); L(nt, vo.outputs['Distance'], b.inputs['Height'])
    p = principled(nt, Roughness=0.9); p.location = (0, 0)
    L(nt, c.outputs[0], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def mat_wire_trunk():
    return simple('wire_trunk', srgb('#4a3526'), rough=0.75)

def mat_concrete():
    m, nt = mat_new('concrete')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    n1 = N(nt, 'ShaderNodeTexNoise', -700, 100, Scale=3.0, Detail=8.0, Roughness=0.6)
    L(nt, tc.outputs['Object'], n1.inputs['Vector'])
    c = ramp(nt, [(0.0, srgb('#2a2826')), (1.0, srgb('#4a4744'))], -400, 100)
    L(nt, n1.outputs['Fac'], c.inputs[0])
    r = N(nt, 'ShaderNodeMapRange', -400, -200, To_Min=0.45, To_Max=0.8); L(nt, n1.outputs['Fac'], r.inputs['Value'])
    p = principled(nt); p.location = (0, 0)
    L(nt, c.outputs[0], p.inputs['Base Color']); L(nt, r.outputs[0], p.inputs['Roughness'])
    out_node(nt, p.outputs[0])
    return m

# ------------------------------------------------------------------ table / board / studio
def studio_floor(z=-0.76, size=30):
    me = bpy.data.meshes.new('floor'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=size / 2); bm.to_mesh(me); bm.free()
    me.materials.append(mat_concrete())
    return place(me, (0, 0, z), name='floor')

def round_table(r=0.75, z_top=0.0, thick=0.04):
    top = cyl_mesh('tabletop', r, thick, seg=128, mat=mat_walnut(), bevel=0.008, z0=z_top - thick)
    o = place(top, name='tabletop')
    col = cyl_mesh('tablecol', 0.06, 0.7, seg=32, mat=simple('dark_wood', srgb('#2a1c12'), 0.5), z0=z_top - thick - 0.7)
    place(col, name='tablecol')
    base = cyl_mesh('tablebase', 0.3, 0.03, seg=48, mat=simple('dark_wood', srgb('#2a1c12'), 0.5), z0=z_top - 0.76)
    place(base, name='tablebase')
    return o

def board(r=0.62, t=0.022, z0=0.0):
    me = cyl_mesh('board', r, t, seg=160, mat=mat_plywood_edge(), bevel=0.0015, z0=z0)
    return place(me, name='board')

def ground_disc(r=0.615, z=0.022, seed=3, amp=0.004, rings=60, segs=240, ash_center=(0, 0), ash_r=0.07, extra=None):
    """Displaced earth disc. extra(x,y)->dz for mounds/paths."""
    verts, faces, ash = [], [], []
    verts.append((0, 0, z)); ash.append(1.0)
    def hgt(x, y):
        d = math.hypot(x, y)
        h = amp * mnoise.fractal(Vector((x * 6 + seed, y * 6, 0.3)), 0.6, 2.0, 4)
        h += amp * 0.4 * mnoise.noise(Vector((x * 40, y * 40, seed)))
        edge = max(0.0, (d - (r - 0.02)) / 0.02)
        h *= (1 - edge)
        if extra: h += extra(x, y)
        return z + max(h, -0.001) + 0.002
    for i in range(1, rings + 1):
        rr = r * (i / rings) ** 0.85
        for k in range(segs):
            a = 2 * math.pi * k / segs
            x, y = rr * math.cos(a), rr * math.sin(a)
            verts.append((x, y, hgt(x, y) if i < rings else z + 0.0005))
            da = math.hypot(x - ash_center[0], y - ash_center[1])
            ash.append(max(0.0, 1 - da / ash_r) ** 1.5)
    for k in range(segs):
        faces.append((0, 1 + k, 1 + (k + 1) % segs))
    for i in range(1, rings):
        b0 = 1 + (i - 1) * segs; b1 = 1 + i * segs
        for k in range(segs):
            faces.append((b0 + k, b1 + k, b1 + (k + 1) % segs, b0 + (k + 1) % segs))
    me = mesh_from('ground', verts, faces, attrs={'ash': ('POINT', 'FLOAT', ash)}, mat=mat_earth())
    o = place(me, name='ground')
    o['hgt'] = 0
    return o, hgt

# ------------------------------------------------------------------ grass
def tuft_mesh(name, seed, n=34, hmin=0.03, hmax=0.075, spread=0.55, width=0.0007, paper=False):
    rng = random.Random(seed)
    V, F, FT, FR = [], [], [], []
    seg = 6
    for i in range(n):
        az = rng.uniform(0, 2 * math.pi)
        br = rng.uniform(0, 0.005)
        base = Vector((br * math.cos(az), br * math.sin(az), 0))
        Lf = rng.uniform(hmin, hmax) * (0.6 if paper and rng.random() < 0.3 else 1.0)
        tilt = rng.uniform(0.03, spread) * (0.4 + 0.6 * br / 0.005)
        droop = rng.uniform(0.1, 0.9)
        lean = az + rng.uniform(-0.5, 0.5)
        ldir = Vector((math.cos(lean), math.sin(lean), 0))
        w = width * rng.uniform(0.6, 1.4) * (3.2 if paper else 1.0)
        twist = rng.uniform(-1.5, 1.5)
        frv = rng.random()
        p = base.copy(); o = len(V)
        for s in range(seg + 1):
            t = s / seg
            ang = tilt + droop * tilt * 1.8 * t * t
            d = Vector((ldir.x * math.sin(ang), ldir.y * math.sin(ang), math.cos(ang)))
            if s > 0: p = p + d * (Lf / seg)
            side = Vector((-ldir.y, ldir.x, 0))
            side = side * math.cos(twist * t) + d.cross(side) * math.sin(twist * t)
            ww = w * (1 - 0.85 * t ** 1.5) * 0.5
            V.append(p - side * ww); V.append(p + side * ww)
            FT += [t, t]; FR += [frv, frv]
        for s in range(seg):
            a = o + 2 * s
            F.append((a, a + 1, a + 3, a + 2))
    me = mesh_from(name, V, F, attrs={'ft': ('POINT', 'FLOAT', FT), 'fr': ('POINT', 'FLOAT', FR)}, mat=mat_jute())
    return me

def scatter_grass(hgt, r_in=0.0, r_out=0.6, count=400, seed=1, avoid=(), variants=None, scale=(0.7, 1.25), coll=None, cluster=None):
    """avoid: list of (x, y, radius). cluster(x,y)->probability multiplier"""
    rng = random.Random(seed)
    if variants is None:
        variants = [tuft_mesh('tuft%d' % i, 100 + i, n=rng.randint(22, 40), hmin=0.025, hmax=0.07 + 0.01 * (i % 3), paper=(i % 4 == 3)) for i in range(7)]
    placed = 0; tries = 0; objs = []
    while placed < count and tries < count * 30:
        tries += 1
        a = rng.uniform(0, 2 * math.pi); d = math.sqrt(rng.uniform(r_in ** 2, r_out ** 2))
        x, y = d * math.cos(a), d * math.sin(a)
        if any((x - ax) ** 2 + (y - ay) ** 2 < ar * ar for ax, ay, ar in avoid): continue
        if cluster and rng.random() > cluster(x, y): continue
        me = variants[rng.randrange(len(variants))]
        s = rng.uniform(*scale)
        o = place(me, (x, y, hgt(x, y) - 0.001), (rng.uniform(-0.08, 0.08), rng.uniform(-0.08, 0.08), rng.uniform(0, 6.28)), (s, s, s * rng.uniform(0.8, 1.2)), name='tuft', coll=coll)
        objs.append(o); placed += 1
    return objs

# ------------------------------------------------------------------ reed hut
def hut_mesh(name='hut', R=0.13, Hh=0.18, n=190, door=0.0, door_w=0.55, door_h=0.58, seed=4, sides=5):
    rng = random.Random(seed)
    parts = []; FR = []
    def prof(z):  # radius at height z
        t = min(max(z / Hh, 0), 1)
        return R * (1 - t ** 2.3) ** 0.62
    for i in range(n):
        az = 2 * math.pi * i / n + rng.uniform(-0.02, 0.02)
        dd = math.atan2(math.sin(az - door), math.cos(az - door))
        in_door = abs(dd) < door_w / 2
        z_start = door_h * Hh * (1 - (dd / (door_w / 2)) ** 2) ** 0.5 if in_door else 0.0
        top = Hh * rng.uniform(0.9, 1.02)
        pts = []
        segs = 14
        rr = rng.uniform(0.0011, 0.0018)
        wob = rng.uniform(0, 10)
        for s in range(segs + 1):
            z = z_start + (top - z_start) * s / segs
            r = prof(min(z, Hh * 0.995)) + 0.0015 * mnoise.noise(Vector((az * 3, z * 40, wob)))
            a2 = az + 0.03 * math.sin(z * 30 + wob) * (z / Hh)
            pts.append(Vector((r * math.cos(a2), r * math.sin(a2), z)))
        v, f = tube_path(pts, [rr * (1 - 0.5 * (s / segs) ** 2) for s in range(segs + 1)], sides=sides, cap=False)
        parts.append((v, f)); FR += [rng.random()] * len(v)
    V, F = merge_parts(parts)
    me = mesh_from(name + '_reeds', V, F, attrs={'fr': ('POINT', 'FLOAT', FR)}, mat=mat_reed())
    # binding rings (twine)
    rings = []
    for zf in (0.2, 0.42, 0.64, 0.84):
        z = zf * Hh
        pts = []; k = 72
        for j in range(k + 1):
            a = 2 * math.pi * j / k
            dd = math.atan2(math.sin(a - door), math.cos(a - door))
            if abs(dd) < door_w / 2 and z < door_h * Hh * (1 - (dd / (door_w / 2)) ** 2) ** 0.5:
                if len(pts) > 1: rings.append(tube_path(pts, 0.0011, sides=5))
                pts = []; continue
            r = prof(z) + 0.0016
            pts.append(Vector((r * math.cos(a), r * math.sin(a), z)))
        if len(pts) > 1: rings.append(tube_path(pts, 0.0011, sides=5))
    V2, F2 = merge_parts(rings)
    me2 = mesh_from(name + '_twine', V2, F2, mat=mat_twine())
    # inner dark dome with door hole
    V3, F3 = [], []
    nz, na = 16, 64
    for iz in range(nz + 1):
        z = Hh * 0.97 * iz / nz
        for ia in range(na):
            a = 2 * math.pi * ia / na
            r = prof(z) * 0.93
            V3.append((r * math.cos(a), r * math.sin(a), z))
    for iz in range(nz):
        for ia in range(na):
            a = 2 * math.pi * (ia + 0.5) / na
            dd = math.atan2(math.sin(a - door), math.cos(a - door))
            zc = Hh * 0.97 * (iz + 0.5) / nz
            if abs(dd) < door_w / 2 * 0.9 and zc < door_h * Hh * 0.95 * (1 - (dd / (door_w / 2 * 0.9)) ** 2) ** 0.5: continue
            b = iz * na
            F3.append((b + ia, b + (ia + 1) % na, b + na + (ia + 1) % na, b + na + ia))
    me3 = mesh_from(name + '_inner', V3, F3, mat=mat_thatch_dark())
    return [me, me2, me3]

def place_hut(meshes, loc, rot, scale=1.0, coll=None):
    return [place(m, loc, (0, 0, rot), scale, coll=coll) for m in meshes]

# ------------------------------------------------------------------ campfire
def campfire(loc=(0, 0, 0.024), seed=5, light_power=3.0, coll=None, flame_scale=1.0):
    rng = random.Random(seed)
    x0, y0, z0 = loc
    objs = []
    sm = mat_stone()
    for i in range(10):
        a = 2 * math.pi * i / 10 + rng.uniform(-0.1, 0.1)
        rr = 0.036 + rng.uniform(-0.003, 0.003)
        me = rock_mesh('firestone%d' % i, i + seed, r=rng.uniform(0.0075, 0.0105), squash=(1.2, 0.9, 0.62), mat=sm)
        objs.append(place(me, (x0 + rr * math.cos(a), y0 + rr * math.sin(a), z0 + 0.002), (0, 0, rng.uniform(0, 6)), coll=coll))
    # sticks in a loose tipi
    stm = mat_stick()
    parts = []; CH = []
    for i in range(6):
        a = 2 * math.pi * i / 6 + rng.uniform(-0.2, 0.2)
        Ls = rng.uniform(0.045, 0.06)
        base = Vector((x0 + 0.03 * math.cos(a), y0 + 0.03 * math.sin(a), z0 + 0.002))
        tip = Vector((x0 + 0.004 * math.cos(a + 2), y0 + 0.004 * math.sin(a + 2), z0 + 0.028))
        d = (tip - base).normalized()
        pts = [base + d * Ls * t / 6 for t in range(7)]
        v, f = tube_path(pts, rng.uniform(0.0022, 0.003), sides=7)
        parts.append((v, f))
        for p in v:
            dc = math.hypot(p.x - x0, p.y - y0)
            CH.append(max(0.0, min(1.0, 1.2 - dc / 0.022)))
    V, F = merge_parts(parts)
    me = mesh_from('sticks', V, F, attrs={'char': ('POINT', 'FLOAT', CH)}, mat=stm)
    objs.append(place(me, coll=coll))
    # resin flame: 5 amber petals (clear resin shells) around a glowing core, like a handmade LED prop
    shell = mat_resin_shell(); core = mat_resin_core()
    for i in range(5):
        a = 2 * math.pi * i / 5 + rng.uniform(-0.25, 0.25)
        hh = rng.uniform(0.026, 0.04) * flame_scale * (1.35 if i == 0 else 1.0)
        ww = rng.uniform(0.014, 0.018) * flame_scale
        pm = petal_mesh('petal%d' % i, hh, ww, ww * 0.5, bend=0.6, twist=0.8, seed=seed * 10 + i, mat=shell)
        off = 0.004 * flame_scale if i else 0.0
        tilt = rng.uniform(0.25, 0.42) if i else 0.05
        o = place(pm, (x0 + off * math.cos(a), y0 + off * math.sin(a), z0 + 0.004), (tilt * math.sin(a), -tilt * math.cos(a), a + math.pi / 2), coll=coll)
        objs.append(o)
        cm = petal_mesh('core%d' % i, hh * 0.6, ww * 0.45, ww * 0.22, bend=0.6, twist=0.8, seed=seed * 10 + i, mat=core)
        objs.append(place(cm, (x0 + off * math.cos(a), y0 + off * math.sin(a), z0 + 0.0045), (tilt * math.sin(a), -tilt * math.cos(a), a + math.pi / 2), coll=coll))
    m, nt = mat_new('embers')
    if nt is not None:
        tc = N(nt, 'ShaderNodeTexCoord', -600, 0)
        vo = N(nt, 'ShaderNodeTexVoronoi', -400, 0, Scale=260.0); L(nt, tc.outputs['Object'], vo.inputs['Vector'])
        gd = N(nt, 'ShaderNodeTexGradient', -400, -250, p_gradient_type='SPHERICAL')
        mp = N(nt, 'ShaderNodeMapping', -600, -250); mp.inputs['Scale'].default_value = (1 / 0.032, 1 / 0.032, 1 / 0.032)
        L(nt, tc.outputs['Object'], mp.inputs['Vector']); L(nt, mp.outputs[0], gd.inputs['Vector'])
        c = ramp(nt, [(0.0, (0.02, 0.015, 0.012, 1)), (0.5, srgb('#3a1206')), (0.8, srgb('#ff6a1a')), (1.0, srgb('#ffc060'))], -150, 0)
        mm = N(nt, 'ShaderNodeMath', -250, -100, p_operation='MULTIPLY'); L(nt, vo.outputs['Distance'], mm.inputs[0]); L(nt, gd.outputs['Fac'], mm.inputs[1])
        mm2 = N(nt, 'ShaderNodeMath', -200, -200, p_operation='MULTIPLY'); L(nt, mm.outputs[0], mm2.inputs[0]); mm2.inputs[1].default_value = 2.2
        L(nt, mm2.outputs[0], c.inputs[0])
        p = principled(nt, Roughness=0.9); p.location = (150, 0)
        L(nt, c.outputs[0], p.inputs['Base Color']); L(nt, c.outputs[0], p.inputs['Emission Color'])
        p.inputs['Emission Strength'].default_value = 2.5
        out_node(nt, p.outputs[0])
    ed = cyl_mesh('ember_disc', 0.032, 0.0015, seg=48, mat=m)
    objs.append(place(ed, (x0, y0, z0 - 0.0005), coll=coll))
    lt = light('POINT', (x0, y0, z0 + 0.03), energy=light_power, kelv=1900, size=0.012, name='firelight')
    lt.visible_camera = False
    lt2 = light('POINT', (x0, y0, z0 + 0.012), energy=light_power * 0.4, kelv=1700, size=0.02, name='firelight2')
    return objs, lt

# ------------------------------------------------------------------ acacia (wire + sponge)
def acacia(loc, h=0.34, seed=2, crown=0.11, coll=None):
    rng = random.Random(seed)
    x0, y0, z0 = loc
    tm = mat_wire_trunk(); parts = []
    top = Vector((x0 + rng.uniform(-0.02, 0.02), y0 + rng.uniform(-0.02, 0.02), z0 + h * 0.62))
    for s in range(4):
        base = Vector((x0 + rng.uniform(-0.006, 0.006), y0 + rng.uniform(-0.006, 0.006), z0))
        pts = []
        for j in range(9):
            t = j / 8
            p = base.lerp(top, t)
            p.x += 0.004 * math.sin(t * 9 + s); p.y += 0.004 * math.cos(t * 7 + s)
            pts.append(p)
        parts.append(tube_path(pts, [0.0035 * (1 - 0.3 * j / 8) for j in range(9)], sides=6))
    br_tips = []
    for b in range(6):
        a = 2 * math.pi * b / 6 + rng.uniform(-0.3, 0.3)
        tip = Vector((top.x + crown * rng.uniform(0.5, 0.95) * math.cos(a), top.y + crown * rng.uniform(0.5, 0.95) * math.sin(a), z0 + h * rng.uniform(0.86, 0.95)))
        pts = [top.lerp(tip, t / 6) + Vector((0, 0, 0.012 * math.sin(math.pi * t / 6))) for t in range(7)]
        parts.append(tube_path(pts, [0.0024 * (1 - 0.6 * t / 6) for t in range(7)], sides=5))
        br_tips.append(tip)
    V, F = merge_parts(parts)
    objs = [place(mesh_from('trunk', V, F, mat=tm), coll=coll)]
    sp = mat_sponge('sponge_acacia', '#2c3319', '#56602c', '#8f8c55')
    objs += canopy((top.x, top.y, z0 + h * 0.93), crown * 1.05, crown * 1.0, 0.018, n=70, rmin=0.011, rmax=0.02, seed=seed, mat=sp, flat=True, coll=coll)
    return objs

# ------------------------------------------------------------------ painted sky card
def sky_card(r=0.66, a0=20, a1=160, h=0.42, z0=0.0, thick=0.002, mat=None):
    segs = 96
    V, F = [], []
    for i in range(segs + 1):
        a = math.radians(a0 + (a1 - a0) * i / segs)
        for zz in (z0, z0 + h):
            V.append((r * math.cos(a), r * math.sin(a), zz))
    for i in range(segs):
        a = 2 * i
        F.append((a, a + 2, a + 3, a + 1))
    me = mesh_from('skycard', V, F, mat=mat or mat_sky_paint(z0=z0, z1=z0 + h))
    o = place(me, name='skycard')
    sol = o.modifiers.new('solid', 'SOLIDIFY'); sol.thickness = thick; sol.offset = 1
    return o

# ------------------------------------------------------------------ practical lamp on a stand
def lamp_head(loc, target, r=0.09, depth=0.12, glow=40.0, kelv=3000, coll=None):
    """black dish reflector lamp with visible glowing front diffuser (emissive)"""
    d = (Vector(target) - Vector(loc)).normalized()
    rot = d.to_track_quat('Z', 'Y').to_euler()
    body = cyl_mesh('lamp_body', r, depth, seg=40, mat=simple('lamp_black', (0.02, 0.02, 0.02), 0.4, 0.6), z0=-depth)
    b = place(body, loc, rot, coll=coll)
    m, nt = mat_new('lamp_glow')
    if nt is not None:
        em = N(nt, 'ShaderNodeEmission', 0, 0, Strength=glow); em.inputs['Color'].default_value = (*kelv_wb(kelv), 1)
        out_node(nt, em.outputs[0])
    gl = cyl_mesh('lamp_front', r * 0.9, 0.002, seg=40, mat=m, z0=0.0)
    g = place(gl, loc, rot, coll=coll)
    g.visible_shadow = False
    return b, g

def stick(p0, p1, r=0.0018, mat=None, name='stick_prop', coll=None):
    p0, p1 = Vector(p0), Vector(p1)
    pts = [p0.lerp(p1, t / 8) for t in range(9)]
    v, f = tube_path(pts, r, sides=6)
    me = mesh_from(name, v, f, attrs={'char': ('POINT', 'FLOAT', [0.0] * len(v))}, mat=mat or mat_stick())
    return place(me, coll=coll)

def pebbles(hgt, n=120, r_in=0.05, r_out=0.6, seed=9, avoid=()):
    rng = random.Random(seed); sm = mat_stone()
    meshes = [rock_mesh('pebble%d' % i, 30 + i, r=1.0, squash=(1.2, 1, 0.6), rough=0.3, subdiv=2, mat=sm) for i in range(6)]
    k = 0
    while k < n:
        a = rng.uniform(0, 6.283); d = math.sqrt(rng.uniform(r_in ** 2, r_out ** 2))
        x, y = d * math.cos(a), d * math.sin(a)
        if any((x - ax) ** 2 + (y - ay) ** 2 < ar * ar for ax, ay, ar in avoid): continue
        s_ = rng.uniform(0.0015, 0.005)
        place(meshes[k % 6], (x, y, hgt(x, y) + s_ * 0.2), (0, 0, rng.uniform(0, 6)), (s_, s_, s_), name='pebble')
        k += 1

def link_light_to(light_obj, objs, name='lightlink'):
    c = bpy.data.collections.new(name)
    for o in objs: c.objects.link(o)
    light_obj.light_linking.receiver_collection = c
    return c

# ------------------------------------------------------------------ workshop props (handmade context)
def lathe_mesh(name, prof, seg=40, mat=None):
    """prof: list of (r, z) bottom->top"""
    V, F = [], []
    for r, z in prof:
        for k in range(seg):
            a = 2 * math.pi * k / seg
            V.append((r * math.cos(a), r * math.sin(a), z))
    n = len(prof)
    for i in range(n - 1):
        for k in range(seg):
            a = i * seg + k; b = i * seg + (k + 1) % seg
            F.append((a, b, b + seg, a + seg))
    V.append((0, 0, prof[0][1])); c0 = len(V) - 1
    V.append((0, 0, prof[-1][1])); c1 = len(V) - 1
    for k in range(seg):
        F.append((c0, (k + 1) % seg, k)); F.append((c1, (n - 1) * seg + k, (n - 1) * seg + (k + 1) % seg))
    return mesh_from(name, V, F, mat=mat)

def paintbrush(loc, heading, coll=None):
    """flat artist brush lying on the table"""
    wood = simple('brush_handle', srgb('#7a1f18'), 0.35, Coat_Weight=0.6)
    ferr = simple('ferrule', (0.8, 0.78, 0.74), 0.25, 1.0)
    hair = simple('bristle', srgb('#2a2018'), 0.6)
    prof_h = [(0.0005, 0.0), (0.0035, 0.004), (0.0042, 0.06), (0.0036, 0.13), (0.0028, 0.17), (0.0005, 0.175)]
    prof_f = [(0.0036, 0.0), (0.0038, 0.022), (0.0032, 0.03)]
    prof_b = [(0.0031, 0.0), (0.0034, 0.008), (0.0022, 0.02), (0.0004, 0.024)]
    parts = []
    h = place(lathe_mesh('handle', prof_h, 24, wood), coll=coll)
    f = place(lathe_mesh('ferr', prof_f, 24, ferr), coll=coll); f.location = (0, 0, -0.03)
    b = place(lathe_mesh('bristles', prof_b, 24, hair), coll=coll); b.location = (0, 0, -0.054)
    for o in (f, b): o.parent = h
    h.rotation_euler = (math.radians(90), 0, math.radians(heading))
    h.location = (loc[0], loc[1], loc[2] + 0.0042)
    return h

def twine_spool(loc, coll=None):
    tw = mat_twine(); core = mat_beech_prop('spool_wood')
    prof = [(0.018, 0.0), (0.018, 0.004), (0.011, 0.005), (0.011, 0.031), (0.018, 0.032), (0.018, 0.036)]
    s = place(lathe_mesh('spool', prof, 40, core), loc, coll=coll)
    # wound twine as stacked tori
    parts = []
    for i in range(12):
        z = 0.0065 + i * 0.0022
        pts = [Vector((0.0158 * math.cos(2 * math.pi * k / 40), 0.0158 * math.sin(2 * math.pi * k / 40), z + 0.0022 * k / 40)) for k in range(41)]
        parts.append(tube_path(pts, 0.0012, sides=6, cap=False))
    V, F = merge_parts(parts)
    t = place(mesh_from('twine_wound', V, F, mat=tw), loc, coll=coll)
    # loose end snaking on the table
    pts = [Vector((0.017, 0.0, 0.02)), Vector((0.03, -0.01, 0.004)), Vector((0.06, -0.03, 0.0012)), Vector((0.1, -0.02, 0.0012)), Vector((0.13, -0.05, 0.0012))]
    ex = []
    for i in range(len(pts) - 1):
        for k in range(6):
            ex.append(pts[i].lerp(pts[i + 1], k / 6))
    ex.append(pts[-1])
    v, f = tube_path(ex, 0.0011, sides=6)
    place(mesh_from('twine_end', v, f, mat=tw), loc, coll=coll)
    return s

def loose_fibres(loc, n=60, seed=4, spread=0.05, coll=None):
    rng = random.Random(seed); V, F, FT, FR = [], [], [], []
    for i in range(n):
        a = rng.uniform(0, 6.28); L_ = rng.uniform(0.03, 0.08)
        p0 = Vector((loc[0] + rng.gauss(0, spread), loc[1] + rng.gauss(0, spread * 0.6), loc[2] + 0.0004))
        d = Vector((math.cos(a), math.sin(a), 0))
        side = Vector((-d.y, d.x, 0)) * 0.00035
        o = len(V)
        for k in range(5):
            p = p0 + d * L_ * k / 4 + Vector((0, 0, 0.0008 * math.sin(k)))
            V += [p - side, p + side]; FT += [k / 4] * 2; FR += [rng.random()] * 2
        for k in range(4): F.append((o + 2 * k, o + 2 * k + 1, o + 2 * k + 3, o + 2 * k + 2))
    return place(mesh_from('fibres', V, F, attrs={'ft': ('POINT', 'FLOAT', FT), 'fr': ('POINT', 'FLOAT', FR)}, mat=mat_jute()), coll=coll)

def glue_pot(loc, coll=None):
    glass = bpy.data.materials.get('jar_glass') or simple('jar_glass', (0.9, 0.92, 0.9), 0.05, Transmission_Weight=1.0, IOR=1.5)
    prof = [(0.018, 0.0), (0.02, 0.003), (0.02, 0.034), (0.015, 0.038), (0.015, 0.042)]
    j = place(lathe_mesh('pot', prof, 40, glass), loc, coll=coll)
    lid = place(lathe_mesh('lid', [(0.0165, 0.0), (0.0165, 0.008), (0.0005, 0.0085)], 40, simple('lid_tin', (0.5, 0.48, 0.44), 0.35, 1.0)), (loc[0], loc[1], loc[2] + 0.042), coll=coll)
    return j

def far_wall(y=3.2, w=12, h=4, z0=-0.76, col='#2b2a28'):
    me = box_mesh('farwall', w, 0.05, h, mat=simple('wall_paint', srgb(col), 0.9))
    return place(me, (0, y, z0))

def bokeh_bulbs(pts, strength=30.0, kelv=2700, r=0.02):
    m, nt = mat_new('bulb_%d' % kelv)
    if nt is not None:
        em = N(nt, 'ShaderNodeEmission', 0, 0, Strength=strength); em.inputs['Color'].default_value = (*kelv_wb(kelv), 1)
        out_node(nt, em.outputs[0])
    me = rock_mesh('bulb', 1, r=r, squash=(1, 1, 1), rough=0.0, subdiv=2, mat=m)
    out = []
    for p in pts:
        o = place(me, p); o.visible_shadow = False; out.append(o)
    return out

def exclude_from_light(light_obj, objs, name='excl'):
    c = bpy.data.collections.new(name)
    for o in objs: c.objects.link(o)
    light_obj.light_linking.receiver_collection = c
    for co in c.collection_objects:
        co.light_linking.link_state = 'EXCLUDE'
    return c

def screen_point(cam, u, v, dist):
    """world point at normalised frame coords (u,v in 0..1, origin bottom-left) at distance dist along view."""
    sc = bpy.context.scene
    cd = cam.data
    ar = sc.render.resolution_y / sc.render.resolution_x
    w = 2 * math.tan(math.atan(cd.sensor_width / (2 * cd.lens)))
    x = (u - 0.5 + cd.shift_x) * w
    y = (v - 0.5) * w * ar + cd.shift_y * w
    d = Vector((x, y, -1.0)).normalized() * dist
    return cam.matrix_world @ d

# ------------------------------------------------------------------ the ancestral world set
def polar(a, r): return (r * math.cos(math.radians(a)), r * math.sin(math.radians(a)))

def ancestral_set(fire_w=0.9, grass=620, with_people=True, flame_scale=1.45, walk=None, sit=None, huts=None, card_h=0.44):
    studio_floor()
    round_table()
    board()
    def extra(x, y):
        d = math.hypot(x, y)
        return -0.002 * max(0, 1 - d / 0.3)
    ground, hgt = ground_disc(extra=extra, ash_r=0.075)
    campfire((0, 0, hgt(0, 0) - 0.001), light_power=fire_w, flame_scale=flame_scale)
    people = {}
    sit = sit if sit is not None else [('far', 'sitHug', 92, 0.20), ('farR', 'sitKnees', 30, 0.205), ('farL', 'sitLean', 150, 0.245), ('nearL', 'sitPoke', 222, 0.2), ('nearR', 'sitKnees', 316, 0.205)]
    avoid = [(0, 0, 0.3)]
    if with_people:
        for key, pose, a, r in sit:
            x, y = polar(a, r)
            people[key] = manikin(pose, (x, y, hgt(x, y) - 0.001), face=(0, 0))
        cx, cy = polar(71, 0.215)
        people['child'] = manikin('sitHug', (cx, cy, hgt(cx, cy) - 0.001), face=(0, 0), scale=0.62)
        # poking stick
        bpy.context.view_layer.update()
        hp = jpos(people['nearL'], 'rWrist', (0, 0, -0.1))
        stick(hp + (hp - Vector((0, 0, 0.03))).normalized() * 0.02, Vector((0.0, 0.0, 0.035)).lerp(hp, 0.1), r=0.0014)
    hut = hut_mesh(door=math.radians(270))
    for a, r in (huts or [(62, 0.45), (116, 0.45), (163, 0.44), (232, 0.44), (332, 0.44)]):
        x, y = polar(a, r)
        rot = math.atan2(-x, y)
        place_hut(hut, (x, y, hgt(x, y) - 0.003), rot + math.pi, scale=random.Random(a).uniform(0.9, 1.08))
        avoid.append((x, y, 0.15))
    walk = walk if walk is not None else [('walk', 80, 0.535, 0), ('walkB', 90, 0.585, 0), ('walk', 196, 0.54, 0)]
    walkers = []
    for pose, a, r, dr in (walk if with_people else []):
        x, y = polar(a, r)
        o = manikin(pose, (x, y, hgt(x, y)), face=(x * 0.2, y * 0.2 + 0.02))
        walkers.append(o); avoid.append((x, y, 0.05))
    bpy.context.view_layer.update()
    if with_people and len(walkers) == 3:
        # digging stick carried by the left walker, bundle for the far one
        hp = jpos(walkers[2], 'rWrist', (0, 0, -0.1))
        stick(hp + Vector((0.01, 0.0, -0.09)), hp + Vector((-0.02, 0.0, 0.16)), r=0.0016)
        hp = jpos(walkers[1], 'lWrist', (0, 0, -0.1))
        bundle = rock_mesh('bundle', 3, r=0.014, squash=(1, 0.8, 1.2), rough=0.2, mat=mat_reed())
        place(bundle, hp + Vector((0, 0, -0.018)))
    for a, r, h, sd, cr in [(136, 0.575, 0.41, 3, 0.12), (14, 0.57, 0.31, 7, 0.09)]:
        x, y = polar(a, r)
        acacia((x, y, hgt(x, y)), h=h, seed=sd, crown=cr)
        avoid.append((x, y, 0.03))
    pebbles(hgt, n=90, r_in=0.06, r_out=0.58, avoid=[(0, 0, 0.05)])
    scatter_grass(hgt, r_in=0.26, r_out=0.6, count=grass, avoid=avoid,
                  cluster=lambda x, y: 0.3 + 0.7 * min(1, math.hypot(x, y) / 0.48))
    card = sky_card(r=0.655, a0=22, a1=158, h=card_h)
    # workshop context on the table rim
    paintbrush((0.52, -0.52, 0.0), 35)
    twine_spool((-0.6, -0.42, 0.0))
    loose_fibres((0.38, -0.62, 0.0), n=50)
    glue_pot((0.66, -0.2, 0.0))
    return people, walkers, card, hgt


# ------------------------------------------------------------------ modern props
TEX = WORK + '/tex/'
def mat_screen(img='feed0.png', strength=6.0, name=None, tint=(1, 1, 1), wash=0.0):
    name = name or ('screen_' + img)
    m, nt = mat_new(name)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -700, 0)
    it = nt.nodes.new('ShaderNodeTexImage'); it.location = (-450, 0)
    it.image = bpy.data.images.load(TEX + img, check_existing=True)
    L(nt, tc.outputs['UV'], it.inputs['Vector'])
    em = N(nt, 'ShaderNodeEmission', -150, 0, Strength=strength)
    lp = N(nt, 'ShaderNodeLightPath', -700, 300)
    cm = N(nt, 'ShaderNodeMix', -200, 250, p_data_type='RGBA')
    cm.name = 'CamSplit'
    L(nt, lp.outputs['Is Camera Ray'], cm.inputs['Factor'])
    cm.inputs[6].default_value = (0.3, 0.55, 1.0, 1)
    ws = N(nt, 'ShaderNodeMix', -350, 250, p_data_type='RGBA', Factor=wash)
    L(nt, it.outputs['Color'], ws.inputs[6]); ws.inputs[7].default_value = (1, 1, 1, 1)
    mx = N(nt, 'ShaderNodeMix', -300, 100, p_data_type='RGBA', p_blend_type='MULTIPLY', Factor=1.0)
    L(nt, ws.outputs[2], mx.inputs[6]); mx.inputs[7].default_value = (*tint, 1)
    mx.name = 'Tint'
    L(nt, mx.outputs[2], cm.inputs[7])
    L(nt, cm.outputs[2], em.inputs['Color'])
    gl = N(nt, 'ShaderNodeBsdfGlossy', -150, -200, Roughness=0.05); gl.inputs['Color'].default_value = (0.04, 0.04, 0.04, 1)
    ad = N(nt, 'ShaderNodeAddShader', 100, 0); L(nt, em.outputs[0], ad.inputs[0]); L(nt, gl.outputs[0], ad.inputs[1])
    out_node(nt, ad.outputs[0])
    return m

def quad_uv(name, w, h, mat):
    """plane in XZ (facing -Y), centred, with UVs"""
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UV')
    for i, co in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[i].uv = co
    me.materials.append(mat)
    return me

def phone(loc, facing_to, img='feed0.png', strength=6.0, size=(0.0125, 0.024), coll=None):
    """phone body + screen; screen faces the point facing_to"""
    body = box_mesh('phone_body', size[0] + 0.0012, 0.0016, size[1] + 0.0012, mat=simple('phone_black', (0.015, 0.015, 0.017), 0.3), bevel=0.0005, origin='center')
    scr = quad_uv('phone_screen', size[0], size[1], mat_screen(img, strength))
    d = (Vector(facing_to) - Vector(loc)).normalized()
    q = (-d).to_track_quat('Y', 'Z')
    b = place(body, loc, q.to_euler(), coll=coll)
    s = place(scr, Vector(loc) + d * 0.00082, q.to_euler(), coll=coll)
    return b, s

def mat_laminate(col='#d9d6cf'):
    return simple('laminate_' + col, srgb(col), 0.38, Coat_Weight=0.2)

def desk_unit(coll, pose='phoneDesk', img='feed0.png', scr_strength=6.0):
    """chair + desk + seated manikin holding a phone; origin = chair centre on the floor, facing -Y (manikin default)."""
    metal = simple('desk_metal', (0.03, 0.03, 0.032), 0.35, 0.8)
    lam = mat_laminate()
    parts = []
    # chair: seat top at 0.073
    seat = box_mesh('chair_seat', 0.06, 0.058, 0.004, mat=simple('chair_shell', srgb('#3b3f45'), 0.45), bevel=0.001)
    place(seat, (0, 0.004, 0.069), coll=coll)
    back = box_mesh('chair_back', 0.058, 0.004, 0.05, mat=simple('chair_shell', srgb('#3b3f45'), 0.45), bevel=0.001)
    place(back, (0, 0.034, 0.09), (math.radians(-8), 0, 0), coll=coll)
    leg = box_mesh('chair_leg', 0.003, 0.003, 0.069, mat=metal)
    for x in (-0.026, 0.026):
        for y in (-0.022, 0.03):
            place(leg, (x, y, 0), coll=coll)
    # desk in front (manikin faces -Y): near edge at y=-0.085
    top = box_mesh('desk_top', 0.19, 0.105, 0.006, mat=lam, bevel=0.0012)
    place(top, (0, -0.085 - 0.0525, 0.118), coll=coll)
    dleg = box_mesh('desk_leg', 0.004, 0.004, 0.118, mat=metal)
    for x in (-0.09, 0.09):
        for y in (-0.089, -0.186):
            place(dleg, (x, y, 0), coll=coll)
    m = manikin(pose, (0, 0.0, 0.0), rot=0, coll=coll)
    return m

# ------------------------------------------------------------------ cardboard / greyboard city
def mat_facade(name='facade', base='#8c8a86', kraft=False, floor_h=0.028, win_w=0.022, lit=0.35, warm=0.5, strength=3.0, rough=0.8):
    """Board facade with a grid of cut windows; lit windows emit (per-building attribute 'brand').
    Roofs (normal z) have no windows."""
    m, nt = mat_new(name)
    if nt is None: return m
    geo = N(nt, 'ShaderNodeNewGeometry', -1600, 0)
    br = N(nt, 'ShaderNodeAttribute', -1600, -400, p_attribute_name='brand')
    sepP = N(nt, 'ShaderNodeSeparateXYZ', -1400, 100); L(nt, geo.outputs['Position'], sepP.inputs[0])
    sepN = N(nt, 'ShaderNodeSeparateXYZ', -1400, -150); L(nt, geo.outputs['Normal'], sepN.inputs[0])
    anx = N(nt, 'ShaderNodeMath', -1250, -100, p_operation='ABSOLUTE'); L(nt, sepN.outputs[0], anx.inputs[0])
    any_ = N(nt, 'ShaderNodeMath', -1250, -200, p_operation='ABSOLUTE'); L(nt, sepN.outputs[1], any_.inputs[0])
    anz = N(nt, 'ShaderNodeMath', -1250, -300, p_operation='ABSOLUTE'); L(nt, sepN.outputs[2], anz.inputs[0])
    # u along facade = x*|ny| + y*|nx|
    u1 = N(nt, 'ShaderNodeMath', -1100, 100, p_operation='MULTIPLY'); L(nt, sepP.outputs[0], u1.inputs[0]); L(nt, any_.outputs[0], u1.inputs[1])
    u2 = N(nt, 'ShaderNodeMath', -1100, 0, p_operation='MULTIPLY_ADD'); L(nt, sepP.outputs[1], u2.inputs[0]); L(nt, anx.outputs[0], u2.inputs[1]); L(nt, u1.outputs[0], u2.inputs[2])
    uu = N(nt, 'ShaderNodeMath', -950, 100, p_operation='DIVIDE'); L(nt, u2.outputs[0], uu.inputs[0]); uu.inputs[1].default_value = win_w * 1.6
    vv = N(nt, 'ShaderNodeMath', -950, -50, p_operation='DIVIDE'); L(nt, sepP.outputs[2], vv.inputs[0]); vv.inputs[1].default_value = floor_h
    fu = N(nt, 'ShaderNodeMath', -800, 100, p_operation='FRACT'); L(nt, uu.outputs[0], fu.inputs[0])
    fv = N(nt, 'ShaderNodeMath', -800, -50, p_operation='FRACT'); L(nt, vv.outputs[0], fv.inputs[0])
    cu = N(nt, 'ShaderNodeMath', -800, 250, p_operation='FLOOR'); L(nt, uu.outputs[0], cu.inputs[0])
    cv = N(nt, 'ShaderNodeMath', -800, -200, p_operation='FLOOR'); L(nt, vv.outputs[0], cv.inputs[0])
    # window mask: |fu-.5|<.3 and |fv-.55|<.28
    mu = N(nt, 'ShaderNodeMapRange', -650, 100, From_Min=0.2, From_Max=0.8, To_Min=0.0, To_Max=1.0); L(nt, fu.outputs[0], mu.inputs['Value'])
    pu = N(nt, 'ShaderNodeMath', -500, 100, p_operation='PINGPONG'); L(nt, mu.outputs[0], pu.inputs[0]); pu.inputs[1].default_value = 0.5
    mv = N(nt, 'ShaderNodeMapRange', -650, -50, From_Min=0.3, From_Max=0.82, To_Min=0.0, To_Max=1.0); L(nt, fv.outputs[0], mv.inputs['Value'])
    pv = N(nt, 'ShaderNodeMath', -500, -50, p_operation='PINGPONG'); L(nt, mv.outputs[0], pv.inputs[0]); pv.inputs[1].default_value = 0.5
    inu = N(nt, 'ShaderNodeMath', -350, 100, p_operation='GREATER_THAN'); L(nt, pu.outputs[0], inu.inputs[0]); inu.inputs[1].default_value = 0.02
    inv = N(nt, 'ShaderNodeMath', -350, -50, p_operation='GREATER_THAN'); L(nt, pv.outputs[0], inv.inputs[0]); inv.inputs[1].default_value = 0.02
    win = N(nt, 'ShaderNodeMath', -200, 50, p_operation='MULTIPLY'); L(nt, inu.outputs[0], win.inputs[0]); L(nt, inv.outputs[0], win.inputs[1])
    wall = N(nt, 'ShaderNodeMath', -200, -300, p_operation='LESS_THAN'); L(nt, anz.outputs[0], wall.inputs[0]); wall.inputs[1].default_value = 0.5
    win2 = N(nt, 'ShaderNodeMath', -50, 50, p_operation='MULTIPLY'); L(nt, win.outputs[0], win2.inputs[0]); L(nt, wall.outputs[0], win2.inputs[1])
    # lit?  hash(cell, building)
    cc = N(nt, 'ShaderNodeCombineXYZ', -650, 350); L(nt, cu.outputs[0], cc.inputs[0]); L(nt, cv.outputs[0], cc.inputs[1]); L(nt, br.outputs['Fac'], cc.inputs[2])
    ccs = N(nt, 'ShaderNodeVectorMath', -500, 350, p_operation='MULTIPLY'); L(nt, cc.outputs[0], ccs.inputs[0]); ccs.inputs[1].default_value = (1.0, 1.0, 97.0)
    wn = N(nt, 'ShaderNodeTexWhiteNoise', -350, 350, p_noise_dimensions='3D'); L(nt, ccs.outputs[0], wn.inputs['Vector'])
    litm = N(nt, 'ShaderNodeMath', -200, 350, p_operation='LESS_THAN'); L(nt, wn.outputs['Value'], litm.inputs[0]); litm.inputs[1].default_value = lit
    em = N(nt, 'ShaderNodeMath', 0, 250, p_operation='MULTIPLY'); L(nt, litm.outputs[0], em.inputs[0]); L(nt, win2.outputs[0], em.inputs[1])
    wc = ramp(nt, [(0.0, srgb('#9cc4ff')), (1.0 - warm, srgb('#d8e6ff')), (min(0.999, 1.0 - warm + 0.01), srgb('#ffd8a0')), (1.0, srgb('#ffb866'))], 0, 500)
    L(nt, wn.outputs['Color'], wc.inputs[0]) if False else None
    sep_c = N(nt, 'ShaderNodeSeparateColor', -200, 550); L(nt, wn.outputs['Color'], sep_c.inputs[0])
    L(nt, sep_c.outputs[1], wc.inputs[0])
    ems = N(nt, 'ShaderNodeMath', 150, 250, p_operation='MULTIPLY'); L(nt, em.outputs[0], ems.inputs[0]); ems.inputs[1].default_value = strength
    # board colour + dark unlit window holes
    tc = N(nt, 'ShaderNodeTexCoord', -600, -600)
    fn = N(nt, 'ShaderNodeTexNoise', -400, -600, Scale=400.0, Detail=4.0); L(nt, tc.outputs['Object'], fn.inputs['Vector'])
    bc = ramp(nt, [(0.0, srgb(base)), (1.0, tuple(min(1, c * 1.25) for c in srgb(base)[:3]) + (1,))], -200, -600)
    L(nt, fn.outputs['Fac'], bc.inputs[0])
    hole = N(nt, 'ShaderNodeMix', 150, -300, p_data_type='RGBA')
    L(nt, win2.outputs[0], hole.inputs['Factor']); L(nt, bc.outputs[0], hole.inputs[6]); hole.inputs[7].default_value = (0.01, 0.01, 0.012, 1)
    p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.location = (400, 0)
    L(nt, hole.outputs[2], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    L(nt, wc.outputs[0], p.inputs['Emission Color']); L(nt, ems.outputs[0], p.inputs['Emission Strength'])
    b = N(nt, 'ShaderNodeBump', 200, -700, Strength=0.2, Distance=0.0003); L(nt, fn.outputs['Fac'], b.inputs['Height'])
    L(nt, b.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def blocks_mesh(name, boxes, mat, bevel=0.0012):
    """boxes: list of (x, y, w, d, h, z0). One mesh with a per-building random attribute 'brand'."""
    bm = bmesh.new()
    lay = bm.verts.layers.float.new('brand')
    rng = random.Random(len(boxes))
    for (x, y, w, d, h, z0) in boxes:
        r = rng.random()
        res = bmesh.ops.create_cube(bm, size=1.0)
        vs = res['verts']
        for v in vs:
            v.co.x = x + v.co.x * w; v.co.y = y + v.co.y * d; v.co.z = z0 + (v.co.z + 0.5) * h
            v[lay] = r
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(mat)
    return me

def city_grid(x0, x1, y0, y1, block=0.34, street=0.07, hmin=0.12, hmax=0.9, seed=1, skip=None, towers=0.15, z0=0.0):
    """list of boxes on a street grid; skip(x,y)->True to leave empty"""
    rng = random.Random(seed); boxes = []
    x = x0
    while x < x1:
        y = y0
        while y < y1:
            cx, cy = x + block / 2, y + block / 2
            if not (skip and skip(cx, cy)):
                # subdivide block into 1-4 buildings
                n = rng.choice([1, 2, 2, 3, 4])
                if n == 1:
                    parts = [(cx, cy, block * 0.92, block * 0.92)]
                elif n == 2:
                    parts = [(cx - block / 4, cy, block * 0.44, block * 0.9), (cx + block / 4, cy, block * 0.44, block * 0.9)]
                elif n == 3:
                    parts = [(cx - block / 4, cy - block / 4, block * 0.44, block * 0.44), (cx + block / 4, cy - block / 4, block * 0.44, block * 0.44), (cx, cy + block / 4, block * 0.9, block * 0.44)]
                else:
                    parts = [(cx + sx * block / 4, cy + sy * block / 4, block * 0.44, block * 0.44) for sx in (-1, 1) for sy in (-1, 1)]
                for (px, py, w, d) in parts:
                    h = rng.uniform(hmin, hmax * 0.5) if rng.random() > towers else rng.uniform(hmax * 0.6, hmax)
                    boxes.append((px, py, w, d, h, z0))
            y += block + street
        x += block + street
    return boxes

def dust_motes(center, size, n=300, seed=5, rmin=0.00012, rmax=0.00035, coll=None):
    rng = random.Random(seed)
    m, nt = mat_new('dust')
    if nt is not None:
        p = principled(nt, Base_Color=(0.9, 0.88, 0.85, 1), Roughness=0.6)
        tr = N(nt, 'ShaderNodeBsdfTranslucent', 0, -200); tr.inputs['Color'].default_value = (1, 0.97, 0.92, 1)
        mx = N(nt, 'ShaderNodeMixShader', 300, 0, Fac=0.5); L(nt, p.outputs[0], mx.inputs[1]); L(nt, tr.outputs[0], mx.inputs[2])
        out_node(nt, mx.outputs[0])
    me = rock_mesh('mote', 1, r=1.0, rough=0.2, subdiv=1, mat=m)
    for i in range(n):
        p = Vector(center) + Vector((rng.uniform(-0.5, 0.5) * size[0], rng.uniform(-0.5, 0.5) * size[1], rng.uniform(-0.5, 0.5) * size[2]))
        r = rng.uniform(rmin, rmax)
        o = place(me, p, (rng.random() * 6, rng.random() * 6, 0), (r, r * rng.uniform(0.5, 1.5), r * 0.7), name='mote', coll=coll)
        o.visible_shadow = False

# ------------------------------------------------------------------ farmland / brick / steel
def mat_brick():
    m, nt = mat_new('brick')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    mp = N(nt, 'ShaderNodeMapping', -750, 0); mp.inputs['Rotation'].default_value = (math.radians(90), 0, 0)
    L(nt, tc.outputs['Object'], mp.inputs['Vector'])
    br = N(nt, 'ShaderNodeTexBrick', -550, 0, Scale=1.0, Mortar_Size=0.0012)
    br.inputs['Brick Width'].default_value = 0.021; br.inputs['Row Height'].default_value = 0.0075
    br.inputs['Color1'].default_value = srgb('#9a4a32'); br.inputs['Color2'].default_value = srgb('#7a3522'); br.inputs['Mortar'].default_value = srgb('#b8ab98')
    L(nt, mp.outputs[0], br.inputs['Vector'])
    b = N(nt, 'ShaderNodeBump', -250, -250, Strength=0.5, Distance=0.0008); L(nt, br.outputs['Fac'], b.inputs['Height'])
    p = principled(nt, Roughness=0.85); p.location = (0, 0)
    L(nt, br.outputs['Color'], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def ploughed_field(x0, y0, w, d, rows=14, h=0.004, ang=0.0, coll=None):
    V, F = [], []
    nx = rows * 6
    for i in range(nx + 1):
        u = i / nx
        z = h * (0.5 + 0.5 * math.sin(u * rows * 2 * math.pi))
        V.append((u * w - w / 2, -d / 2, z)); V.append((u * w - w / 2, d / 2, z))
    for i in range(nx):
        a = 2 * i; F.append((a, a + 2, a + 3, a + 1))
    m = mat_earth()
    o = place(mesh_from('field', V, F, mat=m), (x0, y0, 0.0), (0, 0, ang), coll=coll)
    return o

def lattice_tower(base, h=0.5, w=0.05, taper=0.4, coll=None, mat=None):
    """steel lattice mast: 4 legs + cross bracing (thin tubes)"""
    mat = mat or simple('steel_paint', srgb('#8a8f94'), 0.4, 0.7)
    parts = []
    bx, by, bz = base
    def corner(k, t):
        s = w * (1 - taper * t) / 2
        cx = s if k in (0, 3) else -s
        cy = s if k in (0, 1) else -s
        return Vector((bx + cx, by + cy, bz + h * t))
    for k in range(4):
        parts.append(tube_path([corner(k, t / 8) for t in range(9)], 0.0012, sides=5))
    n = 8
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        for k in range(4):
            a, b = corner(k, t0), corner((k + 1) % 4, t1)
            parts.append(tube_path([a, (a + b) / 2, b], 0.0006, sides=4))
            a2, b2 = corner((k + 1) % 4, t0), corner(k, t1)
            parts.append(tube_path([a2, (a2 + b2) / 2, b2], 0.0006, sides=4))
    V, F = merge_parts(parts)
    return place(mesh_from('lattice', V, F, mat=mat), coll=coll)

def antenna_mast(base, h=0.6, coll=None):
    mat = simple('mast_steel', srgb('#a9adb0'), 0.3, 0.9)
    bx, by, bz = base
    parts = [tube_path([Vector((bx, by, bz + h * t / 6)) for t in range(7)], 0.0025, sides=8)]
    for zz, L_ in ((0.55, 0.06), (0.7, 0.045), (0.85, 0.03)):
        z = bz + h * zz
        parts.append(tube_path([Vector((bx - L_ / 2, by, z)), Vector((bx, by, z)), Vector((bx + L_ / 2, by, z))], 0.001, sides=5))
    V, F = merge_parts(parts)
    o = [place(mesh_from('mast', V, F, mat=mat), coll=coll)]
    dish = lathe_mesh('dish', [(0.0005, 0.0), (0.012, 0.002), (0.02, 0.006), (0.021, 0.0065)], 24, simple('dish_white', srgb('#d8d8d4'), 0.4))
    o.append(place(dish, (bx + 0.005, by - 0.004, bz + h * 0.42), (math.radians(80), 0, math.radians(30)), coll=coll))
    red = bokeh_bulbs([(bx, by, bz + h + 0.004)], strength=30, kelv=1500, r=0.0025)
    return o

def billboard(loc, w, h, img, strength=4.0, rot=0.0, coll=None, post_h=0.0):
    fr = box_mesh('bb_frame', w + 0.004, 0.004, h + 0.004, mat=simple('bb_black', (0.02, 0.02, 0.022), 0.4), origin='center')
    o = place(fr, (loc[0], loc[1], loc[2] + h / 2 + post_h), (0, 0, rot), coll=coll)
    sc_ = place(quad_uv('bb_screen', w, h, mat_screen(img, strength)), (0, -0.00205, 0), coll=coll)
    sc_.parent = o
    if post_h > 0:
        pst = box_mesh('bb_post', 0.004, 0.004, post_h, mat=simple('bb_black', (0.02, 0.02, 0.022), 0.4))
        p_ = place(pst, (loc[0], loc[1], loc[2]), coll=coll)
    return o

def windmill(base, h=0.22, coll=None, sail_rot=0.4):
    bx, by, bz = base
    plaster = simple('plaster_white', srgb('#d9d2c4'), 0.8)
    tw = lathe_mesh('mill_tower', [(0.045, 0.0), (0.042, 0.02), (0.032, h), (0.0005, h + 0.0005)], 32, plaster)
    objs = [place(tw, (bx, by, bz), coll=coll)]
    cap = lathe_mesh('mill_cap', [(0.036, 0.0), (0.034, 0.01), (0.02, 0.035), (0.0005, 0.045)], 32, mat_reed())
    objs.append(place(cap, (bx, by, bz + h - 0.004), coll=coll))
    wood = mat_beech_prop('mill_wood', 'Z')
    hub = Vector((bx, by - 0.04, bz + h + 0.012))
    parts = []
    for k in range(4):
        a = sail_rot + k * math.pi / 2
        d = Vector((math.cos(a), 0, math.sin(a)))
        side = Vector((-math.sin(a), 0, math.cos(a)))
        L_ = 0.13
        parts.append(tube_path([hub + d * L_ * t / 4 for t in range(5)], 0.0016, sides=5))
        for t in range(1, 6):
            p = hub + d * (0.03 + L_ * 0.75 * t / 5)
            parts.append(tube_path([p, p + side * 0.028], 0.0007, sides=4))
        parts.append(tube_path([hub + d * 0.03 + side * 0.028, hub + d * L_ + side * 0.028], 0.0008, sides=4))
    V, F = merge_parts(parts)
    objs.append(place(mesh_from('sails', V, F, mat=wood), coll=coll))
    return objs

def round_tree(base, h=0.16, r=0.05, seed=1, coll=None):
    bx, by, bz = base
    tr = tube_path([Vector((bx, by, bz + h * 0.6 * t / 4)) for t in range(5)], 0.004, sides=6)
    objs = [place(mesh_from('rtrunk', tr[0], tr[1], mat=mat_wire_trunk()), coll=coll)]
    sp = mat_sponge('sponge_round', '#2a3a18', '#4f6a2a', '#8a9a4a')
    objs += canopy((bx, by, bz + h * 0.74), r * 0.8, r * 0.8, r * 0.75, n=34, rmin=r * 0.22, rmax=r * 0.36, seed=seed, mat=sp, coll=coll)
    return objs

def fence(p0, p1, n=10, h=0.022, coll=None):
    wood = mat_beech_prop('fence_wood', 'Z'); p0, p1 = Vector(p0), Vector(p1)
    parts = []
    for i in range(n + 1):
        p = p0.lerp(p1, i / n)
        parts.append(tube_path([p, p + Vector((0, 0, h))], 0.0012, sides=5))
    for zz in (0.35, 0.8):
        parts.append(tube_path([p0 + Vector((0, 0, h * zz)), p1 + Vector((0, 0, h * zz))], 0.0008, sides=4))
    V, F = merge_parts(parts)
    return place(mesh_from('fence', V, F, mat=wood), coll=coll)

# ------------------------------------------------------------------ marble run
def catmull(pts, n=8):
    pts = [Vector(p) for p in pts]
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return out

def channel(name, path, W=0.018, D=0.0095, t=0.002, mat=None, coll=None, arc=10):
    """sweep a U profile (opening up) along path points"""
    ri = W / 2 - t
    prof = [(-W / 2, D), (-W / 2, 0.0), (W / 2, 0.0), (W / 2, D)]
    for k in range(arc + 1):
        a = k / arc * math.pi
        prof.append((ri * math.cos(a), D - ri * math.sin(a) * 0.95))
    np_ = len(prof)
    V, F = [], []
    n = len(path)
    for i, p in enumerate(path):
        T = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
        U = Vector((0, 0, 1)); U = (U - T * U.dot(T)).normalized()
        S = T.cross(U).normalized()
        for (px, py) in prof:
            V.append(p + S * px + U * py)
    for i in range(n - 1):
        for k in range(np_):
            a = i * np_ + k; b = i * np_ + (k + 1) % np_
            F.append((a, b, b + np_, a + np_))
    # end caps
    F.append(tuple(range(np_ - 1, -1, -1)))
    F.append(tuple((n - 1) * np_ + k for k in range(np_)))
    me = mesh_from(name, V, F, smooth=False, mat=mat or mat_beech_prop('track_wood', 'X'))
    return place(me, coll=coll)

def helix_path(center, r, z_top, z_bot, turns, a0=0.0, n=120, ccw=True):
    cx, cy = center
    out = []
    for i in range(n + 1):
        t = i / n
        a = a0 + (1 if ccw else -1) * t * turns * 2 * math.pi
        out.append(Vector((cx + r * math.cos(a), cy + r * math.sin(a), z_top + (z_bot - z_top) * t)))
    return out

def dowel(p_bottom, p_top, r=0.0035, coll=None, mat=None):
    v, f = tube_path([Vector(p_bottom).lerp(Vector(p_top), t / 4) for t in range(5)], r, sides=10)
    return place(mesh_from('post', v, f, mat=mat or mat_beech_prop('post_wood', 'Z')), coll=coll)

def cup(loc, r=0.016, h=0.02, coll=None, mat=None):
    prof = [(0.0005, 0.0), (r * 0.8, 0.0), (r, 0.004), (r * 1.02, h * 0.7), (r * 1.08, h), (r * 0.9, h), (r * 0.85, h * 0.6), (r * 0.6, 0.004), (0.0005, 0.004)]
    me = lathe_mesh('cup', prof, 40, mat or mat_beech_prop('cup_wood', 'Z'))
    return place(me, loc, coll=coll)

def marble_mat(col):
    m, nt = mat_new('marble_' + col)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -700, 0)
    wv = N(nt, 'ShaderNodeTexWave', -500, 0, Scale=180.0, Distortion=6.0, Detail=3.0, p_wave_type='RINGS')
    L(nt, tc.outputs['Object'], wv.inputs['Vector'])
    c = ramp(nt, [(0.0, srgb(col)), (1.0, tuple(x * 0.72 for x in srgb(col)[:3]) + (1,))], -250, 0)
    L(nt, wv.outputs['Fac'], c.inputs[0])
    p = principled(nt, Roughness=0.35); p.location = (0, 0)
    p.inputs['Coat Weight'].default_value = 0.5; p.inputs['Coat Roughness'].default_value = 0.15
    L(nt, c.outputs[0], p.inputs['Base Color'])
    out_node(nt, p.outputs[0])
    return m

def marble(loc, col='#d9b48a', r=0.0075, coll=None):
    me = bpy.data.meshes.get('marble_mesh')
    if me is None:
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1.0)
        me = bpy.data.meshes.new('marble_mesh'); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
    o = add_obj('marble', me, coll)
    o.data = me
    o.location = loc; o.scale = (r, r, r)
    o.active_material = None
    mat = marble_mat(col)
    if len(o.material_slots) == 0:
        o.data.materials.append(None) if len(me.materials) == 0 else None
    o.material_slots[0].link = 'OBJECT'; o.material_slots[0].material = mat
    return o

def mat_tag(img):
    m, nt = mat_new('tag_' + img)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -700, 0)
    it = nt.nodes.new('ShaderNodeTexImage'); it.location = (-450, 0)
    it.image = bpy.data.images.load(TEX + img, check_existing=True)
    L(nt, tc.outputs['UV'], it.inputs['Vector'])
    p = principled(nt, Roughness=0.8); p.location = (0, 0)
    L(nt, it.outputs['Color'], p.inputs['Base Color'])
    tr = N(nt, 'ShaderNodeBsdfTranslucent', 0, -250); L(nt, it.outputs['Color'], tr.inputs['Color'])
    mx = N(nt, 'ShaderNodeMixShader', 300, 0, Fac=0.15); L(nt, p.outputs[0], mx.inputs[1]); L(nt, tr.outputs[0], mx.inputs[2])
    out_node(nt, mx.outputs[0])
    return m

def tag(img, anchor, w=0.034, h=0.017, drop=0.02, yaw=0.0, tilt=0.0, coll=None):
    """manila tag hanging on a string from anchor point; tag plane faces -Y after yaw."""
    cut = h * 0.28
    verts = [(0, 0, -h / 2 + cut), (cut, 0, -h / 2), (w, 0, -h / 2), (w, 0, h / 2), (cut, 0, h / 2), (0, 0, h / 2 - cut)]
    uvs = [((x) / w, (z + h / 2) / h) for (x, y, z) in verts]
    me = bpy.data.meshes.new('tag')
    me.from_pydata(verts, [], [tuple(range(6))])
    uv = me.uv_layers.new(name='UV')
    for i, li in enumerate(me.polygons[0].loop_indices):
        uv.data[li].uv = uvs[me.loops[li].vertex_index]
    me.materials.append(mat_tag(img))
    a = Vector(anchor)
    hole = a + Vector((0, 0, -drop))
    o = place(me, hole, (tilt, 0, yaw), coll=coll)
    sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.0004
    # hang: rotate so hole is at the tag's left end (pivot at origin = left point)
    o.location = hole - Matrix.Rotation(yaw, 4, 'Z') @ Vector((w * 0.1, 0, 0))
    o.rotation_euler = (tilt, math.radians(12), yaw)  # hangs nearly level, a little droop
    s = tube_path([a, a.lerp(hole, 0.5) + Vector((0.001, 0, 0)), hole], 0.0003, sides=4)
    place(mesh_from('string', s[0], s[1], mat=mat_twine()), coll=coll)
    return o

def mat_acrylic():
    m, nt = mat_new('acrylic')
    if nt is None: return m
    p = principled(nt, Base_Color=(0.95, 0.97, 1.0, 1), Roughness=0.04, Transmission_Weight=1.0, IOR=1.49)
    out_node(nt, p.outputs[0])
    return m

def spiral_station(center, top_z=0.24, bot_z=0.07, r=0.048, turns=2.6, a0=0.0, coll=None, tagimg=None, cam_yaw=0.0, marbles=(), feed_from=None, tag_w=0.06):
    """one endless spiral: feeder track -> helix around a dowel -> return lift tube back to the top; empty cup beside."""
    cx, cy = center
    hp = helix_path((cx, cy), r, top_z, bot_z, turns, a0=a0, n=int(90 * turns))
    objs = [channel('helix', hp, coll=coll)]
    objs.append(dowel((cx, cy, 0), (cx, cy, top_z + (0.115 if tagimg else 0.05)), r=0.006, coll=coll))
    # support arms from dowel to helix every half turn
    for k in range(int(turns * 2) + 1):
        i = min(len(hp) - 1, int(k * len(hp) / (turns * 2)))
        p = hp[i]
        objs.append(dowel((cx, cy, p.z - 0.004), (p.x, p.y, p.z - 0.004), r=0.0018, coll=coll))
    # return lift: acrylic tube from helix bottom back up to the top
    b = hp[-1]; t_ = hp[0]
    out_dir = (Vector((b.x - cx, b.y - cy, 0))).normalized()
    lift_b = b + out_dir * 0.03 + Vector((0, 0, -0.01))
    lift_t = t_ + out_dir * 0.03 + Vector((0, 0, 0.02))
    lp = [b, b.lerp(lift_b, 0.5) + Vector((0, 0, -0.012)), lift_b, lift_b.lerp(lift_t, 0.33), lift_b.lerp(lift_t, 0.66), lift_t, t_.lerp(lift_t, 0.5) + Vector((0, 0, 0.012)), t_ + Vector((0, 0, 0.012))]
    v, f = tube_path(catmull(lp, 6), 0.0105, sides=16, cap=False)
    tube = place(mesh_from('lift', v, f, mat=mat_acrylic()), coll=coll)
    tube.visible_shadow = False
    objs.append(tube)
    # the cup it never reaches
    cpos = b + out_dir * 0.085 + Vector((0, 0, 0))
    objs.append(cup((cpos.x, cpos.y, 0.0), r=0.018, h=0.024, coll=coll))
    # feeder from centre
    if feed_from is not None:
        fp = catmull([feed_from, Vector(feed_from).lerp(t_, 0.5) + Vector((0, 0, 0.01)), t_ + Vector((0, 0, 0.004))], 16)
        objs.append(channel('feeder', fp, coll=coll))
        mid = fp[len(fp) // 2]
        objs.append(dowel((mid.x, mid.y, 0), (mid.x, mid.y, mid.z - 0.001), r=0.003, coll=coll))
    # marbles on the helix
    cols = ['#c43d2b', '#2f6fb0', '#e0b24a', '#3f8a4a', '#d9b48a', '#8a4fb0']
    for k, frac in enumerate(marbles):
        p = hp[int(frac * (len(hp) - 1))]
        marble((p.x, p.y, p.z + 0.009), cols[(k + int(a0 * 10)) % len(cols)], r=0.0075, coll=coll)
    if tagimg:
        anchor = Vector((cx, cy, top_z + 0.11))
        objs.append(tag(tagimg, anchor, w=tag_w, h=0.03, drop=0.012, yaw=cam_yaw, coll=coll))
    return objs, hp

def mat_brass():
    m, nt = mat_new('brass')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -600, 0)
    nz = N(nt, 'ShaderNodeTexNoise', -400, -200, Scale=600.0, Detail=3.0); L(nt, tc.outputs['Object'], nz.inputs['Vector'])
    r = N(nt, 'ShaderNodeMapRange', -200, -200, To_Min=0.22, To_Max=0.38); L(nt, nz.outputs['Fac'], r.inputs['Value'])
    p = principled(nt, Base_Color=srgb('#c9a24e'), Metallic=1.0); p.location = (0, 0)
    L(nt, r.outputs[0], p.inputs['Roughness'])
    out_node(nt, p.outputs[0])
    return m

def gear_mesh(name, r=0.04, teeth=18, t=0.006, hole=0.004, mat=None):
    pts = []
    for k in range(teeth * 4):
        a = 2 * math.pi * k / (teeth * 4)
        rr = r if (k % 4) in (1, 2) else r * 0.86
        pts.append((rr * math.cos(a), rr * math.sin(a)))
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]:
        v.co.z += t
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(mat or mat_beech_prop('gear_wood', 'Z'))
    return me

def coin(loc, rot=(0, 0, 0), coll=None):
    me = bpy.data.meshes.get('coin_mesh') or cyl_mesh('coin_mesh', 0.0068, 0.0013, seg=40, mat=mat_brass(), bevel=0.0003)
    return place(me, loc, rot, coll=coll)

def coin_box(loc, w=0.1, d=0.07, h=0.065, coll=None):
    wal = mat_walnut()
    x, y, z = loc
    objs = [place(box_mesh('cbox', w, d, h - 0.004, mat=wal, bevel=0.0015), (x, y, z), coll=coll)]
    # lid in two halves leaving a slot
    for sgn in (-1, 1):
        objs.append(place(box_mesh('lid', w, d / 2 - 0.004, 0.004, mat=wal, bevel=0.001), (x, y + sgn * (d / 4 + 0.002), z + h - 0.004), coll=coll))
    slot = box_mesh('slot', w * 0.5, 0.004, 0.002, mat=simple('slot_dark', (0.005, 0.004, 0.003), 0.9))
    objs.append(place(slot, (x, y, z + h - 0.003), coll=coll))
    return objs

# ------------------------------------------------------------------ corrugated cardboard + dollhouse furniture
def mat_cardboard(name='cardboard', col='#b48a5a', t=0.006, pitch=0.0075):
    """kraft liner faces; on faces whose normal is local -Y (the cut front edge) show the flute cross-section.
    Object must be a slab centred at origin with its thickness along local Z."""
    m, nt = mat_new(name)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -1400, 0)
    sep = N(nt, 'ShaderNodeSeparateXYZ', -1200, 0); L(nt, tc.outputs['Object'], sep.inputs[0])
    nrm = N(nt, 'ShaderNodeVectorTransform', -1400, -300, p_vector_type='NORMAL', p_convert_from='WORLD', p_convert_to='OBJECT')
    geo = N(nt, 'ShaderNodeNewGeometry', -1600, -300); L(nt, geo.outputs['Normal'], nrm.inputs[0])
    sn = N(nt, 'ShaderNodeSeparateXYZ', -1200, -300); L(nt, nrm.outputs[0], sn.inputs[0])
    edge = N(nt, 'ShaderNodeMath', -1000, -300, p_operation='LESS_THAN'); L(nt, sn.outputs[1], edge.inputs[0]); edge.inputs[1].default_value = -0.5
    # flute: z - A sin(2 pi x / pitch)
    xs = N(nt, 'ShaderNodeMath', -1000, 100, p_operation='MULTIPLY'); L(nt, sep.outputs[0], xs.inputs[0]); xs.inputs[1].default_value = 2 * math.pi / pitch
    sn_ = N(nt, 'ShaderNodeMath', -850, 100, p_operation='SINE'); L(nt, xs.outputs[0], sn_.inputs[0])
    amp = N(nt, 'ShaderNodeMath', -700, 100, p_operation='MULTIPLY'); L(nt, sn_.outputs[0], amp.inputs[0]); amp.inputs[1].default_value = t * 0.36
    dz = N(nt, 'ShaderNodeMath', -550, 100, p_operation='SUBTRACT'); L(nt, sep.outputs[2], dz.inputs[0]); L(nt, amp.outputs[0], dz.inputs[1])
    adz = N(nt, 'ShaderNodeMath', -400, 100, p_operation='ABSOLUTE'); L(nt, dz.outputs[0], adz.inputs[0])
    flute = N(nt, 'ShaderNodeMath', -250, 100, p_operation='LESS_THAN'); L(nt, adz.outputs[0], flute.inputs[0]); flute.inputs[1].default_value = 0.00035
    az = N(nt, 'ShaderNodeMath', -550, -80, p_operation='ABSOLUTE'); L(nt, sep.outputs[2], az.inputs[0])
    liner = N(nt, 'ShaderNodeMath', -400, -80, p_operation='GREATER_THAN'); L(nt, az.outputs[0], liner.inputs[0]); liner.inputs[1].default_value = t / 2 - 0.0005
    paper = N(nt, 'ShaderNodeMath', -100, 50, p_operation='MAXIMUM'); L(nt, flute.outputs[0], paper.inputs[0]); L(nt, liner.outputs[0], paper.inputs[1])
    hole = N(nt, 'ShaderNodeMath', 50, 0, p_operation='SUBTRACT'); hole.inputs[0].default_value = 1.0; L(nt, paper.outputs[0], hole.inputs[1])
    hole2 = N(nt, 'ShaderNodeMath', 200, 0, p_operation='MULTIPLY'); L(nt, hole.outputs[0], hole2.inputs[0]); L(nt, edge.outputs[0], hole2.inputs[1])
    # kraft surface with fibres
    fn = N(nt, 'ShaderNodeTexNoise', -600, -500, Scale=900.0, Detail=5.0); L(nt, tc.outputs['Object'], fn.inputs['Vector'])
    kc = ramp(nt, [(0.0, tuple(x * 0.82 for x in srgb(col)[:3]) + (1,)), (1.0, tuple(min(1, x * 1.08) for x in srgb(col)[:3]) + (1,))], -300, -500)
    L(nt, fn.outputs['Fac'], kc.inputs[0])
    mx = N(nt, 'ShaderNodeMix', 350, -200, p_data_type='RGBA')
    L(nt, hole2.outputs[0], mx.inputs['Factor']); L(nt, kc.outputs[0], mx.inputs[6]); mx.inputs[7].default_value = (0.03, 0.02, 0.012, 1)
    b = N(nt, 'ShaderNodeBump', 300, -500, Strength=0.25, Distance=0.0002); L(nt, fn.outputs['Fac'], b.inputs['Height'])
    p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.location = (600, 0)
    L(nt, mx.outputs[2], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    p.inputs['Roughness'].default_value = 0.85
    out_node(nt, p.outputs[0])
    return m

def slab(name, cx, cy, cz, sx, sy, t, vertical=False, mat=None, coll=None):
    """cardboard slab; thickness t along local Z. vertical=True -> wall (thickness along X)."""
    me = box_mesh(name, sx, sy, t, mat=mat or mat_cardboard(), origin='center')
    if vertical:
        return place(me, (cx, cy, cz), (0, math.radians(90), 0), coll=coll)
    return place(me, (cx, cy, cz), coll=coll)

def mat_wallpaper(name, col, pattern='plain', col2=None):
    m, nt = mat_new(name)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    c1 = srgb(col); c2 = srgb(col2) if col2 else tuple(x * 0.9 for x in c1[:3]) + (1,)
    if pattern == 'stripes':
        wv = N(nt, 'ShaderNodeTexWave', -600, 0, Scale=90.0, Distortion=0.0, p_wave_type='BANDS', p_bands_direction='X')
        L(nt, tc.outputs['Object'], wv.inputs['Vector'])
        r = N(nt, 'ShaderNodeMath', -400, 0, p_operation='GREATER_THAN'); L(nt, wv.outputs['Fac'], r.inputs[0]); r.inputs[1].default_value = 0.6
        fac = r.outputs[0]
    elif pattern == 'dots':
        vo = N(nt, 'ShaderNodeTexVoronoi', -600, 0, Scale=160.0, Randomness=0.0)
        L(nt, tc.outputs['Object'], vo.inputs['Vector'])
        r = N(nt, 'ShaderNodeMath', -400, 0, p_operation='LESS_THAN'); L(nt, vo.outputs['Distance'], r.inputs[0]); r.inputs[1].default_value = 0.18
        fac = r.outputs[0]
    else:
        nz = N(nt, 'ShaderNodeTexNoise', -600, 0, Scale=60.0, Detail=3.0); L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        r = N(nt, 'ShaderNodeMapRange', -400, 0, To_Min=0.0, To_Max=0.35); L(nt, nz.outputs['Fac'], r.inputs['Value'])
        fac = r.outputs[0]
    mx = N(nt, 'ShaderNodeMix', -200, 0, p_data_type='RGBA'); L(nt, fac, mx.inputs['Factor']); mx.inputs[6].default_value = c1; mx.inputs[7].default_value = c2
    p = principled(nt, Roughness=0.8); p.location = (0, 0)
    L(nt, mx.outputs[2], p.inputs['Base Color'])
    out_node(nt, p.outputs[0])
    return m

def emissive(name, col, strength):
    m, nt = mat_new(name)
    if nt is None: return m
    em = N(nt, 'ShaderNodeEmission', 0, 0, Strength=strength); em.inputs['Color'].default_value = col if len(col) == 4 else (*col, 1)
    out_node(nt, em.outputs[0])
    return m

def rbox(name, sx, sy, sz, col, loc, rough=0.7, bevel=0.002, rot=(0, 0, 0), coll=None, mat=None):
    me = box_mesh(name, sx, sy, sz, mat=mat or simple(name + '_' + col, srgb(col), rough), bevel=bevel)
    return place(me, loc, rot, coll=coll)

def mat_tiles(name='tiles', col='#e9e7e1', grout='#9d9a92', size=0.012, rot=False):
    m, nt = mat_new(name)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    mp = N(nt, 'ShaderNodeMapping', -750, 0)
    if rot: mp.inputs['Rotation'].default_value = (math.radians(90), 0, 0)
    L(nt, tc.outputs['Object'], mp.inputs['Vector'])
    br = N(nt, 'ShaderNodeTexBrick', -550, 0, Scale=1.0, Mortar_Size=size * 0.07, p_offset=0.0)
    br.inputs['Brick Width'].default_value = size; br.inputs['Row Height'].default_value = size
    br.inputs['Color1'].default_value = srgb(col); br.inputs['Color2'].default_value = tuple(x * 0.96 for x in srgb(col)[:3]) + (1,)
    br.inputs['Mortar'].default_value = srgb(grout)
    L(nt, mp.outputs[0], br.inputs['Vector'])
    b = N(nt, 'ShaderNodeBump', -250, -250, Strength=0.3, Distance=0.0006, p_invert=True); L(nt, br.outputs['Fac'], b.inputs['Height'])
    rg = N(nt, 'ShaderNodeMapRange', -250, -450, To_Min=0.12, To_Max=0.7); L(nt, br.outputs['Fac'], rg.inputs['Value'])
    p = principled(nt); p.location = (0, 0)
    L(nt, br.outputs['Color'], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal']); L(nt, rg.outputs[0], p.inputs['Roughness'])
    p.inputs['Coat Weight'].default_value = 0.3
    out_node(nt, p.outputs[0])
    return m

# ------------------------------------------------------------------ the new world: timber + glass homes, solar, tram
def mat_larch():
    """vertical timber cladding: pale larch boards with gaps (object coords, boards along Z)"""
    m, nt = mat_new('larch_clad')
    if nt is None: return m
    geo = N(nt, 'ShaderNodeNewGeometry', -1200, 0)
    sepP = N(nt, 'ShaderNodeSeparateXYZ', -1000, 100); L(nt, geo.outputs['Position'], sepP.inputs[0])
    sepN = N(nt, 'ShaderNodeSeparateXYZ', -1000, -150); L(nt, geo.outputs['Normal'], sepN.inputs[0])
    anx = N(nt, 'ShaderNodeMath', -850, -100, p_operation='ABSOLUTE'); L(nt, sepN.outputs[0], anx.inputs[0])
    any_ = N(nt, 'ShaderNodeMath', -850, -200, p_operation='ABSOLUTE'); L(nt, sepN.outputs[1], any_.inputs[0])
    u1 = N(nt, 'ShaderNodeMath', -700, 100, p_operation='MULTIPLY'); L(nt, sepP.outputs[0], u1.inputs[0]); L(nt, any_.outputs[0], u1.inputs[1])
    u2 = N(nt, 'ShaderNodeMath', -700, 0, p_operation='MULTIPLY_ADD'); L(nt, sepP.outputs[1], u2.inputs[0]); L(nt, anx.outputs[0], u2.inputs[1]); L(nt, u1.outputs[0], u2.inputs[2])
    bw = N(nt, 'ShaderNodeMath', -550, 0, p_operation='DIVIDE'); L(nt, u2.outputs[0], bw.inputs[0]); bw.inputs[1].default_value = 0.012
    fr = N(nt, 'ShaderNodeMath', -400, 0, p_operation='FRACT'); L(nt, bw.outputs[0], fr.inputs[0])
    fl = N(nt, 'ShaderNodeMath', -400, 150, p_operation='FLOOR'); L(nt, bw.outputs[0], fl.inputs[0])
    wn = N(nt, 'ShaderNodeTexWhiteNoise', -250, 150, p_noise_dimensions='1D'); L(nt, fl.outputs[0], wn.inputs['W'])
    gap = N(nt, 'ShaderNodeMath', -250, 0, p_operation='LESS_THAN'); L(nt, fr.outputs[0], gap.inputs[0]); gap.inputs[1].default_value = 0.08
    tc = N(nt, 'ShaderNodeTexCoord', -1200, -400)
    gr = N(nt, 'ShaderNodeTexNoise', -800, -400, Detail=3.0); mp = N(nt, 'ShaderNodeMapping', -1000, -400); mp.inputs['Scale'].default_value = (1500, 1500, 40)
    L(nt, tc.outputs['Object'], mp.inputs['Vector']); L(nt, mp.outputs[0], gr.inputs['Vector'])
    c = ramp(nt, [(0.0, srgb('#c9a578')), (0.5, srgb('#dcc095')), (1.0, srgb('#b58d60'))], -50, 150)
    mx = N(nt, 'ShaderNodeMath', -100, 250, p_operation='MULTIPLY_ADD'); L(nt, wn.outputs['Value'], mx.inputs[0]); mx.inputs[1].default_value = 0.6; L(nt, gr.outputs['Fac'], mx.inputs[2])
    mx2 = N(nt, 'ShaderNodeMath', 0, 250, p_operation='MULTIPLY'); L(nt, mx.outputs[0], mx2.inputs[0]); mx2.inputs[1].default_value = 0.62
    L(nt, mx2.outputs[0], c.inputs[0])
    gm = N(nt, 'ShaderNodeMix', 200, 50, p_data_type='RGBA'); L(nt, gap.outputs[0], gm.inputs['Factor']); L(nt, c.outputs[0], gm.inputs[6]); gm.inputs[7].default_value = (0.05, 0.035, 0.02, 1)
    b = N(nt, 'ShaderNodeBump', 200, -250, Strength=0.3, Distance=0.0006, p_invert=True); L(nt, gap.outputs[0], b.inputs['Height'])
    p = principled(nt, Roughness=0.7); p.location = (450, 0)
    L(nt, gm.outputs[2], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def mat_solar():
    m, nt = mat_new('solar')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -800, 0)
    br = N(nt, 'ShaderNodeTexBrick', -550, 0, Scale=1.0, Mortar_Size=0.0004, p_offset=0.0)
    br.inputs['Brick Width'].default_value = 0.008; br.inputs['Row Height'].default_value = 0.008
    br.inputs['Color1'].default_value = srgb('#15213a'); br.inputs['Color2'].default_value = srgb('#182642'); br.inputs['Mortar'].default_value = srgb('#9aa4b0')
    L(nt, tc.outputs['Object'], br.inputs['Vector'])
    p = principled(nt, Roughness=0.12); p.location = (0, 0)
    p.inputs['Coat Weight'].default_value = 1.0; p.inputs['Coat Roughness'].default_value = 0.03
    L(nt, br.outputs['Color'], p.inputs['Base Color'])
    out_node(nt, p.outputs[0])
    return m

def timber_house(loc, w=0.15, d=0.11, h=0.085, rot=0.0, roof='gable', solar=True, glow=3.0, green=False, coll=None, seed=0):
    """pale timber and glass home. Front (glazed) faces -Y locally."""
    x, y, z = loc
    root = bpy.data.objects.new('house', None); (coll or bpy.context.scene.collection).objects.link(root)
    root.location = loc; root.rotation_euler = (0, 0, rot)
    lar = mat_larch()
    body = place(box_mesh('hbody', w, d, h, mat=lar, bevel=0.0008), (0, 0, 0), coll=coll); body.parent = root
    # interior glow box (seen through the glass)
    glowm = emissive('interior_%d' % int(glow * 10), (1.0, 0.72, 0.42), glow)
    gi = place(box_mesh('hglow', w * 0.8, 0.002, h * 0.62, mat=glowm), (0, -d / 2 + 0.006, h * 0.12), coll=coll); gi.parent = root
    glass = simple('window_glass', (0.9, 0.95, 1.0), 0.02, Transmission_Weight=1.0, IOR=1.45)
    frame = simple('window_frame', srgb('#3c3a36'), 0.4, 0.5)
    gw = place(box_mesh('hglass', w * 0.82, 0.003, h * 0.66, mat=glass), (0, -d / 2 - 0.0005, h * 0.1), coll=coll); gw.parent = root
    for fx in (-w * 0.41, -w * 0.14, w * 0.14, w * 0.41):
        f_ = place(box_mesh('mull', 0.003, 0.005, h * 0.66, mat=frame), (fx, -d / 2 - 0.0012, h * 0.1), coll=coll); f_.parent = root
    for fz in (h * 0.1, h * 0.76):
        f_ = place(box_mesh('trans', w * 0.83, 0.005, 0.003, mat=frame), (0, -d / 2 - 0.0012, fz), coll=coll); f_.parent = root
    # roof
    rm = simple('roof_metal', srgb('#4a4d50'), 0.45, 0.6) if not green else mat_foam('#5e7a38')
    if roof == 'gable':
        rh = 0.05
        V = [(-w / 2 - 0.008, -d / 2 - 0.008, h), (w / 2 + 0.008, -d / 2 - 0.008, h), (w / 2 + 0.008, d / 2 + 0.008, h), (-w / 2 - 0.008, d / 2 + 0.008, h),
             (-w / 2 - 0.008, 0, h + rh), (w / 2 + 0.008, 0, h + rh)]
        F = [(0, 1, 5, 4), (2, 3, 4, 5)]
        r_ = place(mesh_from('roof', V, F, smooth=False, mat=rm), coll=coll); r_.parent = root
        sol = r_.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.004
        gab = mesh_from('gable', [(-w / 2, -d / 2, h), (-w / 2, d / 2, h), (-w / 2, 0, h + rh), (w / 2, -d / 2, h), (w / 2, d / 2, h), (w / 2, 0, h + rh)], [(0, 1, 2), (5, 4, 3)], smooth=False, mat=lar)
        g_ = place(gab, coll=coll); g_.parent = root
        if solar:
            ang = math.atan2(rh, d / 2 + 0.008)
            sp = place(box_mesh('solar', w * 0.8, (d / 2) * 0.8, 0.002, mat=mat_solar(), origin='center'), (0, -d / 4 - 0.002, h + rh / 2 + 0.004), (-ang, 0, 0), coll=coll)
            sp.parent = root
    else:
        r_ = place(box_mesh('flatroof', w + 0.012, d + 0.012, 0.006, mat=rm), (0, 0, h), coll=coll); r_.parent = root
        if solar:
            for k in range(3):
                sp = place(box_mesh('solar', w * 0.26, d * 0.7, 0.002, mat=mat_solar(), origin='center'), (-w * 0.3 + k * w * 0.3, 0, h + 0.014), (math.radians(-20), 0, 0), coll=coll)
                sp.parent = root
    return root

def rails_circle(r=0.55, z=0.0, coll=None):
    steel = simple('rail_steel', (0.55, 0.55, 0.56), 0.3, 1.0)
    parts = []
    for rr in (r - 0.016, r + 0.016):
        pts = [Vector((rr * math.cos(a), rr * math.sin(a), z + 0.003)) for a in [2 * math.pi * k / 200 for k in range(201)]]
        parts.append(tube_path(pts, 0.0012, sides=6, cap=False))
    V, F = merge_parts(parts)
    objs = [place(mesh_from('rails', V, F, mat=steel), coll=coll)]
    sl = box_mesh('sleeper', 0.005, 0.046, 0.002, mat=mat_beech_prop('sleeper_wood', 'Y'))
    for k in range(120):
        a = 2 * math.pi * k / 120
        objs.append(place(sl, (r * math.cos(a), r * math.sin(a), z), (0, 0, a), coll=coll))
    return objs

def tram(center_r, ang, z=0.0, coll=None):
    """small two-section tram car sitting on the circular track at angle ang"""
    paint = simple('tram_paint', srgb('#d9d2bd'), 0.35, Coat_Weight=0.6)
    band = simple('tram_band', srgb('#3f6f63'), 0.4, Coat_Weight=0.6)
    glass = simple('tram_glass', (0.12, 0.13, 0.14), 0.03, Metallic=0.2)
    glowm = emissive('tram_interior', (1.0, 0.78, 0.5), 3.0)
    objs = []
    for k, da in enumerate((-0.16, 0.16)):
        a = ang + da
        px, py = center_r * math.cos(a), center_r * math.sin(a)
        rot = a + math.pi / 2
        root = bpy.data.objects.new('tramcar', None); (coll or bpy.context.scene.collection).objects.link(root)
        root.location = (px, py, z + 0.006); root.rotation_euler = (0, 0, rot)
        L_, W_, H_ = 0.17, 0.05, 0.06
        b = place(box_mesh('tbody', L_, W_, H_, mat=paint, bevel=0.006), coll=coll); b.parent = root
        s = place(box_mesh('tband', L_ + 0.001, W_ + 0.001, 0.008, mat=band), (0, 0, 0.004), coll=coll); s.parent = root
        for sy in (-1, 1):
            gl = place(box_mesh('tglow', L_ * 0.86, 0.001, 0.022, mat=glowm), (0, sy * (W_ / 2 + 0.0003), 0.026), coll=coll); gl.parent = root
            for kx in range(1, 6):
                mu = place(box_mesh('tmull', 0.003, 0.0014, 0.022, mat=paint), (-L_ * 0.43 + kx * L_ * 0.86 / 6, sy * (W_ / 2 + 0.0006), 0.026), coll=coll); mu.parent = root
        if k == 1:
            pg = tube_path([Vector((0, 0, H_)), Vector((0.012, 0, H_ + 0.02)), Vector((-0.005, 0, H_ + 0.034))], 0.0007, sides=4)
            pp = place(mesh_from('panto', pg[0], pg[1], mat=simple('panto_black', (0.03, 0.03, 0.03), 0.5)), coll=coll); pp.parent = root
        objs.append(root)
    return objs

def raised_bed(loc, w=0.1, d=0.05, rot=0.0, coll=None, seed=0):
    x, y, z = loc
    frame = place(box_mesh('bedframe', w, d, 0.014, mat=mat_beech_prop('bed_wood', 'X'), bevel=0.001), loc, (0, 0, rot), coll=coll)
    soil = place(box_mesh('soil', w - 0.006, d - 0.006, 0.0125, mat=simple('soil', srgb('#3b2a1e'), 0.95)), (x, y, z + 0.0015), (0, 0, rot), coll=coll)
    rng = random.Random(seed); fm = mat_foam('#5f8a3a')
    for i in range(int(w / 0.014)):
        for j in range(2):
            u = -w / 2 + 0.008 + i * 0.014; v = -d / 4 + j * d / 2
            p = Matrix.Rotation(rot, 3, 'Z') @ Vector((u, v, 0))
            me = rock_mesh('plant', seed * 40 + i * 2 + j, r=rng.uniform(0.004, 0.0065), squash=(1, 1, 0.8), rough=0.5, mat=fm)
            place(me, (x + p.x, y + p.y, z + 0.016), coll=coll)
    return frame

def mat_moss():
    m, nt = mat_new('moss_ground')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    n1 = N(nt, 'ShaderNodeTexNoise', -700, 150, Scale=14.0, Detail=6.0); L(nt, tc.outputs['Object'], n1.inputs['Vector'])
    vo = N(nt, 'ShaderNodeTexVoronoi', -700, -200, Scale=700.0); L(nt, tc.outputs['Object'], vo.inputs['Vector'])
    c = ramp(nt, [(0.0, srgb('#3d4f22')), (0.45, srgb('#5a6e2e')), (0.7, srgb('#7a8a3e')), (1.0, srgb('#8f8a4a'))], -400, 150)
    L(nt, n1.outputs['Fac'], c.inputs[0])
    b = N(nt, 'ShaderNodeBump', -300, -250, Strength=0.6, Distance=0.0012); L(nt, vo.outputs['Distance'], b.inputs['Height'])
    p = principled(nt, Roughness=0.95); p.location = (0, 0)
    p.inputs['Sheen Weight'].default_value = 0.4
    L(nt, c.outputs[0], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def mat_gravel():
    m, nt = mat_new('gravel')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    vo = N(nt, 'ShaderNodeTexVoronoi', -700, 0, Scale=900.0); L(nt, tc.outputs['Object'], vo.inputs['Vector'])
    c = ramp(nt, [(0.0, srgb('#b8ab92')), (0.5, srgb('#d7cbb2')), (1.0, srgb('#9d917b'))], -400, 150)
    L(nt, vo.outputs['Color'], c.inputs[0])
    b = N(nt, 'ShaderNodeBump', -300, -250, Strength=0.5, Distance=0.0006); L(nt, vo.outputs['Distance'], b.inputs['Height'])
    p = principled(nt, Roughness=0.9); p.location = (0, 0)
    L(nt, c.outputs[0], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def annulus(name, r0, r1, z, mat, segs=160):
    V, F = [], []
    for k in range(segs):
        a = 2 * math.pi * k / segs
        V.append((r0 * math.cos(a), r0 * math.sin(a), z)); V.append((r1 * math.cos(a), r1 * math.sin(a), z))
    for k in range(segs):
        a = 2 * k; b = 2 * ((k + 1) % segs)
        F.append((a, b, b + 1, a + 1))
    return place(mesh_from(name, V, F, mat=mat))

def long_table(center, L_=0.42, W_=0.1, h=0.118, rot=0.0, coll=None, bench=True):
    wood = mat_beech_prop('table_wood', 'X')
    x, y, z = center
    objs = [place(box_mesh('ltop', L_, W_, 0.006, mat=wood, bevel=0.001), (x, y, z + h - 0.006), (0, 0, rot), coll=coll)]
    Rm = Matrix.Rotation(rot, 3, 'Z')
    for sx in (-1, 1):
        for sy in (-1, 1):
            p = Rm @ Vector((sx * (L_ / 2 - 0.02), sy * (W_ / 2 - 0.012), 0))
            objs.append(place(box_mesh('lleg', 0.006, 0.006, h - 0.006, mat=wood), (x + p.x, y + p.y, z), coll=coll))
    if bench:
        for sy in (-1, 1):
            p = Rm @ Vector((0, sy * 0.085, 0))
            objs.append(place(box_mesh('bench', L_, 0.034, 0.006, mat=wood, bevel=0.001), (x + p.x, y + p.y, z + 0.066), (0, 0, rot), coll=coll))
            for sx in (-1, 1):
                q = Rm @ Vector((sx * (L_ / 2 - 0.03), sy * 0.085, 0))
                objs.append(place(box_mesh('bleg', 0.006, 0.024, 0.066, mat=wood), (x + q.x, y + q.y, z), (0, 0, rot), coll=coll))
    return objs

def new_world_set(evening=False, grass=260):
    """the new world on the round table. Returns (people, card, hgt)."""
    studio_floor(); round_table(); board()
    ground, hgt = ground_disc(ash_r=0.001)
    ground.data.materials[0] = mat_moss()
    z = 0.024
    annulus('path_ring', 0.27, 0.315, z + 0.0035, mat_gravel())
    annulus('garden_edge', 0.18, 0.187, z + 0.004, mat_beech_prop('edge_wood', 'X'))
    people = {}
    # the long table in the shared garden
    long_table((0, 0.0, z), L_=0.42, rot=math.radians(8))
    Rm = Matrix.Rotation(math.radians(8), 3, 'Z')
    poses_a = ['tableA', 'tableC', 'tableD', 'tableE']
    poses_b = ['tableF', 'tableB', 'tableA', 'tableD']
    for i in range(4):
        u = -0.14 + i * 0.093
        pa = Rm @ Vector((u, -0.085, 0)); pb = Rm @ Vector((u + 0.01, 0.085, 0))
        people['a%d' % i] = manikin(poses_a[i], (pa.x, pa.y, z), rot=8 + 180)
        people['b%d' % i] = manikin(poses_b[i], (pb.x, pb.y, z), rot=8)
    # bowls and a lamp on the table
    wood = mat_beech_prop('bowl_wood', 'Z')
    for i in range(4):
        p = Rm @ Vector((-0.13 + i * 0.085, 0.0, 0))
        place(lathe_mesh('bowl', [(0.0005, 0.0), (0.008, 0.0), (0.012, 0.006), (0.013, 0.008)], 24, wood), (p.x, p.y, z + 0.118))
    # garden: raised beds, fruit trees
    for k, (a, r) in enumerate([(35, 0.235), (145, 0.235), (215, 0.24), (325, 0.24)]):
        x, y = polar(a, r)
        raised_bed((x, y, z), w=0.09, d=0.045, rot=math.radians(a + 90), seed=k)
    for k, (a, r) in enumerate([(90, 0.235), (268, 0.232), (180, 0.36), (0, 0.37)]):
        x, y = polar(a, r)
        round_tree((x, y, z), h=0.17, r=0.05, seed=10 + k)
    # homes around the garden
    for k, (a, r, w, roof, grn, hh) in enumerate([(42, 0.46, 0.19, 'gable', False, 0.15), (80, 0.48, 0.2, 'flat', True, 0.17), (117, 0.48, 0.2, 'gable', False, 0.16),
                                              (155, 0.46, 0.19, 'flat', False, 0.15), (200, 0.45, 0.17, 'gable', False, 0.14), (345, 0.45, 0.17, 'flat', True, 0.14)]):
        x, y = polar(a, r)
        rot = math.atan2(-x, y)
        timber_house((x, y, z), w=w, d=0.13, h=hh, rot=rot, roof=roof, green=grn, glow=4.5 if evening else 2.2, seed=k)
    rails_circle(0.565, z)
    tram(0.565, math.radians(300))
    # people on the paths and in the garden
    for pose, a, r in [('walk', 318, 0.47)]:
        x, y = polar(a, r)
        people[pose + str(a)] = manikin(pose, (x, y, z), face=(0.0, 0.0))
    x, y = polar(145, 0.19)
    people['garden'] = manikin('kneelPlant', (x, y, z), face=polar(145, 0.26))
    cx_, cy_ = polar(20, 0.3)
    people['child'] = manikin('walk', (cx_, cy_, z + 0.004), face=polar(40, 0.3), scale=0.62)
    card = sky_card(r=0.655, a0=22, a1=158, h=0.44)
    paintbrush((0.52, -0.52, 0.0), 35); twine_spool((-0.6, -0.42, 0.0)); glue_pot((0.66, -0.2, 0.0))
    return people, card, hgt

# ------------------------------------------------------------------ studio gear (real scale)
def mat_chrome():
    return simple('chrome_stand', (0.82, 0.82, 0.8), 0.18, 1.0)

def mat_gaffer(col='#2b2b2b'):
    m, nt = mat_new('gaffer_' + col)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -600, 0)
    wv = N(nt, 'ShaderNodeTexWave', -400, -200, Scale=900.0, Distortion=1.0, p_wave_type='BANDS'); L(nt, tc.outputs['Object'], wv.inputs['Vector'])
    b = N(nt, 'ShaderNodeBump', -200, -200, Strength=0.15, Distance=0.0002); L(nt, wv.outputs['Fac'], b.inputs['Height'])
    p = principled(nt, Base_Color=srgb(col), Roughness=0.75); p.location = (0, 0)
    p.inputs['Sheen Weight'].default_value = 0.3
    L(nt, b.outputs[0], p.inputs['Normal'])
    out_node(nt, p.outputs[0])
    return m

def tube_between(p0, p1, r, mat, name='tube', sides=10):
    p0, p1 = Vector(p0), Vector(p1)
    v, f = tube_path([p0.lerp(p1, t / 3) for t in range(4)], r, sides=sides)
    return place(mesh_from(name, v, f, mat=mat))

def c_stand(base, h=1.9, arm_to=None, flag=True, rot=0.0, floor=-0.76):
    ch = mat_chrome(); blk = simple('grip_black', (0.02, 0.02, 0.022), 0.45)
    bx, by = base
    objs = []
    col_top = Vector((bx, by, floor + h))
    objs.append(tube_between((bx, by, floor + 0.12), col_top, 0.012, ch, 'cs_col'))
    objs.append(tube_between((bx, by, floor + 0.12), (bx, by, floor + 0.9), 0.016, ch, 'cs_col2'))
    for k, lh in enumerate((0.1, 0.18, 0.26)):
        a = rot + k * 2 * math.pi / 3
        foot = Vector((bx + 0.42 * math.cos(a), by + 0.42 * math.sin(a), floor + 0.012 + 0.008 * k))
        objs.append(tube_between((bx, by, floor + lh), foot, 0.009, ch, 'cs_leg'))
        objs.append(tube_between(foot + Vector((0, 0, lh * 0.6)), foot, 0.008, ch, 'cs_legv'))
    if arm_to is not None:
        at = Vector(arm_to)
        head = col_top + Vector((0, 0, -0.05))
        objs.append(place(box_mesh('knuckle', 0.05, 0.05, 0.05, mat=blk, bevel=0.005, origin='center'), head))
        objs.append(tube_between(head, at, 0.009, ch, 'cs_arm'))
        if flag:
            d = (at - head).normalized()
            fl = box_mesh('flag', 0.45, 0.006, 0.6, mat=simple('flag_cloth', (0.015, 0.015, 0.015), 0.95), origin='center')
            objs.append(place(fl, at + d * 0.22 + Vector((0, 0, -0.2)), (0, 0, math.atan2(d.y, d.x) + math.pi / 2)))
    return objs

def fresnel_on_stand(base, head_h, target, floor=-0.76, on=True, power=300, kelv=3000):
    ch = mat_chrome(); blk = simple('lamp_black2', (0.025, 0.025, 0.028), 0.5, 0.3)
    bx, by = base
    top = Vector((bx, by, head_h))
    tube_between((bx, by, floor + 0.3), top, 0.016, ch, 'ls_col')
    for k in range(3):
        a = k * 2 * math.pi / 3 + 0.3
        tube_between((bx, by, floor + 0.35), (bx + 0.45 * math.cos(a), by + 0.45 * math.sin(a), floor + 0.01), 0.011, blk, 'ls_leg')
    d = (Vector(target) - top).normalized()
    q = d.to_track_quat('Z', 'Y').to_euler()
    body = cyl_mesh('fres_body', 0.13, 0.3, seg=40, mat=blk, z0=-0.3)
    place(body, top + Vector((0, 0, 0.12)), q)
    lens = cyl_mesh('fres_lens', 0.1, 0.006, seg=40, mat=emissive('fres_glow', kelv_wb(kelv), 30.0 if on else 0.0))
    place(lens, top + Vector((0, 0, 0.12)) + d * 0.002, q)
    for k in range(4):
        a = k * math.pi / 2
        flap = box_mesh('barndoor', 0.2, 0.004, 0.12, mat=blk, origin='center')
        Rq = q.to_matrix()
        off = Rq @ Vector((0.12 * math.cos(a), 0.12 * math.sin(a), 0.07))
        o = place(flap, top + Vector((0, 0, 0.12)) + off, q)
        o.rotation_euler.rotate_axis('Z', a + math.pi / 2)
    if on:
        lt = light('SPOT', top + Vector((0, 0, 0.12)) + d * 0.03, target, energy=power, kelv=kelv, size=0.08, spot=35, blend=0.4, name='fresnel')
        return lt

def floor_tape_T(loc, rot=0.0, col='#e8e2d0', floor=-0.76):
    m = mat_gaffer(col)
    x, y = loc
    a = place(box_mesh('tapeA', 0.3, 0.05, 0.0012, mat=m), (x, y, floor + 0.0005), (0, 0, rot))
    Rm = Matrix.Rotation(rot, 3, 'Z')
    off = Rm @ Vector((0, -0.13, 0))
    b = place(box_mesh('tapeB', 0.05, 0.25, 0.0012, mat=m), (x + off.x, y + off.y, floor + 0.0006), (0, 0, rot))
    return a, b

def cable(pts, r=0.008, floor=-0.76):
    P = catmull([Vector((x, y, floor + r)) if len(p) == 2 else Vector(p) for p in pts for (x, y) in [p[:2]]], 8)
    v, f = tube_path(P, r, sides=8)
    return place(mesh_from('cable', v, f, mat=simple('cable_rubber', (0.012, 0.012, 0.012), 0.55)))

def apple_box(loc, rot=0.0, floor=-0.76):
    ply = wood_generic('plywood_box', srgb('#c9a674'), srgb('#b8905e'), srgb('#8a6640'), ring=0.004, rough=(0.55, 0.75), coat=0.0, axis='X', warp=0.02, bump=0.1, dirt=0.4)
    return place(box_mesh('applebox', 0.5, 0.3, 0.2, mat=ply, bevel=0.003), (loc[0], loc[1], floor), (0, 0, rot))

# ------------------------------------------------------------------ wooden artist's hand model (life size)
def capsule_mesh(name, L_, r0, r1, mat):
    prof = [(0.0005, -r0 * 0.9), (r0 * 0.7, -r0 * 0.6), (r0, 0.0), (r1, L_), (r1 * 0.7, L_ + r1 * 0.6), (0.0005, L_ + r1 * 0.9)]
    return lathe_mesh(name, prof, 24, mat)

def wooden_hand(wrist_pos, palm_dir=(0, 0, -1), finger_dir=(0, -1, 0), curl=(35, 40, 30), spread=6, thumb_curl=30, scale=1.0, mat=None, name='hand'):
    """Articulated wooden hand model. Palm faces palm_dir; fingers extend along finger_dir from the knuckles."""
    mat = mat or mat_beech_prop('hand_beech', 'Z')
    s = scale
    root = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(root)
    fd = Vector(finger_dir).normalized(); pd = Vector(palm_dir).normalized()
    side = fd.cross(pd).normalized()
    M = Matrix((side, fd, -pd)).transposed()  # local x=side, y=finger, z=back of hand
    root.matrix_world = Matrix.Translation(Vector(wrist_pos)) @ M.to_4x4()
    # palm block (rounded box) and wrist dowel
    palm = place(box_mesh('palm', 0.078 * s, 0.085 * s, 0.026 * s, mat=mat, bevel=0.009 * s, origin='center'), (0, 0.05 * s, 0)); palm.parent = root
    wr = place(capsule_mesh('wrist', 0.16 * s, 0.024 * s, 0.021 * s, mat), (0, 0.0, 0), (math.radians(90), 0, 0)); wr.parent = root
    ball = rock_mesh('wball', 1, r=0.02 * s, rough=0.0, mat=mat); b = place(ball, (0, 0.005 * s, 0)); b.parent = root
    # fingers
    lens = [(0.046, 0.028, 0.022), (0.05, 0.032, 0.024), (0.047, 0.03, 0.022), (0.038, 0.024, 0.019)]
    xs = [-0.03, -0.01, 0.01, 0.029]
    for i in range(4):
        base = Vector((xs[i] * s, 0.093 * s, 0.0))
        parent = root
        ang_spread = math.radians(spread * (i - 1.5))
        cur = Matrix.Translation(base) @ Matrix.Rotation(ang_spread, 4, 'Z')
        acc = Matrix.Identity(4)
        for j, L_ in enumerate(lens[i]):
            L_ *= s
            rot = Matrix.Rotation(math.radians(curl[j]), 4, 'X')
            cur = cur @ rot
            seg = place(capsule_mesh('phal', L_ - 0.006 * s, 0.0085 * s * (1 - 0.08 * j), 0.0078 * s * (1 - 0.08 * j), mat), (0, 0, 0))
            seg.parent = root
            seg.matrix_parent_inverse = Matrix.Identity(4)
            seg.matrix_basis = cur @ Matrix.Rotation(math.radians(-90), 4, 'X')
            jb = place(rock_mesh('knk', 2, r=0.0086 * s, rough=0.0, mat=mat)); jb.parent = root; jb.matrix_basis = cur.copy()
            cur = cur @ Matrix.Translation((0, L_, 0))
    # thumb from the palm side
    cur = Matrix.Translation((-0.042 * s, 0.035 * s, -0.008 * s)) @ Matrix.Rotation(math.radians(40), 4, 'Z') @ Matrix.Rotation(math.radians(-25), 4, 'Y')
    for j, L_ in enumerate((0.04, 0.032, 0.026)):
        L_ *= s
        cur = cur @ Matrix.Rotation(math.radians(thumb_curl if j else 10), 4, 'X')
        seg = place(capsule_mesh('thumb', L_ - 0.006 * s, 0.0105 * s, 0.009 * s, mat)); seg.parent = root
        seg.matrix_basis = cur @ Matrix.Rotation(math.radians(-90), 4, 'X')
        jb = place(rock_mesh('knk', 3, r=0.0098 * s, rough=0.0, mat=mat)); jb.parent = root; jb.matrix_basis = cur.copy()
        cur = cur @ Matrix.Translation((0, L_, 0))
    return root

def string_lights(p0, p1, n=14, sag=0.03, strength=30.0, r=0.0022):
    p0, p1 = Vector(p0), Vector(p1)
    pts = []
    for i in range(n + 1):
        t = i / n
        p = p0.lerp(p1, t) - Vector((0, 0, sag * 4 * t * (1 - t)))
        pts.append(p)
    v, f = tube_path(catmull(pts, 4), 0.0004, sides=4)
    place(mesh_from('lightwire', v, f, mat=simple('wire_dark', (0.02, 0.02, 0.02), 0.5)))
    bulbs = bokeh_bulbs([p - Vector((0, 0, 0.004)) for p in pts[1:-1]], strength=strength, kelv=2400, r=r)
    return bulbs

def carved_text(text, loc, size=0.05, depth=0.003, rot_z=0.0, font='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', target=None):
    cu = bpy.data.curves.new('txt', 'FONT')
    cu.body = text
    cu.font = bpy.data.fonts.load(font, check_existing=True)
    cu.size = size; cu.extrude = depth; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    cu.resolution_u = 6
    ob = bpy.data.objects.new('txt', cu); bpy.context.scene.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = (0, 0, rot_z)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    tm = bpy.data.objects.new('txtmesh', me); bpy.context.scene.collection.objects.link(tm)
    tm.matrix_world = ob.matrix_world.copy()
    bpy.data.objects.remove(ob, do_unlink=True)
    if target is not None:
        mod = target.modifiers.new('carve', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = tm; mod.solver = 'EXACT'
        tm.hide_render = True; tm.hide_viewport = True
    return tm

# ------------------------------------------------------------------ P02 tools
def knapped_flint(name='flint', L_=0.03, W_=0.02, T_=0.009, cuts=46, seed=3, mat=None):
    rng = random.Random(seed)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
    for v in bm.verts:
        x, y, z = v.co
        taper = 1.0 - 0.45 * (y + 1) / 2        # pointed toward +y
        v.co = Vector((x * W_ / 2 * taper, y * L_ / 2, z * T_ / 2 * (0.6 + 0.4 * taper)))
    # knapping: flatten verts beyond random planes (conchoidal facets)
    for c in range(cuts):
        n = Vector((rng.uniform(-1, 1), rng.uniform(-0.6, 0.6), rng.choice([-1, 1]) * rng.uniform(0.6, 1.4))).normalized()
        dmax = max(v.co.dot(n) for v in bm.verts)
        d0 = dmax * rng.uniform(0.72, 0.9)
        for v in bm.verts:
            h = v.co.dot(n)
            if h > d0:
                # slightly concave scar
                v.co -= n * (h - d0) * 1.04
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    me.materials.append(mat or mat_flint())
    return me

def mat_flint():
    m, nt = mat_new('flint')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    n1 = N(nt, 'ShaderNodeTexNoise', -700, 150, Scale=120.0, Detail=8.0, Roughness=0.7); L(nt, tc.outputs['Object'], n1.inputs['Vector'])
    n2 = N(nt, 'ShaderNodeTexNoise', -700, -150, Scale=40.0, Detail=4.0); L(nt, tc.outputs['Object'], n2.inputs['Vector'])
    c = ramp(nt, [(0.0, srgb('#1e1a18')), (0.45, srgb('#3a322b')), (0.7, srgb('#5b4d40')), (1.0, srgb('#8a7a66'))], -400, 150)
    L(nt, n1.outputs['Fac'], c.inputs[0])
    cort = N(nt, 'ShaderNodeMapRange', -400, -150, From_Min=0.62, From_Max=0.68, To_Min=0.0, To_Max=1.0); L(nt, n2.outputs['Fac'], cort.inputs['Value'])
    mx = N(nt, 'ShaderNodeMix', -150, 100, p_data_type='RGBA'); L(nt, cort.outputs[0], mx.inputs['Factor']); L(nt, c.outputs[0], mx.inputs[6]); mx.inputs[7].default_value = srgb('#cbbfa8')
    rg = N(nt, 'ShaderNodeMapRange', -150, -200, To_Min=0.18, To_Max=0.75); L(nt, cort.outputs[0], rg.inputs['Value'])
    b = N(nt, 'ShaderNodeBump', -150, -400, Strength=0.2, Distance=0.0002); L(nt, n1.outputs['Fac'], b.inputs['Height'])
    p = principled(nt); p.location = (100, 0)
    L(nt, mx.outputs[2], p.inputs['Base Color']); L(nt, rg.outputs[0], p.inputs['Roughness']); L(nt, b.outputs[0], p.inputs['Normal'])
    p.inputs['Subsurface Weight'].default_value = 0.15; p.inputs['Subsurface Radius'].default_value = (0.002, 0.0015, 0.001)
    out_node(nt, p.outputs[0])
    return m

def wooden_wheel(r=0.017, t=0.005, coll=None):
    wd = mat_beech_prop('wheel_wood', 'X')
    parts = []
    disc = cyl_mesh('wheel_disc', r, t, seg=64, mat=wd, bevel=0.0008)
    o = place(disc, coll=coll)
    hub = cyl_mesh('wheel_hub', r * 0.28, t * 1.8, seg=32, mat=mat_walnut(), bevel=0.0005, z0=-t * 0.4)
    h = place(hub, coll=coll); h.parent = o
    for dx in (-r * 0.36, r * 0.36):
        sl = place(box_mesh('wheel_seam', 0.0004, 2 * math.sqrt(r * r - dx * dx) * 0.98, 0.0002, mat=simple('seam_dark', (0.1, 0.07, 0.05), 0.8), origin='center'), (dx, 0, t + 0.00005), coll=coll)
        sl.parent = o
    for k in range(2):
        pin = cyl_mesh('peg', 0.0012, 0.0003, seg=12, mat=mat_walnut(), z0=t)
        p_ = place(pin, (0, (k - 0.5) * r * 1.3, 0), coll=coll); p_.parent = o
    return o

def brass_lens(r=0.011, coll=None):
    ring = lathe_mesh('lens_ring', [(r, -0.0016), (r + 0.0016, -0.0016), (r + 0.0016, 0.0016), (r, 0.0016)], 48, mat_brass())
    o = place(ring, coll=coll)
    glass = simple('lens_glass', (0.97, 0.98, 1.0), 0.0, Transmission_Weight=1.0, IOR=1.52)
    prof = [(0.0005, -0.0022), (r * 0.5, -0.0018), (r * 0.85, -0.001), (r + 0.0002, 0.0), (r * 0.85, 0.001), (r * 0.5, 0.0018), (0.0005, 0.0022)]
    g = place(lathe_mesh('lens_glass', prof, 48, glass), coll=coll); g.parent = o
    handle = capsule_mesh('lens_handle', 0.018, 0.0022, 0.0026, mat_walnut())
    hh = place(handle, (r + 0.001, 0, 0), (0, math.radians(90), 0), coll=coll); hh.parent = o
    return o

def circuit_board(w=0.034, d=0.024, coll=None):
    m, nt = mat_new('pcb')
    if nt is not None:
        tc = N(nt, 'ShaderNodeTexCoord', -700, 0)
        it = nt.nodes.new('ShaderNodeTexImage'); it.location = (-450, 0); it.image = bpy.data.images.load(TEX + 'pcb.png', check_existing=True)
        L(nt, tc.outputs['UV'], it.inputs['Vector'])
        p = principled(nt, Roughness=0.3); p.location = (0, 0)
        p.inputs['Coat Weight'].default_value = 0.6; p.inputs['Coat Roughness'].default_value = 0.15
        L(nt, it.outputs['Color'], p.inputs['Base Color'])
        out_node(nt, p.outputs[0])
    me = box_mesh('pcb', w, d, 0.0012, mat=m)
    # UV map top face by x/y
    uvl = me.uv_layers.new(name='UV')
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = ((co.x + w / 2) / w, (co.y + d / 2) / d)
    o = place(me, coll=coll)
    blk = simple('ic_black', (0.02, 0.02, 0.022), 0.35)
    pin = simple('ic_pin', (0.75, 0.75, 0.72), 0.25, 1.0)
    rng = random.Random(3)
    for (x, y, sx, sy) in ((-0.006, 0.002, 0.011, 0.008), (0.009, -0.003, 0.007, 0.007), (0.01, 0.007, 0.005, 0.003)):
        c = place(box_mesh('ic', sx, sy, 0.0012, mat=blk, bevel=0.0002), (x, y, 0.0012), coll=coll); c.parent = o
        for k in range(int(sx / 0.0012)):
            for sgn in (-1, 1):
                pp = place(box_mesh('pin', 0.0004, 0.0012, 0.0005, mat=pin), (x - sx / 2 + 0.0008 + k * 0.0012, y + sgn * (sy / 2 + 0.0004), 0.0012), coll=coll); pp.parent = o
    for k in range(4):
        cap_ = cyl_mesh('cap', 0.0012, 0.003, seg=16, mat=simple('cap_blue', srgb('#2a4c8a'), 0.3))
        c = place(cap_, (-0.012 + k * 0.003, -0.008, 0.0012), coll=coll); c.parent = o
    return o

def felt_cloth(loc, w, d, col='#1c2433'):
    m, nt = mat_new('felt_' + col)
    if nt is not None:
        tc = N(nt, 'ShaderNodeTexCoord', -700, 0)
        nz = N(nt, 'ShaderNodeTexNoise', -500, 0, Scale=3000.0, Detail=2.0); L(nt, tc.outputs['Object'], nz.inputs['Vector'])
        b = N(nt, 'ShaderNodeBump', -300, -200, Strength=0.25, Distance=0.0002); L(nt, nz.outputs['Fac'], b.inputs['Height'])
        p = principled(nt, Base_Color=srgb(col), Roughness=1.0); p.location = (0, 0)
        p.inputs['Sheen Weight'].default_value = 1.0; p.inputs['Sheen Roughness'].default_value = 0.35; p.inputs['Sheen Tint'].default_value = (0.7, 0.75, 0.9, 1)
        L(nt, b.outputs[0], p.inputs['Normal'])
        out_node(nt, p.outputs[0])
    return place(box_mesh('felt', w, d, 0.0015, mat=m, bevel=0.0005), loc)


# ------------------------------------------------------------------ crafted foliage: sponge / lichen clumps
def mat_sponge(name='sponge', c0='#2f3a1c', c1='#5b6a2e', c2='#9a9a5a'):
    m, nt = mat_new(name)
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -1100, 0)
    oi = N(nt, 'ShaderNodeObjectInfo', -1100, 300)
    vo = N(nt, 'ShaderNodeTexVoronoi', -800, -250, Scale=900.0, p_feature='F1'); L(nt, tc.outputs['Object'], vo.inputs['Vector'])
    vo2 = N(nt, 'ShaderNodeTexVoronoi', -800, -500, Scale=2600.0); L(nt, tc.outputs['Object'], vo2.inputs['Vector'])
    n1 = N(nt, 'ShaderNodeTexNoise', -800, 150, Scale=180.0, Detail=6.0, Roughness=0.7); L(nt, tc.outputs['Object'], n1.inputs['Vector'])
    mx = N(nt, 'ShaderNodeMath', -600, 250, p_operation='MULTIPLY_ADD'); L(nt, oi.outputs['Random'], mx.inputs[0]); mx.inputs[1].default_value = 0.35; L(nt, n1.outputs['Fac'], mx.inputs[2])
    c = ramp(nt, [(0.1, srgb(c0)), (0.5, srgb(c1)), (0.95, srgb(c2))], -400, 250)
    L(nt, mx.outputs[0], c.inputs[0])
    # pores: dark where voronoi distance small
    pore = N(nt, 'ShaderNodeMapRange', -600, -250, From_Min=0.0, From_Max=0.35, To_Min=0.35, To_Max=1.0); L(nt, vo.outputs['Distance'], pore.inputs['Value'])
    mm = N(nt, 'ShaderNodeMix', -200, 150, p_data_type='RGBA', p_blend_type='MULTIPLY', Factor=1.0)
    L(nt, c.outputs[0], mm.inputs[6]); L(nt, pore.outputs[0], mm.inputs[7])
    h = N(nt, 'ShaderNodeMath', -400, -400, p_operation='MULTIPLY_ADD'); L(nt, vo2.outputs['Distance'], h.inputs[0]); h.inputs[1].default_value = 0.5; L(nt, vo.outputs['Distance'], h.inputs[2])
    b = N(nt, 'ShaderNodeBump', -200, -300, Strength=0.9, Distance=0.0015); L(nt, h.outputs[0], b.inputs['Height'])
    p = principled(nt, Roughness=0.95); p.location = (100, 0)
    p.inputs['Sheen Weight'].default_value = 0.6; p.inputs['Sheen Roughness'].default_value = 0.5
    L(nt, mm.outputs[2], p.inputs['Base Color']); L(nt, b.outputs[0], p.inputs['Normal'])
    tr = N(nt, 'ShaderNodeBsdfTranslucent', 100, -300); L(nt, mm.outputs[2], tr.inputs['Color'])
    ms = N(nt, 'ShaderNodeMixShader', 350, 0, Fac=0.12); L(nt, p.outputs[0], ms.inputs[1]); L(nt, tr.outputs[0], ms.inputs[2])
    out_node(nt, ms.outputs[0])
    return m

_clump_cache = {}
def clump_mesh(seed, mat):
    key = (seed % 8, mat.name)
    if key in _clump_cache: return _clump_cache[key]
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    off = Vector((seed * 1.3, seed * 2.1, seed * 0.7))
    for v in bm.verts:
        d = v.co.normalized()
        n = mnoise.fractal(d * 2.2 + off, 0.6, 2.2, 4)
        n2 = mnoise.noise(d * 7.0 + off)
        v.co = d * (1 + 0.32 * n + 0.08 * n2)
    me = bpy.data.meshes.new('clump'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat)
    _clump_cache[key] = me
    return me

def canopy(center, rx, ry, rz, n=40, rmin=0.01, rmax=0.02, seed=1, mat=None, flat=False, coll=None):
    rng = random.Random(seed)
    mat = mat or mat_sponge()
    objs = []
    for c in range(n):
        u = rng.uniform(-1, 1); a = rng.uniform(0, 6.283); rr = math.sqrt(rng.random())
        x = rx * rr * math.cos(a); y = ry * rr * math.sin(a)
        z = rz * (rng.uniform(-0.4, 0.6) if flat else rng.uniform(-1, 1) * math.sqrt(max(0, 1 - rr * rr)))
        if flat: z -= rz * 0.8 * rr * rr
        r = rng.uniform(rmin, rmax)
        me = clump_mesh(seed * 17 + c, mat)
        objs.append(place(me, (center[0] + x, center[1] + y, center[2] + z), (rng.uniform(0, 6), rng.uniform(0, 6), rng.uniform(0, 6)), (r, r, r * (0.7 if flat else 0.9)), coll=coll))
    return objs
