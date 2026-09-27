// Direction D capture: waits for the scene, reads the canvas back via toDataURL (forces GPU sync), long timeouts.
// usage: node scenes/D/shotd.mjs <url-path> <out.png> [w] [h]
//        node scenes/D/shotd.mjs <url-path> <outPattern%04d.png> w h --frames N [--start k]   (calls window.__frame(i/N) per frame)
import { chromium } from 'playwright';
import fs from 'fs';
const args = process.argv.slice(2);
const [path, out, w = '1280', h = '720'] = args;
const fi = args.indexOf('--frames'); const frames = fi >= 0 ? +args[fi + 1] : 0;
const si = args.indexOf('--start'); const start = si >= 0 ? +args[si + 1] : 0;
const ei = args.indexOf('--end'); const end = ei >= 0 ? +args[ei + 1] : frames;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.setDefaultTimeout(1200000);
p.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[scene]')) console.log('console:', m.text()); });
p.on('pageerror', e => console.log('pageerror:', e.message));
const url = path.startsWith('http') ? path : `http://127.0.0.1:8765/${path}`;
const t0 = Date.now();
await p.goto(url + (url.includes('?') ? '&' : '?') + `w=${w}&h=${h}` + (frames ? '&anim=1' : ''));
await p.waitForFunction(() => window.__done === true, null, { timeout: 1200000, polling: 250 });
const grab = async (file) => {
  const b64 = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png').split(',')[1]);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
};
if (!frames) {
  await grab(out); console.log('wrote', out, ((Date.now() - t0) / 1000).toFixed(1) + 's');
} else {
  for (let i = start; i < end; i++) {
    await p.evaluate(async (t) => { await window.__frame(t); }, i / frames);
    const f = out.replace('%04d', String(i).padStart(4, '0'));
    await grab(f);
    if (i % 12 === 0) console.log('frame', i, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  console.log('frames done', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
await b.close();
