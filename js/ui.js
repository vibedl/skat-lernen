// Kleine DOM-Helfer (ohne Abhängigkeiten). h("button.gross", { text, onclick }, kinder…)
export function h(tag, props = {}, ...children) {
  const [name, ...classes] = tag.split(".");
  const el = document.createElement(name || "div");
  if (classes.length) el.className = classes.join(" ");
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const rand = (n) => Math.floor(Math.random() * n);
export const pick = (arr) => arr[rand(arr.length)];
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Doppelklicks/Zittern auf demselben Knopf schlucken (250 ms). */
export function debounced(fn) {
  let sperre = 0;
  return (e) => {
    const t = Date.now();
    if (t - sperre < 250) return;
    sperre = t;
    fn(e);
  };
}

/** Kurze Rückmeldung unten einblenden. kind: "gut" | "neutral" | "warn" */
export function toast(text, kind = "gut", ms = 1600) {
  const el = h("div.toast." + kind, { text, role: "status" });
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("sichtbar"));
  setTimeout(() => { el.classList.remove("sichtbar"); setTimeout(() => el.remove(), 300); }, ms);
}

/** Einstellungen und Stände im Browser speichern (localStorage, fehlertolerant). */
export const speicher = {
  lies(key, standard) {
    try { const v = localStorage.getItem("skat-lernen:" + key); return v == null ? standard : JSON.parse(v); } catch { return standard; }
  },
  schreib(key, wert) {
    try { localStorage.setItem("skat-lernen:" + key, JSON.stringify(wert)); } catch { /* privater Modus o. ä. */ }
  },
};
