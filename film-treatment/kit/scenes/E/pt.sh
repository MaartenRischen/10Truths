#!/bin/bash
# usage: pt.sh out.png 'posejson|posejson' 'eulx,euly,eulz,order'
cd /tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit
P=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$2")
node shot.mjs "harness.html?scene=scenes/E/posetest.js&poses=$P&eul=${3:-0,0,0}" "$1" 1200 700 | grep -v wrote; true
