// Procedural wooden artist's-model DOG (spaniel proportions), same visual language as kit/mannequin.js:
// turned beech segments (lathes), ball joints, steel pins, an egg head with a turned snout, flat oval ears,
// a three-piece jointed tail. Scene units as the manikin (manikin 2.0 tall ~ 1.75 m): withers ~0.54 (~47 cm).
// Faces +Z. Left = +X. Pose API like the manikin: setPose({ root:{pos,rot}, joint:[x,y,z] degrees ... });
// every value is ADDED to a baked rest pose, so {} = the dog standing square.
//
// Joints and signs (degrees):
//   chest, hips   : torso halves hinged at the waist ball. chest X- = front up; hips X- = rump down (sit).
//   neck, head    : X+ = lower / look down, Y = turn (+ = to the dog's left), Z = tilt (+ = tilt toward its right ear down... see headTilt()).
//   lEar, rEar    : hang from the top of the skull. Z (away from the head) lifts them out; X- swings them forward, X+ back.
//   tail1..3      : X+ = raise, X- = tuck; Z = wag sideways.
//   l/rShoulder, l/rElbow, l/rWrist, l/rFPaw : front legs. X+ = swing back; elbow X- = fold the forearm forward.
//   l/rHip, l/rKnee, l/rHock, l/rHPaw        : hind legs. hip X- = thigh forward; knee X+ = shin back; hock X- = foot forward.
import * as THREE from 'three';
import { woodMaterial } from '../../mannequin.js';

const DEG = Math.PI / 180;

// ---------- geometry helpers (same construction as the manikin) ----------
function lathe(profile, segs = 40) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y));
  const g = new THREE.LatheGeometry(pts, segs); g.computeVertexNormals(); return g;
}
function smoothProfile(ctrl, n = 28) {
  const curve = new THREE.SplineCurve(ctrl.map(([r, y]) => new THREE.Vector2(r, y)));
  return curve.getPoints(n).map((p) => [p.x, p.y]);
}
// tapered limb running DOWN from its joint (joint at y=0 to -len)
function limb(len, r0, r1, bulge = 0, bulgeAt = 0.35) {
  const prof = smoothProfile([
    [0.0001, -len], [r1 * 0.72, -len + r1 * 0.25], [r1, -len * 0.92],
    [r1 + (r0 - r1) * (1 - bulgeAt) + bulge, -len * bulgeAt - (len * 0.5 - len * bulgeAt) * 0.2],
    [r0, -len * 0.12], [r0 * 0.78, -r0 * 0.25], [0.0001, 0.0],
  ], 32);
  prof.sort((a, b) => a[1] - b[1]);
  return lathe(prof, 28);
}
// tapered limb running UP (for neck and tail): joint at y=0 to +len
function limbUp(len, r0, r1, bulge = 0, bulgeAt = 0.35) { const g = limb(len, r0, r1, bulge, bulgeAt); g.rotateX(Math.PI); return g; }
const ball = (r) => new THREE.SphereGeometry(r, 28, 18);
// turned body block along +Z from z0 to z1 (profile radii along its length)
function bodyBlock(ctrl, segs = 40) {
  const g = lathe(smoothProfile(ctrl, 36), segs); // along +Y
  g.rotateX(Math.PI / 2); // +Y -> +Z
  return g;
}
// egg skull: fuller at the back-top, narrowing toward the snout (+Z)
function skull(len, w, h) {
  const g = new THREE.SphereGeometry(0.5, 48, 32); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = z / 0.5; // -1 back .. +1 front
    const k = 1 - 0.16 * Math.max(0, t) ** 1.4; // taper toward the front
    const dome = y > 0 ? 1 + 0.06 * (1 - Math.abs(t)) : 0.92; // domed top, flatter jaw line
    p.setXYZ(i, x * w * k, y * h * dome * (y > 0 ? 1 : k), z * len);
  }
  g.computeVertexNormals(); return g;
}

// ---------- rest pose (radians added before the pose values) ----------
export const REST = {
  chest: [0, 0, 0], hips: [0, 0, 0],
  neck: [48, 0, 0], head: [-40, 0, 0],
  lEar: [4, 0, 9], rEar: [4, 0, -9],
  tail1: [-58, 0, 0], tail2: [-12, 0, 0], tail3: [-10, 0, 0],
  lShoulder: [26, 0, 0], lElbow: [-26, 0, 0], lWrist: [0, 0, 0], lFPaw: [0, 0, 0],
  rShoulder: [26, 0, 0], rElbow: [-26, 0, 0], rWrist: [0, 0, 0], rFPaw: [0, 0, 0],
  lHip: [-36, 0, 0], lKnee: [68, 0, 0], lHock: [-32, 0, 0], lHPaw: [0, 0, 0],
  rHip: [-36, 0, 0], rKnee: [68, 0, 0], rHock: [-32, 0, 0], rHPaw: [0, 0, 0],
};
export const DOG_JOINTS = Object.keys(REST);

// dimensions (scene units)
export const DIM = {
  armA: 0.15, armB: 0.17, meta: 0.035, pawH: 0.024, // front: upper arm, forearm, wrist->paw joint, paw joint->pad
  thighA: 0.16, shinB: 0.165, metaT: 0.105,          // hind: thigh, shin, hock->paw joint
  shoulder: [0.072, -0.035, 0.2], hip: [0.07, -0.015, -0.17],
};

export function buildDog({ kind = 'beech', seed = 11, material = null, scale = 1, castShadow = true } = {}) {
  const tones = {
    beech: { base: [226, 192, 148], dark: [184, 140, 96] },
    maple: { base: [236, 212, 176], dark: [196, 164, 124] },
    oak: { base: [206, 166, 116], dark: [150, 108, 66] },
    walnut: { base: [150, 108, 76], dark: [96, 64, 44] },
    ash: { base: [222, 200, 166], dark: [176, 150, 112] },
  }[kind] || { base: [226, 192, 148], dark: [184, 140, 96] };
  const mat = material || woodMaterial({ seed, ...tones, roughness: 0.58, clearcoat: 0.22, bumpScale: 0.5 });
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x8a8a86, metalness: 0.9, roughness: 0.35 });
  const group = new THREE.Group(); group.name = 'dog';
  const root = new THREE.Group(); group.add(root);
  const J = {};
  const add = (parent, geo, pos = [0, 0, 0], sc = [1, 1, 1], rot = [0, 0, 0], m = mat) => {
    const o = new THREE.Mesh(geo, m); o.position.set(...pos); o.scale.set(...sc); o.rotation.set(...rot);
    o.castShadow = castShadow; o.receiveShadow = true; parent.add(o); return o;
  };
  const joint = (name, parent, pos) => { const g = new THREE.Group(); g.name = name; g.position.set(...pos); parent.add(g); J[name] = g; return g; };

  // waist: both torso halves hinge here
  const body = joint('body', root, [0, 0, 0]);
  add(body, ball(0.078));
  const chest = joint('chest', body, [0, 0, 0]);
  // deep rounded rib-cage block, front end (the chest) fuller, forward of the waist
  add(chest, bodyBlock([[0.0001, -0.05], [0.066, -0.035], [0.098, 0.04], [0.12, 0.14], [0.124, 0.22], [0.108, 0.3], [0.068, 0.345], [0.0001, 0.36]]), [0, 0.0, 0], [0.8, 1.08, 1]);
  const hips = joint('hips', body, [0, 0, 0]);
  add(hips, bodyBlock([[0.0001, -0.31], [0.08, -0.285], [0.106, -0.22], [0.112, -0.13], [0.098, -0.03], [0.065, 0.035], [0.0001, 0.05]]), [0, 0.0, 0], [0.86, 1.0, 1]);

  // neck + head
  const neck = joint('neck', chest, [0, 0.1, 0.25]);
  add(neck, ball(0.06));
  add(neck, limbUp(0.15, 0.058, 0.048, 0.004), [0, 0.02, 0]);
  const head = joint('head', neck, [0, 0.155, 0]);
  add(head, ball(0.046), [0, -0.012, 0]);
  add(head, skull(0.215, 0.165, 0.17), [0, 0.04, 0.0]);
  // muzzle: a turned taper with a rounded end, set a little below the skull's centre (the 'stop' reads)
  const muz = lathe(smoothProfile([[0.0001, 0], [0.034, 0.005], [0.048, 0.022], [0.052, 0.05], [0.056, 0.09], [0.06, 0.13]], 24), 32);
  muz.rotateX(-Math.PI / 2); muz.translate(0, 0, 0.0); // +Y -> -Z: tip at z=0, base at z=-0.15
  add(head, muz, [0, 0.0, 0.215], [1, 0.88, 1], [0.12, 0, 0]);
  // ears: long flat ovals hanging from pegs at the top of the skull
  for (const s of [1, -1]) {
    const e = joint(s > 0 ? 'lEar' : 'rEar', head, [s * 0.072, 0.105, -0.01]);
    add(e, ball(0.022), [0, 0, 0]);
    const ear = new THREE.SphereGeometry(0.5, 28, 16); ear.scale(0.024, 0.19, 0.1); ear.translate(0, -0.085, 0.006);
    add(e, ear, [s * 0.01, 0, 0]);
  }

  // tail: three turned pieces with balls between
  let tp = joint('tail1', hips, [0, 0.075, -0.285]);
  add(tp, ball(0.03)); add(tp, limbUp(0.09, 0.028, 0.022), [0, 0.01, 0]);
  tp = joint('tail2', tp, [0, 0.1, 0]); add(tp, ball(0.022)); add(tp, limbUp(0.085, 0.021, 0.016), [0, 0.008, 0]);
  tp = joint('tail3', tp, [0, 0.093, 0]); add(tp, ball(0.017)); add(tp, limbUp(0.075, 0.016, 0.009), [0, 0.006, 0]);

  // legs
  const paw = () => { const g = new THREE.SphereGeometry(0.5, 28, 16); g.scale(0.052, 0.036, 0.074); return g; };
  for (const s of [1, -1]) {
    const L = s > 0 ? 'l' : 'r';
    // front
    const sh = joint(L + 'Shoulder', chest, [s * DIM.shoulder[0], DIM.shoulder[1], DIM.shoulder[2]]);
    add(sh, ball(0.05));
    add(sh, limb(DIM.armA, 0.054, 0.036, 0.006, 0.3), [0, -0.01, 0]);
    const el = joint(L + 'Elbow', sh, [0, -DIM.armA, 0]);
    add(el, ball(0.036));
    add(el, limb(DIM.armB, 0.034, 0.025, 0.002, 0.3), [0, -0.006, 0]);
    const wr = joint(L + 'Wrist', el, [0, -DIM.armB, 0]);
    add(wr, ball(0.026));
    add(wr, limb(DIM.meta, 0.025, 0.022), [0, 0, 0]);
    const fp = joint(L + 'FPaw', wr, [0, -DIM.meta, 0]);
    add(fp, paw(), [0, -DIM.pawH * 0.5 - 0.004, 0.018]);
    // hind
    const hp = joint(L + 'Hip', hips, [s * DIM.hip[0], DIM.hip[1], DIM.hip[2]]);
    add(hp, ball(0.06));
    add(hp, limb(DIM.thighA, 0.07, 0.04, 0.01, 0.35), [0, -0.012, 0]);
    const kn = joint(L + 'Knee', hp, [0, -DIM.thighA, 0]);
    add(kn, ball(0.038));
    add(kn, limb(DIM.shinB, 0.037, 0.025, 0.002, 0.3), [0, -0.006, 0]);
    const hk = joint(L + 'Hock', kn, [0, -DIM.shinB, 0]);
    add(hk, ball(0.027));
    add(hk, limb(DIM.metaT, 0.025, 0.022), [0, 0, 0]);
    const hpaw = joint(L + 'HPaw', hk, [0, -DIM.metaT, 0]);
    add(hpaw, paw(), [0, -DIM.pawH * 0.5 - 0.004, 0.018]);
    // steel pins at elbow and knee (the manikin detail)
    for (const [jn, r] of [[L + 'Elbow', 0.034], [L + 'Knee', 0.036]]) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 10), pinMat);
      pin.rotation.z = Math.PI / 2; pin.position.set(s * r, 0, 0); J[jn].add(pin);
    }
  }
  root.scale.setScalar(scale);

  const api = {
    group, root, joints: J, scale,
    setPose(pose = {}) {
      root.position.set(...(pose.root?.pos || [0, 0, 0]));
      root.rotation.set(...(pose.root?.rot || [0, 0, 0]).map((x) => x * DEG));
      for (const k of DOG_JOINTS) {
        const r0 = REST[k], v = pose[k] || [0, 0, 0];
        J[k].rotation.set((r0[0] + v[0]) * DEG, (r0[1] + v[1]) * DEG, (r0[2] + v[2]) * DEG);
      }
      if (pose.flat !== false) api.flattenPaws(pose.flat || null);
      group.updateMatrixWorld(true);
      return api;
    },
    // turn each paw so its sole is level in the world (pitch only), unless the paw's own pose value asks otherwise.
    flattenPaws(which = null) {
      group.updateMatrixWorld(true);
      const v = new THREE.Vector3(), q = new THREE.Quaternion();
      for (const k of which || ['lFPaw', 'rFPaw', 'lHPaw', 'rHPaw']) {
        const j = J[k]; const base = j.rotation.x;
        j.rotation.x = 0; j.updateMatrixWorld(true);
        j.getWorldQuaternion(q); v.set(0, 0, 1).applyQuaternion(q);
        const pitch = Math.asin(Math.max(-1, Math.min(1, v.y)));
        j.rotation.x = pitch + (base - REST[k][0] * DEG); // keep any extra flex from the pose
        j.updateMatrixWorld(true);
      }
    },
    // put the lowest point of the given joints' own meshes on y (e.g. paws for a sit, whose tail may hang lower)
    groundBy(names, y = 0) {
      group.updateMatrixWorld(true); let minY = Infinity; const v = new THREE.Vector3();
      for (const n of names) for (const c of J[n].children) { if (!c.isMesh) continue; const pa = c.geometry.attributes.position; for (let i = 0; i < pa.count; i += 2) { v.fromBufferAttribute(pa, i).applyMatrix4(c.matrixWorld); if (v.y < minY) minY = v.y; } }
      group.position.y += y - minY; group.updateMatrixWorld(true); return api;
    },
    ground(y = 0) { group.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(group); group.position.y += y - b.min.y; group.updateMatrixWorld(true); return api; },
    worldOf(name, local = [0, 0, 0]) { group.updateMatrixWorld(true); return new THREE.Vector3(...local).applyMatrix4(J[name].matrixWorld); },
  };
  api.setPose({});
  return api;
}

// ---------- pose library ----------
// (values ADD to REST; {} = standing square)
export const DOG_POSES = {
  stand: {},
  alert: { neck: [-8, 0, 0], head: [-4, 0, 0], lEar: [-10, 0, 14], rEar: [-10, 0, -14], tail1: [18, 0, 0], tail2: [8, 0, 0] },
  // sitting: rump down, front up, forelegs vertical, hind legs folded with hocks on the floor
  sit: {
    root: { pos: [0, 0, 0], rot: [-24, 0, 0] }, hips: [-36, 0, 0], chest: [-6, 0, 0], neck: [-10, 0, 0], head: [6, 0, 0],
    lShoulder: [30, 0, 0], rShoulder: [30, 0, 0], lElbow: [0, 0, 0], rElbow: [0, 0, 0],
    lHip: [-4, 0, 12], rHip: [-4, 0, -12], lKnee: [72, 0, 0], rKnee: [72, 0, 0], lHock: [-98, 0, -8], rHock: [-98, 0, 8],
    tail1: [40, 0, 40], tail2: [-10, 0, 20], tail3: [-6, 0, 10],
  },
  // lying "sphinx": elbows on the floor, forearms forward, hind legs folded under
  down: {
    chest: [0, 0, 0], hips: [0, 0, 0], neck: [-6, 0, 0], head: [6, 0, 0],
    lShoulder: [36, 0, 0], rShoulder: [36, 0, 0], lElbow: [-124, 0, 0], rElbow: [-124, 0, 0], lWrist: [0, 0, 0], rWrist: [0, 0, 0],
    lHip: [-50, 0, 16], rHip: [-50, 0, -16], lKnee: [104, 0, 0], rKnee: [104, 0, 0], lHock: [-140, 0, 0], rHock: [-140, 0, 0],
    tail1: [-40, 0, 20], tail2: [-24, 0, 16], tail3: [-6, 0, 10],
  },
};
DOG_POSES.headOnPaws = {
  ...DOG_POSES.down, neck: [46, 0, 0], head: [-24, 0, 0], lEar: [16, 0, 4], rEar: [16, 0, -4],
};
DOG_POSES.sniff = { neck: [52, 0, 0], head: [22, 0, 0], lShoulder: [-10, 0, 0], rShoulder: [-10, 0, 0], lElbow: [-18, 0, 0], rElbow: [-18, 0, 0], chest: [8, 0, 0], lEar: [18, 0, 6], rEar: [18, 0, -6], tail1: [-10, 0, 0] };

// ---------- interpolation for any rig (dog or manikin) ----------
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), eu = new THREE.Euler();
function toQ(v, q) { eu.set((v?.[0] || 0) * DEG, (v?.[1] || 0) * DEG, (v?.[2] || 0) * DEG, 'XYZ'); return q.setFromEuler(eu); }
export function mixPose(a, b, f) {
  const o = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'root') {
      const ra = a.root || { pos: [0, 0, 0], rot: [0, 0, 0] }, rb = b.root || { pos: [0, 0, 0], rot: [0, 0, 0] };
      o.root = { pos: [0, 1, 2].map((i) => (ra.pos?.[i] || 0) + ((rb.pos?.[i] || 0) - (ra.pos?.[i] || 0)) * f), rot: [0, 1, 2].map((i) => (ra.rot?.[i] || 0) + ((rb.rot?.[i] || 0) - (ra.rot?.[i] || 0)) * f) };
      continue;
    }
    if (k === 'flat') { o.flat = f < 0.5 ? a.flat : b.flat; continue; }
    const va = a[k], vb = b[k];
    if (!Array.isArray(va) && !Array.isArray(vb)) continue;
    toQ(va, qa); toQ(vb, qb); qa.slerp(qb, f); eu.setFromQuaternion(qa, 'XYZ');
    o[k] = [eu.x / DEG, eu.y / DEG, eu.z / DEG];
  }
  return o;
}
// linear per-component mix (no slerp; good for large single-axis folds where Euler wrap is not an issue)
export function lerpPose(a, b, f) {
  const o = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'root') {
      const ra = a.root || { pos: [0, 0, 0], rot: [0, 0, 0] }, rb = b.root || { pos: [0, 0, 0], rot: [0, 0, 0] };
      o.root = { pos: [0, 1, 2].map((i) => (ra.pos?.[i] || 0) + ((rb.pos?.[i] || 0) - (ra.pos?.[i] || 0)) * f), rot: [0, 1, 2].map((i) => (ra.rot?.[i] || 0) + ((rb.rot?.[i] || 0) - (ra.rot?.[i] || 0)) * f) };
      continue;
    }
    if (k === 'flat') { o.flat = f < 0.5 ? a.flat : b.flat; continue; }
    const va = a[k] || [0, 0, 0], vb = b[k] || [0, 0, 0];
    o[k] = [0, 1, 2].map((i) => va[i] + (vb[i] - va[i]) * f);
  }
  return o;
}
export const P = (...ps) => { const o = {}; for (const p of ps) Object.assign(o, p); return o; };

// ---------- two-bone IK in a parent's y-z plane ----------
// angles: rotation about X; 0 = straight down (-Y); + swings toward -Z (backward).
// bend=+1: middle joint forward (stifle / human knee). bend=-1: middle joint backward (dog elbow).
export function ik2(a, b, dy, dz, bend) {
  let d = Math.hypot(dy, dz); d = Math.min(Math.max(d, Math.abs(a - b) + 1e-4), a + b - 1e-4);
  const phiT = Math.atan2(-dz, -dy);
  const al = Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))));
  const be = Math.acos(Math.min(1, Math.max(-1, (b * b + d * d - a * a) / (2 * b * d))));
  return bend > 0 ? [phiT - al, phiT + be] : [phiT + al, phiT - be];
}

// Solve one dog leg so its pad lands on a world point. Call AFTER the body pose is set (setPose), then it
// writes the leg joints directly (and returns their pose values). leg: 'lF','rF','lH','rH'.
//   flex: extra paw curl (deg) for the swing phase; metaAng: hind metatarsus angle from vertical (deg, + = paw behind hock).
const _v = new THREE.Vector3(), _m = new THREE.Matrix4();
export function solveLeg(dog, leg, target, { flex = 0, metaAng = 0 } = {}) {
  const J = dog.joints, s = dog.scale || 1;
  const side = leg[0], front = leg[1] === 'F';
  const parent = front ? J.chest : J.hips;
  dog.group.updateMatrixWorld(true);
  // pad target -> paw joint -> (front) wrist point / (hind) hock point, in world
  const up = new THREE.Vector3(0, 1, 0);
  const pawJ = target.clone().addScaledVector(up, (DIM.pawH + 0.004) * s);
  // forward direction of the body (world, horizontal)
  const fwd = new THREE.Vector3(0, 0, 1).transformDirection(parent.matrixWorld); fwd.y = 0; fwd.normalize();
  let endPt, a, b;
  if (front) { endPt = pawJ.clone().addScaledVector(up, DIM.meta * s); a = DIM.armA; b = DIM.armB; }
  else {
    const ma = metaAng * DEG; // metatarsus from paw joint up to hock: up, tilted back by ma
    endPt = pawJ.clone().addScaledVector(up, Math.cos(ma) * DIM.metaT * s).addScaledVector(fwd, -Math.sin(ma) * DIM.metaT * s);
    a = DIM.thighA; b = DIM.shinB;
  }
  // into the parent frame (parent's own scale is 1; root scale s is inside matrixWorld)
  _m.copy(parent.matrixWorld).invert();
  const loc = endPt.clone().applyMatrix4(_m); // parent-local (unscaled rig) units
  const jn = front ? side + 'Shoulder' : side + 'Hip';
  const jp = J[jn].position.clone();
  const dy = loc.y - jp.y, dz = loc.z - jp.z;
  const [p1, p2] = ik2(a, b, dy, dz, front ? -1 : 1);
  const mid = front ? side + 'Elbow' : side + 'Knee';
  const end = front ? side + 'Wrist' : side + 'Hock';
  const pawName = front ? side + 'FPaw' : side + 'HPaw';
  J[jn].rotation.x = p1; J[mid].rotation.x = p2 - p1;
  // third segment: front metacarpus stays vertical in the parent frame; hind metatarsus at metaAng
  const parentPitch = (() => { const q = new THREE.Quaternion(); parent.getWorldQuaternion(q); const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q); return Math.asin(Math.max(-1, Math.min(1, -f.y))); })();
  const want3 = (front ? 0 : metaAng * DEG) - parentPitch; // absolute in parent frame
  J[end].rotation.x = want3 - p2;
  J[end].rotation.y = 0; J[end].rotation.z = 0;
  dog.group.updateMatrixWorld(true);
  // paw level, plus optional curl
  const j = J[pawName]; j.rotation.x = 0; j.updateMatrixWorld(true);
  const q = new THREE.Quaternion(); j.getWorldQuaternion(q); _v.set(0, 0, 1).applyQuaternion(q);
  j.rotation.x = Math.asin(Math.max(-1, Math.min(1, _v.y))) + flex * DEG;
  dog.group.updateMatrixWorld(true);
  const out = {};
  for (const n of [jn, mid, end, pawName]) out[n] = [J[n].rotation.x / DEG - REST[n][0], J[n].rotation.y / DEG - REST[n][1], J[n].rotation.z / DEG - REST[n][2]];
  return out;
}
