/* ======================================================================
   THE GALLERY CAT: a black cat with big yellow eyes, roaming the As Is gallery. The model is models/cat.glb, made from the
   reference views supplied with the request: rigged, with Idle, Walk, Run, Sit, Paw_Lick and Tail_Wag clips (its bone
   rotations were exported as int16 data labelled float; the file in the repo is the repaired, slimmed copy).
   It walks from spot to spot round the pieces, stops to look about, now and then sits down and licks a paw. When you
   come close it stops and stares, tail swishing; too close and it trots off.
   Cat space: +z is where it faces, y = 0 the floor. The model already faces +z; it is scaled to a real cat's size.
   ====================================================================== */
const CAT = { g: null, model: null, mixer: null, act: null, w: null, bones: null, st: 'stop', prevSt: '', t: 0, dur: 1.5, x: 1.3, z: 2.9, yaw: 2.4, goal: null, flee: false, v: 0, sitK: 0, headYaw: 0, headPitch: 0 };
const CAT_SCALE = .44, CAT_WALK = .16, CAT_RUN = .42;   // ears about 42 cm up; the walk clip's stride suits a saunter, the run a trot

/* ---- the model: loaded when the gallery is built; the clips are mixed by what the cat is doing ---- */
function buildCat() {
  const root = new THREE.Group(); gallery.add(root); CAT.g = root;
  // a soft contact shadow (the gallery has no sun to cast one)
  const [bc, bx] = cv(128, 128), gr = bx.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(.55, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), scBlend(new THREE.MeshBasicMaterial({ map: ctex(bc), color: 0xffffff })));
  blob.position.y = .004; blob.renderOrder = 3; gallery.add(blob); CAT.blob = blob;
  CAT.goal = null; CAT.st = 'stop'; CAT.t = 0;
  loadGLB('cat').then((gl) => {
    const model = gl.scene; model.scale.setScalar(CAT_SCALE); model.position.x = .105 * CAT_SCALE;   // the rig stands a little off its own centre line
    model.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; catMaterial(o.material); } });
    root.add(model); CAT.model = model;
    const mixer = new THREE.AnimationMixer(model), clip = (n) => gl.animations.find(c => c.name === n);
    const act = { idle: 'Idle', walk: 'Walk', run: 'Run', wag: 'Tail_Wag', sit: 'Sit', lick: 'Paw_Lick' };
    for (const k in act) act[k] = mixer.clipAction(clip(act[k]));
    for (const k of ['sit', 'lick']) { act[k].setLoop(THREE.LoopOnce, 1); act[k].clampWhenFinished = true; }   // both sit down, then hold (the lick holds the paw up)
    for (const k in act) { act[k].play(); act[k].setEffectiveWeight(k === 'idle' ? 1 : 0); }
    CAT.mixer = mixer; CAT.act = act; CAT.w = { idle: 1, walk: 0, run: 0, wag: 0, sit: 0, lick: 0 };
    CAT.bones = { neck: model.getObjectByName('Neck'), head: model.getObjectByName('Head'), paw: model.getObjectByName('FrontR_Lower') };
  }).catch(e => console.warn('cat model:', e));
}
// the yellow of the eyes catches the light (an emissive mask cut from the colour map), and a faint warm rim keeps the black
// shape readable in the dim room
function catMaterial(m) {
  if (m.map && m.map.image) {
    const N = 512, [c, x] = cv(N, N); x.drawImage(m.map.image, 0, 0, N, N); const d = x.getImageData(0, 0, N, N), q = d.data;
    for (let i = 0; i < q.length; i += 4) { const r = q[i], g = q[i + 1], b = q[i + 2]; if (!(r > 140 && g > 90 && b < 100 && r - b > 90)) q[i] = q[i + 1] = q[i + 2] = 0; }
    x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace;
    m.emissive = new THREE.Color(1, 1, 1); m.emissiveMap = t; m.emissiveIntensity = .55;
  }
  m.envMapIntensity = .35;
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'float rimF = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 3.);\noutgoingLight += vec3(.07, .055, .04)*rimF;\n#include <opaque_fragment>'); };
  m.customProgramCacheKey = () => 'catGlb'; m.needsUpdate = true;
}
// turn a bone about a world axis, on top of what the clip set this frame: L' = P^-1 R P L
const _cq = new THREE.Quaternion(), _cp = new THREE.Quaternion(), _cUp = new V3(0, 1, 0), _cSide = new V3();
function catTurn(b, axis, ang) { if (!b || Math.abs(ang) < 1e-4) return; b.parent.getWorldQuaternion(_cp); _cq.setFromAxisAngle(axis, ang); b.quaternion.premultiply(_cp.clone().invert().multiply(_cq).multiply(_cp)); }

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
/* ---- the frame: behaviour, then the clips ---- */
function catTick(dt, time) {
  if (!CAT.g) return;
  const playerHere = galleryHere() && !P.inCab, pd = playerHere ? Math.hypot(P.pos.x - CAT.x, P.pos.z - CAT.z) : 99;
  CAT.t += dt;
  // behaviour
  const toward = (gx, gz) => Math.atan2(gx - CAT.x, gz - CAT.z);
  const turn = (target, rate) => { let d = target - CAT.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); CAT.yaw += clamp(d, -rate * dt, rate * dt); return Math.abs(d); };
  let speed = 0;
  if (CAT.st === 'walk') {
    if (!CAT.goal) { CAT.goal = catPickGoal(); CAT.flee = false; }
    if (!CAT.goal) { CAT.st = 'stop'; CAT.t = 0; CAT.dur = 1.5; }
    else {
      const dx = CAT.goal.x - CAT.x, dz = CAT.goal.z - CAT.z, d = Math.hypot(dx, dz), off = turn(toward(CAT.goal.x, CAT.goal.z), CAT.flee ? 3.4 : 2.6);
      speed = (CAT.flee ? CAT_RUN : CAT_WALK) * clamp(1.4 - off, .15, 1) * clamp(d / .3, .35, 1);
      if (d < .12) { CAT.goal = null; CAT.flee = false; CAT.t = 0; const r = Math.random(); if (r < .5) { CAT.st = 'sit'; } else { CAT.st = 'stop'; CAT.dur = 1.5 + Math.random() * 3.5; } }
      if (pd < 1.0 && CAT.st === 'walk' && !CAT.flee) { CAT.st = 'stare'; CAT.t = 0; CAT.dur = 1.5 + Math.random() * 2; }   // walking off from you, it does not stop to stare again
    }
  } else if (CAT.st === 'stop') {
    if (CAT.t > CAT.dur) { CAT.st = 'walk'; CAT.t = 0; }
    if (pd < 1.0) { CAT.st = 'stare'; CAT.t = 0; CAT.dur = 1.5 + Math.random() * 2; }
  } else if (CAT.st === 'stare') {                                   // you came close: it stops and looks at you
    turn(toward(P.pos.x, P.pos.z), 1.2);
    if (pd < .55 || (CAT.t > CAT.dur && pd < 1.4)) { CAT.goal = catPickGoal(P.pos.x, P.pos.z); CAT.flee = !!CAT.goal; CAT.st = CAT.goal ? 'walk' : 'stop'; CAT.t = 0; CAT.dur = 1; }
    else if (CAT.t > CAT.dur) { CAT.st = 'stop'; CAT.t = 0; CAT.dur = .8; }
  } else if (CAT.st === 'sit') {
    if (CAT.t > .9) { CAT.st = 'groom'; CAT.t = 0; CAT.dur = 6 + Math.random() * 8; }   // the sit clip is down by .75 s
  } else if (CAT.st === 'groom') {
    if (CAT.t > CAT.dur || pd < .6) { CAT.st = 'rise'; CAT.t = 0; }
  } else if (CAT.st === 'rise') {
    if (CAT.t > .7) { CAT.st = pd < 1.0 ? 'stare' : 'stop'; CAT.t = 0; CAT.dur = .8 + Math.random() * 1.2; }
  }
  CAT.v = damp(CAT.v, speed, 6, dt);
  CAT.x += Math.sin(CAT.yaw) * CAT.v * dt; CAT.z += Math.cos(CAT.yaw) * CAT.v * dt;
  const g = CAT.g, seated = CAT.st === 'sit' || CAT.st === 'groom';
  CAT.sitK = damp(CAT.sitK, seated ? 1 : 0, 4, dt);
  g.position.set(CAT.x, 0, CAT.z); g.rotation.y = CAT.yaw;
  if (CAT.blob) { const s = CAT.sitK; CAT.blob.position.x = CAT.x - Math.sin(CAT.yaw) * .04 * s; CAT.blob.position.z = CAT.z - Math.cos(CAT.yaw) * .04 * s; CAT.blob.rotation.y = CAT.yaw; CAT.blob.scale.set(lerp(.26, .3, s), 1, lerp(.5, .36, s)); }
  if (!CAT.mixer) return;                                            // the model is still on its way
  // the clips: each state has one, crossfaded; sitting and the lick start from the top when the state begins
  const A_ = CAT.act;
  if (CAT.st !== CAT.prevSt) { if (CAT.st === 'sit') A_.sit.reset().play(); if (CAT.st === 'groom') { A_.lick.reset().play(); A_.lick.time = 1.0; } CAT.prevSt = CAT.st; }
  const W = { idle: 0, walk: 0, run: 0, wag: 0, sit: 0, lick: 0 }, moving = clamp(CAT.v / .05, 0, 1);
  if (CAT.st === 'walk') { W[CAT.flee ? 'run' : 'walk'] = moving; W.idle = 1 - moving; }
  else if (CAT.st === 'stare') W.wag = 1;
  else if (CAT.st === 'sit') W.sit = 1;
  else if (CAT.st === 'groom') W.lick = 1;
  else W.idle = 1;                                                   // stopped, or getting up
  for (const k in W) { CAT.w[k] = damp(CAT.w[k], W[k], 5, dt); A_[k].setEffectiveWeight(CAT.w[k]); }
  A_.walk.timeScale = clamp(CAT.v / .12, .35, 1.6); A_.run.timeScale = clamp(CAT.v / .26, .5, 1.8);
  CAT.mixer.update(dt);
  // on top of the clips: the head looks about, and at you when you are close; grooming, it nods to the paw in little licks
  // (the clip only raises the paw and holds it there)
  let hy = 0, hp = 0;
  if (CAT.st === 'stare' && playerHere) { const a = Math.atan2(P.pos.x - CAT.x, P.pos.z - CAT.z) - CAT.yaw; hy = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -1, 1); hp = -.3; }
  else if (CAT.st === 'stop' || CAT.st === 'sit') { hy = Math.sin(time * .7 + 1.3) * .55; hp = Math.sin(time * .5) * .1; }
  CAT.headYaw = damp(CAT.headYaw, hy, 5, dt); CAT.headPitch = damp(CAT.headPitch, hp, 5, dt);
  const lickOn = CAT.st === 'groom' && CAT.t > .8 && (CAT.t % 2.6) < 1.8, lk = lickOn ? .08 + .06 * Math.sin(CAT.t * 18) : 0;
  const B = CAT.bones; CAT.model.updateMatrixWorld(true); _cSide.set(Math.cos(CAT.yaw), 0, -Math.sin(CAT.yaw));
  catTurn(B.neck, _cUp, CAT.headYaw * .45); B.neck.updateMatrixWorld(true);
  catTurn(B.head, _cUp, CAT.headYaw * .55); catTurn(B.head, _cSide, CAT.headPitch + lk);
  if (lickOn) catTurn(B.paw, _cSide, -.1 * Math.sin(CAT.t * 18));
}
