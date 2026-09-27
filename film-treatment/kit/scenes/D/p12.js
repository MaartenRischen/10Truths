// P12 ON PURPOSE — pull back: the cocoon's threads feed into huge dark spools turning in the void,
// harvesting the light into a glowing ticker line.
import { Stage, THREE, COL, V, figure, Threads, Motes, bez, smooth, mulberry, floor, mixCol, walnut, densify, resample } from './lib.js';
import { PZ } from './poses.js';
import { cocoon } from './p11.js';

function spool(st, T, c, { r = 2.6, len = 4.2, flange = 4.0, axis = V(1, 0, 0), wraps = 70, seed = 1 } = {}) {
  const R = mulberry(seed);
  const grp = new THREE.Group(); grp.position.copy(c); grp.quaternion.setFromUnitVectors(V(0, 1, 0), axis.clone().normalize()); st.scene.add(grp);
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, metalness: 0.85, roughness: 0.32, clearcoat: 0.5 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 64, 1, true), metal); grp.add(drum);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(flange, flange, 0.22, 72), metal); f.position.y = s * (len / 2 + 0.11); grp.add(f);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.6, 32), metal); hub.position.y = s * (len / 2 + 0.4); grp.add(hub);
    // spokes/holes on the flange face as dark ribs
    for (let k = 0; k < 6; k++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, flange * 0.8), metal); rib.position.set(0, s * (len / 2 + 0.25), 0); rib.rotation.y = k * Math.PI / 6; grp.add(rib); }
  }
  // wound light: many turns around the drum, slightly above its surface
  grp.updateMatrixWorld(true);
  const toW0 = (p) => p.applyMatrix4(grp.matrixWorld);
  for (const sgn of [-1, 1]) { const ring = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; ring.push(toW0(V(Math.cos(a) * flange * 1.001, sgn * (len / 2 + 0.22), Math.sin(a) * flange * 1.001))); }
    T.add(ring, { color: COL.cyan, width: 0.03, intensity: 0.9, fadeIn: 0, fadeOut: 0, halo: 0.4 }); }
  for (const sgn of [-1, 1]) for (let k = 0; k < 7; k++) { const rr = flange * (0.45 + R() * 0.5); const a0 = R() * 6.28, a1 = a0 + 0.6 + R() * 1.2; const pts = [];
    for (let i = 0; i <= 30; i++) { const a = a0 + (a1 - a0) * i / 30; pts.push(toW0(V(Math.cos(a) * rr, sgn * (len / 2 + 0.23), Math.sin(a) * rr))); }
    T.add(pts, { color: COL.cyan, width: 0.02, intensity: 0.5 + R() * 0.6, fadeIn: 0.5, fadeOut: 0.5, halo: 0.3 }); }
  const toW = (p) => p.applyMatrix4(grp.matrixWorld);
  for (let layer = 0; layer < 3; layer++) {
    const pts = []; const rr = r + 0.03 + layer * 0.035; const N = wraps * 24;
    for (let i = 0; i <= N; i++) { const t = i / N; const a = t * wraps * Math.PI * 2; const y = -len / 2 + 0.15 + (len - 0.3) * (0.5 - 0.5 * Math.cos(t * Math.PI * 2 * (1 + layer))); pts.push(toW(V(Math.cos(a) * rr, y, Math.sin(a) * rr))); }
    T.add(pts, { color: COL.cyan, width: 0.012, intensity: 1.3, fadeIn: 0, fadeOut: 0, halo: 0.35 });
  }
  return { grp, toW, r };
}

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 50, exposure: +(q.get('exp') || 1.35), sat: 0.95,
    bloom: { strength: 0.55, radius: 0.55, threshold: 1.0 },
    haze: { density: 0.0007, noise: 0.6, far: 120, scale: 1.2, seed: 27 },
    vignette: 0.75, grain: 0.036, ca: 0.4, mirror: { y: 0, k: 0.45, blur: 6, fade: 25 } });
  const R = mulberry(9);
  walnut().userData.rim.uRimCol.value.set(0x9fe3ff).multiplyScalar(0.4);
  floor(st, { color: 0x050607, rough: 0.4, bump: 0.2, clearcoat: 0.5, ccRough: 0.3 });
  st.look(V(1.0, 0.7, 11), V(0, 9, -16), 55);
  const F = figure(st, PZ.selfHold, { pos: [0, 0, 0], rot: [0, 8, 0], coreColor: COL.cyan, coreI: 0.8, coreLight: 0.8, coreRange: 0.35 });
  const T = new Threads(st, { minPx: 1.0, haloMul: 6, haloGain: 0.12 });
  cocoon(st, T, F, { intensity: 1.6 });
  const spools = [
    spool(st, T, V(-10.5, 10.5, -15), { axis: V(1, 0.12, 0.45), seed: 1, r: 3.4, flange: 5.2, len: 5.4, wraps: 90 }),
    spool(st, T, V(11.5, 14, -20), { axis: V(1, -0.1, -0.5), seed: 2, r: 4.0, flange: 6.0, len: 6.0, wraps: 100 }),
    spool(st, T, V(-0.5, 21, -30), { axis: V(1, 0.05, 0.12), seed: 3, r: 4.6, flange: 7.0, len: 7.0, wraps: 110 }),
  ];
  // threads from the cocoon up into each drum, arriving tangentially
  for (const [si, S] of spools.entries()) {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * 1.2 - 0.6; const target = S.toW(V(Math.cos(a) * S.r, (R() - 0.5) * 4.6, Math.sin(a) * S.r));
      const start = F.pos.clone().add(V((R() - 0.5) * 0.7, 0.4 + R() * 1.7, (R() - 0.5) * 0.6));
      const mid = start.clone().lerp(target, 0.5).add(V((R() - 0.5) * 4, 2 + R() * 3, (R() - 0.5) * 4));
      T.add(bez(start, start.clone().add(V(0, 1.5, 0)), mid, target, 90), { color: (u) => mixCol(mixCol(COL.cyan, new THREE.Color(1, 1, 1), 0.3), COL.cyan, u), width: 0.006, intensity: 1.4, fadeIn: 0.05, fadeOut: 0.02, halo: 0.4 });
    }
    // backlight haze behind the spool (silhouette) and a rim light
    const back = S.grp.position.clone().add(S.grp.position.clone().sub(st.camera.position).normalize().multiplyScalar(6));
    st.hazeLight(back, COL.cyan, 7, 3.5);
    st.light(back.clone().add(V(0, 3, 0)), COL.cyan, 120, { haze: false });
    st.light(S.grp.position.clone().add(V(0, -3.5, 4)), COL.cyan, 14, { haze: false });
  }
  // the ticker: harvested light leaves the spools as a glowing rising line across the top
  const tick = []; const tr = mulberry(44);
  for (let i = 0; i <= 70; i++) { const t = i / 70; tick.push(V(-46 + t * 92, 30 + t * 14 + (tr() - 0.5) * 2.4 + Math.sin(t * 23) * 0.8, -40 - t * 8)); }
  T.add(densify(tick, 0.3), { color: mixCol(COL.cyan, new THREE.Color(1, 1, 1), 0.35), width: 0.1, intensity: 4.2, fadeIn: 0.1, fadeOut: 0, halo: 0.8 });
  for (const S of spools) { const p = S.grp.position; const j = tick.reduce((b, v, i) => v.distanceTo(p) < tick[b].distanceTo(p) ? i : b, 0);
    T.add(bez(p.clone().add(V(0, S.r + 1.5, 0)), p.clone().add(V(0, 8, 0)), tick[j].clone().add(V(0, -6, 0)), tick[j], 60), { color: COL.cyan, width: 0.05, intensity: 2.0, fadeIn: 0.1, fadeOut: 0.05, halo: 0.5 }); }
  const M = new Motes(st, { minPx: 1 }); M.add(tick[70], new THREE.Color(1, 1, 1), 16, 0.3);
  for (let i = 0; i < 200; i++) M.add(V((R() - 0.5) * 40, R() * 25, -5 - R() * 30), COL.cyan, 0.6 + R() * 1.2, 0.02);
  M.build(); T.build();
  st.envFromFx(V(0, 8, -12), { intensity: 1.2 });
  st.render({ time: 0.3 });
}
