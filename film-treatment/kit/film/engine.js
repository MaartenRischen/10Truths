// Film engine for the Demismatch shorts: stop-motion stepped animation on top of Direction E's renderer.
//
// A film module (films/<name>/film.js) default-exports:
//   { fps: 12, w: 720, h: 1280, shots: [ { name, dur, build: async (ctx) => Shot }, ... ] }
// A Shot is { scene, camera, update(t, info), look(t, info) }
//   update(t, info): pose everything for local time t (seconds). info = { frame, fps, shotFrame, rng }
//   look(t, info): renderShot options for this frame (grade, samples, dof, focus, fstop, exposure, bloom, mist...)
//   Optional: dispose()
// Time is quantised to the film fps (12 = stop-motion "on twos" at 24 fps playback).
import * as THREE from 'three';
import * as C from '../scenes/E/lib/cine.js';

export { C };
export const DEG = Math.PI / 180;

// ---------- easing ----------
export const ease = {
  linear: (x) => x,
  inOut: (x) => x * x * (3 - 2 * x),
  in: (x) => x * x,
  out: (x) => 1 - (1 - x) * (1 - x),
  inOut3: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  hold: () => 0, // jump at the next key
  snap: (x) => (x < 1 ? 0 : 1),
};
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------- scalar / vector tracks ----------
// keys: [[t, value, easeName?], ...] sorted by t; the ease on key i shapes the segment i -> i+1.
export function track(keys, defEase = 'inOut') {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0, e] = keys[i], [t1, v1] = keys[i + 1];
      if (t < t1) {
        const f = ease[e || defEase](clamp01((t - t0) / Math.max(1e-6, t1 - t0)));
        return lerpAny(v0, v1, f);
      }
    }
    return keys[keys.length - 1][1];
  };
}
export function lerpAny(a, b, f) {
  if (typeof a === 'number') return a + (b - a) * f;
  if (Array.isArray(a)) return a.map((x, i) => x + (b[i] - x) * f);
  return f < 0.5 ? a : b;
}

// ---------- pose tracks (per-joint quaternion slerp) ----------
const JOINTS = ['pelvis', 'chest', 'head', 'lShoulder', 'lElbow', 'lWrist', 'rShoulder', 'rElbow', 'rWrist', 'lHip', 'lKnee', 'lAnkle', 'rHip', 'rKnee', 'rAnkle'];
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), eu = new THREE.Euler();
function toQ(v, q) { eu.set((v?.[0] || 0) * DEG, (v?.[1] || 0) * DEG, (v?.[2] || 0) * DEG, 'XYZ'); return q.setFromEuler(eu); }
export function slerpPose(a, b, f) {
  const o = {};
  for (const j of JOINTS) {
    if (!a[j] && !b[j]) continue;
    toQ(a[j], qa); toQ(b[j], qb); qa.slerp(qb, f);
    eu.setFromQuaternion(qa, 'XYZ');
    o[j] = [eu.x / DEG, eu.y / DEG, eu.z / DEG];
  }
  return o;
}
// keys: [[t, poseObject, easeName?], ...]
export function poseTrack(keys, defEase = 'inOut') {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, p0, e] = keys[i], [t1, p1] = keys[i + 1];
      if (t < t1) return slerpPose(p0, p1, ease[e || defEase](clamp01((t - t0) / Math.max(1e-6, t1 - t0))));
    }
    return keys[keys.length - 1][1];
  };
}
// Stop-motion "boil": tiny deterministic per-frame jitter of every joint (the animator's hand).
export function boil(pose, frame, amt = 0.35, seed = 1) {
  const o = {};
  for (const j of Object.keys(pose)) {
    if (j === 'root') { o.root = pose.root; continue; }
    const v = pose[j]; if (!Array.isArray(v)) { o[j] = v; continue; }
    o[j] = v.map((x, k) => x + (hash(frame * 131 + k * 17 + j.length * 7 + seed * 1013) - 0.5) * 2 * amt);
  }
  return o;
}
export function hash(n) { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }

// Apply a pose to an E-style figure (F.figure) and keep it planted.
//   ground: 'feet' (lowest point on floorY) | 'seat' (seatY) | 'none'
export function applyPose(fig, pose, { ground = 'feet', floorY = 0, seatY = null, F } = {}) {
  fig.setPose(pose);
  if (ground === 'feet' && F) F.groundFig(fig, floorY);
  else if (ground === 'seat' && F && seatY !== null) F.seatFig(fig, seatY);
  fig.group.updateMatrixWorld(true);
}

// ---------- camera ----------
// camTrack: { pos: track, look: track, fov: track|number, roll?: track }
export function applyCam(cam, ct, t) {
  const p = ct.pos(t), l = ct.look(t);
  cam.position.set(p[0], p[1], p[2]);
  if (ct.fov) { cam.fov = typeof ct.fov === 'function' ? ct.fov(t) : ct.fov; cam.updateProjectionMatrix(); }
  cam.up.set(0, 1, 0); cam.lookAt(l[0], l[1], l[2]);
  if (ct.roll) cam.rotateZ((typeof ct.roll === 'function' ? ct.roll(t) : ct.roll) * DEG);
  cam.updateMatrixWorld(true);
}
// Handheld drift for "documentary" moments, deterministic per frame.
export function handheld(frame, amp = 0.004, seed = 3) {
  const f = frame / 12;
  return [Math.sin(f * 1.3 + seed) * amp + Math.sin(f * 3.1 + seed * 2) * amp * 0.4,
          Math.sin(f * 1.7 + seed * 3) * amp * 0.8 + Math.sin(f * 2.9) * amp * 0.3, 0];
}

// ---------- resource cleanup between shots ----------
export function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      for (const k of Object.keys(m)) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
      m.dispose();
    }
    if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose();
  });
  if (scene.environment && scene.environment.dispose) scene.environment.dispose();
}

// ---------- defaults for the animatic look ----------
// samples: 1 = fastest (no DoF), 3-4 = anti-aliased with soft DoF. Grain hides the rest.
export const LOOK = {
  animatic: { samples: 3, aa: 1.0, dofScale: 0.6 },
  still: { samples: 24, aa: 1.2, dofScale: 1.0 },
};
