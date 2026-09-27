// Modern-world set pieces: city at night, apartment interior bits, furniture.
import * as THREE from 'three';
import { mulberry32 } from './cine.js';
import * as MT from './mat.js';
import * as PR from './props.js';

// lit-window facade texture (night): mostly dark, some warm/cool lit windows
export function facadeTex({ cols = 12, rows = 20, lit = 0.28, seed = 1, W = 256, H = 512, warm = 0.6, frame = [22, 24, 28], dark = [10, 12, 16] } = {}) {
  const rng = mulberry32(seed);
  return MT.drawTexture(W, H, (g) => {
    g.fillStyle = `rgb(${frame})`; g.fillRect(0, 0, W, H);
    const cw = W / cols, rh = H / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const on = rng() < lit; const x = c * cw + cw * 0.15, y = r * rh + rh * 0.2, w = cw * 0.7, h = rh * 0.6;
      if (on) { const wr = rng() < warm; const v = 0.55 + rng() * 0.45; g.fillStyle = wr ? `rgb(${Math.round(255 * v)},${Math.round(190 * v)},${Math.round(120 * v)})` : `rgb(${Math.round(170 * v)},${Math.round(205 * v)},${Math.round(255 * v)})`; }
      else g.fillStyle = `rgb(${dark})`;
      g.fillRect(x, y, w, h);
    }
  });
}

// distant city skyline of boxes with emissive windows (for bokeh through windows)
export function city({ center = [0, 0, -60], spread = [140, 40], count = 60, seed = 3, emissive = 2.5, heights = [8, 60], litFrac = 0.3, warm = 0.55, minDist = 25, dir = [0, 0, -1] } = {}) {
  const rng = mulberry32(seed); const g = new THREE.Group();
  const texs = [0, 1, 2, 3].map(i => facadeTex({ seed: seed * 10 + i, lit: litFrac, warm }));
  for (let i = 0; i < count; i++) {
    const w = 6 + rng() * 14, d = 6 + rng() * 14, h = heights[0] + Math.pow(rng(), 1.6) * (heights[1] - heights[0]);
    const x = center[0] + (rng() - 0.5) * spread[0], z = center[2] + (rng() - 0.5) * spread[1];
    const t = texs[Math.floor(rng() * texs.length)].clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 8, h / 14);
    const mat = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1, 1, 1).multiplyScalar(emissive * (0.6 + rng() * 0.6)) });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, h / 2 - 2, z); g.add(b);
    if (rng() < 0.25) { const red = PR.mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.08, 0.05).multiplyScalar(12) }), [x, h - 1.8, z], [0, 0, 0], false, false); g.add(red); }
  }
  return g;
}

// scattered bokeh points (street lamps, car lights) as small bright spheres
export function lightPoints({ count = 80, box = [[-40, 0, -60], [40, 12, -20]], colors = [[1, 0.7, 0.4], [0.6, 0.8, 1], [1, 0.85, 0.6]], intensity = 20, size = [0.08, 0.2], seed = 5 } = {}) {
  const rng = mulberry32(seed); const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const c = colors[Math.floor(rng() * colors.length)]; const s = size[0] + rng() * (size[1] - size[0]);
    const m = PR.mesh(new THREE.SphereGeometry(s, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c).multiplyScalar(intensity * (0.4 + rng())) }), [box[0][0] + rng() * (box[1][0] - box[0][0]), box[0][1] + rng() * (box[1][1] - box[0][1]), box[0][2] + rng() * (box[1][2] - box[0][2])], [0, 0, 0], false, false);
    g.add(m);
  }
  return g;
}

// sofa
export function sofa({ pos = [0, 0, 0], rotY = 0, w = 2.4, d = 1.0, seatH = 0.5, color = 0x3c4550, seed = 2 } = {}) {
  const g = new THREE.Group();
  const fab = MT.fabric({ base: [120, 130, 140], seed, weave: 90 });
  const mat = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 0.8, roughness: 0.95, repeat: [3, 3], color });
  g.add(PR.mesh(PR.rbox(w, seatH - 0.12, d, 0.06, 3), mat, [0, (seatH - 0.12) / 2 + 0.06, 0]));
  g.add(PR.mesh(PR.rbox(w, 0.5, 0.22, 0.08, 3), mat, [0, seatH + 0.18, -d / 2 + 0.11]));
  for (const s of [-1, 1]) g.add(PR.mesh(PR.rbox(0.2, 0.3, d, 0.08, 3), mat, [s * (w / 2 - 0.1), seatH + 0.02, 0]));
  // seat cushions
  for (const s of [-1, 1]) g.add(PR.mesh(PR.rbox(w / 2 - 0.22, 0.14, d - 0.26, 0.06, 3), mat, [s * (w / 4 - 0.05), seatH - 0.05, 0.08]));
  g.position.set(...pos); g.rotation.y = rotY;
  return g;
}

// desk + laptop
export function laptop({ pos = [0, 0, 0], rotY = 0, open = 105, screenTex = null, emissive = 1.6, W = 0.36, D = 0.25 } = {}) {
  const g = new THREE.Group();
  const al = new THREE.MeshPhysicalMaterial({ color: 0x8e9196, metalness: 0.85, roughness: 0.32, clearcoat: 0.3 });
  const base = PR.mesh(PR.rbox(W, 0.014, D, 0.006, 2), al, [0, 0.007, 0]); g.add(base);
  // keyboard well
  const kb = PR.mesh(new THREE.PlaneGeometry(W * 0.86, D * 0.46), new THREE.MeshStandardMaterial({ map: keyboardTex(), roughness: 0.6 }), [0, 0.0145, -D * 0.08], [-Math.PI / 2, 0, 0], false, true); g.add(kb);
  const lid = new THREE.Group(); lid.position.set(0, 0.014, -D / 2); lid.rotation.x = -(open - 90) * Math.PI / 180 - Math.PI / 2 + Math.PI / 2; g.add(lid);
  lid.rotation.x = -((open) * Math.PI / 180) + Math.PI / 2;
  const lidB = PR.mesh(PR.rbox(W, D, 0.01, 0.006, 2), al, [0, D / 2, -0.005]); lid.add(lidB);
  const scr = PR.mesh(new THREE.PlaneGeometry(W * 0.9, D * 0.84), new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(1, 1, 1).multiplyScalar(emissive) }), [0, D / 2 + 0.004, 0.0006], [0, 0, 0], false, false); lid.add(scr);
  g.position.set(...pos); g.rotation.y = rotY; g.userData = { lid, screen: scr, W, D };
  return g;
}
export function keyboardTex() {
  return MT.drawTexture(512, 256, (g, W, H) => {
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, W, H);
    const rows = 5, cols = 14; const kw = W / cols, kh = H / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = '#2a2b2f'; PR.roundRect(g, c * kw + 3, r * kh + 3, kw - 6, kh - 6, 4); g.fill(); }
    g.fillStyle = '#2a2b2f'; PR.roundRect(g, W * 0.25, 4 * kh + 3, W * 0.45, kh - 6, 4); g.fill();
  });
}
// generic laptop screen: document / feed with blocks
export function laptopScreenTex({ kind = 'doc', seed = 4 } = {}) {
  const rng = mulberry32(seed);
  return MT.drawTexture(640, 400, (g, W, H) => {
    if (kind === 'doc') {
      g.fillStyle = '#e9edf2'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2d3440'; g.fillRect(0, 0, W, 26);
      g.fillStyle = '#c9d1db'; g.fillRect(0, 26, 120, H);
      for (let i = 0; i < 14; i++) { g.fillStyle = '#9aa6b4'; g.fillRect(14, 44 + i * 22, 70 + rng() * 25, 7); }
      for (let i = 0; i < 16; i++) { g.fillStyle = i === 0 ? '#30394a' : '#5d6878'; const lw = i === 0 ? 280 : 300 + rng() * 170; g.fillRect(150, 50 + i * 20, lw, i === 0 ? 12 : 7); }
    } else {
      g.fillStyle = '#10141a'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 3; i++) { const x = 170 + 0, y = 20 + i * 130; g.fillStyle = `hsl(${Math.round(rng() * 360)},45%,55%)`; g.fillRect(x, y, 300, 110); g.fillStyle = '#e8e8e8'; g.fillRect(x, y + 114, 180, 6); PR.drawHeart(g, x + 290, y + 118, 7, '#ff5a6e'); }
    }
  });
}

// ------------------------------------------------------------------ kitchen
// back wall at z = 0 (cabinets along it), fridge at x = fridgeX (door open toward +x), room extends +z.
export function kitchen({ width = 5.2, depth = 4.6, height = 2.95, fridgeX = -1.9, fridgeOpen = 1.9, seed = 3, windowLit = 1.0, wallBase = [150, 150, 144] } = {}) {
  const g = new THREE.Group();
  const tl = MT.tiles({ base: [120, 122, 122], grout: [80, 82, 82], n: 4, seed: seed, groutW: 0.012 });
  const floor = PR.mesh(new THREE.PlaneGeometry(width, depth), MT.texMat({ map: tl.map, bump: tl.bump, bumpScale: 0.6, roughness: 0.35, repeat: [4, 4] }), [0, 0, depth / 2], [-Math.PI / 2, 0, 0], false, true); g.add(floor);
  const pl = MT.plaster({ base: wallBase, seed: seed + 1 });
  const wallMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.5, roughness: 0.92, repeat: [2, 2] });
  g.add(PR.mesh(new THREE.PlaneGeometry(width, height), wallMat, [0, height / 2, 0], [0, 0, 0], false, true));
  g.add(PR.mesh(new THREE.PlaneGeometry(depth, height), wallMat, [-width / 2, height / 2, depth / 2], [0, Math.PI / 2, 0], false, true));
  g.add(PR.mesh(new THREE.PlaneGeometry(depth, height), wallMat, [width / 2, height / 2, depth / 2], [0, -Math.PI / 2, 0], false, true));
  g.add(PR.mesh(new THREE.PlaneGeometry(width, depth), wallMat, [0, height, depth / 2], [Math.PI / 2, 0, 0], false, true));
  // lower cabinets + counter along back wall (from fridge to right)
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x2f3a38, roughness: 0.55 });
  const topMat = new THREE.MeshPhysicalMaterial({ color: 0xb9b6ae, roughness: 0.25, clearcoat: 0.4 });
  const x0 = fridgeX + 0.5, x1 = width / 2 - 0.05, cw = x1 - x0, cx = (x0 + x1) / 2;
  g.add(PR.mesh(PR.rbox(cw, 0.98, 0.68, 0.01), cabMat, [cx, 0.49, 0.34]));
  g.add(PR.mesh(PR.rbox(cw + 0.02, 0.045, 0.72, 0.008), topMat, [cx, 1.0, 0.36]));
  const nDoors = Math.round(cw / 0.68);
  for (let i = 0; i < nDoors; i++) {
    const dx = x0 + (i + 0.5) * cw / nDoors;
    g.add(PR.mesh(new THREE.BoxGeometry(0.006, 0.8, 0.006), new THREE.MeshStandardMaterial({ color: 0x151a19 }), [x0 + (i + 1) * cw / nDoors, 0.5, 0.685], [0, 0, 0], false, false));
    g.add(PR.mesh(new THREE.BoxGeometry(0.16, 0.012, 0.02), new THREE.MeshStandardMaterial({ color: 0x9a9a98, metalness: 0.9, roughness: 0.3 }), [dx, 0.88, 0.69]));
  }
  // upper cabinets
  g.add(PR.mesh(PR.rbox(cw - 1.2, 0.8, 0.38, 0.01), cabMat, [cx + 0.6, 2.05, 0.19]));
  // window above the sink (left part of counter)
  const wx = x0 + 0.75;
  const winFrame = new THREE.MeshStandardMaterial({ color: 0x1e2224, roughness: 0.5 });
  g.add(PR.mesh(new THREE.BoxGeometry(1.1, 0.04, 0.1), winFrame, [wx, 1.28, 0.03])); g.add(PR.mesh(new THREE.BoxGeometry(1.1, 0.04, 0.1), winFrame, [wx, 2.32, 0.03]));
  for (const s of [-0.55, 0, 0.55]) g.add(PR.mesh(new THREE.BoxGeometry(0.04, 1.08, 0.1), winFrame, [wx + s, 1.8, 0.03]));
  const night = PR.mesh(new THREE.PlaneGeometry(1.1, 1.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.1, 0.2).multiplyScalar(windowLit) }), [wx, 1.8, -0.02], [0, 0, 0], false, false); g.add(night);
  // sink + tap
  g.add(PR.mesh(PR.rbox(0.55, 0.02, 0.4, 0.01), new THREE.MeshStandardMaterial({ color: 0x5c5f60, metalness: 0.8, roughness: 0.25 }), [wx, 1.025, 0.38]));
  const tap = new THREE.CatmullRomCurve3([new THREE.Vector3(wx, 1.02, 0.12), new THREE.Vector3(wx, 1.35, 0.14), new THREE.Vector3(wx, 1.38, 0.26), new THREE.Vector3(wx, 1.28, 0.34)]);
  g.add(PR.mesh(new THREE.TubeGeometry(tap, 20, 0.014, 8), new THREE.MeshStandardMaterial({ color: 0xb0b2b4, metalness: 1, roughness: 0.2 })));
  // oven standby light, kettle
  g.add(PR.mesh(new THREE.BoxGeometry(0.02, 0.008, 0.004), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.0, 0.5).multiplyScalar(6) }), [x0 + 2.3, 0.86, 0.69], [0, 0, 0], false, false));
  g.add(PR.mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.24, 24), new THREE.MeshPhysicalMaterial({ color: 0xcfd2d4, metalness: 0.7, roughness: 0.25 }), [x0 + 1.7, 1.14, 0.35]));
  // fridge: body + open door + glowing interior
  const fr = new THREE.Group(); fr.position.set(fridgeX, 0, 0.36); g.add(fr);
  const ss = new THREE.MeshPhysicalMaterial({ color: 0xa8abad, metalness: 0.75, roughness: 0.32, clearcoat: 0.2 });
  const FW = 0.8, FH = 1.95, FD = 0.7;
  // shell (open front)
  fr.add(PR.mesh(new THREE.BoxGeometry(FW, FH, 0.03), ss, [0, FH / 2, -FD / 2]));
  fr.add(PR.mesh(new THREE.BoxGeometry(0.03, FH, FD), ss, [-FW / 2, FH / 2, 0])); fr.add(PR.mesh(new THREE.BoxGeometry(0.03, FH, FD), ss, [FW / 2, FH / 2, 0]));
  fr.add(PR.mesh(new THREE.BoxGeometry(FW, 0.03, FD), ss, [0, FH, 0])); fr.add(PR.mesh(new THREE.BoxGeometry(FW, 0.08, FD), ss, [0, 0.04, 0]));
  const inner = new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 0.4, emissive: new THREE.Color(0.85, 0.92, 1.0), emissiveIntensity: 0.9 });
  fr.add(PR.mesh(new THREE.PlaneGeometry(FW - 0.06, FH - 0.12), inner, [0, FH / 2, -FD / 2 + 0.02], [0, 0, 0], false, true));
  for (const s of [-1, 1]) fr.add(PR.mesh(new THREE.PlaneGeometry(FD - 0.04, FH - 0.12), inner, [s * (FW / 2 - 0.02), FH / 2, 0], [0, -s * Math.PI / 2, 0], false, true));
  // shelves + items
  const glassSh = new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, roughness: 0.05, transparent: true, opacity: 0.35, emissive: new THREE.Color(0.5, 0.6, 0.7), emissiveIntensity: 0.6 });
  const rng = mulberry32(seed + 9);
  const itemCols = [0xd94a3a, 0xf0e6c8, 0x3a8a4a, 0xe8c040, 0xffffff, 0x6a9ad0, 0xc07840];
  for (const y of [0.45, 0.85, 1.25, 1.62]) {
    fr.add(PR.mesh(new THREE.BoxGeometry(FW - 0.06, 0.012, FD - 0.1), glassSh, [0, y, -0.03], [0, 0, 0], false, true));
    for (let k = 0; k < 4; k++) { const hh = 0.08 + rng() * 0.16; const it = PR.mesh(rng() < 0.5 ? new THREE.CylinderGeometry(0.04 + rng() * 0.03, 0.04 + rng() * 0.03, hh, 16) : PR.rbox(0.1 + rng() * 0.08, hh, 0.1, 0.015), new THREE.MeshStandardMaterial({ color: itemCols[Math.floor(rng() * itemCols.length)], roughness: 0.5 }), [-0.28 + k * 0.18 + rng() * 0.04, y + hh / 2 + 0.006, -0.12 + rng() * 0.12]); fr.add(it); }
  }
  // open door: hinged at the front-right corner; closed it spans -x from the hinge; opens by +angle about y
  const door = new THREE.Group(); door.position.set(FW / 2, 0, FD / 2); door.rotation.y = fridgeOpen; fr.add(door);
  door.add(PR.mesh(new THREE.BoxGeometry(FW, FH, 0.06), ss, [-FW / 2, FH / 2, 0.03]));
  door.add(PR.mesh(new THREE.PlaneGeometry(FW - 0.08, FH - 0.16), inner, [-FW / 2, FH / 2, -0.002], [0, Math.PI, 0], false, true));
  for (const y of [0.35, 0.8, 1.25]) { door.add(PR.mesh(new THREE.BoxGeometry(FW - 0.12, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.4, transparent: true, opacity: 0.8 }), [-FW / 2, y, -0.06], [0, 0, 0], false, true)); for (let k = 0; k < 3; k++) door.add(PR.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12), new THREE.MeshStandardMaterial({ color: itemCols[Math.floor(rng() * itemCols.length)], roughness: 0.4 }), [-0.15 - k * 0.22, y + 0.1, -0.06])); }
  door.add(PR.mesh(new THREE.BoxGeometry(0.02, 0.5, 0.03), new THREE.MeshStandardMaterial({ color: 0x9a9c9e, metalness: 0.9, roughness: 0.25 }), [-FW + 0.06, 1.1, 0.075]));
  g.userData = { fridge: fr, fridgeFront: new THREE.Vector3(fridgeX, 1.0, 0.36 + FD / 2), FW, FH, windowX: wx };
  return g;
}

export function table({ pos = [0, 0, 0], w = 1.5, d = 0.85, h = 0.86, color = 0x6b4f3a, rotY = 0 } = {}) {
  const g = new THREE.Group();
  const pl = MT.planks({ base: [140, 104, 74], dark: [96, 68, 46], planksAcross: 4, seed: 21 });
  const mat = MT.texMat({ map: pl.map, rough: pl.rough, roughness: 0.45, repeat: [1, 1] });
  g.add(PR.mesh(PR.rbox(w, 0.045, d, 0.008), mat, [0, h - 0.0225, 0]));
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.6 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(PR.mesh(new THREE.BoxGeometry(0.05, h - 0.045, 0.05), legMat, [sx * (w / 2 - 0.08), (h - 0.045) / 2, sz * (d / 2 - 0.08)]));
  g.position.set(...pos); g.rotation.y = rotY; return g;
}
export function chair({ pos = [0, 0, 0], rotY = 0, seatH = 0.5, color = 0x3a2e24 } = {}) {
  const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  g.add(PR.mesh(PR.rbox(0.44, 0.04, 0.42, 0.01), mat, [0, seatH - 0.02, 0]));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(PR.mesh(new THREE.CylinderGeometry(0.016, 0.014, seatH - 0.04, 8), mat, [sx * 0.19, (seatH - 0.04) / 2, sz * 0.18]));
  for (const sx of [-1, 1]) g.add(PR.mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 8), mat, [sx * 0.19, seatH + 0.25, -0.19]));
  g.add(PR.mesh(PR.rbox(0.42, 0.14, 0.03, 0.01), mat, [0, seatH + 0.42, -0.19]));
  g.position.set(...pos); g.rotation.y = rotY; return g;
}
