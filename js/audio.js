// Tiny synthesized sound effects + optional chiptune loop (no audio files needed).
let ac = null, master = null, musicOn = false, musicTimer = null;
function ctx() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.25; master.connect(ac.destination); } catch (e) { return null; } }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0) {
  const a = ctx(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + delay);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, a.currentTime + delay + dur);
  g.gain.setValueAtTime(vol, a.currentTime + delay); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + delay + dur);
  o.connect(g); g.connect(master); o.start(a.currentTime + delay); o.stop(a.currentTime + delay + dur + 0.02);
}
function noise(dur, vol = 0.3) {
  const a = ctx(); if (!a) return;
  const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), g = a.createGain(); g.gain.value = vol; s.buffer = b; s.connect(g); g.connect(master); s.start();
}
export const sfx = {
  click: () => tone(880, 0.05, 'square', 0.15),
  coin: () => { tone(988, 0.08, 'square', 0.2); tone(1319, 0.2, 'square', 0.2, 0, 0.08); },
  door: () => { tone(220, 0.1, 'triangle', 0.3); tone(330, 0.15, 'triangle', 0.3, 0, 0.1); },
  honk: () => { tone(392, 0.25, 'sawtooth', 0.18); tone(494, 0.25, 'sawtooth', 0.12); },
  shot: () => noise(0.18, 0.5),
  hit: () => tone(160, 0.12, 'square', 0.3, -80),
  splash: () => noise(0.35, 0.2),
  bad: () => tone(200, 0.3, 'sawtooth', 0.25, -100),
  good: () => { tone(523, 0.1, 'square', 0.2); tone(659, 0.1, 'square', 0.2, 0, 0.1); tone(784, 0.2, 'square', 0.2, 0, 0.2); },
  msg: () => { tone(1046, 0.06, 'sine', 0.25); tone(1568, 0.1, 'sine', 0.2, 0, 0.07); },
  siren: () => { tone(700, 0.4, 'sawtooth', 0.08, 300); tone(1000, 0.4, 'sawtooth', 0.08, -300, 0.4); },
  camera: () => { noise(0.05, 0.4); tone(1800, 0.04, 'square', 0.1, 0, 0.05); },
};
// A gentle looping tune (Bengali-folk flavoured pentatonic).
const NOTES = [523, 587, 659, 784, 880, 1046];
const SONG = [0, 2, 3, 4, 3, 2, 0, -1, 2, 3, 4, 5, 4, 3, 2, -1, 4, 3, 2, 0, 2, 3, 2, 0, 1, 2, 0, -1, 0, -1, -1, -1];
export function toggleMusic() {
  musicOn = !musicOn;
  clearInterval(musicTimer);
  if (musicOn) {
    let i = 0;
    musicTimer = setInterval(() => { const n = SONG[i++ % SONG.length]; if (n >= 0) { tone(NOTES[n] / 2, 0.28, 'triangle', 0.12); if (i % 4 === 1) tone(NOTES[0] / 4, 0.5, 'sine', 0.1); } }, 260);
  }
  return musicOn;
}
export function unlockAudio() { ctx(); }
