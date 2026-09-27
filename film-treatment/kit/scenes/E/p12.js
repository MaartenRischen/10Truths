// P12 ON PURPOSE — (a) a glass office at night: manikins watching a wall of dashboards.
// (b) on one screen, our manikin at its kitchen table (the P10 frame), seen as a data point.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as C from './lib/cine.js';
import * as MT from './lib/mat.js';
import * as PR from './lib/props.js';
import * as F from './lib/figs.js';
import * as S from './lib/sets.js';
import * as MD from './lib/modern.js';
import * as UI from './lib/ui.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mulberry32 } from './lib/cine.js';

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'a';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 40));
  RectAreaLightUniformsLib.init();
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const lights = [];
  // video wall: 5 x 3 screens on the wall z = 0, centred x = 0, bottom at y = 0.6
  const sw = 1.6, sh = 0.9, gap = 0.03, cols = 5, rows = 3, y0 = 0.62;
  const kitchen = await loadImg('/scenes/E/tmp/p10a_src.png').catch(() => null);
  const dpTex = kitchen ? UI.dataPointTex(kitchen, { box: [0.38, 0.16, 0.2, 0.62] }) : UI.dashTex(99, 0);
  const special = [3, 1]; // column, row of the data-point screen
  const bezel = new THREE.MeshStandardMaterial({ color: 0x07090b, roughness: 0.4 });
  scene.add(PR.mesh(new THREE.BoxGeometry(cols * (sw + gap) + 0.1, rows * (sh + gap) + 0.1, 0.08), bezel, [0, y0 + rows * (sh + gap) / 2, -0.05]));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = (c - (cols - 1) / 2) * (sw + gap), y = y0 + (r + 0.5) * (sh + gap);
    const isSp = c === special[0] && r === special[1];
    const tex = isSp ? dpTex : UI.dashTex(r * 7 + c * 3 + 1);
    const m = PR.mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1, 1, 1).multiplyScalar(isSp ? 1.5 : 1.3) }), [x, y, 0.0], [0, 0, 0], false, false); scene.add(m);
    const ra = new THREE.RectAreaLight(isSp ? new THREE.Color(0.8, 0.85, 0.8) : new THREE.Color(0.45, 0.8, 0.9), 1.2, sw, sh); ra.position.set(x, y, 0.02); ra.lookAt(x, y, 5); scene.add(ra);
  }
  const spPos = new THREE.Vector3((special[0] - (cols - 1) / 2) * (sw + gap), y0 + (special[1] + 0.5) * (sh + gap), 0);
  // room: glossy dark floor, glass walls with city behind, ceiling
  scene.add(PR.mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 1.0, metalness: 0.0, envMapIntensity: 0.0 }), [0, 0, 5], [-Math.PI / 2, 0, 0], false, true));
  { const rf = new Reflector(new THREE.PlaneGeometry(14, 9), { textureWidth: Math.round(w * 0.75), textureHeight: Math.round(w * 0.75 * 9 / 14), color: 0x2c3034, clipBias: 0.003 }); rf.rotation.x = -Math.PI / 2; rf.position.set(0, 0.003, 4.2); scene.add(rf); }
  scene.add(PR.mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.9 }), [0, 3.6, 5], [Math.PI / 2, 0, 0], false, true));
  const mull = []; for (let i = -6; i <= 6; i++) { mull.push(new THREE.BoxGeometry(0.05, 3.6, 0.05).translate(-5.2, 1.8, 2 + i * 1.2), new THREE.BoxGeometry(0.05, 3.6, 0.05).translate(5.2, 1.8, 2 + i * 1.2)); }
  scene.add(new THREE.Mesh(mergeGeometries(mull), new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.4, metalness: 0.6 })));
  scene.add(MD.city({ center: [-50, -10, 10], spread: [30, 100], count: 40, seed: 12, emissive: 0.7, litFrac: 0.25 }));
  scene.add(MD.city({ center: [50, -10, 10], spread: [30, 100], count: 40, seed: 13, emissive: 0.7, litFrac: 0.25 }));
  // watchers: three manikins standing, backs to camera, in the screen light
  const watchers = [[-1.2, 2.3, 'oak', 11, 8], [0.25, 2.0, 'walnut', 12, -4], [1.55, 2.5, 'ash', 13, -12]];
  for (const [x, z, kind, sd, ry] of watchers) {
    const f = F.figure({ kind, seed: sd, rotY: 180 + ry, pose: { head: [-6, (sd % 2 ? 10 : -8), 0], lShoulder: [-10, 0, 8], rShoulder: [-10, 0, -8], lElbow: [-30, 0, 0], rElbow: [-30, 0, 0], chest: [-2, 0, 0] } });
    f.group.position.set(x, 0, z); F.groundFig(f, 0); scene.add(f.group);
  }
  scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.02], horizon: [0.02, 0.03, 0.04], bottom: [0.005, 0.005, 0.006], panels: [{ pos: [0, 1.5, -6], w: 8, h: 3, color: [0.4, 0.8, 0.9], intensity: 1.5 }] });
  scene.environmentIntensity = 0.5;
  let cam, focus;
  if (v === 'a') {
    cam = C.makeCamera(q, { pos: [0.4, 1.05, 7.4], look: [0.1, 1.55, 0], fov: 30 }, w, h);
    focus = cam.position.distanceTo(new THREE.Vector3(0.25, 1.6, 2.0));
  } else {
    // push in on the data-point screen, a watcher's shoulder soft in the foreground
    cam = C.makeCamera(q, { pos: [spPos.x - 0.45, spPos.y - 0.05, 1.55], look: [spPos.x + 0.06, spPos.y, 0], fov: 30 }, w, h);
    const f = F.figure({ kind: 'walnut', seed: 12, rotY: 190, pose: { head: [-4, 0, 0] } }); f.group.position.set(spPos.x - 0.75, 0, 1.15); F.groundFig(f, 0); scene.add(f.group);
    focus = cam.position.distanceTo(spPos);
  }
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : 2.0, dofScale: 1.4, seed: 12,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: 'modern',
    bloom: { strength: 0.35, radius: 0.75, threshold: 1.0 },
    streak: { threshold: 2.5, strength: 0.2, tint: [0.35, 0.8, 0.9] },
  });
}
