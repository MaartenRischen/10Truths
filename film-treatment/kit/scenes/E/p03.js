// P03 HOW WE FEEL — (a) alone in a fluorescent open-plan office at night, rows of empty desks.
// (b) rain on the window of a night bus, the manikin's head against the glass.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';
import { mulberry32 } from './lib/cine.js';

function mergedMesh(list, mat) { const g = mergeGeometries(list.map(([geo, m4]) => geo.clone().applyMatrix4(m4)), false); const me = new THREE.Mesh(g, mat); me.castShadow = true; me.receiveShadow = true; return me; }
const M4 = (x, y, z, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));

export function rainTex({ W = 1024, H = 1024, seed = 5, drops = 1500, streaks = 9, colors = [[255, 200, 140], [140, 190, 255], [255, 80, 70], [200, 255, 230]] } = {}) {
  const rng = mulberry32(seed);
  return MT.drawTexture(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    // streaks (running drops): thin vertical wavy trails
    for (let i = 0; i < streaks; i++) {
      let x = rng() * W, y = rng() * H * 0.6; const len = 60 + rng() * 220; const wdt = 1.2 + rng() * 1.6;
      g.strokeStyle = `rgba(200,220,235,${0.06 + rng() * 0.07})`; g.lineWidth = wdt; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < len; k += 10) { x += (rng() - 0.5) * 1.2; g.lineTo(x, y + k); } g.stroke();
      const c = colors[Math.floor(rng() * colors.length)]; g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.9)`; g.beginPath(); g.arc(x, y + len, wdt * 1.6, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < drops; i++) {
      const x = rng() * W, y = rng() * H, r = 1.5 + Math.pow(rng(), 2.5) * 12;
      const c = colors[Math.floor(rng() * colors.length)];
      const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.3, 0, x, y, r);
      gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.95)`); gr.addColorStop(0.35, `rgba(${c[0] * 0.5},${c[1] * 0.5},${c[2] * 0.5},0.5)`); gr.addColorStop(0.8, 'rgba(10,14,20,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 1.08, 0, 0, Math.PI * 2); g.fill();
    }
  }, { srgb: true });
}

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
    const rng = mulberry32(3);
    // carpet floor, ceiling grid, window wall on the left with city beyond
    const cp = MT.concrete({ base: [58, 64, 66], amp: 14, seed: 4 }); cp.map.repeat.set(20, 20); cp.bump.repeat.set(20, 20);
    scene.add(PR.mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: cp.map, bumpMap: cp.bump, bumpScale: 0.5, roughness: 0.95 }), [0, 0, 0], [-Math.PI / 2, 0, 0], false, true));
    const ceilY = 3.0;
    scene.add(PR.mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x9aa3a3, roughness: 0.9 }), [0, ceilY, 0], [Math.PI / 2, 0, 0], false, true));
    // ceiling tile grid lines
    const gridG = []; for (let i = -20; i <= 20; i++) { gridG.push([new THREE.BoxGeometry(0.02, 0.01, 60), M4(i * 0.7, ceilY - 0.005, 0)]); gridG.push([new THREE.BoxGeometry(60, 0.01, 0.02), M4(0, ceilY - 0.005, i * 0.7)]); }
    scene.add(mergedMesh(gridG, new THREE.MeshStandardMaterial({ color: 0x6f7777, roughness: 0.8 })));
    // fluorescent troffers: rows along z
    const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 1.0, 0.95).multiplyScalar(2.6) });
    const tubes = []; for (let ix = -3; ix <= 3; ix++) for (let iz = -9; iz <= 5; iz++) { if (rng() < 0.12) continue; tubes.push([new THREE.BoxGeometry(0.28, 0.02, 1.25), M4(ix * 2.1, ceilY - 0.012, iz * 2.1)]); }
    scene.add(mergedMesh(tubes, tubeMat));
    // area lights for a few troffers near the figure + generic overhead fill
    for (const [x, z] of [[2.1, -6.3], [0, -4.2], [2.1, -2.1], [0, -8.4]]) { const ra = new THREE.RectAreaLight(new THREE.Color(0.8, 1.0, 0.92), 4.5, 0.3, 1.25); ra.position.set(x, ceilY - 0.03, z); ra.lookAt(x, 0, z); scene.add(ra); }
    const top = new THREE.DirectionalLight(new THREE.Color(0.75, 0.95, 0.9), 0.9); top.position.set(0.5, 10, 1); top.castShadow = true; top.shadow.mapSize.set(2048, 2048); Object.assign(top.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); top.shadow.bias = -0.0005; scene.add(top);
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.6, 0.8, 0.78), new THREE.Color(0.15, 0.18, 0.18), 0.5));
    // desks: pods of 2x2 with walkways; main aisle along z at x = 0
    const deskTop = [], deskLeg = [], mon = [], chairs = [];
    const deskW = 1.3, deskD = 0.7, deskH = 0.74;
    const podX = [-5.2, -2.3, 2.3, 5.2], podZ = [-15, -12, -9, -6, -3, 0, 3];
    for (const pz of podZ) for (const px of podX) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = px + sx * deskW / 2, zz = pz + sz * deskD / 2;
        deskTop.push([new THREE.BoxGeometry(deskW - 0.02, 0.03, deskD), M4(x, deskH, zz)]);
        deskLeg.push([new THREE.BoxGeometry(0.04, deskH, deskD * 0.9), M4(x - sx * (deskW / 2 - 0.03), deskH / 2, zz)]);
        mon.push([new THREE.BoxGeometry(0.5, 0.3, 0.025), M4(x, deskH + 0.3, pz + sz * 0.12)]); mon.push([new THREE.BoxGeometry(0.04, 0.2, 0.04), M4(x, deskH + 0.1, pz + sz * 0.14)]);
        if (rng() < 0.9) { const cx = x + (rng() - 0.5) * 0.3, cz = zz + sz * (0.62 + rng() * 0.15); const ry = (rng() - 0.5) * 0.8;
          chairs.push([new THREE.BoxGeometry(0.46, 0.06, 0.46), M4(cx, 0.48, cz, ry)], [new THREE.BoxGeometry(0.44, 0.5, 0.06), new THREE.Matrix4().compose(new THREE.Vector3(cx + Math.sin(ry) * sz * 0.22, 0.8, cz + Math.cos(ry) * sz * 0.22), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1))], [new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), M4(cx, 0.23, cz)]); }
      }
      deskTop.push([new THREE.BoxGeometry(deskW * 2, 0.32, 0.03), M4(px, deskH + 0.16, pz)]);
    }
    scene.add(mergedMesh(deskTop, new THREE.MeshStandardMaterial({ color: 0xc9cfcc, roughness: 0.6 })));
    scene.add(mergedMesh(deskLeg, new THREE.MeshStandardMaterial({ color: 0x8a9290, roughness: 0.5, metalness: 0.4 })));
    scene.add(mergedMesh(mon, new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.35 })));
    scene.add(mergedMesh(chairs, new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.7 })));
    // our manikin: pod at x = 2.3, z = -6, the aisle-side desk facing -z (toward the far wall), side-on to camera
    const dx = 2.3 - deskW / 2, dz = -6 + deskD / 2;
    const P = F.figure({ kind: 'beech', seed: 5, rotY: 180, pose: { lHip: [-90, 0, 7], rHip: [-90, 0, -7], lKnee: [92, 0, 0], rKnee: [92, 0, 0], chest: [18, 0, 0], head: [16, 0, 10], lShoulder: [-40, 0, 12], rShoulder: [-44, 0, -12], lElbow: [-70, 0, 0], rElbow: [-60, 0, 0] } });
    P.group.position.set(dx, 0, dz + 0.55); F.seatFig(P, 0.5); scene.add(P.group);
    const scr = PR.mesh(new THREE.PlaneGeometry(0.46, 0.27), new THREE.MeshBasicMaterial({ map: MD.laptopScreenTex({ kind: 'doc', seed: 11 }), color: new THREE.Color(1, 1, 1).multiplyScalar(1.4) }), [dx, deskH + 0.3, -6 + 0.12 + 0.014], [0, 0, 0], false, false); scene.add(scr);
    const ra = new THREE.RectAreaLight(new THREE.Color(0.8, 0.9, 1.0), 6, 0.46, 0.27); ra.position.set(dx, deskH + 0.3, -6 + 0.15); ra.lookAt(dx, deskH + 0.3, 5); scene.add(ra);
    // window wall (left, x = -6.2) with city
    for (let i = -12; i <= 6; i++) scene.add(PR.mesh(new THREE.BoxGeometry(0.08, ceilY, 0.08), new THREE.MeshStandardMaterial({ color: 0x1d2222, roughness: 0.5 }), [-6.2, ceilY / 2, i * 1.6]));
    const city = MD.city({ center: [-60, -10, -10], spread: [40, 120], count: 60, seed: 7, emissive: 0.9, litFrac: 0.25 }); scene.add(city);
    scene.add(PR.mesh(new THREE.PlaneGeometry(200, 100), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.035, 0.06) }), [-90, 20, 0], [0, Math.PI / 2, 0], false, false));
    scene.add(PR.mesh(new THREE.PlaneGeometry(40, ceilY), new THREE.MeshStandardMaterial({ color: 0x5c6566, roughness: 0.9 }), [0, ceilY / 2, -20], [0, 0, 0], false, true));
    scene.add(PR.mesh(new THREE.PlaneGeometry(40, ceilY), new THREE.MeshStandardMaterial({ color: 0x5c6566, roughness: 0.9 }), [6.4, ceilY / 2, 0], [0, -Math.PI / 2, 0], false, true));
    scene.environment = C.gradientEnv(renderer, { top: [0.3, 0.38, 0.36], horizon: [0.12, 0.15, 0.15], bottom: [0.05, 0.06, 0.06] }); scene.environmentIntensity = 0.35;
    cam = C.makeCamera(q, { pos: [-0.25, 1.22, 6.5], look: [0.5, 1.02, -6.0], fov: 22 }, w, h);
    focus = cam.position.distanceTo(F.jointPoint(P, 'head'));
  } else {
    // night bus: seat by the window (window plane at x = -0.62 in bus coords), head leaning on the glass
    const winX = -0.62;
    const P = F.figure({ kind: 'beech', seed: 5, rotY: 0, pose: { lHip: [-88, 0, 6], rHip: [-88, 0, -6], lKnee: [92, 0, 0], rKnee: [92, 0, 0], chest: [6, 0, -6], head: [4, -10, 22], lShoulder: [-20, 0, 4], lElbow: [-60, 0, 0], rShoulder: [-30, 0, -8], rElbow: [-70, 0, 0] } });
    P.group.position.set(-0.28, 0, 0); F.seatFig(P, 0.48); P.group.updateMatrixWorld(true);
    // slide so the temple touches the glass
    const temple = F.jointPoint(P, 'head', [-0.1, 0.13, 0]); P.group.position.x += (winX + 0.01) - temple.x; P.group.updateMatrixWorld(true);
    scene.add(P.group);
    // glass + rain
    const glass = PR.mesh(new THREE.PlaneGeometry(2.4, 1.0), new THREE.MeshPhysicalMaterial({ color: 0x0c1418, roughness: 0.08, transparent: true, opacity: 0.18, envMapIntensity: 1.0 }), [winX, 1.28, 0.2], [0, Math.PI / 2, 0], false, false); scene.add(glass);
    const rt = rainTex({ seed: 4 });
    const rain = PR.mesh(new THREE.PlaneGeometry(2.4, 1.0), new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, color: new THREE.Color(1, 1, 1).multiplyScalar(1.6) }), [winX - 0.004, 1.28, 0.2], [0, Math.PI / 2, 0], false, false); scene.add(rain);
    // window frame, wall panels, seats, pole
    const frameM = new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.5, metalness: 0.4 });
    scene.add(PR.mesh(new THREE.BoxGeometry(0.08, 0.06, 2.6), frameM, [winX + 0.02, 0.77, 0.2])); scene.add(PR.mesh(new THREE.BoxGeometry(0.08, 0.06, 2.6), frameM, [winX + 0.02, 1.8, 0.2]));
    scene.add(PR.mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), frameM, [winX + 0.02, 1.28, -0.98])); scene.add(PR.mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), frameM, [winX + 0.02, 1.28, 1.35]));
    scene.add(PR.mesh(new THREE.BoxGeometry(0.1, 0.78, 3.0), new THREE.MeshStandardMaterial({ color: 0x3a4248, roughness: 0.7 }), [winX + 0.04, 0.39, 0.2]));
    scene.add(PR.mesh(new THREE.BoxGeometry(0.1, 1.0, 3.0), new THREE.MeshStandardMaterial({ color: 0x3a4248, roughness: 0.7 }), [winX + 0.04, 2.3, 0.2]));
    const fab = MT.fabric({ base: [60, 80, 110], seed: 8, weave: 120 });
    const seatMat = MT.texMat({ map: fab.map, bump: fab.bump, bumpScale: 1.0, roughness: 0.95, repeat: [2, 2] });
    for (const z of [-0.05, -0.95, 0.85]) { scene.add(PR.mesh(PR.rbox(0.95, 0.12, 0.46, 0.04), seatMat, [-0.15, 0.44, z + 0.05])); scene.add(PR.mesh(PR.rbox(0.95, 0.72, 0.1, 0.04), seatMat, [-0.15, 0.82, z - 0.22], [-0.12, 0, 0])); }
    scene.add(PR.mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0xd8b020, roughness: 0.35, metalness: 0.3 }), [0.42, 1.2, 0.7]));
    // outside: street lights & traffic, heavily defocused
    scene.add(MD.lightPoints({ count: 140, box: [[-14, 0.3, -12], [-3, 4.5, 14]], intensity: 12, seed: 17, size: [0.05, 0.14], colors: [[1, 0.65, 0.3], [1, 0.12, 0.08], [0.5, 0.75, 1.0], [1, 0.9, 0.6], [0.3, 1.0, 0.75]] }));
    scene.add(PR.mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.03, 0.05) }), [-20, 5, 0], [0, Math.PI / 2, 0], false, false));
    // interior light: cold strip above, dim
    const strip = new THREE.RectAreaLight(new THREE.Color(0.7, 0.95, 0.9), 3, 0.1, 2.5); strip.position.set(0.2, 2.25, 0.2); strip.lookAt(0.2, 0, 0.2); scene.add(strip);
    const passing = new THREE.PointLight(new THREE.Color(1.0, 0.62, 0.3), 1.2, 0, 2); passing.position.set(-2.4, 1.8, 1.4); scene.add(passing);
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.35, 0.5, 0.6), new THREE.Color(0.05, 0.05, 0.06), 0.35));
    scene.environment = C.gradientEnv(renderer, { top: [0.05, 0.07, 0.08], horizon: [0.05, 0.06, 0.08], bottom: [0.01, 0.01, 0.012], panels: [{ pos: [-5, 1.5, 0], w: 6, h: 3, color: [0.6, 0.5, 0.4], intensity: 0.6 }] }); scene.environmentIntensity = 0.4;
    const headP = F.jointPoint(P, 'head', [0, 0.14, 0.05]);
    cam = C.makeCamera(q, { pos: [0.42, 1.44, 1.3], look: [winX + 0.05, 1.3, -0.25], fov: 30 }, w, h);
    focus = cam.position.distanceTo(headP);
  }
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : (v === 'a' ? 2.8 : 1.6), dofScale: v === 'a' ? 1.0 : 2.0, seed: 3,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: 'modern', gradeOverride: v === 'a' ? { saturation: 0.72, contrast: 0.5, lift: [0.0, 0.01, 0.008] } : undefined,
    bloom: v === 'a' ? { strength: 0.12, radius: 0.6, threshold: 1.6 } : { strength: 0.3, radius: 0.75, threshold: 1.3 },
    streak: v === 'a' ? null : { threshold: 2.5, strength: 0.25, tint: [0.35, 0.8, 0.9] },
  });
}
