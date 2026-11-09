// Realistic 3D models (CC-BY 4.0, credited in README / CREDITS.md), simplified offline into models/*.glb.
// Animals get an automatic skeleton (legs, neck, head, tail) fitted to the mesh and a procedural gait,
// the helicopter's main rotor is split off so it can spin, and sports cars are repainted per colour.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE = new URL('../models/', import.meta.url).href;
// flip: model faces -z and is turned to face +z; yaw: extra turn (vehicles face +x in this game)
const SPEC = {
  horse: { flip: true }, cow: {}, dog: {},
  heli: { flip: true },
  car_gallardo: { yaw: Math.PI / 2, paint: /Car_Paint|Gallardo_Base/i },
  car_718: { yaw: Math.PI / 2, paint: /Paint_Material|Coloured_Material/i },
};
export const RM = {};
export function loadRealModels() {
  const L = new GLTFLoader();
  return Promise.all(Object.keys(SPEC).map((n) => L.loadAsync(BASE + n + '.glb').then((g) => {
    const s = SPEC[n], root = g.scene; root.updateMatrixWorld(true);
    const parts = []; root.traverse((m) => { if (m.isMesh) { const geo = m.geometry.clone().applyMatrix4(m.matrixWorld); if (s.flip) geo.rotateY(Math.PI); if (s.yaw) geo.rotateY(s.yaw); geo.computeBoundingBox(); geo.computeBoundingSphere(); m.material.side = THREE.FrontSide; parts.push({ geo, mat: m.material }); } });
    RM[n] = { parts };
  }).catch((e) => console.warn('model', n, e))));
}
export const hasReal = (n) => !!RM[n];

/* ---------------------------------- animals ---------------------------------- */
const RIG = {
  horse: { legTop: 0.5, knee: 0.27, neck: 0.22, head: 0.38, tail: -0.42, stride: 2.6, walkA: 0.42, graze: 0.75 },
  cow: { legTop: 0.48, knee: 0.24, neck: 0.25, head: 0.4, tail: -0.43, stride: 2.0, walkA: 0.32, graze: 0.6 },
  dog: { legTop: 0.5, knee: 0.25, neck: 0.25, head: 0.38, tail: -0.4, stride: 1.0, walkA: 0.55, graze: 0.25 },
};
const BN = ['root', 'body', 'neck', 'head', 'tail', 'uFL', 'lFL', 'uFR', 'lFR', 'uBL', 'lBL', 'uBR', 'lBR'];
const rigCache = {};
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function buildRig(kind) {
  if (rigCache[kind]) return rigCache[kind];
  const R = RIG[kind], parts = RM[kind].parts;
  const box = new THREE.Box3(); for (const p of parts) box.union(p.geo.boundingBox);
  const H = box.max.y, Lz = box.max.z - box.min.z, z0 = box.min.z;
  const legTop = H * R.legTop, knee = H * R.knee;
  // find the four feet from low vertices
  const feet = { FL: [], FR: [], BL: [], BR: [] }; const zc = (box.min.z + box.max.z) / 2;
  for (const p of parts) { const a = p.geo.attributes.position; for (let i = 0; i < a.count; i++) { const y = a.getY(i); if (y > H * 0.12) continue; const x = a.getX(i), z = a.getZ(i); feet[(z > zc ? 'F' : 'B') + (x > 0 ? 'L' : 'R')].push([x, z]); } }
  const fp = {}; for (const k in feet) { const l = feet[k]; const m = l.reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0]); fp[k] = l.length ? [m[0] / l.length, m[1] / l.length] : [k[1] === 'L' ? 0.15 : -0.15, k[0] === 'F' ? zc + Lz * 0.3 : zc - Lz * 0.3]; }
  const zMid = ((fp.FL[1] + fp.FR[1]) / 2 + (fp.BL[1] + fp.BR[1]) / 2) / 2;
  const neckZ = zc + Lz * R.neck, headZ = zc + Lz * R.head, tailZ = zc + Lz * R.tail;
  const rest = { root: [0, 0, 0], body: [0, legTop, zc], neck: [0, legTop + H * 0.18, neckZ - Lz * 0.04], head: [0, H * 0.82, headZ], tail: [0, legTop + H * 0.22, tailZ] };
  for (const k of ['FL', 'FR', 'BL', 'BR']) { rest['u' + k] = [fp[k][0], legTop, fp[k][1]]; rest['l' + k] = [fp[k][0], knee, fp[k][1]]; }
  const PAR = { body: 'root', neck: 'body', head: 'neck', tail: 'body' }; for (const k of ['FL', 'FR', 'BL', 'BR']) { PAR['u' + k] = 'body'; PAR['l' + k] = 'u' + k; }
  // skin weights
  const geos = parts.map((p) => {
    const g = p.geo.clone(), a = g.attributes.position, n = a.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      const leg = (z > zMid ? 'F' : 'B') + (x > 0 ? 'L' : 'R');
      const wLeg = 1 - ss(legTop - H * 0.07, legTop + H * 0.05, y), wLow = 1 - ss(knee - H * 0.05, knee + H * 0.05, y);
      const wNeck = ss(neckZ - Lz * 0.06, neckZ + Lz * 0.06, z) * ss(legTop * 0.75, legTop * 1.05, y), wHead = ss(headZ - Lz * 0.05, headZ + Lz * 0.03, z);
      const wTail = ss(tailZ + Lz * 0.03, tailZ - Lz * 0.03, z) * ss(legTop * 0.6, legTop * 0.9, y);
      const w = { body: (1 - wLeg) * (1 - wNeck) * (1 - wTail), neck: (1 - wLeg) * wNeck * (1 - wHead), head: (1 - wLeg) * wNeck * wHead, tail: (1 - wLeg) * (1 - wNeck) * wTail };
      w['u' + leg] = wLeg * (1 - wLow); w['l' + leg] = wLeg * wLow;
      const top = Object.entries(w).sort((p, q) => q[1] - p[1]).slice(0, 4); let tot = top.reduce((s, v) => s + v[1], 0); if (tot < 1e-4) { top[0] = ['body', 1]; tot = 1; }
      top.forEach(([b, v], k) => { si[i * 4 + k] = BN.indexOf(b); sw[i * 4 + k] = v / tot; });
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    return { geo: g, mat: p.mat };
  });
  return (rigCache[kind] = { geos, rest, PAR, R, H, Lz });
}
export function realAnimal(kind) {
  const rig = buildRig(kind); const g = new THREE.Group(); g.userData.kind = kind; g.userData.legs = [];
  const bones = {}; for (const n of BN) { bones[n] = new THREE.Bone(); bones[n].name = n; }
  for (const n of BN) { const p = rig.rest[n], pp = rig.PAR[n] ? rig.rest[rig.PAR[n]] : [0, 0, 0]; bones[n].position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]); if (rig.PAR[n]) bones[rig.PAR[n]].add(bones[n]); }
  g.add(bones.root); bones.root.updateMatrixWorld(true); const skel = new THREE.Skeleton(BN.map((n) => bones[n]));
  for (const { geo, mat } of rig.geos) { const m = new THREE.SkinnedMesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.bind(skel, new THREE.Matrix4()); m.boundingSphere = geo.boundingSphere.clone(); g.add(m); }
  const st = { phase: Math.random(), t: Math.random() * 20, graze: 0, by: bones.body.position.y };
  g.userData.real = (time, moving, flying, speed) => {
    const dt = Math.min(0.1, Math.max(0, time - (st.last ?? time))); st.last = time; st.t += dt;
    const R = rig.R, sp = flying ? 0 : moving ? (speed || R.stride * 0.6) : 0;
    st.phase = (st.phase + (sp * dt) / R.stride) % 1; const run = sp > R.stride * 1.1;
    const P = st.phase * Math.PI * 2, A = moving ? R.walkA * (run ? 1.25 : 1) : 0;
    // walk: lateral sequence; run: diagonal trot
    const off = run ? { FL: 0, BR: 0, FR: 0.5, BL: 0.5 } : { FL: 0, BR: 0.25, FR: 0.5, BL: 0.75 };
    for (const k of ['FL', 'FR', 'BL', 'BR']) {
      const ph = P + off[k] * Math.PI * 2, swing = -Math.sin(ph) * A, lift = Math.max(0, Math.cos(ph)) * A * 1.6;
      bones['u' + k].rotation.x = flying ? Math.sin(st.t * 18 + off[k] * 6) * 0.9 : swing;
      bones['l' + k].rotation.x = flying ? 0.6 : (k[0] === 'F' ? lift : -lift * 0.8);
    }
    st.graze += ((!moving && !flying && Math.sin(st.t * 0.21 + rig.H) > 0.2 ? 1 : 0) - st.graze) * Math.min(1, dt * 1.5);
    bones.body.position.y = st.by + (moving ? Math.abs(Math.sin(P * 2)) * 0.02 * rig.H : 0);
    bones.body.rotation.x = moving ? Math.sin(P * 2) * 0.015 : 0;
    bones.neck.rotation.x = st.graze * R.graze + (moving ? Math.sin(P * 2) * 0.06 : Math.sin(st.t * 0.6) * 0.04);
    bones.neck.rotation.y = moving ? 0 : Math.sin(st.t * 0.37) * 0.25 * (1 - st.graze);
    bones.head.rotation.x = st.graze * 0.25 + (st.graze > 0.5 ? Math.sin(st.t * 3) * 0.06 : 0);
    bones.tail.rotation.y = Math.sin(st.t * (kind === 'dog' ? (moving ? 9 : 5) : 1.7)) * (kind === 'dog' ? 0.5 : 0.3);
    bones.tail.rotation.x = kind === 'dog' ? -0.5 : 0.15;
  };
  return g;
}

/* ---------------------------------- helicopter ---------------------------------- */
let heliProto = null;
function heliParts() {
  if (heliProto) return heliProto;
  const parts = RM.heli.parts; let maxY = -1e9; for (const p of parts) maxY = Math.max(maxY, p.geo.boundingBox.max.y);
  const cut = maxY - 0.45, body = [], rotor = []; let cx = 0, cz = 0, cn = 0, hx = 0, hz = 0, hn = 0, zmin = 1e9, zmax = -1e9;
  for (const p of parts) { const a = p.geo.attributes.position; for (let i = 0; i < a.count; i++) { zmin = Math.min(zmin, a.getZ(i)); zmax = Math.max(zmax, a.getZ(i)); if (a.getY(i) > maxY - 0.12) { hx += a.getX(i); hz += a.getZ(i); hn++; } } }
  hx /= hn || 1; hz /= hn || 1; const rad = (zmax - zmin) * 0.48;
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo, a = g.attributes.position, keepB = [], keepR = [];
    for (let i = 0; i < a.count; i += 3) { let hi = a.getY(i) > cut && a.getY(i + 1) > cut && a.getY(i + 2) > cut; if (hi) for (let k = 0; k < 3; k++) if (Math.hypot(a.getX(i + k) - hx, a.getZ(i + k) - hz) > rad) hi = false; (hi ? keepR : keepB).push(i); if (hi) for (let k = 0; k < 3; k++) { cx += a.getX(i + k); cz += a.getZ(i + k); cn++; } }
    const sub = (list) => { if (!list.length) return null; const ng = new THREE.BufferGeometry(); for (const [name, at] of Object.entries(g.attributes)) { const arr = new Float32Array(list.length * 3 * at.itemSize); list.forEach((i, j) => { for (let k = 0; k < 3; k++) for (let c = 0; c < at.itemSize; c++) arr[(j * 3 + k) * at.itemSize + c] = at.getComponent(i + k, c); }); ng.setAttribute(name, new THREE.BufferAttribute(arr, at.itemSize)); } return ng; };
    const b = sub(keepB), r = sub(keepR); if (b) body.push({ geo: b, mat: p.mat }); if (r) rotor.push({ geo: r, mat: p.mat });
  }
  const c = hn ? [hx, hz] : cn ? [cx / cn, cz / cn] : [0, 0]; void cx; void cz; for (const r of rotor) r.geo.translate(-c[0], 0, -c[1]);
  return (heliProto = { body, rotor, c });
}
export function realHeli(police) {
  const P = heliParts(), g = new THREE.Group();
  for (const p of P.body) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = true; g.add(m); }
  const rotor = new THREE.Group(); rotor.position.set(P.c[0], 0, P.c[1]); for (const p of P.rotor) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = true; rotor.add(m); } g.add(rotor);
  if (police) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.16), new THREE.MeshStandardMaterial({ color: '#2a5ad4', emissive: '#2a5ad4', emissiveIntensity: 2 })); bar.position.set(0, 0.2, 1.8); g.add(bar); }
  g.userData.rotor = rotor; g.userData.tail = new THREE.Object3D(); g.add(g.userData.tail);
  return g;
}

/* ---------------------------------- cars ---------------------------------- */
const paintCache = new Map();
export function realCar(name, color) {
  const s = SPEC[name], g = new THREE.Group();
  for (const p of RM[name].parts) {
    let mat = p.mat;
    if (color && s.paint && s.paint.test(mat.name || '')) { const k = name + mat.name + color; if (!paintCache.has(k)) { const m = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05, map: null }); paintCache.set(k, m); } mat = paintCache.get(k); }
    const m = new THREE.Mesh(p.geo, mat); m.castShadow = true; g.add(m);
  }
  g.userData.wheels = []; g.userData.lights = []; g.userData.horse = null;
  return g;
}
