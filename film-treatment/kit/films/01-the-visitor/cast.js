// THE VISITOR — cast, props, poses and stop-motion helpers.
import * as THREE from 'three';
import { woodTextures, woodMaterial } from '../../mannequin.js';
import * as F from '../../scenes/E/lib/figs.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as MT from '../../scenes/E/lib/mat.js';
import * as E from '../../film/engine.js';
import { feedTex, chatTex } from './set.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// ------------------------------------------------------------------ dust (the visitor's only difference)
const BEECH = { base: [226, 192, 148], dark: [184, 140, 96] };
function dustCanvas(srcCanvas, density, seed) {
  const W = srcCanvas.width, H = srcCanvas.height;
  const od = srcCanvas.getContext('2d').getImageData(0, 0, W, H).data;
  const col = document.createElement('canvas'); col.width = W; col.height = H; const gc = col.getContext('2d');
  const rough = document.createElement('canvas'); rough.width = W; rough.height = H; const gr = rough.getContext('2d');
  const cd = gc.createImageData(W, H), rd = gr.createImageData(W, H);
  const N = MT.makeNoise(seed); const dust = [170, 94, 50];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = 1 - y / H; // v=0 bottom of the canvas (ankle end of a lathe)
    const n = N.fbm(u * 7, v * 9, 4, 7) * 0.7 + N.fbm(u * 40, v * 40, 2, 40) * 0.3;
    const a = clamp(density(u, v) * (0.55 + n * 0.9) - 0.1) * 0.9;
    const i = (y * W + x) * 4, k2 = 0.8 + n * 0.35;
    for (let k = 0; k < 3; k++) cd.data[i + k] = od[i + k] * (1 - a) + dust[k] * k2 * a;
    cd.data[i + 3] = 255;
    rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = 170 + a * 80 + (n - 0.5) * 30 * a; rd.data[i + 3] = 255;
  }
  gc.putImageData(cd, 0, 0); gr.putImageData(rd, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  const rmap = new THREE.CanvasTexture(rough); rmap.wrapS = rmap.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshPhysicalMaterial({ map, roughnessMap: rmap, bumpMap: rmap, bumpScale: 0.9, roughness: 0.75, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.7, sheen: 0.1, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xd09070) });
}
function applyDust(f) {
  const tex = woodTextures({ seed: 5, ...BEECH });
  const src = tex.map.image;
  const shin = dustCanvas(src, (u, v) => 1.25 - v * 1.7, 41);       // heavy at the ankle, gone by 3/4 up the shin
  const foot = dustCanvas(src, () => 1.1, 42);
  const knee = dustCanvas(src, (u, v) => 0.35 - v * 0.6, 43);
  const hand = dustCanvas(src, (u, v) => (Math.abs(u - 0.3) < 0.14 && v > 0.15 && v < 0.7 ? 0.55 : 0.0), 44);
  for (const s of ['l', 'r']) {
    const kn = f.joints[s + 'Knee'].children.filter(c => c.isMesh && c.material.map);
    if (kn[0]) kn[0].material = knee; if (kn[1]) kn[1].material = shin;
    for (const c of f.joints[s + 'Ankle'].children) if (c.isMesh) c.material = foot;
  }
  const hm = f.joints.rWrist.children.filter(c => c.isMesh);
  if (hm[1]) hm[1].material = hand;
}

// ------------------------------------------------------------------ planting
const _v = new THREE.Vector3();
function lowestOf(f, names, step = 3) {
  let minY = Infinity;
  for (const n of names) for (const c of f.joints[n].children) {
    if (!c.isMesh) continue;
    const pa = c.geometry.attributes.position; const mw = c.matrixWorld;
    for (let i = 0; i < pa.count; i += step) { _v.fromBufferAttribute(pa, i).applyMatrix4(mw); if (_v.y < minY) minY = _v.y; }
  }
  return minY;
}
// pose + place a figure: rests on whichever support is higher (feet on the floor, or pelvis/thighs on a seat)
export function place(f, pose, { pos = [0, 0, 0], rotY = 0, floor = 0, seat = null, lift = 0 } = {}) {
  f.setPose(pose);
  f.group.position.set(pos[0], 0, pos[2]); f.group.rotation.y = rotY * Math.PI / 180;
  f.group.updateMatrixWorld(true);
  let dy = floor - lowestOf(f, ['lAnkle', 'rAnkle', 'lKnee', 'rKnee']);
  if (seat !== null) dy = Math.max(dy, seat - lowestOf(f, ['pelvis', 'lHip', 'rHip']));
  f.group.position.y = dy + lift; f.group.updateMatrixWorld(true);
}
export const jp = (f, name, local = [0, 0, 0]) => F.jointPoint(f, name, local);
export const HAND = [0, -0.1, 0.02];

// ------------------------------------------------------------------ poses (degrees; X flex, Y twist, Z side)
export const P = {
  STAND: { pelvis: [0, 0, 0], chest: [2, 0, 0], head: [2, 0, 0], lShoulder: [3, 0, 5], rShoulder: [3, 0, -5], lElbow: [-10, 0, 0], rElbow: [-10, 0, 0], lWrist: [0, 0, 0], rWrist: [0, 0, 0], lHip: [0, 0, 2], rHip: [0, 0, -2], lKnee: [2, 0, 0], rKnee: [2, 0, 0], lAnkle: [0, 0, 0], rAnkle: [0, 0, 0] },
  SIT: { pelvis: [0, 0, 0], chest: [6, 0, 0], head: [4, 0, 0], lHip: [-86, 0, 7], rHip: [-86, 0, -7], lKnee: [88, 0, 0], rKnee: [88, 0, 0], lAnkle: [-2, 0, 0], rAnkle: [-2, 0, 0], lShoulder: [-26, 0, 8], rShoulder: [-26, 0, -8], lElbow: [-56, 0, 0], rElbow: [-56, 0, 0], lWrist: [0, 0, 0], rWrist: [0, 0, 0] },
};
P.SIT_HUNCH = { ...P.SIT, chest: [26, 0, 0], head: [34, 0, 0], lHip: [-82, 0, 8], rHip: [-82, 0, -8], lKnee: [86, 0, 0], rKnee: [86, 0, 0] };
// walk contacts (left leg forward) and passing (left leg swinging)
P.WALK_L = { lHip: [-24, 0, 3], lKnee: [8, 0, 0], lAnkle: [6, 0, 0], rHip: [16, 0, -3], rKnee: [24, 0, 0], rAnkle: [-16, 0, 0], lShoulder: [16, 0, 6], rShoulder: [-16, 0, -6], lElbow: [-12, 0, 0], rElbow: [-24, 0, 0], chest: [4, 0, 0], pelvis: [0, 0, 0] };
P.PASS_L = { lHip: [-10, 0, 2], lKnee: [38, 0, 0], lAnkle: [-8, 0, 0], rHip: [2, 0, -2], rKnee: [4, 0, 0], rAnkle: [0, 0, 0], lShoulder: [2, 0, 5], rShoulder: [-2, 0, -5], lElbow: [-16, 0, 0], rElbow: [-16, 0, 0], chest: [3, 0, 0], pelvis: [0, 0, 0] };
export function mirror(p) {
  const o = {};
  for (const [k, v] of Object.entries(p)) {
    if (!Array.isArray(v)) { o[k] = v; continue; }
    const m = k[0] === 'l' && k[1] === k[1].toUpperCase() ? 'r' + k.slice(1) : k[0] === 'r' && k[1] === k[1].toUpperCase() ? 'l' + k.slice(1) : k;
    o[m] = [v[0], -v[1], -v[2]];
  }
  return o;
}
P.WALK_R = mirror(P.WALK_L); P.PASS_R = mirror(P.PASS_L);
const LEGS = ['lHip', 'lKnee', 'lAnkle', 'rHip', 'rKnee', 'rAnkle'];
const ARMS = ['lShoulder', 'lElbow', 'lWrist', 'rShoulder', 'rElbow', 'rWrist'];
export const pick = (p, keys) => Object.fromEntries(keys.filter(k => p[k]).map(k => [k, p[k]]));

// cumulative pose track: each key merges into the previous one
export function PT(base, keys, defEase = 'inOut') {
  let cur = { ...base }; const full = [];
  for (const [t, p, e] of keys) { cur = { ...cur, ...p }; full.push([t, cur, e]); }
  return E.poseTrack(full, defEase);
}
export const TR = (keys, e = 'inOut') => E.track(keys, e);

// walk along a polyline; returns {pose, pos, rotY}. upper: pose overrides for chest/head/arms (arms swing unless given)
export function walkAt(t, { t0, t1, path, steps, upper = null, armSwing = 1, rotOffset = 0, turnIn = 0.15 }) {
  const u = clamp((t - t0) / (t1 - t0));
  // arc-length param
  const seg = []; let tot = 0;
  for (let i = 0; i < path.length - 1; i++) { const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][2] - path[i][2]); seg.push(d); tot += d; }
  const ue = u < 0.08 ? u * u / 0.16 : u > 0.92 ? 1 - (1 - u) * (1 - u) / 0.16 : u - 0.04; // gentle start/stop, ~constant speed
  const un = clamp(ue / 0.92);
  let s = un * tot, i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
  const f = seg[i] > 0 ? clamp(s / seg[i]) : 0;
  const a = path[i], b = path[i + 1];
  const pos = [lerp(a[0], b[0], f), 0, lerp(a[2], b[2], f)];
  // heading: blend toward the next segment near the corner
  const hd = (p, q) => Math.atan2(q[0] - p[0], q[2] - p[2]) * 180 / Math.PI;
  let rotY = hd(a, b);
  if (i < seg.length - 1 && f > 1 - turnIn) { let r2 = hd(b, path[i + 2]); let dr = ((r2 - rotY + 540) % 360) - 180; rotY += dr * sstep(1 - turnIn, 1, f); }
  // leg cycle
  const ph = un * steps; const k = Math.min(steps - 1, Math.floor(ph)); const g = ph - k;
  const leftSwing = k % 2 === 0;
  const A = leftSwing ? P.WALK_R : P.WALK_L, M = leftSwing ? P.PASS_L : P.PASS_R, B = leftSwing ? P.WALK_L : P.WALK_R;
  let legs = g < 0.5 ? E.slerpPose(A, M, E.ease.inOut(g * 2)) : E.slerpPose(M, B, E.ease.inOut((g - 0.5) * 2));
  const w = sstep(0, 0.1, u) * (1 - sstep(0.9, 1, u));
  const full = E.slerpPose(P.STAND, legs, w);
  let pose = { ...P.STAND, ...pick(full, LEGS), chest: full.chest, pelvis: full.pelvis };
  if (armSwing) Object.assign(pose, E.slerpPose(pick(P.STAND, ARMS), pick(full, ARMS), armSwing));
  if (upper) Object.assign(pose, upper);
  // a little bob: stride phases at passing are higher (handled by planting); tiny chest bounce
  return { pose, pos, rotY: rotY + rotOffset, moving: u > 0 && u < 1 };
}

// ------------------------------------------------------------------ cast
export function makeCast() {
  const root = new THREE.Group(); root.name = 'cast';
  const host = F.figure({ kind: 'beech', seed: 5, pose: P.STAND });
  const visitor = F.figure({ kind: 'beech', seed: 5, pose: P.STAND });
  applyDust(visitor);
  const lightOak = woodMaterial({ seed: 14, base: [216, 180, 132], dark: [168, 128, 86], roughness: 0.6, clearcoat: 0.2, bumpScale: 0.5 });
  const friends = [
    F.figure({ kind: 'maple', seed: 11, pose: P.STAND, scale: 0.97 }),
    F.figure({ kind: 'ash', seed: 12, pose: P.STAND, scale: 1.02 }),
    F.figure({ kind: 'oak', seed: 13, pose: P.STAND, scale: 0.99 }),
    F.figure({ kind: 'beech', seed: 14, pose: P.STAND, scale: 0.94 }),
  ];
  friends[3].group.traverse(o => { if (o.isMesh && o.material && o.material.map) o.material = lightOak; });
  for (const f of [host, visitor, ...friends]) root.add(f.group);
  // phone (screen = scrolling feed or chat)
  const feed = feedTex(5); feed.repeat.set(1, 740 / 2600); feed.offset.set(0, 1 - 740 / 2600);
  const phone = PR.phone({ screenTex: feed, emissive: 2.4 });
  phone.userData.feed = feed; root.add(phone);
  const scr = phone.userData.screen;
  const chat = { k: -1, tex: null };
  phone.userData.setChat = (typed, sent) => {
    const key = sent ? 99 : Math.round(typed * 7);
    if (key === chat.k) return; chat.k = key;
    if (chat.tex) chat.tex.dispose();
    chat.tex = chatTex({ typed, sent }); scr.material.map = chat.tex; scr.material.needsUpdate = true;
  };
  phone.userData.setFeed = (scroll) => { if (scr.material.map !== feed) { scr.material.map = feed; scr.material.needsUpdate = true; chat.k = -1; } feed.offset.y = 1 - 740 / 2600 - scroll; };
  phone.userData.bright = (k) => { scr.material.color.setScalar(k); };
  // food + drink the friends bring
  const food = [];
  { const g = new THREE.Group(); // pot with lid
    g.add(PR.mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.14, 28), new THREE.MeshStandardMaterial({ color: 0x9a3a28, roughness: 0.4, metalness: 0.2 }), [0, 0.07, 0]));
    g.add(PR.mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.02, 28), new THREE.MeshStandardMaterial({ color: 0x7a2e20, roughness: 0.4 }), [0, 0.15, 0]));
    g.add(PR.mesh(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }), [0, 0.17, 0]));
    food.push(g); }
  { const g = new THREE.Group(); // flat cardboard box (plain, no logo)
    g.add(PR.mesh(PR.rbox(0.36, 0.05, 0.36, 0.006, 1), new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.9 }), [0, 0.025, 0])); food.push(g); }
  { const g = new THREE.Group(); // paper bag with bread
    g.add(PR.mesh(PR.rbox(0.2, 0.28, 0.13, 0.01, 1), new THREE.MeshStandardMaterial({ color: 0xb58a5a, roughness: 0.95 }), [0, 0.14, 0]));
    g.add(PR.mesh(new THREE.CapsuleGeometry(0.035, 0.22, 6, 12), new THREE.MeshStandardMaterial({ color: 0xd9a560, roughness: 0.8 }), [0.03, 0.3, 0], [0, 0, 0.25]));
    food.push(g); }
  { const g = new THREE.Group(); // salad bowl
    g.add(PR.mesh(new THREE.SphereGeometry(0.15, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.4, side: THREE.DoubleSide }), [0, 0.15, 0], [0, 0, 0]));
    g.add(PR.mesh(new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5f8a3a, roughness: 0.8 }), [0, 0.08, 0], [0, 0, 0]));
    food.push(g); }
  for (const g of food) root.add(g);
  const glass = PR.glassOfWater({ pos: [0, 0, 0] }); root.add(glass);
  return { root, host, visitor, friends, phone, food, glass, all: [host, visitor, ...friends] };
}

// phone in the right hand, screen facing out of the palm, top toward the fingertips
const PHONE_Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(-1, 0, 0), V3(0, 0, 1), V3(0, 1, 0)));
export function phoneInHand(phone, f, side = 'r') {
  const wr = f.joints[side + 'Wrist'];
  if (phone.parent !== wr) wr.add(phone);
  phone.position.set(0, -0.1, 0.028); phone.quaternion.copy(PHONE_Q); phone.updateMatrixWorld(true);
}
export function phonePark(phone, root, pos, rotY = 0) {
  if (phone.parent !== root) root.add(phone);
  phone.position.set(...pos); phone.rotation.set(0, rotY, 0); phone.updateMatrixWorld(true);
}
// world-space screen centre + normal (for the glow light)
export function phoneGlow(phone) {
  phone.updateMatrixWorld(true);
  const c = V3(0, 0.006, 0).applyMatrix4(phone.matrixWorld);
  const n = V3(0, 1, 0).transformDirection(phone.matrixWorld);
  return { c, n };
}
