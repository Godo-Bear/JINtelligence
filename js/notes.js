/* My notes: students keep as many notes as they like for each topic, each with its own name.
   The notes panel sits next to the questions on every topic page, and the Notes & calendar page lists them all
   (the calendar itself is in js/calendar.js).
   Notes are saved to the Supabase "notes" table (supabase/notes.sql) with a copy on this device,
   so they still work (on this device only) if the table hasn't been set up.
   Uses helpers from app.js ($, $$, esc, store, toast, sb, authUser, ALL_TOPICS, findTopic), which exist by the time these run. */

let cloudNotes = true;
const notesKey = () => `apex-notes-${authUser.id}`;
const localNotes = () => store(notesKey()) || [];
const noteId = () => (crypto.randomUUID ? crypto.randomUUID() : "n-" + Date.now() + "-" + Math.random().toString(16).slice(2));
const GENERAL_NOTES = "general";
const noteTopicName = (id) => (id === GENERAL_NOTES ? "General" : findTopic(id)?.name || "Other");

function putLocalNote(note) {
  store(notesKey(), [note, ...localNotes().filter((n) => n.id !== note.id)].slice(0, 500));
}

async function saveNote(note) {
  note.updatedAt = new Date().toISOString();
  putLocalNote(note);
  if (!cloudNotes) return;
  let error;
  try {
    ({ error } = await sb.from("notes").upsert({
      id: note.id, user_id: authUser.id, topic_id: note.topicId, title: note.title, body: note.body,
      created_at: note.createdAt, updated_at: note.updatedAt,
    }));
  } catch (e) { error = e; }
  if (error) { cloudNotes = false; console.warn("Apex: notes table unavailable, saving on this device only —", error.message); }
}

// All of this user's notes, newest first (cloud and device copies merged; the newer one wins).
async function listNotes() {
  const byId = new Map(localNotes().map((n) => [n.id, n]));
  if (cloudNotes) {
    let data, error;
    try { ({ data, error } = await sb.from("notes").select("*").eq("user_id", authUser.id)); } catch (e) { error = e; }
    if (error) cloudNotes = false;
    else (data || []).forEach((r) => {
      const local = byId.get(r.id);
      if (local && local.updatedAt >= r.updated_at) return;
      byId.set(r.id, { id: r.id, topicId: r.topic_id, title: r.title, body: r.body, createdAt: r.created_at, updatedAt: r.updated_at });
    });
  }
  const all = [...byId.values()].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  store(notesKey(), all.slice(0, 500));
  return all;
}

async function deleteNote(id) {
  store(notesKey(), localNotes().filter((n) => n.id !== id));
  if (cloudNotes) try { await sb.from("notes").delete().eq("id", id); } catch (e) { /* the device copy is already gone */ }
}

// ---------------------------------------------------------------- The notes editor
// mode "topic": notes for one topic (the panel beside the questions).
// mode "all": every note, grouped by topic, with a topic picker (the My notes page).
function notesEditorHTML(mode) {
  return `
    <div class="notes-editor" data-mode="${mode}">
      <div class="notes-list"></div>
      <div class="notes-body hidden">
        <div class="muted small notes-from hidden"></div>
        <input type="text" class="notes-title" maxlength="80" placeholder="Note name" aria-label="Note name">
        ${mode === "all" ? `<select class="notes-topic" aria-label="Topic"></select>` : ""}
        <textarea class="notes-text" placeholder="Write anything you want to remember…" aria-label="Note"></textarea>
        <div class="row between notes-foot">
          <span class="muted small notes-status"></span>
          <button type="button" class="btn ghost sm notes-delete">🗑 Delete</button>
        </div>
      </div>
    </div>`;
}

function wireNotesEditor(root, { mode, topicId, openId } = {}) {
  const ed = $(".notes-editor", root);
  const listEl = $(".notes-list", ed), body = $(".notes-body", ed);
  const titleIn = $(".notes-title", ed), textIn = $(".notes-text", ed), topicSel = $(".notes-topic", ed);
  const status = $(".notes-status", ed);
  let notes = [], current = null, timer = null, othersOpen = false;

  if (topicSel) {
    const groups = [["Maths", MATHS_TOPICS], ["English", ENGLISH_TOPICS.filter((t) => !t.special)], ["Science", SCIENCE_TOPICS]];
    topicSel.innerHTML = `<option value="${GENERAL_NOTES}">General</option>` + groups.map(([g, ts]) =>
      `<optgroup label="${g}">${ts.map((t) => `<option value="${t.id}">${t.icon} ${esc(t.name)}</option>`).join("")}</optgroup>`).join("");
  }
  const mine = () => (mode === "topic" ? notes.filter((n) => n.topicId === topicId) : notes);

  function drawList() {
    const list = mine();
    const chip = (n) => `<button type="button" class="notes-chip ${current && n.id === current.id ? "on" : ""}" data-id="${n.id}">${esc(n.title || "Untitled")}</button>`;
    let html;
    if (mode === "all") {
      const order = [...new Set(list.map((n) => n.topicId))];
      html = list.length ? order.map((tid) => `<div class="notes-group">${esc(noteTopicName(tid))}</div><div class="notes-chips">${list.filter((n) => n.topicId === tid).map(chip).join("")}</div>`).join("")
        : `<p class="muted small" style="margin:0;">No notes yet. Make one here, or from the 📝 Notes panel on any topic.</p>`;
    } else {
      html = list.length ? `<div class="notes-chips">${list.map(chip).join("")}</div>` : `<p class="muted small" style="margin:0;">No notes for this topic yet.</p>`;
      // Every other note too, so you can read or edit them without leaving the questions.
      const others = notes.filter((n) => n.topicId !== topicId);
      if (others.length) {
        const order = [...new Set(others.map((n) => n.topicId))];
        html += `<details class="notes-others"${othersOpen || (current && current.topicId !== topicId) ? " open" : ""}>
          <summary>All my other notes (${others.length})</summary>
          ${order.map((tid) => `<div class="notes-group">${esc(noteTopicName(tid))}</div><div class="notes-chips">${others.filter((n) => n.topicId === tid).map(chip).join("")}</div>`).join("")}
        </details>`;
      }
    }
    listEl.innerHTML = html + `<button type="button" class="btn secondary sm notes-new">＋ New note${mode === "topic" ? " for this topic" : ""}</button>`;
    $(".notes-others", listEl)?.addEventListener("toggle", (e) => { othersOpen = e.target.open; });
    body.classList.toggle("hidden", !current);
  }

  function open(note) {
    flush();
    current = note;
    if (note) {
      titleIn.value = note.title || "";
      textIn.value = note.body || "";
      if (topicSel) topicSel.value = note.topicId;
      const from = $(".notes-from", ed);
      from.textContent = `From ${noteTopicName(note.topicId)}`;
      from.classList.toggle("hidden", mode !== "topic" || note.topicId === topicId);
      status.textContent = note.updatedAt ? `Saved ${fmtDateTime(note.updatedAt)}` : "";
      store("apex-notes-last", { topicId: note.topicId, id: note.id });
    }
    drawList();
  }

  // Saves a moment after typing stops, and straight away when leaving a note.
  function flush() {
    if (!timer) return;
    clearTimeout(timer); timer = null;
    if (current) saveNote(current).then(() => { status.textContent = `Saved${cloudNotes ? "" : " on this device"}`; });
  }
  function changed() {
    if (!current) return;
    current.title = titleIn.value.trim();
    current.body = textIn.value;
    if (topicSel) current.topicId = topicSel.value;
    status.textContent = "Saving…";
    clearTimeout(timer);
    timer = setTimeout(flush, 600);
  }
  titleIn.addEventListener("input", () => { changed(); const c = $(`.notes-chip[data-id="${current?.id}"]`, listEl); if (c) c.textContent = current.title || "Untitled"; });
  titleIn.addEventListener("blur", flush);
  textIn.addEventListener("input", changed);
  textIn.addEventListener("blur", flush);
  topicSel?.addEventListener("change", () => { changed(); flush(); drawList(); });

  listEl.addEventListener("click", (e) => {
    if (e.target.closest(".notes-new")) {
      const count = mine().length + 1;
      const note = { id: noteId(), topicId: mode === "topic" ? topicId : (current?.topicId || GENERAL_NOTES), title: `Note ${count}`, body: "", createdAt: new Date().toISOString() };
      notes.unshift(note);
      saveNote(note);
      open(note);
      titleIn.focus(); titleIn.select();
      return;
    }
    const c = e.target.closest(".notes-chip");
    if (c) open(notes.find((n) => n.id === c.dataset.id));
  });

  $(".notes-delete", ed).addEventListener("click", async () => {
    if (!current || !confirm(`Delete "${current.title || "Untitled"}"? This can't be undone.`)) return;
    clearTimeout(timer); timer = null;
    const id = current.id;
    notes = notes.filter((n) => n.id !== id);
    current = null;
    await deleteNote(id);
    open(mine()[0] || null);
    toast("Note deleted");
  });

  listEl.innerHTML = `<p class="muted small" style="margin:0;">Loading notes…</p>`;
  listNotes().then((all) => {
    notes = all;
    const last = store("apex-notes-last");
    const want = openId || (last && (mode === "all" || last.topicId === topicId) ? last.id : null);
    open(mine().find((n) => n.id === want) || mine()[0] || null);
  });
  return { flush };
}

// ---------------------------------------------------------------- Panel next to the questions
function notesPanelHTML() {
  return `
    <aside class="notes-panel" id="notes-panel" aria-label="My notes">
      <div class="row between notes-head">
        <h3>📝 My notes</h3>
        <button type="button" class="btn ghost sm notes-close" aria-label="Close notes">✕</button>
      </div>
      ${notesEditorHTML("topic")}
    </aside>
    <button type="button" class="notes-fab" id="notes-fab" aria-label="Open my notes">📝 Notes</button>`;
}
function wireNotesPanel(view, topic) {
  const panel = $("#notes-panel", view), fab = $("#notes-fab", view);
  const editor = wireNotesEditor(panel, { mode: "topic", topicId: topic.id });
  fab.addEventListener("click", () => { panel.classList.add("open"); fab.classList.add("hidden"); });
  $(".notes-close", panel).addEventListener("click", () => { editor.flush(); panel.classList.remove("open"); fab.classList.remove("hidden"); });
  return editor;
}

// ---------------------------------------------------------------- Notes & calendar page
// #/notes/calendar or #/notes/notes opens that tab; otherwise the last one you used.
function pageNotes(view, tab) {
  const want = ["calendar", "planner", "notes"].includes(tab) ? tab : ["notes", "planner"].includes(store("apex-notes-tab")) ? store("apex-notes-tab") : "calendar";
  view.innerHTML = `
    <div class="page-head"><h1>🗓️ Notes &amp; calendar</h1><p>Put your tests and assignments on the calendar, plan your day hour by hour in the Day planner, and keep notes for every topic.</p></div>
    <div class="segmented" id="nt-tabs" role="tablist" style="margin-bottom:16px;">
      <button type="button" role="tab" data-tab="calendar">📅 Calendar</button>
      <button type="button" role="tab" data-tab="planner">🕒 Day planner</button>
      <button type="button" role="tab" data-tab="notes">📝 Notes</button>
    </div>
    <div id="nt-calendar"></div>
    <div id="nt-planner"></div>
    <div id="nt-notes" class="card">${notesEditorHTML("all")}</div>`;
  view.closest("main").classList.add("wide");
  const editor = wireNotesEditor(view, { mode: "all" });
  let calendarReady = false, plannerReady = false;
  const open = (t) => {
    store("apex-notes-tab", t);
    $$("#nt-tabs button", view).forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle("active", on); b.setAttribute("aria-selected", String(on)); });
    $("#nt-calendar", view).classList.toggle("hidden", t !== "calendar");
    $("#nt-planner", view).classList.toggle("hidden", t !== "planner");
    $("#nt-notes", view).classList.toggle("hidden", t !== "notes");
    if (t === "calendar" && !calendarReady) { calendarReady = true; wireCalendar($("#nt-calendar", view)); }
    if (t === "planner" && !plannerReady) { plannerReady = true; wirePlanner($("#nt-planner", view)); }
    if (t !== "notes") editor.flush();
  };
  $$("#nt-tabs button", view).forEach((b) => b.addEventListener("click", () => open(b.dataset.tab)));
  open(want);
  cleanup = () => editor.flush();
}
