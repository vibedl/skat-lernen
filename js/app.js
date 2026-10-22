// Skat lernen – App-Hülle: Bereiche Lernen · Üben · Spielen · Erfolge, Rang im Kopf, Einstellungen, Offline-Registrierung.
import { h, sleep, debounced, toast, speicher } from "./ui.js";
import { karteElement, kartenName } from "./deck.js";
import { KAPITEL, kapitelAnsicht } from "./lernen.js";
import { THEMEN, erzeugeAufgabe, pruefeAntwort } from "./aufgaben.js";
import { SkatSpiel, STANDARD, NAMEN } from "./spiel.js";
import { klang, konfetti, fortschritt, rang, gibXp, zaehle, verleihe, hatAbzeichen, ABZEICHEN, RAENGE, aufFortschritt, zeigeAbzeichen, zeigeAufstieg, setzeTon, istTonAn } from "./spass.js";

const inhalt = document.getElementById("inhalt");
const tabs = [...document.querySelectorAll(".tabs button")];
let einstellungen = { ...STANDARD, ...speicher.lies("einstellungen", {}) };
let laufendesSpiel = null;
let aktuellerTab = null;

/* ================================================================ Rang im Kopf */
const plakette = document.getElementById("rangplakette");
function zeichneRang() {
  const r = rang();
  plakette.replaceChildren(h("span.stern", { text: String(RAENGE.indexOf(RAENGE.find((x) => x.name === r.name)) + 1) }),
    h("span.rangtext", {}, h("span.rangname", { text: r.name }), h("span.xpbalken", {}, h("i", { style: { width: `${Math.round(r.anteil * 100)}%` } }))));
}
plakette.onclick = () => zeige("liste");
aufFortschritt((ev) => {
  zeichneRang();
  if (ev.typ === "abzeichen") setTimeout(() => zeigeAbzeichen(ev.abzeichen), 300);
  if (ev.typ === "xp" && ev.aufgestiegen) setTimeout(() => zeigeAufstieg(ev.aufgestiegen), 900);
});
zeichneRang();

/* ================================================================ Navigation */
const kopfTitel = document.querySelector(".kopf-titel");
const kopfZusatz = (text) => { kopfTitel.replaceChildren("Skat lernen", ...(text ? [h("small", { text })] : [])); };
function zeige(tab, unter = null) {
  if (laufendesSpiel && tab !== "spielen") { laufendesSpiel.stop(); laufendesSpiel = null; }
  kopfZusatz("");
  aktuellerTab = tab;
  tabs.forEach((b) => b.classList.toggle("aktiv", b.dataset.tab === tab));
  inhalt.classList.toggle("spielfeld", tab === "spielen");
  window.scrollTo(0, 0);
  speicher.schreib("tab", tab);
  ({ lernen: lernenAnsicht, ueben: uebenAnsicht, spielen: spielenAnsicht, liste: erfolgeAnsicht })[tab](unter);
}
tabs.forEach((b) => (b.onclick = () => zeige(b.dataset.tab)));
const zurueckKnopf = (text, fn) => h("button.zurueck", { type: "button", text: `‹ ${text}`, onclick: fn });

/* ================================================================ Lernen */
const KAPITEL_SYMBOL = { karten: ["A", "rot"], tisch: ["3", ""], spielarten: ["♣", "gruen"], bedienen: ["♥", "rot"], reizen: ["18", "blau"], abrechnen: ["61", ""], taktik: ["★", "blau"], woerter: ["?", "gruen"] };
function lernenAnsicht(kapId = null) {
  const gelesen = new Set(speicher.lies("gelesen", []));
  if (kapId) {
    const kap = KAPITEL.find((k) => k.id === kapId);
    const idx = KAPITEL.indexOf(kap);
    const naechstes = KAPITEL[idx + 1];
    if (!gelesen.has(kap.id)) { gelesen.add(kap.id); speicher.schreib("gelesen", [...gelesen]); gibXp(15, "Kapitel"); }
    if (gelesen.size >= KAPITEL.length) verleihe("leseratte");
    inhalt.replaceChildren(
      zurueckKnopf("Alle Kapitel", () => zeige("lernen")),
      h("h2.seitentitel", { text: kap.titel }),
      h("p.untertitel", { text: kap.kurz }),
      kapitelAnsicht(kap),
      h("div.knopfreihe", { style: { marginTop: "18px" } },
        naechstes ? h("button.knopf.primaer.breit", { type: "button", text: `Weiter: ${naechstes.titel}`, onclick: () => zeige("lernen", naechstes.id) })
          : h("button.knopf.primaer.breit", { type: "button", text: "Jetzt üben", onclick: () => zeige("ueben") }),
        h("button.knopf.breit", { type: "button", text: "Dazu passend üben", onclick: () => zeige("ueben", passendesThema(kap.id)) })),
    );
    return;
  }
  inhalt.replaceChildren(
    h("h2.seitentitel", { text: "Skat lernen" }),
    h("p.untertitel", { text: `Acht kurze Kapitel, ${gelesen.size} von ${KAPITEL.length} gelesen. Jedes Kapitel bringt Erfahrung.` }),
    ...KAPITEL.map((kap) => {
      const [sym, farbe] = KAPITEL_SYMBOL[kap.id] ?? ["•", ""];
      return h("button.kachel", { type: "button", onclick: () => zeige("lernen", kap.id) },
        h("div.zeile", {}, h("span.symbol" + (farbe ? "." + farbe : ""), { text: sym }), h("div", { style: { flex: "1" } }, h("h3", { text: kap.titel }), h("p", { text: kap.kurz })), gelesen.has(kap.id) ? h("span.fertig", { text: "✓" }) : null));
    }),
    h("div.box.merke", { style: { marginTop: "18px" } }, h("h3", { text: "So geht's am schnellsten" }), h("p", { text: "Ein Kapitel lesen, die passende Übung machen, dann ein paar Runden mit voller Lernhilfe spielen. Lena und Max erklären nichts – aber die Lernhilfe schon." })),
  );
}
const passendesThema = (kapId) => ({ karten: "augen", spielarten: "trumpf", bedienen: "bedienen", reizen: "reizwert", abrechnen: "spielwert", taktik: "alles", tisch: "stich", woerter: "alles" })[kapId] ?? "alles";

/* ================================================================ Üben */
const THEMA_SYMBOL = { augen: ["11", "rot"], trumpf: ["B", "gruen"], stich: ["A", ""], bedienen: ["♠", ""], spitzen: ["♣", "gruen"], reizwert: ["24", "blau"], spielwert: ["×", "rot"], alles: ["?", "blau"] };
const sterne = (n) => (n >= 10 ? "★★★" : n >= 8 ? "★★☆" : n >= 5 ? "★☆☆" : "☆☆☆");
function uebenAnsicht(themaId = null) {
  const beste = speicher.lies("beste", {});
  if (themaId) return quiz(THEMEN.find((t) => t.id === themaId));
  inhalt.replaceChildren(
    h("h2.seitentitel", { text: "Üben" }),
    h("p.untertitel", { text: "Je 10 Aufgaben. Drei Sterne gibt es für 10 von 10 – und jede richtige Antwort bringt Erfahrung." }),
    ...THEMEN.map((t) => {
      const [sym, farbe] = THEMA_SYMBOL[t.id] ?? ["•", ""];
      return h("button.kachel", { type: "button", onclick: () => zeige("ueben", t.id) },
        h("div.zeile", {}, h("span.symbol" + (farbe ? "." + farbe : ""), { text: sym }), h("div", { style: { flex: "1" } }, h("h3", { text: t.titel }), h("p", { text: t.text })), h("span.sterne", { text: sterne(beste[t.id] ?? 0) })));
    }),
  );
}

async function quiz(thema) {
  const runden = 10;
  let richtig = 0;
  let serie = speicher.lies("serie", 0);
  const zaehlerEl = h("div.zaehler");
  const balken = h("div.balken", {}, h("i"));
  const frageEl = h("p.qfrage");
  const stichEl = h("div.imstich");
  const platz = h("div.kartenwahl");
  const antworten = h("div.antworten");
  const erkl = h("div.erklaerung");
  const weiter = h("button.knopf.primaer.breit", { type: "button", text: "Weiter", hidden: true });
  inhalt.replaceChildren(zurueckKnopf("Übungen", () => zeige("ueben")), h("h2.seitentitel", { text: thema.titel }),
    h("div.quiz", {}, zaehlerEl, balken, frageEl, stichEl, platz, antworten, erkl, weiter));
  const lebt = () => aktuellerTab === "ueben" && inhalt.contains(frageEl);
  const serieEl = h("span.serie");
  const zeigeZaehler = (r) => { zaehlerEl.replaceChildren(h("span", { text: `Aufgabe ${r + 1} von ${runden}` }), serieEl, h("span", { text: `${richtig} richtig` })); serieEl.textContent = serie >= 3 ? `🔥 ${serie} in Folge` : ""; };

  let letzterTyp = null;
  for (let r = 0; r < runden; r++) {
    if (!lebt()) return;
    let typ = thema.typen[r % thema.typen.length];
    if (thema.typen.length > 1 && typ === letzterTyp) typ = thema.typen[(r + 1) % thema.typen.length];
    letzterTyp = typ;
    const a = erzeugeAufgabe(typ);
    zeigeZaehler(r);
    balken.firstChild.style.width = `${(r / runden) * 100}%`;
    frageEl.textContent = a.frage;
    erkl.textContent = ""; erkl.className = "erklaerung";
    weiter.hidden = true;
    stichEl.replaceChildren();
    if (a.stich) stichEl.append(h("span", { text: "Im Stich liegt:" }), ...a.stich.map((k) => karteElement(k)));
    platz.classList.toggle("viele", a.karten.length > 5);

    const antwort = await new Promise((loese) => {
      if (!lebt()) return loese(null);
      if (a.antwort === "karte") {
        antworten.replaceChildren();
        platz.replaceChildren(...a.karten.map((k) => { const el = karteElement(k, { tag: "button" }); el.type = "button"; el.classList.add("neu"); el.onclick = debounced(() => loese(k.id)); return el; }));
      } else {
        platz.replaceChildren(...a.karten.map((k) => { const el = karteElement(k); el.classList.add("neu"); return el; }));
        const opts = a.antwort === "janein" ? [{ w: true, t: "Ja, Trumpf" }, { w: false, t: "Nein" }] : a.optionen.map((o) => ({ w: o, t: String(o) }));
        antworten.replaceChildren(...opts.map((o) => h("button.knopf", { type: "button", text: o.t, onclick: debounced(() => loese(o.w)) })));
      }
    });
    if (antwort == null || !lebt()) return;
    const ok = pruefeAntwort(a, antwort);
    if (ok) { richtig++; serie++; klang.richtig(); gibXp(10, "Übung"); if (serie >= 10) verleihe("serie"); }
    else { serie = 0; klang.falsch(); }
    speicher.schreib("serie", serie);
    if (a.antwort === "karte") {
      platz.querySelectorAll("button.karte").forEach((b, i) => { b.onclick = null; b.classList.add(a.richtig.includes(a.karten[i].id) ? "markiert" : "blass"); });
    } else {
      const opts = a.antwort === "janein" ? [true, false] : a.optionen;
      antworten.querySelectorAll("button").forEach((b, i) => { b.onclick = null; b.disabled = true; if (opts[i] === a.richtig) b.classList.add("richtig"); else if (opts[i] === antwort) b.classList.add("falsch"); });
    }
    erkl.textContent = (ok ? "Richtig! " : "Nicht ganz. ") + a.erklaerung;
    erkl.classList.add(ok ? "gut" : "schlecht");
    zeigeZaehler(r);
    if (ok && serie >= 3) { serieEl.classList.remove("heiss"); void serieEl.offsetWidth; serieEl.classList.add("heiss"); }
    weiter.hidden = false;
    weiter.textContent = r + 1 === runden ? "Ergebnis" : "Weiter";
    const w = await new Promise((loese) => { weiter.onclick = () => loese(true); });
    if (!w || !lebt()) return;
  }
  const beste = speicher.lies("beste", {});
  const neuerRekord = beste[thema.id] == null || richtig > beste[thema.id];
  if (neuerRekord) { beste[thema.id] = richtig; speicher.schreib("beste", beste); }
  if (richtig === runden) { verleihe("zehn-von-zehn"); gibXp(30, "Bonus"); konfetti(); klang.sieg(); }
  else if (richtig >= 8) klang.richtig();
  inhalt.replaceChildren(zurueckKnopf("Übungen", () => zeige("ueben")), h("h2.seitentitel", { text: thema.titel }),
    h("div.box", {}, h("p.ergebnis-sterne", { text: sterne(richtig) }), h("h3", { text: `${richtig} von ${runden} richtig`, style: { textAlign: "center" } }),
      h("p", { style: { textAlign: "center" }, text: richtig === runden ? "Perfekt – das sitzt! Drei Sterne." : richtig >= 8 ? "Stark! Noch eine Runde für den dritten Stern." : richtig >= 5 ? "Gut dabei. Schau noch einmal ins Kapitel, dann klappt der Rest." : "Noch wackelig – lies das passende Kapitel und versuch es gleich noch mal." }),
      neuerRekord ? h("p.hinweis", { style: { textAlign: "center" }, text: "Neue Bestleistung!" }) : null),
    h("div.knopfreihe", { style: { marginTop: "14px" } },
      h("button.knopf.primaer.breit", { type: "button", text: "Noch einmal", onclick: () => zeige("ueben", thema.id) }),
      h("button.knopf.breit", { type: "button", text: "Andere Übung", onclick: () => zeige("ueben") })));
}

/* ================================================================ Spielen */
function spielenAnsicht() {
  if (laufendesSpiel) laufendesSpiel.stop();
  const wurzel = h("div");
  const hilfeName = { voll: "volle Lernhilfe", wenig: "wenig Hilfe", keine: "ohne Hilfe" }[einstellungen.hilfe];
  const staerkeName = ["", "leichte Gegner", "mittlere Gegner", "Profi-Gegner"][einstellungen.staerke];
  inhalt.replaceChildren(wurzel);
  kopfZusatz(`${staerkeName} · ${hilfeName}`);
  laufendesSpiel = new SkatSpiel(wurzel, {
    einstellungen,
    liste: speicher.lies("liste", []),
    aufAenderung: (l) => speicher.schreib("liste", l),
  });
  laufendesSpiel.start().catch((err) => { console.error(err); toast("Fehler im Spiel – neues Spiel wird begonnen", "warn"); if (aktuellerTab === "spielen") spielenAnsicht(); });
}

/* ================================================================ Erfolge */
function erfolgeAnsicht() {
  const liste = speicher.lies("liste", []);
  const f = fortschritt();
  const r = rang(f.xp);
  const summe = [0, 0, 0];
  for (const z of liste) z.punkte.forEach((x, i) => (summe[i] += x));
  const fmt = (x) => (x ? h(`span.${x > 0 ? "plus" : "minus"}`, { text: x > 0 ? `+${x}` : String(x) }) : "–");
  const zeilen = liste.map((z) => h("tr", {}, h("td", { text: String(z.nr) }),
    h("td", {}, z.alleinspieler == null ? "" : `${NAMEN[z.alleinspieler]}: `, z.spiel, z.gewonnen === false ? h("span.marke", { text: "verloren" }) : null),
    ...z.punkte.map((x) => h("td.zahl", {}, fmt(x)))));
  const eigene = liste.filter((z) => z.alleinspieler === 0);
  const gewonnen = eigene.filter((z) => z.gewonnen).length;
  const gegen = liste.filter((z) => z.alleinspieler != null && z.alleinspieler !== 0);
  const verteidigt = gegen.filter((z) => z.gewonnen === false).length;
  const rangIdx = RAENGE.findIndex((x) => x.name === r.name) + 1;
  inhalt.replaceChildren(
    h("h2.seitentitel", { text: "Deine Erfolge" }),
    h("div.box", {}, h("div.rangkarte", {}, h("span.stern", { text: String(rangIdx) }),
      h("div", { style: { flex: "1" } }, h("h3", { text: `Rang ${rangIdx}: ${r.name}` }), h("p.hinweis", { text: r.text }),
        h("div.xpbalken", {}, h("i", { style: { width: `${Math.round(r.anteil * 100)}%` } })),
        h("p.hinweis", { text: r.naechster ? `${f.xp} Erfahrung · noch ${r.naechster.ab - f.xp} bis „${r.naechster.name}“` : `${f.xp} Erfahrung · höchster Rang erreicht` })))),
    h("div.box", {}, h("h3", { text: `Abzeichen (${f.abzeichen.length} von ${ABZEICHEN.length})` }),
      h("div.abzeichenraster", {}, ABZEICHEN.map((a) => h(`div.abzeichen${f.abzeichen.includes(a.id) ? "" : ".offen"}`, { title: a.text }, h("span.ab-icon", { text: a.icon }), h("b", { text: a.name }), h("span", { text: a.text }))))),
    h("h2.seitentitel", { style: { marginTop: "22px", fontSize: "1.35rem" }, text: "Punkteliste" }),
    h("p.untertitel", { text: liste.length ? `${liste.length} Spiel${liste.length > 1 ? "e" : ""} · gewonnen zählt den Spielwert, verloren das Doppelte als Minus.` : "Noch keine Spiele. Geh auf „Spielen“ und reize mit!" }),
    liste.length ? h("div.tafel", {}, h("div.tabellenrahmen", {}, h("table.liste", {},
      h("thead", {}, h("tr", {}, h("th", { text: "Nr." }), h("th", { text: "Spiel" }), ...NAMEN.map((n) => h("th.zahl", { text: n })))),
      h("tbody", {}, zeilen.reverse().slice(0, 30)),
      h("tfoot", {}, h("tr", {}, h("td"), h("td", { text: "Summe" }), ...summe.map((x) => h("td.zahl", { text: String(x) }))))))) : null,
    liste.length ? h("div.box", { style: { marginTop: "14px" } }, h("h3", { text: "Deine Bilanz" }),
      h("p", { text: `Alleinspieler: ${eigene.length} Spiele, ${gewonnen} gewonnen. Gegenspieler: ${gegen.length} Spiele, ${verteidigt}-mal den Alleinspieler besiegt.` })) : null,
    liste.length ? h("div.knopfreihe", { style: { marginTop: "14px" } }, h("button.knopf.breit.leise", { type: "button", text: "Punkteliste neu beginnen", onclick: () => {
      if (confirm("Punkteliste wirklich löschen und neu beginnen? Rang und Abzeichen bleiben.")) { speicher.schreib("liste", []); zeige("liste"); }
    } })) : null,
  );
}

/* ================================================================ Einstellungen */
function einstellungenDialog() {
  const segment = (key, optionen, { lies = () => einstellungen[key], setze = (w) => { einstellungen[key] = w; speicher.schreib("einstellungen", einstellungen); } } = {}) => {
    const seg = h("div.segment");
    const render = () => seg.replaceChildren(...optionen.map((o) => h(`button${lies() === o.wert ? ".aktiv" : ""}`, { type: "button", text: o.text, onclick: () => { setze(o.wert); render(); } })));
    render();
    return seg;
  };
  const zeile = (titel, text, el) => h("div.einstellung", {}, h("div.label", {}, h("b", { text: titel }), h("span", { text })), el);
  const hinter = h("div.dialog-hintergrund");
  const schliessen = () => { hinter.remove(); if (aktuellerTab === "spielen") spielenAnsicht(); };
  hinter.onclick = (e) => { if (e.target === hinter) schliessen(); };
  hinter.append(h("div.dialog", { role: "dialog", "aria-modal": "true" },
    h("h2", { text: "Einstellungen" }),
    zeile("Lernhilfe", "Erklärungen beim Spielen, erlaubte Karten, Tipp, Zug zurück", segment("hilfe", [{ wert: "voll", text: "Voll" }, { wert: "wenig", text: "Wenig" }, { wert: "keine", text: "Keine" }])),
    zeile("Gegner", "Wie stark spielen Lena und Max?", segment("staerke", [{ wert: 1, text: "Leicht" }, { wert: 2, text: "Mittel" }, { wert: 3, text: "Profi" }])),
    zeile("Karte spielen", "Zweimal antippen (sicher) oder sofort beim ersten Tipp", segment("direkt", [{ wert: false, text: "Zweimal" }, { wert: true, text: "Sofort" }])),
    zeile("Töne", "Karten, Stiche, Fanfare", segment("ton", [{ wert: true, text: "An" }, { wert: false, text: "Aus" }], { lies: istTonAn, setze: (w) => { setzeTon(w); if (w) klang.tipp(); } })),
    zeile("Ramsch", "Wenn alle passen: Ramsch (Hausregel) statt neu geben", segment("ramsch", [{ wert: false, text: "Aus" }, { wert: true, text: "An" }])),
    zeile("Kontra / Re", "Gegner können das Spiel verdoppeln (Hausregel)", segment("kontra", [{ wert: false, text: "Aus" }, { wert: true, text: "An" }])),
    h("p.hinweis", { style: { marginTop: "12px" }, text: "Spiel-Einstellungen gelten ab dem nächsten Spiel. Punkteliste, Rang und Abzeichen bleiben erhalten." }),
    h("div.knopfreihe", { style: { marginTop: "14px" } }, h("button.knopf.primaer.breit", { type: "button", text: "Fertig", onclick: schliessen })),
  ));
  document.body.append(hinter);
}
document.getElementById("einstellungen-knopf").onclick = einstellungenDialog;

/* ================================================================ Start */
zeige(speicher.lies("tab", "lernen"));
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
