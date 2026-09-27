#!/usr/bin/env python3
"""Build the rough-cuts page: filmspage/index.html + media/ + img/.

Reads, per film N in 01..04:
  sb/films/0N-*.md               script (logline, turn, end card, shot table)
  sb/films/out/0N/film.json      real shot timings from the render
  sb/films/out/0N/board/sNN.png  one still per shot (quality still)
  sb/films/out/0N/film.mp4       the assembled animatic
  filmspage/review.json          director's review: pass line, weak spots, captions, poster shot
Encodes a web copy of each film that fits the artifact's 15 MB per-file limit.
usage: python3 filmspage/build.py [--no-media]
"""
import glob, html, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SP = os.path.dirname(HERE)
esc = lambda s: html.escape(str(s), quote=True)
NO_MEDIA = '--no-media' in sys.argv

TITLES = {'01': 'The Visitor', '02': 'Care Instructions', '03': 'The Night Watch', '04': 'Good Dog'}
REVIEW = json.load(open(os.path.join(HERE, 'review.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'review.json')) else {}


def mmss(t):
    t = max(0, t)
    return f'{int(t // 60)}:{t % 60:04.1f}'.replace('.0', '') if t % 1 else f'{int(t // 60)}:{int(t % 60):02d}'


def clock(t):
    return f'{int(t // 60)}:{int(round(t)) % 60:02d}'


def parse_script(n):
    f = glob.glob(os.path.join(SP, f'sb/films/{n}-*.md'))[0]
    t = open(f, encoding='utf-8').read()
    g = lambda p: (re.search(p, t).group(1).strip() if re.search(p, t) else '')
    rows = []
    for line in t.split('\n'):
        if re.match(r'^\| \d', line):
            c = [x.strip() for x in line.strip().strip('|').split('|')]
            rows.append({'n': c[0], 'time': c[1], 'frame': c[2], 'action': c[3], 'light': c[4], 'sound': c[5]})
    return {'logline': g(r'\*\*Logline\.\*\*\s*(.+)'), 'turn': g(r'\*\*The turn\.\*\*\s*(.+)'),
            'end': g(r'\*\*End card:\*\*\s*"(.+)"'), 'rows': rows, 'src': os.path.relpath(f, SP)}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-2000:])
        raise SystemExit('failed: ' + ' '.join(cmd[:6]))


def probe_dur(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def web_video(src, dst, budget_mb=14.2, abr=128):
    """Two-pass H.264 sized to fit the per-file limit."""
    if os.path.exists(dst) and os.path.getmtime(dst) > os.path.getmtime(src):
        return
    dur = probe_dur(src)
    vk = int((budget_mb * 8e6 / dur - abr * 1000) / 1000)
    vk = min(vk, 4000)
    log = os.path.join(HERE, 'x264pass')
    base = ['ffmpeg', '-y', '-v', 'error', '-i', src, '-c:v', 'libx264', '-preset', 'slow', '-tune', 'film', '-profile:v', 'high',
            '-pix_fmt', 'yuv420p', '-b:v', f'{vk}k', '-maxrate', f'{int(vk * 1.6)}k', '-bufsize', f'{vk * 3}k', '-passlogfile', log]
    run(base + ['-pass', '1', '-an', '-f', 'mp4', '/dev/null'])
    run(base + ['-pass', '2', '-c:a', 'aac', '-b:a', f'{abr}k', '-movflags', '+faststart', dst])
    for f in glob.glob(log + '*'):
        os.remove(f)
    print(f'  web video {os.path.basename(dst)}: {os.path.getsize(dst) / 1e6:.1f} MB at {vk} kb/s')


def webp(src, dst, w, q=82):
    if os.path.exists(dst) and os.path.getmtime(dst) > os.path.getmtime(src):
        return
    run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-vf', f'scale={w}:-2:flags=lanczos', '-c:v', 'libwebp', '-quality', str(q), dst])


def film(n):
    s = parse_script(n)
    out = os.path.join(SP, f'sb/films/out/{n}')
    rv = REVIEW.get(n, {})
    mf = next((p for p in (os.path.join(out, 'film.json'), os.path.join(out, 'frames', 'film.json')) if os.path.exists(p)), None)
    meta = json.load(open(mf)) if mf else None
    shots = meta['shots'] if meta else [{'name': r['n'], 'start': None, 'dur': None} for r in s['rows']]
    dur = meta['dur'] if meta else None
    os.makedirs(os.path.join(HERE, 'img', n), exist_ok=True)
    board = sorted(glob.glob(os.path.join(out, 'board', 's*.png')))
    caps = rv.get('captions', {})
    items = []
    for i, sh in enumerate(shots):
        k = f'{i + 1:02d}'
        src = board[i] if i < len(board) else ''
        img = None
        if os.path.exists(src) and not NO_MEDIA:
            img = f'img/{n}/s{k}.webp'
            webp(src, os.path.join(HERE, img), 216, 80)
        cap = caps.get(str(i + 1)) or (s['rows'][i]['action'].split('. ')[0].rstrip('.') + '.' if i < len(s['rows']) else sh['name'])
        items.append({'k': k, 'img': img, 'start': sh.get('start'), 'cap': cap})
    poster = None
    ps = rv.get('poster')
    if ps and int(ps) <= len(board) and not NO_MEDIA:
        poster = f'img/{n}/poster.webp'
        webp(board[int(ps) - 1], os.path.join(HERE, poster), 720, 84)
    video = None
    if os.path.exists(os.path.join(out, 'film.mp4')) and not NO_MEDIA:
        video = f'media/{n}.mp4'
        web_video(os.path.join(out, 'film.mp4'), os.path.join(HERE, video))
        dur = dur or probe_dur(os.path.join(out, 'film.mp4'))
    return {'n': n, 'title': TITLES[n], **s, 'shots': items, 'dur': dur, 'poster': poster, 'video': video, 'rv': rv}


def board_html(f):
    cells = []
    for it in f['shots']:
        t = it['start']
        img = f'<img src="{esc(it["img"])}" alt="" loading="lazy" width="216" height="384">' if it['img'] else '<span class="ph" aria-hidden="true"></span>'
        tc = clock(t) if t is not None else ''
        cells.append(f'<li><button type="button" class="shot" data-t="{t if t is not None else ""}" aria-label="Play from shot {int(it["k"])}{" at " + tc if tc else ""}">'
                     f'{img}<span class="sh-n">{it["k"]}<span>{tc}</span></span><span class="sh-c">{esc(it["cap"])}</span></button></li>')
    return f'<ol class="board" aria-label="Storyboard for {esc(f["title"])}: select a shot to play from it">{"".join(cells)}</ol>'


def shotlist_html(f):
    rows = ''.join(f'<tr><td class="c-n">{esc(r["n"])}</td><td class="c-t">{esc(r["time"])}</td><td><strong>{esc(r["frame"])}.</strong> {esc(r["action"])}</td><td class="c-s">{esc(r["sound"])}</td></tr>' for r in f['rows'])
    return (f'<details class="script"><summary>The script as written <span>{len(f["rows"])} shots</span></summary>'
            f'<div class="tbl"><table><thead><tr><th>#</th><th>Time</th><th>Frame and action</th><th>Sound</th></tr></thead><tbody>{rows}</tbody></table></div>'
            f'<p class="src">The animatic follows this closely; where it differs, the film is the newer version.</p></details>')


def film_html(f):
    n, rv = f['n'], f['rv']
    k = f'f{n}'
    dur = clock(f['dur']) if f['dur'] else '—'
    if f['video']:
        player = (f'<video id="v-{k}" controls playsinline preload="metadata" {"poster=" + chr(34) + esc(f["poster"]) + chr(34) if f["poster"] else ""} '
                  f'aria-label="{esc(f["title"])}, rough cut, {dur}"><source src="{esc(f["video"])}" type="video/mp4"></video>')
    else:
        player = '<div class="pending-v"><span class="label">Rendering</span><p>The rough cut appears here when it is finished.</p></div>'
    weak = ''.join(f'<li>{esc(w)}</li>' for w in rv.get('weak', []))
    facts = [('The turn', esc(f['turn'])),
             ('It works if viewers say', esc(rv.get('pass', '')))]
    if weak:
        facts.append(('Weakest moments now', f'<ul>{weak}</ul>'))
    if rv.get('final'):
        facts.append(('The final version needs', esc(rv['final'])))
    facts_html = ''.join(f'<div><dt class="label">{a}</dt><dd>{b}</dd></div>' for a, b in facts if b)
    stars = ''.join(f'<button type="button" class="star" role="radio" aria-checked="false" data-v="{v}" aria-label="{v} of 5">★</button>' for v in range(1, 6))
    return f'''
<section class="film" id="{k}" data-k="{k}" aria-labelledby="h-{k}">
  <header class="film-head">
    <span class="num">{n}</span>
    <div>
      <h2 id="h-{k}">{esc(f['title'])}</h2>
      <p class="meta"><span>{dur}</span><span>{len(f['shots'])} shots</span><span>9:16</span></p>
    </div>
  </header>
  <p class="logline">{esc(f['logline'])}</p>
  <div class="film-body">
    <div class="player">{player}</div>
    <div class="side">
      <dl class="facts">{facts_html}</dl>
      <div class="call" data-k="{k}">
        <div class="stars" role="radiogroup" aria-label="Rate {esc(f['title'])}">{stars}</div>
        <label class="pick"><input type="checkbox" id="pick-{k}"> <span>Finish this one</span></label>
        <button type="button" class="cmt" hidden>Comment</button>
        <label class="note-l" for="note-{k}">Notes on {esc(f['title'])}</label>
        <textarea id="note-{k}" rows="3" maxlength="4000" placeholder="Timing, a shot to change, what to keep"></textarea>
        <p class="save-state" aria-live="polite"></p>
      </div>
    </div>
  </div>
  <h3 class="label sub">Storyboard <span>select a shot to play from it</span></h3>
  {board_html(f)}
  {shotlist_html(f)}
  <div class="log" data-k="{k}">
    <h3 class="label sub">Screenings <span class="count" data-k="{k}"></span></h3>
    <details class="logd"><summary>Log a screening</summary>
    <form class="log-form" data-k="{k}" autocomplete="off">
      <label>Viewer <input name="viewer" maxlength="80" placeholder="First name or initials, age"></label>
      <label>What was it about? <textarea name="about" rows="2" maxlength="1200" placeholder="Their words, as close as you can"></textarea></label>
      <label>How did it make them feel? <textarea name="felt" rows="2" maxlength="1200"></textarea></label>
      <div class="log-row">
        <fieldset><legend>Would they tap the link?</legend>
          <label><input type="radio" name="click" value="yes"> Yes</label>
          <label><input type="radio" name="click" value="maybe"> Maybe</label>
          <label><input type="radio" name="click" value="no"> No</label>
        </fieldset>
        <label class="chk"><input type="checkbox" name="mute"> Watched with the sound off</label>
      </div>
      <div class="log-actions"><button type="submit">Save screening</button><p class="log-state" aria-live="polite"></p></div>
    </form></details>
    <ol class="entries" data-k="{k}"></ol>
  </div>
</section>'''


def main():
    films = [film(n) for n in ['01', '02', '03', '04']]
    prog = ''.join(
        f'<a class="pg" href="#f{f["n"]}">'
        + (f'<img src="{esc(f["poster"])}" alt="" width="720" height="1280">' if f['poster'] else '<span class="ph" aria-hidden="true"></span>')
        + f'<span class="pg-t"><span class="num">{f["n"]}</span><strong>{esc(f["title"])}</strong><span>{clock(f["dur"]) if f["dur"] else "rendering"}</span></span>'
        + f'<span class="pg-e">&ldquo;{esc(f["end"])}&rdquo;</span></a>'
        for f in films)
    chips = ''.join(f'<a href="#f{f["n"]}" data-k="f{f["n"]}"><span class="cn">{f["n"]}</span><span class="ct"> {esc(f["title"])}</span></a>' for f in films)
    body = ''.join(film_html(f) for f in films)
    keys = json.dumps([f'f{f["n"]}' for f in films])
    tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
    page = (tpl.replace('{{PROGRAMME}}', prog).replace('{{CHIPS}}', chips).replace('{{FILMS}}', body)
               .replace('{{KEYS}}', keys))
    open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(page)
    size = sum(os.path.getsize(p) for p in glob.glob(os.path.join(HERE, 'media', '*')) + glob.glob(os.path.join(HERE, 'img', '*', '*')))
    print(f'built index.html {len(page) / 1e3:.0f} kB, media+img {size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
