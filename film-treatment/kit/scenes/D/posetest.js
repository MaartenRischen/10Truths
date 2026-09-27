// Neutral-lit pose sheet for checking custom poses. ?set=camp|modern ...
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildMannequin, woodMaterial, POSES } from '../../mannequin.js';
import { PZ } from './poses.js';

export default async function ({ w, h, q }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h); renderer.toneMapping = THREE.AgXToneMapping;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x202020);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x555555 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  scene.add(new THREE.DirectionalLight(0xffffff, 2.5).translateX(3).translateY(5).translateZ(4));
  const mat = woodMaterial({ seed: 3 });
  const names = (q.get('poses') || Object.keys(PZ).join(',')).split(',');
  const ry = +(q.get('ry') || 30);
  const cols = Math.min(names.length, +(q.get('cols') || 6));
  names.forEach((n, i) => {
    const m = buildMannequin({ material: mat }); m.setPose(PZ[n] || POSES[n]);
    m.root.rotation.y += ry * Math.PI / 180;
    m.root.position.x = ((i % cols) - (cols - 1) / 2) * 1.9; m.root.position.z = -Math.floor(i / cols) * 3.0;
    m.ground(0); scene.add(m.root);
  });
  const rows = Math.ceil(names.length / cols);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
  cam.position.set(0, 2.2, 3.2 + cols * 1.35); cam.lookAt(0, 0.8, 0);
  renderer.render(scene, cam);
}
