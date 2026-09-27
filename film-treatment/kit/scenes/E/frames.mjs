// Render an animated scene frame by frame in ONE browser session.
// The scene module must set window.__renderFrame = async (f) => {...} and then return.
// usage: node frames.mjs "<url-path>" <outDir> W H startFrame endFrame
import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'fs';
const [,, path, outDir, w = '960', h = '402', f0 = '0', f1 = '119'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[scene]')) console.log('console:', m.text()); });
p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto(`http://127.0.0.1:8765/${path}${path.includes('?') ? '&' : '?'}w=${w}&h=${h}`);
await p.waitForFunction(() => window.__done === true, null, { timeout: 900000 });
const el = await p.$('canvas');
for (let f = +f0; f <= +f1; f++) {
  const t0 = Date.now();
  await p.evaluate(async (fr) => { await window.__renderFrame(fr); }, f);
  await el.screenshot({ path: `${outDir}/f${String(f).padStart(4, '0')}.png`, timeout: 600000 });
  console.log('frame', f, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
await b.close();
