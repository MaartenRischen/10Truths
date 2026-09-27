// P03 HOW WE FEEL — several figures far apart in the void; each one's threads are cut short, flickering stubs.
// Above them, three thin lines of light rise like graphs.
import { Stage, THREE, COL, V, figure, Threads, Motes, bez, smooth, mulberry, floor, mixCol, walnut, densify } from './lib.js';
import { PZ } from './poses.js';
import { POSES } from '../../mannequin.js';

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 40, exposure: +(q.get('exp') || 1.45), sat: 0.9,
    bloom: { strength: 0.5, radius: 0.5, threshold: 1.0 },
    haze: { density: 0.0009, noise: 0.6, far: 80, scale: 1.2, seed: 5 },
    dof: { focus: 5.2, blurInf: 5, max: 9 }, vignette: 0.72, grain: 0.036,
    mirror: { y: 0, k: 0.3, blur: 8, fade: 10 } });
  const R = mulberry(12);
  walnut().userData.rim.uRimCol.value.set(0xb0c4dc).multiplyScalar(0.35);
  floor(st, { color: 0x060606, rough: 0.4, bump: 0.2, clearcoat: 0.5, ccRough: 0.3 });
  st.look(V(0.6, 1.05, 4.6), V(-0.2, 2.3, -8), 40);

  const people = [
    { pose: PZ.standBow, pos: [-1.7, 0, 0.6], rot: 35 },
    { pose: PZ.sitHug, pos: [-0.9, 0, -5.0], rot: 10 },
    { pose: PZ.selfHold, pos: [2.2, 0, -2.2], rot: -25 },
    { pose: POSES.headInHands, pos: [5.6, 0, -7.5], rot: -40, seat: true },
    { pose: PZ.standBow, pos: [-6.8, 0, -9.5], rot: 50 },
    { pose: PZ.lookUp, pos: [0.9, 0, -12], rot: 0 },
    { pose: POSES.slump, pos: [-2.4, 0, -17], rot: 20 },
  ];
  const T = new Threads(st, { minPx: 1.1, haloMul: 6, haloGain: 0.12 });
  const M = new Motes(st, { minPx: 1.2 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.6 });
  const figs = people.map((p) => {
    const F = figure(st, p.pose, { pos: p.pos, rot: [0, p.rot, 0], coreI: 0.7, coreLight: 1.0, coreRange: 0.45 });
    if (p.seat) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.44, 0.45), seatMat); b.position.set(p.pos[0], 0.22, p.pos[2] - 0.12); b.rotation.y = p.rot * Math.PI / 180; st.scene.add(b); }
    return F;
  });
  figs.forEach((F, i) => {
    // aim at the two nearest others; reach a fraction of the gap, then break off
    const others = figs.map((G, j) => [G.core.distanceTo(F.core), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 2);
    others.forEach(([d, j], k) => {
      const G = figs[j]; const frac = 0.16 + R() * 0.14;
      const dir = G.core.clone().sub(F.core).normalize();
      const end = F.core.clone().lerp(G.core, frac).add(V(0, 0.15 + d * 0.04, 0));
      const pts = bez(F.core, F.core.clone().addScaledVector(F.fwd, 0.15).addScaledVector(dir, 0.1), end.clone().addScaledVector(dir, -d * frac * 0.35).add(V(0, 0.12, 0)), end, 50);
      const ph = R() * 50, fr = 30 + R() * 20;
      T.add(pts, { color: (u) => mixCol(COL.amber, new THREE.Color(0.6, 0.48, 0.4), smooth(0.35, 1, u)), width: 0.0045, intensity: 6,
        fadeIn: 0.03, fadeOut: 0.1, alongFn: (u) => (u < 0.4 || Math.sin(u * fr + ph) > -0.4 ? 1 : 0.06) * (0.75 + 0.25 * Math.sin(u * 7 + ph)) });
      M.add(end, COL.hot, 3.5, 0.008);
      for (let f = 0; f < 4; f++) { const e2 = end.clone().addScaledVector(dir, 0.02 + R() * 0.05).add(V((R() - 0.5) * 0.06, -0.02 - R() * 0.05, (R() - 0.5) * 0.06));
        T.add([end, end.clone().lerp(e2, 0.5), e2], { color: new THREE.Color(0.7, 0.55, 0.42), width: 0.0012, intensity: 1.6, fadeIn: 0, fadeOut: 0.8, halo: 0.2 }); }
      for (let e = 0; e < 5; e++) M.add(end.clone().add(V((R() - 0.5) * 0.08, -0.05 - R() * 0.5, (R() - 0.5) * 0.08)), mixCol(COL.fire, COL.amber, R()), 0.6 + R() * 1.2, 0.004); // embers dropping
      st.hazeLight(F.core.clone().lerp(end, 0.4), COL.amber, 0.08, 0.1);
    });
  });
  // three thin lines of light rising like graphs, high above
  const graphs = [
    { col: new THREE.Color(0.85, 0.92, 1.0), y0: 8.4, rise: 5.5, seed: 3 },
    { col: new THREE.Color(1.0, 0.55, 0.45), y0: 7.3, rise: 6.5, seed: 7 },
    { col: new THREE.Color(1.0, 0.82, 0.55), y0: 6.3, rise: 5.0, seed: 11 },
  ];
  for (const g of graphs) {
    const r = mulberry(g.seed); const pts = []; const N = 26;
    for (let i = 0; i <= N; i++) { const t = i / N; const x = -26 + t * 52; const y = g.y0 + g.rise * Math.pow(t, 1.35) + (r() - 0.5) * 0.9 + Math.sin(t * 17 + g.seed) * 0.25; pts.push(V(x, y, -24 - t * 4)); }
    T.add(densify(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2).getPoints(300), 0.1), { color: g.col, width: 0.03, intensity: 2.2, fadeIn: 0.15, fadeOut: 0.0, halo: 0.6 });
    M.add(pts[pts.length - 1], g.col, 10, 0.1);
    for (let i = 4; i < pts.length; i += 7) st.hazeLight(pts[i], g.col, 1.2, 0.8);
  }
  M.build(); T.build();
  st.envFromFx(V(0, 3, 0), { intensity: 0.4 });
  st.render({ time: 0.3 });
}
