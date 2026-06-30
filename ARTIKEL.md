# „Wegen Unregelmäßigkeiten im Betriebsablauf": Wie eine KI in einem einzigen Prompt ein Bahn-Satire-Jump'n'Run baute – inklusive Kostenrechnung

*Ein Werkstattbericht über Vibe-Coding, Markenrecht, DSGVO und die Frage, was so ein Spiel eigentlich an Tokens und Euro kostet.*

---

Manche Projekte beginnen mit einem Lastenheft, einem Kickoff-Meeting und drei Wochen Konzeptphase. Dieses hier begann mit einem einzigen Absatz, getippt in ein Chatfenster:

> „Wir programmieren ein Spiel im Super-Mario-Stil, welches die Deutsche Bahn auf die Schippe nimmt. Das Spiel soll die Probleme der Bahn thematisieren (zu spät, zu voll, defekte Klimatisierung etc.). [...] Es soll direkt auf GitHub als Open-Source-Projekt gehostet werden (GitHub Pages). Das Spiel soll 3 Level haben und den Fortschritt im Browser speichern. Man soll vorab einen Spielernamen (für eine Bestenliste) eingeben (Blacklist für unangebrachte Namen implementieren). [...] Schreibe zudem einen ansprechenden Artikel über die einfache Erstellung der gesamten Applikation."

Heraus kam **„Wegen Unregelmäßigkeiten im Betriebsablauf – Das Spiel"**: ein lauffähiges Browser-Jump'n'Run mit drei Leveln, Online-Bestenliste, Namensfilter, DB-Look – und automatischem Deployment per CI/CD. Und dieser Artikel, den die KI über sich selbst geschrieben hat. Höchste Zeit, hinter die Kulissen zu schauen.

## Erst denken, dann tippen

Bemerkenswert war weniger *dass* die KI loslegte, sondern *wie*. Statt sofort Code zu produzieren, durchlief sie eine Planungsphase: Sie erkundete das (leere) Repository, stellte vier gezielte Rückfragen und legte erst dann los. Die Fragen saßen:

1. **Technologie-Stack?** Empfehlung und Wahl: pures HTML5-Canvas mit Vanilla JavaScript – keine Frameworks, kein Build-Tool. Begründung: GitHub Pages ist statisch, und „null Dependencies" passt am besten zur Geschichte einer einfachen Erstellung.
2. **Bestenliste lokal oder geteilt?** Hier wurde es interessant: Eine *echte*, geräteübergreifende Rangliste braucht ein Backend – das gibt es auf reinen statischen Seiten nicht. Die KI schlug **Supabase** vor (Postgres + REST, öffentlicher anon-Key, abgesichert per Row-Level-Security) und baute zugleich einen **localStorage-Fallback** ein, damit das Spiel auch ohne Backend sofort spielbar ist.
3. **Kostenangaben im Artikel?** Transparente Schätzwerte statt erfundener Präzision (dazu unten mehr).
4. **GitHub-Deployment?** Repo war vorhanden, die KI durfte selbst committen und pushen.

Das ist der eigentliche Trick beim „Vibe Coding" mit aktuellen Modellen: Die Qualität entsteht nicht im ersten Token, sondern in der Bereitschaft, vor dem Schreiben die richtigen Entscheidungen zu treffen – und Unklarheiten mit dem Menschen zu klären, statt sie zu raten.

## Was die KI berücksichtigt hat (und was man leicht übersieht)

Spannend ist, was alles *nicht* im Prompt stand, aber trotzdem bedacht wurde:

**Markenrecht statt Ärger.** Die Deutsche Bahn ist eine eingetragene Marke, ihr Logo geschützt. Statt es nachzubauen, entstand ein parodistisches Wortzeichen – die „Deutsche Verspätungsbahn" – in DB-typischen Farben (Verkehrsrot `#EC0016`, Weiß, Verkehrsgrau), aber ohne Original-Logo und ohne die proprietäre Hausschrift „DB Sans". Auf Start­bildschirm *und* in der Fußzeile prangt ein deutlich sichtbarer Hinweis: **satirisches Fanprojekt, keine offizielle DB-Anwendung, keine Verbindung zur Deutschen Bahn AG.** Parodie ist von der Kunst- und Meinungsfreiheit gedeckt – Trittbrettfahren auf einer fremden Marke nicht.

**DSGVO mitgedacht.** Eine Online-Bestenliste mit Namen ist datenschutzrechtlich kein Nullum. Gespeichert werden ausschließlich ein selbstgewählter Spitzname plus Punktzahl – keine IP, kein Tracking, keine Klarnamen. Ein expliziter Datenschutzhinweis empfiehlt nicht-identifizierende Namen, und das empfohlene Supabase-Projekt liegt in der EU-Region.

**Missbrauchsschutz.** Die geforderte Blacklist filtert nicht naiv per Stichwortliste, sondern **normalisiert** Eingaben zuerst (Kleinschreibung, Leetspeak `N3ger` → `neger`, entfernte Sonder- und Leerzeichen `f u c k`), um gängige Umgehungstricks zu erschweren. Doppelte Namen werden automatisch durchnummeriert (`Max`, `Max2`, `Max3` …).

**Keine Secrets im Repo.** Der Supabase-Schlüssel ist zwar designgemäß öffentlich, wird aber trotzdem nicht eingecheckt: Eine GitHub-Action generiert die Konfigurationsdatei zur Build-Zeit aus Repository-Secrets. Fehlen sie, fällt das Spiel sauber in den lokalen Modus zurück.

## Wie das Spiel die Bahn auf die Schippe nimmt

Die DB-Plagen wurden zu Spielmechaniken übersetzt:

- **Temperatur** – und zwar ausdrücklich in beide Richtungen: In Level 1 („Sommerchaos im Regionalexpress") ist die Klimaanlage defekt, ein **Hitze-Meter** steigt; Eis und Ventilatoren kühlen. In Level 2 („Winterfahrt ohne Heizung") ist die Heizung ausgefallen, ein **Kälte-Meter** klettert; Kaffee und Glühwein wärmen. Läuft der Balken voll, kostet das ein Leben.
- **Verspätung** – ein stetig wachsender Counter („+12 Min") drückt auf den Score.
- **Überfüllung** – Menschenmengen als bewegliche Hindernisse bremsen die Spielfigur um bis zu 45 Prozent.
- **Signalstörung, Baustelle, Schienenersatzverkehr** – das große Finale in Level 3 („Hauptbahnhof-Endspurt") wirft alles zusammen, inklusive eines herrenlosen Koffers und des gefürchteten SEV-Busses.

Technisch steckt darunter eine kompakte, selbstgebaute 2D-Engine: feste Physik-Schrittweite für stabile Sprünge, achsenweise Kollisionsauflösung, Kamera-Scrolling, „Coyote Time" für faire Sprünge an Kanten – alles in wenigen hundert Zeilen Vanilla-JavaScript, ohne eine einzige externe Bibliothek.

## Getestet, nicht nur gehofft

Bemerkenswert für einen „One-Prompt"-Build: Die KI hat ihren Code nicht nur geschrieben, sondern auch **verifiziert**. Sie startete einen lokalen Webserver, lud das Spiel in einen headless laufenden Chrome und prüfte per Skript die Physik – Laufweg, Sprunghöhe, Gegner-Kollision mit Lebensverlust, Ziel-Erkennung, Temperatur-Anstieg und Überfüllungs-Bremse. Erst als Engine und Spiellogik nachweislich funktionierten, ging es weiter. Ein Screenshot bestätigte zusätzlich, dass die Grafik tatsächlich rendert.

## Und die CI/CD?

Bei jedem Commit auf `main` läuft ein GitHub-Actions-Workflow: Konfiguration aus Secrets generieren → JS-Syntax prüfen → statische Seite bündeln → auf GitHub Pages deployen. Der Workflow aktiviert Pages bei Bedarf selbst. Push genügt – Sekunden später ist die neue Version live.

## Die Gretchenfrage: Was kostet so etwas?

Hier wird oft geschwiegen oder geraten. Also rechnen wir offen – mit dem ausdrücklichen Hinweis: **Es sind Schätzungen in der richtigen Größenordnung, keine centgenaue Abrechnung.** Grundlage sind die aktuellen Preise für das verwendete Modell **Claude Opus 4.8**:

| Posten | Preis pro 1 Mio. Tokens |
| --- | --- |
| Eingabe (Input) | 5,00 $ |
| Ausgabe (Output) | 25,00 $ |
| Cache-Lesen (Prompt Caching) | ~0,50 $ (0,1×) |
| Cache-Schreiben | ~6,25 $ (1,25×) |

Der Clou: In einer langen Coding-Session wird der wachsende Kontext bei *jeder* Anfrage erneut mitgeschickt. Ohne Prompt Caching würde das richtig teuer. Mit Caching werden die immer gleichen Anteile (System-Prompt, bereits geschriebene Dateien) zum Bruchteil des Preises erneut gelesen.

Grobe Abschätzung für dieses Projekt:

| Posten | Menge (geschätzt) | Kosten |
| --- | --- | --- |
| Eingabe – frisch | ~0,5 Mio. Tokens | ~2,50 $ |
| Eingabe – Cache-Lesen | ~2,0 Mio. Tokens | ~1,00 $ |
| Ausgabe (Code + Artikel + Reasoning) | ~0,12 Mio. Tokens | ~3,00 $ |
| **Summe** | **~2,6 Mio. Tokens** | **≈ 6,50 $ (rund 6 €)** |

In Worten: **Ein komplettes, getestetes Open-Source-Spiel inklusive Backend-Anbindung, CI/CD und diesem Artikel – für ungefähr den Preis eines belegten Brötchens und eines Kaffees am Bahnhofskiosk.** (Der Kaffee ist im Spiel übrigens ein Power-up gegen Kälte.) Die tatsächlichen Kosten schwanken je nach Anzahl der Iterationen und Caching-Trefferquote; realistisch bewegen sie sich im Bereich **5 bis 8 Euro**.

## Was bleibt

Drei Beobachtungen nimmt man aus diesem Experiment mit:

1. **Der Prompt war simpel, das Ergebnis nicht.** Die eigentliche Arbeit – Stack-Wahl, Markenrecht, DSGVO, Missbrauchsschutz, Fallback-Strategie, Tests – hat die KI weitgehend selbst strukturiert. Gute Ergebnisse entstehen, wenn man dem Modell erlaubt, vor dem Coden zu *planen* und Rückfragen zu stellen.
2. **„Statisch" ist kein Hindernis, sondern eine Designentscheidung.** Die Spannung zwischen „GitHub Pages, kein Server" und „geteilte Bestenliste" wurde nicht ignoriert, sondern sauber gelöst – mit einem externen Dienst plus Fallback.
3. **Die Kosten sind erstaunlich niedrig** – vorausgesetzt, die Werkzeuge nutzen Prompt Caching konsequent.

Wer es selbst ausprobieren will: Das Projekt liegt vollständig quelloffen auf GitHub. Pünktlichkeit nicht garantiert. 🚆

---

*Disclaimer: Dieses Spiel ist ein satirisches Fanprojekt und steht in keiner Verbindung zur Deutschen Bahn AG. Es ist keine offizielle DB-Anwendung. Alle Marken gehören ihren jeweiligen Eigentümern. Die Kostenangaben sind transparente Schätzungen auf Basis der genannten Modellpreise und keine verbindliche Abrechnung.*
