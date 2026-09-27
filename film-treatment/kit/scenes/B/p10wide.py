# P10 LONELINESS panel: the pull-back. 2,560 identical desks in rows into darkness, each manikin lit only by its phone.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
E = lambda k, d: float(os.environ.get(k, d))
T0 = time.time()
sc = bpy.context.scene
NX, NY = int(E('NX', '40')), int(E('NY', '64'))
DX, DY = 0.30, 0.34

def mat_mdf_floor():
    m, nt = mat_new('mdf_floor')
    if nt is None: return m
    tc = N(nt, 'ShaderNodeTexCoord', -900, 0)
    n1 = N(nt, 'ShaderNodeTexNoise', -700, 100, Scale=40.0, Detail=6.0)
    L(nt, tc.outputs['Object'], n1.inputs['Vector'])
    # board seams (1.22 x 2.44)
    br = N(nt, 'ShaderNodeTexBrick', -700, -200, Mortar_Size=0.0015, Scale=1.0, Bias=0.0)
    br.inputs['Brick Width'].default_value = 1.22; br.inputs['Row Height'].default_value = 2.44
    br.inputs['Color1'].default_value = (1, 1, 1, 1); br.inputs['Color2'].default_value = (0.9, 0.9, 0.9, 1); br.inputs['Mortar'].default_value = (0.2, 0.2, 0.2, 1)
    L(nt, tc.outputs['Object'], br.inputs['Vector'])
    c = ramp(nt, [(0.0, srgb('#34322f')), (1.0, srgb('#4a4743'))], -400, 100); L(nt, n1.outputs['Fac'], c.inputs[0])
    mm = N(nt, 'ShaderNodeMix', -200, 50, p_data_type='RGBA', p_blend_type='MULTIPLY', Factor=1.0)
    L(nt, c.outputs[0], mm.inputs[6]); L(nt, br.outputs['Color'], mm.inputs[7])
    r = N(nt, 'ShaderNodeMapRange', -400, -400, To_Min=0.28, To_Max=0.5); L(nt, n1.outputs['Fac'], r.inputs['Value'])
    p = principled(nt); p.location = (0, 0)
    L(nt, mm.outputs[2], p.inputs['Base Color']); L(nt, r.outputs[0], p.inputs['Roughness'])
    out_node(nt, p.outputs[0])
    return m

me = bpy.data.meshes.new('floor'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40); bm.to_mesh(me); bm.free()
me.materials.append(mat_mdf_floor()); place(me, (0, 0, 0), name='floor')

# unit variants as collections
units = []
for v in range(4):
    c = bpy.data.collections.new('unit%d' % v)
    sc.collection.children.link(c)
    m = desk_unit(c)
    bpy.context.view_layer.update()
    head = jpos(m, 'head', (0, -0.12, 0.1))
    hl = jpos(m, 'lWrist', (0, 0, -0.11)); hr = jpos(m, 'rWrist', (0, 0, -0.11))
    pc = (hl + hr) / 2 + Vector((0, -0.004, 0.006))
    phone(pc, head, img='feed%d.png' % v, strength=E('PHONE', '40') * (0.8 + 0.15 * v), coll=c)
    mt = bpy.data.materials['screen_feed%d.png' % v].node_tree
    mt.nodes['Tint'].inputs[7].default_value = (0.8, 0.9, 1.0, 1)
    for n in mt.nodes:
        if n.bl_idname == 'ShaderNodeMix' and n.name not in ('Tint', 'CamSplit'): n.inputs['Factor'].default_value = 0.15
    units.append(c)
bpy.context.view_layer.update()
for c in units:
    bpy.context.view_layer.layer_collection.children[c.name].exclude = True
rng = random.Random(3)
root = bpy.data.collections.new('crowd'); sc.collection.children.link(root)
for j in range(NY):
    for i in range(NX):
        x = (i - NX / 2 + 0.5) * DX + rng.uniform(-0.006, 0.006)
        y = j * DY + rng.uniform(-0.006, 0.006)
        e = bpy.data.objects.new('u', None)
        e.instance_type = 'COLLECTION'; e.instance_collection = units[rng.randrange(4)]
        e.location = (x, y, 0); e.rotation_euler = (0, 0, math.radians(rng.uniform(-2.5, 2.5)))
        root.objects.link(e)
print('instances', NX * NY, 'build', time.time() - T0)
set_world((0.004, 0.005, 0.008), 1.0)
sc.cycles.film_exposure = E('EXPO', '1.3')
top = light('AREA', (0, 8, 6), (0, 8, 0), energy=E('TOPW', '0'), kelv=8000, size=(12, 20), name='roof')
cam = camera((E('CX', '0.15'), E('CY', '-0.95'), E('CZ', '0.95')), (E('TX', '0.15'), E('TY', '3.2'), E('TZ', '-0.1')), lens=E('LENS', '50'), fstop=E('FSTOP', '2.8'), focus=(E('FX', '0.15'), E('FY', '0.36'), E('FZ', '0.14')))
if E('FOG', '0') > 0: dark_fog((0, 13.5, 0.9), (16, 23, 2.0), density=E('FOG', '0.16'))
out = A['out'] or (OUT + '/p10.png')
render(out, res=A['res'] or (1280, 720), spp=A['spp'] or 40, test=A['test'])
post(out, vignette=0.34, grain=0.016, bloom=0.2, bloom_thr=0.6, veil=E('VEIL', '0.2'), veil_col=[0.6, 0.75, 1.0], topdark=0.55, topdark_from=0.5, warm=[0.86, 0.96, 1.1])
