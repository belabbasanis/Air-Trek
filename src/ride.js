/* ======================================================================
   THE RIDE: floor 3's sailboat carries you into Updraft's sea cliffs. The game is its own page (updraft/index.html), put
   in a frame over the building only when you board, so nothing of it loads before then. While you ride, the building
   stops drawing and its sound waits; riding through the torii at the end of the course, or "Back to the building" in
   the game's pause panel, brings you back beside the boat. A black cut each way.
   The game talks back with postMessage: updraft:ready (its intro is about to fade in), updraft:done, updraft:exit.
   ====================================================================== */
const RIDE = { on: false, hold: false, ready: false, leaving: false, frame: null, veil: null, timer: 0 };
function rideVeil(msg) {
  if (!RIDE.veil) { const v = document.createElement('div'); v.id = 'rideVeil'; v.innerHTML = '<span></span>'; document.body.appendChild(v); RIDE.veil = v; }
  if (msg !== undefined) RIDE.veil.querySelector('span').textContent = msg;
  return RIDE.veil;
}
function startRide() {
  if (RIDE.on || D.state !== 'play') return;
  RIDE.on = true; RIDE.ready = false; hover = null; keys.clear(); dropTouches(); hideVisit();
  if (document.pointerLockElement) document.exitPointerLock();
  sfxClick();
  const v = rideVeil('Out to the cliffs'); void v.offsetWidth; v.classList.add('on');
  setTimeout(() => {                                   // the screen is black: stop drawing the building, hush it, open the ride
    RIDE.hold = true; if (A.ctx && A.ctx.state === 'running') A.ctx.suspend();
    const f = document.createElement('iframe');
    f.id = 'ride'; f.title = 'Updraft · the sea cliffs'; f.allow = 'autoplay; fullscreen; gamepad';
    f.src = 'updraft/index.html' + (window.__test ? '?test' : '');
    f.addEventListener('load', () => { try { f.contentWindow.focus(); } catch (e) { } });
    document.body.appendChild(f); RIDE.frame = f;
    clearTimeout(RIDE.timer);
    RIDE.timer = setTimeout(() => { if (RIDE.frame && !RIDE.ready) { endRide(); caption('The cliffs could not be reached just now', 3.5); } }, 45000);
  }, 750);
}
function endRide() {
  if (!RIDE.on || RIDE.leaving) return;
  RIDE.leaving = true; clearTimeout(RIDE.timer);
  const v = rideVeil(''); v.classList.add('on');
  setTimeout(() => {
    if (RIDE.frame) { RIDE.frame.remove(); RIDE.frame = null; }
    RIDE.ready = false; RIDE.hold = false; lastT = performance.now();
    // back at the breach, the boat broadside in front of you and the sea beyond it
    const B = SC_BOAT; P.pos.set(B.x - .8, 0, B.z - 3.3); P.yaw = Math.atan2(-(B.x - P.pos.x), -(B.z - P.pos.z)); P.pitch = .02;
    if (A.ctx && A.ctx.state === 'suspended' && SET.sound) A.ctx.resume();
    try { window.focus(); canvas.focus({ preventScroll: true }); } catch (e) { }
    setTimeout(() => { v.classList.remove('on'); RIDE.on = false; RIDE.leaving = false; }, 350);   // a beat of black, then the room
  }, 750);
}
addEventListener('message', (e) => {
  if (!RIDE.frame || e.source !== RIDE.frame.contentWindow) return;
  const t = e.data && e.data.type;
  if (t === 'updraft:ready') { RIDE.ready = true; clearTimeout(RIDE.timer); rideVeil().classList.remove('on'); }   // the game's intro fades in from black itself
  else if (t === 'updraft:done' || t === 'updraft:exit') endRide();
});
