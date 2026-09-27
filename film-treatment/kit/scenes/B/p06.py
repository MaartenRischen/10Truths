# P06 HUMAN-SIZED / hero-1: the whole ancestral world on one round table, golden lamp light.
import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B')
from dio import *
A = args()
reset()
T0 = time.time()
E = lambda k, d: float(os.environ.get(k, d))


if __name__ == '__main__':
    people, walkers, card, hgt = ancestral_set(fire_w=E('FIREW', '2.8'), grass=int(E('NGRASS', '620')), flame_scale=E('FLAME', '2.0'),
        sit=[('far', 'sitHug', 97, 0.20), ('farR', 'sitKnees', 38, 0.205), ('farL', 'sitLean', 152, 0.245), ('nearL', 'sitPoke', 212, 0.2), ('nearR', 'sitKnees', 352, 0.205)])
    key = light('SPOT', (-1.62, -0.52, 0.36), (0.1, 0.06, 0.05), energy=E('KEYW', '420'), kelv=2900, size=0.06, spot=50, blend=0.6, name='sunlamp')
    rim = light('SPOT', (1.35, 1.2, 0.85), (0, 0.05, 0.08), energy=E('RIMW', '130'), kelv=3300, size=0.08, spot=45, blend=0.5, name='rim')
    fill = light('AREA', (1.2, -2.2, 1.6), (0, 0, 0), energy=E('FILLW', '22'), kelv=5200, size=1.2, name='fill')
    wash = light('AREA', (0.0, -0.1, 0.62), (0.0, 0.7, 0.18), energy=E('WASHW', '4'), kelv=3800, size=(1.4, 0.4), name='skywash')
    link_light_to(wash, [card])
    exclude_from_light(key, [card], 'keyexcl')
    keyc = light('SPOT', (-1.62, -0.52, 0.36), (0.1, 0.06, 0.05), energy=E('KEYCW', '70'), kelv=3900, size=0.06, spot=50, blend=0.6, name='sunlamp_card')
    link_light_to(keyc, [card], 'keycard')
    set_world((0.010, 0.009, 0.010), 1.0)
    far_wall(y=3.4)
    wl = light('AREA', (-2.5, 1.5, 1.8), (-1.0, 3.4, 0.6), energy=E('WALLW', '60'), kelv=7000, size=(2.0, 1.2), name='wallwash')
    haze((0, 0, 0.06), (0.42, 0.42, 0.14), density=E('FIREHAZE', '0.22'), aniso=0.3, name='firehaze')
    cam = camera((E('CX', '1.40'), E('CY', '-2.97'), E('CZ', '0.94')), (0.0, E('TY', '0.05'), E('TZ', '0.1')), lens=E('LENS', '85'), fstop=E('FSTOP', '2.2'), focus=(0, -0.02, 0.05))
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = 1920, 1080
    bpy.context.view_layer.update()
    print('build', time.time() - T0, 'objs', len(bpy.data.objects))
    if os.environ.get('BORDER'):
        sc = bpy.context.scene; b = [float(x) for x in os.environ['BORDER'].split(',')]
        sc.render.use_border = True; sc.render.use_crop_to_border = True
        sc.render.border_min_x, sc.render.border_max_x, sc.render.border_min_y, sc.render.border_max_y = b
    out = A['out'] or (OUT + '/hero-1.png')
    render(out, res=A['res'] or (1920, 1080), spp=A['spp'] or 56, test=A['test'])
    post(out, vignette=0.3, grain=0.014, bloom=0.12, veil=E('VEIL', '0.22'))
