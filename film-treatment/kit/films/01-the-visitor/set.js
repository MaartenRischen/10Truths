// THE VISITOR — one continuous flat at night, built once and shot from many angles.
// Plan (scene units, figure = 2.0 tall): flat interior x -3.6..3.6, z 0..6.4, ceiling 2.95.
//   north wall z=0: floor-to-ceiling glazing onto a balcony and the city.  sofa faces +z (south) toward the front door.
//   east wall: kitchenette (sink + tap, fridge at the south end).  west wall: sideboard + speaker, bedroom doorway.
//   south wall: front door (hinge west) + light switch; beyond it the corridor of closed doors.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from '../../scenes/E/lib/cine.js';
import * as MT from '../../scenes/E/lib/mat.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as MD from '../../scenes/E/lib/modern.js';

const { mulberry32 } = C;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const col = (r, g, b, k = 1) => new THREE.Color(r, g, b).multiplyScalar(k);

export const FL = {
  x0: -3.6, x1: 3.6, z0: 0, z1: 6.4, H: 3.3, T: 0.14,
  sofa: { x: -1.1, z: 1.05, w: 2.6, d: 1.0, seatH: 0.44 },
  seatY: 0.465,                               // top of the seat cushions
  hostSeat: [-1.46, 1.0], visSeat: [-0.84, 1.0],
  table: { x: -1.1, z: 2.22, w: 1.15, d: 0.62, h: 0.42 },
  door: { x0: -2.12, x1: -1.07, h: 2.3 },    // front door, hinge at x0, opens inward (toward -z)
  sw: { x: -0.8, y: 1.22 },                  // light switch on the south wall
  hall: { x: -1.3, z: 5.45 },                // hall ceiling light
  bedDoor: { z0: 3.3, z1: 4.35, h: 2.3 },    // doorway in the west wall
  glaze: [-3.45, -2.1, -0.75, 0.6, 1.95],    // window mullions; last panel = balcony door
  kit: { xf: 2.92, z0: 0.9, z1: 4.05, top: 1.0, sinkZ: 2.0 },
  fridge: { cx: 3.25, cz: 4.56, W: 0.82, D: 0.7, H: 1.95 },
  stool: [2.35, 3.1],
  side: { x: -3.38, z0: 1.3, z1: 2.75, h: 0.72 }, // sideboard along the west wall
  speaker: [-3.36, 0.72, 1.72],
  lampBase: [0.52, 0.32], lampShade: [-1.15, 2.08, 1.0],
  cor: { z0: 6.54, z1: 8.3, x0: -16, x1: 9 },
  bed: { x0: -7.6, z0: 1.9, z1: 6.4 },
};

// ------------------------------------------------------------------ textures / materials
export function feedTex(seed = 5) { // tall generic social feed (no brands): cards with images, bars, hearts
  const W = 360, H = 2600, rng = mulberry32(seed);
  return MT.drawTexture(W, H, (g) => {
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, W, H);
    let y = 20;
    while (y < H) {
      const hue = Math.floor(rng() * 360);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(34, y + 22, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(58, y + 14, 90 + rng() * 60, 8); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(58, y + 28, 60 + rng() * 40, 6);
      const ih = 180 + rng() * 120; const gr = g.createLinearGradient(0, y + 48, W, y + 48 + ih);
      gr.addColorStop(0, `hsl(${hue},55%,${45 + rng() * 20}%)`); gr.addColorStop(1, `hsl(${(hue + 40) % 360},60%,${30 + rng() * 25}%)`);
      g.fillStyle = gr; g.fillRect(12, y + 48, W - 24, ih);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(12 + (W - 24) * (0.3 + rng() * 0.4), y + 48 + ih * 0.45, ih * 0.22, 0, Math.PI * 2); g.fill();
      PR.drawHeart(g, 30, y + 48 + ih + 26, 9, '#ff5a6e');
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(52, y + ih + 68, 40, 6);
      for (let k = 0; k < 2; k++) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(16, y + ih + 90 + k * 14, 150 + rng() * 170, 7); }
      y += ih + 130;
    }
  }, { wrap: true });
}

// chat screen: state s in [0,1] typing progress, sent flag. Unreadable by design (bars, no letters).
export function chatTex({ typed = 0, sent = false, W = 360, H = 740 } = {}) {
  return MT.drawTexture(W, H, (g) => {
    g.fillStyle = '#10151c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1a212b'; g.fillRect(0, 0, W, 70);
    // group avatars
    for (let i = 0; i < 4; i++) { g.fillStyle = ['#e9b99a', '#9ec5e8', '#f2d28b', '#a8dcc8'][i]; g.beginPath(); g.arc(60 + i * 22, 36, 15, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1a212b'; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(160, 28, 110, 9); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(160, 44, 70, 6);
    // old grey thread (long ago)
    const bub = (x, y, w, h, c) => { g.fillStyle = c; PR.roundRect(g, x, y, w, h, 16); g.fill(); };
    bub(16, 100, 190, 44, '#2a313c'); bub(16, 152, 130, 44, '#2a313c'); bub(150, 214, 190, 44, '#2d5f8a');
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(W / 2 - 40, 280, 80, 6);
    // the new message
    const n = Math.round(typed * 7);
    if (sent) { bub(W - 16 - 170, 310, 170, 50, '#3a8ee6'); g.fillStyle = 'rgba(255,255,255,0.85)'; for (let k = 0; k < 4; k++) g.fillRect(W - 170 + k * 34, 330, 26, 9); }
    // input field + keyboard
    g.fillStyle = '#1a212b'; g.fillRect(0, H - 330, W, 330);
    g.fillStyle = '#2a313c'; PR.roundRect(g, 14, H - 318, W - 80, 44, 22); g.fill();
    if (!sent) { g.fillStyle = 'rgba(255,255,255,0.85)'; for (let k = 0; k < n; k++) g.fillRect(32 + k * 30, H - 301, 22, 9); if (n > 0) { g.fillStyle = '#3a8ee6'; g.fillRect(32 + n * 30, H - 308, 3, 24); } }
    g.fillStyle = sent || n === 0 ? '#2a313c' : '#3a8ee6'; g.beginPath(); g.arc(W - 36, H - 296, 20, 0, Math.PI * 2); g.fill();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) { if (r === 3 && (c < 2 || c > 7)) continue; g.fillStyle = '#39414d'; PR.roundRect(g, 8 + c * 34.4, H - 256 + r * 58, 29, 48, 6); g.fill(); }
    const hk = Math.floor(typed * 23) % 30; if (!sent && typed > 0 && typed < 1) { g.fillStyle = '#6b7686'; PR.roundRect(g, 8 + (hk % 10) * 34.4, H - 256 + (hk % 3) * 58, 29, 48, 6); g.fill(); }
  });
}

function artTex(seed = 2) { // abstract print for the wall
  const rng = mulberry32(seed);
  return MT.drawTexture(256, 340, (g, W, H) => {
    g.fillStyle = '#d9d2c3'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { g.fillStyle = ['#c4962c', '#2d6b6b', '#8a3a2a', '#23303b', '#b8b0a0'][i]; g.globalAlpha = 0.85; g.beginPath(); g.arc(W * (0.25 + rng() * 0.5), H * (0.2 + rng() * 0.6), 30 + rng() * 60, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  });
}

// facade with balconies: grid of window cells, some lit; returns group (for the balcony shot and the window view)
function balconyTower({ pos = [0, 0, -28], w = 34, h = 110, floorH = 3.0, bayW = 4.2, seed = 4, lit = 0.35, rotY = 0 } = {}) {
  const g = new THREE.Group(); const rng = mulberry32(seed);
  const cols = Math.floor(w / bayW), rows = Math.floor(h / floorH);
  const tex = MT.drawTexture(cols * 32, rows * 24, (c, W, H) => {
    c.fillStyle = '#0b0d10'; c.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const on = rng() < lit; const warm = rng() < 0.72; const v = (warm ? 0.5 : 0.3) + rng() * 0.3;
      const x0 = k * 32 + 3, y0 = r * 24 + 5;
      if (!on) { c.fillStyle = '#121519'; c.fillRect(x0, y0, 26, 16); continue; }
      const rgb = (m) => warm ? `rgb(${255 * v * m | 0},${172 * v * m | 0},${100 * v * m | 0})` : `rgb(${140 * v * m | 0},${178 * v * m | 0},${235 * v * m | 0})`;
      const g = c.createLinearGradient(0, y0, 0, y0 + 16); g.addColorStop(0, rgb(1.0)); g.addColorStop(1, rgb(0.42));
      c.fillStyle = g; c.fillRect(x0, y0, 26, 16);
      c.fillStyle = '#0b0d10'; c.fillRect(x0 + 12, y0, 2, 16);
      if (rng() < 0.6) { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x0 + (rng() < 0.5 ? 0 : 15), y0, 11, 16); }
      if (rng() < 0.45) { c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(x0 + rng() * 18, y0 + 9, 7, 7); }
    }
  });
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, color: col(1, 1, 1, 0.75) });
  const body = PR.mesh(new THREE.BoxGeometry(w, h, 14), [0, 1, 2, 3, 4, 5].map(i => i === 4 ? faceMat : new THREE.MeshBasicMaterial({ color: 0x07080a })), [0, h / 2, -7], [0, 0, 0], false, false);
  g.add(body);
  // balcony slabs + rails, instanced (all empty)
  const slabG = new THREE.BoxGeometry(bayW * 0.8, 0.18, 1.4), railG = new THREE.BoxGeometry(bayW * 0.8, 0.9, 0.04);
  const slabM = new THREE.MeshStandardMaterial({ color: 0x50545a, roughness: 0.9 });
  const railM = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.85 });
  const n = rows * cols; const IS = new THREE.InstancedMesh(slabG, slabM, n), IR = new THREE.InstancedMesh(railG, railM, n);
  const m4 = new THREE.Matrix4(); let i = 0;
  for (let r = 1; r < rows; r++) for (let k = 0; k < cols; k++) {
    if ((r + k) % 2) continue; // staggered balconies
    const x = -w / 2 + (k + 0.5) * (w / cols), y = r * (h / rows);
    m4.makeTranslation(x, y, 0.7); IS.setMatrixAt(i, m4); m4.makeTranslation(x, y + 0.5, 1.38); IR.setMatrixAt(i, m4); i++;
  }
  IS.count = IR.count = i; g.add(IS, IR);
  g.position.set(...pos); g.rotation.y = rotY;
  return g;
}

// ------------------------------------------------------------------ the world
export function buildWorld(renderer) {
  RectAreaLightUniformsLib.init();
  const root = new THREE.Group(); root.name = 'world';
  const add = (m) => { root.add(m); return m; };
  const S = {}; // handles
  const { x0, x1, z0, z1, H, T } = FL;

  // materials
  const pl = MT.plaster({ base: [168, 172, 170], seed: 3 });
  const wallMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.5, roughness: 0.92, repeat: [3, 2] });
  const ceilMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.3, roughness: 0.95, repeat: [3, 3], color: 0xd8d8d8 });
  const fl = MT.planks({ base: [148, 112, 80], dark: [100, 74, 52], planksAcross: 6, seed: 7 });
  const floorMat = MT.texMat({ map: fl.map, rough: fl.rough, roughness: 0.5, repeat: [1.6, 1.6] });
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xcfd0cc, roughness: 0.6 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.45, metalness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb0b2b4, metalness: 1, roughness: 0.22 });
  S.mats = { wallMat, floorMat, steel };

  // ---------------- floor / ceiling
  add(PR.mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), floorMat, [(x0 + x1) / 2, 0, (z0 + z1) / 2], [-Math.PI / 2, 0, 0], false, true));
  add(PR.mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), ceilMat, [(x0 + x1) / 2, H, (z0 + z1) / 2], [Math.PI / 2, 0, 0], false, true));
  // rug under the coffee table
  const rugF = MT.fabric({ base: [120, 104, 92], seed: 9, weave: 60 });
  add(PR.mesh(PR.rbox(2.2, 0.012, 1.5, 0.005, 1), MT.texMat({ map: rugF.map, bump: rugF.bump, bumpScale: 0.8, roughness: 1, repeat: [3, 2], color: 0x9a8f86 }), [FL.table.x, 0.006, FL.table.z - 0.05], [0, 0, 0], false, true));
  // doormat inside the front door
  add(PR.mesh(PR.rbox(0.95, 0.014, 0.55, 0.005, 1), new THREE.MeshStandardMaterial({ color: 0x3b3430, roughness: 1 }), [(FL.door.x0 + FL.door.x1) / 2, 0.007, z1 - 0.45], [0, 0, 0], false, true));

  // ---------------- walls (boxes, so they read from both sides)
  const wall = (cx, cy, cz, w, h, d, mat = wallMat) => add(PR.mesh(new THREE.BoxGeometry(w, h, d), mat, [cx, cy, cz], [0, 0, 0], true, true));
  // south wall with the front door hole
  const { door } = FL;
  wall((x0 - T + door.x0) / 2, H / 2, z1 + T / 2, door.x0 - (x0 - T), H, T);
  wall((door.x1 + x1 + T) / 2, H / 2, z1 + T / 2, x1 + T - door.x1, H, T);
  wall((door.x0 + door.x1) / 2, (door.h + H) / 2, z1 + T / 2, door.x1 - door.x0, H - door.h, T);
  // west wall with the bedroom doorway
  const bd = FL.bedDoor;
  wall(x0 - T / 2, H / 2, (z0 + bd.z0) / 2, T, H, bd.z0 - z0);
  wall(x0 - T / 2, H / 2, (bd.z1 + z1 + T) / 2, T, H, z1 + T - bd.z1);
  wall(x0 - T / 2, (bd.h + H) / 2, (bd.z0 + bd.z1) / 2, T, H - bd.h, bd.z1 - bd.z0);
  // east wall (solid)
  wall(x1 + T / 2, H / 2, (z0 + z1) / 2, T, H, z1 - z0 + 2 * T);
  // north: solid ends + head + sill around the glazing
  const gz = FL.glaze;
  wall((x0 - T + gz[0]) / 2, H / 2, z0 - T / 2, gz[0] - (x0 - T), H, T);
  wall((gz[4] + x1 + T) / 2, H / 2, z0 - T / 2, x1 + T - gz[4], H, T);
  wall((gz[0] + gz[4]) / 2, 3.18 + (H - 3.18) / 2, z0 - T / 2, gz[4] - gz[0], H - 3.18, T);
  wall((gz[0] + gz[4]) / 2, 0.03, z0 - T / 2, gz[4] - gz[0], 0.06, T, darkMetal);
  // skirting
  for (const [cx, cz, w, d] of [[(x0 + door.x0) / 2, z1 - 0.01, door.x0 - x0, 0.02], [(door.x1 + x1) / 2, z1 - 0.01, x1 - door.x1, 0.02], [x0 + 0.01, (z0 + bd.z0) / 2, 0.02, bd.z0 - z0], [x0 + 0.01, (bd.z1 + z1) / 2, 0.02, z1 - bd.z1]])
    add(PR.mesh(new THREE.BoxGeometry(w, 0.09, d), skirtMat, [cx, 0.045, cz], [0, 0, 0], false, true));
  // mullions + glass
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0d12, roughness: 0.05, transparent: true, opacity: 0.1, envMapIntensity: 1.0, depthWrite: false });
  for (const gx of gz) add(PR.mesh(new THREE.BoxGeometry(0.06, 3.12, 0.12), darkMetal, [gx, 1.62, z0 - 0.05]));
  add(PR.mesh(new THREE.BoxGeometry(gz[4] - gz[0], 0.06, 0.12), darkMetal, [(gz[0] + gz[4]) / 2, 3.15, z0 - 0.05]));
  for (let i = 0; i < 3; i++) add(PR.mesh(new THREE.PlaneGeometry(gz[i + 1] - gz[i] - 0.06, 3.09), glassMat, [(gz[i] + gz[i + 1]) / 2, 1.61, z0 - 0.07], [0, 0, 0], false, false));
  // balcony door: sliding glass panel (slides behind panel 3 when open)
  const bdoor = new THREE.Group(); add(bdoor);
  bdoor.add(PR.mesh(new THREE.PlaneGeometry(gz[4] - gz[3] - 0.06, 3.09), glassMat, [0, 1.61, 0], [0, 0, 0], false, false));
  for (const sx of [-1, 1]) bdoor.add(PR.mesh(new THREE.BoxGeometry(0.05, 3.09, 0.05), darkMetal, [sx * (gz[4] - gz[3]) / 2, 1.61, 0]));
  bdoor.add(PR.mesh(new THREE.BoxGeometry(0.02, 0.35, 0.03), steel, [-(gz[4] - gz[3]) / 2 + 0.08, 1.05, 0.03]));
  S.balconyDoor = (open) => { bdoor.position.set((gz[3] + gz[4]) / 2 - open * 1.2, 0, z0 - 0.02); };
  S.balconyDoor(0);
  // sheer curtain bunched at the west end of the glazing
  const curt = MT.fabric({ base: [200, 198, 190], seed: 12, weave: 120 });
  const cg = new THREE.PlaneGeometry(0.7, 3.05, 40, 1); { const p = cg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.035); cg.computeVertexNormals(); }
  add(PR.mesh(cg, new THREE.MeshStandardMaterial({ map: curt.map, color: 0xb9b8b2, roughness: 1, transparent: true, opacity: 0.75, side: THREE.DoubleSide }), [gz[0] + 0.38, 1.6, z0 + 0.12], [0, 0, 0], false, true));

  // ---------------- balcony (outside the glazing)
  const conc = MT.concrete({ base: [104, 106, 108], seed: 21 });
  add(PR.mesh(new THREE.BoxGeometry(gz[4] - gz[0] + 0.4, 0.2, 1.6), MT.texMat({ map: conc.map, bump: conc.bump, roughness: 0.9, repeat: [3, 1] }), [(gz[0] + gz[4]) / 2, -0.12, -0.8 - T], [0, 0, 0], false, true));
  const railGlass = new THREE.MeshPhysicalMaterial({ color: 0x8fa0a8, roughness: 0.08, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  add(PR.mesh(new THREE.PlaneGeometry(gz[4] - gz[0] + 0.3, 1.0), railGlass, [(gz[0] + gz[4]) / 2, 0.5, -1.55], [0, 0, 0], false, false));
  add(PR.mesh(new THREE.BoxGeometry(gz[4] - gz[0] + 0.3, 0.05, 0.08), darkMetal, [(gz[0] + gz[4]) / 2, 1.04, -1.55]));
  for (const sx of [gz[0] - 0.15, gz[4] + 0.15]) add(PR.mesh(new THREE.BoxGeometry(0.2, H, 1.7), MT.texMat({ map: conc.map, bump: conc.bump, roughness: 0.9 }), [sx, H / 2 - 0.05, -0.85 - T], [0, 0, 0], true, true));
  // slab edge / soffit of the balcony above
  add(PR.mesh(new THREE.BoxGeometry(gz[4] - gz[0] + 0.4, 0.22, 1.6), MT.texMat({ map: conc.map, roughness: 0.95, color: 0x8a8c8e }), [(gz[0] + gz[4]) / 2, H + 0.11, -0.8 - T], [0, 0, 0], false, true));

  // ---------------- the city (towers above and below: we are high up)
  const city = new THREE.Group(); add(city); S.city = city;
  const sky = PR.nightSky({ radius: 400, stars: 0, top: [0.006, 0.01, 0.022], horizon: [0.05, 0.045, 0.06], glow: { dir: [0.3, 0, -1], color: [0.07, 0.04, 0.03] } }); city.add(sky);
  const towersFar = MD.city({ center: [0, 0, -120], spread: [300, 90], count: 110, seed: 3, emissive: 0.34, litFrac: 0.3, heights: [30, 150] }); towersFar.position.y = -55; city.add(towersFar);
  const towersMid = MD.city({ center: [0, 0, -62], spread: [150, 30], count: 34, seed: 8, emissive: 0.42, litFrac: 0.28, heights: [40, 120] }); towersMid.position.y = -55; city.add(towersMid);
  const bt = balconyTower({ pos: [8, -58, -54], w: 44, h: 150, bayW: 3.2, seed: 4, lit: 0.34 }); city.add(bt); S.balTower = bt;
  const bt2 = balconyTower({ pos: [-34, -58, -38], w: 24, h: 128, bayW: 3.2, seed: 6, lit: 0.24, rotY: 0.7 }); city.add(bt2);
  const bt3 = balconyTower({ pos: [40, -58, -26], w: 24, h: 140, bayW: 3.2, seed: 7, lit: 0.33, rotY: -0.75 }); city.add(bt3);
  city.add(MD.lightPoints({ count: 260, box: [[-160, -58, -200], [160, -40, -40]], intensity: 6, size: [0.25, 0.6], seed: 7, colors: [[1, 0.72, 0.4], [0.55, 0.8, 1.0], [1, 0.9, 0.7], [1, 0.55, 0.3]] }));
  // aircraft light (moves in shot 1)
  const plane = PR.mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: col(1, 0.15, 0.1, 30) }), [0, 45, -150], [0, 0, 0], false, false); city.add(plane); S.plane = plane;

  // ---------------- living area
  const sofa = MD.sofa({ pos: [FL.sofa.x, 0, FL.sofa.z], w: FL.sofa.w, d: FL.sofa.d, seatH: FL.sofa.seatH, color: 0x5a6470, seed: 2 }); add(sofa); S.sofa = sofa;
  // cushion (throw pillow) at the west end
  add(PR.mesh(PR.rbox(0.42, 0.36, 0.14, 0.06, 3), new THREE.MeshStandardMaterial({ color: 0x9a6a48, roughness: 0.95 }), [FL.sofa.x - FL.sofa.w / 2 + 0.38, 0.72, FL.sofa.z - 0.22], [-0.25, 0.25, 0.05]));
  // coffee table (low, oak top, black legs)
  const { table } = FL;
  const tp = MT.planks({ base: [150, 112, 78], dark: [104, 76, 52], planksAcross: 3, seed: 23 });
  const topMat = MT.texMat({ map: tp.map, rough: tp.rough, roughness: 0.4 });
  add(PR.mesh(PR.rbox(table.w, 0.04, table.d, 0.012, 2), topMat, [table.x, table.h - 0.02, table.z]));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(PR.mesh(new THREE.CylinderGeometry(0.018, 0.014, table.h - 0.04, 8), darkMetal, [table.x + sx * (table.w / 2 - 0.08), (table.h - 0.04) / 2, table.z + sz * (table.d / 2 - 0.08)]));
  // noodle cup (instant noodles, lid peeled, fork) — a prop the host holds or leaves on the table
  const cup = new THREE.Group();
  cup.add(PR.mesh(new THREE.CylinderGeometry(0.052, 0.04, 0.1, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.7, side: THREE.DoubleSide }), [0, 0.05, 0]));
  cup.add(PR.mesh(new THREE.CylinderGeometry(0.0525, 0.0525, 0.03, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xb8402c, roughness: 0.6, side: THREE.DoubleSide }), [0, 0.07, 0]));
  cup.add(PR.mesh(new THREE.CircleGeometry(0.049, 20), new THREE.MeshStandardMaterial({ color: 0xc9a060, roughness: 0.8 }), [0, 0.085, 0], [-Math.PI / 2, 0, 0]));
  cup.add(PR.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 }), [0.015, 0.12, 0.01], [0.25, 0, -0.3]));
  const lid = PR.mesh(new THREE.CircleGeometry(0.05, 20, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.5, side: THREE.DoubleSide }), [0, 0.13, -0.03], [-1.2, 0, 0]); cup.add(lid);
  add(cup); S.cup = cup; cup.position.set(table.x + 0.28, table.h, table.z - 0.05);
  // a glass and a book on the table
  add(PR.glassOfWater({ pos: [table.x - 0.36, table.h, table.z + 0.1] }));
  add(PR.mesh(PR.rbox(0.2, 0.03, 0.27, 0.004, 1), new THREE.MeshStandardMaterial({ color: 0x2d4a5a, roughness: 0.7 }), [table.x - 0.05, table.h + 0.015, table.z + 0.12], [0, 0.35, 0]));

  // arc floor lamp: marble base behind the sofa's east end, arm over the seats, dome shade above the two places
  const lampG = new THREE.Group(); add(lampG);
  const [lbx, lbz] = FL.lampBase, [lsx, lsy, lsz] = FL.lampShade;
  lampG.add(PR.mesh(PR.rbox(0.34, 0.1, 0.34, 0.02, 2), new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.3 }), [lbx, 0.05, lbz]));
  const arc = new THREE.CatmullRomCurve3([V3(lbx, 0.08, lbz), V3(lbx, 1.5, lbz), V3(lbx - 0.12, 2.35, lbz + 0.14), V3((lbx + lsx) / 2, 2.62, (lbz + lsz) / 2), V3(lsx + 0.35, 2.48, lsz - 0.05), V3(lsx, lsy + 0.2, lsz)]);
  lampG.add(PR.mesh(new THREE.TubeGeometry(arc, 64, 0.014, 8), new THREE.MeshStandardMaterial({ color: 0x1e1d1c, roughness: 0.35, metalness: 0.7 })));
  const shadeOut = new THREE.MeshStandardMaterial({ color: 0x23211f, roughness: 0.4, metalness: 0.5, side: THREE.FrontSide });
  const shadeIn = new THREE.MeshStandardMaterial({ color: 0xf0e6d4, roughness: 0.9, emissive: col(1.0, 0.7, 0.4), emissiveIntensity: 0, side: THREE.BackSide });
  const shadeGeo = new THREE.SphereGeometry(0.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  lampG.add(PR.mesh(shadeGeo, shadeOut, [lsx, lsy, lsz], [0, 0, 0], true, false));
  lampG.add(PR.mesh(shadeGeo, shadeIn, [lsx, lsy - 0.002, lsz], [0, 0, 0], false, false));
  const bulbMat = new THREE.MeshBasicMaterial({ color: col(1, 0.75, 0.45, 0.2) });
  lampG.add(PR.mesh(new THREE.SphereGeometry(0.045, 16, 10), bulbMat, [lsx, lsy + 0.03, lsz], [0, 0, 0], false, false));
  S.lampShadeIn = shadeIn; S.lampBulb = bulbMat;

  // sideboard + speaker + plant + art on the west wall
  const sd = FL.side;
  const sdMat = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.55 });
  add(PR.mesh(PR.rbox(0.44, sd.h, sd.z1 - sd.z0, 0.01, 2), sdMat, [sd.x, sd.h / 2, (sd.z0 + sd.z1) / 2]));
  const [spx, spy, spz] = FL.speaker;
  const spk = new THREE.Group(); add(spk);
  spk.add(PR.mesh(PR.rbox(0.13, 0.19, 0.24, 0.03, 3), new THREE.MeshStandardMaterial({ color: 0xcdc6ba, roughness: 0.9 }), [0, 0.095, 0]));
  spk.add(PR.mesh(new THREE.CircleGeometry(0.05, 20), new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 1 }), [0.066, 0.1, 0], [0, Math.PI / 2, 0]));
  const ledMat = new THREE.MeshBasicMaterial({ color: col(1, 0.8, 0.5, 0.0) });
  spk.add(PR.mesh(new THREE.SphereGeometry(0.008, 8, 6), ledMat, [0.062, 0.17, 0], [0, 0, 0], false, false));
  spk.position.set(spx, spy, spz); S.speakerLed = ledMat; S.speaker = spk;
  add(PR.mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.16, 20), new THREE.MeshStandardMaterial({ color: 0xb7aa98, roughness: 0.8 }), [sd.x, sd.h + 0.08, sd.z1 - 0.25]));
  const leafM = new THREE.MeshStandardMaterial({ color: 0x3d5a34, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const lf = PR.mesh(new THREE.PlaneGeometry(0.07, 0.34), leafM, [sd.x + Math.cos(a) * 0.05, sd.h + 0.32, sd.z1 - 0.25 + Math.sin(a) * 0.05], [Math.sin(a) * 0.5, a, Math.cos(a) * 0.5]); add(lf); }
  for (let i = 0; i < 3; i++) add(PR.mesh(PR.rbox(0.2, 0.035, 0.27, 0.004, 1), new THREE.MeshStandardMaterial({ color: [0x7a2e22, 0xd8cfbd, 0x2d4a5a][i], roughness: 0.7 }), [sd.x, sd.h + 0.018 + i * 0.036, sd.z0 + 0.35], [0, 0.1 * i, 0]));
  const art = PR.mesh(new THREE.PlaneGeometry(0.62, 0.82), new THREE.MeshStandardMaterial({ map: artTex(2), roughness: 0.8 }), [x0 + 0.02, 1.62, (sd.z0 + sd.z1) / 2], [0, Math.PI / 2, 0], false, true); add(art);
  add(PR.mesh(new THREE.BoxGeometry(0.03, 0.86, 0.66), darkMetal, [x0 + 0.01, 1.62, (sd.z0 + sd.z1) / 2]));

  // ---------------- kitchenette along the east wall
  const K = FL.kit, kx0 = K.xf, kx1 = x1;
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x33403e, roughness: 0.55 });
  const ctopMat = new THREE.MeshPhysicalMaterial({ color: 0xbdb9b0, roughness: 0.28, clearcoat: 0.4 });
  add(PR.mesh(PR.rbox(kx1 - kx0, 0.9, K.z1 - K.z0, 0.01), cabMat, [(kx0 + kx1) / 2, 0.5, (K.z0 + K.z1) / 2]));
  add(PR.mesh(new THREE.BoxGeometry(kx1 - kx0 - 0.06, 0.08, K.z1 - K.z0), new THREE.MeshStandardMaterial({ color: 0x151918 }), [(kx0 + kx1) / 2 + 0.03, 0.04, (K.z0 + K.z1) / 2]));
  const nD = 5; for (let i = 1; i < nD; i++) add(PR.mesh(new THREE.BoxGeometry(0.006, 0.8, 0.006), new THREE.MeshStandardMaterial({ color: 0x151a19 }), [kx0 - 0.001, 0.52, K.z0 + i * (K.z1 - K.z0) / nD], [0, 0, 0], false, false));
  for (let i = 0; i < nD; i++) add(PR.mesh(new THREE.BoxGeometry(0.02, 0.012, 0.16), steel, [kx0 - 0.012, 0.88, K.z0 + (i + 0.5) * (K.z1 - K.z0) / nD]));
  // countertop with a sink hole
  const sz0 = K.sinkZ - 0.3, sz1 = K.sinkZ + 0.3, sx0 = 3.0, sx1 = 3.44, ty = K.top;
  const ct = (ax0, ax1, az0, az1) => add(PR.mesh(new THREE.BoxGeometry(ax1 - ax0, 0.045, az1 - az0), ctopMat, [(ax0 + ax1) / 2, ty - 0.0225, (az0 + az1) / 2]));
  ct(kx0 - 0.03, kx1, K.z0, sz0); ct(kx0 - 0.03, kx1, sz1, K.z1); ct(kx0 - 0.03, sx0, sz0, sz1); ct(sx1, kx1, sz0, sz1);
  const basinM = new THREE.MeshStandardMaterial({ color: 0x8a8d8f, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
  const bdp = 0.2;
  add(PR.mesh(new THREE.PlaneGeometry(sx1 - sx0, sz1 - sz0), basinM, [(sx0 + sx1) / 2, ty - bdp, K.sinkZ], [-Math.PI / 2, 0, 0], false, true));
  add(PR.mesh(new THREE.PlaneGeometry(sz1 - sz0, bdp), basinM, [sx0, ty - bdp / 2, K.sinkZ], [0, Math.PI / 2, 0], false, true));
  add(PR.mesh(new THREE.PlaneGeometry(sz1 - sz0, bdp), basinM, [sx1, ty - bdp / 2, K.sinkZ], [0, -Math.PI / 2, 0], false, true));
  add(PR.mesh(new THREE.PlaneGeometry(sx1 - sx0, bdp), basinM, [(sx0 + sx1) / 2, ty - bdp / 2, sz0], [0, 0, 0], false, true));
  add(PR.mesh(new THREE.PlaneGeometry(sx1 - sx0, bdp), basinM, [(sx0 + sx1) / 2, ty - bdp / 2, sz1], [0, Math.PI, 0], false, true));
  add(PR.mesh(new THREE.CircleGeometry(0.025, 16), darkMetal, [(sx0 + sx1) / 2, ty - bdp + 0.002, K.sinkZ], [-Math.PI / 2, 0, 0], false, false));
  // gooseneck tap at the back of the sink, spout pointing west
  const tapX = 3.52, outX = 3.2, outY = 1.33;
  const tapC = new THREE.CatmullRomCurve3([V3(tapX, ty, K.sinkZ), V3(tapX, 1.34, K.sinkZ), V3(tapX - 0.06, 1.44, K.sinkZ), V3(outX + 0.08, 1.43, K.sinkZ), V3(outX, outY + 0.02, K.sinkZ)]);
  add(PR.mesh(new THREE.TubeGeometry(tapC, 32, 0.016, 10), steel));
  add(PR.mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 16), steel, [tapX, ty + 0.025, K.sinkZ]));
  const lever = new THREE.Group(); lever.position.set(tapX, ty + 0.1, K.sinkZ + 0.07); add(lever);
  lever.add(PR.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12), steel, [0, 0, 0]));
  lever.add(PR.mesh(new THREE.BoxGeometry(0.1, 0.012, 0.018), steel, [-0.05, 0.02, 0]));
  S.tapLever = lever; S.tapOut = V3(outX, outY, K.sinkZ); S.sinkBottom = ty - bdp;
  // water stream (visible when the tap is on)
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe6f0, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.55, emissive: col(0.5, 0.7, 0.85), emissiveIntensity: 0.35 });
  const water = new THREE.Group(); add(water); S.water = water;
  const wlen = outY - (ty - bdp);
  const stream = PR.mesh(new THREE.CylinderGeometry(0.009, 0.012, wlen, 10, 8, true), waterMat, [outX, (outY + ty - bdp) / 2, K.sinkZ], [0, 0, 0], false, false); water.add(stream); S.stream = stream;
  const splash = PR.mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.02, 16, 1, true), waterMat, [outX, ty - bdp + 0.012, K.sinkZ], [0, 0, 0], false, false); water.add(splash);
  S.waterOn = (on, frame = 0) => {
    water.visible = on > 0.01; stream.scale.set(on, 1, on);
    const p = stream.geometry.attributes.position; if (!stream.userData.base) stream.userData.base = p.array.slice();
    const b = stream.userData.base; for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1]; const k = 1 + 0.25 * Math.sin(y * 60 + frame * 2.1) * Math.sin(frame * 1.7 + y * 23); p.setX(i, b[i * 3] * k); p.setZ(i, b[i * 3 + 2] * k); }
    p.needsUpdate = true; splash.scale.set(0.8 + 0.4 * Math.abs(Math.sin(frame * 1.3)), 1, 0.8 + 0.4 * Math.abs(Math.cos(frame * 1.1)));
  };
  S.waterOn(0);
  // backsplash tiles
  const tl = MT.tiles({ base: [214, 216, 210], grout: [150, 150, 146], n: 10, seed: 5, groutW: 0.03 });
  add(PR.mesh(new THREE.PlaneGeometry(K.z1 - K.z0, 0.74), MT.texMat({ map: tl.map, bump: tl.bump, bumpScale: 0.6, roughness: 0.3, repeat: [4.2, 1] }), [x1 - 0.005, ty + 0.37, (K.z0 + K.z1) / 2], [0, -Math.PI / 2, 0], false, true));
  // upper cabinets (open shelf over the sink)
  const uc = (az0, az1) => add(PR.mesh(PR.rbox(0.36, 0.78, az1 - az0, 0.01), cabMat, [x1 - 0.18, 2.14, (az0 + az1) / 2]));
  uc(K.z0, sz0 - 0.1); uc(sz1 + 0.1, K.z1);
  add(PR.mesh(new THREE.BoxGeometry(0.26, 0.03, sz1 - sz0 + 0.2), topMat, [x1 - 0.13, 2.05, K.sinkZ]));
  for (let i = 0; i < 4; i++) add(PR.mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.1, 16), new THREE.MeshStandardMaterial({ color: [0xe8e4dc, 0x6a8a9a, 0xe8e4dc, 0xc9a070][i], roughness: 0.5 }), [x1 - 0.12, 2.115, K.sinkZ - 0.24 + i * 0.16]));
  // LED strip under the upper cabinets
  const stripMat = new THREE.MeshBasicMaterial({ color: col(0.85, 0.93, 1.0, 0.7) });
  S.stripMesh = add(PR.mesh(new THREE.BoxGeometry(0.03, 0.008, K.z1 - K.z0 - 0.1), stripMat, [x1 - 0.3, 1.746, (K.z0 + K.z1) / 2], [0, 0, 0], false, false));
  // kettle + chopping board
  add(PR.mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.22, 24), new THREE.MeshPhysicalMaterial({ color: 0xcfd2d4, metalness: 0.7, roughness: 0.25 }), [3.3, ty + 0.11, 3.78]));
  add(PR.mesh(PR.rbox(0.28, 0.02, 0.4, 0.008, 1), topMat, [3.3, ty + 0.01, 2.75], [0, 0.1, 0]));

  // ---------------- fridge (door hinged on its south side, opening toward the room)
  const FR = FL.fridge; const fr = new THREE.Group(); fr.position.set(FR.cx, 0, FR.cz); fr.rotation.y = -Math.PI / 2; add(fr); S.fridge = fr;
  const ss = new THREE.MeshPhysicalMaterial({ color: 0xa8abad, metalness: 0.75, roughness: 0.32, clearcoat: 0.2 });
  const FW = FR.W, FH = FR.H, FD = FR.D;
  fr.add(PR.mesh(new THREE.BoxGeometry(FW, FH, 0.03), ss, [0, FH / 2, -FD / 2]));
  for (const s of [-1, 1]) fr.add(PR.mesh(new THREE.BoxGeometry(0.03, FH, FD), ss, [s * FW / 2, FH / 2, 0]));
  fr.add(PR.mesh(new THREE.BoxGeometry(FW, 0.03, FD), ss, [0, FH, 0])); fr.add(PR.mesh(new THREE.BoxGeometry(FW, 0.08, FD), ss, [0, 0.04, 0]));
  const inner = new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 0.4, emissive: col(0.85, 0.92, 1.0), emissiveIntensity: 0 });
  fr.add(PR.mesh(new THREE.PlaneGeometry(FW - 0.06, FH - 0.12), inner, [0, FH / 2, -FD / 2 + 0.02], [0, 0, 0], false, true));
  for (const s of [-1, 1]) fr.add(PR.mesh(new THREE.PlaneGeometry(FD - 0.04, FH - 0.12), inner, [s * (FW / 2 - 0.02), FH / 2, 0], [0, -s * Math.PI / 2, 0], false, true));
  fr.add(PR.mesh(new THREE.PlaneGeometry(FW - 0.06, FD - 0.04), inner, [0, FH - 0.02, 0], [Math.PI / 2, 0, 0], false, true));
  const glassSh = new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, roughness: 0.05, transparent: true, opacity: 0.5, emissive: col(0.5, 0.6, 0.7), emissiveIntensity: 0, depthWrite: false });
  const lipM = new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: 0.4 });
  const rng = mulberry32(12);
  const itemCols = [0xd94a3a, 0xf0e6c8, 0x3a8a4a, 0xe8c040, 0xffffff, 0x6a9ad0, 0xc07840];
  for (const y of [0.45, 0.88, 1.3, 1.66]) {
    fr.add(PR.mesh(new THREE.BoxGeometry(FW - 0.06, 0.012, FD - 0.1), glassSh, [0, y, -0.03], [0, 0, 0], false, true));
    fr.add(PR.mesh(new THREE.BoxGeometry(FW - 0.06, 0.03, 0.02), lipM, [0, y, FD / 2 - 0.09], [0, 0, 0], false, true));
    for (let k = 0; k < 4; k++) {
      if (y === 0.88 && k === 2) continue; // the apple's spot
      const hh = 0.08 + rng() * 0.16;
      fr.add(PR.mesh(rng() < 0.5 ? new THREE.CylinderGeometry(0.04 + rng() * 0.03, 0.04 + rng() * 0.03, hh, 16) : PR.rbox(0.1 + rng() * 0.08, hh, 0.1, 0.015), new THREE.MeshStandardMaterial({ color: itemCols[Math.floor(rng() * itemCols.length)], roughness: 0.5 }), [-0.28 + k * 0.18 + rng() * 0.04, y + hh / 2 + 0.006, -0.14 + rng() * 0.08]));
    }
  }
  // the apple (world object; moved into the visitor's hands in shot 8)
  const apple = new THREE.Group();
  const appleM = new THREE.MeshPhysicalMaterial({ color: 0xb8231c, roughness: 0.35, clearcoat: 0.6 });
  const ag = new THREE.SphereGeometry(0.048, 24, 16); { const p = ag.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.048; p.setY(i, p.getY(i) * (0.92 - 0.08 * Math.max(0, y) ** 6)); } ag.computeVertexNormals(); }
  apple.add(PR.mesh(ag, appleM));
  apple.add(PR.mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.03, 6), new THREE.MeshStandardMaterial({ color: 0x4a3420 }), [0.004, 0.05, 0], [0, 0, 0.3]));
  add(apple); S.apple = apple;
  S.appleHome = () => { fr.updateMatrixWorld(true); const p = V3(0.1, 0.88 + 0.05, 0.05).applyMatrix4(fr.matrixWorld); apple.position.copy(p); apple.rotation.set(0, 0, 0); };
  S.appleHome();
  const fdoor = new THREE.Group(); fdoor.position.set(FW / 2, 0, FD / 2); fr.add(fdoor);
  fdoor.add(PR.mesh(new THREE.BoxGeometry(FW, FH, 0.06), ss, [-FW / 2, FH / 2, 0.03]));
  fdoor.add(PR.mesh(new THREE.PlaneGeometry(FW - 0.08, FH - 0.16), inner, [-FW / 2, FH / 2, -0.002], [0, Math.PI, 0], false, true));
  for (const y of [0.35, 0.8, 1.25]) {
    fdoor.add(PR.mesh(new THREE.BoxGeometry(FW - 0.12, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.4, transparent: true, opacity: 0.8 }), [-FW / 2, y, -0.06], [0, 0, 0], false, true));
    for (let k = 0; k < 3; k++) fdoor.add(PR.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12), new THREE.MeshStandardMaterial({ color: itemCols[Math.floor(rng() * itemCols.length)], roughness: 0.4 }), [-0.15 - k * 0.22, y + 0.1, -0.06]));
  }
  fdoor.add(PR.mesh(new THREE.BoxGeometry(0.02, 0.5, 0.03), steel, [-FW + 0.06, 1.1, 0.075]));
  S.fridgeDoor = fdoor;
  // stool
  const stoolM = new THREE.MeshStandardMaterial({ color: 0x6e5440, roughness: 0.5 });
  const [stx, stz] = FL.stool; const stoolG = new THREE.Group(); root.add(stoolG); S.stool = stoolG; const addS = (m) => stoolG.add(m);
  addS(PR.mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24), stoolM, [stx, 0.74, stz]));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const lg = PR.mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.76, 8), stoolM, [stx + Math.cos(a) * 0.12, 0.37, stz + Math.sin(a) * 0.12], [Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]); addS(lg); }
  addS(PR.mesh(new THREE.TorusGeometry(0.13, 0.008, 6, 24), stoolM, [stx, 0.28, stz], [Math.PI / 2, 0, 0]));

  // ---------------- front door, switch, hall light, coat rail
  const dW = door.x1 - door.x0, dH = door.h;
  const dwood = MT.planks({ base: [70, 78, 76], dark: [56, 62, 60], planksAcross: 1, seed: 31 });
  const doorMat = MT.texMat({ map: dwood.map, rough: dwood.rough, roughness: 0.6 });
  const fdg = new THREE.Group(); fdg.position.set(door.x0 + 0.01, 0, z1 + 0.035); add(fdg); S.frontDoor = fdg;
  fdg.add(PR.mesh(PR.rbox(dW - 0.02, dH - 0.01, 0.05, 0.008, 2), doorMat, [(dW - 0.02) / 2, dH / 2, 0]));
  const hdl = new THREE.Group(); hdl.position.set(dW - 0.1, 1.02, -0.04); fdg.add(hdl); S.handle = hdl;
  hdl.add(PR.mesh(new THREE.BoxGeometry(0.12, 0.018, 0.022), steel, [-0.05, 0, -0.012]));
  hdl.add(PR.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), steel, [0, 0, 0], [Math.PI / 2, 0, 0]));
  const hdlO = hdl.clone(); hdlO.position.z = 0.04; hdlO.rotation.y = Math.PI; fdg.add(hdlO);
  fdg.add(PR.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 10), steel, [dW / 2, 1.5, 0], [Math.PI / 2, 0, 0])); // peephole
  // frame (architrave) both sides
  const archM = new THREE.MeshStandardMaterial({ color: 0xd6d6d0, roughness: 0.6 });
  for (const zz of [z1 - 0.01, z1 + T + 0.01]) {
    add(PR.mesh(new THREE.BoxGeometry(0.07, dH + 0.07, 0.02), archM, [door.x0 - 0.035, (dH + 0.07) / 2, zz]));
    add(PR.mesh(new THREE.BoxGeometry(0.07, dH + 0.07, 0.02), archM, [door.x1 + 0.035, (dH + 0.07) / 2, zz]));
    add(PR.mesh(new THREE.BoxGeometry(dW + 0.14, 0.07, 0.02), archM, [(door.x0 + door.x1) / 2, dH + 0.035, zz]));
  }
  const gap = PR.mesh(new THREE.PlaneGeometry(dW - 0.04, 0.012), new THREE.MeshBasicMaterial({ color: col(1.0, 0.85, 0.6, 2.5) }), [(door.x0 + door.x1) / 2, 0.007, z1 + 0.004], [0, Math.PI, 0], false, false); add(gap); S.doorGap = gap; gap.visible = false;
  S.doorOpen = (a) => { fdg.rotation.y = a * Math.PI / 180; };
  S.doorOpen(0);
  S.handleDown = (k) => { hdl.rotation.z = -k * 0.5; hdlO.rotation.z = k * 0.5; };
  // light switch
  add(PR.mesh(PR.rbox(0.085, 0.085, 0.012, 0.004, 1), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.4 }), [FL.sw.x, FL.sw.y, z1 - 0.006]));
  const rocker = PR.mesh(PR.rbox(0.05, 0.05, 0.012, 0.003, 1), new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.35 }), [FL.sw.x, FL.sw.y, z1 - 0.014]); add(rocker);
  S.switchState = (on) => { rocker.rotation.x = on ? -0.18 : 0.18; };
  // hall ceiling light: flush dome
  const hallMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.6, emissive: col(1.0, 0.82, 0.62), emissiveIntensity: 0 });
  const hallDome = PR.mesh(new THREE.SphereGeometry(0.2, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), hallMat, [FL.hall.x, H, FL.hall.z], [0, 0, 0], false, false); add(hallDome);
  S.hallMat = hallMat;
  // coat rail with two coats (east of the switch)
  add(PR.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), steel, [0.05, 1.82, z1 - 0.07], [0, 0, Math.PI / 2]));
  for (const [cx, c] of [[-0.18, 0x5a4a3a], [0.2, 0x2f3a4a]]) {
    const cg2 = new THREE.CylinderGeometry(0.09, 0.2, 0.95, 16, 4); const p = cg2.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * 0.45);
    cg2.computeVertexNormals(); add(PR.mesh(cg2, new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }), [cx, 1.36, z1 - 0.13]));
  }

  // ---------------- corridor outside the front door (doors on both sides, hard ceiling light)
  const CO = FL.cor;
  const cwall = MT.plaster({ base: [176, 178, 168], seed: 17 });
  const corWall = MT.texMat({ map: cwall.map, bump: cwall.bump, bumpScale: 0.4, roughness: 0.9, repeat: [8, 1] });
  const vin = MT.concrete({ base: [96, 100, 98], amp: 14, seed: 33 });
  const corLen = CO.x1 - CO.x0, ccx = (CO.x0 + CO.x1) / 2, ccz = (CO.z0 + CO.z1) / 2;
  add(PR.mesh(new THREE.PlaneGeometry(corLen, CO.z1 - CO.z0), MT.texMat({ map: vin.map, bump: vin.bump, bumpScale: 0.3, roughness: 0.35, repeat: [12, 1] }), [ccx, 0, ccz], [-Math.PI / 2, 0, 0], false, true));
  add(PR.mesh(new THREE.PlaneGeometry(corLen, CO.z1 - CO.z0), ceilMat, [ccx, H, ccz], [Math.PI / 2, 0, 0], false, true));
  // north corridor wall = outside face of the flat's south wall (already built between x0..x1); extend it both ways
  add(PR.mesh(new THREE.BoxGeometry(x0 - T - CO.x0, H, T), corWall, [(CO.x0 + x0 - T) / 2, H / 2, z1 + T / 2]));
  add(PR.mesh(new THREE.BoxGeometry(CO.x1 - x1 - T, H, T), corWall, [(x1 + T + CO.x1) / 2, H / 2, z1 + T / 2]));
  add(PR.mesh(new THREE.BoxGeometry(corLen, H, T), corWall, [ccx, H / 2, CO.z1 + T / 2]));
  add(PR.mesh(new THREE.BoxGeometry(T, H, CO.z1 - CO.z0), corWall, [CO.x0 - T / 2, H / 2, ccz]));
  add(PR.mesh(new THREE.BoxGeometry(T, H, CO.z1 - CO.z0), corWall, [CO.x1 + T / 2, H / 2, ccz]));
  // other doors, all closed
  const odoor = new THREE.MeshStandardMaterial({ color: 0x4a524f, roughness: 0.6 });
  const plate = new THREE.MeshStandardMaterial({ color: 0xb8b4a8, roughness: 0.4, metalness: 0.6 });
  const mkDoor = (x, side) => { // side: +1 on the north wall (facing +z), -1 on the south wall (facing -z)
    const zf = side > 0 ? CO.z0 + 0.005 : CO.z1 - 0.005;
    add(PR.mesh(new THREE.BoxGeometry(dW, dH, 0.04), odoor, [x, dH / 2, zf + side * 0.0]));
    add(PR.mesh(new THREE.BoxGeometry(dW + 0.12, 0.06, 0.03), archM, [x, dH + 0.03, zf]));
    for (const s of [-1, 1]) add(PR.mesh(new THREE.BoxGeometry(0.06, dH, 0.03), archM, [x + s * (dW / 2 + 0.03), dH / 2, zf]));
    add(PR.mesh(new THREE.BoxGeometry(0.12, 0.018, 0.03), steel, [x - side * (dW / 2 - 0.12), 1.02, zf + side * 0.035]));
    add(PR.mesh(new THREE.BoxGeometry(0.12, 0.06, 0.01), plate, [x, 1.62, zf + side * 0.025]));
    add(PR.mesh(PR.rbox(0.8, 0.012, 0.45, 0.004, 1), new THREE.MeshStandardMaterial({ color: [0x3a3430, 0x4a3a2e, 0x2e3438][Math.abs(Math.round(x)) % 3], roughness: 1 }), [x, 0.006, zf + side * 0.3], [0, 0, 0], false, true));
  };
  for (const x of [-6.4, -10.8, -14.2, 2.6, 6.6]) mkDoor(x, 1);
  for (const x of [-1.6, -5.9, -10.2, -13.9, 2.2, 6.2]) mkDoor(x, -1);
  // our door's number plate on the corridor side
  add(PR.mesh(new THREE.BoxGeometry(0.12, 0.06, 0.01), plate, [(door.x0 + door.x1) / 2, 1.62, z1 + T + 0.02]));
  // ceiling light panels
  const panelMat = new THREE.MeshBasicMaterial({ color: col(1.0, 0.93, 0.8, 3.0) });
  S.corPanels = [];
  for (let x = -13.6; x < CO.x1; x += 3.0) { const pm = PR.mesh(new THREE.PlaneGeometry(0.55, 0.55), panelMat, [x, H - 0.005, ccz], [Math.PI / 2, 0, 0], false, false); add(pm); S.corPanels.push(x); }
  // lift doors at the east end
  add(PR.mesh(new THREE.BoxGeometry(0.03, 2.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x9a9ea2, metalness: 0.9, roughness: 0.35 }), [CO.x1 - 0.02, 1.1, ccz]));
  add(PR.mesh(new THREE.BoxGeometry(0.02, 0.1, 0.06), new THREE.MeshBasicMaterial({ color: col(1, 0.8, 0.5, 2) }), [CO.x1 - 0.03, 1.2, ccz + 0.8], [0, 0, 0], false, false));
  // window at the west end (night)
  add(PR.mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshBasicMaterial({ color: col(0.06, 0.1, 0.2, 1) }), [CO.x0 + 0.01, 1.6, ccz], [0, Math.PI / 2, 0], false, false));

  // ---------------- bedroom (behind the west doorway): dark, one cold window, an empty made bed
  const B = FL.bed; const bx0 = B.x0, bx1 = x0 - T;
  add(PR.mesh(new THREE.PlaneGeometry(bx1 - bx0, B.z1 - B.z0), floorMat, [(bx0 + bx1) / 2, 0, (B.z0 + B.z1) / 2], [-Math.PI / 2, 0, 0], false, true));
  add(PR.mesh(new THREE.PlaneGeometry(bx1 - bx0, B.z1 - B.z0), ceilMat, [(bx0 + bx1) / 2, H, (B.z0 + B.z1) / 2], [Math.PI / 2, 0, 0], false, true));
  add(PR.mesh(new THREE.BoxGeometry(T, H, B.z1 - B.z0), wallMat, [bx0 - T / 2, H / 2, (B.z0 + B.z1) / 2]));
  add(PR.mesh(new THREE.BoxGeometry(bx1 - bx0, H, T), wallMat, [(bx0 + bx1) / 2, H / 2, B.z1 + T / 2]));
  // north bedroom wall with a window
  const bwx0 = -6.5, bwx1 = -5.2;
  add(PR.mesh(new THREE.BoxGeometry(bwx0 - bx0, H, T), wallMat, [(bx0 + bwx0) / 2, H / 2, B.z0 - T / 2]));
  add(PR.mesh(new THREE.BoxGeometry(bx1 - bwx1, H, T), wallMat, [(bwx1 + bx1) / 2, H / 2, B.z0 - T / 2]));
  add(PR.mesh(new THREE.BoxGeometry(bwx1 - bwx0, 0.9, T), wallMat, [(bwx0 + bwx1) / 2, 0.45, B.z0 - T / 2]));
  add(PR.mesh(new THREE.BoxGeometry(bwx1 - bwx0, H - 2.3, T), wallMat, [(bwx0 + bwx1) / 2, (2.3 + H) / 2, B.z0 - T / 2]));
  add(PR.mesh(new THREE.PlaneGeometry(bwx1 - bwx0, 1.4), new THREE.MeshBasicMaterial({ color: col(0.05, 0.09, 0.18, 1) }), [(bwx0 + bwx1) / 2, 1.6, B.z0 - T - 0.3], [0, 0, 0], false, false));
  const fab = MT.fabric({ base: [170, 176, 186], seed: 4 });
  const sheet = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.4, roughness: 0.95, repeat: [3, 3] });
  const bedG = PR.bed({ x: 0, headZ: 0, w: 1.7, len: 2.2, topY: 0.56, sheet }); bedG.rotation.y = Math.PI / 2; bedG.position.set(bx0 + 0.05, 0, (bd.z0 + bd.z1) / 2); add(bedG);
  add(PR.pillow({ w: 0.66, h: 0.15, d: 0.42, mat: sheet, pos: [bx0 + 0.35, 0.63, (bd.z0 + bd.z1) / 2 - 0.4], rot: [0, Math.PI / 2 + 0.05, 0] }));
  add(PR.pillow({ w: 0.66, h: 0.15, d: 0.42, mat: sheet, pos: [bx0 + 0.35, 0.63, (bd.z0 + bd.z1) / 2 + 0.4], rot: [0, Math.PI / 2 - 0.04, 0] }));
  const duvetM = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.5, roughness: 0.97, repeat: [4, 4], color: 0xe6e9ee });
  add(PR.mesh(PR.rbox(1.45, 0.08, 1.76, 0.04, 3), duvetM, [bx0 + 0.05 + 1.35, 0.6, (bd.z0 + bd.z1) / 2]));
  add(PR.nightstand({ pos: [bx0 + 0.3, 0, (bd.z0 + bd.z1) / 2 - 1.2], topY: 0.62, w: 0.46, d: 0.4, color: 0x4a3a2e }));
  // bedroom door leaf, open against the inside wall
  const bdl = PR.mesh(PR.rbox(0.04, 2.28, 1.03, 0.008, 1), doorMat, [x0 - T - 0.04, 1.14, bd.z1 + 0.52]); add(bdl);

  // ---------------- lights (all created here; each shot sets intensities / shadows)
  const Ls = {};
  // city key: cold, from high outside, through the glazing (mullion shadows on the floor)
  Ls.cityKey = new THREE.SpotLight(col(0.42, 0.58, 1.0), 22, 0, 0.75, 0.9, 2); Ls.cityKey.position.set(-0.6, 3.4, -4.6); Ls.cityKey.target.position.set(-0.8, 0.4, 2.2);
  Ls.cityKey.shadow.mapSize.set(1024, 1024); Ls.cityKey.shadow.bias = -0.0005; Ls.cityKey.shadow.camera.near = 1; Ls.cityKey.shadow.camera.far = 16;
  // soft cold fill from the glazing
  Ls.cityFill = new THREE.RectAreaLight(col(0.45, 0.6, 1.0), 0.7, 5.2, 2.6); Ls.cityFill.position.set(-0.75, 1.45, -0.25); Ls.cityFill.lookAt(-0.75, 1.3, 5);
  // teal rim from the side glazing (E's modern look)
  Ls.rim = new THREE.SpotLight(col(0.25, 0.8, 0.75), 5, 0, 0.6, 0.9, 2); Ls.rim.position.set(-3.2, 2.2, -0.6); Ls.rim.target.position.set(-1.2, 1.0, 1.2);
  // kitchen strip (cold white) under the upper cabinets
  Ls.strip = new THREE.RectAreaLight(col(0.85, 0.93, 1.0), 6, 3.0, 0.12); Ls.strip.position.set(x1 - 0.3, 1.74, (K.z0 + K.z1) / 2); Ls.strip.lookAt(x1 - 0.3, 0, (K.z0 + K.z1) / 2);
  // hall light (warm, ceiling by the front door)
  Ls.hall = new THREE.SpotLight(col(1.0, 0.8, 0.58), 0, 0, 1.2, 0.8, 2); Ls.hall.position.set(FL.hall.x, H - 0.08, FL.hall.z); Ls.hall.target.position.set(FL.hall.x, 0, FL.hall.z - 0.3);
  Ls.hall.shadow.mapSize.set(1024, 1024); Ls.hall.shadow.bias = -0.0005; Ls.hall.shadow.camera.near = 0.3; Ls.hall.shadow.camera.far = 8;
  Ls.hallFill = new THREE.PointLight(col(1.0, 0.8, 0.58), 0, 0, 2); Ls.hallFill.position.set(FL.hall.x, H - 0.4, FL.hall.z - 0.6);
  // arc lamp (warm): spot down onto the sofa + soft point inside the shade
  Ls.lamp = new THREE.SpotLight(col(1.0, 0.68, 0.38), 0, 0, 0.95, 0.7, 2); Ls.lamp.position.set(lsx, lsy + 0.02, lsz); Ls.lamp.target.position.set(lsx, 0, lsz + 0.35);
  Ls.lamp.shadow.mapSize.set(1024, 1024); Ls.lamp.shadow.bias = -0.0005; Ls.lamp.shadow.camera.near = 0.1; Ls.lamp.shadow.camera.far = 6;
  Ls.lampGlow = new THREE.PointLight(col(1.0, 0.66, 0.36), 0, 0, 2); Ls.lampGlow.position.set(lsx, lsy + 0.25, lsz + 0.1);
  // phone screen (moved to the phone each frame)
  Ls.phone = new THREE.RectAreaLight(col(0.75, 0.88, 1.0), 0, 0.08, 0.16);
  Ls.phonePt = new THREE.PointLight(col(0.6, 0.78, 1.0), 0, 0, 2);
  // fridge interior
  Ls.fridge = new THREE.SpotLight(col(0.86, 0.93, 1.0), 0, 0, 1.0, 0.6, 2); Ls.fridge.shadow.mapSize.set(1024, 1024); Ls.fridge.shadow.bias = -0.0004; Ls.fridge.shadow.camera.near = 0.1; Ls.fridge.shadow.camera.far = 8;
  Ls.fridgeArea = new THREE.RectAreaLight(col(0.86, 0.93, 1.0), 0, FD * 0.9, 1.7);
  // corridor: hard downlights (two near our door cast shadows)
  Ls.cor = [];
  for (const x of S.corPanels) {
    const L = new THREE.SpotLight(col(1.0, 0.9, 0.74), 0, 0, 1.25, 0.55, 2); L.position.set(x, H - 0.02, ccz); L.target.position.set(x, 0, ccz);
    L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.0006; L.shadow.camera.near = 0.2; L.shadow.camera.far = 6; Ls.cor.push(L);
  }
  // bedroom window: cold moonlike city light across the bed
  Ls.bed = new THREE.SpotLight(col(0.45, 0.6, 1.0), 0, 0, 0.6, 0.7, 2); Ls.bed.position.set((bwx0 + bwx1) / 2, 2.4, B.z0 - 1.6); Ls.bed.target.position.set(bx0 + 1.2, 0.5, (bd.z0 + bd.z1) / 2);
  Ls.bed.shadow.mapSize.set(512, 512); Ls.bed.shadow.bias = -0.0006;
  // ambient
  Ls.hemi = new THREE.HemisphereLight(col(0.35, 0.45, 0.7), col(0.12, 0.09, 0.07), 0.12);
  for (const L of Object.values(Ls)) { const arr = Array.isArray(L) ? L : [L]; for (const l of arr) { root.add(l); if (l.target) root.add(l.target); l.castShadow = false; } }
  S.L = Ls;
  S.root = root;
  root.updateMatrixWorld(true);
  return S;
}

// shared environment (reflections / soft IBL)
export function makeEnv(renderer, warm = 0) {
  const k = warm;
  return C.gradientEnv(renderer, {
    top: [0.02 + 0.03 * k, 0.03 + 0.02 * k, 0.05], horizon: [0.04 + 0.06 * k, 0.05 + 0.03 * k, 0.07 - 0.02 * k], bottom: [0.012 + 0.02 * k, 0.012 + 0.012 * k, 0.015],
    panels: [{ pos: [0, 2, -8], w: 8, h: 3, color: [0.4, 0.55, 0.8], intensity: 0.5 }, { pos: [-2, 3, 3], w: 2, h: 2, color: [1.0, 0.7, 0.4], intensity: 1.5 * k }],
  });
}
