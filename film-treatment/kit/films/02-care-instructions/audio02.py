#!/usr/bin/env python3
"""Temp score + foley synthesiser for the Demismatch shorts. numpy only.
(02 CARE INSTRUCTIONS copy: adds rustle, tissue, squeak, drip, ding, metalclick, sticker, chairroll, scrape, paperslide.)

usage: python3 film/audio.py cues.json out.wav

cues.json:
{
  "dur": 72.0,
  "music": [ {"t": 0.0, "inst": "piano"|"pad"|"musicbox"|"bass", "tempo": 60, "vel": 0.5,
              "notes": "E4:1 G4:1 B4:2 r:1 [C4 E4 G4]:4", "gain": 1.0, "pan": 0.0} ],
  "sfx":   [ {"t": 3.2, "kind": "knock", "gain": 0.8, "pan": 0.0, "args": {...}} ],
  "beds":  [ {"t0": 0.0, "t1": 20.0, "kind": "room", "gain": 0.3, "fade": 1.0, "args": {...}} ],
  "duck":  [ {"t0": 40.0, "t1": 44.0, "amount": 0.2} ]      # optional: pull everything down (silence beats)
}
Notes: pitch name + octave (C4 = middle C), ':' duration in beats, 'r' = rest, [..] = chord.
SFX kinds: knock, woodclick, woodclack, switch, lockclick, door, water, fridge, ping, buzz, musicbox_tune,
           paws, whine, tear, thud, sit, typing, swoosh, birds, bell, heartbeat
Bed kinds: room, city, night, crickets, fire, hum, rain, wind, murmur, courtyard, office
"""
import json, sys, wave, math
import numpy as np

SR = 48000
RNG = np.random.default_rng(7)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def hz(name):
    n = name[:-1]; o = int(name[-1])
    return 440.0 * 2 ** ((NOTE[n] + 12 * (o + 1) - 69) / 12)


def t_(d): return np.arange(int(d * SR)) / SR


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.3):
    e = np.ones(n) * s; A, D, R = int(a * SR), int(d * SR), int(r * SR)
    A = min(A, n); e[:A] = np.linspace(0, 1, A, endpoint=False)
    D = min(D, max(0, n - A)); e[A:A + D] = np.linspace(1, s, D, endpoint=False)
    R = min(R, n); e[n - R:] *= np.linspace(1, 0, R)
    return e


def fft_filter(x, lo=20, hi=20000, tilt=0.0):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float)
    # soft edges
    m = np.where(f < lo, np.exp(-((lo - f) / (lo * 0.3 + 1)) ** 2), m)
    m = np.where(f > hi, np.exp(-((f - hi) / (hi * 0.3 + 1)) ** 2), m)
    if tilt: m *= (np.maximum(f, 20) / 1000.0) ** tilt
    return np.fft.irfft(X * m, len(x))


def noise(d): return RNG.standard_normal(int(d * SR))


def brown(d):
    x = np.cumsum(RNG.standard_normal(int(d * SR))); x -= np.linspace(x[0], x[-1], len(x)); return x / (np.abs(x).max() + 1e-9)


def norm(x, peak=1.0):
    m = np.abs(x).max(); return x * (peak / m) if m > 0 else x


# ---------------- instruments ----------------
def piano(f, dur, vel=0.6):
    """felt piano: inharmonic partials, soft hammer, two slightly detuned strings"""
    n = int((dur + 1.6) * SR); t = np.arange(n) / SR
    out = np.zeros(n); B = 0.00035
    for detune in (0.9995, 1.0005):
        for k in range(1, 13):
            fk = k * f * detune * math.sqrt(1 + B * k * k)
            if fk > 12000: break
            amp = vel / (k ** 1.15) * math.exp(-0.28 * k)
            out += amp * np.sin(2 * math.pi * fk * t + k) * np.exp(-t * (0.55 + 0.32 * k) * (1 + f / 900))
    att = np.minimum(1, t / 0.008); out *= att
    rel = np.ones(n); r0 = int(dur * SR); rel[r0:] = np.exp(-(t[r0:] - dur) * 5.0); out *= rel
    ham = fft_filter(noise(0.03), 300, 2500) * np.exp(-np.arange(int(0.03 * SR)) / SR / 0.006) * 0.08 * vel
    out[:len(ham)] += ham
    return out * 0.5


def pad(freqs, dur, vel=0.4):
    n = int((dur + 2.5) * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            fd = f * 2 ** (det / 12)
            for k in range(1, 9):
                out += (1 / k) * math.exp(-0.45 * k) * np.sin(2 * math.pi * fd * k * t + RNG.random() * 6)
    e = np.minimum(1, t / 1.6) * np.where(t > dur, np.exp(-(t - dur) / 0.9), 1.0)
    out *= e * (1 + 0.08 * np.sin(2 * math.pi * 0.17 * t))
    return out / (len(freqs) * 3) * vel


def bass(f, dur, vel=0.5):
    n = int((dur + 0.8) * SR); t = np.arange(n) / SR
    out = np.sin(2 * math.pi * f * t) + 0.25 * np.sin(2 * math.pi * 2 * f * t)
    e = np.minimum(1, t / 0.02) * np.exp(-t * 0.6) * np.where(t > dur, np.exp(-(t - dur) / 0.2), 1.0)
    return out * e * vel * 0.6


def musicbox(f, dur, vel=0.5):
    n = int(2.2 * SR); t = np.arange(n) / SR
    out = np.sin(2 * math.pi * f * t) * np.exp(-t * 2.2) + 0.35 * np.sin(2 * math.pi * f * 4.2 * t) * np.exp(-t * 9) + 0.15 * np.sin(2 * math.pi * f * 6.8 * t) * np.exp(-t * 14)
    out[:int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return out * vel * 0.4


INST = {'piano': piano, 'bass': bass, 'musicbox': musicbox}


def parse_notes(s):
    """-> list of (beat_offset, [freqs], beats)"""
    out = []; beat = 0.0
    for tok in s.split():
        name, _, d = tok.rpartition(':'); d = float(d)
        if name == 'r': beat += d; continue
        names = name.strip('[]').split() if name.startswith('[') else [name]
        out.append((beat, [hz(nm) for nm in names], d)); beat += d
    return out


def render_music(ev, total):
    buf = np.zeros(total)
    spb = 60.0 / ev.get('tempo', 60)
    inst = ev.get('inst', 'piano'); vel = ev.get('vel', 0.5)
    # chord tokens need bracket-aware split
    s = ev['notes']; toks = []; cur = ''
    depth = 0
    for ch in s:
        if ch == '[': depth += 1
        if ch == ']': depth -= 1
        if ch.isspace() and depth == 0:
            if cur: toks.append(cur); cur = ''
        else: cur += ch
    if cur: toks.append(cur)
    beat = 0.0
    for tok in toks:
        name, _, d = tok.rpartition(':'); d = float(d)
        if name == 'r': beat += d; continue
        names = name.strip('[]').split() if name.startswith('[') else [name]
        t0 = ev['t'] + beat * spb; dur = d * spb
        if inst == 'pad':
            x = pad([hz(n) for n in names], dur, vel)
        else:
            x = sum(INST[inst](hz(n), dur, vel * (1.0 if i == 0 else 0.8)) for i, n in enumerate(names))
        i0 = int(t0 * SR); i1 = min(total, i0 + len(x))
        if i0 < total: buf[i0:i1] += x[:i1 - i0] * ev.get('gain', 1.0)
        beat += d
    return buf


# ---------------- foley ----------------
def damped(freqs, decays, amps, d=0.5):
    t = t_(d); return sum(a * np.sin(2 * math.pi * f * t) * np.exp(-t / dc) for f, dc, a in zip(freqs, decays, amps))


def sfx(kind, a):
    if kind == 'rustle':  # cardboard flap
        d = a.get('dur', 0.35); t = t_(d); x = fft_filter(noise(d), 250, 4500, tilt=-0.2)
        x *= (0.35 + 0.65 * (RNG.random(len(t)) > 0.55)) * np.exp(-t / (d * 0.45)) * np.minimum(1, t / 0.01)
        return x * 0.35 + damped([150, 310], [0.05, 0.03], [1, .4], d) * 0.3
    if kind == 'tissue':  # soft paper crinkle
        d = a.get('dur', 0.7); t = t_(d); x = fft_filter(noise(d), 1800, 10000, tilt=0.2)
        x *= (0.3 + 0.7 * (RNG.random(len(t)) > 0.7)) * np.sin(np.pi * t / d) ** 0.7
        return x * 0.18
    if kind == 'squeak':  # tiny screw turning in wood
        d = 0.16; t = t_(d); f = a.get('f', 1700) + 900 * (t / d); ph = 2 * math.pi * np.cumsum(f) / SR
        x = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.sin(np.pi * t / d) ** 2 * 0.16
        c = sfx('woodclick', {'pitch': 1.5}) * 0.5; x[:len(c)] += c[:len(x)]; return x
    if kind == 'drip':
        d = 0.2; t = t_(d); f = 800 + 2300 * np.sqrt(t / d); ph = 2 * math.pi * np.cumsum(f) / SR
        return np.sin(ph) * np.exp(-t / 0.028) * np.minimum(1, t / 0.002) * 0.55
    if kind == 'ding':  # hopeful little bell
        p = a.get('pitch', 1.0); return damped([1568 * p, 3136 * p, 4704 * p, 6272 * p], [0.9, 0.45, 0.2, 0.1], [1, .35, .15, .06], 2.0) * 0.32
    if kind == 'metalclick':
        d = 0.3; x = damped([2400, 3900, 5600, 7900], [0.03, 0.02, 0.012, 0.008], [1, .8, .6, .4], d) * 0.5
        return x + fft_filter(noise(d), 3000, 12000) * np.exp(-t_(d) / 0.004) * 0.4
    if kind == 'sticker':  # press + tiny peel
        d = 0.3; x = damped([210, 420], [0.03, 0.02], [1, .4], d) * 0.45
        pe = fft_filter(noise(0.07), 2500, 9000) * np.sin(np.pi * t_(0.07) / 0.07) * 0.18; x[int(0.02 * SR):int(0.02 * SR) + len(pe)] += pe; return x
    if kind == 'chairroll':
        d = a.get('dur', 0.6); t = t_(d); env = np.sin(np.pi * np.minimum(1, t / d)) ** 0.8
        x = fft_filter(brown(d), 50, 600) * 0.5 + fft_filter(noise(d), 300, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * math.pi * 23 * t))) * 0.12
        return x * env * 0.6
    if kind == 'scrape':  # cardboard dragged on carpet
        d = a.get('dur', 0.9); t = t_(d); steps = np.repeat(RNG.random(int(d / 0.018) + 2), int(0.018 * SR))[:len(t)]
        x = fft_filter(noise(d), 180, 3200, tilt=-0.3) * (0.4 + 0.6 * steps) * np.sin(np.pi * t / d) ** 0.5
        return x * 0.4
    if kind == 'paperslide':
        d = a.get('dur', 0.6); t = t_(d); x = fft_filter(noise(d), 2200, 11000) * np.sin(np.pi * t / d) ** 1.5
        return x * 0.22
    if kind == 'knock':
        n = a.get('n', 3); gap = a.get('gap', 0.22); out = np.zeros(int((n * gap + 0.6) * SR))
        for i in range(n):
            k = damped([110, 190, 420, 960], [0.06, 0.045, 0.03, 0.012], [1, .8, .5, .25], 0.4) + fft_filter(noise(0.4), 500, 3000) * np.exp(-t_(0.4) / 0.004) * 0.6
            i0 = int(i * gap * SR * (1 + RNG.uniform(-.05, .05))); out[i0:i0 + len(k)] += k * RNG.uniform(.85, 1)
        return out
    if kind == 'woodclick':  # manikin joint click
        p = a.get('pitch', 1.0)
        return damped([1400 * p, 2300 * p, 3700 * p], [0.012, 0.008, 0.005], [1, .6, .3], 0.12) + fft_filter(noise(0.12), 1500, 6000) * np.exp(-t_(0.12) / 0.002) * 0.4
    if kind == 'woodclack':  # louder wooden contact
        return damped([380, 820, 1650], [0.03, 0.02, 0.01], [1, .7, .4], 0.25) + fft_filter(noise(0.25), 400, 4000) * np.exp(-t_(0.25) / 0.004) * 0.7
    if kind == 'switch':
        return fft_filter(noise(0.08), 1000, 8000) * np.exp(-t_(0.08) / 0.003) * 0.9 + damped([2600], [0.01], [0.4], 0.08)
    if kind == 'lockclick':
        x = damped([3100, 4700, 6300], [0.015, 0.01, 0.006], [1, .7, .5], 0.25) + fft_filter(noise(0.25), 2000, 9000) * np.exp(-t_(0.25) / 0.003) * 0.5
        y = np.zeros(int(0.45 * SR)); y[:len(x)] += x; y[int(0.12 * SR):int(0.12 * SR) + len(x)] += x * 0.7; return y
    if kind == 'door':  # handle, creak, latch
        d = a.get('dur', 1.4); t = t_(d)
        creak = np.sin(2 * math.pi * np.cumsum(180 + 60 * np.sin(2 * math.pi * 3 * t) + 40 * RNG.standard_normal(len(t)).cumsum() / 400) / SR) * np.minimum(1, t / 0.2) * np.exp(-t / (d * 0.6)) * 0.25
        latch = np.zeros(len(t)); lk = sfx('lockclick', {}); latch[:len(lk)] += lk[:len(latch)] * 0.6
        return fft_filter(creak, 150, 2500) + latch
    if kind == 'water':
        d = a.get('dur', 2.0); x = fft_filter(noise(d), 800, 7000, tilt=-0.3)
        x *= (0.7 + 0.3 * np.abs(np.sin(2 * math.pi * 7.3 * t_(d)) * np.sin(2 * math.pi * 3.1 * t_(d))))
        return x * np.minimum(1, t_(d) / 0.08) * np.minimum(1, (d - t_(d)) / 0.15) * 0.35
    if kind == 'fridge':  # door suction + hum swell
        d = a.get('dur', 2.5); thump = damped([70, 140], [0.08, 0.05], [1, .4], d) * 0.8
        hum = (np.sin(2 * math.pi * 50 * t_(d)) + 0.4 * np.sin(2 * math.pi * 100 * t_(d)) + 0.2 * np.sin(2 * math.pi * 150 * t_(d))) * np.minimum(1, t_(d) / 0.4) * 0.12
        return thump + hum + fft_filter(noise(d), 60, 400) * 0.05
    if kind == 'ping':
        return damped([1318.5, 1975.5, 2637], [0.35, 0.22, 0.12], [1, .45, .2], 1.2) * 0.5
    if kind == 'buzz':
        d = a.get('dur', 0.9); t = t_(d); sq = np.sign(np.sin(2 * math.pi * 165 * t)) * 0.3
        gate = ((t % 0.45) < 0.3).astype(float); return fft_filter(sq * gate, 100, 1200) * 0.5
    if kind == 'musicbox_tune':
        notes = a.get('notes', 'E6:1 G6:1 B6:1 E7:2 D7:1 B6:1 G6:2'); ev = {'t': 0, 'inst': 'musicbox', 'tempo': a.get('tempo', 140), 'vel': 0.6, 'notes': notes}
        return render_music(ev, int(a.get('dur', 6) * SR))
    if kind == 'paws':  # wooden dog feet on floor
        n = a.get('n', 6); rate = a.get('rate', 5.0); out = np.zeros(int((n / rate + 0.3) * SR))
        for i in range(n):
            c = sfx('woodclick', {'pitch': RNG.uniform(0.5, 0.65)}) * RNG.uniform(.5, .9); i0 = int(i / rate * SR); out[i0:i0 + len(c)] += c[:len(out) - i0]
        return out
    if kind == 'whine':  # dog whine
        d = a.get('dur', 1.2); t = t_(d)
        f = 620 + 260 * np.sin(math.pi * t / d) ** 1.5 + 18 * np.sin(2 * math.pi * 6 * t)
        ph = 2 * math.pi * np.cumsum(f) / SR
        x = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
        return fft_filter(x, 400, 3500) * np.sin(math.pi * t / d) ** 0.6 * 0.35
    if kind == 'tear':
        d = a.get('dur', 0.7); t = t_(d); x = fft_filter(noise(d), 700, 9000, tilt=0.4)
        x *= (0.4 + 0.6 * (RNG.random(len(t)) > 0.3)) * np.minimum(1, t / 0.02) * np.exp(-t / (d * 0.6)); return x * 0.4
    if kind == 'thud':
        return damped([55, 90, 160], [0.12, 0.08, 0.04], [1, .6, .3], 0.6) * 0.9
    if kind == 'sit':  # body onto sofa: soft thud + fabric
        return sfx('thud', {}) * 0.5 + fft_filter(noise(0.5), 300, 3000) * np.exp(-t_(0.5) / 0.08) * 0.2
    if kind == 'typing':
        d = a.get('dur', 2.0); out = np.zeros(int(d * SR)); tt = 0.0
        while tt < d - 0.1:
            c = damped([1800, 3200], [0.006, 0.004], [1, .5], 0.05) * RNG.uniform(.2, .45); i0 = int(tt * SR); out[i0:i0 + len(c)] += c[:len(out) - i0]; tt += RNG.uniform(0.08, 0.22)
        return out
    if kind == 'swoosh':  # message sent
        d = 0.5; t = t_(d); x = fft_filter(noise(d), 600, 6000) * np.sin(math.pi * t / d) ** 2; return x * 0.35
    if kind == 'birds':
        d = a.get('dur', 4.0); out = np.zeros(int(d * SR)); tt = RNG.uniform(0, .5)
        while tt < d - 0.4:
            n = int(0.12 * SR); tc = np.arange(n) / SR; f0 = RNG.uniform(2800, 4200)
            ch = np.sin(2 * math.pi * np.cumsum(f0 + 900 * np.sin(2 * math.pi * RNG.uniform(12, 25) * tc)) / SR) * np.sin(math.pi * tc / tc[-1])
            i0 = int(tt * SR); out[i0:i0 + n] += ch[:len(out) - i0] * RNG.uniform(.05, .15); tt += RNG.uniform(0.15, 0.9)
        return out
    if kind == 'bell':  # tram bell ding-ding
        x = damped([1180, 2950, 4100], [0.5, 0.25, 0.12], [1, .5, .25], 1.2) * 0.4
        y = np.zeros(int(1.6 * SR)); y[:len(x)] += x; y[int(0.35 * SR):int(0.35 * SR) + len(x)] += x[:len(y) - int(0.35 * SR)] * 0.9; return y
    if kind == 'heartbeat':
        b = damped([48, 70], [0.07, 0.05], [1, .5], 0.3); y = np.zeros(int(0.9 * SR)); y[:len(b)] += b; y[int(0.28 * SR):int(0.28 * SR) + len(b)] += b * 0.7; return y * 0.8
    raise ValueError('unknown sfx ' + kind)


def bed(kind, d, a):
    t = t_(d)
    if kind == 'room': return fft_filter(brown(d), 30, 400) * 0.08
    if kind == 'hum': return (np.sin(2 * math.pi * a.get('f', 50) * t) + 0.3 * np.sin(2 * math.pi * 2 * a.get('f', 50) * t)) * 0.05
    if kind == 'city': return fft_filter(brown(d), 40, 600) * (0.8 + 0.2 * np.sin(2 * math.pi * 0.05 * t)) * 0.25
    if kind == 'wind': return fft_filter(brown(d), 80, 1200) * (0.6 + 0.4 * np.sin(2 * math.pi * 0.07 * t) ** 2) * 0.3
    if kind == 'rain': return fft_filter(noise(d), 1500, 9000, tilt=-0.2) * 0.06
    if kind == 'office': return fft_filter(brown(d), 60, 900) * 0.12 + np.sin(2 * math.pi * 120 * t) * 0.006
    if kind == 'crickets':
        out = np.zeros(len(t))
        for c in range(a.get('n', 6)):
            f = RNG.uniform(4200, 5200); rate = RNG.uniform(2.2, 3.5); ph = RNG.uniform(0, 6)
            chirp = np.sin(2 * math.pi * f * t) * (np.sin(2 * math.pi * 45 * t) > 0.2) * (np.sin(2 * math.pi * rate * t + ph) > 0.55)
            out += chirp * RNG.uniform(.01, .03) * (0.6 + 0.4 * np.sin(2 * math.pi * 0.03 * t + c))
        return out
    if kind == 'night': return bed('wind', d, a) * 0.5 + bed('crickets', d, a)
    if kind == 'fire':
        out = fft_filter(brown(d), 40, 300) * 0.25
        n_pops = int(d * a.get('pops', 9));
        for _ in range(n_pops):
            p = fft_filter(noise(0.03), 1500, 7000) * np.exp(-t_(0.03) / 0.003) * RNG.uniform(.1, .5); i0 = RNG.integers(0, len(t) - len(p)); out[i0:i0 + len(p)] += p
        return out
    if kind == 'murmur':  # distant voices: formant-filtered noise syllables
        out = np.zeros(len(t)); tt = 0.0
        while tt < d - 0.3:
            n = int(RNG.uniform(0.12, 0.3) * SR); f1 = RNG.uniform(350, 800); f2 = RNG.uniform(900, 2200)
            s = fft_filter(RNG.standard_normal(n), f1 * 0.8, f1 * 1.2) + 0.6 * fft_filter(RNG.standard_normal(n), f2 * 0.9, f2 * 1.1)
            s *= np.sin(math.pi * np.arange(n) / n); i0 = int(tt * SR); out[i0:i0 + n] += s[:len(out) - i0] * RNG.uniform(.05, .15)
            tt += RNG.uniform(0.05, 0.35)
        return fft_filter(out, 150, 3000) * 0.6
    if kind == 'courtyard': return bed('murmur', d, a) + sfx_bed('birds', d) * 0.8 + fft_filter(brown(d), 50, 500) * 0.06
    raise ValueError('unknown bed ' + kind)


def sfx_bed(kind, d): return sfx(kind, {'dur': d})


def reverb_ir(seconds=2.4, damp=5000):
    n = int(seconds * SR); t = np.arange(n) / SR
    irs = []
    for ch in range(2):
        x = RNG.standard_normal(n) * np.exp(-t / (seconds / 6.9))
        x = fft_filter(x, 80, damp); x[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR)); irs.append(x / np.sqrt((x ** 2).sum()))
    return irs


def convolve(x, ir):
    n = len(x) + len(ir) - 1; N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:len(x)]


def pan2(x, p):
    l = math.cos((p + 1) * math.pi / 4); r = math.sin((p + 1) * math.pi / 4); return np.stack([x * l, x * r])


def main(cfile, out):
    c = json.load(open(cfile)); total = int(c['dur'] * SR)
    dry = np.zeros((2, total)); wet_in = np.zeros(total); mwet = np.zeros(total)
    for ev in c.get('music', []):
        x = render_music(ev, total); dry += pan2(x, ev.get('pan', 0.0)) * 0.8; mwet += x * ev.get('reverb', 0.35)
    for ev in c.get('beds', []):
        d = ev['t1'] - ev['t0']; x = bed(ev['kind'], d, ev.get('args', {})) * ev.get('gain', 1.0)
        fd = int(ev.get('fade', 0.5) * SR); e = np.ones(len(x));
        if fd > 0: e[:fd] = np.linspace(0, 1, fd); e[-fd:] = np.minimum(e[-fd:], np.linspace(1, 0, fd))
        x *= e; i0 = int(ev['t0'] * SR); i1 = min(total, i0 + len(x))
        dry[:, i0:i1] += pan2(x[:i1 - i0], ev.get('pan', 0.0)); wet_in[i0:i1] += x[:i1 - i0] * ev.get('reverb', 0.05)
    for ev in c.get('sfx', []):
        x = sfx(ev['kind'], ev.get('args', {})) * ev.get('gain', 1.0)
        i0 = int(ev['t'] * SR); i1 = min(total, i0 + len(x))
        if i0 >= total: continue
        dry[:, i0:i1] += pan2(x[:i1 - i0], ev.get('pan', 0.0)); wet_in[i0:i1] += x[:i1 - i0] * ev.get('reverb', 0.15)
    irL, irR = reverb_ir(c.get('room', 2.2))
    dry[0] += convolve(mwet + wet_in, irL) * 0.9; dry[1] += convolve(mwet + wet_in, irR) * 0.9
    for dk in c.get('duck', []):
        i0, i1 = int(dk['t0'] * SR), int(dk['t1'] * SR); fd = int(0.4 * SR); g = np.ones(total)
        g[i0:i1] = dk.get('amount', 0.2)
        if i0 - fd > 0: g[i0 - fd:i0] = np.linspace(1, dk.get('amount', 0.2), fd)
        if i1 + fd < total: g[i1:i1 + fd] = np.linspace(dk.get('amount', 0.2), 1, fd)
        dry *= g
    # fade out tail + soft limit
    fo = int(c.get('fadeOut', 1.5) * SR); dry[:, -fo:] *= np.linspace(1, 0, fo)
    peak = np.abs(dry).max(); target = 10 ** (-1.5 / 20)
    dry = dry / peak * target * c.get('master', 1.0) if peak > 0 else dry
    dry = np.tanh(dry * 1.1) / np.tanh(1.1)
    pcm = (np.clip(dry.T, -1, 1) * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    rms = np.sqrt((dry ** 2).mean())
    print(f'wrote {out}: {c["dur"]:.1f}s, rms {20*math.log10(rms+1e-9):.1f} dBFS')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
