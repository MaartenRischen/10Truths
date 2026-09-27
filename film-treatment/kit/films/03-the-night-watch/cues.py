#!/usr/bin/env python3
"""Writes the film 03 cue sheet (temp score + foley) from the shot start times. usage: python3 cues.py out/cues.json"""
import json, sys

S = {'s01': 0.0, 's02': 4.0, 's03': 9.0, 's04': 13.0, 's05': 17.0, 's06': 20.0, 's07': 24.0, 's08': 29.5, 's09': 34.5,
     's10': 42.0, 's11': 48.0, 's12': 52.0, 's13': 58.0, 's14': 63.0, 'end': 68.5}
DUR = 73.0
CUT1, CUT2 = S['s06'], S['s11']   # hard cuts: flat -> camp, camp -> flat
music, sfx, beds = [], [], []
fx = lambda t, kind, gain=0.5, bus='flat', pan=0.0, **args: sfx.append({'t': round(t, 3), 'kind': kind, 'gain': gain, 'bus': bus, 'pan': pan, 'args': args})

# ---------------- the flat (0 - 20, 48 - end): room tone, fridge through the wall
beds += [
    {'t0': 0.0, 't1': CUT1, 'kind': 'room', 'gain': 2.4, 'fade': 0.3, 'bus': 'flat'},
    {'t0': 0.0, 't1': CUT1, 'kind': 'hum', 'gain': 0.75, 'fade': 0.3, 'args': {'f': 50}, 'bus': 'flat', 'pan': 0.3},
    {'t0': CUT2, 't1': DUR, 'kind': 'room', 'gain': 2.4, 'fade': 0.02, 'bus': 'flat'},
    {'t0': CUT2, 't1': DUR, 'kind': 'hum', 'gain': 0.65, 'fade': 0.02, 'args': {'f': 50}, 'bus': 'flat', 'pan': 0.3},
    # a car far away (s01), the street below (s03)
    {'t0': 0.8, 't1': 3.9, 'kind': 'city', 'gain': 1.4, 'fade': 1.3, 'bus': 'flat', 'pan': -0.4},
    {'t0': S['s03'], 't1': S['s04'] + 0.3, 'kind': 'city', 'gain': 1.6, 'fade': 0.5, 'bus': 'flat', 'pan': -0.5},
    {'t0': S['s03'] + 1.6, 't1': S['s03'] + 3.8, 'kind': 'wind', 'gain': 0.55, 'fade': 0.9, 'bus': 'flat', 'pan': -0.6},
]
# s02: footsteps, handle, rattle, chain, deadbolt x2
for t in (4.18, 4.72, 5.26): fx(t, 'woodclick', 0.3, pitch=0.5)
fx(6.1, 'switch', 0.45, pan=-0.2); fx(6.32, 'knock', 0.22, n=2, gap=0.09)
for t, p in ((7.18, 2.3), (7.26, 2.0), (7.4, 2.5)): fx(t, 'woodclick', 0.16, pitch=p)
fx(7.93, 'lockclick', 0.45, pan=-0.2); fx(8.43, 'lockclick', 0.45, pan=-0.2)
# s03: slats
fx(9.82, 'woodclick', 0.14, pitch=1.6); fx(10.2, 'woodclick', 0.12, pitch=1.8)
# s04: heartbeat under the room tone, thumb flicks
for t in (13.25, 14.15, 15.05, 15.95, 16.85): fx(t, 'heartbeat', 0.4)
for t in (13.35, 14.05, 14.7, 15.45, 16.2): fx(t, 'woodclick', 0.05, pitch=2.6)
# s05: the lock again, the chain, then a held breath
fx(17.48, 'lockclick', 0.45, pan=-0.2)
for t, p in ((18.42, 2.3), (18.5, 2.0)): fx(t, 'woodclick', 0.14, pitch=p)

# ---------------- the camp (20 - 48): crickets, wind, fire; low pad enters; motif at the touch
beds += [
    {'t0': CUT1, 't1': 45.0, 'kind': 'crickets', 'gain': 1.3, 'fade': 0.02, 'args': {'n': 7}, 'bus': 'camp'},
    {'t0': 43.0, 't1': CUT2 + 0.5, 'kind': 'crickets', 'gain': 0.7, 'fade': 1.2, 'args': {'n': 2}, 'bus': 'camp'},
    {'t0': CUT1, 't1': CUT2, 'kind': 'wind', 'gain': 0.45, 'fade': 0.02, 'bus': 'camp', 'pan': 0.2},
    {'t0': CUT1, 't1': CUT2, 'kind': 'fire', 'gain': 0.75, 'fade': 0.02, 'args': {'pops': 7}, 'bus': 'camp'},
]
music += [
    {'t': 20.5, 'inst': 'pad', 'tempo': 66, 'vel': 0.32, 'notes': '[D3 A3 F4]:8 [Bb2 F3 D4]:8', 'gain': 0.85, 'bus': 'camp', 'reverb': 0.4},
    {'t': 35.2, 'inst': 'pad', 'tempo': 66, 'vel': 0.3, 'notes': '[F2 C3 A3]:6 [F3 C4 A4]:5', 'gain': 0.85, 'bus': 'camp', 'reverb': 0.4},
    # the motif, first time, warm (just after the touch at 39.8)
    {'t': 40.05, 'inst': 'piano', 'tempo': 66, 'vel': 0.42, 'notes': 'C5:1 A4:1 G4:1 F4:3', 'gain': 0.9, 'bus': 'camp', 'reverb': 0.45},
    {'t': 40.05, 'inst': 'piano', 'tempo': 66, 'vel': 0.26, 'notes': '[F3 C4]:3 [Bb2 F3]:3', 'gain': 0.8, 'bus': 'camp', 'reverb': 0.45},
    # s10: a resolving chord
    {'t': 43.3, 'inst': 'piano', 'tempo': 66, 'vel': 0.3, 'notes': '[C4 E4 G4]:2 [F3 A3 C4 F4]:4', 'gain': 0.85, 'bus': 'camp', 'reverb': 0.5},
    {'t': 44.4, 'inst': 'pad', 'tempo': 66, 'vel': 0.3, 'notes': '[F2 C3 A3 F4]:5', 'gain': 0.85, 'bus': 'camp', 'reverb': 0.4},
]
fx(30.5, 'tear', 0.28, bus='camp', pan=0.5, dur=0.6); fx(30.78, 'tear', 0.16, bus='camp', pan=0.5, dur=0.35)
fx(30.95, 'heartbeat', 0.55, bus='camp')
for t in (36.55, 37.05, 37.55, 38.05, 38.55, 39.05): fx(t, 'woodclick', 0.1, bus='camp', pitch=0.45)
fx(39.8, 'woodclack', 0.6, bus='camp')
fx(40.9, 'sit', 0.18, bus='camp'); fx(41.75, 'sit', 0.22, bus='camp')
fx(42.9, 'sit', 0.12, bus='camp'); fx(44.75, 'woodclick', 0.1, bus='camp', pitch=0.8)
fx(44.4, 'birds', 0.35, bus='camp', pan=-0.3, dur=3.5)

# ---------------- back in the flat (48 -): music gone; bed creak; PING; silence; through the wall
fx(53.2, 'sit', 0.3); fx(54.45, 'thud', 0.12)
fx(55.3, 'ping', 0.7, pan=0.35)
fx(66.45, 'sit', 0.16); fx(67.0, 'tear', 0.06, dur=0.5)
beds += [{'t0': 63.4, 't1': 68.6, 'kind': 'baby', 'gain': 0.5, 'fade': 1.2, 'bus': 'flat', 'pan': -0.6}]
music += [
    # a lullaby hummed through the wall (soft pad, off to the door side)
    {'t': 63.3, 'inst': 'pad', 'tempo': 66, 'vel': 0.16, 'notes': 'F4:2 A4:2 G4:2 F4:2', 'gain': 0.8, 'pan': -0.5, 'bus': 'flat', 'reverb': 0.5},
    # the motif resolves; the F lands on the end card
    {'t': 65.5, 'inst': 'piano', 'tempo': 66, 'vel': 0.36, 'notes': 'C5:1 A4:1 G4:1 A4:1 F4:4', 'gain': 0.9, 'bus': 'flat', 'reverb': 0.5},
    {'t': 69.14, 'inst': 'piano', 'tempo': 66, 'vel': 0.22, 'notes': '[F2 C3 A3]:4', 'gain': 0.8, 'bus': 'flat', 'reverb': 0.5},
]
cues = {
    'dur': DUR, 'room': 2.2, 'fadeOut': 1.2, 'master': 1.0,
    'music': music, 'sfx': sfx, 'beds': beds,
    'gates': {'flat': [[0.0, CUT1], [CUT2, DUR]], 'camp': [[CUT1, CUT2]]},
    'busDuck': [
        {'bus': 'flat', 't0': 18.9, 't1': CUT1, 'amount': 0.45, 'ramp': 0.3},      # held breath before the cut
        {'bus': 'flat', 't0': S['s13'] + 0.3, 't1': S['s14'] - 0.2, 'amount': 0.25, 'ramp': 0.5},  # silence on the message
        {'bus': 'flat', 't0': S['end'] + 0.8, 't1': DUR, 'amount': 0.45, 'ramp': 0.8},  # end card: near silence
    ],
}
json.dump(cues, open(sys.argv[1], 'w'), indent=1)
print('wrote', sys.argv[1], len(music), 'music', len(sfx), 'sfx', len(beds), 'beds')
