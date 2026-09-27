// P05 MISMATCH — split: same hunched pose. v=L: at a laptop at night (cold). v=R: by the fire among others (warm).
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';

export const HUNCH = {
  pelvis: [0, 0, 0], chest: [30, 0, 0], head: [16, 0, 0],
  lShoulder: [-52, -6, 12], rShoulder: [-52, 6, -12], lElbow: [-58, 0, -6], rElbow: [-58, 0, 6], lWrist: [-12, 0, 8], rWrist: [-12, 0, -8],
};
export function hunchFig(seatH, legs = 'chair', kind = 'beech', seed = 5) {
  const L = legs === 'chair' ? { lHip: [-90, 0, 6], rHip: [-90, 0, -6], lKnee: [92, 0, 0], rKnee: [92, 0, 0], lAnkle: [-2, 0, 0], rAnkle: [-2, 0, 0] }
    : { lHip: [-104, 0, 10], rHip: [-104, 0, -10], lKnee: [118, 0, 0], rKnee: [118, 0, 0], lAnkle: [-8, 0, 0], rAnkle: [-8, 0, 0] };
  const f = F.figure({ kind, seed, pose: { ...HUNCH, ...L }, rotY: 90 });
  F.seatFig(f, seatH);
  return f;
}

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'L';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 48));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  let P;
  if (v === 'L') {
    const seatH = 0.52;
    P = hunchFig(seatH, 'chair'); scene.add(P.group);
    const hl = F.jointPoint(P, 'lWrist', [0, -0.1, 0]), hr = F.jointPoint(P, 'rWrist', [0, -0.1, 0]);
    const hy = Math.min(hl.y, hr.y) - 0.035; const hx = (hl.x + hr.x) / 2;
    // desk under the hands
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.5 });
    const deskX = hx + 0.35;
    scene.add(PR.mesh(PR.rbox(1.0, 0.04, 1.6, 0.01), deskMat, [deskX, hy - 0.02, 0.0]));
    for (const [dx, dz] of [[-0.45, -0.72], [0.45, -0.72], [-0.45, 0.72], [0.45, 0.72]]) scene.add(PR.mesh(new THREE.BoxGeometry(0.04, hy - 0.04, 0.04), deskMat, [deskX + dx, (hy - 0.04) / 2, dz]));
    const lap = MD.laptop({ pos: [hx + 0.07, hy, 0], rotY: -Math.PI / 2, open: 108, screenTex: MD.laptopScreenTex({ kind: 'doc', seed: 3 }), emissive: 1.6 });
    scene.add(lap);
    // chair
    const chMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.6 });
    const sx = F.jointPoint(P, 'pelvis').x;
    scene.add(PR.mesh(PR.rbox(0.5, 0.06, 0.5, 0.02), chMat, [sx - 0.02, seatH - 0.03, 0]));
    scene.add(PR.mesh(PR.rbox(0.06, 0.6, 0.46, 0.02), chMat, [sx - 0.3, seatH + 0.3, 0], [0, 0, 0.12]));
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.03, 0.03, seatH - 0.1, 8), chMat, [sx - 0.02, (seatH - 0.1) / 2 + 0.05, 0]));
    // laptop glow on the face
    const scrW = lap.userData.screen.getWorldPosition(new THREE.Vector3());
    const ra = new THREE.RectAreaLight(new THREE.Color(0.8, 0.9, 1.0), 14, 0.32, 0.2); ra.position.copy(scrW).add(new THREE.Vector3(-0.01, 0, 0)); ra.lookAt(scrW.clone().add(new THREE.Vector3(-1, 0.1, 0))); scene.add(ra);
    // room: floor, back wall with a window of distant city (dim)
    scene.add(PR.mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.7 }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x25292f, roughness: 0.9 });
    const zW = -2.2;
    scene.add(PR.mesh(new THREE.PlaneGeometry(12, 3.2), wallMat, [-3.6, 1.6, zW], [0, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(12, 3.2), wallMat, [5.6, 1.6, zW], [0, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(1.6, 0.9), wallMat, [1.0, 0.45, zW], [0, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(1.6, 0.8), wallMat, [1.0, 2.8, zW], [0, 0, 0], false, true));
    scene.add(MD.city({ center: [0, -10, -70], spread: [160, 50], count: 70, seed: 9, emissive: 0.8, litFrac: 0.25 }));
    scene.add(MD.lightPoints({ count: 60, box: [[-20, -6, -40], [25, 3, -15]], intensity: 8, seed: 3 }));
    scene.add(PR.mesh(new THREE.PlaneGeometry(500, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.01, 0.02, 0.04) }), [0, 60, -140], [0, 0, 0], false, false));
    const win = new THREE.SpotLight(new THREE.Color(0.4, 0.55, 0.9), 10, 0, 0.6, 0.9, 2); win.position.set(1.0, 2.0, -3.4); win.target.position.set(0.2, 0.9, 0.2); win.castShadow = true; win.shadow.mapSize.set(1024, 1024); scene.add(win, win.target);
    lights.push({ l: win, base: win.position.clone(), r: 0.4 });
    scene.environment = C.gradientEnv(renderer, { top: [0.015, 0.02, 0.035], horizon: [0.03, 0.04, 0.06], bottom: [0.01, 0.01, 0.012] });
    scene.environmentIntensity = 0.3;
  } else {
    const seatH = 0.52;
    P = hunchFig(seatH, 'chair'); scene.add(P.group);
    const hc = F.jointPoint(P, 'lWrist', [0, -0.1, 0]);
    const fx = hc.x + 0.5;
    const camp = S.fireCamp(scene, { center: [fx, 0, 0.35], fireScale: 0.72, seed: 8, lightI: 10 });
    lights.push(...camp.lights);
    const log = PR.mesh(new THREE.CylinderGeometry(0.25, 0.27, 2.0, 16), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 }), [F.jointPoint(P, 'pelvis').x - 0.03, 0.27, -0.2], [Math.PI / 2, 0, 0]); scene.add(log);
    // the band: behind the fire, facing it (soft background)
    const band = [[-1.1, -2.1, 152, 'oak', 21], [-0.2, -2.55, 178, 'walnut', 22], [0.7, -2.45, 200, 'maple', 23], [1.55, -2.0, 225, 'ash', 24]];
    for (const [dx, z, ry, kind, sd] of band) { const f = F.figure({ kind, seed: sd, pose: crossPose(sd), rotY: ry }); f.group.position.set(fx + dx, 0, z); F.groundFig(f, 0); scene.add(f.group); }
    { const ch = F.figure({ kind: 'maple', seed: 25, pose: crossPose(4), rotY: 195, scale: 0.62, child: true }); ch.group.position.set(fx + 0.25, 0, -2.3); F.groundFig(ch, 0); scene.add(ch.group); }
    // one companion close at P's shoulder, a little behind
    { const nb = F.figure({ kind: 'walnut', seed: 27, pose: { ...HUNCH, lHip: [-104, 0, 10], rHip: [-104, 0, -10], lKnee: [118, 0, 0], rKnee: [118, 0, 0], chest: [20, 0, 0], head: [6, -12, 0] }, rotY: 78 });
      nb.group.position.set(-0.5, 0, -0.78); F.seatFig(nb, seatH); scene.add(nb.group); }
    scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.03], horizon: [0.02, 0.025, 0.04], bottom: [0.05, 0.025, 0.01], panels: [{ pos: [3, 0.5, 0], w: 2, h: 2, color: [1.0, 0.5, 0.2], intensity: 2.0 }] });
    scene.environmentIntensity = 0.3;
  }
  const head = F.jointPoint(P, 'head', [0, 0.1, 0]);
  const cam = C.makeCamera(q, { pos: [head.x + 0.35, 1.05, 3.7], look: [head.x + 0.3, 0.86, 0], fov: 21 }, w, h);
  const focus = cam.position.distanceTo(head);
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 1.8, dofScale: 2.4, seed: 5,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: v === 'L' ? 'modern' : 'fire',
    bloom: { strength: 0.3, radius: 0.75, threshold: 1.1 },
    streak: v === 'L' ? { threshold: 2.5, strength: 0.25, tint: [0.35, 0.6, 1.0] } : { threshold: 3.0, strength: 0.15, tint: [1.0, 0.55, 0.3] },
  });
}

export function crossPose(seed) {
  const r = (a) => ((Math.sin(seed * 12.9898 + a * 78.233) * 43758.5453) % 1 + 1) % 1;
  if (r(1) < 0.5) return { lHip: [-80, 0, 38], rHip: [-80, 0, -38], lKnee: [128, 0, 0], rKnee: [128, 0, 0], lAnkle: [0, 0, -20], rAnkle: [0, 0, 20], chest: [10 + r(2) * 10, 0, 0], head: [4 + r(3) * 10, (r(4) - 0.5) * 30, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-55, 0, 0], rElbow: [-55, 0, 0] };
  return { lHip: [-120, 0, 10], rHip: [-115, 0, -8], lKnee: [140, 0, 0], rKnee: [135, 0, 0], chest: [18 + r(2) * 8, 0, 0], head: [6, (r(4) - 0.5) * 30, 0], lShoulder: [-58, 0, 14], rShoulder: [-58, 0, -14], lElbow: [-40, -30, 0], rElbow: [-40, 30, 0] };
}
