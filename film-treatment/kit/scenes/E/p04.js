// P04 SELF-BLAME — (a) small bathroom at night: leaning on the sink, facing the mirror, one hand on its own chest.
// (b) pull back: the bathroom is the only lit window in a huge dark apartment block.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';
import { mulberry32 } from './lib/cine.js';

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 40));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  let cam, focus;
  if (v === 'a') {
    // room: mirror wall at z = 0 (mirror faces +z), sink below it; the figure stands at z ~ 0.62 facing -z
    const tl = MT.tiles({ base: [196, 204, 202], grout: [150, 156, 154], n: 8, seed: 3, groutW: 0.03 });
    const tileMat = MT.texMat({ map: tl.map, bump: tl.bump, bumpScale: 0.8, roughness: 0.25, repeat: [1, 1] });
    const W = 2.2, D = 2.4, H = 2.5;
    for (const [pos, rot, sz] of [[[0, H / 2, 0], [0, 0, 0], [W, H]], [[-W / 2, H / 2, D / 2], [0, Math.PI / 2, 0], [D, H]], [[W / 2, H / 2, D / 2], [0, -Math.PI / 2, 0], [D, H]], [[0, H / 2, D], [0, Math.PI, 0], [W, H]]]) {
      const t2 = tileMat.clone(); t2.map = tl.map.clone(); t2.map.needsUpdate = true; t2.map.repeat.set(sz[0] / 1.2, sz[1] / 1.2); t2.bumpMap = tl.bump.clone(); t2.bumpMap.needsUpdate = true; t2.bumpMap.repeat.copy(t2.map.repeat);
      scene.add(PR.mesh(new THREE.PlaneGeometry(sz[0], sz[1]), t2, pos, rot, false, true));
    }
    const fl = MT.tiles({ base: [70, 74, 76], grout: [50, 52, 54], n: 6, seed: 5, groutW: 0.03 }); fl.map.repeat.set(3, 3); fl.bump.repeat.set(3, 3);
    scene.add(PR.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: fl.map, bumpMap: fl.bump, roughness: 0.4 }), [0, 0, D / 2], [-Math.PI / 2, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xd8dcdc, roughness: 0.9 }), [0, H, D / 2], [Math.PI / 2, 0, 0], false, true));
    // mirror (real reflection)
    const mirror = new Reflector(new THREE.PlaneGeometry(0.9, 0.8), { textureWidth: w, textureHeight: Math.round(w * 0.8 / 0.9), color: 0xb8c0c0, clipBias: 0.003 });
    mirror.position.set(0, 1.62, 0.012); scene.add(mirror);
    const frame = new THREE.MeshStandardMaterial({ color: 0x9aa0a2, metalness: 0.9, roughness: 0.3 });
    for (const [x, y, sw, sh] of [[0, 2.03, 0.94, 0.02], [0, 1.21, 0.94, 0.02], [-0.46, 1.62, 0.02, 0.84], [0.46, 1.62, 0.02, 0.84]]) scene.add(PR.mesh(new THREE.BoxGeometry(sw, sh, 0.02), frame, [x, y, 0.015]));
    // vanity strip light above the mirror
    const strip = PR.mesh(new THREE.BoxGeometry(0.7, 0.05, 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 1.0, 0.96).multiplyScalar(4) }), [0, 2.12, 0.05], [0, 0, 0], false, false); scene.add(strip);
    const ra = new THREE.RectAreaLight(new THREE.Color(0.82, 1.0, 0.95), 6, 0.7, 0.05); ra.position.set(0, 2.1, 0.09); ra.lookAt(0, 1.0, 1.2); scene.add(ra);
    const sp = new THREE.SpotLight(new THREE.Color(0.8, 1.0, 0.94), 4, 0, 0.9, 0.9, 2); sp.position.set(0, 2.1, 0.15); sp.target.position.set(0, 0.9, 0.8); sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0005; scene.add(sp, sp.target); lights.push({ l: sp, base: sp.position.clone(), r: 0.12 });
    // sink + vanity + tap + cup
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f4, roughness: 0.15, clearcoat: 0.8 });
    scene.add(PR.mesh(PR.rbox(0.62, 0.14, 0.44, 0.05, 4), white, [0, 0.86, 0.24]));
    scene.add(PR.mesh(PR.rbox(0.66, 0.72, 0.46, 0.01), new THREE.MeshStandardMaterial({ color: 0x3d4546, roughness: 0.6 }), [0, 0.43, 0.24]));
    const tapC = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.92, 0.06), new THREE.Vector3(0, 1.08, 0.07), new THREE.Vector3(0, 1.1, 0.16), new THREE.Vector3(0, 1.04, 0.2)]);
    scene.add(PR.mesh(new THREE.TubeGeometry(tapC, 16, 0.012, 8), new THREE.MeshStandardMaterial({ color: 0xc8cacc, metalness: 1, roughness: 0.15 })));
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.1, 16), new THREE.MeshPhysicalMaterial({ color: 0x86b0b8, roughness: 0.1, transparent: true, opacity: 0.6 }), [0.24, 0.98, 0.12]));
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0xe0e4e0 }), [0.245, 1.05, 0.12], [0.15, 0, 0.1]));
    // towel on the side wall
    scene.add(PR.mesh(PR.rbox(0.05, 0.6, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0x6e7f86, roughness: 1 }), [-W / 2 + 0.05, 1.3, 0.8]));
    // the figure: leaning with the left hand on the sink rim, right hand on its chest, head bowed toward the mirror
    const P = F.figure({ kind: 'beech', seed: 5, rotY: 180, pose: {
      chest: [22, 0, 0], head: [20, 0, 0], pelvis: [4, 0, 0],
      rShoulder: [-40, 0, -20], rElbow: [-115, -30, 0], rWrist: [0, 0, 0],
      lShoulder: [-38, 0, 8], lElbow: [-10, 0, 0], lHip: [-4, 0, 3], rHip: [-4, 0, -3] } });
    P.group.position.set(0.02, 0, 0.84); F.groundFig(P, 0); scene.add(P.group);
    const rim = F.jointPoint(P, 'chest'); // hand onto the sink rim via IK
    const ik = F.reachIK(P, 'l', new THREE.Vector3(-0.22, 0.95, 0.36), { local: [0, -0.1, 0.02], iters: 400 });
    const ik2 = F.reachIK(P, 'r', F.jointPoint(P, 'chest', [0.0, 0.26, 0.13]), { local: [0, -0.1, 0.04], iters: 400 });
    console.log('[scene] sink/chest err', ik.err.toFixed(3), ik2.err.toFixed(3));
    scene.environment = C.gradientEnv(renderer, { top: [0.3, 0.36, 0.35], horizon: [0.2, 0.24, 0.24], bottom: [0.05, 0.06, 0.06] }); scene.environmentIntensity = 0.3;
    cam = C.makeCamera(q, { pos: [0.78, 1.66, 2.3], look: [-0.1, 1.48, 0.0], fov: 28 }, w, h);
    focus = cam.position.distanceTo(new THREE.Vector3(0, 1.45, -0.8)); // focus on the reflection
  } else {
    // the block: facade plane at z = 0 facing +z; windows grid; one lit bathroom window
    const rng = mulberry32(8);
    const cols = 34, rows = 16, ww = 3.2, wh = 3.0; // module (units)
    const FW = cols * ww, FH = rows * wh;
    const conc = MT.concrete({ base: [70, 72, 74], amp: 20, seed: 12 }); conc.map.repeat.set(10, 8); conc.bump.repeat.set(10, 8);
    scene.add(PR.mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshStandardMaterial({ map: conc.map, bumpMap: conc.bump, roughness: 0.9 }), [0, FH / 2, 0], [0, 0, 0], false, true));
    const glassG = [], balcG = [], frameG = [];
    const litC = [21, 9], litSmall = true;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = -FW / 2 + (c + 0.5) * ww, y = (r + 0.5) * wh;
      if (c === litC[0] && r === litC[1]) continue;
      const small = (c % 3 === 1);
      const gw = small ? 0.9 : 2.0, gh = small ? 0.9 : 1.9, gy = small ? y + 0.35 : y;
      glassG.push(new THREE.PlaneGeometry(gw, gh).translate(x, gy, 0.02));
      frameG.push(new THREE.BoxGeometry(gw + 0.16, 0.1, 0.18).translate(x, gy - gh / 2 - 0.05, 0.09));
      if (!small && (r % 1 === 0)) balcG.push(new THREE.BoxGeometry(2.6, 0.12, 1.1).translate(x, y - wh / 2 + 0.1, 0.55), new THREE.BoxGeometry(2.6, 0.95, 0.05).translate(x, y - wh / 2 + 0.6, 1.08));
    }
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x06080a, roughness: 0.12, metalness: 0.0, envMapIntensity: 1.2 });
    scene.add(new THREE.Mesh(mergeGeometries(glassG), glassMat));
    const bm = new THREE.Mesh(mergeGeometries(balcG), new THREE.MeshStandardMaterial({ color: 0x3c3f42, roughness: 0.85 })); bm.castShadow = true; bm.receiveShadow = true; scene.add(bm);
    scene.add(new THREE.Mesh(mergeGeometries(frameG), new THREE.MeshStandardMaterial({ color: 0x55585b, roughness: 0.8 })));
    // the lit bathroom window: frosted, cold light, a soft silhouette behind it
    const lx = -FW / 2 + (litC[0] + 0.5) * ww, ly = (litC[1] + 0.5) * wh + 0.35;
    const frost = MT.drawTexture(256, 256, (g, W2, H2) => {
      const gr = g.createRadialGradient(W2 * 0.5, H2 * 0.35, 10, W2 * 0.5, H2 * 0.5, W2 * 0.75); gr.addColorStop(0, '#f4fffb'); gr.addColorStop(1, '#8fb7b0'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
      g.filter = 'blur(14px)'; g.fillStyle = 'rgba(40,52,52,0.75)'; g.beginPath(); g.ellipse(W2 * 0.46, H2 * 0.42, W2 * 0.11, H2 * 0.14, -0.2, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(W2 * 0.5, H2 * 0.95, W2 * 0.26, H2 * 0.38, 0, 0, Math.PI * 2); g.fill();
    });
    scene.add(PR.mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: frost, color: new THREE.Color(1, 1, 1).multiplyScalar(2.2) }), [lx, ly, 0.02], [0, 0, 0], false, false));
    scene.add(PR.mesh(new THREE.BoxGeometry(1.06, 0.1, 0.18), new THREE.MeshStandardMaterial({ color: 0x55585b, roughness: 0.8 }), [lx, ly - 0.5, 0.09]));
    const wl = new THREE.SpotLight(new THREE.Color(0.8, 1.0, 0.95), 18, 0, 1.2, 1, 2); wl.position.set(lx, ly, -0.3); wl.target.position.set(lx, ly - 1, 3); scene.add(wl, wl.target);
    // ground, trees in silhouette, a street lamp far below
    scene.add(PR.mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0c0d0e, roughness: 0.9 }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
    scene.add(PR.daySky({ radius: 900, zenith: [0.004, 0.008, 0.02], horizon: [0.012, 0.018, 0.035], ground: [0.01, 0.01, 0.01], sunDir: [0.5, 0.02, -1], sunColor: [0, 0, 0], glow: [0.03, 0.02, 0.012], glowPow: 3 }));
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.2, 0.28, 0.4), new THREE.Color(0.02, 0.02, 0.02), 0.9));
    // sodium street lamps along the base: warm pools climbing the lower floors
    for (let i = -4; i <= 4; i++) { const L = new THREE.PointLight(new THREE.Color(1.0, 0.6, 0.28), 40, 0, 2); L.position.set(i * 9 + 3, 5.5, 6); scene.add(L);
      scene.add(PR.mesh(new THREE.SphereGeometry(0.25, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.65, 0.3).multiplyScalar(12) }), [i * 9 + 3, 5.5, 6], [0, 0, 0], false, false)); }
    // trees in front of the block (dark masses)
    for (let i = 0; i < 9; i++) { const t = S.acacia({ pos: [-40 + i * 11 + rng() * 4, 0, 22 + rng() * 6], height: 7 + rng() * 3, spread: 5 + rng() * 2, seed: 30 + i, silhouette: true, leafColor: [0.02, 0.025, 0.02], trunkColor: 0x050505 }); scene.add(t); }
    const moon = new THREE.DirectionalLight(new THREE.Color(0.4, 0.55, 0.8), 0.5); moon.position.set(-30, 40, 40); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 50, bottom: -5, near: 1, far: 200 }); scene.add(moon);
    scene.environment = C.gradientEnv(renderer, { top: [0.02, 0.035, 0.06], horizon: [0.06, 0.08, 0.1], bottom: [0.01, 0.01, 0.01], panels: [{ pos: [0, 3, 12], w: 10, h: 3, color: [1.0, 0.65, 0.35], intensity: 0.4 }] }); scene.environmentIntensity = 0.5;
    const target = new THREE.Vector3(lx, ly, 0);
    cam = C.makeCamera(q, { pos: [lx - 11, 12, 180], look: [lx - 11, ly + 3.2, 0], fov: 12, far: 3000 }, w, h);
    focus = cam.position.distanceTo(target);
  }
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : (v === 'a' ? 2.0 : 4.0), dofScale: v === 'a' ? 1.2 : 1.0, seed: 4,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: 'modern', gradeOverride: v === 'b' ? { exposure: 1.9 } : undefined,
    bloom: v === 'b' ? { strength: 0.6, radius: 0.6, threshold: 0.9 } : { strength: 0.28, radius: 0.75, threshold: 1.3 },
    streak: { threshold: 2.2, strength: 0.3, tint: [0.4, 0.85, 0.85] },
  });
}
