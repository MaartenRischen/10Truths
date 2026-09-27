// Film 03 — THE NIGHT WATCH. Someone checks the locks again at 3 a.m. Then we see the job their body thinks it's doing.
// Match cuts: s05 -> s06 (hand at the brow, head turned: door chain -> scanning the dark from the rock), s10 -> s11 (lying on the
// left side in the warm pile -> alone in bed). Both are built from one pose and one camera expressed relative to the figure.
import * as THREE from 'three';
import * as E from '../../film/engine.js';
import { endCardShot, notificationScreen } from '../../film/text.js';
import * as F from '../../scenes/E/lib/figs.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as FL from './flat.js';
import * as CP from './camp.js';
import * as PO from './poses.js';
import { V, P, keyed, applyKeyed, basisQ, yawQ, shrug } from './anim.js';

const watcher = () => F.figure({ kind: 'beech', seed: 5 });
const persp = (w, h, fov = 40) => new THREE.PerspectiveCamera(fov, w / h, 0.03, 400);
const setCam = (cam, pos, look, fov) => { cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look); if (fov) { cam.fov = fov; } cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); };
const lerpV = (a, b, u) => a.clone().lerp(b, u);
const sm = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const IS_STILL = typeof location !== 'undefined' && new URLSearchParams(location.search).get('quality') === 'still';
const SMP = (n) => (IS_STILL ? 12 : n); // per-shot sample counts apply to the animatic only
const LOOK_MODERN = { samples: SMP(2), grade: 'modern', bloom: { strength: 0.3, radius: 0.7, threshold: 1.1 }, streak: { threshold: 2.6, strength: 0.18, tint: [0.35, 0.6, 1.0] } };
const LOOK_FIRE = { samples: SMP(2), grade: 'fire', bloom: { strength: 0.32, radius: 0.75, threshold: 1.05 }, streak: { threshold: 3.0, strength: 0.15, tint: [1.0, 0.55, 0.3] } };

// ---------------------------------------------------------------- the lying match (s10 -> s11) and the bed camera (s01, s11)
const Q_BED_SIDE = basisQ(V(0, 0, -1), V(1, 0, 0));   // on the left side, facing the nightstand, head on the pillow
const Q_BED_BACK = basisQ(V(0, 0, -1), V(0, 1, 0));   // on the back, face to the ceiling
const BED_SIDE_KEY = { t: 0, pose: PO.LIE_SIDE, q: Q_BED_SIDE, x: -0.4, z: 2.08, ground: 'parts', floorY: FL.BED.topY };
const BED_ANCHOR = V(-0.45, FL.BED.topY, 1.0);
const RQ = yawQ(-90); // bed +x -> camp +z
const SLOT = (() => { const c = FL.CLOCK.clone().sub(BED_ANCHOR).applyQuaternion(RQ); return V(-c.x, CP.HIDE_TOP, -c.z); })(); // clock -> fire (origin)
const toCamp = (p) => p.clone().sub(BED_ANCHOR).applyQuaternion(RQ).add(SLOT);
const BEDCAM = { pos: V(1.52, 1.1, 0.47), look: V(-0.4, 0.72, 0.32), fov: 34 };
function bedSideState(f) { const k = keyed(f, [BED_SIDE_KEY]).keys[0]; return { q: k.q.clone(), p: k.p.clone() }; }
function campSideState(f) { const s = bedSideState(f); return { q: RQ.clone().multiply(s.q), p: toCamp(s.p) }; }

// ---------------------------------------------------------------- the vigil match (s05 -> s06)
const HALL_W = V(-0.12, 0, 0);                 // where the watcher stands at the front door (facing +z)
const ROCK_W = V(CP.ROCK.pos.x, 0, CP.ROCK.pos.z - 0.04);
const MATCH_OFF = { pos: V(-0.5, 0.74, -1.78), look: V(0.04, 0.58, 0.6), fov: 44 }; // camera relative to the pelvis joint
function vigilPose(f, legs, place) {
  // pose the body, then solve the right hand to the brow (visor / on the chain)
  const base = P(PO.VIGIL_UP, legs, { rShoulder: [-120, 0, -30], rElbow: [-110, 0, 0], rWrist: [0, 0, 0] });
  f.setPose(base); f.group.quaternion.identity(); f.group.position.copy(place); f.group.updateMatrixWorld(true);
  const tgt = F.jointPoint(f, 'head', [-0.01, 0.255, 0.2]);
  const r = F.reachIK(f, 'r', tgt, { local: [0, -0.09, 0.0], iters: 600, wrist: true });
  return { pose: P(base, r.pose, { rWrist: [r.pose.rWrist[0], r.pose.rWrist[1] - 60, r.pose.rWrist[2]] }), err: r.err };
}

// ---------------------------------------------------------------- shots
const shots = [];
const T = {}; // shot start times (filled below)

// S01 — 3:07. Clock in focus, the head on the pillow behind, awake, face to the ceiling.
shots.push({ name: 's01-clock', dur: 4.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const B = FL.bedroom(scene, renderer);
  B.ctex['3:07b'] = FL.clockTex('3:07', { colon: false });
  const f = watcher(); scene.add(f.group);
  const pose = P(PO.LIE_BACK);
  const K = keyed(f, [{ t: 0, pose, q: Q_BED_BACK, x: -0.45, z: 2.1, ground: 'parts', floorY: FL.BED.topY },
    { t: 2.3, pose, q: Q_BED_BACK, x: -0.45, z: 2.1, ground: 'parts', floorY: FL.BED.topY },
    { t: 2.9, pose: P(pose, { head: [-4, 14, 0] }), q: Q_BED_BACK, x: -0.45, z: 2.1, ground: 'parts', floorY: FL.BED.topY }]);
  const cam = persp(w, h); setCam(cam, BEDCAM.pos, BEDCAM.look, BEDCAM.fov);
  return {
    scene, camera: cam,
    update: (t, info) => {
      applyKeyed(f, K, t, info.frame, { boil: 0.25, reground: false, extra: (p) => { p.chest = [p.chest[0] + Math.sin(t * 1.5) * 1.2, p.chest[1], p.chest[2]]; return p; } });
      const on = (t % 1) < 0.5; B.cMat.map = on ? B.ctex['3:07'] : B.ctex['3:07b']; B.cMat.needsUpdate = true;
    },
    look: () => ({ ...LOOK_MODERN, focus: cam.position.distanceTo(FL.CLOCK) + 0.02, fstop: 1.6, samples: SMP(4) }),
  };
} });

// hallway builder shared by s02 / s05; returns the door rig and the watcher with IK'd arm poses
function hallSet(scene, renderer) {
  const f = watcher(); scene.add(f.group);
  const vig = vigilPose(f, PO.LEGS_STAND, HALL_W);
  F.groundFig(f, 0);
  const palm = F.jointPoint(f, 'rWrist', [0, -0.09, 0.0]);
  const doorZ = palm.z + 0.035 - 0.005;
  const H = FL.hallway(scene, renderer, { doorZ, chainY: palm.y, chainX: palm.x });
  // arm poses for handle / bolt (standing close, head down a little)
  const body = P(PO.STAND, { chest: [6, 0, 0], head: [16, -8, 0], lHip: [1, 0, 3], rHip: [-3, 0, -3] });
  const armTo = (target, extra = {}) => { f.setPose(P(body, extra)); f.group.position.copy(HALL_W); f.group.quaternion.identity(); F.groundFig(f, 0); const r = F.reachIK(f, 'r', target, { local: [0, -0.09, 0.02], iters: 500 }); return P(body, extra, r.pose); };
  const HANDLE = armTo(H.handle.clone().add(V(0.02, 0.0, -0.02)));
  const HANDLE_DN = armTo(H.handle.clone().add(V(0.03, -0.04, -0.02)));
  const BOLT = armTo(H.bolt.clone().add(V(0, 0.0, -0.025)), { head: [12, -14, 0] });
  const BOLT_T = P(BOLT, { rWrist: [0, 70, 0] });
  const CHAIN = armTo(H.chainKnob.clone().add(V(0.0, -0.01, -0.02)), { head: [-2, -10, 0], chest: [4, 0, 0] });
  return { f, H, vig: vig.pose, HANDLE, HANDLE_DN, BOLT, BOLT_T, CHAIN, body };
}
function hallCam(f, place) {
  // the match camera: relative to the pelvis joint of the final vigil pose
  const pel = F.jointPoint(f, 'pelvis');
  return { pos: pel.clone().add(MATCH_OFF.pos), look: pel.clone().add(MATCH_OFF.look), fov: MATCH_OFF.fov };
}

// S02 — the hallway: walks to the door, pulls the handle, touches the chain, turns the deadbolt back and forth.
shots.push({ name: 's02-door', dur: 5.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const S = hallSet(scene, renderer);
  const { f, H } = S;
  // camera from the vigil pose
  f.setPose(S.vig); f.group.position.copy(HALL_W); F.groundFig(f, 0);
  const C0 = hallCam(f);
  const W0 = HALL_W.clone().add(V(0.3, 0, -1.25));
  const g = { ground: 'feet', floorY: 0 };
  const K = keyed(f, [
    { t: 0.0, pose: PO.STAND, x: W0.x, z: W0.z, ...g, walk: { stride: 1.15, A: 18, arm: 12 } },
    { t: 1.55, pose: S.body, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 1.75, pose: S.body, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 2.1, pose: S.HANDLE, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 2.3, pose: S.HANDLE_DN, x: HALL_W.x, z: HALL_W.z, ...g, ease: 'out' },
    { t: 2.6, pose: S.HANDLE_DN, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 2.75, pose: S.HANDLE, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 3.15, pose: S.CHAIN, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 3.45, pose: S.CHAIN, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 3.8, pose: S.BOLT, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 3.95, pose: S.BOLT_T, x: HALL_W.x, z: HALL_W.z, ...g, ease: 'out' },
    { t: 4.3, pose: S.BOLT_T, x: HALL_W.x, z: HALL_W.z, ...g },
    { t: 4.45, pose: S.BOLT, x: HALL_W.x, z: HALL_W.z, ...g, ease: 'out' },
    { t: 5.0, pose: P(S.BOLT, { head: [22, -12, 0] }), x: HALL_W.x, z: HALL_W.z, ...g },
  ]);
  const cam = persp(w, h); setCam(cam, C0.pos, C0.look, C0.fov);
  return {
    scene, camera: cam,
    update: (t, info) => {
      applyKeyed(f, K, t, info.frame, { boil: 0.3 });
      H.lever.rotation.z = -0.55 * (sm(2.1, 2.3, t) - sm(2.6, 2.75, t));
      H.door.position.z = H.doorZ + 0.03 + (t > 2.3 && t < 2.6 ? 0.004 * Math.sin(t * 90) : 0);
      H.thumb.rotation.z = (Math.PI / 2) * (sm(3.8, 3.95, t) - sm(4.3, 4.45, t));
      H.chain.rotation.x = 0.25 * Math.sin((t - 3.2) * 9) * Math.exp(-Math.max(0, t - 3.2) * 2.5) * (t > 3.2 ? 1 : 0);
    },
    look: () => ({ ...LOOK_MODERN, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.2 }),
  };
} });

// S03 — the window: a hand parts two slats; looks down at the empty street. Sodium stripes across the wood.
shots.push({ name: 's03-blinds', dur: 4.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const B = FL.bedroom(scene, renderer);
  const f = watcher(); scene.add(f.group);
  const W = V(-1.84, 0, FL.WIN.z + 0.12);
  const q = yawQ(-90); // facing -x (the window)
  // slats: find the two nearest the eye line
  const slats = B.slats.children; const L = B.room.userData.windowLocalGroup;
  let iA = 0; { let best = 1e9; slats.forEach((s, i) => { const d = Math.abs(s.position.y - 1.66); if (d < best) { best = d; iA = i; } }); }
  const sA = slats[iA + 1], sB = slats[iA];
  const gap = V(L.position.x, 0, 0); // world gap point: on the window plane
  const gapW = new THREE.Vector3(); sA.getWorldPosition(gapW); const gapB = new THREE.Vector3(); sB.getWorldPosition(gapB); gapW.add(gapB).multiplyScalar(0.5);
  const body = P(PO.STAND, { chest: [8, 0, 0], head: [6, -6, 0], lHip: [2, 0, 4], rHip: [-6, 0, -3], rKnee: [8, 0, 0] });
  const look = P(body, { chest: [12, 0, 0], head: [24, -4, 0] });
  const place = (pose) => { f.setPose(pose); f.group.quaternion.copy(q); f.group.position.copy(W); F.groundFig(f, 0); };
  place(body); const r0 = F.reachIK(f, 'r', gapW.clone().add(V(0.09, 0.0, -0.03)), { local: [0, -0.1, 0.02], iters: 500 });
  const REACH = P(body, r0.pose);
  place(look); const r1 = F.reachIK(f, 'r', gapW.clone().add(V(0.08, 0.02, -0.03)), { local: [0, -0.1, 0.02], iters: 500 });
  const PART = P(look, r1.pose);
  const g = { q, x: W.x, z: W.z, ground: 'feet', floorY: 0 };
  const K = keyed(f, [
    { t: 0, pose: body, ...g }, { t: 0.2, pose: body, ...g }, { t: 0.8, pose: REACH, ...g }, { t: 1.3, pose: P(REACH, { head: [14, -4, 0] }), ...g },
    { t: 1.9, pose: PART, ...g }, { t: 2.9, pose: P(PART, { head: [28, -8, 0] }), ...g }, { t: 3.5, pose: P(PART, { head: [26, 6, 0] }), ...g }, { t: 4.0, pose: P(PART, { head: [27, 4, 0] }), ...g },
  ]);
  const cam = persp(w, h);
  const CP0 = V(-1.9, 1.52, FL.WIN.z - 1.25), LK = V(-2.04, 1.63, FL.WIN.z + 0.12);
  setCam(cam, CP0, LK, 38);
  return {
    scene, camera: cam,
    update: (t, info) => {
      applyKeyed(f, K, t, info.frame, { boil: 0.3 });
      const o = sm(0.8, 1.3, t);
      sA.position.y = sA.userData.base.y + 0.03 * o; sA.rotation.x = sA.userData.base.rx - 0.5 * o;
      sB.position.y = sB.userData.base.y - 0.03 * o; sB.rotation.x = sB.userData.base.rx + 0.5 * o;
      setCam(cam, CP0.clone().add(V(0.0, 0, 0.05 * t / 4)), LK, 36);
    },
    look: () => ({ ...LOOK_MODERN, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.0 }),
  };
} });

// S04 — edge of the bed, phone glow on the chest; scrolling news (red/orange flashes). Shoulders up.
shots.push({ name: 's04-news', dur: 4.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const B = FL.bedroom(scene, renderer);
  B.phone.visible = false;
  const f = watcher(); scene.add(f.group);
  const q = yawQ(90);
  const K = keyed(f, [{ t: 0, pose: PO.SIT_PHONE, q, x: 0.26, z: 1.3, ground: 'seat', seatY: FL.BED.topY }]);
  const news = FL.newsTex(4); news.repeat.set(1, 0.27); news.wrapT = THREE.RepeatWrapping; news.offset.y = 0.73;
  const ph = PR.phone({ screenTex: news, emissive: 1.6, on: true }); scene.add(ph);
  const ra = new THREE.RectAreaLight(new THREE.Color(0.8, 0.85, 1.0), 60, 0.09, 0.17); scene.add(ra);
  const flicks = [0.35, 1.05, 1.7, 2.45, 3.2];
  const scrollAt = (t) => { let o = 0; for (const s of flicks) o += 0.075 * sm(s, s + 0.25, t); return 0.73 - o; };
  const cam = persp(w, h); setCam(cam, V(2.15, 1.05, 2.72), V(0.32, 0.98, 1.25), 40);
  return {
    scene, camera: cam,
    update: (t, info) => {
      const flickNow = flicks.some((s) => t > s - 0.12 && t < s + 0.1);
      applyKeyed(f, K, t, info.frame, { boil: 0.3, reground: false, extra: (p) => { if (flickNow) p.rWrist = [p.rWrist?.[0] ?? 0, 0, (p.rWrist?.[2] ?? 0) - 12]; p.head = [p.head[0] + Math.sin(t * 2.1) * 1.5, p.head[1], p.head[2]]; return p; } });
      F.seatFig(f, FL.BED.topY);
      shrug(f, 1.0); f.group.updateMatrixWorld(true);
      const hl = F.jointPoint(f, 'lWrist', [0, -0.1, 0.03]), hr = F.jointPoint(f, 'rWrist', [0, -0.1, 0.03]);
      const hc = hl.add(hr).multiplyScalar(0.5); const head = F.jointPoint(f, 'head', [0, 0.15, 0.05]);
      const nrm = head.clone().sub(hc).normalize();
      PR.orient(ph, hc.clone().add(nrm.clone().multiplyScalar(0.015)), nrm, V(0, 1, 0)); ph.updateMatrixWorld(true);
      ra.position.copy(ph.position).addScaledVector(nrm, 0.012); ra.lookAt(ph.position.clone().add(nrm));
      news.offset.y = scrollAt(t);
      // colour of the light follows what is on screen (red / orange blocks)
      const yTex = (1 - news.offset.y - 0.135) * news.userData.H; let col = [0.75, 0.82, 1.0];
      for (const [y0, y1, c] of news.userData.blocks) if (yTex > y0 - 120 && yTex < y1 + 60) col = c;
      ra.color.setRGB(...col); ra.intensity = 55 + (col[0] > 0.9 ? 30 : 0);
    },
    look: () => ({ ...LOOK_MODERN, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.0 }),
  };
} });

// S05 — the hallway again (same framing as s02): checks the lock again; the hand rises to the chain, the head turns: MATCH.
shots.push({ name: 's05-again', dur: 3.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const S = hallSet(scene, renderer);
  const { f, H } = S;
  f.setPose(S.vig); f.group.position.copy(HALL_W); F.groundFig(f, 0);
  const C0 = hallCam(f);
  const g = { x: HALL_W.x, z: HALL_W.z, ground: 'feet', floorY: 0 };
  const K = keyed(f, [
    { t: 0, pose: S.BOLT, ...g }, { t: 0.35, pose: S.BOLT, ...g }, { t: 0.5, pose: S.BOLT_T, ...g, ease: 'out' }, { t: 0.95, pose: S.BOLT_T, ...g },
    { t: 1.45, pose: P(S.vig, { head: [0, -8, 0] }), ...g }, { t: 1.9, pose: S.vig, ...g }, { t: 3.0, pose: S.vig, ...g },
  ]);
  const cam = persp(w, h); setCam(cam, C0.pos, C0.look, C0.fov);
  return {
    scene, camera: cam,
    update: (t, info) => {
      applyKeyed(f, K, t, info.frame, { boil: t > 2.6 ? 0 : 0.3 });
      H.thumb.rotation.z = (Math.PI / 2) * (1 - sm(0.35, 0.5, t));
      H.chain.rotation.x = 0.2 * Math.sin((t - 1.4) * 9) * Math.exp(-Math.max(0, t - 1.4) * 2.5) * (t > 1.4 ? 1 : 0);
    },
    look: () => ({ ...LOOK_MODERN, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.2 }),
  };
} });

// camp builder shared by s06..s10: sleepers in the pile (reliever at the front slot), the watcher on the rock
const SLEEPERS = [
  // kind, seed, pose index, offset from the slot (camp x,z), yaw flip (true = head toward -x), scale
  ['oak', 13, 0, [0.16, -0.36], false, 1],
  ['ash', 17, 3, [0.25, -0.86], false, 0.6],
  ['maple', 19, 2, [0.05, -1.25], true, 1],
  ['oak', 29, 3, [1.72, -0.18], false, 1],
  ['ash', 31, 1, [1.62, -0.78], true, 1],
];
function campSet(scene, renderer, opts = {}) {
  const C = CP.camp(scene, renderer, opts);
  const w = watcher(); scene.add(w.group);
  const rel = F.figure({ kind: 'maple', seed: 11 }); scene.add(rel.group);
  const relLie = campSideState(rel);
  rel.setPose(PO.LIE_SIDE); rel.group.quaternion.copy(relLie.q); rel.group.position.copy(relLie.p); rel.group.updateMatrixWorld(true);
  const sleepers = SLEEPERS.map(([kind, seed, pi, off, flip, sc]) => {
    const s = F.figure({ kind, seed, scale: sc }); scene.add(s.group);
    const st = campSideState(s);
    let q = st.q.clone(); let p = st.p.clone().add(V(off[0], 0, off[1]));
    if (flip) { q = yawQ(180).multiply(q); p.x += 1.6; }
    s.setPose(PO.SLEEP[pi]); s.group.quaternion.copy(q); s.group.position.copy(p); s.group.updateMatrixWorld(true);
    F.groundParts(s, ['pelvis', 'chest'], CP.HIDE_TOP - 0.01);
    return { f: s, pose: PO.SLEEP[pi], q, p: s.group.position.clone(), ph: seed * 0.37 };
  });
  const breathe = (t, frame, still = false) => {
    for (const s of sleepers) {
      const b = Math.sin(t * 1.3 + s.ph) * 1.6; const pose = { ...s.pose, chest: [s.pose.chest[0] + b, s.pose.chest[1], s.pose.chest[2]] };
      s.f.setPose(still ? s.pose : E.boil(pose, frame, 0.12, s.ph * 10)); s.f.group.updateMatrixWorld(true);
    }
  };
  return { C, w, rel, relLie, sleepers, breathe };
}
function rockVigil(f) {
  const v = vigilPose(f, PO.LEGS_SIT, ROCK_W);
  f.setPose(v.pose); f.group.position.copy(ROCK_W); F.seatFig(f, CP.ROCK.top);
  return v.pose;
}

// S06 — MATCH: the same pose on a rock at the camp edge, scanning the dark grass. Firelight from behind, stars.
shots.push({ name: 's06-rock', dur: 4.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const S = campSet(scene, renderer, { shadows: true });
  const f = S.w;
  for (const o of [S.rel, ...S.sleepers.map((x) => x.f)]) o.group.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  const VIG = rockVigil(f);
  const pel = F.jointPoint(f, 'pelvis');
  const cam = persp(w, h); setCam(cam, pel.clone().add(MATCH_OFF.pos), pel.clone().add(MATCH_OFF.look), MATCH_OFF.fov);
  const RESTP = P(PO.SIT_WATCH, { chest: [5, -4, 0], head: [-2, -10, 0] });
  const g = { x: ROCK_W.x, z: ROCK_W.z, ground: 'seat', seatY: CP.ROCK.top };
  const K = keyed(f, [
    { t: 0, pose: VIG, ...g }, { t: 1.0, pose: VIG, ...g },
    { t: 2.4, pose: P(VIG, { head: [-10, -8, 2], chest: [5, -3, 0] }), ...g }, { t: 3.0, pose: P(VIG, { head: [-9, -12, 2], chest: [5, -4, 0] }), ...g },
    { t: 3.8, pose: RESTP, ...g }, { t: 4.0, pose: RESTP, ...g },
  ]);
  return {
    scene, camera: cam,
    update: (t, info) => { applyKeyed(f, K, t, info.frame, { boil: t < 0.3 ? 0 : 0.3, reground: false }); F.seatFig(f, CP.ROCK.top); S.C.flick(info.frame); S.breathe(t, info.frame); },
    look: () => ({ ...LOOK_FIRE, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.2 }),
  };
} });

// S07 — reverse, wide: past the watcher's shoulder, the band asleep in a pile by the embers, a child in the middle.
shots.push({ name: 's07-band', dur: 5.5, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const S = campSet(scene, renderer, { shadows: true });
  const f = S.w;
  const base = P(PO.SIT_WATCH, { chest: [5, 0, 0] });
  const g = { x: ROCK_W.x, z: ROCK_W.z, ground: 'seat', seatY: CP.ROCK.top };
  const K = keyed(f, [{ t: 0, pose: P(base, { head: [-2, -14, 0] }), ...g }, { t: 1.5, pose: P(base, { head: [-2, -14, 0] }), ...g }, { t: 3.2, pose: P(base, { head: [-4, 18, 0] }), ...g }, { t: 5.5, pose: P(base, { head: [-4, 22, 0] }), ...g }]);
  const cam = persp(w, h);
  const A = V(1.08, 1.5, 4.36), Bp = V(0.82, 1.5, 4.4), LK = V(-0.6, 0.5, -0.45);
  return {
    scene, camera: cam,
    update: (t, info) => { applyKeyed(f, K, t, info.frame, { boil: 0.3, reground: false }); F.seatFig(f, CP.ROCK.top); S.C.flick(info.frame); S.breathe(t, info.frame); setCam(cam, lerpV(A, Bp, t / 5.5), LK, 42); },
    look: () => ({ ...LOOK_FIRE, focus: cam.position.distanceTo(V(-0.2, 0.3, -1.3)), fstop: 2.4 }),
  };
} });

// S08 — close on the watcher: a rustle in the grass, the head snaps toward it. Hold. Nothing. Shoulders come down a little.
shots.push({ name: 's08-rustle', dur: 5.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const S = campSet(scene, renderer, { shadows: true });
  const f = S.w;
  for (const o of [S.rel, ...S.sleepers.map((x) => x.f)]) o.group.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  // a clump of tall grass in the foreground that shakes
  const clump = new THREE.Group(); clump.position.set(2.6, 0, 5.0); scene.add(clump);
  const blades = []; const gm = new THREE.MeshStandardMaterial({ color: 0x8a7446, roughness: 0.8, side: THREE.DoubleSide });
  const rng = E.hash; for (let i = 0; i < 60; i++) { const bl = new THREE.Group(); bl.position.set((rng(i * 3.1) - 0.5) * 0.35, 0, (rng(i * 7.7) - 0.5) * 0.3); bl.rotation.y = rng(i) * 6.28; const hh = 0.8 + rng(i * 1.3) * 0.6; const m = PR.mesh(new THREE.PlaneGeometry(0.02, hh, 1, 3).translate(0, hh / 2, 0), gm); m.rotation.x = (rng(i * 2.2) - 0.5) * 0.4; bl.add(m); clump.add(bl); blades.push(bl); }
  const base = P(PO.SIT_WATCH, { chest: [4, 0, 0] });
  const g = { x: ROCK_W.x, z: ROCK_W.z, ground: 'seat', seatY: CP.ROCK.top };
  const K = keyed(f, [
    { t: 0, pose: P(base, { head: [-4, -16, 0] }), ...g }, { t: 1.1, pose: P(base, { head: [-4, -8, 0] }), ...g },
    { t: 1.25, pose: P(base, { head: [12, 66, 4], chest: [0, 24, 0], lShoulder: [-40, 0, 14], rShoulder: [-36, 0, -6] }), ...g, ease: 'out' },
    { t: 2.9, pose: P(base, { head: [13, 68, 4], chest: [0, 24, 0], lShoulder: [-40, 0, 14], rShoulder: [-36, 0, -6] }), ...g },
    { t: 3.7, pose: P(base, { head: [6, 20, 2], chest: [7, 4, 0] }), ...g }, { t: 5.0, pose: P(base, { head: [0, 4, 0], chest: [7, 0, 0] }), ...g },
  ]);
  const cam = persp(w, h); const CP0 = V(-0.05, 1.6, 2.2), LK = V(1.64, 1.08, 4.62);
  return {
    scene, camera: cam,
    update: (t, info) => {
      applyKeyed(f, K, t, info.frame, { boil: (t > 1.3 && t < 2.9) ? 0.08 : 0.3, reground: false }); F.seatFig(f, CP.ROCK.top);
      shrug(f, sm(1.1, 1.3, t) * 0.9 - sm(3.0, 3.8, t) * 0.55 + 0.2); f.group.updateMatrixWorld(true);
      const sh = (t > 0.95 && t < 2.2) ? Math.sin((t - 0.95) * 26) * 0.45 * Math.exp(-(t - 0.95) * 2.0) : 0;
      blades.forEach((b, i) => { b.rotation.z = sh * (0.6 + 0.4 * Math.sin(i)); b.rotation.x = sh * 0.5 * Math.cos(i * 1.7); });
      S.C.flick(info.frame); S.breathe(t, info.frame); setCam(cam, CP0, LK, 44);
    },
    look: () => ({ ...LOOK_FIRE, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.4, samples: SMP(3) }),
  };
} });

// S09 — wide, pre-dawn blue: the reliever gets up, walks over, touches the watcher's shoulder; the watcher stands; the reliever sits.
shots.push({ name: 's09-relief', dur: 7.5, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const S = campSet(scene, renderer, { shadows: true });
  const f = S.w, r = S.rel;
  const seat = { ground: 'seat', seatY: CP.ROCK.top };
  const TIRED = P(PO.SIT_TIRED);
  // reliever path: slot -> around the fire's left -> behind-left of the watcher
  const lie = S.relLie; const slotP = lie.p.clone();
  const sitG = V(-0.62, 0, -0.78), stand = V(-0.5, 0, -0.5), mid = V(0.98, 0, 1.12), behind = V(1.02, 0, 2.86);
  const fz = yawQ(0), fl = yawQ(-42);
  // touch pose: right hand on the watcher's left shoulder
  f.setPose(TIRED); f.group.position.copy(ROCK_W); f.group.quaternion.identity(); F.seatFig(f, CP.ROCK.top);
  const shoulder = F.jointPoint(f, 'lShoulder', [0.02, 0.1, -0.02]);
  r.setPose(P(PO.STAND, { chest: [10, 0, 0], head: [16, 0, 0] })); r.group.quaternion.copy(fl); r.group.position.copy(behind); F.groundFig(r, 0);
  const ik = F.reachIK(r, 'r', shoulder, { local: [0, -0.1, 0.02], iters: 500 });
  const TOUCH = P(PO.STAND, { chest: [10, 0, 0], head: [16, 0, 0] }, ik.pose);
  const gF = { ground: 'feet', floorY: 0 };
  const RK = keyed(r, [
    { t: 0, pose: PO.LIE_SIDE, q: lie.q, x: slotP.x, y: slotP.y, z: slotP.z, ground: 'none' },
    { t: 0.3, pose: PO.LIE_SIDE, q: lie.q, x: slotP.x, y: slotP.y, z: slotP.z, ground: 'none' },
    { t: 1.0, pose: PO.SIT_GROUND, q: fz, x: sitG.x, z: sitG.z, ground: 'feet', floorY: CP.HIDE_TOP },
    { t: 1.5, pose: PO.CROUCH, q: yawQ(30), x: stand.x, z: stand.z, ground: 'feet', floorY: 0 },
    { t: 2.0, pose: PO.STAND_TIRED, q: yawQ(40), x: stand.x, z: stand.z, ...gF, walk: { stride: 1.2, A: 18, arm: 12 } },
    { t: 3.5, pose: PO.STAND, q: yawQ(10), x: mid.x, z: mid.z, ...gF, walk: { stride: 1.2, A: 18, arm: 12, phase0: 0.5 } },
    { t: 4.9, pose: PO.STAND, q: fl, x: behind.x, z: behind.z, ...gF },
    { t: 5.3, pose: TOUCH, q: fl, x: behind.x, z: behind.z, ...gF },
    { t: 6.1, pose: TOUCH, q: fl, x: behind.x, z: behind.z, ...gF },
    { t: 6.5, pose: PO.STAND, q: yawQ(-20), x: behind.x - 0.12, z: behind.z + 0.2, ...gF },
    { t: 7.3, pose: PO.SIT_WATCH, q: fz, x: ROCK_W.x, z: ROCK_W.z, ...seat },
    { t: 7.5, pose: PO.SIT_WATCH, q: fz, x: ROCK_W.x, z: ROCK_W.z, ...seat },
  ]);
  const stepOff = V(0.02, 0, 2.72);
  const WK = keyed(f, [
    { t: 0, pose: TIRED, x: ROCK_W.x, z: ROCK_W.z, ...seat }, { t: 5.3, pose: TIRED, x: ROCK_W.x, z: ROCK_W.z, ...seat },
    { t: 5.7, pose: P(TIRED, { head: [-6, 55, 0], chest: [10, 16, 0] }), x: ROCK_W.x, z: ROCK_W.z, ...seat },
    { t: 6.0, pose: P(TIRED, { head: [-6, 58, 0], chest: [10, 16, 0] }), x: ROCK_W.x, z: ROCK_W.z, ...seat },
    { t: 6.6, pose: P(PO.STAND_TIRED, { head: [8, -20, 0] }), q: yawQ(150), x: stepOff.x, z: stepOff.z, ...gF },
    { t: 7.5, pose: P(PO.STAND_TIRED, { head: [18, -10, 0] }), q: yawQ(170), x: stepOff.x - 0.05, z: stepOff.z - 0.08, ...gF },
  ]);
  const cam = persp(w, h); const CP0 = V(2.35, 2.2, 8.3), LK = V(-0.1, 0.62, 0.8);
  return {
    scene, camera: cam,
    update: (t, info) => {
      const d = sm(0, 7.5, t); S.C.setDawn(0.25 + 0.75 * d); S.C.flick(info.frame, 1 - 0.4 * d);
      applyKeyed(r, RK, t, info.frame, { boil: 0.3 });
      applyKeyed(f, WK, t, info.frame, { boil: 0.3, reground: false });
      if (t < 5.7) F.seatFig(f, CP.ROCK.top); else if (t > 6.6) F.groundFig(f, 0);
      S.breathe(t, info.frame); setCam(cam, CP0.clone().add(V(-0.12 * d, 0, 0)), LK, 40);
    },
    look: () => ({ ...LOOK_FIRE, focus: cam.position.distanceTo(V(0.3, 1.0, 3.0)), fstop: 4.0 }),
  };
} });

// S10 — low, close to the pile: the watcher lies down in the warm gap; an arm drapes over it; it goes completely still. MATCH out.
shots.push({ name: 's10-pile', dur: 6.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const S = campSet(scene, renderer, { shadows: true, dawn: 1, embers: true });
  S.C.setDawn(1);
  S.rel.group.visible = false; // the reliever is at the rock now
  const f = S.w;
  const fin = campSideState(f); // exact twin of the bed pose
  S.sleepers.forEach((sl, i) => { if (i >= 2) sl.f.group.visible = false; }); // keep this close frame clean: the one behind + the child
  const lk = { q: fin.q, x: fin.p.x, y: fin.p.y, z: fin.p.z, ground: 'none' };
  const PROPU = P(PO.LIE_SIDE, { chest: [10, 0, -26], head: [16, 0, -22], lShoulder: [-40, 0, 38], lElbow: [-84, 0, 0], rShoulder: [-30, 0, 4], rElbow: [-30, 0, 0] });
  const WK = keyed(f, [
    { t: 0, pose: PROPU, ...lk }, { t: 0.4, pose: PROPU, ...lk },
    { t: 1.4, pose: P(PO.LIE_SIDE, { head: [12, 0, -10] }), ...lk },
    { t: 1.9, pose: PO.LIE_SIDE, ...lk }, { t: 6.0, pose: PO.LIE_SIDE, ...lk },
  ]);
  // the sleeper behind drapes its right arm over the watcher's waist
  const s1 = S.sleepers[0];
  applyKeyed(f, WK, 6.0, 0, { boil: 0, reground: false });
  const waist = F.jointPoint(f, 'rShoulder', [0.0, -0.1, 0.08]).add(V(0, 0.09, 0));
  console.log('[scene] drape target', waist.toArray().map((v) => v.toFixed(2)).join(','));
  s1.f.setPose(s1.pose); s1.f.group.updateMatrixWorld(true);
  const ik = F.reachIK(s1.f, 'r', waist, { local: [0, -0.1, 0.02], iters: 800 }); console.log('[scene] drape err', ik.err.toFixed(3));
  const DRAPE = P(s1.pose, ik.pose);
  const camPos = toCamp(BEDCAM.pos), camLook = toCamp(BEDCAM.look);
  const cam = persp(w, h);
  return {
    scene, camera: cam,
    update: (t, info) => {
      S.C.flick(info.frame, 0.5);
      const still = t > 3.9;
      applyKeyed(f, WK, t, info.frame, { boil: still ? 0 : 0.25, reground: false });
      S.breathe(t, info.frame, still);
      const u = sm(1.8, 2.7, t);
      s1.f.setPose(still ? DRAPE : E.boil(E.slerpPose(s1.pose, DRAPE, u), info.frame, 0.12, 3)); s1.f.group.updateMatrixWorld(true);
      const k = 1 - sm(1.2, 3.5, t); // crane down from above the pile into the exact match framing
      setCam(cam, camPos.clone().add(V(-0.1 * k, 0.95 * k, 0.2 * k)), camLook.clone().add(V(0.05 * k, -0.15 * k, -0.1 * k)), BEDCAM.fov);
    },
    look: () => ({ ...LOOK_FIRE, grade: 'fire', exposure: 0.8, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.0 }),
  };
} });

// S11 — MATCH: alone in the bed, same framing. Clock 3:09. Nobody is coming to take over.
shots.push({ name: 's11-bed', dur: 4.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const B = FL.bedroom(scene, renderer); B.setClock('3:09');
  const f = watcher(); scene.add(f.group);
  const st = bedSideState(f);
  const K = keyed(f, [{ t: 0, pose: PO.LIE_SIDE, q: st.q, x: st.p.x, y: st.p.y, z: st.p.z, ground: 'none' }]);
  const cam = persp(w, h); setCam(cam, BEDCAM.pos, BEDCAM.look, BEDCAM.fov);
  applyKeyed(f, K, 0, 0, { boil: 0, reground: false }); const hd = cam.position.distanceTo(F.jointPoint(f, 'head')), dC = cam.position.distanceTo(FL.CLOCK) + 0.02;
  return {
    scene, camera: cam,
    update: (t, info) => { applyKeyed(f, K, t, info.frame, { boil: t < 0.5 ? 0 : 0.12, reground: false }); },
    look: (t) => { const u = sm(1.4, 2.3, t); return { ...LOOK_MODERN, focus: hd + (dC - hd) * u, fstop: 1.8, samples: SMP(3) }; },
  };
} });

// bedroom + watcher rig for s12 / s14 (medium: across the bed to the door on the window wall; the phone on the sheet, lower right)
const MEDCAM = { pos: V(1.9, 1.36, 0.2), look: V(-1.93, 0.92, 2.15), fov: 50 };
const EDGE = V(-1.2, 0, 1.28);
const SIT_BED = { lHip: [-84, 0, 8], rHip: [-78, 0, -8], lKnee: [40, 0, 0], rKnee: [62, 0, 0], chest: [18, 0, 0], head: [14, 0, 0], lShoulder: [-24, 0, 14], rShoulder: [-24, 0, -14], lElbow: [-24, 0, 0], rElbow: [-24, 0, 0] };
const SIT_TUCK = { lHip: [-104, 0, 8], rHip: [-100, 0, -8], lKnee: [118, 0, 0], rKnee: [112, 0, 0], chest: [16, 0, 0], head: [10, 0, 0], lShoulder: [-20, 0, 24], rShoulder: [-30, 0, -14], lElbow: [-20, 0, 0], rElbow: [-30, 0, 0] };
const TURNED = P(PO.SIT_EDGE, { chest: [8, -26, 0], head: [8, -68, 0], rShoulder: [-10, 0, -12], lShoulder: [-14, 0, 10] });
// S12 — sits up, gets out of bed toward the door again — PING. The phone lights up on the sheet.
shots.push({ name: 's12-ping', dur: 6.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const B = FL.bedroom(scene, renderer);
  const f = watcher(); scene.add(f.group);
  const st = bedSideState(f);
  const note = notificationScreen({ time: '3:09', sender: 'MIRA · 2B', text: "Up with the baby again. I'm awake if you need anything." });
  const scr = FL.phoneScreen(scene, B.phone, { intensity: 0 });
  const lieK = { pose: PO.LIE_SIDE, q: st.q, x: st.p.x, y: st.p.y, z: st.p.z, ground: 'none' };
  const edge = (yaw, dx = 0, dz = 0) => ({ q: yawQ(yaw), x: EDGE.x + dx, z: EDGE.z + dz, ground: 'seat', seatY: FL.BED.topY });
  const RISE = P(PO.SIT_EDGE, { chest: [30, 0, 0], head: [-6, 0, 0], lShoulder: [-26, 0, 16], rShoulder: [-26, 0, -16], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0], lHip: [-80, 0, 7], rHip: [-80, 0, -7], lKnee: [80, 0, 0], rKnee: [84, 0, 0] });
  const K = keyed(f, [
    { t: 0, ...lieK }, { t: 0.5, ...lieK },
    { t: 1.25, pose: SIT_BED, q: yawQ(0), x: -0.47, z: 1.0, ground: 'seat', seatY: FL.BED.topY },
    { t: 1.6, pose: P(SIT_BED, { head: [24, 0, 0], chest: [22, 0, 0] }), q: yawQ(0), x: -0.47, z: 1.0, ground: 'seat', seatY: FL.BED.topY },
    { t: 2.1, pose: SIT_TUCK, ...edge(-55, 0.32, -0.12) },
    { t: 2.5, pose: PO.SIT_EDGE, ...edge(-80) },
    { t: 3.05, pose: RISE, ...edge(-62, -0.04, 0.02), ease: 'in' },
    { t: 3.3, pose: P(RISE, { chest: [34, 0, 0] }), ...edge(-60, -0.06, 0.03) },
    { t: 3.5, pose: P(RISE, { chest: [32, -6, 0], head: [-6, -20, 0] }), ...edge(-62, -0.06, 0.03), ease: 'out' },
    { t: 4.1, pose: TURNED, ...edge(-80) },
    { t: 6.0, pose: P(TURNED, { head: [10, -70, 0] }), ...edge(-80) },
  ]);
  const cam = persp(w, h); setCam(cam, MEDCAM.pos, MEDCAM.look, MEDCAM.fov);
  return {
    scene, camera: cam,
    update: (t, info) => {
      applyKeyed(f, K, t, info.frame, { boil: (t > 3.3 && t < 3.55) ? 0 : 0.3, reground: false });
      if (t >= 1.25) F.seatFig(f, FL.BED.topY);
      shrug(f, 0.6 * sm(3.3, 3.5, t)); f.group.updateMatrixWorld(true);
      const on = t >= 3.3; const fl = on ? 1 + 0.8 * Math.exp(-(t - 3.3) * 3) : 0;
      scr.set(on ? note : null, 1.4 * fl, 14 * fl, [0.78, 0.86, 1.0]);
    },
    look: () => ({ ...LOOK_MODERN, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.6 }),
  };
} });

// S13 — INSERT: the lock screen, readable.
shots.push({ name: 's13-message', dur: 5.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const B = FL.bedroom(scene, renderer);
  const note = notificationScreen({ time: '3:09', sender: 'MIRA · 2B', text: "Up with the baby again. I'm awake if you need anything." });
  const scr = FL.phoneScreen(scene, B.phone, { intensity: 0 });
  scr.set(note, 1.25, 7, [0.78, 0.86, 1.0]);
  B.phone.updateMatrixWorld(true);
  const c = B.phone.position.clone(); const up = V(0, 0, -1).transformDirection(B.phone.matrixWorld);
  const cam = persp(w, h, 36);
  return {
    scene, camera: cam,
    update: (t) => { const d = 0.262 - 0.006 * t / 5; const pos = c.clone().add(V(0, d, 0)).addScaledVector(up, 0.004); cam.up.copy(up); cam.position.copy(pos); cam.lookAt(c.clone().addScaledVector(up, 0.004)); cam.fov = 36; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); },
    look: () => ({ ...LOOK_MODERN, focus: 0.26, fstop: 16, samples: SMP(2), dof: false, bloom: { strength: 0.18, radius: 0.6, threshold: 1.6 }, streak: null }),
  };
} });

// S14 — reads it. The shoulders drop. Lies back down, turns on its side toward the phone, still. Warm light under the door.
shots.push({ name: 's14-rest', dur: 5.5, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const B = FL.bedroom(scene, renderer);
  const f = watcher(); scene.add(f.group);
  const st = bedSideState(f);
  const note = notificationScreen({ time: '3:09', sender: 'MIRA · 2B', text: "Up with the baby again. I'm awake if you need anything." });
  const scr = FL.phoneScreen(scene, B.phone, { intensity: 0 });
  const edge = (yaw, dx = 0, dz = 0) => ({ q: yawQ(yaw), x: EDGE.x + dx, z: EDGE.z + dz, ground: 'seat', seatY: FL.BED.topY });
  const READ = P(TURNED, { head: [12, -70, 0] });
  const DROP = P(TURNED, { chest: [16, -22, 0], head: [20, -62, 0], lShoulder: [-4, 0, 6], rShoulder: [-4, 0, -6], lElbow: [-6, 0, 0], rElbow: [-6, 0, 0] });
  const lieK = { pose: PO.LIE_SIDE, q: st.q, x: st.p.x, y: st.p.y, z: st.p.z, ground: 'none' };
  const backK = { pose: PO.LIE_BACK, q: Q_BED_BACK, x: -0.45, z: 2.1, ground: 'parts', floorY: FL.BED.topY };
  const K = keyed(f, [
    { t: 0, pose: READ, ...edge(-80) }, { t: 1.4, pose: READ, ...edge(-80) }, { t: 2.1, pose: DROP, ...edge(-80) }, { t: 2.4, pose: DROP, ...edge(-80) },
    { t: 2.8, pose: SIT_TUCK, ...edge(-40, 0.34, -0.1) },
    { t: 3.25, pose: P(SIT_BED, { chest: [10, 0, 0], head: [4, 0, 0] }), q: yawQ(0), x: -0.46, z: 1.02, ground: 'seat', seatY: FL.BED.topY },
    { t: 3.8, ...backK },
    { t: 4.3, ...lieK, pose: P(PO.LIE_SIDE, { head: [6, 0, -8] }) }, { t: 4.6, ...lieK }, { t: 5.5, ...lieK },
  ]);
  const cam = persp(w, h); setCam(cam, MEDCAM.pos, MEDCAM.look, MEDCAM.fov);
  return {
    scene, camera: cam,
    update: (t, info) => {
      applyKeyed(f, K, t, info.frame, { boil: t > 4.7 ? 0 : 0.3, reground: false });
      if (t < 2.45 || (t > 2.8 && t < 3.3)) F.seatFig(f, FL.BED.topY);
      shrug(f, 0.6 * (1 - sm(1.4, 2.1, t))); f.group.updateMatrixWorld(true);
      const dim = 1 - 0.7 * sm(4.2, 5.4, t);
      scr.set(note, 1.3 * dim, 12 * dim, [0.78, 0.86, 1.0]);
      B.setStrip(sm(0.6, 4.2, t) * 0.6);
    },
    look: (t) => ({ ...LOOK_MODERN, gradeOverride: { gain: [0.95 + 0.07 * sm(1, 5, t), 1.0, 1.02 - 0.06 * sm(1, 5, t)] }, focus: cam.position.distanceTo(F.jointPoint(f, 'head')), fstop: 2.6 }),
  };
} });

shots.push(endCardShot({ line: 'You were never meant to keep watch alone.', dur: 4.5 }));

{ let acc = 0; for (const s of shots) { T[s.name] = acc; acc += s.dur; } }
export { T };
export default { fps: 12, w: 720, h: 1280, shots };
