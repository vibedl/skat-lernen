// Lernkurs: Kapitel mit Text, Merksätzen, Beispielkarten und kleinen Mitmach-Beispielen.
import { h } from "./ui.js";
import { neuesDeck, karteElement, kartenName } from "./deck.js";
import { augen, augenSumme, stichSieger, neuesSpielObjekt, legaleKarten, spitzen, spielwert, reizwerte, sortiereSkatHand } from "./skatregeln.js";

const DECK = neuesDeck("franzoesisch").sort((a, b) => (a.id < b.id ? -1 : 1));
const K = (id) => DECK.find((k) => k.id === id);
const RANGID = { 7: 0, 8: 1, 9: 2, 10: 3, B: 4, D: 5, K: 6, A: 7 };
/** Kurzschreibweise: k("♥A") → Herz-Ass */
const k = (s) => {
  const farbe = { "♣": "kreuz", "♠": "pik", "♥": "herz", "♦": "karo" }[s[0]];
  return K(`${farbe}-${RANGID[s.slice(1)]}`);
};
const karten = (...ids) => ids.map(k);

/** Kartenreihe mit optionaler Unterschrift je Karte. */
function reihe(ks, { beschriftung = null, klasse = "" } = {}) {
  return h(`div.kartenreihe${klasse ? "." + klasse : ""}`, {}, ks.map((kk, i) => beschriftung
    ? h("div.beschriftet", {}, karteElement(kk), h("span", { text: typeof beschriftung === "function" ? beschriftung(kk, i) : beschriftung[i] }))
    : karteElement(kk)));
}

/** Mitmach-Beispiel: Karte antippen → Augen anzeigen, Summe läuft mit. */
function augenSpiel() {
  const ks = karten("♣A", "♥10", "♠K", "♦D", "♣B", "♥9", "♠8", "♦7");
  const info = h("p.hinweis", { text: "Tippe eine Karte an." });
  let summe = 0, getippt = new Set();
  const el = h("div.kartenwahl", {}, ks.map((kk) => {
    const b = karteElement(kk, { tag: "button" });
    b.type = "button";
    b.onclick = () => {
      if (getippt.has(kk.id)) return;
      getippt.add(kk.id); summe += augen(kk); b.classList.add("markiert");
      info.textContent = `${kartenName(kk)} = ${augen(kk)} Augen. Zusammen bisher: ${summe}.`
        + (getippt.size === ks.length ? " Alle acht: 30 Augen – das ist genau ein Viertel der 120 im Spiel." : "");
    };
    return b;
  }));
  return h("div", {}, el, info);
}

/** Mitmach-Beispiel: Welche Karte gewinnt? */
function stichSpiel(spiel, ks, text) {
  const info = h("p.hinweis", { text: "Welche Karte gewinnt den Stich? Tippe sie an. Die linke Karte wurde zuerst gespielt." });
  const si = stichSieger(ks, spiel);
  const el = h("div.kartenwahl", {}, ks.map((kk, i) => {
    const b = karteElement(kk, { tag: "button" });
    b.type = "button";
    b.onclick = () => {
      el.querySelectorAll(".karte").forEach((x, j) => x.classList.toggle("markiert", j === si));
      info.textContent = (i === si ? "Richtig! " : "Nicht ganz. ") + `${kartenName(ks[si])} gewinnt: ${text}`;
    };
    return b;
  }));
  return h("div", {}, el, info);
}

/** Mitmach-Beispiel: Welche Karten darfst du legen? */
function bedienSpiel(spiel, stich, hand, text) {
  const legal = legaleKarten(hand, stich, spiel);
  const info = h("p.hinweis", { text: "Im Stich liegt die obere Karte. Tippe in deiner Hand eine Karte an, die du legen darfst." });
  const el = h("div.kartenwahl.viele", {}, hand.map((kk) => {
    const b = karteElement(kk, { tag: "button" });
    b.type = "button";
    b.onclick = () => {
      el.querySelectorAll(".karte").forEach((x, j) => { x.classList.toggle("markiert", legal.some((l) => l.id === hand[j].id)); x.classList.toggle("blass", !legal.some((l) => l.id === hand[j].id)); });
      info.textContent = (legal.some((l) => l.id === kk.id) ? "Richtig! " : "Das geht nicht. ") + text;
    };
    return b;
  }));
  return h("div", {}, h("div.kartenreihe", {}, h("div.beschriftet", {}, karteElement(stich[0]), h("span", { text: "liegt im Stich" }))), el, info);
}

/** Spitzen-Rechner: zufällige Hand, Lösung aufdecken. */
function spitzenSpiel() {
  const wrap = h("div");
  const neu = () => {
    const deck = [...DECK].sort(() => Math.random() - 0.5);
    const spiel = Math.random() < 0.7 ? neuesSpielObjekt("farbe", { trumpf: ["kreuz", "pik", "herz", "karo"][Math.floor(Math.random() * 4)] }) : neuesSpielObjekt("grand");
    const hand = sortiereSkatHand(deck.slice(0, 10), spiel);
    const sp = spitzen(hand, spiel);
    const w = spielwert(spiel, { spitzenAnzahl: sp.anzahl });
    const name = spiel.art === "grand" ? "Grand" : { kreuz: "Kreuz", pik: "Pik", herz: "Herz", karo: "Karo" }[spiel.trumpf];
    const loesung = h("p.hinweis", { text: " " });
    wrap.replaceChildren(
      h("p", {}, h("b", { text: `Angenommen, du spielst ${name}.` }), " Mit oder ohne wie viele Spitzen? Bis wohin darfst du reizen?"),
      reihe(hand, { klasse: "klein" }),
      h("div.knopfreihe", {}, h("button.knopf", { type: "button", text: "Lösung zeigen", onclick: () => { loesung.textContent = `${sp.mit ? "Mit" : "Ohne"} ${sp.anzahl}, Spiel ${sp.anzahl + 1} → ${sp.anzahl + 1} × ${w.grund} = ${w.wert}. Bis ${w.wert} darfst du reizen (mehr nur, wenn du Hand spielst oder Schneider schaffst).`; } }),
        h("button.knopf.leise", { type: "button", text: "Neue Hand", onclick: neu })),
      loesung,
    );
  };
  neu();
  return wrap;
}

const SPIEL_HERZ = neuesSpielObjekt("farbe", { trumpf: "herz" });
const SPIEL_GRAND = neuesSpielObjekt("grand");
const SPIEL_NULL = neuesSpielObjekt("null");

/** Alle Kapitel. Jeder Abschnitt: { titel?, html?, merke?, bauen?: () => Node } */
export const KAPITEL = [
  {
    id: "karten", titel: "Die Karten und ihre Augen", kurz: "32 Karten, 120 Augen – wer 61 hat, gewinnt.",
    abschnitte: [
      { html: "Skat wird mit <b>32 Karten</b> gespielt: vier Farben (Kreuz ♣, Pik ♠, Herz ♥, Karo ♦) mit je acht Karten: <b>7, 8, 9, 10, Bube, Dame, König, Ass</b>." },
      { titel: "Die Augen (Punktwerte)", html: "Jede Karte zählt eine bestimmte Zahl <b>Augen</b>. Im ganzen Spiel stecken <b>120 Augen</b>. Der Alleinspieler braucht mindestens <b>61</b>, um zu gewinnen.",
        bauen: () => reihe(karten("♠A", "♠10", "♠K", "♠D", "♠B", "♠9", "♠8", "♠7"), { beschriftung: ["11", "10", "4", "3", "2", "0", "0", "0"] }) },
      { merke: "Ass 11 · Zehn 10 · König 4 · Dame 3 · Bube 2 · 9, 8, 7 nichts. Eine Farbe hat zusammen 30 Augen, alle vier 120." },
      { titel: "Probier es aus", bauen: augenSpiel },
      { titel: "Die Zehn ist stärker als der König!", html: "Anders als bei vielen Kartenspielen liegt die <b>Zehn über dem König</b> (außer im Nullspiel). Die Reihenfolge innerhalb einer Farbe ist deshalb: <b>Ass, 10, König, Dame, 9, 8, 7</b> – und der Bube spielt eine Sonderrolle, dazu gleich mehr." },
    ],
  },
  {
    id: "tisch", titel: "Drei am Tisch: Alleinspieler gegen zwei", kurz: "Jeder bekommt 10 Karten, 2 liegen im Skat.",
    abschnitte: [
      { html: "Skat spielen <b>drei Personen</b>. Nach dem Geben hat jeder <b>10 Karten</b>, zwei Karten liegen verdeckt in der Mitte: das ist der <b>Skat</b>, der dem Spiel seinen Namen gibt." },
      { titel: "Die Plätze", html: "Links vom Geber sitzt die <b>Vorhand</b> – sie spielt die erste Karte aus. Dann folgen <b>Mittelhand</b> und <b>Hinterhand</b> (= der Geber selbst, bei drei Spielern spielt der Geber mit). Nach jedem Spiel wandert das Geben eine Position weiter." },
      { titel: "Einer gegen zwei", html: "Durch das <b>Reizen</b> (Kapitel 5) wird bestimmt, wer <b>Alleinspieler</b> ist. Die beiden anderen sind die <b>Gegenspieler</b> und arbeiten zusammen – ihre Stiche und Augen werden zusammengezählt. Der Alleinspieler darf meist den Skat aufnehmen, zwei Karten <b>drücken</b> (weglegen) und bestimmt die Spielart." },
      { merke: "Alleinspieler: braucht 61 Augen. Gegenspieler: brauchen zusammen 60 Augen (dann hat der Alleinspieler nur 60 und verliert). Die gedrückten Karten zählen am Ende für den Alleinspieler." },
      { titel: "Ablauf eines Spiels", html: "<ol><li><b>Geben</b>: 3 – Skat (2) – 4 – 3 Karten.</li><li><b>Reizen</b>: Wer traut sich das höchste Spiel zu?</li><li><b>Skat aufnehmen</b> und zwei Karten drücken – oder <b>Hand</b> spielen (Skat bleibt liegen).</li><li><b>Spiel ansagen</b>: Farbe, Grand oder Null.</li><li><b>10 Stiche</b> spielen.</li><li><b>Abrechnen</b>: Augen zählen, Spielwert berechnen.</li></ol>" },
    ],
  },
  {
    id: "spielarten", titel: "Spielarten und Trumpf", kurz: "Farbspiel, Grand, Null – und warum die Buben besonders sind.",
    abschnitte: [
      { html: "Der Alleinspieler wählt, <b>was Trumpf ist</b>. Trumpfkarten stechen alle anderen Farben. Es gibt drei Arten von Spielen:" },
      { titel: "1. Farbspiel", html: "Eine Farbe ist Trumpf, zum Beispiel Herz. <b>Alle vier Buben sind zusätzlich Trumpf</b> – und zwar die höchsten! Das Herzspiel hat deshalb <b>11 Trümpfe</b>, in dieser Reihenfolge (höchster zuerst):",
        bauen: () => reihe(karten("♣B", "♠B", "♥B", "♦B", "♥A", "♥10", "♥K", "♥D", "♥9", "♥8", "♥7"), { klasse: "klein" }) },
      { merke: "Buben-Reihenfolge: Kreuz > Pik > Herz > Karo. Merkhilfe: „Kreuz-Pik-Herz-Karo“ wird vom Dunklen zum Hellen gelesen – der Kreuz-Bube (der „Alte“) ist immer die höchste Karte im Spiel (außer beim Null)." },
      { html: "Die Grundwerte der Farben: <b>Karo 9, Herz 10, Pik 11, Kreuz 12</b>. Sie bestimmen später den Spielwert." },
      { titel: "2. Grand", html: "Im Grand sind <b>nur die vier Buben Trumpf</b>. Alle anderen Karten sind normale Farbkarten (Ass, 10, König, Dame, 9, 8, 7). Grundwert <b>24</b> – der Grand ist das wertvollste Spiel.",
        bauen: () => reihe(karten("♣B", "♠B", "♥B", "♦B"), { beschriftung: ["höchster", "", "", "niedrigster"] }) },
      { titel: "3. Null", html: "Beim Null will der Alleinspieler <b>keinen einzigen Stich</b> machen. Es gibt <b>keinen Trumpf</b>, und die Reihenfolge ist wie bei anderen Kartenspielen: <b>Ass, König, Dame, Bube, 10, 9, 8, 7</b>. Die Zehn ist hier also klein, der Bube ist nur eine Farbkarte. Feste Werte: Null 23, Null Hand 35, Null ouvert 46, Null ouvert Hand 59.",
        bauen: () => reihe(karten("♦A", "♦K", "♦D", "♦B", "♦10", "♦9", "♦8", "♦7"), { klasse: "klein" }) },
      { merke: "Farbspiel: Buben + Trumpffarbe sind Trumpf. Grand: nur Buben. Null: kein Trumpf, andere Reihenfolge, kein Stich erlaubt." },
    ],
  },
  {
    id: "bedienen", titel: "Bedienen und Stechen", kurz: "Farbe bekennen ist Pflicht – Buben gehören zum Trumpf.",
    abschnitte: [
      { html: "Die Vorhand spielt eine Karte aus, die anderen legen im Uhrzeigersinn je eine Karte dazu – das ist ein <b>Stich</b>. Wer den Stich gewinnt, nimmt die drei Karten und spielt die nächste Karte aus." },
      { titel: "Bedienpflicht", html: "Du <b>musst die angespielte Farbe bedienen</b>, wenn du sie hast. Trumpf gilt dabei als eigene „Farbe“: Wird Trumpf angespielt, musst du Trumpf zugeben – auch ein Bube ist Trumpf! Hast du die Farbe nicht, darfst du <b>irgendeine</b> Karte legen: stechen mit Trumpf oder etwas abwerfen." },
      { merke: "Buben sind im Farbspiel und Grand KEINE Farbkarten. Wird Herz angespielt und du hast nur den Herz-Buben, musst du ihn nicht legen – er gehört zum Trumpf. Umgekehrt: Wird Trumpf angespielt, zählt dein Herz-Bube im Herzspiel als Trumpf und muss bedient werden, wenn du sonst keinen Trumpf hast." },
      { titel: "Wer gewinnt den Stich?", html: "<ul><li>Liegt <b>Trumpf</b> im Stich, gewinnt der <b>höchste Trumpf</b>.</li><li>Liegt kein Trumpf, gewinnt die <b>höchste Karte der angespielten Farbe</b>.</li><li>Eine andere Farbe (kein Trumpf) kann nie gewinnen – sie wird „abgeworfen“.</li></ul>" },
      { titel: "Beispiel 1 (Herz ist Trumpf)", bauen: () => stichSpiel(SPIEL_HERZ, karten("♠A", "♠10", "♥7"), "Herz ist Trumpf, deshalb sticht sogar die Herz-7 das Pik-Ass. Der Spieler mit der Herz-7 hatte kein Pik mehr – nur dann darf er stechen.") },
      { titel: "Beispiel 2 (Herz ist Trumpf)", bauen: () => stichSpiel(SPIEL_HERZ, karten("♥A", "♦B", "♥10"), "Der Karo-Bube ist Trumpf und steht über allen Herz-Karten – auch über dem Herz-Ass.") },
      { titel: "Beispiel 3 (Grand)", bauen: () => stichSpiel(SPIEL_GRAND, karten("♣10", "♣K", "♣A"), "Im Grand sind nur Buben Trumpf. Kein Bube im Stich → die höchste Kreuz-Karte gewinnt, und das ist das Ass (vor der Zehn).") },
      { titel: "Beispiel 4 (Null)", bauen: () => stichSpiel(SPIEL_NULL, karten("♠10", "♠K", "♠B"), "Im Null gilt A K D B 10 9 8 7 – der König ist hier höher als Bube und Zehn.") },
      { titel: "Jetzt du: Was darfst du legen?", bauen: () => bedienSpiel(SPIEL_HERZ, karten("♠K"), sortiereSkatHand(karten("♣B", "♥A", "♥9", "♠10", "♠7", "♦A", "♣8"), SPIEL_HERZ), "Pik wurde angespielt. Du hast Pik-10 und Pik-7 – eine davon musst du legen. Trümpfe (Herz, Buben) darfst du erst spielen, wenn du kein Pik mehr hast.") },
      { titel: "Noch eins: Trumpf angespielt", bauen: () => bedienSpiel(SPIEL_HERZ, karten("♥K"), sortiereSkatHand(karten("♠B", "♥7", "♠A", "♠D", "♦10", "♣9", "♣7"), SPIEL_HERZ), "Herz ist Trumpf und wurde angespielt. Trumpf hast du zwei: den Pik-Buben und die Herz-7 – nur die darfst du legen.") },
    ],
  },
  {
    id: "reizen", titel: "Reizen: Wer spielt?", kurz: "Spitzen zählen, Grundwert mal Stufen – bis wohin darfst du gehen?",
    abschnitte: [
      { html: "Vor dem Spiel wird <b>gereizt</b>, eine Art Versteigerung mit Zahlen. Wer den höchsten Wert nennt, wird Alleinspieler. Die Zahlen sind mögliche <b>Spielwerte</b>; am Ende muss dein Spiel mindestens so viel wert sein, wie du gereizt hast – sonst bist du <b>überreizt</b> und verlierst." },
      { titel: "Der Ablauf", html: "<ol><li><b>Mittelhand sagt der Vorhand</b> Werte an: „18?“ Vorhand antwortet „Ja“ (hält) oder „Passe“. Dann „20?“ – „Ja“ … bis einer passt.</li><li>Wer übrig bleibt, hört jetzt die <b>Hinterhand</b>: Sie muss höher gehen als der letzte Wert.</li><li>Haben beide gepasst, ohne zu reizen, darf die Vorhand selbst mit 18 spielen – oder auch passen (dann wird neu gegeben, bei manchen Runden <b>Ramsch</b> gespielt).</li></ol>Die Reizwerte in Reihenfolge: <b>" + reizwerte().slice(0, 18).join(", ") + " …</b>" },
      { merke: "Der Hörer (Vorhand) ist im Vorteil: Bei gleichem Mut bekommt sie das Spiel, weil der Sager immer höher gehen muss." },
      { titel: "So berechnest du deinen Spielwert", html: "<b>Spielwert = Grundwert × Stufen.</b><br>Grundwert: Karo 9, Herz 10, Pik 11, Kreuz 12, Grand 24.<br>Stufen zählst du so zusammen:<table><tr><td>Spitzen („mit“ oder „ohne“)</td><td class='zahl'>1–11</td></tr><tr><td>+ Spiel (immer)</td><td class='zahl'>1</td></tr><tr><td>+ Hand (Skat nicht aufgenommen)</td><td class='zahl'>1</td></tr><tr><td>+ Schneider (Gegner ≤ 30 Augen)</td><td class='zahl'>1</td></tr><tr><td>+ Schneider angesagt (nur Hand)</td><td class='zahl'>1</td></tr><tr><td>+ Schwarz (alle Stiche)</td><td class='zahl'>1</td></tr><tr><td>+ Schwarz angesagt (nur Hand)</td><td class='zahl'>1</td></tr><tr><td>+ Ouvert (offen, nur Hand)</td><td class='zahl'>1</td></tr></table>" },
      { titel: "Spitzen: mit oder ohne", html: "Die <b>Spitzen</b> sind die obersten Trümpfe in lückenloser Reihe – gezählt vom Kreuz-Buben abwärts (Kreuz-B, Pik-B, Herz-B, Karo-B, dann Trumpf-Ass, -10, -K …).<ul><li>Hast du den Kreuz-Buben, spielst du <b>mit</b> so vielen Spitzen, wie du von oben lückenlos hast.</li><li>Hast du ihn nicht, spielst du <b>ohne</b> so vielen, wie dir von oben lückenlos fehlen.</li></ul>Mit und ohne zählen gleich viel!",
        bauen: () => h("div", {}, h("p.hinweis", { text: "Beispiel: Kreuz-Bube und Pik-Bube da, Herz-Bube fehlt → „mit 2“." }), reihe(karten("♣B", "♠B", "♦B", "♥A"), { beschriftung: ["Spitze 1", "Spitze 2", "Lücke!", ""] }),
          h("p.hinweis", { text: "Beispiel: Kreuz-Bube fehlt, Pik-Bube fehlt, Herz-Bube da → „ohne 2“." }), reihe(karten("♥B", "♦B", "♥A", "♥10"), { beschriftung: ["ohne 2", "", "", ""] })) },
      { titel: "Rechenbeispiel", html: "Du hast Kreuz-Bube und Pik-Bube, den Herz-Buben nicht, und willst Herz spielen mit aufgenommenem Skat: <b>mit 2, Spiel 3</b> → 3 × 10 = <b>30</b>. Du darfst bis 30 reizen. Schaffst du Schneider, wäre es 4 × 10 = 40 wert – aber darauf solltest du beim Reizen nicht bauen." },
      { titel: "Vorsicht beim „ohne“", html: "Spielst du „ohne 2“ und findest im Skat den Kreuz-Buben, bist du plötzlich „mit 1“ – dein Spiel ist weniger wert als gedacht. Deshalb beim Reizen mit „ohne“ vorsichtig sein." },
      { titel: "Trainiere es", bauen: spitzenSpiel },
      { titel: "Wie viel Blatt braucht ein Spiel?", html: "Faustregeln für Anfänger:<ul><li><b>Farbspiel</b>: mindestens 5–6 Trümpfe (Buben zählen mit), dazu ein Ass in einer anderen Farbe, am besten noch eine Farbe gar nicht („blank“).</li><li><b>Grand</b>: mindestens 2 Buben (darunter Kreuz oder Pik) und 2 Asse, am besten mit Zehn dahinter.</li><li><b>Null</b>: viele 7er und 8er, keine hohen Karten ohne Deckung nach unten. Eine „blanke“ Zehn oder ein Ass ohne 7 darunter sind gefährlich.</li></ul>" },
    ],
  },
  {
    id: "abrechnen", titel: "Gewinnen und Abrechnen", kurz: "61 Augen, Schneider bei 90, Schwarz bei allen Stichen – verloren zählt doppelt.",
    abschnitte: [
      { html: "Nach zehn Stichen wird gezählt. Der Alleinspieler bekommt die Augen seiner Stiche <b>plus die zwei gedrückten Karten</b> (den Skat)." },
      { titel: "Die Schwellen", html: "<table><tr><th>Alleinspieler hat</th><th>Ergebnis</th></tr><tr><td>61–89 Augen</td><td>gewonnen (einfach)</td></tr><tr><td>90–120 Augen</td><td>gewonnen <b>Schneider</b> (+1 Stufe)</td></tr><tr><td>alle 10 Stiche</td><td>gewonnen <b>Schwarz</b> (+1 weitere Stufe)</td></tr><tr><td>31–60 Augen</td><td>verloren</td></tr><tr><td>0–30 Augen</td><td>verloren Schneider (+1 Stufe – für die Gegner)</td></tr><tr><td>kein Stich</td><td>verloren Schwarz</td></tr></table>" },
      { titel: "Die Punkte", html: "<b>Gewonnen:</b> Der Alleinspieler bekommt den Spielwert als Pluspunkte.<br><b>Verloren:</b> Der Alleinspieler bekommt den <b>doppelten</b> Spielwert als Minuspunkte. Die Gegenspieler bekommen nichts gutgeschrieben – sie freuen sich nur über das Minus beim anderen." },
      { titel: "Beispiel", html: "Herz, mit 2, Spiel 3, Hand 4 → 4 × 10 = 40. Alleinspieler macht 74 Augen → <b>+40</b>. Mit nur 58 Augen → <b>−80</b>." },
      { titel: "Überreizt", html: "Hast du 36 gereizt, dein Spiel ist aber nur 30 wert, bist du <b>überreizt</b> – auch mit 100 Augen verloren. Es zählt dann das nächste Vielfache des Grundwerts, das deinen Reizwert erreicht (hier 40), und das doppelt: <b>−80</b>." },
      { titel: "Null", html: "Null ist gewonnen, wenn der Alleinspieler <b>keinen Stich</b> bekommt. Sobald er einen Stich macht, ist das Spiel sofort vorbei und verloren. Null 23, Null Hand 35, Null ouvert (offen) 46, Null ouvert Hand 59 – verloren jeweils doppelt." },
      { merke: "Verloren zählt doppelt. Darum: lieber ein sicheres kleines Spiel als ein wackliges großes." },
    ],
  },
  {
    id: "taktik", titel: "Tipps für die ersten Spiele", kurz: "Trumpf ziehen, Asse holen, schmieren – und mitzählen.",
    abschnitte: [
      { titel: "Als Alleinspieler", html: "<ul><li><b>Trumpf ziehen:</b> Spiele zuerst deine hohen Trümpfe aus, damit die Gegner ihre Trümpfe loswerden und deine Asse später nicht mehr gestochen werden.</li><li><b>Asse abholen:</b> Spiele Asse in Farben, die noch keiner angespielt hat, solange die Gegner noch bedienen müssen.</li><li><b>Drücken:</b> Lege beim Drücken Karten weg, die Stiche verlieren würden, aber Augen bringen – zum Beispiel eine blanke Zehn oder einen König ohne Ass. Nie Trümpfe drücken.</li><li><b>Mitzählen:</b> Zähle deine Augen (mit Skat) laufend. Bei 61 bist du durch.</li></ul>" },
      { titel: "Als Gegenspieler", html: "<ul><li><b>Zusammenarbeiten:</b> Die Augen beider Gegenspieler zählen gemeinsam. Macht der Partner den Stich, <b>schmiere</b> ihm eine hohe Karte (Ass oder Zehn) dazu.</li><li><b>Kurzer Weg – lange Farbe, langer Weg – kurze Farbe:</b> Sitzt du direkt vor dem Alleinspieler (du spielst aus, er ist als Nächster dran), spiele deine <b>lange</b> Farbe. Sitzt der Alleinspieler zwischen euch (Partner spielt nach ihm), spiele deine <b>kurze</b> Farbe.</li><li><b>Nicht in den Trumpf laufen:</b> Spiele keine Trümpfe aus, wenn der Alleinspieler stärker ist.</li><li><b>Zehnen schützen:</b> Eine blanke Zehn ist in Gefahr – spiele sie nicht unnötig in ein Ass hinein.</li></ul>" },
      { titel: "Beim Reizen", html: "<ul><li>Reize nur bis zum Wert, den dein Blatt <b>sicher</b> hat (ohne Schneider einzurechnen).</li><li>Mit „ohne“ vorsichtig – der Skat kann den Kreuz-Buben enthalten.</li><li>Grand nur mit mindestens zwei starken Buben und Assen.</li><li>Passen ist keine Schande. Verlorene Spiele kosten doppelt.</li></ul>" },
      { merke: "In dieser App erklärt dir die Lernhilfe beim Spielen jeden Schritt: was gefordert ist, warum ein Stich gewonnen wurde und wie der Spielwert zustande kommt. Schalte sie in den Einstellungen nach und nach ab, wenn du sicherer wirst." },
    ],
  },
  {
    id: "woerter", titel: "Skat-Wörterbuch", kurz: "Vom „Alten“ bis zum „Schneider“.",
    abschnitte: [
      { bauen: () => h("dl.glossar", {}, ...[
        ["Alleinspieler", "Wer das Reizen gewonnen hat und gegen die beiden anderen spielt."],
        ["Der Alte", "Der Kreuz-Bube – höchste Karte im Farbspiel und Grand."],
        ["Augen", "Punktwerte der Karten (A 11, 10 10, K 4, D 3, B 2). 120 im Spiel."],
        ["Bedienen", "Die angespielte Farbe (oder Trumpf) zugeben – Pflicht, wenn man sie hat."],
        ["Blank", "Nur eine Karte einer Farbe (z. B. „blanke Zehn“)."],
        ["Drücken", "Zwei Karten nach dem Skataufnehmen weglegen. Sie zählen am Ende für den Alleinspieler."],
        ["Durchmarsch", "Im Ramsch alle Stiche machen – dann gewinnt man ausnahmsweise."],
        ["Fehlfarbe", "Eine Farbe, von der ein Spieler keine Karte mehr hat."],
        ["Grand", "Spiel, in dem nur die vier Buben Trumpf sind. Grundwert 24."],
        ["Grundwert", "Karo 9, Herz 10, Pik 11, Kreuz 12, Grand 24."],
        ["Hand", "Spielen, ohne den Skat aufzunehmen. Eine Stufe mehr."],
        ["Hinterhand", "Dritter Spieler im Stich; beim Reizen reizt sie zuletzt. Bei drei Spielern ist das der Geber."],
        ["Kontra / Re", "Gegner verdoppeln das Spiel (Kontra), Alleinspieler verdoppelt nochmal (Re). Nicht in der offiziellen Skatordnung, aber verbreitet."],
        ["Mittelhand", "Zweiter Spieler im Stich; beginnt das Reizen gegen die Vorhand."],
        ["Null", "Spiel ohne Trumpf, bei dem der Alleinspieler keinen Stich machen darf."],
        ["Ouvert", "Offen: Der Alleinspieler legt seine Karten auf den Tisch."],
        ["Passe / Weg", "Ich reize nicht (weiter)."],
        ["Ramsch", "Wenn alle passen: Jeder spielt für sich, wer die meisten Augen bekommt, verliert. Hausregel."],
        ["Reizen", "Versteigerung vor dem Spiel – wer den höchsten Wert nennt, spielt allein."],
        ["Schmieren", "Dem Partner, der den Stich macht, eine Karte mit vielen Augen zugeben."],
        ["Schneider", "Eine Partei hat 30 Augen oder weniger. Bringt eine Stufe mehr."],
        ["Schwarz", "Eine Partei hat keinen einzigen Stich. Bringt eine weitere Stufe."],
        ["Skat", "Die zwei verdeckten Karten in der Mitte."],
        ["Spitzen", "Die lückenlos vorhandenen (mit) oder fehlenden (ohne) obersten Trümpfe."],
        ["Stechen", "Mit Trumpf einen Stich gewinnen, wenn man die Farbe nicht bedienen kann."],
        ["Stich", "Drei Karten – je eine pro Spieler. Die höchste gewinnt."],
        ["Überreizt", "Mehr gereizt, als das Spiel wert ist. Automatisch verloren."],
        ["Vorhand", "Sitzt links vom Geber, spielt die erste Karte aus und hört beim Reizen."],
      ].flatMap(([a, b]) => [h("dt", { text: a }), h("dd", { text: b })])) },
    ],
  },
];

/** Kapitel als DOM-Artikel bauen. */
export function kapitelAnsicht(kap) {
  const art = h("div.artikel");
  for (const a of kap.abschnitte) {
    if (a.merke) { art.append(h("div.box.merke", {}, h("h3", { text: "Merke" }), h("p", { html: a.merke }))); continue; }
    const box = h("div.box");
    if (a.titel) box.append(h("h3", { text: a.titel }));
    if (a.html) box.append(h("div", { html: a.html }));
    if (a.bauen) box.append(a.bauen());
    art.append(box);
  }
  return art;
}
