// P11 IT IS EVERYTHING — cyan threads from the figure to cold objects made of light (star rating, empty bed, chair,
// bright window at night, wall of breaking news, endless scrolling column, candy bar), none landing, all coiling back
// around the figure into a flickering cocoon.
import { Stage, THREE, COL, V, figure, Threads, Motes, bez, smooth, mulberry, floor, mixCol, walnut, outline, densify, resample, panel } from './lib.js';
import { bed, chair, windowFrame, rating, newsWall, scrollColumn, candyBar, place } from './props.js';
import { PZ } from './poses.js';

export function cocoon(st, T, F, { turns = 14, seed = 5, intensity = 1.5, rx = 0.5, rz = 0.44, y0 = 0.05, y1 = 2.25, flicker = true, strands = 7 } = {}) {
  const R = mulberry(seed); const c = F.pos.clone();
  const N = 2400; const pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N; const y = y0 + (y1 - y0) * t; const bulge = Math.sin(Math.PI * Math.pow(t, 0.9));
    const a = t * turns * Math.PI * 2 + Math.sin(t * 13) * 0.4; const wob = 1 + 0.05 * Math.sin(t * 23 + 1.3) + 0.02 * Math.sin(t * 57);
    pts.push(V(c.x + Math.cos(a) * rx * (0.35 + 0.75 * bulge) * wob, y, c.z + Math.sin(a) * rz * (0.35 + 0.75 * bulge) * wob)); }
  const segs = strands; // several overlapping loose strands
  for (let s = 0; s < segs; s++) {
    const off = s * (Math.PI * 2 / segs) + R() * 0.3; const rot = new THREE.Matrix4().makeRotationY(off);
    const sc = 1 + (R() - 0.5) * 0.14, dy = (R() - 0.5) * 0.06; const sp = pts.map(p => p.clone().sub(c).applyMatrix4(rot).multiplyScalar(sc).add(c).add(V(0, dy, 0)));
    const ph = R() * 100, fr = 25 + R() * 30;
    T.add(sp, { color: (u) => mixCol(COL.cyan, new THREE.Color(1, 1, 1), 0.25 + 0.25 * Math.sin(u * 40 + ph)), width: 0.003, intensity: intensity * 1.5 * (0.6 + R() * 0.6), fadeIn: 0.01, fadeOut: 0.01, halo: 0.4,
      alongFn: flicker ? (u) => (Math.sin(u * fr + ph) > -0.6 ? 1 : 0.05) * (0.6 + 0.6 * Math.pow(Math.max(0, Math.sin(u * 7.3 + ph * 2)), 6)) : null });
  }
  for (let k = 0; k < 8; k++) { const t = (k + 0.5) / 8; st.light(V(c.x + Math.cos(k * 2.4) * rx, y0 + (y1 - y0) * t, c.z + Math.sin(k * 2.4) * rz), COL.cyan, 0.3, { hazeGain: 0.35, radius: 0.2 }); }
}

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 40, exposure: +(q.get('exp') || 1.3), sat: 0.95,
    bloom: { strength: 0.55, radius: 0.5, threshold: 1.0 },
    haze: { density: 0.0005, noise: 0.6, far: 60, scale: 1.4, seed: 21 },
    dof: { focus: 6.4, blurInf: 5, max: 10 }, vignette: 0.72, grain: 0.035, ca: 0.4,
    mirror: { y: 0, k: 0.5, blur: 6, fade: 18 } });
  const R = mulberry(17);
  walnut().userData.rim.uRimCol.value.set(0x9fe3ff).multiplyScalar(0.4);
  floor(st, { color: 0x050607, rough: 0.4, bump: 0.2, clearcoat: 0.5, ccRough: 0.3 });
  st.look(V(0.2, 1.55, 6.4), V(0, 1.45, -1), 40);

  const F = figure(st, PZ.selfHold, { pos: [0, 0, 0], rot: [0, 8, 0], coreColor: COL.cyan, coreI: 0.8, coreLight: 0.8, coreRange: 0.35 });
  const T = new Threads(st, { minPx: 1.0, haloMul: 6, haloGain: 0.12 });
  cocoon(st, T, F, {});
  // the objects, placed by screen position and depth
  const floorAt = (sx, sy, d) => { const p = st.at(sx, sy, d); p.y = 0; return p; };
  const faceCam = (p) => Math.atan2(st.camera.position.x - p.x, st.camera.position.z - p.z);
  const obj = [];
  const cold = mixCol(COL.cyan, new THREE.Color(1, 1, 1), 0.2);
  const addObj = (polys, anchor, opts = {}) => { outline(T, polys, { color: cold, width: opts.width ?? 0.012, intensity: opts.i ?? 2.2, seg: 0.05, halo: 0.6 }); obj.push(anchor); st.hazeLight(anchor, COL.cyan, opts.haze ?? 0.4, 0.4); };
  { const p = floorAt(0.17, 0.8, 7.5); addObj(place(bed(1.5, 2.0, 0.5), { pos: p, rotY: faceCam(p) + 0.9 }), p.clone().add(V(0, 0.5, 0))); }
  { const p = floorAt(0.36, 0.73, 10.5); addObj(place(chair(), { pos: p, rotY: faceCam(p) - 0.5, scale: 1.3 }), p.clone().add(V(0, 0.6, 0))); }
  { const p = st.at(0.3, 0.27, 12); addObj(place(windowFrame(1.3, 1.7), { pos: p, rotY: faceCam(p) }), p, { i: 2.6 });
    panel(st, { w: 1.3, h: 1.7, pos: p.clone().add(V(0, 0, -0.03)), rotY: faceCam(p), color: new THREE.Color(0.7, 0.9, 1.0), gain: 1.1 }); st.hazeLight(p, COL.cyan, 1.5, 0.8); }
  { const p = st.at(0.62, 0.26, 12.5); addObj(place(newsWall(3, 3, 0.95, 0.56, 0.1, 7), { pos: p, rotY: faceCam(p) - 0.25 }), p, { i: 2.0, width: 0.01 }); }
  { const p = floorAt(0.86, 0.9, 9); addObj(place(scrollColumn(16, 0.8, 1.0, 0.12), { pos: p.clone().add(V(0, 0.6, 0)), rotY: faceCam(p) - 0.4 }), p.clone().add(V(0, 2.2, 0)), { i: 1.8, width: 0.01 }); }
  { const p = st.at(0.73, 0.62, 6.0); addObj(place(rating(5, 2, 0.14, 0.34), { pos: p, rotY: faceCam(p) }), p, { i: 3.0, width: 0.008 }); }
  { const p = st.at(0.12, 0.44, 6.4); addObj(place(candyBar(0.9, 0.26, 0.08), { pos: p, rotY: faceCam(p) + 0.3, rotZ: 0.4 }), p, { i: 2.6, width: 0.008 }); }
  // threads from the cocoon toward each object: they stop short, then curl back toward the figure
  for (const a of obj) {
    for (let k = 0; k < 3; k++) {
      const start = F.core.clone().add(V((R() - 0.5) * 0.3, (R() - 0.5) * 0.5, 0.1));
      const dir = a.clone().sub(start); const d = dir.length(); dir.normalize();
      const stop = start.clone().addScaledVector(dir, d * (0.55 + R() * 0.25));
      const back = stop.clone().lerp(F.core, 0.35).add(V((R() - 0.5) * 0.6, 0.4 + R() * 0.5, (R() - 0.5) * 0.6));
      const pts = resample([start, start.clone().lerp(stop, 0.4).add(V(0, 0.25, 0)), stop, stop.clone().lerp(back, 0.5).add(V(0, 0.15, 0)), back], 120);
      const ph = R() * 30;
      T.add(pts, { color: cold, width: 0.003, intensity: 2.0, fadeIn: 0.04, fadeOut: 0.35, halo: 0.4, alongFn: (u) => (Math.sin(u * 50 + ph) > -0.7 ? 1 : 0.1) });
    }
  }
  T.build();
  st.light(F.core.clone().add(V(0.6, 0.4, 1.0)), COL.cyan, 0.8, { haze: false });
  st.envFromFx(V(0, 1.4, 1.5), { intensity: 0.6 });
  st.render({ time: 0.3 });
}
