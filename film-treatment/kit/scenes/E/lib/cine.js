// Direction E — "Match Cut": cinematic accumulation renderer for three.js (SwiftShader-friendly).
// Every frame = N jittered renders averaged in float:
//   * thin-lens depth of field with an anamorphic (tall oval) aperture  -> real oval bokeh, correct occlusion
//   * sub-pixel jitter -> anti-aliasing
//   * per-sample light jitter (callback) -> soft area shadows, flicker
// then: bloom tinted toward red at wide radii (film halation), anamorphic horizontal streaks,
// and a finish pass (AgX tone map, lateral CA, lens vignette, split-tone grade, film grain).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const UNIT = 2.0 / 1.75; // scene units per metre (manikin 2.0 units ~ 1.75 m person)
export const m = (x) => x * UNIT;

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }

export function createRenderer(w, h) {
  const r = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  r.setPixelRatio(1); r.setSize(w, h);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
  r.toneMapping = THREE.NoToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(r.domElement);
  return r;
}

// Environment from a gradient sphere + emissive panels (for reflections / IBL fill)
export function gradientEnv(renderer, { top = [0.02, 0.03, 0.05], horizon = [0.05, 0.05, 0.05], bottom = [0.01, 0.01, 0.01], panels = [], sigma = 0.04, size = 256 } = {}) {
  const s = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Vector3(...top) }, hor: { value: new THREE.Vector3(...horizon) }, bot: { value: new THREE.Vector3(...bottom) } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top,hor,bot; varying vec3 vP; void main(){ float y=vP.y; vec3 c = y>0. ? mix(hor,top,pow(y,0.6)) : mix(hor,bot,pow(-y,0.5)); gl_FragColor=vec4(c,1.); }`,
  });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), mat));
  for (const p of panels) {
    const c = new THREE.Color(...p.color).multiplyScalar(p.intensity ?? 1);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(p.w ?? 4, p.h ?? 4), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    pm.position.set(...p.pos); pm.lookAt(0, 0, 0); s.add(pm);
  }
  const gen = new THREE.PMREMGenerator(renderer);
  const tex = gen.fromScene(s, sigma, 0.1, 100, { size }).texture;
  gen.dispose();
  return tex;
}

// Environment captured from the real set (emissive practicals show up in reflections)
export function sceneEnv(renderer, scene, position, sigma = 0.03, near = 0.05, far = 200) {
  const gen = new THREE.PMREMGenerator(renderer);
  const tex = gen.fromScene(scene, sigma, near, far, { size: 256, position }).texture;
  gen.dispose();
  return tex;
}

const QUAD_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

// ---------------------------------------------------------------- accumulation
function applyJitter(cam, base, lx, ly, px, py, focus, w, h) {
  cam.position.copy(base.position); cam.quaternion.copy(base.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(base.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(base.quaternion);
  cam.position.addScaledVector(right, lx).addScaledVector(up, ly);
  cam.updateMatrixWorld(true);
  const near = base.near, far = base.far;
  const top = near * Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * base.fov) / base.zoom;
  const height = 2 * top, width = base.aspect * height;
  let left = -0.5 * width;
  // optional shift lens (base.userData.shift = [sx, sy] as fraction of frame)
  const sh = base.userData.shift || [0, 0];
  left += sh[0] * width; const topS = top + sh[1] * height;
  const sx = -lx * near / focus + px * width / w;
  const sy = -ly * near / focus + py * height / h;
  cam.projectionMatrix.makePerspective(left + sx, left + width + sx, topS + sy, topS - height + sy, near, far);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}

export function lensCamera(fovV, aspect, near = 0.05, far = 400) {
  const c = new THREE.PerspectiveCamera(fovV, aspect, near, far);
  return c;
}
// vertical FOV from a focal length on a 2.39:1 frame (Super35 anamorphic ~ 21.95 mm image height)
export function fovFromFocal(mm, imageHeightMM = 21.95 / 2.0 * 1.0) {
  // use an 11 mm tall gate (Super35 2.39 extraction ~ 24.9 x 10.4 mm)
  return 2 * Math.atan(10.4 / 2 / mm) * 180 / Math.PI;
}

// focal length in mm from camera vFOV assuming 10.4 mm gate height
function focalFromCam(cam) { return (18.6 / 2) / Math.tan(THREE.MathUtils.DEG2RAD * cam.fov / 2); } // 2x anamorphic on 4-perf: 18.6 mm gate height

export async function accumulate(renderer, scene, camera, o = {}) {
  const w = o.w, h = o.h;
  const N = Math.max(1, o.samples ?? 32);
  const rtS = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true });
  const rtA = [0, 1].map(() => new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }));
  const mat = new THREE.ShaderMaterial({
    uniforms: { tNew: { value: null }, tPrev: { value: null }, k: { value: 1 } },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tNew,tPrev; uniform float k; varying vec2 vUv;
      void main(){ vec4 a = texture2D(tPrev,vUv); vec4 b = texture2D(tNew,vUv); b.rgb = min(b.rgb, vec3(${(o.clampHDR ?? 60).toFixed(1)})); gl_FragColor = mix(a,b,k); }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new FullScreenQuad(mat);
  const cam = camera.clone();
  // aperture radius in world units from focal length and f-stop
  const f = focalFromCam(camera); // mm
  const fstop = o.fstop ?? 2.8;
  const apR = (o.apertureRadius ?? ((f / fstop) / 2 / 1000 * UNIT)) * (o.dofScale ?? 1); // metres->units
  const squeeze = o.anamorph ?? 0.62; // horizontal radius factor (tall oval bokeh)
  const focus = o.focus ?? 3;
  const rng = mulberry32(o.seed ?? 1234);
  const prevAuto = renderer.autoClear;
  renderer.autoClear = true;
  for (let i = 0; i < N; i++) {
    // sub-pixel jitter (tent-ish filter)
    const px = (halton(i + 1, 2) - 0.5) * (o.aa ?? 1.2), py = (halton(i + 1, 3) - 0.5) * (o.aa ?? 1.2);
    // uniform disc sample (concentric via sqrt)
    const r = Math.sqrt(halton(i + 1, 5)), th = 2 * Math.PI * halton(i + 1, 7);
    const dofOn = o.dof !== false && N > 1;
    const lx = dofOn ? Math.cos(th) * r * apR * squeeze : 0, ly = dofOn ? Math.sin(th) * r * apR : 0;
    if (o.onSample) o.onSample(i, N, rng);
    applyJitter(cam, camera, lx, ly, N > 1 ? px : 0, N > 1 ? py : 0, focus, w, h);
    renderer.setRenderTarget(rtS); renderer.clear(); renderer.render(scene, cam);
    if (i === 0) scene.traverse(ob => { if (ob.isLight && ob.castShadow && !ob.userData.jitter) ob.shadow.autoUpdate = false; });
    mat.uniforms.tNew.value = rtS.texture; mat.uniforms.tPrev.value = rtA[i % 2].texture; mat.uniforms.k.value = 1 / (i + 1);
    renderer.setRenderTarget(rtA[(i + 1) % 2]); quad.render(renderer);
    if (i % 4 === 3) await new Promise(res => setTimeout(res, 0));
  }
  renderer.setRenderTarget(null); renderer.autoClear = prevAuto;
  rtS.dispose(); rtA[(N + 1) % 2].dispose(); mat.dispose();
  return rtA[N % 2];
}

// ---------------------------------------------------------------- streak (anamorphic flare)
class StreakPass extends Pass {
  constructor(w, h, { threshold = 2.0, strength = 0.25, tint = [0.35, 0.6, 1.0], passes = 5 } = {}) {
    super();
    this.w2 = Math.max(4, Math.round(w / 2)); this.h2 = Math.max(4, Math.round(h / 2));
    const mk = () => new THREE.WebGLRenderTarget(this.w2, this.h2, { type: THREE.HalfFloatType, depthBuffer: false });
    this.rtBright = mk(); this.rtP = [mk(), mk()]; this.rtSum = mk();
    this.passes = passes; this.strength = strength; this.tint = new THREE.Vector3(...tint);
    this.brightMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, thr: { value: threshold }, px: { value: new THREE.Vector2(1 / w, 1 / h) } }, vertexShader: QUAD_VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float thr; uniform vec2 px; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb*0.5 + texture2D(tDiffuse, vUv+vec2(px.x,0.)).rgb*0.25 + texture2D(tDiffuse, vUv-vec2(px.x,0.)).rgb*0.25;
          float l = max(max(c.r,c.g),c.b); float k = max(l - thr, 0.) / max(l, 1e-4); gl_FragColor = vec4(c*k, 1.); }` });
    this.blurMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, stp: { value: 1 }, px: { value: 1 / this.w2 } }, vertexShader: QUAD_VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float stp; uniform float px; varying vec2 vUv;
        void main(){ vec3 s = vec3(0.); float wsum = 0.;
          for (int i=-6;i<=6;i++){ float fi=float(i); float wt = exp(-abs(fi)*0.45); s += texture2D(tDiffuse, vUv + vec2(fi*stp*px, 0.)).rgb*wt; wsum += wt; }
          gl_FragColor = vec4(s/wsum, 1.); }` });
    this.addMat = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, tB: { value: null }, wb: { value: 1 } }, vertexShader: QUAD_VS,
      fragmentShader: `uniform sampler2D tA,tB; uniform float wb; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tA,vUv).rgb + texture2D(tB,vUv).rgb*wb, 1.); }` });
    this.compMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, tStreak: { value: null }, tint: { value: this.tint }, strength: { value: strength } }, vertexShader: QUAD_VS,
      fragmentShader: `uniform sampler2D tDiffuse,tStreak; uniform vec3 tint; uniform float strength; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tDiffuse,vUv).rgb; vec3 s = texture2D(tStreak,vUv).rgb; float l = dot(s, vec3(0.3,0.5,0.2));
          gl_FragColor = vec4(c + (tint*l*0.8 + s*0.2)*strength, 1.); }` });
    this.q = new FullScreenQuad(null);
  }
  render(renderer, writeBuffer, readBuffer) {
    const q = this.q;
    q.material = this.brightMat; this.brightMat.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.rtBright); renderer.clear(); q.render(renderer);
    let src = this.rtBright; let sumInit = false;
    // clear sum
    q.material = this.addMat;
    let cur = 0; let st = 1;
    // iterative widening blur; accumulate each level into sum
    const levels = [];
    for (let p = 0; p < this.passes; p++) {
      q.material = this.blurMat; this.blurMat.uniforms.tDiffuse.value = src.texture; this.blurMat.uniforms.stp.value = st;
      const dst = this.rtP[cur]; renderer.setRenderTarget(dst); renderer.clear(); q.render(renderer);
      // add to sum (sum = sum + dst*weight)
      q.material = this.addMat;
      if (!sumInit) { this.addMat.uniforms.tA.value = dst.texture; this.addMat.uniforms.tB.value = dst.texture; this.addMat.uniforms.wb.value = 0; renderer.setRenderTarget(this.rtSum); q.render(renderer); sumInit = true; }
      else {
        // ping via temp: rtSum -> rtBright (reuse) then back
        this.addMat.uniforms.tA.value = this.rtSum.texture; this.addMat.uniforms.tB.value = dst.texture; this.addMat.uniforms.wb.value = 1.0;
        renderer.setRenderTarget(this.rtBright); q.render(renderer);
        // swap roles: rtBright now holds sum; copy back into rtSum
        const t = this.rtSum; this.rtSum = this.rtBright; this.rtBright = t;
      }
      src = dst; cur = 1 - cur; st *= 3.2;
    }
    q.material = this.compMat; this.compMat.uniforms.tDiffuse.value = readBuffer.texture; this.compMat.uniforms.tStreak.value = this.rtSum.texture;
    this.compMat.uniforms.strength.value = this.strength / this.passes;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); renderer.clear(); q.render(renderer);
  }
}

// ---------------------------------------------------------------- finish (tone map + grade + film)
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) },
    exposure: { value: 1 }, toneMappingExposure: { value: 1 },
    ca: { value: 0.004 }, vignette: { value: 0.35 },
    lift: { value: new THREE.Vector3(0, 0, 0) }, gammaV: { value: new THREE.Vector3(1, 1, 1) }, gain: { value: new THREE.Vector3(1, 1, 1) },
    shadowTint: { value: new THREE.Vector3(0, 0, 0) }, highTint: { value: new THREE.Vector3(0, 0, 0) },
    contrast: { value: 0.15 }, saturation: { value: 1.0 }, fade: { value: 0.03 }, fadeColor: { value: new THREE.Vector3(0.05, 0.05, 0.05) },
    grain: { value: 0.045 }, grainSize: { value: 1.3 }, seed: { value: 1.0 }, toe: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`

    uniform sampler2D tDiffuse; uniform vec2 res; uniform float exposure; uniform float toneMappingExposure;
    uniform float ca, vignette, contrast, saturation, fade, grain, grainSize, seed, toe;
    uniform vec3 lift, gammaV, gain, shadowTint, highTint, fadeColor;
    varying vec2 vUv;
    // AgX (Filament / three.js implementation)
    vec3 agxDefaultContrastApprox( vec3 x ) { vec3 x2 = x * x; vec3 x4 = x2 * x2;
      return + 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
    vec3 AgX( vec3 color ) {
      const mat3 AgXInsetMatrix = mat3( vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ), vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ), vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ) );
      const mat3 AgXOutsetMatrix = mat3( vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ), vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ), vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 ) );
      const float AgxMinEv = - 12.47393; const float AgxMaxEv = 4.026069;
      const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3( vec3( 1.6605, - 0.1246, - 0.0182 ), vec3( - 0.5876, 1.1329, - 0.1006 ), vec3( - 0.0728, - 0.0083, 1.1187 ) );
      const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3( vec3( 0.6274, 0.0691, 0.0164 ), vec3( 0.3293, 0.9195, 0.0880 ), vec3( 0.0433, 0.0113, 0.8956 ) );
      color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
      color = AgXInsetMatrix * color;
      color = max( color, 1e-10 );
      color = log2( color ); color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv ); color = clamp( color, 0.0, 1.0 );
      color = agxDefaultContrastApprox( color );
      color = AgXOutsetMatrix * color;
      color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
      color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
      return clamp( color, 0.0, 1.0 );
    }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
      return mix(mix(h12(i),h12(i+vec2(1,0)),u.x), mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),u.x), u.y); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - 0.055, step(vec3(0.0031308), c)); }
    void main(){
      vec2 d = vUv - 0.5; float asp = res.x/res.y; vec2 dd = d*vec2(asp,1.); float r2 = dot(dd,dd)/(0.25*asp*asp+0.25);
      vec3 c;
      c.r = texture2D(tDiffuse, 0.5 + d*(1.0 - ca*r2)).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, 0.5 + d*(1.0 + ca*r2)).b;
      c *= exposure;
      // optical falloff (cos^4 - like), stronger in the corners
      c *= mix(1.0, 1.0 - vignette, smoothstep(0.15, 1.1, r2));
      // toe: slightly crush darkest values (in linear)
      c = max(c - toe, 0.0);
      c = AgX(c);
      c = toSRGB(c);
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c += shadowTint*(1.0-smoothstep(0.0,0.5,l)) + highTint*smoothstep(0.45,1.0,l);
      c = pow(max(gain*(c + lift*(1.0-c)), 0.0), 1.0/gammaV);
      c = clamp(c, 0.0, 1.0);
      c = mix(c, c*c*(3.0-2.0*c), contrast);
      l = dot(c, vec3(0.2126,0.7152,0.0722));
      c = mix(vec3(l), c, saturation);
      c = fadeColor*fade + c*(1.0-fade);
      // film grain: clumped value noise + fine hash, strongest in mids
      vec2 gp = gl_FragCoord.xy / grainSize;
      float g1 = vnoise(gp + seed*17.0) - 0.5, g2 = h12(gl_FragCoord.xy + seed*31.0) - 0.5, g3 = vnoise(gp*0.5 + seed*7.0) - 0.5;
      float gn = g1*0.6 + g2*0.5 + g3*0.35;
      float lw = 0.35 + 0.65*(1.0 - pow(abs(l*2.0-1.0), 1.6));
      vec3 gc = vec3(gn) + vec3(vnoise(gp*1.3+3.1)-0.5, vnoise(gp*1.1+9.7)-0.5, vnoise(gp*1.2+5.3)-0.5)*0.25;
      c += gc*grain*lw;
      c += (h12(gl_FragCoord.xy*1.37 + 11.0) - 0.5)/255.0;
      gl_FragColor = vec4(clamp(c,0.0,1.0), 1.0);
    }`,
};

export const GRADES = {
  // cold teal-green modern: sickly fluorescent cyan shadows, desaturated, lifted greenish blacks
  modern: { exposure: 1.0, lift: [0.0, 0.008, 0.012], gammaV: [0.98, 1.02, 1.03], gain: [0.95, 1.0, 1.02], shadowTint: [-0.012, 0.01, 0.018], highTint: [0.0, 0.01, 0.012], contrast: 0.4, saturation: 0.85, fade: 0.02, fadeColor: [0.03, 0.06, 0.07], grain: 0.05, vignette: 0.42, ca: 0.003 },
  // warm amber ancestral: brown-red shadows, golden highlights, rich
  ancestral: { exposure: 1.0, lift: [0.01, 0.003, -0.004], gammaV: [1.04, 1.0, 0.95], gain: [1.04, 0.99, 0.9], shadowTint: [0.015, 0.004, -0.01], highTint: [0.02, 0.008, -0.02], contrast: 0.38, saturation: 1.05, fade: 0.02, fadeColor: [0.07, 0.045, 0.03], grain: 0.045, vignette: 0.38, ca: 0.0025 },
  // firelight at night: amber highlights, cool blue-teal night shadows
  fire: { exposure: 1.0, lift: [-0.004, 0.004, 0.014], gammaV: [1.03, 1.0, 0.97], gain: [1.03, 0.99, 0.93], shadowTint: [-0.012, 0.0, 0.022], highTint: [0.03, 0.01, -0.025], contrast: 0.36, saturation: 1.02, fade: 0.018, fadeColor: [0.02, 0.03, 0.05], grain: 0.045, vignette: 0.4, ca: 0.0025 },
  // new world: natural warm, hopeful, balanced
  newworld: { exposure: 1.0, lift: [0.004, 0.004, 0.006], gammaV: [1.02, 1.0, 0.98], gain: [1.02, 1.0, 0.96], shadowTint: [-0.004, 0.0, 0.01], highTint: [0.015, 0.006, -0.012], contrast: 0.3, saturation: 1.05, fade: 0.025, fadeColor: [0.05, 0.045, 0.045], grain: 0.04, vignette: 0.32, ca: 0.0025 },
};

const HP_FRAG = `uniform sampler2D tDiffuse; uniform float luminosityThreshold; uniform float smoothWidth; uniform vec3 defaultColor; uniform float defaultOpacity; varying vec2 vUv;
  void main(){ vec4 t = texture2D(tDiffuse, vUv); float l = max(max(t.r, t.g), t.b); float k = max(l - luminosityThreshold, 0.0) / max(l, 1e-4); gl_FragColor = vec4(t.rgb * k, 1.0); }`;
function softKnee(bloom) { bloom.materialHighPassFilter.fragmentShader = HP_FRAG; bloom.materialHighPassFilter.needsUpdate = true; return bloom; }

export async function post(renderer, hdrTarget, o = {}) {
  const w = o.w, h = o.h;
  const QS = new URLSearchParams(location.search);
  if (QS.get('nobloom')) o = { ...o, bloom: { strength: 0 }, mist: null };
  if (QS.get('nostreak')) o = { ...o, streak: null };
  if (QS.get('nomist')) o = { ...o, mist: null };
  if (QS.get('onlymist')) o = { ...o, bloom: { strength: 0 } };
  const g = { ...GRADES[o.grade || 'modern'], ...(o.gradeOverride || {}) };
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }));
  composer.setPixelRatio(1); composer.setSize(w, h);
  const copy = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tSrc: { value: hdrTarget.texture }, k: { value: o.exposure ?? 1 } }, vertexShader: FinishShader.vertexShader,
    fragmentShader: `uniform sampler2D tSrc; uniform float k; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb*k, 1.); }`,
  });
  copy.uniforms.tSrc.value = hdrTarget.texture; copy.uniforms.k.value = o.exposure ?? 1;
  composer.addPass(copy);
  const b = o.bloom ?? {};
  if (b.strength !== 0) {
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), b.strength ?? 0.45, b.radius ?? 0.75, b.threshold ?? 0.9);
    const tints = b.tints ?? [[1, 1, 1], [1, 0.97, 0.94], [1, 0.82, 0.7], [1, 0.62, 0.48], [1, 0.5, 0.38]];
    tints.forEach((t, i) => bloom.bloomTintColors[i].set(...t));
    softKnee(bloom); composer.addPass(bloom);
  }
  if (o.mist) { // low-threshold diffusion (pro-mist filter)
    const mist = new UnrealBloomPass(new THREE.Vector2(w, h), o.mist.strength ?? 0.15, o.mist.radius ?? 0.9, o.mist.threshold ?? 0.0);
    (o.mist.tints ?? [[1, 1, 1], [1, 1, 1], [1, 0.95, 0.9], [1, 0.9, 0.85], [1, 0.85, 0.8]]).forEach((t, i) => mist.bloomTintColors[i].set(...t));
    softKnee(mist); composer.addPass(mist);
  }
  if (o.streak) composer.addPass(new StreakPass(w, h, o.streak));
  const fin = new ShaderPass(FinishShader);
  const U = fin.uniforms;
  U.res.value.set(w, h); U.exposure.value = g.exposure; U.ca.value = g.ca; U.vignette.value = g.vignette;
  U.lift.value.set(...g.lift); U.gammaV.value.set(...g.gammaV); U.gain.value.set(...g.gain);
  U.shadowTint.value.set(...g.shadowTint); U.highTint.value.set(...g.highTint);
  U.contrast.value = g.contrast; U.saturation.value = g.saturation; U.fade.value = g.fade; U.fadeColor.value.set(...g.fadeColor);
  U.grain.value = g.grain; U.grainSize.value = g.grainSize ?? (w > 1500 ? 1.6 : 1.25); U.seed.value = o.seed ?? 1.0; U.toe.value = g.toe ?? 0.0;
  composer.addPass(fin);
  composer.render();
  if (o.dispose) { for (const ps of composer.passes) if (ps.dispose) ps.dispose(); composer.dispose(); }
}

// Convenience: accumulate + post in one call
export async function renderShot(renderer, scene, camera, o) {
  const t0 = performance.now();
  const dbg = new URLSearchParams(location.search).get('raw');
  if (dbg) { renderer.toneMapping = THREE.AgXToneMapping; renderer.setRenderTarget(null); renderer.render(scene, camera); console.log('[scene] raw render'); return; }
  const hdr = await accumulate(renderer, scene, camera, o);
  const t1 = performance.now();
  if (new URLSearchParams(location.search).get('dbgacc')) {
    const mt = new THREE.ShaderMaterial({ uniforms: { t: { value: hdr.texture } }, vertexShader: QUAD_VS, fragmentShader: `uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; gl_FragColor = vec4(pow(c/(1.+c), vec3(1./2.2)), 1.); }` });
    renderer.setRenderTarget(null); new FullScreenQuad(mt).render(renderer); console.log('[scene] dbg accum'); return;
  }
  await post(renderer, hdr, o);
  { const gl = renderer.getContext(); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  if (o.dispose) hdr.dispose();
  const t2 = performance.now();
  console.log(`[scene] samples=${o.samples} accum=${((t1 - t0) / 1000).toFixed(1)}s post=${((t2 - t1) / 1000).toFixed(1)}s`);
}

// Parse common query params
export function shotParams(q, w, h, defaults = {}) {
  const prev = q.get('prev') === '1';
  return {
    w, h,
    samples: +(q.get('s') || (prev ? 1 : defaults.samples || 40)),
    prev,
    v: q.get('v') || 'a',
  };
}

// camera from defaults with optional query overrides: cam=x,y,z look=x,y,z fov=deg
export function makeCamera(q, def, w, h) {
  const pos = q.get('cam') ? q.get('cam').split(',').map(Number) : def.pos;
  const look = q.get('look') ? q.get('look').split(',').map(Number) : def.look;
  const fov = q.get('fov') ? +q.get('fov') : def.fov;
  const cam = new THREE.PerspectiveCamera(fov, w / h, def.near ?? 0.05, def.far ?? 400);
  if (def.up || q.get('up')) cam.up.set(...(q.get('up') ? q.get('up').split(',').map(Number) : def.up));
  cam.position.set(...pos); cam.lookAt(...look);
  if (def.roll) cam.rotateZ(def.roll * Math.PI / 180);
  if (def.shift) cam.userData.shift = def.shift;
  return cam;
}
