
/* ======================================================================
   FLOOR 2 · AS IS: a cellar gallery for tonight's projects.
   Raw whitewashed plaster with brick showing through, brick jack-arch vaults between black steel beams,
   a scarred concrete floor, track spots on two rails, warm and dim. One piece per project (the list is
   GALLERY in head.html), a red faceted gorilla in the middle, the armoured dove on the vault above it.
   Every piece with a link opens it in a new tab when clicked.
   ====================================================================== */
const GALLERY_FLOOR = 2;
const GAL = { x0: -3.3, x1: 3.3, z1: 7.4, yb: 2.72, rise: .4, beams: [2.6, 5.0] };   // room, springing line of the vaults, their rise, the beams between bays
const gallery = new THREE.Group(); gallery.visible = false; scene.add(gallery);
const GAL_OBST = [];                 // [x0, x1, z0, z1] the player walks around
const GAL_LIVE = { screen: null, screenCtx: null, screenT: 0, hands: [], light: null, gems: [] };
const GAL_PIECES = new Map((typeof GALLERY !== 'undefined' && Array.isArray(GALLERY) ? GALLERY : []).map(p => [p.id, p]));
const galPiece = (id) => GAL_PIECES.get(id) || { id, title: 'Untitled', author: '', medium: '', blurb: '', url: '' };
const galAct = (p) => p.url ? { type: 'link', url: p.url, label: p.title } : { type: 'note', text: `<b>${p.title}</b> · details to come` };

// Hope Library's 48 titles (name, year, kind, first theme), read from hopelibrary.github.io
const HOPE_ITEMS = [["How to Live on Earth","2026","doc","soil"],["Nitassinan","2026","doc","land"],["Yanuni","2025","doc","land"],["Minimalism: A Documentary About the Important Things","2016","doc","simple"],["The Minimalists: Less Is Now","2021","doc","simple"],["Groundswell","2026","doc","soil"],["Kiss the Ground","2020","doc","soil"],["Common Ground","2023","doc","soil"],["Tomorrow (Demain)","2015","doc","community"],["Animal","2021","doc","wild"],["2040","2019","doc","vision"],["Regenerating Australia","2022","doc","vision"],["The Biggest Little Farm","2018","doc","soil"],["The Territory","2022","doc","land"],["Call Me Human (Je m'appelle humain)","2020","doc","land"],["Wilding","2023","doc","wild"],["The Serengeti Rules","2018","doc","wild"],["Bigger Than Us","2021","doc","youth"],["Ocean with David Attenborough","2025","doc","ocean"],["David Attenborough: A Life on Our Planet","2020","doc","wild"],["The Year Earth Changed","2021","doc","wild"],["Fantastic Fungi","2019","doc","fungi"],["My Octopus Teacher","2020","doc","ocean"],["Jane","2017","doc","wild"],["The Great Green Wall","2019","doc","forest"],["The Ants & the Grasshopper","2021","doc","soil"],["Ice on Fire","2019","doc","energy"],["The Water Walker","2019","doc","land"],["Avatar saga","2009 · 2022 · 2025","film","vision"],["Nausicaä of the Valley of the Wind","1984","film","vision"],["Princess Mononoke","1997","film","vision"],["WALL·E","2008","film","vision"],["The Wild Robot","2024","film","vision"],["The Boy Who Harnessed the Wind","2019","film","energy"],["The Man Who Planted Trees","1987","film","forest"],["La Belle Verte (Visit to a Green Planet)","1996","film","vision"],["Our Planet","2019 · 2023","series","wild"],["Our Great National Parks","2022","series","wild"],["Down to Earth with Zac Efron","2020 · 2022","series","energy"],["The Earthshot Prize: Repairing Our Planet","2021","series","progress"],["Hope in the Water","2024","series","ocean"],["Wild Isles","2023","series","wild"],["This Is a Gardening Show","2026","series","soil"],["Live to 100: Secrets of the Blue Zones","2023","series","community"],["Fungi: Web of Life","2023","doc","fungi"],["The Kingdom: How Fungi Made Our World","2018","doc","fungi"],["The Mushroom Speaks","2021","doc","fungi"],["Know Your Mushrooms","2008","doc","fungi"]];
// the site's own palette, one colour per theme
const HOPE_THEME = { soil: '#B4553A', wild: '#6C8E45', forest: '#2E5A45', community: '#A87C1C', vision: '#2D6B70', land: '#8A5A12', simple: '#EADCCB', ocean: '#2C6E8F', progress: '#23463A', energy: '#E2B456', youth: '#E28A67', fungi: '#5B695E', econ: '#1B2921', city: '#1B2921' };
const FONT_HOPE_D = '"Bricolage Grotesque","Saira Condensed",sans-serif', FONT_HOPE_B = '"Newsreader","Cormorant Garamond",Georgia,serif';
const FONT_STM = '"Barlow Condensed","Saira Condensed",Impact,sans-serif';

/* ---- texture helpers: plain Textures (not CanvasTexture) so the painted looks treat walls as walls, not signage ---- */
function galTex(c, srgb = true, repeat = true) {
  const t = new THREE.Texture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, MAX_ANISO); t.needsUpdate = true; return t;
}
function noiseField(n, cells, seed) {                 // periodic value noise, 0..1, n x n
  const r = rng(seed), g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = r();
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const fy = y / n * cells, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty), y0 = (iy % cells) * cells, y1 = ((iy + 1) % cells) * cells;
    for (let x = 0; x < n; x++) {
      const fx = x / n * cells, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx), x0 = ix % cells, x1 = (ix + 1) % cells;
      out[y * n + x] = lerp(lerp(g[y0 + x0], g[y0 + x1], sx), lerp(g[y1 + x0], g[y1 + x1], sx), sy);
    }
  }
  return out;
}
function fbm(n, seed, oct) { const out = new Float32Array(n * n); let tot = 0; oct.forEach(([c, w], i) => { const f = noiseField(n, c, seed + i * 101); for (let k = 0; k < out.length; k++) out[k] += f[k] * w; tot += w; }); for (let k = 0; k < out.length; k++) out[k] /= tot; return out; }
function normalCanvas(h, n, strength) {               // tangent-space normal map from a periodic height field
  const [c, x] = cv(n, n), im = x.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) {
    const l = h[y * n + (i - 1 + n) % n], r = h[y * n + (i + 1) % n], u = h[((y - 1 + n) % n) * n + i], d = h[((y + 1) % n) * n + i];
    const nx = (l - r) * strength, ny = (d - u) * strength, L = Math.hypot(nx, ny, 1), k = (y * n + i) * 4;
    im.data[k] = (nx / L * .5 + .5) * 255; im.data[k + 1] = (ny / L * .5 + .5) * 255; im.data[k + 2] = (1 / L * .5 + .5) * 255; im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); return c;
}
function brickColour(id, r0) {
  const r = rng(id * 7919 + r0); const k = r(); let h = 8 + r() * 14, sat = .38 + r() * .2, l = .27 + r() * .15;
  if (k < .12) l *= .62; else if (k > .9) { l += .12; sat *= .7; }                    // the odd burnt brick, the odd pale one
  return new THREE.Color().setHSL(h / 360, sat, l);
}
// running-bond brick drawn per pixel: W wide (wraps), bl brick length, ch course height, m mortar, all in pixels.
// paint(i, y, rgb[3]) -> height; reads the brick at (i, y), its local position, and whether it is mortar
function brickPainter(W, bl, ch, m, seed, nzA) {
  const cache = new Map();
  return (i, y, out) => {
    const row = Math.floor(y / ch), off = (row & 1) ? bl / 2 : 0, xx = (i + off) % W, col = Math.floor(xx / bl), lx = xx - col * bl, ly = y - row * ch;
    const nz = nzA[(Math.floor(y / 4) & 255) * 256 + (Math.floor(i / 4) & 255)], edge = Math.min(lx - m, bl - lx, ly - m, ch - ly);
    if (lx < m || ly < m || (edge < 6 && nz > .64)) { const v = .52 + nz * .2; out[0] = v * .78; out[1] = v * .74; out[2] = v * .66; return .15; }
    const id = row * 97 + col; let b = cache.get(id); if (!b) { b = brickColour(id, seed); cache.set(id, b); }
    const f = .8 + nz * .42 - (edge < 4 ? .12 : 0); out[0] = b.r * f; out[1] = b.g * f; out[2] = b.b * f;
    return .7 + nz * .12 - (edge < 5 ? (5 - edge) * .05 : 0);
  };
}
const _g22 = (v) => Math.pow(clamp(v, 0, 1), 1 / 2.2) * 255;
/* ---- brick (vaults, back wall): 1 m square, 5 bricks a course, 14 courses ---- */
function brickTextures() {
  const N = 1024, n = 512;
  const nzA = fbm(256, 4100, [[8, .5], [16, .3], [32, .2]]), wash = fbm(256, 4200, [[3, .6], [6, .3], [12, .1]]);
  const paint = brickPainter(N, N / 5, N / 14, 9, 3, nzA);
  const [c, x] = cv(N, N), im = x.createImageData(N, N), H_ = new Float32Array(n * n), col = [0, 0, 0];
  for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
    const h = paint(i, y, col), w = clamp((wash[(y >> 2) * 256 + (i >> 2)] - .56) * 3.2, 0, .78);   // old whitewash still clinging
    const k = (y * N + i) * 4; im.data[k] = _g22(lerp(col[0], .86, w)); im.data[k + 1] = _g22(lerp(col[1], .84, w)); im.data[k + 2] = _g22(lerp(col[2], .79, w)); im.data[k + 3] = 255;
    if (!(i & 1) && !(y & 1)) H_[(y >> 1) * n + (i >> 1)] = h;
  }
  x.putImageData(im, 0, 0);
  return { map: galTex(c), normal: galTex(normalCanvas(H_, n, 9), false) };
}
/* ---- whitewashed plaster, 2.5 m square: stains, streaks, cracks, and patches fallen away to the brick ---- */
function plasterTextures() {
  const N = 1024, n = 512, S = N / 2.5;
  const nzA = fbm(256, 5100, [[4, .45], [8, .3], [16, .15], [64, .1]]), stain = fbm(256, 5200, [[3, .6], [6, .4]]), peel = fbm(256, 5300, [[4, .55], [8, .3], [20, .15]]);
  const paint = brickPainter(N, Math.round(.205 * S), N / 34, 3, 7, nzA);
  const [c, x] = cv(N, N), im = x.createImageData(N, N), H_ = new Float32Array(n * n), col = [0, 0, 0];
  for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
    const q = (y >> 2) * 256 + (i >> 2), nz = nzA[q], p = peel[q]; let h;
    if (p > .69) h = paint(i, y, col) * .3;                                                // plaster gone: brick and mortar underneath
    else {
      const rim = clamp(1 - (.69 - p) * 30, 0, 1), v = .74 + nz * .2 - rim * .2, st = clamp((stain[q] - .55) * 2.2, 0, .5);   // the broken edge: darker, slightly proud
      col[0] = v - st * .06; col[1] = v - st * .1; col[2] = v - st * .22; h = .6 + nz * .08 + rim * .06;
    }
    const k = (y * N + i) * 4; im.data[k] = _g22(col[0]); im.data[k + 1] = _g22(col[1]); im.data[k + 2] = _g22(col[2]); im.data[k + 3] = 255;
    if (!(i & 1) && !(y & 1)) H_[(y >> 1) * n + (i >> 1)] = h;
  }
  x.putImageData(im, 0, 0);
  // water streaks and hairline cracks on top
  const r = rng(5400);
  for (let s_ = 0; s_ < 26; s_++) { const px = r() * N, w = 4 + r() * 18, len = 120 + r() * 520, py = r() * N; const g = x.createLinearGradient(0, py, 0, py + len); g.addColorStop(0, 'rgba(90,80,60,0)'); g.addColorStop(.2, `rgba(90,80,60,${.05 + r() * .08})`); g.addColorStop(1, 'rgba(90,80,60,0)'); x.fillStyle = g; for (const ox of [-N, 0, N]) x.fillRect(px + ox, py, w, len); }
  x.lineCap = 'round';
  for (let s_ = 0; s_ < 14; s_++) { let px = r() * N, py = r() * N, a = r() * 6.28; x.strokeStyle = `rgba(40,34,28,${.35 + r() * .3})`; x.lineWidth = .8 + r() * 1.2; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 18; k++) { a += (r() - .5) * 1.1; px += Math.cos(a) * 14; py += Math.sin(a) * 14; x.lineTo(px, py); } x.stroke(); }
  return { map: galTex(c), normal: galTex(normalCanvas(H_, n, 5), false) };
}
/* ---- concrete floor, 3 m square: worn grey, scabs of old dark paint, cracks ---- */
function floorTextures() {
  const N = 1024, n = 512;
  const nzA = fbm(256, 6100, [[6, .4], [12, .3], [32, .2], [96, .1]]), paint = fbm(256, 6200, [[3, .5], [7, .3], [18, .2]]);
  const [c, x] = cv(N, N), im = x.createImageData(N, N), H_ = new Float32Array(n * n);
  for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
    const q = Math.floor(y / 4) * 256 + Math.floor(i / 4), nz = nzA[q], p = paint[q];
    const painted = p > .6, v = .46 + nz * .2, k = (y * N + i) * 4;
    if (painted) { im.data[k] = _g22(v * .62); im.data[k + 1] = _g22(v * .6); im.data[k + 2] = _g22(v * .58); } else { im.data[k] = _g22(v); im.data[k + 1] = _g22(v * .97); im.data[k + 2] = _g22(v * .92); }
    im.data[k + 3] = 255;
    if ((i & 1) === 0 && (y & 1) === 0) H_[(y >> 1) * n + (i >> 1)] = (painted ? .55 : .5) + nz * .05;
  }
  x.putImageData(im, 0, 0);
  const r = rng(6300); x.lineCap = 'round';
  for (let s = 0; s < 10; s++) { let px = r() * N, py = r() * N, a = r() * 6.28; x.strokeStyle = `rgba(25,22,20,${.45 + r() * .3})`; x.lineWidth = 1 + r() * 1.5; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 26; k++) { a += (r() - .5) * .9; px += Math.cos(a) * 16; py += Math.sin(a) * 16; x.lineTo(px, py); } x.stroke(); }
  return { map: galTex(c), normal: galTex(normalCanvas(H_, n, 3), false) };
}
function poolTexture() {                               // a soft warm pool of light, used additively
  const [c, x] = cv(256, 256); const g = x.createRadialGradient(128, 108, 4, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(150,150,150,1)'); g.addColorStop(.7, 'rgba(40,40,40,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return galTex(c, true, false);
}

/* ---- the room ---- */
function vaultGeometry(z0, z1, x0, x1, inset = 0, segs = 28) {   // a brick jack arch spanning z0..z1, constant along x, facing down
  const pos = [], uv = [], idx = [], G = GAL;
  for (let j = 0; j <= segs; j++) {
    const t = j / segs, z = lerp(z0, z1, t), y = G.yb + G.rise * Math.sin(Math.PI * t) - inset;
    // arc length along the curve for the brick courses
    const s = (z - z0) + G.rise * .5 * (1 - Math.cos(Math.PI * t)) * .9;
    for (const x of [x0, x1]) { pos.push(x, y, z); uv.push(x, s); }
  }
  for (let j = 0; j < segs; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }   // wound to face down, into the room
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function lunetteGeometry(x, z0, z1, facing) {         // the wall above the springing line, under one arch
  const sh = new THREE.Shape(), segs = 20, G = GAL;
  sh.moveTo(z0, G.yb - .01);
  for (let j = 0; j <= segs; j++) { const t = j / segs; sh.lineTo(lerp(z0, z1, t), G.yb + G.rise * Math.sin(Math.PI * t) + .01); }
  sh.lineTo(z1, G.yb - .01); sh.closePath();
  const g = new THREE.ShapeGeometry(sh);                // in (u=z, v=y); turn it into the x = const plane
  const p = g.attributes.position, uvA = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i); p.setXYZ(i, x, v, u); uvA.setXY(i, facing > 0 ? -u / 2.5 : u / 2.5, v / 2.5); }
  if (facing > 0) g.index.array.reverse(); g.computeVertexNormals(); return g;   // the (u, v) -> (z, y) swap mirrors the shape: it faces -x unless reversed
}
function galDoor(sx) {
  const g = new THREE.Group(); const m = new THREE.Mesh(wuv(bb(-.27, .27, 0, DOOR_H, 0, .035), .54, DOOR_H), doorMat()); m.castShadow = m.receiveShadow = true; g.add(m);
  const e = new THREE.Mesh(bb(sx > 0 ? -.27 : .255, sx > 0 ? -.255 : .27, 0, DOOR_H, -.002, .037), M.rubber); g.add(e); gallery.add(g); g.position.set(sx * .265, 0, .035); return g;
}

/* ---- light: track spots (fixture, faint beam), pools on the walls, one warm fill ---- */
const SPOT_BEAM = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(1, .72, .42) }, uStrength: { value: .07 } },
  vertexShader: `attribute float aT; varying float vT; varying vec3 vN, vV;
    void main() { vT = aT; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying float vT; varying vec3 vN, vV; uniform vec3 uColor; uniform float uStrength;
    void main() { float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.); gl_FragColor = vec4(uColor * uStrength * edge * (.2 + .8 * vT * vT), 1.); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
function spot(rail, from, to, beam = true) {
  const dir = new V3().subVectors(to, from).normalize();
  const can = new THREE.Group(); can.position.copy(from); can.quaternion.setFromUnitVectors(new V3(0, -1, 0), dir); gallery.add(can);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, .16, 16), GAL_LIVE.blackM); body.position.y = -.02; can.add(body);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.042, 16), GAL_LIVE.lensM); lens.rotation.x = Math.PI / 2; lens.position.y = -.101; can.add(lens);
  gallery.add(new THREE.Mesh(rod(new V3(from.x, rail, from.z), from.clone().add(new V3(0, .03, 0)), .008, 6), GAL_LIVE.blackM));   // stem up to the rail
  if (beam) {
    const L = from.distanceTo(to) * .92, cone = new THREE.CylinderGeometry(.05, .5 * L * .42, L, 24, 1, true);
    cone.translate(0, -L / 2 - .1, 0);
    const pa = cone.attributes.position, t = new Float32Array(pa.count); for (let i = 0; i < pa.count; i++) t[i] = 1 + (pa.getY(i) + .1) / L;   // 1 at the lamp, 0 at the far end
    cone.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    const m = new THREE.Mesh(cone, SPOT_BEAM); m.renderOrder = 5; m.frustumCulled = false; can.add(m);
  }
  return can;
}
function pool(parent, w, h, pos, rotY, rotX = 0, strength = .3) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: GAL_LIVE.poolTex, color: new THREE.Color(1, .74, .46).multiplyScalar(strength), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.position.copy(pos); m.rotation.set(rotX, rotY, 0, 'YXZ'); m.renderOrder = 4; parent.add(m); return m;
}

/* ---- museum labels ---- */
function wrapText(x, text, maxW) { const out = []; let line = ''; for (const w of text.split(/\s+/)) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
function labelCard(p) {
  const [c, x] = cv(640, 400);
  x.fillStyle = '#f3f0e8'; x.fillRect(0, 0, 640, 400);
  x.fillStyle = '#17150f'; x.font = `600 46px "Cormorant Garamond",Georgia,serif`; let y = 64;
  for (const l of wrapText(x, p.title, 580).slice(0, 2)) { x.fillText(l, 30, y); y += 48; }
  x.font = `500 21px "IBM Plex Mono",monospace`; x.fillStyle = '#3a362e';
  if (p.author) { x.fillText(p.author, 30, y + 4); y += 32; }
  if (p.medium) { x.fillStyle = '#6a655a'; for (const l of wrapText(x, p.medium, 580).slice(0, 2)) { x.fillText(l, 30, y + 4); y += 28; } }
  if (p.blurb) { x.font = `italic 500 25px "Cormorant Garamond",Georgia,serif`; x.fillStyle = '#2a2720'; y += 10; for (const l of wrapText(x, p.blurb, 580).slice(0, 4)) { x.fillText(l, 30, y + 6); y += 29; } }
  x.font = `500 19px "IBM Plex Mono",monospace`; x.fillStyle = p.url ? '#8a3a1c' : '#8d887c'; x.fillText(p.url ? '↗  click to open the project' : 'details to come', 30, 378);
  return ctex(c);
}
function addLabel(p, pos, rotY) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(.24, .15), new THREE.MeshStandardMaterial({ map: labelCard(p), roughness: .7, emissive: 0xffffff, emissiveIntensity: .12, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.material.emissiveMap = m.material.map; m.position.copy(pos); m.rotation.y = rotY; gallery.add(m);
  m.userData.act = galAct(p); hot.push(m); return m;
}

/* ---- 1 · Rapailler la langue (Pascal Huynh): the deck's title slide as a printed panel ---- */
function pieceRapailler(G, TL) {
  const p = galPiece('rapailler'), W = 2.3, Hh = W / (2128 / 1180), z = 1.95, y = 1.6;
  const map = TL.load('images/gallery/rapailler.webp'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(8, MAX_ANISO);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .4, roughness: .55, envMapIntensity: .3 }));
  panel.position.set(G.x1 - .016, y, z); panel.rotation.y = -Math.PI / 2; gallery.add(panel);
  const back = new THREE.Mesh(bb(G.x1 - .015, G.x1 - .002, y - Hh / 2, y + Hh / 2, z - W / 2, z + W / 2), GAL_LIVE.blackM); gallery.add(back);
  panel.userData.act = galAct(p); hot.push(panel);
  pool(gallery, W * 1.45, Hh * 1.7, new V3(G.x1 - .006, y + .08, z), -Math.PI / 2, 0, .42);
  addLabel(p, new V3(G.x1 - .006, 1.35, z + W / 2 + .3), -Math.PI / 2);
  return [z, y];
}

/* ---- 2 · STM Surfer: an arcade cabinet in the game's navy, metro-line stripes, the runner on its screen ---- */
const STM_LINES = [
  { name: 'Ligne verte', c: '#12B76A', st: ['Angrignon', 'Lionel-Groulx', 'Atwater', 'Peel', 'McGill', 'Place-des-Arts', 'Saint-Laurent', 'Berri–UQAM', 'Papineau', 'Frontenac', 'Pie-IX', 'Honoré-Beaugrand'] },
  { name: 'Ligne orange', c: '#FF8A1F', st: ['Côte-Vertu', 'Snowdon', 'Vendôme', 'Lionel-Groulx', 'Bonaventure', 'Place-d\'Armes', 'Berri–UQAM', 'Sherbrooke', 'Mont-Royal', 'Laurier', 'Jean-Talon', 'Montmorency'] },
  { name: 'Ligne jaune', c: '#FFD21F', st: ['Berri–UQAM', 'Jean-Drapeau', 'Longueuil–Université-de-Sherbrooke'] },
  { name: 'Ligne bleue', c: '#2F86F6', st: ['Snowdon', 'Côte-des-Neiges', 'Université-de-Montréal', 'Outremont', 'Parc', 'Jean-Talon', 'Saint-Michel'] },
];
function stmLogo(x, cx, cy, s) {                     // the S mark from the game's icon (64-unit grid)
  x.save(); x.translate(cx - 32 * s, cy - 32 * s); x.scale(s, s);
  x.fillStyle = '#10131F'; x.beginPath(); x.roundRect ? x.roundRect(0, 0, 64, 64, 14) : x.rect(0, 0, 64, 64); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 6; x.lineCap = x.lineJoin = 'round';
  x.beginPath(); x.moveTo(41, 13); x.lineTo(28.8, 13); x.lineTo(23, 18.8); x.lineTo(23, 23.2); x.lineTo(28.8, 29); x.lineTo(35.2, 29); x.lineTo(41, 34.8); x.lineTo(41, 39.2); x.lineTo(35.2, 45); x.lineTo(23, 45); x.stroke();
  ['#FFD21F', '#2F86F6', '#12B76A', '#FF8A1F'].forEach((c, i) => { x.fillStyle = c; x.fillRect(11 + i * 11, 52, 9, 5); });
  x.restore();
}
function stmSideArt() {
  const [c, x] = cv(512, 1024); x.fillStyle = '#10131F'; x.fillRect(0, 0, 512, 1024);
  ['#FFD21F', '#2F86F6', '#12B76A', '#FF8A1F'].forEach((col, i) => {
    x.strokeStyle = col; x.lineWidth = 30; x.lineCap = 'round'; x.beginPath();
    const b = 70 + i * 46; x.moveTo(-40, 980 - i * 30); x.bezierCurveTo(200, 900 - i * 40, b, 600, 260 + i * 46, 360); x.lineTo(560, 120 + i * 40); x.stroke();
  });
  x.save(); x.translate(110, 820); x.rotate(-Math.PI / 2); x.fillStyle = '#fff'; x.font = `800 112px ${FONT_STM}`; x.fillText('STM SURFER', 0, 0); x.restore();
  return ctex(c);
}
function stmMarquee() {
  const [c, x] = cv(1024, 256); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#1b2036'); g.addColorStop(1, '#10131F'); x.fillStyle = g; x.fillRect(0, 0, 1024, 256);
  stmLogo(x, 128, 118, 2.6);
  x.fillStyle = '#fff'; x.font = `800 150px ${FONT_STM}`; x.textBaseline = 'middle'; x.fillText('STM SURFER', 250, 112);
  ['#12B76A', '#FF8A1F', '#FFD21F', '#2F86F6'].forEach((col, i) => { x.fillStyle = col; x.fillRect(250 + i * 180, 200, 160, 18); });
  x.font = `600 24px ${FONT_STM}`; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText('RUN EVERY LINE OF THE MONTREAL METRO', 252, 238);
  return ctex(c);
}
function drawSurfer(x, t) {                          // the screen: a three-lane run down a metro tunnel
  const W = 320, Hh = 240, vx = 160, vy = 92;
  const line = STM_LINES[Math.floor(t / 14) % STM_LINES.length], st = line.st[Math.floor(t / 3.5) % line.st.length];
  x.fillStyle = '#05060a'; x.fillRect(0, 0, W, Hh);
  // tunnel: walls and ceiling as converging bands, lights streaming past
  const g = x.createLinearGradient(0, vy, 0, Hh); g.addColorStop(0, '#0b0d16'); g.addColorStop(1, '#262b3d'); x.fillStyle = g;
  x.beginPath(); x.moveTo(0, Hh); x.lineTo(vx - 24, vy); x.lineTo(vx + 24, vy); x.lineTo(W, Hh); x.fill();
  for (let k = 0; k < 9; k++) { const z = ((k / 9 + t * .9) % 1), s = Math.pow(z, 2.2); const yy = vy - s * 110, xl = vx - 26 - s * 190, xr = vx + 26 + s * 190;
    x.fillStyle = `rgba(255,214,140,${.25 + s * .6})`; x.fillRect(xl - 2 * s, yy, 3 + s * 10, 2 + s * 3); x.fillRect(xr - 2 * s, yy, 3 + s * 10, 2 + s * 3); }
  // three lanes: rails and ties rushing toward us
  for (let l = -1; l <= 1; l++) for (const e of [-.32, .32]) { x.strokeStyle = '#7d8496'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(vx + (l * 14 + e * 10) * .6, vy); x.lineTo(vx + (l + e * .55) * 120 * 1.15, Hh); x.stroke(); }
  for (let k = 0; k < 12; k++) { const z = ((k / 12 + t * 1.6) % 1), s = Math.pow(z, 2.4), yy = vy + s * (Hh - vy); x.fillStyle = `rgba(110,96,80,${.3 + s * .5})`; x.fillRect(vx - 30 - s * 180, yy, 60 + s * 360, 1 + s * 4); }
  // an oncoming train in a lane that changes every few seconds
  const lane = [-1, 1, 0, 1, -1][Math.floor(t / 2.2) % 5], z = (t % 2.2) / 2.2, s = .12 + Math.pow(z, 2) * 1.1, tx = vx + lane * 120 * s * .95, ty = vy + s * (Hh - vy) * .78;
  const tw = 86 * s, th = 70 * s; x.fillStyle = '#1c4fb0'; x.fillRect(tx - tw / 2, ty - th, tw, th); x.fillStyle = '#e8eef9'; x.fillRect(tx - tw / 2, ty - th * .55, tw, th * .1);
  x.fillStyle = '#0b1530'; x.fillRect(tx - tw * .38, ty - th * .92, tw * .76, th * .3); x.fillStyle = '#fff6c8'; x.fillRect(tx - tw * .4, ty - th * .2, tw * .12, th * .08); x.fillRect(tx + tw * .28, ty - th * .2, tw * .12, th * .08);
  // the runner, hopping lanes
  const rl = [0, 1, 0, -1][Math.floor(t / 1.3) % 4], hop = Math.abs(Math.sin(t * 5)) * 10, rx = vx + rl * 92, ry = Hh - 22 - hop;
  x.fillStyle = '#FFD21F'; x.fillRect(rx - 6, ry - 26, 12, 14); x.fillStyle = '#f0c8a0'; x.fillRect(rx - 4, ry - 36, 8, 8); x.fillStyle = '#2F86F6'; x.fillRect(rx - 6, ry - 12, 5, 12); x.fillRect(rx + 1, ry - 12, 5, 12);
  // HUD: the line, the next station, a score
  x.fillStyle = line.c; x.fillRect(0, 0, W, 6); x.fillStyle = 'rgba(16,19,31,.85)'; x.fillRect(8, 12, 210, 34);
  x.fillStyle = '#fff'; x.font = `800 12px ${FONT_STM}`; x.fillText(line.name.toUpperCase() + ' · PROCHAINE STATION', 16, 25); x.font = `800 16px ${FONT_STM}`; x.fillText(st, 16, 42);
  x.textAlign = 'right'; x.font = `800 18px ${FONT_STM}`; x.fillText(String(Math.floor(t * 137) % 100000).padStart(6, '0'), W - 10, 26); x.textAlign = 'left';
}
function pieceSTM(G) {
  const p = galPiece('stm'), cab_ = new THREE.Group(), w = .7, D = .86;
  const navy = new THREE.MeshStandardMaterial({ color: 0x10131F, roughness: .45, metalness: .2 });
  const side = new THREE.MeshStandardMaterial({ map: stmSideArt(), roughness: .5, metalness: .1 }); side.map.repeat.set(1 / D, 1 / 1.9);
  const prof = new THREE.Shape(); [[0, 0], [.78, 0], [.78, .86], [.86, .9], [.86, .98], [.56, 1.07], [.48, 1.09], [.5, 1.6], [.62, 1.64], [.62, 1.9], [0, 1.9]].forEach(([u, v], i) => i ? prof.lineTo(u, v) : prof.moveTo(u, v));
  for (const sx of [-1, 1]) { const g = new THREE.ExtrudeGeometry(prof, { depth: .022, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(sx > 0 ? w / 2 + .022 : -w / 2, 0, 0); const m = new THREE.Mesh(g, side); m.castShadow = true; cab_.add(m); }
  const b = new Bucket();
  b.add(navy, bb(-w / 2, w / 2, 0, 1.9, 0, .02)); b.add(navy, bb(-w / 2, w / 2, 1.88, 1.9, 0, .62)); b.add(navy, bb(-w / 2, w / 2, 0, .86, .76, .78)); b.add(navy, bb(-w / 2, w / 2, .86, .98, .84, .86));
  b.build(cab_);
  const cp = new THREE.Mesh(new THREE.BoxGeometry(w, .035, .32), GAL_LIVE.blackM); cp.position.set(0, 1.02, .71); cp.rotation.x = Math.atan2(.09, .3); cab_.add(cp);
  // controls: stick and four buttons in the line colours
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .08, 8), M.chrome); stick.position.set(-.16, 1.08, .74); cab_.add(stick);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.024, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd8262b, roughness: .3 })); ball.position.set(-.16, 1.125, .74); cab_.add(ball);
  ['#FFD21F', '#2F86F6', '#12B76A', '#FF8A1F'].forEach((c, i) => { const bt = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .02, 16), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .5, roughness: .35 })); bt.position.set(.02 + (i % 2) * .07, 1.06 + (i > 1 ? .012 : 0), .76 - (i > 1 ? .06 : 0)); bt.rotation.x = Math.atan2(.09, .3); cab_.add(bt); });
  // screen in a black bezel, tilted back a little
  const bez = new THREE.Mesh(new THREE.PlaneGeometry(w, .52), GAL_LIVE.blackM); bez.position.set(0, 1.345, .492); bez.rotation.x = -.04; cab_.add(bez);
  const [sc, sx_] = cv(320, 240); drawSurfer(sx_, 0); const st = ctex(sc); GAL_LIVE.screen = st; GAL_LIVE.screenCtx = sx_;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.56, .42), new THREE.MeshBasicMaterial({ map: st, color: new THREE.Color(1.6, 1.6, 1.6) })); scr.position.set(0, 1.345, .5); scr.rotation.x = -.04; cab_.add(scr);
  const mq = new THREE.Mesh(new THREE.PlaneGeometry(w, .25), new THREE.MeshBasicMaterial({ map: stmMarquee(), color: new THREE.Color(1.5, 1.5, 1.5) })); mq.position.set(0, 1.77, .622); cab_.add(mq);
  // coin door
  const cd = new THREE.Mesh(new THREE.PlaneGeometry(.22, .26), new THREE.MeshStandardMaterial({ color: 0x23283a, roughness: .5, metalness: .5 })); cd.position.set(0, .5, .782); cab_.add(cd);
  for (const ox of [-.05, .05]) { const sl = new THREE.Mesh(new THREE.PlaneGeometry(.018, .05), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, .3) })); sl.position.set(ox, .56, .784); cab_.add(sl); }
  cab_.rotation.y = -Math.PI / 2; cab_.position.set(G.x1 - .02, 0, 5.35); gallery.add(cab_);
  cab_.traverse(o => { if (o.isMesh) { o.userData.act = galAct(p); hot.push(o); } });
  GAL_OBST.push([G.x1 - .9, G.x1, 5.35 - w / 2 - .05, 5.35 + w / 2 + .05]);
  pool(gallery, 1.3, .9, new V3(G.x1 - .55, .004, 5.35), 0, -Math.PI / 2, .22);
  addLabel(p, new V3(G.x1 - .006, 1.35, 4.55), -Math.PI / 2);
}

/* ---- 3 · Hope Library: a video-store wall of its 48 titles, coloured by theme, on a panel in the site's colours ---- */
function hopeAtlas() {
  const cw = 128, chh = 232, cols = 8, rows = 6, [c, x] = cv(cw * cols, chh * rows);
  HOPE_ITEMS.forEach(([name, year, kind, th], i) => {
    const ox = (i % cols) * cw, oy = Math.floor(i / cols) * chh, bg = HOPE_THEME[th] || '#2E5A45', light = lum(bg) > .55, ink = light ? '#1B2921' : '#F2F4EA';
    x.fillStyle = bg; x.fillRect(ox, oy, cw, chh);
    x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(ox, oy, 7, chh);                            // spine shadow
    x.fillStyle = light ? 'rgba(27,41,33,.12)' : 'rgba(242,244,234,.12)'; x.fillRect(ox + 12, oy + 12, cw - 22, 2);
    x.fillStyle = ink; x.font = `500 12px "IBM Plex Mono",monospace`; x.fillText(kind.toUpperCase(), ox + 13, oy + 30);
    x.font = `800 19px ${FONT_HOPE_D}`; let y = oy + 62; for (const l of wrapText(x, name, cw - 24).slice(0, 6)) { x.fillText(l, ox + 13, y); y += 21; }
    x.font = `italic 400 15px ${FONT_HOPE_B}`; x.fillText(year, ox + 13, oy + chh - 16);
  });
  return ctex(c);
}
function hopePanel() {
  const [c, x] = cv(1024, 1000); x.fillStyle = '#EDEFE4'; x.fillRect(0, 0, 1024, 1000);
  x.fillStyle = '#2E5A45'; x.font = `800 118px ${FONT_HOPE_D}`; x.fillText('Hope Library', 64, 150);
  x.fillStyle = '#1B2921'; x.font = `italic 400 50px ${FONT_HOPE_B}`; x.fillText('People are already building the future.', 66, 222);
  x.font = `500 24px "IBM Plex Mono",monospace`; x.fillStyle = '#5B695E'; x.fillText('48 HOPEFUL DOCUMENTARIES, SERIES AND FILMS · EN / FR', 68, 272);
  // the theme key along the bottom
  const keys = [['soil', 'Food & soil'], ['wild', 'Rewilding'], ['forest', 'Forests'], ['vision', 'Imagining futures'], ['land', 'Indigenous land'], ['ocean', 'Oceans'], ['fungi', 'Fungi'], ['community', 'Community']];
  x.font = `500 20px "IBM Plex Mono",monospace`; keys.forEach(([k, t], i) => { const ox = 68 + (i % 4) * 230, oy = 920 + Math.floor(i / 4) * 34; x.fillStyle = HOPE_THEME[k]; x.fillRect(ox, oy - 15, 18, 18); x.fillStyle = '#2A3830'; x.fillText(t, ox + 28, oy); });
  return ctex(c);
}
function pieceHope(G) {
  const p = galPiece('hope'), z = 5.2, W = 2.15, Hh = 2.1, y0 = .42;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshStandardMaterial({ map: hopePanel(), roughness: .85, emissive: 0xffffff, emissiveIntensity: .06 }));
  panel.material.emissiveMap = panel.material.map; panel.position.set(G.x0 + .006, y0 + Hh / 2, z); panel.rotation.y = Math.PI / 2; gallery.add(panel);
  // 12 x 4 cases face-out on four oak ledges
  const atlas = hopeAtlas(), cols = 12, cw = .11, chh = .198, gx = .136, gy = .25, gw = cols * gx, top = y0 + Hh - .72;
  const pos = [], uv = [], idx = []; const caseB = new Bucket(), ledge = new Bucket();
  const oak = new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: .7 });
  HOPE_ITEMS.forEach((it, i) => {
    const col = i % cols, row = Math.floor(i / cols), zc = z + gw / 2 - gx / 2 - col * gx, yc = top - row * gy - chh / 2, xf = G.x0 + .032;
    const a = i % 8, bR = Math.floor(i / 8), u0 = a / 8, u1 = (a + 1) / 8, v1 = 1 - bR / 6, v0 = 1 - (bR + 1) / 6, base = pos.length / 3;
    // the fronts face +x, so to someone looking at them the right hand side is -z
    pos.push(xf, yc - chh / 2, zc + cw / 2, xf, yc - chh / 2, zc - cw / 2, xf, yc + chh / 2, zc - cw / 2, xf, yc + chh / 2, zc + cw / 2);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1); idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    caseB.add(GAL_LIVE.blackM, bb(G.x0 + .007, xf - .001, yc - chh / 2, yc + chh / 2, zc - cw / 2, zc + cw / 2));
  });
  for (let r = 0; r < 4; r++) ledge.add(oak, wuv(bb(G.x0 + .006, G.x0 + .07, top - r * gy - chh - .02, top - r * gy - chh, z - gw / 2 - .04, z + gw / 2 + .04), .5, .5));
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx); fg.computeVertexNormals();
  const fronts = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: atlas, roughness: .35, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: .14 })); gallery.add(fronts);
  caseB.build(gallery); ledge.build(gallery);
  for (const o of [panel, fronts]) { o.userData.act = galAct(p); hot.push(o); }
  pool(gallery, W * 1.3, Hh * 1.25, new V3(G.x0 + .012, y0 + Hh / 2 + .1, z), Math.PI / 2, 0, .36);
  addLabel(p, new V3(G.x0 + .006, 1.35, z - W / 2 - .3), Math.PI / 2);
}

/* ---- 4 · Untitled (hands): the recursive drawing as a lightbox, each level of the recursion a layer deeper ---- */
function pieceHands(G, TL) {
  const p = galPiece('hands'), FW = 1.24, FH = FW * 524 / 1080, D = .26, z = 2.05, y = 1.62;
  const box = new THREE.Group(); box.position.set(G.x0, y, z); box.rotation.y = Math.PI / 2; gallery.add(box);
  // case: black lacquer frame with a deep black interior
  const b = new Bucket(), fr = .05, matte = new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 1, metalness: 0, envMapIntensity: 0 });   // matte black inside, so only the lines glow
  b.add(matte, bb(-FW / 2 - fr, FW / 2 + fr, FH / 2, FH / 2 + fr, 0, D)); b.add(matte, bb(-FW / 2 - fr, FW / 2 + fr, -FH / 2 - fr, -FH / 2, 0, D));
  b.add(matte, bb(-FW / 2 - fr, -FW / 2, -FH / 2, FH / 2, 0, D)); b.add(matte, bb(FW / 2, FW / 2 + fr, -FH / 2, FH / 2, 0, D));
  b.add(matte, bb(-FW / 2, FW / 2, -FH / 2, FH / 2, 0, .01));
  b.build(box);
  const map = TL.load('images/gallery/hands-lines.png'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(8, MAX_ANISO);
  // the recursion: rect(k+1) = offset + s * rect(k), measured off the original canvas (1080 x 524)
  const s = 350 / 1080, ou = 417 / 1080, ov = 173 / 524; let u0 = 0, v0 = 0, u1 = 1, v1 = 1;
  const lineM = new THREE.MeshBasicMaterial({ color: new THREE.Color(.42, .41, .38), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let k = 0; k < 4; k++) {
    const w = (u1 - u0) * FW, h = (v1 - v0) * FH, cx = ((u0 + u1) / 2 - .5) * FW, cy = (.5 - (v0 + v1) / 2) * FH, zz = D - .03 - k * .055;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1.9, 1.85, 1.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(cx, cy, zz); box.add(m); GAL_LIVE.hands.push(m);
    // next level's frame, drawn as a thin grey rectangle on this layer
    const nu0 = ou + s * u0, nv0 = ov + s * v0, nu1 = ou + s * u1, nv1 = ov + s * v1;
    const rx0 = (nu0 - .5) * FW, rx1 = (nu1 - .5) * FW, ry0 = (.5 - nv1) * FH, ry1 = (.5 - nv0) * FH, t = .0024;
    for (const g of [bb(rx0, rx1, ry1 - t, ry1, zz, zz + .001), bb(rx0, rx1, ry0, ry0 + t, zz, zz + .001), bb(rx0, rx0 + t, ry0, ry1, zz, zz + .001), bb(rx1 - t, rx1, ry0, ry1, zz, zz + .001)]) box.add(new THREE.Mesh(g, lineM));
    u0 = nu0; v0 = nv0; u1 = nu1; v1 = nv1;
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .1, roughness: .04, metalness: 0, envMapIntensity: 1.2, depthWrite: false }));
  glass.position.z = D - .005; box.add(glass);
  glass.userData.act = galAct(p); hot.push(glass);
  GAL_OBST.push([G.x0, G.x0 + D + .12, z - FW / 2 - .1, z + FW / 2 + .1]);
  pool(gallery, FW * 1.5, FH * 1.9, new V3(G.x0 + .006, y + .05, z), Math.PI / 2, 0, .16);
  addLabel(p, new V3(G.x0 + .006, 1.35, z - FW / 2 - .32), Math.PI / 2);
}

/* ---- 5 · Untitled (San Francisco): the map, as a big canvas on the brick ---- */
function pieceMap(G, TL) {
  const p = galPiece('sfmap'), W = 2.3, Hh = W / (2048 / 1609), y = 1.56;
  const map = TL.load('images/gallery/sf-map.webp'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(8, MAX_ANISO);
  const front = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .1, roughness: .88, envMapIntensity: .3 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .9 });
  const cvs = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, .045), [edge, edge, edge, edge, front, edge]);   // the +z face carries the picture...
  cvs.rotation.y = Math.PI; cvs.position.set(0, y, G.z1 - .03); gallery.add(cvs);                                     // ...and the half turn points it into the room
  cvs.userData.act = galAct(p); hot.push(cvs);
  pool(gallery, W * 1.4, Hh * 1.45, new V3(0, y + .1, G.z1 - .006), Math.PI, 0, .3);
  addLabel(p, new V3(W / 2 + .32, 1.35, G.z1 - .006), Math.PI);
}

/* ---- the gorilla: a faceted, lacquered red ape mid-roar, one fist out, one raised ---- */
function gorillaGeometry() {
  const parts = [], hj = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
  const jitter = (g, j) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (hj(x, y, z) - .5) * 2 * j; p.setXYZ(i, x * k, y * k, z * k); } return g; };
  const blob = (s, at, rot = [0, 0, 0], detail = 1, j = .07) => { const g = jitter(new THREE.IcosahedronGeometry(1, detail), j); g.scale(...s); g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(...at); parts.push(g); return g; };
  const limb = (a, b, r0, r1, sides = 6) => { const A = new V3(...a), B = new V3(...b), d = new V3().subVectors(B, A), L = d.length(); const g = jitter(new THREE.CylinderGeometry(r1, r0, L, sides, 2), .06); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z); parts.push(g); blob([r1 * 1.05, r1 * 1.05, r1 * 1.05], b, [0, 0, 0], 0, .05); };
  // body: pelvis low, a barrel chest leaning forward, the hump of the back, shoulders wider than anything else
  blob([.32, .22, .26], [0, .8, -.02]); blob([.38, .3, .32], [0, .99, .08], [.15, 0, 0]); blob([.54, .4, .42], [0, 1.24, .08], [-.18, 0, 0]);
  blob([.48, .32, .36], [0, 1.46, -.14], [.35, 0, 0]); blob([.36, .17, .27], [0, 1.55, -.02]);
  for (const sx of [-1, 1]) blob([.25, .23, .25], [sx * .5, 1.44, .02]);
  // head: low and forward between the shoulders, thrown back mid-roar, jaw dropped, fangs bared, the crest of a silverback
  const head = []; const hb = (s_, at, rot, d, j_) => head.push(blob(s_, at, rot, d, j_));
  blob([.22, .16, .22], [0, 1.66, .2], [-.3, 0, 0], 1, .05);                                                         // the thick neck, rising out of the chest
  hb([.21, .21, .21], [0, 1.83, .35], [0, 0, 0], 1, .06); hb([.07, .1, .16], [0, 1.99, .29], [0, 0, 0], 0, .05); hb([.2, .06, .09], [0, 1.87, .49], [0, 0, 0], 0, .05);
  hb([.16, .09, .14], [0, 1.77, .51], [-.25, 0, 0], 1, .05); hb([.14, .06, .13], [0, 1.63, .47], [.55, 0, 0], 0, .05);
  for (const sx of [-1, 1]) { hb([.05, .06, .04], [sx * .2, 1.85, .29], [0, 0, 0], 0, .04);
    const f = new THREE.ConeGeometry(.022, .075, 4); f.rotateX(Math.PI); f.translate(sx * .075, 1.69, .59); parts.push(f); head.push(f);
    const f2 = new THREE.ConeGeometry(.019, .06, 4); f2.translate(sx * .065, 1.62, .56); parts.push(f2); head.push(f2); }
  const pivot = new V3(0, 1.7, .28), tilt = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationX(-.3)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
  for (const g of head) g.applyMatrix4(tilt);
  // arms: long and heavy; (viewer's left) a fist driven forward, (viewer's right) a fist raised over the head
  limb([-.5, 1.44, .02], [-.78, 1.08, .3], .2, .17); limb([-.78, 1.08, .3], [-.56, 1.2, .74], .19, .15); blob([.17, .15, .19], [-.53, 1.21, .84], [.2, .3, 0], 0, .06);
  limb([.5, 1.44, .02], [.95, 1.48, -.02], .2, .17); limb([.95, 1.48, -.02], [.8, 1.94, .1], .19, .15); blob([.16, .18, .16], [.78, 2.06, .12], [0, 0, .2], 0, .06);
  // legs: short, bent, planted wide; big flat feet
  for (const sx of [-1, 1]) { limb([sx * .24, .76, -.04], [sx * .44, .44, .17], .2, .16); limb([sx * .44, .44, .17], [sx * .41, .11, .02], .16, .12); blob([.16, .08, .25], [sx * .43, .065, .11], [0, sx * .2, 0], 0, .05); }
  const merged = mergeGeometries(parts.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k); return n; }));
  merged.computeVertexNormals(); return merged;
}
function pieceGorilla(G) {
  const z = 4.05;
  const plinth = new THREE.Mesh(wuv(bb(-.62, .62, 0, .2, z - .62, z + .62), 1, 1), new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: .82 })); plinth.castShadow = plinth.receiveShadow = true; gallery.add(plinth);
  const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(.36, .006, .012), metalness: .45, roughness: .16, clearcoat: 1, clearcoatRoughness: .05, flatShading: true, envMapIntensity: 1.0 });
  const g = new THREE.Mesh(gorillaGeometry(), mat); g.rotation.y = Math.PI; g.position.set(0, .2, z); g.castShadow = true; gallery.add(g);
  GAL_OBST.push([-.75, .75, z - .75, z + .75]);
  pool(gallery, 2.6, 2.6, new V3(0, .006, z), 0, -Math.PI / 2, .45);
  const lab = { title: 'Kong', author: 'after Richard Orlinski', medium: 'faceted lacquered resin, red', blurb: '', url: '' };
  const m = addLabel(lab, new V3(.36, .205, z - .5), Math.PI); m.rotation.set(Math.PI / 2 - .35, Math.PI, 0); m.userData.act = { type: 'note', text: '<b>Kong</b> · after Richard Orlinski' };
}

/* ---- the armoured dove, painted on the middle vault ---- */
function pieceDove(TL) {
  const G = GAL, z0 = G.beams[0] + .09, z1 = G.beams[1] - .09, Hz = z1 - z0 - .06, W = Hz * 548 / 450, zc = (z0 + z1) / 2, segs = 24;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= segs; j++) {
    const z = zc - Hz / 2 + Hz * j / segs, t = (z - z0) / (z1 - z0), y = G.yb + G.rise * Math.sin(Math.PI * clamp(t, 0, 1)) - .006;
    for (const [x, u] of [[W / 2, 0], [-W / 2, 1]]) { pos.push(x, y, z); uv.push(u, 1 - j / segs); }   // seen from the door looking up: image right is -x, image top is the near end
  }
  for (let j = 0; j < segs; j++) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }   // facing down
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const map = TL.load('images/gallery/dove.webp'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(8, MAX_ANISO);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: .04, roughness: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .16 }));
  m.renderOrder = 3; gallery.add(m);
}

/* ---- the intro wall: As Is, and what is on tonight ---- */
function introPanel() {
  const [c, x] = cv(1100, 1000); x.fillStyle = '#121212'; x.fillRect(0, 0, 1100, 1000);
  return new Promise(res => {
    const im = new Image(); im.onload = () => { const w = 300, h = w * im.height / im.width; x.drawImage(im, 70, 70, w, h); fin(); }; im.onerror = fin; im.src = 'images/as-is-logo.png';
    function fin() {
      x.fillStyle = '#f2efe6'; x.font = `600 92px "Cormorant Garamond",Georgia,serif`; x.fillText('As Is', 420, 190);
      x.font = `500 24px "IBM Plex Mono",monospace`; x.fillStyle = '#b8b2a4'; x.fillText('TONIGHT\'S PROJECTS · FLOOR 2', 424, 240);
      const list = [...GAL_PIECES.values()]; x.font = `500 40px "Cormorant Garamond",Georgia,serif`; let y = 470;
      for (const p of list) { x.fillStyle = '#f2efe6'; x.fillText(p.title, 70, y); if (p.author) { x.font = `500 22px "IBM Plex Mono",monospace`; x.fillStyle = '#9a9486'; x.fillText(p.author, 70, y + 32); x.font = `500 40px "Cormorant Garamond",Georgia,serif`; } y += p.author ? 92 : 68; }
      res(ctex(c));
    }
  });
}

function buildGallery() {
  const G = GAL, TL = new THREE.TextureLoader();
  gallery.position.y = GALLERY_FLOOR * H;
  GAL_LIVE.blackM = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: .5, metalness: .4 });
  GAL_LIVE.poolTex = poolTexture(); GAL_LIVE.lensM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.1, 2.0) });
  const BR = brickTextures(), PL = plasterTextures(), FL = floorTextures();
  const plaster = new THREE.MeshStandardMaterial({ map: PL.map, normalMap: PL.normal, roughness: .93, metalness: 0, color: 0xe2dccf, envMapIntensity: .22, normalScale: new THREE.Vector2(.8, .8) });
  const brick = new THREE.MeshStandardMaterial({ map: BR.map, normalMap: BR.normal, roughness: .9, metalness: 0, color: 0xa48c7a, envMapIntensity: .2 });
  const vaultM = brick;
  const floorM = new THREE.MeshStandardMaterial({ map: FL.map, normalMap: FL.normal, roughness: .7, metalness: 0, envMapIntensity: .3, color: 0xc4beb6 });
  const b = new Bucket();
  // floor and walls
  b.add(floorM, wuv(bb(G.x0 - .2, G.x1 + .2, -.08, 0, WALL_Z, G.z1 + .2), 3, 3));
  for (const g of holedWall('x', G.x0 - .2, G.x0, WALL_Z, G.z1, 0, G.yb, [])) b.add(plaster, wuv(g, 2.5, 2.5));
  for (const g of holedWall('x', G.x1, G.x1 + .2, WALL_Z, G.z1, 0, G.yb, [])) b.add(plaster, wuv(g, 2.5, 2.5));
  for (const g of holedWall('z', G.z1, G.z1 + .2, G.x0 - .2, G.x1 + .2, 0, G.yb, [])) b.add(brick, wuv(g, 1, 1));
  // the lift wall: a plaster skin over the shaft's own slab, with the doorway, and solid wall beyond the shaft
  for (const g of holedWall('z', WALL_Z, WALL_Z + .02, G.x0, G.x1, 0, G.yb, [[-DOOR_W / 2, DOOR_W / 2, -1, DOOR_H]])) b.add(plaster, wuv(g, 2.5, 2.5));
  b.add(plaster, wuv(bb(G.x0 - .2, SHAFT.x0 - .2, 0, G.yb + G.rise + .1, 0, WALL_Z), 2.5, 2.5)); b.add(plaster, wuv(bb(1.85, G.x1 + .2, 0, G.yb + G.rise + .1, 0, WALL_Z), 2.5, 2.5));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, -DOOR_W / 2, 0, DOOR_H + .12, WALL_Z + .02, WALL_Z + .06), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(DOOR_W / 2, DOOR_W / 2 + .12, 0, DOOR_H + .12, WALL_Z + .02, WALL_Z + .06), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, DOOR_W / 2 + .12, DOOR_H, DOOR_H + .14, WALL_Z + .02, WALL_Z + .06), .5, .5, DOOR_H));
  b.add(M.brass, wuv(bb(-DOOR_W / 2, DOOR_W / 2, -.01, .008, 0, WALL_Z + .03), .3, .3));
  // vaults between the beams, lunettes where they meet the side walls
  const edges = [WALL_Z, ...G.beams, G.z1];
  for (let i = 0; i < edges.length - 1; i++) {
    const z0 = edges[i] + (i ? .09 : 0), z1 = edges[i + 1] - (i < edges.length - 2 ? .09 : 0);
    b.add(vaultM, vaultGeometry(z0, z1, G.x0, G.x1));
    b.add(plaster, lunetteGeometry(G.x0, z0, z1, 1)); b.add(plaster, lunetteGeometry(G.x1, z0, z1, -1));
  }
  // steel: the beams, angles along the end walls, the two track rails and their hangers
  for (const z of G.beams) { b.add(GAL_LIVE.blackM, bb(G.x0, G.x1, G.yb - .1, G.yb - .07, z - .09, z + .09)); b.add(GAL_LIVE.blackM, bb(G.x0, G.x1, G.yb - .07, G.yb + .12, z - .012, z + .012)); }
  for (const z of [WALL_Z + .045, G.z1 - .025]) b.add(GAL_LIVE.blackM, bb(G.x0, G.x1, G.yb - .06, G.yb + .01, z - .025, z + .025));
  const railY = G.yb - .19;
  for (const x of [-1.6, 1.6]) { b.add(GAL_LIVE.blackM, bb(x - .014, x + .014, railY, railY + .03, .55, G.z1 - .3)); for (const z of G.beams) b.add(GAL_LIVE.blackM, bb(x - .006, x + .006, railY + .03, G.yb - .1, z - .006, z + .006)); }
  b.build(gallery);
  doors.galL = galDoor(-1); doors.galR = galDoor(1);
  // the pieces
  pieceRapailler(G, TL); pieceSTM(G); pieceHope(G); pieceHands(G, TL); pieceMap(G, TL); pieceGorilla(G); pieceDove(TL); floatingLogo(TL);
  // spots on the rails, one or two per piece
  const S = railY - .02;
  spot(railY, new V3(1.6, S, 1.4), new V3(G.x1, 1.7, 1.7)); spot(railY, new V3(1.6, S, 2.5), new V3(G.x1, 1.6, 2.3));
  spot(railY, new V3(1.6, S, 5.0), new V3(G.x1 - .4, 1.3, 5.35));
  spot(railY, new V3(-1.6, S, 4.6), new V3(G.x0, 1.6, 4.8)); spot(railY, new V3(-1.6, S, 5.8), new V3(G.x0, 1.6, 5.6));
  spot(railY, new V3(-1.6, S, 2.05), new V3(G.x0, 1.6, 2.05));
  spot(railY, new V3(-1.6, S, 6.6), new V3(-.4, 1.6, G.z1)); spot(railY, new V3(1.6, S, 6.6), new V3(.4, 1.6, G.z1));
  spot(railY, new V3(-1.6, S, 3.4), new V3(0, 1.4, 4.05)); spot(railY, new V3(1.6, S, 3.4), new V3(0, 1.6, 4.05));
  // the intro wall, left of the door
  introPanel().then(t => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.82), new THREE.MeshStandardMaterial({ map: t, roughness: .85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .1 })); m.position.set(-2.05, 1.5, WALL_Z + .025); gallery.add(m); });
  pool(gallery, 2.6, 2.3, new V3(-2.05, 1.6, WALL_Z + .024), 0, 0, .14);
  // one warm fill from the middle of the room (the landings have one lamp too, so the light count does not change)
  GAL_LIVE.light = new THREE.PointLight(new THREE.Color(1, .68, .4), 3.2, 9, 1.6); GAL_LIVE.light.position.set(0, 2.45, 3.6); gallery.add(GAL_LIVE.light);
}

/* ---- the As Is logo, floating in the air past the lift door: walk through it and it's gone (back on the next arrival) ---- */
const AS_IS_FLOAT = { z: 1.45, y: 1.58, w: 1.0 };
function floatingLogo(TL) {
  const map = TL.load('images/as-is-logo.png'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(8, MAX_ANISO);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(AS_IS_FLOAT.w, AS_IS_FLOAT.w * 238 / 272), new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1.9, 1.85, 1.7), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(0, AS_IS_FLOAT.y, AS_IS_FLOAT.z); m.rotation.y = Math.PI; m.renderOrder = 6; gallery.add(m);   // faces the lift, reads the right way round from it
  GAL_LIVE.logo = { m, state: 'shown', t: 0, rearm: false };
}
function floatingLogoTick(dt, time) {
  const L = GAL_LIVE.logo; if (!L) return;
  if (lift.floor !== GALLERY_FLOOR || lift.phase === 'riding') L.rearm = true;                 // left the floor: bring it back next time
  if (L.rearm && lift.floor === GALLERY_FLOOR && lift.phase !== 'riding') { L.rearm = false; L.state = 'shown'; L.t = 0; L.m.visible = true; L.m.material.opacity = 1; L.m.scale.setScalar(1); }
  if (L.state === 'shown') {
    L.m.position.y = AS_IS_FLOAT.y + Math.sin(time * 1.3) * .035; L.m.rotation.y = Math.PI + Math.sin(time * .7) * .09;
    L.m.material.opacity = .86 + Math.sin(time * 2.1) * .1;
    if (D.state === 'play' && lift.floor === GALLERY_FLOOR && !P.inCab && P.pos.z > AS_IS_FLOAT.z && Math.abs(P.pos.x) < AS_IS_FLOAT.w * .7) {   // walked through it
      L.state = 'going'; L.t = 0; if (A.ctx) { const t = now_(); bell(t, 1318.5, .05); bell(t + .09, 1760, .045); bell(t + .2, 2637, .03); }
    }
  } else if (L.state === 'going') {
    L.t += dt; const k = clamp(L.t / .7, 0, 1);
    L.m.material.opacity = (1 - k) * (1 - k); L.m.scale.setScalar(1 + k * .35); L.m.position.y += dt * .25;
    if (k >= 1) { L.state = 'gone'; L.m.visible = false; }
  }
}

/* ---- runtime ---- */
function galleryHere() { return D.state === 'play' && lift.floor === GALLERY_FLOOR && lift.phase !== 'riding' && (lift.doors > 0 || !P.inCab); }
function galleryTick(dt, time) {
  const near = (lift.floor === GALLERY_FLOOR || lift.target === GALLERY_FLOOR) && Math.abs(lift.y - GALLERY_FLOOR * H) < 1.2 * H;
  gallery.visible = near;
  floatingLogoTick(dt, time);
  if (!near) return;
  // the arcade screen runs at 20 fps while you are in the room
  GAL_LIVE.screenT -= dt;
  if (GAL_LIVE.screen && GAL_LIVE.screenT <= 0 && galleryHere()) { GAL_LIVE.screenT = 1 / 20; drawSurfer(GAL_LIVE.screenCtx, time); GAL_LIVE.screen.needsUpdate = true; }
  // the lightbox breathes, a little out of step layer by layer
  GAL_LIVE.hands.forEach((m, k) => { const v = 1.7 + Math.sin(time * .8 - k * .9) * .25; m.material.color.setRGB(v * 1.02, v, v * .92); });
}
function openLink(a) {
  const l = document.createElement('a'); l.href = a.url; l.target = '_blank'; l.rel = 'noopener'; document.body.appendChild(l);
  try { l.click(); } catch (e) { } l.remove();
  sfxClick(); caption(`Opening <b>${esc(a.label)}</b>`, 3);
}
