
/* ======================================================================
   AUDIO: procedural score (pad + electric piano), bell, doors, motor, room
   ====================================================================== */
const A = { ctx: null, smp: {} };
/* ---- recorded sounds (audio/ next to the page). If any fail to load, the generated sound is used instead. ---- */
const SAMPLES = { song: 'audio/song.mp3', tile: 'audio/steps-tile.mp3', metal: 'audio/steps-metal.mp3', start: 'audio/lift-start.mp3', stop: 'audio/lift-stop.mp3', loop: 'audio/lift-loop.mp3', hidden: HIDDEN.track };
const STEP_SLOT = { tile: [.5, .45, 8], metal: [1.0, .9, 8] };       // slot length, step length, steps per file
const LOOP_IN = .5, LOOP_OUT = 27.5;                                    // seamless region of lift-loop.mp3
const samplesReady = (async () => {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return;
  const dec = new OAC(2, 1, 48000);
  await Promise.all(Object.entries(SAMPLES).map(async ([k, url]) => {
    try { const r = await fetch(url); if (!r.ok) return; A.smp[k] = await dec.decodeAudioData(await r.arrayBuffer()); } catch (e) { console.warn('Sound not loaded:', url); }
  }));
})();
function playBuf(buf, t, { gain = 1, rate = 1, offset = 0, dur, dest } = {}) {
  const s = A.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; const g = A.ctx.createGain(); g.gain.value = gain;
  s.connect(g).connect(dest || A.master); dur !== undefined ? s.start(t, offset, dur) : s.start(t, offset); return { s, g };
}
let lastStep = -1;
function stepSample(file, gain = 1, rate = 1, dest) {
  const buf = A.smp[file]; if (!buf) return false;
  const [slot, len, n] = STEP_SLOT[file]; let i = Math.floor(Math.random() * n); if (i === lastStep) i = (i + 1) % n; lastStep = i;
  playBuf(buf, now_(), { gain: (file === 'metal' ? .42 : .5) * gain * (.8 + Math.random() * .2), rate: rate * (.94 + Math.random() * .12), offset: i * slot, dur: len, dest });
  return true;
}
// what is underfoot: the cab's steel floor, tile (lobby, landings), and on the roof stepping stones or grass
function surfaceUnder() {
  const x = P.pos.x, z = P.pos.z;
  if (z < CAB.z1 + .02 && Math.abs(x) < CAB.x1 + .05) return 'metal';
  if (lift.floor === ROOF && lift.phase !== 'riding') {
    if (z < WALL_Z + .1 && Math.abs(x) < DOOR_W / 2 + .1) return 'tile';          // the brass sill
    return ROOF_STONES.some(q => x > q[0] && x < q[1] && z > q[2] && z < q[3]) ? 'stone' : 'grass';
  }
  if (lift.floor === 0 && lift.phase !== 'riding' && Math.abs(x - CARPET.x) < CARPET.w / 2 && Math.abs(z - CARPET.z) < CARPET.d / 2) return 'carpet';
  return 'tile';
}
function carpetStep() {
  // the tile step heard through a pile rug: heel thud kept, the click filtered away, plus a soft fibre brush
  const ctx = A.ctx, t = now_();
  if (!A.carpetLP) { A.carpetLP = ctx.createBiquadFilter(); A.carpetLP.type = 'lowpass'; A.carpetLP.frequency.value = 420; A.carpetLP.Q.value = .5; A.carpetLP.connect(A.master); }
  if (!stepSample('tile', 1.5, .86, A.carpetLP)) thump(t, 80, 45, .07, .09);
  noiseHit(t + .01, 'bandpass', 1400 + Math.random() * 500, 1.2, .018, .09);
}
function grassStep() {
  const ctx = A.ctx, t = now_();
  // soft blades brushing, a few dry ticks, and a muffled heel on turf
  noiseHit(t, 'bandpass', 2600 + Math.random() * 900, .9, .05, .16);
  noiseHit(t + .01, 'highpass', 4200, .7, .025, .1);
  for (let i = 0; i < 3; i++) noiseHit(t + .02 + Math.random() * .08, 'bandpass', 3000 + Math.random() * 3000, 6, .012 + Math.random() * .01, .025);
  noiseHit(t, 'lowpass', 300, .7, .09, .08); thump(t, 70, 45, .05, .08);
}
function liftStartSound() {
  if (!A.ctx || !A.smp.start || !A.smp.loop) return;
  const t = now_(); playBuf(A.smp.start, t, { gain: .9 });
  if (A.loop) { try { A.loop.s.stop(); } catch (e) { } }
  const s = A.ctx.createBufferSource(); s.buffer = A.smp.loop; s.loop = true; s.loopStart = LOOP_IN; s.loopEnd = LOOP_OUT;
  const g = A.ctx.createGain(); g.gain.setValueAtTime(0, t); s.connect(g).connect(A.master);
  s.start(t + .7, LOOP_IN + Math.random() * 20); g.gain.setValueAtTime(0, t + .7); g.gain.linearRampToValueAtTime(.5, t + 1.6);
  A.loop = { s, g };
}
function liftStopSound() {
  if (!A.ctx || !A.smp.stop) return;
  const t = now_(); playBuf(A.smp.stop, t, { gain: .9 });
  if (A.loop) { const { s, g } = A.loop; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + .6); s.stop(t + .7); A.loop = null; }
}
function startSong() {
  if (!A.ctx || !A.smp.song) return false;
  const t = now_() + .05; const { s, g } = playBuf(A.smp.song, t, { gain: 0 }); s.loop = true;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.8, t + 3); A.song = { s, g };
  return true;
}
function initAudio() {
  if (A.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = A.ctx = new AC();
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .997 * b0 + w * .029; b1 = .985 * b1 + w * .032; b2 = .95 * b2 + w * .048; d[i] = (b0 + b1 + b2 + w * .05) * .5; }
  A.buf = buf;
  A.master = ctx.createGain(); A.master.gain.value = SET.sound ? .9 : 0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
  A.master.connect(comp).connect(ctx.destination);
  // room reverb from a generated impulse
  const ir = ctx.createBuffer(2, ctx.sampleRate * 2.4, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < ch.length; i++) { const t = i / ctx.sampleRate; ch[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.6) * (t < .012 ? t / .012 : 1); } }
  A.rev = ctx.createConvolver(); A.rev.buffer = ir; A.revIn = ctx.createGain(); A.revIn.gain.value = .55; A.revIn.connect(A.rev).connect(A.master);
  const loopSrc = (type, f, q) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl).connect(g); return { s, fl, g }; };
  // ambience: wind at the windows, muffled when the cab is shut
  A.ambLP = ctx.createBiquadFilter(); A.ambLP.type = 'lowpass'; A.ambLP.frequency.value = 6000; A.ambLP.connect(A.master);
  A.wind = loopSrc('bandpass', 480, .6); A.wind.g.connect(A.ambLP); A.wind.g.gain.value = .05;
  A.air = loopSrc('highpass', 2600, .4); A.air.g.connect(A.ambLP); A.air.g.gain.value = .012;
  // the ride: cable hum, motor whine, air rushing in the shaft
  A.hum = ctx.createGain(); A.hum.gain.value = 0; const humF = ctx.createBiquadFilter(); humF.type = 'lowpass'; humF.frequency.value = 400; A.hum.connect(humF).connect(A.master);
  for (const [f, g] of [[55, .5], [110, .3], [165, .12], [220, .06]]) { const o = ctx.createOscillator(); o.frequency.value = f; const gg = ctx.createGain(); gg.gain.value = g; o.connect(gg).connect(A.hum); o.start(); }
  A.motorO = ctx.createOscillator(); A.motorO.type = 'sawtooth'; A.motorO.frequency.value = 120; A.motorF = ctx.createBiquadFilter(); A.motorF.type = 'bandpass'; A.motorF.Q.value = 6; A.motorF.frequency.value = 240;
  A.motorG = ctx.createGain(); A.motorG.gain.value = 0; A.motorO.connect(A.motorF).connect(A.motorG).connect(A.master); A.motorO.start();
  A.rush = loopSrc('bandpass', 700, .8); A.rush.g.connect(A.master);
  // music bus and pad
  A.mus = ctx.createGain(); A.mus.gain.value = 1; A.mus.connect(A.master); const ms = ctx.createGain(); ms.gain.value = .8; A.mus.connect(ms).connect(A.revIn);
  A.pad = { g: ctx.createGain(), f: ctx.createBiquadFilter(), oscs: [], chord: 0, next: 0 };
  A.pad.g.gain.value = 0; A.pad.f.type = 'lowpass'; A.pad.f.frequency.value = 700; A.pad.f.Q.value = .5; A.pad.f.connect(A.pad.g).connect(A.mus);
  for (let i = 0; i < 4; i++) for (const det of [-7, 7]) { const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sawtooth'; o.detune.value = det; const g = ctx.createGain(); g.gain.value = i === 0 ? .35 : .12; o.connect(g).connect(A.pad.f); o.start(); A.pad.oscs.push({ o, i }); }
  setChord(0, ctx.currentTime);
}
// Fmaj9, Am9, Dm9, Bbmaj7(#11): warm, unresolved, a little lobby-jazz
const CHORDS = [[87.31, 220.0, 329.63, 392.0], [110.0, 261.63, 329.63, 493.88], [73.42, 174.61, 261.63, 329.63], [58.27, 146.83, 220.0, 329.63]];
const CHORD_TONES = [[349.23, 440, 523.25, 659.25, 783.99], [440, 523.25, 659.25, 783.99, 987.77], [349.23, 440, 523.25, 587.33, 698.46], [349.23, 440, 587.33, 659.25, 698.46]];
function setChord(k, t) { const p = A.pad; p.chord = k; p.oscs.forEach(({ o, i }) => o.frequency.setTargetAtTime(CHORDS[k][i], t, .9)); }
function rhodes(f, t, dur, g, pan = 0) {
  const ctx = A.ctx; if (!ctx) return;
  const c = ctx.createOscillator(); c.frequency.value = f;
  const m = ctx.createOscillator(); m.frequency.value = f; const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 2.4, t); mg.gain.exponentialRampToValueAtTime(f * .25, t + .9); m.connect(mg).connect(c.frequency);
  const tn = ctx.createOscillator(); tn.frequency.value = f * 14; const tg = ctx.createGain(); tg.gain.setValueAtTime(f * 1.4, t); tg.gain.exponentialRampToValueAtTime(1, t + .06); tn.connect(tg).connect(c.frequency);
  const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + .006); e.gain.exponentialRampToValueAtTime(g * .35, t + dur * .6); e.gain.setTargetAtTime(0, t + dur, .35);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  c.connect(e).connect(lp); if (pn) { pn.pan.value = pan; lp.connect(pn).connect(A.mus); } else lp.connect(A.mus);
  for (const o of [c, m, tn]) { o.start(t); o.stop(t + dur + 2); }
}
function bell(t, f = 987.77, g = .2) {
  const ctx = A.ctx; if (!ctx) return;
  [[1, 1, 2.8], [2.01, .34, 1.6], [2.76, .22, 1.1], [4.07, .1, .7], [5.43, .05, .45]].forEach(([r, a, dcy]) => {
    const o = ctx.createOscillator(); o.frequency.value = f * r; const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g * a, t + .004); e.gain.exponentialRampToValueAtTime(.0004, t + dcy);
    o.connect(e); e.connect(A.master); e.connect(A.revIn); o.start(t); o.stop(t + dcy + .1);
  });
}
function noiseHit(t, type, f, q, g, dur, dest) {
  const ctx = A.ctx; if (!ctx) return; const s = ctx.createBufferSource(); s.buffer = A.buf; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const e = ctx.createGain(); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.0005, t + dur); s.connect(fl).connect(e).connect(dest || A.master); s.start(t, Math.random() * 2, dur + .05);
}
function thump(t, f0, f1, g, dur) { const ctx = A.ctx; if (!ctx) return; const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); const e = ctx.createGain(); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.0005, t + dur); o.connect(e).connect(A.master); o.start(t); o.stop(t + dur + .05); }
const now_ = () => A.ctx ? A.ctx.currentTime : 0;
function sfxClick() { if (!A.ctx) return; const t = now_(); noiseHit(t, 'highpass', 2400, .7, .25, .03); thump(t, 220, 120, .18, .06); noiseHit(t + .07, 'bandpass', 1500, 3, .06, .04); }
function sfxDoors(opening, dur) {
  if (!A.ctx) return; const ctx = A.ctx, t = now_();
  const s = ctx.createBufferSource(); s.buffer = A.buf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 260; fl.Q.value = 1.4;
  const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.22, t + .35); e.gain.setValueAtTime(.22, t + dur - .45); e.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(fl).connect(e).connect(A.master); s.start(t); s.stop(t + dur + .1);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(42, t); o.frequency.linearRampToValueAtTime(58, t + dur * .5); o.frequency.linearRampToValueAtTime(40, t + dur);
  const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 240; const oe = ctx.createGain(); oe.gain.setValueAtTime(0, t); oe.gain.linearRampToValueAtTime(.06, t + .3); oe.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(of).connect(oe).connect(A.master); o.start(t); o.stop(t + dur + .1);
  if (Math.random() < .7) { const q = ctx.createOscillator(); q.type = 'sine'; const qt = t + .3 + Math.random() * (dur - .8); q.frequency.setValueAtTime(1900 + Math.random() * 600, qt); q.frequency.linearRampToValueAtTime(2500 + Math.random() * 500, qt + .35); const qe = ctx.createGain(); qe.gain.setValueAtTime(0, qt); qe.gain.linearRampToValueAtTime(.012, qt + .1); qe.gain.linearRampToValueAtTime(0, qt + .4); q.connect(qe).connect(A.master); q.start(qt); q.stop(qt + .5); }
  thump(t + dur - .02, opening ? 90 : 70, 38, opening ? .2 : .38, .3); noiseHit(t + dur - .02, 'lowpass', 900, .7, opening ? .12 : .25, .12);
}
function sfxStep(surface) { if (!A.ctx) return; const steel = surface === 'metal';
  if (surface === 'grass') { grassStep(); return; }
  if (surface === 'carpet') { carpetStep(); return; }
  if (surface === 'stone' ? stepSample('tile', 1.15, .82) : stepSample(steel ? 'metal' : 'tile')) return;
  const t = now_(); noiseHit(t, 'lowpass', steel ? 900 : 620, .8, .12, .09); thump(t, 95, 55, .1, .09); if (steel) noiseHit(t + .005, 'bandpass', 1700 + Math.random() * 400, 9, .035, .14); }
function sfxTick(g) { if (!A.ctx) return; const t = now_(); noiseHit(t, 'bandpass', 800, 2.5, .08 * g, .05); thump(t, 140, 80, .06 * g, .07); }
function sfxAlarm() { if (!A.ctx) return; const ctx = A.ctx, t = now_(); const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1180; const am = ctx.createOscillator(); am.type = 'square'; am.frequency.value = 24; const ag = ctx.createGain(); ag.gain.value = .5; const g = ctx.createGain(); g.gain.value = .5; am.connect(ag).connect(g.gain);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 2; const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.07, t + .02); e.gain.setValueAtTime(.07, t + 1.5); e.gain.linearRampToValueAtTime(0, t + 1.6);
  o.connect(g).connect(bp).connect(e); e.connect(A.master); e.connect(A.revIn); o.start(t); am.start(t); o.stop(t + 1.7); am.stop(t + 1.7); }
function sfxChirps() { if (!A.ctx) return; const ctx = A.ctx; let t = now_() + .05; const n = 2 + Math.floor(Math.random() * 4); const base = 2800 + Math.random() * 1800; const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pn) { pn.pan.value = -.7 + Math.random() * .4; pn.connect(A.ambLP); }
  for (let i = 0; i < n; i++) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * .4), t + .05); o.frequency.exponentialRampToValueAtTime(base * .9, t + .09);
    const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.018, t + .01); e.gain.exponentialRampToValueAtTime(.0005, t + .1); o.connect(e).connect(pn || A.ambLP); o.start(t); o.stop(t + .12); t += .11 + Math.random() * .08; } }
function scoreIntro() {
  if (!A.ctx) return;
  if (startSong()) return;
  const t0 = A.ctx.currentTime + .05;
  A.pad.g.gain.cancelScheduledValues(t0); A.pad.g.gain.setValueAtTime(0, t0); A.pad.g.gain.linearRampToValueAtTime(.05, t0 + 4);
  setChord(0, t0);
  const N = [[.8, 523.25, 1.6, .05, -.2], [1.5, 440, 1.2, .045, .1], [2.2, 392, 1.0, .045, -.1], [2.9, 329.63, 2.4, .05, .15],
    [4.7, 659.25, .8, .04, .2], [5.1, 587.33, .8, .04, -.1], [5.5, 523.25, 1.8, .045, .1],
    [7.7, 349.23, 1.0, .05, -.25], [8.25, 440, 1.0, .05, -.05], [8.7, 523.25, 1.0, .05, .1], [9.1, 659.25, 3.2, .055, .25],
    [11.5, 587.33, 1.2, .045, -.1], [12.3, 523.25, 3.4, .05, .1]];
  N.forEach(n => rhodes(n[1], t0 + n[0], n[2], n[3], n[4]));
  setChord(1, t0 + 4.2); setChord(2, t0 + 7.3); setChord(3, t0 + 11.2);
  A.pad.next = t0 + 15; A.nextNote = t0 + 16;
}
function audioTick(dt) {
  if (!A.ctx) return; const t = A.ctx.currentTime;
  const vN = clamp(Math.abs(lift.v) / 7, 0, 1.2), shut = lift.doors < .05 && P.inCab;
  const rec = !!A.smp.loop, ride = lift.phase === 'riding';
  if (A.loop) { A.loop.g.gain.setTargetAtTime(.3 + .45 * clamp(vN, 0, 1), t, .3); A.loop.s.playbackRate.setTargetAtTime(.88 + .16 * clamp(vN, 0, 1), t, .3); }
  A.hum.gain.setTargetAtTime(ride && !rec ? .05 + .12 * vN : 0, t, .25);
  A.motorO.frequency.setTargetAtTime(90 + 220 * vN, t, .2); A.motorF.frequency.setTargetAtTime(180 + 420 * vN, t, .2);
  A.motorG.gain.setTargetAtTime(ride && !rec ? .012 + .03 * vN + .02 * clamp(Math.abs(lift.a) / 2, 0, 1) : 0, t, .2);
  A.rush.g.gain.setTargetAtTime(rec ? 0 : .12 * vN * vN, t, .2); A.rush.fl.frequency.setTargetAtTime(400 + 900 * vN, t, .2);
  A.ambLP.frequency.setTargetAtTime(shut ? 600 : 7000, t, .3);
  A.wind.g.gain.setTargetAtTime(shut ? .03 : lift.floor === ROOF && !P.inCab ? .14 : .055, t, .5);
  // generative music once the intro has played
  if (A.song) A.song.g.gain.setTargetAtTime(HID.active ? 0 : D.state === 'intro' ? .8 : lift.phase === 'riding' ? .4 : .55, t, HID.active ? .06 : 1.5);   // the hidden lift cuts the music
  if (D.state === 'play' && !A.song && !HID.active) {
    A.pad.g.gain.setTargetAtTime(lift.phase === 'riding' ? .028 : .036, t, 1.5);
    if (t > A.pad.next) { A.pad.next = t + 9; setChord((A.pad.chord + 1) % 4, t); }
    if (t > A.nextNote) { A.nextNote = t + 2.6 + Math.random() * 4.5; const tones = CHORD_TONES[A.pad.chord]; const f = tones[Math.floor(Math.random() * tones.length)];
      rhodes(f, t + .02, 1.6 + Math.random() * 1.4, .026 + Math.random() * .012, (Math.random() - .5) * .6);
      if (Math.random() < .35) rhodes(tones[Math.floor(Math.random() * tones.length)], t + .32 + Math.random() * .2, 1.4, .02, (Math.random() - .5) * .6); }
  }
  if (!shut && (A.nextBird || 0) < t) { A.nextBird = t + 5 + Math.random() * 9; if (D.state !== 'gate') sfxChirps(); }
}

/* ======================================================================
   THE LIFT: doors, ride planning (jerk-limited), arrival
   ====================================================================== */
const lift = { y: 7 * H, floor: 7, phase: 'closed', doors: 0, dFrom: 0, dTo: 0, dT: 0, dDur: 2.6, target: 0, plan: null, t: 0, from: 0, dir: 1, v: 0, a: 0, lamp: 7, waitT: 0, capped: false, onDone: null };
function plan(D) {
  let vmax = clamp(D / 5, 1.6, 8.5); const acc = 2.1;
  let ta = Math.PI / 2 * vmax / acc;
  if (vmax * ta > D) { vmax = Math.sqrt(D * acc / (Math.PI / 2)); ta = Math.PI / 2 * vmax / acc; }
  const tc = Math.max(0, (D - vmax * ta) / vmax);
  return { D, vmax, ta, tc, T: 2 * ta + tc };
}
function planAt(p, t) {
  const { vmax: v, ta, tc } = p; const PI = Math.PI;
  if (t <= 0) return [0, 0, 0];
  if (t < ta) return [v / 2 * (t - ta / PI * Math.sin(PI * t / ta)), v / 2 * (1 - Math.cos(PI * t / ta)), v / 2 * PI / ta * Math.sin(PI * t / ta)];
  if (t < ta + tc) return [v * ta / 2 + v * (t - ta), v, 0];
  const u = Math.min(t - ta - tc, ta); const d0 = v * ta / 2 + v * tc;
  return [d0 + v / 2 * (u + ta / PI * Math.sin(PI * u / ta)), v / 2 * (1 + Math.cos(PI * u / ta)), -v / 2 * PI / ta * Math.sin(PI * u / ta)];
}
function doorsTo(o, then) {
  if (lift.dTo === o && lift.phase === (o ? 'opening' : 'closing')) return;
  lift.dFrom = lift.doors; lift.dTo = o; lift.dT = 0; lift.dDur = Math.max(.4, (o ? 2.7 : 2.3) * Math.abs(o - lift.doors)); lift.phase = o ? 'opening' : 'closing'; lift.onDone = then || null;
  sfxDoors(!!o, lift.dDur);
}
function inCab() { return P.pos.z < CAB.z1 - .12 && Math.abs(P.pos.x) < CAB.x1 + .05; }
function buttonFor(f) { return buttons.find(b => b.act && b.act.type === 'floor' && b.act.floor === f); }
function selectFloor(f) {
  if (D.state !== 'play') return;
  const label = f === 0 ? 'the lobby' : f === ROOF ? 'the roof' : (BY_FLOOR.get(f)?.name || 'floor ' + f);
  if (!(f === 0 || f === ROOF || BY_FLOOR.has(f))) { caption(`No project on floor ${f}`); return; }
  if (lift.phase === 'riding' || lift.phase === 'arrived') { if (f !== lift.target) caption(`On the way to <b>${esc(placeName(lift.target))}</b>`); return; }
  if (!inCab()) { caption('Step into the cab first'); return; }
  const b = buttonFor(f); if (b) { b.press = 1; sfxClick(); }
  if (f === lift.floor && lift.phase !== 'closing') { if (lift.doors < 1) doorsTo(1); caption(f === 0 ? 'You are in the lobby' : `You are on <b>${esc(label)}</b>`); return; }
  buttons.forEach(x => { if (x.act.type === 'floor') x.lit = 0; }); if (b) b.lit = 1;
  lift.target = f;
  if (lift.doors > 0) { caption('Doors closing'); doorsTo(0, depart); } else depart();
}
function depart() {
  const f = lift.target; const D_ = Math.abs(f * H - lift.y);
  if (D_ < .01) { arrive(); return; }
  if (f > 0) dressLanding(f); else landing.visible = false;
  lift.plan = plan(D_); lift.t = 0; lift.from = lift.y; lift.dir = Math.sign(f * H - lift.y); lift.phase = 'riding'; lift.capped = false; lift.stopSnd = false;
  liftStartSound();
  caption(`${lift.dir > 0 ? 'Going up' : 'Going down'} · <b>${floorLabel(f)}</b>`, 3.2);
}
function arrive() {
  lift.phase = 'arrived'; lift.waitT = 0; lift.y = lift.target * H; lift.floor = lift.target; lift.v = 0; lift.a = 0; setLamp(lift.floor);
  const t = now_(); bell(t + .05, 987.77, .2); if (lift.dir < 0) bell(t + .5, 783.99, .17);
  const b = buttonFor(lift.floor); if (b) b.lit = 0;
  P.visited = false;
}
function placeName(f) { return f === 0 ? 'the lobby' : f === ROOF ? 'the roof' : (BY_FLOOR.get(f)?.name || 'floor ' + f); }
function setLamp(f) { if (f === lift.lamp) return; lift.lamp = f; drawLamps(f); if (TEX.lamp) { TEX.lamp.needsUpdate = true; TEX.lampE.needsUpdate = true; } }
function liftTick(dt) {
  if (lift.phase === 'opening' || lift.phase === 'closing') {
    lift.dT += dt; const k = clamp(lift.dT / lift.dDur, 0, 1); lift.doors = lerp(lift.dFrom, lift.dTo, easeIO(k));
    if (k >= 1) { lift.doors = lift.dTo; lift.phase = lift.dTo ? 'open' : 'closed'; const cb = lift.onDone; lift.onDone = null; if (lift.dTo) onDoorsOpen(); if (cb) setTimeout(cb, 350); }
  } else if (lift.phase === 'riding') {
    lift.t += dt; const [s, v, a] = planAt(lift.plan, lift.t);
    const prevY = lift.y; lift.y = lift.from + lift.dir * s; lift.v = lift.dir * v; lift.a = lift.dir * a;
    const cf = Math.round(lift.y / H); if (cf !== lift.lamp) { setLamp(cf); sfxTick(clamp(v / 4, .3, 1)); if (!RM) P.jolt = .6 * clamp(v / 6, .2, 1); }
    if (!lift.capped && lift.t > lift.plan.T - 2.4) { lift.capped = true; caption(`Arriving at <b>${esc(placeName(lift.target))}</b>`, 2.8); }
    if (!lift.stopSnd && lift.t > lift.plan.T - .35) { lift.stopSnd = true; liftStopSound(); }
    if (lift.t >= lift.plan.T) arrive();
  } else if (lift.phase === 'arrived') {
    lift.waitT += dt; if (lift.waitT > .75) doorsTo(1);
  }
  // door panels
  const o = lift.doors * .53;
  doors.cabL.position.x = -.265 - o; doors.cabR.position.x = .265 + o;
  const atLobby = lift.floor === 0 && lift.phase !== 'riding' && Math.abs(lift.y) < .01;
  const lo = atLobby ? o : 0; doors.lobL.position.x = -.265 - lo; doors.lobR.position.x = .265 + lo;
  const atLand = landing.visible && lift.phase !== 'riding' && Math.abs(lift.y - landing.position.y) < .01;
  const la = atLand ? o : 0; doors.landL.position.x = -.265 - la; doors.landR.position.x = .265 + la;
  if (doors.roofL) { const ra = lift.floor === ROOF && lift.phase !== 'riding' && Math.abs(lift.y - ROOF * H) < .01 ? o : 0; doors.roofL.position.x = -.265 - ra; doors.roofR.position.x = .265 + ra; }
  cab.position.y = lift.y;
  // hall dial follows the cab
  if (!hiddenDial(dt)) UI3.needle.rotation.z = damp(UI3.needle.rotation.z, dialAngle(clamp(lift.y / H, 0, TOP)), 6, dt);
}
function onDoorsOpen() {
  if (D.state !== 'play' || HID.active) return;
  const p = BY_FLOOR.get(lift.floor);
  if (p) { caption(`<b>${esc(p.name)}</b>${p.author ? ' · by ' + esc(p.author) : ''}`, 4.5); showVisit(p); hint(isTouch ? 'Walk out, or tap the painted wall, to visit' : 'Walk out, click the painted wall, or press <kbd>Enter</kbd> to visit', 6); }
  else if (lift.floor === 0) caption('Lobby', 2.4);
  else if (lift.floor === ROOF) { caption('<b>Roof garden</b>', 3.5); hint('Walk around the roof · take the lift back down when you are done', 6); }
}

/* ======================================================================
   UI: captions, hint, visit link, menu
   ====================================================================== */
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let capT = 0, hintT = 0;
function caption(html, dur = 3) { const c = $('cap'); c.innerHTML = html; c.classList.add('on'); capT = dur; }
function hint(html, dur = 7) { const h = $('hint'); h.innerHTML = html; h.classList.add('on'); hintT = dur; }
const visitA = $('visit');
function showVisit(p) { visitA.href = p.url; $('visitName').textContent = p.name + ' ↗'; $('visitSmall').textContent = `Floor ${p.floor} · step out to visit`; visitA.classList.add('on'); visitA.dataset.floor = p.floor; }
function hideVisit() { visitA.classList.remove('on', 'pulse'); }
function triggerVisit(how) {
  const p = BY_FLOOR.get(lift.floor); if (!p || lift.doors < .9 || lift.phase === 'riding') return false;
  if (P.visited && how === 'step') return false;
  P.visited = true;
  // a real link clicked inside the user's gesture: pop-up blockers allow this
  visitA.href = p.url; try { visitA.click(); } catch (e) { }
  caption(`Opening <b>${esc(p.name)}</b> in a new tab`, 3.5);
  visitA.classList.add('pulse'); setTimeout(() => visitA.classList.remove('pulse'), 2600);
  hint('If no tab opened, use the link in the corner', 6);
  return true;
}
// the maker's profiles: a real link clicked inside the press, so pop-up blockers let the new tab through
function openSocial(a) {
  const l = document.createElement('a'); l.href = a.url; l.target = '_blank'; l.rel = 'noopener'; document.body.appendChild(l);
  try { l.click(); } catch (e) { } l.remove();
  sfxClick(); caption(`Opening <b>${esc(a.label)}</b> · ${esc(a.handle)}`, 3);
}
const menu = $('menu');
function openMenu() { menu.hidden = false; if (document.pointerLockElement) document.exitPointerLock(); keys.clear(); setTimeout(() => menu.querySelector('a')?.focus(), 30); }
function closeMenu() { menu.hidden = true; $('menuBtn').focus(); }
$('menuBtn').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden ? openMenu() : closeMenu(); });
$('closeMenu').addEventListener('click', closeMenu);
menu.addEventListener('click', (e) => { if (e.target === menu) closeMenu(); });
menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } if (e.key === 'Tab') { const f = [...menu.querySelectorAll('a,button')]; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
function syncToggles() { $('togSound').setAttribute('aria-pressed', SET.sound); $('togSound').textContent = SET.sound ? 'Sound on' : 'Sound off'; $('togMotion').setAttribute('aria-pressed', RM); }
$('togSound').addEventListener('click', () => { SET.sound = !SET.sound; store('asis-settings', SET); syncToggles(); if (A.master) A.master.gain.setTargetAtTime(SET.sound ? .9 : 0, A.ctx.currentTime, .1); });
$('togMotion').addEventListener('click', () => { RM = !RM; SET.rm = RM; store('asis-settings', SET); document.body.classList.toggle('rm', RM); syncToggles(); });
syncToggles();
if (isTouch) $('menuKeys').hidden = true;

/* ======================================================================
   PLAYER + INPUT
   ====================================================================== */
const P = { pos: new V3(0, 0, 2.1), yaw: 0, pitch: 0, bob: 0, stepD: 0, inCab: false, visited: false, jolt: 0, sway: 0, dip: 0, look: new V3() };
const keys = new Set();
let locked = false, lockFailed = false, mouse = { x: -1, y: -1, in: false }, typed = '', typedT = 0;
const ray = new THREE.Raycaster(); ray.far = 2.5; const _v2 = new THREE.Vector2();
let hover = null;
function groundY() { if (P.pos.z < CAB.z1 + .02) return lift.y; return lift.floor === 0 && lift.phase !== 'riding' ? 0 : lift.floor * H; }
function rects() {
  const r = .22, out = [[CAB.x0 + r, CAB.x1 - r, CAB.z0 + r, CAB.z1 - r * .9]];
  if (HID.active && lift.floor === 0) out.push([LOBBY.x0 + r, LOBBY.x1 - r, WALL_Z + r, LOBBY.z1 - r], [-DOOR_W / 2 + .19, DOOR_W / 2 - .19, WALL_Z + .02, WALL_Z + .6]);   // nobody gets into the hidden cab
  else if (lift.doors > .92 && lift.phase === 'open') {
    out.push([-DOOR_W / 2 + .19, DOOR_W / 2 - .19, CAB.z1 - .4, WALL_Z + .6]);
    if (lift.floor === 0) out.push([LOBBY.x0 + r, LOBBY.x1 - r, WALL_Z + r, LOBBY.z1 - r]);
    else if (lift.floor === ROOF) { const e = .25 + r; out.push([RF.x0 + e, RF.x1 - e, .3 + r, RF.z1 - e], [RF.x0 + e, HH.x0 - .05 - r, RF.z0 + e, 1], [HH.x1 + .3 + r, RF.x1 - e, RF.z0 + e, 1]); }
    else out.push([LAND.x0 + r, LAND.x1 - r, WALL_Z + r, LAND.z1 - r]);
  }
  return out;
}
function inRects(x, z, R) { for (const q of R) if (x >= q[0] && x <= q[1] && z >= q[2] && z <= q[3]) return true; return false; }
function moveTo(nx, nz) {
  const R = rects();
  if (!inRects(P.pos.x, P.pos.z, R)) { const q = R[0]; P.pos.x = clamp(P.pos.x, q[0], q[1]); P.pos.z = clamp(P.pos.z, q[2], q[3]); }
  if (lift.floor === 0 && nz > WALL_Z) { const dx = nx - CARPET.x, dz = nz - CARPET.z, d = Math.hypot(dx, dz); if (d < .42) { nx = CARPET.x + dx / d * .42; nz = CARPET.z + dz / d * .42; } }
  const ok = (x, z) => inRects(x, z, R) && !(lift.floor === 0 && x > STALL.box[0] && x < STALL.box[1] && z > STALL.box[2]) && !(lift.floor === ROOF && z > .2 && ROOF_OBST.some(q => x > q[0] - .2 && x < q[1] + .2 && z > q[2] - .2 && z < q[3] + .2));
  if (ok(nx, nz)) { P.pos.x = nx; P.pos.z = nz; return; }
  if (ok(nx, P.pos.z)) { P.pos.x = nx; return; }
  if (ok(P.pos.x, nz)) { P.pos.z = nz; return; }
}
function updateHover() {
  if (D.state !== 'play' || !menu.hidden) { hover = null; return; }
  if (locked || isTouch || !mouse.in) _v2.set(0, 0); else _v2.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
  if (isTouch && !P.touchAim) { hover = null; return; }
  if (isTouch && P.touchAim) _v2.set(P.touchAim.x / innerWidth * 2 - 1, -(P.touchAim.y / innerHeight) * 2 + 1);
  ray.setFromCamera(_v2, camera);
  const hits = ray.intersectObjects(hot, false);
  let h = null;
  for (const it of hits) { const a = it.object.userData.act; if (!a) continue; if (a.type === 'visit' && !(landing.visible && lift.doors > .9 && lift.phase === 'open')) continue; if (!it.object.visible || !isVisible(it.object)) continue; h = it; break; }
  hover = h;
}
function isVisible(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function actOn(a) {
  if (!a) return;
  switch (a.type) {
    case 'floor': selectFloor(a.floor); break;
    case 'alarm': { const b = buttons.find(x => x.act.type === 'alarm'); b.press = 1; b.lit = 1; b.litT = 1.6; sfxClick(); sfxAlarm(); caption('Alarm bell', 2); break; }
    case 'stop': sfxClick(); thump(now_(), 120, 60, .2, .12); caption('The stop switch is keyed. Nobody left a key.', 3); break;
    case 'open': { const b = buttons.find(x => x.act.type === 'open'); b.press = 1; sfxClick(); if (lift.phase === 'closed' || lift.phase === 'closing') { if (lift.phase === 'closing') { lift.onDone = null; lift.target = lift.floor; buttons.forEach(x => { if (x.act.type === 'floor') x.lit = 0; }); } doorsTo(1); } break; }
    case 'close': { const b = buttons.find(x => x.act.type === 'close'); b.press = 1; sfxClick(); if (lift.phase === 'open') { if (inCab()) doorsTo(0); else caption('Step into the cab first'); } break; }
    case 'call': { UI3.call.press = 1; sfxClick(); if (hiddenTap()) break; if (lift.floor === 0 && lift.phase === 'closed') doorsTo(1); break; }
    case 'directory': openMenu(); break;
    case 'visit': triggerVisit('click'); break;
    case 'social': openSocial(a); break;
  }
}
// clickable things: the mouse cursor turns to a hand, and the centre dot (pointer lock) grows into a ring
function showHot() {
  const ret = $('ret');
  ret.classList.toggle('on', D.state === 'play' && (locked || (lockFailed && !isTouch)) && menu.hidden);
  ret.classList.toggle('hot', !!hover);
  const cur = hover && !locked && D.state === 'play' && menu.hidden ? 'pointer' : '';
  if (canvas.style.cursor !== cur) canvas.style.cursor = cur;
}
// pointer lock (desktop), drag-look fallback, touch joystick + look
canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; if (locked) look(e.movementX, e.movementY, .0022); });
canvas.addEventListener('mouseleave', () => { mouse.in = false; });
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
document.addEventListener('pointerlockerror', () => { lockFailed = true; locked = false; });
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  if (D.state !== 'play' || !menu.hidden) return;
  if (e.pointerType === 'touch') return onTouchDown(e);
  if (e.button !== 0) return;
  if (locked) { updateHover(); if (hover) actOn(hover.object.userData.act); return; }
  updateHover();
  drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId, target: hover ? hover.object.userData.act : null };
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return onTouchMove(e);
  if (!drag || locked) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true;
  if (drag.moved) { look(e.movementX || dx, e.movementY || dy, .0042); drag.x = e.clientX; drag.y = e.clientY; }
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'touch') return onTouchUp(e);
  if (!drag) return; const d = drag; drag = null;
  if (!d.moved) {
    if (d.target) actOn(d.target);
    else if (!lockFailed && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { lockFailed = true; }); } catch (err) { lockFailed = true; } }
  }
});
function look(dx, dy, k) { P.yaw -= dx * k; P.pitch = clamp(P.pitch - dy * k, -1.35, 1.35); }
const touches = new Map(); P.joy = null; P.touchAim = null;
function onTouchDown(e) {
  e.preventDefault(); const left = e.clientX < innerWidth * .42;
  if (left && !P.joy) { P.joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; const s = $('stick'); s.style.display = 'block'; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; $('knob').style.transform = ''; }
  else touches.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false });
}
function onTouchMove(e) {
  if (P.joy && e.pointerId === P.joy.id) { let dx = e.clientX - P.joy.x, dy = e.clientY - P.joy.y; const l = Math.hypot(dx, dy), m = 46; if (l > m) { dx *= m / l; dy *= m / l; } P.joy.dx = dx / m; P.joy.dy = dy / m; $('knob').style.transform = `translate(${dx}px,${dy}px)`; return; }
  const t = touches.get(e.pointerId); if (!t) return; const dx = e.clientX - t.x, dy = e.clientY - t.y; t.x = e.clientX; t.y = e.clientY;
  if (Math.hypot(e.clientX - t.sx, e.clientY - t.sy) > 8) t.moved = true; if (t.moved) look(dx, dy, .006);
}
function onTouchUp(e) {
  if (P.joy && e.pointerId === P.joy.id) { P.joy = null; $('stick').style.display = 'none'; return; }
  const t = touches.get(e.pointerId); touches.delete(e.pointerId); if (!t || t.moved || performance.now() - t.t > 450) return;
  P.touchAim = { x: e.clientX, y: e.clientY }; updateHover(); const a = hover ? hover.object.userData.act : null; P.touchAim = null; hover = null; if (a) actOn(a);
}
window.addEventListener('keydown', (e) => {
  if (!menu.hidden) return;
  if (D.state === 'gate' || D.state === 'intro') { if (D.key(e)) e.preventDefault(); return; }
  if (D.state !== 'play') return;
  if (e.target && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') && (e.key === 'Enter' || e.key === ' ')) return;
  const k = e.key;
  if (/^[0-9]$/.test(k)) { typed = (typed + k).slice(-3); typedT = 1.2; showTyped(); e.preventDefault(); return; }
  if (k === 'Backspace' && typed) { typed = typed.slice(0, -1); typedT = 1.2; showTyped(); e.preventDefault(); return; }
  if (k === 'Enter') { if (typed) commitTyped(); else triggerVisit('key'); e.preventDefault(); return; }
  if (k === 'l' || k === 'L') { if (!e.ctrlKey && !e.metaKey) { selectFloor(0); return; } }
  if (k === 'r' || k === 'R') { if (!e.ctrlKey && !e.metaKey) { selectFloor(ROOF); return; } }
  if (k === 'f' || k === 'F') { if (!e.ctrlKey && !e.metaKey) { openMenu(); e.preventDefault(); return; } }
  if (k === 'Escape') { if (document.pointerLockElement) document.exitPointerLock(); return; }
  keys.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  // keydown is a user gesture: if this step carries the player out onto a landing, open the project now
  if (pendingExit) { pendingExit = false; triggerVisit('step'); }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
function showTyped() { const t = $('typed'); if (typed) { t.textContent = 'Floor ' + typed + '_'; t.classList.add('on'); } else t.classList.remove('on'); }
function commitTyped() { const f = parseInt(typed, 10); typed = ''; typedT = 0; showTyped(); if (!isNaN(f)) selectFloor(f); }
let pendingExit = false;
function playerTick(dt, time) {
  if (D.state !== 'play') return;
  if (typedT > 0) { typedT -= dt; if (typedT <= 0 && typed) commitTyped(); }
  let f = 0, s = 0;
  if (menu.hidden) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD')) s += 1; if (keys.has('KeyA')) s -= 1;
    if (keys.has('ArrowLeft')) P.yaw += 1.8 * dt; if (keys.has('ArrowRight')) P.yaw -= 1.8 * dt;
    if (P.joy) { f -= P.joy.dy; s += P.joy.dx; }
  }
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.55 : 1;
  const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
  const sp = 1.35 * run;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const vx = (fx * f + rx * s) * sp, vz = (fz * f + rz * s) * sp;
  const ox = P.pos.x, oz = P.pos.z;
  if (l > .01) moveTo(P.pos.x + vx * dt, P.pos.z + vz * dt);
  const moved = Math.hypot(P.pos.x - ox, P.pos.z - oz);
  P.stepD += moved; if (P.stepD > .62) { P.stepD = 0; sfxStep(surfaceUnder()); }
  P.bob = RM ? 0 : damp(P.bob, moved > 1e-4 ? Math.sin(time * 9.5 * run) * .018 : 0, 10, dt);
  const was = P.inCab; P.inCab = inCab();
  if (P.inCab && !was) { P.visited = false; }
  // stepping out onto a project's landing opens it (within the key/touch gesture where browsers require one)
  if (!P.inCab && lift.floor > 0 && lift.phase === 'open' && P.pos.z > WALL_Z + .12 && !P.visited) {
    const ua = navigator.userActivation; if (!ua || ua.isActive) triggerVisit('step'); else pendingExit = true;
  }
  if (P.inCab && lift.floor > 0 && lift.phase === 'open') pendingExit = false;
  if (lift.phase === 'closing' || lift.phase === 'riding' || lift.phase === 'closed') hideVisit();
}

/* ======================================================================
   DIRECTOR: start card -> push in -> call, ding, doors -> title -> control
   ====================================================================== */
const SHOT = { credit: [1.6, 5.0], call: 5.4, ding: 6.5, doors: 7.1, logo: [8.4, 13.0], hand: [11.0, 13.4], lbOpen: 12.8, ctrl: 13.4, hint: 13.9 };
const CAM = {
  s0: { p: new V3(.62, 1.36, 4.95), l: new V3(.02, 1.2, .24), fov: 38 },
  s1: { p: new V3(.16, 1.5, 2.55), l: new V3(0, 1.3, -.6), fov: 42 },
  fp: { p: new V3(0, 1.62, 2.1), l: new V3(0, 1.55, -1.5), fov: 62 },
};
const D = {
  state: 'boot', t: 0, fade: 1, hintShown: false, called: false, dinged: false, opened: false,
  begin() {
    if (this.state !== 'gate') return;
    initAudio(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    $('start').classList.add('gone'); document.body.classList.add('letterbox');
    this.state = 'intro'; this.t = 0; scoreIntro();
  },
  key(e) {
    if (this.state === 'gate') { if (!$('pressTxt').classList.contains('wait') && e.key !== 'Tab' && e.key !== 'Shift') { this.begin(); return true; } return false; }
    if (this.state === 'intro') {
      if (this.t < 1.2) return true;
      if (this.t < SHOT.ding - .2) { this.t = SHOT.ding - .2; lift.y = 0; return true; }
      if (this.t < SHOT.hand[0]) { this.t = SHOT.hand[0]; return true; }
      return true;
    }
    return false;
  },
  tick(dt, time) {
    if (this.state === 'gate') { gateCam(time); return; }
    if (this.state !== 'intro') return;
    this.t += dt; const t = this.t;
    $('credit').classList.toggle('on', !!T_STUDIO && t > SHOT.credit[0] && t < SHOT.credit[1]);
    $('logo').classList.toggle('on', t > SHOT.logo[0] && t < SHOT.logo[1]);
    document.body.classList.toggle('letterbox', t < SHOT.lbOpen);
    // the cab comes down to the lobby
    const k = clamp((t - .4) / 5.9, 0, 1); lift.y = 7 * H * (1 - easeIO(k)); lift.v = -7 * H * (k > 0 && k < 1 ? 1 : 0) * .2;
    if (lift.y > 0) { const cf = Math.round(lift.y / H); setLamp(cf); }
    if (!this.opened) { lift.phase = 'closed'; lift.floor = lift.y < .01 ? 0 : Math.round(lift.y / H); }
    if (!this.called && t > SHOT.call) { this.called = true; UI3.call.lit = 1; UI3.call.press = 1; sfxClick(); }
    if (!this.dinged && t > SHOT.ding) { this.dinged = true; lift.y = 0; lift.floor = 0; setLamp(0); bell(now_() + .02, 987.77, .22); UI3.call.lit = 0; D.lantern = 1; }
    if (!this.opened && t > SHOT.doors) { this.opened = true; doorsTo(1); }
    // camera: slow push, then ease into first person
    const push = RM ? 0 : easeIO(clamp(t / SHOT.hand[0], 0, 1));
    const a = lerpShot(CAM.s0, CAM.s1, push), hk = RM ? (t > (SHOT.hand[0] + SHOT.hand[1]) / 2 ? 1 : 0) : easeIO(clamp((t - SHOT.hand[0]) / (SHOT.hand[1] - SHOT.hand[0]), 0, 1));
    if (RM && hk && !this.cut) { this.cut = true; this.fade = 1; }
    const s = lerpShot(a, CAM.fp, hk);
    setCam(s, t * 0.6, 1 - hk);
    gradeMat.uniforms.uAperture.value = lerp(lerp(.03, .016, push), 0, hk);
    gradeMat.uniforms.uFocus.value = s.p.distanceTo(new V3(0, 1.2, .24));
    if (t > SHOT.ctrl) this.handOver(s);
  },
  handOver(s) {
    this.state = 'play'; document.body.classList.remove('letterbox');
    P.pos.set(CAM.fp.p.x, 0, CAM.fp.p.z); P.yaw = 0; P.pitch = Math.atan2(CAM.fp.l.y - CAM.fp.p.y, CAM.fp.p.z - CAM.fp.l.z);
    lift.phase = 'open'; lift.floor = 0;
    setTimeout(() => { if (this.hintShown) return; this.hintShown = true;
      hint(isTouch ? 'Drag the left side to walk, the right side to look · tap a button to choose a floor'
        : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk · click to look around · pick a floor on the panel, or type its number', 9); }, (SHOT.hint - SHOT.ctrl) * 1000);
  },
};
function lerpShot(a, b, k) { return { p: a.p.clone().lerp(b.p, k), l: a.l.clone().lerp(b.l, k), fov: lerp(a.fov, b.fov, k) }; }
function setCam(s, time, hand) {
  camera.position.copy(s.p); camera.fov = s.fov; camera.updateProjectionMatrix();
  const l = s.l.clone();
  if (!RM && hand > 0) { camera.position.x += Math.sin(time * .7) * .012 * hand; camera.position.y += Math.sin(time * 1.1 + 1) * .008 * hand; l.x += Math.sin(time * .5 + 2) * .02 * hand; l.y += Math.sin(time * .8) * .012 * hand; }
  camera.lookAt(l);
}
function gateCam(time) {
  setCam(CAM.s0, time, 1);
  gradeMat.uniforms.uAperture.value = .03; gradeMat.uniforms.uFocus.value = CAM.s0.p.distanceTo(new V3(0, 1.2, .24));
}
D.lantern = 0;

/* ======================================================================
   TIME OF DAY: the art style follows the visitor's local clock.
   morning 5-11 painterly cool, afternoon 11-17 golden hour, evening 17-21 painterly warm, night 21-5.
   Crossing into the next period blends over about a minute. Add #morning, #afternoon, #evening
   or #night to the URL to hold one period (for reviewing a look).
   ====================================================================== */
const PERIODS = [['night', 0], ['morning', 5], ['afternoon', 11], ['evening', 17], ['night', 21]];
const PAINT_COOL = { ramp: ['#0d2627', '#245e5e', '#78cfc3', '#f2fffa'], rampMix: .74, keepGreen: .95, stroke: .38, ink: .55, radius: 2, stride: 1.0, grain: .03, high: .86 };
const LOOKS = {
  morning: Object.assign({ amount: 1, sun: [1, .93, .8], sunI: 10.5, hemiSky: [.35, .8, .78], hemiGround: [.16, .3, .28], hemiI: .7, exp: 1.0, vol: 1.7, ns: .8, ao: .45, bloom: .08,
    hor: [1.0, 1.05, .95], zen: [.3, .55, .75], glow: .6, stars: 0, lamps: .4, btnGlow: 0 }, PAINT_COOL),
  afternoon: Object.assign({ amount: 0, sun: [1, .71, .43], sunI: 9.5, hemiSky: [.45, .62, .66], hemiGround: [.32, .22, .13], hemiI: .3, exp: 1, vol: 1, ns: 1, ao: .75, bloom: .05,
    hor: [1.25, .78, .44], zen: [.16, .3, .55], glow: 1, stars: 0, lamps: 1, btnGlow: 0 }, PAINT_COOL),
  evening: { amount: 1, sun: [1, .62, .38], sunI: 9, hemiSky: [.75, .5, .55], hemiGround: [.3, .17, .14], hemiI: .55, exp: 1.08, vol: 1.3, ns: .8, ao: .5, bloom: .1,
    hor: [1.5, .7, .45], zen: [.35, .3, .5], glow: 1.2, stars: 0, lamps: 1.4, btnGlow: .15,
    ramp: ['#2b1a1d', '#7b4a42', '#e2a683', '#fff1da'], rampMix: .66, keepGreen: .55, stroke: .38, ink: .5, radius: 2, stride: 1.0, grain: .03, high: .86 },
  night: { amount: 1, sun: [.5, .66, 1], sunI: 1.5, hemiSky: [.14, .24, .45], hemiGround: [.04, .05, .08], hemiI: .14, exp: 1.3, vol: 1.2, ns: .8, ao: .6, bloom: .2,
    hor: [.05, .09, .18], zen: [.01, .02, .06], glow: .08, stars: 1, lamps: 3.4, btnGlow: .9,
    ramp: ['#050912', '#112842', '#356f86', '#ffd59a'], rampMix: .48, keepGreen: .4, stroke: .34, ink: .6, radius: 2, stride: 1.0, grain: .035, high: .82 },
};
const hexRGB = (h) => { const c = new THREE.Color(h).convertLinearToSRGB(); return [c.r, c.g, c.b]; };
for (const k in LOOKS) LOOKS[k].rampRGB = LOOKS[k].ramp.map(hexRGB);
function mixLook(a, b, t) {
  const o = {};
  for (const k in b) {
    const x = a[k], y = b[k];
    if (typeof y === 'number') o[k] = lerp(x, y, t);
    else if (k === 'rampRGB') o[k] = y.map((c, i) => c.map((v, j) => lerp(x[i][j], v, t)));
    else if (Array.isArray(y) && typeof y[0] === 'number') o[k] = y.map((v, i) => lerp(x[i], v, t));
    else o[k] = y;
  }
  // a look without painting borrows the other side's brush settings, so only the amount fades
  if (a.amount === 0) for (const k of ['rampRGB', 'rampMix', 'keepGreen', 'stroke', 'ink', 'grain', 'high']) o[k] = b[k];
  if (b.amount === 0) for (const k of ['rampRGB', 'rampMix', 'keepGreen', 'stroke', 'ink', 'grain', 'high']) o[k] = a[k];
  return o;
}
function periodAt(d) { const h = d.getHours() + d.getMinutes() / 60; let p = 'night'; for (const [name, at] of PERIODS) if (h >= at) p = name; return p; }
const heldPeriod = () => { const h = location.hash.replace('#', ''); return h in LOOKS ? h : null; };
let LOOK = LOOKS.afternoon, lookKey = null, lookFrom = null, lookT = 1, nsMats = null, lastNs = -1;
function setLook(key, instant) {
  if (key === lookKey) return;
  lookFrom = instant || !lookKey ? LOOKS[key] : LOOK; lookKey = key; lookT = instant ? 1 : 0;
  document.body.dataset.look = key;
}
function applyLookParams(L) {
  sun.color.setRGB(...L.sun); sun.intensity = L.sunI;
  hemi.color.setRGB(...L.hemiSky); hemi.groundColor.setRGB(...L.hemiGround); hemi.intensity = L.hemiI;
  gradeMat.uniforms.uAOs.value = L.ao; gradeMat.uniforms.uBloom.value = L.bloom;
  const su = skyMat.uniforms; su.uHor.value.set(...L.hor); su.uZen.value.set(...L.zen); su.uGlow.value = L.glow; su.uStars.value = L.stars;
  if (UI3.sconceLight) { UI3.sconceLight.intensity = .9 * L.lamps; UI3.sconce.material.emissiveIntensity = 5 * L.lamps; }
  if (UI3.cabLight) UI3.cabLight.intensity = 1.1 * L.lamps;
  if (UI3.landLight) UI3.landLight.intensity = 2.4 * L.lamps;
  M.bulb.emissiveIntensity = 14 * Math.max(.6, L.lamps);
  if (Math.abs(L.ns - lastNs) > .002) {
    lastNs = L.ns;
    if (!nsMats) { nsMats = new Set(); scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.normalScale) { m.userData.ns0 = m.normalScale.clone(); nsMats.add(m); } }); }
    for (const m of nsMats) m.normalScale.copy(m.userData.ns0).multiplyScalar(L.ns);
  }
  const u = styMat.uniforms;
  L.rampRGB.forEach((c, i) => u['uR' + i].value.setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace));
  u.uRampMix.value = L.rampMix; u.uKeepGreen.value = L.keepGreen; u.uStroke.value = L.stroke; u.uInk.value = L.ink; u.uRadius.value = Math.round(L.radius); u.uStride.value = L.stride; u.uGrain.value = L.grain; u.uHigh.value = L.high; u.uAmount.value = L.amount; u.uDetail.value = .4;
}
let clockCheck = 0;
function lookTick(dt) {
  clockCheck -= dt;
  if (clockCheck <= 0) { clockCheck = 5; setLook(heldPeriod() || periodAt(new Date()), false); }
  if (lookT < 1) { lookT = Math.min(1, lookT + dt / 60); }
  LOOK = lookT >= 1 ? LOOKS[lookKey] : mixLook(lookFrom, LOOKS[lookKey], easeIO(lookT));
  if (lookT >= 1) lookFrom = LOOK;
  applyLookParams(LOOK);
}
window.addEventListener('hashchange', () => setLook(heldPeriod() || periodAt(new Date()), true));

/* ======================================================================
   FRAME
   ====================================================================== */
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
let lastT = performance.now(), frameN = 0, ema = 16, slowT = 0, fastT = 0, sunTime = 0;
let exposure = .95;
function tick(dt, time) {
  lookTick(dt);
  roofTick(dt, time);
  D.tick(dt, time);
  if (D.state === 'intro' || D.state === 'play') liftTick(dt);
  playerTick(dt, time);
  // first-person camera, carried by the cab
  if (D.state === 'play') {
    const gy = groundY();
    const vN = clamp(Math.abs(lift.v) / 7, 0, 1);
    P.dip = damp(P.dip, RM ? 0 : -lift.a * .012, 4, dt);
    P.jolt = Math.max(0, P.jolt - dt * 3);
    const sw = RM ? 0 : (Math.sin(time * 1.7) * .5 + Math.sin(time * 2.9 + 1) * .5) * .006 * vN;
    camera.position.set(P.pos.x + sw, gy + 1.62 + P.bob + P.dip + (RM ? 0 : Math.sin(time * 40) * .0025 * P.jolt), P.pos.z);
    _e.set(P.pitch, P.yaw, RM ? 0 : sw * .4, 'YXZ'); camera.quaternion.setFromEuler(_e);
    camera.fov = damp(camera.fov, 62, 4, dt); camera.updateProjectionMatrix();
  }
  // sun drift: slow across the doors on the start shot
  sunTime += dt * (D.state === 'gate' ? 1 : .25);
  const drift = RM ? 0 : 1;
  sunDir.copy(SUN_BASE).applyAxisAngle(new V3(0, 1, 0), drift * (.07 * Math.sin(sunTime * .06) + .02 * Math.sin(sunTime * .17))).normalize();
  sunDir.y = SUN_BASE.y + drift * .02 * Math.sin(sunTime * .045); sunDir.normalize();
  // what the sun's shadow camera frames: the lobby, the cab in the shaft, or a landing
  const inLobby = D.state !== 'play' || (lift.floor === 0 && lift.phase !== 'riding' && (lift.doors > 0 || !P.inCab));
  const onRoof = D.state === 'play' && lift.floor === ROOF && lift.phase !== 'riding' && (lift.doors > 0 || !P.inCab);
  const onLanding = !onRoof && D.state === 'play' && lift.floor > 0 && lift.phase !== 'riding' && lift.doors > 0;
  if (inLobby) { sunFocus.set(-.8, 1.5, 1.4); setShadowExtent(5.4); }
  else if (onRoof) { sunFocus.set(clamp(P.pos.x, -3, 3), lift.y + 1.5, clamp(P.pos.z, 1, 7)); setShadowExtent(8.5); }
  else if (onLanding) { sunFocus.set(-.2, lift.y + 1.4, .6); setShadowExtent(3.3); }
  else { sunFocus.set(-.4, lift.y + 1.3, -1.0); setShadowExtent(2.3); }
  updateSun();
  // light that bounces off the sunlit patch inside the cab: follows how much of a shaft window lines up with the grille
  const g0 = lift.y + GRILLE.y0 + .3, g1 = lift.y + GRILLE.y1 + .3; let ov = 0;
  for (let f = Math.floor(g0 / H) - 1; f <= Math.floor(g1 / H) + 1; f++) { const w0 = f * H + 1.0, w1 = f * H + 3.1; ov += Math.max(0, Math.min(g1, w1) - Math.max(g0, w0)); }
  ov /= (g1 - g0);
  UI3.cabBounce.intensity = damp(UI3.cabBounce.intensity, 1.5 * ov * LOOK.sunI / 9.5, 12, dt);
  UI3.lobbyBounce.intensity = 2.2 * LOOK.sunI / 9.5;
  // exposure: open up a little inside the cab
  exposure = damp(exposure, (inLobby ? .95 : onRoof ? .72 : onLanding ? 1.0 : 1.18)*LOOK.exp, 1.5, dt);
  if (onRoof) hemi.intensity *= 2.4;
  gradeMat.uniforms.uExposure.value = exposure;
  volMat.uniforms.uDensity.value = (inLobby ? .32 : onRoof ? .03 : .45)*LOOK.vol;
  // buttons: press travel and amber glow
  for (const b of buttons) {
    b.press = Math.max(0, b.press - dt * 7); b.face.position.z = .006 - b.press * .0028;
    if (b.litT > 0) { b.litT -= dt; if (b.litT <= 0) b.lit = 0; }
    const isHover = hover && hover.object.userData.btn === b;
    const target = b.lit ? (b.label === 'ALARM' ? 2.2 + Math.sin(time * 40) * 1.2 : 3.4) : isHover ? .35 + LOOK.btnGlow : LOOK.btnGlow;
    b.glow = damp(b.glow, target, b.lit ? 9 : 5, dt); b.mat.emissiveIntensity = b.glow;
  }
  // arrival lantern in the lobby
  const lanternOn = D.lantern && lift.floor === 0 && lift.doors > 0;
  if (!lanternOn && lift.phase === 'closed') D.lantern = 0;
  if (lift.phase === 'arrived' && lift.floor === 0) D.lantern = 1;
  const lv = lanternOn || (lift.phase === 'arrived' && lift.floor === 0) ? 1 : 0;
  const up = lift.dir >= 0 || D.state !== 'play';
  if (!hiddenLanterns(time)) {
    UI3.lampUp.material.emissiveIntensity = damp(UI3.lampUp.material.emissiveIntensity, lv && up ? 6 : 0, 8, dt);
    UI3.lampDn.material.emissiveIntensity = damp(UI3.lampDn.material.emissiveIntensity, lv && !up ? 6 : 0, 8, dt);
    UI3.lanternLight.intensity = lv ? .25 : 0;
  }
  hiddenTick(dt, time);
  // captions
  if (capT > 0) { capT -= dt; if (capT <= 0) $('cap').classList.remove('on'); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').classList.remove('on'); }
  updateHover(); showHot();
  audioTick(dt);
  // shared shader inputs
  skyMat.uniforms.uSun.value.copy(sunDir).negate(); skyMat.uniforms.uTime.value = time;
  MOTE_U.uTime.value = time; MOTE_U.uScale.value = Hh * .02;
  UNI.sunCol.value.set(sun.color.r, sun.color.g, sun.color.b).multiplyScalar(sun.intensity);
}
const _ivp = new THREE.Matrix4();
function render(time) {
  frameN++;
  camera.updateMatrixWorld();
  sky.position.copy(camera.position);
  UNI.sunView.value.copy(sunDir).transformDirection(camera.matrixWorldInverse);
  if (sun.shadow.map) { MOTE_U.tShadow.value = sun.shadow.map.texture; MOTE_U.uShadowMat.value.copy(sun.shadow.matrix); }
  renderer.setRenderTarget(rtMain); renderer.clear(); renderer.render(scene, camera);
  // ambient occlusion
  aoMat.uniforms.uInvP.value.copy(camera.projectionMatrixInverse); aoMat.uniforms.uP.value.copy(camera.projectionMatrix); aoMat.uniforms.uFrame.value = frameN % 64;
  pass(aoMat, rtAO);
  // light shafts through the windows, marched against the sun's shadow map
  const vu = volMat.uniforms;
  vu.tShadow.value = sun.shadow.map ? sun.shadow.map.texture : null; vu.uShadowMat.value.copy(sun.shadow.matrix);
  vu.uInvVP.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
  vu.uCam.value.copy(camera.position); vu.uSunDir.value.copy(sunDir); vu.uTime.value = time; vu.uFrame.value = frameN % 64;
  vu.uSunCol.value.set(sun.color.r, sun.color.g, sun.color.b).multiplyScalar(sun.intensity * .5);
  vu.uBoxMin.value.set(LOBBY.x0, Math.min(0, lift.y) - .1, SHAFT.z0); vu.uBoxMax.value.set(LOBBY.x1, Math.max(LOBBY.h, lift.y + LAND.h), LOBBY.z1);
  if (vu.tShadow.value) pass(volMat, rtVol); else { renderer.setRenderTarget(rtVol); renderer.clear(); }
  // bloom chain
  let src = rtMain.texture, sw = W, sh = Hh;
  for (let i = 0; i < BLOOM_N; i++) {
    downMat.uniforms.tSrc.value = src; downMat.uniforms.uTexel.value.set(1 / sw, 1 / sh); downMat.uniforms.uPre.value = i === 0 ? 1 : 0;
    pass(downMat, rtBloom[i]); src = rtBloom[i].texture; sw = rtBloom[i].width; sh = rtBloom[i].height;
  }
  for (let i = BLOOM_N - 1; i > 0; i--) { upMat.uniforms.tSrc.value = rtBloom[i].texture; upMat.uniforms.uTexel.value.set(1 / rtBloom[i].width, 1 / rtBloom[i].height); pass(upMat, rtBloom[i - 1]); }
  // grade and anti-alias
  const gu = gradeMat.uniforms; gu.uTime.value = time; gu.uNear.value = camera.near; gu.uFar.value = camera.far;
  D.fade = Math.max(0, D.fade - 1 / 60 * 1.4); if (D.cut && D.fade <= 0) D.cut = false;
  gu.uFade.value = D.fade;
  pass(gradeMat, rtLDR);
  if (LOOK.amount > .002) { styMat.uniforms.uNear.value = camera.near; styMat.uniforms.uFar.value = camera.far; pass(styMat, rtSty); fxaaMat.uniforms.tSrc.value = rtSty.texture; }
  else fxaaMat.uniforms.tSrc.value = rtLDR.texture;
  pass(fxaaMat, null);
}
const dbgEl = (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:calc(10px + env(safe-area-inset-left,0px));top:calc(10px + env(safe-area-inset-top,0px));z-index:40;font:11px/1.5 ui-monospace,Menlo,monospace;color:#f6efe3;background:rgba(0,0,0,.55);padding:6px 9px;border-radius:6px;pointer-events:none;white-space:pre'; d.hidden = true; document.body.appendChild(d); return d; })();
let dbgT = 0;
function debugTick(dtMs) {
  const on = location.hash === '#debug'; dbgEl.hidden = !on; if (!on) return;
  dbgT += dtMs; if (dbgT < 250) return; dbgT = 0;
  dbgEl.textContent = `${(1000 / ema).toFixed(0)} fps (${ema.toFixed(1)} ms)\nresolution ${W}×${Hh}  scale ${renderScale.toFixed(2)}\nlook ${lookKey}${lookT < 1 ? ' (blending)' : ''}`;
}
function adapt(dtMs) {
  ema = ema * .93 + dtMs * .07;
  if (ema > 24) { slowT += dtMs; fastT = 0; } else if (ema < 17.6) { fastT += dtMs; slowT = 0; } else { slowT = 0; fastT = 0; }
  if (slowT > 1500 && renderScale > .56) { renderScale = Math.max(.55, renderScale * .86); slowT = 0; resize(); }
  if (fastT > 7000 && renderScale < 1) { renderScale = Math.min(1, renderScale * 1.08); fastT = 0; resize(); }
}
function loop(now) {
  requestAnimationFrame(loop);
  const dtMs = Math.min(100, now - lastT); lastT = now; const dt = Math.min(.05, dtMs / 1000) * (window.__test && window.__ts || 1);
  if (document.hidden) return;
  tick(dt, now / 1000); render(now / 1000);
  if (D.state !== 'boot' && !window.__test) adapt(dtMs);
  debugTick(dtMs);
}

/* ======================================================================
   BOOT
   ====================================================================== */
(async function boot() {
  resize();
  const pr = $('pressTxt'); const progress = (s) => { pr.textContent = s; };
  try { await buildScene(progress); }
  catch (e) { console.error(e); noGL('Something went wrong while building the lift.'); return; }
  lift.y = 7 * H; cab.position.y = lift.y; setLamp(7); drawLamps(7); TEX.lamp.needsUpdate = true; TEX.lampE.needsUpdate = true;
  UI3.needle.rotation.z = dialAngle(7);
  camera.position.copy(CAM.s0.p); camera.lookAt(CAM.s0.l); camera.fov = CAM.s0.fov; camera.updateProjectionMatrix();
  setLook(heldPeriod() || periodAt(new Date()), true); lookTick(0);
  D.state = 'gate'; D.fade = 0;
  if (window.__test) window.__dbg = { D, lift, P, camera, landing, dressLanding, setLook, setLamp, gradeMat, A, selectFloor, ROOF, H, surfaceUnder, hot, HID, startHidden, ROOF_STONES, sfxStep, initAudio };
  requestAnimationFrame(loop);
  // warm up a few frames (shader compile), then fade in from black
  await nextFrame(); await nextFrame(); await nextFrame();
  $('fade').classList.add('out');
  pr.classList.remove('wait'); pr.textContent = isTouch ? 'Tap to enter' : 'Press any key to enter';
  const st = $('start'); try { window.focus(); } catch (e) { } st.focus({ preventScroll: true });
  st.addEventListener('click', () => D.begin());
  st.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); D.begin(); } });
})();
