// P08 EVERYTHING CHANGED — the ground has become a cold grid; buildings of light rise around the still figure:
// towers, cables, screens. Along the bottom, a long amber thread (two million years) ends in a tiny cyan segment (ten thousand).
import { Stage, THREE, COL, V, figure, Threads, Motes, smooth, mulberry, floor, mixCol, walnut, densify, panel } from './lib.js';
import { tower, catenary, place } from './props.js';
import { PZ } from './poses.js';

function uiTexture(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d'); let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.fillStyle = '#0d1a22'; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#9fe3ff'; for (let i = 0; i < 6; i++) { const x = 12 + i * 40, hgt = 20 + r() * 90; g.globalAlpha = 0.5 + r() * 0.5; g.fillRect(x, 150 - hgt, 26, hgt); }
  g.globalAlpha = 0.9; g.fillRect(12, 12, 150 * r() + 60, 10); g.fillRect(12, 30, 100 * r() + 40, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 42, exposure: +(q.get('exp') || 1.3), sat: 0.95,
    bloom: { strength: 0.5, radius: 0.5, threshold: 1.0 },
    haze: { density: 0.0007, noise: 0.6, far: 150, scale: 1.3, seed: 6 },
    dof: { focus: 7.5, blurInf: 3, max: 8 }, vignette: 0.7, grain: 0.035,
    mirror: { y: 0, k: 0.6, blur: 5, fade: 30 } });
  const R = mulberry(31);
  walnut().userData.rim.uRimCol.value.set(0x9fe3ff).multiplyScalar(0.35);
  walnut().userData.rim.uRimDir.value.set(-0.3, 0.7, -0.5).normalize();
  floor(st, { color: 0x050607, rough: 0.35, bump: 0.15, clearcoat: 0.6, ccRough: 0.25 });
  st.look(V(0.4, 0.9, 7.8), V(0, 2.6, -6), 44);

  const F = figure(st, PZ.standRelax, { pos: [0, 0, 0], rot: [0, 12, 0], coreI: 1.2, coreLight: 1.3, coreRange: 0.45 });
  const T = new Threads(st, { minPx: 1.0, haloMul: 6, haloGain: 0.1 });
  // the grid floor
  for (let i = -40; i <= 40; i++) {
    const k = Math.exp(-Math.abs(i) * 0.04);
    T.add(densify([V(i, 0.004, 6), V(i, 0.004, -80)], 2), { color: COL.cyan, width: 0.012, intensity: 0.9 * k, fadeIn: 0, fadeOut: 0.5, halo: 0.3 });
  }
  for (let j = -6; j <= 80; j++) T.add(densify([V(-40, 0.004, -j), V(40, 0.004, -j)], 2), { color: COL.cyan, width: 0.012, intensity: 0.9 * Math.exp(-Math.max(j, 0) * 0.03), fadeIn: 0.3, fadeOut: 0.3, halo: 0.3 });
  // towers of light (with dark bodies), cables, screens
  const darkMat = new THREE.MeshPhysicalMaterial({ color: 0x06080a, roughness: 0.2, metalness: 0.2, clearcoat: 1 });
  const towers = [];
  const spots = [[-5.5, -6, 2.2, 14], [5.2, -5, 2.6, 18], [-10, -14, 3.2, 26], [9, -16, 3.0, 30], [-3, -20, 2.4, 22], [2.5, -28, 3.4, 34], [-15, -26, 4, 28], [15, -30, 4, 24], [-7.5, -3, 1.4, 9], [7.8, -2.2, 1.6, 8]];
  for (const [x, z, s, hgt] of spots) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.98, hgt, s * 0.98), darkMat); body.position.set(x, hgt / 2, z); st.scene.add(body); st.floors.includes(body);
    const P = place(tower(s, s, hgt, Math.round(hgt / 1.2), 4), { pos: V(x, 0, z) });
    for (const pl of P) T.add(densify(pl, 0.6), { color: mixCol(COL.cyan, new THREE.Color(1, 1, 1), 0.15), width: 0.018, intensity: 1.15, fadeIn: 0, fadeOut: 0, halo: 0.4 });
    towers.push({ x, z, s, hgt });
    const win = [];
    const fl = Math.round(hgt / 1.2), bays = 4;
    for (let f = 0; f < fl; f++) for (let b = 0; b < bays; b++) { if (R() > 0.22) continue;
      const wx = x - s / 2 + (b + 0.5) * s / bays, wy = (f + 0.5) * hgt / fl;
      const g = new THREE.PlaneGeometry(s / bays * 0.8, hgt / fl * 0.7); g.translate(wx, wy, z + s / 2 + 0.01); win.push(g); }
    if (win.length) { const merged = win.reduce((acc, g) => { acc.push(g); return acc; }, []);
      for (const g of merged) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.75, 1.0).multiplyScalar(0.15 + R() * 0.3) })); st.scene.add(m); } }
    // a screen on the tower face toward the figure
    if (R() > 0.35) { const sw = s * 0.8, sh = sw * 0.6; const yy = 2 + R() * (hgt * 0.5);
      const face = V(x, yy, z + s / 2 + 0.02); panel(st, { w: sw, h: sh, pos: face, color: new THREE.Color(0.75, 0.95, 1.0), gain: 2.2, map: uiTexture(Math.floor(R() * 1e6)) });
      st.hazeLight(face.clone().add(V(0, 0, 0.5)), COL.cyan, 1.5, 0.5); }
  }
  for (let i = 0; i < towers.length; i++) for (let j = i + 1; j < towers.length; j++) {
    const a = towers[i], b = towers[j]; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d > 12 || R() > 0.6) continue;
    const ya = a.hgt * (0.4 + R() * 0.5), yb = b.hgt * (0.4 + R() * 0.5);
    T.add(catenary(V(a.x, ya, a.z), V(b.x, yb, b.z), d * 0.12, 40), { color: COL.cyan, width: 0.012, intensity: 1.2, fadeIn: 0, fadeOut: 0, halo: 0.3 });
  }
  // warm sparks rising around the figure turning into cold data motes
  const M = new Motes(st, { minPx: 1.1 });
  for (let i = 0; i < 120; i++) { const y = 0.6 + Math.pow(R(), 0.8) * 9; const a = R() * 6.28, rr = 0.3 + R() * (0.8 + y * 0.35);
    const t = smooth(1.2, 5.5, y); M.add(V(Math.cos(a) * rr, y, Math.sin(a) * rr * 0.6 - 0.5), mixCol(COL.amber, COL.cyan, t), 3 * (1 - t * 0.5), 0.012 + R() * 0.01); }
  // the timeline along the bottom: two million years of amber ending in a tiny cyan segment
  const A0 = st.at(0.05, 0.905, 3.2), A1 = st.at(0.95, 0.905, 3.2); const cutP = A0.clone().lerp(A1, 0.988);
  T.add(densify([A0, cutP], 0.03), { color: COL.amber, width: 0.006, intensity: 5.5, fadeIn: 0.1, fadeOut: 0, halo: 0.8 });
  T.add(densify([cutP.clone().lerp(A1, 0.08), A1], 0.01), { color: COL.cyan, width: 0.0075, intensity: 12, fadeIn: 0, fadeOut: 0, halo: 1.2 });
  M.add(A1, COL.cyan, 14, 0.012);
  st.hazeLight(A0.clone().lerp(A1, 0.5), COL.amber, 0.4, 0.3); st.hazeLight(A1, COL.cyan, 0.3, 0.05);
  M.build(); T.build();
  st.light(V(0, 6, -3), COL.cyan, 14, { haze: false });
  st.envFromFx(V(0, 2, 0), { intensity: 0.8 });
  st.render({ time: 0.2 });
}
