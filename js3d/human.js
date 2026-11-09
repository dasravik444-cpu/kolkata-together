// Realistic human characters built from MakeHuman's CC0 assets (baked offline into chars/*.bin):
// a skinned body with real topology and skin texture, fitted clothes, hair, eyes, brows and lashes,
// all bound to the same 18-bone skeleton the animation system drives. The player's photo is warped
// onto the head's skin texture so the character wears your real face.
import * as THREE from 'three';

const BASE = new URL('../chars/', import.meta.url).href;
export let MAN = null;
const geoCache = new Map(), texCache = new Map(), loading = new Map(), listeners = new Set();
export function onHumanAsset(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export async function initHumans() {
  if (MAN) return MAN;
  try { MAN = await (await fetch(BASE + 'chars.json')).json(); } catch (e) { console.warn('chars.json missing', e); MAN = null; }
  return MAN;
}
export const humansReady = () => !!MAN;

function parseBin(buf, p) {
  const N = p.n; let o = 0; const take = (bytes) => { const s = buf.slice(o, o + bytes); o += bytes; return s; };
  const pos16 = new Int16Array(take(N * 6)); o += (4 - ((N * 6) % 4)) % 4;
  const pos = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) pos[i] = pos16[i] / 10000;
  const nrm = new Int8Array(take(N * 4)); const uv = new Uint16Array(take(N * 4));
  const si = new Uint8Array(take(N * 4)), sw = new Uint8Array(take(N * 4));
  let orig = null, reg = null;
  if (p.orig) orig = new Uint16Array(take(N * 2));
  if (p.reg) { reg = new Uint8Array(take(N)); o += (4 - (N % 4)) % 4; }
  const idx = p.big ? new Uint32Array(take(p.i * 4)) : new Uint16Array(take(p.i * 2));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(nrm, 4), 3, 0, true));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2, true));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.3);
  g.userData = { orig, reg };
  return g;
}
/** geometry for a part (cached); null while loading (fires onHumanAsset when ready) */
export function partGeo(ck, name) {
  const key = name + '_' + ck; if (geoCache.has(key)) return geoCache.get(key);
  const p = MAN && MAN.chars[ck] && MAN.chars[ck].parts[name]; if (!p) return null;
  if (!loading.has(key)) loading.set(key, fetch(BASE + key + '.bin').then((r) => r.arrayBuffer()).then((b) => { geoCache.set(key, parseBin(b, p)); for (const f of listeners) f(key); }).catch((e) => console.warn('part', key, e)));
  return null;
}
export function preloadParts(list) { return Promise.all(list.map(([ck, n]) => { partGeo(ck, n); return loading.get(n + '_' + ck); })); }
export function tex(file, srgb = true) {
  if (texCache.has(file)) return texCache.get(file);
  const t = new THREE.TextureLoader().load(BASE + file, () => { for (const f of listeners) f(file); });
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.flipY = true;
  texCache.set(file, t); return t;
}
let faceMaps = {};
async function faceMap(ck) {
  if (faceMaps[ck]) return faceMaps[ck];
  const b = await (await fetch(BASE + 'face_' + ck + '.bin')).arrayBuffer(); return (faceMaps[ck] = new Int16Array(b));
}
const imgCache = {};
function loadImg(src) { return imgCache[src] || (imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; })); }

/* ---------------- wardrobe mapping: our catalogue -> MakeHuman meshes ---------------- */
const OUTFIT = {
  m: { waistcoat: 'male_elegantsuit01', blazer: 'male_elegantsuit01', jacket: 'male_worksuit01', shirt: 'male_casualsuit06', tee: 'male_casualsuit02', hoodie: 'male_casualsuit04', jersey: 'male_casualsuit02', kurta: 'male_casualsuit06', punjabi: 'male_casualsuit06', swim: 'male_casualsuit03', crop: 'male_casualsuit02', saree: 'male_casualsuit06', dress: 'male_casualsuit06' },
  f: { waistcoat: 'female_elegantsuit01', blazer: 'female_elegantsuit01', jacket: 'female_elegantsuit01', shirt: 'female_casualsuit02', tee: 'female_casualsuit01', hoodie: 'female_sportsuit01', jersey: 'female_sportsuit01', kurta: 'female_elegantsuit01', punjabi: 'female_casualsuit02', swim: 'female_sportsuit01', crop: 'female_casualsuit01', saree: 'female_elegantsuit01', dress: 'female_elegantsuit01' },
};
const SHOES = { formal: 'shoes03', sneaker: 'shoes06', heels: 'shoes04', boots: 'shoes02', jutti: 'shoes01', sandal: 'shoes01' };
const HAIR = { swept: 'short04', short: 'short01', buzz: 'short02', curly: 'afro01', long: 'long01', ponytail: 'ponytail01', bun: 'bob02', bob: 'bob01', braid: 'braid01', wavy: 'long01' };
const LIGHT = { male_elegantsuit01: 'male_worksuit01', bob01: 'bob02', braid01: 'long01', ponytail01: 'long01', short01: 'short04' };
export function lookParts(app, items, lo) {
  const ck = app.gender === 'f' ? 'f' : 'm';
  const top = items(app.top), bot = items(app.bottom), sho = items(app.shoes);
  const outfit = app.outfit || OUTFIT[ck][top.style] || OUTFIT[ck].tee;
  const shoes = SHOES[sho.style] || 'shoes06';
  const hair = HAIR[app.hair] || (ck === 'f' ? 'long01' : 'short02');
  if (lo) return { ck, outfit: LIGHT[outfit] || outfit, shoes, hair: LIGHT[hair] || hair, top, bot, sho };
  return { ck, outfit, shoes, hair, top, bot, sho };
}

/* ---------------- skin texture with the player's photo face ---------------- */
const skinCache = new Map();
const _avg = new Map();
async function avgColor(img, key) { // mean colour of the face/torso skin area
  if (_avg.has(key)) return _avg.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 64, 64);
  const d = g.getImageData(4, 30, 24, 30).data; let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
  const v = [r / n, gg / n, b / n]; _avg.set(key, v); return v;
}
const hexRGB = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** returns a texture immediately; it is filled in (photo warped onto the face, skin tinted) once images load */
export function skinTexture(ck, app, faceCanvas, skinKey) {
  const key = ck + '|' + (skinKey || '') + '|' + app.skin + '|' + (faceCanvas ? faceCanvas.__id || (faceCanvas.__id = Math.random()) : '') + '|' + (app.beard || '') + '|' + (app.lip || '');
  if (skinCache.has(key)) return skinCache.get(key);
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.flipY = true;
  skinCache.set(key, t);
  (async () => {
    const file = MAN.tex[skinKey || ('skin_' + ck)]; const img = await loadImg(BASE + file);
    const want = hexRGB(app.skin || (ck === 'f' ? '#f2cfb3' : '#9a6446')), have = await avgColor(img, file);
    // tint the whole skin so it matches the requested tone (or the photo's skin)
    g.drawImage(img, 0, 0, S, S);
    const id = g.getImageData(0, 0, S, S), d = id.data; const k = want.map((w, i) => w / have[i]);
    for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] * k[0]); d[i + 1] = Math.min(255, d[i + 1] * k[1]); d[i + 2] = Math.min(255, d[i + 2] * k[2]); }
    g.putImageData(id, 0, 0);
    if (faceCanvas) await warpFace(g, S, ck, faceCanvas);
    else paintMakeup(g, S, ck, app);
    t.needsUpdate = true; for (const f of listeners) f('skin');
  })().catch((e) => console.warn('skin', e));
  return t;
}
// draw the photo onto the face triangles of the UV layout (affine per triangle), feathered at the edges
async function warpFace(g, S, ck, photo) {
  const fm = await faceMap(ck); const n = fm.length / 12;
  const layer = document.createElement('canvas'); layer.width = layer.height = S; const lg = layer.getContext('2d');
  // photo with a soft oval alpha so the jaw/hairline blend into the skin
  const ph = document.createElement('canvas'); ph.width = 300; ph.height = 400; const pg = ph.getContext('2d'); pg.drawImage(photo, 0, 0, 300, 400);
  const m = document.createElement('canvas'); m.width = 300; m.height = 400; const mg = m.getContext('2d');
  // egg-shaped face mask (forehead to chin, cheek to cheek), feathered so it melts into the skin
  mg.filter = 'blur(14px)'; mg.fillStyle = '#000'; const w = 300, h = 400;
  mg.beginPath(); mg.moveTo(w * 0.5, h * 0.07); mg.bezierCurveTo(w * 0.93, h * 0.07, w * 0.9, h * 0.6, w * 0.5, h * 0.93); mg.bezierCurveTo(w * 0.1, h * 0.6, w * 0.07, h * 0.07, w * 0.5, h * 0.07); mg.fill();
  // warp photo and mask separately (both opaque, so overlapping triangle edges leave no seams), then combine
  const mlayer = document.createElement('canvas'); mlayer.width = mlayer.height = S; const mlg = mlayer.getContext('2d');
  const mm = document.createElement('canvas'); mm.width = 300; mm.height = 400; const mmg = mm.getContext('2d'); mmg.fillStyle = '#000'; mmg.fillRect(0, 0, 300, 400);
  mmg.globalCompositeOperation = 'lighter'; mmg.filter = 'invert(1)'; mmg.drawImage(m, 0, 0);
  for (let i = 0; i < n; i++) {
    const o = i * 12; const u = (k) => ((fm[o + k] & 0xffff) / 65535);
    const d = [u(0) * S, (1 - u(1)) * S, u(2) * S, (1 - u(3)) * S, u(4) * S, (1 - u(5)) * S];
    const sx = [fm[o + 6] / 50, fm[o + 7] / 50, fm[o + 8] / 50, fm[o + 9] / 50, fm[o + 10] / 50, fm[o + 11] / 50];
    drawTri(lg, ph, ...sx, ...d); drawTri(mlg, mm, ...sx, ...d);
  }
  const L = lg.getImageData(0, 0, S, S), Mk = mlg.getImageData(0, 0, S, S), ld = L.data, md = Mk.data;
  for (let i = 0; i < ld.length; i += 4) ld[i + 3] = Math.min(ld[i + 3], md[i]);
  lg.putImageData(L, 0, 0);
  g.drawImage(layer, 0, 0);
}
function drawTri(ctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
  // expand destination triangle slightly to hide seams
  const cx = (dx0 + dx1 + dx2) / 3, cy = (dy0 + dy1 + dy2) / 3, e = 0.9;
  const ex = (x, c) => x + Math.sign(x - c) * e;
  ctx.save(); ctx.beginPath(); ctx.moveTo(ex(dx0, cx), ex(dy0, cy)); ctx.lineTo(ex(dx1, cx), ex(dy1, cy)); ctx.lineTo(ex(dx2, cx), ex(dy2, cy)); ctx.closePath(); ctx.clip();
  const den = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1); if (Math.abs(den) < 1e-6) { ctx.restore(); return; }
  const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / den, b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / den;
  const c2 = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / den, d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / den;
  const e2 = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / den, f = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / den;
  ctx.setTransform(a, b, c2, d, e2, f); ctx.drawImage(img, 0, 0); ctx.restore();
}
// no photo: simple painted beard shadow / lip colour using the face map region
async function paintMakeup(g, S, ck, app) {
  if (!(app.beard && app.beard !== 'none') && !(app.lip && app.lip !== 'none')) return;
  const fm = await faceMap(ck); const n = fm.length / 12;
  const lay = document.createElement('canvas'); lay.width = 300; lay.height = 400; const lg = lay.getContext('2d');
  if (app.beard && app.beard !== 'none') {
    const a = { stubble: 0.28, short: 0.6, full: 0.8, goatee: 0.6, mustache: 0.6 }[app.beard] || 0.5; lg.fillStyle = `rgba(20,14,10,${a})`; lg.filter = 'blur(6px)';
    if (app.beard === 'goatee') { lg.beginPath(); lg.ellipse(150, 330, 40, 48, 0, 0, 7); lg.fill(); }
    if (app.beard !== 'goatee') { lg.beginPath(); lg.ellipse(150, 268, 34, 9, 0, 0, 7); lg.fill(); }
    if (app.beard !== 'mustache' && app.beard !== 'goatee') { lg.beginPath(); lg.moveTo(25, 210); lg.quadraticCurveTo(40, 370, 150, 392); lg.quadraticCurveTo(260, 370, 275, 210); lg.lineTo(240, 250); lg.quadraticCurveTo(150, 300, 60, 250); lg.closePath(); lg.fill(); }
  }
  if (app.lip && app.lip !== 'none') { lg.filter = 'blur(2px)'; lg.fillStyle = app.lip; lg.globalAlpha = 0.55; lg.beginPath(); lg.ellipse(150, 296, 30, 9, 0, 0, 7); lg.fill(); lg.globalAlpha = 1; }
  for (let i = 0; i < n; i++) {
    const o = i * 12; const u = (k) => ((fm[o + k] & 0xffff) / 65535);
    drawTri(g, lay, fm[o + 6] / 50, fm[o + 7] / 50, fm[o + 8] / 50, fm[o + 9] / 50, fm[o + 10] / 50, fm[o + 11] / 50, u(0) * S, (1 - u(1)) * S, u(2) * S, (1 - u(3)) * S, u(4) * S, (1 - u(5)) * S);
  }
}

/* ---------------- materials ---------------- */
// crowds: shared skin textures, tinted by material colour (no per-person canvas)
export function crowdSkin(ck, skinHex) {
  const dark = (() => { const [r, g, b] = hexRGB(skinHex || '#c48a63'); return (r + g + b) / 3 < 125; })();
  const key = 'skin' + ck + skinHex; if (matCache.has(key)) return matCache.get(key);
  const file = MAN.tex['skin_' + ck + (dark ? '2' : '')]; const t = tex(file);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, envMapIntensity: 0.4 });
  loadImg(BASE + file).then((img) => avgColor(img, file)).then((have) => { const want = hexRGB(skinHex || '#c48a63'); m.color.setRGB(Math.min(1.6, want[0] / have[0]), Math.min(1.6, want[1] / have[1]), Math.min(1.6, want[2] / have[2]), THREE.SRGBColorSpace); });
  matCache.set(key, m); return m;
}
const matCache = new Map();
export function clothMaterial(name, tinted) {
  const a = MAN.assets[name]; const key = name + (tinted ? 'g' : '');
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ map: tex(tinted && a.gmap ? a.gmap : a.map), roughness: name.startsWith('shoes') ? 0.45 : 0.82, side: THREE.DoubleSide, vertexColors: !!tinted, envMapIntensity: 0.5 });
  if (a.nmap) { m.normalMap = tex(a.nmap, false); m.normalScale.set(0.8, 0.8); }
  matCache.set(key, m); return m;
}
export function hairMaterial(name, color) {
  const key = 'h' + name + color; if (matCache.has(key)) return matCache.get(key);
  const a = MAN.assets[name];
  const m = new THREE.MeshStandardMaterial({ map: tex(a.gmap || a.map), color: new THREE.Color(color).multiplyScalar(1.35), roughness: 0.55, alphaTest: 0.42, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  matCache.set(key, m); return m;
}
export function smallMaterial(name, color, alphaTest = 0.3) {
  const key = 's' + name + color; if (matCache.has(key)) return matCache.get(key);
  const a = MAN.assets[name]; const m = new THREE.MeshStandardMaterial({ map: tex(a.map), color: new THREE.Color(color || '#ffffff'), roughness: 0.6, alphaTest, transparent: false, side: THREE.DoubleSide });
  matCache.set(key, m); return m;
}
/** body index with faces under the clothes removed (avoids poke-through), cached per outfit */
const idxCache = new Map();
export function bodyIndex(ck, part, geo, wear) {
  const key = ck + part + wear.join(','); if (idxCache.has(key)) return idxCache.get(key);
  const del = new Uint8Array(20000);
  for (const w of wear) { const a = MAN.assets[w]; if (a && a.del) for (const [s, e] of a.del) for (let v = s; v <= e; v++) del[v] = 1; }
  const src = geo.index.array, orig = geo.userData.orig, out = [];
  for (let i = 0; i < src.length; i += 3) { const a = src[i], b = src[i + 1], c = src[i + 2]; if (del[orig[a]] && del[orig[b]] && del[orig[c]]) continue; if (part === 'body' && (del[orig[a]] + del[orig[b]] + del[orig[c]]) >= 2) continue; out.push(a, b, c); }
  const attr = new THREE.BufferAttribute(src.length > 65535 * 3 || geo.attributes.position.count > 65535 ? new Uint32Array(out) : new Uint16Array(out), 1);
  idxCache.set(key, attr); return attr;
}
/** per-vertex tint colours for a clothing part from its region map (0 top, 1 bottom, 2 shoes) */
const colCache = new Map();
export function regionColors(geo, key, cols) {
  if (colCache.has(key)) return colCache.get(key);
  const reg = geo.userData.reg, n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  const cc = cols.map((c) => new THREE.Color(c).convertSRGBToLinear ? new THREE.Color(c) : new THREE.Color(c));
  for (let i = 0; i < n; i++) { const c = cc[reg ? reg[i] : 0] || cc[0]; arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  const a = new THREE.BufferAttribute(arr, 3); colCache.set(key, a); return a;
}
