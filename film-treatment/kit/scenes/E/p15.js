// P15 THE NEW WORLD (and hero-2) — evening sun in a timber-and-glass courtyard: long table, kids playing, a tram passing, solar roofs.
// v=day (default) or v=night (P16-a: fire pit, string lights, windows lit).
import * as THREE from 'three';
import * as C from './lib/cine.js';
import * as PR from './lib/props.js';
import * as S from './lib/sets.js';
import * as CO from './lib/court.js';

export default async function ({ w, h, q }) {
  const v = q.get('v') || 'day';
  const night = v === 'night';
  const prev = q.get('prev') === '1';
  const samples = +(q.get('s') || (prev ? 1 : 40));
  const renderer = C.createRenderer(w, h);
  const scene = new THREE.Scene();
  const hero = v === 'hero';
  const court = CO.courtyard(scene, renderer, { night, firePit: night, seed: 7, heroPhone: hero, noServer: hero, crossTram: hero, pv: !hero && !night });
  const lights = [...court.lights];
  if (!night) {
    const sunDir = hero ? new THREE.Vector3(-0.97, +(q.get('se') || 0.2), -0.02).normalize() : new THREE.Vector3(-0.9, 0.2, -0.38).normalize();
    scene.add(PR.daySky({ zenith: hero ? [0.1, 0.15, 0.3] : [0.22, 0.34, 0.62], horizon: hero ? [1.05, 0.52, 0.24] : [1.5, 0.95, 0.55], ground: [0.3, 0.24, 0.16], sunDir: sunDir.toArray(), sunColor: [40, 26, 12], glow: hero ? [2.4, 1.1, 0.35] : [2.2, 1.2, 0.5], glowPow: hero ? 9 : 7 }));
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.7, 0.42), 9); sun.position.copy(sunDir.clone().multiplyScalar(60)); sun.target.position.set(0, 0, -2); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 5, far: 140 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.5, 0.6, 0.9), new THREE.Color(0.45, 0.34, 0.22), 0.35));
    scene.fog = new THREE.FogExp2(new THREE.Color(1.0, 0.66, 0.38).multiplyScalar(0.6), hero ? 0.006 : 0.005);
    scene.environment = C.gradientEnv(renderer, { top: [0.3, 0.42, 0.75], horizon: [1.1, 0.8, 0.55], bottom: [0.3, 0.25, 0.18], panels: [{ pos: [sunDir.x * 10, sunDir.y * 10 + 0.5, sunDir.z * 10], w: 3, h: 2, color: [1, 0.75, 0.45], intensity: 6 }] });
    scene.environmentIntensity = 0.35;
  } else {
    scene.add(PR.nightSky({ radius: 200, stars: 1200, starI: 1.0, top: [0.004, 0.008, 0.02], horizon: [0.02, 0.03, 0.06] }));
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.15, 0.2, 0.35), new THREE.Color(0.05, 0.04, 0.03), 0.35));
    // warm pools from the string lights (a few point lights along the strings)
    court.bulbs.filter((_, i) => i % 6 === 0).forEach(p => { const L = new THREE.PointLight(new THREE.Color(1.0, 0.7, 0.4), 1.6, 0, 2); L.position.copy(p).add(new THREE.Vector3(0, -0.1, 0)); scene.add(L); });
    scene.environment = C.gradientEnv(renderer, { top: [0.01, 0.015, 0.03], horizon: [0.03, 0.03, 0.04], bottom: [0.03, 0.02, 0.01], panels: [{ pos: [4, 0.5, 3], w: 2, h: 2, color: [1, 0.5, 0.2], intensity: 2 }] });
    scene.environmentIntensity = 0.35;
  }
  const def = night ? { pos: [9.5, 2.1, 10.5], look: [3.4, 0.9, 2.6], fov: 30 } : { pos: [6.4, 6.6, 10.6], look: [-1.0, 1.6, -5.5], fov: 36 };
  let cam, focusPt;
  if (hero) {
    const tg = court.tg; tg.updateMatrixWorld(true);
    const L = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(tg.matrixWorld);
    const cp = q.get('hc') ? q.get('hc').split(',').map(Number) : [4.75, 1.18, 0.05], lp = q.get('hl') ? q.get('hl').split(',').map(Number) : [-3.4, 0.98, -0.05];
    cam = new THREE.PerspectiveCamera(+(q.get('fov') || 28), w / h, 0.05, 400); cam.position.copy(L(...cp)); cam.lookAt(L(...lp));
    focusPt = L(3.3, court.tableY, 0.05);
  } else {
    cam = C.makeCamera(q, def, w, h);
    focusPt = night ? new THREE.Vector3(3.8, 1.0, 3.2) : court.tableC.clone().add(new THREE.Vector3(0, 1, 0));
  }
  const focus = cam.position.distanceTo(focusPt);
  await C.renderShot(renderer, scene, cam, {
    w, h, samples, focus, fstop: prev ? 1e9 : (night ? 2.0 : (v === 'hero' ? 2.0 : 4.0)), dofScale: 1.0, seed: 15,
    onSample: (i, N, rng) => S.jitterLights(lights, rng),
    grade: night ? 'fire' : 'newworld', gradeOverride: night ? undefined : { contrast: hero ? 0.45 : 0.46, saturation: 1.12, exposure: hero ? 0.85 : 0.9 },
    bloom: night ? { strength: 0.35, radius: 0.75, threshold: 1.0 } : { strength: 0.14, radius: 0.7, threshold: 2.2 },
    streak: night ? { threshold: 3.0, strength: 0.15, tint: [1.0, 0.6, 0.35] } : null,
  });
}
