# Direction C — render id/normal/depth passes for a set of painted figures (no world), for wall paintings/friezes.
# usage: python figpass.py <spec.json>
# spec: {tag, W, H, ss, cam: {ortho: view_width, center: [x, z]} | {pos, target, lens}, figs: [figs.js entries]}
# Figures stand in the X/Z plane facing -Y (towards the camera at -Y). Writes WORK/<tag>_fig_*.npy + <tag>_fig.index.json
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blib import *

spec = json.load(open(sys.argv[1]))
tag = spec['tag']; W, H, ss = spec['W'], spec['H'], spec.get('ss', 2)
reset()
figs = import_figs(export_figs({'figs': spec['figs']}, f'fp_{tag}'))
c = spec['cam']
if 'ortho' in c:
    cx, cz = c['center']
    cam = camera((cx, -30, cz), (cx, 0, cz), ortho=c['ortho'])
else:
    cam = camera(c['pos'], c['target'], lens=c.get('lens', 50))
objs = []
for n, ol in figs.items():
    objs += [o for o in ol if not is_pin(o)]
index_objects(objs)
pre = f'{WORK}/{tag}_fig'
for k in ('id', 'normal', 'depth'):
    render_pass(k, f'{pre}_{k}.npy', W * ss, H * ss, show=objs)
meta = {'w': W, 'h': H, 'ss': ss, 'fpx': cam_fpx(W), 'ortho': cam.data.ortho_scale if cam.data.type == 'ORTHO' else None}
json.dump(meta, open(pre + '.meta.json', 'w'))
json.dump({'objects': {o.pass_index: o.name for o in objs}}, open(pre + '.index.json', 'w'))
print('done')
