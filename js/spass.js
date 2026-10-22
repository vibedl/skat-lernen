// Spaß-Bausteine: Töne (WebAudio, ohne Dateien), Konfetti, Ränge/Erfahrung, Abzeichen, Gesichter, Sprechblasen.
import { h, speicher } from "./ui.js";

/* ================================================================ Töne */
let ctx = null;
let tonAn = speicher.lies("ton", true);
export const setzeTon = (an) => { tonAn = an; speicher.schreib("ton", an); };
export const istTonAn = () => tonAn;
function audio() {
  if (!tonAn) return null;
  try { ctx ??= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; } catch { return null; }
}
function ton(freq, { dauer = 0.12, typ = "sine", laut = 0.18, start = 0, abfall = true } = {}) {
  const c = audio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = typ; o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(laut, t + 0.01);
  if (abfall) g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dauer + 0.02);
}
export const klang = {
  karte() { ton(180, { dauer: 0.06, typ: "triangle", laut: 0.12 }); ton(900, { dauer: 0.03, typ: "square", laut: 0.03 }); },
  tipp() { ton(660, { dauer: 0.08 }); },
  stich(gewonnen) { if (gewonnen) { ton(523, { dauer: 0.1 }); ton(784, { dauer: 0.16, start: 0.08 }); } else ton(220, { dauer: 0.14, typ: "triangle", laut: 0.1 }); },
  richtig() { ton(659, { dauer: 0.1 }); ton(988, { dauer: 0.18, start: 0.09 }); },
  falsch() { ton(196, { dauer: 0.2, typ: "sawtooth", laut: 0.06 }); ton(165, { dauer: 0.25, typ: "sawtooth", laut: 0.06, start: 0.12 }); },
  sieg() { [523, 659, 784, 1047].forEach((f, i) => ton(f, { dauer: 0.25, start: i * 0.11, laut: 0.16 })); ton(1319, { dauer: 0.5, start: 0.45, laut: 0.14 }); },
  niederlage() { ton(330, { dauer: 0.3, typ: "triangle" }); ton(262, { dauer: 0.5, start: 0.25, typ: "triangle" }); },
  abzeichen() { [880, 1109, 1319, 1760].forEach((f, i) => ton(f, { dauer: 0.2, start: i * 0.07, laut: 0.12 })); },
  reiz() { ton(440, { dauer: 0.07, typ: "triangle", laut: 0.08 }); },
};

/* ================================================================ Konfetti */
export function konfetti({ dauer = 2200, anzahl = 120 } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = h("canvas.konfetti");
  document.body.append(c);
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const g = c.getContext("2d"); g.scale(dpr, dpr);
  const farben = ["#e5b84a", "#c8321f", "#1f5fb0", "#f3eee2", "#7cc27e", "#f28c28"];
  const teile = Array.from({ length: anzahl }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.5, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: 4 + Math.random() * 5, w: Math.random() * Math.PI, dw: (Math.random() - 0.5) * 0.3, f: farben[Math.floor(Math.random() * farben.length)],
  }));
  const start = performance.now();
  const lauf = (t) => {
    const el = t - start;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of teile) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.w += p.dw;
      g.save(); g.translate(p.x, p.y); g.rotate(p.w); g.fillStyle = p.f; g.globalAlpha = Math.max(0, 1 - el / dauer);
      g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore();
    }
    if (el < dauer) requestAnimationFrame(lauf); else c.remove();
  };
  requestAnimationFrame(lauf);
}

/* ================================================================ Erfahrung, Ränge, Abzeichen */
export const RAENGE = [
  { ab: 0, name: "Kiebitz", text: "Schaut noch zu – aber nicht mehr lange." },
  { ab: 120, name: "Anfänger", text: "Kennt die Karten und die Augen." },
  { ab: 350, name: "Skatfreund", text: "Reizt mit und bedient richtig." },
  { ab: 800, name: "Vereinsspieler", text: "Zählt Spitzen im Kopf." },
  { ab: 1600, name: "Skatmeister", text: "Spielt Grand mit zwei Buben." },
  { ab: 3200, name: "Altmeister", text: "Die Legende vom Stammtisch." },
];
export const ABZEICHEN = [
  { id: "erstes-spiel", name: "Erstes Spiel", icon: "🃏", text: "Ein Spiel bis zur Abrechnung gespielt." },
  { id: "erster-sieg", name: "Erster Sieg", icon: "🏆", text: "Als Alleinspieler gewonnen." },
  { id: "verteidiger", name: "Verteidiger", icon: "🛡️", text: "Fünfmal den Alleinspieler besiegt." },
  { id: "schneider", name: "Schneider!", icon: "✂️", text: "Ein Spiel mit 90 Augen oder mehr gewonnen." },
  { id: "grand", name: "Grandios", icon: "👑", text: "Einen Grand gewonnen." },
  { id: "null", name: "Null problemo", icon: "🫥", text: "Ein Nullspiel gewonnen." },
  { id: "hand", name: "Aus der Hand", icon: "✋", text: "Ein Handspiel gewonnen." },
  { id: "zehn-von-zehn", name: "Zehn von zehn", icon: "🎯", text: "Eine Übung fehlerfrei." },
  { id: "serie", name: "Lauf", icon: "🔥", text: "Zehn Übungsaufgaben in Folge richtig." },
  { id: "leseratte", name: "Alles gelesen", icon: "📖", text: "Alle acht Kapitel geöffnet." },
  { id: "stammgast", name: "Stammgast", icon: "🍺", text: "Zwanzig Spiele gespielt." },
  { id: "der-alte", name: "Der Alte", icon: "♣️", text: "Mit vier Buben auf der Hand gespielt." },
];

export function fortschritt() {
  return speicher.lies("fortschritt", { xp: 0, abzeichen: [], zaehler: {} });
}
function speichere(f) { speicher.schreib("fortschritt", f); }
export function rang(xp = fortschritt().xp) {
  let r = RAENGE[0], naechster = RAENGE[1];
  for (let i = 0; i < RAENGE.length; i++) if (xp >= RAENGE[i].ab) { r = RAENGE[i]; naechster = RAENGE[i + 1] ?? null; }
  const anteil = naechster ? (xp - r.ab) / (naechster.ab - r.ab) : 1;
  return { ...r, xp, naechster, anteil };
}
const hoerer = new Set();
export const aufFortschritt = (fn) => hoerer.add(fn);
function melde(ereignis) { for (const fn of hoerer) fn(ereignis); }

/** Erfahrung gutschreiben. Gibt {xp, aufgestiegen: Rang|null} zurück. */
export function gibXp(punkte, grund = "") {
  const f = fortschritt();
  const vorher = rang(f.xp).name;
  f.xp += Math.max(0, Math.round(punkte));
  speichere(f);
  const nachher = rang(f.xp);
  const aufgestiegen = nachher.name !== vorher ? nachher : null;
  melde({ typ: "xp", punkte, grund, aufgestiegen });
  return { xp: f.xp, aufgestiegen };
}
/** Zähler erhöhen (z. B. "spiele", "verteidigt"). */
export function zaehle(key, um = 1) {
  const f = fortschritt();
  f.zaehler[key] = (f.zaehler[key] ?? 0) + um;
  speichere(f);
  return f.zaehler[key];
}
export const zaehler = (key) => fortschritt().zaehler[key] ?? 0;
/** Abzeichen verleihen (einmalig). Gibt das Abzeichen zurück, wenn neu. */
export function verleihe(id) {
  const f = fortschritt();
  if (f.abzeichen.includes(id)) return null;
  const a = ABZEICHEN.find((x) => x.id === id);
  if (!a) return null;
  f.abzeichen.push(id); f.xp += 50; speichere(f);
  melde({ typ: "abzeichen", abzeichen: a });
  return a;
}
export const hatAbzeichen = (id) => fortschritt().abzeichen.includes(id);

/** Abzeichen-Einblendung oben. */
export function zeigeAbzeichen(a) {
  klang.abzeichen();
  const el = h("div.abzeichen-toast", {}, h("span.ab-icon", { text: a.icon }), h("div", {}, h("b", { text: `Abzeichen: ${a.name}` }), h("span", { text: a.text })));
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("sichtbar"));
  setTimeout(() => { el.classList.remove("sichtbar"); setTimeout(() => el.remove(), 400); }, 3200);
}
export function zeigeAufstieg(r) {
  konfetti({ anzahl: 160 });
  const el = h("div.abzeichen-toast.aufstieg", {}, h("span.ab-icon", { text: "⭐" }), h("div", {}, h("b", { text: `Neuer Rang: ${r.name}` }), h("span", { text: r.text })));
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("sichtbar"));
  setTimeout(() => { el.classList.remove("sichtbar"); setTimeout(() => el.remove(), 400); }, 3600);
}

/* ================================================================ Gesichter und Sprechblasen */
/** Einfaches, freundliches Gesicht als SVG. laune: "neutral" | "froh" | "sauer" | "denkt" | "stolz" */
export function gesicht(wer, laune = "neutral") {
  const lena = wer === "Lena";
  const haut = lena ? "#f1c9a5" : "#e0b48c";
  const haar = lena ? "#6b3a1f" : "#2b2b2b";
  const mund = { neutral: "M30 44 q10 3 20 0", froh: "M28 42 q12 12 24 0", sauer: "M29 48 q11 -8 22 0", denkt: "M31 45 h16", stolz: "M28 43 q12 9 24 0" }[laune] ?? "M30 44 q10 3 20 0";
  const augen = laune === "froh" || laune === "stolz" ? '<path d="M27 33 q4 -5 8 0 M45 33 q4 -5 8 0" stroke="#222" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    : laune === "sauer" ? '<path d="M25 29 l10 4 M55 29 l-10 4" stroke="#222" stroke-width="2.4" stroke-linecap="round"/><circle cx="31" cy="36" r="2.4" fill="#222"/><circle cx="49" cy="36" r="2.4" fill="#222"/>'
    : laune === "denkt" ? '<circle cx="31" cy="34" r="2.4" fill="#222"/><circle cx="49" cy="34" r="2.4" fill="#222"/><path d="M26 25 l10 2" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>'
    : '<circle cx="31" cy="35" r="2.6" fill="#222"/><circle cx="49" cy="35" r="2.6" fill="#222"/>';
  const frisur = lena
    ? `<path d="M18 40 q-4 -30 22 -30 q26 0 22 30 l-4 -2 q2 -20 -18 -20 q-20 0 -18 20z" fill="${haar}"/><path d="M16 42 q-2 20 8 30 M64 42 q2 20 -8 30" stroke="${haar}" stroke-width="7" stroke-linecap="round" fill="none"/>`
    : `<path d="M19 36 q0 -24 21 -24 q21 0 21 24 l-5 2 q0 -16 -16 -16 q-16 0 -16 16z" fill="${haar}"/><path d="M28 54 q12 10 24 0" stroke="${haar}" stroke-width="0" fill="none"/>`;
  const extra = lena ? '<circle cx="24" cy="44" r="3" fill="#e5b84a"/><circle cx="56" cy="44" r="3" fill="#e5b84a"/>' : '<path d="M30 52 q10 6 20 0 l0 4 q-10 6 -20 0z" fill="#2b2b2b"/>';
  return h("span.gesicht", { html: `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="38" fill="${lena ? "#8fc1a6" : "#9fb3d9"}"/><path d="M14 80 q26 -28 52 0z" fill="${lena ? "#c8321f" : "#1f5fb0"}"/><ellipse cx="40" cy="42" rx="22" ry="25" fill="${haut}"/>${frisur}${augen}<path d="${mund}" stroke="#7a2e1e" stroke-width="2.4" fill="none" stroke-linecap="round"/>${extra}</svg>` });
}

/** Sprechblase an ein Element hängen (kurz sichtbar). */
export function sprechblase(an, text, { ms = 1800, klasse = "" } = {}) {
  an.querySelectorAll(".blase").forEach((b) => b.remove());
  const b = h(`div.blase${klasse ? "." + klasse : ""}`, { text });
  an.append(b);
  requestAnimationFrame(() => b.classList.add("sichtbar"));
  if (ms > 0) setTimeout(() => { b.classList.remove("sichtbar"); setTimeout(() => b.remove(), 250); }, ms);
  return b;
}

/** Zufälliger Spruch für eine Situation. */
const SPRUECHE = {
  passe: ["Passe.", "Weg.", "Nee, nicht mit dem Blatt.", "Passe – spiel du."],
  ja: ["Ja!", "Ja, hab ich.", "Mhm, ja."],
  stichGewonnen: ["Hab ich!", "Meiner.", "Danke schön!", "Das nehm ich."],
  stichVerloren: ["Mist.", "Hm.", "Na gut.", "Oha."],
  schmieren: ["Für dich!", "Da, nimm."],
  spielGewonnen: ["Jawoll!", "Das war meins.", "Gewonnen!"],
  spielVerloren: ["Verflixt.", "Zu hoch gepokert.", "Nächstes Mal."],
  gegnerVerloren: ["Gut gespielt!", "Du wirst besser.", "Respekt."],
  denkt: ["Hmm …", "Moment …", "Mal sehen …"],
};
export const spruch = (art) => { const a = SPRUECHE[art] ?? ["…"]; return a[Math.floor(Math.random() * a.length)]; };
