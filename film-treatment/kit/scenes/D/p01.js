// P01 OPEN — black; a small warm light pulses in the chest of a dark walnut manikin, rim-lit.
// Far behind, a cold endless lattice of light switching on (out of focus).
import { Stage, THREE, COL, V, figure, Threads, Motes, smooth, mulberry, floor, mixCol, walnut } from './lib.js';

export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 30, exposure: +(q.get('exp') || 1.3), sat: 0.95,
    bloom: { strength: 0.5, radius: 0.5, threshold: 1.0 },
    haze: { density: 0.0007, noise: 0.6, far: 200, scale: 1.3, seed: 4 },
    dof: { focus: 3.6, blurInf: 9, max: 12 }, vignette: 0.75, grain: 0.035, ca: 0.8,
    mirror: { y: 0, k: 0.35, blur: 6, fade: 30 } });
  const R = mulberry(3);
  walnut().userData.rim.uRimCol.value.set(0xa9d4f0).multiplyScalar(0.42);
  walnut().userData.rim.uRimDir.value.set(-0.7, 0.45, -0.4).normalize();
  floor(st, { color: 0x070707, rough: 0.4, bump: 0.2, clearcoat: 0.5, ccRough: 0.3 });

  const F = figure(st, { chest: [8, -6, 0], head: [24, -10, -4], lShoulder: [-4, 0, 7], rShoulder: [-8, 0, -7], lElbow: [-22, 0, 0], rElbow: [-26, 0, 0], lWrist: [0, 20, 0], rWrist: [0, -20, 0], lHip: [-2, 0, 3], rHip: [3, 0, -2], rKnee: [4, 0, 0] },
    { pos: [0.2, 0, 0], rot: [0, -52, 0], coreI: 1.1, coreLight: 1.4, coreSize: 0.022, coreRange: 0.25 });
  // a soft halo sprite on the core (the pulse)
  const M = new Motes(st, { minPx: 1 });
  M.add(F.core.clone().addScaledVector(F.fwd, 0.015), COL.hot, 3, 0.02);
  M.add(F.core.clone().addScaledVector(F.fwd, 0.015), COL.amber, 0.35, 0.06);

  // far lattice: a 3D grid of nodes; a switching-on wave sweeps from left to right
  const T = new Threads(st, { minPx: 1.0, haloGain: 0.0 });
  const sx = 3.2, sy = 3.2, sz = 3.2;
  const front = +(q.get('front') || -2);
  const on = (x, y, z) => { const f = front + Math.sin(y * 0.15 + z * 0.04) * 10 - (z + 70) * 0.3; return x < f ? (1 + 3.0 * Math.exp(-Math.pow((x - f) / 4, 2))) : 0.0; };
  for (let ix = -60; ix <= 60; ix++) for (let iy = -4; iy <= 14; iy++) for (let iz = 0; iz < 22; iz++) {
    const p = V(ix * sx, iy * sy + 2.0, -70 - iz * sz);
    const k = on(p.x, p.y, p.z); if (k < 0.02) continue;
    const fall = Math.exp(-iz * 0.07);
    const c = mixCol(COL.cyan, new THREE.Color(1, 1, 1), 0.25);
    M.add(p, c, 1.7 * k * fall, 0.05);
  }
  M.build(); T.build();
  // cold light from the lattice as a faint glow far behind
  st.hazeLight(V(-40, 20, -140), COL.cyan, 120, 30);
  st.hazeLight(V(front - 20, 15, -90), COL.cyan, 50, 20);
  st.envFromFx(V(-2.5, 3, -4), { intensity: 0.6 });

  st.look(V(-0.2, 1.58, 3.6), V(-0.42, 1.3, 0), 30);
  st.render({ time: 0.1 });
}
