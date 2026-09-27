// Render an HTML scene page to PNG via headless Chromium (SwiftShader WebGL2).
// usage: node shot.mjs <url-path> <out.png> [w] [h] [timeoutMs]
import { chromium } from '../../node_modules/playwright/index.mjs';
const [,, path, out, w = '1280', h = '720', to = '900000'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[scene]')) console.log('console:', m.text()); });
p.on('pageerror', e => console.log('pageerror:', e.message));
const url = path.startsWith('http') ? path : `http://127.0.0.1:8765/${path}`;
await p.goto(url + (url.includes('?') ? '&' : '?') + `w=${w}&h=${h}`);
await p.waitForFunction(() => window.__done === true, null, { timeout: +to });
const el = await p.$('canvas');
await (el || p).screenshot({ path: out, timeout: 600000 });
await b.close();
console.log('wrote', out);
