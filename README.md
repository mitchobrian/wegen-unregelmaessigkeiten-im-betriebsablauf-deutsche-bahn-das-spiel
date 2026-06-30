# 🚆 Wegen Unregelmäßigkeiten im Betriebsablauf – Das Spiel

Ein satirisches Super-Mario-Hommage-Jump'n'Run, in dem du es trotz **Hitze, Halt, Verspätung und Überfüllung** irgendwie zum Ziel schaffst. Pünktlichkeit nicht garantiert.

> ⚠️ **Disclaimer:** Dies ist ein **satirisches Fanprojekt** und steht in **keiner Verbindung zur Deutschen Bahn AG**. Es ist **keine offizielle DB-Anwendung**. Alle Marken gehören ihren jeweiligen Eigentümern. Das verwendete Wortzeichen („Deutsche Verspätungsbahn") sowie alle Inhalte sind Parodie im Sinne der Meinungs- und Kunstfreiheit.

## ✨ Features

- **Drei Level** mit je eigener Bahn-Plage:
  1. 🥵 **Sommerchaos im Regionalexpress** – die Klimaanlage ist defekt, die **Hitze** steigt.
  2. 🥶 **Winterfahrt ohne Heizung** – die Heizung ist ausgefallen, es wird **eisig kalt**.
  3. 🎯 **Hauptbahnhof-Endspurt** – Verspätung, Überfüllung, Signalstörung, Schienenersatzverkehr und ein pendelndes Klima.
- **DB-Plagen als Mechanik:** Temperatur-Meter (Hitze *und* Kälte), Überfüllung (bremst), Verspätungs-Counter.
- **Sammeln & überleben:** Entschädigungs-Euro, Eis/Ventilator, Kaffee/Glühwein, BahnCard (kurz unverwundbar).
- **Fortschritt im Browser** gespeichert (localStorage).
- **Bestenliste** mit Spielernamen – online (Supabase) oder lokal als Fallback.
- **Namens-Sperrliste** gegen unangebrachte Namen; doppelte Namen werden automatisch nummeriert.
- **Responsive** inkl. Touch-Steuerung, DB-inspiriertes Design.
- **Zero Dependencies:** reines HTML5-Canvas + ES-Module. Kein Build-Framework.

## 🎮 Steuerung

| Aktion | Taste |
| --- | --- |
| Laufen | `←` `→` / `A` `D` |
| Springen | `Leer` / `↑` / `W` |
| Pause | `P` / `Esc` |
| Mobil | Buttons am unteren Bildschirmrand |

## 🛠️ Lokal starten

Da es reine statische Dateien sind, genügt ein beliebiger Webserver (ES-Module brauchen `http://`, nicht `file://`):

```bash
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

Ohne Konfiguration läuft die Bestenliste automatisch im **lokalen Modus** (nur auf diesem Gerät).

## 🌐 Globale Bestenliste aktivieren (optional, einmalig)

GitHub Pages ist rein statisch – eine geteilte Bestenliste braucht ein kleines Backend. Wir nutzen **Supabase** (kostenloses Kontingent):

1. Auf [supabase.com](https://supabase.com) ein Projekt anlegen (**EU-Region** empfohlen, z. B. Frankfurt).
2. Im **SQL Editor** die Datei [`db/schema.sql`](db/schema.sql) ausführen (Tabelle `scores` + Row-Level-Security).
3. In den GitHub-Repo-Einstellungen unter **Settings → Secrets and variables → Actions** zwei Secrets anlegen:
   - `SUPABASE_URL` – z. B. `https://xxxxxxxx.supabase.co`
   - `SUPABASE_ANON_KEY` – der **public anon key** (durch RLS abgesichert, darf im Frontend stehen)
4. Auf `main` pushen → die Pipeline generiert `src/config.js` aus den Secrets und schaltet die Online-Bestenliste scharf.

> 🔐 `src/config.js` ist in `.gitignore` – es landet **nie ein Secret im Repo**. Lokal kannst du `config.example.js` nach `src/config.js` kopieren und eigene Werte eintragen.

## 🔄 CI/CD

Bei jedem Commit auf `main` rollt [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) das Spiel automatisch auf GitHub Pages aus: Config generieren → JS-Syntax prüfen → statische Site bündeln → deployen.

## 🧱 Projektstruktur

```
index.html            Einstieg + UI-Overlays
style.css             DB-Corporate-Look
src/
  main.js             Screen-State-Machine
  engine.js           Game-Loop, Physik, Kollision, Scoring
  player.js           Spielfigur
  level.js            Tilemap + Rendering
  levels.js           3 Level (per Builder erzeugt)
  entities.js         Collectibles + Gegner
  hazards.js          Temperatur/Überfüllung/Verspätung
  hud.js              HUD
  audio.js            WebAudio-Effekte
  storage.js          Fortschritt (localStorage)
  leaderboard.js      Supabase + lokaler Fallback
  blacklist.js        Namensprüfung
db/schema.sql         Supabase-Schema + RLS
scripts/build-config.mjs   Config aus Secrets
.github/workflows/deploy.yml   Pages-Deploy
ARTIKEL.md            Making-of-Artikel (t3n)
```

## 🔒 Datenschutz

Gespeichert werden ausschließlich **selbstgewählter Spitzname + Punktzahl + Levelnummer** – keine personenbezogenen Daten, keine IP-Adressen, kein Tracking. Bitte keinen Klarnamen verwenden. Im lokalen Modus verlassen die Daten dein Gerät nicht.

## 📰 Making-of

Wie dieses Spiel (und dieser Artikel) mit einem einzigen Prompt von einer KI entstanden sind, inkl. Token- und Kostenrechnung: siehe [`ARTIKEL.md`](ARTIKEL.md).

## 📄 Lizenz

[MIT](LICENSE) © 2026 Michael Palmer
