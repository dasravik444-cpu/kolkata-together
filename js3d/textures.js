// Procedural PBR-ish textures painted on canvas (no external image files).
import * as THREE from 'three';
import { mulberry, shade, mix } from '../js/util.js';

let MAX_ANISO = 4;
export function setAniso(n) { MAX_ANISO = n; }

export function cv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function toTex(c, { srgb = true, repeat = true, mips = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = MAX_ANISO; t.generateMipmaps = mips;
  if (!mips) t.minFilter = THREE.LinearFilter;
  return t;
}

/* ---------------------------- noise ---------------------------- */
function valueNoise(w, h, cell, seed) {
  const r = mulberry(seed); const gw = Math.ceil(w / cell) + 1, gh = Math.ceil(h / cell) + 1;
  const g = new Float32Array(gw * gh).map(() => r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = x / cell, gy = y / cell, x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const i = y0 * gw + x0; const gx1 = (x0 + 1) % gw === 0 ? i - x0 : i + 1;
    const a = g[i], b = g[gx1], c = g[i + gw] ?? a, d = g[gx1 + gw] ?? b;
    out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  return out;
}
// tileable fractal noise (wraps by sampling a torus of value grids)
export function fbm(w, h, seed, base = 32, oct = 4) {
  const out = new Float32Array(w * h); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const cell = Math.max(2, base >> o);
    const n = tileNoise(w, h, cell, seed + o * 97);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
function tileNoise(w, h, cell, seed) {
  const r = mulberry(seed); const gw = Math.max(1, Math.round(w / cell)), gh = Math.max(1, Math.round(h / cell));
  const g = new Float32Array(gw * gh).map(() => r());
  const out = new Float32Array(w * h); const cx = w / gw, cy = h / gh;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = x / cx, gy = y / cy, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const X0 = x0 % gw, X1 = (x0 + 1) % gw, Y0 = y0 % gh, Y1 = (y0 + 1) % gh;
    const a = g[Y0 * gw + X0], b = g[Y0 * gw + X1], c = g[Y1 * gw + X0], d = g[Y1 * gw + X1];
    out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  return out;
}
void valueNoise;
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// paint noise-modulated colour into an ImageData
function noiseFill(g, w, h, colA, colB, n, contrast = 1) {
  const img = g.getImageData(0, 0, w, h), d = img.data; const A = hex(colA), B = hex(colB);
  for (let i = 0; i < w * h; i++) { const t = Math.min(1, Math.max(0, (n[i] - 0.5) * contrast + 0.5)); d[i * 4] = A[0] + (B[0] - A[0]) * t; d[i * 4 + 1] = A[1] + (B[1] - A[1]) * t; d[i * 4 + 2] = A[2] + (B[2] - A[2]) * t; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}
function speckle(g, w, h, n, cols, size = 1, seed = 1) { const r = mulberry(seed); for (let i = 0; i < n; i++) { g.fillStyle = cols[(r() * cols.length) | 0]; const s = size * (0.5 + r()); g.fillRect(r() * w, r() * h, s, s); } }
export function normalFromCanvas(c, strength = 2) {
  const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const out = cv(w, h), og = out.getContext('2d'), img = og.createImageData(w, h), d = img.data;
  const L = (x, y) => { x = (x + w) % w; y = (y + h) % h; const i = (y * w + x) * 4; return (src[i] + src[i + 1] + src[i + 2]) / 765; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x + 1, y) - L(x - 1, y)) * strength, dy = (L(x, y + 1) - L(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1); const i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  og.putImageData(img, 0, 0); return out;
}

/* ---------------------------- ground ---------------------------- */
const S = 256; // pixels per 2 m tile
const groundCache = {};
function asphalt(seed = 1) {
  const c = cv(S), g = c.getContext('2d');
  noiseFill(g, S, S, '#3a3b40', '#55565c', fbm(S, S, seed, 64, 5), 1.6);
  speckle(g, S, S, 1400, ['#6a6b70', '#2a2b2f', '#77777c', '#45464b'], 1.4, seed);
  const r = mulberry(seed + 5);
  for (let k = 0; k < 2; k++) { g.fillStyle = `rgba(20,20,24,${0.12 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * S, r() * S, 20 + r() * 40, 10 + r() * 20, r() * 3, 0, 7); g.fill(); }
  return c;
}
function paint(c, fn) { fn(c.getContext('2d')); return c; }
function worn(g, x, y, w, h, col, seed) {
  g.fillStyle = col; g.fillRect(x, y, w, h);
  const r = mulberry(seed); g.fillStyle = 'rgba(60,60,64,0.55)';
  for (let i = 0; i < w * h / 30; i++) g.fillRect(x + r() * w, y + r() * h, 2, 2);
}
export function groundTexture(kind) {
  if (groundCache[kind]) return groundCache[kind];
  let c;
  switch (kind) {
    case 'road': c = asphalt(3); break;
    case 'dashH': c = paint(asphalt(4), (g) => worn(g, 30, S / 2 - 10, S - 60, 20, '#eeeeea', 4)); break;
    case 'dashV': c = paint(asphalt(5), (g) => worn(g, S / 2 - 10, 30, 20, S - 60, '#eeeeea', 5)); break;
    case 'laneH': c = paint(asphalt(6), (g) => { worn(g, 0, S / 2 - 22, S, 14, '#e8c03a', 6); worn(g, 0, S / 2 + 8, S, 14, '#e8c03a', 7); }); break;
    case 'laneV': c = paint(asphalt(7), (g) => { worn(g, S / 2 - 22, 0, 14, S, '#e8c03a', 8); worn(g, S / 2 + 8, 0, 14, S, '#e8c03a', 9); }); break;
    case 'zebraH': c = paint(asphalt(8), (g) => { for (let i = 0; i < 4; i++) worn(g, i * 64 + 14, 6, 36, S - 12, '#f0f0ec', 10 + i); }); break;
    case 'zebraV': c = paint(asphalt(9), (g) => { for (let i = 0; i < 4; i++) worn(g, 6, i * 64 + 14, S - 12, 36, '#f0f0ec', 20 + i); }); break;
    case 'tram': c = paint(asphalt(10), (g) => { for (const y of [60, 196]) { g.fillStyle = '#2a2a2e'; g.fillRect(0, y - 8, S, 16); g.fillStyle = '#b8bcc4'; g.fillRect(0, y - 3, S, 6); } }); break;
    case 'bridge': { c = cv(S); const g = c.getContext('2d'); noiseFill(g, S, S, '#8a8b90', '#a4a5aa', fbm(S, S, 11, 32, 4), 1.2); g.fillStyle = '#6a6b70'; for (let x = 0; x < S; x += 64) g.fillRect(x, 0, 3, S); break; }
    case 'sidewalk': {
      c = cv(S); const g = c.getContext('2d'); noiseFill(g, S, S, '#a9a49a', '#c8c3b8', fbm(S, S, 12, 32, 4), 1.4);
      const r = mulberry(12);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = (r() - 0.5) * 0.12; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
      g.fillStyle = '#7d786f'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 1, 0, 3, S); g.fillRect(0, i * 64 - 1, S, 3); }
      speckle(g, S, S, 500, ['#8a857b', '#d8d3c8'], 1.5, 13);
      g.fillStyle = 'rgba(60,50,40,0.15)'; g.beginPath(); g.ellipse(170, 90, 40, 18, 0.4, 0, 7); g.fill();
      break;
    }
    case 'grass': case 'tallgrass': case 'flowers': case 'pitchA': case 'pitchB': case 'fairway': case 'green': {
      c = cv(S); const g = c.getContext('2d');
      const pal = { grass: ['#3f7a2a', '#6aa43c'], tallgrass: ['#356a24', '#5a9432'], flowers: ['#3f7a2a', '#6aa43c'], pitchA: ['#3f8a2e', '#5aa63e'], pitchB: ['#4c9a36', '#68b448'], fairway: ['#4a9a34', '#70b84a'], green: ['#5aae3e', '#7cc858'] }[kind];
      noiseFill(g, S, S, pal[0], pal[1], fbm(S, S, kind.length * 7, 64, 5), 1.5);
      const r = mulberry(kind.length * 13); const blades = kind === 'tallgrass' ? 2600 : 1800;
      for (let i = 0; i < blades; i++) { const x = r() * S, y = r() * S, l = (kind === 'tallgrass' ? 10 : 5) + r() * 6; g.strokeStyle = r() < 0.5 ? shade(pal[1], 0.12 + r() * 0.15) : shade(pal[0], -0.2); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - l); g.stroke(); }
      if (kind === 'flowers') for (let i = 0; i < 40; i++) { g.fillStyle = ['#f05a7a', '#ffd94a', '#ffffff', '#ff9a3c', '#c86af0'][(r() * 5) | 0]; const x = r() * S, y = r() * S; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 3, y + Math.sin(p * 1.26) * 3, 2.6, 0, 7); g.fill(); } g.fillStyle = '#ffe680'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
      break;
    }
    case 'pitchLine': { c = cv(S); const g = c.getContext('2d'); g.drawImage(groundTexture('pitchA').image, 0, 0); g.fillStyle = '#f2f2ee'; g.fillRect(0, S / 2 - 8, S, 16); break; }
    case 'path': case 'dirt': case 'track': case 'sand': {
      c = cv(S); const g = c.getContext('2d');
      const pal = { path: ['#b8a070', '#d8c498'], dirt: ['#8a6a42', '#b08a5a'], track: ['#8a5a36', '#b07a4c'], sand: ['#d8c288', '#f0e0b0'] }[kind];
      noiseFill(g, S, S, pal[0], pal[1], fbm(S, S, kind.length * 31, 64, 5), 1.4);
      speckle(g, S, S, 1600, [shade(pal[0], -0.25), shade(pal[1], 0.15), '#ffffff22'], 1.6, kind.length);
      break;
    }
    case 'plaza': {
      c = cv(S); const g = c.getContext('2d'); noiseFill(g, S, S, '#b9ad94', '#d8ccb2', fbm(S, S, 41, 32, 4), 1.3);
      const r = mulberry(41); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.08})`; g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122); }
      g.fillStyle = '#8f8570'; for (let i = 0; i <= 2; i++) { g.fillRect(i * 128 - 2, 0, 4, S); g.fillRect(0, i * 128 - 2, S, 4); }
      break;
    }
    case 'marble': {
      c = cv(S); const g = c.getContext('2d'); noiseFill(g, S, S, '#e4e0d8', '#fbf9f4', fbm(S, S, 51, 64, 5), 1.2);
      const r = mulberry(51); g.strokeStyle = 'rgba(150,145,140,0.35)'; g.lineWidth = 1.3;
      for (let k = 0; k < 6; k++) { g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let s = 0; s < 8; s++) { x += (r() - 0.3) * 40; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = '#c8c2b8'; g.fillRect(0, 0, S, 2); g.fillRect(0, 0, 2, S);
      break;
    }
    case 'deck': { c = cv(S); const g = c.getContext('2d'); noiseFill(g, S, S, '#7a5232', '#a8744a', fbm(S, S, 61, 16, 3), 1.2); for (let y = 0; y < S; y += 32) { g.fillStyle = '#4a3020'; g.fillRect(0, y, S, 3); } break; }
    case 'poolTile': { c = cv(S); const g = c.getContext('2d'); g.fillStyle = '#4ab8e0'; g.fillRect(0, 0, S, S); g.fillStyle = '#7ad0f0'; for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) g.fillRect(x + 2, y + 2, 28, 28); break; }
    default: c = asphalt(99);
  }
  return (groundCache[kind] = toTex(c));
}
const nrmCache = {};
export function groundNormal(kind) {
  if (nrmCache[kind]) return nrmCache[kind];
  const t = groundTexture(kind); const n = toTex(normalFromCanvas(t.image, kind === 'sidewalk' || kind === 'plaza' ? 3 : 1.6), { srgb: false });
  return (nrmCache[kind] = n);
}
export function interiorFloor(kind, pal = {}) {
  const key = kind + JSON.stringify(pal);
  if (groundCache[key]) return groundCache[key];
  const c = cv(S), g = c.getContext('2d');
  switch (kind) {
    case 'wood': case 'darkwood': {
      const base = kind === 'darkwood' ? '#4a2e1c' : (pal.wood || '#b07a45');
      for (let y = 0; y < S; y += 32) { const n = fbm(S, 32, y + 7, 64, 3); const img = g.createImageData(S, 32); const A = hex(shade(base, -0.15)), B = hex(shade(base, 0.12)); for (let i = 0; i < S * 32; i++) { const t = n[i]; img.data.set([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, 255], i * 4); } g.putImageData(img, (y / 32 % 2) * 64 - 64, y); g.putImageData(img, (y / 32 % 2) * 64 + S - 64, y); g.fillStyle = shade(base, -0.45); g.fillRect(0, y, S, 2); g.fillRect(((y * 7) % S), y, 2, 32); }
      break;
    }
    case 'checker': for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? (pal.c1 || '#2a2a30') : (pal.c2 || '#f2f2f2'); g.fillRect(x * 64, y * 64, 64, 64); } speckle(g, S, S, 300, ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.08)'], 2, 3); break;
    case 'carpet': noiseFill(g, S, S, shade(pal.carpet || '#7a1f2b', -0.15), shade(pal.carpet || '#7a1f2b', 0.1), fbm(S, S, 71, 8, 3), 1.5); g.strokeStyle = shade(pal.carpet || '#7a1f2b', 0.3); g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(128, 128, 30 + k * 26, 0, 7); g.stroke(); } break;
    case 'imarble': return groundTexture('marble');
    case 'mall': noiseFill(g, S, S, '#dcd8d2', '#f4f2ee', fbm(S, S, 81, 64, 4), 1); g.fillStyle = '#c4beb4'; g.fillRect(0, 0, S, 2); g.fillRect(0, 0, 2, S); break;
    case 'pink': for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#f2d2da' : '#fdf6f8'; g.fillRect(x * 64, y * 64, 64, 64); } break;
    case 'tileblue': g.fillStyle = '#d4eaf2'; g.fillRect(0, 0, S, S); g.fillStyle = '#b4d0dc'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64, 0, 2, S); g.fillRect(0, i * 64, S, 2); } break;
    case 'rug': g.fillStyle = pal.rug || '#7a1f2b'; g.fillRect(0, 0, S, S); g.strokeStyle = pal.rug2 || '#e3b341'; g.lineWidth = 8; g.strokeRect(16, 16, S - 32, S - 32); g.beginPath(); g.arc(128, 128, 50, 0, 7); g.stroke(); break;
    case 'stage': noiseFill(g, S, S, '#2a1e38', '#3c2c50', fbm(S, S, 91, 32, 3), 1); break;
    default: return groundTexture(kind);
  }
  return (groundCache[key] = toTex(c));
}

/* ---------------------------- facades ---------------------------- */
// One texture = 4 bays x 2 floors; each bay ~3.2 m wide, floor 3.4 m tall.
export const BAY_W = 3.2, FLOOR_H = 3.4;
const facadeCache = {};
export function facade(style, wall, seed = 1, shutter = '#3f7a4a') {
  const key = [style, wall, seed % 5, shutter].join('|');
  if (facadeCache[key]) return facadeCache[key];
  const W = 512, H = 512, bw = W / 4, fh = H / 2;
  const c = cv(W, H), g = c.getContext('2d'), e = cv(W, H), eg = e.getContext('2d');
  eg.fillStyle = '#000'; eg.fillRect(0, 0, W, H);
  const r = mulberry(seed * 77 + style.length);
  const glass = style === 'tower' || style === 'mall';
  if (glass) {
    const base = style === 'mall' ? '#8fb4cc' : '#5a86a8';
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, shade(base, 0.35)); sky.addColorStop(0.5, base); sky.addColorStop(1, shade(base, -0.35));
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let f = 0; f < 2; f++) for (let b = 0; b < 4; b++) {
      const x = b * bw, y = f * fh;
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(x + 10, y + 10); g.lineTo(x + 50, y + 10); g.lineTo(x + 10, y + 80); g.fill();
      g.fillStyle = style === 'mall' ? '#d8dce2' : '#2e3a46'; g.fillRect(x, y, 6, fh); g.fillRect(x, y + fh - 18, bw, 18); g.fillRect(x + bw / 2 - 2, y, 4, fh - 18);
      if (r() < 0.45) { eg.fillStyle = r() < 0.5 ? '#ffe4a8' : '#cfe4ff'; eg.fillRect(x + 8, y + 8, bw - 16, fh - 30); eg.fillStyle = '#000'; eg.fillRect(x + bw / 2 - 2, y, 4, fh); }
    }
  } else {
    const n = fbm(W, H, seed * 3 + 1, 64, 5);
    noiseFill(g, W, H, shade(wall, -0.1), shade(wall, 0.06), n, 1.3);
    if (style === 'brick') { for (let y = 0; y < H; y += 12) for (let x = (y / 12) % 2 ? 0 : 14; x < W; x += 28) { g.fillStyle = `rgba(${90 + r() * 40},${30 + r() * 20},20,0.35)`; g.fillRect(x, y, 26, 10); } g.fillStyle = 'rgba(230,220,200,0.25)'; for (let y = 0; y < H; y += 12) g.fillRect(0, y + 10, W, 2); }
    for (let f = 0; f < 2; f++) {
      const y = f * fh;
      // cornice / floor band
      g.fillStyle = shade(wall, 0.18); g.fillRect(0, y + fh - 16, W, 8); g.fillStyle = shade(wall, -0.3); g.fillRect(0, y + fh - 8, W, 4);
      for (let b = 0; b < 4; b++) {
        const x = b * bw, wx = x + 34, wy = y + 30, ww = bw - 68, wh = fh - 70;
        const arched = style === 'colonial';
        // window recess
        g.fillStyle = shade(wall, -0.35); g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
        if (arched) { g.beginPath(); g.arc(wx + ww / 2, wy, ww / 2 + 4, Math.PI, 0); g.fill(); }
        const lit = r() < 0.4;
        const glassG = g.createLinearGradient(0, wy, 0, wy + wh); glassG.addColorStop(0, '#6a8aa4'); glassG.addColorStop(1, '#22303c');
        g.fillStyle = glassG; g.fillRect(wx, wy, ww, wh); if (arched) { g.beginPath(); g.arc(wx + ww / 2, wy, ww / 2, Math.PI, 0); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(wx + 4, wy + 4, ww * 0.35, wh * 0.4);
        g.fillStyle = '#e8e2d6'; g.fillRect(wx + ww / 2 - 2, wy, 4, wh); g.fillRect(wx, wy + wh * 0.45, ww, 4);
        if (lit) { eg.fillStyle = r() < 0.7 ? '#ffd890' : '#bfe0ff'; eg.fillRect(wx, wy, ww, wh); if (arched) { eg.beginPath(); eg.arc(wx + ww / 2, wy, ww / 2, Math.PI, 0); eg.fill(); } eg.fillStyle = '#000'; eg.fillRect(wx + ww / 2 - 2, wy, 4, wh); eg.fillRect(wx, wy + wh * 0.45, ww, 4); }
        // green louvered shutters (half the windows open)
        if (style !== 'brick' && r() < 0.8) {
          const open = r() < 0.6; const sw = ww / 2;
          const draw = (sx) => { g.fillStyle = shutter; g.fillRect(sx, wy, sw, wh); g.fillStyle = shade(shutter, -0.35); for (let ly = wy + 4; ly < wy + wh; ly += 6) g.fillRect(sx + 2, ly, sw - 4, 2); g.fillStyle = shade(shutter, 0.2); g.fillRect(sx, wy, 2, wh); };
          if (open) { draw(wx - sw - 2); draw(wx + ww + 2); } else if (r() < 0.5) { draw(wx); draw(wx + sw); if (lit) { eg.fillStyle = 'rgba(0,0,0,0.7)'; eg.fillRect(wx, wy, ww, wh); } }
        }
        // sill + balcony railing on some
        g.fillStyle = shade(wall, 0.25); g.fillRect(wx - 8, wy + wh + 2, ww + 16, 6);
        if (style === 'house' && r() < 0.5) { g.fillStyle = '#3a2e28'; g.fillRect(wx - 12, wy + wh - 26, ww + 24, 4); for (let k = wx - 12; k < wx + ww + 12; k += 7) g.fillRect(k, wy + wh - 26, 2, 34); g.fillRect(wx - 12, wy + wh + 6, ww + 24, 4); }
        // window AC unit
        if (r() < 0.25) { g.fillStyle = '#d8d8d4'; g.fillRect(wx + ww - 30, wy + wh - 24, 34, 22); g.fillStyle = '#9a9a96'; for (let k = 0; k < 4; k++) g.fillRect(wx + ww - 28, wy + wh - 20 + k * 5, 30, 2); }
        // damp stain streaks (monsoon weathering)
        const st = g.createLinearGradient(0, wy + wh, 0, wy + wh + 60); st.addColorStop(0, 'rgba(40,40,30,0.28)'); st.addColorStop(1, 'rgba(40,40,30,0)');
        g.fillStyle = st; g.fillRect(wx + r() * 10, wy + wh + 8, ww * (0.3 + r() * 0.6), 60);
      }
    }
    // overall grime
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0.12)'); gr.addColorStop(0.1, 'rgba(0,0,0,0)'); gr.addColorStop(0.9, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,30,20,0.18)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  const map = toTex(c), em = toTex(e);
  return (facadeCache[key] = { map, emissive: em, glass });
}
export function shopfront(wall, awning, seed = 1) {
  const key = 'shop|' + wall + awning + seed % 3;
  if (facadeCache[key]) return facadeCache[key];
  const W = 512, H = 256, c = cv(W, H), g = c.getContext('2d'), e = cv(W, H), eg = e.getContext('2d');
  noiseFill(g, W, H, shade(wall, -0.2), shade(wall, -0.05), fbm(W, H, seed + 9, 32, 4), 1.2);
  eg.fillStyle = '#000'; eg.fillRect(0, 0, W, H);
  for (let b = 0; b < 4; b++) {
    const x = b * 128;
    g.fillStyle = '#26221e'; g.fillRect(x + 10, 60, 108, 196);
    const sg = g.createLinearGradient(0, 70, 0, 256); sg.addColorStop(0, '#8aa8bc'); sg.addColorStop(1, '#3a4a56'); g.fillStyle = sg; g.fillRect(x + 16, 70, 96, 186);
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x + 20, 74, 30, 90);
    const r = mulberry(seed * 3 + b); for (let k = 0; k < 6; k++) { g.fillStyle = ['#c0283a', '#2a6ac0', '#e3b341', '#3a8a4a', '#f2f2f2'][(r() * 5) | 0]; g.fillRect(x + 22 + k * 15, 170 + r() * 30, 10, 50); }
    eg.fillStyle = '#ffe0a0'; eg.fillRect(x + 16, 70, 96, 186);
    // rolling shutter box
    g.fillStyle = '#7a7a76'; g.fillRect(x + 10, 50, 108, 12); for (let k = 0; k < 3; k++) { g.fillStyle = '#5a5a56'; g.fillRect(x + 10, 52 + k * 4, 108, 1); }
  }
  // awning stripes at the top
  for (let k = 0; k < W; k += 32) { g.fillStyle = (k / 32) % 2 ? awning : '#f2f2ee'; g.fillRect(k, 0, 32, 46); }
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 44, W, 4);
  return (facadeCache[key] = { map: toTex(c), emissive: toTex(e) });
}
export function roofTexture(col = '#8a8478') {
  if (facadeCache['roof' + col]) return facadeCache['roof' + col];
  const c = cv(256), g = c.getContext('2d'); noiseFill(g, 256, 256, shade(col, -0.25), shade(col, 0.05), fbm(256, 256, 101, 32, 5), 1.6);
  speckle(g, 256, 256, 500, ['rgba(0,0,0,0.2)', 'rgba(255,255,255,0.1)'], 2, 7);
  return (facadeCache['roof' + col] = toTex(c));
}

/* ---------------------------- signs, water, misc ---------------------------- */
export function signTexture(text, bg = '#1d1b20', fg = '#ffd94a', neon = false) {
  const key = 'sign|' + text + bg + fg;
  if (facadeCache[key]) return facadeCache[key];
  const c = cv(512, 128), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128); grad.addColorStop(0, shade(bg, 0.15)); grad.addColorStop(1, shade(bg, -0.2));
  g.fillStyle = grad; g.fillRect(0, 0, 512, 128); g.strokeStyle = shade(bg, 0.4); g.lineWidth = 6; g.strokeRect(3, 3, 506, 122);
  let fs = 74; g.font = `800 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`;
  while (g.measureText(text).width > 470 && fs > 20) { fs -= 4; g.font = `800 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (neon) { g.shadowColor = fg; g.shadowBlur = 18; }
  g.fillStyle = fg; g.fillText(text, 256, 68);
  const t = toTex(c, { repeat: false });
  return (facadeCache[key] = t);
}
export function waterNormal() {
  if (facadeCache.water) return facadeCache.water;
  const c = cv(256), g = c.getContext('2d'); noiseFill(g, 256, 256, '#000000', '#ffffff', fbm(256, 256, 7, 32, 5), 1.2);
  return (facadeCache.water = toTex(normalFromCanvas(c, 5), { srgb: false }));
}
export function barkTexture() {
  if (facadeCache.bark) return facadeCache.bark;
  const c = cv(128), g = c.getContext('2d'); noiseFill(g, 128, 128, '#3a2a1c', '#6a5038', fbm(128, 128, 3, 8, 3), 1.6);
  for (let x = 0; x < 128; x += 9) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, 0, 2, 128); }
  return (facadeCache.bark = toTex(c));
}
export function leafTexture(col = '#3f7a2a') {
  const key = 'leaf' + col; if (facadeCache[key]) return facadeCache[key];
  const c = cv(128), g = c.getContext('2d'); noiseFill(g, 128, 128, shade(col, -0.3), shade(col, 0.2), fbm(128, 128, 5, 8, 4), 2);
  return (facadeCache[key] = toTex(c));
}
export function pattern(kind, a, b) {
  const key = 'pat|' + kind + a + b; if (facadeCache[key]) return facadeCache[key];
  const c = cv(128), g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, 128, 128);
  if (kind === 'pinstripe') { g.fillStyle = b; for (let x = 0; x < 128; x += 8) g.fillRect(x, 0, 1.5, 128); }
  if (kind === 'stripes') { g.fillStyle = b; for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 14, 128); }
  if (kind === 'tiger') { g.fillStyle = b; for (let x = 0; x < 128; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, 0); g.lineTo(x + 4, 128); g.lineTo(x - 2, 128); g.fill(); } }
  if (kind === 'spots') { const r = mulberry(4); g.fillStyle = b; for (let k = 0; k < 18; k++) { g.beginPath(); g.ellipse(r() * 128, r() * 128, 8 + r() * 6, 6 + r() * 5, r() * 3, 0, 7); g.fill(); } }
  if (kind === 'crinkle') { const n = fbm(128, 128, 9, 8, 3); noiseFill(g, 128, 128, shade(a, -0.12), shade(a, 0.1), n, 2); g.strokeStyle = shade(a, -0.2); g.lineWidth = 1; for (let k = -128; k < 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 128, 128); g.stroke(); g.beginPath(); g.moveTo(k + 128, 0); g.lineTo(k, 128); g.stroke(); } }
  if (kind === 'denim') { const n = fbm(128, 128, 11, 4, 2); noiseFill(g, 128, 128, shade(a, -0.15), shade(a, 0.12), n, 2); }
  if (kind === 'zari') { g.fillStyle = b; for (let x = 4; x < 128; x += 16) for (let y = 4; y < 128; y += 16) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); } }
  if (kind === 'football') { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#111'; for (const [x, y] of [[32, 32], [96, 32], [64, 80], [16, 100], [112, 100]]) { g.beginPath(); for (let k = 0; k < 5; k++) g.lineTo(x + Math.cos(k * 1.257) * 12, y + Math.sin(k * 1.257) * 12); g.fill(); } }
  return (facadeCache[key] = toTex(c));
}

/* ---------------------------- faces ---------------------------- */
// Painted onto the front of a sphere head (face centred at u = 0.25).
export function faceTexture(a) {
  const key = 'face|' + [a.skin, a.eyes, a.lip, a.liner, a.blush, a.shadow, a.beard, a.hairColor, a.gender].join(',');
  if (facadeCache[key]) return facadeCache[key];
  const W = 512, H = 256, c = cv(W, H), g = c.getContext('2d');
  const skin = a.skin; g.fillStyle = skin; g.fillRect(0, 0, W, H);
  const n = fbm(W, H, 3, 32, 3); const img = g.getImageData(0, 0, W, H); for (let i = 0; i < W * H; i++) { const v = (n[i] - 0.5) * 10; img.data[i * 4] += v; img.data[i * 4 + 1] += v; img.data[i * 4 + 2] += v; } g.putImageData(img, 0, 0);
  const cx = W * 0.25, f = a.gender === 'f';
  const U = (du) => cx + du * W; // du in u units
  // cheeks / jaw shading
  const sh = g.createRadialGradient(cx, H * 0.55, 10, cx, H * 0.55, 90); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,30,20,0.18)'); g.fillStyle = sh; g.fillRect(cx - 120, 40, 240, 200);
  if (a.blush) { g.fillStyle = 'rgba(230,110,120,0.28)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(U(s * 0.07), H * 0.6, 16, 9, 0, 0, 7); g.fill(); } }
  // eyes
  for (const s of [-1, 1]) {
    const ex = U(s * 0.052), ey = H * 0.5;
    if (a.shadow && a.shadow !== 'none') { g.fillStyle = a.shadow + 'aa'; g.beginPath(); g.ellipse(ex, ey - 7, 15, 7, 0, 0, 7); g.fill(); }
    g.fillStyle = '#fbf8f4'; g.beginPath(); g.ellipse(ex, ey, 13, 6.5, 0, 0, 7); g.fill();
    g.fillStyle = a.eyes || '#3b2414'; g.beginPath(); g.arc(ex, ey, 5.8, 0, 7); g.fill();
    g.fillStyle = '#0c0808'; g.beginPath(); g.arc(ex, ey, 2.8, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - 2, ey - 2, 1.5, 0, 7); g.fill();
    g.strokeStyle = '#2a1a16'; g.lineWidth = a.liner ? 2.8 : 1.4; g.beginPath(); g.ellipse(ex, ey, 13, 6.5, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    if (a.liner) { g.beginPath(); g.moveTo(ex + s * 12, ey - 2); g.lineTo(ex + s * 20, ey - 7); g.stroke(); }
    // brows
    g.fillStyle = shade(a.hairColor, -0.1); g.beginPath(); g.moveTo(ex - 14, ey - 13 + (s > 0 ? 2 : 0)); g.quadraticCurveTo(ex, ey - 22, ex + 15, ey - 13 + (s < 0 ? 2 : 0)); g.lineTo(ex + 14, ey - 10); g.quadraticCurveTo(ex, ey - 17, ex - 14, ey - 10); g.fill();
  }
  // nose
  { const ng = g.createLinearGradient(cx - 8, 0, cx + 8, 0); ng.addColorStop(0, 'rgba(0,0,0,0)'); ng.addColorStop(0.7, 'rgba(70,35,20,0.16)'); ng.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = ng; g.fillRect(cx - 8, H * 0.52, 16, H * 0.12); }
  g.fillStyle = shade(skin, -0.35); g.beginPath(); g.arc(cx - 5, H * 0.645, 2, 0, 7); g.arc(cx + 6, H * 0.645, 2, 0, 7); g.fill();
  if (f) { g.fillStyle = '#eef'; g.beginPath(); g.arc(cx - 9, H * 0.63, 1.6, 0, 7); g.fill(); }
  // beard: soft stubble shading with hair speckles (trimmed jawline + moustache)
  if (a.beard && a.beard !== 'none') {
    const bc = a.hairColor; const dens = a.beard === 'stubble' ? 0.35 : a.beard === 'full' ? 0.95 : 0.75;
    const bm = cv(W, H), bg = bm.getContext('2d');
    bg.fillStyle = '#000';
    if (a.beard !== 'mustache') {
      bg.beginPath(); bg.moveTo(U(-0.115), H * 0.5); bg.quadraticCurveTo(U(-0.105), H * 0.9, cx, H * 0.95); bg.quadraticCurveTo(U(0.105), H * 0.9, U(0.115), H * 0.5);
      bg.lineTo(U(0.1), H * 0.52); bg.quadraticCurveTo(U(0.085), H * 0.68, U(0.055), H * 0.66); bg.lineTo(U(-0.055), H * 0.66); bg.quadraticCurveTo(U(-0.085), H * 0.68, U(-0.1), H * 0.52); bg.fill();
      if (a.beard === 'goatee') { bg.globalCompositeOperation = 'destination-out'; bg.fillRect(0, 0, U(-0.04), H); bg.fillRect(U(0.04), 0, W, H); bg.globalCompositeOperation = 'source-over'; }
    }
    bg.beginPath(); bg.ellipse(cx, H * 0.685, 21, 6, 0, 0, 7); bg.fill();
    bg.filter = 'blur(4px)'; bg.drawImage(bm, 0, 0); bg.filter = 'none';
    const tint = cv(W, H), tg = tint.getContext('2d'); tg.fillStyle = bc; tg.fillRect(0, 0, W, H);
    const rr = mulberry(9); tg.fillStyle = shade(bc, -0.4); for (let i = 0; i < 5000; i++) tg.fillRect(cx - 80 + rr() * 160, H * 0.45 + rr() * H * 0.55, 1.4, 2.2);
    tg.globalCompositeOperation = 'destination-in'; tg.drawImage(bm, 0, 0);
    g.globalAlpha = dens; g.drawImage(tint, 0, 0); g.globalAlpha = 1;
  }
  // lips
  const lip = a.lip && a.lip !== 'none' ? a.lip : shade(skin, -0.25);
  g.fillStyle = lip; g.beginPath(); g.ellipse(cx, H * 0.725, 15, 5.5, 0, 0, 7); g.fill();
  g.strokeStyle = shade(lip, -0.4); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 15, H * 0.722); g.quadraticCurveTo(cx, H * 0.735, cx + 15, H * 0.722); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(cx - 3, H * 0.735, 5, 1.5, 0, 0, 7); g.fill();
  const t = toTex(c, { repeat: false });
  return (facadeCache[key] = t);
}
