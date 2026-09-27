// Generic, wordless dashboard UI (numbers, charts, hearts) drawn on canvas.
import * as THREE from 'three';
import { mulberry32 } from './cine.js';
import * as MT from './mat.js';
import * as PR from './props.js';

const PAL = { bg: '#0a1016', panel: '#0f1821', grid: '#1b2a36', teal: '#34e0c8', cyan: '#4fb8ff', amber: '#ffb13d', red: '#ff5a5a', white: '#e8f0f4', dim: '#5d7282' };

function lineChart(g, x, y, w, h, rng, { col = PAL.teal, up = true, fill = true, n = 60 } = {}) {
  g.strokeStyle = PAL.grid; g.lineWidth = 1; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(x, y + h * i / 4); g.lineTo(x + w, y + h * i / 4); g.stroke(); }
  const pts = []; let v = 0.2 + rng() * 0.2; for (let i = 0; i < n; i++) { v += (rng() - (up ? 0.38 : 0.5)) * 0.06; v = Math.max(0.05, Math.min(0.95, v)); pts.push([x + w * i / (n - 1), y + h * (1 - v)]); }
  if (fill) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, col + '66'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, y + h); pts.forEach(p => g.lineTo(...p)); g.lineTo(x + w, y + h); g.fill(); }
  g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.stroke();
  const last = pts[pts.length - 1]; g.fillStyle = col; g.beginPath(); g.arc(last[0], last[1], 5, 0, Math.PI * 2); g.fill();
}
function bars(g, x, y, w, h, rng, col = PAL.cyan, n = 16) { for (let i = 0; i < n; i++) { const v = 0.2 + rng() * 0.8 * (0.4 + i / n * 0.6); g.fillStyle = i === n - 1 ? PAL.amber : col; g.fillRect(x + i * w / n + 2, y + h * (1 - v), w / n - 4, h * v); } }
function bigNumber(g, x, y, size, rng, col = PAL.white) {
  const n = Math.floor(1e6 + rng() * 9e6).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  g.fillStyle = col; g.font = `300 ${size}px "DejaVu Sans", sans-serif`; g.fillText(n, x, y);
  g.fillStyle = PAL.teal; g.font = `400 ${size * 0.38}px "DejaVu Sans", sans-serif`; g.fillText('▲ ' + (rng() * 20 + 2).toFixed(1) + '%', x, y + size * 0.55);
}
function heatmap(g, x, y, w, h, rng, cols = 24, rows = 7) { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const v = Math.pow(rng(), 1.5) * (0.4 + 0.6 * Math.sin((c / cols) * Math.PI)); g.fillStyle = `rgba(${Math.round(52 + 203 * v)},${Math.round(224 - 80 * v)},${Math.round(200 - 150 * v)},${0.25 + 0.75 * v})`; g.fillRect(x + c * w / cols + 1, y + r * h / rows + 1, w / cols - 2, h / rows - 2); } }
function donut(g, cx, cy, r, rng) { let a = -Math.PI / 2; for (const col of [PAL.teal, PAL.cyan, PAL.amber, PAL.red]) { const d = (0.15 + rng() * 0.35) * Math.PI * 2; g.strokeStyle = col; g.lineWidth = r * 0.28; g.beginPath(); g.arc(cx, cy, r, a, Math.min(a + d, Math.PI * 1.5)); g.stroke(); a += d; if (a > Math.PI * 1.5) break; } }
function feedStrip(g, x, y, w, h, rng) { for (let i = 0; i < 5; i++) { const yy = y + i * h / 5; g.fillStyle = PAL.panel; g.fillRect(x, yy + 3, w, h / 5 - 6); g.fillStyle = `hsl(${Math.round(rng() * 360)},35%,45%)`; g.fillRect(x + 6, yy + 9, h / 5 - 18, h / 5 - 18); g.fillStyle = PAL.dim; g.fillRect(x + h / 5, yy + 12, w * 0.4, 6); PR.drawHeart(g, x + w - 40, yy + h / 10, 7, PAL.red); g.fillStyle = PAL.white; g.font = '14px "DejaVu Sans"'; g.fillText(Math.floor(rng() * 999) + '', x + w - 28, yy + h / 10 + 5); } }

export function dashTex(seed = 1, kind = null, W = 640, H = 360) {
  const rng = mulberry32(seed);
  const k = kind ?? Math.floor(rng() * 6);
  return MT.drawTexture(W, H, (g) => {
    g.fillStyle = PAL.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = PAL.dim; g.fillRect(16, 14, 90, 6); g.fillRect(W - 60, 14, 44, 6);
    if (k === 0) { lineChart(g, 20, 40, W - 40, H - 60, rng, { col: PAL.teal }); }
    else if (k === 1) { bigNumber(g, 24, 130, 72, rng); lineChart(g, 20, 190, W - 40, H - 210, rng, { col: PAL.amber, fill: false }); }
    else if (k === 2) { heatmap(g, 20, 40, W - 40, H - 60, rng); }
    else if (k === 3) { bars(g, 20, 40, W * 0.6, H - 60, rng); donut(g, W * 0.82, H * 0.55, H * 0.25, rng); }
    else if (k === 4) { feedStrip(g, 20, 36, W * 0.45, H - 50, rng); lineChart(g, W * 0.5, 40, W * 0.47, H * 0.5, rng, { col: PAL.red }); bigNumber(g, W * 0.52, H * 0.82, 40, rng); }
    else { // world map-ish dots + pings
      for (let i = 0; i < 900; i++) { const x = 20 + rng() * (W - 40), y = 40 + rng() * (H - 60); const lat = (y - 40) / (H - 60); if (Math.sin(x * 0.02) * Math.cos(lat * 5) + rng() * 0.8 > 0.4) { g.fillStyle = '#1e3140'; g.fillRect(x, y, 3, 3); } }
      for (let i = 0; i < 40; i++) { const x = 20 + rng() * (W - 40), y = 40 + rng() * (H - 60); g.fillStyle = [PAL.teal, PAL.amber, PAL.red][i % 3]; g.beginPath(); g.arc(x, y, 2 + rng() * 4, 0, Math.PI * 2); g.fill(); }
    }
  });
}

// the "data point" screen: an image (surveillance-like still of the kitchen) with tracking overlay
export function dataPointTex(img, { W = 1280, H = 720, box = [0.33, 0.18, 0.2, 0.55], seed = 3 } = {}) {
  const rng = mulberry32(seed);
  return MT.drawTexture(W, H, (g) => {
    g.fillStyle = '#05080a'; g.fillRect(0, 0, W, H);
    // image, desaturated & cold
    g.filter = 'grayscale(0.7) contrast(1.15) brightness(1.15)'; g.drawImage(img, 0, 0, W, H); g.filter = 'none';
    g.fillStyle = 'rgba(20,60,70,0.25)'; g.fillRect(0, 0, W, H);
    // scanlines
    for (let y = 0; y < H; y += 3) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y, W, 1); }
    // tracking box on the figure
    const [bx, by, bw, bh] = [box[0] * W, box[1] * H, box[2] * W, box[3] * H];
    g.strokeStyle = PAL.amber; g.lineWidth = 3; const c = 26;
    for (const [x, y, sx, sy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) { g.beginPath(); g.moveTo(x + sx * c, y); g.lineTo(x, y); g.lineTo(x, y + sy * c); g.stroke(); }
    g.fillStyle = 'rgba(255,177,61,0.9)'; g.fillRect(bx, by - 34, 190, 28); g.fillStyle = '#10161c'; g.font = '600 20px "DejaVu Sans Mono", monospace'; g.fillText('#' + Math.floor(1e7 + rng() * 9e7), bx + 8, by - 13);
    // side panel: engagement meters, heart counter, sparkline, timestamp
    const px = W * 0.7, pw = W * 0.27;
    g.fillStyle = 'rgba(8,14,20,0.82)'; g.fillRect(px, 30, pw, H - 60);
    g.fillStyle = PAL.white; g.font = '300 44px "DejaVu Sans"'; g.fillText('02:14', px + 20, 90);
    for (let i = 0; i < 5; i++) { const v = 0.3 + rng() * 0.7; g.fillStyle = PAL.grid; g.fillRect(px + 20, 130 + i * 44, pw - 40, 12); g.fillStyle = i === 2 ? PAL.amber : PAL.teal; g.fillRect(px + 20, 130 + i * 44, (pw - 40) * v, 12); }
    lineChart(g, px + 20, 370, pw - 40, 140, rng, { col: PAL.amber, fill: true, n: 40 });
    PR.drawHeart(g, px + 36, 560, 12, PAL.red); g.fillStyle = PAL.white; g.font = '300 34px "DejaVu Sans"'; g.fillText('0', px + 60, 572);
    g.fillStyle = PAL.dim; g.fillRect(px + 20, 610, pw * 0.5, 8); g.fillRect(px + 20, 630, pw * 0.3, 8);
    // corner REC dot + frame counter
    g.fillStyle = PAL.red; g.beginPath(); g.arc(40, 44, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = PAL.white; g.font = '20px "DejaVu Sans Mono"'; g.fillText('00:02:14:07', 60, 51);
  });
}
