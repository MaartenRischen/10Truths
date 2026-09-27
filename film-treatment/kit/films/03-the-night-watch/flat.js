// Film 03 — the flat at night: bedroom (bed, nightstand, LED clock, phone, window with blinds over a sodium-lit street,
// bedroom door with a strip of light under it) and the hallway to the front door (frosted pane, lever, deadbolt, chain).
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as C from '../../scenes/E/lib/cine.js';
import * as MT from '../../scenes/E/lib/mat.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as MD from '../../scenes/E/lib/modern.js';
import { V } from './anim.js';

export const ROOM = { width: 4.6, depth: 4.8, height: 2.95 };
export const BED = { x: -0.5, headZ: 0.06, w: 1.6, len: 2.3, topY: 0.58 };
export const NS = { pos: [0.64, 0, 0.4], topY: 0.7, w: 0.48, d: 0.44 };
export const CLOCK = V(0.56, 0.7, 0.34);
export const PHONE = V(0.02, 0.592, 0.8);
export const WIN = { z: 1.75, y: 1.62, w: 1.25, h: 1.45 };
export const BDOOR = { z: 3.25, w: 0.9, h: 2.15 };

// ---------------------------------------------------------------- textures
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function seg7(g, ch, x, y, w, h, t, on, off) {
  const s = SEG[ch] || '';
  const R = (X, Y, W, H) => { g.beginPath(); const r = Math.min(W, H) / 2; g.moveTo(X + r, Y); g.arcTo(X + W, Y, X + W, Y + H, r); g.arcTo(X + W, Y + H, X, Y + H, r); g.arcTo(X, Y + H, X, Y, r); g.arcTo(X, Y, X + W, Y, r); g.fill(); };
  const segs = { a: [x + t, y, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], f: [x, y + t * 0.6, t, h / 2 - t * 0.9], b: [x + w - t, y + t * 0.6, t, h / 2 - t * 0.9], e: [x, y + h / 2 + t * 0.3, t, h / 2 - t * 0.9], c: [x + w - t, y + h / 2 + t * 0.3, t, h / 2 - t * 0.9] };
  for (const k of 'abcdefg') { g.fillStyle = s.includes(k) ? on : off; R(...segs[k]); }
}
export function clockTex(time = '3:07', { colon = true } = {}) {
  const W = 512, H = 200;
  return MT.drawTexture(W, H, (g) => {
    g.fillStyle = '#050304'; g.fillRect(0, 0, W, H);
    const on = '#ff3a22', off = 'rgba(70,14,10,0.35)';
    const [hh, mm] = time.split(':');
    const dw = 92, dh = 150, t = 17, y = 25;
    const digits = [hh.length > 1 ? hh[0] : ' ', hh[hh.length - 1], mm[0], mm[1]];
    const xs = [30, 140, 290, 400];
    digits.forEach((d, i) => { if (d !== ' ') seg7(g, d, xs[i], y, dw, dh, t, on, off); else seg7(g, '8', xs[i], y, dw, dh, t, off, off); });
    g.fillStyle = colon ? on : off; g.beginPath(); g.arc(256, 75, 10, 0, 7); g.fill(); g.beginPath(); g.arc(256, 130, 10, 0, 7); g.fill();
  });
}
// news feed: tall canvas, scrolled by offset; red/orange blocks, grey text bars (unreadable)
export function newsTex(seed = 3) {
  const rng = C.mulberry32(seed);
  const W = 256, H = 2048;
  const blocks = [];
  const tex = MT.drawTexture(W, H, (g) => {
    g.fillStyle = '#101216'; g.fillRect(0, 0, W, H);
    let y = 10;
    while (y < H - 120) {
      const kind = rng();
      const hh = kind < 0.45 ? 150 : 70;
      if (kind < 0.45) {
        const warm = rng() < 0.75; const col = warm ? (rng() < 0.5 ? '#d8261c' : '#e8661a') : '#5a6a80';
        g.fillStyle = col; g.fillRect(10, y, W - 20, hh - 50);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(10, y + hh - 90, W - 20, 40);
        blocks.push([y, y + hh - 50, warm ? (col === '#d8261c' ? [1, 0.15, 0.1] : [1, 0.45, 0.12]) : [0.4, 0.5, 0.7]]);
      }
      g.fillStyle = 'rgba(220,220,225,0.75)'; g.fillRect(12, y + hh - 44, W * (0.55 + rng() * 0.35), 12);
      g.fillStyle = 'rgba(200,200,205,0.4)'; g.fillRect(12, y + hh - 24, W * (0.3 + rng() * 0.4), 9);
      y += hh + 12;
    }
  });
  tex.userData.blocks = blocks; tex.userData.H = H;
  return tex;
}
// frosted reeded glass: vertical reeds with a warm gradient
function reededTex() {
  return MT.canvasTexture(256, (u, v, o) => {
    const reed = 0.75 + 0.25 * Math.pow(Math.abs(Math.sin(u * Math.PI * 22)), 0.6);
    const grad = 0.55 + 0.45 * (1 - v) * (0.7 + 0.3 * Math.sin(u * 3.0 + 0.4));
    const k = reed * grad; o[0] = 255 * Math.min(1, k * 1.0); o[1] = 255 * Math.min(1, k * 0.66); o[2] = 255 * Math.min(1, k * 0.36);
  }, { wrap: false });
}

// ---------------------------------------------------------------- bedroom
export function bedroom(scene, renderer, { stripWarm = 0 } = {}) {
  RectAreaLightUniformsLib.init();
  const R = ROOM;
  const room = PR.bedroom({ width: R.width, depth: R.depth, height: R.height, wallColor: [112, 120, 128], windowAt: { x: WIN.z, y: WIN.y, w: WIN.w, h: WIN.h }, seed: 3 });
  scene.add(room);
  // slats (for parting two of them)
  const L = room.userData.windowLocalGroup; let slats = null;
  L.children.forEach((c) => { if (c.isGroup && c.children.length > 10) slats = c; });
  slats.children.forEach((s) => { s.userData.base = { y: s.position.y, rx: s.rotation.x }; });
  // bed + bedding
  const fab = MT.fabric({ base: [150, 156, 166], seed: 4 });
  const sheetMat = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.4, roughness: 0.95, repeat: [3, 3] });
  const duvetMat = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.5, roughness: 0.97, repeat: [4, 4], color: 0xe6e9ee });
  scene.add(PR.bed({ x: BED.x, headZ: BED.headZ, w: BED.w, len: BED.len, topY: BED.topY, sheet: sheetMat }));
  scene.add(PR.pillow({ w: 0.72, h: 0.15, d: 0.44, mat: sheetMat, pos: [BED.x + 0.02, BED.topY + 0.05, 0.34], rot: [0, 0.05, 0.03] }));
  // duvet thrown back, bunched at the foot end
  {
    const geo = new THREE.BoxGeometry(BED.w + 0.06, 0.2, 0.75, 48, 1, 24); const p = geo.attributes.position; const N = MT.makeNoise(8);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > 0) { const n = N.fbm(x * 2.2 + 3, z * 3.1, 3); const e = Math.min(1, (0.4 - Math.abs(z)) / 0.2); p.setY(i, y * (0.3 + 1.4 * n) * Math.max(0.15, e) + 0.03 * Math.sin(x * 7 + z * 5)); } }
    geo.computeVertexNormals();
    scene.add(PR.mesh(geo, duvetMat, [BED.x, BED.topY + 0.1, BED.headZ + BED.len - 0.36]));
  }
  // nightstand, clock, phone, glass
  scene.add(PR.nightstand({ pos: NS.pos, topY: NS.topY, w: NS.w, d: NS.d, color: 0x3e3129 }));
  const clockG = new THREE.Group(); clockG.position.copy(CLOCK); clockG.rotation.y = 1.22; scene.add(clockG);
  clockG.add(PR.mesh(PR.rbox(0.25, 0.1, 0.085, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x0c0b0b, roughness: 0.35, clearcoat: 0.8 }), [0, 0.05, 0]));
  const ctex = { '3:07': clockTex('3:07'), '3:09': clockTex('3:09') };
  const cMat = new THREE.MeshBasicMaterial({ map: ctex['3:07'], color: new THREE.Color(1, 1, 1).multiplyScalar(2.2) });
  clockG.add(PR.mesh(new THREE.PlaneGeometry(0.21, 0.082), cMat, [0, 0.05, 0.0431], [0, 0, 0], false, false));
  const cl = new THREE.PointLight(new THREE.Color(1.0, 0.2, 0.12), 0.35, 0, 2); cl.position.copy(clockG.localToWorld(V(0, 0.05, 0.12))); scene.add(cl);
  const phone = PR.phone({ screenTex: null, on: false }); phone.position.copy(PHONE); phone.rotation.y = 1.25; phone.rotation.z = 0.03; scene.add(phone);
  scene.add(PR.glassOfWater({ pos: [0.78, 0.7, 0.3] }));
  // bedroom door on the left wall (x = -width/2), beside the window, facing into the room (+x)
  const dx = -R.width / 2 + 0.012;
  const dw = MT.planks({ base: [150, 146, 138], dark: [120, 116, 108], planksAcross: 1, seed: 21, gap: 0.0 });
  const doorMat = MT.texMat({ map: dw.map, rough: dw.rough, roughness: 0.55 });
  scene.add(PR.mesh(PR.rbox(0.045, BDOOR.h, BDOOR.w, 0.01), doorMat, [dx + 0.02, BDOOR.h / 2 + 0.012, BDOOR.z]));
  const frameM = new THREE.MeshStandardMaterial({ color: 0xcfd2d0, roughness: 0.6 });
  for (const sgn of [-1, 1]) scene.add(PR.mesh(new THREE.BoxGeometry(0.03, BDOOR.h + 0.06, 0.07), frameM, [dx + 0.012, BDOOR.h / 2 + 0.03, BDOOR.z + sgn * (BDOOR.w / 2 + 0.035)]));
  scene.add(PR.mesh(new THREE.BoxGeometry(0.03, 0.07, BDOOR.w + 0.14), frameM, [dx + 0.012, BDOOR.h + 0.045, BDOOR.z]));
  scene.add(PR.mesh(new THREE.BoxGeometry(0.05, 0.022, 0.12), new THREE.MeshStandardMaterial({ color: 0x8c8c8c, metalness: 0.9, roughness: 0.3 }), [dx + 0.07, 1.02, BDOOR.z + BDOOR.w / 2 - 0.1]));
  // light under the door: emissive strip + a soft area light on the floor
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.6, 0.28).multiplyScalar(0.02) });
  const strip = PR.mesh(new THREE.PlaneGeometry(BDOOR.w - 0.04, 0.014), stripMat, [dx + 0.044, 0.007, BDOOR.z], [0, Math.PI / 2, 0], false, false); scene.add(strip);
  const stripL = new THREE.RectAreaLight(new THREE.Color(1.0, 0.62, 0.3), 0.0, BDOOR.w - 0.06, 0.02); stripL.position.set(dx + 0.05, 0.012, BDOOR.z); stripL.lookAt(dx + 1.2, 0.25, BDOOR.z); scene.add(stripL);
  // the same warm light leaking along the latch-side edge of the door (visible above the bed from the medium shot)
  const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.6, 0.28).multiplyScalar(0.0) });
  scene.add(PR.mesh(new THREE.PlaneGeometry(0.008, BDOOR.h - 0.05), edgeMat, [dx + 0.046, BDOOR.h / 2, BDOOR.z + BDOOR.w / 2 - 0.004], [0, Math.PI / 2, 0], false, false));
  const edgeL = new THREE.PointLight(new THREE.Color(1.0, 0.62, 0.3), 0, 0, 2); edgeL.position.set(dx + 0.12, 1.1, BDOOR.z + BDOOR.w / 2 + 0.05); scene.add(edgeL);
  const setStrip = (k) => { stripMat.color.setRGB(1.0, 0.6, 0.28).multiplyScalar(0.03 + 2.6 * k); stripL.intensity = 7 * k; edgeMat.color.setRGB(1.0, 0.6, 0.28).multiplyScalar(2.2 * k); edgeL.intensity = 0.22 * k; };
  setStrip(stripWarm);
  // outside: street below, facade across, sodium lamp
  const facade = PR.mesh(new THREE.PlaneGeometry(30, 16), new THREE.MeshBasicMaterial({ map: MD.facadeTex({ cols: 14, rows: 8, lit: 0.12, seed: 5, warm: 0.8 }), color: new THREE.Color(0.35, 0.3, 0.28) }), [-15, 0, 2], [0, Math.PI / 2, 0], false, false);
  scene.add(facade);
  const street = PR.mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.4, metalness: 0.2 }), [-10, -6, 2], [-Math.PI / 2, 0, 0], false, true); scene.add(street);
  const lampG = MT.glowSprite([1.0, 0.55, 0.18], 5, 1.6, 2.4); lampG.position.set(-6.2, -0.6, 0.9); scene.add(lampG);
  const sod = new THREE.SpotLight(new THREE.Color(1.0, 0.52, 0.18), 95, 0, 0.32, 0.45, 2);
  sod.position.set(-6.2, -0.4, 0.9); sod.target.position.set(-1.0, 2.2, 2.1); sod.castShadow = true; sod.shadow.mapSize.set(1024, 1024); sod.shadow.bias = -0.0004; sod.shadow.camera.near = 2.5; sod.shadow.camera.far = 14;
  scene.add(sod, sod.target);
  const shaft = MT.lightShaft({ width: 1.2, height: 1.35, length: 3.8, color: [1.0, 0.55, 0.22], intensity: 0.018, stripes: 26, falloff: 1.3, noise: 0.4, seed: 5 });
  shaft.position.set(-2.25, WIN.y, WIN.z); shaft.lookAt(-0.3, 2.7, 2.3); scene.add(shaft);
  // soft street glow through the blinds + cold night ambience
  const wfill = new THREE.RectAreaLight(new THREE.Color(1.0, 0.66, 0.42), 2.2, WIN.w, WIN.h); wfill.position.set(-R.width / 2 + 0.08, WIN.y, WIN.z); wfill.lookAt(2, WIN.y - 0.5, WIN.z); scene.add(wfill);
  const moon = new THREE.PointLight(new THREE.Color(0.45, 0.58, 0.9), 0.9, 0, 2); moon.position.set(0.4, R.height - 0.2, 2.6); scene.add(moon);
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.34, 0.44, 0.66), new THREE.Color(0.1, 0.08, 0.07), 0.22));
  scene.environment = C.gradientEnv(renderer, { top: [0.012, 0.016, 0.026], horizon: [0.02, 0.024, 0.034], bottom: [0.01, 0.01, 0.012], panels: [{ pos: [-8, 0, 2], w: 3, h: 3, color: [1.0, 0.55, 0.2], intensity: 0.8 }] });
  scene.environmentIntensity = 0.3;
  scene.background = new THREE.Color(0, 0, 0);
  return {
    room, slats, clockG, cMat, ctex, clockLight: cl, phone, setStrip, sod, shaft, sheetMat,
    setClock: (t) => { cMat.map = ctex[t]; cMat.needsUpdate = true; },
  };
}

// phone screen swap helper: returns { setScreen(tex, emissive), light }
export function phoneScreen(scene, phone, { color = [0.8, 0.88, 1.0], intensity = 0, w = 0.08, h = 0.16 } = {}) {
  const scr = phone.userData.screen;
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  scr.material = mat;
  const ra = new THREE.RectAreaLight(new THREE.Color(...color), intensity, w, h);
  scene.add(ra);
  const place = () => { phone.updateMatrixWorld(true); const n = V(0, 1, 0).transformDirection(phone.matrixWorld); const p = V(0, 0.012, 0).applyMatrix4(phone.matrixWorld); ra.position.copy(p); ra.lookAt(p.clone().add(n)); };
  place();
  return {
    mat, light: ra, place,
    set(tex, emissive, lightI, col) {
      if (!tex || emissive <= 0) { mat.map = null; mat.color.setRGB(0.004, 0.004, 0.005); }
      else { mat.map = tex; mat.color.setRGB(1, 1, 1).multiplyScalar(emissive); }
      mat.needsUpdate = true; ra.intensity = lightI; if (col) ra.color.setRGB(...col);
    },
  };
}

// ---------------------------------------------------------------- hallway
// corridor along +z; front door plane at z = doorZ, centred on x = 0; latch side at world -x (screen right when looking +z)
export function hallway(scene, renderer, { doorZ = 3.0, width = 1.3, length = 4.5, height = 2.6, chainY = 1.74, chainX = null } = {}) {
  RectAreaLightUniformsLib.init();
  const hw = width / 2;
  const pl = MT.plaster({ base: [128, 132, 134], seed: 9 });
  const wallMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.5, roughness: 0.92, repeat: [2, 2] });
  const fl = MT.planks({ base: [128, 98, 72], dark: [90, 66, 48], planksAcross: 4, seed: 12 });
  const z0 = doorZ - length;
  scene.add(PR.mesh(new THREE.PlaneGeometry(width + 0.4, length + 0.4), MT.texMat({ map: fl.map, rough: fl.rough, roughness: 0.5, repeat: [0.6, 1.4] }), [0, 0, (z0 + doorZ) / 2], [-Math.PI / 2, 0, 0], false, true));
  scene.add(PR.mesh(new THREE.PlaneGeometry(width + 0.4, length + 0.4), wallMat, [0, height, (z0 + doorZ) / 2], [Math.PI / 2, 0, 0], false, true));
  scene.add(PR.mesh(new THREE.PlaneGeometry(length + 0.4, height), wallMat, [hw, height / 2, (z0 + doorZ) / 2], [0, -Math.PI / 2, 0], false, true));
  scene.add(PR.mesh(new THREE.PlaneGeometry(length + 0.4, height), wallMat, [-hw, height / 2, (z0 + doorZ) / 2], [0, Math.PI / 2, 0], false, true));
  // end wall around the door
  const DW = 0.92, DH = 2.12;
  const endW = (x0, x1, y0, y1) => scene.add(PR.mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), wallMat, [(x0 + x1) / 2, (y0 + y1) / 2, doorZ + 0.06], [0, Math.PI, 0], false, true));
  endW(-hw - 0.2, -DW / 2 - 0.02, 0, height); endW(DW / 2 + 0.02, hw + 0.2, 0, height); endW(-DW / 2 - 0.05, DW / 2 + 0.05, DH + 0.02, height);
  // skirting
  const skirt = new THREE.MeshStandardMaterial({ color: 0x9a9690, roughness: 0.6 });
  for (const s of [-1, 1]) scene.add(PR.mesh(new THREE.BoxGeometry(0.02, 0.09, length), skirt, [s * (hw - 0.01), 0.045, (z0 + doorZ) / 2]));
  // door frame
  const frameM = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 0.55 });
  for (const s of [-1, 1]) scene.add(PR.mesh(new THREE.BoxGeometry(0.08, DH + 0.08, 0.1), frameM, [s * (DW / 2 + 0.04), (DH + 0.08) / 2, doorZ + 0.02]));
  scene.add(PR.mesh(new THREE.BoxGeometry(DW + 0.16, 0.08, 0.1), frameM, [0, DH + 0.04, doorZ + 0.02]));
  // door slab (rattles: group)
  const door = new THREE.Group(); door.position.set(0, 0, doorZ + 0.03); scene.add(door);
  const dwT = MT.planks({ base: [96, 70, 50], dark: [70, 50, 36], planksAcross: 3, seed: 21, gap: 0.004 });
  const slabMat = MT.texMat({ map: dwT.map, rough: dwT.rough, roughness: 0.5 });
  const gy0 = 1.42, gy1 = 1.98, gx = 0.27;
  // slab around the glass pane (4 pieces)
  const slab = (x0, x1, y0, y1) => door.add(PR.mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.05), slabMat, [(x0 + x1) / 2, (y0 + y1) / 2, 0]));
  slab(-DW / 2, DW / 2, 0.01, gy0); slab(-DW / 2, DW / 2, gy1, DH); slab(-DW / 2, -gx, gy0, gy1); slab(gx, DW / 2, gy0, gy1);
  const glassMat = new THREE.MeshBasicMaterial({ map: reededTex(), color: new THREE.Color(1, 1, 1).multiplyScalar(0.55) });
  door.add(PR.mesh(new THREE.PlaneGeometry(2 * gx, gy1 - gy0), glassMat, [0, (gy0 + gy1) / 2, 0.0], [0, Math.PI, 0], false, false));
  // glazing beads
  for (const [x, y, w, h] of [[0, gy0, 2 * gx + 0.04, 0.025], [0, gy1, 2 * gx + 0.04, 0.025], [-gx, (gy0 + gy1) / 2, 0.025, gy1 - gy0], [gx, (gy0 + gy1) / 2, 0.025, gy1 - gy0]]) door.add(PR.mesh(new THREE.BoxGeometry(w, h, 0.07), slabMat, [x, y, 0]));
  // hardware on the latch side (x < 0), inside face at z = -0.025
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, metalness: 0.9, roughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2826, metalness: 0.7, roughness: 0.35 });
  const lx = -DW / 2 + 0.085;
  // lever handle (pivot)
  door.add(PR.mesh(PR.rbox(0.05, 0.16, 0.012, 0.006), metal, [lx, 1.02, -0.03]));
  const lever = new THREE.Group(); lever.position.set(lx, 1.05, -0.05); door.add(lever);
  lever.add(PR.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12), metal, [0, 0, 0.01], [Math.PI / 2, 0, 0]));
  lever.add(PR.mesh(PR.rbox(0.13, 0.022, 0.024, 0.01), metal, [0.07, 0, -0.012]));
  // deadbolt thumb-turn
  door.add(PR.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 24), metal, [lx, 1.27, -0.03], [Math.PI / 2, 0, 0]));
  const thumb = new THREE.Group(); thumb.position.set(lx, 1.27, -0.04); door.add(thumb);
  thumb.add(PR.mesh(PR.rbox(0.016, 0.055, 0.022, 0.006), metal, [0, 0, -0.008]));
  // chain: track on the door, anchor on the frame (frame at x = -DW/2 - 0.04)
  const cy = chainY; const kx = chainX ?? (lx + 0.03);
  door.add(PR.mesh(PR.rbox(0.11, 0.022, 0.012, 0.004), metal, [kx + 0.03, cy, -0.03]));
  const anchor = V(-DW / 2 - 0.05, cy - 0.01, doorZ - 0.04);
  scene.add(PR.mesh(PR.rbox(0.03, 0.05, 0.015, 0.004), metal, anchor.toArray()));
  const chain = new THREE.Group(); chain.position.copy(anchor); scene.add(chain);
  const knobLocal = V(kx, cy, -0.04).add(V(0, 0, doorZ + 0.03)); // world
  const links = 9; const tor = new THREE.TorusGeometry(0.009, 0.0026, 6, 12);
  for (let i = 0; i < links; i++) {
    const u = (i + 0.5) / links; const p = anchor.clone().lerp(knobLocal, u); p.y -= Math.sin(u * Math.PI) * 0.07; p.sub(anchor);
    const lk = PR.mesh(tor, metal, p.toArray(), [0, i % 2 ? Math.PI / 2 : 0, 0.3]); lk.scale.set(1, 1.5, 1); chain.add(lk);
  }
  chain.add(PR.mesh(new THREE.SphereGeometry(0.012, 10, 8), metal, knobLocal.clone().sub(anchor).toArray()));
  // coat hooks + coat on the right wall (x = +hw), a mat by the door
  scene.add(PR.mesh(new THREE.BoxGeometry(0.03, 0.05, 0.6), frameM, [hw - 0.015, 1.72, doorZ - 1.0]));
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x2c3136, roughness: 0.95 });
  const coat = PR.mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.95, 16, 1, false), coatMat, [hw - 0.13, 1.25, doorZ - 1.1]); coat.scale.set(0.8, 1, 1.4); scene.add(coat);
  scene.add(PR.mesh(PR.rbox(0.62, 0.012, 0.42, 0.005), new THREE.MeshStandardMaterial({ color: 0x3a3029, roughness: 1 }), [0, 0.006, doorZ - 0.32]));
  scene.add(PR.mesh(PR.rbox(0.1, 0.07, 0.27, 0.03), dark, [0.2, 0.035, doorZ - 0.3], [0, 0.2, 0]));
  scene.add(PR.mesh(PR.rbox(0.1, 0.07, 0.27, 0.03), dark, [0.33, 0.035, doorZ - 0.34], [0, 0.35, 0]));
  // light: street light through the frosted pane (area light into the hall), faint cold spill from the bedroom behind
  const pane = new THREE.RectAreaLight(new THREE.Color(1.0, 0.6, 0.3), 5.5, 2 * gx, gy1 - gy0); pane.position.set(0, (gy0 + gy1) / 2, doorZ - 0.01); pane.lookAt(0, (gy0 + gy1) / 2 - 0.4, doorZ - 3); scene.add(pane);
  const gapL = new THREE.RectAreaLight(new THREE.Color(1.0, 0.6, 0.3), 3, DW - 0.1, 0.02); gapL.position.set(0, 0.01, doorZ - 0.01); gapL.lookAt(0, 0.4, doorZ - 1.5); scene.add(gapL);
  scene.add(PR.mesh(new THREE.PlaneGeometry(DW - 0.06, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.6, 0.28).multiplyScalar(1.2) }), [0, 0.006, doorZ + 0.0], [0, Math.PI, 0], false, false));
  const back = new THREE.PointLight(new THREE.Color(0.45, 0.55, 0.8), 0.35, 0, 2); back.position.set(0.1, 1.9, z0 + 0.6); scene.add(back);
  const coolKey = new THREE.SpotLight(new THREE.Color(0.5, 0.62, 0.95), 9, 0, 0.55, 0.8, 2); coolKey.position.set(-0.35, 2.3, doorZ - 3.2); coolKey.target.position.set(-0.1, 1.45, doorZ - 0.3); coolKey.castShadow = true; coolKey.shadow.mapSize.set(1024, 1024); coolKey.shadow.bias = -0.0005; scene.add(coolKey, coolKey.target);
  const key = new THREE.SpotLight(new THREE.Color(1.0, 0.58, 0.28), 4.5, 0, 0.7, 0.8, 2); key.position.set(0, 1.7, doorZ - 0.05); key.target.position.set(0, 1.0, doorZ - 2.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; key.shadow.camera.near = 0.2; key.shadow.camera.far = 6;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.3, 0.38, 0.55), new THREE.Color(0.06, 0.05, 0.04), 0.08));
  scene.environment = C.gradientEnv(renderer, { top: [0.012, 0.014, 0.02], horizon: [0.02, 0.02, 0.025], bottom: [0.01, 0.01, 0.01], panels: [{ pos: [0, 1.7, 6], w: 1, h: 1, color: [1.0, 0.6, 0.3], intensity: 2 }] });
  scene.environmentIntensity = 0.3;
  scene.background = new THREE.Color(0, 0, 0);
  return { door, lever, thumb, chain, doorZ, DW, lx, chainKnob: knobLocal, handle: V(lx + 0.07, 1.05, doorZ - 0.06), bolt: V(lx, 1.27, doorZ - 0.05) };
}
