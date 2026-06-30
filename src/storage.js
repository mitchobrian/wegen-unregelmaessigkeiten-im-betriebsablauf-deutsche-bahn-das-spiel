/* Fortschritt im Browser: freigeschaltete Level, Best-Scores, Spielername, Einstellungen. */

const KEY = 'db_jnr_progress_v1';

const DEFAULTS = {
  playerName: '',
  unlocked: 1,            // höchstes freigeschaltetes Level (1..3)
  best: {},               // { [levelId]: bestScore }
  totalBest: 0,           // beste Gesamtpunktzahl (für die Bestenliste)
  sound: true,
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* z. B. privater Modus */ }
}

export const storage = {
  get() { return read(); },

  getName() { return read().playerName; },
  setName(name) { const s = read(); s.playerName = name; write(s); },

  getUnlocked() { return read().unlocked; },
  getBest(levelId) { return read().best[levelId] || 0; },
  getTotalBest() { return read().totalBest || 0; },

  // Levelergebnis verbuchen: Bestscore + ggf. nächstes Level freischalten.
  recordResult(levelId, score) {
    const s = read();
    s.best[levelId] = Math.max(s.best[levelId] || 0, score);
    if (levelId >= s.unlocked && levelId < 3) s.unlocked = levelId + 1;
    s.totalBest = Object.values(s.best).reduce((a, b) => a + b, 0);
    write(s);
    return s;
  },

  getSound() { return read().sound; },
  setSound(on) { const s = read(); s.sound = on; write(s); },
};
