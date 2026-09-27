// Direction A geometry extractor.
// Builds posed mannequins from a JSON spec, renders an exact label buffer
// (R = figure+1, G = body-part group) and a 24-bit linear depth buffer,
// and exports camera + joint world matrices so the Python ink engine can
// trace contours and project construction curves with the same camera.
import * as THREE from 'three';
import { buildMannequin, POSES } from '../../mannequin.js';

const GROUP = { // joint name -> part group id (1..)
  head: 1, neck: 2, chest: 2, pelvis: 3,
  lShoulder: 4, lElbow: 5, lWrist: 6, rShoulder: 7, rElbow: 8, rWrist: 9,
  lHip: 10, lKnee: 11, lAnkle: 12, rHip: 13, rKnee: 14, rAnkle: 15,
};

export default async function ({ w, h, q }) {
  THREE.ColorManagement.enabled = false;
  const spec = await (await fetch('/' + q.get('spec') + '?v=' + Date.now())).json();
  const W = spec.w || w, Hh = spec.h || h;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = Hh;
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, Hh, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(spec.camera.fov, W / Hh, spec.camera.near || 0.1, spec.camera.far || 100);
  cam.position.set(...spec.camera.pos);
  if (spec.camera.up) cam.up.set(...spec.camera.up);
  cam.lookAt(new THREE.Vector3(...spec.camera.target));
  if (spec.camera.roll) cam.rotateZ(spec.camera.roll * Math.PI / 180);
  cam.updateMatrixWorld(true); cam.updateProjectionMatrix();

  const near = spec.camera.near || 0.1, far = spec.camera.far || 100;
  const depthMat = new THREE.ShaderMaterial({
    uniforms: { uNear: { value: near }, uFar: { value: far } },
    vertexShader: `varying float vZ; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uNear; uniform float uFar; varying float vZ;
      void main(){ float d = clamp((vZ-uNear)/(uFar-uNear),0.0,1.0); float v = d*16777215.0;
        float r = floor(v/65536.0); float g = floor((v - r*65536.0)/256.0); float b = v - r*65536.0 - g*256.0;
        gl_FragColor = vec4(r/255.0, g/255.0, floor(b)/255.0, 1.0); }`,
    side: THREE.FrontSide,
  });

  const figsOut = [];
  const labelMats = [];
  (spec.figures || []).forEach((f, fi) => {
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const m = buildMannequin({ material: new THREE.MeshBasicMaterial(), pinMaterial: pinMat, castShadow: false });
    const base = typeof f.pose === 'string' ? (POSES[f.pose] || {}) : (f.pose || {});
    const pose = { ...base, ...(f.overrides || {}) };
    if (f.root) pose.root = f.root;
    m.setPose(pose);
    if (f.ground !== undefined && f.ground !== null) m.ground(f.ground);
    if (f.scale) { m.root.scale.setScalar(f.scale); m.root.updateMatrixWorld(true); if (f.ground !== undefined && f.ground !== null) m.ground(f.ground); }
    // assign label materials by nearest joint ancestor
    m.root.traverse(o => {
      if (!o.isMesh) return;
      if (o.material === pinMat) { o.visible = false; return; }
      let p = o.parent; while (p && !(p.name in GROUP)) p = p.parent;
      const g = p ? GROUP[p.name] : 2;
      if (f.show && !(p && f.show.includes(p.name))) { o.visible = false; return; }
      if (f.hide && p && f.hide.includes(p.name)) { o.visible = false; return; }
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color((fi + 1) / 255, g / 255, 0) });
      o.material = mat; o.userData.label = mat;
    });
    scene.add(m.root);
    m.root.updateMatrixWorld(true);
    const joints = {};
    for (const [k, j] of Object.entries(m.joints)) joints[k] = j.matrixWorld.toArray();
    figsOut.push({ joints, rootMatrix: m.root.matrixWorld.toArray() });
    labelMats.push(m);
  });

  // extra simple props (boxes / cylinders) that should occlude figures in the label pass
  const nf = (spec.figures || []).length;
  (spec.props || []).forEach((p, pi) => {
    let geo;
    if (p.type === 'box') geo = new THREE.BoxGeometry(...p.size);
    else if (p.type === 'cyl') geo = new THREE.CylinderGeometry(p.r, p.r2 ?? p.r, p.hgt, 48);
    else if (p.type === 'dome') geo = new THREE.SphereGeometry(p.r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    else if (p.type === 'sphere') geo = new THREE.SphereGeometry(p.r, 48, 32);
    else if (p.type === 'mesh') {
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p.v, 3));
      geo.setIndex(p.f);
    }
    else return;
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color((nf + 1 + pi) / 255, 20 / 255, 0), side: THREE.DoubleSide }));
    if (p.pos) mesh.position.set(...p.pos); if (p.rot) mesh.rotation.set(...p.rot.map(x => x * Math.PI / 180));
    if (p.scale) mesh.scale.set(...p.scale);
    mesh.userData.label = mesh.material;
    scene.add(mesh);
  });

  renderer.render(scene, cam);
  const labels = canvas.toDataURL('image/png');
  scene.overrideMaterial = depthMat;
  renderer.render(scene, cam);
  const depth = canvas.toDataURL('image/png');
  scene.overrideMaterial = null;

  window.__out = {
    labels, depth,
    meta: {
      w: W, h: Hh, near, far,
      proj: cam.projectionMatrix.toArray(),
      view: cam.matrixWorldInverse.toArray(),
      camPos: cam.position.toArray(),
      figures: figsOut,
    },
  };
}
