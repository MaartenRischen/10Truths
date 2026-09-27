// P01 OPEN — (a) 6:00 dawn bedroom: hand reaching for the glowing phone. (b) same hand, same camera: reed hut at dawn, touching a sleeping companion's shoulder.
// Also used by P16-b (v=c: bedroom, hand resting on companion's shoulder, phone dark) and hero-1 halves.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';

export const CAM34 = { pos: [2.35, 1.85, 1.95], look: [0.58, 0.78, 0.45], fov: 25 };
export const CAM = { pos: [0.42, 2.85, 0.86], look: [0.46, 0.6, 0.7], fov: 36, up: [0, 0, -1] };
export const TARGET = new THREE.Vector3(1.0, 0.775, 0.52);

export let P_POSE = null;
export function buildP(kind = 'beech') {
  // P lies on its left side facing +X, head toward -Z on the pillow
  const pose = {
    pelvis: [0, 0, 0], chest: [8, 0, 0], head: [6, -10, -20],
    lHip: [-34, 0, 4], lKnee: [60, 0, 0], rHip: [-26, 0, -6], rKnee: [44, 0, 0], lAnkle: [10, 0, 0], rAnkle: [8, 0, 0],
    lShoulder: [-130, 0, -10], lElbow: [-95, 0, 0], lWrist: [0, 0, 0],
    rShoulder: [-70, 0, -10], rElbow: [-20, 0, 0], rWrist: [10, 0, 0],
  };
  const ov = new URLSearchParams(location.search).get('pose'); if (ov) Object.assign(pose, JSON.parse(ov));
  if (kind === 'beech') P_POSE = { ...pose };
  const f = F.figure({ kind, seed: 5, pose });
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const roll = (+(new URLSearchParams(location.search).get('roll') || 8)) * Math.PI / 180;
  const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2 - roll);
  f.group.quaternion.copy(qz.multiply(q));
  f.group.position.set(0.3, 0, 2.12);
  F.groundParts(f, ['pelvis', 'chest'], 0.58 - 0.02);
  return f;
}

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 48));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const modern = v === 'a' || v === 'c';

  // ---------------- protagonist + reach
  const P = buildP();
  scene.add(P.group);
  let comp2 = null;
  if (v === 'c') {
    // the callback: P lies further back; a companion lies in front, P's hand rests on the companion's shoulder
    P.setPose({ ...P_POSE, lHip: [-18, 0, 4], lKnee: [30, 0, 0], rHip: [-14, 0, -6], rKnee: [24, 0, 0], head: [6, 10, -16], lShoulder: [-30, 0, 0], lElbow: [-90, 0, 0] }); P.group.updateMatrixWorld(true);
    P.group.position.x -= 0.46; P.group.updateMatrixWorld(true);
    comp2 = buildP('oak');
    comp2.setPose({ pelvis: [0, 0, 0], chest: [6, 0, 0], head: [8, -10, -18], lHip: [-22, 0, 4], lKnee: [34, 0, 0], rHip: [-16, 0, -6], rKnee: [26, 0, 0], lShoulder: [-20, 0, 0], lElbow: [-30, 0, 0], rShoulder: [-8, 0, 4], rElbow: [-24, 0, 0] });
    comp2.root.position.set(0, 0, 0); comp2.group.updateMatrixWorld(true); F.groundParts(comp2, ['pelvis', 'chest'], 0.58 - 0.02);
    comp2.group.position.x += 0.1; comp2.group.position.z += 0.02; comp2.group.updateMatrixWorld(true);
    scene.add(comp2.group);
  }
  if (q.get('hideP')) P.group.visible = false; if (q.get('hideC') && comp2) comp2.group.visible = false;
  if (comp2) console.log('[scene] joints', ['lWrist','rWrist'].map(n => 'P.' + n + ':' + F.jointPoint(P, n).toArray().map(x => x.toFixed(2)).join(',') + ' C.' + n + ':' + F.jointPoint(comp2, n).toArray().map(x => x.toFixed(2)).join(',')).join(' | '));
  if (v === 'b') {
    // the sleeping companion lies on its side facing away, its shoulder where the phone was
    comp2 = buildP('oak');
    comp2.setPose({ pelvis: [0, 0, 0], chest: [6, 0, 0], head: [8, -10, -18], lHip: [-22, 0, 4], lKnee: [34, 0, 0], rHip: [-16, 0, -6], rKnee: [26, 0, 0], lShoulder: [-20, 0, 0], lElbow: [-30, 0, 0], rShoulder: [-8, 0, 4], rElbow: [-24, 0, 0] });
    comp2.root.position.set(0, 0, 0); comp2.group.updateMatrixWorld(true); F.groundParts(comp2, ['pelvis', 'chest'], 0.58 - 0.02);
    const sh = F.jointPoint(comp2, 'rShoulder'); comp2.group.position.x += TARGET.x + 0.04 - sh.x; comp2.group.position.z += TARGET.z + 0.04 - sh.z; comp2.group.updateMatrixWorld(true);
    scene.add(comp2.group);
  }
  const reachT = comp2 ? F.jointPoint(comp2, 'rShoulder').add(new THREE.Vector3(-0.02, 0.1, 0.03)) : TARGET;
  const ik = F.reachIK(P, 'r', reachT, { local: [0, -0.1, 0.02], iters: 600 });
  console.log('[scene] ik err', ik.err.toFixed(3), JSON.stringify(ik.pose), 'shoulder', F.jointPoint(P,'rShoulder').toArray().map(x=>x.toFixed(2)).join(','), 'head', F.jointPoint(P,'head',[0,0.15,0]).toArray().map(x=>x.toFixed(2)).join(','));
  // palm down: wrist twist
  P.joints.rWrist.rotation.y = THREE.MathUtils.degToRad(+(q.get('wy') || 0));
  P.group.updateMatrixWorld(true);
  const handP = F.jointPoint(P, 'rWrist', [0, -0.1, 0.02]);

  const lights = [];
  if (modern) {
    // ---------------- bedroom
    const room = PR.bedroom({ width: 4.4, depth: 4.8, height: 2.95, wallColor: v === 'c' ? [150, 140, 130] : [120, 128, 136], windowAt: { x: 0.95, y: 1.62, w: 1.35, h: 1.45 }, blindsRaised: v === 'c' });
    room.position.x = 0.0; if (q.get('mirror') !== '0') room.scale.x = -1; scene.add(room);
    const fab = MT.fabric({ base: v === 'c' ? [206, 196, 184] : [150, 158, 168], seed: 4 });
    const sheetMat = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.4, roughness: 0.95, repeat: [3, 3] });
    const duvetMat = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.5, roughness: 0.97, repeat: [4, 4], color: 0xf0f2f6 });
    scene.add(PR.bed({ x: -0.25, headZ: 0.06, w: 1.9, len: 2.35, topY: 0.58, sheet: sheetMat }));
    scene.add(PR.pillow({ w: 0.72, h: 0.15, d: 0.46, mat: sheetMat, pos: [0.2, 0.625, 0.28], rot: [0, 0.08, 0.04] }));
    scene.add(PR.pillow({ w: 0.72, h: 0.19, d: 0.46, mat: sheetMat, pos: [-0.72, 0.665, 0.33], rot: [0, -0.05, 0] }));
    // duvet draped over P (exclude head + reaching arm)
    const skip = new Set(); P.joints.rShoulder.traverse(o => skip.add(o)); P.joints.head.traverse(o => skip.add(o)); if (comp2) { comp2.joints.head.traverse(o => skip.add(o)); }
    const duvet = F.drapeSheet({ region: [-1.18, comp2 ? 0.78 : 0.74, comp2 ? 0.74 : 1.02, comp2 ? 2.6 : 2.45], y0: 0.585, objects: comp2 ? [P.group, comp2.group] : [P.group], exclude: (c) => skip.has(c), res: [110, 120], thick: comp2 ? 0.1 : 0.08, blur: comp2 ? 8 : 5, noise: 0.012, material: duvetMat, edgeFalloff: 0.0 });
    scene.add(duvet);
    // hanging skirt of the duvet on the near side
    const skirtGeo = new THREE.PlaneGeometry(1.83, 0.36, 60, 8); const sp = skirtGeo.attributes.position;
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, 0.02 * Math.sin(x * 11) * (0.5 - y) * 2 + 0.01 * Math.sin(x * 23)); }
    skirtGeo.computeVertexNormals();
    const skirt = PR.mesh(skirtGeo, duvetMat, [0.735, 0.585 - 0.18, 1.535], [0, Math.PI / 2, 0]); scene.add(skirt);
    // nightstand + phone under the hand
    const ns = PR.nightstand({ pos: [1.06, 0, 0.42], topY: 0.7, w: 0.5, d: 0.44, color: 0x4a3a2e }); scene.add(ns);
    const on = v === 'a';
    const scrTex = PR.phoneScreenTex({ time: '6:00' });
    const ph = PR.phone({ screenTex: scrTex, emissive: on ? 2.6 : 0, on });
    const phX = v === 'c' ? 1.035 : handP.x + 0.06, phZ = v === 'c' ? 0.535 : handP.z + 0.01; ph.position.set(phX, 0.7 + 0.005, phZ); ph.rotation.y = 0.25; scene.add(ph);
    scene.add(PR.glassOfWater({ pos: [1.2, 0.7, 0.55] }));
    // charger cable
    const cab = []; for (let t = 0; t <= 20; t++) { const u = t / 20; cab.push(new THREE.Vector3(phX - 0.04 + u * 0.3, 0.705 - (u > 0.7 ? (u - 0.7) * 1.5 : 0), phZ - 0.1 - u * 0.1)); }
    scene.add(PR.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cab), 40, 0.0035, 6), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4 })));
    // outside: dawn sky plane beyond the window
    const sky = PR.mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshBasicMaterial({ color: (v === 'c' ? new THREE.Color(1.0, 0.7, 0.45) : new THREE.Color(0.35, 0.55, 0.95)).multiplyScalar(2.2) }), [4.2, 1.8, 1.0], [0, -Math.PI / 2, 0], false, false); scene.add(sky);
    // lights: cold dawn through blinds
    const win = new THREE.SpotLight(v === 'c' ? new THREE.Color(1.0, 0.74, 0.48) : new THREE.Color(0.5, 0.68, 1.0), v === 'c' ? 60 : 70, 0, v === 'c' ? 0.6 : 0.42, 0.5, 2);
    win.position.set(4.4, 2.35, 1.05); win.target.position.set(-0.2, 0.55, 0.75); win.castShadow = true;
    win.shadow.mapSize.set(2048, 2048); win.shadow.bias = -0.0002; win.shadow.radius = 1.5; win.shadow.camera.near = 1; win.shadow.camera.far = 12;
    scene.add(win, win.target); lights.push({ l: win, base: win.position.clone(), r: v === 'c' ? 0.5 : 0.02 });
    // bounce from the floor/sheets (cold, soft)
    const fill = new THREE.PointLight(v === 'c' ? new THREE.Color(1.0, 0.82, 0.62) : new THREE.Color(0.5, 0.62, 0.85), v === 'c' ? 1.4 : 0.25, 0, 2); fill.position.set(v === 'c' ? -0.4 : 0.6, v === 'c' ? 2.6 : 1.9, v === 'c' ? 1.4 : 2.2); scene.add(fill);
    // phone glow
    if (on) {
      const ra = new THREE.RectAreaLight(new THREE.Color(0.82, 0.9, 1.0), 4, 0.08, 0.16); ra.position.set(ph.position.x, 0.712, ph.position.z); ra.lookAt(ph.position.x, 2, ph.position.z); scene.add(ra);
      const pp = new THREE.PointLight(new THREE.Color(0.7, 0.82, 1.0), 0.05, 0, 2); pp.position.set(ph.position.x, 0.8, ph.position.z); scene.add(pp);
    }
    // a warm sliver: hallway light under a door (background right wall)
    const doorGlow = PR.mesh(new THREE.PlaneGeometry(0.9, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.3).multiplyScalar(3) }), [-2.19, 0.006, 3.0], [0, Math.PI / 2, 0], false, false);
    scene.add(doorGlow);
    // haze shaft through blinds
    const shaft = MT.lightShaft({ width: 1.3, height: 1.4, length: 4.2, color: v === 'c' ? [1.0, 0.72, 0.45] : [0.55, 0.72, 1.0], intensity: 0.025, stripes: 24, falloff: 1.2, noise: 0.4 });
    shaft.position.set(2.2, 1.62, 0.95); shaft.lookAt(-0.4, 0.35, 0.8); scene.add(shaft);
    scene.environment = C.gradientEnv(renderer, { top: [0.03, 0.045, 0.08], horizon: [0.04, 0.05, 0.07], bottom: [0.02, 0.02, 0.025], panels: [{ pos: [8, 2, 0], w: 5, h: 5, color: [0.4, 0.6, 1.0], intensity: 1.2 }] });
    scene.environmentIntensity = v === 'c' ? 0.55 : 0.25;
    scene.background = new THREE.Color(0, 0, 0);
  } else {
    // ---------------- reed hut at dawn
    const floorY = 0.4;
    const hut = PR.reedHut({ center: [0.35, 0, 0.9], R: 3.9, H: 3.5, door: { az: 0.1, w: 1.15, h: 1.45 }, floorY, seed: 7 });
    if (!q.get('nodome')) scene.add(hut);
    // sleeping bedding under P and companion
    scene.add(PR.bedding({ w: 2.7, d: 2.8, h: 0.18, pos: [0.15, floorY, 1.3], seed: 3 }));
    scene.add(PR.grassTufts({ count: 900, area: [2.6, 2.7], center: [0.15, floorY + 0.14, 1.25], height: 0.07, color: [0.62, 0.5, 0.3], seed: 8 }));
    // rolled hide as pillow
    const roll = PR.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 20), new THREE.MeshStandardMaterial({ color: 0x7a5a3e, roughness: 1 }), [0.2, 0.64, 0.32], [0, 0, Math.PI / 2]); scene.add(roll);
    const roll2 = PR.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 20), new THREE.MeshStandardMaterial({ color: 0x6a4c34, roughness: 1 }), [F.jointPoint(comp2, 'head').x, 0.62, 0.2], [0, 0, Math.PI / 2]); scene.add(roll2);
    // one hide blanket over both sleepers (same silhouette role as the duvet)
    const hd = MT.hide({ base: [128, 96, 66], dark: [104, 76, 52], seed: 5 });
    const hideMat = MT.texMat({ map: hd.map, bump: hd.bump, bumpScale: 1.6, roughness: 1, repeat: [2, 2] });
    const skipP = new Set(); P.joints.rShoulder.traverse(o => skipP.add(o)); P.joints.head.traverse(o => skipP.add(o)); comp2.joints.head.traverse(o => skipP.add(o));
    scene.add(F.drapeSheet({ region: [-0.85, 1.25, 0.95, 2.2], y0: 0.585, objects: [P.group, comp2.group], exclude: (c) => skipP.has(c), res: [110, 110], thick: 0.08, blur: 7, noise: 0.03, seed: 3, material: hideMat, edgeFalloff: 0.45, zFalloff: 0.35 }));
    // embers of the night fire
    const fr = PR.fire({ pos: [-2.25, floorY, 1.1], scale: 0.8, flames: 3, emberGlow: 5, flameIntensity: 2.2, seed: 3 }); scene.add(fr);
    const ember = new THREE.PointLight(new THREE.Color(1.0, 0.42, 0.14), 5.5, 0, 2); ember.position.set(-2.25, floorY + 0.35, 1.1); ember.castShadow = true; ember.shadow.mapSize.set(512, 512); ember.shadow.bias = -0.002; scene.add(ember);
    lights.push({ l: ember, base: ember.position.clone(), r: 0.12 });
    // outside world through the door: warm dawn sky + ground
    const sky = PR.daySky({ zenith: [0.5, 0.55, 0.7], horizon: [2.6, 1.6, 0.9], ground: [0.35, 0.25, 0.16], sunDir: [1, 0.06, -0.2], sunColor: [40, 26, 12], glow: [4, 2.2, 0.9], glowPow: 6 });
    scene.add(sky);
    const outGround = PR.mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 1 }), [0, floorY - 0.01, 0], [-Math.PI / 2, 0, 0], false, true); scene.add(outGround);
    // dawn light through the doorway (warm, low)
    const dawn = new THREE.SpotLight(new THREE.Color(1.0, 0.7, 0.45), 380, 0, 0.36, 0.7, 2);
    dawn.position.set(6.5, 1.35, 0.9); dawn.target.position.set(-0.2, 0.6, 0.9); dawn.castShadow = true; dawn.shadow.mapSize.set(2048, 2048); dawn.shadow.bias = -0.0003; dawn.shadow.radius = 2; dawn.shadow.camera.near = 2; dawn.shadow.camera.far = 14;
    scene.add(dawn, dawn.target); lights.push({ l: dawn, base: dawn.position.clone(), r: 0.5 });
    const fill = new THREE.PointLight(new THREE.Color(1.0, 0.6, 0.35), 0.8, 0, 2); fill.position.set(0.8, 1.9, 2.0); scene.add(fill);
    const shaft = MT.lightShaft({ width: 1.1, height: 1.3, length: 4.5, color: [1.0, 0.68, 0.4], intensity: 0.05, falloff: 1.1, noise: 0.6, seed: 3 });
    shaft.position.set(2.8, 1.05, 0.95); shaft.lookAt(-0.4, 0.45, 1.0); scene.add(shaft);
    scene.environment = C.gradientEnv(renderer, { top: [0.06, 0.04, 0.03], horizon: [0.1, 0.06, 0.035], bottom: [0.04, 0.025, 0.015], panels: [{ pos: [8, 1, 0], w: 3, h: 3, color: [1.0, 0.65, 0.4], intensity: 3 }] });
    scene.environmentIntensity = 0.5;
  }

  const cam = C.makeCamera(q, q.get('c34') ? CAM34 : CAM, w, h);
  const focus = cam.position.distanceTo(v === 'c' ? F.jointPoint(P, 'rWrist') : handP);

  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 1.8, seed: 7,
    onSample: (i, N, rng) => { for (const L of lights) { L.l.position.copy(L.base).add(new THREE.Vector3((rng() - 0.5) * 2 * L.r, (rng() - 0.5) * 2 * L.r, (rng() - 0.5) * 2 * L.r)); } },
    grade: v === 'c' ? 'newworld' : modern ? 'modern' : 'ancestral',
    bloom: { strength: 0.22, radius: 0.7, threshold: 1.2 },
    streak: v === 'c' ? null : modern ? { threshold: 1.6, strength: 0.5, tint: [0.35, 0.6, 1.0] } : { threshold: 2.0, strength: 0.25, tint: [1.0, 0.6, 0.35] },
  });
}
