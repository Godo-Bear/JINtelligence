/* Test & study modes powered by the AI (shown on the Test page):
   - AI test: chat with the AI and it writes questions straight into your test; keep chatting to add or change them.
   - Flashcards: the AI makes decks you can flip, sort into "got it" / "still learning", shuffle and quiz yourself on.
   - Info & ideas: the AI makes an interactive page about anything — sections, key terms, facts and a quick check.
   Uses helpers from app.js at runtime ($, esc, store, askTutorRaw, parseLooseJSON, runTest, …).
   Decks and info pages are saved on this device. */

// ---------------------------------------------------------------- Shared bits
// Pulls the friendly "reply" out of an AI answer, even if the JSON around it is broken.
function aiReplyText(raw, data) {
  if (data && typeof data === "object" && !Array.isArray(data) && typeof data.reply === "string") return plainText(data.reply);
  const m = String(raw || "").match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (m) { try { return plainText(JSON.parse(`"${m[1]}"`)); } catch (e) { return plainText(m[1]); } }
  return /^\s*[[{]/.test(String(raw || "")) ? "" : cleanTutorAnswer(String(raw || ""));
}
// Light clean-up of AI text: no markdown symbols.
const plainText = (s) => String(s ?? "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/`/g, "").trim();
const chatHistory = (log, n = 10) => log.filter((m) => m.role !== "err" && !m.pending).slice(-n)
  .map((m) => `${m.role === "me" ? "Student" : "Tutor"}: ${m.text}`).join("\n");
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// A chat box. onSend(text, hidden, progress) resolves to { text, note } (or throws). `hidden` is extra context for
// the AI only; pass `progress` to askTutorRaw so the "Thinking…" bubble says when it's trying again.
function chatPanel(host, { log, placeholder, empty, ideas = [], onSend, onChange }) {
  host.innerHTML = `
    <div class="chat study-chat" data-chat></div>
    <form class="chat-form" autocomplete="off">
      <textarea class="chat-input" rows="1" placeholder="${esc(placeholder)}" aria-label="Message the AI" maxlength="2000"></textarea>
      <button class="btn" type="submit">Send</button>
    </form>`;
  const box = $("[data-chat]", host), form = $("form", host), input = $("textarea", form), btn = $("button", form);
  let busy = false;
  const draw = () => {
    if (!log.length) {
      box.innerHTML = `<div class="chat-empty small">${esc(empty)}
        <div class="chips">${ideas.map((x) => `<button type="button" class="btn secondary sm">${esc(x)}</button>`).join("")}</div></div>`;
      $$(".chips button", box).forEach((b) => b.addEventListener("click", () => send(b.textContent)));
      return;
    }
    box.innerHTML = log.map((m) => `<div class="bubble ${m.role}${m.pending ? " pending" : ""}">${esc(m.text)}${m.note ? `<div class="bubble-note">${esc(m.note)}</div>` : ""}</div>`).join("");
    box.scrollTop = box.scrollHeight;
  };
  async function send(text, hidden) {
    text = String(text || "").trim();
    if (!text || busy) return;
    busy = true;
    btn.disabled = true;
    log.push({ role: "me", text });
    const pending = { role: "bot", text: "Thinking…", pending: true };
    log.push(pending);
    input.value = "";
    draw();
    const say = (t) => { if (pending.pending) { pending.text = t; if (document.body.contains(box)) draw(); } };
    const slow = setTimeout(() => say("Still working on it… (big requests can take up to a minute)"), 15000);
    try {
      const r = await onSend(text, hidden, { onRetry: (n) => say(`The AI is busy — trying again (${n + 1} of ${AI_TRIES})…`) });
      pending.text = r?.text || "Done!";
      if (r?.note) pending.note = r.note;
    } catch (e) {
      console.error("Apex: study chat failed —", e);
      pending.role = "err";
      // Errors from askTutorRaw say what went wrong; anything else was a problem reading the AI's answer.
      pending.text = e.userMessage || "Something went wrong reading the AI's answer. Please try again.";
    }
    clearTimeout(slow);
    delete pending.pending;
    while (log.length > 40) log.shift();
    busy = false;
    btn.disabled = false;
    onChange?.();
    if (document.body.contains(box)) { draw(); input.focus({ preventScroll: true }); }
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  draw();
  return { send, draw };
}

// Something another mode asked this one to do when it opens (e.g. "make flashcards from this page").
let pendingStudyAction = null;
function takePendingAction(mode) {
  if (pendingStudyAction?.mode !== mode) return null;
  const a = pendingStudyAction;
  pendingStudyAction = null;
  return a;
}

// ---------------------------------------------------------------- AI test
const aiTest = { log: [], draft: [], minutes: 20, types: [], files: [] };
const studyFiles = { cards: [], info: [] }; // files added to the flashcards and info chats (kept for this visit) // kept for this visit to the site
const AI_TEST_TYPES = {
  short: "Short answer", mc: "Multiple choice", tf: "True or false", blank: "Fill in the blank", worded: "Worded problems",
  written: "Explain in your own words (AI-marked)", passage: "Reading passage", visual: "Interactive (plot, shade, order, match, tap…)",
};
function questionKind(q) {
  if (isVisualInput(q)) return { plot: "plot points", place: "number line", shade: "shade", angleMake: "make an angle", order: "put in order", match: "match pairs", tapword: "tap the word" }[q.visual.type];
  if (q.answerType === "written") return "written (AI-marked)";
  if (q.answerType === "point") return "coordinates";
  if (q.options) return q.options.length === 2 && q.options.includes("True") ? "true or false" : "multiple choice";
  return "short answer";
}
function questionIcon(q) {
  if (isVisualInput(q)) return { plot: "📍", place: "📏", shade: "🟦", angleMake: "📐", order: "↕️", match: "🔗", tapword: "👆" }[q.visual.type] || "🧩";
  if (q.answerType === "written") return "✍️";
  if (q.answerType === "point") return "📍";
  if (q.options) return "🔘";
  return q.visual ? "🖼️" : "✏️";
}

// The AI test chat and draft are saved on this device, so they're still there next time.
let aiTestOwner = null;
const aiTestKey = () => `apex-aitest-${authUser.id}`;
function loadAITest() {
  if (aiTestOwner === authUser.id) return;
  aiTestOwner = authUser.id;
  const saved = store(aiTestKey());
  if (!saved) return;
  aiTest.log.splice(0, aiTest.log.length, ...(Array.isArray(saved.log) ? saved.log.filter((m) => !m.pending) : []));
  aiTest.draft = Array.isArray(saved.draft) ? saved.draft : [];
  aiTest.minutes = Number.isFinite(saved.minutes) ? saved.minutes : 20;
  aiTest.types = Array.isArray(saved.types) ? saved.types : [];
}
function saveAITest() {
  if (aiTestOwner !== authUser?.id) return;
  store(aiTestKey(), { log: aiTest.log.filter((m) => !m.pending).slice(-40), draft: aiTest.draft, minutes: aiTest.minutes, types: aiTest.types });
}

function aiTestMode(view, host) {
  loadAITest();
  host.innerHTML = `
    <div class="card stack">
      <p class="muted small" style="margin:0;">Tell the AI what to test you on — any subject (maths, English, science, history…), what types of questions, and how hard. It writes them straight into your test below, and you can keep chatting to add more or change them.</p>
      ${testLevelsHTML("Tick one or more — the AI spreads the questions across them. Leave them all unticked to use your level.")}
      ${testDiffHTML()}
      ${feedbackPickerHTML("How the AI marks your written answers and talks about your mistakes.")}
      <div id="tc-files">${uploadBoxHTML("The AI will use them — e.g. “Make 10 questions like the ones in my file”.")}</div>
      <div id="tc-chat"></div>
      <details class="types-box"${aiTest.types.length ? " open" : ""}><summary>Question types <span class="muted">(optional — or just tell the AI)</span></summary>
        <div class="checklist" id="tc-types">${Object.entries(AI_TEST_TYPES).map(([k, v]) => `<label class="chip-check"><input type="checkbox" value="${k}"${aiTest.types.includes(k) ? " checked" : ""}> ${v}</label>`).join("")}</div>
      </details>
    </div>
    <div class="card stack" id="tc-draft"></div>`;

  wireUploadBox($("#tc-files", host), aiTest.files);
  $("#tc-types", host).addEventListener("change", () => { aiTest.types = $$("#tc-types input:checked", host).map((b) => b.value); saveAITest(); });

  const summary = () => (aiTest.draft.length
    ? `The test so far has ${aiTest.draft.length} questions:\n${aiTest.draft.map((q, i) => `${i + 1}. [${questionKind(q)}] ${q.prompt.slice(0, 140)} (${q.topicName})`).join("\n")}`
    : "The test is empty so far.");

  const chat = chatPanel($("#tc-chat", host), {
    log: aiTest.log,
    placeholder: "e.g. 10 questions on fractions, mixed types",
    empty: "What do you want to be tested on?",
    ideas: ["10 questions on fractions and decimals", "Science quiz on the solar system", "Plot points on the Cartesian plane", "A reading passage with questions", "History: ancient Egypt, mixed types", "Spot the mistake in grammar sentences"],
    onChange: drawDraft,
    async onSend(text, hidden, progress) {
      const types = aiTest.types.map((k) => AI_TEST_TYPES[k]);
      const history = chatHistory(aiTest.log.slice(0, -2));
      if (aiTest.files.some((f) => f.status === "reading")) throw Object.assign(new Error("files still loading"), { userMessage: "Your files are still loading — wait a moment, then send again." });
      await Promise.all([loadMemory(), ensureCalendar()]);
      const raw = await askTutorRaw(await withUploads(`You are a friendly tutor (based in Victoria, Australia) building a practice test WITH a student in a chat. The test can be on ANY subject or learning topic, at any level: school subjects from Prep to VCE, uni or TAFE topics, languages, coding, music, general knowledge, or anything school-appropriate they're interested in.
${testLevelLine()}
${testDiffLine()}
${calendarPrompt()}${memoryPrompt()}
${summary()}
${types.length ? `The student ticked these question types: ${types.join(", ")}. Use them.\n` : ""}
What to do:
- When the student asks for questions or says what they want to be tested on, WRITE the questions and add them ("add"). If they don't say how many, write 10 for a new test, or 5 when adding more (never more than 15 at once).
- To change a question, remove it by its number ("remove") and add the new version.
- If they say "start again" or "clear the test", set "clear" to true.
- If they're not sure, suggest a couple of ideas and ask ONE short question — don't add anything yet.
- If they just chat or ask something, answer briefly.
- Never give away the answers in your reply. Pitch questions at the year level(s) and difficulty above unless the student asks for something different in the chat.

${AI_QUESTION_RULES}

${history ? `Chat so far:\n${history}\n\n` : ""}Student: ${text}${hidden ? `\n\n(Extra information for you, from the student's info page:\n${hidden})` : ""}

Reply with ONLY valid JSON, no markdown:
{"reply":"a short friendly message (under 60 words) saying what you did","add":[question objects],"remove":[question numbers],"clear":false,"remember":[],"forget":[]}
${memoryRules()}`, aiTest.files,
        "The student has uploaded files for this test. Unless they ask for something else, base the questions on this material. If it contains questions (a worksheet, test or textbook exercise), write NEW questions in a similar style, format and level rather than copying them. You can use passages from the files as reading passages."), progress);
      const data = parseLooseJSON(raw);
      const obj = data && !Array.isArray(data) ? data : {};
      const before = aiTest.draft.length;
      if (obj.clear === true) aiTest.draft = [];
      const rm = new Set((Array.isArray(obj.remove) ? obj.remove : []).map(Number).filter((n) => n >= 1));
      if (rm.size) aiTest.draft = aiTest.draft.filter((_, i) => !rm.has(i + 1));
      const removed = before - aiTest.draft.length;
      const list = Array.isArray(data) ? data : obj.add || obj.questions || [];
      const added = normaliseAIQuestions(list, 15).slice(0, Math.max(0, 50 - aiTest.draft.length));
      aiTest.draft.push(...added);
      const note = [added.length ? `✓ Added ${added.length} question${added.length === 1 ? "" : "s"}` : "", removed ? `Removed ${removed}` : "", memoryNote(applyMemoryUpdates(obj))].filter(Boolean).join(" · ");
      const reply = aiReplyText(raw, data);
      return { text: reply || (added.length ? "Here are your questions — have a look below!" : "Okay!"), note };
    },
  });

  function drawDraft() {
    const d = $("#tc-draft", host);
    saveAITest();
    if (!d) return;
    const qs = aiTest.draft;
    d.innerHTML = `
      <div class="row between"><h3 style="margin:0;">📝 Your test <span class="muted small">· ${qs.length} question${qs.length === 1 ? "" : "s"}</span></h3>
        ${qs.length ? `<button class="btn ghost sm" id="tc-clear">Clear all</button>` : ""}</div>
      ${qs.length
        ? `<ol class="draft-list">${qs.map((q, i) => `<li><span class="draft-ico" title="${esc(questionKind(q))}">${questionIcon(q)}</span>
            <span class="draft-q">${esc(q.prompt)}<small>${esc(q.topicName || "")} · ${esc(questionKind(q))}</small></span>
            <button class="btn ghost sm draft-x" type="button" data-x="${i}" aria-label="Remove question ${i + 1}">✕</button></li>`).join("")}</ol>`
        : `<p class="muted small" style="margin:0;">No questions yet. Ask the AI for some — e.g. “Give me 10 questions on fractions”.</p>`}
      <div class="draft-start">
        <div><label class="field" for="tc-time">Time limit</label><select id="tc-time">${timeOptions(aiTest.minutes)}</select></div>
        <button class="btn secondary" id="tc-share" type="button"${qs.length ? "" : " disabled"}>🌍 Share</button>
        <button class="btn" id="tc-start" type="button"${qs.length ? "" : " disabled"}>Start test →</button>
      </div>
      ${aiTest.log.length || qs.length ? `<button class="btn ghost sm" id="tc-reset" type="button" style="justify-self:start;">Start over (clear the chat and test)</button>` : ""}`;
    $$("[data-x]", d).forEach((b) => b.addEventListener("click", () => { aiTest.draft.splice(+b.dataset.x, 1); drawDraft(); }));
    $("#tc-clear", d)?.addEventListener("click", () => { if (confirm("Remove all the questions from this test?")) { aiTest.draft = []; drawDraft(); } });
    $("#tc-time", d).addEventListener("change", (e) => { aiTest.minutes = +e.target.value; saveAITest(); });
    $("#tc-share", d).addEventListener("click", () => openShareTest(aiTest.draft.map((q) => ({ q, topic: { id: null, name: q.topicName } })), { minutes: aiTest.minutes, title: aiTest.draft[0]?.topicName || "" }));
    $("#tc-reset", d)?.addEventListener("click", () => {
      if (!confirm("Clear the chat and the test, and start again?")) return;
      aiTest.log.length = 0;
      aiTest.draft = [];
      aiTestMode(view, host);
    });
    $("#tc-start", d).addEventListener("click", () => {
      if (!aiTest.draft.length) return;
      let last = "";
      const qs2 = aiTest.draft.map((q) => {
        const copy = { ...q, showPassage: !!q.passage && q.passage !== last };
        last = q.passage || "";
        return copy;
      });
      runTest(view, qs2.map((q) => ({ q, topic: { id: null, name: q.topicName, icon: "🤖" } })), aiTest.minutes);
    });
  }
  drawDraft();

  const action = takePendingAction("chat");
  if (action) {
    if (action.fresh) { aiTest.draft = []; drawDraft(); }
    chat.send(action.text, action.hidden);
  }
}

// ---------------------------------------------------------------- Flashcards
const decksKey = () => `apex-decks-${authUser.id}`;
function loadDecks() {
  const d = store(decksKey());
  return d && Array.isArray(d.decks)
    ? { decks: d.decks, current: d.current, chat: Array.isArray(d.chat) ? d.chat : [], deleted: Array.isArray(d.deleted) ? d.deleted : [] }
    : { decks: [], current: null, chat: [], deleted: [] };
}

// Decks are also saved to the student's account (the "flashcards" table, supabase/flashcards.sql),
// so they show up on every device. Works on this device only if the table isn't there.
let cloudDecks = true, pushTimer = null;
const isBlankDeck = (d) => !d.cards.length && d.name === "New deck";
function pushDecks(state) {
  if (!cloudDecks) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      const { error } = await sb.from("flashcards").upsert({
        user_id: authUser.id, updated_at: new Date().toISOString(),
        data: { decks: state.decks.filter((d) => !isBlankDeck(d)), deleted: state.deleted.slice(-200) },
      });
      if (error) throw error;
    } catch (e) { cloudDecks = false; console.warn("Apex: flashcards table unavailable, saving on this device only —", e.message || e); }
  }, 700);
}
// Brings in decks saved from other devices. The newer copy of each deck wins; deleted decks stay deleted.
async function pullDecks(state) {
  if (!cloudDecks) return false;
  let row;
  try {
    const { data, error } = await sb.from("flashcards").select("data").eq("user_id", authUser.id).maybeSingle();
    if (error) throw error;
    row = data?.data;
  } catch (e) { cloudDecks = false; return false; }
  if (!row || !Array.isArray(row.decks)) return false;
  const deleted = [...new Set([...state.deleted, ...(row.deleted || [])])];
  const byId = new Map(state.decks.map((d) => [d.id, d]));
  let changed = deleted.length !== state.deleted.length;
  row.decks.forEach((d) => {
    if (!d || !d.id || !Array.isArray(d.cards)) return;
    const mine = byId.get(d.id);
    if (!mine) { byId.set(d.id, d); changed = true; } else if ((d.updated || 0) > (mine.updated || 0)) { byId.set(d.id, d); changed = true; }
  });
  const decks = [...byId.values()].filter((d) => !deleted.includes(d.id));
  // Drop an empty starter deck once real decks have arrived.
  const real = decks.filter((d) => !isBlankDeck(d));
  state.decks = real.length ? real : decks;
  state.deleted = deleted.slice(-200);
  return changed;
}
const newDeck = (name = "New deck") => ({ id: uid("d"), name, cards: [], updated: Date.now() });
const fcView = { deckId: null, order: [], i: 0, onlyLearning: false }; // where you are in the deck

function flashcardsMode(view, host) {
  const state = loadDecks();
  let deck = state.decks.find((d) => d.id === state.current) || state.decks[state.decks.length - 1];
  if (!deck) { deck = newDeck(); state.decks.push(deck); }
  state.decks.forEach((d) => { d.cards = [...d.cards.filter((c) => !c.own), ...d.cards.filter((c) => c.own)]; });
  state.current = deck.id;
  const save = () => {
    deck.updated = Date.now();
    state.decks = state.decks.slice(-40);
    state.chat = state.chat.slice(-30);
    store(decksKey(), state);
    pushDecks(state);
  };
  store(decksKey(), state);

  host.innerHTML = `
    <div class="stack">
      <div class="card stack"><h3 style="margin:0;">💬 Ask the AI</h3>
        <div id="fc-files">${uploadBoxHTML("e.g. “Make flashcards from my notes”.")}</div>
        <div id="fc-chat"></div></div>
      <div class="stack" id="fc-main"></div>
    </div>`;
  const main = $("#fc-main", host);
  wireUploadBox($("#fc-files", host), studyFiles.cards);

  const studyOrder = () => deck.cards.map((c, i) => i).filter((i) => !fcView.onlyLearning || !deck.cards[i].known);
  const resetView = (keepPlace) => {
    const order = studyOrder();
    if (keepPlace && fcView.deckId === deck.id && fcView.order.length) {
      const kept = fcView.order.filter((i) => order.includes(i));
      fcView.order = [...kept, ...order.filter((i) => !kept.includes(i))];
    } else {
      fcView.order = order;
      fcView.i = 0;
    }
    fcView.deckId = deck.id;
    fcView.i = Math.min(fcView.i, Math.max(0, fcView.order.length - 1));
  };
  resetView(true);

  function draw() {
    const cards = deck.cards, known = cards.filter((c) => c.known).length;
    const opts = state.decks.map((d) => `<option value="${d.id}"${d.id === deck.id ? " selected" : ""}>${esc(d.name)} (${d.cards.length})</option>`).join("");
    const head = `
      <div class="deck-bar">
        <select id="fc-deck" aria-label="Choose a deck">${opts}</select>
        <div class="deck-actions">
          <button class="btn ghost sm" id="fc-new" type="button">+ New deck</button>
          <button class="btn ghost sm" id="fc-rename" type="button">Rename</button>
          <button class="btn ghost sm" id="fc-del" type="button">Delete</button>
        </div>
      </div>`;
    let body;
    if (!cards.length) {
      body = `<div class="study-empty"><div class="study-empty-ico">🃏</div>
        <p><b>This deck is empty.</b><br>Ask the AI at the top to make flashcards on anything, or make your own above.</p></div>`;
    } else if (!fcView.order.length) {
      body = `<div class="study-empty"><div class="study-empty-ico">🎉</div><p><b>You know every card in this deck!</b></p>
        <button class="btn" id="fc-all" type="button">Study all cards again</button></div>`;
    } else if (fcView.i >= fcView.order.length) {
      const left = fcView.order.filter((i) => !cards[i].known).length;
      body = `<div class="study-empty"><div class="study-empty-ico">🏁</div>
        <p><b>Round done!</b><br>You know ${known} of ${cards.length} cards.</p>
        <div class="row" style="justify-content:center;">
          <button class="btn" id="fc-again" type="button">Go again</button>
          ${left ? `<button class="btn secondary" id="fc-learning" type="button">Only the ${left} still learning</button>` : ""}
        </div></div>`;
    } else {
      const card = cards[fcView.order[fcView.i]];
      const size = (t) => (t.length > 160 ? " fc-xlong" : t.length > 70 ? " fc-long" : "");
      body = `
        <div class="fc-top"><span>Card ${fcView.i + 1} of ${fcView.order.length}${fcView.onlyLearning ? " · still learning" : ""}</span><span>✓ ${known} of ${cards.length} known</span></div>
        <div class="bar"><span style="width:${Math.round((known / cards.length) * 100)}%"></span></div>
        <div class="fc-card" id="fc-card" tabindex="0" role="button" aria-label="Flashcard — press to flip">
          <div class="fc-inner">
            <div class="fc-face fc-front"><small>${card.known ? "✓ Got it" : card.known === false ? "Still learning" : "Question"}</small><div class="fc-text${size(card.f)}">${esc(card.f)}</div></div>
            <div class="fc-face fc-back"><small>Answer</small><div class="fc-text${size(card.b)}">${esc(card.b)}</div></div>
          </div>
        </div>
        <p class="vz-hint">Tap the card to flip it · swipe or use ← → to move</p>
        <div class="fc-controls">
          <button class="btn secondary" id="fc-prev" type="button" aria-label="Previous card"${fcView.i ? "" : " disabled"}>◀</button>
          <button class="btn fc-no" id="fc-no" type="button">✗ Still learning</button>
          <button class="btn fc-yes" id="fc-yes" type="button">✓ Got it</button>
          <button class="btn secondary" id="fc-next" type="button" aria-label="Next card">▶</button>
        </div>
        <div class="fc-tools">
          <button class="btn ghost sm" id="fc-shuffle" type="button">🔀 Shuffle</button>
          <label class="chip-check"><input type="checkbox" id="fc-only"${fcView.onlyLearning ? " checked" : ""}> Only still learning</label>
          <button class="btn ghost sm" id="fc-reset" type="button">↺ Reset</button>
          <button class="btn ghost sm" id="fc-quiz" type="button">📝 Quiz me</button>
          <button class="btn ghost sm" id="fc-pdf" type="button">🖨️ Save as PDF</button>
        </div>`;
    }
    const list = `
      <div class="card stack">
        <h3 style="margin:0;">✏️ Make your own cards</h3>
        <form class="fc-add" id="fc-add" autocomplete="off">
          <input type="text" name="f" placeholder="Front — a question or word" maxlength="200">
          <input type="text" name="b" placeholder="Back — the answer" maxlength="400">
          <button class="btn sm" type="submit">Add card</button>
        </form>
        ${cards.length ? `<details class="fc-list"><summary>All cards in “${esc(deck.name)}” (${cards.length}) — edit or delete</summary>
          <ol>${cards.map((c, i) => `${c.own && (i === 0 || !cards[i - 1].own) ? `<li class="fc-divider">Your own cards</li>` : ""}<li data-i="${i}"><span class="fc-li-text"><b>${esc(c.f)}</b><span>${esc(c.b)}</span></span>
          <span class="fc-li-actions"><button class="btn ghost sm" type="button" data-edit="${i}" aria-label="Edit card ${i + 1}">✏️</button><button class="btn ghost sm" type="button" data-del="${i}" aria-label="Delete card ${i + 1}">✕</button></span></li>`).join("")}</ol>
        </details>` : ""}
      </div>`;
    main.innerHTML = list + `<div class="card stack">${head + body}</div>`;
    wire();
  }

  const go = (delta) => { fcView.i = Math.max(0, Math.min(fcView.order.length, fcView.i + delta)); draw(); $("#fc-card", main)?.focus({ preventScroll: true }); };
  const flip = () => $("#fc-card", main)?.classList.toggle("flipped");
  const mark = (knownIt) => {
    const card = deck.cards[fcView.order[fcView.i]];
    if (!card) return;
    card.known = knownIt;
    save();
    go(1);
  };

  function wire() {
    $("#fc-deck", main).addEventListener("change", (e) => {
      deck = state.decks.find((d) => d.id === e.target.value) || deck;
      state.current = deck.id;
      save();
      resetView(false);
      draw();
    });
    $("#fc-new", main).addEventListener("click", () => {
      const name = prompt("Name your new deck:", "New deck");
      if (name === null) return;
      deck = newDeck(name.trim().slice(0, 40) || "New deck");
      state.decks.push(deck);
      state.current = deck.id;
      save();
      resetView(false);
      draw();
    });
    $("#fc-rename", main).addEventListener("click", () => {
      const name = prompt("Rename this deck:", deck.name);
      if (!name || !name.trim()) return;
      deck.name = name.trim().slice(0, 40);
      save();
      draw();
    });
    $("#fc-del", main).addEventListener("click", () => {
      if (!confirm(`Delete the deck "${deck.name}" and its ${deck.cards.length} cards?`)) return;
      state.decks = state.decks.filter((d) => d !== deck);
      state.deleted.push(deck.id);
      deck = state.decks[state.decks.length - 1] || newDeck();
      if (!state.decks.includes(deck)) state.decks.push(deck);
      state.current = deck.id;
      save();
      resetView(false);
      draw();
    });
    $$("[data-idea]", main).forEach((b) => b.addEventListener("click", () => chat.send(b.textContent)));
    $("#fc-all", main)?.addEventListener("click", () => { fcView.onlyLearning = false; resetView(false); draw(); });
    $("#fc-again", main)?.addEventListener("click", () => { resetView(false); draw(); });
    $("#fc-learning", main)?.addEventListener("click", () => { fcView.onlyLearning = true; resetView(false); draw(); });

    const cardEl = $("#fc-card", main);
    if (cardEl) {
      let x0 = null, y0 = null;
      cardEl.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; });
      cardEl.addEventListener("pointerup", (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) flip();
      });
      cardEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      $("#fc-prev", main).addEventListener("click", () => go(-1));
      $("#fc-next", main).addEventListener("click", () => go(1));
      $("#fc-yes", main).addEventListener("click", () => mark(true));
      $("#fc-no", main).addEventListener("click", () => mark(false));
      $("#fc-shuffle", main).addEventListener("click", () => { fcView.order = shuffle(fcView.order); fcView.i = 0; draw(); toast("Shuffled"); });
      $("#fc-only", main).addEventListener("change", (e) => { fcView.onlyLearning = e.target.checked; resetView(false); draw(); });
      $("#fc-reset", main).addEventListener("click", () => {
        if (!confirm("Mark every card as not studied yet?")) return;
        deck.cards.forEach((c) => { delete c.known; });
        fcView.onlyLearning = false;
        save();
        resetView(false);
        draw();
      });
      $("#fc-quiz", main).addEventListener("click", quiz);
      $("#fc-pdf", main).addEventListener("click", () => printDeck(deck));
    }
    $$("[data-del]", main).forEach((b) => b.addEventListener("click", () => {
      deck.cards.splice(+b.dataset.del, 1);
      save();
      resetView(true);
      draw();
      { const l = $(".fc-list", main); if (l) l.open = true; }
    }));
    $$("[data-edit]", main).forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.edit, c = deck.cards[i], li = b.closest("li");
      li.innerHTML = `<form class="fc-add fc-edit" autocomplete="off"><input type="text" name="f" value="${esc(c.f)}" maxlength="200" aria-label="Front">
        <input type="text" name="b" value="${esc(c.b)}" maxlength="400" aria-label="Back"><button class="btn sm" type="submit">Save</button></form>`;
      $("form", li).addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target.f.value.trim(), back = e.target.b.value.trim();
        if (!f || !back) return toast("Fill in both sides of the card.");
        Object.assign(c, { f, b: back });
        save();
        draw();
        { const l = $(".fc-list", main); if (l) l.open = true; }
      });
      $("input", li).focus();
    }));
    $("#fc-add", main).addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target.f.value.trim(), back = e.target.b.value.trim();
      if (!f || !back) return toast("Fill in both sides of the card.");
      deck.cards.push({ f, b: back, own: true });
      save();
      resetView(true);
      draw();
      { const l = $(".fc-list", main); if (l) l.open = true; }
      $("#fc-add input", main).focus();
    });
  }

  // ← → and space work anywhere on the page while a card is showing.
  const onKey = (e) => {
    if (!document.body.contains(main)) { document.removeEventListener("keydown", onKey); return; }
    if (!$("#fc-card", main) || /input|textarea|select/i.test(document.activeElement?.tagName || "")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === " " && (!document.activeElement || document.activeElement === document.body)) { e.preventDefault(); flip(); }
  };
  document.addEventListener("keydown", onKey);

  // A quick multiple-choice quiz from the deck (practice only — you can write your own cards, so no points).
  function quiz() {
    const pool = deck.cards.filter((c) => c.f && c.b);
    if (pool.length < 2) return toast("Add at least 2 cards to quiz yourself.");
    const backs = [...new Set(pool.map((c) => c.b))];
    const qs = shuffle(pool).slice(0, 20).map((c, i) => ({
      id: uid(`fc${i}-`), prompt: c.f, answer: c.b, answerType: "text", difficulty: 1, explanation: "",
      options: shuffle([c.b, ...shuffle(backs.filter((b) => b !== c.b)).slice(0, 3)]),
    }));
    runTest(view, qs.map((q) => ({ q, topic: { id: null, name: deck.name, icon: "🃏" } })), 0, { noPoints: true, again: "Back to flashcards" });
  }

  const chat = chatPanel($("#fc-chat", host), {
    log: state.chat,
    placeholder: "e.g. Make 10 flashcards on volcanoes",
    empty: "Tell the AI what flashcards to make — any subject. You can keep asking for more, or ask it to explain a card.",
    ideas: ["Make 10 flashcards on the water cycle", "Key terms for fractions", "French greetings", "Explain a card I'm stuck on"],
    onChange: () => { save(); draw(); },
    async onSend(text, hidden, progress) {
      const history = chatHistory(state.chat.slice(0, -2));
      const listCards = deck.cards.slice(0, 60).map((c, i) => `${i + 1}. ${c.f.slice(0, 90)} → ${c.b.slice(0, 90)}`).join("\n");
      if (studyFiles.cards.some((f) => f.status === "reading")) throw Object.assign(new Error("files still loading"), { userMessage: "Your files are still loading — wait a moment, then send again." });
      await Promise.all([loadMemory(), ensureCalendar()]);
      const raw = await askTutorRaw(await withUploads(`You are a friendly tutor (based in Victoria, Australia) helping a student make and study flashcards, in a chat. Flashcards can be on ANY subject or learning topic, at any level.
${learnerLine()}
${calendarPrompt()}${memoryPrompt()}
${deck.cards.length ? `The current deck "${deck.name}" has ${deck.cards.length} cards:\n${listCards}` : `The current deck${deck.name !== "New deck" ? ` ("${deck.name}")` : ""} is empty.`}

What to do:
- When the student asks for flashcards, WRITE them and add them ("add"). If they don't say how many, make 10 (never more than 20 at once).
- To change cards, remove them by number ("remove") and add the new versions.
- If they want flashcards on a DIFFERENT topic from the current deck, set "newDeck" to true.
- Give a short deck "name" (2–4 words) when making a new deck or filling an empty one.
- If they ask a question or want help remembering a card, answer briefly (memory tricks are great).
- Front: a short question, word or prompt (under 15 words). Back: a short, clear answer or definition (under 30 words). Every fact must be correct.

${history ? `Chat so far:\n${history}\n\n` : ""}Student: ${text}${hidden ? `\n\n(Extra information for you, from the student's info page:\n${hidden})` : ""}

Reply with ONLY valid JSON, no markdown:
{"reply":"a short friendly message (under 50 words)","newDeck":false,"name":"","add":[{"front":"...","back":"..."}],"remove":[card numbers],"remember":[],"forget":[]}
${memoryRules()}`, studyFiles.cards,
        "The student uploaded files for their flashcards. Unless they ask for something else, make the cards from the key words, facts and ideas in this material (in your own short words)."), progress);
      const data = parseLooseJSON(raw);
      const obj = data && !Array.isArray(data) ? data : {};
      const incoming = (Array.isArray(data) ? data : obj.add || obj.cards || [])
        .map((c) => ({ f: plainText(c?.front ?? c?.f ?? "").slice(0, 200), b: plainText(c?.back ?? c?.b ?? "").slice(0, 400) }))
        .filter((c) => c.f && c.b).slice(0, 20);
      const notes = [];
      if ((obj.newDeck === true || hidden) && deck.cards.length && incoming.length) {
        deck = newDeck();
        state.decks.push(deck);
        state.current = deck.id;
        notes.push("New deck");
      }
      const name = plainText(obj.name || "").slice(0, 40);
      if (name && (!deck.cards.length || deck.name === "New deck")) deck.name = name;
      const rm = new Set((Array.isArray(obj.remove) ? obj.remove : []).map(Number).filter((n) => n >= 1));
      if (rm.size) { deck.cards = deck.cards.filter((_, i) => !rm.has(i + 1)); notes.push(`Removed ${rm.size}`); }
      const fronts = new Set(deck.cards.map((c) => c.f.toLowerCase()));
      const fresh = incoming.filter((c) => !fronts.has(c.f.toLowerCase())).slice(0, Math.max(0, 300 - deck.cards.length));
      const wasEmpty = !deck.cards.length;
      const firstOwn = deck.cards.findIndex((c) => c.own);
      if (firstOwn < 0) deck.cards.push(...fresh);
      else { deck.cards.splice(firstOwn, 0, ...fresh); fcView.deckId = null; } // AI cards go before your own ones
      if (fresh.length) notes.push(`✓ Added ${fresh.length} card${fresh.length === 1 ? "" : "s"} to “${deck.name}”`);
      const remembered = memoryNote(applyMemoryUpdates(obj));
      if (remembered) notes.push(remembered);
      resetView(!wasEmpty);
      return { text: aiReplyText(raw, data) || (fresh.length ? "Here are your flashcards!" : "Okay!"), note: notes.join(" · ") };
    },
  });

  draw();
  pullDecks(state).then((changed) => {
    if (!changed || !document.body.contains(main)) return;
    deck = state.decks.find((d) => d.id === state.current) || state.decks.find((d) => d.id === deck.id) || state.decks[state.decks.length - 1] || newDeck();
    if (!state.decks.includes(deck)) state.decks.push(deck);
    state.current = deck.id;
    store(decksKey(), state);
    resetView(true);
    draw();
  });
  const action = takePendingAction("cards");
  if (action) chat.send(action.text, action.hidden);
}

// ---------------------------------------------------------------- Info & ideas
const infoKey = () => `apex-info-${authUser.id}`;
function loadInfo() {
  const d = store(infoKey());
  return d && Array.isArray(d.pages) ? { pages: d.pages, current: d.current, chat: Array.isArray(d.chat) ? d.chat : [] } : { pages: [], current: null, chat: [] };
}
// Keeps only the parts of an AI-made page we can show safely.
function cleanInfoPage(p) {
  const str = (x, n) => plainText(x).slice(0, n);
  const arr = (x, n) => (Array.isArray(x) ? x.slice(0, n) : []);
  const staticVisual = (v) => { const c = v ? cleanVisual(v) : null; return c && !isVisualInput({ visual: c }) ? c : null; };
  return {
    title: str(p?.title, 80),
    intro: str(p?.intro, 500),
    sections: arr(p?.sections, 8).map((s) => ({ heading: str(s?.heading, 90), points: arr(s?.points, 8).map((x) => str(x, 320)).filter(Boolean), visual: staticVisual(s?.visual) }))
      .filter((s) => s.heading || s.points.length),
    terms: arr(p?.terms, 10).map((t) => ({ term: str(t?.term, 60), meaning: str(t?.meaning, 240) })).filter((t) => t.term && t.meaning),
    facts: arr(p?.facts, 6).map((f) => str(f, 320)).filter(Boolean),
    quiz: arr(p?.quiz, 6).map((q) => {
      const options = [...new Set(arr(q?.options, 5).map((o) => str(o, 120)).filter(Boolean))];
      const answer = options.find((o) => o.toLowerCase() === str(q?.answer, 120).toLowerCase());
      return { q: str(q?.q ?? q?.question, 240), options, answer };
    }).filter((q) => q.q && q.answer && q.options.length >= 2),
  };
}
const pageText = (pg) => [pg.title, pg.intro, ...pg.sections.map((s) => `${s.heading}: ${s.points.join(" ")}`),
  pg.terms.length ? `Key terms: ${pg.terms.map((t) => `${t.term} — ${t.meaning}`).join("; ")}` : "", pg.facts.join(" ")].filter(Boolean).join("\n").slice(0, 3500);

function infoMode(view, host) {
  const state = loadInfo();
  let page = state.pages.find((p) => p.id === state.current) || state.pages[state.pages.length - 1] || null;
  const save = () => {
    state.current = page?.id || null;
    state.pages = state.pages.slice(-30);
    state.chat = state.chat.slice(-30);
    store(infoKey(), state);
  };

  host.innerHTML = `
    <div class="study-grid">
      <div class="card stack" id="in-main"></div>
      <div class="card stack study-side"><h3 style="margin:0;">💬 Ask the AI</h3>
        <div id="in-files">${uploadBoxHTML("e.g. “Summarise my file”.")}</div>
        <div id="in-chat"></div></div>
    </div>`;
  const main = $("#in-main", host);
  wireUploadBox($("#in-files", host), studyFiles.info);

  function draw() {
    const head = state.pages.length ? `
      <div class="deck-bar">
        <select id="in-page" aria-label="Choose a page">${page ? "" : `<option value="" selected>New page…</option>`}${state.pages.map((p) => `<option value="${p.id}"${p === page ? " selected" : ""}>${esc(p.title)}</option>`).join("")}</select>
        <div class="deck-actions">
          <button class="btn ghost sm" id="in-new" type="button">+ New page</button>
          <button class="btn ghost sm" id="in-del" type="button">Delete</button>
        </div>
      </div>` : "";
    if (!page) {
      main.innerHTML = head + `<div class="study-empty"><div class="study-empty-ico">💡</div>
        <p><b>Ask the AI about anything</b><br>It makes an interactive page you can explore — with key terms to reveal, cool facts and a quick check. You can also ask it for ideas.</p>
        <div class="chips">${["Tell me about black holes", "How do volcanoes work?", "Ideas for a science fair project", "Explain the Cartesian plane", "Ancient Egypt for my assignment", "Ideas for a persuasive essay"].map((x) => `<button type="button" class="btn secondary sm" data-idea>${esc(x)}</button>`).join("")}</div></div>`;
      $$("[data-idea]", main).forEach((b) => b.addEventListener("click", () => chat.send(b.textContent)));
      $("#in-page", main)?.addEventListener("change", pick);
      $("#in-new", main)?.addEventListener("click", blank);
      return;
    }
    main.innerHTML = head + `
      <article class="info-page">
        <header><h2>${esc(page.title)}</h2>${page.intro ? `<p class="lead">${esc(page.intro)}</p>` : ""}</header>
        ${page.sections.map((s, i) => `
          <details class="info-sec" open>
            <summary><span class="info-num">${i + 1}</span>${esc(s.heading || "More")}</summary>
            ${s.points.length ? `<ul>${s.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul>` : ""}
            ${s.visual ? visualHTML({ visual: s.visual }) : ""}
          </details>`).join("")}
        ${page.terms.length ? `<h3 class="info-h">🔑 Key terms <small>tap to reveal</small></h3>
          <div class="term-grid">${page.terms.map((t, i) => `<button type="button" class="term${(page.seen || []).includes(i) ? " open" : ""}" data-t="${i}"><b>${esc(t.term)}</b><span class="term-mean">${esc(t.meaning)}</span><span class="term-hint">Tap to reveal</span></button>`).join("")}</div>` : ""}
        ${page.facts.length ? `<h3 class="info-h">🤩 Did you know?</h3><div class="fact-grid">${page.facts.map((f) => `<div class="fact">${esc(f)}</div>`).join("")}</div>` : ""}
        ${page.quiz.length ? `<h3 class="info-h">✅ Quick check</h3>${page.quiz.map((q, i) => `
          <div class="qc" data-i="${i}"><p class="qc-q">${i + 1}. ${esc(q.q)}</p>
            <div class="qc-opts">${q.options.map((o) => `<button type="button" class="qc-opt">${esc(o)}</button>`).join("")}</div>
            <p class="qc-fb" aria-live="polite"></p></div>`).join("")}` : ""}
        <div class="info-actions">
          <button class="btn secondary" id="in-cards" type="button">🃏 Make flashcards from this</button>
          <button class="btn secondary" id="in-test" type="button">📝 Test me on this</button>
        </div>
      </article>`;
    $("#in-page", main)?.addEventListener("change", pick);
    $("#in-new", main)?.addEventListener("click", blank);
    $("#in-del", main)?.addEventListener("click", () => {
      if (!confirm(`Delete the page "${page.title}"?`)) return;
      state.pages = state.pages.filter((p) => p !== page);
      page = state.pages[state.pages.length - 1] || null;
      save();
      draw();
    });
    $$(".term", main).forEach((b) => b.addEventListener("click", () => {
      b.classList.toggle("open");
      page.seen = $$(".term.open", main).map((x) => +x.dataset.t);
      save();
    }));
    page.answers ||= {};
    $$(".qc", main).forEach((box) => {
      const i = +box.dataset.i, q = page.quiz[i];
      const show = (chosen) => {
        box.dataset.done = "1";
        const ok = chosen === q.answer;
        $$(".qc-opt", box).forEach((x) => {
          x.disabled = true;
          if (x.textContent === q.answer) x.classList.add("ok");
          else if (x.textContent === chosen) x.classList.add("bad");
        });
        $(".qc-fb", box).textContent = ok ? "✓ Correct!" : `✕ Not quite — it's “${q.answer}”.`;
        $(".qc-fb", box).className = `qc-fb ${ok ? "ok" : "bad"}`;
      };
      if (page.answers[i] !== undefined) show(page.answers[i]);
      $$(".qc-opt", box).forEach((b) => b.addEventListener("click", () => {
        if (box.dataset.done) return;
        page.answers[i] = b.textContent;
        save();
        show(b.textContent);
      }));
    });
    $("#in-cards", main).addEventListener("click", () => {
      pendingStudyAction = { mode: "cards", text: `Make flashcards from my info page about "${page.title}"`, hidden: pageText(page) };
      switchStudyMode?.("cards");
      window.scrollTo(0, 0);
    });
    $("#in-test", main).addEventListener("click", () => {
      pendingStudyAction = { mode: "chat", text: `Make a 10 question test on "${page.title}"`, hidden: pageText(page), fresh: true };
      switchStudyMode?.("chat");
      window.scrollTo(0, 0);
    });
  }
  function pick(e) { page = state.pages.find((p) => p.id === e.target.value) || page; save(); draw(); }
  function blank() { page = null; save(); draw(); $("#in-chat textarea", host)?.focus(); }

  const chat = chatPanel($("#in-chat", host), {
    log: state.chat,
    placeholder: "e.g. Tell me about the solar system",
    empty: "Ask about any topic, or ask for ideas. You can keep chatting to add more to your page.",
    ideas: ["How do vaccines work?", "Tell me about the Great Barrier Reef", "Ideas for a short story", "Explain photosynthesis simply"],
    onChange: () => { save(); draw(); },
    async onSend(text, hidden, progress) {
      const history = chatHistory(state.chat.slice(0, -2));
      const current = page ? `The student's current page is "${page.title}", with these sections: ${page.sections.map((s) => s.heading).join("; ")}.` : "There's no page yet.";
      if (studyFiles.info.some((f) => f.status === "reading")) throw Object.assign(new Error("files still loading"), { userMessage: "Your files are still loading — wait a moment, then send again." });
      await Promise.all([loadMemory(), ensureCalendar()]);
      const raw = await askTutorRaw(await withUploads(`You are a friendly tutor (based in Victoria, Australia) making an interactive info page WITH a student, in a chat. It can be about ANY school-appropriate subject or learning topic, at any level: facts about something, how something works, a summary of a topic from any year level, VCE, uni or TAFE, or ideas (for a project, story, essay, experiment or presentation).
${learnerLine()}
${calendarPrompt()}${memoryPrompt()}
${current}

What to do:
- If they ask about a new topic, make a NEW page ("mode": "new").
- If they want more on the current page (more detail, another section, examples, a simpler explanation of part of it, more ideas), ADD only the new parts ("mode": "add").
- If they just ask a question or chat, answer briefly ("mode": "none").
- Write clearly for the student's level (see LEVEL above) and make sure every fact is correct. A new page has 3–5 sections of 2–5 short points (under 25 words each), 3–6 key terms, 2–4 "did you know" facts and 3 multiple-choice quick-check questions.
- For maths or science you can add a diagram to a section with "visual", e.g. {"type":"bars","labels":["A","B"],"values":[3,5],"title":"..."}, {"type":"plane","points":[{"x":2,"y":3,"label":"A"}]}, {"type":"numberline","min":0,"max":10,"step":1}, {"type":"fraction","parts":4,"shaded":3}, {"type":"triangle","angles":["60°","60°","60°"]}, {"type":"circle","r":5,"unit":"cm"}, {"type":"table","rows":[["Planet","Moons"],["Earth",1],["Mars",2]]}.

${history ? `Chat so far:\n${history}\n\n` : ""}Student: ${text}

Reply with ONLY valid JSON, no markdown:
{"reply":"a short message (under 50 words)","mode":"new","page":{"title":"...","intro":"1–2 sentences","sections":[{"heading":"...","points":["..."]}],"terms":[{"term":"...","meaning":"..."}],"facts":["..."],"quiz":[{"q":"...","options":["...","...","...","..."],"answer":"..."}]},"remember":[],"forget":[]}
${memoryRules()}`, studyFiles.info,
        "The student uploaded files. Use this material for the page: summarise it, explain it, or answer their questions about it, as they ask."), progress);
      const data = parseLooseJSON(raw);
      const obj = data && !Array.isArray(data) ? data : {};
      let note = "";
      if (obj.page && typeof obj.page === "object" && obj.mode !== "none") {
        const add = cleanInfoPage(obj.page);
        const hasContent = add.sections.length || add.terms.length || add.facts.length || add.quiz.length;
        if (hasContent && (obj.mode === "add" && page)) {
          page.sections.push(...add.sections);
          const have = new Set(page.terms.map((t) => t.term.toLowerCase()));
          page.terms.push(...add.terms.filter((t) => !have.has(t.term.toLowerCase())));
          page.facts.push(...add.facts);
          page.quiz.push(...add.quiz);
          if (!page.intro && add.intro) page.intro = add.intro;
          page.updated = Date.now();
          note = `➕ Added to “${page.title}”`;
        } else if (hasContent) {
          page = { id: uid("p"), ...add, title: add.title || text.slice(0, 60), updated: Date.now() };
          state.pages.push(page);
          note = `📄 New page: “${page.title}”`;
        }
      }
      const remembered = memoryNote(applyMemoryUpdates(obj));
      return { text: aiReplyText(raw, data) || (note ? "Here you go!" : "Okay!"), note: [note, remembered].filter(Boolean).join(" · ") };
    },
  });

  draw();
}

// Printable cue cards: 8 per A4 page. Each question page is followed by its answer page, with the
// columns mirrored so that printing double-sided (flip on long edge) puts every answer behind its question.
function printDeck(deck) {
  const cards = deck.cards.filter((c) => c.f && c.b);
  if (!cards.length) return toast("Add some cards first.");
  const PER = 8, COLS = 2;
  const size = (t) => (t.length > 140 ? " xl" : t.length > 60 ? " l" : "");
  const cell = (c, n, side) => (c
    ? `<div class="pc"><span class="pc-tag">${side === "f" ? "Q" : "A"}${n}</span><div class="pc-text${size(side === "f" ? c.f : c.b)}">${esc(side === "f" ? c.f : c.b)}</div><span class="pc-deck">${esc(deck.name)}</span></div>`
    : `<div class="pc pc-empty"></div>`);
  let html = "";
  for (let p = 0; p < cards.length; p += PER) {
    const chunk = cards.slice(p, p + PER);
    while (chunk.length < PER) chunk.push(null);
    html += `<section class="pp"><div class="pp-head">QUESTIONS · ${esc(deck.name)} · <b>Print double-sided — flip on long edge</b> so each answer lands behind its question</div>${chunk.map((c, i) => cell(c, p + i + 1, "f")).join("")}</section>`;
    const mirrored = [];
    for (let r = 0; r < PER / COLS; r++) for (let col = COLS - 1; col >= 0; col--) mirrored.push(r * COLS + col);
    html += `<section class="pp"><div class="pp-head">ANSWERS · back of the page before (A1 sits behind Q1)</div>${mirrored.map((i) => cell(chunk[i], p + i + 1, "b")).join("")}</section>`;
  }
  let host = document.getElementById("print-cards");
  if (!host) { host = document.createElement("div"); host.id = "print-cards"; document.body.appendChild(host); }
  host.innerHTML = html;
  document.body.classList.add("printing-cards");
  const done = () => { document.body.classList.remove("printing-cards"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  if (!confirm("Your cue cards are ready (8 per page).\n\n• To keep them: choose \"Save as PDF\" in the print box.\n• To print: turn on DOUBLE-SIDED and choose FLIP ON LONG EDGE, so every answer prints right behind its question.\n\nOpen the print box now?")) { done(); return; }
  setTimeout(() => window.print(), 300);
}
