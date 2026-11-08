// Entities: pedestrians, police, animals, vehicles, ball, bullets, pickups.
import { T, mulberry, clamp, dist, pick } from './util.js';
import { spriteSheet, SW, SH, randomLook, uniformLook } from './chars.js';
import { TL, ROADS, WATERY, CAR_TYPES, carSprite, animalSprite, ANIMALS, moneySprite, ballSprite } from './art.js';
import { NPC_LINES } from './data.js';

export const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
// Speed scales: the 3D version runs the same simulation at real-world walking speeds.
export const SIM = { ped: 1, animal: 1 };
const DIR_ROW = { down: 0, up: 1, left: 2, right: 3 };

/* ------------------------- collision helpers ------------------------- */
export function tileAt(scene, px, py) { const tx = Math.floor(px / T), ty = Math.floor(py / T); return tx < 0 || ty < 0 || tx >= scene.W || ty >= scene.H ? TL.VOID : scene.ground[ty * scene.W + tx]; }
export function solidAt(scene, px, py, car) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  if (tx < 0 || ty < 0 || tx >= scene.W || ty >= scene.H) return true;
  const s = scene.solid[ty * scene.W + tx];
  return car ? s > 0 : s === 1;
}
// feet box: 10 x 6 around (x, y)
export function blocked(scene, x, y, car = false, hw = 5, hh = 3) {
  return solidAt(scene, x - hw, y - hh, car) || solidAt(scene, x + hw, y - hh, car) || solidAt(scene, x - hw, y + hh, car) || solidAt(scene, x + hw, y + hh, car);
}
export function moveBody(e, scene, dx, dy, car = false, hw, hh) {
  let hit = false;
  if (dx) { if (!blocked(scene, e.x + dx, e.y, car, hw, hh)) e.x += dx; else hit = true; }
  if (dy) { if (!blocked(scene, e.x, e.y + dy, car, hw, hh)) e.y += dy; else hit = true; }
  return hit;
}

/* ------------------------------ humans ------------------------------ */
export function drawHuman(ctx, h, t) {
  const sheet = spriteSheet(h.look);
  let row = DIR_ROW[h.dir] || 0, col = 0;
  if (h.state === 'sit') row = 4, col = DIR_ROW[h.dir] || 0;
  else if (h.state === 'swim' || h.state === 'boat') row = 5, col = DIR_ROW[h.dir] || 0;
  else if (h.moving) col = Math.floor(t * (h.running ? 12 : 8)) % 4;
  const x = Math.round(h.x - SW / 2), y = Math.round(h.y - SH + 3);
  // shadow
  if (h.state !== 'swim') { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(h.x, h.y + 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
  if (h.state === 'ko') {
    ctx.save(); ctx.translate(h.x, h.y - 4); ctx.rotate(Math.PI / 2); ctx.drawImage(sheet, 0, 0, SW, SH, -SH / 2, -SW / 2, SW, SH); ctx.restore();
    ctx.fillStyle = '#ffd94a'; for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1; ctx.fillRect(h.x + Math.cos(a) * 8 - 1, h.y - 14 + Math.sin(a) * 3, 2, 2); }
    return;
  }
  let bob = 0;
  if (h.state === 'dance') bob = Math.round(Math.sin(t * 10) * 1.5), row = [0, 2, 0, 3][Math.floor(t * 3) % 4];
  if (h.state === 'boat') { ctx.drawImage(boatImg(), h.x - 14, h.y - 8); }
  ctx.drawImage(sheet, col * SW, row * SH, SW, SH, x, y + bob + (h.state === 'sit' ? 2 : 0), SW, SH);
  if (h.state === 'hands') { ctx.fillStyle = h.look.skin; ctx.fillRect(h.x - 7, y + 4, 2, 5); ctx.fillRect(h.x + 5, y + 4, 2, 5); }
  if (h.weapon && h.weaponOut) {
    ctx.fillStyle = h.weapon === 'knife' ? '#c8ccd4' : h.weapon === 'bat' ? '#8a5a32' : '#1d1b20';
    const [dx, dy] = DIRS[h.dir]; const wx = h.x + dx * 7 + (dy ? 5 : 0), wy = h.y - 9 + dy * 3;
    if (h.weapon === 'knife') ctx.fillRect(wx, wy, dx ? 5 : 1, dy ? 5 : 1);
    else if (h.weapon === 'bat') ctx.fillRect(wx, wy - 3, dx ? 8 : 2, dy ? 8 : 2);
    else ctx.fillRect(wx, wy, dx ? 6 : 2, dy ? 6 : 2);
  }
}
let _boat;
function boatImg() { if (!_boat) { const c = document.createElement('canvas'); c.width = 28; c.height = 12; const g = c.getContext('2d'); g.fillStyle = '#1d1b20'; g.fillRect(0, 3, 28, 9); g.fillStyle = '#c0283a'; g.fillRect(1, 4, 26, 7); g.fillStyle = '#f2f2f2'; g.fillRect(1, 4, 26, 2); _boat = c; } return _boat; }

export class NPC {
  constructor(x, y, o = {}) {
    this.x = x; this.y = y; this.seed = o.seed ?? ((Math.random() * 1e9) | 0);
    this.look = o.look === 'police' ? uniformLook('police') : o.look || randomLook(this.seed);
    this.dir = o.dir || 'down'; this.role = o.role || 'ped'; this.line = o.line || pick(Math.random, NPC_LINES);
    this.name = o.name; this.wander = o.wander ?? true; this.state = 'idle'; this.timer = Math.random() * 2; this.moving = false;
    this.speed = (28 + Math.random() * 14) * SIM.ped; this.cash = 50 + Math.floor(Math.random() * 1500); this.home = { x, y };
    this.static = !this.wander;
    if (this.role === 'dancer') this.state = 'dance';
  }
  update(dt, G) {
    const S = G.scene;
    this.timer -= dt;
    if (this.state === 'dance') return;
    if (this.state === 'ko') { if (this.timer <= 0) { this.state = 'flee'; this.timer = 4; } return; }
    if (this.state === 'hands') { this.moving = false; if (this.timer <= 0) { this.state = 'flee'; this.timer = 5; } return; }
    if (this.state === 'talk') { this.moving = false; if (this.timer <= 0) this.state = 'idle'; return; }
    if (this.state === 'flee') {
      const p = G.me; const ang = Math.atan2(this.y - p.y, this.x - p.x);
      const dx = Math.cos(ang) * 75 * SIM.ped * dt, dy = Math.sin(ang) * 75 * SIM.ped * dt;
      this.moving = true; this.running = true; this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (moveBody(this, S, dx, dy)) { this.vx = (Math.random() - 0.5) * 2; }
      if (this.timer <= 0) { this.state = 'idle'; this.running = false; }
      return;
    }
    if (!this.wander) { this.moving = false; return; }
    if (this.timer <= 0) {
      if (this.moving) { this.moving = false; this.timer = 1 + Math.random() * 3; }
      else { this.dir = pick(Math.random, ['down', 'up', 'left', 'right']); this.moving = true; this.timer = 1 + Math.random() * 3; }
    }
    if (this.moving) {
      const [dx, dy] = DIRS[this.dir];
      const nx = this.x + dx * this.speed * dt, ny = this.y + dy * this.speed * dt;
      const tt = tileAt(S, nx + dx * 6, ny + dy * 4);
      const avoid = S.kind === 'world' && (ROADS.has(tt) && tt !== TL.ZEBRA_H && tt !== TL.ZEBRA_V) || WATERY.has(tt);
      const far = S.kind === 'interior' && dist(nx, ny, this.home.x, this.home.y) > 80;
      if (avoid || far || moveBody(this, S, dx * this.speed * dt, dy * this.speed * dt)) { this.moving = false; this.timer = 0.4; }
    }
  }
}

export class Police extends NPC {
  constructor(x, y) { super(x, y, { look: 'police', role: 'police' }); this.speed = 62 * Math.max(0.6, SIM.ped); this.cool = 0; this.wander = false; }
  update(dt, G) {
    if (this.state === 'ko') { this.timer -= dt; if (this.timer <= 0) this.state = 'chase'; return; }
    const p = G.me; this.cool -= dt;
    const d = dist(this.x, this.y, p.x, p.y);
    if (G.wanted <= 0) { this.state = 'idle'; this.moving = false; this.gone = d > 500; return; }
    this.state = 'chase';
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const dx = Math.cos(ang) * this.speed * dt, dy = Math.sin(ang) * this.speed * dt;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.moving = d > 12;
    if (this.moving) { if (moveBody(this, G.scene, dx, 0)) moveBody(this, G.scene, 0, dy * 1.5); if (moveBody(this, G.scene, 0, dy)) moveBody(this, G.scene, dx * 1.5, 0); }
    if (d < 14 && !p.car && p.state !== 'ko') G.onBusted();
    if (G.wanted >= 3 && d < 140 && this.cool <= 0) { this.cool = 1.4; G.spawnBullet(this.x, this.y - 8, ang + (Math.random() - 0.5) * 0.25, 'police'); }
  }
}

/* ------------------------------ animals ------------------------------ */
export class Animal {
  constructor(kind, x, y, bounds) { this.kind = kind; this.x = x; this.y = y; this.bounds = bounds; this.timer = Math.random() * 3; this.dx = 0; this.dy = 0; this.face = -1; this.flyT = 0; }
  update(dt, G) {
    const A = ANIMALS[this.kind]; this.timer -= dt;
    const p = G.me;
    if (this.kind === 'crow' && dist(this.x, this.y, p.x, p.y) < 30 && !this.flyT) { this.flyT = 2.5; this.dx = (this.x - p.x) > 0 ? 1 : -1; this.dy = -0.7; }
    if (this.flyT) { this.flyT -= dt; this.x += this.dx * 80 * SIM.animal * dt; this.y += this.dy * 60 * SIM.animal * dt; this.face = this.dx > 0 ? 1 : -1; if (this.flyT <= 0) { this.flyT = 0; this.dx = this.dy = 0; } return; }
    if ((this.kind === 'dog' || this.kind === 'dog2') && dist(this.x, this.y, p.x, p.y) < 70 && dist(this.x, this.y, p.x, p.y) > 20 && Math.random() < 0.6) { const a = Math.atan2(p.y - this.y, p.x - this.x); this.dx = Math.cos(a); this.dy = Math.sin(a); this.timer = 0.5; }
    if (this.timer <= 0) { this.timer = 1 + Math.random() * 4; if (Math.random() < 0.45) { this.dx = this.dy = 0; } else { const a = Math.random() * Math.PI * 2; this.dx = Math.cos(a); this.dy = Math.sin(a); } }
    if (this.dx || this.dy) {
      const sp = A.speed * SIM.animal * dt; const nx = this.x + this.dx * sp, ny = this.y + this.dy * sp;
      const b = this.bounds;
      if (b && (nx < b.x0 || nx > b.x1 || ny < b.y0 || ny > b.y1)) { this.dx = -this.dx; this.dy = -this.dy; return; }
      if (!b && WATERY.has(tileAt(G.scene, nx, ny))) { this.dx = -this.dx; this.dy = -this.dy; return; }
      if (moveBody(this, G.scene, this.dx * sp, this.dy * sp, false, 4, 2)) { this.dx = -this.dx; this.dy = -this.dy; }
      if (Math.abs(this.dx) > 0.2) this.face = this.dx > 0 ? 1 : -1;
    }
  }
  draw(ctx, t) {
    const A = ANIMALS[this.kind]; const moving = this.dx || this.dy || this.flyT;
    const img = animalSprite(this.kind, moving ? Math.floor(t * 6) % 2 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(this.x, this.y + 1, A.w / 2.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y - (this.flyT ? 10 : 0)));
    if (this.face > 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -img.width / 2, -img.height + 2); ctx.restore();
  }
}

/* ------------------------------ vehicles ------------------------------ */
const opposite = { E: 'W', W: 'E', N: 'S', S: 'N' };
const DV = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] };
function laneOff(w) { return w >= 7 ? 22 : 14; }
// Left-hand traffic (India): eastbound keeps to the north lane, southbound to the east lane, etc.
function lat(d, w) { const [dx, dy] = DV[d]; const o = laneOff(w); return [dy * o, -dx * o]; }
function approachPt(n, d) { const [dx, dy] = DV[d]; const roadW = dx ? n.hw : n.vw; const cross = dx ? n.vw : n.hw; const [lx, ly] = lat(d, roadW); const back = cross ? ((cross - 1) / 2) * T + 10 : 0; return [n.x * T + 8 + lx - dx * back, n.y * T + 8 + ly - dy * back]; }
function exitPt(n, d) { const [dx, dy] = DV[d]; const roadW = dx ? n.hw : n.vw; const cross = dx ? n.vw : n.hw; const [lx, ly] = lat(d, roadW); const fwd = cross ? ((cross - 1) / 2) * T + 10 : 0; return [n.x * T + 8 + lx + dx * fwd, n.y * T + 8 + ly + dy * fwd]; }

export class Car {
  constructor(type, x, y, angle = 0) {
    this.type = type; this.x = x; this.y = y; this.angle = angle; this.speed = 0; this.path = []; this.node = null; this.dir = null;
    this.driver = null; this.parked = false; this.maxSpeed = type.startsWith('sports') ? 230 : type === 'bus' || type === 'tram' ? 70 : 140;
    this.cruise = type === 'bus' ? 45 : type.startsWith('sports') ? 85 : 60 + Math.random() * 20;
    this.len = CAR_TYPES[type].len; this.wid = CAR_TYPES[type].wid; this.honk = 0; this.siren = type === 'police';
  }
  setRoute(G, nodeId, dir) {
    const n = G.world.nodes[nodeId]; this.node = n; this.dir = dir;
    const next = G.world.nodes[n.links[dir]];
    this.path = [exitPt(n, dir), approachPt(next, dir)]; this.node = next;
  }
  chooseNext(G) {
    const n = this.node; if (!n) return;
    if (this.route && this.route.length) { // following a cab route
      const nd = this.route.shift(); this.dir = nd.dir; const nx = G.world.nodes[n.links[nd.dir]];
      this.path.push(exitPt(n, nd.dir)); if (nx) { this.path.push(approachPt(nx, nd.dir)); this.node = nx; }
      return;
    }
    if (this.route) { this.arrived = true; this.route = null; return; }
    let opts = Object.keys(n.links).filter((k) => k !== opposite[this.dir]);
    if (!opts.length) opts = Object.keys(n.links);
    const d = opts.includes(this.dir) && Math.random() < 0.55 ? this.dir : pick(Math.random, opts);
    this.dir = d; const nx = G.world.nodes[n.links[d]];
    this.path.push(exitPt(n, d)); this.path.push(approachPt(nx, d)); this.node = nx;
  }
  aiUpdate(dt, G) {
    if (this.parked || this.arrived) { this.speed *= 0.9; return; }
    if (!this.path.length) this.chooseNext(G);
    const tgt = this.path[0]; if (!tgt) return;
    const dx = tgt[0] - this.x, dy = tgt[1] - this.y, d = Math.hypot(dx, dy);
    if (d < 6) { this.path.shift(); return; }
    const want = Math.atan2(dy, dx);
    let da = want - this.angle; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    this.angle += clamp(da, -4 * dt, 4 * dt);
    // obstacle check ahead
    const ax = this.x + Math.cos(this.angle) * (this.len / 2 + 14), ay = this.y + Math.sin(this.angle) * (this.len / 2 + 14);
    // Stuck drivers honk, then creep past cows/people, and finally squeeze through jams.
    this.stuck = this.stuck || 0;
    let stop = false;
    if (this.stuck < 7) for (const c of G.cars) if (c !== this && dist(c.x, c.y, ax, ay) < 16) { stop = true; break; }
    if (!stop && this.stuck < 3) for (const h of G.peopleNear) if (h !== G.me || !G.me.car) if (dist(h.x, h.y, ax, ay) < 14) { stop = true; break; }
    if (!stop && this.stuck < 3) for (const a of G.animals) if (a.kind === 'cow' && dist(a.x, a.y, ax, ay) < 20) { stop = true; break; }
    if (stop && this.speed < 8) { this.stuck += dt; if (this.stuck > 1.5 && Math.random() < 0.01) this.honk = 0.6; } else if (!stop) this.stuck = Math.max(0, this.stuck - dt * 0.5);
    const target = stop ? 0 : Math.abs(da) > 0.6 ? this.cruise * 0.45 : this.cruise;
    this.speed += clamp(target - this.speed, -220 * dt, 90 * dt);
    this.x += Math.cos(this.angle) * this.speed * dt; this.y += Math.sin(this.angle) * this.speed * dt;
    this.honk = Math.max(0, this.honk - dt);
  }
  drive(dt, G, input) {
    const acc = this.type.startsWith('sports') ? 260 : 170;
    if (input.up) this.speed += acc * dt; else if (input.down) this.speed -= (this.speed > 0 ? 320 : 120) * dt; else this.speed *= 1 - 1.2 * dt;
    this.speed = clamp(this.speed, -60, this.maxSpeed);
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.angle += steer * clamp(Math.abs(this.speed) / 60, 0, 1) * 2.6 * dt * Math.sign(this.speed || 1);
    const vx = Math.cos(this.angle) * this.speed * dt, vy = Math.sin(this.angle) * this.speed * dt;
    const hw = Math.min(this.len, this.wid) / 2 - 1;
    const hitX = blocked(G.scene, this.x + vx, this.y, true, hw, hw), hitY = blocked(G.scene, this.x, this.y + vy, true, hw, hw);
    const nose = solidAt(G.scene, this.x + Math.cos(this.angle) * (this.len / 2) + vx, this.y + Math.sin(this.angle) * (this.len / 2) + vy, true);
    if (!hitX && !nose) this.x += vx; if (!hitY && !nose) this.y += vy;
    if (hitX || hitY || nose) { if (Math.abs(this.speed) > 80) G.shake(4); this.speed *= -0.25; }
    // knock pedestrians
    if (Math.abs(this.speed) > 40) for (const n of G.npcs) if (n.state !== 'ko' && dist(n.x, n.y, this.x, this.y) < this.len / 2) { n.state = 'ko'; n.timer = 4; G.crime(1, n); }
    for (const c of G.cars) if (c !== this && dist(c.x, c.y, this.x, this.y) < (this.len + c.len) / 3) { const a = Math.atan2(c.y - this.y, c.x - this.x); c.x += Math.cos(a) * 3; c.y += Math.sin(a) * 3; if (Math.abs(this.speed) > 90) G.shake(3); this.speed *= 0.6; }
  }
  draw(ctx) {
    const img = carSprite(this.type);
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.rotate(this.angle); ctx.fillRect(-this.len / 2 + 2, -this.wid / 2 + 3, this.len, this.wid);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    if (this.siren) { ctx.fillStyle = (Math.floor(performance.now() / 150) % 2) ? '#ff3030' : '#3060ff'; ctx.fillRect(-2, -this.wid / 2 + 2, 4, this.wid - 4); }
    ctx.restore();
  }
}

// BFS route through the road graph between two nodes; returns [{dir}, ...]
export function routeNodes(world, fromId, toId) {
  const prev = new Map([[fromId, null]]); const q = [fromId];
  while (q.length) { const id = q.shift(); if (id === toId) break; for (const [d, nid] of Object.entries(world.nodes[id].links)) if (!prev.has(nid)) { prev.set(nid, { id, d }); q.push(nid); } }
  if (!prev.has(toId)) return null;
  const out = []; let cur = toId; while (prev.get(cur)) { const p = prev.get(cur); out.unshift({ dir: p.d }); cur = p.id; }
  return out;
}
export function nearestNode(world, px, py) {
  let best = null, bd = 1e9; for (const n of world.nodes) { const d = dist(n.x * T, n.y * T, px, py); if (d < bd && Object.keys(n.links).length) { bd = d; best = n; } }
  return best;
}

/* ------------------------------ misc ------------------------------ */
export class Ball {
  constructor(x, y, bounds, id) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.bounds = bounds; this.id = id; this.home = { x, y }; this.score = [0, 0]; }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 1 - 1.6 * dt; this.vy *= 1 - 1.6 * dt;
    const b = this.bounds;
    const goalY = Math.abs(this.y - (b.y0 + b.y1) / 2) < 24;
    if (this.x < b.x0) { if (goalY) return 1; this.x = b.x0; this.vx = -this.vx * 0.6; }
    if (this.x > b.x1) { if (goalY) return 0; this.x = b.x1; this.vx = -this.vx * 0.6; }
    if (this.y < b.y0) { this.y = b.y0; this.vy = -this.vy * 0.6; }
    if (this.y > b.y1) { this.y = b.y1; this.vy = -this.vy * 0.6; }
    return -1;
  }
  draw(ctx, t) { const img = ballSprite(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(this.x, this.y + 3, 4, 1.5, 0, 0, 7); ctx.fill(); ctx.drawImage(img, Math.round(this.x - 5), Math.round(this.y - 6 - Math.abs(Math.sin((this.x + this.y) / 9)) * Math.min(4, Math.hypot(this.vx, this.vy) / 40))); }
}
export class Bullet {
  constructor(x, y, ang, owner) { this.x = x; this.y = y; this.vx = Math.cos(ang) * 420; this.vy = Math.sin(ang) * 420; this.owner = owner; this.life = 0.8; }
  update(dt, G) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; if (solidAt(G.scene, this.x, this.y)) this.life = 0; }
  draw(ctx) { ctx.fillStyle = '#ffe080'; ctx.fillRect(this.x - 1, this.y - 1, 3, 3); }
}
export class Pickup {
  constructor(x, y, amount) { this.x = x; this.y = y; this.amount = amount; this.t = 0; }
  draw(ctx, t) { ctx.drawImage(moneySprite(), Math.round(this.x - 6), Math.round(this.y - 6 - Math.abs(Math.sin(t * 4)) * 2)); }
}
export { mulberry };
