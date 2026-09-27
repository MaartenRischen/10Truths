// Pipeline test: a manikin in E's bedroom sits up from lying, stop-motion stepped; then the end card.
import * as THREE from 'three';
import * as E from '../../film/engine.js';
import { endCardShot } from '../../film/text.js';
import * as F from '../../scenes/E/lib/figs.js';
import * as PR from '../../scenes/E/lib/props.js';

const LIE = { lHip: [-8, 0, 3], rHip: [-4, 0, -3], lKnee: [20, 0, 0], rKnee: [10, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], lShoulder: [-20, 0, 10], rShoulder: [-10, 0, -10] };
const SIT = { lHip: [-85, 0, 6], rHip: [-85, 0, -6], lKnee: [90, 0, 0], rKnee: [90, 0, 0], chest: [22, 0, 0], head: [26, 0, 0], lShoulder: [-30, 0, 10], rShoulder: [-30, 0, -10], lElbow: [-60, 0, 0], rElbow: [-60, 0, 0] };

export default {
  fps: 12,
  shots: [
    { name: 'test-room', dur: 2.0, build: async ({ renderer, w, h }) => {
      const scene = new THREE.Scene();
      const room = PR.bedroom({}); scene.add(room.group || room);
      const f = F.figure({ kind: 'beech', seed: 5, pose: SIT, pos: [0, 0, 0.6], rotY: 0 });
      scene.add(f.group);
      const lamp = new THREE.PointLight(0xffb070, 6, 0, 2); lamp.position.set(-0.9, 1.4, 0.9); lamp.castShadow = true; scene.add(lamp);
      scene.add(new THREE.HemisphereLight(0x8aa0c0, 0x201810, 0.35));
      const cam = new THREE.PerspectiveCamera(36, w / h, 0.05, 100);
      const pt = E.poseTrack([[0, SIT], [1.0, E.slerpPose(SIT, { ...SIT, head: [-10, 0, 0], chest: [4, 0, 0] }, 1)], [2.0, SIT]]);
      const ct = { pos: E.track([[0, [0.3, 1.2, 3.4]], [2, [0.1, 1.15, 3.0]]]), look: E.track([[0, [0, 0.9, 0.5]], [2, [0, 0.95, 0.5]]]), fov: 36 };
      return {
        scene, camera: cam,
        update: (t, info) => { E.applyPose(f, E.boil(pt(t), info.frame), { ground: 'seat', seatY: 0.5, F }); E.applyCam(cam, ct, t); },
        look: () => ({ grade: 'modern', focus: 3.0, fstop: 2.8 }),
      };
    } },
    endCardShot({ line: "He'd love our world. He'd never understand why we're alone in it.", dur: 2.0 }),
  ],
};
