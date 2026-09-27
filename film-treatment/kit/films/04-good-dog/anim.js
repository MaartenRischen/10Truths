// Locomotion for GOOD DOG: a planted-foot dog gait and a manikin walk, both driven by arc length along a path.
// Feet are placed on the floor at fixed world plants (no sliding) and the legs are solved with 2-bone IK.
import * as THREE from 'three';
import { solveLeg, ik2 } from './dog.js';

const DEG = Math.PI / 180;
const ease = (x) => x * x * (3 - 2 * x);

// straight-line path (extrapolates past both ends) and a smooth curve path through points (arc-length)
export function linePath(a, b) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const L = A.distanceTo(B); const dir = B.clone().sub(A).normalize(); const h = Math.atan2(dir.x, dir.z);
  return { at: (s) => A.clone().addScaledVector(dir, s), heading: () => h, length: L };
}
export function curvePath(points) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal'); const L = c.getLength();
  const at = (s) => { if (s <= 0) { const t = c.getTangentAt(0); return c.getPointAt(0).addScaledVector(t, s); } if (s >= L) { const t = c.getTangentAt(1); return c.getPointAt(1).addScaledVector(t, s - L); } return c.getPointAt(s / L); };
  const heading = (s) => { const t = c.getTangentAt(Math.max(0, Math.min(1, s / L))); return Math.atan2(t.x, t.z); };
  return { at, heading, length: L };
}

// ---------------- dog ----------------
const DOG_ANCH = { lF: [0.072, 0.2], rF: [-0.072, 0.2], lH: [0.07, -0.17], rH: [-0.07, -0.17] };
const GAITS = {
  trot: { off: { lF: 0, rH: 0.02, rF: 0.5, lH: 0.52 }, duty: 0.52 },
  walk: { off: { lH: 0, lF: 0.25, rH: 0.5, rF: 0.75 }, duty: 0.68 },
};
function yawRot(v, h) { const c = Math.cos(h), s = Math.sin(h); return new THREE.Vector3(v[0] * c + v[1] * s, 0, -v[0] * s + v[1] * c); }
// body pose (without legs) -> sets dog group at the path, solves legs. Returns the phase for sound/overlap.
export function dogGait(dog, path, s, body = {}, { gait = 'trot', stride = 0.9, bodyY = 0.415, lift = 0.07, bob = 0.012, scale = 1 } = {}) {
  const G = GAITS[gait];
  const p = path.at(s), h = path.heading(s);
  dog.group.position.set(p.x, 0, p.z); dog.group.rotation.set(0, h, 0);
  const cyc = s / (stride * scale);
  const by = bodyY * scale + bob * scale * Math.cos(cyc * Math.PI * 4);
  // turning: bend the body into the curve
  const dh = path.heading(s + 0.15) - path.heading(s - 0.15); const turn = Math.atan2(Math.sin(dh), Math.cos(dh));
  dog.setPose({ ...body, root: { pos: [0, by, 0], rot: [0, 0, -turn * 12] }, chest: [body.chest?.[0] || 0, (body.chest?.[1] || 0) + turn * 40, 0], hips: [body.hips?.[0] || 0, (body.hips?.[1] || 0) - turn * 30, 0], flat: false });
  for (const leg of ['lF', 'rF', 'lH', 'rH']) {
    const off = G.off[leg]; const c = cyc + off; const k = Math.floor(c); const ph = c - k;
    const plant = (kk) => { const sk = (kk - off + G.duty / 2) * stride * scale; const pp = path.at(sk); return pp.add(yawRot(DOG_ANCH[leg].map((x) => x * scale), path.heading(sk))); };
    let tgt, flex = 0, meta = 0;
    if (ph < G.duty) tgt = plant(k);
    else { const u = (ph - G.duty) / (1 - G.duty); tgt = plant(k).lerp(plant(k + 1), ease(u)); tgt.y += lift * scale * Math.sin(Math.PI * u); flex = leg[1] === 'F' ? 75 * Math.sin(Math.PI * Math.min(1, u * 1.3)) : 0; meta = leg[1] === 'H' ? 28 * Math.sin(Math.PI * u) : 0; }
    tgt.y = Math.max(0, tgt.y);
    solveLeg(dog, leg, tgt, { flex, metaAng: meta });
  }
  return cyc;
}
// standing still on the spot (feet under the body), with an optional body pose; keeps legs solved and paws flat
export function dogStand(dog, pos, heading, body = {}, { bodyY = 0.415, scale = 1, spread = 0 } = {}) {
  dog.group.position.set(pos[0], 0, pos[2]); dog.group.rotation.set(0, heading, 0);
  dog.setPose({ ...body, root: body.root || { pos: [0, bodyY, 0], rot: [0, 0, 0] }, flat: false });
  for (const leg of ['lF', 'rF', 'lH', 'rH']) {
    const a = DOG_ANCH[leg]; const t = new THREE.Vector3(pos[0], 0, pos[2]).add(yawRot([a[0] * (1 + spread), a[1]].map((x) => x * scale), heading));
    solveLeg(dog, leg, t, {});
  }
}

// ---------------- manikin walk ----------------
// measured from the rig: hip joint and ankle heights for the rest pose standing on y=0
let RIG = null;
export function rigInfo(fig) {
  if (RIG) return RIG;
  fig.setPose({}); fig.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(fig.group); const minY = box.min.y;
  const v = new THREE.Vector3();
  const hip = fig.joints.lHip.getWorldPosition(v).y - minY; const ank = fig.joints.lAnkle.getWorldPosition(new THREE.Vector3()).y - minY;
  const root = fig.root.position.y - minY + fig.group.position.y - fig.group.position.y;
  RIG = { hipH: hip, ankH: ank, rootLift: -minY + fig.group.position.y, thigh: fig.joints.lKnee.position.length(), shin: fig.joints.lAnkle.position.length() };
  return RIG;
}
// Walk the manikin along a path. upper: pose for the upper body (arms/head/chest). Returns cycle phase.
export function manWalk(fig, path, s, upper = {}, { stride = 1.6, duty = 0.6, lift = 0.1, bob = 0.02, drop = 0.035, armSwing = 0 } = {}) {
  const R = rigInfo(fig);
  const p = path.at(s), h = path.heading(s);
  fig.group.position.set(p.x, 0, p.z); fig.group.rotation.set(0, h, 0);
  const cyc = s / stride;
  const sw = Math.sin(cyc * Math.PI * 2);
  const pose = { ...upper };
  pose.pelvis = [0, -sw * 6, 0];
  pose.chest = [(upper.chest?.[0] || 4), (upper.chest?.[1] || 0) + sw * 5, upper.chest?.[2] || 0];
  if (armSwing) { pose.lShoulder = [-sw * armSwing, 0, 6]; pose.rShoulder = [sw * armSwing, 0, -6]; pose.lElbow = [-14 - Math.max(0, -sw) * 16, 0, 0]; pose.rElbow = [-14 - Math.max(0, sw) * 16, 0, 0]; }
  pose.root = { pos: [0, R.rootLift - drop + bob * Math.cos(cyc * Math.PI * 4), 0], rot: [0, 0, 0] };
  fig.setPose(pose); fig.group.updateMatrixWorld(true);
  const J = fig.joints; const inv = new THREE.Matrix4();
  for (const [side, off, lat] of [['l', 0, 0.1], ['r', 0.5, -0.1]]) {
    const c = cyc + off; const k = Math.floor(c); const ph = c - k;
    const plant = (kk) => { const sk = (kk - off + duty / 2) * stride; return path.at(sk).add(yawRot([lat, 0.0], path.heading(sk))); };
    let tgt, toe = 0;
    if (ph < duty) tgt = plant(k);
    else { const u = (ph - duty) / (1 - duty); tgt = plant(k).lerp(plant(k + 1), ease(u)); tgt.y += lift * Math.sin(Math.PI * u); toe = 25 * Math.sin(Math.PI * Math.min(1, u * 1.6)); }
    tgt.y += R.ankH;
    inv.copy(J.pelvis.matrixWorld).invert();
    const loc = tgt.clone().applyMatrix4(inv); const jp = J[side + 'Hip'].position;
    const [p1, p2] = ik2(R.thigh, R.shin, loc.y - jp.y, loc.z - jp.z, 1);
    J[side + 'Hip'].rotation.set(p1, 0, (side === 'l' ? 2 : -2) * DEG);
    J[side + 'Knee'].rotation.set(p2 - p1, 0, 0);
    // foot flat (pelvis pitch ~0) + toe-off
    J[side + 'Ankle'].rotation.set(-p2 + toe * DEG, 0, 0);
  }
  fig.group.updateMatrixWorld(true);
  return cyc;
}
