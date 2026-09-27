// usage: node scenes/A/extract.mjs <spec.json path relative to kit/> <outPrefix>
// writes <outPrefix>_labels.png, <outPrefix>_depth.png, <outPrefix>_meta.json
import { chromium } from 'playwright';
import fs from 'fs';
const [,, spec, outPrefix] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 64, height: 64 }, deviceScaleFactor: 1 });
p.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[scene]')) console.log('console:', m.text()); });
p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto(`http://127.0.0.1:8765/harness.html?scene=scenes/A/extract.js&spec=${encodeURIComponent(spec)}`);
await p.waitForFunction(() => window.__done === true, null, { timeout: 240000 });
const out = await p.evaluate(() => window.__out);
if (!out) { console.log('no output'); process.exit(1); }
const dec = s => Buffer.from(s.split(',')[1], 'base64');
fs.writeFileSync(outPrefix + '_labels.png', dec(out.labels));
fs.writeFileSync(outPrefix + '_depth.png', dec(out.depth));
fs.writeFileSync(outPrefix + '_meta.json', JSON.stringify(out.meta));
await b.close();
console.log('wrote', outPrefix);
