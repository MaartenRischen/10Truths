#!/usr/bin/env python3
"""Join two half-frames into one split-screen frame with a thin gutter line.
usage: split.py left.png right.png out.png [gutter_px] [line_rgb]
"""
import sys
from PIL import Image, ImageDraw

l, r, out = sys.argv[1:4]
gut = int(sys.argv[4]) if len(sys.argv) > 4 else 4
col = tuple(int(x) for x in sys.argv[5].split(',')) if len(sys.argv) > 5 else (6, 6, 6)
A = Image.open(l).convert('RGB'); B = Image.open(r).convert('RGB')
W = A.width + B.width; H = A.height
img = Image.new('RGB', (W, H), col)
img.paste(A, (0, 0)); img.paste(B, (A.width, 0))
d = ImageDraw.Draw(img)
x0 = A.width - gut // 2
d.rectangle([x0, 0, x0 + gut - 1, H], fill=col)
img.save(out)
print('wrote', out, img.size)
