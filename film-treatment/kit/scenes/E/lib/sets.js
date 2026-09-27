// Shared set builders for Direction E: fire camp, savanna, trees, grass.
import * as THREE from 'three';
import { mulberry32 } from './cine.js';
import * as MT from './mat.js';
import * as PR from './props.js';

// ------------------------------------------------------------------ ground
export function earthGround({ size = 80, repeat = 24, base = [118, 90, 64], dark = [72, 54, 38], seed = 31, rough = 0.95 } = {}) {
  const ea = MT.earth({ base, dark, seed }); ea.map.repeat.set(repeat, repeat); ea.bump.repeat.set(repeat, repeat);
  const g = PR.mesh(new THREE.PlaneGeometry(size, size, 1, 1), new THREE.MeshStandardMaterial({ map: ea.map, bumpMap: ea.bump, bumpScale: 1.2, roughness: rough }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true);
  return g;
}

// ------------------------------------------------------------------ grass blades (instanced, curved, tapered)
function bladeGeo(segs = 5) {
  const g = new THREE.PlaneGeometry(1, 1, 1, segs); g.translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.92)); p.setZ(i, y * y * 0.35); }
  g.computeVertexNormals(); return g;
}
// translucent grass material: back-lit blades glow (sun behind)
export function grassMaterial({ color = 0xffffff, sunDir = [0, 0.2, -1], transl = [1.0, 0.75, 0.35], translAmt = 0.6 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, side: THREE.DoubleSide, vertexColors: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.sunDirG = { value: new THREE.Vector3(...sunDir).normalize() };
    sh.uniforms.translC = { value: new THREE.Vector3(...transl).multiplyScalar(translAmt) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH; varying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vH; varying vec3 vWP; uniform vec3 sunDirG; uniform vec3 translC;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.45, 1.0, vH);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ vec3 V = normalize(cameraPosition - vWP); float b = pow(max(dot(-V, sunDirG), 0.0), 3.0); totalEmissiveRadiance += translC * diffuseColor.rgb * b * (0.3 + 0.7*vH); }');
  };
  return m;
}
// field of blades in a rectangle/ring; density per unit^2. height range. color palette
export function grassField({ area = [10, 10], center = [0, 0, 0], density = 300, height = [0.5, 1.1], width = [0.012, 0.02], colors = [[0.62, 0.52, 0.3], [0.7, 0.6, 0.36], [0.5, 0.42, 0.24], [0.56, 0.5, 0.28]], seed = 3, lean = 0.35, exclude = null, material, maxCount = 250000, falloff = null, clumps = 0, clumpR = 0.25, heads = 0 } = {}) {
  const rng = mulberry32(seed);
  const C0 = []; for (let i = 0; i < clumps; i++) C0.push([center[0] + (rng() - 0.5) * area[0], center[2] + (rng() - 0.5) * area[1], 0.7 + rng() * 0.6]);
  const headPts = [];
  const n = Math.min(maxCount, Math.round(area[0] * area[1] * density));
  const geo = bladeGeo(5);
  const mat = material || grassMaterial({});
  const im = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3(); const col = new THREE.Color();
  let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    let x = center[0] + (rng() - 0.5) * area[0], z = center[2] + (rng() - 0.5) * area[1], hk = 1;
    if (clumps && rng() < 0.75) { const c = C0[Math.floor(rng() * C0.length)]; const rr = clumpR * Math.sqrt(-2 * Math.log(rng() + 1e-6)) * 0.5, aa = rng() * Math.PI * 2; x = c[0] + Math.cos(aa) * rr; z = c[1] + Math.sin(aa) * rr; hk = c[2]; }
    if (exclude && exclude(x, z)) continue;
    if (falloff && rng() > falloff(x, z)) continue;
    t.set(x, center[1], z);
    e.set((rng() - 0.5) * lean, rng() * Math.PI * 2, (rng() - 0.5) * lean); q.setFromEuler(e);
    const hh = (height[0] + rng() * (height[1] - height[0])) * hk; const ww = width[0] + rng() * (width[1] - width[0]);
    s.set(ww, hh, hh * (0.6 + rng() * 0.8)); m4.compose(t, q, s); im.setMatrixAt(k, m4);
    if (heads && rng() < heads) { const tip = new THREE.Vector3(0, 1, 0.35).applyMatrix4(m4); const dir = new THREE.Vector3(0, 1, 0.7).transformDirection(m4); headPts.push([tip, dir, hh]); }
    const c = colors[Math.floor(rng() * colors.length)]; const v = 0.8 + rng() * 0.4; col.setRGB(c[0] * v, c[1] * v, c[2] * v); im.setColorAt(k, col); k++;
  }
  im.count = k; im.castShadow = true; im.receiveShadow = true;
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  if (headPts.length) {
    const hg = new THREE.SphereGeometry(1, 6, 4); hg.scale(0.012, 0.07, 0.012); hg.translate(0, 0.05, 0);
    const hm = new THREE.InstancedMesh(hg, material || grassMaterial({}), headPts.length);
    const up = new THREE.Vector3(0, 1, 0);
    headPts.forEach(([tp, dir], i) => { q.setFromUnitVectors(up, dir); m4.compose(tp, q, new THREE.Vector3(1, 1, 1)); hm.setMatrixAt(i, m4); col.setRGB(0.78 + rng() * 0.1, 0.62 + rng() * 0.1, 0.36); hm.setColorAt(i, col); });
    hm.castShadow = true; hm.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(im, hm); return grp;
  }
  return im;
}

// ------------------------------------------------------------------ acacia (flat-topped umbrella tree)
export function acacia({ pos = [0, 0, 0], height = 5, spread = 4.5, seed = 1, trunkColor = 0x3b2e24, leafColor = [0.18, 0.22, 0.1], leafTex = true, leafCards = 2600, silhouette = false } = {}) {
  const rng = mulberry32(seed); const g = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.95 });
  // trunk splits into 3-4 limbs that rise and spread to the canopy base
  const baseY = height * 0.62;
  const trunkTop = new THREE.Vector3((rng() - 0.5) * 0.4, height * 0.28, (rng() - 0.5) * 0.4);
  const curve0 = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(trunkTop.x * 0.4, height * 0.15, trunkTop.z * 0.4), trunkTop]);
  g.add(PR.mesh(new THREE.TubeGeometry(curve0, 12, height * 0.035, 8), barkMat));
  const limbs = 3 + Math.floor(rng() * 2); const tips = [];
  for (let i = 0; i < limbs; i++) {
    const a = i / limbs * Math.PI * 2 + rng() * 0.8; const r = spread * (0.28 + rng() * 0.2);
    const tip = new THREE.Vector3(Math.cos(a) * r, baseY + rng() * height * 0.1, Math.sin(a) * r); tips.push(tip);
    const mid = trunkTop.clone().lerp(tip, 0.5); mid.y += height * 0.02;
    g.add(PR.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([trunkTop, mid, tip]), 12, height * 0.018, 6), barkMat));
    // sub-branches
    for (let j = 0; j < 3; j++) { const a2 = a + (rng() - 0.5) * 1.6; const r2 = r + spread * 0.18 * rng(); const t2 = new THREE.Vector3(Math.cos(a2) * r2, baseY + height * (0.05 + rng() * 0.08), Math.sin(a2) * r2); tips.push(t2); g.add(PR.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([tip.clone().lerp(trunkTop, 0.3), t2]), 6, height * 0.008, 5), barkMat)); }
  }
  // canopy: flattened clumps
  if (silhouette || !leafTex) {
    const cm = new THREE.MeshStandardMaterial({ color: new THREE.Color(...leafColor), roughness: 0.9 });
    for (const tp of tips) { const s = spread * (0.18 + rng() * 0.14); const b = PR.mesh(new THREE.IcosahedronGeometry(1, 2), cm, [tp.x, tp.y + height * 0.06, tp.z]); b.scale.set(s, s * 0.28, s); g.add(b); }
  } else {
    const lt = leafClusterTex(seed);
    const lm = new THREE.MeshStandardMaterial({ map: lt, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, color: new THREE.Color(...leafColor).multiplyScalar(3.2) });
    const card = new THREE.PlaneGeometry(1, 1);
    const im = new THREE.InstancedMesh(card, lm, leafCards);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i < leafCards; i++) {
      const tp = tips[Math.floor(rng() * tips.length)];
      const rr = spread * 0.22 * Math.sqrt(rng()); const aa = rng() * Math.PI * 2;
      t.set(tp.x + Math.cos(aa) * rr, tp.y + height * (0.03 + rng() * 0.08) - rr * 0.12, tp.z + Math.sin(aa) * rr);
      e.set(-Math.PI / 2 + (rng() - 0.5) * 1.0, rng() * Math.PI * 2, (rng() - 0.5) * 0.8); q.setFromEuler(e);
      const sc = spread * (0.07 + rng() * 0.05); s.set(sc, sc, sc); m4.compose(t, q, s); im.setMatrixAt(i, m4);
    }
    im.castShadow = true; im.receiveShadow = true; g.add(im);
  }
  g.position.set(...pos); g.rotation.y = rng() * Math.PI * 2;
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}
export function leafClusterTex(seed = 1) {
  const rng = mulberry32(seed + 77);
  return MT.drawTexture(256, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = W * (0.12 + rng() * 0.76), y = H * (0.12 + rng() * 0.76), r = 6 + rng() * 9, a = rng() * Math.PI;
      const v = 0.55 + rng() * 0.45; g.fillStyle = `rgb(${Math.round(70 * v)},${Math.round(84 * v)},${Math.round(40 * v)})`;
      g.beginPath(); g.ellipse(x, y, r, r * 0.45, a, 0, Math.PI * 2); g.fill();
    }
  });
}

// ------------------------------------------------------------------ bushes / low scrub silhouettes on the horizon
export function scrubLine({ radius = 40, count = 40, arc = [0, Math.PI * 2], height = [0.6, 2.2], color = 0x0c0a08, seed = 9, y = 0 } = {}) {
  const rng = mulberry32(seed); const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < count; i++) {
    const a = arc[0] + (arc[1] - arc[0]) * rng(); const r = radius * (0.85 + rng() * 0.3);
    const hh = height[0] + rng() * (height[1] - height[0]);
    const b = PR.mesh(new THREE.IcosahedronGeometry(1, 1), mat, [Math.cos(a) * r, y + hh * 0.3, Math.sin(a) * r], [0, 0, 0], false, false);
    b.scale.set(hh * (1 + rng()), hh * 0.6, hh * (1 + rng())); g.add(b);
  }
  return g;
}

// ------------------------------------------------------------------ fire camp
// returns { group, light, lights (for jitter), fire }
export function fireCamp(scene, { center = [0, 0, 0], fireScale = 1, sky = true, ground = true, stars = 1800, distantFires = 5, grass = true, flicker = true, lightI = 16, seed = 5, trees = true, skyGlow = null } = {}) {
  const g = new THREE.Group();
  if (ground) g.add(earthGround({ size: 160, repeat: 50, seed: seed + 1, base: [84, 66, 48], dark: [52, 40, 30] }));
  const fr = PR.fire({ pos: center, scale: fireScale, flames: 8, emberGlow: 5, flameIntensity: 5, seed });
  g.add(fr);
  g.add(PR.sparks({ pos: center, count: Math.round(26 * fireScale), height: 1.7 * fireScale, spread: 0.35 * fireScale, seed: seed + 3, intensity: 10 }));
  const glow = MT.glowSprite([1.0, 0.45, 0.12], 0.12, 1.5 * fireScale, 2.6); glow.position.set(center[0], center[1] + 0.35 * fireScale, center[2]); g.add(glow);
  const L = new THREE.PointLight(new THREE.Color(1.0, 0.52, 0.2), lightI * fireScale * fireScale, 0, 2);
  L.position.set(center[0], center[1] + 0.42 * fireScale, center[2]); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.003; L.shadow.radius = 2; L.shadow.camera.near = 0.1; L.shadow.camera.far = 30;
  g.add(L);
  // low bounce from the ground around the fire (no shadow)
  const B = new THREE.PointLight(new THREE.Color(1.0, 0.45, 0.18), lightI * 0.12 * fireScale, 0, 2); B.position.set(center[0], center[1] + 0.05, center[2]); g.add(B);
  if (grass) {
    const gf = grassField({ area: [24, 24], center: [center[0], 0, center[2]], density: 16, height: [0.08, 0.3], width: [0.012, 0.02], seed: seed + 7, exclude: (x, z) => Math.hypot(x - center[0], z - center[2]) < 2.2, material: grassMaterial({ translAmt: 0 }) });
    gf.traverse(c => { if (c.isMesh) c.castShadow = false; }); g.add(gf);
  }
  if (sky) {
    g.add(PR.nightSky({ radius: 150, stars, seed: seed + 2, starI: 1.3, top: [0.003, 0.007, 0.022], horizon: [0.018, 0.028, 0.06], glow: skyGlow }));
    const rng = mulberry32(seed + 11);
    for (let i = 0; i < distantFires; i++) {
      const a = rng() * Math.PI * 2, r = 25 + rng() * 40; const gs = MT.glowSprite([1.0, 0.5, 0.15], 2.5, 0.6 + rng() * 0.4, 2.5); gs.position.set(center[0] + Math.cos(a) * r, 0.25, center[2] + Math.sin(a) * r); g.add(gs);
    }
    if (trees) {
      const rng2 = mulberry32(seed + 13);
      for (let i = 0; i < 7; i++) { const a = rng2() * Math.PI * 2, r = 30 + rng2() * 30; g.add(acacia({ pos: [center[0] + Math.cos(a) * r, 0, center[2] + Math.sin(a) * r], height: 5 + rng2() * 3, spread: 5 + rng2() * 3, seed: seed + i, silhouette: true, leafColor: [0.02, 0.02, 0.018], trunkColor: 0x050404 })); }
      g.add(scrubLine({ radius: 45, count: 60, seed: seed + 5 }));
    }
  }
  scene.add(g);
  const lights = [{ l: L, base: L.position.clone(), r: 0.12 * fireScale, flicker: flicker ? 0.25 : 0, baseI: L.intensity }];
  return { group: g, light: L, bounce: B, lights, fire: fr };
}

// jitter helper for lights list [{l, base, r, flicker, baseI}]
export function jitterLights(lights, rng) {
  for (const L of lights) {
    L.l.userData.jitter = true;
    L.l.position.copy(L.base).add(new THREE.Vector3((rng() - 0.5) * 2 * L.r, (rng() - 0.5) * 2 * L.r, (rng() - 0.5) * 2 * L.r));
    if (L.flicker && L.baseI !== undefined) L.l.intensity = L.baseI * (1 - L.flicker * 0.5 + L.flicker * rng());
  }
}
