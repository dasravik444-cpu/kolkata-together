// Turns the Kolkata map data (js/mapgen.js) and interior layouts into a 3D scene.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TL } from '../js/art.js';
import { mulberry, shade } from '../js/util.js';
import { groundTexture, groundNormal, facade, shopfront, roofTexture, signTexture, waterNormal, interiorFloor, BAY_W, FLOOR_H, pattern, toTex, cv } from './textures.js';
import { M, mat, treeGeometries, LEAF_MAT, BARK_MAT, propGeometry, PROP_MAT, buildVehicle } from './models.js';

export const TS = 2; // metres per tile
// raised walkable ground (landmark plinths, steps) so people stand on top instead of sinking in
let LIFT = null, LIFT_W = 0;
function liftRect(x0, z0, x1, z1, h) { if (!LIFT) return; for (let tz = Math.floor(z0 / TS); tz < Math.ceil(z1 / TS); tz++) for (let tx = Math.floor(x0 / TS); tx < Math.ceil(x1 / TS); tx++) { const i = tz * LIFT_W + tx; if (i >= 0 && i < LIFT.length) LIFT[i] = Math.max(LIFT[i], typeof h === 'function' ? h(tz * TS + TS / 2) : h); } }
const SIDEWALK_H = 0.16;

/* ------------------------------ batching ------------------------------ */
class Batcher {
  constructor() { this.map = new Map(); }
  add(geo, material, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!this.map.has(material)) this.map.set(material, []);
    this.map.get(material).push(g);
  }
  build(parent, { cast = true, receive = true } = {}) {
    for (const [m, list] of this.map) {
      for (let i = 0; i < list.length; i += 400) { // chunk huge merges
        const mesh = new THREE.Mesh(mergeGeometries(list.slice(i, i + 400)), m);
        mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        parent.add(mesh);
      }
    }
    this.map.clear();
  }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
const mtx = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)).clone();

/* ------------------------------ ground ------------------------------ */
const GROUND_KIND = {
  [TL.GRASS]: 'grass', [TL.GRASSIN]: 'grass', [TL.FLOWERS]: 'flowers', [TL.TALLGRASS]: 'tallgrass', [TL.ROAD]: 'road', [TL.DASH_H]: 'dashH', [TL.DASH_V]: 'dashV',
  [TL.LANE_H]: 'laneH', [TL.LANE_V]: 'laneV', [TL.ZEBRA_H]: 'zebraH', [TL.ZEBRA_V]: 'zebraV', [TL.TRAM]: 'tram', [TL.BRIDGE]: 'bridge', [TL.SIDEWALK]: 'sidewalk',
  [TL.PLAZA]: 'plaza', [TL.MARBLE]: 'marble', [TL.PATH]: 'path', [TL.DIRT]: 'dirt', [TL.TRACK]: 'track', [TL.FAIRWAY]: 'fairway', [TL.GREEN]: 'green',
  [TL.BUNKER]: 'sand', [TL.SAND]: 'sand', [TL.PITCH]: 'pitch', [TL.PITCH_LINE]: 'pitchLine', [TL.DECK]: 'deck', [TL.PARK]: 'road',
};
const NO_ROT = new Set(['dashH', 'dashV', 'laneH', 'laneV', 'zebraH', 'zebraV', 'tram', 'pitchLine', 'sidewalk', 'plaza', 'deck', 'bridge', 'marble']);
const ROADISH = new Set([TL.ROAD, TL.DASH_H, TL.DASH_V, TL.LANE_H, TL.LANE_V, TL.ZEBRA_H, TL.ZEBRA_V, TL.TRAM, TL.PARK]);
const WATERS = new Set([TL.WATER, TL.SHALLOW, TL.POOL]);
export function heightAt(S, tx, ty) { const t = S.ground[ty * S.W + tx]; if (t === TL.SIDEWALK) return SIDEWALK_H; if (t === TL.DECK) return 0.25; if (WATERS.has(t)) return -1.6; return 0; }

function quadArrays() { return { pos: [], uv: [], nrm: [] }; }
function pushQuad(A, x0, z0, x1, z1, y, rot = 0) {
  const uvs = [[0, 1], [1, 1], [1, 0], [0, 0]]; for (let k = 0; k < rot; k++) uvs.push(uvs.shift());
  const P = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
  for (const i of [0, 3, 1, 1, 3, 2]) { A.pos.push(...P[i]); A.uv.push(...uvs[i]); A.nrm.push(0, 1, 0); }
}
function pushWall(A, x0, z0, x1, z1, yb, yt, nx, nz, uScale = 1) {
  const P = [[x0, yb, z0], [x1, yb, z1], [x1, yt, z1], [x0, yt, z0]], U = [[0, 0], [uScale, 0], [uScale, (yt - yb) / TS], [0, (yt - yb) / TS]];
  for (const i of [0, 1, 2, 0, 2, 3]) { A.pos.push(...P[i]); A.uv.push(...U[i]); A.nrm.push(nx, 0, nz); }
}
function arraysToMesh(A, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(A.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(A.nrm, 3));
  const m = new THREE.Mesh(g, material); m.receiveShadow = true; m.matrixAutoUpdate = false; return m;
}
const groundMats = {};
function groundMat(kind) {
  if (groundMats[kind]) return groundMats[kind];
  const k = kind === 'pitch' ? 'pitchA' : kind;
  const rough = { road: 0.9, sidewalk: 0.95, marble: 0.35, deck: 0.8, poolTile: 0.3, bridge: 0.85 }[kind.replace(/[HV]$/, '')] ?? 0.95;
  const m = new THREE.MeshStandardMaterial({ map: groundTexture(k), normalMap: ['grass', 'flowers', 'tallgrass'].includes(k) ? null : groundNormal(k), normalScale: new THREE.Vector2(0.6, 0.6), roughness: rough, metalness: 0 });
  return (groundMats[kind] = m);
}
function buildGround(S, root, interior = false, pal = {}) {
  const buckets = {}, curbs = quadArrays(), banks = quadArrays(), waterA = quadArrays(), poolA = quadArrays(), bedA = quadArrays();
  const r = mulberry(7);
  const tAt = (x, y) => (x < 0 || y < 0 || x >= S.W || y >= S.H ? -1 : S.ground[y * S.W + x]);
  for (let ty = 0; ty < S.H; ty++) for (let tx = 0; tx < S.W; tx++) {
    const t = tAt(tx, ty); const x0 = tx * TS, z0 = ty * TS, x1 = x0 + TS, z1 = z0 + TS;
    if (interior) {
      if (t === TL.WALL || t === TL.WALLTOP || t === TL.VOID) continue;
      const kind = { [TL.WOOD]: 'wood', [TL.DARKWOOD]: 'darkwood', [TL.CHECKER]: 'checker', [TL.IMARBLE]: 'imarble', [TL.CARPET]: 'carpet', [TL.MALLFLOOR]: 'mall', [TL.PINK]: 'pink', [TL.TILEBLUE]: 'tileblue', [TL.RUG]: 'rug', [TL.STAGE]: 'stage', [TL.PLAZA]: 'plaza', [TL.GRASSIN]: 'grass', [TL.DIRT]: 'dirt', [TL.SHALLOW]: 'water' }[t] || 'wood';
      if (kind === 'water') { pushQuad(waterA, x0, z0, x1, z1, 0.05); continue; }
      (buckets[kind] = buckets[kind] || quadArrays()); pushQuad(buckets[kind], x0, z0, x1, z1, t === TL.STAGE ? 0.3 : 0.0);
      continue;
    }
    if (WATERS.has(t)) {
      pushQuad(t === TL.POOL ? poolA : bedA, x0, z0, x1, z1, t === TL.POOL ? -1.2 : -1.6);
      pushQuad(t === TL.POOL ? poolA : waterA, x0, z0, x1, z1, t === TL.POOL ? -0.15 : -0.35);
      for (const [dx, dy, a, b, c, d, nx, nz] of [[-1, 0, x0, z0, x0, z1, 1, 0], [1, 0, x1, z1, x1, z0, -1, 0], [0, -1, x1, z0, x0, z0, 0, 1], [0, 1, x0, z1, x1, z1, 0, -1]]) {
        const n = tAt(tx + dx, ty + dy); if (n >= 0 && !WATERS.has(n)) pushWall(banks, a, b, c, d, -1.6, n === TL.SIDEWALK ? SIDEWALK_H : 0.02, nx, nz);
      }
      continue;
    }
    let kind = GROUND_KIND[t] || 'grass'; if (kind === 'pitch') kind = tx % 2 ? 'pitchB' : 'pitchA';
    const y = t === TL.SIDEWALK ? SIDEWALK_H : t === TL.DECK ? 0.25 : 0;
    (buckets[kind] = buckets[kind] || quadArrays()); pushQuad(buckets[kind], x0, z0, x1, z1, y, NO_ROT.has(kind) ? 0 : (r() * 4) | 0);
    if (t === TL.SIDEWALK) for (const [dx, dy, a, b, c, d, nx, nz] of [[-1, 0, x0, z1, x0, z0, -1, 0], [1, 0, x1, z0, x1, z1, 1, 0], [0, -1, x0, z0, x1, z0, 0, -1], [0, 1, x1, z1, x0, z1, 0, 1]]) {
      const n = tAt(tx + dx, ty + dy); if (n >= 0 && n !== TL.SIDEWALK && !WATERS.has(n)) pushWall(curbs, a, b, c, d, 0, SIDEWALK_H, nx, nz);
    }
  }
  for (const [kind, A] of Object.entries(buckets)) root.add(arraysToMesh(A, interior ? new THREE.MeshStandardMaterial({ map: interiorFloor(kind, pal), roughness: ['imarble', 'mall', 'checker', 'pink', 'tileblue'].includes(kind) ? 0.25 : 0.8 }) : groundMat(kind)));
  if (curbs.pos.length) root.add(arraysToMesh(curbs, mat('#9a968c', { r: 0.9 })));
  if (banks.pos.length) root.add(arraysToMesh(banks, new THREE.MeshStandardMaterial({ map: groundTexture('plaza'), color: '#9a9080', roughness: 0.95 })));
  if (bedA.pos.length) root.add(arraysToMesh(bedA, mat('#3a4a3a', { r: 1 })));
  const waters = [];
  if (waterA.pos.length) { const wm = new THREE.MeshStandardMaterial({ color: interior ? '#4a8aa8' : '#3d6f7a', roughness: 0.06, metalness: 0.1, normalMap: waterNormal(), normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.88 }); wm.normalMap.repeat.set(1, 1); const w = arraysToMesh(waterA, wm); root.add(w); waters.push(wm); }
  if (poolA.pos.length) { const pm = new THREE.MeshStandardMaterial({ map: groundTexture('poolTile'), roughness: 0.3 }); const pmW = new THREE.MeshStandardMaterial({ color: '#58c8e8', roughness: 0.05, normalMap: waterNormal(), normalScale: new THREE.Vector2(0.25, 0.25), transparent: true, opacity: 0.7 }); const g = arraysToMesh(poolA, pmW); root.add(g); waters.push(pmW); void pm; }
  return waters;
}

/* ------------------------------ buildings ------------------------------ */
const facadeMats = new Map();
function facadeMat(style, wall, seed, shutter) {
  const f = facade(style, wall, seed, shutter); const key = f.map.uuid;
  if (facadeMats.has(key)) return facadeMats.get(key);
  const m = f.glass ? new THREE.MeshPhysicalMaterial({ map: f.map, emissiveMap: f.emissive, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.12, metalness: 0.65, envMapIntensity: 1.3 })
    : new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.88 });
  m.userData.night = true; facadeMats.set(key, m); return m;
}
const nightMats = []; // materials whose emissive follows day/night
function nightMat(m, dayI = 0, nightI = 1) { m.userData.dayI = dayI; m.userData.nightI = nightI; if (!nightMats.includes(m)) nightMats.push(m); return m; }

function box(B, material, x, y, z, w, h, d, ry = 0) { B.add(new THREE.BoxGeometry(w, h, d), material, mtx(x, y, z, ry)); }

const ACC = new Map(); // material -> quad arrays, merged into one mesh per material at the end
function acc(m) { if (!ACC.has(m)) ACC.set(m, quadArrays()); return ACC.get(m); }
const roofMats = {};
function buildBuilding(b, B, root, lamps) {
  const x0 = b.x * TS, z0 = b.y * TS, W = b.w * TS, D = b.h * TS, cx = x0 + W / 2, cz = z0 + D / 2;
  const style = b.style || 'shop';
  const r = mulberry(b.seed || 3);
  const floors = Math.max(2, (b.floors || 2) + (style === 'tower' ? 2 : 0) + (style === 'house' ? (r() * 2) | 0 : 0));
  const H = floors * FLOOR_H + (style === 'mall' ? 2 : 0);
  const ins = 0.15; const X0 = x0 + ins, X1 = x0 + W - ins, Z0 = z0 + ins, Z1 = z0 + D - ins;
  const wall = b.wall || '#e8d4a8';
  const fm = facadeMat(style === 'shop' ? 'house' : style, wall, b.seed || 1, b.shutter || '#3f7a4a');
  nightMat(fm, 0, 0.55);
  const shopFront = !!b.interior && style !== 'tower' && style !== 'mall';
  const A = acc(fm);
  const bays = (len) => len / BAY_W / 4;
  const baseY = shopFront ? FLOOR_H : 0;
  // facade walls (texture repeats every 4 bays x 2 floors)
  const wallQuad = (Aq, xa, za, xb, zb, yb, yt, nx, nz) => { const len = Math.hypot(xb - xa, zb - za); const P = [[xa, yb, za], [xb, yb, zb], [xb, yt, zb], [xa, yt, za]]; const U = [[0, yb / FLOOR_H / 2], [bays(len), yb / FLOOR_H / 2], [bays(len), yt / FLOOR_H / 2], [0, yt / FLOOR_H / 2]]; for (const i of [0, 1, 2, 0, 2, 3]) { Aq.pos.push(...P[i]); Aq.uv.push(...U[i]); Aq.nrm.push(nx, 0, nz); } };
  wallQuad(A, X0, Z1, X1, Z1, baseY, H, 0, 1); // south (front)
  wallQuad(A, X1, Z0, X0, Z0, 0, H, 0, -1);
  wallQuad(A, X0, Z0, X0, Z1, 0, H, -1, 0);
  wallQuad(A, X1, Z1, X1, Z0, 0, H, 1, 0);
  if (shopFront) {
    const sf = shopfront(wall, b.awning || '#c0283a', b.seed || 1);
    const sm = sf.mat || (sf.mat = nightMat(new THREE.MeshStandardMaterial({ map: sf.map, emissiveMap: sf.emissive, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.7 }), 0.02, 0.5));
    const S2 = acc(sm); const len = X1 - X0; const P = [[X0, 0, Z1], [X1, 0, Z1], [X1, FLOOR_H, Z1], [X0, FLOOR_H, Z1]], U = [[0, 0], [len / 12.8, 0], [len / 12.8, 1], [0, 1]];
    for (const i of [0, 1, 2, 0, 2, 3]) { S2.pos.push(...P[i]); S2.uv.push(...U[i]); S2.nrm.push(0, 0, 1); }
    sf.map.wrapS = THREE.RepeatWrapping;
    // awning
    const awc = b.awning || '#c0283a'; const aw = roofMats['aw' + awc] || (roofMats['aw' + awc] = new THREE.MeshStandardMaterial({ map: pattern('stripes', awc, '#f2f2ee'), roughness: 0.8, side: THREE.DoubleSide }));
    B.add(new THREE.PlaneGeometry(Math.min(len, 9), 1.4), aw, mtx(b.door.x * TS + TS / 2, FLOOR_H - 0.2, Z1 + 0.6, 0, 1, 1, 1, -Math.PI / 2 + 0.45));
  }
  // roof, parapet, rooftop clutter
  const rc = shade(wall, -0.25); const roofM = roofMats[rc] || (roofMats[rc] = new THREE.MeshStandardMaterial({ map: roofTexture(rc), roughness: 0.95 }));
  { const R2 = acc(roofM); const P = [[X0, H, Z0], [X1, H, Z0], [X1, H, Z1], [X0, H, Z1]]; for (const i of [0, 3, 1, 1, 3, 2]) { R2.pos.push(...P[i]); R2.uv.push(P[i][0] / 6, P[i][2] / 6); R2.nrm.push(0, 1, 0); } }
  const pm = mat(shade(wall, -0.08), { r: 0.9 });
  box(B, pm, cx, H + 0.45, Z0 + 0.12, X1 - X0, 0.9, 0.25); box(B, pm, cx, H + 0.45, Z1 - 0.12, X1 - X0, 0.9, 0.25); box(B, pm, X0 + 0.12, H + 0.45, cz, 0.25, 0.9, Z1 - Z0); box(B, pm, X1 - 0.12, H + 0.45, cz, 0.25, 0.9, Z1 - Z0);
  box(B, mat(shade(wall, 0.15), { r: 0.85 }), cx, H - 0.1, Z1 + 0.05, X1 - X0 + 0.3, 0.35, 0.3); // cornice
  if (style !== 'mall' && style !== 'tower') {
    const n = Math.max(1, Math.round(W * D / 120));
    for (let i = 0; i < n; i++) { const tx = X0 + 1.5 + r() * (X1 - X0 - 3), tz = Z0 + 1.5 + r() * (Z1 - Z0 - 3); if (r() < 0.65) { B.add(new THREE.CylinderGeometry(0.75, 0.75, 1.5, 14), mat('#1d1d20', { r: 0.6 }), mtx(tx, H + 0.75 + 0.6, tz)); B.add(new THREE.BoxGeometry(1.6, 0.6, 1.6), mat('#8a8680'), mtx(tx, H + 0.3, tz)); } else box(B, mat('#c8c8c4', { r: 0.5, m: 0.3 }), tx, H + 0.4, tz, 1.0, 0.8, 0.7); }
    if (r() < 0.5) for (let k = 0; k < 3; k++) box(B, mat(['#d84a4a', '#4a7ad8', '#f2f2f2'][k], { r: 0.9 }), X0 + 2 + k * 0.7, H + 1.0, Z0 + 1.2, 0.5, 0.9, 0.02); // laundry
  } else { for (let i = 0; i < W / 4; i++) box(B, mat('#a8acb4', { m: 0.5, r: 0.4 }), X0 + 2 + i * 4 % (X1 - X0 - 2), H + 0.6, Z0 + 2 + ((i * 7) % Math.max(1, Z1 - Z0 - 4)), 1.4, 1.2, 1.4); }
  // sign above entrance
  const name = b.sign || (b.interior ? b.name : null);
  if (name) {
    const st = signTexture(name.toUpperCase(), b.signBg || '#1d1b20', b.signFg || '#ffd94a', true);
    const sw = Math.min(X1 - X0 - 0.5, style === 'mall' ? 14 : 6), sh = sw / 4;
    const sm = nightMat(new THREE.MeshStandardMaterial({ map: st, emissiveMap: st, emissive: '#ffffff', emissiveIntensity: 0.1, roughness: 0.4 }), 0.1, 0.9);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), sm);
    sign.position.set(style === 'mall' ? cx : b.door.x * TS + TS / 2, style === 'mall' ? H - sh / 2 - 0.4 : FLOOR_H + 0.15 + sh / 2, Z1 + (style === 'mall' ? 0.05 : 0.08)); root.add(sign);
    if (b.interior) { box(B, mat('#1a1410', { r: 0.5 }), b.door.x * TS + TS / 2, 1.2, Z1 + 0.02, 1.8, 2.4, 0.1); lamps.push([b.door.x * TS + TS / 2, 3.0, Z1 + 1.2, 'door']); }
  }
  if (style === 'hospital') { const cr = nightMat(new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff2020', emissiveIntensity: 0.3 }), 0.3, 2); const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.2), cr), c2 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.2), cr); c1.position.set(cx, H - 2.5, Z1 + 0.15); c2.position.copy(c1.position); root.add(c1, c2); }
}

/* ------------------------------ landmarks ------------------------------ */
const MARBLE = () => new THREE.MeshStandardMaterial({ map: groundTexture('marble'), roughness: 0.32, color: '#f8f6f0' });
function landmark(b, root, B, lamps) {
  const x0 = b.x * TS, z0 = b.y * TS, W = b.w * TS, D = b.h * TS, cx = x0 + W / 2, cz = z0 + D / 2;
  const pending = []; // landmark parts are batched into the city meshes once their transforms are final
  const add = (geo, m, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.y = ry; me.scale.set(sx, sy, sz); pending.push(me); return me; };
  const flush = () => { for (const me of pending) { me.updateMatrix(); if (me.material.userData.dayI !== undefined || me.material.transparent) { me.castShadow = me.receiveShadow = true; root.add(me); } else B.add(me.geometry, me.material, me.matrix); } };
  try {
  switch (b.style) {
    case 'victoria': {
      const mm = MARBLE(); mm.map = mm.map.clone(); mm.map.repeat.set(6, 3); mm.map.needsUpdate = true;
      const arch = facadeMat('colonial', '#f2efe6', 5, '#e8e4dc');
      add(new THREE.BoxGeometry(W + 4, 1.4, D + 4), mm, cx, 0.7, cz); liftRect(cx - W / 2 - 2, cz - D / 2 - 2, cx + W / 2 + 2, cz + D / 2 + 2, 1.4);
      liftRect(cx - 7, z0 + D + 2, cx + 7, z0 + D + 6.8, (z) => Math.max(0, 1.4 - (z - (z0 + D + 2)) * 0.29));
      for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(14 - k * 0.0, 0.3, 1.2), mm, cx, 0.15 + k * 0.3, z0 + D + 2 + 1.2 * (3 - k));
      const body = add(new THREE.BoxGeometry(W - 6, 12, D - 6), arch, cx, 7.4, cz); body.material = arch;
      for (const sx of [-1, 1]) add(new THREE.BoxGeometry(10, 14, D - 2), arch, cx + sx * (W / 2 - 7), 8.4, cz);
      add(new THREE.BoxGeometry(14, 15, 4), arch, cx, 8.9, z0 + D - 1);
      for (let k = -3; k <= 3; k++) add(new THREE.CylinderGeometry(0.45, 0.5, 10, 14), mm, cx + k * 1.9, 6.4, z0 + D + 1.2);
      add(new THREE.BoxGeometry(15, 1.2, 2), mm, cx, 12, z0 + D + 1.2);
      // corner cupolas
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const px = cx + sx * (W / 2 - 4), pz = cz + sz * (D / 2 - 4); add(new THREE.CylinderGeometry(2, 2, 5, 16), mm, px, 17.9, pz); add(new THREE.SphereGeometry(2.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mm, px, 20.4, pz); add(new THREE.ConeGeometry(0.3, 1.5, 8), mm, px, 23, pz); }
      // the great central dome on its drum, with the bronze Angel of Victory
      add(new THREE.CylinderGeometry(9, 9.5, 6, 32), mm, cx, 16.4, cz);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; add(new THREE.CylinderGeometry(0.35, 0.35, 5.5, 10), mm, cx + Math.cos(a) * 9.6, 16.4, cz + Math.sin(a) * 9.6); }
      add(new THREE.SphereGeometry(9.6, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), mm, cx, 19.4, cz, 0, 1, 1.2, 1);
      add(new THREE.CylinderGeometry(1.4, 1.8, 2.5, 16), mm, cx, 31.4, cz); add(new THREE.SphereGeometry(1.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mm, cx, 32.6, cz);
      const bronze = mat('#3a2c1a', { m: 0.7, r: 0.4 });
      add(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 8), bronze, cx, 35.2, cz); add(new THREE.SphereGeometry(0.3, 10, 8), bronze, cx, 36.5, cz);
      for (const sx of [-1, 1]) add(new THREE.BoxGeometry(1.6, 0.6, 0.08), bronze, cx + sx * 0.8, 35.8, cz).rotation.z = sx * 0.5;
      lamps.push([cx, 6, z0 + D + 6, 'flood'], [cx - 12, 6, z0 + D + 6, 'flood'], [cx + 12, 6, z0 + D + 6, 'flood']);
      break;
    }
    case 'minar': { // Shaheed Minar (Ochterlony Monument), 48 m
      const m = mat('#e8d6b0', { r: 0.7 });
      add(new THREE.BoxGeometry(6, 3, 6), m, cx, 1.5, cz); add(new THREE.CylinderGeometry(2.2, 2.6, 4, 16), m, cx, 5, cz);
      add(new THREE.CylinderGeometry(1.0, 1.6, 34, 16), m, cx, 24, cz);
      for (const y of [30, 40]) { add(new THREE.CylinderGeometry(1.9, 1.9, 0.4, 20), m, cx, y, cz); add(new THREE.TorusGeometry(1.8, 0.08, 6, 24), mat('#8a6a4a'), cx, y + 0.8, cz).rotation.x = Math.PI / 2; }
      add(new THREE.CylinderGeometry(1.1, 1.1, 4, 12), m, cx, 43, cz); add(new THREE.SphereGeometry(1.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m, cx, 45, cz); add(new THREE.ConeGeometry(0.2, 2.5, 6), mat('#6a5030'), cx, 47.4, cz);
      break;
    }
    case 'cathedral': { // St Paul's — white Indo-Gothic with a central tower
      const m = facadeMat('colonial', '#f2eee4', 9, '#e2ddd0');
      add(new THREE.BoxGeometry(W - 4, 14, D - 2), m, cx, 7, cz);
      const roofG = new THREE.CylinderGeometry(0.1, (W - 4) / 2, 4, 4, 1); add(roofG, mat('#7a7f8a', { r: 0.6 }), cx, 16, cz, Math.PI / 4, 1, 1, (D - 2) / (W - 4) * 1.0);
      add(new THREE.BoxGeometry(7, 30, 7), m, cx, 15, z0 + D - 4);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.ConeGeometry(0.6, 4, 6), mat('#e8e4d8'), cx + sx * 3.2, 32, z0 + D - 4 + sz * 3.2);
      add(new THREE.ConeGeometry(2.6, 8, 4), mat('#8a8f9a', { r: 0.5 }), cx, 34, z0 + D - 4, Math.PI / 4);
      break;
    }
    case 'planetarium': {
      const m = mat('#f2ede2', { r: 0.5 });
      add(new THREE.CylinderGeometry(W / 2 - 1, W / 2 - 0.5, 3, 32), mat('#d8cfba'), cx, 1.5, cz);
      add(new THREE.SphereGeometry(W / 2 - 1.5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m, cx, 3, cz);
      add(new THREE.CylinderGeometry(0.8, 1.2, 2, 12), mat('#c9a24a', { m: 0.7, r: 0.3 }), cx, 3 + W / 2 - 0.5, cz);
      add(new THREE.CylinderGeometry(W / 2 - 0.4, W / 2 - 0.4, 0.5, 32), mat('#c9a24a', { m: 0.6, r: 0.35 }), cx, 3.1, cz);
      break;
    }
    case 'stadium': { // Eden Gardens bowl with floodlights
      const pts = []; const R = Math.min(W, D) / 2;
      for (const [rr, y] of [[R * 0.62, 0], [R * 0.66, 1], [R * 0.98, 12], [R, 13], [R, 0]]) pts.push(new THREE.Vector2(rr, y));
      const bowl = add(new THREE.LatheGeometry(pts, 48), new THREE.MeshStandardMaterial({ map: pattern('stripes', '#c8ccd4', '#3a6aa8'), roughness: 0.8, side: THREE.DoubleSide }), cx, 0, cz, 0, W / (2 * R), 1, D / (2 * R));
      void bowl;
      add(new THREE.CylinderGeometry(R * 0.62, R * 0.62, 0.1, 40), new THREE.MeshStandardMaterial({ map: groundTexture('pitchA'), roughness: 0.9 }), cx, 0.05, cz, 0, W / (2 * R), 1, D / (2 * R));
      add(new THREE.BoxGeometry(3, 0.12, 20), mat('#d8c08a'), cx, 0.11, cz);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const px = cx + sx * W * 0.47, pz = cz + sz * D * 0.47; add(new THREE.CylinderGeometry(0.4, 0.6, 32, 8), mat('#9aa0a8', { m: 0.6 }), px, 16, pz); const lp = add(new THREE.BoxGeometry(4, 3, 0.6), nightMat(new THREE.MeshStandardMaterial({ color: '#f2f2f2', emissive: '#ffffff', emissiveIntensity: 0 }), 0, 3), px, 33, pz); lp.lookAt(cx, 0, cz); }
      break;
    }
    case 'fort': {
      const sh = new THREE.Shape(); const pts = 10; for (let i = 0; i < pts; i++) { const a = (i / pts) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.62 : 1; const px = Math.cos(a) * rr * W / 2, pz = Math.sin(a) * rr * D / 2; i ? sh.lineTo(px, pz) : sh.moveTo(px, pz); }
      const hole = new THREE.Path(); for (let i = 0; i < pts; i++) { const a = (i / pts) * Math.PI * 2 - Math.PI / 2, rr = (i % 2 ? 0.62 : 1) * 0.86; const px = Math.cos(a) * rr * W / 2, pz = Math.sin(a) * rr * D / 2; i ? hole.lineTo(px, pz) : hole.moveTo(px, pz); } sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 6, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, 6, 0);
      add(g, new THREE.MeshStandardMaterial({ map: groundTexture('plaza'), color: '#a89470', roughness: 0.95 }), cx, 0, cz);
      for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(10, 5, 6), mat('#d8c8a0'), cx - 8 + (k % 2) * 16, 2.5, cz - 6 + Math.floor(k / 2) * 12);
      break;
    }
    case 'tent': {
      const [a1, a2] = b.colors;
      add(new THREE.BoxGeometry(W - 0.6, 3.2, D - 0.6), mat('#f2ead8', { r: 0.8 }), cx, 1.6, cz);
      const roof = add(new THREE.ConeGeometry(Math.max(W, D) * 0.62, 3.5, 4, 1), new THREE.MeshStandardMaterial({ map: pattern('stripes', a1, a2), roughness: 0.8 }), cx, 4.9, cz, Math.PI / 4, W / Math.max(W, D), 1, D / Math.max(W, D));
      void roof;
      const st = signTexture(b.sign, a1, '#ffffff'); const s = new THREE.Mesh(new THREE.PlaneGeometry(W - 2, (W - 2) / 4), new THREE.MeshStandardMaterial({ map: st, roughness: 0.5 })); s.position.set(cx, 2.6, z0 + D - 0.28); root.add(s);
      add(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), mat('#9aa0a8'), cx, 9, cz); const fl = add(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ map: pattern('stripes', a1, a2), side: THREE.DoubleSide }), cx + 0.7, 11.4, cz);
      void fl;
      break;
    }
    case 'newmarket': {
      buildBuilding({ ...b, style: 'brick', floors: 2 }, B, root, lamps);
      const m = new THREE.MeshStandardMaterial({ map: facade('brick', '#b84a32', 3).map, roughness: 0.9 });
      add(new THREE.BoxGeometry(4, 18, 4), m, cx, 9, z0 + D - 3); add(new THREE.ConeGeometry(3.2, 4, 4), mat('#5a5a62'), cx, 20, z0 + D - 3, Math.PI / 4);
      const cm = nightMat(new THREE.MeshStandardMaterial({ map: clockTex(), emissive: '#fff4d0', emissiveMap: clockTex(), emissiveIntensity: 0 }), 0, 1);
      for (const [dx, dz, ry] of [[0, 2.02, 0], [2.02, 0, Math.PI / 2], [-2.02, 0, -Math.PI / 2], [0, -2.02, Math.PI]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), cm); c.position.set(cx + dx, 15.5, z0 + D - 3 + dz); c.rotation.y = ry; root.add(c); }
      break;
    }
    case 'bridge': { // Vidyasagar Setu: cable-stayed pylons over the Hooghly
      const deckY = 6, m = mat('#e8e8ec', { r: 0.5 });
      add(new THREE.BoxGeometry(W + 30, 1.2, 12), mat('#7a7c86', { r: 0.8 }), cx - 15, deckY, cz);
      for (const px of [cx - 30, cx + 6]) { for (const sz of [-1, 1]) { const leg = add(new THREE.BoxGeometry(2, 60, 2), m, px, 30, cz + sz * 5); leg.rotation.x = -sz * 0.06; } add(new THREE.BoxGeometry(2, 2, 12), m, px, 56, cz); add(new THREE.BoxGeometry(2, 1.5, 12), m, px, deckY - 0.5, cz); }
      const cm = mat('#f4f4f4', { r: 0.4, m: 0.4 });
      for (const px of [cx - 30, cx + 6]) for (const sz of [-1, 1]) for (let k = 1; k <= 8; k++) for (const dir of [-1, 1]) { const ex = px + dir * k * 3.4, ey = deckY + 0.6, top = new THREE.Vector3(px, 54 - k * 1.5, cz + sz * 4.6), bot = new THREE.Vector3(ex, ey, cz + sz * 5.5); const len = top.distanceTo(bot); const c = add(new THREE.CylinderGeometry(0.05, 0.05, len, 4), cm, (top.x + bot.x) / 2, (top.y + bot.y) / 2, (top.z + bot.z) / 2); c.lookAt(top); c.rotateX(Math.PI / 2); c.castShadow = false; }
      break;
    }
    case 'stall': {
      const col = b.color || '#d42a2a';
      add(new THREE.BoxGeometry(W - 1, 1.0, D - 1.2), mat('#7a5232'), cx, 0.5, cz);
      add(new THREE.BoxGeometry(W - 0.8, 0.08, D - 1), mat('#c8c4b8', { m: 0.6, r: 0.3 }), cx, 1.04, cz);
      for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(0.12, 8, 6), mat('#d8a050'), cx - 1 + k * 0.4, 1.15, cz);
      add(new THREE.ConeGeometry(Math.max(W, D) * 0.55, 1.0, 12), new THREE.MeshStandardMaterial({ map: pattern('stripes', col, '#f4f4f4'), roughness: 0.8 }), cx, 2.8, cz);
      add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), mat('#6a6a6a'), cx, 1.2, cz);
      lamps.push([cx, 2.2, cz, 'stall']);
      break;
    }
    case 'gate': {
      const m = mat('#c9b48a', { r: 0.8 });
      add(new THREE.BoxGeometry(1.2, 5, 1.2), m, x0 + 0.6, 2.5, cz); add(new THREE.BoxGeometry(1.2, 5, 1.2), m, x0 + W - 0.6, 2.5, cz);
      add(new THREE.BoxGeometry(W, 1.2, 1.2), m, cx, 5.4, cz);
      const st = signTexture('ALIPORE ZOO', '#2a5a2a', '#ffffff'); const s = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, (W - 1) / 4), new THREE.MeshStandardMaterial({ map: st })); s.position.set(cx, 5.4, cz + 0.62); root.add(s);
      break;
    }
    default: buildBuilding(b, B, root, lamps);
  }
  } finally { flush(); }
}
let _clock = null;
function clockTex() { if (_clock) return _clock; const c = cv(128), g = c.getContext('2d'); g.fillStyle = '#f2ead8'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#1d1b20'; g.lineWidth = 4; g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = '#1d1b20'; g.fillRect(64 + Math.cos(a) * 50 - 2, 64 + Math.sin(a) * 50 - 2, 4, 4); } g.lineWidth = 5; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 24); g.moveTo(64, 64); g.lineTo(92, 64); g.stroke(); return (_clock = toTex(c, { repeat: false })); }
const SPECIAL = new Set(['victoria', 'minar', 'cathedral', 'planetarium', 'stadium', 'fort', 'tent', 'newmarket', 'bridge', 'stall', 'gate']);

/* ------------------------------ props & trees ------------------------------ */
function buildProps(S, root, lamps) {
  const byKind = {};
  const railSet = new Set(S.objects.filter((o) => o.kind === 'rail' || o.kind === 'cage').map((o) => Math.round(o.x / 16) + ',' + Math.round(o.y / 16)));
  for (const o of S.objects) {
    if (!o.kind || o.kind === 'building' || o.kind === 'gate') continue;
    const tx = Math.floor(o.x / 16), ty = Math.floor((o.y - 2) / 16);
    const gy = tx >= 0 && ty >= 0 && tx < S.W && ty < S.H ? heightAt(S, tx, ty) : 0;
    let x = o.x * M, z = o.y * M, ry = 0;
    if (o.kind === 'rail' || o.kind === 'cage' || o.kind === 'fence') { const kx = Math.round(o.x / 16), ky = Math.round(o.y / 16); const vert = railSet.has(kx + ',' + (ky + 1)) || railSet.has(kx + ',' + (ky - 1)); if (vert && !(railSet.has((kx + 1) + ',' + ky) || railSet.has((kx - 1) + ',' + ky))) { ry = Math.PI / 2; } else x += TS / 2; }
    if (o.kind === 'goal') ry = 0;
    if (o.kind === 'busstop' || o.kind === 'bench') ry = 0;
    const r = mulberry(o.x * 7 + o.y);
    (byKind[o.kind] = byKind[o.kind] || []).push({ x, y: Math.max(0, gy), z, ry: ry || (['tree', 'banyan', 'palm', 'bush', 'umbrella', 'statue', 'fountain', 'flowerbed'].includes(o.kind) ? r() * 6.28 : 0), s: ['tree', 'banyan', 'palm', 'bush'].includes(o.kind) ? 0.8 + r() * 0.5 : 1, v: (o.x * 13 + o.y * 7) % 3 });
    if (o.kind === 'lamp') lamps.push([x, 4.9, z + 1.1, 'lamp']);
  }
  const dummy = new THREE.Object3D();
  const inst = (geo, material, list, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.ry, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.castShadow = shadow; im.receiveShadow = true; root.add(im); return im;
  };
  // trees: 3 variants each for rain tree / krishnachura, plus palms and banyans
  const trees = { tree: [], palm: [], banyan: [] };
  for (const k of Object.keys(trees)) for (const p of byKind[k] || []) trees[k].push(p);
  const variants = { tree: ['rain', 'krishnachura', 'ashoka'], palm: ['palm'], banyan: ['banyan'] };
  for (const [k, list] of Object.entries(trees)) {
    const vs = variants[k];
    vs.forEach((vk, vi) => {
      const sub = list.filter((p) => p.v % vs.length === vi); if (!sub.length) return;
      const g = treeGeometries(vk, vi + 2); inst(g.trunk, BARK_MAT, sub); inst(g.leaves, LEAF_MAT, sub);
    });
  }
  for (const [k, list] of Object.entries(byKind)) {
    if (trees[k]) continue;
    const g = propGeometry(k); if (!g) continue;
    inst(g, PROP_MAT, list, !['rail', 'grave', 'flowerbed'].includes(k));
    if (k === 'lamp') { const head = new THREE.BoxGeometry(0.26, 0.05, 0.42); head.translate(0, 4.84, 1.1); inst(head, LAMP_HEAD, list, false); }
  }
}
export const LAMP_HEAD = new THREE.MeshStandardMaterial({ color: '#fff2c8', emissive: '#ffd98a', emissiveIntensity: 0.1 });
nightMat(LAMP_HEAD, 0.1, 4);

/* ------------------------------ street lighting ------------------------------ */
let glowTex = null;
function glow() { if (glowTex) return glowTex; const c = cv(128), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.35, 'rgba(255,190,110,0.55)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (glowTex = toTex(c, { repeat: false })); }
export const GLOW_MAT = new THREE.MeshBasicMaterial({ map: null, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
function streetLamps(world, root, lamps) {
  const pts = []; const W = world.W, H = world.H;
  const ok = (tx, ty) => tx > 0 && ty > 0 && tx < W && ty < H && world.ground[ty * W + tx] === TL.SIDEWALK && world.solid[ty * W + tx] !== 1;
  for (const r of world.roadsH) { const h = (r.w + 1) / 2; for (let x = r.x1 + 3; x < r.x2 - 1; x += 7) for (const [sy, dir] of [[r.y - h, 1], [r.y + h, -1]]) if (ok(x, sy)) pts.push([x * TS + TS / 2, sy * TS + TS / 2 - dir * 0.6, dir > 0 ? 0 : Math.PI]); }
  for (const r of world.roadsV) { const h = (r.w + 1) / 2; for (let y = r.y1 + 3; y < r.y2 - 1; y += 7) for (const [sx, dir] of [[r.x - h, 1], [r.x + h, -1]]) if (ok(sx, y)) pts.push([sx * TS + TS / 2 - dir * 0.6, y * TS + TS / 2, dir > 0 ? Math.PI / 2 : -Math.PI / 2]); }
  const pole = propGeometry('lamp'); const head = new THREE.BoxGeometry(0.3, 0.06, 0.5); head.translate(0, 4.84, 1.1);
  const ip = new THREE.InstancedMesh(pole, PROP_MAT, pts.length), ih = new THREE.InstancedMesh(head, LAMP_HEAD, pts.length);
  GLOW_MAT.map = glow(); const pool = new THREE.PlaneGeometry(9, 9); pool.rotateX(-Math.PI / 2); const ig = new THREE.InstancedMesh(pool, GLOW_MAT, pts.length);
  const d = new THREE.Object3D();
  pts.forEach(([x, z, ry], i) => {
    d.position.set(x, SIDEWALK_H, z); d.rotation.set(0, ry, 0); d.scale.setScalar(1); d.updateMatrix(); ip.setMatrixAt(i, d.matrix); ih.setMatrixAt(i, d.matrix);
    const lx = x + Math.sin(ry) * 1.1, lz = z + Math.cos(ry) * 1.1; d.position.set(lx, 0.22, lz); d.rotation.set(0, 0, 0); d.updateMatrix(); ig.setMatrixAt(i, d.matrix);
    lamps.push([lx, 4.6, lz, 'lamp']);
  });
  ip.castShadow = true; ig.renderOrder = 2; root.add(ip, ih, ig);
}

/* ------------------------------ public ------------------------------ */
export function buildCity(world) {
  LIFT = new Float32Array(world.W * world.H); LIFT_W = world.W;
  const root = new THREE.Group(); root.name = 'city';
  const lamps = [];
  const waters = buildGround(world, root);
  const B = new Batcher();
  for (const b of world.buildings) { if (SPECIAL.has(b.style)) landmark(b, root, B, lamps); else buildBuilding(b, B, root, lamps); }
  buildProps(world, root, lamps);
  streetLamps(world, root, lamps);
  B.build(root);
  for (const [m, A] of ACC) { const me = arraysToMesh(A, m); me.castShadow = true; me.updateMatrix(); root.add(me); }
  ACC.clear();
  // surroundings: ground beyond the map, the far (Howrah) bank of the Hooghly
  const far = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: groundTexture('grass'), roughness: 1 })); far.material.map = far.material.map.clone(); far.material.map.repeat.set(800, 800); far.material.map.needsUpdate = true;
  far.rotation.x = -Math.PI / 2; far.position.set(world.W, -1.8, world.H); far.receiveShadow = true; root.add(far);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(300, 4000), waters[0] || mat('#3d6f7a')); river.rotation.x = -Math.PI / 2; river.position.set(-150 + 0.5, -0.35, world.H); root.add(river);
  const r = mulberry(11); const HB = new Batcher();
  for (let i = 0; i < 70; i++) { const h = 6 + r() * 28, w = 8 + r() * 14; HB.add(new THREE.BoxGeometry(w, h, w), facadeMat(r() < 0.3 ? 'tower' : 'house', ['#d8c8b0', '#c8b8a8', '#e0d0b8', '#b8b0a8'][i % 4], i, '#5a7a6a'), mtx(-320 + r() * 160, h / 2, -200 + i * 14, 0)); }
  HB.build(root);
  // roof heights per tile, used to keep helicopters out of buildings
  const hgrid = new Float32Array(world.W * world.H); for (let i = 0; i < hgrid.length; i++) hgrid[i] = Math.max(hgrid[i], LIFT[i]);
  const LH = { victoria: 37, minar: 48, cathedral: 38, planetarium: 15, stadium: 33, bridge: 60, fort: 6, tent: 7, newmarket: 22, stall: 3, gate: 6 };
  for (const b of world.buildings) { const h = LH[b.style] ?? (Math.max(2, (b.floors || 2) + (b.style === 'tower' ? 2 : 0) + (b.style === 'house' ? 1 : 0)) * FLOOR_H + 3); for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) hgrid[y * world.W + x] = Math.max(hgrid[y * world.W + x], h); }
  const lift = LIFT; LIFT = null; return { root, lamps, waters, nightMats, hgrid, lift };
}

/* ------------------------------ interiors ------------------------------ */
export function buildInterior3D(S, lamps = []) {
  const root = new THREE.Group(); root.name = 'interior:' + S.id;
  const pal = S.pal || {};
  buildGround(S, root, true, pal);
  const wallM = new THREE.MeshStandardMaterial({ map: wallTex(pal.wall || '#e8dcc0', pal.stripe), roughness: 0.85 });
  const WH = 3.6;
  // north wall face at row 3, side walls, low south wall (cut-away for the camera)
  const northZ = 3 * TS, W = S.W * TS, D = S.H * TS;
  const wall = (x, z, w, d, h, m = wallM) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, h / 2, z); me.castShadow = me.receiveShadow = true; root.add(me); };
  wall(W / 2, northZ - 0.15, W, 0.3, WH); wall(TS - 0.15, (northZ + D) / 2, 0.3, D - northZ, WH); wall(W - TS + 0.15, (northZ + D) / 2, 0.3, D - northZ, WH);
  const doorX = S.door.x * TS;
  wall((TS + doorX) / 2, D - TS + 0.15, doorX - TS, 0.3, 0.7, mat(pal.walltop || '#4a3a30')); wall((doorX + TS + W - TS) / 2, D - TS + 0.15, W - TS - doorX - TS, 0.3, 0.7, mat(pal.walltop || '#4a3a30'));
  const skirting = mat(pal.walltop || '#4a3a30', { r: 0.6 });
  wall(W / 2, northZ + 0.02, W - 2 * TS, 0.06, 0.2, skirting);
  // furniture
  for (const o of S.objects) {
    const obj = furniture3D(o.kind, o, S); if (!obj) continue;
    const tx = o.x / 16, ty = o.y / 16;
    obj.position.x = o.x * M; obj.position.z = Math.max(northZ + 0.3, o.y * M - (o.kind === 'chair' ? 0.3 : 0.6));
    if (o.kind === 'painting' || o.kind === 'window' || o.kind === 'sign' || o.kind === 'menuboard' || o.kind === 'gunrack' || o.kind === 'screen' || o.kind === 'vault' || o.kind === 'mirror' && ty <= 4) obj.position.z = northZ + 0.08;
    if (o.kind === 'chandelier') obj.position.z = ty * TS;
    if (o.kind === 'sofa') { obj.position.z = o.y * M - 2.15; obj.rotation.y = Math.PI; obj.position.x += (o.img ? o.img.width * M : 6); }
    void tx; root.add(obj);
  }
  for (const n of [0.3, 0.7]) lamps.push([W * n, WH - 0.3, (northZ + D) / 2, 'room']);
  return root;
}
function wallTex(col, stripe) { const c = cv(256), g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 256, 256); const n = cv(256); void n; for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); } if (stripe) { g.fillStyle = stripe; g.fillRect(0, 150, 256, 14); } g.fillStyle = shade(col, -0.2); g.fillRect(0, 220, 256, 36); const t = toTex(c); t.repeat.set(8, 1); return t; }

const FM = (c, o) => mat(c, o);
function furniture3D(kind, o, S) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
  const wood = FM('#7a5232', { r: 0.6 }), metal = FM('#9aa0a8', { m: 0.8, r: 0.3 });
  const w = (o.img ? o.img.width : 32) * M;
  switch (kind) {
    case 'table': add(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), FM('#e8dcc8', { r: 0.35 }), 0, 0.76, 0); add(new THREE.CylinderGeometry(0.56, 0.56, 0.03, 24), FM('#8a6a4a'), 0, 0.72, 0); add(new THREE.CylinderGeometry(0.05, 0.05, 0.74, 8), FM('#3a2a1a'), 0, 0.38, 0); add(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), FM('#3a2a1a'), 0, 0.02, 0); g.position.y = 0; g.userData.table = true; break;
    case 'chair': add(new THREE.BoxGeometry(0.45, 0.06, 0.45), wood, 0, 0.46, 0); add(new THREE.BoxGeometry(0.45, 0.5, 0.05), wood, 0, 0.72, -0.2); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.BoxGeometry(0.04, 0.46, 0.04), wood, a * 0.19, 0.23, b * 0.19); break;
    case 'counter': add(new THREE.BoxGeometry(w, 1.0, 0.8), FM('#5a3a24', { r: 0.6 }), w / 2, 0.5, 0); add(new THREE.BoxGeometry(w + 0.05, 0.06, 0.85), FM('#e8e2d6', { r: 0.25 }), w / 2, 1.03, 0); add(new THREE.BoxGeometry(0.4, 0.3, 0.3), FM('#2a2a30'), w - 0.6, 1.2, 0); break;
    case 'display': add(new THREE.BoxGeometry(w, 0.8, 0.7), wood, w / 2, 0.4, 0); add(new THREE.BoxGeometry(w - 0.04, 0.5, 0.66), new THREE.MeshPhysicalMaterial({ color: '#dff4ff', transparent: true, opacity: 0.3, roughness: 0.05 }), w / 2, 1.05, 0); for (let k = 0; k < w / 0.3; k++) add(new THREE.SphereGeometry(0.08, 10, 8), FM(['#6a2a14', '#f2d0a0', '#f4f4f4', '#e05a7a'][k % 4], { r: 0.5 }), 0.2 + k * 0.3, 0.88, (k % 2) * 0.2 - 0.1); break;
    case 'shelf': case 'books': add(new THREE.BoxGeometry(w, 2.2, 0.45), wood, w / 2, 1.1, 0); for (let s = 0; s < 4; s++) for (let k = 0; k < w / 0.09; k++) add(new THREE.BoxGeometry(0.06, 0.32, 0.3), FM(['#c0283a', '#2a6ac0', '#e3b341', '#3a8a4a', '#f2f2f2', '#8a3ab0'][(k * 7 + s) % 6]), 0.08 + k * 0.09, 0.3 + s * 0.52, 0.05); break;
    case 'rack': add(new THREE.BoxGeometry(w, 0.04, 0.04), metal, w / 2, 1.7, 0); for (const x of [0.05, w - 0.05]) add(new THREE.BoxGeometry(0.04, 1.7, 0.04), metal, x, 0.85, 0); for (let k = 0; k < w / 0.18; k++) { const c = (o.kind && S && S.objects) ? ['#c0283a', '#2a6ac0', '#e3b341', '#3a8a4a', '#f2f2f2', '#1d1b20', '#f08fb0', '#d9a441'][k % 8] : '#888'; add(new THREE.BoxGeometry(0.06, 0.9, 0.45), FM(c, { r: 0.85 }), 0.15 + k * 0.18, 1.2, 0); } break;
    case 'shoeshelf': add(new THREE.BoxGeometry(w, 2.0, 0.4), FM('#e8e4dc'), w / 2, 1.0, 0); for (let s = 0; s < 4; s++) for (let k = 0; k < w / 0.35; k++) add(new THREE.BoxGeometry(0.25, 0.1, 0.3), FM(['#141216', '#f4f4f4', '#c0283a', '#d4a64a', '#8a5a32'][(k + s) % 5], { r: 0.3 }), 0.2 + k * 0.35, 0.3 + s * 0.48, 0.05); break;
    case 'mirror': add(new THREE.BoxGeometry(0.9, 2, 0.05), FM('#c9a24a', { m: 0.8, r: 0.3 }), 0, 1.2, 0); add(new THREE.PlaneGeometry(0.8, 1.9), new THREE.MeshStandardMaterial({ color: '#dfefff', metalness: 1, roughness: 0.02 }), 0, 1.2, 0.03); break;
    case 'salonchair': add(new THREE.BoxGeometry(0.6, 0.12, 0.6), FM('#1d1b20', { r: 0.4 }), 0, 0.55, 0); add(new THREE.BoxGeometry(0.6, 0.7, 0.1), FM('#1d1b20', { r: 0.4 }), 0, 0.95, -0.28); add(new THREE.CylinderGeometry(0.05, 0.05, 0.5), metal, 0, 0.25, 0); add(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), metal, 0, 0.02, 0); break;
    case 'plant': add(new THREE.CylinderGeometry(0.22, 0.17, 0.45, 12), FM('#a8582a'), 0, 0.22, 0); for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(0.22, 10, 8), FM(k % 2 ? '#2f7a2a' : '#4a9a3a', { r: 0.8 }), Math.cos(k) * 0.15, 0.7 + (k % 3) * 0.2, Math.sin(k) * 0.15); break;
    case 'sofa': add(new THREE.BoxGeometry(w, 0.45, 0.85), FM('#5a2a3a', { r: 0.9 }), w / 2, 0.3, 0); add(new THREE.BoxGeometry(w, 0.55, 0.2), FM('#5a2a3a', { r: 0.9 }), w / 2, 0.75, -0.32); for (const x of [0.1, w - 0.1]) add(new THREE.BoxGeometry(0.2, 0.6, 0.85), FM('#4a2230', { r: 0.9 }), x, 0.45, 0); break;
    case 'bed': add(new THREE.BoxGeometry(2.0, 0.5, 4.2), wood, 2.0, 0.25, 0.4); add(new THREE.BoxGeometry(1.9, 0.25, 4.0), FM('#f4f4f4', { r: 0.9 }), 2.0, 0.62, 0.4); add(new THREE.BoxGeometry(1.92, 0.27, 2.6), FM('#2f5a8a', { r: 0.9 }), 2.0, 0.64, 1.0); for (const x of [1.5, 2.5]) add(new THREE.BoxGeometry(0.7, 0.18, 0.45), FM('#ffffff'), x, 0.82, -1.3); add(new THREE.BoxGeometry(2.0, 1.2, 0.1), wood, 2.0, 0.8, -1.75); break;
    case 'tv': add(new THREE.BoxGeometry(1.6, 0.6, 0.45), wood, 1.0, 0.3, 0); add(new THREE.BoxGeometry(1.5, 0.85, 0.06), FM('#111'), 1.0, 1.1, 0); add(new THREE.PlaneGeometry(1.4, 0.78), new THREE.MeshStandardMaterial({ color: '#2a5a9a', emissive: '#4a8ad4', emissiveIntensity: 0.8 }), 1.0, 1.1, 0.035); break;
    case 'wardrobe': add(new THREE.BoxGeometry(1.8, 2.3, 0.6), FM('#8a5a32', { r: 0.6 }), 1.0, 1.15, 0); add(new THREE.BoxGeometry(0.02, 2.2, 0.62), FM('#5a3a20'), 1.0, 1.15, 0); for (const x of [0.92, 1.08]) add(new THREE.BoxGeometry(0.04, 0.2, 0.04), FM('#e3b341', { m: 1 }), x, 1.2, 0.32); break;
    case 'fridge': add(new THREE.BoxGeometry(0.8, 1.9, 0.7), FM('#e8ecf0', { r: 0.3, m: 0.2 }), 0, 0.95, 0); break;
    case 'stove': add(new THREE.BoxGeometry(1.8, 0.95, 0.7), FM('#e8e4dc'), 1.0, 0.47, 0); add(new THREE.BoxGeometry(1.8, 0.04, 0.7), FM('#2a2a30', { r: 0.2 }), 1.0, 0.97, 0); for (const x of [0.6, 1.4]) add(new THREE.TorusGeometry(0.12, 0.02, 6, 16), FM('#111'), x, 1.0, 0).rotation.x = Math.PI / 2; break;
    case 'vault': add(new THREE.BoxGeometry(2.6, 3.0, 0.4), FM('#5a5e66', { m: 0.6, r: 0.4 }), 1.3, 1.5, 0); add(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 32), FM('#8a8e96', { m: 0.9, r: 0.25 }), 1.3, 1.5, 0.25).rotation.x = Math.PI / 2; for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.6, 0.08, 0.08), FM('#3a3e46', { m: 0.9 }), 1.3 + Math.cos(k) * 0.3, 1.5 + Math.sin(k) * 0.3, 0.45).rotation.z = k; break;
    case 'gunrack': add(new THREE.BoxGeometry(3.6, 2.0, 0.15), FM('#3a2a1a'), 1.8, 1.6, 0); for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.1, 1.2, 0.08), FM('#1d1b20', { m: 0.6, r: 0.4 }), 0.5 + k * 0.65, 1.6, 0.1); break;
    case 'pew': add(new THREE.BoxGeometry(w, 0.08, 0.5), wood, w / 2, 0.45, 0); add(new THREE.BoxGeometry(w, 0.6, 0.06), wood, w / 2, 0.8, -0.22); break;
    case 'seat': add(new THREE.BoxGeometry(0.55, 0.12, 0.55), FM(o.col || '#9c2f3c', { r: 0.9 }), 0, 0.45, 0); add(new THREE.BoxGeometry(0.55, 0.7, 0.12), FM('#7a1f2b', { r: 0.9 }), 0, 0.8, -0.25); break;
    case 'screen': add(new THREE.BoxGeometry(w, 4, 0.1), FM('#111'), w / 2, 2.4, 0); add(new THREE.PlaneGeometry(w - 0.4, 3.6), new THREE.MeshStandardMaterial({ color: '#c8d8f0', emissive: '#a8c0e8', emissiveIntensity: 0.9 }), w / 2, 2.4, 0.06); break;
    case 'stage': add(new THREE.BoxGeometry(w, 0.3, 2.2), FM('#3a2a4a', { r: 0.7 }), w / 2, 0.15, -0.6); break;
    case 'drums': add(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16), FM('#c0283a', { r: 0.3 }), 0, 0.5, 0); for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 16), FM('#e3b341', { m: 1, r: 0.2 }), sx * 0.45, 1.0, 0); break;
    case 'mic': add(new THREE.CylinderGeometry(0.015, 0.015, 1.5), metal, 0, 0.75, 0); add(new THREE.SphereGeometry(0.04, 8, 6), FM('#222'), 0, 1.52, 0); break;
    case 'exhibit': add(new THREE.BoxGeometry(1.4, 1.0, 1.4), FM('#d8d0c0', { r: 0.4 }), 0, 0.5, 0); exhibitObj(add, o.kind && S ? (S.objects.find((x) => x === o) ? 0 : 0) : 0, g); break;
    case 'painting': { const tex = paintingTex(o.x + o.y); add(new THREE.BoxGeometry(1.6, 1.2, 0.06), FM('#c9a24a', { m: 0.7, r: 0.3 }), 0, 2.0, 0); add(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), 0, 2.0, 0.035); break; }
    case 'window': add(new THREE.BoxGeometry(1.8, 1.6, 0.08), FM('#f2f2f2'), 0, 2.0, 0); add(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshStandardMaterial({ color: '#a8d8f4', emissive: '#a8d8f4', emissiveIntensity: 0.6 }), 0, 2.0, 0.045); break;
    case 'sign': case 'menuboard': { const t = kind === 'sign' && o.img ? toTex(o.img, { repeat: false }) : null; if (t) { t.magFilter = THREE.NearestFilter; } add(new THREE.PlaneGeometry(kind === 'sign' ? Math.max(1.5, w * 0.9) : 1.6, kind === 'sign' ? Math.max(0.5, w * 0.3) : 1.2), new THREE.MeshStandardMaterial({ map: t, color: t ? '#ffffff' : '#1f2a24', emissive: t ? '#ffffff' : '#000', emissiveMap: t, emissiveIntensity: 0.4 }), 0, kind === 'sign' && o.y / 16 > 4 ? 2.6 : 2.6, 0.02); break; }
    case 'hbed': add(new THREE.BoxGeometry(1.0, 0.6, 2.2), metal, 0.5, 0.3, 0.6); add(new THREE.BoxGeometry(0.95, 0.15, 2.1), FM('#8ac4e8'), 0.5, 0.67, 0.6); break;
    case 'treadmill': add(new THREE.BoxGeometry(0.8, 0.2, 1.8), FM('#2a2a30'), 0.4, 0.1, 0.4); add(new THREE.BoxGeometry(0.7, 1.2, 0.1), metal, 0.4, 0.8, -0.4); break;
    case 'weights': add(new THREE.BoxGeometry(1.8, 0.9, 0.5), FM('#3a3a42'), 1, 0.45, 0); for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), FM('#111'), 0.3 + k * 0.35, 1.0, 0).rotation.x = Math.PI / 2; break;
    case 'turntable': add(new THREE.BoxGeometry(1.8, 1.0, 0.8), FM('#2a2a30'), 1.0, 0.5, 0); for (const x of [0.6, 1.4]) add(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20), FM('#111'), x, 1.02, 0); break;
    case 'escalator': { const e = add(new THREE.BoxGeometry(1.6, 0.4, 4.5), metal, 1.0, 1.4, 0.5); e.rotation.x = -0.6; break; }
    case 'kiosk': add(new THREE.BoxGeometry(1.8, 1.1, 0.9), FM(o.col || '#e05a5a', { r: 0.5 }), 1.0, 0.55, 0); add(new THREE.BoxGeometry(2, 0.1, 1.1), FM('#f2f2f2'), 1.0, 2.2, 0); for (const x of [0.1, 1.9]) add(new THREE.BoxGeometry(0.06, 1.1, 0.06), metal, x, 1.65, 0.4); break;
    case 'rope': for (const x of [0.2, 2.8]) add(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 10), FM('#c9a24a', { m: 0.9, r: 0.3 }), x, 0.5, 0); add(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 6), FM('#9c2f3c'), 1.5, 0.85, 0).rotation.z = Math.PI / 2; break;
    case 'chandelier': add(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffe8a0', emissive: '#ffd070', emissiveIntensity: 1.5 }), 0, 3.1, 0); add(new THREE.TorusGeometry(0.5, 0.03, 6, 20), FM('#c9a24a', { m: 1 }), 0, 3.0, 0).rotation.x = Math.PI / 2; break;
    case 'car': { const c = buildVehicle(o.img && o.img.width > 40 ? 'bus' : (S && S.objects && carTypeFor(o)) || 'sports_red'); c.rotation.y = 0.4; g.add(c); break; }
    case 'desk': add(new THREE.BoxGeometry(w, 0.8, 0.8), wood, w / 2, 0.4, 0); add(new THREE.BoxGeometry(0.5, 0.35, 0.05), FM('#2a2a30'), 0.6, 1.0, 0); break;
    case 'cell': add(new THREE.BoxGeometry(3, 2.6, 0.1), FM('#5a5a62'), 1.5, 1.3, -1); for (let k = 0; k < 12; k++) add(new THREE.CylinderGeometry(0.02, 0.02, 2.6), metal, 0.1 + k * 0.25, 1.3, 1); break;
    case 'atm': add(new THREE.BoxGeometry(0.8, 1.9, 0.6), FM('#2a4a8a'), 0, 0.95, 0); add(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshStandardMaterial({ color: '#9fd4f0', emissive: '#6ab0e0', emissiveIntensity: 0.7 }), 0, 1.3, 0.31); break;
    default: return null;
  }
  return g;
}
function carTypeFor(o) { return o.carType || 'sports_red'; }
function exhibitObj(add, _w, g) { const m = FM('#c9a24a', { m: 0.6, r: 0.35 }); add(new THREE.CylinderGeometry(0.3, 0.4, 1.2, 12), m, 0, 1.6, 0); add(new THREE.SphereGeometry(0.3, 12, 10), m, 0, 2.4, 0); void g; }
const paintCache = {};
function paintingTex(seed) { const k = seed % 7; if (paintCache[k]) return paintCache[k]; const c = cv(128, 96), g = c.getContext('2d'); const r = mulberry(k + 3); const sky = g.createLinearGradient(0, 0, 0, 96); sky.addColorStop(0, ['#f2a05a', '#5a8ac4', '#e8d0a0', '#2a3a6a'][k % 4]); sky.addColorStop(1, ['#4a6a8a', '#e8f0f8', '#8a5a3a', '#c86a4a'][k % 4]); g.fillStyle = sky; g.fillRect(0, 0, 128, 96); for (let i = 0; i < 9; i++) { g.fillStyle = ['#2a4a2a', '#c0283a', '#f2e2b8', '#1d1b20', '#e3b341'][(r() * 5) | 0]; g.beginPath(); g.ellipse(r() * 128, 40 + r() * 56, 6 + r() * 20, 4 + r() * 14, r() * 3, 0, 7); g.fill(); } return (paintCache[k] = toTex(c, { repeat: false })); }
export { nightMats };
