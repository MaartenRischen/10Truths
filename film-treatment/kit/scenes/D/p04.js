// P04 SELF-BLAME — the figure's own thread wraps around its own chest, tight. Behind it a cold grid of light tilts, out of focus.
import { Stage, THREE, COL, V, figure, Threads, Motes, bez, smooth, mulberry, floor, mixCol, walnut, resample } from './lib.js';
import { PZ } from './poses.js';

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 30, exposure: +(q.get('exp') || 1.3), sat: 0.92,
    bloom: { strength: 0.55, radius: 0.45, threshold: 1.0 },
    haze: { density: 0.0008, noise: 0.6, far: 60, scale: 1.4, seed: 8 },
    dof: { focus: 3.35, blurInf: +(q.get('bi') || 18), max: 24 }, vignette: 0.75, grain: 0.035,
    mirror: { y: 0, k: 0.18, blur: 8, fade: 8 } });
  const R = mulberry(4);
  walnut().userData.rim.uRimCol.value.set(0xa9c8e8).multiplyScalar(0.3);
  walnut().userData.rim.uRimDir.value.set(0.6, 0.5, -0.4).normalize();
  floor(st, { color: 0x060606, rough: 0.45, bump: 0.2, clearcoat: 0.4 });

  const F = figure(st, PZ.selfHold, { pos: [0, 0, 0], rot: [0, 22, 0], coreI: 0.9, coreLight: 0.7, coreRange: 0.3 });
  const chest = F.m.joints.chest; const pel = F.m.joints.pelvis;
  // the binding: a tight helix around torso and crossed arms, from the core, ending back into the core
  const axisBot = pel.localToWorld(V(0, 0.2, 0)), axisTop = chest.localToWorld(V(0, 0.4, 0));
  const ax = axisTop.clone().sub(axisBot); const L = ax.length(); ax.normalize();
  const fwdF = F.fwd.clone().addScaledVector(ax, -F.fwd.dot(ax)).normalize(); const sideF = ax.clone().cross(fwdF).normalize();
  const turns = 5.2, N = 520; const helix = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N; const a = t * turns * Math.PI * 2;
    const y = 0.08 + t * 0.86; // along the axis fraction
    const rx = 0.23 + 0.03 * Math.sin(t * 40), rz = 0.2 + 0.03 * Math.cos(t * 33);
    helix.push(axisBot.clone().addScaledVector(ax, y * L).addScaledVector(fwdF, Math.cos(a) * rz).addScaledVector(sideF, Math.sin(a) * rx));
  }
  const path = [F.core, F.core.clone().addScaledVector(F.fwd, 0.1), ...helix, F.core.clone().addScaledVector(F.fwd, 0.08).add(V(0, 0.03, 0)), F.core.clone().add(V(0, 0.01, 0))];
  const pts = resample(path, 900);
  const T = new Threads(st, { minPx: 1.2, haloMul: 6, haloGain: 0.14 });
  T.add(pts, { color: (u) => mixCol(COL.amber, COL.ember, 0.35 + 0.35 * Math.sin(u * 30)), width: 0.0038, intensity: 5, fadeIn: 0.0 });
  // lights around the wraps (in front and behind the body)
  for (let i = 0; i < 12; i++) { const p = pts[Math.floor((i + 0.5) / 12 * pts.length)]; st.light(p, mixCol(COL.amber, COL.ember, 0.4), 0.16, { hazeGain: 0.6, radius: 0.05, distance: 0.6 }); }
  // cold grid behind, tilted, out of focus
  const G = new Threads(st, { minPx: 1.0, haloGain: 0.0, sharp: 1.4 });
  const gq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0.35, 0.42));
  const gc = V(2.0, 5.5, -16);
  const addLine = (a, b) => { const pts = []; for (let k = 0; k <= 30; k++) pts.push(a.clone().lerp(b, k / 30));
    G.add(pts, { color: COL.cyan, width: 0.16, intensity: 0.26, fadeIn: 0.25, fadeOut: 0.25, halo: 0, alongFn: (u) => smooth(0.3, 3.0, pts[Math.round(u * 30)].y) }); };
  for (let i = -12; i <= 12; i++) {
    addLine(V(i * 0.8, -10, 0).applyQuaternion(gq).add(gc), V(i * 0.8, 10, 0).applyQuaternion(gq).add(gc));
    addLine(V(-10, i * 0.8, 0).applyQuaternion(gq).add(gc), V(10, i * 0.8, 0).applyQuaternion(gq).add(gc));
  }
  G.build(); T.build();
  st.hazeLight(gc, COL.cyan, 6, 3);
  st.envFromFx(V(0, 1.4, 1.2), { intensity: 0.45 });
  st.look(V(-0.9, 1.5, 3.3), V(-0.55, 1.3, 0), 30);
  st.render({ time: 0.4 });
}
