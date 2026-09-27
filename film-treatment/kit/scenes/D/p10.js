// P10 LONELINESS — the figure alone; a red pulse runs along its thread, which shoots toward a galaxy of cold points
// and splits into thousands of hair-thin cyan threads that land nowhere. A small glowing number floats among them.
import { Stage, THREE, COL, V, figure, Threads, Motes, reach, bez, smooth, mulberry, floor, mixCol, walnut, clamp01 } from './lib.js';
import { PZ } from './poses.js';

function badgeTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineJoin = 'round';
  // heart outline
  g.beginPath(); const hx = 90, hy = 86, s = 46;
  g.moveTo(hx, hy + s * 0.75);
  g.bezierCurveTo(hx - s * 1.25, hy - s * 0.05, hx - s * 0.62, hy - s * 1.05, hx, hy - s * 0.42);
  g.bezierCurveTo(hx + s * 0.62, hy - s * 1.05, hx + s * 1.25, hy - s * 0.05, hx, hy + s * 0.75);
  g.fillStyle = '#fff'; g.fill();
  g.font = '300 104px Helvetica, Arial, sans-serif'; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 170, 88);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 34, exposure: +(q.get('exp') || 1.25), sat: 0.95, tone: 'aces',
    bloom: { strength: 0.55, radius: 0.5, threshold: 1.0 },
    haze: { density: 0.0006, noise: 0.55, far: 200, height: 0, scale: 1.4, seed: 11 },
    vignette: 0.72, grain: 0.035, ca: 0.0,
    mirror: { y: 0, k: 0.45, blur: 9, fade: 18 } });
  const R = mulberry(8);
  walnut().userData.rim.uRimCol.value.set(0x9fe3ff).multiplyScalar(0.9);
  walnut().userData.rim.uRimDir.value.set(0.5, 0.5, -0.4).normalize();

  floor(st, { color: 0x060606, rough: 0.35, bump: 0.15, repeat: 40, clearcoat: 0.6, ccRough: 0.25 });

  // the figure: alone, looking up and out
  const F = figure(st, { chest: [-4, 0, 0], head: [-14, 8, 0], lShoulder: [2, 0, 7], rShoulder: [-10, 0, -9], lElbow: [-8, 0, 0], rElbow: [-24, 0, 0], rWrist: [0, -20, 0], lHip: [-2, 0, 3], rHip: [3, 0, -3] },
    { pos: [0, 0, 0], rot: [0, 168, 0], coreColor: COL.ember, coreI: 1.3, coreLight: 0.8, coreRange: 0.22 });

  const G = V(28, 40, -150);                  // galaxy centre
  const S = F.core.clone().add(V(2.2, 2.4, -9)); // split point
  // main thread with red pulse
  const T = new Threads(st, { minPx: 1.1, haloMul: 7, haloGain: 0.12 });
  const main = reach(F.core, F.fwd.clone().add(V(0, 0.25, 0)).normalize(), S, G.clone().sub(S).normalize().negate(), { k1: 0.35, k2: 0.3, lift: 0.3, n: 160 });
  const pulseU = 0.34;
  T.add(main, {
    width: (u) => 0.006 + 0.012 * Math.exp(-Math.pow((u - pulseU) / 0.05, 2)),
    color: (u) => { const p = Math.exp(-Math.pow((u - pulseU) / 0.06, 2)); const base = mixCol(mixCol(COL.hot, COL.amber, 0.5), COL.cyan, smooth(0.35, 1.0, u)); return mixCol(base, COL.ember, clamp01(p * 1.3 + (u < pulseU ? 0.35 * (1 - u / pulseU) : 0))); },
    intensity: 6, fadeIn: 0.015,
    alongFn: (u) => 1 + 1.8 * Math.exp(-Math.pow((u - pulseU) / 0.05, 2)),
  });
  const pulseP = new THREE.CatmullRomCurve3(main).getPointAt(pulseU);
  st.light(pulseP, COL.ember, 2.4, { hazeGain: 1.2, radius: 0.12 });
  st.light(F.core.clone().addScaledVector(F.fwd, 0.08), COL.ember, 0.3, { hazeGain: 1.0, radius: 0.05, distance: 0.3 });
  // lights along the far part of the main thread (cool)
  for (const u of [0.6, 0.8, 0.97]) st.light(new THREE.CatmullRomCurve3(main).getPointAt(u), mixCol(COL.amber, COL.cyan, u), 1.2, { hazeGain: 0.6, radius: 0.2 });

  // the split: branches, then hair-thin threads that stop short of the galaxy
  const toG = G.clone().sub(S).normalize();
  const up = V(0, 1, 0); const side = toG.clone().cross(up).normalize(); const up2 = side.clone().cross(toG).normalize();
  const NB = 11;
  const hairColor = (u) => mixCol(mixCol(COL.cyan, new THREE.Color(1, 1, 1), 0.25), COL.cyan, u);
  for (let b = 0; b < NB; b++) {
    const ang = (b / NB) * Math.PI * 2 + R() * 0.3; const spread = 0.22 + R() * 0.3;
    const bdir = toG.clone().addScaledVector(side, Math.cos(ang) * spread).addScaledVector(up2, Math.sin(ang) * spread * 0.7).normalize();
    const blen = 5 + R() * 5;
    const B = S.clone().addScaledVector(bdir, blen);
    const bpts = bez(S, S.clone().addScaledVector(toG, blen * 0.4), B.clone().addScaledVector(bdir, -blen * 0.3), B, 40);
    T.add(bpts, { color: (u) => mixCol(mixCol(COL.hot, COL.cyan, 0.7), COL.cyan, u), width: 0.006, intensity: 1.3, fadeIn: 0.0, alongFn: (u) => 1 - 0.5 * u });
    st.light(B, COL.cyan, 0.0, { surface: false, hazeGain: 1, radius: 0.5 });
    st.hazeLight(B, COL.cyan, 0.05, 0.5);
    const NH = +(q.get('hair') || 190);
    for (let k = 0; k < NH; k++) {
      // target: a random stranger in the galaxy disc; the thread stops well short of it
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 75;
      const tgt = G.clone().addScaledVector(side, Math.cos(a) * rr).addScaledVector(up2, Math.sin(a) * rr * 0.5).add(V(0, (R() - 0.5) * 8, (R() - 0.5) * 20));
      const reachFrac = 0.12 + Math.pow(R(), 1.4) * 0.45;
      const B0 = new THREE.CatmullRomCurve3(bpts).getPointAt(0.55 + R() * 0.45).add(V((R() - 0.5) * 0.3, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3));
      const end = B0.clone().lerp(tgt, reachFrac);
      const c1 = B0.clone().addScaledVector(bdir, 2 + R() * 3);
      const c2 = end.clone().add(V((R() - 0.5) * 3, (R() - 0.5) * 3, (R() - 0.5) * 3));
      const pts = bez(B0, c1, c2, end, 30);
      const tipI = 0.8 + R() * 1.6;
      T.add(pts, { color: hairColor, width: 0.003 + R() * 0.003, intensity: 0.5 + R() * 0.7, fadeIn: 0.25, fadeOut: 0.06, halo: 0.2,
        alongFn: (u) => 0.55 + 0.45 * (1 - u) + tipI * Math.exp(-Math.pow((u - 0.975) / 0.02, 2)) });
    }
  }
  // the galaxy: eight billion strangers as a cold spiral of points
  const M = new Motes(st, { minPx: 0.75 });
  const NG = +(q.get('stars') || 90000);
  for (let i = 0; i < NG; i++) {
    const arm = i % 4; const t = Math.pow(R(), 0.62); const rr = 3 + t * 78;
    const a = arm * (Math.PI / 2) + Math.log(1 + rr) * 2.3 + (R() - 0.5) * (0.22 + 0.5 * Math.pow(1 - t, 2)) + (R() < 0.12 ? (R() - 0.5) * 1.6 : 0);
    const jitter = (R() - 0.5) * (2 + rr * 0.08);
    const p = G.clone().addScaledVector(side, Math.cos(a) * rr + jitter).addScaledVector(up2, (Math.sin(a) * rr + jitter) * 0.5).add(V(0, (R() - 0.5) * 2.5, (R() - 0.5) * 6));
    const c = mixCol(COL.cyan, new THREE.Color(0.9, 0.97, 1.0), R());
    M.add(p, c, (0.14 + Math.pow(R(), 10) * 9) * (1.25 - t * 0.7), 0.035 + R() * 0.03);
  }
  for (let i = 0; i < 6000; i++) { const rr = Math.pow(R(), 2.2) * 16; const a = R() * 6.28; M.add(G.clone().addScaledVector(side, Math.cos(a) * rr).addScaledVector(up2, Math.sin(a) * rr * 0.5), mixCol(COL.cyan, new THREE.Color(1, 1, 1), 0.6), 0.25 + R() * 0.5, 0.05); }
  st.hazeLight(G, COL.cyan, 10, 10);
  for (let arm = 0; arm < 4; arm++) for (let k = 1; k <= 4; k++) { const rr = 10 + k * 14; const a = arm * (Math.PI / 2) + Math.log(1 + rr) * 2.3;
    st.hazeLight(G.clone().addScaledVector(side, Math.cos(a) * rr).addScaledVector(up2, Math.sin(a) * rr * 0.5), COL.cyan, 2.2, 7); }
  // near dust
  for (let i = 0; i < 160; i++) M.add(V((R() - 0.5) * 16, R() * 7, -2 - R() * 16), COL.cyan, 0.8 + R() * 1.8, 0.006);
  M.build();
  T.build();

  // the number: a small glowing heart + count among the unlanded threads
  const bt = badgeTexture(q.get('num') || '12');
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), new THREE.MeshBasicMaterial({ map: bt, color: COL.cyan.clone().multiplyScalar(3.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  badge.position.copy(S.clone().addScaledVector(toG, 28).addScaledVector(side, 3).addScaledVector(up2, 3));
  st.fx.add(badge); st.billboards.push(badge); badge.userData.roll = 0; st.hazeLight(badge.position, COL.cyan, 2, 0.4);
  // (billboard orientation expects a parent group)
  const pv = new THREE.Group(); pv.position.copy(badge.position); st.fx.add(pv); badge.position.set(0, 0, 0); pv.add(badge);

  st.envFromFx(F.core.clone(), { intensity: 0.5 });
  st.look(V(3.5, 1.0, 10), V(0, 5, -20), 34);
  st.render({ time: 0.5 });
}
