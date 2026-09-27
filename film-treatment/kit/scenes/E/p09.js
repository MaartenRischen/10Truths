// P09 THE LOOP — (a) a hungry manikin reaching up into a fruit tree. (b) the same manikin lying back in the grass, satisfied, eyes to the sky.
// Match: the same silhouette in frame — standing reach (camera level) becomes lying stretch (camera overhead).
import * as THREE from 'three';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import { mulberry32 } from './lib/cine.js';

const REACH = { rShoulder: [-172, 0, -6], rElbow: [-8, 0, 0], rWrist: [-10, 0, 0], lShoulder: [-10, 0, 14], lElbow: [-20, 0, 0], chest: [-6, 0, 0], head: [-26, 0, 0], lHip: [2, 0, 3], rHip: [-4, 0, -3], rKnee: [6, 0, 0] };

function fruitTree({ pos = [0, 0, 0], seed = 3, height = 4.2, spread = 3.4, fruitCol = [0.95, 0.62, 0.18] } = {}) {
  const rng = mulberry32(seed); const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 });
  const base = new THREE.Vector3(0, 0, 0), fork = new THREE.Vector3(0.1, height * 0.42, 0);
  g.add(PR.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, new THREE.Vector3(0.05, height * 0.2, 0.02), fork]), 12, 0.13, 10), bark));
  const tips = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + rng(); const r = spread * (0.3 + rng() * 0.25); const tip = new THREE.Vector3(Math.cos(a) * r, height * (0.62 + rng() * 0.2), Math.sin(a) * r); tips.push(tip); const mid = fork.clone().lerp(tip, 0.5); mid.y += 0.2; g.add(PR.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([fork, mid, tip]), 10, 0.05, 6), bark)); }
  const lt = S.leafClusterTex(seed + 5);
  const lm = new THREE.MeshStandardMaterial({ map: lt, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, color: new THREE.Color(0.55, 0.75, 0.3).multiplyScalar(2.6) });
  const n = 5200; const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), lm, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    // points in an oblate ellipsoid canopy, denser at the shell
    const u = rng() * Math.PI * 2, vv = Math.acos(2 * rng() - 1) , rr = 0.72 + 0.28 * Math.cbrt(rng());
    t.set(Math.cos(u) * Math.sin(vv) * spread * 0.62 * rr, height * 0.8 + Math.cos(vv) * height * 0.26 * rr, Math.sin(u) * Math.sin(vv) * spread * 0.62 * rr);
    e.set(rng() * 6, rng() * 6, rng() * 6); q.setFromEuler(e); const sc = 0.24 + rng() * 0.12; s.set(sc, sc, sc); m4.compose(t, q, s); im.setMatrixAt(i, m4);
  }
  im.castShadow = true; im.receiveShadow = true; g.add(im);
  // fruit clusters on the underside
  const fm = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(...fruitCol), roughness: 0.35, clearcoat: 0.6 });
  const fruits = [];
  for (let i = 0; i < 70; i++) {
    const u = rng() * Math.PI * 2, r = spread * 0.55 * Math.sqrt(rng());
    const p = new THREE.Vector3(Math.cos(u) * r, height * 0.62 + rng() * 0.25, Math.sin(u) * r);
    const f = PR.mesh(new THREE.SphereGeometry(0.045 + rng() * 0.015, 14, 10), fm, p.toArray()); f.scale.y = 1.15; g.add(f); fruits.push(p);
  }
  g.position.set(...pos); g.userData.fruits = fruits;
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 40));
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  const sunDir = new THREE.Vector3(-0.82, 0.42, -0.3).normalize();
  // figure-local camera: offsets in (right, up, fwd) relative to the chest; identical for both shots
  const camL = (q.get('cl') || '0.75,-0.2,5.6').split(',').map(Number), lookL = (q.get('ll') || '0.55,0.05,0').split(',').map(Number);
  let P, frame;
  const pose = { ...REACH };
  if (v === 'a') {
    P = F.figure({ kind: 'beech', seed: 5, rotY: 20, pose }); F.groundFig(P, 0); scene.add(P.group);
    const ry = 20 * Math.PI / 180;
    frame = { right: new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry)), up: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)) };
    const hand = F.jointPoint(P, 'rWrist', [0, -0.16, 0.02]);
    // the tree grows so that one fruit hangs right at the fingertips
    const tree = fruitTree({ pos: [hand.x + 0.6, 0, hand.z - 0.3], seed: 4, height: 3.75, spread: 3.8 }); scene.add(tree);
    const fm = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.95, 0.6, 0.16), roughness: 0.35, clearcoat: 0.6 });
    const f0 = PR.mesh(new THREE.SphereGeometry(0.06, 16, 12), fm, [hand.x + 0.01, hand.y + 0.07, hand.z]); f0.scale.y = 1.15; scene.add(f0);
    const stem = PR.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 5), new THREE.MeshStandardMaterial({ color: 0x4a3a2c }), [hand.x + 0.2, hand.y + 0.33, hand.z - 0.05], [0, 0, 0.7]); scene.add(stem);
    scene.add(PR.daySky({ zenith: [0.12, 0.18, 0.36], horizon: [1.3, 0.8, 0.42], ground: [0.25, 0.18, 0.1], sunDir: sunDir.toArray(), sunColor: [60, 36, 14], sunSize: 0.99955, glow: [2.6, 1.3, 0.45], glowPow: 8 }));
    scene.fog = new THREE.FogExp2(new THREE.Color(0.9, 0.62, 0.36).multiplyScalar(0.5), 0.008);
    scene.add(S.earthGround({ size: 300, repeat: 90, base: [128, 102, 70], dark: [90, 70, 48], seed: 9 }));
    const gm = S.grassMaterial({ sunDir: sunDir.toArray(), translAmt: 1.6 });
    scene.add(S.grassField({ area: [14, 12], center: [0, 0, 1], density: 160, height: [0.2, 0.6], seed: 11, material: gm, clumps: 300, clumpR: 0.3, heads: 0.2, exclude: (x, z) => Math.hypot(x, z) < 0.3 }));
    scene.add(S.grassField({ area: [120, 60], center: [0, 0, -40], density: 5, height: [0.4, 0.9], width: [0.03, 0.05], seed: 12, material: gm, exclude: (x, z) => z > -5 }));
    scene.add(S.acacia({ pos: [-13, 0, -28], height: 6, spread: 7, seed: 13, leafCards: 1400 }));
    scene.add(S.acacia({ pos: [9, 0, -45], height: 7, spread: 8, seed: 14, silhouette: true, leafColor: [0.1, 0.08, 0.05] }));
  } else {
    // lying back in the grass: the same reaching arm, now resting above the head; the other hand holds a bitten fruit on the belly
    Object.assign(pose, { head: [-4, 12, 0], lShoulder: [-40, 0, 10], lElbow: [-100, 0, 0], lWrist: [0, 0, 0], lHip: [-8, 0, 6], rHip: [-26, 0, -4], rKnee: [44, 0, 0], lKnee: [6, 0, 0], chest: [0, 0, 0] });
    P = F.figure({ kind: 'beech', seed: 5, pose });
    P.group.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); F.groundParts(P, ['pelvis', 'chest'], 0.025); scene.add(P.group);
    frame = { right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, -1), fwd: new THREE.Vector3(0, 1, 0) };
    const lh = F.jointPoint(P, 'lWrist', [0, -0.12, 0.05]);
    const fm = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.95, 0.6, 0.16), roughness: 0.35, clearcoat: 0.6 });
    const f0 = PR.mesh(new THREE.SphereGeometry(0.06, 16, 12), fm, [lh.x, lh.y + 0.04, lh.z]); scene.add(f0);
    const bite = PR.mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf2d890, roughness: 0.6 }), [lh.x + 0.03, lh.y + 0.07, lh.z - 0.02]); scene.add(bite);
    scene.add(S.earthGround({ size: 60, repeat: 24, base: [104, 88, 58], dark: [70, 60, 40], seed: 9 }));
    const gm = S.grassMaterial({ sunDir: sunDir.toArray(), translAmt: 1.0 });
    // pressed grass: excluded along the body silhouette only
    const pts = ['head', 'chest', 'pelvis', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle', 'rElbow', 'rWrist', 'lElbow', 'lWrist', 'rShoulder', 'lShoulder'].map(n => F.jointPoint(P, n));
    const segs = [['head', 'chest'], ['chest', 'pelvis'], ['pelvis', 'lKnee'], ['pelvis', 'rKnee'], ['lKnee', 'lAnkle'], ['rKnee', 'rAnkle'], ['rShoulder', 'rElbow'], ['rElbow', 'rWrist'], ['lShoulder', 'lElbow'], ['lElbow', 'lWrist']].map(([a2, b2]) => [F.jointPoint(P, a2), F.jointPoint(P, b2)]);
    const near = (x, z) => { let dm = 1e9; for (const [A, B] of segs) { const ax = B.x - A.x, az = B.z - A.z; const t = Math.max(0, Math.min(1, ((x - A.x) * ax + (z - A.z) * az) / (ax * ax + az * az + 1e-9))); const dx = x - (A.x + ax * t), dz = z - (A.z + az * t); dm = Math.min(dm, Math.hypot(dx, dz)); } return dm; };
    const bc = F.jointPoint(P, 'chest');
    scene.add(S.grassField({ area: [9, 7], center: [bc.x, 0, bc.z], density: 300, height: [0.1, 0.34], width: [0.012, 0.02], seed: 21, material: gm, lean: 0.8, clumps: 500, clumpR: 0.22, heads: 0.12, exclude: (x, z) => near(x, z) < 0.16, colors: [[0.62, 0.55, 0.3], [0.7, 0.6, 0.34], [0.5, 0.48, 0.26], [0.55, 0.52, 0.24]] }));
    // flattened grass lying under/around the body
    scene.add(S.grassField({ area: [3, 3.5], center: [bc.x, 0.005, bc.z - 0.3], density: 300, height: [0.1, 0.22], width: [0.012, 0.02], seed: 22, material: gm, lean: 3.0, exclude: (x, z) => near(x, z) > 0.28 }));
  }
  const chest = F.jointPoint(P, 'chest', [0, 0.2, 0]);
  const loc = (o) => chest.clone().addScaledVector(frame.right, o[0]).addScaledVector(frame.up, o[1]).addScaledVector(frame.fwd, o[2]);
  const camPos = loc(camL), look = loc(lookL);
  const cam = new THREE.PerspectiveCamera(+(q.get('fov') || 33), w / h, 0.05, 400); cam.up.copy(frame.up); cam.position.copy(camPos); cam.lookAt(look);
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.78, 0.5), 6.5); sun.position.copy(chest).addScaledVector(sunDir, 30); sun.target.position.copy(chest); sun.castShadow = true; sun.shadow.mapSize.set(3072, 3072);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 70 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target); lights.push({ l: sun, base: sun.position.clone(), r: 0.3 });
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.5, 0.6, 0.85), new THREE.Color(0.5, 0.36, 0.2), 1.0));
  scene.environment = C.gradientEnv(renderer, { top: [0.25, 0.35, 0.6], horizon: [1.0, 0.7, 0.45], bottom: [0.3, 0.22, 0.14] }); scene.environmentIntensity = 0.6;
  const focus = cam.position.distanceTo(chest);
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 2.2, dofScale: 1.3, seed: 9,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: 'ancestral', gradeOverride: { contrast: 0.42, saturation: 1.1 },
    bloom: { strength: 0.1, radius: 0.55, threshold: 2.2 },
    streak: { threshold: 8.0, strength: 0.12, tint: [1.0, 0.7, 0.4] },
  });
}
