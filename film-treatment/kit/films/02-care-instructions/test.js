// calibration film: one still per phase in the locked shot-3 framing
import * as THREE from 'three';
import * as E from '../../film/engine.js';
import * as F from '../../scenes/E/lib/figs.js';
import * as S from './set.js';

const STAND = { lShoulder: [-160, 0, 30], rShoulder: [-160, 0, -30], lElbow: [-15, 0, 0], rElbow: [-15, 0, 0], chest: [-8, 0, 0], head: [-12, 0, 0], lHip: [0, 0, 5], rHip: [0, 0, -5] };
const SIT = { lHip: [-88, 0, 5], rHip: [-88, 0, -5], lKnee: [88, 0, 0], rKnee: [88, 0, 0], chest: [12, 0, 0], head: [10, 0, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-60, 0, 0], rElbow: [-60, 0, 0] };
const q = new URLSearchParams(location.search);
const cam = (q.get('cam') || '0.72,1.06,0.66').split(',').map(Number), look = (q.get('look') || '-0.86,1.0,0.38').split(',').map(Number), fov = +(q.get('fov') || 30);

export default {
  fps: 12,
  shots: (q.get('ph') || 'morning,noon,evening,night').split(',').map((ph) => ({ name: ph, dur: 1 / 12, build: async ({ renderer, w, h }) => {
    const scene = new THREE.Scene();
    const t0 = performance.now();
    const O = S.buildOffice(scene, renderer, {});
    O.setPhase(S.PHASES[ph]);
    const L = S.fig({ kind: 'beech', seed: 5, scale: S.LS, rotY: +(q.get('ry') || 0), pose: STAND }); L.group.position.copy(S.L_SPOT); scene.add(L.group);
    E.applyPose(L, STAND, { ground: 'feet', floorY: S.DESK_Y, F });
    const Wk = S.fig({ kind: 'ash', seed: 11, rotY: 180, pose: SIT }); Wk.group.position.copy(S.WORKER_SEAT); scene.add(Wk.group); F.seatFig(Wk, S.SEAT_H);
    for (const s of ['l', 'r']) F.reachIK(Wk, s, new THREE.Vector3(S.KB.x + (s === 'l' ? -0.1 : 0.1), S.DESK_Y + 0.05, S.KB.z + 0.02), { local: [0, -0.1, 0.02], iters: 300 });
    console.log('[scene] build ms ' + (performance.now() - t0).toFixed(0));
    const camera = new THREE.PerspectiveCamera(fov, w / h, 0.02, 400);
    camera.position.set(...cam); camera.lookAt(...look);
    camera.updateMatrixWorld(true);
    const pr = (n, v) => { const p = v.clone().project(camera); console.log('[scene] ' + n + ' ' + ((p.x + 1) / 2 * 100).toFixed(0) + '% ' + ((1 - p.y) / 2 * 100).toFixed(0) + '%'); };
    pr('Lhead', F.jointPoint(L, 'head', [0, 0.25, 0])); pr('Lfeet', S.L_SPOT); pr('mug', S.MUG);  pr('kb', new THREE.Vector3(S.KB.x, S.DESK_Y, S.KB.z)); pr('box', new THREE.Vector3(S.BOX.x, S.DESK_Y, S.BOX.z));
    return { scene, camera, update: () => {}, look: () => ({ grade: 'modern', focus: camera.position.distanceTo(S.L_SPOT), fstop: 2.8, bloom: { strength: 0.2, radius: 0.7, threshold: 1.4 } }) };
  } })),
};
