// Two-player online link over WebRTC (PeerJS). Same secret code => same private game.
// The first player to arrive becomes "host"; the second joins. Anyone else is refused.
/* global Peer */

async function sha(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kolkata-city::' + s.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
}

export class Net {
  constructor() {
    this.peer = null; this.conn = null; this.role = null; this.handlers = {}; this.status = 'offline';
    this.call = null; this.localStream = null; this.remoteAudio = new Audio(); this.remoteAudio.autoplay = true; this.muted = false;
    this.retry = null;
  }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  emit(ev, ...a) { (this.handlers[ev] || []).forEach((f) => f(...a)); }
  setStatus(s) { this.status = s; this.emit('status', s); }
  peerOptions() {
    const q = new URLSearchParams(location.search);
    const o = { debug: 1 };
    if (q.get('peerhost')) { o.host = q.get('peerhost'); o.port = +(q.get('peerport') || 9000); o.path = q.get('peerpath') || '/'; o.secure = q.get('peersecure') === '1'; }
    return o;
  }
  async connect(code) {
    if (typeof Peer === 'undefined') { this.setStatus('error: networking library missing'); return; }
    this.code = code; this.hostId = 'klk-' + (await sha(code));
    this.setStatus('connecting…');
    this.tryHost();
  }
  tryHost() {
    const p = new Peer(this.hostId, this.peerOptions());
    this.peer = p;
    p.on('open', () => { this.role = 'host'; this.setStatus('waiting for your partner…'); });
    p.on('connection', (c) => {
      if (this.conn && this.conn.open) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); }); return; }
      this.bind(c);
    });
    p.on('call', (call) => this.emit('incomingCall', call));
    p.on('error', (e) => {
      if (e.type === 'unavailable-id') { p.destroy(); this.tryGuest(); }
      else if (e.type === 'peer-unavailable') { this.setStatus('partner not reachable — retrying…'); this.scheduleRetry(); }
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') { this.setStatus('network trouble — retrying…'); this.scheduleRetry(true); }
      else this.setStatus('error: ' + e.type);
    });
    p.on('disconnected', () => { if (!p.destroyed) { try { p.reconnect(); } catch (_) { /* ignore */ } } });
  }
  tryGuest() {
    const p = new Peer(this.peerOptions());
    this.peer = p;
    p.on('open', () => {
      this.role = 'guest'; this.setStatus('joining your partner…');
      const c = p.connect(this.hostId, { reliable: true, serialization: 'json' });
      this.bind(c);
    });
    p.on('call', (call) => this.emit('incomingCall', call));
    p.on('error', (e) => {
      if (e.type === 'peer-unavailable') { this.setStatus('partner left — retrying…'); this.scheduleRetry(true); }
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') { this.setStatus('network trouble — retrying…'); this.scheduleRetry(true); }
      else this.setStatus('error: ' + e.type);
    });
  }
  scheduleRetry(full) {
    clearTimeout(this.retry);
    this.retry = setTimeout(() => { if (this.conn && this.conn.open) return; try { this.peer && this.peer.destroy(); } catch (_) { /* */ } this.conn = null; this.tryHost(); }, full ? 3000 : 2500);
  }
  bind(c) {
    this.conn = c;
    c.on('open', () => { this.setStatus('connected'); this.emit('connected', this.role); });
    c.on('data', (m) => { if (m && m.t === '_part') { m = this._part(m); if (!m) return; } if (m && m.t === 'full') { this.setStatus('this game already has two players'); c.close(); this.peer.destroy(); this.full = true; return; } this.emit('msg', m); });
    c.on('close', () => { this.emit('disconnected'); this.conn = null; this.endCall(); if (!this.full) { this.setStatus(this.role === 'host' ? 'waiting for your partner…' : 'partner disconnected — retrying…'); if (this.role === 'guest') this.scheduleRetry(true); } });
    c.on('error', () => { /* handled by close */ });
  }
  get connected() { return !!(this.conn && this.conn.open); }
  send(m) {
    if (!this.connected) return;
    try {
      const str = JSON.stringify(m);
      if (str.length <= 14000) { this.conn.send(m); return; }
      // the data channel silently drops big messages, so split them into parts
      const id = Math.random().toString(36).slice(2), n = Math.ceil(str.length / 12000);
      for (let i = 0; i < n; i++) this.conn.send({ t: '_part', id, i, n, d: str.slice(i * 12000, (i + 1) * 12000) });
    } catch (_) { /* */ }
  }
  _part(m) {
    this.parts = this.parts || {};
    if (typeof m.d !== 'string' || !(m.n > 0 && m.n < 200) || !(m.i >= 0 && m.i < m.n)) return null;
    const p = this.parts[m.id] || (this.parts[m.id] = { got: 0, list: new Array(m.n) });
    if (!p.list[m.i]) { p.list[m.i] = m.d; p.got++; }
    if (p.got < m.n) return null;
    delete this.parts[m.id];
    try { return JSON.parse(p.list.join('')); } catch (_) { return null; }
  }

  /* ---------- voice ---------- */
  async getMic() {
    if (this.localStream) return this.localStream;
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    return this.localStream;
  }
  async startCall() {
    if (!this.connected) throw new Error('Partner is not online');
    const s = await this.getMic();
    const call = this.peer.call(this.conn.peer, s);
    this.attachCall(call);
  }
  async answer(call) { const s = await this.getMic(); call.answer(s); this.attachCall(call); }
  attachCall(call) {
    this.call = call;
    call.on('stream', (rs) => { this.remoteAudio.srcObject = rs; this.remoteAudio.play().catch(() => {}); this.emit('callState', 'live'); });
    call.on('close', () => this.endCall(true));
    call.on('error', () => this.endCall(true));
    this.emit('callState', 'ringing');
  }
  endCall(remote) {
    if (this.call) { try { this.call.close(); } catch (_) { /* */ } }
    this.call = null;
    if (this.localStream) { this.localStream.getTracks().forEach((t) => t.stop()); this.localStream = null; }
    this.remoteAudio.srcObject = null; this.muted = false;
    this.emit('callState', 'ended');
    if (!remote) this.send({ t: 'hangup' });
  }
  toggleMute() { if (!this.localStream) return false; this.muted = !this.muted; this.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.muted)); return this.muted; }
}
