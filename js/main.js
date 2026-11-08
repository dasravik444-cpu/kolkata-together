// Kolkata Together — engine core: loop, input, rendering, scenes, gameplay, multiplayer sync.
import { T, canvas, clamp, dist, mulberry, save, load, fmtMoney, pick } from './util.js';
import { TL, ROADS, WATERY, paintTile, CAR_TYPES, carSprite } from './art.js';
import { buildWorld, zoneAt, DESTINATIONS } from './mapgen.js';
import { buildInterior } from './interiors.js';
import { NPC, Police, Animal, Car, Ball, Bullet, Pickup, drawHuman, moveBody, tileAt, blocked, DIRS, routeNodes, nearestNode } from './entities.js';
import { PRESETS, STARTER_ITEMS, MENUS, PLACE_TIPS } from './data.js';
import { randomLook } from './chars.js';
import { Net } from './net.js';
import { sfx, unlockAudio } from './audio.js';
import * as UI from './ui.js';

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let ZOOM = 3, VW = 0, VH = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.floor(innerWidth * dpr); cv.height = Math.floor(innerHeight * dpr);
  ZOOM = Math.max(2, Math.round(Math.min(cv.width, cv.height * 1.5) / 400));
  VW = cv.width / ZOOM; VH = cv.height / ZOOM;
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

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
const KEYMAP = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', shift: 'shift', e: 'e', enter: 'enter', f: 'f', ' ': 'space', q: 'q', p: 'p', t: 't', c: 'c', m: 'm', v: 'v', h: 'h', escape: 'esc', tab: 'p', g: 'g' };
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
export const touchDir = { x: 0, y: 0 };

/* ============================== scenes ============================== */
const groundCache = new Map(); // scene id -> chunk canvases
function chunkCanvas(S, cx, cy) {
  const key = (S.id || 'world') + ':' + cx + ',' + cy;
  if (groundCache.has(key)) { const v = groundCache.get(key); groundCache.delete(key); groundCache.set(key, v); return v; }
  const CS = 32, c = canvas(CS * T, CS * T), g = c.getContext('2d');
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    const tx = cx * CS + x, ty = cy * CS + y; if (tx >= S.W || ty >= S.H) continue;
    paintTile(g, S.ground[ty * S.W + tx], x * T, y * T, tx * 7919 + ty * 104729, S.pal || {});
  }
  groundCache.set(key, c);
  if (groundCache.size > 40) groundCache.delete(groundCache.keys().next().value);
  return c;
}

function setScene(S, x, y, dir) {
  G.scene = S; G.me.x = x; G.me.y = y; if (dir) G.me.dir = dir;
  G.bullets = []; G.pickups = G.pickups.filter(() => false);
  if (S.kind === 'world') { G.npcs = []; G.police = []; }
  else {
    G.npcs = S.npcs.map((n) => new NPC(n.x, n.y, { look: n.look, role: n.role, line: n.line, wander: n.wander, dir: n.dir, name: n.name, seed: n.x * 3 + n.y }));
    G.police = [];
  }
  G.cam.x = x - VW / 2; G.cam.y = y - VH / 2;
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
  G.me = { x: 0, y: 0, dir: 'down', moving: false, running: false, state: 'walk', look: p.app, name: p.name, weapon: null, weaponOut: false, car: null, seat: null, kickCool: 0, attackCool: 0 };
}
export function refreshLook() { G.me.look = G.profile.app; saveProfile(); sendState(true); G.net.send({ t: 'look', look: G.profile.app }); }

function standUp() {
  const s = G.mySeat; G.me.state = 'walk';
  if (s) { const [dx, dy] = DIRS[s.dir] || [0, 1]; G.me.x = s.x - dx * 12; G.me.y = s.y + (dy ? -dy * 12 : 10); if (blocked(G.scene, G.me.x, G.me.y)) G.me.y = s.y + 14; }
  G.mySeat = null; sendState(true);
}
export function sitAt(seat) {
  G.me.state = 'sit'; G.me.x = seat.x; G.me.y = seat.y; G.me.dir = seat.dir; G.mySeat = seat; sendState(true);
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
  const [dx, dy] = DIRS[me.dir];
  me.weaponOut = true; me.attackCool = w === 'pistol' ? 0.35 : 0.5;
  if (w === 'pistol') {
    if (G.profile.ammo <= 0) { UI.toast('Out of ammo — buy more at Maidan Armoury.'); return; }
    G.profile.ammo--; G.spawnBullet(me.x + dx * 8, me.y - 9 + dy * 4, Math.atan2(dy, dx), 'me'); UI.hud(); return;
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
  while (G.npcs.length < 46) {
    const s = walkableSpot(me.x, me.y, VW / 2 + 20, 480, (t) => PED_TILES.has(t)); if (!s) break;
    G.npcs.push(new NPC(s.x, s.y));
  }
  // traffic
  G.cars = G.cars.filter((c) => c === me.car || c.owned || c.taxi || dist(c.x, c.y, me.x, me.y) < 900 || (c.parked && c.keep));
  const moving = G.cars.filter((c) => !c.parked).length;
  if (moving < 34) {
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
  add('goat', 5, [20, 60, 50, 97]); add('crow', 26, [20, 1, 238, 210]); add('monkey', 5, [19, 104, 70, 139]); add('monkey', 4, [50, 181, 60, 211]);
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
  const [dx, dy] = DIRS[me.dir];
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
      if (n.role === 'teller') return UI.bank(S.id.split(':')[1]);
      if (n.role === 'stylist') return UI.salon();
      if (n.role === 'dealer' && S.id === 'armoury') return UI.weapons();
      if (n.role === 'cop' && S.id === 'police') return UI.policeDesk();
      UI.dialog(n.name || (n.role === 'police' ? 'Police' : 'Passer-by'), n.line); break;
    }
    case 'partner': G.net.send({ t: 'event', kind: 'hifive' }); UI.toast(`You hi-fived ${G.other.name}! ✋`); sfx.good(); break;
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
  const iy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0) + touchDir.y;

  if (!modal && !G.frozen) {
    if (pressed.has('p')) UI.phone();
    if (pressed.has('t')) UI.chat(true);
    if (pressed.has('c')) UI.selfie();
    if (pressed.has('m')) UI.phone('map');
    if (pressed.has('v')) UI.toggleCall();
    if (pressed.has('h')) UI.help();
    if (pressed.has('q')) cycleWeapon();
    if (pressed.has('g') && G.waypoint) { G.waypoint = null; UI.toast('Waypoint cleared'); }
  } else if (pressed.has('esc')) UI.closeTop();
  if (UI.dialogOpen() && (pressed.has('e') || pressed.has('enter') || pressed.has('space'))) { UI.dialogNext(); pressed.clear(); }

  // ---- movement ----
  if (!modal && !G.frozen && !UI.dialogOpen()) {
    if (me.car) {
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
      const run = keys.has('shift');
      let sp = me.state === 'boat' ? 60 : me.state === 'swim' ? 40 : run ? 120 : 72;
      let vx = clamp(ix, -1, 1), vy = clamp(iy, -1, 1);
      if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
      me.moving = !!(vx || vy); me.running = run && me.moving;
      if (me.moving) {
        me.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
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
      if (S.kind === 'world') for (const b of G.balls) if (dist(me.x, me.y, b.x, b.y) < 9 && me.kickCool <= 0) { const [dx, dy] = DIRS[me.dir]; kickBall(b, dx, dy, run ? 170 : 110); me.kickCool = 0.25; }
      // pick up cash
      for (const p of G.pickups) if (dist(me.x, me.y, p.x, p.y) < 12) { G.profile.cash += p.amount; p.dead = true; UI.toast(`+${fmtMoney(p.amount)}`); sfx.coin(); }
      G.pickups = G.pickups.filter((p) => !p.dead);
      // actions
      if (pressed.has('e') || pressed.has('enter')) {
        if (me.state === 'boat') { if (TL.DECK === tileAt(S, me.x, me.y - 16) || TL.DECK === tileAt(S, me.x, me.y - 8) || dist(me.x, me.y, 178 * T, 190 * T) < 40) { me.state = 'walk'; me.y = 189 * T + 8; sendState(true); UI.toast('Boat returned. Lovely row!'); } else UI.toast('Row back to the jetty to return the boat.'); }
        else { const it = interactTarget(); if (it) doInteract(it); }
      }
      if (pressed.has('f')) {
        const [dx, dy] = DIRS[me.dir]; let n = null;
        if (me.weapon) for (const p of G.npcs) if (p.state !== 'ko' && p.role !== 'police' && dist(me.x + dx * 14, me.y + dy * 10, p.x, p.y) < 20) { n = p; break; }
        if (n) threaten(n);
        else if (S.kind === 'world') { const c = nearestCar(); if (c) enterCar(c); }
      }
      if (pressed.has('space')) attack();
    }
  }
  pressed.clear();

  // ---- simulate ----
  const near = (e, r = 600) => Math.abs(e.x - me.x) < r && Math.abs(e.y - me.y) < r;
  G.peopleNear = G.npcs.filter((n) => near(n, 300)); G.peopleNear.push(me);
  for (const n of G.npcs) if (near(n)) n.update(dt, G);
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
  const st = { t: 's', x: Math.round(me.x), y: Math.round(me.y), d: me.dir, m: me.moving ? 1 : 0, r: me.running ? 1 : 0, st: me.state, sc: sceneId(), w: me.weaponOut ? me.weapon : null, wa: G.wanted };
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
        G.other.name = m.name; G.other.look = m.look;
        if (net.role === 'guest') G.time = m.time;
        if (m.tables) Object.assign(G.tableFoods, m.tables);
        UI.toast(`${m.name} is online in Kolkata! 💛`); UI.setPartner(m.name);
        if (!m.reply) net.send({ t: 'hello', reply: true, name: G.profile.name, look: G.profile.app, time: G.time });
        break;
      case 's': {
        const o = G.other || (G.other = { x: m.x, y: m.y, name: 'Partner', look: PRESETS.her });
        o.tx = m.x; o.ty = m.y; o.dir = m.d; o.moving = !!m.m; o.running = !!m.r; o.state = m.st; o.scene = m.sc; o.weapon = m.w; o.weaponOut = !!m.w; o.wanted = m.wa;
        if (m.car) { if (!o.car || o.car.type !== m.car.type) o.car = { type: m.car.type, angle: m.car.a, ta: m.car.a }; else o.car.ta = m.car.a; } else o.car = null;
        if (o.x === undefined || isNaN(o.x)) { o.x = m.x; o.y = m.y; }
        break;
      }
      case 'look': if (G.other) G.other.look = m.look; break;
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
const light = canvas(1, 1); let lampList = null;
function render() {
  const me = G.me, S = G.scene;
  // camera
  let tx = me.x - VW / 2, ty = me.y - VH / 2 - 8;
  const maxX = S.W * T - VW, maxY = S.H * T - VH;
  if (S.kind === 'interior') { tx = maxX < 0 ? maxX / 2 : clamp(tx, 0, maxX); ty = maxY < 0 ? maxY / 2 : clamp(ty, 0, maxY); }
  else { tx = clamp(tx, 0, maxX); ty = clamp(ty, 0, maxY); }
  G.cam.x += (tx - G.cam.x) * 0.2; G.cam.y += (ty - G.cam.y) * 0.2;
  if (Math.abs(tx - G.cam.x) > 300 || Math.abs(ty - G.cam.y) > 300) { G.cam.x = tx; G.cam.y = ty; }
  let cx = G.cam.x, cy = G.cam.y;
  if (G.shakeT > 0) { cx += (Math.random() - 0.5) * 6; cy += (Math.random() - 0.5) * 6; }
  cx = Math.round(cx * ZOOM) / ZOOM; cy = Math.round(cy * ZOOM) / ZOOM;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = S.kind === 'world' ? '#4a9fd8' : '#101014'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(ZOOM, 0, 0, ZOOM, -cx * ZOOM, -cy * ZOOM);
  ctx.imageSmoothingEnabled = false;

  // ground chunks
  const CS = 32 * T;
  for (let gy = Math.floor(cy / CS); gy <= Math.floor((cy + VH) / CS); gy++) for (let gx = Math.floor(cx / CS); gx <= Math.floor((cx + VW) / CS); gx++) {
    if (gx < 0 || gy < 0 || gx * 32 >= S.W || gy * 32 >= S.H) continue;
    ctx.drawImage(chunkCanvas(S, gx, gy), gx * CS, gy * CS);
  }
  // water shimmer
  if (S.kind === 'world') {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const x0 = Math.max(0, Math.floor(cx / T)), y0 = Math.max(0, Math.floor(cy / T)), x1 = Math.min(S.W - 1, Math.ceil((cx + VW) / T)), y1 = Math.min(S.H - 1, Math.ceil((cy + VH) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const t = S.ground[y * S.W + x]; if (t === TL.WATER || t === TL.POOL) { const ph = (G.t * 1.5 + x * 0.7 + y * 1.3) % 4; if (ph < 0.6) ctx.fillRect(x * T + ((x * 7 + y * 3) % 10) + 2, y * T + ((x * 3 + y * 5) % 12) + 2, 3, 1); } }
  }
  // food on tables
  if (S.kind === 'interior' && S.tables) for (let i = 0; i < S.tables.length; i++) { const f = G.tableFoods[S.id + ':' + i]; if (f && f.length) { const tb = S.tables[i]; f.slice(0, 4).forEach((fd, k) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(tb.x - 7 + k * 4, tb.y - 6 + (k % 2) * 2, 4, 3); ctx.fillStyle = FOOD_COL[fd.kind] || '#c8802a'; ctx.fillRect(tb.x - 6 + k * 4, tb.y - 6 + (k % 2) * 2, 2, 2); }); } }

  // y-sorted drawables
  const vis = [];
  const L = cx - 64, R = cx + VW + 64, Tp = cy - 32, B = cy + VH + 260;
  for (const o of S.objects) { if (o.x - o.ox > R || o.x - o.ox + o.img.width < L || o.y < Tp || o.y - o.oy > B) continue; vis.push({ y: o.z ? 1e9 : o.y, o }); }
  const inView = (e) => e.x > L && e.x < R && e.y > Tp && e.y < B;
  for (const n of G.npcs) if (inView(n)) vis.push({ y: n.y, h: n });
  for (const p of G.police) if (inView(p)) vis.push({ y: p.y, h: p });
  if (S.kind === 'world') {
    for (const a of G.animals) if (inView(a)) vis.push({ y: a.y, a });
    for (const c of G.cars) if (inView(c)) vis.push({ y: c.y + 4, c });
    for (const b of G.balls) if (inView(b)) vis.push({ y: b.y, b });
  }
  for (const p of G.pickups) vis.push({ y: p.y - 4, p });
  if (!me.car) vis.push({ y: me.y, h: me, me: true });
  const o = G.other;
  if (o && o.scene === sceneId() && o.look) { if (o.car) vis.push({ y: o.y + 4, rc: o }); else vis.push({ y: o.y, h: o, partner: true }); }
  vis.sort((a, b) => a.y - b.y);
  for (const v of vis) {
    if (v.o) ctx.drawImage(v.o.img, Math.round(v.o.x - v.o.ox), Math.round(v.o.y - v.o.oy));
    else if (v.h) { drawHuman(ctx, v.h, G.t); if (v.h.carry) { ctx.fillStyle = '#c9ccd4'; ctx.fillRect(v.h.x + 4, v.h.y - 14, 8, 2); ctx.fillStyle = '#e8a050'; ctx.fillRect(v.h.x + 6, v.h.y - 16, 4, 2); } }
    else if (v.a) v.a.draw(ctx, G.t);
    else if (v.c) v.c.draw(ctx);
    else if (v.b) v.b.draw(ctx, G.t);
    else if (v.p) v.p.draw(ctx, G.t);
    else if (v.rc) { const img = carSprite(v.rc.car.type); ctx.save(); ctx.translate(Math.round(v.rc.x), Math.round(v.rc.y)); ctx.rotate(v.rc.car.angle); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore(); }
  }
  for (const b of G.bullets) b.draw(ctx);

  // night lighting (world only)
  const dark = S.kind === 'world' ? darkness() : 0;
  if (dark > 0.02) {
    const lw = Math.ceil(VW / 2), lh = Math.ceil(VH / 2);
    if (light.width !== lw || light.height !== lh) { light.width = lw; light.height = lh; }
    const lg = light.getContext('2d');
    lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, lw, lh);
    lg.fillStyle = `rgba(14,16,46,${dark})`; lg.fillRect(0, 0, lw, lh);
    lg.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => { const gx = (x - cx) / 2, gy = (y - cy) / 2; if (gx < -r || gy < -r || gx > lw + r || gy > lh + r) return; const gr = lg.createRadialGradient(gx, gy, 0, gx, gy, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.beginPath(); lg.arc(gx, gy, r, 0, 7); lg.fill(); };
    if (!lampList) lampList = S.objects.filter((ob) => ob.kind === 'lamp').map((ob) => [ob.x, ob.y - 30]);
    for (const [x, y] of lampList) hole(x, y + 18, 26, 0.9);
    hole(me.x, me.y - 8, 34, 0.75);
    if (o && o.scene === 'world') hole(o.x, o.y - 8, 26, 0.6);
    for (const c of G.cars) if (inView(c)) hole(c.x + Math.cos(c.angle) * 26, c.y + Math.sin(c.angle) * 26, 22, 0.8);
    for (const b of S.buildings) if (b.interior && b.door) hole(b.door.x * T + 8, b.door.y * T, 18, 0.7);
    ctx.drawImage(light, cx, cy, lw * 2, lh * 2);
    // warm lamp glow
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,200,90,${dark * 0.18})`;
    for (const [x, y] of lampList) if (x > L && x < R && y > Tp && y < B) { ctx.beginPath(); ctx.arc(x, y + 2, 6, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }

  // name tags & speech bubbles
  const tag = (h, text, col) => { ctx.font = '6px "Pixelify Sans", monospace'; const w = ctx.measureText(text).width + 6; ctx.fillStyle = 'rgba(29,26,36,0.8)'; ctx.fillRect(Math.round(h.x - w / 2), Math.round(h.y - 36), w, 9); ctx.fillStyle = col; ctx.fillText(text, Math.round(h.x - w / 2 + 3), Math.round(h.y - 29.5)); };
  if (o && o.scene === sceneId() && o.look) tag(o, (o.name || 'Partner') + (o.wanted ? ' ★' + o.wanted : ''), '#ffd94a');
  for (const n of G.npcs) if (n.say && G.t < n.sayUntil && inView(n)) { ctx.font = '6px "Pixelify Sans", monospace'; const w = Math.min(120, ctx.measureText(n.say).width + 8); ctx.fillStyle = '#fbfaf6'; ctx.fillRect(n.x - w / 2, n.y - 44, w, 11); ctx.strokeStyle = '#1d1a24'; ctx.lineWidth = 0.5; ctx.strokeRect(n.x - w / 2, n.y - 44, w, 11); ctx.fillStyle = '#1d1a24'; ctx.fillText(n.say, n.x - w / 2 + 4, n.y - 36.5, w - 8); }
  // waypoint arrow
  if (G.waypoint && S.kind === 'world') {
    const wp = G.waypoint; const a = Math.atan2(wp.y - me.y, wp.x - me.x), d = dist(wp.x, wp.y, me.x, me.y);
    if (d < 24 && !G.cab) G.waypoint = null;
    else { ctx.save(); ctx.translate(me.x + Math.cos(a) * 26, me.y - 10 + Math.sin(a) * 26); ctx.rotate(a); ctx.fillStyle = '#ffd94a'; ctx.strokeStyle = '#1d1a24'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -5); ctx.lineTo(-2, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  }
  // prompt
  const it = !UI.isOpen() && !G.me.car ? interactTarget() : null;
  let label = it ? it.label : null, key = 'E';
  if (!it && S.kind === 'world' && !me.car) { const c = nearestCar(); if (c) { label = c.taxi ? 'Get in your cab' : c.owned ? 'Drive your car' : c.parked ? 'Steal car' : 'Jack car'; key = 'F'; } }
  if (me.car) { label = me.car.taxi ? 'Exit cab' : 'Exit vehicle'; key = 'F'; }
  UI.prompt(label, key);
}
const FOOD_COL = { biryani: '#f2d890', roll: '#e8b060', rosogolla: '#ffffff', coffee: '#6b3a1a', tea: '#b8642a', pastry: '#3a1a0c', chelo: '#8a4a22', phuchka: '#d8a050', sizzler: '#4a3a2a' };
export function darkness() { const h = G.time / 60; if (h >= 6.5 && h <= 17.5) return 0; if (h > 17.5 && h < 19.5) return ((h - 17.5) / 2) * 0.62; if (h >= 19.5 || h < 5) return 0.62; return ((6.5 - h) / 1.5) * 0.62; }

/* ============================== boot ============================== */
let last = performance.now(), started = false;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (started) { update(dt); render(); }
  requestAnimationFrame(loop);
}
export async function startGame({ name, preset, code, online }) {
  let p = load('profile', null);
  if (!p || p.preset !== preset) p = DEFAULT_PROFILE(preset, name);
  p.name = name || p.name || (preset === 'him' ? 'Him' : 'Her');
  G.profile = p; saveProfile();
  makeMe();
  UI.loading(true);
  await new Promise((r) => setTimeout(r, 30));
  G.world = buildWorld();
  G.world.spawn = { x: 101 * T + 8, y: 97 * T + 10 };
  initAnimals();
  setScene(G.world, G.world.spawn.x, G.world.spawn.y, 'down');
  UI.loading(false);
  started = true;
  if (online && code) { G.online = true; hookNet(); G.net.connect(code); }
  else UI.netStatus('solo');
  UI.toast(`Welcome to Kolkata, ${p.name}! Press H for controls.`);
}
UI.init(G, { startGame, standUp, placeOrder, bookCab, refreshLook, saveProfile, sitAt, teleport, exitCar, goToInterior, sceneId, virtualKey, touchDir, DESTINATIONS, darkness });
window.__dbg = { goToInterior, sitAt, placeOrder, teleport, bookCab };
requestAnimationFrame(loop);
