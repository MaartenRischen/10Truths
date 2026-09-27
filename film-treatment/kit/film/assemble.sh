#!/bin/bash
# Assemble stepped frames (12 fps, shown "on twos") + a WAV into a vertical H.264 MP4 at 24 fps.
# usage: film/assemble.sh <framesDir> <audio.wav|none> <out.mp4> [fps=12]
set -e
F="$1"; A="$2"; OUT="$3"; FPS="${4:-12}"
if [ "$A" != "none" ] && [ -f "$A" ]; then
  ffmpeg -v error -y -framerate "$FPS" -i "$F/f_%05d.png" -i "$A" \
    -vf "fps=24,format=yuv420p" -c:v libx264 -preset slow -crf 19 -tune film \
    -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
else
  ffmpeg -v error -y -framerate "$FPS" -i "$F/f_%05d.png" \
    -vf "fps=24,format=yuv420p" -c:v libx264 -preset slow -crf 19 -tune film -movflags +faststart "$OUT"
fi
ffprobe -v error -show_entries format=duration,size -of compact "$OUT"
