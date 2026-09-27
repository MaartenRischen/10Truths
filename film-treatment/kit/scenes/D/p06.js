// P06 HUMAN-SIZED — the camp web from a high angle: fire, the five joined by thick amber threads,
// the band of ~50 around their hearths joined more thinly, ~150 known-by-name points further out: a mandala.
import { Stage, THREE, COL, V, figure, crowd, Threads, Motes, reach, strands, smooth, mulberry, floor, fire, shelter, mixCol, noiseTexture, walnut, smoke } from './lib.js';
import { PZ } from './poses.js';

// radial ground decal: trampled rings where people sit, worn paths from the fire to each hearth, ash under fires
function campGround(RB, NC, hearthAngle, size = 30, px = 2048) {
  const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d');
  const S = px / size, cx = px / 2; const W = (x) => cx + x * S;
  g.fillStyle = '#54463a'; g.fillRect(0, 0, px, px);
  const blob = (x, z, r0, r1, col, a) => { const gr = g.createRadialGradient(W(x), W(z), r0 * S, W(x), W(z), r1 * S); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0)); g.fillStyle = gr; g.beginPath(); g.arc(W(x), W(z), r1 * S, 0, 7); g.fill(); };
  const ring = (x, z, r, wdt, col) => { g.strokeStyle = col; g.lineWidth = wdt * S; g.beginPath(); g.arc(W(x), W(z), r * S, 0, 7); g.stroke(); };
  g.filter = 'blur(' + Math.round(0.25 * S) + 'px)';
  ring(0, 0, 1.45, 1.1, 'rgba(150,132,108,0.55)');           // where the five sit
  ring(0, 0, RB, 0.7, 'rgba(140,122,100,0.4)');               // the path around the band
  for (let k = 0; k < NC; k++) { const a = hearthAngle(k); const x = Math.cos(a) * RB, z = Math.sin(a) * RB;
    g.strokeStyle = 'rgba(140,122,100,0.42)'; g.lineWidth = 0.55 * S; g.beginPath(); g.moveTo(W(Math.cos(a) * 1.9), W(Math.sin(a) * 1.9)); g.lineTo(W(Math.cos(a) * (RB - 1.1)), W(Math.sin(a) * (RB - 1.1))); g.stroke();
    ring(x, z, 1.1, 0.8, 'rgba(150,132,108,0.5)'); }
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + 0.2; g.strokeStyle = 'rgba(130,115,95,0.22)'; g.lineWidth = 0.35 * S; g.beginPath(); g.moveTo(W(Math.cos(a) * (RB + 1.2)), W(Math.sin(a) * (RB + 1.2))); g.lineTo(W(Math.cos(a + 0.3) * 8.5), W(Math.sin(a + 0.3) * 8.5)); g.stroke(); }
  g.filter = 'none';
  blob(0, 0, 0.1, 0.75, 'rgba(22,16,12,A)', 0.95);
  for (let k = 0; k < NC; k++) { const a = hearthAngle(k); blob(Math.cos(a) * RB, Math.sin(a) * RB, 0.05, 0.38, 'rgba(22,16,12,A)', 0.9); }
  // soft edge to the base colour
  const eg = g.createRadialGradient(cx, cx, px * 0.4, cx, cx, px * 0.5); eg.addColorStop(0, 'rgba(84,70,58,0)'); eg.addColorStop(1, 'rgba(84,70,58,1)'); g.fillStyle = eg; g.fillRect(0, 0, px, px);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export default async function ({ w, h, q }) {
  const view = q.get('view') || 'a';
  const st = new Stage({ w, h, fov: 38, exposure: +(q.get('exp') || 1.5), sat: 0.92, dof: { focus: +(q.get('focus') || 15), blurInf: 4, max: 16 },
    bloom: { strength: 0.4, radius: 0.35, threshold: 1.3 },
    haze: { density: 0.0004, noise: 0.5, far: 80, height: 2.5, floorY: 0, scale: 1.6, seed: 7 }, vignette: 0.72, grain: 0.032, lift: [0.0026, 0.0032, 0.0046] });
  const R = mulberry(20);
  const moon = new THREE.DirectionalLight(0x7f95c0, +(q.get('moon') || 0.12)); moon.position.set(-4, 10, -6); st.scene.add(moon);
  walnut().userData.rim.uRimCol.value.set(0xa9bfd8).multiplyScalar(0.06);

  // ground: dry earth, visible only where light falls
  const gmap = noiseTexture({ seed: 31, scale: 5, contrast: 1.2, size: 512, bias: 0.16 }); gmap.repeat.set(30, 30); gmap.colorSpace = THREE.SRGBColorSpace;
  const gr = floor(st, { color: 0x857868, rough: 0.95, bump: 1.4, repeat: 70 });
  gr.material.map = gmap; gr.material.specularIntensity = 0.25; gr.material.needsUpdate = true;
  {
    const hearthAngle = (c) => (c / 8) * Math.PI * 2 + Math.PI / 8;
    const dec = campGround(4.9, 8, hearthAngle);
    const dm = new THREE.MeshStandardMaterial({ map: dec, roughness: 0.95, bumpMap: gmap, bumpScale: 1.2 });
    const dp = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), dm); dp.rotation.x = -Math.PI / 2; dp.position.y = 0.002; st.scene.add(dp); st.floors.push(dp);
    // fine detail: modulate with the noise via a second multiply is skipped; the bump carries the grain
  }
  // scattered stones and twigs catch the light
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.8 });
  const sg = new THREE.IcosahedronGeometry(1, 1);
  const stones = new THREE.InstancedMesh(sg, stoneMat, 700);
  for (let i = 0; i < 700; i++) { const a = R() * 6.28, rr = 0.8 + Math.pow(R(), 0.7) * 16; const s = 0.015 + Math.pow(R(), 3) * 0.07;
    stones.setMatrixAt(i, new THREE.Matrix4().compose(V(Math.cos(a) * rr, s * 0.3, Math.sin(a) * rr), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)), V(s * 1.3, s * 0.6, s))); }
  st.scene.add(stones);

  // ---------- the fire and the five
  fire(st, V(0, 0, 0), { scale: 1.2, gain: 1.45, lightI: 16, sparks: 70, seed: 3, hazeGain: 0.1 });
  const five = [];
  const poses5 = ['sitLog', 'sitLogWarm', 'sitHug', 'kneelTend', 'sitLogTalk'];
  const logMat = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 });
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + i * (Math.PI * 2 / 5) + (R() - 0.5) * 0.12;
    const rad = poses5[i] === 'kneelTend' ? 1.1 : 1.45;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const rotY = Math.atan2(-x, -z) * 180 / Math.PI + (R() - 0.5) * 12;
    const f = figure(st, PZ[poses5[i]], { pos: [x, 0, z], rot: [0, rotY, 0], coreI: 0.9, coreLight: 1.2 });
    five.push(f);
    if (poses5[i].startsWith('sitLog')) {
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.85, 12), logMat);
      const fw = V(Math.sin(rotY * Math.PI / 180), 0, Math.cos(rotY * Math.PI / 180));
      lg.position.set(x - fw.x * 0.1, 0.35, z - fw.z * 0.1); lg.rotation.set(0, rotY * Math.PI / 180, Math.PI / 2, 'YXZ');
      st.scene.add(lg);
    }
  }
  // ---------- the band: hearth clusters on a ring
  const NC = 8, RB = 4.9;
  const band = []; const bandItems = []; const hearths = [];
  const bandPoses = ['sitHug', 'sitLog', 'standRelax', 'sitLogWarm', 'lieSide', 'kneelTend', 'squat', 'standRelax'];
  for (let c = 0; c < NC; c++) {
    const a = (c / NC) * Math.PI * 2 + Math.PI / NC;
    const hc = V(Math.cos(a) * RB, 0, Math.sin(a) * RB); hearths.push(hc);
    fire(st, hc, { scale: 0.34, gain: 1.4, lightI: 5, sparks: 10, seed: 10 + c, hazeGain: 0.3 });
    const out = hc.clone().normalize();
    shelter(st, hc.clone().addScaledVector(out, 1.45), { r: 0.6, h: 0.58, rotY: Math.atan2(out.x, out.z) + Math.PI, seed: c + 4 });
    const n = 6; const members = [];
    for (let k = 0; k < n; k++) {
      const b = a + Math.PI + (k - (n - 1) / 2) * (Math.PI * 1.62 / n); // open toward the shelter side
      const rr = 1.08 + R() * 0.1;
      const x = hc.x + Math.cos(b) * rr, z = hc.z + Math.sin(b) * rr;
      const pn = bandPoses[(c * 3 + k) % bandPoses.length];
      const rotY = Math.atan2(hc.x - x, hc.z - z) * 180 / Math.PI + (R() - 0.5) * 24;
      members.push(bandItems.length); bandItems.push({ pose: PZ[pn], pos: [x, 0, z], rotY, core: 0.8 });
    }
    band.push(members);
  }
  const bandOut = crowd(st, bandItems, { coreGain: 9 });
  // ---------- the ~150: points further out, on three loose rings
  const farItems = [];
  const ringN = [44, 50, 56];
  ringN.forEach((nr, ring) => {
    for (let k = 0; k < nr; k++) {
      const a = (k / nr) * Math.PI * 2 + ring * 0.21 + (R() - 0.5) * 0.04;
      const rad = 7.0 + ring * 1.05 + (R() - 0.5) * 0.35;
      farItems.push({ pose: PZ[['standRelax', 'sitHug', 'walkA', 'sitLog'][(k + ring) % 4]], pos: [Math.cos(a) * rad, 0, Math.sin(a) * rad], rotY: R() * 360, core: 1, ring, k, nr });
    }
  });
  const farOut = crowd(st, farItems, { coreGain: 16, coreSize: 0.034, shadow: 0.3 });

  // ---------- threads
  const T = new Threads(st, { minPx: 1.2, haloMul: 7, haloGain: 0.12 });
  const warm = (u) => mixCol(COL.hot, COL.amber, 0.35 + 0.65 * Math.sin(Math.PI * u));
  // the five: complete graph (pentagon + pentagram), thick
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
    const a = five[i], b = five[j]; const d = a.core.distanceTo(b.core);
    const pts = reach(a.core, a.fwd, b.core, b.fwd, { k1: 0.22, k2: 0.22, lift: 0.1 + d * 0.12, n: 90 });
    T.add(pts, { color: (u) => mixCol(COL.hot, COL.amber, 0.25 * Math.sin(Math.PI * u)), width: 0.013, intensity: 2.6, fadeIn: 0.02 });
    st.light(pts[45], COL.amber, 0.6, { hazeGain: 0.3, radius: 0.2 });
  }
  const nearestCluster = (p) => { let best = 0, bd = 1e9; hearths.forEach((hc, c) => { const d = hc.distanceTo(p); if (d < bd) { bd = d; best = c; } }); return best; };
  // five -> band: radial spokes
  for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) {
    const dir = five[i].pos.clone().normalize().applyAxisAngle(V(0, 1, 0), (k - 1) * 0.55);
    const c = nearestCluster(dir.multiplyScalar(RB)); const mem = band[c];
    const b = bandOut[mem[(i + k * 2) % mem.length]], a = five[i];
    const pts = reach(a.core, a.fwd.clone().multiplyScalar(-0.3).add(V(0, 0.6, 0)).normalize(), b.core, b.fwd, { k1: 0.25, k2: 0.2, lift: 0.35, n: 80 });
    T.add(pts, { color: warm, width: 0.006, intensity: 3.2, fadeIn: 0.03 });
  }
  // within each hearth cluster: a small ring (petal) + a few chords
  for (const mem of band) {
    for (let i = 0; i < mem.length; i++) {
      for (const j of [i + 1]) {
        if (j > mem.length) continue;
        const a = bandOut[mem[i]], b = bandOut[mem[j % mem.length]];
        const pts = reach(a.core, a.fwd, b.core, b.fwd, { k1: 0.25, k2: 0.25, lift: 0.1 + a.core.distanceTo(b.core) * 0.2, n: 40 });
        T.add(pts, { color: warm, width: 0.006, intensity: j === i + 1 ? 3.4 : 2.0, fadeIn: 0.03 });
      }
    }
  }
  // the great ring: neighbouring clusters joined (twice), so the band is one web
  for (let c = 0; c < NC; c++) for (let k = 0; k < 2; k++) {
    const A = band[c], B = band[(c + 1) % NC];
    const a = bandOut[A[A.length - 1 - k]], b = bandOut[B[k]];
    const pts = reach(a.core, a.fwd, b.core, b.fwd, { k1: 0.25, k2: 0.25, lift: 0.4 + k * 0.3, n: 70 });
    T.add(pts, { color: warm, width: 0.0045, intensity: 3.0, fadeIn: 0.03 });
  }
  // the ~150: fine rays from the band out to each person known by name, all curling the same way (a spiral)
  farOut.forEach((f, idx) => {
    const it = farItems[idx];
    const src = f.pos.clone().applyAxisAngle(V(0, 1, 0), 0.32 + it.ring * 0.08);
    let b = bandOut[0], bd = 1e9; for (const o of bandOut) { const d = o.pos.distanceTo(src); if (d < bd) { bd = d; b = o; } }
    const out = b.pos.clone().setY(0).normalize();
    const pts = reach(b.core, out.clone().add(V(0, 0.35, 0)).normalize(), f.core, null, { k1: 0.45, k2: 0.3, lift: 0.3, n: 70 });
    T.add(pts, { color: (u) => mixCol(COL.amber, COL.fire, 0.45 * u), width: 0.0022, intensity: 1.5 * (0.75 + R() * 0.5), fadeIn: 0.05 });
  });
  // lace: each far one holds its neighbours on the same ring
  for (let k = 0; k < farOut.length; k++) {
    const it = farItems[k]; const j = k + 1 < farItems.length && farItems[k + 1].ring === it.ring ? k + 1 : k - it.k;
    const a = farOut[k], b = farOut[j]; if (a === b) continue;
    const pts = reach(a.core, V(0, 1, 0), b.core, V(0, 1, 0), { k1: 0.15, k2: 0.15, lift: 0.12, n: 24 });
    T.add(pts, { color: COL.amber, width: 0.0022, intensity: 1.1, fadeIn: 0.1, fadeOut: 0.1 });
  }
  T.build();

  // sparks/motes drifting up from the fires
  const M = new Motes(st, { minPx: 1.1 });
  for (let i = 0; i < 220; i++) {
    const a = R() * 6.28, rr = Math.pow(R(), 0.8) * 7, y = 0.5 + Math.pow(R(), 1.5) * 3.5;
    M.add(V(Math.cos(a) * rr, y, Math.sin(a) * rr), mixCol(COL.fire, COL.hot, R()), 1.2 + R() * 3.5, 0.007 + R() * 0.008);
  }
  M.build();
  const M2 = new Motes(st, { minPx: 1.1 });
  for (let i = 0; i < 7; i++) { const a = R() * 6.28, rr = 1.5 + R() * 3.5; M2.add(V(Math.cos(a) * rr + 1.0, 8.5 + R() * 3.0, Math.sin(a) * rr + 2.0), mixCol(COL.fire, COL.amber, R()), 2.0 + R() * 2.5, 0.006 + R() * 0.004); }
  M2.build();
  smoke(st, V(0, 0, 0), { count: 7, height: 4.5, size: 1.5, gain: +(q.get('smoke') || 0.05), seed: 2, drift: V(0.35, 0, -0.25) });
  st.envFromFx(V(0, 1.0, 0), { intensity: 0.4 });

  const views = {
    a: [V(0, 8.2, 5.6), V(0, 0, -0.35), 44],
    b: [V(1.3, 9.4, 2.9), V(0, 0, -0.15), 46],
    c: [V(0, 13, 0.01), V(0, 0, 0), 50],
    d: [V(-1.2, 5.2, 5.4), V(0.2, 0.3, -1.4), 46],
    e: [V(0, 7.6, 4.8), V(0, 0, -0.4), 46],
    f: [V(2.6, 8.4, 3.6), V(0, 0, -0.1), 46],
    g: [V(1.6, 14.5, 4.8), V(0, 0, -0.2), 46],
    h: [V(1.9, 12.4, 5.2), V(0, 0, -0.5), 46],
  };
  const vv = views[view];
  st.look(vv[0], vv[1], vv[2]);
  st.render({ time: 0.3 });
}
