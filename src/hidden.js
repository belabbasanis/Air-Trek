
/* ======================================================================
   THE HIDDEN LIFT: press the lobby call button five times in a row.
   Lightning and a flash, the music cuts, the dial spins like it is broken and the lanterns chase
   while something comes down the shaft. The doors open on a cab of robed mages (low-poly, pixel
   textures, green smoke) and the track comes up with the doors. Nobody gets in: after 7.5 s the
   doors close and it goes back down the same way.
   ====================================================================== */
const HIDDEN = { taps: 5, tapWindow: 2.6, hold: 7.5, travel: 3.6, track: 'audio/hidden-lift.mp3', gain: .9 };
const HID = { active: false, stage: '', t: 0, taps: [], spin: 0, chase: false, bolts: 0, wiz: null, smoke: null, light: null, mages: [] };

/* ---- low-res pixel textures: nearest filtering, no mipmaps, the way old consoles drew them ---- */
function pixTex(w, h, draw) {
  const [c, x] = cv(w, h); draw(x, w, h);
  const t = ctex(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.anisotropy = 1; return t;
}
function pixNoise(x, w, h, base, spread, r) {
  const b = new THREE.Color(base);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (r() - .5) * spread; x.fillStyle = `rgb(${clamp(b.r * 255 + k * 255, 0, 255) | 0},${clamp(b.g * 255 + k * 230, 0, 255) | 0},${clamp(b.b * 255 + k * 255, 0, 255) | 0})`; x.fillRect(i, j, 1, 1); }
}
function robeTex(seed, base) {
  const r = rng(seed);
  return pixTex(16, 32, (x, w, h) => {
    pixNoise(x, w, h, base, .12, r);
    for (let i = 0; i < 5; i++) { const fx = Math.floor(r() * w); x.fillStyle = 'rgba(10,6,14,.45)'; x.fillRect(fx, 0, 1, h); }                  // folds
    for (let i = 0; i < 7; i++) { x.fillStyle = r() < .5 ? 'rgba(112,118,58,.75)' : 'rgba(150,150,96,.6)'; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 3)); }   // mould and wear
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(190,170,210,.5)'; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1); }
  });
}

/* ---- one mage: robe, capelet, pointed hood bent forward, sleeves, rope belt; optional face, beard, cigarette and staff ---- */
function mage({ seed = 1, robe = 0x4b3756, height = 1, staff = null, face = false, bow = 0 }) {
  const r = rng(seed), g = new THREE.Group();
  const flat = (o) => new THREE.MeshStandardMaterial({ roughness: .9, metalness: 0, flatShading: true, ...o });   // setValues turns hex numbers into Colors
  const robeM = flat({ map: robeTex(seed, robe), emissive: robe, emissiveIntensity: .12 }), darkM = flat({ color: 0x050407 }), skinM = flat({ map: pixTex(8, 8, (x, w, h) => pixNoise(x, w, h, 0xa9bf6a, .14, r)) });
  const ropeM = flat({ color: 0x6f7a3a }), woodM = flat({ map: pixTex(4, 16, (x, w, h) => pixNoise(x, w, h, 0x8a6a3a, .16, r)) });
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.3, 0], [.28, .3], [.2, .85], [.19, 1.05], [.22, 1.3], [.25, 1.42], [.12, 1.55], [0, 1.56]].map(p => new THREE.Vector2(p[0], p[1])), 7), robeM);
  g.add(body);
  const cape = new THREE.Mesh(new THREE.CylinderGeometry(.13, .36, .36, 7, 1, true), robeM); cape.position.y = 1.37; g.add(cape);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(.195, .025, 3, 7), ropeM); belt.rotation.x = Math.PI / 2; belt.position.y = .98; g.add(belt);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(.06, .2, .04), ropeM); knot.position.set(.05, .86, .19); knot.rotation.z = .2; g.add(knot);
  // hood: a six-sided cone, its tip a second cone bent forward
  const hood = new THREE.Group(); hood.position.set(0, 1.52, 0); hood.rotation.x = bow; g.add(hood);
  const h1 = new THREE.Mesh(new THREE.CylinderGeometry(.09, .23, .42, 6), robeM); h1.position.y = .2; hood.add(h1);
  const h2 = new THREE.Mesh(new THREE.ConeGeometry(.09, .3, 6), robeM); h2.position.set(0, .5, -.05); h2.rotation.x = -.5; hood.add(h2);
  const h3 = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 5), robeM); h3.position.set(0, .66, .05); h3.rotation.x = .9; hood.add(h3);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.12, 6), darkM); hole.position.set(0, .16, .175); hole.rotation.x = -.15; hood.add(hole);
  // sleeves and hands: one hand forward at the waist or raised on a staff
  const arm = (side, raise) => {
    const a = new THREE.Group(); a.position.set(side * .25, 1.36, .02); a.rotation.set(-.5 - raise, 0, side * .18); g.add(a);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(.06, .11, .58, 6), robeM); sl.position.y = -.27; a.add(sl);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(.08, .1, .08), skinM); hand.position.y = -.6; a.add(hand);
    return { a, hand };
  };
  const L = arm(-1, staff && staff.side < 0 ? staff.raise : 0), R = arm(1, staff && staff.side > 0 ? staff.raise : face ? 1.85 : 0);
  if (staff) {
    const hold = staff.side > 0 ? R : L; const st = new THREE.Group(); hold.hand.add(st); st.rotation.x = .5 + staff.raise; st.position.y = -staff.raise * .55;   // stand the staff upright in the hand
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.022, .026, 1.95, 5), woodM); pole.position.y = .25; st.add(pole);
    const top = new THREE.Group(); top.position.y = 1.28; st.add(top);
    if (staff.kind === 'orb') { const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), flat({ color: 0x8a6ae8, emissive: 0x7a4cff, emissiveIntensity: 1.6 })); top.add(orb); orb.userData.glow = 1; HID.mages.push(orb); const claw = new THREE.Mesh(new THREE.ConeGeometry(.05, .12, 4), woodM); claw.position.y = -.1; claw.rotation.x = Math.PI; top.add(claw); }
    else { const frame = new THREE.Mesh(new THREE.TorusGeometry(.12, .03, 4, 8), flat({ color: 0xd9c25a, emissive: 0x6a5a18, emissiveIntensity: .5 })); top.add(frame);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.07, 0), flat({ color: 0x2bd27a, emissive: 0x22ff77, emissiveIntensity: 1.2 })); top.add(gem); gem.userData.glow = 1; HID.mages.push(gem);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(.035, .03, .14, 6), flat({ color: 0xd9c25a, emissive: 0x6a5a18, emissiveIntensity: .5 })); neck.position.y = -.17; top.add(neck); }
  }
  if (face) {
    // the one at the front: hood up, face out, grey beard, a cigarette at his lips
    hole.visible = false;
    const head = new THREE.Mesh(new THREE.BoxGeometry(.2, .22, .14), skinM); head.position.set(0, .14, .12); hood.add(head);
    const brow = flat({ color: 0x1a1a12 });
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.075, .02, .02), brow); b.position.set(s * .05, .2, .195); b.rotation.z = s * -.35; hood.add(b);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(.04, .014, .01), darkM); eye.position.set(s * .048, .17, .195); hood.add(eye); }
    const beardM = flat({ map: pixTex(8, 16, (x, w, h) => pixNoise(x, w, h, 0xa3a69c, .2, r)) });
    const beard = new THREE.Mesh(new THREE.ConeGeometry(.13, .5, 5), beardM); beard.position.set(0, -.18, .17); beard.rotation.x = Math.PI + .25; hood.add(beard);
    const stache = new THREE.Mesh(new THREE.BoxGeometry(.16, .035, .04), beardM); stache.position.set(0, .085, .2); hood.add(stache);
    const cig = new THREE.Group(); cig.position.set(.07, .07, .22); cig.rotation.set(0, -.5, -.15); hood.add(cig);
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .09, 5), flat({ color: 0xe9e4d6 })); paper.rotation.z = Math.PI / 2; paper.position.x = .045; cig.add(paper);
    const ember = new THREE.Mesh(new THREE.BoxGeometry(.016, .018, .018), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.4, .3) })); ember.position.x = .092; cig.add(ember);
    HID.ember = ember;
    // hand up to the mouth: point the arm from the shoulder at the cigarette, shorten the sleeve to a bent forearm
    R.a.rotation.set(0, 0, 0); R.a.quaternion.setFromUnitVectors(new V3(0, -1, 0), new V3(-.17, .3, .24).normalize());
    R.hand.position.y = -.4; const sl = R.a.children[0]; sl.scale.y = .64; sl.position.y = -.19;
  }
  g.scale.setScalar(height); return g;
}

/* ---- the cab they ride in: pale green steel with tags, chequer floor, a light box overhead, handrails ---- */
function wizWallTex(side) {
  const r = rng(side ? 902 : 901);
  return pixTex(192, 160, (x, W, Hh) => {
    pixNoise(x, W, Hh, 0xb3bfae, .05, r);
    x.fillStyle = 'rgba(60,70,58,.35)'; for (const px of [W * .33, W * .66]) x.fillRect(px | 0, 0, 1, Hh);    // panel seams
    for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(40,46,36,${.05 + r() * .12})`; x.fillRect(r() * W | 0, r() * Hh | 0, 1 + r() * 3 | 0, 2 + r() * 10 | 0); }
    const tag = (t_, font, px, py, col, rot, stroke) => { x.save(); x.translate(px, py); x.rotate(rot); x.font = font; if (stroke) { x.lineWidth = stroke; x.strokeStyle = '#151515'; x.strokeText(t_, 0, 0); } x.fillStyle = col; x.fillText(t_, 0, 0); x.restore(); };
    const drips = (x0, x1, y, n, col) => { x.fillStyle = col; for (let i = 0; i < n; i++) x.fillRect(x0 + r() * (x1 - x0) | 0, y, 1, 3 + r() * 14 | 0); };
    if (side) { tag('MAGI', '400 44px "Sedgwick Ave Display","Permanent Marker",Impact', 18, 52, '#3f8f96', -.12, 3); drips(20, 120, 50, 14, '#2b6b70');
      tag('24', '400 40px "Permanent Marker",Impact', 120, 112, '#b0362e', .1); drips(122, 160, 108, 6, '#8e2a24');
      tag('the deep', '400 22px "Permanent Marker",Impact', 30, 146, '#2f9a3c', -.05); }
    else { tag('HEX', '400 46px "Sedgwick Ave Display","Permanent Marker",Impact', 22, 58, '#161616', .08); drips(24, 110, 54, 16, '#161616');
      tag('omen', '400 30px "Permanent Marker",Impact', 40, 112, '#3a64b0', -.08); drips(40, 110, 108, 8, '#2c4e8e');
      tag('↯', '400 30px "Permanent Marker",Impact', 140, 90, '#161616', 0); }
  });
}
function buildHidden() {
  const C = CAB, g = new THREE.Group(); g.visible = false; world.add(g); HID.wiz = g;
  const wallM = (side) => new THREE.MeshStandardMaterial({ map: wizWallTex(side), roughness: .75, metalness: .1 });
  const plain = new THREE.MeshStandardMaterial({ map: pixTex(32, 32, (x, w, h) => pixNoise(x, w, h, 0xaab6a4, .05, rng(905))), roughness: .7, metalness: .1 });
  const floor = new THREE.MeshStandardMaterial({ roughness: .55, metalness: 0, map: pixTex(32, 32, (x, w, h) => { const r = rng(906); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dark = ((i >> 4) + (j >> 4)) % 2; const v = (dark ? 26 : 214) + (r() - .5) * 26; x.fillStyle = `rgb(${v | 0},${v | 0},${(v - 6) | 0})`; x.fillRect(i, j, 1, 1); } }) });
  floor.map.wrapS = floor.map.wrapT = THREE.RepeatWrapping; floor.map.repeat.set(2.1, 2.1);
  const W = C.x1 - C.x0, Dp = C.z1 - C.z0, cz = (C.z0 + C.z1) / 2;
  const add = (geo, m, x, y, z, ry = 0, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); g.add(o); return o; };
  add(new THREE.PlaneGeometry(W, Dp), floor, 0, .001, cz, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(Dp, C.h), wallM(0), C.x0 + .002, C.h / 2, cz, Math.PI / 2);
  add(new THREE.PlaneGeometry(Dp, C.h), wallM(1), C.x1 - .002, C.h / 2, cz, -Math.PI / 2);
  // back: a second pair of doors with the vent over them
  add(new THREE.PlaneGeometry(W, C.h), plain, 0, C.h / 2, C.z0 + .002);
  const seam = new THREE.MeshBasicMaterial({ color: 0x2a2f28 });
  add(new THREE.PlaneGeometry(.012, 2.0), seam, 0, 1.0, C.z0 + .004); add(new THREE.PlaneGeometry(1.1, .012), seam, 0, 2.0, C.z0 + .004);
  add(new THREE.PlaneGeometry(.36, .1), new THREE.MeshBasicMaterial({ color: 0x080908 }), 0, 2.2, C.z0 + .004);
  // ceiling with the light box
  add(new THREE.PlaneGeometry(W, Dp), new THREE.MeshStandardMaterial({ color: 0x5d665a, roughness: .8 }), 0, C.h - .002, cz, 0, Math.PI / 2);
  add(new THREE.PlaneGeometry(W * .7, Dp * .6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.7, 2.3) }), 0, C.h - .006, cz, 0, Math.PI / 2);
  // handrails and the little red indicator
  const railM = new THREE.MeshStandardMaterial({ color: 0xc8ccc2, metalness: .8, roughness: .35 });
  for (const s of [-1, 1]) { const x0 = s > 0 ? C.x1 - .05 : C.x0 + .05; const rail = add(new THREE.CylinderGeometry(.018, .018, Dp - .2, 6), railM, x0, .92, cz, 0, Math.PI / 2);
    for (const z of [C.z0 + .18, C.z1 - .18]) add(new THREE.BoxGeometry(.05, .02, .02), railM, x0 + s * .02, .92, z); }
  const led = add(new THREE.PlaneGeometry(.12, .16), new THREE.MeshBasicMaterial({ color: 0x120404 }), C.x1 - .004, 1.62, C.z1 - .35, -Math.PI / 2);
  const ledT = new THREE.Mesh(new THREE.PlaneGeometry(.08, .1), new THREE.MeshBasicMaterial({ map: pixTex(8, 10, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, 8, 10); x.fillStyle = '#ff2a1a'; x.fillRect(1, 1, 1, 8); x.fillRect(1, 8, 4, 1); x.fillRect(5, 1, 1, 3); x.fillRect(4, 3, 3, 1); }), color: new THREE.Color(2.5, 2.5, 2.5) }));
  ledT.position.z = .001; led.add(ledT);
  // five of them, packed in: the smoker at the front, two either side with staffs, two behind
  const M_ = [
    [mage({ seed: 11, robe: 0x6a4c7c, face: true, height: .98 }), .02, -.52, 0],
    [mage({ seed: 12, robe: 0x6e5284, staff: { side: -1, raise: .25, kind: 'orb' }, height: 1.0, bow: .12 }), -.5, -.86, .25],
    [mage({ seed: 13, robe: 0x634878, staff: { side: 1, raise: .2, kind: 'gem' }, height: 1.02, bow: .1 }), .5, -.82, -.25],
    [mage({ seed: 14, robe: 0x5a4270, height: 1.04, bow: .08 }), -.1, -1.42, .05],
    [mage({ seed: 15, robe: 0x684d7e, staff: { side: 1, raise: 1.0, kind: 'gem' }, height: 1.0, bow: .15 }), .38, -1.3, -.15],
  ];
  HID.bodies = M_.map(([m, x, z, ry]) => { m.position.set(x, 0, z); m.rotation.y = ry; g.add(m); m.userData.base = ry; return m; });
  HID.light = new THREE.PointLight(new THREE.Color(.82, 1, .84), 0, 5, 1.2);
  HID.glow = new THREE.PointLight(new THREE.Color(.35, 1, .45), 0, 1.6, 1.5); world.add(HID.glow);   // green off the smoke, on the smoker's face
  HID.light.position.set(0, 2.25, cz); world.add(HID.light);   // lights live outside the hidden group: a light appearing would recompile every material
  // green smoke: square points, additive, rising and curling from the cigarette
  const N = 220, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: .034, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  pts.frustumCulled = false; g.add(pts);
  HID.smoke = { pts, pos, col, N, p: Array.from({ length: N }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, age: 9, life: 1, seed: Math.random() * 6 })), next: 0, i: 0 };
  // lightning: ribbons on the lobby wall round the doors, rebuilt every flicker
  HID.boltM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.6, 4.2), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  HID.boltMesh = new THREE.Mesh(new THREE.BufferGeometry(), HID.boltM); HID.boltMesh.visible = false; HID.boltMesh.frustumCulled = false; world.add(HID.boltMesh);
}
function boltGeometry() {
  const P_ = [], r = Math.random, z = WALL_Z + .03;
  const bolt = (x0, y0, x1, y1, w, depth) => {
    const n = 9, pts = []; for (let i = 0; i <= n; i++) { const k = i / n, j = i === 0 || i === n ? 0 : (r() - .5) * .28; pts.push([x0 + (x1 - x0) * k + j, y0 + (y1 - y0) * k + (r() - .5) * .05]); }
    for (let i = 0; i < n; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w, ny = dx / l * w;
      P_.push(ax - nx, ay - ny, z, ax + nx, ay + ny, z, bx + nx, by + ny, z, ax - nx, ay - ny, z, bx + nx, by + ny, z, bx - nx, by - ny, z);
      if (depth < 2 && r() < .22) { const a = (r() - .5) * 1.6; bolt(bx, by, bx + Math.sin(a) * .5, by - Math.cos(a) * .4, w * .6, depth + 1); } }
  };
  const top = LOBBY.h - .05;
  bolt(-.2 - r() * .6, top, -DOOR_W / 2 - .05, DOOR_H + .1, .012, 0);
  bolt(.3 + r() * .6, top, DOOR_W / 2 + .05, DOOR_H + .05, .012, 0);
  bolt(-DOOR_W / 2 - .1, DOOR_H, -DOOR_W / 2 - .25 - r() * .3, .2 + r() * .4, .009, 1);
  bolt(DOOR_W / 2 + .1, DOOR_H - .2, DOOR_W / 2 + .2 + r() * .3, .3 + r() * .4, .009, 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P_, 3)); return g;
}

/* ---- sound: thunder at the flash, the track rising with the doors ---- */
function sfxThunder() {
  if (!A.ctx) return; const t = now_();
  noiseHit(t, 'highpass', 2400, .7, .35, .12); noiseHit(t + .02, 'bandpass', 900, .8, .3, .5);
  noiseHit(t + .05, 'lowpass', 180, .7, .9, 2.8); noiseHit(t + .4, 'lowpass', 120, .7, .6, 3.2); thump(t, 70, 28, .6, 1.4);
}
function startHiddenTrack(dur) {
  if (!A.ctx || !A.smp.hidden) return;
  const ctx = A.ctx, t = now_();
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(260, t); lp.frequency.exponentialRampToValueAtTime(18000, t + dur); lp.connect(A.master);
  const { s, g } = playBuf(A.smp.hidden, t, { gain: 0, dest: lp });
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(HIDDEN.gain, t + dur);
  HID.track = { s, g, lp };
}
function stopHiddenTrack(dur) {
  const k = HID.track; if (!k || !A.ctx) return; const t = now_();
  k.g.gain.cancelScheduledValues(t); k.g.gain.setValueAtTime(k.g.gain.value, t); k.g.gain.linearRampToValueAtTime(0, t + dur);
  k.lp.frequency.cancelScheduledValues(t); k.lp.frequency.setValueAtTime(k.lp.frequency.value, t); k.lp.frequency.exponentialRampToValueAtTime(300, t + dur);
  k.s.stop(t + dur + .1); HID.track = null;
}

/* ---- the sequence ---- */
function hiddenTap() {
  if (HID.active) return true;
  const t = performance.now() / 1000; HID.taps = HID.taps.filter(x => t - x < HIDDEN.tapWindow); HID.taps.push(t);
  if (HID.taps.length < HIDDEN.taps) return false;
  HID.taps = [];
  if (D.state !== 'play' || lift.floor !== 0 || lift.phase === 'riding' || lift.phase === 'arrived' || P.pos.z < WALL_Z + .05 || inCab()) return false;
  startHidden(); return true;
}
function startHidden() {
  HID.active = true; HID.stage = 'flash'; HID.t = 0; HID.bolts = .75; HID.flashed = 0;
  const f = $('flash'); f.style.transition = 'none'; f.style.opacity = RM ? '.35' : '1';
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity 1.1s ease-out'; f.style.opacity = '0'; }));
  sfxThunder(); hideVisit(); caption('', .01);
  if (lift.doors > 0) doorsTo(0);
}
function setStage(s) { HID.stage = s; HID.t = 0; }
function hiddenTick(dt, time) {
  if (!HID.wiz) return;
  // lightning flicker for the first moments
  if (HID.bolts > 0) {
    HID.bolts -= dt; const on = HID.bolts > 0 && (RM ? HID.bolts > .55 : Math.floor(HID.bolts * 3.6) % 2 === 0);
    if (on && !HID.boltMesh.visible) { HID.boltMesh.geometry.dispose(); HID.boltMesh.geometry = boltGeometry(); }
    HID.boltMesh.visible = on; UI3.lanternLight.color.setRGB(.75, .85, 1); UI3.lanternLight.distance = 9; UI3.lanternLight.intensity = on ? 14 : 0;
    if (HID.bolts <= 0) { HID.boltMesh.visible = false; UI3.lanternLight.color.setRGB(1, .5, .15); UI3.lanternLight.distance = 1.6; }
  }
  if (!HID.active) return;
  HID.t += dt;
  switch (HID.stage) {
    case 'flash': if (lift.phase === 'closed' && HID.t > .9) { setStage('down'); liftStartSound(); } break;
    case 'down':   // something comes down the shaft: swap the cab while the doors are shut
      if (HID.t > .2 && !HID.wiz.visible) { cab.visible = false; HID.wiz.visible = true; }
      if (HID.t > HIDDEN.travel) { liftStopSound(); const t = now_(); bell(t + .05, 493.88, .2); bell(t + .55, 466.16, .18); setStage('opening'); doorsTo(1); startHiddenTrack(2.7); } break;
    case 'opening': if (lift.phase === 'open') setStage('hold'); break;
    case 'hold': if (HID.t > HIDDEN.hold) { setStage('closing'); doorsTo(0); stopHiddenTrack(2.3); } break;
    case 'closing': if (lift.phase === 'closed') { setStage('up'); liftStartSound(); } break;
    case 'up':
      if (HID.t > HIDDEN.travel) {
        liftStopSound(); HID.wiz.visible = false; cab.visible = true; setStage('back');
        // the ordinary cab is back: let the needle unwind to the lobby without spinning a hundred turns
        const target = dialAngle(0), z = UI3.needle.rotation.z; UI3.needle.rotation.z = target + (((z - target) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      } break;
    case 'back': if (HID.t > .6) { HID.active = false; HID.stage = ''; doorsTo(1); } break;
  }
  HID.chase = HID.stage === 'down' || HID.stage === 'up' || HID.stage === 'flash';
  // the cab's own light, the gems, the idle sway, the smoke
  HID.light.intensity = HID.wiz.visible ? 4.5 + Math.sin(time * 37) * Math.sin(time * 3.1) * .4 : 0;
  HID.glow.intensity = HID.wiz.visible ? 1.6 + Math.sin(time * 2.3) * .3 : 0;
  if (HID.wiz.visible && HID.ember) { HID.ember.getWorldPosition(_sv); HID.wiz.worldToLocal(_sv); HID.glow.position.set(_sv.x, _sv.y + .12, _sv.z + .25); }
  if (HID.wiz.visible) {
    for (const m of HID.mages) m.material.emissiveIntensity = 1 + Math.sin(time * 3 + m.id) * .45;
    HID.bodies.forEach((b, i) => { b.rotation.y = b.userData.base + Math.sin(time * .7 + i * 1.7) * .04; b.position.y = Math.sin(time * 1.3 + i) * .006; });
    smokeTick(dt, time);
  }
}
function hiddenDial(dt) {     // the dial needle and the lanterns while it travels: broken, spinning, chasing
  if (!HID.active) return false;
  if (HID.chase) { HID.spin = damp(HID.spin, 9 + Math.sin(performance.now() / 300) * 4, 3, dt); UI3.needle.rotation.z -= HID.spin * dt; }
  else HID.spin = 0;
  return HID.chase || HID.stage === 'opening' || HID.stage === 'hold' || HID.stage === 'closing';
}
function hiddenLanterns(time) {
  if (!HID.active || !HID.chase) return false;
  const ph = Math.floor(time * 7) % 2;
  UI3.lampUp.material.emissiveIntensity = ph ? 7 : 0; UI3.lampDn.material.emissiveIntensity = ph ? 0 : 7;
  if (HID.bolts <= 0) { UI3.lanternLight.color.setRGB(1, .5, .15); UI3.lanternLight.intensity = .35; }
  return true;
}
const _sv = new V3();
function smokeTick(dt, time) {
  const S = HID.smoke; if (!S || !HID.ember) return;
  HID.ember.getWorldPosition(_sv); HID.wiz.worldToLocal(_sv);
  S.next -= dt;
  while (S.next < 0) { S.next += 1 / 60; const p = S.p[S.i]; S.i = (S.i + 1) % S.N;
    p.x = _sv.x; p.y = _sv.y; p.z = _sv.z; p.vx = .05 + Math.random() * .05; p.vy = .16 + Math.random() * .12; p.vz = (Math.random() - .5) * .06; p.age = 0; p.life = 2.4 + Math.random() * 1.6; }
  for (let i = 0; i < S.N; i++) {
    const p = S.p[i]; p.age += dt; const k = p.age / p.life;
    if (k < 1) { p.x += (p.vx + Math.sin(time * 1.7 + p.seed + p.age * 2.2) * .07) * dt; p.y += p.vy * dt * (1 - k * .5); p.z += (p.vz + Math.cos(time * 1.3 + p.seed) * .04) * dt; }
    const a = k < 1 ? Math.pow(1 - k, 1.4) * Math.min(1, p.age * 6) : 0;
    S.pos[i * 3] = p.x; S.pos[i * 3 + 1] = k < 1 ? p.y : -9; S.pos[i * 3 + 2] = p.z;
    S.col[i * 3] = .18 * a; S.col[i * 3 + 1] = .95 * a; S.col[i * 3 + 2] = .3 * a;
  }
  S.pts.geometry.attributes.position.needsUpdate = true; S.pts.geometry.attributes.color.needsUpdate = true;
}
