// P11 IT IS EVERYTHING — (a) in a car in a traffic jam at night, red tail lights. (b) the same profile, walking with the band across open country at sunrise.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';
import { walkPose } from './p06.js';
import { mulberry32 } from './lib/cine.js';

const HEAD_TARGET = new THREE.Vector3(0, 1.62, 0);

function carBody(color = 0x0a0b0d) {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.1 });
  g.add(PR.mesh(PR.rbox(4.3, 0.75, 1.8, 0.2), m, [0, 0.62, 0])); g.add(PR.mesh(PR.rbox(2.3, 0.6, 1.6, 0.25), m, [-0.2, 1.22, 0]));
  const tl = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.05, 0.03).multiplyScalar(9) });
  for (const s of [-1, 1]) g.add(PR.mesh(new THREE.BoxGeometry(0.05, 0.1, 0.34), tl, [-2.16, 0.82, s * 0.68], [0, 0, 0], false, false));
  g.add(PR.mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), tl, [-1.3, 1.5, 0], [0, 0, 0], false, false));
  return g;
}

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 40));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  let P;
  if (v === 'a') {
    P = F.figure({ kind: 'beech', seed: 5, rotY: 90, pose: { lHip: [-80, 0, 8], rHip: [-80, 0, -8], lKnee: [70, 0, 0], rKnee: [70, 0, 0], chest: [-4, 0, 0], head: [2, 0, 0], lShoulder: [-58, 0, 12], rShoulder: [-58, 0, -12], lElbow: [-40, 0, 0], rElbow: [-40, 0, 0] } });
  } else {
    P = F.figure({ kind: 'beech', seed: 5, rotY: 90, pose: walkPose(0.3, 4, { head: [2, 0, 0], chest: [4, 0, 0] }) });
  }
  scene.add(P.group); P.group.updateMatrixWorld(true);
  { const hp = F.jointPoint(P, 'head', [0, 0.12, 0]); P.group.position.add(HEAD_TARGET.clone().sub(hp)); P.group.updateMatrixWorld(true); }
  const headP = F.jointPoint(P, 'head', [0, 0.12, 0.02]);
  const floorY = v === 'a' ? null : (() => { P.group.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(P.group); return b.min.y; })();
  if (v === 'a') {
    // car interior around the driver (driving toward +x). Seat, wheel, dash, pillars, roof.
    const seatY = F.jointPoint(P, 'pelvis').y - 0.12;
    const trim = new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.7 });
    const wheelC = F.jointPoint(P, 'lWrist', [0, -0.08, 0]).lerp(F.jointPoint(P, 'rWrist', [0, -0.08, 0]), 0.5);
    const wheel = PR.mesh(new THREE.TorusGeometry(0.2, 0.02, 10, 48), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.45 }), wheelC.toArray(), [0, Math.PI / 2, 0]); wheel.rotateX(0.4); scene.add(wheel);
    // dashboard (top at wheel height), instrument glow, roof edge, low seat back
    const dashTop = wheelC.y - 0.02;
    scene.add(PR.mesh(PR.rbox(0.7, 0.35, 2.0, 0.08), trim, [wheelC.x + 0.4, dashTop - 0.175, headP.z + 0.45]));
    const cluster = PR.mesh(new THREE.PlaneGeometry(0.3, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.8, 1.0).multiplyScalar(1.6) }), [wheelC.x + 0.12, dashTop + 0.02, headP.z], [0, -Math.PI / 2, 0], false, false); scene.add(cluster);
    const scr = PR.mesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshBasicMaterial({ map: MD.laptopScreenTex({ kind: 'feed', seed: 4 }), color: new THREE.Color(1, 1, 1).multiplyScalar(1.2) }), [wheelC.x + 0.2, dashTop + 0.06, headP.z + 0.5], [0, -Math.PI / 2 + 0.3, 0], false, false); scene.add(scr);
    scene.add(PR.mesh(new THREE.PlaneGeometry(1.6, 2.4), trim, [headP.x - 0.1, headP.y + 0.3, headP.z + 0.45], [Math.PI / 2, 0, 0], false, true));
    scene.add(PR.mesh(PR.rbox(0.18, 0.62, 0.55, 0.06), new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.9 }), [headP.x - 0.3, headP.y - 0.62, headP.z]));
    // traffic: our lane ahead (+x) and the next lanes, all braking
    const rng = mulberry32(9);
    for (const [lz, off] of [[0, 0], [-3.1, 2.2], [3.1, 1.1], [-6.2, 0.5]]) for (let k = 0; k < 8; k++) {
      const c = carBody([0x0a0b0d, 0x1a1e24, 0x2a2020, 0x30343a][Math.floor(rng() * 4)]);
      c.position.set(headP.x + 5.2 + off + k * (5.6 + rng() * 0.8), 0, headP.z + lz + (rng() - 0.5) * 0.3); c.scale.setScalar(UNIT_S); scene.add(c);
    }
    scene.add(PR.mesh(new THREE.BoxGeometry(0.07, 0.75, 0.07), trim, [headP.x + 0.62, headP.y - 0.05, headP.z + 1.3], [0, 0, -0.7]));
    scene.add(MD.lightPoints({ count: 40, box: [[headP.x - 4, 5, headP.z - 30], [headP.x + 40, 7, headP.z - 8]], intensity: 10, seed: 3, size: [0.12, 0.2], colors: [[1, 0.62, 0.28]] }));
    scene.add(MD.city({ center: [headP.x + 20, -2, headP.z - 60], spread: [120, 20], count: 30, seed: 5, emissive: 0.7, litFrac: 0.25 }));
    scene.add(PR.mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.35, metalness: 0.2 }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(400, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.03, 0.05) }), [0, 50, -120], [0, 0, 0], false, false));
    // key: red from the brake lights ahead, fill: cold dash
    const red = new THREE.PointLight(new THREE.Color(1.0, 0.08, 0.05), 6, 0, 2); red.position.set(headP.x + 2.8, 1.0, headP.z + 0.3); scene.add(red);
    const red2 = new THREE.PointLight(new THREE.Color(1.0, 0.1, 0.05), 3, 0, 2); red2.position.set(headP.x + 1.2, 1.0, headP.z - 2.5); scene.add(red2);
    const dash = new THREE.PointLight(new THREE.Color(0.3, 0.75, 1.0), 0.25, 0, 2); dash.position.set(wheelC.x + 0.15, wheelC.y + 0.02, headP.z); scene.add(dash);
    const sodium = new THREE.SpotLight(new THREE.Color(1.0, 0.6, 0.3), 12, 0, 0.6, 0.9, 2); sodium.position.set(headP.x - 1, 6, headP.z - 3); sodium.target.position.copy(headP); scene.add(sodium, sodium.target);
    scene.environment = C.gradientEnv(renderer, { top: [0.02, 0.025, 0.04], horizon: [0.05, 0.03, 0.03], bottom: [0.01, 0.01, 0.012], panels: [{ pos: [6, 1, 0], w: 4, h: 1, color: [1.0, 0.1, 0.05], intensity: 1.5 }] });
    scene.environmentIntensity = 0.4;
  } else {
    const root = new THREE.Group(); root.position.y = floorY; scene.add(root);
    const sunDir = new THREE.Vector3(1, 0.06, -0.12).normalize();
    scene.add(PR.daySky({ zenith: [0.16, 0.24, 0.42], horizon: [1.9, 1.05, 0.55], ground: [0.25, 0.18, 0.1], sunDir: sunDir.toArray(), sunColor: [70, 42, 18], sunSize: 0.99955, glow: [3.4, 1.7, 0.6], glowPow: 7 }));
    scene.fog = new THREE.FogExp2(new THREE.Color(0.95, 0.62, 0.36).multiplyScalar(0.4), 0.004);
    root.add(S.earthGround({ size: 400, repeat: 120, base: [120, 98, 66], dark: [84, 66, 44], seed: 5 }));
    const gm = S.grassMaterial({ sunDir: sunDir.toArray(), translAmt: 1.8 });
    root.add(S.grassField({ area: [34, 16], center: [headP.x + 14, 0, headP.z - 2], density: 55, height: [0.3, 0.8], seed: 13, material: gm, clumps: 400, heads: 0.2 }));
    root.add(S.grassField({ area: [120, 60], center: [headP.x + 20, 0, headP.z - 40], density: 5, height: [0.5, 1.0], width: [0.03, 0.05], seed: 14, material: gm, exclude: (x, z) => z > headP.z - 12 }));
    root.add(S.acacia({ pos: [headP.x + 18, 0, headP.z - 30], height: 6, spread: 7, seed: 21, leafCards: 1500 }));
    root.add(S.acacia({ pos: [headP.x - 16, 0, headP.z - 45], height: 7, spread: 8, seed: 22, silhouette: true, leafColor: [0.12, 0.08, 0.05] }));
    // the band walking ahead and behind, same direction
    const rng = mulberry32(5);
    for (const [dx, dz, kind, ph] of [[2.2, -0.5, 'oak', 0.6], [3.4, 0.8, 'walnut', 0.1], [4.6, -1.2, 'maple', 0.8], [6.3, 0.2, 'ash', 0.4], [8.0, -0.9, 'oak', 0.9], [9.6, 0.9, 'beech', 0.25]]) {
      const f = F.figure({ kind, seed: 70 + Math.floor(rng() * 20), rotY: 90 + (rng() - 0.5) * 10, pose: walkPose(ph, Math.floor(rng() * 50)) });
      f.group.position.set(headP.x + dx, floorY, headP.z + dz); F.groundFig(f, floorY); scene.add(f.group);
    }
    { const k = F.figure({ kind: 'maple', seed: 93, scale: 0.6, child: true, rotY: 92, pose: walkPose(0.7, 12) }); k.group.position.set(headP.x + 2.9, floorY, headP.z + 0.1); F.groundFig(k, floorY); scene.add(k.group); }
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.7, 0.42), 5.5); sun.position.copy(headP).addScaledVector(sunDir, 40); sun.target.position.copy(headP); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 8, bottom: -8, near: 1, far: 90 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.5, 0.58, 0.8), new THREE.Color(0.5, 0.36, 0.2), 0.9));
    scene.environment = C.gradientEnv(renderer, { top: [0.2, 0.28, 0.45], horizon: [1.2, 0.8, 0.5], bottom: [0.25, 0.18, 0.1], panels: [{ pos: [sunDir.x * 10, sunDir.y * 10 + 0.5, sunDir.z * 10], w: 3, h: 2, color: [1, 0.7, 0.4], intensity: 6 }] });
    scene.environmentIntensity = 0.5;
  }
  // identical camera: profile, head-and-shoulders, look room to the right (+x)
  const cam = C.makeCamera(q, { pos: [headP.x - 0.78, headP.y + 0.06, headP.z + 0.42], look: [headP.x + 3.0, headP.y - 0.28, headP.z - 0.05], fov: 34 }, w, h);
  const focus = v === 'a' ? cam.position.distanceTo(headP) * 1.05 : cam.position.distanceTo(headP) * 1.05;
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 1.6, dofScale: 1.8, seed: 11,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: v === 'a' ? 'modern' : 'ancestral', gradeOverride: v === 'b' ? { contrast: 0.5, saturation: 1.12, exposure: 0.85 } : undefined,
    bloom: v === 'a' ? { strength: 0.35, radius: 0.75, threshold: 1.0 } : { strength: 0.12, radius: 0.6, threshold: 2.0 },
    streak: v === 'a' ? { threshold: 4.0, strength: 0.15, tint: [1.0, 0.3, 0.25] } : { threshold: 6.0, strength: 0.2, tint: [1.0, 0.7, 0.4] },
  });
}
const UNIT_S = 2.0 / 1.75;
