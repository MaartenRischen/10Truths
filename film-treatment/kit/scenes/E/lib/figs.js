// Figures for Direction E: beech manikins, pose helpers, numeric arm IK, grounding.
import * as THREE from 'three';
import { buildMannequin, woodMaterial, POSES, REST } from '../../../mannequin.js';
export { POSES, REST };

const matCache = new Map();
export function wood(kind = 'beech', seed = 5) {
  const key = kind + ':' + seed; if (matCache.has(key)) return matCache.get(key);
  const tones = {
    beech: { base: [226, 192, 148], dark: [184, 140, 96] },
    maple: { base: [236, 212, 176], dark: [196, 164, 124] },
    oak: { base: [206, 166, 116], dark: [150, 108, 66] },
    walnut: { base: [150, 108, 76], dark: [96, 64, 44] },
    ash: { base: [222, 200, 166], dark: [176, 150, 112] },
  }[kind] || { base: [226, 192, 148], dark: [184, 140, 96] };
  const mtl = woodMaterial({ seed, ...tones, roughness: 0.58, clearcoat: 0.22, bumpScale: 0.5 });
  matCache.set(key, mtl); return mtl;
}

export function figure({ kind = 'beech', seed = 5, pose = {}, pos = [0, 0, 0], rotY = 0, scale = 1, child = false, ground = null } = {}) {
  const f = buildMannequin({ material: wood(kind, seed) });
  f.setPose(pose);
  const g = new THREE.Group(); g.add(f.root);
  if (child) { f.joints.head.scale.setScalar(1.28); }
  g.scale.setScalar(scale);
  g.position.set(...pos); g.rotation.y = rotY * Math.PI / 180;
  f.group = g;
  if (ground !== null) groundFig(f, ground);
  return f;
}

// merge pose objects (later wins)
export function P(...ps) { const o = {}; for (const p of ps) Object.assign(o, p); return o; }

export function groundFig(f, y = 0) {
  f.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(f.group);
  f.group.position.y += y - box.min.y; f.group.updateMatrixWorld(true);
  return f;
}
// ground using only the meshes owned directly by the given joints (e.g. torso for lying figures)
export function groundParts(f, names, y) {
  f.group.updateMatrixWorld(true);
  let minY = Infinity; const v = new THREE.Vector3();
  for (const n of names) for (const c of f.joints[n].children) {
    if (!c.isMesh) continue; const pa = c.geometry.attributes.position;
    for (let i = 0; i < pa.count; i += 3) { v.fromBufferAttribute(pa, i).applyMatrix4(c.matrixWorld); if (v.y < minY) minY = v.y; }
  }
  f.group.position.y += y - minY; f.group.updateMatrixWorld(true); return f;
}
// place a seated figure so the underside of pelvis/thighs rests at seatY
export function seatFig(f, seatY) {
  f.group.updateMatrixWorld(true);
  let minY = Infinity; const v = new THREE.Vector3();
  const collect = (obj, depth) => {
    for (const c of obj.children) {
      if (c.isMesh) { c.geometry.computeBoundingBox(); const bb = c.geometry.boundingBox; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, y, z).applyMatrix4(c.matrixWorld); minY = Math.min(minY, v.y); } }
    }
  };
  const J = f.joints; collect(J.pelvis); collect(J.lHip); collect(J.rHip);
  f.group.position.y += seatY - minY; f.group.updateMatrixWorld(true);
  return f;
}

// world position of a point in a joint's local frame
export function jointPoint(f, name, local = [0, 0, 0]) {
  f.group.updateMatrixWorld(true);
  return new THREE.Vector3(...local).applyMatrix4(f.joints[name].matrixWorld);
}
export const HAND_CENTER = [0, -0.1, 0.0];
export const HAND_TIP = [0, -0.18, 0.0];

// Numeric IK: adjust shoulder xyz + elbow x (+ optional wrist) so that the hand point hits target (world).
export function reachIK(f, side, target, { local = HAND_CENTER, iters = 400, wrist = false, keep = 0.0005, elbowRange = [-150, -2], init } = {}) {
  const sh = side + 'Shoulder', el = side + 'Elbow', wr = side + 'Wrist';
  const J = f.joints; const d = Math.PI / 180;
  const params = [[sh, 0], [sh, 1], [sh, 2], [el, 0]]; if (wrist) { params.push([wr, 0], [wr, 2]); }
  if (init) for (const [k, v] of Object.entries(init)) J[k].rotation.set(v[0] * d, v[1] * d, v[2] * d);
  const start = params.map(([j, a]) => J[j].rotation.toArray()[a]);
  const T = target.clone();
  const cost = () => {
    f.group.updateMatrixWorld(true);
    const p = new THREE.Vector3(...local).applyMatrix4(J[wr].matrixWorld);
    let c = p.distanceToSquared(T);
    params.forEach(([j, a], i) => { const v = J[j].rotation.toArray()[a]; c += keep * (v - start[i]) ** 2; });
    const ex = J[el].rotation.x / d; if (ex > elbowRange[1]) c += (ex - elbowRange[1]) ** 2 * 1e-3; if (ex < elbowRange[0]) c += (ex - elbowRange[0]) ** 2 * 1e-3;
    return c;
  };
  const set = (j, a, v) => { const r = J[j].rotation; const arr = [r.x, r.y, r.z]; arr[a] = v; r.set(arr[0], arr[1], arr[2]); };
  let step = 8 * d; let best = cost();
  for (let it = 0; it < iters && step > 0.02 * d; it++) {
    let improved = false;
    for (const [j, a] of params) {
      const r0 = J[j].rotation.toArray()[a];
      for (const s of [step, -step]) { set(j, a, r0 + s); const c = cost(); if (c < best) { best = c; improved = true; break; } set(j, a, r0); }
    }
    if (!improved) step *= 0.6;
  }
  f.group.updateMatrixWorld(true);
  const p = new THREE.Vector3(...local).applyMatrix4(J[wr].matrixWorld);
  return { err: p.distanceTo(T), pose: Object.fromEntries([sh, el, wr].map(k => [k, J[k].rotation.toArray().slice(0, 3).map(x => +(x / d).toFixed(1))])) };
}

// read the current pose back as a pose object (degrees)
export function readPose(f) {
  const d = 180 / Math.PI; const o = {};
  for (const [k, g] of Object.entries(f.joints)) { if (k === 'neck') continue; o[k] = [g.rotation.x * d, g.rotation.y * d, g.rotation.z * d].map(x => +x.toFixed(1)); }
  return o;
}

// simple raycast-draped sheet over objects (duvet/blanket). region: [x0,x1,z0,z1] at base height y0
export function drapeSheet({ region, y0, objects, res = [90, 90], thick = 0.06, blur = 6, material, noise = 0.012, seed = 1, exclude = () => false, topFold = true, edgeFalloff = 0, zFalloff = 0 } = {}) {
  const [x0, x1, z0, z1] = region; const [nx, nz] = res;
  const ray = new THREE.Raycaster(); const dn = new THREE.Vector3(0, -1, 0);
  const meshes = []; for (const o of objects) o.traverse(c => { if (c.isMesh && !exclude(c)) meshes.push(c); });
  const W = nx + 1, idx = (i, j) => Math.min(nz, Math.max(0, j)) * W + Math.min(nx, Math.max(0, i));
  const H0 = new Float32Array(W * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz;
    ray.set(new THREE.Vector3(x, y0 + 5, z), dn); const hit = ray.intersectObjects(meshes, false)[0];
    H0[idx(i, j)] = Math.max(y0, hit ? hit.point.y : y0);
  }
  // separable box blur passes (soft duvet), then keep above body + thickness
  let H = H0.slice();
  const pass = (A, dx, dy, r) => { const B = new Float32Array(A.length); for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { let s = 0; for (let k = -r; k <= r; k++) s += A[idx(i + dx * k, j + dy * k)]; B[idx(i, j)] = s / (2 * r + 1); } return B; };
  for (let s = 0; s < blur; s++) { H = pass(H, 1, 0, 3); H = pass(H, 0, 1, 3); for (let k = 0; k < H.length; k++) H[k] = Math.max(H[k], H0[k] + thick * 0.6); }
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const gi = Math.round((x - x0) / (x1 - x0) * nx), gj = Math.round((z - z0) / (z1 - z0) * nz);
    let y = H[idx(gi, gj)] + thick * 0.4;
    y += noise * (Math.sin(x * 9.0 + Math.sin(z * 3.1 + seed) * 2.0) * 0.5 + Math.sin(z * 13.0 + x * 2.0 + seed) * 0.3);
    // rolled top edge: drop the first rows to the thickness below
    const tz = (z - z0) / (z1 - z0) * nz;
    if (topFold && tz < 2.5) y -= thick * (1 - tz / 2.5) * 1.2;
    if (edgeFalloff > 0) { const ex = Math.max(0, Math.min(x - x0, x1 - x)); if (ex < edgeFalloff) y = y0 + (y - y0) * Math.sqrt(ex / edgeFalloff); }
    if (zFalloff > 0) { const ez = Math.max(0, z1 - z); if (ez < zFalloff) y = y0 + (y - y0) * Math.sqrt(ez / zFalloff); }
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.H = H; mesh.userData.grid = { x0, x1, z0, z1, nx, nz };
  return mesh;
}

export function shadowAll(obj, cast = true, receive = true) { obj.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } }); return obj; }

// natural seated-on-ground variants for fire circles. kind: knees | side | cross | lean | lap
export function seatedPose(kind, rnd = Math.random, lean = 0) {
  const j = (a) => (rnd() - 0.5) * a;
  const head = [6 + j(10), j(40), j(8)];
  switch (kind) {
    case 'knees': return { lHip: [-118, 0, 10], rHip: [-114, 0, -8], lKnee: [138, 0, 0], rKnee: [134, 0, 0], chest: [16 + j(6), 0, lean], head, lShoulder: [-56, 0, 16], rShoulder: [-56, 0, -16], lElbow: [-44, -30, 0], rElbow: [-44, 30, 0] };
    case 'side': return { lHip: [-70, 30, 20], rHip: [-60, 30, -10], lKnee: [128, 0, 0], rKnee: [120, 0, 0], pelvis: [0, -14, 0], chest: [8, 10, lean], head, lShoulder: [-20, 0, 26], lElbow: [-10, 0, 0], rShoulder: [-44, 0, -12], rElbow: [-60, 0, 0] };
    case 'lean': return { lHip: [-82, 0, 30], rHip: [-82, 0, -30], lKnee: [126, 0, 0], rKnee: [126, 0, 0], lAnkle: [0, 0, -16], rAnkle: [0, 0, 16], chest: [10, 0, lean || 14], head: [8, j(20), (lean || 14) * 1.2], lShoulder: [-36, 0, 12], rShoulder: [-36, 0, -12], lElbow: [-60, 0, 0], rElbow: [-60, 0, 0] };
    default: return { lHip: [-84, 0, 30], rHip: [-84, 0, -30], lKnee: [126, 0, 0], rKnee: [126, 0, 0], lAnkle: [0, 0, -16], rAnkle: [0, 0, 16], chest: [10 + j(10), 0, lean], head, lShoulder: [-40, 0, 10 + j(10)], rShoulder: [-40, 0, -10 - j(10)], lElbow: [-58, 0, 0], rElbow: [-58, 0, 0] };
  }
}
