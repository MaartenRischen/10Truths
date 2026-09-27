// Film 03 helpers: keyed whole-figure animation (pose + root orientation + position), walk cycle, shrug, orientation.
import * as THREE from 'three';
import * as E from '../../film/engine.js';
import * as F from '../../scenes/E/lib/figs.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DEG = Math.PI / 180;

// quaternion that maps the figure's local +Y to head, local +Z to front (orthogonalised)
export function basisQ(head, front) {
  const y = head.clone().normalize();
  const z = front.clone().sub(y.clone().multiplyScalar(front.dot(y))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
export const yawQ = (deg) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), deg * DEG);

// merge poses (later wins) and mirror helper
export const P = (...ps) => Object.assign({}, ...ps);

// shoulders up (tension) by moving the shoulder joint groups; amt 0..1
export function shrug(f, amt) {
  const J = f.joints; const H = f.H || 0.25;
  if (!J.lShoulder.userData.base) { J.lShoulder.userData.base = J.lShoulder.position.clone(); J.rShoulder.userData.base = J.rShoulder.position.clone(); }
  J.lShoulder.position.copy(J.lShoulder.userData.base).add(V(-0.012 * amt, 0.045 * amt, 0.004 * amt));
  J.rShoulder.position.copy(J.rShoulder.userData.base).add(V(0.012 * amt, 0.045 * amt, 0.004 * amt));
}

// simple walk cycle; phase in cycles (1 = two steps)
export function walkPose(phase, { A = 20, knee = 34, arm = 16, lean = 5 } = {}) {
  const th = phase * Math.PI * 2, s = Math.sin(th), c = Math.cos(th);
  const kl = 6 + knee * Math.pow(Math.max(0, c), 1.4), kr = 6 + knee * Math.pow(Math.max(0, -c), 1.4);
  return {
    pelvis: [0, 6 * s, 0], chest: [lean, -8 * s, 0], head: [-2, 4 * s, 0],
    lHip: [-A * s - 4, 0, 3], rHip: [A * s - 4, 0, -3],
    lKnee: [kl, 0, 0], rKnee: [kr, 0, 0],
    lAnkle: [-6 * s + (kl > 20 ? 8 : 0), 0, 0], rAnkle: [6 * s + (kr > 20 ? 8 : 0), 0, 0],
    lShoulder: [arm * s, 0, 7], rShoulder: [-arm * s, 0, -7], lElbow: [-14 - 6 * Math.max(0, -s), 0, 0], rElbow: [-14 - 6 * Math.max(0, s), 0, 0],
  };
}

// Keyed figure animation.
// keys: [{ t, pose, q (Quaternion) | yaw (deg), x, z, y?, ground: 'feet'|'seat'|'parts'|'none', floorY, seatY, parts, ease }]
// The root position/orientation of each key is solved at build time; between keys: slerp pose + slerp q + lerp position.
// Optional per-segment walk: key.walk = { stride: units per cycle } makes the segment from this key to the next a walk (pose from walkPose, re-grounded each frame).
export function keyed(f, keys) {
  const solved = keys.map((k) => {
    const q = k.q ? k.q.clone() : yawQ(k.yaw || 0);
    f.setPose(k.pose); f.group.quaternion.copy(q); f.group.position.set(k.x ?? 0, k.y ?? 0, k.z ?? 0); f.group.updateMatrixWorld(true);
    if (k.ground === 'feet') F.groundFig(f, k.floorY ?? 0);
    else if (k.ground === 'seat') F.seatFig(f, k.seatY);
    else if (k.ground === 'parts') F.groundParts(f, k.parts || ['pelvis', 'chest'], k.floorY ?? 0);
    return { ...k, q, p: f.group.position.clone() };
  });
  return {
    keys: solved,
    // returns { pose } after placing the figure's root; the caller applies boil + setPose
    at(t) {
      const K = solved;
      let i = 0; while (i < K.length - 1 && t >= K[i + 1].t) i++;
      const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
      if (t <= K[0].t || a === b) { return { pose: a.pose, q: a.q, p: a.p, reground: null }; }
      const u = Math.max(0, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t)));
      if (a.walk) {
        const dist = a.p.distanceTo(b.p); const cyc = dist / a.walk.stride; const ph = (a.walk.phase0 || 0) + cyc * u;
        const f0 = Math.min(1, u * 6), f1 = Math.min(1, (1 - u) * 6); // blend in/out of the cycle
        let pose = walkPose(ph, a.walk);
        pose = E.slerpPose(a.pose, pose, f0); pose = E.slerpPose(b.pose, pose, f1);
        const dx = b.p.x - a.p.x, dz = b.p.z - a.p.z; const qw = yawQ(Math.atan2(dx, dz) / DEG);
        const q = a.q.clone().slerp(qw, E.ease.inOut(Math.min(1, u * 4))).slerp(b.q, E.ease.inOut(Math.max(0, (u - 0.75) * 4)));
        return { pose, q, p: a.p.clone().lerp(b.p, u), reground: a.floorY ?? 0 };
      }
      const e = E.ease[a.ease || 'inOut'](u);
      return { pose: E.slerpPose(a.pose, b.pose, e), q: a.q.clone().slerp(b.q, e), p: a.p.clone().lerp(b.p, e), reground: (a.ground === 'feet' && b.ground === 'feet') ? (a.floorY ?? 0) : null };
    },
  };
}

// apply a keyed state to the figure with boil; extra(pose) may modify the pose before setting
export function applyKeyed(f, K, t, frame, { boil = 0.35, seed = 1, extra = null, reground = true } = {}) {
  const s = K.at(t);
  let pose = boil > 0 ? E.boil(s.pose, frame, boil, seed) : { ...s.pose };
  if (extra) pose = extra(pose) || pose;
  f.setPose(pose);
  f.group.quaternion.copy(s.q); f.group.position.copy(s.p);
  f.group.updateMatrixWorld(true);
  if (reground && s.reground !== null && s.reground !== undefined) F.groundFig(f, s.reground);
  f.group.updateMatrixWorld(true);
  return s;
}

// solve an arm IK for a figure placed with a given pose/root and return the arm joint angles (degrees)
export function solveArm(f, side, target, { local = F.HAND_CENTER, wrist = false, iters = 500, init } = {}) {
  const r = F.reachIK(f, side, target, { local, wrist, iters, init });
  return { err: r.err, pose: r.pose };
}

export function camTrack(keys) { // keys: [[t, pos, look, fov?]]
  const pos = E.track(keys.map((k) => [k[0], k[1], k[4]]));
  const look = E.track(keys.map((k) => [k[0], k[2], k[4]]));
  const fov = keys[0][3] !== undefined ? E.track(keys.map((k) => [k[0], k[3] ?? keys[0][3], k[4]])) : null;
  return { pos, look, fov };
}
