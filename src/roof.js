
/* ======================================================================
   ROOF GARDEN (stop R): headhouse over the lift, parapet and rail, lawn,
   tin shack, chicken run, raised beds, greenhouse, vegetable rows, water
   tower, windmill, solar panels, a clothesline; the sea and a city skyline
   beyond. Birds fly between perches; chickens wander and peck.
   Coordinates are local to the roof group (y = 0 is the roof surface,
   the lift doors face +z at z = 0).
   ====================================================================== */
const roof = new THREE.Group(); roof.visible = false; scene.add(roof);
const outside = new THREE.Group(); outside.visible = false; scene.add(outside);
const RF = { x0: -7.2, x1: 7.2, z0: -3.2, z1: 11.2 };          // outer edge of the parapet
const HH = { x0: -1.55, x1: 1.55, z0: -2.52, z1: WALL_Z, h: 3.45 };   // headhouse over the shaft
const ROOF_OBST = [];          // [x0, x1, z0, z1] boxes the player can't walk into
const ROOF_NOGRASS = [];       // [x0, x1, z0, z1] where no grass blades grow
const PERCHES = [];            // V3 points birds can land on
const CHICK_RUN = { x0: -6.6, x1: -3.55, z0: 4.95, z1: 9.75 };
const roofLive = { chickens: [], birds: [], gulls: [], cloth: [], rotor: null, grass: null };

function buildRoof() {
  roof.position.y = ROOF * H;
  const b = new Bucket(), r = rng(808);
  const ob = (x0, x1, z0, z1, grass = true) => { ROOF_OBST.push([x0, x1, z0, z1]); if (!grass) ROOF_NOGRASS.push([x0, x1, z0, z1]); };
  // ---- roof slab (around the shaft), lawn, parapet with rail ----
  const S = SHAFT;
  for (const g of [bb(RF.x0, S.x0 - .2, -.3, 0, RF.z0, RF.z1), bb(S.x1 + .2, RF.x1, -.3, 0, RF.z0, RF.z1), bb(S.x0 - .2, S.x1 + .2, -.3, 0, RF.z0, S.z0 - .2), bb(S.x0 - .2, S.x1 + .2, -.3, 0, 0, RF.z1)]) b.add(M.grass, wuv(g, 3, 3));
  const PH = .62;
  for (const g of [bb(RF.x0, RF.x1, 0, PH, RF.z1 - .25, RF.z1), bb(RF.x0, RF.x1, 0, PH, RF.z0, RF.z0 + .25), bb(RF.x0, RF.x0 + .25, 0, PH, RF.z0, RF.z1), bb(RF.x1 - .25, RF.x1, 0, PH, RF.z0, RF.z1)]) b.add(M.conc, wuv(g, 2, 1));
  for (const g of [bb(RF.x0 - .03, RF.x1 + .03, PH, PH + .05, RF.z1 - .28, RF.z1 + .03), bb(RF.x0 - .03, RF.x1 + .03, PH, PH + .05, RF.z0 - .03, RF.z0 + .28), bb(RF.x0 - .03, RF.x0 + .28, PH, PH + .05, RF.z0, RF.z1), bb(RF.x1 - .28, RF.x1 + .03, PH, PH + .05, RF.z0, RF.z1)]) b.add(M.conc, wuv(g, 1, 1));
  const rail = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 1.6));
    for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(ax, bx, t), z = lerp(az, bz, t); b.add(M.ironM, rod(new V3(x, PH + .05, z), new V3(x, 1.08, z), .018, 6)); }
    for (const y of [1.08, .87]) b.add(M.ironM, rod(new V3(ax, y, az), new V3(bx, y, bz), y > 1 ? .024 : .014, 8));
    for (let i = 0; i < Math.max(2, Math.round(L / 2.5)); i++) { const t = (i + .5) / Math.max(2, Math.round(L / 2.5)); PERCHES.push(new V3(lerp(ax, bx, t), 1.11, lerp(az, bz, t))); }
  };
  const ri = .125;
  rail(RF.x0 + ri, RF.z1 - ri, RF.x1 - ri, RF.z1 - ri); rail(RF.x0 + ri, RF.z0 + ri, RF.x1 - ri, RF.z0 + ri);
  rail(RF.x0 + ri, RF.z0 + ri, RF.x0 + ri, RF.z1 - ri); rail(RF.x1 - ri, RF.z0 + ri, RF.x1 - ri, RF.z1 - ri);

  // ---- headhouse over the lift: concrete shell, door opening, window lined up with the shaft window, ladder, solar on top ----
  const winZ = [-1.95, -.05], winY = [1.0, 3.1];
  for (const g of holedWall('x', HH.x0, HH.x0 + .2, HH.z0, HH.z1, 0, HH.h, [[winZ[0], winZ[1], winY[0], winY[1]]])) b.add(M.conc, wuv(g, 2, HH.h));
  for (const g of holedWall('x', HH.x1 - .2, HH.x1, HH.z0, HH.z1, 0, HH.h, [])) b.add(M.conc, wuv(g, 2, HH.h));
  for (const g of holedWall('z', HH.z0, HH.z0 + .2, HH.x0, HH.x1, 0, HH.h, [])) b.add(M.conc, wuv(g, 2, HH.h));
  for (const g of holedWall('z', 0, HH.z1, HH.x0, HH.x1, 0, HH.h, [[-DOOR_W / 2, DOOR_W / 2, -1, DOOR_H]])) b.add(M.conc, wuv(g, 2, HH.h));
  b.add(M.conc, wuv(bb(HH.x0 - .12, HH.x1 + .12, HH.h, HH.h + .18, HH.z0 - .12, HH.z1 + .12), 2, 2));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, -DOOR_W / 2, 0, DOOR_H + .12, WALL_Z, WALL_Z + .05), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(DOOR_W / 2, DOOR_W / 2 + .12, 0, DOOR_H + .12, WALL_Z, WALL_Z + .05), .5, DOOR_H + .12));
  b.add(M.cream, wuv(bb(-DOOR_W / 2 - .12, DOOR_W / 2 + .12, DOOR_H, DOOR_H + .14, WALL_Z, WALL_Z + .05), .5, .5, DOOR_H));
  b.add(M.brass, wuv(bb(-DOOR_W / 2, DOOR_W / 2, -.01, .008, 0, WALL_Z + .03), .3, .3));
  for (let i = 0; i <= 2; i++) { const z = lerp(winZ[0], winZ[1], i / 2); b.add(M.iron, bb(HH.x0 - .02, HH.x0 + .03, winY[0], winY[1], z - .02, z + .02)); }
  for (const y of [winY[0], 2.05, winY[1]]) b.add(M.iron, bb(HH.x0 - .02, HH.x0 + .03, y - .02, y + .02, winZ[0], winZ[1]));
  // ladder up the right side of the headhouse
  for (const z of [-.95, -.55]) b.add(M.ironM, rod(new V3(HH.x1 + .14, 0, z), new V3(HH.x1 + .14, HH.h + .7, z), .018, 6));
  for (let y = .3; y < HH.h + .5; y += .3) b.add(M.ironM, rod(new V3(HH.x1 + .14, y, -.95), new V3(HH.x1 + .14, y, -.55), .012, 5));
  for (const z of [-.95, -.55]) b.add(M.ironM, rod(new V3(HH.x1 + .14, HH.h - .2, z), new V3(HH.x1, HH.h - .2, z), .012, 5));
  // painted R
  const rTex = plateTex(256, 256, (x) => { x.clearRect(0, 0, 256, 256); x.font = `400 220px ${FONT_STENCIL}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#efe6d2'; x.fillText('R', 128, 140); x.globalCompositeOperation = 'destination-out'; const q = rng(5); for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(0,0,0,${q() * .9})`; x.beginPath(); x.arc(q() * 256, q() * 256, q() * 3, 0, 6.283); x.fill(); } });
  const rDec = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshStandardMaterial({ map: rTex, transparent: true, roughness: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  rDec.position.set(.95, 2.75, WALL_Z + .006); rDec.receiveShadow = true; roof.add(rDec);
  ob(HH.x0 - .05, HH.x1 + .3, HH.z0 - .05, .25, false);

  // ---- solar panels: on the headhouse roof and in a row on the right ----
  const solarTex = plateTex(512, 512, (x) => { x.fillStyle = '#0c1424'; x.fillRect(0, 0, 512, 512); x.strokeStyle = '#7a8aa8'; x.lineWidth = 3; for (let i = 0; i <= 6; i++) { x.beginPath(); x.moveTo(i * 85.3, 0); x.lineTo(i * 85.3, 512); x.stroke(); } for (let i = 0; i <= 10; i++) { x.beginPath(); x.moveTo(0, i * 51.2); x.lineTo(512, i * 51.2); x.stroke(); } x.strokeStyle = 'rgba(160,170,190,.35)'; x.lineWidth = 1; for (let i = 0; i < 60; i++) { x.beginPath(); x.moveTo(0, i * 8.5); x.lineTo(512, i * 8.5); x.stroke(); } });
  const solarMat = new THREE.MeshStandardMaterial({ map: solarTex, roughness: .22, metalness: .35, envMapIntensity: 1.2 });
  const panel = (x, y, z, ry, tilt) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; roof.add(g);
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, .04, 1.6), solarMat); p.rotation.x = -tilt; p.position.y = .5; p.castShadow = p.receiveShadow = true; g.add(p);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.04, .03, 1.64), M.chrome); fr.rotation.x = -tilt; fr.position.y = .48; g.add(fr);
    for (const sz of [-.6, .6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.04, .5 + sz * Math.sin(tilt) * -1, .04), M.ironM); leg.position.set(0, (.5 + sz * Math.sin(tilt) * -1) / 2, sz * Math.cos(tilt)); g.add(leg); }
  };
  panel(-.6, HH.h + .18, -1.1, 0, .45); panel(.6, HH.h + .18, -1.1, 0, .45);
  for (let i = 0; i < 4; i++) panel(6.35, 0, -.2 + i * 1.75, -Math.PI / 2 + .15, .5);
  ob(5.7, 6.95, -1.3, 6.2, false);

  // ---- water tower behind, on the right ----
  const WT = new V3(5.4, 0, -1.75);
  for (const [dx, dz] of [[-.75, -.75], [.75, -.75], [-.75, .75], [.75, .75]]) b.add(M.ironM, rod(new V3(WT.x + dx, 0, WT.z + dz), new V3(WT.x + dx * .8, 2.55, WT.z + dz * .8), .045, 8));
  for (const y of [.9, 1.8]) for (const [ax, az, bx, bz] of [[-.75, -.75, .75, .75], [.75, -.75, -.75, .75]]) b.add(M.ironM, rod(new V3(WT.x + ax * .9, y - .5, WT.z + az * .9), new V3(WT.x + bx * .9, y + .3, WT.z + bz * .9), .016, 5));
  const tank = new THREE.Mesh(wuv(new THREE.CylinderGeometry(.95, .95, 1.5, 28).translate(WT.x, 2.55 + .75, WT.z), 2, 1.5, 2.55), M.cream); tank.castShadow = tank.receiveShadow = true; roof.add(tank);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.02, .45, 28).translate(WT.x, 2.55 + 1.5 + .22, WT.z), M.corr); cone.castShadow = true; cone.receiveShadow = true; roof.add(cone);
  for (const y of [2.7, 3.35, 3.95]) b.add(M.ironM, new THREE.TorusGeometry(.96, .02, 5, 40).rotateX(Math.PI / 2).translate(WT.x, y, WT.z));
  for (const dz of [-.2, .2]) b.add(M.ironM, rod(new V3(WT.x - .97, .2, WT.z + dz), new V3(WT.x - .97, 4.0, WT.z + dz), .014, 5));
  for (let y = .4; y < 4; y += .32) b.add(M.ironM, rod(new V3(WT.x - .97, y, WT.z - .2), new V3(WT.x - .97, y, WT.z + .2), .01, 4));
  PERCHES.push(new V3(WT.x, 4.45, WT.z), new V3(WT.x + .5, 4.2, WT.z + .5));
  ob(WT.x - 1.05, WT.x + 1.05, WT.z - 1.05, WT.z + 1.05);

  // ---- tin shack on the left: blue planks, rusty corrugated roof, door facing the path ----
  const SH = { x0: -6.65, x1: -4.05, z0: .9, z1: 3.4 };
  for (const g of holedWall('x', SH.x1 - .08, SH.x1, SH.z0, SH.z1, 0, 2.3, [[1.75, 2.6, 0, 1.95]])) b.add(M.plankBlue, wuv(g, 1.2, 2.3));
  for (const g of holedWall('x', SH.x0, SH.x0 + .08, SH.z0, SH.z1, 0, 2.0, [])) b.add(M.plankBlue, wuv(g, 1.2, 2.3));
  for (const g of holedWall('z', SH.z1 - .08, SH.z1, SH.x0, SH.x1, 0, 2.0, [[-5.8, -5.0, 1.0, 1.6]])) b.add(M.plankBlue, wuv(g, 1.2, 2.3));
  for (const g of holedWall('z', SH.z0, SH.z0 + .08, SH.x0, SH.x1, 0, 2.0, [])) b.add(M.plankBlue, wuv(g, 1.2, 2.3));
  // gable tops of the side walls (roof slopes down toward -x)
  for (const z of [SH.z0, SH.z1 - .08]) { const sh = new THREE.Shape([new THREE.Vector2(SH.x0, 2.0), new THREE.Vector2(SH.x1, 2.0), new THREE.Vector2(SH.x1, 2.3)]); const g = new THREE.ExtrudeGeometry(sh, { depth: .08, bevelEnabled: false }); g.translate(0, 0, z); const m = new THREE.Mesh(g, M.plankBlue); m.castShadow = true; roof.add(m); }
  const roofG = new THREE.BoxGeometry(SH.x1 - SH.x0 + .5, .05, SH.z1 - SH.z0 + .5); roofG.rotateZ(Math.atan2(.3, SH.x1 - SH.x0)); roofG.translate((SH.x0 + SH.x1) / 2, 2.2, (SH.z0 + SH.z1) / 2);
  b.add(M.corr, wuv(roofG, 1.2, 1.2));
  b.add(M.plankWood, wuv(bb(SH.x1 - .04, SH.x1 + .02, 0, 1.95, 1.75, 2.6), 1, 2));   // door, slightly ajar
  b.add(M.chrome, new THREE.SphereGeometry(.025, 8, 6).translate(SH.x1 + .04, 1.0, 2.5));
  b.add(M.ironM, bb(-5.8, -5.0, 1.57, 1.6, SH.z1 - .06, SH.z1 + .02)); b.add(M.ironM, bb(-5.42, -5.38, 1.0, 1.6, SH.z1 - .06, SH.z1 + .02));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(.8, .6), M.glass); glass.position.set(-5.4, 1.3, SH.z1 + .01); roof.add(glass);
  PERCHES.push(new V3(SH.x1 + .1, 2.33, 1.6), new V3(SH.x1 + .1, 2.33, 2.9));
  ob(SH.x0 - .1, SH.x1 + .1, SH.z0 - .1, SH.z1 + .1, false);
  // pots by the shack door
  const potPts = [[0, 0], [.09, 0], [.1, .02], [.12, .22], [.14, .24], [.14, .27], [.12, .27], [.11, .25], [0, .25]].map(p => new THREE.Vector2(p[0], p[1]));
  const potG = new THREE.LatheGeometry(potPts, 18);
  for (const [x, z, s_] of [[-3.75, 1.2, 1], [-3.7, 1.55, .8], [-3.75, 3.1, 1.2]]) {
    const pot = new THREE.Mesh(potG, M.terracotta); pot.position.set(x, 0, z); pot.scale.setScalar(s_); pot.castShadow = pot.receiveShadow = true; roof.add(pot);
    for (let i = 0; i < 9; i++) { const a = r() * 6.283, h = .2 + r() * .3; const tip = new V3(x + Math.cos(a) * .12 * s_, .25 * s_ + h, z + Math.sin(a) * .12 * s_);
      leafM.push({ parent: roof, m: leafMatrix(tip, new V3(Math.cos(a), .8, Math.sin(a)), new V3(Math.cos(a), .6, Math.sin(a)), .1 + r() * .06, new THREE.Matrix4()) }); leafC.push(new THREE.Color().setHSL(.25 + r() * .05, .55, .22 + r() * .1)); }
    ob(x - .2, x + .2, z - .2, z + .2);
  }

  // ---- clothesline from the headhouse to the shack ----
  const A_ = new V3(HH.x0 - .02, 2.15, .2), B_ = new V3(SH.x1 + .05, 2.05, SH.z1 - .3);
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const p = A_.clone().lerp(B_, t); p.y -= Math.sin(t * Math.PI) * .18; pts.push(p); }
  roof.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, .005, 4, false), M.iron));
  const clothCols = [0xb3301f, 0xe8e2d4, 0x3f6e9a, 0xd9b44a];
  [.3, .48, .64, .8].forEach((t, i) => {
    const p = A_.clone().lerp(B_, t); p.y -= Math.sin(t * Math.PI) * .18;
    const w = [.5, .7, .55, .35][i], h = [.55, .45, .75, .3][i];
    const g = new THREE.PlaneGeometry(w, h, 4, 4).translate(0, -h / 2, 0);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: clothCols[i], roughness: .9, side: THREE.DoubleSide }));
    m.position.copy(p); m.rotation.y = Math.atan2(B_.x - A_.x, B_.z - A_.z) - Math.PI / 2; m.castShadow = true; m.receiveShadow = true; roof.add(m);
    roofLive.cloth.push({ m, ph: r() * 6 });
  });

  // ---- chicken run: wire fence, coop ----
  const meshTex = plateTex(256, 256, (x) => { x.clearRect(0, 0, 256, 256); x.strokeStyle = 'rgba(190,195,190,1)'; x.lineWidth = 3; for (let i = -256; i < 512; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 256); x.stroke(); x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 256); x.stroke(); } });
  meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
  const wireMat = new THREE.MeshStandardMaterial({ map: meshTex, alphaTest: .4, side: THREE.DoubleSide, roughness: .5, metalness: .6 });
  const fenceSide = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), g = new THREE.PlaneGeometry(L, .95); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L * 2, uv.getY(i) * 1.9);
    const m = new THREE.Mesh(g, wireMat); m.position.set((ax + bx) / 2, .5, (az + bz) / 2); m.rotation.y = -Math.atan2(bz - az, bx - ax); m.castShadow = true; roof.add(m);
    const n = Math.max(1, Math.round(L / 1.1)); for (let i = 0; i <= n; i++) { const t = i / n; b.add(M.plankWood, wuv(bb(lerp(ax, bx, t) - .04, lerp(ax, bx, t) + .04, 0, 1.05, lerp(az, bz, t) - .04, lerp(az, bz, t) + .04), .3, 1)); }
    PERCHES.push(new V3(lerp(ax, bx, .5), 1.07, lerp(az, bz, .5)));
  };
  const CR = CHICK_RUN;
  fenceSide(CR.x0, CR.z0, CR.x1, CR.z0); fenceSide(CR.x1, CR.z0, CR.x1, CR.z1); fenceSide(CR.x0, CR.z1, CR.x1, CR.z1);
  ob(CR.x0 - .1, CR.x1 + .1, CR.z0 - .1, CR.z1 + .1);
  const CP = { x: -5.85, z: 6.0 };
  b.add(M.plankBlue, wuv(bb(CP.x - .5, CP.x + .5, .3, 1.0, CP.z - .4, CP.z + .4), 1.2, 1));
  for (const [dx, dz] of [[-.45, -.35], [.45, -.35], [-.45, .35], [.45, .35]]) b.add(M.plankWood, wuv(bb(CP.x + dx - .03, CP.x + dx + .03, 0, .3, CP.z + dz - .03, CP.z + dz + .03), .3, 1));
  const cr = new THREE.BoxGeometry(1.25, .05, 1.05); cr.rotateX(.22); cr.translate(CP.x, 1.06, CP.z); b.add(M.corr, wuv(cr, 1, 1));
  b.add(M.rubber, bb(CP.x - .12, CP.x + .12, .32, .62, CP.z + .4, CP.z + .41));
  const ramp = new THREE.BoxGeometry(.24, .03, .6); ramp.rotateX(.55); ramp.translate(CP.x, .17, CP.z + .65); b.add(M.plankWood, wuv(ramp, .5, .5));
  PERCHES.push(new V3(CP.x, 1.27, CP.z));

  // ---- raised beds with cabbages and seedlings ----
  const bed = (x0, x1, z0, z1, kind) => {
    for (const g of [bb(x0, x1, 0, .3, z0, z0 + .05), bb(x0, x1, 0, .3, z1 - .05, z1), bb(x0, x0 + .05, 0, .3, z0, z1), bb(x1 - .05, x1, 0, .3, z0, z1)]) b.add(M.plankWood, wuv(g, 1, .6));
    b.add(M.soil, wuv(bb(x0 + .05, x1 - .05, 0, .26, z0 + .05, z1 - .05), 1, 1));
    const nx = Math.floor((x1 - x0) / .32), nz = Math.floor((z1 - z0) / .32);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = x0 + .16 + (i + .5) * ((x1 - x0 - .32) / nx), z = z0 + .16 + (j + .5) * ((z1 - z0 - .32) / nz); rosette(x + (r() - .5) * .05, .27, z + (r() - .5) * .05, kind === 'cabbage' ? .22 + r() * .07 : .1 + r() * .05, kind === 'cabbage' ? 11 : 7, kind); }
    ob(x0 - .05, x1 + .05, z0 - .05, z1 + .05, false);
  };
  const rosette = (x, y, z, s_, n, kind) => {
    const hue = kind === 'cabbage' ? .25 : .27;
    for (let k = 0; k < n; k++) { const a = k / n * 6.283 + r() * .4, up = kind === 'cabbage' ? .9 - (k % 3) * .25 : 1.2;
      leafM.push({ parent: roof, m: leafMatrix(new V3(x + Math.cos(a) * s_ * .15, y + .01, z + Math.sin(a) * s_ * .15), new V3(Math.cos(a) * .5, 1, Math.sin(a) * .5), new V3(Math.cos(a), up, Math.sin(a)), s_ * (.9 + r() * .3), new THREE.Matrix4()) });
      leafC.push(new THREE.Color().setHSL(hue + r() * .04, kind === 'cabbage' ? .4 + r() * .2 : .6, kind === 'cabbage' ? .42 + r() * .14 : .4 + r() * .1)); }
  };
  bed(-2.75, -.7, 2.9, 4.25, 'cabbage'); bed(-2.75, -.7, 5.7, 7.05, 'seedling');

  // ---- stepping stones: to the table, to the shack door, to the greenhouse door ----
  const stoneMat = M.conc;
  const stones = [];
  const path = (ax, az, bx, bz, step = .58) => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step)); for (let i = 0; i <= n; i++) { const t = i / n; stones.push([lerp(ax, bx, t) + (r() - .5) * .06, lerp(az, bz, t) + (r() - .5) * .04, Math.atan2(bx - ax, bz - az) + (r() - .5) * .2]); } };
  path(0, .7, 0, 8.6); path(-.45, 1.9, -3.7, 2.15, .6); path(.45, 4.4, 2.05, 4.4, .6); path(.3, 8.9, .9, 9.0, .6);
  for (const [x, z, a] of stones) { const g = new RoundedBoxGeometry(.5, .05, .34, 1, .02); g.rotateY(a); g.translate(x, .015, z); b.add(stoneMat, wuv(g, .8, .8)); ROOF_NOGRASS.push([x - .28, x + .28, z - .22, z + .22]); }

  // ---- table and two chairs at the sea end of the path ----
  const T = new V3(1.15, 0, 9.55);
  const white = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .45, metalness: .3 });
  const tbl = new THREE.Group(); tbl.position.copy(T); roof.add(tbl);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .03, 32), white); top.position.y = .72; tbl.add(top);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .7, 10), white); stem.position.y = .36; tbl.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.22, .25, .03, 20), white); foot.position.y = .015; tbl.add(foot);
  for (const [dx, dz, ry] of [[-.62, -.15, Math.PI / 2 + .3], [.6, .2, -Math.PI / 2 - .2]]) {
    const c = new THREE.Group(); c.position.set(T.x + dx, 0, T.z + dz); c.rotation.y = ry; roof.add(c);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(.42, .03, .4), white); seat.position.y = .45; c.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(.42, .38, .03), white); back.position.set(0, .66, -.19); back.rotation.x = -.1; c.add(back);
    for (const [lx, lz] of [[-.18, -.17], [.18, -.17], [-.18, .17], [.18, .17]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .45, 6), white); l.position.set(lx, .225, lz); c.add(l); }
    PERCHES.push(new V3(T.x + dx, .86, T.z + dz));
  }
  for (const o of [...tbl.children]) { o.castShadow = o.receiveShadow = true; }
  PERCHES.push(new V3(T.x, .75, T.z));
  ROOF_OBST.push([T.x - .5, T.x + .5, T.z - .5, T.z + .5], [T.x - .9, T.x - .35, T.z - .45, T.z + .15], [T.x + .35, T.x + .9, T.z - .1, T.z + .5]);

  // ---- greenhouse: plank base, white frame, translucent panels, door toward the path ----
  const GH = { x0: 2.3, x1: 5.6, z0: 2.0, z1: 6.7, base: .6, eave: 1.95, ridge: 2.65 };
  for (const g of holedWall('x', GH.x0, GH.x0 + .06, GH.z0, GH.z1, 0, GH.base, [[4.0, 4.8, -1, 2]])) b.add(M.plankBlue, wuv(g, 1.2, 1));
  for (const g of [bb(GH.x1 - .06, GH.x1, 0, GH.base, GH.z0, GH.z1), bb(GH.x0, GH.x1, 0, GH.base, GH.z0, GH.z0 + .06), bb(GH.x0, GH.x1, 0, GH.base, GH.z1 - .06, GH.z1)]) b.add(M.plankBlue, wuv(g, 1.2, 1));
  const frameMat = white;
  const fr = new Bucket();
  const cx = (GH.x0 + GH.x1) / 2;
  for (let z = GH.z0; z <= GH.z1 + .001; z += (GH.z1 - GH.z0) / 4) {
    for (const x of [GH.x0, GH.x1]) fr.add(frameMat, rod(new V3(x, GH.base, z), new V3(x, GH.eave, z), .025, 6));
    fr.add(frameMat, rod(new V3(GH.x0, GH.eave, z), new V3(cx, GH.ridge, z), .022, 6)); fr.add(frameMat, rod(new V3(GH.x1, GH.eave, z), new V3(cx, GH.ridge, z), .022, 6));
  }
  for (const [x, y] of [[GH.x0, GH.eave], [GH.x1, GH.eave], [cx, GH.ridge], [GH.x0, GH.base], [GH.x1, GH.base]]) fr.add(frameMat, rod(new V3(x, y, GH.z0), new V3(x, y, GH.z1), .022, 6));
  fr.add(frameMat, rod(new V3(GH.x0, GH.base, 4.0), new V3(GH.x0, GH.eave, 4.0), .03, 6)); fr.add(frameMat, rod(new V3(GH.x0, GH.base, 4.8), new V3(GH.x0, GH.eave, 4.8), .03, 6));
  fr.build(roof);
  const film = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ee, roughness: .35, metalness: 0, transparent: true, opacity: .28, side: THREE.DoubleSide, envMapIntensity: .8, depthWrite: false });
  const filmGeos = [];
  const quad = (a, b2, c, d) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b2, ...c, ...a, ...c, ...d], 3)); g.computeVertexNormals(); filmGeos.push(g); };
  quad([GH.x0, GH.base, GH.z0], [GH.x0, GH.base, 4.0], [GH.x0, GH.eave, 4.0], [GH.x0, GH.eave, GH.z0]);
  quad([GH.x0, GH.base, 4.8], [GH.x0, GH.base, GH.z1], [GH.x0, GH.eave, GH.z1], [GH.x0, GH.eave, 4.8]);
  quad([GH.x0, GH.base + 1.3, 4.0], [GH.x0, GH.base + 1.3, 4.8], [GH.x0, GH.eave, 4.8], [GH.x0, GH.eave, 4.0]);
  quad([GH.x1, GH.base, GH.z0], [GH.x1, GH.base, GH.z1], [GH.x1, GH.eave, GH.z1], [GH.x1, GH.eave, GH.z0]);
  for (const z of [GH.z0, GH.z1]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([GH.x0, GH.base, z, GH.x1, GH.base, z, GH.x1, GH.eave, z, GH.x0, GH.base, z, GH.x1, GH.eave, z, GH.x0, GH.eave, z, GH.x0, GH.eave, z, GH.x1, GH.eave, z, cx, GH.ridge, z], 3)); g.computeVertexNormals(); filmGeos.push(g); }
  quad([GH.x0, GH.eave, GH.z0], [GH.x0, GH.eave, GH.z1], [cx, GH.ridge, GH.z1], [cx, GH.ridge, GH.z0]);
  quad([GH.x1, GH.eave, GH.z0], [cx, GH.ridge, GH.z0], [cx, GH.ridge, GH.z1], [GH.x1, GH.eave, GH.z1]);
  const filmMesh = new THREE.Mesh(mergeGeometries(filmGeos), film); filmMesh.renderOrder = 2; roof.add(filmMesh);
  b.add(M.soil, wuv(bb(GH.x0 + .1, GH.x1 - .1, 0, .04, GH.z0 + .1, GH.z1 - .1), 1, 1));
  for (const x of [GH.x0 + .55, GH.x1 - .55]) { b.add(M.plankWood, wuv(bb(x - .3, x + .3, 0, .7, GH.z0 + .3, GH.z1 - .3), 1, .7)); for (let z = GH.z0 + .5; z < GH.z1 - .4; z += .35) rosette(x + (r() - .5) * .1, .71, z, .09 + r() * .05, 7, 'seedling'); }
  PERCHES.push(new V3(cx, GH.ridge + .03, 3.2), new V3(cx, GH.ridge + .03, 5.6));
  ob(GH.x0 - .08, GH.x1 + .08, GH.z0 - .08, GH.z1 + .08, false);

  // ---- vegetable rows toward the sea: tomatoes on stakes, beans on poles, leafy rows ----
  const VR = { x0: 2.25, x1: 6.7, z0: 7.3, z1: 10.6 };
  b.add(M.soil, wuv(bb(VR.x0, VR.x1, 0, .03, VR.z0, VR.z1), 1.5, 1.5));
  const rows = 5;
  for (let k = 0; k < rows; k++) {
    const x = VR.x0 + .45 + k * ((VR.x1 - VR.x0 - .9) / (rows - 1));
    b.add(M.soil, wuv(bb(x - .2, x + .2, 0, .09, VR.z0 + .15, VR.z1 - .15), 1, 1));
    for (let z = VR.z0 + .35; z < VR.z1 - .25; z += .42) {
      if (k < 2) {   // tomato on a stake
        b.add(M.plankWood, wuv(bb(x - .015, x + .015, 0, 1.2, z - .015, z + .015), .2, 1.2));
        for (let i = 0; i < 9; i++) { const yy = .2 + r() * .9, a = r() * 6.283; leafM.push({ parent: roof, m: leafMatrix(new V3(x + Math.cos(a) * .1, yy, z + Math.sin(a) * .1), new V3(Math.cos(a), .4, Math.sin(a)), new V3(Math.cos(a), .3, Math.sin(a)), .1 + r() * .05, new THREE.Matrix4()) }); leafC.push(new THREE.Color().setHSL(.27, .5, .2 + r() * .1)); }
        for (let i = 0; i < 3; i++) { const a = r() * 6.283; tomatoes.push(new V3(x + Math.cos(a) * .12, .35 + r() * .7, z + Math.sin(a) * .12)); }
      } else if (k === 2) {   // bean poles in pairs leaning together
        const g1 = rod(new V3(x - .18, 0, z), new V3(x, 1.6, z), .012, 5), g2 = rod(new V3(x + .18, 0, z), new V3(x, 1.6, z), .012, 5); b.add(M.plankWood, g1); b.add(M.plankWood, g2);
        for (let i = 0; i < 10; i++) { const t = r(), side = r() < .5 ? -1 : 1; const p = new V3(x + side * .18 * (1 - t), t * 1.55, z); const a = r() * 6.283; leafM.push({ parent: roof, m: leafMatrix(p, new V3(Math.cos(a), .3, Math.sin(a)), new V3(0, 1, 0), .07 + r() * .03, new THREE.Matrix4()) }); leafC.push(new THREE.Color().setHSL(.25, .55, .25 + r() * .1)); }
      } else rosette(x, .1, z, .1 + r() * .05, 7, k === 3 ? 'cabbage' : 'seedling');
    }
  }
  ob(VR.x0 - .05, VR.x1, VR.z0 - .05, VR.z1, false);

  // ---- windmill on a pole ----
  const WM = new V3(6.55, 0, 6.95);
  b.add(M.ironM, rod(new V3(WM.x, 0, WM.z), new V3(WM.x, 2.7, WM.z), .03, 8));
  const rotor = new THREE.Group(); rotor.position.set(WM.x - .08, 2.7, WM.z); rotor.rotation.y = -Math.PI / 2 + .5; roof.add(rotor);
  const bladeMats = [new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: .6, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: .6, side: THREE.DoubleSide })];
  for (let i = 0; i < 6; i++) { const bl = new THREE.Mesh(new THREE.PlaneGeometry(.12, .42).translate(0, .25, 0), bladeMats[i % 2]); bl.rotation.z = i / 6 * Math.PI * 2; bl.rotation.y = .4; bl.castShadow = true; rotor.add(bl); }
  rotor.add(new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), M.brass));
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.5, .2, .01).translate(.3, 0, 0), bladeMats[1]); tail.position.set(WM.x, 2.7, WM.z); tail.rotation.y = .5; tail.castShadow = true; roof.add(tail);
  roofLive.rotor = rotor; PERCHES.push(new V3(WM.x + .2, 2.82, WM.z - .1));
  ob(WM.x - .15, WM.x + .15, WM.z - .15, WM.z + .15);

  // ---- ivy and moss on the roof ----
  ivy(roof, { origin: new V3(0, 0, WALL_Z + .052), U: new V3(1, 0, 0), V: new V3(0, 1, 0), N: new V3(0, 0, 1), u0: HH.x0 + .05, u1: -.65, v0: 0, v1: HH.h - .1, seed: 901, starts: [[HH.x0 + .2, .02, 1.5, 50], [-.85, .02, 1.6, 40]], leaf: .07, flowers: .05 });
  ivy(roof, { origin: new V3(SH.x1 + .005, 0, 0), U: new V3(0, 0, 1), V: new V3(0, 1, 0), N: new V3(1, 0, 0), u0: SH.z0 + .05, u1: 1.7, v0: 0, v1: 2.2, seed: 905, starts: [[1.1, .02, 1.5, 30]], leaf: .065, flowers: .06 });
  for (const [x0, x1, z0, z1, seed] of [[RF.x0 + .3, RF.x1 - .3, RF.z1 - .35, RF.z1 - .3, 911], [RF.x0 + .3, RF.x1 - .3, RF.z0 + .3, RF.z0 + .35, 912]]) moss(roof, new V3((x0 + x1) / 2, .02, (z0 + z1) / 2), 50, new V3(x1 - x0, .02, .1), seed, .05);
  moss(roof, new V3(RF.x0 + .32, .02, 4), 40, new V3(.1, .02, 14), 913, .05);

  b.build(roof);
  for (const parent of [roof]) {
    const vg = vineGeos.get(parent); if (vg && vg.length) { const m = new THREE.Mesh(mergeGeometries(vg.map(prep)), M.vine); m.castShadow = true; m.receiveShadow = true; parent.add(m); }
    instance(parent, roofLeafGeo, M.leaf, leafM, leafC, true);
    instance(parent, mossGeometry(), M.moss, mossM, mossC, false);
    instance(parent, flowerGeometry(), M.flower, flowerM, null, false);
  }
  const tg = new THREE.SphereGeometry(.035, 8, 6); const tm = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0xc8321f, roughness: .35 }), tomatoes.length);
  tomatoes.forEach((p, i) => tm.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z))); tm.castShadow = true; tm.receiveShadow = true; roof.add(tm);

  buildGrass(); buildChickens(); buildBirds(); buildOutside();
  roof.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  doors.roofL = roofDoor(-1); doors.roofR = roofDoor(1);
}
const tomatoes = [];
const roofLeafGeo = leafGeometry();
function roofDoor(sx) { const g = new THREE.Group(); const m = new THREE.Mesh(wuv(bb(-.27, .27, 0, DOOR_H, 0, .035), 2.4, DOOR_H), M.door); m.castShadow = m.receiveShadow = true; g.add(m);
  const e = new THREE.Mesh(bb(sx > 0 ? -.27 : .255, sx > 0 ? -.255 : .27, 0, DOOR_H, -.002, .037), M.rubber); g.add(e); roof.add(g); g.position.set(sx * .265, 0, .035); return g; }

/* ---- lawn: instanced grass blades that sway in the wind ---- */
function buildGrass() {
  const r = rng(77);
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-.014, 0, 0, .014, 0, 0, -.009, .5, 0, .009, .5, 0, 0, 1, 0], 3));
  blade.setAttribute('normal', new THREE.Float32BufferAttribute([0, .6, .8, 0, .6, .8, 0, .7, .7, 0, .7, .7, 0, .8, .6], 3));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  const inside = (x, z, list, pad = 0) => list.some(q => x > q[0] - pad && x < q[1] + pad && z > q[2] - pad && z < q[3] + pad);
  const pts = [];
  for (let i = 0; i < 90000 && pts.length < 22000; i++) {
    const x = lerp(RF.x0 + .3, RF.x1 - .3, r()), z = lerp(RF.z0 + .3, RF.z1 - .3, r());
    if (inside(x, z, ROOF_NOGRASS) || (Math.abs(x) < SHAFT.x1 + .25 && z < .3)) continue;
    pts.push([x, z]);
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .75, side: THREE.DoubleSide, envMapIntensity: .3 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = MOTE_U.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ip = instanceMatrix*vec4(0., 0., 0., 1.);
      float sw = sin(uTime*1.6 + ip.x*.7 + ip.z*.5)*.5 + sin(uTime*2.7 + ip.x*1.9 - ip.z*1.3)*.25;
      transformed.x += sw*.12*position.y*position.y; transformed.z += sw*.06*position.y*position.y;`);
  };
  const im = new THREE.InstancedMesh(blade, mat, pts.length);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(), pp = new V3(), m4 = new THREE.Matrix4(), c = new THREE.Color();
  pts.forEach(([x, z], i) => {
    const h = .05 + r() * r() * .12; e.set((r() - .5) * .5, r() * 6.283, (r() - .5) * .5); q.setFromEuler(e); sc.set(.8 + r() * .6, h, 1); pp.set(x, 0, z);
    im.setMatrixAt(i, m4.compose(pp, q, sc)); im.setColorAt(i, c.setHSL(.22 + r() * .07, .55 + r() * .25, .2 + r() * .17));
  });
  im.receiveShadow = true; im.frustumCulled = false; roof.add(im); roofLive.grass = im;
}

/* ---- chickens: wander inside the run, stop, peck, now and then shake their wings ---- */
function buildChickens() {
  const r = rng(31);
  const looks = [[0xf1ece0, 0xe7dcc8], [0xa5562a, 0x7c3a1a], [0xd9a35a, 0xb8793a], [0x2c2622, 0x4a3b2e]];
  for (let i = 0; i < 4; i++) {
    const [c1, c2] = looks[i];
    const body = new THREE.MeshStandardMaterial({ color: c1, roughness: .95 }), wing = new THREE.MeshStandardMaterial({ color: c2, roughness: .95 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc0281c, roughness: .6 }), yel = new THREE.MeshStandardMaterial({ color: 0xe0a531, roughness: .5 });
    const g = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.SphereGeometry(.12, 14, 10), body); bodyM.scale.set(.85, .85, 1.25); bodyM.position.y = .2; g.add(bodyM);
    const tailM = new THREE.Mesh(new THREE.ConeGeometry(.07, .16, 8), wing); tailM.position.set(0, .3, -.15); tailM.rotation.x = -.7; g.add(tailM);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), wing); w.scale.set(.35, .7, 1.2); w.position.set(sx * .095, .21, -.01); g.add(w); }
    const neck = new THREE.Group(); neck.position.set(0, .27, .11); g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), body); head.position.set(0, .07, .04); neck.add(head);
    const comb = new THREE.Mesh(new THREE.BoxGeometry(.015, .04, .06), red); comb.position.set(0, .125, .04); neck.add(comb);
    const wat = new THREE.Mesh(new THREE.SphereGeometry(.015, 6, 5), red); wat.position.set(0, .035, .085); neck.add(wat);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.014, .04, 6), yel); beak.rotation.x = Math.PI / 2; beak.position.set(0, .07, .1); neck.add(beak);
    const legs = [];
    for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * .04, .11, 0); const shin = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .11, 5).translate(0, -.055, 0), yel); l.add(shin); const toe = new THREE.Mesh(new THREE.BoxGeometry(.04, .006, .05), yel); toe.position.set(0, -.11, .015); l.add(toe); g.add(l); legs.push(l); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.scale.setScalar(.95 + r() * .2);
    const x = lerp(CHICK_RUN.x0 + .4, CHICK_RUN.x1 - .4, r()), z = lerp(CHICK_RUN.z0 + .4, CHICK_RUN.z1 - .4, r());
    g.position.set(x, 0, z); g.rotation.y = r() * 6.28; roof.add(g);
    roofLive.chickens.push({ g, neck, legs, mode: 'idle', t: r() * 2, target: new V3(x, 0, z), phase: r() * 6, r: rng(100 + i) });
  }
}
function tickChickens(dt, time) {
  const CR = CHICK_RUN;
  for (const c of roofLive.chickens) {
    c.t -= dt;
    if (c.t <= 0) {
      const k = c.r();
      if (k < .45) { c.mode = 'walk'; c.target.set(lerp(CR.x0 + .35, CR.x1 - .35, c.r()), 0, lerp(CR.z0 + .35, CR.z1 - .35, c.r())); if (Math.abs(c.target.x + 5.85) < .65 && Math.abs(c.target.z - 6.0) < .55) c.target.z += 1.2; c.t = 4; }
      else if (k < .85) { c.mode = 'peck'; c.t = 1.2 + c.r() * 2.5; }
      else { c.mode = 'idle'; c.t = 1 + c.r() * 2; }
    }
    let walking = false;
    if (c.mode === 'walk') {
      const d = new V3().subVectors(c.target, c.g.position); d.y = 0; const L = d.length();
      if (L < .05) { c.t = 0; }
      else { const want = Math.atan2(d.x, d.z); let e = want - c.g.rotation.y; e = Math.atan2(Math.sin(e), Math.cos(e)); c.g.rotation.y += e * Math.min(1, dt * 6);
        if (Math.abs(e) < .6) { c.g.position.addScaledVector(d.normalize(), Math.min(L, dt * .32)); walking = true; } }
    }
    c.phase += dt * (walking ? 11 : 0);
    c.legs[0].rotation.x = walking ? Math.sin(c.phase) * .5 : 0; c.legs[1].rotation.x = walking ? -Math.sin(c.phase) * .5 : 0;
    const peck = c.mode === 'peck' ? Math.max(0, Math.sin(time * 9 + c.phase)) : 0;
    c.neck.rotation.x = damp(c.neck.rotation.x, c.mode === 'peck' ? .9 + peck * .7 : (walking ? Math.sin(c.phase * 2) * .15 : Math.sin(time * 1.3 + c.phase) * .1), 14, dt);
    c.g.position.y = walking ? Math.abs(Math.sin(c.phase)) * .012 : 0;
  }
}

/* ---- birds: small birds hop between perches and scatter when you come close; gulls circle over the water ---- */
function birdMesh(colBody, colWing, size) {
  const g = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: colBody, roughness: .9 }), wingM = new THREE.MeshStandardMaterial({ color: colWing, roughness: .9, side: THREE.DoubleSide });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.5, 10, 8), body); b.scale.set(.55, .55, 1); g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8), body); h.position.set(0, .22, .42); g.add(h);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.07, .22, 6), new THREE.MeshStandardMaterial({ color: 0x3a2c1c })); beak.rotation.x = Math.PI / 2; beak.position.set(0, .2, .7); g.add(beak);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(.35, .45).translate(0, -.22, 0), wingM); tail.rotation.x = -Math.PI / 2 + .25; tail.position.set(0, .05, -.45); g.add(tail);
  const wings = [];
  for (const sx of [-1, 1]) { const w = new THREE.Group(); w.position.set(sx * .18, .12, 0); const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .5).translate(sx * .5, 0, 0), wingM); wm.rotation.x = -Math.PI / 2; w.add(wm); g.add(w); wings.push(w); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(size); return { g, wings, head: h };
}
function buildBirds() {
  const r = rng(61);
  for (let i = 0; i < 7; i++) {
    const m = birdMesh(i % 3 === 0 ? 0x8a8f96 : 0x6d5a47, i % 3 === 0 ? 0x5c626b : 0x4b3c2e, .14 + r() * .03);
    const p = PERCHES[Math.floor(r() * PERCHES.length)];
    m.g.position.copy(p); roof.add(m.g);
    roofLive.birds.push(Object.assign(m, { mode: 'perch', t: 2 + r() * 8, perch: p, from: new V3(), to: new V3(), ctrl: new V3(), ft: 0, fd: 1, ph: r() * 6, r: rng(200 + i) }));
  }
  for (let i = 0; i < 6; i++) {
    const m = birdMesh(0xf2f0ea, 0xb9bcc0, .32 + r() * .06); outside.add(m.g);
    roofLive.gulls.push(Object.assign(m, { rad: 18 + r() * 30, h: 6 + r() * 16, sp: (.12 + r() * .12) * (r() < .5 ? -1 : 1), a: r() * 6.28, cx: (r() - .5) * 20, cz: 18 + r() * 25, ph: r() * 6 }));
  }
}
function tickBirds(dt, time, px, pz, active) {
  for (const b of roofLive.birds) {
    b.ph += dt;
    if (b.mode === 'perch') {
      b.t -= dt;
      b.head.position.y = .22 + Math.max(0, Math.sin(time * 5 + b.ph * 3)) * .05 * (Math.sin(time * .7 + b.ph) > .3 ? 1 : 0);
      b.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * 1.35; });
      const near = active && Math.hypot(b.g.position.x - px, b.g.position.z - pz) < 2.4;
      if (b.t <= 0 || near) {
        let next = b.perch, tries = 0;
        while ((next === b.perch || (near && Math.hypot(next.x - px, next.z - pz) < 5)) && tries++ < 20) next = PERCHES[Math.floor(b.r() * PERCHES.length)];
        b.from.copy(b.g.position); b.to.copy(next); b.perch = next;
        b.ctrl.copy(b.from).lerp(b.to, .5); b.ctrl.y = Math.max(b.from.y, b.to.y) + 1.5 + b.r() * 2.5;
        b.fd = Math.max(1.2, b.from.distanceTo(b.to) / 5.5); b.ft = 0; b.mode = 'fly';
      }
    } else {
      b.ft += dt / b.fd; const t = Math.min(1, b.ft), u = 1 - t;
      const p = new V3().copy(b.from).multiplyScalar(u * u).addScaledVector(b.ctrl, 2 * u * t).addScaledVector(b.to, t * t);
      const d = new V3().copy(b.ctrl).sub(b.from).multiplyScalar(2 * u).addScaledVector(new V3().copy(b.to).sub(b.ctrl), 2 * t);
      b.g.position.copy(p); b.g.rotation.y = Math.atan2(d.x, d.z);
      const flap = Math.sin(b.ph * 26) * (t > .85 ? .6 : 1);
      b.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * flap * .9; });
      if (t >= 1) { b.mode = 'perch'; b.t = 3 + b.r() * 10; b.g.rotation.y += (b.r() - .5) * 2; }
    }
  }
  for (const g of roofLive.gulls) {
    g.a += g.sp * dt; g.ph += dt;
    const x = g.cx + Math.cos(g.a) * g.rad, z = g.cz + Math.sin(g.a) * g.rad;
    g.g.position.set(x, ROOF * H + g.h + Math.sin(g.ph * .4) * 1.5, z); g.g.rotation.y = Math.atan2(-Math.sin(g.a) * g.sp, Math.cos(g.a) * g.sp); g.g.rotation.z = -Math.sign(g.sp) * .25;
    const glide = Math.sin(g.ph * .5) > .2; g.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * (glide ? .08 : Math.sin(g.ph * 9) * .55); });
  }
}

/* ---- the world beyond the parapet: sea, distant towers, the building's own facade ---- */
const seaMat = new THREE.ShaderMaterial({
  uniforms: { uSun: skyMat.uniforms.uSun, uHor: skyMat.uniforms.uHor, uZen: skyMat.uniforms.uZen, uGlow: skyMat.uniforms.uGlow, uTime: skyMat.uniforms.uTime },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: /* glsl */`
  varying vec3 vW; uniform vec3 uSun, uHor, uZen; uniform float uGlow, uTime;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
  float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
  void main(){
    vec3 v = normalize(cameraPosition - vW); float d = length(vW.xz - cameraPosition.xz);
    vec2 p = vW.xz*.12;
    float a = n2(p + vec2(uTime*.05, uTime*.02)), b = n2(p*2.7 - vec2(uTime*.07, -uTime*.04)), c = n2(p*8.1 + uTime*.1);
    vec3 n = normalize(vec3((a - .5)*.35 + (c - .5)*.12, 1., (b - .5)*.35 + (c - .5)*.12));
    float fres = .03 + .97*pow(1. - max(dot(n, v), 0.), 5.);
    vec3 deep = vec3(.015, .055, .14), skyR = mix(uHor*1.5, uZen*1.4, .4);
    vec3 col = mix(deep, skyR, fres);
    vec3 rr = reflect(-v, n); col += vec3(1., .85, .6)*pow(max(dot(rr, uSun), 0.), 250.)*30.*uGlow;
    col += vec3(.9, .95, 1.)*smoothstep(.9, .97, c*b)*.05;
    col = mix(col, uHor*1.7, smoothstep(120., 420., d));
    gl_FragColor = vec4(col, 1.);
  }`,
});
function buildOutside() {
  const sea = new THREE.Mesh(new THREE.CircleGeometry(390, 72).rotateX(-Math.PI / 2), seaMat); sea.position.y = -2; outside.add(sea);
  // distant city: hazy towers across the water
  const r = rng(4242), n = 70;
  const towerMat = new THREE.ShaderMaterial({
    uniforms: { uHor: skyMat.uniforms.uHor, uZen: skyMat.uniforms.uZen, uSun: skyMat.uniforms.uSun, uGlow: skyMat.uniforms.uGlow, uStars: skyMat.uniforms.uStars },
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*instanceMatrix*vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
    varying vec3 vW; varying vec3 vN; uniform vec3 uHor, uZen, uSun; uniform float uGlow, uStars;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
    void main(){
      float lit = max(dot(vN, uSun), 0.);
      vec3 base = mix(vec3(.2,.28,.42), vec3(.55,.6,.68), lit)*mix(.35, 1., uGlow);
      vec2 cell = floor(vec2(vW.x*.9 + vW.z*.9, vW.y/3.4));
      float win = step(.5, fract(vW.y/3.4))*step(.3, fract(vW.x*.45 + vW.z*.45));
      base *= 1. - win*.18;
      base += vec3(1., .78, .45)*win*step(.72, h21(cell))*uStars*1.4;
      float d = length(vW.xz - cameraPosition.xz);
      vec3 haze = uHor*1.55;
      gl_FragColor = vec4(mix(base, haze, clamp(.12 + d/1300., 0., .6)), 1.);
    }`,
  });
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), towerMat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const a = (r() - .5) * 2.2, d = 250 + r() * 140, w = 8 + r() * 22, h = 20 + r() * r() * 170;
    const x = Math.sin(a) * d, z = 40 + Math.cos(a) * d;
    m4.compose(new V3(x, -2, z), q.setFromEuler(new THREE.Euler(0, r() * 1.5, 0)), new V3(w, h, w * (.6 + r() * .8)));
    im.setMatrixAt(i, m4);
  }
  im.frustumCulled = false; outside.add(im);
  // the building itself below the roof edge: concrete with rows of windows
  const facadeTex = plateTex(512, 512, (x) => {
    x.fillStyle = '#8f8a80'; x.fillRect(0, 0, 512, 512); const q2 = rng(9);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${q2() < .5 ? '40,35,30' : '220,215,205'},${q2() * .08})`; x.beginPath(); x.arc(q2() * 512, q2() * 512, 2 + q2() * 30, 0, 6.283); x.fill(); }
    x.fillStyle = '#1d2228'; for (const cx2 of [60, 300]) x.fillRect(cx2, 150, 170, 260);
    x.fillStyle = 'rgba(120,140,160,.35)'; for (const cx2 of [60, 300]) x.fillRect(cx2 + 8, 158, 75, 120);
    x.fillStyle = '#a39d92'; x.fillRect(0, 440, 512, 40); x.fillStyle = 'rgba(70,45,25,.35)'; for (let i = 0; i < 40; i++) x.fillRect(q2() * 512, 480, 3, 20 + q2() * 40);
  });
  facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
  const fac = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: .9, metalness: 0 });
  const top = ROOF * H - .3, bottom = -2;
  const fg = new THREE.BoxGeometry(RF.x1 - RF.x0, top - bottom, RF.z1 - RF.z0); fg.translate((RF.x0 + RF.x1) / 2, (top + bottom) / 2, (RF.z0 + RF.z1) / 2);
  wuv(fg, 2.4, H, 0); const facade = new THREE.Mesh(fg, fac); facade.receiveShadow = true; outside.add(facade);
}

/* ---- per frame ---- */
function roofTick(dt, time) {
  const near = lift.y > ROOF * H - 2.5 * H || lift.target === ROOF;
  roof.visible = near; outside.visible = near && (lift.floor === ROOF && lift.phase !== 'riding');
  if (!roof.visible) return;
  if (roofLive.rotor) roofLive.rotor.rotation.z += dt * (2.2 + Math.sin(time * .3) * 1.4);
  for (const c of roofLive.cloth) { c.m.rotation.x = Math.sin(time * 1.9 + c.ph) * .16 + Math.sin(time * 3.7 + c.ph) * .05 - .08; }
  const onRoof = D.state === 'play' && lift.floor === ROOF && !P.inCab;
  tickChickens(dt, time); tickBirds(dt, time, P.pos.x, P.pos.z, onRoof);
  if (onRoof && A.ctx && (roofLive.nextCluck || 0) < time && Math.hypot(P.pos.x + 5, P.pos.z - 7.3) < 7) { roofLive.nextCluck = time + 2 + Math.random() * 6; sfxCluck(); }
}
function sfxCluck() {
  const ctx = A.ctx, t = ctx.currentTime + .02, n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) { const t0 = t + i * (.12 + Math.random() * .08), f = 420 + Math.random() * 160;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(f * 1.4, t0); o.frequency.exponentialRampToValueAtTime(f * .8, t0 + .07);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 3;
    const e = ctx.createGain(); e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(.03, t0 + .01); e.gain.exponentialRampToValueAtTime(.0005, t0 + .09);
    o.connect(bp).connect(e).connect(A.ambLP); o.start(t0); o.stop(t0 + .12); }
}
