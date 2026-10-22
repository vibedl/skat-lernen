// Skat gegen zwei Computer (Lena und Max) mit Lernhilfe. Regeln: skatregeln.js, Computer: skatki.js.
import { h, sleep, debounced, toast, speicher } from "./ui.js";
import { karteElement, kartenName, BLAETTER, farbSymbol } from "./deck.js";
import { denkpause } from "./engine.js";
import {
  neuesSkatSpiel, reizFrage, reizAntwort, reizErgebnis, nimmSkat, druecke, sageAn, starteRamsch,
  spieleKarte, gueltigeKarten, spielErgebnis, sortiereSkatHand, spielName, farbNameSkat, neuesSpielObjekt,
  spitzen, spielwert, nullWert, istBube, augenSumme, bedienFarbe, istTrumpf, schlaegt, stichSieger, kartenStaerke, augen,
} from "./skatregeln.js";
import { kiReizAntwort, kiHandSpiel, kiDrueckenUndAnsagen, kiKarte, kiKontra, kiRe, reizLimit, spielKandidaten } from "./skatki.js";
import { klang, konfetti, gibXp, zaehle, zaehler, verleihe, gesicht, sprechblase, spruch } from "./spass.js";

export const NAMEN = ["Du", "Lena", "Max"];
const BLATT = "franzoesisch";
const FARBEN_UI = BLAETTER[BLATT].farben;

export const STANDARD = { hilfe: "voll", staerke: 2, ramsch: false, kontra: false, direkt: false };

const istPartei = (sp, i, j) => (sp.spiel?.art === "ramsch" ? i === j : i === j || (i !== sp.alleinspieler && j !== sp.alleinspieler));

/** Warum hat diese Karte den Stich gewonnen? */
export function stichErklaerung(st, spiel) {
  const sieger = st.karten[stichSieger(st.karten, spiel)];
  const erste = st.karten[0];
  if (spiel.art === "null") return `Im Null gewinnt die höchste Karte der angespielten Farbe (A K D B 10 9 8 7): ${kartenName(sieger)}.`;
  if (spiel.art === "ramsch") return `${kartenName(sieger)} war die höchste Karte – im Ramsch sind nur die Buben Trumpf.`;
  if (istTrumpf(sieger, spiel) && !istTrumpf(erste, spiel)) return `${kartenName(sieger)} ist Trumpf und sticht ${farbNameSkat(erste.farbe, BLATT)}.`;
  if (istTrumpf(sieger, spiel)) return `Trumpf wurde angespielt – der höchste Trumpf gewinnt: ${kartenName(sieger)}.`;
  return `Kein Trumpf im Stich – die höchste ${farbNameSkat(erste.farbe, BLATT)}-Karte gewinnt: ${kartenName(sieger)}.`;
}

/** Kurze Begründung für einen Tipp. */
function tippGrund(sp, karte) {
  const spiel = sp.spiel;
  const pos = sp.stich.karten.length;
  const allein = sp.alleinspieler === 0;
  if (spiel.art === "null") return allein ? "Im Null immer möglichst klein bleiben." : "Zwing den Alleinspieler, hoch zu gehen.";
  if (pos === 0) {
    if (istTrumpf(karte, spiel)) return allein ? "Trumpf ziehen: Die Gegner müssen Trumpf zugeben und werden ihre Trümpfe los." : "Trumpf ausspielen – hier passt es.";
    if (karte.rang === 7) return "Ass abholen: Es ist die höchste Karte der Farbe und bringt 11 Augen.";
    return "Kleine Karte ausspielen – kostet nichts und lässt die anderen zuerst Farbe zeigen.";
  }
  const si = stichSieger(sp.stich.karten, spiel);
  const best = sp.stich.karten[si];
  const bestSpieler = sp.stich.spieler[si];
  const au = augenSumme(sp.stich.karten);
  if (schlaegt(karte, best, spiel)) return `Gewinnt den Stich${au ? ` (${au} Augen liegen schon drin)` : ""}.`;
  if (istPartei(sp, 0, bestSpieler) && bestSpieler !== 0) return "Schmieren: Dein Partner macht den Stich – gib ihm Augen dazu.";
  return "Du kannst den Stich nicht gewinnen – also die billigste Karte abwerfen.";
}

/** Zeilen für die Rechnung am Spielende. */
export function rechnungZeilen(e, spiel) {
  const z = [];
  if (spiel.art === "null") {
    z.push([spielName(spiel, BLATT), String(e.wert)]);
    return z;
  }
  let st = e.spitzen.anzahl;
  z.push([`${e.spitzen.mit ? "Mit" : "Ohne"} ${e.spitzen.anzahl}`, String(st)]);
  z.push(["Spiel", String(++st)]);
  if (spiel.hand) z.push(["Hand", String(++st)]);
  const sw = e.schwarz || spiel.schwarzAngesagt;
  const sn = e.schneider || sw || spiel.schneiderAngesagt;
  if (sn) z.push(["Schneider", String(++st)]);
  if (spiel.schneiderAngesagt) z.push(["Schneider angesagt", String(++st)]);
  if (sw) z.push(["Schwarz", String(++st)]);
  if (spiel.schwarzAngesagt) z.push(["Schwarz angesagt", String(++st)]);
  if (spiel.ouvert) z.push(["Ouvert", String(++st)]);
  z.push([`${st} × Grundwert ${e.grund}`, String(st * e.grund)]);
  return z;
}

export class SkatSpiel {
  /**
   * @param wurzel  Element, in das der Tisch gebaut wird
   * @param opts.einstellungen  { hilfe, staerke, ramsch, kontra, direkt }
   * @param opts.liste  bisherige Punkteliste (Array), wird fortgeschrieben
   * @param opts.aufAenderung  (liste) => void – wenn sich die Liste ändert
   */
  constructor(wurzel, { einstellungen = STANDARD, liste = [], aufAenderung = () => {} } = {}) {
    this.wurzel = wurzel;
    this.e = { ...STANDARD, ...einstellungen };
    this.liste = liste;
    this.aufAenderung = aufAenderung;
    this.lebt = true;
    this._ende = null;
    this.sp = null;
    this.undo = null;
    this.reizDran = null;
    this.neueAbzeichen = [];
    this.bauen();
  }

  get voll() { return this.e.hilfe === "voll"; }
  get wenig() { return this.e.hilfe !== "keine"; }
  staerke(p) { return p === 0 ? 3 : this.e.staerke; }

  stop() { this.lebt = false; if (this._ende) this._ende(null); }

  /* ---------------------------------------------------------------- Aufbau */
  bauen() {
    this.gegner = [1, 2].map((p) => {
      const name = h("span.gname", { text: NAMEN[p] });
      const rolle = h("span.rolle");
      const info = h("span.ginfo");
      const kopf = gesicht(NAMEN[p], "neutral");
      const el = h(`div.gegner${p === 2 ? ".rechts" : ""}`, {}, kopf, h("div", {}, h("div", {}, name, rolle), info));
      return { el, rolle, info, kopf, laune: "neutral" };
    });
    this.statusEl = h("p.status", { "aria-live": "polite" });
    this.augenEl = h("p.status.klein");
    this.slots = [0, 1, 2].map((p) => {
      const karte = h("div.pkarte");
      const name = h("span.pname", { text: NAMEN[p] });
      return { el: h(`div.platz.p${p}`, {}, karte, name), karte, name };
    });
    this.mitteInfo = h("div.mitteinfo");
    this.stichEl = h("div.stich", {}, this.slots.map((s) => s.el), this.mitteInfo);
    this.hilfeEl = h("div.lernhilfe");
    this.gespieltEl = h("div.gespielt");
    this.offenEl = h("div.offen");
    this.handInfo = h("div.hand-info");
    this.handEl = h("div.hand", { role: "group", "aria-label": "Deine Karten" });
    this.aktionenEl = h("div.aktionen");
    this.tisch = h("div.tisch", {}, h("div.gegnerreihe", {}, this.gegner.map((g) => g.el)), this.statusEl, this.stichEl, this.augenEl, this.hilfeEl, this.gespieltEl, this.offenEl, this.aktionenEl, (this.handBereich = h("div.hand-bereich", {}, this.handInfo, this.handEl)));
    this.wurzel.replaceChildren(this.tisch);
  }

  status(text) { this.statusEl.textContent = text; }
  /** Gesichtsausdruck eines Gegners ändern. */
  laune(p, laune) {
    const g = this.gegner[p - 1]; if (!g || g.laune === laune) return;
    const neu = gesicht(NAMEN[p], laune); g.kopf.replaceWith(neu); g.kopf = neu; g.laune = laune;
  }
  sagt(p, text, opts) { if (p > 0) sprechblase(this.gegner[p - 1].el, text, opts); }
  hilfe(inhalt) {
    if (!inhalt) { this.hilfeEl.replaceChildren(); return; }
    if (typeof inhalt === "string") this.hilfeEl.innerHTML = inhalt;
    else this.hilfeEl.replaceChildren(inhalt);
  }

  /** Auf eine Eingabe warten; aufbau(ende) hängt Handler an. Bei stop() → null. */
  warte(aufbau, aufraeumen = () => {}) {
    return new Promise((resolve) => {
      let fertig = false;
      const ende = (w) => { if (fertig) return; fertig = true; this._ende = null; aufraeumen(); resolve(w); };
      this._ende = ende;
      if (!this.lebt) return ende(null);
      aufbau(ende);
    });
  }
  async pause(ms) { await sleep(ms); return this.lebt; }

  /* ---------------------------------------------------------------- Anzeige */
  rolle(p) {
    const sp = this.sp;
    if (!sp) return "";
    if (sp.spiel?.art === "ramsch") return "";
    if (sp.alleinspieler == null) {
      if (sp.reizung && !sp.reizung.ende) return p === sp.reizung.vorhand ? "Vorhand" : p === sp.reizung.mittelhand ? "Mittelhand" : "Hinterhand";
      return p === sp.geber ? "gibt" : "";
    }
    return p === sp.alleinspieler ? "Alleinspieler" : "Gegenspieler";
  }
  augenText() {
    const sp = this.sp;
    if (!sp?.spiel || !this.wenig) return "";
    if (sp.spiel.art === "ramsch") return `Deine Augen: ${sp.augen[0]} · Lena ${sp.augen[1]} · Max ${sp.augen[2]}`;
    if (sp.spiel.art === "null") return sp.alleinspieler === 0 ? "Null: Du darfst keinen Stich machen." : `${NAMEN[sp.alleinspieler]} darf keinen Stich machen.`;
    const a = sp.alleinspieler;
    const eigen = a === 0 ? sp.augen[0] : sp.augen[0] + sp.augen[a === 1 ? 2 : 1];
    const fremd = a === 0 ? sp.augen[1] + sp.augen[2] : sp.augen[a];
    const ziel = a === 0 ? 61 : 60;
    return `Augen – deine Seite: ${eigen} von ${ziel} nötig · andere Seite: ${fremd}`;
  }
  zeichneSlots(karten = this.sp.stich.karten, spieler = this.sp.stich.spieler, neuId = null) {
    this.slots.forEach((s, p) => {
      const idx = spieler.indexOf(p);
      if (idx >= 0) {
        const el = karteElement(karten[idx]);
        if (karten[idx].id === neuId) el.classList.add("flieg");
        s.karte.replaceChildren(el);
      } else s.karte.replaceChildren(h("div.leer"));
      s.el.classList.toggle("amzug", this.sp.amZug === p && !this.sp.fertig);
      s.name.textContent = p === 0 ? "Du" : NAMEN[p];
    });
  }
  zeichne(neuId = null) {
    const sp = this.sp;
    [1, 2].forEach((p) => {
      const g = this.gegner[p - 1];
      g.el.classList.toggle("aktiv", sp.amZug === p || this.reizDran === p);
      g.rolle.textContent = this.rolle(p);
      g.rolle.hidden = !g.rolle.textContent;
      g.info.textContent = `${sp.haende[p].length} Karten${sp.stichZahl[p] ? ` · ${sp.stichZahl[p]} Stich${sp.stichZahl[p] > 1 ? "e" : ""}` : ""}`;
    });
    const teile = [];
    if (sp.spiel) {
      teile.push(sp.spiel.art === "ramsch" ? "Ramsch" : `${sp.alleinspieler === 0 ? "Du spielst" : `${NAMEN[sp.alleinspieler]} spielt`} ${spielName(sp.spiel, BLATT)}`);
      if (sp.reizwert) teile.push(`gereizt bis ${sp.reizwert}`);
      if (sp.kontra) teile.push(sp.re ? "Kontra und Re" : "Kontra");
    } else if (sp.reizung.wert) teile.push(`gereizt bis ${sp.reizung.wert}`);
    this.mitteInfo.textContent = teile.join(" · ");
    this.augenEl.textContent = this.augenText();
    this.zeichneSlots(undefined, undefined, neuId);
    // Gespielte Karten (nur volle Hilfe)
    if (this.voll && sp.stiche.length && sp.spiel) {
      const alle = sp.stiche.flatMap((s) => s.karten);
      const zeilen = [];
      const buben = alle.filter(istBube);
      if (sp.spiel.art !== "null" && buben.length) zeilen.push(h("span.gzeile", {}, h("b", { text: "Buben:" }), buben.map((b) => farbNameSkat(b.farbe, BLATT)).join(", ")));
      for (const f of FARBEN_UI) {
        const ks = alle.filter((x) => x.farbe === f.id && (sp.spiel.art === "null" || !istBube(x))).sort((a, b) => kartenStaerke(b, sp.spiel) - kartenStaerke(a, sp.spiel));
        if (ks.length) zeilen.push(h(`span.gzeile.${f.css}`, {}, farbSymbol(f), h("b", { text: `${f.name}:` }), ks.map((x) => x.wert).join(" ")));
      }
      this.gespieltEl.replaceChildren(h("b", { text: "Schon gespielt:" }), ...zeilen);
    } else this.gespieltEl.replaceChildren();
    if (sp.spiel?.ouvert && sp.alleinspieler > 0) {
      this.offenEl.replaceChildren(h("span", { text: `Offene Karten von ${NAMEN[sp.alleinspieler]}:` }),
        h("div.kartenreihe", {}, sortiereSkatHand(sp.haende[sp.alleinspieler], sp.spiel).map((x) => karteElement(x))));
    } else this.offenEl.replaceChildren();
  }

  handAnzeige() { return sortiereSkatHand(this.sp.haende[0], this.sp.spiel); }

  /**
   * Eigene Hand zeichnen. opts: waehlbar, spielbar(k), gewaehltId, tippId, onTap(k)
   */
  zeigeHand(hand, { waehlbar = false, spielbar = () => true, gewaehlt = new Set(), tippId = null, onTap = null, markiere = false, austeilen = false } = {}) {
    this.handEl.classList.toggle("waehlbar", waehlbar);
    this.handBereich.hidden = hand.length === 0;
    const n = hand.length;
    this.handEl.replaceChildren(...hand.map((k, i) => {
      const el = karteElement(k, { tag: onTap ? "button" : "div" });
      if (onTap) { el.type = "button"; el.onclick = debounced(() => onTap(k)); }
      if (waehlbar && markiere) el.classList.add(spielbar(k) ? "spielbar" : "unspielbar");
      if (gewaehlt.has(k.id)) el.classList.add("gewaehlt");
      if (tippId === k.id) el.classList.add("tipp");
      const mitte = (n - 1) / 2, d = (i - mitte) * (n > 8 ? 2.2 : 3.2);
      el.style.setProperty("--dreh", `${d}deg`);
      el.style.setProperty("--heb", `${Math.abs(i - mitte) * 1.6}px`);
      if (austeilen) { el.classList.add("austeilen"); el.style.setProperty("--verz", `${i * 0.07}s`); }
      return h("div.slot", {}, el);
    }));
  }

  aktionen(...knoepfe) { this.aktionenEl.replaceChildren(...knoepfe.filter(Boolean)); }

  /** Frage mit Antwortknöpfen. optionen: [{id, text, primaer, klasse, voll}] */
  frage(text, optionen, { hilfe = null } = {}) {
    return this.warte((ende) => {
      const raster = h("div.wahlraster", {}, optionen.map((o) => h(`button.knopf${o.primaer ? ".primaer" : ""}${o.voll ? ".voll" : ""}${o.klasse ? "." + o.klasse : ""}`, { type: "button", text: o.text, onclick: debounced(() => ende(o.id)) })));
      this.aktionen(h("p.frage", { text }), raster);
      if (hilfe) this.hilfe(hilfe);
    }, () => { this.aktionen(); });
  }

  /* ---------------------------------------------------------------- Reizen */
  async reizen() {
    const sp = this.sp;
    while (reizFrage(sp.reizung)) {
      const f = reizFrage(sp.reizung);
      this.reizDran = f.spieler;
      this.zeichne();
      this.zeigeHand(this.handAnzeige());
      if (f.spieler === 0) {
        let hilfe = null;
        if (this.voll) {
          const lim = reizLimit(sp.haende[0], 3);
          const kand = spielKandidaten(sp.haende[0]).filter((c) => c.marge >= 0).sort((a, b) => b.marge - a.marge)[0];
          const rollen = `Du bist <b>${this.rolle(0)}</b>. ${f.art === "hoeren" ? `${NAMEN[sp.reizung.sager]} sagt dir einen Wert; mit „Ja“ hältst du, mit „Passe“ steigst du aus.` : f.art === "sagen" ? `Du sagst ${NAMEN[sp.reizung.hoerer]} Werte an – oder passt.` : "Beide haben gepasst. Du darfst mit 18 selbst spielen."}`;
          const blatt = lim ? `Dein Blatt reicht etwa bis <b>${lim}</b>${kand ? ` (${spielName(kand.spiel, BLATT)}, ${spitzen(sp.haende[0], kand.spiel).mit ? "mit" : "ohne"} ${spitzen(sp.haende[0], kand.spiel).anzahl})` : ""}.` : "Dein Blatt ist eher schwach – <b>Passen</b> ist völlig in Ordnung.";
          hilfe = `${rollen}<br>${blatt}`;
        } else if (this.wenig) {
          hilfe = `Du bist <b>${this.rolle(0)}</b>.`;
        }
        let text, ja;
        if (f.art === "sagen") { text = `Willst du ${f.wert} sagen?`; ja = `${f.wert} sagen`; }
        else if (f.art === "hoeren") { text = `${NAMEN[sp.reizung.sager]} sagt ${f.wert}. Hältst du?`; ja = `Ja, ${f.wert}`; }
        else { text = "Beide haben gepasst. Spielst du selbst für 18?"; ja = "Ja, ich spiele"; }
        const a = await this.frage(text, [{ id: "ja", text: ja, primaer: true }, { id: "passe", text: "Passe" }], { hilfe });
        this.hilfe();
        if (!a) return false;
        reizAntwort(sp.reizung, a === "ja");
        this.status(a === "ja" ? (f.art === "hoeren" ? "Du: „Ja.“" : `Du: „${f.wert}.“`) : "Du: „Passe.“");
        if (a === "ja") klang.reiz();
        if (!(await this.pause(600))) return false;
      } else {
        this.status(`${NAMEN[f.spieler]} überlegt …`);
        this.laune(f.spieler, "denkt");
        if (!(await this.pause(denkpause(Math.random, 700)))) return false;
        const ja = kiReizAntwort(sp, f.spieler, this.staerke(f.spieler));
        reizAntwort(sp.reizung, ja);
        const name = NAMEN[f.spieler];
        this.status(!ja ? `${name}: „Passe.“` : f.art === "hoeren" ? `${name}: „Ja.“` : f.art === "vorhand" ? `${name} spielt selbst für 18.` : `${name}: „${f.wert}.“`);
        this.sagt(f.spieler, !ja ? spruch("passe") : f.art === "hoeren" ? spruch("ja") : f.art === "vorhand" ? "Ich spiel!" : `${f.wert}!`, { klasse: ja ? "laut" : "" });
        if (ja) klang.reiz();
        this.laune(f.spieler, ja ? "stolz" : "neutral");
        this.zeichne();
        if (!(await this.pause(1000))) return false;
      }
    }
    this.reizDran = null;
    return true;
  }

  /* ---------------------------------------------------------------- Mensch ist Alleinspieler */
  waehleZwei(hand, { text, knopf, tippFn = null }) {
    let gew = [];
    let tipp = new Set();
    return this.warte((ende) => {
      const los = h("button.knopf.primaer.breit", { type: "button", text: knopf, disabled: true });
      const render = () => {
        this.zeigeHand(hand, {
          waehlbar: true, gewaehlt: new Set(gew.map((g) => g.id)),
          onTap: (k) => {
            if (gew.some((g) => g.id === k.id)) gew = gew.filter((g) => g.id !== k.id);
            else { gew.push(k); if (gew.length > 2) gew.shift(); }
            los.disabled = gew.length !== 2;
            this.handInfo.textContent = gew.length ? `Gewählt: ${gew.map(kartenName).join(" und ")}` : "";
            render();
          },
        });
        this.handEl.querySelectorAll(".karte").forEach((el, i) => el.classList.toggle("tipp", tipp.has(hand[i].id)));
      };
      los.onclick = debounced(() => { if (gew.length === 2) ende(gew); });
      const reihe = [los];
      if (tippFn) reihe.push(h("button.knopf.breit", { type: "button", text: "Tipp: Was würde ein Profi drücken?", onclick: debounced(() => { tipp = new Set(tippFn()); render(); }) }));
      this.aktionen(h("p.frage", { text }), ...reihe);
      render();
    }, () => { this.aktionen(); this.handInfo.textContent = ""; });
  }

  async menschAnsage(wert) {
    const sp = this.sp;
    const kartenMitSkat = [...sp.urHaende[0], ...sp.urSkat];
    const a = await this.frage(`Du spielst, gereizt bis ${wert}. Nimmst du den Skat auf?`,
      [{ id: "skat", text: "Skat aufnehmen", primaer: true }, { id: "hand", text: "Hand spielen" }],
      { hilfe: this.voll ? "<b>Skat aufnehmen</b>: Du siehst die zwei Karten, nimmst sie in die Hand und drückst dann zwei beliebige Karten. <b>Hand</b>: Der Skat bleibt liegen, dein Spiel ist eine Stufe mehr wert – nur bei sehr gutem Blatt." : null });
    if (!a) return false;
    const hand = a === "hand";
    if (!hand) {
      const skatKarten = [...sp.skat];
      nimmSkat(sp, 0);
      this.slots.forEach((s) => s.karte.replaceChildren());
      this.slots[0].karte.replaceChildren(h("div.skatzeige", {}, skatKarten.map((x) => karteElement(x))));
      this.status(`Im Skat lagen ${skatKarten.map(kartenName).join(" und ")}.`);
      this.zeigeHand(sortiereSkatHand(sp.haende[0], null));
      if (!(await this.pause(1800))) return false;
      if (this.voll) this.hilfe("Drücke zwei Karten, die du nicht brauchst: zum Beispiel eine blanke Zehn oder einen König ohne Ass – die bringen Augen, würden aber verloren gehen. Trümpfe und Asse behalten. Die gedrückten Karten zählen am Ende für dich.");
      const zwei = await this.waehleZwei(sortiereSkatHand(sp.haende[0], null), {
        text: "Tippe zwei Karten an, die du drückst.", knopf: "Diese zwei drücken",
        tippFn: this.voll ? () => kiDrueckenUndAnsagen(sp.haende[0], wert, 3).druecken.map((x) => x.id) : null,
      });
      if (!zwei) return false;
      druecke(sp, 0, zwei);
      this.hilfe();
      this.zeichneSlots([], []);
    }
    this.zeigeHand(sortiereSkatHand(sp.haende[0], null));

    while (this.lebt) {
      // Lernhilfe: Tabelle aller Spielarten
      let hilfe = null;
      if (this.wenig) {
        const tab = h("table", {}, h("tr", {}, h("th", { text: "Spiel" }), h("th", { text: "Spitzen" }), h("th.zahl", { text: "Wert" }), h("th", { text: "" })));
        const kand = spielKandidaten(sp.haende[0], kartenMitSkat);
        for (const c of kand) {
          const s = neuesSpielObjekt(c.spiel.art, { ...c.spiel, hand });
          const spz = spitzen(kartenMitSkat, s);
          const w = s.art === "null" ? nullWert(s) : spielwert(s, { spitzenAnzahl: spz.anzahl }).wert;
          const max = s.art === "null" ? w : spielwert(s, { spitzenAnzahl: spz.anzahl, schneider: true }).wert;
          const klasse = w >= wert ? "reicht" : max >= wert ? "knapp" : "nein";
          const urteil = w >= wert ? (c.marge >= 0 ? "✔ passt zum Blatt" : "reicht, Blatt eher schwach") : max >= wert ? "nur mit Schneider" : "zu wenig – überreizt";
          tab.append(h(`tr.${klasse}`, {}, h("td", { text: spielName(s, BLATT) }), h("td", { text: s.art === "null" ? "–" : `${spz.mit ? "mit" : "ohne"} ${spz.anzahl}` }), h("td.zahl", { text: String(w) }), h("td", { text: this.voll ? urteil : (w >= wert ? "✔" : "✘") })));
        }
        hilfe = h("div", {}, h("div", { html: `Gereizt: <b>${wert}</b>. Dein Spiel muss mindestens so viel wert sein.` }), tab);
      }
      const farben = FARBEN_UI.map((f) => ({ id: f.id, text: `${f.symbol} ${f.name}` }));
      const art = await this.frage("Welches Spiel sagst du an?", [...farben, { id: "grand", text: "Grand" }, { id: "null", text: "Null" }], { hilfe });
      this.hilfe();
      if (!art) return false;
      let spiel = art === "grand" || art === "null" ? neuesSpielObjekt(art, { hand }) : neuesSpielObjekt("farbe", { trumpf: art, hand });
      if (art === "null") {
        const o = await this.frage("Null offen (ouvert) spielen? Dann sehen alle deine Karten – zählt 46 statt 23.", [{ id: "nein", text: "Nein, verdeckt", primaer: true }, { id: "ja", text: "Ja, ouvert" }]);
        if (!o) return false;
        if (o === "ja") spiel = neuesSpielObjekt("null", { hand, ouvert: true });
      } else if (hand) {
        const o = await this.frage("Möchtest du etwas ansagen? (Jede Ansage: eine Stufe mehr – aber du musst sie auch schaffen.)", [
          { id: "nichts", text: "Nichts ansagen", primaer: true, voll: true }, { id: "schneider", text: "Schneider" },
          { id: "schwarz", text: "Schwarz" }, { id: "ouvert", text: "Ouvert (offen)", voll: true }]);
        if (!o) return false;
        spiel = neuesSpielObjekt(spiel.art, { ...spiel, schneiderAngesagt: o === "schneider", schwarzAngesagt: o === "schwarz", ouvert: o === "ouvert" });
      }
      const sicher = spiel.art === "null" ? nullWert(spiel) : spielwert(spiel, { spitzenAnzahl: spitzen(kartenMitSkat, spiel).anzahl }).wert;
      const maximal = spiel.art === "null" ? sicher : spielwert(spiel, { spitzenAnzahl: spitzen(kartenMitSkat, spiel).anzahl, schneider: true, schwarz: true }).wert;
      if (sicher < wert) {
        const zusatz = maximal >= wert ? "Das reicht nur, wenn du Schneider oder Schwarz schaffst." : "Das reicht nicht – du wärst überreizt und verlierst sicher.";
        const w = await this.frage(`Vorsicht: ${spielName(spiel, BLATT)} ist ${sicher} wert, gereizt sind ${wert}. ${zusatz}`, [{ id: "anders", text: "Anderes Spiel wählen", primaer: true }, { id: "trotzdem", text: "Trotzdem spielen" }]);
        if (!w) return false;
        if (w === "anders") continue;
      }
      sageAn(sp, 0, wert, spiel);
      return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------- Kontra */
  async kontraRunde() {
    const sp = this.sp;
    if (!this.e.kontra || sp.spiel.art === "ramsch" || sp.spiel.art === "null") return true;
    const a = sp.alleinspieler;
    for (let p = 0; p < 3; p++) {
      if (p === a || sp.kontra) continue;
      if (p === 0) {
        const x = await this.frage(`${NAMEN[a]} spielt ${spielName(sp.spiel, BLATT)}. Kontra geben? Dann zählt das Spiel doppelt.`, [{ id: "nein", text: "Kein Kontra", primaer: true }, { id: "kontra", text: "Kontra!" }]);
        if (!x) return false;
        sp.kontra = x === "kontra";
      } else if (kiKontra(sp, p, this.staerke(p))) {
        sp.kontra = true;
        this.status(`${NAMEN[p]}: „Kontra!“`);
        if (!(await this.pause(1200))) return false;
      }
    }
    if (sp.kontra) {
      if (a === 0) {
        const x = await this.frage("Kontra! Sagst du Re? Dann zählt es noch einmal doppelt.", [{ id: "nein", text: "Kein Re", primaer: true }, { id: "re", text: "Re!" }]);
        if (!x) return false;
        sp.re = x === "re";
      } else if (kiRe(sp, a, this.staerke(a))) {
        sp.re = true;
        this.status(`${NAMEN[a]}: „Re!“`);
        if (!(await this.pause(1200))) return false;
      }
    }
    return true;
  }

  /* ---------------------------------------------------------------- Kartenspiel */
  async menschZug() {
    const sp = this.sp;
    let tippId = null;
    let gewaehlt = null;
    while (this.lebt) {
      this.zeichne();
      const hand = this.handAnzeige();
      const legal = gueltigeKarten(sp, 0);
      const istLegal = (k) => legal.some((x) => x.id === k.id);
      const gef = sp.stich.karten.length ? bedienFarbe(sp.stich.karten[0], sp.spiel) : null;
      const gefText = gef == null ? "" : gef === "trumpf" ? "Trumpf" : farbNameSkat(gef, BLATT);
      if (!tippId) {
        if (!sp.stich.karten.length) this.status("Du spielst aus.");
        else this.status(this.wenig ? `Du bist dran. Gefordert: ${gefText}.` : "Du bist dran.");
      }
      if (this.voll && !tippId) {
        if (!sp.stich.karten.length) this.hilfe(sp.alleinspieler === 0
          ? "Du spielst aus. Faustregel als Alleinspieler: erst <b>Trumpf ziehen</b>, dann <b>Asse abholen</b>."
          : sp.spiel.art === "null" ? "Spiel Farben an, in denen der Alleinspieler hohe Karten haben könnte – er muss drunterbleiben." : `Du spielst aus. Dein Partner ist <b>${NAMEN[sp.alleinspieler === 1 ? 2 : 1]}</b>. ${sp.alleinspieler === 1 ? "Der Alleinspieler sitzt direkt nach dir: spiele eine <b>lange</b> Farbe." : "Der Alleinspieler sitzt hinter deinem Partner: spiele eine <b>kurze</b> Farbe."}`);
        else {
          const si = stichSieger(sp.stich.karten, sp.spiel);
          const bestSp = sp.stich.spieler[si];
          const vorn = `${NAMEN[bestSp]} liegt vorn mit ${kartenName(sp.stich.karten[si])}`;
          const hat = legal.length < hand.length || hand.some((k) => bedienFarbe(k, sp.spiel) === gef);
          const text = hat ? `<b>${gefText}</b> ist gefordert – du hast ${gefText}, also musst du bedienen.` : `<b>${gefText}</b> ist gefordert, du hast kein ${gefText} mehr: Du darfst <b>stechen</b> oder eine beliebige Karte <b>abwerfen</b>.`;
          const partner = bestSp !== 0 && istPartei(sp, 0, bestSp) ? " Das ist dein Partner – wenn du nicht höher musst, <b>schmiere</b> ihm Augen." : "";
          this.hilfe(`${vorn}. ${text}${partner}`);
        }
      }
      const knoepfe = [];
      if (this.voll) knoepfe.push(h("button.knopf", { type: "button", text: "Tipp", onclick: debounced(() => this._ende?.({ typ: "tipp" })) }));
      if (this.voll && this.undo) knoepfe.push(h("button.knopf.leise", { type: "button", text: "Zug zurück", onclick: debounced(() => this._ende?.({ typ: "zurueck" })) }));
      let ausspielen = null;
      if (!this.e.direkt) {
        ausspielen = h("button.knopf.primaer", { type: "button", text: gewaehlt ? `${kartenName(gewaehlt)} spielen` : "Karte antippen", disabled: !gewaehlt, onclick: debounced(() => { if (gewaehlt) this._ende?.({ typ: "spielen", karte: gewaehlt }); }) });
      }
      const wahl = await this.warte((ende) => {
        this.zeigeHand(hand, {
          waehlbar: true, markiere: this.wenig, spielbar: istLegal, tippId, gewaehlt: new Set(gewaehlt ? [gewaehlt.id] : []),
          onTap: (k) => {
            if (!istLegal(k)) return ende({ typ: "illegal", karte: k });
            if (this.e.direkt || (gewaehlt && gewaehlt.id === k.id)) return ende({ typ: "spielen", karte: k });
            ende({ typ: "waehlen", karte: k });
          },
        });
        this.aktionen(h("div.knopfreihe.mittig", {}, ausspielen, ...knoepfe));
        if (!this.e.direkt) this.handInfo.textContent = gewaehlt ? `Noch einmal antippen oder „${kartenName(gewaehlt)} spielen“.` : (this.wenig ? "Grün umrandet = erlaubt. Antippen wählt aus, zweites Antippen spielt." : "Antippen wählt aus, zweites Antippen spielt.");
      }, () => { this.aktionen(); });
      if (!wahl) return false;
      if (wahl.typ === "waehlen") { gewaehlt = wahl.karte; continue; }
      if (wahl.typ === "tipp") {
        this.status("Einen Moment …");
        await sleep(30);
        const t = kiKarte(sp, 0, 3, { maxMs: 250 });
        tippId = t?.id ?? null;
        if (t) { this.status(`Tipp: ${kartenName(t)}`); this.hilfe(`<b>Tipp: ${kartenName(t)}.</b> ${tippGrund(sp, t)}`); }
        continue;
      }
      if (wahl.typ === "zurueck") {
        this.sp = structuredClone(this.undo);
        this.undo = null; tippId = null; gewaehlt = null;
        this.status("Dein letzter Zug wurde zurückgenommen.");
        return "zurueck";
      }
      if (wahl.typ === "illegal") {
        const k = wahl.karte;
        const grund = gef === "trumpf" ? `Trumpf ist gefordert und du hast noch Trumpf${sp.spiel.art !== "null" ? " (Buben zählen als Trumpf)" : ""} – den musst du zugeben.` : `${gefText} ist gefordert und du hast noch ${gefText} – die musst du bedienen${sp.spiel.art !== "null" && istBube(k) ? ". Der Bube ist Trumpf, keine Farbkarte" : ""}.`;
        toast(`${kartenName(k)} geht nicht`, "warn");
        this.hilfe(`<b>${kartenName(k)} darfst du nicht legen.</b> ${grund}`);
        gewaehlt = null;
        if (!(await this.pause(300))) return false;
        continue;
      }
      // spielen
      this.undo = this.voll ? structuredClone(sp) : null;
      this.handInfo.textContent = "";
      this.hilfe();
      return this.nachKarte(0, wahl.karte);
    }
    return false;
  }

  async nachKarte(p, karte) {
    const sp = this.sp;
    const r = spieleKarte(sp, p, karte);
    if (!r.ok) throw new Error("Skat: ungültiger Zug " + r.grund);
    this.zeigeHand(this.handAnzeige());
    klang.karte();
    if (!r.stichFertig) {
      this.zeichne(karte.id);
      if (p !== 0) this.status(`${NAMEN[p]} spielt ${kartenName(karte)}.`);
      return this.pause(p === 0 ? 350 : 800);
    }
    const st = sp.stiche.at(-1);
    this.zeichne();
    this.zeichneSlots(st.karten, st.spieler, karte.id);
    this.slots.forEach((s, q) => s.el.classList.toggle("sieger", q === st.sieger));
    const au = augenSumme(st.karten);
    this.status(st.sieger === 0 ? `Du bekommst den Stich (${au} Augen).` : `${NAMEN[st.sieger]} bekommt den Stich (${au} Augen).`);
    const meineSeite = istPartei(sp, 0, st.sieger);
    klang.stich(meineSeite);
    if (st.sieger > 0) { this.sagt(st.sieger, spruch(au >= 10 ? "stichGewonnen" : "ja")); this.laune(st.sieger, "froh"); }
    [1, 2].forEach((q) => { if (q !== st.sieger && !istPartei(sp, q, st.sieger)) { this.laune(q, au >= 10 ? "sauer" : "neutral"); if (au >= 14 && Math.random() < 0.5) this.sagt(q, spruch("stichVerloren")); } });
    if (this.voll) this.hilfe(stichErklaerung(st, sp.spiel));
    const ok = await this.pause(this.voll ? 2000 : 1300);
    this.slots.forEach((s) => s.karte.querySelectorAll(".karte").forEach((k) => k.classList.add("einsammeln")));
    await this.pause(420);
    this.slots.forEach((s) => s.el.classList.remove("sieger"));
    [1, 2].forEach((q) => this.laune(q, "neutral"));
    this.hilfe();
    return ok;
  }

  /* ---------------------------------------------------------------- Ein Spiel */
  async einSpiel(geber) {
    this.sp = neuesSkatSpiel({ geber, blatt: BLATT });
    const sp = this.sp;
    this.undo = null;
    this.hilfe();
    [1, 2].forEach((q) => this.laune(q, "neutral"));
    this.zeichne();
    this.zeigeHand(this.handAnzeige(), { austeilen: true });
    if (sp.haende[0].filter(istBube).length === 4) { const a = verleihe("der-alte"); if (a) this.neueAbzeichen.push(a); }
    this.status(`${geber === 0 ? "Du gibst" : `${NAMEN[geber]} gibt`}. Du bist ${this.rolle(0)}.`);
    if (this.voll) this.hilfe(this.rolle(0) === "Vorhand" ? "Als <b>Vorhand</b> hörst du beim Reizen und spielst die erste Karte aus." : this.rolle(0) === "Mittelhand" ? "Als <b>Mittelhand</b> beginnst du das Reizen: Du sagst der Vorhand Werte an." : "Als <b>Hinterhand</b> (Geber) reizt du zuletzt – gegen den, der übrig bleibt.");
    if (!(await this.pause(1800))) return null;

    if (!(await this.reizen())) return null;
    const rz = reizErgebnis(sp.reizung);
    if (rz.alleGepasst) {
      if (!this.e.ramsch) {
        this.status("Alle haben gepasst – eingepasst. Es wird neu gegeben.");
        this.hilfe();
        if (!(await this.pause(2000))) return null;
        return { eingepasst: true };
      }
      this.status("Alle haben gepasst – Ramsch! Wer die meisten Augen bekommt, verliert.");
      if (this.voll) this.hilfe("<b>Ramsch</b> (Hausregel): Jeder spielt für sich, nur die Buben sind Trumpf. Wer am Ende die meisten Augen hat, bekommt sie als Minuspunkte. Der Skat geht an den Gewinner des letzten Stichs.");
      if (!(await this.pause(2200))) return null;
      starteRamsch(sp);
    } else {
      const a = rz.alleinspieler;
      if (a === 0) {
        if (!(await this.menschAnsage(rz.wert))) return null;
      } else {
        this.status(`${NAMEN[a]} hat das Reizen gewonnen (${rz.wert}) und überlegt …`);
        if (!(await this.pause(1200))) return null;
        const hs = kiHandSpiel(sp.haende[a], rz.wert, this.staerke(a));
        if (hs) sageAn(sp, a, rz.wert, hs);
        else {
          nimmSkat(sp, a);
          const d = kiDrueckenUndAnsagen(sp.haende[a], rz.wert, this.staerke(a));
          druecke(sp, a, d.druecken);
          sageAn(sp, a, rz.wert, d.spiel);
        }
        this.status(`${NAMEN[a]} spielt ${spielName(sp.spiel, BLATT)}.`);
        this.sagt(a, `${spielName(sp.spiel, BLATT)}!`, { klasse: "laut", ms: 2600 });
        this.laune(a, "stolz");
        if (this.voll) {
          const partner = NAMEN[a === 1 ? 2 : 1];
          const trumpf = sp.spiel.art === "null" ? "Es gibt <b>keinen Trumpf</b>; Reihenfolge A K D B 10 9 8 7. Ihr müsst versuchen, ihm einen Stich aufzuzwingen." : sp.spiel.art === "grand" ? "Trumpf sind <b>nur die vier Buben</b>." : `Trumpf sind die <b>Buben und alle ${farbNameSkat(sp.spiel.trumpf, BLATT)}-Karten</b>.`;
          this.hilfe(`${NAMEN[a]} ist Alleinspieler. Du spielst zusammen mit <b>${partner}</b>; eure Augen zählen gemeinsam, ihr braucht <b>60</b>. ${trumpf}`);
        }
        this.zeichne();
        if (!(await this.pause(this.voll ? 3200 : 1800))) return null;
      }
      if (!(await this.kontraRunde())) return null;
    }
    this.undo = null;
    this.hilfe();

    while (!this.sp.fertig) {
      if (!this.lebt) return null;
      const p = this.sp.amZug;
      this.zeichne();
      if (p === 0) {
        const r = await this.menschZug();
        if (!r) return null;
      } else {
        this.zeigeHand(this.handAnzeige());
        this.status(`${NAMEN[p]} überlegt …`);
        if (!(await this.pause(denkpause(Math.random, this.voll ? 900 : 700)))) return null;
        const karte = kiKarte(this.sp, p, this.staerke(p));
        if (!(await this.nachKarte(p, karte))) return null;
      }
    }
    this.undo = null;
    this.zeichne();
    this.zeigeHand(this.handAnzeige());
    return this.abrechnung();
  }

  /* ---------------------------------------------------------------- Abrechnung */
  async abrechnung() {
    const sp = this.sp;
    const e = spielErgebnis(sp);
    const box = h("div.box.abrechnung");
    let eintrag;
    if (e.ramsch) {
      let text;
      if (e.durchmarsch != null) text = `Durchmarsch! ${NAMEN[e.durchmarsch]} hat alle Stiche: +${e.punkte[e.durchmarsch]}.`;
      else text = `${e.verlierer.map((q) => NAMEN[q]).join(" und ")} ${e.verlierer.length > 1 ? "haben" : "hat"} die meisten Augen (${Math.max(...e.augen)}) und bekommt sie als Minuspunkte.`;
      box.append(h("h2", { text: "Ramsch" }), h("p.ergebnis", { text }), h("p.hinweis", { text: `Augen: Du ${e.augen[0]} · Lena ${e.augen[1]} · Max ${e.augen[2]}` }));
      eintrag = { spiel: "Ramsch", alleinspieler: null, punkte: e.punkte, gewonnen: null };
    } else {
      const a = e.alleinspieler;
      const wer = a === 0 ? "Du" : NAMEN[a];
      const verb = e.gewonnen ? (a === 0 ? "gewinnst" : "gewinnt") : (a === 0 ? "verlierst" : "verliert");
      const detail = sp.spiel.art === "null" ? (e.gewonnen ? "ohne einen Stich" : `– ${e.sticheAllein ? "ein Stich war zu viel" : ""}`) : `mit ${e.augenAllein} Augen`;
      const titel = `${wer} ${verb} ${spielName(sp.spiel, BLATT)} ${detail}`.replace(/\s+/g, " ").trim();
      box.append(h("h2", { text: titel }));
      const marken = [];
      if (e.ueberreizt) marken.push("Überreizt!");
      if (sp.spiel.art !== "null") { if (e.schwarz) marken.push("Schwarz"); else if (e.schneider) marken.push("Schneider"); }
      box.append(h(`p.ergebnis.${e.gewonnen ? "gewonnen" : "verloren"}`, { text: `${e.listenwert > 0 ? "+" : ""}${e.listenwert} Punkte für ${wer === "Du" ? "dich" : wer}${marken.length ? " · " + marken.join(" · ") : ""}` }));
      if (sp.spiel.art !== "null") box.append(h("p.hinweis", { text: `Augen: ${wer} ${e.augenAllein} (davon ${augenSumme(sp.skat)} aus dem Skat: ${sp.skat.map(kartenName).join(", ")}) – Gegenspieler ${120 - e.augenAllein}.` }));
      // Rechnung
      const r = h("div.rechnung");
      for (const [l, w] of rechnungZeilen(e, sp.spiel)) r.append(h("span", { text: l }), h("span.rechts", { text: w }));
      if (e.ueberreizt) {
        r.append(h("span", { text: `Gereizt ${sp.reizwert} – das Spiel ist weniger wert: überreizt. Es zählt das nächste Vielfache von ${e.grund}` }), h("span.rechts", { text: String(e.wert) }));
      }
      r.append(h("span.summe", { text: e.gewonnen ? "Gewonnen: Spielwert" : "Verloren: Spielwert × 2" }), h("span.summe.rechts", { text: `${e.gewonnen ? "+" : "−"}${e.gewonnen ? e.wert : 2 * e.wert}` }));
      if (sp.kontra) r.append(h("span", { text: sp.re ? "Kontra und Re: × 4" : "Kontra: × 2" }), h("span.rechts", { text: String(e.listenwert) }));
      box.append(r);
      if (this.wenig) {
        let lehre = "";
        if (a === 0) {
          if (e.ueberreizt) lehre = "Du hast mehr gereizt, als dein Spiel wert war. Zähle vor dem Reizen die Spitzen und rechne: Grundwert × (Spitzen + 1).";
          else if (!e.gewonnen && e.augenAllein >= 50) lehre = "Knapp verloren. Prüfe: Hättest du anders drücken können, damit mehr Augen bei dir landen?";
          else if (!e.gewonnen) lehre = "Das Blatt war wohl zu schwach für ein Alleinspiel. Passen kostet nichts – ein verlorenes Spiel kostet doppelt.";
          else if (e.schneider) lehre = "Stark – Schneider bringt eine Stufe extra.";
          else lehre = "Gut gemacht. Mit 61 Augen ist das Spiel sicher gewonnen.";
        } else {
          lehre = e.gewonnen ? `${NAMEN[a]} hat gewonnen. Als Gegenspieler zählen eure Augen zusammen – ihr habt ${120 - e.augenAllein} geholt, 60 wären nötig gewesen.` : `Gut verteidigt! Zusammen mit ${NAMEN[a === 1 ? 2 : 1]} hast du ${120 - e.augenAllein} Augen geholt.`;
        }
        box.append(h("div.lernhilfe", { html: lehre }));
      }
      eintrag = { spiel: `${spielName(sp.spiel, BLATT)}${sp.kontra ? (sp.re ? ", Kontra, Re" : ", Kontra") : ""}${e.ueberreizt ? " (überreizt)" : ""}`, alleinspieler: a, punkte: e.punkte, gewonnen: e.gewonnen, reizwert: sp.reizwert };
    }
    eintrag.nr = this.liste.length + 1;
    eintrag.datum = new Date().toISOString().slice(0, 10);
    this.liste.push(eintrag);
    this.aufAenderung(this.liste);
    // Spaß: Erfahrung, Abzeichen, Stimmung
    const spiele = zaehle("spiele");
    let xp = 20, freude = false;
    const neu = [];
    const merk = (id) => { const a = verleihe(id); if (a) neu.push(a); };
    merk("erstes-spiel");
    if (spiele >= 20) merk("stammgast");
    if (!e.ramsch) {
      const a = e.alleinspieler;
      if (a === 0 && e.gewonnen) {
        xp += e.wert; freude = true;
        merk("erster-sieg");
        if (e.schneider && sp.spiel.art !== "null") merk("schneider");
        if (sp.spiel.art === "grand") merk("grand");
        if (sp.spiel.art === "null") merk("null");
        if (sp.spiel.hand) merk("hand");
        [1, 2].forEach((q) => { this.laune(q, "sauer"); });
        this.sagt(1, spruch("gegnerVerloren"), { ms: 3000 }); this.sagt(2, spruch("gegnerVerloren"), { ms: 3000 });
      } else if (a !== 0 && !e.gewonnen) {
        xp += 30; freude = true;
        if (zaehle("verteidigt") >= 5) merk("verteidiger");
        this.laune(a, "sauer"); this.laune(a === 1 ? 2 : 1, "froh");
        this.sagt(a, spruch("spielVerloren"), { ms: 3000 });
      } else if (a !== 0 && e.gewonnen) {
        this.laune(a, "stolz"); this.sagt(a, spruch("spielGewonnen"), { ms: 3000 });
      } else {
        [1, 2].forEach((q) => this.laune(q, "froh"));
      }
    }
    if (freude) { klang.sieg(); konfetti(); } else klang.niederlage();
    const erg = gibXp(xp, "Spiel");
    neu.push(...this.neueAbzeichen); this.neueAbzeichen = [];
    box.append(h("p.hinweis", { text: `+${xp + neu.length * 50} Erfahrung${neu.length ? ` · ${neu.length === 1 ? "neues Abzeichen" : `${neu.length} neue Abzeichen`}: ${neu.map((x) => x.icon + " " + x.name).join(", ")}` : ""}` }));
    const summe = [0, 0, 0];
    for (const z of this.liste) z.punkte.forEach((x, i) => (summe[i] += x));
    box.append(h("p.hinweis", { text: `Liste nach ${this.liste.length} Spiel${this.liste.length > 1 ? "en" : ""}: Du ${summe[0]} · Lena ${summe[1]} · Max ${summe[2]}` }));

    this.hilfe();
    this.status("");
    const weiter = await this.warte((ende) => {
      this.aktionen(box, h("button.knopf.primaer.breit", { type: "button", text: "Nächstes Spiel", onclick: debounced(() => ende(true)) }));
    }, () => this.aktionen());
    return weiter ? eintrag : null;
  }

  /* ---------------------------------------------------------------- Ablauf */
  async start() {
    let geber = speicher.lies("geber", Math.floor(Math.random() * 3));
    while (this.lebt) {
      const r = await this.einSpiel(geber);
      if (!r || !this.lebt) return;
      geber = (geber + 1) % 3;
      speicher.schreib("geber", geber);
    }
  }
}
