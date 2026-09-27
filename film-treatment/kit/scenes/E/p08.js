// P08 EVERYTHING CHANGED — one frame of the hyper-montage: the same manikin, looking up, standing in a vast server hall of blinking racks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import { mulberry32 } from './lib/cine.js';

function rackFaceTex(seed) {
  const rng = mulberry32(seed);
  return MT.drawTexture(256, 1024, (g, W, H) => {
    g.fillStyle = '#0b0d10'; g.fillRect(0, 0, W, H);
    for (let u = 0; u < 42; u++) { const y = 20 + u * 23.5; g.fillStyle = u % 2 ? '#15191e' : '#12151a'; g.fillRect(12, y, W - 24, 21); g.fillStyle = '#1c2228'; for (let k = 0; k < 18; k++) g.fillRect(40 + k * 10, y + 6, 6, 9); }
  });
}
function ledTex(seed) {
  const rng = mulberry32(seed);
  return MT.drawTexture(256, 1024, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let u = 0; u < 42; u++) { const y = 20 + u * 23.5; const n = Math.floor(rng() * 5);
      for (let k = 0; k < n; k++) { const r = rng(); g.fillStyle = r < 0.62 ? '#39ff9a' : r < 0.9 ? '#4fb8ff' : '#ffb13d'; const x = 18 + rng() * 22; g.fillRect(x, y + 7, 4, 4); }
      if (rng() < 0.3) { g.fillStyle = '#2d7fff'; g.fillRect(W - 40, y + 8, 18, 3); } }
  });
}

export default async function ({ w, h, q }) {
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 40));
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  const rng = mulberry32(3);
  const aisleW = 1.4, rackW = 0.62, rackD = 1.1, rackH = 2.3, N = 52;
  const bodyG = []; 
  const faceMats = [0, 1, 2].map(i => new THREE.MeshStandardMaterial({ map: rackFaceTex(10 + i), emissiveMap: ledTex(20 + i), emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 7, roughness: 0.5, metalness: 0.5 }));
  const faceGeos = [[], [], []];
  for (const side of [-1, 1]) for (let i = 0; i < N; i++) {
    const x = side * (aisleW / 2 + rackD / 2), z = 4.2 - i * rackW;
    bodyG.push(new THREE.BoxGeometry(rackD, rackH, rackW - 0.02).translate(x, rackH / 2, z));
    const fg = new THREE.PlaneGeometry(rackW - 0.04, rackH - 0.06); fg.rotateY(-side * Math.PI / 2); fg.translate(side * aisleW / 2 - side * 0.002, rackH / 2, z);
    faceGeos[Math.floor(rng() * 3)].push(fg);
  }
  const body = new THREE.Mesh(mergeGeometries(bodyG), new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.45, metalness: 0.6 })); body.castShadow = true; body.receiveShadow = true; scene.add(body);
  faceGeos.forEach((l, i) => { if (l.length) scene.add(new THREE.Mesh(mergeGeometries(l), faceMats[i])); });
  // raised floor tiles (glossy), perforated
  const tl = MT.tiles({ base: [58, 64, 70], grout: [30, 33, 36], n: 4, seed: 7, groutW: 0.02 }); tl.map.repeat.set(24, 120); tl.bump.repeat.set(24, 120);
  scene.add(PR.mesh(new THREE.PlaneGeometry(14, 70), new THREE.MeshPhysicalMaterial({ map: tl.map, bumpMap: tl.bump, bumpScale: 0.4, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.15 }), [0, 0, -25], [-Math.PI / 2, 0, 0], false, true));
  // ceiling + cable trays + light strips over the aisle
  scene.add(PR.mesh(new THREE.PlaneGeometry(14, 70), new THREE.MeshStandardMaterial({ color: 0x0c0e11, roughness: 0.9 }), [0, 3.6, -25], [Math.PI / 2, 0, 0], false, true));
  const trayG = []; for (const x of [-1.6, 1.6]) trayG.push(new THREE.BoxGeometry(0.5, 0.08, 70).translate(x, 2.75, -25));
  for (let i = 0; i < 70; i++) trayG.push(new THREE.BoxGeometry(0.03, 0.9, 0.03).translate(-1.6, 3.2, -i), new THREE.BoxGeometry(0.03, 0.9, 0.03).translate(1.6, 3.2, -i));
  scene.add(new THREE.Mesh(mergeGeometries(trayG), new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.5, metalness: 0.7 })));
  const stripG = []; for (let i = 0; i < 22; i++) stripG.push(new THREE.BoxGeometry(0.08, 0.02, 1.4).translate(0, 3.2, -1 - i * 1.9));
  scene.add(new THREE.Mesh(mergeGeometries(stripG), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.88, 1.0).multiplyScalar(4) })));
  for (let i = 0; i < 6; i++) { const L = new THREE.PointLight(new THREE.Color(0.7, 0.85, 1.0), 3.5, 0, 2); L.position.set(0, 3.0, 1 - i * 4); scene.add(L); }
  const key = new THREE.SpotLight(new THREE.Color(0.7, 0.85, 1.0), 30, 0, 0.35, 0.8, 2); key.position.set(0, 3.1, 1.2); key.target.position.set(0, 0, -3.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; scene.add(key, key.target); lights.push({ l: key, base: key.position.clone(), r: 0.2 });
  // far end: a bright doorway / exit glow
  scene.add(PR.mesh(new THREE.PlaneGeometry(1.2, 2.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.85, 1.0).multiplyScalar(3) }), [0, 1.15, 4.2 - N * rackW - 0.5], [0, 0, 0], false, false));
  scene.fog = new THREE.FogExp2(new THREE.Color(0.02, 0.035, 0.06), 0.035);
  // the manikin: standing in the aisle, head tilted back, looking up at the endless racks
  const P = F.figure({ kind: 'beech', seed: 5, rotY: 180, pose: { head: [-32, 12, 0], chest: [-6, 0, 0], lShoulder: [-4, 0, 8], rShoulder: [-4, 0, -8], lElbow: [-8, 0, 0], rElbow: [-8, 0, 0] } });
  P.group.position.set(0.05, 0, -3.2); F.groundFig(P, 0); scene.add(P.group);
  scene.environment = C.gradientEnv(renderer, { top: [0.02, 0.03, 0.05], horizon: [0.04, 0.06, 0.1], bottom: [0.01, 0.01, 0.015], panels: [{ pos: [3, 1, 0], w: 1, h: 4, color: [0.3, 1.0, 0.6], intensity: 0.5 }, { pos: [-3, 1, 0], w: 1, h: 4, color: [0.3, 0.7, 1.0], intensity: 0.5 }] });
  scene.environmentIntensity = 0.6;
  const cam = C.makeCamera(q, { pos: [0.0, 0.55, 2.6], look: [0.0, 1.45, -8], fov: 34 }, w, h);
  const focus = cam.position.distanceTo(F.jointPoint(P, 'head'));
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 2.0, dofScale: 1.6, seed: 8,
    onSample: (i, N2, rng2) => S.jitterLights(lights, rng2),
    grade: 'modern', gradeOverride: { saturation: 0.95 },
    bloom: { strength: 0.4, radius: 0.7, threshold: 1.0 },
    streak: { threshold: 2.0, strength: 0.3, tint: [0.35, 0.65, 1.0] },
  });
}
