// Skat lernen – App-Hülle: Bereiche Lernen · Üben · Spielen · Liste, Einstellungen, Offline-Registrierung.
import { h, sleep, debounced, toast, speicher } from "./ui.js";
import { karteElement, kartenName } from "./deck.js";
import { KAPITEL, kapitelAnsicht } from "./lernen.js";
import { THEMEN, erzeugeAufgabe, pruefeAntwort } from "./aufgaben.js";
import { SkatSpiel, STANDARD, NAMEN } from "./spiel.js";

const inhalt = document.getElementById("inhalt");
const tabs = [...document.querySelectorAll(".tabs button")];
let einstellungen = { ...STANDARD, ...speicher.lies("einstellungen", {}) };
let laufendesSpiel = null;
let aktuellerTab = null;

/* ================================================================ Navigation */
const kopfTitel = document.querySelector(".kopf-titel");
const kopfZusatz = (text) => { kopfTitel.replaceChildren("Skat lernen", ...(text ? [h("small", { text })] : [])); };
function zeige(tab, unter = null) {
  if (laufendesSpiel && tab !== "spielen") { laufendesSpiel.stop(); laufendesSpiel = null; }
  kopfZusatz("");
  aktuellerTab = tab;
  tabs.forEach((b) => b.classList.toggle("aktiv", b.dataset.tab === tab));
  inhalt.classList.toggle("spielfeld", tab === "spielen");
  inhalt.scrollTo?.(0, 0); window.scrollTo(0, 0);
  speicher.schreib("tab", tab);
  ({ lernen: lernenAnsicht, ueben: uebenAnsicht, spielen: spielenAnsicht, liste: listeAnsicht })[tab](unter);
}
tabs.forEach((b) => (b.onclick = () => zeige(b.dataset.tab)));

const zurueckKnopf = (text, fn) => h("button.zurueck", { type: "button", text: `‹ ${text}`, onclick: fn });

/* ================================================================ Lernen */
function lernenAnsicht(kapId = null) {
  const gelesen = new Set(speicher.lies("gelesen", []));
  if (kapId) {
    const kap = KAPITEL.find((k) => k.id === kapId);
    const idx = KAPITEL.indexOf(kap);
    const naechstes = KAPITEL[idx + 1];
    gelesen.add(kap.id); speicher.schreib("gelesen", [...gelesen]);
    inhalt.replaceChildren(
      zurueckKnopf("Alle Kapitel", () => zeige("lernen")),
      h("h2.seitentitel", { text: `${idx + 1}. ${kap.titel}` }),
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
    h("p.untertitel", { text: "Acht kurze Kapitel – von den Karten bis zur Abrechnung. Danach üben und spielen." }),
    ...KAPITEL.map((kap, i) => h("button.kachel", { type: "button", onclick: () => zeige("lernen", kap.id) },
      h("div.zeile", {}, h("span.nummer", { text: String(i + 1) }), h("div", { style: { flex: "1" } }, h("h3", { text: kap.titel }), h("p", { text: kap.kurz })), gelesen.has(kap.id) ? h("span.fertig", { text: "✓" }) : null))),
    h("div.box", { style: { marginTop: "18px" } }, h("h3", { text: "So lernst du am besten" }), h("p", { text: "Lies ein Kapitel, mache die passende Übung und spiele dann ein paar Runden mit voller Lernhilfe. Die Hilfe erklärt dir beim Spielen jeden Zug. Wenn du sicherer wirst, schalte sie in den Einstellungen (⚙︎) herunter." })),
  );
}
const passendesThema = (kapId) => ({ karten: "augen", spielarten: "trumpf", bedienen: "bedienen", reizen: "reizwert", abrechnen: "spielwert", taktik: "alles", tisch: "stich", woerter: "alles" })[kapId] ?? "alles";

/* ================================================================ Üben */
function uebenAnsicht(themaId = null) {
  const beste = speicher.lies("beste", {});
  if (themaId) return quiz(THEMEN.find((t) => t.id === themaId));
  inhalt.replaceChildren(
    h("h2.seitentitel", { text: "Üben" }),
    h("p.untertitel", { text: "Je 10 Aufgaben. Falsch beantwortete Aufgaben werden erklärt." }),
    ...THEMEN.map((t) => h("button.kachel", { type: "button", onclick: () => zeige("ueben", t.id) },
      h("div.zeile", {}, h("div", { style: { flex: "1" } }, h("h3", { text: t.titel }), h("p", { text: t.text })), beste[t.id] != null ? h("span.best", { text: `Beste: ${beste[t.id]}/10` }) : null))),
  );
}

async function quiz(thema) {
  const runden = 10;
  let richtig = 0;
  const zaehler = h("div.zaehler");
  const balken = h("div.balken", {}, h("i"));
  const frageEl = h("p.qfrage");
  const stichEl = h("div.imstich");
  const platz = h("div.kartenwahl");
  const antworten = h("div.antworten");
  const erkl = h("div.erklaerung");
  const weiter = h("button.knopf.primaer.breit", { type: "button", text: "Weiter", hidden: true });
  inhalt.replaceChildren(zurueckKnopf("Übungen", () => zeige("ueben")), h("h2.seitentitel", { text: thema.titel }),
    h("div.quiz", {}, zaehler, balken, frageEl, stichEl, platz, antworten, erkl, weiter));
  const lebt = () => aktuellerTab === "ueben" && inhalt.contains(frageEl);

  let letzterTyp = null;
  for (let r = 0; r < runden; r++) {
    if (!lebt()) return;
    let typ = thema.typen[r % thema.typen.length];
    if (thema.typen.length > 1 && typ === letzterTyp) typ = thema.typen[(r + 1) % thema.typen.length];
    letzterTyp = typ;
    const a = erzeugeAufgabe(typ);
    zaehler.replaceChildren(h("span", { text: `Aufgabe ${r + 1} von ${runden}` }), h("span", { text: `${richtig} richtig` }));
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
        platz.replaceChildren(...a.karten.map((k) => { const el = karteElement(k, { tag: "button" }); el.type = "button"; el.onclick = debounced(() => loese(k.id)); return el; }));
      } else {
        platz.replaceChildren(...a.karten.map((k) => karteElement(k)));
        const opts = a.antwort === "janein" ? [{ w: true, t: "Ja, Trumpf" }, { w: false, t: "Nein" }] : a.optionen.map((o) => ({ w: o, t: String(o) }));
        antworten.replaceChildren(...opts.map((o) => h("button.knopf", { type: "button", text: o.t, onclick: debounced(() => loese(o.w)) })));
      }
    });
    if (antwort == null || !lebt()) return;
    const ok = pruefeAntwort(a, antwort);
    if (ok) richtig++;
    // Lösung zeigen
    if (a.antwort === "karte") {
      platz.querySelectorAll("button.karte").forEach((b, i) => { b.onclick = null; b.classList.add(a.richtig.includes(a.karten[i].id) ? "markiert" : "blass"); });
    } else {
      const opts = a.antwort === "janein" ? [true, false] : a.optionen;
      antworten.querySelectorAll("button").forEach((b, i) => { b.onclick = null; b.disabled = true; if (opts[i] === a.richtig) b.classList.add("richtig"); else if (opts[i] === antwort) b.classList.add("falsch"); });
    }
    erkl.textContent = (ok ? "Richtig! " : "Nicht ganz. ") + a.erklaerung;
    erkl.classList.add(ok ? "gut" : "schlecht");
    zaehler.lastChild.textContent = `${richtig} richtig`;
    weiter.hidden = false;
    weiter.textContent = r + 1 === runden ? "Ergebnis" : "Weiter";
    const w = await new Promise((loese) => { weiter.onclick = () => loese(true); });
    if (!w || !lebt()) return;
  }
  const beste = speicher.lies("beste", {});
  const neuerRekord = beste[thema.id] == null || richtig > beste[thema.id];
  if (neuerRekord) { beste[thema.id] = richtig; speicher.schreib("beste", beste); }
  inhalt.replaceChildren(zurueckKnopf("Übungen", () => zeige("ueben")), h("h2.seitentitel", { text: thema.titel }),
    h("div.box", {}, h("h3", { text: `${richtig} von ${runden} richtig` }),
      h("p", { text: richtig === runden ? "Perfekt – das sitzt!" : richtig >= 7 ? "Gut! Noch eine Runde, dann sitzt es." : "Schau noch einmal ins passende Kapitel und versuch es dann wieder." }),
      neuerRekord ? h("p.hinweis", { text: "Neue Bestleistung." }) : null),
    h("div.knopfreihe", { style: { marginTop: "14px" } },
      h("button.knopf.primaer.breit", { type: "button", text: "Noch einmal", onclick: () => zeige("ueben", thema.id) }),
      h("button.knopf.breit", { type: "button", text: "Andere Übung", onclick: () => zeige("ueben") })));
}

/* ================================================================ Spielen */
function spielenAnsicht() {
  if (laufendesSpiel) laufendesSpiel.stop();
  const wurzel = h("div");
  const hilfeName = { voll: "volle Lernhilfe", wenig: "wenig Hilfe", keine: "ohne Hilfe" }[einstellungen.hilfe];
  const staerkeName = ["", "Anfänger", "Vereinsspieler", "Profi"][einstellungen.staerke];
  inhalt.replaceChildren(wurzel);
  kopfZusatz(`${staerkeName} · ${hilfeName}`);
  laufendesSpiel = new SkatSpiel(wurzel, {
    einstellungen,
    liste: speicher.lies("liste", []),
    aufAenderung: (l) => speicher.schreib("liste", l),
  });
  laufendesSpiel.start().catch((err) => { console.error(err); toast("Fehler im Spiel – neues Spiel wird begonnen", "warn"); if (aktuellerTab === "spielen") spielenAnsicht(); });
}

/* ================================================================ Liste */
function listeAnsicht() {
  const liste = speicher.lies("liste", []);
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
  inhalt.replaceChildren(
    h("h2.seitentitel", { text: "Punkteliste" }),
    h("p.untertitel", { text: liste.length ? `${liste.length} Spiel${liste.length > 1 ? "e" : ""} · gewonnen zählt den Spielwert, verloren das Doppelte als Minus.` : "Noch keine Spiele. Geh auf „Spielen“ und reize mit!" }),
    liste.length ? h("div.tabellenrahmen", {}, h("table.liste", {},
      h("thead", {}, h("tr", {}, h("th", { text: "Nr." }), h("th", { text: "Spiel" }), ...NAMEN.map((n) => h("th.zahl", { text: n })))),
      h("tbody", {}, zeilen.reverse()),
      h("tfoot", {}, h("tr", {}, h("td"), h("td", { text: "Summe" }), ...summe.map((x) => h("td.zahl", { text: String(x) })))))) : null,
    liste.length ? h("div.box", { style: { marginTop: "14px" } }, h("h3", { text: "Deine Bilanz" }),
      h("p", { text: `Alleinspieler: ${eigene.length} Spiele, ${gewonnen} gewonnen. Gegenspieler: ${gegen.length} Spiele, ${verteidigt}-mal den Alleinspieler besiegt.` })) : null,
    liste.length ? h("div.knopfreihe", { style: { marginTop: "14px" } }, h("button.knopf.breit", { type: "button", text: "Neue Liste beginnen", onclick: () => {
      if (confirm("Punkteliste wirklich löschen und neu beginnen?")) { speicher.schreib("liste", []); zeige("liste"); }
    } })) : null,
  );
}

/* ================================================================ Einstellungen */
function einstellungenDialog() {
  const segment = (key, optionen) => {
    const seg = h("div.segment");
    const render = () => seg.replaceChildren(...optionen.map((o) => h(`button${einstellungen[key] === o.wert ? ".aktiv" : ""}`, { type: "button", text: o.text, onclick: () => { einstellungen[key] = o.wert; speicher.schreib("einstellungen", einstellungen); render(); } })));
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
    zeile("Ramsch", "Wenn alle passen: Ramsch (Hausregel) statt neu geben", segment("ramsch", [{ wert: false, text: "Aus" }, { wert: true, text: "An" }])),
    zeile("Kontra / Re", "Gegner können das Spiel verdoppeln (Hausregel)", segment("kontra", [{ wert: false, text: "Aus" }, { wert: true, text: "An" }])),
    h("p.hinweis", { style: { marginTop: "12px" }, text: "Änderungen gelten ab dem nächsten Spiel. Die Punkteliste bleibt erhalten." }),
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
