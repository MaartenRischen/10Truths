// Film 03 — the camp at night: embers (fire at the origin), a half-dome reed shelter open toward the fire, the sleeping pile
// on hides, a flat rock at the camp edge (z ~ +3.4) facing out into dark grass and stars. Dawn comes up behind the camp (-z).
import * as THREE from 'three';
import * as C from '../../scenes/E/lib/cine.js';
import * as MT from '../../scenes/E/lib/mat.js';
import * as PR from '../../scenes/E/lib/props.js';
import * as S from '../../scenes/E/lib/sets.js';
import { V } from './anim.js';

export const ROCK = { pos: V(0.55, 0, 3.4), top: 0.34 };
export const HIDE_TOP = 0.12;
export const PILE = V(0, 0, -1.75);

export function rock() {
  const geo = new THREE.IcosahedronGeometry(1, 3); const p = geo.attributes.position; const N = MT.makeNoise(41);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 1 + (N.fbm(x * 1.7 + 4, z * 1.7 + y * 1.3, 4) - 0.5) * 0.35;
    x *= n; z *= n; y *= n; if (y > 0.62) y = 0.62 + (y - 0.62) * 0.12; if (y < -0.2) y = -0.2;
    p.setXYZ(i, x * 0.58, (y + 0.2) * 0.41, z * 0.46);
  }
  geo.computeVertexNormals();
  const st = MT.concrete({ base: [96, 90, 82], amp: 26, seed: 43 });
  const m = PR.mesh(geo, new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 1.5, roughness: 0.9, color: 0xb0a898 }), [ROCK.pos.x, 0, ROCK.pos.z]);
  m.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m); m.position.y += ROCK.top - box.max.y; m.updateMatrixWorld(true);
  return m;
}

export function shelter() {
  const g = new THREE.Group();
  const th = MT.thatch({ seed: 7 }); th.map.repeat.set(4, 2); th.bump.repeat.set(4, 2);
  const thMat = new THREE.MeshStandardMaterial({ map: th.map, bumpMap: th.bump, bumpScale: 2.0, roughness: 0.95, side: THREE.DoubleSide, color: 0xcfc3ae });
  const R = 2.25, Hh = 1.75;
  const geo = new THREE.SphereGeometry(1, 64, 24, Math.PI * 1.08, Math.PI * 0.84, 0, Math.PI / 2);
  const p = geo.attributes.position; const N = MT.makeNoise(9);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 1 + (N.fbm(x * 2 + 5, z * 2 + y * 2, 3) - 0.5) * 0.1; p.setXYZ(i, x * R * n, y * Hh * n, z * R * n); }
  geo.computeVertexNormals();
  g.add(PR.mesh(geo, thMat));
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4d3a28, roughness: 0.85 });
  for (let k = 0; k <= 4; k++) {
    const a = Math.PI * (1.1 + 0.8 * k / 4); const pts = [];
    for (let t = 0; t <= 16; t++) { const th2 = t / 16 * Math.PI / 2; pts.push(V(-Math.cos(a) * Math.sin(th2 + 0.001) * R * 0.97 * Math.cos(0), Math.cos(th2) * Hh * 0.97, Math.sin(a) * Math.sin(th2) * R * 0.97)); }
    g.add(PR.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.reverse()), 24, 0.022, 6), poleMat));
  }
  g.position.set(PILE.x, 0, PILE.z + 0.75);
  return g;
}

// dawn: 0 = deep night, 1 = pre-dawn blue
export function camp(scene, renderer, { dawn = 0, grassNear = true, farGrass = true, shadows = true, fireI = 14, embers = false } = {}) {
  const fc = S.fireCamp(scene, { center: [0, 0, 0], fireScale: 0.55, sky: false, grass: grassNear, lightI: fireI, seed: 5, trees: false });
  fc.light.castShadow = shadows; fc.light.shadow.mapSize.set(1024, 1024);
  const sky = PR.nightSky({ radius: 150, stars: 1800, seed: 7, starI: 1.4, top: [0.003, 0.007, 0.022], horizon: [0.018, 0.028, 0.06], glow: { dir: [0, 0, -1], color: [0, 0, 0] } });
  scene.add(sky);
  const skyMat = sky.children[0].material; const starsMat = sky.children[1].material;
  // horizon: distant acacias + scrub (silhouettes)
  const rng = C.mulberry32(23);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng() * 0.4, r = 32 + rng() * 26;
    scene.add(S.acacia({ pos: [Math.cos(a) * r, 0, Math.sin(a) * r], height: 5 + rng() * 3, spread: 5 + rng() * 3, seed: 30 + i, silhouette: true, leafColor: [0.02, 0.02, 0.018], trunkColor: 0x050404 }));
  }
  scene.add(S.scrubLine({ radius: 42, count: 70, seed: 12 }));
  // dark grass beyond the rock (what the watcher scans)
  if (farGrass) {
    const gm = S.grassMaterial({ translAmt: 0 });
    const gf = S.grassField({ area: [18, 12], center: [0.5, 0, 9.6], density: 26, height: [0.4, 0.95], width: [0.014, 0.022], seed: 11, material: gm, exclude: (x, z) => z < 3.75 || (Math.abs(x - ROCK.pos.x) < 0.9 && z < 4.2), clumps: 60, clumpR: 0.4 });
    gf.traverse((c) => { if (c.isMesh) c.castShadow = false; }); scene.add(gf);
    const side = S.grassField({ area: [7, 7], center: [-4.8, 0, 1.8], density: 14, height: [0.35, 0.8], seed: 13, material: gm });
    side.traverse((c) => { if (c.isMesh) c.castShadow = false; }); scene.add(side);
    const side2 = S.grassField({ area: [6, 7], center: [5.2, 0, 1.4], density: 14, height: [0.35, 0.8], seed: 14, material: gm });
    side2.traverse((c) => { if (c.isMesh) c.castShadow = false; }); scene.add(side2);
  }
  const rk = rock(); scene.add(rk);
  const sh = shelter(); scene.add(sh);
  scene.add(PR.bedding({ w: 3.0, d: 2.0, h: HIDE_TOP, pos: [PILE.x - 0.2, 0, PILE.z + 0.2], hideColor: [118, 88, 60], seed: 3 }));
  scene.add(PR.bedding({ w: 1.4, d: 1.1, h: HIDE_TOP * 0.8, pos: [PILE.x + 1.1, 0, PILE.z - 0.3], hideColor: [96, 72, 50], seed: 5 }));
  // a few rolled hides as pillows, a gourd, digging stick (life around the fire)
  const hideMat = new THREE.MeshStandardMaterial({ color: 0x6a4c34, roughness: 1 });
  scene.add(PR.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16), hideMat, [PILE.x - 1.35, HIDE_TOP + 0.08, PILE.z - 0.4], [0.2, 0, Math.PI / 2]));
  scene.add(PR.mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.7 }), [1.6, 0.1, -0.4]));
  scene.add(PR.mesh(new THREE.CylinderGeometry(0.012, 0.016, 1.3, 6), new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.9 }), [1.8, 0.03, 0.4], [Math.PI / 2 - 0.05, 0, 1.1]));
  // sky fill (grows with dawn)
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.35, 0.48, 0.8), new THREE.Color(0.06, 0.05, 0.04), 0.06); scene.add(hemi);
  const moon = new THREE.DirectionalLight(new THREE.Color(0.5, 0.62, 0.95), 0.12); moon.position.set(-6, 10, 8); scene.add(moon);
  scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.03], horizon: [0.02, 0.025, 0.04], bottom: [0.04, 0.02, 0.01], panels: [{ pos: [0, 0.3, 0], w: 2, h: 2, color: [1.0, 0.5, 0.2], intensity: 1.2 }] });
  scene.environmentIntensity = 0.3;
  if (embers) { // burnt low before dawn: two small flames, dim glow, no sparks
    fc.fire.userData.flames.children.forEach((q, i) => { if (i > 1) q.visible = false; else q.scale.set(0.5, 0.45, 1); });
    fc.group.children.forEach((c) => { if (c.isSprite) c.material.color.multiplyScalar(0.3); if (c.isGroup && c !== fc.fire && c.children.length > 5 && c.children[0].geometry && c.children[0].geometry.type === 'CylinderGeometry') c.visible = false; });
    fc.light.intensity *= 0.45; fc.bounce.intensity *= 0.5;
  }
  const baseI = fc.light.intensity;
  const setDawn = (k) => {
    const n = [0.018, 0.028, 0.06], d = [0.12, 0.2, 0.42];
    skyMat.uniforms.hor.value.set(n[0] + (d[0] - n[0]) * k, n[1] + (d[1] - n[1]) * k, n[2] + (d[2] - n[2]) * k);
    skyMat.uniforms.top.value.set(0.003 + 0.02 * k, 0.007 + 0.035 * k, 0.022 + 0.09 * k);
    skyMat.uniforms.glowCol.value.set(0.25 * k, 0.4 * k, 0.75 * k);
    starsMat.opacity = 1 - 0.7 * k; starsMat.transparent = true;
    hemi.intensity = 0.06 + 0.4 * k; moon.intensity = 0.12 + 0.3 * k;
  };
  setDawn(dawn);
  // fire flicker per frame (deterministic)
  const flames = fc.fire.userData.flames;
  const flick = (frame, amt = 1) => {
    const h = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
    const f = 0.82 + 0.22 * h(frame * 3.1 + 1) + 0.08 * Math.sin(frame * 0.9);
    fc.light.intensity = baseI * (1 + (f - 1) * amt);
    const k = embers ? 0.45 : 1; flames.children.forEach((q, i) => { q.scale.y = k * (0.85 + 0.3 * h(frame * 7.3 + i * 13)); q.scale.x = (embers ? 0.5 : 1) * (0.9 + 0.2 * h(frame * 5.1 + i * 3)); });
  };
  return { fc, sky, skyMat, setDawn, flick, hemi, rock: rk, shelter: sh };
}
