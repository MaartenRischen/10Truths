// Props and set pieces for Direction E.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mulberry32 } from './cine.js';
import * as MT from './mat.js';

export const rbox = (w, h, d, r = 0.02, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
export function mesh(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; return m;
}

// ------------------------------------------------------------------ screens (UI textures)
// generic lock screen: soft wallpaper, thin clock, alarm pill
export function phoneScreenTex({ time = '6:00', wall = 'dawn', alarm = true, W = 360, H = 740, dim = 1 } = {}) {
  return MT.drawTexture(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, W * 0.3, H);
    if (wall === 'dawn') { gr.addColorStop(0, '#1d3a5c'); gr.addColorStop(0.55, '#3b5f86'); gr.addColorStop(1, '#8aa6c4'); }
    else { gr.addColorStop(0, '#1b2230'); gr.addColorStop(1, '#394a63'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // soft blobs
    for (const [x, y, r, c] of [[0.2, 0.75, 0.5, 'rgba(255,190,140,0.35)'], [0.85, 0.35, 0.45, 'rgba(120,200,255,0.25)']]) {
      const rg = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    g.fillStyle = 'rgba(255,255,255,0.96)'; g.textAlign = 'center';
    g.font = '200 118px "DejaVu Sans", sans-serif'; g.fillText(time, W / 2, H * 0.27);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(W * 0.34, H * 0.305, W * 0.32, 7); // date line (abstract)
    if (alarm) {
      g.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(g, W * 0.12, H * 0.8, W * 0.76, 70, 35); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(W * 0.12 + 35, H * 0.8 + 35, 27, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, H * 0.55, 46, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(W / 2, H * 0.55); g.lineTo(W / 2, H * 0.55 - 28); g.moveTo(W / 2, H * 0.55); g.lineTo(W / 2 + 20, H * 0.55); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.8)'; roundRect(g, W * 0.36, H - 22, W * 0.28, 7, 3.5); g.fill();
    if (dim < 1) { g.fillStyle = `rgba(0,0,0,${1 - dim})`; g.fillRect(0, 0, W, H); }
  });
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// grid of anonymous profile faces (manikin egg heads as avatars) + hearts: generic dating/feed UI
export function faceGridTex({ W = 360, H = 740, seed = 3, cols = 2, rows = 3, heart = true } = {}) {
  const rng = mulberry32(seed);
  return MT.drawTexture(W, H, (g) => {
    g.fillStyle = '#0e1116'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(W * 0.08, 34, W * 0.3, 10);
    const pad = 12, top = 70, cw = (W - pad * (cols + 1)) / cols, ch = (H - top - 90 - pad * (rows + 1)) / rows;
    const palettes = [['#e9b99a', '#b5694a'], ['#9ec5e8', '#4d6f9c'], ['#f2d28b', '#c07a3a'], ['#c9b6e4', '#6b5a9a'], ['#a8dcc8', '#3f8a73'], ['#f0a8a8', '#a0525c']];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = pad + c * (cw + pad), y = top + pad + r * (ch + pad);
      const p = palettes[Math.floor(rng() * palettes.length)];
      const gr = g.createLinearGradient(x, y, x, y + ch); gr.addColorStop(0, p[0]); gr.addColorStop(1, p[1]);
      g.save(); roundRect(g, x, y, cw, ch, 14); g.clip(); g.fillStyle = gr; g.fillRect(x, y, cw, ch);
      // manikin head & shoulders silhouette (no face)
      const cx = x + cw * (0.45 + rng() * 0.1), cy = y + ch * 0.42;
      g.fillStyle = 'rgba(245,225,196,0.95)';
      g.beginPath(); g.ellipse(cx, cy, cw * 0.16, ch * 0.2, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(cx - cw * 0.05, cy + ch * 0.17, cw * 0.1, ch * 0.08);
      g.beginPath(); g.ellipse(cx, y + ch * 1.02, cw * 0.4, ch * 0.3, 0, Math.PI, 0); g.fill();
      const sh = g.createLinearGradient(x, y + ch * 0.6, x, y + ch); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = sh; g.fillRect(x, y, cw, ch);
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(x + 10, y + ch - 24, cw * 0.4, 8);
      if (heart) { drawHeart(g, x + cw - 24, y + ch - 22, 9, 'rgba(255,90,110,0.95)'); }
      g.restore();
    }
    // bottom bar with big heart / X
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, H - 80, W, 80);
    drawHeart(g, W * 0.62, H - 40, 18, '#ff5a6e');
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 5; g.beginPath(); g.moveTo(W * 0.34, H - 52); g.lineTo(W * 0.4, H - 28); g.moveTo(W * 0.4, H - 52); g.lineTo(W * 0.34, H - 28); g.stroke();
  });
}
export function drawHeart(g, x, y, s, col) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.8, y - s * 1.3, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.8, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); g.fill();
}

// ------------------------------------------------------------------ phone
export function phone({ screenTex, emissive = 3.0, on = true, faceDown = false } = {}) {
  const g = new THREE.Group();
  const W = 0.086, L = 0.178, T = 0.010;
  const body = mesh(rbox(W, T, L, 0.004, 2), new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: 0.35, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }));
  g.add(body);
  const scrMat = on ? new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(1, 1, 1).multiplyScalar(emissive) })
    : new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.05, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02 });
  const scr = mesh(new THREE.PlaneGeometry(W * 0.92, L * 0.95), scrMat, [0, T / 2 + 0.0006, 0], [-Math.PI / 2, 0, 0], false, false);
  g.add(scr);
  // camera bump on back
  g.add(mesh(rbox(0.03, 0.004, 0.03, 0.006, 2), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.3, metalness: 0.5 }), [W * 0.22, -T / 2 - 0.002, -L * 0.36]));
  if (faceDown) g.rotation.z = Math.PI;
  g.userData = { W, L, T, screen: scr };
  return g;
}

// orient an object so its local +Y = normal (screen facing) and local +Z ~ along
export function orient(obj, pos, normal, along) {
  const y = normal.clone().normalize(); const z = along.clone().sub(y.clone().multiplyScalar(along.dot(y))).normalize(); const x = new THREE.Vector3().crossVectors(y, z);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); obj.position.copy(pos); return obj;
}

// ------------------------------------------------------------------ bedroom
export function bedroom({ width = 4.2, depth = 4.6, height = 2.95, wallColor = [196, 202, 206], windowAt = { wall: 'left', x: 0, y: 1.55, w: 1.5, h: 1.5 }, seed = 1, blindsRaised = false } = {}) {
  // room: floor y=0, back wall z=0 (headboard wall), left wall x = -width/2 ... room extends +z
  const g = new THREE.Group();
  const pl = MT.plaster({ base: wallColor, seed: seed + 2 });
  const wallMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.6, roughness: 0.92, repeat: [2, 2] });
  const fl = MT.planks({ base: [150, 118, 88], dark: [104, 78, 56], planksAcross: 5, seed: seed + 3 });
  const floorMat = MT.texMat({ map: fl.map, rough: fl.rough, roughness: 0.55, repeat: [1.3, 1.3] });
  const floor = mesh(new THREE.PlaneGeometry(width, depth), floorMat, [0, 0, depth / 2], [-Math.PI / 2, 0, 0], false, true); g.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(width, depth), wallMat, [0, height, depth / 2], [Math.PI / 2, 0, 0], false, true); g.add(ceil);
  const back = mesh(new THREE.PlaneGeometry(width, height), wallMat, [0, height / 2, 0], [0, 0, 0], false, true); g.add(back);
  const front = mesh(new THREE.PlaneGeometry(width, height), wallMat, [0, height / 2, depth], [0, Math.PI, 0], false, true); g.add(front);
  const right = mesh(new THREE.PlaneGeometry(depth, height), wallMat, [width / 2, height / 2, depth / 2], [0, -Math.PI / 2, 0], false, true); g.add(right);
  // left wall with a window hole (built from 4 pieces)
  const L = new THREE.Group(); L.position.set(-width / 2, 0, 0); L.rotation.y = Math.PI / 2; g.add(L);
  const wz = windowAt.x, wy = windowAt.y, ww = windowAt.w, wh = windowAt.h; // wz along wall (world +z), wy centre height
  const piece = (x0, x1, y0, y1) => { if (x1 - x0 <= 0 || y1 - y0 <= 0) return; const p = mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), wallMat, [(x0 + x1) / 2, (y0 + y1) / 2, 0], [0, 0, 0], true, true); L.add(p); };
  // In L local: +x = world -z ... (rotation.y=+90 maps local +x to world -z). Use negative coords for +z world.
  const zc = -wz; // local x of window centre
  piece(-depth, zc - ww / 2, 0, height); piece(zc + ww / 2, 0.0, 0, height);
  piece(zc - ww / 2, zc + ww / 2, 0, wy - wh / 2); piece(zc - ww / 2, zc + ww / 2, wy + wh / 2, height);
  // reveal (wall thickness) + frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.6 });
  const th = 0.22;
  const rv = [[0, wy - wh / 2, ww, 0.02], [0, wy + wh / 2, ww, 0.02]];
  for (const [dx, y, w2] of rv) L.add(mesh(new THREE.BoxGeometry(w2, 0.03, th), frameMat, [zc + dx, y, -th / 2]));
  for (const s of [-1, 1]) L.add(mesh(new THREE.BoxGeometry(0.03, wh, th), frameMat, [zc + s * ww / 2, wy, -th / 2]));
  // sill
  L.add(mesh(new THREE.BoxGeometry(ww + 0.12, 0.035, th + 0.06), frameMat, [zc, wy - wh / 2 - 0.015, -th / 2 + 0.03]));
  // blinds: horizontal slats inside the reveal, slightly open
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.55, side: THREE.DoubleSide });
  const nS = Math.floor(wh / 0.055);
  const slats = new THREE.Group();
  for (let i = 0; i < nS; i++) {
    const s = mesh(new THREE.BoxGeometry(ww - 0.04, 0.003, 0.05), slatMat, [zc, wy - wh / 2 + 0.03 + i * (wh - 0.04) / nS, 0.035], [0.55, 0, 0]);
    slats.add(s);
  }
  if (blindsRaised) { slats.children.forEach((sl, i) => { sl.visible = i >= nS - 4; sl.rotation.x = 0; }); }
  L.add(slats);
  // cords
  for (const s of [-0.3, 0.3]) L.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, wh, 6), slatMat, [zc + s * ww, wy, 0.06]));
  g.userData = { wallMat, floorMat, windowCenter: new THREE.Vector3(-width / 2, wy, wz), windowLocalGroup: L };
  return g;
}

// bed: mattress top at topY, along +z from headZ
export function bed({ x = 0, headZ = 0, w = 1.8, len = 2.3, topY = 0.58, sheet, seed = 1, frameColor = 0x6d5646 } = {}) {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.6 });
  const mattH = 0.24;
  g.add(mesh(rbox(w + 0.08, topY - mattH - 0.06, len + 0.06, 0.02), frameMat, [x, (topY - mattH - 0.06) / 2 + 0.06, headZ + len / 2]));
  // legs hidden; headboard (upholstered)
  const hbMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.9 });
  g.add(mesh(rbox(w + 0.12, 1.0, 0.1, 0.04), hbMat, [x, topY + 0.25, headZ - 0.04]));
  const sheetMat = sheet || new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.95 });
  g.add(mesh(rbox(w, mattH, len, 0.06, 4), sheetMat, [x, topY - mattH / 2, headZ + len / 2 + 0.02]));
  g.userData = { topY, sheetMat };
  return g;
}
export function pillow({ w = 0.72, h = 0.16, d = 0.44, mat, pos, rot = [0, 0, 0] }) {
  const geo = rbox(w, h, d, 0.07, 5);
  // squash profile: thinner at edges
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), z = p.getZ(i) / (d / 2); const k = 1 - 0.35 * Math.max(Math.abs(x) ** 4, Math.abs(z) ** 4); p.setY(i, p.getY(i) * k); }
  geo.computeVertexNormals();
  return mesh(geo, mat, pos, rot);
}

export function nightstand({ pos, topY = 0.7, w = 0.52, d = 0.42, color = 0xb9a58c }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  g.add(mesh(rbox(w, topY, d, 0.015), mat, [0, topY / 2, 0]));
  g.add(mesh(new THREE.BoxGeometry(w - 0.06, 0.004, 0.004), new THREE.MeshStandardMaterial({ color: 0x3a3230 }), [0, topY * 0.62, d / 2 + 0.001]));
  g.position.set(...pos);
  return g;
}
export function lamp({ pos, on = false, color = [1.0, 0.72, 0.42], intensity = 2.5 }) {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.34, 32), new THREE.MeshPhysicalMaterial({ color: 0xd9d4cc, roughness: 0.35, clearcoat: 0.6 }), [0, 0.17, 0]);
  g.add(base);
  const shadeGeo = new THREE.CylinderGeometry(0.13, 0.18, 0.24, 40, 1, true);
  const shadeMat = on ? new THREE.MeshStandardMaterial({ color: 0xf2e6d2, emissive: new THREE.Color(...color), emissiveIntensity: intensity * 0.5, side: THREE.DoubleSide, roughness: 1 })
    : new THREE.MeshStandardMaterial({ color: 0xe9e2d6, roughness: 1, side: THREE.DoubleSide });
  g.add(mesh(shadeGeo, shadeMat, [0, 0.46, 0]));
  g.position.set(...pos);
  return g;
}
export function glassOfWater({ pos }) {
  const g = new THREE.Group();
  const glass = mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.11, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.25, clearcoat: 1, side: THREE.DoubleSide, envMapIntensity: 1.5 }), [0, 0.055, 0], [0, 0, 0], false, false);
  g.add(glass);
  const water = mesh(new THREE.CylinderGeometry(0.033, 0.031, 0.07, 32), new THREE.MeshPhysicalMaterial({ color: 0xbcd6e0, roughness: 0.05, transparent: true, opacity: 0.35 }), [0, 0.035, 0], [0, 0, 0], false, false);
  g.add(water);
  g.position.set(...pos);
  return g;
}

// ------------------------------------------------------------------ reed hut interior (dome)
export function reedHut({ center = [0, 0, 0], R = 2.6, H = 2.6, door = { az: Math.PI, w: 0.95, h: 1.35 }, floorY = 0, seed = 7 } = {}) {
  const g = new THREE.Group();
  const th = MT.thatch({ seed });
  th.map.repeat.set(5, 3); th.bump.repeat.set(5, 3);
  const thMat = new THREE.MeshStandardMaterial({ map: th.map, bumpMap: th.bump, bumpScale: 2.0, roughness: 0.95, side: THREE.DoubleSide, color: 0xd8cfc0 });
  const geo = new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  geo.scale(R, H, R);
  // cut the door: remove faces whose centroid is within door azimuth and below door height
  const pos = geo.attributes.position; const idx = geo.index.array; const keep = [];
  const dAz = door.w / R / 2;
  for (let i = 0; i < idx.length; i += 3) {
    let cx = 0, cy = 0, cz = 0; for (let k = 0; k < 3; k++) { cx += pos.getX(idx[i + k]); cy += pos.getY(idx[i + k]); cz += pos.getZ(idx[i + k]); }
    cx /= 3; cy /= 3; cz /= 3;
    const az = Math.atan2(cz, cx); let da = Math.abs(az - door.az); da = Math.min(da, Math.PI * 2 - da);
    const archH = door.h * Math.sqrt(Math.max(0, 1 - (da / dAz) ** 2 * 0.35));
    if (da < dAz && cy < archH) continue;
    keep.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  geo.setIndex(keep); geo.computeVertexNormals();
  // lumpy thatch displacement
  const N = MT.makeNoise(seed);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const n = (N.fbm(x * 1.5 + 5, z * 1.5 + y * 2, 3) - 0.5) * 0.12; const s = 1 + n / R; pos.setXYZ(i, x * s, y * (1 + n * 0.3 / H), z * s); }
  geo.computeVertexNormals();
  const dome = mesh(geo, thMat, [0, 0, 0], [0, 0, 0], true, true); g.add(dome);
  // bent pole ribs (visible inside)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4d3a28, roughness: 0.85 });
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI;
    const pts = []; for (let t = 0; t <= 24; t++) { const ph = -Math.PI / 2 + t / 24 * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * Math.sin(ph) * R * 0.975, Math.cos(ph) * H * 0.975, Math.sin(a) * Math.sin(ph) * R * 0.975)); }
    const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.022, 6), poleMat); g.add(tube);
  }
  // horizontal binding rings
  for (const hh of [0.45, 0.9, 1.4, 1.9]) {
    const r = R * Math.sqrt(1 - (hh / H) ** 2) * 0.97;
    const ring = mesh(new THREE.TorusGeometry(r, 0.014, 5, 96), poleMat, [0, hh, 0], [Math.PI / 2, 0, 0]); g.add(ring);
  }
  // door arch bundle
  const arch = []; for (let t = 0; t <= 20; t++) { const u = -1 + 2 * t / 20; const az = door.az + u * dAz; const y = door.h * Math.sqrt(Math.max(0, 1 - u * u * 0.35)) * (Math.abs(u) > 0.98 ? 0 : 1); arch.push(new THREE.Vector3(Math.cos(az) * R, Math.abs(u) > 0.98 ? 0 : y, Math.sin(az) * R)); }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arch), 40, 0.05, 8), thMat));
  // floor
  const ea = MT.earth({ seed: seed + 1 }); ea.map.repeat.set(9, 9); ea.bump.repeat.set(9, 9);
  const floor = mesh(new THREE.CircleGeometry(R * 3.5, 64), new THREE.MeshStandardMaterial({ map: ea.map, bumpMap: ea.bump, bumpScale: 1.5, roughness: 0.95 }), [0, 0.001, 0], [-Math.PI / 2, 0, 0], false, true);
  g.add(floor);
  g.position.set(center[0], floorY, center[2]);
  g.userData = { thMat };
  return g;
}

// bedding of grass/hides: a lumpy slab
export function bedding({ w = 1.6, d = 2.4, h = 0.16, pos, hideColor = [150, 112, 74], seed = 3 }) {
  const g = new THREE.Group();
  const hd = MT.hide({ base: hideColor, seed });
  const geo = new THREE.BoxGeometry(w, h, d, 40, 1, 60);
  const N = MT.makeNoise(seed); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const e = Math.min(1, (w / 2 - Math.abs(x)) / 0.15, (d / 2 - Math.abs(z)) / 0.15); const n = (N.fbm(x * 2 + 3, z * 2, 3) - 0.5) * 0.06; p.setY(i, y > 0 ? y * Math.max(0.2, e) + n : y); }
  geo.computeVertexNormals();
  g.add(mesh(geo, new THREE.MeshStandardMaterial({ map: hd.map, bumpMap: hd.bump, bumpScale: 3, roughness: 1 }), [0, h / 2, 0]));
  g.position.set(...pos);
  return g;
}

// dry grass tufts scattered on a surface
export function grassTufts({ count = 400, area = [2, 2], center = [0, 0, 0], height = 0.12, color = [0.55, 0.45, 0.28], seed = 5, lean = 0.6 }) {
  const rng = mulberry32(seed);
  const blade = new THREE.PlaneGeometry(0.012, 1, 1, 4); blade.translate(0, 0.5, 0);
  const p = blade.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.9)); p.setZ(i, y * y * 0.25); }
  blade.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(...color), roughness: 0.9, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(blade, mat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3();
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    t.set(center[0] + (rng() - 0.5) * area[0], center[1], center[2] + (rng() - 0.5) * area[1]);
    e.set((rng() - 0.5) * lean, rng() * Math.PI * 2, (rng() - 0.5) * lean); q.setFromEuler(e);
    const hh = height * (0.5 + rng()); s.set(1, hh, 1); m4.compose(t, q, s); im.setMatrixAt(i, m4);
    col.setRGB(color[0] * (0.7 + rng() * 0.5), color[1] * (0.7 + rng() * 0.5), color[2] * (0.7 + rng() * 0.4)); im.setColorAt(i, col);
  }
  im.castShadow = true; im.receiveShadow = true;
  return im;
}

// ------------------------------------------------------------------ fire
export function fire({ pos = [0, 0, 0], scale = 1, logs = 5, seed = 1, flames = 7, emberGlow = 4, stones = true, flameIntensity = 6 } = {}) {
  const g = new THREE.Group(); const rng = mulberry32(seed);
  const logMat = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.9, emissive: new THREE.Color(1.0, 0.28, 0.05), emissiveIntensity: 0 });
  // ember texture via emissiveMap: cracks
  const emTex = MT.canvasTexture(256, (u, v, o) => { const N = emberNoise; const n = N.fbm(u * 8, v * 3, 4); const c = Math.max(0, (n - 0.52) * 5); o[0] = 255 * Math.min(1, c * 1.2); o[1] = 255 * Math.min(1, c * 0.45); o[2] = 255 * Math.min(1, c * 0.1); }, { srgb: true });
  logMat.emissiveMap = emTex; logMat.emissiveIntensity = emberGlow;
  for (let i = 0; i < logs; i++) {
    const a = i / logs * Math.PI * 2 + rng() * 0.3;
    const L = 0.55 + rng() * 0.2;
    const lg = mesh(new THREE.CylinderGeometry(0.035, 0.045, L, 10), logMat, [Math.cos(a) * 0.12, 0.09, Math.sin(a) * 0.12]);
    lg.rotation.set(0, 0, 0); lg.lookAt(new THREE.Vector3(Math.cos(a) * 0.6, -0.05, Math.sin(a) * 0.6)); lg.rotateX(Math.PI / 2);
    lg.position.set(Math.cos(a) * 0.14, 0.1, Math.sin(a) * 0.14);
    // tilt inward like a teepee
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    lg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-d.x * 0.8, 0.9, -d.z * 0.8).normalize());
    lg.position.set(d.x * 0.2, 0.14, d.z * 0.2);
    g.add(lg);
  }
  // ember bed
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x1a120e, roughness: 1, emissive: new THREE.Color(1, 0.3, 0.06), emissiveMap: emTex, emissiveIntensity: emberGlow * 1.2 });
  g.add(mesh(new THREE.CircleGeometry(0.26, 32), bedMat, [0, 0.012, 0], [-Math.PI / 2, 0, 0], false, true));
  if (stones) {
    const stMat = new THREE.MeshStandardMaterial({ color: 0x5c5650, roughness: 0.9 });
    const n = 11; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rng() * 0.2; const s = 0.07 + rng() * 0.04; const st = mesh(new THREE.DodecahedronGeometry(s, 1), stMat, [Math.cos(a) * 0.36, s * 0.5, Math.sin(a) * 0.36], [rng(), rng(), rng()]); st.scale.set(1.2, 0.75, 1); g.add(st); }
  }
  // flames: crossed additive quads
  const fl = new THREE.Group();
  for (let i = 0; i < flames; i++) {
    const tex = MT.flameTexture(seed * 13 + i);
    const hgt = 0.45 + rng() * 0.35, wid = hgt * (0.42 + rng() * 0.18);
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1, 1, 1).multiplyScalar(flameIntensity * (0.6 + rng() * 0.6)), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const q = mesh(new THREE.PlaneGeometry(wid, hgt), mat, [(rng() - 0.5) * 0.14, hgt / 2 + 0.02, (rng() - 0.5) * 0.14], [0, rng() * Math.PI, (rng() - 0.5) * 0.25], false, false);
    fl.add(q);
  }
  g.add(fl);
  g.userData.flames = fl;
  g.position.set(...pos); g.scale.setScalar(scale);
  return g;
}
const emberNoise = MT.makeNoise(99);

// sparks: small bright streaks rising
export function sparks({ pos = [0, 0, 0], count = 40, height = 1.6, spread = 0.35, seed = 2, intensity = 8 }) {
  const rng = mulberry32(seed); const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.18).multiplyScalar(intensity), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  for (let i = 0; i < count; i++) {
    const y = 0.4 + Math.pow(rng(), 1.5) * height; const r = spread * (0.3 + y / height) * rng();
    const a = rng() * Math.PI * 2; const len = 0.015 + rng() * 0.05;
    const s = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, len, 4), mat, [pos[0] + Math.cos(a) * r, pos[1] + y, pos[2] + Math.sin(a) * r], [(rng() - 0.5) * 0.6, 0, (rng() - 0.5) * 0.6], false, false);
    g.add(s);
  }
  return g;
}

// starry night sky dome (gradient + stars)
export function nightSky({ radius = 150, top = [0.004, 0.008, 0.02], horizon = [0.03, 0.035, 0.06], stars = 1500, seed = 4, starI = 2.0, glow = null }) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Vector3(...top) }, hor: { value: new THREE.Vector3(...horizon) }, glowDir: { value: new THREE.Vector3(...(glow?.dir || [0, 0, -1])).normalize() }, glowCol: { value: new THREE.Vector3(...(glow?.color || [0, 0, 0])) } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top,hor,glowDir,glowCol; varying vec3 vP; void main(){ float y = max(vP.y, 0.0); vec3 c = mix(hor, top, pow(y, 0.45)); float gd = max(dot(normalize(vec3(vP.x, 0.0, vP.z)), glowDir), 0.0); c += glowCol * pow(gd, 6.0) * exp(-y*6.0); if (vP.y < 0.0) c = hor*0.6; gl_FragColor = vec4(c,1.); }` });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat));
  const rng = mulberry32(seed); const pts = []; const cols = [];
  for (let i = 0; i < stars; i++) { const u = rng(), v = rng(); const th = u * Math.PI * 2, y = 0.08 + v * 0.92; const r = Math.sqrt(1 - y * y); pts.push(Math.cos(th) * r * radius * 0.98, y * radius * 0.98, Math.sin(th) * r * radius * 0.98); const b = Math.pow(rng(), 6) * starI + 0.08; cols.push(b, b * (0.9 + rng() * 0.1), b * (0.95 + rng() * 0.1)); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.1, sizeAttenuation: false, vertexColors: true, fog: false })));
  return g;
}

// gradient sky for day/dusk/dawn with sun glow
export function daySky({ radius = 300, zenith = [0.2, 0.35, 0.7], horizon = [1.0, 0.75, 0.5], ground = [0.2, 0.16, 0.12], sunDir = [0, 0.1, -1], sunColor = [20, 12, 6], sunSize = 0.9995, glow = [2.0, 1.1, 0.5], glowPow = 8 }) {
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { zen: { value: new THREE.Vector3(...zenith) }, hor: { value: new THREE.Vector3(...horizon) }, gnd: { value: new THREE.Vector3(...ground) }, sd: { value: new THREE.Vector3(...sunDir).normalize() }, sc: { value: new THREE.Vector3(...sunColor) }, ss: { value: sunSize }, gl: { value: new THREE.Vector3(...glow) }, gp: { value: glowPow } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 zen,hor,gnd,sd,sc,gl; uniform float ss,gp; varying vec3 vP;
      void main(){ vec3 d = normalize(vP); float y = d.y; vec3 c = y > 0. ? mix(hor, zen, pow(y, 0.5)) : mix(hor, gnd, pow(min(1.,-y*4.), 0.5));
        float cs = max(dot(d, sd), 0.); c += gl * pow(cs, gp) + gl*0.25*pow(cs, 2.0); c += sc * smoothstep(ss, ss+0.0003, cs);
        gl_FragColor = vec4(c, 1.); }` });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
}
