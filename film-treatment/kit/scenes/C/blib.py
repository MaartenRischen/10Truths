# Direction C — Blender helpers (bpy 5.0 module). Z-up, figure units: manikin ~2.0 tall.
import bpy, bmesh, numpy as np, math, os, time, json, subprocess
from mathutils import Vector, Matrix, Euler

KIT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCR = os.path.dirname(KIT)
WORK = os.path.join(SCR, 'workC')
os.makedirs(WORK, exist_ok=True)


def reset(threads=4):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.render.threads_mode = 'FIXED'; sc.render.threads = threads
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    w = bpy.data.worlds.new('world'); sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0, 0, 0, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    return sc


def world_color(rgb, strength=1.0):
    w = bpy.context.scene.world
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (*rgb, 1); bg.inputs[1].default_value = strength


# ---------------- figures ----------------
def export_figs(spec, name):
    """spec: dict {figs:[...]} -> writes kit/scenes/C/specs/<name>.json, exports GLB to WORK/<name>.glb"""
    sp = os.path.join(KIT, 'scenes', 'C', 'specs', name + '.json')
    json.dump(spec, open(sp, 'w'))
    out = os.path.join(WORK, name + '.glb')
    r = subprocess.run(['node', os.path.join(KIT, 'scenes', 'C', 'figs.mjs'), f'scenes/C/specs/{name}.json', out],
                       cwd=KIT, capture_output=True, text=True)
    if not os.path.exists(out) or 'wrote' not in r.stdout:
        raise RuntimeError('export failed: ' + r.stdout + r.stderr)
    return out


def import_figs(glb):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb)
    new = [o for o in bpy.data.objects if o not in before]
    figs = {}
    for o in new:
        if o.type != 'MESH':
            continue
        parts = o.name.split('.')
        fig = parts[0]
        figs.setdefault(fig, []).append(o)
        for s in o.data.polygons:
            s.use_smooth = True
    return figs


def set_mat(objs, mat):
    for o in objs:
        o.data.materials.clear(); o.data.materials.append(mat)


def is_pin(o):
    return '.pin' in o.name


# ---------------- materials ----------------
def principled(name, color=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, coat=0.0, coat_rough=0.05, sheen=0.0,
               transmission=0.0, ior=1.45, emission=None, emit_strength=0.0, spec=0.5, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = coat_rough
    b.inputs['Sheen Weight'].default_value = sheen
    b.inputs['Transmission Weight'].default_value = transmission
    b.inputs['IOR'].default_value = ior
    b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['Alpha'].default_value = alpha
    if emission is not None:
        b.inputs['Emission Color'].default_value = (*emission, 1)
        b.inputs['Emission Strength'].default_value = emit_strength
    return m


def emission_mat(name, color, strength=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value = (*color, 1); e.inputs[1].default_value = strength
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
    return m


def image_emission_mat(name, npy_or_png, strength=1.0, interp='Linear'):
    """Emission from an image (used for backdrops such as city skylines). Accepts .png/.exr path."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    img = bpy.data.images.load(npy_or_png)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = interp
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs[1].default_value = strength
    o = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(t.outputs[0], e.inputs[0]); nt.links.new(e.outputs[0], o.inputs[0])
    return m


# ---------------- geometry ----------------
def box(name, size, loc, rot=(0, 0, 0), mat=None, bevel=0.0, segs=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = o.modifiers.new('bev', 'BEVEL'); mod.width = bevel; mod.segments = segs; mod.limit_method = 'NONE'
        mod.harden_normals = False
        for p in o.data.polygons: p.use_smooth = True
    if mat: o.data.materials.append(mat)
    return o


def cyl(name, r, depth, loc, rot=(0, 0, 0), mat=None, verts=48, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object; o.name = name
    for p in o.data.polygons: p.use_smooth = True
    if mat: o.data.materials.append(mat)
    return o


def sphere(name, r, loc, mat=None, seg=48, ring=24, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=ring)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    for p in o.data.polygons: p.use_smooth = True
    if mat: o.data.materials.append(mat)
    return o


def plane(name, size, loc, rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = (size[0], size[1], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: o.data.materials.append(mat)
    return o


# ---------------- lights ----------------
def light(name, kind, loc, energy, color=(1, 1, 1), size=0.1, rot=(0, 0, 0), target=None, spot=None, blend=0.15,
          shadow=True, size_y=None, shape=None):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy; ld.color = color
    if kind in ('POINT', 'SPOT'):
        ld.shadow_soft_size = size
    if kind == 'AREA':
        ld.size = size
        if size_y is not None:
            ld.shape = shape or 'RECTANGLE'; ld.size_y = size_y
    if kind == 'SUN':
        ld.angle = size
    if kind == 'SPOT' and spot:
        ld.spot_size = math.radians(spot); ld.spot_blend = blend
    try:
        ld.use_shadow = shadow
    except Exception:
        pass
    o = bpy.data.objects.new(name, ld); bpy.context.scene.collection.objects.link(o)
    o.location = loc; o.rotation_euler = rot
    if target is not None:
        look_at(o, target)
    return o


def look_at(o, target):
    d = Vector(target) - Vector(o.location)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def camera(loc, target, lens=35, sensor=36, shift=(0, 0), ortho=None, dof=None, fstop=2.8, clip=(0.05, 500)):
    sc = bpy.context.scene
    cd = bpy.data.cameras.new('cam'); cd.lens = lens; cd.sensor_width = sensor; cd.sensor_fit = 'HORIZONTAL'
    cd.shift_x, cd.shift_y = shift; cd.clip_start, cd.clip_end = clip
    if ortho:
        cd.type = 'ORTHO'; cd.ortho_scale = ortho
    if dof:
        cd.dof.use_dof = True; cd.dof.focus_distance = dof; cd.dof.aperture_fstop = fstop
    c = bpy.data.objects.new('cam', cd); sc.collection.objects.link(c); sc.camera = c
    c.location = loc; look_at(c, target)
    return c


# ---------------- rendering ----------------
def _load_exr(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return np.flipud(a.reshape(h, w, 4)).copy()


def _render_to_npy(out_npy, w, h):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'OPEN_EXR'
    sc.render.image_settings.color_depth = '32'
    sc.render.image_settings.color_mode = 'RGBA'
    tmp = out_npy.replace('.npy', '.exr')
    sc.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    arr = _load_exr(tmp)
    os.remove(tmp)
    np.save(out_npy, arr)
    return arr


def render_beauty(out_npy, w, h, samples=64, transparent=False, bounces=6, denoise=True, clamp=10.0, adaptive=0.02):
    sc = bpy.context.scene
    sc.view_layers[0].material_override = None
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = adaptive is not None
    if adaptive: sc.cycles.adaptive_threshold = adaptive
    sc.cycles.use_denoising = denoise
    if denoise:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    sc.cycles.max_bounces = bounces; sc.cycles.diffuse_bounces = min(3, bounces); sc.cycles.glossy_bounces = min(4, bounces)
    sc.cycles.transmission_bounces = bounces; sc.cycles.transparent_max_bounces = 8
    sc.cycles.sample_clamp_indirect = clamp
    sc.cycles.pixel_filter_type = 'BLACKMAN_HARRIS'; sc.cycles.filter_width = 1.5
    sc.render.film_transparent = transparent
    t = time.time(); a = _render_to_npy(out_npy, w, h)
    print(f'[beauty] {out_npy} {w}x{h} {samples}spp {time.time()-t:.1f}s', flush=True)
    return a


_override_cache = {}


def _override(kind):
    if kind in _override_cache:
        return _override_cache[kind]
    m = bpy.data.materials.new('ovr_' + kind); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); o = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(e.outputs[0], o.inputs[0])
    if kind == 'id':
        oi = nt.nodes.new('ShaderNodeObjectInfo')
        cc = nt.nodes.new('ShaderNodeCombineColor')
        nt.links.new(oi.outputs['Object Index'], cc.inputs[0])
        nt.links.new(cc.outputs[0], e.inputs[0])
    elif kind == 'normal':
        g = nt.nodes.new('ShaderNodeNewGeometry')
        vt = nt.nodes.new('ShaderNodeVectorTransform'); vt.vector_type = 'NORMAL'; vt.convert_from = 'WORLD'; vt.convert_to = 'CAMERA'
        vm = nt.nodes.new('ShaderNodeVectorMath'); vm.operation = 'MULTIPLY_ADD'
        vm.inputs[1].default_value = (0.5, 0.5, 0.5); vm.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(g.outputs['Normal'], vt.inputs[0]); nt.links.new(vt.outputs[0], vm.inputs[0])
        nt.links.new(vm.outputs[0], e.inputs[0])
    elif kind == 'depth':
        cd = nt.nodes.new('ShaderNodeCameraData')
        cc = nt.nodes.new('ShaderNodeCombineColor')
        nt.links.new(cd.outputs['View Z Depth'], cc.inputs[0])
        nt.links.new(cc.outputs[0], e.inputs[0])
    elif kind == 'position':
        g = nt.nodes.new('ShaderNodeNewGeometry')
        nt.links.new(g.outputs['Position'], e.inputs[0])
    _override_cache[kind] = m
    return m


def render_pass(kind, out_npy, w, h, show=None, holdout=None):
    """kind: id | normal | depth | position. show: list of objects visible to camera (others hidden), holdout: objects
    that occlude but are transparent (alpha 0)."""
    sc = bpy.context.scene
    saved = {}
    objs = [o for o in sc.objects if o.type in ('MESH', 'CURVE', 'FONT', 'META')]
    showset = set(show) if show is not None else None
    holdset = set(holdout or [])
    for o in objs:
        saved[o.name] = (o.hide_render, o.is_holdout, o.visible_camera)
        if showset is not None and o not in showset and o not in holdset:
            o.hide_render = True
        if o in holdset:
            o.is_holdout = True; o.hide_render = False
        # ray-visibility tweaks used by beauty passes must not hide things from pass renders
        if (showset is None or o in showset) and not o.hide_render:
            o.visible_camera = True
    sc.view_layers[0].material_override = _override(kind)
    sc.cycles.samples = 1; sc.cycles.use_adaptive_sampling = False; sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 0
    sc.cycles.pixel_filter_type = 'BOX'; sc.cycles.filter_width = 0.01
    sc.render.film_transparent = True
    t = time.time(); a = _render_to_npy(out_npy, w, h)
    print(f'[pass] {kind} {out_npy} {time.time()-t:.1f}s', flush=True)
    sc.view_layers[0].material_override = None
    for o in objs:
        o.hide_render, o.is_holdout, o.visible_camera = saved[o.name]
    return a


def index_objects(objs, start=1):
    """assign unique pass_index to objects; returns {index: name}"""
    table = {}
    for i, o in enumerate(objs):
        o.pass_index = start + i; table[start + i] = o.name
    return table


def shadow_only(objs):
    for o in objs:
        o.visible_camera = False; o.visible_glossy = False; o.visible_transmission = False
        o.visible_shadow = True; o.visible_diffuse = True


def cam_fpx(w):
    c = bpy.context.scene.camera.data
    if c.type == 'ORTHO':
        return None
    return c.lens / c.sensor_width * w


def figure_passes(prefix, figobjs, w, h, ss=2, holdout=None, hide_pins=True):
    """render id/normal/depth for the given figure objects at ss x resolution (others hidden; `holdout` objects
    occlude). Writes <prefix>_id.npy etc. and <prefix>.meta.json with the figure scale."""
    objs = [o for o in figobjs if not (hide_pins and is_pin(o))]
    index_objects(objs)
    for k in ('id', 'normal', 'depth'):
        render_pass(k, f'{prefix}_{k}.npy', w * ss, h * ss, show=objs, holdout=holdout)
    c = bpy.context.scene.camera
    meta = {'w': w, 'h': h, 'ss': ss, 'fpx': cam_fpx(w), 'ortho': c.data.ortho_scale if c.data.type == 'ORTHO' else None}
    json.dump(meta, open(prefix + '.meta.json', 'w'))
    json.dump({'objects': {o.pass_index: o.name for o in objs}}, open(prefix + '.index.json', 'w'))
    return meta


def world_passes(prefix, objs, w, h, kinds=('id', 'normal', 'depth')):
    index_objects(objs)
    for k in kinds:
        render_pass(k, f'{prefix}_{k}.npy', w, h, show=objs)
