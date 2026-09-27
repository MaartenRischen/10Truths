// P14 THE ANSWER — a cold hand of light reaches to smother the red pulse. The figure turns away.
// Its threads are being re-routed by other warm hands, like someone reweaving a net.
import { Stage, THREE, COL, V, figure, Threads, Motes, bez, reach, smooth, mulberry, floor, mixCol, walnut, limbGeometry, lightBodyMaterial, resample } from './lib.js';
import { PZ } from './poses.js';

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 34, exposure: +(q.get('exp') || 1.35), sat: 0.95,
    bloom: { strength: 0.55, radius: 0.5, threshold: 1.0 },
    haze: { density: 0.0009, noise: 0.6, far: 40, scale: 1.4, seed: 14 },
    dof: { focus: 3.6, blurInf: 7, max: 12 }, vignette: 0.74, grain: 0.035,
    mirror: { y: 0, k: 0.3, blur: 7, fade: 10 } });
  const R = mulberry(14);
  walnut().userData.rim.uRimCol.value.set(0x9fe3ff).multiplyScalar(0.25);
  walnut().userData.rim.uRimDir.value.set(-0.7, 0.5, -0.3).normalize();
  floor(st, { color: 0x070605, rough: 0.45, bump: 0.2, clearcoat: 0.4 });

  // the figure turns away (toward the right, away from the cold hand on the left)
  const F = figure(st, { chest: [8, 14, 0], head: [4, 22, -3], lShoulder: [18, 0, 12], lElbow: [-20, 0, 0], rShoulder: [-40, 0, -12], rElbow: [-50, 0, 0], lHip: [10, 0, 3], rHip: [-14, 0, -3], rKnee: [16, 0, 0], lKnee: [6, 0, 0] },
    { pos: [-0.25, 0, 0], rot: [0, 58, 0], coreColor: COL.ember, coreI: 1.2, coreLight: 1.2, coreRange: 0.35 });
  const M = new Motes(st, { minPx: 1 });
  M.add(F.core.clone().addScaledVector(F.fwd, 0.02), COL.ember, 6, 0.03); M.add(F.core.clone().addScaledVector(F.fwd, 0.02), COL.ember, 0.8, 0.12);
  st.light(F.core.clone().addScaledVector(F.fwd, 0.1), COL.ember, 0.7, { hazeGain: 1.5, radius: 0.06 });

  // the cold hand of light, huge, from the upper left, reaching for the chest
  const arm = limbGeometry({ rShoulder: [-96, 0, -6], rElbow: [-12, 0, 0], rWrist: [-18, 0, 0] }, 'rShoulder');
  const S = 2.5; const handTarget = F.core.clone().add(V(-0.42, 0.14, 0.1));
  const armMesh = new THREE.Mesh(arm.geo, lightBodyMaterial(COL.cyan, { core: 0.06, rim: 1.7, pow: 2.0 }));
  armMesh.scale.setScalar(S);
  // orient: arm reaches along +z in its own space (shoulder raised forward); rotate so it points from upper-left toward the chest
  const dirW = handTarget.clone().sub(V(-3.2, 3.6, 1.2)).normalize();
  const q0 = new THREE.Quaternion().setFromUnitVectors(arm.tip.clone().sub(arm.base).normalize(), dirW);
  armMesh.quaternion.copy(q0);
  const tipW = arm.tip.clone().multiplyScalar(S).applyQuaternion(q0);
  armMesh.position.copy(handTarget.clone().sub(tipW));
  st.fx.add(armMesh);
  for (const k of [0.2, 0.5, 0.8]) { const p = armMesh.position.clone().lerp(handTarget, k + 0.1); st.light(p, COL.cyan, 1.4, { hazeGain: 0.6, radius: 0.3 }); }

  // warm hands on the right, reweaving: figures just off frame, reaching in
  const helpers = [
    figure(st, { rShoulder: [-72, 0, -10], rElbow: [-20, 0, 0], lShoulder: [-40, 0, 20], lElbow: [-50, 0, 0], chest: [14, 0, 0], head: [10, 0, 0] }, { pos: [2.55, 0, -0.7], rot: [0, -112, 0], coreI: 1.0, coreLight: 1.0, coreRange: 0.4 }),
    figure(st, { lShoulder: [-80, 0, 12], lElbow: [-24, 0, 0], rShoulder: [-60, 0, -14], rElbow: [-40, 0, 0], chest: [18, 0, 0], head: [16, 0, 0] }, { pos: [2.45, 0, 0.95], rot: [0, -72, 0], coreI: 1.0, coreLight: 1.0, coreRange: 0.4 }),
  ];
  const hands = [ helpers[0].m.joints.rWrist.localToWorld(V(0, -0.12, 0)), helpers[0].m.joints.lWrist.localToWorld(V(0, -0.12, 0)),
                  helpers[1].m.joints.lWrist.localToWorld(V(0, -0.12, 0)), helpers[1].m.joints.rWrist.localToWorld(V(0, -0.12, 0)) ];
  const T = new Threads(st, { minPx: 1.1, haloMul: 7, haloGain: 0.12 });
  const warm = (u) => mixCol(COL.hot, COL.amber, 0.3 + 0.5 * u);
  // the figure's threads, held and re-routed by the hands (from the chest to each hand, then on to the helpers' chests)
  const knots = [];
  hands.forEach((hp, i) => {
    const pts = reach(F.core, F.fwd.clone(), hp, null, { k1: 0.3, lift: 0.1 + i * 0.06, n: 80 });
    T.add(pts, { color: (u) => mixCol(COL.ember, COL.amber, smooth(0.0, 0.35, u)), width: 0.004, intensity: 6, fadeIn: 0.02 });
    const hc = helpers[i < 2 ? 0 : 1];
    T.add(reach(hp, V(0.3, 0.4, 0).normalize(), hc.core, hc.fwd, { k1: 0.3, k2: 0.3, lift: 0.15, n: 50 }), { color: warm, width: 0.004, intensity: 5, fadeIn: 0 });
    knots.push(pts[40]);
    st.light(hp.clone().add(V(0, 0.05, 0.05)), COL.amber, 0.5, { hazeGain: 0.8, radius: 0.05 });
  });
  // the net: cross-threads knotted between the re-routed threads
  for (let i = 0; i < knots.length; i++) for (let j = i + 1; j < knots.length; j++) {
    const a = knots[i], b = knots[j]; T.add(bez(a, a.clone().lerp(b, 0.3).add(V(0, -0.05, 0)), a.clone().lerp(b, 0.7).add(V(0, -0.05, 0)), b, 30), { color: COL.amber, width: 0.003, intensity: 4, fadeIn: 0, fadeOut: 0 });
    M.add(a, COL.hot, 3, 0.012);
  }
  M.build(); T.build();
  st.envFromFx(V(0.4, 1.5, 1.5), { intensity: 0.5 });
  st.look(V(-0.2, 1.55, 4.0), V(0.35, 1.42, 0), 34);
  st.render({ time: 0.2 });
}
