import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildMannequin, woodMaterial, POSES } from '../../mannequin.js';
export default async function ({ w, h, q }) {
  const t0 = performance.now();
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(w, h); renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.AgXToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x14110f);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x3a302a, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const pl = new THREE.PointLight(0xffa050, 20, 0, 2); pl.position.set(0.5, 0.6, 1.2); pl.castShadow = true; pl.shadow.mapSize.set(512,512); scene.add(pl);
  const sl = new THREE.SpotLight(0x9fc4ff, 30, 0, 0.6, 0.5, 2); sl.position.set(-2, 3, 2); sl.castShadow = true; sl.shadow.mapSize.set(1024,1024); scene.add(sl);
  const mat = woodMaterial({ seed: 5, base: [222, 186, 140], dark: [176, 132, 88] });
  for (let i = 0; i < 4; i++) { const m = buildMannequin({ material: mat }); m.setPose(POSES.sitCrossFire); m.root.position.x = (i - 1.5) * 1.1; m.root.rotation.y = i; m.ground(0); scene.add(m.root); }
  const cam = new THREE.PerspectiveCamera(28, w / h, 0.1, 100); cam.position.set(0.6, 1.5, 6.4); cam.lookAt(0, 0.6, 0);
  const t1 = performance.now();
  renderer.render(scene, cam);
  const gl = renderer.getContext(); const px = new Uint8Array(4); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
  const t2 = performance.now();
  const N = +(q.get('n')||4);
  for (let i = 0; i < N; i++) { pl.position.x += 0.01; renderer.render(scene, cam); }
  gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
  const t3 = performance.now();
  // no shadows update
  renderer.shadowMap.autoUpdate = false;
  for (let i = 0; i < N; i++) { renderer.render(scene, cam); }
  gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
  const t4 = performance.now();
  console.log('[scene] setup', (t1-t0).toFixed(0), 'first', (t2-t1).toFixed(0), 'perframe', ((t3-t2)/N).toFixed(0), 'noshadow', ((t4-t3)/N).toFixed(0));
}
