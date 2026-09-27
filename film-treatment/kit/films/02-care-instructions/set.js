// 02 CARE INSTRUCTIONS — the office: an open-plan desk against a big window, day-phase lighting, props, little manikins.
// World: floor y = 0, glass wall at x = WX (outside is x < WX), our desk runs along x from the window ledge into the room,
// the worker sits at +z facing -z. Scene units: manikin 2.0 = 1.75 m (E's UNIT).
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as C from '../../scenes/E/lib/cine.js';
import * as MT from '../../scenes/E/lib/mat.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as MD from '../../scenes/E/lib/modern.js';
import * as F from '../../scenes/E/lib/figs.js';
import { buildMannequin, woodMaterial } from '../../mannequin.js';

export const U = 2.0 / 1.75;
export const m = (x) => x * U;
export const DESK_Y = m(0.74);
export const WX = -1.40;                 // glass plane
export const SILL_Y = m(0.78);           // deep window ledge (top)
export const SILL_IN = WX + m(0.30);     // inner edge of the ledge
export const CEIL_Y = m(2.9);
export const DESK = { x0: SILL_IN + 0.02, x1: SILL_IN + 0.02 + m(1.6), z0: 0.0, z1: m(0.8) };
export const LS = 0.17;                  // little manikin scale (~30 cm)
export const L_SPOT = new THREE.Vector3(-0.84, DESK_Y, 0.40); // where LITTLE stands, beside the monitor
export const MON = { x: -0.46, z: 0.22, ry: 0.5 };
export const KB = { x: -0.24, z: 0.60 };
export const MUG = new THREE.Vector3(-0.93, DESK_Y, 0.24);
export const BOX = { x: -0.62, z: 0.60 };
export const WORKER_SEAT = new THREE.Vector3(-0.22, 0, 1.36);
export const SEAT_H = m(0.47);

const TEX = new Map();
export function memo(key, fn) { if (!TEX.has(key)) TEX.set(key, fn()); return TEX.get(key); }
const M4 = (x, y, z, ry = 0, rx = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
export function merged(list, mat, cast = true, recv = true) {
  const g = mergeGeometries(list.map(([geo, m4]) => { const c = geo.index ? geo.toNonIndexed() : geo.clone(); return c.applyMatrix4(m4); }), false);
  const me = new THREE.Mesh(g, mat); me.castShadow = cast; me.receiveShadow = recv; return me;
}
const mesh = PR.mesh, rbox = PR.rbox;
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

// ------------------------------------------------------------------ textures
function kraftTex() {
  return memo('kraft', () => {
    const N = MT.makeNoise(41);
    return MT.canvasTexture(256, (u, v, o) => {
      const n = N.fbm(u * 10, v * 10, 4, 10) - 0.5, f = N.fbm(u * 90, v * 12, 2) - 0.5;
      const k = n * 14 + f * 18; o[0] = 176 + k; o[1] = 132 + k * 0.85; o[2] = 88 + k * 0.7;
    });
  });
}
function facadeDay(seed) {
  return memo('fday' + seed, () => { const rng = C.mulberry32(seed); const tone = 150 + rng() * 60; const cols = 8 + Math.floor(rng() * 6), rows = 18;
    return MT.drawTexture(256, 512, (g, W, H) => {
      g.fillStyle = `rgb(${tone},${tone * 0.97},${tone * 0.93})`; g.fillRect(0, 0, W, H);
      const cw = W / cols, rh = H / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const v = 60 + rng() * 40; g.fillStyle = `rgb(${v * 0.8},${v * 0.92},${v * 1.1})`; g.fillRect(c * cw + cw * 0.14, r * rh + rh * 0.18, cw * 0.72, rh * 0.62); }
    }); });
}
function facadeNight(seed) {
  return memo('fnight' + seed, () => MD.facadeTex({ seed, lit: 0.3, cols: 8 + (seed % 5), rows: 18, frame: [0, 0, 0], dark: [0, 0, 0] }));
}
function screenTex(kind, seed) {
  return memo('scr' + kind + seed, () => {
    const rng = C.mulberry32(seed);
    return MT.drawTexture(640, 360, (g, W, H) => {
      g.fillStyle = '#e9edf2'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2d3440'; g.fillRect(0, 0, W, 22);
      if (kind === 'sheet') {
        g.fillStyle = '#ffffff'; g.fillRect(0, 22, W, H);
        g.strokeStyle = '#c8d0da'; g.lineWidth = 1;
        for (let x = 40; x < W; x += 72) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x, H); g.stroke(); }
        for (let y = 44; y < H; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        for (let y = 48; y < H; y += 18) for (let x = 46; x < W; x += 72) if (rng() < 0.7) { g.fillStyle = rng() < 0.1 ? '#d05a4a' : '#5d6878'; g.fillRect(x, y, 20 + rng() * 40, 7); }
        g.fillStyle = '#3f7fbf'; g.fillRect(0, 22, W, 20);
      } else if (kind === 'mail') {
        g.fillStyle = '#d3dae3'; g.fillRect(0, 22, 170, H);
        for (let i = 0; i < 16; i++) { g.fillStyle = i === 2 ? '#3f7fbf' : '#f6f8fa'; g.fillRect(8, 30 + i * 20, 154, 16); g.fillStyle = '#7a8594'; g.fillRect(14, 36 + i * 20, 60 + rng() * 80, 4); }
        for (let i = 0; i < 12; i++) { g.fillStyle = '#5d6878'; g.fillRect(190, 50 + i * 22, 250 + rng() * 170, 7); }
        g.fillStyle = '#c0392b'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(160, 38 + i * 20, 4, 0, 7); g.fill(); }
      } else if (kind === 'night') {
        g.fillStyle = '#1b2330'; g.fillRect(0, 0, W, H); g.fillStyle = '#0e1219'; g.fillRect(0, 0, W, 22);
        for (let i = 0; i < 18; i++) { g.fillStyle = i % 5 === 0 ? '#6fa8dc' : '#8ea0b8'; g.fillRect(24, 36 + i * 17, 120 + rng() * 380, 6); }
      } else {
        g.fillStyle = '#c9d1db'; g.fillRect(0, 22, 120, H);
        for (let i = 0; i < 14; i++) { g.fillStyle = '#9aa6b4'; g.fillRect(14, 40 + i * 22, 70 + rng() * 25, 7); }
        for (let i = 0; i < 15; i++) { g.fillStyle = i === 0 ? '#30394a' : '#5d6878'; g.fillRect(150, 46 + i * 20, i === 0 ? 280 : 300 + rng() * 170, i === 0 ? 12 : 7); }
      }
    });
  });
}

// ------------------------------------------------------------------ phases (window light cycle)
// sunDir points from the scene toward the sun (outside is -x).
export const PHASES = {
  morning: { zen: [0.3, 0.5, 1.05], hor: [1.0, 1.18, 1.5], gnd: [0.3, 0.34, 0.4], sunDir: [-0.55, 0.3, -0.78], sunCol: [0.8, 0.9, 1.0], sunI: 4.5, glow: [0.9, 1.0, 1.2],
    hemiSky: [0.62, 0.74, 0.95], hemiGnd: [0.24, 0.24, 0.26], hemiI: 0.45, ceil: 0.9, mon: 1.0, night: 0.0, city: [1.15, 1.25, 1.45], lamp: 0, exp: 1.0, fill: 0.9 },
  noon: { zen: [0.42, 0.68, 1.3], hor: [1.5, 1.52, 1.58], gnd: [0.4, 0.4, 0.4], sunDir: [-0.5, 0.8, -0.3], sunCol: [1.0, 0.98, 0.94], sunI: 6.0, glow: [1.2, 1.2, 1.1],
    hemiSky: [0.85, 0.88, 0.92], hemiGnd: [0.3, 0.29, 0.27], hemiI: 0.6, ceil: 1.0, mon: 1.0, night: 0.0, city: [1.5, 1.5, 1.48], lamp: 0, exp: 1.0, fill: 1.1 },
  evening: { zen: [0.3, 0.32, 0.62], hor: [3.2, 1.55, 0.62], gnd: [0.4, 0.26, 0.18], sunDir: [-0.72, 0.16, 0.68], sunCol: [1.0, 0.6, 0.3], sunI: 7.0, glow: [3.5, 1.4, 0.45],
    hemiSky: [0.7, 0.55, 0.45], hemiGnd: [0.25, 0.18, 0.12], hemiI: 0.35, ceil: 0.8, mon: 1.0, night: 0.3, city: [1.5, 1.0, 0.7], lamp: 0, exp: 1.0, fill: 0.8 },
  night: { zen: [0.01, 0.015, 0.035], hor: [0.035, 0.05, 0.1], gnd: [0.01, 0.01, 0.02], sunDir: [-0.7, 0.3, 0.2], sunCol: [0.4, 0.5, 0.8], sunI: 0.0, glow: [0, 0, 0],
    hemiSky: [0.2, 0.26, 0.4], hemiGnd: [0.04, 0.04, 0.05], hemiI: 0.07, ceil: 0.08, mon: 1.3, night: 1.0, city: [0.05, 0.06, 0.09], lamp: 0, exp: 1.0, fill: 0.2 },
  golden: { zen: [0.4, 0.5, 0.9], hor: [3.0, 1.75, 0.85], gnd: [0.42, 0.32, 0.22], sunDir: [-0.38, 0.24, 0.9], sunCol: [1.0, 0.72, 0.44], sunI: 7.0, glow: [3.0, 1.5, 0.6],
    hemiSky: [0.8, 0.66, 0.52], hemiGnd: [0.3, 0.22, 0.15], hemiI: 0.28, ceil: 0.35, mon: 0.9, night: 0.1, city: [1.8, 1.35, 1.0], lamp: 0, exp: 1.0, fill: 0.35 },
};
export function mixPhase(a, b, t) {
  const o = {}; for (const k of Object.keys(a)) { const x = a[k], y = b[k]; o[k] = Array.isArray(x) ? lerp3(x, y, t) : lerp(x, y, t); } return o;
}

// ------------------------------------------------------------------ small props
export function mug({ color = 0x3f6f78 } = {}) {
  const g = new THREE.Group();
  const glaze = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const inner = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.35, side: THREE.DoubleSide });
  const R = m(0.042), Hh = m(0.095);
  g.add(mesh(new THREE.CylinderGeometry(R, R * 0.94, Hh, 40, 1, true), glaze, [0, Hh / 2, 0]));
  g.add(mesh(new THREE.CylinderGeometry(R * 0.9, R * 0.86, Hh * 0.97, 40, 1, true), inner, [0, Hh / 2 + 0.002, 0]));
  g.add(mesh(new THREE.CircleGeometry(R * 0.94, 40), glaze, [0, 0.001, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.TorusGeometry(R * 0.95, R * 0.05, 8, 40), glaze, [0, Hh, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.TorusGeometry(Hh * 0.28, R * 0.12, 10, 24, Math.PI * 1.2), glaze, [R * 1.02, Hh * 0.5, 0], [0, 0, -Math.PI * 0.6]));
  const coffee = mesh(new THREE.CircleGeometry(R * 0.88, 32), new THREE.MeshPhysicalMaterial({ color: 0x2a160c, roughness: 0.08, clearcoat: 1 }), [0, Hh * 0.8, 0], [-Math.PI / 2, 0, 0], false, true);
  g.add(coffee);
  g.userData = { coffee, H: Hh, R, setFill: (f) => { coffee.visible = f > 0.03; coffee.position.y = Hh * (0.05 + 0.85 * f); } };
  return g;
}
function plant() {
  const g = new THREE.Group();
  const pot = new THREE.MeshStandardMaterial({ color: 0xb8653e, roughness: 0.85 });
  g.add(mesh(new THREE.CylinderGeometry(m(0.065), m(0.05), m(0.11), 28), pot, [0, m(0.055), 0]));
  g.add(mesh(new THREE.CylinderGeometry(m(0.06), m(0.06), 0.004, 24), new THREE.MeshStandardMaterial({ color: 0x2e2218, roughness: 1 }), [0, m(0.1), 0]));
  const leafM = new THREE.MeshStandardMaterial({ color: 0x3f6a3a, roughness: 0.6, side: THREE.DoubleSide });
  const rng = C.mulberry32(9);
  for (let i = 0; i < 9; i++) {
    const hgt = m(0.16 + rng() * 0.16); const geo = new THREE.ConeGeometry(m(0.018), hgt, 6); geo.translate(0, hgt / 2, 0); geo.scale(1, 1, 0.3);
    const a = i / 9 * Math.PI * 2 + rng();
    const lf = mesh(geo, leafM, [Math.cos(a) * m(0.02), m(0.1), Math.sin(a) * m(0.02)], [Math.sin(a) * 0.25, a, Math.cos(a) * 0.25]); g.add(lf);
  }
  return g;
}
function penPot() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(m(0.035), m(0.035), m(0.1), 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }), [0, m(0.05), 0]));
  const cols = [0xd8b020, 0x2a4f8f, 0xc23b2b, 0xd8b020];
  cols.forEach((c, i) => { const a = i * 1.7; g.add(mesh(new THREE.CylinderGeometry(0.0045, 0.0045, m(0.17), 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), [Math.cos(a) * 0.012, m(0.09), Math.sin(a) * 0.012], [Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15])); });
  return g;
}
export function pencil(len = m(0.17)) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.0048, 0.0048, len, 6), new THREE.MeshStandardMaterial({ color: 0xd8a420, roughness: 0.45 }), [0, 0, 0], [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.ConeGeometry(0.0048, 0.018, 6), new THREE.MeshStandardMaterial({ color: 0xd9b88a, roughness: 0.8 }), [len / 2 + 0.009, 0, 0], [0, 0, -Math.PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 8), new THREE.MeshStandardMaterial({ color: 0xd88a8a, roughness: 0.8 }), [-len / 2 - 0.006, 0, 0], [0, 0, Math.PI / 2]));
  return g;
}
function deskLamp({ on = false } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1e2022, roughness: 0.45, metalness: 0.3 });
  g.add(mesh(new THREE.CylinderGeometry(m(0.07), m(0.075), 0.02, 32), mat, [0, 0.01, 0]));
  const a1 = new THREE.Group(); a1.position.set(0, 0.02, 0); a1.rotation.z = 0.35; g.add(a1);
  a1.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, m(0.36), 8), mat, [0, m(0.18), 0]));
  const a2 = new THREE.Group(); a2.position.set(0, m(0.36), 0); a2.rotation.z = 1.75; a1.add(a2);
  a2.add(mesh(new THREE.CylinderGeometry(0.007, 0.007, m(0.32), 8), mat, [0, m(0.16), 0]));
  const head = new THREE.Group(); head.position.set(0, m(0.32), 0); head.rotation.z = 0.9; a2.add(head);
  head.add(mesh(new THREE.ConeGeometry(m(0.06), m(0.1), 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x1e2022, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }), [0, -m(0.03), 0]));
  const bulb = mesh(new THREE.SphereGeometry(m(0.022), 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.55).multiplyScalar(on ? 6 : 0.3) }), [0, -m(0.06), 0], [0, 0, 0], false, false);
  head.add(bulb);
  g.userData = { head, bulb };
  return g;
}
export function officeChair({ color = 0x2a2e33, seatH = SEAT_H } = {}) {
  const g = new THREE.Group();
  const fab = memo('chairfab', () => MT.fabric({ base: [70, 76, 86], seed: 12, weave: 110, size: 256 }));
  const mat = new THREE.MeshStandardMaterial({ map: fab.map, bumpMap: fab.bump, bumpScale: 0.6, roughness: 0.95, color });
  const blk = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.5, metalness: 0.3 });
  g.add(mesh(rbox(0.5, 0.08, 0.48, 0.03), mat, [0, seatH - 0.04, 0]));
  const back = mesh(rbox(0.47, 0.58, 0.06, 0.03), mat, [0, seatH + 0.4, -0.25], [-0.08, 0, 0]); g.add(back);
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.3, 0.03), blk, [0, seatH + 0.08, -0.25]));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, seatH - 0.14, 12), blk, [0, (seatH - 0.14) / 2 + 0.06, 0]));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(mesh(new THREE.BoxGeometry(0.035, 0.03, 0.3), blk, [Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15], [0, a, 0])); g.add(mesh(new THREE.SphereGeometry(0.028, 10, 8), blk, [Math.sin(a) * 0.3, 0.028, Math.cos(a) * 0.3])); }
  for (const s of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), blk, [s * 0.25, seatH + 0.06, -0.02])); g.add(mesh(rbox(0.06, 0.03, 0.26, 0.01), blk, [s * 0.25, seatH + 0.17, 0.0])); }
  return g;
}

// the kraft box: long axis along local x (head end at -x), two long flaps hinged on the z edges, two tissue sheets.
export function kraftBox() {
  const g = new THREE.Group();
  const L = m(0.36), W = m(0.14), H = m(0.1), t = 0.004;
  const kt = kraftTex();
  const kraft = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.92, side: THREE.DoubleSide });
  const kraftIn = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.95, color: 0xd8c8b0, side: THREE.DoubleSide });
  g.add(mesh(new THREE.BoxGeometry(L, t, W), kraftIn, [0, t / 2, 0]));
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(L, H, t), kraft, [0, H / 2, s * (W / 2 - t / 2)]));
    g.add(mesh(new THREE.BoxGeometry(t, H, W), kraft, [s * (L / 2 - t / 2), H / 2, 0]));
  }
  // flaps: pivot on the top z-edges; closed = pointing to the middle (rotation 0)
  const flaps = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0, H, s * W / 2); g.add(p);
    const f = mesh(new THREE.BoxGeometry(L - 0.004, 0.003, W / 2 - 0.002), kraft, [0, 0.0015, -s * (W / 4)]); p.add(f);
    flaps.push(p);
  }
  // tissue: two crinkled sheets hinged just inside the walls
  const tissueM = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.85, side: THREE.DoubleSide, emissive: new THREE.Color(0.08, 0.08, 0.075) });
  const tissues = [];
  const N = MT.makeNoise(77);
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0, H - 0.012, s * (W / 2 - 0.006)); g.add(p);
    const geo = new THREE.PlaneGeometry(L - 0.02, W * 0.62, 24, 8); geo.rotateX(-Math.PI / 2);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); pa.setY(i, (N.fbm(x * 30 + s * 5, z * 40, 3) - 0.5) * 0.012 - Math.abs(z) * 0.05); }
    geo.computeVertexNormals(); geo.translate(0, 0, -s * W * 0.31);
    const tm = mesh(geo, tissueM, [0, 0, 0], [0, 0, 0], true, true); p.add(tm); tissues.push(p);
  }
  g.userData = { L, W, H, flaps, tissues, setOpen(fl, ts) { flaps.forEach((p, i) => { const s = i === 0 ? -1 : 1; p.rotation.x = s * fl; }); tissues.forEach((p, i) => { const s = i === 0 ? -1 : 1; p.rotation.x = s * ts; }); } };
  g.userData.setOpen(0, 0);
  return g;
}
export function cardMesh(tex, w = m(0.1), h = m(0.14)) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide });
  const back = new THREE.MeshStandardMaterial({ color: 0xece3cf, roughness: 0.85, side: THREE.DoubleSide });
  const top = mesh(new THREE.PlaneGeometry(w, h), mat, [0, 0.0012, 0], [-Math.PI / 2, 0, 0], true, true); g.add(top);
  const bot = mesh(new THREE.BoxGeometry(w * 0.995, 0.0012, h * 0.995), back, [0, 0.0, 0]); g.add(bot);
  return g;
}

// ------------------------------------------------------------------ figures
const shinyMat = { m: null };
export function woodFor(kind) {
  if (kind === 'shiny') {
    if (!shinyMat.m) { shinyMat.m = woodMaterial({ seed: 23, base: [240, 214, 178], dark: [214, 176, 132], roughness: 0.22, clearcoat: 1.0, bumpScale: 0.15 }); shinyMat.m.clearcoatRoughness = 0.04; shinyMat.m.sheen = 0; }
    return shinyMat.m;
  }
  return null;
}
// figure() wrapper that also accepts the lacquered 'shiny' wood
export function fig({ kind = 'beech', seed = 5, pose = {}, scale = 1, rotY = 0, pos = [0, 0, 0] } = {}) {
  if (kind !== 'shiny') return F.figure({ kind, seed, pose, scale, rotY, pos });
  const f = buildMannequin({ material: woodFor('shiny') }); f.setPose(pose);
  const g = new THREE.Group(); g.add(f.root); g.scale.setScalar(scale); g.position.set(...pos); g.rotation.y = rotY * Math.PI / 180; f.group = g; return f;
}

// ------------------------------------------------------------------ the office
// opts: { worker: true, colleagues: true, lowDetail: false }
export function buildOffice(scene, renderer, opts = {}) {
  RectAreaLightUniformsLib.init();
  const O = { lights: [] };
  const root = new THREE.Group(); scene.add(root);
  // floor: warm grey carpet tiles
  const fl = memo('carpet', () => MT.tiles({ base: [112, 110, 104], grout: [100, 98, 93], n: 8, seed: 5, groutW: 0.006, size: 512 }));
  fl.map.repeat.set(10, 10); fl.bump.repeat.set(10, 10);
  root.add(mesh(new THREE.PlaneGeometry(36, 36), new THREE.MeshStandardMaterial({ map: fl.map, bumpMap: fl.bump, bumpScale: 0.3, roughness: 0.97 }), [8, 0, -2], [-Math.PI / 2, 0, 0], false, true));
  // ceiling + LED lines
  const ceilM = new THREE.MeshStandardMaterial({ color: 0xd8dadb, roughness: 0.95 });
  root.add(mesh(new THREE.PlaneGeometry(36, 36), ceilM, [8, CEIL_Y, -2], [Math.PI / 2, 0, 0], false, true));
  const ledList = [];
  for (let iz = -5; iz <= 3; iz++) for (let ix = 0; ix < 4; ix++) ledList.push([new THREE.BoxGeometry(2.4, 0.02, 0.07), M4(0.4 + ix * 3.1, CEIL_Y - 0.012, iz * 2.2 + 0.7)]);
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 1.0, 1.0).multiplyScalar(3) });
  root.add(merged(ledList, ledMat, false, false));
  O.ledMat = ledMat;
  // window wall: ledge + panel below + mullions + glass
  const pl = memo('sillwood', () => MT.planks({ base: [196, 160, 118], dark: [160, 122, 84], planksAcross: 2, seed: 33, size: 512 }));
  const sillM = MT.texMat({ map: pl.map, rough: pl.rough, roughness: 0.5, repeat: [1, 6] });
  root.add(mesh(new THREE.BoxGeometry(SILL_IN - WX + 0.04, 0.04, 24), sillM, [(WX + SILL_IN) / 2, SILL_Y - 0.02, -2]));
  const panelM = new THREE.MeshStandardMaterial({ color: 0xe4e3de, roughness: 0.8 });
  root.add(mesh(new THREE.BoxGeometry(0.03, SILL_Y - 0.04, 24), panelM, [SILL_IN - 0.015, (SILL_Y - 0.04) / 2, -2]));
    const mullM = new THREE.MeshStandardMaterial({ color: 0x3a3e42, roughness: 0.45, metalness: 0.5 });
  const mull = [];
  for (let z = -13; z <= 9; z += m(1.5)) mull.push([new THREE.BoxGeometry(0.06, CEIL_Y - SILL_Y, 0.07), M4(WX, (CEIL_Y + SILL_Y) / 2, z)]);
  mull.push([new THREE.BoxGeometry(0.08, 0.08, 24), M4(WX, SILL_Y + 0.03, -2)]);
  mull.push([new THREE.BoxGeometry(0.1, 0.12, 24), M4(WX, CEIL_Y - 0.06, -2)]);
  root.add(merged(mull, mullM));
  root.add(mesh(new THREE.BoxGeometry(0.12, SILL_Y + 1.5, 24), new THREE.MeshStandardMaterial({ color: 0x4a4e52, roughness: 0.7 }), [WX - 0.08, (SILL_Y - 1.5) / 2 - 0.02, -2]));
  root.add(mesh(new THREE.BoxGeometry(0.2, 0.05, 24), mullM, [WX - 0.1, SILL_Y - 0.02, -2]));
  // outside: sky dome + buildings across the street (office is on a high floor)
  const sky = PR.daySky({ radius: 280, sunDir: [-0.7, 0.3, 0.2], sunSize: 0.9993 }); root.add(sky); O.sky = sky;
  const bMat = (seed) => new THREE.ShaderMaterial({
    uniforms: { dayMap: { value: facadeDay(seed) }, nightMap: { value: facadeNight(seed) }, dayCol: { value: new THREE.Vector3(1, 1, 1) }, nightAmt: { value: 0 }, rep: { value: new THREE.Vector2(1, 1) }, haze: { value: 0.3 }, hazeCol: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: `varying vec2 vUv; uniform vec2 rep; void main(){ vUv = uv*rep; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D dayMap, nightMap; uniform vec3 dayCol, hazeCol; uniform float nightAmt, haze; varying vec2 vUv;
      void main(){ vec3 d = texture2D(dayMap, vUv).rgb; vec3 n = texture2D(nightMap, vUv).rgb; d = pow(d, vec3(2.2)); n = pow(n, vec3(2.2));
        gl_FragColor = vec4(mix(d*dayCol, hazeCol, haze) + n*nightAmt*2.5, 1.); }`,
  });
  const rng = C.mulberry32(17); O.bMats = [];
  const blds = [];
  for (let i = 0; i < 14; i++) blds.push([10 + rng() * 12, 10 + rng() * 10, 8 + rng() * 14, -34 + i * 5.6 + rng() * 2, WX - 45 - rng() * 20, -20]);
  for (let i = 0; i < 5; i++) blds.push([8 + rng() * 8, 10, 30 + rng() * 40, -80 + i * 34 + rng() * 10, WX - 150 - rng() * 60, -20]);
  for (let i = 0; i < blds.length; i++) {
    const [w, d, h, z, x, y0] = blds[i];
    const mt = bMat(1 + (i % 5)); mt.uniforms.dayMap.value = facadeDay(1 + (i % 5)).clone(); mt.uniforms.dayMap.value.wrapS = mt.uniforms.dayMap.value.wrapT = THREE.RepeatWrapping; mt.uniforms.dayMap.value.needsUpdate = true;
    mt.uniforms.nightMap.value = facadeNight(1 + (i % 5)).clone(); mt.uniforms.nightMap.value.wrapS = mt.uniforms.nightMap.value.wrapT = THREE.RepeatWrapping; mt.uniforms.nightMap.value.needsUpdate = true;
    mt.uniforms.rep.value.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 14)));
    mt.uniforms.haze.value = Math.min(0.75, (-x - 40) / 200); const b = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), mt); b.position.set(x, y0 + h / 2, z); root.add(b); O.bMats.push(mt);
  }
  // our desk + pod
  const top = memo('desktop', () => { const N = MT.makeNoise(21); return { map: MT.canvasTexture(512, (u, v, o) => { const g = N.fbm(u * 3, v * 40, 4) , f = N.fbm(u * 60, v * 400, 2); const t = Math.min(1, Math.max(0, (g - 0.35) * 1.4 + (f - 0.5) * 0.25)); o[0] = 222 - t * 30; o[1] = 200 - t * 32; o[2] = 168 - t * 34; }) }; });
  const topM = MT.texMat({ map: top.map, roughness: 0.38, repeat: [1, 1] });
  const legM = new THREE.MeshStandardMaterial({ color: 0xe8e8e6, roughness: 0.4, metalness: 0.3 });
  const dW = DESK.x1 - DESK.x0, dD = DESK.z1 - DESK.z0;
  const deskTops = [], deskLegs = [];
  const addDesk = (x0, z0, x1, z1) => {
    deskTops.push([PR.rbox(x1 - x0, 0.03, z1 - z0, 0.006, 2), M4((x0 + x1) / 2, DESK_Y - 0.015, (z0 + z1) / 2)]);
    for (const [lx, lz] of [[x0 + 0.05, z0 + 0.05], [x1 - 0.05, z0 + 0.05], [x0 + 0.05, z1 - 0.05], [x1 - 0.05, z1 - 0.05]]) deskLegs.push([new THREE.BoxGeometry(0.045, DESK_Y - 0.03, 0.045), M4(lx, (DESK_Y - 0.03) / 2, lz)]);
    deskLegs.push([new THREE.BoxGeometry(x1 - x0 - 0.1, 0.05, 0.02), M4((x0 + x1) / 2, DESK_Y - 0.06, (z0 + z1) / 2 + (z1 > 0.001 ? -1 : 1) * 0.0)]);
  };
  // pods: rows of desks facing each other across low felt dividers at z = zc; x from the ledge into the room
  const podZ = [0.0, -3.3, -6.6];
  const fab = memo('felt', () => MT.fabric({ base: [96, 110, 120], seed: 14, weave: 60, size: 256 }));
  const feltM = new THREE.MeshStandardMaterial({ map: fab.map, bumpMap: fab.bump, bumpScale: 0.5, roughness: 0.95 });
  const dividers = [], monBodies = [], monScreens = [], bgChairs = [];
  const seats = []; // [x, z, facing(+1 = faces -z)]
  for (const zc of podZ) {
    for (let k = 0; k < 3; k++) {
      const x0 = DESK.x0 + k * (dW + 0.02), x1 = x0 + dW;
      for (const side of [1, -1]) {
        const z0 = side > 0 ? zc : zc - dD, z1 = side > 0 ? zc + dD : zc;
        if (!(zc === 0 && k === 0 && side === 1)) addDesk(x0, z0, x1, z1);
        const mx = (x0 + x1) / 2 + (k === 0 ? MON.x - (DESK.x0 + DESK.x1) / 2 : 0.1), mz = zc + side * (MON.z);
        if (!(zc === 0 && k === 0 && side === 1)) {
          monBodies.push([PR.rbox(0.62, 0.37, 0.025, 0.006, 2), M4(mx, DESK_Y + 0.31, mz - side * 0.014)]);
          monBodies.push([new THREE.BoxGeometry(0.05, 0.26, 0.02), M4(mx, DESK_Y + 0.13, mz - side * 0.04)]);
          monBodies.push([PR.rbox(0.22, 0.012, 0.17, 0.004, 2), M4(mx, DESK_Y + 0.006, mz - side * 0.04)]);
          monScreens.push([new THREE.PlaneGeometry(0.59, 0.33), M4(mx, DESK_Y + 0.31, mz + side * 0.0005, side > 0 ? 0 : Math.PI)]);
        }
        seats.push([(x0 + x1) / 2 + (k === 0 ? KB.x - (DESK.x0 + DESK.x1) / 2 : 0.1), zc + side * (WORKER_SEAT.z), side, k]);
      }
      dividers.push([PR.rbox(dW, 0.3, 0.025, 0.01, 2), M4((x0 + x1) / 2, DESK_Y + 0.15, zc)]);
    }
  }
  root.add(merged(deskTops, topM));
  root.add(merged(deskLegs, legM));
  root.add(merged(dividers, feltM));
  const monM = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.4, metalness: 0.2 });
  root.add(merged(monBodies, monM));
  const bgScrTex = screenTex('doc', 5).clone(); bgScrTex.needsUpdate = true;
  const bgScrM = new THREE.MeshBasicMaterial({ map: bgScrTex, color: new THREE.Color(1, 1, 1).multiplyScalar(1.1) });
  root.add(merged(monScreens, bgScrM, false, false)); O.bgScrM = bgScrM;
  // our desk (separate so it can carry props precisely)
  const myTop = mesh(PR.rbox(dW, 0.03, dD, 0.006, 2), topM, [(DESK.x0 + DESK.x1) / 2, DESK_Y - 0.015, (DESK.z0 + DESK.z1) / 2]); root.add(myTop);
  for (const [lx, lz] of [[DESK.x0 + 0.05, DESK.z0 + 0.05], [DESK.x1 - 0.05, DESK.z0 + 0.05], [DESK.x0 + 0.05, DESK.z1 - 0.05], [DESK.x1 - 0.05, DESK.z1 - 0.05]]) root.add(mesh(new THREE.BoxGeometry(0.045, DESK_Y - 0.03, 0.045), legM, [lx, (DESK_Y - 0.03) / 2, lz]));
  // our monitor
  const mon = new THREE.Group(); mon.position.set(MON.x, DESK_Y, MON.z); mon.rotation.y = MON.ry; root.add(mon); O.mon = mon;
  mon.add(mesh(PR.rbox(0.62, 0.37, 0.025, 0.006, 2), monM, [0, 0.31, -0.014]));
  mon.add(mesh(new THREE.BoxGeometry(0.05, 0.26, 0.02), monM, [0, 0.13, -0.04]));
  mon.add(mesh(PR.rbox(0.22, 0.012, 0.17, 0.004, 2), monM, [0, 0.006, -0.02]));
  const scrM = new THREE.MeshBasicMaterial({ map: screenTex('doc', 3), color: new THREE.Color(1, 1, 1) });
  const scr = mesh(new THREE.PlaneGeometry(0.59, 0.33), scrM, [0, 0.31, 0.0005], [0, 0, 0], false, false); mon.add(scr);
  O.scrM = scrM; O.scrTex = { doc: screenTex('doc', 3), sheet: screenTex('sheet', 4), mail: screenTex('mail', 6), night: screenTex('night', 7) };
  const monLight = new THREE.RectAreaLight(new THREE.Color(0.8, 0.9, 1.0), 3, 0.59, 0.33); monLight.position.set(0, 0.31, 0.01); monLight.lookAt(0, 0.31, 2); mon.add(monLight); O.monLight = monLight;
  // sticky notes on the bezel (count grows with days)
  const stickyM = [0xf2d64b, 0xf2a84b, 0xa8e07a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide }));
  O.stickies = [];
  const stickyPos = [[-0.33, 0.44, 0.1], [-0.33, 0.37, -0.12], [0.33, 0.45, 0.08], [-0.33, 0.24, 0.06], [0.2, 0.505, 0.02], [-0.1, 0.505, -0.05]];
  stickyPos.forEach(([x, y, r], i) => { const s = mesh(new THREE.PlaneGeometry(0.07, 0.07), stickyM[i % 3], [x, y - 0.04, 0.002], [0, 0, r], false, true); s.visible = false; mon.add(s); O.stickies.push(s); });
  // keyboard + mouse
  const kbT = memo('kb', () => MD.keyboardTex());
  const kb = new THREE.Group(); kb.position.set(KB.x, DESK_Y, KB.z); root.add(kb);
  kb.add(mesh(PR.rbox(0.48, 0.022, 0.15, 0.006, 2), new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.5 }), [0, 0.011, 0]));
  kb.add(mesh(new THREE.PlaneGeometry(0.45, 0.13), new THREE.MeshStandardMaterial({ map: kbT, roughness: 0.6 }), [0, 0.0225, 0], [-Math.PI / 2, 0, 0], false, true));
  root.add(mesh(PR.rbox(0.07, 0.03, 0.11, 0.03, 3), new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.4 }), [KB.x + 0.36, DESK_Y + 0.015, KB.z + 0.02]));
  // mug, plant (on the ledge), pen pot, lamp, papers
  const mg = mug(); mg.position.copy(MUG); mg.rotation.y = 2.4; root.add(mg); O.mug = mg;
  const pt = plant(); pt.position.set(WX + 0.2, SILL_Y, 0.62); root.add(pt);
  const pt2 = plant(); pt2.position.set(WX + 0.2, SILL_Y, -0.35); pt2.scale.setScalar(1.3); root.add(pt2);
  const pp = penPot(); pp.position.set(0.28, DESK_Y, 0.1); root.add(pp);
  const lamp = deskLamp({ on: false }); lamp.position.set(0.52, DESK_Y, 0.08); lamp.rotation.y = Math.PI * 0.62; root.add(lamp); O.lamp = lamp;
  const paperM = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.9 });
  for (let i = 0; i < 5; i++) root.add(mesh(new THREE.BoxGeometry(m(0.21), 0.003, m(0.297)), paperM, [0.36 + i * 0.004, DESK_Y + 0.002 + i * 0.003, 0.52], [0, 0.1 + i * 0.06, 0]));
  O.papers = [];
  for (let i = 0; i < 8; i++) { const p = mesh(new THREE.BoxGeometry(m(0.21), 0.003, m(0.297)), paperM, [0.36 + (i % 3) * 0.01, DESK_Y + 0.018 + i * 0.004, 0.53], [0, -0.2 + i * 0.13, 0]); p.visible = false; root.add(p); O.papers.push(p); }
  // chairs for other seats, our chair
  const chairs = [];
  O.chairSpots = seats;
  O.myChair = officeChair(); O.myChair.position.copy(WORKER_SEAT); O.myChair.rotation.y = Math.PI; root.add(O.myChair);
  for (const [x, z, side, k] of seats) {
    if (Math.abs(z - WORKER_SEAT.z) < 0.01 && k === 0) continue;
    const c = officeChair(); c.position.set(x + 0.05, 0, z + side * 0.05); c.rotation.y = side > 0 ? Math.PI : 0; root.add(c); chairs.push(c);
  }
  // shared table in the open area beyond our pod (for the ending)
  const tb = MD.table({ pos: [0.9, 0, 3.1], w: 2.4, d: 0.95, h: DESK_Y }); root.add(tb);
  for (const [cx, cz, ry] of [[0.1, 2.45, 0], [0.9, 2.45, 0], [1.7, 2.45, 0], [0.1, 3.75, Math.PI], [0.9, 3.75, Math.PI], [1.7, 3.75, Math.PI]]) root.add(MD.chair({ pos: [cx, 0, cz], rotY: ry, seatH: SEAT_H }));
  const bigPlant = plant(); bigPlant.position.set(2.6, 0, 3.0); bigPlant.scale.setScalar(4.2); root.add(bigPlant);
  const tb2 = MD.table({ pos: [6.6, 0, -1.65], w: 2.2, d: 0.95, h: DESK_Y, rotY: Math.PI / 2 }); root.add(tb2);
  O.bigPlants = [];
  for (const [px, pz, sc] of [[5.2, -0.9, 5.0], [5.3, -2.5, 4.2], [8.6, -1.2, 5.5]]) { const bp = plant(); bp.position.set(px, 0, pz); bp.scale.setScalar(sc); root.add(bp); O.bigPlants.push(bp); }
  // back wall (far +x), columns
  const pw = memo('plaster', () => MT.plaster({ base: [206, 204, 198], seed: 8, size: 256 }));
  const wallM = MT.texMat({ map: pw.map, bump: pw.bump, bumpScale: 0.4, roughness: 0.92, repeat: [6, 2] });
  root.add(mesh(new THREE.PlaneGeometry(36, CEIL_Y), wallM, [9.0, CEIL_Y / 2, -2], [0, -Math.PI / 2, 0], false, true));
  root.add(mesh(new THREE.PlaneGeometry(20, CEIL_Y), wallM, [0, CEIL_Y / 2, 7.5], [0, Math.PI, 0], false, true));
  root.add(mesh(new THREE.PlaneGeometry(20, CEIL_Y), wallM, [0, CEIL_Y / 2, -11.5], [0, 0, 0], false, true));
  for (const [x, z] of [[3.6, -4.95], [3.6, -8.2], [7.4, -4.95], [7.4, 4.8]]) root.add(mesh(new THREE.BoxGeometry(0.4, CEIL_Y, 0.4), wallM, [x, CEIL_Y / 2, z]));
  // lights
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.004; Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 30 });
  sun.target.position.set(-0.6, DESK_Y, 0.4); root.add(sun, sun.target); O.sun = sun;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1); root.add(hemi); O.hemi = hemi;
  // soft sky fill through the glass (non-shadowing area light facing into the room)
  const skyFill = new THREE.DirectionalLight(0xffffff, 1.5); skyFill.position.set(WX - 4, 2.6, 0.2); skyFill.target.position.set(0, 0.9, 0.2); root.add(skyFill, skyFill.target); O.skyFill = skyFill;
  // ceiling fill (office lights)
  const ceil = new THREE.DirectionalLight(new THREE.Color(0.95, 1.0, 1.0), 0.5); ceil.position.set(0.9, CEIL_Y, 0.9); ceil.target.position.set(0.4, 0, 0.4); root.add(ceil, ceil.target); O.ceil = ceil;
  // warm desk lamp spot (used at night / for the card)
  const lampSpot = new THREE.SpotLight(new THREE.Color(1.0, 0.72, 0.45), 0, 0, 0.9, 0.6, 2); lampSpot.position.set(0.1, DESK_Y + 0.5, 0.25); lampSpot.target.position.set(-0.1, DESK_Y, 0.55); root.add(lampSpot, lampSpot.target); O.lampSpot = lampSpot;
  scene.environment = C.gradientEnv(renderer, { top: [0.35, 0.38, 0.42], horizon: [0.3, 0.3, 0.3], bottom: [0.12, 0.12, 0.12], panels: [{ pos: [-10, 1.5, 0], w: 8, h: 4, color: [1, 1, 1], intensity: 2 }] });
  scene.environmentIntensity = 0.35;
  O.root = root; O.chairs = chairs;
  // phase application
  O.setPhase = (P, { sunTarget = null, shadowBox = null } = {}) => {
    const u = sky.material.uniforms; u.zen.value.set(...P.zen); u.hor.value.set(...P.hor); u.gnd.value.set(...P.gnd);
    const sd = new THREE.Vector3(...P.sunDir).normalize(); u.sd.value.copy(sd); u.gl.value.set(...P.glow); u.sc.value.set(...(P.sunI > 0 ? P.sunCol.map(c => c * 30) : [0, 0, 0]));
    const tgt = sunTarget || sun.target.position; sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sd, 12);
    if (shadowBox) Object.assign(sun.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox });
    sun.shadow.camera.updateProjectionMatrix();
    sun.color.setRGB(...P.sunCol); sun.intensity = P.sunI; sun.visible = P.sunI > 0.01;
    hemi.color.setRGB(...P.hemiSky); hemi.groundColor.setRGB(...P.hemiGnd); hemi.intensity = P.hemiI;
    const skyC = new THREE.Vector3(...P.hor).lerp(new THREE.Vector3(...P.zen), 0.4);
    const mx = Math.max(skyC.x, skyC.y, skyC.z, 1e-3); skyFill.color.setRGB(skyC.x / mx, skyC.y / mx, skyC.z / mx); skyFill.intensity = 1.5 * P.fill;
    ceil.intensity = 0.55 * P.ceil; ledMat.color.setRGB(0.95, 1.0, 1.0).multiplyScalar(0.3 + 2.7 * P.ceil);
    scrM.color.setScalar(P.mon); monLight.intensity = 2.5 * P.mon * (P.night > 0.5 ? 1.6 : 1); bgScrM.color.setScalar(1.1 * P.mon);
    for (const mt of O.bMats) { mt.uniforms.dayCol.value.set(...P.city); mt.uniforms.nightAmt.value = P.night; mt.uniforms.hazeCol.value.set(...P.hor).multiplyScalar(0.8); }
    lampSpot.intensity = P.lamp; lamp.userData.bulb.material.color.setRGB(1, 0.8, 0.55).multiplyScalar(P.lamp > 0 ? 6 : 0.3);
  };
  O.setPhase(PHASES.morning);
  return O;
}
