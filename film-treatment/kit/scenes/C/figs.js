// Direction C: build many posed manikins from a JSON spec and export one GLB (window.__glb, base64).
// Spec: {figs:[{name, pose:"sitChair"|{...}, mods:{joint:[x,y,z]}, pos:[X,Y,Z] (BLENDER coords, Z up),
//               yaw:deg (about up), rot:[x,y,z] (three.js root rot, overrides yaw), ground:Z|null, sit:Z|null, scale:1}]}
// Every mesh is named  <fig>.<joint>.<k>  (pins: <fig>.<joint>.pin) so Blender can recover segments.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildMannequin, POSES } from '../../mannequin.js';

export default async function ({ q }) {
  const spec = await (await fetch('/' + q.get('spec') + '?v=' + Date.now())).json();
  const scene = new THREE.Scene();
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8b48a, roughness: 0.6, name: 'wood' });
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1, roughness: 0.3, name: 'pin' });
  for (const f of spec.figs) {
    const m = buildMannequin({ material: mat, jointMaterial: mat, pinMaterial: pinMat });
    const base = typeof f.pose === 'string' ? (POSES[f.pose] || {}) : (f.pose || {});
    const pose = { ...base, ...(f.mods || {}) };
    const P = f.pos || [0, 0, 0];
    const rot = f.rot || [0, f.yaw || 0, 0];
    pose.root = { pos: [P[0], P[2], -P[1]], rot };
    m.setPose(pose);
    const s = f.scale || 1; m.root.scale.setScalar(s); m.root.updateMatrixWorld(true);
    if (f.ground !== undefined && f.ground !== null) m.ground(f.ground);
    if (f.sit !== undefined && f.sit !== null) {
      const box = new THREE.Box3();
      for (const jn of ['pelvis', 'lHip', 'rHip']) m.joints[jn].children.forEach(c => { if (c.isMesh) box.expandByObject(c); });
      m.root.position.y += f.sit - box.min.y; m.root.updateMatrixWorld(true);
    }
    // name meshes
    for (const [jn, g] of Object.entries(m.joints)) {
      let k = 0;
      g.children.forEach(c => {
        if (!c.isMesh) return;
        c.name = c.material === pinMat ? `${f.name}.${jn}.pin${k++}` : `${f.name}.${jn}.${k++}`;
      });
    }
    m.root.name = f.name;
    scene.add(m.root);
  }
  const buf = await new GLTFExporter().parseAsync(scene, { binary: true });
  let s = ''; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  window.__glb = btoa(s);
  const c = document.createElement('canvas'); c.width = c.height = 4; document.body.appendChild(c);
}
