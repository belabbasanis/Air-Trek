
/* ======================================================================
   CANVAS TEXTURES: engraved button faces, stickers, signage
   ====================================================================== */
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ctex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, MAX_ANISO); return t; }
function normalFromHeight(src, strength) {
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, x] = cv(w, h); const out = x.createImageData(w, h), o = out.data;
  const H_ = (i, j) => d[((clamp(j, 0, h - 1)) * w + clamp(i, 0, w - 1)) * 4] / 255;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (H_(i - 1, j) - H_(i + 1, j)) * strength, dy = (H_(i, j + 1) - H_(i, j - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), k = (j * w + i) * 4;
    o[k] = (dx / l * .5 + .5) * 255; o[k + 1] = (dy / l * .5 + .5) * 255; o[k + 2] = (1 / l * .5 + .5) * 255; o[k + 3] = 255;
  }
  x.putImageData(out, 0, 0); return c;
}
const FONT_ENG = '"Saira Condensed","Arial Narrow",sans-serif';
const FONT_STENCIL = '"Saira Stencil One","Saira Condensed",Impact,sans-serif';
const FONT_SERIF = '"Shippori Mincho B1","Cormorant Garamond",Georgia,serif';
const FONT_MONO = '"IBM Plex Mono",ui-monospace,Menlo,monospace';
const FONT_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
async function loadFonts() {
  const want = [`600 64px "Saira Condensed"`, `400 64px "Saira Stencil One"`, `500 32px "Shippori Mincho B1"`, `800 32px "Shippori Mincho B1"`, `500 32px "IBM Plex Mono"`, `400 32px "IBM Plex Mono"`];
  try { await Promise.race([Promise.all(want.map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 3500))]); } catch (e) { }
}

/* ---- button atlas: engraved numerals on aged ivory, a red ALARM face, door symbols ---- */
const BTN_CELLS = ['L', ...FLOORS.map(p => String(p.floor)), 'ALARM', 'OPEN', 'CLOSE', 'CALL'];
const BTN_N = Math.ceil(Math.sqrt(BTN_CELLS.length));
const BTN_PX = 128;
function buttonAtlas() {
  const S = BTN_PX, size = BTN_N * S;
  const [ca, a] = cv(size, size), [ce, e] = cv(size, size), [ch, h] = cv(size, size);
  e.fillStyle = '#000'; e.fillRect(0, 0, size, size); h.fillStyle = '#000'; h.fillRect(0, 0, size, size);
  const r = rng(99);
  BTN_CELLS.forEach((lab, i) => {
    const x0 = (i % BTN_N) * S, y0 = Math.floor(i / BTN_N) * S, cx = x0 + S / 2, cy = y0 + S / 2, R = S / 2;
    const alarm = lab === 'ALARM';
    const g = a.createRadialGradient(cx - R * .25, cy - R * .3, R * .1, cx, cy, R);
    if (alarm) { g.addColorStop(0, '#d2402f'); g.addColorStop(.7, '#9a1f16'); g.addColorStop(1, '#5e110c'); }
    else { g.addColorStop(0, '#e2ddd0'); g.addColorStop(.75, '#c3bdaf'); g.addColorStop(1, '#8e887c'); }
    a.fillStyle = g; a.fillRect(x0, y0, S, S);
    // fine concentric turning marks and grime
    for (let k = 0; k < 40; k++) { a.strokeStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${.03 + r() * .04})`; a.lineWidth = 1; a.beginPath(); a.arc(cx, cy, r() * R, 0, 6.283); a.stroke(); }
    for (let k = 0; k < 18; k++) { a.fillStyle = `rgba(60,45,25,${r() * .12})`; a.beginPath(); a.arc(x0 + r() * S, y0 + r() * S, 2 + r() * 8, 0, 6.283); a.fill(); }
    // height: face plateau, falloff at the rim
    const hg = h.createRadialGradient(cx, cy, R * .7, cx, cy, R); hg.addColorStop(0, '#fff'); hg.addColorStop(1, '#888'); h.fillStyle = hg; h.fillRect(x0, y0, S, S);
    e.fillStyle = alarm ? '#ff6a50' : '#9a9a9a'; e.beginPath(); e.arc(cx, cy, R * .96, 0, 6.283); e.fill();
    let txt = lab, fs = S * .56, font = FONT_ENG, wgt = '600';
    if (alarm) { fs = S * .19; }
    if (lab === 'OPEN') txt = '◀ ▶'; if (lab === 'CLOSE') txt = '▶ ◀'; if (lab === 'CALL') txt = '▲';
    if (lab === 'OPEN' || lab === 'CLOSE') { fs = S * .26; font = 'sans-serif'; }
    if (lab === 'CALL') { fs = S * .42; font = 'sans-serif'; }
    if (txt.length >= 2 && !alarm && lab !== 'OPEN' && lab !== 'CLOSE') fs = S * .5;
    const setF = (c) => { c.font = `${wgt} ${fs}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; if ('letterSpacing' in c) c.letterSpacing = alarm ? '2px' : '0px'; };
    [a, e, h].forEach(setF);
    const ty = cy + fs * .04;
    if (alarm) { a.fillStyle = 'rgba(0,0,0,.35)'; a.fillText('ALARM', cx + 1, ty + 1.5); a.fillStyle = '#f7efe4'; a.fillText('ALARM', cx, ty); }
    else { a.fillStyle = 'rgba(255,250,240,.55)'; a.fillText(txt, cx + 1.6, ty + 1.8); a.fillStyle = '#25211c'; a.fillText(txt, cx, ty); }
    e.fillStyle = '#fff'; e.fillText(txt === 'ALARM' ? 'ALARM' : txt, cx, ty);
    h.save(); h.filter = 'blur(1.2px)'; h.fillStyle = '#222'; h.fillText(txt, cx, ty); h.restore();
  });
  const nrm = normalFromHeight(ch, 3.2);
  const map = ctex(ca), em = ctex(ce), nm = ctex(nrm, false);
  return { map, em, nm, cell(lab) { const i = BTN_CELLS.indexOf(lab); return { x: (i % BTN_N) / BTN_N, y: 1 - (Math.floor(i / BTN_N) + 1) / BTN_N, s: 1 / BTN_N }; } };
}

/* ---- stickers: die-cut vinyl with a white border, worn edges, a lifted corner ---- */
const STK_COLORS = ['#e8b04a', '#e0644f', '#5fa58a', '#4f7fd1', '#c9a6e8', '#f2d7a6', '#7bc4d8', '#e98bb3', '#9ccf6a', '#f0e6d0', '#2f3e46', '#ffcf5c'];
const stickerImgs = new Map();
async function preloadStickerImages() {
  await Promise.all(FLOORS.filter(p => /^data:image\//.test(p.sticker)).map(p => new Promise(res => { const im = new Image(); im.onload = () => { stickerImgs.set(p.floor, im); res(); }; im.onerror = res; im.src = p.sticker; })));
}
function drawSticker(c, cx, cy, size, p) {
  const r = rng(hashStr(p.name + '#' + p.floor)); const shape = Math.floor(r() * 4); const col = STK_COLORS[Math.floor(r() * STK_COLORS.length)];
  const rot = (r() - .5) * .5, R = size * .44;
  const path = (k) => {
    c.beginPath(); const rr = R * k;
    if (shape === 0) c.arc(0, 0, rr, 0, 6.283);
    else if (shape === 1) { const q = rr * .9, cr = rr * .28; c.roundRect ? c.roundRect(-q, -q, 2 * q, 2 * q, cr) : c.rect(-q, -q, 2 * q, 2 * q); }
    else if (shape === 2) { for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283, w = rr * (1 + .07 * Math.cos(a * 12)); i ? c.lineTo(Math.cos(a) * w, Math.sin(a) * w) : c.moveTo(Math.cos(a) * w, Math.sin(a) * w); } }
    else c.ellipse(0, 0, rr * 1.05, rr * .78, 0, 0, 6.283);
    c.closePath();
  };
  c.save(); c.translate(cx, cy); c.rotate(rot);
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = size * .03; c.shadowOffsetY = size * .012;
  path(1); c.fillStyle = '#f4f0e6'; c.fill(); c.shadowColor = 'transparent';
  path(.86); const g = c.createLinearGradient(0, -R, 0, R); g.addColorStop(0, col); g.addColorStop(1, shade(col, -.18)); c.fillStyle = g; c.fill();
  c.save(); path(.86); c.clip();
  const im = stickerImgs.get(p.floor);
  if (im) { const s = R * 1.5; c.drawImage(im, -s / 2, -s / 2, s, s); }
  else {
    const s = p.sticker; const emoji = /\p{Extended_Pictographic}/u.test(s);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (emoji) { c.font = `${R * 1.05}px ${FONT_EMOJI}`; c.fillText(s, 0, R * .06); }
    else { const t = s.slice(0, 3).toUpperCase(); c.font = `600 ${R * (t.length > 2 ? .62 : .86)}px ${FONT_ENG}`; c.fillStyle = lum(col) > .6 ? '#1d1a16' : '#fbf6ec'; c.fillText(t, 0, R * .05); }
  }
  // gloss, scuffs, grime
  const gl = c.createLinearGradient(-R, -R, R, R); gl.addColorStop(.3, 'rgba(255,255,255,0)'); gl.addColorStop(.45, 'rgba(255,255,255,.18)'); gl.addColorStop(.6, 'rgba(255,255,255,0)'); c.fillStyle = gl; c.fillRect(-R, -R, 2 * R, 2 * R);
  for (let i = 0; i < 14; i++) { c.strokeStyle = `rgba(255,255,255,${.1 + r() * .25})`; c.lineWidth = .5 + r() * 1.2; c.beginPath(); const x = (r() - .5) * 2 * R, y = (r() - .5) * 2 * R, a = r() * 6.28, l = R * (.1 + r() * .4); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(70,50,25,${r() * .14})`; c.beginPath(); c.arc((r() - .5) * 2 * R, (r() - .5) * 2 * R, 1 + r() * R * .2, 0, 6.283); c.fill(); }
  c.restore();
  path(1); c.strokeStyle = 'rgba(80,60,35,.35)'; c.lineWidth = size * .012; c.stroke();
  // lifted corner (backing-paper side showing)
  if (r() < .6) { const a = r() * 6.283, px = Math.cos(a) * R * .82, py = Math.sin(a) * R * .82, t = R * .22;
    c.beginPath(); c.moveTo(px + Math.cos(a + 1.9) * t, py + Math.sin(a + 1.9) * t); c.lineTo(px + Math.cos(a) * t * .9, py + Math.sin(a) * t * .9); c.lineTo(px + Math.cos(a - 1.9) * t, py + Math.sin(a - 1.9) * t); c.closePath();
    c.fillStyle = '#e9e2d0'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1; c.stroke(); }
  c.restore();
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; const f = (x) => clamp(Math.round(x * (1 + k)), 0, 255); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function lum(hex) { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255; }
function stickerAtlas() {
  const n = Math.max(1, FLOORS.length), cols = Math.ceil(Math.sqrt(n)), S = 256;
  const [c, x] = cv(cols * S, cols * S);
  FLOORS.forEach((p, i) => drawSticker(x, (i % cols) * S + S / 2, Math.floor(i / cols) * S + S / 2, S * .96, p));
  const t = ctex(c);
  return { tex: t, cell(i) { return { x: (i % cols) / cols, y: 1 - (Math.floor(i / cols) + 1) / cols, s: 1 / cols }; } };
}

/* ---- lobby directory: white push-in letters on black felt ---- */
function directoryTex() {
  const [c, x] = cv(1024, 1400); const r = rng(7);
  x.fillStyle = '#121211'; x.fillRect(0, 0, 1024, 1400);
  for (let y = 18; y < 1400; y += 26) { x.fillStyle = '#0a0a09'; x.fillRect(0, y, 1024, 4); x.fillStyle = '#1b1a18'; x.fillRect(0, y + 4, 1024, 2); }
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(255,255,255,${r() * .035})`; x.fillRect(r() * 1024, r() * 1400, 1 + r() * 2, 1); }
  const letters = (str, x0, y0, fs, sp) => {
    x.font = `500 ${fs}px ${FONT_MONO}`; x.textBaseline = 'alphabetic';
    let cx = x0;
    for (const ch of str) {
      if (ch !== ' ' && r() > .015) {
        x.save(); x.translate(cx + (r() - .5) * 2, y0 + (r() - .5) * 3); x.rotate((r() - .5) * .07);
        x.fillStyle = 'rgba(0,0,0,.55)'; x.fillText(ch, 1.5, 2.5); x.fillStyle = r() < .08 ? '#cfc8b8' : '#ece8de'; x.fillText(ch, 0, 0); x.restore();
      }
      cx += fs * sp;
    }
  };
  letters('DIRECTORY', 300, 120, 52, .78);
  letters('FL   OCCUPANT', 70, 210, 30, .64);
  const rows = FLOORS.slice().reverse(); const fs = rows.length > 22 ? 22 : 30, step = Math.min(52, 1080 / Math.max(1, rows.length));
  rows.forEach((p, i) => { const y = 280 + i * step; letters(String(p.floor).padStart(2, ' '), 70, y, fs, .64); letters(p.name.toUpperCase().slice(0, 26), 70 + fs * .64 * 5, y, fs, .64); });
  letters('L    LIFT LOBBY', 70, 280 + rows.length * step + 10, fs, .64);
  // a few letters that fell to the bottom of the case
  for (let i = 0; i < 9; i++) { x.save(); x.translate(80 + r() * 860, 1370 - r() * 18); x.rotate((r() - .5) * 2.4); x.font = `500 30px ${FONT_MONO}`; x.fillStyle = '#e2ddd2'; x.fillText('AEIRSTNO'[Math.floor(r() * 8)], 0, 0); x.restore(); }
  return ctex(c);
}

/* ---- hall dial: brass half-moon with the floors around the arc ---- */
function dialTex() {
  const [c, x] = cv(1024, 520); const r = rng(5);
  const g = x.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, '#b7914f'); g.addColorStop(1, '#6d5228'); x.fillStyle = g; x.fillRect(0, 0, 1024, 520);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < .5 ? '40,25,8' : '255,235,190'},${r() * .06})`; x.beginPath(); x.arc(r() * 1024, r() * 520, 2 + r() * 20, 0, 6.283); x.fill(); }
  x.fillStyle = '#1a1209'; x.beginPath(); x.arc(512, 512, 470, Math.PI, 0); x.fill();
  x.fillStyle = '#d9c9a2'; x.beginPath(); x.arc(512, 512, 455, Math.PI, 0); x.fill();
  const g2 = x.createRadialGradient(512, 512, 40, 512, 512, 455); g2.addColorStop(0, 'rgba(255,250,230,0)'); g2.addColorStop(1, 'rgba(90,60,20,.35)'); x.fillStyle = g2; x.beginPath(); x.arc(512, 512, 455, Math.PI, 0); x.fill();
  const n = TOP + 1;
  for (let f = 0; f <= TOP; f++) {
    const a = Math.PI + (f / TOP) * Math.PI * .86 + Math.PI * .07, ca = Math.cos(a), sa = Math.sin(a);
    x.strokeStyle = '#2a1d0e'; x.lineWidth = f % 5 === 0 || f === 0 ? 4 : 2; x.beginPath(); x.moveTo(512 + ca * 440, 512 + sa * 440); x.lineTo(512 + ca * (f % 5 === 0 ? 395 : 412), 512 + sa * (f % 5 === 0 ? 395 : 412)); x.stroke();
    if (n <= 24 || f % 2 === 0 || f === TOP) { x.save(); x.translate(512 + ca * 350, 512 + sa * 350); x.rotate(a + Math.PI / 2); x.font = `600 ${n > 16 ? 38 : 48}px ${FONT_ENG}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = BY_FLOOR.has(f) ? '#6b1a10' : '#2a1d0e'; x.fillText(f === 0 ? 'L' : String(f), 0, 0); x.restore(); }
  }
  x.font = `500 30px ${FONT_SERIF}`; x.textAlign = 'center'; x.fillStyle = '#3a2a14'; if ('letterSpacing' in x) x.letterSpacing = '8px'; x.fillText('OTIS-PATTERN · No 1', 512, 470);
  return ctex(c);
}
const dialAngle = (f) => -((f / TOP) * Math.PI * .86 + Math.PI * .07) + Math.PI / 2;

/* ---- cab floor indicator: a row of numbered lamps ---- */
const LAMP_N = TOP + 1, LAMP_ROWS = LAMP_N > 26 ? 2 : 1, LAMP_COLS = Math.ceil(LAMP_N / LAMP_ROWS), LAMP_PX = 96;
const [lampC, lampX] = cv(LAMP_COLS * LAMP_PX, LAMP_ROWS * LAMP_PX), [lampEC, lampEX] = cv(LAMP_COLS * LAMP_PX, LAMP_ROWS * LAMP_PX);
function drawLamps(lit) {
  for (const [x, emi] of [[lampX, false], [lampEX, true]]) {
    x.fillStyle = emi ? '#000' : '#18110a'; x.fillRect(0, 0, LAMP_COLS * LAMP_PX, LAMP_ROWS * LAMP_PX);
    for (let f = 0; f <= TOP; f++) {
      const cx = (f % LAMP_COLS) * LAMP_PX + LAMP_PX / 2, cy = Math.floor(f / LAMP_COLS) * LAMP_PX + LAMP_PX / 2, on = f === lit;
      if (!emi) { const g = x.createRadialGradient(cx - 8, cy - 10, 4, cx, cy, 36); g.addColorStop(0, '#6d4a22'); g.addColorStop(1, '#2c1a0a'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 34, 0, 6.283); x.fill(); x.strokeStyle = '#8a6a3a'; x.lineWidth = 3; x.stroke(); }
      else if (on) { const g = x.createRadialGradient(cx, cy, 2, cx, cy, 36); g.addColorStop(0, '#fff1d0'); g.addColorStop(.6, '#ff9a3a'); g.addColorStop(1, '#7a3008'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 34, 0, 6.283); x.fill(); }
      x.font = `600 ${f >= 10 ? 40 : 46}px ${FONT_ENG}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = emi ? (on ? '#ffffff' : '#000') : (on ? '#fff5df' : '#c9a878');
      x.fillText(f === 0 ? 'L' : String(f), cx, cy + 2);
    }
  }
}
drawLamps(0);

/* ---- small plates ---- */
function plateTex(w, h, draw) { const [c, x] = cv(w, h); draw(x, w, h); return ctex(c); }
function certificateTex() {
  return plateTex(512, 700, (x, w, h) => {
    const r = rng(3); x.fillStyle = '#d8cfb9'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(120,90,40,${r() * .06})`; x.beginPath(); x.arc(r() * w, r() * h, 3 + r() * 40, 0, 6.283); x.fill(); }
    x.strokeStyle = '#6b5a3e'; x.lineWidth = 3; x.strokeRect(22, 22, w - 44, h - 44); x.lineWidth = 1; x.strokeRect(30, 30, w - 60, h - 60);
    x.fillStyle = '#2b241a'; x.textAlign = 'center';
    x.font = `800 30px ${FONT_SERIF}`; x.fillText('CERTIFICATE', w / 2, 96); x.font = `500 22px ${FONT_SERIF}`; x.fillText('OF OPERATION', w / 2, 128);
    x.font = `400 19px ${FONT_MONO}`; x.textAlign = 'left';
    ['PASSENGER ELEVATOR  No. 1', 'CAPACITY    600 KG', 'PERSONS     8', 'RATED SPEED 2.5 M/S', `SERVES      L - ${TOP}`, 'INSPECTED   14.03.1986', 'NEXT DUE    14.03.1987'].forEach((s, i) => x.fillText(s, 60, 210 + i * 40));
    x.strokeStyle = '#1f2a55'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(250, 560); for (let i = 0; i < 12; i++) x.quadraticCurveTo(260 + i * 16, 530 + r() * 60, 270 + i * 16, 555 + (r() - .5) * 20); x.stroke();
    x.strokeStyle = 'rgba(150,30,25,.7)'; x.lineWidth = 4; x.beginPath(); x.arc(130, 580, 52, 0, 6.283); x.stroke(); x.beginPath(); x.arc(130, 580, 40, 0, 6.283); x.stroke();
    x.font = `600 16px ${FONT_MONO}`; x.fillStyle = 'rgba(150,30,25,.75)'; x.textAlign = 'center'; x.fillText('INSPECTED', 130, 586);
  });
}
function labelTex(text, bg, fg, w = 256, h = 72) { return plateTex(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); const r = rng(hashStr(text)); for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${r() * .05})`; x.fillRect(r() * w, r() * h, r() * 30, 1); } x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8); x.font = `600 ${h * .58}px ${FONT_ENG}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg; if ('letterSpacing' in x) x.letterSpacing = '4px'; x.fillText(text, w / 2, h / 2 + 2); }); }
function shaftNumbersTex() {
  const n = TOP + 2, cols = 4, rows = Math.ceil(n / cols); const [c, x] = cv(cols * 256, rows * 128); const r = rng(13);
  for (let f = 0; f < n; f++) {
    const cx = (f % cols) * 256 + 128, cy = Math.floor(f / cols) * 128 + 64;
    x.font = `400 104px ${FONT_STENCIL}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#e7e0cf'; x.fillText(f === 0 ? 'L' : String(f), cx, cy + 4);
  }
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${r() * .8})`; x.beginPath(); x.arc(r() * c.width, r() * c.height, r() * 3.5, 0, 6.283); x.fill(); }
  return { tex: ctex(c), cols, rows };
}
function leafTex() {
  return plateTex(256, 256, (x) => {
    const g = x.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, '#2f5a14'); g.addColorStop(.6, '#5c8d22'); g.addColorStop(1, '#88b43a'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const r = rng(2); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${r() < .5 ? '20,40,5' : '200,230,120'},${r() * .06})`; x.beginPath(); x.arc(r() * 256, r() * 256, 2 + r() * 16, 0, 6.283); x.fill(); }
    x.strokeStyle = 'rgba(210,235,150,.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(128, 256); x.lineTo(128, 20); x.stroke();
    x.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const y = 220 - i * 32; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(128, y); x.quadraticCurveTo(128 + s * 50, y - 20, 128 + s * (90 - i * 10), y - 60); x.stroke(); } }
  });
}

/* ---- landing wall: stencilled floor number and project name, sprayed and chipped ---- */
const [landC, landX] = cv(2048, 1024), [landSC, landSX] = cv(512, 512);
function drawLanding(p, hue) {
  const x = landX, r = rng(hashStr(p.name) ^ p.floor);
  x.clearRect(0, 0, 2048, 1024);
  const paint = `hsl(${Math.round(hue * 360)},38%,13%)`;
  x.fillStyle = paint; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  const num = String(p.floor);
  x.font = `400 ${num.length > 1 ? 520 : 600}px ${FONT_STENCIL}`; const nw = x.measureText(num).width; x.fillText(num, 70, 790);
  const left = 70 + nw + 90, avail = 2048 - left - 70;
  const words = p.name.toUpperCase().split(/\s+/); let lines = [words.join(' ')], fs = 210;
  const fits = (ls, s) => { x.font = `400 ${s}px ${FONT_STENCIL}`; return ls.every(l => x.measureText(l).width <= avail); };
  while (!fits(lines, fs) && fs > 120) fs -= 6;
  if (!fits(lines, fs) && words.length > 1) { const mid = Math.ceil(words.length / 2); lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]; fs = 190; while (!fits(lines, fs) && fs > 60) fs -= 6; }
  else if (!fits(lines, fs)) { while (!fits(lines, fs) && fs > 40) fs -= 6; }
  x.font = `400 ${fs}px ${FONT_STENCIL}`;
  const top = lines.length > 1 ? 470 - fs * .55 : 520;
  lines.forEach((l, i) => x.fillText(l, left, top + i * fs * 1.02));
  // drips under the letters
  for (let i = 0; i < 6; i++) { const dx = left + r() * Math.min(avail, 1300), dy = top + (lines.length - 1) * fs * 1.02 + 6, len = 14 + r() * r() * 110, w = 4 + r() * 5;
    x.beginPath(); x.moveTo(dx - w / 2, dy - 20); x.lineTo(dx - w / 2, dy + len); x.arc(dx, dy + len, w / 2, Math.PI, 0, true); x.lineTo(dx + w / 2, dy - 20); x.fill(); }
  x.font = `500 64px ${FONT_SERIF}`; x.fillText(p.author ? 'by ' + p.author : '', left + 6, top + (lines.length - 1) * fs * 1.02 + 120);
  x.font = `500 38px ${FONT_MONO}`; if ('letterSpacing' in x) x.letterSpacing = '10px'; x.fillText('STEP OUT TO VISIT  →', left + 8, 900); if ('letterSpacing' in x) x.letterSpacing = '0px';
  // chip the paint
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26000; i++) { x.fillStyle = `rgba(0,0,0,${r() * r() * .9})`; x.beginPath(); x.arc(r() * 2048, r() * 1024, r() * 4, 0, 6.283); x.fill(); }
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(0,0,0,${.4 + r() * .6})`; x.beginPath(); const cx = r() * 2048, cy = r() * 1024; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, d = 4 + r() * 22; k ? x.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d) : x.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } x.fill(); }
  for (let y = 0; y < 1024; y += 3) { x.fillStyle = `rgba(0,0,0,${r() * .14})`; x.fillRect(0, y, 2048, 1 + r() * 2); }
  x.globalCompositeOperation = 'source-over';
  landSX.clearRect(0, 0, 512, 512); drawSticker(landSX, 256, 256, 480, p);
}

/* ======================================================================
   GEOMETRY HELPERS
   ====================================================================== */
function bb(x0, x1, y0, y1, z0, z1) { return new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); }
// world-projected UVs: walls read u along the wall and v = height above y0 divided by sv
function wuv(g, su = 1, sv = 1, y0 = 0, z0 = 0) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i) / su; v = (p.getZ(i) - z0) / sv; }
    else if (ax >= az) { u = (n.getX(i) > 0 ? -p.getZ(i) : p.getZ(i)) / su; v = (p.getY(i) - y0) / sv; }
    else { u = (n.getZ(i) > 0 ? p.getX(i) : -p.getX(i)) / su; v = (p.getY(i) - y0) / sv; }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true; return g;
}
function prep(g) {
  if (!g.index) { const n = g.attributes.position.count; g.setIndex([...Array(n).keys()]); }
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups(); return g;
}
class Bucket {
  constructor() { this.m = new Map(); }
  add(mat, g) { if (!this.m.has(mat)) this.m.set(mat, []); this.m.get(mat).push(prep(g)); return g; }
  build(parent, cast = true) { const out = []; for (const [mat, gs] of this.m) { const mesh = new THREE.Mesh(mergeGeometries(gs), mat); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); out.push(mesh); } this.m.clear(); return out; }
}
// a wall slab with rectangular holes. axis 'x': plane across x (u = z), axis 'z': plane across z (u = x). v = y.
function holedWall(axis, a0, a1, u0, u1, v0, v1, holes = []) {
  const us = [u0, u1]; for (const h of holes) us.push(clamp(h[0], u0, u1), clamp(h[1], u0, u1));
  const U = [...new Set(us)].sort((a, b) => a - b); const out = [];
  for (let i = 0; i < U.length - 1; i++) {
    const ua = U[i], ub = U[i + 1]; if (ub - ua < 1e-5) continue;
    const cov = holes.filter(h => h[0] <= ua + 1e-6 && h[1] >= ub - 1e-6).map(h => [h[2], h[3]]).sort((a, b) => a[0] - b[0]);
    let v = v0;
    const push = (va, vb) => { if (vb - va < 1e-5) return; out.push(axis === 'x' ? bb(a0, a1, va, vb, ua, ub) : bb(ua, ub, va, vb, a0, a1)); };
    for (const [va, vb] of cov) { push(v, Math.max(v, va)); v = Math.max(v, vb); }
    push(v, v1);
  }
  return out;
}
// clip a line through the rectangle [u0,u1]x[v0,v1] (Liang-Barsky) -> [ua,va,ub,vb] or null
function clipLine(px, py, dx, dy, u0, u1, v0, v1) {
  let t0 = -1e9, t1 = 1e9;
  const p = [-dx, dx, -dy, dy], q = [px - u0, u1 - px, py - v0, v1 - py];
  for (let i = 0; i < 4; i++) { if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return null; continue; } const t = q[i] / p[i]; if (p[i] < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); }
  return t0 < t1 ? [px + dx * t0, py + dy * t0, px + dx * t1, py + dy * t1] : null;
}
function rod(a, b, r, seg = 8) { const d = new V3().subVectors(b, a), L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, seg, 1); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; }
function bar(a, b, t) { const d = new V3().subVectors(b, a), L = d.length(); const g = new THREE.BoxGeometry(t, L, t); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; }

/* ---- leaf: heart-shaped, folded along the midrib ---- */
function leafGeometry() {
  const pts = []; const N = 18;
  for (let i = 0; i <= N; i++) { const t = i / N * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([x / 17, -(y - 5) / 17]); }
  // heart points down; flip so the stem is at y=0 and the tip at y~1
  const pos = [0, 0, 0], uv = [.5, 0], idx = [];
  const ys = pts.map(p => p[1]); const ymin = Math.min(...ys), ymax = Math.max(...ys);
  for (const [x, y0] of pts) { const y = 1 - (y0 - ymin) / (ymax - ymin); const fold = -Math.abs(x) * .22 + Math.sin(y * Math.PI) * .05; pos.push(x * .55, y, fold); uv.push(.5 + x * .5, y); }
  // move the centre fan point to the notch so the stem attaches there
  pos[1] = .12; pos[2] = .02;
  for (let i = 1; i <= N; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function flowerGeometry() {
  const geos = []; const pink = new THREE.Color(0xf2a3b5), core = new THREE.Color(0xf2c94c);
  for (let i = 0; i < 5; i++) { const g = new THREE.CircleGeometry(.5, 10); g.scale(.55, 1, 1); g.translate(0, .55, 0); g.rotateZ(i / 5 * Math.PI * 2); g.rotateX(-.25); geos.push(paintGeo(g, pink)); }
  const c = new THREE.SphereGeometry(.22, 8, 6); c.scale(1, 1, .6); geos.push(paintGeo(c, core));
  return mergeGeometries(geos.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; }));
}
function paintGeo(g, col) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function mossGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position; const r = rng(4);
  for (let i = 0; i < p.count; i++) { const v = new V3().fromBufferAttribute(p, i); const k = .78 + .3 * Math.sin(v.x * 7 + v.y * 5) * Math.sin(v.z * 6) + r() * .12; v.multiplyScalar(k); v.y = Math.max(v.y * .55, -.15); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}

/* ======================================================================
   IVY: wandering vines across a wall plane, heart leaves facing out.
   ====================================================================== */
const leafM = [], leafC = [], dryM = [], dryC = [], mossM = [], mossC = [], flowerM = [];
const vineGeos = new Map();     // parent -> geometries
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new V3(), _p = new V3();
function leafMatrix(pos, normal, up, size, out) {
  const z = normal.clone().normalize(); const y = up.clone().addScaledVector(z, -up.dot(z)).normalize(); const x = new V3().crossVectors(y, z);
  out.makeBasis(x, y, z).scale(_s.set(size, size, size)).setPosition(pos); return out;
}
function ivy(parent, o) {
  const r = rng(o.seed || 1); const U = o.U, V = o.V, N = o.N, org = o.origin;
  const P = (u, v, lift = 0) => org.clone().addScaledVector(U, u).addScaledVector(V, v).addScaledVector(N, lift);
  const list = vineGeos.get(parent) || []; vineGeos.set(parent, list);
  for (const s of o.starts) {
    let u = s[0], v = s[1], ang = (s[2] ?? Math.PI / 2) + (r() - .5) * .4; const steps = s[3] || o.steps || 40;
    const pts = [P(u, v, .006)];
    for (let k = 0; k < steps; k++) {
      ang += (r() - .5) * .7 + (o.pull ? Math.sin(Math.atan2(o.pull[1], o.pull[0]) - ang) * .08 : 0);
      const st = .028 + r() * .02; u += Math.cos(ang) * st; v += Math.sin(ang) * st;
      if (u < o.u0) { u = o.u0; ang = Math.PI - ang; } if (u > o.u1) { u = o.u1; ang = Math.PI - ang; }
      if (v < o.v0) { v = o.v0; ang = -ang; } if (v > o.v1) { v = o.v1; ang = -ang; }
      const p = P(u, v, .005 + Math.abs(Math.sin(k * .7)) * .006); pts.push(p);
      if (r() < (o.density ?? .85)) {
        for (let q = 0; q < (r() < .4 ? 2 : 1); q++) {
          const side = r() < .5 ? -1 : 1; const off = U.clone().multiplyScalar(-Math.sin(ang) * side * .02).addScaledVector(V, Math.cos(ang) * side * .02);
          const lp = p.clone().add(off).addScaledVector(N, .008 + r() * .035);
          const nrm = N.clone().addScaledVector(V, -.25 - r() * .3).addScaledVector(U, (r() - .5) * .9).add(new V3((r() - .5) * .5, (r() - .5) * .5, (r() - .5) * .5));
          const up = V.clone().multiplyScalar(-.6 + r() * .9).addScaledVector(U, (r() - .5) * 1.4).addScaledVector(N, .4 + r() * .5);
          const sz = (o.leaf || .07) * (.55 + r() * .75) * (1 - k / steps * .35);
          leafM.push({ parent, m: leafMatrix(lp, nrm, up, sz, new THREE.Matrix4()) });
          const t = r(); leafC.push(new THREE.Color().setHSL(.2 + t * .08 + (r() - .5) * .03, .55 + r() * .25, .22 + r() * .2));
        }
      }
      if (o.flowers && r() < o.flowers) flowerM.push({ parent, m: new THREE.Matrix4().compose(p.clone().addScaledVector(N, .03), _q.setFromUnitVectors(new V3(0, 0, 1), N.clone().addScaledVector(V, .3).normalize()), _s.setScalar(.012 + r() * .01)) });
    }
    if (pts.length > 2) list.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, .0045 + r() * .003, 4, false));
    for (let k = 1; k < pts.length; k += 6) if (r() < .5) { const sp = pts[k]; list.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([sp, sp.clone().addScaledVector(U, (r() - .5) * .12).addScaledVector(V, (r() - .2) * .1).addScaledVector(N, .01)]), 4, .002, 3, false)); }
  }
}
function hangVine(parent, top, len, seed, leafSize = .065) {
  const r = rng(seed); const pts = []; let x = top.x, z = top.z;
  for (let y = 0; y <= len; y += .05) { x += (r() - .5) * .025; z += (r() - .5) * .025; pts.push(new V3(x, top.y - y, z)); }
  const list = vineGeos.get(parent) || []; vineGeos.set(parent, list);
  list.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, .004, 4, false));
  pts.forEach((p, i) => {
    if (i < 1 || r() > .8) return;
    const a = r() * 6.283; const nrm = new V3(Math.cos(a), (r() - .5) * .6, Math.sin(a)); const up = new V3((r() - .5) * .6, -1, (r() - .5) * .6);
    const lp = p.clone().addScaledVector(nrm, .015);
    leafM.push({ parent, m: leafMatrix(lp, nrm, up, leafSize * (.6 + r() * .7) * (1 - i / pts.length * .4), new THREE.Matrix4()) });
    leafC.push(new THREE.Color().setHSL(.22 + r() * .07, .5 + r() * .3, .22 + r() * .2));
  });
}
function moss(parent, pos, n, spread, seed, sc = .05, up = new V3(0, 1, 0)) {
  const r = rng(seed); const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), up);
  for (let i = 0; i < n; i++) {
    const p = pos.clone().add(new V3((r() - .5) * spread.x, (r() - .5) * spread.y, (r() - .5) * spread.z));
    const s = sc * (.4 + r() * r() * 1.2);
    mossM.push({ parent, m: new THREE.Matrix4().compose(p, q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6.28, 0))), new V3(s * (1 + r() * .6), s * (.5 + r() * .5), s * (1 + r() * .6))) });
    mossC.push(new THREE.Color().setHSL(.2 + r() * .06, .55 + r() * .3, .16 + r() * .14));
  }
}
function dryLeaves(parent, x0, x1, z0, z1, y, n, seed, bias) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    let x = lerp(x0, x1, r()), z = lerp(z0, z1, r());
    if (bias) { const t = r(); if (t < .5) x = r() < .5 ? x0 + r() * r() * .6 : x1 - r() * r() * .6; }
    const p = new V3(x, y + .004 + r() * .01, z);
    const a = r() * 6.283; const nrm = new V3((r() - .5) * .5, 1, (r() - .5) * .5); const up = new V3(Math.cos(a), 0, Math.sin(a));
    dryM.push({ parent, m: leafMatrix(p, nrm, up, .045 + r() * .05, new THREE.Matrix4()) });
    dryC.push(new THREE.Color().setHSL(.06 + r() * .06, .45 + r() * .3, .14 + r() * .16));
  }
}
function instance(parent, geo, mat, list, colors, cast = true) {
  const items = list.map((e, i) => [e, i]).filter(([e]) => e.parent === parent); if (!items.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach(([e, i], k) => { im.setMatrixAt(k, e.m); if (colors) im.setColorAt(k, colors[i]); });
  im.castShadow = cast; im.receiveShadow = true; parent.add(im); return im;
}

/* ======================================================================
   SKY: warm low sun, haze, a tree line that drops away as the cab climbs
   ====================================================================== */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uSun: { value: SUN_BASE.clone().negate() }, uTime: { value: 0 }, uHor: { value: new V3(1.25, .78, .44) }, uZen: { value: new V3(.16, .3, .55) }, uGlow: { value: 1 }, uStars: { value: 0 } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: /* glsl */`
  varying vec3 vW; uniform vec3 uSun, uHor, uZen; uniform float uTime, uGlow, uStars;
  float h11(float p){ return fract(sin(p*127.1)*43758.5453); }
  float n1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(h11(i), h11(i+1.), f); }
  float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
  float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
  void main(){
    vec3 d = normalize(vW - cameraPosition);
    float hz = -atan((cameraPosition.y + 6.)/420.);
    float y = d.y - hz;
    float mu = max(dot(d, uSun), 0.);
    vec3 col = mix(uHor*2.0, uZen*1.3, smoothstep(-.02, .45, y));
    col += (vec3(2.2,1.2,.55)*pow(mu, 6.)*1.6 + vec3(5.,3.,1.4)*pow(mu, 60.)*2.)*uGlow;
    col += vec3(60.,42.,24.)*smoothstep(.9994, .9997, mu)*uGlow;
    vec2 sg = floor(vec2(atan(d.z, d.x)*420., d.y*420.)); float sh = h21(sg);
    col += vec3(.9,.95,1.)*step(.9975, sh)*smoothstep(.02, .2, y)*uStars*(.5 + .5*sin(uTime*2. + sh*80.));
    // soft cloud bands
    vec2 cp = d.xz/max(d.y + .12, .05);
    float cl = n2(cp*1.4 + vec2(uTime*.004, 0.))*n2(cp*3.1 - uTime*.003);
    col = mix(col, col*.7 + vec3(1.6,.9,.5)*pow(mu,3.)*1.5, smoothstep(.25,.55,cl)*smoothstep(0.,.25,y)*.6);
    // tree line and far blocks below the horizon
    float az = atan(d.z, d.x);
    float tl = .012 + .03*n1(az*18.) + .02*n1(az*57.)*n1(az*9.) + .05*smoothstep(.7, 1., n1(az*6.3))*n1(az*40.);
    if (y < tl){
      float k = clamp((tl - y)*12., 0., 1.);
      vec3 g = mix(vec3(.16,.1,.05), vec3(.03,.04,.025), k);
      g += vec3(1.,.6,.3)*pow(mu, 4.)*.4*(1.-k)*uGlow;
      g = mix(g, g*.25 + vec3(.004,.006,.012), uStars);
      col = mix(col, g, smoothstep(0., .004, tl - y));
    }
    gl_FragColor = vec4(col, 1.);
  }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

/* ======================================================================
   LIGHTS
   ====================================================================== */
const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.71, 0.43), 9.5);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.018;
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 32;
scene.add(sun); scene.add(sun.target);
const sunDir = SUN_BASE.clone();
const sunFocus = new V3(-0.6, 1.6, 2.2);
let sunExtent = 5.6;
function setShadowExtent(e) { if (Math.abs(e - sunExtent) < 1e-3 && sun.shadow.camera.left === -e) return; sunExtent = e; const c = sun.shadow.camera; c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.updateProjectionMatrix(); }
setShadowExtent(5.6);
function updateSun() {
  sun.target.position.copy(sunFocus); sun.position.copy(sunFocus).addScaledVector(sunDir, -15);
  // snap to shadow texels so the stripes do not shimmer while the focus moves
  sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
}
const hemi = new THREE.HemisphereLight(new THREE.Color(.45, .62, .66), new THREE.Color(.32, .22, .13), .3); scene.add(hemi);

/* ======================================================================
   SCENE BUILD
   ====================================================================== */
const M = {};
const TEX = {};
const world = new THREE.Group(); scene.add(world);
const cab = new THREE.Group(); scene.add(cab);
const landing = new THREE.Group(); scene.add(landing); landing.visible = false;
const hot = [];                      // pointer targets
const buttons = [];                  // panel buttons by floor / role
const doors = { cabL: null, cabR: null, lobL: null, lobR: null, landL: null, landR: null };
const UI3 = {};                      // misc meshes updated at runtime

async function buildMaterials(progress) {
  const B = {};
  progress('Painting the steel…');
  B.teal = await bake(0, 1024, { c1: [.032, .125, .105], ns: 5, seed: .11 });
  B.door = await bake(0, 1024, { c1: [.04, .15, .125], ns: 5, seed: .47, wear: .012 });
  progress('Rusting the edges…');
  B.cream = await bake(1, 512, { c1: [.5, .43, .3], ns: 5, seed: .23 });
  B.plaster = await bake(2, 1024, { c1: [.56, .52, .43], ns: 4, seed: .31 });
  progress('Laying the tiles…');
  B.tile = await bake(3, 1024, { ns: 5, seed: .05 });
  B.tread = await bake(4, 512, { ns: 7, seed: .17 });
  B.conc = await bake(5, 512, { c1: [.25, .24, .22], ns: 4, seed: .61 });
  progress('Polishing the buttons…');
  B.chrome = await bake(6, 256, { c1: [.92, .91, .88], c2: [.09, .07, .05], ns: 2, seed: .71 });
  B.brass = await bake(7, 256, { c1: [.78, .56, .26], c2: [.16, .1, .05], ns: 2, seed: .83 });
  B.yellow = await bake(0, 512, { c1: [.62, .4, .015], ns: 5, seed: .53, wear: .01 });
  B.iron = await bake(8, 512, { c1: [.028, .032, .03], ns: 3, seed: .91 });
  const pbr = (b, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: b.map, normalMap: b.normal, roughnessMap: b.orm, metalnessMap: b.orm, aoMap: b.orm, roughness: 1, metalness: 1, envMapIntensity: .5 }, o));
  M.teal = pbr(B.teal); M.door = pbr(B.door); M.cream = pbr(B.cream); M.plaster = pbr(B.plaster); M.ceil = pbr(B.plaster, { color: new THREE.Color(.55, .55, .52) });
  M.tile = pbr(B.tile, { envMapIntensity: .7 }); M.tread = pbr(B.tread, { envMapIntensity: .8 }); M.conc = pbr(B.conc); M.chrome = pbr(B.chrome, { envMapIntensity: 1.2 });
  M.brass = pbr(B.brass, { envMapIntensity: 1.1 }); M.iron = pbr(B.iron, { envMapIntensity: .4 }); M.ironM = pbr(B.iron, { metalness: .6, roughness: .8, envMapIntensity: .5 });
  M.landTeal = pbr(B.teal); M.landPlaster = pbr(B.plaster); M.landTile = pbr(B.tile, { envMapIntensity: .7 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: .92, metalness: 0 });
  M.terracotta = new THREE.MeshStandardMaterial({ color: new THREE.Color(.36, .14, .07), roughness: .9, metalness: 0, normalMap: B.conc.normal, normalScale: new THREE.Vector2(.6, .6) });
  M.yellow = pbr(B.yellow, { envMapIntensity: .6 });
  M.vine = new THREE.MeshStandardMaterial({ color: new THREE.Color(.13, .09, .05), roughness: .9 });
  M.leaf = new THREE.MeshStandardMaterial({ map: ctex(leafTex().image), side: THREE.DoubleSide, roughness: .55, metalness: 0, envMapIntensity: .35 });
  M.leaf.onBeforeCompile = (sh) => {     // thin-leaf translucency: sun shining through from behind
    sh.uniforms.uSunV = UNI.sunView; sh.uniforms.uSunC = UNI.sunCol;
    sh.fragmentShader = 'uniform vec3 uSunV; uniform vec3 uSunC;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      `float bl = max(dot(-normal, -uSunV), 0.)*0.22; outgoingLight += diffuseColor.rgb*diffuseColor.rgb*uSunC*bl*(0.4 + 0.6*float(gl_FrontFacing ? 0 : 1));\n#include <opaque_fragment>`);
  };
  M.dry = new THREE.MeshStandardMaterial({ map: M.leaf.map, side: THREE.DoubleSide, roughness: .8, metalness: 0, color: new THREE.Color(1.6, 1.2, .8) });
  M.moss = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 1, metalness: 0, sheen: 1, sheenColor: new THREE.Color(.55, .7, .2), sheenRoughness: .45, envMapIntensity: .3 });
  M.flower = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, side: THREE.DoubleSide });
  M.bulb = new THREE.MeshStandardMaterial({ color: 0x221a10, emissive: new THREE.Color(1, .62, .3), emissiveIntensity: 14, roughness: .3 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .08, metalness: 0, transmission: 0, transparent: true, opacity: .05, envMapIntensity: .5, depthWrite: false });
  M.lens = new THREE.MeshStandardMaterial({ color: new THREE.Color(.25, .1, .03), emissive: new THREE.Color(1, .45, .12), emissiveIntensity: 0, roughness: .25 });
  M.sky = skyMat;
}
const UNI = { sunView: { value: new V3() }, sunCol: { value: new V3(1, .7, .42) } };

function envMap() {
  const es = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(.05, .085, .075), side: THREE.BackSide })); room.position.y = 2; es.add(room);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 4.4, 2.4) })); win.position.set(-4.9, 2, 1); win.rotation.y = Math.PI / 2; es.add(win);
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, .75, .4) })); patch.position.set(.5, -.45, -1); patch.rotation.x = -Math.PI / 2; es.add(patch);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(.09, .07, .05) })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.5; es.add(floor);
  const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromScene(es, .03).texture; pm.dispose(); return t;
}

function buildLobby() {
  const b = new Bucket(); const L = LOBBY;
  // floor, ceiling, beams
  b.add(M.tile, wuv(bb(L.x0 - .3, L.x1 + .3, -.2, 0, 0, L.z1 + .3), 1.2, 1.2));
  b.add(M.ceil, wuv(bb(L.x0 - .3, L.x1 + .3, L.h, L.h + .12, 0, L.z1 + .3), 2.4, 2.4));
  for (const z of [2.6, 5.2]) b.add(M.ironM, wuv(bb(L.x0, L.x1, L.h - .32, L.h, z - .09, z + .09), 1.2, 1.2));
  // hoistway wall: painted steel to 2.5 m, plaster above
  for (const g of holedWall('z', 0, WALL_Z, L.x0, L.x1, 0, 2.5, [[-DOOR_W / 2, DOOR_W / 2, -1, DOOR_H]])) b.add(M.teal, wuv(g, 2.4, 2.5));
  for (const g of holedWall('z', 0, WALL_Z, L.x0, L.x1, 2.5, L.h, [])) b.add(M.plaster, wuv(g, 2.4, L.h - 2.5, 2.5));
  b.add(M.ironM, wuv(bb(L.x0, L.x1, 2.47, 2.53, WALL_Z, WALL_Z + .035), .6, .6));           // dado rail
  // left wall with the big window
  const WIN = { z0: 1.15, z1: 5.45, y0: .95, y1: 3.32 };
  for (const g of holedWall('x', L.x0 - .3, L.x0, 0, L.z1, 0, 1.25, [])) b.add(M.teal, wuv(g, 2.4, 1.25));
  for (const g of holedWall('x', L.x0 - .3, L.x0, 0, L.z1, 1.25, L.h, [[WIN.z0, WIN.z1, WIN.y0, WIN.y1]])) b.add(M.plaster, wuv(g, 2.4, L.h, 0));
  for (const g of holedWall('x', L.x0 - .3, L.x0, WIN.z0, WIN.z1, .95, 1.25, [[WIN.z0, WIN.z1, .94, 1.3]])) b.add(M.plaster, g);
  b.add(M.conc, wuv(bb(L.x0 - .06, L.x0 + .1, .9, .96, WIN.z0 - .05, WIN.z1 + .05), .6, .6));   // sill
  // window frame: mullions and transoms (these draw the stripes)
  const wb = new Bucket();
  for (let i = 0; i <= 6; i++) { const z = lerp(WIN.z0, WIN.z1, i / 6); wb.add(M.ironM, wuv(bb(L.x0 - .2, L.x0 - .14, WIN.y0, WIN.y1, z - .025, z + .025), .5, .5)); }
  for (const y of [WIN.y0 + .02, 1.55, 2.15, 2.74, WIN.y1 - .02]) wb.add(M.ironM, wuv(bb(L.x0 - .2, L.x0 - .14, y - .02, y + .02, WIN.z0, WIN.z1), .5, .5));
  for (let i = 0; i < 18; i++) { const z = lerp(WIN.z0, WIN.z1, (i + .5) / 18); wb.add(M.ironM, rod(new V3(L.x0 - .1, WIN.y0, z), new V3(L.x0 - .1, WIN.y1, z), .009, 6)); }
  // a few broken glass panes left in the frame
  wb.build(world);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(.7, .58), M.glass); glass.position.set(L.x0 - .16, 2.47, WIN.z0 + .36); glass.rotation.y = Math.PI / 2; world.add(glass);
  const glass2 = glass.clone(); glass2.position.set(L.x0 - .16, 1.28, WIN.z1 - .36); world.add(glass2);
  // right wall, back wall with a closed double door and a lit transom
  for (const g of holedWall('x', L.x1, L.x1 + .3, 0, L.z1, 0, 1.25, [])) b.add(M.teal, wuv(g, 2.4, 1.25));
  for (const g of holedWall('x', L.x1, L.x1 + .3, 0, L.z1, 1.25, L.h, [])) b.add(M.plaster, wuv(g, 2.4, L.h, 0));
  for (const g of holedWall('z', L.z1, L.z1 + .3, L.x0, L.x1, 0, 1.25, [[-.75, .75, -1, 2.3]])) b.add(M.teal, wuv(g, 2.4, 1.25));
  for (const g of holedWall('z', L.z1, L.z1 + .3, L.x0, L.x1, 1.25, L.h, [[-.75, .75, 1, 2.75]])) b.add(M.plaster, wuv(g, 2.4, L.h, 0));
  b.add(M.door, wuv(bb(-.75, .75, 0, 2.3, L.z1 + .08, L.z1 + .14), 1.5, 2.3));
  b.add(M.ironM, wuv(bb(-.012, .012, 0, 2.3, L.z1 + .05, L.z1 + .08), .3, .3));
  const transom = new THREE.Mesh(new THREE.PlaneGeometry(1.46, .4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 1.3) })); transom.position.set(0, 2.53, L.z1 + .12); transom.rotation.y = Math.PI; world.add(transom);
  for (let i = 1; i < 6; i++) b.add(M.ironM, bb(-.73 + i * .243 - .012, -.73 + i * .243 + .012, 2.33, 2.73, L.z1 + .06, L.z1 + .1));
  // elevator surround: cream architrave, brass sill
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, -DOOR_W / 2, 0, DOOR_H + .12, WALL_Z, WALL_Z + .05), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(DOOR_W / 2, DOOR_W / 2 + .12, 0, DOOR_H + .12, WALL_Z, WALL_Z + .05), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, DOOR_W / 2 + .12, DOOR_H, DOOR_H + .14, WALL_Z, WALL_Z + .05), .5, .5, DOOR_H));
  b.add(M.brass, wuv(bb(-DOOR_W / 2, DOOR_W / 2, -.01, .008, 0, WALL_Z + .03), .3, .3));
  for (let i = 0; i < 9; i++) b.add(M.rubber, bb(-DOOR_W / 2, DOOR_W / 2, .004, .0095, .02 + i * .025, .03 + i * .025));
  // radiator under the window
  for (let i = 0; i < 16; i++) { const z = 2.0 + i * .085; b.add(M.ironM, wuv(new RoundedBoxGeometry(.14, .62, .06, 2, .02).translate(L.x0 + .14, .5, z), .3, .3)); }
  b.add(M.ironM, rod(new V3(L.x0 + .14, .22, 1.95), new V3(L.x0 + .14, .22, 3.38), .022));
  b.add(M.ironM, rod(new V3(L.x0 + .14, .22, 1.95), new V3(L.x0 + .14, 0, 1.95), .022));
  // ceiling pipe with brackets
  b.add(M.ironM, rod(new V3(-2.55, 3.0, .25), new V3(-2.55, 3.0, L.z1), .045, 10));
  for (const z of [1.3, 3.9, 6.4]) b.add(M.ironM, bb(-2.58, -2.52, 3.0, L.h - .3, z - .02, z + .02));
  // wall sconce left of the lift
  b.add(M.brass, wuv(new THREE.CylinderGeometry(.06, .06, .02, 20).rotateX(Math.PI / 2).translate(-1.55, 2.12, WALL_Z + .01), .2, .2));
  b.add(M.brass, rod(new V3(-1.55, 2.12, WALL_Z + .01), new V3(-1.55, 2.2, WALL_Z + .14), .008));
  const sconce = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 12), M.bulb.clone()); sconce.material.emissiveIntensity = 5; sconce.position.set(-1.55, 2.2, WALL_Z + .15); world.add(sconce); UI3.sconce = sconce;
  const shade_ = new THREE.Mesh(new THREE.CylinderGeometry(.05, .11, .1, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .5, metalness: .8, side: THREE.DoubleSide })); shade_.position.set(-1.55, 2.25, WALL_Z + .15); world.add(shade_);
  const sl = new THREE.PointLight(new THREE.Color(1, .6, .3), 0.9, 6, 2); sl.position.set(-1.55, 2.16, WALL_Z + .2); world.add(sl); UI3.sconceLight = sl;
  // the call button
  b.add(M.cream, wuv(new RoundedBoxGeometry(.1, .2, .016, 2, .006).translate(.82, 1.12, WALL_Z + .008), .3, .3));
  UI3.call = makeButton(world, 'CALL', new V3(.82, 1.12, WALL_Z + .017), new THREE.Euler(0, 0, 0), { type: 'call' });
  // hall dial with a needle, and the arrival lantern
  const dial = new THREE.Mesh(new THREE.CircleGeometry(.3, 48, 0, Math.PI), new THREE.MeshStandardMaterial({ map: dialTex(), roughness: .45, metalness: .35, envMapIntensity: .8 }));
  dial.position.set(0, 2.34, WALL_Z + .022); world.add(dial);
  { const uv = dial.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, (uv.getY(i) - .5) * 2); uv.needsUpdate = true; }
  b.add(M.brass, wuv(new THREE.TorusGeometry(.305, .012, 8, 40, Math.PI).translate(0, 2.34, WALL_Z + .022), .2, .2));
  b.add(M.brass, wuv(bb(-.32, .32, 2.32, 2.345, WALL_Z, WALL_Z + .03), .2, .2));
  const needle = new THREE.Group(); needle.position.set(0, 2.34, WALL_Z + .034); world.add(needle);
  const nm = new THREE.Mesh(new THREE.BoxGeometry(.008, .25, .004).translate(0, .125, 0), new THREE.MeshStandardMaterial({ color: 0x120b06, roughness: .4, metalness: .5 })); nm.castShadow = true; needle.add(nm);
  needle.add(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .01, 16).rotateX(Math.PI / 2), M.brass));
  UI3.needle = needle;
  const lantern = new THREE.Group(); lantern.position.set(.88, 2.4, WALL_Z); world.add(lantern);
  b.add(M.brass, wuv(new RoundedBoxGeometry(.13, .24, .04, 2, .012).translate(.88, 2.4, WALL_Z + .02), .2, .2));
  const tri = new THREE.CylinderGeometry(.04, .04, .012, 3).rotateX(Math.PI / 2);
  UI3.lampUp = new THREE.Mesh(tri, M.lens.clone()); UI3.lampUp.position.set(0, .055, .042); UI3.lampUp.rotation.z = Math.PI; lantern.add(UI3.lampUp);
  UI3.lampDn = new THREE.Mesh(tri, M.lens.clone()); UI3.lampDn.position.set(0, -.055, .042); lantern.add(UI3.lampDn);
  UI3.lanternLight = new THREE.PointLight(new THREE.Color(1, .5, .15), 0, 1.6, 2); UI3.lanternLight.position.set(.88, 2.4, WALL_Z + .2); world.add(UI3.lanternLight);
  // directory case
  b.add(M.brass, wuv(new RoundedBoxGeometry(.74, 1.0, .05, 2, .012).translate(1.98, 1.58, WALL_Z + .025), .3, .3));
  const dir = new THREE.Mesh(new THREE.PlaneGeometry(.66, .9), new THREE.MeshStandardMaterial({ map: directoryTex(), roughness: .9, metalness: 0 }));
  dir.position.set(1.98, 1.58, WALL_Z + .052); world.add(dir);
  const dg = new THREE.Mesh(new THREE.PlaneGeometry(.68, .92), M.glass); dg.position.set(1.98, 1.58, WALL_Z + .058); world.add(dg);
  hot.push(Object.assign(dir, { userData: { act: { type: 'directory' } } }));
  // plant pot in the foreground of the opening shot
  const potPts = [[0, 0], [.13, 0], [.15, .02], [.17, .3], [.2, .32], [.2, .36], [.18, .36], [.17, .33], [0, .33]].map(p => new THREE.Vector2(p[0], p[1]));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 28), M.terracotta); pot.position.set(-.9, 0, 4.05); pot.castShadow = pot.receiveShadow = true; world.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(.17, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x140d07, roughness: 1 })); soil.position.set(-.9, .325, 4.05); world.add(soil);
  const pr = rng(31);
  for (let i = 0; i < 14; i++) {
    const a = pr() * 6.283, h = .45 + pr() * .65, lean = .15 + pr() * .3;
    const base = new V3(-.9 + Math.cos(a) * .05, .32, 4.05 + Math.sin(a) * .05), tip = new V3(-.9 + Math.cos(a) * lean, .32 + h, 4.05 + Math.sin(a) * lean);
    const mid = base.clone().lerp(tip, .5).add(new V3(Math.cos(a) * .08, .05, Math.sin(a) * .08));
    (vineGeos.get(world) || vineGeos.set(world, []).get(world)).push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, mid, tip]), 8, .006, 5, false));
    const nrm = new V3(Math.cos(a) * .6, .7, Math.sin(a) * .6).add(new V3(pr() - .5, pr() - .5, pr() - .5).multiplyScalar(.6)); const up = new V3(Math.cos(a), .4 + pr() * .5, Math.sin(a));
    leafM.push({ parent: world, m: leafMatrix(tip, nrm, up, .16 + pr() * .12, new THREE.Matrix4()) }); leafC.push(new THREE.Color().setHSL(.24 + pr() * .05, .55, .2 + pr() * .12));
  }
  moss(world, new V3(-.9, .34, 4.05), 6, new V3(.28, .01, .28), 5, .035);
  // ivy: up the left jamb, across the header, over the dial; round the window; from the pipe
  ivy(world, { origin: new V3(0, 0, WALL_Z + .052), U: new V3(1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, 1), u0: -2.6, u1: -.55, v0: 0, v1: 2.48, seed: 3,
    starts: [[-.75, .02, 1.5, 70], [-1.1, .02, 1.3, 60], [-1.9, .02, 1.7, 46], [-.62, .4, 1.6, 52]], leaf: .07, flowers: .05 });
  ivy(world, { origin: new V3(0, 0, WALL_Z + .052), U: new V3(1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, 1), u0: -1.0, u1: .7, v0: 2.15, v1: 3.4, seed: 8, pull: [1, 0],
    starts: [[-.7, 2.2, .3, 60], [-.5, 2.6, .1, 40], [-.9, 2.9, .4, 50]], leaf: .065 });
  ivy(world, { origin: new V3(0, 0, WALL_Z + .052), U: new V3(1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, 1), u0: .62, u1: 1.3, v0: 0, v1: 1.6, seed: 12,
    starts: [[.7, .02, 1.6, 30], [1.05, .02, 1.5, 26]], leaf: .06, flowers: .06 });
  ivy(world, { origin: new V3(L.x0 + .005, 0, 0), U: new V3(0, 0, 1), V: new V3(0, 1, 0), N: new V3(1, 0, 0), u0: .3, u1: 6.5, v0: 0, v1: L.h - .1, seed: 21,
    starts: [[.5, .02, 1.5, 60], [WIN.z0 - .1, .02, 1.6, 70], [WIN.z1 + .15, .02, 1.5, 70], [5.6, .02, 1.6, 40], [WIN.z0 - .05, 3.3, -.2, 55]], leaf: .075, flowers: .03 });
  for (let i = 0; i < 11; i++) hangVine(world, new V3(-2.55 + (i % 2 ? .03 : -.03), 2.98, .6 + i * .5 + Math.sin(i) * .2), .4 + rng(i + 50)() * 1.6, 70 + i, .06);
  moss(world, new V3(-.85, .02, WALL_Z + .14), 40, new V3(1.4, .02, .18), 41, .05);
  moss(world, new V3(-1.9, .02, WALL_Z + .12), 26, new V3(1.4, .02, .16), 42, .045);
  moss(world, new V3(0, DOOR_H + .145, WALL_Z + .03), 18, new V3(1.2, .01, .04), 43, .022);
  moss(world, new V3(L.x0 + .02, .955, (WIN.z0 + WIN.z1) / 2), 50, new V3(.08, .01, 3.4), 44, .04);
  moss(world, new V3(L.x0 + .15, .02, 3.5), 60, new V3(.3, .02, 6.5), 45, .05);
  moss(world, new V3(.95, .02, WALL_Z + .1), 20, new V3(.6, .02, .14), 46, .04);
  dryLeaves(world, L.x0 + .1, L.x1 - .1, WALL_Z + .1, L.z1 - .2, 0, 150, 9, true);
  b.build(world);
  // a sunlit-floor bounce
  UI3.lobbyBounce = new THREE.PointLight(new THREE.Color(1, .66, .38), 2.2, 7, 2); UI3.lobbyBounce.position.set(-.9, .55, 1.9); world.add(UI3.lobbyBounce);
  // lobby doors
  const dg2 = (sx) => { const g = new THREE.Group(); const m = new THREE.Mesh(wuv(bb(-.27, .27, 0, DOOR_H, 0, .035), 2.4, DOOR_H), M.door); m.castShadow = m.receiveShadow = true; g.add(m);
    const e = new THREE.Mesh(bb(sx > 0 ? -.27 : .255, sx > 0 ? -.255 : .27, 0, DOOR_H, -.002, .037), M.rubber); g.add(e); world.add(g); g.position.set(sx * .265, 0, .035); return g; };
  doors.lobL = dg2(-1); doors.lobR = dg2(1);
  // vision strip on lobby doors: none (period steel doors) — a painted floor number plate instead
}

function buildShaft() {
  const b = new Bucket(), bars = new Bucket(); const S = SHAFT; const yTop = (TOP + 1) * H + 1.2;
  const wins = []; for (let f = 0; f <= TOP + 1; f++) wins.push([-1.95, -.05, f * H + 1.0, f * H + 3.1]);
  for (const g of holedWall('x', S.x0 - .2, S.x0, S.z0 - .2, 0, -1.6, yTop, wins)) b.add(M.conc, wuv(g, 2, 3.6, -1.6));
  for (const g of holedWall('x', S.x1, S.x1 + .2, S.z0 - .2, 0, -1.6, yTop, [])) b.add(M.conc, wuv(g, 2, 3.6, -1.6));
  for (const g of holedWall('z', S.z0 - .2, S.z0, S.x0 - .2, S.x1 + .2, -1.6, yTop, [])) b.add(M.conc, wuv(g, 2, 3.6, -1.6));
  b.add(M.conc, wuv(bb(S.x0 - .2, S.x1 + .2, -1.8, -1.6, S.z0 - .2, WALL_Z), 2, 2));
  b.add(M.conc, wuv(bb(S.x0 - .2, S.x1 + .2, yTop, yTop + .3, S.z0 - .2, WALL_Z), 2, 2));
  // front wall above the lobby: one slab per floor, with the doorway
  for (let f = 1; f <= TOP + 1; f++) for (const g of holedWall('z', 0, WALL_Z, S.x0 - .2, 1.85, Math.max(LOBBY.h, f * H - .0), Math.min(yTop, (f + 1) * H), [[-DOOR_W / 2, DOOR_W / 2, f * H - .01, f * H + DOOR_H]])) b.add(M.teal, wuv(g, 2.4, H, f * H));
  b.add(M.teal, wuv(bb(S.x0 - .2, 1.85, LOBBY.h, H - .002, 0, WALL_Z), 2.4, 1));
  // window frames and a diamond lattice in each window
  for (const [z0, z1, y0, y1] of wins) {
    const cz = (z0 + z1) / 2, cy = (y0 + y1) / 2;
    for (const k of [-1, 1]) {
      const a = k * .9, dz = Math.cos(a), dy = Math.sin(a), pz = -dy, py = dz;
      for (let j = -9; j <= 9; j++) {
        const off = j * .26; const c = clipLine(cz + pz * off, cy + py * off, dz, dy, z0 - .06, z1 + .06, y0 - .06, y1 + .06);
        if (c) bars.add(M.iron, bar(new V3(S.x0 - .1 + k * .012, c[1], c[0]), new V3(S.x0 - .1 + k * .012, c[3], c[2]), .016));
      }
    }
    for (const y of [y0, y1]) bars.add(M.iron, bb(S.x0 - .17, S.x0 - .03, y - .02, y + .02, z0, z1));
    for (const z of [z0, z1]) bars.add(M.iron, bb(S.x0 - .17, S.x0 - .03, y0, y1, z - .02, z + .02));
  }
  // guide rails
  for (const x of [-1.02, 1.02]) bars.add(M.ironM, wuv(bb(x - .02, x + .02, -1.6, yTop, -1.98, -1.86), .3, .3));
  b.build(world); bars.build(world);
  // stencilled floor numbers on the shaft wall, below each window
  const sn = shaftNumbersTex(); const pos = [], uv = [], idx = [];
  for (let f = 0; f <= TOP + 1; f++) {
    const i = f, cx = (i % sn.cols) / sn.cols, cy = 1 - (Math.floor(i / sn.cols) + 1) / sn.rows, w = 1 / sn.cols, h = 1 / sn.rows;
    const x = S.x0 + .004, y = f * H + .62, z = -1.05, hw = .34, hh = .17, base = pos.length / 3;
    pos.push(x, y - hh, z + hw, x, y - hh, z - hw, x, y + hh, z - hw, x, y + hh, z + hw);
    uv.push(cx, cy, cx + w, cy, cx + w, cy + h, cx, cy + h);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const nums = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: sn.tex, transparent: true, alphaTest: .3, roughness: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  nums.receiveShadow = true; world.add(nums);
  // outside the shaft windows: ivy on the outer wall face
  for (let f = 0; f <= TOP + 1; f += 1) if (f % 3 !== 1) ivy(world, { origin: new V3(S.x0 - .205, 0, 0), U: new V3(0, 0, 1), V: new V3(0, 1, 0), N: new V3(-1, 0, 0), u0: -2.2, u1: 0, v0: f * H, v1: f * H + 1.0, seed: 300 + f, starts: [[-1.2, f * H + .05, 1.4, 18]], leaf: .07 });
}

const KEEP_CHUNK = '#include <dithering_fragment>\n  gl_FragColor.a = 0.0;';
function keepSharp(m) {
  if (!m || m.userData.keepSharp) return m; m.userData.keepSharp = true;
  if (m.transparent) {   // decals: colour blends as usual, the destination alpha drops to 0 under the decal
    m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  } else {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', KEEP_CHUNK); };
    m.customProgramCacheKey = () => 'keepSharp';
  }
  m.needsUpdate = true; return m;
}
function makeButton(parent, label, pos, rot, act) {
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.copy(rot); parent.add(g);
  const prof = [[.0185, 0], [.026, 0], [.027, .003], [.0265, .007], [.024, .0095], [.0205, .0095], [.0185, .008]].map(p => new THREE.Vector2(p[0], p[1]));
  const bez = new THREE.Mesh(new THREE.LatheGeometry(prof, 32).rotateX(Math.PI / 2), M.chromeKeep || (M.chromeKeep = keepSharp(M.chrome.clone()))); bez.castShadow = true; bez.receiveShadow = true; g.add(bez);
  const cell = TEX.btn.cell(label);
  const fm = new THREE.MeshPhysicalMaterial({ map: TEX.btn.map.clone(), normalMap: TEX.btn.nm.clone(), emissiveMap: TEX.btn.em.clone(), emissive: new THREE.Color(1, .42, .1), emissiveIntensity: 0,
    roughness: .32, metalness: label === 'ALARM' ? 0 : .15, clearcoat: .7, clearcoatRoughness: .28, envMapIntensity: .9, normalScale: new THREE.Vector2(.7, .7) });
  for (const t of [fm.map, fm.normalMap, fm.emissiveMap]) { t.repeat.set(cell.s, cell.s); t.offset.set(cell.x, cell.y); t.needsUpdate = true; }
  if (label === 'ALARM') fm.emissive.setRGB(1, .12, .05);
  keepSharp(fm);
  const fg = new THREE.CylinderGeometry(.0182, .0182, .005, 32, 1).rotateX(Math.PI / 2);
  // cap UVs: CylinderGeometry caps are disc mapped in 0..1 already; flip for facing +z
  { const uv = fg.attributes.uv, p = fg.attributes.position; for (let i = 0; i < uv.count; i++) { uv.setXY(i, p.getX(i) / .0364 + .5, p.getY(i) / .0364 + .5); } }
  const face = new THREE.Mesh(fg, fm); face.position.z = .006; face.castShadow = true; face.receiveShadow = true; g.add(face);
  const btn = { group: g, face, mat: fm, lit: 0, litT: 0, press: 0, label, act, glow: 0 };
  face.userData.act = act; bez.userData.act = act; face.userData.btn = btn; bez.userData.btn = btn;
  hot.push(face, bez); buttons.push(btn);
  return btn;
}

function buildCab() {
  const b = new Bucket(); const C = CAB;
  b.add(M.tread, wuv(bb(C.x0, C.x1, -.04, 0, C.z0, C.z1), .6, .6));
  b.add(M.ironM, wuv(bb(C.x0 - .05, C.x1 + .05, -.3, -.04, C.z0 - .05, -.1), 1, 1));
  b.add(M.brass, wuv(bb(-DOOR_W / 2, DOOR_W / 2, -.012, .004, C.z1, -.06), .3, .3));
  for (let i = 0; i < 4; i++) b.add(M.rubber, bb(-DOOR_W / 2, DOOR_W / 2, .0, .0055, C.z1 + .012 + i * .022, C.z1 + .02 + i * .022));
  for (const g of holedWall('x', C.x0 - .04, C.x0, C.z0 - .04, C.z1 + .04, 0, C.h, [[GRILLE.z0, GRILLE.z1, GRILLE.y0, GRILLE.y1]])) b.add(M.teal, wuv(g, 2.4, C.h));
  for (const g of holedWall('x', C.x1, C.x1 + .04, C.z0 - .04, C.z1 + .04, 0, C.h, [])) b.add(M.teal, wuv(g, 2.4, C.h));
  for (const g of holedWall('z', C.z0 - .04, C.z0, C.x0, C.x1, 0, C.h, [])) b.add(M.teal, wuv(g, 2.4, C.h));
  for (const g of holedWall('z', C.z1, C.z1 + .04, C.x0 - .04, C.x1 + .04, 0, C.h, [[-DOOR_W / 2, DOOR_W / 2, -1, DOOR_H]])) b.add(M.teal, wuv(g, 2.4, C.h));
  b.add(M.cream, wuv(bb(C.x0 - .04, C.x1 + .04, C.h, C.h + .06, C.z0 - .04, C.z1 + .04), 1.2, 1.2));
  b.add(M.ironM, wuv(bb(C.x0, C.x1, C.h - .012, C.h, C.z0, C.z0 + .05), 1, 1));
  b.add(M.ironM, wuv(bb(C.x0, C.x1, C.h - .012, C.h, C.z1 - .05, C.z1), 1, 1));
  // grille bars and frame
  for (let z = GRILLE.z0 + .04; z < GRILLE.z1 - .02; z += .072) b.add(M.iron, rod(new V3(C.x0 - .02, GRILLE.y0, z), new V3(C.x0 - .02, GRILLE.y1, z), .0085, 8));
  b.add(M.iron, bb(C.x0 - .035, C.x0 + .012, GRILLE.y0 - .025, GRILLE.y0, GRILLE.z0 - .025, GRILLE.z1 + .025));
  b.add(M.iron, bb(C.x0 - .035, C.x0 + .012, GRILLE.y1, GRILLE.y1 + .025, GRILLE.z0 - .025, GRILLE.z1 + .025));
  b.add(M.iron, bb(C.x0 - .035, C.x0 + .012, GRILLE.y0, GRILLE.y1, GRILLE.z0 - .025, GRILLE.z0));
  b.add(M.iron, bb(C.x0 - .035, C.x0 + .012, GRILLE.y0, GRILLE.y1, GRILLE.z1, GRILLE.z1 + .025));
  b.add(M.iron, rod(new V3(C.x0 - .02, (GRILLE.y0 + GRILLE.y1) / 2, GRILLE.z0), new V3(C.x0 - .02, (GRILLE.y0 + GRILLE.y1) / 2, GRILLE.z1), .007, 6));
  // handrails
  for (const x of [C.x0 + .055, C.x1 - .055]) {
    b.add(M.chrome, rod(new V3(x, .92, C.z0 + .12), new V3(x, .92, C.z1 - .22), .016, 14));
    for (const z of [C.z0 + .2, C.z1 - .3]) b.add(M.chrome, rod(new V3(x, .92, z), new V3(x < 0 ? C.x0 : C.x1, .92, z), .009, 8));
  }
  // ceiling light: caged bulb
  const LZ = (C.z0 + C.z1) / 2;
  b.add(M.chrome, wuv(new THREE.CylinderGeometry(.07, .07, .025, 24).translate(0, C.h - .012, LZ), .2, .2));
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; b.add(M.iron, rod(new V3(Math.cos(a) * .06, C.h - .02, LZ + Math.sin(a) * .06), new V3(Math.cos(a) * .065, C.h - .16, LZ + Math.sin(a) * .065), .003, 4)); }
  for (const y of [C.h - .06, C.h - .11, C.h - .16]) b.add(M.iron, new THREE.TorusGeometry(.064, .003, 4, 24).rotateX(Math.PI / 2).translate(0, y, LZ));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.032, 16, 12), M.bulb); bulb.position.set(0, C.h - .095, LZ); cab.add(bulb); UI3.bulb = bulb;
  UI3.cabLight = new THREE.PointLight(new THREE.Color(1, .62, .32), 1.1, 5, 2); UI3.cabLight.position.set(0, C.h - .2, LZ); cab.add(UI3.cabLight);
  UI3.cabBounce = new THREE.PointLight(new THREE.Color(1, .66, .38), 0, 3.5, 2); UI3.cabBounce.position.set(.2, .9, C.z0 + .4); cab.add(UI3.cabBounce);
  // vent slots
  for (let i = 0; i < 7; i++) b.add(M.rubber, bb(-.3 + i * .1 - .015, -.3 + i * .1 + .015, C.h - .002, C.h + .001, C.z0 + .2, C.z0 + .45));
  // floor indicator: brass strip with lamps above the door (inside)
  const sw = Math.min(1.4, LAMP_COLS * .055), sh = .055 * LAMP_ROWS;
  b.add(M.brass, wuv(new RoundedBoxGeometry(sw + .05, sh + .04, .02, 2, .006).translate(0, 2.29, C.z1 - .01), .2, .2));
  TEX.lamp = ctex(lampC); TEX.lampE = ctex(lampEC);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: TEX.lamp, emissiveMap: TEX.lampE, emissive: new THREE.Color(1, .55, .2), emissiveIntensity: 6, roughness: .2, metalness: 0, envMapIntensity: 1 }));
  strip.position.set(0, 2.29, C.z1 - .0215); strip.rotation.y = Math.PI; cab.add(strip);
  UI3.stripLight = new THREE.PointLight(new THREE.Color(1, .5, .15), .06, .8, 2); UI3.stripLight.position.set(0, 2.25, C.z1 - .12); cab.add(UI3.stripLight);
  // certificate in a frame on the left wall
  b.add(M.ironM, wuv(bb(C.x1 - .018, C.x1, 1.3, 1.72, -1.12, -.8), .2, .2));
  const cert = new THREE.Mesh(new THREE.PlaneGeometry(.28, .38), new THREE.MeshStandardMaterial({ map: certificateTex(), roughness: .85 }));
  cert.position.set(C.x1 - .0195, 1.51, -.96); cert.rotation.y = -Math.PI / 2; cab.add(cert);
  const cg = new THREE.Mesh(new THREE.PlaneGeometry(.3, .4), M.glass); cg.position.set(C.x1 - .021, 1.51, -.96); cg.rotation.y = -Math.PI / 2; cab.add(cg);

  // ---- the button panel on the back wall ----
  const n = FLOORS.length + 1;
  const cols = n <= 16 ? 2 : n <= 36 ? 3 : 4, rows = Math.ceil(n / cols);
  const sp = Math.min(.082, .95 / rows);
  const colW = .135;
  const pw = cols * colW + .06, ph = rows * sp + .44;
  const PX = -.4, PY = .78 + ph / 2, PZ = C.z0 + .002;
  UI3.panel = { x: PX, y: PY, w: pw, h: ph };
  b.add(M.cream, wuv(new RoundedBoxGeometry(pw, ph, .02, 2, .008).translate(PX, PY, PZ + .01), Math.max(pw, .5), ph, PY - ph / 2));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.add(M.chrome, new THREE.CylinderGeometry(.007, .007, .004, 12).rotateX(Math.PI / 2).translate(PX + sx * (pw / 2 - .02), PY + sy * (ph / 2 - .02), PZ + .021));
  const rot = new THREE.Euler(0, 0, 0);
  const labels = ['L', ...FLOORS.map(p => String(p.floor))];
  const gx = (c) => PX - (cols - 1) * colW / 2 + c * colW;
  const top = PY + ph / 2 - .17;
  labels.forEach((lab, i) => {
    // fill column by column from the bottom (L at bottom-left), like a real panel
    const c = Math.floor(i / rows), r = i % rows;
    const x = gx(c) + (c % 2 ? -.018 : .018), y = top - (rows - 1 - r) * sp;
    const f = lab === 'L' ? 0 : +lab;
    makeButton(cab, lab, new V3(x, y, PZ + .02), rot, { type: 'floor', floor: f });
    if (f > 0) {
      const k = FLOORS.findIndex(p => p.floor === f), cell = TEX.stk.cell(k), t = TEX.stk.tex.clone(); t.repeat.set(cell.s, cell.s); t.offset.set(cell.x, cell.y); t.needsUpdate = true;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(.05, .05), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .42, metalness: 0, envMapIntensity: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const sxo = c % 2 ? .05 : -.05;
      s.position.set(x + sxo, y + (rng(f)() - .5) * .01, PZ + .0205); s.rotation.z = (rng(f * 7)() - .5) * .3; s.receiveShadow = true; cab.add(s);
      s.userData.act = { type: 'floor', floor: f }; hot.push(s);
    }
  });
  makeButton(cab, 'ALARM', new V3(PX, PY + ph / 2 - .065, PZ + .02), rot, { type: 'alarm' });
  makeButton(cab, 'OPEN', new V3(PX - pw / 2 + .07, PY - ph / 2 + .085, PZ + .02), rot, { type: 'open' });
  makeButton(cab, 'CLOSE', new V3(PX - pw / 2 + .07, PY - ph / 2 + .17, PZ + .02), rot, { type: 'close' });
  for (const [t, y] of [['OPEN', PY - ph / 2 + .085], ['CLOSE', PY - ph / 2 + .17]]) { const lp = new THREE.Mesh(new THREE.PlaneGeometry(.06, .017), new THREE.MeshStandardMaterial({ map: labelTex(t, '#111', '#e9e3d6'), roughness: .5 })); lp.position.set(PX - pw / 2 + .07, y - .038, PZ + .0205); cab.add(lp); }
  // STOP: a yellow keyed box
  const sbx = PX + pw / 2 - .085, sby = PY - ph / 2 + .12;
  const stop = new THREE.Mesh(wuv(new RoundedBoxGeometry(.11, .12, .05, 3, .012).translate(sbx, sby, PZ + .045), .4, .4), M.yellow); stop.castShadow = stop.receiveShadow = true; cab.add(stop);
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(.05, .014), new THREE.MeshStandardMaterial({ map: labelTex('STOP', '#0d0d0d', '#f2eee4'), roughness: .5 })); sl.position.set(sbx, sby + .036, PZ + .0705); cab.add(sl);
  const key = new THREE.Mesh(new THREE.CylinderGeometry(.013, .015, .012, 24).rotateX(Math.PI / 2), M.chrome); key.position.set(sbx, sby - .008, PZ + .076); cab.add(key);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(.003, .014, .002), M.rubber); slot.position.set(sbx, sby - .008, PZ + .0825); cab.add(slot);
  stop.userData.act = { type: 'stop' }; key.userData.act = { type: 'stop' }; hot.push(stop, key);
  // capacity plate
  const cp = new THREE.Mesh(new THREE.PlaneGeometry(.17, .03), new THREE.MeshStandardMaterial({ map: labelTex('600 KG · 8 PERSONS', '#1a1410', '#d8c08a', 512, 90), roughness: .4, metalness: .3 })); cp.position.set(PX, PY + ph / 2 - .12, PZ + .0205); cab.add(cp);
  // marker scribbles and tape, like a panel people have used for decades
  const [mc, mx] = cv(512, 1024); const mr = rng(77);
  mx.lineCap = 'round';
  labels.forEach((lab, i) => { if (mr() > .45 || lab === 'L') return; const c = Math.floor(i / rows), r = i % rows; const bx = 256 + ((gx(c) + (c % 2 ? -.018 : .018)) - PX) / pw * 512, by = 512 - ((top - (rows - 1 - r) * sp) - PY) / ph * 1024;
    mx.font = `${36 + mr() * 14}px "Comic Sans MS","Segoe Print","Bradley Hand",cursive`; mx.fillStyle = mr() < .6 ? 'rgba(15,15,15,.82)' : 'rgba(20,110,70,.85)'; mx.textAlign = 'center'; mx.textBaseline = 'middle';
    const ox = (c % 2 ? 1 : -1) * 96 + (mr() - .5) * 10; mx.save(); mx.translate(bx + ox, by + (mr() - .5) * 8); mx.rotate((mr() - .5) * .3); mx.fillText(lab, 0, 0); mx.restore(); });
  mx.fillStyle = 'rgba(12,12,12,.9)'; mx.save(); mx.translate(256, 512 - ((top - (rows - 1 - Math.floor(rows / 2)) * sp) - PY) / ph * 1024); mx.rotate(-.04); mx.fillRect(-250, -9, 170, 18); mx.restore();
  const marks = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: ctex(mc), transparent: true, roughness: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  marks.position.set(PX, PY, PZ + .0203); cab.add(marks);
  // ivy: in through the grille, down the wall, round the panel; moss in the corners; a few flowers
  ivy(cab, { origin: new V3(C.x0 + .006, 0, 0), U: new V3(0, 0, 1), V: new V3(0, 1, 0), N: new V3(1, 0, 0), u0: C.z0 + .05, u1: C.z1 - .05, v0: 0, v1: GRILLE.y1 + .2, seed: 61,
    starts: [[GRILLE.z0 + .1, GRILLE.y0 + .02, -1.6, 40], [GRILLE.z0 + .3, GRILLE.y0 + .02, -1.4, 34], [GRILLE.z1 - .1, GRILLE.y1 - .05, -2.0, 30], [C.z0 + .1, .02, 1.5, 34]], leaf: .06, flowers: .04 });
  ivy(cab, { origin: new V3(0, 0, C.z0 + .006), U: new V3(1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, 1), u0: C.x0 + .04, u1: PX - pw / 2 - .005, v0: 0, v1: C.h - .1, seed: 64,
    starts: [[C.x0 + .06, .02, 1.4, 46], [PX - pw / 2 - .05, .02, 1.65, 40], [C.x0 + .3, .02, 1.5, 36]], leaf: .06, flowers: .06 });
  ivy(cab, { origin: new V3(0, 0, C.z0 + .006), U: new V3(1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, 1), u0: PX + pw / 2 + .005, u1: C.x1 - .03, v0: 0, v1: 1.9, seed: 66,
    starts: [[C.x1 - .08, .02, 1.6, 30]], leaf: .055, flowers: .05 });
  moss(cab, new V3(C.x0 + .06, .01, C.z0 + .06), 22, new V3(.1, .01, .1), 71, .045);
  moss(cab, new V3(C.x1 - .06, .01, C.z0 + .06), 16, new V3(.1, .01, .1), 72, .04);
  moss(cab, new V3(C.x0 + .04, .01, -.9), 30, new V3(.05, .01, 1.4), 73, .035);
  moss(cab, new V3(C.x0 - .01, GRILLE.y0 + .005, (GRILLE.z0 + GRILLE.z1) / 2), 26, new V3(.03, .005, .7), 74, .03);
  moss(cab, new V3(PX, PY - ph / 2 - .005, PZ + .02), 10, new V3(pw, .005, .02), 75, .02);
  dryLeaves(cab, C.x0 + .05, C.x1 - .05, C.z0 + .05, C.z1 - .05, 0, 22, 19, true);
  b.build(cab);
  // cab doors
  const dg = (sx) => { const g = new THREE.Group(); const m = new THREE.Mesh(wuv(bb(-.27, .27, 0, DOOR_H, -.015, .015), 2.4, DOOR_H), M.door); m.castShadow = m.receiveShadow = true; g.add(m);
    const e = new THREE.Mesh(bb(sx > 0 ? -.27 : .255, sx > 0 ? -.255 : .27, 0, DOOR_H, -.017, .017), M.rubber); g.add(e);
    cab.add(g); g.position.set(sx * .265, 0, -.1); return g; };
  doors.cabL = dg(-1); doors.cabR = dg(1);
}

function buildLanding() {
  const b = new Bucket(); const L = LAND;
  b.add(M.landTile, wuv(bb(L.x0 - .2, L.x1 + .2, -.08, 0, WALL_Z, L.z1 + .2), 1.2, 1.2));
  b.add(M.ceil, wuv(bb(L.x0 - .2, L.x1 + .2, L.h, L.h + .1, WALL_Z, L.z1 + .2), 2.4, 2.4));
  const WIN = { z0: .95, z1: 2.55, y0: 1.0, y1: 2.6 };
  for (const g of holedWall('x', L.x0 - .2, L.x0, WALL_Z, L.z1, 0, 1.1, [])) b.add(M.landTeal, wuv(g, 2.4, 1.1));
  for (const g of holedWall('x', L.x0 - .2, L.x0, WALL_Z, L.z1, 1.1, L.h, [[WIN.z0, WIN.z1, WIN.y0, WIN.y1]])) b.add(M.landPlaster, wuv(g, 2.4, L.h));
  for (const g of holedWall('x', L.x0 - .2, L.x0, WIN.z0, WIN.z1, 1.0, 1.1, [[WIN.z0, WIN.z1, .99, 1.2]])) b.add(M.landPlaster, g);
  for (const g of holedWall('x', L.x1, L.x1 + .2, WALL_Z, L.z1, 0, 1.1, [])) b.add(M.landTeal, wuv(g, 2.4, 1.1));
  for (const g of holedWall('x', L.x1, L.x1 + .2, WALL_Z, L.z1, 1.1, L.h, [])) b.add(M.landPlaster, wuv(g, 2.4, L.h));
  for (const g of holedWall('z', L.z1, L.z1 + .2, L.x0 - .2, L.x1 + .2, 0, 1.1, [])) b.add(M.landTeal, wuv(g, 2.4, 1.1));
  for (const g of holedWall('z', L.z1, L.z1 + .2, L.x0 - .2, L.x1 + .2, 1.1, L.h, [])) b.add(M.landPlaster, wuv(g, 2.4, L.h));
  b.add(M.ironM, wuv(bb(L.x0, L.x1, 1.08, 1.12, L.z1 - .03, L.z1), .6, .6));
  b.add(M.conc, wuv(bb(L.x0 - .05, L.x0 + .08, .95, 1.0, WIN.z0 - .04, WIN.z1 + .04), .5, .5));
  for (let i = 0; i <= 3; i++) { const z = lerp(WIN.z0, WIN.z1, i / 3); b.add(M.ironM, bb(L.x0 - .14, L.x0 - .09, WIN.y0, WIN.y1, z - .022, z + .022)); }
  for (const y of [WIN.y0 + .02, 1.55, 2.08, WIN.y1 - .02]) b.add(M.ironM, bb(L.x0 - .14, L.x0 - .09, y - .02, y + .02, WIN.z0, WIN.z1));
  for (let i = 0; i < 9; i++) b.add(M.iron, rod(new V3(L.x0 - .05, WIN.y0, lerp(WIN.z0, WIN.z1, (i + .5) / 9)), new V3(L.x0 - .05, WIN.y1, lerp(WIN.z0, WIN.z1, (i + .5) / 9)), .008, 6));
  b.add(M.landTeal, wuv(bb(L.x0 - .2, SHAFT.x0 - .2, 0, L.h, 0, WALL_Z), 2.4, L.h));
  // architrave on the landing side
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, -DOOR_W / 2, 0, DOOR_H + .12, WALL_Z, WALL_Z + .05), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(DOOR_W / 2, DOOR_W / 2 + .12, 0, DOOR_H + .12, WALL_Z, WALL_Z + .05), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, DOOR_W / 2 + .12, DOOR_H, DOOR_H + .14, WALL_Z, WALL_Z + .05), .5, .5, DOOR_H));
  b.add(M.brass, wuv(bb(-DOOR_W / 2, DOOR_W / 2, -.01, .008, 0, WALL_Z + .03), .3, .3));
  // pendant lamp
  b.add(M.iron, rod(new V3(0, L.h, 1.7), new V3(0, 2.62, 1.7), .006, 6));
  const shade_ = new THREE.Mesh(new THREE.CylinderGeometry(.05, .17, .14, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x2c4a3f, roughness: .45, metalness: .6, side: THREE.DoubleSide }));
  shade_.position.set(0, 2.56, 1.7); shade_.castShadow = true; landing.add(shade_);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.04, 16, 12), M.bulb); bulb.position.set(0, 2.52, 1.7); landing.add(bulb);
  const pl = new THREE.PointLight(new THREE.Color(1, .6, .3), 2.4, 7, 2); pl.position.set(0, 2.42, 1.7); landing.add(pl); UI3.landLight = pl;
  // decals: the painted wall, and the project's sticker slapped on the right wall
  TEX.land = ctex(landC); TEX.landS = ctex(landSC);
  const dec = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.45), new THREE.MeshStandardMaterial({ map: TEX.land, transparent: true, roughness: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  dec.position.set(0, 1.72, L.z1 - .004); dec.rotation.y = Math.PI; dec.receiveShadow = true; landing.add(dec);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(.34, .34), new THREE.MeshStandardMaterial({ map: TEX.landS, transparent: true, roughness: .42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  st.position.set(L.x1 - .004, 1.5, 1.55); st.rotation.y = -Math.PI / 2; st.rotation.z = .08; st.receiveShadow = true; landing.add(st);
  dec.userData.act = { type: 'visit' }; st.userData.act = { type: 'visit' }; hot.push(dec, st);
  // ivy and moss on the landing
  ivy(landing, { origin: new V3(L.x0 + .005, 0, 0), U: new V3(0, 0, 1), V: new V3(0, 1, 0), N: new V3(1, 0, 0), u0: WALL_Z + .1, u1: L.z1 - .1, v0: 0, v1: L.h - .1, seed: 81,
    starts: [[WIN.z0 - .1, .02, 1.5, 60], [WIN.z1 + .15, .02, 1.6, 50], [WIN.z0 + .2, WIN.y1 + .05, .3, 30]], leaf: .07, flowers: .04 });
  ivy(landing, { origin: new V3(0, 0, L.z1 - .006), U: new V3(-1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, -1), u0: -L.x1 + .05, u1: L.x1 - .05, v0: 0, v1: 1.0, seed: 84,
    starts: [[-L.x1 + .1, .02, 1.3, 30], [L.x1 - .2, .02, 1.7, 26]], leaf: .065, flowers: .05 });
  ivy(landing, { origin: new V3(0, 0, WALL_Z + .052), U: new V3(-1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, 1), u0: -L.x1 + .03, u1: -DOOR_W / 2 - .14, v0: 0, v1: L.h - .1, seed: 86,
    starts: [[-L.x1 + .2, .02, 1.5, 50]], leaf: .065 });
  moss(landing, new V3(L.x0 + .06, .01, 1.7), 40, new V3(.1, .01, 2.6), 91, .045);
  moss(landing, new V3(0, .01, L.z1 - .06), 30, new V3(3, .01, .1), 92, .04);
  moss(landing, new V3(L.x0 + .02, 1.005, (WIN.z0 + WIN.z1) / 2), 26, new V3(.08, .01, 1.5), 93, .035);
  dryLeaves(landing, L.x0 + .1, L.x1 - .1, WALL_Z + .1, L.z1 - .1, 0, 60, 29, true);
  b.build(landing);
  const dg = (sx) => { const g = new THREE.Group(); const m = new THREE.Mesh(wuv(bb(-.27, .27, 0, DOOR_H, 0, .035), 2.4, DOOR_H), M.door); m.castShadow = m.receiveShadow = true; g.add(m);
    const e = new THREE.Mesh(bb(sx > 0 ? -.27 : .255, sx > 0 ? -.255 : .27, 0, DOOR_H, -.002, .037), M.rubber); g.add(e); landing.add(g); g.position.set(sx * .265, 0, .035); return g; };
  doors.landL = dg(-1); doors.landR = dg(1);
}
function dressLanding(f) {
  const p = BY_FLOOR.get(f); if (!p) { landing.visible = false; return; }
  landing.position.set(0, f * H, 0); landing.visible = true;
  const r = rng(hashStr(p.name) + f);
  const hue = r(), tint = new THREE.Color().setHSL(hue, .35 + r() * .3, .5);
  drawLanding(p, hue); TEX.land.needsUpdate = true; TEX.landS.needsUpdate = true;
  M.landTeal.color.copy(new THREE.Color(1, 1, 1).lerp(tint.clone().multiplyScalar(2.0), .3));
  M.landPlaster.color.copy(new THREE.Color(1, 1, 1).lerp(new THREE.Color().setHSL(hue, .45, .6).multiplyScalar(1.7), .22).multiplyScalar(.92));
  M.landTile.color.copy(new THREE.Color(1, 1, 1).lerp(new THREE.Color().setHSL(hue, .3, .6).multiplyScalar(1.6), .18));
}

/* ---- motes: dust that only shows where the sun cuts through ---- */
function motes(parent, n, box, seed) {
  const r = rng(seed); const pos = new Float32Array(n * 3), sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = lerp(box[0], box[1], r()); pos[i * 3 + 1] = lerp(box[2], box[3], r()); pos[i * 3 + 2] = lerp(box[4], box[5], r()); sd[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tShadow: MOTE_U.tShadow, uShadowMat: MOTE_U.uShadowMat, uTime: MOTE_U.uTime, uCol: MOTE_U.uCol, uScale: MOTE_U.uScale, uBox: { value: new THREE.Vector3(box[1] - box[0], box[3] - box[2], box[5] - box[4]) }, uMin: { value: new V3(box[0], box[2], box[4]) } },
    vertexShader: /* glsl */`
    attribute float aSeed; uniform sampler2D tShadow; uniform mat4 uShadowMat; uniform float uTime, uScale; uniform vec3 uBox, uMin;
    varying float vLit; varying float vA;
    ${PACK}
    void main(){
      vec3 p = position + vec3(sin(uTime*.13 + aSeed*40.)*.18, uTime*(.006 + aSeed*.01) + sin(uTime*.21 + aSeed*17.)*.12, cos(uTime*.11 + aSeed*23.)*.18);
      p = uMin + mod(p - uMin, uBox);
      vec4 w = modelMatrix*vec4(p, 1.);
      vec4 sc = uShadowMat*w; float lit = 0.;
      if (sc.x > 0. && sc.x < 1. && sc.y > 0. && sc.y < 1. && sc.z < 1.) lit = step(sc.z, unpackDepth(texture2D(tShadow, sc.xy)) + .002);
      vLit = lit; vA = .4 + .6*fract(aSeed*7.3);
      vec4 mv = viewMatrix*w; gl_Position = projectionMatrix*mv;
      gl_PointSize = uScale*(1.2 + 2.2*fract(aSeed*13.1))/max(-mv.z, .1);
    }`,
    fragmentShader: /* glsl */`
    uniform vec3 uCol; varying float vLit; varying float vA;
    void main(){ vec2 c = gl_PointCoord - .5; float d = dot(c,c); float a = exp(-d*18.)*vLit*vA; if (a < .002) discard; gl_FragColor = vec4(uCol*a, 1.); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; parent.add(pts); return pts;
}
const MOTE_U = { tShadow: { value: null }, uShadowMat: { value: new THREE.Matrix4() }, uTime: { value: 0 }, uCol: { value: new V3(1.6, 1.15, .7) }, uScale: { value: 30 } };

/* ---- hanging moss: cut-out curtains from textures/hanging-moss.webp (4 cells), with strand-shaped shadows ---- */
const MOSS_CELLS = [[0.10449, 0.5, 0.29102, 0.5, 0.582], [0.60547, 0.5, 0.28857, 0.5, 0.5771], [0.09473, 0.0, 0.31006, 0.5, 0.6201], [0.58691, 0.0, 0.32568, 0.5, 0.6514]];
const mossCards = new Map();      // parent -> [{ p, ry, h, cell, flip, tilt }]
function hang(parent, x, y, z, ry, h, seed) {
  const r = rng(seed); const list = mossCards.get(parent) || []; mossCards.set(parent, list);
  list.push({ p: new V3(x, y, z), ry: ry + (r() - .5) * .25, h: h * (.85 + r() * .3), cell: Math.floor(r() * 4), flip: r() < .5, tilt: (r() - .5) * .12 });
  if (r() < .7) list.push({ p: new V3(x + (r() - .5) * .1, y, z + (r() - .5) * .1), ry: ry + .9 + r() * .5, h: h * (.6 + r() * .25), cell: Math.floor(r() * 4), flip: r() < .5, tilt: (r() - .5) * .12 });
}
function buildMoss() {
  const tex = new THREE.TextureLoader().load('textures/hanging-moss.webp', () => { for (const m of mossMeshes) m.visible = true; }, undefined, () => console.warn('Hanging moss texture not loaded'));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, MAX_ANISO);
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: .4, side: THREE.DoubleSide, roughness: .95, metalness: 0, envMapIntensity: .3, color: new THREE.Color(1.1, 1.08, .95) });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .4 });
  const mossMeshes = [];
  for (const [parent, list] of mossCards) {
    const geos = list.map(c => {
      const [u0, v0, uw, vh, asp] = MOSS_CELLS[c.cell]; const w = c.h * asp;
      const g = new THREE.PlaneGeometry(w, c.h); g.translate(0, -c.h / 2, 0);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const uu = c.flip ? 1 - uv.getX(i) : uv.getX(i); uv.setXY(i, u0 + uu * uw, v0 + uv.getY(i) * vh); }
      g.rotateX(c.tilt); g.rotateY(c.ry); g.translate(c.p.x, c.p.y, c.p.z); return g;
    });
    const m = new THREE.Mesh(mergeGeometries(geos), mat); m.customDepthMaterial = depth; m.castShadow = true; m.receiveShadow = true; m.visible = false;
    parent.add(m); mossMeshes.push(m);
  }
}
function placeMoss() {
  const L = LOBBY, C = CAB, D_ = LAND;
  for (let i = 0; i < 6; i++) hang(world, -2.55, 2.97, .8 + i * 1.08, Math.PI / 2, .9 + (i % 3) * .25, 500 + i);               // along the ceiling pipe
  for (let i = 0; i < 4; i++) hang(world, L.x0 + .12, L.h - .02, 1.5 + i * 1.25, Math.PI / 2, .75 + (i % 2) * .3, 520 + i);  // over the big window
  hang(world, -1.3, L.h - .02, WALL_Z + .07, 0, .85, 530); hang(world, 1.45, L.h - .02, WALL_Z + .07, 0, .8, 531);            // upper corners of the lift wall
  hang(world, 2.9, L.h - .02, 2.2, Math.PI / 2, .7, 532);
  hang(cab, C.x0 + .07, C.h - .03, -1.25, Math.PI / 2, .5, 540); hang(cab, C.x0 + .07, C.h - .03, -.82, Math.PI / 2, .42, 541);   // under the ceiling by the grille
  hang(cab, -.72, C.h - .03, C.z0 + .06, 0, .45, 542);
  hang(landing, D_.x0 + .1, D_.h - .02, 1.25, Math.PI / 2, .8, 550); hang(landing, D_.x0 + .1, D_.h - .02, 2.2, Math.PI / 2, .7, 551);  // over the landing window
  hang(landing, -1.35, D_.h - .02, D_.z1 - .05, 0, .55, 552); hang(landing, 1.35, D_.h - .02, D_.z1 - .05, 0, .5, 553);
}
async function buildScene(progress) {
  await loadFonts();
  await preloadStickerImages();
  await buildMaterials(progress);
  progress('Hanging the ivy…');
  scene.environment = envMap();
  TEX.btn = buttonAtlas(); TEX.stk = stickerAtlas();
  buildLobby(); buildShaft(); buildCab(); buildLanding();
  // vines + instanced foliage per parent
  const leafGeo = leafGeometry(), mossGeo = mossGeometry(), flGeo = flowerGeometry();
  for (const parent of [world, cab, landing]) {
    const vg = vineGeos.get(parent); if (vg && vg.length) { const m = new THREE.Mesh(mergeGeometries(vg.map(prep)), M.vine); m.castShadow = true; m.receiveShadow = true; parent.add(m); }
    instance(parent, leafGeo, M.leaf, leafM, leafC, true);
    instance(parent, leafGeo, M.dry, dryM, dryC, false);
    instance(parent, mossGeo, M.moss, mossM, mossC, false);
    instance(parent, flGeo, M.flower, flowerM, null, false);
  }
  scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o !== sky) o.receiveShadow = true; });
  // signage stays crisp in the painted looks: every canvas-drawn surface except the ivy leaves
  scene.traverse(o => { const m = o.material; if (m && !Array.isArray(m) && m.map && m.map.isCanvasTexture && m !== M.leaf && m !== M.dry) keepSharp(m); });
  placeMoss(); buildMoss();
  motes(world, 900, [LOBBY.x0 + .1, LOBBY.x1 - .1, .05, LOBBY.h - .1, WALL_Z + .05, LOBBY.z1 - .1], 5);
  motes(cab, 260, [CAB.x0 + .02, CAB.x1 - .02, .05, CAB.h - .05, CAB.z0 + .02, CAB.z1 - .02], 6);
  motes(landing, 260, [LAND.x0 + .05, LAND.x1 - .05, .05, LAND.h - .1, WALL_Z + .05, LAND.z1 - .1], 7);
}
