#!/usr/bin/env python3
"""Film 03 mixer: renders the standard cue sheet (kit/film/audio.py synths) as two buses and hard-gates them.

usage: python3 mix.py cues.json out.wav

Extra cue-sheet keys (audio.py ignores them, so `audio.py cues.json` still renders a plain version):
  every event may carry "bus": "flat" | "camp" (default "flat")
  "gates": {"flat": [[t0, t1], ...], "camp": [[t0, t1], ...]}  -> each bus is audible only inside its windows,
           with 4 ms edges, AFTER its own reverb, so the sound cuts exactly with the picture (s05->s06, s10->s11).
  "busDuck": [{"bus": "flat", "t0": .., "t1": .., "amount": ..}] -> duck one bus only.
"""
import json, math, os, sys, wave
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'film'))
import audio as A

SR = A.SR


def baby(d, seed=11):
    """a baby's sleepy murmur heard through a wall: soft vowel-like coos with slow pitch arcs"""
    n0 = int(d * SR); out = np.zeros(n0); rng = np.random.default_rng(seed); tt = 0.3
    while tt < d - 0.8:
        L = rng.uniform(0.35, 0.75); n = int(L * SR); tc = np.arange(n) / SR
        f0 = rng.uniform(320, 430) * (1 + 0.09 * np.sin(np.pi * tc / L)) * (1 + 0.012 * np.sin(2 * np.pi * 6 * tc))
        ph = 2 * np.pi * np.cumsum(f0) / SR
        x = (np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.sin(np.pi * tc / L) ** 1.5
        i0 = int(tt * SR); m = min(n, n0 - i0); out[i0:i0 + m] += x[:m] * rng.uniform(0.3, 0.6)
        tt += L + rng.uniform(0.5, 1.3)
    return A.fft_filter(out, 180, 1500) * 0.3


def sfx(kind, args):
    """local fixes for shared synths with length mismatches"""
    if kind == 'sit':  # body settling onto a bed / rock: soft thud + fabric
        th = A.sfx('thud', {}) * 0.5; fab = A.fft_filter(A.noise(0.5), 300, 3000) * np.exp(-A.t_(0.5) / 0.08) * 0.2
        n = max(len(th), len(fab)); out = np.zeros(n); out[:len(th)] += th; out[:len(fab)] += fab; return out
    return A.sfx(kind, args)


def render_bus(c, bus, total):
    dry = np.zeros((2, total)); wet = np.zeros(total)
    sel = lambda evs: [e for e in evs if e.get('bus', 'flat') == bus]
    for ev in sel(c.get('music', [])):
        x = A.render_music(ev, total); dry += A.pan2(x, ev.get('pan', 0.0)) * 0.8; wet += x * ev.get('reverb', 0.35)
    for ev in sel(c.get('beds', [])):
        d = ev['t1'] - ev['t0']; x = (baby(d) if ev['kind'] == 'baby' else A.bed(ev['kind'], d, ev.get('args', {}))) * ev.get('gain', 1.0)
        fd = int(ev.get('fade', 0.5) * SR); e = np.ones(len(x))
        if fd > 0: e[:fd] = np.linspace(0, 1, fd); e[-fd:] = np.minimum(e[-fd:], np.linspace(1, 0, fd))
        x *= e; i0 = int(ev['t0'] * SR); i1 = min(total, i0 + len(x))
        dry[:, i0:i1] += A.pan2(x[:i1 - i0], ev.get('pan', 0.0)); wet[i0:i1] += x[:i1 - i0] * ev.get('reverb', 0.05)
    for ev in sel(c.get('sfx', [])):
        x = sfx(ev['kind'], ev.get('args', {})) * ev.get('gain', 1.0)
        i0 = int(ev['t'] * SR); i1 = min(total, i0 + len(x))
        if i0 >= total: continue
        dry[:, i0:i1] += A.pan2(x[:i1 - i0], ev.get('pan', 0.0)); wet[i0:i1] += x[:i1 - i0] * ev.get('reverb', 0.15)
    irL, irR = A.reverb_ir(c.get('room', 2.2))
    dry[0] += A.convolve(wet, irL) * 0.9; dry[1] += A.convolve(wet, irR) * 0.9
    for dk in c.get('busDuck', []):
        if dk['bus'] != bus: continue
        i0, i1 = int(dk['t0'] * SR), int(dk['t1'] * SR); fd = int(dk.get('ramp', 0.4) * SR); g = np.ones(total); a = dk.get('amount', 0.2)
        g[i0:i1] = a
        if i0 - fd > 0: g[i0 - fd:i0] = np.linspace(1, a, fd)
        if i1 + fd < total: g[i1:i1 + fd] = np.linspace(a, 1, fd)
        dry *= g
    win = c.get('gates', {}).get(bus)
    if win:
        g = np.zeros(total); r = int(0.004 * SR)
        for t0, t1 in win:
            i0, i1 = int(t0 * SR), min(total, int(t1 * SR)); g[i0:i1] = 1.0
            if i0 > 0: g[i0:i0 + r] = np.linspace(0, 1, r)
            if i1 < total: g[i1 - r:i1] = np.linspace(1, 0, r)
        dry *= g
    return dry


def main(cfile, out):
    c = json.load(open(cfile)); total = int(c['dur'] * SR)
    mix = render_bus(c, 'flat', total) + render_bus(c, 'camp', total)
    fo = int(c.get('fadeOut', 1.5) * SR); mix[:, -fo:] *= np.linspace(1, 0, fo)
    peak = np.abs(mix).max(); target = 10 ** (-1.5 / 20)
    mix = mix / peak * target * c.get('master', 1.0) if peak > 0 else mix
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    rms = np.sqrt((mix ** 2).mean())
    print(f'wrote {out}: {c["dur"]:.1f}s, rms {20 * math.log10(rms + 1e-9):.1f} dBFS')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
