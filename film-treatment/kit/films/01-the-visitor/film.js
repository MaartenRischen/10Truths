// 01 — THE VISITOR. One night your ancestor knocks on your door. He loves everything in your flat except one thing.
// One flat set (set.js), one cast (cast.js); 17 shots + the series end card. 12 fps stop-motion, pose-to-pose with boil.
import * as THREE from 'three';
import * as E from '../../film/engine.js';
import * as C from '../../scenes/E/lib/cine.js';
import * as F from '../../scenes/E/lib/figs.js';
import { endCardShot } from '../../film/text.js';
import { buildWorld, FL, makeEnv } from './set.js';
import * as K from './cast.js';

const { P, PT, TR, place, jp, sstep, clamp, lerp, lerp3, mirror } = K;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

// ------------------------------------------------------------------ world cache (built once per render process)
let WORLD = null;
function world(renderer) {
  if (!WORLD) {
    const S = buildWorld(renderer);
    const cast = K.makeCast();
    WORLD = { S, cast, env: [makeEnv(renderer, 0), makeEnv(renderer, 0.5), makeEnv(renderer, 1)] };
  }
  return WORLD;
}

// ------------------------------------------------------------------ helpers
const GM = C.GRADES.modern, GN = C.GRADES.newworld;
function gradeMix(w) { const o = {}; for (const k of Object.keys(GM)) { const a = GM[k], b = GN[k]; o[k] = Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * w) : a + (b - a) * w; } return o; }

function allLights(S) { const L = S.L; return [L.cityKey, L.cityFill, L.rim, L.strip, L.hall, L.hallFill, L.lamp, L.lampGlow, L.phone, L.phonePt, L.fridge, L.fridgeArea, ...L.cor, L.bed, L.hemi]; }
// cfg: { name: intensity | [intensity, castShadow] }, cor: [intensity, [shadow indices]]
function setLights(S, cfg) {
  for (const l of allLights(S)) { l.visible = false; l.castShadow = false; l.intensity = 0; }
  for (const [k, v] of Object.entries(cfg)) {
    if (k === 'cor') { const [I, sh = [], act = null] = v; S.L.cor.forEach((l, i) => { if (act && !act.includes(i)) return; l.visible = true; l.intensity = I; l.castShadow = sh.includes(i); }); continue; }
    const [I, sh] = Array.isArray(v) ? v : [v, false]; const l = S.L[k]; l.visible = true; l.intensity = I; l.castShadow = !!sh;
  }
}
function resetState(W) {
  const { S, cast } = W;
  for (const f of cast.all) f.group.visible = false;
  cast.phone.visible = false; for (const g of cast.food) g.visible = false; cast.glass.visible = false;
  S.doorOpen(0); S.handleDown(0); S.switchState(false); S.hallMat.emissiveIntensity = 0;
  S.lampShadeIn.emissiveIntensity = 0; S.lampBulb.color.setRGB(1, 0.75, 0.45).multiplyScalar(0.2);
  S.fridgeDoor.rotation.y = 0; S.waterOn(0); S.tapLever.rotation.z = 0; S.balconyDoor(0);
  S.speakerLed.color.setRGB(0, 0, 0); S.appleHome(); S.apple.visible = true;
  S.cup.visible = true; S.cup.position.set(FL.table.x + 0.28, FL.table.h, FL.table.z - 0.05); S.cup.rotation.set(0, 0, 0);
  S.plane.visible = false; S.stripMesh.visible = true; S.L.hallFill.position.set(FL.hall.x, FL.H - 0.4, FL.hall.z - 0.6); S.L.hemi.color.setRGB(0.35, 0.45, 0.7); S.stool.position.set(0, 0, 0); S.doorGap.visible = false;
}
function lampOn(S, k) { // k: 0..~1.6
  S.lampShadeIn.emissiveIntensity = 1.2 * k; S.lampBulb.color.setRGB(1, 0.75, 0.45).multiplyScalar(0.2 + 7 * k);
  S.L.lamp.intensity = 14 * k; S.L.lampGlow.intensity = 1.1 * k;
}
function hallOn(S, on) { S.hallMat.emissiveIntensity = on ? 2.2 : 0; S.L.hall.intensity = on ? 22 : 0; S.L.hallFill.intensity = on ? 0.9 : 0; S.switchState(on); }
function phoneLight(W, k) {
  const { S, cast } = W; const g = K.phoneGlow(cast.phone);
  S.L.phone.position.copy(g.c).addScaledVector(g.n, 0.01); S.L.phone.lookAt(g.c.clone().add(g.n)); S.L.phone.intensity = 34 * k;
  S.L.phonePt.position.copy(g.c).addScaledVector(g.n, 0.12); S.L.phonePt.intensity = 0.3 * k;
  cast.phone.userData.bright(2.4 * k);
}
function fridgeLights(S, open) {
  const fr = S.fridge; fr.updateMatrixWorld(true);
  const p = V3(0, FL.fridge.H - 0.25, -0.05).applyMatrix4(fr.matrixWorld), tgt = V3(0.1, 0.9, 3.0).applyMatrix4(fr.matrixWorld);
  S.L.fridge.position.copy(p); S.L.fridge.target.position.copy(tgt); S.L.fridge.target.updateMatrixWorld(true);
  const pa = V3(0, 1.0, FL.fridge.D / 2 - 0.05).applyMatrix4(fr.matrixWorld); S.L.fridgeArea.position.copy(pa); S.L.fridgeArea.lookAt(V3(0, 1.0, 3).applyMatrix4(fr.matrixWorld));
  S.L.fridge.intensity = 3.6 * open; S.L.fridgeArea.intensity = 0.8 * open;
  fr.traverse(o => { if (o.isMesh && o.material && o.material.emissive && o.material.color && o.material.color.getHex() === 0xf2f4f5) o.material.emissiveIntensity = 0.3 * open; });
}

// analytic wrist aim: rotate the wrist so the palm normal (+Z in the wrist frame) points along dir
function aimPalm(f, side, dir) {
  const wr = f.joints[side + 'Wrist']; f.group.updateMatrixWorld(true);
  const qW = new THREE.Quaternion(); wr.getWorldQuaternion(qW);
  const n = V3(0, 0, 1).applyQuaternion(qW);
  const qN = new THREE.Quaternion().setFromUnitVectors(n, dir.clone().normalize()).multiply(qW);
  const qP = new THREE.Quaternion(); wr.parent.getWorldQuaternion(qP);
  const e = new THREE.Euler().setFromQuaternion(qP.invert().multiply(qN), 'XYZ');
  return [e.x / D2R, e.y / D2R, e.z / D2R];
}
// IK a hand to a world point (optionally aiming the palm); returns the arm joints to merge into a pose
function ikHand(f, pose, opts, side, target, palmDir = null, local = K.HAND) {
  place(f, pose, opts);
  let r = F.reachIK(f, side, target, { local, iters: 350 });
  if (palmDir) {
    const w = aimPalm(f, side, palmDir); f.joints[side + 'Wrist'].rotation.set(w[0] * D2R, w[1] * D2R, w[2] * D2R);
    r = F.reachIK(f, side, target, { local, iters: 250 });
  }
  const o = {}; for (const j of ['Shoulder', 'Elbow', 'Wrist']) { const k = side + j; const rr = f.joints[k].rotation; o[k] = [rr.x / D2R, rr.y / D2R, rr.z / D2R]; }
  return o;
}
function camSet(cam, pos, look, fov, shift = [0, 0]) {
  cam.position.set(...pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.up.set(0, 1, 0); cam.lookAt(...look); cam.userData.shift = shift; cam.updateMatrixWorld(true);
}
const boil = (pose, frame, seed, amt = 0.3) => E.boil(pose, frame, amt, seed);

// look presets
const QUALITY = new URLSearchParams(location.search).get('quality') || 'animatic';
function look(o) {
  const w = o.warm ?? 0;
  return {
    samples: QUALITY === 'still' ? 16 : (o.samples ?? 1), dofScale: QUALITY === 'still' ? 1.0 : 0.5,
    grade: 'modern', gradeOverride: { ...gradeMix(w), ...(o.g || {}) }, focus: o.focus ?? 3, fstop: o.fstop ?? 2.8,
    bloom: o.bloom ?? { strength: 0.3, radius: 0.75, threshold: 1.1 },
    streak: o.streak ?? null,
    exposure: o.exposure ?? 1.0,
  };
}

// shot factory: setup(W, ctx) -> { cam: fn(t) or static [pos, look, fov, shift], update(t, info), look(t, info) }
function shot(name, dur, setup) {
  return {
    name, dur,
    build: async ({ renderer, w, h }) => {
      const W = world(renderer);
      resetState(W);
      const scene = new THREE.Scene(); scene.background = new THREE.Color(0, 0, 0);
      scene.add(W.S.root); scene.add(W.cast.root);
      const camera = new THREE.PerspectiveCamera(40, w / h, 0.03, 600);
      const sp = setup(W, { renderer, w, h, camera, scene });
      scene.environment = W.env[sp.env ?? 0]; scene.environmentIntensity = sp.envI ?? 0.3;
      return {
        scene, camera,
        update: (t, info) => { sp.update(t, info); scene.updateMatrixWorld(true); },
        look: (t, info) => look(sp.look(t, info)),
        dispose: () => { scene.remove(W.S.root); scene.remove(W.cast.root); scene.environment = null; for (const o of sp.extras || []) scene.remove(o); },
      };
    },
  };
}

// ------------------------------------------------------------------ recurring poses / placements
const HOST_SEAT = { pos: [FL.hostSeat[0], 0, FL.hostSeat[1]], rotY: 0, seat: FL.seatY };
const VIS_SEAT = { pos: [FL.visSeat[0], 0, FL.visSeat[1]], rotY: 0, seat: FL.seatY };
// the host hunched over the phone (right hand), noodle cup in the left hand on the thigh
function hostPhonePose(W, { cup = true, chest = 26, head = 34 } = {}) {
  const h = W.cast.host; const base = { ...P.SIT_HUNCH, chest: [chest, 0, 0], head: [head, 0, 0] };
  place(h, base, HOST_SEAT);
  const face = jp(h, 'head', [0, 0.12, 0.1]);
  const tgt = face.clone().add(V3(-0.04, -0.34, 0.2));
  const armR = ikHand(h, base, HOST_SEAT, 'r', tgt, face.clone().sub(tgt));
  let armL = { lShoulder: [-20, 0, 12], lElbow: [-70, 0, -6], lWrist: [0, 0, 0] };
  if (cup) { const k = jp(h, 'lKnee'); const hip = jp(h, 'lHip'); const c = hip.clone().lerp(k, 0.62).add(V3(0.02, 0.12, 0.02)); armL = ikHand(h, { ...base, ...armR }, HOST_SEAT, 'l', c, V3(0, 1, 0)); }
  return { ...base, ...armR, ...armL };
}
function cupInHand(W, f) { const S = W.S; const p = jp(f, 'lWrist', [0, -0.09, 0.05]); S.cup.position.set(p.x, p.y - 0.03, p.z); S.cup.rotation.set(0, 0.4, 0); }
function appleIn(W, f, side = 'l', off = [0, -0.1, 0.06]) { const p = jp(f, side + 'Wrist', off); W.S.apple.position.copy(p); }

// ================================================================== SHOTS
const shots = [];

// 1 — Wide from the kitchen side: the host small on the sofa, the city above him. Tiny scrolls only.
const CAM1 = { pos: [1.35, 1.42, 5.55], look: [-1.62, 1.42, 0.55], fov: 38, shift: [0, 0.14] };
function sofaScroll(t, times) { let s = 0; for (const tt of times) if (t >= tt) s += 0.055; return s; }
shots.push(shot('s01-alone', 5.5, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host;
  h.group.visible = true; cast.phone.visible = true;
  S.doorGap.visible = true; setLights(S, { cityKey: [20, true], cityFill: 0.7, phone: 30, hemi: 0.14 });
  const base = hostPhonePose(W);
  const flicks = [1.3, 2.9, 4.4];
  camSet(camera, CAM1.pos, CAM1.look, CAM1.fov, CAM1.shift);
  S.plane.visible = true;
  return {
    update: (t, info) => {
      let pose = { ...base };
      for (const ft of flicks) { const k = sstep(ft - 0.17, ft, t) * (1 - sstep(ft, ft + 0.17, t)); pose.rWrist = [base.rWrist[0] - 8 * k, base.rWrist[1], base.rWrist[2]]; if (k > 0) break; }
      place(h, boil(pose, info.frame, 1), HOST_SEAT);
      K.phoneInHand(cast.phone, h); cast.phone.userData.setFeed(sofaScroll(t, flicks));
      cupInHand(W, h); phoneLight(W, 1);
      S.plane.position.set(-70 + t * 7, 48, -160); S.plane.visible = Math.floor(t * 1.4) % 2 === 0;
    },
    look: () => ({ warm: 0, focus: camera.position.distanceTo(V3(-1.46, 1.1, 1.1)), fstop: 4, streak: { threshold: 2.2, strength: 0.25, tint: [0.35, 0.6, 1.0] } }),
  };
}));

// 2 — Close: phone and hands, the head bent into the glow. Thumb flicks twice.
shots.push(shot('s02-phone', 2.5, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host;
  h.group.visible = true; cast.phone.visible = true;
  setLights(S, { cityKey: [14, false], cityFill: 0.5, phone: 30, hemi: 0.1 });
  const base = hostPhonePose(W);
  place(h, base, HOST_SEAT); K.phoneInHand(cast.phone, h);
  const pc = K.phoneGlow(cast.phone).c, face = jp(h, 'head', [0, 0.1, 0.08]);
  camSet(camera, [face.x - 0.3, face.y + 0.3, face.z - 0.34], [pc.x * 0.8 + face.x * 0.2, pc.y * 0.8 + face.y * 0.2, pc.z * 0.8 + face.z * 0.2], 44);
  const flicks = [0.7, 1.5];
  return {
    update: (t, info) => {
      let pose = { ...base };
      for (const ft of flicks) { const k = sstep(ft - 0.17, ft, t) * (1 - sstep(ft, ft + 0.25, t)); if (k > 0) { pose.rWrist = [base.rWrist[0] - 10 * k, base.rWrist[1], base.rWrist[2]]; break; } }
      place(h, boil(pose, info.frame, 1, 0.2), HOST_SEAT);
      K.phoneInHand(cast.phone, h); cast.phone.userData.setFeed(0.17 + sofaScroll(t, flicks) * 1.4);
      cupInHand(W, h); phoneLight(W, 1);
    },
    look: () => ({ warm: 0, focus: camera.position.distanceTo(pc), fstop: 2.0, streak: { threshold: 2.2, strength: 0.25, tint: [0.35, 0.6, 1.0] } }),
  };
}));

// 3 — Over the shoulder toward the front door: KNOCK. The head snaps up.
shots.push(shot('s03-knock', 2.5, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host;
  h.group.visible = true; cast.phone.visible = true;
  S.doorGap.visible = true; setLights(S, { cityKey: [20, true], cityFill: 0.7, phone: 30, hemi: 0.14 });
  const base = hostPhonePose(W);
  const up = { ...base, chest: [12, 0, 0], head: [-6, -6, 0] };
  const tr = PT(base, [[0, {}], [0.55, {}], [0.7, { head: [40, 0, 0] }], [0.86, { head: [-4, -8, 0], chest: [22, 0, 0] }, 'out'], [1.04, {}], [1.4, { chest: [10, 0, 0], head: [-8, -8, 0], rShoulder: [base.rShoulder[0] + 12, base.rShoulder[1], base.rShoulder[2]] }], [2.5, {}]]);
  camSet(camera, [-1.36, 1.72, 0.3], [-1.58, 1.05, 4.0], 56);
  return {
    update: (t, info) => {
      place(h, boil(tr(t), info.frame, 1), HOST_SEAT);
      K.phoneInHand(cast.phone, h); cast.phone.userData.setFeed(0.3); cupInHand(W, h); phoneLight(W, 1);
    },
    look: () => ({ warm: 0, focus: camera.position.distanceTo(V3(-1.6, 1.2, 6.2)), fstop: 4 }),
  };
}));

// 4 — From inside, framed by the doorway: the host opens the door; the visitor stands on the landing. Hold.
const DOOR_C = [(FL.door.x0 + FL.door.x1) / 2, 0, FL.z1];
shots.push(shot('s04-door', 5.0, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host, v = cast.visitor;
  h.group.visible = v.group.visible = true;
  setLights(S, { cityKey: [14, false], cityFill: 0.5, hemi: 0.12, cor: [16, [4], [3, 4, 5]] });
  const hp0 = [-0.66, 0, 6.02], hp1 = [-0.46, 0, 5.62];
  const stand = { ...P.STAND };
  // IK the right hand to the handle at a few door angles
  const handleAt = (a) => { S.doorOpen(a); S.frontDoor.updateMatrixWorld(true); return V3(0, 0, 0).applyMatrix4(S.handle.matrixWorld); };
  const keysA = [0, 20, 40, 58];
  const ik = keysA.map(a => ikHand(h, { ...stand, chest: [6, -10, 0] }, { pos: hp0, rotY: -30 }, 'r', handleAt(a).add(V3(0.0, -0.02, -0.03)), V3(0.3, 0, -1)));
  S.doorOpen(0);
  const vp = [DOOR_C[0] + 0.02, 0, 7.02];
  const doorA = TR([[0, 0], [0.62, 0, 'out'], [1.45, 58, 'out'], [5, 58]]);
  camSet(camera, [-0.62, 1.3, 2.7], [-1.38, 1.18, 6.4], 48);
  return {
    update: (t, info) => {
      const a = doorA(t); S.doorOpen(a); S.handleDown(sstep(0.4, 0.55, t) * (1 - sstep(1.5, 1.7, t)));
      // host: reach (0-0.4), hold handle while it opens, then step back, release (1.5-2.1)
      let arm = ik[0];
      const reachK = sstep(0.0, 0.42, t);
      if (a > 0) { const kk = a / 20; const i = Math.min(2, Math.floor(kk)); arm = E.slerpPose(ik[i], ik[i + 1], kk - i); }
      let pose = { ...stand, chest: [6, -10, 0], head: [2, -12, 0], ...E.slerpPose({ rShoulder: stand.rShoulder, rElbow: stand.rElbow, rWrist: stand.rWrist }, arm, reachK) };
      const rel = sstep(1.55, 2.2, t);
      pose = E.slerpPose(pose, { ...stand, chest: [-3, 8, 0], head: [-6, 10, 0], rShoulder: [-10, 0, -8], rElbow: [-30, 0, 0] }, rel);
      const surprise = sstep(3.6, 3.9, t);
      if (surprise > 0) { pose.chest = [pose.chest[0] - 5 * surprise, pose.chest[1], 0]; pose.head = [pose.head[0] - 5 * surprise, pose.head[1], 3 * surprise]; }
      const hp = lerp3(hp0, hp1, sstep(1.6, 2.3, t));
      place(h, boil(pose, info.frame, 1), { pos: hp, rotY: lerp(-30, -10, sstep(1.6, 2.3, t)) });
      place(v, boil({ ...stand, head: [0, 0, 0], chest: [0, 0, 0] }, info.frame, 2), { pos: vp, rotY: 180 });
    },
    look: () => ({ warm: 0.12, focus: camera.position.distanceTo(V3(vp[0], 1.3, vp[2])), fstop: 2.8 }),
  };
}));

// 5 — Profile two-shot in the doorway: the mirror tilt.
shots.push(shot('s05-mirror', 3.0, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host, v = cast.visitor;
  h.group.visible = v.group.visible = true;
  setLights(S, { cityKey: [12, false], cityFill: 0.5, hemi: 0.14, cor: [16, [4], [3, 4, 5]] });
  S.doorOpen(92);
  const cx = -1.28, zz = 5.74, gap = 0.36;
  const base = { ...P.STAND, chest: [3, 0, 0], head: [2, 0, 0] };
  const tilt1 = { head: [-12, 4, 28], chest: [1, 0, 5] }, tilt2 = { head: [10, -4, -26], chest: [5, 0, -5] };
  const tr = PT(base, [[0, {}], [0.62, {}], [0.66, { head: [4, 0, -4] }], [0.82, tilt1, 'out'], [1.5, {}], [1.62, { head: [0, 0, 0], chest: [3, 0, 0] }], [2.0, {}], [2.04, { head: [-2, 0, 4] }], [2.18, tilt2, 'out'], [3, {}]]);
  camSet(camera, [cx, 1.1, 2.55], [cx, 1.05, 5.9], 44);
  return {
    update: (t, info) => {
      const p = tr(t);
      place(h, boil(p, info.frame, 1, 0.2), { pos: [cx + gap, 0, zz], rotY: -126 });
      place(v, boil(mirror(p), info.frame, 1, 0.2), { pos: [cx - gap, 0, zz], rotY: 126 });
    },
    look: () => ({ warm: 0.12, focus: camera.position.distanceTo(V3(cx, 1.6, zz)), fstop: 2.8 }),
  };
}));

// 6 — Kitchenette from beside the sink: the tap. He jumps back, then holds both hands under the water.
shots.push(shot('s06-tap', 5.5, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host, v = cast.visitor;
  h.group.visible = v.group.visible = true;
  setLights(S, { cityKey: [14, false], cityFill: 0.5, strip: [5, false], hemi: 0.16, hallFill: 0.7 });
  const hp = [2.64, 0, 1.58], hRot = 92;
  const lever = V3(3.47, FL.kit.top + 0.12, FL.kit.sinkZ + 0.07);
  const hStand = { ...P.STAND, chest: [8, 0, 0], head: [16, 0, 0] };
  const hReach = { ...hStand, chest: [14, -8, 0], head: [20, -10, 0], ...ikHand(h, { ...hStand, chest: [14, -8, 0] }, { pos: hp, rotY: hRot }, 'r', lever, V3(0, -1, 0)) };
  const hTr = PT(hStand, [[0, {}], [0.15, {}], [0.5, hReach], [0.62, { rWrist: [hReach.rWrist[0] - 25, hReach.rWrist[1], hReach.rWrist[2]] }, 'out'], [1.0, { ...hStand, chest: [4, -14, 0], head: [8, -38, 0] }], [1.2, { chest: [0, -16, 0], head: [2, -40, 0] }], [2.4, { chest: [6, -14, 0], head: [14, -36, 0] }], [5.5, {}]]);
  // visitor
  const vp0 = [2.5, 0, 2.44], vpJ = [2.12, 0, 2.62], vp2 = [2.44, 0, 2.36];
  const stream = S.tapOut.clone(); stream.y = 1.14;
  const vStand = { ...P.STAND, chest: [6, 0, 0], head: [22, 20, 0] };
  const vBend = { ...P.STAND, chest: [24, 0, 0], head: [34, 10, 0], lHip: [-14, 0, 3], rHip: [-10, 0, -3], lKnee: [12, 0, 0], rKnee: [8, 0, 0] };
  const hands = { ...ikHand(v, vBend, { pos: vp2, rotY: 118 }, 'l', stream.clone().add(V3(-0.06, -0.08, -0.05)), V3(0, 1, 0)) };
  Object.assign(hands, ikHand(v, { ...vBend, ...hands }, { pos: vp2, rotY: 118 }, 'r', stream.clone().add(V3(0.04, -0.08, 0.06)), V3(0, 1, 0)));
  const vUnder = { ...vBend, ...hands };
  const vTr = PT(vStand, [[0, {}], [0.62, {}],
    [0.72, { chest: [-2, 0, 0], head: [10, 20, 0], lShoulder: [0, 0, 12], rShoulder: [0, 0, -12] }, 'out'],          // flinch
    [0.9, { lHip: [-30, 0, 4], rHip: [-26, 0, -4], lKnee: [50, 0, 0], rKnee: [44, 0, 0], chest: [14, 0, 0], head: [12, 20, 0], lShoulder: [10, 0, 8], rShoulder: [10, 0, -8], lElbow: [-40, 0, 0], rElbow: [-40, 0, 0] }], // anticipation crouch
    [1.1, { lHip: [-40, 0, 10], rHip: [-10, 0, -10], lKnee: [70, 0, 0], rKnee: [30, 0, 0], chest: [-14, 0, 0], head: [-10, 20, 0], lShoulder: [-110, 0, 40], rShoulder: [-110, 0, -40], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0] }, 'out'], // airborne, arms up
    [1.3, { lHip: [-40, 0, 8], rHip: [-36, 0, -8], lKnee: [62, 0, 0], rKnee: [58, 0, 0], chest: [16, 0, 0], head: [6, 18, 0], lShoulder: [-60, 0, 20], rShoulder: [-60, 0, -20], lElbow: [-90, 0, 0], rElbow: [-90, 0, 0] }, 'in'], // land crouched, hands up
    [1.45, {}], [2.0, { head: [14, 18, 18] }], // stare, curious tilt
    [2.8, { ...vBend, lShoulder: [-30, 0, 10], rShoulder: [-30, 0, -10], lElbow: [-50, 0, 0], rElbow: [-50, 0, 0], head: [24, 12, 0] }],
    [3.35, vUnder, 'out'], [3.6, { head: [38, 6, 8] }], [5.5, { head: [42, 4, 20] }]]);
  const vPos = (t) => t < 0.9 ? vp0 : t < 1.3 ? lerp3(vp0, vpJ, sstep(0.9, 1.28, t)) : t < 2.1 ? vpJ : lerp3(vpJ, vp2, sstep(2.1, 3.0, t));
  const vLift = (t) => (t > 0.9 && t < 1.3) ? Math.sin(Math.PI * (t - 0.9) / 0.4) * 0.3 : 0;
  camSet(camera, [3.3, 1.3, 4.15], [2.58, 1.2, 1.95], 70); S.stripMesh.visible = false;
  S.L.hallFill.position.set(2.2, 1.9, 3.6);
  return {
    update: (t, info) => {
      place(h, boil(hTr(t), info.frame, 1), { pos: hp, rotY: hRot });
      place(v, boil(vTr(t), info.frame, 2), { pos: vPos(t), rotY: t < 1.3 ? 96 : lerp(96, 118, sstep(2.1, 3.0, t)), lift: vLift(t) });
      const on = sstep(0.58, 0.66, t); S.waterOn(on, info.frame); S.tapLever.rotation.z = 0.5 * on;
    },
    look: () => ({ warm: 0.08, focus: camera.position.distanceTo(V3(2.5, 1.3, 2.4)), fstop: 4 }),
  };
}));

// 7 — Wide on the front-door wall: the switch. Dark / light x3, both arms up.
shots.push(shot('s07-switch', 4.0, (W, { camera }) => {
  const { S, cast } = W; const v = cast.visitor;
  v.group.visible = true;
  setLights(S, { cityKey: [12, false], cityFill: 0.45, hemi: 0.12, hall: [0, true], hallFill: 0 });
  const vp = [-0.44, 0, 5.98], rot = -28;
  const sw = V3(FL.sw.x, FL.sw.y, FL.z1 - 0.03);
  const st = { ...P.STAND, chest: [4, 0, 0], head: [10, -24, 0] };
  const press = { ...st, ...ikHand(v, st, { pos: vp, rotY: rot }, 'r', sw.clone().add(V3(0, 0, -0.01)), V3(0, 0, 1), [0, -0.16, 0.0]) };
  const hover = { ...st, ...ikHand(v, st, { pos: vp, rotY: rot }, 'r', sw.clone().add(V3(0.02, -0.02, -0.1)), V3(0, 0, 1), [0, -0.16, 0.0]) };
  const presses = [0.55, 0.9, 1.22, 1.5, 1.76];
  const armsUp = { ...P.STAND, chest: [-8, 0, 0], head: [-14, 20, 0], lShoulder: [-160, 0, 28], rShoulder: [-160, 0, -28], lElbow: [-10, 0, 0], rElbow: [-10, 0, 0], lHip: [-4, 0, 6], rHip: [-4, 0, -6] };
  const keys = [[0, st], [0.3, hover]];
  for (const pt of presses) keys.push([pt - 0.08, { ...hover, head: [12, -22, 0] }], [pt, { ...press, head: [14, -26, 0], chest: [6, 0, 0] }, 'out'], [pt + 0.12, { ...hover, head: [6, -20 + 8, 0] }]);
  keys.push([2.05, { ...hover, head: [4, -10, 0] }], [2.25, { ...P.STAND, lHip: [-10, 0, 3], rHip: [-10, 0, -3], lKnee: [22, 0, 0], rKnee: [22, 0, 0], chest: [12, 0, 0], head: [8, 10, 0], lShoulder: [10, 0, 10], rShoulder: [10, 0, -10] }], [2.42, armsUp, 'out'], [2.6, {}], [4, { head: [-18, 24, 6] }]);
  const tr = PT(st, keys);
  camSet(camera, [0.42, 1.36, 3.05], [-1.0, 1.32, 6.35], 52);
  return {
    update: (t, info) => {
      let n = 0; for (const pt of presses) if (t >= pt) n++;
      const on = n % 2 === 1; hallOn(S, on);
      const lift = t > 2.3 && t < 2.62 ? Math.sin(Math.PI * (t - 2.3) / 0.32) * 0.1 : 0;
      place(v, boil(tr(t), info.frame, 2), { pos: vp, rotY: lerp(rot, 150, sstep(2.25, 2.6, t)), lift });
    },
    look: () => ({ warm: 0.15, focus: camera.position.distanceTo(V3(vp[0], 1.4, vp[2])), fstop: 4 }),
  };
}));

// 8 — From inside the fridge: the door opens, light like a sunrise; he takes the apple and holds it up.
shots.push(shot('s08-fridge', 4.5, (W, { camera }) => {
  const { S, cast } = W; const v = cast.visitor;
  v.group.visible = true;
  setLights(S, { cityKey: [10, false], cityFill: 0.4, strip: 2, hemi: 0.1, hall: [22, false], hallFill: 0.9, fridge: [0, true], fridgeArea: 0 });
  hallOn(S, true);
  const fr = S.fridge; fr.updateMatrixWorld(true);
  const L = (x, y, z) => V3(x, y, z).applyMatrix4(fr.matrixWorld);
  const vp = [2.3, 0, 4.5];
  const st = { ...P.STAND, chest: [10, 0, 0], head: [8, 0, 0] };
  const awe = { ...P.STAND, chest: [-6, 0, 0], head: [-10, 0, 0], lShoulder: [-30, 0, 34], rShoulder: [-30, 0, -34], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0] };
  S.appleHome(); const appleP = S.apple.position.clone();
  const lean = { ...P.STAND, chest: [28, 0, 0], head: [20, 0, 0], lHip: [-16, 0, 3], rHip: [-6, 0, -3], lKnee: [10, 0, 0], rKnee: [4, 0, 0] };
  const reach = { ...lean, ...ikHand(v, lean, { pos: vp, rotY: 90 }, 'r', appleP.clone().add(V3(-0.02, 0.05, 0)), V3(0, -1, 0.2)) };
  const liftP = V3(vp[0] + 0.3, 1.78, vp[2]);
  const up = { ...P.STAND, chest: [-10, 0, 0], head: [-26, 0, 0] };
  Object.assign(up, ikHand(v, up, { pos: vp, rotY: 90 }, 'l', liftP.clone().add(V3(0, -0.02, 0.07)), V3(0, 0.3, -1)));
  Object.assign(up, ikHand(v, up, { pos: vp, rotY: 90 }, 'r', liftP.clone().add(V3(0, -0.02, -0.07)), V3(0, 0.3, 1)));
  const tr = PT(st, [[0, {}], [0.6, {}], [0.72, { chest: [4, 0, 0], head: [-4, 0, 0] }, 'out'], [0.95, awe, 'out'], [1.6, {}], [2.15, reach], [2.35, {}], [2.75, { ...st, rShoulder: [-60, 0, -10], rElbow: [-80, 0, 0] }], [3.15, up, 'out'], [4.5, { head: [-30, 0, 6] }]]);
  const doorA = TR([[0, 0], [0.55, 0, 'out'], [0.95, 1.75, 'out'], [4.5, 1.8]]);
  camSet(camera, L(0.02, 1.08, -0.3).toArray(), L(0.04, 1.3, 2.2).toArray(), 70);
  return {
    update: (t, info) => {
      S.fridgeDoor.rotation.y = doorA(t); const open = t > 0.56 ? 1 : 0; fridgeLights(S, open);
      place(v, boil(tr(t), info.frame, 2), { pos: vp, rotY: 90 });
      if (t < 2.3) S.appleHome();
      else if (t < 2.9) appleIn(W, v, 'r', [0, -0.12, 0.07]);
      else { const a = jp(v, 'lWrist', [0, -0.12, 0.05]), b = jp(v, 'rWrist', [0, -0.12, 0.05]); S.apple.position.copy(a.add(b).multiplyScalar(0.5)).add(V3(0, 0.03, 0)); }
    },
    look: (t) => ({ warm: 0.1, focus: camera.position.distanceTo(V3(vp[0], 1.4, vp[2])), fstop: 2.2, exposure: 1.0, streak: { threshold: 1.8, strength: 0.3, tint: [0.4, 0.65, 1.0] } }),
  };
}));

// 9 — Living room: the host taps the speaker; music; the visitor sways and does three stepped dance moves. Lamp on.
const VIS_DANCE = [-1.02, 0, 3.08];
function dancePose(t, holdApple = true) {
  const st = { ...P.STAND, chest: [2, 0, 0], head: [0, 0, 0] };
  const sw = (s) => ({ pelvis: [0, 0, -6 * s], chest: [2, 0, 9 * s], head: [0, 0, 10 * s], lShoulder: [0, 0, 16 + 8 * s], rShoulder: [0, 0, -16 + 8 * s], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0], lHip: [0, 0, 4 + 4 * s], rHip: [0, 0, -4 + 4 * s] });
  const m1 = { pelvis: [0, 0, 8], chest: [-4, 10, -12], head: [-8, 14, -14], lShoulder: [-150, 0, 30], lElbow: [-20, 0, 0], rShoulder: [-20, 0, -70], rElbow: [-10, 0, 0], lHip: [-60, 0, 8], lKnee: [80, 0, 0], rHip: [2, 0, -6], rKnee: [4, 0, 0] };
  const m2 = mirror(m1);
  const m3 = { pelvis: [0, 20, 0], chest: [-10, 16, 0], head: [-16, -10, 8], lShoulder: [-165, 0, 26], rShoulder: [-165, 0, -26], lElbow: [-8, 0, 0], rElbow: [-8, 0, 0], lHip: [-8, 0, 12], rHip: [10, 0, -14], lKnee: [6, 0, 0], rKnee: [16, 0, 0], rAnkle: [30, 0, 0] };
  const tr = PT(st, [[0, {}], [0.6, {}], [0.85, sw(1)], [1.15, sw(-1)], [1.45, sw(1)], [1.7, sw(0)], [1.8, { chest: [8, 0, 0], lKnee: [18, 0, 0], rKnee: [18, 0, 0], lHip: [-10, 0, 2], rHip: [-10, 0, -2] }], [1.92, m1, 'out'], [2.4, {}], [2.5, { chest: [8, 0, 0], lKnee: [18, 0, 0], rKnee: [18, 0, 0], lHip: [-10, 0, 2], rHip: [-10, 0, -2], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10] }], [2.62, m2, 'out'], [3.1, {}], [3.2, { chest: [10, 0, 0], lKnee: [20, 0, 0], rKnee: [20, 0, 0], lHip: [-12, 0, 2], rHip: [-12, 0, -2] }], [3.32, m3, 'out'], [9, {}]]);
  return tr(t);
}
shots.push(shot('s09-dance', 4.0, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host, v = cast.visitor;
  h.group.visible = v.group.visible = true;
  setLights(S, { cityKey: [14, true], cityFill: 0.5, strip: 3, hemi: 0.12, hall: [22, false], hallFill: 0.9, lamp: [0, false], lampGlow: 0 });
  hallOn(S, true); lampOn(S, 1);
  const hp = [-2.86, 0, 1.8];
  const spk = V3(FL.speaker[0] + 0.02, FL.speaker[1] + 0.2, FL.speaker[2]);
  const hs = { ...P.STAND, chest: [8, 0, 0], head: [22, 0, 0] };
  const tap = { ...hs, chest: [14, 0, 0], ...ikHand(h, { ...hs, chest: [14, 0, 0] }, { pos: hp, rotY: -90 }, 'r', spk, V3(0, -1, 0)) };
  const hover = { ...tap, rShoulder: [tap.rShoulder[0] - 6, tap.rShoulder[1], tap.rShoulder[2]] };
  const hTr = PT(hs, [[0, {}], [0.25, hover], [0.36, tap, 'out'], [0.5, hover], [0.9, { ...P.STAND, chest: [2, 30, 0], head: [6, 40, 0] }], [4, { head: [8, 44, 6] }]]);
  camSet(camera, [0.2, 1.35, 5.2], [-2.0, 1.05, 2.3], 54);
  return {
    update: (t, info) => {
      place(h, boil(hTr(t), info.frame, 1), { pos: hp, rotY: lerp(-90, -60, sstep(0.6, 1.0, t)) });
      place(v, boil(dancePose(t), info.frame, 2), { pos: VIS_DANCE, rotY: 58 });
      appleIn(W, v, 'l');
      S.speakerLed.color.setRGB(1, 0.8, 0.5).multiplyScalar(t > 0.36 ? 4 : 0);
    },
    look: () => ({ warm: 0.38, focus: camera.position.distanceTo(V3(VIS_DANCE[0], 1.4, VIS_DANCE[2])), fstop: 3.2, streak: { threshold: 2.5, strength: 0.18, tint: [1.0, 0.6, 0.35] } }),
  };
}));

// 10 — The music winds down; he turns and walks to the bedroom door; looks in. Empty bed.
shots.push(shot('s10-bedroom', 4.5, (W, { camera }) => {
  const { S, cast } = W; const v = cast.visitor;
  v.group.visible = true;
  setLights(S, { cityKey: [12, false], cityFill: 0.4, hemi: 0.1, hall: [22, false], hallFill: 0.9, lamp: [0, false], lampGlow: 0, bed: [9, true] });
  hallOn(S, true); lampOn(S, 1);
  const end = [-3.28, 0, 3.84];
  const jamb = V3(FL.x0 - 0.02, 1.3, FL.bedDoor.z0 + 0.02);
  const lookIn = { ...P.STAND, chest: [12, 0, 0], head: [14, 0, 0] };
  const handJ = { ...lookIn, ...ikHand(v, lookIn, { pos: end, rotY: -90 }, 'r', jamb.clone().add(V3(0.04, 0, 0.05)), V3(0, 0, -1)) };
  const deflate = PT(dancePose(3.9), [[0, {}], [0.9, { ...P.STAND, chest: [4, 0, 0], head: [6, 0, 0] }], [1.1, { head: [4, -40, 0] }]]);
  camSet(camera, [1.4, 1.42, 2.85], [-4.8, 1.0, 3.55], 44);
  return {
    update: (t, info) => {
      let pose, pos, rotY;
      if (t < 1.15) { pose = deflate(t); pos = VIS_DANCE; rotY = lerp(58, -90, sstep(0.75, 1.15, t)); }
      else if (t < 3.15) { const wk = K.walkAt(t, { t0: 1.15, t1: 3.15, path: [VIS_DANCE, end], steps: 4, upper: { head: [6, 0, 0] } }); pose = wk.pose; pos = wk.pos; rotY = wk.rotY; }
      else { pose = E.slerpPose(P.STAND, handJ, sstep(3.15, 3.55, t)); pose = { ...pose, chest: [lerp(4, 16, sstep(3.4, 3.9, t)), 0, 0], head: [lerp(6, 20, sstep(3.4, 3.9, t)), 0, lerp(0, 8, sstep(3.9, 4.5, t))] }; pos = end; rotY = -90; }
      place(v, boil(pose, info.frame, 2), { pos, rotY });
      appleIn(W, v, 'l');
    },
    look: () => ({ warm: 0.14, focus: camera.position.distanceTo(V3(-3.2, 1.3, 3.84)), fstop: 3.2 }),
  };
}));

// 11 — The balcony: his small figure at the rail, the lit city above and below. Looks left, right. No one.
shots.push(shot('s11-balcony', 4.5, (W, { camera }) => {
  const { S, cast } = W; const v = cast.visitor;
  v.group.visible = true; S.balconyDoor(1);
  setLights(S, { cityKey: [18, true], cityFill: 0.3, hemi: 0.14, hallFill: 0.5 });
  S.L.hallFill.position.set(1.2, 1.9, 1.1);
  const vp = [1.28, -0.02, -1.24];
  const railL = V3(0.98, 1.08, -1.52), railR = V3(1.58, 1.08, -1.52);
  const st = { ...P.STAND, chest: [6, 0, 0], head: [4, 0, 0] };
  let hands = ikHand(v, st, { pos: vp, rotY: 180, floor: -0.02 }, 'l', railL, V3(0, -1, 0));
  const sh = { ...st, ...hands }; Object.assign(sh, ikHand(v, sh, { pos: vp, rotY: 180, floor: -0.02 }, 'r', railR, V3(0, -1, 0)));
  const tr = PT(sh, [[0, {}], [0.8, {}], [1.05, { head: [8, 50, 0] }], [1.45, { head: [10, 62, 0], chest: [8, 14, 0] }], [2.3, {}], [2.55, { head: [8, -20, 0], chest: [6, 0, 0] }], [3.0, { head: [10, -62, 0], chest: [8, -14, 0] }], [3.8, {}], [4.5, { head: [18, -10, 0], chest: [10, -4, 0] }]]);
  camSet(camera, [1.42, 1.5, 2.35], [1.0, 0.95, -10], 56, [0, 0.04]);
  return {
    update: (t, info) => { place(v, boil(tr(t), info.frame, 2), { pos: vp, rotY: 180, floor: -0.02 }); appleIn(W, v, 'l'); },
    look: () => ({ warm: 0, focus: camera.position.distanceTo(V3(vp[0], 1.4, vp[2])), fstop: 2.8, streak: { threshold: 2.0, strength: 0.3, tint: [0.35, 0.6, 1.0] } }),
  };
}));

// 12 — The landing: he opens the front door, leans out, looks down the corridor both ways. Every door closed.
shots.push(shot('s12-corridor', 4.5, (W, { camera }) => {
  const { S, cast } = W; const v = cast.visitor;
  v.group.visible = true;
  setLights(S, { hemi: 0.1, cor: [18, [4, 5]], hall: [16, false], hallFill: 0.6 });
  hallOn(S, true);
  const p0 = [DOOR_C[0] + 0.05, 0, 5.95], p1 = [DOOR_C[0] + 0.05, 0, 6.62];
  const st = { ...P.STAND, chest: [4, 0, 0], head: [2, 0, 0] };
  const tr = PT(st, [[0, {}], [1.2, {}], [1.5, { chest: [14, 8, 0], head: [2, 66, 0] }, 'out'], [2.3, {}], [2.55, { head: [2, 10, 0] }], [2.95, { chest: [16, -16, 0], head: [4, -72, 0] }, 'out'], [3.9, {}], [4.5, { chest: [20, -12, 0], head: [12, -66, 0] }]]);
  const doorA = TR([[0, 0], [0.3, 0], [0.8, 78, 'out'], [4.5, 80]]);
  camSet(camera, [7.6, 1.45, 7.72], [-12, 1.2, 7.1], 27);
  return {
    update: (t, info) => {
      S.doorOpen(doorA(t)); S.handleDown(sstep(0.15, 0.3, t) * (1 - sstep(0.8, 1.0, t)));
      let pose = tr(t), pos = p0;
      if (t > 0.55 && t < 1.25) { const wk = K.walkAt(t, { t0: 0.55, t1: 1.25, path: [p0, p1], steps: 1 }); pose = { ...pose, ...K.pick(wk.pose, ['lHip', 'lKnee', 'lAnkle', 'rHip', 'rKnee', 'rAnkle']) }; pos = wk.pos; }
      else if (t >= 1.25) pos = p1;
      place(v, boil(pose, info.frame, 2), { pos, rotY: 0 });
      appleIn(W, v, 'l');
    },
    look: () => ({ warm: 0.0, focus: camera.position.distanceTo(V3(p1[0], 1.4, p1[2])), fstop: 3.5, g: { contrast: 0.46 } }),
  };
}));

// 13 — Living room, wide, low: host back on the phone; the visitor stands before him, hands open. Host doesn't look up.
const VIS_ASK = [-0.2, 0, 1.72];
shots.push(shot('s13-ask', 5.0, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host, v = cast.visitor;
  h.group.visible = v.group.visible = true; cast.phone.visible = true;
  setLights(S, { cityKey: [20, true], cityFill: 0.7, phone: 30, hemi: 0.12, lamp: [0, false], lampGlow: 0, hall: [12, false], hallFill: 0.5 });
  lampOn(S, 0.55); hallOn(S, true); S.L.hall.intensity = 12;
  const base = hostPhonePose(W);
  const rot = Math.atan2(FL.hostSeat[0] - VIS_ASK[0], FL.hostSeat[1] - VIS_ASK[2]) / D2R;
  const st = { ...P.STAND, chest: [6, 0, 0], head: [16, 0, 0] };
  const open = { ...st, lShoulder: [-26, 0, 16], rShoulder: [-26, 0, -16], lElbow: [-58, -20, 0], rElbow: [-58, 20, 0], lWrist: [0, -70, 0], rWrist: [0, 70, 0], head: [12, 0, 10], chest: [4, 0, 0] };
  const tr = PT(st, [[0, {}], [1.2, {}], [1.85, open, 'out'], [4.2, { head: [14, 0, 12] }], [5.0, { lShoulder: [-18, 0, 12], rShoulder: [-18, 0, -12], lElbow: [-40, -20, 0], rElbow: [-40, 20, 0], head: [22, 0, 8] }]]);
  camSet(camera, [-0.75, 0.5, 4.9], [-0.85, 1.12, 1.3], 50, [0, 0.05]);
  return {
    update: (t, info) => {
      const pose = { ...base }; if (t > 3.0 && t < 3.3) pose.rWrist = [base.rWrist[0] - 7, base.rWrist[1], base.rWrist[2]];
      place(h, boil(pose, info.frame, 1), HOST_SEAT); K.phoneInHand(cast.phone, h); cast.phone.userData.setFeed(t > 3.2 ? 0.5 : 0.44); cupInHand(W, h); phoneLight(W, 1);
      place(v, boil(tr(t), info.frame, 2), { pos: VIS_ASK, rotY: rot });
      appleIn(W, v, 'l');
    },
    look: () => ({ warm: 0, focus: camera.position.distanceTo(V3(-0.8, 1.2, 1.5)), fstop: 3.2, streak: { threshold: 2.2, strength: 0.25, tint: [0.35, 0.6, 1.0] } }),
  };
}));

// 14 — Two-shot on the sofa, frontal: he sits down close, shoulder to shoulder. Pause. The host turns to him. The phone dims.
shots.push(shot('s14-sit', 7.5, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host, v = cast.visitor;
  h.group.visible = v.group.visible = true; cast.phone.visible = true;
  setLights(S, { cityKey: [16, false], cityFill: 0.6, phone: 30, hemi: 0.12, lamp: [0, true], lampGlow: 0, hall: [8, false], hallFill: 0.3 });
  hallOn(S, true); S.L.hall.intensity = 8;
  const base = hostPhonePose(W);
  const turned = { ...base, chest: [18, 10, 0], head: [10, 36, -4], rShoulder: [base.rShoulder[0] + 10, base.rShoulder[1], base.rShoulder[2]] };
  const hTr = PT(base, [[0, {}], [4.0, {}], [6.2, turned, 'inOut'], [7.5, { head: [9, 38, -5] }]]);
  const rot0 = Math.atan2(FL.hostSeat[0] - VIS_ASK[0], FL.hostSeat[1] - VIS_ASK[2]) / D2R;
  const front = [FL.visSeat[0] + 0.02, 0, 1.66];
  const vSit = { ...P.SIT, chest: [14, 0, 5], head: [10, 0, 0], lShoulder: [-20, 0, 6], rShoulder: [-14, 0, -4], lElbow: [-50, 0, 0], rElbow: [-30, 0, 0] };
  const vCrouch = { ...P.STAND, lHip: [-50, 0, 7], rHip: [-50, 0, -7], lKnee: [70, 0, 0], rKnee: [70, 0, 0], chest: [30, 0, 0], head: [0, 0, 0], lShoulder: [-30, 0, 10], rShoulder: [-30, 0, -10], lElbow: [-40, 0, 0], rElbow: [-40, 0, 0] };
  const vTr = PT(P.STAND, [[1.1, { ...P.STAND, head: [6, 0, 0] }], [1.3, { lKnee: [14, 0, 0], rKnee: [14, 0, 0], lHip: [-8, 0, 2], rHip: [-8, 0, -2], chest: [10, 0, 0], lShoulder: [14, 0, 8], rShoulder: [14, 0, -8] }], [1.62, vCrouch], [1.92, vSit, 'out'], [2.05, { chest: [16, 0, 6] }], [2.2, { chest: [14, 0, 5] }], [6.3, {}], [7.5, { head: [12, -8, -6] }]]);
  const vZ = TR([[0, 1.66], [1.3, 1.66], [1.92, FL.visSeat[1], 'inOut'], [7.5, FL.visSeat[1]]]);
  camSet(camera, [-1.15, 1.02, 4.5], [-1.15, 1.08, 1.0], 46, [0, 0.03]);
  return {
    update: (t, info) => {
      place(h, boil(hTr(t), info.frame, 1, 0.22), HOST_SEAT); K.phoneInHand(cast.phone, h); cast.phone.userData.setFeed(0.5); cupInHand(W, h);
      const dim = 1 - 0.88 * sstep(4.6, 6.6, t); phoneLight(W, dim);
      if (t < 1.1) { const wk = K.walkAt(t, { t0: 0.15, t1: 1.1, path: [VIS_ASK, front], steps: 2 }); place(v, boil(wk.pose, info.frame, 2), { pos: wk.pos, rotY: lerp(rot0, 0, sstep(0.3, 1.05, t)) }); }
      else place(v, boil(vTr(t), info.frame, 2, 0.22), { pos: [front[0], 0, vZ(t)], rotY: 0, seat: FL.seatY });
      appleIn(W, v, 'l');
      lampOn(S, 0.55 + 0.75 * sstep(3.6, 7.2, t));
    },
    look: (t) => ({ samples: 2, warm: 0.12 + 0.45 * sstep(3.8, 7.3, t), focus: camera.position.distanceTo(V3(-1.15, 1.2, 1.1)), fstop: 2.6, streak: { threshold: 2.2, strength: 0.22, tint: [1.0, 0.62, 0.36] } }),
  };
}));

// 15 — Close: the phone in the host's hands. One short message (unreadable), sent.
shots.push(shot('s15-message', 3.5, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host, v = cast.visitor;
  h.group.visible = v.group.visible = true; cast.phone.visible = true;
  setLights(S, { cityKey: [12, false], cityFill: 0.4, phone: 26, hemi: 0.12, lamp: [0, false], lampGlow: 0 });
  lampOn(S, 1.2);
  const hb = { ...P.SIT, chest: [18, 0, 0], head: [30, 0, 0] };
  place(h, hb, HOST_SEAT);
  const face = jp(h, 'head', [0, 0.12, 0.1]); const tgt = face.clone().add(V3(0.02, -0.36, 0.22));
  const armR = ikHand(h, hb, HOST_SEAT, 'r', tgt, face.clone().sub(tgt));
  const pose0 = { ...hb, ...armR };
  place(h, pose0, HOST_SEAT); K.phoneInHand(cast.phone, h);
  const pc = K.phoneGlow(cast.phone).c;
  const armL = ikHand(h, pose0, HOST_SEAT, 'l', pc.clone().add(V3(0.06, -0.015, 0.0)), face.clone().sub(pc));
  const pose = { ...pose0, ...armL };
  const vPose = { ...P.SIT, chest: [14, 0, 5], head: [14, -30, -6], lShoulder: [-20, 0, 6], rShoulder: [-14, 0, -4], lElbow: [-50, 0, 0], rElbow: [-30, 0, 0] };
  camSet(camera, [pc.x - 0.36, pc.y + 0.42, pc.z - 0.1], [pc.x, pc.y, pc.z], 32);
  return {
    update: (t, info) => {
      const typing = t > 0.45 && t < 2.25; const ph = Math.floor(info.frame / 2) % 2;
      const p = { ...pose };
      if (typing) { p.rWrist = [pose.rWrist[0] + (ph ? 5 : 0), pose.rWrist[1], pose.rWrist[2]]; p.lWrist = [pose.lWrist[0] + (ph ? 0 : 5), pose.lWrist[1], pose.lWrist[2]]; }
      if (t > 2.3 && t < 2.45) p.rWrist = [pose.rWrist[0] + 9, pose.rWrist[1], pose.rWrist[2]];
      place(h, boil(p, info.frame, 1, 0.15), HOST_SEAT); K.phoneInHand(cast.phone, h);
      cast.phone.userData.setChat(clamp((t - 0.45) / 1.8), t > 2.35); phoneLight(W, 1);
      place(v, boil(vPose, info.frame, 2, 0.15), VIS_SEAT); appleIn(W, v, 'l');
    },
    look: () => ({ warm: 0.5, focus: camera.position.distanceTo(pc) - 0.02, fstop: 1.8, streak: { threshold: 2.4, strength: 0.2, tint: [1.0, 0.62, 0.36] } }),
  };
}));

// 16 — The front door from inside: knocks; the door opens; four friends come in with food, one after another.
const FRIEND_PATHS = [
  [[-1.62, 0, 7.5], [-1.62, 0, 6.1], [-0.2, 0, 4.2]],
  [[-1.58, 0, 7.6], [-1.58, 0, 6.0], [-2.75, 0, 4.5]],
  [[-1.62, 0, 7.6], [-1.62, 0, 6.05], [-0.55, 0, 4.1]],
  [[-1.6, 0, 7.6], [-1.6, 0, 6.0], [-2.4, 0, 4.7]],
];
const CARRY = { lShoulder: [-16, 0, 12], rShoulder: [-16, 0, -12], lElbow: [-84, 16, 0], rElbow: [-84, -16, 0], lWrist: [0, 0, -14], rWrist: [0, 0, 14], chest: [-4, 0, 0], head: [2, 0, 0] };
shots.push(shot('s16-friends', 4.5, (W, { camera }) => {
  const { S, cast } = W;
  cast.friends.forEach(f => { f.group.visible = true; }); cast.food.forEach(g => { g.visible = true; });
  setLights(S, { cityKey: [10, false], cityFill: 0.4, hemi: 0.16, cor: [18, [4], [3, 4, 5]], hall: [22, true], hallFill: 0.9, lamp: [0, false], lampGlow: 0 });
  hallOn(S, true); lampOn(S, 1.2);
  const t0s = [1.0, 1.55, 2.1, 2.65];
  const doorA = TR([[0, 0], [0.9, 0, 'out'], [1.45, 90, 'out'], [4.5, 92]]);
  camSet(camera, [-0.9, 1.36, 2.55], [-1.55, 1.2, 6.4], 52);
  return {
    update: (t, info) => {
      S.doorOpen(doorA(t)); S.handleDown(sstep(0.8, 0.9, t) * (1 - sstep(1.3, 1.5, t)));
      cast.friends.forEach((f, i) => {
        const wk = K.walkAt(t, { t0: t0s[i], t1: t0s[i] + 2.3, path: FRIEND_PATHS[i], steps: 5, upper: CARRY, armSwing: 0 });
        place(f, boil(wk.pose, info.frame, 3 + i), { pos: wk.pos, rotY: wk.rotY + 180 * 0 });
        const a = jp(f, 'lWrist', [0, -0.12, 0.04]), b = jp(f, 'rWrist', [0, -0.12, 0.04]);
        const g = cast.food[i]; g.position.copy(a.add(b).multiplyScalar(0.5)).add(V3(0, 0.02, 0)); g.rotation.set(0, wk.rotY * D2R, 0);
      });
    },
    look: () => ({ warm: 0.72, focus: camera.position.distanceTo(V3(-1.4, 1.3, 5.6)), fstop: 3.5 }),
  };
}));

// 17 — Wide, the whole flat, warm: everyone. The visitor in the middle laughing, an arm around two; the host upright beside him.
shots.push(shot('s17-together', 5.0, (W, { camera }) => {
  const { S, cast } = W; const h = cast.host, v = cast.visitor; const [fA, fB, fC, fD] = cast.friends;
  for (const f of cast.all) f.group.visible = true; cast.food.forEach(g => { g.visible = true; }); cast.phone.visible = true; cast.glass.visible = true;
  setLights(S, { cityKey: [10, false], cityFill: 0.4, strip: 3, hemi: 0.2, hall: [22, false], hallFill: 0.9, lamp: [0, true], lampGlow: 0 });
  hallOn(S, true); lampOn(S, 0.95);
  const sx = FL.sofa.x, sz = FL.hostSeat[1];
  const hSeat = { pos: [sx - 0.62, 0, sz], rotY: 0, seat: FL.seatY }, vSeat = { pos: [sx, 0, sz], rotY: 0, seat: FL.seatY }, aSeat = { pos: [sx + 0.62, 0, sz], rotY: 0, seat: FL.seatY };
  const hPose = { ...P.SIT, chest: [-2, 10, 0], head: [-4, 30, 0] };
  const aPose = { ...P.SIT, chest: [4, -10, 0], head: [-10, -26, 0] };
  place(h, hPose, hSeat); place(fA, aPose, aSeat);
  const vBase = { ...P.SIT, chest: [4, 0, 0], head: [-16, 0, 0] };
  const tgtR = jp(h, 'rShoulder', [0, 0.12, -0.04]), tgtL = jp(fA, 'lShoulder', [0, 0.12, -0.04]);
  let arms = ikHand(v, vBase, vSeat, 'r', tgtR, V3(0, -1, 0));
  Object.assign(arms, ikHand(v, { ...vBase, ...arms }, vSeat, 'l', tgtL, V3(0, -1, 0)));
  const vPose = { ...vBase, ...arms };
  const bPose = { ...F.seatedPose('cross', () => 0.5), chest: [-6, 0, 0], head: [-24, 10, 0] };
  const cPose = { ...P.SIT, lHip: [-80, 0, 10], rHip: [-70, 0, -10], lKnee: [70, 0, 0], rKnee: [60, 0, 0], chest: [-2, 0, 0], head: [-6, 0, 0], rShoulder: [-120, 0, -20], rElbow: [-40, 0, 0] };
  const dPose = { ...F.seatedPose('side', () => 0.5), chest: [-4, 10, 0], head: [-12, 10, 0] };
  const tbl = FL.table;
  cast.food[0].position.set(tbl.x - 0.3, tbl.h, tbl.z - 0.02); cast.food[1].position.set(tbl.x + 0.22, tbl.h, tbl.z + 0.06); cast.food[1].rotation.set(0, 0.3, 0);
  cast.food[3].position.set(tbl.x - 0.02, tbl.h, tbl.z - 0.16); cast.food[2].position.set(tbl.x + 0.75, 0, tbl.z + 0.35);
  K.phonePark(cast.phone, cast.root, [tbl.x + 0.42, tbl.h + 0.006, tbl.z + 0.16], 0.4); cast.phone.rotation.z = Math.PI; cast.phone.userData.bright(0);
  S.stool.position.set(0.58 - FL.stool[0], 0, 1.5 - FL.stool[1]);
  S.cup.position.set(tbl.x + 0.5, tbl.h, tbl.z - 0.12); S.apple.position.set(tbl.x + 0.05, tbl.h + 0.045, tbl.z + 0.18);
  camSet(camera, [-0.95, 2.05, 5.2], [-1.05, 0.82, 1.5], 50);
  S.L.hemi.color.setRGB(0.7, 0.55, 0.42); S.L.hemi.intensity = 0.3;
  return {
    update: (t, info) => {
      const f = info.frame; const b = (f % 2) ? 1 : 0; const lau = sstep(0.3, 0.6, t) * (1 - 0.6 * sstep(4.0, 4.8, t));
      place(h, boil({ ...hPose, head: [-4 - 6 * b * lau, 30, 0] }, f, 1), hSeat);
      place(fA, boil({ ...aPose, chest: [4 + 4 * b * lau, -10, 0] }, f, 3), aSeat);
      place(v, boil({ ...vPose, chest: [4 + 7 * b * lau, 0, 0], head: [-16 - 10 * b * lau, 0, 0] }, f, 2), vSeat);
      place(fB, boil({ ...bPose, chest: [-6 + 6 * (1 - b) * lau, 0, 0], head: [-24 - 6 * b * lau, 10, 0] }, f, 4), { pos: [tbl.x - 1.05, 0, tbl.z + 0.1], rotY: 62 });
      place(fC, boil(cPose, f, 5), { pos: [0.58, 0, 1.5], rotY: -100, seat: 0.76 });
      const g = jp(fC, 'rWrist', [0, -0.1, 0.05]); cast.glass.position.copy(g).add(V3(0, -0.02, 0));
      place(fD, boil(dPose, f, 6), { pos: [tbl.x + 1.12, 0, tbl.z + 0.45], rotY: 238 });
    },
    look: () => ({ warm: 1.0, focus: camera.position.distanceTo(V3(-1.1, 1.1, 1.1)), fstop: 4, exposure: 0.95, streak: { threshold: 2.5, strength: 0.15, tint: [1.0, 0.6, 0.35] } }),
  };
}));

shots.push(endCardShot({ line: "He'd love our world. He'd never understand why we're alone in it.", dur: 4.5 }));

export default { fps: 12, shots };
