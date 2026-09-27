// P13 NOT BROKEN — split screen. v=L: modern self on a sofa, looking up from its phone toward the split (lit blue).
// v=R: ancestral self by the fire, looking back toward the split (lit gold). Each half rendered separately then joined.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';
import { mulberry32 } from './lib/cine.js';

// seated, forearms on thighs, hands together in front, head up & level
export const SIT = {
  lHip: [-92, 0, 6], rHip: [-92, 0, -6], lKnee: [96, 0, 0], rKnee: [96, 0, 0], lAnkle: [-4, 0, 0], rAnkle: [-4, 0, 0],
  pelvis: [0, 0, 0], chest: [20, 0, 0], head: [-14, 0, 0],
  lShoulder: [-30, -10, 10], rShoulder: [-30, 10, -10], lElbow: [-100, 0, -10], rElbow: [-100, 0, 10], lWrist: [-10, 0, 14], rWrist: [-10, 0, -14],
};

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'L';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 48));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  const mirror = v === 'R' ? -1 : 1;  // R faces -X (toward split on its left)
  const headTurn = +(q.get('ht') || 0);
  let focusPt, cam;

  const pose = { ...SIT, head: [-22, -18 + headTurn, 0] };
  if (v === 'L') {
    // ---------------- modern: apartment at night
    const seatH = 0.52;
    const P = F.figure({ kind: 'beech', seed: 5, pose, rotY: 60 });
    F.seatFig(P, seatH); scene.add(P.group);
    const d = new THREE.Vector3(Math.sin(Math.PI / 3), 0, Math.cos(Math.PI / 3));
    scene.add(MD.sofa({ pos: [-d.x * 0.32, 0, -d.z * 0.32], rotY: Math.PI / 3, w: 2.6, d: 1.05, seatH, color: 0x56606c }));
    // phone held in both hands, screen toward the chest
    const hl = F.jointPoint(P, 'lWrist', [0, -0.11, 0.02]), hr = F.jointPoint(P, 'rWrist', [0, -0.11, 0.02]);
    console.log('[scene] hands', hl.toArray().map(x=>x.toFixed(2)).join(','), hr.toArray().map(x=>x.toFixed(2)).join(','));
    const hc = hl.clone().add(hr).multiplyScalar(0.5);
    const headP = F.jointPoint(P, 'head', [0, 0.1, 0.05]);
    const ph = PR.phone({ screenTex: PR.faceGridTex({ seed: 8 }), emissive: 2.4 });
    const nrm = headP.clone().sub(hc).normalize().lerp(new THREE.Vector3(0, 1, 0), 0.3).normalize();
    PR.orient(ph, hc.clone().add(d.clone().multiplyScalar(0.025)), nrm, d.clone().add(new THREE.Vector3(0, 0.4, 0)));
    scene.add(ph);
    const ra = new THREE.RectAreaLight(new THREE.Color(0.75, 0.88, 1.0), 45, 0.08, 0.16);
    ra.position.copy(ph.position).addScaledVector(nrm, 0.012); ra.lookAt(ph.position.clone().addScaledVector(nrm, 1)); scene.add(ra);
    const pp = new THREE.PointLight(new THREE.Color(0.6, 0.78, 1.0), 0.35, 0, 2); pp.position.copy(ph.position).addScaledVector(nrm, 0.12); scene.add(pp);
    // room: floor + window wall onto the city
    const fl = MT.planks({ base: [96, 84, 74], dark: [60, 52, 46], seed: 5 });
    scene.add(PR.mesh(new THREE.PlaneGeometry(20, 20), MT.texMat({ map: fl.map, rough: fl.rough, roughness: 0.4, repeat: [4, 4] }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.9 });
    const zW = -2.6;
    scene.add(PR.mesh(new THREE.PlaneGeometry(14, 0.45), wallMat, [0, 0.225, zW], [0, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(14, 0.8), wallMat, [0, 3.0, zW], [0, 0, 0], false, true));
    for (let i = -5; i <= 5; i++) scene.add(PR.mesh(new THREE.BoxGeometry(0.07, 2.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x121417, roughness: 0.5 }), [i * 1.45 + 0.3, 1.55, zW]));
    scene.add(PR.mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshPhysicalMaterial({ color: 0x0a0d12, roughness: 0.04, transparent: true, opacity: 0.1, envMapIntensity: 1.0 }), [0, 1.55, zW + 0.02], [0, 0, 0], false, false));
    scene.add(MD.city({ center: [0, -10, -75], spread: [200, 60], count: 90, seed: 3, emissive: 0.28, litFrac: 0.3 }));
    scene.add(MD.lightPoints({ count: 300, box: [[-60, -10, -70], [60, 8, -20]], intensity: 5, size: [0.1, 0.26], seed: 7, colors: [[1, 0.72, 0.4], [0.55, 0.8, 1.0], [1, 0.9, 0.7], [0.4, 1.0, 0.9], [1, 0.55, 0.3]] }));
    scene.add(PR.mesh(new THREE.PlaneGeometry(500, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.025, 0.05) }), [0, 60, -140], [0, 0, 0], false, false));
    const win = new THREE.SpotLight(new THREE.Color(0.45, 0.62, 1.0), 18, 0, 0.8, 0.9, 2); win.position.set(0.5, 2.3, -3.6); win.target.position.set(0, 0.9, 0.3); win.castShadow = true; win.shadow.mapSize.set(1024, 1024); win.shadow.bias = -0.0005; scene.add(win, win.target);
    lights.push({ l: win, base: win.position.clone(), r: 0.6 });
    const rim = new THREE.SpotLight(new THREE.Color(0.25, 0.8, 0.75), 10, 0, 0.5, 0.9, 2); rim.position.set(-2.4, 1.9, -1.6); rim.target.position.set(0, 1.1, 0); scene.add(rim, rim.target);
    scene.environment = C.gradientEnv(renderer, { top: [0.02, 0.03, 0.05], horizon: [0.04, 0.05, 0.07], bottom: [0.01, 0.012, 0.015], panels: [{ pos: [0, 2, -8], w: 8, h: 3, color: [0.4, 0.55, 0.8], intensity: 0.5 }] });
    scene.environmentIntensity = 0.3;
    focusPt = F.jointPoint(P, 'head', [0, 0.12, 0]);
    cam = C.makeCamera(q, { pos: [-1.25, 1.2, 4.4], look: [-0.05, 0.98, 0], fov: 19.5 }, w, h);
  } else {
    // ---------------- ancestral: fire camp at night (mirror of L)
    const d = new THREE.Vector3(-Math.sin(Math.PI / 3), 0, Math.cos(Math.PI / 3));
    const fc = new THREE.Vector3(+(q.get('fx') || 0.12), 0, +(q.get('fz') || 1.35));
    const camp = S.fireCamp(scene, { center: [fc.x, 0, fc.z], fireScale: 0.95, seed: 5, lightI: 9, skyGlow: { dir: [-1, 0, -0.3], color: [0.02, 0.03, 0.06] } });
    lights.push(...camp.lights);
    const seatH = 0.52;
    const P = F.figure({ kind: 'beech', seed: 5, pose, rotY: -60 });
    F.seatFig(P, seatH); scene.add(P.group);
    const log = PR.mesh(new THREE.CylinderGeometry(0.25, 0.27, 1.9, 16), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 }), [-d.x * 0.08, 0.26, -d.z * 0.08], [0, 0, 0]); log.rotation.set(0, -Math.PI / 3, Math.PI / 2); scene.add(log);
    // the band around the fire, beyond it (soft background)
    // members sit around the far side of the fire, facing it
    // the band: behind P on the far side of the fire, facing it (and us), warm-lit, soft
    const band = [[0.95, -0.75, 'oak', 11, 'cross'], [1.75, -0.05, 'walnut', 12, 'knees'], [0.2, -1.45, 'maple', 13, 'lean'], [2.35, 0.95, 'ash', 14, 'cross'], [-0.75, -1.2, 'oak', 16, 'knees']];
    const brng = mulberry32(21);
    for (const [x, z, kind, sd, pk] of band) {
      const ry = Math.atan2(fc.x - x, fc.z - z) * 180 / Math.PI + (brng() - 0.5) * 30;
      const f = F.figure({ kind, seed: sd, pose: F.seatedPose(pk, brng, pk === 'lean' ? 14 : 0), rotY: ry });
      f.group.position.set(x, 0, z); F.groundFig(f, 0); scene.add(f.group);
    }
    { const ch = F.figure({ kind: 'maple', seed: 15, pose: F.seatedPose('knees', brng), rotY: Math.atan2(fc.x - 1.3, fc.z + 0.55) * 180 / Math.PI, scale: 0.6, child: true });
      ch.group.position.set(1.3, 0, -0.55); F.groundFig(ch, 0); scene.add(ch.group); }
    scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.03], horizon: [0.02, 0.025, 0.04], bottom: [0.05, 0.025, 0.01], panels: [{ pos: [-3, 0.5, 1.5], w: 2, h: 2, color: [1.0, 0.5, 0.2], intensity: 2.0 }] });
    scene.environmentIntensity = 0.3;
    focusPt = F.jointPoint(P, 'head', [0, 0.12, 0]);
    cam = C.makeCamera(q, { pos: [1.25, 1.2, 4.4], look: [0.05, 0.98, 0], fov: 19.5 }, w, h);
  }
  const focus = cam.position.distanceTo(focusPt);
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 1.6, dofScale: 1.7, seed: 3,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: v === 'L' ? 'modern' : 'fire',
    bloom: { strength: 0.3, radius: 0.75, threshold: 1.1 },
    streak: v === 'L' ? { threshold: 2.5, strength: 0.25, tint: [0.35, 0.6, 1.0] } : { threshold: 3.0, strength: 0.15, tint: [1.0, 0.55, 0.3] },
  });
}

// a relaxed cross-legged/knees-up seated pose with a little variation
function POSES_CROSS(seed) {
  const r = (a) => ((Math.sin(seed * 12.9898 + a * 78.233) * 43758.5453) % 1 + 1) % 1;
  const k = r(1);
  if (k < 0.5) return { lHip: [-80, 0, 38], rHip: [-80, 0, -38], lKnee: [128, 0, 0], rKnee: [128, 0, 0], lAnkle: [0, 0, -20], rAnkle: [0, 0, 20], chest: [10 + r(2) * 10, 0, 0], head: [4 + r(3) * 10, (r(4) - 0.5) * 30, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-55, 0, 0], rElbow: [-55, 0, 0] };
  return { lHip: [-120, 0, 10], rHip: [-115, 0, -8], lKnee: [140, 0, 0], rKnee: [135, 0, 0], chest: [18 + r(2) * 8, 0, 0], head: [6, (r(4) - 0.5) * 30, 0], lShoulder: [-58, 0, 14], rShoulder: [-58, 0, -14], lElbow: [-40, -30, 0], rElbow: [-40, 30, 0] };
}
