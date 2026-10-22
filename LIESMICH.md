# Skat lernen – Browser-Spiel (PWA)

Lern-App für Skat: Regeln Schritt für Schritt, Übungen und Spielen gegen zwei Computer (Lena und Max) mit Lernhilfe, die jeden Zug erklärt. Läuft im Browser auf Handy und Rechner, ohne Server, ohne Konto, offline nach dem ersten Besuch.

## Benutzen
- **Online (Handy):** https://vibedl.github.io/skat-lernen/ (seit 22.10.2026). Auf dem iPhone: Teilen → „Zum Home-Bildschirm“; Android: „App installieren“.
- **Lokal:** Die Seite braucht einen kleinen Webserver (ES-Module laden nicht über `file://`):
  `python3 -m http.server 8921 --directory projects/skat-lernen` → http://127.0.0.1:8921 (in `.claude/launch.json` als `skat-lernen` eingetragen; dort wird aus einem Spiegel im Scratchpad serviert, weil der Vorschau-Prozess die externe Platte nicht lesen darf).

## Bereiche
1. **Lernen** – acht Kapitel: Karten und Augen · **Was ist Trumpf? Die drei Spielarten** (ausführlich und ganz einfach: Chef-Farbe, Buben wandern zum Trumpf, Farbspiel/Grand/Null Schritt für Schritt, „Tippe alle Trümpfe an“, Abschlusstest) · Tisch und Rollen · Bedienen und Stechen · Reizen (Spitzen, Grundwerte, Stufen) · Gewinnen und Abrechnen · Taktik-Tipps · Wörterbuch. Mit Mitmach-Beispielen (Augen tippen, Stichgewinner finden, Bedienen, Spitzen-Rechner).
2. **Üben** – Quiz à 10 Aufgaben je Thema (Augen, Trumpf, Stich, Bedienen, Spitzen, Reizwert, Spielwert, gemischt) mit Erklärung bei jeder Antwort; Bestleistung wird gespeichert.
3. **Spielen** – echtes Skat nach Skatordnung: Reizen, Skat aufnehmen oder Hand, Drücken, Farbe/Grand/Null (auch ouvert, Schneider/Schwarz ansagen), Bedienpflicht, Überreizen, Abrechnung mit Stufen-Rechnung. Lernhilfe (voll/wenig/keine): Rollen erklären, Reiz-Empfehlung, Spielwahl-Tabelle, erlaubte Karten markieren, Tipp mit Begründung, Zug zurück, Stich-Erklärung, Lehre nach dem Spiel. Gegnerstärke leicht/mittel/Profi (Profi rechnet per Monte-Carlo). Hausregeln Ramsch und Kontra/Re zuschaltbar.
4. **Erfolge** – Rang (Kiebitz → Anfänger → Skatfreund → Vereinsspieler → Skatmeister → Altmeister, über Erfahrungspunkte aus Kapiteln, Übungen und Spielen), zwölf Abzeichen (erster Sieg, Schneider, Grand, Null, Hand, Verteidiger, 10/10, Lauf, alles gelesen, Stammgast, „Der Alte“), Punkteliste als Kreidetafel mit Bilanz.

**Optik und Spielgefühl (22.10.2026, zweite Fassung):** Skatabend in der Kneipe – grüner Filz mit Lichtkegel, Holzleiste, Messing-Knöpfe, Notizzettel für die Lernhilfe, Kreidetafel für Abrechnung und Liste; Schriften Fraunces/Nunito/Caveat (Google Fonts, mit Rückfall). Lena und Max als gezeichnete Gesichter (SVG in `js/spass.js`) mit Stimmung und Sprechblasen; Karten werden ausgeteilt, fliegen in den Stich und werden eingesammelt; Hand als Fächer; Konfetti bei Sieg und 10/10; Töne per WebAudio (abschaltbar).

## Aufbau
```
index.html, style.css          Oberfläche (mobil zuerst, dunkler Tisch)
js/app.js                      Navigation, Üben-Quiz, Liste, Einstellungen, Service-Worker-Registrierung
js/spiel.js                    Spieltisch mit Lernhilfe (Klasse SkatSpiel)
js/lernen.js                   Kapitel-Inhalte und Mitmach-Beispiele
js/aufgaben.js                 Übungsaufgaben (ohne DOM)
js/spass.js                    Töne, Konfetti, Ränge/Erfahrung, Abzeichen, Gesichter, Sprechblasen
js/skatregeln.js, js/skatki.js Regeln und Computerspieler – übernommen aus projects/hirntraining (Kopf-Fit), unverändert
js/engine.js, js/deck.js, js/ui.js  Karten, Zufall, DOM-Helfer
manifest.webmanifest, sw.js, icon*.png  PWA (offline, Home-Bildschirm)
veroeffentlichen.sh            nach GitHub Pages (eigenes öffentliches Repo vibedl/skat-lernen)
```
Regeln/KI sind dieselben Module wie in Kopf-Fit (Regel „beste bestehende Fassung als Basis“). Änderungen an den Regeln bitte in beiden Projekten nachziehen oder hier zurückkopieren.

## Veröffentlichen (nur auf Auftrag)
```bash
./projects/skat-lernen/veroeffentlichen.sh "Was sich geändert hat"
```
Legt beim ersten Mal das öffentliche Repo `vibedl/skat-lernen` an, schaltet GitHub Pages ein und pusht; danach aktualisiert es nur. **Vorher `VERSION` in `sw.js` erhöhen**, sonst behalten installierte Handys die alte Fassung bis zum zweiten Start.

## Prüfen
- `node scratch/smoke.mjs`-Äquivalent: 300 simulierte Partien (Augen immer 120) und 600 Aufgaben – siehe Journal 22.10.2026.
- Im Browser (375 px): Kapitel, Spieltisch (Reizen, Drücken, Spiel, Abrechnung) per Auto-Durchlauf, Übungen.

## Stand
22.10.2026: v4 – Abrechnung mit „Warum verloren?“ (überreizt, Schneider/Schwarz angesagt, Ouvert = Schwarz angesagt), Ansage-Knöpfe mit Folgen beschriftet, Überreiz-Warnung schärfer; Anlass: Nutzer verlor mit 93 Augen und verstand nicht warum (Engine geprüft: 1942 Simulationen, kein Verlust mit ≥ 61 Augen ohne Überreizen/Ansage). Davor v3 – Kapitel „Spielarten“ neu geschrieben (Nutzer: „für dumme Menschen erklärt“, an zweiter Stelle) und veröffentlicht; davor v2 (neue Optik, Belohnungen) veröffentlicht; davor v1 gebaut, lokal geprüft und veröffentlicht: öffentliches Repo https://github.com/vibedl/skat-lernen, App unter https://vibedl.github.io/skat-lernen/ (Pages aus `main`, Wurzel).
