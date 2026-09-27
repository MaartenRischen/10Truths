# Fill frames that were rendered on twos/threes (shot 3 holds, card insert, and the later shots under the render time box)
# by duplicating the previous frame. Every shot's first frame is always rendered, so fills never cross a cut.
import os, shutil, sys
d, total = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 774
STARTS = [0, 60, 108, 252, 288, 312, 336, 360, 396, 456, 528, 576, 672, 720]
f = lambda i: os.path.join(d, f'f_{i:05d}.png')
n, bad = 0, []
for i in range(total):
    if os.path.exists(f(i)): continue
    if i in STARTS or not os.path.exists(f(i - 1)): bad.append(i); continue
    shutil.copyfile(f(i - 1), f(i)); n += 1
print('filled', n, 'unfillable', bad[:20])
