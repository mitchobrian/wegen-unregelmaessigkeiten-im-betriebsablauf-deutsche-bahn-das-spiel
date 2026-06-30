/*
 * Bestenliste mit zwei Modi:
 *  - online: Supabase-REST (reines fetch, zero-dep), wenn window.DB_CONFIG gesetzt ist.
 *  - lokal:  localStorage-Fallback, damit das Spiel ohne Backend voll funktioniert.
 *
 * Wichtig: Pro Name gibt es genau EINEN Eintrag mit dem BESTWERT. Beim Eintragen
 * wird NICHT mehr umbenannt – sonst entstünden bei jedem Spiel mitch/mitch2/mitch3.
 * Die Nummerierung doppelter Namen passiert nur einmal bei der Registrierung
 * (und nie für den bereits eigenen Namen des Geräts).
 */

const LOCAL_KEY = 'db_jnr_board_v1';
const cfg = (typeof window !== 'undefined' && window.DB_CONFIG) || null;
const ONLINE = !!(cfg && cfg.supabaseUrl && cfg.supabaseAnonKey);

function headers(extra = {}) {
  return {
    apikey: cfg.supabaseAnonKey,
    Authorization: `Bearer ${cfg.supabaseAnonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/* ---------- lokaler Speicher ---------- */
function localRead() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch { return []; }
}
function localWrite(rows) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch { /* ignore */ }
}

// Pro Name nur den höchsten Score behalten.
function dedupeByName(rows) {
  const best = new Map();
  for (const r of rows) {
    const k = String(r.name).toLowerCase();
    if (!best.has(k) || r.score > best.get(k).score) best.set(k, r);
  }
  return [...best.values()];
}

/* ---------- vorhandene Namen ermitteln ---------- */
async function fetchNames() {
  if (!ONLINE) return localRead().map((r) => r.name);
  const url = `${cfg.supabaseUrl}/rest/v1/scores?select=name`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const data = await res.json();
  return data.map((r) => r.name);
}

// Eindeutigen Anzeigenamen bilden (case-insensitive).
function makeUnique(desired, existing) {
  const taken = new Set(existing.map((n) => String(n).toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;
  let i = 2;
  while (taken.has(`${desired}${i}`.toLowerCase())) i++;
  return `${desired}${i}`;
}

// Bisherigen Bestwert für genau diesen Namen holen (online).
async function fetchBest(name) {
  const url = `${cfg.supabaseUrl}/rest/v1/scores?name=eq.${encodeURIComponent(name)}&select=score&order=score.desc&limit=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const data = await res.json();
  return data.length ? data[0].score : null;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export const leaderboard = {
  mode: ONLINE ? 'online' : 'local',

  modeLabel() {
    return ONLINE
      ? 'Globale Bestenliste (online)'
      : 'Lokale Bestenliste – nur auf diesem Gerät gespeichert.';
  },

  /*
   * Eindeutigen Namen gegen den aktuellen Stand auflösen (für die Registrierung).
   * Der bereits eigene Name (current) wird dabei NICHT umnummeriert.
   */
  async resolveName(desired, current = '') {
    if (current && desired.toLowerCase() === current.toLowerCase()) return desired;
    try {
      const names = await fetchNames();
      const others = current
        ? names.filter((n) => String(n).toLowerCase() !== current.toLowerCase())
        : names;
      return makeUnique(desired, others);
    } catch {
      return desired; // im Zweifel den Wunschnamen nehmen
    }
  },

  // Top-Einträge laden (pro Name nur der Bestwert).
  async getTop(limit = 10) {
    if (ONLINE) {
      try {
        const url = `${cfg.supabaseUrl}/rest/v1/scores?select=name,score,level&order=score.desc&limit=100`;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) throw new Error(`Supabase ${res.status}`);
        return dedupeByName(await res.json()).sort((a, b) => b.score - a.score).slice(0, limit);
      } catch (e) {
        console.warn('[Bestenliste] Online-Abruf fehlgeschlagen, nutze lokal:', e.message);
      }
    }
    return dedupeByName(localRead()).sort((a, b) => b.score - a.score).slice(0, limit);
  },

  /*
   * Score eintragen – OHNE Umbenennung. Pro Name bleibt der Bestwert erhalten.
   * Liefert den (unveränderten) Namen zurück.
   */
  async submit(name, score, level) {
    const value = Math.round(score);

    if (ONLINE) {
      try {
        const best = await fetchBest(name);
        // Nur eintragen, wenn es ein neuer persönlicher Bestwert ist.
        if (best === null || value > best) {
          const res = await fetch(`${cfg.supabaseUrl}/rest/v1/scores`, {
            method: 'POST',
            headers: headers({ Prefer: 'return=minimal' }),
            body: JSON.stringify([{ name, score: value, level }]),
          });
          if (!res.ok) throw new Error(`Supabase ${res.status}`);
        }
        return name;
      } catch (e) {
        console.warn('[Bestenliste] Online-Eintrag fehlgeschlagen, speichere lokal:', e.message);
      }
    }

    // Lokal: genau ein Eintrag pro Name, immer der Bestwert.
    const rows = localRead();
    const idx = rows.findIndex((r) => String(r.name).toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      if (value > rows[idx].score) { rows[idx].score = value; rows[idx].level = level; rows[idx].ts = Date.now(); }
    } else {
      rows.push({ name, score: value, level, ts: Date.now() });
    }
    localWrite(rows);
    return name;
  },

  /*
   * Einmalige Aufräumaktion für die LOKALE Liste: entfernt versehentlich
   * angelegte Nummern-Varianten des eigenen Namens (mitch2, mitch3 …) und
   * behält pro Name nur den Bestwert. Greift nur lokal.
   */
  cleanupLocal(ownName) {
    if (!ownName) return;
    let rows = dedupeByName(localRead());
    const variant = new RegExp(`^${escapeRe(ownName)}\\d+$`, 'i');
    rows = rows.filter((r) => !variant.test(String(r.name)));
    localWrite(rows);
  },
};
