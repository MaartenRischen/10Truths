// P15 THE NEW WORLD — a modern city drawn in warm light: homes around gardens, a long table, a tram line, solar roofs.
// Warm threads land everywhere. A new web larger than the old one.
import { Stage, THREE, COL, V, figure, crowd, Threads, Motes, bez, reach, smooth, mulberry, floor, mixCol, walnut, densify, noiseTexture, rectPts } from './lib.js';
import { woodMaterial } from '../../mannequin.js';
import { PZ } from './poses.js';
import { catenary } from './props.js';

function windowTex(seed) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 100; const g = c.getContext('2d'); let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const gr = g.createRadialGradient(20 + r() * 24, 18, 2, 32, 40, 80); gr.addColorStop(0, '#fff0c8'); gr.addColorStop(0.35, '#ffb050'); gr.addColorStop(1, '#6a2a08');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 100);
  g.fillStyle = 'rgba(60,20,4,0.55)'; if (r() < 0.6) g.fillRect(r() < 0.5 ? 0 : 50, 0, 14, 100); // curtain
  g.fillStyle = 'rgba(40,14,2,0.6)'; g.fillRect(30, 0, 4, 100); g.fillRect(0, 48, 64, 4); // mullions
  if (r() < 0.4) { g.fillStyle = 'rgba(40,14,2,0.7)'; g.beginPath(); g.ellipse(20 + r() * 24, 100, 10, 26, 0, 0, 7); g.fill(); } // someone inside
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export default async function ({ w, h, q }) {
  const st = new Stage({ w, h, fov: 42, exposure: +(q.get('exp') || 1.35), sat: 0.95,
    bloom: { strength: 0.5, radius: 0.5, threshold: 1.05 },
    haze: { density: 0.0005, noise: 0.5, far: 120, height: 5, scale: 1.3, seed: 15 },
    dof: { focus: 7.4, blurInf: 3, max: 8 }, vignette: 0.7, grain: 0.033 });
  const R = mulberry(15);
  walnut().userData.rim.uRimCol.value.set(0xffd2a0).multiplyScalar(0.06);
  const moon = new THREE.DirectionalLight(0x8095c0, 0.1); moon.position.set(-5, 10, -3); st.scene.add(moon);
  // paving + grass
  const pav = noiseTexture({ seed: 44, scale: 16, contrast: 1.3, size: 512, bias: 0.1 }); pav.repeat.set(20, 20); pav.colorSpace = THREE.SRGBColorSpace;
  const gr = floor(st, { color: 0x6e6254, rough: 0.8, bump: 0.8, repeat: 40 }); gr.material.map = pav; gr.material.needsUpdate = true;
  st.look(V(4.6, 4.3, 5.2), V(-0.9, 1.5, -5.6), 44);

  const T = new Threads(st, { minPx: 1.1, haloMul: 7, haloGain: 0.11 });
  const M = new Motes(st, { minPx: 1.0 });
  const warm = (u) => mixCol(COL.hot, COL.amber, 0.35 + 0.65 * Math.sin(Math.PI * u));
  const wall = new THREE.MeshStandardMaterial({ color: 0x6a5c50, roughness: 0.9 });
  const glass = (k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.55, 0.22).multiplyScalar(k) });
  const panelMat = new THREE.MeshPhysicalMaterial({ color: 0x0c1622, roughness: 0.22, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const people = []; // {core, fwd}
  const windows = [];

  // --- homes around the courtyard (U shape): each a box with warm windows, a solar roof, warm edge lines
  function home(x, z, wdt, dep, flo, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; st.scene.add(g); g.updateMatrixWorld(true);
    const H = flo * 1.6;
    const b = new THREE.Mesh(new THREE.BoxGeometry(wdt, H, dep), wall); b.position.y = H / 2; g.add(b);
    // windows on the courtyard face (+z local)
    const cols = Math.max(2, Math.round(wdt / 1.3));
    for (let f = 0; f < flo; f++) for (let c = 0; c < cols; c++) {
      const on = R() < 0.7; const wx = -wdt / 2 + (c + 0.5) * wdt / cols, wy = 0.5 + f * 1.6 + 0.4;
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.78), on ? new THREE.MeshBasicMaterial({ map: windowTex(Math.floor(R() * 1e6) + 1), color: new THREE.Color(1, 1, 1).multiplyScalar(0.55 + R() * 0.5) }) : new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 0.2 }));
      pane.position.set(wx, wy, dep / 2 + 0.01); g.add(pane);
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.9), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.6 })); frame.position.set(wx, wy, dep / 2 + 0.005); g.add(frame);
      if (on) { const lp = new THREE.Vector3(wx, wy, dep / 2 + 0.5).applyMatrix4(g.matrixWorld); if (R() < 0.5) st.light(lp, COL.amber, 0.35, { haze: false }); }
      if (on) { const wp = pane.getWorldPosition(new THREE.Vector3()); windows.push(wp); }
    }
    // solar roof: two tilted panel sheets with a fine grid
    const roofY = H;
    for (const sgn of [-1, 1]) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(wdt * 0.92, 0.04, dep * 0.46), panelMat);
      sheet.position.set(0, roofY + 0.28, sgn * dep * 0.24); sheet.rotation.x = sgn * 0.42; g.add(sheet);
      g.updateMatrixWorld(true);
      const nx = Math.round(wdt / 0.55), nz = 4;
      for (let i = 0; i <= nx; i++) { const a = V(-wdt * 0.46 + i * wdt * 0.92 / nx, 0.03, -dep * 0.23), c2 = V(-wdt * 0.46 + i * wdt * 0.92 / nx, 0.03, dep * 0.23);
        T.add([a, c2].map(p => p.applyMatrix4(sheet.matrixWorld)), { color: new THREE.Color(0.9, 0.75, 0.55), width: 0.006, intensity: 0.35, fadeIn: 0, fadeOut: 0, halo: 0 }); }
      for (let j = 0; j <= nz; j++) { const a = V(-wdt * 0.46, 0.03, -dep * 0.23 + j * dep * 0.46 / nz), c2 = V(wdt * 0.46, 0.03, -dep * 0.23 + j * dep * 0.46 / nz);
        T.add([a, c2].map(p => p.applyMatrix4(sheet.matrixWorld)), { color: new THREE.Color(0.9, 0.75, 0.55), width: 0.006, intensity: 0.35, fadeIn: 0, fadeOut: 0, halo: 0 }); }
    }
    // warm edge lines of the facade
    const E = (p) => p.clone().applyMatrix4(g.matrixWorld);
    const hw = wdt / 2, hd = dep / 2;
    for (const pl of [[V(-hw, 0, hd), V(-hw, H, hd), V(hw, H, hd), V(hw, 0, hd)], [V(-hw, H, hd), V(-hw, H, -hd), V(hw, H, -hd), V(hw, H, hd)]])
      T.add(densify(pl.map(E), 0.3), { color: COL.amber, width: 0.012, intensity: 0.8, fadeIn: 0, fadeOut: 0, halo: 0.5 });
    return g;
  }
  home(-7.5, -4.6, 3.2, 3.0, 3, Math.PI / 2); home(-7.5, -1.0, 3.2, 3.0, 2, Math.PI / 2);
  home(-3.6, -10.2, 3.6, 3.0, 3, 0); home(0.6, -10.4, 3.4, 3.0, 4, 0); home(4.6, -10.1, 3.4, 3.0, 3, 0);
  home(7.6, -4.0, 3.0, 3.0, 2, -Math.PI / 2);
  for (const p of [V(-5.4, 0.3, -3), V(0.5, 0.3, -8.2), V(5.8, 0.3, -3.6), V(-3.6, 0.3, -8.2)]) st.light(p, COL.amber, 2.2, { hazeGain: 0.2, radius: 0.4 });
  // --- the long table with people
  const oak = woodMaterial({ seed: 9, base: [168, 120, 78], dark: [120, 80, 48], roughness: 0.5, clearcoat: 0.3 });
  const tz = -4.0, tl = 6.2;
  const top = new THREE.Mesh(new THREE.BoxGeometry(tl, 0.07, 1.0), oak); top.position.set(-0.4, 0.76, tz); st.scene.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), oak); leg.position.set(-0.4 + sx * (tl / 2 - 0.2), 0.37, tz + sz * 0.38); st.scene.add(leg); }
  for (const sz of [-1, 1]) { const bench = new THREE.Mesh(new THREE.BoxGeometry(tl, 0.06, 0.34), oak); bench.position.set(-0.4, 0.45, tz + sz * 0.86); st.scene.add(bench); }
  const items = [];
  for (let i = 0; i < 5; i++) { const x = -0.4 - tl / 2 + 0.75 + i * (tl - 1.5) / 4;
    items.push({ pose: PZ.sitTable, pos: [x + (R() - 0.5) * 0.2, 0, tz + 0.95], rotY: 180 + (R() - 0.5) * 20, core: 1 });
    items.push({ pose: PZ.sitTable, pos: [x + 0.3 + (R() - 0.5) * 0.2, 0, tz - 0.95], rotY: (R() - 0.5) * 20, core: 1 }); }
  const seated = crowd(st, items, { coreGain: 11, shadow: 0.4 });
  // raise seated figures so pelvis rests on bench (sitTable grounds on feet; seat height ~0.47 matches)
  seated.forEach(p => people.push(p));
  // cups and plates catching lantern light
  for (let i = 0; i < 12; i++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xd8c8b0, roughness: 0.4 }));
    cup.position.set(-0.4 - tl / 2 + 0.5 + i * (tl - 1) / 11, 0.84, tz + (i % 2 ? 0.2 : -0.2)); st.scene.add(cup); }
  // lanterns strung above the table
  const wireA = V(-4.3, 2.9, tz - 0.2), wireB = V(3.4, 3.1, tz + 0.2);
  const wire = catenary(wireA, wireB, 0.5, 60);
  T.add(wire, { color: new THREE.Color(0.5, 0.4, 0.3), width: 0.006, intensity: 0.4, fadeIn: 0, fadeOut: 0, halo: 0 });
  for (let i = 3; i < 60; i += 6) { const p = wire[i].clone().add(V(0, -0.12, 0)); M.add(p, COL.hot, 9, 0.035); M.add(p, COL.amber, 0.7, 0.14); st.light(p, COL.amber, 1.6, { hazeGain: 0.5, radius: 0.15 }); }
  // --- garden: trees with glowing canopies, planted beds
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.9 });
  for (const [x, z, s] of [[-4.6, -7.4, 1.0], [3.8, -7.0, 1.2], [5.6, -3.2, 0.9], [-5.0, -1.2, 0.8]]) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.11 * s, 2.2 * s, 8), trunkMat); tr.position.set(x, 1.1 * s, z); st.scene.add(tr);
    for (let k = 0; k < 520; k++) { const a = R() * 6.28, e = Math.acos(2 * R() - 1), rr = Math.cbrt(R()) * 1.0 * s;
      M.add(V(x + Math.sin(e) * Math.cos(a) * rr, 2.5 * s + Math.cos(e) * rr * 0.7, z + Math.sin(e) * Math.sin(a) * rr), mixCol(COL.amber, new THREE.Color(1, 0.85, 0.5), R()), 0.5 + R() * 1.1, 0.012); }
    st.light(V(x, 2.2 * s, z), COL.amber, 1.2, { hazeGain: 0.4, radius: 0.5 });
    // a planted bed ring
    T.add(densify(rectPts(x, 0.03, z, 1.6 * s, 1.6 * s, 'xz'), 0.2), { color: COL.amber, width: 0.01, intensity: 0.7, fadeIn: 0, fadeOut: 0, halo: 0.4 });
  }
  // --- tram line crossing behind the right homes: rails, overhead wire, a tram with warm windows
  const railZ = -7.6;
  for (const dz of [-0.55, 0.55]) T.add(densify([V(-30, 0.03, railZ + dz), V(30, 0.03, railZ + dz)], 1), { color: new THREE.Color(1.0, 0.8, 0.55), width: 0.025, intensity: 1.6, fadeIn: 0.2, fadeOut: 0.2, halo: 0.4 });
  const tramMat = new THREE.MeshPhysicalMaterial({ color: 0xb8bcc2, roughness: 0.35, metalness: 0.4, clearcoat: 1 });
  const tx = 1.8, tlen = 8.0, trad = 1.15;
  const body = new THREE.Mesh(new THREE.BoxGeometry(tlen, 2.1, 2.3), tramMat); body.position.set(tx, 1.4, railZ); st.scene.add(body);
  for (const sx of [-1, 1]) { const nose = new THREE.Mesh(new THREE.CylinderGeometry(trad, trad, 2.1, 24, 1, false, sx > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), tramMat);
    nose.position.set(tx + sx * tlen / 2, 1.4, railZ); nose.rotation.y = 0; nose.scale.set(0.7, 1, 1); st.scene.add(nose); }
  const band = new THREE.Mesh(new THREE.PlaneGeometry(tlen - 0.4, 0.85), new THREE.MeshBasicMaterial({ map: windowTex(77), color: new THREE.Color(1, 1, 1).multiplyScalar(1.0) }));
  band.material.map.repeat.set(6, 1); band.material.map.wrapS = THREE.RepeatWrapping; band.position.set(tx, 1.7, railZ + 1.16); st.scene.add(band);
  for (let k = 0; k <= 6; k++) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.03), tramMat); s2.position.set(tx - (tlen - 0.4) / 2 + k * (tlen - 0.4) / 6, 1.7, railZ + 1.17); st.scene.add(s2); }
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(tlen, 0.3, 2.2), new THREE.MeshStandardMaterial({ color: 0x1a1a1c })); skirt.position.set(tx, 0.28, railZ); st.scene.add(skirt);
  // pantograph and overhead wire on poles
  const pv = V(tx - 0.6, 2.45, railZ), pw = V(tx - 0.2, 5.0, railZ);
  T.add([pv, V(tx - 1.2, 3.7, railZ), pw, V(tx + 0.4, 3.7, railZ), pv], { color: new THREE.Color(0.9, 0.8, 0.65), width: 0.018, intensity: 0.9, fadeIn: 0, fadeOut: 0, halo: 0.2 });
  for (const px of [-9, -3, 9, 15]) T.add([V(px, 0, railZ - 1.6), V(px, 5.4, railZ - 1.6), V(px, 5.2, railZ)], { color: new THREE.Color(0.7, 0.6, 0.5), width: 0.03, intensity: 0.5, fadeIn: 0, fadeOut: 0, halo: 0 });
  st.light(V(tx, 1.8, railZ + 2.0), COL.amber, 3.5, { hazeGain: 0.2, radius: 0.8 });
  st.light(V(tx + 4.6, 1.0, railZ + 0.6), new THREE.Color(1, 0.9, 0.7), 2.0, { hazeGain: 0.4, radius: 0.1 }); // headlight
  const riders = crowd(st, [0, 1, 2, 3].map(k => ({ pose: PZ.standRelax, pos: [-1.2 + k * 1.9, 0.35, railZ + 0.4], rotY: 160, core: 1 })), { coreGain: 10, shadow: 0 });
  riders.forEach(p => people.push(p));
  // --- threads land everywhere: across the table, table to windows, window to window, tram to homes, overhead web
  for (let i = 0; i < seated.length; i++) for (const j of [i + 1, i + 3]) { if (j >= seated.length) continue; const a = seated[i], b = seated[j];
    T.add(reach(a.core, a.fwd, b.core, b.fwd, { k1: 0.3, k2: 0.3, lift: 0.18 + a.core.distanceTo(b.core) * 0.1, n: 50 }), { color: warm, width: 0.005, intensity: 4.5 }); }
  const lit = [...windows];
  for (let k = 0; k < 16; k++) { const a = seated[k % seated.length]; const wv = lit[Math.floor(R() * lit.length)];
    T.add(reach(a.core, V(0, 1, 0), wv, null, { k1: 0.35, k2: 0.3, lift: 1.4 + R() * 1.4, n: 80 }), { color: warm, width: 0.0035, intensity: 3.2 }); M.add(wv, COL.hot, 3, 0.02); }
  for (let k = 0; k < 10; k++) { const a = lit[Math.floor(R() * lit.length)], b = lit[Math.floor(R() * lit.length)]; if (a.distanceTo(b) < 2) continue;
    T.add(reach(a, V(0, 1, 0), b, V(0, 1, 0), { k1: 0.3, k2: 0.3, lift: 1.2 + R() * 1.5, n: 70 }), { color: warm, width: 0.003, intensity: 2.6 }); }
  riders.forEach((r, i) => { for (let k = 0; k < 2; k++) { const wv = lit[Math.floor(R() * lit.length)]; T.add(reach(r.core, V(0, 1, 0.3).normalize(), wv, null, { k1: 0.3, lift: 2.0, n: 70 }), { color: warm, width: 0.003, intensity: 2.8 }); } });
  // --- the wider web: distant neighbourhoods glowing, joined by long arcs (bigger than the old camp)
  const far = [];
  for (let i = 0; i < 26; i++) { const a = -2.6 + R() * 2.2, d = 22 + R() * 38; const c = V(Math.cos(a) * d * 0.9, 0, -8 + Math.sin(a) * d);
    far.push(c);
    for (let k = 0; k < 30; k++) M.add(c.clone().add(V((R() - 0.5) * 5, R() * 4, (R() - 0.5) * 5)), mixCol(COL.amber, COL.hot, R()), 1.2 + R() * 2.5, 0.05);
    st.hazeLight(c.clone().add(V(0, 2, 0)), COL.amber, 3, 2); }
  for (let i = 0; i < far.length; i++) for (const j of [i + 1, i + 4, i + 9]) { if (j >= far.length) continue; const a = far[i].clone().add(V(0, 3, 0)), b = far[j].clone().add(V(0, 3, 0));
    T.add(reach(a, V(0, 1, 0), b, V(0, 1, 0), { k1: 0.3, k2: 0.3, lift: 3 + a.distanceTo(b) * 0.15, n: 80 }), { color: warm, width: 0.03, intensity: 1.8, fadeIn: 0.05, fadeOut: 0.05 }); }
  for (let k = 0; k < 4; k++) { const a = lit[Math.floor(R() * lit.length)], b = far[Math.floor(R() * far.length)].clone().add(V(0, 3, 0));
    T.add(reach(a, V(0, 1, 0), b, null, { k1: 0.3, lift: 6, n: 90 }), { color: warm, width: 0.012, intensity: 2.0, fadeIn: 0.03, fadeOut: 0.05 }); }
  M.build(); T.build();
  st.envFromFx(V(-0.4, 2, -4), { intensity: 0.6 });
  st.render({ time: 0.4 });
}
