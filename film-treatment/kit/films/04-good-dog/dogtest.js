// Standalone test of the wooden dog: a lineup of poses (+ a manikin for scale). harness scene module.
import * as THREE from 'three';
import * as C from '../../scenes/E/lib/cine.js';
import * as F from '../../scenes/E/lib/figs.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as MT from '../../scenes/E/lib/mat.js';
import { buildDog, DOG_POSES, P, solveLeg } from './dog.js';

export default async function ({ w, h, q }) {
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const samples = +(q.get('s') || 6);
  const view = q.get('view') || 'side';
  const fl = MT.planks({ base: [150, 118, 88], dark: [104, 78, 56], planksAcross: 5, seed: 4 });
  scene.add(PR.mesh(new THREE.PlaneGeometry(20, 10), MT.texMat({ map: fl.map, rough: fl.rough, roughness: 0.55, repeat: [4, 2] }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
  scene.add(PR.mesh(new THREE.PlaneGeometry(20, 6), new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.9 }), [0, 3, -1.5], [0, 0, 0], false, true));
  const poses = [
    ['stand', DOG_POSES.stand], ['alert', DOG_POSES.alert], ['sit', DOG_POSES.sit],
    ['tilt', P(DOG_POSES.sit, { head: [4, 10, 24], neck: [-18, 8, 0], lEar: [-14, 0, 22], rEar: [4, 0, -8] })],
    ['down', DOG_POSES.down], ['headOnPaws', DOG_POSES.headOnPaws], ['sniff', DOG_POSES.sniff], ['walk', null],
  ];
  const only = q.get('only') ? q.get('only').split(',') : null;
  const list = only ? poses.filter(([nm]) => only.includes(nm)) : poses;
  const n = list.length, sp = +(q.get('sp') || 0.78);
  list.forEach(([name, pose], i) => {
    const d = buildDog({ seed: 11 });
    const x = (i - (n - 1) / 2) * sp;
    d.group.position.set(x, 0, 0);
    d.group.rotation.y = view === 'side' ? Math.PI / 2 * 0.72 : (view === 'front' ? 0.35 : (view === 'q' ? 0.9 : -Math.PI / 2 * 0.8));
    scene.add(d.group);
    if (pose) { d.setPose(pose); if (name === 'sit' || name === 'tilt') d.groundBy(['lFPaw', 'rFPaw'], 0); else d.ground(0); }
    else {
      // IK test: body at height, feet on a stride
      d.setPose({ root: { pos: [0, 0.415, 0], rot: [0, 0, 0] } });
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), d.group.rotation.y);
      const side = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), d.group.rotation.y);
      const base = d.group.position.clone();
      const tgt = (lat, fz) => base.clone().addScaledVector(side, lat).addScaledVector(fwd, fz);
      solveLeg(d, 'lF', tgt(0.075, 0.2 + 0.12).setY(0));
      solveLeg(d, 'rF', tgt(-0.075, 0.2 - 0.1).setY(0.05), { flex: 70 });
      solveLeg(d, 'lH', tgt(0.07, -0.17 - 0.12).setY(0), { metaAng: 12 });
      solveLeg(d, 'rH', tgt(-0.07, -0.17 + 0.1).setY(0));
    }
    console.log('[scene] ' + name + ' minY=' + new THREE.Box3().setFromObject(d.group).min.y.toFixed(3));
  });
  // manikin for scale, sitting on nothing -> standing at the end
  if (!q.get('nom')) { const m = F.figure({ kind: 'beech', seed: 5, pose: {}, rotY: -30 }); m.group.position.set((n / 2) * sp + 0.2, 0, -0.3); F.groundFig(m, 0); scene.add(m.group); }
  const key = new THREE.DirectionalLight(0xfff0dd, 3.2); key.position.set(-3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 3, bottom: -3 }); key.shadow.bias = -0.0005; scene.add(key);
  scene.add(new THREE.HemisphereLight(0xbfd0ff, 0x302418, 0.8));
  scene.environment = C.gradientEnv(renderer, { top: [0.5, 0.55, 0.6], horizon: [0.4, 0.4, 0.4], bottom: [0.1, 0.08, 0.06] }); scene.environmentIntensity = 0.5;
  const cam = new THREE.PerspectiveCamera(+(q.get('fov') || 30), w / h, 0.05, 100);
  cam.position.set(+(q.get('cx') || 0), +(q.get('cy') || 1.1), +(q.get('cz') || 6.2)); cam.lookAt(+(q.get('cx') || 0), +(q.get('ly') || 0.3), 0);
  await C.renderShot(renderer, scene, cam, { w, h, samples, focus: 6, fstop: 1e9, grade: 'newworld', bloom: { strength: 0 } });
}
