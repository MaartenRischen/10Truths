// Render a film's frames to PNGs (resumable). One Chromium page renders frames sequentially.
// usage: node film/render-film.mjs <films/name/film.js> <outDir> [start|list] [end] [w] [h] [quality] [step]
//   start may be a comma list of frames (e.g. "30,95,160") to render just those (end is then ignored).
//   end is exclusive; defaults to all frames. step>1 renders every Nth frame (for quick previews).
// Run several processes with disjoint ranges to parallelise.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const [,, film, outDir, s0 = '0', s1 = '-1', w = '720', h = '1280', quality = 'animatic', step = '1'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[scene]') && !m.text().includes('samples=')) console.log('console:', m.text()); });
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(`http://127.0.0.1:8765/harness.html?scene=film/runner.js&film=${film}&w=${w}&h=${h}&quality=${quality}`);
await p.waitForFunction(() => window.__done === true && !!window.__film, null, { timeout: 300000 });
const meta = await p.evaluate(() => window.__film);
fs.writeFileSync(path.join(outDir, 'film.json'), JSON.stringify(meta, null, 1));
// s0 may be a comma list of frame numbers (e.g. storyboard stills): "12,60,133"
const list = s0.includes(',') ? s0.split(',').map(Number) : null;
const start = list ? 0 : +s0, end = list ? 0 : (+s1 < 0 ? meta.frames : Math.min(+s1, meta.frames));
const frames = list || Array.from({ length: Math.max(0, Math.ceil((end - start) / +step)) }, (_, k) => start + k * +step);
const canvas = await p.$('canvas');
const t0 = Date.now(); let n = 0;
for (const i of frames) {
  const f = path.join(outDir, `f_${String(i).padStart(5, '0')}.png`);
  if (fs.existsSync(f)) continue;
  await p.evaluate((i) => window.__renderFrame(i), i);
  await canvas.screenshot({ path: f + '.tmp.png', timeout: 600000 });
  fs.renameSync(f + '.tmp.png', f);
  n++;
  if (n % 12 === 0) console.log(`frame ${i}/${meta.frames} (${((Date.now() - t0) / 1000 / n).toFixed(1)} s/frame)`);
}
console.log(`done ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${outDir}`);
await b.close();
