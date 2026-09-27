// P09 THE LOOP — macro: a warm thread leaves one chest, arcs, and lands in another with a soft bloom; the light settles.
// Still: ?t=0.8 (landed, settling). Animation: ?anim=1 exposes window.__frame(t) for frame-by-frame capture.
import { Stage, THREE, POSES, COL, V, figure, walnut, Threads, Motes, reach, strands, smooth, clamp01, mulberry, floor, mixCol, circlePts } from './lib.js';

export default async function ({ w, h, q }) {
  const anim = q.get('anim') === '1';
  const st = new Stage({ w, h, fov: 30, exposure: 1.05, tone: 'aces', sat: 0.86,
    bloom: { strength: 0.8, radius: 0.38, threshold: 0.85 },
    haze: { density: 0.00045, noise: 0.6, far: 40, scale: 1.8, seed: 3 },
    dof: { focus: 2.55, blurInf: 16, max: 26 }, vignette: 0.72, grain: 0.03,
    mirror: { y: 0, k: 0.25, blur: 8, fade: 6 } });
  walnut().userData.rim.uRimCol.value.set(0xa9bfd8).multiplyScalar(0.14);
  floor(st, { color: 0x0a0807, rough: 0.5, clearcoat: 0.3 });

  const A = figure(st, { chest: [6, 4, 0], head: [6, 4, 0], lShoulder: [-6, 0, 7], lElbow: [-10, 0, 0], rShoulder: [-30, 14, -10], rElbow: [-30, 0, 0], rWrist: [0, -50, 0], lHip: [-3, 0, 2], rHip: [3, 0, -2] },
    { pos: [-0.6, 0, 0], rot: [0, 72, 0], coreI: 1.0, coreRange: 0.35 });
  const B = figure(st, { chest: [3, -4, 0], head: [14, -8, 0], lShoulder: [-10, 0, 9], lElbow: [-18, 0, 0], rShoulder: [-14, 0, -9], rElbow: [-26, 0, 0], rWrist: [0, 20, 0] },
    { pos: [0.6, 0, 0.02], rot: [0, -72, 0], coreI: 1.0, coreLight: 0, coreRange: 0.35 });
  const bCoreMat = B.coreMesh.material; const bCoreBase = new THREE.Color(COL.amber).multiplyScalar(14);
  const path = reach(A.core, A.fwd, B.core, B.fwd, { k1: 0.32, k2: 0.32, lift: 0.5, n: 240 });
  const curve = new THREE.CatmullRomCurve3(path);
  const strandPaths = strands(path, { count: 4, radius: 0.007, twist: 5.5, seed: 7 });
  // fixed light rig (constant count -> no shader recompiles between frames)
  const NL = 9; const tl = [];
  for (let i = 0; i < NL; i++) { const L = new THREE.PointLight(COL.amber, 0, 0, 2); st.scene.add(L); tl.push(L); }
  const landL = new THREE.PointLight(COL.amber, 0, 0, 2); landL.position.copy(B.core.clone().addScaledVector(B.fwd, 0.06)); st.scene.add(landL);
  const baseHaze = st.hazeLights.slice();
  const r2 = mulberry(5);
  const dust = []; for (let i = 0; i < 110; i++) dust.push([V((r2() - 0.5) * 3.2, 0.9 + r2() * 1.4, (r2() - 0.5) * 3 - 0.4), mixCol(COL.amber, COL.hot, r2()), 0.5 + r2() * 1.2]);
  let dyn = [];
  // env from the fully landed state (static)
  {
    const T0 = new Threads(st, { minPx: 1.2, haloMul: 8, haloGain: 0.1 }); T0.add(path, { color: COL.amber, width: 0.0045, intensity: 6 }); T0.build();
    st.envFromFx(V(0, 1.5, 0.1), { intensity: 0.3 });
    st.fx.remove(T0.core); st.fx.remove(T0.halo);
  }
  const burstR = mulberry(11); const burst = []; for (let i = 0; i < 70; i++) burst.push([V(burstR() - 0.5, burstR() - 0.5, burstR() - 0.5).normalize(), 0.03 + burstR() * 0.16, burstR(), 0.004 + burstR() * 0.004]);

  function frame(t) {
    for (const o of dyn) { st.fx.remove(o); o.geometry?.dispose(); }
    dyn = []; st.hazeLights = baseHaze.slice();
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.5);
    const head = smooth(0.1, 0.58, t);            // growth front
    const land = smooth(0.56, 0.62, t);           // arrival
    const settle = smooth(0.62, 0.98, t);         // settling
    const colFn = (u) => mixCol(COL.hot, COL.amber, 0.55 + 0.45 * Math.sin(u * Math.PI));
    const along = (u) => {
      if (u > head + 0.0001) return 0;
      const tip = Math.exp(-Math.pow((u - head) / 0.02, 2)) * 3.2 * (1 - land);
      const ripple = 0.22 * Math.sin(u * 38 - t * 42) * (1 - settle) * land;
      return (0.6 + 0.4 * settle) * (1 + ripple) + tip;
    };
    const T = new Threads(st, { minPx: 1.2, haloMul: 8, haloGain: 0.1 });
    T.add(path, { color: colFn, width: 0.0045, intensity: 9, fadeIn: 0.02, alongFn: along });
    for (const s of strandPaths) T.add(s, { color: colFn, width: 0.0014, intensity: 7, fadeIn: 0.02, alongFn: along, halo: 0.3 });
    // landing: expanding rings on B's chest, a spray of motes, settling
    const M = new Motes(st, { minPx: 1.2 });
    for (const [p, c, k] of dust) M.add(p.clone().add(V(0, t * 0.05, 0)), c, k, 0.003);
    const aCore = 1 + 0.35 * pulse * (1 - head);
    M.add(A.core.clone().addScaledVector(A.fwd, 0.02), COL.hot, 4 * aCore, 0.012);
    if (land > 0) {
      const bf = B.fwd; const ax = V(0, 1, 0).cross(bf).normalize(); const ay = bf.clone().cross(ax).normalize();
      for (let k = 0; k < 3; k++) {
        const p = clamp01((t - 0.6 - k * 0.07) / 0.3); if (p <= 0 || p >= 1) continue;
        const rr = 0.015 + 0.2 * Math.pow(p, 0.7); const ring = [];
        for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; ring.push(B.core.clone().addScaledVector(ax, Math.cos(a) * rr).addScaledVector(ay, Math.sin(a) * rr).addScaledVector(bf, 0.012 + 0.02 * p)); }
        T.add(ring, { color: COL.hot, width: 0.003, intensity: 5 * Math.pow(1 - p, 2), fadeIn: 0, fadeOut: 0, halo: 0.6 });
      }
      const b = land * (1 - settle * 0.8);
      M.add(B.core.clone().addScaledVector(B.fwd, 0.02), COL.hot, 10 * b + 4 * settle, 0.012 + 0.02 * b);
      for (const [dir, d, c, sz] of burst) M.add(B.core.clone().addScaledVector(dir, d * (0.35 + 1.1 * settle)).addScaledVector(B.fwd, 0.03), mixCol(COL.amber, COL.hot, c), (2 + c * 5) * land * Math.pow(1 - settle, 1.5), sz);
    }
    bCoreMat.color.copy(bCoreBase).multiplyScalar(0.08 + 0.92 * smooth(0.6, 0.75, t));
    T.build(); M.build(); dyn.push(T.core, T.halo, M.points);
    // lights follow the grown thread
    for (let i = 0; i < NL; i++) { const u = (i + 0.5) / NL; const L = tl[i]; L.position.copy(curve.getPointAt(u)); L.intensity = u <= head ? 0.7 : 0; if (u <= head) st.hazeLights.push({ p: L.position.clone(), c: COL.amber.clone().multiplyScalar(0.35), r: 0.06 }); }
    const bl = 0.3 * smooth(0.6, 0.8, t) + 0.45 * land * (1 - settle);
    landL.intensity = bl; st.hazeLights.push({ p: landL.position.clone(), c: COL.amber.clone().multiplyScalar(Math.max(bl, 1e-4)), r: 0.05 });
    // slow push-in
    const cz = 2.75 - 0.2 * t;
    st.look(V(0.0, 1.62 - 0.02 * t, cz), V(0.0, 1.5, 0), 30); st.setDof({ focus: cz, blurInf: 16, max: 26 });
    st.render({ time: t * 7.3 });
  }
  if (anim) { window.__frame = async (t) => frame(t); frame(0.0); }
  else frame(q.has('t') ? +q.get('t') : 0.8);
}
