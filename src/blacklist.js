/*
 * Namensprüfung für die Bestenliste.
 * - Normalisiert gegen gängige Umgehung (Leetspeak, Diakritika, Trennzeichen),
 *   bevor gegen die Sperrliste abgeglichen wird.
 * - Die Liste ist bewusst kompakt gehalten und deckt offensichtliche Beleidigungen,
 *   Hassrede sowie Identitäts-/Marken-Impersonation ab. Sie ist nicht abschließend.
 */

// Beleidigungen / Hassrede / Vulgäres (Stämme) – Teilstring-Abgleich auf normalisierter Form.
const OFFENSIVE = [
  // DE
  'arsch', 'fick', 'ficken', 'fotze', 'hure', 'nutte', 'wichser', 'schlampe',
  'hurensohn', 'missgeburt', 'spast', 'spasti', 'behindert', 'krüppel', 'kruppel',
  'nazi', 'hitler', 'heilhitler', 'judensau', 'neger', 'schwuchtel', 'kanake',
  'vergewalt', 'kinderfick', 'penis', 'schwanz', 'muschi', 'titten',
  // EN
  'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'nigga', 'cunt', 'faggot',
  'retard', 'rape', 'rapist', 'whore', 'slut', 'dick', 'pussy', 'cock', 'pedo',
];

// Reservierte / impersonierende Begriffe – exakter Abgleich auf normalisierter Form.
const RESERVED = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'support', 'system', 'root',
  'deutschebahn', 'db', 'dbnavigator', 'bahn', 'official', 'offiziell',
  'anthropic', 'claude',
]);

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's' };

function normalize(s) {
  let out = s.toLowerCase();
  out = out.replace(/[0134578@$]/g, (c) => LEET[c] || c);
  // Diakritika entfernen, ß/ä/ö/ü vereinheitlichen
  out = out.replace(/ß/g, 'ss').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
  out = out.normalize('NFD').replace(/[̀-ͯ]/g, '');
  out = out.replace(/[^a-z0-9]/g, ''); // nur Buchstaben/Ziffern
  return out;
}

export function isAllowedName(raw) {
  const norm = normalize(raw);
  if (!norm) return false;
  if (RESERVED.has(norm)) return false;
  if (OFFENSIVE.some((w) => norm.includes(w))) return false;
  return true;
}

/*
 * Vollständige Validierung. Liefert { ok, value?, reason? }.
 * value ist der bereinigte Anzeigename (getrimmt, Mehrfach-Leerzeichen reduziert).
 */
export function validateName(raw) {
  const value = String(raw || '').trim().replace(/\s+/g, ' ');
  if (value.length < 2) return { ok: false, reason: 'Bitte mindestens 2 Zeichen.' };
  if (value.length > 20) return { ok: false, reason: 'Höchstens 20 Zeichen.' };
  if (!/^[A-Za-z0-9ÄÖÜäöüß _-]+$/.test(value)) {
    return { ok: false, reason: 'Nur Buchstaben, Zahlen, Leerzeichen, _ und - erlaubt.' };
  }
  if (!/[A-Za-zÄÖÜäöüß]/.test(value)) return { ok: false, reason: 'Bitte mindestens einen Buchstaben verwenden.' };
  if (!isAllowedName(value)) return { ok: false, reason: 'Dieser Name ist leider nicht zulässig. Bitte wähle einen anderen.' };
  return { ok: true, value };
}

export { normalize };
