#!/usr/bin/env python3
"""Cue sheet for GOOD DOG (film 04). Writes sb/films/out/04/cues.json. Times match film.js shot starts:
s01 0 | s02 4 | s03 12 | s04 16 | s05 22 | s06 25 | s07 29 | s08 33 | s09 41 | s10 47 | s11 51 | end card 58-62.5"""
import json, sys
E8 = 60 / 72 / 2  # eighth note at 72 bpm = the pacing pulse (paws on sixteenths, owner's steps on eighths)
music, sfx, beds, duck = [], [], [], []
def S(t, kind, gain=0.5, pan=0.0, **args): sfx.append({"t": round(t, 3), "kind": kind, "gain": gain, "pan": pan, "args": args})
def M(t, inst, notes, tempo=72, vel=0.4, gain=1.0, pan=0.0, reverb=0.35): music.append({"t": t, "inst": inst, "tempo": tempo, "vel": vel, "notes": notes, "gain": gain, "pan": pan, "reverb": reverb})

# ---- beds: room tone throughout, a little city through the day, the courtyard at the end
beds += [{"t0": 0, "t1": 62.5, "kind": "room", "gain": 0.9, "fade": 1.0},
         {"t0": 0, "t1": 22.5, "kind": "city", "gain": 0.16, "fade": 1.5},
         {"t0": 25.2, "t1": 28.6, "kind": "city", "gain": 0.22, "fade": 0.6},   # hall/street air while the door is open
         {"t0": 51.0, "t1": 58.4, "kind": "courtyard", "gain": 1.1, "fade": 0.5},
         {"t0": 51.0, "t1": 58.4, "kind": "city", "gain": 0.12, "fade": 0.5}]

# ---- the pacing ostinato (B minor arpeggio), identical in shots 2 and 8: the rhyme
OST = " ".join(["B3:0.5 F#4:0.5 D4:0.5 F#4:0.5"] * 5)
def ostinato(t0, n_eighths=19):
    toks = OST.split()[:n_eighths]
    M(t0, "piano", " ".join(toks), tempo=72, vel=0.34, gain=0.9, pan=-0.1)
    M(t0, "pad", "[B2 F#3 D4]:4 [G2 D3 B3]:2 [F#2 C#3 A#3]:3.5", tempo=72, vel=0.2, gain=0.8)
ostinato(4.0)
ostinato(33.0)

# ---- s01: the door has just closed; keys, footsteps fading down the corridor
S(0.12, "thud", 0.75, -0.1); S(0.16, "lockclick", 0.35)
S(0.55, "lockclick", 0.3, 0.1)
for i, (t, g) in enumerate([(0.95, 0.4), (1.45, 0.3), (1.95, 0.2), (2.45, 0.12), (2.95, 0.07)]): S(t, "knock", g, 0.2 - i * 0.08, n=1)
S(1.78, "woodclick", 0.18, 0.0, pitch=1.4)          # the head tilt
S(3.3, "woodclick", 0.14, 0.0, pitch=1.3)

# ---- s02: trotting paws on the sixteenths, the dog lies down in the sun, gets up; clock ticks at the jumps
def paws(t0, t1, rate=2 / E8 * 1.0, gain=0.3, pan=0.0):
    n = int((t1 - t0) * rate)
    S(t0, "paws", gain, pan, n=n, rate=rate)
paws(4.0, 7.5, rate=1 / (E8 / 2) / 1.0 / 1.0 if False else 1 / (E8 / 2) * 0.5 * 2, gain=0.32)
S(7.5, "thud", 0.25); S(7.52, "woodclick", 0.15, pitch=0.8); S(7.5, "woodclick", 0.22, pitch=2.3)
S(9.0, "woodclick", 0.22, pitch=2.3); S(9.05, "woodclick", 0.15, pitch=0.9)
paws(9.05, 12.0, rate=1 / (E8 / 2) * 0.5 * 2, gain=0.32)

# ---- s03: sniffs at the gap, whine x2 (no music)
for t in (12.25, 12.55, 12.8, 14.3, 14.5): S(t, "swoosh", 0.1, 0.0)
S(13.15, "whine", 0.55, 0.0, dur=0.9)
S(14.85, "whine", 0.6, 0.0, dur=1.3)

# ---- s04: the cushion, a comic run of piano notes, tearing, then the look to the door
paws(16.1, 16.6, rate=6, gain=0.2)
S(17.05, "tear", 0.18, 0.0, dur=0.25)
S(17.62, "thud", 0.3)
for t, d in ((17.9, 0.55), (18.45, 0.45), (18.95, 0.6), (19.5, 0.5), (20.05, 0.45)): S(t, "tear", 0.42, 0.05, dur=d)
paws(17.8, 20.3, rate=6, gain=0.14)
M(17.95, "piano", "B4:0.25 C#5:0.25 D5:0.25 E5:0.25 F#5:0.5 D5:0.25 B4:0.25 A4:0.5 r:0.5 E5:0.25 D5:0.25 C#5:0.25 B4:0.25 A4:0.25 F#4:0.25 B4:0.75", tempo=150, vel=0.3, gain=0.75, pan=0.15)
M(19.3, "piano", "D5:0.25 E5:0.25 F#5:0.25 A5:0.25 G5:0.25 F#5:0.25 E5:0.25 D5:0.25 C#5:0.25 B4:1", tempo=160, vel=0.26, gain=0.7, pan=0.15)
S(20.45, "woodclick", 0.16, pitch=1.2)             # the head turns to the door

# ---- s05: silence except room tone; the tail moves once
S(23.82, "woodclick", 0.2, 0.0, pitch=0.6)

# ---- s06: key, door, two steps in, the bag slides off and drops; a low note under the head drop
S(25.05, "lockclick", 0.45, -0.1); S(25.25, "door", 0.55, -0.1, dur=1.2)
for t in (26.0, 26.45, 26.85): S(t, "knock", 0.3, -0.1, n=1)
for i in range(6): S(25.95 + i * 0.33, "woodclick", 0.13, 0.15, pitch=0.7)   # the dog's tail on the floor (hopeful)
S(27.62, "woodclick", 0.12, 0.0, pitch=1.2)
S(28.28, "thud", 0.8, -0.05)
M(27.4, "pad", "[B1 F#2 B2]:3", tempo=60, vel=0.16, gain=0.8)

# ---- s07: drops onto the sofa (sit + two wood clicks), phone out, thumb taps
S(29.98, "sit", 0.7); S(30.04, "woodclick", 0.3, pitch=0.9); S(30.16, "woodclick", 0.24, pitch=1.1)
S(31.1, "swoosh", 0.08); S(31.75, "typing", 0.18, dur=1.2)

# ---- s08: the fridge twice, the loop on the same rhythm (steps on the eighths), the floor
S(33.05, "fridge", 0.6, -0.3, dur=1.1); S(34.15, "thud", 0.28, -0.3)
S(34.6, "fridge", 0.6, -0.3, dur=1.2); S(35.45, "thud", 0.2, -0.3)
S(35.5, "woodclick", 0.18, pitch=2.3)
for j in range(9): S(35.5 + j * E8, "woodclick", 0.42, 0.0, pitch=0.42)
S(39.2, "woodclick", 0.18, pitch=2.3); S(39.25, "thud", 0.3); S(39.3, "woodclick", 0.18, pitch=0.8)
S(40.3, "woodclick", 0.18, pitch=2.3); S(40.4, "woodclick", 0.2, pitch=1.0)

# ---- s09: silence; slow paws; one note when the head touches the knee; then the motif, slow
paws(41.3, 44.0, rate=3.2, gain=0.2)
M(45.3, "piano", "[D3 D4]:3", tempo=60, vel=0.3, gain=0.9)
M(46.2, "piano", "F#4:1 A4:1 B4:1 A4:1.8", tempo=60, vel=0.34, gain=0.9)
M(46.2, "pad", "[D3 A3 F#4]:4.8", tempo=60, vel=0.13, gain=0.8)

# ---- s10: the lead comes off the hook, tail thumps on the floor
S(47.72, "lockclick", 0.25, -0.1); S(47.8, "woodclick", 0.2, -0.1, pitch=2.8); S(47.9, "woodclick", 0.15, -0.1, pitch=3.1)
for i in range(11): S(47.5 + i * 0.32, "woodclick", 0.32, 0.1, pitch=0.55)

# ---- s11: the courtyard: tram bell, dogs' paws, the motif in full
S(54.4, "bell", 0.5, -0.3)
paws(51.2, 57.6, rate=7, gain=0.12, pan=0.1)
M(51.0, "piano", "F#4:1 A4:0.5 B4:0.5 A4:1 F#4:1 E4:1 D4:0.5 E4:0.5 F#4:1 E4:1", tempo=72, vel=0.45, gain=1.0, pan=0.0)
M(51.0, "piano", "[D3 A3]:2 [B2 F#3]:2 [G2 D3]:2 [A2 E3]:2", tempo=72, vel=0.28, gain=0.8, pan=-0.2)
M(51.0, "pad", "[D3 A3 F#4]:2 [B2 F#3 D4]:2 [G2 D3 B3]:2 [A2 E3 C#4]:2", tempo=72, vel=0.22, gain=0.9)
M(51.0, "bass", "D2:2 B1:2 G1:2 A1:2", tempo=72, vel=0.35, gain=0.8)
# ---- end card: the music resolves, then near silence
M(58.0, "piano", "[D3 A3 D4 F#4]:4", tempo=60, vel=0.34, gain=0.9)
M(58.0, "pad", "[D3 A3 F#4]:2.5", tempo=60, vel=0.14, gain=0.8)
M(58.0, "bass", "D2:3", tempo=60, vel=0.25, gain=0.7)

cues = {"dur": 62.5, "room": 2.2, "fadeOut": 1.8, "master": 1.0, "music": music, "sfx": sfx, "beds": beds, "duck": duck}
out = sys.argv[1]
json.dump(cues, open(out, "w"), indent=1)
print("wrote", out, len(music), "music", len(sfx), "sfx", len(beds), "beds")
