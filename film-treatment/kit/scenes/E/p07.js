// P07 TUNED DRIVES — (a) around the fire, A looks at B across the flames; C watches. (b) the same glance: A in bed looking at a screen of faces.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';

const UPPER = { pelvis: [0, 0, 0], chest: [8, 0, 0], head: [6, 8, 0], lShoulder: [-30, 0, 12], lElbow: [-60, 0, 0], rShoulder: [-20, 0, -12], rElbow: [-40, 0, 0] };

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 48));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  const Bpos = new THREE.Vector3(0.25, 0, -2.5);
  let A;
  if (v === 'a') {
    A = F.figure({ kind: 'beech', seed: 5, rotY: 180, pose: { ...UPPER, lHip: [-100, 0, 10], rHip: [-100, 0, -10], lKnee: [110, 0, 0], rKnee: [110, 0, 0] } });
    F.seatFig(A, 0.42); scene.add(A.group);
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.6, 14), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 }), [0, 0.21, 0.1], [0, 0, Math.PI / 2]));
  } else {
    A = F.figure({ kind: 'beech', seed: 5, rotY: 180, pose: { ...UPPER, chest: [4, 0, 0], lHip: [-78, 0, 6], rHip: [-78, 0, -6], lKnee: [30, 0, 0], rKnee: [24, 0, 0] } });
    F.seatFig(A, 0.62); scene.add(A.group);
  }
  // equalise head height between the two worlds (the world moves, not the actor)
  const headTarget = 1.5;
  const hp0 = F.jointPoint(A, 'head', [0, 0.12, 0.02]);
  const dy = headTarget - hp0.y; A.group.position.y += dy; A.group.updateMatrixWorld(true);
  const worldY = dy; // everything else is offset by this
  const headP = F.jointPoint(A, 'head', [0, 0.12, 0.05]);
  const Bhead = new THREE.Vector3(Bpos.x, 1.38 + worldY, Bpos.z);
  const dir = Bhead.clone().sub(headP).normalize();
  // camera over A's right shoulder
  const camPos = headP.clone().add(new THREE.Vector3(0.36, 0.1, 1.0));
  const phonePos = camPos.clone().lerp(Bhead, 0.4);
  // A's gaze: head yaw/pitch toward the phone line (same in both worlds)
  { const d2 = phonePos.clone().sub(headP); const yaw = Math.atan2(d2.x, -d2.z) * 180 / Math.PI; const pitch = Math.atan2(-d2.y, Math.hypot(d2.x, d2.z)) * 180 / Math.PI;
    A.joints.head.rotation.set((pitch - 6) * Math.PI / 180, -yaw * Math.PI / 180 * 0.8, 0); A.joints.chest.rotation.y = -yaw * Math.PI / 180 * 0.2; A.group.updateMatrixWorld(true); }
  if (v === 'a') {
    const root = new THREE.Group(); root.position.y = worldY; scene.add(root);
    const camp = S.fireCamp(root, { center: [0.55, 0, -1.3], fireScale: 0.95, seed: 22, lightI: 15 });
    lights.push(...camp.lights);
    const B = F.figure({ kind: 'oak', seed: 12, rotY: 8, pose: { lHip: [-118, 0, 12], rHip: [-112, 0, -10], lKnee: [138, 0, 0], rKnee: [132, 0, 0], chest: [14, 0, 0], head: [-4, 6, 4], lShoulder: [-56, 0, 16], rShoulder: [-56, 0, -16], lElbow: [-44, -30, 0], rElbow: [-44, 30, 0] } });
    B.group.position.set(Bpos.x, 0, Bpos.z); F.groundFig(B, 0); root.add(B.group);
    // C watches A (to the right of the fire, head turned toward A)
    const Cf = F.figure({ kind: 'walnut', seed: 13, rotY: -70, pose: { lHip: [-120, 0, 10], rHip: [-115, 0, -8], lKnee: [140, 0, 0], rKnee: [135, 0, 0], chest: [18, 0, 0], head: [2, -38, 0], lShoulder: [-58, 0, 14], rShoulder: [-58, 0, -14], lElbow: [-40, -30, 0], rElbow: [-40, 30, 0] } });
    Cf.group.position.set(1.45, 0, -1.55); F.groundFig(Cf, 0); root.add(Cf.group);
    // others further round, soft
    for (const [x, z, ry, kind, sd] of [[-1.35, -1.9, 50, 'maple', 14], [-1.0, -0.6, 110, 'ash', 15]]) { const f = F.figure({ kind, seed: sd, rotY: ry, pose: { lHip: [-80, 0, 38], rHip: [-80, 0, -38], lKnee: [128, 0, 0], rKnee: [128, 0, 0], chest: [12, 0, 0], head: [8, 0, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-55, 0, 0], rElbow: [-55, 0, 0] } }); f.group.position.set(x, 0, z); F.groundFig(f, 0); root.add(f.group); }
    root.updateMatrixWorld(true);
    scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.03], horizon: [0.02, 0.025, 0.04], bottom: [0.05, 0.025, 0.01], panels: [{ pos: [0, 0.2, -3], w: 2, h: 2, color: [1.0, 0.5, 0.2], intensity: 2.0 }] });
    scene.environmentIntensity = 0.3;
  } else {
    // bed: A sits up against pillows; phone on the eyeline to where B was
    const ph = PR.phone({ screenTex: PR.faceGridTex({ seed: 21, rows: 3 }), emissive: 2.4 });
    { const toHead = headP.clone().sub(phonePos).normalize(); PR.orient(ph, phonePos, toHead, new THREE.Vector3(0, 1, 0)); } scene.add(ph);
    // right hand to the phone (IK)
    const ik = F.reachIK(A, 'r', phonePos.clone().add(new THREE.Vector3(0.03, -0.05, 0.02)), { local: [0, -0.1, 0.02], iters: 500 });
    console.log('[scene] phone hand err', ik.err.toFixed(3));
    const ra = new THREE.RectAreaLight(new THREE.Color(0.8, 0.88, 1.0), 45, 0.08, 0.16); ra.position.copy(phonePos).addScaledVector(dir, -0.012); ra.lookAt(headP); scene.add(ra);
    const pp = new THREE.PointLight(new THREE.Color(0.65, 0.8, 1.0), 0.3, 0, 2); pp.position.copy(phonePos).addScaledVector(dir, -0.12); scene.add(pp);
    // bed + room (world shifted so the mattress sits under A)
    const matY = 0.6;
    const fab = MT.fabric({ base: [120, 128, 140], seed: 6 });
    const sheetMat = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.4, roughness: 0.95, repeat: [3, 3] });
    const bedG = PR.bed({ x: 0.3, headZ: 0.35, w: 1.9, len: 2.3, topY: matY, sheet: sheetMat }); bedG.rotation.y = Math.PI; bedG.position.set(0.6, 0, 0.7); scene.add(bedG);
    scene.add(PR.pillow({ w: 0.7, h: 0.3, d: 0.4, mat: sheetMat, pos: [0, matY + 0.3, 0.42], rot: [-1.1, 0, 0] }));
    const skip = new Set(); A.joints.rShoulder.traverse(o => skip.add(o)); A.joints.lShoulder.traverse(o => skip.add(o)); A.joints.head.traverse(o => skip.add(o)); A.joints.chest.children.forEach(c => { if (c.isMesh) skip.add(c); });
    scene.add(F.drapeSheet({ region: [-0.85, 0.95, -1.9, 0.2], y0: matY + 0.005, objects: [A.group], exclude: (c) => skip.has(c), res: [90, 100], thick: 0.08, blur: 5, noise: 0.012, material: MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.5, roughness: 0.97, repeat: [4, 4], color: 0xdde2ea }) }));
    const pl = MT.plaster({ base: [70, 76, 86], seed: 4 });
    const wallMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.5, roughness: 0.92, repeat: [2, 2] });
    scene.add(PR.mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.7 }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(10, 3.2), wallMat, [0, 1.6, -3.6], [0, 0, 0], false, true));
    // window with blinds far wall: city glow where the fire was
    scene.add(PR.mesh(new THREE.PlaneGeometry(1.0, 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.4, 0.7).multiplyScalar(0.3) }), [-0.9, 1.25, -3.58], [0, 0, 0], false, false));
    for (let i = 0; i < 11; i++) scene.add(PR.mesh(new THREE.BoxGeometry(1.0, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: 0x0c0e12 }), [-0.9, 0.88 + i * 0.075, -3.55]));
    scene.add(MD.lightPoints({ count: 20, box: [[-0.4, 1.0, -9], [0.8, 2.0, -6]], intensity: 5, seed: 31, size: [0.03, 0.06] }));
    const win = new THREE.SpotLight(new THREE.Color(0.4, 0.55, 0.9), 6, 0, 0.6, 0.9, 2); win.position.set(0.2, 1.6, -4.5); win.target.position.set(0, 1.0, 0.5); scene.add(win, win.target);
    scene.environment = C.gradientEnv(renderer, { top: [0.015, 0.02, 0.03], horizon: [0.02, 0.03, 0.045], bottom: [0.01, 0.01, 0.012], panels: [{ pos: [0, 1.5, -6], w: 2, h: 2, color: [0.4, 0.55, 0.9], intensity: 0.8 }] });
    scene.environmentIntensity = 0.3;
  }
  const cam = C.makeCamera(q, { pos: camPos.toArray(), look: Bhead.clone().add(new THREE.Vector3(-0.1, -0.42, 0)).toArray(), fov: 26 }, w, h);
  const focusTarget = v === 'a' ? Bhead : phonePos;
  const focus = cam.position.distanceTo(focusTarget);
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 2.0, dofScale: 1.6, seed: 12,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: v === 'a' ? 'fire' : 'modern',
    bloom: { strength: 0.32, radius: 0.75, threshold: 1.05 },
    streak: v === 'a' ? { threshold: 3.0, strength: 0.15, tint: [1.0, 0.55, 0.3] } : { threshold: 2.0, strength: 0.35, tint: [0.35, 0.6, 1.0] },
  });
}
