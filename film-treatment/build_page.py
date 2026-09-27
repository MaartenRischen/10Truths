#!/usr/bin/env python3
"""Build the treatment page from the direction docs, the recovered script and the rendered frames.

Reads   sb/directions/*.md, sb/script.json, sb/opt-<L>/*.png|mp4, sb/copy/*.html
Writes  page/index.html, page/img/<L>/*.webp, page/media/*.mp4
"""
import json, os, re, html, shutil, subprocess
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SP = os.path.dirname(ROOT)
OUT = os.path.join(SP, 'page')
IMG = os.path.join(OUT, 'img')
MEDIA = os.path.join(OUT, 'media')

DIRS = [
    dict(L='A', key='one-line', name='One Line', file='A-one-line.md', acc='#ff6a33', pipe='Rendered in code by Claude',
         cost='$0–500', time='5–8 days',
         palette=[('Paper black', '#0f0d0b'), ('Bone line', '#efe6d6'), ('Ember', '#ff5a1f'), ('Graphite', '#5b554e')],
         moments=['1:52', '2:06', '2:40', '3:04', '4:15'], ratio='wide', clip_beat=1),
    dict(L='B', key='human-sized', name='Human-Sized', file='B-human-sized.md', acc='#f0a14a', pipe='Blender, path-traced',
         cost='$150–1,100', time='2–3 weeks',
         palette=[('Tungsten', '#f0a14a'), ('Beech', '#e2c094'), ('Jute', '#b89a62'), ('Cardboard', '#a57c52'), ('Screen LED', '#8fd6ff'), ('Studio dark', '#151210')],
         moments=['1:52', '2:40', '3:51', '4:17', '5:02'], ratio='wide', clip_beat=8),
    dict(L='C', key='wrong-painting', name='The Wrong Painting', file='C-wrong-painting.md', acc='#d9774a', pipe='Image models + code compositing',
         cost='$300–1,800', time='2–3 weeks',
         palette=[('Red ochre', '#b5532e'), ('Charcoal', '#1e1b19'), ('Limestone', '#cdbb9c'), ('Night green', '#1f3a33'), ('Diner light', '#f3e6a0'), ('CGI chrome', '#d9dee3')],
         moments=['1:52', '2:40', '3:06', '4:29', '5:02'], ratio='wide', clip_beat=8),
    dict(L='D', key='threads', name='Threads', file='D-threads.md', acc='#ffb45a', pipe='WebGL, rendered in code by Claude',
         cost='$20–1,100', time='1–2 weeks',
         palette=[('Void', '#030406'), ('Walnut', '#4a2f1f'), ('Landed amber', '#ffb45a'), ('Screen cyan', '#9fe3ff'), ('Alarm red', '#ff3b2f')],
         moments=['1:04', '2:40', '3:51', '4:01', '4:17', '5:02'], ratio='wide', clip_beat=9),
    dict(L='E', key='match-cut', name='Match Cut', file='E-match-cut.md', acc='#62bccb', pipe='Gen-video + Blender references',
         cost='$400–2,000', time='2–3 weeks',
         palette=[('Modern teal', '#2f6f78'), ('Screen blue', '#7fb7ff'), ('Firelight', '#f08a3c'), ('Dusk gold', '#e7b467'), ('Film black', '#0b0c0d')],
         moments=['0:00', '2:50', '3:06', '4:17', '5:02'], ratio='scope', clip_beat=1),
]

BEATS = [
    ('01', 'Open', '0:00'), ('02', 'Not anti-tech', '0:13'), ('03', 'How we feel', '0:25'), ('04', 'Self-blame', '0:41'),
    ('05', 'Mismatch', '0:50'), ('06', 'Human-sized', '0:57'), ('07', 'Tuned drives', '1:12'), ('08', 'Everything changed', '1:42'),
    ('09', 'The loop', '2:04'), ('10', 'Loneliness', '2:24'), ('11', 'It is everything', '3:02'), ('12', 'On purpose', '3:56'),
    ('13', 'Not broken', '4:15'), ('14', 'The answer', '4:36'), ('15', 'The new world', '4:48'), ('16', 'Close', '5:13'),
]
BEAT_KEYS = ['open', 'disclaimer', 'symptoms', 'self-blame', 'mismatch', 'human-sized', 'drives', 'change', 'loop',
             'loneliness', 'litany', 'business', 'hinge', 'answer', 'future', 'close']

esc = lambda s: html.escape(s, quote=True)


def md_inline(s):
    s = esc(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', s)
    return s


def parse_direction(path):
    t = open(path, encoding='utf-8').read()
    d = {}
    d['logline'] = re.search(r'\*\*Logline\.\*\*\s*(.+?)\n\n', t, re.S).group(1).strip()
    d['why'] = re.search(r'\*\*Why it fits\.\*\*\s*(.+?)\n\n', t, re.S).group(1).strip()

    def section(name):
        m = re.search(r'^## ' + re.escape(name) + r'.*?\n(.+?)(?=^## |\Z)', t, re.S | re.M)
        return m.group(1).strip() if m else ''

    look = section('Look')
    d['look'] = [re.sub(r'^\s*[-\d.]+\s*', '', l).strip() for l in re.findall(r'^- .+(?:\n  .+)*', look, re.M)]
    mom = section('Signature moments')
    d['moments'] = []
    for m in re.finditer(r'^\d+\.\s+\*\*(.+?)\*\*\s*(.+)$', mom, re.M):
        d['moments'].append((m.group(1).strip().rstrip('.'), m.group(2).strip()))
    sb = section('Storyboard')
    d['panels'] = []
    for m in re.finditer(r'^- \*\*P(\d\d) ([^*]+?)\.\*\*\s*(.+)$', sb, re.M):
        d['panels'].append((m.group(1), m.group(2).strip(), m.group(3).strip()))
    prod = section('Production')
    d['production'] = [l[2:].strip() for l in prod.splitlines() if l.startswith('- ')]
    return d


def to_webp(src, dst, width=None, q=80):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return True
    im = Image.open(src).convert('RGB')
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=q, method=6)
    return True


def frames_for(L):
    """Collect frames for a direction, convert, and return a dict of relative paths."""
    src = os.path.join(ROOT, 'opt-' + L)
    res = {'hero': [], 'panels': {}, 'loop': None, 'poster': ''}
    if not os.path.isdir(src):
        return res
    for h in ('hero-1', 'hero-2'):
        p = os.path.join(src, h + '.png')
        if os.path.exists(p):
            to_webp(p, os.path.join(IMG, L, h + '.webp'), 1920, 84)
            w, hh = Image.open(p).size
            res['hero'].append((f'img/{L}/{h}.webp', w, hh))
    for n in range(1, 17):
        nn = f'{n:02d}'
        items = []
        for suffix in ('', '-a', '-b'):
            p = os.path.join(src, f'p{nn}{suffix}.png')
            if os.path.exists(p):
                base = f'p{nn}{suffix}'
                to_webp(p, os.path.join(IMG, L, base + '.webp'), 1280, 80)
                to_webp(p, os.path.join(IMG, L, base + '-t.webp'), 640, 76)
                w, hh = Image.open(p).size
                items.append((f'img/{L}/{base}-t.webp', f'img/{L}/{base}.webp', w, hh, suffix))
        if items:
            res['panels'][nn] = items
    lp = os.path.join(src, 'loop.mp4')
    if os.path.exists(lp):
        os.makedirs(MEDIA, exist_ok=True)
        shutil.copy2(lp, os.path.join(MEDIA, f'{L}-loop.mp4'))
        res['loop'] = f'media/{L}-loop.mp4'
        poster = os.path.join(MEDIA, f'{L}-loop.jpg')
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', lp],
                                   capture_output=True, text=True).stdout.strip() or 4)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{dur * 0.8:.2f}', '-i', lp, '-frames:v', '1', '-q:v', '4', poster], check=False)
        res['poster'] = f'media/{L}-loop.jpg' if os.path.exists(poster) else ''
    return res


def script_by_beat():
    s = json.load(open(os.path.join(ROOT, 'script.json'), encoding='utf-8'))
    out = {k: [] for k in BEAT_KEYS}
    for row in s:
        out[row['beat']].append(row)
    return out


def read_copy(name, default=''):
    p = os.path.join(ROOT, 'copy', name)
    return open(p, encoding='utf-8').read() if os.path.exists(p) else default


def render():
    os.makedirs(IMG, exist_ok=True)
    sbb = script_by_beat()
    total_frames = 0
    sections = []
    anim = {'dirs': {}}
    contact = []
    for D in DIRS:
        d = parse_direction(os.path.join(ROOT, 'directions', D['file']))
        fr = frames_for(D['L'])
        total_frames += len(fr['hero']) + sum(len(v) for v in fr['panels'].values())
        L = D['L']
        anim['dirs'][L] = {'name': D['name'], 'acc': D['acc'],
                           'frames': [[it[1] for it in fr['panels'].get(f'{n:02d}', [])] for n in range(1, 17)],
                           'clip': ({'beat': D['clip_beat'] - 1, 'src': fr['loop']} if fr['loop'] else None)}
        # contact sheet tile
        if fr['hero']:
            src = fr['hero'][0][0]
            contact.append(f'<a class="cs-tile" href="#{L}"><img src="{src}" alt="" loading="eager" decoding="async"><span class="cs-cap"><b>{L}</b> {esc(D["name"])}</span></a>')
        else:
            contact.append(f'<a class="cs-tile cs-empty" href="#{L}"><span class="cs-cap"><b>{L}</b> {esc(D["name"])}</span></a>')

        heroes = ''
        if fr['hero']:
            h1 = fr['hero'][0]
            heroes += f'<figure class="hero hero-{D["ratio"]}"><img src="{h1[0]}" width="{h1[1]}" height="{h1[2]}" alt="Style frame for direction {L}, {esc(D["name"])}" decoding="async"></figure>'
        why = f'<div class="why"><h3 class="label">Why it fits</h3><p>{md_inline(d["why"])}</p></div>'
        h2 = ''
        if len(fr['hero']) > 1:
            x = fr['hero'][1]
            h2 = f'<figure class="hero2"><img src="{x[0]}" width="{x[1]}" height="{x[2]}" alt="Second style frame for direction {L}" loading="lazy" decoding="async"></figure>'
        chips = ''.join(f'<li><span class="sw" style="background:{c}"></span><span class="swn">{esc(n)}</span><span class="swh">{c}</span></li>' for n, c in D['palette'])
        look = ''.join(f'<li>{md_inline(x)}</li>' for x in d['look'])
        moments = ''
        for i, (title, body) in enumerate(d['moments']):
            tc = D['moments'][i] if i < len(D['moments']) else ''
            moments += f'<li><span class="tc">{tc}</span><div><strong>{md_inline(title)}</strong><p>{md_inline(body)}</p></div></li>'
        panels = ''
        for (nn, beatname, body), (bn, blabel, btc), bkey in zip(d['panels'], BEATS, BEAT_KEYS):
            lines = sbb[bkey]
            vo_first = lines[0]['line'] if lines else ''
            vo_all = ' '.join(r['line'] for r in lines)
            items = fr['panels'].get(nn, [])
            if items:
                imgs = []
                for j, (thumb, full, w, h, suf) in enumerate(items):
                    if j:
                        imgs.append('<span class="cut">cut to</span>')
                    imgs.append(f'<button class="frame" type="button" data-full="{full}" aria-label="Open frame {L}{nn}{suf} full size"><img src="{thumb}" width="{w}" height="{h}" alt="{esc(L + nn + " " + blabel)}" loading="lazy" decoding="async"></button>')
                media = ''.join(imgs)
            else:
                media = '<div class="frame-missing">Frame rendering</div>'
            body_html = md_inline(body)
            panels += (f'<article class="panel" id="{L}-p{nn}" data-l="{L}" data-n="{nn}" data-vo="{esc(vo_all)}" data-shot="{esc(re.sub(r"[*]", "", body))}" data-beat="{esc(blabel)}" data-tc="{btc}">'
                       f'<div class="pmedia">{media}</div>'
                       f'<div class="pmeta"><span class="tc">{btc}</span><span class="pnum">{L}{nn}</span><span class="pbeat">{esc(blabel)}</span>'
                       f'<button class="cmt" type="button" hidden>Comment</button></div>'
                       f'<p class="vo">“{esc(vo_first)}”</p><p class="shot">{body_html}</p></article>')
        loop = ''
        if fr['loop']:
            loop = (f'<figure class="loop"><video src="{fr["loop"]}" poster="{fr["poster"]}" muted loop playsinline autoplay preload="metadata" aria-label="Motion test for direction {L}"></video>'
                    f'<figcaption><span class="label">Motion test</span> Rendered in this session. Loops.</figcaption></figure>')
        prod = ''.join(f'<li>{md_inline(x)}</li>' for x in d['production'])
        sections.append(f'''
<section class="dir" id="{L}" style="--acc:{D['acc']}" data-l="{L}">
  <header class="dir-head">
    <p class="slate"><span class="slate-l">{L}</span><span>{esc(D['pipe'])}</span><span>{esc(D['cost'])}</span><span>{esc(D['time'])}</span></p>
    <h2>{esc(D['name'])}</h2>
    <p class="logline">{md_inline(d['logline'])}</p>
    <p><button type="button" class="play" data-l="{L}"><span aria-hidden="true">▶</span> Play the animatic <span class="play-t">5:26, with the film's voice</span></button></p>
  </header>
  {heroes}
  <div class="dir-duo">{why}{h2}</div>
  <div class="dir-cols">
    <div class="look"><h3 class="label">Look</h3><ul class="chips">{chips}</ul><ul class="bul">{look}</ul></div>
    <div class="moments"><h3 class="label">Signature moments</h3><ol class="mom">{moments}</ol>{loop}</div>
  </div>
  <div class="board"><h3 class="label">Storyboard <span class="muted">16 beats, 5:26</span></h3><div class="grid {'grid-scope' if D['ratio']=='scope' else ''}">{panels}</div></div>
  <div class="dir-cols dir-foot">
    <div class="prod"><h3 class="label">How it gets made</h3><ul class="bul">{prod}</ul></div>
    <div class="call" data-l="{L}">
      <h3 class="label">Your call on {L}</h3>
      <div class="stars" role="radiogroup" aria-label="Rate direction {L}">{''.join(f'<button type="button" class="star" role="radio" aria-checked="false" data-v="{v}" aria-label="{v} of 5">★</button>' for v in range(1, 6))}</div>
      <label class="pick"><input type="checkbox" id="pick-{L}" data-l="{L}"> <span>This is the one</span></label>
      <label class="note-l" for="note-{L}">Notes on {esc(D['name'])}</label>
      <textarea id="note-{L}" data-l="{L}" rows="3" maxlength="4000" placeholder="What works, what doesn't, what to steal from the others"></textarea>
      <p class="save-state" aria-live="polite"></p>
    </div>
  </div>
</section>''')

    script_html = ''
    for (bn, blabel, btc), bkey in zip(BEATS, BEAT_KEYS):
        rows = ''.join(f'<tr><td class="tc">{r["t"]}</td><td>{esc(r["line"])}</td></tr>' for r in sbb[bkey])
        script_html += f'<tbody><tr class="bh"><th colspan="2"><span>{bn}</span> {esc(blabel)}</th></tr>{rows}</tbody>'

    lines = json.load(open(os.path.join(ROOT, 'script.json'), encoding='utf-8'))
    starts = [next(r['s'] for r in lines if r['beat'] == k) for k in BEAT_KEYS]
    anim['dur'] = 326.6
    anim['beats'] = [{'n': b[0], 'label': b[1], 's': st, 'e': (starts[i + 1] if i + 1 < len(starts) else 326.6)}
                     for i, (b, st) in enumerate(zip(BEATS, starts))]
    anim['lines'] = [{'s': r['s'], 'line': r['line']} for r in lines]
    anim_json = json.dumps(anim, ensure_ascii=False).replace('</', '<\\/')
    tpl = open(os.path.join(ROOT, 'page_template.html'), encoding='utf-8').read()
    page = (tpl.replace('{{CONTACT}}', '\n'.join(contact))
               .replace('{{SECTIONS}}', '\n'.join(sections))
               .replace('{{SCRIPT}}', script_html)
               .replace('{{FRAMES}}', str(total_frames))
               .replace('{{BAR}}', read_copy('bar.html'))
               .replace('{{COMPARE}}', read_copy('compare.html'))
               .replace('{{RECO}}', read_copy('reco.html'))
               .replace('{{NEEDS}}', read_copy('needs.html'))
               .replace('{{ANIM}}', anim_json))
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page)
    print('built', os.path.join(OUT, 'index.html'), 'frames:', total_frames)


if __name__ == '__main__':
    render()
