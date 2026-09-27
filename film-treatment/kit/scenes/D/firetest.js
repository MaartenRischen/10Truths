import { Stage, THREE, COL, V, fire, floor, figure, noiseTexture } from './lib.js';
import { PZ } from './poses.js';
export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 40, exposure: +(q.get('exp') || 1.5), sat: 0.92, bloom: { strength: +(q.get('bloom') ?? 0.7), radius: 0.4, threshold: 1.1 }, haze: { density: +(q.get('haze') ?? 0.0004), noise: 0.5, far: 80, height: 2.5 }, vignette: 0.6 });
  const gmap = noiseTexture({ seed: 31, scale: 5, contrast: 1.2, size: 512, bias: 0.16 }); gmap.repeat.set(30, 30); gmap.colorSpace = THREE.SRGBColorSpace;
  const gr = floor(st, { color: 0x857868, rough: 0.95, bump: 1.4, repeat: 70 }); gr.material.map = gmap; gr.material.needsUpdate = true;
  fire(st, V(0, 0, 0), { scale: 1.0, gain: +(q.get('gain') || 2.2), lightI: 16, sparks: 70, seed: 3, hazeGain: 0.1 });
  figure(st, PZ.sitLogWarm, { pos: [0, 0, 1.45], rot: [0, 180, 0] });
  const v = q.get('v') || 'top';
  if (v === 'top') st.look(V(0.6, 3.2, 1.6), V(0, 0.2, 0), 40); else st.look(V(2.4, 1.0, 2.4), V(0, 0.45, 0), 40);
  st.render();
}
