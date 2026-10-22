// Offline-Unterstützung: alle App-Dateien werden beim ersten Besuch gespeichert.
// Bei jeder Änderung an Dateien VERSION erhöhen, damit Geräte die neue Fassung laden.
const VERSION = "skat-lernen-v3";
const DATEIEN = [
  "./", "index.html", "style.css", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png",
  "js/app.js", "js/ui.js", "js/engine.js", "js/deck.js", "js/skatregeln.js", "js/skatki.js",
  "js/aufgaben.js", "js/lernen.js", "js/spiel.js", "js/spass.js",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Netz zuerst (immer die neueste Fassung), Cache nur ohne Verbindung.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((antwort) => {
      if (antwort && antwort.ok) {
        const kopie = antwort.clone();
        caches.open(VERSION).then((c) => c.put(e.request, kopie));
      }
      return antwort;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
