// P05 MISMATCH — one figure between two systems of light: a warm organic web on the left, a cold rigid grid on the right.
// Its threads reach left.
import { Stage, THREE, COL, V, figure, crowd, Threads, Motes, bez, reach, smooth, mulberry, floor, mixCol, walnut } from './lib.js';
import { PZ } from './poses.js';

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 38, exposure: +(q.get('exp') || 1.4), sat: 0.95,
    bloom: { strength: 0.5, radius: 0.5, threshold: 1.0 },
    haze: { density: 0.0008, noise: 0.6, far: 120, scale: 1.3, seed: 2 },
    dof: { focus: 4.3, blurInf: 5, max: 9 }, vignette: 0.72, grain: 0.035,
    mirror: { y: 0, k: 0.55, blur: 6, fade: 25 } });
  const R = mulberry(21);
  walnut().userData.rim.uRimCol.value.set(0x9fe3ff).multiplyScalar(0.28);
  walnut().userData.rim.uRimDir.value.set(0.8, 0.3, -0.4).normalize();
  floor(st, { color: 0x060606, rough: 0.4, bump: 0.2, clearcoat: 0.5, ccRough: 0.3 });

  const F = figure(st, { chest: [2, -12, 0], head: [2, -24, 0], lShoulder: [-8, 0, 12], rShoulder: [-4, 0, -8], lElbow: [-16, 0, 0], rElbow: [-10, 0, 0], lHip: [-2, 0, 3], rHip: [3, 0, -2] },
    { pos: [0, 0, 0], rot: [0, 185, 0], coreI: 1.0, coreLight: 1.0, coreRange: 0.35 });

  const T = new Threads(st, { minPx: 1.1, haloMul: 7, haloGain: 0.12 });
  const M = new Motes(st, { minPx: 1.1 });
  // warm organic web (left): people, scattered in clusters on the ground, joined by curved threads
  const items = [];
  for (let c = 0; c < 10; c++) { const cx = -1.8 - Math.pow(R(), 0.9) * 10, cz = -0.5 - Math.pow(R(), 0.8) * 16;
    for (let k = 0; k < 5; k++) items.push({ pose: [PZ.standRelax, PZ.sitHug, PZ.squat, PZ.sitLog, PZ.standBow][k], pos: [cx + (R() - 0.5) * 1.8, 0, cz + (R() - 0.5) * 1.8], rotY: R() * 360, core: 1 }); }
  const ppl = crowd(st, items, { coreGain: 12, coreSize: 0.03 });
  const nodes = ppl.map(p => p.core);
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [b.distanceTo(a), j]).filter(([d, j]) => j !== i).sort((x, y) => x[0] - y[0]).slice(0, 4);
    for (const [d, j] of near) { if (j < i) continue; const b = nodes[j];
      const mid = a.clone().lerp(b, 0.5).add(V(0, 0.25 + 0.2 * d, 0));
      T.add(bez(a, a.clone().lerp(mid, 0.6), b.clone().lerp(mid, 0.6), b, 30), { color: (u) => mixCol(COL.amber, COL.hot, 0.3 * Math.sin(Math.PI * u)), width: 0.008, intensity: 3.0, fadeIn: 0.05, fadeOut: 0.05 }); }
    if (i % 5 === 0) st.light(a.clone().add(V(0, 0.4, 0)), COL.amber, 1.2, { hazeGain: 0.8, radius: 0.3 });
  });
  // cold rigid grid (right): a lattice of boxes receding
  const gx = 1.2, gy = 1.2, gz = 1.6;
  for (let ix = 0; ix < 12; ix++) for (let iy = 0; iy < 6; iy++) for (let iz = 0; iz < 12; iz++) {
    const p = V(2.4 + ix * gx, 0.02 + iy * gy, -2 - iz * gz);
    const fall = Math.exp(-iz * 0.08);
    if (ix < 11) T.add([p, p.clone().add(V(gx, 0, 0))], { color: COL.cyan, width: 0.008, intensity: 0.7 * fall, fadeIn: 0, fadeOut: 0, halo: 0.4 });
    if (iy < 5) T.add([p, p.clone().add(V(0, gy, 0))], { color: COL.cyan, width: 0.008, intensity: 0.7 * fall, fadeIn: 0, fadeOut: 0, halo: 0.4 });
    if (iz < 11) T.add([p, p.clone().add(V(0, 0, -gz))], { color: COL.cyan, width: 0.008, intensity: 0.7 * fall, fadeIn: 0, fadeOut: 0, halo: 0.4 });
    if ((ix + iy + iz) % 9 === 0) st.hazeLight(p, COL.cyan, 0.6, 0.4);
  }
  // the figure's threads reach left, toward the warm web
  const targets = [nodes[2], nodes[12], nodes[31]].map(n => n.clone());
  targets.forEach((tg, k) => {
    const end = F.core.clone().lerp(tg, 0.45 + k * 0.08);
    const pts = reach(F.core, F.fwd.clone().add(V(-0.8, 0.2, 0)).normalize(), end, null, { k1: 0.35, lift: 0.4 + k * 0.25, n: 80 });
    T.add(pts, { color: (u) => mixCol(COL.hot, COL.amber, u), width: 0.005, intensity: 6, fadeIn: 0.02, fadeOut: 0.25 });
    st.lightsAlong(pts, COL.amber, 0.9, 3, { hazeGain: 0.8, radius: 0.08, to: 0.5 });
  });
  M.build(); T.build();
  st.light(V(-3, 2, -2), COL.amber, 3, { haze: false }); st.light(V(3.5, 2, -2), COL.cyan, 3, { haze: false });
  st.envFromFx(V(0, 1.5, 0), { intensity: 0.5 });
  st.look(V(0.35, 1.45, 4.3), V(0, 1.7, -6), 38);
  st.render({ time: 0.2 });
}
