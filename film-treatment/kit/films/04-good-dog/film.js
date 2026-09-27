// GOOD DOG (film 04): a wooden dog alone all day; its owner comes home and does the same things. ~62.5 s, vertical.
import * as THREE from 'three';
import * as E from '../../film/engine.js';
import { endCardShot } from '../../film/text.js';
import * as C from '../../scenes/E/lib/cine.js';
import * as F from '../../scenes/E/lib/figs.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as MT from '../../scenes/E/lib/mat.js';
import * as CO from '../../scenes/E/lib/court.js';
import { buildDog, DOG_POSES, lerpPose, P } from './dog.js';
import * as FL from './flat.js';
import { dogGait, dogStand, manWalk, linePath, curvePath } from './anim.js';

const DEG = Math.PI / 180;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const seg = (t, a, b) => clamp01((t - a) / (b - a));
// keyed pose track with per-key hold: keys [[t, pose], ...], linear-in-pose with smoothstep easing
function ptrack(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [t0, a] = keys[i], [t1, b] = keys[i + 1]; if (t < t1) return lerpPose(a, b, sm((t - t0) / (t1 - t0))); }
    return keys[keys.length - 1][1];
  };
}
const boilP = (pose, frame, amt = 0.3, seed = 1) => { const o = E.boil(pose, frame, amt, seed); if (pose.root) o.root = pose.root; if ('flat' in pose) o.flat = pose.flat; return o; };
const cam = (w, h, fov) => new THREE.PerspectiveCamera(fov, w / h, 0.03, 200);
const still = (pos, look, fov) => ({ pos: () => pos, look: () => look, fov });

// ---------------------------------------------------------------- owner poses (manikin degrees)
const O = {
  stand: { chest: [4, 0, 0], head: [4, 0, 0], lShoulder: [0, 0, 7], rShoulder: [0, 0, -7], lElbow: [-10, 0, 0], rElbow: [-10, 0, 0] },
  slump: { chest: [14, 0, 0], head: [20, 0, 0], lShoulder: [2, 0, 5], rShoulder: [2, 0, -5], lElbow: [-8, 0, 0], rElbow: [-8, 0, 0] },
  hips: { chest: [2, 0, 0], head: [2, 0, 0], lShoulder: [12, -20, 42], rShoulder: [12, 20, -42], lElbow: [-105, 0, 0], rElbow: [-105, 0, 0], lWrist: [0, 0, -20], rWrist: [0, 0, 20] },
  phone: { chest: [10, 0, 0], head: [30, 0, 0], lShoulder: [-26, -14, 14], rShoulder: [-30, 16, -12], lElbow: [-96, 0, -6], rElbow: [-100, 0, 8], lWrist: [0, 0, 10], rWrist: [0, 0, -12] },
  crouch: { lHip: [-50, 0, 4], rHip: [-50, 0, -4], lKnee: [70, 0, 0], rKnee: [70, 0, 0], lAnkle: [-18, 0, 0], rAnkle: [-18, 0, 0], chest: [26, 0, 0], head: [8, 0, 0], lShoulder: [-30, 0, 10], rShoulder: [-30, 0, -10], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0] },
  sitBack: { lHip: [-80, 0, 7], rHip: [-80, 0, -7], lKnee: [84, 0, 0], rKnee: [84, 0, 0], lAnkle: [-4, 0, 0], rAnkle: [-4, 0, 0], chest: [-12, 0, 0], head: [-10, 0, 0], lShoulder: [-8, 0, 16], rShoulder: [-8, 0, -16], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0] },
  sitEdge: { lHip: [-84, 0, 8], rHip: [-84, 0, -8], lKnee: [100, 0, 0], rKnee: [100, 0, 0], lAnkle: [-10, 0, 0], rAnkle: [-10, 0, 0], chest: [34, 0, 0], head: [26, 0, 0], lShoulder: [-44, 0, 6], rShoulder: [-44, 0, -6], lElbow: [-92, 0, 0], rElbow: [-92, 0, 0], lWrist: [10, 0, 0], rWrist: [10, 0, 0] },
  hug: { lHip: [-122, 0, 8], rHip: [-122, 0, -8], lKnee: [140, 0, 0], rKnee: [140, 0, 0], lAnkle: [20, 0, 0], rAnkle: [20, 0, 0], chest: [30, 0, 0], head: [36, 0, 0], lShoulder: [-60, 0, 14], rShoulder: [-60, 0, -14], lElbow: [-42, -30, 0], rElbow: [-42, 30, 0] },
  lieBack: { lHip: [-62, 0, 6], rHip: [-50, 0, -8], lKnee: [104, 0, 0], rKnee: [84, 0, 0], lAnkle: [10, 0, 0], rAnkle: [10, 0, 0], chest: [0, 0, 0], head: [-6, 0, 0], lShoulder: [-150, 0, 10], rShoulder: [-148, 0, -10], lElbow: [-50, 0, 0], rElbow: [-54, 0, 0] },
};
const sitPhone = P(O.sitBack, { chest: [2, 0, 0], head: [30, 0, 0], lShoulder: [-26, -14, 14], rShoulder: [-30, 16, -12], lElbow: [-96, 0, -6], rElbow: [-100, 0, 8], lWrist: [0, 0, 10], rWrist: [0, 0, -12] });

// solve both arms so the hands meet at points given in the chest's frame (build time)
function armsTo(fig, base, lLoc, rLoc) {
  fig.setPose(base); fig.group.position.set(0, 0, 0); fig.group.rotation.set(0, 0, 0); fig.group.updateMatrixWorld(true);
  const a = F.reachIK(fig, 'l', F.jointPoint(fig, 'chest', lLoc), { local: [0, -0.1, 0.03], iters: 600 });
  const b = F.reachIK(fig, 'r', F.jointPoint(fig, 'chest', rLoc), { local: [0, -0.1, 0.03], iters: 600 });
  return P(base, a.pose, b.pose);
}
// ---------------------------------------------------------------- textures / small props
function feedTex(seed = 3) {
  const rng = C.mulberry32(seed);
  return MT.drawTexture(360, 740, (g, W, H) => {
    g.fillStyle = '#10141b'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { const y = 40 + i * 175; g.fillStyle = `hsl(${Math.round(rng() * 360)},40%,52%)`; g.fillRect(18, y, W - 36, 120); g.fillStyle = '#d8dce2'; g.fillRect(18, y + 132, 150 + rng() * 120, 9); g.fillRect(18, y + 148, 90 + rng() * 80, 7); }
  });
}
function makePhone(on = true) {
  const ph = PR.phone({ screenTex: feedTex(4), emissive: 2.2, on });
  ph.scale.setScalar(1.15);
  return ph;
}
// hold a phone in front of the manikin's hands, screen toward the face
function placePhone(ph, f, two = true) {
  const r = F.jointPoint(f, 'rWrist', [0, -0.1, 0.03]); const l = F.jointPoint(f, 'lWrist', [0, -0.1, 0.03]);
  const c = two ? r.clone().add(l).multiplyScalar(0.5) : r;
  const head = F.jointPoint(f, 'head', [0, 0.12, 0.06]);
  const n = head.clone().sub(c).normalize(); const up = new THREE.Vector3(0, 1, 0).sub(n.clone().multiplyScalar(n.y)).normalize();
  PR.orient(ph, c.clone().addScaledVector(n, 0.012), n, up.lengthSq() > 0.01 ? up : new THREE.Vector3(0, 0, 1));
}
function bag() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x2e3f4a, roughness: 0.8 });
  g.add(PR.mesh(PR.rbox(0.34, 0.3, 0.1, 0.04), m, [0, 0, 0]));
  g.add(PR.mesh(PR.rbox(0.36, 0.1, 0.11, 0.03), m, [0, 0.12, 0.005]));
  return g;
}
function strap() { return PR.mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshStandardMaterial({ color: 0x1f2a30, roughness: 0.8 }), [0, 0, 0]); }
function setBetween(m, a, b) { const mid = a.clone().add(b).multiplyScalar(0.5); m.position.copy(mid); m.scale.set(1, a.distanceTo(b), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); }

// mess on the floor: stuffing clumps + the torn cushion (after shot 4)
const MESS = (() => { const r = C.mulberry32(77); const pts = []; for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * 1.25; pts.push([0.15 + Math.cos(a) * d * 1.15, -1.62 + Math.sin(a) * d * 0.62, 0.035 + r() * 0.05, r() * 6]); } return pts; })();
function addMess(scene, flat) {
  const st = FL.stuffing(MESS.length, 5);
  MESS.forEach(([x, z, s, rot], i) => st.place(i, new THREE.Vector3(x, s * 0.55, z), s, [rot, rot * 2, 0]));
  scene.add(st);
  const c = flat.cushions[0]; c.position.set(0.05, 0.05, -1.55); c.rotation.set(-0.15, 0.7, 0.2); c.scale.set(1.05, 0.62, 0.95);
  return st;
}

// ---------------------------------------------------------------- the flat, lit for a time of day
function flatScene(renderer, { tod = 'day', lamp = 0, hall = 0, hallShadow = false, mess = false }) {
  const scene = new THREE.Scene();
  const evening = tod === 'evening' || tod === 'night';
  const flat = FL.buildFlat(scene, { evening, lampOn: lamp > 0 });
  flat.setLamp(lamp);
  flat.hallLight.intensity = hall; flat.hallLight.castShadow = hallShadow;
  if (!hall) flat.gapMat.color.setRGB(1.0, 0.9, 0.75).multiplyScalar(evening ? 0.4 : 1.3);
  const sunCol = { morning: [1.0, 0.86, 0.68], day: [1.0, 0.93, 0.84], gold: [1.0, 0.74, 0.46], amber: [1.0, 0.6, 0.32] }[tod];
  const sun = FL.makeSun(scene, { color: sunCol || [1, 1, 1], intensity: 7.5 });
  if (evening) { sun.sun.intensity = 0; sun.sun.castShadow = false; }
  const hemi = new THREE.HemisphereLight(evening ? 0x40506e : 0xb8c8e0, evening ? 0x1c1612 : 0x5a4432, evening ? 0.16 : 0.42); scene.add(hemi);
  // window fill (sky light through the window)
  const wf = new THREE.SpotLight(evening ? new THREE.Color(0.45, 0.58, 0.95) : new THREE.Color(0.8, 0.88, 1.0), evening ? 1.6 : 3.5, 0, 1.2, 1.0, 2);
  wf.position.set(3.6, 1.8, -0.2); wf.target.position.set(-1.0, 0.4, -0.6); scene.add(wf, wf.target);
  scene.environment = C.gradientEnv(renderer, evening ? { top: [0.02, 0.025, 0.04], horizon: [0.03, 0.03, 0.04], bottom: [0.02, 0.015, 0.01] } : { top: [0.35, 0.4, 0.48], horizon: [0.45, 0.42, 0.38], bottom: [0.18, 0.13, 0.09], panels: [{ pos: [5, 1.5, 0], w: 3, h: 3, color: [1, 0.95, 0.85], intensity: 2 }] });
  scene.environmentIntensity = evening ? 0.35 : 0.5;
  let st = null; if (mess) st = addMess(scene, flat);
  else { const c = flat.cushions[0]; c.position.set(0.42, 0.6, -2.28); c.rotation.set(0, 0.35, 0.04); }
  return { scene, flat, sun, hemi, wf, stuffing: st };
}
const WAIT = [-1.5, 0, -2.2];          // where the dog waits, facing the door
const LIE = [-0.5, 0, -1.6];           // where it lies after the cushion (shots 5, 6)
const LIE_H = Math.atan2(FL.DOOR.cx - LIE[0], -3.0 - LIE[2]); // facing the door
const CAM_WIDE = { pos: [2.3, 2.5, 2.55], look: [-0.55, 0.1, -1.3], fov: 62 };
const LOOP_SPEED = 2.3, OWNER_SPEED = 2.0;
const dogPace = { neck: [16, 0, 0], head: [4, 0, 0], lEar: [16, 0, 4], rEar: [16, 0, -4], tail1: [-18, 0, 0], tail2: [-6, 0, 0] };

const FILM = {
  fps: 12,
  shots: [
    // 1 --------------------------------------------------------------------------------- the door has just closed
    { name: 's01-door', dur: 4.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'morning' });
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const camera = cam(w, h, 52); const ct = still([-1.28, 0.3, -0.55], [-1.6, 1.36, -3.0], 52);
      const base = P(DOG_POSES.sit, { neck: [-22, 0, 0], head: [-10, 0, 0], lEar: [-6, 0, 12], rEar: [-6, 0, -12] });
      const pt = ptrack([
        [0, P(base, { tail1: [40, 0, 50] })], [0.5, P(base, { tail1: [40, 0, 20] })], [1.2, base],
        [1.4, P(base, { neck: [-16, 0, 0], head: [-4, 0, 0] })],
        [1.8, P(base, { neck: [-20, 6, 0], head: [-6, 10, 26], lEar: [-16, 0, 26], rEar: [6, 0, -6] })], [2.7, P(base, { neck: [-20, 6, 0], head: [-6, 10, 27], lEar: [-16, 0, 26], rEar: [6, 0, -6] })],
        [3.0, P(base, { neck: [-22, 0, 0], head: [-8, 0, 4] })], [3.35, P(base, { neck: [-20, -5, 0], head: [-6, -8, -16], lEar: [4, 0, 8], rEar: [-12, 0, -20] })], [4.0, P(base, { neck: [-20, -5, 0], head: [-6, -8, -17], lEar: [4, 0, 8], rEar: [-12, 0, -20] })],
      ]);
      S.sun.set(48, 16, 1.0);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          S.flat.setDoor(t < 0.25 ? 0.16 * (1 - t / 0.25) : 0); S.flat.setTime(8, 2);
          dog.setPose(boilP(pt(t), info.frame)); dog.group.position.set(WAIT[0], 0, WAIT[2]); dog.group.rotation.set(0, Math.PI, 0); dog.groundBy(['lFPaw', 'rFPaw']);
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'modern', focus: 1.25, fstop: 2.8, gradeOverride: { exposure: 1.05 } }),
      };
    } },
    // 2 --------------------------------------------------------------------------------- the day, from the high corner
    { name: 's02-day', dur: 8.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'day' });
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const camera = cam(w, h, CAM_WIDE.fov); const ct = still(CAM_WIDE.pos, CAM_WIDE.look, CAM_WIDE.fov);
      const path = FL.loopPath(0);
      const lieH = Math.atan2(FL.DOOR.cx - FL.RUG.cx, -3.0 - FL.RUG.cz);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          let hh, mm;
          if (t < 3.5) { hh = 10; mm = 15; S.sun.set(40 - t * 3.5, 26, 1.0); dogGait(dog, path, t * LOOP_SPEED, boilP(dogPace, info.frame), { gait: 'trot', stride: 0.95 }); }
          else if (t < 5.0) { hh = 12; mm = 40; S.sun.set(8, 44, 1.0); dog.setPose(boilP(P(DOG_POSES.headOnPaws, { tail1: [-40, 0, 40], tail2: [-24, 0, 30] }), info.frame, 0.2)); dog.group.position.set(FL.RUG.cx, 0, FL.RUG.cz); dog.group.rotation.set(0, lieH, 0); dog.ground(0); }
          else { hh = 14; mm = 30; S.sun.set(-14 - (t - 5) * 5, 34, 1.0); dogGait(dog, path, (t - 5.0) * LOOP_SPEED, boilP(dogPace, info.frame), { gait: 'trot', stride: 0.95 }); }
          S.flat.setTime(hh, mm);
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'modern', focus: 4.6, fstop: 5.6 }),
      };
    } },
    // 3 --------------------------------------------------------------------------------- nose to the gap under the door
    { name: 's03-gap', dur: 4.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'day' });
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const camera = cam(w, h, 50); const ct = still([-0.5, 0.24, -2.28], [-1.5, 0.16, -2.88], 50);
      const lie = P(DOG_POSES.headOnPaws, { neck: [40, 0, 0], head: [-20, 0, 0], tail1: [-40, 0, 20], tail2: [-24, 0, 16] });
      const lift = P(lie, { neck: [18, 0, 0], head: [-14, 0, 0], lEar: [4, 0, 8], rEar: [4, 0, -8] });
      const up = P(lie, { neck: [-8, 0, 0], head: [-26, 0, 0], lEar: [-4, 0, 12], rEar: [-4, 0, -12] });
      const pt = ptrack([
        [0, lie], [0.35, P(lie, { head: [-20, 6, 0] })], [0.7, P(lie, { head: [-20, -6, 0] })], [0.95, lie],
        [1.2, lift], [1.7, lift], [2.0, lie], [2.35, P(lie, { head: [-20, 5, 0] })], [2.6, lie],
        [2.9, up], [4.0, P(up, { lEar: [0, 0, 8], rEar: [0, 0, -8] })],
      ]);
      S.sun.set(-22, 32, 1.0); S.flat.setTime(14, 50);
      dog.setPose(lie); dog.group.position.set(FL.DOOR.cx + 0.05, 0, -2.4); dog.group.rotation.set(0, Math.PI, 0); dog.ground(0);
      const tip0 = dog.worldOf('head', [0, -0.03, 0.215]); const Z = -2.4 + (-2.965 - tip0.z);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          dog.setPose(boilP(pt(t), info.frame, 0.2)); dog.group.position.set(FL.DOOR.cx + 0.05, 0, Z); dog.group.rotation.set(0, Math.PI, 0); dog.ground(0);
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'modern', focus: 1.15, fstop: 2.2 }),
      };
    } },
    // 4 --------------------------------------------------------------------------------- the cushion
    { name: 's04-cushion', dur: 6.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'gold' });
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const camera = cam(w, h, 50); const ct = still([2.3, 0.72, 0.5], [0.3, 0.36, -1.28], 50);
      const DT = [0.55, 0, -1.5], HT = -0.1; // where it tears the cushion, 3/4 to camera
      const cush = S.flat.cushions[0]; const c0 = cush.position.clone(), r0 = cush.rotation.clone();
      const fluff = FL.stuffing(64, 9); S.scene.add(fluff);
      const rng = C.mulberry32(21); const FP = [...Array(64)].map((_, i) => ({ t0: [1.85, 2.3, 2.8, 3.3][i % 4] + rng() * 0.25, v: new THREE.Vector3((rng() - 0.5) * 1.4, 0.35 + rng() * 0.6, (rng() - 0.5) * 1.2), s: 0.016 + rng() * 0.026, r: rng() * 6 }));
      const DP = [0.4, 0, -1.62];
      const stand = P(DOG_POSES.alert, { tail1: [24, 0, 0] });
      const reach = P(stand, { neck: [-4, 0, 0], head: [22, 0, 0], chest: [6, 0, 0] });
      const grab = P(stand, { neck: [0, 0, 0], head: [30, 0, 0], chest: [8, 0, 0], lEar: [10, 0, 8], rEar: [10, 0, -8] });
      const pull = P(stand, { neck: [-10, 0, 0], head: [8, 0, 0], chest: [-6, 0, 0], hips: [-8, 0, 0] });
      const tear = P(DOG_POSES.stand, { neck: [44, 0, 0], head: [12, 0, 0], chest: [8, 0, 0], hips: [-6, 0, 0], lEar: [20, 0, 20], rEar: [20, 0, -20], tail1: [30, 0, 0] });
      const look = P(DOG_POSES.stand, { neck: [10, -30, 0], head: [6, -34, -8], lEar: [18, 0, 4], rEar: [18, 0, -4], tail1: [-26, 0, 0] });
      const pt = ptrack([[0, stand], [0.55, stand], [0.9, reach], [1.05, grab], [1.5, pull], [1.7, tear], [4.4, tear], [4.9, look], [6.0, look]]);
      S.sun.set(36, 13, 0.55); S.flat.setTime(16, 50);
      const tip = () => dog.worldOf('head', [0, -0.03, 0.2]);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          let pose = pt(t);
          if (t > 1.7 && t < 4.4) { const k = Math.floor(info.frame / 2) % 2 ? 1 : -1; pose = P(pose, { neck: [pose.neck[0], k * 20, 0], head: [pose.head[0], k * 24, k * 14], lEar: [10, 0, 20 + k * 26], rEar: [10, 0, -20 + k * 26], tail1: [30, 0, -k * 30] }); }
          if (t < 1.7) dogStand(dog, DP, Math.PI, boilP(pose, info.frame)); else dogStand(dog, DT, HT, boilP(pose, info.frame));
          // cushion: on the seat -> in the mouth -> on the floor (torn, shaken)
          if (t < 1.05) { cush.rotation.order = 'XYZ'; cush.position.copy(c0); cush.rotation.copy(r0); cush.scale.set(1, 1, 1); }
          else if (t < 1.7) { cush.rotation.order = 'XYZ'; const m = tip(); const k = sm(seg(t, 1.05, 1.7)); cush.position.set(m.x, Math.max(0.07, m.y - 0.05 - k * 0.3), m.z - 0.12); cush.rotation.set(0.4 * k, 0.35, 0.6 * k); }
          else if (t < 4.4) { const k = Math.floor(info.frame / 2) % 2 ? 1 : -1; cush.rotation.order = 'YXZ'; cush.position.set(DT[0] + Math.sin(HT) * 0.5, 0.13, DT[2] + Math.cos(HT) * 0.5); cush.rotation.set(0.5, HT + k * 0.22, k * 0.12); const sq = sm(seg(t, 1.9, 4.2)); cush.scale.set(1.0, 1 - 0.4 * sq, 0.9); }
          else { cush.rotation.order = 'YXZ'; cush.position.set(DT[0] + Math.sin(HT) * 0.42, 0.06, DT[2] + Math.cos(HT) * 0.42); cush.rotation.set(-0.12, HT + 0.5, 0.15); cush.scale.set(1.02, 0.6, 0.92); }
          // stuffing: bursts that hang in the air (stop-motion wisps), then settle
          const src = new THREE.Vector3(DT[0] + Math.sin(HT) * 0.42, 0.1, DT[2] + Math.cos(HT) * 0.42);
          FP.forEach((p, i) => {
            const u = t - p.t0; if (u < 0) { fluff.place(i, new THREE.Vector3(0, -5, 0), 0.001); return; }
            const drag = 1 - Math.exp(-u * 2.2); const pos = src.clone().addScaledVector(p.v, drag / 2.2 * 1.6); pos.y -= 0.25 * u * u * 0.35; pos.y = Math.max(p.s * 0.5, pos.y);
            fluff.place(i, pos, p.s, [p.r + u, p.r * 2, 0]);
          });
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'modern', focus: 2.6, fstop: 2.8, gradeOverride: { saturation: 0.95, exposure: 0.92 } }),
      };
    } },
    // 5 --------------------------------------------------------------------------------- waiting in the mess
    { name: 's05-wait', dur: 3.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'amber', mess: true });
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const camera = cam(w, h, 44); const ct = still([-1.42, 0.17, -2.9], [-0.42, 0.2, -1.5], 44);
      const base = P(DOG_POSES.headOnPaws, { tail1: [-40, 0, 30], tail2: [-24, 0, 24] });
      const pt = ptrack([[0, base], [1.3, base], [1.55, P(base, { tail1: [50, 0, 10], tail2: [20, 0, 6], tail3: [10, 0, 0] })], [1.8, base], [3.0, base]]);
      S.sun.set(50, 7, 0.8); S.flat.setTime(17, 55);
      return {
        scene: S.scene, camera,
        update: (t, info) => { dog.setPose(boilP(pt(t), info.frame, 0.15)); dog.group.position.set(LIE[0], 0, LIE[2]); dog.group.rotation.set(0, LIE_H, 0); dog.ground(0); E.applyCam(camera, ct, t); },
        look: () => ({ grade: 'modern', focus: 1.6, fstop: 2.2, gradeOverride: { exposure: 1.02, gain: [1.08, 0.98, 0.86], highTint: [0.03, 0.012, -0.02], shadowTint: [0.004, 0.0, -0.004], saturation: 1.0 } }),
      };
    } },
    // 6 --------------------------------------------------------------------------------- the owner comes home
    { name: 's06-home', dur: 4.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'evening', mess: true, hall: 5.5, hallShadow: true });
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const own = F.figure({ kind: 'beech', seed: 5 }); S.scene.add(own.group);
      const b = bag(); S.scene.add(b); const sp = strap(); S.scene.add(sp);
      const camera = cam(w, h, 54); const ct = still([0.05, 0.5, -0.45], [-1.5, 1.02, -3.0], 54);
      const walkIn = linePath([FL.DOOR.cx, 0, -3.5], [FL.DOOR.cx, 0, -2.7]);
      const up = ptrack([[0, O.stand], [1.9, O.stand], [2.3, O.hips], [2.45, O.hips], [2.9, P(O.hips, { head: [38, 0, 0], chest: [12, 0, 0] })], [4, P(O.hips, { head: [40, 0, 0], chest: [14, 0, 0] })]]);
      const dLie = P(DOG_POSES.headOnPaws, { tail1: [-40, 0, 30] });
      const dUp = P(DOG_POSES.down, { neck: [-12, 0, 0], head: [-6, 0, 0], lEar: [-10, 0, 14], rEar: [-10, 0, -14] });
      const dSad = P(DOG_POSES.down, { neck: [14, 0, 0], head: [14, 0, 0], lEar: [16, 0, 2], rEar: [16, 0, -2] });
      const dpt = ptrack([[0, dLie], [0.45, dLie], [0.75, dUp], [2.5, dUp], [3.1, dSad], [4, dSad]]);
      S.flat.setTime(18, 40);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          S.flat.setDoor(1.45 * sm(seg(t, 0.25, 0.85)));
          // owner: in the hall, steps in, stops, hands on hips, head drops
          const s = 0.8 * sm(seg(t, 0.95, 1.85));
          if (t < 1.9) manWalk(own, walkIn, s, boilP(up(t), info.frame), { stride: 1.3 });
          else { const pose = boilP(up(t), info.frame, 0.25); own.setPose(pose); own.group.position.set(FL.DOOR.cx, 0, -2.7); own.group.rotation.set(0, 0, 0); F.groundFig(own, 0); }
          // bag: hangs from the right shoulder, slides down the arm, drops
          const sh = F.jointPoint(own, 'rShoulder', [-0.02, 0.05, 0]); const el = F.jointPoint(own, 'rElbow');
          const k = sm(seg(t, 2.6, 3.1)); const top = sh.clone().lerp(el, k);
          let bc = top.clone().add(new THREE.Vector3(-0.1, -0.5, 0.06));
          if (t > 3.1) { const f = sm(seg(t, 3.1, 3.3)); bc = bc.clone().lerp(new THREE.Vector3(bc.x - 0.05, 0.15, bc.z + 0.12), f); b.rotation.set(0.3 * f, 0.4 * f, -0.5 * f); setBetween(sp, bc.clone().add(new THREE.Vector3(0, 0.15, 0)), top.clone().lerp(bc, f)); }
          else { b.rotation.set(0, 0, -0.1); setBetween(sp, bc.clone().add(new THREE.Vector3(0, 0.15, 0)), top); }
          b.position.copy(bc);
          // dog: lifts its head at the door, wags, then sinks when the head drops
          let dp = dpt(t); if (t > 0.9 && t < 2.6) { const k2 = Math.floor(info.frame / 2) % 2 ? 1 : -1; dp = P(dp, { tail1: [-10, 0, k2 * 34], tail2: [0, 0, k2 * 14] }); }
          dog.setPose(boilP(dp, info.frame, 0.2)); dog.group.position.set(LIE[0], 0, LIE[2]); dog.group.rotation.set(0, LIE_H, 0); dog.ground(0);
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'modern', focus: 3.0, fstop: 2.4, bloom: { strength: 0.3, radius: 0.7, threshold: 1.1 } }),
      };
    } },
    // 7 --------------------------------------------------------------------------------- drops onto the sofa, phone out
    { name: 's07-sofa', dur: 4.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'evening', mess: true, lamp: 1.0 });
      const own = F.figure({ kind: 'beech', seed: 5 }); S.scene.add(own.group);
      const ph = makePhone(true); S.scene.add(ph);
      const glow = new THREE.PointLight(new THREE.Color(0.6, 0.75, 1.0), 0, 0, 2); S.scene.add(glow);
      const camera = cam(w, h, 46); const ct = still([1.12, 0.98, -0.32], [1.34, 0.74, -2.42], 46);
      const X = 1.36;
      const sp = armsTo(own, P(O.sitBack, { chest: [2, 0, 0], head: [30, 0, 0] }), [0.05, 0.22, 0.3], [-0.05, 0.22, 0.3]);
      const pt = ptrack([[0, O.slump], [0.4, O.slump], [0.72, O.crouch], [1.02, O.sitBack], [1.14, P(O.sitBack, { chest: [4, 0, 0], head: [12, 0, 0] })], [1.4, O.sitBack], [2.0, P(O.sitBack, { head: [-16, 0, 0] })], [2.6, sp], [4.0, P(sp, { head: [34, 0, 0] })]]);
      S.flat.setTime(18, 52);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          const pose = boilP(pt(t), info.frame, 0.25); own.setPose(pose);
          const k = sm(seg(t, 0.72, 1.02));
          own.group.position.set(X, 0, -1.95 + (-2.3 + 1.95) * k); own.group.rotation.set(0, 0, 0);
          if (t < 0.72) F.groundFig(own, 0); else { F.groundFig(own, 0); const yg = own.group.position.y; F.seatFig(own, t < 1.14 && t > 1.02 ? 0.47 : 0.5); const ys = own.group.position.y; own.group.position.y = yg + (ys - yg) * k; own.group.updateMatrixWorld(true); }
          const on = sm(seg(t, 2.1, 2.6));
          if (t > 2.0) { ph.visible = true; placePhone(ph, own, true); ph.userData.screen.material.color.setRGB(1, 1, 1).multiplyScalar(2.2 * on); glow.intensity = 0.35 * on; glow.position.copy(ph.position).add(new THREE.Vector3(0, 0.06, 0.08)); } else { ph.visible = false; glow.intensity = 0; }
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'modern', focus: 2.05, fstop: 2.4, bloom: { strength: 0.3, radius: 0.7, threshold: 1.1 } }),
      };
    } },
    // 8 --------------------------------------------------------------------------------- the evening, from the same high corner
    { name: 's08-evening', dur: 8.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'night', mess: true, lamp: 1.0 });
      S.flat.fLight.castShadow = true;
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const own = F.figure({ kind: 'beech', seed: 5 }); S.scene.add(own.group);
      const ph = makePhone(true); S.scene.add(ph);
      const glow = new THREE.PointLight(new THREE.Color(0.6, 0.75, 1.0), 0.3, 0, 2); S.scene.add(glow);
      const camera = cam(w, h, CAM_WIDE.fov); const ct = still(CAM_WIDE.pos, CAM_WIDE.look, CAM_WIDE.fov);
      const path = FL.loopPath(0);
      const DOGP = [-1.12, 0, -2.3];
      const lieH = Math.atan2(FL.DOOR.cx - FL.RUG.cx, -3.0 - FL.RUG.cz);
      const fridgeLook = P(O.stand, { chest: [10, 0, 0], head: [18, 0, 8], rShoulder: [-70, 0, -30], rElbow: [-20, 0, 0] });
      const fridgeOff = P(O.stand, { chest: [6, 0, 0], head: [10, 20, 0] });
      const doggy = { neck: [-14, 0, 0], head: [-6, 0, 0], lEar: [4, 0, 8], rEar: [4, 0, -8] };
      const walkPh = armsTo(own, O.phone, [0.05, 0.2, 0.3], [-0.05, 0.2, 0.3]);
      const liePh = armsTo(own, P(O.lieBack, { head: [-14, 0, 0] }), [0.05, 0.62, 0.34], [-0.05, 0.62, 0.34]);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          let hh = 19, mm = 40; ph.visible = false; glow.intensity = 0;
          // fridge twice
          let fr = 0;
          if (t < 2.5) {
            fr = t < 0.35 ? 1.7 * sm(t / 0.35) : t < 1.0 ? 1.7 : t < 1.25 ? 1.7 * (1 - sm((t - 1.0) / 0.25)) : t < 1.6 ? 0 : t < 1.9 ? 1.7 * sm((t - 1.6) / 0.3) : 1.7;
            const pose = (t > 1.2 && t < 1.65) ? fridgeOff : fridgeLook;
            own.setPose(boilP(pose, info.frame, 0.25)); own.group.position.set(-1.32, 0, -0.62); own.group.rotation.set(0, -Math.PI / 2 + (t > 1.2 && t < 1.65 ? 0.5 : 0), 0); F.groundFig(own, 0);
          } else if (t < 6.2) {
            hh = 20; mm = 55;
            manWalk(own, path, (t - 2.5) * OWNER_SPEED, boilP(walkPh, info.frame, 0.25), { stride: 1.65 });
            ph.visible = true; placePhone(ph, own, true); glow.intensity = 0.3; glow.position.copy(ph.position).add(new THREE.Vector3(0, 0.08, 0));
          } else if (t < 7.3) {
            hh = 22; mm = 10;
            own.setPose(boilP(liePh, info.frame, 0.2)); own.group.rotation.set(-Math.PI / 2, 0, 0); own.group.rotation.order = 'YXZ'; own.group.rotation.y = lieH + Math.PI; own.group.position.set(FL.RUG.cx, 0.3, FL.RUG.cz); F.groundParts(own, ['pelvis', 'chest'], 0.02);
            ph.visible = true; placePhone(ph, own, true); glow.intensity = 0.3; glow.position.copy(ph.position).add(new THREE.Vector3(0, 0.08, 0));
          } else {
            hh = 22; mm = 40;
            own.group.rotation.set(0, 0, 0); own.group.rotation.order = 'XYZ';
            const k = sm(seg(t, 7.3, 7.7)); own.setPose(boilP(lerpPose(P(O.hug, { chest: [-10, 0, 0], head: [0, 0, 0] }), O.hug, k), info.frame, 0.2)); own.group.rotation.y = lieH + Math.PI; own.group.position.set(FL.RUG.cx, 0, FL.RUG.cz); F.groundFig(own, 0);
          }
          S.flat.setFridge(fr); S.flat.setTime(hh, mm);
          // the dog watches from by the door, head following the owner
          const op = new THREE.Vector3(); own.joints.chest.getWorldPosition(op);
          const ang = Math.atan2(op.x - DOGP[0], op.z - DOGP[2]); const rel = Math.max(-1.3, Math.min(1.3, Math.atan2(Math.sin(ang), Math.cos(ang))));
          const dp = P(DOG_POSES.sit, doggy, { neck: [-14, rel / DEG * 0.45, 0], head: [-6, rel / DEG * 0.5, 0] });
          dog.setPose(boilP(dp, info.frame, 0.2)); dog.group.position.set(DOGP[0], 0, DOGP[2]); dog.group.rotation.set(0, 0, 0); dog.groundBy(['lFPaw', 'rFPaw']);
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'modern', focus: 4.6, fstop: 5.6, bloom: { strength: 0.3, radius: 0.7, threshold: 1.1 }, gradeOverride: { exposure: 1.45 } }),
      };
    } },
    // 9 --------------------------------------------------------------------------------- head on the knee
    { name: 's09-knee', dur: 6.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'night', mess: true, lamp: 1.35 });
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const own = F.figure({ kind: 'beech', seed: 5 }); S.scene.add(own.group);
      const OX = 1.22, OZ = -2.2; S.flat.setPendant(0.55);
      own.setPose(O.sitEdge); own.group.position.set(OX, 0, OZ); F.seatFig(own, 0.5);
      { const kl = F.jointPoint(own, 'lKnee'), kr = F.jointPoint(own, 'rKnee'); const mid = kl.clone().add(kr).multiplyScalar(0.5).add(new THREE.Vector3(0, -0.06, -0.02));
        const a = F.reachIK(own, 'l', mid.clone().add(new THREE.Vector3(0.03, 0, 0)), { local: [0, -0.1, 0.03], iters: 600 }); const b = F.reachIK(own, 'r', mid.clone().add(new THREE.Vector3(-0.03, 0, 0)), { local: [0, -0.1, 0.03], iters: 600 });
        O.sitEdgeC = P(O.sitEdge, a.pose, b.pose); }
      own.setPose(O.sitEdgeC); own.group.position.set(OX, 0, OZ); F.seatFig(own, 0.5);
      const knee = F.jointPoint(own, 'rKnee', [0, 0.02, 0.02]); // top of the right knee
      const camera = cam(w, h, 38); const ct = still([-1.62, 0.86, -1.5], [1.12, 0.8, -1.64], 38);
      // dog approach: from the left of frame, curving to face the owner
      const END = [knee.x, 0, knee.z + 0.5];
      const path = linePath([END[0], 0, END[2] + 1.6], END);
      const L = path.length;
      // find a neck/head pose that puts the chin on the knee
      const walkBody = { neck: [6, 0, 0], head: [2, 0, 0], lEar: [10, 0, 6], rEar: [10, 0, -6], tail1: [-24, 0, 0] };
      let best = null, bestE = 1e9;
      for (let nk = -30; nk <= 40; nk += 2) for (let hd = -30; hd <= 40; hd += 4) {
        dogStand(dog, END, Math.PI, { ...walkBody, neck: [nk, 0, 0], head: [hd, 0, 0] });
        const chin = dog.worldOf('head', [0, -0.055, 0.14]); const e = Math.abs(chin.y - knee.y - 0.02) * 3 + Math.abs(chin.z - knee.z) + Math.abs(hd - nk * -0.5) * 0.002;
        if (e < bestE) { bestE = e; best = [nk, hd]; }
      }
      const rest = { ...walkBody, neck: [best[0], 0, 0], head: [best[1], 0, 0], lEar: [16, 0, 2], rEar: [16, 0, -2], tail1: [-30, 0, 0] };
      const lookUp = { ...walkBody, neck: [-26, 0, 0], head: [-24, 0, 0], lEar: [-4, 0, 10], rEar: [-4, 0, -10] };
      const dpt = ptrack([[0, walkBody], [3.0, walkBody], [3.35, lookUp], [3.6, lookUp], [4.3, rest], [6.0, rest]]);
      // owner: still, looks down, hand to the dog's head
      dogStand(dog, END, Math.PI, rest); const headTop = dog.worldOf('head', [0, 0.13, 0.0]);
      own.setPose(P(O.sitEdgeC, { head: [38, -10, 0] })); F.seatFig(own, 0.5);
      const ikUp = F.reachIK(own, 'r', headTop.clone().add(new THREE.Vector3(0, 0.1, -0.12)), { local: [0, -0.1, 0.02], iters: 500 });
      const liftPose = P(O.sitEdgeC, { head: [40, -12, 0] }, ikUp.pose);
      own.setPose(liftPose); F.seatFig(own, 0.5);
      const ik = F.reachIK(own, 'r', headTop, { local: [0, -0.1, 0.02], iters: 500 });
      const handPose = P(O.sitEdgeC, { head: [41, -12, 0], chest: [36, 0, 0] }, ik.pose);
      const opt = ptrack([[0, O.sitEdgeC], [4.6, O.sitEdgeC], [5.0, P(O.sitEdgeC, { head: [40, -12, 0] })], [5.12, P(O.sitEdgeC, { head: [40, -12, 0] })], [5.45, liftPose], [5.8, handPose], [6.0, handPose]]);
      S.flat.setTime(23, 5);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          const still = t > 4.3 && t < 4.6; // the owner goes completely still
          own.setPose(still ? opt(t) : boilP(opt(t), info.frame, 0.2)); own.group.position.set(OX, 0, OZ); own.group.rotation.set(0, 0, 0); F.seatFig(own, 0.5);
          const s = L * (1 - (1 - seg(t, 0.2, 3.0)) ** 1.6);
          if (t < 3.0) dogGait(dog, path, s, boilP(dpt(t), info.frame, 0.2), { gait: 'walk', stride: 0.6, lift: 0.05 });
          else dogStand(dog, END, Math.PI, t > 4.3 ? dpt(t) : boilP(dpt(t), info.frame, 0.15));
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'modern', focus: 2.72, fstop: 2.0, bloom: { strength: 0.35, radius: 0.75, threshold: 1.0 }, gradeOverride: { shadowTint: [0.004, 0.002, 0.004], highTint: [0.02, 0.008, -0.01], saturation: 0.95 } }),
      };
    } },
    // 10 -------------------------------------------------------------------------------- the lead
    { name: 's10-lead', dur: 4.0, build: async ({ renderer, w, h }) => {
      const S = flatScene(renderer, { tod: 'night', mess: true, lamp: 1.2 });
      const dog = buildDog({ seed: 11 }); S.scene.add(dog.group);
      const own = F.figure({ kind: 'beech', seed: 5 }); S.scene.add(own.group);
      const camera = cam(w, h, 52); const ct = still([0.2, 0.42, -0.15], [-0.62, 0.95, -2.85], 52); S.flat.setPendant(1.0);
      const OP = [-0.76, 0, -2.62];
      own.setPose(O.stand); own.group.position.set(...OP); own.group.rotation.set(0, Math.PI, 0); F.groundFig(own, 0);
      const leadPt = S.flat.lead.position.clone().add(new THREE.Vector3(0, -0.02, 0.0));
      const ik = F.reachIK(own, 'r', leadPt, { local: [0, -0.1, 0.02], iters: 500 });
      const reach = P(O.stand, { head: [-18, 0, 0] }, ik.pose);
      const hold = P(O.stand, { head: [24, 0, 0], chest: [10, 0, 0], rShoulder: [-60, 0, -10], rElbow: [-50, 0, 0] });
      const opt = ptrack([[0, O.stand], [0.15, O.stand], [0.6, reach], [0.85, reach], [1.3, P(O.stand, { rShoulder: [-100, 0, -10], rElbow: [-30, 0, 0] })], [1.9, hold], [4, hold]]);
      const dsit = P(DOG_POSES.sit, { neck: [-26, 0, 0], head: [-26, 0, 0], lEar: [-10, 0, 16], rEar: [-10, 0, -16] });
      const DP = [-0.2, 0, -1.85];
      S.flat.setTime(23, 20);
      return {
        scene: S.scene, camera,
        update: (t, info) => {
          own.setPose(boilP(opt(t), info.frame, 0.25));
          const turn = sm(seg(t, 1.2, 1.9)); own.group.rotation.set(0, Math.PI - turn * Math.PI * 0.85, 0); own.group.position.set(...OP); F.groundFig(own, 0);
          if (t > 0.85) { const hp = F.jointPoint(own, 'rWrist', [0, -0.1, 0.02]); S.flat.lead.position.copy(hp); S.flat.lead.rotation.set(0, own.group.rotation.y, 0); }
          let dp = dsit;
          if (t > 0.5) { const k = Math.floor(info.frame / 2) % 2 ? 1 : -1; dp = P(dsit, { tail1: [44, 0, k * 46], tail2: [-8, 0, k * 20], hips: [-36, k * 6, 0] }); }
          dog.setPose(boilP(dp, info.frame, 0.2)); dog.group.position.set(...DP); dog.group.rotation.set(0, Math.PI + 0.45, 0); dog.groundBy(['lFPaw', 'rFPaw']);
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'newworld', focus: 1.75, fstop: 2.4, bloom: { strength: 0.3, radius: 0.7, threshold: 1.1 }, gradeOverride: { exposure: 1.05 } }),
      };
    } },
    // 11 -------------------------------------------------------------------------------- the courtyard at golden hour
    { name: 's11-court', dur: 7.0, build: async ({ renderer, w, h }) => {
      const scene = new THREE.Scene();
      const court = CO.courtyard(scene, renderer, { night: false, seed: 7, pv: true, crossTram: true });
      const sunDir = new THREE.Vector3(-0.9, 0.2, -0.38).normalize();
      scene.add(PR.daySky({ zenith: [0.22, 0.34, 0.62], horizon: [1.5, 0.95, 0.55], ground: [0.3, 0.24, 0.16], sunDir: sunDir.toArray(), sunColor: [40, 26, 12], glow: [2.2, 1.2, 0.5], glowPow: 7 }));
      const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.7, 0.42), 9); sun.position.copy(sunDir.clone().multiplyScalar(60)); sun.target.position.set(0, 0, -2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 20, bottom: -20, near: 5, far: 140 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
      scene.add(new THREE.HemisphereLight(new THREE.Color(0.5, 0.6, 0.9), new THREE.Color(0.45, 0.34, 0.22), 0.4));
      scene.fog = new THREE.FogExp2(new THREE.Color(1.0, 0.66, 0.38).multiplyScalar(0.6), 0.005);
      scene.environment = C.gradientEnv(renderer, { top: [0.3, 0.42, 0.75], horizon: [1.1, 0.8, 0.55], bottom: [0.3, 0.25, 0.18], panels: [{ pos: [sunDir.x * 10, sunDir.y * 10 + 0.5, sunDir.z * 10], w: 3, h: 2, color: [1, 0.75, 0.45], intensity: 6 }] });
      scene.environmentIntensity = 0.35;
      const tram = scene.children.find((o) => o.isGroup && Math.abs(o.position.x + 24) < 0.01 && Math.abs(o.position.z - 2.5) < 0.01);
      const tdir = tram ? new THREE.Vector3(1, 0, 0).applyQuaternion(tram.quaternion) : null;
      // three wooden dogs chasing round the lawn
      const lawn = { cx: 0.3, cz: 3.0, a: 2.3, b: 1.25 };
      const loop = FL.loopPath(0, 1, lawn);
      const dogs = [buildDog({ seed: 11 }), buildDog({ kind: 'oak', seed: 21, scale: 0.9 }), buildDog({ kind: 'maple', seed: 31, scale: 1.08 })];
      dogs.forEach((d) => scene.add(d.group));
      // owner + neighbour talking by the bench end
      const own = F.figure({ kind: 'beech', seed: 5 }); scene.add(own.group);
      const nb = F.figure({ kind: 'oak', seed: 41 }); scene.add(nb.group);
      const OP = [1.7, 0, 1.6], NP = [2.45, 0, 1.22];
      const face = (a, b) => Math.atan2(b[0] - a[0], b[2] - a[2]);
      const talkA = P(O.stand, { head: [0, 0, 0], rShoulder: [-30, 0, -14], rElbow: [-70, 0, 0] });
      const talkB = P(O.stand, { head: [-6, 0, 6], lShoulder: [-10, 0, 10], lElbow: [-40, 0, 0] });
      const opt = ptrack([[0, O.stand], [1.2, talkA], [2.2, O.stand], [3.4, P(O.stand, { head: [-8, 20, 0] })], [4.4, talkA], [5.6, O.stand], [7, talkB]]);
      const npt = ptrack([[0, talkB], [1.4, O.stand], [2.6, talkA], [3.8, P(O.stand, { head: [4, 0, -8] })], [5.2, talkB], [7, O.stand]]);
      const camera = cam(w, h, 44); const ct = { pos: E.track([[0, [8.2, 3.7, 3.4]], [7, [8.2, 3.7, 3.25]]]), look: E.track([[0, [0.2, 0.85, 2.2]], [7, [0.2, 0.85, 2.05]]]), fov: 44 };
      for (const o of [...scene.children]) if (o.isMesh && Math.hypot(o.position.x - 2.4, o.position.z - 5.6) < 1.0) scene.remove(o);
      const ch = { neck: [-4, 0, 0], head: [-6, 0, 0], lEar: [34, 0, 30], rEar: [34, 0, -30], tail1: [40, 0, 0], tail2: [16, 0, 0], tail3: [10, 0, 0] };
      return {
        scene, camera,
        update: (t, info) => {
          if (tram) tram.position.set(-24, 0, 2.5).addScaledVector(tdir, -26 + t * 7.0);
          const L = loop.length;
          dogs.forEach((d, i) => { const s = t * 3.4 + i * 1.35; const k = Math.floor(info.frame / 2 + i) % 2 ? 1 : -1; dogGait(d, loop, s, boilP(P(ch, { tail1: [40, 0, k * 20] }), info.frame + i * 7, 0.3), { gait: 'trot', stride: 1.15, lift: 0.1, scale: d.scale }); });
          own.setPose(boilP(opt(t), info.frame, 0.3)); own.group.position.set(...OP); own.group.rotation.set(0, face(OP, NP), 0); F.groundFig(own, 0);
          nb.setPose(boilP(npt(t), info.frame + 5, 0.3)); nb.group.position.set(...NP); nb.group.rotation.set(0, face(NP, OP), 0); F.groundFig(nb, 0);
          E.applyCam(camera, ct, t);
        },
        look: () => ({ grade: 'newworld', focus: 8.2, fstop: 4.0, bloom: { strength: 0.14, radius: 0.7, threshold: 2.2 }, gradeOverride: { contrast: 0.42, saturation: 1.1, exposure: 0.92 } }),
      };
    } },
    // 12 -------------------------------------------------------------------------------- end card
    endCardShot({ line: 'Nobody calls a lonely dog broken.', dur: 4.5 }),
  ],
};
// animatic cost control: 2 samples per frame (3 for the head-on-the-knee shot)
for (const sh of FILM.shots) {
  const b = sh.build;
  sh.build = async (ctx) => { const S = await b(ctx); const still = new URLSearchParams(location.search).get('quality') === 'still'; if (S.look && !still) { const L = S.look; S.look = (t, i) => ({ samples: sh.name === 's09-knee' ? 3 : 2, ...L(t, i) }); } return S; };
}
export default FILM;
