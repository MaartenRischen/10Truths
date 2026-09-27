#!/bin/bash
# sequential final renders: ./queue.sh p01 p05 ...
cd /tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/kit/scenes/B
LOG=/tmp/claude-0/-home-user-10Truths/2a0c663b-9f0e-5c83-85fc-9e15159b1ca0/scratchpad/work/B/logs
for s in "$@"; do
  echo "START $s $(date +%T)" >> $LOG/queue.log
  /tmp/claude-0/bpyenv/bin/python $s.py > $LOG/$s.log 2>&1
  grep RENDERED $LOG/$s.log >> $LOG/queue.log
  echo "END $s $(date +%T)" >> $LOG/queue.log
done
