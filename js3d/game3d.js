// Kolkata Together — engine core: loop, input, rendering, scenes, gameplay, multiplayer sync.
// Kolkata Together 3D — game core (same simulation as the 2D version, rendered in 3D).
import { T, clamp, dist, mulberry, save, load, fmtMoney, pick } from '../js/util.js';
import { TL, ROADS, WATERY } from '../js/art.js';
import { buildWorld, zoneAt, DESTINATIONS } from '../js/mapgen.js';
import { buildInterior } from '../js/interiors.js';
import { NPC, Police, Animal, Car, Ball, Bullet, Pickup, moveBody, tileAt, blocked, DIRS, routeNodes, nearestNode, SIM } from '../js/entities.js';
import { PRESETS, STARTER_ITEMS, MENUS, PLACE_TIPS } from '../js/data.js';
import { randomLook } from '../js/chars.js';
import { Net } from '../js/net.js';
import { sfx, unlockAudio } from '../js/audio.js';
import * as UI from '../js/ui.js';
import { View, preview3d } from './render3d.js';
import { M } from './models.js';
import { registerFace, FACES, loadPhotos } from './textures.js';
import { initHumans } from './human.js';
import { loadRealModels } from './realmodels.js';
const humansP = Promise.all([initHumans(), loadPhotos(), loadRealModels()]);

/* ---------- my face photo (stored only in this browser, shared peer-to-peer) ---------- */
let myFace = null;
const faceReady = (async () => { const f = load('face', null); if (f && f.data) { try { const id = await registerFace(f.data); myFace = { id, data: f.data, opts: f.opts || {} }; } catch (e) { /* bad image */ } } })();
function applyFace(app) { if (!myFace) { delete app.faceId; app.photoGlasses = false; return app; } app.faceId = myFace.id; if (myFace.opts.skin) app.skin = FACES[myFace.id].skin; app.photoGlasses = !!myFace.opts.glasses; return app; }
function decorate(app) { return applyFace({ ...app }); }
// large messages are dropped by the data channel, so photos travel in 12 KB chunks
function sendFace() { if (!myFace || !G.net.connected) return; const d = myFace.data, n = Math.ceil(d.length / 12000); for (let i = 0; i < n; i++) G.net.send({ t: 'faceChunk', id: myFace.id, i, n, d: d.slice(i * 12000, (i + 1) * 12000) }); }
const faceParts = {};
function askFace(look) { if (look && look.faceId && !FACES[look.faceId]) setTimeout(() => { if (!FACES[look.faceId]) G.net.send({ t: 'needFace' }); }, 6000); }
function onFaceChunk(m) {
  if (typeof m.d !== 'string' || !(m.n > 0 && m.n < 40) || !(m.i >= 0 && m.i < m.n)) return;
  const p = faceParts[m.id] || (faceParts[m.id] = { got: 0, parts: new Array(m.n) });
  if (!p.parts[m.i]) { p.parts[m.i] = m.d; p.got++; }
  if (p.got === m.n) { const data = p.parts.join(''); delete faceParts[m.id]; if (data.startsWith('data:image/') && data.length < 400000) registerFace(data).catch(() => {}); }
}
async function setFace(data, opts = {}) {
  if (!data) { save('face', null); myFace = null; } else { const id = await registerFace(data); myFace = { id, data, opts }; save('face', { data, opts }); }
  if (G.profile) { applyFace(G.profile.app); refreshLook(); sendFace(); }
}

const cv = document.getElementById('game');
let VW = 700, VH = 700; let view = null;
const DIR2ANG = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 };
const cardinal = (a) => { const c = Math.cos(a), s2 = Math.sin(a); return Math.abs(c) > Math.abs(s2) ? (c > 0 ? 'right' : 'left') : (s2 > 0 ? 'down' : 'up'); };
const FWD = () => [Math.cos(G.me.angle), Math.sin(G.me.angle)];

/* ============================== state ============================== */
export const G = {
  t: 0, time: 10 * 60, world: null, scene: null, scenes: {}, me: null, other: null,
  npcs: [], animals: [], cars: [], bullets: [], pickups: [], balls: [], police: [], peopleNear: [],
  wanted: 0, wantedCool: 0, profile: null, net: new Net(), cam: { x: 0, y: 0 }, shakeT: 0, waypoint: null,
  tableFoods: {}, order: null, mySeat: null, returnPos: null, online: false, tag: null, frozen: false, cab: null,
  fmtMoney, sfx,
};
window.G = G; // handy for debugging in the console

const DEFAULT_PROFILE = (preset, name) => ({
  v: 1, name, preset, app: JSON.parse(JSON.stringify(PRESETS[preset])), owned: [...STARTER_ITEMS], cash: 5000, bank: 20000,
  loan: 0, card: null, weapons: [], ammo: 0, cars: [], health: 100, hunger: 80, reservations: [], photos: [],
});
export function saveProfile() { save('profile', G.profile); }

/* ============================== input ============================== */
const keys = new Set(), pressed = new Set();
const KEYMAP = { r: 'run', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', shift: 'shift', e: 'e', enter: 'enter', f: 'f', ' ': 'space', q: 'q', p: 'p', t: 't', c: 'c', m: 'm', v: 'v', h: 'h', escape: 'esc', tab: 'p', g: 'g' };
addEventListener('keydown', (ev) => {
  const k = KEYMAP[ev.key.toLowerCase()];
  if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { if (k === 'esc') { document.activeElement.blur(); UI.closeTop(); } return; }
  if (!k) return;
  if (['up', 'down', 'left', 'right', 'space', 'p'].includes(k)) ev.preventDefault();
  if (!keys.has(k)) pressed.add(k);
  keys.add(k); unlockAudio();
});
addEventListener('keyup', (ev) => { const k = KEYMAP[ev.key.toLowerCase()]; if (k) keys.delete(k); });
addEventListener('blur', () => keys.clear());
export function virtualKey(k, down) { if (down) { if (!keys.has(k)) pressed.add(k); keys.add(k); } else keys.delete(k); }
export const touchDir = { x: 0, y: 0, lock: false };

/* ============================== scenes ============================== */
function setScene(S, x, y, dir) {
  G.scene = S; G.me.x = x; G.me.y = y; if (dir) { G.me.dir = dir; G.me.angle = DIR2ANG[dir]; }
  G.bullets = []; G.pickups = G.pickups.filter(() => false);
  if (S.kind === 'world') { G.npcs = []; G.police = []; }
  else {
    G.npcs = S.npcs.map((n) => new NPC(n.x, n.y, { look: n.look, role: n.role, line: n.line, wander: n.wander, dir: n.dir, name: n.name, seed: n.x * 3 + n.y }));
    G.police = [];
  }
  if (view) { if (S.kind === 'world') view.exitInterior(); else view.enterInterior(S); view.yaw = Math.PI / 2 - G.me.angle; view.curDist = 0; }
  const nm = S.kind === 'world' ? zoneAt(G.world, x, y) : S.name;
  UI.banner(nm, S.kind === 'world' ? PLACE_TIPS[nm] : S.menu ? MENUS[S.menu]?.tag : '');
  G.lastZone = nm;
  sendState(true);
}
function enterBuilding(b) {
  if (!b.interior) { UI.toast(b.name && b.name !== 'Residence' ? `${b.name} is closed right now.` : 'Private residence — it\'s locked.'); return; }
  if (!G.scenes[b.interior]) G.scenes[b.interior] = buildInterior(b.interior);
  const S = G.scenes[b.interior];
  S.fromBuilding = b;
  G.returnPos = { x: b.door.x * T + 8, y: (b.door.y + 1) * T + 10 };
  sfx.door(); UI.fade(() => setScene(S, S.spawn.x, S.spawn.y, 'up'));
}
export function goToInterior(id, fromName) {
  const b = G.world.buildings.find((x) => x.interior === id || x.name === fromName);
  if (b) enterBuilding(b);
}
function exitInterior() {
  if (G.me.state === 'sit') standUp();
  sfx.door();
  UI.fade(() => { setScene(G.world, G.returnPos.x, G.returnPos.y, 'down'); spawnPoliceBurst(); });
}
export function teleport(tx, ty) {
  const W = G.world; let x = tx * T + 8, y = ty * T + 8;
  for (let r = 0; r < 12 && blocked(W, x, y); r++) { y += T; if (blocked(W, x, y)) { y -= T; x += T; } }
  if (G.me.car) exitCar(true);
  setScene(W, x, y, 'down');
}

/* ============================== player ============================== */
function makeMe() {
  const p = G.profile;
  G.me = { x: 0, y: 0, angle: Math.PI / 2, dir: 'down', moving: false, running: false, state: 'walk', look: p.app, name: p.name, weapon: null, weaponOut: false, car: null, seat: null, kickCool: 0, attackCool: 0 };
}
export function refreshLook() { G.me.look = G.profile.app; saveProfile(); sendState(true); G.net.send({ t: 'look', look: G.profile.app }); }

function standUp() {
  const s = G.mySeat; G.me.state = 'walk';
  if (s) { const [dx, dy] = DIRS[s.dir] || [0, 1]; G.me.x = s.x - dx * 12; G.me.y = s.y + (dy ? -dy * 12 : 10); if (blocked(G.scene, G.me.x, G.me.y)) G.me.y = s.y + 14; }
  G.mySeat = null; sendState(true);
}
export function sitAt(seat) {
  G.me.state = 'sit'; G.me.x = seat.x; G.me.y = seat.y; G.me.dir = seat.dir; G.me.angle = DIR2ANG[seat.dir] ?? G.me.angle; G.mySeat = seat; sendState(true);
  const S = G.scene;
  if (S.cinema && seat.table === 'show') { UI.show(S.cinema, S.name); return; }
  if (S.menu && seat.table !== 'sofa') setTimeout(() => UI.cafeMenu(S.menu, true), 250);
}

/* ---------- cars ---------- */
function enterCar(car) {
  if (car.owner === 'other') return UI.toast('That\'s your partner\'s ride.');
  if (car.driver && !car.taxi) {
    const n = new NPC(car.x, car.y + 12, { look: car.driver }); n.state = 'flee'; n.timer = 5; G.npcs.push(n);
    G.crime(1, null); UI.toast('You pulled the driver out!');
  } else if (car.parked && !car.owned && !car.taxi) { G.crime(1, null); UI.toast('Hot-wired! Drive carefully…'); }
  car.driver = null; car.parked = false; car.route = car.taxi ? car.route : null; car.path = [];
  G.me.car = car; G.me.state = 'drive'; sfx.door(); sendState(true);
  if (car.taxi) UI.cabRide(car);
}
export function exitCar(silent) {
  const car = G.me.car; if (!car) return;
  G.me.car = null; G.me.state = 'walk';
  const off = [[0, car.wid + 6], [0, -car.wid - 6], [car.len, 0], [-car.len, 0]];
  for (const [dx, dy] of off) { const a = car.angle; const x = car.x + dx * Math.cos(a) - dy * Math.sin(a), y = car.y + dx * Math.sin(a) + dy * Math.cos(a); if (!blocked(G.scene, x, y)) { G.me.x = x; G.me.y = y; break; } }
  car.speed = 0; car.parked = true;
  if (car.taxi) { G.cars.splice(G.cars.indexOf(car), 1); G.cab = null; }
  if (!silent) sfx.door(); sendState(true);
}

/* ---------- crime & police ---------- */
G.crime = (level) => {
  const before = G.wanted;
  G.wanted = Math.min(5, G.wanted + level); G.wantedCool = 18;
  if (G.wanted > before) { sfx.siren(); UI.wanted(G.wanted, true); }
  if (G.scene.kind === 'world') spawnPolice(Math.min(6, G.wanted * 2) - G.police.length);
};
function spawnPolice(n) {
  for (let i = 0; i < n; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2, r = 180 + Math.random() * 80;
      const x = G.me.x + Math.cos(a) * r, y = G.me.y + Math.sin(a) * r;
      if (!blocked(G.world, x, y) && !WATERY.has(tileAt(G.world, x, y))) { G.police.push(new Police(x, y)); break; }
    }
  }
}
function spawnPoliceBurst() { if (G.wanted > 0) spawnPolice(Math.min(6, G.wanted * 2)); }
G.onBusted = () => {
  if (G.frozen) return;
  const fine = Math.max(500, Math.round(G.profile.cash * 0.1));
  G.profile.cash = Math.max(0, G.profile.cash - fine);
  G.wanted = 0; G.police = []; UI.wanted(0);
  G.frozen = true; sfx.bad();
  UI.bigText('CAUGHT!', `Fined ${fmtMoney(fine)} by Kolkata Police`);
  G.net.send({ t: 'event', kind: 'busted' });
  setTimeout(() => { G.frozen = false; if (G.me.car) exitCar(true); teleport(74, 173); saveProfile(); }, 2600);
};
function knockedOut() {
  if (G.frozen) return;
  G.frozen = true; G.me.state = 'ko'; sfx.bad();
  const bill = Math.min(G.profile.cash, 1000);
  G.profile.cash -= bill; G.wanted = 0; G.police = []; UI.wanted(0);
  UI.bigText('KNOCKED OUT', `Woke up at SSKM Hospital — bill ${fmtMoney(bill)}`);
  G.net.send({ t: 'event', kind: 'ko' });
  setTimeout(() => { G.frozen = false; G.me.state = 'walk'; G.profile.health = 100; if (G.me.car) exitCar(true); teleport(77, 163); saveProfile(); }, 2800);
}
G.spawnBullet = (x, y, ang, owner) => { G.bullets.push(new Bullet(x, y, ang, owner)); sfx.shot(); };

function attack() {
  const me = G.me; if (me.attackCool > 0) return;
  const w = me.weapon;
  const [dx, dy] = FWD();
  const GUN = { pistol: [0.35, 1, 0.03], smg: [0.09, 1, 0.08], shotgun: [0.8, 6, 0.28], rifle: [0.5, 1, 0.01] }[w];
  me.weaponOut = true; me.attackCool = GUN ? GUN[0] : 0.5;
  if (GUN) {
    if (G.profile.ammo <= 0) { UI.toast('Out of ammo — buy more at Maidan Armoury.'); return; }
    G.profile.ammo--; const base = Math.atan2(dy, dx);
    for (let k = 0; k < GUN[1]; k++) G.spawnBullet(me.x + dx * 8, me.y - 9 + dy * 4, base + (Math.random() - 0.5) * GUN[2], 'me');
    playMe('shoot'); for (const n of G.npcs) if (n.state === 'idle' && dist(n.x, n.y, me.x, me.y) < 160) { n.state = 'flee'; n.timer = 4; }
    UI.hud(); return;
  }
  sfx.hit();
  // melee: fist / knife / bat
  for (const n of [...G.npcs, ...G.police]) {
    if (n.state === 'ko') continue;
    if (dist(me.x + dx * 10, me.y + dy * 6, n.x, n.y) < 16) {
      n.state = 'ko'; n.timer = 6;
      if (n.role === 'police') G.crime(1); else { dropCash(n); G.crime(w ? 2 : 1); }
      G.shake(2); break;
    }
  }
  // kick the football
  for (const b of G.balls) if (dist(me.x + dx * 8, me.y + dy * 4, b.x, b.y) < 16) kickBall(b, dx, dy, 260);
}
function dropCash(n) { if (n.cash > 0) { G.pickups.push(new Pickup(n.x + 6, n.y, n.cash)); n.cash = 0; } }
function threaten(n) {
  if (!G.me.weapon) { UI.toast('You need a weapon to threaten someone.'); return; }
  G.me.weaponOut = true; n.state = 'hands'; n.timer = 3; n.dir = opposite(G.me.dir);
  UI.say(n, pick(Math.random, ['Okay okay! Take it!', 'Please don\'t hurt me!', 'Arre baba! Here, take my wallet!', 'Help! Police!']));
  setTimeout(() => dropCash(n), 600);
  G.crime(1);
}
const opposite = (d) => ({ up: 'down', down: 'up', left: 'right', right: 'left' }[d]);

/* ---------- actions: slap / punch / kick / throw, partner fun, flying bodies ---------- */
let animSeq = 0;
function playMe(name) { G.me.anim = name + '#' + (++animSeq); sendState(true); }
function playOn(ent, name) { ent.anim = name + '#' + (++animSeq); }
function faceTo(ent) { G.me.angle = Math.atan2(ent.y - G.me.y, ent.x - G.me.x); G.me.dir = cardinal(G.me.angle); }
// send something (person, animal, player) flying; z in metres, vx/vy in sim px/s
function launch(e, vx, vy, vz, spin = 6) { e.fly = { z: e.fly ? e.fly.z : 0, vx, vy, vz, spin, rot: 0 }; }
G.launch = launch;
G.onAnimalHit = (a) => { const say = { cow: 'MOOOO! 🐄💫', dog: 'Woof?! 🐕💫', dog2: 'Yelp! 🐕💫', cat: 'MEEOWW! 🐈💫', goat: 'Meh-eh-eh! 🐐💫', horse: 'Neigh! 🐎💫', monkey: 'Ooh-ooh! 🐒💫' }[a.kind]; if (say) UI.toast(say); };
const OUCH = ['Ouch! Ki korchen?!', 'Arre! What was that for?', 'Police! Police!', 'Baba go!', 'Are you mad?!', 'Uff! My jaw!'];
function npcAction(kind, n) {
  const me = G.me; faceTo(n); UI.closeDialog();
  if (kind === 'talk') { n.state = 'talk'; n.timer = 4; n.dir = opposite(me.dir); G.talkAt = { x: n.x, y: n.y }; UI.dialog(n.name || 'Passer-by', n.line); return; }
  if (kind === 'rob') return n.role === 'shopkeeper' ? robTill(n) : threaten(n);
  playMe(kind);
  const [fx, fy] = FWD();
  setTimeout(() => {
    if (!G.npcs.includes(n) && !G.police.includes(n)) return;
    sfx.hit(); G.shake(kind === 'throw' ? 3 : 1);
    if (kind === 'slap') { playOn(n, 'hit'); UI.say(n, pick(Math.random, OUCH)); n.state = 'flee'; n.timer = 4; G.crime(1); }
    if (kind === 'punch') { n.state = 'ko'; n.timer = 3.5; launch(n, fx * 30, fy * 30, 1.2, 0); if (Math.random() < 0.5) dropCash(n); G.crime(1); }
    if (kind === 'kick') { n.state = 'ko'; n.timer = 3.5; launch(n, fx * 70, fy * 70, 2.5, 3); G.crime(1); }
    if (kind === 'throw') { n.state = 'ko'; n.timer = 4.5; launch(n, fx * 110, fy * 110, 6, 9); dropCash(n); G.crime(2); }
    // some people fight back
    if (kind !== 'throw' && n.role !== 'police' && Math.random() < 0.3) setTimeout(() => { if (n.state === 'ko') return; n.state = 'idle'; playOn(n, 'punch'); setTimeout(() => { if (dist(n.x, n.y, me.x, me.y) < 22) { playMe('hit'); G.profile.health -= 8; sfx.hit(); UI.toast('They hit you back! 🤕'); } }, 250); }, 900);
  }, kind === 'throw' ? 550 : 220);
}
function robBank(n) {
  const S = G.scene; G.me.weaponOut = true; faceTo(n); playMe('shoot');
  for (const t of G.npcs) if (t.role === 'teller' || t.role === 'customer') { t.state = 'hands'; t.timer = 6; }
  UI.say(n, 'Okay! Okay! Take it all — just don\'t shoot!'); sfx.siren();
  setTimeout(() => { const loot = 40000 + Math.round(Math.random() * 80000); G.pickups.push(new Pickup(n.x, n.y + 18, loot)); UI.bigText('BANK ROBBERY!', `Grab the ${fmtMoney(loot)} bag — the alarm is ringing!`, 2600); G.crime(3); void S; }, 900);
}
function robTill(n) {
  G.me.weaponOut = true; faceTo(n); n.state = 'hands'; n.timer = 5; playMe('shoot');
  const jewel = G.scene.id.startsWith('mall') && Math.abs(n.x - 20 * 16) < 60;
  UI.say(n, jewel ? 'Not the jewellery! Please!' : 'Take the cash, take it!');
  setTimeout(() => { const loot = jewel ? 25000 + Math.round(Math.random() * 45000) : 6000 + Math.round(Math.random() * 14000); G.pickups.push(new Pickup(n.x, n.y + 16, loot)); G.crime(jewel ? 3 : 2); sfx.siren(); }, 700);
}
/* ---------- helicopters ---------- */
function initHelis() {
  G.helis = [[72, 72], [38, 163]].map(([tx, ty]) => ({ x: tx * T + 8, y: ty * T + 8, alt: 0, angle: -Math.PI / 2, speed: 0, rotor: 0, home: true }));
}
function roofAt(px, py) { const v = view; if (!v || !v.city) return 0; const tx = Math.floor(px / 16), ty = Math.floor(py / 16); if (tx < 0 || ty < 0 || tx >= G.world.W || ty >= G.world.H) return 0; return v.city.hgrid[ty * G.world.W + tx]; }
function flyHeli(h, dt, ix, iy) {
  const up = keys.has('space'), down = keys.has('shift');
  h.rotor = Math.min(1, h.rotor + dt * 0.6);
  if (h.rotor < 0.6) { UI.prompt('Rotor spinning up…', ''); return; }
  const vs = (up ? 6 : 0) - (down ? 6 : 0); h.alt = Math.max(0, Math.min(140, h.alt + vs * dt));
  const airborne = h.alt > 0.5;
  const fwd = airborne ? -iy : 0; h.speed += ((fwd * 240) - h.speed) * Math.min(1, dt * 1.2);
  if (airborne) h.angle += ix * 1.5 * dt;
  const nx = h.x + Math.cos(h.angle) * h.speed * dt, ny = h.y + Math.sin(h.angle) * h.speed * dt;
  const wall = roofAt(nx, ny);
  if (nx < 20 || ny < 20 || nx > G.world.W * 16 - 20 || ny > G.world.H * 16 - 20) h.speed *= -0.3;
  else if (wall > h.alt + 0.3) { h.speed *= -0.4; G.shake(4); sfx.hit(); }
  else { h.x = nx; h.y = ny; }
  const floor = roofAt(h.x, h.y); if (h.alt < floor) h.alt = floor;
  h.tilt = (h.speed / 240) * 0.25; G.me.x = h.x; G.me.y = h.y;
}
function updateCopHeli(dt) {
  if (G.wanted >= 4 && G.scene.kind === 'world') {
    const c = G.copHeli || (G.copHeli = { x: G.me.x - 400, y: G.me.y - 400, alt: 35, angle: 0, speed: 0, rotor: 1, police: true, a: 0 });
    c.a += dt * 0.5; const tx = G.me.x + Math.cos(c.a) * 110, ty = G.me.y + Math.sin(c.a) * 110;
    const ang = Math.atan2(ty - c.y, tx - c.x); c.angle = ang; const d = dist(c.x, c.y, tx, ty); const sp = Math.min(300, d * 2);
    c.x += Math.cos(ang) * sp * dt; c.y += Math.sin(ang) * sp * dt; c.tilt = Math.min(0.3, sp / 900);
    if (!G._copHeliSaid) { G._copHeliSaid = true; UI.toast('🚁 Police helicopter overhead!'); sfx.siren(); }
  } else if (G.copHeli) { G.copHeli.alt += dt * 15; if (G.copHeli.alt > 120) { G.copHeli = null; G._copHeliSaid = false; } }
}
function partnerAction(kind) {
  const o = G.other; if (!o) return; faceTo(o);
  if (kind === 'hifive') { playMe('wave'); G.net.send({ t: 'act', kind: 'hifive', a: G.me.angle }); UI.toast(`You hi-fived ${o.name}! ✋`); sfx.good(); return; }
  if (kind === 'wave') { playMe('wave'); G.net.send({ t: 'act', kind: 'wave', a: G.me.angle }); return; }
  playMe(kind === 'bonk' ? 'slap' : 'punch'); G.net.send({ t: 'act', kind, a: G.me.angle });
  setTimeout(() => { sfx.hit(); UI.toast(kind === 'bonk' ? `🛏 You bonked ${o.name} with a pillow!` : `🤭 You playfully shoved ${o.name}!`); }, 260);
}
function onPartnerAct(m) {
  const name = G.other ? G.other.name : 'Partner';
  if (m.kind === 'hifive') { playMe('wave'); UI.toast(`${name} hi-fived you! ✋`); sfx.good(); }
  if (m.kind === 'wave') UI.toast(`${name} waves at you 👋`);
  if (m.kind === 'bonk') setTimeout(() => { playMe('hit'); sfx.hit(); UI.toast(`🛏 ${name} bonked you with a pillow!`); }, 260);
  if (m.kind === 'shove') setTimeout(() => { playMe('hit'); launch(G.me, Math.cos(m.a) * 70, Math.sin(m.a) * 70, 2.5, 0); sfx.hit(); UI.toast(`🤭 ${name} shoved you — wheee!`); }, 260);
}
function updateFlying(dt) {
  const S = G.scene;
  const step = (e, isMe) => {
    const f = e.fly; if (!f) return;
    const nx = e.x + f.vx * dt, ny = e.y + f.vy * dt;
    if (!blocked(S, nx, ny)) { e.x = nx; e.y = ny; } else { f.vx *= -0.3; f.vy *= -0.3; }
    f.vz -= 9.8 * dt * 1.4; f.z += f.vz * dt; f.rot += f.spin * dt;
    if (f.z <= 0 && f.vz < 0) { if (Math.abs(f.vz) > 4) { f.vz = -f.vz * 0.3; f.vx *= 0.5; f.vy *= 0.5; f.spin *= 0.4; f.z = 0.01; } else { e.fly = null; if (isMe) { G.me.state = 'walk'; } } }
  };
  for (const n of G.npcs) step(n); for (const p of G.police) step(p); if (S.kind === 'world') for (const a of G.animals) step(a);
  step(G.me, true);
}
G.shake = (n) => { G.shakeT = Math.max(G.shakeT, n * 0.06); };

/* ---------- football ---------- */
function kickBall(b, dx, dy, power) {
  if (G.online && G.net.role === 'guest') { G.net.send({ t: 'kick', id: b.id, vx: dx * power, vy: dy * power }); }
  b.vx += dx * power; b.vy += dy * power;
}

/* ============================== world population ============================== */
function walkableSpot(cx, cy, rmin, rmax, pred) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2, r = rmin + Math.random() * (rmax - rmin);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const t = tileAt(G.world, x, y);
    if (!blocked(G.world, x, y) && (!pred || pred(t))) return { x, y };
  }
  return null;
}
const PED_TILES = new Set([TL.SIDEWALK, TL.PLAZA, TL.PATH, TL.GRASS, TL.MARBLE, TL.FLOWERS, TL.SAND, TL.DECK]);
function populate(dt) {
  if (G.scene.kind !== 'world') return;
  const me = G.me;
  // pedestrians
  G.npcs = G.npcs.filter((n) => dist(n.x, n.y, me.x, me.y) < 520 || n.state === 'flee');
  const flying = G.me.heli && G.me.heli.alt > 12;
  while (G.npcs.length < (flying ? 8 : view ? view.q.full * 3 + 8 : 30)) {
    const s = walkableSpot(me.x, me.y, 300, 520, (t) => PED_TILES.has(t)); if (!s) break;
    G.npcs.push(new NPC(s.x, s.y));
  }
  // traffic
  G.cars = G.cars.filter((c) => c === me.car || c.owned || c.taxi || dist(c.x, c.y, me.x, me.y) < 900 || (c.parked && c.keep));
  const moving = G.cars.filter((c) => !c.parked).length;
  if (moving < (view ? { low: 12, medium: 20, high: 30 }[view.qname] || 20 : 20)) {
    const n = G.world.nodes[(Math.random() * G.world.nodes.length) | 0];
    const d = dist(n.x * T, n.y * T, me.x, me.y);
    const dirs = Object.keys(n.links);
    if (d > Math.max(VW, VH) / 2 + 40 && d < 780 && dirs.length) {
      const type = pick(Math.random, ['taxi', 'taxi', 'taxi', 'sedan', 'sedan2', 'sedan3', 'hatch', 'suv', 'bus', 'sports_red', 'sedan', 'taxi']);
      const c = new Car(type, n.x * T + 8, n.y * T + 8); c.driver = mkDriverLook();
      const dir = pick(Math.random, dirs); c.setRoute(G, n.id, dir); c.x = c.path[0][0]; c.y = c.path[0][1];
      c.angle = Math.atan2(c.path[1][1] - c.y, c.path[1][0] - c.x);
      if (!G.cars.some((o) => dist(o.x, o.y, c.x, c.y) < 40)) G.cars.push(c);
    }
  }
  // street animals wander onto the roads near you (Kolkata traffic!)
  G.roadAnimT = (G.roadAnimT || 0) - dt;
  if (G.roadAnimT <= 0) {
    G.roadAnimT = 2; const near = G.animals.filter((a) => a.roadie && dist(a.x, a.y, me.x, me.y) < 520);
    if (near.length < 7) { const s2 = walkableSpot(me.x, me.y, 260, 480, (t) => ROADS.has(t)); if (s2) { const a = new Animal(pick(Math.random, ['cow', 'cow', 'dog', 'dog2', 'cat', 'cat2']), s2.x, s2.y); a.roadie = true; G.animals.push(a); } }
    G.animals = G.animals.filter((a) => !a.roadie || dist(a.x, a.y, me.x, me.y) < 900);
  }
  // police cleanup
  G.police = G.police.filter((p) => !p.gone);
}
let driverSeed = 1; const mkDriverLook = () => randomLook(driverSeed++ * 977);

function initAnimals() {
  const W = G.world; const A = [];
  const add = (kind, n, area) => { for (let i = 0; i < n; i++) { for (let k = 0; k < 20; k++) { const x = (area[0] + Math.random() * (area[2] - area[0])) * T, y = (area[1] + Math.random() * (area[3] - area[1])) * T; if (!blocked(W, x, y) && !WATERY.has(tileAt(W, x, y))) { A.push(new Animal(kind, x, y)); break; } } } };
  add('cow', 10, [86, 100, 160, 211]); add('cow', 4, [20, 10, 85, 97]);
  add('dog', 14, [20, 1, 238, 210]); add('dog2', 10, [20, 1, 238, 210]);
  add('horse', 7, [60, 55, 85, 96]); add('horse', 3, [19, 140, 60, 175]);
  add('goat', 5, [20, 60, 50, 97]); add('cat', 12, [86, 1, 238, 210]); add('cat2', 10, [86, 1, 238, 210]); add('crow', 26, [20, 1, 238, 210]); add('monkey', 5, [19, 104, 70, 139]); add('monkey', 4, [50, 181, 60, 211]);
  add('deer', 4, [13, 181, 36, 193]); add('peacock', 4, [37, 193, 59, 197]);
  for (const p of W.pens) { const n = p.animal === 'elephant' || p.animal === 'rhino' || p.animal === 'hippo' ? 1 : 2; for (let i = 0; i < n; i++) A.push(new Animal(p.animal, (p.x0 + 2 + Math.random() * (p.x1 - p.x0 - 3)) * T, (p.y0 + 2 + Math.random() * (p.y1 - p.y0 - 3)) * T, { x0: (p.x0 + 1.5) * T, x1: (p.x1 - 0.5) * T, y0: (p.y0 + 1.8) * T, y1: (p.y1 - 0.2) * T })); }
  G.animals = A;
  // horse carriages waiting at Victoria Memorial, parked supercars on Park Street
  const park = (type, tx, ty, ang) => { const c = new Car(type, tx * T + 8, ty * T + 8, ang); c.parked = true; c.keep = true; G.cars.push(c); return c; };
  park('carriage', 47, 101, 0); park('carriage', 62, 101, Math.PI);
  ['sports_red', 'sports_lime', 'sports_black', 'sports_orange', 'sports_blue', 'sports_red', 'sports_black'].forEach((t, i) => park(t, 98 + i * 6 + (i > 3 ? 12 : 0), 73, 0));
  park('tram', 88, 40, -Math.PI / 2).keep = true;
  // owned cars outside the flat
  G.profile.cars.forEach((t, i) => { const c = park(t, 108 + i * 3, 97, 0); c.owned = true; });
  // footballs on the Maidan pitches
  G.balls = [new Ball(72 * T + 8, 39 * T + 8, { x0: 60 * T + 6, x1: 85 * T - 6, y0: 32 * T + 6, y1: 47 * T - 6 }, 0), new Ball(34 * T + 8, 85 * T + 8, { x0: 22 * T + 6, x1: 47 * T - 6, y0: 78 * T + 6, y1: 93 * T - 6 }, 1)];
}

/* ============================== update ============================== */
let netTimer = 0, hungerTimer = 0, saveTimer = 0;
function interactTarget() {
  const me = G.me, S = G.scene;
  if (me.state === 'sit') return { kind: 'stand', label: 'Stand up' };
  if (me.car) return null;
  const [dx, dy] = FWD();
  const fx = me.x + dx * 12, fy = me.y + dy * 10;
  // NPCs
  let best = null, bd = 18;
  for (const n of G.npcs) { if (n.state === 'ko') continue; const d = dist(fx, fy, n.x, n.y); if (d < bd) { bd = d; best = n; } }
  if (best) return { kind: 'npc', npc: best, label: `Talk${best.name ? ' to ' + best.name : ''}` };
  // partner
  if (G.other && G.other.scene === sceneId() && dist(fx, fy, G.other.x, G.other.y) < 18) return { kind: 'partner', label: `Hi-five ${G.other.name}` };
  // interactables
  for (const a of S.interact) if ((fx >= a.x && fx < a.x + a.w && fy >= a.y && fy < a.y + a.h) || (me.x >= a.x && me.x < a.x + a.w && me.y >= a.y && me.y < a.y + a.h)) { if (a.kind === 'pitch') continue; return { kind: 'act', act: a, label: a.label }; }
  // doors
  if (S.kind === 'world') {
    const tx = Math.floor(fx / T), ty = Math.floor((fy - 4) / T);
    for (const b of S.buildings) if (b.door && tx === b.door.x && ty === b.door.y) return { kind: 'door', b, label: b.interior ? `Enter ${b.name}` : (b.name === 'Residence' ? 'Knock' : b.name) };
  } else if (Math.floor(me.y / T) >= S.H - 2 && Math.abs(me.x - (S.door.x * T + 8)) < 14) return { kind: 'exit', label: 'Leave' };
  return null;
}
function nearestCar(r = 26) { let best = null, bd = r; for (const c of G.cars) { const d = dist(c.x, c.y, G.me.x, G.me.y); if (d < bd && c !== G.me.car) { bd = d; best = c; } } return best; }

function doInteract(it) {
  const S = G.scene;
  switch (it.kind) {
    case 'stand': standUp(); break;
    case 'npc': {
      const n = it.npc; n.state = 'talk'; n.timer = 3; n.dir = opposite(G.me.dir);
      if (n.role === 'waiter' && S.menu) return UI.cafeMenu(S.menu, !!G.mySeat);
      if (n.role === 'teller') { if (!G.me.weapon) return UI.bank(S.id.split(':')[1]); return UI.actionMenu('Teller', [['bank', '🏦', 'Banking'], ['robbank', '💰', 'Rob the bank']], (k) => (k === 'bank' ? UI.bank(S.id.split(':')[1]) : robBank(n)), n); }
      if (n.role === 'stylist') return UI.salon();
      if (n.role === 'dealer' && S.id === 'armoury') return UI.weapons();
      if (n.role === 'cop' && S.id === 'police') return UI.policeDesk();
      const who = n.name || (n.role === 'police' ? 'Police' : 'Passer-by');
      const opts = [['talk', '💬', 'Talk'], ['slap', '👋', 'Slap'], ['punch', '👊', 'Punch'], ['kick', '🦵', 'Kick'], ['throw', '🤾', 'Throw']];
      if (G.me.weapon) opts.push(['rob', '💰', 'Rob']);
      UI.actionMenu(who, opts, (k) => npcAction(k, n), n); break;
    }
    case 'partner': {
      const special = ['shove', '🤭', 'Playful shove'];
      UI.actionMenu(G.other.name || 'Partner', [['hifive', '✋', 'Hi-five'], ['wave', '👋', 'Wave'], ['bonk', '🛏', 'Pillow bonk'], special], (k) => partnerAction(k), G.other); break;
    }
    case 'door': enterBuilding(it.b); break;
    case 'exit': exitInterior(); break;
    case 'act': actOn(it.act); break;
  }
}
function actOn(a) {
  const S = G.scene;
  switch (a.kind) {
    case 'seat': { const seat = S.seats[a.data]; if (G.other && G.other.scene === sceneId() && dist(G.other.x, G.other.y, seat.x, seat.y) < 4) return UI.toast('Your partner is sitting there!'); sitAt(seat); break; }
    case 'menu': UI.cafeMenu(a.data, false); break;
    case 'shop': UI.shop(a.data); break;
    case 'shopstall': UI.shop(a.data); break;
    case 'salon': UI.salon(); break;
    case 'bank': UI.bank(a.data); break;
    case 'atm': UI.bank('atm'); break;
    case 'vault': UI.heist(S.id.split(':')[1]); break;
    case 'wardrobe': UI.wardrobe(); break;
    case 'sleep': UI.fade(() => { G.time = 7 * 60; G.profile.health = 100; G.net.send({ t: 'time', time: G.time }); UI.toast('Good morning, Kolkata! ☀'); }); break;
    case 'tv': UI.show('tv', 'TV — Kolkata Derby live'); break;
    case 'cook': G.profile.hunger = Math.min(100, G.profile.hunger + 35); UI.toast('You made Maggi and adda-chai. Yum! 🍜'); sfx.good(); break;
    case 'weapons': UI.weapons(); break;
    case 'heal': UI.heal(); break;
    case 'police': UI.policeDesk(); break;
    case 'read': UI.dialog('Info', a.data); break;
    case 'zoo': UI.dialog('Alipore Zoo', ZOO_FACTS[a.data] || 'What a sight!'); break;
    case 'cinema': UI.payThen(350, `Movie ticket at ${a.data}`, () => UI.show('movie', a.data + ' — Cineplex')); break;
    case 'dance': G.me.state = G.me.state === 'dance' ? 'walk' : 'dance'; sendState(true); break;
    case 'workout': G.profile.health = 100; UI.toast('Great workout! Health restored 💪'); sfx.good(); break;
    case 'buycar': UI.dealer(a.data); break;
    case 'golf': UI.golf(); break;
    case 'cricket': UI.cricket(); break;
    case 'carriage': UI.payThen(300, 'Victoria horse carriage ride', () => UI.carriage()); break;
    case 'bus': UI.busTravel(); break;
    case 'boat': UI.payThen(100, 'Rowing boat at Rabindra Sarovar', () => { G.me.state = 'boat'; G.me.x = 178 * T + 8; G.me.y = 193 * T + 8; sendState(true); UI.toast('Row with the arrow keys. Press E at the jetty to return the boat.'); }); break;
    case 'slide': case 'waterslide': slide(a.kind === 'waterslide'); break;
    case 'swing': G.me.state = 'sit'; G.me.dir = 'down'; G.mySeat = { x: G.me.x, y: G.me.y, dir: 'down' }; UI.toast('Wheee! (E to get off)'); break;
  }
}
const ZOO_FACTS = {
  tiger: 'Royal Bengal Tigers — the pride of the Sundarbans, just south of Kolkata.', lion: 'Asiatic lions — found in the wild only in Gir, Gujarat.',
  giraffe: 'Giraffes! Alipore Zoo opened in 1876, one of India\'s oldest.', elephant: 'Asian elephants love a mud bath in summer.',
  zebra: 'No two zebras have the same stripes.', rhino: 'The one-horned rhinoceros — a conservation success story from Assam and Bengal.',
  hippo: 'Hippos can hold their breath for five minutes.',
};
function slide(water) {
  const me = G.me; G.frozen = true; let k = 0;
  const startX = me.x, startY = me.y;
  const iv = setInterval(() => { k++; me.x = startX + k * 2; me.y = startY + k * 1.6; me.dir = 'down'; if (k > 30) { clearInterval(iv); G.frozen = false; if (water) sfx.splash(); UI.toast(water ? 'SPLASH! 🌊' : 'Wheee! 🛝'); } }, 30);
}

function update(dt) {
  G.t += dt;
  const me = G.me, S = G.scene;
  G.time = (G.time + dt * (G.online && G.net.role === 'guest' ? 1 : 1)) % 1440;
  me.attackCool -= dt; me.kickCool -= dt;
  if (me.attackCool < -2) me.weaponOut = false;

  const modal = UI.isOpen();
  const ix = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0) + touchDir.x;
  let iy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0) + touchDir.y;
  // sprint toggle (RUN button / R key) and joystick auto-run lock, like Free Fire / BGMI
  if (pressed.has('run')) { G.sprintLock = !G.sprintLock; const rb = document.getElementById('runbtn'); if (rb) rb.classList.toggle('on', G.sprintLock); UI.toast(G.sprintLock ? 'Sprint ON' : 'Sprint OFF'); }
  if (touchDir.lock && Math.abs(touchDir.x) < 0.05 && Math.abs(touchDir.y) < 0.05 && !(keys.has('up') || keys.has('down'))) iy = -1;
  if (pressed.has('m') || pressed.has('esc')) { if (bigMapOpen()) { closeBigMap(); pressed.delete('m'); pressed.delete('esc'); } else if (pressed.has('m') && !UI.isOpen()) { openBigMap(); pressed.delete('m'); } }

  if (!modal && !G.frozen) {
    if (pressed.has('p')) UI.phone();
    if (pressed.has('t')) UI.chat(true);
    if (pressed.has('c')) UI.selfie();
    if (pressed.has('v')) UI.toggleCall();
    if (pressed.has('h')) UI.help();
    if (pressed.has('q')) cycleWeapon();
    if (pressed.has('g') && G.waypoint) { G.waypoint = null; UI.toast('Waypoint cleared'); }
  } else if (pressed.has('esc')) UI.closeTop();
  if (UI.dialogOpen() && G.talkAt && dist(G.me.x, G.me.y, G.talkAt.x, G.talkAt.y) > 40) UI.closeDialog();
  { const t = UI.actionMenuTarget(); if (t && (dist(G.me.x, G.me.y, t.x, t.y) > 36 || G.me.car)) UI.closeActionMenu(); }

  // ---- movement ----
  if (!modal && !G.frozen && !me.fly) {
    if (me.heli) {
      flyHeli(me.heli, dt, clamp(ix, -1, 1), clamp(iy, -1, 1));
      if (pressed.has('f')) { if (me.heli.alt > 0.8) UI.toast('Land first! (hold Shift to descend)'); else { const h = me.heli; me.heli = null; h.rotor = 0; me.state = 'walk'; me.x = h.x + 30; me.y = h.y + 10; sfx.door(); sendState(true); } }
    } else if (me.car) {
      const car = me.car;
      if (car.taxi && car.route !== null && !car.arrived) { car.aiUpdate(dt, G); me.x = car.x; me.y = car.y; if (car.arrived) UI.cabArrived(car); }
      else car.drive(dt, G, { up: iy < -0.3, down: iy > 0.3, left: ix < -0.3, right: ix > 0.3 });
      me.x = car.x; me.y = car.y;
      if (pressed.has('f')) exitCar();
      if (pressed.has('space')) { sfx.honk(); for (const n of G.npcs) if (dist(n.x, n.y, car.x, car.y) < 60 && n.state === 'idle') { n.state = 'flee'; n.timer = 1.5; } }
    } else if (me.state === 'sit' || me.state === 'dance') {
      if (pressed.has('e')) { if (me.state === 'dance') { me.state = 'walk'; sendState(true); } else standUp(); }
      else if ((ix || iy) && me.state === 'dance') { me.state = 'walk'; }
    } else if (me.state !== 'ko') {
      const run = keys.has('shift') || G.sprintLock || touchDir.lock;
      let sp = me.state === 'boat' ? 30 : me.state === 'swim' ? 12 : run ? 40 : 13;
      const ax = clamp(ix, -1, 1), ay = clamp(iy, -1, 1);
      const yaw = view.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
      let vx = fx * -ay + rx * ax, vy = fz * -ay + rz * ax; const mag = Math.hypot(vx, vy);
      if (mag > 1) { vx /= mag; vy /= mag; }
      me.moving = mag > 0.15; me.running = run && me.moving;
      if (me.moving) {
        const ta = Math.atan2(vy, vx); let da = ta - me.angle; da = Math.atan2(Math.sin(da), Math.cos(da)); me.angle += da * Math.min(1, dt * 14); me.dir = cardinal(me.angle);
        const ox = me.x, oy = me.y;
        if (me.state === 'boat') {
          const nx = me.x + vx * sp * dt, ny = me.y + vy * sp * dt;
          if (WATERY.has(tileAt(S, nx, ny))) { me.x = nx; me.y = ny; }
        } else moveBody(me, S, vx * sp * dt, vy * sp * dt);
        // walking into a door enters it
        if (S.kind === 'world' && me.dir === 'up' && oy === me.y) { const it = interactTarget(); if (it && it.kind === 'door' && it.b.interior) enterBuilding(it.b); }
        if (S.kind === 'interior' && me.dir === 'down' && Math.floor((me.y + 4) / T) >= S.H - 1) exitInterior();
      }
      // swimming
      if (me.state !== 'boat') { const t = tileAt(S, me.x, me.y); const sw = WATERY.has(t); if (sw && me.state !== 'swim') { me.state = 'swim'; sfx.splash(); sendState(true); } else if (!sw && me.state === 'swim') { me.state = 'walk'; sendState(true); } }
      // football: run into the ball to dribble
      if (S.kind === 'world') for (const b of G.balls) if (dist(me.x, me.y, b.x, b.y) < 9 && me.kickCool <= 0) { const [dx, dy] = FWD(); kickBall(b, dx, dy, run ? 170 : 110); me.kickCool = 0.25; }
      // pick up cash
      for (const p of G.pickups) if (dist(me.x, me.y, p.x, p.y) < 12) { G.profile.cash += p.amount; p.dead = true; UI.toast(`+${fmtMoney(p.amount)}`); sfx.coin(); }
      G.pickups = G.pickups.filter((p) => !p.dead);
      // actions
      if (pressed.has('e') || pressed.has('enter')) {
        if (me.state === 'boat') { if (TL.DECK === tileAt(S, me.x, me.y - 16) || TL.DECK === tileAt(S, me.x, me.y - 8) || dist(me.x, me.y, 178 * T, 190 * T) < 40) { me.state = 'walk'; me.y = 189 * T + 8; sendState(true); UI.toast('Boat returned. Lovely row!'); } else UI.toast('Row back to the jetty to return the boat.'); }
        else { const it = interactTarget(); if (it) doInteract(it); }
      }
      if (pressed.has('f')) {
        const [dx, dy] = FWD(); let n = null;
        if (me.weapon) for (const p of G.npcs) if (p.state !== 'ko' && p.role !== 'police' && dist(me.x + dx * 14, me.y + dy * 10, p.x, p.y) < 20) { n = p; break; }
        if (n) threaten(n);
        else if (S.kind === 'world') { const h = G.helis.find((q) => dist(q.x, q.y, me.x, me.y) < 36 && q.alt < 1); if (h) { me.heli = h; me.state = 'drive'; h.rotor = 0; sfx.door(); UI.toast('🚁 Hold Space to take off · W/S fly · A/D turn · Shift to descend'); sendState(true); } else { const c = nearestCar(); if (c) enterCar(c); } }
      }
      if (pressed.has('space') || (keys.has('space') && me.weapon === 'smg')) attack();
    }
  }
  pressed.clear();

  // ---- simulate ----
  const near = (e, r = 600) => Math.abs(e.x - me.x) < r && Math.abs(e.y - me.y) < r;
  G.peopleNear = G.npcs.filter((n) => near(n, 300)); G.peopleNear.push(me);
  updateFlying(dt); updateCopHeli(dt);
  for (const n of G.npcs) if (near(n) && !n.fly) n.update(dt, G);
  for (const p of G.police) p.update(dt, G);
  if (S.kind === 'world') {
    for (const a of G.animals) if (near(a, 500)) a.update(dt, G);
    for (const c of G.cars) if (c !== me.car && !c.remote) { if (near(c, 900)) c.aiUpdate(dt, G); }
    // balls: host (or solo) simulates
    if (!G.online || G.net.role === 'host') for (const b of G.balls) { const goal = b.update(dt); if (goal >= 0) { b.score[goal]++; b.x = (b.bounds.x0 + b.bounds.x1) / 2; b.y = (b.bounds.y0 + b.bounds.y1) / 2; b.vx = b.vy = 0; UI.bigText('GOAL!', `${b.score[0]} — ${b.score[1]}`, 1600); G.net.send({ t: 'goal', id: b.id, score: b.score }); sfx.good(); } }
    else for (const b of G.balls) { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 - 1.6 * dt; b.vy *= 1 - 1.6 * dt; }
    populate(dt);
    const z = zoneAt(G.world, me.x, me.y);
    if (z !== G.lastZone) { G.lastZone = z; UI.banner(z, PLACE_TIPS[z]); }
  }
  // bullets
  for (const b of G.bullets) {
    b.update(dt, G);
    if (b.owner === 'me') for (const n of [...G.npcs, ...G.police]) if (n.state !== 'ko' && dist(b.x, b.y, n.x, n.y - 8) < 9) { n.state = 'ko'; n.timer = 8; b.life = 0; if (n.role !== 'police') { dropCash(n); G.crime(2); } else G.crime(1); }
    if (b.owner === 'police' && !me.car && dist(b.x, b.y, me.x, me.y - 8) < 8) { b.life = 0; G.profile.health -= 14; G.shake(3); sfx.hit(); }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  // waiter delivering an order
  updateOrder(dt);
  // wanted level decays when no cop is close
  if (G.wanted > 0) {
    const close = G.police.some((p) => p.state !== 'ko' && dist(p.x, p.y, me.x, me.y) < 220);
    G.wantedCool -= dt * (close && S.kind === 'world' ? 0.25 : 1);
    if (G.wantedCool <= 0) { G.wanted--; G.wantedCool = 14; UI.wanted(G.wanted); if (!G.wanted) { G.police.forEach((p) => (p.gone = true)); UI.toast('You lost the cops. 😮‍💨'); } }
  }
  // needs
  hungerTimer += dt; if (hungerTimer > 20) { hungerTimer = 0; G.profile.hunger = Math.max(0, G.profile.hunger - 1); if (G.profile.hunger === 0) G.profile.health -= 2; if (G.profile.hunger === 15) UI.toast('Your stomach is growling… time for phuchka? 🍽'); }
  if (G.profile.health <= 0) knockedOut();
  saveTimer += dt; if (saveTimer > 10) { saveTimer = 0; saveProfile(); }
  // remote player smoothing
  const o = G.other;
  if (o) { const k = Math.min(1, dt * 10); if (dist(o.x, o.y, o.tx, o.ty) > 160) { o.x = o.tx; o.y = o.ty; } else { o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; } if (o.car) { let da = o.car.ta - o.car.angle; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; o.car.angle += da * k; } }
  // network
  netTimer += dt; if (netTimer > 1 / 12) { netTimer = 0; sendState(); }
  if (G.tag) UI.tagTick(dt);
  G.shakeT = Math.max(0, G.shakeT - dt);
  UI.hud();
}
function cycleWeapon() {
  const list = [null, ...G.profile.weapons];
  const i = list.indexOf(G.me.weapon); G.me.weapon = list[(i + 1) % list.length]; G.me.weaponOut = !!G.me.weapon;
  UI.toast(G.me.weapon ? `Equipped: ${G.me.weapon}` : 'Weapon holstered'); UI.hud(); sendState(true);
}

/* ---------- cafe orders ---------- */
export function placeOrder(menuKey, items) {
  const S = G.scene; const seat = G.mySeat;
  const waiter = G.npcs.find((n) => n.role === 'waiter') || G.npcs.find((n) => n.role === 'barista');
  if (!seat || !waiter || typeof seat.table !== 'number') { // takeaway
    items.forEach((it) => { G.profile.hunger = Math.min(100, G.profile.hunger + 6 + it.price / 40); });
    UI.dining({ foods: items.map((i) => ({ ...i, bites: 0 })), takeaway: true, menu: menuKey });
    return;
  }
  const tbl = S.tables[seat.table];
  G.order = { waiter, items, table: seat.table, phase: 'cook', t: 3.5, start: { x: waiter.x, y: waiter.y }, tbl, menu: menuKey };
  UI.toast('Order placed! The waiter will bring it shortly…');
}
function updateOrder(dt) {
  const o = G.order; if (!o) return;
  if (G.scene.kind !== 'interior' || !G.npcs.includes(o.waiter)) { G.order = null; return; }
  const w = o.waiter;
  if (o.phase === 'cook') { o.t -= dt; if (o.t <= 0) o.phase = 'walk'; return; }
  const target = o.phase === 'walk' ? { x: o.tbl.x, y: o.tbl.y - 14 } : o.start;
  const dx = target.x - w.x, dy = target.y - w.y, d = Math.hypot(dx, dy);
  w.moving = d > 2; w.carry = o.phase === 'walk';
  if (d > 2) { const sp = 50 * dt; if (Math.abs(dx) > 2) { w.x += Math.sign(dx) * Math.min(sp, Math.abs(dx)); w.dir = dx > 0 ? 'right' : 'left'; } else { w.y += Math.sign(dy) * Math.min(sp, Math.abs(dy)); w.dir = dy > 0 ? 'down' : 'up'; } return; }
  if (o.phase === 'walk') {
    const key = sceneId() + ':' + o.table;
    const foods = (G.tableFoods[key] || []).concat(o.items.map((i) => ({ ...i, bites: 0, by: G.profile.name })));
    G.tableFoods[key] = foods; G.net.send({ t: 'food', key, foods });
    UI.say(w, 'Here you go — enjoy your meal!'); sfx.good();
    o.phase = 'back';
    setTimeout(() => UI.dining({ key, menu: o.menu }), 400);
  } else { w.dir = 'down'; w.moving = false; G.order = null; }
}
export const sceneId = () => (G.scene && G.scene.kind === 'interior' ? G.scene.id : 'world');
G.sceneId = sceneId;

/* ============================== cab booking ============================== */
export function bookCab(dest) {
  if (G.scene.kind !== 'world') return UI.toast('Step outside first — cabs pick up from the road.');
  if (G.me.car) return UI.toast('You are already in a vehicle.');
  const n = nearestNode(G.world, G.me.x, G.me.y);
  const dirs = Object.keys(n.links); const d = dirs[0];
  const c = new Car('taxi', n.x * T + 8, n.y * T + 8); c.taxi = true; c.parked = true; c.keep = true; c.dest = dest;
  const [ex, ey] = [n.x * T + 8, n.y * T + 8]; c.x = ex; c.y = ey; c.angle = 0;
  G.cars.push(c); G.cab = c;
  G.waypoint = { x: c.x, y: c.y, label: 'Your cab' };
  const target = nearestNode(G.world, dest[1] * T, dest[2] * T);
  c.route = routeNodes(G.world, n.id, target.id) || []; c.node = n; c.dir = d;
  c.path = []; c.destNode = target;
  UI.toast('🚕 Your Jatri cab is waiting at the nearest crossing (see the arrow). Press F to get in.');
  sfx.honk();
}

/* ============================== networking ============================== */
function sendState(force) {
  if (!G.online || !G.net.connected) return;
  const me = G.me;
  const st = { t: 's', x: Math.round(me.x), y: Math.round(me.y), d: me.dir, m: me.moving ? 1 : 0, r: me.running ? 1 : 0, st: me.state, sc: sceneId(), w: me.weaponOut ? me.weapon : null, wa: G.wanted, an: me.anim || null, fz: me.fly ? +me.fly.z.toFixed(2) : 0 };
  if (me.heli) st.heli = { a: +me.heli.angle.toFixed(2), alt: +me.heli.alt.toFixed(1) };
  if (me.car) st.car = { type: me.car.type, a: +me.car.angle.toFixed(2) };
  const key = JSON.stringify(st);
  if (!force && key === G._lastSent && G.t - (G._lastSentT || 0) < 2) return;
  G._lastSent = key; G._lastSentT = G.t;
  G.net.send(st);
}
function hookNet() {
  const net = G.net;
  net.on('status', (s) => UI.netStatus(s));
  net.on('connected', () => {
    G.online = true;
    sendFace();
    net.send({ t: 'hello', name: G.profile.name, look: G.profile.app, time: G.time, tables: G.tableFoods });
    sendState(true);
    UI.sysMsg('Connected! You can now chat, call and play together.'); sfx.good();
  });
  net.on('disconnected', () => { if (G.other) UI.toast(`${G.other.name} went offline`); G.other = null; UI.netStatus(net.status); });
  net.on('incomingCall', (call) => UI.incomingCall(call));
  net.on('callState', (s) => UI.callState(s));
  net.on('msg', (m) => {
    switch (m.t) {
      case 'hello':
        G.other = G.other || { x: G.me.x, y: G.me.y, tx: G.me.x, ty: G.me.y, dir: 'down', state: 'walk', scene: 'world' };
        G.other.name = m.name; G.other.look = m.look; askFace(m.look);
        if (net.role === 'guest') G.time = m.time;
        if (m.tables) Object.assign(G.tableFoods, m.tables);
        UI.toast(`${m.name} is online in Kolkata! 💛`); UI.setPartner(m.name);
        if (!m.reply) net.send({ t: 'hello', reply: true, name: G.profile.name, look: G.profile.app, time: G.time });
        break;
      case 's': {
        const o = G.other || (G.other = { x: m.x, y: m.y, name: 'Partner', look: PRESETS.her });
        o.tx = m.x; o.ty = m.y; o.dir = m.d; o.moving = !!m.m; o.running = !!m.r; o.state = m.st; o.scene = m.sc; o.weapon = m.w; o.weaponOut = !!m.w; o.wanted = m.wa; o.anim = m.an; o.fz = m.fz || 0; o.heli = m.heli || null;
        if (m.car) { if (!o.car || o.car.type !== m.car.type) o.car = { type: m.car.type, angle: m.car.a, ta: m.car.a }; else o.car.ta = m.car.a; } else o.car = null;
        if (o.x === undefined || isNaN(o.x)) { o.x = m.x; o.y = m.y; }
        break;
      }
      case 'look': if (G.other) G.other.look = m.look; askFace(m.look); break;
      case 'faceChunk': onFaceChunk(m); break;
      case 'act': onPartnerAct(m); break;
      case 'needFace': sendFace(); break;
      case 'chat': UI.chatMsg(m.text, 'them', m.img); sfx.msg(); break;
      case 'time': G.time = m.time; break;
      case 'food': G.tableFoods[m.key] = m.foods; UI.refreshDining(); break;
      case 'kick': { const b = G.balls[m.id]; if (b) { b.vx += m.vx; b.vy += m.vy; } break; }
      case 'balls': m.b.forEach((s, i) => { const b = G.balls[i]; if (b) { b.x = s[0]; b.y = s[1]; b.vx = s[2]; b.vy = s[3]; } }); break;
      case 'goal': { const b = G.balls[m.id]; if (b) { b.score = m.score; UI.bigText('GOAL!', `${m.score[0]} — ${m.score[1]}`, 1600); } break; }
      case 'money': G.profile.cash += m.amount; saveProfile(); UI.toast(`💸 ${G.other ? G.other.name : 'Partner'} sent you ${fmtMoney(m.amount)}`); sfx.coin(); break;
      case 'hangup': net.endCall(true); break;
      case 'event':
        if (m.kind === 'hifive') { UI.toast(`${G.other?.name || 'Partner'} hi-fived you! ✋`); sfx.good(); }
        if (m.kind === 'busted') UI.toast(`🚓 ${G.other?.name || 'Partner'} got caught by the police!`);
        if (m.kind === 'ko') UI.toast(`🚑 ${G.other?.name || 'Partner'} got knocked out!`);
        if (m.kind === 'reserve') UI.sysMsg(`${G.other?.name || 'Partner'} reserved a table at ${m.place} 🍽`);
        break;
      case 'tag': UI.tagMsg(m); break;
    }
  });
  setInterval(() => { if (G.online && net.role === 'host' && G.scene && G.scene.kind === 'world') net.send({ t: 'balls', b: G.balls.map((b) => [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy)]) }); }, 150);
  setInterval(() => { if (G.online && net.role === 'host') net.send({ t: 'time', time: G.time }); }, 5000);
}

/* ============================== render ============================== */
/* ============================== 3D render & HUD ============================== */
let radarBase = null;
function buildRadar() {
  const W = G.world, c = document.createElement('canvas'); c.width = W.W * 2; c.height = W.H * 2; const g = c.getContext('2d');
  const img = g.createImageData(W.W, W.H);
  for (let i = 0; i < W.W * W.H; i++) { const t = W.ground[i]; const col = WATERY.has(t) ? [60, 120, 160] : ROADS.has(t) ? [70, 72, 80] : t === TL.SIDEWALK ? [150, 146, 138] : [92, 128, 70]; img.data.set([...col, 255], i * 4); }
  const tmp = document.createElement('canvas'); tmp.width = W.W; tmp.height = W.H; tmp.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false; g.drawImage(tmp, 0, 0, c.width, c.height);
  for (const b of W.buildings) { g.fillStyle = b.interior ? '#d9a441' : '#2c2a34'; g.fillRect(b.x * 2, b.y * 2, b.w * 2, b.h * 2); }
  radarBase = c;
}
function drawRadar() {
  const rc = document.getElementById('radar'); if (!rc || !radarBase) return;
  const g = rc.getContext('2d'), R = rc.width / 2, me = G.me; g.clearRect(0, 0, rc.width, rc.height);
  g.save(); g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.clip(); g.fillStyle = '#1d2a1d'; g.fillRect(0, 0, rc.width, rc.height);
  const inside = G.scene.kind !== 'world'; const p = inside ? G.returnPos : me; const sc = 2 / 16 * 1.6;
  g.translate(R, R); g.rotate(view.yaw + Math.PI); g.scale(1.6, 1.6); g.drawImage(radarBase, -p.x / 16 * 2, -p.y / 16 * 2);
  const blip = (x, y, col, r = 3.2) => { g.fillStyle = '#000'; g.beginPath(); g.arc((x - p.x) / 16 * 2, (y - p.y) / 16 * 2, r + 1, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc((x - p.x) / 16 * 2, (y - p.y) / 16 * 2, r, 0, 7); g.fill(); };
  if (!inside) { for (const c of G.police) blip(c.x, c.y, Math.floor(G.t * 4) % 2 ? '#ff3030' : '#3060ff', 2.4); if (G.waypoint) blip(G.waypoint.x, G.waypoint.y, '#ff4aa0', 3.4); if (G.cab) blip(G.cab.x, G.cab.y, '#ffd94a', 3); }
  if (G.other && G.other.scene === 'world') blip(inside ? G.other.x : G.other.x, G.other.y, '#ffd94a', 3.6);
  g.restore(); void sc;
  // player arrow (always up = camera facing)
  g.save(); g.translate(R, R); g.rotate(-(Math.PI / 2 - me.angle) + view.yaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -8); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; const na = view.yaw + Math.PI; g.fillText('N', R + Math.sin(-na) * (R - 12) * -1, R - Math.cos(na) * (R - 12) + 4);
}
/* ---------------- full-screen map (tap the MAP button or the minimap, or press M) ---------------- */
let mapBase = null, mapView = null, mapRAF = 0;
function buildMapBase() {
  const W = G.world, k = 4, c = document.createElement('canvas'); c.width = W.W * k; c.height = W.H * k; const g = c.getContext('2d');
  const img = g.createImageData(W.W, W.H);
  for (let i = 0; i < W.W * W.H; i++) { const t = W.ground[i]; const col = WATERY.has(t) ? [74, 140, 186] : ROADS.has(t) ? [96, 98, 108] : t === TL.SIDEWALK ? [178, 172, 160] : t === TL.SAND || t === TL.PATH || t === TL.DIRT ? [196, 178, 132] : [104, 150, 84]; img.data.set([...col, 255], i * 4); }
  const tmp = document.createElement('canvas'); tmp.width = W.W; tmp.height = W.H; tmp.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(tmp, 0, 0, c.width, c.height);
  for (const b of W.buildings) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(b.x * k + 2, b.y * k + 2, b.w * k, b.h * k); g.fillStyle = b.interior && !String(b.interior).startsWith('flat') && !String(b.interior).startsWith('office') ? '#e2b04a' : '#cfc8bc'; g.fillRect(b.x * k, b.y * k, b.w * k, b.h * k); g.strokeStyle = 'rgba(60,50,40,.6)'; g.lineWidth = 1; g.strokeRect(b.x * k + 0.5, b.y * k + 0.5, b.w * k - 1, b.h * k - 1); }
  mapBase = { c, k };
}
export function bigMapOpen() { return !document.getElementById('bigmap').classList.contains('hidden'); }
export function openBigMap() {
  if (!mapBase) buildMapBase();
  const el = document.getElementById('bigmap'), cvs = document.getElementById('bigmap-cv'); el.classList.remove('hidden');
  const W = G.world; const fit = Math.min(innerWidth / W.W, innerHeight / W.H) * 0.95;
  const p = G.scene.kind === 'world' ? G.me : G.returnPos || G.me;
  mapView = mapView || { s: fit * 1.6, cx: p.x / 16, cy: p.y / 16 }; mapView.cx = p.x / 16; mapView.cy = p.y / 16; mapView.min = fit;
  const draw = () => { if (!bigMapOpen()) return; drawBigMap(cvs); mapRAF = requestAnimationFrame(draw); }; cancelAnimationFrame(mapRAF); draw();
}
export function closeBigMap() { document.getElementById('bigmap').classList.add('hidden'); cancelAnimationFrame(mapRAF); }
function drawBigMap(cvs) {
  const dpr = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight; if (cvs.width !== w * dpr) { cvs.width = w * dpr; cvs.height = h * dpr; }
  const g = cvs.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#0d1410'; g.fillRect(0, 0, w, h);
  const V = mapView, toS = (tx, ty) => [w / 2 + (tx - V.cx) * V.s, h / 2 + (ty - V.cy) * V.s];
  const [x0, y0] = toS(0, 0); g.imageSmoothingEnabled = V.s < 6; g.drawImage(mapBase.c, x0, y0, G.world.W * V.s, G.world.H * V.s);
  // place names
  g.textAlign = 'center'; g.font = `600 ${Math.max(10, Math.min(15, V.s * 2.2))}px sans-serif`;
  const placed = [];
  for (const [name, tx, ty] of DESTINATIONS) { const [sx, sy] = toS(tx + 0.5, ty + 0.5); if (sx < -80 || sy < -20 || sx > w + 80 || sy > h + 20) continue; g.fillStyle = '#c0283a'; g.beginPath(); g.arc(sx, sy, 4, 0, 7); g.fill(); const tw = g.measureText(name).width, rc = [sx - tw / 2 - 3, sy - 22, tw + 6, 16]; if (placed.some((q) => rc[0] < q[0] + q[2] && q[0] < rc[0] + rc[2] && rc[1] < q[1] + q[3] && q[1] < rc[1] + rc[3])) continue; placed.push(rc); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(name, sx, sy - 8); g.fillStyle = '#fff'; g.fillText(name, sx, sy - 8); }
  const mark = (x, y, col, r, label) => { const [sx, sy] = toS(x / 16, y / 16); g.fillStyle = '#000'; g.beginPath(); g.arc(sx, sy, r + 2, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); if (label) { g.font = '700 12px sans-serif'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(label, sx, sy - r - 5); g.fillStyle = col; g.fillText(label, sx, sy - r - 5); } };
  if (G.waypoint) mark(G.waypoint.x, G.waypoint.y, '#ff4aa0', 7, '◆ ' + (G.waypoint.label || 'Waypoint'));
  if (G.cab) mark(G.cab.x, G.cab.y, '#ffd94a', 5, 'Cab');
  for (const c of G.police) mark(c.x, c.y, '#3060ff', 4);
  if (G.other && G.other.scene === 'world') mark(G.other.x, G.other.y, '#ffd94a', 7, G.otherName || 'Partner');
  const p = G.scene.kind === 'world' ? G.me : G.returnPos || G.me; const [px, py] = toS(p.x / 16, p.y / 16);
  g.save(); g.translate(px, py); g.rotate(G.me.angle + Math.PI / 2); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
  // compass rose
  const cx = w - 62, cy = h - 70, R = 40; g.save(); g.translate(cx, cy); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(0, 0, R + 12, 0, 7); g.fill();
  for (const [lab, a] of [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]]) { g.save(); g.rotate(a); g.fillStyle = lab === 'N' ? '#e33' : '#ddd'; g.beginPath(); g.moveTo(0, -R + 8); g.lineTo(6, 0); g.lineTo(-6, 0); g.closePath(); g.fill(); g.restore(); g.fillStyle = lab === 'N' ? '#ff5a5a' : '#fff'; g.font = '800 14px sans-serif'; g.textAlign = 'center'; g.fillText(lab, Math.sin(a) * (R + 2), -Math.cos(a) * (R + 2) + 5); }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '12px sans-serif'; g.textAlign = 'left'; g.fillText('100 m', 16, h - 22); g.fillRect(16, h - 16, 50 * V.s, 3);
}
function setupBigMap() {
  const el = document.getElementById('bigmap'), cvs = document.getElementById('bigmap-cv');
  document.getElementById('btn-map').onclick = () => (bigMapOpen() ? closeBigMap() : openBigMap());
  document.getElementById('radar').onclick = () => openBigMap();
  document.getElementById('bigmap-close').onclick = () => closeBigMap();
  const pts = new Map(); let moved = 0, pinch0 = 0, s0 = 0;
  cvs.addEventListener('pointerdown', (e) => { cvs.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = mapView.s; } });
  cvs.addEventListener('pointermove', (e) => { const q = pts.get(e.pointerId); if (!q) return; const dx = e.clientX - q[0], dy = e.clientY - q[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); mapView.s = clamp(s0 * d / pinch0, mapView.min, 40); moved = 99; return; }
    moved += Math.abs(dx) + Math.abs(dy); mapView.cx -= dx / mapView.s; mapView.cy -= dy / mapView.s; });
  cvs.addEventListener('pointerup', (e) => { const q = pts.get(e.pointerId); pts.delete(e.pointerId); if (!q || moved > 8 || pts.size) return;
    const tx = mapView.cx + (e.clientX - innerWidth / 2) / mapView.s, ty = mapView.cy + (e.clientY - innerHeight / 2) / mapView.s;
    let best = null, bd = 1e9; for (const [name, x, y] of DESTINATIONS) { const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; best = [name, x, y]; } }
    if (best && bd * mapView.s < 28) G.waypoint = { x: best[1] * 16 + 8, y: best[2] * 16 + 8, label: best[0] }; else G.waypoint = { x: tx * 16, y: ty * 16, label: 'Waypoint' };
    UI.toast('Waypoint: ' + G.waypoint.label + ' (follow the pink marker)'); });
  cvs.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
  cvs.addEventListener('wheel', (e) => { e.preventDefault(); mapView.s = clamp(mapView.s * (e.deltaY < 0 ? 1.15 : 0.87), mapView.min, 40); }, { passive: false });
  void el;
}
const _v = { x: 0, y: 0, z: 0 };
function placeTag(el, ent, text, show) {
  if (!el) return; if (!show) { el.style.display = 'none'; return; }
  const v = view.camera.position.clone(); const p = v.set(ent.x * M, 2.15 + (ent.state === 'swim' ? -1 : 0), ent.y * M).project(view.camera);
  if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) { el.style.display = 'none'; return; }
  el.style.display = 'block'; el.textContent = text; el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - p.y) / 2 * innerHeight) + 'px'; void _v;
}
let lightT = 0;
function render(dt) {
  const me = G.me, S = G.scene;
  view.updateSky(G.time, darkness());
  lightT -= dt; if (lightT <= 0) { lightT = 0.4; view.updateLights(me.x * M, me.y * M); }
  view.sync(G, dt); view.updateCamera(G, dt); view.render();
  drawRadar();
  const o = G.other;
  placeTag(document.getElementById('ptag'), o || {}, o ? (o.name || 'Partner') + (o.wanted ? '  ★' + o.wanted : '') : '', !!(o && o.look && o.scene === sceneId()));
  const sayer = G.npcs.find((n) => n.say && G.t < n.sayUntil && dist(n.x, n.y, me.x, me.y) < 120);
  placeTag(document.getElementById('stag'), sayer || {}, sayer ? sayer.say : '', !!sayer);
  if (G.waypoint && S.kind === 'world' && dist(G.waypoint.x, G.waypoint.y, me.x, me.y) < 24 && !G.cab) G.waypoint = null;
  const it = !UI.isOpen() && !G.me.car ? interactTarget() : null;
  let label = it ? it.label : null, key = 'E';
  if (!it && S.kind === 'world' && !me.car) { const c = nearestCar(); if (c) { label = c.taxi ? 'Get in your cab' : c.owned ? 'Drive your car' : c.parked ? 'Steal car' : 'Jack car'; key = 'F'; } }
  if (!it && S.kind === 'world' && !me.car && !me.heli && G.helis.some((q) => dist(q.x, q.y, me.x, me.y) < 36 && q.alt < 1)) { label = 'Fly helicopter'; key = 'F'; }
  if (me.car) { label = me.car.taxi ? 'Exit cab' : 'Exit vehicle'; key = 'F'; }
  if (me.heli) { label = me.heli.alt > 0.8 ? `Altitude ${Math.round(me.heli.alt)} m` : 'Exit helicopter'; key = me.heli.alt > 0.8 ? '🚁' : 'F'; }
  UI.prompt(label, key);
}
const FOOD_COL = { biryani: '#f2d890', roll: '#e8b060', rosogolla: '#ffffff', coffee: '#6b3a1a', tea: '#b8642a', pastry: '#3a1a0c', chelo: '#8a4a22', phuchka: '#d8a050', sizzler: '#4a3a2a' };
export function darkness() { const h = G.time / 60; if (h >= 6.5 && h <= 17.5) return 0; if (h > 17.5 && h < 19.5) return ((h - 17.5) / 2) * 0.62; if (h >= 19.5 || h < 5) return 0.62; return ((6.5 - h) / 1.5) * 0.62; }

/* ============================== camera look & quality ============================== */
function pickQuality() { const saved = load('quality', null); if (saved) return saved; const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || innerWidth < 800; return mobile ? 'low' : 'medium'; }
export function setQuality(q) { save('quality', q); location.reload(); }
function setupLook() {
  cv.addEventListener('click', () => { if (!('ontouchstart' in window) && !UI.isOpen() && cv.requestPointerLock) cv.requestPointerLock(); });
  addEventListener('mousemove', (e) => { if (document.pointerLockElement === cv) view.look(e.movementX, e.movementY); });
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || document.pointerLockElement !== cv) drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) { view.look((e.clientX - drag.x) * 1.6, (e.clientY - drag.y) * 1.2); drag.x = e.clientX; drag.y = e.clientY; } });
  addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.id) drag = null; });
  addEventListener('wheel', (e) => { view.dist = clamp(view.dist + e.deltaY * 0.004, 2.2, 9); });
}

/* ============================== boot ============================== */
let last = performance.now(), started = false;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (started) { update(dt); render(dt); }
  requestAnimationFrame(loop);
}
export async function startGame({ name, preset, code, online }) {
  let p = load('profile', null);
  if (!p || p.preset !== preset) p = DEFAULT_PROFILE(preset, name);
  p.name = name || p.name || (preset === 'him' ? 'Him' : 'Her');
  await faceReady; applyFace(p.app); await humansP;
  G.profile = p; saveProfile();
  makeMe();
  UI.loading(true);
  await new Promise((r) => setTimeout(r, 30));
  SIM.ped = 0.42; SIM.animal = 0.55;
  G.world = buildWorld();
  view = new View(cv, pickQuality());
  view.setWorld(G.world); buildRadar(); setupLook(); setupBigMap(); document.getElementById('radar').classList.remove('hidden'); document.getElementById('btn-map').classList.remove('hidden');
  G.world.spawn = { x: 101 * T + 8, y: 97 * T + 10 };
  initAnimals(); initHelis();
  G.npcs = [];
  setScene(G.world, G.world.spawn.x, G.world.spawn.y, 'down');
  UI.loading(false);
  started = true;
  if (online && code) { G.online = true; hookNet(); G.net.connect(code); }
  else UI.netStatus('solo');
  UI.toast(`Welcome to Kolkata, ${p.name}! Press H for controls.`);
}
UI.init(G, { setFace, decorate, preview3d, selfie3d: (people) => view.selfie(G, people), setQuality, startGame, standUp, placeOrder, bookCab, refreshLook, saveProfile, sitAt, teleport, exitCar, goToInterior, sceneId, virtualKey, touchDir, DESTINATIONS, darkness });
window.__dbg = { goToInterior, sitAt, placeOrder, teleport, bookCab, get view() { return view; } };
requestAnimationFrame(loop);
