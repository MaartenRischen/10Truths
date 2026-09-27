// Line-art props drawn in light (polylines in local space, then placed). Each returns an array of polylines (Vector3[]).
import { THREE, V, circlePts, rectPts, densify } from './lib.js';

export function place(polys, { pos = V(), rotY = 0, rotX = 0, rotZ = 0, scale = 1 } = {}) {
  const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ')), V(scale, scale, scale));
  return polys.map(pl => pl.map(p => p.clone().applyMatrix4(m)));
}
const arc = (c, r, a0, a1, n = 24, axis = 'xy') => circlePts(c, r, n, axis, a0, a1);

// light bulb (y up, base at y=0), height ~1
export function bulb() {
  const P = [];
  const glass = [];
  for (let i = 0; i <= 48; i++) { const t = i / 48; const a = -Math.PI * 0.5 + t * Math.PI * 2;
    // profile: sphere of r .3 centered y=.62 blending into a neck of width .12 at y=.28
    const x = Math.cos(a) * 0.3, y = 0.62 + Math.sin(a) * 0.3; glass.push(V(x, y, 0)); }
  // make neck: replace bottom arc part with lines to neck
  const prof = [];
  for (let i = 0; i <= 40; i++) { const a = -Math.PI * 0.28 + (i / 40) * (Math.PI * 1.56); prof.push(V(Math.cos(a) * 0.3, 0.62 + Math.sin(a) * 0.3, 0)); }
  const right = [V(0.12, 0.22, 0), ...prof.slice(0, 1)];
  P.push([V(0.12, 0.22, 0), prof[0]]); P.push(prof); P.push([prof[prof.length - 1], V(-0.12, 0.22, 0)]);
  // screw base
  for (let k = 0; k < 4; k++) { const y = 0.2 - k * 0.045; P.push([V(-0.12, y, 0), V(0.12, y - 0.02, 0)]); }
  P.push([V(-0.12, 0.22, 0), V(-0.12, 0.04, 0), V(-0.05, 0.0, 0), V(0.05, 0.0, 0), V(0.12, 0.04, 0), V(0.12, 0.22, 0)]);
  // filament supports
  P.push([V(-0.05, 0.22, 0), V(-0.07, 0.55, 0)]); P.push([V(0.05, 0.22, 0), V(0.07, 0.55, 0)]);
  // 3D feel: a second glass outline rotated 90deg
  const prof2 = prof.map(p => V(0, p.y, p.x));
  P.push(prof2);
  return P;
}
export function bulbFilament() { const f = []; for (let i = 0; i <= 30; i++) { const t = i / 30; f.push(V(-0.07 + t * 0.14, 0.55 + Math.sin(t * Math.PI * 6) * 0.025, Math.cos(t * Math.PI * 6) * 0.02)); } return f; }

// camera lens: barrel along z, radius r, with glass elements; front at z=0
export function lens(r = 0.35, len = 0.55) {
  const P = [];
  for (const z of [0, -0.06, -len * 0.5, -len]) P.push(circlePts(V(0, 0, z), r * (z === 0 ? 1 : 0.94), 48, 'xy'));
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; P.push([V(Math.cos(a) * r, Math.sin(a) * r, 0), V(Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94, -len)]); }
  // glass elements (inner rings) and aperture blades
  for (const [z, rr] of [[-0.02, 0.8], [-0.14, 0.62], [-0.22, 0.42]]) P.push(circlePts(V(0, 0, z), r * rr, 40, 'xy'));
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, b = a + 1.25; P.push([V(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, -0.22), V(Math.cos(b) * r * 0.22, Math.sin(b) * r * 0.22, -0.22)]); }
  return P;
}
// microchip: square package in xz plane (y up), with pins and traces
export function chip(s = 0.5) {
  const P = []; const h = s / 2;
  P.push(rectPts(0, 0.03, 0, s, s, 'xz')); P.push(rectPts(0, 0.03, 0, s * 0.55, s * 0.55, 'xz'));
  const n = 7;
  for (let i = 0; i < n; i++) { const t = -h + (i + 0.5) * s / n;
    P.push([V(t, 0.03, h), V(t, 0.0, h + 0.1)]); P.push([V(t, 0.03, -h), V(t, 0.0, -h - 0.1)]);
    P.push([V(h, 0.03, t), V(h + 0.1, 0.0, t)]); P.push([V(-h, 0.03, t), V(-h - 0.1, 0.0, t)]);
    // traces on die
    P.push([V(t * 0.5, 0.031, h * 0.55), V(t * 0.5, 0.031, h * 0.55 - 0.05 - (i % 3) * 0.03)]);
  }
  return P;
}
// bed: frame in xz, headboard at -z, y up
export function bed(w = 1.5, l = 2.1, hgt = 0.45) {
  const P = []; const hw = w / 2, hl = l / 2;
  P.push(rectPts(0, hgt, 0, w, l, 'xz'));                // mattress top
  P.push(rectPts(0, hgt - 0.18, 0, w, l, 'xz'));         // mattress bottom
  for (const [x, z] of [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]]) P.push([V(x, 0, z), V(x, hgt, z)]);
  P.push([V(-hw, hgt, -hl), V(-hw, hgt + 0.55, -hl), V(hw, hgt + 0.55, -hl), V(hw, hgt, -hl)]); // headboard
  // pillows
  for (const x of [-hw * 0.5, hw * 0.5]) P.push(rectPts(x, hgt + 0.08, -hl + 0.3, w * 0.38, 0.32, 'xz'));
  // folded blanket edge
  P.push([V(-hw, hgt + 0.02, hl * 0.1), V(hw, hgt + 0.02, hl * 0.1)]);
  return P;
}
// chair (simple modern chair), seat at y=0.45, facing +z
export function chair() {
  const P = []; const s = 0.46, hs = s / 2, y = 0.46;
  P.push(rectPts(0, y, 0, s, s, 'xz'));
  for (const [x, z] of [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]]) P.push([V(x, 0, z), V(x, y, z)]);
  P.push([V(-hs, y, -hs), V(-hs, y + 0.48, -hs - 0.04), V(hs, y + 0.48, -hs - 0.04), V(hs, y, -hs)]);
  P.push([V(-hs, y + 0.3, -hs - 0.02), V(hs, y + 0.3, -hs - 0.02)]);
  return P;
}
// window frame in xy plane (4 panes)
export function windowFrame(w = 1.0, h = 1.3) {
  const P = [rectPts(0, 0, 0, w, h, 'xy'), rectPts(0, 0, 0, w * 1.12, h * 1.08, 'xy')];
  P.push([V(0, -h / 2, 0), V(0, h / 2, 0)]); P.push([V(-w / 2, 0, 0), V(w / 2, 0, 0)]);
  P.push([V(-w * 0.62, -h * 0.56, 0.08), V(w * 0.62, -h * 0.56, 0.08)]); // sill
  return P;
}
// 5-point star outline in xy plane
export function star(r = 0.2, filled = false) {
  const pts = []; for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.42 : r; pts.push(V(Math.cos(a) * rr, Math.sin(a) * rr, 0)); }
  const P = [pts];
  if (filled) for (let k = 1; k <= 4; k++) P.push(pts.map(p => p.clone().multiplyScalar(1 - k * 0.2)));
  return P;
}
export function rating(n = 5, filled = 3, r = 0.2, gap = 0.5) {
  let P = []; for (let i = 0; i < n; i++) P = P.concat(place(star(r, i < filled), { pos: V((i - (n - 1) / 2) * gap, 0, 0) }));
  return P;
}
// wall of screens (cols x rows) in xy plane, with generic bar/line content
export function newsWall(cols = 3, rows = 3, sw = 0.8, sh = 0.46, gap = 0.08, seed = 1) {
  const P = []; let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const cx = (c - (cols - 1) / 2) * (sw + gap), cy = (r - (rows - 1) / 2) * (sh + gap);
    P.push(rectPts(cx, cy, 0, sw, sh, 'xy'));
    // headline bar + ticker line + a jagged graph
    P.push([V(cx - sw * 0.42, cy - sh * 0.3, 0.01), V(cx + sw * (0.1 + rnd() * 0.3), cy - sh * 0.3, 0.01)]);
    P.push([V(cx - sw * 0.42, cy - sh * 0.38, 0.01), V(cx + sw * 0.42, cy - sh * 0.38, 0.01)]);
    const g = []; for (let k = 0; k <= 8; k++) g.push(V(cx - sw * 0.4 + k * sw * 0.1, cy + sh * (-0.05 + rnd() * 0.3), 0.01)); P.push(g);
  }
  return P;
}
// endless scrolling column: stacked cards rising and receding (xy plane, going up)
export function scrollColumn(n = 14, cw = 0.7, ch = 0.9, gap = 0.12) {
  const P = [];
  for (let i = 0; i < n; i++) { const y = i * (ch + gap); P.push(rectPts(0, y, 0, cw, ch, 'xy'));
    P.push(rectPts(0, y + ch * 0.12, 0.005, cw * 0.86, ch * 0.5, 'xy'));           // image block
    P.push([V(-cw * 0.43, y - ch * 0.25, 0.005), V(cw * 0.2, y - ch * 0.25, 0.005)]);
    P.push([V(-cw * 0.43, y - ch * 0.35, 0.005), V(cw * 0.35, y - ch * 0.35, 0.005)]); }
  return P;
}
// candy bar with crimped wrapper ends (along x)
export function candyBar(l = 0.9, w = 0.26, t = 0.08) {
  const P = []; const hl = l / 2;
  P.push(rectPts(0, 0, 0, l * 0.8, w, 'xy'));
  P.push(rectPts(0, 0, t, l * 0.8, w, 'xy'));
  for (const sx of [-1, 1]) { const x0 = sx * l * 0.4, x1 = sx * hl;
    P.push([V(x0, w / 2, 0), V(x1, w * 0.62, t / 2), V(x1, -w * 0.62, t / 2), V(x0, -w / 2, 0)]);
    for (let k = 0; k < 4; k++) { const yy = -w * 0.5 + k * w / 3; P.push([V(x1, yy * 1.24, t / 2), V(x1 + sx * 0.03, yy * 1.24, t / 2)]); } }
  P.push([V(-l * 0.25, -w * 0.1, t + 0.005), V(l * 0.2, -w * 0.1, t + 0.005)]);
  return P;
}
// tower of light: box outline with window grid on the two visible faces
export function tower(w = 2, d = 2, h = 10, floors = 20, bays = 5) {
  const P = []; const hw = w / 2, hd = d / 2;
  for (const [x, z] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) P.push([V(x, 0, z), V(x, h, z)]);
  P.push(rectPts(0, h, 0, w, d, 'xz')); P.push(rectPts(0, 0, 0, w, d, 'xz'));
  for (let f = 1; f < floors; f++) { const y = f * h / floors; P.push([V(-hw, y, hd), V(hw, y, hd)]); P.push([V(hw, y, hd), V(hw, y, -hd)]); }
  for (let b = 1; b < bays; b++) { const x = -hw + b * w / bays; P.push([V(x, 0, hd), V(x, h, hd)]); const z = -hd + b * d / bays; P.push([V(hw, 0, z), V(hw, h, z)]); }
  return P;
}
export function catenary(a, b, sag = 1, n = 40) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n; const p = a.clone().lerp(b, t); p.y -= sag * 4 * t * (1 - t); out.push(p); } return out; }
