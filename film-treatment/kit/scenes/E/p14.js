// P14 THE ANSWER — (a) the phone set face down on the table. (b) the manikin opening the front door, warm light outside.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';
import { mulberry32 } from './lib/cine.js';

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 40));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  let cam, focus;
  if (v === 'a') {
    // table top at y = 0.86; the hand comes in from the left and presses the phone face down
    const tb = MD.table({ pos: [0, 0, 0], w: 1.8, d: 1.0, h: 0.86 }); scene.add(tb);
    const P = F.figure({ kind: 'beech', seed: 5, rotY: 90, pose: { lHip: [-90, 0, 7], rHip: [-90, 0, -7], lKnee: [94, 0, 0], rKnee: [94, 0, 0], chest: [20, 0, 0], head: [22, 0, 0], lShoulder: [-20, 0, 10], lElbow: [-60, 0, 0] } });
    P.group.position.set(-1.25, 0, 0.05); F.seatFig(P, 0.5); scene.add(P.group);
    const phonePos = new THREE.Vector3(-0.42, 0.86 + 0.006, 0.08);
    const ik = F.reachIK(P, 'r', phonePos.clone().add(new THREE.Vector3(0.0, 0.035, 0.0)), { local: [0, -0.12, 0.03], iters: 500 });
    P.joints.rWrist.rotation.set(-0.35, 0, 0.2); P.group.updateMatrixWorld(true);
    console.log('[scene] hand err', ik.err.toFixed(3));
    { const hnd = F.jointPoint(P, 'rWrist', [0, -0.12, 0.03]); phonePos.x = hnd.x; phonePos.z = hnd.z; const lift = hnd.y - (0.86 + 0.045); if (lift > 0) { P.joints.chest.rotation.x += 0.0; } }
    const ph = PR.phone({ screenTex: PR.phoneScreenTex({ time: '2:14', wall: 'night', alarm: false }), emissive: 0, on: false, faceDown: true }); ph.position.copy(phonePos); ph.rotation.y = 0.35; scene.add(ph);
    // lower the whole figure so the palm rests on the phone back
    { const hnd = F.jointPoint(P, 'rWrist', [0, -0.12, 0.03]); const dy = (0.86 + 0.012 + 0.03) - hnd.y; P.group.position.y += dy; P.group.updateMatrixWorld(true); }
    // last leak of screen light from under the phone
    const leak = PR.mesh(new THREE.PlaneGeometry(0.12, 0.21), new THREE.MeshBasicMaterial({ map: MT.blobTexture(64, 1.5), color: new THREE.Color(0.55, 0.75, 1.0).multiplyScalar(0.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [phonePos.x, 0.8605, phonePos.z], [-Math.PI / 2, 0, 0.35], false, false); scene.add(leak);
    scene.add(PR.glassOfWater({ pos: [0.12, 0.86, -0.22] }));
    // keys + a small plant: morning table
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.09, 20), new THREE.MeshStandardMaterial({ color: 0xc9c2b4, roughness: 0.8 }), [0.45, 0.905, 0.25]));
    scene.add(PR.mesh(new THREE.IcosahedronGeometry(0.08, 1), new THREE.MeshStandardMaterial({ color: 0x4d6b3a, roughness: 0.8 }), [0.45, 1.0, 0.25]));
    // room: kitchen behind, dawn window light (the first warm light of the film's modern world)
    const kit = MD.kitchen({ width: 6.4, fridgeX: -2.0, fridgeOpen: 0.0, seed: 3, wallBase: [120, 122, 118] }); kit.position.set(0.5, 0, -2.2); scene.add(kit);
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.78, 0.52), 3.2); sun.position.set(-3, 3.2, -6); sun.target.position.set(0, 0.86, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); sun.shadow.bias = -0.0004; scene.add(sun, sun.target); lights.push({ l: sun, base: sun.position.clone(), r: 0.05 });
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.55, 0.62, 0.75), new THREE.Color(0.2, 0.16, 0.12), 0.7));
    scene.environment = C.gradientEnv(renderer, { top: [0.25, 0.28, 0.35], horizon: [0.4, 0.35, 0.3], bottom: [0.1, 0.08, 0.06], panels: [{ pos: [-4, 3, -6], w: 3, h: 2, color: [1, 0.8, 0.55], intensity: 3 }] });
    scene.environmentIntensity = 0.5;
    const hp = F.jointPoint(P, 'rWrist', [0, -0.1, 0]);
    cam = C.makeCamera(q, { pos: [hp.x + 0.55, 1.08, hp.z + 0.72], look: [hp.x + 0.06, 0.9, hp.z - 0.02], fov: 26 }, w, h);
    focus = cam.position.distanceTo(phonePos);
  } else {
    // hallway: door in the wall x = 1.3 (door faces -x into the hall), hinge at the far side; figure pulls it open
    const pl = MT.plaster({ base: [150, 150, 144], seed: 7 });
    const wallMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.5, roughness: 0.92, repeat: [2, 2] });
    const fl = MT.planks({ base: [140, 108, 78], dark: [96, 70, 50], planksAcross: 5, seed: 11 });
    scene.add(PR.mesh(new THREE.PlaneGeometry(6, 8), MT.texMat({ map: fl.map, rough: fl.rough, roughness: 0.5, repeat: [1.2, 1.6] }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
    const DW = 1.0, DH = 2.25, dz = 0.0, wx = 1.3;
    // wall with opening
    scene.add(PR.mesh(new THREE.PlaneGeometry(4, 2.9), wallMat, [wx, 1.45, dz - DW / 2 - 2], [0, -Math.PI / 2, 0], true, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(4, 2.9), wallMat, [wx, 1.45, dz + DW / 2 + 2], [0, -Math.PI / 2, 0], true, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(DW, 2.9 - DH), wallMat, [wx, DH + (2.9 - DH) / 2, dz], [0, -Math.PI / 2, 0], true, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(8, 2.9), wallMat, [-3.4, 1.45, 0], [0, Math.PI / 2, 0], false, true));
    for (const sz of [-1, 1]) scene.add(PR.mesh(new THREE.PlaneGeometry(5, 2.9), wallMat, [-1.0, 1.45, sz * 1.1], [0, sz > 0 ? Math.PI : 0, 0], false, true));
    scene.add(PR.mesh(PR.rbox(0.4, 0.9, 0.35, 0.02), new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.7 }), [-0.4, 0.45, -0.9]));
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }), [0.5, 0.85, 0.95]));
    scene.add(PR.mesh(new THREE.PlaneGeometry(4, 8), wallMat, [0, 2.9, 0], [Math.PI / 2, 0, 0], false, true));
    const frameM = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.6 });
    for (const s of [-1, 1]) scene.add(PR.mesh(new THREE.BoxGeometry(0.2, DH, 0.06), frameM, [wx + 0.05, DH / 2, dz + s * (DW / 2 + 0.03)]));
    scene.add(PR.mesh(new THREE.BoxGeometry(0.2, 0.06, DW + 0.12), frameM, [wx + 0.05, DH + 0.03, dz]));
    // door: timber, hinged at z = dz + DW/2, swung open into the hall by 55 degrees
    const door = new THREE.Group(); door.position.set(wx + 0.02, 0, dz + DW / 2); door.rotation.y = -50 * Math.PI / 180; scene.add(door);
    const dw = MT.planks({ base: [150, 112, 76], dark: [110, 80, 54], planksAcross: 3, seed: 21, gap: 0.004 });
    door.add(PR.mesh(PR.rbox(0.05, DH - 0.02, DW - 0.02, 0.01), MT.texMat({ map: dw.map, rough: dw.rough, roughness: 0.5 }), [0, DH / 2, -(DW - 0.02) / 2]));
    const handleP = new THREE.Vector3(-0.05, 1.0, -(DW - 0.12)); door.add(PR.mesh(new THREE.BoxGeometry(0.06, 0.02, 0.14), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.3 }), handleP.toArray()));
    door.updateMatrixWorld(true);
    const handleW = handleP.clone().applyMatrix4(door.matrixWorld);
    // outside: warm courtyard, sun, trees, people
    const sunDir = new THREE.Vector3(1, 0.3, 0.4).normalize();
    scene.add(PR.daySky({ zenith: [0.25, 0.38, 0.65], horizon: [1.2, 0.85, 0.55], ground: [0.3, 0.24, 0.16], sunDir: sunDir.toArray(), sunColor: [10, 7, 4], glow: [1.2, 0.8, 0.4], glowPow: 6 }));
    scene.add(PR.mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 }), [30.5, -0.01, 0], [-Math.PI / 2, 0, 0], false, true));
    scene.add(S.acacia({ pos: [9, 0, 2.5], height: 5, spread: 4.5, seed: 31, leafCards: 1600, leafColor: [0.2, 0.28, 0.12] }));
    for (const [x, z, kind, sd] of [[6.5, -1.0, 'oak', 41], [7.2, 0.4, 'maple', 42], [8.0, -0.3, 'walnut', 43]]) { const f = F.figure({ kind, seed: sd, rotY: -90 + (sd % 3) * 20, pose: F.seatedPose('cross', mulberry32(sd)) }); f.group.position.set(x, 0, z); F.groundFig(f, 0); scene.add(f.group); }
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.76, 0.48), 9); sun.position.set(wx + sunDir.x * 20, sunDir.y * 20, sunDir.z * 20); sun.target.position.set(wx, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 60 }); sun.shadow.bias = -0.0004; scene.add(sun, sun.target);
    const spill = new THREE.RectAreaLight(new THREE.Color(1.0, 0.8, 0.55), 0.6, 3.0, 0.4); spill.position.set(wx - 0.3, 0.02, dz); spill.lookAt(wx - 0.3, 3, dz); scene.add(spill);
    const shaft = MT.lightShaft({ width: DW, height: DH, length: 3.5, color: [1.0, 0.78, 0.5], intensity: 0.05, falloff: 1.3, noise: 0.5, seed: 4 }); shaft.position.set(wx + 0.1, DH / 2 + 0.1, dz); shaft.lookAt(-2, 0.4, dz + 0.5); scene.add(shaft);
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.35, 0.42, 0.55), new THREE.Color(0.12, 0.1, 0.08), 0.15));
    // the figure: right hand on the handle, stepping toward the light
    const P = F.figure({ kind: 'beech', seed: 5, rotY: 96, pose: { lHip: [-18, 0, 3], rHip: [12, 0, -3], lKnee: [14, 0, 0], rKnee: [22, 0, 0], rAnkle: [-10, 0, 0], chest: [6, 0, 0], head: [-10, -6, 0], lShoulder: [10, 0, 10], lElbow: [-16, 0, 0] } });
    P.group.position.set(wx - 0.02, 0, dz - 0.12); F.groundFig(P, 0); scene.add(P.group);
    const ik = F.reachIK(P, 'r', handleW, { local: [0, -0.1, 0.02], iters: 500 }); console.log('[scene] handle err', ik.err.toFixed(3));
    scene.environment = C.gradientEnv(renderer, { top: [0.1, 0.1, 0.12], horizon: [0.15, 0.13, 0.11], bottom: [0.05, 0.04, 0.03], panels: [{ pos: [6, 1.2, 0], w: 2, h: 3, color: [1, 0.8, 0.55], intensity: 4 }] });
    scene.environmentIntensity = 0.4;
    cam = C.makeCamera(q, { pos: [-2.6, 1.38, 0.28], look: [wx + 3, 1.12, dz + 0.05], fov: 30 }, w, h);
    focus = cam.position.distanceTo(handleW);
  }
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 1.8, dofScale: 1.4, seed: 14,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: 'newworld',
    bloom: v === 'b' ? { strength: 0.18, radius: 0.7, threshold: 2.5 } : { strength: 0.25, radius: 0.8, threshold: 1.4 },
    streak: v === 'b' ? null : { threshold: 5.0, strength: 0.15, tint: [1.0, 0.75, 0.45] },
  });
}
