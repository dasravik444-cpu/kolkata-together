// Interior scenes: cafes, malls, banks, home, shops, museums, cinema, clubs …
import { T, canvas, crisp, outline, shade, ell, poly, px, rrect, mulberry } from './util.js';
import { TL, carSprite, prop } from './art.js';
import { drawText, textWidth } from './font.js';
import { randomLook } from './chars.js';
import { MENUS, SHOP_NAMES } from './data.js';

/* --------------------------- furniture art --------------------------- */
const fc = {};
export function furn(kind, o = {}) {
  const key = kind + JSON.stringify(o);
  if (fc[key]) return fc[key];
  let c, ox = 0, oy = 0, g;
  const mk = (w, h) => { c = canvas(w, h); g = c.getContext('2d'); };
  const fin = (ol = true) => { crisp(c); if (ol) outline(c, '#1d1a24'); };
  switch (kind) {
    case 'table': { mk(20, 18); ell(g, 10, 7, 9, 6, o.top || '#f2efe8'); ell(g, 10, 6, 8, 4.5, shade(o.top || '#f2efe8', 0.08)); px(g, 9, 11, 2, 6, '#5a4030'); px(g, 6, 16, 8, 2, '#5a4030'); if (o.cloth) { ell(g, 10, 7, 9, 6, o.cloth); px(g, 2, 7, 16, 4, o.cloth); } fin(); ox = 10; oy = 17; break; }
    case 'chair': { mk(14, 18); const w = o.col || '#8a5a32'; if (o.dir === 'up') { px(g, 2, 9, 10, 4, w); px(g, 2, 12, 2, 5, shade(w, -0.3)); px(g, 10, 12, 2, 5, shade(w, -0.3)); } else { px(g, 2, 1, 10, 9, w); px(g, 3, 2, 8, 2, shade(w, 0.2)); px(g, 2, 9, 10, 4, shade(w, 0.1)); px(g, 2, 12, 2, 5, shade(w, -0.3)); px(g, 10, 12, 2, 5, shade(w, -0.3)); } fin(); ox = 7; oy = 17; break; }
    case 'counter': { const w = (o.w || 4) * 16; mk(w, 24); px(g, 0, 4, w, 20, o.col || '#6b4226'); px(g, 0, 2, w, 5, o.top || '#e8dcc0'); px(g, 0, 2, w, 1, '#ffffff'); for (let x = 6; x < w - 4; x += 12) px(g, x, 10, 8, 10, shade(o.col || '#6b4226', -0.15)); if (o.register) { px(g, w - 22, -0, 12, 7, '#2a2a30'); px(g, w - 20, 1, 8, 3, '#7ae07a'); } if (o.items) for (let x = 4; x < w - 26; x += 7) { ell(g, x + 3, 3, 2.5, 2, o.items[(x / 7 | 0) % o.items.length]); } fin(); ox = 0; oy = 23; break; }
    case 'display': { const w = (o.w || 3) * 16; mk(w, 26); px(g, 0, 8, w, 18, '#7a5030'); px(g, 1, 0, w - 2, 12, 'rgba(200,235,255,0.9)'); px(g, 1, 0, w - 2, 1, '#ffffff'); for (let x = 4; x < w - 4; x += 6) { const its = o.items || ['#7a3a1a', '#f2d0a0', '#f4f4f4', '#e05a7a']; const col = its[(x / 6 | 0) % its.length]; ell(g, x + 1, 9, 2.5, 2, col); ell(g, x + 3, 4, 2, 1.6, col); } fin(); oy = 25; break; }
    case 'shelf': { const w = (o.w || 2) * 16; mk(w, 36); px(g, 0, 0, w, 36, o.col || '#6b4226'); for (let s = 0; s < 4; s++) { px(g, 2, 2 + s * 8, w - 4, 6, shade(o.col || '#6b4226', -0.35)); for (let x = 3; x < w - 3; x += 3) px(g, x, 3 + s * 8, 2, 5, (o.items || ['#c0283a', '#2a6ac0', '#e3b341', '#3a8a4a', '#f2f2f2', '#8a3ab0'])[(x * 7 + s * 3) % 6]); } fin(); oy = 35; break; }
    case 'rack': { const w = (o.w || 2) * 16; mk(w, 30); px(g, 1, 2, w - 2, 2, '#9aa0a8'); px(g, 1, 2, 2, 28, '#9aa0a8'); px(g, w - 3, 2, 2, 28, '#9aa0a8'); for (let x = 4; x < w - 4; x += 4) { const its = o.items || ['#c0283a', '#2a6ac0', '#e3b341', '#3a8a4a', '#f2f2f2', '#1d1b20']; const col = its[(x / 4 | 0) % its.length]; px(g, x, 4, 4, 16, col); px(g, x, 4, 1, 16, shade(col, 0.2)); } fin(); oy = 29; break; }
    case 'shoeshelf': { const w = (o.w || 2) * 16; mk(w, 34); px(g, 0, 0, w, 34, '#e8e4dc'); for (let s = 0; s < 4; s++) { px(g, 1, 7 + s * 8, w - 2, 1, '#b8b4ac'); for (let x = 3; x < w - 6; x += 8) ell(g, x + 3, 5 + s * 8, 3.5, 1.8, ['#141216', '#f4f4f4', '#c0283a', '#d4a64a', '#8a5a32'][(x + s) % 5]); } fin(); oy = 33; break; }
    case 'mirror': { mk(16, 30); px(g, 1, 0, 14, 28, '#c9a24a'); px(g, 3, 2, 10, 24, '#cfe8f4'); px(g, 4, 3, 2, 10, '#ffffff'); fin(); oy = 29; break; }
    case 'salonchair': { mk(18, 20); px(g, 3, 2, 12, 10, '#1d1b20'); px(g, 2, 10, 14, 4, '#3a3a42'); px(g, 8, 14, 2, 4, '#9aa0a8'); px(g, 4, 17, 10, 2, '#9aa0a8'); fin(); ox = 9; oy = 19; break; }
    case 'plant': { mk(16, 26); px(g, 4, 16, 8, 9, o.pot || '#b8642a'); px(g, 3, 15, 10, 2, shade(o.pot || '#b8642a', 0.2)); for (let k = 0; k < 7; k++) ell(g, 8 + Math.cos(k) * 4, 9 + Math.sin(k * 1.3) * 5, 3, 4, k % 2 ? '#3f8f34' : '#56ad44'); fin(); ox = 8; oy = 25; break; }
    case 'sofa': { const w = (o.w || 3) * 16; mk(w, 22); px(g, 0, 2, w, 12, o.col || '#2f5a8a'); px(g, 0, 10, w, 10, shade(o.col || '#2f5a8a', 0.12)); px(g, 0, 2, 4, 18, shade(o.col || '#2f5a8a', -0.2)); px(g, w - 4, 2, 4, 18, shade(o.col || '#2f5a8a', -0.2)); for (let x = 6; x < w - 6; x += 12) px(g, x, 12, 1, 6, shade(o.col || '#2f5a8a', -0.2)); fin(); oy = 21; break; }
    case 'bed': { mk(32, 40); px(g, 0, 0, 32, 40, '#6b4226'); px(g, 2, 2, 28, 36, '#f2f2f2'); px(g, 2, 14, 28, 24, o.col || '#c0283a'); px(g, 2, 14, 28, 2, shade(o.col || '#c0283a', 0.2)); px(g, 5, 4, 10, 7, '#ffffff'); px(g, 17, 4, 10, 7, '#ffffff'); fin(); oy = 39; break; }
    case 'tv': { mk(32, 26); px(g, 0, 0, 32, 18, '#1d1b20'); px(g, 2, 2, 28, 14, o.on ? '#4a8ad4' : '#2a3040'); px(g, 3, 3, 8, 3, '#6aaaf4'); px(g, 4, 18, 24, 8, '#5a3a24'); fin(); oy = 25; break; }
    case 'wardrobe': { mk(32, 44); px(g, 0, 0, 32, 44, '#8a5a32'); px(g, 2, 2, 13, 40, '#a8703f'); px(g, 17, 2, 13, 40, '#a8703f'); px(g, 13, 20, 2, 4, '#e3b341'); px(g, 17, 20, 2, 4, '#e3b341'); fin(); oy = 43; break; }
    case 'fridge': { mk(16, 34); px(g, 0, 0, 16, 34, '#e8ecf0'); px(g, 0, 12, 16, 1, '#a8acb0'); px(g, 12, 4, 2, 6, '#9aa0a8'); px(g, 12, 16, 2, 8, '#9aa0a8'); fin(); oy = 33; break; }
    case 'stove': { mk(32, 24); px(g, 0, 4, 32, 20, '#e8e4dc'); px(g, 0, 2, 32, 4, '#3a3a42'); ell(g, 9, 3, 4, 1.5, '#1d1b20'); ell(g, 23, 3, 4, 1.5, '#1d1b20'); px(g, 18, -0, 10, 3, '#9aa0a8'); fin(); oy = 23; break; }
    case 'vault': { mk(32, 40); px(g, 0, 0, 32, 40, '#5a5e66'); ell(g, 16, 20, 14, 14, '#8a8e96'); ell(g, 16, 20, 11, 11, '#a8acb4'); ell(g, 16, 20, 4, 4, '#3a3e46'); for (let k = 0; k < 6; k++) px(g, 16 + Math.cos(k) * 8 - 1, 20 + Math.sin(k) * 8 - 1, 3, 3, '#3a3e46'); fin(); oy = 39; break; }
    case 'gunrack': { mk(48, 30); px(g, 0, 0, 48, 30, '#3a2a1a'); for (let k = 0; k < 4; k++) { px(g, 4 + k * 11, 6, 3, 18, '#1d1b20'); px(g, 3 + k * 11, 18, 5, 4, '#6b4226'); } px(g, 0, 26, 48, 4, '#2a1a0a'); fin(); oy = 29; break; }
    case 'pew': { mk((o.w || 4) * 16, 16); const w = (o.w || 4) * 16; px(g, 0, 2, w, 6, '#6b4226'); px(g, 0, 8, w, 5, '#8a5a32'); px(g, 2, 13, 2, 3, '#3a2a1a'); px(g, w - 4, 13, 2, 3, '#3a2a1a'); fin(); oy = 15; break; }
    case 'seat': { mk(16, 16); px(g, 2, 2, 12, 9, o.col || '#9c2f3c'); px(g, 2, 9, 12, 5, shade(o.col || '#9c2f3c', 0.15)); fin(); ox = 8; oy = 15; break; }
    case 'screen': { const w = (o.w || 10) * 16; mk(w, 40); px(g, 0, 0, w, 40, '#1d1b20'); px(g, 4, 4, w - 8, 32, o.lit ? '#e8f0ff' : '#c8d0dc'); fin(); oy = 39; break; }
    case 'stage': { const w = (o.w || 6) * 16; mk(w, 20); px(g, 0, 4, w, 16, '#3a2a4a'); px(g, 0, 2, w, 3, '#6a5a7a'); for (let x = 6; x < w; x += 20) { ell(g, x, 1, 3, 2, '#ffe9a0'); } fin(); oy = 19; break; }
    case 'drums': { mk(20, 18); ell(g, 10, 12, 7, 5, '#c0283a'); ell(g, 10, 10, 6, 3, '#f2f2f2'); ell(g, 3, 6, 3, 1.5, '#e3b341'); ell(g, 17, 6, 3, 1.5, '#e3b341'); fin(); ox = 10; oy = 17; break; }
    case 'mic': { mk(6, 22); px(g, 2, 4, 2, 18, '#9aa0a8'); ell(g, 3, 3, 2.5, 3, '#2a2a30'); fin(); ox = 3; oy = 21; break; }
    case 'exhibit': { mk(28, 40); px(g, 2, 26, 24, 14, '#d8d0c0'); px(g, 2, 26, 24, 2, '#f2ead8');
      if (o.what === 'mummy') { rrect(g, 7, 2, 14, 26, 5, '#c9a24a'); ell(g, 14, 7, 5, 5, '#e3c87a'); px(g, 11, 6, 2, 1, '#1d1b20'); px(g, 15, 6, 2, 1, '#1d1b20'); for (let y = 13; y < 26; y += 3) px(g, 8, y, 12, 1, '#8a6a2a'); }
      else if (o.what === 'dino') { for (let k = 0; k < 6; k++) px(g, 4 + k * 3, 12 - k, 2, 12, '#e8e4dc'); px(g, 3, 10, 22, 2, '#e8e4dc'); ell(g, 24, 6, 3, 3, '#e8e4dc'); px(g, 6, 18, 2, 8, '#e8e4dc'); px(g, 18, 18, 2, 8, '#e8e4dc'); }
      else if (o.what === 'buddha') { ell(g, 14, 20, 9, 6, '#c9a24a'); ell(g, 14, 12, 6, 7, '#c9a24a'); ell(g, 14, 4, 4, 4, '#c9a24a'); }
      else if (o.what === 'carriage') { px(g, 3, 8, 22, 14, '#7a1f2b'); px(g, 5, 10, 8, 6, '#9fd4f0'); px(g, 15, 10, 8, 6, '#9fd4f0'); ell(g, 7, 22, 4, 4, '#3a2a1a'); ell(g, 21, 22, 4, 4, '#3a2a1a'); }
      else if (o.what === 'meteor') { ell(g, 14, 18, 9, 7, '#4a4650'); ell(g, 11, 16, 3, 2, '#6a6670'); }
      else if (o.what === 'trophy') { px(g, 11, 18, 6, 8, '#c9a24a'); ell(g, 14, 10, 7, 8, '#e3c040'); px(g, 5, 8, 3, 6, '#e3c040'); px(g, 20, 8, 3, 6, '#e3c040'); }
      else if (o.what === 'statue') { px(g, 10, 8, 8, 18, '#f2efe8'); ell(g, 14, 6, 4, 4, '#f2efe8'); px(g, 8, 12, 12, 4, '#e2ddd3'); }
      else { px(g, 6, 6, 16, 20, '#b8402a'); for (let k = 0; k < 4; k++) px(g, 8 + k * 4, 8, 2, 16, '#d8b080'); }
      fin(); ox = 14; oy = 39; break; }
    case 'painting': { const w = o.w || 24; mk(w, 20); px(g, 0, 0, w, 20, '#c9a24a'); const r = mulberry(o.seed || 3); px(g, 2, 2, w - 4, 16, ['#5a8ac4', '#e8b060', '#4a8a4a', '#c46a5a'][(r() * 4) | 0]); for (let k = 0; k < 5; k++) ell(g, 4 + r() * (w - 8), 6 + r() * 9, 2 + r() * 4, 2 + r() * 3, ['#f2f2f2', '#3a5a2a', '#e3b341', '#8a3a3a', '#2a3a6a'][k]); fin(); oy = 19; break; }
    case 'window': { const w = o.w || 24; mk(w, 22); px(g, 0, 0, w, 22, '#f2f2f2'); px(g, 2, 2, w - 4, 18, o.night ? '#2a3a6a' : '#a8d8f4'); px(g, w / 2 - 1, 2, 2, 18, '#f2f2f2'); px(g, 2, 10, w - 4, 2, '#f2f2f2'); px(g, 4, 4, 4, 3, '#ffffff'); fin(); oy = 21; break; }
    case 'sign': { const s = (o.text || '').toUpperCase(); const w = Math.max(20, textWidth(s) + 8); mk(w, 12); px(g, 0, 0, w, 12, o.bg || '#1d1b20'); px(g, 0, 0, w, 1, shade(o.bg || '#1d1b20', 0.3)); drawText(g, s, 4, 3, o.fg || '#ffd94a'); fin(false); ox = w / 2; oy = 11; break; }
    case 'menuboard': { mk(28, 22); px(g, 0, 0, 28, 22, '#5a3a24'); px(g, 2, 2, 24, 18, '#1f2a24'); for (let k = 0; k < 5; k++) px(g, 4, 4 + k * 3, 10 + (k * 5) % 10, 1, '#f2f2f2'); fin(); oy = 21; break; }
    case 'hbed': { mk(20, 36); px(g, 0, 4, 20, 30, '#c8ccd4'); px(g, 2, 6, 16, 26, '#f2f8ff'); px(g, 2, 14, 16, 18, '#8ac4e8'); px(g, 4, 7, 12, 5, '#ffffff'); px(g, 0, 0, 20, 5, '#9aa0a8'); fin(); oy = 35; break; }
    case 'treadmill': { mk(16, 30); px(g, 2, 4, 12, 24, '#2a2a30'); px(g, 4, 8, 8, 18, '#4a4a52'); px(g, 2, 0, 12, 6, '#9aa0a8'); px(g, 5, 1, 6, 3, '#7ae07a'); fin(); oy = 29; break; }
    case 'weights': { mk(32, 20); px(g, 0, 6, 32, 3, '#9aa0a8'); for (let k = 0; k < 4; k++) { px(g, 3 + k * 7, 2, 4, 10, '#1d1b20'); } px(g, 0, 14, 32, 4, '#5a5a62'); fin(); oy = 19; break; }
    case 'turntable': { mk(32, 22); px(g, 0, 6, 32, 16, '#2a2a30'); ell(g, 9, 9, 6, 3, '#1d1b20'); ell(g, 23, 9, 6, 3, '#1d1b20'); ell(g, 9, 9, 2, 1, '#c0306a'); ell(g, 23, 9, 2, 1, '#30a0c0'); fin(); oy = 21; break; }
    case 'escalator': { mk(32, 44); px(g, 0, 0, 32, 44, '#9aa0a8'); px(g, 4, 0, 24, 44, '#5a5e66'); for (let y = 2; y < 44; y += 4) px(g, 4, y, 24, 1, '#c8ccd4'); px(g, 0, 0, 4, 44, '#c8e8f8'); px(g, 28, 0, 4, 44, '#c8e8f8'); fin(); oy = 43; break; }
    case 'kiosk': { mk(32, 30); px(g, 2, 12, 28, 18, o.col || '#e05a5a'); px(g, 0, 8, 32, 6, '#f2f2f2'); px(g, 0, 0, 32, 8, o.col || '#e05a5a'); for (let k = 0; k < 4; k++) ell(g, 6 + k * 7, 11, 2, 2, ['#f2d0a0', '#7a3a1a', '#e3b341', '#f4f4f4'][k]); fin(); oy = 29; break; }
    case 'rope': { mk(48, 16); px(g, 2, 2, 3, 14, '#c9a24a'); px(g, 43, 2, 3, 14, '#c9a24a'); g.strokeStyle = '#9c2f3c'; g.lineWidth = 2; g.beginPath(); g.moveTo(4, 4); g.quadraticCurveTo(24, 12, 44, 4); g.stroke(); fin(); oy = 15; break; }
    case 'chandelier': { mk(24, 14); px(g, 11, 0, 2, 4, '#c9a24a'); ell(g, 12, 7, 10, 3, '#e3c040'); for (let k = 0; k < 5; k++) ell(g, 4 + k * 4, 10, 1.5, 2, '#fff6c0'); fin(false); ox = 12; oy = 13; break; }
    case 'car': { const s = carSprite(o.type); c = s; ox = s.width / 2; oy = s.height; break; }
    case 'books': { mk(16, 10); for (let k = 0; k < 4; k++) px(g, 1 + k * 4, 2 + (k % 2), 3, 8, ['#c0283a', '#2a6ac0', '#e3b341', '#3a8a4a'][k]); fin(); ox = 8; oy = 9; break; }
    case 'desk': { const w = (o.w || 3) * 16; mk(w, 22); px(g, 0, 4, w, 18, '#5a4030'); px(g, 0, 2, w, 4, '#8a6a4a'); if (o.pc) { px(g, 6, -0, 12, 8, '#2a2a30'); px(g, 7, 1, 10, 5, '#5ab0f0'); } fin(); oy = 21; break; }
    case 'cell': { mk(48, 40); px(g, 0, 0, 48, 40, '#3a3a42'); px(g, 2, 2, 44, 36, '#5a5a62'); for (let x = 2; x < 48; x += 5) px(g, x, 0, 2, 40, '#9aa0a8'); fin(); oy = 39; break; }
    default: { const p = prop(kind); return (fc[key] = p); }
  }
  return (fc[key] = { img: c, ox, oy });
}

/* --------------------------- scene builder --------------------------- */
function room(id, name, W, H, pal) {
  const ground = new Uint8Array(W * H).fill(pal.floor ?? TL.WOOD);
  const solid = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) { ground[x] = TL.WALLTOP; ground[W + x] = TL.WALL; ground[2 * W + x] = TL.WALL; ground[(H - 1) * W + x] = TL.WALLTOP; solid[x] = solid[W + x] = solid[2 * W + x] = solid[(H - 1) * W + x] = 1; }
  for (let y = 0; y < H; y++) { ground[y * W] = TL.WALLTOP; ground[y * W + W - 1] = TL.WALLTOP; solid[y * W] = solid[y * W + W - 1] = 1; }
  const doorX = Math.floor(W / 2);
  ground[(H - 1) * W + doorX] = TL.RUG; solid[(H - 1) * W + doorX] = 0;
  const S = { kind: 'interior', id, name, W, H, ground, solid, objects: [], interact: [], npcs: [], seats: [], pal, door: { x: doorX, y: H - 1 }, spawn: { x: doorX * T + 8, y: (H - 2) * T + 8 } };
  S.put = (kind, tx, ty, o = {}, block = 1, bw = 1, bh = 1) => {
    const f = furn(kind, o);
    const dx = o.dx ?? (f.ox ? 8 : 0), dy = o.dy ?? 16;
    S.objects.push({ x: tx * T + dx, y: ty * T + dy, img: f.img, ox: f.ox, oy: f.oy, kind, z: o.z || 0 });
    if (block) for (let yy = ty; yy < ty + bh; yy++) for (let xx = tx; xx < tx + bw; xx++) if (xx > 0 && yy > 0 && xx < W && yy < H) solid[yy * W + xx] = 1;
  };
  S.wall = (kind, tx, o = {}) => S.put(kind, tx, 2, { ...o, dy: o.dy ?? 12 }, 0);
  S.act = (tx, ty, tw, th, kind, data, label) => S.interact.push({ x: tx * T, y: ty * T, w: tw * T, h: th * T, kind, data, label });
  S.npc = (tx, ty, role, o = {}) => S.npcs.push({ x: tx * T + 8, y: ty * T + 12, role, look: o.look || randomLook(tx * 13 + ty * 7 + id.length), dir: o.dir || 'down', line: o.line, wander: !!o.wander, name: o.name });
  S.seat = (tx, ty, dir, table) => { S.seats.push({ x: tx * T + 8, y: ty * T + 12, dir, table }); S.act(tx, ty, 1, 1, 'seat', S.seats.length - 1, 'Sit down'); };
  S.fillT = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ground[y * W + x] = t; };
  return S;
}

const CAFE_STYLE = {
  flurys: { floor: TL.PINK, wall: '#f6dfe4', stripe: '#b5566a', walltop: '#5a2a34', chair: '#f2f2f2', top: '#ffffff', cloth: null, display: ['#7a3a1a', '#f2d0a0', '#f4f4f4', '#e05a7a'], waiter: 'Flurys staff' },
  petercat: { floor: TL.DARKWOOD, wall: '#3a2a20', stripe: '#d9a441', walltop: '#1a120c', chair: '#7a1f2b', top: '#f4e8cc', cloth: '#f4e8cc', waiter: 'Peter Cat waiter', lamps: true },
  mocambo: { floor: TL.CARPET, carpet: '#7a1f2b', wall: '#f2e6cc', stripe: '#7a1f2b', walltop: '#3a1218', chair: '#3a1218', top: '#ffffff', cloth: '#ffffff', chand: true, waiter: 'Mocambo waiter' },
  trincas: { floor: TL.CHECKER, c1: '#141a2e', c2: '#2a3050', wall: '#1f2440', stripe: '#e05a8a', walltop: '#0c0f1c', chair: '#e05a8a', top: '#2a2a30', stage: true, waiter: 'Trincas waiter' },
  arsalan: { floor: TL.CHECKER, c1: '#1e3a24', c2: '#f2ead8', wall: '#e8f0e0', stripe: '#1e3a24', walltop: '#14281a', chair: '#1e3a24', top: '#f2f2f2', waiter: 'Arsalan waiter' },
  balaram: { floor: TL.IMARBLE, wall: '#fbf1d8', stripe: '#b8162c', walltop: '#5a2a1a', chair: '#b8162c', top: '#ffffff', display: ['#f4f4f4', '#e8c890', '#c8783a', '#f2e2b8'], sweets: true, waiter: 'Mishti counter' },
  coffeehouse: { floor: TL.WOOD, wood: '#b07a45', wall: '#efe4d2', stripe: '#6b4226', walltop: '#2a1a12', chair: '#2a1a12', top: '#c48a52', display: ['#c48a52', '#7a3a1a', '#f2d0a0', '#3a6aa8'], waiter: 'Barista' },
};

export function buildInterior(id) {
  const [type, sub] = id.split(':');
  switch (type) {
    case 'cafe': return cafe(sub);
    case 'mall': return mall(sub);
    case 'bank': return bank(sub);
    case 'home': return home();
    case 'armoury': return armoury();
    case 'salon': return salon();
    case 'hospital': return hospital();
    case 'police': return police();
    case 'museum': return museum(sub);
    case 'cinema': return cinema(sub);
    case 'theatre': return cinema('theatre');
    case 'planetarium': return cinema('planetarium');
    case 'cathedral': return cathedral();
    case 'gallery': return gallery();
    case 'market': return market();
    case 'bookstore': return bookstore();
    case 'club': return club(sub);
    case 'dealer': return dealer();
    case 'gym': return gym();
    case 'college': return college();
    case 'clubhouse': return clubhouse();
    case 'stadium': return stadium();
    default: return bookstore();
  }
}

function cafe(key) {
  const st = CAFE_STYLE[key] || CAFE_STYLE.coffeehouse;
  const menu = MENUS[key];
  const S = room('cafe:' + key, menu.name, 20, 14, { floor: st.floor, wall: st.wall, stripe: st.stripe, walltop: st.walltop, c1: st.c1, c2: st.c2, carpet: st.carpet, wood: st.wood });
  S.menu = key; S.cafe = true;
  // counter + staff
  S.put('counter', 12, 4, { w: 6, col: shade(st.walltop, 0.2), top: st.top, register: true, items: st.display }, 1, 6, 1);
  S.npc(14, 3, 'waiter', { name: st.waiter, look: { ...randomLook(key.length * 31), top: 'top_waiter', bottom: 'bot_trousers_black', hat: 'hat_none' } });
  S.npc(16, 3, 'barista', { line: `Welcome to ${menu.name}! Take a seat, I'll bring the menu.` });
  S.act(12, 5, 6, 1, 'menu', key, 'Order at the counter');
  if (st.display) { S.put('display', 7, 4, { w: 4, items: st.display }, 1, 4, 1); }
  S.wall('menuboard', 2); S.wall('sign', 5, { text: menu.name, bg: st.walltop, fg: '#ffd94a', dx: 40 });
  for (const wx of [10, 17]) S.wall('window', wx, { w: 24 });
  if (st.stage) { S.fillT(1, 3, 5, 6, TL.STAGE); S.put('stage', 1, 6, { w: 5 }, 0); S.put('drums', 2, 4, {}, 1); S.put('mic', 4, 5, {}, 1); S.npc(3, 5, 'band', { line: 'This one\'s an old Usha Uthup favourite — Trincas classic!', dir: 'down' }); S.npc(2, 3, 'band', { line: '♪ ♫ ♪' }); }
  if (st.chand) { for (const x of [5, 10, 15]) S.objects.push({ x: x * T, y: 6 * T, img: furn('chandelier').img, ox: 12, oy: -40, kind: 'chand', z: 1 }); }
  // tables with two chairs each
  const tables = st.stage ? [[8, 7], [12, 7], [16, 7], [4, 10], [8, 10], [12, 10], [16, 10]] : [[3, 7], [8, 7], [3, 10], [8, 10], [13, 9], [17, 9]];
  if (st.sweets) tables.splice(0, 2);
  tables.forEach(([tx, ty], i) => {
    S.put('table', tx, ty, { top: st.top, cloth: st.cloth }, 1);
    S.put('chair', tx - 1, ty, { col: st.chair, dir: 'down' }, 0); S.put('chair', tx + 1, ty, { col: st.chair, dir: 'down' }, 0);
    S.seat(tx - 1, ty, 'right', i); S.seat(tx + 1, ty, 'left', i);
    S.tables = S.tables || []; S.tables.push({ x: tx * T + 8, y: ty * T + 8 });
  });
  S.put('plant', 1, 12, {}, 1); S.put('plant', 18, 12, {}, 1);
  for (let k = 0; k < 2; k++) S.npc(k ? 13 : 3, k ? 12 : 12, 'customer', { wander: true, line: ['This place never changes — that\'s why I love it.', 'Try the specials, honestly.'][k] });
  return S;
}

function mall(key) {
  const names = { forum: 'Forum Mall', quest: 'Quest Mall', acropolis: 'Acropolis Mall', southcity: 'South City Mall' };
  const S = room('mall:' + key, names[key] || 'Mall', 42, 30, { floor: TL.MALLFLOOR, wall: '#f2f2f6', stripe: '#c8a050', walltop: '#3a3a48' });
  // top row shops
  const shops = [['men', 2, '#2a3a5a'], ['women', 12, '#c0306a'], ['ethnic', 22, '#b8862c'], ['shoes', 32, '#1d1b20']];
  for (const [k, x, col] of shops) {
    S.fillT(x, 3, x + 7, 8, k === 'ethnic' ? TL.CARPET : TL.WOOD);
    S.wall('sign', x + 4, { text: SHOP_NAMES[k].split(' — ')[0], bg: col, fg: '#ffffff', dx: 0 });
    if (k === 'shoes') { S.put('shoeshelf', x, 4, { w: 2 }, 1, 2, 1); S.put('shoeshelf', x + 3, 4, { w: 2 }, 1, 2, 1); S.put('shoeshelf', x + 6, 4, { w: 2 }, 1, 2, 1); }
    else { const items = k === 'men' ? ['#1d1b20', '#2a3a5a', '#f2f2f2', '#8fb8e0', '#6a6d75', '#c9b38a'] : k === 'women' ? ['#f08fb0', '#b8162c', '#f2d05a', '#26232b', '#4a6aa3', '#ffffff'] : ['#d9a441', '#c0182a', '#2741a8', '#2f8a8a', '#e3a1a8', '#f6f3ea'];
      S.put('rack', x, 4, { w: 2, items }, 1, 2, 1); S.put('rack', x + 3, 4, { w: 2, items: items.slice().reverse() }, 1, 2, 1); S.put('rack', x + 6, 4, { w: 2, items }, 1, 2, 1); }
    S.put('mirror', x + 7, 6, {}, 1);
    S.npc(x + 4, 7, 'shopkeeper', { line: 'Try anything on — the trial room is right here!' });
    S.act(x, 6, 8, 3, 'shop', k, SHOP_NAMES[k]);
  }
  // middle atrium
  S.put('escalator', 19, 12, {}, 1, 2, 2); S.put('escalator', 22, 12, {}, 1, 2, 2);
  S.put('plant', 16, 12, {}, 1); S.put('plant', 26, 12, {}, 1);
  for (const x of [6, 12, 30, 36]) S.put('sofa', x, 14, { w: 2, col: '#5a2a8a' }, 1, 2, 1);
  S.put('kiosk', 9, 11, { col: '#e8603c' }, 1, 2, 1); S.act(9, 12, 2, 1, 'menu', 'foodcourt', 'Snack kiosk');
  // bottom row: salon, eyewear, jewellery, sports, food court, cinema
  S.fillT(1, 18, 9, 27, TL.PINK); S.put('sign', 5, 17, { text: 'GLAM PARLOUR', bg: '#c0306a', fg: '#ffffff' }, 0);
  for (const x of [2, 5, 8]) { S.put('mirror', x, 19, {}, 1); S.put('salonchair', x, 21, {}, 1); }
  S.npc(5, 24, 'stylist', { line: 'Hair, makeup, nails — sit, let\'s make you gorgeous.' }); S.act(1, 22, 9, 4, 'salon', null, 'Beauty parlour');
  S.fillT(11, 18, 16, 27, TL.IMARBLE); S.put('sign', 13, 17, { text: 'SPECS & SHADES', bg: '#1d1b20' }, 0);
  S.put('display', 11, 20, { w: 3, items: ['#1d1b20', '#c9a24a', '#7a1f3a', '#e090b0'] }, 1, 3, 1); S.put('mirror', 15, 20, {}, 1);
  S.npc(13, 23, 'shopkeeper', { line: 'Aviators are trending this season.' }); S.act(11, 21, 6, 4, 'shop', 'eyewear', 'Specs & Shades');
  S.fillT(18, 18, 23, 27, TL.CARPET); S.put('sign', 20, 17, { text: 'GOLD LEAF', bg: '#5a2a1a', fg: '#ffd94a' }, 0);
  S.put('display', 18, 20, { w: 4, items: ['#e3c040', '#c9a24a', '#e8f4ff', '#d4a64a'] }, 1, 4, 1);
  S.npc(20, 23, 'shopkeeper', { line: 'Pure 22-carat. Jhumkas for the pujo?' }); S.act(18, 21, 6, 4, 'shop', 'jewel', 'Gold Leaf Jewellers');
  S.fillT(25, 18, 29, 27, TL.WOOD); S.put('sign', 27, 17, { text: 'SPORTS', bg: '#1f7a3a', fg: '#ffffff' }, 0);
  S.put('rack', 25, 20, { w: 2, items: ['#1f7a3a', '#8a1b2e', '#d42a2a', '#f2c230', '#1a1a1a', '#2aa3d4'] }, 1, 2, 1); S.put('rack', 28, 20, { w: 1, items: ['#1d1b20', '#c0283a'] }, 1, 1, 1);
  S.npc(27, 23, 'shopkeeper', { line: 'Derby jerseys just restocked!' }); S.act(25, 21, 5, 4, 'shop', 'sports', 'Maidan Sports');
  // food court
  S.fillT(31, 18, 40, 27, TL.CHECKER); S.put('sign', 36, 17, { text: 'FOOD COURT', bg: '#e8603c', fg: '#ffffff' }, 0);
  S.put('kiosk', 31, 19, { col: '#d42a2a' }, 1, 2, 1); S.put('kiosk', 34, 19, { col: '#2a8a5a' }, 1, 2, 1); S.put('kiosk', 37, 19, { col: '#f2c230' }, 1, 2, 1);
  S.act(31, 20, 9, 1, 'menu', 'foodcourt', 'Food court counters');
  S.menu = 'foodcourt';
  [[33, 23], [37, 23], [33, 26], [37, 26]].forEach(([tx, ty], i) => { S.put('table', tx, ty, { top: '#f2f2f2' }, 1); S.put('chair', tx - 1, ty, { col: '#e8603c' }, 0); S.put('chair', tx + 1, ty, { col: '#e8603c' }, 0); S.seat(tx - 1, ty, 'right', i); S.seat(tx + 1, ty, 'left', i); S.tables = S.tables || []; S.tables.push({ x: tx * T + 8, y: ty * T + 8 }); });
  S.npc(35, 21, 'waiter', { name: 'Food court staff', look: { ...randomLook(99), top: 'top_tee_yellow' } });
  // cinema entrance on the right wall + rope
  S.wall('sign', 39, { text: 'CINEPLEX', bg: '#7a1f2b', fg: '#ffd94a' }); S.put('rope', 37, 10, {}, 0); S.act(38, 9, 3, 3, 'cinema', names[key], 'Cineplex — watch a movie (₹350)');
  for (let k = 0; k < 6; k++) S.npc(6 + k * 6, 15 + (k % 2) * 1, 'customer', { wander: true, line: ['The sale is insane today!', 'Meet me at the food court in ten.', 'Have you seen the new movie?', 'This mall is so cold, I love it.', 'I came for one thing and bought five.', 'Selfie by the escalator?'][k] });
  S.npc(21, 27, 'guard', { name: 'Security', line: 'Welcome! Bags through the scanner please.', look: { ...randomLook(5), top: 'top_blazer', bottom: 'bot_trousers_black' } });
  return S;
}

function bank(key) {
  const S = room('bank:' + key, key === 'bengal' ? 'Bank of Bengal' : 'Hooghly National Bank', 22, 15, { floor: TL.IMARBLE, wall: '#e8dcc0', stripe: '#2a4a8a', walltop: '#2a2a35' });
  S.bank = true;
  S.put('counter', 2, 7, { w: 15, col: '#5a4030', top: '#d8d0c0' }, 1, 15, 1);
  for (const x of [5, 9, 13]) { S.npc(x, 6, 'teller', { name: 'Teller', look: { ...randomLook(x * 3), top: 'top_blazer' }, line: 'Good day! How may I help you?' }); S.act(x - 1, 8, 3, 1, 'bank', key, 'Teller — banking'); }
  S.put('vault', 9, 4, {}, 1, 2, 1); S.wall('sign', 6, { text: 'VAULT', bg: '#5a5e66', fg: '#f2f2f2' });
  S.act(9, 5, 2, 1, 'vault', key, 'Bank vault');
  // staff gap at the right end of the counter
  S.npc(18, 9, 'guard', { name: 'Guard', line: 'Staff only beyond this point, sir/madam.', look: { ...randomLook(77), top: 'top_shirt_blue', hat: 'hat_cap' } });
  S.put('rope', 3, 11, {}, 0); S.put('rope', 12, 11, {}, 0);
  S.put('plant', 1, 13, {}, 1); S.put('plant', 20, 13, {}, 1); S.put('sofa', 15, 12, { w: 3, col: '#2a4a8a' }, 1, 3, 1);
  S.wall('painting', 2, { w: 28, seed: 4 }); S.wall('painting', 17, { w: 28, seed: 9 });
  S.put('atm', 1, 9, {}, 1); S.act(1, 10, 1, 1, 'atm', null, 'ATM');
  return S;
}

function home() {
  const S = room('home', 'Our Flat — Park Mansions', 20, 14, { floor: TL.WOOD, wall: '#f2e2c8', stripe: '#c48a52', walltop: '#5a3a24', wood: '#c48a52', rug: '#7a1f2b', rug2: '#e3b341' });
  S.home = true;
  S.fillT(6, 7, 12, 10, TL.RUG);
  S.put('bed', 1, 5, { col: '#2f5a8a' }, 1, 2, 3); S.act(1, 6, 3, 3, 'sleep', null, 'Sleep (skip to morning)');
  S.put('wardrobe', 4, 4, {}, 1, 2, 1); S.act(4, 5, 2, 1, 'wardrobe', null, 'Wardrobe — change clothes');
  S.put('mirror', 6, 4, {}, 1); S.act(6, 5, 1, 1, 'wardrobe', null, 'Mirror');
  S.put('tv', 8, 4, { on: true }, 1, 2, 1); S.act(8, 5, 2, 1, 'tv', null, 'Watch TV');
  S.put('sofa', 7, 11, { w: 3, col: '#5a2a3a' }, 1, 3, 1);
  S.seat(7, 10, 'up', 'sofa'); S.seat(8, 10, 'up', 'sofa'); S.seat(9, 10, 'up', 'sofa');
  S.put('fridge', 13, 4, {}, 1); S.put('stove', 14, 4, {}, 1, 2, 1); S.put('counter', 16, 4, { w: 3, col: '#e8e4dc', top: '#9aa0a8' }, 1, 3, 1);
  S.act(13, 5, 6, 1, 'cook', null, 'Kitchen — cook Maggi / make chai');
  S.put('table', 15, 9, { top: '#c48a52' }, 1); S.put('chair', 14, 9, { col: '#6b4226' }, 0); S.put('chair', 16, 9, { col: '#6b4226' }, 0); S.seat(14, 9, 'right', 0); S.seat(16, 9, 'left', 0);
  S.tables = [{ x: 15 * T + 8, y: 9 * T + 8 }];
  S.put('shelf', 11, 4, { w: 1 }, 1); S.put('plant', 18, 12, {}, 1); S.put('plant', 1, 12, {}, 1);
  S.wall('window', 3, { w: 28 }); S.wall('painting', 15, { w: 22, seed: 11 }); S.wall('window', 11, { w: 22 });
  return S;
}

function armoury() {
  const S = room('armoury', 'Maidan Armoury', 16, 11, { floor: TL.CHECKER, c1: '#3a3a40', c2: '#4a4a52', wall: '#5a5a52', stripe: '#d42a2a', walltop: '#1d1b20' });
  S.put('gunrack', 2, 3, {}, 0); S.put('gunrack', 10, 3, {}, 0);
  S.put('counter', 3, 6, { w: 10, col: '#3a2a1a', top: '#5a5a62', register: true }, 1, 10, 1);
  S.npc(8, 5, 'dealer', { name: 'Arms dealer', line: 'Licensed and legal… mostly. What do you need?', look: { ...randomLook(4), top: 'top_jacket', glasses: 'eye_aviator', beard: 'full', gender: 'm' } });
  S.act(3, 7, 10, 1, 'weapons', null, 'Buy weapons');
  return S;
}

function salon() {
  const S = room('salon', 'Glam Salon', 16, 11, { floor: TL.PINK, wall: '#f8e0ea', stripe: '#c0306a', walltop: '#5a1a3a' });
  for (const x of [2, 5, 8, 11]) { S.put('mirror', x, 3, {}, 0); S.put('salonchair', x, 5, {}, 1); }
  S.npc(7, 7, 'stylist', { name: 'Stylist', line: 'Haircut, colour, makeup, nails, beard trim — your wish!' });
  S.act(1, 6, 14, 3, 'salon', null, 'Salon services');
  S.put('plant', 14, 9, {}, 1); S.put('sofa', 1, 9, { w: 3, col: '#c0306a' }, 1, 3, 1);
  return S;
}

function hospital() {
  const S = room('hospital', 'SSKM Hospital', 22, 14, { floor: TL.TILEBLUE, wall: '#f2f8ff', stripe: '#2a6ac0', walltop: '#2a3a5a' });
  S.put('desk', 8, 5, { w: 6, pc: true }, 1, 6, 1);
  S.npc(10, 4, 'doctor', { name: 'Dr. Banerjee', line: 'Feeling unwell? I can patch you up.', look: { ...randomLook(8), top: 'top_shirt_blue', glasses: 'eye_round' } });
  S.act(8, 6, 6, 1, 'heal', null, 'Reception — get treated');
  for (let k = 0; k < 4; k++) { S.put('hbed', 2 + k * 5, 8, {}, 1, 1, 2); }
  for (let k = 0; k < 3; k++) S.npc(3 + k * 6, 12, 'customer', { wander: true, line: ['Waiting for my report…', 'The doctors here are angels.', 'Busy day at SSKM.'][k] });
  S.wall('sign', 11, { text: 'EMERGENCY', bg: '#d42a2a', fg: '#ffffff' });
  return S;
}

function police() {
  const S = room('police', 'Police Station', 18, 12, { floor: TL.CHECKER, c1: '#c8c4b8', c2: '#e8e4dc', wall: '#e8e0d0', stripe: '#c8302a', walltop: '#3a2a20' });
  S.put('desk', 6, 5, { w: 5, pc: true }, 1, 5, 1);
  S.npc(8, 4, 'cop', { name: 'Inspector Ghosh', line: 'Behave yourself in my city.', look: 'police' });
  S.act(6, 6, 5, 1, 'police', null, 'Front desk — pay fines');
  S.put('cell', 13, 4, {}, 1, 3, 2); S.put('cell', 1, 4, {}, 1, 3, 2);
  S.wall('sign', 9, { text: 'KOLKATA POLICE', bg: '#2a4a8a', fg: '#ffffff' });
  return S;
}

function museum(sub) {
  const isV = sub === 'victoria';
  const S = room('museum:' + sub, isV ? 'Victoria Memorial — Galleries' : 'Indian Museum', 26, 16, { floor: TL.IMARBLE, wall: isV ? '#f6f3ec' : '#e8d4b8', stripe: '#c9a24a', walltop: '#4a3a2a' });
  const ex = isV
    ? [['statue', 'Queen Victoria — marble statue in the central hall under the great dome.'], ['carriage', 'A royal carriage — Calcutta was the capital of British India until 1911.'], ['painting', 'The Calcutta Gallery: paintings of old Calcutta by Thomas & William Daniell.'], ['trophy', 'Royal Gallery: memorabilia, coins and textiles.']]
    : [['mummy', 'Egyptian mummy — about 4,000 years old, one of the museum\'s star exhibits.'], ['dino', 'Fossil skeleton in the natural history gallery.'], ['buddha', 'Gandhara Buddha — Kushan period sculpture.'], ['meteor', 'Meteorite collection — one of the largest in Asia.'], ['railing', 'Bharhut stupa railing, 2nd century BCE.']];
  ex.forEach(([what, txt], i) => { const x = 3 + i * 5; S.put('exhibit', x, 6, { what }, 1); S.act(x - 1, 7, 3, 1, 'read', txt, 'Read the plaque'); });
  for (let k = 0; k < 5; k++) S.wall('painting', 2 + k * 5, { w: 28, seed: k + 20 });
  S.put('rope', 4, 10, {}, 0); S.put('rope', 15, 10, {}, 0);
  for (let k = 0; k < 4; k++) S.npc(4 + k * 5, 12, 'customer', { wander: true, line: ['Founded in 1814 — the oldest museum in India!', 'I could spend all day here.', 'Look at the detail on that!', 'School trip memories…'][k] });
  return S;
}

function cinema(sub) {
  const isP = sub === 'planetarium', isT = sub === 'theatre';
  const S = room('cinema:' + sub, isP ? 'Birla Planetarium' : isT ? 'Rabindra Sadan' : sub === 'nandan' ? 'Nandan' : 'Metro Cinema', 20, 15, { floor: isP ? TL.CARPET : TL.CARPET, carpet: isP ? '#1a1a3a' : '#5a1a2a', wall: isP ? '#1a1a3a' : '#2a1a2a', stripe: '#c9a24a', walltop: '#0c0c14' });
  if (isT) { S.fillT(3, 3, 16, 5, TL.STAGE); S.put('stage', 3, 5, { w: 14 }, 0); S.npc(9, 4, 'band', { line: 'Tonight: a Tagore dance-drama — "Chitrangada".' }); S.npc(11, 4, 'band', { line: '♪ Rabindra Sangeet ♪' }); }
  else S.put('screen', 3, 3, { w: 14, lit: true }, 0);
  S.cinema = isP ? 'planetarium' : isT ? 'theatre' : 'movie';
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) { const x = 5 + k, y = 7 + r * 2; S.put('seat', x, y, { col: isP ? '#2a2a6a' : '#9c2f3c' }, 0); S.seat(x, y, 'up', 'show'); }
  return S;
}

function cathedral() {
  const S = room('cathedral', "St Paul's Cathedral", 18, 16, { floor: TL.IMARBLE, wall: '#f2eee4', stripe: '#6a8aa8', walltop: '#3a3a4a' });
  S.fillT(8, 3, 9, 14, TL.CARPET);
  for (let r = 0; r < 4; r++) { S.put('pew', 2, 7 + r * 2, { w: 5 }, 1, 5, 1); S.put('pew', 11, 7 + r * 2, { w: 5 }, 1, 5, 1); }
  S.put('desk', 7, 4, { w: 4 }, 1, 4, 1); S.act(7, 5, 4, 1, 'read', 'St Paul\'s Cathedral (1847) — Indo-Gothic, with a stained-glass west window by Burne-Jones.', 'Altar');
  for (let k = 0; k < 4; k++) S.wall('window', 2 + k * 4, { w: 20 });
  return S;
}

function gallery() {
  const S = room('gallery', 'Academy of Fine Arts', 20, 12, { floor: TL.WOOD, wood: '#d8b88a', wall: '#f8f6f0', walltop: '#3a3a3a' });
  for (let k = 0; k < 6; k++) { S.wall('painting', 2 + k * 3, { w: 28, seed: 40 + k }); S.act(2 + k * 3, 3, 2, 1, 'read', ['A Jamini Roy-style folk painting.', 'Old Calcutta street scene in watercolour.', 'An abstract in deep reds — very Kolkata.', 'Portrait of a baul singer.', 'Durga Puja pandal sketch.', 'The Hooghly at dusk, oil on canvas.'][k], 'Look at painting'); }
  S.put('exhibit', 9, 7, { what: 'statue' }, 1);
  S.npc(14, 9, 'customer', { wander: true, line: 'The new exhibition is wonderful.' });
  return S;
}

function market() {
  const S = room('market', 'New Market (Hogg Market)', 30, 18, { floor: TL.PLAZA, wall: '#b84a32', stripe: '#f2ead8', walltop: '#5a1a12' });
  S.ground.fill(TL.PLAZA); for (let x = 0; x < 30; x++) { S.ground[x] = TL.WALLTOP; S.ground[30 + x] = TL.WALL; S.ground[60 + x] = TL.WALL; S.ground[17 * 30 + x] = TL.WALLTOP; } for (let y = 0; y < 18; y++) { S.ground[y * 30] = TL.WALLTOP; S.ground[y * 30 + 29] = TL.WALLTOP; } S.ground[17 * 30 + 15] = TL.RUG;
  const stalls = [['ethnic', 'Saree & kurta stall'], ['shoes', 'Shoe stall'], ['jewel', 'Bangles & jewellery'], ['menu:market', 'Nahoum\'s bakery']];
  MENUS.market = MENUS.market || { name: "Nahoum's Bakery", tag: 'New Market bakery since 1902', theme: ['#f2e2b8', '#5a2a1a', '#2a1a12'], items: [['Plum Cake slice', 90, 'pastry'], ['Chocolate Brownie', 80, 'brownie'], ['Lemon Tart', 70, 'tart'], ['Chicken Patty', 60, 'croissant'], ['Rum Ball', 60, 'rumball']] };
  stalls.forEach(([k, label], i) => {
    const x = 2 + i * 7;
    S.put('kiosk', x, 5, { col: ['#c0182a', '#2a6ac0', '#c9a24a', '#5a2a1a'][i] }, 1, 2, 1); S.put('rack', x + 2, 4, { w: 2 }, 1, 2, 1);
    S.npc(x + 2, 6, 'shopkeeper', { line: ['Didi, best price for you!', 'Pure leather, dada!', 'Shakha-pola, bangles — come see!', 'Fresh from the oven since 1902!'][i] });
    if (k.startsWith('menu')) S.act(x, 6, 4, 2, 'menu', 'market', label); else S.act(x, 6, 4, 2, 'shop', k, label);
  });
  for (let k = 0; k < 8; k++) S.npc(3 + k * 3, 11 + (k % 3), 'customer', { wander: true, line: ['Bargain hard, always!', 'New Market for everything since forever.', 'Christmas cakes from Nahoum\'s — tradition!', 'So crowded today!'][k % 4] });
  for (let k = 0; k < 4; k++) S.put('kiosk', 4 + k * 7, 13, { col: ['#2a8a5a', '#e8603c', '#8a3ab0', '#2a6ac0'][k] }, 1, 2, 1);
  return S;
}

function bookstore() {
  const S = room('bookstore', 'Oxford Bookstore', 18, 12, { floor: TL.WOOD, wood: '#a8703f', wall: '#efe4d2', stripe: '#1f3a5a', walltop: '#1f3a5a' });
  for (let k = 0; k < 5; k++) S.put('shelf', 1 + k * 3, 3, { w: 2 }, 1, 2, 1);
  for (let k = 0; k < 5; k++) S.act(1 + k * 3, 4, 2, 1, 'read', ['"The City of Joy" — Dominique Lapierre.', 'Feluda mysteries by Satyajit Ray!', 'Gitanjali — Rabindranath Tagore.', 'Byomkesh Bakshi collection.', 'A coffee-table book on Kolkata\'s heritage buildings.'][k], 'Browse books');
  S.put('table', 6, 8, { top: '#c48a52' }, 1); S.put('table', 11, 8, { top: '#c48a52' }, 1);
  S.put('counter', 14, 6, { w: 3, register: true }, 1, 3, 1); S.npc(15, 5, 'shopkeeper', { line: 'Our café upstairs does lovely tea.' });
  return S;
}

function club(sub) {
  if (sub === 'park') {
    const S = room('club:park', 'The Park — Nightclub', 22, 14, { floor: TL.CHECKER, c1: '#141428', c2: '#2a1a4a', wall: '#1a1030', stripe: '#c0306a', walltop: '#0a0814' });
    S.club = true;
    S.fillT(6, 6, 15, 11, TL.STAGE);
    S.put('turntable', 9, 4, {}, 1, 2, 1); S.npc(10, 3, 'dj', { name: 'DJ', line: 'Requests? Bollywood remix coming up!', look: { ...randomLook(66), glasses: 'eye_wayfarer', hat: 'hat_cap' } });
    S.act(6, 6, 10, 6, 'dance', null, 'Dance floor');
    S.put('counter', 16, 4, { w: 5, col: '#2a1a3a', top: '#c0306a' }, 1, 5, 1); S.npc(18, 3, 'barista', { name: 'Bartender', line: 'Mocktails on the house for the birthday crew!' }); S.act(16, 5, 5, 1, 'menu', 'trincas', 'Bar');
    for (let k = 0; k < 6; k++) S.npc(7 + k, 8 + (k % 2) * 2, 'dancer', { line: ['What a song!', 'Best night ever!', 'Dance with us!'][k % 3] });
    return S;
  }
  const names = { mb: 'Mohun Bagan Club', eb: 'East Bengal Club', md: 'Mohammedan Sporting Club' };
  const cols = { mb: ['#1f7a3a', '#8a1b2e'], eb: ['#d42a2a', '#f2c230'], md: ['#1a1a1a', '#f2f2f2'] };
  const S = room('club:' + sub, names[sub], 18, 11, { floor: TL.WOOD, wall: cols[sub][0], stripe: cols[sub][1], walltop: '#1d1b20' });
  for (let k = 0; k < 4; k++) S.put('exhibit', 3 + k * 3, 4, { what: 'trophy' }, 1);
  S.act(2, 5, 12, 1, 'read', sub === 'mb' ? 'Mohun Bagan — founded 1889. Their 1911 IFA Shield win over a British team is legendary.' : sub === 'eb' ? 'East Bengal — founded 1920. The Kolkata Derby vs Mohun Bagan is Asia\'s biggest football rivalry.' : 'Mohammedan Sporting — founded 1891, first Indian club to win the Calcutta Football League (1934).', 'Trophy cabinet');
  S.put('rack', 14, 4, { w: 2, items: [cols[sub][0], cols[sub][1], cols[sub][0]] }, 1, 2, 1); S.act(14, 5, 2, 1, 'shop', 'sports', 'Club merchandise');
  S.npc(8, 8, 'customer', { line: sub === 'eb' ? 'Joy East Bengal!' : sub === 'mb' ? 'Joy Mohun Bagan!' : 'Black-and-white forever!' });
  return S;
}

function dealer() {
  const S = room('dealer', 'Park Street Motors', 24, 14, { floor: TL.IMARBLE, wall: '#e8e8ee', stripe: '#d42a2a', walltop: '#1d1b20' });
  S.dealer = true;
  const cars = ['sports_red', 'sports_black', 'sports_lime', 'sports_blue', 'sports_orange', 'suv'];
  cars.forEach((t, i) => { const x = 4 + (i % 3) * 7, y = 6 + Math.floor(i / 3) * 4; S.put('car', x, y, { type: t, dx: 8, dy: 12 }, 1, 2, 1); S.act(x - 1, y + 1, 4, 1, 'buycar', t, 'Look at this car'); });
  S.npc(20, 5, 'dealer', { name: 'Car salesman', line: 'Fresh supercars, straight to Park Street!', look: { ...randomLook(12), top: 'top_blazer', glasses: 'eye_aviator' } });
  return S;
}

function gym() {
  const S = room('gym', 'Iron Paradise Gym', 18, 11, { floor: TL.CHECKER, c1: '#2a2a30', c2: '#3a3a42', wall: '#3a3a42', stripe: '#f2c230', walltop: '#141418' });
  for (let k = 0; k < 3; k++) { S.put('treadmill', 2 + k * 2, 3, {}, 1); }
  S.put('weights', 10, 4, {}, 1, 2, 1); S.put('weights', 13, 4, {}, 1, 2, 1);
  S.act(2, 4, 14, 2, 'workout', null, 'Work out');
  S.npc(9, 8, 'trainer', { name: 'Trainer', line: 'No pain, no gain! Hit the treadmill.', look: { ...randomLook(3), top: 'top_tee_black', gender: 'm' } });
  return S;
}

function college() {
  const S = room('college', "St. Xavier's College", 20, 12, { floor: TL.WOOD, wall: '#e8d8b8', stripe: '#1f3a5a', walltop: '#3a2a1a' });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) S.put('desk', 3 + k * 5, 5 + r * 2, { w: 3 }, 1, 3, 1);
  S.wall('menuboard', 9); S.act(8, 3, 4, 1, 'read', "St. Xavier's College, est. 1860. The board reads: 'Nihil Ultra' — Nothing Beyond.", 'Blackboard');
  S.npc(16, 4, 'customer', { name: 'Professor', line: 'Lecture is over — go enjoy Park Street!' });
  return S;
}

function clubhouse() {
  const S = room('clubhouse', 'Royal Calcutta Golf Club', 18, 11, { floor: TL.CARPET, carpet: '#1f4a2a', wall: '#f2ead8', stripe: '#1f4a2a', walltop: '#2a1a12' });
  S.put('counter', 10, 4, { w: 6 }, 1, 6, 1); S.npc(12, 3, 'barista', { name: 'Steward', line: 'Founded 1829 — the oldest golf club outside Britain. Fancy a round?' }); S.act(10, 5, 6, 1, 'menu', 'flurys', 'Clubhouse tea');
  S.put('sofa', 2, 7, { w: 3, col: '#5a3a24' }, 1, 3, 1); S.act(2, 4, 4, 2, 'golf', null, 'Book a round of golf');
  S.wall('painting', 3, { w: 28, seed: 7 });
  return S;
}

function stadium() {
  const S = room('stadium', 'Eden Gardens', 26, 18, { floor: TL.GRASSIN, wall: '#c0c4cc', stripe: '#3a6aa8', walltop: '#2a2a35' });
  S.fillT(11, 6, 14, 13, TL.DIRT);
  for (let k = 0; k < 12; k++) S.npc(2 + k * 2, 3, 'fan', { line: ['Six! SIX!', 'Kolkata Knight Riders!', 'Korbo, lorbo, jeetbo!'][k % 3], dir: 'down' });
  S.act(11, 13, 4, 2, 'cricket', null, 'Batting nets — play cricket');
  S.npc(12, 6, 'customer', { name: 'Bowler', line: 'Ready? I\'ll bowl you a few!' });
  return S;
}
