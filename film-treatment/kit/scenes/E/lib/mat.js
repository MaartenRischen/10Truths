// Procedural textures and materials for Direction E sets.
import * as THREE from 'three';
import { mulberry32 } from './cine.js';

// ---------- noise ----------
export function makeNoise(seed = 1) {
  const rng = mulberry32(seed);
  const P = new Uint8Array(512); const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const G = new Float32Array(256); for (let i = 0; i < 256; i++) G[i] = rng();
  const fade = t => t * t * (3 - 2 * t);
  function v2(x, y, wrap = 0) {
    let xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
    let x1 = xi + 1, y1 = yi + 1;
    if (wrap) { xi = ((xi % wrap) + wrap) % wrap; yi = ((yi % wrap) + wrap) % wrap; x1 = ((x1 % wrap) + wrap) % wrap; y1 = ((y1 % wrap) + wrap) % wrap; }
    const a = G[P[(P[xi & 255] + yi) & 511] & 255], b = G[P[(P[x1 & 255] + yi) & 511] & 255];
    const c = G[P[(P[xi & 255] + y1) & 511] & 255], d = G[P[(P[x1 & 255] + y1) & 511] & 255];
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 5, wrap = 0) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * v2(x * f, y * f, wrap ? wrap * f : 0); n += a; a *= 0.5; f *= 2; } return s / n; }
  return { v2, fbm, rng };
}

export function canvasTexture(size, fn, { srgb = true, repeat = [1, 1], wrap = true, h } = {}) {
  const W = size, H = h || size;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const img = g.createImageData(W, H); const d = img.data;
  const out = [0, 0, 0, 255];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    out[3] = 255; fn(x / W, y / H, out, x, y);
    const i = (y * W + x) * 4; d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; d[i + 3] = out[3];
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 8;
  return t;
}
export function drawTexture(W, H, draw, { srgb = true, wrap = false } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); draw(g, W, H);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = x => Math.max(0, Math.min(1, x));

// ---------- surfaces ----------
// Cotton / linen: fine weave + soft mottling. returns {map, bump}
export function fabric({ base = [225, 228, 232], var: vr = 10, seed = 3, size = 512, weave = 180 } = {}) {
  const N = makeNoise(seed);
  const map = canvasTexture(size, (u, v, o) => {
    const n = N.fbm(u * 6, v * 6, 4, 6) - 0.5; const w = (Math.sin(u * weave * Math.PI * 2) * Math.sin(v * weave * Math.PI * 2)) * 0.5;
    const k = n * vr + w * 3;
    o[0] = base[0] + k; o[1] = base[1] + k; o[2] = base[2] + k;
  });
  const bump = canvasTexture(size, (u, v, o) => {
    const w = 0.5 + 0.25 * Math.sin(u * weave * Math.PI * 2) + 0.25 * Math.sin(v * weave * Math.PI * 2);
    const n = N.fbm(u * 3, v * 3, 3, 3);
    const k = 128 + (w - 0.5) * 60 + (n - 0.5) * 80; o[0] = o[1] = o[2] = k;
  }, { srgb: false });
  return { map, bump };
}

// Painted plaster wall
export function plaster({ base = [200, 204, 206], seed = 5, size = 512, amp = 10 } = {}) {
  const N = makeNoise(seed);
  const map = canvasTexture(size, (u, v, o) => {
    const n = N.fbm(u * 8, v * 8, 5, 8) - 0.5; const k = n * amp;
    o[0] = base[0] + k; o[1] = base[1] + k; o[2] = base[2] + k;
  });
  const bump = canvasTexture(size, (u, v, o) => { const n = N.fbm(u * 40, v * 40, 3, 40); o[0] = o[1] = o[2] = 128 + (n - 0.5) * 90; }, { srgb: false });
  return { map, bump };
}

// Wood planks (floor / furniture). u across planks, v along
export function planks({ base = [150, 112, 78], dark = [98, 70, 48], planksAcross = 6, seed = 9, size = 1024, gap = 0.012 } = {}) {
  const N = makeNoise(seed); const rng = mulberry32(seed + 1);
  const offs = [...Array(64)].map(() => [rng(), rng() * 0.25 - 0.12, rng()]);
  const map = canvasTexture(size, (u, v, o) => {
    const pu = u * planksAcross; const pi = Math.floor(pu); const f = pu - pi; const off = offs[pi % 64];
    const vv = v + off[0];
    const seg = Math.floor(vv * 2); const segOff = offs[(pi * 7 + seg * 13) % 64];
    const grain = N.fbm(f * 3 + segOff[0] * 10, vv * 40 + segOff[2] * 20, 3);
    const rings = Math.pow(0.5 + 0.5 * Math.sin((f * 8 + grain * 5 + segOff[0] * 20) * Math.PI), 4);
    let t = clamp01(rings * 0.5 + (grain - 0.5) * 0.8 + 0.25 + segOff[1]);
    let r = mix(base[0], dark[0], t), g = mix(base[1], dark[1], t), b = mix(base[2], dark[2], t);
    const edge = (f < gap || f > 1 - gap || ((vv * 2) % 1) < gap * 0.6) ? 0.45 : 1;
    o[0] = r * edge; o[1] = g * edge; o[2] = b * edge;
  });
  const rough = canvasTexture(size, (u, v, o) => { const n = N.fbm(u * 20, v * 5, 3); o[0] = o[1] = o[2] = 120 + n * 80; }, { srgb: false });
  return { map, rough };
}

// Square tiles with grout (bathroom)
export function tiles({ base = [214, 220, 218], grout = [150, 152, 150], n = 8, seed = 11, size = 1024, groutW = 0.035 } = {}) {
  const N = makeNoise(seed); const rng = mulberry32(seed);
  const tv = [...Array(n * n)].map(() => rng() * 10 - 5);
  const map = canvasTexture(size, (u, v, o) => {
    const x = u * n, y = v * n; const ix = Math.floor(x), iy = Math.floor(y); const fx = x - ix, fy = y - iy;
    const isG = fx < groutW || fy < groutW;
    const nn = (N.fbm(u * 20, v * 20, 3) - 0.5) * 8;
    if (isG) { o[0] = grout[0] + nn; o[1] = grout[1] + nn; o[2] = grout[2] + nn; }
    else { const k = tv[(iy * n + ix) % tv.length] + nn * 0.5; o[0] = base[0] + k; o[1] = base[1] + k; o[2] = base[2] + k; }
  });
  const bump = canvasTexture(size, (u, v, o) => {
    const x = u * n, y = v * n; const fx = x - Math.floor(x), fy = y - Math.floor(y);
    const e = Math.min(fx, fy, 1 - fx, 1 - fy); const k = e < groutW ? 60 : 60 + Math.min(1, (e - groutW) / 0.03) * 140; o[0] = o[1] = o[2] = k;
  }, { srgb: false });
  return { map, bump };
}

// Concrete / asphalt
export function concrete({ base = [120, 122, 124], amp = 30, seed = 13, size = 512, speck = 0.08 } = {}) {
  const N = makeNoise(seed); const rng = mulberry32(seed);
  const map = canvasTexture(size, (u, v, o) => {
    const n = N.fbm(u * 6, v * 6, 5, 6) - 0.5; const s = rng() < speck ? (rng() - 0.5) * 40 : 0;
    const k = n * amp + s; o[0] = base[0] + k; o[1] = base[1] + k; o[2] = base[2] + k;
  });
  const bump = canvasTexture(size, (u, v, o) => { const n = N.fbm(u * 30, v * 30, 3, 30); o[0] = o[1] = o[2] = 128 + (n - 0.5) * 120; }, { srgb: false });
  return { map, bump };
}

// Packed earth with pebbles
export function earth({ base = [120, 92, 66], dark = [70, 52, 38], seed = 17, size = 1024 } = {}) {
  const N = makeNoise(seed); const rng = mulberry32(seed);
  const peb = [...Array(900)].map(() => [rng(), rng(), 0.002 + rng() * 0.006, rng()]);
  const cells = new Map(); for (const p of peb) { const k = Math.floor(p[0] * 32) + Math.floor(p[1] * 32) * 32; if (!cells.has(k)) cells.set(k, []); cells.get(k).push(p); }
  const map = canvasTexture(size, (u, v, o) => {
    const n = N.fbm(u * 5, v * 5, 5, 5), n2 = N.fbm(u * 40, v * 40, 3, 40);
    let t = clamp01(n * 1.2 - 0.1 + (n2 - 0.5) * 0.4);
    let r = mix(base[0], dark[0], t), g = mix(base[1], dark[1], t), b = mix(base[2], dark[2], t);
    const k = Math.floor(u * 32) + Math.floor(v * 32) * 32; const list = cells.get(k);
    if (list) for (const p of list) { const dx = u - p[0], dy = v - p[1]; if (dx * dx + dy * dy < p[2] * p[2]) { const s = 0.75 + p[3] * 0.35; r = mix(r, 128 * s, 0.6); g = mix(g, 116 * s, 0.6); b = mix(b, 100 * s, 0.6); } }
    o[0] = r; o[1] = g; o[2] = b;
  });
  const bump = canvasTexture(size, (u, v, o) => { const n = N.fbm(u * 24, v * 24, 4, 24); o[0] = o[1] = o[2] = 128 + (n - 0.5) * 150; }, { srgb: false });
  return { map, bump };
}

// Thatch / reeds: many fine strands along v
export function thatch({ base = [168, 132, 80], dark = [92, 68, 40], seed = 19, size = 1024, strands = 160 } = {}) {
  const N = makeNoise(seed); const rng = mulberry32(seed);
  const sv = [...Array(4096)].map(() => rng());
  const map = canvasTexture(size, (u, v, o) => {
    const x = u * strands + N.v2(v * 6, u * 3) * 1.5; const i = Math.floor(x); const f = x - i;
    const s = sv[(i & 4095)];
    const layer = Math.floor(v * 10 + sv[(i * 3) & 4095] * 0.8); const lf = (v * 10 + sv[(i * 3) & 4095] * 0.8) - layer;
    const edgeShade = 1 - Math.pow(Math.abs(f - 0.5) * 2, 3) * 0.55;
    const tip = lf > 0.85 ? 0.65 : 1; // overlapping bundle bands
    const t = clamp01(s * 0.7 + (N.fbm(u * 8, v * 8, 3) - 0.5) * 0.8 + (1 - edgeShade));
    const k = edgeShade * tip;
    o[0] = mix(base[0], dark[0], t) * k; o[1] = mix(base[1], dark[1], t) * k; o[2] = mix(base[2], dark[2], t) * k;
  });
  const bump = canvasTexture(size, (u, v, o) => {
    const x = u * strands + N.v2(v * 6, u * 3) * 1.5; const f = x - Math.floor(x);
    const lf = (v * 10 + sv[(Math.floor(x) * 3) & 4095] * 0.8) % 1;
    o[0] = o[1] = o[2] = 70 + (1 - Math.pow(Math.abs(f - 0.5) * 2, 2)) * 150 * (lf > 0.85 ? 0.6 : 1);
  }, { srgb: false });
  return { map, bump };
}

// Fur-ish hide
export function hide({ base = [150, 112, 74], dark = [80, 56, 36], seed = 23, size = 512 } = {}) {
  const N = makeNoise(seed);
  const map = canvasTexture(size, (u, v, o) => {
    const n = N.fbm(u * 8, v * 8, 5, 8), f = N.fbm(u * 120, v * 30, 2, 0);
    const t = clamp01(n * 1.3 - 0.2 + (f - 0.5) * 0.5);
    o[0] = mix(base[0], dark[0], t); o[1] = mix(base[1], dark[1], t); o[2] = mix(base[2], dark[2], t);
  });
  const bump = canvasTexture(size, (u, v, o) => { const f = N.fbm(u * 160, v * 40, 2, 0); o[0] = o[1] = o[2] = 60 + f * 160; }, { srgb: false });
  return { map, bump };
}

// ---------- materials ----------
export function stdMat(opts = {}) { return new THREE.MeshStandardMaterial(opts); }
export function texMat({ map, bump, rough, roughness = 0.8, bumpScale = 1, repeat = [1, 1], color, metalness = 0, envMapIntensity = 1 } = {}) {
  for (const t of [map, bump, rough]) if (t) t.repeat.set(...repeat);
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale, roughnessMap: rough, roughness, color: color ?? 0xffffff, metalness, envMapIntensity });
}
export function emissiveMat(color, intensity = 1, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(...color).multiplyScalar(intensity), ...opts });
}

// Flame sprite texture (white-yellow core -> orange -> red edge), alpha in A
export function flameTexture(seed = 1, W = 128, H = 256) {
  const N = makeNoise(seed);
  return canvasTexture(W, (u, v, o) => {
    const y = 1 - v; // 0 bottom .. 1 top
    const x = (u - 0.5) * 2;
    const wob = (N.fbm(y * 3 + seed, 0.5, 3) - 0.5) * 0.5 * y;
    const width = 0.62 * Math.pow(Math.max(0, 1 - y), 0.75) * (0.8 + 0.4 * Math.sin(y * 3.1)) * (y < 0.12 ? 0.6 + y / 0.12 * 0.4 : 1);
    const d = Math.abs(x - wob) / Math.max(1e-3, width);
    const turb = N.fbm(u * 4 + seed * 3, y * 5 - seed, 4);
    let a = clamp01((1 - d) * 1.8) * clamp01((1 - y) * 1.6) * (0.55 + turb * 0.7);
    a = clamp01(a);
    const core = clamp01((1 - d * 1.6) * (1 - y * 1.4));
    // colour: deep red -> orange -> yellow -> white core
    const r = 255, g = 90 + 150 * clamp01(a * 1.2) + 20 * core, b = 20 + 60 * core * core + 120 * Math.pow(core, 4);
    o[0] = r; o[1] = Math.min(255, g); o[2] = Math.min(255, b); o[3] = a * 255;
  }, { h: H, wrap: false });
}

// Soft radial blob (for contact shadows / glows), white RGB with alpha falloff
export function blobTexture(size = 128, pow = 2) {
  return canvasTexture(size, (u, v, o) => { const dx = u - 0.5, dy = v - 0.5; const r = Math.sqrt(dx * dx + dy * dy) * 2; const a = Math.pow(clamp01(1 - r), pow); o[0] = o[1] = o[2] = 255; o[3] = a * 255; }, { srgb: false, wrap: false });
}

// contact shadow decal (dark, multiply-like via alpha)
export function contactShadow(w, d, opacity = 0.6, pow = 1.6) {
  const tex = blobTexture(128, pow);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
  return m;
}

// additive glow sprite (e.g. haze around a fire or lamp)
export function glowSprite(color, intensity, size, pow = 2.2) {
  const tex = blobTexture(128, pow);
  const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(...color).multiplyScalar(intensity), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const s = new THREE.Sprite(mat); s.scale.set(size, size, 1); return s;
}

// Volumetric-looking light shaft: a box from a window along a direction; additive, soft edges, optional stripe cookie
export function lightShaft({ width = 1, height = 1, length = 4, color = [0.5, 0.7, 1], intensity = 0.2, stripes = 0, stripeDuty = 0.55, falloff = 1.0, noise = 0.3, seed = 1 } = {}) {
  const geo = new THREE.BoxGeometry(width, height, length, 1, 1, 1); geo.translate(0, 0, length / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Vector3(...color).multiplyScalar(intensity) }, dims: { value: new THREE.Vector3(width, height, length) }, stripes: { value: stripes }, duty: { value: stripeDuty }, falloff: { value: falloff }, noiseAmt: { value: noise }, seed: { value: seed } },
    vertexShader: `varying vec3 vL; varying vec3 vN; varying vec3 vV; void main(){ vL = position; vec4 wp = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 color, dims; uniform float stripes, duty, falloff, noiseAmt, seed; varying vec3 vL; varying vec3 vN; varying vec3 vV;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec3 q = vL / dims; // x,y in [-.5,.5], z in [0,1]
        float ex = 1.0 - smoothstep(0.25, 0.5, abs(q.x)); float ey = 1.0 - smoothstep(0.25, 0.5, abs(q.y));
        float along = pow(1.0 - clamp(q.z,0.,1.), falloff) * smoothstep(0.0, 0.06, q.z);
        float st = 1.0; if (stripes > 0.5) { float s = fract(q.y*stripes); st = smoothstep(duty-0.12, duty, s) * (1.0 - smoothstep(0.96, 1.0, s)) ; st = 0.25 + 0.75*st; }
        float nz = 1.0 - noiseAmt + noiseAmt*vn(vec2(q.x*6.0+seed, q.z*5.0+q.y*3.0));
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float a = ex*ey*along*st*nz*(0.35+0.65*facing);
        gl_FragColor = vec4(color*a, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}
