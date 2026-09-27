// DIRECTION D — THREADS. Shared look library.
// Pipeline: opaque pass (walnut manikins, props, floor; HDR + depth, MSAA)
//   -> depth-aware DOF gather on the opaque layer
//   -> additive light layer (threads as anti-aliased camera-facing ribbons, motes) with depth test
//   -> composite + analytic volumetric in-scattering from a light list (haze)
//   -> UnrealBloom -> filmic tone map (ACES/AgX), vignette, chromatic fringe, grain.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildMannequin, woodMaterial, POSES } from '../../mannequin.js';
export { THREE, POSES, buildMannequin };

export const COL = {
  amber: new THREE.Color('#ffb45a'),
  cyan: new THREE.Color('#9fe3ff'),
  ember: new THREE.Color('#ff3b2f'),
  hot: new THREE.Color('#ffd9a8'),
  fire: new THREE.Color('#ff8a2a'),
};
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const col = (c, k = 1) => new THREE.Color(c).multiplyScalar(k);
export function mixCol(a, b, t) { return new THREE.Color().copy(a).lerp(b, t); }

const MAXL = 192;

const quadVS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// ---------------------------------------------------------------- Stage
export class Stage {
  constructor(opts) {
    const o = this.o = Object.assign({
      fov: 35, near: 0.05, far: 800, exposure: 1.0, tone: 'aces',
      bloom: { strength: 0.75, radius: 0.55, threshold: 0.9 },
      haze: { density: 0.02, noise: 0.5, far: 150, height: 0, floorY: 0, scale: 2.2, seed: 0 },
      dof: null, // { focus, blurInf (px of CoC at infinity), max }
      vignette: 0.55, grain: 0.035, ca: 1.2, sat: 1.0, contrast: 1.0,
      lift: [0.0035, 0.0028, 0.0024], msaa: 4,
    }, opts);
    o.haze = Object.assign({ density: 0.02, noise: 0.5, far: 150, height: 0, floorY: 0, scale: 2.2, seed: 0 }, opts.haze || {});
    o.bloom = Object.assign({ strength: 0.75, radius: 0.55, threshold: 0.9 }, opts.bloom || {});
    const w = this.w = o.w, h = this.h = o.h;
    this.px = h / 720; // resolution scale for pixel-sized effects
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(w, h); r.autoClear = false; r.toneMapping = THREE.NoToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(r.domElement);
    this.scene = new THREE.Scene(); // opaque
    this.fx = new THREE.Scene();    // additive light layer
    this.camera = new THREE.PerspectiveCamera(o.fov, w / h, o.near, o.far);
    this.hazeLights = [];
    this.surfaceLights = [];
    this.billboards = [];
    this.floors = [];
    const dof = o.dof;
    this.U = { // shared uniforms for ribbons and motes
      uRes: { value: new THREE.Vector2(w, h) },
      uPx: { value: this.px },
      uDof: { value: dof ? dof.blurInf * dof.focus * this.px : 0 },
      uFocus: { value: dof ? dof.focus : 1 },
      uMaxCoc: { value: dof ? (dof.max ?? 40) * this.px : 0 },
    };
    this.time = 0;
  }
  setDof(dof) { this.o.dof = dof; this.U.uDof.value = dof ? dof.blurInf * dof.focus * this.px : 0; this.U.uFocus.value = dof ? dof.focus : 1; this.U.uMaxCoc.value = dof ? (dof.max ?? 40) * this.px : 0; }
  // world point at screen position (sx, sy in 0..1, y down) and distance along the view axis; call after look()
  at(sx, sy, dist) {
    const c = this.camera; c.updateMatrixWorld(true); c.updateProjectionMatrix();
    const ndc = new THREE.Vector3(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(c);
    const o = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    const dir = ndc.sub(o).normalize(); const fwd = new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld);
    return o.addScaledVector(dir, dist / dir.dot(fwd));
  }
  look(pos, target, fov) { this.camera.position.copy(pos); if (fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); } this.camera.lookAt(target); this.camera.updateMatrixWorld(true); return this; }

  // light: surface (THREE.PointLight in the opaque scene) and/or haze (in-scattering)
  light(pos, color, intensity, { surface = true, haze = true, hazeGain = 1, radius = 0.06, distance = 0 } = {}) {
    const c = new THREE.Color(color);
    if (surface && intensity > 0) {
      const L = new THREE.PointLight(c, intensity, distance, 2); L.position.copy(pos); this.scene.add(L); this.surfaceLights.push(L);
    }
    if (haze && hazeGain > 0) this.hazeLights.push({ p: pos.clone(), c: c.clone().multiplyScalar(intensity * hazeGain), r: radius });
    return this;
  }
  hazeLight(pos, color, intensity, radius = 0.1) { this.hazeLights.push({ p: pos.clone(), c: new THREE.Color(color).multiplyScalar(intensity), r: radius }); }
  // lights sampled along a polyline
  lightsAlong(pts, color, total, n, opts = {}) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const a = opts.from ?? 0, b = opts.to ?? 1;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? (a + b) / 2 : a + (b - a) * (i + 0.5) / n;
      const p = curve.getPointAt(u);
      const c = typeof color === 'function' ? color(u) : color;
      this.light(p, c, total / n, opts);
    }
  }

  _build() {
    if (this._built) return; this._built = true;
    const { w, h, o } = this;
    const rtMain = this.rtMain = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: o.msaa, depthBuffer: true });
    rtMain.depthTexture = new THREE.DepthTexture(w, h); rtMain.depthTexture.type = THREE.UnsignedIntType;
    this.rtOpq = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
    this.rtHDR = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
    // DOF / copy
    this.dofMat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(w, h) }, uNear: { value: 0 }, uFar: { value: 0 }, uDof: { value: 0 }, uFocus: { value: 1 }, uMax: { value: 0 } },
      vertexShader: quadVS,
      fragmentShader: /* glsl */`
        #include <packing>
        uniform sampler2D tColor, tDepth; uniform vec2 uRes; uniform float uNear, uFar, uDof, uFocus, uMax; varying vec2 vUv;
        float lz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, uNear, uFar); }
        float coc(float z){ return min(uMax, uDof * abs(1.0/uFocus - 1.0/z)); }
        void main(){
          vec3 c0 = texture2D(tColor, vUv).rgb;
          if (uDof <= 0.0) { gl_FragColor = vec4(c0, 1.0); return; }
          float zc = lz(vUv); float cc = coc(zc);
          vec3 acc = c0; float ws = 1.0;
          const int N = 72;
          for (int i = 1; i < N; i++) {
            float fi = float(i); float r = sqrt(fi / float(N)) * uMax; float a = fi * 2.39996323;
            vec2 off = vec2(cos(a), sin(a)) * r / uRes;
            float zs = lz(vUv + off); float cs = coc(zs);
            float cu = zs > zc ? min(cs, cc) : cs;
            float wgt = smoothstep(r - 1.5, r + 0.5, cu);
            acc += texture2D(tColor, vUv + off).rgb * wgt; ws += wgt;
          }
          gl_FragColor = vec4(acc / ws, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    // composite + haze
    const lp = [], lc = []; for (let i = 0; i < MAXL; i++) { lp.push(new THREE.Vector4()); lc.push(new THREE.Vector3()); }
    this.compMat = new THREE.ShaderMaterial({
      defines: { MAXL },
      uniforms: {
        tOpq: { value: null }, tAdd: { value: null }, tDepth: { value: null },
        uNear: { value: 0 }, uFar: { value: 0 }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
        uLP: { value: lp }, uLC: { value: lc }, uLN: { value: 0 },
        uDensity: { value: 0 }, uNoise: { value: 0 }, uHazeFar: { value: 100 }, uHeight: { value: 0 }, uFloorY: { value: 0 }, uScale: { value: 2 }, uSeed: { value: 0 }, uAspect: { value: w / h },
        uAddGain: { value: 1 },
        tMirror: { value: null }, uMirrorVP: { value: new THREE.Matrix4() }, uMirrorY: { value: 0 }, uMirrorK: { value: 0 }, uMirrorBlur: { value: 0 }, uMirrorRes: { value: new THREE.Vector2(w / 2, h / 2) }, uMirrorFade: { value: 60 },
      },
      vertexShader: quadVS,
      fragmentShader: /* glsl */`
        #include <packing>
        uniform sampler2D tOpq, tAdd, tDepth; uniform float uNear, uFar; uniform mat4 uInvProj, uCamWorld; uniform vec3 uCamPos;
        uniform vec4 uLP[MAXL]; uniform vec3 uLC[MAXL]; uniform int uLN;
        uniform float uDensity, uNoise, uHazeFar, uHeight, uFloorY, uScale, uSeed, uAspect, uAddGain; varying vec2 vUv;
        uniform sampler2D tMirror; uniform mat4 uMirrorVP; uniform float uMirrorY, uMirrorK, uMirrorBlur, uMirrorFade; uniform vec2 uMirrorRes;
        float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
        float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = mat2(1.6,1.2,-1.2,1.6) * p + 7.3; a *= 0.5; } return s; }
        void main(){
          vec3 opq = texture2D(tOpq, vUv).rgb;
          vec3 add = texture2D(tAdd, vUv).rgb * uAddGain;
          vec3 haze = vec3(0.0);
          vec3 mir = vec3(0.0);
          if (uMirrorK > 0.0) {
            float d = texture2D(tDepth, vUv).r;
            if (d < 0.999999) {
              vec4 pn = uInvProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0); vec3 dv = normalize(pn.xyz / pn.w);
              float vz = perspectiveDepthToViewZ(d, uNear, uFar); float th = vz / dv.z;
              vec3 rd = normalize((uCamWorld * vec4(dv, 0.0)).xyz); vec3 wp = uCamPos + rd * th;
              if (abs(wp.y - uMirrorY) < 0.004 + th * 0.0012) {
                vec4 cp = uMirrorVP * vec4(wp.x, uMirrorY, wp.z, 1.0); vec2 muv = cp.xy / cp.w * 0.5 + 0.5;
                vec3 acc = texture2D(tMirror, muv).rgb; float ws = 1.0;
                for (int i = 1; i < 16; i++) { float fi = float(i); float r = sqrt(fi / 16.0) * uMirrorBlur; float a = fi * 2.39996;
                  acc += texture2D(tMirror, muv + vec2(cos(a), sin(a)) * r / uMirrorRes).rgb; ws += 1.0; }
                float fres = 0.25 + 0.75 * pow(1.0 - abs(rd.y), 4.0);
                float n = fbm(wp.xz * 0.9 + 3.0);
                mir = acc / ws * uMirrorK * fres * (0.55 + 0.9 * n) * exp(-th / uMirrorFade);
              }
            }
          }
          if (uLN > 0 && uDensity > 0.0) {
            float d = texture2D(tDepth, vUv).r;
            vec4 pn = uInvProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0); vec3 dv = normalize(pn.xyz / pn.w);
            float tMax = uHazeFar;
            if (d < 0.999999) { float vz = perspectiveDepthToViewZ(d, uNear, uFar); tMax = min(vz / dv.z, uHazeFar); }
            vec3 rd = normalize((uCamWorld * vec4(dv, 0.0)).xyz);
            vec3 acc = vec3(0.0);
            for (int i = 0; i < MAXL; i++) {
              if (i >= uLN) break;
              vec3 L = uLP[i].xyz - uCamPos; float t0 = dot(L, rd);
              float r = uLP[i].w; float dd = max(dot(L, L) - t0 * t0, r * r); float di = sqrt(dd);
              float I = (atan((tMax - t0) / di) - atan(-t0 / di)) / di;
              float hk = 1.0;
              if (uHeight > 0.0) { float yc = uCamPos.y + rd.y * clamp(t0, 0.0, tMax); hk = exp(-max(yc - uFloorY, 0.0) / uHeight); }
              acc += uLC[i] * I * hk;
            }
            float n = fbm(vec2(vUv.x * uAspect, vUv.y) * uScale + uSeed);
            float m = mix(1.0, 0.25 + 1.5 * n, uNoise);
            haze = acc * uDensity * m;
          }
          gl_FragColor = vec4(opq + add + haze + mir, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.finalMat = new THREE.ShaderMaterial({
      uniforms: {
        tHDR: { value: null }, uRes: { value: new THREE.Vector2(w, h) }, toneMappingExposure: { value: 1 }, uTone: { value: 0 },
        uVig: { value: 0.5 }, uGrain: { value: 0.03 }, uCA: { value: 1 }, uSat: { value: 1 }, uContrast: { value: 1 }, uLift: { value: new THREE.Vector3() }, uSeed: { value: 0 },
      },
      vertexShader: quadVS,
      fragmentShader: /* glsl */`
        #include <tonemapping_pars_fragment>
        uniform sampler2D tHDR; uniform vec2 uRes; uniform int uTone; uniform float uVig, uGrain, uCA, uSat, uContrast, uSeed; uniform vec3 uLift; varying vec2 vUv;
        float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
        void main(){
          vec2 cc = vUv - 0.5;
          vec2 off = cc * 2.0 * uCA / uRes;
          vec3 c = vec3(texture2D(tHDR, vUv - off).r, texture2D(tHDR, vUv).g, texture2D(tHDR, vUv + off).b);
          float asp = uRes.x / uRes.y;
          float rr = length(cc * vec2(asp, 1.0)) / length(vec2(asp, 1.0) * 0.5);
          c *= mix(1.0, 1.0 - uVig, smoothstep(0.25, 1.05, rr));
          c = uTone == 1 ? AgXToneMapping(c) : ACESFilmicToneMapping(c);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = max(mix(vec3(l), c, uSat), 0.0);
          c = uLift + c * (1.0 - uLift);
          vec3 s = toSRGB(c);
          s = clamp((s - 0.5) * uContrast + 0.5, 0.0, 1.0);
          float g = (h21(gl_FragCoord.xy + uSeed * 17.0) + h21(gl_FragCoord.xy * 1.37 + uSeed * 31.0 + 5.1) - 1.0);
          s += g * uGrain * (0.55 + 0.45 * (1.0 - l));
          gl_FragColor = vec4(s, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(null);
    const b = o.bloom;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), b.strength, b.radius, b.threshold);
  }

  // PMREM environment from the additive layer seen from a point (reflections of threads on the lacquered walnut)
  envFromFx(pos, { size = 128, intensity = 1, extra = null } = {}) {
    this._build();
    const r = this.renderer;
    const crt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.05, 500, crt); cc.position.copy(pos);
    const env = new THREE.Scene(); env.background = new THREE.Color(0x000000);
    const oldRes = this.U.uRes.value.clone(); this.U.uRes.value.set(size, size);
    const oldDof = this.U.uDof.value; this.U.uDof.value = 0;
    const kids = [...this.fx.children]; for (const k of kids) env.add(k); // moves them
    if (extra) env.add(extra);
    const ac = r.autoClear; r.autoClear = true; cc.update(r, env); r.autoClear = ac;
    for (const k of kids) this.fx.add(k); // move back
    if (extra) env.remove(extra);
    this.U.uRes.value.copy(oldRes); this.U.uDof.value = oldDof;
    const pm = new THREE.PMREMGenerator(r);
    const tex = pm.fromCubemap(crt.texture).texture;
    this.scene.environment = tex; this.scene.environmentIntensity = intensity;
    return tex;
  }

  render({ time = 0 } = {}) {
    this._build();
    const { renderer: r, o, camera: cam } = this;
    cam.updateMatrixWorld(true);
    const cp = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    for (const b of this.billboards) {
      const wp = new THREE.Vector3(); b.parent.updateMatrixWorld(true); b.parent.getWorldPosition(wp);
      const n = cp.clone().sub(wp).normalize(); const up = V(0, 1, 0).addScaledVector(n, -n.y); if (up.lengthSq() < 1e-6) up.set(0, 0, -1); up.normalize();
      const rt = up.clone().cross(n).normalize(); const m = new THREE.Matrix4().makeBasis(rt, up, n);
      b.quaternion.setFromRotationMatrix(m).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), b.userData.roll || 0));
    }
    // 1. opaque
    r.setRenderTarget(this.rtMain); r.setClearColor(0x000000, 1); r.clear(true, true, true);
    r.render(this.scene, cam);
    // 2. DOF / copy
    const dm = this.dofMat.uniforms;
    dm.tColor.value = this.rtMain.texture; dm.tDepth.value = this.rtMain.depthTexture;
    dm.uNear.value = cam.near; dm.uFar.value = cam.far;
    dm.uDof.value = this.U.uDof.value; dm.uFocus.value = this.U.uFocus.value; dm.uMax.value = this.U.uMaxCoc.value;
    this.quad.material = this.dofMat; r.setRenderTarget(this.rtOpq); r.clear(); this.quad.render(r);
    // 2b. planar mirror (virtual camera below the floor), additive + opaque, half res
    const mo = o.mirror;
    if (mo && mo.k > 0) {
      if (!this.rtMirror) { this.rtMirror = new THREE.WebGLRenderTarget(Math.round(this.w / 2), Math.round(this.h / 2), { type: THREE.HalfFloatType, depthBuffer: true }); this.mcam = cam.clone(); }
      const vc = this.mcam; vc.copy(cam); const y0 = mo.y || 0;
      const cpos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      const dir = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld);
      const tgt = cpos.clone().add(dir);
      const upv = new THREE.Vector3(0, 1, 0).transformDirection(cam.matrixWorld);
      vc.position.set(cpos.x, 2 * y0 - cpos.y, cpos.z); vc.up.set(upv.x, -upv.y, upv.z); vc.lookAt(tgt.x, 2 * y0 - tgt.y, tgt.z); vc.updateMatrixWorld(true);
      for (const f of this.floors) f.visible = false;
      const oldRes = this.U.uRes.value.clone(); const oldDof = this.U.uDof.value;
      this.U.uRes.value.set(this.rtMirror.width, this.rtMirror.height); this.U.uDof.value = 0;
      r.setRenderTarget(this.rtMirror); r.clear(true, true, true); r.render(this.scene, vc); r.render(this.fx, vc);
      this.U.uRes.value.copy(oldRes); this.U.uDof.value = oldDof;
      for (const f of this.floors) f.visible = true;
      const cm0 = this.compMat.uniforms;
      cm0.tMirror.value = this.rtMirror.texture; cm0.uMirrorVP.value.multiplyMatrices(vc.projectionMatrix, vc.matrixWorldInverse);
      cm0.uMirrorY.value = y0; cm0.uMirrorK.value = mo.k; cm0.uMirrorBlur.value = (mo.blur ?? 3) * this.px * 0.5; cm0.uMirrorRes.value.set(this.rtMirror.width, this.rtMirror.height); cm0.uMirrorFade.value = mo.fade ?? 60;
    } else this.compMat.uniforms.uMirrorK.value = 0;
    // 3. additive layer into rtMain (keeps depth)
    r.setRenderTarget(this.rtMain); r.clear(true, false, false);
    r.render(this.fx, cam);
    // 4. composite + haze
    const cm = this.compMat.uniforms, hz = o.haze;
    cm.tOpq.value = this.rtOpq.texture; cm.tAdd.value = this.rtMain.texture; cm.tDepth.value = this.rtMain.depthTexture;
    cm.uNear.value = cam.near; cm.uFar.value = cam.far;
    cm.uInvProj.value.copy(cam.projectionMatrixInverse); cm.uCamWorld.value.copy(cam.matrixWorld); cm.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
    const hl = this.hazeLights; const n = Math.min(hl.length, MAXL);
    if (hl.length > MAXL) console.log('[scene] haze lights truncated', hl.length);
    for (let i = 0; i < n; i++) { cm.uLP.value[i].set(hl[i].p.x, hl[i].p.y, hl[i].p.z, hl[i].r); cm.uLC.value[i].set(hl[i].c.r, hl[i].c.g, hl[i].c.b); }
    cm.uLN.value = n; cm.uDensity.value = hz.density; cm.uNoise.value = hz.noise; cm.uHazeFar.value = hz.far; cm.uHeight.value = hz.height; cm.uFloorY.value = hz.floorY; cm.uScale.value = hz.scale; cm.uSeed.value = hz.seed;
    this.quad.material = this.compMat; r.setRenderTarget(this.rtHDR); r.clear(); this.quad.render(r);
    // 5. bloom
    const b = o.bloom; this.bloom.strength = b.strength; this.bloom.radius = b.radius; this.bloom.threshold = b.threshold;
    if (b.strength > 0) this.bloom.render(r, null, this.rtHDR, 0, false);
    // 6. grade to canvas
    const f = this.finalMat.uniforms;
    f.tHDR.value = this.rtHDR.texture; f.toneMappingExposure.value = o.exposure; f.uTone.value = o.tone === 'agx' ? 1 : 0;
    f.uVig.value = o.vignette; f.uGrain.value = o.grain; f.uCA.value = o.ca * this.px; f.uSat.value = o.sat; f.uContrast.value = o.contrast; f.uLift.value.set(...o.lift); f.uSeed.value = time;
    this.quad.material = this.finalMat; r.setRenderTarget(null); r.clear(); this.quad.render(r);
  }
}

// ---------------------------------------------------------------- materials
export function walnutMaterial({ seed = 21, base = [74, 47, 31], dark = [30, 18, 11], rough = 0.5, clearcoat = 0.9, ccRough = 0.14, rim = 0.03, rimCol = 0xa8b8cc, rimDir = [-0.55, 0.55, -0.35], sheen = 0.25 } = {}) {
  const m = woodMaterial({ seed, base, dark, roughness: rough, clearcoat, bumpScale: 0.35 });
  m.clearcoatRoughness = ccRough; m.sheen = sheen; m.sheenColor = new THREE.Color(0x8a5634); m.sheenRoughness = 0.5;
  m.envMapIntensity = 1.0;
  const rimU = { uRimDir: { value: new THREE.Vector3(...rimDir).normalize() }, uRimCol: { value: new THREE.Color(rimCol).multiplyScalar(rim) } };
  m.userData.rim = rimU;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, rimU);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimDir; uniform vec3 uRimCol;')
      .replace('#include <opaque_fragment>', `
        { vec3 vv = normalize(vViewPosition); float fr = pow(1.0 - saturate(dot(normal, vv)), 2.2);
          float rd = saturate(dot(normal, normalize(uRimDir)) * 0.9 + 0.1);
          outgoingLight += uRimCol * fr * rd; }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'walnut-rim';
  return m;
}
let _walnut = null;
export function walnut() { return _walnut || (_walnut = walnutMaterial()); }

// ---------------------------------------------------------------- figures
const CORE_LOCAL = new THREE.Vector3(0, 0.29, 0.112);
export function figure(stage, pose, { pos = [0, 0, 0], rot = [0, 0, 0], mat = null, ground = 0, core = true, coreColor = COL.amber, coreI = 1, coreLight = 1.0, coreSize = 0.024, coreRange = 0, merge = false, shadow = 0.55, addTo = null } = {}) {
  mat = mat || walnut();
  const m = buildMannequin({ material: mat, jointMaterial: mat, pinMaterial: new THREE.MeshStandardMaterial({ color: 0x3a3632, metalness: 1, roughness: 0.35 }), castShadow: false });
  const p = Object.assign({}, pose);
  const rr = (pose.root && pose.root.rot) || [0, 0, 0];
  p.root = { pos: [0, 0, 0], rot: [rr[0] + rot[0], rr[1] + rot[1], rr[2] + rot[2]] };
  m.setPose(p);
  m.root.position.set(pos[0], pos[1], pos[2]);
  if (ground !== null) m.ground(ground); else m.root.updateMatrixWorld(true);
  const chest = m.joints.chest;
  const corePos = chest.localToWorld(CORE_LOCAL.clone());
  const fwd = chest.localToWorld(CORE_LOCAL.clone().add(V(0, 0, 1))).sub(corePos).normalize();
  const up = chest.localToWorld(CORE_LOCAL.clone().add(V(0, 1, 0))).sub(corePos).normalize();
  const target = addTo || stage.scene;
  let obj = m.root;
  if (merge) {
    const geos = [];
    m.root.updateMatrixWorld(true);
    m.root.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); geos.push(g.index ? g.toNonIndexed() : g); } });
    const merged = mergeGeometries(geos, false);
    obj = new THREE.Mesh(merged, mat);
  }
  target.add(obj);
  const res = { m, obj, core: corePos, fwd, up, pos: V(...pos) };
  if (core && coreI > 0) {
    const c = new THREE.Color(coreColor);
    const s = new THREE.Mesh(new THREE.SphereGeometry(coreSize, 20, 14), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(14 * coreI) }));
    s.position.copy(corePos).addScaledVector(fwd, -coreSize * 0.35); target.add(s);
    if (coreLight > 0) stage.light(corePos.clone().addScaledVector(fwd, 0.05), c, 0.35 * coreI * coreLight, { hazeGain: 2.0, radius: 0.04, distance: coreRange });
    res.coreMesh = s;
  }
  if (shadow > 0 && ground !== null) contactShadow(stage, V(pos[0], ground + 0.002, pos[2]), 0.55, shadow, target);
  return res;
}
// joint world position helpers
export function jointPos(f, name, local = [0, 0, 0]) { return f.m.joints[name].localToWorld(V(...local)); }
export function handPos(f, side = 'r') { return f.m.joints[side + 'Wrist'].localToWorld(V(0, -0.12, 0.0)); }

let _shadowTex = null;
function shadowTex() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (_shadowTex = new THREE.CanvasTexture(c));
}
export function contactShadow(stage, pos, size = 0.6, opacity = 0.5, target = null) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, opacity, depthWrite: false, color: 0x000000 }));
  m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.renderOrder = 1; (target || stage.scene).add(m); return m;
}

// ---------------------------------------------------------------- threads (ribbons)
const ribbonVS = /* glsl */`
  attribute vec3 aPrev; attribute vec3 aNext; attribute float aSide; attribute vec3 aCol; attribute float aW; attribute float aHalo;
  uniform vec2 uRes; uniform float uPx, uDof, uFocus, uMaxCoc, uWidthMul, uMinPx, uEnergyPow, uIsHalo;
  varying vec3 vCol; varying float vSide;
  void main(){
    mat4 pmv = projectionMatrix * modelViewMatrix;
    vec4 c = pmv * vec4(position, 1.0);
    vec4 cp = pmv * vec4(aPrev, 1.0);
    vec4 cn = pmv * vec4(aNext, 1.0);
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 sp = cp.xy / max(cp.w, 1e-4) * asp; vec2 sn = cn.xy / max(cn.w, 1e-4) * asp;
    vec2 dir = sn - sp; float L = length(dir); dir = L > 1e-9 ? dir / L : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    float z = max(c.w, 1e-3);
    float px = aW * uWidthMul * projectionMatrix[1][1] / z * uRes.y * 0.5;
    float coc = min(uMaxCoc, uDof * abs(1.0 / uFocus - 1.0 / z));
    float pe = max(px, uMinPx * uPx) + coc;
    float e = pow(clamp(px / pe, 0.0, 1.0), uEnergyPow);
    vCol = aCol * e * mix(1.0, aHalo, uIsHalo);
    vSide = aSide;
    c.xy += nrm / asp * (pe / uRes.y) * aSide * c.w;
    gl_Position = c;
  }`;
const ribbonFS = /* glsl */`
  uniform float uSharp, uGain; varying vec3 vCol; varying float vSide;
  void main(){ float d = vSide; float p = exp(-d * d * uSharp); gl_FragColor = vec4(vCol * p * uGain, 1.0); }`;

export class Threads {
  constructor(stage, { minPx = 1.4, haloMul = 7, haloGain = 0.09, sharp = 5.5, haloSharp = 2.6, energyPow = 1.0, haloMinPx = 5, target = null } = {}) {
    Object.assign(this, { stage, minPx, haloMul, haloGain, sharp, haloSharp, energyPow, haloMinPx });
    this.target = target || stage.fx;
    this.P = []; this.PR = []; this.NX = []; this.S = []; this.C = []; this.W = []; this.H = []; this.I = [];
    this.count = 0;
  }
  // pts: Vector3[]; color: Color or fn(u)->Color; width: number or fn(u); intensity scalar
  add(pts, { width = 0.006, color = COL.amber, intensity = 6, fadeIn = 0.03, fadeOut = 0.0, halo = 1, alongFn = null } = {}) {
    const n = pts.length; if (n < 2) return;
    const base = this.P.length / 3;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const p = pts[i];
      const pr = i > 0 ? pts[i - 1] : p.clone().multiplyScalar(2).sub(pts[1]);
      const nx = i < n - 1 ? pts[i + 1] : p.clone().multiplyScalar(2).sub(pts[n - 2]);
      let k = intensity;
      if (fadeIn > 0) k *= smooth(0, fadeIn, u);
      if (fadeOut > 0) k *= 1 - smooth(1 - fadeOut, 1, u);
      if (alongFn) k *= alongFn(u);
      const c = typeof color === 'function' ? color(u) : color;
      const wv = typeof width === 'function' ? width(u) : width;
      for (const s of [-1, 1]) {
        this.P.push(p.x, p.y, p.z); this.PR.push(pr.x, pr.y, pr.z); this.NX.push(nx.x, nx.y, nx.z);
        this.S.push(s); this.C.push(c.r * k, c.g * k, c.b * k); this.W.push(wv); this.H.push(halo);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2; this.I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.count++;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('aPrev', new THREE.Float32BufferAttribute(this.PR, 3));
    g.setAttribute('aNext', new THREE.Float32BufferAttribute(this.NX, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(this.S, 1));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('aW', new THREE.Float32BufferAttribute(this.W, 1));
    g.setAttribute('aHalo', new THREE.Float32BufferAttribute(this.H, 1));
    g.setIndex(this.I);
    g.boundingSphere = new THREE.Sphere(V(), 1e6);
    const U = this.stage.U;
    const mk = (widthMul, minPx, sharp, gain, isHalo) => new THREE.ShaderMaterial({
      uniforms: { ...U, uWidthMul: { value: widthMul }, uMinPx: { value: minPx }, uEnergyPow: { value: this.energyPow }, uIsHalo: { value: isHalo }, uSharp: { value: sharp }, uGain: { value: gain } },
      vertexShader: ribbonVS, fragmentShader: ribbonFS,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      depthWrite: false, depthTest: true, transparent: true, side: THREE.DoubleSide,
    });
    this.core = new THREE.Mesh(g, mk(1, this.minPx, this.sharp, 1, 0)); this.core.frustumCulled = false;
    this.target.add(this.core);
    if (this.haloGain > 0) {
      this.halo = new THREE.Mesh(g, mk(this.haloMul, this.haloMinPx, this.haloSharp, this.haloGain, 1)); this.halo.frustumCulled = false;
      this.target.add(this.halo);
    }
    return this;
  }
}

// ---------------------------------------------------------------- motes (points with bokeh)
const moteVS = /* glsl */`
  attribute vec3 aCol; attribute float aSize;
  uniform vec2 uRes; uniform float uPx, uDof, uFocus, uMaxCoc, uMinPx;
  varying vec3 vCol; varying float vBok;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
    float z = max(-mv.z, 1e-3);
    float px = aSize * projectionMatrix[1][1] / z * uRes.y * 0.5;
    float coc = min(uMaxCoc, uDof * abs(1.0 / uFocus - 1.0 / z));
    float pe = max(px, uMinPx * uPx) + coc;
    float e = clamp(px / pe, 0.0, 1.0); e = e * e;
    vCol = aCol * e;
    vBok = clamp(coc / max(pe, 1e-3), 0.0, 1.0);
    gl_PointSize = pe * 2.0;
  }`;
const moteFS = /* glsl */`
  varying vec3 vCol; varying float vBok;
  void main(){
    vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q);
    float g = exp(-r * r * 4.0) * 2.2;
    float disc = (1.0 - smoothstep(0.82, 1.0, r)) * (0.75 + 0.35 * smoothstep(0.5, 0.95, r)) * 0.9;
    float p = mix(g, disc, vBok);
    gl_FragColor = vec4(vCol * p, 1.0);
  }`;
export class Motes {
  constructor(stage, { minPx = 1.3, target = null } = {}) { this.stage = stage; this.minPx = minPx; this.target = target || stage.fx; this.P = []; this.C = []; this.S = []; }
  add(p, color, intensity = 4, size = 0.01) { this.P.push(p.x, p.y, p.z); this.C.push(color.r * intensity, color.g * intensity, color.b * intensity); this.S.push(size); }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(this.S, 1));
    g.boundingSphere = new THREE.Sphere(V(), 1e6);
    const m = new THREE.ShaderMaterial({ uniforms: { ...this.stage.U, uMinPx: { value: this.minPx } }, vertexShader: moteVS, fragmentShader: moteFS,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthWrite: false, depthTest: true, transparent: true });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.target.add(this.points); return this;
  }
}

// ---------------------------------------------------------------- curves
// cubic bezier leaving a chest along fwd and arriving along -fwdB
export function bez(a, c1, c2, b, n = 64) { return new THREE.CubicBezierCurve3(a, c1, c2, b).getPoints(n - 1); }
export function reach(a, fa, b, fb, { k1 = 0.35, k2 = 0.35, lift = 0, n = 80 } = {}) {
  const d = a.distanceTo(b);
  const c1 = a.clone().addScaledVector(fa, d * k1).add(V(0, lift, 0));
  const c2 = fb ? b.clone().addScaledVector(fb, d * k2).add(V(0, lift, 0)) : b.clone().lerp(c1, 0.3).add(V(0, lift * 0.5, 0));
  return bez(a, c1, c2, b, n);
}
export function resample(pts, n) { return new THREE.CatmullRomCurve3(pts, false, 'centripetal').getSpacedPoints(n - 1); }
// perpendicular wobble for organic threads
export function wobble(pts, amp = 0.01, freq = 3, seed = 1) {
  const r = mulberry(seed); const ph1 = r() * 6.28, ph2 = r() * 6.28; const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1); const env = Math.sin(Math.PI * u);
    const t = (i < n - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
    let a = V(0, 1, 0); if (Math.abs(t.dot(a)) > 0.9) a = V(1, 0, 0);
    const n1 = a.clone().cross(t).normalize(), n2 = t.clone().cross(n1).normalize();
    out.push(pts[i].clone().addScaledVector(n1, Math.sin(u * freq * 6.28 + ph1) * amp * env).addScaledVector(n2, Math.cos(u * freq * 4.1 + ph2) * amp * env));
  }
  return out;
}
// n strands twisted around a path (rope of light)
export function strands(pts, { count = 3, radius = 0.006, twist = 6, seed = 3, taper = true } = {}) {
  const r = mulberry(seed); const n = pts.length; const res = [];
  for (let s = 0; s < count; s++) {
    const ph = (s / count) * Math.PI * 2 + r() * 0.5; const rad = radius * (0.6 + r() * 0.6); const tw = twist * (0.85 + r() * 0.3);
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const t = (i < n - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      let a = V(0, 1, 0); if (Math.abs(t.dot(a)) > 0.9) a = V(1, 0, 0);
      const n1 = a.clone().cross(t).normalize(), n2 = t.clone().cross(n1).normalize();
      const env = taper ? Math.min(1, Math.sin(Math.PI * u) * 3) : 1;
      const ang = ph + u * tw * Math.PI * 2;
      out.push(pts[i].clone().addScaledVector(n1, Math.cos(ang) * rad * env).addScaledVector(n2, Math.sin(ang) * rad * env));
    }
    res.push(out);
  }
  return res;
}
// add a thread plus its lights (surface + haze) in one call
export function lightThread(stage, T, pts, { color = COL.amber, width = 0.006, intensity = 6, lights = 6, lightI = 0.6, hazeGain = 1, surface = true, fadeIn = 0.04, fadeOut = 0, alongFn = null, halo = 1, from = 0, to = 1 } = {}) {
  T.add(pts, { color, width, intensity, fadeIn, fadeOut, alongFn, halo });
  if (lights > 0) {
    const cf = typeof color === 'function' ? color : () => color;
    stage.lightsAlong(pts, (u) => cf(u), lightI * lights, lights, { surface, hazeGain, radius: 0.08, from, to });
  }
}

// ---------------------------------------------------------------- floor
export function noiseTexture({ size = 512, seed = 5, scale = 6, oct = 5, contrast = 1, bias = 0 } = {}) {
  const r = mulberry(seed); const G = 64; const grid = new Float32Array(G * G); for (let i = 0; i < G * G; i++) grid[i] = r();
  const vn = (x, y, P) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const g = (a, b) => { a = ((a % P) + P) % P; b = ((b % P) + P) % P; return grid[(b % G) * G + (a % G)]; }; return lerp(lerp(g(xi, yi), g(xi + 1, yi), u), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), u), v); };
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let s = 0, a = 0.5, P = Math.max(1, Math.round(scale)); let f = P / size;
    for (let o = 0; o < oct; o++) { s += a * vn(x * f, y * f, P); a *= 0.5; f *= 2; P *= 2; }
    const v = clamp01((s - 0.5) * contrast + 0.5 + bias) * 255; const i = (y * size + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function floor(stage, { y = 0, size = 300, color = 0x0d0b09, rough = 0.62, repeat = 30, metal = 0, bump = 0.6, clearcoat = 0, ccRough = 0.3, seed = 5 } = {}) {
  const rt = noiseTexture({ seed, scale: 8, contrast: 1.4 });
  rt.repeat.set(repeat, repeat);
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, roughnessMap: rt, metalness: metal, bumpMap: rt, bumpScale: bump, clearcoat, clearcoatRoughness: ccRough });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); f.rotation.x = -Math.PI / 2; f.position.y = y; stage.scene.add(f); stage.floors.push(f); return f;
}

// ---------------------------------------------------------------- fire
const flameVS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const flameFS = /* glsl */`
  uniform float uSeed, uGain, uTime; varying vec2 vUv;
  float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 3.1; a *= 0.5; } return s; }
  void main(){
    float y = vUv.y; float x = (vUv.x - 0.5) * 2.0;
    float n1 = fbm(vec2(x * 1.3 + uSeed, y * 1.8 - uTime * 1.6 + uSeed * 2.0));
    float n2 = fbm(vec2(x * 3.2 - uSeed, y * 3.6 - uTime * 2.6 + 11.0));
    float xs = x + (n1 - 0.5) * 1.1 * y + (n2 - 0.5) * 0.25 * y;
    float wdt = pow(max(1.0 - y, 0.0), 0.9) * smoothstep(0.0, 0.18, y) * 0.95 + 0.05;
    float body = smoothstep(wdt, wdt * 0.35, abs(xs));
    float lick = smoothstep(0.95, 0.35, y + (n2 - 0.5) * 0.5 + (n1 - 0.5) * 0.3);
    float m = body * lick;
    float core = smoothstep(0.45, 0.0, abs(xs) / max(wdt, 0.05)) * smoothstep(0.75, 0.1, y) * m;
    vec3 c = vec3(0.9, 0.09, 0.015) * m;
    c += vec3(1.0, 0.36, 0.05) * smoothstep(0.25, 0.8, m) * (1.1 - y);
    c += vec3(1.0, 0.78, 0.42) * core * 1.6;
    gl_FragColor = vec4(c * uGain, 1.0);
  }`;
export function fire(stage, pos, { scale = 1, gain = 6, lightI = 5, seed = 1, logs = true, sparks = 40, time = 0, sparkT = null, hazeGain = 0.8 } = {}) {
  const r = mulberry(seed * 97 + 3);
  const grp = new THREE.Group(); grp.position.copy(pos); stage.fx.add(grp);
  for (let i = 0; i < 4; i++) {
    const hgt = (0.62 + r() * 0.4) * scale * (i === 0 ? 1.15 : 1), wid = (0.3 + r() * 0.14) * scale;
    const m = new THREE.ShaderMaterial({ uniforms: { uSeed: { value: r() * 50 }, uGain: { value: gain * (i === 0 ? 1 : 0.7) }, uTime: { value: time } }, vertexShader: flameVS, fragmentShader: flameFS,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthWrite: false, transparent: true, side: THREE.DoubleSide });
    const g = new THREE.PlaneGeometry(wid, hgt); g.translate(0, hgt / 2, 0);
    const pl = new THREE.Mesh(g, m);
    const pivot = new THREE.Group(); pivot.position.set((r() - 0.5) * 0.08 * scale, 0.03 * scale, (r() - 0.5) * 0.08 * scale); grp.add(pivot); pivot.add(pl);
    pl.userData.roll = (r() - 0.5) * 0.25; stage.billboards.push(pl);
  }
  if (logs) {
    const emap = noiseTexture({ seed: seed + 11, scale: 12, contrast: 3.2, bias: -0.25, size: 256 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8, emissive: new THREE.Color(1.0, 0.22, 0.03), emissiveIntensity: 1.2, emissiveMap: emap, bumpMap: emap, bumpScale: 2 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r() * 0.4; const L = (0.62 + r() * 0.22) * scale;
      const g = new THREE.CylinderGeometry(0.034 * scale, 0.046 * scale, L, 10); g.translate(0, L / 2, 0);
      const lg = new THREE.Mesh(g, logMat);
      // lean the log so its inner end rests near the centre, raised; outer end on the ground
      const outer = V(pos.x + Math.cos(a) * L * 0.8, pos.y + 0.035 * scale, pos.z + Math.sin(a) * L * 0.8);
      const inner = V(pos.x + Math.cos(a) * 0.05 * scale, pos.y + 0.16 * scale, pos.z + Math.sin(a) * 0.05 * scale);
      lg.position.copy(outer); lg.quaternion.setFromUnitVectors(V(0, 1, 0), inner.clone().sub(outer).normalize());
      stage.scene.add(lg);
    }
    // ember bed
    const bed = new THREE.Mesh(new THREE.CircleGeometry(0.3 * scale, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.25, 0.04).multiplyScalar(1.1), map: noiseTexture({ seed: seed + 5, scale: 10, contrast: 2.8, size: 256 }) }));
    bed.rotation.x = -Math.PI / 2; bed.position.set(pos.x, pos.y + 0.01, pos.z); stage.scene.add(bed);
    // stone ring
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.8 });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + r() * 0.2; const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 * scale * (0.8 + r() * 0.5), 1), stoneMat);
      st.scale.set(1.2, 0.6, 1); st.position.set(pos.x + Math.cos(a) * 0.42 * scale, pos.y + 0.025 * scale, pos.z + Math.sin(a) * 0.42 * scale); st.rotation.y = r() * 3; stage.scene.add(st);
    }
  }
  // lights
  stage.light(V(pos.x, pos.y + 0.75 * scale, pos.z), COL.fire, lightI, { hazeGain, radius: 0.25 * scale });
  stage.light(V(pos.x + 0.05, pos.y + 0.4 * scale, pos.z - 0.04), new THREE.Color(1.0, 0.4, 0.1), lightI * 0.25, { hazeGain: hazeGain * 0.6, radius: 0.15 * scale });
  // sparks as short rising streaks
  if (sparks > 0) {
    const T = new Threads(stage, { minPx: 1.1, haloGain: 0.12, haloMul: 5 });
    for (let i = 0; i < sparks; i++) {
      const hgt = (0.4 + Math.pow(r(), 1.5) * 3.2) * scale; const ang = r() * 6.28; const rad = (0.05 + r() * 0.25 + hgt * 0.12) * scale;
      const p0 = V(pos.x + Math.cos(ang) * rad, pos.y + hgt, pos.z + Math.sin(ang) * rad);
      const pts = []; const len = (0.04 + r() * 0.08) * scale; const sw = r() * 6.28;
      for (let k = 0; k < 5; k++) { const t = k / 4; pts.push(V(p0.x + Math.sin(sw + t * 2) * 0.012 * scale, p0.y - t * len, p0.z + Math.cos(sw + t * 2) * 0.012 * scale)); }
      const heat = 1 - clamp01(hgt / (3.6 * scale));
      const c = mixCol(new THREE.Color(1.0, 0.22, 0.04), new THREE.Color(1.0, 0.55, 0.18), heat);
      T.add(pts, { color: c, width: 0.0045 * scale, intensity: (2 + 6 * heat) * (0.4 + r()), fadeIn: 0.5, fadeOut: 0.5 });
    }
    T.build();
  }
  return grp;
}

// line-art helper: add polylines (arrays of Vector3) to a Threads batch as glowing outlines
export function outline(T, polylines, opts) { for (const pl of polylines) { if (pl.length >= 2) T.add(densify(pl, opts.seg ?? 0.05), Object.assign({ fadeIn: 0, fadeOut: 0 }, opts)); } }
export function densify(pl, seg = 0.05) {
  const out = [pl[0].clone()];
  for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i]; const n = Math.max(1, Math.ceil(a.distanceTo(b) / seg)); for (let k = 1; k <= n; k++) out.push(a.clone().lerp(b, k / n)); }
  return out;
}
export function rectPts(cx, cy, cz, w, h, axis = 'xy') {
  const hw = w / 2, hh = h / 2; let pts;
  if (axis === 'xy') pts = [V(cx - hw, cy - hh, cz), V(cx + hw, cy - hh, cz), V(cx + hw, cy + hh, cz), V(cx - hw, cy + hh, cz), V(cx - hw, cy - hh, cz)];
  else if (axis === 'xz') pts = [V(cx - hw, cy, cz - hh), V(cx + hw, cy, cz - hh), V(cx + hw, cy, cz + hh), V(cx - hw, cy, cz + hh), V(cx - hw, cy, cz - hh)];
  else pts = [V(cx, cy - hh, cz - hw), V(cx, cy - hh, cz + hw), V(cx, cy + hh, cz + hw), V(cx, cy + hh, cz - hw), V(cx, cy - hh, cz - hw)];
  return pts;
}
export function circlePts(c, r, n = 64, axis = 'xz', a0 = 0, a1 = Math.PI * 2) {
  const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push(axis === 'xz' ? V(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r) : axis === 'xy' ? V(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, c.z) : V(c.x, c.y + Math.sin(a) * r, c.z + Math.cos(a) * r)); } return out;
}

// glowing emissive panel (screens, windows) in the opaque layer
export function panel(stage, { w = 1, h = 0.6, pos = V(), rotY = 0, rotX = 0, color = COL.cyan, gain = 2, map = null, target = null } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), map, side: THREE.DoubleSide }));
  m.position.copy(pos); m.rotation.set(rotX, rotY, 0, 'YXZ'); (target || stage.scene).add(m); return m;
}

export async function done(stage) { stage.render(); }

// ---------------------------------------------------------------- crowds (instanced by pose)
// items: [{pose, pos:[x,y,z], rotY (deg), core:0..1, coreColor}] -> returns [{core, fwd, pos}] in the same order
const _poseCache = new Map();
function poseProto(pose, mat) {
  const key = JSON.stringify(pose);
  if (_poseCache.has(key)) return _poseCache.get(key);
  const m = buildMannequin({ material: mat, jointMaterial: mat, castShadow: false });
  m.setPose(pose); m.ground(0); m.root.updateMatrixWorld(true);
  const geos = [];
  m.root.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); geos.push(g.index ? g.toNonIndexed() : g); } });
  const geo = mergeGeometries(geos, false);
  const chest = m.joints.chest;
  const core = chest.localToWorld(CORE_LOCAL.clone());
  const fwd = chest.localToWorld(CORE_LOCAL.clone().add(V(0, 0, 1))).sub(core).normalize();
  const head = m.joints.head.localToWorld(V(0, 0.2, 0));
  const res = { geo, core, fwd, head, m };
  _poseCache.set(key, res); return res;
}
export function crowd(stage, items, { mat = null, coreSize = 0.022, coreGain = 12, shadow = 0.45, target = null } = {}) {
  mat = mat || walnut();
  const groups = new Map();
  const out = [];
  items.forEach((it, idx) => {
    const key = JSON.stringify(it.pose);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(idx);
  });
  const tgt = target || stage.scene;
  const coreGeo = new THREE.SphereGeometry(1, 12, 8);
  for (const [key, idxs] of groups) {
    const proto = poseProto(items[idxs[0]].pose, mat);
    const im = new THREE.InstancedMesh(proto.geo, mat, idxs.length);
    idxs.forEach((idx, k) => {
      const it = items[idx];
      const M = new THREE.Matrix4().compose(V(...it.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (it.rotY || 0) * Math.PI / 180, 0)), V(1, 1, 1).multiplyScalar(it.scale || 1));
      im.setMatrixAt(k, M);
      const core = proto.core.clone().applyMatrix4(M);
      const fwd = proto.fwd.clone().transformDirection(M);
      const head = proto.head.clone().applyMatrix4(M);
      out[idx] = { core, fwd, head, pos: V(...it.pos) };
    });
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; tgt.add(im);
  }
  // glowing cores (one instanced mesh)
  const lit = items.map((it, i) => [it, i]).filter(([it]) => (it.core ?? 1) > 0);
  if (lit.length) {
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ci = new THREE.InstancedMesh(coreGeo, cm, lit.length);
    lit.forEach(([it, i], k) => {
      const c = new THREE.Color(it.coreColor || COL.amber).multiplyScalar(coreGain * (it.core ?? 1));
      const s = coreSize * (it.scale || 1);
      ci.setMatrixAt(k, new THREE.Matrix4().compose(out[i].core.clone().addScaledVector(out[i].fwd, -s * 0.3), new THREE.Quaternion(), V(s, s, s)));
      ci.setColorAt(k, c);
    });
    ci.instanceMatrix.needsUpdate = true; ci.instanceColor.needsUpdate = true; ci.frustumCulled = false; tgt.add(ci);
  }
  if (shadow > 0) items.forEach((it) => contactShadow(stage, V(it.pos[0], it.pos[1] + 0.003, it.pos[2]), 0.6 * (it.scale || 1), shadow, tgt));
  return out;
}

// dome shelter of bent branches (dark, catches light at its edges)
export function shelter(stage, pos, { r = 0.9, h = 0.85, rotY = 0, seed = 2, mat = null } = {}) {
  const rng = mulberry(seed);
  const grp = new THREE.Group(); grp.position.copy(pos); grp.rotation.y = rotY;
  mat = mat || new THREE.MeshStandardMaterial({ color: 0x1b140e, roughness: 0.9 });
  // thatch shell (dark, rough)
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 16, 0.3 * Math.PI, 1.7 * Math.PI, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 1, side: THREE.DoubleSide, bumpMap: noiseTexture({ seed: seed + 3, scale: 24, contrast: 2, size: 256 }), bumpScale: 4 }));
  shell.scale.set(r * 0.97, h * 0.97, r * 0.87); grp.add(shell);
  stage.scene.add(grp); return grp;
}

// merged geometry of one posed limb subtree (e.g. 'rShoulder'), in the mannequin's own space (root at origin, grounded)
export function limbGeometry(pose, jointName = 'rShoulder') {
  const m = buildMannequin({ material: new THREE.MeshBasicMaterial(), castShadow: false });
  m.setPose(pose); m.root.updateMatrixWorld(true);
  const geos = [];
  m.joints[jointName].traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k); geos.push(g.index ? g.toNonIndexed() : g); } });
  const geo = mergeGeometries(geos, false);
  const tip = m.joints[jointName.replace('Shoulder', 'Wrist')].localToWorld(V(0, -0.17, 0.0));
  const base = m.joints[jointName].localToWorld(V(0, 0, 0));
  return { geo, tip, base };
}
// additive fresnel "light body" material (for hands/objects made of light)
export function lightBodyMaterial(color = COL.cyan, { core = 0.12, rim = 2.2, pow = 2.2 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(color) }, uCore: { value: core }, uRim: { value: rim }, uPow: { value: pow } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uCore, uRim, uPow; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow); gl_FragColor = vec4(uCol * (uCore + uRim * f), 1.0); }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}

// soft smoke / haze wisps: camera-facing additive sprites with fbm (billboards oriented each render)
const smokeFS = /* glsl */`
  uniform float uSeed, uGain; uniform vec3 uCol; varying vec2 vUv;
  float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ s += a * vn(p); p = p * 2.02 + 1.7; a *= 0.5; } return s; }
  void main(){ vec2 q = vUv * 2.0 - 1.0; float r = length(q);
    float n = fbm(vUv * 3.0 + uSeed); float n2 = fbm(vUv * 6.0 - uSeed * 1.3 + n);
    float m = smoothstep(1.0, 0.1, r) * smoothstep(0.35, 0.8, n * 0.7 + n2 * 0.5);
    gl_FragColor = vec4(uCol * m * uGain, 1.0); }`;
export function smoke(stage, base, { count = 7, height = 5, size = 1.6, grow = 0.5, gain = 0.06, color = COL.amber, seed = 1, drift = V(0.3, 0, -0.2) } = {}) {
  const r = mulberry(seed * 31 + 7);
  for (let i = 0; i < count; i++) {
    const t = (i + r() * 0.5) / count; const s = size * (1 + grow * t * 3);
    const m = new THREE.ShaderMaterial({ uniforms: { uSeed: { value: r() * 40 }, uGain: { value: gain * (1 - t * 0.6) }, uCol: { value: new THREE.Color(color) } }, vertexShader: flameVS, fragmentShader: smokeFS,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthWrite: false, transparent: true, side: THREE.DoubleSide });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(s, s), m);
    const pv = new THREE.Group(); pv.position.copy(base).add(V(0, 0.6 + t * height, 0)).addScaledVector(drift, t * height); stage.fx.add(pv); pv.add(pl);
    pl.userData.roll = r() * 6.28; stage.billboards.push(pl);
  }
}
