import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ======================================================================
   BASICS
   ====================================================================== */
const $ = (id) => document.getElementById(id);
const V3 = THREE.Vector3;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = (t) => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const isTouch = matchMedia('(pointer: coarse)').matches;
const sysRM = matchMedia('(prefers-reduced-motion: reduce)').matches;
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
const SET = Object.assign({ sound: true, rm: sysRM }, store('asis-settings') || {});
if (sysRM) SET.rm = true;
let RM = !!SET.rm;
document.body.classList.toggle('rm', RM);

/* ---- the project list, validated (from the PROJECTS array at the top of the file) ---- */
const FLOORS = (() => {
  const seen = new Set(), out = [];
  for (const p of (Array.isArray(window.PROJECTS) ? window.PROJECTS : (typeof PROJECTS !== 'undefined' ? PROJECTS : []))) {
    if (!p) continue;
    const floor = Math.round(+p.floor);
    if (!(floor >= 1) || seen.has(floor)) { console.warn('Skipped project (floor must be a whole number from 1, each floor once):', p); continue; }
    seen.add(floor);
    out.push({ floor, name: String(p.name || 'Untitled'), author: String(p.author || ''), url: String(p.url || '#'), sticker: String(p.sticker || '★'), stickerBg: p.stickerBg ? String(p.stickerBg) : '', gallery: !!p.gallery });
  }
  return out.sort((a, b) => a.floor - b.floor);
})();
const BY_FLOOR = new Map(FLOORS.map(p => [p.floor, p]));
const TOP = Math.max(3, ...FLOORS.map(p => p.floor));
const ROOF = TOP + 1;            // the roof garden: a stop of its own above the top floor, not a project
const floorTag = (f) => f === 0 ? 'L' : f === ROOF ? 'R' : String(f);
const T_TITLE = (typeof TITLE !== 'undefined' && TITLE) ? String(TITLE) : 'Air Trek';
const T_STUDIO = (typeof STUDIO !== 'undefined' && STUDIO) ? String(STUDIO) : '';
const floorLabel = (f) => f === 0 ? 'Lobby' : f === ROOF ? 'Roof' : 'Floor ' + f;

/* ---- DOM text that depends on the list ---- */
document.title = T_TITLE;
$('srTitle').textContent = `${T_TITLE}: a lift to ${FLOORS.length} projects, one per floor`;
$('creditName').textContent = T_STUDIO; $('startMark').textContent = T_STUDIO || T_TITLE;
$('logo').setAttribute('aria-label', T_TITLE);
$('logoSub').textContent = 'elevator through layers of the subconscious';
$('menuLede').textContent = `Every floor is someone's project. Ride the lift, or open one directly from this list. Links open in a new tab.`;
function buildList(el) {
  el.innerHTML = '';
  for (const p of FLOORS) {
    if (p.gallery) {   // the gallery floor: its pieces, each a link of its own
      const li = document.createElement('li'), head = document.createElement('div'); head.className = 'gal';
      head.innerHTML = `<span class="n"></span><span class="t"></span><span class="a"></span>`;
      head.querySelector('.n').textContent = p.floor; head.querySelector('.t').textContent = p.name; head.querySelector('.a').textContent = p.author;
      const ul = document.createElement('ul'); ul.className = 'sub';
      for (const g of (typeof GALLERY !== 'undefined' && Array.isArray(GALLERY) ? GALLERY : [])) {
        const it = document.createElement('li'), t = g.title + (g.author ? ' · ' + g.author : '');
        if (g.url) { const a = document.createElement('a'); a.href = g.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t; it.appendChild(a); }
        else { const sp = document.createElement('span'); sp.textContent = t; it.appendChild(sp); }
        ul.appendChild(it);
      }
      li.appendChild(head); li.appendChild(ul); el.appendChild(li); continue;
    }
    const li = document.createElement('li'), a = document.createElement('a');
    a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `<span class="n"></span><span class="t"></span><span class="a"></span>`;
    a.querySelector('.n').textContent = p.floor; a.querySelector('.t').textContent = p.name;
    a.querySelector('.a').textContent = p.author ? 'by ' + p.author : '';
    li.appendChild(a); el.appendChild(li);
  }
}
buildList($('list'));

/* ======================================================================
   WORLD CONSTANTS (metres). Lobby floor is y = 0, floor n sits at n*H.
   Sun travels toward +x, -y, -z: it comes in through the lobby's left window,
   and up the shaft through a window on each floor and the cab's side grille.
   ====================================================================== */
const H = 3.6;
const WALL_Z = 0.24;                 // lobby face of the hoistway wall (wall spans z 0..0.24)
const DOOR_W = 1.04, DOOR_H = 2.12;
const CAB = { x0: -0.8, x1: 0.8, z0: -1.74, z1: -0.16, h: 2.46 };
const SHAFT = { x0: -1.14, x1: 1.14, z0: -2.12 };
const LOBBY = { x0: -3.3, x1: 3.3, z1: 7.4, h: 3.5 };
const LAND = { x0: -1.65, x1: 1.65, z1: 3.1, h: 3.05 };
const GRILLE = { z0: -1.5, z1: -0.62, y0: 1.1, y1: 2.2 };
const SUN_BASE = new V3(0.55, -0.3, -0.78).normalize();

/* ======================================================================
   RENDERER
   ====================================================================== */
const canvas = $('c');
let renderer = null;
function noGL(why) {
  const p = $('noglPanel'); const m = $('menu').querySelector('.panel').cloneNode(true);
  m.querySelector('#menuToggles')?.remove(); m.querySelector('#menuKeys')?.remove(); m.querySelector('#closeMenu')?.remove();
  m.querySelector('h2').textContent = T_TITLE; m.querySelector('h2').removeAttribute('id');
  m.querySelector('p').textContent = (why || 'This lift needs WebGL2, which this browser did not provide.') + ' Every floor is listed here instead.';
  m.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  p.appendChild(m); $('nogl').hidden = false; $('start').hidden = true; $('fade').classList.add('out');
}
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false });
  if (!renderer.capabilities.isWebGL2) throw new Error('no webgl2');
  if (!renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('EXT_color_buffer_half_float')) throw new Error('no float buffers');
} catch (e) { noGL(); throw e; }
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 400);
scene.add(camera);

/* ======================================================================
   POST: HDR scene + depth -> SSAO (half) + light shafts (half) + bloom chain
         -> grade (DOF, AgX, split-tone, vignette, grain) -> FXAA -> screen
   ====================================================================== */
const fsGeo = new THREE.BufferGeometry();
fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
fsGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
const fsMesh = new THREE.Mesh(fsGeo); fsMesh.frustumCulled = false;
const fsScene = new THREE.Scene(); fsScene.add(fsMesh);
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
function fsMat(frag, uniforms, extra = {}) { return new THREE.ShaderMaterial(Object.assign({ vertexShader: VS, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false }, extra)); }
function pass(mat, target, clear = false) { fsMesh.material = mat; renderer.setRenderTarget(target); if (clear) renderer.clear(); renderer.render(fsScene, fsCam); }
const HF = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };

const rtMain = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
rtMain.depthTexture = new THREE.DepthTexture(4, 4, THREE.UnsignedIntType);
rtMain.depthTexture.format = THREE.DepthFormat;
const rtVol = new THREE.WebGLRenderTarget(4, 4, HF);
const rtAO = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
const rtLDR = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
const BLOOM_N = 6;
const rtBloom = Array.from({ length: BLOOM_N }, () => new THREE.WebGLRenderTarget(4, 4, HF));

const PACK = /* glsl */`
const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256., 256.);
const vec4 UnpackFactors = UnpackDownscale / vec4(PackFactors, 1.);
float unpackDepth(const in vec4 v){ return dot(v, UnpackFactors); }`;

const volMat = fsMat(/* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tDepth, tShadow;
uniform mat4 uShadowMat, uInvVP;
uniform vec3 uCam, uSunDir, uSunCol, uBoxMin, uBoxMax;
uniform float uTime, uDensity, uFrame;
${PACK}
float h31(vec3 p){ p = fract(p*0.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
  return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  float d = texture2D(tDepth, vUv).r;
  vec4 w = uInvVP*vec4(vUv*2.-1., d*2.-1., 1.); w /= w.w;
  vec3 rd = w.xyz - uCam; float tS = length(rd); rd /= tS;
  vec3 inv = 1./rd; vec3 t0 = (uBoxMin-uCam)*inv, t1 = (uBoxMax-uCam)*inv;
  vec3 tn3 = min(t0,t1), tf3 = max(t0,t1);
  float tn = max(max(tn3.x, tn3.y), max(tn3.z, 0.)); float tf = min(min(tf3.x, tf3.y), min(tf3.z, tS));
  if (tf <= tn){ gl_FragColor = vec4(0.); return; }
  const int N = 30; float dt = (tf-tn)/float(N);
  float j = ign(gl_FragCoord.xy + uFrame*5.588238);
  float acc = 0.;
  for (int i=0;i<N;i++){
    vec3 p = uCam + rd*(tn + (float(i)+j)*dt);
    vec4 sc = uShadowMat*vec4(p,1.);
    if (sc.x<0. || sc.x>1. || sc.y<0. || sc.y>1. || sc.z>1.) continue;
    float sd = unpackDepth(texture2D(tShadow, sc.xy));
    float lit = step(sc.z, sd + 0.0015);
    float dn = 0.55 + 0.9*n3(p*2.1 + vec3(0., uTime*0.05, uTime*0.03)) * n3(p*0.7 - uTime*0.02);
    acc += lit*dn*dt;
  }
  float mu = dot(uSunDir, -rd); float g = 0.62;
  float hg = (1.-g*g)/pow(1.+g*g-2.*g*mu, 1.5)/12.566;
  float iso = 0.0796;
  gl_FragColor = vec4(uSunCol*acc*uDensity*(hg*0.8 + iso*0.6), 1.);
}`, {
  tDepth: { value: rtMain.depthTexture }, tShadow: { value: null }, uShadowMat: { value: new THREE.Matrix4() }, uInvVP: { value: new THREE.Matrix4() },
  uCam: { value: new V3() }, uSunDir: { value: SUN_BASE.clone() }, uSunCol: { value: new V3(1, .7, .42) }, uBoxMin: { value: new V3() }, uBoxMax: { value: new V3() },
  uTime: { value: 0 }, uDensity: { value: 0.5 }, uFrame: { value: 0 },
});

const aoMat = fsMat(/* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tDepth; uniform mat4 uInvP, uP; uniform vec2 uRes; uniform float uFrame;
vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).r; vec4 c = uInvP*vec4(uv*2.-1., d*2.-1., 1.); return c.xyz/c.w; }
float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  float d0 = texture2D(tDepth, vUv).r; if (d0 >= 1.){ gl_FragColor = vec4(1.); return; }
  vec3 p = vpos(vUv);
  vec2 px = 1./uRes;
  vec3 pr = vpos(vUv + vec2(px.x,0.)), pl = vpos(vUv - vec2(px.x,0.)), pu = vpos(vUv + vec2(0.,px.y)), pd = vpos(vUv - vec2(0.,px.y));
  vec3 dx = abs(pr.z-p.z) < abs(pl.z-p.z) ? pr-p : p-pl; vec3 dy = abs(pu.z-p.z) < abs(pd.z-p.z) ? pu-p : p-pd;
  vec3 cr = cross(dx, dy); vec3 n = dot(cr, cr) > 1e-14 ? normalize(cr) : vec3(0., 0., 1.);
  float R = 0.32; float rs = R*uP[1][1]/max(-p.z, 0.05)*0.5;
  rs = min(rs, 0.12);
  float a0 = ign(gl_FragCoord.xy)*6.2831; float occ = 0.;
  const int K = 16;
  for (int i=0;i<K;i++){
    float fi = (float(i)+0.5)/float(K);
    float ang = a0 + float(i)*2.39996;
    vec2 o = vec2(cos(ang), sin(ang))*rs*sqrt(fi)*vec2(uRes.y/uRes.x, 1.);
    vec3 q = vpos(vUv + o); vec3 v = q - p; float vv = dot(v,v);
    float f = 1. - smoothstep(R*R*0.4, R*R*1.6, vv);
    occ += max(0., dot(v, n) - 0.006 - 0.004*(-p.z))*inversesqrt(vv + 1e-4)*f;
  }
  float ao = clamp(1. - occ/float(K)*1.6, 0., 1.);
  gl_FragColor = vec4(vec3(ao), 1.);
}`, { tDepth: { value: rtMain.depthTexture }, uInvP: { value: new THREE.Matrix4() }, uP: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2(1, 1) }, uFrame: { value: 0 } });

const downMat = fsMat(/* glsl */`
precision highp float;
varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uPre, uThresh;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o*uTexel).rgb; }
void main(){
  vec3 a = s(vec2(-2,-2)), b = s(vec2(0,-2)), c = s(vec2(2,-2)), d = s(vec2(-1,-1)), e = s(vec2(1,-1)), f = s(vec2(-2,0)), g = s(vec2(0,0)),
       h = s(vec2(2,0)), i = s(vec2(-1,1)), j = s(vec2(1,1)), k = s(vec2(-2,2)), l = s(vec2(0,2)), m = s(vec2(2,2));
  vec3 col = (d+e+i+j)*0.125 + (a+b+f+g)*0.03125 + (b+c+g+h)*0.03125 + (f+g+k+l)*0.03125 + (g+h+l+m)*0.03125;
  if (uPre > 0.5){ col = clamp(col, vec3(0.), vec3(60.)); if (any(isnan(col))) col = vec3(0.); float br = max(col.r, max(col.g, col.b)); float sft = clamp(br - uThresh*0.5, 0., uThresh); sft = sft*sft/(4.*uThresh + 1e-4);
    col *= max(sft, br - uThresh)/max(br, 1e-4); }
  gl_FragColor = vec4(col, 1.);
}`, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uPre: { value: 0 }, uThresh: { value: 1.0 } });
const upMat = fsMat(/* glsl */`
precision highp float;
varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb*4.;
  c += (texture2D(tSrc, vUv+vec2(-1,0)*uTexel).rgb + texture2D(tSrc, vUv+vec2(1,0)*uTexel).rgb + texture2D(tSrc, vUv+vec2(0,-1)*uTexel).rgb + texture2D(tSrc, vUv+vec2(0,1)*uTexel).rgb)*2.;
  c += texture2D(tSrc, vUv+vec2(-1,-1)*uTexel).rgb + texture2D(tSrc, vUv+vec2(1,-1)*uTexel).rgb + texture2D(tSrc, vUv+vec2(-1,1)*uTexel).rgb + texture2D(tSrc, vUv+vec2(1,1)*uTexel).rgb;
  gl_FragColor = vec4(c/16., 1.);
}`, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }, { blending: THREE.AdditiveBlending, transparent: true });

const gradeMat = fsMat(/* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene, tDepth, tBloom, tVol, tAO;
uniform vec2 uRes; uniform float uNear, uFar, uTime, uExposure, uBloom, uVol, uAOs, uFade, uFocus, uAperture, uCA;
vec3 agx(vec3 c){
  const mat3 inM = mat3(0.842479062253094, 0.0423282422610123, 0.0423756549057051, 0.0784335999999992, 0.878468636469772, 0.0784336, 0.0792237451477643, 0.0791661274605434, 0.879142973793104);
  const mat3 outM = mat3(1.19687900512017, -0.0528968517574562, -0.0529716355144438, -0.0980208811401368, 1.15190312990417, -0.0980434501171241, -0.0990297440797205, -0.0989611768448433, 1.15107367264116);
  c = inM*c; c = clamp(log2(max(c, 1e-10)), -12.47393, 4.026069); c = (c + 12.47393)/16.49999;
  vec3 x2 = c*c, x4 = x2*x2;
  c = 15.5*x4*x2 - 40.14*x4*c + 31.96*x4 - 6.868*x2*c + 0.4298*x2 + 0.1191*c - 0.00232;
  // punchy look
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = l + 1.18*(c - l); c = pow(max(c, 0.), vec3(1.06));
  return outM*c;
}
float lin(float d){ return (uNear*uFar)/(uFar - d*(uFar-uNear)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)))*43758.5453); }
void main(){
  vec2 uv = vUv; vec2 dc = uv - 0.5; float asp = uRes.x/uRes.y;
  float z = lin(texture2D(tDepth, uv).r);
  vec3 col;
  float coc = uAperture*abs(z - uFocus)/max(z, 0.05)/max(uFocus, 0.1);
  coc = min(coc, 0.022);
  if (coc*uRes.y > 1.2){
    vec3 acc = vec3(0.); float ws = 0.;
    for (int i=0;i<36;i++){
      float fi = float(i);
      float r = sqrt((fi+0.5)/36.); float a = fi*2.39996323;
      vec2 o = vec2(cos(a)/asp, sin(a))*r*coc;
      vec2 su = uv + o;
      float zs = lin(texture2D(tDepth, su).r);
      float cs = min(uAperture*abs(zs - uFocus)/max(zs,0.05)/max(uFocus,0.1), 0.022);
      float w = zs < z ? smoothstep(r*coc*0.7, r*coc*0.7 + 0.002, cs) + 0.001 : 1.;
      vec3 s = texture2D(tScene, su).rgb; float lum = dot(s, vec3(.3,.6,.1));
      w *= 1. + 1.5*smoothstep(1.5, 6., lum);
      acc += s*w; ws += w;
    }
    col = acc/ws;
  } else {
    float ca = uCA*dot(dc, dc);
    col = vec3(texture2D(tScene, uv + dc*ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv - dc*ca).b);
  }
  // ambient occlusion: mostly in the shade, barely in direct sun
  vec2 ap = 2./uRes; float ao = 0.;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++) ao += texture2D(tAO, uv + vec2(float(i), float(j))*ap*1.25).r;
  ao /= 9.;
  if (isnan(ao)) ao = 1.;
  float lum0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col *= mix(1., ao, uAOs*(1. - smoothstep(0.6, 4.0, lum0)));
  vec3 vol = vec3(0.); for (int j=-2;j<=2;j++) for (int i=-2;i<=2;i++){ float w = (3. - abs(float(i)))*(3. - abs(float(j))); vol += texture2D(tVol, uv + vec2(float(i), float(j))*ap).rgb*w; }
  col += vol/81.*uVol;
  col += texture2D(tBloom, uv).rgb*uBloom;
  if (any(isnan(col))) col = vec3(0.);
  col *= uExposure;
  col = agx(col);
  // split tone: teal in the shadows, warm in the highlights
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col += (vec3(-0.012, 0.012, 0.016))*(1. - smoothstep(0., 0.35, l)) + vec3(0.03, 0.008, -0.03)*smoothstep(0.45, 1., l);
  float vig = smoothstep(1.15, 0.28, length(dc*vec2(asp*0.75, 1.)));
  col *= mix(0.58, 1., vig);
  col = clamp(col, 0., 1.);
  col += (hash(uv*uRes + fract(uTime*7.31)*91.7) - 0.5)*0.022;
  col *= 1. - uFade;
  gl_FragColor = vec4(col, texture2D(tScene, uv).a);
}`, {
  tScene: { value: rtMain.texture }, tDepth: { value: rtMain.depthTexture }, tBloom: { value: rtBloom[0].texture }, tVol: { value: rtVol.texture }, tAO: { value: rtAO.texture },
  uRes: { value: new THREE.Vector2() }, uNear: { value: camera.near }, uFar: { value: camera.far }, uTime: { value: 0 }, uExposure: { value: 1 }, uBloom: { value: 0.05 },
  uVol: { value: 1 }, uAOs: { value: 0.75 }, uFade: { value: 1 }, uFocus: { value: 4.5 }, uAperture: { value: 0 }, uCA: { value: 0.006 },
});

const rtSty = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
// Painterly pass: Kuwahara smoothing into flat painted shapes, a palette ramp, diagonal brush/dry-brush strokes,
// loose dark lines where depth breaks, canvas grain. Runs on the graded image, only when a painted look is active.
const styMat = fsMat(/* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc, tDepth;
uniform vec2 uRes; uniform float uNear, uFar;
uniform vec3 uR0, uR1, uR2, uR3;
uniform float uRampMix, uKeepGreen, uStroke, uInk, uRadius, uStride, uGrain, uHigh, uAmount, uDetail;
float lin(float d){ return (uNear*uFar)/(uFar - d*(uFar-uNear)); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
vec3 ramp(float l){ l = clamp(l, 0., 1.); return l < .3 ? mix(uR0, uR1, l/.3) : l < .68 ? mix(uR1, uR2, (l-.3)/.38) : mix(uR2, uR3, (l-.68)/.32); }
vec3 hsv(vec3 c){ vec4 K = vec4(0., -1./3., 2./3., -1.); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y); return vec3(abs(q.z + (q.w - q.y)/(6.*d + 1e-10)), d/(q.x + 1e-10), q.x); }
void main(){
  vec2 px = uStride/uRes;
  int r = int(uRadius);
  vec3 m0 = vec3(0.), m1 = vec3(0.), m2 = vec3(0.), m3 = vec3(0.), s0 = vec3(0.), s1 = vec3(0.), s2 = vec3(0.), s3 = vec3(0.);
  for (int j=0;j<=6;j++){ if (j>r) break; for (int i=0;i<=6;i++){ if (i>r) break;
    vec2 o = vec2(float(i), float(j))*px; vec3 c;
    c = texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb; m0 += c; s0 += c*c;
    c = texture2D(tSrc, vUv + vec2( o.x, -o.y)).rgb; m1 += c; s1 += c*c;
    c = texture2D(tSrc, vUv + vec2( o.x,  o.y)).rgb; m2 += c; s2 += c*c;
    c = texture2D(tSrc, vUv + vec2(-o.x,  o.y)).rgb; m3 += c; s3 += c*c; } }
  float n = float((r+1)*(r+1)); m0 /= n; m1 /= n; m2 /= n; m3 /= n;
  vec3 v0 = s0/n - m0*m0, v1 = s1/n - m1*m1, v2 = s2/n - m2*m2, v3 = s3/n - m3*m3;
  float e0 = v0.r+v0.g+v0.b, e1 = v1.r+v1.g+v1.b, e2 = v2.r+v2.g+v2.b, e3 = v3.r+v3.g+v3.b;
  vec3 col = m0; float best = e0;
  if (e1 < best){ best = e1; col = m1; } if (e2 < best){ best = e2; col = m2; } if (e3 < best){ col = m3; }
  // put back some of the original detail, sharpened, so the paint never goes soft
  vec2 sp = 1./uRes; vec4 c0 = texture2D(tSrc, vUv);
  vec3 a4 = (texture2D(tSrc, vUv + vec2(sp.x, 0.)).rgb + texture2D(tSrc, vUv - vec2(sp.x, 0.)).rgb + texture2D(tSrc, vUv + vec2(0., sp.y)).rgb + texture2D(tSrc, vUv - vec2(0., sp.y)).rgb)*.25;
  vec3 sharp = clamp(c0.rgb + (c0.rgb - a4)*.8, 0., 1.);
  col = mix(col, sharp, uDetail);
  // surfaces flagged in the scene (buttons, stickers, signs, the landing wall text) stay unpainted
  float keep = 1. - smoothstep(.55, .8, min(min(c0.a, texture2D(tSrc, vUv + vec2(2.*sp.x, 0.)).a), min(texture2D(tSrc, vUv - vec2(2.*sp.x, 0.)).a, min(texture2D(tSrc, vUv + vec2(0., 2.*sp.y)).a, texture2D(tSrc, vUv - vec2(0., 2.*sp.y)).a))));
  // brush strokes in screen space: mostly diagonal, gently warped
  vec2 p = vUv*vec2(uRes.x/uRes.y, 1.);
  float ang = .8 + (vn(p*1.3) - .5)*.25;
  vec2 q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang))*p;
  // soft elongated streaks, like a dry flat brush dragged diagonally
  float st = vn(q*vec2(16., 70.))*.6 + vn(q*vec2(34., 150.) + 5.)*.4;
  // where light shapes meet shadow (luminance edges), the brush breaks up hardest
  vec2 gp = 3./uRes; vec3 W3 = vec3(.2126, .7152, .0722);
  float gx = dot(texture2D(tSrc, vUv + vec2(gp.x, 0.)).rgb - texture2D(tSrc, vUv - vec2(gp.x, 0.)).rgb, W3);
  float gy = dot(texture2D(tSrc, vUv + vec2(0., gp.y)).rgb - texture2D(tSrc, vUv - vec2(0., gp.y)).rgb, W3);
  float edge = smoothstep(.05, .22, length(vec2(gx, gy)));
  float l = dot(col, vec3(.2126, .7152, .0722));
  // dry brush: strokes break up the edges of light shapes and texture the shadows
  float ls = l + (st - .5)*uStroke*(.14*(1. - smoothstep(.3, .6, l)) + .95*edge);
  ls = mix(ls, 1., smoothstep(uHigh, uHigh + .18, ls)*.85);        // blow the sunlit shapes out toward white
  vec3 h = hsv(col);
  vec3 rc = ramp(ls);
  vec3 outc = mix(col*(ls/max(l, .02)), rc, uRampMix);
  float green = smoothstep(.17, .22, h.x)*(1. - smoothstep(.34, .4, h.x))*smoothstep(.3, .55, h.y)*smoothstep(.12, .3, h.z);
  vec3 gc = clamp(col*(ls/max(l, .02))*vec3(.9, 1.35, .55)*1.25, 0., 1.);
  outc = mix(outc, gc, green*uKeepGreen);
  // loose painted lines where depth breaks
  vec2 ep = 1.6/uRes; float z = lin(texture2D(tDepth, vUv).r);
  float zl = lin(texture2D(tDepth, vUv - vec2(ep.x, 0.)).r), zr = lin(texture2D(tDepth, vUv + vec2(ep.x, 0.)).r);
  float zd = lin(texture2D(tDepth, vUv - vec2(0., ep.y)).r), zu = lin(texture2D(tDepth, vUv + vec2(0., ep.y)).r);
  float ed = (abs(zl - z) + abs(zr - z) + abs(zu - z) + abs(zd - z))/max(z, .05);
  float ink = smoothstep(.05, .2, ed)*(.45 + .55*vn(p*35.));
  outc = mix(outc, uR0*.85, ink*uInk*(1. - smoothstep(.7, .95, ls)));
  // canvas tooth
  outc += (vn(gl_FragCoord.xy*.45) - .5)*uGrain + (h21(gl_FragCoord.xy) - .5)*uGrain*.5;
  vec3 base = mix(c0.rgb, sharp, .5);
  gl_FragColor = vec4(mix(base, clamp(outc, 0., 1.), uAmount*(1. - keep)), 1.);
}`, {
  tSrc: { value: rtLDR.texture }, tDepth: { value: rtMain.depthTexture }, uRes: { value: new THREE.Vector2() }, uNear: { value: camera.near }, uFar: { value: camera.far },
  uR0: { value: new THREE.Color() }, uR1: { value: new THREE.Color() }, uR2: { value: new THREE.Color() }, uR3: { value: new THREE.Color() },
  uRampMix: { value: .7 }, uKeepGreen: { value: .8 }, uStroke: { value: .45 }, uInk: { value: .5 }, uRadius: { value: 4 }, uStride: { value: 1.25 }, uGrain: { value: .03 }, uHigh: { value: .62 }, uAmount: { value: 1 }, uDetail: { value: .4 },
});

const fxaaMat = fsMat(/* glsl */`
precision highp float;
varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel;
float lu(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec3 rgbNW = texture2D(tSrc, vUv + vec2(-1.,-1.)*uTexel).rgb, rgbNE = texture2D(tSrc, vUv + vec2(1.,-1.)*uTexel).rgb;
  vec3 rgbSW = texture2D(tSrc, vUv + vec2(-1.,1.)*uTexel).rgb, rgbSE = texture2D(tSrc, vUv + vec2(1.,1.)*uTexel).rgb;
  vec3 rgbM = texture2D(tSrc, vUv).rgb;
  float lNW = lu(rgbNW), lNE = lu(rgbNE), lSW = lu(rgbSW), lSE = lu(rgbSE), lM = lu(rgbM);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float red = max((lNW + lNE + lSW + lSE)*0.03125, 1./128.);
  float rcp = 1./(min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir*rcp, -8., 8.)*uTexel;
  vec3 a = 0.5*(texture2D(tSrc, vUv + dir*(1./3. - .5)).rgb + texture2D(tSrc, vUv + dir*(2./3. - .5)).rgb);
  vec3 b = a*0.5 + 0.25*(texture2D(tSrc, vUv + dir*-0.5).rgb + texture2D(tSrc, vUv + dir*0.5).rgb);
  float lb = lu(b);
  gl_FragColor = vec4((lb < lMin || lb > lMax) ? a : b, 1.);
}`, { tSrc: { value: rtLDR.texture }, uTexel: { value: new THREE.Vector2() } });

/* ---- sizing, with automatic resolution scaling to hold the frame rate ---- */
let renderScale = isTouch ? .85 : 1, W = 1, Hh = 1;
const DPR_CAP = isTouch ? 1.15 : 1.5;   // phones: 3x screens would mean 9x the pixels through every pass
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio || 1, DPR_CAP) * renderScale;
  renderer.setPixelRatio(1);
  renderer.setSize(Math.max(1, Math.floor(w * pr)), Math.max(1, Math.floor(h * pr)), false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  W = Math.max(1, Math.floor(w * pr)); Hh = Math.max(1, Math.floor(h * pr));
  rtMain.setSize(W, Hh); rtLDR.setSize(W, Hh); rtSty.setSize(W, Hh); styMat.uniforms.uRes.value.set(W, Hh);
  const hw = Math.max(1, W >> 1), hh = Math.max(1, Hh >> 1);
  rtVol.setSize(hw, hh); rtAO.setSize(hw, hh);
  let bw = hw, bh = hh;
  for (let i = 0; i < BLOOM_N; i++) { rtBloom[i].setSize(Math.max(1, bw), Math.max(1, bh)); bw >>= 1; bh >>= 1; }
  camera.aspect = w / h; camera.updateProjectionMatrix();
  gradeMat.uniforms.uRes.value.set(W, Hh); fxaaMat.uniforms.uTexel.value.set(1 / W, 1 / Hh); aoMat.uniforms.uRes.value.set(hw, hh);
}
let resizeT = 0;   // phones fire resize as the address bar slides; rebuild the render targets once it settles
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 160); });

/* ======================================================================
   MATERIAL BAKER: procedural PBR surfaces rendered once on the GPU
   (albedo, normal, occlusion/roughness/metal). All tileable.
   ====================================================================== */
const BAKE_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform int uKind, uMode; uniform vec2 uTexel; uniform vec3 uC1, uC2; uniform float uSeed, uNS, uWear, uMossH;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(.1031, .1030, .0973) + uSeed); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float vn(vec2 p, vec2 per){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(h21(mod(i,per)), h21(mod(i+vec2(1.,0.),per)), u.x), mix(h21(mod(i+vec2(0.,1.),per)), h21(mod(i+vec2(1.,1.),per)), u.x), u.y); }
float fbm(vec2 uv, vec2 per, int oct){ float s = 0., a = .5, n = 0.; for (int i=0;i<7;i++){ if (i>=oct) break; s += a*vn(uv*per, per); n += a; per *= 2.; a *= .5; } return s/n; }
vec2 wor(vec2 uv, vec2 per){ vec2 p = uv*per, i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 o = vec2(float(x), float(y)); vec2 c = mod(i+o, per); vec2 r = o + vec2(h21(c), h21(c+17.31)) - f; float d = dot(r,r); if (d<d1){ d2 = d1; d1 = d; } else if (d<d2) d2 = d; }
  return vec2(sqrt(d1), sqrt(d2) - sqrt(d1)); }
struct S { vec3 a; float h; float r; float m; float o; };

// painted steel: seams, chipped paint over primer, rust, rust streaks, grime, moss at the foot (v = 0 is the floor)
// painted sheet steel: chipped paint over primer and bare steel, rust, rust runs, grime, moss climbing from the foot (v = 0 is the floor)
// extra = structural masks from the caller: x = joint proximity (more chipping), y = rust sources (rivets, joints) that bleed downward
S paintX(vec2 uv, vec3 col, float wearAdd, vec2 extra){
  S s;
  float big = fbm(uv, vec2(3.,2.), 4);
  float n1 = fbm(uv, vec2(32.,20.), 5)*.68 + fbm(uv + .13, vec2(6.,4.), 4)*.32;
  float n2 = fbm(uv + .37, vec2(40.,26.), 3);
  float low = 1. - smoothstep(0., .3, uv.y);
  float wear = n1*.8 + n2*.12 + extra.x*.22 + low*.08 + wearAdd;
  float chip = smoothstep(.626, .632, wear);
  float bare = smoothstep(.612, .617, wear)*(1. - chip);                       // thin ring of bright steel round each chip
  float primer = smoothstep(.598, .604, wear)*(1. - chip - bare);
  float rn = fbm(uv + .71, vec2(48.,32.), 4);
  vec3 rust = mix(vec3(.11,.035,.012), vec3(.44,.16,.04), smoothstep(.3,.72,rn));
  rust = mix(rust, vec3(.045,.022,.014), smoothstep(.58,.78, fbm(uv+.2, vec2(96.,64.), 3)));
  // rust runs: thin vertical streaks hanging below rust sources and chips
  float st = fbm(vec2(uv.x, uv.y*.06) + .5, vec2(160.,2.), 4);
  float src = clamp(extra.y + chip*.6, 0., 1.);
  float streak = smoothstep(.55,.72, st)*clamp(src*1.4 + smoothstep(.5,.62, fbm(uv+.9, vec2(5.,3.), 3))*.5, 0., 1.);
  vec3 p = col*mix(.74, 1.2, big)*mix(.9, 1.08, n2);
  p = mix(p, p*vec3(1.35,.66,.4), streak*.7);
  float grime = low*(.35 + .65*fbm(uv + .3, vec2(16.,10.), 4));
  vec3 a = mix(p, vec3(.5,.46,.38), primer);
  a = mix(a, vec3(.42,.42,.4)*mix(.8, 1.15, n2), bare);
  a = mix(a, rust, chip);
  a = mix(a, a*vec3(.4,.36,.28), grime*.8);
  float front = uv.y + (fbm(uv + .6, vec2(6.,3.), 4) - .5)*uMossH*.9;
  float reach = 1. - smoothstep(0., max(uMossH, .001), front);
  float mn = fbm(uv + .4, vec2(40.,24.), 4);
  float stray = smoothstep(.7, .8, fbm(uv + .9, vec2(10.,6.), 4))*smoothstep(.1, .3, uMossH)*(1. - smoothstep(.5, .9, uv.y));
  float moss = smoothstep(.52, .62, mn*.7 + reach*.42 + chip*.1 + extra.x*.12 + stray*.3)*max(reach, stray);
  vec3 mc = mix(vec3(.06,.12,.02), vec3(.2,.29,.05), fbm(uv + .2, vec2(64.,40.), 3));
  a = mix(a, mc, moss);
  s.a = a;
  // shallow dents (oil-canning) instead of a plank bulge; paint stands proud of chips
  s.h = .6 + (fbm(uv + .5, vec2(4.,3.), 3) - .5)*.35 - chip*(.4 + .35*rn) - bare*.25 - primer*.1 + moss*(.22 + .25*mn) + (n2-.5)*.02;
  s.r = mix(.3 + .2*n2, .9, chip); s.r = mix(s.r, .32, bare); s.r = mix(s.r, .85, max(grime*.6, streak*.35)); s.r = mix(s.r, 1., moss);
  s.m = bare*.75; s.o = 1. - chip*.12;
  return s;
}
S paint(vec2 uv, vec3 col, float panels, float wearAdd){ return paintX(uv, col, wearAdd, vec2(0.)); }
// wall cladding: 1.2 m steel sheets (2 per 2.4 m tile), a lapped horizontal joint, rivet rows along every joint
float rivetRow(float along, float across, float pitch, float r){ float d = length(vec2((fract(along/pitch) - .5)*pitch, across)); return 1. - smoothstep(r*.55, r, d); }
S sheetWall(vec2 uv){
  float X = uv.x*2.4, Y = uv.y*2.5;                                   // approximate metres
  float sx = fract(X/1.2); float dSeam = min(sx, 1. - sx)*1.2;      // distance to a vertical seam
  float dJoint = abs(Y - 1.18);                                     // lapped horizontal joint
  float seam = 1. - smoothstep(.002, .006, dSeam), joint = 1. - smoothstep(.002, .007, dJoint);
  float near = max(1. - smoothstep(.0, .06, dSeam), 1. - smoothstep(.0, .06, dJoint));
  float riv = max(rivetRow(Y, dSeam - .03, .09, .008), rivetRow(X, dJoint - .03, .09, .008));
  float lapShadow = (1. - smoothstep(0., .03, 1.18 - Y))*step(Y, 1.18);
  S s = paintX(uv, uC1, uWear, vec2(near*.6 + riv*.5, riv + joint*.6 + seam*.3));
  float rustRiv = riv*smoothstep(.4, .6, fbm(uv + 3.1, vec2(64.,40.), 3));
  s.a = mix(s.a, vec3(.2,.07,.02), rustRiv*.8);
  s.a *= 1. - seam*.55 - joint*.5 - lapShadow*.25;
  s.h += riv*.55 - seam*.8 - joint*.6 + step(1.18, Y)*.12;
  s.r = mix(s.r, .5, riv); s.o -= seam*.5 + joint*.45;
  return s;
}
// lift door leaf (u = 0 at the leaf centre, |u| = .5 at its edges, v floor..top): raised border, two ribs, kick plate with rivets
S doorLeaf(vec2 uv){
  float du = abs(fract(uv.x + .5) - .5)*2.; float dx = (1. - du)*.27; float y = uv.y*2.12; float dy = min(y, 2.12 - y);
  float border = 1. - smoothstep(.028, .036, min(dx, dy));
  float rib = max(1. - smoothstep(.012, .02, abs(y - .78)), 1. - smoothstep(.012, .02, abs(y - 1.52)));
  float kick = 1. - smoothstep(.27, .28, y);
  float kickTop = 1. - smoothstep(.004, .01, abs(y - .28));
  float riv = rivetRow(uv.x*.54, y - .25, .06, .006)*step(.04, dx) + rivetRow(y, dx - .015, .12, .005)*step(.3, y);
  float scuff = smoothstep(.0, .05, .09 - dx)*smoothstep(.85, 1.05, y)*(1. - smoothstep(1.3, 1.5, y))*smoothstep(.45, .7, fbm(uv + 2.2, vec2(20.,60.), 4));
  S s = paintX(uv, uC1, uWear + border*.05 + rib*.05 + scuff*.25, vec2(border*.5 + rib*.5 + kickTop*.4, riv + rib*.7 + kickTop*.6));
  float kn = fbm(vec2(uv.x*3., y*8.) + 1.7, vec2(12.,40.), 4);
  vec3 steel = vec3(.36,.35,.33)*mix(.65, 1.15, kn);
  float kickRust = smoothstep(.5, .66, kn + (1. - smoothstep(0., .1, y))*.3);
  s.a = mix(s.a, mix(steel, vec3(.25,.09,.03), kickRust), kick*.85);
  s.m = mix(s.m, .8*(1. - kickRust), kick*.85); s.r = mix(s.r, mix(.38, .85, kickRust), kick*.85);
  s.a = mix(s.a, vec3(.2,.07,.02), riv*.6);
  s.h += border*.35 + rib*.3 + kick*.1 - kickTop*.35 + riv*.5;
  s.o -= kickTop*.4;
  return s;
}
S cream(vec2 uv){
  vec2 e = min(uv, 1. - uv); float edge = 1. - smoothstep(0., .14, min(e.x, e.y));
  S s = paint(uv, uC1, 0., edge*.12 + (1. - smoothstep(0., .5, uv.y))*.05);
  float sc = 0.;
  for (int i=0;i<5;i++){ float fi = float(i); vec2 d = normalize(vec2(h21(vec2(fi,3.))-.5, h21(vec2(fi,7.))-.5)); vec2 c = vec2(h21(vec2(fi,11.)), h21(vec2(fi,13.)));
    float t = dot(uv - c, d); float off = abs(dot(uv - c, vec2(-d.y, d.x))); sc += (1. - smoothstep(.0006, .0018, off))*step(abs(t), .12)*.7; }
  s.a = mix(s.a, vec3(.35,.31,.26), clamp(sc,0.,1.)*.5); s.h -= sc*.2;
  return s;
}
S plaster(vec2 uv){
  S s;
  float big = fbm(uv, vec2(3.,3.), 4), n1 = fbm(uv, vec2(7.,7.), 5), n2 = fbm(uv + .5, vec2(32.,32.), 3);
  vec3 pnt = uC1*mix(.8, 1.12, big)*mix(.93, 1.05, n2);
  vec3 base = vec3(.32,.29,.25)*mix(.8, 1.1, n2);
  float peel = smoothstep(.612, .62, n1 + (1. - uv.y)*.02);
  float edge = smoothstep(.585, .612, n1)*(1. - peel);
  float w = fbm(uv + .2, vec2(4.,2.), 5) + (1. - uv.y)*.12;
  float stain = smoothstep(.56, .6, w); float ring = smoothstep(.56, .57, w) - smoothstep(.575, .6, w);
  vec2 cr = wor(uv + (vec2(fbm(uv + .3, vec2(8.,8.), 3), fbm(uv + .7, vec2(8.,8.), 3)) - .5)*.08, vec2(5.,5.)); float crack = (1. - smoothstep(0., .01, cr.y))*smoothstep(.62, .7, fbm(uv + .8, vec2(6.,6.), 3));
  vec3 a = mix(pnt, pnt*vec3(.82,.7,.5), stain*.55); a = mix(a, vec3(.22,.15,.08), ring*.45);
  a = mix(a, base, peel); a = mix(a, a*.72, edge*.6); a = mix(a, vec3(.05,.045,.04), crack*.85);
  float grime = (1. - smoothstep(0., .22, uv.y))*fbm(uv + .6, vec2(12.,12.), 3); a = mix(a, a*.5, grime*.8);
  s.a = a; s.h = .5 - peel*.35 + edge*.18 - crack*.6 + (n2-.5)*.05 + (n1-.5)*.06;
  s.r = mix(.86, .96, peel); s.m = 0.; s.o = 1. - crack*.6 - peel*.1;
  return s;
}
S tile(vec2 uv){
  S s;
  vec2 g = uv*6.; vec2 id = floor(g); vec2 f = fract(g);
  float bd = min(min(f.x, 1.-f.x), min(f.y, 1.-f.y));
  float grout = 1. - smoothstep(.022, .038, bd);
  float chk = mod(id.x + id.y, 2.);
  float tr = h21(mod(id,6.) + 3.1), tr2 = h21(mod(id,6.) + 7.7), tr3 = h21(mod(id,6.) + 1.3);
  vec3 cr = vec3(.6,.55,.44)*mix(.86, 1.04, tr), gr = vec3(.05,.14,.115)*mix(.8, 1.2, tr);
  vec3 a = mix(cr, gr, chk);
  float n1 = fbm(uv, vec2(6.,6.), 5), n2 = fbm(uv + .3, vec2(40.,40.), 3);
  float missing = step(.94, tr2);
  float chipE = smoothstep(.64, .68, fbm(uv + .1, vec2(36.,36.), 4) + (1. - bd*2.)*.16)*step(.55, tr2);
  float bare = max(missing, chipE)*(1. - grout);
  vec3 conc = vec3(.19,.18,.16)*mix(.7, 1.2, n2);
  a = mix(a, vec3(.08,.07,.06), grout); a = mix(a, conc, bare);
  vec2 wc = wor(uv + .13, vec2(9.,9.)); float crack = (1. - smoothstep(0., .018, wc.y))*step(.62, tr3)*(1. - grout);
  a = mix(a, vec3(.03), crack*.8);
  float dust = smoothstep(.46, .7, n1); a = mix(a, vec3(.23,.19,.14), dust*.45);
  float wearP = smoothstep(.4, .62, fbm(uv + .5, vec2(4.,4.), 4));
  s.a = a;
  s.h = (1. - grout)*.6 - bare*.4 + (f.x - .5)*(tr - .5)*.12 + (f.y - .5)*(tr3 - .5)*.12 - crack*.5 + (n2-.5)*.06*bare;
  s.r = mix(mix(.2, .48, wearP), .92, max(grout, bare)); s.r = mix(s.r, .82, dust*.6); s.m = 0.; s.o = 1. - grout*.55;
  return s;
}
S tread(vec2 uv){
  S s;
  vec2 g = uv*14.; vec2 id = floor(g); vec2 f = fract(g) - .5;
  float o = mod(id.x + id.y, 2.) < .5 ? 1. : -1.;
  vec2 r = vec2(f.x + o*f.y, f.y - o*f.x)*.7071;
  float bar = 1. - smoothstep(.06, .1, length(vec2(max(abs(r.x) - .2, 0.), r.y)));
  float n1 = fbm(uv, vec2(5.,5.), 5), n2 = fbm(uv + .4, vec2(40.,40.), 4);
  float rustM = smoothstep(.5, .6, n1 + (1. - bar)*.05);
  vec3 steel = vec3(.4,.39,.37)*mix(.7, 1.1, n2);
  vec3 rust = mix(vec3(.11,.04,.014), vec3(.34,.12,.04), n2);
  float worn = bar*smoothstep(.42, .6, n1);
  vec3 a = mix(steel, rust, rustM*(1. - worn*.7)); a = mix(a, vec3(.62,.61,.58), worn*.45*(1. - rustM));
  s.a = a; s.h = bar*.8 + (n2-.5)*.12*rustM; s.r = mix(mix(.42, .26, worn), .88, rustM); s.m = mix(.92, 0., rustM); s.o = mix(.7, 1., bar);
  return s;
}
S concrete(vec2 uv){
  S s;
  float n1 = fbm(uv, vec2(4.,4.), 6), n2 = fbm(uv + .2, vec2(48.,48.), 3);
  vec3 a = uC1*mix(.72, 1.16, n1)*mix(.88, 1.1, n2);
  float fy = fract(uv.y*3.); float line = 1. - smoothstep(.002, .006, min(fy, 1. - fy)/3.);
  float st = fbm(vec2(uv.x, uv.y*.08) + .3, vec2(80.,2.), 4); float drip = smoothstep(.58, .74, st);
  a = mix(a, a*vec3(.8,.58,.4), drip*.5);
  float ef = smoothstep(.62, .7, fbm(uv + .6, vec2(8.,8.), 5)); a = mix(a, vec3(.46,.46,.44), ef*.35);
  a *= 1. - line*.4;
  s.a = a; s.h = (n2-.5)*.35 + (n1-.5)*.2 - line*.5; s.r = .92; s.m = 0.; s.o = 1. - line*.4;
  return s;
}
S metalK(vec2 uv, vec3 base, vec3 tarnish, float rough){
  S s;
  float br = fbm(vec2(uv.x*.02, uv.y) + .1, vec2(1.,256.), 3);
  float n1 = fbm(uv, vec2(6.,6.), 5);
  float grime = smoothstep(.56, .7, n1);
  float pit = smoothstep(.74, .8, fbm(uv + .3, vec2(64.,64.), 3));
  vec3 a = mix(base, tarnish, max(grime*.85, pit));
  s.a = a; s.r = rough + br*.1 + grime*.45 + pit*.3; s.m = 1. - grime*.6 - pit*.5; s.h = -pit*.5 + br*.08; s.o = 1.;
  return s;
}
S iron(vec2 uv){
  S s = paint(uv, uC1, 0., .02);
  s.m = mix(.0, .0, s.m); s.r = mix(s.r, .55, .4);
  return s;
}
S ground(vec2 uv){
  S s; float n1 = fbm(uv, vec2(4.,4.), 5), n2 = fbm(uv + .3, vec2(32.,32.), 4), n3 = fbm(uv + .7, vec2(96.,96.), 3);
  float dirt = smoothstep(.56 - uWear*.6, .7 - uWear*.6, n1*.7 + n2*.3);
  vec3 g = uC1*mix(.6, 1.3, n2)*mix(.85, 1.1, n3); vec3 d = uC2*mix(.7, 1.2, n3)*mix(.85, 1.1, n2);
  s.a = mix(g, d, dirt); s.h = (n3 - .5)*.5 + (1. - dirt)*.25 + (n2 - .5)*.2; s.r = mix(.9, .97, dirt); s.m = 0.; s.o = 1. - (1. - n3)*.2; return s;
}
S corrugated(vec2 uv){
  S s; float w = sin(uv.x*6.2832*24.);
  float n1 = fbm(uv, vec2(6.,4.), 5), n2 = fbm(uv + .4, vec2(48.,32.), 4);
  float st = fbm(vec2(uv.x, uv.y*.08) + .3, vec2(96.,2.), 4);
  float rust = smoothstep(.5, .62, n1*.7 + n2*.3 + (1. - uv.y)*.12 + st*.15 - uWear);
  vec3 paint = uC1*mix(.75, 1.15, n2);
  vec3 rc = mix(vec3(.16,.05,.015), vec3(.48,.18,.05), n2);
  s.a = mix(paint, rc, rust); s.a *= .85 + .15*(w*.5 + .5);
  s.h = w*.5 + .5 - rust*.1; s.r = mix(.55, .9, rust); s.m = mix(.35, 0., rust); s.o = .8 + .2*(w*.5 + .5); return s;
}
S planks(vec2 uv){
  S s; float fx = fract(uv.x*6.); float id = floor(uv.x*6.);
  float gap = 1. - smoothstep(.0, .025, min(fx, 1. - fx));
  float grain = fbm(vec2(uv.x*60. + h21(vec2(id, 1.))*9., uv.y*3.), vec2(360., 3.), 4);
  float n1 = fbm(uv + .2, vec2(10.,8.), 5);
  float chip = smoothstep(.6 - uWear, .64 - uWear, n1*.8 + grain*.2 + (1. - uv.y)*.08);
  vec3 wood = mix(vec3(.2,.16,.11), vec3(.42,.36,.27), grain);
  vec3 paint = uC1*mix(.82, 1.12, h21(vec2(id, 4.)))*mix(.9, 1.06, grain);
  s.a = mix(paint, wood, chip); s.a *= 1. - gap*.75;
  s.h = .6 - gap*.8 - chip*.2 + (grain - .5)*.15; s.r = mix(.7, .9, chip); s.m = 0.; s.o = 1. - gap*.6; return s;
}
S surf(vec2 uv){
  if (uKind == 0) return sheetWall(uv);
  if (uKind == 12) return doorLeaf(uv);
  if (uKind == 13) return paint(uv, uC1, 0., uWear);
  if (uKind == 1) return cream(uv);
  if (uKind == 2) return plaster(uv);
  if (uKind == 3) return tile(uv);
  if (uKind == 4) return tread(uv);
  if (uKind == 5) return concrete(uv);
  if (uKind == 6) return metalK(uv, uC1, uC2, .1);
  if (uKind == 7) return metalK(uv, uC1, uC2, .26);
  if (uKind == 9) return ground(uv);
  if (uKind == 10) return corrugated(uv);
  if (uKind == 11) return planks(uv);
  return iron(uv);
}
void main(){
  vec2 uv = vUv;
  if (uMode == 0){ S s = surf(uv); gl_FragColor = vec4(s.a, 1.); }
  else if (uMode == 1){
    float h0 = surf(uv).h, hx = surf(uv + vec2(uTexel.x, 0.)).h, hy = surf(uv + vec2(0., uTexel.y)).h;
    vec3 n = normalize(vec3((h0 - hx)*uNS, (h0 - hy)*uNS, 1.)); gl_FragColor = vec4(n*.5 + .5, 1.);
  } else { S s = surf(uv); gl_FragColor = vec4(clamp(s.o,0.,1.), clamp(s.r,0.04,1.), clamp(s.m,0.,1.), 1.); }
}`;
const bakeMat = new THREE.ShaderMaterial({
  vertexShader: VS, fragmentShader: BAKE_FRAG, depthTest: false, depthWrite: false,
  uniforms: { uKind: { value: 0 }, uMode: { value: 0 }, uTexel: { value: new THREE.Vector2() }, uC1: { value: new V3() }, uC2: { value: new V3() }, uSeed: { value: 0 }, uNS: { value: 4 }, uWear: { value: 0 }, uMossH: { value: .06 } },
});
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
async function bake(kind, size, o = {}) {
  if (isTouch) size = Math.max(256, size >> 1);   // phones: a quarter of the texels (each bake keeps three mipmapped targets in GPU memory)
  const u = bakeMat.uniforms;
  u.uKind.value = kind; u.uTexel.value.set(1 / size, 1 / size); u.uC1.value.set(...(o.c1 || [.5, .5, .5])); u.uC2.value.set(...(o.c2 || [.1, .1, .1]));
  u.uSeed.value = o.seed ?? 0.0; u.uNS.value = (o.ns ?? 4) * size / 1024; u.uWear.value = o.wear ?? 0; u.uMossH.value = o.moss ?? .06;
  const mk = (type) => { const t = new THREE.WebGLRenderTarget(size, size, { type, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    t.texture.anisotropy = Math.min(8, MAX_ANISO); return t; };
  const out = { map: mk(THREE.HalfFloatType), normal: mk(THREE.UnsignedByteType), orm: mk(THREE.UnsignedByteType) };
  const strips = size >= 1024 ? 4 : 1;
  for (const [mode, rt] of [[0, out.map], [1, out.normal], [2, out.orm]]) {
    u.uMode.value = mode;
    renderer.setRenderTarget(rt);
    renderer.setScissorTest(true);
    for (let s = 0; s < strips; s++) {
      const y0 = Math.floor(size * s / strips), y1 = Math.floor(size * (s + 1) / strips);
      rt.scissor.set(0, y0, size, y1 - y0); rt.scissorTest = true; rt.viewport.set(0, 0, size, size);
      fsMesh.material = bakeMat; renderer.setRenderTarget(rt); renderer.render(fsScene, fsCam);
    }
    rt.scissorTest = false; renderer.setScissorTest(false);
    renderer.setRenderTarget(null);
    await nextFrame();
  }
  return { map: out.map.texture, normal: out.normal.texture, orm: out.orm.texture };
}
