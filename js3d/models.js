// 3D models built from code: people, vehicles, animals, trees, props.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ITEM } from '../js/data.js';
import { mulberry, shade } from '../js/util.js';
import { faceTexture, photoFaceTexture, strandTexture, FACE, pattern, barkTexture, signTexture } from './textures.js';

export const M = 0.125; // metres per sim pixel (16 px tile = 2 m)
const matCache = new Map();
export function mat(col, o = {}) {
  const key = col + JSON.stringify(o);
  if (matCache.has(key)) return matCache.get(key);
  const m = o.physical ? new THREE.MeshPhysicalMaterial({ color: col, ...o.p }) : new THREE.MeshStandardMaterial({ color: col, roughness: o.r ?? 0.7, metalness: o.m ?? 0, ...(o.extra || {}) });
  matCache.set(key, m); return m;
}
const it = (id) => ITEM[id] || { style: 'none', c: [] };

/* ================================ PEOPLE ================================ */
const G = {
  torso: new THREE.CapsuleGeometry(0.16, 0.26, 6, 16), pelvis: new THREE.CapsuleGeometry(0.15, 0.06, 6, 16),
  upper: new THREE.CapsuleGeometry(0.052, 0.22, 4, 10), fore: new THREE.CapsuleGeometry(0.044, 0.2, 4, 10),
  thigh: new THREE.CapsuleGeometry(0.075, 0.33, 4, 12), shin: new THREE.CapsuleGeometry(0.058, 0.34, 4, 10),
  hand: new THREE.SphereGeometry(0.048, 10, 8), head: new THREE.SphereGeometry(0.115, 32, 24), neck: new THREE.CylinderGeometry(0.05, 0.055, 0.1, 12),
  foot: new RoundedBoxGeometry(0.1, 0.08, 0.25, 2, 0.03), ear: new THREE.SphereGeometry(0.018, 8, 6),
};
const lathe = (pts, seg = 28, ps = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, ps, pl);
const TORSO = {
  m: [[0.001, -0.04], [0.13, -0.04], [0.142, 0.04], [0.14, 0.14], [0.152, 0.26], [0.172, 0.38], [0.18, 0.46], [0.176, 0.52], [0.15, 0.565], [0.09, 0.6], [0.05, 0.615], [0.001, 0.62]],
  f: [[0.001, -0.04], [0.135, -0.04], [0.13, 0.06], [0.118, 0.15], [0.13, 0.25], [0.158, 0.35], [0.162, 0.42], [0.158, 0.5], [0.138, 0.55], [0.085, 0.59], [0.048, 0.605], [0.001, 0.61]],
};
const PELVIS = { m: [[0.001, -0.13], [0.1, -0.13], [0.145, -0.07], [0.15, 0.0], [0.135, 0.06], [0.001, 0.06]], f: [[0.001, -0.13], [0.11, -0.13], [0.165, -0.06], [0.17, 0.0], [0.14, 0.07], [0.001, 0.07]] };
const HEAD = [[0.001, -0.125], [0.035, -0.121], [0.06, -0.108], [0.079, -0.085], [0.092, -0.05], [0.1, -0.012], [0.104, 0.028], [0.1, 0.068], [0.086, 0.1], [0.056, 0.122], [0.001, 0.132]];
const shaped = {};
function bodyGeo(kind, gender, o = {}) {
  const k = kind + gender + JSON.stringify(o); if (shaped[k]) return shaped[k];
  let g;
  if (kind === 'torso') g = lathe(TORSO[gender].map(([x, y]) => [x * (o.inflate || 1), y]), 32, o.ps || 0, o.pl || Math.PI * 2);
  if (kind === 'pelvis') g = lathe(PELVIS[gender], 28);
  if (kind === 'head') g = lathe(HEAD, 40, -Math.PI / 2);
  g.computeVertexNormals();
  return (shaped[k] = g);
}
G.torso.translate(0, 0.3, 0);
// sculpted, tapered limbs (shoulder/bicep/wrist, thigh/calf/ankle) — pivots at the top joint
const limb = (pts, sz = 0.86) => { const g = lathe(pts, 18); g.scale(1, 1, sz); g.computeVertexNormals(); return g; };
const LIMBS = {
  m: { upper: limb([[0.001, 0.03], [0.05, 0.01], [0.057, -0.05], [0.054, -0.12], [0.046, -0.22], [0.041, -0.28], [0.001, -0.3]]), fore: limb([[0.001, 0.02], [0.042, 0.0], [0.047, -0.05], [0.043, -0.13], [0.033, -0.23], [0.029, -0.255], [0.001, -0.265]]),
       thigh: limb([[0.001, 0.04], [0.082, 0.01], [0.09, -0.06], [0.083, -0.2], [0.068, -0.36], [0.056, -0.44], [0.001, -0.46]], 0.92), shin: limb([[0.001, 0.02], [0.055, 0.0], [0.061, -0.08], [0.062, -0.14], [0.05, -0.27], [0.036, -0.4], [0.034, -0.44], [0.001, -0.455]], 0.92) },
  f: { upper: limb([[0.001, 0.03], [0.045, 0.01], [0.05, -0.05], [0.047, -0.13], [0.04, -0.22], [0.035, -0.27], [0.001, -0.29]]), fore: limb([[0.001, 0.02], [0.037, 0.0], [0.04, -0.05], [0.036, -0.13], [0.028, -0.22], [0.025, -0.25], [0.001, -0.26]]),
       thigh: limb([[0.001, 0.04], [0.088, 0.01], [0.094, -0.06], [0.085, -0.2], [0.066, -0.36], [0.052, -0.43], [0.001, -0.45]], 0.92), shin: limb([[0.001, 0.02], [0.05, 0.0], [0.056, -0.08], [0.057, -0.14], [0.045, -0.27], [0.032, -0.39], [0.03, -0.43], [0.001, -0.445]], 0.92) },
};
// hand with four fingers and a thumb (single merged mesh), hanging down
function handGeo(f) {
  const k = 0.92 * (f ? 0.9 : 1), parts = [];
  const palm = new RoundedBoxGeometry(0.075 * k, 0.085 * k, 0.03 * k, 2, 0.012); palm.translate(0, -0.045 * k, 0); parts.push(palm);
  for (let i = 0; i < 4; i++) { const fl = (i === 0 || i === 3 ? 0.052 : 0.062) * k; const fg = new THREE.CapsuleGeometry(0.0085 * k, fl, 3, 6); fg.translate((-0.026 + i * 0.0175) * k, -0.09 * k - fl / 2, 0.002); fg.rotateX(-0.12); parts.push(fg); }
  const th = new THREE.CapsuleGeometry(0.01 * k, 0.04 * k, 3, 6); th.rotateZ(0.6); th.translate(0.042 * k, -0.06 * k, 0.012); parts.push(th);
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}
const HANDS = { m: handGeo(false), f: handGeo(true) };
// shoe tapered towards the toe
function shoeGeo(w, h, l) { const g = new RoundedBoxGeometry(w, h, l, 3, Math.min(w, h) * 0.4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i) / (l / 2); const t = z > 0 ? 1 - z * 0.35 : 1; p.setX(i, p.getX(i) * t); if (z > 0.5) p.setY(i, p.getY(i) * (1 - (z - 0.5) * 0.4) - (z - 0.5) * 0.01); } g.computeVertexNormals(); return g; }
const SHOES = { formal: shoeGeo(0.1, 0.075, 0.27), sneaker: shoeGeo(0.108, 0.085, 0.27), heel: shoeGeo(0.08, 0.06, 0.22), flat: shoeGeo(0.09, 0.05, 0.25) };
const NECK = (() => { const g = lathe([[0.062, -0.04], [0.052, 0.0], [0.047, 0.06], [0.049, 0.12]], 16); g.computeVertexNormals(); return g; })();

function clothMat(top, part) {
  const s = top.style, c0 = top.c[0] || '#888', c1 = top.c[1] || c0, c2 = top.c[2] || c0;
  if (part === 'torso') {
    if (s === 'waistcoat') return new THREE.MeshStandardMaterial({ map: pattern('pinstripe', c0, '#c4cad8'), roughness: 0.75 });
    if (s === 'kurta' || s === 'punjabi') return new THREE.MeshStandardMaterial({ map: pattern('crinkle', c0), roughness: 0.8 });
    if (s === 'jersey') return new THREE.MeshStandardMaterial({ map: pattern('stripes', c0, c1), roughness: 0.6 });
    if (s === 'shirt' && top.id === 'top_shirt_floral') return new THREE.MeshStandardMaterial({ map: pattern('spots', c0, c2), roughness: 0.7 });
    if (s === 'jacket') return mat(c0, { r: 0.35, m: 0.1 });
    if (s === 'saree') return mat(c1, { r: 0.5 });
    if (s === 'jacket' || s === 'blazer') return mat(c0, { r: 0.6 });
  }
  return mat(c0, { r: s === 'jacket' ? 0.35 : 0.75 });
}

export class Human {
  constructor(app) { this.root = new THREE.Group(); this.phase = Math.random() * 6; this.t = 0; this.setLook(app); }
  setLook(app) {
    if (this.key === JSON.stringify(app) + FACE.ver) return;
    this.key = JSON.stringify(app) + FACE.ver; this.app = app;
    const R = this.root; while (R.children.length) R.remove(R.children[0]);
    const f = app.gender === 'f'; const H = f ? 1.69 : 1.75; const s = H / 1.75;
    const sw = f ? 0.92 : 1; // shoulder width factor
    const top = it(app.top), bot = it(app.bottom), sho = it(app.shoes), gl = it(app.glasses), hat = it(app.hat), ear = it(app.earrings);
    const skin = new THREE.MeshPhysicalMaterial({ color: app.skin, roughness: 0.55, envMapIntensity: 0.35, sheen: 0.25, sheenColor: new THREE.Color('#ffd8c8'), sheenRoughness: 0.6 });
    const gk2 = f ? 'f' : 'm';
    const shortSl = ['tee', 'jersey'].includes(top.style), noSl = ['dress', 'crop', 'swim'].includes(top.style);
    const full = top.style === 'saree' || top.style === 'dress';
    const legMat = ['shorts', 'skirt'].includes(bot.style) || top.style === 'dress' ? skin : bot.style === 'jeans' ? new THREE.MeshStandardMaterial({ map: pattern('denim', bot.c[0]), roughness: 0.9 }) : mat(bot.c[0] || '#333', { r: 0.8 });
    const shoeMat = mat(sho.c[0] || '#222', { r: sho.style === 'formal' ? 0.25 : 0.6, m: 0 });
    const body = new THREE.Group(); body.scale.setScalar(s); R.add(body); this.body = body;
    const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips); this.hips = hips;
    const add = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); me.castShadow = true; parent.add(me); return me; };
    // pelvis + torso (lathe-sculpted silhouettes)
    const gk = f ? 'f' : 'm';
    add(hips, bodyGeo('pelvis', gk), full ? clothMat(top, 'torso') : legMat === skin ? mat(bot.c[0] || '#333') : legMat, 0, 0.02, 0, 1, 1, 0.7);
    const chest = new THREE.Group(); hips.add(chest); this.chest = chest;
    add(chest, bodyGeo('torso', gk), clothMat(top, 'torso'), 0, 0.02, 0, sw, 1, 0.66);
    if (top.style === 'crop' || top.style === 'saree') add(chest, new THREE.CylinderGeometry(0.128, 0.13, 0.14, 24), skin, 0, 0.06, 0, sw, 1, 0.68);
    // waistcoat / jacket / blazer: fitted shell open at the front + satin lapels
    if (['waistcoat', 'jacket', 'blazer'].includes(top.style)) {
      const pm = (top.style === 'waistcoat' ? mat(top.c[1], { r: 0.45 }) : mat(top.c[0], { r: top.style === 'jacket' ? 0.35 : 0.6 })).clone(); pm.side = THREE.DoubleSide;
      add(chest, bodyGeo('torso', gk, { inflate: 1.045, ps: 0.32, pl: Math.PI * 2 - 0.64 }), pm, 0, 0.0, 0, sw, 0.97, 0.69);
      const sat = mat('#34323a', { r: 0.22, m: 0.2 });
      for (const sx of [-1, 1]) { const l = add(chest, new THREE.BoxGeometry(0.03, 0.34, 0.012), sat, sx * 0.045, 0.36, 0.118); l.rotation.z = sx * 0.2; l.rotation.x = -0.12; }
      if (top.style !== 'jacket') { const tie = add(chest, new THREE.BoxGeometry(0.042, 0.32, 0.012), mat(top.style === 'waistcoat' ? top.c[2] : '#2a2a35', { r: 0.35 }), 0, 0.4, 0.116); tie.rotation.x = -0.14; add(chest, new THREE.BoxGeometry(0.05, 0.04, 0.03), tie.material, 0, 0.55, 0.095); }
      for (const sx of [-1, 1]) { const col = add(chest, new THREE.BoxGeometry(0.06, 0.035, 0.02), mat('#f6f4ee'), sx * 0.035, 0.575, 0.075); col.rotation.z = sx * 0.6; }
      if (top.style === 'waistcoat') for (let k = 0; k < 4; k++) add(chest, new THREE.SphereGeometry(0.007, 6, 4), mat('#1a1a1a', { r: 0.2 }), 0.02, 0.12 + k * 0.06, 0.11);
      if (app.pin) { add(chest, new THREE.BoxGeometry(0.022, 0.028, 0.008), mat('#b8282a', { r: 0.3, m: 0.4 }), -0.09, 0.47, 0.112); add(chest, new THREE.BoxGeometry(0.003, 0.07, 0.003), mat('#e3b341', { m: 1, r: 0.2 }), -0.078, 0.42, 0.116).rotation.z = 0.5; add(chest, new THREE.BoxGeometry(0.018, 0.022, 0.008), mat('#b8282a', { r: 0.3, m: 0.4 }), -0.065, 0.38, 0.116); }
    }
    if (top.style === 'kurta' || top.style === 'punjabi') {
      const hm2 = clothMat(top, 'torso').clone(); hm2.side = THREE.DoubleSide; add(hips, lathe([[0.148, 0.04], [0.16, -0.08], [0.19, -0.25], [0.215, -0.42], [0.22, -0.44]], 28), hm2, 0, 0, 0, sw, 1, 0.78);
      const zari = new THREE.MeshStandardMaterial({ map: pattern('zari', top.c[1] || top.c[0], top.c[2] || '#f0d488'), roughness: 0.4, metalness: 0.4 });
      add(chest, new THREE.TorusGeometry(0.07, 0.01, 6, 20, Math.PI), zari, 0, 0.56, 0.06, 1, 1.6, 1).rotation.z = Math.PI;
      add(hips, new THREE.CylinderGeometry(0.222, 0.222, 0.035, 28, 1, true), zari, 0, -0.42, 0, sw, 1, 0.79);
      if (top.style === 'kurta') { // sheer dupatta over one shoulder
        const dm = new THREE.MeshStandardMaterial({ color: shade(top.c[0], 0.3), transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.6 });
        const d = add(chest, new THREE.CylinderGeometry(0.2, 0.2, 0.13, 20, 1, true, -0.4, 1.5), dm, 0, 0.3, 0, sw, 1, 0.75); d.rotation.z = -0.62; d.castShadow = false;
      }
    }
    if (full) {
      const len = top.style === 'saree' ? 0.92 : 0.5;
      const sk = add(hips, new THREE.CylinderGeometry(0.17 * sw, top.style === 'saree' ? 0.26 : 0.32, len, 24, 1, true), mat(top.c[0], { r: 0.55 }), 0, -len / 2 + 0.05, 0, 1, 1, 0.85); sk.material.side = THREE.DoubleSide;
      if (top.style === 'saree') {
        add(hips, new THREE.CylinderGeometry(0.262, 0.262, 0.08, 24, 1, true), mat(top.c[2], { r: 0.35, m: 0.5 }), 0, -0.82, 0, 1, 1, 0.85);
        const pallu = add(chest, new THREE.BoxGeometry(0.14, 0.95, 0.015), mat(top.c[1], { r: 0.5 }), 0.02, 0.15, 0.135); pallu.rotation.z = 0.55;
        add(chest, new THREE.BoxGeometry(0.03, 0.95, 0.017), mat(top.c[2], { m: 0.5, r: 0.35 }), 0.06, 0.15, 0.137).rotation.z = 0.55;
      }
    }
    if (top.style === 'hoodie') add(chest, new THREE.TorusGeometry(0.1, 0.04, 8, 16), mat(top.c[1]), 0, 0.56, -0.05).rotation.x = Math.PI / 2.4;
    // neck + head
    add(chest, NECK, skin, 0, 0.6, 0);
    const head = new THREE.Group(); head.position.set(0, 0.76, 0.01); chest.add(head); this.head = head;
    const photo = photoFaceTexture(app);
    const faceMat = new THREE.MeshStandardMaterial({ map: photo || faceTexture(app), roughness: photo ? 0.7 : 0.6, envMapIntensity: 0.3 });
    add(head, bodyGeo('head', 'x'), faceMat, 0, 0, 0, 0.88, 1.0, 0.98);
    add(head, G.ear, skin, -0.09, 0.0, -0.005, 0.6, 1.3, 1); add(head, G.ear, skin, 0.09, 0.0, -0.005, 0.6, 1.3, 1);
    if (!photo) add(head, new THREE.SphereGeometry(0.014, 8, 6), skin, 0, -0.012, 0.1, 0.9, 1.4, 1.1); // nose (photo faces carry their own)
    buildHair(head, app, add, !!photo);
    if (gl.style !== 'none' && !(photo && app.photoGlasses)) buildGlasses(head, gl, add);
    if (hat.style !== 'none') buildHat(head, hat, add);
    if (ear.style !== 'none') for (const sx of [-1, 1]) { const em = mat(ear.c[0], { m: 1, r: 0.25 }); add(head, ear.style === 'hoops' ? new THREE.TorusGeometry(0.016, 0.003, 6, 12) : ear.style === 'studs' ? new THREE.SphereGeometry(0.007, 6, 6) : new THREE.ConeGeometry(0.011, 0.022, 10), em, sx * 0.092, ear.style === 'jhumka' ? -0.04 : -0.03, 0.0).rotation.x = ear.style === 'jhumka' ? Math.PI : 0; }
    // arms
    this.arms = [];
    for (const sx of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(sx * 0.2 * sw, 0.53, 0); chest.add(sh);
      add(sh, new THREE.SphereGeometry(f ? 0.052 : 0.06, 14, 10), noSl ? skin : clothMat(top, 'arm'), 0, -0.005, 0, 1, 0.9, 0.95);
      add(sh, LIMBS[gk2].upper, noSl ? skin : clothMat(top, 'arm'));
      const el = new THREE.Group(); el.position.y = -0.27; sh.add(el);
      add(el, LIMBS[gk2].fore, noSl || shortSl ? skin : clothMat(top, 'arm'));
      if (top.style === 'waistcoat' || top.style === 'blazer') add(el, new THREE.CylinderGeometry(0.047, 0.047, 0.03, 10), mat('#f4f1ea'), 0, -0.22, 0);
      const hand = add(el, HANDS[gk2], skin, 0, -0.255, 0); hand.rotation.y = -sx * 0.25; hand.scale.x = sx;
      if (app.nails && app.nails !== 'none') for (let i = 0; i < 4; i++) add(hand, new THREE.SphereGeometry(0.0075, 6, 4), mat(app.nails, { r: 0.15 }), -0.024 + i * 0.016, -0.135 - (i === 0 || i === 3 ? 0 : 0.008), 0.008, 1, 1.4, 0.6);
      sh.rotation.z = sx * 0.08;
      this.arms.push({ sh, el });
    }
    // legs
    this.legs = [];
    for (const sx of [-1, 1]) {
      const hp = new THREE.Group(); hp.position.set(sx * 0.09, -0.02, 0); hips.add(hp);
      add(hp, LIMBS[gk2].thigh, bot.style === 'shorts' || bot.style === 'skirt' ? skin : legMat);
      if (bot.style === 'shorts') add(hp, new THREE.CylinderGeometry(0.09, 0.085, 0.24, 12), mat(bot.c[0]), 0, -0.1, 0);
      const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
      const pal = bot.style === 'palazzo' || bot.style === 'dhoti';
      add(kn, pal ? new THREE.CylinderGeometry(0.075, 0.13, 0.42, 12) : LIMBS[gk2].shin, legMat, 0, pal ? -0.2 : 0);
      const ft = new THREE.Group(); ft.position.y = -0.44; kn.add(ft);
      add(ft, sho.style === 'heels' ? SHOES.heel : sho.style === 'sneaker' ? SHOES.sneaker : sho.style === 'jutti' || sho.style === 'sandal' ? SHOES.flat : SHOES.formal, sho.style === 'sandal' ? skin : shoeMat, 0, -0.025, 0.055);
      if (sho.style === 'jutti') add(ft, new THREE.BoxGeometry(0.06, 0.004, 0.12), mat('#f0d488', { m: 0.6, r: 0.3 }), 0, 0.002, 0.07);
      if (sho.style === 'heels') add(ft, new THREE.BoxGeometry(0.02, 0.06, 0.02), shoeMat, 0, -0.06, -0.04);
      if (sho.style === 'sneaker') add(ft, new THREE.BoxGeometry(0.104, 0.025, 0.252), mat('#d8d8d8'), 0, -0.055, 0.05);
      if (sho.style === 'boots') add(ft, new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), shoeMat, 0, 0.05, 0);
      this.legs.push({ hp, kn, ft });
    }
    if (bot.style === 'skirt' && !full) { const sk = add(hips, new THREE.CylinderGeometry(0.17, 0.26, 0.36, 20, 1, true), mat(bot.c[0]), 0, -0.15, 0, 1, 1, 0.85); sk.material.side = THREE.DoubleSide; }
    this.weapon = null;
  }
  holdWeapon(kind) {
    if (this.weaponKind === kind) return; this.weaponKind = kind;
    if (this.weapon) this.weapon.parent.remove(this.weapon); this.weapon = null;
    if (!kind) return;
    const g = new THREE.Group(); const hand = this.arms[1].el;
    if (kind === 'pistol') { const m = mat('#1d1b20', { m: 0.6, r: 0.4 }); const a = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.16), m); a.position.z = 0.06; const b = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.09, 0.035), m); b.position.set(0, -0.04, 0); g.add(a, b); }
    if (kind === 'knife') { const a = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.03, 0.16), mat('#d8dce4', { m: 1, r: 0.15 })); a.position.z = 0.1; const h = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.08), mat('#2a1a10')); g.add(a, h); }
    if (kind === 'bat') { const a = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.62), mat('#d8b070', { r: 0.6 })); a.position.z = 0.36; const h = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8), mat('#1d1b20')); h.rotation.x = Math.PI / 2; g.add(a, h); }
    g.position.y = -0.29; hand.add(g); this.weapon = g;
  }
  // state: walk|sit|drive|swim|dance|ko|hands|boat ; speed in m/s
  animate(dt, state, speed, opt = {}) {
    this.t += dt; const L = this.legs, A = this.arms; if (!L) return;
    const reset = () => { for (const l of L) { l.hp.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); l.ft.rotation.set(0, 0, 0); } for (const [i, a] of A.entries()) { a.sh.rotation.set(0, 0, (i ? 1 : -1) * 0.08); a.el.rotation.set(0, 0, 0); } this.body.rotation.set(0, 0, 0); this.body.position.set(0, 0, 0); this.chest.rotation.set(0, 0, 0); this.head.rotation.set(0, 0, 0); this.hips.position.y = 0.95; };
    reset();
    if (state === 'sit' || state === 'drive' || state === 'boat') {
      this.hips.position.y = state === 'drive' ? 0.55 : 0.5;
      for (const l of L) { l.hp.rotation.x = -Math.PI / 2; l.kn.rotation.x = Math.PI / 2; }
      for (const a of A) { a.sh.rotation.x = -0.5; a.el.rotation.x = -0.9; }
      if (state === 'boat') { const r = Math.sin(this.t * 3); for (const a of A) { a.sh.rotation.x = -0.9 - r * 0.5; } }
      if (opt.eating) { A[1].sh.rotation.x = -0.9 + Math.sin(this.t * 4) * 0.25; A[1].el.rotation.x = -1.8; }
      this.chest.rotation.x = 0.05; return;
    }
    if (state === 'swim') {
      this.body.rotation.x = Math.PI / 2 * 0.92; this.body.position.y = -0.85; this.body.position.z = -0.6;
      const p = this.t * 5; A[0].sh.rotation.x = -Math.PI + Math.sin(p) * 1.5; A[1].sh.rotation.x = -Math.PI + Math.sin(p + Math.PI) * 1.5;
      L[0].hp.rotation.x = Math.sin(p * 2) * 0.3; L[1].hp.rotation.x = -Math.sin(p * 2) * 0.3; return;
    }
    if (state === 'ko') { this.body.rotation.z = Math.PI / 2; this.body.position.set(0.85, 0.12, 0); for (const a of A) a.sh.rotation.z = 0.6; return; }
    if (state === 'hands') { for (const [i, a] of A.entries()) { a.sh.rotation.z = (i ? 1 : -1) * 2.6; a.el.rotation.z = (i ? 1 : -1) * 0.4; } this.head.rotation.x = -0.1; return; }
    if (state === 'dance') {
      const p = this.t * 6; this.hips.position.y = 0.95 - Math.abs(Math.sin(p)) * 0.06; this.chest.rotation.y = Math.sin(p / 2) * 0.35; this.chest.rotation.z = Math.sin(p) * 0.08;
      A[0].sh.rotation.z = -2.2 - Math.sin(p) * 0.5; A[1].sh.rotation.z = 2.2 + Math.cos(p) * 0.5; A[0].el.rotation.z = -0.6; A[1].el.rotation.z = 0.6;
      L[0].hp.rotation.x = Math.sin(p) * 0.25; L[1].hp.rotation.x = -Math.sin(p) * 0.25; L[0].kn.rotation.x = 0.3; L[1].kn.rotation.x = 0.3; return;
    }
    // locomotion
    const run = speed > 3.8, amp = Math.min(1, speed / 1.6) * (run ? 0.95 : 0.55);
    this.phase += dt * (run ? speed * 1.55 : speed * 2.6 + 0.01);
    const p = this.phase;
    if (speed > 0.15) {
      for (const [i, l] of L.entries()) { const s = Math.sin(p + i * Math.PI); l.hp.rotation.x = s * amp; l.kn.rotation.x = Math.max(0, -Math.cos(p + i * Math.PI)) * amp * (run ? 1.8 : 1.2); l.ft.rotation.x = -s * amp * 0.3; }
      for (const [i, a] of A.entries()) { a.sh.rotation.x = -Math.sin(p + i * Math.PI) * amp * 0.9; a.el.rotation.x = -(run ? 1.3 : 0.25); }
      this.hips.position.y = 0.95 + Math.abs(Math.cos(p)) * (run ? 0.05 : 0.025) - (run ? 0.03 : 0);
      this.chest.rotation.x = run ? 0.18 : 0.03; this.chest.rotation.y = Math.sin(p) * 0.08 * amp;
    } else {
      const b = Math.sin(this.t * 1.8); this.chest.rotation.x = b * 0.012; for (const [i, a] of A.entries()) a.sh.rotation.z = (i ? 1 : -1) * (0.08 + b * 0.01); this.head.rotation.y = Math.sin(this.t * 0.4) * 0.25;
    }
    if (opt.aim) { A[1].sh.rotation.x = -Math.PI / 2; A[1].el.rotation.x = 0; }
    if (opt.carry) { for (const a of A) { a.sh.rotation.x = -0.6; a.el.rotation.x = -1.2; } }
    if (opt.wave) { A[1].sh.rotation.z = 2.6; A[1].el.rotation.z = 0.5 + Math.sin(this.t * 10) * 0.4; }
  }
}
function buildHair(head, app, add, photo) {
  const hm = new THREE.MeshStandardMaterial({ map: strandTexture(app.hairColor), roughness: 0.6, metalness: 0, envMapIntensity: 0.15, side: THREE.DoubleSide });
  const h = app.hair;
  const capGeo = (lo) => new THREE.LatheGeometry([[0.106, lo], [0.109, 0.03], [0.106, 0.07], [0.092, 0.106], [0.062, 0.13], [0.001, 0.143]].map(([x, y]) => new THREE.Vector2(x, y)), 36);
  const cap = (thetaLen, sc = 1.0) => { const m = add(head, capGeo(-0.02), hm, 0, 0.012, -0.006, 0.93 * sc, 1.0 * sc, 1.02 * sc); m.rotation.x = photo ? -0.62 : -0.42; m.material.side = THREE.DoubleSide; return m; };
  if (h === 'buzz') { cap(0.42, 1.0); return; }
  cap(0.44);
  // back of head coverage
  add(head, new THREE.SphereGeometry(0.112, 20, 14, 0, Math.PI, 0, Math.PI * 0.62), hm, 0, 0.0, -0.01, 0.95, 1.05, 1.02).rotation.y = Math.PI / 2 + Math.PI / 2;
  switch (h) {
    case 'swept': { // smooth swept-back volume with a slight side part
      const q = add(head, new THREE.SphereGeometry(0.1, 24, 16), hm, 0.004, 0.092, 0.0, 1.0, 0.62, 1.12); q.rotation.x = -0.32;
      const f2 = add(head, new THREE.SphereGeometry(0.06, 18, 12), hm, 0.018, 0.098, 0.062, 1.45, 0.62, 0.9); f2.rotation.z = -0.18; f2.rotation.x = -0.2;
      break;
    }
    case 'curly': for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; add(head, new THREE.SphereGeometry(0.04, 10, 8), hm, Math.cos(a) * 0.08, 0.1 + Math.sin(i * 1.7) * 0.02, Math.sin(a) * 0.08); } break;
    case 'short': add(head, new THREE.SphereGeometry(0.1, 16, 10), hm, 0, 0.085, 0.01, 1.08, 0.45, 1.1); break;
    case 'long': case 'wavy': case 'braid': {
      // long hair as a curtain wrapping the back and sides, falling past the shoulders, plus front locks
      const len = h === 'braid' ? 0.22 : 0.5, sw2 = h === 'wavy' ? 1.12 : 1.0;
      const curtain = lathe([[0.108, 0.07], [0.118, 0.02], [0.12, -0.06], [0.125 * sw2, -0.16], [0.135 * sw2, -0.28], [0.14 * sw2, -0.4], [0.13 * sw2, -len]], 28, Math.PI * 0.4, Math.PI * 1.2);
      add(head, curtain, hm, 0, 0.0, -0.01, 0.98, 1, 0.95);
      for (const sx of [-1, 1]) { // locks that fall in front of the shoulders (side part: one side fuller)
        const lk = lathe([[0.03, 0.0], [0.038, -0.12], [0.045, -0.3], [0.036, -0.42], [0.001, -0.46]], 10); lk.scale(1, 1, 0.45);
        const m = add(head, lk, hm, sx * 0.086, 0.0, 0.01, sx < 0 ? 0.85 : 0.7, h === 'braid' ? 0.45 : 0.85, 0.8); m.rotation.z = sx * 0.05; m.rotation.x = 0.08;
      }
      if (!photo) add(head, new THREE.SphereGeometry(0.06, 14, 10), hm, -0.035, 0.11, 0.045, 1.4, 0.45, 1.0).rotation.z = 0.3; // side-swept fringe
      if (h === 'braid') for (let k = 0; k < 7; k++) add(head, new THREE.SphereGeometry(0.03, 8, 6), hm, -0.1 + (k % 2) * 0.01, -0.2 - k * 0.055, 0.07);
      break;
    }
    case 'ponytail': add(head, new THREE.CylinderGeometry(0.035, 0.02, 0.32, 10), hm, 0, -0.1, -0.14).rotation.x = 0.35; add(head, new THREE.TorusGeometry(0.03, 0.01, 6, 12), mat('#c0283a'), 0, 0.04, -0.12); break;
    case 'bun': add(head, new THREE.SphereGeometry(0.06, 14, 10), hm, 0, 0.12, -0.06); break;
    case 'bob': add(head, new THREE.SphereGeometry(0.125, 20, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.4), hm, 0, -0.03, -0.01, 1.05, 1.1, 1.05); break;
  }
}
function buildGlasses(head, gl, add) {
  const fm = mat(gl.c[0], { m: 0.5, r: 0.3 });
  const sun = gl.c[1] !== 'clear';
  const lm = new THREE.MeshPhysicalMaterial({ color: sun ? gl.c[1] : '#dfefff', transparent: true, opacity: sun ? 0.88 : 0.15, roughness: 0.05, metalness: sun ? 0.3 : 0, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    const x = sx * 0.045, y = 0.012, z = 0.112;
    const round = gl.style === 'round' || gl.style === 'aviator';
    const lens = add(head, round ? new THREE.CircleGeometry(0.03, 20) : new THREE.PlaneGeometry(0.062, 0.04), lm, x, y, z); lens.castShadow = false;
    if (round) add(head, new THREE.TorusGeometry(0.03, 0.0035, 6, 24), fm, x, y, z);
    else { add(head, new THREE.BoxGeometry(0.066, 0.006, 0.006), fm, x, y + 0.021, z); add(head, new THREE.BoxGeometry(0.066, 0.004, 0.006), fm, x, y - 0.021, z); add(head, new THREE.BoxGeometry(0.005, 0.044, 0.006), fm, x + sx * 0.032, y, z); add(head, new THREE.BoxGeometry(0.005, 0.044, 0.006), fm, x - sx * 0.032, y, z); }
    add(head, new THREE.BoxGeometry(0.004, 0.004, 0.11), fm, sx * 0.1, y + 0.015, 0.06);
  }
  add(head, new THREE.BoxGeometry(0.03, 0.005, 0.005), fm, 0, 0.022, 0.115);
}
function buildHat(head, hat, add) {
  const hm = mat(hat.c[0], { r: 0.7 });
  if (hat.style === 'cap') { add(head, new THREE.SphereGeometry(0.125, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm, 0, 0.04, 0, 0.98, 0.8, 1.02); add(head, new THREE.CylinderGeometry(0.09, 0.09, 0.012, 20, 1, false, 0, Math.PI), hm, 0, 0.05, 0.08, 1, 1, 1).rotation.y = -Math.PI / 2; }
  if (hat.style === 'beanie') add(head, new THREE.SphereGeometry(0.128, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hm, 0, 0.03, -0.005, 0.98, 1.0, 1.02);
  if (hat.style === 'fedora') { add(head, new THREE.CylinderGeometry(0.17, 0.17, 0.01, 24), hm, 0, 0.09, 0); add(head, new THREE.CylinderGeometry(0.095, 0.11, 0.11, 20), hm, 0, 0.15, 0); add(head, new THREE.CylinderGeometry(0.112, 0.112, 0.025, 20), mat('#2a1a10'), 0, 0.105, 0); }
  if (hat.style === 'sunhat') { add(head, new THREE.CylinderGeometry(0.26, 0.26, 0.01, 28), hm, 0, 0.08, 0); add(head, new THREE.SphereGeometry(0.12, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm, 0, 0.08, 0); add(head, new THREE.CylinderGeometry(0.122, 0.122, 0.03, 20), mat('#c0283a'), 0, 0.1, 0); }
}

/* ================================ VEHICLES ================================ */
const VEH = {
  taxi: { L: 4.3, W: 1.7, kind: 'amby', col: '#f2c230' }, sedan: { L: 4.4, W: 1.78, kind: 'sedan', col: '#e8e8ec' }, sedan2: { L: 4.4, W: 1.78, kind: 'sedan', col: '#2a4a9a' },
  sedan3: { L: 4.4, W: 1.78, kind: 'sedan', col: '#7a1a26' }, hatch: { L: 3.8, W: 1.7, kind: 'hatch', col: '#4aa83a' }, suv: { L: 4.7, W: 1.9, kind: 'suv', col: '#1d1d22' },
  sports_red: { L: 4.5, W: 1.98, kind: 'sports', col: '#c41a1a' }, sports_lime: { L: 4.5, W: 1.98, kind: 'sports', col: '#8ad428' }, sports_orange: { L: 4.5, W: 1.98, kind: 'sports', col: '#f07a1a' },
  sports_black: { L: 4.5, W: 1.98, kind: 'sports', col: '#111114' }, sports_blue: { L: 4.5, W: 1.98, kind: 'sports', col: '#1a58c8' },
  bus: { L: 9.5, W: 2.5, kind: 'bus', col: '#2a6ac0' }, police: { L: 4.5, W: 1.85, kind: 'police', col: '#f2f2f2' }, tram: { L: 11, W: 2.4, kind: 'tram', col: '#2a7a4a' }, carriage: { L: 5.2, W: 1.8, kind: 'carriage', col: '#f2f2f2' },
};
export const VEH_SPEC = VEH;
const WHEEL_GEO = {}; const WHEEL_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5 });
const PROFILES = { // side profile points (x from rear to front in 0..1 of L, y metres) [belt part], cabin [x0,x1 bottom, x2,x3 top, roof h]
  amby: { body: [[0, 0.32], [0, 0.78], [0.04, 0.86], [0.2, 0.9], [0.78, 0.92], [0.94, 0.86], [1, 0.74], [1, 0.32]], cab: [0.24, 0.78, 0.32, 0.68, 1.52] },
  sedan: { body: [[0, 0.34], [0, 0.8], [0.06, 0.86], [0.24, 0.9], [0.74, 0.92], [0.95, 0.8], [1, 0.62], [1, 0.34]], cab: [0.22, 0.76, 0.34, 0.6, 1.42] },
  police: { body: [[0, 0.34], [0, 0.8], [0.06, 0.86], [0.24, 0.9], [0.74, 0.92], [0.95, 0.8], [1, 0.62], [1, 0.34]], cab: [0.22, 0.76, 0.34, 0.6, 1.44] },
  hatch: { body: [[0, 0.34], [0, 0.88], [0.18, 0.92], [0.74, 0.92], [0.95, 0.8], [1, 0.62], [1, 0.34]], cab: [0.04, 0.74, 0.1, 0.56, 1.48] },
  suv: { body: [[0, 0.42], [0, 1.0], [0.2, 1.05], [0.78, 1.05], [0.96, 0.96], [1, 0.78], [1, 0.42]], cab: [0.04, 0.8, 0.06, 0.66, 1.78] },
  sports: { body: [[0, 0.26], [0, 0.72], [0.1, 0.76], [0.3, 0.8], [0.62, 0.78], [0.9, 0.6], [1, 0.46], [1, 0.26]], cab: [0.28, 0.7, 0.36, 0.54, 1.14] },
};
// smooth body: spline through the profile's upper contour, flat underside, sides tapering inward ("tumblehome")
function extrudeProfile(pts, L, W, bevel = 0.06, smooth = true, taperFrom = 0.8, taper = 0.16) {
  const sh = new THREE.Shape();
  if (smooth && pts.length > 3) {
    const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x * L - L / 2, y)));
    curve.getPoints(48).forEach((p, i) => (i ? sh.lineTo(p.x, p.y) : sh.moveTo(p.x, p.y)));
  } else pts.forEach(([x, y], i) => (i ? sh.lineTo(x * L - L / 2, y) : sh.moveTo(x * L - L / 2, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: W - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -(W - bevel * 2) / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > taperFrom) p.setZ(i, p.getZ(i) * (1 - Math.min(1, (y - taperFrom)) * taper)); }
  g.computeVertexNormals(); return g;
}
const vehCache = {};
export function buildVehicle(type) {
  const spec = VEH[type] || VEH.sedan;
  if (!vehCache[type]) vehCache[type] = compact(makeVehicle(type, spec));
  const g = vehCache[type].clone(true);
  g.userData.wheels = []; g.userData.lights = [];
  g.userData.horse = null;
  g.traverse((o) => { if (o.userData.wheel) g.userData.wheels.push(o); if (o.userData.light) g.userData.lights.push(o); if (o.userData.kind === 'horse' && !g.userData.horse) g.userData.horse = o; });
  if (g.userData.horse) { const h = g.userData.horse; h.userData.legs = h.children.filter((c) => c.isGroup); h.userData.head = null; h.userData.wings = null; }
  return g;
}
function makeVehicle(type, spec) {
  const root = new THREE.Group(); const { L, W } = spec;
  const paint = new THREE.MeshPhysicalMaterial({ color: spec.col, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#1a2630', metalness: 0.4, roughness: 0.04, transparent: true, opacity: 0.82 });
  const chrome = mat('#d8dce4', { m: 1, r: 0.15 }), dark = mat('#141416', { r: 0.6 });
  const add = (geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; root.add(me); return me; };
  const wheel = (x, z, r = 0.33, w = 0.24) => { // one merged mesh per wheel (tyre + rim + spokes via vertex colours)
    const key = r + '|' + w + '|' + spec.kind; let geo = WHEEL_GEO[key];
    if (!geo) {
      const parts = [], col = (g, c) => { const ng = g.toNonIndexed(); const cc = new THREE.Color(c); const a = new Float32Array(ng.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) a.set([cc.r, cc.g, cc.b], i); ng.setAttribute('color', new THREE.BufferAttribute(a, 3)); ng.deleteAttribute('uv'); parts.push(ng); };
      col(new THREE.CylinderGeometry(r, r, w, 22), '#141416'); col(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.01, 14), spec.kind === 'sports' ? '#2a2a2e' : '#d0d4dc');
      for (let k = 0; k < 5; k++) { const sp = new THREE.BoxGeometry(r * 1.1, w + 0.02, 0.03); sp.rotateY((k / 5) * Math.PI); col(sp, '#202024'); }
      geo = WHEEL_GEO[key] = mergeGeometries(parts); geo.rotateX(Math.PI / 2);
    }
    const wg = new THREE.Mesh(geo, WHEEL_MAT); wg.position.set(x, r, z); wg.userData.wheel = true; wg.castShadow = true; root.add(wg); return wg;
  };
  const light = (x, y, z, col, w = 0.25, h = 0.1) => { const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 }); const me = add(new THREE.BoxGeometry(0.05, h, w), m, x, y, z); me.userData.light = col === '#ffffff' || col === '#fff6d0' ? 'head' : 'tail'; return me; };
  if (PROFILES[spec.kind]) {
    const P = PROFILES[spec.kind];
    add(extrudeProfile(P.body, L, W, 0.07, true, 0.55, 0.1), paint);
    const [x0, x1, x2, x3, rh] = P.cab;
    const belt = Math.max(...P.body.map((p) => p[1])) - 0.04;
    const cab = [[x0, belt], [x2, rh], [x3, rh], [x1, belt]];
    add(extrudeProfile(cab, L, W - 0.16, 0.05, false, belt, 0.22), glass);
    // roof + pillars in body colour
    add(extrudeProfile([[x2 - 0.01, rh - 0.05], [x2, rh + 0.03], [x3, rh + 0.03], [x3 + 0.01, rh - 0.05]], L, W - 0.14, 0.04, false, 0, 0.0), paint).scale.z = 1 - (rh - belt) * 0.22;
    for (const sz of [-1, 1]) for (const [xa, xb] of [[x0, x2], [x1, x3]]) { const px = ((xa + xb) / 2) * L - L / 2, len = Math.hypot((xb - xa) * L, rh - belt); const p = add(new THREE.BoxGeometry(0.07, len, 0.06), paint, px, (belt + rh) / 2, sz * (W / 2 - 0.1)); p.rotation.z = -Math.atan2((xb - xa) * L, rh - belt); }
    for (const sz of [-1, 1]) { const bp = add(new THREE.BoxGeometry(0.06, rh - belt, 0.06), paint, ((x0 + x1) / 2) * L - L / 2, (belt + rh) / 2, sz * (W / 2 - 0.1)); bp.scale.y = 0.95; }
    const r = spec.kind === 'sports' ? 0.36 : spec.kind === 'suv' ? 0.4 : 0.32;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(sx * (L / 2 - (spec.kind === 'sports' ? 0.85 : 0.78)), sz * (W / 2 - 0.08), r, spec.kind === 'sports' ? 0.3 : 0.22);
    add(new THREE.BoxGeometry(0.12, 0.16, W - 0.1), spec.kind === 'amby' ? chrome : dark, L / 2 + 0.02, 0.38, 0); // bumpers
    add(new THREE.BoxGeometry(0.12, 0.16, W - 0.1), spec.kind === 'amby' ? chrome : dark, -L / 2 - 0.02, 0.38, 0);
    const hy = spec.kind === 'sports' ? 0.55 : 0.68;
    if (spec.kind === 'amby') { for (const sz of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14), new THREE.MeshStandardMaterial({ color: '#fff6d0', emissive: '#fff6d0', emissiveIntensity: 0.4 })); hl.rotation.z = Math.PI / 2; hl.position.set(L / 2 + 0.01, 0.66, sz * 0.6); hl.userData.light = 'head'; root.add(hl); } add(new THREE.BoxGeometry(0.04, 0.22, 0.5), chrome, L / 2 + 0.01, 0.6, 0); add(new THREE.BoxGeometry(0.02, 0.05, 1.7), dark, -0.2, 0.86, 0); }
    else for (const sz of [-1, 1]) light(L / 2 + 0.01, hy, sz * (W / 2 - 0.3), '#ffffff', 0.34, 0.08);
    for (const sz of [-1, 1]) light(-L / 2 - 0.01, hy + 0.05, sz * (W / 2 - 0.25), '#e01818', 0.3, 0.1);
    for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.16, 0.08, 0.04), paint, 0.25 * L - L / 2 + L * 0.3, belt + 0.05, sz * (W / 2 + 0.03)); // mirrors
    // detail: wheel arches, door seams + handles, side skirt, grille, lenses
    const wx = L / 2 - (spec.kind === 'sports' ? 0.85 : 0.78);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const ar = add(new THREE.TorusGeometry(r + 0.05, 0.055, 6, 18, Math.PI), dark, sx * wx, r, sz * (W / 2 - 0.02)); ar.castShadow = false; }
    const seam = mat('#1a1a1e', { r: 0.6 });
    for (const sz of [-1, 1]) {
      for (const fx of spec.kind === 'sports' || spec.kind === 'hatch' ? [0.52] : [0.42, 0.62]) add(new THREE.BoxGeometry(0.012, belt - 0.42, 0.006), seam, fx * L - L / 2, (belt + 0.38) / 2 + 0.02, sz * (W / 2 + 0.002));
      for (const fx of spec.kind === 'sports' || spec.kind === 'hatch' ? [0.46] : [0.36, 0.56]) add(new THREE.BoxGeometry(0.1, 0.022, 0.02), chrome, fx * L - L / 2, belt - 0.12, sz * (W / 2 + 0.01));
      add(new THREE.BoxGeometry(L - 1.9, 0.05, 0.03), spec.kind === 'amby' ? chrome : dark, 0, 0.36, sz * (W / 2 + 0.005));
    }
    if (spec.kind !== 'amby') { add(new THREE.BoxGeometry(0.03, 0.12, W * 0.42), mat('#141416', { r: 0.4, m: 0.4 }), L / 2 + 0.03, spec.kind === 'sports' ? 0.42 : 0.52, 0); add(new THREE.BoxGeometry(0.035, 0.14, W * 0.44), chrome, L / 2 + 0.02, spec.kind === 'sports' ? 0.42 : 0.52, 0).scale.set(1, 1, 1); }
    const plate = new THREE.MeshStandardMaterial({ color: spec.kind === 'amby' ? '#f2d02a' : '#f2f2f2', roughness: 0.5 });
    add(new THREE.BoxGeometry(0.02, 0.12, 0.42), plate, L / 2 + 0.09, 0.4, 0); add(new THREE.BoxGeometry(0.02, 0.12, 0.42), plate, -L / 2 - 0.09, 0.42, 0);
    if (spec.kind === 'police') { add(new THREE.BoxGeometry(0.25, 0.1, 1.0), dark, (x2 + x3) / 2 * L - L / 2, rh + 0.08, 0); const b = light((x2 + x3) / 2 * L - L / 2, rh + 0.15, -0.25, '#2a5aff', 0.45, 0.1); b.userData.light = 'siren'; const r2 = light((x2 + x3) / 2 * L - L / 2 + 0.001, rh + 0.15, 0.25, '#ff2a2a', 0.45, 0.1); r2.userData.light = 'siren'; add(new THREE.BoxGeometry(L * 0.9, 0.12, 0.01), mat('#2a5ad4'), 0, 0.6, W / 2 + 0.005); add(new THREE.BoxGeometry(L * 0.9, 0.12, 0.01), mat('#2a5ad4'), 0, 0.6, -W / 2 - 0.005); }
    if (spec.kind === 'sports') add(new THREE.BoxGeometry(0.3, 0.04, W - 0.2), dark, -L / 2 + 0.2, 0.86, 0);
  } else if (spec.kind === 'bus' || spec.kind === 'tram') {
    const isBus = spec.kind === 'bus';
    const body = add(new RoundedBoxGeometry(L, 2.6, W, 3, 0.2), paint, 0, 1.7, 0);
    add(new RoundedBoxGeometry(L + 0.02, 0.7, W + 0.02, 2, 0.1), mat(isBus ? '#f2c230' : '#f2e2b8', { r: 0.5 }), 0, 0.8, 0);
    add(new THREE.BoxGeometry(L * 0.92, 0.9, W + 0.04), glass, 0, 2.05, 0);
    add(new THREE.BoxGeometry(0.06, 1.2, W - 0.3), glass, L / 2 + 0.01, 1.95, 0);
    for (let k = -3; k <= 3; k++) add(new THREE.BoxGeometry(0.1, 0.9, W + 0.06), paint, k * (L / 8), 2.05, 0);
    void body;
    if (isBus) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(sx * (L / 2 - 1.5), sz * (W / 2 - 0.1), 0.5, 0.3); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.35), new THREE.MeshStandardMaterial({ map: signTexture('ESPLANADE', '#1d1b20', '#ffb030', true), emissive: '#ffb030', emissiveMap: signTexture('ESPLANADE', '#1d1b20', '#ffb030', true), emissiveIntensity: 0.5 })); s.position.set(L / 2 + 0.05, 2.75, 0); s.rotation.y = Math.PI / 2; root.add(s); }
    else { const pg = add(new THREE.BoxGeometry(0.06, 1.2, 0.06), dark, 0, 3.6, 0); pg.rotation.z = 0.5; for (const sx of [-1, 1]) wheel(sx * (L / 2 - 1.8), 0, 0.4, W - 0.4); }
    for (const sz of [-1, 1]) light(L / 2 + 0.01, 0.9, sz * (W / 2 - 0.3), '#ffffff', 0.3, 0.15);
  } else if (spec.kind === 'carriage') {
    // Victoria horse carriage: ornate white open carriage + horse
    const white = mat('#f6f2ea', { r: 0.35 }), red = mat('#a8182a', { r: 0.6 }), gold = mat('#d4a64a', { m: 0.8, r: 0.3 });
    add(new RoundedBoxGeometry(2.2, 0.7, 1.4, 3, 0.15), white, -1.0, 1.0, 0);
    add(new RoundedBoxGeometry(2.0, 0.25, 1.2, 2, 0.08), red, -1.0, 1.35, 0);
    const hood = add(new THREE.SphereGeometry(0.75, 16, 10, 0, Math.PI, 0, Math.PI / 2), white, -1.8, 1.4, 0); hood.rotation.y = Math.PI / 2; hood.scale.set(1, 1.1, 0.95);
    add(new THREE.TorusGeometry(0.6, 0.03, 6, 20, Math.PI), gold, -1.8, 1.4, 0).rotation.y = Math.PI / 2;
    for (const sz of [-1, 1]) { wheel(-1.6, sz * 0.78, 0.65, 0.08); wheel(-0.2, sz * 0.72, 0.45, 0.08); }
    add(new THREE.BoxGeometry(2.0, 0.06, 0.06), mat('#5a3a24'), 0.9, 1.0, 0.35); add(new THREE.BoxGeometry(2.0, 0.06, 0.06), mat('#5a3a24'), 0.9, 1.0, -0.35);
    const horse = buildAnimal('horse'); horse.position.set(1.6, 0, 0); horse.rotation.y = Math.PI / 2; root.add(horse); root.userData.horse = horse;
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}

// Merge a vehicle's static parts into one mesh per material (wheels/lights/horse stay separate).
function compact(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(), keep = [];
  for (const o of [...root.children]) {
    if (o.userData.wheel || o.userData.light || o.userData.kind || !o.isMesh) { keep.push(o); continue; }
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(g);
  }
  const out = new THREE.Group();
  for (const [m, list] of groups) { const me = new THREE.Mesh(mergeGeometries(list), m); me.castShadow = me.receiveShadow = true; out.add(me); }
  const lightGroups = new Map();
  for (const o of keep) {
    if (o.userData.light && o.userData.light !== 'siren' && o.isMesh) { const k = o.userData.light; if (!lightGroups.has(k)) lightGroups.set(k, { m: o.material, list: [] }); const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix); for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); lightGroups.get(k).list.push(g); }
    else out.add(o);
  }
  for (const [k, { m, list }] of lightGroups) { const me = new THREE.Mesh(mergeGeometries(list), m); me.userData.light = k; out.add(me); }
  return out;
}

/* ================================ ANIMALS ================================ */
const AN = {
  dog: { L: 0.7, H: 0.5, body: '#a8763e', legs: '#8a5a2a', head: 0.13 }, dog2: { L: 0.7, H: 0.5, body: '#2a2620', legs: '#1d1a16', head: 0.13 },
  cat: { L: 0.45, H: 0.3, body: '#e0903a', legs: '#c87a2a', head: 0.08, pat: 'stripes2' }, cat2: { L: 0.45, H: 0.3, body: '#8a8a92', legs: '#6a6a70', head: 0.08 },
  cow: { L: 1.9, H: 1.35, body: '#f0ece2', legs: '#d8d2c4', head: 0.22, hump: true, horns: true }, horse: { L: 2.0, H: 1.6, body: '#7a4a28', legs: '#5a3420', head: 0.2, mane: '#1d140c', neck: 1.2 },
  goat: { L: 0.9, H: 0.75, body: '#f2f2f0', legs: '#c9c9c4', head: 0.14, horns: true }, tiger: { L: 2.2, H: 1.0, body: '#e8801e', pat: 'tiger', legs: '#e07a1a', head: 0.24 },
  lion: { L: 2.1, H: 1.1, body: '#c99a48', legs: '#b88a3a', head: 0.24, mane: '#6a4420' }, zebra: { L: 1.9, H: 1.4, body: '#f4f4f4', pat: 'stripes', legs: '#f0f0f0', head: 0.2, mane: '#1d1b20', neck: 1 },
  deer: { L: 1.3, H: 1.1, body: '#b07a3c', legs: '#8a5a2a', head: 0.15, antler: true, neck: 0.9 }, rhino: { L: 2.8, H: 1.6, body: '#7c7c82', legs: '#6a6a70', head: 0.35, horn: true },
  hippo: { L: 2.8, H: 1.3, body: '#7a6a7a', legs: '#6a5a6a', head: 0.4 }, elephant: { L: 3.2, H: 2.8, body: '#7c7c84', legs: '#6c6c74', head: 0.55, trunk: true },
  giraffe: { L: 2.0, H: 2.4, body: '#e8b048', pat: 'spots', legs: '#d8a040', head: 0.18, neck: 2.6 },
};
export function buildAnimal(kind) {
  const g = new THREE.Group(); g.userData.kind = kind; g.userData.legs = [];
  if (kind === 'crow' || kind === 'peacock') {
    const bm = mat(kind === 'crow' ? '#18181c' : '#1f4fa8', { r: 0.4 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(kind === 'crow' ? 0.12 : 0.22, 12, 8), bm); b.scale.set(1, 0.8, 1.6); b.position.y = kind === 'crow' ? 0.15 : 0.45; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(kind === 'crow' ? 0.07 : 0.09, 10, 8), bm); h.position.set(0, b.position.y + 0.1, kind === 'crow' ? 0.16 : 0.3); g.add(h);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), mat(kind === 'crow' ? '#3a3a3a' : '#c8a060')); beak.rotation.x = Math.PI / 2; beak.position.set(0, h.position.y, h.position.z + 0.08); g.add(beak);
    if (kind === 'peacock') { const fan = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ map: pattern('spots', '#1f7a5a', '#2a4ab8'), side: THREE.DoubleSide, roughness: 0.4 })); fan.position.set(0, 0.5, -0.3); fan.rotation.x = -0.25; g.add(fan); for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35), mat('#8a6a3a')); l.position.set(sx * 0.06, 0.17, 0); g.add(l); } }
    else { const wings = []; for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.18), bm); w.position.set(sx * 0.14, 0.18, 0); g.add(w); wings.push(w); } g.userData.wings = wings; }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
  }
  if (kind === 'monkey') {
    const fm = mat('#8a6a48', { r: 0.9 }); const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), fm); body.scale.set(1, 1.3, 0.9); body.position.y = 0.32; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), fm); head.position.set(0, 0.62, 0.04); g.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mat('#e0b090')); face.position.set(0, 0.6, 0.11); face.scale.z = 0.6; g.add(face);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 12, Math.PI * 1.2), fm); tail.position.set(0, 0.3, -0.25); tail.rotation.y = Math.PI / 2; g.add(tail);
    for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.25, 4, 8), fm); a.position.set(sx * 0.16, 0.25, 0.05); g.add(a); g.userData.legs.push(a); }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
  }
  const A = AN[kind] || AN.dog;
  const bm = A.pat ? new THREE.MeshStandardMaterial({ map: A.pat === 'stripes2' ? pattern('stripes', A.body, '#c06a20') : pattern(A.pat, A.body, A.pat === 'spots' ? '#7a4a1a' : '#1d1b20'), roughness: 0.85 }) : mat(A.body, { r: 0.85 });
  const lm = mat(A.legs, { r: 0.85 });
  const legH = A.H * 0.52, bodyR = A.H * 0.22;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(bodyR, A.L - bodyR * 2, 6, 14), bm); body.rotation.x = Math.PI / 2; body.position.y = legH + bodyR * 0.6; g.add(body);
  if (A.hump) { const hump = new THREE.Mesh(new THREE.SphereGeometry(bodyR * 0.55, 10, 8), bm); hump.position.set(0, legH + bodyR * 1.5, A.L * 0.25); g.add(hump); }
  const neckLen = (A.neck || 0.6) * A.H * 0.45;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(bodyR * 0.35, bodyR * 0.55, neckLen, 10), bm); neck.position.set(0, legH + bodyR + neckLen * 0.35, A.L / 2 - bodyR * 0.4); neck.rotation.x = (A.neck || 0) > 2 ? 0.15 : 0.7; g.add(neck);
  const hy = legH + bodyR + neckLen * 0.75, hz = A.L / 2 + ((A.neck || 0) > 2 ? 0.1 : neckLen * 0.5);
  const head = new THREE.Mesh(new THREE.SphereGeometry(A.head, 14, 10), bm); head.scale.set(0.85, 0.9, 1.5); head.position.set(0, hy, hz); g.add(head); g.userData.head = head;
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(A.head * 0.12, 6, 6), mat('#0a0a0a', { r: 0.2 })); e.position.set(sx * A.head * 0.6, hy + A.head * 0.25, hz + A.head * 0.6); g.add(e); const ear = new THREE.Mesh(new THREE.ConeGeometry(A.head * 0.3, A.head * 0.6, 6), bm); ear.position.set(sx * A.head * 0.6, hy + A.head * 0.8, hz - A.head * 0.3); g.add(ear); }
  if (A.mane) { const mn = new THREE.Mesh(kind === 'lion' ? new THREE.SphereGeometry(A.head * 1.4, 12, 10) : new THREE.BoxGeometry(0.06, neckLen * 0.9, 0.2), mat(A.mane, { r: 1 })); if (kind === 'lion') mn.position.set(0, hy, hz - A.head * 0.5); else { mn.position.copy(neck.position); mn.position.y += 0.08; mn.rotation.x = neck.rotation.x; } g.add(mn); }
  if (A.horns) for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 6), mat('#d8c8a0')); h.position.set(sx * A.head * 0.5, hy + A.head, hz - 0.05); h.rotation.z = -sx * 0.5; g.add(h); }
  if (A.horn) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), mat('#c8c0b0')); h.position.set(0, hy + A.head * 0.5, hz + A.head * 1.1); h.rotation.x = 0.4; g.add(h); }
  if (A.antler) for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.4), mat('#6a4a2a')); a.position.set(sx * 0.08, hy + 0.3, hz - 0.05); a.rotation.z = -sx * 0.4; g.add(a); }
  if (A.trunk) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 1.4, 10), bm); t.position.set(0, hy - 0.7, hz + A.head * 0.9); t.rotation.x = -0.15; g.add(t); for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CircleGeometry(0.45, 14), new THREE.MeshStandardMaterial({ color: A.body, side: THREE.DoubleSide, roughness: 0.9 })); ear.position.set(sx * 0.42, hy, hz - 0.3); ear.rotation.y = sx * 1.2; g.add(ear); } }
  const isCat = kind === 'cat' || kind === 'cat2';
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(isCat ? 0.012 : 0.02, isCat ? 0.016 : 0.035, A.H * (isCat ? 1.0 : 0.45), 6), bm); tail.position.set(0, legH + bodyR * (isCat ? 1.6 : 0.6), -A.L / 2 - 0.02); tail.rotation.x = isCat ? 0.35 : -0.5; g.add(tail);
  for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(lx * bodyR * 0.6, legH, lz * (A.L / 2 - bodyR * 0.7));
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(bodyR * 0.25, bodyR * 0.18, legH, 8), lm); leg.position.y = -legH / 2; pivot.add(leg);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(bodyR * 0.2, bodyR * 0.22, 0.05, 8), mat('#2a2018')); hoof.position.y = -legH + 0.02; pivot.add(hoof);
    g.add(pivot); g.userData.legs.push(pivot);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function animateAnimal(g, t, moving, flying) {
  const L = g.userData.legs;
  if (g.userData.wings) { const f = flying ? Math.sin(t * 25) * 0.8 : 0; g.userData.wings[0].rotation.z = f; g.userData.wings[1].rotation.z = -f; return; }
  L.forEach((l, i) => { l.rotation.x = moving ? Math.sin(t * 8 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45 : 0; });
  if (g.userData.head && !moving) g.userData.head.rotation.y = Math.sin(t * 0.7) * 0.3;
}

/* ================================ VEGETATION ================================ */
function jitter(geo, amt, seed) { const r = mulberry(seed); const p = geo.attributes.position; const map = new Map(); for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!map.has(k)) map.set(k, [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt]); const d = map.get(k); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]); } geo.computeVertexNormals(); return geo; }
function colorize(geo, cols, seed, flowerCol, flowerAmt = 0) {
  // smooth colour field from position so canopies read as soft foliage, not facets
  const n = geo.attributes.position.count, p = geo.attributes.position; const c = new Float32Array(n * 3); const tmp = new THREE.Color(), a = new THREE.Color(cols[0]), b = new THREE.Color(cols[cols.length - 1]), fl = flowerCol ? new THREE.Color(flowerCol) : null;
  const o = seed * 1.7;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const v = 0.5 + 0.25 * Math.sin(x * 1.9 + o) * Math.cos(z * 1.7 - o) + 0.25 * Math.sin(y * 2.3 + x * 0.7);
    tmp.copy(a).lerp(b, v); tmp.offsetHSL(0, 0, (y - 4) * 0.012);
    if (fl && Math.sin(x * 3.1 + o) * Math.sin(z * 2.9 + y * 2.2) > 1 - flowerAmt * 2) tmp.lerp(fl, 0.85);
    c.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo;
}
export function treeGeometries(kind, seed = 1) {
  const r = mulberry(seed * 13 + kind.length);
  const trunks = [], leaves = [];
  if (kind === 'palm') {
    const segs = 7; for (let i = 0; i < segs; i++) { const t = new THREE.CylinderGeometry(0.16, 0.19, 1.0, 8); t.translate(Math.sin(i * 0.3) * 0.15, 0.5 + i, 0); trunks.push(t); }
    for (let k = 0; k < 9; k++) { const f = new THREE.ConeGeometry(0.35, 3.2, 4, 1); f.rotateX(Math.PI / 2); f.scale(1, 0.12, 1); f.translate(0, 0, 1.5); f.rotateX(0.55 + r() * 0.3); f.rotateY((k / 9) * Math.PI * 2); f.translate(0.8, segs + 0.1, 0); leaves.push(f.toNonIndexed()); }
  } else {
    const big = kind === 'banyan', H = big ? 3.2 : 2.6 + r() * 1.2;
    const t = new THREE.CylinderGeometry(big ? 0.45 : 0.18, big ? 0.6 : 0.28, H, 9); t.translate(0, H / 2, 0); trunks.push(t);
    for (let b = 0; b < 3; b++) { const br = new THREE.CylinderGeometry(0.06, 0.12, 1.6, 6); br.translate(0, 0.8, 0); br.rotateZ(0.7); br.rotateY(b * 2.1 + r()); br.translate(0, H * 0.8, 0); trunks.push(br); }
    if (big) for (let k = 0; k < 10; k++) { const a = new THREE.CylinderGeometry(0.03, 0.05, 4.5, 5); a.translate((r() - 0.5) * 7, 2.25, (r() - 0.5) * 7); trunks.push(a); }
    const clusters = big ? 11 : 6 + ((r() * 3) | 0), spread = big ? 4.5 : kind === 'ashoka' ? 1.2 : 2.3;
    for (let k = 0; k < clusters; k++) { const rad = (big ? 2.2 : 1.3) * (0.7 + r() * 0.5); let s = mergeVertices(new THREE.IcosahedronGeometry(rad, 2)); jitter(s, rad * 0.3, seed * 31 + k); s.computeVertexNormals(); s.translate((r() - 0.5) * spread * 2, H + (kind === 'ashoka' ? k * 0.9 : 0.6 + r() * 1.6), (r() - 0.5) * spread * 2); leaves.push(s); }
  }
  const tg = mergeGeometries(trunks.map((g) => g.index ? g.toNonIndexed() : g)); const lg = mergeGeometries(leaves);
  const cols = kind === 'palm' ? ['#3a7a2a', '#4f9a34', '#2f6a22'] : kind === 'banyan' ? ['#2a5a22', '#346a2a', '#3f7a30'] : ['#3a7224', '#4a8a2e', '#5a9a38', '#2f6220'];
  colorize(lg, cols, seed, kind === 'krishnachura' ? '#e8401e' : null, 0.35);
  return { trunk: tg, leaves: lg };
}
export const LEAF_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: false });
export const BARK_MAT = new THREE.MeshStandardMaterial({ map: barkTexture(), roughness: 0.95 });

/* ================================ PROPS (merged single geometries) ================================ */
export function propGeometry(kind) {
  const parts = []; // [geometry, colour]
  const box = (w, h, d, x, y, z, col) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); parts.push([g, col]); };
  const cyl = (rt, rb, h, x, y, z, col, seg = 10) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); parts.push([g, col]); };
  switch (kind) {
    case 'lamp': cyl(0.06, 0.09, 5, 0, 2.5, 0, '#2a3440'); box(0.08, 0.08, 1.2, 0, 5, 0.55, '#2a3440'); box(0.3, 0.12, 0.5, 0, 4.92, 1.1, '#3a4450'); break;
    case 'bench': box(1.6, 0.06, 0.45, 0, 0.45, 0, '#8a5a32'); box(1.6, 0.4, 0.05, 0, 0.7, -0.2, '#8a5a32'); for (const x of [-0.7, 0.7]) box(0.06, 0.45, 0.45, x, 0.22, 0, '#2a2a2e'); break;
    case 'rail': box(2, 0.04, 0.04, 0, 1.0, 0, '#1d1d22'); box(2, 0.04, 0.04, 0, 0.15, 0, '#1d1d22'); for (let k = 0; k < 8; k++) { box(0.025, 1.0, 0.025, -0.95 + k * 0.27, 0.55, 0, '#1d1d22'); box(0.05, 0.08, 0.05, -0.95 + k * 0.27, 1.07, 0, '#c9a24a'); } break;
    case 'fence': box(2, 0.08, 0.04, 0, 0.75, 0, '#f2f2f2'); box(2, 0.08, 0.04, 0, 0.35, 0, '#f2f2f2'); box(0.08, 0.9, 0.08, -0.9, 0.45, 0, '#e2e2e2'); box(0.08, 0.9, 0.08, 0.9, 0.45, 0, '#e2e2e2'); break;
    case 'cage': box(2, 0.06, 0.06, 0, 2.2, 0, '#4a4a52'); for (let k = 0; k < 7; k++) box(0.03, 2.2, 0.03, -0.9 + k * 0.3, 1.1, 0, '#4a4a52'); break;
    case 'hedge': box(2, 1.0, 0.9, 0, 0.5, 0, '#2f6a28'); break;
    case 'bush': { const g = new THREE.IcosahedronGeometry(0.8, 1); jitter(g, 0.3, 3); g.scale(1, 0.75, 1); g.translate(0, 0.5, 0); parts.push([g, '#336e28']); break; }
    case 'statue': box(1.4, 1.6, 1.4, 0, 0.8, 0, '#d8d0c0'); cyl(0.25, 0.32, 1.6, 0, 2.4, 0, '#5a5a48'); { const h = new THREE.SphereGeometry(0.22, 12, 10); h.translate(0, 3.4, 0); parts.push([h, '#5a5a48']); } break;
    case 'fountain': cyl(2.2, 2.4, 0.5, 0, 0.25, 0, '#d8d0c0', 24); cyl(1.9, 1.9, 0.05, 0, 0.48, 0, '#5cc8f0', 24); cyl(0.2, 0.3, 1.6, 0, 1.0, 0, '#d8d0c0'); cyl(0.8, 0.5, 0.2, 0, 1.8, 0, '#d8d0c0', 16); break;
    case 'goal': box(0.12, 2.4, 0.12, 0, 1.2, -3.6, '#f4f4f4'); box(0.12, 2.4, 0.12, 0, 1.2, 3.6, '#f4f4f4'); box(0.12, 0.12, 7.3, 0, 2.4, 0, '#f4f4f4'); break;
    case 'grave': box(0.7, 1.0, 0.25, 0, 0.5, 0, '#b8b4a8'); box(0.9, 0.15, 1.6, 0, 0.07, 0.7, '#a8a498'); break;
    case 'flag': cyl(0.05, 0.06, 7, 0, 3.5, 0, '#9aa0a8'); box(1.5, 0.33, 0.02, 0.78, 6.6, 0, '#ff9933'); box(1.5, 0.33, 0.02, 0.78, 6.27, 0, '#ffffff'); box(1.5, 0.33, 0.02, 0.78, 5.94, 0, '#138808'); break;
    case 'busstop': box(3, 0.08, 1.4, 0, 2.5, 0, '#2a6ac0'); for (const x of [-1.4, 1.4]) box(0.08, 2.5, 0.08, x, 1.25, -0.6, '#6a6a70'); box(2.6, 0.06, 0.45, 0, 0.5, -0.4, '#8a5a32'); box(3, 1.4, 0.04, 0, 1.6, -0.68, '#9fd4f0'); break;
    case 'umbrella': { const g = new THREE.ConeGeometry(1.4, 0.5, 12); g.translate(0, 2.5, 0); parts.push([g, '#e05a5a']); cyl(0.04, 0.04, 2.5, 0, 1.25, 0, '#9a9a9a'); box(0.7, 0.3, 1.8, 0.9, 0.15, 0, '#f4f4f4'); break; }
    case 'slide': box(0.8, 3, 0.8, -2, 1.5, 0, '#d8d0c0'); { const g = new THREE.BoxGeometry(5, 0.1, 0.8); g.rotateZ(-0.5); g.translate(0.2, 1.6, 0); parts.push([g, '#f2a33c']); } break;
    case 'boat': box(2.6, 0.4, 1.0, 0, 0.1, 0, '#c0283a'); box(2.4, 0.1, 0.8, 0, 0.32, 0, '#f2f2f2'); break;
    case 'flowerbed': box(2, 0.3, 0.9, 0, 0.15, 0, '#6a4a2a'); for (let k = 0; k < 6; k++) { const g = new THREE.IcosahedronGeometry(0.2, 0); g.translate(-0.8 + k * 0.32, 0.4, (k % 2) * 0.3 - 0.15); parts.push([g, ['#f05a7a', '#ffd94a', '#ff9a3c'][k % 3]]); } break;
    case 'atm': box(0.8, 1.9, 0.6, 0, 0.95, 0, '#2a4a8a'); box(0.6, 0.4, 0.02, 0, 1.3, 0.31, '#9fd4f0'); break;
    case 'hydrant': cyl(0.12, 0.14, 0.7, 0, 0.35, 0, '#c0283a'); break;
    case 'teestall': box(2, 1.0, 1.0, 0, 0.5, 0, '#6a4a2a'); box(2.4, 0.08, 1.4, 0, 2.2, 0, '#2a6a3a'); for (const x of [-1.1, 1.1]) box(0.06, 2.2, 0.06, x, 1.1, 0.6, '#3a3a3a'); cyl(0.12, 0.12, 0.3, 0.5, 1.15, 0, '#9a9aa2'); break;
    case 'tramstop': cyl(0.05, 0.05, 2.6, 0, 1.3, 0, '#5a5a62'); box(0.8, 0.4, 0.04, 0, 2.6, 0, '#2a8a5a'); break;
    case 'banyan': case 'tree': case 'palm': return null;
    default: box(0.5, 0.5, 0.5, 0, 0.25, 0, '#888888');
  }
  const geos = parts.map(([g, col]) => { const ng = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(col); const arr = new Float32Array(ng.attributes.position.count * 3); for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i); ng.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return ng; });
  return mergeGeometries(geos);
}
export const PROP_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 });

/* Cheap pedestrian for crowds far from the camera: 6 meshes, animated legs. */
const SG = { body: new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), leg: new THREE.CapsuleGeometry(0.07, 0.62, 3, 8), head: new THREE.SphereGeometry(0.115, 12, 10), hair: new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5) };
SG.leg.translate(0, -0.38, 0);
export class SimpleHuman {
  constructor(app) {
    this.root = new THREE.Group(); this.t = Math.random() * 6; this.app = app;
    const top = it(app.top), bot = it(app.bottom); const s = app.gender === 'f' ? 0.966 : 1;
    const g = new THREE.Group(); g.scale.setScalar(s); this.root.add(g);
    const add = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); me.castShadow = true; g.add(me); return me; };
    add(SG.body, mat(top.c[0] || '#888', { r: 0.8 }), 0, 1.22, 0, 1.05, 1, 0.7);
    this.legs = [-1, 1].map((sx) => { const p = new THREE.Group(); p.position.set(sx * 0.09, 0.92, 0); g.add(p); const l = new THREE.Mesh(SG.leg, ['skirt', 'shorts'].includes(bot.style) || top.style === 'dress' ? mat(app.skin) : mat(bot.c[0] || '#333', { r: 0.85 })); l.castShadow = true; p.add(l); return p; });
    if (top.style === 'saree' || top.style === 'dress' || top.style === 'kurta') add(new THREE.CylinderGeometry(0.18, top.style === 'kurta' ? 0.24 : 0.28, top.style === 'saree' ? 0.85 : 0.5, 12, 1, true), mat(top.c[0], { r: 0.7 }), 0, top.style === 'saree' ? 0.55 : 0.75, 0, 1, 1, 0.8);
    add(SG.head, mat(app.skin, { r: 0.6 }), 0, 1.62, 0, 0.9, 1.05, 0.95);
    add(SG.hair, mat(app.hairColor, { r: 0.8 }), 0, 1.64, -0.01).rotation.x = -0.35;
    if (['long', 'wavy', 'braid', 'ponytail'].includes(app.hair)) add(new THREE.BoxGeometry(0.22, 0.4, 0.06), mat(app.hairColor, { r: 0.8 }), 0, 1.45, -0.09);
  }
  animate(dt, state, speed) {
    this.t += dt * (speed * 2.6 + 0.01); const a = Math.min(1, speed / 1.5) * 0.55;
    if (state === 'ko') { this.root.children[0].rotation.z = Math.PI / 2; this.root.children[0].position.set(0.9, 0.15, 0); return; }
    this.root.children[0].rotation.z = 0; this.root.children[0].position.set(0, 0, 0);
    this.legs[0].rotation.x = Math.sin(this.t) * a; this.legs[1].rotation.x = -Math.sin(this.t) * a;
  }
}
export { bodyGeo, buildHair, buildGlasses, buildHat, clothMat, it };

/* ================================ HELICOPTER ================================ */
export function buildHeli(police) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: police ? '#f2f2f2' : '#c8202a', metalness: 0.5, roughness: 0.3, clearcoat: 1 });
  const dark = mat('#1d1d22', { r: 0.5, m: 0.4 }), glass = new THREE.MeshPhysicalMaterial({ color: '#1a2a38', metalness: 0.3, roughness: 0.05, transparent: true, opacity: 0.85 });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); me.scale.set(sx, sy, sz); me.castShadow = true; g.add(me); return me; };
  add(new THREE.SphereGeometry(1, 24, 16), paint, 0, 1.45, 0.2, 0, 0, 0, 1.05, 0.95, 1.9);
  add(new THREE.SphereGeometry(0.9, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), glass, 0, 1.55, 1.15, -1.0, 0, 0, 0.95, 1, 0.9);
  add(new THREE.CylinderGeometry(0.16, 0.3, 4.2, 12), paint, 0, 1.75, -2.6, Math.PI / 2 + 0.06);
  add(new THREE.BoxGeometry(0.08, 1.1, 0.7), paint, 0, 2.15, -4.6);
  add(new THREE.BoxGeometry(1.4, 0.06, 0.4), paint, 0, 1.75, -4.3);
  for (const sx of [-1, 1]) { add(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 8), dark, sx * 0.85, 0.12, 0.2, Math.PI / 2); for (const z of [-0.5, 0.9]) add(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), dark, sx * 0.7, 0.45, z, 0, 0, sx * 0.35); }
  if (police) { add(new THREE.BoxGeometry(2.1, 0.25, 0.02), mat('#2a5ad4'), 0, 1.35, 0.2).scale.set(1, 1, 1); for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.25, 3.0), mat('#2a5ad4'), sx * 1.04, 1.35, 0.2); }
  add(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 10), dark, 0, 2.55, 0.1);
  const rotor = new THREE.Group(); rotor.position.set(0, 2.8, 0.1); g.add(rotor);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 5.2), dark); b.position.z = 2.6; const arm = new THREE.Group(); arm.rotation.y = (k / 4) * Math.PI * 2; arm.add(b); rotor.add(arm); }
  const tail = new THREE.Group(); tail.position.set(0.1, 2.15, -4.65); g.add(tail);
  for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.2, 0.12), dark); b.rotation.x = k * Math.PI / 2; tail.add(b); }
  g.userData.rotor = rotor; g.userData.tail = tail;
  return g;
}
