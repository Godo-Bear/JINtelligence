/* My tests: save AI tests (and any finished test) to come back to, start a new test without losing the old one,
   highlight questions to work on, ask the AI tutor about a question, and save a test as a PDF.
   Saved on this device and, like flashcard decks, in the student's account (the "flashcards" table row also
   holds the saved tests), so they show up on every device. Loaded after study.js, before app.js. */

const savedTestsKey = () => `apex-saved-tests-${authUser.id}`;
function loadSavedTests() {
  const s = store(savedTestsKey());
  return { tests: Array.isArray(s?.tests) ? s.tests : [], deleted: Array.isArray(s?.deleted) ? s.deleted : [] };
}
function storeSavedTests(state) {
  store(savedTestsKey(), { tests: state.tests, deleted: state.deleted.slice(-200) });
  syncSavedTests();
}
const testName = (qs) => {
  const topics = [...new Set(qs.map((q) => String(q.topicName || "").replace(/^.*?–\s*/, "")).filter(Boolean))];
  return topics.length ? topics.slice(0, 2).join(" & ") + (topics.length > 2 ? " +" : "") : "My test";
};
// Saves (or updates) a test. Returns the saved test.
function saveTest({ id, name, questions, minutes = 20, marked = [] }) {
  const state = loadSavedTests();
  const now = Date.now();
  let t = id && state.tests.find((x) => x.id === id);
  if (t) Object.assign(t, { name: name || t.name, questions, minutes, marked, updated: now });
  else { t = { id: id || uid("t"), name: name || testName(questions), questions, minutes, marked, created: now, updated: now }; state.tests.unshift(t); }
  state.deleted = state.deleted.filter((d) => d !== t.id);
  storeSavedTests(state);
  return t;
}
function deleteSavedTest(id) {
  const state = loadSavedTests();
  state.tests = state.tests.filter((t) => t.id !== id);
  state.deleted.push(id);
  storeSavedTests(state);
}

// Cloud copy: shares the student's row in the "flashcards" table with their decks. Pulls first, so decks or tests
// saved on another device are never overwritten.
let savedSyncTimer = null;
function syncSavedTests() {
  if (typeof cloudDecks === "undefined" || !cloudDecks) return;
  clearTimeout(savedSyncTimer);
  savedSyncTimer = setTimeout(async () => {
    try {
      const decks = loadDecks();
      await pullDecks(decks);
      store(decksKey(), decks);
      await pullSavedTests();
      pushDecks(decks);
    } catch (e) { console.warn("Apex: couldn't sync saved tests —", e.message || e); }
  }, 800);
}
// Brings in tests saved on other devices (the newer copy wins; deleted tests stay deleted).
async function pullSavedTests() {
  if (typeof cloudDecks === "undefined" || !cloudDecks) return false;
  let row;
  try {
    const { data, error } = await sb.from("flashcards").select("data").eq("user_id", authUser.id).maybeSingle();
    if (error) throw error;
    row = data?.data;
  } catch (e) { return false; }
  if (!row || !Array.isArray(row.tests)) return false;
  const state = loadSavedTests();
  const deleted = [...new Set([...state.deleted, ...(row.testsDeleted || [])])];
  const byId = new Map(state.tests.map((t) => [t.id, t]));
  let changed = deleted.length !== state.deleted.length;
  row.tests.forEach((t) => {
    if (!t?.id || !Array.isArray(t.questions)) return;
    const mine = byId.get(t.id);
    if (!mine || (t.updated || 0) > (mine.updated || 0)) { byId.set(t.id, t); changed = true; }
  });
  if (changed) store(savedTestsKey(), { tests: [...byId.values()].filter((t) => !deleted.includes(t.id)).sort((a, b) => (b.updated || 0) - (a.updated || 0)), deleted: deleted.slice(-200) });
  return changed;
}

// Opens the AI tutor with a question from a test, so the student can work through it.
function askTutorAbout(q, n) {
  const opts = q.options ? `\nThe choices are: ${q.options.join(" | ")}` : "";
  const passage = q.passage ? `\nIt's about this: "${String(q.passage).slice(0, 1200)}"` : "";
  const vis = q.visual && typeof describeVisual === "function" ? `\n(The question shows: ${describeVisual(q.visual)}.)` : "";
  pendingTutorMessage = `Can you help me work through ${n ? `question ${n} from my test` : "this question from my test"}? Don't just give me the answer — explain how to do it step by step.\n\n"${q.prompt}"${opts}${passage}${vis}`;
  goTo("#/tutor");
}

// Save as PDF: a clean printable test, with highlighted questions starred and (optionally) an answer sheet.
function printTest(name, questions, { marked = [], answers = true } = {}) {
  if (!questions.length) return toast("Add some questions first.");
  const flagged = new Set(marked);
  let last = "";
  const qHTML = questions.map((q, i) => {
    const showPassage = !!q.passage && q.passage !== last;
    last = q.passage || "";
    const space = q.answerType === "written" ? `<div class="pt-lines">${"<div></div>".repeat(4)}</div>` : !q.options && !isVisualInput(q) ? `<div class="pt-lines"><div></div></div>` : "";
    return `<div class="pt-q${flagged.has(i) ? " flagged" : ""}">
      ${showPassage ? `<div class="pt-passage">${esc(q.passage)}</div>` : ""}
      <div class="pt-prompt"><b>${i + 1}.</b> ${flagged.has(i) ? "⭐ " : ""}${esc(q.prompt)}</div>
      ${q.table ? visualHTML({ visual: { type: "table", rows: q.table } }) : ""}
      ${q.visual ? `<div class="pt-vis">${visualHTML(q)}</div>` : ""}
      ${q.options ? `<ol class="pt-opts" type="A">${q.options.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>` : ""}
      ${space}
    </div>`;
  }).join("");
  const ansHTML = answers ? `<section class="pt-answers"><h2>Answers</h2><ol>${questions.map((q) => `<li><b>${esc(displayAnswer(q))}</b>${q.explanation ? ` — ${esc(q.explanation)}` : ""}</li>`).join("")}</ol></section>` : "";
  let host = document.getElementById("print-test");
  if (!host) { host = document.createElement("div"); host.id = "print-test"; document.body.appendChild(host); }
  host.innerHTML = `<header class="pt-head"><h1>${esc(name)}</h1><div>Name: ____________________ &nbsp; Date: ____________ &nbsp; Score: ______ / ${questions.length}</div>
    ${flagged.size ? `<div class="pt-note">⭐ = a question you highlighted to work on</div>` : ""}</header>${qHTML}${ansHTML}<footer class="pt-foot">JINtelligence</footer>`;
  document.body.classList.add("printing-test");
  const done = () => { document.body.classList.remove("printing-test"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 300);
}
// Asks whether to include the answers, then prints.
function printTestDialog(name, questions, marked) {
  if (!questions.length) return toast("Add some questions first.");
  const box = document.createElement("div");
  box.className = "modal";
  box.innerHTML = `<div class="card stack" role="dialog" aria-label="Save as PDF">
    <h3 style="margin:0;">🖨️ Save "${esc(name)}" as a PDF</h3>
    <p class="muted small" style="margin:0;">In the print box that opens, choose <b>Save as PDF</b> as the printer (or pick a printer to print it).</p>
    <label class="small" style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="pt-ans" checked> Add an answer sheet at the end</label>
    ${marked.length ? `<label class="small" style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="pt-only"> Only the ${marked.length} highlighted question${marked.length === 1 ? "" : "s"}</label>` : ""}
    <div class="row" style="justify-content:flex-end;"><button class="btn ghost" type="button" data-close>Cancel</button><button class="btn" type="button" data-go>Open print box</button></div>
  </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest("[data-close]")) close(); });
  $("[data-go]", box).addEventListener("click", () => {
    const only = $("#pt-only", box)?.checked;
    const qs = only ? questions.filter((_, i) => marked.includes(i)) : questions;
    const flags = only ? [] : marked;
    const answers = $("#pt-ans", box).checked;
    close();
    printTest(name, qs, { marked: flags, answers });
  });
}

// The "My tests" list: open, PDF, rename or delete a saved test.
function openMyTests(onOpen) {
  const box = document.createElement("div");
  box.className = "modal";
  const draw = () => {
    const tests = loadSavedTests().tests.filter((t) => t.id !== FLAG_ID || t.questions.length)
      .sort((a, b) => (a.id === FLAG_ID ? -1 : b.id === FLAG_ID ? 1 : 0));
    box.innerHTML = `<div class="card stack" role="dialog" aria-label="My saved tests">
      <div class="row between"><h3 style="margin:0;">📂 My saved tests</h3><button class="btn ghost sm" type="button" data-close>Close</button></div>
      ${tests.length ? `<div class="saved-tests">${tests.map((t) => `<div class="saved-test">
          <div class="saved-test-info"><b>${esc(t.name)}</b><span class="muted small">${t.questions.length} question${t.questions.length === 1 ? "" : "s"}${t.marked?.length ? ` · ⭐ ${t.marked.length} highlighted` : ""} · ${fmtDate(new Date(t.updated).toISOString())}</span></div>
          <div class="row saved-test-btns">
            <button class="btn sm" type="button" data-st-open="${esc(t.id)}">Open</button>
            <button class="btn ghost sm" type="button" data-st-pdf="${esc(t.id)}" title="Save as PDF">🖨️ PDF</button>
            ${t.id === FLAG_ID ? "" : `<button class="btn ghost sm" type="button" data-st-ren="${esc(t.id)}" title="Rename">✏️</button>
            <button class="btn ghost sm" type="button" data-st-del="${esc(t.id)}" title="Delete" aria-label="Delete ${esc(t.name)}">🗑️</button>`}
          </div></div>`).join("")}</div>`
        : `<p class="muted small" style="margin:0;">No saved tests yet. Build a test, then press 💾 Save test.</p>`}
    </div>`;
  };
  const find = (id) => loadSavedTests().tests.find((t) => t.id === id);
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (e.target === box || b?.matches("[data-close]")) return box.remove();
    if (!b) return;
    if (b.dataset.stOpen) { const t = find(b.dataset.stOpen); box.remove(); if (t) onOpen(t); }
    else if (b.dataset.stPdf) { const t = find(b.dataset.stPdf); if (t) { box.remove(); printTestDialog(t.name, t.questions, t.marked || []); } }
    else if (b.dataset.stRen) {
      const t = find(b.dataset.stRen); if (!t) return;
      const name = prompt("New name for this test:", t.name);
      if (name && name.trim()) { saveTest({ ...t, name: name.trim().slice(0, 80) }); draw(); }
    } else if (b.dataset.stDel) {
      const t = find(b.dataset.stDel);
      if (t && confirm(`Delete "${t.name}"? This can't be undone.`)) { deleteSavedTest(t.id); draw(); }
    }
  });
  draw();
  document.body.appendChild(box);
  // Pick up tests saved on other devices.
  pullSavedTests().then((changed) => { if (changed && document.body.contains(box)) draw(); });
}

// ---------------------------------------------------------------- Flag any question, anywhere
// Every question on the site (practice, tests, results, games) has a ☆ Flag button. Flagged questions are
// collected in one saved test, "⭐ Flagged questions", in 📂 My tests — so they sync like any saved test.
const FLAG_ID = "flagged", FLAG_NAME = "⭐ Flagged questions";
const flagKey = (q) => String(q.id || q.prompt);
const flagRegistry = new Map(); // key → the question shown on screen
const flaggedQuestions = () => loadSavedTests().tests.find((t) => t.id === FLAG_ID)?.questions || [];
function flagButtonHTML(q, topicLabel = "") {
  if (!q || !q.prompt || !authUser) return "";
  const key = flagKey(q);
  const { showPassage, ...copy } = q;
  flagRegistry.set(key, { ...copy, topicName: q.topicName || String(topicLabel).split(" · ")[0].replace(/^[^A-Za-z]+/, "") });
  const on = flaggedQuestions().some((x) => flagKey(x) === key);
  return `<button type="button" class="q-flag${on ? " on" : ""}" data-flag-q="${esc(key)}" aria-pressed="${on}" title="${on ? "Remove from ⭐ Flagged questions" : "Flag this question to come back to"}">${on ? "⭐ Flagged" : "☆ Flag"}</button>`;
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-flag-q]");
  if (!btn || !authUser) return;
  e.preventDefault();
  const key = btn.dataset.flagQ, q = flagRegistry.get(key);
  if (!q) return;
  const list = flaggedQuestions().slice();
  const at = list.findIndex((x) => flagKey(x) === key);
  const on = at < 0;
  if (on) list.unshift(q); else list.splice(at, 1);
  saveTest({ id: FLAG_ID, name: FLAG_NAME, questions: list, minutes: 0, marked: [] });
  $$("[data-flag-q]").filter((b) => b.dataset.flagQ === key).forEach((b) => {
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? "⭐ Flagged" : "☆ Flag";
  });
  toast(on ? "⭐ Flagged — find it in Test → AI test → 📂 My tests." : "Removed from your flagged questions.");
});

// ---------------------------------------------------------------- Flagged questions for the AI tutor
// Everything the student has flagged (☆ Flag anywhere) or starred in a saved test, so the tutor can help with them.
function flaggedForAI(limit = 25) {
  const seen = new Set(), out = [];
  const addQ = (q, from) => {
    if (!q?.prompt || out.length >= limit) return;
    const k = flagKey(q);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ q, from });
  };
  const { tests } = loadSavedTests();
  (tests.find((t) => t.id === FLAG_ID)?.questions || []).forEach((q) => addQ(q, "flagged"));
  tests.filter((t) => t.id !== FLAG_ID).forEach((t) => (t.marked || []).forEach((i) => addQ(t.questions[i], `starred in "${t.name}"`)));
  return out;
}
function flaggedPrompt(mode = "tutor") {
  const list = flaggedForAI();
  if (!list.length) return "";
  const line = ({ q, from }, n) => {
    const opts = q.options ? ` Choices: ${q.options.join(" | ")}.` : "";
    const vis = q.visual && typeof describeVisual === "function" ? ` (Shows: ${describeVisual(q.visual)}.)` : "";
    const ans = isVisualInput(q) ? visualAnswerText(q) : Array.isArray(q.answer) ? q.answer[0] : q.answer;
    return `F${n + 1}. [${q.topicName || "General"} · ${from}] ${String(q.prompt).slice(0, 300)}${opts}${vis} — Correct answer: ${String(ans).slice(0, 150)}${q.explanation ? `. Explanation: ${String(q.explanation).slice(0, 200)}` : ""}`;
  };
  if (mode === "test") return `
FLAGGED QUESTIONS: The student has flagged these test and practice questions to work on (F1 is the most recent). If they ask for a test on their flagged, starred or wrong questions (or on "F2", "the fraction ones" and so on), build it from this list: write NEW questions that practise the same skills at the same level, and you may also include an original question exactly as it is if they ask for that. Otherwise, only use the list if it's relevant to what they ask for.
${list.map(line).join("\n")}
`;
  return `
FLAGGED QUESTIONS: The student has flagged these test and practice questions to work on (F1 is the most recent). If they mention their flagged, starred or saved questions, "the questions I got wrong", or a question by its number (e.g. "F2"), use this list. Help them understand and work through each one step by step — guide them to the answer rather than just giving it, unless they ask for the answer. You can also suggest which ones to start with, spot patterns (e.g. lots of fraction questions), or quiz them on similar questions.
${list.map(line).join("\n")}
`;
}
