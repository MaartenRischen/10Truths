// 02 CARE INSTRUCTIONS — a small beech manikin comes in a box with a care card nobody reads, and slowly stops standing up.
import * as THREE from 'three';
import * as E from '../../film/engine.js';
import { endCardShot, BRAND, canvas2d, texFrom, wrapBalanced } from '../../film/text.js';
import * as F from '../../scenes/E/lib/figs.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as S from './set.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DEG = Math.PI / 180;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const eo = (x) => 1 - (1 - x) * (1 - x);
const lerpV = (a, b, f) => a.clone().lerp(b, f);
const Y = S.DESK_Y;
// per-shot sample budgets apply to the animatic only (board stills keep the still quality)
const ANIM = (new URLSearchParams(location.search).get('quality') || 'animatic') === 'animatic';
const budget = (o) => (ANIM ? o : {});

// ---------------------------------------------------------------- poses (little manikin faces +z at rotY 0)
const L_N = { lShoulder: [2, 0, 6], rShoulder: [2, 0, -6], lElbow: [-6, 0, 0], rElbow: [-6, 0, 0], lHip: [0, 0, 3], rHip: [0, 0, -3], chest: [0, 0, 0], head: [0, 0, 0] };
const L_TRI = { lShoulder: [-160, 0, 28], rShoulder: [-160, 0, -28], lElbow: [-12, 0, 0], rElbow: [-12, 0, 0], chest: [-8, 0, 0], head: [-14, 0, 0], lHip: [0, 0, 6], rHip: [0, 0, -6] };
const L_TRI2 = { ...L_TRI, lShoulder: [-142, 0, 26], rShoulder: [-140, 0, -26], chest: [-3, 0, 0], head: [-5, 0, 0] };
const L_TRI3 = { ...L_TRI, lShoulder: [-118, 0, 24], rShoulder: [-122, 0, -24], lElbow: [-28, 0, 0], rElbow: [-30, 0, 0], chest: [1, 0, 0], head: [2, 0, 0] };
const L_TRI4 = { ...L_TRI, lShoulder: [-92, 0, 20], rShoulder: [-98, 0, -22], lElbow: [-38, 0, 0], rElbow: [-42, 0, 0], chest: [5, 0, 0], head: [8, 0, 0] };
const L_DOWN = { ...L_N, chest: [2, 0, 0], head: [4, 0, 0] };
const L_DOWN2 = { ...L_N, chest: [7, 0, 0], head: [11, 0, 0] };
const L_DOWN3 = { ...L_N, chest: [11, 0, 0], head: [17, 0, 0], lShoulder: [-4, 0, 5], rShoulder: [-4, 0, -5] };
const L_DOWN4 = { ...L_N, chest: [15, 0, 0], head: [23, 0, 0], lShoulder: [-7, 0, 4], rShoulder: [-7, 0, -4], lElbow: [-10, 0, 0], rElbow: [-10, 0, 0] };
const L_HEAD = { pelvis: [4, 0, 0], chest: [24, 0, 0], head: [34, 0, 0], lShoulder: [-9, 6, 2], rShoulder: [-9, -6, -2], lElbow: [-12, 0, 0], rElbow: [-12, 0, 0], lHip: [-5, 0, 3], rHip: [-5, 0, -3], lKnee: [9, 0, 0], rKnee: [9, 0, 0], lAnkle: [-4, 0, 0], rAnkle: [-4, 0, 0] };
const L_HEAD2 = { ...L_HEAD, chest: [30, 0, 0], head: [38, 0, 0], lHip: [-9, 0, 3], rHip: [-9, 0, -3], lKnee: [16, 0, 0], rKnee: [16, 0, 0], lAnkle: [-7, 0, 0], rAnkle: [-7, 0, 0] };
const L_HEAD3 = { ...L_HEAD, pelvis: [8, 0, 0], chest: [36, 0, 0], head: [40, 0, 0], lHip: [-14, 0, 3], rHip: [-14, 0, -3], lKnee: [24, 0, 0], rKnee: [24, 0, 0], lAnkle: [-10, 0, 0], rAnkle: [-10, 0, 0] };
const L_HEAD4 = { ...L_HEAD3, pelvis: [10, 0, 0], chest: [40, 0, 5], head: [42, 0, 9], lHip: [-20, 0, 4], rHip: [-20, 0, -4], lKnee: [34, 0, 0], rKnee: [34, 0, 0], lAnkle: [-14, 0, 0], rAnkle: [-14, 0, 0] };
const L_SIT = { lHip: [-112, 0, 12], rHip: [-108, 0, -10], lKnee: [126, 0, 0], rKnee: [122, 0, 0], lAnkle: [-10, 0, 0], rAnkle: [-10, 0, 0], chest: [36, 0, 0], head: [40, 0, 4], lShoulder: [-46, 0, 14], rShoulder: [-44, 0, -14], lElbow: [-40, -20, 0], rElbow: [-40, 20, 0] };
const L_SIT2 = { ...L_SIT, chest: [42, 0, 3], head: [46, 0, 8], lShoulder: [-40, 0, 12], rShoulder: [-38, 0, -12] };
const L_BOX = { lShoulder: [0, 0, 5], rShoulder: [0, 0, -5], lHip: [0, 0, 2], rHip: [0, 0, -2], head: [6, 0, 0] };
const L_FLEX = { ...L_N, chest: [-4, 0, 0], head: [-8, 0, 0], lShoulder: [-8, 0, 62], lElbow: [-105, 0, 0], rShoulder: [2, 0, -8] };
const L_UP = { ...L_N, chest: [-5, 0, 0], head: [-8, 0, 0], lShoulder: [0, 0, 10], rShoulder: [0, 0, -10] };
const L_SAG = { ...L_N, chest: [58, 0, 6], head: [30, 0, 10], lShoulder: [-30, 0, 2], rShoulder: [-30, 0, -2], lElbow: [-4, 0, 0], rElbow: [-4, 0, 0] };
const L_SAG2 = { ...L_SAG, chest: [66, 0, 10], head: [36, 0, 14] };
const SH_PROUD = { ...L_N, chest: [-10, 0, 0], head: [-10, 0, 0], lShoulder: [0, 0, 18], rShoulder: [0, 0, -18], lElbow: [-8, 0, 0], rElbow: [-8, 0, 0], lHip: [0, 0, 7], rHip: [0, 0, -7] };
const DAYPOSE = [[L_TRI, L_TRI2, L_TRI3, L_TRI4], [L_DOWN, L_DOWN2, L_DOWN3, L_DOWN4], [L_HEAD, L_HEAD2, L_HEAD3, L_HEAD4], [L_SIT, L_SIT, L_SIT2, L_SIT2]];
// human-size worker (faces -z at rotY 180)
const W_SIT = { lHip: [-88, 0, 6], rHip: [-88, 0, -6], lKnee: [84, 0, 0], rKnee: [84, 0, 0], lAnkle: [4, 0, 0], rAnkle: [4, 0, 0], chest: [12, 0, 0], head: [8, 0, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-60, 0, 0], rElbow: [-60, 0, 0] };

// ---------------------------------------------------------------- the locked day-montage camera (shots 3 and 4e)
const CAM3 = { pos: [0.3, 1.05, 0.95], look: [-0.86, 1.0, 0.38], fov: 30 };
function setCam(cam, pos, look, fov, up = [0, 1, 0]) { cam.fov = fov; cam.updateProjectionMatrix(); cam.position.set(...pos); cam.up.set(...up); cam.lookAt(...look); cam.updateMatrixWorld(true); }

// ---------------------------------------------------------------- helpers
function little(kind = 'beech', seed = 5, pose = L_N) { return S.fig({ kind, seed, scale: S.LS, pose }); }
function place(f, pos, pose, rotY = 0, frame = 0, boilAmt = 0.6, floor = null) {
  f.group.position.set(pos.x, 0, pos.z); f.group.rotation.set(0, rotY * DEG, 0);
  E.applyPose(f, frame >= 0 ? E.boil(pose, frame, boilAmt, f.group.id) : pose, { ground: 'feet', floorY: floor ?? pos.y, F });
}
// a human forearm + hand (elbow down) that can be placed freely; the arm continues off-frame
function forearm(side = 'r', kind = 'ash', seed = 11) {
  const f = F.figure({ kind, seed });
  const el = f.joints[side + 'Elbow']; el.parent.remove(el); el.position.set(0, 0, 0); el.rotation.set(0, 0, 0);
  const g = new THREE.Group(); g.add(el);
  g.add(PR.mesh(new THREE.CylinderGeometry(0.047, 0.043, 0.7, 20), F.wood(kind, seed), [0, 0.35, 0]));
  return { group: g, wrist: f.joints[side + 'Wrist'] };
}
const QD = new THREE.Quaternion(), QR = new THREE.Quaternion(), DOWN = V(0, -1, 0);
function placeFore(fp, hand, dir, roll = 0, bend = 0) {
  const d = dir.clone().normalize();
  QD.setFromUnitVectors(DOWN, d); QR.setFromAxisAngle(d, roll);
  fp.group.quaternion.copy(QR).multiply(QD);
  fp.wrist.rotation.set(bend, 0, 0);
  fp.group.position.copy(hand).addScaledVector(d, -0.42);
  fp.group.updateMatrixWorld(true);
}
function coverTex() {
  const [c, g] = canvas2d(300, 225);
  g.fillStyle = '#f1e9d6'; g.fillRect(0, 0, 300, 225);
  g.strokeStyle = '#2a2420'; g.lineWidth = 2; g.strokeRect(12, 12, 276, 201);
  g.fillStyle = '#2a2420'; g.textAlign = 'center'; g.font = `500 22px ${BRAND.mono}`; g.fillText('CARE', 150, 100); g.fillText('INSTRUCTIONS', 150, 132);
  g.fillRect(110, 150, 80, 2);
  return texFrom(c);
}
const CARD_LINES = ['Keep with its people, never alone.', 'Needs daylight, and darkness at night.', 'Hold often.', 'Give it work that others need.', 'Let it walk every day.'];
const CARD_BREAKS = [['Keep with its people,', 'never alone.'], ['Needs daylight,', 'and darkness at night.'], ['Hold often.'], ['Give it work', 'that others need.'], ['Let it walk every day.']];
// variant of text.js printedCard: bigger title, balanced line breaks (no orphans), same stock/ink/border
function careCard(W = 900, H = 1150) {
  const [c, g] = canvas2d(W, H); const ink = '#2a2420';
  g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data; let sd = 7;
  for (let i = 0; i < d.length; i += 4) { sd = (sd * 16807) % 2147483647; const n = (sd / 2147483647 - 0.5) * 8; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = ink; g.lineWidth = W * 0.004; g.strokeRect(W * 0.05, H * 0.04, W * 0.9, H * 0.92);
  g.fillStyle = ink; g.textAlign = 'left';
  g.font = `500 ${Math.round(W * 0.052)}px ${BRAND.mono}`; g.fillText('CARE INSTRUCTIONS', W * 0.1, H * 0.135);
  g.fillRect(W * 0.1, H * 0.16, W * 0.8, H * 0.0025);
  const fs = Math.round(W * 0.066); g.font = `400 ${fs}px ${BRAND.serif}`;
  let y = H * 0.27;
  for (const l of CARD_BREAKS) { for (const ln of l) { g.fillText(ln, W * 0.1, y); y += fs * 1.18; } y += fs * 0.5; }
  return texFrom(c);
}
function goldStar() {
  const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, a = Math.PI / 2 + i * Math.PI / 5; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); } sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false });
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xe0b040, metalness: 1, roughness: 0.25, emissive: new THREE.Color(0.25, 0.17, 0.02) }));
}
function chromeStand() {
  const g = new THREE.Group(); const ch = new THREE.MeshStandardMaterial({ color: 0xe8eaec, metalness: 1, roughness: 0.12 });
  g.add(PR.mesh(new THREE.CylinderGeometry(0.05, 0.054, 0.007, 40), ch, [0, 0.0035, -0.035]));
  g.add(PR.mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.19, 12), ch, [0, 0.1, -0.035]));
  g.add(PR.mesh(new THREE.BoxGeometry(0.005, 0.005, 0.012), ch, [0, 0.19, -0.03]));
  const ringA = new THREE.Group(), ringB = new THREE.Group(); ringA.position.set(0, 0.19, -0.024); ringB.position.set(0, 0.19, -0.024); g.add(ringA, ringB);
  ringA.add(PR.mesh(new THREE.TorusGeometry(0.026, 0.0028, 8, 24, Math.PI), ch, [0.026, 0, 0], [Math.PI / 2, 0, 0]));
  ringB.add(PR.mesh(new THREE.TorusGeometry(0.026, 0.0028, 8, 24, Math.PI), ch, [-0.026, 0, 0], [Math.PI / 2, 0, Math.PI]));
  g.userData = { ringA, ringB, close(f) { ringA.rotation.y = (1 - f) * 1.4; ringB.rotation.y = -(1 - f) * 1.4; } };
  return g;
}
// mirrored walk poses
const WALK_A = { lHip: [-24, 0, 3], lKnee: [8, 0, 0], lAnkle: [6, 0, 0], rHip: [18, 0, -3], rKnee: [24, 0, 0], rAnkle: [-14, 0, 0], lShoulder: [18, 0, 7], rShoulder: [-20, 0, -7], lElbow: [-14, 0, 0], rElbow: [-26, 0, 0], chest: [4, 0, 0], head: [-2, 0, 0] };
const WALK_P = { lHip: [-6, 0, 3], lKnee: [4, 0, 0], rHip: [-20, 0, -3], rKnee: [42, 0, 0], rAnkle: [-10, 0, 0], lShoulder: [2, 0, 7], rShoulder: [-4, 0, -7], lElbow: [-18, 0, 0], rElbow: [-20, 0, 0], chest: [5, 0, 0], head: [0, 0, 0] };
function mirror(p) { const o = {}; for (const [k, v] of Object.entries(p)) { const k2 = k[0] === 'l' ? 'r' + k.slice(1) : k[0] === 'r' ? 'l' + k.slice(1) : k; o[k2] = [v[0], -v[1], -v[2]]; } return o; }
const WALK = [WALK_A, WALK_P, mirror(WALK_A), mirror(WALK_P)];
const walkPose = (frame, phase = 0, hold = 2) => WALK[Math.floor((frame + phase) / hold) % 4];

// base office + cast used by most shots
function stage(scene, renderer, { phase = 'noon', worker = false } = {}) {
  const O = S.buildOffice(scene, renderer, {});
  O.setPhase(S.PHASES[phase]);
  return O;
}
const look = (grade, focus, fstop = 2.8, extra = {}) => ({ grade, focus, fstop, bloom: { strength: 0.22, radius: 0.7, threshold: 1.3 }, ...extra });

// ================================================================= shots
const shots = [];

// 1 — top-down: the worker's hands open the box; tissue parts; LITTLE lies inside; the corner of a folded card.
shots.push({ name: 's01-box', dur: 5.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'morning' });
  O.setPhase(S.PHASES.morning, { sunTarget: V(S.BOX.x, Y, S.BOX.z), shadowBox: 0.8 });
  const B = V(S.BOX.x, Y, S.BOX.z);
  const box = S.kraftBox(); box.position.copy(B); scene.add(box);
  const bu = box.userData;
  const L = little('beech', 5, L_BOX); scene.add(L.group);
  const card = S.cardMesh(coverTex(), 0.1, 0.075); card.position.set(B.x + 0.14, Y + 0.0045, B.z + 0.02); card.rotation.y = 0.5; scene.add(card);
  const hl = forearm('l'), hr = forearm('r'); scene.add(hl.group, hr.group);
  const cam = new THREE.PerspectiveCamera(34, w / h, 0.02, 400);
  const shL = V(B.x - 0.1, 1.3, B.z + 0.75), shR = V(B.x + 0.28, 1.3, B.z + 0.75);
  const flapEdge = (i, a) => { const s = i === 0 ? -1 : 1; return V(B.x, Y + bu.H + (bu.W / 2) * Math.sin(a) + 0.015, B.z + s * bu.W / 2 - s * (bu.W / 2) * Math.cos(a)); };
  const tissueEdge = (i, a) => { const s = i === 0 ? -1 : 1; const r = bu.W * 0.55; return V(B.x, Y + bu.H - 0.005 + r * Math.sin(a) * 0.9, B.z + s * (bu.W / 2) - s * r * Math.cos(a)); };
  return { scene, camera: cam,
    update: (t, info) => {
      const aN = 2.6 * eo(seg(t, 0.75, 1.3)), aF = 2.6 * eo(seg(t, 1.45, 2.0)), aT = 2.45 * sm(seg(t, 2.3, 2.95));
      // flaps: index 0 = far (-z), 1 = near (+z, the worker's side)
      bu.flaps[1].rotation.x = aN; bu.flaps[0].rotation.x = -aF; bu.tissues[1].rotation.x = aT; bu.tissues[0].rotation.x = -aT;
      // LITTLE lying on its back, head toward the window (-x)
      L.setPose(E.boil(L_BOX, info.frame, 0.25)); L.group.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'); L.group.position.set(B.x + 0.168, 0, B.z); L.group.updateMatrixWorld(true); F.groundFig(L, Y + 0.006);
      // hands: left opens the near flap, right reaches over for the far flap, both part the tissue
      const restL = V(B.x - 0.15, Y + 0.035, B.z + 0.2), restR = V(B.x + 0.17, Y + 0.035, B.z + 0.22);
      let pl = restL.clone(), pr = restR.clone();
      if (t < 0.75) pl = lerpV(restL, flapEdge(1, 0).add(V(-0.06, 0, 0)), sm(seg(t, 0.3, 0.75)));
      else if (t < 1.3) pl = flapEdge(1, aN).add(V(-0.06, 0, 0));
      else if (t < 2.3) pl = lerpV(flapEdge(1, 2.6).add(V(-0.06, 0, 0)), tissueEdge(1, 0).add(V(-0.07, 0.01, 0)), sm(seg(t, 1.6, 2.3)));
      else if (t < 2.95) pl = tissueEdge(1, aT).add(V(-0.07, 0.01, 0));
      else pl = lerpV(tissueEdge(1, 2.45).add(V(-0.07, 0.01, 0)), V(B.x - 0.17, Y + 0.09, B.z + 0.2), sm(seg(t, 3.1, 3.7)));
      if (t < 1.45) pr = lerpV(restR, flapEdge(0, 0).add(V(0.07, 0, 0)), sm(seg(t, 0.95, 1.45)));
      else if (t < 2.0) pr = flapEdge(0, aF).add(V(0.07, 0, 0));
      else if (t < 2.3) pr = lerpV(flapEdge(0, 2.6).add(V(0.07, 0, 0)), tissueEdge(0, 0).add(V(0.07, 0.01, 0)), sm(seg(t, 2.0, 2.3)));
      else if (t < 2.95) pr = tissueEdge(0, aT).add(V(0.07, 0.01, 0));
      else pr = lerpV(tissueEdge(0, 2.45).add(V(0.07, 0.01, 0)), V(B.x + 0.18, Y + 0.1, B.z + 0.12), sm(seg(t, 3.0, 3.6)));
      const hover = t > 3.7 ? Math.sin(t * 3) * 0.004 : 0; pl.y += hover; pr.y += hover;
      placeFore(hl, pl, pl.clone().sub(shL).setY(-0.5), 1.5); placeFore(hr, pr, pr.clone().sub(shR).setY(-0.5), -1.5);
      setCam(cam, [B.x + 0.03, Y + 1.3, B.z + 0.02], [B.x + 0.03, Y, B.z + 0.02], 31, [-1, 0, 0]);
    },
    look: () => look('modern', 1.25, 5.6, { gradeOverride: { exposure: 1.0 } }) };
} });

// 2 — desk level: the hands stand LITTLE up beside the monitor and pose it, arms raised; the box is swept off the desk (thud).
shots.push({ name: 's02-pose', dur: 4.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'morning' });
  O.setPhase(S.PHASES.morning, { sunTarget: S.L_SPOT.clone(), shadowBox: 1.0 });
  const L = little(); scene.add(L.group);
  const box = S.kraftBox(); box.userData.setOpen(2.6, 2.45); scene.add(box);
  const hr = forearm('r'), hl = forearm('l'); scene.add(hr.group, hl.group);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.02, 400);
  const P = S.L_SPOT;
  const poseT = E.poseTrack([[0, L_N], [1.25, L_N], [1.7, { ...L_N, lShoulder: L_TRI.lShoulder, lElbow: L_TRI.lElbow }], [1.9, { ...L_N, lShoulder: L_TRI.lShoulder, lElbow: L_TRI.lElbow }], [2.35, { ...L_TRI, chest: [-4, 0, 0], head: [-6, 0, 0] }], [3.35, { ...L_TRI, chest: [-4, 0, 0], head: [-6, 0, 0] }], [3.6, L_TRI]]);
  return { scene, camera: cam,
    update: (t, info) => {
      const drop = 0.26 * (1 - eo(seg(t, 0.1, 0.9)));
      const pose = poseT(t);
      place(L, V(P.x, Y + drop, P.z), pose, 0, info.frame, 0.4, Y + drop);
      // right hand: carries LITTLE by the waist, lets go, lifts the near (left) arm, then the far arm, withdraws
      const waist = F.jointPoint(L, 'pelvis', [0, 0.1, 0.35]);
      const wL = F.jointPoint(L, 'lWrist', [0.1, -0.2, 0.3]), wR = F.jointPoint(L, 'rWrist', [-0.1, -0.2, 0.3]);
      let hp;
      if (t < 0.95) hp = waist.clone().add(V(0.02, 0.0, 0.03));
      else if (t < 1.25) hp = lerpV(waist.clone().add(V(0.02, 0, 0.03)), wL.clone().add(V(0.02, -0.02, 0.05)), sm(seg(t, 0.95, 1.25)));
      else if (t < 1.7) hp = wL.clone().add(V(0.02, -0.02, 0.05));
      else if (t < 1.9) hp = lerpV(F.jointPoint(L, 'lWrist', [0.1, -0.2, 0.3]).add(V(0.02, -0.02, 0.05)), wR.clone().add(V(0.02, -0.02, 0.06)), sm(seg(t, 1.7, 1.9)));
      else if (t < 2.35) hp = wR.clone().add(V(0.02, -0.02, 0.06));
      else hp = lerpV(wR.clone().add(V(0.02, -0.02, 0.06)), V(P.x + 0.25, Y + 0.55, P.z + 0.45), sm(seg(t, 2.35, 2.85)));
      placeFore(hr, hp, V(-0.35, -0.5, -1), -0.4);
      // the box sits open at the left edge of frame; the left hand sweeps it off the front edge
      const push = sm(seg(t, 2.85, 3.3)); const fall = seg(t, 3.15, 3.4);
      box.position.set(S.BOX.x, Y - 0.6 * fall * fall, S.BOX.z + 0.5 * push); box.rotation.set(0.9 * fall, 0, 0);
      const bh = V(S.BOX.x + 0.04, Y + 0.13 - 0.6 * fall * fall, S.BOX.z + 0.12 + 0.5 * push);
      const hlp = t < 2.7 ? V(S.BOX.x + 0.12, Y + 0.4, S.BOX.z + 0.6) : t < 2.85 ? lerpV(V(S.BOX.x + 0.12, Y + 0.4, S.BOX.z + 0.6), bh, sm(seg(t, 2.7, 2.85))) : bh;
      hl.group.visible = t > 2.6 && t < 3.4; placeFore(hl, hlp, V(-0.15, -0.55, -1), 0.8);
      setCam(cam, [0.18, 1.04, 0.6], [P.x, 1.0, P.z + 0.02], 30);
    },
    look: () => look('modern', 1.05, 2.8) };
} });

// 3 — LOCKED: four days, four phases each (morning / noon / evening / night), LITTLE slumps a step at a time.
const PHN = ['morning', 'noon', 'evening', 'night'];
function mugTurn(d, p) { return 1.5 + E.hash(d * 7 + p * 3 + 1) * 3.5; }
shots.push({ name: 's03-days', dur: 12.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'morning' });
  const L = little(); scene.add(L.group);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.02, 400);
  let lastPh = -1;
  return { scene, camera: cam,
    update: (t, info) => {
      const idx = Math.min(15, Math.floor(t / 0.75)), day = idx >> 2, ph = idx & 3;
      if (idx !== lastPh) {
        O.setPhase(S.PHASES[PHN[ph]], { sunTarget: S.L_SPOT.clone(), shadowBox: 1.1 });
        O.scrM.map = O.scrTex[['mail', 'sheet', 'doc', 'night'][ph]]; O.scrM.needsUpdate = true;
        O.mug.userData.setFill([0.9, 0.55, 0.2, 0.05][ph]); O.mug.rotation.y = mugTurn(day, ph);
        O.stickies.forEach((s, i) => { s.visible = i < [1, 2, 4, 6][day]; });
        O.papers.forEach((p, i) => { p.visible = i < [0, 2, 4, 8][day] + (ph > 1 ? 1 : 0); });
        lastPh = idx;
      }
      const pose = DAYPOSE[day][ph];
      if (day < 3) place(L, S.L_SPOT, pose, 0, info.frame, 0.5);
      else place(L, V(-0.9, Y, 0.33), pose, 12, info.frame, 0.5);
      setCam(cam, CAM3.pos, CAM3.look, CAM3.fov);
    },
    look: (t) => { const ph = Math.min(15, Math.floor(t / 0.75)) & 3; return look('modern', 1.3, 2.8, { gradeOverride: { exposure: [1.0, 0.95, 1.0, 1.15][ph] } }); } };
} });

// 4a — macro: a tiny screwdriver tightens the elbow pin; LITTLE stands and flexes.
shots.push({ name: 's04a-screw', dur: 3.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'noon' });
  O.setPhase(S.PHASES.noon, { sunTarget: S.L_SPOT.clone(), shadowBox: 0.45 });
  const L = little(); scene.add(L.group);
  const sd = new THREE.Group(); scene.add(sd);
  const shaft = PR.mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.04, 8), new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: 1, roughness: 0.2 }), [0, 0.02, 0]); sd.add(shaft);
  const handle = PR.mesh(new THREE.CylinderGeometry(0.0055, 0.006, 0.06, 6), new THREE.MeshStandardMaterial({ color: 0xb02a22, roughness: 0.4 }), [0, 0.07, 0]); sd.add(handle);
  const cam = new THREE.PerspectiveCamera(36, w / h, 0.005, 400);
  const limp = { ...L_HEAD, lShoulder: [4, 0, 12], lElbow: [8, 0, 0] };
  const pt = E.poseTrack([[0, limp], [2.15, limp], [2.4, { ...L_FLEX, chest: [2, 0, 0], head: [4, 0, 0] }, 'out'], [2.55, L_FLEX]]);
  let pin0 = null;
  return { scene, camera: cam,
    update: (t, info) => {
      place(L, S.L_SPOT, pt(t), 0, info.frame, 0.35);
      const pin = F.jointPoint(L, 'lElbow', [0.048, 0, 0]);
      if (!pin0) pin0 = F.jointPoint(L, 'lElbow', [0.048, 0, 0]);
      const axis = V(1, 0.45, -0.35).normalize();
      const inT = sm(seg(t, 0.2, 0.6)), outT = sm(seg(t, 1.75, 2.1));
      const tip = pin.clone().addScaledVector(axis, 0.002 + 0.08 * (1 - inT) + 0.1 * outT);
      sd.position.copy(tip); sd.quaternion.setFromUnitVectors(V(0, 1, 0), axis);
      const turns = Math.floor(seg(t, 0.65, 1.7) * 3.999); sd.rotateY(-turns * Math.PI / 3 - (t > 0.65 && t < 1.7 ? ((t - 0.65) % 0.35 > 0.2 ? 0.4 : 0) : 0));
      sd.visible = t < 2.12;
      setCam(cam, pin0.clone().add(V(0.13, 0.025, 0.1)).toArray(), pin0.clone().add(V(0.0, 0.01, 0)).toArray(), 36);
    },
    look: () => look('modern', 0.165, 8, { dofScale: 0.5 }) };
} });

// 4b — macro: an oil dropper, one drop on the knee joint.
shots.push({ name: 's04b-oil', dur: 2.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'noon' });
  O.setPhase(S.PHASES.noon, { sunTarget: S.L_SPOT.clone(), shadowBox: 0.45 });
  const L = little(); scene.add(L.group);
  const dr = new THREE.Group(); scene.add(dr);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xe8f0f2, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.45, clearcoat: 1 });
  dr.add(PR.mesh(new THREE.CylinderGeometry(0.0045, 0.0014, 0.05, 16), glass, [0, 0.025, 0], [0, 0, 0], false, false));
  dr.add(PR.mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xc89020, roughness: 0.2, transparent: true, opacity: 0.8 }), [0, 0.035, 0], [0, 0, 0], false, false));
  dr.add(PR.mesh(new THREE.SphereGeometry(0.0075, 16, 12), new THREE.MeshStandardMaterial({ color: 0x6a2a1e, roughness: 0.55 }), [0, 0.058, 0]));
  const drop = PR.mesh(new THREE.SphereGeometry(0.0022, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xd8a030, roughness: 0.05, clearcoat: 1, emissive: new THREE.Color(0.2, 0.12, 0.0) }), [0, 0, 0], [0, 0, 0], false, false); scene.add(drop);
  const cam = new THREE.PerspectiveCamera(36, w / h, 0.005, 400);
  const weak = { ...L_HEAD2 }, better = { ...L_HEAD, lKnee: [3, 0, 0], rKnee: [3, 0, 0], lHip: [-1, 0, 3], rHip: [-1, 0, -3], lAnkle: [-1, 0, 0], rAnkle: [-1, 0, 0], chest: [14, 0, 0], head: [16, 0, 0] };
  const pt = E.poseTrack([[0, weak], [1.25, weak], [1.6, better, 'out']]);
  let k0 = null;
  return { scene, camera: cam,
    update: (t, info) => {
      place(L, S.L_SPOT, pt(t), 0, info.frame, 0.35);
      const knee = F.jointPoint(L, 'lKnee', [0.02, 0.06, 0.03]);
      if (!k0) k0 = knee.clone();
      const tipY = knee.y + 0.028 + 0.06 * (1 - sm(seg(t, 0.05, 0.45))) + 0.06 * sm(seg(t, 1.2, 1.6));
      dr.position.set(knee.x, tipY, knee.z);
      const grow = seg(t, 0.45, 0.85), fall = seg(t, 0.95, 1.1);
      drop.visible = t > 0.45 && t < 1.7; drop.scale.set(grow, grow * (t > 1.1 ? 0.35 : 1 + 0.25 * grow), grow);
      drop.position.set(knee.x, t < 0.95 ? tipY - 0.002 - 0.0022 * grow : lerpV(V(0, tipY - 0.004, 0), V(0, knee.y - 0.008, 0), fall * fall).y, knee.z);
      setCam(cam, k0.clone().add(V(0.12, 0.035, 0.09)).toArray(), k0.clone().add(V(0, 0.012, 0)).toArray(), 36);
    },
    look: () => look('modern', 0.155, 8, { dofScale: 0.5 }) };
} });

// 4c — medium: a chrome stand clamps LITTLE's waist; it stands... and sags inside the stand.
// 4d — medium: a gold star sticker is pressed onto its chest.
const CAM4 = { pos: [S.L_SPOT.x + 0.52, Y + 0.24, S.L_SPOT.z + 0.36], look: [S.L_SPOT.x, Y + 0.16, S.L_SPOT.z], fov: 34 };
function standShot(name, dur, starMode) {
  return { name, dur, build: async ({ renderer, w, h }) => {
    const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'noon' });
    O.setPhase(S.PHASES.noon, { sunTarget: S.L_SPOT.clone(), shadowBox: 0.6 });
    const L = little(); scene.add(L.group);
    const st = chromeStand(); st.position.copy(S.L_SPOT); scene.add(st);
    const star = goldStar(); star.scale.setScalar(0.075); star.position.set(0, 0.33, 0.13); L.joints.chest.add(star);
    const fg = forearm('r'); scene.add(fg.group);
    const cam = new THREE.PerspectiveCamera(CAM4.fov, w / h, 0.01, 400);
    const pt = starMode
      ? E.poseTrack([[0, L_SAG], [0.55, L_SAG], [0.85, { ...L_UP, chest: [8, 0, 0] }, 'out'], [1.35, { ...L_UP, chest: [6, 0, 0], head: [-4, 0, 0] }], [1.75, { ...L_SAG, head: [20, 0, 8] }], [2.0, L_SAG2]])
      : E.poseTrack([[0, L_HEAD2], [0.45, L_HEAD2], [0.85, L_UP, 'out'], [1.2, L_UP], [1.75, L_SAG, 'in'], [2.0, L_SAG]]);
    return { scene, camera: cam,
      update: (t, info) => {
        place(L, S.L_SPOT, pt(t), 0, info.frame, 0.4);
        if (!starMode) { const slide = 1 - sm(seg(t, 0.0, 0.3)); st.position.set(S.L_SPOT.x, Y, S.L_SPOT.z - 0.25 * slide); st.userData.close(sm(seg(t, 0.3, 0.45))); }
        else st.userData.close(1);
        star.visible = starMode && t > 0.15;
        if (starMode) {
          // the star rides on the fingertip, is pressed on at 0.85 s, the finger withdraws
          const chestPt = F.jointPoint(L, 'chest', [0, 0.33, 0.2]);
          const approach = sm(seg(t, 0.15, 0.7)), away = sm(seg(t, 1.0, 1.45));
          const from = chestPt.clone().add(V(0.25, 0.12, 0.35)), at = chestPt.clone().add(V(0.0, -0.005, 0.1));
          const hp = away > 0 ? lerpV(at, from, away) : lerpV(from, at, approach);
          fg.group.visible = t < 1.5; placeFore(fg, hp, V(-0.45, -0.3, -1), 2.2, -0.2);
          if (t < 0.85) { star.visible = t > 0.15; L.joints.chest.remove(star); scene.add(star); star.position.copy(hp.clone().add(V(-0.01, -0.03, -0.075))); star.scale.setScalar(0.075 * S.LS); star.quaternion.setFromEuler(new THREE.Euler(0, 0.4, 0)); }
          else if (star.parent !== L.joints.chest) { star.parent.remove(star); L.joints.chest.add(star); star.position.set(0, 0.33, 0.13); star.scale.setScalar(0.075); star.quaternion.identity(); }
        } else fg.group.visible = false;
        setCam(cam, CAM4.pos, CAM4.look, CAM4.fov);
      },
      look: () => look('modern', V(...CAM4.pos).distanceTo(S.L_SPOT) - 0.02, 4) };
  } };
}
shots.push(standShot('s04c-stand', 2.0, false));
shots.push(standShot('s04d-star', 2.0, true));

// 4e — LOCKED again: SHINY is placed beside LITTLE, standing proud. Cut: next morning, both slumped.
const SH_SPOT = V(-0.88, Y, 0.54);
shots.push({ name: 's04e-shiny', dur: 3.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'noon' });
  const L = little(); scene.add(L.group);
  const st = chromeStand(); st.position.copy(S.L_SPOT); st.userData.close(1); scene.add(st);
  const star = goldStar(); star.scale.setScalar(0.075); star.position.set(0, 0.33, 0.13); L.joints.chest.add(star);
  const Sh = S.fig({ kind: 'shiny', scale: S.LS, pose: SH_PROUD }); scene.add(Sh.group);
  const hr = forearm('r'); scene.add(hr.group);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.02, 400);
  let lastM = -1;
  return { scene, camera: cam,
    update: (t, info) => {
      const next = t >= 1.6;
      if (lastM !== +next) { O.setPhase(S.PHASES[next ? 'morning' : 'noon'], { sunTarget: S.L_SPOT.clone(), shadowBox: 1.1 }); O.stickies.forEach((s, i) => { s.visible = i < 6; }); O.papers.forEach((p) => { p.visible = true; }); O.mug.userData.setFill(next ? 0.9 : 0.4); O.mug.rotation.y = next ? 3.1 : 4.2; O.scrM.map = O.scrTex[next ? 'mail' : 'sheet']; O.scrM.needsUpdate = true; lastM = +next; }
      place(L, S.L_SPOT, next ? L_SAG2 : L_SAG, 0, info.frame, 0.4);
      const drop = next ? 0 : 0.2 * (1 - eo(seg(t, 0.1, 0.8)));
      place(Sh, V(SH_SPOT.x, Y + drop, SH_SPOT.z), next ? L_HEAD3 : SH_PROUD, -8, info.frame, 0.4, Y + drop);
      const waist = F.jointPoint(Sh, 'pelvis', [0, 0.1, 0.35]);
      const hp = t < 0.85 ? waist.clone().add(V(0.02, 0, 0.03)) : lerpV(waist.clone().add(V(0.02, 0, 0.03)), V(SH_SPOT.x + 0.3, Y + 0.5, SH_SPOT.z + 0.4), sm(seg(t, 0.85, 1.3)));
      hr.group.visible = !next && t < 1.3; placeFore(hr, hp, V(-0.35, -0.5, -1), -0.4);
      setCam(cam, CAM3.pos, CAM3.look, CAM3.fov);
    },
    look: () => look('modern', 1.3, 2.8) };
} });

// 5 — wider, evening: the WORKER, as slumped as the manikins, pushes back, drags the box from under the desk; the card slides out.
const CAM5 = { pos: [2.6, 1.15, 1.7], look: [-0.62, 0.7, 0.85], fov: 46 };
const W_SLUMP = { ...W_SIT, pelvis: [-6, 0, 0], chest: [30, -6, 4], head: [14, 8, 24], lShoulder: [-52, 0, 18], lElbow: [-78, 0, 0] };
const W_UP = { ...W_SIT, chest: [8, 0, 0], head: [2, 0, 0], lShoulder: [-58, 0, 10], rShoulder: [-58, 0, -10], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0] };
const W_BEND = { ...W_SIT, lHip: [-100, 0, 10], rHip: [-96, 0, -4], pelvis: [4, 0, 0], chest: [52, 26, 10], head: [18, 26, 6], lShoulder: [-30, 0, 20], rShoulder: [-40, 0, -14], rElbow: [-50, 0, 0] };
const W_LOOK = { ...W_BEND, chest: [44, 14, 6], head: [30, -12, 0] };
function buildWorker(scene, pose = W_SIT) { const Wk = S.fig({ kind: 'ash', seed: 11, rotY: 180, pose }); scene.add(Wk.group); return Wk; }
shots.push({ name: 's05-worker', dur: 5.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'evening' });
  O.setPhase(S.PHASES.evening, { sunTarget: V(-0.5, 0.5, 0.8), shadowBox: 2.0 });
  O.stickies.forEach((s) => { s.visible = true; }); O.papers.forEach((p) => { p.visible = true; }); O.mug.userData.setFill(0.1);
  const L = little(); scene.add(L.group); const st = chromeStand(); st.position.copy(S.L_SPOT); st.userData.close(1); scene.add(st);
  const star = goldStar(); star.scale.setScalar(0.075); star.position.set(0, 0.33, 0.13); L.joints.chest.add(star);
  const Sh = S.fig({ kind: 'shiny', scale: S.LS, pose: L_HEAD3 }); scene.add(Sh.group);
  const Wk = buildWorker(scene);
  const box = S.kraftBox(); box.userData.setOpen(2.2, 2.2); scene.add(box);
  const card = S.cardMesh(coverTex(), 0.1, 0.075); scene.add(card);
  for (const ch of O.chairs) if (ch.position.x > 0.5 && ch.position.z > 1.0) ch.visible = false;
  const cam = new THREE.PerspectiveCamera(CAM5.fov, w / h, 0.02, 400);
  const wt = E.poseTrack([[0, W_SLUMP], [1.3, W_SLUMP], [1.55, { ...W_SLUMP, head: [8, 4, 10], chest: [24, -4, 2] }], [2.05, W_UP, 'out'], [2.6, W_UP], [3.1, W_BEND], [4.2, W_BEND], [4.6, W_LOOK]]);
  const roll = E.track([[0, 0], [2.05, 0], [2.6, 0.5, 'out'], [5, 0.5]]);
  return { scene, camera: cam,
    update: (t, info) => {
      place(L, S.L_SPOT, L_SAG2, 0, info.frame, 0.3);
      place(Sh, SH_SPOT, L_HEAD3, -8, info.frame, 0.3);
      const dz = roll(t);
      O.myChair.position.set(S.WORKER_SEAT.x, 0, S.WORKER_SEAT.z + dz);
      Wk.group.position.set(S.WORKER_SEAT.x, 0, S.WORKER_SEAT.z + dz - 0.04);
      E.applyPose(Wk, E.boil(wt(t), info.frame, 0.3, 7), { ground: 'seat', seatY: S.SEAT_H, F });
      // box: under the desk, dragged out toward the chair
      const drag = sm(seg(t, 3.15, 4.1));
      box.position.set(-0.64 + 0.19 * drag, 0, 0.5 + 0.55 * drag); box.rotation.set(0, 0.25 - 0.35 * drag, 0);
      // right hand: head on hand while slumped (IK); left hand to the box while bent
      if (t < 1.5) F.reachIK(Wk, 'r', F.jointPoint(Wk, 'head', [-0.12, 0.12, 0.06]), { local: [0, -0.1, 0.02], iters: 250 });
      else if (t < 2.6) { F.reachIK(Wk, 'r', V(S.WORKER_SEAT.x + 0.2, Y + 0.03, S.DESK.z1 - 0.04), { local: [0, -0.1, 0.02], iters: 200 }); F.reachIK(Wk, 'l', V(S.WORKER_SEAT.x - 0.25, Y + 0.03, S.DESK.z1 - 0.04), { local: [0, -0.1, 0.02], iters: 200 }); }
      else if (t > 2.9) F.reachIK(Wk, 'l', V(box.position.x + 0.1, 0.13, box.position.z + 0.06), { local: [0, -0.1, 0.02], iters: 250 });
      // the folded card slides out onto the floor
      const cs = sm(seg(t, 3.9, 4.45));
      card.visible = t > 3.85;
      card.position.copy(lerpV(V(box.position.x + 0.05, 0.07, box.position.z + 0.08), V(0.2, 0.003, 1.1), cs)); card.position.y = 0.003 + 0.07 * (1 - cs) * (1 - cs); card.rotation.set(0, 0.6 + 1.1 * cs, 0);
      setCam(cam, CAM5.pos, CAM5.look, CAM5.fov);
    },
    look: () => look('fire', 2.9, 4, budget({ samples: 2 })) };
} });

// 6 — INSERT: the care card fills the frame, readable; warm desk-lamp light on paper.
shots.push({ name: 's06-card', dur: 6.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene();
  const tex = careCard(900, 1150);
  const cw = 0.4, ch = cw * 1150 / 900;
  const desk = PR.mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ color: 0x5e4634, roughness: 0.55 }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true); scene.add(desk);
  const card = S.cardMesh(tex, cw, ch); card.position.set(0, 0.004, 0); card.rotation.y = 0.0; scene.add(card);
  // fold crease: the card was folded in half across the middle
  const crease = PR.mesh(new THREE.PlaneGeometry(cw * 0.98, 0.0025), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 }), [0, 0.0062, 0.0], [-Math.PI / 2, 0, 0], false, false); scene.add(crease);
  const hl = forearm('l'), hr = forearm('r'); scene.add(hl.group, hr.group);
  const lamp = new THREE.SpotLight(new THREE.Color(1.0, 0.74, 0.46), 9, 0, 0.7, 0.75, 2); lamp.position.set(-0.6, 1.1, -0.7); lamp.target.position.set(0, 0, 0.0); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0005; scene.add(lamp, lamp.target);
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.35, 0.4, 0.55), new THREE.Color(0.12, 0.08, 0.05), 0.35));
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.02, 50);
  return { scene, camera: cam,
    update: (t, info) => {
      const hh = E.handheld(info.frame, 0.0012, 5);
      placeFore(hl, V(-cw / 2 + 0.01, 0.035, ch / 2 - 0.05 + hh[1]), V(0.3, -0.45, -1), 1.3);
      placeFore(hr, V(cw / 2 - 0.01, 0.035, ch / 2 - 0.04 - hh[1]), V(-0.3, -0.45, -1), -1.3);
      const drift = 0.004 * sm(seg(t, 0, 6));
      setCam(cam, [hh[0], 1.5 - drift, 0.02 + hh[1]], [0, 0, 0.0], 30, [0, 0, -1]);
    },
    look: () => look('newworld', 1.5, 8, { gradeOverride: { exposure: 1.0, saturation: 0.95 }, bloom: { strength: 0.12, radius: 0.6, threshold: 1.6 } }) };
} });

// 7 — over the WORKER's shoulder: from the card to the two slumped manikins, then a slow turn to the office: everyone alone at a screen.
shots.push({ name: 's07-office', dur: 4.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = stage(scene, renderer, { phase: 'evening' });
  O.setPhase(S.PHASES.evening, { sunTarget: V(0.5, 0.5, -2.5), shadowBox: 4.5 });
  O.stickies.forEach((s) => { s.visible = true; }); O.papers.forEach((p) => { p.visible = true; });
  const L = little(); scene.add(L.group); const st = chromeStand(); st.position.copy(S.L_SPOT); st.userData.close(1); scene.add(st);
  const Sh = S.fig({ kind: 'shiny', scale: S.LS, pose: L_HEAD3 }); scene.add(Sh.group);
  const Wk = buildWorker(scene);
  const card = S.cardMesh(coverTex(), 0.1, 0.075); scene.add(card);
  // colleagues, each alone at a screen
  const kinds = [['maple', 21], ['oak', 22], ['ash', 23], ['maple', 24], ['oak', 25], ['beech', 26], ['ash', 27]];
  const picks = O.chairSpots.filter(([x, z, side, k]) => z < -1.5).slice(0, 12).filter((_, i) => [0, 3, 5, 6, 8, 11].includes(i));
  picks.forEach(([x, z, side], i) => {
    const [kind, seed] = kinds[i % kinds.length];
    const pose = { ...W_SIT, chest: [18 + (i % 3) * 8, 0, (i % 2 ? 4 : -4)], head: [14 + (i % 2) * 10, 0, 0], lShoulder: [-44, 0, 10], rShoulder: [-44, 0, -10], lElbow: [-70, 0, 0], rElbow: [-70, 0, 0] };
    const c = S.fig({ kind, seed, rotY: side > 0 ? 180 : 0, pose }); c.group.position.set(x + 0.05, 0, z + side * 0.02); scene.add(c.group); F.seatFig(c, S.SEAT_H);
  });
  const cam = new THREE.PerspectiveCamera(38, w / h, 0.02, 400);
  const HOLD = { ...W_SIT, chest: [14, 0, 0], head: [26, 0, 0], lShoulder: [-40, 0, 14], rShoulder: [-40, 0, -14], lElbow: [-95, 0, 0], rElbow: [-95, 0, 0] };
  const ht = E.poseTrack([[0, HOLD], [0.9, HOLD], [1.5, { ...HOLD, head: [18, 34, 0], chest: [12, 8, 0] }, 'inOut'], [2.3, { ...HOLD, head: [18, 34, 0], chest: [12, 8, 0] }], [3.3, { ...HOLD, head: [-4, -22, 0], chest: [6, -6, 0] }, 'inOut'], [4.0, { ...HOLD, head: [-4, -22, 0], chest: [6, -6, 0] }]]);
  const pan = E.track([[0, 0], [2.3, 0], [3.4, 1], [4, 1]]);
  return { scene, camera: cam,
    update: (t, info) => {
      place(L, S.L_SPOT, L_SAG2, 0, info.frame, 0.3);
      place(Sh, SH_SPOT, L_HEAD3, -8, info.frame, 0.3);
      Wk.group.position.set(S.WORKER_SEAT.x, 0, S.WORKER_SEAT.z + 0.05); O.myChair.position.set(S.WORKER_SEAT.x, 0, S.WORKER_SEAT.z + 0.08);
      E.applyPose(Wk, E.boil(ht(t), info.frame, 0.3, 9), { ground: 'seat', seatY: S.SEAT_H, F });
      const cp = V(S.WORKER_SEAT.x, 1.12, S.WORKER_SEAT.z - 0.36);
      card.position.copy(cp); card.rotation.set(-1.0, 0, 0, 'XYZ');
      F.reachIK(Wk, 'l', cp.clone().add(V(-0.06, 0, 0.02)), { local: [0, -0.1, 0.02], iters: 200 });
      F.reachIK(Wk, 'r', cp.clone().add(V(0.06, 0, 0.02)), { local: [0, -0.1, 0.02], iters: 200 });
      const p = pan(t);
      setCam(cam, [0.22, 1.76, 2.05], [-0.78 + 1.5 * p, 0.95 + 0.2 * p, 0.1 - 3.3 * p], 38);
    },
    look: () => look('fire', 2.6, 4, budget({ samples: 2 })) };
} });

// 8 — the sunny windowsill (seen from outside the glass): the worker's hands set LITTLE and SHINY with four others;
//     stop-motion, they end up together.
const CAM8 = { pos: [-2.95, 1.12, -1.74], look: [0.6, 1.32, -1.66], fov: 34 };
const G = { A: V(-1.17, 0, -1.87), L: V(-1.24, 0, -1.78), Sh: V(-1.31, 0, -1.66), D: V(-1.25, 0, -1.55), B: V(-1.12, 0, -1.6), C: V(-1.12, 0, -1.74) };
const SILL_FOCUS = V(-1.25, S.SILL_Y + 0.15, -1.74);
function sillCast(scene) {
  const c = {};
  c.L = little('beech', 5); c.Sh = S.fig({ kind: 'shiny', scale: S.LS, pose: L_HEAD3 });
  c.A = little('oak', 31); c.B = little('maple', 32); c.C = little('ash', 33); c.D = little('maple', 34);
  for (const f of Object.values(c)) scene.add(f.group);
  c.pencil = S.pencil(0.2); scene.add(c.pencil);
  return c;
}
const CARRY_R = { rShoulder: [-128, 0, -14], rElbow: [-128, 0, 0], rWrist: [-20, 0, 0], lShoulder: [-8, 0, 6] };
const SUNBATHE = { lHip: [-84, 0, 8], rHip: [-80, 0, -8], lKnee: [14, 0, 0], rKnee: [30, 0, 0], chest: [-24, 0, 0], head: [-26, 0, 0], lShoulder: [38, 0, 20], rShoulder: [38, 0, -20], lElbow: [-4, 0, 0], rElbow: [-4, 0, 0] };
const SMALL_WALK = WALK.map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.map((x) => x * 0.6)])));
function sillUpdate(c, t, frame) {
  // t: seconds since the start of shot 8 (continues into shot 9)
  const land = (t0, t1) => 0.18 * (1 - eo(seg(t, t0, t1)));
  const up = sm(seg(t, 2.5, 3.1)), up2 = sm(seg(t, 2.9, 3.6));
  const LP = E.slerpPose(E.slerpPose(L_HEAD3, { ...L_HEAD3, head: [-6, 8, 0] }, up), { ...L_UP, head: [-6, 8, 0] }, up2);
  const Ly = S.SILL_Y + land(0.2, 1.0), Sy = S.SILL_Y + land(1.0, 1.8);
  place(c.L, V(G.L.x, Ly, G.L.z), LP, -95, frame, 0.4, Ly);
  place(c.Sh, V(G.Sh.x, Sy, G.Sh.z), E.slerpPose(L_HEAD3, SH_PROUD, sm(seg(t, 3.9, 4.7))), -80, frame, 0.4, Sy);
  // A (oak): turns to LITTLE and puts an arm around its shoulders
  const ar = sm(seg(t, 2.8, 3.6));
  place(c.A, V(G.A.x, S.SILL_Y, G.A.z), { ...L_N, head: [0, 20 * ar, 0], chest: [0, 6 * ar, 0] }, -100, frame, 0.4);
  if (ar > 0) { const tgt = F.jointPoint(c.L, 'lShoulder', [0, 0.16, 0.06]); const rest = F.jointPoint(c.A, 'lWrist', [0, -0.1, 0]); F.reachIK(c.A, 'l', rest.lerp(tgt, ar), { local: [0, -0.1, 0.02], iters: 200 }); }
  // B and C lift the pencil and carry it like a log along the sill (in profile)
  const lift = sm(seg(t, 3.0, 3.5));
  const walking = t > 3.5 && t < 7.2, step = Math.floor(Math.max(0, Math.min(t, 7.2) - 3.5) * 4);
  const dz = 0.018 * step;
  const carry = (k) => ({ ...(walking ? SMALL_WALK[(step + k) % 4] : L_N), ...E.slerpPose(L_N, CARRY_R, lift) });
  place(c.B, V(G.B.x, S.SILL_Y, G.B.z + dz), carry(0), 0, frame, 0.4);
  place(c.C, V(G.C.x, S.SILL_Y, G.C.z + dz), carry(2), 0, frame, 0.4);
  if (lift > 0.05) { const pb = F.jointPoint(c.B, 'rWrist', [0, -0.12, 0]), pc = F.jointPoint(c.C, 'rWrist', [0, -0.12, 0]); c.pencil.position.copy(pb).lerp(pc, 0.5); c.pencil.position.y = Math.max(c.pencil.position.y, S.SILL_Y + 0.006); }
  else c.pencil.position.set(G.B.x - 0.03, S.SILL_Y + 0.006, (G.B.z + G.C.z) / 2);
  c.pencil.rotation.set(0, Math.PI / 2, 0);
  // D sits in the sun, leaning back on its hands
  c.D.group.position.set(G.D.x, 0, G.D.z); c.D.group.rotation.set(0, -75 * DEG, 0);
  E.applyPose(c.D, E.boil(SUNBATHE, frame, 0.4, 4), { ground: 'feet', floorY: S.SILL_Y, F });
}
function sillStage(scene, renderer) {
  const O = stage(scene, renderer, { phase: 'golden' });
  O.setPhase(S.PHASES.golden, { sunTarget: V(0.1, 0.9, -1.7), shadowBox: 2.6 });
  for (const ch of O.chairs) if (Math.abs(ch.position.z + 1.65) < 0.45) ch.visible = false;
  O.ledMat.color.setScalar(0.25); for (const bp of O.bigPlants) bp.visible = false;
  return O;
}
shots.push({ name: 's08-sill', dur: 8.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = sillStage(scene, renderer);
  const c = sillCast(scene);
  const hl = forearm('l'), hr = forearm('r'); scene.add(hl.group, hr.group);
  const cam = new THREE.PerspectiveCamera(CAM8.fov, w / h, 0.02, 400);
  return { scene, camera: cam,
    update: (t, info) => {
      sillUpdate(c, t, info.frame);
      const wl = F.jointPoint(c.L, 'pelvis', [0, 0.1, -0.35]), ws = F.jointPoint(c.Sh, 'pelvis', [0, 0.1, -0.35]);
      const away = V(-0.3, 1.7, -1.9);
      const p1 = t < 1.0 ? wl : lerpV(wl, away, sm(seg(t, 1.05, 1.6)));
      let p2;
      if (t < 1.0) p2 = lerpV(away, ws, sm(seg(t, 0.6, 1.0)));
      else if (t < 1.8) p2 = ws;
      else p2 = lerpV(ws, away, sm(seg(t, 1.85, 2.4)));
      hr.group.visible = t < 1.6; placeFore(hr, p1, V(-0.75, -0.65, 0.1), 0.0);
      hl.group.visible = t > 0.6 && t < 2.4; placeFore(hl, p2, V(-0.75, -0.65, -0.1), 0.0);
      setCam(cam, CAM8.pos, CAM8.look, CAM8.fov);
    },
    look: () => look('newworld', V(...CAM8.pos).distanceTo(SILL_FOCUS), 2.0, { ...budget({ samples: 2, dofScale: 0.6 }), gradeOverride: { exposure: 0.9 } }) };
} });

// 9 — same windowsill; focus racks to the background: the WORKER and two colleagues leave their desks together, toward the daylight.
shots.push({ name: 's09-leave', dur: 4.0, build: async ({ renderer, w, h }) => {
  const scene = new THREE.Scene(); const O = sillStage(scene, renderer);
  const c = sillCast(scene);
  const walkers = [['maple', 21], ['ash', 11], ['oak', 22]].map(([kind, seed]) => { const f = S.fig({ kind, seed, rotY: -90 }); scene.add(f.group); return f; });
  const cam = new THREE.PerspectiveCamera(CAM8.fov, w / h, 0.02, 400);
  const nearF = V(...CAM8.pos).distanceTo(SILL_FOCUS);
  const wx = (t) => 3.3 - 0.8 * t; const focus = (t) => { const far = wx(t) + 2.95; return t < 0.6 ? nearF : t < 1.9 ? nearF + (far - nearF) * sm((t - 0.6) / 1.3) : far; };
  return { scene, camera: cam,
    update: (t, info) => {
      sillUpdate(c, 8 + t, info.frame);
      walkers.forEach((f, i) => {
        const x = wx(t) + [0.12, -0.08, 0.1][i], z = [-2.0, -1.64, -1.28][i];
        f.group.position.set(x, 0, z); f.group.rotation.y = -Math.PI / 2 + [0.1, 0, -0.1][i];
        E.applyPose(f, E.boil(SMALL_WALK[Math.floor((info.frame + i * 3) / 3) % 4], info.frame, 0.3, 11 + i), { ground: 'feet', floorY: 0, F });
      });
      setCam(cam, CAM8.pos, CAM8.look, CAM8.fov);
    },
    look: (t) => look('newworld', focus(t), 2.0, { ...budget({ samples: 4, dofScale: 1.0 }), gradeOverride: { exposure: 0.9 } }) };
} });

// 10 — end card
shots.push(endCardShot({ line: "You came with instructions. We're writing them down.", dur: 4.5 }));

export default { fps: 12, shots };
