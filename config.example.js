/*
 * Vorlage für die Laufzeit-Konfiguration.
 *
 * Im Deployment wird daraus `src/config.js` erzeugt (siehe scripts/build-config.mjs),
 * gefüllt aus den GitHub-Secrets SUPABASE_URL und SUPABASE_ANON_KEY.
 *
 * Lokal kannst du diese Datei nach `src/config.js` kopieren und Werte eintragen,
 * um die Online-Bestenliste zu testen. Ohne gültige Werte läuft das Spiel
 * automatisch im lokalen Bestenlisten-Modus (localStorage).
 *
 * WICHTIG: src/config.js ist in .gitignore – niemals echte Werte committen.
 * Der anon-Key ist designgemäß öffentlich (durch Row-Level-Security geschützt),
 * trotzdem halten wir ihn aus der Versionsverwaltung heraus.
 */
window.DB_CONFIG = {
  supabaseUrl: "", // z. B. "https://xxxxxxxx.supabase.co"
  supabaseAnonKey: "", // public anon key
};
