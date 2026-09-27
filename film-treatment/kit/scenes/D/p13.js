// P13 NOT BROKEN — near-total black. One small warm light in the chest of the figure, steady. The faintest rim light.
// The hinge: a thin glowing line of type.
import { Stage, THREE, COL, V, figure, Motes, mulberry, floor, walnut } from './lib.js';

function textTexture(str, { font = 'italic 300 64px FreeSerif, "Liberation Serif", serif', w = 1600, h = 140, spacing = 0.06 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'middle';
  let x = 20; for (const ch of str) { g.fillText(ch, x, h / 2); x += g.measureText(ch).width + 64 * spacing; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData = { width: x }; return t;
}

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 26, exposure: +(q.get('exp') || 1.4), sat: 0.95,
    bloom: { strength: 0.55, radius: 0.55, threshold: 0.9 },
    haze: { density: 0.0012, noise: 0.6, far: 30, scale: 1.4, seed: 13 },
    dof: { focus: 2.3, blurInf: 8, max: 10 }, vignette: 0.8, grain: 0.04 });
  walnut().userData.rim.uRimCol.value.set(0xd8c8b8).multiplyScalar(0.07);
  walnut().userData.rim.uRimDir.value.set(-0.8, 0.5, -0.3).normalize();
  const F = figure(st, { chest: [6, 0, 0], head: [14, 0, 0], lShoulder: [-2, 0, 5], rShoulder: [-2, 0, -5], lElbow: [-6, 0, 0], rElbow: [-6, 0, 0] },
    { pos: [0, 0, 0], rot: [0, -70, 0], coreI: 1.0, coreLight: 1.3, coreRange: 0.3, coreSize: 0.02 });
  const M = new Motes(st, { minPx: 1 });
  M.add(F.core.clone().addScaledVector(F.fwd, 0.012), COL.hot, 3.5, 0.016);
  M.add(F.core.clone().addScaledVector(F.fwd, 0.012), COL.amber, 0.3, 0.05);
  const R = mulberry(5); for (let i = 0; i < 40; i++) M.add(V(-1.2 + R() * 2.4, 0.9 + R() * 1.2, -0.6 + R() * 1.2), COL.amber, 0.25 + R() * 0.4, 0.003);
  M.build();
  st.look(V(-0.05, 1.62, 2.3), V(0.28, 1.5, 0), 26);
  if (q.get('text') !== '0') {
    const tex = textTexture(q.get('line') || 'You are not broken.');
    const aspect = tex.userData.width / 1600;
    const tw = 0.5, th = tw * 140 / 1600 / aspect;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tw / aspect * aspect, th), new THREE.MeshBasicMaterial({ map: tex, color: COL.amber.clone().lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false }));
    tex.repeat.set(aspect, 1);
    m.position.copy(st.at(0.66, 0.74, 2.3)); m.quaternion.copy(st.camera.quaternion); st.fx.add(m);
  }
  st.render({ time: 0.5 });
}
