// Procedural pixel art for the world: tiles, buildings, landmarks, props, vehicles, animals.
import { T, canvas, crisp, outline, shade, mix, ell, poly, px, rrect, mulberry, rgba } from './util.js';
import { drawText, textWidth } from './font.js';

/* ============================ TILES ============================ */
export const TL = {
  GRASS: 0, FLOWERS: 1, ROAD: 2, DASH_H: 3, DASH_V: 4, SIDEWALK: 5, WATER: 6, PATH: 7, PLAZA: 8, MARBLE: 9,
  TRACK: 10, FAIRWAY: 11, GREEN: 12, BUNKER: 13, POOL: 14, ZEBRA_H: 15, ZEBRA_V: 16, BRIDGE: 17, PITCH: 18,
  PITCH_LINE: 19, TALLGRASS: 20, SAND: 21, DECK: 22, TRAM: 23, PARK: 24, DIRT: 25, SHALLOW: 26, LANE_H: 27, LANE_V: 28,
  // interior
  WOOD: 30, CHECKER: 31, IMARBLE: 32, CARPET: 33, WALL: 34, WALLTOP: 35, MALLFLOOR: 36, PINK: 37, DARKWOOD: 38, RUG: 39, VOID: 40, TILEBLUE: 41,
  GRASSIN: 42, STAGE: 43,
};
export const WATERY = new Set([TL.WATER, TL.POOL, TL.SHALLOW]);
export const ROADS = new Set([TL.ROAD, TL.DASH_H, TL.DASH_V, TL.ZEBRA_H, TL.ZEBRA_V, TL.BRIDGE, TL.TRAM, TL.LANE_H, TL.LANE_V]);
export const SOLID_TILES = new Set([TL.WALL, TL.WALLTOP, TL.VOID]);

const GR = ['#7ccf5a', '#6cbf4c', '#8fdc6a', '#5aa83e'];

export function paintTile(ctx, id, x, y, seed, pal = {}) {
  const r = mulberry(seed);
  const P = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, w, h); };
  const noise = (base, cols, n) => { P(0, 0, 16, 16, base); for (let i = 0; i < n; i++) P((r() * 16) | 0, (r() * 16) | 0, 1, 1, cols[(r() * cols.length) | 0]); };
  switch (id) {
    case TL.GRASS: case TL.GRASSIN:
      noise(GR[0], [GR[1], GR[2]], 14);
      for (let i = 0; i < 3; i++) { const gx = (r() * 13) | 0, gy = (r() * 13) | 0; P(gx, gy + 1, 1, 2, GR[3]); P(gx + 2, gy, 1, 3, GR[3]); P(gx + 1, gy + 2, 1, 1, GR[3]); }
      break;
    case TL.TALLGRASS:
      P(0, 0, 16, 16, '#5fb848');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const gx = i * 4 + j * 2, gy = j * 8; P(gx, gy + 2, 1, 6, '#3f8f34'); P(gx + 1, gy, 1, 7, '#86d863'); P(gx + 2, gy + 3, 1, 5, '#3f8f34'); }
      break;
    case TL.FLOWERS:
      noise(GR[0], [GR[1], GR[2]], 10);
      for (let i = 0; i < 4; i++) { const fx = (r() * 13 + 1) | 0, fy = (r() * 13 + 1) | 0, c = ['#f05a7a', '#ffd94a', '#ffffff', '#ff9a3c', '#c86af0'][(r() * 5) | 0]; P(fx - 1, fy, 3, 1, c); P(fx, fy - 1, 1, 3, c); P(fx, fy, 1, 1, '#ffef9a'); }
      break;
    case TL.ROAD: case TL.DASH_H: case TL.DASH_V: case TL.TRAM: case TL.LANE_H: case TL.LANE_V:
      noise('#5b5d66', ['#53555e', '#64666f', '#4c4e56'], 22);
      if (id === TL.DASH_H) P(2, 7, 8, 2, '#f2f2f2');
      if (id === TL.DASH_V) P(7, 2, 2, 8, '#f2f2f2');
      if (id === TL.LANE_H) P(0, 7, 16, 2, '#e8c440');
      if (id === TL.LANE_V) P(7, 0, 2, 16, '#e8c440');
      if (id === TL.TRAM) { P(0, 4, 16, 1, '#a8acb4'); P(0, 11, 16, 1, '#a8acb4'); P(0, 5, 16, 1, '#3e4047'); P(0, 12, 16, 1, '#3e4047'); }
      break;
    case TL.ZEBRA_H: noise('#5b5d66', ['#53555e', '#64666f'], 12); for (let i = 0; i < 4; i++) P(i * 4 + 1, 1, 2, 14, '#ececec'); break;
    case TL.ZEBRA_V: noise('#5b5d66', ['#53555e', '#64666f'], 12); for (let i = 0; i < 4; i++) P(1, i * 4 + 1, 14, 2, '#ececec'); break;
    case TL.SIDEWALK:
      P(0, 0, 16, 16, '#c9c4b8'); P(0, 0, 16, 1, '#e0dbd0'); P(0, 0, 1, 16, '#e0dbd0'); P(0, 8, 16, 1, '#b3ad9f'); P(8, 0, 1, 16, '#b3ad9f');
      for (let i = 0; i < 5; i++) P((r() * 16) | 0, (r() * 16) | 0, 1, 1, '#bab4a6');
      break;
    case TL.PLAZA:
      P(0, 0, 16, 16, '#d8cfbd'); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { P(i * 8 + 1, j * 8 + 1, 6, 6, (i + j) % 2 ? '#cfc4ae' : '#e2dac8'); }
      break;
    case TL.MARBLE: case TL.IMARBLE:
      P(0, 0, 16, 16, '#f2efe8'); P(0, 0, 16, 1, '#ffffff'); P(15, 0, 1, 16, '#d9d4ca'); P(0, 15, 16, 1, '#d9d4ca');
      for (let i = 0; i < 3; i++) { const vx = (r() * 14) | 0, vy = (r() * 14) | 0; P(vx, vy, 3, 1, '#e2ddd3'); P(vx + 2, vy + 1, 2, 1, '#e2ddd3'); }
      break;
    case TL.PATH: case TL.DIRT:
      noise(id === TL.PATH ? '#e3cf9a' : '#c9a46a', ['#d6c08a', '#efdcaa', '#c9b37c'], 18); break;
    case TL.TRACK: noise('#b98a5a', ['#a8794c', '#c99a68'], 20); P(0, 7, 16, 1, '#d8b88a'); break;
    case TL.FAIRWAY: P(0, 0, 16, 16, '#7fd65e'); for (let i = 0; i < 16; i += 4) P(i, 0, 2, 16, '#88de66'); break;
    case TL.GREEN: P(0, 0, 16, 16, '#9be872'); for (let i = 0; i < 6; i++) P((r() * 16) | 0, (r() * 16) | 0, 1, 1, '#aef08a'); break;
    case TL.BUNKER: case TL.SAND: noise('#f0dca0', ['#e6cf8c', '#f7e8bb'], 18); break;
    case TL.PITCH: P(0, 0, 16, 16, (Math.floor(x / 16) % 2) ? '#6ccc4e' : '#79d65a'); break;
    case TL.PITCH_LINE: P(0, 0, 16, 16, (Math.floor(x / 16) % 2) ? '#6ccc4e' : '#79d65a'); P(0, 7, 16, 2, '#f4f4f4'); break;
    case TL.WATER: case TL.SHALLOW:
      P(0, 0, 16, 16, id === TL.SHALLOW ? '#6cc4e8' : '#4a9fd8');
      for (let i = 0; i < 3; i++) { const wx = (r() * 12) | 0, wy = (r() * 14) | 0; P(wx, wy, 4, 1, '#8fd0f4'); P(wx + 1, wy + 1, 2, 1, '#3a88c0'); }
      break;
    case TL.POOL: P(0, 0, 16, 16, '#5cc8f0'); P(0, 0, 16, 1, '#8fe0ff'); P(0, 0, 1, 16, '#8fe0ff'); P(4, 6, 6, 1, '#b8f0ff'); P(9, 11, 4, 1, '#b8f0ff'); break;
    case TL.BRIDGE: P(0, 0, 16, 16, '#7a7c86'); P(0, 0, 16, 2, '#c9c9c9'); P(0, 14, 16, 2, '#c9c9c9'); P(7, 7, 4, 2, '#f2f2f2'); break;
    case TL.DECK: P(0, 0, 16, 16, '#b07a45'); for (let i = 0; i < 16; i += 4) P(0, i, 16, 1, '#8c5a32'); P((r() * 12) | 0, 2, 1, 1, '#6b4226'); break;
    case TL.PARK: noise('#5b5d66', ['#53555e'], 8); P(0, 0, 1, 16, '#f2f2f2'); break;
    // ---- interior floors ----
    case TL.WOOD: P(0, 0, 16, 16, pal.wood || '#c48a52'); for (let i = 0; i < 4; i++) { P(0, i * 4 + 3, 16, 1, shade(pal.wood || '#c48a52', -0.2)); P(((i * 7 + seed) % 12) + 2, i * 4, 1, 3, shade(pal.wood || '#c48a52', -0.15)); } break;
    case TL.DARKWOOD: P(0, 0, 16, 16, '#5a3a24'); for (let i = 0; i < 4; i++) P(0, i * 4 + 3, 16, 1, '#3e2716'); break;
    case TL.CHECKER: for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) P(i * 8, j * 8, 8, 8, (i + j) % 2 ? (pal.c1 || '#2a2a30') : (pal.c2 || '#f2f2f2')); break;
    case TL.CARPET: P(0, 0, 16, 16, pal.carpet || '#9c2f3c'); P(0, 0, 16, 1, shade(pal.carpet || '#9c2f3c', 0.15)); for (let i = 0; i < 4; i++) P(i * 4 + 1, 8, 2, 1, shade(pal.carpet || '#9c2f3c', 0.25)); break;
    case TL.MALLFLOOR: P(0, 0, 16, 16, '#ece8e2'); P(0, 0, 16, 1, '#ffffff'); P(0, 0, 1, 16, '#ffffff'); P(15, 0, 1, 16, '#d4cec4'); P(0, 15, 16, 1, '#d4cec4'); P(3, 3, 3, 1, '#ffffff'); break;
    case TL.PINK: for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) P(i * 8, j * 8, 8, 8, (i + j) % 2 ? '#f6dfe4' : '#ffffff'); break;
    case TL.TILEBLUE: P(0, 0, 16, 16, '#d8eef6'); P(0, 0, 16, 1, '#b8d8e6'); P(0, 0, 1, 16, '#b8d8e6'); break;
    case TL.RUG: P(0, 0, 16, 16, pal.rug || '#2f5a8a'); P(2, 2, 12, 12, shade(pal.rug || '#2f5a8a', 0.15)); P(6, 6, 4, 4, pal.rug2 || '#e3b341'); break;
    case TL.STAGE: P(0, 0, 16, 16, '#3a2a4a'); P(0, 0, 16, 1, '#5a4a6a'); break;
    case TL.WALL: {
      const w = pal.wall || '#e8dcc0';
      P(0, 0, 16, 16, w); P(0, 13, 16, 3, shade(w, -0.25)); P(0, 12, 16, 1, shade(w, -0.1));
      if (pal.stripe) P(0, 4, 16, 2, pal.stripe);
      break;
    }
    case TL.WALLTOP: P(0, 0, 16, 16, pal.walltop || '#4a3a30'); P(0, 15, 16, 1, shade(pal.walltop || '#4a3a30', 0.25)); break;
    case TL.VOID: P(0, 0, 16, 16, '#101014'); break;
    default: P(0, 0, 16, 16, '#f0f');
  }
}

/* ============================ BUILDINGS ============================ */
// Footprint w x h tiles. Sprite extends upward by `rise` px above the footprint.
export function buildingSprite(b) {
  const W = b.w * T, H = b.h * T;
  if (SPECIAL[b.style]) return SPECIAL[b.style](b);
  // the whole building (roof + facade) stays inside its footprint, like HGSS towns
  let floors = b.floors || 2;
  while (floors > 1 && floors * 14 + 10 > H - 12) floors--;
  const facade = floors * 14 + 10;
  const rise = 0;
  const c = canvas(W, H + rise);
  const g = c.getContext('2d');
  const r = mulberry(b.seed || 7);
  const wall = b.wall || '#e8d4a8', wallD = shade(wall, -0.18), wallL = shade(wall, 0.12);
  const roofTop = b.roof || shade(wall, -0.05);
  const fy = H + rise - facade; // facade top y
  // roof surface
  px(g, 0, 0, W, fy, roofTop);
  px(g, 0, 0, W, 2, shade(roofTop, 0.2)); px(g, 0, fy - 3, W, 3, shade(roofTop, -0.2));
  px(g, 0, 0, 2, fy, shade(roofTop, -0.1)); px(g, W - 2, 0, 2, fy, shade(roofTop, -0.1));
  if (b.style !== 'mall' && b.style !== 'tower') {
    // rooftop water tanks (very Kolkata) & clutter
    const n = Math.max(1, (b.w / 4) | 0);
    for (let i = 0; i < n; i++) {
      const tx = 4 + ((r() * (W - 18)) | 0), ty = 3 + ((r() * Math.max(1, fy - 18)) | 0);
      if (r() < 0.7) { rrect(g, tx, ty + 2, 10, 10, 2, '#26252a'); px(g, tx + 2, ty + 3, 6, 2, '#3c3b42'); px(g, tx + 1, ty + 1, 8, 2, '#3c3b42'); }
      else { px(g, tx, ty + 4, 12, 6, '#8a8a90'); px(g, tx + 1, ty + 5, 10, 1, '#b0b0b8'); }
    }
    if (r() < 0.5 && fy > 20) { for (let k = 0; k < 3; k++) px(g, 6 + k * 5, fy - 10, 3, 5, ['#e05a5a', '#5a8ae0', '#f2f2f2'][k]); px(g, 4, fy - 11, 18, 1, '#555'); }
  } else {
    for (let i = 0; i < W; i += 16) px(g, i + 6, 5, 4, 4, '#9aa3ad');
    px(g, 4, 4, W - 8, 1, '#c8d0d8');
  }
  // facade
  px(g, 0, fy, W, facade, wall);
  px(g, 0, fy, W, 3, wallL); px(g, 0, fy + 3, W, 1, wallD);
  const style = b.style || 'shop';
  if (style === 'mall' || style === 'tower') {
    // glass curtain wall
    for (let y = fy + 6; y < H + rise - 22; y += 10) for (let x = 3; x < W - 3; x += 8) {
      const grad = (x + y) % 24 < 8 ? '#9fd4f0' : '#6fb2dc';
      px(g, x, y, 7, 8, grad); px(g, x, y, 7, 1, '#d8f2ff'); px(g, x + 6, y, 1, 8, '#4a86b0');
    }
    px(g, 0, H + rise - 22, W, 22, style === 'mall' ? (b.wall || '#e8e8ee') : '#c8ccd4');
  } else {
    for (let f = 0; f < floors; f++) {
      const wy = fy + 7 + f * 14;
      if (f > 0) px(g, 0, wy - 3, W, 1, wallD);
      for (let x = 5; x < W - 8; x += 12) {
        if (f === floors - 1 && Math.abs(x + 4 - W / 2) < 10) continue; // door space
        px(g, x, wy, 7, 9, '#2c3a4a'); px(g, x + 1, wy + 1, 5, 3, '#6e9cc4'); px(g, x + 1, wy + 4, 5, 4, '#4f7aa0');
        if (b.shutters !== false) { px(g, x - 2, wy, 2, 9, b.shutter || '#3f8a52'); px(g, x + 7, wy, 2, 9, b.shutter || '#3f8a52'); px(g, x - 2, wy + 4, 2, 1, shade(b.shutter || '#3f8a52', -0.3)); px(g, x + 7, wy + 4, 2, 1, shade(b.shutter || '#3f8a52', -0.3)); }
        px(g, x - 1, wy + 9, 9, 1, wallD);
        if (style === 'house' && f < floors - 1 && r() < 0.6) { px(g, x - 2, wy + 9, 11, 3, '#6a5040'); for (let k = 0; k < 11; k += 2) px(g, x - 2 + k, wy + 6, 1, 3, '#4a3a2a'); }
      }
    }
    if (style === 'colonial') for (let x = 4; x < W - 4; x += 10) { px(g, x, fy + 6, 3, facade - 8, '#fbf6ea'); px(g, x + 2, fy + 6, 1, facade - 8, '#d9d0bc'); }
    if (style === 'brick') for (let y = fy + 4; y < H + rise; y += 3) for (let x = (y % 6 ? 0 : 3); x < W; x += 6) px(g, x, y, 1, 1, shade(wall, -0.25));
  }
  // door
  const dw = b.style === 'mall' ? 28 : 12, dx = Math.round(W / 2 - dw / 2) + (b.doorOff || 0) * T, dy = H + rise - 14;
  if (b.style === 'mall') { px(g, dx - 2, dy - 4, dw + 4, 18, '#2a3440'); for (let k = 0; k < 4; k++) px(g, dx + k * 7, dy - 2, 6, 16, '#9fd4f0'); px(g, dx, dy + 6, dw, 1, '#c8e8f8'); }
  else {
    px(g, dx, dy, dw, 14, '#3a2418'); px(g, dx + 1, dy + 1, dw - 2, 13, b.doorCol || '#6a3e22'); px(g, dx + dw / 2 - 0.5, dy + 1, 1, 13, '#3a2418'); px(g, dx + 2, dy + 7, 1, 1, '#e3b341');
    // awning
    const aw = b.awning || '#c0283a';
    for (let k = 0; k < dw + 8; k += 4) { px(g, dx - 4 + k, dy - 5, 4, 4, (k / 4) % 2 ? aw : '#f4f4f4'); }
    px(g, dx - 4, dy - 1, dw + 8, 1, shade(aw, -0.35));
  }
  // signboard
  if (b.sign) {
    const s = b.sign.toUpperCase();
    const tw = textWidth(s) + 6;
    const sx = Math.max(1, Math.round(W / 2 - tw / 2)), sy = style === 'mall' ? fy + 2 : dy - 13;
    const scale = style === 'mall' && tw * 2 < W - 4 ? 2 : 1;
    const bw = scale === 2 ? tw * 2 - 4 : Math.min(tw, W - 2), bh = scale === 2 ? 14 : 8;
    const bx = Math.max(1, Math.round(W / 2 - bw / 2));
    px(g, bx, sy, bw, bh, b.signBg || '#1d1b20'); px(g, bx, sy, bw, 1, shade(b.signBg || '#1d1b20', 0.3));
    drawText(g, s, bx + 3 * scale - (scale === 2 ? 2 : 0), sy + 2, b.signFg || '#ffd94a', scale);
  }
  return { img: c, rise };
}

// ---------- Landmarks ----------
const SPECIAL = {
  victoria(b) { // Victoria Memorial: white Makrana marble, central dome with angel, corner cupolas
    const W = b.w * T, H = b.h * T, rise = 70;
    const c = canvas(W, H + rise), g = c.getContext('2d');
    const M = '#f6f3ec', M2 = '#e2ddd2', M3 = '#cbc4b6', base = H + rise;
    px(g, 6, base - 70, W - 12, 64, M); // main block
    px(g, 6, base - 70, W - 12, 3, '#ffffff'); px(g, 6, base - 10, W - 12, 4, M3);
    for (let x = 12; x < W - 12; x += 10) { px(g, x, base - 60, 5, 44, M2); px(g, x + 1, base - 58, 3, 14, '#9fb4c4'); px(g, x + 1, base - 38, 3, 14, '#9fb4c4'); ell(g, x + 2.5, base - 60, 2.5, 3, M2); }
    // wings with arches
    for (const sx of [6, W - 46]) { px(g, sx, base - 82, 40, 14, M); for (let k = 0; k < 4; k++) ell(g, sx + 6 + k * 10, base - 76, 3, 4, '#a9bccb'); }
    // corner cupolas
    for (const sx of [14, W - 26]) { px(g, sx, base - 100, 12, 22, M); ell(g, sx + 6, base - 102, 9, 9, M); px(g, sx + 5, base - 116, 2, 6, M3); for (let k = 0; k < 3; k++) px(g, sx + 2 + k * 4, base - 96, 2, 12, '#a9bccb'); }
    // central drum + dome
    const cx = W / 2;
    px(g, cx - 34, base - 98, 68, 30, M); for (let k = -28; k <= 28; k += 8) { px(g, cx + k - 1, base - 94, 3, 22, '#a9bccb'); }
    ell(g, cx, base - 104, 38, 30, M); ell(g, cx - 10, base - 112, 14, 16, '#ffffff');
    px(g, cx - 38, base - 104, 76, 6, M); px(g, cx - 38, base - 98, 76, 2, M3);
    ell(g, cx, base - 134, 7, 6, M2); px(g, cx - 1, base - 146, 2, 10, '#5a4a2a');
    // the Angel of Victory (bronze)
    poly(g, [cx - 6, base - 150, cx, base - 160, cx + 6, base - 150, cx, base - 146], '#4a3a22'); px(g, cx - 1, base - 164, 3, 6, '#4a3a22');
    // grand entrance + steps
    px(g, cx - 18, base - 64, 36, 48, '#fbf9f4'); ell(g, cx, base - 52, 12, 14, '#7a94a8'); px(g, cx - 12, base - 52, 24, 34, '#7a94a8');
    px(g, cx - 10, base - 34, 20, 18, '#3a3a44');
    for (let k = 0; k < 4; k++) px(g, cx - 26 - k * 3, base - 16 + k * 4, 52 + k * 6, 4, k % 2 ? M2 : M);
    crisp(c); outline(c, '#4a4a58');
    return { img: c, rise };
  },
  cathedral(b) { // St Paul's Cathedral: white Indo-Gothic with central tower
    const W = b.w * T, H = b.h * T, rise = 64;
    const c = canvas(W, H + rise), g = c.getContext('2d'); const base = H + rise;
    px(g, 4, base - 56, W - 8, 52, '#f2eee4'); poly(g, [2, base - 56, W / 2, base - 74, W - 2, base - 56], '#8a8f9a');
    for (let x = 10; x < W - 10; x += 12) { poly(g, [x, base - 20, x + 3, base - 44, x + 6, base - 20], '#6a8aa8'); px(g, x, base - 20, 6, 4, '#f2eee4'); }
    const cx = W / 2; px(g, cx - 10, base - 120, 20, 70, '#f6f3ec'); for (let k = 0; k < 4; k++) poly(g, [cx - 10 + k * 6, base - 120, cx - 7 + k * 6, base - 130, cx - 4 + k * 6, base - 120], '#f6f3ec');
    poly(g, [cx - 4, base - 96, cx, base - 110, cx + 4, base - 96], '#6a8aa8'); ell(g, cx, base - 80, 5, 5, '#c9a24a');
    px(g, cx - 6, base - 18, 12, 14, '#4a2e1e'); poly(g, [cx - 6, base - 18, cx, base - 26, cx + 6, base - 18], '#4a2e1e');
    crisp(c); outline(c, '#4a4a58'); return { img: c, rise };
  },
  planetarium(b) { // Birla Planetarium — Sanchi-stupa style dome
    const W = b.w * T, H = b.h * T, rise = 36; const c = canvas(W, H + rise), g = c.getContext('2d'); const base = H + rise;
    px(g, 4, base - 24, W - 8, 20, '#e8e2d4'); for (let x = 8; x < W - 8; x += 6) px(g, x, base - 22, 2, 16, '#cfc6b2');
    ell(g, W / 2, base - 26, W / 2 - 6, 32, '#f2ede2'); ell(g, W / 2 - 10, base - 40, 12, 14, '#ffffff');
    px(g, 6, base - 27, W - 12, 3, '#c9a24a'); px(g, W / 2 - 4, base - 62, 8, 6, '#c9a24a'); px(g, W / 2 - 1, base - 70, 2, 8, '#8a6a2a');
    px(g, W / 2 - 7, base - 16, 14, 12, '#5a3a24');
    crisp(c); outline(c, '#4a4a58'); return { img: c, rise };
  },
  minar(b) { // Shaheed Minar
    const W = b.w * T, H = b.h * T, rise = 120; const c = canvas(W, H + rise), g = c.getContext('2d'); const base = H + rise; const cx = W / 2;
    px(g, cx - 10, base - 14, 20, 12, '#e8d8b8'); px(g, cx - 6, base - 110, 12, 98, '#f0e2c4'); px(g, cx - 6, base - 110, 3, 98, '#fff4dc');
    for (let y = base - 100; y < base - 20; y += 22) px(g, cx - 8, y, 16, 3, '#d8c4a0');
    px(g, cx - 9, base - 118, 18, 8, '#e8d8b8'); ell(g, cx, base - 122, 6, 6, '#f0e2c4'); px(g, cx - 1, base - 132, 2, 8, '#8a6a3a');
    crisp(c); outline(c, '#5a4a3a'); return { img: c, rise };
  },
  stadium(b) { // Eden Gardens: oval stands with floodlights
    const W = b.w * T, H = b.h * T, rise = 30; const c = canvas(W, H + rise), g = c.getContext('2d');
    ell(g, W / 2, (H + rise) / 2 + 6, W / 2 - 2, (H + rise) / 2 - 8, '#d8d8de');
    for (let k = 0; k < 4; k++) ell(g, W / 2, (H + rise) / 2 + 6, W / 2 - 6 - k * 6, (H + rise) / 2 - 12 - k * 5, k % 2 ? '#3a6aa8' : '#c0c4cc');
    ell(g, W / 2, (H + rise) / 2 + 8, W / 2 - 34, (H + rise) / 2 - 32, '#6ccc4e'); px(g, W / 2 - 3, (H + rise) / 2 - 2, 6, 20, '#d8c08a');
    for (const [x, y] of [[8, 8], [W - 12, 8], [8, H + rise - 26], [W - 12, H + rise - 26]]) { px(g, x + 1, y, 2, 22, '#8a8a90'); px(g, x - 2, y - 4, 8, 5, '#f2f2f2'); }
    drawText(g, 'EDEN GARDENS', W / 2 - 23, H + rise - 12, '#1d1b20');
    crisp(c); outline(c, '#3a3a44'); return { img: c, rise };
  },
  fort(b) { // Fort William — star-shaped ramparts (restricted)
    const W = b.w * T, H = b.h * T, rise = 10; const c = canvas(W, H + rise), g = c.getContext('2d');
    poly(g, [W / 2, 2, W - 4, H / 3, W - 14, H + rise - 4, 14, H + rise - 4, 4, H / 3], '#8a7a5a');
    poly(g, [W / 2, 14, W - 18, H / 3 + 4, W - 24, H + rise - 14, 24, H + rise - 14, 18, H / 3 + 4], '#6ccc4e');
    for (let k = 0; k < 6; k++) { const bx = 34 + (k % 3) * ((W - 80) / 2), by = 40 + Math.floor(k / 3) * 60; px(g, bx, by, 28, 18, '#c9b48a'); px(g, bx, by, 28, 4, '#a8402a'); }
    drawText(g, 'FORT WILLIAM', W / 2 - 23, H + rise - 12, '#f2f2f2');
    crisp(c); outline(c, '#3a3424'); return { img: c, rise };
  },
  tent(b) { // Maidan club tents
    const W = b.w * T, H = b.h * T, rise = 18; const c = canvas(W, H + rise), g = c.getContext('2d');
    const [a1, a2] = b.colors;
    px(g, 2, 16, W - 4, H + rise - 18, '#f2ead8');
    for (let x = 0; x < W; x += 8) poly(g, [x, 18, x + 4, 0, x + 8, 18], (x / 8) % 2 ? a1 : a2);
    px(g, 0, 16, W, 4, a1);
    for (let x = 6; x < W - 6; x += 12) px(g, x, 26, 6, 8, '#6e9cc4');
    px(g, W / 2 - 6, H + rise - 14, 12, 12, a2);
    const s = b.sign.toUpperCase(); px(g, W / 2 - textWidth(s) / 2 - 2, 20, textWidth(s) + 4, 7, '#1d1b20'); drawText(g, s, W / 2 - textWidth(s) / 2, 21, '#ffffff');
    crisp(c); outline(c, '#3a3a44'); return { img: c, rise };
  },
  hospital(b) {
    const o = buildingSprite({ ...b, style: 'shop', shutters: false, awning: '#2a6ac0' });
    const g = o.img.getContext('2d'); const cx = o.img.width / 2;
    px(g, cx - 9, 6, 18, 18, '#ffffff'); px(g, cx - 2, 8, 4, 14, '#d42a2a'); px(g, cx - 7, 13, 14, 4, '#d42a2a');
    return o;
  },
  newmarket(b) { // red-brick Hogg market with clock tower
    const o = buildingSprite({ ...b, style: 'brick' });
    const g = o.img.getContext('2d'); const cx = o.img.width / 2;
    px(g, cx - 8, 0, 16, 34, '#a8402a'); px(g, cx - 6, 2, 12, 12, '#f2ead8'); ell(g, cx, 8, 4, 4, '#ffffff'); px(g, cx, 5, 1, 4, '#1d1b20'); px(g, cx, 8, 3, 1, '#1d1b20');
    poly(g, [cx - 9, 0, cx, -0, cx + 9, 0], '#5a5a62');
    return o;
  },
  bridge(b) { // Vidyasagar Setu cable-stayed pylons
    const W = b.w * T, H = b.h * T, rise = 90; const c = canvas(W, H + rise), g = c.getContext('2d'); const base = H + rise;
    px(g, 0, base - H + 4, W, H - 8, '#7a7c86'); px(g, 0, base - H + 4, W, 3, '#d8d8d8'); px(g, 0, base - 7, W, 3, '#d8d8d8');
    ctx2(g, W, base, H);
    crisp(c); return { img: c, rise };
  },
  nandan(b) {
    const o = buildingSprite({ ...b, style: 'colonial', wall: '#e9e0cf', shutters: false });
    return o;
  },
  stall(b) { // street food stall with umbrella
    const W = b.w * T, H = b.h * T, rise = 18; const c = canvas(W, H + rise), g = c.getContext('2d');
    px(g, 3, 18, W - 6, H - 4, '#8a5a32'); px(g, 3, 18, W - 6, 3, '#b07a45'); px(g, 6, 14, W - 12, 5, '#c9c4b8');
    for (let k = 0; k < 5; k++) ell(g, 8 + k * 4, 15, 1.8, 1.8, '#e3c07a');
    ell(g, W / 2, 6, W / 2, 6, b.color || '#d42a2a'); for (let k = 0; k < W; k += 6) px(g, k, 6, 3, 5, '#f2f2f2'); px(g, W / 2, 6, 1, 14, '#5a5a5a');
    crisp(c); outline(c); return { img: c, rise };
  },
  gate(b) {
    const W = b.w * T, H = b.h * T, rise = 24; const c = canvas(W, H + rise), g = c.getContext('2d');
    px(g, 0, 4, 8, H + rise - 4, b.col || '#c9b48a'); px(g, W - 8, 4, 8, H + rise - 4, b.col || '#c9b48a');
    px(g, 0, 2, W, 12, b.col || '#c9b48a'); const s = (b.sign || '').toUpperCase(); drawText(g, s, W / 2 - textWidth(s) / 2, 5, '#1d1b20');
    crisp(c); outline(c); return { img: c, rise };
  },
};
function ctx2(g, W, base, H) {
  for (const pxl of [W * 0.3, W * 0.7]) {
    px(g, pxl - 3, base - H - 80, 6, 84, '#e8e8ec'); px(g, pxl - 3, base - H - 80, 2, 84, '#ffffff');
    g.strokeStyle = '#f2f2f2'; g.lineWidth = 1;
    for (let k = 1; k <= 6; k++) { g.beginPath(); g.moveTo(pxl, base - H - 78 + k * 4); g.lineTo(pxl - k * 9, base - H + 4); g.stroke(); g.beginPath(); g.moveTo(pxl, base - H - 78 + k * 4); g.lineTo(pxl + k * 9, base - H + 4); g.stroke(); }
  }
}

/* ============================ PROPS ============================ */
const propCache = {};
export function prop(kind, variant = 0) {
  const key = kind + variant;
  if (propCache[key]) return propCache[key];
  let c, ox = 0, oy = 0; // ox,oy: anchor offset (sprite drawn at x - ox, y - oy where x,y = base point)
  const r = mulberry(variant * 31 + kind.length);
  switch (kind) {
    case 'tree': {
      c = canvas(34, 42); const g = c.getContext('2d');
      px(g, 14, 26, 6, 14, '#7a4a2a'); px(g, 14, 26, 2, 14, '#9a6a3a');
      const greens = variant % 3 === 0 ? ['#3f8f34', '#56ad44', '#76c95a'] : variant % 3 === 1 ? ['#2f7a3a', '#449a4a', '#62b862'] : ['#4a8a2a', '#64a83a', '#86c856'];
      ell(g, 17, 18, 15, 13, greens[0]); ell(g, 10, 16, 8, 8, greens[1]); ell(g, 23, 14, 9, 9, greens[1]); ell(g, 16, 10, 9, 8, greens[1]);
      ell(g, 13, 9, 4, 3, greens[2]); ell(g, 22, 11, 3, 3, greens[2]); ell(g, 8, 15, 3, 3, greens[2]);
      if (variant % 5 === 4) for (let k = 0; k < 6; k++) px(g, 6 + r() * 22, 6 + r() * 20, 2, 2, '#f05a3a'); // krishnachura blossoms
      crisp(c); outline(c, '#1d3a1a'); ox = 17; oy = 40; break;
    }
    case 'palm': {
      c = canvas(30, 44); const g = c.getContext('2d');
      for (let k = 0; k < 8; k++) px(g, 13 + Math.sin(k / 2), 14 + k * 3.6, 4, 4, k % 2 ? '#8a6a3a' : '#a8804a');
      for (const [dx, dy] of [[-12, 4], [12, 4], [-9, -4], [9, -4], [0, -8], [-13, 10], [13, 10]]) poly(g, [15, 14, 15 + dx, 14 + dy, 15 + dx * 0.6, 14 + dy + 4], '#3f9a3a');
      ell(g, 15, 14, 3, 3, '#6a4a2a'); crisp(c); outline(c, '#1d3a1a'); ox = 15; oy = 43; break;
    }
    case 'banyan': {
      c = canvas(56, 54); const g = c.getContext('2d');
      for (let k = 0; k < 5; k++) px(g, 12 + k * 7, 28, 2, 24, '#8a6a4a');
      px(g, 22, 30, 12, 22, '#7a5a3a');
      ell(g, 28, 20, 27, 17, '#2f7a34'); ell(g, 16, 16, 12, 10, '#3f8f3e'); ell(g, 40, 15, 12, 10, '#3f8f3e'); ell(g, 28, 10, 13, 9, '#4aa04a');
      for (let k = 0; k < 8; k++) ell(g, 8 + r() * 40, 6 + r() * 22, 2.5, 2, '#62b862');
      crisp(c); outline(c, '#1d3a1a'); ox = 28; oy = 52; break;
    }
    case 'bush': { c = canvas(18, 14); const g = c.getContext('2d'); ell(g, 9, 8, 8, 6, '#3f8f34'); ell(g, 6, 6, 4, 3, '#62b850'); ell(g, 12, 7, 3, 3, '#56ad44'); crisp(c); outline(c, '#1d3a1a'); ox = 9; oy = 13; break; }
    case 'hedge': { c = canvas(16, 14); const g = c.getContext('2d'); px(g, 0, 3, 16, 11, '#3f8f34'); px(g, 0, 3, 16, 3, '#62b850'); for (let k = 0; k < 4; k++) px(g, k * 4 + 1, 7, 2, 1, '#2f6a28'); ox = 0; oy = 13; break; }
    case 'lamp': { c = canvas(10, 34); const g = c.getContext('2d'); px(g, 4, 6, 2, 28, '#2a3a4a'); px(g, 2, 32, 6, 2, '#2a3a4a'); px(g, 1, 2, 8, 5, '#2a3a4a'); px(g, 2, 3, 6, 3, '#ffe9a0'); crisp(c); ox = 5; oy = 33; break; }
    case 'bench': { c = canvas(24, 14); const g = c.getContext('2d'); px(g, 1, 2, 22, 3, '#8a5a32'); px(g, 1, 6, 22, 3, '#a8703f'); px(g, 3, 9, 2, 4, '#3a3a3a'); px(g, 19, 9, 2, 4, '#3a3a3a'); crisp(c); outline(c); ox = 12; oy = 13; break; }
    case 'fence': { c = canvas(16, 12); const g = c.getContext('2d'); px(g, 0, 3, 16, 2, '#f2f2f2'); px(g, 0, 7, 16, 2, '#f2f2f2'); px(g, 1, 1, 2, 11, '#e2e2e2'); px(g, 9, 1, 2, 11, '#e2e2e2'); ox = 0; oy = 11; break; }
    case 'rail': { c = canvas(16, 12); const g = c.getContext('2d'); px(g, 0, 2, 16, 2, '#2a2a30'); for (let k = 0; k < 16; k += 3) px(g, k, 2, 1, 10, '#2a2a30'); ox = 0; oy = 11; break; }
    case 'statue': { c = canvas(20, 40); const g = c.getContext('2d'); px(g, 3, 26, 14, 14, '#d8d0c0'); px(g, 3, 26, 14, 2, '#f2ead8'); px(g, 7, 10, 6, 16, '#5a5a4a'); ell(g, 10, 8, 3.5, 4, '#5a5a4a'); px(g, 4, 14, 3, 8, '#5a5a4a'); crisp(c); outline(c); ox = 10; oy = 39; break; }
    case 'fountain': { c = canvas(40, 30); const g = c.getContext('2d'); ell(g, 20, 20, 19, 9, '#d8d0c0'); ell(g, 20, 19, 16, 7, '#5cc8f0'); px(g, 18, 6, 4, 14, '#d8d0c0'); ell(g, 20, 6, 6, 3, '#d8d0c0'); for (let k = 0; k < 5; k++) px(g, 12 + k * 4, 2 + (k % 2) * 3, 1, 6, '#b8f0ff'); crisp(c); outline(c, '#4a4a58'); ox = 20; oy = 29; break; }
    case 'goal': { c = canvas(16, 40); const g = c.getContext('2d'); px(g, 2, 0, 3, 40, '#f4f4f4'); px(g, 5, 0, 10, 2, '#f4f4f4'); px(g, 5, 38, 10, 2, '#f4f4f4'); for (let y = 3; y < 38; y += 4) px(g, 6, y, 9, 1, '#dcdcdc'); ox = 3; oy = 39; break; }
    case 'grave': { c = canvas(14, 20); const g = c.getContext('2d'); px(g, 2, 6, 10, 14, '#b8b4a8'); ell(g, 7, 6, 5, 5, '#b8b4a8'); px(g, 6, 3, 2, 8, '#8a867a'); px(g, 4, 5, 6, 2, '#8a867a'); if (variant % 3 === 0) { px(g, 1, 0, 12, 20, '#c8c4b8'); poly(g, [1, 0, 7, -6, 13, 0], '#c8c4b8'); } crisp(c); outline(c); ox = 7; oy = 19; break; }
    case 'flag': { c = canvas(16, 36); const g = c.getContext('2d'); px(g, 2, 0, 2, 36, '#8a8a90'); px(g, 4, 2, 11, 3, '#ff9933'); px(g, 4, 5, 11, 3, '#ffffff'); px(g, 4, 8, 11, 3, '#138808'); px(g, 9, 6, 1, 1, '#000080'); ox = 3; oy = 35; break; }
    case 'busstop': { c = canvas(30, 26); const g = c.getContext('2d'); px(g, 2, 4, 26, 4, '#2a6ac0'); px(g, 3, 8, 2, 18, '#6a6a70'); px(g, 25, 8, 2, 18, '#6a6a70'); px(g, 6, 18, 18, 3, '#8a5a32'); drawText(g, 'BUS', 9, 5, '#ffffff'); crisp(c); outline(c); ox = 15; oy = 25; break; }
    case 'cage': { c = canvas(16, 18); const g = c.getContext('2d'); px(g, 0, 2, 16, 2, '#5a5a62'); for (let k = 0; k < 16; k += 3) px(g, k, 2, 1, 16, '#5a5a62'); ox = 0; oy = 17; break; }
    case 'umbrella': { c = canvas(28, 30); const g = c.getContext('2d'); ell(g, 14, 8, 13, 6, variant % 2 ? '#e05a5a' : '#2aa3d4'); for (let k = 0; k < 26; k += 8) px(g, k + 2, 8, 4, 4, '#f4f4f4'); px(g, 13, 8, 2, 22, '#8a8a8a'); px(g, 6, 22, 16, 3, '#f4f4f4'); crisp(c); outline(c); ox = 14; oy = 29; break; }
    case 'slide': { c = canvas(48, 60); const g = c.getContext('2d'); px(g, 4, 0, 8, 60, '#d8d0c0'); for (let y = 4; y < 60; y += 6) px(g, 4, y, 8, 1, '#a8a090'); g.strokeStyle = '#f2a33c'; g.lineWidth = 6; g.beginPath(); g.moveTo(12, 6); g.bezierCurveTo(40, 10, 10, 40, 44, 56); g.stroke(); g.strokeStyle = '#2aa3d4'; g.lineWidth = 3; g.beginPath(); g.moveTo(12, 6); g.bezierCurveTo(40, 10, 10, 40, 44, 56); g.stroke(); crisp(c); outline(c); ox = 24; oy = 59; break; }
    case 'boat': { c = canvas(28, 12); const g = c.getContext('2d'); poly(g, [0, 4, 28, 4, 24, 11, 4, 11], '#c0283a'); px(g, 2, 4, 24, 2, '#f2f2f2'); px(g, 13, 0, 2, 5, '#6a4a2a'); crisp(c); outline(c); ox = 14; oy = 11; break; }
    case 'flowerbed': { c = canvas(16, 10); const g = c.getContext('2d'); px(g, 0, 3, 16, 7, '#8a5a32'); for (let k = 0; k < 6; k++) ell(g, 2 + k * 2.4, 3, 1.6, 1.6, ['#f05a7a', '#ffd94a', '#ff9a3c'][k % 3]); crisp(c); ox = 0; oy = 9; break; }
    case 'tramstop': { c = canvas(20, 30); const g = c.getContext('2d'); px(g, 9, 6, 2, 24, '#5a5a62'); px(g, 3, 2, 14, 8, '#2a8a5a'); drawText(g, 'TRAM', 3, 3, '#fff'); ox = 10; oy = 29; break; }
    case 'atm': { c = canvas(14, 24); const g = c.getContext('2d'); px(g, 1, 2, 12, 22, '#2a4a8a'); px(g, 3, 6, 8, 6, '#9fd4f0'); px(g, 3, 14, 8, 3, '#1d1b20'); drawText(g, 'ATM', 1, -0, '#ffffff'); crisp(c); outline(c); ox = 7; oy = 23; break; }
    case 'hydrant': { c = canvas(8, 12); const g = c.getContext('2d'); px(g, 2, 2, 4, 10, '#c0283a'); px(g, 0, 5, 8, 2, '#c0283a'); crisp(c); outline(c); ox = 4; oy = 11; break; }
    case 'teestall': { c = canvas(26, 26); const g = c.getContext('2d'); px(g, 2, 10, 22, 14, '#6a4a2a'); px(g, 0, 4, 26, 7, '#2a6a3a'); px(g, 4, 12, 4, 4, '#c97a4a'); px(g, 10, 12, 4, 4, '#c97a4a'); px(g, 18, 6, 4, 6, '#9a9aa2'); crisp(c); outline(c); ox = 13; oy = 25; break; }
    default: c = canvas(8, 8);
  }
  return (propCache[key] = { img: c, ox, oy });
}

/* ============================ VEHICLES ============================ */
// Drawn facing RIGHT (+x). Width = length.
export const CAR_TYPES = {
  taxi: { len: 30, wid: 15, col: '#f2c230', kind: 'amby' },
  sedan: { len: 30, wid: 15, col: '#e8e8ec', kind: 'sedan' },
  sedan2: { len: 30, wid: 15, col: '#3a5aa8', kind: 'sedan' },
  sedan3: { len: 30, wid: 15, col: '#8a1f2b', kind: 'sedan' },
  hatch: { len: 26, wid: 14, col: '#5ab84a', kind: 'hatch' },
  suv: { len: 32, wid: 16, col: '#2a2a30', kind: 'suv' },
  sports_red: { len: 32, wid: 15, col: '#d42a2a', kind: 'sports' },
  sports_lime: { len: 32, wid: 15, col: '#9be032', kind: 'sports' },
  sports_orange: { len: 32, wid: 15, col: '#f2862a', kind: 'sports' },
  sports_black: { len: 32, wid: 15, col: '#1d1b20', kind: 'sports' },
  sports_blue: { len: 32, wid: 15, col: '#2a6ad4', kind: 'sports' },
  bus: { len: 60, wid: 20, col: '#2a6ac0', kind: 'bus' },
  police: { len: 32, wid: 16, col: '#f2f2f2', kind: 'police' },
  tram: { len: 72, wid: 18, col: '#2a7a4a', kind: 'tram' },
  carriage: { len: 40, wid: 16, col: '#f2f2f2', kind: 'carriage' },
};
const carCache = {};
export function carSprite(type) {
  if (carCache[type]) return carCache[type];
  const t = CAR_TYPES[type];
  const L = t.len, Wd = t.wid;
  const c = canvas(L + 2, Wd + 2), g = c.getContext('2d');
  const C = t.col, CD = shade(C, -0.25), CL = shade(C, 0.25);
  g.translate(1, 1);
  if (t.kind === 'bus' || t.kind === 'tram') {
    rrect(g, 0, 0, L, Wd, 3, C); px(g, 0, Wd - 4, L, 4, t.kind === 'bus' ? '#f2c230' : '#f2e2b8');
    px(g, 3, 3, L - 6, Wd - 8, shade(C, 0.15)); for (let x = 6; x < L - 6; x += 7) px(g, x, 4, 5, Wd - 10, '#a8d4f0');
    px(g, L - 4, 3, 3, Wd - 6, '#a8d4f0');
    if (t.kind === 'tram') { px(g, L / 2 - 1, -1, 2, 3, '#3a3a3a'); }
  } else if (t.kind === 'carriage') {
    // horse + Victoria carriage
    rrect(g, 0, 2, 22, Wd - 4, 3, '#f2f2f2'); px(g, 2, 4, 18, Wd - 8, '#c0283a'); px(g, 4, 0, 4, Wd, '#3a3a3a'); px(g, 14, 0, 4, Wd, '#3a3a3a');
    px(g, 22, Wd / 2 - 1, 6, 2, '#6a4a2a'); ell(g, 33, Wd / 2, 7, 4, '#8a5a32'); ell(g, 39, Wd / 2, 3, 2.5, '#6a4a2a'); px(g, 30, Wd / 2 - 1, 6, 2, '#f2f2f2');
  } else {
    const nose = t.kind === 'sports' ? 0.8 : 0.5;
    rrect(g, 0, 1, L, Wd - 2, t.kind === 'amby' ? 6 : 4, C);
    px(g, 2, 2, L - 4, 2, CL); px(g, 2, Wd - 4, L - 4, 2, CD);
    // windshield / roof
    const wx = L * (t.kind === 'sports' ? 0.45 : 0.55);
    px(g, wx, 3, 4, Wd - 6, '#2a3a4a'); px(g, wx + 1, 4, 2, Wd - 8, '#7ab8e0');
    px(g, L * 0.2, 3, 3, Wd - 6, '#2a3a4a');
    px(g, L * 0.2 + 3, 3, wx - L * 0.2 - 3, Wd - 6, t.kind === 'police' ? '#f2f2f2' : shade(C, t.kind === 'sports' ? -0.4 : 0.1));
    px(g, L - 2, 2, 2, 3, '#fff6c0'); px(g, L - 2, Wd - 5, 2, 3, '#fff6c0'); // headlights
    px(g, 0, 2, 1, 3, '#d42a2a'); px(g, 0, Wd - 5, 1, 3, '#d42a2a');
    if (t.kind === 'amby') { px(g, L * 0.35, 1, 6, 1, '#1d1b20'); px(g, L * 0.38, Wd / 2 - 1, 4, 2, '#1d1b20'); }
    if (t.kind === 'sports') { px(g, 1, 3, 2, Wd - 6, '#1d1b20'); px(g, wx + 6, Wd / 2 - 0.5, L - wx - 10, 1, CD); }
    if (t.kind === 'police') { px(g, L * 0.36, 3, 2, (Wd - 6) / 2, '#d42a2a'); px(g, L * 0.36, 3 + (Wd - 6) / 2, 2, (Wd - 6) / 2, '#2a5ad4'); px(g, 4, Wd / 2 - 1, L - 8, 2, '#2a5ad4'); }
    if (t.kind === 'suv') { px(g, L * 0.25, 2, L * 0.4, 1, '#888'); px(g, L * 0.25, Wd - 3, L * 0.4, 1, '#888'); }
    void nose;
  }
  crisp(c); outline(c, '#141216');
  return (carCache[type] = c);
}

/* ============================ ANIMALS ============================ */
// Side-view sprites facing LEFT, 2 frames each.
export const ANIMALS = {
  dog: { w: 16, h: 12, speed: 40 }, dog2: { w: 16, h: 12, speed: 40 }, cat: { w: 12, h: 10, speed: 30 }, cat2: { w: 12, h: 10, speed: 30 }, cow: { w: 26, h: 18, speed: 10 }, horse: { w: 26, h: 22, speed: 30 },
  monkey: { w: 12, h: 12, speed: 45 }, goat: { w: 16, h: 13, speed: 20 }, crow: { w: 10, h: 8, speed: 30 },
  tiger: { w: 28, h: 16, speed: 25 }, elephant: { w: 36, h: 30, speed: 10 }, giraffe: { w: 26, h: 40, speed: 12 },
  zebra: { w: 26, h: 20, speed: 18 }, rhino: { w: 30, h: 20, speed: 10 }, deer: { w: 20, h: 18, speed: 25 },
  peacock: { w: 18, h: 18, speed: 15 }, hippo: { w: 30, h: 18, speed: 8 }, lion: { w: 28, h: 18, speed: 20 },
};
const animCache = {};
export function animalSprite(kind, frame) {
  const key = kind + frame;
  if (animCache[key]) return animCache[key];
  const A = ANIMALS[kind]; const c = canvas(A.w + 2, A.h + 2), g = c.getContext('2d'); g.translate(1, 1);
  const leg = (x, y, h, col, f) => px(g, x + (f ? 1 : 0), y, 2, h, col);
  const f = frame;
  const quad = (body, head, legs, w, h, extra) => { // generic quadruped
    const by = h * 0.35, bh = h * 0.38;
    leg(w * 0.25, by + bh - 1, h - by - bh + 1, legs, f); leg(w * 0.7, by + bh - 1, h - by - bh + 1, legs, !f);
    ell(g, w * 0.55, by + bh / 2, w * 0.4, bh / 2, body);
    leg(w * 0.3, by + bh - 1, h - by - bh + 1, shade(legs, -0.2), !f); leg(w * 0.78, by + bh - 1, h - by - bh + 1, shade(legs, -0.2), f);
    if (extra) extra();
    ell(g, w * 0.14, by, w * 0.13, h * 0.16, head); px(g, w * 0.07, by - 1, 1, 1, '#111');
  };
  switch (kind) {
    case 'dog': case 'dog2': quad(kind === 'dog' ? '#b07a45' : '#2a2620', kind === 'dog' ? '#c48a52' : '#3a342c', kind === 'dog' ? '#9a6a3a' : '#1d1a16', 16, 12, () => { px(g, 13, 3, 3, 2, kind === 'dog' ? '#b07a45' : '#2a2620'); px(g, 2, 1, 2, 2, '#7a4a2a'); }); break;
    case 'cat': case 'cat2': quad(kind === 'cat' ? '#e0903a' : '#8a8a90', kind === 'cat' ? '#e8a050' : '#9a9aa0', kind === 'cat' ? '#c87a2a' : '#6a6a70', 12, 10, () => { px(g, 10, 1, 1, 5, kind === 'cat' ? '#e0903a' : '#8a8a90'); px(g, 11, 0, 1, 2, kind === 'cat' ? '#e0903a' : '#8a8a90'); px(g, 1, 1, 1, 2, '#3a2a1a'); px(g, 3, 1, 1, 2, '#3a2a1a'); }); break;
    case 'cow': quad('#f2efe8', '#e8e4dc', '#d8d4cc', 26, 18, () => { ell(g, 12, 6, 4, 3, '#e8e4dc'); px(g, 2, 2, 1, 3, '#c9b48a'); px(g, 5, 2, 1, 3, '#c9b48a'); px(g, 24, 7, 2, 6, '#d8d4cc'); }); break;
    case 'horse': quad('#8a5a32', '#7a4a2a', '#6a3e22', 26, 22, () => { px(g, 3, 1, 4, 8, '#7a4a2a'); px(g, 6, 2, 3, 6, '#2a1a10'); px(g, 24, 8, 2, 8, '#2a1a10'); }); break;
    case 'goat': quad('#f2f2f2', '#e8e8e8', '#c9c9c9', 16, 13, () => { px(g, 1, 0, 1, 3, '#8a8a8a'); px(g, 1, 7, 1, 2, '#e8e8e8'); }); break;
    case 'tiger': quad('#f2862a', '#f2862a', '#e07a20', 28, 16, () => { for (let x = 8; x < 26; x += 4) px(g, x, 5, 1, 5, '#1d1b20'); px(g, 26, 5, 2, 7, '#f2862a'); ell(g, 4, 7, 2, 1.5, '#f2f2f2'); }); break;
    case 'lion': quad('#d9a441', '#c9902a', '#c9902a', 28, 18, () => { ell(g, 4, 6, 6, 6, '#8a5a2a'); px(g, 26, 6, 2, 6, '#c9902a'); }); break;
    case 'zebra': quad('#f4f4f4', '#f4f4f4', '#e8e8e8', 26, 20, () => { for (let x = 7; x < 24; x += 3) px(g, x, 7, 1, 7, '#1d1b20'); px(g, 3, 1, 3, 7, '#f4f4f4'); px(g, 5, 1, 1, 7, '#1d1b20'); }); break;
    case 'deer': quad('#b8803e', '#a87030', '#8a5a2a', 20, 18, () => { px(g, 2, 0, 1, 4, '#6a4a2a'); px(g, 4, 0, 1, 4, '#6a4a2a'); px(g, 1, 0, 5, 1, '#6a4a2a'); for (let k = 0; k < 4; k++) px(g, 8 + k * 3, 6, 1, 1, '#f2f2f2'); }); break;
    case 'rhino': quad('#8a8a90', '#7a7a80', '#6a6a70', 30, 20, () => { poly(g, [0, 8, 3, 3, 5, 8], '#d8d4cc'); }); break;
    case 'hippo': quad('#8a7a8a', '#9a8a9a', '#6a5a6a', 30, 18, () => { ell(g, 3, 8, 4, 3, '#9a8a9a'); }); break;
    case 'elephant': {
      quad('#8a8a92', '#9a9aa2', '#7a7a82', 36, 30, () => { ell(g, 8, 10, 6, 7, '#7a7a82'); px(g, 1, 12, 3, 14, '#8a8a92'); px(g, 3, 14, 3, 2, '#f2f2f2'); }); break;
    }
    case 'giraffe': {
      leg(6, 26, 14, '#c9902a', f); leg(18, 26, 14, '#c9902a', !f); ell(g, 13, 24, 10, 6, '#e8b04a'); px(g, 3, 4, 4, 22, '#e8b04a'); ell(g, 3, 4, 4, 3, '#e8b04a'); px(g, 2, 0, 1, 2, '#8a5a2a'); px(g, 5, 0, 1, 2, '#8a5a2a');
      for (let k = 0; k < 8; k++) px(g, 6 + (k * 5) % 14, 20 + (k * 3) % 8, 2, 2, '#8a5a2a'); for (let y = 8; y < 24; y += 5) px(g, 4, y, 2, 2, '#8a5a2a'); break;
    }
    case 'monkey': ell(g, 7, 7, 4, 3.5, '#8a6a4a'); ell(g, 3, 4, 3, 3, '#8a6a4a'); ell(g, 2.5, 4.5, 1.8, 1.8, '#e0b090'); px(g, 3 + f, 9, 1, 3, '#7a5a3a'); px(g, 9 - f, 9, 1, 3, '#7a5a3a'); px(g, 10, 2, 1, 6, '#7a5a3a'); px(g, 11, 1, 1, 2, '#7a5a3a'); break;
    case 'crow': ell(g, 5, 5, 4, 2.5, '#1d1b20'); ell(g, 2, 3, 2, 2, '#1d1b20'); px(g, 0, 3, 1, 1, '#5a5a5a'); px(g, 3 + f, 7, 1, 1, '#3a3a3a'); if (f) poly(g, [4, 4, 8, 0, 8, 4], '#2a2830'); break;
    case 'peacock': for (let k = 0; k < 7; k++) ell(g, 12 + Math.cos(k / 2 - 1.5) * 6, 8 + Math.sin(k / 2 - 1.5) * 6, 2.5, 2.5, k % 2 ? '#2a8a5a' : '#2a6ac0'); ell(g, 8, 11, 4, 3, '#2a5ab0'); px(g, 4, 3, 2, 8, '#2a5ab0'); px(g, 4, 1, 1, 2, '#2a5ab0'); px(g, 7, 14, 1, 4, '#8a6a3a'); break;
  }
  crisp(c); outline(c, '#1d1a24');
  return (animCache[key] = c);
}

/* ============================ ITEMS / MISC ============================ */
export function moneySprite() {
  if (propCache.money) return propCache.money;
  const c = canvas(12, 8), g = c.getContext('2d');
  px(g, 0, 1, 12, 6, '#5aa84a'); px(g, 1, 2, 10, 4, '#7ac86a'); ell(g, 6, 4, 2, 1.5, '#3a7a2a');
  outline(c, '#1d3a1a');
  return (propCache.money = c);
}
export function ballSprite() {
  if (propCache.ball) return propCache.ball;
  const c = canvas(10, 10), g = c.getContext('2d');
  ell(g, 5, 5, 4, 4, '#f4f4f4'); px(g, 4, 3, 2, 2, '#1d1b20'); px(g, 2, 6, 1, 1, '#1d1b20'); px(g, 7, 6, 1, 1, '#1d1b20');
  crisp(c); outline(c);
  return (propCache.ball = c);
}
export { mix, rgba };
