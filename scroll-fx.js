/* ════════════════════════════════════════════════════════════════════
   scroll-fx.js  ·  EXPERIMENT  ·  drop-in scroll-reveal engine
   Reads the existing front-door DOM and layers on scroll behaviour.
   Pure enhancement: adds classes / observers only, never rewrites content.
   Namespaced SFX so it can't collide with the page's own scripts.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var docEl = document.documentElement;
  if (reduce) return; // CSS already shows everything; nothing to drive

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ── Word-splitter: wrap words in <span class="sfx-w">, keep element
        wrappers (e.g. the hero's .bd-sub) and their order. Returns the
        flat list of word spans in reading order. ───────────────────── */
  function splitWords(el) {
    var words = [];
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (tok) {
            if (tok === '') return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); }
            else {
              var s = document.createElement('span');
              s.className = 'sfx-w'; s.textContent = tok;
              frag.appendChild(s); words.push(s);
            }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n); // descend into wrappers like .bd-sub
        }
      });
    }
    walk(el);
    return words;
  }

  /* ── 1. Hero thesis: brighten word-by-word on load ─────────────────── */
  var thesis = $('.bd-thesis');
  if (thesis) {
    var hw = splitWords(thesis);
    hw.forEach(function (w, i) { w.style.setProperty('--i', i); });
  }

  /* ── 2. Section titles: brighten on scroll as they rise through view ─ */
  var scrollHeads = [];
  $all('.bd-source-title, .bd-arm-title').forEach(function (el) {
    var ws = splitWords(el);
    if (ws.length) scrollHeads.push({ el: el, words: ws });
  });

  /* ── 3. Reveal-on-scroll. Two modes, both pre-hidden by scroll-fx.css:
        GROUPS - the cluster triggers as a UNIT when it enters, then its
                 members appear in clear SEQUENCE (one-by-one / line-by-line
                 / block-by-block) via a real per-item delay.
        SOLO   - standalone elements + long lists reveal as each scrolls in. */

  function reveal(el, delay) {
    if (delay) el.style.setProperty('--sfx-delay', delay + 's');
    el.classList.add('sfx-in');
  }

  // sequenced clusters. step = gap between members (seconds); base = lead-in.
  var GROUPS = [
    { c: '.bd-herocenter',     i: '.bd-lede, .bd-film, .bd-decode-row, .bd-needs-row', step: 0.12, base: 0.28 },
    { c: '.bd-arm-head',       i: '.bd-arm-kicker, .bd-arm-tag, .bd-arm-paper', step: 0.11 },
    { c: '.bd-arm-list',       i: ':scope > li', step: 0.20 },                 // CARDS - block by block
    { c: '.bd-source',         i: '.bd-source-kicker, .bd-source-mark, .bd-source-spec, .bd-source-cta, .bd-source-vid', step: 0.11 },
    { c: '.bd-source-credit',  i: '.bd-source-credit-label, .cr-pill, .more', step: 0.10 },   // CHIPS - one by one
    { c: '.bd-source-answers', i: '.bd-source-answers-label, li', step: 0.15 },               // LINES - line by line
    { c: '.bd-source-stats',   i: '.stat', step: 0.12 },
    { c: '.dt-exchange',       i: '.dt-label, .dt-q, .dt-a', step: 0.15 },
    { c: '.bd-horizon-body',   i: 'p', step: 0.09, cap: 9 },
    { c: '.vid-grid',          i: ':scope > .vid-card', step: 0.20 }              // VIDEOS - block by block
  ];

  // standalone targets + long lists (reveal as each scrolls into view)
  var soloSel = [
    '.bd-kicker', '.bd-arm-fold > summary', '.bd-source-note',
    '.bd-horizon', '.bd-map-expand', '.panel-demo > div:first-child',
    '.bd-quote', '.bd-read', '.bd-cta', '.cx-head', '.cx-stage',
    '.bd-eyebrow', '.faq-group-label', '.faq-item', '.bd-network',
    '.vid-head', '.vid-channel'
  ].join(',');

  if ('IntersectionObserver' in window) {
    var soloObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); soloObs.unobserve(e.target); } });
    }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
    $all(soloSel).forEach(function (el) { soloObs.observe(el); });

    GROUPS.forEach(function (g) {
      var conts = $all(g.c); if (!conts.length) return;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          obs.unobserve(e.target);
          var base = g.base || 0, cap = g.cap == null ? 999 : g.cap;
          $all(g.i, e.target).forEach(function (el, idx) { reveal(el, base + Math.min(idx, cap) * g.step); });
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
      conts.forEach(function (c) { obs.observe(c); });
    });
  } else {
    $all(soloSel).forEach(function (el) { el.classList.add('sfx-in'); });
    GROUPS.forEach(function (g) { $all(g.c).forEach(function (c) { $all(g.i, c).forEach(function (el) { el.classList.add('sfx-in'); }); }); });
  }

  /* ── 4. Count-up on the Cor stat figures ───────────────────────────── */
  var statsWrap = $('.bd-source-stats');
  if (statsWrap && 'IntersectionObserver' in window) {
    var counted = false;
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || counted) return;
        counted = true; cio.disconnect();
        $all('.stat .n', statsWrap).forEach(function (n) {
          var target = parseInt((n.textContent || '').replace(/[^\d]/g, ''), 10);
          if (isNaN(target)) return;
          var dur = 1100, t0 = null;
          // NB: don't zero synchronously - if rAF never runs (e.g. tab
          // backgrounded), the real figure must stay put, not stick at 0.
          function step(ts) {
            if (t0 === null) t0 = ts;
            var p = clamp01((ts - t0) / dur);
            var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
            n.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.4 });
    cio.observe(statsWrap);
  }

  /* ── 5. Scroll-progress spine — a mini contents map built from the real,
        current sections. Each node sits at its section's true place in the
        scroll with an always-legible label; the active section is emphasised
        and the fill tracks progress. (Decorative indicator, not a link set —
        the page's scroll-reveal would land a jump on hidden content.) ──────── */
  var spineSpec = [
    { sel: '.bd-herocenter', label: 'Thesis' },
    { sel: '#vision',        label: 'The map' },
    { sel: '.dt-grid',       label: 'Decode Talk' },
    { sel: '.vids',          label: 'Videos' },
    { sel: '.faq-cols',      label: 'Questions' }
  ].map(function (s) { return { el: $(s.sel), label: s.label, frac: 0 }; })
   .filter(function (s) { return s.el; });

  var nodes = [], fill = null;
  if (spineSpec.length > 1) {
    var spine = document.createElement('div');
    spine.className = 'sfx-spine'; spine.setAttribute('aria-hidden', 'true');
    fill = document.createElement('div'); fill.className = 'sfx-spine__fill';
    spine.appendChild(fill);
    spineSpec.forEach(function (s) {
      var d = document.createElement('div'); d.className = 'sfx-node';
      var lab = document.createElement('span'); lab.className = 'sfx-nodelabel'; lab.textContent = s.label;
      d.appendChild(lab);
      spine.appendChild(d); nodes.push(d);
    });
    document.body.appendChild(spine);
    requestAnimationFrame(function () { docEl.classList.add('sfx-ready'); });
  }

  /* ── 6. Parallax backdrops (transform only) ────────────────────────── */
  var bgL = $('.bd-backdrop-l'), bgR = $('.bd-backdrop-r');

  /* ── 7. The map — 3D triptych parallax + live hub→arm connectors ─────
        The map card row (arms flanking the Cor hub) folds in perspective as
        it scrolls through: the hub floats forward on a near plane while the
        two arms recede in Z, part sideways and tilt — tightest when centred.
        Teal connectors are drawn to the LIVE (transformed) card positions, so
        they always meet the cards and flex with the fold. Measuring real rects
        sidesteps all 3D math: getBoundingClientRect already returns the
        projected screen box. ─────────────────────────────────────────────── */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var mapGrid = $('.bd-map-grid');
  var hub = $('.bd-source'), mark = $('.bd-source-mark');
  var armL = $('.bd-arm-left'), armR = $('.bd-arm-right');
  var mapReady = false, mapMobile = null;
  var links = null, lineL, lineR, nodeL, nodeR, headL, headR;

  function mkConn() {
    var line = document.createElementNS(SVGNS, 'path'); line.setAttribute('class', 'line');
    var node = document.createElementNS(SVGNS, 'circle'); node.setAttribute('class', 'node'); node.setAttribute('r', '4.5');
    var head = document.createElementNS(SVGNS, 'path'); head.setAttribute('class', 'head');
    links.appendChild(line); links.appendChild(head); links.appendChild(node);
    return { line: line, node: node, head: head };
  }

  if (mapGrid && hub && mark && armL && armR) {
    links = document.createElementNS(SVGNS, 'svg');
    links.setAttribute('class', 'bd-links');
    links.setAttribute('aria-hidden', 'true');
    var cL = mkConn(), cR = mkConn();
    lineL = cL.line; nodeL = cL.node; headL = cL.head;
    lineR = cR.line; nodeR = cR.node; headR = cR.head;
    mapGrid.appendChild(links);
    docEl.classList.add('sfx-links');
    mapReady = true;
    if ('IntersectionObserver' in window) {
      var lio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { links.classList.add('is-in'); lio.disconnect(); } });
      }, { threshold: 0.18 });
      lio.observe(mapGrid);
    } else { links.classList.add('is-in'); }
  }

  // one connector: node at the hub end, arrowhead driven into the arm.
  // dir = -1 points left (left arm), +1 points right (right arm).
  function drawConn(line, node, head, hx, hy, ax, ay, dir) {
    line.setAttribute('d', 'M ' + hx + ' ' + hy + ' L ' + ax + ' ' + ay);
    node.setAttribute('cx', hx); node.setAttribute('cy', hy);
    var back = ax - dir * 9;
    head.setAttribute('d', 'M ' + ax + ' ' + ay + ' L ' + back + ' ' + (ay - 6) + ' L ' + back + ' ' + (ay + 6) + ' Z');
  }

  function drawLinks(gr) {
    var h = hub.getBoundingClientRect();
    var lr = armL.getBoundingClientRect(), rr = armR.getBoundingClientRect();
    // emit from the hub's vertical centre — the one height where the (tallest)
    // hub and the centre-aligned arms all line up, so the lines cross the gap
    // level and land on the card bodies, not the whitespace above them.
    var y = (h.top + h.height / 2) - gr.top;
    var hxL = h.left - gr.left, hxR = h.right - gr.left;
    var axL = lr.right - gr.left - 2;               // left arm inner edge
    var axR = rr.left - gr.left + 2;                // right arm inner edge
    drawConn(lineL, nodeL, headL, hxL, y, axL, y, -1);
    drawConn(lineR, nodeR, headR, hxR, y, axR, y, 1);
  }

  function mapReset() {
    hub.style.translate = '';
    armL.style.transform = ''; armR.style.transform = '';
    if (links) links.style.display = 'none';
  }

  /* ── Scroll driver (rAF-throttled) ─────────────────────────────────── */
  function update() {
    var vh = window.innerHeight;
    var sy = window.pageYOffset || docEl.scrollTop;

    // section-title word brightening
    for (var h = 0; h < scrollHeads.length; h++) {
      var head = scrollHeads[h], r = head.el.getBoundingClientRect();
      var p = clamp01((vh * 0.9 - r.top) / (vh * 0.9 - vh * 0.32));
      var N = head.words.length, lead = N + 3;
      for (var i = 0; i < N; i++) {
        var wp = clamp01(p * lead - i);
        var w = head.words[i];
        w.style.opacity = (0.12 + 0.88 * wp).toFixed(3);
        w.style.filter = wp > 0.985 ? 'none' : 'blur(' + ((1 - wp) * 6).toFixed(2) + 'px)';
      }
    }

    // parallax - gentle, capped, opposed drift on the two worlds
    if (bgL) bgL.style.transform = 'translate3d(0,' + Math.max(-60, Math.min(60, sy * 0.06)).toFixed(1) + 'px,0)';
    if (bgR) bgR.style.transform = 'translate3d(0,' + Math.max(-60, Math.min(60, sy * 0.10)).toFixed(1) + 'px,0)';

    // the map — 3D triptych parallax + live connectors
    if (mapReady) {
      var mob = window.innerWidth < 901;
      if (mob) {
        if (mapMobile !== true) { mapReset(); mapMobile = true; }
      } else {
        if (mapMobile !== false) { if (links) links.style.display = ''; mapMobile = false; }
        var gr = mapGrid.getBoundingClientRect();
        var center = gr.top + gr.height / 2;
        var d = Math.max(-1, Math.min(1, (center - vh / 2) / (vh * 0.9)));  // signed distance from viewport centre
        var ad = Math.abs(d);
        // hub: gentle vertical float + push toward the viewer (individual
        // `translate` prop so it composes with the CSS hover `transform`).
        hub.style.translate = '0px ' + (d * 14).toFixed(1) + 'px ' + (ad * 26).toFixed(1) + 'px';
        // arms: part sideways + recede in Z + tilt toward the hub as the section
        // leaves centre. ad*ad keeps the centre tight, then opens out at the edges.
        var partX = (ad * ad * 26).toFixed(1);
        var backZ = (-ad * 72).toFixed(1);
        var tilt = (ad * 6).toFixed(2);
        armL.style.transform = 'translate3d(-' + partX + 'px,0,' + backZ + 'px) rotateY(' + tilt + 'deg)';
        armR.style.transform = 'translate3d(' + partX + 'px,0,' + backZ + 'px) rotateY(-' + tilt + 'deg)';
        drawLinks(gr);
      }
    }

    // spine — fill = scroll progress; each node sits at its section's true
    // position (recomputed each frame, so it self-heals as folds/accordions
    // reflow the page); active = the section nearest the viewport centre.
    if (nodes.length) {
      var max = docEl.scrollHeight - vh;
      var prog = max > 0 ? clamp01(sy / max) : 0;
      fill.style.height = (prog * 100) + '%';
      var mid = vh / 2, best = 0, bestDist = Infinity;
      for (var s = 0; s < spineSpec.length; s++) {
        var br = spineSpec[s].el.getBoundingClientRect();
        var dist = Math.abs(br.top + br.height / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = s; }
        var frac = max > 0 ? clamp01((br.top + sy + br.height / 2 - vh / 2) / max) : (s / (spineSpec.length - 1));
        spineSpec[s].frac = frac;
        nodes[s].style.top = (frac * 100) + '%';
        nodes[s].classList.toggle('reached', prog >= frac - 0.004);
      }
      for (var n = 0; n < nodes.length; n++) nodes[n].classList.toggle('active', n === best);
    }
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { update(); ticking = false; }); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
