// The flat for GOOD DOG: one living room with a kitchen corner. Scene units (manikin = 2.0 tall).
// Layout (top view, camera for the wide sits high in the front-right corner):
//   back wall z=-3: FRONT DOOR (x -2.1..-1.1, hinged left, opens into the room), big CLOCK above it,
//                   coat HOOKS with the lead to its right, SOFA (x 0..2.2) with three cushions, floor LAMP right.
//   left wall x=-2.6: kitchen corner: FRIDGE (front at x=-1.88, z -1.05..-0.25, hinged at the back edge), counter.
//   right wall x=+2.6: WINDOW (z -0.9..0.5) with a cross mullion -> the sun patch slides over the floor.
//   RUG in the middle (centre 0.75,-0.45); the pacing LOOP runs around it.
import * as THREE from 'three';
import * as MT from '../../scenes/E/lib/mat.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as MD from '../../scenes/E/lib/modern.js';
import { mulberry32 } from '../../scenes/E/lib/cine.js';

export const ROOM = { x0: -2.6, x1: 2.6, z0: -3.0, z1: 3.0, h: 2.9 };
export const DOOR = { x0: -2.1, x1: -1.1, h: 2.3, cx: -1.6 };
export const WIN = { z0: -0.9, z1: 0.5, y0: 0.8, y1: 2.35 };
export const RUG = { cx: 0.75, cz: -0.45, w: 2.1, d: 1.45 };
export const SOFA = { cx: 1.1, cz: -2.52, w: 2.2, d: 0.95, seatH: 0.5 };
export const FRIDGE = { x: -2.24, z0: -1.05, z1: -0.25, front: -1.88, h: 1.95 };
export const CLOCK = { x: -1.6, y: 2.6, z: -2.985, r: 0.25 };
export const HOOK = { x: -0.78, y: 1.7, z: -2.97 };
export const LAMP = { x: 2.38, z: -2.5, y: 1.46 };
// pacing loop around the rug (ellipse), counter-clockwise seen from above, starting at the front-left
export const LOOP = { cx: RUG.cx, cz: RUG.cz, a: 1.4, b: 1.1 };

export function loopPath(start = 0, dir = 1, E = LOOP) {
  // arc-length parametrised ellipse (periodic in s)
  const N = 720, pts = [], acc = [0];
  for (let i = 0; i <= N; i++) { const t = start + dir * (i / N) * Math.PI * 2; pts.push(new THREE.Vector3(E.cx + E.a * Math.cos(t), 0, E.cz + E.b * Math.sin(t))); if (i) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1])); }
  const L = acc[N];
  const at = (s) => {
    s = ((s % L) + L) % L; let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; }
    const f = (s - acc[lo]) / Math.max(1e-9, acc[hi] - acc[lo]);
    return pts[lo].clone().lerp(pts[hi], f);
  };
  const heading = (s) => { const a = at(s - 0.02), b = at(s + 0.02); return Math.atan2(b.x - a.x, b.z - a.z); };
  return { at, heading, length: L };
}

function rugTex() {
  return MT.drawTexture(1024, 720, (g, W, H) => {
    g.fillStyle = '#7d5a3e'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#b98a58'; g.fillRect(28, 28, W - 56, H - 56);
    g.fillStyle = '#44585a'; g.fillRect(64, 64, W - 128, H - 128);
    g.fillStyle = '#5e7270'; g.fillRect(96, 96, W - 192, H - 192);
    g.strokeStyle = 'rgba(214,176,120,0.8)'; g.lineWidth = 10;
    for (let i = 0; i < 5; i++) { g.beginPath(); const cx = W / 2, cy = H / 2, r = 60 + i * 48; g.moveTo(cx - r * 1.4, cy); g.lineTo(cx, cy - r); g.lineTo(cx + r * 1.4, cy); g.lineTo(cx, cy + r); g.closePath(); g.stroke(); }
    const img = g.getImageData(0, 0, W, H), d = img.data; const rng = mulberry32(5);
    for (let i = 0; i < d.length; i += 4) { const n = (rng() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}
function clockFaceTex() {
  return MT.drawTexture(512, 512, (g, W) => {
    g.fillStyle = '#f1ece2'; g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d1b19';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, big = i % 5 === 0; const r0 = W * (big ? 0.36 : 0.42), r1 = W * 0.47;
      g.save(); g.translate(W / 2, W / 2); g.rotate(a); g.fillRect(-(big ? 9 : 3), -r1, big ? 18 : 6, r1 - r0); g.restore();
    }
  });
}

export function buildFlat(scene, { evening = false, doorOpen = 0, fridgeOpen = 0, lampOn = true } = {}) {
  const R = ROOM; const g = new THREE.Group(); scene.add(g);
  const pl = MT.plaster({ base: [206, 198, 186], seed: 7, amp: 8 });
  const wallMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.4, roughness: 0.93, repeat: [2, 2] });
  const fl = MT.planks({ base: [170, 128, 88], dark: [118, 84, 56], planksAcross: 6, seed: 12 });
  const floorMat = MT.texMat({ map: fl.map, rough: fl.rough, roughness: 0.5, repeat: [2.2, 2.2] });
  const W = R.x1 - R.x0, D = R.z1 - R.z0, cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
  g.add(PR.mesh(new THREE.PlaneGeometry(W, D), floorMat, [cx, 0, cz], [-Math.PI / 2, 0, 0], false, true));
  g.add(PR.mesh(new THREE.PlaneGeometry(W, D), wallMat, [cx, R.h, cz], [Math.PI / 2, 0, 0], true, true));
  const wall = (w, h, pos, rotY) => g.add(PR.mesh(new THREE.PlaneGeometry(w, h), wallMat, pos, [0, rotY, 0], true, true));
  // back wall (z0) with the door hole
  wall(DOOR.x0 - R.x0, R.h, [(R.x0 + DOOR.x0) / 2, R.h / 2, R.z0], 0);
  wall(R.x1 - DOOR.x1, R.h, [(DOOR.x1 + R.x1) / 2, R.h / 2, R.z0], 0);
  wall(DOOR.x1 - DOOR.x0, R.h - DOOR.h, [DOOR.cx, (DOOR.h + R.h) / 2, R.z0], 0);
  // front wall
  wall(W, R.h, [cx, R.h / 2, R.z1], Math.PI);
  // left wall
  wall(D, R.h, [R.x0, R.h / 2, cz], Math.PI / 2);
  // right wall (x1) with the window hole: pieces in z
  const rw = (z0, z1, y0, y1) => g.add(PR.mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), wallMat, [R.x1, (y0 + y1) / 2, (z0 + z1) / 2], [0, -Math.PI / 2, 0], true, true));
  rw(R.z0, WIN.z0, 0, R.h); rw(WIN.z1, R.z1, 0, R.h); rw(WIN.z0, WIN.z1, 0, WIN.y0); rw(WIN.z0, WIN.z1, WIN.y1, R.h);
  // outer shell so the sun only enters through the window (thick boxes behind the walls)
  const shell = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const box = (w, h, d, pos) => g.add(PR.mesh(new THREE.BoxGeometry(w, h, d), shell, pos, [0, 0, 0], true, false));
  box(W + 1, 0.3, D + 1, [cx, R.h + 0.16, cz]);
  box(0.3, R.h, D + 1, [R.x0 - 0.16, R.h / 2, cz]);
  box(W + 1, R.h, 0.3, [cx, R.h / 2, R.z1 + 0.16]);
  // right: shell pieces around the window hole (outside)
  const sx = R.x1 + 0.13;
  box(0.24, R.h, WIN.z0 - R.z0 + 0.4, [sx, R.h / 2, (R.z0 - 0.4 + WIN.z0) / 2]);
  box(0.24, R.h, R.z1 + 0.4 - WIN.z1, [sx, R.h / 2, (WIN.z1 + R.z1 + 0.4) / 2]);
  box(0.24, WIN.y0, WIN.z1 - WIN.z0, [sx, WIN.y0 / 2, (WIN.z0 + WIN.z1) / 2]);
  box(0.24, R.h - WIN.y1, WIN.z1 - WIN.z0, [sx, (WIN.y1 + R.h) / 2, (WIN.z0 + WIN.z1) / 2]);
  // back: pieces around the door (the hall is behind)
  box(DOOR.x0 - R.x0 + 0.4, R.h, 0.24, [(R.x0 - 0.4 + DOOR.x0) / 2, R.h / 2, R.z0 - 0.13]);
  box(R.x1 + 0.4 - DOOR.x1, R.h, 0.24, [(DOOR.x1 + R.x1 + 0.4) / 2, R.h / 2, R.z0 - 0.13]);
  box(DOOR.x1 - DOOR.x0, R.h - DOOR.h, 0.24, [DOOR.cx, (DOOR.h + R.h) / 2, R.z0 - 0.13]);
  // skirting boards
  const trim = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.6 });
  g.add(PR.mesh(new THREE.BoxGeometry(W, 0.09, 0.02), trim, [cx, 0.045, R.z1 - 0.01]));
  g.add(PR.mesh(new THREE.BoxGeometry(0.02, 0.09, D), trim, [R.x0 + 0.01, 0.045, cz]));
  g.add(PR.mesh(new THREE.BoxGeometry(DOOR.x0 - R.x0, 0.09, 0.02), trim, [(R.x0 + DOOR.x0) / 2, 0.045, R.z0 + 0.01]));
  g.add(PR.mesh(new THREE.BoxGeometry(R.x1 - DOOR.x1 - 0.05, 0.09, 0.02), trim, [(DOOR.x1 + 0.05 + R.x1) / 2, 0.045, R.z0 + 0.01]));

  // ---------- window: reveal, sill, cross mullion, sky beyond
  const wz = (WIN.z0 + WIN.z1) / 2, wy = (WIN.y0 + WIN.y1) / 2, ww = WIN.z1 - WIN.z0, wh = WIN.y1 - WIN.y0;
  const frameM = new THREE.MeshStandardMaterial({ color: 0xece8e0, roughness: 0.55 });
  for (const y of [WIN.y0, WIN.y1]) g.add(PR.mesh(new THREE.BoxGeometry(0.24, 0.03, ww), frameM, [R.x1 + 0.12, y, wz]));
  for (const z of [WIN.z0, WIN.z1]) g.add(PR.mesh(new THREE.BoxGeometry(0.24, wh, 0.03), frameM, [R.x1 + 0.12, wy, z]));
  g.add(PR.mesh(new THREE.BoxGeometry(0.34, 0.035, ww + 0.14), frameM, [R.x1 + 0.06, WIN.y0 - 0.015, wz]));
  g.add(PR.mesh(new THREE.BoxGeometry(0.05, wh, 0.045), frameM, [R.x1 + 0.2, wy, wz]));
  g.add(PR.mesh(new THREE.BoxGeometry(0.05, 0.045, ww), frameM, [R.x1 + 0.2, WIN.y0 + wh * 0.62, wz]));
  const skyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(evening ? 0x1c2a44 : 0xcfe0f2).multiplyScalar(evening ? 1.0 : 1.6), fog: false });
  const sky = PR.mesh(new THREE.PlaneGeometry(14, 8), skyMat, [R.x1 + 3.0, 1.8, wz], [0, -Math.PI / 2, 0], false, false); g.add(sky);
  // a plant on the sill
  g.add(PR.mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.13, 16), new THREE.MeshStandardMaterial({ color: 0xb4623e, roughness: 0.8 }), [R.x1 - 0.06, WIN.y0 + 0.065, WIN.z1 - 0.22]));
  for (let i = 0; i < 6; i++) { const lf = PR.mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0x4f6b34, roughness: 0.8 }), [R.x1 - 0.06 + Math.sin(i * 2.1) * 0.05, WIN.y0 + 0.18 + (i % 3) * 0.04, WIN.z1 - 0.22 + Math.cos(i * 2.1) * 0.05]); lf.scale.set(0.8, 1.4, 0.5); lf.rotation.set(i, i * 2, 0); g.add(lf); }

  // ---------- hall behind the front door + the door itself
  const hallMat = MT.texMat({ map: pl.map, bump: pl.bump, bumpScale: 0.4, roughness: 0.93, repeat: [1, 1], color: 0xd8d0c2 });
  const hz0 = R.z0 - 0.26, hz1 = R.z0 - 2.2;
  g.add(PR.mesh(new THREE.PlaneGeometry(2.6, hz0 - hz1), floorMat, [DOOR.cx, 0.0, (hz0 + hz1) / 2], [-Math.PI / 2, 0, 0], false, true));
  g.add(PR.mesh(new THREE.PlaneGeometry(2.6, R.h), hallMat, [DOOR.cx, R.h / 2, hz1], [0, 0, 0], false, true));
  g.add(PR.mesh(new THREE.PlaneGeometry(hz0 - hz1, R.h), hallMat, [DOOR.cx - 1.3, R.h / 2, (hz0 + hz1) / 2], [0, Math.PI / 2, 0], false, true));
  g.add(PR.mesh(new THREE.PlaneGeometry(hz0 - hz1, R.h), hallMat, [DOOR.cx + 1.3, R.h / 2, (hz0 + hz1) / 2], [0, -Math.PI / 2, 0], false, true));
  g.add(PR.mesh(new THREE.PlaneGeometry(2.6, hz0 - hz1), hallMat, [DOOR.cx, R.h, (hz0 + hz1) / 2], [Math.PI / 2, 0, 0], false, true));
  // door jambs (reveal) + architrave
  for (const x of [DOOR.x0, DOOR.x1]) g.add(PR.mesh(new THREE.BoxGeometry(0.03, DOOR.h, 0.28), trim, [x, DOOR.h / 2, R.z0 - 0.12]));
  g.add(PR.mesh(new THREE.BoxGeometry(DOOR.x1 - DOOR.x0, 0.03, 0.28), trim, [DOOR.cx, DOOR.h, R.z0 - 0.12]));
  for (const x of [DOOR.x0 - 0.05, DOOR.x1 + 0.05]) g.add(PR.mesh(new THREE.BoxGeometry(0.1, DOOR.h + 0.08, 0.025), trim, [x, (DOOR.h + 0.08) / 2, R.z0 + 0.012]));
  g.add(PR.mesh(new THREE.BoxGeometry(DOOR.x1 - DOOR.x0 + 0.2, 0.1, 0.025), trim, [DOOR.cx, DOOR.h + 0.05, R.z0 + 0.012]));
  const doorPivot = new THREE.Group(); doorPivot.position.set(DOOR.x0 + 0.015, 0, R.z0 - 0.02); g.add(doorPivot);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x55665f, roughness: 0.5 });
  const dw = DOOR.x1 - DOOR.x0 - 0.03;
  doorPivot.add(PR.mesh(PR.rbox(dw, DOOR.h - 0.025, 0.05, 0.01), doorMat, [dw / 2, (DOOR.h - 0.025) / 2 + 0.018, 0]));
  // panels on the door
  for (const [y, hh] of [[0.62, 0.9], [1.68, 0.9]]) doorPivot.add(PR.mesh(PR.rbox(dw - 0.26, hh - 0.2, 0.012, 0.004), doorMat, [dw / 2, y, 0.03]));
  const brass = new THREE.MeshStandardMaterial({ color: 0xb89a5a, metalness: 0.9, roughness: 0.3 });
  for (const zs of [1, -1]) { doorPivot.add(PR.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 10), brass, [dw - 0.09, 1.02, zs * 0.06], [Math.PI / 2, 0, 0])); doorPivot.add(PR.mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), brass, [dw - 0.13, 1.02, zs * 0.095])); }
  doorPivot.rotation.y = -doorOpen;
  // the lit hall shows as a line of light under the door
  const gapMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.86, 0.66).multiplyScalar(2.2) });
  const gap = PR.mesh(new THREE.PlaneGeometry(dw, 0.016), gapMat, [DOOR.cx, 0.008, R.z0 - 0.05], [0, 0, 0], false, false); g.add(gap);
  const hallLight = new THREE.PointLight(new THREE.Color(1.0, 0.82, 0.6), 3.2, 0, 2); hallLight.position.set(DOOR.cx, 2.5, R.z0 - 1.1); g.add(hallLight);
  hallLight.castShadow = true; hallLight.shadow.mapSize.set(512, 512); hallLight.shadow.bias = -0.002;
  // mat inside the door
  g.add(PR.mesh(PR.rbox(0.9, 0.012, 0.55, 0.004), new THREE.MeshStandardMaterial({ color: 0x4a3e34, roughness: 1 }), [DOOR.cx, 0.006, R.z0 + 0.4]));

  // ---------- clock above the door
  const clock = new THREE.Group(); clock.position.set(CLOCK.x, CLOCK.y, CLOCK.z); g.add(clock);
  clock.add(PR.mesh(new THREE.CylinderGeometry(CLOCK.r + 0.02, CLOCK.r + 0.02, 0.05, 48), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.3 }), [0, 0, 0.02], [Math.PI / 2, 0, 0]));
  clock.add(PR.mesh(new THREE.CircleGeometry(CLOCK.r, 48), new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.0 }), [0, 0, 0.046], [0, 0, 0], false, true));
  const handM = new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.5 });
  const hourH = new THREE.Group(), minH = new THREE.Group(); hourH.position.z = 0.052; minH.position.z = 0.058; clock.add(hourH, minH);
  hourH.add(PR.mesh(new THREE.BoxGeometry(0.03, CLOCK.r * 0.56, 0.006), handM, [0, CLOCK.r * 0.22, 0], [0, 0, 0], false, false));
  minH.add(PR.mesh(new THREE.BoxGeometry(0.02, CLOCK.r * 0.86, 0.006), handM, [0, CLOCK.r * 0.36, 0], [0, 0, 0], false, false));
  clock.add(PR.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 16), handM, [0, 0, 0.064], [Math.PI / 2, 0, 0], false, false));
  const setTime = (hh, mm) => { minH.rotation.z = -mm / 60 * Math.PI * 2; hourH.rotation.z = -((hh % 12) + mm / 60) / 12 * Math.PI * 2; };
  setTime(8, 2);

  // ---------- hooks + lead (to the right of the door)
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6444, roughness: 0.6 });
  g.add(PR.mesh(PR.rbox(0.4, 0.08, 0.025, 0.008), wood, [HOOK.x, HOOK.y, HOOK.z]));
  for (const dx of [-0.12, 0.0, 0.12]) g.add(PR.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 10), wood, [HOOK.x + dx, HOOK.y - 0.005, HOOK.z + 0.04], [Math.PI / 2 - 0.3, 0, 0]));
  const lead = new THREE.Group(); lead.position.set(HOOK.x + 0.12, HOOK.y, HOOK.z + 0.06); g.add(lead);
  const leadM = new THREE.MeshStandardMaterial({ color: 0xb2382c, roughness: 0.6 });
  const lc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.03, -0.25, 0.01), new THREE.Vector3(-0.02, -0.55, 0.012), new THREE.Vector3(0.02, -0.6, 0.012), new THREE.Vector3(0.04, -0.3, 0.01), new THREE.Vector3(0.0, 0.0, 0.0)], true);
  lead.add(PR.mesh(new THREE.TubeGeometry(lc, 48, 0.009, 6, true), leadM));
  lead.add(PR.mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 14), brass, [0.0, -0.6, 0.012]));
  // a scarf on the left hook
  g.add(PR.mesh(PR.rbox(0.09, 0.5, 0.03, 0.012), new THREE.MeshStandardMaterial({ color: 0xc9a44a, roughness: 0.95 }), [HOOK.x - 0.12, HOOK.y - 0.26, HOOK.z + 0.05], [0.05, 0, 0.04]));

  // ---------- sofa + three cushions + side lamp
  const sofa = MD.sofa({ pos: [SOFA.cx, 0, SOFA.cz], w: SOFA.w, d: SOFA.d, seatH: SOFA.seatH, color: 0x7d8c9a, seed: 4 });
  g.add(sofa);
  const cushions = [];
  const cushMats = [0xd49a3c, 0xb85c3c, 0xd49a3c].map((c) => { const fb = MT.fabric({ base: [200, 200, 200], seed: c % 97, weave: 70 }); return MT.texMat({ map: fb.map, bump: fb.bump, bumpScale: 0.6, roughness: 0.95, repeat: [2, 2], color: c }); });
  [-0.72, 0.0, 0.72].forEach((dx, i) => {
    const c = PR.pillow({ w: 0.5, h: 0.14, d: 0.44, mat: cushMats[i], pos: [SOFA.cx + dx, SOFA.seatH + 0.26, SOFA.cz - SOFA.d / 2 + 0.3], rot: [Math.PI / 2 - 0.3, 0, (i - 1) * 0.05] });
    g.add(c); cushions.push(c);
  });
  // floor lamp
  const lampG = new THREE.Group(); lampG.position.set(LAMP.x, 0, LAMP.z); g.add(lampG);
  const blk = new THREE.MeshStandardMaterial({ color: 0x2b2926, roughness: 0.5, metalness: 0.4 });
  lampG.add(PR.mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 24), blk, [0, 0.015, 0]));
  lampG.add(PR.mesh(new THREE.CylinderGeometry(0.012, 0.012, LAMP.y - 0.1, 8), blk, [0, (LAMP.y - 0.1) / 2, 0]));
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf2e6d2, roughness: 1, side: THREE.DoubleSide, emissive: new THREE.Color(1.0, 0.7, 0.4), emissiveIntensity: lampOn ? 0.9 : 0 });
  lampG.add(PR.mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.3, 32, 1, true), shadeMat, [0, LAMP.y, 0], [0, 0, 0], false, false));
  const lampLight = new THREE.PointLight(new THREE.Color(1.0, 0.68, 0.38), lampOn ? 2.2 : 0, 0, 2); lampLight.position.set(LAMP.x, LAMP.y - 0.02, LAMP.z); g.add(lampLight);
  // pendant over the room (off unless a shot switches it on)
  const pend = new THREE.Group(); pend.position.set(0.5, R.h, -1.0); g.add(pend);
  pend.add(PR.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4), blk, [0, -0.25, 0], [0, 0, 0], false, false));
  const pendMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(1.0, 0.75, 0.45), emissiveIntensity: 0 });
  pend.add(PR.mesh(new THREE.ConeGeometry(0.22, 0.2, 28, 1, true), pendMat, [0, -0.58, 0], [0, 0, 0], false, false));
  const pendLight = new THREE.PointLight(new THREE.Color(1.0, 0.74, 0.46), 0, 0, 2); pendLight.position.set(0.5, R.h - 0.72, -1.0); g.add(pendLight);
  // side table with a mug by the sofa's left arm
  g.add(PR.mesh(PR.rbox(0.36, 0.5, 0.36, 0.02), wood, [-0.28, 0.25, -2.72]));

  // ---------- rug
  const rug = PR.mesh(new THREE.PlaneGeometry(RUG.w, RUG.d), new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 }), [RUG.cx, 0.004, RUG.cz], [-Math.PI / 2, 0, 0], false, true); g.add(rug);

  // ---------- kitchen corner: counter + fridge
  const cab = new THREE.MeshStandardMaterial({ color: 0x3f524c, roughness: 0.55 });
  const top = new THREE.MeshPhysicalMaterial({ color: 0xcfc8ba, roughness: 0.3, clearcoat: 0.3 });
  const kx = R.x0 + 0.31;
  g.add(PR.mesh(PR.rbox(0.62, 0.9, 2.1, 0.01), cab, [kx, 0.45, 0.9]));
  g.add(PR.mesh(PR.rbox(0.66, 0.04, 2.14, 0.006), top, [kx + 0.01, 0.92, 0.9]));
  g.add(PR.mesh(PR.rbox(0.36, 0.7, 1.6, 0.01), cab, [R.x0 + 0.18, 1.85, 1.1]));
  for (const z of [0.3, 0.9, 1.5]) g.add(PR.mesh(new THREE.BoxGeometry(0.02, 0.02, 0.16), new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.3 }), [kx + 0.32, 0.8, z]));
  g.add(PR.mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 20), new THREE.MeshPhysicalMaterial({ color: 0xd9d4ca, roughness: 0.3, metalness: 0.5 }), [kx, 1.05, 1.4]));
  // fridge (tall, white), door hinged on the back edge (z0) so it opens toward the room and the camera
  const fr = new THREE.Group(); g.add(fr);
  const FW = FRIDGE.z1 - FRIDGE.z0, FD = FRIDGE.front - R.x0, fcx = (R.x0 + FRIDGE.front) / 2, fcz = (FRIDGE.z0 + FRIDGE.z1) / 2;
  const fmat = new THREE.MeshPhysicalMaterial({ color: 0xe9e8e4, roughness: 0.35, clearcoat: 0.4 });
  fr.add(PR.mesh(new THREE.BoxGeometry(FD, FRIDGE.h, 0.03), fmat, [fcx, FRIDGE.h / 2, FRIDGE.z0 + 0.015]));
  fr.add(PR.mesh(new THREE.BoxGeometry(FD, FRIDGE.h, 0.03), fmat, [fcx, FRIDGE.h / 2, FRIDGE.z1 - 0.015]));
  fr.add(PR.mesh(new THREE.BoxGeometry(FD, 0.03, FW), fmat, [fcx, FRIDGE.h - 0.015, fcz]));
  fr.add(PR.mesh(new THREE.BoxGeometry(FD, 0.08, FW), fmat, [fcx, 0.04, fcz]));
  const inner = new THREE.MeshStandardMaterial({ color: 0xf4f6f7, roughness: 0.4, emissive: new THREE.Color(0.9, 0.95, 1.0), emissiveIntensity: 0 });
  fr.add(PR.mesh(new THREE.PlaneGeometry(FW - 0.06, FRIDGE.h - 0.12), inner, [R.x0 + 0.05, FRIDGE.h / 2, fcz], [0, Math.PI / 2, 0], false, true));
  const rng = mulberry32(9); const cols = [0xd94a3a, 0xf0e6c8, 0x3a8a4a, 0xe8c040, 0xffffff, 0x6a9ad0];
  for (const y of [0.5, 0.95, 1.4]) {
    fr.add(PR.mesh(new THREE.BoxGeometry(FD - 0.08, 0.01, FW - 0.06), new THREE.MeshStandardMaterial({ color: 0xdfeff8, roughness: 0.1, transparent: true, opacity: 0.5, emissive: 0x607080, emissiveIntensity: 0 }), [fcx - 0.02, y, fcz]));
    for (let k = 0; k < 3; k++) { const hh = 0.1 + rng() * 0.14; fr.add(PR.mesh(new THREE.CylinderGeometry(0.045, 0.045, hh, 12), new THREE.MeshStandardMaterial({ color: cols[Math.floor(rng() * cols.length)], roughness: 0.5 }), [fcx - 0.05 + (rng() - 0.5) * 0.2, y + hh / 2 + 0.006, FRIDGE.z0 + 0.15 + k * 0.22])); }
  }
  const fdoor = new THREE.Group(); fdoor.position.set(FRIDGE.front, 0, FRIDGE.z0); fr.add(fdoor);
  fdoor.add(PR.mesh(PR.rbox(0.06, FRIDGE.h - 0.02, FW, 0.01), fmat, [0.03, FRIDGE.h / 2, FW / 2]));
  fdoor.add(PR.mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), new THREE.MeshStandardMaterial({ color: 0xa0a0a0, metalness: 0.8, roughness: 0.3 }), [0.08, 1.15, FW - 0.07]));
  const fdIn = PR.mesh(new THREE.PlaneGeometry(FW - 0.08, FRIDGE.h - 0.2), inner, [-0.002, FRIDGE.h / 2, FW / 2], [0, -Math.PI / 2, 0], false, true); fdoor.add(fdIn);
  fdoor.rotation.y = -fridgeOpen; // opens toward +x (into the room)
  const fLight = new THREE.SpotLight(new THREE.Color(0.85, 0.93, 1.0), 0, 0, 1.0, 0.8, 2);
  fLight.position.set(FRIDGE.front - 0.25, 1.1, fcz); fLight.target.position.set(FRIDGE.front + 2.0, 0.3, fcz + 0.4); g.add(fLight, fLight.target);
  fLight.castShadow = false; fLight.shadow.mapSize.set(1024, 1024); fLight.shadow.bias = -0.0005;
  const setFridge = (a) => { fdoor.rotation.y = -a; const k = Math.min(1, a / 0.6); fLight.intensity = 9 * k; inner.emissiveIntensity = 0.9 * k; };
  setFridge(fridgeOpen);

  return {
    group: g, doorPivot, setDoor: (a) => { doorPivot.rotation.y = -a; }, hallLight, gapMat,
    setTime, clock, lead, cushions, lampLight, shadeMat, setLamp: (k) => { lampLight.intensity = 2.2 * k; shadeMat.emissiveIntensity = 0.9 * k; },
    setFridge, fLight, skyMat, sofa, rug, wallMat, floorMat,
    setPendant: (k) => { pendLight.intensity = 2.6 * k; pendMat.emissiveIntensity = 1.2 * k; },
  };
}

// daylight through the window: sun direction from azimuth (0 = straight in along -x; + = toward the back wall) and elevation (deg)
export function sunDir(az, el) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  return new THREE.Vector3(-Math.cos(e) * Math.cos(a), -Math.sin(e), -Math.cos(e) * Math.sin(a)).normalize();
}
export function makeSun(scene, { color = [1.0, 0.9, 0.75], intensity = 6 } = {}) {
  const sun = new THREE.DirectionalLight(new THREE.Color(...color), intensity);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 30 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const set = (az, el, k = 1, col = null) => {
    const d = sunDir(az, el); const c = new THREE.Vector3(0.2, 0.3, -0.4);
    sun.position.copy(c).addScaledVector(d, -14); sun.target.position.copy(c); sun.target.updateMatrixWorld();
    sun.intensity = intensity * k; if (col) sun.color.setRGB(...col);
  };
  return { sun, set };
}

// white fluff clumps (stuffing): instanced, each with its own transform
export function stuffing(count, seed = 3) {
  const geo = new THREE.SphereGeometry(1, 12, 9);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 0.78 + 0.22 * Math.sin(x * 5.1 + seed) * Math.sin(y * 4.3 + 1.7) * Math.sin(z * 6.2 + 0.4) + 0.12 * Math.sin(x * 11 + y * 9); p.setXYZ(i, x * k, y * k * 0.75, z * k); }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: 1, emissive: 0x201e1c });
  const im = new THREE.InstancedMesh(geo, mat, count); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  im.place = (i, pos, s, rot = [0, 0, 0]) => { e.set(...rot); q.setFromEuler(e); sc.set(s, s * 0.8, s); m4.compose(pos, q, sc); im.setMatrixAt(i, m4); im.instanceMatrix.needsUpdate = true; };
  return im;
}
