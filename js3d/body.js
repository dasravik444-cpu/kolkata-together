// Smooth skinned characters: one continuous body mesh (signed-distance sculpt -> surface nets),
// a bone skeleton with automatic skin weights, clothing painted as material regions, and a
// procedural animation system (walk/run/idle/sit/drive/swim/dance/fight/reactions) with blending.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bodyGeo, buildHair, buildGlasses, buildHat, clothMat, it, mat } from './models.js';
import { faceTexture, photoFaceTexture, pattern, FACE } from './textures.js';
import { shade } from '../js/util.js';
import { CLIPS, MBONES, Pose, sampleClip, blendPose, UPPER } from './mocap.js';
import { MAN, humansReady, partGeo, lookParts, skinTexture, crowdSkin, clothMaterial, hairMaterial, smallMaterial, bodyIndex, regionColors, onHumanAsset } from './human.js';
import { FACES } from './textures.js';

/* ------------------------------ proportions ------------------------------ */
function joints(f) {
  const k = f ? 0.966 : 1, sw = f ? 0.9 : 1, hw = f ? 1.06 : 1;
  const J = {
    hips: [0, 0.96], spine: [0, 1.07], chest: [0, 1.24], neck: [0, 1.44], head: [0, 1.535],
    shL: [0.19 * sw, 1.415, -0.01], elL: [0.215 * sw, 1.135, -0.025], wrL: [0.23 * sw, 0.885, 0.0], tipL: [0.235 * sw, 0.72, 0.01],
    hpL: [0.088 * hw, 0.925, 0], knL: [0.094 * hw, 0.5, 0.012], anL: [0.1 * hw, 0.08, -0.012], toeL: [0.105 * hw, 0.035, 0.165],
  };
  const out = {};
  for (const [n, v] of Object.entries(J)) {
    const p = [v[0], v[1] * k, (v[2] || 0)];
    out[n] = p; if (n.endsWith('L')) out[n.slice(0, -1) + 'R'] = [-p[0], p[1], p[2]];
  }
  return out;
}

/* ------------------------------ signed distance sculpt ------------------------------ */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function roundCone(a, b, r1, r2) { // iq's capsule with varying radius (approximate)
  const ba = sub(b, a), l2 = dot(ba, ba);
  const box = [Math.min(a[0], b[0]) - Math.max(r1, r2), Math.max(a[0], b[0]) + Math.max(r1, r2), Math.min(a[1], b[1]) - Math.max(r1, r2), Math.max(a[1], b[1]) + Math.max(r1, r2), Math.min(a[2], b[2]) - Math.max(r1, r2), Math.max(a[2], b[2]) + Math.max(r1, r2)];
  return { box, f: (p) => { const pa = sub(p, a); const h = Math.max(0, Math.min(1, dot(pa, ba) / l2)); const q = [pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h]; return Math.sqrt(dot(q, q)) - (r1 + (r2 - r1) * h); } };
}
function ellipsoid(c, r) {
  const m = Math.max(...r);
  return { box: [c[0] - m, c[0] + m, c[1] - m, c[1] + m, c[2] - m, c[2] + m], f: (p) => { const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2]; const k0 = Math.sqrt(x * x + y * y + z * z); const k1 = Math.sqrt((x / r[0]) ** 2 + (y / r[1]) ** 2 + (z / r[2]) ** 2); return k1 > 1e-6 ? (k0 * (k0 - 1)) / k1 : -Math.min(...r); } };
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

function bodyPrims(f, J) {
  const P = [];
  const add = (prim, k) => P.push({ ...prim, k });
  const m = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    add(roundCone(J['hp' + s], J['kn' + s], f ? 0.088 : 0.084, f ? 0.054 : 0.057), 0.04);
    add(roundCone(J['kn' + s], J['an' + s], f ? 0.052 : 0.056, f ? 0.033 : 0.036), 0.03);
    add(ellipsoid(m(J['kn' + s], J['an' + s], 0.3).map((v, i) => v + (i === 2 ? -0.018 : 0)), [f ? 0.046 : 0.05, 0.1, f ? 0.046 : 0.05]), 0.04); // calf
    add(roundCone([J['an' + s][0], 0.045, -0.045], J['toe' + s], 0.042, 0.034), 0.03); // foot
    add(roundCone(J['an' + s], [J['an' + s][0], 0.05, -0.03], 0.038, 0.042), 0.03);
    add(ellipsoid([sx * 0.068, J.hips[1] - 0.08, -0.06], [f ? 0.088 : 0.08, 0.09, f ? 0.075 : 0.066]), 0.05); // glute
    add(roundCone([sx * 0.04, J.neck[1] - 0.03, -0.015], J['sh' + s].map((v, i) => v + (i === 1 ? -0.015 : 0)), 0.052, 0.046), 0.05); // trapezius/shoulder
    add(ellipsoid(J['sh' + s].map((v, i) => v + (i === 1 ? -0.02 : i === 0 ? -sx * 0.01 : 0)), [0.05, 0.056, 0.052]), 0.04); // deltoid
    add(roundCone(J['sh' + s], J['el' + s], f ? 0.046 : 0.052, f ? 0.036 : 0.04), 0.03);
    add(roundCone(J['el' + s], J['wr' + s], f ? 0.037 : 0.042, f ? 0.026 : 0.029), 0.02);
    add(ellipsoid(m(J['wr' + s], J['tip' + s], 0.48), [0.021, 0.082, f ? 0.038 : 0.042]), 0.02); // hand
    add(roundCone([J['wr' + s][0] - sx * 0.006, J['wr' + s][1] - 0.03, 0.03], [J['wr' + s][0] - sx * 0.012, J['wr' + s][1] - 0.1, 0.05], 0.013, 0.01), 0.012); // thumb
    if (f) add(ellipsoid([sx * 0.054, J.chest[1] + 0.03, 0.075], [0.058, 0.056, 0.05]), 0.04);
  }
  add(ellipsoid([0, J.hips[1] - 0.03, 0], f ? [0.18, 0.12, 0.125] : [0.165, 0.115, 0.115]), 0.06); // pelvis
  add(ellipsoid([0, J.spine[1] + 0.02, 0.0], f ? [0.125, 0.13, 0.092] : [0.142, 0.13, 0.102]), 0.07); // abdomen
  add(ellipsoid([0, J.chest[1] + 0.04, -0.005], f ? [0.15, 0.15, 0.1] : [0.17, 0.155, 0.112]), 0.07); // ribcage/chest
  add(roundCone([0, J.neck[1] - 0.06, -0.005], [0, J.head[1] + 0.03, 0.005], 0.058, 0.05), 0.04); // neck
  return P;
}

/* ------------------------------ surface nets ------------------------------ */
function surfaceNets(sdf, lo, hi, step) {
  const nx = Math.ceil((hi[0] - lo[0]) / step) + 1, ny = Math.ceil((hi[1] - lo[1]) / step) + 1, nz = Math.ceil((hi[2] - lo[2]) / step) + 1;
  const F = new Float32Array(nx * ny * nz); const I = (x, y, z) => x + nx * (y + ny * z);
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) F[I(x, y, z)] = sdf([lo[0] + x * step, lo[1] + y * step, lo[2] + z * step]);
  const cellV = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1); const C = (x, y, z) => x + (nx - 1) * (y + (ny - 1) * z);
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let z = 0; z < nz - 1; z++) for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
    let mask = 0; for (let c = 0; c < 8; c++) { const [a, b, d] = corners[c]; v[c] = F[I(x + a, y + b, z + d)]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [e0, e1] of edges) { const a = v[e0], b = v[e1]; if ((a < 0) === (b < 0)) continue; const t = a / (a - b); const c0 = corners[e0], c1 = corners[e1]; sx += c0[0] + (c1[0] - c0[0]) * t; sy += c0[1] + (c1[1] - c0[1]) * t; sz += c0[2] + (c1[2] - c0[2]) * t; n++; }
    cellV[C(x, y, z)] = pos.length / 3; pos.push(lo[0] + (x + sx / n) * step, lo[1] + (y + sy / n) * step, lo[2] + (z + sz / n) * step);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    const inside = F[I(x, y, z)] < 0;
    if (x < nx - 1 && (F[I(x + 1, y, z)] < 0) !== inside) quad(cellV[C(x, y - 1, z - 1)], cellV[C(x, y, z - 1)], cellV[C(x, y, z)], cellV[C(x, y - 1, z)], inside);
    if (y < ny - 1 && (F[I(x, y + 1, z)] < 0) !== inside) quad(cellV[C(x - 1, y, z - 1)], cellV[C(x - 1, y, z)], cellV[C(x, y, z)], cellV[C(x, y, z - 1)], inside);
    if (z < nz - 1 && (F[I(x, y, z + 1)] < 0) !== inside) quad(cellV[C(x - 1, y - 1, z)], cellV[C(x, y - 1, z)], cellV[C(x, y, z)], cellV[C(x - 1, y, z)], inside);
  }
  // light laplacian smoothing to remove voxel stepping
  const P = new Float32Array(pos), N = P.length / 3; const nb = Array.from({ length: N }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  for (let it2 = 0; it2 < 2; it2++) { const Q = new Float32Array(P); for (let i = 0; i < N; i++) { if (!nb[i].size) continue; let ax = 0, ay = 0, az = 0; for (const j of nb[i]) { ax += P[j * 3]; ay += P[j * 3 + 1]; az += P[j * 3 + 2]; } const n = nb[i].size; Q[i * 3] = P[i * 3] * 0.5 + (ax / n) * 0.5; Q[i * 3 + 1] = P[i * 3 + 1] * 0.5 + (ay / n) * 0.5; Q[i * 3 + 2] = P[i * 3 + 2] * 0.5 + (az / n) * 0.5; } P.set(Q); }
  return { pos: P, idx };
}

/* ------------------------------ skeleton & weights ------------------------------ */
const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'faL', 'hdL', 'uaR', 'faR', 'hdR', 'thL', 'shL', 'ftL', 'thR', 'shR', 'ftR'];
const PARENT = { hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', uaL: 'chest', faL: 'uaL', hdL: 'faL', uaR: 'chest', faR: 'uaR', hdR: 'faR', thL: 'hips', shL: 'thL', ftL: 'shL', thR: 'hips', shR: 'thR', ftR: 'shR' };
function boneRest(J) {
  return { root: [0, 0, 0], hips: [0, J.hips[1], 0], spine: [0, J.spine[1], 0], chest: [0, J.chest[1], 0], neck: [0, J.neck[1], 0], head: [0, J.head[1], 0], uaL: J.shL, faL: J.elL, hdL: J.wrL, uaR: J.shR, faR: J.elR, hdR: J.wrR, thL: J.hpL, shL: J.knL, ftL: J.anL, thR: J.hpR, shR: J.knR, ftR: J.anR };
}
function segments(J) { // [bone, a, b]
  return [['hips', [0, J.hips[1] - 0.12, 0], [0, J.hips[1] + 0.03, 0]], ['spine', [0, J.hips[1] + 0.03, 0], [0, J.chest[1] - 0.02, 0]], ['chest', [0, J.chest[1] - 0.02, 0], [0, J.neck[1] - 0.02, 0]], ['neck', [0, J.neck[1] - 0.02, 0], [0, J.head[1] + 0.05, 0]],
    ...['L', 'R'].flatMap((s) => [['ua' + s, J['sh' + s], J['el' + s]], ['fa' + s, J['el' + s], J['wr' + s]], ['hd' + s, J['wr' + s], J['tip' + s]], ['th' + s, J['hp' + s], J['kn' + s]], ['sh' + s, J['kn' + s], J['an' + s]], ['ft' + s, J['an' + s], J['toe' + s]]])];
}
function segDist(p, a, b) { const ba = sub(b, a), pa = sub(p, a); const h = Math.max(0, Math.min(1, dot(pa, ba) / dot(ba, ba))); const q = [pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h]; return [Math.sqrt(dot(q, q)), h]; }

const SEG_R = { hips: 0.15, spine: 0.13, chest: 0.155, neck: 0.055, ua: 0.05, fa: 0.036, hd: 0.03, th: 0.08, sh: 0.052, ft: 0.04 };
const baseCache = {};
function bodyBase(f, step) {
  const key = (f ? 'f' : 'm') + step; if (baseCache[key]) return baseCache[key];
  const J = joints(f), prims = bodyPrims(f, J);
  const sdf = (p) => { let d = 1e9; for (const pr of prims) { const b = pr.box; if (p[0] < b[0] - 0.08 || p[0] > b[1] + 0.08 || p[1] < b[2] - 0.08 || p[1] > b[3] + 0.08 || p[2] < b[4] - 0.08 || p[2] > b[5] + 0.08) continue; d = smin(d, pr.f(p), pr.k); } return d; };
  const { pos, idx } = surfaceNets(sdf, [-0.36, -0.01, -0.2], [0.36, J.head[1] + 0.07, 0.26], step);
  const N = pos.length / 3, segs = segments(J);
  const skinIndex = new Uint16Array(N * 4), skinWeight = new Float32Array(N * 4), uv = new Float32Array(N * 2), seg = new Uint8Array(N), segT = new Float32Array(N);
  const chainOf = (bone) => { const c = [bone]; if (PARENT[bone] && PARENT[bone] !== 'root') c.push(PARENT[bone]); for (const [b2, p2] of Object.entries(PARENT)) if (p2 === bone) c.push(b2); return c; };
  for (let i = 0; i < N; i++) {
    const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    // distance to each bone's *surface* (thick torso vs thin limbs), not its centre line
    let best = 0, bd = 1e9, bt = 0; const ds = segs.map(([name, a, b], k) => { const [d0, h] = segDist(p, a, b); const rr = SEG_R[name.replace(/[LR]$/, '')] * (name === 'chest' ? 1 - Math.max(0, h - 0.7) * 2.4 : name === 'hips' ? 1 - Math.max(0, 0.3 - h) * 1.5 : 1); const d = d0 - rr; if (d < bd) { bd = d; best = k; bt = h; } return [d, h]; });
    seg[i] = best; segT[i] = bt;
    // weights among the nearest segment's bone chain only (prevents legs/arms pulling on each other)
    const chain = chainOf(segs[best][0]);
    const cands = segs.map((s, k) => [k, ds[k][0]]).filter(([k]) => chain.includes(segs[k][0])).sort((a, b) => a[1] - b[1]).slice(0, 3);
    let tot = 0; const ws = cands.map(([k, d]) => { const w = 1 / Math.pow(Math.max(d + 0.03, 0.006), 4); tot += w; return [BONES.indexOf(segs[k][0]), w]; });
    ws.forEach(([b, w], j) => { skinIndex[i * 4 + j] = b; skinWeight[i * 4 + j] = w / tot; });
    const [, a, b] = segs[best]; const ax = sub(b, a); const len = Math.sqrt(dot(ax, ax));
    // seamless planar projection (no wrap seam -> no smeared streaks)
    uv[i * 2] = (p[0] * 3.2 + p[2] * 2.2); uv[i * 2 + 1] = p[1] * 3.2; void len;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  g.setIndex(idx); g.computeVertexNormals();
  const nb = Array.from({ length: N }, () => []); for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
  return (baseCache[key] = { g, idx, seg, segT, segs, J, pos, N, nb });
}

/* ------------------------------ clothing regions ------------------------------ */
const R = { SKIN: 0, TOP: 1, ACC: 2, BOT: 3, SHOE: 4 };
function regionOf(name, t, p, J, top, bot, sho) {
  const s = top.style, b = bot.style;
  const longSl = ['waistcoat', 'shirt', 'hoodie', 'jacket', 'blazer', 'kurta', 'punjabi'].includes(s);
  const noSl = ['dress', 'crop', 'swim'].includes(s);
  if (name === 'neck') return R.SKIN;
  if (name.startsWith('hd')) return R.SKIN;
  if (name.startsWith('ft')) return sho.style === 'sandal' ? R.SKIN : R.SHOE;
  if (name.startsWith('ua')) return noSl ? (t < 0.12 && s !== 'swim' && s !== 'crop' ? R.TOP : R.SKIN) : (s === 'saree' && t > 0.45 ? R.SKIN : R.TOP);
  if (name.startsWith('fa')) return longSl ? (t > 0.94 ? (s === 'waistcoat' || s === 'blazer' ? R.TOP : R.SKIN) : R.TOP) : R.SKIN;
  const front = Math.abs(p[0]) < 0.048 && p[2] > 0.02;
  if (name === 'chest' || name === 'spine') {
    if (s === 'crop' && name === 'spine') return R.SKIN;
    if (s === 'saree' && name === 'spine' && p[1] > J.hips[1] + 0.05) return R.SKIN;
    if (s === 'waistcoat') { const vHalf = 0.03 + Math.max(0, p[1] - J.chest[1] + 0.12) * 0.36; return (p[2] > 0.03 && Math.abs(p[0]) < vHalf) || (p[1] > J.neck[1] - 0.02) ? R.TOP : R.ACC; }
    if (s === 'jacket' || s === 'blazer') return front && p[1] > J.spine[1] ? R.ACC : R.TOP;
    if (s === 'dress' && p[1] > J.neck[1] - 0.06 && Math.abs(p[0]) > 0.05) return R.SKIN;
    return R.TOP;
  }
  if (name === 'hips') return ['kurta', 'punjabi', 'dress', 'saree'].includes(s) ? R.TOP : (p[1] > J.hips[1] + 0.01 && !['shorts', 'skirt'].includes(b) ? (s === 'waistcoat' || s === 'shirt' ? R.ACC : R.TOP) : R.BOT);
  if (name.startsWith('th')) { if (b === 'shorts') return t < 0.55 ? R.BOT : R.SKIN; if (b === 'skirt' || s === 'dress') return R.SKIN; return R.BOT; }
  if (name.startsWith('sh')) return ['shorts', 'skirt'].includes(b) || s === 'dress' ? R.SKIN : R.BOT;
  return R.TOP;
}

/* ------------------------------ head ------------------------------ */
function buildHead(app) {
  const head = new THREE.Group();
  const add = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); me.castShadow = true; parent.add(me); return me; };
  const skin = new THREE.MeshStandardMaterial({ color: app.skin, roughness: 0.58 });
  const photo = photoFaceTexture(app);
  const faceMat = new THREE.MeshStandardMaterial({ map: photo || faceTexture(app), roughness: photo ? 0.7 : 0.6, envMapIntensity: 0.3 });
  add(head, bodyGeo('head', 'x'), faceMat, 0, 0, 0, 0.88, 1.0, 0.98);
  const ear = new THREE.SphereGeometry(0.018, 8, 6);
  add(head, ear, skin, -0.09, 0.0, -0.005, 0.6, 1.3, 1); add(head, ear, skin, 0.09, 0.0, -0.005, 0.6, 1.3, 1);
  if (!photo) add(head, new THREE.SphereGeometry(0.014, 8, 6), skin, 0, -0.012, 0.1, 0.9, 1.4, 1.1);
  buildHair(head, app, add, !!photo);
  const gl = it(app.glasses), hat = it(app.hat), ear2 = it(app.earrings);
  if (gl.style !== 'none' && !(photo && app.photoGlasses)) buildGlasses(head, gl, add);
  if (hat.style !== 'none') buildHat(head, hat, add);
  if (ear2.style !== 'none') for (const sx of [-1, 1]) { const em = mat(ear2.c[0], { m: 1, r: 0.25 }); const e = add(head, ear2.style === 'hoops' ? new THREE.TorusGeometry(0.016, 0.003, 6, 12) : ear2.style === 'studs' ? new THREE.SphereGeometry(0.007, 6, 6) : new THREE.ConeGeometry(0.011, 0.022, 10), em, sx * 0.092, ear2.style === 'jhumka' ? -0.04 : -0.03, 0.0); if (ear2.style === 'jhumka') e.rotation.x = Math.PI; }
  return mergeByMaterial(head);
}
// fewer draw calls: merge all static meshes in a group that share a material
export function mergeByMaterial(group) {
  group.updateMatrixWorld(true); const by = new Map(), keep = [];
  for (const o of group.children) { if (!o.isMesh || o.material.transparent) { keep.push(o); continue; } const g2 = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix); for (const k of Object.keys(g2.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g2.deleteAttribute(k); if (!g2.attributes.uv) g2.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g2.attributes.position.count * 2), 2)); if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(g2); }
  const out = new THREE.Group(); for (const [m, list] of by) { const me = new THREE.Mesh(mergeGeometries(list), m); me.castShadow = true; out.add(me); } for (const o of keep) out.add(o); return out;
}

let _fab = null;
function fabricTex() { // subtle woven detail multiplied over everything
  if (_fab) return _fab; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + (y % 4 ? 0.02 : 0)})`; g.fillRect(0, y, 128, 1); } for (let x = 0; x < 128; x += 2) { g.fillStyle = 'rgba(0,0,0,0.025)'; g.fillRect(x, 0, 1, 128); }
  _fab = new THREE.CanvasTexture(c); _fab.wrapS = _fab.wrapT = THREE.RepeatWrapping; _fab.colorSpace = THREE.SRGBColorSpace; return _fab;
}

/* ------------------------------ character ------------------------------ */
const lath = (pts, seg = 24, ps = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, ps, pl);
export let BODY_STEP = 0.016;
export function setBodyDetail(q) { BODY_STEP = q === 'high' ? 0.013 : q === 'low' ? 0.022 : 0.016; }
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qI = new THREE.Quaternion();
const MIDX = Object.fromEntries(MBONES.map((n, i) => [n, i]));
const LOCO = ['walk', 'jog', 'run'];
const MO_ACTS = { punch: 'punch', kick: 'kick', wave: 'wave' };

// bone direction pairs used to relate rest poses
const DIRP = { spine: ['spine', 'chest'], chest: ['chest', 'neck'], neck: ['neck', 'head'], head: ['head', 'headTop'] };
for (const s of ['L', 'R']) Object.assign(DIRP, { ['ua' + s]: ['ua' + s, 'fa' + s], ['fa' + s]: ['fa' + s, 'hd' + s], ['hd' + s]: ['hd' + s, 'tip' + s], ['th' + s]: ['th' + s, 'sh' + s], ['sh' + s]: ['sh' + s, 'ft' + s], ['ft' + s]: ['ft' + s, 'toe' + s] });
function procDirs(f) { // joint positions of the procedural animation's rest pose (arms hanging down)
  const J = joints(f); const P = { root: [0, 0, 0], hips: [0, J.hips[1], 0], spine: [0, J.spine[1], 0], chest: [0, J.chest[1], 0], neck: [0, J.neck[1], 0], head: [0, J.head[1], 0], headTop: [0, J.head[1] + 0.15, 0] };
  for (const s of ['L', 'R']) Object.assign(P, { ['ua' + s]: J['sh' + s], ['fa' + s]: J['el' + s], ['hd' + s]: J['wr' + s], ['tip' + s]: J['tip' + s], ['th' + s]: J['hp' + s], ['sh' + s]: J['kn' + s], ['ft' + s]: J['an' + s], ['toe' + s]: J['toe' + s] });
  return P;
}
const _va = new THREE.Vector3(), _vb = new THREE.Vector3();
function rest2(Jc, Jk) { // per bone: rotation taking this character's rest direction onto the canonical one
  const C = { inv: {} };
  for (const n of BONES) {
    const q = new THREE.Quaternion(); const d = DIRP[n];
    if (d && Jk[d[1]]) { _va.fromArray(Jc[d[1]]).sub(_vb.fromArray(Jc[d[0]])).normalize(); const t = new THREE.Vector3().fromArray(Jk[d[1]]).sub(_vb.fromArray(Jk[d[0]])).normalize(); q.setFromUnitVectors(_va, t); }
    C[n] = q; C.inv[n] = q.clone().invert();
  }
  C.inv[undefined] = new THREE.Quaternion();
  return C;
}

export class Character {
  constructor(app, hi = true) {
    this.hi = hi; this.root = new THREE.Group(); this.t = Math.random() * 10; this.phase = Math.random() * 6; this.act = null;
    this.gphase = Math.random(); this.itime = Math.random() * 10; this.idleClip = hi || Math.random() < 0.5 ? 'idle2' : 'idle';
    this.pa = new Pose(); this.pb = new Pose(); this.pc = new Pose(); this.pact = new Pose();
    this.setLook(app); this.walkClip = this.f ? 'walk2' : 'walk';
  }
  /* motion-capture base layer: idle / walk / jog / run blended by speed, sit, dance, talk */
  moBase(dt, state, speed, opt) {
    if (state === 'sit' && !opt.eating) { this.itime += dt; return sampleClip(CLIPS.sit, this.itime / CLIPS.sit.dur, this.pc); }
    if (state === 'dance') { this.itime += dt; return sampleClip(CLIPS.dance, this.itime / CLIPS.dance.dur, this.pc); }
    if (state !== 'walk') return null;
    const idle = CLIPS[opt.talk ? 'talk' : this.idleClip];
    if (speed < 0.05) { this.itime += dt; return sampleClip(idle, this.itime / idle.dur, this.pc); }
    const cl = [CLIPS[this.walkClip], CLIPS.jog, CLIPS.run];
    let i = 0; while (i < cl.length - 2 && speed > cl[i + 1].speed) i++;
    const A = cl[i], B = cl[i + 1]; const w = Math.max(0, Math.min(1, (speed - A.speed) / (B.speed - A.speed)));
    const stride = A.speed * A.dur * (1 - w) + B.speed * B.dur * w;
    this.gphase = (this.gphase + (speed * dt) / stride) % 1;
    sampleClip(A, this.gphase, this.pa); sampleClip(B, this.gphase, this.pb); blendPose(this.pa, this.pb, w, this.pc);
    const wi = Math.max(0, 1 - speed / 0.7);
    if (wi > 0) { this.itime += dt; sampleClip(idle, this.itime / idle.dur, this.pa); blendPose(this.pc, this.pa, wi, this.pc); }
    return this.pc;
  }
  setLook(app) {
    if (humansReady()) return this.setLookMH(app);
    return this.setLookLegacy(app);
  }
  setLookLegacy(app) {
    const key = JSON.stringify(app) + FACE.ver + BODY_STEP; if (this.key === key) return; this.key = key; this.app = app;
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    const f = app.gender === 'f'; this.f = f;
    const base = bodyBase(f, BODY_STEP); const J = base.J; this.J = J;
    const top = it(app.top), bot = it(app.bottom), sho = it(app.shoes);
    // clothing painted as smoothly-blended vertex colours (soft seams, one draw call)
    const regionV = new Uint8Array(base.N);
    for (let i = 0; i < base.N; i++) regionV[i] = regionOf(base.segs[base.seg[i]][0], base.segT[i], [base.pos[i * 3], base.pos[i * 3 + 1], base.pos[i * 3 + 2]], J, top, bot, sho);
    const accCol = top.style === 'waistcoat' ? top.c[1] : top.style === 'jacket' || top.style === 'blazer' ? (top.c[2] || '#f2f2f2') : top.style === 'shirt' ? top.c[0] : (bot.c[0] || '#333');
    const pal = [app.skin, top.style === 'saree' ? top.c[1] : (top.c[0] || '#888'), accCol, bot.c[0] || '#333', sho.c[0] || '#222'].map((c) => new THREE.Color(c));
    const rough = [0.55, top.style === 'jacket' ? 0.35 : 0.8, top.style === 'waistcoat' ? 0.4 : 0.75, bot.style === 'jeans' ? 0.9 : 0.8, sho.style === 'formal' ? 0.25 : 0.6];
    let col = new Float32Array(base.N * 3), rgh = new Float32Array(base.N);
    for (let i = 0; i < base.N; i++) { const c = pal[regionV[i]]; col.set([c.r, c.g, c.b], i * 3); rgh[i] = rough[regionV[i]]; }
    for (let pass = 0; pass < 2; pass++) { const nc = new Float32Array(col); for (let i = 0; i < base.N; i++) { const nb = base.nb[i]; if (!nb.length) continue; let r2 = col[i * 3], g2 = col[i * 3 + 1], b2 = col[i * 3 + 2]; for (const j of nb) { r2 += col[j * 3]; g2 += col[j * 3 + 1]; b2 += col[j * 3 + 2]; } const n = nb.length + 1; nc[i * 3] = r2 / n; nc[i * 3 + 1] = g2 / n; nc[i * 3 + 2] = b2 / n; } col = nc; }
    if (top.style === 'kurta' || top.style === 'punjabi' || top.style === 'jersey') { // woven pattern on the top garment
      const c2 = new THREE.Color(top.c[2] || top.c[1] || top.c[0]); for (let i = 0; i < base.N; i++) if (regionV[i] === R.TOP) { const x = base.pos[i * 3], y = base.pos[i * 3 + 1], z = base.pos[i * 3 + 2]; const v = top.style === 'jersey' ? (Math.floor((x + 1) * 14) % 2) : (Math.sin((x + z) * 90 + y * 90) * Math.sin((x - z) * 90 - y * 90) > 0.55 ? 1 : 0); if (v) { col[i * 3] = col[i * 3] * 0.6 + c2.r * 0.4; col[i * 3 + 1] = col[i * 3 + 1] * 0.6 + c2.g * 0.4; col[i * 3 + 2] = col[i * 3 + 2] * 0.6 + c2.b * 0.4; } }
    }
    const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) g.setAttribute(k, base.g.attributes[k]);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(base.g.index);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.2);
    const bodyM = new THREE.MeshPhysicalMaterial({ vertexColors: true, map: fabricTex(), roughness: 0.68, envMapIntensity: 0.35, sheen: 0.35, sheenColor: new THREE.Color('#fff0e8'), sheenRoughness: 0.7 });
    void rgh;
    // skeleton
    const rest = boneRest(J); const bones = {};
    for (const n of BONES) { const b = new THREE.Bone(); b.name = n; bones[n] = b; }
    for (const n of BONES) { const p = rest[n], pp = PARENT[n] ? rest[PARENT[n]] : [0, 0, 0]; bones[n].position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]); if (PARENT[n]) bones[PARENT[n]].add(bones[n]); }
    const mesh = new THREE.SkinnedMesh(g, bodyM); mesh.castShadow = true; mesh.frustumCulled = false;
    mesh.add(bones.root); mesh.bind(new THREE.Skeleton(BONES.map((n) => bones[n])));
    this.root.add(mesh); this.mesh = mesh; this.bones = bones;
    this.restQ = {}; for (const n of BONES) this.restQ[n] = new THREE.Quaternion();
    this.hipsY = bones.hips.position.y; this.Cp = null; this.Cm = MAN ? rest2(procDirs(f), MAN.chars.m.joints) : null; this.hand = null; this.mh = false;
    // head on the head bone
    const head = buildHead(app); head.position.set(0, 0.098, 0.014); bones.head.add(head); this.headG = head;
    this.dressUp(top, bot, bones, J, f);
    this.weaponKind = undefined; this.weapon = null;
  }

  /* ---------- realistic MakeHuman body (CC0 assets baked into chars/) ---------- */
  setLookMH(app) {
    const key = JSON.stringify(app) + FACE.ver + (this.hi ? 'H' : 'L'); if (this.key === key && this.complete) return; this.key = key; this.app = app;
    const L = lookParts(app, it); const ck = L.ck; this.f = ck === 'f';
    const bodyPart = this.hi ? 'body' : 'lod';
    const wear = [L.outfit, L.shoes]; const extra = this.hi ? ['eyes', 'eyelashes01', ck === 'f' ? 'eyebrow004' : 'eyebrow001'] : ['eyes'];
    const need = [bodyPart, ...wear, L.hair, ...extra]; const geos = need.map((n) => partGeo(ck, n));
    this.complete = geos.every(Boolean);
    if (!this.complete) { // build when everything has arrived
      if (!this._wait) this._wait = onHumanAsset(() => { if (need.every((n) => partGeo(ck, n))) { this._wait(); this._wait = null; this.key = null; this.setLookMH(this.app); } });
      if (!this.bones) { this.setLookLegacy(app); this.key = null; }
      return; // keep the current look until the parts arrive
    }
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    const C = MAN.chars[ck], J = C.joints;
    // skeleton (rest = MakeHuman A-pose, bone frames world-aligned)
    const bones = {};
    for (const n of BONES) { const b = new THREE.Bone(); b.name = n; bones[n] = b; }
    for (const n of BONES) { const p = J[n], pp = PARENT[n] ? J[PARENT[n]] : [0, 0, 0]; bones[n].position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]); if (PARENT[n]) bones[PARENT[n]].add(bones[n]); }
    const holder = new THREE.Group(); holder.add(bones.root); bones.root.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(BONES.map((n) => bones[n])); this.root.add(holder);
    const face = app.faceId && FACES[app.faceId] ? FACES[app.faceId].canvas : null;
    const skinM = this.hi ? new THREE.MeshPhysicalMaterial({ map: skinTexture(ck, app, face), roughness: 0.52, sheen: 0.3, sheenColor: new THREE.Color('#ff8a6a'), sheenRoughness: 0.55, envMapIntensity: 0.45 }) : crowdSkin(ck, app.skin);
    const mk = (name, material, index, colors) => {
      const src = partGeo(ck, name); const g = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) g.setAttribute(k, src.attributes[k]);
      if (colors) g.setAttribute('color', colors);
      g.setIndex(index || src.index); g.boundingSphere = src.boundingSphere;
      const m = new THREE.SkinnedMesh(g, material); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = false;
      holder.add(m); m.bind(skel, new THREE.Matrix4()); return m;
    };
    const bodyGeo = partGeo(ck, bodyPart);
    this.mesh = mk(bodyPart, skinM, bodyIndex(ck, bodyPart, bodyGeo, wear));
    const tinted = !app.npcNatural;
    const ts = L.top.style, layered = ts === 'waistcoat' || ts === 'blazer' || ts === 'jacket';
    const cols = [(ts === 'waistcoat' ? L.top.c[1] : L.top.c[0]) || '#888', L.bot.c[0] || '#333', L.sho.c[0] || '#222', layered ? (ts === 'waistcoat' ? L.top.c[0] : (L.top.c[2] || '#f2f0ea')) : (L.top.c[1] || L.top.c[0] || '#888')];
    const og = partGeo(ck, L.outfit); mk(L.outfit, clothMaterial(L.outfit, tinted), null, tinted ? regionColors(og, ck + L.outfit + cols.join(), cols) : null);
    const sg = partGeo(ck, L.shoes); mk(L.shoes, clothMaterial(L.shoes, tinted), null, tinted ? regionColors(sg, ck + L.shoes + cols.join(), cols) : null);
    if (!(app.hat && it(app.hat).style !== 'none' && it(app.hat).style !== 'beanie' && false)) mk(L.hair, hairMaterial(L.hair, app.hairColor || '#1a1410'));
    mk('eyes', smallMaterial('eyes', '#ffffff', 0));
    if (this.hi) { mk('eyelashes01', smallMaterial('eyelashes01', '#1a1410', 0.25)); if (!face) mk(ck === 'f' ? 'eyebrow004' : 'eyebrow001', smallMaterial(ck === 'f' ? 'eyebrow004' : 'eyebrow001', app.hairColor || '#1a1410', 0.25)); }
    this.bones = bones; this.J = J;
    this.restQ = {}; for (const n of BONES) this.restQ[n] = new THREE.Quaternion();
    this.hipsY = bones.hips.position.y;
    // canonical-frame corrections: animation authored for other rest poses is re-expressed for this skeleton
    this.Cp = rest2(J, procDirs(this.f)); this.Cm = rest2(J, MAN.chars.m.joints);
    // accessories (glasses / hats / earrings) anchored at the eyes
    const em = [(J.eyeL[0] + J.eyeR[0]) / 2, (J.eyeL[1] + J.eyeR[1]) / 2, (J.eyeL[2] + J.eyeR[2]) / 2];
    const sc = this.f ? 0.86 : 0.9; const acc = new THREE.Group(); acc.position.set(em[0] - J.head[0], em[1] - J.head[1] - 0.012 * sc, em[2] - J.head[2] + 0.026 - 0.112 * sc); acc.scale.setScalar(sc);
    const add = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); me.castShadow = true; parent.add(me); return me; };
    const gl = it(app.glasses), hat = it(app.hat), ear2 = it(app.earrings);
    if (gl.style !== 'none' && !(face && app.photoGlasses)) buildGlasses(acc, gl, add);
    if (hat.style !== 'none') buildHat(acc, hat, add);
    if (ear2.style !== 'none') for (const sx of [-1, 1]) { const emm = mat(ear2.c[0], { m: 1, r: 0.25 }); const e = add(acc, ear2.style === 'hoops' ? new THREE.TorusGeometry(0.014, 0.0025, 6, 12) : ear2.style === 'studs' ? new THREE.SphereGeometry(0.006, 6, 6) : new THREE.ConeGeometry(0.009, 0.02, 10), emm, sx * 0.083, ear2.style === 'jhumka' ? -0.045 : -0.035, 0.0); if (ear2.style === 'jhumka') e.rotation.x = Math.PI; }
    if (acc.children.length) bones.head.add(acc);
    this.hand = new THREE.Group(); this.hand.quaternion.copy(this.Cp.inv.hdR); bones.hdR.add(this.hand);
    this.weaponKind = undefined; this.weapon = null; this.mh = true;
  }
  dressUp(top, bot, B, J, f) {
    const add = (bone, geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; B[bone].add(me); return me; };
    const s = top.style, cy = J.chest[1], hy = J.hips[1];
    if (s === 'waistcoat' || s === 'blazer' || s === 'jacket') {
      const sat = mat('#34323a', { r: 0.22, m: 0.2 });
      for (const sx of [-1, 1]) { const l = add('chest', new THREE.BoxGeometry(0.026, 0.32, 0.012), s === 'waistcoat' ? sat : mat(shade(top.c[0], 0.15), { r: 0.5 }), sx * 0.062, J.neck[1] - cy - 0.17, 0.11); l.rotation.z = sx * 0.3; l.rotation.x = -0.12; }
      for (const sx of [-1, 1]) { const c = add('chest', new THREE.BoxGeometry(0.055, 0.03, 0.02), mat('#f6f4ee'), sx * 0.03, J.neck[1] - cy - 0.015, 0.07); c.rotation.z = sx * 0.6; }
      if (s !== 'jacket') { const tie = add('chest', new THREE.BoxGeometry(0.04, 0.3, 0.012), mat(s === 'waistcoat' ? top.c[2] : '#2a2a35', { r: 0.35 }), 0, J.neck[1] - cy - 0.18, 0.116); tie.rotation.x = -0.18; add('chest', new THREE.BoxGeometry(0.046, 0.035, 0.03), tie.material, 0, J.neck[1] - cy - 0.035, 0.1); }
      if (s === 'waistcoat') for (let k = 0; k < 4; k++) add('chest', new THREE.SphereGeometry(0.006, 6, 4), mat('#111', { r: 0.2 }), 0.05, -0.1 + k * 0.055, 0.112);
      if (this.app.pin) { add('chest', new THREE.BoxGeometry(0.02, 0.026, 0.008), mat('#b8282a', { r: 0.3, m: 0.4 }), 0.1, 0.07, 0.11); add('chest', new THREE.BoxGeometry(0.003, 0.07, 0.003), mat('#e3b341', { m: 1, r: 0.2 }), 0.088, 0.03, 0.113).rotation.z = 0.5; add('chest', new THREE.BoxGeometry(0.017, 0.02, 0.008), mat('#b8282a', { r: 0.3, m: 0.4 }), 0.075, -0.01, 0.113); }
    }
    if (s === 'kurta' || s === 'punjabi') {
      const hm = clothMat(top, 'torso').clone(); hm.side = THREE.DoubleSide;
      add('hips', lath([[0.165, 0.06], [0.175, -0.05], [0.2, -0.22], [0.225, -0.4], [0.23, -0.43]], 28), hm, 0, 0, 0).scale.set(f ? 1.04 : 1, 1, 0.74);
      const zari = new THREE.MeshStandardMaterial({ map: pattern('zari', top.c[1] || top.c[0], top.c[2] || '#f0d488'), roughness: 0.4, metalness: 0.4 });
      add('hips', new THREE.CylinderGeometry(0.232, 0.232, 0.035, 28, 1, true), zari, 0, -0.41, 0).scale.set(f ? 1.04 : 1, 1, 0.75);
      add('chest', new THREE.TorusGeometry(0.06, 0.009, 6, 20, Math.PI), zari, 0, J.neck[1] - cy - 0.03, 0.07).rotation.z = Math.PI;
      if (s === 'kurta') { const d = add('chest', new THREE.CylinderGeometry(0.19, 0.19, 0.12, 20, 1, true, -0.4, 1.5), new THREE.MeshStandardMaterial({ color: shade(top.c[0], 0.3), transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.6 }), 0, 0.05, 0); d.rotation.z = -0.62; d.scale.z = 0.72; d.castShadow = false; }
    }
    if (s === 'saree' || s === 'dress') {
      const len = s === 'saree' ? 0.9 : 0.5; const m2 = mat(top.c[0], { r: 0.55 }).clone(); m2.side = THREE.DoubleSide;
      add('hips', lath([[0.15, 0.06], [0.17, -0.06], [0.22, -len * 0.5], [s === 'saree' ? 0.25 : 0.3, -len + 0.04]], 28), m2).scale.z = 0.82;
      if (s === 'saree') { add('hips', new THREE.CylinderGeometry(0.252, 0.252, 0.07, 28, 1, true), mat(top.c[2], { r: 0.35, m: 0.5 }), 0, -len + 0.07, 0).scale.z = 0.82; const pal = add('chest', new THREE.BoxGeometry(0.13, 0.9, 0.014), mat(top.c[1], { r: 0.5 }), 0.02, -0.12, 0.115); pal.rotation.z = 0.5; }
    }
    if (bot.style === 'skirt' && s !== 'dress' && s !== 'saree') { const m2 = mat(bot.c[0]).clone(); m2.side = THREE.DoubleSide; add('hips', lath([[0.165, 0.04], [0.2, -0.15], [0.26, -0.32]], 24), m2).scale.z = 0.82; }
    if (bot.style === 'palazzo' || bot.style === 'dhoti') for (const sd of ['L', 'R']) { const m2 = mat(bot.c[0], { r: 0.8 }).clone(); m2.side = THREE.DoubleSide; add('sh' + sd, lath([[0.065, 0.05], [0.09, -0.2], [0.12, -0.4]], 16), m2); }
    if (s === 'hoodie') add('chest', new THREE.TorusGeometry(0.09, 0.04, 8, 16), mat(top.c[1]), 0, J.neck[1] - cy, -0.06).rotation.x = Math.PI / 2.4;
    if (['waistcoat', 'shirt'].includes(s) && !['kurta'].includes(s)) add('hips', new THREE.CylinderGeometry(0.16, 0.16, 0.035, 24, 1, true), mat('#141216', { r: 0.4 }), 0, 0.03, 0).scale.z = 0.72;
  }
  holdWeapon(kind) {
    if (this.weaponKind === kind) return; this.weaponKind = kind;
    if (this.weapon) this.weapon.parent.remove(this.weapon); this.weapon = null; if (!kind) return;
    const g = new THREE.Group(); const dark = mat('#1d1b20', { m: 0.6, r: 0.35 });
    const box = (w, h, d, x, y, z, m = dark) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); g.add(me); };
    if (kind === 'pistol') { box(0.028, 0.035, 0.17, 0, 0, 0.06); box(0.026, 0.09, 0.035, 0, -0.045, 0); }
    if (kind === 'smg') { box(0.035, 0.05, 0.32, 0, 0, 0.1); box(0.03, 0.12, 0.03, 0, -0.06, 0.02); box(0.025, 0.1, 0.03, 0, -0.06, 0.14); }
    if (kind === 'shotgun' || kind === 'rifle') { box(0.035, 0.045, 0.72, 0, 0, 0.22); box(0.04, 0.09, 0.18, 0, -0.03, -0.12, mat(kind === 'shotgun' ? '#5a3a20' : '#2a2a2e', { r: 0.6 })); box(0.03, 0.08, 0.03, 0, -0.06, 0.04); }
    if (kind === 'knife') { box(0.004, 0.028, 0.16, 0, 0, 0.1, mat('#d8dce4', { m: 1, r: 0.15 })); box(0.02, 0.025, 0.08, 0, 0, 0, mat('#2a1a10')); }
    if (kind === 'bat') { box(0.07, 0.05, 0.62, 0, 0, 0.34, mat('#d8b070', { r: 0.6 })); box(0.03, 0.03, 0.2, 0, 0, 0, mat('#1d1b20')); }
    g.position.set(0, -0.09, 0.02); g.rotation.x = -Math.PI / 2; (this.hand || this.bones.hdR).add(g); this.weapon = g;
  }
  play(name, dur) { if (MO_ACTS[name] && CLIPS[MO_ACTS[name]] && !dur) dur = CLIPS[MO_ACTS[name]].dur; this.act = { name, t: 0, dur: dur || ({ punch: 0.45, slap: 0.5, kick: 0.6, throw: 0.9, hit: 0.5, shoot: 0.18, wave: 1.2 }[name] || 0.5) }; }

  /* ------------------------------ animation ------------------------------ */
  animate(dt, state, speed, opt = {}) {
    if (!this.bones) return;
    this.t += dt; const t = this.t;
    const P = {}; let touch = false; const T = new Set(); const set = (n, x = 0, y = 0, z = 0) => { P[n] = [x, y, z]; if (touch) T.add(n); };
    for (const n of BONES) set(n);
    let hipsDY = 0, hipsDZ = 0, hipsDX = 0;
    const L = 'L', Rr = 'R';
    const mo = this.moBase(dt, state, speed, opt);
    if (mo) { const sc = this.f ? 0.966 : 1; hipsDX = mo.h[0] * sc; hipsDY = mo.h[1] * sc; hipsDZ = mo.h[2] * sc; if (state === 'sit') { hipsDY = -0.44; hipsDZ = -0.05; hipsDX = 0; } }
    else if (state === 'sit' || state === 'drive' || state === 'boat') {
      hipsDY = -0.44; hipsDZ = -0.05;
      for (const s of [L, Rr]) { set('th' + s, -1.5, 0, s === L ? -0.06 : 0.06); set('sh' + s, 1.45); set('ft' + s, 0.05); }
      set('spine', 0.06); set('chest', -0.02);
      if (state === 'drive') { set('uaL', -0.95, 0, 0.2); set('faL', -0.55); set('uaR', -0.95, 0, -0.2); set('faR', -0.55); }
      else if (state === 'boat') { const r = Math.sin(t * 3); set('uaL', -1.0 - r * 0.5, 0, 0.3); set('uaR', -1.0 - r * 0.5, 0, -0.3); set('faL', -0.6); set('faR', -0.6); set('spine', 0.1 + r * 0.15); }
      else { set('uaL', -0.32, 0, 0.12); set('faL', -0.95); set('uaR', -0.32, 0, -0.12); set('faR', -0.95); if (opt.eating) { set('uaR', -0.9 + Math.sin(t * 4) * 0.25, 0, -0.2); set('faR', -1.9); } }
      set('head', -0.05 + Math.sin(t * 0.7) * 0.03, Math.sin(t * 0.35) * 0.3);
    } else if (state === 'swim') {
      hipsDY = -0.72; set('hips', 1.42); const p = t * 4.5;
      set('uaL', -Math.PI + ((p % (Math.PI * 2)) - Math.PI), 0, 0.2); set('uaR', -Math.PI + (((p + Math.PI) % (Math.PI * 2)) - Math.PI), 0, -0.2); set('faL', -0.3); set('faR', -0.3);
      set('thL', Math.sin(p * 2) * 0.35); set('thR', -Math.sin(p * 2) * 0.35); set('head', -1.0, Math.sin(p) * 0.4);
    } else if (state === 'ko') {
      hipsDY = -0.82; set('hips', -1.45, 0, 0.1); set('uaL', 0.2, 0, 1.2); set('uaR', 0.2, 0, -1.2); set('faL', -0.3); set('faR', -0.3); set('thL', -0.15, 0, 0.15); set('thR', -0.3, 0, -0.1); set('shL', 0.3); set('shR', 0.6); set('head', 0.3, 0.5);
    } else if (state === 'hands') {
      set('uaL', 0, 0, 2.75); set('faL', 0, 0, 0.55); set('uaR', 0, 0, -2.75); set('faR', 0, 0, -0.55); set('head', -0.1 + Math.sin(t * 9) * 0.03); set('spine', -0.06); hipsDY = Math.sin(t * 9) * 0.004;
    } else if (state === 'dance') {
      const p = t * 6.2; hipsDY = -Math.abs(Math.sin(p)) * 0.07; set('hips', 0, Math.sin(p / 2) * 0.35, Math.sin(p) * 0.1); set('spine', 0, -Math.sin(p / 2) * 0.25, -Math.sin(p) * 0.08); set('chest', 0.05, Math.sin(p / 2) * 0.2);
      set('uaL', -0.3, 0, 1.9 + Math.sin(p) * 0.5); set('faL', -0.8 - Math.sin(p) * 0.4); set('uaR', -0.3, 0, -1.9 - Math.cos(p) * 0.5); set('faR', -0.8 - Math.cos(p) * 0.4);
      set('thL', -0.25 - Math.max(0, Math.sin(p)) * 0.4); set('shL', 0.5 + Math.max(0, Math.sin(p)) * 0.5); set('thR', -0.25 - Math.max(0, -Math.sin(p)) * 0.4); set('shR', 0.5 + Math.max(0, -Math.sin(p)) * 0.5); set('head', Math.sin(p * 2) * 0.12, Math.sin(p / 2) * 0.3);
    } else {
      // locomotion: phase tied to distance travelled so feet don't slide
      const cycle = speed > 3.2 ? 2.3 : 1.3; this.phase += (Math.PI * 2 * speed * dt) / cycle; const ph = this.phase;
      const a = Math.min(1, speed / 1.3), r = Math.max(0, Math.min(1, (speed - 2.6) / 2.4));
      if (speed > 0.08) {
        const thA = 0.42 + r * 0.45, knA = 0.7 + r * 0.9;
        for (const [s, off] of [[L, 0], [Rr, Math.PI]]) {
          const ps = ph + off, th = -Math.sin(ps) * thA * a, kn = (0.08 + Math.max(0, Math.cos(ps)) * knA + r * 0.25 * Math.max(0, -Math.cos(ps))) * a;
          set('th' + s, th - r * 0.15, 0, (s === L ? 1 : -1) * 0.02); set('sh' + s, kn); set('ft' + s, -(th + kn) * 0.55 + Math.sin(ps) * 0.12 * a);
        }
        hipsDY = Math.cos(ph * 2) * (0.018 + r * 0.03) * a - r * 0.06;
        set('hips', r * 0.08, Math.sin(ph) * (0.12 + r * 0.05) * a, Math.sin(ph) * 0.035 * a);
        set('spine', r * 0.16 + 0.03 * a, -Math.sin(ph) * 0.08 * a, -Math.sin(ph) * 0.02 * a); set('chest', r * 0.06, -Math.sin(ph) * 0.07 * a);
        const arA = 0.32 + r * 0.42, elb = 0.22 + r * 1.15;
        set('uaL', Math.sin(ph) * arA * a, 0, 0.1 + r * 0.06); set('faL', -(elb + Math.max(0, -Math.sin(ph)) * 0.25) * a);
        set('uaR', -Math.sin(ph) * arA * a, 0, -0.1 - r * 0.06); set('faR', -(elb + Math.max(0, Math.sin(ph)) * 0.25) * a);
        set('head', -r * 0.12 + Math.cos(ph * 2) * 0.015, -(P.hips[1] + P.spine[1] + P.chest[1]) * 0.85);
      } else {
        // idle: breathing, weight shift, glance around
        const b = Math.sin(t * 1.7), w = Math.sin(t * 0.45);
        set('hips', 0, w * 0.04, w * 0.03); hipsDY = -Math.abs(w) * 0.008;
        set('thL', 0, 0, 0.03 - w * 0.03); set('thR', 0, 0, -0.03 - w * 0.03); set('shL', Math.max(0, -w) * 0.12); set('shR', Math.max(0, w) * 0.12);
        set('spine', 0.02 + b * 0.012, -w * 0.03, -w * 0.03); set('chest', b * 0.015);
        set('uaL', 0.04, 0, 0.09 + b * 0.01); set('faL', -0.14); set('uaR', 0.04, 0, -0.09 - b * 0.01); set('faR', -0.14);
        const look = Math.sin(t * 0.23) > 0.6 ? Math.sin(t * 0.9) * 0.5 : 0; set('head', 0.02, look, 0);
      }
    }
    touch = true;
    if (opt.aim) { set('uaR', -1.45, -0.15, -0.1); set('faR', -0.05); if (this.weaponKind && this.weaponKind !== 'pistol' && this.weaponKind !== 'knife' && this.weaponKind !== 'bat') { set('uaL', -1.2, 0.5, 0.2); set('faL', -0.8); } set('chest', P.chest[0], 0.2); }
    if (opt.carry) { set('uaL', -0.55, 0, 0.1); set('faL', -1.25); set('uaR', -0.55, 0, -0.1); set('faR', -1.25); }
    if (opt.wave) { set('uaR', 0, 0, -2.5); set('faR', 0, 0, -0.45 + Math.sin(t * 10) * 0.45); }
    // one-shot actions layered on top
    let actPose = null, actW = 0, actMask = null;
    if (this.act) {
      const A = this.act; A.t += dt; const u = Math.min(1, A.t / A.dur), e = Math.sin(Math.PI * u), e2 = u < 0.35 ? u / 0.35 : 1 - (u - 0.35) / 0.65;
      const mc = MO_ACTS[A.name] && CLIPS[MO_ACTS[A.name]];
      if (mc) { sampleClip(mc, u, this.pact); actPose = this.pact; actW = Math.min(1, A.t / 0.15, (A.dur - A.t) / 0.2); actMask = speed > 0.5 && A.name !== 'kick' ? UPPER : null; }
      else switch (A.name) {
        case 'punch': set('uaR', -1.45 * e2, 0.15 * e2, -0.15); set('faR', -1.6 * (1 - e2)); set('chest', 0.05, -0.45 * e2); set('spine', 0.08, -0.2 * e2); set('uaL', -0.6, 0, 0.2); set('faL', -1.8); break;
        case 'slap': set('uaR', -0.7, 0, -0.9 + 1.6 * u); set('faR', -0.6 + 0.4 * e); set('chest', 0, 0.5 - 1.0 * u); break;
        case 'kick': set('thR', -1.6 * e2); set('shR', 1.2 * (1 - e2) * Math.min(1, u * 4)); set('spine', -0.25 * e2); set('uaL', -0.4, 0, 0.6 * e); set('uaR', -0.4, 0, -0.6 * e); hipsDY += -0.02 * e; break;
        case 'throw': { const k = u < 0.4 ? u / 0.4 : 1, up = u < 0.4 ? 0 : (u - 0.4) / 0.6; set('uaL', -0.9 - 1.7 * up, 0, 0.15); set('uaR', -0.9 - 1.7 * up, 0, -0.15); set('faL', -0.8 * (1 - up)); set('faR', -0.8 * (1 - up)); set('spine', 0.35 * k * (1 - up) - 0.3 * up); for (const s of [L, Rr]) { set('th' + s, -0.4 * k * (1 - up)); set('sh' + s, 0.7 * k * (1 - up)); } hipsDY += -0.15 * k * (1 - up); break; }
        case 'hit': set('spine', -0.35 * e); set('chest', -0.2 * e, 0.3 * e); set('head', -0.45 * e, 0.3 * e); set('uaL', 0.3 * e, 0, 0.5 * e); set('uaR', 0.3 * e, 0, -0.5 * e); break;
        case 'shoot': set('uaR', -1.45 - 0.25 * e, -0.15, -0.1); set('faR', -0.05); break;
        case 'wave': set('uaR', 0, 0, -2.5); set('faR', 0, 0, -0.45 + Math.sin(t * 10) * 0.45); break;
      }
      if (u >= 1) this.act = null;
    }
    // apply with smooth blending (transitions never snap)
    const k = 1 - Math.exp(-dt * (mo ? 28 : 16));
    for (const n of BONES) {
      if (n === 'root') continue; const mi = MIDX[n];
      const useMo = mo && !T.has(n);
      if (useMo) _q.fromArray(mo.q, mi * 4); else { const v = P[n]; _q.setFromEuler(_e.set(v[0], v[1], v[2], 'YXZ')); }
      if (useMo && (n === 'head' || n === 'neck') && !this.act) _q.slerp(_qI, 0.55); // keep the gaze up and forward
      const Cs = useMo ? this.Cm : this.Cp; if (Cs) _q.premultiply(Cs.inv[PARENT[n]]).multiply(Cs[n]);
      if (actPose && actW > 0 && (!actMask || actMask[mi])) { _q2.fromArray(actPose.q, mi * 4); if (this.Cm) _q2.premultiply(this.Cm.inv[PARENT[n]]).multiply(this.Cm[n]); _q.slerp(_q2, Math.max(0, actW)); }
      this.bones[n].quaternion.slerp(_q, k);
    }
    if (actPose && actW > 0 && !actMask) { const w = Math.max(0, actW); hipsDY = hipsDY * (1 - w) + actPose.h[1] * w; hipsDX = hipsDX * (1 - w) + actPose.h[0] * w; hipsDZ = hipsDZ * (1 - w) + actPose.h[2] * w; }
    const hb = this.bones.hips; hb.position.y += (this.hipsY + hipsDY - hb.position.y) * k; hb.position.z += (hipsDZ - hb.position.z) * k; hb.position.x += (hipsDX - hb.position.x) * k;
  }
}
