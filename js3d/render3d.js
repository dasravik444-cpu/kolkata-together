// The 3D view: renderer, sky/sun/day-night, post-processing, camera, entity visuals.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { M, buildVehicle, buildAnimal, animateAnimal, mat, VEH_SPEC, buildHeli } from './models.js';
import { Character as Human, setBodyDetail } from './body.js';
import { onHumanAsset } from './human.js';
import { buildCity, buildInterior3D, heightAt, TS, GLOW_MAT } from './world3d.js';
import { setAniso, pattern, FACE } from './textures.js';
import { DIRS } from '../js/entities.js';

const DIR_ANG = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
export const QUALITY = {
  low: { pr: 0.7, shadow: 0, bloom: false, lights: 0, aa: false, full: 4, draw: 120 },
  medium: { pr: 1, shadow: 1024, bloom: true, lights: 4, aa: false, full: 7, draw: 180 },
  high: { pr: 1.5, shadow: 2048, bloom: true, lights: 8, aa: true, full: 12, draw: 260 },
};

export class View {
  constructor(canvas, quality = 'medium') {
    this.q = QUALITY[quality] || QUALITY.medium; this.qname = quality; setBodyDetail(quality);
    const R = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.q.aa, powerPreference: 'high-performance' }));
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.pr));
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.8;
    R.shadowMap.enabled = this.q.shadow > 0; R.shadowMap.type = THREE.PCFShadowMap;
    setAniso(Math.min(8, R.capabilities.getMaxAnisotropy()));
    const S = (this.scene = new THREE.Scene());
    this.sky = new Sky(); this.sky.scale.setScalar(6000); S.add(this.sky);
    const u = this.sky.material.uniforms; u.turbidity.value = 2.6; u.rayleigh.value = 1.15; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;
    this.envScene = new THREE.Scene(); this.envSky = new Sky(); this.envSky.scale.setScalar(1000); this.envSky.material = this.sky.material; this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(R); this.envH = -99;
    this.sun = new THREE.DirectionalLight('#fff2dc', 2.6); this.sun.castShadow = this.q.shadow > 0;
    if (this.q.shadow) { this.sun.shadow.mapSize.set(this.q.shadow, this.q.shadow); Object.assign(this.sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 }); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03; }
    S.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight('#bcd4ff', '#4a5a3a', 0.55); S.add(this.hemi);
    S.fog = new THREE.FogExp2('#c8d8e8', 0.0024);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.08, 3000);
    this.yaw = 0; this.pitch = 0.32; this.dist = 4.6; this.lastLook = 0;
    this.pool = []; for (let i = 0; i < this.q.lights; i++) { const l = new THREE.PointLight('#ffcf8a', 0, 22, 1.6); S.add(l); this.pool.push(l); }
    this.head = new THREE.SpotLight('#fff4dc', 0, 45, 0.5, 0.5, 1.4); S.add(this.head, this.head.target);
    if (this.q.bloom) {
      this.composer = new EffectComposer(R); this.composer.addPass(new RenderPass(S, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.2, 0.4, 2.2); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    }
    this.vis = new Map(); this.fullSet = new Set(); this.t = 0;
    this.stars = makeStars(); S.add(this.stars);
    this.resize(); addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.composer) { this.composer.setSize(w, h); this.composer.setPixelRatio(this.renderer.getPixelRatio()); }
  }
  setWorld(world) {
    this.world = world;
    this.bgrid = new Uint8Array(world.W * world.H); for (const b of world.buildings) { if (b.style === 'stall' || b.style === 'gate') continue; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) this.bgrid[y * world.W + x] = 1; }
    const c = buildCity(world); this.city = c; this.scene.add(c.root); this.lampsWorld = c.lamps;
  }
  enterInterior(S) {
    this.clearVisuals();
    if (this.interiorRoot) this.scene.remove(this.interiorRoot);
    const lamps = []; this.interiorRoot = buildInterior3D(S, lamps); this.lampsInterior = lamps; this.scene.add(this.interiorRoot);
    this.city.root.visible = false; this.sky.visible = false; this.stars.visible = false; this.inside = S;
    this.scene.fog = null; this.scene.background = new THREE.Color('#141218');
    this.dist = 3.6; this.pitch = 0.62;
  }
  exitInterior() {
    this.clearVisuals();
    if (this.interiorRoot) { this.scene.remove(this.interiorRoot); this.interiorRoot = null; }
    this.city.root.visible = true; this.sky.visible = true; this.inside = null; this.scene.background = null;
    this.scene.fog = new THREE.FogExp2('#c8d8e8', 0.0024); this.dist = 4.6; this.pitch = 0.32;
  }
  clearVisuals() { for (const [, v] of this.vis) this.scene.remove(v.root || v); this.vis.clear(); }

  /* ------------------------------ lighting ------------------------------ */
  updateSky(time, dark) {
    const h = time / 60;
    const ang = ((h - 6) / 12) * Math.PI; // 0 at 6am, pi at 6pm
    const elev = Math.sin(ang) * 1.15, az = Math.PI * 0.85 + ang * 0.6;
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - elev, az);
    this.sky.material.uniforms.sunPosition.value.copy(sunDir);
    const night = Math.min(1, Math.max(0, dark / 0.62));
    const moon = sunDir.y < 0;
    this.sunDir = moon ? new THREE.Vector3(-sunDir.x, Math.max(0.35, -sunDir.y), -sunDir.z) : sunDir;
    this.sun.intensity = this.inside ? 0.9 : moon ? 0.45 : 0.4 + 2.6 * Math.min(1, sunDir.y * 2.5);
    this.sun.color.set(moon ? '#8ea0d0' : sunDir.y < 0.25 ? '#ffc890' : '#fff2dc');
    this.hemi.intensity = this.inside ? 0.5 : 0.2 + 0.2 * (1 - night);
    this.hemi.color.set(night > 0.5 ? '#4a5f8f' : '#bcd4ff');
    if (this.scene.fog) this.scene.fog.color.set(night > 0.5 ? '#0b1020' : sunDir.y < 0.2 ? '#e8c8a8' : '#c8d8e8');
    this.stars.visible = !this.inside && night > 0.4; this.stars.material.opacity = night;
    if (this.bloom) { this.bloom.strength = this.inside ? 0.15 : 0.1 + night * 0.4; this.bloom.threshold = this.inside ? 1.8 : 2.6 - night * 1.3; }
    this.renderer.toneMappingExposure = this.inside ? 0.62 : 0.68 + night * 0.22;
    GLOW_MAT.opacity = this.inside ? 0 : night * 0.55;
    const mats = this.city ? this.city.nightMats : [];
    for (const m of mats) m.emissiveIntensity = (m.userData.dayI || 0) + ((m.userData.nightI ?? 1) - (m.userData.dayI || 0)) * night;
    if (Math.abs(h - this.envH) > 0.4 && !this.inside) { this.envH = h; if (this.envRT) this.envRT.dispose(); this.envRT = this.pmrem.fromScene(this.envScene); this.scene.environment = this.envRT.texture; }
    this.scene.environmentIntensity = this.inside ? 0.2 : 0.06 + 0.3 * (1 - night);
    this.night = night;
  }
  updateLights(px, pz) {
    const lamps = this.inside ? this.lampsInterior : this.lampsWorld; if (!lamps) return;
    const on = this.inside ? 1 : this.night;
    if (on < 0.05) { for (const l of this.pool) l.intensity = 0; return; }
    const sorted = lamps.map((l) => [l, (l[0] - px) ** 2 + (l[2] - pz) ** 2]).sort((a, b) => a[1] - b[1]);
    this.pool.forEach((l, i) => { const s = sorted[i]; if (!s) { l.intensity = 0; return; } const [x, y, z, kind] = s[0]; l.position.set(x, y, z); l.intensity = (kind === 'room' ? 5 : kind === 'flood' ? 14 : kind === 'door' ? 4 : 7) * on; l.color.set(kind === 'room' ? '#ffe2b0' : kind === 'flood' ? '#e8eeff' : '#ffc070'); l.distance = kind === 'flood' ? 34 : kind === 'door' ? 9 : 18; });
  }

  /* ------------------------------ camera ------------------------------ */
  look(dx, dy) { this.yaw -= dx * 0.004; this.pitch = Math.min(1.2, Math.max(-0.15, this.pitch + dy * 0.003)); this.lastLook = this.t; }
  updateCamera(G, dt) {
    const me = G.me, car = me.car;
    const heli = me.heli; const tx = me.x * M, tz = me.y * M; const ty = heli ? heli.alt + 2.2 : (car ? 1.3 : 1.55) + this.groundY(G.scene, me.x, me.y);
    const want = heli ? 13 : car ? 6.5 : this.inside ? 3.8 : this.dist;
    if (heli && this.t - this.lastLook > 1.2) { const target = Math.PI / 2 - heli.angle; let d0 = target - this.yaw; d0 = Math.atan2(Math.sin(d0), Math.cos(d0)); this.yaw += d0 * Math.min(1, dt * 2); }
    else if (car && this.t - this.lastLook > 1.2) { const target = Math.PI / 2 - car.angle; let d = target - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 2.5 * Math.min(1, Math.abs(car.speed) / 30 + 0.2)); }
    else if (!car && me.moving && this.t - this.lastLook > 2.5 && !this.inside) { const target = Math.PI / 2 - me.angle; let d = target - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 0.8); }
    // keep the camera out of buildings by sampling the tile grid between player and camera
    let d = want; const S = G.scene; const cp = Math.cos(this.pitch);
    if (!this.inside && !heli) for (let k = 0.6; k <= want; k += 0.35) { const sx = (tx - Math.sin(this.yaw) * k * cp) / M, sy = (tz - Math.cos(this.yaw) * k * cp) / M; const ttx = Math.floor(sx / 16), tty = Math.floor(sy / 16); if (ttx < 0 || tty < 0 || ttx >= S.W || tty >= S.H) break; if (this.bgrid[tty * S.W + ttx]) { d = Math.max(0.8, k - 0.4); break; } }
    this.curDist = this.curDist ? this.curDist + (d - this.curDist) * Math.min(1, dt * (d < this.curDist ? 12 : 3)) : d;
    const D = this.curDist;
    this.camera.position.set(tx - Math.sin(this.yaw) * D * cp, ty + Math.sin(this.pitch) * D, tz - Math.cos(this.yaw) * D * cp);
    if (this.inside) { const S2 = G.scene; this.camera.position.x = Math.min(S2.W * TS - 2.3, Math.max(2.3, this.camera.position.x)); this.camera.position.z = Math.min(S2.H * TS + 1.5, Math.max(7, this.camera.position.z)); this.camera.position.y = Math.min(3.3, this.camera.position.y); }
    this.camera.position.y = Math.max(this.camera.position.y, this.groundY(S, this.camera.position.x / M, this.camera.position.z / M) + 0.4);
    this.camera.lookAt(tx, ty, tz);
    if (G.shakeT > 0) { this.camera.position.x += (Math.random() - 0.5) * 0.15; this.camera.position.y += (Math.random() - 0.5) * 0.15; }
    // shadow camera follows the player, snapped to texels to avoid shimmering
    const sd = this.sunDir || new THREE.Vector3(0.3, 0.8, 0.2); const snap = 90 / (this.q.shadow || 1024);
    const cx = Math.round(tx / snap) * snap, cz = Math.round(tz / snap) * snap;
    this.sun.position.set(cx + sd.x * 150, sd.y * 150, cz + sd.z * 150); this.sun.target.position.set(cx, 0, cz);
  }
  groundY(S, px, py) { const tx = Math.floor(px / 16), ty = Math.floor(py / 16); if (tx < 0 || ty < 0 || tx >= S.W || ty >= S.H) return 0; return S.kind === 'world' ? Math.max(0, heightAt(S, tx, ty)) : 0; }

  /* ------------------------------ entities ------------------------------ */
  sync(G, dt) {
    this.t += dt;
    const me = G.me, S = G.scene; const live = new Set();
    const px = me.x, py = me.y; const drawPx = this.q.draw / M; const air = !!(me.heli && me.heli.alt > 12); this.air = air;
    const near = (e, r) => Math.abs(e.x - px) < r && Math.abs(e.y - py) < r;
    // decide which humans get full detail (nearest few)
    if (!this._fullT || this.t - this._fullT > 0.5) {
      this._fullT = this.t; const hs = [...G.npcs, ...G.police].filter((h) => near(h, 300)).sort((a, b) => ((a.x - px) ** 2 + (a.y - py) ** 2) - ((b.x - px) ** 2 + (b.y - py) ** 2));
      this.fullSet = new Set(hs.slice(0, this.q.full));
    }
    const human = (key, ent, look, full, state, opt) => {
      let v = this.vis.get(key);
      const lk = JSON.stringify(look) + FACE.ver;
      if (v && v.lk !== lk) { v.h.setLook(look); v.lk = lk; }
      if (!v) { const h = new Human(look, key === 'me' || key === 'other'); this.scene.add(h.root); v = { h, full, lk, px: ent.x, py: ent.y, skip: 0 }; this.vis.set(key, v); }
      live.add(key);
      const dx = ent.x - v.px, dy = ent.y - v.py; const sp = Math.hypot(dx, dy) / Math.max(dt, 1e-3) * M; v.px = ent.x; v.py = ent.y;
      let ang = opt && opt.angle !== undefined ? opt.angle : (sp > 0.2 ? Math.atan2(dx, dy) : (v.ang ?? DIR_ANG[ent.dir] ?? 0));
      if (state === 'sit' || state === 'hands' || state === 'talk') ang = DIR_ANG[ent.dir] ?? ang;
      v.ang = ang;
      const r = v.h.root; r.position.set(ent.x * M, this.groundY(S, ent.x, ent.y), ent.y * M);
      let da = ang - r.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); r.rotation.y += da * Math.min(1, dt * 12);
      const st = state === 'drive' ? 'sit' : state;
      v.acc = (v.acc || 0) + dt; if (!full && (v.skip = (v.skip + 1) % 3) !== 0) { if (opt && opt.action && opt.action !== v.lastAct) { v.lastAct = opt.action; v.h.play(opt.action); } return v; }
      const adt = v.acc; v.acc = 0;
      if (opt && opt.action && opt.action !== v.lastAct) { v.lastAct = opt.action; v.h.play(opt.action.split('#')[0]); }
      v.h.animate(adt, st === 'idle' || st === 'walk' || st === 'flee' || st === 'chase' || st === 'talk' ? 'walk' : st, st === 'walk' || st === 'flee' || st === 'chase' || st === 'idle' ? (opt && opt.speed !== undefined ? opt.speed : Math.min(8, sp)) : 0, opt);
      if (v.full && v.h.holdWeapon) v.h.holdWeapon(opt && opt.weapon);
      const fz = ent.fly ? ent.fly.z : (ent.fz || 0);
      if (fz > 0.02 || ent.fly) { r.position.y += fz; r.rotation.x = ent.fly ? ent.fly.rot : 0; } else if (r.rotation.x) r.rotation.x *= 0.8;
      if (state === 'sit') r.position.y += 0.02;
      if (state === 'swim' || state === 'boat') r.position.y = -0.35;
      return v;
    };
    // player
    if (!me.car && !me.heli) human('me', me, G.profile.app, true, me.fly && me.fly.vz < 2 && me.fly.z > 0.4 ? 'ko' : me.state, { angle: Math.PI / 2 - me.angle, speed: me.moving ? (me.running ? 5.0 : 1.6) * (me.speedK || 1) : 0, weapon: me.weaponOut ? me.weapon : null, aim: me.weaponOut && !['knife', 'bat'].includes(me.weapon), eating: G.eating, action: me.anim });
    const o = G.other;
    if (o && o.look && o.scene === G.sceneId()) {
      if (o.heli) { /* drawn with the helicopters */ } else if (o.car) { const key = 'ocar'; let v = this.vis.get(key); if (!v || v.type !== o.car.type) { if (v) this.scene.remove(v.root); v = { root: buildVehicle(o.car.type), type: o.car.type }; this.scene.add(v.root); this.vis.set(key, v); } live.add(key); v.root.position.set(o.x * M, 0, o.y * M); v.root.rotation.y = -o.car.angle; }
      else human('other', o, o.look, true, o.state, { weapon: o.weaponOut ? o.weapon : null, speed: o.moving ? (o.running ? 5.0 : 1.6) : undefined, action: o.anim });
    }
    for (const n of [...G.npcs, ...G.police]) {
      if (!near(n, air ? 200 : Math.min(drawPx, 600))) continue;
      const st = n.state === 'ko' || n.fly ? 'ko' : n.state === 'hands' ? 'hands' : n.state === 'dance' ? 'dance' : n.role === 'sitter' && n.state !== 'flee' ? 'sit' : 'walk';
      human(n, n, n.look, this.fullSet.has(n), st, { carry: n.carry, action: n.anim });
    }
    if (S.kind === 'world') {
      for (const a of G.animals) {
        if (!near(a, air ? 160 : 520)) continue;
        let v = this.vis.get(a); if (!v) { v = { root: buildAnimal(a.kind), px: a.x, py: a.y }; this.scene.add(v.root); this.vis.set(a, v); }
        live.add(a); const dx = a.x - v.px, dy = a.y - v.py; v.px = a.x; v.py = a.y; const mv = Math.hypot(dx, dy) > 0.01;
        if (mv) { const ang = Math.atan2(dx, dy); let d = ang - v.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); v.root.rotation.y += d * Math.min(1, dt * 8); }
        v.root.position.set(a.x * M, this.groundY(S, a.x, a.y) + (a.flyT ? 1.5 : 0) + (a.fly ? a.fly.z : 0), a.y * M); v.root.rotation.z = a.fly ? a.fly.rot : v.root.rotation.z * 0.85; v.root.rotation.x = a.fly ? a.fly.rot * 0.6 : v.root.rotation.x * 0.85; animateAnimal(v.root, this.t, mv || !!a.fly, a.flyT || a.fly);
      }
      for (const c of G.cars) {
        if (!near(c, drawPx * 0.9)) continue;
        let v = this.vis.get(c); if (!v) { v = { root: buildVehicle(c.type) }; this.scene.add(v.root); this.vis.set(c, v); }
        live.add(c); v.root.position.set(c.x * M, 0, c.y * M); v.root.rotation.y = -c.angle;
        const spin = (c.speed * M * dt) / 0.33; for (const w of v.root.userData.wheels) w.rotation.z -= spin;
        if (v.root.userData.horse) animateAnimal(v.root.userData.horse, this.t, Math.abs(c.speed) > 2, false);
        const n = this.night || 0; for (const l of v.root.userData.lights) { if (l.userData.light === 'siren') { l.material.emissiveIntensity = (Math.floor(this.t * 6) % 2 === (l.position.z > 0 ? 0 : 1)) ? 4 : 0.2; } else l.material.emissiveIntensity = l.userData.light === 'head' ? 0.3 + n * 4 : 0.3 + n * 2 + (c.speed < 5 && c === me.car ? 1.5 : 0); }
      }
      for (const b of G.balls) { let v = this.vis.get(b); if (!v) { v = { root: new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), new THREE.MeshStandardMaterial({ map: pattern('football'), roughness: 0.5 })) }; v.root.castShadow = true; this.scene.add(v.root); this.vis.set(b, v); } live.add(b); v.root.position.set(b.x * M, 0.22, b.y * M); v.root.rotation.x += b.vy * M * dt / 0.22; v.root.rotation.z -= b.vx * M * dt / 0.22; }
    }
    const heliVis = (key, h, police) => {
      let v = this.vis.get(key); if (!v) { v = { root: buildHeli(police) }; this.scene.add(v.root); this.vis.set(key, v); }
      live.add(key); v.root.position.set(h.x * M, (h.alt || 0) + (police ? 0 : this.groundY(S, h.x, h.y)), h.y * M); v.root.rotation.set(h.tilt || 0, Math.PI / 2 - h.angle, 0, 'YXZ');
      v.root.userData.rotor.rotation.y += dt * 28 * (h.rotor ?? 1); v.root.userData.tail.rotation.x += dt * 40 * (h.rotor ?? 1);
    };
    if (S.kind === 'world') { (G.helis || []).forEach((h, i) => { if (near(h, drawPx)) heliVis('heli' + i, h, false); }); if (G.copHeli) heliVis('copheli', G.copHeli, true); if (o && o.heli && o.scene === 'world') heliVis('oheli', { x: o.x, y: o.y, alt: o.heli.alt, angle: o.heli.a, rotor: 1 }, false); }
    if (G.copHeli && (this.night || 0) > 0.3) { this.head.intensity = 0; }
    for (const p of G.pickups) { let v = this.vis.get(p); if (!v) { v = { root: new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.16), new THREE.MeshStandardMaterial({ color: '#4aa83a', emissive: '#2a8a2a', emissiveIntensity: 0.6 })) }; this.scene.add(v.root); this.vis.set(p, v); } live.add(p); v.root.position.set(p.x * M, 0.5 + Math.sin(this.t * 4) * 0.1, p.y * M); v.root.rotation.y += dt * 3; }
    for (const b of G.bullets) { let v = this.vis.get(b); if (!v) { v = { root: new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffe080' })) }; this.scene.add(v.root); this.vis.set(b, v); } live.add(b); v.root.position.set(b.x * M, 1.3, b.y * M); }
    for (const [k, v] of this.vis) if (!live.has(k)) { this.scene.remove(v.root || v.h.root); this.vis.delete(k); }
    // only nearby entities cast shadows (the shadow pass was most of the frame cost)
    if (!this._shT || this.t - this._shT > 0.3) {
      this._shT = this.t; const R2 = (22 / M) ** 2;
      for (const [k, v] of this.vis) { const r = v.root || v.h.root; const want = (r.position.x / M - px) ** 2 + (r.position.z / M - py) ** 2 < R2 || k === 'me' || k === 'other'; if (v.sh !== want) { v.sh = want; r.traverse((o) => { if (o.isMesh) o.castShadow = want; }); } }
    }
    // headlight on the player's car at night
    if (me.car && (this.night || 0) > 0.3) { const a = me.car.angle; this.head.intensity = 60 * this.night; this.head.position.set(me.car.x * M + Math.cos(a) * 2, 0.8, me.car.y * M + Math.sin(a) * 2); this.head.target.position.set(me.car.x * M + Math.cos(a) * 20, 0, me.car.y * M + Math.sin(a) * 20); } else this.head.intensity = 0;
  }
  render() {
    // airborne: shadows only refresh twice a second (they're tiny from up there) — big saving
    const sm = this.renderer.shadowMap;
    if (this.air) { sm.autoUpdate = false; this._shAcc = (this._shAcc || 0) + 1; if (this._shAcc % 30 === 0) sm.needsUpdate = true; } else sm.autoUpdate = true;
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  /* ------------------------------ photos & previews ------------------------------ */
  selfie(G, people) {
    const me = G.me; const cam = new THREE.PerspectiveCamera(42, 320 / 200, 0.05, 2000);
    const a = Math.PI / 2 - me.angle; const fx = Math.sin(a), fz = Math.cos(a);
    const mid = people.length > 1 && G.other ? [(me.x + G.other.x) / 2 * M, (me.y + G.other.y) / 2 * M] : [me.x * M, me.y * M];
    const y = 1.62 + this.groundY(G.scene, me.x, me.y);
    const sd = people.length > 1 ? 2.1 : 1.35; cam.position.set(mid[0] + fx * sd, y + 0.15, mid[1] + fz * sd); cam.lookAt(mid[0], y - 0.12, mid[1]);
    const W = 960, H = 600; const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    // make both characters face the camera for the photo
    const meV = this.vis.get('me'), oV = this.vis.get('other'); const saved = [meV, oV].map((v) => v && v.h.root.rotation.y);
    for (const v of [meV, oV]) if (v) { v.h.root.rotation.y = a; v.h.animate(0.016, 'walk', 0, { wave: v === oV }); }
    this.renderer.setRenderTarget(rt); this.renderer.render(this.scene, cam); this.renderer.setRenderTarget(null);
    [meV, oV].forEach((v, i) => { if (v) v.h.root.rotation.y = saved[i]; });
    const buf = new Uint8Array(W * H * 4); this.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); rt.dispose();
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const img = g.createImageData(W, H);
    for (let row = 0; row < H; row++) img.data.set(buf.subarray((H - 1 - row) * W * 4, (H - row) * W * 4), row * W * 4);
    g.putImageData(img, 0, 0); return c;
  }
}

let previewR = null, previewS = null, previewCam = null, previewH = null, previewT = null, previewA = null, previewHook = null;
export function preview3d(target, app) {
  if (!previewR) {
    previewR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); previewR.setSize(384, 576); previewR.toneMapping = THREE.ACESFilmicToneMapping; previewR.toneMappingExposure = 0.95;
    previewS = new THREE.Scene(); const k = new THREE.DirectionalLight('#fff4e8', 2.4); k.position.set(1.5, 3, 3); previewS.add(k); const f = new THREE.DirectionalLight('#c8d8ff', 0.8); f.position.set(-2, 1, 1); previewS.add(f); previewS.add(new THREE.HemisphereLight('#ffffff', '#8a8070', 0.7));
    previewCam = new THREE.PerspectiveCamera(28, 384 / 576, 0.1, 50); previewCam.position.set(0, 1.05, 4.2); previewCam.lookAt(0, 0.92, 0);
  }
  previewT = target; previewA = app;
  if (!previewHook) previewHook = onHumanAsset(() => { clearTimeout(previewHook.t); previewHook.t = setTimeout(() => { if (previewT && previewT.isConnected) preview3d(previewT, previewA); }, 120); });
  if (previewH) previewS.remove(previewH.root);
  previewH = new Human(app, true); previewH.root.rotation.y = -0.35; for (let i = 0; i < 40; i++) previewH.animate(0.05, 'walk', 0); previewS.add(previewH.root);
  previewR.render(previewS, previewCam);
  target.width = 384; target.height = 576; const g = target.getContext('2d'); g.clearRect(0, 0, 384, 576); g.drawImage(previewR.domElement, 0, 0);
}

function makeStars() {
  const n = 1500, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) + 0.05; v.normalize().multiplyScalar(2500); p.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
  s.frustumCulled = false; return s;
}
export { DIRS, VEH_SPEC, mat };
