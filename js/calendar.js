/* Calendar: students put upcoming tests, assignments, reminders and notes on a calendar (Notes & calendar page).
   - The AI sees what's coming up in every AI chat, and the tutor adds things you tell it about
     ("I've got a science test next Friday"). "Quick add" turns a sentence into a calendar item.
   - Tests and assignments have buttons to make a practice test, flashcards or a study plan with the AI.
   - Reminders: a "Coming up" pop-up when you log in (once a day), a card on Home, and a count in the menu.
   Saved to the "calendar_events" table (supabase/calendar.sql) with a copy on this device, so it still
   works (on this device only) if the table hasn't been set up.
   Uses helpers from app.js and other files ($, $$, esc, store, toast, sb, authUser, findTopic, prefs, setPref,
   askTutorRaw, parseLooseJSON, plainText, newChatId, normalise, …), which exist by the time these run. */

let cloudCal = true;
let calEvents = null; // this student's calendar once loaded
const calKey = () => `apex-cal-${authUser.id}`;
const CAL_KINDS = {
  test: { icon: "📝", name: "Test" },
  assignment: { icon: "📚", name: "Assignment" },
  reminder: { icon: "🔔", name: "Reminder" },
  note: { icon: "🗒️", name: "Note" },
};
const CAL_SUBJECTS = ["Maths", "English", "Science", "Humanities", "Languages", "Other"];
// How many days ahead each kind shows up in reminders.
const CAL_REMIND_DAYS = { test: 7, assignment: 7, reminder: 1, note: 0 };

// Dates are "YYYY-MM-DD" in the student's own time zone.
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromYmd = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && ymd(fromYmd(s)) === s;
const todayYmd = () => ymd(new Date());
const daysUntil = (s) => Math.round((fromYmd(s) - fromYmd(todayYmd())) / 86400000);
const fmtDay = (s, long) => fromYmd(s).toLocaleDateString("en-AU", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" });
function whenText(s) {
  const n = daysUntil(s);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}
const byDate = (a, b) => a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || "");

// ---------------------------------------------------------------- Saving and loading
const localCal = () => store(calKey()) || [];
const fromCalRow = (r) => ({
  id: r.id, date: String(r.date).slice(0, 10), title: r.title || "", kind: CAL_KINDS[r.kind] ? r.kind : "note",
  subject: r.subject || "", topicId: r.topic_id || "", details: r.details || "", done: !!r.done,
  createdAt: r.created_at, updatedAt: r.updated_at, synced: true,
});
async function loadCalendar() {
  const byId = new Map(localCal().map((e) => [e.id, e]));
  if (cloudCal) {
    try {
      const { data, error } = await sb.from("calendar_events").select("*").eq("user_id", authUser.id);
      if (error) throw error;
      const inCloud = new Set();
      (data || []).forEach((r) => {
        inCloud.add(r.id);
        const mine = byId.get(r.id);
        if (mine && (mine.updatedAt || "") >= (r.updated_at || "")) return;
        byId.set(r.id, fromCalRow(r));
      });
      // Saved to the cloud before but not there now: it was deleted on another device.
      byId.forEach((e, id) => { if (e.synced && !inCloud.has(id)) byId.delete(id); });
    } catch (e) { cloudCal = false; }
  }
  calEvents = [...byId.values()].filter((e) => isYmd(e.date)).sort(byDate);
  store(calKey(), calEvents);
  refreshCalBadge();
  return calEvents;
}
const ensureCalendar = () => (calEvents ? Promise.resolve(calEvents) : loadCalendar());

async function saveEvent(ev) {
  ev.updatedAt = new Date().toISOString();
  ev.createdAt ||= ev.updatedAt;
  calEvents = [...(calEvents || []).filter((e) => e.id !== ev.id), ev].sort(byDate);
  store(calKey(), calEvents);
  refreshCalBadge();
  if (!cloudCal) return;
  try {
    const { error } = await sb.from("calendar_events").upsert({
      id: ev.id, user_id: authUser.id, date: ev.date, title: ev.title, kind: ev.kind, subject: ev.subject,
      topic_id: ev.topicId || null, details: ev.details, done: ev.done, created_at: ev.createdAt, updated_at: ev.updatedAt,
    });
    if (error) throw error;
    ev.synced = true;
    store(calKey(), calEvents);
  } catch (e) { cloudCal = false; console.warn("Apex: calendar_events table unavailable, saving the calendar on this device only —", e.message || e); }
}
async function deleteEvent(id) {
  calEvents = (calEvents || []).filter((e) => e.id !== id);
  store(calKey(), calEvents);
  refreshCalBadge();
  if (cloudCal) try { await sb.from("calendar_events").delete().eq("id", id); } catch (e) { /* the device copy is already gone */ }
}
function forgetLocalCalendar() { calEvents = null; cloudCal = true; }

const upcomingEvents = (days = 30) => (calEvents || []).filter((e) => { const n = daysUntil(e.date); return !e.done && n >= 0 && n <= days; });
const dueSoon = () => (calEvents || []).filter((e) => { const n = daysUntil(e.date); return !e.done && n >= 0 && n <= (CAL_REMIND_DAYS[e.kind] ?? 1); });

// The number on "Notes & calendar" in the menu: things on today or tomorrow.
function refreshCalBadge() {
  const n = (calEvents || []).filter((e) => !e.done && [0, 1].includes(daysUntil(e.date))).length;
  $$('[data-route="notes"], #menu-notes, [data-open="menu"]').forEach((el) => {
    let b = $(".nav-badge", el);
    if (!n) { b?.remove(); return; }
    if (!b) { b = document.createElement("span"); b.className = "nav-badge"; el.appendChild(b); }
    b.textContent = n;
    b.title = `${n} thing${n === 1 ? "" : "s"} on today or tomorrow`;
  });
}

// ---------------------------------------------------------------- The AI and the calendar
const calendarVisibleToAI = () => prefs().calAI !== false;
// Today's date (so the AI can work out "next Friday") and what's coming up.
function calendarPrompt() {
  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const lines = calendarVisibleToAI() ? upcomingEvents(60).slice(0, 15).map((e) =>
    `- ${fmtDay(e.date)} (${whenText(e.date).toLowerCase()}): ${CAL_KINDS[e.kind].name}${e.subject ? ` (${e.subject})` : ""} — ${e.title}${e.details ? `. Details: ${e.details.slice(0, 200)}` : ""}`) : [];
  return `Today is ${today} (${todayYmd()}).${lines.length ? `\nComing up in the student's calendar (bring it up when it's relevant, e.g. offer to help them prepare for a test that's soon):\n${lines.join("\n")}` : ""}\n`;
}
function calendarRules() {
  return `Calendar: if the student tells you about a test, assignment, due date or event on a particular day that isn't already in their calendar, add it to "calendar" as {"date":"YYYY-MM-DD","title":"short title","kind":"test" | "assignment" | "reminder" | "note","subject":"Maths" | "English" | "Science" | "Humanities" | "Languages" | "Other","details":"what's on it, if they said"}. Work out the date from today's date, and only add it if you know the day. Put dated things in "calendar", not "remember". Usually "calendar" is [].`;
}
// Adds items the AI found. Returns the ones added.
function addEventsFromAI(list) {
  if (!Array.isArray(list)) return [];
  const added = [];
  list.slice(0, 5).forEach((x) => {
    if (!x || typeof x !== "object" || !isYmd(x.date) || daysUntil(x.date) < -1 || daysUntil(x.date) > 400) return;
    const title = plainText(x.title || "").slice(0, 80);
    if (!title) return;
    if ((calEvents || []).some((e) => e.date === x.date && normalise(e.title) === normalise(title))) return;
    const ev = {
      id: newChatId(), date: x.date, title, kind: CAL_KINDS[x.kind] ? x.kind : "reminder",
      subject: CAL_SUBJECTS.includes(x.subject) ? x.subject : "", topicId: "", details: plainText(x.details || "").slice(0, 500), done: false,
    };
    saveEvent(ev);
    added.push(ev);
  });
  return added;
}
const calendarNote = (added) => (added.length ? `📅 Added to your calendar: ${added.map((e) => `${e.title} (${fmtDay(e.date)})`).join(" · ")}` : "");

// ---------------------------------------------------------------- Getting ready with the AI
const goTo = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
const prepText = (e) => `my ${e.subject ? e.subject + " " : ""}${CAL_KINDS[e.kind].name.toLowerCase()} "${e.title}" on ${fmtDay(e.date, true)}${e.details ? ` (what's on it: ${e.details})` : ""}`;
let pendingTutorMessage = null; // sent in a new tutor chat when the Tutor page opens
function takeTutorMessage() { const m = pendingTutorMessage; pendingTutorMessage = null; return m; }

function calendarAction(act, ev) {
  if (act === "test") {
    pendingStudyAction = { mode: "chat", text: `Make a 10 question practice test for ${prepText(ev)}`, fresh: true };
    testMode = "chat";
    goTo("#/test");
  } else if (act === "cards") {
    pendingStudyAction = { mode: "cards", text: `Make flashcards to help me study for ${prepText(ev)}`, hidden: `${ev.title}. ${ev.details}` };
    testMode = "cards";
    goTo("#/test");
  } else if (act === "plan") {
    pendingTutorMessage = `Help me make a study plan for ${prepText(ev)}. It's ${whenText(ev.date).toLowerCase()}.`;
    goTo("#/tutor");
  }
}

// ---------------------------------------------------------------- Pieces used on several pages
function calRowHTML(e) {
  const d = fromYmd(e.date), n = daysUntil(e.date);
  return `<button type="button" class="cal-row k-${e.kind}" data-go="${e.date}">
    <span class="cal-date"><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-AU", { month: "short" })}</small></span>
    <span class="cal-row-main"><span class="cal-row-title">${CAL_KINDS[e.kind].icon} ${esc(e.title)}</span><span class="muted small">${CAL_KINDS[e.kind].name}${e.subject ? ` · ${esc(e.subject)}` : ""}</span></span>
    <span class="cal-when${n <= 2 ? " soon" : ""}">${whenText(e.date)}</span>
  </button>`;
}
function calEventHTML(e, { showDate = false, foot = true } = {}) {
  const k = CAL_KINDS[e.kind], n = daysUntil(e.date), prep = (e.kind === "test" || e.kind === "assignment") && !e.done && n >= 0;
  const topic = e.topicId && findTopic(e.topicId);
  return `<div class="cal-event k-${e.kind}${e.done ? " done" : ""}" data-id="${esc(e.id)}">
    <div class="cal-event-top">
      <span class="cal-kind">${k.icon} ${k.name}${e.subject ? ` · ${esc(e.subject)}` : ""}</span>
      ${e.done ? `<span class="cal-when">✓ Done</span>` : showDate ? `<span class="cal-when${n <= 2 ? " soon" : ""}">${whenText(e.date)}</span>` : ""}
    </div>
    <div class="cal-event-title">${esc(e.title)}</div>
    ${showDate ? `<div class="muted small">${fmtDay(e.date, true)}</div>` : ""}
    ${e.details ? `<div class="cal-event-details">${esc(e.details)}</div>` : ""}
    ${prep ? `<div class="cal-prep">
      <button type="button" class="btn sm" data-act="test">🤖 Practice test</button>
      <button type="button" class="btn secondary sm" data-act="cards">🃏 Flashcards</button>
      <button type="button" class="btn secondary sm" data-act="plan">🗓️ Study plan</button>
    </div>` : ""}
    ${foot || topic ? `<div class="cal-event-foot">
      ${topic ? `<a class="btn ghost sm" href="#/practice/${topic.id}">${topic.icon} Practice ${esc(topic.name)}</a>` : ""}
      ${foot ? `<button type="button" class="btn ghost sm" data-act="edit">✏️ Edit</button>
      <button type="button" class="btn ghost sm" data-act="done">${e.done ? "↩︎ Not done" : "✓ Mark done"}</button>` : ""}
    </div>` : ""}
  </div>`;
}

// ---------------------------------------------------------------- Add / edit
function topicOptions(selected) {
  const groups = [["Maths", MATHS_TOPICS], ["English", ENGLISH_TOPICS.filter((t) => !t.special)], ["Science", SCIENCE_TOPICS]];
  return `<option value="">None</option>` + groups.map(([g, ts]) =>
    `<optgroup label="${g}">${ts.map((t) => `<option value="${t.id}"${t.id === selected ? " selected" : ""}>${t.icon} ${esc(t.name)}</option>`).join("")}</optgroup>`).join("");
}
const topicSubject = (id) => (MATHS_TOPICS.some((t) => t.id === id) ? "Maths" : ENGLISH_TOPICS.some((t) => t.id === id) ? "English" : SCIENCE_TOPICS.some((t) => t.id === id) ? "Science" : "");

function openEventEditor(existing, { date, onSaved } = {}) {
  const isNew = !existing;
  const ev = existing ? { ...existing } : { id: newChatId(), date: date || todayYmd(), title: "", kind: "test", subject: "", topicId: "", details: "", done: false };
  $("#modal-cal-event")?.remove();
  const m = document.createElement("div");
  m.id = "modal-cal-event";
  m.className = "modal";
  m.innerHTML = `<form class="card stack cal-editor" autocomplete="off">
    <div class="row between"><h2 style="margin:0;">${isNew ? "📅 Add to calendar" : "✏️ Edit"}</h2><button type="button" class="btn ghost" data-close aria-label="Close">✕</button></div>
    <div class="cal-kinds" role="radiogroup" aria-label="What kind?">${Object.entries(CAL_KINDS).map(([k, v]) =>
      `<button type="button" role="radio" class="cal-kind-btn k-${k}" data-kind="${k}"><span>${v.icon}</span>${v.name}</button>`).join("")}</div>
    <div><label class="field" for="ce-title">What is it?</label><input type="text" id="ce-title" maxlength="80" required placeholder="e.g. Fractions test" value="${esc(ev.title)}"></div>
    <div class="ce-two">
      <div><label class="field" for="ce-date">Date</label><input type="date" id="ce-date" required value="${ev.date}"></div>
      <div><label class="field" for="ce-subject">Subject</label><select id="ce-subject"><option value="">—</option>${CAL_SUBJECTS.map((s) => `<option${s === ev.subject ? " selected" : ""}>${s}</option>`).join("")}</select></div>
    </div>
    <div><label class="field" for="ce-topic">Topic on JINtelligence <span class="muted small">(optional — adds a practice button)</span></label><select id="ce-topic">${topicOptions(ev.topicId)}</select></div>
    <div><label class="field" for="ce-details">Details <span class="muted small">(what's on it, what to bring…)</span></label><textarea id="ce-details" maxlength="500" placeholder="e.g. Fractions, decimals and percentages. Calculator allowed.">${esc(ev.details)}</textarea></div>
    <div class="row between">
      ${isNew ? "<span></span>" : `<button type="button" class="btn ghost" id="ce-delete">🗑 Delete</button>`}
      <div class="row" style="gap:8px;"><button type="button" class="btn secondary" data-close>Cancel</button><button class="btn" type="submit">${isNew ? "Add" : "Save"}</button></div>
    </div>
  </form>`;
  document.body.appendChild(m);
  const form = $("form", m);
  const setKind = (k) => { ev.kind = k; $$(".cal-kind-btn", m).forEach((b) => { const on = b.dataset.kind === k; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); }); };
  setKind(ev.kind);
  $$(".cal-kind-btn", m).forEach((b) => b.addEventListener("click", () => setKind(b.dataset.kind)));
  $("#ce-topic", m).addEventListener("change", (e) => { const s = topicSubject(e.target.value); if (s && !$("#ce-subject", m).value) $("#ce-subject", m).value = s; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#ce-title", m).value.trim(), day = $("#ce-date", m).value;
    if (!title || !isYmd(day)) return toast("Add a name and a date.");
    Object.assign(ev, { title, date: day, subject: $("#ce-subject", m).value, topicId: $("#ce-topic", m).value, details: $("#ce-details", m).value.trim() });
    m.remove();
    await saveEvent(ev);
    toast(isNew ? `Added to ${fmtDay(ev.date)}` : "Saved");
    onSaved?.(ev);
  });
  $("#ce-delete", m)?.addEventListener("click", async () => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    m.remove();
    await deleteEvent(ev.id);
    toast("Deleted");
    onSaved?.(null);
  });
  if (isNew) $("#ce-title", m).focus();
}

// Clicks on event cards and rows (shared by the calendar, Home and the pop-up).
function handleCalClick(e, redraw) {
  const go = e.target.closest("[data-go]");
  if (go) { calView.month = go.dataset.go.slice(0, 7); calView.day = go.dataset.go; goTo("#/notes/calendar"); return true; }
  const btn = e.target.closest("[data-act]"), card = e.target.closest(".cal-event");
  if (!btn || !card) return false;
  const ev = (calEvents || []).find((x) => x.id === card.dataset.id);
  if (!ev) return true;
  const act = btn.dataset.act;
  if (act === "edit") openEventEditor(ev, { onSaved: redraw });
  else if (act === "done") { ev.done = !ev.done; saveEvent(ev); redraw?.(); }
  else calendarAction(act, ev);
  return true;
}

// ---------------------------------------------------------------- The calendar (Notes & calendar page)
const calView = { month: null, day: null }; // what's showing, kept while you move around the site
function wireCalendar(host) {
  calView.month ||= todayYmd().slice(0, 7);
  calView.day ||= todayYmd();
  host.innerHTML = `
    <div class="cal-wrap">
      <div class="card cal-card">
        <div class="cal-head">
          <div class="cal-nav">
            <button type="button" class="btn ghost cal-prev" aria-label="Previous month">‹</button>
            <h2 class="cal-month" aria-live="polite"></h2>
            <button type="button" class="btn ghost cal-next" aria-label="Next month">›</button>
          </div>
          <div class="row" style="gap:6px;">
            <button type="button" class="btn secondary sm cal-today">Today</button>
            <button type="button" class="btn sm cal-add">＋ Add</button>
          </div>
        </div>
        <form class="cal-quick" autocomplete="off">
          <span class="cal-quick-ico" aria-hidden="true">✨</span>
          <input type="text" maxlength="200" placeholder='Quick add — e.g. "Science test next Friday on forces"' aria-label="Quick add with AI">
          <button class="btn secondary sm" type="submit">Add</button>
        </form>
        <div class="cal-grid"></div>
        <div class="cal-legend">${Object.entries(CAL_KINDS).map(([k, v]) => `<span><i class="cal-dot k-${k}"></i>${v.name}</span>`).join("")}</div>
      </div>
      <div class="cal-side">
        <div class="card cal-daybox"></div>
        <div class="card cal-soon"></div>
        <label class="cal-ai card">
          <span>🤖 Let the AI see my calendar<br><span class="muted small">So it can help you get ready and remind you in chats.</span></span>
          <input type="checkbox" class="cal-ai-on"${calendarVisibleToAI() ? " checked" : ""}>
        </label>
      </div>
    </div>`;
  const grid = $(".cal-grid", host), dayBox = $(".cal-daybox", host), soonBox = $(".cal-soon", host);

  function drawGrid() {
    const [y, m] = calView.month.split("-").map(Number);
    const first = new Date(y, m - 1, 1), lead = (first.getDay() + 6) % 7; // weeks start on Monday
    const days = new Date(y, m, 0).getDate(), weeks = Math.ceil((lead + days) / 7);
    const today = todayYmd(), byDay = {};
    (calEvents || []).forEach((e) => (byDay[e.date] ||= []).push(e));
    $(".cal-month", host).textContent = first.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
    let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="cal-dow">${d}</div>`).join("");
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(y, m - 1, 1 - lead + i), key = ymd(d), evs = byDay[key] || [];
      const cls = ["cal-day", d.getMonth() !== m - 1 && "out", key === today && "today", key === calView.day && "sel", key < today && "past", (d.getDay() === 0 || d.getDay() === 6) && "wkend"].filter(Boolean).join(" ");
      html += `<button type="button" class="${cls}" data-date="${key}" aria-label="${fmtDay(key, true)}${evs.length ? `, ${evs.length} item${evs.length === 1 ? "" : "s"}` : ""}"${key === calView.day ? ' aria-current="date"' : ""}>
        <span class="cal-num">${d.getDate()}</span>
        ${evs.length ? `<span class="cal-chips">${evs.slice(0, 3).map((e) => `<span class="cal-chip k-${e.kind}${e.done ? " done" : ""}">${esc(e.title)}</span>`).join("")}${evs.length > 3 ? `<span class="cal-more">+${evs.length - 3} more</span>` : ""}</span>
        <span class="cal-dots">${evs.slice(0, 4).map((e) => `<i class="cal-dot k-${e.kind}${e.done ? " done" : ""}"></i>`).join("")}</span>` : ""}
      </button>`;
    }
    grid.innerHTML = html;
  }
  function drawDay() {
    const evs = (calEvents || []).filter((e) => e.date === calView.day);
    dayBox.innerHTML = `
      <div class="cal-dayhead">
        <div><div class="cal-dayname">${fmtDay(calView.day, true)}</div><div class="muted small">${whenText(calView.day)}</div></div>
        <button type="button" class="btn secondary sm cal-add-day">＋ Add</button>
      </div>
      ${evs.length ? `<div class="cal-events">${evs.map((e) => calEventHTML(e)).join("")}</div>` : `<p class="muted small" style="margin:0;">Nothing on this day yet.</p>`}`;
  }
  function drawSoon() {
    const soon = upcomingEvents(30);
    soonBox.innerHTML = `<h3 class="cal-side-h">⏰ Coming up</h3>
      ${soon.length ? `<div class="cal-rows">${soon.slice(0, 8).map(calRowHTML).join("")}</div>${soon.length > 8 ? `<p class="muted small" style="margin:6px 0 0;">+${soon.length - 8} more this month</p>` : ""}`
        : `<p class="muted small" style="margin:0;">Nothing in the next 30 days. Add your tests and assignments and you'll get reminders — and the AI can help you get ready.</p>`}`;
  }
  const drawAll = () => { if (!document.body.contains(grid)) return; drawGrid(); drawDay(); drawSoon(); };
  const select = (day) => { calView.day = day; calView.month = day.slice(0, 7); drawAll(); };
  const shiftMonth = (by) => {
    const [y, m] = calView.month.split("-").map(Number);
    calView.month = ymd(new Date(y, m - 1 + by, 1)).slice(0, 7);
    drawGrid();
  };

  $(".cal-prev", host).addEventListener("click", () => shiftMonth(-1));
  $(".cal-next", host).addEventListener("click", () => shiftMonth(1));
  $(".cal-today", host).addEventListener("click", () => select(todayYmd()));
  $(".cal-add", host).addEventListener("click", () => openEventEditor(null, { date: calView.day, onSaved: (ev) => (ev ? select(ev.date) : drawAll()) }));
  grid.addEventListener("click", (e) => {
    const cell = e.target.closest("[data-date]");
    if (!cell) return;
    select(cell.dataset.date);
    if (matchMedia("(max-width: 900px)").matches) dayBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  dayBox.addEventListener("click", (e) => {
    if (e.target.closest(".cal-add-day")) return openEventEditor(null, { date: calView.day, onSaved: (ev) => (ev ? select(ev.date) : drawAll()) });
    handleCalClick(e, drawAll);
  });
  soonBox.addEventListener("click", (e) => { const go = e.target.closest("[data-go]"); if (go) select(go.dataset.go); });
  $(".cal-ai-on", host).addEventListener("change", (e) => { setPref("calAI", e.target.checked); toast(e.target.checked ? "The AI can see your calendar" : "The AI can't see your calendar now"); });

  // Quick add: the AI turns a sentence into calendar items.
  const quick = $(".cal-quick", host);
  quick.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("input", quick), btn = $("button", quick), text = input.value.trim();
    if (!text) return;
    btn.disabled = true; btn.textContent = "Adding…";
    try {
      const raw = await askTutorRaw(`${calendarPrompt()}
The student typed this to add to their school calendar: "${text}"
Turn it into calendar items. Work out each date from today's date (e.g. "next Friday", "on the 24th", "in two weeks"). If they don't give a day, don't guess — leave "items" empty and ask for the day in "reply".
Reply with ONLY valid JSON, no markdown:
{"items":[{"date":"YYYY-MM-DD","title":"short title (2–6 words)","kind":"test" | "assignment" | "reminder" | "note","subject":"Maths" | "English" | "Science" | "Humanities" | "Languages" | "Other","details":"anything else they said, e.g. what's on it"}],"reply":"a short message"}`);
      const data = parseLooseJSON(raw);
      const added = addEventsFromAI(data?.items);
      if (added.length) {
        input.value = "";
        select(added[0].date);
        toast(`📅 Added: ${added.map((x) => `${x.title} (${fmtDay(x.date)})`).join(", ")}`);
      } else toast(plainText(data?.reply || "") || "I couldn't work out the date — try adding the day, or use ＋ Add.");
    } catch (err) {
      console.error(err);
      toast(err.userMessage ? `${err.userMessage} Or use ＋ Add.` : "Couldn't reach the AI. Use ＋ Add instead.");
    }
    btn.disabled = false; btn.textContent = "Add";
  });

  drawAll();
  loadCalendar().then(drawAll);
}

// ---------------------------------------------------------------- Home card and the log-in reminder
async function homeCalendarCard(box) {
  await ensureCalendar();
  if (!document.body.contains(box)) return;
  const soon = upcomingEvents(14);
  if (!soon.length) {
    box.innerHTML = `<a class="card cal-cta" href="#/notes/calendar"><span class="cal-cta-ico">📅</span><span><b>Got a test coming up?</b><br><span class="muted small">Add it to your calendar — you'll get reminders, and the AI can make you a practice test.</span></span><span class="btn secondary sm">Open calendar</span></a>`;
    return;
  }
  const next = soon.find((e) => e.kind === "test" || e.kind === "assignment"), n = next ? daysUntil(next.date) : 99;
  box.innerHTML = `
    <div class="section-label row between" style="margin-bottom:10px;"><span>📅 Coming up</span><a class="btn ghost sm" href="#/notes/calendar">Calendar →</a></div>
    <div class="card cal-home">
      ${n <= 7 ? `<div class="cal-home-next k-${next.kind}" data-id="${esc(next.id)}">
        <div><b>${CAL_KINDS[next.kind].icon} ${esc(next.title)}</b> is ${n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`}. Want to get ready?</div>
        <div class="row" style="gap:6px;"><button type="button" class="btn sm" data-act="test">🤖 Practice test</button><button type="button" class="btn secondary sm" data-act="plan">🗓️ Study plan</button></div>
      </div>` : ""}
      <div class="cal-rows">${soon.slice(0, 4).map(calRowHTML).join("")}</div>
    </div>`;
  box.addEventListener("click", (e) => {
    const b = e.target.closest(".cal-home-next [data-act]");
    if (b) { const ev = calEvents.find((x) => x.id === b.closest(".cal-home-next").dataset.id); if (ev) calendarAction(b.dataset.act, ev); return; }
    handleCalClick(e);
  });
}

// Once a day when you log in: what's coming up soon.
function showComingUp(next) {
  loadCalendar().then(() => {
    const key = `apex-cal-shown-${authUser.id}`, soon = dueSoon();
    if (!soon.length || store(key) === todayYmd()) return next();
    store(key, todayYmd());
    $("#modal-coming-up")?.remove();
    const m = document.createElement("div");
    m.id = "modal-coming-up";
    m.className = "modal";
    m.dataset.sticky = "1";
    m.innerHTML = `<div class="card stack cal-pop">
      <div><h2 style="margin:0;">📅 Coming up</h2><p class="muted small" style="margin:4px 0 0;">From your calendar — good luck!</p></div>
      <div class="cal-events">${soon.slice(0, 5).map((e) => calEventHTML(e, { showDate: true, foot: false })).join("")}</div>
      <div class="row between"><a class="btn ghost" href="#/notes/calendar" data-done>Open calendar</a><button type="button" class="btn" data-done>Got it</button></div>
    </div>`;
    document.body.appendChild(m);
    let closed = false;
    const close = () => { if (closed) return; closed = true; m.remove(); next(); };
    m.addEventListener("click", (e) => {
      if (e.target.closest("[data-done], a")) return close();
      if (e.target.closest("[data-act]")) { close(); handleCalClick(e); }
    });
  }).catch(() => next());
}
