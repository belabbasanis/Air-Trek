/* ======================================================================
   THE GALLERY CAT: a black cat with the big orange eyes of the drawing (images supplied with the request),
   roaming the As Is gallery. It walks from spot to spot round the pieces, stops to look about, now and then
   sits down and licks a paw. When you come close it stops and stares; too close and it wanders off.
   Built from simple shapes, matte black with a faint warm rim; the face is a painted patch on the head that
   changes with what the cat is doing (ring eyes, wide eyes, side glances, a blep, eyes shut while licking).
   Cat space: +z is where it faces, y = 0 the floor.
   ====================================================================== */
const CAT = { g: null, st: 'stop', t: 0, dur: 1.5, x: 1.3, z: 2.9, yaw: 2.4, goal: null, v: 0, ph: 0, sit: 0, groom: 0, face: 0, faceHold: 0, blinkT: 2.5, headYaw: 0, headPitch: 0, lick: 0, wipe: 0, parts: null };
const CAT_FACES = { ring: 0, wide: 1, disc: 2, side: 3, blep: 4, lick: 5, blink: 6, small: 7 };

/* ---- the faces, drawn after the drawing: orange (#f29c1b), black pupils, a red tongue ---- */
function catFaceAtlas() {
  const [c, x] = cv(1024, 512), O = '#f4a020', Od = '#d9781a', R = '#c9262c';
  x.fillStyle = '#060606'; x.fillRect(0, 0, 1024, 512);
  const cell = (k, draw) => { x.save(); x.translate((k % 4) * 256, Math.floor(k / 4) * 256); draw(); x.restore(); };
  const ring = (cx, cy, r, w) => { x.strokeStyle = O; x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.stroke(); };
  const disc = (cx, cy, rx, ry, col = O) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 6.283); x.fill(); };
  const E = 64, Y = 112;                                                    // eye spacing either side of the middle, eye height
  cell(0, () => { for (const s of [-1, 1]) ring(128 + s * E, Y, 34, 10); });                                       // ring eyes, wide open
  cell(1, () => { for (const s of [-1, 1]) { disc(128 + s * E, Y, 38, 48); disc(128 + s * E - s * 6, Y + 6, 10, 12, '#060606'); } disc(128, 196, 9, 6, R); });   // big ovals, small pupils, a little mouth
  cell(2, () => { for (const s of [-1, 1]) { disc(128 + s * E, Y, 32, 32); disc(128 + s * E, Y + 2, 13, 15, '#060606'); } });   // solid orange, round pupils
  cell(3, () => { for (const s of [-1, 1]) { ring(128 + s * E, Y, 30, 8); disc(128 + s * E + 15, Y + 4, 11, 13, O); } });       // a side glance: the pupils slid over
  cell(4, () => { for (const s of [-1, 1]) ring(128 + s * E, Y, 34, 10); x.fillStyle = R; x.beginPath(); x.ellipse(132, 192, 15, 20, .2, 0, 3.4); x.fill(); });   // the blep
  cell(5, () => { x.strokeStyle = O; x.lineWidth = 9; x.lineCap = 'round'; for (const s of [-1, 1]) { x.beginPath(); x.arc(128 + s * E, Y + 18, 26, 3.6, 5.8); x.stroke(); }   // eyes shut (happy arcs), tongue out
    x.fillStyle = R; x.beginPath(); x.ellipse(128, 194, 17, 26, 0, 0, 3.15); x.fill(); x.fillStyle = Od; x.fillRect(126, 186, 4, 18); });
  cell(6, () => { x.strokeStyle = O; x.lineWidth = 8; x.lineCap = 'round'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(128 + s * E - 30, Y + 4); x.lineTo(128 + s * E + 30, Y + 4); x.stroke(); } });   // a blink
  cell(7, () => { for (const s of [-1, 1]) ring(128 + s * 54, Y, 22, 7); });                                       // small owl rings
  const t = ctex(c); t.repeat.set(.25, .5); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

/* ---- the body: a hip pivot carries the torso, the front legs, the neck and head and the tail; the hind legs hinge at the hip.
   Proportions after a real cat: the front legs are long but their upper half sits inside the chest, the neck is short. ---- */
const CAT_DIM = { hipY: .2, sitHipY: .062, sitPitch: .95, foreUp: .1, foreLow: .125, hindUp: .1, hindLow: .1 };
function buildCat() {
  const root = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x060606, roughness: .6, metalness: 0, envMapIntensity: .25 });
  mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'float rimF = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 3.);\noutgoingLight += vec3(.07, .055, .04)*rimF;\n#include <opaque_fragment>'); };
  mat.customProgramCacheKey = () => 'catBody';
  const ball = (r, sx, sy, sz, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const capsule = (r, len, parent) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 12).translate(0, -len / 2, 0), mat); m.castShadow = true; parent.add(m); return m; };
  const D_ = CAT_DIM, hip = new THREE.Group(); hip.position.set(0, D_.hipY, -.12); root.add(hip);
  const torso = new THREE.Group(); hip.add(torso);
  ball(1, .1, .112, .185, 0, .01, .13, torso);                      // torso
  ball(.092, 1, .98, 1.1, 0, -.004, .03, torso);                    // haunches, inside the torso's curve
  ball(.088, 1, 1.05, 1, 0, .004, .24, torso);                      // chest
  // a leg: upper and lower segments, a soft paw; the hind legs get a thigh
  const leg = (parent, x, y, z, up, low, r, thigh) => { const s = new THREE.Group(); s.position.set(x, y, z); parent.add(s); capsule(r, up, s); if (thigh) ball(thigh, .72, 1.3, 1.05, 0, -up * .4, .006, s);
    const k = new THREE.Group(); k.position.y = -up; s.add(k); capsule(r * .9, low, k); ball(r * 1.12, 1, .68, 1.3, 0, -low - .006, .008, k); return { s, k, up, low }; };
  const LF = leg(hip, .046, .03, .255, D_.foreUp, D_.foreLow, .026), RF = leg(hip, -.046, .03, .255, D_.foreUp, D_.foreLow, .026);
  const LH = leg(root, .058, D_.hipY, -.115, D_.hindUp, D_.hindLow, .027, .056), RH = leg(root, -.058, D_.hipY, -.115, D_.hindUp, D_.hindLow, .027, .056);
  // neck and head, close to the body
  const neck = new THREE.Group(); neck.position.set(0, .055, .285); hip.add(neck);
  ball(.062, 1, 1.2, 1.05, 0, .03, .03, neck);
  const head = new THREE.Group(); head.position.set(0, .066, .06); neck.add(head);
  const skull = ball(.08, 1, .9, .92, 0, 0, 0, head);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.036, .078, 4), mat); ear.position.set(s * .048, .064, -.008); ear.rotation.set(-.14, s * .78, s * -.4); ear.castShadow = true; head.add(ear); }
  // the face: a patch of sphere just proud of the skull, carrying the painted eyes
  const faceTex = catFaceAtlas(), faceM = new THREE.MeshStandardMaterial({ map: faceTex, emissiveMap: faceTex, emissive: 0xffffff, emissiveIntensity: .85, roughness: .5, metalness: 0 });
  const face = new THREE.Mesh(new THREE.SphereGeometry(.0814, 24, 12, Math.PI / 2 - .95, 1.9, .82, 1.15), faceM); face.scale.set(1, .9, .92); head.add(face);
  const mouth = new THREE.Object3D(); mouth.position.set(0, -.03, .075); head.add(mouth);           // where the paw goes to be licked
  const cheek = new THREE.Object3D(); cheek.position.set(-.045, .025, .05); head.add(cheek);         // ...and where it wipes
  // the tail: a chain of short links from the top of the haunches
  const tail = []; let prev = new THREE.Group(); prev.position.set(0, .05, -.065); hip.add(prev);
  for (let i = 0; i < 11; i++) { const j = new THREE.Group(); if (i) j.position.z = -.03; prev.add(j); const m = new THREE.Mesh(new THREE.CapsuleGeometry(.017 - i * .0008, .022, 3, 8).rotateX(Math.PI / 2).translate(0, 0, -.015), mat); m.castShadow = true; j.add(m); tail.push(j); prev = j; }
  root.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  // a soft contact shadow (the gallery has no sun to cast one)
  const [bc, bx] = cv(128, 128), gr = bx.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(.55, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), scBlend(new THREE.MeshBasicMaterial({ map: ctex(bc), color: 0xffffff })));
  blob.position.y = .004; blob.renderOrder = 3; gallery.add(blob); CAT.blob = blob;
  root.scale.setScalar(1.05);
  CAT.g = root; CAT.parts = { hip, torso, neck, head, LF, RF, LH, RH, tail, faceTex, skull, mouth, cheek };
  CAT.goal = null; CAT.st = 'stop'; CAT.t = 0;
  gallery.add(root);
}
// two-bone reach in a leg's plane (its parent's y-z), for the paw going to the mouth: sets the shoulder and elbow angles
const _cT = new V3(), _cS = new V3();
function catReach(L, target, gain) {
  L.s.parent.updateMatrixWorld(); _cT.copy(target); L.s.parent.worldToLocal(_cT); _cS.copy(L.s.position);
  const sc = L.s.scale.y, a = L.up * sc, b = (L.low + .012) * sc;
  let dy = _cT.y - _cS.y, dz = _cT.z - _cS.z, d = Math.hypot(dy, dz); const m = Math.min(d, a + b - .002); dy *= m / d; dz *= m / d; d = m;
  const th = Math.atan2(-dz, -dy), al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const up = th - al, ey = -Math.cos(up) * a, ez = -Math.sin(up) * a, low = Math.atan2(-(dz - ez), -(dy - ey)) - up;   // elbow down and forward of the line
  L.s.rotation.x = lerp(L.s.rotation.x, up, gain); L.k.rotation.x = lerp(L.k.rotation.x, low, gain);
}

/* ---- where it can go: the gallery floor, clear of the pieces (and not in the lift doorway) ---- */
function catBlocked(x, z, m) {
  if (x < GAL.x0 + .35 || x > GAL.x1 - .35 || z < WALL_Z + .8 || z > GAL.z1 - .35) return true;
  return GAL_OBST.some(q => x > q[0] - m && x < q[1] + m && z > q[2] - m && z < q[3] + m);
}
function catClear(x0, z0, x1, z1) { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / .12); for (let i = 1; i <= n; i++) { const t = i / n; if (catBlocked(lerp(x0, x1, t), lerp(z0, z1, t), .22)) return false; } return true; }
function catPickGoal(awayX, awayZ) {
  for (let i = 0; i < 40; i++) {
    const x = lerp(GAL.x0 + .4, GAL.x1 - .4, Math.random()), z = lerp(WALL_Z + .9, GAL.z1 - .4, Math.random());
    if (catBlocked(x, z, .28) || Math.hypot(x - CAT.x, z - CAT.z) < 1.2 || !catClear(CAT.x, CAT.z, x, z)) continue;
    if (awayX !== undefined && Math.hypot(x - awayX, z - awayZ) < Math.hypot(CAT.x - awayX, CAT.z - awayZ) + .8) continue;
    return { x, z };
  }
  return null;
}
function catSetFace(k, hold = 0) { CAT.face = k; CAT.faceHold = hold; const t = CAT.parts.faceTex; t.offset.set((k % 4) * .25, k < 4 ? .5 : 0); }

/* ---- the frame: behaviour, then the pose ---- */
function catTick(dt, time) {
  if (!CAT.g) return;
  const P_ = CAT.parts, playerHere = galleryHere() && !P.inCab, pd = playerHere ? Math.hypot(P.pos.x - CAT.x, P.pos.z - CAT.z) : 99;
  CAT.t += dt;
  // behaviour
  const toward = (gx, gz) => Math.atan2(gx - CAT.x, gz - CAT.z);
  const turn = (target, rate) => { let d = target - CAT.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); CAT.yaw += clamp(d, -rate * dt, rate * dt); return Math.abs(d); };
  let speed = 0;
  if (CAT.st === 'walk') {
    if (!CAT.goal) CAT.goal = catPickGoal();
    if (!CAT.goal) { CAT.st = 'stop'; CAT.t = 0; CAT.dur = 1.5; }
    else {
      const dx = CAT.goal.x - CAT.x, dz = CAT.goal.z - CAT.z, d = Math.hypot(dx, dz), off = turn(toward(CAT.goal.x, CAT.goal.z), 2.6);
      speed = .26 * clamp(1.4 - off, .15, 1) * clamp(d / .3, .35, 1);
      if (d < .12) { CAT.goal = null; CAT.t = 0; const r = Math.random(); if (r < .5) { CAT.st = 'sit'; } else { CAT.st = 'stop'; CAT.dur = 1.5 + Math.random() * 3.5; } }
      if (pd < 1.0 && CAT.st === 'walk') { CAT.st = 'stare'; CAT.t = 0; CAT.dur = 1.5 + Math.random() * 2; }
    }
  } else if (CAT.st === 'stop') {
    if (CAT.t > CAT.dur) { CAT.st = 'walk'; CAT.t = 0; }
    if (pd < 1.0) { CAT.st = 'stare'; CAT.t = 0; CAT.dur = 1.5 + Math.random() * 2; }
  } else if (CAT.st === 'stare') {                                   // you came close: it stops and looks at you
    turn(toward(P.pos.x, P.pos.z), 1.2);
    if (pd < .55 || (CAT.t > CAT.dur && pd < 1.4)) { CAT.goal = catPickGoal(P.pos.x, P.pos.z); CAT.st = CAT.goal ? 'walk' : 'stop'; CAT.t = 0; CAT.dur = 1; }
    else if (CAT.t > CAT.dur) { CAT.st = 'stop'; CAT.t = 0; CAT.dur = .8; }
  } else if (CAT.st === 'sit') {
    if (CAT.sit > .98) { CAT.st = 'groom'; CAT.t = 0; CAT.dur = 6 + Math.random() * 8; }
  } else if (CAT.st === 'groom') {
    if (CAT.t > CAT.dur || pd < .6) { CAT.st = 'rise'; CAT.t = 0; }
  } else if (CAT.st === 'rise') {
    if (CAT.sit < .02) { CAT.st = pd < 1.0 ? 'stare' : 'stop'; CAT.t = 0; CAT.dur = .8 + Math.random() * 1.2; }
  }
  CAT.v = damp(CAT.v, speed, 6, dt);
  CAT.x += Math.sin(CAT.yaw) * CAT.v * dt; CAT.z += Math.cos(CAT.yaw) * CAT.v * dt;
  CAT.ph = (CAT.ph + CAT.v * dt / .26) % 1;                          // one full gait cycle every 26 cm
  const sitting = CAT.st === 'sit' || CAT.st === 'groom';
  CAT.sit = clamp(CAT.sit + (sitting ? dt / .7 : -dt / .55), 0, 1);
  CAT.groom = damp(CAT.groom, CAT.st === 'groom' ? 1 : 0, 5, dt);
  // the face
  CAT.blinkT -= dt; if (CAT.faceHold > 0) CAT.faceHold -= dt;
  const lickOn = CAT.st === 'groom' && (CAT.t % 2.4) < 1.6;
  if (CAT.st === 'groom') catSetFace(lickOn ? CAT_FACES.lick : (CAT.t % 2.4) < 2.0 ? CAT_FACES.blep : CAT_FACES.small);
  else if (CAT.faceHold <= 0) {
    if (CAT.blinkT <= 0) { CAT.blinkT = 2.5 + Math.random() * 4; catSetFace(CAT_FACES.blink, .13); }
    else catSetFace(CAT.st === 'stare' ? CAT_FACES.wide : CAT.st === 'stop' ? ((CAT.t % 5) < 2.5 ? CAT_FACES.side : CAT_FACES.disc) : CAT_FACES.ring);
  }
  // the pose
  const g = CAT.g, s = sstep(0, 1, CAT.sit), w = clamp(CAT.v / .3, 0, 1), ph = CAT.ph * 6.283;
  g.position.set(CAT.x, 0, CAT.z); g.rotation.y = CAT.yaw;
  if (CAT.blob) { CAT.blob.position.x = CAT.x - Math.sin(CAT.yaw) * .04 * s; CAT.blob.position.z = CAT.z - Math.cos(CAT.yaw) * .04 * s; CAT.blob.rotation.y = CAT.yaw; CAT.blob.scale.set(lerp(.3, .34, s), 1, lerp(.62, .42, s)); }
  const D_ = CAT_DIM, pitch = D_.sitPitch * s;
  P_.hip.position.y = lerp(D_.hipY + .006 * Math.sin(ph * 2) * w, D_.sitHipY, s); P_.hip.rotation.x = -pitch;
  P_.torso.scale.z = 1 - .12 * s;                                      // a sitting cat is a compact shape
  P_.LH.s.position.y = P_.RH.s.position.y = P_.hip.position.y;
  // legs: a lateral-sequence walk (left hind, left fore, right hind, right fore); sitting, the haunches fold and the forelegs stand straight
  const step = (L, off, fore) => { const p = ph + off * 6.283, sw = Math.sin(p), lift = Math.max(0, Math.sin(p + .9));
    const up = sw * .4 * w, low = (fore ? .6 : -.75) * lift * w;
    if (fore) { L.s.rotation.set(up * (1 - s) + pitch, 0, 0); L.k.rotation.x = low * (1 - s); L.s.scale.y = 1 + .24 * s; }
    else { L.s.rotation.x = lerp(up, -1.3, s); L.k.rotation.x = lerp(low, 2.45, s); } };
  step(P_.LH, 0, false); step(P_.LF, .25, true); step(P_.RH, .5, false); step(P_.RF, .75, true);
  // grooming: the right fore paw comes up to the mouth and the head bows to it to lick; now and then it wipes over the face
  CAT.wipe = CAT.st === 'groom' && (CAT.t % 7.2) > 5.6 ? damp(CAT.wipe, 1, 5, dt) : damp(CAT.wipe, 0, 5, dt);
  const gr = CAT.groom, lk = lickOn ? Math.sin(CAT.t * 15) : 0;
  // the head: level while the body pitches, looks about, at you when you are close, down to the paw when grooming
  let hy = 0, hp = 0;
  if (CAT.st === 'stare' && playerHere) { const a = Math.atan2(P.pos.x - CAT.x, P.pos.z - CAT.z) - CAT.yaw; hy = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -.9, .9); hp = -.25; }
  else if (CAT.st === 'stop' || CAT.st === 'sit') { hy = Math.sin(time * .7 + 1.3) * .6; hp = Math.sin(time * .5) * .12; }
  else hy = Math.sin(time * 1.3) * .08;
  hy = lerp(hy, -.22 - .25 * CAT.wipe, gr); hp = lerp(hp, .42 + .07 * lk - .25 * CAT.wipe, gr);
  CAT.headYaw = damp(CAT.headYaw, hy, 5, dt); CAT.headPitch = damp(CAT.headPitch, hp, 6, dt);
  P_.neck.rotation.x = pitch * .9 + .05 * Math.sin(ph * 2) * w - .1 * gr;
  P_.head.rotation.set(CAT.headPitch, CAT.headYaw, -CAT.headYaw * .15 - .12 * gr);
  if (gr > .01) { CAT.g.updateMatrixWorld(true); const tgt = new V3().lerpVectors(P_.mouth.getWorldPosition(new V3()), P_.cheek.getWorldPosition(new V3()), CAT.wipe); catReach(P_.RF, tgt, gr); P_.RF.s.rotation.y = .3 * gr; }
  // the tail: up in a question mark when walking, swaying; curled round the paws when sitting
  P_.tail.forEach((j, i) => {
    const k = i / (P_.tail.length - 1);
    const upX = i === 0 ? 1.05 : .06 + .14 * k + .04 * Math.sin(time * 2.1 - i * .5), upY = .1 * Math.sin(time * 1.6 - i * .4) * (.5 + k);
    const sitX = i === 0 ? -(Math.PI / 2 - CAT_DIM.sitPitch) : i < 3 ? .68 : 0, sitY = i < 3 ? 0 : .3 + .04 * Math.sin(time * .9 + i) * k;
    j.rotation.x = lerp(upX, sitX, s); j.rotation.y = lerp(upY, sitY, s);
  });
}
