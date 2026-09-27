# Cue sheet for 02 CARE INSTRUCTIONS (times in seconds, matching film.js shot starts).
# usage: python3 cues02.py out/cues.json
import json, sys
S = dict(s1=0, s2=5, s3=9, s4a=21, s4b=24, s4c=26, s4d=28, s4e=30, s5=33, s6=38, s7=44, s8=48, s9=56, s10=60)
DUR = 64.5
music, sfx, beds, duck = [], [], [], []
def fx(t, kind, gain=0.8, pan=0.0, **args): sfx.append({'t': round(t, 3), 'kind': kind, 'gain': gain, 'pan': pan, 'args': args})
def mu(t, inst, notes, tempo=60, vel=0.4, gain=1.0, pan=0.0, reverb=0.35): music.append({'t': round(t, 3), 'inst': inst, 'notes': notes, 'tempo': tempo, 'vel': vel, 'gain': gain, 'pan': pan, 'reverb': reverb})

# ---- beds: office room tone through the office shots, quieter room for the insert, murmur at the end
beds += [{'t0': 0, 't1': 38.2, 'kind': 'office', 'gain': 0.55, 'fade': 0.6},
         {'t0': 0, 't1': 60.5, 'kind': 'room', 'gain': 0.35, 'fade': 0.8},
         {'t0': 43.8, 't1': 60.4, 'kind': 'office', 'gain': 0.5, 'fade': 0.5},
         {'t0': 44.2, 't1': 48.0, 'kind': 'murmur', 'gain': 0.12, 'fade': 0.6},
         {'t0': 56.0, 't1': 60.6, 'kind': 'murmur', 'gain': 0.32, 'fade': 0.8}]
duck += [{'t0': 38.25, 't1': 43.8, 'amount': 0.18}]
# far keyboard in shot 1, typing bursts through the days
for t in (0.6, 2.2, 3.9): fx(t, 'typing', 0.12, 0.5, dur=0.9)

# ---- 1: the box (flaps, tissue)
fx(S['s1'] + 0.78, 'rustle', 0.7, -0.1, dur=0.45); fx(S['s1'] + 1.47, 'rustle', 0.6, 0.15, dur=0.45)
fx(S['s1'] + 2.3, 'tissue', 0.9, 0.0, dur=0.75); fx(S['s1'] + 3.05, 'woodclick', 0.12, 0.0, pitch=1.2)
# ---- 2: stand up, pose, box swept off (thud under the desk); bright motif
fx(S['s2'] + 0.9, 'woodclick', 0.5, 0.0, pitch=1.0)
fx(S['s2'] + 1.62, 'woodclick', 0.35, 0.05, pitch=1.15); fx(S['s2'] + 2.28, 'woodclick', 0.35, -0.05, pitch=1.1)
fx(S['s2'] + 2.95, 'rustle', 0.45, -0.3, dur=0.35); fx(S['s2'] + 3.45, 'thud', 0.8, -0.3)
mu(S['s2'] + 1.3, 'piano', 'C5:0.5 E5:0.5 G5:0.5 C6:2.5', tempo=76, vel=0.42)
mu(S['s2'] + 1.3, 'pad', '[C4 E4 G4]:3.2', tempo=60, vel=0.12)
# ---- 3: four days; clock-like ostinato that slows each day; typing bursts; phase ticks
days = [(150, 'C5:1 G4:1 E5:1 G4:1 C5:1 G4:1 E5:1 G4:0.5', '[C3 G3 E4]:3'),
        (116, 'C5:1 G4:1 D5:1 G4:1 C5:1 G4:0.8', '[F2 C3 A3]:3'),
        (88, 'A4:1 E4:1 C5:1 E4:1 A4:0.4', '[A2 E3 C4]:3'),
        (62, 'A4:1 E4:1 B3:1.1', '[F2 C3 A3]:3')]
for d, (tempo, notes, pad) in enumerate(days):
    t0 = S['s3'] + 3 * d
    mu(t0, 'piano', notes, tempo=tempo, vel=0.3 - 0.03 * d)
    mu(t0, 'pad', pad, tempo=60, vel=0.13)
    for p in range(4):
        tp = t0 + 0.75 * p
        if p < 3 or d < 2: fx(tp + 0.12, 'typing', 0.16 - 0.02 * d, 0.45, dur=0.45 - 0.05 * d)
# ---- 4a: screwdriver on the elbow pin, it stands: squeaky clicks + hopeful ding
for k, t in enumerate((0.65, 1.0, 1.35)): fx(S['s4a'] + t, 'squeak', 0.55, 0.1, f=1600 + 150 * k)
fx(S['s4a'] + 2.2, 'woodclick', 0.45, 0.0, pitch=0.95); fx(S['s4a'] + 2.32, 'ding', 0.8, 0.0, pitch=1.0)
# ---- 4b: oil drop, ding (a step higher)
fx(S['s4b'] + 1.1, 'drip', 0.7, 0.0); fx(S['s4b'] + 1.35, 'ding', 0.7, 0.0, pitch=1.125)
# ---- 4c: chrome stand clamps; it stands... sags: descending two-note
fx(S['s4c'] + 0.44, 'metalclick', 0.6, 0.1); fx(S['s4c'] + 0.85, 'ding', 0.45, 0.0, pitch=1.25)
mu(S['s4c'] + 1.2, 'piano', 'G4:1 E4:2', tempo=100, vel=0.36)
# ---- 4d: gold star pressed on; a small rising hope; it sags again
fx(S['s4d'] + 0.85, 'sticker', 0.7, 0.05); mu(S['s4d'] + 0.95, 'piano', 'E5:0.5 G5:1.5', tempo=110, vel=0.26)
fx(S['s4d'] + 1.9, 'woodclick', 0.2, 0.0, pitch=0.9)
# ---- 4e: SHINY placed (bright chord); cut to next morning, both slumped: the same two notes
fx(S['s4e'] + 0.8, 'woodclick', 0.5, -0.1, pitch=1.2)
mu(S['s4e'] + 0.82, 'piano', '[C5 E5 G5 C6]:1.2', tempo=80, vel=0.34); mu(S['s4e'] + 0.82, 'pad', '[C4 E4 G4]:1.0', tempo=60, vel=0.1)
mu(S['s4e'] + 1.75, 'piano', 'G4:1 E4:2.5', tempo=100, vel=0.34)
for t in (0.2, 1.9): fx(S['s4e'] + t, 'typing', 0.12, 0.45, dur=0.5)
# ---- 5: music has stopped. head lifts, chair rolls back, cardboard scrape, paper whisper
fx(S['s5'] + 1.5, 'woodclack', 0.25, 0.0); fx(S['s5'] + 2.05, 'chairroll', 0.9, -0.2, dur=0.6)
fx(S['s5'] + 3.05, 'woodclack', 0.2, 0.0); fx(S['s5'] + 3.15, 'scrape', 0.85, 0.15, dur=0.95); fx(S['s5'] + 3.92, 'paperslide', 0.9, 0.1, dur=0.55)
# ---- 6: the card. Silence, one low piano note held
mu(S['s6'] + 0.25, 'piano', 'C2:5.5', tempo=60, vel=0.55, reverb=0.5)
fx(S['s6'] + 0.1, 'paperslide', 0.25, 0.0, dur=0.4)
# ---- 7: room tone only (+ far typing)
fx(S['s7'] + 0.5, 'typing', 0.07, -0.6, dur=1.2); fx(S['s7'] + 2.4, 'typing', 0.06, 0.6, dur=1.0)
# ---- 8: placed with woodclicks; stop-motion clicks; the motif returns warmer, with the pad
fx(S['s8'] + 1.0, 'woodclick', 0.55, 0.0, pitch=1.0); fx(S['s8'] + 1.8, 'woodclick', 0.5, 0.1, pitch=1.1)
for t, pch in ((2.55, 1.2), (2.95, 1.05), (3.05, 1.3), (3.35, 1.15), (3.5, 0.95), (4.0, 1.25), (4.6, 1.1)): fx(S['s8'] + t, 'woodclick', 0.28, 0.0, pitch=pch)
for k in range(15): fx(S['s8'] + 3.5 + 0.25 * k, 'woodclick', 0.1, 0.25, pitch=1.4 + 0.1 * (k % 2))
mu(S['s8'] + 2.4, 'piano', 'C4:1 E4:1 G4:2 A4:1 G4:1 E4:2', tempo=66, vel=0.4)
mu(S['s8'] + 2.4, 'pad', '[C3 G3 E4]:3.6 [F3 C4 A4]:3.6', tempo=60, vel=0.16)
mu(S['s8'] + 2.4, 'bass', 'C2:3.6 F2:3.6', tempo=60, vel=0.3)
# ---- 9: murmur, resolution chord (decays through the end card)
mu(S['s9'] + 1.9, 'piano', '[C3 G3 C4 E4 G4]:6', tempo=60, vel=0.38, reverb=0.45)
mu(S['s9'] + 1.9, 'pad', '[C3 G3 E4]:5', tempo=60, vel=0.16)
mu(S['s9'] + 1.9, 'bass', 'C2:5', tempo=60, vel=0.3)

cues = {'dur': DUR, 'room': 2.2, 'fadeOut': 2.0, 'master': 1.0, 'music': music, 'sfx': sfx, 'beds': beds, 'duck': duck}
json.dump(cues, open(sys.argv[1], 'w'), indent=1)
print('cues:', len(music), 'music,', len(sfx), 'sfx,', len(beds), 'beds')
