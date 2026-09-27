import * as THREE from 'three';
const [pos, look, fov] = JSON.parse(process.argv[2]);
const pts = JSON.parse(process.argv[3]);
const cam = new THREE.PerspectiveCamera(fov, 720 / 1280, 0.02, 400); cam.position.set(...pos); cam.lookAt(...look); cam.updateMatrixWorld(true);
for (const [n, p] of Object.entries(pts)) { const v = new THREE.Vector3(...p).project(cam); console.log(n.padEnd(8), ((v.x + 1) * 50).toFixed(0).padStart(4) + '%', ((1 - v.y) * 50).toFixed(0).padStart(4) + '%', v.z > 1 ? 'BEHIND' : ''); }
