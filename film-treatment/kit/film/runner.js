// Page-side film runner. Load through the harness:
//   harness.html?scene=film/runner.js&film=films/<name>/film.js&w=720&h=1280[&quality=still]
// Exposes window.__film (metadata) and window.__renderFrame(i) (async; draws frame i into the canvas).
import * as THREE from 'three';
import * as C from '../scenes/E/lib/cine.js';
import { disposeScene, LOOK } from './engine.js';

async function loadFonts() {
  const faces = [
    ['Spectral', 'Spectral-300.woff2', { weight: '300', style: 'normal' }],
    ['Spectral', 'Spectral-400.woff2', { weight: '400', style: 'normal' }],
    ['Spectral', 'Spectral-300i.woff2', { weight: '300', style: 'italic' }],
    ['Spectral', 'Spectral-400i.woff2', { weight: '400', style: 'italic' }],
    ['JetBrains Mono', 'JetBrainsMono-400.woff2', { weight: '400', style: 'normal' }],
    ['JetBrains Mono', 'JetBrainsMono-500.woff2', { weight: '500', style: 'normal' }],
  ];
  for (const [fam, file, desc] of faces) {
    const ff = new FontFace(fam, `url(/film/fonts/${file})`, desc);
    try { await ff.load(); document.fonts.add(ff); } catch (e) { console.error('[scene] font failed ' + file); }
  }
}

export default async function ({ w, h, q }) {
  await loadFonts();
  const mod = await import('/' + q.get('film') + '?v=' + Date.now());
  const film = mod.default;
  const fps = film.fps || 12;
  const quality = LOOK[q.get('quality') || 'animatic'];
  const renderer = C.createRenderer(w, h);
  const starts = []; let acc = 0;
  for (const s of film.shots) { starts.push(acc); acc += s.dur; }
  const total = Math.round(acc * fps);
  window.__film = { fps, frames: total, dur: acc, shots: film.shots.map((s, i) => ({ name: s.name, start: starts[i], dur: s.dur })) };
  let cur = -1, shot = null;
  window.__renderFrame = async (i, opts = {}) => {
    const t = i / fps;
    let k = starts.length - 1;
    for (let j = 0; j < starts.length; j++) { if (t < starts[j] + film.shots[j].dur) { k = j; break; } }
    if (k !== cur) {
      if (shot) { if (shot.dispose) shot.dispose(); if (shot.scene) disposeScene(shot.scene); }
      shot = null; renderer.renderLists.dispose();
      cur = k;
      shot = await film.shots[k].build({ renderer, w, h, fps, THREE, C });
    }
    const local = t - starts[k];
    const info = { frame: i, fps, shotFrame: Math.round(local * fps), shotIndex: k, shotName: film.shots[k].name, dur: film.shots[k].dur };
    if (shot.update) await shot.update(local, info);
    if (shot.draw) { await shot.draw(local, info); return true; } // 2D/custom shots draw themselves into renderer.domElement
    // E's accumulator freezes shadow maps after the first sample (right for stills); re-arm them every frame so moving figures cast moving shadows.
    shot.scene.traverse((o) => { if (o.isLight && o.castShadow && o.shadow) { o.shadow.autoUpdate = true; o.shadow.needsUpdate = true; } });
    const look = { ...quality, ...(shot.look ? shot.look(local, info) : {}) , ...(opts.look || {}) };
    await C.renderShot(renderer, shot.scene, shot.camera, { w, h, seed: 1000 + i, dispose: true, ...look });
    return true;
  };
}
