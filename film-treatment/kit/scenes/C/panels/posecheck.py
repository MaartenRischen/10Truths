# quick pose preview: one pose at yaws 0 / 45 / 90 (and optional 150), painted, side by side.
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paint'))
from cutil import *
from cavekit import figpass, paint_named, ortho_u
pose = json.loads(sys.argv[1]); out = sys.argv[2]
base = pose.pop('_base', 'stand')
yaws = [0, 45, 90, 150]
W, H = 1280, 480
VW = 10.0
figs = [{'name': f'v{i}', 'pose': base, 'mods': pose, 'yaw': y, 'ground': 0.0, 'pos': [-3.75 + 2.5 * i, 0, 0]} for i, y in enumerate(yaws)]
pre = figpass('posecheck', W, H, figs, {'ortho': VW, 'center': [0.0, 1.0]}, force=True)
u = ortho_u(pre)
img = np.ones((H, W, 3), np.float32) * hexrgb('#cdbb9b')
for i in range(len(yaws)):
    img = over(img, paint_named(pre, f'v{i}', u, seed=11))
save(out, img)
