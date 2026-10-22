# Skat lernen – Browser-Spiel (PWA)

Lern-App für Skat: Regeln Schritt für Schritt, Übungen und Spielen gegen zwei Computer (Lena und Max) mit Lernhilfe, die jeden Zug erklärt. Läuft im Browser auf Handy und Rechner, ohne Server, ohne Konto, offline nach dem ersten Besuch.

## Benutzen
- **Online (Handy):** `https://vibedl.github.io/skat-lernen/` – nach dem Veröffentlichen (siehe unten). Auf dem iPhone: Teilen → „Zum Home-Bildschirm“; Android: „App installieren“.
- **Lokal:** Die Seite braucht einen kleinen Webserver (ES-Module laden nicht über `file://`):
  `python3 -m http.server 8921 --directory projects/skat-lernen` → http://127.0.0.1:8921 (in `.claude/launch.json` als `skat-lernen` eingetragen; dort wird aus einem Spiegel im Scratchpad serviert, weil der Vorschau-Prozess die externe Platte nicht lesen darf).

## Bereiche
1. **Lernen** – acht Kapitel: Karten und Augen · Tisch und Rollen · Spielarten und Trumpf · Bedienen und Stechen · Reizen (Spitzen, Grundwerte, Stufen) · Gewinnen und Abrechnen · Taktik-Tipps · Wörterbuch. Mit Mitmach-Beispielen (Augen tippen, Stichgewinner finden, Bedienen, Spitzen-Rechner).
2. **Üben** – Quiz à 10 Aufgaben je Thema (Augen, Trumpf, Stich, Bedienen, Spitzen, Reizwert, Spielwert, gemischt) mit Erklärung bei jeder Antwort; Bestleistung wird gespeichert.
3. **Spielen** – echtes Skat nach Skatordnung: Reizen, Skat aufnehmen oder Hand, Drücken, Farbe/Grand/Null (auch ouvert, Schneider/Schwarz ansagen), Bedienpflicht, Überreizen, Abrechnung mit Stufen-Rechnung. Lernhilfe (voll/wenig/keine): Rollen erklären, Reiz-Empfehlung, Spielwahl-Tabelle, erlaubte Karten markieren, Tipp mit Begründung, Zug zurück, Stich-Erklärung, Lehre nach dem Spiel. Gegnerstärke leicht/mittel/Profi (Profi rechnet per Monte-Carlo). Hausregeln Ramsch und Kontra/Re zuschaltbar.
4. **Liste** – fortlaufende Punkteliste (gewonnen +Spielwert, verloren −2 × Spielwert) mit Bilanz; „Neue Liste beginnen“.

## Aufbau
```
index.html, style.css          Oberfläche (mobil zuerst, dunkler Tisch)
js/app.js                      Navigation, Üben-Quiz, Liste, Einstellungen, Service-Worker-Registrierung
js/spiel.js                    Spieltisch mit Lernhilfe (Klasse SkatSpiel)
js/lernen.js                   Kapitel-Inhalte und Mitmach-Beispiele
js/aufgaben.js                 Übungsaufgaben (ohne DOM)
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
22.10.2026: v1 gebaut, lokal geprüft, noch nicht veröffentlicht (kein Repo angelegt).
