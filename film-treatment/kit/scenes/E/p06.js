// P06 HUMAN-SIZED — (a) golden hour: the band walking through tall grass, a child on shoulders. (b) night: a close circle around the fire.
import * as THREE from 'three';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import { mulberry32 } from './lib/cine.js';

export function walkPose(phase = 0, seed = 1, extra = {}) {
  // phase in [0,1): 0 = left foot forward, 0.5 = right foot forward
  const s = Math.cos(phase * Math.PI * 2);
  const r = mulberry32(seed); const j = () => (r() - 0.5);
  return {
    lHip: [-24 * s + 2, 0, 3], rHip: [24 * s + 2, 0, -3], lKnee: [s < 0 ? 30 : 8, 0, 0], rKnee: [s > 0 ? 30 : 8, 0, 0],
    lAnkle: [s > 0 ? 6 : -10, 0, 0], rAnkle: [s < 0 ? 6 : -10, 0, 0],
    lShoulder: [18 * s, 0, 7], rShoulder: [-18 * s, 0, -7], lElbow: [-14 - 8 * Math.max(0, -s), 0, 0], rElbow: [-14 - 8 * Math.max(0, s), 0, 0],
    chest: [4 + j() * 4, j() * 6, 0], head: [-2 + j() * 8, j() * 20, 0], pelvis: [0, j() * 6, 0], ...extra,
  };
}

export function childOnShoulders(parent, kind = 'maple', seed = 44) {
  const ch = F.figure({ kind, seed, scale: 0.56, child: true, pose: {
    lHip: [-78, 0, 40], rHip: [-78, 0, -40], lKnee: [86, 0, 0], rKnee: [86, 0, 0],
    chest: [6, 0, 0], head: [0, 0, 0], lShoulder: [-110, 0, 20], rShoulder: [-110, 0, -20], lElbow: [-40, 0, 0], rElbow: [-40, 0, 0] } });
  return ch;
}

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 40));
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  let cam, focus;
  if (v === 'a') {
    const sunDir = new THREE.Vector3(0.1, 0.062, -1).normalize();
    scene.add(PR.daySky({ zenith: [0.06, 0.05, 0.1], horizon: [0.95, 0.42, 0.13], ground: [0.16, 0.1, 0.06], sunDir: sunDir.toArray(), sunColor: [70, 40, 14], sunSize: 0.99955, glow: [3.6, 1.45, 0.32], glowPow: 7 }));
    scene.fog = new THREE.FogExp2(new THREE.Color(0.9, 0.5, 0.22).multiplyScalar(0.45), 0.0055);
    const ground = S.earthGround({ size: 400, repeat: 120, base: [120, 96, 64], dark: [80, 62, 40], seed: 3 }); scene.add(ground);
    // tall grass: dense band around the walkers, sparser far
    const gm = S.grassMaterial({ sunDir: sunDir.toArray(), transl: [1.0, 0.66, 0.3], translAmt: 1.2 });
    scene.add(S.grassField({ area: [16, 12], center: [0.3, 0, 3.0], density: 300, height: [0.45, 1.0], width: [0.014, 0.024], seed: 3, material: gm, clumps: 700, clumpR: 0.3, heads: 0.25, colors: [[0.7, 0.6, 0.36], [0.78, 0.66, 0.4], [0.6, 0.5, 0.3], [0.62, 0.58, 0.3]] }));
    scene.add(S.grassField({ area: [70, 40], center: [0, 0, -22], density: 9, height: [0.6, 1.1], width: [0.03, 0.05], seed: 4, material: gm, exclude: (x, z) => z > -3 }));
    // foreground grass, close to the lens (defocused silhouettes)
    scene.add(S.grassField({ area: [7, 1.6], center: [0.3, 0, 9.4], density: 60, height: [0.6, 1.25], width: [0.02, 0.035], seed: 31, material: gm, clumps: 40, clumpR: 0.25, heads: 0.3 }));
    // acacias in the haze
    scene.add(S.acacia({ pos: [-9, 0, -26], height: 6.5, spread: 7, seed: 3, leafCards: 1800 }));
    scene.add(S.acacia({ pos: [14, 0, -40], height: 7.5, spread: 8, seed: 5, leafCards: 1500 }));
    scene.add(S.acacia({ pos: [3, 0, -70], height: 6, spread: 7, seed: 8, silhouette: true }));
    scene.add(S.scrubLine({ radius: 80, count: 50, arc: [-Math.PI * 0.8, -Math.PI * 0.2], height: [1, 3], color: 0x3a2c22, seed: 9 }));
    // the band walking left->right (facing +x)
    const band = [
      [-4.6, 0.6, 'oak', 0.1], [-3.95, -0.4, 'walnut', 0.55], [-2.1, 0.45, 'beech', 0.3, 'carry'], [-1.45, -0.35, 'maple', 0.75],
      [-0.55, 0.3, 'ash', 0.05, 'child'], [1.5, -0.3, 'oak', 0.6], [2.15, 0.5, 'walnut', 0.35, 'stick'], [3.9, -0.1, 'beech', 0.85], [4.45, 0.75, 'maple', 0.2],
    ];
    const rng = mulberry32(7);
    for (const [x, z, kind, ph, role] of band) {
      let extra = {};
      if (role === 'carry') extra = { lShoulder: [-38, 0, 20], lElbow: [-110, 0, 0], rShoulder: [-40, 0, -20], rElbow: [-100, 0, 0] };
      if (role === 'stick') extra = { rShoulder: [-30, 0, -8], rElbow: [-60, 0, 0] };
      const f = F.figure({ kind, seed: 50 + Math.floor(rng() * 50), rotY: 90 + (rng() - 0.5) * 12, pose: walkPose(ph, Math.floor(rng() * 100), extra) });
      f.group.position.set(x, 0, z); F.groundFig(f, 0); scene.add(f.group);
      if (role === 'carry') { const b = PR.mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 }), F.jointPoint(f, 'lWrist', [0, -0.12, 0.08]).toArray()); b.scale.set(1.2, 0.8, 1); scene.add(b); }
      if (role === 'stick') { const hp = F.jointPoint(f, 'rWrist', [0, -0.1, 0]); const st = PR.mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.9, 6), new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.8 }), [hp.x + 0.35, hp.y + 0.2, hp.z], [0, 0, -1.2]); scene.add(st); }
      if (role === 'child') {
        // adult holds the child's shins; child sits astride the neck
        f.joints.lShoulder.rotation.set(-1.05, 0, 0.5); f.joints.rShoulder.rotation.set(-1.05, 0, -0.5); f.joints.lElbow.rotation.set(-1.9, 0, 0); f.joints.rElbow.rotation.set(-1.9, 0, 0); f.joints.head.rotation.set(0.1, 0, 0); f.group.updateMatrixWorld(true);
        const ch = childOnShoulders(f); ch.group.rotation.y = f.group.rotation.y;
        const fwd = new THREE.Vector3(Math.sin(f.group.rotation.y), 0, Math.cos(f.group.rotation.y));
        const neck = F.jointPoint(f, 'head', [0, 0.0, 0]).addScaledVector(fwd, -0.11); neck.y += 0.04;
        ch.group.position.copy(neck); ch.group.updateMatrixWorld(true);
        const cp = F.jointPoint(ch, 'pelvis', [0, -0.1, 0]); ch.group.position.sub(cp.sub(neck)); ch.group.updateMatrixWorld(true); scene.add(ch.group);
      }
      // a small child walking beside
      if (kind === 'maple' && x < 0) { const k = F.figure({ kind: 'ash', seed: 91, scale: 0.6, child: true, rotY: 92, pose: walkPose(0.4, 9) }); k.group.position.set(x + 0.55, 0, z + 0.55); F.groundFig(k, 0); scene.add(k.group); }
    }
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.72, 0.42), 5.5);
    sun.position.copy(sunDir.clone().multiplyScalar(40)); sun.target.position.set(0, 0, 0); sun.castShadow = true;
    sun.shadow.mapSize.set(3072, 3072); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 6, bottom: -6, near: 1, far: 90 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(new THREE.Color(1.0, 0.62, 0.35), 3.0); rim.position.set(-20, 5, -30); scene.add(rim);
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.55, 0.6, 0.8), new THREE.Color(0.55, 0.38, 0.22), 1.0));
    scene.environment = C.gradientEnv(renderer, { top: [0.25, 0.3, 0.5], horizon: [1.4, 0.9, 0.5], bottom: [0.25, 0.18, 0.1], panels: [{ pos: [sunDir.x * 10, sunDir.y * 10 + 0.5, sunDir.z * 10], w: 3, h: 2, color: [1, 0.7, 0.4], intensity: 8 }] });
    scene.environmentIntensity = 0.5;
    cam = C.makeCamera(q, { pos: [0.3, 1.12, 13.0], look: [0.0, 1.22, 0], fov: 13 }, w, h);
    focus = cam.position.distanceTo(new THREE.Vector3(0.1, 1.2, 0));
  } else {
    const camp = S.fireCamp(scene, { center: [0, 0, 0], fireScale: 1.1, seed: 31, lightI: 11 });
    lights.push(...camp.lights);
    // a full ring, shoulder to shoulder around the fire
    const rng = mulberry32(12);
    const kinds = ['beech', 'oak', 'walnut', 'maple', 'ash'];
    const kindsSeq = ['cross', 'lean', 'knees', 'cross', 'side', 'lean', 'knees', 'cross', 'knees', 'lean', 'cross'];
    const N = 11;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.3; const r = 1.28 + (rng() - 0.5) * 0.08;
      if (i === 0 || i === N - 1) continue; // an opening toward the camera
      const lean = kindsSeq[i] === 'lean' ? (i % 2 ? 14 : -14) : 0;
      const f = F.figure({ kind: kinds[i % 5], seed: 60 + i, rotY: (a * 180 / Math.PI) + 180 + (rng() - 0.5) * 10, pose: F.seatedPose(kindsSeq[i], rng, lean) });
      f.group.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); F.groundFig(f, 0); scene.add(f.group);
      if (i === 5) { const ch = F.figure({ kind: 'maple', seed: 90, scale: 0.55, child: true, rotY: (a * 180 / Math.PI) + 180, pose: { lHip: [-90, 0, 10], rHip: [-90, 0, -10], lKnee: [100, 0, 0], rKnee: [100, 0, 0], chest: [20, 0, 0], head: [10, 20, 0], lShoulder: [-30, 0, 20], rShoulder: [-30, 0, -20], lElbow: [-60, 0, 0], rElbow: [-60, 0, 0] } });
        ch.group.position.set(Math.sin(a + 0.28) * (r - 0.25), 0, Math.cos(a + 0.28) * (r - 0.25)); F.groundFig(ch, 0); scene.add(ch.group); }
    }
    scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.03], horizon: [0.02, 0.025, 0.04], bottom: [0.03, 0.015, 0.008], panels: [{ pos: [0, 0.3, 0], w: 2, h: 2, color: [1.0, 0.5, 0.2], intensity: 1.5 }] });
    scene.environmentIntensity = 0.15;
    cam = C.makeCamera(q, { pos: [0.35, 2.0, 5.4], look: [0, 0.62, -0.3], fov: 26 }, w, h);
    focus = cam.position.distanceTo(new THREE.Vector3(0, 0.6, 0));
  }
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 2.2, dofScale: v === 'a' ? 2.6 : 1.3, seed: 6,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: v === 'a' ? 'ancestral' : 'fire', gradeOverride: v === 'a' ? { contrast: 0.45, saturation: 1.18, exposure: +(q.get('ex') || 0.34) } : undefined,
    bloom: v === 'a' ? { strength: 0.1, radius: 0.55, threshold: 2.2 } : { strength: 0.32, radius: 0.75, threshold: 1.05 },
    mist: null,
    streak: v === 'a' ? { threshold: 6.0, strength: 0.2, tint: [1.0, 0.7, 0.4] } : { threshold: 3.0, strength: 0.15, tint: [1.0, 0.55, 0.3] },
    clampHDR: 200,
  });
}
