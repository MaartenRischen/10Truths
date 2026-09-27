// The new world: a timber-and-glass courtyard (day = evening sun, night = fire pit + string lights).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './cine.js';
import * as MT from './mat.js';
import * as PR from './props.js';
import * as F from './figs.js';
import * as S from './sets.js';

// vertical timber cladding
export function claddingTex(seed = 3) {
  const N = MT.makeNoise(seed); const rng = mulberry32(seed);
  const tone = [...Array(64)].map(() => 0.85 + rng() * 0.3);
  return MT.canvasTexture(512, (u, v, o) => {
    const x = u * 16; const i = Math.floor(x); const f = x - i; const t = tone[i % 64];
    const gr = N.fbm(f * 2 + i * 7, v * 30, 3);
    const k = t * (0.8 + gr * 0.4) * (f < 0.06 ? 0.45 : 1);
    o[0] = 176 * k; o[1] = 128 * k; o[2] = 84 * k;
  });
}
export function solarTex() {
  return MT.drawTexture(512, 256, (g, W, H) => {
    g.fillStyle = '#0d1a2e'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) { g.fillStyle = (x + y) % 2 ? '#15294a' : '#132544'; g.fillRect(x * W / 12 + 2, y * H / 6 + 2, W / 12 - 4, H / 6 - 4); }
    g.strokeStyle = '#8a9aaa'; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, H - 2);
  });
}
function interiorTex(seed, lit) {
  const rng = mulberry32(seed);
  return MT.drawTexture(256, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, lit ? '#ffcf8a' : '#3a342c'); gr.addColorStop(1, lit ? '#b8703a' : '#1c1814'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // furniture silhouettes / shelves / a plant / a lamp
    g.fillStyle = lit ? 'rgba(60,34,18,0.6)' : 'rgba(0,0,0,0.5)';
    g.fillRect(W * (0.1 + rng() * 0.2), H * 0.62, W * 0.35, H * 0.38); g.fillRect(W * 0.62, H * (0.2 + rng() * 0.2), W * 0.3, H * 0.05); g.fillRect(W * 0.62, H * 0.4, W * 0.3, H * 0.05);
    g.beginPath(); g.ellipse(W * 0.8, H * 0.75, W * 0.08, H * 0.14, 0, 0, Math.PI * 2); g.fillStyle = lit ? 'rgba(40,60,30,0.7)' : 'rgba(10,20,10,0.6)'; g.fill();
    if (lit) { const lg = g.createRadialGradient(W * 0.5, H * 0.25, 2, W * 0.5, H * 0.25, W * 0.35); lg.addColorStop(0, 'rgba(255,240,200,0.9)'); lg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = lg; g.fillRect(0, 0, W, H); }
  });
}

// a building block: width along local x, depth along z, facade facing +z. floors, windows with timber cladding in between.
function building({ w = 12, d = 9, floors = 4, fh = 1.0 * 3.2, seed = 1, night = false, solar = true, green = false, clad, glassMat, interiors, pv = false }) {
  const g = new THREE.Group(); const rng = mulberry32(seed);
  const H = floors * fh;
  const cladMat = new THREE.MeshStandardMaterial({ map: clad, roughness: 0.75 });
  clad.wrapS = clad.wrapT = THREE.RepeatWrapping;
  const body = PR.mesh(new THREE.BoxGeometry(w, H, d), cladMat, [0, H / 2, -d / 2]); body.material = cladMat.clone(); body.material.map = clad.clone(); body.material.map.needsUpdate = true; body.material.map.repeat.set(w / 3, H / 3); g.add(body);
  // windows: floor-to-ceiling glazing bays with slim frames + balconies
  const bays = Math.floor(w / 2.6); const bw = w / bays;
  const frameG = [], balcG = [], railG = [];
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const x = -w / 2 + (b + 0.5) * bw, y = f * fh + (f === 0 ? 0.1 : 0.35);
    const gw = bw * 0.72, gh = f === 0 ? fh * 0.85 : fh * 0.72;
    const lit = night ? rng() < 0.55 : rng() < 0.12;
    const im = new THREE.MeshBasicMaterial({ map: interiors[Math.floor(rng() * interiors.length)][lit ? 1 : 0], color: new THREE.Color(1, 1, 1).multiplyScalar(lit ? (night ? 0.75 : 0.7) : (night ? 0.12 : 0.45)) });
    g.add(PR.mesh(new THREE.PlaneGeometry(gw, gh), im, [x, y + gh / 2, 0.02], [0, 0, 0], false, false));
    g.add(PR.mesh(new THREE.PlaneGeometry(gw, gh), glassMat, [x, y + gh / 2, 0.05], [0, 0, 0], false, false));
    frameG.push(new THREE.BoxGeometry(gw + 0.08, 0.06, 0.12).translate(x, y, 0.06), new THREE.BoxGeometry(gw + 0.08, 0.06, 0.12).translate(x, y + gh, 0.06), new THREE.BoxGeometry(0.05, gh, 0.1).translate(x, y + gh / 2, 0.06));
    if (f > 0 && (b + f) % 2 === 0) { balcG.push(new THREE.BoxGeometry(bw * 0.9, 0.12, 1.1).translate(x, y - 0.06, 0.55)); railG.push(new THREE.BoxGeometry(bw * 0.9, 0.9, 0.03).translate(x, y + 0.4, 1.1));
      if (rng() < 0.6) { const pl = PR.mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.25 + rng() * 0.1, 0.4 + rng() * 0.15, 0.18), roughness: 0.8 }), [x + (rng() - 0.5) * bw * 0.6, y + 0.3, 0.75]); pl.scale.y = 1.3; g.add(pl); } }
  }
  const fm = new THREE.Mesh(mergeGeometries(frameG), new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 0.5, metalness: 0.3 })); fm.castShadow = true; g.add(fm);
  if (balcG.length) { const bm = new THREE.Mesh(mergeGeometries(balcG), new THREE.MeshStandardMaterial({ color: 0xcfc8bc, roughness: 0.8 })); bm.castShadow = true; bm.receiveShadow = true; g.add(bm);
    const rm = new THREE.Mesh(mergeGeometries(railG), new THREE.MeshPhysicalMaterial({ color: 0xaac4c8, roughness: 0.1, transparent: true, opacity: 0.25 })); g.add(rm); }
  // mono-pitch PV roof facing the courtyard (reads as 'solar' from street level)
  if (pv && solar) {
    const pitch = 26 * Math.PI / 180, rise = Math.tan(pitch) * d, L = Math.hypot(d, rise);
    const st = solarTex(); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set((w + 0.4) / 2.4, L / 1.25);
    const pm = new THREE.MeshStandardMaterial({ map: st, roughness: 0.3, metalness: 0.1, envMapIntensity: 0.5 });
    const roof = PR.mesh(new THREE.PlaneGeometry(w + 0.4, L), pm, [0, H + rise / 2 + 0.12, -d / 2], [-Math.PI / 2 + pitch, 0, 0]); g.add(roof);
    const tri = new THREE.Shape([new THREE.Vector2(0, H), new THREE.Vector2(d, H), new THREE.Vector2(d, H + rise)]);
    const gm = new THREE.MeshStandardMaterial({ map: clad, roughness: 0.75 });
    for (const sx of [-1, 1]) { const ge = new THREE.Mesh(new THREE.ShapeGeometry(tri), gm); ge.rotation.y = Math.PI / 2; ge.position.x = sx * (w / 2); ge.material.side = THREE.DoubleSide; ge.castShadow = true; g.add(ge); }
    g.add(PR.mesh(new THREE.BoxGeometry(w + 0.5, 0.16, 0.22), new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.7 }), [0, H + 0.1, 0.08]));
    g.add(PR.mesh(new THREE.BoxGeometry(w, rise + 0.2, 0.2), cladMat, [0, H + rise / 2, -d + 0.1]));
  }
  // roof: solar array or green roof
  if (solar && !pv) {
    const st = solarTex(); const sm = new THREE.MeshStandardMaterial({ map: st, roughness: 0.25, metalness: 0.4 });
    const rows = Math.floor(d / 1.6); const cols = Math.floor(w / 2.2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const p = PR.mesh(new THREE.PlaneGeometry(2.0, 1.1), sm, [-w / 2 + (c + 0.5) * w / cols, H + 0.35, -d + 0.8 + r * 1.6], [-Math.PI / 2 + 0.45, 0, 0]); g.add(p); }
  }
  if (green) { const gm = PR.mesh(new THREE.BoxGeometry(w, 0.2, d), new THREE.MeshStandardMaterial({ color: 0x5a6e38, roughness: 0.95 }), [0, H + 0.1, -d / 2]); g.add(gm); }
  g.add(PR.mesh(new THREE.BoxGeometry(w + 0.2, 0.18, d + 0.2), new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.7 }), [0, H + 0.09, -d / 2]));
  g.traverse(c => { if (c.isMesh && c.castShadow !== false) { c.receiveShadow = true; } });
  body.castShadow = true;
  return g;
}

function deciduous({ pos, height = 6, spread = 4.5, seed = 1, color = [0.28, 0.4, 0.16] }) {
  const rng = mulberry32(seed); const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a4036, roughness: 0.9 });
  g.add(PR.mesh(new THREE.CylinderGeometry(0.12, 0.2, height * 0.55, 10), bark, [0, height * 0.275, 0]));
  const tips = [];
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + rng(); const tip = new THREE.Vector3(Math.cos(a) * spread * 0.3, height * (0.65 + rng() * 0.15), Math.sin(a) * spread * 0.3); tips.push(tip); g.add(PR.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, height * 0.45, 0), tip]), 6, 0.06, 6), bark)); }
  const lt = S.leafClusterTex(seed + 3);
  const lm = new THREE.MeshStandardMaterial({ map: lt, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, color: new THREE.Color(...color).multiplyScalar(3.4) });
  const n = 3800; const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), lm, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < n; i++) { const u = rng() * Math.PI * 2, vv = Math.acos(2 * rng() - 1), rr = 0.7 + 0.3 * Math.cbrt(rng()); t.set(Math.cos(u) * Math.sin(vv) * spread * 0.5 * rr, height * 0.78 + Math.cos(vv) * height * 0.28 * rr, Math.sin(u) * Math.sin(vv) * spread * 0.5 * rr); e.set(rng() * 6, rng() * 6, rng() * 6); q.setFromEuler(e); const sc = 0.4 + rng() * 0.2; s.set(sc, sc, sc); m4.compose(t, q, s); im.setMatrixAt(i, m4); }
  im.castShadow = true; im.receiveShadow = true; g.add(im);
  g.position.set(...pos);
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

function tram({ pos, night = false }) {
  const g = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: 0xe8e6e0, roughness: 0.3, metalness: 0.2, clearcoat: 0.8 });
  const L = 22, Hh = 3.1, Wd = 2.6;
  g.add(PR.mesh(PR.rbox(L, Hh, Wd, 0.5, 4), body, [0, Hh / 2 + 0.4, 0]));
  const winT = MT.drawTexture(512, 64, (c, W, H) => { c.fillStyle = night ? '#ffd9a0' : '#2a3a44'; c.fillRect(0, 0, W, H); for (let i = 0; i < 12; i++) { c.fillStyle = night ? 'rgba(80,50,30,0.5)' : 'rgba(255,255,255,0.25)'; c.fillRect(i * W / 12 + 4, 6, 6, H - 12); } for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(40,30,20,0.55)'; c.beginPath(); c.ellipse(20 + i * 55 + (i % 2) * 10, H * 0.55, 8, 14, 0, 0, Math.PI * 2); c.fill(); } });
  const wm = new THREE.MeshBasicMaterial({ map: winT, color: new THREE.Color(1, 1, 1).multiplyScalar(night ? 2.0 : 0.9) });
  g.add(PR.mesh(new THREE.PlaneGeometry(L - 1.5, 1.2), wm, [0, 2.4, Wd / 2 + 0.005], [0, 0, 0], false, false));
  g.add(PR.mesh(new THREE.BoxGeometry(L + 0.02, 0.18, Wd + 0.02), new THREE.MeshStandardMaterial({ color: 0x2f7d6a, roughness: 0.4 }), [0, 1.55, 0]));
  g.add(PR.mesh(new THREE.BoxGeometry(L - 2, 0.25, 0.6), new THREE.MeshStandardMaterial({ color: 0x333333 }), [0, Hh + 0.55, 0]));
  // pantograph + overhead wire
  g.add(PR.mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), new THREE.MeshStandardMaterial({ color: 0x222222 }), [2, Hh + 1.1, 0], [0, 0, 0.5]));
  g.position.set(...pos);
  return g;
}

// builds the whole courtyard; returns { lights, table, focusPt }
export function courtyard(scene, renderer, { night = false, seed = 7, table = true, figures = true, firePit = false, heroPhone = false, noServer = false, crossTram = false, pv = false } = {}) {
  const rng = mulberry32(seed);
  const lights = [];
  // ground: pale stone paving + lawn + gravel
  const pave = MT.tiles({ base: [168, 150, 128], grout: [120, 104, 88], n: 6, seed: 3, groutW: 0.02 }); pave.map.repeat.set(40, 40); pave.bump.repeat.set(40, 40);
  scene.add(PR.mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: pave.map, bumpMap: pave.bump, bumpScale: 0.5, roughness: 0.85 }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
  const lawn = PR.mesh(new THREE.CircleGeometry(6.5, 48), new THREE.MeshStandardMaterial({ color: 0x5e7a36, roughness: 0.95 }), [-5.5, 0.01, -5], [-Math.PI / 2, 0, 0], false, true); lawn.scale.set(1.3, 0.8, 1); scene.add(lawn);
  scene.add(S.grassField({ area: [16, 10], center: [-5.5, 0.01, -5], density: 120, height: [0.05, 0.12], width: [0.01, 0.015], seed: 3, material: S.grassMaterial({ translAmt: 0.4 }), colors: [[0.36, 0.5, 0.2], [0.42, 0.56, 0.22], [0.3, 0.44, 0.18]], exclude: (x, z) => ((x + 5.5) / 1.3) ** 2 + ((z + 5) / 0.8) ** 2 > 6.3 ** 2 }));
  // buildings around: back row (with a gap for the tram street), left and right wings
  const clad = claddingTex(seed);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0c1418, roughness: 0.06, metalness: 0.0, transparent: true, opacity: night ? 0.25 : 0.45, envMapIntensity: 1.3 });
  const interiors = [1, 2, 3, 4].map(i => [interiorTex(seed * 10 + i, false), interiorTex(seed * 10 + i, true)]);
  const B = (o) => building({ clad, glassMat, interiors, night, pv, ...o });
  const b1 = B({ w: 17, d: 9, floors: 4, seed: 1 }); b1.position.set(-13.5, 0, -16); scene.add(b1);
  const b2 = B({ w: 15, d: 9, floors: 5, seed: 2, green: true, solar: false }); b2.position.set(13, 0, -16); scene.add(b2);
  const b3 = B({ w: 22, d: 9, floors: 2, seed: 3, green: true, solar: false }); b3.position.set(-46, 0, 8); b3.rotation.y = Math.PI / 2; scene.add(b3);
  const b4 = B({ w: 22, d: 9, floors: 3, seed: 4 }); b4.position.set(18, 0, 4); b4.rotation.y = -Math.PI / 2; scene.add(b4);
  // the tram street seen through the gap (x between -5 and 5.5, z ~ -22)
  scene.add(PR.mesh(new THREE.PlaneGeometry(200, 8), new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.8 }), [0, 0.005, -24], [-Math.PI / 2, 0, 0], false, true));
  for (const z of [-23.4, -24.6]) scene.add(PR.mesh(new THREE.BoxGeometry(200, 0.04, 0.08), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.9, roughness: 0.3 }), [0, 0.02, z]));
  scene.add(tram({ pos: [-1.5, 0, -24], night }));
  if (crossTram) { const t2 = tram({ pos: [-24, 0, 2.5], night }); t2.rotation.y = Math.PI / 2 + 0.18; scene.add(t2);
    scene.add(PR.mesh(new THREE.PlaneGeometry(8, 200), new THREE.MeshStandardMaterial({ color: 0x5a544c, roughness: 0.8 }), [-24, 0.006, 0], [-Math.PI / 2, 0, 0.18], false, true)); }
  scene.add(PR.mesh(new THREE.CylinderGeometry(0.01, 0.01, 200, 4), new THREE.MeshStandardMaterial({ color: 0x222222 }), [0, 5.2, -24], [0, 0, Math.PI / 2]));
  const far = B({ w: 30, d: 9, floors: 5, seed: 5 }); far.position.set(0, 0, -30); scene.add(far);
  const b5 = B({ w: 12, d: 9, floors: 2, seed: 6, green: true, solar: false }); b5.position.set(-48, 0, -12); b5.rotation.y = Math.PI / 2; scene.add(b5);
  scene.add(deciduous({ pos: [-16, 0, 2], height: 7, spread: 6, seed: 14 })); scene.add(deciduous({ pos: [-19, 0, -6], height: 8, spread: 6.5, seed: 15, color: [0.34, 0.42, 0.16] }));
  // planters with shrubs (foreground depth)
  const potM = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.8 }); const shrubM = new THREE.MeshStandardMaterial({ color: 0x46602c, roughness: 0.85 });
  for (const [x, z, r] of [[7.2, 3.6, 0.55], [2.4, 5.6, 0.45], [-3.2, 3.8, 0.5]]) { scene.add(PR.mesh(new THREE.CylinderGeometry(r, r * 0.85, 0.5, 24), potM, [x, 0.25, z])); for (let i = 0; i < 5; i++) { const b = PR.mesh(new THREE.IcosahedronGeometry(r * (0.5 + rng() * 0.3), 1), shrubM, [x + (rng() - 0.5) * r, 0.6 + rng() * 0.3, z + (rng() - 0.5) * r]); b.scale.y = 0.8; scene.add(b); } }
  // trees
  scene.add(deciduous({ pos: [-9, 0, -8], height: 6.5, spread: 5.5, seed: 11 }));
  scene.add(deciduous({ pos: [9.5, 0, -6], height: 7, spread: 6, seed: 12, color: [0.32, 0.42, 0.16] }));
  scene.add(deciduous({ pos: [11, 0, 6], height: 6, spread: 5, seed: 13 }));
  // bikes rack (simple): a few bikes near the right wing
  const bikeM = new THREE.MeshStandardMaterial({ color: 0x1e2a30, roughness: 0.4, metalness: 0.6 });
  for (let i = 0; i < 4; i++) { const b = new THREE.Group(); for (const dx of [-0.52, 0.52]) b.add(PR.mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 28), bikeM, [dx, 0.34, 0])); b.add(PR.mesh(new THREE.BoxGeometry(1.0, 0.04, 0.04), bikeM, [0, 0.55, 0], [0, 0, 0.2])); b.position.set(13.2, 0, -2 + i * 0.7); b.rotation.y = Math.PI / 2; scene.add(b); }
  // long table + benches
  let tableC = new THREE.Vector3(0.5, 0, -1.0); let tableGroup = null;
  const tableY = 0.84;
  if (table) {
    const tl = MT.planks({ base: [168, 128, 88], dark: [120, 88, 58], planksAcross: 3, seed: 31 });
    const topM = MT.texMat({ map: tl.map, rough: tl.rough, roughness: 0.78, repeat: [1, 3] });
    const TL = 7.2, TW = 1.0;
    const tg = new THREE.Group(); tg.position.copy(tableC); tg.rotation.y = 0.18; scene.add(tg); tableGroup = tg;
    tg.add(PR.mesh(PR.rbox(TL, 0.06, TW, 0.01), topM, [0, tableY - 0.03, 0]));
    for (const x of [-TL / 2 + 0.4, 0, TL / 2 - 0.4]) tg.add(PR.mesh(new THREE.BoxGeometry(0.08, tableY - 0.06, TW * 0.8), new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.6 }), [x, (tableY - 0.06) / 2, 0]));
    for (const s of [-1, 1]) tg.add(PR.mesh(PR.rbox(TL, 0.05, 0.36, 0.01), topM, [0, 0.46, s * 0.82]));
    // table things: bowls, bread, jugs, glasses
    const cer = new THREE.MeshPhysicalMaterial({ color: 0xe8e0d0, roughness: 0.3, clearcoat: 0.5, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) { const x = -TL / 2 + 0.5 + i * (TL - 1) / 8; if (heroPhone && i === 8) continue; tg.add(PR.mesh(new THREE.SphereGeometry(0.11, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), cer, [x, tableY + 0.1, (rng() - 0.5) * 0.3], [0, 0, 0]));
      if (i % 2) tg.add(PR.mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshStandardMaterial({ color: [0xd98a2a, 0x9a3a2a, 0x6b8a3a, 0xe0c060][i % 4], roughness: 0.5 }), [x + 0.25, tableY + 0.07, (rng() - 0.5) * 0.4]));
      tg.add(PR.mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.11, 12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.3 }), [x - 0.2, tableY + 0.055, (i % 2 ? 0.32 : -0.32)], [0, 0, 0], false, false)); }
    tg.add(PR.mesh(PR.rbox(0.6, 0.12, 0.25, 0.05), new THREE.MeshStandardMaterial({ color: 0xc08a50, roughness: 0.8 }), [0.3, tableY + 0.06, 0.05]));
    // a phone face down on the table (screens used well: put away)
    const ph = PR.phone({ on: false, faceDown: true }); ph.position.set(heroPhone ? 3.3 : -1.6, tableY + 0.006, heroPhone ? 0.05 : 0.25); ph.rotation.y = heroPhone ? -0.35 : 0.3; tg.add(ph);
    if (heroPhone) { tg.add(PR.mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 24), new THREE.MeshPhysicalMaterial({ color: 0xe6ddd0, roughness: 0.3, clearcoat: 0.5 }), [3.25, tableY + 0.05, -0.2]));
      tg.add(PR.mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0xe6ddd0, roughness: 0.3 }), [3.3, tableY + 0.055, -0.2], [0, 0, -Math.PI / 2])); }
    tg.updateMatrixWorld(true);
    // people along both benches
    if (figures) {
      const kinds = ['beech', 'oak', 'walnut', 'maple', 'ash'];
      const seatPose = (r) => ({ lHip: [-88, 0, 6], rHip: [-88, 0, -6], lKnee: [90, 0, 0], rKnee: [90, 0, 0], chest: [8 + r() * 8, (r() - 0.5) * 24, 0], head: [(r() - 0.5) * 14, (r() - 0.5) * 50, 0], lShoulder: [-30, 0, 10], rShoulder: [-30, 0, -10], lElbow: [-80, 0, 0], rElbow: [-80, 0, 0] });
      let k = 0; const seated = [];
      for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
        if (s === 1 && i === 2) continue; if (s === -1 && i === 5) continue;
        const x = -TL / 2 + 0.55 + i * (TL - 1.1) / 6 + (rng() - 0.5) * 0.15;
        const r = mulberry32(seed * 100 + k);
        const f = F.figure({ kind: kinds[k % 5], seed: 200 + k, pose: seatPose(r), rotY: s === -1 ? 0 : 180 });
        f.group.position.set(x, 0, s * 0.82); tg.add(f.group); F.seatFig(f, 0.485);
        seated.push({ f, x, s, r, k }); k++;
      }
      tg.updateMatrixWorld(true);
      // hands: resting on the table, holding cups, passing food, an arm around a neighbour
      const TW2 = tableY + 0.035;
      for (const { f, x, s, r, k } of seated) {
        const toW = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(tg.matrixWorld);
        const role = k % 5;
        // side s = -1 sits at z = -0.82 facing +z; its left hand is at +x (world of tg local), right at -x
        const lx = x - s * 0.16, rx = x + s * 0.16; // figure's own left/right in table-local x
        const nearZ = s * 0.3;
        let lt = toW(lx, TW2, nearZ), rt = toW(rx, TW2, nearZ + s * -0.05);
        if (role === 1) rt = toW(x + s * 0.05, tableY + 0.28, s * 0.52);            // cup raised to the mouth area
        if (role === 2) rt = toW(x - s * 0.1, TW2 + 0.05, s * 0.02);               // reaching to the middle (passing a bowl)
        if (role === 3) { lt = toW(lx, TW2, s * 0.4); rt = toW(rx + s * 0.05, TW2, s * 0.35); }
        F.reachIK(f, 'l', lt, { local: [0, -0.1, 0.03], iters: 250 });
        F.reachIK(f, 'r', rt, { local: [0, -0.1, 0.03], iters: 250 });
        if (role === 1) { const cp = rt.clone(); const cup = PR.mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 14), new THREE.MeshPhysicalMaterial({ color: 0xe6ddd0, roughness: 0.3 }), [0, 0, 0]); cup.position.copy(cp); scene.add(cup); }
        // heads: talk to a neighbour or across
        const hd = f.joints.head.rotation; hd.y = (r() < 0.5 ? 1 : -1) * (0.35 + r() * 0.5); hd.x = -0.1 + r() * 0.2;
        f.group.updateMatrixWorld(true);
      }
      // someone standing at the head of the table, pouring / serving
      const st = F.figure({ kind: 'oak', seed: 260, pose: { chest: [12, 0, 0], head: [16, 0, 0], rShoulder: [-60, 0, -10], rElbow: [-40, 0, 0], lShoulder: [-50, 0, 10], lElbow: [-50, 0, 0] }, rotY: -90 });
      st.group.position.set(TL / 2 + 0.55, 0, 0.1); F.groundFig(st, 0); if (!noServer) tg.add(st.group);
      // a child on an adult's lap is hard; a child standing on the bench between two adults
      const ch = F.figure({ kind: 'maple', seed: 261, scale: 0.6, child: true, pose: { lShoulder: [-150, 0, 20], rShoulder: [-10, 0, -10], head: [-10, 0, 0] }, rotY: 180 });
      ch.group.position.set(-TL / 2 + 0.55 + 2 * (TL - 1.1) / 6, 0, 0.82); F.groundFig(ch, 0.485); tg.add(ch.group);
    }
    // timber pergola with solar-glass roof over the table
    { const pm = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.7 }); const PH = 3.0, PL = 8.6, PW = 3.4;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) tg.add(PR.mesh(new THREE.BoxGeometry(0.14, PH, 0.14), pm, [sx * PL / 2, PH / 2, sz * PW / 2]));
      for (const sz of [-1, 1]) tg.add(PR.mesh(new THREE.BoxGeometry(PL + 0.4, 0.22, 0.12), pm, [0, PH, sz * PW / 2]));
      for (let i = 0; i <= 8; i++) tg.add(PR.mesh(new THREE.BoxGeometry(0.08, 0.16, PW + 0.4), pm, [-PL / 2 + i * PL / 8, PH + 0.18, 0]));
      const sg = new THREE.MeshPhysicalMaterial({ map: solarTex(), roughness: 0.22, metalness: 0.35, transparent: true, opacity: 0.95, side: THREE.DoubleSide, envMapIntensity: 0.6 });
      for (let i = 0; i < 8; i++) { const pnl = PR.mesh(new THREE.PlaneGeometry(PL / 8 - 0.06, PW + 0.2), sg, [-PL / 2 + (i + 0.5) * PL / 8, PH + 0.28, 0], [-Math.PI / 2, 0, 0.12]); tg.add(pnl); } }
    tableC = new THREE.Vector3().setFromMatrixPosition(tg.matrixWorld);
  }
  // kids playing on the lawn (running, one with a ball) + an adult sitting on the grass watching
  if (figures) {
    const run = (ph) => ({ lHip: [-40 * Math.cos(ph), 0, 4], rHip: [40 * Math.cos(ph), 0, -4], lKnee: [Math.cos(ph) > 0 ? 70 : 20, 0, 0], rKnee: [Math.cos(ph) < 0 ? 70 : 20, 0, 0], lShoulder: [40 * Math.cos(ph), 0, 12], rShoulder: [-40 * Math.cos(ph), 0, -12], lElbow: [-80, 0, 0], rElbow: [-80, 0, 0], chest: [14, 0, 0], head: [-6, 0, 0] });
    const kids = [[3.0, -3.1, 250, 0.3], [4.6, -4.2, 70, 2.2], [2.2, -4.6, 160, 1.2]];
    kids.forEach(([x, z, ry, ph], i) => { const kf = F.figure({ kind: ['maple', 'ash', 'beech'][i], seed: 300 + i, scale: 0.6, child: true, pose: run(ph), rotY: ry }); kf.group.position.set(x, 0, z); F.groundFig(kf, 0.02); kf.group.position.y += i === 1 ? 0.08 : 0.0; scene.add(kf.group); });
    const ball = PR.mesh(new THREE.SphereGeometry(0.12, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd94a2a, roughness: 0.5 }), [3.8, 0.5, -3.6]); ball.castShadow = true; scene.add(ball);
    const wa = F.figure({ kind: 'walnut', seed: 310, pose: F.seatedPose('knees', mulberry32(3)), rotY: 110 }); wa.group.position.set(-9.2, 0, -2.6); F.groundFig(wa, 0.02); scene.add(wa.group);
  }
  // string lights above the table (catenaries), bulbs emissive; at night also a fire pit
  const bulbs = [];
  const bulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.4).multiplyScalar(night ? 9 : 2.5) });
  const wireM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  for (const [a, b] of [[[-9, 4.6, -10.6], [8, 4.2, -9.5]], [[-9, 4.4, -4], [9, 4.6, 4]], [[-10, 4.5, 3], [7, 4.3, -10]]]) {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b); const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; const p = A.clone().lerp(Bv, t); p.y -= Math.sin(t * Math.PI) * 1.1; pts.push(p); }
    scene.add(PR.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.008, 4), wireM, [0, 0, 0], [0, 0, 0], false, false));
    for (let i = 2; i < 40; i += 2) { const bb = PR.mesh(new THREE.SphereGeometry(0.045, 10, 8), bulbM, pts[i].clone().add(new THREE.Vector3(0, -0.06, 0)).toArray(), [0, 0, 0], false, false); scene.add(bb); bulbs.push(pts[i]); }
  }
  let fire = null;
  if (firePit) {
    const fp = new THREE.Vector3(3.8, 0, 3.2);
    const bowl = PR.mesh(new THREE.CylinderGeometry(0.65, 0.4, 0.35, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.6, metalness: 0.6, side: THREE.DoubleSide }), [fp.x, 0.35, fp.z]); scene.add(bowl);
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x2a2020, metalness: 0.5, roughness: 0.6 }), [fp.x, 0.1, fp.z]));
    fire = PR.fire({ pos: [fp.x, 0.42, fp.z], scale: 0.85, flames: 8, flameIntensity: 5, seed: 14, stones: false }); scene.add(fire);
    scene.add(PR.sparks({ pos: [fp.x, 0.42, fp.z], count: 20, height: 1.4, spread: 0.3, seed: 15, intensity: 9 }));
    const L = new THREE.PointLight(new THREE.Color(1.0, 0.52, 0.2), 14, 0, 2); L.position.set(fp.x, 1.0, fp.z); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.003; L.shadow.camera.far = 30; scene.add(L);
    lights.push({ l: L, base: L.position.clone(), r: 0.1, flicker: 0.2, baseI: 14 });
    // low stone benches around the pit + people
    const ringR = 1.7; const kinds = ['beech', 'oak', 'walnut', 'maple', 'ash'];
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + 0.35; if (Math.abs(a - Math.PI * 0.5) < 0.35) continue;
      const x = fp.x + Math.sin(a) * ringR, z = fp.z + Math.cos(a) * ringR;
      scene.add(PR.mesh(PR.rbox(0.6, 0.42, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.9 }), [x, 0.21, z], [0, a, 0]));
      const r = mulberry32(400 + i);
      const f = F.figure({ kind: kinds[i % 5], seed: 400 + i, rotY: a * 180 / Math.PI + 180, pose: { lHip: [-88, 0, 8], rHip: [-88, 0, -8], lKnee: [96, 0, 0], rKnee: [96, 0, 0], chest: [14 + r() * 10, 0, (r() - 0.5) * 10], head: [6, (r() - 0.5) * 40, 0], lShoulder: [-40, 0, 10], rShoulder: [-40, 0, -10], lElbow: [-60, 0, 0], rElbow: [-60, 0, 0] } });
      f.group.position.set(x, 0, z); F.seatFig(f, 0.43); scene.add(f.group);
    }
  }
  return { lights, tableC, tableY, bulbs, fire, tg: tableGroup };
}
