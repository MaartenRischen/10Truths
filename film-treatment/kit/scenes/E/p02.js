// P02 NOT ANTI-TECH — (a) hands typing on a laptop in a dark room. (b) the same hands knapping flint by a fire.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';
import { HUNCH } from './p05.js';
import { mulberry32 } from './lib/cine.js';

function flintCore(seed = 3, size = 0.09) {
  const rng = mulberry32(seed);
  const geo = new THREE.IcosahedronGeometry(size, 3); const p = geo.attributes.position;
  // conchoidal facets: flatten by random planes
  const planes = [...Array(9)].map(() => { const n = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(); return [n, size * (0.55 + rng() * 0.3)]; });
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.x *= 1.25; v.z *= 0.85; for (const [n, d] of planes) { const t = v.dot(n); if (t > d) v.addScaledVector(n, (d - t) * 0.9); } p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const tex = MT.canvasTexture(256, (u, vv, o) => { const n = flintNoise.fbm(u * 6, vv * 6, 5); const k = 0.55 + n * 0.8; o[0] = 150 * k; o[1] = 118 * k; o[2] = 86 * k; });
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
}
const flintNoise = MT.makeNoise(41);

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 48));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  const seatH = 0.52;
  // same pose for both: hunched forward, right hand lifted mid-stroke
  const pose = { ...HUNCH, lHip: [-90, 0, 6], rHip: [-90, 0, -6], lKnee: [92, 0, 0], rKnee: [92, 0, 0], chest: [26, 0, 0], head: [22, 0, 0],
    rShoulder: [-52, 8, -12], rElbow: [-66, 0, 6], rWrist: [6, 0, -8], lShoulder: [-50, -8, 14], lElbow: [-58, 0, -6], lWrist: [-14, 0, 10] };
  const P = F.figure({ kind: 'beech', seed: 5, pose, rotY: 90 }); F.seatFig(P, seatH); scene.add(P.group);
  const hl = F.jointPoint(P, 'lWrist', [0, -0.1, 0]), hr = F.jointPoint(P, 'rWrist', [0, -0.1, 0]);
  const hc = hl.clone().add(hr).multiplyScalar(0.5);
  if (v === 'a') {
    const hy = hl.y - 0.03;
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x2d2824, roughness: 0.45 });
    scene.add(PR.mesh(PR.rbox(1.1, 0.04, 1.8, 0.01), deskMat, [hc.x + 0.3, hy - 0.02, 0]));
    const lap = MD.laptop({ pos: [hl.x + 0.06, hy, (hl.z + hr.z) / 2], rotY: -Math.PI / 2, open: 110, screenTex: MD.laptopScreenTex({ kind: 'doc', seed: 7 }), emissive: 1.8, W: 0.4, D: 0.28 });
    scene.add(lap);
    const scrW = lap.userData.screen.getWorldPosition(new THREE.Vector3());
    const ra = new THREE.RectAreaLight(new THREE.Color(0.8, 0.9, 1.0), 16, 0.36, 0.22); ra.position.copy(scrW).add(new THREE.Vector3(-0.012, 0, 0)); ra.lookAt(scrW.clone().add(new THREE.Vector3(-1, -0.25, 0))); scene.add(ra);
    // a mug, cables, a phone: modern desk clutter in soft focus
    const mug = PR.mesh(new THREE.CylinderGeometry(0.045, 0.042, 0.1, 24), new THREE.MeshPhysicalMaterial({ color: 0xd8d4cc, roughness: 0.3, clearcoat: 0.5 }), [hc.x + 0.32, hy + 0.05, hl.z - 0.42]); scene.add(mug);
    const ph = PR.phone({ screenTex: PR.phoneScreenTex({ time: '23:48', wall: 'night', alarm: false }), emissive: 0.0, on: false }); ph.position.set(hc.x + 0.18, hy + 0.005, hr.z + 0.35); ph.rotation.y = 0.4; scene.add(ph);
    scene.add(PR.mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.8 }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(20, 6), new THREE.MeshStandardMaterial({ color: 0x1d2126, roughness: 0.9 }), [0, 3, -2.5], [0, 0, 0], false, true));
    // distant bokeh: a window far behind with city specks
    scene.add(MD.lightPoints({ count: 50, box: [[1, 0.6, -9], [9, 3.2, -6]], intensity: 6, seed: 12, size: [0.03, 0.08] }));
    scene.environment = C.gradientEnv(renderer, { top: [0.015, 0.02, 0.035], horizon: [0.03, 0.04, 0.06], bottom: [0.01, 0.01, 0.012], panels: [{ pos: [3, 1, 0], w: 2, h: 1.4, color: [0.8, 0.9, 1.0], intensity: 1.0 }] });
    scene.environmentIntensity = 0.3;
  } else {
    // knapping by the fire: core in the left hand, hammerstone in the right
    const core = flintCore(3, 0.088); core.position.copy(hl).add(new THREE.Vector3(0.045, 0.045, 0.01)); core.rotation.set(0.4, 0.3, 0.2); core.castShadow = true; scene.add(core);
    const ham = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 3), new THREE.MeshStandardMaterial({ color: 0xb8ab98, roughness: 0.7 }));
    ham.scale.set(1.2, 0.9, 1); ham.position.copy(hr).add(new THREE.Vector3(0.02, 0.0, 0)); ham.castShadow = true; scene.add(ham);
    // flakes flying + on a hide below
    const flakeMat = new THREE.MeshPhysicalMaterial({ color: 0x8a6c50, roughness: 0.25, clearcoat: 0.8, side: THREE.DoubleSide });
    const rng = mulberry32(9);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.01 + rng() * 0.01, 5), flakeMat); f.position.copy(core.position).add(new THREE.Vector3(0.04 + rng() * 0.16, 0.02 + rng() * 0.08 - i * 0.012, (rng() - 0.3) * 0.14)); f.rotation.set(rng() * 6, rng() * 6, rng() * 6); scene.add(f); }
    const hd = MT.hide({ base: [130, 96, 64], dark: [74, 52, 34], seed: 12 });
    const hideM = PR.mesh(new THREE.CircleGeometry(0.5, 24), MT.texMat({ map: hd.map, bump: hd.bump, bumpScale: 2, roughness: 1 }), [hc.x + 0.05, 0.012, hc.z], [-Math.PI / 2, 0, 0], false, true); hideM.scale.set(1.2, 0.9, 1); scene.add(hideM);
    for (let i = 0; i < 18; i++) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.01 + rng() * 0.012, 5), flakeMat); f.position.set(hc.x + (rng() - 0.3) * 0.5, 0.02, hc.z + (rng() - 0.5) * 0.5); f.rotation.set(-Math.PI / 2 + (rng() - 0.5) * 0.4, 0, rng() * 6); scene.add(f); }
    // log seat, fire ahead-right
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.25, 0.27, 2.0, 16), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 }), [F.jointPoint(P, 'pelvis').x - 0.03, 0.27, -0.2], [Math.PI / 2, 0, 0]));
    const camp = S.fireCamp(scene, { center: [hc.x + 0.8, 0, hc.z - 0.2], fireScale: 0.85, seed: 12, lightI: 12 });
    const key = new THREE.PointLight(new THREE.Color(1.0, 0.55, 0.25), 1.2, 0, 2); key.position.set(hc.x + 0.35, hc.y - 0.1, hc.z + 0.4); scene.add(key);
    lights.push(...camp.lights);
    scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.03], horizon: [0.02, 0.025, 0.04], bottom: [0.05, 0.025, 0.01], panels: [{ pos: [3, 0.5, -1], w: 2, h: 2, color: [1.0, 0.5, 0.2], intensity: 2.0 }] });
    scene.environmentIntensity = 0.3;
  }
  const rc = (q.get('rc') || '-0.25,0.33,1.0').split(',').map(Number), rl = (q.get('rl') || '-0.0,0.04,0').split(',').map(Number);
  const cam = C.makeCamera(q, { pos: [hc.x + rc[0], hc.y + rc[1], hc.z + rc[2]], look: [hc.x + rl[0], hc.y + rl[1], hc.z + rl[2]], fov: +(q.get('fv') || 25) }, w, h);
  const focus = cam.position.distanceTo(hc);
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 2.0, dofScale: 1.4, seed: 2,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: v === 'a' ? 'modern' : 'fire',
    bloom: { strength: 0.3, radius: 0.75, threshold: 1.1 },
    streak: v === 'a' ? { threshold: 2.5, strength: 0.25, tint: [0.35, 0.6, 1.0] } : { threshold: 3.0, strength: 0.15, tint: [1.0, 0.55, 0.3] },
  });
}
