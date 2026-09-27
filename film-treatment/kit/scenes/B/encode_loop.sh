#!/bin/bash
# post-process loop frames (lens/film finish, fixed grain seed varies per frame) and encode loop.mp4 (H.264, 1280x720, 24 fps)
W=/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/work/B/loop
OUT=/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/sb/opt-B/loop.mp4
HERE=/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B
mkdir -p $W/post
i=0
for f in $W/f*.png; do
  b=$(basename $f)
  python3 $HERE/post.py $f $W/post/$b "{\"vignette\":0.3,\"grain\":0.008,\"bloom\":0.14,\"veil\":0.18,\"seed\":$i}" > /dev/null
  i=$((i+1))
done
ffmpeg -y -loglevel error -framerate 24 -i $W/post/f%03d.png -vf "scale=1280:720:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 22 -movflags +faststart $OUT
ls -la $OUT
