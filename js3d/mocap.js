// Runtime for the retargeted motion-capture clips (see mocapdata.js): decoding, sampling, blending.
import * as THREE from 'three';
import { MOCAP } from './mocapdata.js';

export const MBONES = ['hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'faL', 'hdL', 'uaR', 'faR', 'hdR', 'thL', 'shL', 'ftL', 'thR', 'shR', 'ftR'];
const NB = MBONES.length, STRIDE = NB * 4 + 3;
export const CLIPS = {};
for (const [name, c] of Object.entries(MOCAP)) {
  const bin = atob(c.d); const a = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) { let v = bin.charCodeAt(i); if (v > 127) v -= 256; a[i] = v / 127; }
  for (let f = 0; f < c.n; f++) for (let b = 0; b < NB; b++) { // renormalise quaternions after quantisation
    const o = f * STRIDE + b * 4; const l = Math.hypot(a[o], a[o + 1], a[o + 2], a[o + 3]) || 1; a[o] /= l; a[o + 1] /= l; a[o + 2] /= l; a[o + 3] /= l;
  }
  for (let f = 0; f < c.n; f++) for (let k = 0; k < 3; k++) a[f * STRIDE + NB * 4 + k] *= 0.5;
  CLIPS[name] = { n: c.n, fps: c.fps, loop: c.loop, speed: c.speed, dur: c.n / c.fps, data: a };
}

/** A pose buffer: quaternions (x,y,z,w order for three.js) per bone + hips offset. */
export class Pose {
  constructor() { this.q = new Float32Array(NB * 4); this.h = new Float32Array(3); for (let b = 0; b < NB; b++) this.q[b * 4 + 3] = 1; }
}
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
/** sample clip at normalised phase u (0..1) into pose */
export function sampleClip(clip, u, out) {
  const n = clip.n; let x = clip.loop ? (((u % 1) + 1) % 1) * n : Math.min(n - 1, Math.max(0, u * (n - 1)));
  const i = Math.floor(x), t = x - i, j = clip.loop ? (i + 1) % n : Math.min(n - 1, i + 1); const d = clip.data;
  for (let b = 0; b < NB; b++) {
    const o1 = i * STRIDE + b * 4, o2 = j * STRIDE + b * 4;
    qa.set(d[o1 + 1], d[o1 + 2], d[o1 + 3], d[o1]); qb.set(d[o2 + 1], d[o2 + 2], d[o2 + 3], d[o2]); qa.slerp(qb, t);
    out.q[b * 4] = qa.x; out.q[b * 4 + 1] = qa.y; out.q[b * 4 + 2] = qa.z; out.q[b * 4 + 3] = qa.w;
  }
  for (let k = 0; k < 3; k++) out.h[k] = d[i * STRIDE + NB * 4 + k] * (1 - t) + d[j * STRIDE + NB * 4 + k] * t;
  return out;
}
/** out = blend(a, b, w) */
export function blendPose(a, b, w, out, mask) {
  for (let k = 0; k < NB; k++) {
    if (mask && !mask[k]) { for (let c = 0; c < 4; c++) out.q[k * 4 + c] = a.q[k * 4 + c]; continue; }
    qa.fromArray(a.q, k * 4); qb.fromArray(b.q, k * 4); qa.slerp(qb, w); qa.toArray(out.q, k * 4);
  }
  for (let c = 0; c < 3; c++) out.h[c] = a.h[c] + (b.h[c] - a.h[c]) * (mask ? (mask[0] ? w : 0) : w);
  return out;
}
export const UPPER = MBONES.map((n) => !/^(th|sh|ft|hips)/.test(n));
