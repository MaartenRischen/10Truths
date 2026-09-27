// usage: node export-glb.mjs <poseName|'json:{...}'> <out.glb>
import { chromium } from 'playwright'; import fs from 'fs';
const [,, pose, out] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('pageerror:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
const qp = pose.startsWith('json:') ? 'poseJson=' + encodeURIComponent(pose.slice(5)) : 'pose=' + pose;
await p.goto(`http://127.0.0.1:8765/harness.html?scene=scenes/export-pose.js&${qp}`);
await p.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
const b64 = await p.evaluate(() => window.__glb);
fs.writeFileSync(out, Buffer.from(b64, 'base64')); await b.close(); console.log('wrote', out, fs.statSync(out).size, 'bytes');
