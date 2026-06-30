/*
 * Bestenliste mit zwei Modi:
 *  - online: Supabase-REST (reines fetch, zero-dep), wenn window.DB_CONFIG gesetzt ist.
 *  - lokal:  localStorage-Fallback, damit das Spiel ohne Backend voll funktioniert.
 *
 * Doppelte Namen werden durch eine angehängte Zahl eindeutig gemacht (Name, Name2, …).
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

export const leaderboard = {
  mode: ONLINE ? 'online' : 'local',

  modeLabel() {
    return ONLINE
      ? 'Globale Bestenliste (online)'
      : 'Lokale Bestenliste – nur auf diesem Gerät gespeichert.';
  },

  // Eindeutigen Namen gegen den aktuellen Stand auflösen (für die Registrierung).
  async resolveName(desired) {
    try {
      const names = await fetchNames();
      return makeUnique(desired, names);
    } catch {
      return desired; // im Zweifel den Wunschnamen nehmen
    }
  },

  // Top-Einträge laden.
  async getTop(limit = 10) {
    if (ONLINE) {
      try {
        const url = `${cfg.supabaseUrl}/rest/v1/scores?select=name,score,level&order=score.desc&limit=${limit}`;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) throw new Error(`Supabase ${res.status}`);
        return await res.json();
      } catch (e) {
        console.warn('[Bestenliste] Online-Abruf fehlgeschlagen, nutze lokal:', e.message);
      }
    }
    return localRead().sort((a, b) => b.score - a.score).slice(0, limit);
  },

  /*
   * Score eintragen. Liefert den final gespeicherten (eindeutigen) Namen zurück.
   * Falls der Name bereits belegt ist, wird eine Zahl angehängt.
   */
  async submit(name, score, level) {
    let finalName = name;
    try {
      const names = await fetchNames();
      finalName = makeUnique(name, names);
    } catch { /* Netzwerkfehler -> Wunschname */ }

    if (ONLINE) {
      try {
        const url = `${cfg.supabaseUrl}/rest/v1/scores`;
        const res = await fetch(url, {
          method: 'POST',
          headers: headers({ Prefer: 'return=minimal' }),
          body: JSON.stringify([{ name: finalName, score: Math.round(score), level }]),
        });
        if (!res.ok) throw new Error(`Supabase ${res.status}`);
        return finalName;
      } catch (e) {
        console.warn('[Bestenliste] Online-Eintrag fehlgeschlagen, speichere lokal:', e.message);
      }
    }

    const rows = localRead();
    rows.push({ name: finalName, score: Math.round(score), level, ts: Date.now() });
    localWrite(rows);
    return finalName;
  },
};
