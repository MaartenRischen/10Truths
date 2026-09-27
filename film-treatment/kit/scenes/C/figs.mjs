// usage: node figs.mjs <spec.json (path under kit/, e.g. scenes/C/specs/p01.json)> <out.glb> [<spec2> <out2> ...]
import { chromium } from 'playwright'; import fs from 'fs';
const args = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (let i = 0; i < args.length; i += 2) {
  const [spec, out] = [args[i], args[i + 1]];
  const p = await b.newPage();
  p.on('pageerror', e => console.log('pageerror:', e.message));
  p.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[scene]')) console.log('console:', m.text()); });
  await p.goto(`http://127.0.0.1:8765/harness.html?scene=scenes/C/figs.js&spec=${encodeURIComponent(spec)}`);
  await p.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
  const b64 = await p.evaluate(() => window.__glb);
  if (!b64) { console.log('FAILED', spec); continue; }
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('wrote', out, fs.statSync(out).size);
  await p.close();
}
await b.close();
