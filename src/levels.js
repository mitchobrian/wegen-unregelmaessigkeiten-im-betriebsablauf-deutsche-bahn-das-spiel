/*
 * Drei Level-Definitionen. Die Tilemaps werden über einen kleinen Builder erzeugt,
 * damit der begehbare Boden garantiert durchgängig (und fair springbar) ist.
 * Plattformen, Münzen und Items darüber sind optionale Boni.
 *
 * Zeichen: '#' Boden · 'B' Plattform · '|' Säule · 'p' Start · 'G' Ziel(Zug)
 *          '^' Gefahr(Gleis) · 'o' €-Münze · 'c' Eis/Ventilator · 'w' Kaffee/Glühwein
 *          'k' BahnCard · 'x' Koffer · 'm' Menschenmenge · 'v' Schienenersatzverkehr
 */

const H = 17;
const FLOOR_TOP = 15; // Bodenreihen 15 & 16
const SURFACE = 14;   // Reihe, auf der Dinge "stehen"

function blank(w) {
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(w).fill(' '));
  return g;
}
function makeFloor(g, w, pits) {
  for (let x = 0; x < w; x++) {
    const inPit = pits.some((p) => x >= p[0] && x < p[0] + p[1]);
    if (!inPit) { g[FLOOR_TOP][x] = '#'; g[FLOOR_TOP + 1][x] = '#'; }
  }
}
function put(g, x, y, ch) { if (g[y] && x >= 0 && x < g[y].length) g[y][x] = ch; }
function platform(g, x, y, len) { for (let i = 0; i < len; i++) put(g, x + i, y, 'B'); }
function coinRow(g, x, y, n) { for (let i = 0; i < n; i++) put(g, x + i, y, 'o'); }
function toRows(g) { return g.map((r) => r.join('')); }

/* ---------- Level 1: Sommerchaos (Hitze) ---------- */
function buildLevel1() {
  const w = 120;
  const g = blank(w);
  makeFloor(g, w, [[26, 2], [46, 3], [72, 2], [92, 3]]);
  // Plattformen + Münzbögen
  platform(g, 10, 11, 3); coinRow(g, 10, 10, 3);
  platform(g, 20, 9, 3); coinRow(g, 20, 8, 3);
  platform(g, 34, 11, 4); coinRow(g, 35, 10, 2);
  platform(g, 56, 10, 3); coinRow(g, 56, 9, 3);
  platform(g, 80, 9, 4); coinRow(g, 81, 8, 2);
  platform(g, 104, 11, 3);
  // Bodennahe Münzen
  coinRow(g, 6, 13, 2); coinRow(g, 40, 13, 2); coinRow(g, 64, 13, 3); coinRow(g, 110, 13, 2);
  // Abkühlung (Eis/Ventilator)
  put(g, 12, 10, 'c'); put(g, 50, 13, 'c'); put(g, 78, 13, 'c'); put(g, 100, 13, 'c');
  // BahnCard
  put(g, 57, 9, 'k');
  // Gefahren auf dem Gleis
  put(g, 38, SURFACE, '^'); put(g, 39, SURFACE, '^'); put(g, 88, SURFACE, '^');
  // Gegner: Koffer + erste Menschenmenge
  put(g, 18, SURFACE, 'x'); put(g, 60, SURFACE, 'x'); put(g, 96, SURFACE, 'x');
  put(g, 68, SURFACE, 'm');
  // Start / Ziel
  put(g, 2, SURFACE, 'p');
  put(g, 116, SURFACE, 'G');
  return {
    id: 1,
    theme: 'heat',
    name: 'Sommerchaos im Regionalexpress',
    subtitle: 'Klimaanlage defekt – die Hitze steigt. Halte dich mit Eis & Ventilatoren kühl.',
    icon: '🥵',
    par: 45,
    map: toRows(g),
  };
}

/* ---------- Level 2: Winterfahrt (Kälte) ---------- */
function buildLevel2() {
  const w = 130;
  const g = blank(w);
  makeFloor(g, w, [[22, 2], [40, 3], [58, 2], [78, 3], [104, 2]]);
  platform(g, 14, 10, 3); coinRow(g, 14, 9, 3);
  platform(g, 30, 11, 3);
  platform(g, 44, 9, 4); coinRow(g, 45, 8, 2);
  platform(g, 62, 11, 3); coinRow(g, 62, 10, 3);
  platform(g, 84, 10, 4); coinRow(g, 85, 9, 2);
  platform(g, 110, 11, 3);
  coinRow(g, 8, 13, 3); coinRow(g, 52, 13, 2); coinRow(g, 96, 13, 3); coinRow(g, 120, 13, 2);
  // Aufwärmung (Kaffee/Glühwein)
  put(g, 16, 9, 'w'); put(g, 36, 13, 'w'); put(g, 70, 13, 'w'); put(g, 100, 13, 'w'); put(g, 118, 13, 'w');
  put(g, 85, 9, 'k'); // BahnCard
  // Gefahren (vereiste Gleise)
  put(g, 34, SURFACE, '^'); put(g, 35, SURFACE, '^'); put(g, 92, SURFACE, '^'); put(g, 93, SURFACE, '^');
  // Gegner: mehr Koffer + Menschenmengen
  put(g, 20, SURFACE, 'x'); put(g, 56, SURFACE, 'x'); put(g, 88, SURFACE, 'x'); put(g, 112, SURFACE, 'x');
  put(g, 48, SURFACE, 'm'); put(g, 98, SURFACE, 'm');
  put(g, 2, SURFACE, 'p');
  put(g, 126, SURFACE, 'G');
  return {
    id: 2,
    theme: 'cold',
    name: 'Winterfahrt ohne Heizung',
    subtitle: 'Heizung ausgefallen – es wird eisig. Wärm dich an Kaffee & Glühwein.',
    icon: '🥶',
    par: 55,
    map: toRows(g),
  };
}

/* ---------- Level 3: Hauptbahnhof-Endspurt (alles) ---------- */
function buildLevel3() {
  const w = 150;
  const g = blank(w);
  makeFloor(g, w, [[24, 3], [42, 2], [58, 3], [76, 2], [94, 3], [118, 2], [134, 3]]);
  platform(g, 12, 10, 3); coinRow(g, 12, 9, 3);
  platform(g, 32, 9, 3); coinRow(g, 32, 8, 3);
  platform(g, 48, 11, 4);
  platform(g, 66, 9, 3); coinRow(g, 66, 8, 3);
  platform(g, 88, 10, 4); coinRow(g, 89, 9, 2);
  platform(g, 108, 9, 3); coinRow(g, 108, 8, 3);
  platform(g, 128, 11, 4);
  coinRow(g, 6, 13, 3); coinRow(g, 38, 13, 2); coinRow(g, 82, 13, 3); coinRow(g, 124, 13, 3);
  // Beide Erleichterungen, weil das Klima pendelt
  put(g, 14, 9, 'c'); put(g, 36, 13, 'w'); put(g, 70, 13, 'c'); put(g, 100, 13, 'w'); put(g, 130, 13, 'c');
  put(g, 67, 8, 'k'); put(g, 109, 8, 'k'); // zwei BahnCards
  // Signalstörungen / Gleisgefahren
  put(g, 28, SURFACE, '^'); put(g, 29, SURFACE, '^'); put(g, 62, SURFACE, '^'); put(g, 63, SURFACE, '^');
  put(g, 98, SURFACE, '^'); put(g, 99, SURFACE, '^');
  // Volles Programm: Koffer, Menschenmengen, Schienenersatzverkehr
  put(g, 20, SURFACE, 'x'); put(g, 54, SURFACE, 'x'); put(g, 86, SURFACE, 'x'); put(g, 122, SURFACE, 'x');
  put(g, 46, SURFACE, 'm'); put(g, 90, SURFACE, 'm'); put(g, 126, SURFACE, 'm');
  put(g, 72, SURFACE, 'v'); put(g, 114, SURFACE, 'v');
  put(g, 2, SURFACE, 'p');
  put(g, 146, SURFACE, 'G');
  return {
    id: 3,
    theme: 'mixed',
    name: 'Hauptbahnhof-Endspurt',
    subtitle: 'Verspätung, Überfüllung, Signalstörung, Schienenersatzverkehr – und das Klima dreht durch.',
    icon: '🎯',
    par: 70,
    map: toRows(g),
  };
}

export const LEVELS = [buildLevel1(), buildLevel2(), buildLevel3()];
