// P16 CLOSE — high aerial: the new web glowing like a city seen from space at night. In the centre, one small figure.
import { Stage, THREE, COL, V, figure, crowd, Threads, Motes, reach, smooth, mulberry, floor, mixCol, walnut, noiseTexture, circlePts, densify, lightBodyMaterial } from './lib.js';
import { PZ } from './poses.js';

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 52, exposure: +(q.get('exp') || 1.4), sat: 0.95,
    bloom: { strength: 0.55, radius: 0.55, threshold: 1.0 },
    haze: { density: 0.0004, noise: 0.5, far: 200, height: 4, scale: 1.5, seed: 16 },
    vignette: 0.75, grain: 0.034 });
  const R = mulberry(160);
  walnut().userData.rim.uRimCol.value.set(0xffd2a0).multiplyScalar(0.1);
  const gmap = noiseTexture({ seed: 61, scale: 6, contrast: 1.3, size: 512, bias: 0.05 }); gmap.repeat.set(40, 40); gmap.colorSpace = THREE.SRGBColorSpace;
  const gr = floor(st, { color: 0x4a4038, rough: 0.9, bump: 0.6, repeat: 80 }); gr.material.map = gmap; gr.material.needsUpdate = true;
  st.look(V(0.6, 15.5, 8.8), V(0, 0.2, -1.2), 50);

  // the one figure, looking up, arms a little open
  const F = figure(st, { chest: [-12, 0, 0], head: [-40, 0, 0], lShoulder: [-40, 0, 62], rShoulder: [-40, 0, -62], lElbow: [-10, 0, 0], rElbow: [-10, 0, 0], lHip: [0, 0, 5], rHip: [0, 0, -5] },
    { pos: [0, 0, 0], rot: [0, 4, 0], coreI: 1.3, coreLight: 2.0, coreRange: 0.8, coreSize: 0.045 });
  { const Mc = new Motes(st, { minPx: 1 }); Mc.add(F.core.clone().add(V(0, 0.05, 0)), COL.hot, 5, 0.035); Mc.build();
    // the figure glows: a warm light-shell over the walnut (its own light, fully on)
    const shell = F.m.root.clone(true); const lm = lightBodyMaterial(COL.amber, { core: 0.35, rim: 2.6, pow: 1.6 });
    shell.traverse(o => { if (o.isMesh) o.material = lm; }); st.fx.add(shell); }
  st.light(V(0.0, 2.4, 1.2), COL.hot, 5, { haze: false, distance: 4.5 });
  const T = new Threads(st, { minPx: 1.5, haloMul: 7, haloGain: 0.12 });
  const M = new Motes(st, { minPx: 1.0 });
  const warm = (u) => mixCol(COL.hot, COL.amber, 0.35 + 0.65 * Math.sin(Math.PI * u));
  // the plaza: one figure at the centre, a ring of twelve around, fine spokes and a circle of threads
  const ring = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.2; const rr = 2.6 + (R() - 0.5) * 0.2;
    ring.push({ pose: [PZ.standRelax, PZ.lookUp, PZ.sitHug, PZ.standRelax][i % 4], pos: [Math.cos(a) * rr, 0, Math.sin(a) * rr], rotY: Math.atan2(-Math.cos(a), -Math.sin(a)) * 180 / Math.PI, core: 1 }); }
  const P = crowd(st, ring, { coreGain: 14, coreSize: 0.04 });
  P.forEach((b, i) => { T.add(reach(F.core, V(0, 0.4, 0), b.core, b.fwd, { k1: 0.3, k2: 0.3, lift: 0.25, n: 50 }), { color: warm, width: 0.012, intensity: 3.2, fadeIn: 0.22 });
    const c = P[(i + 1) % 12]; T.add(reach(b.core, V(0, 0.3, 0), c.core, V(0, 0.3, 0), { k1: 0.25, k2: 0.25, lift: 0.15, n: 30 }), { color: warm, width: 0.012, intensity: 2.8 }); });
  T.add(densify(circlePts(V(0, 0.02, 0), 4.2, 160), 0.2), { color: COL.amber, width: 0.018, intensity: 0.8, fadeIn: 0, fadeOut: 0, halo: 0.5 });
  // the city: neighbourhood clusters, links as roads strung with lamps
  const nodes = [];
  for (let k = 0; k < 3000 && nodes.length < 320; k++) {
    const a = R() * Math.PI * 2, d = 6.2 + Math.pow(R(), 0.8) * 62;
    const p = V(Math.cos(a) * d, 0, Math.sin(a) * d);
    if (Math.abs(p.x * 0.35 + p.z + 11) < 2.0 && d > 9) continue; // a dark river crossing the city
    if (nodes.some(n => n.distanceTo(p) < 2.2 + d * 0.04)) continue;
    nodes.push(p);
  }
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x1e1814, roughness: 0.9 });
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), blockMat, nodes.length * 5); let bi = 0; let hl = 0;
  for (const c of nodes) {
    const d = c.length();
    for (let k = 0; k < 5; k++) { const s2 = 0.35 + R() * 0.5, hh = 0.3 + R() * 1.0; const p = c.clone().add(V((R() - 0.5) * 2.4, hh / 2, (R() - 0.5) * 2.4));
      blocks.setMatrixAt(bi++, new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, R() * 0.3, 0)), V(s2, hh, s2 * (0.7 + R() * 0.6)))); }
    const nL = 70 + Math.floor(R() * 60);
    for (let k = 0; k < nL; k++) { const rr = Math.pow(R(), 0.7) * 2.4, a = R() * 6.28; M.add(c.clone().add(V(Math.cos(a) * rr, 0.1 + R() * 0.6, Math.sin(a) * rr)), mixCol(COL.amber, R() < 0.2 ? COL.hot : COL.fire, R() * 0.6), 0.5 + Math.pow(R(), 3) * 4, 0.028); }
    if (d < 20 && hl < 12) { hl++; st.light(c.clone().add(V(0, 1.5, 0)), COL.amber, 5, { hazeGain: 0.25, radius: 1.2 }); }
    else if (st.hazeLights.length < 185) st.hazeLight(c.clone().add(V(0, 1, 0)), COL.amber, 0.8, 1.5);
  }
  blocks.count = bi; blocks.instanceMatrix.needsUpdate = true; st.scene.add(blocks);
  const road = (a, b, wdt, inten) => {
    const mid = a.clone().lerp(b, 0.5).add(V((R() - 0.5) * 0.6, 0, (R() - 0.5) * 0.6));
    const pts = new THREE.QuadraticBezierCurve3(a.clone().add(V(0, 0.08, 0)), mid.add(V(0, 0.08, 0)), b.clone().add(V(0, 0.08, 0))).getPoints(24);
    T.add(pts, { color: warm, width: wdt, intensity: inten * 0.55, fadeIn: 0.05, fadeOut: 0.05, halo: 0.5 });
    const L = a.distanceTo(b); const nLamp = Math.floor(L / 0.4);
    const curve = new THREE.QuadraticBezierCurve3(pts[0], pts[12], pts[24]);
    for (let k = 1; k < nLamp; k++) M.add(curve.getPointAt(k / nLamp).add(V(0, 0.05, 0)), mixCol(COL.amber, COL.hot, R() * 0.5), 1.6 + R() * 1.4, 0.03);
  };
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [b.distanceTo(a), j]).filter(([dd, j]) => j !== i).sort((x, y) => x[0] - y[0]).slice(0, 3);
    for (const [dd, j] of near) { if (j < i && near.length > 1) continue; road(a, nodes[j], 0.022, 1.1); }
  });
  // the ring holds the city: each ring person joined to the nearest neighbourhood
  P.forEach((b) => { let best = nodes[0], bd = 1e9; for (const n of nodes) { const dd = n.distanceTo(b.pos) - b.pos.clone().normalize().dot(n.clone().normalize()) * 3; if (dd < bd) { bd = dd; best = n; } }
    T.add(reach(b.core, b.pos.clone().normalize().add(V(0, 0.4, 0)).normalize(), best.clone().add(V(0, 0.3, 0)), V(0, 0.3, 0), { k1: 0.3, k2: 0.3, lift: 0.3, n: 50 }), { color: warm, width: 0.014, intensity: 2.2 }); });
  M.build(); T.build();
  st.envFromFx(V(0, 3, 0), { intensity: 0.5 });
  st.render({ time: 0.6 });
}
