#!/bin/bash
# Final renders for Direction E. usage: batch.sh [job ...]   (no args = all)
K=/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit
O=/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/sb/opt-E
T=$K/scenes/E/final
LOG=$K/scenes/E/final/times.log
cd $K
r() { # r name "scene&params" out W H
  local s=$(date +%s)
  node scenes/E/shotE.mjs "harness.html?scene=scenes/E/$2" "$3" $4 $5 2>&1 | grep -E "rror|samples" | sed "s/^/  [$1] /"
  echo "$1 $(( $(date +%s) - s ))s" | tee -a $LOG
}
jobs="$@"; [ -z "$jobs" ] && jobs="p01 p02 p03 p04 p05 p06 p07 p08 p09 p10 p11 p12 p13 p14 p15 p16 hero1 hero2"
for j in $jobs; do case $j in
  p01) r p01a "p01.js&v=a&s=40" $O/p01-a.png 1280 536; r p01b "p01.js&v=b&s=32" $O/p01-b.png 1280 536;;
  p02) r p02a "p02.js&v=a&s=40" $O/p02-a.png 1280 536; r p02b "p02.js&v=b&s=32" $O/p02-b.png 1280 536;;
  p03) r p03a "p03.js&v=a&s=32" $O/p03-a.png 1280 536; r p03b "p03.js&v=b&s=40" $O/p03-b.png 1280 536;;
  p04) r p04a "p04.js&v=a&s=40" $O/p04-a.png 1280 536; r p04b "p04.js&v=b&s=24" $O/p04-b.png 1280 536;;
  p05) r p05L "p05.js&v=L&s=40" $T/p05L.png 640 536; r p05R "p05.js&v=R&s=32" $T/p05R.png 640 536; python3 scenes/E/split.py $T/p05L.png $T/p05R.png $O/p05.png 4;;
  p06) r p06a "p06.js&v=a&s=32" $O/p06-a.png 1280 536; r p06b "p06.js&v=b&s=32" $O/p06-b.png 1280 536;;
  p07) r p07a "p07.js&v=a&s=32" $O/p07-a.png 1280 536; r p07b "p07.js&v=b&s=40" $O/p07-b.png 1280 536;;
  p08) r p08 "p08.js&s=40" $O/p08.png 1280 536;;
  p09) r p09a "p09.js&v=a&s=32" $O/p09-a.png 1280 536; r p09b "p09.js&v=b&s=32" $O/p09-b.png 1280 536;;
  p10) r p10a "p10.js&v=a&s=40" $O/p10-a.png 1280 536; r p10src "p10.js&v=a&s=16" $K/scenes/E/tmp/p10a_src.png 1280 720; r p10b "p10.js&v=b&s=32" $O/p10-b.png 1280 536;;
  p11) r p11a "p11.js&v=a&s=40" $O/p11-a.png 1280 536; r p11b "p11.js&v=b&s=32" $O/p11-b.png 1280 536;;
  p12) r p12a "p12.js&v=a&s=32" $O/p12-a.png 1280 536; r p12b "p12.js&v=b&s=32" $O/p12-b.png 1280 536;;
  p13) r p13L "p13.js&v=L&s=40" $T/p13L.png 640 536; r p13R "p13.js&v=R&s=32" $T/p13R.png 640 536; python3 scenes/E/split.py $T/p13L.png $T/p13R.png $O/p13.png 4;;
  p14) r p14a "p14.js&v=a&s=40" $O/p14-a.png 1280 536; r p14b "p14.js&v=b&s=32" $O/p14-b.png 1280 536;;
  p15) r p15 "p15.js&v=day&s=32" $O/p15.png 1280 536;;
  p16) r p16a "p15.js&v=night&s=32" $O/p16-a.png 1280 536; r p16b "p01.js&v=c&s=40" $O/p16-b.png 1280 536;;
  p03b) r p03b "p03.js&v=b&s=40" $O/p03-b.png 1280 536;;
  p12a) r p12a "p12.js&v=a&s=32" $O/p12-a.png 1280 536;;
  hero1) r h1L "p13.js&v=L&s=64" $T/h1L.png 960 804; r h1R "p13.js&v=R&s=48" $T/h1R.png 960 804; python3 scenes/E/split.py $T/h1L.png $T/h1R.png $O/hero-1.png 6;;
  hero2) r hero2 "p15.js&v=hero&s=64" $O/hero-2.png 1920 804;;
esac; done
echo DONE | tee -a $LOG
