#!/bin/bash
# usage: r.sh "p06.js&v=a&s=4" out.png W H   (out relative to scenes/E/tmp unless absolute)
cd /tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit
out="$2"; [[ "$out" != /* ]] && out="$PWD/scenes/E/tmp/$out"
s=$(date +%s)
node scenes/E/shotE.mjs "harness.html?scene=scenes/E/$1" "$out" ${3:-640} ${4:-268} 2>&1 | grep -v "^wrote" | grep -v "^$"
echo "[$1] $(( $(date +%s) - s ))s -> $(basename $out)"
