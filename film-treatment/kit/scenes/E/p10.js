// P10 LONELINESS — (a) 2 a.m. kitchen: a manikin at the table lit by the open fridge and a phone; an empty chair beside it.
// (b) night, outside the camp: the same figure by a small fire; another manikin sits down beside it (where the empty chair was).
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';

export const SEAT = [-0.75, 0, 1.75];   // where P sits (facing +x)
export const POSE = {
  lHip: [-90, 0, 7], rHip: [-90, 0, -7], lKnee: [94, 0, 0], rKnee: [94, 0, 0], lAnkle: [-3, 0, 0], rAnkle: [-3, 0, 0],
  pelvis: [0, 0, 0], chest: [30, 0, 0], head: [30, 0, 0],
  lShoulder: [-48, -12, 12], rShoulder: [-48, 12, -12], lElbow: [-78, 0, -14], rElbow: [-78, 0, 14], lWrist: [-6, 0, 16], rWrist: [-6, 0, -16],
};
export const CAM = { pos: [0.42, 1.0, 3.95], look: [-0.62, 0.98, 1.55], fov: 28 };

export function buildP(scene, seatH = 0.5, rotY = 90) {
  const P = F.figure({ kind: 'beech', seed: 5, pose: POSE, rotY });
  P.group.position.set(SEAT[0], 0, SEAT[2]); F.seatFig(P, seatH); scene.add(P.group);
  return P;
}

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 48));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  const seatH = 0.5;
  const P = buildP(scene, seatH);
  const hl = F.jointPoint(P, 'lWrist', [0, -0.11, 0.02]), hr = F.jointPoint(P, 'rWrist', [0, -0.11, 0.02]);
  const hc = hl.clone().add(hr).multiplyScalar(0.5);
  const headP = F.jointPoint(P, 'head', [0, 0.1, 0.06]);
  const nbSeat = new THREE.Vector3(SEAT[0] + 0.62, 0, SEAT[2] - 0.72); // the empty place beside P (across the table corner)
  const nbRot = -140; // faces toward P / the fire
  if (v === 'a' || v === 'k') {
    const kit = MD.kitchen({ width: 6.4, fridgeX: -2.0, fridgeOpen: 1.95, seed: 3, wallBase: [92, 98, 96] });
    scene.add(kit);
    const tb = MD.table({ pos: [SEAT[0] + 1.12, 0, SEAT[2] - 0.05], w: 1.6, d: 0.9, h: 0.86 }); scene.add(tb);
    scene.add(MD.chair({ pos: [SEAT[0] - 0.04, 0, SEAT[2]], rotY: Math.PI / 2, seatH: seatH - 0.02 }));
    scene.add(MD.chair({ pos: [nbSeat.x + 0.1, 0, nbSeat.z - 0.08], rotY: 0.15, seatH: seatH - 0.02 }));
    scene.add(MD.chair({ pos: [SEAT[0] + 1.5, 0, SEAT[2] - 0.72], rotY: -0.1, seatH: seatH - 0.02 }));
    // phone in both hands, glowing up at the face
    const ph = PR.phone({ screenTex: PR.faceGridTex({ seed: 5, rows: 3 }), emissive: 3.0, on: v === 'a' });
    const nrm = headP.clone().sub(hc).normalize();
    PR.orient(ph, hc.clone().add(new THREE.Vector3(0.02, 0.015, 0)), nrm, new THREE.Vector3(1, 0, 0)); scene.add(ph);
    if (v === 'a') {
      const ra = new THREE.RectAreaLight(new THREE.Color(0.75, 0.88, 1.0), 40, 0.08, 0.16); ra.position.copy(ph.position).addScaledVector(nrm, 0.01); ra.lookAt(ph.position.clone().addScaledVector(nrm, 1)); scene.add(ra);
      const pp = new THREE.PointLight(new THREE.Color(0.6, 0.78, 1.0), 0.25, 0, 2); pp.position.copy(ph.position).addScaledVector(nrm, 0.1); scene.add(pp);
    }
    // a glass of water and keys on the table
    scene.add(PR.glassOfWater({ pos: [SEAT[0] + 0.72, 0.86, SEAT[2] - 0.25] }));
    // fridge light: soft area glow + shadowing spot from inside the fridge
    const ff = kit.userData.fridgeFront; // front centre
    const fra = new THREE.RectAreaLight(new THREE.Color(0.86, 0.93, 1.0), 9, 0.74, 1.8); fra.position.set(ff.x, 0.98, ff.z - 0.05); fra.lookAt(ff.x + 0.4, 0.9, ff.z + 3); scene.add(fra);
    const fsp = new THREE.SpotLight(new THREE.Color(0.86, 0.93, 1.0), 26, 0, 0.85, 0.7, 2); fsp.position.set(ff.x, 1.0, ff.z - 0.3); fsp.target.position.set(ff.x + 1.6, 0.4, ff.z + 2.5); fsp.castShadow = true; fsp.shadow.mapSize.set(2048, 2048); fsp.shadow.bias = -0.0003; fsp.shadow.camera.near = 0.2; fsp.shadow.camera.far = 12;
    scene.add(fsp, fsp.target); lights.push({ l: fsp, base: fsp.position.clone(), r: 0.2 });
    const shaft = MT.lightShaft({ width: 0.8, height: 1.8, length: 4.2, color: [0.8, 0.9, 1.0], intensity: 0.03, falloff: 1.4, noise: 0.5, seed: 2 });
    shaft.position.set(ff.x, 0.98, ff.z); shaft.lookAt(ff.x + 1.4, 0.75, ff.z + 3.5); scene.add(shaft);
    // faint night-blue from the window
    const wl = new THREE.SpotLight(new THREE.Color(0.35, 0.5, 0.9), 3, 0, 0.7, 1, 2); wl.position.set(kit.userData.windowX, 1.8, -1.5); wl.target.position.set(0, 0.8, 2.5); scene.add(wl, wl.target);
    scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.014, 0.02], horizon: [0.02, 0.025, 0.035], bottom: [0.01, 0.01, 0.012], panels: [{ pos: [-4, 1, -2], w: 2, h: 4, color: [0.85, 0.93, 1.0], intensity: 1.2 }] });
    scene.environmentIntensity = 0.3;
  } else {
    // outside the camp: small fire in front of P; the camp's big fire far behind-left; the other sits down beside P
    const fc = new THREE.Vector3(hc.x + 0.6, 0, hc.z + 0.05);
    const camp = S.fireCamp(scene, { center: [fc.x, 0, fc.z], fireScale: 0.5, seed: 17, lightI: 10, distantFires: 3 });
    lights.push(...camp.lights);
    // log seat for P, spanning to where the other sits
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.9, 16), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 }), [SEAT[0] - 0.02, 0.25, SEAT[2] - 0.35], [Math.PI / 2, 0, 0.4]));
    // main camp far behind-left: big glow + silhouettes
    const main = new THREE.Vector3(-7.5, 0, -6.5);
    const mf = PR.fire({ pos: [main.x, 0, main.z], scale: 1.4, flames: 8, flameIntensity: 6, seed: 4 }); scene.add(mf);
    scene.add(PR.sparks({ pos: [main.x, 0, main.z], count: 30, height: 2.4, spread: 0.5, seed: 8, intensity: 9 }));
    const mg = MT.glowSprite([1.0, 0.45, 0.12], 0.5, 5, 2.0); mg.position.set(main.x, 0.6, main.z); scene.add(mg);
    const ML = new THREE.PointLight(new THREE.Color(1.0, 0.5, 0.2), 30, 0, 2); ML.position.set(main.x, 0.7, main.z); scene.add(ML);
    for (const [dx, dz, ry, kind, sd] of [[-1.1, 0.4, 100, 'oak', 31], [-0.5, -1.0, 20, 'walnut', 32], [0.7, -0.8, -40, 'maple', 33], [1.0, 0.5, -110, 'ash', 34], [-1.2, -0.6, 60, 'oak', 35]]) {
      const f = F.figure({ kind, seed: sd, pose: { lHip: [-80, 0, 38], rHip: [-80, 0, -38], lKnee: [128, 0, 0], rKnee: [128, 0, 0], chest: [12, 0, 0], head: [6, 0, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-55, 0, 0], rElbow: [-55, 0, 0] }, rotY: ry });
      f.group.position.set(main.x + dx, 0, main.z + dz); F.groundFig(f, 0); scene.add(f.group);
    }
    // the one who comes to sit beside P (mid-sit, turned toward P, hand on P's shoulder)
    const nb = F.figure({ kind: 'oak', seed: 21, rotY: nbRot, pose: {
      lHip: [-78, 0, 8], rHip: [-70, 0, -8], lKnee: [104, 0, 0], rKnee: [96, 0, 0], lAnkle: [-14, 0, 0], rAnkle: [-10, 0, 0],
      pelvis: [10, 0, 0], chest: [20, 0, 0], head: [10, 30, 0],
      lShoulder: [-30, 0, 20], lElbow: [-40, 0, 0], rShoulder: [-35, 0, -30], rElbow: [-30, 0, 0] } });
    nb.group.position.set(nbSeat.x, 0, nbSeat.z); F.groundFig(nb, 0); scene.add(nb.group);
    // nb's hand reaches to P's shoulder as it sits
    const target = F.jointPoint(P, 'lShoulder', [0.0, 0.08, 0]);
    const ik = F.reachIK(nb, 'l', target, { local: [0, -0.1, 0.02], iters: 500 });
    console.log('[scene] nb reach err', ik.err.toFixed(3));
    scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.03], horizon: [0.02, 0.025, 0.04], bottom: [0.04, 0.02, 0.01], panels: [{ pos: [0, 0.3, 3], w: 2, h: 2, color: [1.0, 0.5, 0.2], intensity: 1.5 }] });
    scene.environmentIntensity = 0.3;
  }
  const cam = C.makeCamera(q, CAM, w, h);
  const focus = cam.position.distanceTo(headP);
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 2.0, dofScale: 1.6, seed: 10,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: v === 'b' ? 'fire' : 'modern',
    bloom: { strength: 0.32, radius: 0.75, threshold: 1.05 },
    streak: v === 'b' ? { threshold: 3.0, strength: 0.15, tint: [1.0, 0.55, 0.3] } : { threshold: 1.8, strength: 0.4, tint: [0.35, 0.6, 1.0] },
  });
}
