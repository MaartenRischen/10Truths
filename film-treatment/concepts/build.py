#!/usr/bin/env python3
"""Build the concept-round page from concepts.json -> concepts/index.html"""
import json, os, html

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'concepts.json'), encoding='utf-8'))
esc = lambda s: html.escape(s, quote=True)

BRIEF = [
    ('Job', 'The long film explains the idea. This one makes someone feel it in about a minute: they recognise themselves, feel relief that it isn\'t their fault, and click through to the long film or the site.'),
    ('Audience', 'Someone scrolling on a phone who has never heard the word "mismatch".'),
    ('Format', '60 to 90 seconds, vertical first, with a horizontal cut. Works with the sound off.'),
    ('Words', 'Close to none. The story is told in pictures and music and ends on one line plus the URL.'),
    ('Shape', 'One character and one turn.'),
]

SHORT = {
    '01': 'The most heartfelt and the funniest, and pro-technology by construction: he loves the flat, he just can\'t find the people.',
    '02': 'The whole thesis as one object story, the care card is Cor, and it could even be shot for real on a desk.',
    '03': 'The deepest emotional hit. The viewer judges, then has to take it back, and the fix is one neighbour.',
}

def concept(c):
    n = c['n']
    return f'''
<section class="con" id="c{n}" data-k="c{n}">
  <header class="con-head">
    <span class="num">{n}</span>
    <div>
      <h2>{esc(c['title'])}</h2>
      <p class="meta"><span>{esc(c['len'])}</span><span>vertical first</span>{'<span class="mine">on my shortlist</span>' if c['pick'] else ''}</p>
    </div>
  </header>
  <p class="logline">{esc(c['logline'])}</p>
  <div class="con-body">
    <div class="film"><h3 class="label">The film</h3><p>{esc(c['film'])}</p></div>
    <figure class="endcard" aria-label="End card for {esc(c['title'])}">
      <p class="ec-line">{esc(c['end'])}</p>
      <p class="ec-url">demismatch.com</p>
      <figcaption class="label">End card</figcaption>
    </figure>
  </div>
  <dl class="facts">
    <div><dt class="label">Why it works</dt><dd>{esc(c['why'])}</dd></div>
    <div><dt class="label">Risk</dt><dd>{esc(c['risk'])}</dd></div>
    <div><dt class="label">Made with</dt><dd>{esc(c['made'])}</dd></div>
  </dl>
  <div class="call" data-k="c{n}">
    <div class="stars" role="radiogroup" aria-label="Rate concept {n}">{''.join(f'<button type="button" class="star" role="radio" aria-checked="false" data-v="{v}" aria-label="{v} of 5">★</button>' for v in range(1, 6))}</div>
    <label class="pick"><input type="checkbox" id="pick-c{n}"> <span>Make this one</span></label>
    <button type="button" class="cmt" hidden>Comment</button>
    <label class="note-l" for="note-c{n}">Notes on {esc(c['title'])}</label>
    <textarea id="note-c{n}" rows="2" maxlength="4000" placeholder="What to keep, what to change"></textarea>
    <p class="save-state" aria-live="polite"></p>
  </div>
</section>'''

brief = ''.join(f'<div><dt class="label">{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in BRIEF)
shortlist = ''.join(
    f'<a class="sl" href="#c{c["n"]}"><span class="num">{c["n"]}</span><strong>{esc(c["title"])}</strong><span>{esc(SHORT[c["n"]])}</span></a>'
    for c in C if c['n'] in SHORT)
chips = ''.join(f'<a href="#c{c["n"]}" data-k="c{c["n"]}">{c["n"]}</a>' for c in C)
body = ''.join(concept(c) for c in C)
keys = json.dumps([f'c{c["n"]}' for c in C])

page = f'''<title>Ten Demismatch Films</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
  /* Demismatch broadside: the brand's own parchment system (cor.css tokens). One deliberate light look. */
  :root {{
    color-scheme: light;
    --parchment: #ece0c4; --parchment-soft: #f2e8cf; --parchment-dark: #ddd0b0;
    --ink: #1a0608; --oxblood: #3a1218; --oxblood-deep: #2a0c11; --oxblood-ink: #4a1e26;
    --teal: #2d6b6b; --gold: #c4962c; --gold-dim: #a5801f; --muted: #6f6247;
    --rule: rgba(58, 18, 24, 0.22); --rule-soft: rgba(58, 18, 24, 0.12);
    --serif: 'Spectral', Georgia, 'Times New Roman', serif;
    --mono: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
    --col: 780px;
  }}
  * {{ box-sizing: border-box; }}
  html {{ scroll-padding-top: 64px; }}
  @media (prefers-reduced-motion: no-preference) {{ html {{ scroll-behavior: smooth; }} }}
  body {{ background: var(--parchment); color: var(--ink); font: 400 17.5px/1.65 var(--serif);
    padding-inline: clamp(16px, 4vw, 48px); padding-block: 0 110px; }}
  a {{ color: var(--oxblood); }}
  :focus-visible {{ outline: 2px solid var(--teal); outline-offset: 3px; }}
  h1, h2, h3 {{ margin: 0; text-wrap: balance; }}
  p, dl, dd {{ margin: 0; }}
  .wrap {{ max-width: var(--col); margin-inline: auto; }}
  .label {{ font: 500 11px/1.3 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--oxblood-ink); }}

  .bar {{ position: sticky; top: env(safe-area-inset-top, 0px); z-index: 10; margin-inline: calc(-1 * clamp(16px, 4vw, 48px));
    padding: 10px clamp(16px, 4vw, 48px); background: color-mix(in srgb, var(--parchment) 92%, transparent);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border-bottom: 1px solid var(--rule); }}
  .bar-in {{ max-width: var(--col); margin-inline: auto; display: flex; align-items: center; gap: 14px; }}
  .mark {{ font: italic 400 18px/1 var(--serif); color: var(--oxblood); text-decoration: none; white-space: nowrap; }}
  .chips {{ display: flex; gap: 4px; margin-left: auto; overflow-x: auto; scrollbar-width: none; }}
  .chips::-webkit-scrollbar {{ display: none; }}
  .chips a {{ font: 500 11.5px/1 var(--mono); color: var(--oxblood-ink); text-decoration: none; padding: 7px 7px; border: 1px solid var(--rule); white-space: nowrap; }}
  .chips a:hover {{ border-color: var(--oxblood); }}
  .chips a.on {{ background: var(--oxblood); color: var(--parchment); border-color: var(--oxblood); }}
  .chips a[data-stars]:not([data-stars=""])::after {{ content: " " attr(data-stars) "★"; color: var(--gold-dim); }}
  .chips a.on[data-stars]:not([data-stars=""])::after {{ color: var(--gold); }}

  .open {{ padding-block: clamp(48px, 8vw, 96px) 8px; display: grid; gap: 22px; }}
  .eyebrow {{ font: 500 11px/1.5 var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }}
  h1 {{ font: 300 clamp(40px, 6.6vw, 72px)/1.02 var(--serif); letter-spacing: -.015em; color: var(--oxblood); }}
  h1 em {{ font-style: italic; }}
  .lede {{ font-size: 19.5px; line-height: 1.55; max-width: 62ch; }}

  .brief {{ border-top: 2px solid var(--oxblood); border-bottom: 1px solid var(--rule); padding-block: 6px; display: grid; }}
  .brief > div {{ display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 16px; padding-block: 10px; border-top: 1px solid var(--rule-soft); }}
  .brief > div:first-child {{ border-top: 0; }}
  .brief dd {{ font-size: 16.5px; line-height: 1.5; }}
  @media (max-width: 520px) {{ .brief > div {{ grid-template-columns: 1fr; gap: 2px; }} }}

  .block-h {{ margin-top: 54px; display: grid; gap: 6px; }}
  .block-h h2 {{ font: 400 30px/1.15 var(--serif); color: var(--oxblood); }}
  .block-h p {{ color: var(--oxblood-ink); font-size: 16.5px; max-width: 62ch; }}
  .shortlist {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; margin-top: 22px; margin-right: 12px; }}
  .sl {{ display: grid; gap: 8px; align-content: start; padding: 16px 16px 18px; background: var(--parchment-soft); border: 1.5px solid var(--oxblood);
    box-shadow: 4px 4px 0 var(--teal), 8px 8px 0 var(--gold); text-decoration: none; color: var(--ink); transition: transform .15s, box-shadow .15s; }}
  .sl:hover {{ transform: translate(-1px, -1px); box-shadow: 6px 6px 0 var(--teal), 12px 12px 0 var(--gold); }}
  .sl .num {{ font: 500 12px/1 var(--mono); color: var(--teal); }}
  .sl strong {{ font: italic 400 22px/1.15 var(--serif); color: var(--oxblood); }}
  .sl span:last-child {{ font-size: 15px; line-height: 1.45; color: var(--oxblood-ink); }}
  @media (max-width: 760px) {{ .shortlist {{ grid-template-columns: 1fr; }} }}

  .con {{ margin-top: 64px; padding-top: 34px; border-top: 2px solid var(--oxblood); display: grid; gap: 20px; }}
  .con-head {{ display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 18px; align-items: start; }}
  .con-head .num {{ font: 300 56px/0.9 var(--serif); color: var(--gold-dim); font-variant-numeric: lining-nums tabular-nums; }}
  .con h2 {{ font: italic 400 clamp(32px, 4.6vw, 44px)/1.05 var(--serif); color: var(--oxblood); }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }}
  .meta span {{ font: 500 10.5px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--oxblood-ink); border: 1px solid var(--rule); padding: 5px 7px; }}
  .meta .mine {{ background: var(--teal); color: var(--parchment); border-color: var(--teal); }}
  .logline {{ font: 400 21px/1.45 var(--serif); color: var(--ink); max-width: 60ch; }}
  .con-body {{ display: grid; grid-template-columns: minmax(0, 1fr) 190px; gap: 28px; align-items: start; }}
  .film {{ display: grid; gap: 8px; }}
  .film p {{ font-size: 17.5px; line-height: 1.7; }}
  .endcard {{ margin: 0; aspect-ratio: 9 / 16; background: var(--oxblood-deep); color: var(--parchment); padding: 22px 16px 14px;
    display: grid; grid-template-rows: 1fr auto auto; gap: 10px; border: 1px solid var(--oxblood); position: relative; }}
  .ec-line {{ align-self: center; font: italic 400 17px/1.35 var(--serif); text-align: center; text-wrap: balance; }}
  .ec-url {{ font: 500 10.5px/1 var(--mono); letter-spacing: .08em; text-align: center; color: var(--gold); padding-top: 10px; border-top: 1px solid rgba(196,150,44,.4); }}
  .endcard figcaption {{ position: absolute; top: calc(100% + 8px); left: 0; right: 0; text-align: center; color: var(--muted); }}
  @media (max-width: 640px) {{ .con-body {{ grid-template-columns: 1fr; }} .endcard {{ width: min(220px, 62vw); justify-self: center; margin-bottom: 26px; }} }}
  .facts {{ display: grid; gap: 12px; margin-top: 18px; }}
  .facts > div {{ display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 16px; }}
  .facts dd {{ font-size: 16px; line-height: 1.55; color: var(--oxblood-ink); }}
  @media (max-width: 520px) {{ .facts > div {{ grid-template-columns: 1fr; gap: 2px; }} }}

  .call {{ display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 10px 18px; padding: 14px 16px; background: var(--parchment-soft); border: 1px solid var(--rule); }}
  .stars {{ display: flex; gap: 2px; }}
  .star {{ font-size: 26px; line-height: 1; background: none; border: 0; padding: 2px; color: var(--parchment-dark); cursor: pointer; -webkit-text-stroke: 1px rgba(58,18,24,.35); }}
  .star.on {{ color: var(--gold); -webkit-text-stroke: 0; }}
  .pick {{ display: flex; align-items: center; gap: 8px; font-size: 16px; cursor: pointer; }}
  .pick input {{ appearance: none; width: 19px; height: 19px; margin: 0; border: 1.5px solid var(--oxblood); background: var(--parchment); display: grid; place-items: center; cursor: pointer; }}
  .pick input:checked {{ background: var(--oxblood); }}
  .pick input:checked::after {{ content: "✓"; color: var(--parchment); font: 700 12px/1 var(--mono); }}
  .cmt {{ justify-self: end; font: 500 11px/1 var(--mono); letter-spacing: .06em; color: var(--oxblood); background: none; border: 1px solid var(--oxblood); padding: 7px 9px; cursor: pointer; }}
  .cmt:hover {{ background: var(--oxblood); color: var(--parchment); }}
  .note-l {{ grid-column: 1 / -1; font: 500 10.5px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }}
  .call textarea {{ grid-column: 1 / -1; width: 100%; resize: vertical; background: var(--parchment); color: var(--ink); border: 1px solid var(--rule); padding: 10px 12px; font: 400 16px/1.5 var(--serif); }}
  .call textarea:focus {{ border-color: var(--teal); outline: none; }}
  .save-state {{ grid-column: 1 / -1; font: 400 11.5px/1.3 var(--mono); color: var(--muted); min-height: 1.3em; }}
  @media (max-width: 520px) {{ .call {{ grid-template-columns: 1fr auto; }} .stars {{ grid-column: 1 / -1; }} }}

  .notes {{ margin-top: 72px; padding-top: 30px; border-top: 2px solid var(--oxblood); display: grid; gap: 22px; }}
  .notes h2 {{ font: 400 26px/1.2 var(--serif); color: var(--oxblood); }}
  .notes p {{ max-width: 64ch; }}
  footer {{ margin-top: 80px; font: 400 11.5px/1.7 var(--mono); color: var(--muted); border-top: 1px solid var(--rule); padding-top: 16px; }}
  @media (prefers-reduced-motion: reduce) {{ *, *::before, *::after {{ transition: none !important; }} }}
</style>

<div class="bar"><div class="bar-in">
  <a class="mark" href="#top">Ten films</a>
  <nav class="chips" aria-label="Concepts">{chips}</nav>
</div></div>

<main class="wrap" id="top">
  <header class="open">
    <p class="eyebrow">Demismatch · a new short film · concept round · 27 September 2026</p>
    <h1>Ten ways to make someone <em>feel it</em> in a minute</h1>
    <p class="lede">The brief we agreed, then ten one-paragraph films written against it. Rate them, tick the one or two you want, and leave notes; I read it all back. Nothing gets drawn or rendered until you've picked.</p>
    <dl class="brief" aria-label="The brief">{brief}</dl>
  </header>

  <section class="block-h" aria-labelledby="sl-h">
    <h2 id="sl-h">My shortlist</h2>
    <p>If I had to choose today. The other seven are real contenders, each for a different reason, and your pick beats mine.</p>
  </section>
  <div class="shortlist">{shortlist}</div>

  {body}

  <section class="notes" aria-labelledby="notes-h">
    <h2 id="notes-h">The Enclosure, and what happens after you pick</h2>
    <p><strong>The Enclosure</strong> stays the animal film. Good Dog and The Human Zoo are its closest relatives, so if you pick either, the two can run as a pair. The Visitor, Care Instructions and The Night Watch are the human stories it leaves out.</p>
    <p><strong>After you pick,</strong> I write the script and a board for your one or two, cut a rough animatic with temporary music, and we show it to a few people who have never heard of Demismatch before anything expensive gets rendered. Then we choose the look to fit the story: the miniature world, the threads of light, the ink line, a real stop-motion shoot on a desk, or something new.</p>
  </section>

  <footer>Concept round by Claude in Claude Code for Demismatch · 27 September 2026</footer>
</main>

<script>
(() => {{
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const KEYS = {keys};
  const state = {{}}, saving = {{}}, pending = {{}}, dirty = {{}};
  KEYS.forEach(k => {{ state[k] = {{ stars: 0, pick: false, note: '' }}; }});
  let db = null, known = false;
  const status = (k, m) => {{ const el = $('.call[data-k="' + k + '"] .save-state'); if (el) el.textContent = m; }};
  function paint(k) {{
    const s = state[k];
    $$('.call[data-k="' + k + '"] .star').forEach(b => {{ const v = +b.dataset.v; b.classList.toggle('on', v <= s.stars); b.setAttribute('aria-checked', v === s.stars ? 'true' : 'false'); }});
    const cb = $('#pick-' + k); if (cb) cb.checked = !!s.pick;
    const ta = $('#note-' + k); if (ta && document.activeElement !== ta && !dirty[k]) ta.value = s.note || '';
    const chip = $('.chips a[data-k="' + k + '"]'); if (chip) {{ chip.dataset.stars = s.stars ? String(s.stars) : ''; chip.classList.toggle('on', !!s.pick); }}
  }}
  async function save(k) {{
    if (!db) {{ status(k, known ? 'Not saved: saving is off in this view. Tell Claude in chat instead.' : 'Connecting…'); return; }}
    if (saving[k]) {{ pending[k] = true; return; }}
    saving[k] = true; status(k, 'Saving…');
    try {{
      const s = state[k];
      await db.doc('concepts/' + k).set({{ stars: s.stars, pick: !!s.pick, note: s.note || '', updatedAt: new Date().toISOString() }});
      dirty[k] = false; status(k, 'Saved');
    }} catch (e) {{
      status(k, e && e.code === 'invalid_argument' ? 'You can view this page but not save to it.' : 'Could not save. Try again in a moment.');
    }} finally {{ saving[k] = false; if (pending[k]) {{ pending[k] = false; save(k); }} }}
  }}
  KEYS.forEach(k => {{
    $$('.call[data-k="' + k + '"] .star').forEach(b => b.addEventListener('click', () => {{ const v = +b.dataset.v; state[k].stars = state[k].stars === v ? 0 : v; paint(k); save(k); }}));
    const cb = $('#pick-' + k); if (cb) cb.addEventListener('change', () => {{ state[k].pick = cb.checked; paint(k); save(k); }});
    const ta = $('#note-' + k); let t = 0;
    if (ta) {{
      ta.addEventListener('input', () => {{ dirty[k] = true; state[k].note = ta.value; status(k, 'Editing…'); clearTimeout(t); t = setTimeout(() => save(k), 900); }});
      ta.addEventListener('blur', () => {{ if (dirty[k]) {{ clearTimeout(t); save(k); }} }});
    }}
  }});
  const cl = window.claude;
  if (cl && typeof cl.use === 'function') {{
    cl.use('db').then(d => {{
      db = d; known = true;
      if (!db) {{ KEYS.forEach(k => status(k, 'Saving is off in this view. Tell Claude in chat instead.')); return; }}
      db.collection('concepts').onSnapshot(snap => {{
        snap.docs.forEach(doc => {{
          if (!KEYS.includes(doc.id)) return;
          const x = doc.data() || {{}};
          state[doc.id] = {{ stars: +x.stars || 0, pick: !!x.pick, note: dirty[doc.id] ? state[doc.id].note : (x.note || '') }};
          paint(doc.id);
        }});
      }}, () => {{ KEYS.forEach(k => status(k, 'Live updates stopped. Reload to keep saving.')); }});
    }}).catch(() => {{ known = true; }});
    cl.use('comments').then(c => {{
      if (!c) return;
      $$('.cmt').forEach(b => {{
        b.hidden = false;
        b.addEventListener('click', async () => {{
          try {{ await c.openComposer({{ element: b.closest('.con') }}); }}
          catch (e) {{ if (e && ['unavailable', 'not_granted', 'forbidden', 'capability_disabled', 'capability_removed'].includes(e.code)) $$('.cmt').forEach(x => {{ x.hidden = true; }}); }}
        }});
      }});
    }}).catch(() => {{}});
  }} else {{
    KEYS.forEach(k => status(k, 'Ratings save when this page is opened in Claude.'));
  }}
}})();
</script>
'''
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(page)
print('built', len(page), 'bytes')
