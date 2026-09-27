// Procedural painter's mannequin for three.js.
// Units: 1 "head" = 0.25; standing figure ~2.0 tall, feet on y = 0, facing +Z.
// Every segment is a lathe or scaled primitive so the silhouette reads as a real
// wooden artist's manikin: egg head on a peg neck, rounded chest block, ball waist,
// pelvis wedge, tapered limbs with ball joints, mitten hands, wedge feet.
import * as THREE from 'three';

const H = 0.25; // head unit

// ---------- wood texture (procedural, canvas) ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function valueNoise1D(rng, n) { const v = []; for (let i = 0; i < n; i++) v.push(rng()); return (x) => { const i = Math.floor(x) % n, f = x - Math.floor(x), a = v[(i + n) % n], b = v[(i + 1 + n) % n], s = f * f * (3 - 2 * f); return a + (b - a) * s; }; }

export function woodTextures({ base = [226, 192, 148], dark = [184, 140, 96], seed = 7, size = 512, grain = 1 } = {}) {
  const rng = mulberry32(seed);
  const n1 = valueNoise1D(rng, 64), n2 = valueNoise1D(rng, 64), n3 = valueNoise1D(rng, 256);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const img = g.createImageData(size, size);
  const r = document.createElement('canvas'); r.width = r.height = size;
  const gr = r.getContext('2d'); const rim = gr.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // beech: fine, nearly straight grain along v with gentle drift; low contrast
      const drift = n1(v * 2.2 + u * 0.3) * 0.9 + n2(v * 9) * 0.12;
      const line = Math.sin((u * 26 * grain + drift * 3.0) * Math.PI * 2);
      const s = Math.pow(0.5 + 0.5 * line, 6.0);
      const fine = n3(u * 220 + drift * 30) * 0.6 + n3(u * 511 + v * 2) * 0.4;
      const fleck = n3(u * 60 + v * 140) > 0.93 ? 0.35 : 0;
      const t = Math.min(1, s * 0.38 + fine * 0.22 + fleck * 0.3);
      const i = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) img.data[i + k] = base[k] * (1 - t) + dark[k] * t;
      img.data[i + 3] = 255;
      const rough = 160 + t * 60 + (fine - 0.5) * 24;
      rim.data[i] = rim.data[i + 1] = rim.data[i + 2] = rough; rim.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0); gr.putImageData(rim, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  const roughnessMap = new THREE.CanvasTexture(r); roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  return { map, roughnessMap, bumpMap: roughnessMap };
}

export function woodMaterial(opts = {}) {
  const tex = woodTextures(opts);
  return new THREE.MeshPhysicalMaterial({
    map: tex.map, roughnessMap: tex.roughnessMap, bumpMap: tex.bumpMap, bumpScale: opts.bumpScale ?? 0.6,
    roughness: opts.roughness ?? 0.62, metalness: 0, clearcoat: opts.clearcoat ?? 0.18, clearcoatRoughness: 0.55,
    sheen: 0.2, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffe2c0),
  });
}

// ---------- geometry helpers ----------
function lathe(profile, segs = 48) {
  // profile: array of [radius, y] from bottom (y=0) to top
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y));
  const g = new THREE.LatheGeometry(pts, segs);
  g.computeVertexNormals();
  return g;
}
function smoothProfile(ctrl, n = 28) {
  // Catmull-Rom through control points [r,y]
  const curve = new THREE.SplineCurve(ctrl.map(([r, y]) => new THREE.Vector2(r, y)));
  return curve.getPoints(n).map(p => [p.x, p.y]);
}
// Tapered limb running DOWN from its joint (joint at y=0, limb extends to -len)
function limbGeometry(len, r0, r1, bulge = 0.0, bulgeAt = 0.35) {
  const prof = smoothProfile([
    [0.0001, -len], [r1 * 0.72, -len + r1 * 0.25], [r1, -len * 0.92],
    [r1 + (r0 - r1) * (1 - bulgeAt) + bulge, -len * bulgeAt - (len * 0.5 - len * bulgeAt) * 0.2],
    [r0, -len * 0.12], [r0 * 0.78, -r0 * 0.25], [0.0001, 0.0]
  ], 40);
  prof.sort((a, b) => a[1] - b[1]);
  return lathe(prof);
}
function egg(height, width, pointyUp = true) {
  // egg: fuller at bottom (jaw) or top (skull). Painter's manikin head: fuller at top.
  const n = 40, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const y = t * height; const a = t * Math.PI;
    let r = Math.sin(a) * width * 0.5;
    const k = pointyUp ? (1 - 0.18 * (1 - t)) : (1 - 0.18 * t);
    pts.push([r * k, y]);
  }
  return lathe(pts, 48);
}
function ball(r) { return new THREE.SphereGeometry(r, 32, 20); }
function eggHead(h, w, d) {
  const g = new THREE.SphereGeometry(0.5, 64, 40);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = y < 0 ? 1 - 0.26 * Math.pow(-y / 0.5, 1.3) : 1 + 0.04 * (y / 0.5);
    x *= t; z *= t * (y < 0 ? 0.96 : 1);
    p.setXYZ(i, x * w, (y + 0.5) * h, z * d);
  }
  g.computeVertexNormals(); return g;
}

// ---------- the rig ----------
export const REST = {
  root: { pos: [0, 0, 0], rot: [0, 0, 0] },
  pelvis: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0],
  lShoulder: [0, 0, 6], lElbow: [0, 0, 0], lWrist: [0, 0, 0],
  rShoulder: [0, 0, -6], rElbow: [0, 0, 0], rWrist: [0, 0, 0],
  lHip: [0, 0, 2], lKnee: [0, 0, 0], lAnkle: [0, 0, 0],
  rHip: [0, 0, -2], rKnee: [0, 0, 0], rAnkle: [0, 0, 0],
};

export function buildMannequin({ material, jointMaterial, pinMaterial, castShadow = true } = {}) {
  material = material || woodMaterial();
  jointMaterial = jointMaterial || material;
  const pinMat = pinMaterial || new THREE.MeshStandardMaterial({ color: 0x8a8a86, metalness: 0.9, roughness: 0.35 });
  const root = new THREE.Group(); root.name = 'mannequin';
  const J = {};
  const add = (parent, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot);
    m.castShadow = castShadow; m.receiveShadow = true; parent.add(m); return m;
  };
  const joint = (name, parent, pos) => { const g = new THREE.Group(); g.name = name; g.position.set(...pos); parent.add(g); J[name] = g; return g; };

  // dimensions
  const hipY = 4.0 * H;            // hip joint height
  const thighL = 1.95 * H, shinL = 1.9 * H, footH = 0.18 * H;
  const pelvisH = 1.0 * H;
  const waistR = 0.24 * H;
  const chestH = 1.55 * H;
  const neckL = 0.42 * H;
  const headH = 1.0 * H, headW = 0.72 * H;
  const upperArmL = 1.45 * H, foreArmL = 1.25 * H, handL = 0.7 * H;
  const shoulderW = 0.98 * H;      // half width to shoulder joint centre
  const hipW = 0.4 * H;

  const pelvis = joint('pelvis', root, [0, hipY + 0.25 * H, 0]);
  // pelvis block: lathe, squashed front-back
  const pelvisGeo = lathe(smoothProfile([[0.0001, -0.58 * H], [0.4 * H, -0.54 * H], [0.66 * H, -0.28 * H], [0.7 * H, 0.0 * H], [0.6 * H, 0.26 * H], [0.42 * H, 0.42 * H], [0.0001, 0.46 * H]], 30));
  add(pelvis, pelvisGeo, material, [0, 0, 0], [1, 1, 0.74]);
  // waist ball
  add(pelvis, ball(waistR * 1.25), jointMaterial, [0, 0.46 * H, 0]);
  const chest = joint('chest', pelvis, [0, 0.5 * H, 0]);
  const chestGeo = lathe(smoothProfile([[0.0001, 0.0 * H], [0.38 * H, 0.05 * H], [0.52 * H, 0.35 * H], [0.7 * H, 0.9 * H], [0.78 * H, 1.22 * H], [0.66 * H, 1.5 * H], [0.3 * H, 1.66 * H], [0.0001, 1.7 * H]], 36));
  add(chest, chestGeo, material, [0, 0.1 * H, 0], [1.1, 1, 0.66]);
  // neck
  const neck = joint('neck', chest, [0, chestH + 0.1 * H, 0]);
  add(neck, ball(0.16 * H), jointMaterial, [0, 0.02 * H, 0]);
  const head = joint('head', neck, [0, 0.08 * H, 0]);
  add(head, new THREE.CylinderGeometry(0.16 * H, 0.18 * H, neckL, 24), material, [0, neckL * 0.4, 0]);
  add(head, eggHead(headH, headW, 0.86 * H), material, [0, neckL * 0.62, 0.03 * H], [1, 1, 1], [-0.1, 0, 0]);

  function arm(side) {
    const s = side === 'l' ? 1 : -1;
    const sh = joint(side + 'Shoulder', chest, [s * shoulderW, chestH - 0.18 * H, 0]);
    add(sh, ball(0.27 * H), jointMaterial);
    add(sh, limbGeometry(upperArmL, 0.235 * H, 0.155 * H, 0.02 * H), material, [0, -0.08 * H, 0]);
    const el = joint(side + 'Elbow', sh, [0, -upperArmL - 0.02 * H, 0]);
    add(el, ball(0.175 * H), jointMaterial);
    add(el, limbGeometry(foreArmL, 0.17 * H, 0.105 * H, 0.015 * H, 0.25), material, [0, -0.05 * H, 0]);
    const wr = joint(side + 'Wrist', el, [0, -foreArmL - 0.02 * H, 0]);
    add(wr, ball(0.115 * H), jointMaterial);
    // mitten hand: flattened lathe with thumb
    const handGeo = lathe(smoothProfile([[0.0001, -handL], [0.12 * H, -handL * 0.93], [0.2 * H, -handL * 0.62], [0.19 * H, -handL * 0.3], [0.11 * H, -0.06 * H], [0.0001, 0]], 24).sort((a, b) => a[1] - b[1]));
    add(wr, handGeo, material, [0, -0.04 * H, 0], [0.9, 1, 0.4]);
    add(wr, limbGeometry(0.28 * H, 0.055 * H, 0.038 * H), material, [s * 0.09 * H, -0.16 * H, 0.05 * H], [1, 1, 1], [0.35, 0, s * 0.45]);
  }
  arm('l'); arm('r');

  function leg(side) {
    const s = side === 'l' ? 1 : -1;
    const hp = joint(side + 'Hip', pelvis, [s * hipW, -0.3 * H, 0]);
    add(hp, ball(0.3 * H), jointMaterial);
    add(hp, limbGeometry(thighL, 0.34 * H, 0.19 * H, 0.03 * H, 0.3), material, [0, -0.08 * H, 0]);
    const kn = joint(side + 'Knee', hp, [0, -thighL - 0.03 * H, 0]);
    add(kn, ball(0.2 * H), jointMaterial);
    add(kn, limbGeometry(shinL, 0.21 * H, 0.12 * H, 0.04 * H, 0.28), material, [0, -0.06 * H, 0]);
    const an = joint(side + 'Ankle', kn, [0, -shinL - 0.05 * H, 0]);
    add(an, ball(0.13 * H), jointMaterial);
    // wedge foot pointing +Z
    const footGeo = lathe(smoothProfile([[0.0001, 0], [0.15 * H, 0.08 * H], [0.19 * H, 0.45 * H], [0.15 * H, 0.88 * H], [0.0001, 1.05 * H]], 24));
    add(an, footGeo, material, [0, -0.1 * H, -0.18 * H], [1, 1, 0.5], [Math.PI / 2, 0, 0]);
  }
  leg('l'); leg('r');

  // pins at the big joints (tiny metal screws) — the detail that says "artist's manikin"
  for (const n of ['lElbow', 'rElbow', 'lKnee', 'rKnee']) {
    const s = n[0] === 'l' ? 1 : -1;
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * H, 0.03 * H, 0.02 * H, 12), pinMat);
    pin.rotation.z = Math.PI / 2; pin.position.set(s * (n.includes('Knee') ? 0.2 : 0.175) * H, 0, 0); J[n].add(pin);
  }

  const api = {
    root, joints: J, H,
    setPose(pose) {
      const p = { ...REST, ...pose };
      const d = Math.PI / 180;
      root.position.set(...(p.root?.pos || [0, 0, 0]));
      root.rotation.set(...(p.root?.rot || [0, 0, 0]).map(x => x * d));
      for (const k of Object.keys(J)) {
        if (k === 'neck') continue;
        const r = p[k]; if (!r) continue;
        J[k].rotation.set(r[0] * d, r[1] * d, r[2] * d);
      }
      root.updateMatrixWorld(true);
      return api;
    },
    // drop figure so its lowest point touches y = floor
    ground(floor = 0) {
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      root.position.y += floor - box.min.y; root.updateMatrixWorld(true); return api;
    },
    worldOf(name) { const v = new THREE.Vector3(); J[name].getWorldPosition(v); return v; },
  };
  api.setPose(REST);
  return api;
}

// ---------- pose library (degrees; X = flex, Y = twist, Z = side) ----------
// Arms hang along -Y. Negative X on shoulder = raise forward. Elbow negative X = bend forward.
// Hips negative X = thigh forward; knees positive X = bend back.
export const POSES = {
  stand: {},
  standTall: { chest: [-3, 0, 0], head: [-4, 0, 0] },
  walk: { lHip: [-22, 0, 3], lKnee: [10, 0, 0], lAnkle: [4, 0, 0], rHip: [16, 0, -3], rKnee: [26, 0, 0], rAnkle: [-14, 0, 0], lShoulder: [16, 0, 7], rShoulder: [-18, 0, -7], lElbow: [-12, 0, 0], rElbow: [-24, 0, 0], chest: [4, 0, 0], head: [-2, 0, 0] },
  slump: { chest: [18, 0, 0], head: [22, 0, 0], lShoulder: [-4, 0, 4], rShoulder: [-4, 0, -4], lElbow: [-12, 0, 0], rElbow: [-12, 0, 0] },
  sitChair: { lHip: [-88, 0, 4], rHip: [-88, 0, -4], lKnee: [90, 0, 0], rKnee: [90, 0, 0], lAnkle: [-2, 0, 0], rAnkle: [-2, 0, 0], chest: [6, 0, 0], lShoulder: [-28, 0, 8], rShoulder: [-28, 0, -8], lElbow: [-58, 0, 0], rElbow: [-58, 0, 0] },
  sitPhone: { lHip: [-86, 0, 5], rHip: [-86, 0, -5], lKnee: [88, 0, 0], rKnee: [88, 0, 0], chest: [22, 0, 0], head: [28, 0, 0], lShoulder: [-20, -10, 12], rShoulder: [-20, 10, -12], lElbow: [-100, 0, -10], rElbow: [-100, 0, 10], lWrist: [0, 0, 10], rWrist: [0, 0, -10] },
  sitHugKnees: { lHip: [-120, 0, 6], rHip: [-120, 0, -6], lKnee: [140, 0, 0], rKnee: [140, 0, 0], chest: [30, 0, 0], head: [30, 0, 0], lShoulder: [-58, 0, 14], rShoulder: [-58, 0, -14], lElbow: [-40, -30, 0], rElbow: [-40, 30, 0] },
  sitCrossFire: { lHip: [-80, 0, 38], rHip: [-80, 0, -38], lKnee: [128, 0, 0], rKnee: [128, 0, 0], lAnkle: [0, 0, -20], rAnkle: [0, 0, 20], chest: [10, 0, 0], head: [8, 0, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-55, 0, 0], rElbow: [-55, 0, 0] },
  kneel: { lHip: [-8, 0, 3], rHip: [-8, 0, -3], lKnee: [118, 0, 0], rKnee: [118, 0, 0], lAnkle: [40, 0, 0], rAnkle: [40, 0, 0], chest: [16, 0, 0], head: [24, 0, 0], lShoulder: [-12, 0, 6], rShoulder: [-12, 0, -6], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0] },
  kneelGrief: { lHip: [-10, 0, 3], rHip: [-10, 0, -3], lKnee: [120, 0, 0], rKnee: [120, 0, 0], lAnkle: [40, 0, 0], rAnkle: [40, 0, 0], chest: [34, 0, 0], head: [30, 0, 0], lShoulder: [-60, 0, -8], rShoulder: [-60, 0, 8], lElbow: [-105, 0, 0], rElbow: [-105, 0, 0] },
  reachUp: { lShoulder: [-160, 0, 8], lElbow: [-10, 0, 0], rShoulder: [-8, 0, -8], chest: [-6, 0, 0], head: [-20, 0, 0] },
  reachForward: { rShoulder: [-80, 0, -4], rElbow: [-6, 0, 0], lShoulder: [-10, 0, 6], chest: [12, 0, 0], head: [4, 0, 0], lHip: [4, 0, 2], rHip: [-10, 0, -2], rKnee: [8, 0, 0] },
  lieCurl: { root: { pos: [0, 0, 0], rot: [0, 0, 90] }, lHip: [-80, 0, 0], rHip: [-70, 0, 0], lKnee: [100, 0, 0], rKnee: [90, 0, 0], chest: [26, 0, 0], head: [20, 0, 0], lShoulder: [-60, 0, 0], rShoulder: [-70, 0, 0], lElbow: [-90, 0, 0], rElbow: [-80, 0, 0] },
  carry: { lShoulder: [-150, 0, 20], lElbow: [-40, 0, 0], rShoulder: [-150, 0, -20], rElbow: [-40, 0, 0], head: [-4, 0, 0] },
  armsOpen: { lShoulder: [-20, 0, 70], rShoulder: [-20, 0, -70], lElbow: [-10, 0, 0], rElbow: [-10, 0, 0], chest: [-4, 0, 0], head: [-6, 0, 0] },
  handToChest: { rShoulder: [-40, 0, -20], rElbow: [-110, -30, 0], chest: [8, 0, 0], head: [18, 0, 0] },
  headInHands: { lHip: [-86, 0, 8], rHip: [-86, 0, -8], lKnee: [88, 0, 0], rKnee: [88, 0, 0], chest: [40, 0, 0], head: [34, 0, 0], lShoulder: [-40, 0, -4], rShoulder: [-40, 0, 4], lElbow: [-138, 0, 0], rElbow: [-138, 0, 0], lWrist: [-20, 0, 0], rWrist: [-20, 0, 0] },
};
