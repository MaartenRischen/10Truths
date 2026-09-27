// P07 TUNED DRIVES — threads doing what drives do, staged across the camp at night:
// grief (a thread landing on a mound, fading), touch (hands meeting, threads fused), reciprocity (a spark travelling),
// jealousy (a third figure's thread tensing), shame (threads dimming as a figure looks down).
import { Stage, THREE, COL, V, figure, Threads, Motes, bez, reach, smooth, mulberry, floor, fire, mixCol, walnut, noiseTexture, resample } from './lib.js';
import { PZ } from './poses.js';
import { POSES } from '../../mannequin.js';

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 42, exposure: +(q.get('exp') || 1.75), sat: 0.93,
    bloom: { strength: 0.45, radius: 0.45, threshold: 1.1 },
    haze: { density: 0.0006, noise: 0.5, far: 60, height: 2.5, scale: 1.5, seed: 17 },
    dof: { focus: 4.6, blurInf: 6, max: 10 }, vignette: 0.74, grain: 0.034 });
  const R = mulberry(71);
  walnut().userData.rim.uRimCol.value.set(0xa9bfd8).multiplyScalar(0.08);
  const moon = new THREE.DirectionalLight(0x7f95c0, 0.12); moon.position.set(-4, 8, -6); st.scene.add(moon);
  const gmap = noiseTexture({ seed: 31, scale: 5, contrast: 1.2, size: 512, bias: 0.16 }); gmap.repeat.set(30, 30); gmap.colorSpace = THREE.SRGBColorSpace;
  const gr = floor(st, { color: 0x857868, rough: 0.95, bump: 1.4, repeat: 70 }); gr.material.map = gmap; gr.material.specularIntensity = 0.25; gr.material.needsUpdate = true;
  st.look(V(0.1, 1.35, 6.4), V(0.3, 0.95, -2), 42);
  fire(st, V(-0.25, 0, -6.4), { scale: 0.95, gain: 1.5, lightI: 22, sparks: 40, seed: 5, hazeGain: 0.12 });
  for (const p of [V(-2.5, 1.6, 0.5), V(0.4, 1.8, 2.2), V(-3, 1.5, -3)]) st.light(p, COL.amber, 1.4, { haze: false });
  const T = new Threads(st, { minPx: 1.1, haloMul: 7, haloGain: 0.12 });
  const M = new Motes(st, { minPx: 1.0 });
  const warm = (u) => mixCol(COL.hot, COL.amber, 0.35 + 0.65 * Math.sin(Math.PI * u));

  // GRIEF (left foreground): kneeling at a mound; the thread lands on the mound and fades into embers
  const G = figure(st, POSES.kneelGrief, { pos: [-1.95, 0, 2.3], rot: [0, 68, 0], coreI: 0.8, coreLight: 1.0, coreRange: 0.4 });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a5846, roughness: 1 }));
  mound.scale.set(1.25, 0.34, 0.62); mound.position.set(-1.05, 0, 2.45); mound.rotation.y = 0.5; st.scene.add(mound);
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.8 });
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const st2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05 + R() * 0.03, 1), stoneM); st2.position.set(-1.05 + Math.cos(a) * 0.62, 0.03, 2.45 + Math.sin(a) * 0.36); st.scene.add(st2); }
  const mTop = V(-1.05, 0.17, 2.45);
  T.add(bez(G.core, G.core.clone().addScaledVector(G.fwd, 0.35), mTop.clone().add(V(-0.1, 0.35, 0)), mTop, 60), { color: warm, width: 0.004, intensity: 5, alongFn: (u) => 1 - 0.75 * smooth(0.5, 1, u) });
  for (let i = 0; i < 26; i++) M.add(mTop.clone().add(V((R() - 0.5) * 0.7, R() * 0.12, (R() - 0.5) * 0.35)), mixCol(COL.amber, COL.fire, R()), 0.6 + R() * 1.5, 0.006);
  st.light(mTop.clone().add(V(0, 0.2, 0)), COL.amber, 0.5, { hazeGain: 1, radius: 0.1 });

  // TOUCH (centre): two seated figures, hands meeting, threads running down the arms and fusing at the touch
  const A = figure(st, { lHip: [-86, 0, 9], rHip: [-86, 0, -9], lKnee: [84, 0, 0], rKnee: [84, 0, 0], chest: [10, 0, 0], head: [8, 0, 0], rShoulder: [-58, 0, -20], rElbow: [-18, 0, 0], lShoulder: [-30, 0, 8], lElbow: [-50, 0, 0] },
    { pos: [-0.35, 0, 0.1], rot: [0, 75, 0], coreI: 1, coreLight: 1, coreRange: 0.4 });
  const B = figure(st, { lHip: [-86, 0, 9], rHip: [-86, 0, -9], lKnee: [84, 0, 0], rKnee: [84, 0, 0], chest: [10, 0, 0], head: [10, 0, 0], lShoulder: [-58, 0, 20], lElbow: [-18, 0, 0], rShoulder: [-30, 0, -8], rElbow: [-50, 0, 0] },
    { pos: [1.05, 0, 0.25], rot: [0, -100, 0], coreI: 1, coreLight: 1, coreRange: 0.4 });
  const logMat = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
  for (const [x, z, ry] of [[-0.45, 0.1, 75], [1.15, 0.25, -100]]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.8, 12), logMat); lg.position.set(x, 0.35, z); lg.rotation.set(0, ry * Math.PI / 180, Math.PI / 2, 'YXZ'); st.scene.add(lg); }
  const hA = A.m.joints.rWrist.localToWorld(V(0, -0.12, 0)), hB = B.m.joints.lWrist.localToWorld(V(0, -0.12, 0));
  const touch = hA.clone().lerp(hB, 0.5);
  T.add(resample([A.core, A.core.clone().addScaledVector(A.fwd, 0.1), A.m.joints.rElbow.localToWorld(V(0, 0, 0.05)), touch], 60), { color: warm, width: 0.0045, intensity: 6 });
  T.add(resample([B.core, B.core.clone().addScaledVector(B.fwd, 0.1), B.m.joints.lElbow.localToWorld(V(0, 0, 0.05)), touch], 60), { color: warm, width: 0.0045, intensity: 6 });
  M.add(touch, COL.hot, 14, 0.02); M.add(touch, COL.amber, 1.4, 0.09);
  st.light(touch.clone().add(V(0, 0.08, 0.1)), COL.amber, 1.2, { hazeGain: 1.2, radius: 0.05 });

  // RECIPROCITY (right): two standing figures, a spark travelling along the thread between them
  const C = figure(st, { rShoulder: [-44, 0, -10], rElbow: [-40, 0, 0], chest: [6, 0, 0], head: [4, 0, 0] }, { pos: [2.5, 0, -0.9], rot: [0, 40, 0], coreI: 1, coreLight: 0.8, coreRange: 0.4 });
  const D = figure(st, { lShoulder: [-40, 0, 12], lElbow: [-46, 0, 0], chest: [8, 0, 0], head: [6, 0, 0] }, { pos: [3.9, 0, -0.3], rot: [0, -110, 0], coreI: 1, coreLight: 0.8, coreRange: 0.4 });
  const cd = reach(C.core, C.fwd, D.core, D.fwd, { k1: 0.3, k2: 0.3, lift: 0.3, n: 90 });
  const sparkU = 0.58;
  T.add(cd, { color: warm, width: 0.004, intensity: 4.5, alongFn: (u) => 1 + 6 * Math.exp(-Math.pow((u - sparkU) / 0.025, 2)) });
  const sp = new THREE.CatmullRomCurve3(cd).getPointAt(sparkU); M.add(sp, COL.hot, 12, 0.02); M.add(sp, COL.amber, 1, 0.08);
  st.light(sp, COL.amber, 0.8, { hazeGain: 1.2, radius: 0.06 });

  // JEALOUSY (background left): a couple joined; a third figure's thread strains taut toward them, reddening
  const E = figure(st, PZ.sitHug, { pos: [-2.6, 0, -3.4], rot: [0, 40, 0], coreI: 1, coreLight: 0.8, coreRange: 0.4 });
  const Fg = figure(st, PZ.sitHug, { pos: [-1.8, 0, -3.1], rot: [0, -50, 0], coreI: 1, coreLight: 0.8, coreRange: 0.4 });
  T.add(reach(E.core, E.fwd, Fg.core, Fg.fwd, { k1: 0.3, k2: 0.3, lift: 0.15, n: 40 }), { color: warm, width: 0.004, intensity: 5 });
  const J = figure(st, { chest: [-4, -20, 0], head: [-6, -30, 0], lShoulder: [-10, 0, 10], rShoulder: [-20, 0, -14], rElbow: [-30, 0, 0] }, { pos: [-4.4, 0, -4.4], rot: [0, 70, 0], coreI: 0.9, coreLight: 0.8, coreRange: 0.4 });
  const mid = E.core.clone().lerp(Fg.core, 0.5).add(V(0, 0.12, 0));
  T.add([J.core, J.core.clone().lerp(mid, 0.5), mid].map(p => p.clone()), { color: (u) => mixCol(COL.amber, COL.ember, 0.3 + 0.5 * u), width: 0.003, intensity: 5, alongFn: (u) => 0.8 + 0.4 * Math.sin(u * 60) });

  // SHAME (background right): a figure apart, head down, its threads dimming
  const S = figure(st, POSES.headInHands, { pos: [4.2, 0, -3.6], rot: [0, -50, 0], coreI: 0.35, coreLight: 0.5, coreRange: 0.35 });
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.7, 12), logMat); seat.position.set(4.3, 0.35, -3.72); seat.rotation.set(0, -50 * Math.PI / 180, Math.PI / 2, 'YXZ'); st.scene.add(seat);
  for (let k = 0; k < 2; k++) { const end = S.core.clone().add(V(-0.6 - k * 0.5, 0.3 + k * 0.2, 0.4 + k * 0.3));
    T.add(bez(S.core, S.core.clone().addScaledVector(S.fwd, 0.2), end.clone().add(V(0.2, 0.1, 0)), end, 40), { color: warm, width: 0.003, intensity: 1.4, fadeIn: 0.05, fadeOut: 0.6 }); }
  M.build(); T.build();
  st.envFromFx(V(0.4, 1.4, 1.5), { intensity: 0.4 });
  st.render({ time: 0.3 });
}
