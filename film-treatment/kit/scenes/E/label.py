#!/usr/bin/env python3
"""Direction E type: a tiny white tracked small-caps chapter name in the lower-left corner.
usage: label.py in.png out.png "CHAPTER NAME" [number]
"""
import sys
from PIL import Image, ImageDraw, ImageFont

src, dst, name = sys.argv[1:4]
num = sys.argv[4] if len(sys.argv) > 4 else ''
im = Image.open(src).convert('RGB')
W, H = im.size
cap = max(9, round(H * 0.021))          # cap height ~ 2.1% of frame height
small = round(cap * 0.8)
serif = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
try:
    f_big = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf', round(cap * 1.45))
    f_small = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf', round(small * 1.45))
except Exception:
    f_big = ImageFont.truetype(serif, round(cap * 1.4)); f_small = ImageFont.truetype(serif, round(small * 1.4))
track = cap * 0.42
layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
d = ImageDraw.Draw(layer)
x0 = round(W * 0.028); base = round(H * 0.94)
x = x0
def put(ch, font, x):
    bb = d.textbbox((0, 0), ch, font=font)
    d.text((x, base - (bb[3])), ch, font=font, fill=(255, 255, 255, 205))
    return x + (bb[2] - bb[0]) + track
if num:
    for ch in num:
        x = put(ch, f_small, x)
    x += track * 2.2
    d.line([(x, base - small * 0.55), (x + cap * 1.6, base - small * 0.55)], fill=(255, 255, 255, 150), width=1)
    x += cap * 1.6 + track * 2.2
# small caps: first letter of each word full cap, rest small caps
for word_i, word in enumerate(name.split(' ')):
    for i, ch in enumerate(word):
        x = put(ch.upper(), f_big if i == 0 else f_small, x)
    x += track * 2.4
out = Image.alpha_composite(im.convert('RGBA'), layer).convert('RGB')
out.save(dst)
print('labelled', dst)
