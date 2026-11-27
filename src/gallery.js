
/* ======================================================================
   FLOOR 2 · AS IS: a cellar gallery for the projects presented on 11.25.2026.
   Raw whitewashed plaster with brick showing through, brick jack-arch vaults between black steel beams,
   a scarred concrete floor, track spots on two rails, warm and dim. One piece per project (the list is
   GALLERY in head.html), a red faceted gorilla in the middle, the armoured dove on the vault above it.
   Every piece with a link opens it in a new tab when clicked.
   ====================================================================== */
const GALLERY_FLOOR = 2;
const GAL = { x0: -3.3, x1: 3.3, z1: 12.2, yb: 2.72, rise: .4, beams: [2.6, 5.0, 7.4, 9.8] };   // room (five bays long), springing line of the vaults, their rise, the beams between bays
const GAL_AT = { rapailler: 2.6, hands: 3.4, stm: 5.6, gorilla: 6.2, hope: 8.6, slide: 8.25, studio: 10.16 };   // where along the room each piece stands (z of its centre)
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
  const g = doorLeaf(gallery, sx, 0, .035); g.position.set(sx * .265, 0, .035); return g;
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
function spot(rail, from, to, beam = true, beamMat = SPOT_BEAM) {
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
    const m = new THREE.Mesh(cone, beamMat); m.renderOrder = 5; m.frustumCulled = false; can.add(m);
  }
  return can;
}
// wall pools sit 9 mm off the wall, 3 mm in front of the labels (6 mm), so the glow never shares a plane with a label
function pool(parent, w, h, pos, rotY, rotX = 0, strength = .3, tint = [1, .74, .46]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: GAL_LIVE.poolTex, color: new THREE.Color(...tint).multiplyScalar(strength), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
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
// the rule for cards: always to the right of the piece as you face it, .3 m past its edge, at the same height.
// at: the piece's centre on its wall; half: its half width along the wall; facing: the way it faces, into the room
function labelRight(p, at, half, facing) {
  const right = new V3(0, 1, 0).cross(facing), pos = at.clone().addScaledVector(right, half + .3).addScaledVector(facing, .006); pos.y = 1.35;
  return addLabel(p, pos, Math.atan2(facing.x, facing.z));
}
function addLabel(p, pos, rotY) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(.24, .15), new THREE.MeshStandardMaterial({ map: labelCard(p), roughness: .7, emissive: 0xffffff, emissiveIntensity: .12, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.material.emissiveMap = m.material.map; m.position.copy(pos); m.rotation.y = rotY; gallery.add(m);
  m.userData.act = galAct(p); hot.push(m); return m;
}

/* ---- 1 · Rapailler la langue (Pascal Huynh): the deck's title slide as a printed panel ---- */
function pieceRapailler(G, TL) {
  const p = galPiece('rapailler'), W = 2.3, Hh = W / (2128 / 1180), z = GAL_AT.rapailler, y = 1.6;
  const map = TL.load('images/gallery/rapailler.webp'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(8, MAX_ANISO);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .4, roughness: .55, envMapIntensity: .3 }));
  panel.position.set(G.x1 - .016, y, z); panel.rotation.y = -Math.PI / 2; gallery.add(panel);
  const back = new THREE.Mesh(bb(G.x1 - .015, G.x1 - .002, y - Hh / 2, y + Hh / 2, z - W / 2, z + W / 2), GAL_LIVE.blackM); gallery.add(back);
  panel.userData.act = galAct(p); hot.push(panel);
  pool(gallery, W * 1.45, Hh * 1.7, new V3(G.x1 - .009, y + .08, z), -Math.PI / 2, 0, .42);
  labelRight(p, new V3(G.x1, 0, z), W / 2, new V3(-1, 0, 0));
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
const STM_Z = GAL_AT.stm;                              // against the right wall, the middle bay
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
  cab_.rotation.y = -Math.PI / 2; cab_.position.set(G.x1 - .02, 0, STM_Z); gallery.add(cab_);
  cab_.traverse(o => { if (o.isMesh) { o.userData.act = galAct(p); hot.push(o); } });
  GAL_OBST.push([G.x1 - .9, G.x1, STM_Z - w / 2 - .05, STM_Z + w / 2 + .05]);
  pool(gallery, 1.3, .9, new V3(G.x1 - .55, .004, STM_Z), 0, -Math.PI / 2, .22);
  labelRight(p, new V3(G.x1, 0, STM_Z), w / 2 + .022, new V3(-1, 0, 0));
}

/* ---- 3 · Hope Library: a DVD room set into the left wall, after the famous little white room of shelves packed with films.
   An opening in the bay round GAL_AT.hope; behind it a white room lit from its ceiling, shelves floor to ceiling on three
   walls, the site's own titles face out at eye level on the back wall, the site's mark in green neon over the door, and
   grass with a few small flowers at the step. The room's light is painted into its vertices: the cellar keeps its one
   lamp (no light is added, so nothing recompiles), and the room glows white out of the dim gallery. ---- */
const DVD = { hw: .72, oh: 2.2, d: 1.95, w: 1.2, h: 2.46, sd: .29, top: 2.4 };   // opening half width and height; the room's depth (x), half width (z), height; shelf depth and height
function dvdBox() { const zc = GAL_AT.hope, X1 = GAL.x0 - .2; return { zc, X1, X0: X1 - DVD.d, Z0: zc - DVD.w, Z1: zc + DVD.w }; }
// where you can walk: in through the opening, and the floor between the shelves
function dvdRects(r) {
  const { zc, X1, X0, Z0, Z1 } = dvdBox();
  return [[X1 - r - .05, GAL.x0 + r + .05, zc - DVD.hw + r, zc + DVD.hw - r], [X0 + DVD.sd + r, X1 - r, Z0 + DVD.sd + r, Z1 - DVD.sd - r]];
}
// how thick the grass is at (x, z) on the gallery floor: full at the step, thinning out raggedly into the concrete
function dvdLawnK(x, z) {
  const u = Math.max(0, x - GAL.x0) / 1.05, v = (z - GAL_AT.hope) / 1.2;
  const wob = .16 * Math.sin(z * 9.1 + x * 3.7) * Math.sin(x * 6.3 - z * 2.3) + .07 * Math.sin(z * 23 + x * 17);
  return 1 - sstep(.45, 1, Math.hypot(u, v) + wob);
}
function dvdSurface(x, z) {   // underfoot: the room's carpet, the grass at its step
  if (x < GAL.x0 - .2) return 'carpet';
  if (x < GAL.x0 + 1.1 && Math.abs(z - GAL_AT.hope) < 1.3 && dvdLawnK(x, z) > .4) return 'grass';
  return null;
}
// the room's ceiling light, worked out per vertex: falls off with distance, stronger where a face turns towards it
function dvdLight(p, n) {
  const { zc, X0, X1 } = dvdBox(), dx = (X0 + X1) / 2 - p.x, dy = DVD.h - .05 - p.y, dz = zc - p.z, d = Math.hypot(dx, dy, dz) || 1;
  const c = Math.max(0, (n.x * dx + n.y * dy + n.z * dz) / d);
  return .3 + .95 * (.3 + .7 * c) / (1 + (d / 1.5) ** 2);
}
function dvdBake(g, f = dvdLight) {
  const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3), a = new V3(), b = new V3();
  for (let i = 0; i < p.count; i++) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(n, i); const v = f(a, b); c[i * 3] = v; c[i * 3 + 1] = v * .985; c[i * 3 + 2] = v * .95; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
// lit by its baked vertex light (the emissive follows the vertex colour too); optionally kept sharp in the painted looks
function dvdMat(o, sharp = false) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: .8, metalness: 0, emissive: 0xffffff, emissiveIntensity: .85, envMapIntensity: .25 }, o));
  if (m.map && !m.emissiveMap) m.emissiveMap = m.map;
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor.rgb;');
    if (sharp) sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', KEEP_CHUNK);
  };
  m.customProgramCacheKey = () => 'dvdLit' + (sharp ? 'S' : '') + (m.map ? 'M' : '');
  m.userData.keepSharp = true;                         // finishSubtree leaves it as it is
  return m;
}
function dvdMesh(list, mat, parent, act) {
  const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = false; m.receiveShadow = true; parent.add(m);
  if (act) { m.userData.act = act; hot.push(m); } return m;
}
/* the spines, six long strips of them (2.8 m each), drawn like the photos: mostly black cases, then white, yellow, red, blue, grey;
   a logo block at the top, the title running down the middle, a number at the foot; Blu-rays a little shorter; the shadowed back of
   the shelf above them */
const DVD_PX = 720, DVD_STRIP = 170;                 // pixels a metre along a strip; a strip's height (one row's clearance)
function dvdSpines() {
  const W = 2048, N = 6, [c, x] = cv(W, DVD_STRIP * N), r = rng(8801);
  const pal = [['#0e0e10', 30], ['#19191d', 10], ['#2a2a2e', 5], ['#eceae4', 12], ['#e6bd36', 7], ['#b32e28', 6], ['#2d4b8c', 5], ['#7b7d82', 5], ['#d8cfb8', 4], ['#2a6646', 2], ['#d6742c', 2], ['#5a2846', 2]];
  const tot = pal.reduce((s, p) => s + p[1], 0), pick = () => { let k = r() * tot; for (const [col, w] of pal) if ((k -= w) < 0) return col; return pal[0][0]; };
  const inkOn = (col) => lum(col) > .5 ? (r() < .7 ? '#141414' : '#9a2a22') : (r() < .65 ? '#ecebe6' : r() < .5 ? '#e6bd36' : '#c8c8c8');
  for (let s = 0; s < N; s++) {
    const y0 = s * DVD_STRIP, y1 = y0 + DVD_STRIP;
    const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#3a3631'); g.addColorStop(.18, '#1a1815'); g.addColorStop(1, '#0d0c0b');
    x.fillStyle = g; x.fillRect(0, y0, W, DVD_STRIP);
    let px = 1;
    while (px < W - 1) {
      const kind = r(), w = kind < .1 ? 18 + r() * 12 : kind < .22 ? 6 + r() * 1.5 : 9.4 + r() * 1.6;   // box sets, slim cases, the usual 14 mm
      const hk = kind < .1 ? .88 + r() * .05 : r() < .2 ? .74 + r() * .03 : .8 + r() * .015, top = y1 - DVD_STRIP * hk;
      const col = pick(), ww = Math.min(w, W - 1 - px) - .7;
      x.fillStyle = col; x.fillRect(px, top, ww, y1 - top);
      const sh = x.createLinearGradient(0, top, 0, y1); sh.addColorStop(0, 'rgba(255,255,255,.1)'); sh.addColorStop(.12, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.18)');
      x.fillStyle = sh; x.fillRect(px, top, ww, y1 - top);
      const ink = inkOn(col), hh = y1 - top;
      if (r() < .55) { x.fillStyle = r() < .5 ? ink : (lum(col) > .5 ? '#151515' : '#ecebe6'); x.fillRect(px + 1, top + hh * .04, ww - 2, hh * (.07 + r() * .06)); }   // the label's logo block
      x.fillStyle = ink;                                                                                                  // the title, letter by letter down the spine
      const tw = Math.max(1.2, ww * (.26 + r() * .2)), tx = px + (ww - tw) / 2; let ty = top + hh * (.2 + r() * .06); const tEnd = top + hh * (.62 + r() * .2);
      while (ty < tEnd) { const lh = 1.6 + r() * 3.4; x.fillRect(tx, ty, tw, lh); ty += lh + .9 + (r() < .12 ? 3 + r() * 4 : 0); }
      if (r() < .5) { x.fillStyle = ink; x.fillRect(px + ww * .25, y1 - hh * .09, ww * .5, hh * .035); }               // the spine number
      x.fillStyle = 'rgba(255,255,255,.13)'; x.fillRect(px, top, .8, y1 - top); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(px + ww - .6, top, .6, y1 - top);
      px += w + (r() < .03 ? 2 + r() * 3 : 0);
    }
    x.fillStyle = '#0b0a09'; x.fillRect(0, y1 - 1, W, 1);
  }
  return galTex(c, true, false);
}
// the 48 titles as DVD covers in the site's theme colours, each with the site's sun on the horizon
function dvdCovers() {
  const cw = 128, chh = 180, [c, x] = cv(cw * 8, chh * 6);
  HOPE_ITEMS.forEach(([name, year, kind, th], i) => {
    const ox = (i % 8) * cw, oy = Math.floor(i / 8) * chh, bg = HOPE_THEME[th] || '#2E5A45', light = lum(bg) > .55, ink = light ? '#1B2921' : '#F2F4EA';
    x.fillStyle = bg; x.fillRect(ox, oy, cw, chh);
    const hy = oy + chh - 40; x.fillStyle = light ? 'rgba(27,41,33,.16)' : 'rgba(242,244,234,.16)'; x.beginPath(); x.arc(ox + cw - 34, hy, 20, Math.PI, 0); x.fill(); x.fillRect(ox + 10, hy, cw - 20, 2);
    x.fillStyle = ink; x.font = `500 10px "IBM Plex Mono",monospace`; x.fillText(kind.toUpperCase(), ox + 10, oy + 19);
    x.font = `800 17px ${FONT_HOPE_D}`; let y = oy + 42; for (const l of wrapText(x, name, cw - 20).slice(0, 5)) { x.fillText(l, ox + 10, y); y += 18; }
    x.font = `italic 400 13px ${FONT_HOPE_B}`; x.fillText(year, ox + 10, oy + chh - 12);
    const sl = x.createLinearGradient(ox, 0, ox + cw, 0); sl.addColorStop(0, 'rgba(255,255,255,.16)'); sl.addColorStop(.1, 'rgba(255,255,255,0)'); sl.addColorStop(.9, 'rgba(0,0,0,0)'); sl.addColorStop(1, 'rgba(0,0,0,.18)');
    x.fillStyle = sl; x.fillRect(ox, oy, cw, chh);
  });
  return galTex(c, true, false);
}
function dvdCarpet() {                                 // short-pile green carpet, 0.5 m a repeat
  const n = 256, [c, x] = cv(n, n), im = x.createImageData(n, n), f = fbm(n, 8901, [[8, .5], [32, .3], [128, .2]]), r = rng(8902);
  for (let i = 0; i < n * n; i++) { const v = .78 + f[i] * .3 + (r() - .5) * .16; im.data[i * 4] = 46 * v; im.data[i * 4 + 1] = 74 * v; im.data[i * 4 + 2] = 44 * v; im.data[i * 4 + 3] = 255; }
  x.putImageData(im, 0, 0); return galTex(c);
}
// the neon: the site's mark (a sun on the horizon, a shorter line beneath) and the name, in green tube with a white-hot core
function dvdNeon() {
  const W = 1024, Hc = 320, [c, x] = cv(W, Hc), F = `600 190px "Caveat","Permanent Marker",cursive`, word = 'Hopium', by = 238;
  x.font = F; const tw = x.measureText(word).width, mw = 210, gap = 46, ox = (W - (mw + gap + tw)) / 2, cx = ox + mw / 2, cy = 214, tx = ox + mw + gap;
  const mark = (lw) => {
    x.lineWidth = lw; x.lineCap = x.lineJoin = 'round';
    x.beginPath(); x.arc(cx, cy, 74, Math.PI, 0); x.stroke();
    x.beginPath(); x.moveTo(cx - mw / 2, cy); x.lineTo(cx + mw / 2, cy); x.stroke();
    x.beginPath(); x.moveTo(cx - 66, cy + 40); x.lineTo(cx + 66, cy + 40); x.stroke();
  };
  const glow = (col, blur, lwMark, lwText) => { x.save(); x.shadowColor = col; x.shadowBlur = blur; x.strokeStyle = x.fillStyle = col; mark(lwMark); x.font = F; x.lineWidth = lwText; x.lineJoin = 'round'; x.strokeText(word, tx, by); x.fillText(word, tx, by); x.restore(); };
  glow('rgba(40,255,110,.34)', 60, 18, 10); glow('rgba(40,255,110,.34)', 60, 18, 10); glow('rgba(110,255,150,.8)', 20, 13, 4);
  x.save(); x.strokeStyle = x.fillStyle = '#6dff9c'; mark(11); x.font = F; x.fillText(word, tx, by); x.restore();            // the tube
  x.save(); x.strokeStyle = x.fillStyle = '#f0fff4'; mark(4.5); x.font = F; x.fillText(word, tx, by);                     // its white-hot core,
  x.strokeStyle = '#6dff9c'; x.lineWidth = 9; x.lineJoin = 'round'; x.strokeText(word, tx, by); x.restore();               // green again at the letters' edges
  return galTex(c, true, false);
}
// low grass and a few small flowers at the step, on the concrete in front of the opening; lit by the room's light spilling out
function dvdLawn(parent) {
  const { zc, X1 } = dvdBox(), G = GAL, r = rng(9101), pos = [], nrm = [], col = [], idx = [];
  const spill = (p) => .55 + 1.15 / (1 + ((p.x - G.x0) / .8) ** 2 + ((p.z - zc) / 1.05) ** 2) * (1 - p.y * 1.2);
  const tri = (a, b, c_, ca, cb, cc) => {                                              // both faces, normals up (lit like the ground it grows from)
    const base = pos.length / 3; for (const [p, q] of [[a, ca], [b, cb], [c_, cc]]) { const s = spill(p); pos.push(p.x, p.y, p.z); nrm.push(0, 1, 0); col.push(q[0] * s, q[1] * s, q[2] * s); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 1);
  };
  const N = isTouch ? 2200 : 4200; let n = 0;
  for (let i = 0; i < N * 5 && n < N; i++) {
    const x = lerp(X1 + .02, G.x0 + 1.12, r()), z = lerp(zc - 1.3, zc + 1.3, r());
    let k = dvdLawnK(x, z); if (x < G.x0) k *= .4 * (x - X1) / .2;
    if (r() > k) continue; n++;
    const h = (.045 + .095 * r() * r()) * (.45 + .55 * k), w = .003 + r() * .0028, yaw = r() * Math.PI, la = r() * 6.283, lean = (.15 + r() * .35) * h;
    const lx = Math.cos(yaw) * w, lz = Math.sin(yaw) * w, t = r();
    const cb = [.06 + t * .03, .13 + t * .04, .035], ct = [.26 + t * .14, .44 + t * .12, .1 + t * .05];
    tri(new V3(x - lx, .001, z - lz), new V3(x + lx, .001, z + lz), new V3(x + Math.cos(la) * lean, h, z + Math.sin(la) * lean), cb, cb, ct);
  }
  // flowers, here and there where the grass is thick: daisies mostly, a few buttercups and violets
  const kinds = [[[.95, .93, .86], [.93, .72, .2], 6], [[.95, .93, .86], [.93, .72, .2], 6], [[.95, .78, .16], [.8, .55, .08], 5], [[.56, .46, .84], [.95, .9, .6], 5], [[.92, .62, .72], [.95, .85, .5], 5]];
  const placed = [];
  for (let i = 0; i < 500 && placed.length < 30; i++) {
    const x = lerp(G.x0 + .04, G.x0 + .95, r()), z = lerp(zc - 1.15, zc + 1.15, r());
    if (dvdLawnK(x, z) < .5 || placed.some(([a, b]) => Math.hypot(a - x, b - z) < .12)) continue;
    placed.push([x, z]);
    const [pc, cc, np] = kinds[Math.floor(r() * (r() < .55 ? 2 : kinds.length))], hs = .06 + r() * .07, rp = .012 + r() * .008, tilt = (r() - .5) * .5, a0 = r() * 6.283;
    const top = new V3(x + Math.cos(a0) * tilt * .03, hs, z + Math.sin(a0) * tilt * .03), sc = [.08, .16, .05];
    tri(new V3(x - .0015, .001, z), new V3(x + .0015, .001, z), top, sc, sc, sc);
    for (let j = 0; j < np; j++) {
      const a = a0 + j / np * 6.283, s = .32;
      tri(top.clone().add(new V3(0, .001, 0)), top.clone().add(new V3(Math.cos(a - s) * rp, .003, Math.sin(a - s) * rp)), top.clone().add(new V3(Math.cos(a + s) * rp, .003, Math.sin(a + s) * rp)), pc, pc, pc);
      tri(top.clone().add(new V3(Math.cos(a - s) * rp, .003, Math.sin(a - s) * rp)), top.clone().add(new V3(Math.cos(a) * rp * 1.25, .005, Math.sin(a) * rp * 1.25)), top.clone().add(new V3(Math.cos(a + s) * rp, .003, Math.sin(a + s) * rp)), pc, pc, pc);
    }
    for (let j = 0; j < 6; j++) { const a = j / 6 * 6.283, b = (j + 1) / 6 * 6.283, rc = rp * .36; tri(top.clone().add(new V3(0, .006, 0)), top.clone().add(new V3(Math.cos(a) * rc, .005, Math.sin(a) * rc)), top.clone().add(new V3(Math.cos(b) * rc, .005, Math.sin(b) * rc)), cc, cc, cc); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, dvdMat({ roughness: .75, emissiveIntensity: .42 })); m.castShadow = false; parent.add(m);
  // the soil it grows from: a dark mossy stain on the concrete, ragged like the grass
  const n2 = 256, [c, x] = cv(n2, n2), im = x.createImageData(n2, n2), nz = fbm(n2, 9102, [[6, .5], [24, .3], [96, .2]]), x0 = X1, x1 = G.x0 + 1.2, z0 = zc - 1.35, z1 = zc + 1.35;
  for (let j = 0; j < n2; j++) for (let i = 0; i < n2; i++) {
    const wx = lerp(x0, x1, (i + .5) / n2), wz = lerp(z0, z1, (j + .5) / n2), k = clamp(dvdLawnK(wx, wz) * 1.25 + (nz[j * n2 + i] - .5) * .5, 0, 1), q = (j * n2 + i) * 4, v = .7 + nz[j * n2 + i] * .5;
    im.data[q] = 50 * v; im.data[q + 1] = 64 * v; im.data[q + 2] = 30 * v; im.data[q + 3] = 210 * k;
  }
  x.putImageData(im, 0, 0);
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: galTex(c, true, false), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }));
  soil.rotation.x = -Math.PI / 2; soil.position.set((x0 + x1) / 2, .0015, zc); soil.renderOrder = 1; parent.add(soil);
}
function pieceHope(G) {
  const p = galPiece('hope'), act = galAct(p), { zc, X0, X1, Z0, Z1 } = dvdBox(), { hw, oh, d, h, sd, top } = DVD;
  const room = new THREE.Group(); gallery.add(room);
  const paint = dvdMat({ color: 0xf1efe8, emissive: 0xf1efe8, roughness: .9, emissiveIntensity: .74 }), unitM = dvdMat({ color: 0xf4f2ec, emissive: 0xf4f2ec, roughness: .5, emissiveIntensity: .76 });
  const spines = dvdSpines(), spineM = dvdMat({ map: spines, roughness: .32, envMapIntensity: .5 }, true), coverM = dvdMat({ map: dvdCovers(), roughness: .3, envMapIntensity: .5 }, true);
  const caseM = dvdMat({ color: 0x111111, emissive: 0x111111, roughness: .35 }), carpet = dvdCarpet(); carpet.repeat.set(d / .5, DVD.w * 2 / .5);
  const carpetM = dvdMat({ map: carpet, roughness: 1, emissiveIntensity: .6 });
  // the room: white walls and ceiling, green carpet; the inside face of the gallery wall round the opening is white too
  const walls = [], plane = (w_, h_, sx, sy) => new THREE.PlaneGeometry(w_, h_, sx, sy);
  walls.push(plane(Z1 - Z0, h, 8, 8).rotateY(Math.PI / 2).translate(X0, h / 2, zc));
  walls.push(plane(d, h, 8, 8).translate((X0 + X1) / 2, h / 2, Z0), plane(d, h, 8, 8).rotateY(Math.PI).translate((X0 + X1) / 2, h / 2, Z1));
  walls.push(plane(zc - hw - Z0, h, 3, 8).rotateY(-Math.PI / 2).translate(X1 - .003, h / 2, (Z0 + zc - hw) / 2), plane(Z1 - zc - hw, h, 3, 8).rotateY(-Math.PI / 2).translate(X1 - .003, h / 2, (Z1 + zc + hw) / 2));
  walls.push(plane(hw * 2, h - oh, 4, 1).rotateY(-Math.PI / 2).translate(X1 - .003, (h + oh) / 2, zc));
  walls.push(plane(d, Z1 - Z0, 8, 8).rotateX(Math.PI / 2).translate((X0 + X1) / 2, h, zc));
  dvdMesh(walls.map(g => dvdBake(g)), paint, room);
  dvdMesh([dvdBake(plane(d, Z1 - Z0, 10, 10).rotateX(-Math.PI / 2).translate((X0 + X1) / 2, .006, zc))], carpetM, room);
  // the ceiling light: two flush panels
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 2.2, 2.0) });
  for (const k of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.95, .2), lamp); m.rotation.x = Math.PI / 2; m.position.set((X0 + X1) / 2, h - .004, zc + k * .22); room.add(m); }
  // the shelves: white units on the back wall (two) and down each side (two each), nine rows of cases on each
  const boards = [], rows = [], covers = [], cases = [], rngU = rng(8803), up = new V3(0, 1, 0), pitch = (top - .024 - .105 + .02) / 9, clear = pitch - .02; let title = 0;
  const unit = (o, n, W, faceOut) => {                 // o: the unit's left end on the wall as you face it; n: into the room
    const R = up.clone().cross(n), M4 = new THREE.Matrix4().makeBasis(R, up, n).setPosition(o), put = (g) => boards.push(dvdBake(g.applyMatrix4(M4)));
    put(bb(0, .018, 0, top, 0, sd)); put(bb(W - .018, W, 0, top, 0, sd)); put(bb(0, W, top - .024, top, 0, sd));
    put(bb(.018, W - .018, 0, .085, 0, sd - .015)); put(bb(.018, W - .018, .085, .105, 0, sd)); put(bb(.018, W - .018, 0, top, 0, .008));
    for (let i = 0; i < 9; i++) {
      const s = .105 + i * pitch; if (i) put(bb(.018, W - .018, s - .02, s, 0, sd));
      if (i === faceOut) {                             // the site's titles, face out, leaning back a little
        const k = Math.floor((W - .06) / .165), stepU = (W - .036) / k;
        for (let j = 0; j < k && title < HOPE_ITEMS.length; j++) {
          const it = title++, cu = .018 + stepU * (j + .5), CM = M4.clone().multiply(new THREE.Matrix4().makeTranslation(cu, s + .002, sd - .055)).multiply(new THREE.Matrix4().makeRotationX(-.12));
          const g = new THREE.PlaneGeometry(.135, .19).translate(0, .095, .0008), uv = g.attributes.uv, a = it % 8, b = Math.floor(it / 8);
          for (let q = 0; q < uv.count; q++) uv.setXY(q, (a + uv.getX(q)) / 8, 1 - (b + 1 - uv.getY(q)) / 6);
          covers.push(dvdBake(g.applyMatrix4(CM))); cases.push(dvdBake(bb(-.0675, .0675, 0, .19, -.014, 0).applyMatrix4(CM)));
        }
        continue;
      }
      const L = W - .036, du = L * DVD_PX / 2048, u0 = rngU() * (1 - du), strip = Math.floor(rngU() * 6), v0 = 1 - (strip + 1) / 6, v1 = 1 - strip / 6;
      const g = new THREE.PlaneGeometry(L, clear).translate(W / 2, s + clear / 2, sd - .018), uv = g.attributes.uv;
      for (let q = 0; q < uv.count; q++) uv.setXY(q, u0 + uv.getX(q) * du, v0 + uv.getY(q) * (v1 - v0));
      rows.push(dvdBake(g.applyMatrix4(M4)));
    }
  };
  
  unit(new V3(X0, 0, Z1), new V3(1, 0, 0), DVD.w, 5); unit(new V3(X0, 0, zc), new V3(1, 0, 0), DVD.w, 5);   // the back wall: facing it, its left end is at +z
  const side = (X1 - X0 - sd) / 2;
  for (let k = 0; k < 2; k++) { unit(new V3(X0 + sd + k * side, 0, Z0), new V3(0, 0, 1), side, -1); unit(new V3(X1 - k * side, 0, Z1), new V3(0, 0, -1), side, -1); }
  dvdMesh(boards, unitM, room, act); dvdMesh(rows, spineM, room, act); dvdMesh(covers, coverM, room, act); dvdMesh(cases, caseM, room);
  // the gallery side: a white casing round the opening, the reveal lined in white, the neon over it
  const trim = new THREE.MeshStandardMaterial({ color: 0xeeebe3, roughness: .6 }), tb = new Bucket(), cw = .07;
  tb.add(trim, bb(G.x0, G.x0 + .022, 0, oh + cw, zc - hw - cw, zc - hw)); tb.add(trim, bb(G.x0, G.x0 + .022, 0, oh + cw, zc + hw, zc + hw + cw)); tb.add(trim, bb(G.x0, G.x0 + .022, oh, oh + cw, zc - hw - cw, zc + hw + cw));
  tb.add(trim, bb(X1 - .002, G.x0 + .002, 0, oh, zc - hw, zc - hw + .012)); tb.add(trim, bb(X1 - .002, G.x0 + .002, 0, oh, zc + hw - .012, zc + hw)); tb.add(trim, bb(X1 - .002, G.x0 + .002, oh - .012, oh, zc - hw, zc + hw));
  tb.build(room, false);
  const NW = 1.5, NH = NW * 320 / 1024, neon = new THREE.Mesh(new THREE.PlaneGeometry(NW, NH), new THREE.MeshBasicMaterial({ map: dvdNeon(), color: new THREE.Color(1.7, 1.7, 1.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  neon.position.set(G.x0 + .03, oh + cw + .03 + NH / 2, zc); neon.rotation.y = Math.PI / 2; neon.renderOrder = 6; gallery.add(neon); neon.userData.act = act; hot.push(neon);
  GAL_LIVE.neon = neon;
  pool(gallery, 2.4, 1.2, new V3(G.x0 + .009, neon.position.y - .05, zc), Math.PI / 2, 0, .45, [.3, 1, .5]);                     // the neon's green on the wall
  pool(gallery, 1.8, 1.5, new V3(G.x0 + .6, .004, zc), Math.PI / 2, -Math.PI / 2, .34, [1, .95, .86]);                  // the room's light spilling out over the step
  pool(gallery, 1.4, .8, new V3(G.x0 + .35, .005, zc), Math.PI / 2, -Math.PI / 2, .08, [.3, 1, .5]);
  dvdLawn(gallery);
  labelRight(p, new V3(G.x0, 0, zc), hw + cw, new V3(1, 0, 0));
}

/* ---- 4 · Untitled (hands): the recursive drawing as a lightbox, each level of the recursion a layer deeper ---- */
function pieceHands(G, TL) {
  const p = galPiece('hands'), FW = 1.24, FH = FW * 524 / 1080, D = .26, z = GAL_AT.hands, y = 1.62;
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
  pool(gallery, FW * 1.5, FH * 1.9, new V3(G.x0 + .009, y + .05, z), Math.PI / 2, 0, .16);
  labelRight(p, new V3(G.x0, 0, z), FW / 2 + .05, new V3(1, 0, 0));
}

/* ---- 5 · Perpetual Unfinished Projects (Mia Zhou): the map, as a big canvas on the brick ---- */
function pieceMap(G, TL) {
  const p = galPiece('sfmap'), W = 2.3, Hh = W / (2048 / 1609), y = 1.56;
  const map = TL.load('images/gallery/sf-map.webp'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(8, MAX_ANISO);
  const front = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .1, roughness: .88, envMapIntensity: .3 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .9 });
  const cvs = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, .045), [edge, edge, edge, edge, front, edge]);   // the +z face carries the picture...
  cvs.rotation.y = Math.PI; cvs.position.set(0, y, G.z1 - .03); gallery.add(cvs);                                     // ...and the half turn points it into the room
  cvs.userData.act = galAct(p); hot.push(cvs);
  pool(gallery, W * 1.4, Hh * 1.45, new V3(0, y + .1, G.z1 - .009), Math.PI, 0, .3);
  labelRight(p, new V3(0, 0, G.z1), W / 2, new V3(0, 0, -1));
}

/* ---- 6 · ZERO*NDA (George Simeo): The Building in Public Show. Its studio, rebuilt from a still of the show, fills the
   last bay of the right wall: a white brick pier between frosted windows, two fluted columns with ceramic heads on top, the
   tiled counter (a yellow hand planter with a snake plant, a little CRT on colour bars, a pink print), two blue vinyl
   armchairs turned to each other, the dripping blue globe on its plinth, the walnut cube with a dog's head and a glass of
   water, all on a red-brown plank floor; "guests sit here" in coral on the brick, its arrow to the guest's chair.
   The deck's title slide hangs beside it on the back wall, ON AIR over the set. ---- */
const ZN = { navy: '#061425', coral: '#FD4E4E', cream: '#E5DCCA', plum: '#42212A' };
const FONT_ZN = '"Shippori Mincho B1","Cormorant Garamond",Georgia,serif';
function znSlide() {
  const [c, x] = cv(1280, 720), r = rng(77);
  x.fillStyle = ZN.navy; x.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(255,255,255,${r() * .025})`; x.fillRect(r() * 1280, r() * 720, 1, 1); }   // a little print grain
  x.textBaseline = 'alphabetic';
  x.fillStyle = ZN.coral; x.font = `800 22px ${FONT_ZN}`; if ('letterSpacing' in x) x.letterSpacing = '3px'; x.fillText('ZERO*NDA', 66, 58); if ('letterSpacing' in x) x.letterSpacing = '0px';
  x.fillStyle = ZN.cream; x.font = `800 50px ${FONT_ZN}`; x.fillText('A CULTURAL MEDIA OUTLET', 78, 160); x.fillText('FOR WORKS-IN-PROGRESS', 78, 222);
  x.font = `500 25px ${FONT_ZN}`; x.fillText('We turn what you’re working on into stories that build audiences.', 80, 292);
  x.font = `800 25px ${FONT_ZN}`; x.fillText('Through content, live experiences and creative spaces.', 80, 334);
  // the camera on the right and its coral beam falling on the show's name
  x.fillStyle = 'rgba(253,78,78,.17)'; x.beginPath(); x.moveTo(1092, 420); x.lineTo(560, 520); x.lineTo(700, 690); x.closePath(); x.fill();
  x.save(); x.translate(1110, 400); x.rotate(-.09);
  x.fillStyle = ZN.cream; x.fillRect(-40, -62, 74, 14);                                   // viewfinder
  x.fillStyle = '#0c1a2e'; x.beginPath(); x.roundRect ? x.roundRect(-70, -48, 140, 82, 14) : x.rect(-70, -48, 140, 82); x.fill();
  x.strokeStyle = ZN.cream; x.lineWidth = 3; x.stroke();
  x.fillStyle = ZN.coral; x.beginPath(); x.ellipse(-78, -6, 14, 30, 0, 0, 6.283); x.fill();      // the lens, pointing left
  x.fillStyle = ZN.coral; x.beginPath(); x.arc(52, -32, 7, 0, 6.283); x.fill();                    // tally
  x.restore();
  // the coral pill with the show's name stacked in plum echoes, navy on top
  x.fillStyle = ZN.coral; x.beginPath(); x.ellipse(78 + 400, 430 + 133, 400, 133, 0, 0, 6.283); x.fill();
  x.font = `800 60px ${FONT_ZN}`; x.textAlign = 'center';
  const lines = ['THE BUILDING', 'IN PUBLIC SHOW'], cx = 478, cy = 548;
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; x.fillStyle = ZN.plum; lines.forEach((l, i) => x.fillText(l, cx + Math.cos(a) * 5, cy + i * 66 + Math.sin(a) * 5)); }
  x.fillStyle = ZN.navy; lines.forEach((l, i) => x.fillText(l, cx, cy + i * 66));
  x.textAlign = 'left';
  return ctex(c);
}
function znOnAir() {
  const [c, x] = cv(512, 192); x.fillStyle = '#1c0505'; x.fillRect(0, 0, 512, 192);
  x.fillStyle = '#ff3b2f'; x.font = `800 112px ${FONT_ENG}`; x.textAlign = 'center'; x.textBaseline = 'middle'; if ('letterSpacing' in x) x.letterSpacing = '14px'; x.fillText('ON AIR', 262, 100);
  return ctex(c);
}
/* ---- the studio's surfaces, painted on canvases ---- */
function znBrick() {                                  // painted white brick, 1 m square: 5 bricks a course, 16 courses, mortar sunk
  const N = 512, bw = N / 5, ch = N / 16, m = 4, r = rng(7101), nz = fbm(128, 7102, [[8, .5], [16, .3], [32, .2]]);
  const sh = Array.from({ length: 211 }, () => .93 + r() * .07);
  const [c, x] = cv(N, N), im = x.createImageData(N, N), H_ = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
    const row = Math.floor(y / ch), xx = (i + ((row & 1) ? bw / 2 : 0)) % N, col = Math.floor(xx / bw), lx = xx - col * bw, ly = y - row * ch;
    const n = nz[(y >> 2) * 128 + (i >> 2)], mortar = lx < m || ly < m, edge = Math.min(lx - m, bw - lx, ly - m, ch - ly);
    const v = mortar ? .66 + n * .08 : .87 * sh[(row * 7 + col) % 211] * (.96 + n * .06) - (edge < 3 ? .04 : 0);
    const k = (y * N + i) * 4; im.data[k] = _g22(v); im.data[k + 1] = _g22(v * .99); im.data[k + 2] = _g22(v * .975); im.data[k + 3] = 255;
    H_[y * N + i] = mortar ? .35 : .72 + n * .05 - (edge < 4 ? (4 - edge) * .05 : 0);
  }
  x.putImageData(im, 0, 0);
  return { map: galTex(c), normal: galTex(normalCanvas(H_, N, 5), false) };
}
function znTiles() {                                  // white glazed tiles, 10 cm, red grout: 4 x 4 on 512 px (0.4 m)
  const N = 512, t = N / 4, g = 6, [c, x] = cv(N, N), r = rng(7301), H_ = new Float32Array(N * N);
  x.fillStyle = '#d24c58'; x.fillRect(0, 0, N, N);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = 236 + Math.round((r() - .5) * 12); x.fillStyle = `rgb(${v},${v - 1},${v - 3})`; x.fillRect(i * t + g / 2, j * t + g / 2, t - g, t - g); }
  for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) { const a = i % t, b = y % t; H_[y * N + i] = (a < g / 2 || a >= t - g / 2 || b < g / 2 || b >= t - g / 2) ? .2 : .8; }
  return { map: galTex(c), normal: galTex(normalCanvas(H_, N, 3), false) };
}
function znPlanks() {                                 // red-brown hardwood strips, 16 across 1.2 m, running along v, butt joints, varnished
  const N = 1024, pw = N / 16, n2 = 512, [c, x] = cv(N, N), im = x.createImageData(N, N), H_ = new Float32Array(n2 * n2), r = rng(7401);
  const gr = fbm(256, 7402, [[8, .35], [32, .35], [128, .3]]);
  const planks = Array.from({ length: 16 }, () => {   // two joints a strip, at random, wrapping so the texture tiles
    const a = Math.floor(r() * N), b = (a + Math.floor(N * (.35 + r() * .3))) % N, cuts = [a, b].sort((p, q) => p - q);
    const tone = () => { const l = .2 + r() * .1; return [l, l * (.32 + r() * .08), l * (.17 + r() * .06), Math.floor(r() * 256)]; };
    return { cuts, seg: [tone(), tone()] };
  });
  for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
    const p = Math.floor(i / pw), lx = i - p * pw, P_ = planks[p], s = (y >= P_.cuts[0] && y < P_.cuts[1]) ? 0 : 1, [R, Gc, B, off] = P_.seg[s];
    const g = gr[((y >> 2) & 255) * 256 + ((i * 4 + off) & 255)], joint = Math.min(Math.abs(y - P_.cuts[0]), Math.abs(y - P_.cuts[1])) < 2;
    const gap = lx < 2 || joint, f = gap ? .25 : .72 + g * .56;
    const k = (y * N + i) * 4; im.data[k] = _g22(R * f); im.data[k + 1] = _g22(Gc * f); im.data[k + 2] = _g22(B * f); im.data[k + 3] = 255;
    if (!(i & 1) && !(y & 1)) H_[(y >> 1) * n2 + (i >> 1)] = gap ? .2 : .6 + g * .04;
  }
  x.putImageData(im, 0, 0);
  return { map: galTex(c), normal: galTex(normalCanvas(H_, n2, 4), false) };
}
function znWalnut() {                                 // dark walnut, grain along v
  const N = 256, [c, x] = cv(N, N), im = x.createImageData(N, N), gr = fbm(256, 7501, [[4, .4], [16, .35], [64, .25]]);
  for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
    const g = gr[((y >> 2) & 255) * 256 + ((i * 3) & 255)], f = .7 + g * .6 - (Math.sin(g * 40) > .85 ? .15 : 0);
    const k = (y * N + i) * 4; im.data[k] = _g22(.12 * f); im.data[k + 1] = _g22(.05 * f); im.data[k + 2] = _g22(.025 * f); im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); return galTex(c);
}
function znConcrete() {                               // the columns: cast concrete, beige-grey, pitted, streaked down the flutes
  const W = 256, Hh = 512, [c, x] = cv(W, Hh), im = x.createImageData(W, Hh), a = fbm(256, 7201, [[6, .4], [16, .3], [48, .3]]), r = rng(7202);
  for (let y = 0; y < Hh; y++) for (let i = 0; i < W; i++) {
    const n = a[((y >> 1) & 255) * 256 + i], streak = a[((y >> 3) & 255) * 256 + ((i * 3) & 255)];
    const v = .4 + n * .17 - streak * .07 + (r() - .5) * .05 - (r() < .01 ? .12 : 0);
    const k = (y * W + i) * 4; im.data[k] = _g22(v * 1.03); im.data[k + 1] = _g22(v * .95); im.data[k + 2] = _g22(v * .86); im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); return galTex(c);
}
function znFrost() {                                  // frosted glass with daylight behind it, brightest at the top
  const [c, x] = cv(64, 256), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#eef3fb'); g.addColorStop(1, '#d6e0f0'); x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  return galTex(c, true, false);
}
function znLeaf() {                                   // snake plant: dark green with pale zigzag bands, yellow margins; v runs base to tip
  const W = 64, Hh = 256, [c, x] = cv(W, Hh), im = x.createImageData(W, Hh);
  for (let y = 0; y < Hh; y++) for (let i = 0; i < W; i++) {
    const u = i / (W - 1), t = 1 - y / Hh, band = .5 + .5 * Math.sin(t * 70 + Math.sin(u * 11) * 2.2), edge = u < .09 || u > .91;
    let R = .02 + band * .05, G_ = .07 + band * .09, B = .02 + band * .03; if (edge) { R = .5; G_ = .45; B = .05; }
    const k = (y * W + i) * 4; im.data[k] = _g22(R); im.data[k + 1] = _g22(G_); im.data[k + 2] = _g22(B); im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); return galTex(c, true, false);
}
function znHead(kind) {                               // the ceramic heads on the columns, painted round a sphere; the face is at u = .25 (+z)
  const W = 512, Hh = 256, [c, x] = cv(W, Hh), cx = W / 4, r = rng(7700 + kind);
  x.fillStyle = kind ? '#dcd3d6' : '#ecc7a6'; x.fillRect(0, 0, W, Hh);
  for (let k = 0; k < 420; k++) { x.fillStyle = `rgba(${kind ? '150,128,140' : '196,140,108'},${r() * .07})`; x.beginPath(); x.arc(r() * W, r() * Hh, 2 + r() * 11, 0, 6.283); x.fill(); }
  for (const s of [-1, 1]) { const ccx = cx + s * 36, g = x.createRadialGradient(ccx, 138, 2, ccx, 138, 20); g.addColorStop(0, 'rgba(236,104,104,.9)'); g.addColorStop(1, 'rgba(236,104,104,0)'); x.fillStyle = g; x.fillRect(ccx - 22, 116, 44, 44); }
  x.lineCap = 'round';
  for (const s of [-1, 1]) {
    const ex = cx + s * 27, ey = 108;
    x.fillStyle = '#f6f1ea'; x.strokeStyle = '#4a3933'; x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(ex - 13, ey); x.quadraticCurveTo(ex, ey - 9, ex + 13, ey); x.quadraticCurveTo(ex, ey + 8, ex - 13, ey); x.fill(); x.stroke();
    x.fillStyle = kind ? '#62646f' : '#2f2521'; x.beginPath(); x.arc(ex + (kind ? 0 : 6), ey, 4.4, 0, 6.283); x.fill();
    x.strokeStyle = kind ? '#6b5560' : '#7a5642'; x.lineWidth = 1.8; x.beginPath(); x.moveTo(ex - 13, ey - 14); x.quadraticCurveTo(ex, ey - 20, ex + 13, ey - 13); x.stroke();
  }
  x.strokeStyle = kind ? '#8b6f78' : '#a07058'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 1, 114); x.lineTo(cx - 5, 138); x.quadraticCurveTo(cx + 1, 144, cx + 7, 139); x.stroke();
  if (kind) {                                         // the right head's red mouth
    x.fillStyle = '#e15c3c'; x.beginPath(); x.moveTo(cx - 16, 165); x.quadraticCurveTo(cx - 6, 155, cx, 159); x.quadraticCurveTo(cx + 6, 155, cx + 16, 165); x.quadraticCurveTo(cx, 176, cx - 16, 165); x.fill();
    x.strokeStyle = '#a83c26'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx - 15, 165); x.quadraticCurveTo(cx, 168, cx + 15, 165); x.stroke();
  }
  return ctex(c);
}
function znGlobe() {                                  // the blue globe, marbled, a yellow-green continent, two white spots
  const W = 256, Hh = 128, [c, x] = cv(W, Hh), im = x.createImageData(W, Hh), a = fbm(256, 7801, [[4, .5], [8, .3], [24, .2]]), b = fbm(256, 7802, [[3, .6], [9, .4]]);
  for (let y = 0; y < Hh; y++) for (let i = 0; i < W; i++) {
    const n = a[((y * 2) & 255) * 256 + i], m = b[((y * 2) & 255) * 256 + i];
    let R = .09 + n * .14, G_ = .14 + n * .16, B = .55 + n * .3; if (m > .6 && y < 62) { R = .55; G_ = .6; B = .2; }
    const k = (y * W + i) * 4; im.data[k] = _g22(R); im.data[k + 1] = _g22(G_); im.data[k + 2] = _g22(B); im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  x.fillStyle = '#f2f2ee'; for (const [px, py, pr] of [[58, 50, 4], [70, 47, 3]]) { x.beginPath(); x.arc(px, py, pr, 0, 6.283); x.fill(); }
  return ctex(c);
}
function znDrip() {                                   // the plinth's front: white, the globe's blue running down it
  const [c, x] = cv(256, 300); x.fillStyle = '#efeee9'; x.fillRect(0, 0, 256, 300);
  x.fillStyle = '#3d57c6';
  x.beginPath(); x.moveTo(112, 0); x.bezierCurveTo(126, 34, 156, 44, 160, 92); x.lineTo(163, 228); x.quadraticCurveTo(168, 240, 173, 228);
  x.lineTo(177, 96); x.bezierCurveTo(182, 52, 214, 30, 236, 0); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(166, 200); x.lineTo(170, 284); x.quadraticCurveTo(172, 290, 174, 284); x.lineTo(172, 200); x.fill();
  x.beginPath(); x.moveTo(190, 30); x.quadraticCurveTo(196, 80, 194, 150); x.quadraticCurveTo(197, 157, 199, 150); x.quadraticCurveTo(201, 80, 206, 26); x.fill();
  return ctex(c);
}
function znPrint() {                                  // the pink print on the counter: two pale towers, blue planets, a white saucer
  const W = 256, Hh = 340, [c, x] = cv(W, Hh);
  x.fillStyle = '#f6f3ee'; x.fillRect(0, 0, W, Hh); x.fillStyle = '#ee7660'; x.fillRect(16, 16, W - 32, Hh - 32);
  for (const tx of [56, 196]) { x.fillStyle = '#ece4d6'; x.fillRect(tx - 9, 78, 18, 160); x.fillStyle = '#7d9be0'; x.beginPath(); x.ellipse(tx, 74, 12, 20, 0, 0, 6.283); x.fill(); }
  for (const [px, py, pr, col] of [[86, 112, 13, '#2b3d97'], [124, 86, 8, '#4c64c6'], [158, 128, 11, '#283a88'], [94, 196, 16, '#5c86cf'], [176, 266, 20, '#24378e'], [74, 268, 18, '#79a4d6'], [206, 172, 8, '#3b57b6'], [162, 64, 6, '#8eafe0'], [132, 248, 7, '#5f7fd0']]) {
    x.fillStyle = col; x.beginPath(); x.arc(px, py, pr, 0, 6.283); x.fill(); x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.arc(px - pr * .3, py - pr * .3, pr * .38, 0, 6.283); x.fill();
  }
  x.fillStyle = '#f3ece2'; x.beginPath(); x.ellipse(136, 170, 42, 14, -.06, 0, 6.283); x.fill(); x.fillStyle = '#f2a070'; x.beginPath(); x.ellipse(136, 162, 18, 12, 0, Math.PI, 0); x.fill();
  x.fillStyle = '#d4503c'; for (const [px, py] of [[120, 172], [136, 174], [152, 172]]) { x.beginPath(); x.arc(px, py, 2.5, 0, 6.283); x.fill(); }
  return ctex(c);
}
function znBars() {                                   // the little CRT on colour bars
  const W = 256, Hh = 192, [c, x] = cv(W, Hh);
  ['#d7dadd', '#3d57d8', '#ec4352', '#ec5ccd', '#86e08c', '#4fd6e3', '#f2df70', '#ebebeb'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i * W / 8, 0, W / 8 + 1, Hh); });
  x.fillStyle = 'rgba(24,30,70,.6)'; x.fillRect(150, 22, 66, 18); x.fillStyle = '#eef2fb'; x.font = '600 13px "IBM Plex Mono",monospace'; x.fillText('VIDEO', 160, 36);
  const g = x.createRadialGradient(W / 2, Hh / 2, 40, W / 2, Hh / 2, 150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = g; x.fillRect(0, 0, W, Hh);
  return ctex(c);
}
const ZN_WORDS = { x0: -.46, x1: 1.0, y0: .98, y1: 1.98 };
function znWords() {                                  // "guests sit here" in coral marker on the brick, the arrow curving down to the guest's chair
  const S = 700, B = ZN_WORDS, [c, x] = cv(Math.round((B.x1 - B.x0) * S), Math.round((B.y1 - B.y0) * S));
  const X = (u) => (u - B.x0) * S, Y = (v) => (B.y1 - v) * S;
  x.fillStyle = x.strokeStyle = '#f2563f'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = `600 150px ${FONT_HAND}`; const k = Math.min(1, .74 * S / x.measureText('guests sit').width); x.font = `600 ${Math.round(150 * k)}px ${FONT_HAND}`;
  x.save(); x.translate(X(0), Y(1.72)); x.rotate(-.05); x.fillText('guests sit', 0, 0); x.restore();
  x.save(); x.translate(X(.06), Y(1.47)); x.rotate(-.03); x.fillText('here', 0, 0); x.restore();
  x.lineWidth = 9; x.lineCap = x.lineJoin = 'round';
  const P0 = [X(.25), Y(1.43)], P1 = [X(.5), Y(1.45)], P2 = [X(.69), Y(1.33)], P3 = [X(.71), Y(1.03)];
  x.beginPath(); x.moveTo(...P0); x.bezierCurveTo(...P1, ...P2, ...P3); x.stroke();
  const tx = P3[0] - P2[0], ty = P3[1] - P2[1], L = Math.hypot(tx, ty), ux = tx / L, uy = ty / L;
  for (const s of [-1, 1]) { const a = s * .55, dx = -(ux * Math.cos(a) - uy * Math.sin(a)) * 40, dy = -(ux * Math.sin(a) + uy * Math.cos(a)) * 40; x.beginPath(); x.moveTo(...P3); x.lineTo(P3[0] + dx, P3[1] + dy); x.stroke(); }
  return ctex(c);
}
// a fluted shaft: 18 shallow flutes, a little hand-made unevenness up its height
function znShaft(R, h, seed) {
  const NA = 18 * 6, NY = 10, pos = [], uv = [], idx = [], r = rng(seed), wob = Array.from({ length: NY + 1 }, () => 1 + (r() - .5) * .025);
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NA; i++) {
    const a = i / NA * Math.PI * 2, f = (i % 6) / 6, rr = R * wob[j] * (1 - .085 * Math.sin(Math.PI * f));
    pos.push(Math.sin(a) * rr, j / NY * h, Math.cos(a) * rr); uv.push(i / NA, j / NY);
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + NA + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// one leaf blade from B along D, arching toward S, its face turned toward F: wide low down, a point at the tip, twisting as it goes
function znBlade(B, D, S, L, w, twist, F = S) {
  const n = 9, pos = [], uv = [], idx = []; D = D.clone().normalize(); S = S.clone().normalize(); const across0 = new V3().crossVectors(D, F).normalize();
  for (let k = 0; k <= n; k++) {
    const t = k / n, ctr = B.clone().addScaledVector(D, L * t).addScaledVector(S, L * .2 * t * t), hw = w / 2 * (t < .3 ? .55 + 1.5 * t : (1 - t) / .7);
    const ac = across0.clone().applyAxisAngle(D, twist * t);
    pos.push(...ctr.clone().addScaledVector(ac, -hw).toArray(), ...ctr.clone().addScaledVector(ac, hw).toArray()); uv.push(0, t, 1, t);
  }
  for (let k = 0; k < n; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function pieceZeronda(G) {
  const p = galPiece('zeronda'), act = galAct(p), z1 = G.z1, clickable = (o) => { o.userData.act = act; hot.push(o); return o; };
  // the set: x across it (the photo's left to right), y up, z out into the room; its floor is a plank platform PT high
  const PT = .045, CT = PT + .82, XW = 1.16;
  const ZC = GAL_AT.studio, st = new THREE.Group(); st.position.set(G.x1 - .075, 0, ZC); st.rotation.y = -Math.PI / 2; gallery.add(st);
  const b = new Bucket(), vc = [];
  const paint = (g, hex) => { prep(g); const col = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); vc.push(g); return g; };
  const BR = znBrick(), TI = znTiles(), PK = znPlanks();
  const brickM = new THREE.MeshStandardMaterial({ map: BR.map, normalMap: BR.normal, roughness: .88, envMapIntensity: .25 });
  const frameM = new THREE.MeshStandardMaterial({ color: 0xc8cbcc, roughness: .55, metalness: .2 });
  const glassM = new THREE.MeshBasicMaterial({ map: znFrost(), color: new THREE.Color(1.3, 1.36, 1.46) });
  const concM = new THREE.MeshStandardMaterial({ map: znConcrete(), roughness: .95, envMapIntensity: .2 });
  const tileM = new THREE.MeshStandardMaterial({ map: TI.map, normalMap: TI.normal, roughness: .22, envMapIntensity: .9 });
  const plankM = new THREE.MeshStandardMaterial({ map: PK.map, normalMap: PK.normal, roughness: .36, envMapIntensity: .6 });
  const vinyl = new THREE.MeshStandardMaterial({ color: 0x1c45c6, roughness: .3, envMapIntensity: .9 });
  const whiteM = new THREE.MeshStandardMaterial({ color: 0xf0efeb, roughness: .8 });
  const walnut = new THREE.MeshStandardMaterial({ map: znWalnut(), roughness: .42, envMapIntensity: .5 }), darkWood = new THREE.MeshStandardMaterial({ color: 0x1a110c, roughness: .6 });
  const caseM = new THREE.MeshStandardMaterial({ color: 0xb9bbbb, roughness: .4, metalness: .3, envMapIntensity: .8 });
  const glaze = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .34, envMapIntensity: .7 });   // the small ceramics and plastics, coloured per vertex
  // plank floor, the white brick pier, frosted windows either side in pale steel frames
  b.add(plankM, wuv(bb(-XW, XW, 0, PT, -.07, 1.85), 1.2, 1.2));
  b.add(brickM, wuv(bb(-.5, .5, PT, 2.36, -.07, 0), 1, 1));
  for (const s of [-1, 1]) {
    const lo = (a, c_) => Math.min(s * a, s * c_), hi = (a, c_) => Math.max(s * a, s * c_);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(XW - .5, 2.3 - PT).translate(s * (XW + .5) / 2, (PT + 2.3) / 2, -.05), glassM); st.add(clickable(glass));
    b.add(frameM, bb(lo(.501, .555), hi(.501, .555), PT, 2.3, -.06, -.01));                 // jamb at the pier
    b.add(frameM, bb(lo(XW - .055, XW), hi(XW - .055, XW), PT, 2.3, -.07, -.01));          // outer jamb
    for (const y of [.9, 2.0]) b.add(frameM, bb(lo(.555, XW - .055), hi(.555, XW - .055), y, y + .05, -.058, -.012));   // transoms
    b.add(frameM, bb(lo(.501, XW), hi(.501, XW), PT, PT + .05, -.07, .012));              // sill
    b.add(frameM, bb(lo(.501, XW), hi(.501, XW), 2.3, 2.36, -.07, 0));                    // head
  }
  // two fluted columns in front of the windows, a ceramic head on each
  const HY = PT + 2.0;
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(znShaft(.135, 2.0, 7960 + s).translate(s * .86, PT, .26), concM); col.castShadow = true; st.add(clickable(col));
    b.add(concM, new THREE.CylinderGeometry(.143, .15, .05, 36).translate(s * .86, PT + .025, .26));
    b.add(concM, new THREE.CylinderGeometry(.14, .138, .03, 36).translate(s * .86, HY + .015, .26));
  }
  const heads = [[-1, 0, .035, [1, 1.06, .97], .22], [1, 1, .1, [.96, 1.12, .94], -.15]].map(([s, kind, up, sc, turn]) => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(.125, 48, 32), new THREE.MeshStandardMaterial({ map: znHead(kind), roughness: .38, envMapIntensity: .6 }));
    h.scale.set(...sc); h.position.set(s * .86, HY + up, .26); h.rotation.y = turn; st.add(clickable(h)); return h;
  });
  paint(new THREE.SphereGeometry(.03, 16, 10).scale(1, .75, 1).translate(-.86, heads[0].position.y + .125 * 1.06 + .006, .26), '#3f6ed6');     // the little blue cap
  { const r = rng(7970), hp = heads[1].position, top = hp.y + .125 * 1.12;                                                       // the crown of roses
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * 6.283 + r() * .3, rr = k < 7 ? .07 : .025, y = k < 7 ? top - .028 : top + .004, R_ = .024 + r() * .01, c_ = ['#cf3557', '#e2617f', '#b72a42', '#e8879b'][k % 4];
      const fx = hp.x + Math.cos(a) * rr, fz = hp.z + Math.sin(a) * rr;
      paint(new THREE.SphereGeometry(R_, 14, 10).scale(1, .8, 1).translate(fx, y, fz), c_);
      paint(new THREE.SphereGeometry(R_ * .45, 10, 8).translate(fx, y + R_ * .55, fz), '#8e1f33');
      if (k % 3 === 0) paint(new THREE.SphereGeometry(.02, 8, 6).scale(1.4, .35, .7).rotateY(a).translate(hp.x + Math.cos(a + .3) * .085, top - .045, hp.z + Math.sin(a + .3) * .085), '#4d7a3a');
    }
  }
  // the counter in white tile and red grout, against the pier
  b.add(tileM, wuv(bb(-.6, .6, PT, CT, 0, .48), .4, .4, PT));
  // on it: the yellow hand planter with its snake plant
  { const hx = -.4, hz = .27, Y = '#f2cc1b', K = 1.25, hand = (g) => paint(g.scale(K, K, K).translate(hx, CT, hz), Y);
    hand(new THREE.CylinderGeometry(.046, .05, .05, 20).translate(0, .025, 0));
    hand(new RoundedBoxGeometry(.11, .12, .05, 3, .022).rotateX(-.12).translate(0, .11, .006));
    [[-.038, .06], [-.013, .072], [.012, .069], [.036, .056]].forEach(([fx, L], i) => hand(new THREE.CapsuleGeometry(.0145, L, 4, 10).rotateZ((i - 1.5) * -.07).rotateX(-.12).translate(fx, .168 + L / 2, .002)));
    hand(new THREE.CapsuleGeometry(.016, .052, 4, 10).rotateZ(.8).translate(-.074, .11, .014));
    const leafM2 = new THREE.MeshStandardMaterial({ map: znLeaf(), side: THREE.DoubleSide, roughness: .5 }), r = rng(7980), lb = new Bucket();
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * 6.283 + r() * .5, S = new V3(Math.cos(a), 0, Math.sin(a)), t = .1 + r() * .12, D = new V3(Math.cos(a) * t - .08, 1, Math.sin(a) * t * .6);
      const F = new V3(Math.cos(a) * .45 + (r() - .5) * .4, 0, 1);                       // faces mostly out to the room, as in the photo
      lb.add(leafM2, znBlade(new V3(hx + Math.cos(a) * .02, CT + .09, hz - .04 + Math.sin(a) * .015), D, S, .38 + r() * .18, .062 + r() * .02, (r() - .5) * .9, F));
    }
    lb.build(st, false).forEach(clickable);
  }
  // the little CRT on colour bars
  { const tx = .01, tz = .235, fz = tz + .135;
    b.add(caseM, new RoundedBoxGeometry(.31, .245, .27, 3, .024).translate(tx, CT + .1225, tz));
    const bez = new THREE.Mesh(new THREE.PlaneGeometry(.236, .178).translate(tx, CT + .142, fz + .0012), new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: .4 })); st.add(clickable(bez));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(.212, .156).translate(tx, CT + .142, fz + .0024), new THREE.MeshBasicMaterial({ map: znBars(), color: new THREE.Color(1.25, 1.25, 1.25) })); st.add(clickable(scr));
    for (let i = 0; i < 3; i++) paint(new THREE.BoxGeometry(.014, .007, .006).translate(tx + .05 + i * .022, CT + .03, fz), '#77797a');
    paint(new THREE.CylinderGeometry(.009, .009, .008, 16).rotateX(Math.PI / 2).translate(tx - .02, CT + .03, fz + .002), '#d6d8d8');
  }
  // the pink print in a white frame, leaning on the brick
  { const g = new THREE.Group(); g.position.set(.37, CT, .078); g.rotation.x = -.09; st.add(g);
    g.add(clickable(new THREE.Mesh(new THREE.BoxGeometry(.3, .4, .018).translate(0, .2, 0), whiteM)));
    g.add(clickable(new THREE.Mesh(new THREE.PlaneGeometry(.272, .372).translate(0, .2, .0105), new THREE.MeshStandardMaterial({ map: znPrint(), roughness: .75 })))); }
  // the white plinth between the chairs, the blue globe melting down its front
  { const pz = .8, dripM = new THREE.MeshStandardMaterial({ map: znDrip(), roughness: .8 }), globeM = new THREE.MeshStandardMaterial({ map: znGlobe(), roughness: .32, envMapIntensity: .8 });
    const ped = new THREE.Mesh(new THREE.BoxGeometry(.34, .4, .34).translate(0, PT + .2, pz), [whiteM, whiteM, whiteM, whiteM, dripM, whiteM]); ped.castShadow = ped.receiveShadow = true; st.add(clickable(ped));
    b.add(globeM, new THREE.SphereGeometry(.125, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2 + .25).scale(1, .92, 1).translate(0, PT + .4 + .012, pz));
    const r = rng(7990), sh = new THREE.Shape();                                       // the puddle: ragged, and over the front edge where the drip starts
    for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2, front = Math.max(0, Math.cos(a + Math.PI / 2 - .25)), rr = .148 + Math.sin(a * 5 + 1.3) * .006 + r() * .004 + Math.pow(front, 6) * .05;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr; k ? sh.lineTo(px, py) : sh.moveTo(px, py); }
    b.add(globeM, new THREE.ExtrudeGeometry(sh, { depth: .008, bevelEnabled: true, bevelThickness: .003, bevelSize: .004, bevelSegments: 2, curveSegments: 4 }).rotateX(-Math.PI / 2).translate(0, PT + .4, pz));
    b.add(globeM, new THREE.SphereGeometry(.03, 16, 8).scale(1.4, .55, .45).translate(.02, PT + .397, pz + .172)); }
  // two blue vinyl armchairs on chrome, turned to each other
  const chair = (cx, cz, rot) => {
    const M_ = new THREE.Matrix4().compose(new V3(cx, PT, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new V3(1, 1, 1)), add = (mat, g) => b.add(mat, g.applyMatrix4(M_));
    add(vinyl, new RoundedBoxGeometry(.54, .1, .5, 3, .035).translate(0, .44, .02));
    add(vinyl, new RoundedBoxGeometry(.52, .3, .07, 3, .03).rotateX(-.12).translate(0, .73, -.235));
    for (const s of [-1, 1]) {
      const fx = s * .3;
      add(vinyl, new RoundedBoxGeometry(.055, .035, .4, 2, .014).translate(fx, .655, 0));
      add(M.chrome, rod(new V3(fx, 0, .21), new V3(fx, .64, .19), .011, 8));
      add(M.chrome, rod(new V3(fx, .64, .19), new V3(fx, .64, -.22), .011, 8));
      add(M.chrome, rod(new V3(fx * .95, 0, -.22), new V3(fx * .95, .9, -.27), .011, 8));
      add(M.chrome, rod(new V3(fx, .38, .19), new V3(fx * .97, .38, -.22), .009, 8));
    }
    add(M.chrome, rod(new V3(-.285, .1, -.22), new V3(.285, .1, -.22), .008, 8));
  };
  chair(-.74, .98, .62); chair(.74, .98, -.62);
  // the low walnut cube: a dog's head on stacked rings, a glass of water
  { const tq = new THREE.Matrix4().compose(new V3(.02, PT, 1.48), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .07, 0)), new V3(1, 1, 1));
    b.add(walnut, wuv(bb(-.28, .28, .045, .42, -.28, .28), .56, .56).applyMatrix4(tq)); b.add(darkWood, bb(-.24, .24, 0, .045, -.24, .24).applyMatrix4(tq));
    const T = tq.clone().multiply(new THREE.Matrix4().compose(new V3(-.1, .42, -.03), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -2.85, 0)), new V3(1, 1, 1)));
    const dp = (g, hex) => paint(g.applyMatrix4(T), hex), DOG = '#5c4b41';
    let y = 0; for (const [rr, h, col] of [[.072, .042, '#2d7343'], [.07, .013, '#e5512d'], [.069, .011, '#f2c02e'], [.068, .011, '#ee7b2a'], [.066, .024, '#86d470']]) { dp(new THREE.CylinderGeometry(rr, rr, h, 32).translate(0, y + h / 2, 0), col); y += h; }
    dp(new THREE.CylinderGeometry(.036, .04, .05, 20).translate(0, y + .025, 0), '#1c1a19'); y += .05;
    const H0 = y + .045;
    dp(new THREE.SphereGeometry(.05, 20, 14).scale(1.15, 1, 1).translate(-.005, H0, 0), DOG);
    dp(new THREE.CapsuleGeometry(.026, .045, 4, 12).rotateZ(Math.PI / 2).translate(.065, H0 - .005, 0), DOG);
    dp(new THREE.SphereGeometry(.012, 10, 8).translate(.112, H0 + .004, 0), '#151313');
    dp(new THREE.CapsuleGeometry(.018, .035, 4, 10).rotateZ(Math.PI / 2 - .4).translate(.055, H0 - .038, 0), DOG);
    dp(new THREE.CapsuleGeometry(.014, .04, 4, 10).scale(1, 1, .45).rotateZ(Math.PI / 2 - .9).translate(.086, H0 - .047, .012), '#e46f86');
    for (const s of [-1, 1]) {
      dp(new THREE.ConeGeometry(.004, .011, 6).rotateX(Math.PI).translate(.093, H0 - .027, s * .014), '#f3efe6');
      dp(new THREE.SphereGeometry(.03, 12, 10).scale(.55, 1.15, .28).rotateX(s * .3).translate(-.014, H0 - .006, s * .052), '#4a3b32');
      dp(new THREE.SphereGeometry(.0065, 8, 6).translate(.042, H0 + .022, s * .028), '#0d0c0c');
    }
    const gp = new V3(.17, .42, .1).applyMatrix4(tq), glassM2 = new THREE.MeshStandardMaterial({ color: 0xe6eef0, roughness: .06, transparent: true, opacity: .2, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide });
    st.add(clickable(new THREE.Mesh(new THREE.CylinderGeometry(.036, .03, .105, 10, 1, true).translate(gp.x, gp.y + .0525, gp.z), glassM2)));
    st.add(clickable(new THREE.Mesh(new THREE.CylinderGeometry(.031, .031, .008, 10).translate(gp.x, gp.y + .004, gp.z), glassM2)));
    st.add(clickable(new THREE.Mesh(new THREE.CylinderGeometry(.032, .0305, .05, 10).translate(gp.x, gp.y + .033, gp.z), new THREE.MeshStandardMaterial({ color: 0xcfe3ea, roughness: .03, transparent: true, opacity: .35, depthWrite: false, envMapIntensity: 1.5 })))); }
  // "guests sit here", the arrow to the guest's chair
  { const B = ZN_WORDS, map = znWords();
    const w = new THREE.Mesh(new THREE.PlaneGeometry(B.x1 - B.x0, B.y1 - B.y0).translate((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, .006), new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .35 }));
    w.renderOrder = 3; st.add(clickable(w)); }
  b.build(st).forEach(clickable);
  const vcm = new THREE.Mesh(mergeGeometries(vc), glaze); vcm.castShadow = vcm.receiveShadow = true; st.add(clickable(vcm));
  // light on the set: warm round the chairs, cool off the windows, a wash on the brick
  pool(st, 2.2, 1.7, new V3(0, PT + .004, 1.05), 0, -Math.PI / 2, .3);
  for (const s of [-1, 1]) pool(st, 1.1, 1.0, new V3(s * .84, PT + .005, .45), 0, -Math.PI / 2, .2, [.75, .85, 1]);
  pool(st, 1.6, 1.6, new V3(0, 1.45, .009), 0, 0, .2, [1, .9, .8]);
  const S_ = G.yb - .21; spot(G.yb - .19, new V3(1.6, S_, ZC - .65), new V3(2.3, .55, ZC - .8)); spot(G.yb - .19, new V3(1.6, S_, ZC + .2), new V3(2.3, .55, ZC + .75));
  // ON AIR over the set
  const onair = new THREE.Mesh(new THREE.PlaneGeometry(.44, .165), new THREE.MeshBasicMaterial({ map: znOnAir(), color: new THREE.Color(1.6, 1.6, 1.6) }));
  onair.rotation.y = -Math.PI / 2; onair.position.set(G.x1 - .062, 2.52, ZC); gallery.add(clickable(onair));
  gallery.add(new THREE.Mesh(bb(G.x1 - .06, G.x1 - .002, 2.52 - .1, 2.52 + .1, ZC - .25, ZC + .25), GAL_LIVE.blackM));
  // the deck's title slide as a lightbox on the right wall, just before the set; the card on the set's right
  const SW = 1.0, SH = SW * 9 / 16, sz = GAL_AT.slide, sy = 1.62;
  const slide = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshStandardMaterial({ map: znSlide(), roughness: .5, emissive: 0xffffff, emissiveIntensity: .55 }));
  slide.material.emissiveMap = slide.material.map; slide.rotation.y = -Math.PI / 2; slide.position.set(G.x1 - .052, sy, sz); gallery.add(clickable(slide));
  gallery.add(new THREE.Mesh(bb(G.x1 - .05, G.x1 - .002, sy - SH / 2 - .025, sy + SH / 2 + .025, sz - SW / 2 - .025, sz + SW / 2 + .025), GAL_LIVE.blackM));
  pool(gallery, SW * 1.45, SH * 1.6, new V3(G.x1 - .009, sy + .05, sz), -Math.PI / 2, 0, .26);
  GAL_OBST.push([1.3, G.x1, ZC - 1.2, ZC + 1.2]);
  labelRight(p, new V3(G.x1, 0, ZC), XW, new V3(-1, 0, 0));
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
  const z = GAL_AT.gorilla;
  const plinth = new THREE.Mesh(wuv(bb(-.62, .62, 0, .2, z - .62, z + .62), 1, 1), new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: .82 })); plinth.castShadow = plinth.receiveShadow = true; gallery.add(plinth);
  const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(.36, .006, .012), metalness: .45, roughness: .16, clearcoat: 1, clearcoatRoughness: .05, flatShading: true, envMapIntensity: 1.0 });
  const g = new THREE.Mesh(gorillaGeometry(), mat); g.rotation.y = Math.PI; g.position.set(0, .2, z); g.castShadow = true; gallery.add(g);
  GAL_OBST.push([-.75, .75, z - .75, z + .75]);
  pool(gallery, 2.6, 2.6, new V3(0, .006, z), 0, -Math.PI / 2, .45);
  const lab = { title: 'Kong', author: 'after Richard Orlinski', medium: 'faceted lacquered resin, red', blurb: '', url: '' };
  const note = { type: 'note', text: '<b>Kong</b> · after Richard Orlinski' };
  const m = addLabel(lab, new V3(-.36, .205, z - .5), Math.PI); m.rotation.set(Math.PI / 2 - .35, Math.PI, 0); m.userData.act = note;   // on the plinth, to your right as you face it
  g.userData.act = note; hot.push(g);                                                                                                // a click on the figure is a click on it, not on what is behind
}

/* ---- the armoured dove, painted on the middle vault ---- */
function pieceDove(TL) {
  const G = GAL, z0 = G.beams[1] + .09, z1 = G.beams[2] - .09, Hz = z1 - z0 - .06, W = Hz * 548 / 450, zc = (z0 + z1) / 2, segs = 24;
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

/* ---- the intro wall: As Is, the night's date, and what was presented ---- */
function introPanel() {
  const [c, x] = cv(1100, 1000); x.fillStyle = '#121212'; x.fillRect(0, 0, 1100, 1000);
  return new Promise(res => {
    const im = new Image(); im.onload = () => { const w = 300, h = w * im.height / im.width; x.drawImage(im, 70, 70, w, h); fin(); }; im.onerror = fin; im.src = 'images/as-is-logo.png';
    function fin() {
      x.fillStyle = '#f2efe6'; x.font = `600 92px "Cormorant Garamond",Georgia,serif`; x.fillText('As Is', 420, 190);
      x.font = `500 24px "IBM Plex Mono",monospace`; x.fillStyle = '#b8b2a4'; x.fillText('11.25.2026 · FLOOR 2', 424, 240);
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
  for (const g of holedWall('x', G.x0 - .2, G.x0, WALL_Z, G.z1, 0, G.yb, [[GAL_AT.hope - DVD.hw, GAL_AT.hope + DVD.hw, -1, DVD.oh]])) b.add(plaster, wuv(g, 2.5, 2.5));   // the DVD room's opening
  for (const g of holedWall('x', G.x1, G.x1 + .2, WALL_Z, G.z1, 0, G.yb, [])) b.add(plaster, wuv(g, 2.5, 2.5));
  for (const g of holedWall('z', G.z1, G.z1 + .2, G.x0 - .2, G.x1 + .2, 0, G.yb, [])) b.add(brick, wuv(g, 1, 1));
  // the lift wall: a plaster skin over the shaft's own slab, with the doorway, and solid wall beyond the shaft
  for (const g of holedWall('z', WALL_Z, WALL_Z + .02, G.x0, G.x1, 0, G.yb, [[-DOOR_W / 2, DOOR_W / 2, -1, DOOR_H]])) b.add(plaster, wuv(g, 2.5, 2.5));
  b.add(plaster, wuv(bb(G.x0 - .2, SHAFT.x0 - .2, 0, G.yb + G.rise + .1, 0, WALL_Z), 2.5, 2.5)); b.add(plaster, wuv(bb(1.85, G.x1 + .2, 0, G.yb + G.rise + .1, 0, WALL_Z), 2.5, 2.5));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, -DOOR_W / 2, 0, DOOR_H, WALL_Z + .02, WALL_Z + .06), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(DOOR_W / 2, DOOR_W / 2 + .12, 0, DOOR_H, WALL_Z + .02, WALL_Z + .06), .5, DOOR_H + .12));
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
  pieceRapailler(G, TL); pieceSTM(G); pieceHope(G); pieceHands(G, TL); pieceMap(G, TL); pieceZeronda(G); pieceGorilla(G); pieceDove(TL); floatingLogo(TL); buildCat();
  // spots on the rails, one or two per piece
  const S = railY - .02;
  const A = GAL_AT;
  spot(railY, new V3(1.6, S, A.rapailler - .55), new V3(G.x1, 1.7, A.rapailler - .25)); spot(railY, new V3(1.6, S, A.rapailler + .55), new V3(G.x1, 1.6, A.rapailler + .25));
  spot(railY, new V3(1.6, S, STM_Z - .25), new V3(G.x1 - .4, 1.3, STM_Z));
  spot(railY, new V3(-1.6, S, A.hope - 1.25), new V3(G.x0, 1.35, A.hope - 1.1)); spot(railY, new V3(-1.6, S, A.hope + .55), new V3(G.x0 + .45, 0, A.hope + .15));
  spot(railY, new V3(-1.6, S, A.hands), new V3(G.x0, 1.6, A.hands));
  spot(railY, new V3(-1.6, S, G.z1 - .8), new V3(-.4, 1.6, G.z1)); spot(railY, new V3(1.6, S, G.z1 - .8), new V3(.4, 1.6, G.z1));
  spot(railY, new V3(-1.6, S, A.gorilla - .65), new V3(0, 1.4, A.gorilla)); spot(railY, new V3(1.6, S, A.gorilla + .65), new V3(0, 1.6, A.gorilla));
  // the intro wall, left of the door
  introPanel().then(t => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.82), new THREE.MeshStandardMaterial({ map: t, roughness: .85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .1 })); m.position.set(-2.05, 1.5, WALL_Z + .025); gallery.add(m); });
  pool(gallery, 2.6, 2.3, new V3(-2.05, 1.6, WALL_Z + .024), 0, 0, .14);
  // one warm fill from the middle of the room (the landings have one lamp too, so the light count does not change)
  GAL_LIVE.light = new THREE.PointLight(new THREE.Color(1, .68, .4), 4.4, 13, 1.6); GAL_LIVE.light.position.set(0, 2.45, 6.2); gallery.add(GAL_LIVE.light);
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
function ensureGallery() { if (GAL_LIVE.built) return; GAL_LIVE.built = true; buildGallery(); finishSubtree(gallery); }
function galleryHere() { return D.state === 'play' && lift.floor === GALLERY_FLOOR && lift.phase !== 'riding' && (lift.doors > 0 || !P.inCab); }
function galleryTick(dt, time) {
  // only for a ride that stops here, or a stop already made: never as the cab goes past, and never in the intro (the camera waits
  // in the lobby while the cab comes down through this floor; its lamp lit the lobby through the ceiling for a moment)
  const near = D.state === 'play' && (lift.target === GALLERY_FLOOR || (lift.floor === GALLERY_FLOOR && lift.phase !== 'riding')) && Math.abs(lift.y - GALLERY_FLOOR * H) < 1.2 * H;
  gallery.visible = near;
  floatingLogoTick(dt, time);
  if (!near) return;
  catTick(dt, time);
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
