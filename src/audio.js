/* Minimalistische WebAudio-Effekte (zero-dep). Abschaltbar, startet erst nach erster Interaktion. */

let ctx = null;
let enabled = true;

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, dur, type = 'square', gain = 0.06) {
  const c = ensure();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

const SOUNDS = {
  coin: () => blip(880, 0.12, 'square'),
  relief: () => blip(520, 0.18, 'sine', 0.08),
  power: () => { blip(440, 0.1); setTimeout(() => blip(660, 0.12), 90); setTimeout(() => blip(880, 0.14), 180); },
  stomp: () => blip(180, 0.12, 'sawtooth', 0.08),
  hit: () => blip(140, 0.25, 'sawtooth', 0.09),
  win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'square', 0.07), i * 120)); },
  gameover: () => { [400, 320, 220, 160].forEach((f, i) => setTimeout(() => blip(f, 0.28, 'triangle', 0.08), i * 160)); },
};

export const audio = {
  play(name) { if (enabled && SOUNDS[name]) SOUNDS[name](); },
  setEnabled(v) { enabled = v; },
  isEnabled() { return enabled; },
  unlock() { ensure(); },
};
