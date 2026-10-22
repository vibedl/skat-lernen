// Übungsaufgaben für die Skat-Schule – reine Logik ohne DOM.
// Typen: augen1 · augenSumme · trumpf · stich · bedienen · spitzen · reizwert · spielwert · nullStich
import { neuesDeck, kartenName } from "./deck.js";
import {
  augen, augenSumme, istTrumpf, stichSieger, legaleKarten, spitzen, spielwert, neuesSpielObjekt,
  sortiereSkatHand, spielName, farbNameSkat, bedienFarbe,
} from "./skatregeln.js";
import { FARBEN, RANG } from "./engine.js";

export const THEMEN = [
  { id: "augen", titel: "Augen zählen", text: "Ass 11, Zehn 10, König 4, Dame 3, Bube 2 – und zusammenrechnen.", typen: ["augen1", "augenSumme"] },
  { id: "trumpf", titel: "Trumpf erkennen", text: "Welche Karten sind Trumpf – im Farbspiel, im Grand, im Null?", typen: ["trumpf"] },
  { id: "stich", titel: "Wer gewinnt den Stich?", text: "Rangfolgen anwenden: Buben, Trumpffarbe, Null-Reihenfolge.", typen: ["stich"] },
  { id: "bedienen", titel: "Richtig bedienen", text: "Welche Karte darfst du legen? Buben gehören zum Trumpf!", typen: ["bedienen"] },
  { id: "spitzen", titel: "Spitzen zählen", text: "Mit oder ohne wie viele Spitzen spielst du?", typen: ["spitzen"] },
  { id: "reizwert", titel: "Reizen", text: "Bis zu welchem Wert darfst du mit diesem Blatt reizen?", typen: ["reizwert"] },
  { id: "spielwert", titel: "Spielwert rechnen", text: "Spitzen, Spiel, Hand, Schneider, Schwarz – mal Grundwert.", typen: ["spielwert"] },
  { id: "alles", titel: "Gemischt", text: "Alles durcheinander – wie am Skattisch.", typen: ["augenSumme", "trumpf", "stich", "bedienen", "spitzen", "reizwert", "spielwert"] },
];

const zufall = (n, rng) => Math.floor(rng() * n);
const waehle = (arr, rng) => arr[zufall(arr.length, rng)];

function zufallsSpiel(rng, { nullErlaubt = true } = {}) {
  const r = rng();
  if (r < 0.6) return neuesSpielObjekt("farbe", { trumpf: waehle(FARBEN, rng) });
  if (r < 0.85 || !nullErlaubt) return neuesSpielObjekt("grand");
  return neuesSpielObjekt("null");
}

/** Zahlen-Antwortmöglichkeiten rund um die richtige Lösung (eindeutig, sortiert). */
function zahlOptionen(richtig, rng, kandidaten = null) {
  const set = new Set([richtig]);
  const pool = kandidaten ?? [richtig - 10, richtig - 4, richtig - 3, richtig - 2, richtig + 2, richtig + 3, richtig + 4, richtig + 10, richtig + 11];
  const gemischt = [...pool].sort(() => rng() - 0.5);
  for (const x of gemischt) { if (set.size >= 4) break; if (x >= 0) set.add(x); }
  return [...set].sort((a, b) => a - b);
}

/**
 * Erzeugt eine Aufgabe:
 * { typ, frage, spiel?, stich?, karten, antwort: "zahl"|"janein"|"karte"|"text", optionen?, waehlbar?, richtig, erklaerung }
 */
export function erzeugeAufgabe(typ, rng = Math.random, blatt = "franzoesisch") {
  const deck = neuesDeck(blatt).sort(() => rng() - 0.5);
  switch (typ) {
    case "augen1": {
      const k = rng() < 0.7 ? deck.find((x) => augen(x) > 0) : deck[0];
      return { typ, frage: "Wie viele Augen zählt diese Karte?", karten: [k], antwort: "zahl", optionen: [0, 2, 3, 4, 10, 11], richtig: augen(k),
        erklaerung: `${kartenName(k)} zählt ${augen(k)} Augen.` };
    }
    case "augenSumme": {
      const n = 3;
      const karten = deck.slice(0, n);
      const summe = augenSumme(karten);
      return { typ, frage: "Ein Stich – wie viele Augen sind das zusammen?", karten, antwort: "zahl", optionen: zahlOptionen(summe, rng), richtig: summe,
        erklaerung: `${karten.map(augen).join(" + ")} = ${summe} Augen.` };
    }
    case "trumpf": {
      const spiel = zufallsSpiel(rng);
      let k = deck[0];
      if (rng() < 0.35) k = deck.find((x) => x.rang === RANG.BUBE);
      else if (spiel.art === "farbe" && rng() < 0.4) k = deck.find((x) => x.farbe === spiel.trumpf);
      const t = istTrumpf(k, spiel);
      let erkl;
      if (spiel.art === "null") erkl = "Im Nullspiel gibt es keinen Trumpf – auch die Buben sind nur normale Karten ihrer Farbe.";
      else if (k.rang === RANG.BUBE) erkl = `Buben sind im ${spiel.art === "grand" ? "Grand" : "Farbspiel"} immer Trumpf.`;
      else if (spiel.art === "grand") erkl = "Im Grand sind nur die vier Buben Trumpf.";
      else erkl = t ? `${farbNameSkat(spiel.trumpf, blatt)} ist Trumpf.` : `Trumpf sind nur ${farbNameSkat(spiel.trumpf, blatt)} und die Buben.`;
      return { typ, frage: `Gespielt wird ${spielName(spiel, blatt)}. Ist diese Karte Trumpf?`, spiel, karten: [k], antwort: "janein", richtig: t, erklaerung: erkl };
    }
    case "stich": {
      const spiel = zufallsSpiel(rng);
      const erste = deck[0];
      const karten = [erste];
      const rest = deck.slice(1);
      for (let i = 0; i < 2; i++) {
        const passend = rest.filter((x) => bedienFarbe(x, spiel) === bedienFarbe(erste, spiel) && !karten.includes(x));
        const k = passend.length && rng() < 0.6 ? waehle(passend, rng) : rest.find((x) => !karten.includes(x));
        karten.push(k);
      }
      const si = stichSieger(karten, spiel);
      const sieger = karten[si];
      let warum;
      if (spiel.art === "null") warum = "Im Null gilt: A K D B 10 9 8 7, kein Trumpf – die höchste Karte der angespielten Farbe gewinnt.";
      else if (istTrumpf(sieger, spiel) && !istTrumpf(erste, spiel)) warum = `${kartenName(sieger)} ist Trumpf und sticht die angespielte Farbe.`;
      else if (istTrumpf(sieger, spiel)) warum = "Höchster Trumpf gewinnt – Reihenfolge: Kreuz-, Pik-, Herz-, Karo-Bube, dann A 10 K D 9 8 7.";
      else warum = `Kein Trumpf im Stich – die höchste Karte der angespielten Farbe (${farbNameSkat(erste.farbe, blatt)}) gewinnt: A 10 K D 9 8 7.`;
      return { typ, frage: `${spielName(spiel, blatt)}: Welche Karte gewinnt den Stich? Die linke Karte wurde zuerst gespielt.`, spiel, karten, antwort: "karte",
        waehlbar: karten.map((k) => k.id), richtig: [sieger.id], erklaerung: `${kartenName(sieger)} gewinnt. ${warum}` };
    }
    case "bedienen": {
      for (let versuch = 0; versuch < 50; versuch++) {
        const spiel = zufallsSpiel(rng);
        const d = neuesDeck(blatt).sort(() => rng() - 0.5);
        const stich = d.slice(0, rng() < 0.5 ? 2 : 1);
        const hand = sortiereSkatHand(d.slice(2, 2 + 7), spiel);
        const legal = legaleKarten(hand, stich, spiel);
        if (legal.length === hand.length || legal.length === 0) continue;
        const gef = bedienFarbe(stich[0], spiel);
        const was = gef === "trumpf" ? "Trumpf" : farbNameSkat(gef, blatt);
        return { typ, frage: `${spielName(spiel, blatt)}: Welche Karte darfst du legen? Tippe eine erlaubte Karte an.`, spiel, stich, karten: hand, antwort: "karte",
          waehlbar: hand.map((k) => k.id), richtig: legal.map((k) => k.id),
          erklaerung: `${was} ist gefordert – du musst ${was} bedienen${gef !== "trumpf" && spiel.art !== "null" ? " (Buben zählen dabei als Trumpf, nicht als Farbe)" : ""}. Erlaubt: ${legal.map(kartenName).join(", ")}.` };
      }
      return erzeugeAufgabe("stich", rng, blatt);
    }
    case "spitzen": {
      const spiel = rng() < 0.7 ? neuesSpielObjekt("farbe", { trumpf: waehle(FARBEN, rng) }) : neuesSpielObjekt("grand");
      const hand = sortiereSkatHand(deck.slice(0, 10), spiel);
      const sp = spitzen(hand, spiel);
      const opts = [];
      const max = spiel.art === "grand" ? 4 : 6;
      for (const mit of [true, false]) for (let n = 1; n <= max; n++) opts.push({ mit, n });
      const richtigText = `${sp.mit ? "mit" : "ohne"} ${sp.anzahl}`;
      const auswahl = [richtigText];
      for (const o of opts.sort(() => rng() - 0.5)) { const t = `${o.mit ? "mit" : "ohne"} ${o.n}`; if (auswahl.length < 4 && !auswahl.includes(t)) auswahl.push(t); }
      return { typ, frage: `${spielName(spiel, blatt)}: Mit oder ohne wie viele Spitzen spielst du?`, spiel, karten: hand, antwort: "text", optionen: auswahl.sort(), richtig: richtigText,
        erklaerung: `Die Trumpfreihe beginnt mit dem Kreuz-Buben. ${sp.mit ? "Du hast ihn – zähle, wie viele Trümpfe von oben lückenlos da sind." : "Du hast ihn nicht – zähle, wie viele Trümpfe von oben lückenlos fehlen."} Ergebnis: ${richtigText}.` };
    }
    case "reizwert": {
      const spiel = rng() < 0.75 ? neuesSpielObjekt("farbe", { trumpf: waehle(FARBEN, rng) }) : neuesSpielObjekt("grand");
      const hand = sortiereSkatHand(deck.slice(0, 10), spiel);
      const sp = spitzen(hand, spiel);
      const w = spielwert(spiel, { spitzenAnzahl: sp.anzahl });
      const kand = [w.grund * sp.anzahl, w.grund * (sp.anzahl + 2), w.grund * (sp.anzahl + 3), w.grund * Math.max(1, sp.anzahl - 1), w.grund * 2].filter((x) => x !== w.wert && x >= 18);
      return { typ, frage: `Du möchtest ${spielName(spiel, blatt)} spielen. Bis zu welchem Wert darfst du reizen?`, spiel, karten: hand, antwort: "zahl", optionen: zahlOptionen(w.wert, rng, kand), richtig: w.wert,
        erklaerung: `${sp.mit ? "Mit" : "Ohne"} ${sp.anzahl}, Spiel ${sp.anzahl + 1}: ${sp.anzahl + 1} × ${w.grund} (Grundwert ${spiel.art === "grand" ? "Grand" : farbNameSkat(spiel.trumpf, blatt)}) = ${w.wert}.` };
    }
    case "spielwert":
    default: {
      const spiel = neuesSpielObjekt(rng() < 0.7 ? "farbe" : "grand", { trumpf: waehle(FARBEN, rng), hand: rng() < 0.3 });
      const anzahl = 1 + zufall(spiel.art === "grand" ? 3 : 4, rng);
      const schneider = rng() < 0.3;
      const w = spielwert(spiel, { spitzenAnzahl: anzahl, schneider });
      const teile = [`mit ${anzahl}`, `Spiel ${anzahl + 1}`];
      let st = anzahl + 1;
      if (spiel.hand) teile.push(`Hand ${++st}`);
      if (schneider) teile.push(`Schneider ${++st}`);
      const kand = [w.grund * (st - 1), w.grund * (st + 1), (w.grund === 24 ? 12 : w.grund + 1) * st, w.grund * (st + 2)];
      const zustand = [`${spielName(spiel, blatt)}`, `mit ${anzahl} ${anzahl === 1 ? "Spitze" : "Spitzen"}`, schneider ? "gewonnen mit Schneider (90 Augen oder mehr)" : "gewonnen mit 75 Augen"].join(", ");
      return { typ, frage: `${zustand}. Wie viel ist das Spiel wert?`, spiel, karten: [], antwort: "zahl", optionen: zahlOptionen(w.wert, rng, kand), richtig: w.wert,
        erklaerung: `${teile.join(", ")}: ${st} × ${w.grund} = ${w.wert}.` };
    }
  }
}

/** Antwort prüfen. */
export function pruefeAntwort(aufgabe, antwort) {
  if (aufgabe.antwort === "karte") return aufgabe.richtig.includes(antwort);
  return antwort === aufgabe.richtig;
}
