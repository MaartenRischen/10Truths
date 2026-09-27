#!/bin/bash
# Burn the direction's chapter names (tiny tracked small caps) into the first frame of each beat.
# Clean, unlabelled copies are kept in kit/scenes/E/final/clean/ (gen-video start/end frames must be text-free).
K=/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit
O=/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/sb/opt-E
C=$K/scenes/E/final/clean; mkdir -p $C
while IFS='|' read f num name; do
  [ -z "$f" ] && continue
  cp -n $O/$f $C/$f 2>/dev/null || true      # keep the first clean version
  python3 $K/scenes/E/label.py $C/$f $O/$f "$name" "$num"
done <<'LIST'
p01-a.png|01|Open
p02-a.png|02|Not anti-tech
p03-a.png|03|How we feel
p04-a.png|04|Self-blame
p05.png|05|Mismatch
p06-a.png|06|Human-sized
p07-a.png|07|Tuned drives
p08.png|08|Everything changed
p09-a.png|09|The loop
p10-a.png|10|Loneliness
p11-a.png|11|It is everything
p12-a.png|12|On purpose
p13.png|13|Not broken
p14-a.png|14|The answer
p15.png|15|The new world
p16-a.png|16|Close
LIST
