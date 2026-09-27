// 2D text helpers for the Demismatch shorts: in-scene textures (phone notifications, cards) and the series end card.
import * as THREE from 'three';

export const BRAND = {
  oxbloodDeep: '#2a0c11', oxblood: '#3a1218', parchment: '#ece0c4', parchmentSoft: '#f2e8cf',
  ink: '#1a0608', gold: '#c4962c', teal: '#2d6b6b', muted: '#8a7d5e',
  serif: 'Spectral, Georgia, serif', mono: '"JetBrains Mono", Menlo, monospace',
};

export function canvas2d(W, H) { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; }
export function texFrom(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; }

// Greedy word wrap; returns lines that fit maxW with the ctx's current font.
export function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
// Balance lines (avoid a short last line) by trying narrower widths.
export function wrapBalanced(ctx, text, maxW) {
  let best = wrap(ctx, text, maxW);
  for (let wv = maxW; wv > maxW * 0.55; wv -= maxW * 0.03) {
    const l = wrap(ctx, text, wv); if (l.length > best.length) break; best = l;
  }
  return best;
}
function grain(ctx, W, H, amt = 10, seed = 7) {
  const img = ctx.getImageData(0, 0, W, H); const d = img.data; let s = seed;
  for (let i = 0; i < d.length; i += 4) { s = (s * 16807) % 2147483647; const n = (s / 2147483647 - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}

// Phone lock screen with one notification. Returns a CanvasTexture sized for a phone screen (W x H px).
export function notificationScreen({ time = '3:09', date = '', sender = 'Neighbour', text = '', W = 540, H = 1110, wall = ['#0b1320', '#1a2436'], dim = 1 } = {}) {
  const [c, g] = canvas2d(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, wall[0]); gr.addColorStop(1, wall[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = `rgba(255,255,255,${0.92 * dim})`; g.textAlign = 'center';
  g.font = `300 ${Math.round(W * 0.2)}px ${BRAND.serif}`; g.fillText(time, W / 2, H * 0.2);
  if (date) { g.font = `400 ${Math.round(W * 0.04)}px ${BRAND.mono}`; g.fillText(date, W / 2, H * 0.25); }
  if (text) {
    const x = W * 0.06, bw = W * 0.88; g.font = `400 ${Math.round(W * 0.052)}px ${BRAND.serif}`;
    const lines = wrap(g, text, bw - W * 0.1); const bh = W * 0.16 + lines.length * W * 0.066;
    const y = H * 0.32;
    g.fillStyle = `rgba(245,245,245,${0.88 * dim})`; roundRect(g, x, y, bw, bh, W * 0.05); g.fill();
    g.textAlign = 'left'; g.fillStyle = '#222';
    g.font = `500 ${Math.round(W * 0.038)}px ${BRAND.mono}`; g.fillText(sender.toUpperCase(), x + W * 0.05, y + W * 0.085);
    g.font = `400 ${Math.round(W * 0.052)}px ${BRAND.serif}`;
    lines.forEach((l, i) => g.fillText(l, x + W * 0.05, y + W * 0.16 + i * W * 0.066));
  }
  return texFrom(c);
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// Printed card (e.g. care instructions): off-white stock, heading + lines. Returns CanvasTexture.
export function printedCard({ title = 'Care instructions', lines = [], W = 900, H = 1200, stock = '#f3ecdc', ink = '#2a2420' } = {}) {
  const [c, g] = canvas2d(W, H);
  g.fillStyle = stock; g.fillRect(0, 0, W, H); grain(g, W, H, 8);
  g.strokeStyle = ink; g.lineWidth = W * 0.004; g.strokeRect(W * 0.05, H * 0.04, W * 0.9, H * 0.92);
  g.fillStyle = ink; g.textAlign = 'left';
  g.font = `500 ${Math.round(W * 0.038)}px ${BRAND.mono}`; g.fillText(title.toUpperCase(), W * 0.1, H * 0.13);
  g.fillRect(W * 0.1, H * 0.155, W * 0.8, H * 0.002);
  g.font = `400 ${Math.round(W * 0.06)}px ${BRAND.serif}`;
  let y = H * 0.25;
  for (const l of lines) { for (const ln of wrap(g, l, W * 0.78)) { g.fillText(ln, W * 0.1, y); y += W * 0.075; } y += W * 0.03; }
  return texFrom(c);
}

// The series end card as a shot: build(ctx) -> { draw(t) } renders into the WebGL canvas.
//   line: the one line; hold: seconds. The line fades in over 0.7 s, the URL at +1.0 s.
export function endCardShot({ line, dur = 4.5 } = {}) {
  return {
    name: 'endcard', dur,
    build: async ({ renderer, w, h }) => {
      const [c, g] = canvas2d(w, h);
      const tex = texFrom(c);
      const scene = new THREE.Scene();
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
      const paint = (t) => {
        g.fillStyle = BRAND.oxbloodDeep; g.fillRect(0, 0, w, h);
        const vg = g.createRadialGradient(w / 2, h * 0.45, h * 0.1, w / 2, h * 0.5, h * 0.75); vg.addColorStop(0, 'rgba(90,30,40,0.25)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
        const a1 = Math.min(1, Math.max(0, t / 0.7)), a2 = Math.min(1, Math.max(0, (t - 1.0) / 0.6));
        g.textAlign = 'center';
        const fs = Math.round(w * 0.066); g.font = `italic 300 ${fs}px ${BRAND.serif}`;
        const lines = wrapBalanced(g, line, w * 0.76);
        const lh = fs * 1.32; const y0 = h * 0.46 - (lines.length - 1) * lh / 2;
        g.fillStyle = `rgba(236,224,196,${a1})`; lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * lh));
        const uy = y0 + (lines.length - 1) * lh + fs * 2.2;
        g.fillStyle = `rgba(196,150,44,${0.55 * a2})`; g.fillRect(w * 0.38, uy - fs * 0.9, w * 0.24, Math.max(1, w * 0.0018));
        g.font = `500 ${Math.round(w * 0.03)}px ${BRAND.mono}`; g.fillStyle = `rgba(196,150,44,${a2})`; g.fillText('demismatch.com', w / 2, uy);
        grain(g, w, h, 9, 13 + Math.floor(t * 12));
        tex.needsUpdate = true;
      };
      return {
        scene, camera: cam,
        draw: async (t) => { paint(t); renderer.setRenderTarget(null); renderer.render(scene, cam); },
        dispose: () => { tex.dispose(); },
      };
    },
  };
}
