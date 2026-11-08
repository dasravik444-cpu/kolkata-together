// All DOM UI: lobby, HUD, dialogue, chat/voice, phone, shops, salon, cafe, bank, minigames.
import { canvas, crisp, outline, fmtMoney, clamp, dist, save, load, shade, ell, px } from './util.js';
import { portrait, PW, PH } from './chars.js';
import { ITEMS, ITEM, PRESETS, MENUS, SHOP_NAMES, SKIN_TONES, HAIR_COLORS, EYE_COLORS, LIP_COLORS, NAIL_COLORS, SHADOW_COLORS, HAIR_STYLES, BEARDS } from './data.js';
import { cafeScene, selfieScene, showRenderer, drawFood, background, SW, SH } from './scenes.js';
import { TL, carSprite, CAR_TYPES } from './art.js';
import { T } from './util.js';
import { Car } from './entities.js';
import { zoneAt } from './mapgen.js';
import { sfx, toggleMusic } from './audio.js';

let G, API;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ============================== init / lobby ============================== */
export function init(game, api) {
  G = game; API = api;
  let preset = load('preset', 'him');
  const name = $('lob-name'), code = $('lob-code');
  name.value = load('name', ''); code.value = load('code', '');
  const chars = $('lob-chars');
  const draw = () => { if (API.preview3d) { const prof0 = load('profile', null); API.preview3d($('lob-portrait'), prof0 && prof0.preset === preset ? prof0.app : PRESETS[preset]); return; } const c = $('lob-portrait').getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 96, 144); const prof = load('profile', null); c.drawImage(portrait(prof && prof.preset === preset ? prof.app : PRESETS[preset]), 0, 0); };
  chars.innerHTML = '<button data-p="him">He (brown skin, glasses)</button><button data-p="her">She (fair, mustard kurta)</button>';
  const sel = () => { chars.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.p === preset)); draw(); };
  chars.onclick = (e) => { const b = e.target.closest('button'); if (b) { preset = b.dataset.p; sel(); } };
  sel();
  const go = (online) => {
    if (online && code.value.trim().length < 4) { code.focus(); code.placeholder = 'Pick a code with at least 4 characters'; return; }
    save('name', name.value.trim()); save('code', code.value.trim()); save('preset', preset);
    $('lobby').classList.add('hidden'); $('hud').classList.remove('hidden');
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) $('touch').classList.remove('hidden');
    API.startGame({ name: name.value.trim() || (preset === 'him' ? 'Him' : 'Her'), preset, code: code.value.trim(), online });
  };
  $('lob-online').onclick = () => go(true);
  $('lob-solo').onclick = () => go(false);
  const q = new URLSearchParams(location.search);
  if (q.get('autostart')) { preset = q.get('as') || preset; code.value = q.get('code') || code.value; name.value = q.get('name') || name.value; setTimeout(() => go(!!q.get('code')), 50); }

  // HUD buttons
  $('btn-phone').onclick = () => phone();
  $('btn-chat').onclick = () => chat();
  $('btn-call').onclick = () => toggleCall();
  $('btn-camera').onclick = () => selfie();
  $('btn-help').onclick = () => help();
  document.querySelectorAll('[data-close="chat"]').forEach((b) => (b.onclick = () => chat(false)));
  $('chat-form').onsubmit = (e) => { e.preventDefault(); const v = $('chat-input').value.trim(); if (!v) return; sendChat(v); $('chat-input').value = ''; };
  $('modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('dialog').onclick = () => dialogNext();
  $('call-end').onclick = () => G.net.endCall();
  $('call-mute').onclick = () => { const m = G.net.toggleMute(); $('call-mute').textContent = m ? 'Unmute' : 'Mute'; };
  setupTouch();
}

function setupTouch() {
  const stick = $('stick'), knob = $('knob');
  let id = null, cx = 0, cy = 0;
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); });
  const move = (e) => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), m = 50; if (d > m) { dx *= m / d; dy *= m / d; } const k0 = (stick.clientWidth - knob.offsetWidth) / 2; knob.style.left = k0 + dx + 'px'; knob.style.top = k0 + dy + 'px'; API.touchDir.x = Math.abs(dx) > 12 ? dx / m : 0; API.touchDir.y = Math.abs(dy) > 12 ? dy / m : 0; };
  stick.addEventListener('pointermove', move);
  const up = (e) => { if (e.pointerId !== id) return; id = null; knob.style.left = ''; knob.style.top = ''; API.touchDir.x = API.touchDir.y = 0; };
  stick.addEventListener('pointerup', up); stick.addEventListener('pointercancel', up);
  document.querySelectorAll('#tbtns button').forEach((b) => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); API.virtualKey(b.dataset.k, true); });
    b.addEventListener('pointerup', () => API.virtualKey(b.dataset.k, false));
    b.addEventListener('pointercancel', () => API.virtualKey(b.dataset.k, false));
  });
}

/* ============================== HUD bits ============================== */
let bannerT;
export function banner(name, tip) { const b = $('banner'); b.innerHTML = esc(name) + (tip ? `<small>${esc(tip)}</small>` : ''); b.classList.remove('hidden'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.add('hidden'), 3500); }
export function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('toasts').appendChild(t); setTimeout(() => t.remove(), 3200); while ($('toasts').children.length > 4) $('toasts').firstChild.remove(); }
let bigT;
export function bigText(txt, sub = '', ms = 2400) { const b = $('bigtext'); b.innerHTML = esc(txt) + (sub ? `<small>${esc(sub)}</small>` : ''); b.classList.remove('hidden'); clearTimeout(bigT); bigT = setTimeout(() => b.classList.add('hidden'), ms); }
export function prompt(label, key = 'E') { const p = $('prompt'); if (!label || dialogOpen()) { p.classList.add('hidden'); return; } p.innerHTML = `<b>${key}</b>${esc(label)}`; p.classList.remove('hidden'); }
export function wanted(n, flash) { const w = $('hud-wanted'); w.textContent = '★'.repeat(n) + '☆'.repeat(n ? 5 - n : 0); w.classList.toggle('flash', !!flash && n > 0); if (flash) setTimeout(() => w.classList.remove('flash'), 3000); }
export function netStatus(s) { const el = $('hud-net'); el.textContent = s === 'solo' ? '🧍 solo' : s === 'connected' ? `🟢 ${G.other?.name || 'partner'} online` : '🟡 ' + s; }
export function setPartner(n) { $('chat-partner').textContent = n; netStatus('connected'); }
let lastHud = '';
export function hud() {
  const p = G.profile; const h = Math.floor(G.time / 60), m = Math.floor(G.time % 60);
  const clock = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  const key = [p.cash, p.bank, Math.round(p.health), p.hunger, clock, G.me.weapon, p.ammo].join('|');
  if (key === lastHud) return; lastHud = key;
  $('hud-money').textContent = fmtMoney(p.cash);
  $('hud-bank').textContent = 'Bank ' + fmtMoney(p.bank) + (p.card ? ' · 💳' : '');
  $('bar-health').style.width = clamp(p.health, 0, 100) + '%';
  $('bar-hunger').style.width = clamp(p.hunger, 0, 100) + '%';
  $('hud-clock').textContent = (G.time / 60 >= 19 || G.time / 60 < 6 ? '🌙 ' : '☀ ') + clock;
  const w = $('hud-weapon'); if (G.me.weapon) { w.classList.remove('hidden'); w.textContent = { knife: '🔪 Knife', bat: '🏏 Cricket bat', pistol: `🔫 Pistol (${p.ammo})` }[G.me.weapon]; } else w.classList.add('hidden');
}
export function loading(on) { if (on) bigText('Building Kolkata…', 'laying roads, planting the Maidan, baking rum balls', 60000); else $('bigtext').classList.add('hidden'); }
let fadeEl;
export function fade(fn) {
  if (!fadeEl) { fadeEl = document.createElement('div'); Object.assign(fadeEl.style, { position: 'fixed', inset: 0, background: '#000', opacity: 0, transition: 'opacity .22s', pointerEvents: 'none', zIndex: 35 }); document.body.appendChild(fadeEl); }
  fadeEl.style.opacity = 1; setTimeout(() => { fn(); setTimeout(() => (fadeEl.style.opacity = 0), 60); }, 230);
}
export function say(npc, text) { npc.say = text; npc.sayUntil = G.t + 3; }

/* ============================== dialogue ============================== */
let dQueue = [], typing = null;
export function dialog(name, text) {
  dQueue = String(text).match(/.{1,140}(\s|$)/g) || [text];
  $('dialog-name').textContent = name; $('dialog').classList.remove('hidden');
  typeNext();
}
function typeNext() {
  const t = dQueue.shift(); const el = $('dialog-text'); el.textContent = ''; let i = 0;
  clearInterval(typing); typing = setInterval(() => { el.textContent = t.slice(0, ++i); if (i >= t.length) { clearInterval(typing); typing = null; } }, 18);
  el.dataset.full = t;
}
export function dialogNext() {
  if (typing) { clearInterval(typing); typing = null; $('dialog-text').textContent = $('dialog-text').dataset.full; return; }
  if (dQueue.length) typeNext(); else $('dialog').classList.add('hidden');
}
export const dialogOpen = () => !$('dialog').classList.contains('hidden');

/* ============================== modal helpers ============================== */
let onClose = null;
function modal(html, opt = {}) {
  const box = $('modal-box');
  box.style.setProperty('--mh', opt.head || ''); box.style.setProperty('--mhc', opt.headText || '');
  box.style.width = opt.width || ''; box.style.background = opt.bg || '';
  box.innerHTML = html; $('modal').classList.remove('hidden');
  onClose = opt.onClose || null;
  box.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => closeModal()));
  return box;
}
function closeModal() { if ($('modal').classList.contains('hidden')) return; $('modal').classList.add('hidden'); const f = onClose; onClose = null; stopAnim(); if (f) f(); }
export function isOpen() { return !$('modal').classList.contains('hidden') || document.activeElement === $('chat-input'); }
export function closeTop() { if (!$('modal').classList.contains('hidden')) closeModal(); else if (!$('chat').classList.contains('hidden')) chat(false); else if (dialogOpen()) $('dialog').classList.add('hidden'); }
const head = (title, sub = '') => `<div class="m-head"><div>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div><button class="x" data-x>✕</button></div>`;
let animId = null; function stopAnim() { if (animId) cancelAnimationFrame(animId); animId = null; }

// payment: cash first, then linked credit card
export function pay(amount, label) {
  const p = G.profile;
  if (p.cash >= amount) { p.cash -= amount; API.saveProfile(); sfx.coin(); return true; }
  if (p.card && p.card.limit - p.card.used >= amount) { p.card.used += amount; API.saveProfile(); sfx.coin(); toast(`Paid ${fmtMoney(amount)} with your ${p.card.name} card 💳`); return true; }
  toast(`Not enough money for ${label} (${fmtMoney(amount)}). Visit a bank or ATM.`); sfx.bad(); return false;
}
export function payThen(amount, label, fn) { if (pay(amount, label)) fn(); }

/* ============================== chat & voice ============================== */
export function chat(open) {
  const c = $('chat'); const show = open === undefined ? c.classList.contains('hidden') : open;
  c.classList.toggle('hidden', !show); $('chat-badge').classList.add('hidden');
  if (show) setTimeout(() => $('chat-input').focus(), 30); else $('chat-input').blur();
}
export function chatMsg(text, who, img) {
  const d = document.createElement('div'); d.className = 'msg ' + who;
  d.textContent = text || '';
  if (img) { const i = document.createElement('img'); i.src = img; d.appendChild(i); }
  $('chat-log').appendChild(d); $('chat-log').scrollTop = 1e9;
  if ($('chat').classList.contains('hidden') && who === 'them') { $('chat-badge').classList.remove('hidden'); toast(`💬 ${G.other?.name || 'Partner'}: ${(text || '📷 photo').slice(0, 60)}`); }
}
export function sysMsg(t) { chatMsg(t, 'sys'); }
function sendChat(text, img) {
  if (!G.net.connected) { chatMsg(text, 'me', img); sysMsg(G.online ? 'Your partner is offline — message not delivered.' : 'You are playing solo. Start an online game to chat.'); return; }
  G.net.send({ t: 'chat', text, img }); chatMsg(text, 'me', img);
}
export async function toggleCall() {
  if (G.net.call) { G.net.endCall(); return; }
  if (!G.net.connected) { toast('Your partner needs to be online to call.'); return; }
  try { $('callbar').classList.remove('hidden'); $('call-state').textContent = `Calling ${G.other?.name || 'partner'}…`; $('call-accept').classList.add('hidden'); await G.net.startCall(); }
  catch (e) { $('callbar').classList.add('hidden'); toast('Microphone blocked: ' + (e.message || e)); }
}
export function incomingCall(call) {
  sfx.msg(); $('callbar').classList.remove('hidden'); $('call-state').textContent = `📞 ${G.other?.name || 'Partner'} is calling…`;
  const acc = $('call-accept'); acc.classList.remove('hidden');
  acc.onclick = async () => { acc.classList.add('hidden'); try { await G.net.answer(call); } catch (e) { toast('Microphone blocked: ' + (e.message || e)); call.close(); $('callbar').classList.add('hidden'); } };
  $('call-end').onclick = () => { try { call.close(); } catch (_) { /* */ } G.net.endCall(); };
}
export function callState(s) {
  if (s === 'live') { $('callbar').classList.remove('hidden'); $('call-state').textContent = `🔊 On call with ${G.other?.name || 'partner'}`; $('call-accept').classList.add('hidden'); $('btn-call').textContent = '📵'; }
  if (s === 'ended') { $('callbar').classList.add('hidden'); $('btn-call').textContent = '📞'; $('call-end').onclick = () => G.net.endCall(); }
}

/* ============================== phone ============================== */
const APPS = [
  ['messages', '💬', 'Messages', '#3aa84a'], ['call', '📞', 'Call', '#2a8a3a'], ['cab', '🚕', 'Jatri Cab', '#f2c230'], ['reserve', '🍽', 'Reserve', '#e8603c'],
  ['map', '🗺', 'Map', '#2a6ac0'], ['bank', '🏦', 'Bank', '#2a4a8a'], ['camera', '📷', 'Camera', '#5a5a62'], ['gallery', '🖼', 'Gallery', '#8a3ab0'],
  ['garage', '🏎', 'Garage', '#d42a2a'], ['tag', '🏃', 'Tag game', '#c0306a'], ['music', '🎵', 'Music', '#e05a8a'], ['help', '❔', 'Help', '#6b6676'], ['settings', '⚙', 'Graphics', '#3a3a48'],
];
export function phone(app) {
  const h = Math.floor(G.time / 60), m = Math.floor(G.time % 60);
  const top = `<div class="phone-top"><span>${h % 12 || 12}:${String(m).padStart(2, '0')}</span><span>Kolkata · 5G</span><span>🔋 ${Math.round(G.profile.health)}%</span></div>`;
  if (!app) {
    modal(`<div class="m-body" style="background:transparent"><div class="phone"><div class="phone-screen">${top}<div class="apps">${APPS.map(([k, i, n, c]) => `<button class="app" data-app="${k}"><i style="background:${c}">${i}</i>${n}</button>`).join('')}</div><p style="color:#fff;text-shadow:0 1px 0 #000;text-align:center;margin-top:26px">${esc(G.profile.name)}'s phone</p><div style="text-align:center"><button data-x>Close</button></div></div></div></div>`, { bg: 'transparent', width: '420px' });
    $('modal-box').style.border = 'none'; $('modal-box').style.boxShadow = 'none';
    $('modal-box').querySelectorAll('[data-app]').forEach((b) => (b.onclick = () => phone(b.dataset.app)));
    return;
  }
  const screen = (title, body) => {
    modal(`<div class="m-body" style="background:transparent"><div class="phone"><div class="phone-screen">${top}<div class="app-screen"><div class="row" style="justify-content:space-between;margin-top:0"><button id="ph-back">‹ Back</button><h2 style="margin:0">${title}</h2><button data-x>✕</button></div>${body}</div></div></div></div>`, { bg: 'transparent', width: '420px' });
    $('modal-box').style.border = 'none'; $('modal-box').style.boxShadow = 'none';
    $('ph-back').onclick = () => phone();
  };
  switch (app) {
    case 'messages': closeModal(); chat(true); break;
    case 'call': closeModal(); toggleCall(); break;
    case 'camera': closeModal(); selfie(); break;
    case 'help': closeModal(); help(); break;
    case 'settings': {
      if (!API.setQuality) { toast('Graphics settings are for the 3D version.'); break; }
      const cur = load('quality', 'auto');
      screen('⚙ Graphics', `<p class="note">Higher quality = sharper shadows, bloom and more detailed people. Use Low on phones if it stutters.</p>${['low', 'medium', 'high'].map((q) => `<div class="dest"><span><b>${q[0].toUpperCase() + q.slice(1)}</b><br><small class="note">${{ low: 'Fast — no shadows, fewer details', medium: 'Shadows + bloom', high: 'Best looking — strong PC / laptop' }[q]}</small></span>${cur === q ? '<b>Current ✓</b>' : `<button data-q="${q}">Use</button>`}</div>`).join('')}<p class="note">The game reloads to apply (your progress is saved).</p>`);
      $('modal-box').querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => API.setQuality(b.dataset.q)));
      break;
    }
    case 'music': { const on = toggleMusic(); toast(on ? '🎵 Music on' : '🎵 Music off'); break; }
    case 'cab': {
      const me = G.me;
      screen('🚕 Jatri Cab', `<p class="note">Choose a destination. A yellow taxi will wait at the nearest crossing.</p>${API.DESTINATIONS.map((d, i) => { const km = dist(me.x, me.y, d[1] * T, d[2] * T) / T / 12; const fare = Math.round(40 + km * 18); return `<div class="dest"><span>${esc(d[0])}<br><small class="note">${km.toFixed(1)} km · ${fmtMoney(fare)}</small></span><button data-d="${i}" data-f="${fare}">Book</button></div>`; }).join('')}`);
      $('modal-box').querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { const d = API.DESTINATIONS[+b.dataset.d]; G.cabFare = +b.dataset.f; G.cabDest = d[0]; closeModal(); API.bookCab(d); }));
      break;
    }
    case 'reserve': {
      const cafes = ['flurys', 'petercat', 'mocambo', 'trincas', 'arsalan', 'balaram', 'coffeehouse'];
      screen('🍽 Reserve a table', `<p class="note">Reserved tables get 15% off your bill. Your partner gets notified.</p>${cafes.map((k) => `<div class="dest"><span>${esc(MENUS[k].name)}<br><small class="note">${esc(MENUS[k].tag)}</small></span>${G.profile.reservations.includes(k) ? '<b>Reserved ✓</b>' : `<button data-r="${k}">Reserve</button>`}</div>`).join('')}`);
      $('modal-box').querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { G.profile.reservations.push(b.dataset.r); API.saveProfile(); G.net.send({ t: 'event', kind: 'reserve', place: MENUS[b.dataset.r].name }); sysMsg(`You reserved a table at ${MENUS[b.dataset.r].name}`); toast('Table reserved! 🍽'); phone('reserve'); }));
      break;
    }
    case 'map': {
      screen('🗺 Kolkata', '<canvas id="map-canvas" width="480" height="424"></canvas><p class="note">Tap anywhere to set a waypoint (G clears it). 🔴 you · 🟡 partner</p><div id="map-list"></div>');
      drawMap($('map-canvas'));
      $('map-canvas').onclick = (e) => { const r = e.target.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * G.world.W * T, y = (e.clientY - r.top) / r.height * G.world.H * T; G.waypoint = { x, y }; toast('Waypoint set — follow the yellow arrow'); closeModal(); };
      break;
    }
    case 'bank': {
      const p = G.profile;
      screen('🏦 Mobile banking', `<div class="kv"><b>Cash</b><span>${fmtMoney(p.cash)}</span><b>Account</b><span>${fmtMoney(p.bank)}</span><b>Loan due</b><span>${fmtMoney(p.loan)}</span><b>Card</b><span>${p.card ? `${esc(p.card.name)} · used ${fmtMoney(p.card.used)} / ${fmtMoney(p.card.limit)}` : 'not linked (visit a bank)'}</span></div>
        <h3>Send money to ${esc(G.other?.name || 'partner')}</h3><div class="row"><input id="tr-amt" type="number" min="1" placeholder="Amount"><button id="tr-go" class="primary">Send from account</button></div><p class="note">Deposits, withdrawals, loans and credit cards are at Bank of Bengal (Park Street) or Hooghly National Bank (Shakespeare Sarani).</p>`);
      $('tr-go').onclick = () => { const a = Math.floor(+$('tr-amt').value); if (!(a > 0)) return; if (!G.net.connected) return toast('Your partner is offline.'); if (p.bank < a) return toast('Not enough in your account.'); p.bank -= a; API.saveProfile(); G.net.send({ t: 'money', amount: a }); toast(`Sent ${fmtMoney(a)} 💸`); phone('bank'); };
      break;
    }
    case 'gallery': {
      const ph = load('photos', []);
      screen('🖼 Gallery', ph.length ? ph.map((src, i) => `<img src="${src}" style="width:100%;image-rendering:pixelated;border-radius:8px;margin-bottom:6px" data-i="${i}">`).join('') : '<p class="note">No photos yet. Press C or use Camera to take a selfie!</p>');
      break;
    }
    case 'garage': {
      const cars = G.profile.cars;
      screen('🏎 My garage', cars.length ? cars.map((t, i) => `<div class="dest"><span>${esc(t.replace('_', ' '))}</span><button data-c="${i}">Bring it here</button></div>`).join('') : '<p class="note">No cars yet. Buy one at Park Street Motors — or "borrow" one from the street…</p>');
      $('modal-box').querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { if (G.scene.kind !== 'world') return toast('Go outside first.'); const t = cars[+b.dataset.c]; G.cars = G.cars.filter((c) => !(c.owned && c.type === t && c !== G.me.car)); const c = new Car(t, G.me.x + 24, G.me.y + 4, 0); c.parked = true; c.owned = true; c.keep = true; G.cars.push(c); toast('Your car has been delivered! Press F to drive.'); closeModal(); }));
      break;
    }
    case 'tag': {
      screen('🏃 Tag — chase each other!', `<p>One of you is <b>IT</b>. Touch the other to pass it on. Whoever is IT the least after 2 minutes wins!</p><button id="tag-go" class="primary">Start a round</button>`);
      $('tag-go').onclick = () => { if (!G.net.connected) return toast('Your partner needs to be online.'); const m = { t: 'tag', kind: 'start', it: G.profile.name, dur: 120 }; G.net.send(m); tagMsg(m, true); closeModal(); };
      break;
    }
  }
}
let mapImg = null;
function drawMap(cv) {
  const W = G.world;
  if (!mapImg) {
    mapImg = canvas(W.W, W.H); const g = mapImg.getContext('2d'); const img = g.createImageData(W.W, W.H);
    const col = (t) => ({ [TL.WATER]: [74, 159, 216], [TL.SHALLOW]: [108, 196, 232], [TL.POOL]: [92, 200, 240], [TL.SIDEWALK]: [201, 196, 184], [TL.PLAZA]: [216, 207, 189], [TL.MARBLE]: [242, 239, 232], [TL.TRACK]: [185, 138, 90], [TL.PITCH]: [108, 204, 78], [TL.PITCH_LINE]: [240, 240, 240], [TL.FAIRWAY]: [127, 214, 94], [TL.GREEN]: [155, 232, 114], [TL.SAND]: [240, 220, 160], [TL.BUNKER]: [240, 220, 160], [TL.DIRT]: [201, 164, 106], [TL.PATH]: [227, 207, 154], [TL.BRIDGE]: [150, 150, 160] }[t] || (ROADSET.has(t) ? [91, 93, 102] : [124, 207, 90]));
    for (let i = 0; i < W.W * W.H; i++) { const c = col(W.ground[i]); img.data.set([...c, 255], i * 4); }
    g.putImageData(img, 0, 0);
    for (const b of W.buildings) { g.fillStyle = b.interior ? '#d9a441' : '#8a8090'; g.fillRect(b.x, b.y, b.w, b.h); }
  }
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(mapImg, 0, 0, cv.width, cv.height);
  const sx = cv.width / (W.W * T), sy = cv.height / (W.H * T);
  g.font = '9px sans-serif'; g.fillStyle = '#1d1a24';
  for (const [n, x, y] of API.DESTINATIONS.slice(0, 32)) { g.fillStyle = '#fff'; g.fillRect(x * T * sx - 1.5, y * T * sy - 1.5, 3, 3); }
  const dot = (x, y, c) => { g.fillStyle = '#000'; g.beginPath(); g.arc(x * sx, y * sy, 6, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x * sx, y * sy, 4.5, 0, 7); g.fill(); };
  const me = G.scene.kind === 'world' ? G.me : G.returnPos || G.me;
  if (G.other && G.other.scene === 'world') dot(G.other.x, G.other.y, '#ffd94a');
  dot(me.x, me.y, '#ff3030');
  if (G.waypoint) { g.strokeStyle = '#ffd94a'; g.lineWidth = 2; g.strokeRect(G.waypoint.x * sx - 5, G.waypoint.y * sy - 5, 10, 10); }
}
const ROADSET = new Set([TL.ROAD, TL.DASH_H, TL.DASH_V, TL.ZEBRA_H, TL.ZEBRA_V, TL.LANE_H, TL.LANE_V, TL.TRAM]);

/* ============================== tag game ============================== */
export function tagMsg(m, local) {
  if (m.kind === 'start') { G.tag = { it: m.it, left: m.dur, my: 0, their: 0, cool: 2 }; bigText('TAG!', `${m.it === G.profile.name ? 'You are' : m.it + ' is'} IT — run!`, 2000); }
  if (m.kind === 'tagged' && G.tag) { G.tag.it = G.profile.name; G.tag.cool = 2; bigText("YOU'RE IT!", 'Catch them!', 1500); sfx.bad(); }
  void local;
}
export function tagTick(dt) {
  const tg = G.tag; tg.left -= dt; tg.cool -= dt;
  if (tg.it === G.profile.name) tg.my += dt; else tg.their += dt;
  const o = G.other;
  if (tg.it === G.profile.name && tg.cool <= 0 && o && o.scene === API.sceneId() && dist(o.x, o.y, G.me.x, G.me.y) < 16) { tg.it = o.name; tg.cool = 2; G.net.send({ t: 'tag', kind: 'tagged' }); bigText('TAGGED!', `${o.name} is IT`, 1400); sfx.good(); }
  $('hud-net').textContent = `🏃 TAG ${Math.ceil(tg.left)}s · IT: ${tg.it === G.profile.name ? 'YOU' : tg.it}`;
  if (tg.left <= 0) { const win = tg.my < tg.their; bigText(win ? 'YOU WIN!' : 'YOU LOSE!', `You were IT for ${Math.round(tg.my)}s, they for ${Math.round(tg.their)}s`, 3500); G.tag = null; netStatus(G.net.status); }
}

/* ============================== help ============================== */
export function help() {
  modal(head('Controls & tips') + `<div class="m-body"><div class="kv">
  <b>Move</b><span>WASD / arrow keys (hold Shift to run) · on-screen stick on phones</span>
  <b>E / Enter</b><span>Talk, enter buildings, sit, use things, stand up</span>
  <b>F</b><span>Get in / out of cars · threaten someone (with a weapon)</span>
  <b>Space</b><span>Attack / shoot / kick the football · horn while driving</span>
  <b>Q</b><span>Cycle weapons</span><b>P</b><span>Phone: cabs, reservations, map, bank, garage, tag</span>
  <b>T</b><span>Text chat</span><b>V</b><span>Voice call your partner</span><b>C</b><span>Selfie (both of you, if together)</span><b>M</b><span>Map</span><b>Esc</b><span>Close windows</span></div>
  <h3>Things to do</h3><p>Eat at Flurys, Peter Cat, Mocambo, Trincas, Arsalan and Balaram Mullick · shop and try clothes at Forum, Quest, Acropolis and South City malls · makeover at the beauty parlour · football on the Maidan · zoo · boating at Rabindra Sarovar · golf · water park · movies at Nandan / Metro · planetarium · nightclub at The Park · bank loans, credit cards… or a vault heist (police will come!).</p>
  <p class="note">Crime raises your wanted stars. Lose the cops or pay a fine at a police station. Get knocked out and you wake up at SSKM.</p></div><div class="m-foot"><button data-x class="primary">Got it</button></div>`);
}

/* ============================== shops / wardrobe / salon ============================== */
const SLOT_NAMES = { top: 'Tops & outfits', bottom: 'Bottoms', shoes: 'Shoes', glasses: 'Glasses & sunglasses', hat: 'Hats', earrings: 'Earrings' };
function previewHTML() { return '<div class="preview"><div class="floor"></div><canvas id="pv" width="96" height="144" style="position:relative"></canvas></div>'; }
function drawPreview(app) { const c = $('pv'); if (!c) return; if (API.preview3d) { API.preview3d(c, app); return; } const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 96, 144); g.drawImage(portrait(app), 0, 0); }
const swatch = (it) => `<div class="sw">${(it.c.length ? it.c : ['#eee']).filter((x) => x !== 'clear').map((c) => `<i style="background:${c}"></i>`).join('')}</div>`;

export function shop(shopKey, wardrobeMode = false) {
  const p = G.profile;
  const items = ITEMS.filter((i) => (wardrobeMode ? p.owned.includes(i.id) : i.shop === shopKey || (shopKey === 'eyewear' && i.slot === 'glasses') || (shopKey === 'jewel' && (i.slot === 'earrings')))).filter((i) => wardrobeMode || i.price > 0);
  const slots = [...new Set(items.map((i) => i.slot))];
  let slot = slots[0], tryApp = JSON.parse(JSON.stringify(p.app)), sel = null;
  const title = wardrobeMode ? 'Wardrobe' : SHOP_NAMES[shopKey] || 'Shop';
  const render = () => {
    const list = items.filter((i) => i.slot === slot);
    const body = `<div class="split">${previewHTML()}<div><div class="tabs">${slots.map((s) => `<button data-s="${s}" class="${s === slot ? 'on' : ''}">${SLOT_NAMES[s]}</button>`).join('')}${wardrobeMode ? '<button data-s="body" class="' + (slot === 'body' ? 'on' : '') + '">Body</button>' : ''}</div>
      ${slot === 'body' ? bodyHTML(tryApp) : `<div class="items">${list.map((i) => `<div class="item ${tryApp[i.slot] === i.id ? 'sel' : ''}" data-i="${i.id}">${swatch(i)}<span>${esc(i.name)}</span>${p.owned.includes(i.id) ? '<span class="own">Owned</span>' : `<span class="price">${fmtMoney(i.price)}</span>`}</div>`).join('')}</div>`}</div></div>`;
    const foot = `<span class="note" style="margin-right:auto">Cash ${fmtMoney(p.cash)}${p.card ? ` · card ${fmtMoney(p.card.limit - p.card.used)} left` : ''}</span><button data-x>Close</button>${sel && !p.owned.includes(sel) ? `<button id="buy" class="primary">Buy & wear (${fmtMoney(ITEM[sel].price)})</button>` : `<button id="wear" class="primary">Wear this look</button>`}`;
    modal(head(title, wardrobeMode ? 'Everything you own — free to change' : 'Tap an item to try it on in the trial room') + `<div class="m-body">${body}</div><div class="m-foot">${foot}</div>`, { head: '#2a3a5a' });
    drawPreview(tryApp);
    const box = $('modal-box');
    box.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { slot = b.dataset.s; render(); }));
    box.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { sel = b.dataset.i; tryApp[ITEM[sel].slot] = sel; sfx.click(); render(); }));
    if (slot === 'body') bindBody(box, tryApp, render);
    const buy = $('buy'); if (buy) buy.onclick = () => { if (pay(ITEM[sel].price, ITEM[sel].name)) { p.owned.push(sel); p.app = JSON.parse(JSON.stringify(tryApp)); API.refreshLook(); toast(`Bought ${ITEM[sel].name}! ✨`); sfx.good(); render(); } };
    const wear = $('wear'); if (wear) wear.onclick = () => { for (const s of ['top', 'bottom', 'shoes', 'glasses', 'hat', 'earrings']) if (!p.owned.includes(tryApp[s]) && ITEM[tryApp[s]]?.price > 0) tryApp[s] = p.app[s]; p.app = JSON.parse(JSON.stringify(tryApp)); API.refreshLook(); toast('Looking good! 😎'); closeModal(); };
  };
  render();
}
function bodyHTML(a) {
  const sw = (key, list) => `<div class="swatches">${list.map((c) => `<button data-k="${key}" data-v="${c}" class="${a[key] === c ? 'on' : ''}" style="background:${c === 'none' ? 'repeating-linear-gradient(45deg,#fff 0 4px,#ccc 4px 8px)' : c}"></button>`).join('')}</div>`;
  return `<h3>Skin tone</h3>${sw('skin', SKIN_TONES)}<h3>Eye colour</h3>${sw('eyes', EYE_COLORS)}<p class="note">Hair, makeup and nails are done at the salon.</p>`;
}
function bindBody(box, app, rerender) { box.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { app[b.dataset.k] = b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v; sfx.click(); rerender(); })); }
export function wardrobe() { shop(null, true); }

export function salon() {
  const p = G.profile; const orig = p.app; const a = JSON.parse(JSON.stringify(p.app));
  const PRICES = { hair: 500, hairColor: 1200, beard: 300, lip: 400, liner: 200, blush: 200, shadow: 300, nails: 600, eyes: 1500 };
  const cost = () => Object.keys(PRICES).reduce((s, k) => s + (a[k] !== orig[k] ? PRICES[k] : 0), 0);
  const render = () => {
    const sw = (key, list) => `<div class="swatches">${list.map((c) => `<button data-k="${key}" data-v="${c}" class="${a[key] === c ? 'on' : ''}" style="background:${c === 'none' ? 'repeating-linear-gradient(45deg,#fff 0 4px,#ccc 4px 8px)' : c}"></button>`).join('')}</div>`;
    const opts = (key, list) => `<div class="opt-row">${list.map(([v, n]) => `<button data-k="${key}" data-v="${v}" class="${String(a[key]) === String(v) ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    modal(head('Glam Beauty Parlour & Salon', 'Hair · makeup · nails · beard — preview live in the mirror') + `<div class="m-body"><div class="split">${previewHTML()}<div>
      <h3>Hairstyle (₹500)</h3>${opts('hair', HAIR_STYLES)}<h3>Hair colour (₹1,200)</h3>${sw('hairColor', HAIR_COLORS)}
      <h3>Beard (₹300)</h3>${opts('beard', BEARDS)}
      <h3>Lipstick (₹400)</h3>${sw('lip', LIP_COLORS)}
      <h3>Eyeliner / blush (₹200 each)</h3>${opts('liner', [[true, 'Kohl wing on'], [false, 'No liner']])}${opts('blush', [[true, 'Blush on'], [false, 'No blush']])}
      <h3>Eyeshadow (₹300)</h3>${sw('shadow', SHADOW_COLORS)}<h3>Nail paint (₹600)</h3>${sw('nails', NAIL_COLORS)}<h3>Coloured lenses (₹1,500)</h3>${sw('eyes', EYE_COLORS)}
    </div></div></div><div class="m-foot"><span class="note" style="margin-right:auto">Total: <b>${fmtMoney(cost())}</b></span><button data-x>Cancel</button><button id="sal-ok" class="primary">Confirm makeover</button></div>`, { head: '#c0306a' });
    drawPreview(a);
    const box = $('modal-box'); bindBody(box, a, render);
    $('sal-ok').onclick = () => { const c = cost(); if (!c) return closeModal(); if (pay(c, 'makeover')) { p.app = a; API.refreshLook(); toast('Gorgeous! 💅'); sfx.good(); closeModal(); } };
  };
  render();
}

/* ============================== cafe / food ============================== */
function foodIcon(kind) { const c = canvas(80, 60); drawFood(c.getContext('2d'), kind, 40, 40); crisp(c); outline(c, '#3a3440'); return c.toDataURL(); }
const iconCache = {};
export function cafeMenu(key, seated) {
  const M = MENUS[key]; const qty = {}; const p = G.profile;
  const disc = p.reservations.includes(key) ? 0.15 : 0;
  const render = () => {
    const total = M.items.reduce((s, [n, pr], i) => s + (qty[i] || 0) * pr, 0);
    const fin = Math.round(total * (1 - disc));
    modal(`<div class="m-head" style="background:${M.theme[1]};color:${M.theme[0]}"><div>${esc(M.name)}<small>${esc(M.tag)}</small></div><button class="x" data-x>✕</button></div>
      <div class="m-body" style="background:${M.theme[0]};color:${M.theme[2]}"><div class="menu-list">${M.items.map(([n, pr, kind], i) => `<div class="menu-row"><img src="${iconCache[kind] || (iconCache[kind] = foodIcon(kind))}" width="64" height="48" style="image-rendering:pixelated"><span class="nm">${esc(n)}</span><span class="pr">${fmtMoney(pr)}</span><button data-m="${i}">−</button><b style="min-width:18px;text-align:center">${qty[i] || 0}</b><button data-p="${i}">+</button></div>`).join('')}</div>
      ${seated ? '' : '<p class="note" style="margin-top:10px">Tip: sit at a table to dine in — the waiter brings your food and you can eat together.</p>'}</div>
      <div class="m-foot"><span style="margin-right:auto">${disc ? '<b>Reservation −15%</b> · ' : ''}Total <b>${fmtMoney(fin)}</b></span><button data-x>Close</button><button id="order" class="primary" ${fin ? '' : 'disabled'}>${seated ? 'Order to table' : 'Order'}</button></div>`);
    const box = $('modal-box');
    box.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { qty[b.dataset.p] = (qty[b.dataset.p] || 0) + 1; sfx.click(); render(); }));
    box.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { qty[b.dataset.m] = Math.max(0, (qty[b.dataset.m] || 0) - 1); render(); }));
    $('order').onclick = () => {
      if (!pay(fin, M.name + ' bill')) return;
      if (disc) { p.reservations = p.reservations.filter((r) => r !== key); }
      const items = []; M.items.forEach(([n, pr, kind], i) => { for (let k = 0; k < (qty[i] || 0); k++) items.push({ name: n, price: pr, kind }); });
      closeModal(); API.placeOrder(key, items);
    };
  };
  render();
}
let diningOpt = null;
export function dining(opt) {
  diningOpt = opt;
  const p = G.profile;
  const draw = () => {
    const c = $('dine-cv'); if (!c) return;
    const foods = opt.takeaway ? opt.foods : (G.tableFoods[opt.key] || []);
    const diners = [p.app];
    const S = G.scene;
    if (!opt.takeaway && G.other && G.other.scene === API.sceneId() && G.other.state === 'sit' && G.mySeat) { const tb = S.tables && S.tables[G.mySeat.table]; if (tb && dist(G.other.x, G.other.y, tb.x, tb.y) < 30) diners.push(G.other.look); }
    const M = MENUS[opt.menu] || MENUS.coffeehouse;
    cafeScene(c, { diners, foods, theme: M.theme, cloth: ['petercat', 'mocambo'].includes(opt.menu) ? '#f4f0e4' : null, night: API.darkness() > 0.3 });
    $('dine-info').textContent = foods.length ? foods.map((f) => f.name + (f.bites ? ` (${3 - f.bites}/3 left)` : '')).join(' · ') : 'All finished! Order more?';
  };
  modal(head(MENUS[opt.menu]?.name || 'Bon appétit', opt.takeaway ? 'Takeaway' : 'Your table') + `<div class="m-body"><div class="scene-wrap"><canvas id="dine-cv" width="${SW}" height="${SH}"></canvas></div><p id="dine-info" class="note"></p></div>
    <div class="m-foot"><button id="d-eat" class="primary">🍴 Eat a bite</button><button id="d-pic">📷 Take a photo</button>${opt.takeaway ? '' : '<button id="d-more">Order more</button><button id="d-leave">Leave table</button>'}<button data-x>Close</button></div>`, { onClose: () => { diningOpt = null; } });
  draw();
  $('d-eat').onclick = () => {
    const list = opt.takeaway ? opt.foods : (G.tableFoods[opt.key] || []);
    let f = list.find((x) => x.by === p.name) || list[0]; if (!f) return toast('Nothing left to eat!');
    f.bites = (f.bites || 0) + 1; p.hunger = Math.min(100, p.hunger + Math.max(4, Math.round(f.price / 45))); sfx.click();
    if (f.bites >= 3) { list.splice(list.indexOf(f), 1); toast(`Finished the ${f.name}. Delicious! 😋`); }
    if (!opt.takeaway) G.net.send({ t: 'food', key: opt.key, foods: list });
    API.saveProfile(); draw();
  };
  $('d-pic').onclick = () => { const c = $('dine-cv'); savePhoto(c, MENUS[opt.menu]?.name || 'Kolkata'); };
  if (!opt.takeaway) { $('d-more').onclick = () => cafeMenu(opt.menu, true); $('d-leave').onclick = () => { closeModal(); API.standUp(); }; }
}
export function refreshDining() { if (diningOpt && $('dine-cv')) dining(diningOpt); }

/* ============================== selfies ============================== */
function placeFor() {
  const S = G.scene;
  if (S.kind === 'interior') { if (S.cafe) return { theme: MENUS[S.menu].theme }; if (S.id.startsWith('mall') || S.id === 'market') return 'mall'; if (S.home) return 'home'; return { theme: [S.pal.wall || '#efe4d2', S.pal.stripe || '#6b4226', S.pal.walltop || '#2a1a12'] }; }
  const z = zoneAt(G.world, G.me.x, G.me.y);
  if (/Victoria|Nandan|Cathedral/.test(z)) return 'victoria';
  if (/Park Street|Free School|Camac|Shakespeare|Esplanade|Park Circus/.test(z)) return 'parkstreet';
  if (/Sarovar|Hooghly|Water Park/.test(z)) return 'lake';
  if (/Zoo/.test(z)) return 'zoo';
  if (/Maidan|Brigade|Eden|Fort|Bagan|Race|Golf|Park/.test(z)) return 'maidan';
  return API.darkness() > 0.3 ? 'parkstreet' : 'maidan';
}
export function selfie() {
  const people = [G.profile.app];
  if (G.other && G.other.scene === API.sceneId() && dist(G.other.x, G.other.y, G.me.x, G.me.y) < 90) people.push(G.other.look);
  const label = G.scene.kind === 'world' ? zoneAt(G.world, G.me.x, G.me.y) : G.scene.name;
  const now = new Date(); const stamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  sfx.camera();
  modal(head('📷 Selfie', people.length > 1 ? 'Say "rosogolla"!' : 'Stand next to your partner for a couple selfie') + `<div class="m-body"><div class="scene-wrap"><canvas id="sf" width="${SW}" height="${SH}"></canvas></div></div><div class="m-foot"><button id="sf-save" class="primary">💾 Save to device</button><button id="sf-send">💌 Send to partner</button><button id="sf-keep">🖼 Keep in gallery</button><button data-x>Close</button></div>`);
  const c = $('sf');
  if (API.selfie3d) {
    const shot = API.selfie3d(people); c.width = shot.width; c.height = shot.height; const g = c.getContext('2d'); g.drawImage(shot, 0, 0);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, c.width, 44); g.fillRect(0, c.height - 40, c.width, 40);
    g.fillStyle = '#fff'; g.font = '600 24px "Pixelify Sans", sans-serif'; g.fillText(label, 16, 30); g.fillStyle = '#ffd94a'; g.textAlign = 'right'; g.fillText(stamp, c.width - 16, 30); g.textAlign = 'left';
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(c.width / 2, c.height - 20, 12, 0, 7); g.stroke();
  } else selfieScene(c, { place: placeFor(), people, label, stamp, night: API.darkness() > 0.3 });
  $('sf-save').onclick = () => download(c, label);
  $('sf-send').onclick = () => { sendChat('📷 ' + label, c.toDataURL('image/png')); toast('Photo sent 💌'); };
  $('sf-keep').onclick = () => { keep(c); toast('Saved to gallery'); };
}
function keep(c) { const ph = load('photos', []); ph.unshift(c.toDataURL('image/png')); save('photos', ph.slice(0, 12)); }
function download(c, label) { const big = canvas(c.width * 4, c.height * 4); const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, big.width, big.height); const a = document.createElement('a'); a.href = big.toDataURL('image/png'); a.download = `kolkata-${label.replace(/\W+/g, '-').toLowerCase()}-${Date.now()}.png`; a.click(); }
function savePhoto(c, label) { keep(c); download(c, label); toast('Photo saved 📸'); sfx.camera(); }

/* ============================== bank ============================== */
export function bank(kind) {
  const p = G.profile; const atm = kind === 'atm';
  const render = () => {
    modal(head(atm ? 'ATM' : kind === 'bengal' ? 'Bank of Bengal' : 'Hooghly National Bank', atm ? 'Cash withdrawal & deposit' : 'Accounts · cards · loans') + `<div class="m-body">
      <div class="kv"><b>Cash in hand</b><span>${fmtMoney(p.cash)}</span><b>Savings account</b><span>${fmtMoney(p.bank)}</span>${atm ? '' : `<b>Loan outstanding</b><span>${fmtMoney(p.loan)}</span><b>Credit card</b><span>${p.card ? `${esc(p.card.name)} — used ${fmtMoney(p.card.used)} of ${fmtMoney(p.card.limit)}` : 'Not linked'}</span>`}</div>
      <div class="row"><input id="amt" type="number" min="1" placeholder="Amount (₹)"><button id="dep">Deposit</button><button id="wd">Withdraw</button></div>
      ${atm ? '' : `<h3>Credit card</h3>${p.card ? `<div class="row"><button id="paycard" ${p.card.used ? '' : 'disabled'}>Pay card bill from account</button></div>` : `<div class="row"><input id="cardname" maxlength="20" placeholder="Card nickname, e.g. Platinum"><button id="link" class="primary">Link card (₹50,000 limit)</button></div>`}
      <h3>Personal loan</h3>${p.loan ? `<div class="row"><button id="repay">Repay ${fmtMoney(Math.min(p.loan, p.bank))} from account</button></div>` : '<div class="row"><button data-loan="25000">Borrow ₹25,000</button><button data-loan="100000">Borrow ₹1,00,000</button><span class="note">10% interest</span></div>'}`}
      <p class="note">All money in this game is fictional. No real card details — just give the card a nickname.</p></div><div class="m-foot"><button data-x>Done</button></div>`, { head: '#2a4a8a' });
    const amt = () => Math.floor(+$('amt').value || 0);
    $('dep').onclick = () => { const a = amt(); if (a > 0 && a <= p.cash) { p.cash -= a; p.bank += a; sfx.coin(); done(); } else toast('Check the amount.'); };
    $('wd').onclick = () => { const a = amt(); if (a > 0 && a <= p.bank) { p.bank -= a; p.cash += a; sfx.coin(); done(); } else toast('Insufficient balance.'); };
    const link = $('link'); if (link) link.onclick = () => { p.card = { name: ($('cardname').value.trim() || 'Platinum').slice(0, 20), limit: 50000, used: 0 }; toast('Card linked! 💳 Shops will charge it when cash runs out.'); done(); };
    const pc = $('paycard'); if (pc) pc.onclick = () => { const a = Math.min(p.card.used, p.bank); p.bank -= a; p.card.used -= a; done(); };
    $('modal-box').querySelectorAll('[data-loan]').forEach((b) => (b.onclick = () => { const a = +b.dataset.loan; p.bank += a; p.loan = Math.round(a * 1.1); toast(`Loan approved: ${fmtMoney(a)} credited`); sfx.good(); done(); }));
    const rp = $('repay'); if (rp) rp.onclick = () => { const a = Math.min(p.loan, p.bank); p.bank -= a; p.loan -= a; toast(p.loan ? 'Partly repaid.' : 'Loan fully repaid! 🎉'); done(); };
  };
  const done = () => { API.saveProfile(); render(); };
  render();
}

/* ============================== vault heist ============================== */
export function heist(bankKey) {
  const p = G.profile;
  if (!p.weapons.length) { dialog('Guard', 'Whoa there! You can\'t just walk up to the vault. (You\'d need a weapon to pull off a heist…)'); return; }
  let locks = 0, misses = 0, ang = 0, speed = 2.2, zone = Math.random() * Math.PI * 2, timeLeft = 25, over = false;
  modal(head('🔐 Crack the vault', 'Stop the needle inside the green zone — 3 tumblers. Miss twice and the alarm trips.') + `<div class="m-body" style="text-align:center"><canvas id="dial" class="heist-dial" width="220" height="220"></canvas><p id="hs">Tumblers: 0/3 · Misses: 0/2 · ⏱ 25s</p></div><div class="m-foot"><button data-x>Walk away</button><button id="crack" class="primary">CRACK (Space)</button></div>`, { head: '#3a3a42' });
  const g = $('dial').getContext('2d');
  const crack = () => {
    if (over) return;
    let d = Math.abs(((ang - zone) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (d < 0.32) { locks++; sfx.good(); zone = Math.random() * Math.PI * 2; speed += 0.9; if (locks >= 3) finish(true); }
    else { misses++; sfx.bad(); if (misses >= 2) finish(false); }
  };
  const finish = (ok) => {
    over = true;
    setTimeout(() => {
      closeModal();
      if (ok) { const loot = 80000 + Math.round(Math.random() * 170000); p.cash += loot; API.saveProfile(); bigText('HEIST COMPLETE', `You grabbed ${fmtMoney(loot)} — the alarm is ringing, RUN!`, 3200); G.crime(4); sfx.coin(); }
      else { bigText('ALARM!', 'The vault locked down. Police are on the way!', 2600); G.crime(3); }
    }, 300);
  };
  $('crack').onclick = crack;
  const key = (e) => { if (e.key === ' ' && !$('modal').classList.contains('hidden')) { e.preventDefault(); crack(); } };
  addEventListener('keydown', key);
  let last = performance.now();
  const tick = (now) => {
    const dt = (now - last) / 1000; last = now;
    if (!$('dial')) { removeEventListener('keydown', key); return; }
    if (!over) { ang += speed * dt; timeLeft -= dt; if (timeLeft <= 0) finish(false); }
    g.clearRect(0, 0, 220, 220); g.fillStyle = '#5a5e66'; g.beginPath(); g.arc(110, 110, 100, 0, 7); g.fill(); g.fillStyle = '#a8acb4'; g.beginPath(); g.arc(110, 110, 84, 0, 7); g.fill();
    g.strokeStyle = '#3ab84a'; g.lineWidth = 14; g.beginPath(); g.arc(110, 110, 70, zone - 0.32, zone + 0.32); g.stroke();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; g.fillStyle = '#3a3e46'; g.fillRect(110 + Math.cos(a) * 78 - 1, 110 + Math.sin(a) * 78 - 1, 3, 3); }
    g.strokeStyle = '#d42a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(110, 110); g.lineTo(110 + Math.cos(ang) * 80, 110 + Math.sin(ang) * 80); g.stroke();
    g.fillStyle = '#1d1b20'; g.beginPath(); g.arc(110, 110, 10, 0, 7); g.fill();
    $('hs').textContent = `Tumblers: ${locks}/3 · Misses: ${misses}/2 · ⏱ ${Math.max(0, Math.ceil(timeLeft))}s`;
    animId = requestAnimationFrame(tick);
  };
  animId = requestAnimationFrame(tick);
}

/* ============================== weapons / police / hospital / dealer ============================== */
const WEAPONS = [['knife', 'Kitchen knife', 1500], ['bat', 'Cricket bat', 800], ['pistol', 'Pistol (+12 rounds)', 25000], ['ammo', '20 rounds of ammo', 1000]];
export function weapons() {
  const p = G.profile;
  modal(head('Maidan Armoury', 'Q cycles weapons · F threatens · Space attacks. Crimes bring the police!') + `<div class="m-body"><div class="menu-list">${WEAPONS.map(([k, n, pr]) => `<div class="menu-row"><span class="nm">${{ knife: '🔪', bat: '🏏', pistol: '🔫', ammo: '📦' }[k]} ${esc(n)}</span><span class="pr">${fmtMoney(pr)}</span>${k !== 'ammo' && p.weapons.includes(k) ? '<b>Owned</b>' : `<button data-w="${k}" data-p="${pr}">Buy</button>`}</div>`).join('')}</div><p class="note">Ammo: ${p.ammo}</p></div><div class="m-foot"><button data-x>Leave</button></div>`, { head: '#3a3a32' });
  $('modal-box').querySelectorAll('[data-w]').forEach((b) => (b.onclick = () => { const k = b.dataset.w; if (!pay(+b.dataset.p, k)) return; if (k === 'ammo') p.ammo += 20; else { p.weapons.push(k); if (k === 'pistol') p.ammo += 12; } API.saveProfile(); toast('Purchased. Press Q to equip.'); weapons(); }));
}
export function policeDesk() {
  if (G.wanted <= 0) return dialog('Inspector Ghosh', 'All quiet. Enjoy the city — and stay out of trouble, okay?');
  const fine = 2000 * G.wanted;
  modal(head('Kolkata Police — Front desk') + `<div class="m-body"><p>You have <b>${G.wanted}★</b>. Pay a fine of <b>${fmtMoney(fine)}</b> to clear your record?</p></div><div class="m-foot"><button data-x>No</button><button id="pf" class="primary">Pay fine</button></div>`, { head: '#2a4a8a' });
  $('pf').onclick = () => { if (pay(fine, 'fine')) { G.wanted = 0; G.police = []; wanted(0); toast('Record cleared.'); closeModal(); } };
}
export function heal() {
  if (G.profile.health >= 100) return dialog('Dr. Banerjee', 'You look perfectly healthy! Maybe eat something — the canteen fish curry is famous.');
  payThen(500, 'treatment', () => { G.profile.health = 100; toast('Treated and patched up. ❤'); sfx.good(); });
}
const CAR_PRICES = { sports_red: 600000, sports_black: 650000, sports_lime: 620000, sports_blue: 640000, sports_orange: 610000, suv: 350000 };
export function dealer(type) {
  const p = G.profile; const price = CAR_PRICES[type] || 400000;
  modal(head('Park Street Motors', 'Supercars for the city of joy') + `<div class="m-body" style="text-align:center"><canvas id="carpv" width="34" height="18" style="width:340px;image-rendering:pixelated"></canvas><h3>${esc(type.replace('_', ' ').toUpperCase())}</h3><p>Price: <b>${fmtMoney(price)}</b> (cash + account)</p>${p.cars.includes(type) ? '<p><b>You own this model.</b></p>' : ''}</div><div class="m-foot"><button data-x>Just looking</button><button id="buycar" class="primary" ${p.cars.includes(type) ? 'disabled' : ''}>Buy it</button></div>`, { head: '#d42a2a' });
  const g = $('carpv').getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(carSprite(type), 0, 0);
  $('buycar').onclick = () => {
    const total = p.cash + p.bank; if (total < price) return toast(`You need ${fmtMoney(price)} — maybe a loan… or a heist?`);
    let rest = price; const fromCash = Math.min(p.cash, rest); p.cash -= fromCash; rest -= fromCash; p.bank -= rest;
    p.cars.push(type); API.saveProfile(); sfx.good(); bigText('NEW CAR!', 'It\'s parked outside. Summon it anytime from the Garage app.', 2600);
    const c = new Car(type, 121 * T + 8, 86 * T + 10, 0); c.parked = true; c.owned = true; c.keep = true; G.cars.push(c);
    closeModal();
  };
}

/* ============================== shows & minigames ============================== */
export function show(kind, title) {
  modal(head(title, 'Sit back and enjoy') + `<div class="m-body"><div class="scene-wrap"><canvas id="show" width="${SW}" height="${SH}"></canvas></div></div><div class="m-foot"><button data-x class="primary">Leave</button></div>`, { head: '#1d1b20' });
  const draw = showRenderer(kind); const g = $('show').getContext('2d'); const t0 = performance.now();
  const tick = (now) => { if (!$('show')) return; draw(g, (now - t0) / 1000); animId = requestAnimationFrame(tick); };
  animId = requestAnimationFrame(tick);
}
export function carriage() {
  fade(() => {
    modal(head('Victoria horse carriage', 'Clip-clop around the Memorial at sunset') + `<div class="m-body"><div class="scene-wrap"><canvas id="car-sc" width="${SW}" height="${SH}"></canvas></div></div><div class="m-foot"><button id="cpic">📷 Photo</button><button data-x class="primary">Get off</button></div>`, { onClose: () => API.teleport(54, 102) });
    const c = $('car-sc'); const people = [G.profile.app]; if (G.other && G.other.scene === 'world' && dist(G.other.x, G.other.y, G.me.x, G.me.y) < 100) people.push(G.other.look);
    selfieScene(c, { place: 'victoria', people, label: 'Victoria Memorial · carriage ride', stamp: '', night: API.darkness() > 0.3 });
    const g = c.getContext('2d'); const h = carSprite('carriage'); g.save(); g.scale(4, 4); g.drawImage(h, 2, 36); g.restore();
    $('cpic').onclick = () => savePhoto(c, 'carriage');
  });
}
export function busTravel() {
  const list = API.DESTINATIONS.filter((_, i) => i % 2 === 0);
  modal(head('🚌 City bus', 'Hop on — ₹20 to anywhere on the route') + `<div class="m-body">${list.map((d, i) => `<div class="dest"><span>${esc(d[0])}</span><button data-b="${i}">Go</button></div>`).join('')}</div><div class="m-foot"><button data-x>Wait</button></div>`, { head: '#2a6ac0' });
  $('modal-box').querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => { if (!pay(20, 'bus fare')) return; const d = list[+b.dataset.b]; closeModal(); fade(() => API.teleport(d[1], d[2])); toast('Conductor: "Esplanade, Esplanade! Ashun, ashun!"'); }));
}
export function cabRide(car) { toast(`🚕 Driver: "Chalun! Heading to ${G.cabDest}."`); G.waypoint = null; }
export function cabArrived(car) {
  const fare = G.cabFare || 100; API.exitCar(); if (pay(fare, 'cab fare')) toast(`Arrived at ${G.cabDest}. Paid ${fmtMoney(fare)}. Thank you! 🚕`);
}

export function golf() {
  const holes = [{ ball: [40, 150], hole: [270, 60], sand: [[160, 90, 30]], water: [[120, 150, 34, 18]] }, { ball: [40, 60], hole: [280, 150], sand: [[200, 110, 26]], water: [[150, 60, 30, 40]] }, { ball: [160, 180], hole: [160, 30], sand: [[120, 100, 22], [205, 90, 22]], water: [] }];
  let h = 0, strokes = 0, total = 0, aim = -0.4, power = 0, pdir = 1, charging = false, ball = null, v = [0, 0];
  const reset = () => { ball = [...holes[h].ball]; v = [0, 0]; strokes = 0; aim = Math.atan2(holes[h].hole[1] - ball[1], holes[h].hole[0] - ball[0]); };
  reset();
  modal(head('⛳ Royal Calcutta Golf Club', 'Founded 1829. ←/→ aim · hold Space (or the button) for power, release to swing') + `<div class="m-body"><canvas id="golf" class="golf-canvas" width="320" height="200"></canvas><p id="gs" class="note"></p></div><div class="m-foot"><button id="gl">◀</button><button id="gr">▶</button><button id="gsw" class="primary">Hold to swing</button><button data-x>Quit</button></div>`, { head: '#1f4a2a' });
  const g = $('golf').getContext('2d');
  const kd = (e) => { if (e.key === ' ') { e.preventDefault(); charging = true; } if (e.key === 'ArrowLeft') aim -= 0.06; if (e.key === 'ArrowRight') aim += 0.06; };
  const ku = (e) => { if (e.key === ' ') swing(); };
  const swing = () => { if (!charging) return; charging = false; if (Math.hypot(v[0], v[1]) > 1) return; v = [Math.cos(aim) * power * 3.2, Math.sin(aim) * power * 3.2]; strokes++; sfx.hit(); power = 0; };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  $('gl').onclick = () => (aim -= 0.12); $('gr').onclick = () => (aim += 0.12);
  const sw = $('gsw'); sw.onpointerdown = () => (charging = true); sw.onpointerup = swing;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('golf')) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); return; }
    const H = holes[h];
    if (charging) { power += pdir * dt * 90; if (power > 100 || power < 0) { pdir = -pdir; power = clamp(power, 0, 100); } }
    ball[0] += v[0] * dt; ball[1] += v[1] * dt;
    let fr = 1.4; for (const [sx, sy, r] of H.sand) if (dist(ball[0], ball[1], sx, sy) < r) fr = 4;
    v[0] *= 1 - fr * dt; v[1] *= 1 - fr * dt; if (Math.hypot(v[0], v[1]) < 4) v = [0, 0];
    if (ball[0] < 4 || ball[0] > 316) v[0] = -v[0]; if (ball[1] < 4 || ball[1] > 196) v[1] = -v[1]; ball[0] = clamp(ball[0], 4, 316); ball[1] = clamp(ball[1], 4, 196);
    for (const [wx, wy, ww, wh] of H.water) if (ball[0] > wx && ball[0] < wx + ww && ball[1] > wy && ball[1] < wy + wh) { sfx.splash(); toast('Splash! +1 stroke penalty'); strokes++; ball = [...H.ball]; v = [0, 0]; }
    if (dist(ball[0], ball[1], H.hole[0], H.hole[1]) < 5 && Math.hypot(v[0], v[1]) < 120) { total += strokes; sfx.good(); toast(`Hole ${h + 1} in ${strokes}! ${strokes === 1 ? 'HOLE IN ONE!!' : strokes <= 3 ? 'Nice!' : ''}`); h++; if (h >= holes.length) { closeModal(); bigText('ROUND DONE', `${total} strokes (par 9) — ${total <= 9 ? 'brilliant golf!' : 'not bad!'}`, 3000); return; } reset(); }
    // draw
    g.fillStyle = '#5fb848'; g.fillRect(0, 0, 320, 200); for (let x = 0; x < 320; x += 20) { g.fillStyle = '#68c050'; g.fillRect(x, 0, 10, 200); }
    g.fillStyle = '#9be872'; g.beginPath(); g.arc(H.hole[0], H.hole[1], 26, 0, 7); g.fill();
    for (const [sx, sy, r] of H.sand) { g.fillStyle = '#f0dca0'; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); }
    for (const [wx, wy, ww, wh] of H.water) { g.fillStyle = '#4a9fd8'; g.fillRect(wx, wy, ww, wh); }
    g.fillStyle = '#1d1b20'; g.beginPath(); g.arc(H.hole[0], H.hole[1], 4, 0, 7); g.fill(); g.fillStyle = '#8a8a90'; g.fillRect(H.hole[0], H.hole[1] - 22, 1, 22); g.fillStyle = '#d42a2a'; g.fillRect(H.hole[0] + 1, H.hole[1] - 22, 9, 6);
    if (!v[0] && !v[1]) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(ball[0], ball[1]); g.lineTo(ball[0] + Math.cos(aim) * 40, ball[1] + Math.sin(aim) * 40); g.stroke(); g.setLineDash([]); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ball[0], ball[1], 3, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#1d1b20'; g.fillRect(8, 8, 104, 10); g.fillStyle = power > 80 ? '#d42a2a' : '#ffd94a'; g.fillRect(10, 10, power, 6);
    $('gs').textContent = `Hole ${h + 1}/3 · Strokes ${strokes} · Total ${total}`;
    animId = requestAnimationFrame(tick);
  };
  animId = requestAnimationFrame(tick);
}

export function cricket() {
  let balls = 6, runs = 0, outs = 0, by = -1, speed = 0, result = '', swung = false;
  modal(head('🏏 Eden Gardens nets', 'Press Space (or Swing) when the ball reaches the bat') + `<div class="m-body"><canvas id="crk" class="golf-canvas" width="320" height="200"></canvas><p id="cs"></p></div><div class="m-foot"><button id="cbowl">Bowl next</button><button id="cswing" class="primary">SWING</button><button data-x>Done</button></div>`, { head: '#3a6aa8' });
  const g = $('crk').getContext('2d');
  const bowl = () => { if (by >= 0 || balls <= 0) return; by = 0; speed = 140 + Math.random() * 90; swung = false; result = ''; };
  const swing = () => { if (by < 0 || swung) return; swung = true; const d = Math.abs(by - 160); let r; if (d < 6) r = 6; else if (d < 12) r = 4; else if (d < 20) r = 2; else if (d < 30) r = 1; else r = -1; if (r < 0) { outs++; result = 'MISSED — bowled!'; sfx.bad(); } else { runs += r; result = r === 6 ? 'SIX!! Into the stands!' : r === 4 ? 'FOUR!' : r + ' run' + (r > 1 ? 's' : ''); sfx.good(); } };
  const kd = (e) => { if (e.key === ' ') { e.preventDefault(); if (by < 0) bowl(); else swing(); } };
  addEventListener('keydown', kd); $('cbowl').onclick = bowl; $('cswing').onclick = swing;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('crk')) { removeEventListener('keydown', kd); return; }
    if (by >= 0) { by += speed * dt; if (by > 200) { if (!swung) { outs++; result = 'Left it… bowled!'; } by = -1; balls--; if (balls <= 0) result += ` — Over! ${runs}/${outs}`; } }
    g.fillStyle = '#3a8a3a'; g.fillRect(0, 0, 320, 200); g.fillStyle = '#d8c08a'; g.beginPath(); g.moveTo(140, 0); g.lineTo(180, 0); g.lineTo(220, 200); g.lineTo(100, 200); g.fill();
    g.fillStyle = '#f2f2f2'; g.fillRect(100, 160, 120, 2); g.fillStyle = '#c8a050'; for (let k = 0; k < 3; k++) g.fillRect(150 + k * 8, 168, 3, 26);
    g.fillStyle = '#8a5a32'; g.fillRect(186, 140, 6, 40);
    if (by >= 0) { const s = 3 + by / 40; g.fillStyle = '#c0182a'; g.beginPath(); g.arc(160 + (by / 200) * 6, by, s, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, 320, 18); g.fillStyle = '#fff'; g.font = '12px monospace'; g.fillText(`Runs ${runs}  Wkts ${outs}  Balls left ${balls}`, 8, 13);
    if (result) { g.fillStyle = '#ffd94a'; g.font = 'bold 18px monospace'; g.fillText(result, 160 - g.measureText(result).width / 2, 100); }
    $('cs').textContent = balls > 0 ? 'Bowl, then swing at the right moment (perfect timing = SIX).' : `Final: ${runs} runs for ${outs} wickets.`;
    animId = requestAnimationFrame(tick);
  };
  animId = requestAnimationFrame(tick);
}
export { shade, ell, px, background, PW, PH, CAR_TYPES };
