// Character art: small 4-direction walking sprites + large detailed portraits.
import { canvas, crisp, outline, shade, mix, ell, poly, px, rrect, mulberry, pick, rgba } from './util.js';
import { ITEM, SKIN_TONES, HAIR_COLORS, ITEMS, HAIR_STYLES, LIP_COLORS } from './data.js';

const LONG_HAIR = new Set(['long', 'wavy', 'braid', 'ponytail']);
const it = (id) => ITEM[id] || { style: 'none', c: [] };

/* ------------------------------------------------------------------ */
/* Small world sprite: 16x24 body inside a 20x28 frame (outline room). */
/* ------------------------------------------------------------------ */
export const SW = 20, SH = 28;
const cache = new Map();

export function spriteSheet(app) {
  const key = JSON.stringify(app);
  if (cache.has(key)) return cache.get(key);
  // 4 dirs (down, up, left, right) x 4 frames (stand, stepA, stand, stepB) + sit + swim rows
  const sheet = canvas(SW * 4, SH * 6);
  const dirs = ['down', 'up', 'left', 'right'];
  dirs.forEach((d, row) => {
    for (let f = 0; f < 4; f++) {
      const c = canvas(SW, SH);
      drawSmall(c.getContext('2d'), app, d, f, 'walk');
      outline(c);
      sheet.getContext('2d').drawImage(c, f * SW, row * SH);
    }
  });
  dirs.forEach((d, i) => { // row 4: sitting
    const c = canvas(SW, SH); drawSmall(c.getContext('2d'), app, d, 0, 'sit'); outline(c);
    sheet.getContext('2d').drawImage(c, i * SW, 4 * SH);
  });
  dirs.forEach((d, i) => { // row 5: swimming
    const c = canvas(SW, SH); drawSmall(c.getContext('2d'), app, d, 0, 'swim'); outline(c);
    sheet.getContext('2d').drawImage(c, i * SW, 5 * SH);
  });
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  cache.set(key, sheet);
  return sheet;
}

function drawSmall(ctx, a, dir, frame, mode) {
  const r = (x, y, w, h, col) => { if (col && col !== 'none') px(ctx, x + 2, y + 2, w, h, col); };
  const f = a.gender === 'f';
  const oy = f ? 1 : 0; // she is a little shorter
  const skin = a.skin, skinD = shade(skin, -0.18);
  const hairC = a.hairColor, hairD = shade(hairC, -0.3), hairL = shade(hairC, 0.18);
  const top = it(a.top), bot = it(a.bottom), sho = it(a.shoes), gl = it(a.glasses), hat = it(a.hat), ear = it(a.earrings);
  const T0 = top.c[0] || '#888', T1 = top.c[1] || shade(T0, -0.2), T2 = top.c[2] || T0;
  const B0 = bot.c[0] || '#333', B1 = bot.c[1] || shade(B0, -0.2);
  const S0 = sho.c[0] || '#222';
  const fullBody = top.style === 'saree' || top.style === 'dress';
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const side = dir === 'left' || dir === 'right';
  const flip = dir === 'right';
  if (flip) { ctx.save(); ctx.translate(SW, 0); ctx.scale(-1, 1); }
  const sx = f ? 1 : 0; // narrower shoulders for her

  if (mode === 'swim') {
    // head + shoulders above water ripple
    r(3, 14, 10, 3, '#bfe8ff'); r(1, 16, 14, 2, '#7cc8f0');
    r(4, 9 + oy, 8, 5, skin); r(4, 12, 8, 2, T0);
    drawHeadSmall(r, a, dir, 2, oy, skin, skinD, hairC, hairD, hairL, gl, hat, ear, side);
    if (flip) ctx.restore();
    return;
  }

  // back hair (long) behind body when facing down/side
  if (LONG_HAIR.has(a.hair) && dir !== 'up') {
    r(3, 4 + oy, 10, 9, hairD);
    if (a.hair !== 'ponytail') r(3, 12 + oy, 10, 3, hairD);
  }

  const sit = mode === 'sit';
  // ---- legs & shoes ----
  const legTop = 17 + oy, legLen = f ? 4 : 5;
  const legCol = (bot.style === 'shorts') ? skin : (bot.style === 'skirt' ? skin : B0);
  if (sit) {
    if (!side) { r(4, legTop, 8, 3, fullBody ? T0 : B0); r(4, legTop + 3, 3, 2, S0); r(9, legTop + 3, 3, 2, S0); }
    else { r(5, legTop, 7, 3, fullBody ? T0 : B0); r(11, legTop + 1, 2, 3, legCol); r(11, legTop + 3, 3, 2, S0); }
  } else if (!side) {
    const lA = step, lB = -step;
    r(4, legTop, 3, legLen + Math.min(0, lA), legCol); r(9, legTop, 3, legLen + Math.min(0, lB), legCol);
    if (bot.style === 'jeans') { r(4, legTop + legLen - 1, 3, 1, B1); r(9, legTop + legLen - 1, 3, 1, B1); }
    if (bot.style === 'palazzo' || bot.style === 'dhoti') { r(3, legTop + 2, 5, legLen - 2, B0); r(8, legTop + 2, 5, legLen - 2, B0); }
    if (bot.style === 'shorts') { r(4, legTop, 3, 2, B0); r(9, legTop, 3, 2, B0); }
    const shoeH = sho.style === 'heels' ? 1 : 2;
    r(4, legTop + legLen + Math.min(0, lA), 3, shoeH, sho.style === 'sandal' ? skinD : S0);
    r(9, legTop + legLen + Math.min(0, lB), 3, shoeH, sho.style === 'sandal' ? skinD : S0);
  } else {
    // side: legs scissor
    r(6 + step, legTop, 3, legLen, legCol); r(7 - step, legTop, 3, legLen, shade(legCol, -0.12));
    if (bot.style === 'palazzo' || bot.style === 'dhoti') r(5, legTop + 1, 6, legLen - 1, B0);
    if (bot.style === 'shorts') r(6, legTop, 4, 2, B0);
    r(6 + step, legTop + legLen, 4, 2, S0); r(7 - step, legTop + legLen, 4, 2, shade(S0, 0.15));
  }
  // skirt / long garments over legs
  if (bot.style === 'skirt' && !fullBody) { r(3, legTop, 10, 2, B0); r(3, legTop + 2, 10, 1, B1); }

  // ---- torso ----
  const ty = 11 + oy;
  const armSwing = side ? 0 : step;
  const sleeveShort = ['tee', 'jersey', 'crop', 'dress', 'swim'].includes(top.style);
  // arms
  if (!side) {
    r(2 + sx, ty + 1 + armSwing, 2, 5, sleeveShort ? skin : (top.style === 'waistcoat' ? T0 : T0));
    r(12 - sx, ty + 1 - armSwing, 2, 5, sleeveShort ? skin : T0);
    if (sleeveShort) { r(2 + sx, ty + 1 + armSwing, 2, 2, top.style === 'swim' || top.style === 'dress' || top.style === 'crop' ? skin : T0); r(12 - sx, ty + 1 - armSwing, 2, 2, top.style === 'swim' || top.style === 'dress' || top.style === 'crop' ? skin : T0); }
    r(2 + sx, ty + 6 + armSwing, 2, 1, skin); r(12 - sx, ty + 6 - armSwing, 2, 1, skin);
    if (a.nails && a.nails !== 'none') { r(2 + sx, ty + 7 + armSwing, 1, 1, a.nails); r(13 - sx, ty + 7 - armSwing, 1, 1, a.nails); }
  }
  // body
  const tw = 10 - sx * 2, tx = 3 + sx;
  r(tx, ty, tw, 6, T0);
  switch (top.style) {
    case 'waistcoat':
      if (dir === 'down') { r(tx, ty, 3, 6, T1); r(tx + tw - 3, ty, 3, 6, T1); r(tx + 4, ty, 2, 5, T2); r(tx + 3, ty, 1, 6, shade(T1, 0.3)); r(tx + tw - 4, ty, 1, 6, shade(T1, 0.3)); if (a.pin) r(tx + 2, ty + 2, 1, 1, '#b8282a'); }
      else if (dir === 'up') r(tx, ty, tw, 6, T1);
      else { r(tx + 2, ty, tw - 4, 6, T1); }
      break;
    case 'kurta': case 'punjabi':
      r(tx, ty + 6, tw, 3, T0); // long hem over thighs
      if (dir === 'down') { r(tx + 3, ty, tw - 6, 1, T2); r(tx + 4, ty + 1, tw - 8, 2, T2); r(tx, ty + 8, tw, 1, T2); }
      if (top.style === 'kurta' && dir !== 'up') r(tx, ty, 2, 6, rgba(T2, 0.55)); // dupatta
      break;
    case 'saree':
      r(tx, ty, tw, 3, T1); r(tx + 1, ty + 3, tw - 2, 1, skin);
      r(3, ty + 4, 10, 9 - oy, T0); r(3, ty + 12 - oy, 10, 1, T2);
      if (dir !== 'up') { r(tx + tw - 3, ty, 2, 13 - oy, T1); r(tx + tw - 1, ty, 1, 13 - oy, T2); }
      else r(tx, ty, tw, 6, T1);
      break;
    case 'dress':
      r(3, ty + 4, 10, 5, T0); r(3, ty + 8, 10, 1, T1); r(tx + 2, ty, 1, 1, skin); r(tx + tw - 3, ty, 1, 1, skin);
      break;
    case 'crop': r(tx, ty + 4, tw, 2, skin); break;
    case 'jacket': case 'blazer':
      if (dir === 'down') { r(tx + 3, ty, tw - 6, 6, T2); if (top.style === 'blazer') r(tx + 4, ty, 2, 4, '#2a2a2a'); }
      break;
    case 'shirt': if (dir === 'down') { r(tx + 3, ty, 1, 1, T2); r(tx + tw - 4, ty, 1, 1, T2); r(tx + 4, ty + 2, 2, 1, T1); r(tx + 4, ty + 4, 2, 1, T1); } break;
    case 'hoodie': if (dir === 'down') { r(tx + 2, ty + 3, tw - 4, 2, T1); r(tx + 3, ty, 1, 2, T2); r(tx + tw - 4, ty, 1, 2, T2); } else if (dir === 'up') r(tx + 2, ty - 1, tw - 4, 2, T1); break;
    case 'jersey': if (dir !== 'side') { r(tx, ty, tw, 1, T1); if (dir === 'up') { r(tx + 3, ty + 2, 1, 3, T2); r(tx + 5, ty + 2, 2, 3, T2); } } break;
    case 'tee': if (dir === 'down' && T2 !== T0) r(tx + 3, ty + 2, tw - 6, 2, T2); break;
    case 'swim': r(tx, ty + 3, tw, 3, skin); r(tx, ty + 4, tw, 2, T0); break;
  }
  if (side) { // side arm in front
    const aSw = step;
    const arm = sleeveShort ? skin : T0;
    r(7 + aSw, ty + 1, 2, 5, arm); r(7 + aSw, ty + 6, 2, 1, skin);
  }
  // neck
  r(6, ty - 1, 4, 1, skinD);

  drawHeadSmall(r, a, dir, 0, oy, skin, skinD, hairC, hairD, hairL, gl, hat, ear, side);
  if (flip) ctx.restore();
}

function drawHeadSmall(r, a, dir, yo, oy, skin, skinD, hairC, hairD, hairL, gl, hat, ear, side) {
  const y0 = yo + oy;
  // face
  r(4, 3 + y0, 8, 7, skin);
  r(4, 9 + y0, 8, 1, skinD);
  const h = a.hair;
  if (dir === 'up') {
    r(3, 1 + y0, 10, 8, hairC); r(4, 0 + y0, 8, 1, hairC);
    if (LONG_HAIR.has(h)) r(3, 8 + y0, 10, 5, hairC);
    if (h === 'ponytail') r(6, 9 + y0, 4, 5, hairD);
    if (h === 'bun') r(6, -1 + y0, 4, 3, hairD);
    if (h === 'braid') r(9, 9 + y0, 2, 6, hairD);
    if (ear.style !== 'none') { r(3, 7 + y0, 1, 2, ear.c[0]); r(12, 7 + y0, 1, 2, ear.c[0]); }
  } else if (!side) {
    // hair top
    const big = h === 'swept' || h === 'curly';
    r(3, 1 + y0, 10, big ? 4 : 3, hairC); r(4, 0 + y0, 8, 1, hairC);
    if (big) { r(5, -1 + y0, 6, 1, hairC); r(9, 0 + y0, 3, 1, hairL); }
    if (h !== 'buzz') { r(3, 3 + y0, 1, 4, hairC); r(12, 3 + y0, 1, 4, hairC); }
    if (LONG_HAIR.has(h) || h === 'bob') { r(3, 3 + y0, 2, h === 'bob' ? 6 : 9, hairC); r(11, 3 + y0, 2, h === 'bob' ? 6 : 9, hairC); r(7, 2 + y0, 1, 2, hairD); }
    if (h === 'bun') r(6, -2 + y0, 4, 3, hairC);
    if (h === 'buzz') r(3, 1 + y0, 10, 2, shade(hairC, 0.1));
    // eyes
    r(5, 6 + y0, 2, 2, '#ffffff'); r(9, 6 + y0, 2, 2, '#ffffff');
    r(6, 6 + y0, 1, 2, '#1a1414'); r(9, 6 + y0, 1, 2, '#1a1414');
    r(5, 5 + y0, 2, 1, hairD); r(9, 5 + y0, 2, 1, hairD); // brows
    if (a.blush) { r(4, 8 + y0, 1, 1, '#f09a9a'); r(11, 8 + y0, 1, 1, '#f09a9a'); }
    r(7, 9 + y0, 2, 1, a.lip && a.lip !== 'none' ? a.lip : shade(skin, -0.3));
    if (a.beard && a.beard !== 'none') {
      const bc = mix(skin, hairC, a.beard === 'stubble' ? 0.35 : 0.65);
      if (a.beard !== 'mustache') { r(4, 8 + y0, 1, 2, bc); r(11, 8 + y0, 1, 2, bc); r(5, 9 + y0, 6, 1, bc); r(7, 9 + y0, 2, 1, a.beard === 'goatee' ? bc : shade(skin, -0.3)); }
      if (a.beard !== 'stubble') r(6, 8 + y0, 4, 1, bc);
    }
    if (ear.style !== 'none') { r(3, 7 + y0, 1, ear.style === 'jhumka' ? 3 : 1, ear.c[0]); r(12, 7 + y0, 1, ear.style === 'jhumka' ? 3 : 1, ear.c[0]); }
    if (gl.style !== 'none') {
      const lens = gl.c[1] === 'clear' ? '#ffffff' : gl.c[1];
      r(4, 6 + y0, 8, 1, gl.c[0]);
      r(5, 6 + y0, 2, 2, lens); r(9, 6 + y0, 2, 2, lens);
      if (gl.c[1] === 'clear') { r(6, 6 + y0, 1, 2, '#1a1414'); r(9, 6 + y0, 1, 2, '#1a1414'); }
      r(4, 7 + y0, 1, 1, gl.c[0]); r(11, 7 + y0, 1, 1, gl.c[0]); r(7, 6 + y0, 2, 1, gl.c[0]);
    }
  } else {
    // side profile (drawn facing left; mirrored for right)
    r(3, 1 + y0, 9, 4, hairC); r(4, 0 + y0, 7, 1, hairC);
    r(8, 3 + y0, 4, 5, hairC);
    if (h === 'swept' || h === 'curly') r(3, -1 + y0, 6, 2, hairC);
    if (LONG_HAIR.has(h)) r(8, 5 + y0, 4, 8, hairC);
    if (h === 'ponytail') r(11, 4 + y0, 3, 6, hairD);
    if (h === 'bun') r(9, -1 + y0, 3, 3, hairD);
    if (h === 'bob') r(8, 5 + y0, 4, 3, hairC);
    r(3, 3 + y0, 1, 1, hairC);
    r(2, 6 + y0, 1, 2, skin); // nose
    r(4, 6 + y0, 2, 2, '#ffffff'); r(4, 6 + y0, 1, 2, '#1a1414'); r(4, 5 + y0, 2, 1, hairD);
    r(4, 9 + y0, 2, 1, a.lip && a.lip !== 'none' ? a.lip : shade(skin, -0.3));
    if (a.beard && a.beard !== 'none') r(4, 8 + y0, 5, 2, mix(skin, hairC, 0.5));
    r(8, 6 + y0, 1, 2, skinD); // ear
    if (ear.style !== 'none') r(8, 8 + y0, 1, 2, ear.c[0]);
    if (gl.style !== 'none') { r(3, 6 + y0, 6, 1, gl.c[0]); r(3, 6 + y0, 2, 2, gl.c[1] === 'clear' ? '#ffffff' : gl.c[1]); if (gl.c[1] === 'clear') r(4, 6 + y0, 1, 2, '#1a1414'); }
  }
  // hats
  if (hat.style === 'cap') { r(3, 0 + y0, 10, 3, hat.c[0]); if (dir === 'down') r(3, 3 + y0, 10, 1, shade(hat.c[0], -0.3)); if (side) r(0, 2 + y0, 4, 1, hat.c[0]); }
  if (hat.style === 'beanie') { r(3, -1 + y0, 10, 4, hat.c[0]); r(3, 2 + y0, 10, 1, shade(hat.c[0], -0.2)); }
  if (hat.style === 'fedora') { r(1, 2 + y0, 14, 1, hat.c[0]); r(4, -1 + y0, 8, 3, hat.c[0]); r(4, 1 + y0, 8, 1, '#2a1a10'); }
  if (hat.style === 'sunhat') { r(0, 2 + y0, 16, 2, hat.c[0]); r(4, -1 + y0, 8, 3, hat.c[0]); r(4, 1 + y0, 8, 1, '#c0283a'); }
}

/* ---------------------------------------------------------------- */
/* Large portrait (96 x 144) — the hi-res "close-up" art.            */
/* ---------------------------------------------------------------- */
export const PW = 96, PH = 144;
const pcache = new Map();

export function portrait(app, opts = {}) {
  const key = JSON.stringify(app) + (opts.pose || '');
  if (pcache.has(key)) return pcache.get(key);
  const c = canvas(PW, PH);
  drawPortrait(c.getContext('2d'), app, opts);
  crisp(c); outline(c, '#1d1a24');
  if (pcache.size > 40) pcache.delete(pcache.keys().next().value);
  pcache.set(key, c);
  return c;
}

function drawPortrait(ctx, a, opts) {
  const f = a.gender === 'f';
  const oy = f ? 4 : 0; // ~6cm shorter
  const cx = 48;
  const skin = a.skin, skinD = shade(skin, -0.16), skinDD = shade(skin, -0.3), skinL = shade(skin, 0.12);
  const hc = a.hairColor, hcD = shade(hc, -0.35), hcL = shade(hc, 0.22);
  const top = it(a.top), bot = it(a.bottom), sho = it(a.shoes), gl = it(a.glasses), hat = it(a.hat), ear = it(a.earrings);
  const T0 = top.c[0] || '#888', T1 = top.c[1] || shade(T0, -0.2), T2 = top.c[2] || T0;
  const B0 = bot.c[0] || '#333', B1 = bot.c[1] || shade(B0, -0.2);
  const S0 = sho.c[0] || '#222';
  const sw = f ? 16 : 18; // half shoulder width
  const headY = 34 + oy;
  const fullBody = top.style === 'saree' || top.style === 'dress';
  const sleeveless = ['dress', 'crop', 'swim'].includes(top.style);
  const shortSleeve = ['tee', 'jersey'].includes(top.style);

  // --- back hair ---
  if (['long', 'wavy'].includes(a.hair)) {
    poly(ctx, [cx - 17, headY - 8, cx + 17, headY - 8, cx + 21, 98 + oy, cx - 21, 98 + oy], hcD);
    if (a.hair === 'wavy') for (let y = 60; y < 98; y += 8) { ell(ctx, cx - 20, y + oy, 3, 4, hcD); ell(ctx, cx + 20, y + oy + 4, 3, 4, hcD); }
  }
  if (a.hair === 'ponytail') { poly(ctx, [cx + 10, headY - 10, cx + 22, headY + 4, cx + 20, 80 + oy, cx + 12, 78 + oy], hcD); }

  // --- legs ---
  const hip = 92 + oy, foot = 134;
  const legL = cx - 8, legR = cx + 8;
  const legColor = ['shorts', 'skirt'].includes(bot.style) || top.style === 'dress' ? skin : B0;
  px(ctx, legL - 6, hip, 11, foot - hip, legColor); px(ctx, legR - 5, hip, 11, foot - hip, legColor);
  if (legColor === skin) { px(ctx, legL - 6, hip, 2, foot - hip, skinD); px(ctx, legR + 4, hip, 2, foot - hip, skinD); }
  if (!fullBody) {
    if (bot.style === 'trousers' || bot.style === 'jeans') {
      px(ctx, legL - 6, hip, 23, 8, B0);
      px(ctx, legL - 1, hip + 8, 1, foot - hip - 8, B1); px(ctx, legR, hip + 8, 1, foot - hip - 8, B1); // crease
      px(ctx, cx - 0.5, hip + 6, 1, foot - hip - 6, shade(B0, -0.35));
      if (bot.style === 'jeans') { px(ctx, legL - 6, hip + 2, 23, 1, shade(B0, 0.25)); px(ctx, legL - 5, foot - 4, 10, 1, shade(B0, 0.3)); px(ctx, legR - 4, foot - 4, 10, 1, shade(B0, 0.3)); }
    }
    if (bot.style === 'shorts') { px(ctx, legL - 7, hip, 25, 16, B0); px(ctx, cx - 0.5, hip + 6, 1, 10, B1); px(ctx, legL - 7, hip + 14, 25, 2, B1); }
    if (bot.style === 'skirt') { poly(ctx, [cx - 15, hip, cx + 15, hip, cx + 21, hip + 24, cx - 21, hip + 24], B0); for (let x = -18; x <= 18; x += 6) px(ctx, cx + x, hip + 6, 1, 18, B1); }
    if (bot.style === 'palazzo' || bot.style === 'dhoti') {
      poly(ctx, [cx - 15, hip, cx - 1, hip, cx - 1, foot, cx - 20, foot], B0);
      poly(ctx, [cx + 1, hip, cx + 15, hip, cx + 20, foot, cx + 1, foot], B0);
      for (let k = 0; k < 4; k++) { px(ctx, cx - 16 + k * 4, hip + 10 + k * 2, 1, foot - hip - 10 - k * 2, B1); px(ctx, cx + 4 + k * 4, hip + 10 + k * 2, 1, foot - hip - 10 - k * 2, B1); }
    }
  }
  // --- shoes ---
  const shoe = (x) => {
    switch (sho.style) {
      case 'heels': ell(ctx, x, foot + 2, 6, 3, S0); px(ctx, x + 4, foot + 2, 2, 5, shade(S0, -0.3)); px(ctx, x - 3, foot, 4, 1, shade(S0, 0.4)); break;
      case 'sneaker': ell(ctx, x, foot + 2, 8, 4.5, S0); px(ctx, x - 8, foot + 4, 16, 2, '#cfcfcf'); px(ctx, x - 3, foot - 1, 6, 1, shade(S0, -0.3)); px(ctx, x - 2, foot + 1, 1, 1, '#9a9a9a'); px(ctx, x + 1, foot + 1, 1, 1, '#9a9a9a'); break;
      case 'jutti': ell(ctx, x, foot + 2, 7, 3.5, S0); px(ctx, x - 8, foot, 2, 2, S0); for (let i = -4; i < 5; i += 2) px(ctx, x + i, foot + 1, 1, 1, '#f0d488'); break;
      case 'sandal': ell(ctx, x, foot + 2, 7, 3.5, skin); px(ctx, x - 6, foot + 4, 13, 1, S0); px(ctx, x - 4, foot, 8, 2, S0); break;
      case 'boots': px(ctx, x - 6, foot - 8, 12, 10, S0); ell(ctx, x, foot + 2, 8, 4, S0); px(ctx, x - 6, foot + 4, 15, 2, shade(S0, -0.4)); break;
      default: ell(ctx, x, foot + 2, 7.5, 4, S0); px(ctx, x - 3, foot, 3, 1, shade(S0, 0.45)); px(ctx, x - 7, foot + 4, 15, 1, '#000');
    }
  };
  shoe(legL - 1); shoe(legR + 1);

  // --- arms (behind torso edges) ---
  const shY = 58 + oy;
  const armCol = sleeveless ? skin : T0;
  const armOuter = (side) => {
    const x0 = cx + side * (sw + 1);
    poly(ctx, [x0 - 5, shY, x0 + 5, shY, x0 + side * 4 + 4, shY + 36, x0 + side * 4 - 4, shY + 36], armCol);
    if (shortSleeve) { poly(ctx, [x0 - 6, shY - 1, x0 + 6, shY - 1, x0 + side * 2 + 6, shY + 13, x0 + side * 2 - 6, shY + 13], top.style === 'jersey' ? T1 : T0); }
    if (sleeveless || shortSleeve) px(ctx, x0 + side * 4 - (side > 0 ? 4 : 0), shY + 14, 1, 22, skinD);
    if (top.style === 'waistcoat') { px(ctx, x0 + side * 1 - 3, shY + 4, 1, 30, '#c9cfdc'); px(ctx, x0 + side * 3, shY + 4, 1, 30, '#c9cfdc'); px(ctx, x0 + side * 4 - 4, shY + 32, 8, 3, '#e8e4dc'); }
    if (top.style === 'kurta' || top.style === 'punjabi') { px(ctx, x0 + side * 4 - 4, shY + 32, 8, 2, T2); }
    if (top.style === 'jacket' || top.style === 'blazer' || top.style === 'hoodie') px(ctx, x0 + side * 4 - 4, shY + 33, 8, 2, shade(T0, -0.25));
    // hand
    const hx = x0 + side * 4, hy = shY + 40;
    ell(ctx, hx, hy, 4.5, 5.5, skin); px(ctx, hx - 4, hy + 2, 8, 1, skinD);
    if (a.nails && a.nails !== 'none') { px(ctx, hx - 3, hy + 4, 1, 2, a.nails); px(ctx, hx - 1, hy + 4, 1, 2, a.nails); px(ctx, hx + 1, hy + 4, 1, 2, a.nails); px(ctx, hx + 3, hy + 3, 1, 2, a.nails); }
  };
  armOuter(-1); armOuter(1);

  // --- torso ---
  const waist = 90 + oy;
  const torso = (col) => poly(ctx, [cx - sw, shY, cx + sw, shY, cx + sw - (f ? 4 : 2), waist, cx - sw + (f ? 4 : 2), waist], col);
  switch (top.style) {
    case 'waistcoat': {
      torso(T0);
      for (let x = cx - sw + 2; x < cx + sw; x += 3) px(ctx, x, shY + 1, 1, waist - shY, '#d5d9e2'); // pinstripes
      poly(ctx, [cx - 6, shY - 2, cx, shY + 6, cx - 9, shY + 4], '#ffffff'); poly(ctx, [cx + 6, shY - 2, cx, shY + 6, cx + 9, shY + 4], '#ffffff'); // collar
      poly(ctx, [cx - 2.5, shY + 3, cx + 2.5, shY + 3, cx + 4, shY + 28, cx, shY + 32, cx - 4, shY + 28], T2); // tie
      px(ctx, cx - 2, shY + 3, 4, 3, shade(T2, 0.25));
      poly(ctx, [cx - sw, shY, cx - 9, shY, cx - 1, waist - 2, cx - sw + (f ? 4 : 2), waist + 2], T1); // vest L
      poly(ctx, [cx + sw, shY, cx + 9, shY, cx + 1, waist - 2, cx + sw - (f ? 4 : 2), waist + 2], T1); // vest R
      poly(ctx, [cx - 9, shY, cx - 5, shY, cx + 1, waist - 6, cx - 1, waist - 2], '#3c3a42'); // satin lapels
      poly(ctx, [cx + 9, shY, cx + 5, shY, cx - 1, waist - 6, cx + 1, waist - 2], '#3c3a42');
      if (a.pin) { // lapel pin with chain (from the photo)
        rrect(ctx, cx - 14, shY + 9, 3, 4, 1, '#b8282a'); px(ctx, cx - 14, shY + 9, 3, 1, '#e3b341');
        rrect(ctx, cx - 9, shY + 18, 3, 3, 1, '#b8282a');
        for (let i = 0; i < 6; i++) px(ctx, cx - 13 + i * 0.7, shY + 13 + i, 1, 1, '#e3b341');
      }
      break;
    }
    case 'kurta': case 'punjabi': {
      const hem = 114 + oy;
      poly(ctx, [cx - sw, shY, cx + sw, shY, cx + sw + 4, hem, cx - sw - 4, hem], T0);
      // crinkled lattice texture
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = T1; ctx.lineWidth = 1;
      for (let k = -60; k < 60; k += 6) { ctx.beginPath(); ctx.moveTo(cx + k, shY); ctx.lineTo(cx + k + 40, hem); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + k + 40, shY); ctx.lineTo(cx + k, hem); ctx.stroke(); }
      ctx.restore();
      if (top.style === 'kurta') {
        // scalloped zari neckline
        for (let i = -1; i <= 1; i += 2) for (let k = 0; k < 7; k++) { ell(ctx, cx + i * (11 - k * 1.5), shY + 1 + k * 3, 2.2, 2.2, T2); px(ctx, cx + i * (11 - k * 1.5), shY + 1 + k * 3, 1, 1, shade(T2, -0.3)); }
        poly(ctx, [cx - 9, shY, cx + 9, shY, cx, shY + 18], skin);
        px(ctx, cx - sw - 4, hem - 3, sw * 2 + 8, 2, T2);
        for (let x = cx - sw; x < cx + sw; x += 5) px(ctx, x, hem - 6, 2, 2, T2);
        // sheer dupatta over left shoulder
        ctx.save(); ctx.globalAlpha = 0.38; poly(ctx, [cx - sw - 6, shY - 2, cx - sw + 10, shY - 3, cx + 8, hem + 6, cx - 4, hem + 8], shade(T0, 0.35)); ctx.restore();
        for (let k = 0; k < 10; k++) px(ctx, cx - sw + 9 + k * 1.6, shY + k * 6, 2, 2, T2);
      } else {
        px(ctx, cx - 1, shY, 2, 22, T2); for (let k = 0; k < 4; k++) px(ctx, cx - 1, shY + 4 + k * 5, 2, 2, '#c9a24a');
        px(ctx, cx - 6, shY - 2, 12, 3, T1);
      }
      break;
    }
    case 'saree': {
      torso(T1); px(ctx, cx - sw + 4, waist - 12, sw * 2 - 8, 8, skin); px(ctx, cx - sw + 4, waist - 12, sw * 2 - 8, 1, skinD);
      poly(ctx, [cx - sw + 2, waist - 4, cx + sw - 2, waist - 4, cx + 20, foot - 2, cx - 20, foot - 2], T0);
      px(ctx, cx - 20, foot - 8, 40, 6, T2); px(ctx, cx - 20, foot - 9, 40, 1, T1);
      for (let x = -14; x <= 14; x += 4) px(ctx, cx + x, waist + 4, 1, foot - waist - 14, shade(T0, -0.12));
      // pallu draped over left shoulder
      poly(ctx, [cx + 14, waist, cx + 4, waist + 6, cx - sw - 2, shY - 2, cx - sw + 9, shY - 3], T1);
      poly(ctx, [cx + 14, waist, cx + 10, waist + 3, cx - sw + 5, shY - 2, cx - sw + 9, shY - 3], T2);
      poly(ctx, [cx - sw - 2, shY - 2, cx - sw + 6, shY, cx - sw + 4, waist + 16, cx - sw - 6, waist + 14], T1);
      break;
    }
    case 'dress': {
      torso(T0); px(ctx, cx - sw + 4, shY - 2, 3, 4, T0); px(ctx, cx + sw - 7, shY - 2, 3, 4, T0);
      poly(ctx, [cx - 10, shY, cx + 10, shY, cx, shY + 7], skin);
      poly(ctx, [cx - sw + 4, waist - 2, cx + sw - 4, waist - 2, cx + 24, waist + 26, cx - 24, waist + 26], T0);
      px(ctx, cx - sw + 4, waist - 3, sw * 2 - 8, 2, T1);
      if (T2 === '#ffffff') for (let k = 0; k < 14; k++) ell(ctx, cx - 18 + (k * 7) % 36, waist + 4 + ((k * 11) % 20), 1.5, 1.5, '#fff');
      break;
    }
    case 'crop': torso(skin); poly(ctx, [cx - sw, shY, cx + sw, shY, cx + sw - 2, shY + 22, cx - sw + 2, shY + 22], T0); px(ctx, cx - 1, waist - 10, 2, 2, skinDD); break;
    case 'swim': torso(T0); poly(ctx, [cx - 9, shY, cx + 9, shY, cx, shY + 8], skin); px(ctx, cx - sw + 2, waist - 8, sw * 2 - 4, 2, T2); break;
    case 'jacket': case 'blazer': {
      torso(T2);
      if (top.style === 'blazer') poly(ctx, [cx - 2, shY + 3, cx + 2, shY + 3, cx + 3, shY + 26, cx, shY + 29, cx - 3, shY + 26], '#2a2a35');
      poly(ctx, [cx - sw, shY, cx - 6, shY, cx - 3, waist, cx - sw + 2, waist + 2], T0);
      poly(ctx, [cx + sw, shY, cx + 6, shY, cx + 3, waist, cx + sw - 2, waist + 2], T0);
      poly(ctx, [cx - 6, shY, cx - 12, shY + 2, cx - 6, shY + 20], shade(T0, 0.18)); poly(ctx, [cx + 6, shY, cx + 12, shY + 2, cx + 6, shY + 20], shade(T0, 0.18));
      if (top.style === 'jacket') { for (let y = shY + 4; y < waist; y += 3) px(ctx, cx + 4, y, 1, 2, '#c9c9c9'); }
      else { px(ctx, cx - 5, waist - 14, 2, 2, '#c9a24a'); px(ctx, cx - 5, waist - 7, 2, 2, '#c9a24a'); px(ctx, cx - sw + 4, shY + 10, 6, 1, '#e3e3e3'); }
      break;
    }
    case 'hoodie': {
      ell(ctx, cx, shY - 2, 16, 6, T1); torso(T0);
      px(ctx, cx - 10, waist - 14, 20, 10, T1); px(ctx, cx - 10, waist - 14, 20, 1, shade(T0, -0.3));
      px(ctx, cx - 4, shY + 2, 1, 14, T2); px(ctx, cx + 3, shY + 2, 1, 14, T2);
      break;
    }
    case 'jersey': {
      torso(T0); poly(ctx, [cx - sw, shY, cx - sw + 7, shY, cx - sw + 5, waist, cx - sw + 2, waist], T1); poly(ctx, [cx + sw, shY, cx + sw - 7, shY, cx + sw - 5, waist, cx + sw - 2, waist], T1);
      poly(ctx, [cx - 6, shY - 1, cx + 6, shY - 1, cx, shY + 6], T2);
      px(ctx, cx - 6, shY + 12, 2, 8, T2); px(ctx, cx - 1, shY + 12, 6, 8, T2); px(ctx, cx + 1, shY + 14, 2, 4, T0);
      break;
    }
    case 'shirt': {
      torso(T0);
      if (top.id === 'top_shirt_floral') for (let k = 0; k < 18; k++) { ell(ctx, cx - sw + 4 + (k * 13) % (sw * 2 - 6), shY + 4 + ((k * 7) % 28), 2.2, 2.2, T2); }
      poly(ctx, [cx - 6, shY - 2, cx, shY + 5, cx - 9, shY + 4], shade(T0, 0.25)); poly(ctx, [cx + 6, shY - 2, cx, shY + 5, cx + 9, shY + 4], shade(T0, 0.25));
      px(ctx, cx - 0.5, shY + 5, 1, waist - shY - 5, T1); for (let y = shY + 8; y < waist; y += 7) px(ctx, cx - 1, y, 2, 2, T2);
      px(ctx, cx - 14, shY + 10, 7, 6, shade(T0, -0.08));
      break;
    }
    default: { // tee
      torso(T0); ell(ctx, cx, shY, 6, 3, skin); px(ctx, cx - 6, shY + 2, 12, 1, T1);
      if (T2 !== T0) { rrect(ctx, cx - 7, shY + 10, 14, 12, 2, T2); px(ctx, cx - 4, shY + 13, 8, 2, T0); px(ctx, cx - 2, shY + 17, 4, 3, T0); }
    }
  }
  // belt line for tucked tops
  if (['waistcoat', 'shirt'].includes(top.style) && !fullBody) px(ctx, cx - sw + 3, waist, sw * 2 - 6, 2, '#1a1a1a');

  // --- neck & head ---
  px(ctx, cx - 5, headY + 12, 10, shY - headY - 10, skin);
  px(ctx, cx - 5, headY + 15, 10, 2, skinD);
  if (top.style === 'waistcoat') { poly(ctx, [cx - 6, shY - 2, cx, shY + 6, cx - 9, shY + 4], '#ffffff'); poly(ctx, [cx + 6, shY - 2, cx, shY + 6, cx + 9, shY + 4], '#ffffff'); px(ctx, cx - 2.5, shY + 2, 5, 4, shade(T2, 0.25)); }
  // ears
  ell(ctx, cx - 14, headY + 2, 3, 5, skinD); ell(ctx, cx + 14, headY + 2, 3, 5, skinD);
  // face shape (softer jaw for her)
  ell(ctx, cx, headY, 14, 17, skin);
  if (!f) poly(ctx, [cx - 13, headY + 4, cx + 13, headY + 4, cx + 8, headY + 16, cx - 8, headY + 16], skin);
  ell(ctx, cx, headY + 13, f ? 8 : 9, 4.5, skin);
  px(ctx, cx - 13, headY - 4, 3, 10, skinL);
  // eyes
  const eye = (ex, dirx) => {
    if (a.shadow && a.shadow !== 'none') { ctx.save(); ctx.globalAlpha = 0.55; ell(ctx, ex, headY - 1, 5, 2.6, a.shadow); ctx.restore(); }
    ell(ctx, ex, headY + 2, 4.2, 2.6, '#ffffff');
    ell(ctx, ex, headY + 2, 2.3, 2.5, a.eyes); ell(ctx, ex, headY + 2, 1.1, 1.3, '#0f0b0b');
    px(ctx, ex - 1, headY + 1, 1, 1, '#ffffff');
    px(ctx, ex - 4, headY - 0.5, 9, 1.2, '#1a1212'); // upper lash line
    if (a.liner) poly(ctx, [ex + dirx * 3, headY - 0.5, ex + dirx * 7, headY - 2.5, ex + dirx * 4, headY + 0.8], '#120c0c');
    px(ctx, ex - 3, headY + 4.4, 7, 0.8, skinD);
  };
  eye(cx - 6, -1); eye(cx + 6, 1);
  // brows
  const browC = shade(hc, -0.15);
  poly(ctx, [cx - 11, headY - 4, cx - 2, headY - 6, cx - 2, headY - 4.5, cx - 11, headY - 2.5], browC);
  poly(ctx, [cx + 11, headY - 4, cx + 2, headY - 6, cx + 2, headY - 4.5, cx + 11, headY - 2.5], browC);
  // nose
  px(ctx, cx + 1, headY + 2, 1, 6, skinD); px(ctx, cx - 3, headY + 8, 6, 1, skinD); px(ctx, cx - 2, headY + 7, 1, 1, skinDD); px(ctx, cx + 2, headY + 7, 1, 1, skinDD);
  if (f) px(ctx, cx - 4, headY + 6, 1, 1, '#e8e8f0'); // tiny nose pin
  // blush
  if (a.blush) { ctx.save(); ctx.globalAlpha = 0.35; ell(ctx, cx - 9, headY + 7, 3.5, 2, '#e8707a'); ell(ctx, cx + 9, headY + 7, 3.5, 2, '#e8707a'); ctx.restore(); }
  // beard
  if (a.beard && a.beard !== 'none') {
    const bc = mix(skin, hc, a.beard === 'stubble' ? 0.38 : a.beard === 'full' ? 0.85 : 0.62);
    if (a.beard !== 'mustache') {
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, headY + 3, 14.5, 17, 0, 0, Math.PI); ctx.lineTo(cx - 14, headY + 3); ctx.clip();
      poly(ctx, [cx - 14, headY + 4, cx - 9, headY + 9, cx + 9, headY + 9, cx + 14, headY + 4, cx + 14, headY + 22, cx - 14, headY + 22], bc);
      ctx.restore();
      ell(ctx, cx, headY + 13, a.beard === 'goatee' ? 4 : 9.5, a.beard === 'full' ? 6 : 5, bc);
      // clear the cheeks so it reads as a trimmed jawline beard
      if (a.beard !== 'full') ell(ctx, cx, headY + 4, a.beard === 'goatee' ? 14 : 11.5, a.beard === 'goatee' ? 7.5 : 8.5, skin);
      ell(ctx, cx, headY + 11, 4, 1.6, skin); // lip area
      if (a.beard === 'stubble' || a.beard === 'short') { ctx.save(); ctx.globalAlpha = 0.5; for (let k = 0; k < 14; k++) px(ctx, cx - 12 + k * 1.8, headY + 7 + (k % 3), 1, 1, bc); ctx.restore(); }
    }
    if (a.beard !== 'stubble') poly(ctx, [cx - 6, headY + 10, cx + 6, headY + 10, cx + 4, headY + 8.5, cx - 4, headY + 8.5], shade(bc, -0.1));
  }
  // mouth
  const lip = a.lip && a.lip !== 'none' ? a.lip : shade(skin, -0.28);
  ell(ctx, cx, headY + 11.5, 4, 1.4, lip); px(ctx, cx - 4, headY + 11, 8, 0.8, shade(lip, -0.35));
  if (f) { px(ctx, cx - 5, headY + 10.5, 1, 1, shade(lip, -0.3)); px(ctx, cx + 4, headY + 10.5, 1, 1, shade(lip, -0.3)); }
  // earrings
  if (ear.style === 'jhumka') for (const s of [-1, 1]) { ell(ctx, cx + s * 14, headY + 8, 2, 2, ear.c[0]); poly(ctx, [cx + s * 14 - 4, headY + 15, cx + s * 14 + 4, headY + 15, cx + s * 14, headY + 9], ear.c[0]); for (let k = -3; k <= 3; k += 2) px(ctx, cx + s * 14 + k, headY + 16, 1, 2, shade(ear.c[0], 0.3)); }
  if (ear.style === 'studs') for (const s of [-1, 1]) { px(ctx, cx + s * 14 - 1, headY + 6, 2, 2, ear.c[0]); }
  if (ear.style === 'hoops') for (const s of [-1, 1]) { ctx.strokeStyle = ear.c[0]; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx + s * 14, headY + 11, 3.5, 0, Math.PI * 2); ctx.stroke(); }

  // --- front hair ---
  drawHairFront(ctx, a.hair, cx, headY, hc, hcD, hcL);

  // --- glasses ---
  if (gl.style !== 'none') {
    const frame = gl.c[0], lens = gl.c[1];
    ctx.save();
    for (const s of [-1, 1]) {
      const ex = cx + s * 6;
      if (lens !== 'clear') { ctx.globalAlpha = 0.92; }
      else ctx.globalAlpha = 0.18;
      const lc = lens === 'clear' ? '#dfefff' : lens;
      if (gl.style === 'round') ell(ctx, ex, headY + 2, 5, 4.6, lc);
      else if (gl.style === 'aviator') poly(ctx, [ex - 5, headY - 1, ex + 5, headY - 1, ex + 4, headY + 5, ex, headY + 6, ex - 4, headY + 4], lc);
      else if (gl.style === 'cateye') poly(ctx, [ex - s * 6, headY - 3, ex + s * 5, headY - 1, ex + s * 4, headY + 5, ex - s * 4, headY + 5], lc);
      else rrect(ctx, ex - 5.5, headY - 1.5, 11, 7.5, 1, lc);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = frame; ctx.lineWidth = gl.style === 'round' || gl.style === 'aviator' ? 1 : 1.4;
      ctx.beginPath();
      if (gl.style === 'round') ctx.ellipse(ex, headY + 2, 5, 4.6, 0, 0, Math.PI * 2);
      else if (gl.style === 'aviator') { ctx.moveTo(ex - 5, headY - 1); ctx.lineTo(ex + 5, headY - 1); ctx.lineTo(ex + 4, headY + 5); ctx.lineTo(ex, headY + 6); ctx.lineTo(ex - 4, headY + 4); ctx.closePath(); }
      else if (gl.style === 'cateye') { ctx.moveTo(ex - s * 6, headY - 3); ctx.lineTo(ex + s * 5, headY - 1); ctx.lineTo(ex + s * 4, headY + 5); ctx.lineTo(ex - s * 4, headY + 5); ctx.closePath(); }
      else ctx.rect(ex - 5.5, headY - 1.5, 11, 7.5);
      ctx.stroke();
      if (lens !== 'clear') px(ctx, ex - 3, headY, 2, 1, rgba('#ffffff', 0.6));
      px(ctx, cx + s * 11.5, headY, s * 3, 1, frame); // temples
    }
    px(ctx, cx - 1, headY, 2, 1, frame);
    ctx.restore();
  }
  // --- hats ---
  const hcol = hat.c[0];
  if (hat.style === 'cap') { ell(ctx, cx, headY - 10, 16, 10, hcol); px(ctx, cx - 16, headY - 10, 32, 6, hcol); ell(ctx, cx + 6, headY - 5, 14, 3, shade(hcol, -0.25)); px(ctx, cx - 1, headY - 20, 2, 2, shade(hcol, 0.3)); }
  if (hat.style === 'beanie') { ell(ctx, cx, headY - 10, 16, 12, hcol); px(ctx, cx - 16, headY - 8, 32, 5, shade(hcol, -0.15)); for (let x = -15; x < 16; x += 3) px(ctx, cx + x, headY - 8, 1, 5, shade(hcol, -0.3)); }
  if (hat.style === 'fedora') { ell(ctx, cx, headY - 9, 24, 4, hcol); px(ctx, cx - 13, headY - 22, 26, 13, hcol); px(ctx, cx - 13, headY - 13, 26, 3, '#2a1a10'); ell(ctx, cx, headY - 22, 13, 3, shade(hcol, -0.2)); }
  if (hat.style === 'sunhat') { ell(ctx, cx, headY - 8, 30, 6, hcol); ell(ctx, cx, headY - 14, 14, 9, hcol); px(ctx, cx - 14, headY - 12, 28, 3, '#c0283a'); }
}

function drawHairFront(ctx, h, cx, hy, hc, hcD, hcL) {
  const cap = (ry = 11, yo = 0) => { ctx.save(); ctx.beginPath(); ctx.ellipse(cx, hy - 2 + yo, 15.5, 17.5, 0, Math.PI, 0); ctx.fillStyle = hc; ctx.fill(); ctx.restore(); };
  switch (h) {
    case 'swept': // voluminous swept-back hair from the photo
      ell(ctx, cx, hy - 12, 17, 11, hc); ell(ctx, cx + 4, hy - 17, 14, 8, hc); ell(ctx, cx - 7, hy - 14, 9, 7, hc);
      poly(ctx, [cx - 16, hy - 8, cx - 13, hy + 2, cx - 11, hy - 6], hc); poly(ctx, [cx + 16, hy - 8, cx + 14, hy + 2, cx + 11, hy - 6], hc);
      poly(ctx, [cx - 12, hy - 9, cx + 13, hy - 10, cx + 18, hy - 4, cx + 6, hy - 6, cx - 8, hy - 5], hc);
      for (let i = 0; i < 6; i++) px(ctx, cx - 8 + i * 4, hy - 20 + (i % 2), 3, 1, hcL);
      px(ctx, cx + 6, hy - 16, 6, 1, hcL); px(ctx, cx - 4, hy - 9, 10, 1, hcD);
      break;
    case 'short': cap(); px(ctx, cx - 14, hy - 8, 28, 4, hc); px(ctx, cx - 6, hy - 16, 12, 1, hcL); break;
    case 'buzz': ctx.save(); ctx.globalAlpha = 0.85; cap(); ctx.restore(); px(ctx, cx - 13, hy - 10, 26, 2, hcD); break;
    case 'curly':
      for (let i = 0; i < 9; i++) ell(ctx, cx - 14 + i * 3.5, hy - 12 - Math.sin(i) * 4, 5, 5, i % 2 ? hc : hcD);
      ell(ctx, cx, hy - 16, 13, 7, hc); for (let i = 0; i < 6; i++) ell(ctx, cx - 10 + i * 4, hy - 20, 2, 2, hcL);
      px(ctx, cx - 15, hy - 8, 3, 8, hc); px(ctx, cx + 12, hy - 8, 3, 8, hc);
      break;
    case 'long': case 'wavy': case 'braid':
      cap();
      poly(ctx, [cx - 1, hy - 19, cx - 16, hy - 6, cx - 18, hy + 22, cx - 13, hy + 30, cx - 12, hy - 2], hc);
      poly(ctx, [cx + 1, hy - 19, cx + 16, hy - 6, cx + 18, hy + (h === 'braid' ? 6 : 22), cx + 13, hy + (h === 'braid' ? 8 : 30), cx + 12, hy - 2], hc);
      px(ctx, cx - 1, hy - 19, 1, 8, hcD); // centre parting
      for (let k = 0; k < 4; k++) { px(ctx, cx - 14 + k, hy - 4 + k * 8, 1, 6, hcL); px(ctx, cx + 13 - k, hy - 4 + k * 8, 1, 6, hcL); }
      if (h === 'braid') for (let k = 0; k < 8; k++) ell(ctx, cx - 16 + (k % 2), hy + 18 + k * 6, 3.5, 3.5, k % 2 ? hc : hcD);
      if (h === 'wavy') for (let k = 0; k < 4; k++) { ell(ctx, cx - 17, hy + 6 + k * 7, 2.5, 3, hcD); ell(ctx, cx + 17, hy + 10 + k * 7, 2.5, 3, hcD); }
      break;
    case 'ponytail': cap(); poly(ctx, [cx - 15, hy - 8, cx + 15, hy - 8, cx + 10, hy - 12, cx - 10, hy - 12], hc); px(ctx, cx + 12, hy - 12, 4, 3, '#c0283a'); px(ctx, cx - 8, hy - 17, 12, 1, hcL); break;
    case 'bun': cap(); ell(ctx, cx, hy - 22, 8, 7, hc); px(ctx, cx - 4, hy - 25, 6, 1, hcL); px(ctx, cx - 14, hy - 8, 28, 3, hc); break;
    case 'bob':
      cap(); poly(ctx, [cx - 16, hy - 8, cx - 17, hy + 14, cx - 10, hy + 15, cx - 11, hy - 4], hc); poly(ctx, [cx + 16, hy - 8, cx + 17, hy + 14, cx + 10, hy + 15, cx + 11, hy - 4], hc);
      poly(ctx, [cx - 14, hy - 8, cx + 14, hy - 8, cx + 12, hy - 3, cx - 12, hy - 3], hc); px(ctx, cx - 6, hy - 16, 10, 1, hcL);
      break;
  }
}

/* ---------------- random NPC appearances ---------------- */
const NPC_TOPS = ITEMS.filter((i) => i.slot === 'top' && i.style !== 'swim').map((i) => i.id);
const NPC_BOTS = ITEMS.filter((i) => i.slot === 'bottom').map((i) => i.id);
const NPC_SHOES = ITEMS.filter((i) => i.slot === 'shoes').map((i) => i.id);
export function randomLook(seed) {
  const r = mulberry(seed);
  const g = r() < 0.5 ? 'f' : 'm';
  const fh = ['long', 'ponytail', 'bun', 'bob', 'braid', 'wavy'], mh = ['short', 'swept', 'buzz', 'curly'];
  let top = pick(r, NPC_TOPS);
  if (g === 'm' && ['top_saree_red', 'top_saree_blue', 'top_dress_red', 'top_dress_floral', 'top_crop_pink', 'top_crop_black'].includes(top)) top = 'top_shirt_blue';
  return {
    gender: g, skin: pick(r, SKIN_TONES.slice(1)), hair: g === 'f' ? pick(r, fh) : pick(r, mh), hairColor: pick(r, HAIR_COLORS.slice(0, 6)),
    eyes: '#3b2414', beard: g === 'm' ? pick(r, ['none', 'none', 'stubble', 'short', 'mustache', 'full']) : 'none',
    lip: g === 'f' ? pick(r, LIP_COLORS) : 'none', liner: g === 'f' && r() < 0.5, blush: false, shadow: 'none', nails: 'none',
    top, bottom: pick(r, NPC_BOTS), shoes: pick(r, NPC_SHOES),
    glasses: r() < 0.25 ? pick(r, ['eye_rect', 'eye_round', 'eye_aviator', 'eye_wayfarer']) : 'eye_none',
    hat: r() < 0.12 ? pick(r, ['hat_cap', 'hat_cap_r', 'hat_fedora']) : 'hat_none',
    earrings: g === 'f' && r() < 0.6 ? pick(r, ['ear_jhumka', 'ear_hoops', 'ear_studs']) : 'ear_none', pin: false,
  };
}
export const uniformLook = (kind) => ({
  police: { gender: 'm', skin: '#8a5a3c', hair: 'short', hairColor: '#141010', eyes: '#3b2414', beard: 'mustache', lip: 'none', liner: false, blush: false, shadow: 'none', nails: 'none', top: 'top_shirt_police', bottom: 'bot_police', shoes: 'sho_boots', glasses: 'eye_none', hat: 'hat_police', earrings: 'ear_none' },
}[kind]);
// police uniform items (white uniform of Kolkata Police)
ITEM.top_shirt_police = { id: 'top_shirt_police', slot: 'top', style: 'shirt', c: ['#f2f2ee', '#c9c9c0', '#2a2a2a'] };
ITEM.bot_police = { id: 'bot_police', slot: 'bottom', style: 'trousers', c: ['#f2f2ee', '#c9c9c0'] };
ITEM.hat_police = { id: 'hat_police', slot: 'hat', style: 'cap', c: ['#f2f2ee'] };
ITEM.top_waiter = { id: 'top_waiter', slot: 'top', style: 'waistcoat', c: ['#ffffff', '#7a1f2b', '#1a1a1a'] };
export const HAIR_LIST = HAIR_STYLES;
