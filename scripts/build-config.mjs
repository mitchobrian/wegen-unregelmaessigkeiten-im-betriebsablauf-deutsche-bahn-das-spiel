/*
 * Erzeugt src/config.js aus Umgebungsvariablen (im CI aus GitHub-Secrets).
 * Sind keine Secrets gesetzt, wird eine Fallback-Konfiguration geschrieben,
 * sodass das Spiel im lokalen Bestenlisten-Modus läuft.
 *
 * Nutzung:  node scripts/build-config.mjs
 * Erwartet: SUPABASE_URL, SUPABASE_ANON_KEY (optional)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'src', 'config.js');

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || '').trim();
const online = url && key;

const payload = online
  ? { supabaseUrl: url, supabaseAnonKey: key }
  : null;

const banner = online
  ? '// Generiert von scripts/build-config.mjs – Online-Bestenliste aktiv.'
  : '// Generiert von scripts/build-config.mjs – keine Secrets gefunden, lokaler Fallback aktiv.';

const content = `${banner}\nwindow.DB_CONFIG = ${JSON.stringify(payload)};\n`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, content, 'utf8');

console.log(online
  ? `[build-config] Online-Konfiguration geschrieben -> ${outFile}`
  : `[build-config] Fallback-Konfiguration (lokal) geschrieben -> ${outFile}`);
