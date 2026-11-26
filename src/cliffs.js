/* ======================================================================
   FLOOR 3 · UPDRAFT, THE SEA CLIFFS: a snippet of the sea-cliffs world from Updraft, let into the building.
   The room has gone to meadow: tall grass fills it, a river comes in through a breach in the right wall,
   crosses the room and runs out where the far wall has fallen away, then over the cliff edge into the sea.
   Gulls fly in and out under the ceiling. A shallow spill off the river reaches the lift doors, so the cab
   takes on water as it arrives, before the doors open. Sky plate and far cliffs: the Updraft paintings
   (images/cliffs/). Built after the start screen, like the gallery (ensureSeaCliffs).
   Room-local space: y = 0 is this floor, the lift wall's face is z = WALL_Z, the room opens toward +z
   (so looking out, +x is on the left).
   ====================================================================== */
const SC_FLOOR = 3;
const SC = { x0: -4.2, x1: 4.2, z1: 9.0, h: 3.3, op0: -3.0, op1: 3.3, opH: 2.85, sea: -64, edge: 17.5, inflow: 4.4 };
const scRoom = new THREE.Group(); scRoom.visible = false; scene.add(scRoom);
const SC_SUN = new V3(-.62, -.56, -.55).normalize();   // the sun's travel direction on floor 3
const SC_OBST = [];                   // [x0, x1, z0, z1] the player walks around
const SC_LIVE = { built: false, fill: 0, level: 0, birds: null, gulls: null, dome: null, cab: null, lamp: null, nextGull: 0 };
const SC_U = { uTime: MOTE_U.uTime, uSunDir: { value: sunDir }, uSunC: UNI.sunCol, tNoise: { value: null }, tSky: { value: null }, uHaze: { value: new V3(.36, .47, .62) },
  tShadow: MOTE_U.tShadow, uShadowMat: MOTE_U.uShadowMat, uFloorY: { value: SC_FLOOR * H }, uRoom: { value: new THREE.Vector4(SC.x0, SC.x1, WALL_Z, SC.z1) }, uCeil: { value: SC.h }, uOp: { value: new THREE.Vector3(SC.op0, SC.op1, SC.opH) } };

/* ---- the land: the cliff edge, the river, the spill to the doors, the ground between ---- */
function scEdge(x) { return SC.edge - .008 * x * x + 1.6 * Math.sin(x * .21 + .8) + .7 * Math.sin(x * .57 + 2.1); }
function scPath(ctrl, step) {                         // a smooth polyline through control points, with distance along it and a 2 m grid index
  const c = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new V3(x, 0, z)), false, 'centripetal');
  const n = Math.ceil(c.getLength() / step), pts = c.getSpacedPoints(n), out = []; let s = 0;
  pts.forEach((p, i) => { if (i) s += p.distanceTo(pts[i - 1]); out.push({ x: p.x, z: p.z, s }); });
  const ix = new Map();
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    for (let cx = Math.floor(Math.min(a.x, b.x) / 2); cx <= Math.floor(Math.max(a.x, b.x) / 2); cx++)
      for (let cz = Math.floor(Math.min(a.z, b.z) / 2); cz <= Math.floor(Math.max(a.z, b.z) / 2); cz++) { const k = cx * 4099 + cz; if (!ix.has(k)) ix.set(k, []); ix.get(k).push(i); }
  }
  out.ix = ix; return out;
}
// distance to a polyline and how far along it; only segments within ~2 m are looked at (farther than that reads as 9 m)
function scNear(path, x, z) {
  let best = 1e9, bs = 0; const cx = Math.floor(x / 2), cz = Math.floor(z / 2);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const l = path.ix.get((cx + dx) * 4099 + cz + dz); if (!l) continue;
    for (const i of l) {
      const a = path[i - 1], b = path[i], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1e-9;
      const t = clamp(((x - a.x) * ex + (z - a.z) * ez) / l2, 0, 1), px = a.x + ex * t - x, pz = a.z + ez * t - z, d = px * px + pz * pz;
      if (d < best) { best = d; bs = a.s + (b.s - a.s) * t; }
    }
  }
  return best > 80 ? { d: 9, s: 0 } : { d: Math.sqrt(best), s: bs };
}
const SC_RIVER = scPath([[40, 3.2], [26, 5.6], [16, 7.3], [9.5, 7.5], [6.2, 6.9], [4.4, 6.45], [3.2, 6.1], [2.2, 6.3], [1.3, 6.85], [.4, 7.45], [-.6, 8.05], [-1.4, 8.7], [-1.9, 9.6], [-2.2, 11.0], [-2.1, 12.6], [-2.45, 14.2], [-2.3, 15.6], [-2.25, scEdge(-2.25) - .05]], .12);
const SC_SPILL = scPath([[1.55, 6.15], [1.05, 5.3], [.55, 4.2], [.25, 3.0], [.08, 1.8], [0, .9], [0, .02]], .1);
const scRiverW = (x, z) => (x > SC.x1 || z > SC.z1 ? .68 : .55);   // half width
const scSpillW = (z) => lerp(.62, .3, clamp(z / 6, 0, 1));
// the ground before the river cuts it: tussocks, a gentle roll outside, rising beside the room, a grassy lip at the edge
function scGroundBase(x, z, inRiver) {
  let h = .035 * Math.sin(x * 1.7 + z * .9) + .03 * Math.sin(x * 3.1 - z * 2.3 + 1.3) + .02 * Math.sin(z * 4.1 + x * .6);
  h += sstep(SC.z1 - .5, SC.z1 + 4, z) * (.12 * Math.sin(x * .43 + 1.1) + .08 * Math.sin(z * .61 + x * .2));
  h += sstep(5, 14, Math.abs(x)) * (.25 * Math.sin(z * .3 + x * .17) + .3);
  const e = scEdge(x); h += .18 * sstep(e - 3, e - .7, z) * (1 - sstep(e - .7, e, z) * .6) * (1 - inRiver);
  return h;
}
function scRiverIn(x, z) { const r = scNear(SC_RIVER, x, z), w = scRiverW(x, z); return 1 - sstep(w * .55, w * 1.3, r.d); }
function scGroundH(x, z) {
  const rin = scRiverIn(x, z);
  let h = scGroundBase(x, z, rin) - .2 * rin;
  if (z < 6.6 && Math.abs(x) < 2.6) { const s = scNear(SC_SPILL, x, z), sw = scSpillW(z); h -= .045 * (1 - sstep(sw * .5, sw * 1.35, s.d)); }
  h -= .035 * (1 - sstep(.5, 1.6, Math.hypot(x, z - WALL_Z)));            // the doors sit in a dip where the water pools
  return h;
}
const scRiverY = (x, z) => scGroundBase(x, z, 1) - .065;
function scWaterAt(x, z) {                            // standing in water? (steps splash)
  if (scNear(SC_RIVER, x, z).d < scRiverW(x, z) * .95) return true;
  if (z < 6.6 && Math.abs(x) < 2.6 && scNear(SC_SPILL, x, z).d < scSpillW(z) * .9) return true;
  return Math.hypot(x, z - WALL_Z) < 1.0;
}

/* ---- a tileable noise texture for wind, water and rock (r, g: fbm with different seeds, b: ridged, a: fine) ---- */
function scNoiseTex() {
  const N = 256, f1 = [noiseField(N, 4, 11), noiseField(N, 8, 12), noiseField(N, 16, 13), noiseField(N, 32, 14)];
  const f2 = [noiseField(N, 4, 21), noiseField(N, 8, 22), noiseField(N, 16, 23)], f3 = [noiseField(N, 8, 31), noiseField(N, 16, 32)], f4 = noiseField(N, 64, 41);
  const d = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const a = f1[0][i] * .5 + f1[1][i] * .27 + f1[2][i] * .15 + f1[3][i] * .08, b = f2[0][i] * .55 + f2[1][i] * .3 + f2[2][i] * .15;
    const r = 1 - Math.abs(f3[0][i] * 2 - 1) * .65 - Math.abs(f3[1][i] * 2 - 1) * .35;
    d[i * 4] = a * 255; d[i * 4 + 1] = b * 255; d[i * 4 + 2] = clamp(r, 0, 1) * 255; d[i * 4 + 3] = f4[i] * 255;
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

/* ---- shader snippets shared by the sky, the water, the rock and the far layers ---- */
const SC_GLSL = /* glsl */`
uniform float uTime, uFloorY, uCeil; uniform vec3 uSunDir, uSunC, uHaze, uOp; uniform sampler2D tNoise, tSky, tShadow; uniform mat4 uShadowMat; uniform vec4 uRoom;
${PACK}
float scs(float a, float b, float x){ float t = clamp((x - a)/(b - a), 0., 1.); return t*t*(3. - 2.*t); }
// the Updraft sky plate: 180 degrees of azimuth centred on the view out of the room (+z), mirrored behind; 66 deg above to 10 below the horizon
vec3 skyPlate(vec3 d){
  float az = atan(d.x, d.z), el = degrees(asin(clamp(d.y, -1., 1.)));
  vec2 uv = vec2(.5 - az/3.14159265, 1. - clamp((66. - el)/76., .002, .998));
  vec3 c = pow(texture2D(tSky, uv).rgb, vec3(2.2))*2.3;
  if (el < -10.) c *= mix(1., .55, scs(-10., -35., el));
  return c;
}
vec3 sunGlow(vec3 d){ float mu = max(dot(d, -uSunDir), 0.); return uSunC*(pow(mu, 8.)*.02 + pow(mu, 90.)*.12 + scs(.99965, .9999, mu)*4.); }
// aerial perspective: far things sink into the haze of the sky behind them
vec3 haze(vec3 col, vec3 w, float k){ vec3 v = w - cameraPosition; float d = length(v); float f = 1. - exp(-d*k); vec3 hc = mix(uHaze, skyPlate(normalize(vec3(v.x, max(v.y, 0.)*.3 + .01, v.z))), .3); return mix(col, hc, clamp(f, 0., 1.)); }
float sunLit(vec3 w){ vec4 sc = uShadowMat*vec4(w, 1.); if (sc.x <= 0. || sc.x >= 1. || sc.y <= 0. || sc.y >= 1. || sc.z >= 1.) return 1.;
  float l = 0.; for (int i = 0; i < 4; i++){ vec2 o = vec2(i == 0 ? -1. : i == 1 ? 1. : 0., i == 2 ? -1. : i == 3 ? 1. : 0.)*.0007; l += step(sc.z, unpackDepth(texture2D(tShadow, sc.xy + o)) + .0015); } return l*.25; }
// what water reflects: the sky, unless it is inside the room and the reflected ray doesn't leave through the gap
vec3 reflectEnv(vec3 wl, vec3 r){
  vec3 s = skyPlate(r) + sunGlow(r);
  if (wl.z < uRoom.w){
    bool outside = false;
    if (r.z > 0.){ float t = (uRoom.w - wl.z)/r.z; vec2 h = vec2(wl.x + r.x*t, wl.y + r.y*t); outside = h.y < uOp.z && h.x > uOp.x && h.x < uOp.y; }
    if (!outside) s = vec3(.05, .056, .05)*(1. + 2.5*scs(uRoom.w - 3.5, uRoom.w, wl.z));   // the room's own walls and ceiling, brighter toward the gap
  }
  return s;
}
vec3 waterN(vec2 p, vec2 flow, float amp, float sc){
  vec2 q = p*sc; float e = .02;
  float h0 = texture2D(tNoise, q + flow*uTime).r + .5*texture2D(tNoise, q*2.3 - flow.yx*uTime*1.3).g;
  float hx = texture2D(tNoise, q + vec2(e, 0.) + flow*uTime).r + .5*texture2D(tNoise, (q + vec2(e, 0.))*2.3 - flow.yx*uTime*1.3).g;
  float hz = texture2D(tNoise, q + vec2(0., e) + flow*uTime).r + .5*texture2D(tNoise, (q + vec2(0., e))*2.3 - flow.yx*uTime*1.3).g;
  return normalize(vec3(-(hx - h0)/e*amp, 1., -(hz - h0)/e*amp));
}`;
// transparent water keeps the frame's alpha (the painted looks read alpha as "keep sharp")
function scBlend(m) { m.transparent = true; m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.depthWrite = false; return m; }
function scShader(o) { const { uniforms, ...rest } = o; const m = new THREE.ShaderMaterial(rest); m.uniforms = Object.assign({}, SC_U, uniforms || {}); return m; }
const SC_VS = /* glsl */`varying vec3 vW; varying vec3 vL; void main(){ vL = position; vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
function scTex(c, repeat = true) { const t = new THREE.Texture(c); t.colorSpace = THREE.SRGBColorSpace; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, MAX_ANISO); t.needsUpdate = true; return t; }   // plain Textures: the painted looks treat them as walls, not signage

/* ---- the sky: a dome round the camera carrying the plate, the sun's glow on top ---- */
function scDome() {
  const m = scShader({ side: THREE.BackSide, depthWrite: false, vertexShader: SC_VS, fragmentShader: SC_GLSL + `varying vec3 vW; varying vec3 vL; void main(){ vec3 d = normalize(vW - cameraPosition); gl_FragColor = vec4(skyPlate(d) + sunGlow(d), 1.); }` });
  const d = new THREE.Mesh(new THREE.SphereGeometry(380, 48, 24), m); d.frustumCulled = false; d.renderOrder = -9; d.visible = false; scene.add(d); return d;
}

/* ---- the far cliffs: the three Updraft paintings on arcs round the room, real parallax as you walk ---- */
function scLayer(tex, R, a0, a1, base, hz, tint, order) {
  const segs = 24, iw = tex.image.width, ih = tex.image.height, arc = R * (a1 - a0), hgt = arc * ih / iw, P = [], UV = [], I = [];
  for (let i = 0; i <= segs; i++) { const a = lerp(a0, a1, i / segs), x = Math.sin(a) * R, z = Math.cos(a) * R; P.push(x, base, z, x, base + hgt, z); UV.push(1 - i / segs, 0, 1 - i / segs, 1); }
  for (let i = 0; i < segs; i++) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
  const m = scBlend(scShader({ side: THREE.DoubleSide, uniforms: { tLayer: { value: tex }, uTint: { value: new V3(...tint) }, uHz: { value: hz } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SC_GLSL + `uniform sampler2D tLayer; uniform vec3 uTint; uniform float uHz; varying vec2 vUv; varying vec3 vW;
      void main(){ vec4 c = texture2D(tLayer, vUv); c.a *= scs(0., .04, vUv.x)*scs(1., .96, vUv.x); if (c.a < .01) discard;
        vec3 col = pow(c.rgb, vec3(2.2))*2.2*uTint; col = mix(col, haze(col, vW, .0025), uHz); gl_FragColor = vec4(col, c.a); }` }));
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = order; mesh.frustumCulled = false; return mesh;
}

/* ---- sea stacks: Updraft's stack shape (strata ledges, buttresses, gullies, a talus skirt), smaller ---- */
function scStackR(st, th, u) {
  const s = st.ph; th += .35 * Math.sin(u * 2.6 + s[1]) + .15 * Math.sin(u * 7.1 + s[3]);
  let a = 1 + .17 * Math.sin(2 * th + s[0] + u * .9) + .1 * Math.sin(3 * th + s[1] - u * .7) + .055 * Math.sin(5 * th + s[2] + u * 1.7) + .03 * Math.sin(9 * th + s[3]);
  a += .1 * Math.pow(Math.max(0, Math.sin(4 * th + s[3] + .5 * Math.sin(2 * th))), 3) - .09 * Math.pow(Math.max(0, Math.sin(7 * th + s[4] + .7 * Math.sin(3 * th + s[0]))), 5);
  a += .045 * Math.sin(23 * th + s[2] + 2 * Math.sin(5 * th)) + .022 * Math.sin(41 * th + s[1]) - .08 * Math.pow(Math.max(0, Math.sin(11 * th + s[0] + Math.sin(3 * th))), 6);   // basalt fluting and deep cracks
  const y = u * st.h, ly = y / st.layer + .45 * Math.sin(y / st.layer * .31 + st.seed), k = Math.floor(ly), f = ly - k;
  const hard = (n) => { const h = (Math.sin((n + st.seed) * 91.7) * 43758.5453) % 1; return Math.abs(h) > .7 ? .05 : Math.abs(h) > .3 ? 0 : -.03; };
  a *= 1 + hard(k - 1) + (hard(k) - hard(k - 1)) * sstep(0, .25, f);                   // hard beds stand out as ledges
  a *= 1 + .12 * Math.sin(y / 30 + s[0] + th) + .06 * Math.sin(y / 13 + s[3] - 2 * th);
  a *= (1 - st.taper * u) * (1 + .22 * (1 - sstep(0, .09, u)));
  return st.r * a;
}
function scStackGeo(st) {
  const NT = 96, NY = 64, P = [], C = [], I = [];
  for (let j = 0; j <= NY; j++) { const u = j / NY; for (let i = 0; i <= NT; i++) { const th = i / NT * 6.2831853, R = scStackR(st, th, u); P.push(st.x + Math.cos(th) * R, st.y0 + u * st.h, st.z + Math.sin(th) * R); C.push(u, 0); } }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NT; i++) { const a = j * (NT + 1) + i, b = a + 1, c = a + NT + 1, d = c + 1; I.push(a, c, b, b, c, d); }
  const base = P.length / 3;
  for (let k = 0; k <= 6; k++) { const q = 1 - k / 6 * .999; for (let i = 0; i <= NT; i++) { const th = i / NT * 6.2831853, R = scStackR(st, th, 1) * q; P.push(st.x + Math.cos(th) * R, st.y0 + st.h + st.r * .12 * (1 - q * q), st.z + Math.sin(th) * R); C.push(1, 1); } }
  for (let k = 0; k < 6; k++) for (let i = 0; i < NT; i++) { const a = base + k * (NT + 1) + i, b = a + 1, c = a + NT + 1, d = c + 1; I.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aUC', new THREE.Float32BufferAttribute(C, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
}
// basalt: beds of different shade, dark seams under the ledges, water stains, moss on the benches; lit by the sun, sunk in haze
function scRockMat(seed, near) {
  return scShader({ uniforms: { uSeed: { value: seed }, uNear: { value: near ? 1 : 0 } },
    vertexShader: `attribute vec2 aUC; varying vec3 vW; varying vec3 vN; varying vec2 vUC; void main(){ vUC = aUC; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SC_GLSL + `uniform float uSeed, uNear; varying vec3 vW; varying vec3 vN; varying vec2 vUC;
      float n2(vec2 p){ return texture2D(tNoise, p).r; }
      void main(){
        vec3 N = normalize(vN), wl = vW - vec3(0., uFloorY, 0.);
        float hgt = n2(vec2(wl.x + wl.z, wl.y*.22)*.02 + uSeed) + .5*n2(vec2(wl.x - wl.z, wl.y)*.07) + .25*n2(vec2(wl.x*.7 + wl.z*.7, wl.y*.6)*.25);
        vec3 dpx = dFdx(vW), dpy = dFdy(vW); float dhx = dFdx(hgt), dhy = dFdy(hgt);
        vec3 r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1);
        N = normalize(mix(N, normalize(abs(det)*N - sign(det)*(dhx*r1 + dhy*r2)*(uNear > .5 ? 2.2 : 2.6)), .9));
        float ly = wl.y/(uNear > .5 ? 2.6 : 9.) + uSeed + .45*sin(wl.y*.07) + .25*sin(wl.x*.05 + wl.z*.04); float k = floor(ly), f = fract(ly);
        float hk = fract(sin(k*91.7 + uSeed*13.1)*43758.5453);
        float streak = n2(vec2((wl.x + wl.z)*.05 + uSeed, wl.y*.008)), mott = n2((wl.xz + wl.y)*.018 + uSeed*.37), fine = n2((wl.xz - wl.y)*.11);
        vec3 rock = mix(vec3(.06, .066, .075), vec3(.19, .18, .165), scs(.25, .8, mott*.7 + fine*.3));
        rock *= .86 + .24*hk; rock *= mix(1., .7, scs(.84, .97, f)); rock *= mix(.55, 1.2, scs(.28, .75, streak));
        float mossN = n2(wl.xz*.06 + wl.y*.04 + 7.), ledge = scs(.3, .65, N.y + .3*(mossN - .5))*scs(.42, .7, n2(wl.xz*.02 + 11.));
        float moss = max(ledge*.85, scs(.62, .8, mossN)*scs(-.1, .25, N.y)*.6);
        vec3 alb = mix(rock, mix(vec3(.05, .11, .02), vec3(.15, .27, .05), mossN), moss);
        alb = mix(alb, vec3(.12, .24, .05), vUC.y*scs(.3, .6, N.y));
        float wy = wl.y - (${SC.sea.toFixed(1)}); alb *= mix(.45, 1., scs(0., 9., wy));
        float sh = sunLit(vW + N*.05);
        vec3 E = uSunC*sh*max(dot(N, -uSunDir), 0.)/3.14159;
        vec3 amb = mix(vec3(.16, .2, .26), vec3(.34, .45, .6), N.y*.5 + .5)*.9;
        vec3 col = alb*(E + amb*mix(.55, 1., scs(0., .25, vUC.x)));
        col += alb*vec3(.3, .4, .55)*.35*pow(1. - max(dot(N, normalize(cameraPosition - vW)), 0.), 3.);
        gl_FragColor = vec4(haze(col, vW, uNear > .5 ? .001 : .00115), 1.);
      }` });
}

/* ---- the cliff under the meadow: a curtain from the edge down to the sea, ledged and overhung ---- */
function scCliffGeo() {
  const xs = [], P = [], C = [], I = []; for (let x = -150; x <= 150.01; x += 1.5) xs.push(x);
  const NY = 40;
  xs.forEach((x) => {
    const e = scEdge(x), dx = scEdge(x + .5) - scEdge(x - .5), nl = Math.hypot(dx, 1), nx = -dx / nl, nz = 1 / nl;   // outward normal of the edge line
    for (let j = 0; j <= NY; j++) {
      const u = j / NY, y = lerp(scGroundH(x, e) - .03, SC.sea - 3, Math.pow(u, 1.15));
      const ledges = .55 * Math.sin(y * .9 + x * .05) + .35 * Math.sin(y * 2.3 + x * .13 + 1.7) + .9 * Math.sin(x * .19 + y * .07);
      const out = (j === 0 ? 0 : ledges * sstep(0, .06, u)) + 2.2 * sstep(.82, 1, u) - (j === 1 ? .25 : 0);   // an undercut lip, ledges, a talus skirt at the foot
      P.push(x + nx * out, y, e + nz * out); C.push(u, 0);
    }
  });
  const W = NY + 1; for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < NY; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aUC', new THREE.Float32BufferAttribute(C, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
}

/* ---- ground: the room floor gone to soil and moss, the meadow out to the edge and round the sides ---- */
function scGroundGeo(xs, front, back) {    // columns at xs; each runs from behind the building (back rows) or the lift wall to the cliff edge
  const P = [], Cl = [], I = [], col = new THREE.Color(), mud = new THREE.Color(.06, .05, .035), mead = new THREE.Color(.12, .24, .05);
  for (const x of xs) {
    const e = scEdge(x), z0 = back ? Math.min(0, e - 2) : WALL_Z + .02, zs = [];
    if (back) for (let k = 0; k < 8; k++) zs.push(z0 - 60 * Math.pow(1 - k / 8, 2));
    for (let k = 0; k <= front; k++) zs.push(lerp(z0, e, k / front));
    for (const z of zs) {
      const y = scGroundH(x, z); P.push(x, y, z);
      const wet = 1 - sstep(scRiverW(x, z) * .9, scRiverW(x, z) * 2.2, scNear(SC_RIVER, x, z).d);
      const inRoom = x > SC.x0 && x < SC.x1 && z < SC.z1, n = .5 + .5 * Math.sin(x * 2.3 + z * 1.7) * Math.sin(x * .7 - z * 1.3);
      col.setRGB(lerp(.11, .07, n), lerp(.15, .1, n), lerp(.05, .035, n));            // mossy soil under the grass
      if (!inRoom) col.lerp(mead, .6);
      col.lerp(mud, wet * .8);                                                          // dark mud along the water
      Cl.push(col.r, col.g, col.b);
    }
  }
  const W = (back ? 8 : 0) + front + 1;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < W - 1; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cl, 3)); g.setIndex(I); g.computeVertexNormals();
  return g;
}
function scGroundMat() {
  const [c, x] = cv(512, 512), r = rng(51);
  x.fillStyle = '#8a8a80'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const v = 90 + r() * 120; x.fillStyle = `rgba(${v},${v},${v * .92},${.15 + r() * .3})`; x.beginPath(); x.arc(r() * 512, r() * 512, 1 + r() * r() * 9, 0, 6.283); x.fill(); }
  for (let i = 0; i < 500; i++) { x.strokeStyle = `rgba(40,40,30,${.2 + r() * .3})`; x.lineWidth = .6 + r(); x.beginPath(); const px = r() * 512, py = r() * 512, a = r() * 6.28; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 14, py + Math.sin(a) * 14); x.stroke(); }
  const m = new THREE.MeshStandardMaterial({ map: scTex(c), vertexColors: true, roughness: .95, metalness: 0, envMapIntensity: .15 });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = position.xz*.55;\n#endif'); };
  m.customProgramCacheKey = () => 'scGround';
  return m;
}

/* ---- tall grass: instanced blades bent in an arc by the wind (Updraft's grass), sunlight glowing through them ---- */
const SC_BLADE_GLSL = /* glsl */`
attribute vec3 iPos; attribute vec4 iProp; attribute vec3 iTint;
uniform float uTime, uFloorY; uniform sampler2D tNoise;
varying float vT; varying vec3 vTint;
vec3 bladePos(out vec3 nrm){
  float t = position.y, Hh = iProp.x, Wd = iProp.y, yaw = iProp.z, sd = iProp.w;
  vec2 base = iPos.xz, wdir = normalize(vec2(-.28, -1.));
  float g = texture2D(tNoise, (base - wdir*uTime*1.7)*.05).r, g2 = texture2D(tNoise, (base - wdir*uTime*2.9)*.21 + .37).g;
  float bend = .1 + 1.05*g*g + .16*g2 + .05*sin(uTime*(1.7 + fract(sd)*2.) + sd*.4);
  bend = clamp(bend, .04, 1.25);
  vec2 bdir = normalize(wdir + vec2(sin(sd*.21), cos(sd*.17))*.4);
  float phi = bend*t, hx = Hh/bend*(1. - cos(phi)), hy = Hh/bend*sin(phi);
  vec3 bd3 = vec3(bdir.x, 0., bdir.y), side = vec3(cos(yaw), 0., sin(yaw));
  vec3 camL = cameraPosition - vec3(0., uFloorY, 0.);
  vec3 toCam = normalize(vec3(camL.x - iPos.x, 0., camL.z - iPos.z) + vec3(1e-4, 0., 0.));
  side = normalize(mix(side, normalize(cross(vec3(0., 1., 0.), toCam) + vec3(0., 0., 1e-5)), .5));
  float w = Wd*(1. - .82*pow(t, 1.3));
  vec3 tangent = normalize(bd3*sin(phi) + vec3(0., cos(phi), 0.));
  nrm = normalize(cross(side, tangent) + vec3(0., .3, 0.));
  vT = t; vTint = iTint;
  return iPos + bd3*hx + vec3(0., hy, 0.) + side*position.x*w;
}`;
function scBladeGeo(segs) {
  const pos = [], idx = [];
  for (let i = 0; i < segs; i++) { const t = i / segs; pos.push(-.5, t, 0, .5, t, 0); }
  pos.push(0, 1, 0);
  for (let i = 0; i < segs - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const a = (segs - 1) * 2; idx.push(a, a + 1, segs * 2);
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((v, i) => i % 3 === 2 ? 1 : 0), 3)); g.setIndex(idx); return g;
}
function scGrassMats() {
  const U = { uTime: MOTE_U.uTime, uFloorY: SC_U.uFloorY, tNoise: SC_U.tNoise, uSunV: UNI.sunView };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .62, metalness: 0, side: THREE.DoubleSide, envMapIntensity: .25 });
  // the sun's light as it reaches this blade (after its shadow), kept for the glow through the blade
  const lights = THREE.ShaderChunk.lights_fragment_begin, cut = lights.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
  const lightsSun = 'vec3 gSunLit = vec3(0.);\n' + lights.slice(0, cut) + lights.slice(cut).replace('RE_Direct( directLight, geometryPosition', 'gSunLit += directLight.color;\n\t\tRE_Direct( directLight, geometryPosition');
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + SC_BLADE_GLSL)
      .replace('#include <beginnormal_vertex>', 'vec3 bN; vec3 bP = bladePos(bN); vec3 objectNormal = bN;')
      .replace('#include <begin_vertex>', 'vec3 transformed = bP;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vT; varying vec3 vTint; uniform vec3 uSunV;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // spring green going to straw at the tips (the sea-cliffs palette), dark at the roots
        vec3 tipC = mix(vec3(.15, .27, .05), vec3(.3, .38, .1), vTint.x), midC = vec3(.055, .14, .03)*(.85 + .3*vTint.y), baseC = vec3(.015, .04, .012);
        vec3 bc = mix(baseC, midC, smoothstep(0., .5, vT)); bc = mix(bc, tipC, smoothstep(.45, 1., vT));
        diffuseColor.rgb = bc*(1. + vTint.z*.25);`)
      .replace('#include <lights_fragment_begin>', lightsSun)
      .replace('#include <opaque_fragment>', `
        vec3 Vv = normalize(-vViewPosition); float back = pow(max(dot(Vv, uSunV), 0.), 3.);
        outgoingLight += diffuseColor.rgb*gSunLit*(back*1.6*smoothstep(.25, 1., vT) + .12*smoothstep(.3, 1., vT));
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'scGrass';
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  d.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + SC_BLADE_GLSL).replace('#include <begin_vertex>', 'vec3 bN; vec3 transformed = bladePos(bN);'); };
  d.customProgramCacheKey = () => 'scGrassDepth';
  return [m, d];
}
function scGrass(mat, depth, segs, pts) {
  const g = scBladeGeo(segs), n = pts.length, P = new Float32Array(n * 3), Q = new Float32Array(n * 4), T = new Float32Array(n * 3);
  pts.forEach((p, i) => { P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; Q[i * 4] = p[3]; Q[i * 4 + 1] = p[4]; Q[i * 4 + 2] = p[5]; Q[i * 4 + 3] = p[6]; T[i * 3] = p[7]; T[i * 3 + 1] = p[8]; T[i * 3 + 2] = p[9]; });
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iProp', new THREE.InstancedBufferAttribute(Q, 4)); g.setAttribute('iTint', new THREE.InstancedBufferAttribute(T, 3));
  g.instanceCount = n;
  const m = new THREE.Mesh(g, mat); m.customDepthMaterial = depth; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; return m;
}
function scPlantGrass() {
  const r = rng(303), room = [], out = [], dense = isTouch ? .55 : 1;
  const blocked = (x, z) => {
    if ((Math.abs(x - SC.x0 - .1) < .14 || Math.abs(x - SC.x1 + .1) < .14) && z < SC.z1 + .3) return true;
    if (z > SC.z1 - .05 && z < SC.z1 + .3 && (x < SC.op0 + .05 || x > SC.op1 - .05)) return true;
    if (Math.hypot(x, z - WALL_Z) < .95 || z < WALL_Z + .15) return true;
    if (SC_OBST.some(q => x > q[0] - .05 && x < q[1] + .05 && z > q[2] - .05 && z < q[3] + .05)) return true;
    if (scNear(SC_RIVER, x, z).d < scRiverW(x, z) * 1.02) return true;
    if (z < 6.6 && Math.abs(x) < 2.6 && scNear(SC_SPILL, x, z).d < scSpillW(z) * .75 && r() > .12) return true;
    return z > scEdge(x) - .35;
  };
  const add = (list, x, z, h0, h1, wd) => list.push([x, scGroundH(x, z) - .02, z, lerp(h0, h1, Math.pow(r(), .8)), wd * (.75 + r() * .5), r() * 6.283, r() * 100, r(), r(), (r() - .5) * .6]);
  // the room: dense and tall, shorter near the doors
  const nRoom = Math.round(7200 * dense);
  for (let i = 0; i < nRoom * 3 && room.length < nRoom; i++) { const x = lerp(SC.x0 + .1, SC.x1 - .1, r()), z = lerp(WALL_Z + .1, SC.z1 + .2, r()); if (!blocked(x, z)) add(room, x, z, .55 + .45 * sstep(1, 6, z), 1.15 + .4 * sstep(1, 7, z), .04); }
  // out on the meadow to the edge, and beside the room (seen through the breaches); thinner further away
  const nOut = Math.round(16000 * dense);
  for (let i = 0; i < nOut * 4 && out.length < nOut; i++) {
    const nearIn = r() < .6, x = nearIn ? lerp(-8.5, 8.5, r()) : lerp(-13, 13, r()), z = nearIn ? lerp(SC.z1 + .2, scEdge(x), r()) : lerp(WALL_Z + .2, scEdge(x), r());
    if (x > SC.x0 - .25 && x < SC.x1 + .25 && z < SC.z1 + .3) continue;
    const far = sstep(8.5, 13, Math.abs(x)) * .45; if (r() < far) continue;
    if (!blocked(x, z)) add(out, x, z, .75, 1.6, .055);
  }
  return [room, out];
}

/* ---- water: the river ribbon, the spill to the doors, the fall over the edge, the sea ---- */
function scRibbon(path, half, yOf) {
  const P = [], A = [], I = []; let n = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i], q = path[Math.min(i + 1, path.length - 1)], o = path[Math.max(i - 1, 0)], dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, w = half(p);
    for (const k of [-1, 1]) { const x = p.x + nx * w * k, z = p.z + nz * w * k; P.push(x, yOf(p), z); A.push(p.s, k); }
    n++;
  }
  for (let j = 0; j < n - 1; j++) { const a = j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aSW', new THREE.Float32BufferAttribute(A, 2)); g.setIndex(I); return g;
}
function scStreamMat(kind) {      // kind 0: the river, 1: the thin spill running to the doors
  return scBlend(scShader({ uniforms: { uKind: { value: kind } }, side: THREE.DoubleSide,
    vertexShader: `attribute vec2 aSW; varying vec2 vSW; varying vec3 vW; varying vec3 vL; void main(){ vSW = aSW; vL = position; vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SC_GLSL + `uniform float uKind; varying vec2 vSW; varying vec3 vW; varying vec3 vL;
      void main(){
        float across = vSW.y, edge = 1. - abs(across), spill = step(.5, uKind);
        vec2 fp = vec2(vSW.x, across*mix(.9, .5, spill));                    // flow space: along, across
        vec3 N = waterN(fp, vec2(-.55*mix(1., .7, spill), 0.), mix(.09, .05, spill), .35);
        N = normalize(vec3(N.x*.8, N.y, N.z*.8));
        vec3 V = normalize(cameraPosition - vW), R = reflect(-V, N); R.y = abs(R.y) + .02;
        float F = .02 + .98*pow(1. - max(dot(N, V), 0.), 5.);
        float lit = sunLit(vW + vec3(0., .02, 0.));
        vec3 body = mix(mix(vec3(.08, .09, .05), vec3(.012, .04, .04), scs(.2, .9, edge)), vec3(.05, .06, .035), spill);
        vec3 amb = vec3(.25, .32, .4)*(vL.z > uRoom.w ? 1. : .55);
        vec3 col = body*(uSunC*lit*.12 + amb);
        col = mix(col, reflectEnv(vL, R), F*.9);
        vec3 H = normalize(-uSunDir + V);
        col += uSunC*lit*(pow(max(dot(N, H), 0.), 600.)*2.5 + pow(max(dot(N, H), 0.), 60.)*.05);
        float fn = texture2D(tNoise, vec2(vSW.x*.5 - uTime*.6, across*.4)).g;
        float foam = scs(.62, .85, fn)*mix(.55, .2, spill)*(.3 + .7*scs(.75, 1., abs(across)));
        col = mix(col, vec3(.85, .88, .86)*(uSunC*lit*.3 + amb*1.6), foam);
        float a = mix(mix(.55, .92, scs(.1, .7, edge))*scs(0., .14, edge), (.5 + .4*F)*scs(0., .45, edge), spill);
        gl_FragColor = vec4(col, a);
      }` }));
}
function scFallMat() {
  return scBlend(scShader({ side: THREE.DoubleSide,
    vertexShader: `attribute vec2 aSW; varying vec2 vSW; varying vec3 vW; void main(){ vSW = aSW; vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SC_GLSL + `varying vec2 vSW; varying vec3 vW;
      void main(){
        float u = vSW.y*.5 + .5, v = vSW.x;
        float e = scs(0., .25, u)*scs(1., .75, u);
        float s1 = texture2D(tNoise, vec2(u*1.3, v*.05 - uTime*.9)).r, s2 = texture2D(tNoise, vec2(u*3.1 + .5, v*.16 - uTime*2.2)).g;
        float a = e*(.25 + .75*scs(.38, .72, s1*.65 + s2*.5))*scs(0., 1.5, v)*.92;
        vec3 col = vec3(.9, .93, .95)*(uSunC*.18 + vec3(.5, .62, .78));
        gl_FragColor = vec4(haze(col, vW, .002), a);
      }` }));
}
function scSeaMat() {
  return scShader({ vertexShader: SC_VS, fragmentShader: SC_GLSL + `varying vec3 vW; varying vec3 vL;
    float edgeZ(float x){ return ${SC.edge.toFixed(2)} - .008*x*x + 1.6*sin(x*.21 + .8) + .7*sin(x*.57 + 2.1); }
    void main(){
      vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
      vec3 N = waterN(vL.xz*.04, vec2(.012, .02), .35, 1.);
      N = normalize(mix(N, vec3(0., 1., 0.), scs(60., 400., dist)*.75));
      vec3 R = reflect(-V, N); R.y = abs(R.y) + .02;
      float F = .02 + .98*pow(1. - max(dot(N, V), 0.), 5.);
      float shore = max(vL.z - edgeZ(vL.x) - 2.5, 0.);                     // metres out from the foot of the cliff
      vec3 body = mix(vec3(.03, .15, .15), vec3(.008, .035, .06), scs(0., 40., shore));
      vec3 col = body*(uSunC*max(-uSunDir.y, 0.)*.11 + vec3(.25, .33, .45)*.55);
      col = mix(col, skyPlate(R) + sunGlow(R), F);
      vec3 H = normalize(-uSunDir + V);
      col += uSunC*(pow(max(dot(N, H), 0.), 900.)*5. + pow(max(dot(N, H), 0.), 90.)*.08);
      float fn = texture2D(tNoise, vL.xz*.02 + vec2(0., uTime*.01)).g;
      float band = 1. - scs(0., 9., shore), lines = scs(.55, .95, sin(shore*.9 - uTime*1.4 + fn*5.)*.5 + .5);
      float foam = clamp(band*band*1.3 + band*lines*.8, 0., 1.)*scs(.25, .6, fn + band*.5);
      col = mix(col, vec3(.92, .94, .95)*(uSunC*.12 + vec3(.6, .7, .85)), foam*.85);
      gl_FragColor = vec4(haze(col, vW, .0022), 1.);
    }` });
}

/* ---- gulls: white, flapping and gliding in the vertex shader, a few in the room, more over the sea ---- */
function scBirdGeo() {
  // body along -z (the head), two wings bent like a gull's: an inner panel and a swept outer hand with dark tips
  const P = [0, 0, -.22, -.045, 0, .16, .045, 0, .16, 0, .03, -.06,
    0, .01, -.08, -.3, .03, -.02, 0, .01, .08, -.3, .03, -.02, -.3, .03, .07, 0, .01, .08,
    -.3, .03, -.02, -.62, -.01, .1, -.3, .03, .07,
    0, .01, -.08, 0, .01, .08, .3, .03, -.02, .3, .03, -.02, 0, .01, .08, .3, .03, .07,
    .3, .03, -.02, .3, .03, .07, .62, -.01, .1];
  const C = []; for (let i = 0; i < P.length / 3; i++) { const ax = Math.abs(P[i * 3]); const k = ax > .45 ? .22 : ax > .32 ? .7 : 1; C.push(.95 * k, .95 * k, .93 * k); }
  const I = [0, 1, 2, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
}
function scBirdMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, side: THREE.DoubleSide, envMapIntensity: .3 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = MOTE_U.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = float(gl_InstanceID)*1.37, wing = abs(position.x)/.62;
      float glide = .35 + .65*smoothstep(-.2, .6, sin(uTime*.37 + ph*2.1));      // gulls glide a lot between bursts of flapping
      transformed.y += (sin(uTime*(6.5 + mod(ph, 2.)) + ph)*wing*.36 - wing*wing*.05)*glide;`);
  };
  m.customProgramCacheKey = () => 'scBird';
  return m;
}
// each bird flies its own loop: [cx, cy, cz, rx, rz, speed (rad/s, sign = direction), phase, bob]
function scFlock(n, seed, inRoom) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const sp = (r() < .5 ? -1 : 1);
    if (inRoom && i % 3 === 0) out.push([lerp(-.5, .5, r()), lerp(2.05, 2.3, r()), 9.6, lerp(1.6, 2.3, r()), lerp(5, 5.6, r()), lerp(.16, .22, r()) * sp, r() * 6.283, lerp(.06, .14, r())]);   // out through the gap and back
    else if (inRoom) { const cx = lerp(-.8, .8, r()), cz = lerp(4.8, 6.4, r()); const rz = lerp(1.6, Math.min(cz - 1.5, 9.8 - cz), r()); out.push([cx, cz + rz > 8.7 ? lerp(2.15, 2.4, r()) : lerp(2.2, 2.7, r()), cz, lerp(1.8, 2.9 - Math.abs(cx), r()), rz, lerp(.24, .36, r()) * sp, r() * 6.283, lerp(.06, .16, r())]); }
    else out.push([lerp(-90, 90, r()), lerp(-38, 25, r()), lerp(40, 160, r()), lerp(14, 40, r()), lerp(10, 30, r()), lerp(.05, .11, r()) * sp, r() * 6.283, lerp(1, 4, r())]);
  }
  return out;
}
const _scM = new THREE.Matrix4(), _scQ = new THREE.Quaternion(), _scE = new THREE.Euler(0, 0, 0, 'YXZ'), _scP = new V3(), _scS = new V3();
function scFlyTick(mesh, paths, t, scale) {
  paths.forEach((b, i) => {
    const [cx, cy, cz, rx, rz, sp, ph, bob] = b, a = t * sp + ph;
    _scP.set(cx + Math.cos(a) * rx, cy + Math.sin(t * .9 + ph * 3) * bob, cz + Math.sin(a) * rz);
    const vx = -Math.sin(a) * rx * sp, vz = Math.cos(a) * rz * sp, vy = Math.cos(t * .9 + ph * 3) * bob * .9;
    _scE.set(-Math.atan2(vy, Math.hypot(vx, vz)) * .6, Math.atan2(-vx, -vz), Math.sign(sp) * .35); _scQ.setFromEuler(_scE);
    mesh.setMatrixAt(i, _scM.compose(_scP, _scQ, _scS.setScalar(scale * (.85 + (i % 4) * .08))));
  });
  mesh.instanceMatrix.needsUpdate = true;
}

/* ---- the water that comes into the cab before the doors open: a film spreading from the door seam ---- */
function scCabWater() {
  const C = CAB, zDoor = -.075;
  const g = new THREE.PlaneGeometry(C.x1 - C.x0, zDoor - C.z0, 48, 48).rotateX(-Math.PI / 2).translate(0, .012, (zDoor + C.z0) / 2);
  const m = scBlend(scShader({ uniforms: { uFill: { value: 0 }, uLevel: { value: 0 }, uDoor: { value: zDoor }, uLamp: { value: new V3(0, C.h - .1, (C.z0 + C.z1) / 2) }, uCamL: { value: new V3() } },
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
    fragmentShader: SC_GLSL + `uniform float uFill, uLevel, uDoor; uniform vec3 uLamp, uCamL; varying vec3 vL;
      void main(){
        float dz = uDoor - vL.z, dx = abs(vL.x);
        float n = texture2D(tNoise, vL.xz*.9).r, n2 = texture2D(tNoise, vL.xz*3.1 + .3).g;
        float arrive = (dz*.95 + dx*.6 + (n - .5)*.5 + (n2 - .5)*.12)/1.9;   // 0 at the seam, ~1 in the back corners
        float front = uFill*1.22 - arrive;
        float wet = scs(0., .02, front)*uLevel;
        if (wet < .003) discard;
        // the film's surface: its own flow away from the doors, rings spreading from the seam, a swell at the leading edge
        float rr = length(vec2(vL.x*1.3, dz));
        vec3 N = waterN(vL.xz*1.6, vec2(0., -.35), .05, .55);
        float ring = sin(rr*34. - uTime*8.)*exp(-rr*1.6)*(.5 + .5*uFill);
        N = normalize(N + vec3(vL.x/max(rr, .01)*.22*ring, 0., -dz/max(rr, .01)*.22*ring));
        float lead = exp(-max(front, 0.)*55.);                                    // the rounded leading edge of the spreading film
        N = normalize(N + vec3(0., 0., -1.)*lead*.6);
        vec3 V = normalize(uCamL - vL), R = reflect(-V, N);
        float F = .04 + .96*pow(1. - max(dot(N, V), 0.), 5.);
        // what it mirrors: the cab's teal walls in lamplight, the warm lamp overhead
        vec3 env = mix(vec3(.03, .09, .075)*1.6, vec3(1., .62, .3)*.9, scs(.62, .97, R.y));
        vec3 L = normalize(uLamp - vL), Hh = normalize(L + V);
        vec3 col = vec3(.03, .04, .028)*mix(1., .6, uFill);                     // river water over the tread: darkens it
        col = mix(col, env, F);
        col += vec3(1., .7, .42)*(pow(max(dot(N, Hh), 0.), 260.)*2.2 + pow(max(dot(N, Hh), 0.), 34.)*.07);
        // churn where it comes in at the seam and along the foot of the doors, bubbles riding the film, the bright rim
        float churn = exp(-rr*5.5)*1.1 + exp(-dz*14.)*.5;
        float foam = scs(.5, .82, texture2D(tNoise, vL.xz*2.4 + vec2(0., -uTime*.5)).g)*churn*(.35 + .65*scs(.05, .5, uFill));
        float bub = scs(.82, .9, texture2D(tNoise, vL.xz*6. + vec2(uTime*.05, -uTime*.3)).a)*scs(.0, .6, front)*.6;
        foam = clamp(foam + bub + lead*.35, 0., 1.);
        col = mix(col, vec3(.75, .74, .68)*.7, foam*.8);
        float a = wet*(.55 + .35*F + foam*.3);
        gl_FragColor = vec4(col, clamp(a, 0., .95));
      }` }));
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 3; mesh.visible = false; cab.add(mesh);
  // the seam: a sheet running down the inside of the door gap, and two thin spurts at ankle and knee height
  const sm = scBlend(scShader({ side: THREE.DoubleSide, uniforms: { uFill: m.uniforms.uFill, uLevel: m.uniforms.uLevel },
    vertexShader: `attribute vec2 aSW; varying vec2 vSW; void main(){ vSW = aSW; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
    fragmentShader: SC_GLSL + `uniform float uFill, uLevel; varying vec2 vSW;
      void main(){ float u = vSW.y, v = vSW.x;
        float s = texture2D(tNoise, vec2(u*1.7, v*1.6 - uTime*1.8)).r*.6 + texture2D(tNoise, vec2(u*4.1 + .5, v*3. - uTime*3.1)).g*.4;
        float core = scs(1., .2, abs(u*2. - 1.));
        float a = core*(.35 + .65*scs(.25, .65, s))*scs(0., .2, uFill)*(1. - scs(.9, 1., uFill)*.35)*uLevel;
        if (a < .01) discard;
        vec3 col = mix(vec3(.12, .14, .11), vec3(1.2, 1.05, .85), scs(.45, .9, s*core));   // dark water with white where it breaks and catches the lamp
        gl_FragColor = vec4(col, a*.9); }` }));
  const seam = [];
  const strip = (pts) => { const P = [], A = [], I = []; pts.forEach(([x, y, z, hw, v]) => { P.push(x - hw, y, z, x + hw, y, z); A.push(v, 0, v, 1); });
    for (let j = 0; j < pts.length - 1; j++) { const a = j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sg.setAttribute('aSW', new THREE.Float32BufferAttribute(A, 2)); sg.setIndex(I);
    const s = new THREE.Mesh(sg, sm); s.renderOrder = 4; s.visible = false; cab.add(s); seam.push(s); };
  strip(Array.from({ length: 11 }, (_, j) => { const v = j / 10; return [0, lerp(.55, .01, v), zDoor - .045 - .01 * v, .03, v]; }));             // down the gap, knee height to the floor
  for (const [h, reach, w] of [[.12, .3, .016], [.33, .26, .013], [.58, .17, .01]]) strip(Array.from({ length: 15 }, (_, j) => { const v = j / 14; return [(v * v) * .03 * (h > .3 ? -1 : 1), h * (1 - v * v), zDoor - .045 - reach * v, w * (1 + v * 2), v]; }));   // spurts arcing onto the floor
  return { mesh, m, seam };
}

/* ---- the room itself: walls with their breaches, the fallen far wall, the holed ceiling, the doors ---- */
function scBuildRoom(b, plaster, wallM) {
  const G = SC;
  // the lift wall: a skin over the shaft's slab, the doorway, solid wall beyond the shaft
  for (const g of holedWall('z', WALL_Z, WALL_Z + .02, G.x0, G.x1, 0, G.h, [[-DOOR_W / 2, DOOR_W / 2, -1, DOOR_H]])) b.add(wallM, wuv(g, 2.5, 2.5));
  b.add(wallM, wuv(bb(G.x0 - .2, SHAFT.x0 - .2, -.3, G.h, 0, WALL_Z), 2.5, 2.5)); b.add(wallM, wuv(bb(1.85, G.x1 + .2, -.3, G.h, 0, WALL_Z), 2.5, 2.5));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, -DOOR_W / 2, 0, DOOR_H, WALL_Z + .02, WALL_Z + .06), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(DOOR_W / 2, DOOR_W / 2 + .12, 0, DOOR_H, WALL_Z + .02, WALL_Z + .06), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, DOOR_W / 2 + .12, DOOR_H, DOOR_H + .14, WALL_Z + .02, WALL_Z + .06), .5, .5, DOOR_H));
  b.add(M.brass, wuv(bb(-DOOR_W / 2, DOOR_W / 2, -.01, .008, 0, WALL_Z + .03), .3, .3));
  // side walls: a window on the left, the river's breach and a window on the right
  for (const g of holedWall('x', G.x0 - .2, G.x0, WALL_Z, G.z1 + .25, -.3, G.h, [[3.0, 4.6, 1.0, 2.25]])) b.add(plaster, wuv(g, 2.5, 2.5));
  for (const g of holedWall('x', G.x1, G.x1 + .2, WALL_Z, G.z1 + .25, -.3, G.h, [[5.7, 7.2, -1, .95], [2.2, 3.6, 1.1, 2.3]])) b.add(plaster, wuv(g, 2.5, 2.5));
  // the far wall has come down: two piers and a broken lintel
  b.add(plaster, wuv(bb(G.x0 - .2, G.op0, -.3, G.h, G.z1, G.z1 + .25), 2.5, 2.5)); b.add(plaster, wuv(bb(G.op1, G.x1 + .2, -.3, G.h, G.z1, G.z1 + .25), 2.5, 2.5));
  SC_OBST.push([G.x0 - .3, G.op0 + .05, G.z1 - .1, G.z1 + .35], [G.op1 - .05, G.x1 + .3, G.z1 - .1, G.z1 + .35]);
  const r = rng(707);
  for (let x = G.op0; x < G.op1 - 1e-3;) { const w = Math.min(.25 + r() * .45, G.op1 - x), y0 = G.opH + (r() - .3) * .22 + (x > 1 && x < 2.2 ? .25 : 0); b.add(plaster, wuv(bb(x, x + w, y0, G.h, G.z1 + (r() - .5) * .02, G.z1 + .25), 2.5, 2.5)); x += w; }
  // ceiling: a slab with a hole where it has given way
  const hx0 = -1.4, hx1 = .2, hz0 = 6.2, hz1 = 7.4;
  const cm = SC_LIVE.ceil;
  b.add(cm, wuv(bb(G.x0 - .2, G.x1 + .2, G.h, G.h + .25, 0, hz0), 2.4, 2.4)); b.add(cm, wuv(bb(G.x0 - .2, G.x1 + .2, G.h, G.h + .25, hz1, G.z1 + .25), 2.4, 2.4));
  b.add(cm, wuv(bb(G.x0 - .2, hx0, G.h, G.h + .25, hz0, hz1), 2.4, 2.4)); b.add(cm, wuv(bb(hx1, G.x1 + .2, G.h, G.h + .25, hz0, hz1), 2.4, 2.4));
  // the building goes on up above the room: a weathered face with dark windows (seen from out on the meadow)
  const FW = G.x1 - G.x0 + .4, FH = 36, ppm = 512 / FW, [fc, fx] = cv(512, Math.round(FH * ppm)), fr = rng(9), ch = fc.height;
  fx.fillStyle = '#7d7a70'; fx.fillRect(0, 0, 512, ch);
  for (let i = 0; i < 4000; i++) { const v = 90 + fr() * 70; fx.fillStyle = `rgba(${v},${v * .98},${v * .92},${fr() * .22})`; fx.fillRect(fr() * 512, fr() * ch, 2 + fr() * 24, 2 + fr() * 18); }
  for (let fl = 0; fl < 10; fl++) { const y0 = ch - (fl + 1) * H * ppm; fx.fillStyle = 'rgba(55,52,45,.5)'; fx.fillRect(0, y0 + H * ppm - 6, 512, 5);
    for (let w = 0; w < 3; w++) { const x = (1.2 + w * 2.9) * ppm, y = y0 + .8 * ppm; fx.fillStyle = '#151715'; fx.fillRect(x, y, 1.3 * ppm, 1.6 * ppm); fx.fillStyle = 'rgba(70,62,50,.7)'; fx.fillRect(x - 4, y + 1.6 * ppm, 1.3 * ppm + 8, 6); } }
  for (let i = 0; i < 70; i++) { fx.fillStyle = `rgba(45,40,30,${.06 + fr() * .16})`; const x = fr() * 512; fx.fillRect(x, fr() * ch * .5, 2 + fr() * 5, ch); }
  for (let i = 0; i < 26; i++) { fx.fillStyle = `rgba(50,75,30,${.15 + fr() * .25})`; fx.beginPath(); fx.ellipse(fr() * 512, ch - fr() * 260, 20 + fr() * 60, 8 + fr() * 30, 0, 0, 6.283); fx.fill(); }   // moss creeping up from the room
  const face = new THREE.MeshStandardMaterial({ map: scTex(fc, false), roughness: .95, metalness: 0, envMapIntensity: .2 });
  scRoom.add(new THREE.Mesh(new THREE.PlaneGeometry(FW, FH).translate(0, G.h + FH / 2, G.z1 + .26), face));
  for (const sx of [-1, 1]) scRoom.add(new THREE.Mesh(new THREE.PlaneGeometry(G.z1 + .25 - WALL_Z, FH).rotateY(sx * Math.PI / 2).translate(sx * (G.x1 + .215), G.h + FH / 2, (G.z1 + .25 + WALL_Z) / 2), face));
  // the doors on the room side
  doors.scL = doorLeaf(scRoom, -1, 0, .035); doors.scL.position.set(-.265, 0, .035); doors.scR = doorLeaf(scRoom, 1, 0, .035); doors.scR.position.set(.265, 0, .035);
}
function scRubble(b) {
  const r = rng(808), geo = new THREE.IcosahedronGeometry(1, 0);
  const pile = (cx, cz, n, sz) => { for (let i = 0; i < n; i++) { const g = geo.clone(); g.scale(sz * (.4 + r()), sz * (.25 + r() * .5), sz * (.4 + r())); g.rotateY(r() * 6.28); g.rotateX((r() - .5) * .6); const x = cx + (r() - .5) * sz * 4, z = cz + (r() - .5) * sz * 3; g.translate(x, scGroundH(x, z) + sz * .15, z); b.add(M.conc, wuv(g, .6, .6)); } };
  pile(-2.6, 8.4, 9, .14); pile(2.9, 8.5, 7, .13); pile(1.5, 8.85, 4, .1); pile(SC.x1 - .45, 7.9, 5, .12); pile(-3.6, 1.2, 4, .1);
  SC_OBST.push([-3.05, -2.15, 8.0, 8.8], [2.55, 3.3, 8.15, 8.85]);
  // old floor tiles still showing round the doors, sunk and broken
  for (let i = -5; i < 5; i++) for (let j = 0; j < 6; j++) {
    const x = (i + .5) * .3, z = WALL_Z + .17 + j * .3, d = Math.hypot(x, (z - WALL_Z) * 1.2);
    if (r() > 1.25 - d * .55) continue;
    const g = new THREE.BoxGeometry(.285, .03, .285); g.rotateX((r() - .5) * .05); g.rotateZ((r() - .5) * .05); g.rotateY((r() - .5) * .08);
    g.translate(x + (r() - .5) * .02, Math.min(-.012, scGroundH(x, z) + .004) - .006 * r(), z + (r() - .5) * .02); b.add(SC_LIVE.tile, wuv(g, 1.2, 1.2));
  }
}

/* ---- build ---- */
function buildSeaCliffs() {
  const TL = new THREE.TextureLoader(), G = SC;
  scRoom.position.y = SC_FLOOR * H;
  SC_U.tNoise.value = scNoiseTex();
  const load = (f, then) => { const t = TL.load('images/cliffs/' + f, then); t.colorSpace = THREE.NoColorSpace; t.anisotropy = Math.min(8, MAX_ANISO); return t; };
  const sky = load('sky_cliffs.jpg'); sky.wrapS = THREE.MirroredRepeatWrapping; sky.wrapT = THREE.ClampToEdgeWrapping; sky.generateMipmaps = false; sky.minFilter = THREE.LinearFilter;
  SC_U.tSky.value = sky;
  SC_LIVE.dome = scDome();
  const grey = (m, c) => { m.color = new THREE.Color(...c); return m; };
  const plaster = weathered(grey(M.landPlaster.clone(), [.62, .62, .57]), { moss: .45, seed: 21 }), wallM = weathered(grey(M.landPlaster.clone(), [.66, .65, .6]), { moss: .3, seed: 22 });
  SC_LIVE.ceil = grey(M.ceil.clone(), [.42, .42, .4]);
  const b = new Bucket();
  SC_LIVE.tile = grey(M.landTile.clone(), [.42, .44, .4]); SC_LIVE.tile.envMapIntensity = .3;
  scBuildRoom(b, plaster, wallM); scRubble(b);
  b.build(scRoom);
  SC_OBST.push([G.x0 - .3, G.x0 + .05, 0, G.z1 + .3], [G.x1 - .05, G.x1 + .3, 0, 5.7], [G.x1 - .05, G.x1 + .3, 7.2, G.z1 + .3]);
  // ground: the room and the meadow in front, beside the room, and out either side to x = 150 (all following the cliff edge)
  const gm = scGroundMat(), cols = (a, b, n, k = 1) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * Math.pow(i / n, k));
  for (const [xs, front, back] of [[cols(-4.4, 4.4, 44), 86, false], [cols(-4.4, -13, 36), 70, true], [cols(4.4, 13, 36), 70, true], [cols(-13, -150, 40, 1.6), 36, true], [cols(13, 150, 52, 1.5), 36, true]]) {
    const m = new THREE.Mesh(scGroundGeo(xs[0] > xs[1] ? xs.reverse() : xs, front, back), gm); m.receiveShadow = true; scRoom.add(m);
  }
  // the cliff and the sea below it, stacks standing out in the sea
  const cliff = new THREE.Mesh(scCliffGeo(), scRockMat(1.7, true)); cliff.frustumCulled = false; scRoom.add(cliff);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(780, 760, 60, 60).rotateX(-Math.PI / 2).translate(0, G.sea, 0), scSeaMat()); sea.frustumCulled = false; scRoom.add(sea);
  const sr = rng(4242);
  [[-84, 150, 17, 128, .1], [58, 196, 23, 168, .12], [-168, 246, 28, 210, .14], [132, 292, 16, 240, .32], [-30, 338, 22, 182, .1]].forEach(([x, z, rad, h, tp], k) => {
    const st = { x, z, r: rad, h, y0: G.sea - 6, taper: tp, seed: k * 7.31 + 3.1, ph: [0, 0, 0, 0, 0].map(() => sr() * 6.283), layer: 7 + sr() * 5 };
    scRoom.add(new THREE.Mesh(scStackGeo(st), scRockMat(k * 3.1 + .4, false)));
  });
  // the river, the spill to the doors, the fall
  const river = new THREE.Mesh(scRibbon(SC_RIVER, (p) => scRiverW(p.x, p.z) * 1.08, (p) => scRiverY(p.x, p.z)), scStreamMat(0)); river.renderOrder = 2; river.frustumCulled = false; scRoom.add(river);
  const spill = new THREE.Mesh(scRibbon(SC_SPILL, (p) => scSpillW(p.z), (p) => Math.max(scGroundH(p.x, p.z) + .03, .012)), scStreamMat(1)); spill.renderOrder = 2; spill.frustumCulled = false; scRoom.add(spill);
  { const end = SC_RIVER[SC_RIVER.length - 1], y0 = scRiverY(end.x, end.z), P = [], A = [], I = [], NV = 40;
    for (let j = 0; j <= NV; j++) { const v = j / NV, y = lerp(y0, G.sea + 1, v), out = .2 + 2.6 * Math.sqrt(v) + 2.2 * v, w = lerp(.6, 2.4, v); for (const k of [-1, 1]) { P.push(end.x + k * w, y, end.z + out); A.push(v * 64, k); } }
    for (let j = 0; j < NV; j++) { const a = j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aSW', new THREE.Float32BufferAttribute(A, 2)); g.setIndex(I);
    const fall = new THREE.Mesh(g, scFallMat()); fall.renderOrder = 3; fall.frustumCulled = false; scRoom.add(fall); }
  // far cliffs: the Updraft paintings on arcs round the room (looking out, +x is on the left)
  load('cliffs_far.webp', (t) => scRoom.add(scLayer(t, 372, -.55, .5, G.sea - 14, .55, [.9, .95, 1.05], -8)));
  load('cliffs_mid.webp', (t) => scRoom.add(scLayer(t, 340, -.62, .18, G.sea - 10, .4, [.95, .97, 1], -7)));
  load('cliffs_isle.webp', (t) => scRoom.add(scLayer(t, 300, .55, 1.25, G.sea - 8, .45, [.95, .98, 1.02], -6)));
  // grass
  const [gmat, gdepth] = scGrassMats(), [roomPts, outPts] = scPlantGrass();
  scRoom.add(scGrass(gmat, gdepth, 5, roomPts)); const og = scGrass(gmat, gdepth, 3, outPts); og.castShadow = false; scRoom.add(og);   // outside: sunlit anyway, and beyond the shadow map
  // ivy up the walls (not across the doorway), vines hanging from the broken ceiling and lintel, moss along the foot of the walls
  ivy(scRoom, { origin: new V3(G.x0 + .005, 0, 0), U: new V3(0, 0, 1), V: new V3(0, 1, 0), N: new V3(1, 0, 0), u0: WALL_Z + .1, u1: G.z1 - .1, v0: 0, v1: G.h - .05, seed: 91,
    starts: [[1.0, .02, 1.5, 60], [2.4, .02, 1.6, 50], [5.6, .02, 1.4, 60], [7.6, .02, 1.6, 50]], leaf: .075, flowers: .03 });
  ivy(scRoom, { origin: new V3(G.x1 - .005, 0, 0), U: new V3(0, 0, -1), V: new V3(0, 1, 0), N: new V3(-1, 0, 0), u0: -G.z1 + .1, u1: -WALL_Z - .1, v0: 0, v1: G.h - .05, seed: 92,
    starts: [[-1.2, .02, 1.5, 50], [-4.6, 1.0, 1.6, 40], [-8.2, .02, 1.5, 55]], leaf: .075, flowers: .02 });
  for (const [u0, u1, starts, seed] of [[G.x0 + .1, -.78, [[-3.4, .02, 1.5, 70], [-1.6, .02, 1.7, 45]], 93], [.78, G.x1 - .1, [[1.5, .02, 1.4, 45], [3.5, .02, 1.6, 60]], 94]])
    ivy(scRoom, { origin: new V3(0, 0, WALL_Z + .025), U: new V3(1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, 1), u0, u1, v0: 0, v1: G.h - .05, seed, starts, leaf: .07, flowers: .02 });
  for (let i = 0; i < 9; i++) hangVine(scRoom, new V3(i < 5 ? -1.4 + i * .4 : .2, G.h, i < 5 ? 6.2 : 6.25 + (i - 5) * .3), .4 + rng(i + 900)() * 1.4, 910 + i, .06);
  for (let i = 0; i < 8; i++) hangVine(scRoom, new V3(G.op0 + .3 + i * .8, G.opH + .05, G.z1 + .05), .3 + rng(i + 950)() * 1.0, 960 + i, .065);
  moss(scRoom, new V3(G.x0 + .15, .02, 4.5), 60, new V3(.2, .02, 8), 971, .05); moss(scRoom, new V3(G.x1 - .15, .02, 4.5), 50, new V3(.2, .02, 8), 972, .05);
  moss(scRoom, new V3(0, .02, WALL_Z + .12), 40, new V3(7.5, .02, .15), 973, .045);
  const vg = vineGeos.get(scRoom); if (vg && vg.length) { const m = new THREE.Mesh(mergeGeometries(vg.map(prep)), M.vine); m.castShadow = true; m.receiveShadow = true; scRoom.add(m); }
  instance(scRoom, leafGeometry(), M.leaf, leafM, leafC, true); instance(scRoom, mossGeometry(), M.moss, mossM, mossC, false); instance(scRoom, flowerGeometry(), M.flower, flowerM, null, false);
  // gulls
  const bg = scBirdGeo(), bm = scBirdMat();
  SC_LIVE.birdPaths = scFlock(9, 61, true); SC_LIVE.birds = new THREE.InstancedMesh(bg, bm, 9); SC_LIVE.birds.castShadow = true; SC_LIVE.birds.frustumCulled = false; scRoom.add(SC_LIVE.birds);
  SC_LIVE.gullPaths = scFlock(16, 62, false); SC_LIVE.gulls = new THREE.InstancedMesh(bg, bm, 16); SC_LIVE.gulls.frustumCulled = false; scRoom.add(SC_LIVE.gulls);
  // pollen drifting in the sun from the gap
  motes(scRoom, 260, [G.x0 + .1, G.x1 - .1, .3, G.h - .1, WALL_Z + .1, G.z1 - .3], 9);
  SC_LIVE.cab = scCabWater();
  // one cool fill from the gap (the landings have one lamp each, so the light count holds)
  SC_LIVE.lamp = new THREE.PointLight(new THREE.Color(.75, .85, 1), 0, 12, 1.4); SC_LIVE.lamp.position.set(0, 2.2, G.z1 - .6); scRoom.add(SC_LIVE.lamp);
}

/* ---- runtime ---- */
function ensureSeaCliffs() { if (SC_LIVE.built) return; SC_LIVE.built = true; buildSeaCliffs(); finishSubtree(scRoom); }
function seaCliffsHere() { return D.state === 'play' && lift.floor === SC_FLOOR && lift.phase !== 'riding' && (lift.doors > 0 || !P.inCab); }
// the cab's water: fills while the lift waits at floor 3 with its doors shut, stays while it is there, drains as it rides away
function scInflowTick(dt) {
  const L = SC_LIVE; if (!L.cab) return;
  const arriving = lift.floor === SC_FLOOR && lift.phase === 'arrived', atFloor = lift.floor === SC_FLOOR && lift.phase !== 'riding';
  if (arriving) { L.fill = Math.max(L.fill, clamp((lift.waitT - .35) / (SC.inflow - 1.1), 0, 1)); L.level = Math.min(1, L.level + dt * 2.5); }
  else if (atFloor) { L.level = Math.min(1, L.level + dt); L.fill = Math.max(L.fill, L.level > 0 ? 1 : 0); }
  else { L.level = Math.max(0, L.level - dt / 2.6); if (L.level <= 0) L.fill = 0; }
  const on = L.level > .002 && L.fill > .001;
  L.cab.mesh.visible = on; L.cab.m.uniforms.uFill.value = L.fill; L.cab.m.uniforms.uLevel.value = L.level;
  const seamOn = on && (arriving || (atFloor && lift.doors < .2));
  L.cab.seam.forEach(s => s.visible = seamOn);
  L.cab.m.uniforms.uCamL.value.copy(camera.position).sub(cab.position);
}
function seaCliffsTick(dt, time) {
  const near = SC_LIVE.built && (lift.floor === SC_FLOOR || lift.target === SC_FLOOR) && Math.abs(lift.y - SC_FLOOR * H) < 1.2 * H;
  scRoom.visible = near; sky.visible = !near;
  if (SC_LIVE.dome) { SC_LIVE.dome.visible = near; SC_LIVE.dome.position.copy(camera.position); }
  if (doors.scL) { const o = lift.floor === SC_FLOOR && lift.phase !== 'riding' && Math.abs(lift.y - SC_FLOOR * H) < .01 ? lift.doors * .53 : 0; doors.scL.position.x = -.265 - o; doors.scR.position.x = .265 + o; }
  scInflowTick(dt);
  if (!near) return;
  scFlyTick(SC_LIVE.birds, SC_LIVE.birdPaths, time, .72); scFlyTick(SC_LIVE.gulls, SC_LIVE.gullPaths, time, 2.2);
}
// the light on floor 3: clear late-morning sun through the gap, a blue sky fill
function seaCliffsLight(here) {
  if (SC_LIVE.lamp) SC_LIVE.lamp.intensity = here ? 1.4 : 0;
  if (!here) return;
  sun.color.setRGB(1, .9, .78); sun.intensity = 8.8;
  hemi.color.setRGB(.5, .66, .86); hemi.groundColor.setRGB(.16, .2, .1); hemi.intensity = .65;
}

/* ---- sound: the river, surf far below, gulls; the water coming in under the doors ---- */
function scAudioTick(t) {
  if (!A.ctx || !SC_LIVE.built) return; const ctx = A.ctx;
  if (!A.sc) {
    const src = (type, f, q) => { const s = ctx.createBufferSource(); s.buffer = A.buf; s.loop = true; s.start(0, Math.random() * 2); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(A.master); return { fl, g }; };
    A.sc = { river: src('bandpass', 1100, .7), river2: src('highpass', 3200, .5), surf: src('lowpass', 260, .7), pour: src('bandpass', 700, 1.1), trickle: src('bandpass', 2600, 2.5) };
  }
  const S = A.sc, here = seaCliffsHere(), L = SC_LIVE, inflow = lift.floor === SC_FLOOR && lift.phase === 'arrived', shut = lift.doors < .05 && P.inCab;
  const rv = here && !shut ? clamp(1.3 - scNear(SC_RIVER, P.pos.x, P.pos.z).d / 6, .25, 1) : 0;
  S.river.g.gain.setTargetAtTime(rv * .07, t, .4); S.river2.g.gain.setTargetAtTime(rv * .012, t, .4);
  S.river.fl.frequency.setTargetAtTime(900 + 500 * Math.sin(t * .7) * Math.sin(t * .23), t, .3);
  S.surf.g.gain.setTargetAtTime(here && !shut ? (.05 + .04 * Math.sin(t * .35)) * clamp(P.pos.z / 9, .4, 1.4) : 0, t, .8);
  const pour = (inflow ? sstep(.3, 1.2, lift.waitT) * (1 - .4 * sstep(3.5, SC.inflow, lift.waitT)) : here && lift.doors > .05 && P.pos.z < 1.2 ? .25 : 0) * (L.level > 0 ? 1 : 0);
  S.pour.g.gain.setTargetAtTime(pour * .09, t, .15); S.trickle.g.gain.setTargetAtTime(pour * .03, t, .1);
  S.pour.fl.frequency.setTargetAtTime(600 + 300 * Math.sin(t * 5.1) * Math.sin(t * 2.3), t, .05);
  if (inflow && Math.random() < .25) noiseHit(t + Math.random() * .05, 'bandpass', 1800 + Math.random() * 2200, 4, .006 + Math.random() * .01, .05);   // drips and bubbles
  if (here && !shut && t > L.nextGull) { L.nextGull = t + 4 + Math.random() * 9; scGull(t, Math.random() < .3); }
}
function scGull(t, far) {   // a herring gull's call: a few falling "kyow" notes through a nasal formant
  const ctx = A.ctx, n = 2 + Math.floor(Math.random() * 4), base = (far ? 1150 : 1350) + Math.random() * 300;
  const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null, out = ctx.createGain(); out.gain.value = far ? .35 : 1;
  if (pn) { pn.pan.value = (Math.random() - .5) * 1.4; out.connect(pn); pn.connect(A.ambLP); pn.connect(A.revIn); } else out.connect(A.ambLP);
  for (let i = 0; i < n; i++) {
    const t0 = t + .05 + i * (.21 + Math.random() * .08), d = .17 + Math.random() * .05, f = base * (1 - i * .03);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .78, t0); o.frequency.linearRampToValueAtTime(f * 1.08, t0 + .05); o.frequency.exponentialRampToValueAtTime(f * .62, t0 + d);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2300; bp.Q.value = 3.5;
    const e = ctx.createGain(); e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(.022, t0 + .02); e.gain.exponentialRampToValueAtTime(.0004, t0 + d);
    o.connect(bp).connect(e).connect(out); o.start(t0); o.stop(t0 + d + .05);
  }
}
function waterStep() {   // wading: a slap, a spray, water running off the foot
  const t = now_();
  noiseHit(t, 'bandpass', 900 + Math.random() * 400, 1.2, .12, .12); noiseHit(t + .015, 'highpass', 2600, .8, .05, .2);
  for (let i = 0; i < 4; i++) noiseHit(t + .04 + Math.random() * .16, 'bandpass', 1600 + Math.random() * 2400, 5, .015 + Math.random() * .012, .05);
  thump(t, 90, 50, .05, .07);
}
