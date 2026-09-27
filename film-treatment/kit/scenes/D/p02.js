// P02 NOT ANTI-TECH — the figure holds a stone tool; a warm thread runs from its hand into the tool,
// and on through ghosted technologies (a lamp, a lens, a chip). The thread stays warm.
import { Stage, THREE, COL, V, figure, Threads, Motes, reach, bez, smooth, mulberry, floor, mixCol, walnut, outline, densify, resample } from './lib.js';
import { bulb, bulbFilament, lens, chip, place } from './props.js';

function handAxe(stage, pos, quat, scale = 1) {
  // knapped flint hand axe: faceted teardrop
  const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position; const r = (i) => Math.sin(i * 12.9898) * 43758.5453 % 1;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + 1) / 2; const wv = 0.62 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9);
    const k = 1 + 0.08 * Math.abs(r(i));
    p.setXYZ(i, x * wv * k, y * 1.0, z * 0.2 * wv * 1.6 * k); }
  g.computeVertexNormals(); const flat = g.toNonIndexed(); flat.computeVertexNormals();
  const m = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.88, flatShading: true }));
  m.scale.setScalar(0.1 * scale); m.position.copy(pos); m.quaternion.copy(quat); stage.scene.add(m); return m;
}

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 32, exposure: +(q.get('exp') || 1.35), sat: 0.92,
    bloom: { strength: 0.5, radius: 0.45, threshold: 1.0 },
    haze: { density: 0.0007, noise: 0.6, far: 60, scale: 1.5, seed: 9 },
    dof: { focus: 3.3, blurInf: 5, max: 9 }, vignette: 0.72, grain: 0.034,
    mirror: { y: 0, k: 0.25, blur: 7, fade: 10 } });
  walnut().userData.rim.uRimCol.value.set(0xffd2a0).multiplyScalar(0.08);
  floor(st, { color: 0x080706, rough: 0.45, bump: 0.3, clearcoat: 0.4, ccRough: 0.35 });

  st.look(V(-0.4, 1.3, 3.1), V(0.3, 1.1, -1.0), 38);
  // kneeling, holding the axe up to look at it
  const F = figure(st, { lHip: [-8, 0, 3], rHip: [-72, 0, -4], lKnee: [118, 0, 0], rKnee: [84, 0, 0], lAnkle: [40, 0, 0], chest: [14, 0, 0], head: [16, -8, 0],
    rShoulder: [-72, 18, -6], rElbow: [-58, 0, 0], rWrist: [-10, -60, 0], lShoulder: [-30, 0, 12], lElbow: [-40, 0, 0] },
    { pos: [-0.95, 0, 0.55], rot: [0, 58, 0], coreI: 1.0, coreLight: 1.0, coreRange: 0.3 });
  const hand = F.m.joints.rWrist.localToWorld(V(0, -0.1, 0.03));
  const handUp = F.m.joints.rWrist.localToWorld(V(0, -0.3, 0.03)).sub(hand).normalize();
  const axePos = F.m.joints.rWrist.localToWorld(V(0, -0.2, 0.02));
  const axeQ = new THREE.Quaternion(); F.m.joints.rWrist.getWorldQuaternion(axeQ);
  axeQ.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)));
  const axe = handAxe(st, axePos, axeQ, 1.35);
  const axeTip = axePos.clone().add(V(0, 1, 0).applyQuaternion(axeQ).multiplyScalar(0.11));

  const T = new Threads(st, { minPx: 1.2, haloMul: 7, haloGain: 0.11 });
  const warm = (u) => mixCol(COL.hot, COL.amber, 0.4 + 0.3 * Math.sin(u * 9));
  // chest -> along the arm -> the hand
  const elbow = F.m.joints.rElbow.localToWorld(V(0.03, 0, 0.04));
  const toHand = resample([F.core, F.core.clone().addScaledVector(F.fwd, 0.08).add(V(0, -0.02, 0)), elbow.clone().add(V(0, 0.05, 0)), hand], 60);
  T.add(toHand, { color: warm, width: 0.004, intensity: 7, fadeIn: 0.03 });
  // the axe glows along its edge (the thread wraps its outline)
  const edge = []; for (let i = 0; i <= 40; i++) { const t = i / 40; const yy = -1 + 2 * t; const wv = 0.62 * Math.pow(Math.sin(Math.PI * Math.pow((yy + 1) / 2, 0.75)), 0.9); edge.push(V(wv * 1.02, yy, 0)); }
  const edge2 = edge.map(p => V(-p.x, p.y, 0)).reverse();
  const axeOutline = [...edge, ...edge2].map(p => p.multiplyScalar(0.1 * 1.35).applyQuaternion(axeQ).add(axePos));
  T.add(axeOutline, { color: COL.amber, width: 0.0025, intensity: 5, fadeIn: 0, fadeOut: 0, halo: 0.6 });
  st.light(axePos.clone().add(V(0.05, 0.05, 0.08)), COL.amber, 0.5, { hazeGain: 0.8, radius: 0.05 });
  st.lightsAlong(toHand, COL.amber, 0.5, 3, { hazeGain: 0.4, radius: 0.05 });

  // ghosted technologies receding to the right: bulb, lens, chip (same thread runs through them)
  const bulbPos = st.at(0.52, 0.5, 3.6), lensPos = st.at(0.7, 0.34, 6.2), chipPos = st.at(0.84, 0.47, 9.5);
  const ghost = (u) => COL.amber;
  const B = place(bulb(), { pos: bulbPos, scale: 0.8, rotY: -0.5 });
  outline(T, B, { color: COL.amber, width: 0.004, intensity: 1.9, seg: 0.03, halo: 0.5 });
  const fil = place([bulbFilament()], { pos: bulbPos, scale: 0.8, rotY: -0.5 })[0];
  const L = place(lens(0.5, 0.65), { pos: lensPos, rotY: -0.55 });
  outline(T, L, { color: COL.amber, width: 0.006, intensity: 1.6, seg: 0.04, halo: 0.5 });
  const C = place(chip(1.1), { pos: chipPos, rotY: -0.5, rotX: 0.85 });
  outline(T, C, { color: COL.amber, width: 0.007, intensity: 1.8, seg: 0.05, halo: 0.5 });

  // the continuous warm thread: axe tip -> bulb base -> filament -> out the top -> lens centre -> chip centre
  const bBase = bulbPos.clone().add(V(0, 0.02, 0)), bTop = bulbPos.clone().add(V(0, 0.95 * 0.8, 0));
  const seg1 = bez(axeTip, axeTip.clone().add(V(0.4, 0.5, -0.1)), bBase.clone().add(V(-0.3, -0.5, 0)), bBase, 60);
  T.add(seg1, { color: warm, width: 0.004, intensity: 6, fadeIn: 0.0 });
  const into = bez(bBase, bBase.clone().add(V(0, 0.2, 0)), fil[0].clone().add(V(0, -0.1, 0)), fil[0], 20);
  T.add(into, { color: warm, width: 0.004, intensity: 6, fadeIn: 0 });
  T.add(fil, { color: COL.hot, width: 0.006, intensity: 14, fadeIn: 0, fadeOut: 0 });
  st.light(fil[15], COL.hot, 1.4, { hazeGain: 1.2, radius: 0.08 });
  const out = bez(fil[fil.length - 1], bTop.clone().add(V(0.05, 0.1, 0)), lensPos.clone().add(V(-1.0, 0.4, 0.8)), lensPos, 80);
  T.add(out, { color: warm, width: 0.004, intensity: 6, fadeIn: 0 });
  const lensGlow = new Motes(st, { minPx: 1 }); lensGlow.add(lensPos, COL.hot, 6, 0.03); lensGlow.add(lensPos, COL.amber, 0.6, 0.18);
  const seg3 = bez(lensPos, lensPos.clone().add(V(0.9, -0.1, -0.9)), chipPos.clone().add(V(-0.9, 0.6, 0.6)), chipPos.clone().add(V(0, 0.05, 0)), 80);
  T.add(seg3, { color: warm, width: 0.004, intensity: 6, fadeIn: 0 });
  // on the chip the thread becomes traces
  const R = mulberry(4);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + R() * 0.3; const d = 0.2 + R() * 0.15;
    const p0 = chipPos.clone().add(V(0, 0.05, 0)); const p1 = p0.clone().add(V(Math.cos(a) * d * 0.6, 0, Math.sin(a) * d * 0.6)); const p2 = p0.clone().add(V(Math.cos(a) * d, -0.02, Math.sin(a) * d));
    T.add(place([[p0.clone().sub(chipPos), p1.clone().sub(chipPos), p2.clone().sub(chipPos)]], { pos: chipPos, rotY: -0.5, rotX: 0.85 })[0], { color: COL.amber, width: 0.004, intensity: 3.2, fadeIn: 0, fadeOut: 0.3 }); }
  lensGlow.add(chipPos.clone().add(V(0, 0.05, 0)), COL.hot, 4, 0.03);
  lensGlow.build();
  for (const p of [lensPos, chipPos]) st.light(p.clone().add(V(0, 0.2, 0.2)), COL.amber, 0.8, { hazeGain: 1.2, radius: 0.1 });
  st.lightsAlong(seg1, COL.amber, 0.6, 2, { hazeGain: 0.8, radius: 0.08 });
  T.build();
  st.envFromFx(V(-0.5, 1.6, 1.5), { intensity: 0.5 });

    st.render({ time: 0.2 });
}
