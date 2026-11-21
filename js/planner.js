/* Day planner: students plan their day hour by hour (what happens and when to study) in Notes & calendar → Day planner.
   - Each block has a time, a title, a kind (study, school, activity…), an optional subject and notes, and a Done tick.
   - Blocks can be repeated (every weekday this week, the same day for 4 weeks…).
   - Saved to the "day_plans" table (supabase/day-planner.sql) with a copy on this device, so it still works (on this
     device only) if the table hasn't been set up. A parent linked with the student's code can read it (read-only),
     together with the student's calendar — see pageParentSchedule in js/parent.js.
   Uses helpers from app.js and calendar.js ($, $$, esc, store, toast, sb, authUser, ymd, fromYmd, isYmd, todayYmd,
   fmtDay, whenText, CAL_KINDS, CAL_SUBJECTS, calEvents, ensureCalendar), which exist by the time these run. */

let cloudPlanner = true;
let planBlocks = null; // this student's day plan once loaded
const plannerKey = () => `apex-dayplan-${authUser.id}`;
const PLAN_KINDS = {
  study: { icon: "📚", name: "Study" },
  school: { icon: "🏫", name: "School" },
  activity: { icon: "⚽", name: "Sport / activity" },
  break: { icon: "🍎", name: "Break / meal" },
  chores: { icon: "🧹", name: "Chores" },
  free: { icon: "🎮", name: "Free time" },
  other: { icon: "📌", name: "Other" },
};
const PLAN_REPEATS = [["once", "Just this day"], ["weekdays", "Every weekday (Mon–Fri) this week"], ["week", "Every day this week"], ["weekly", "Same day for the next 4 weeks"]];
const PLAN_QUICK = [
  { title: "Morning study", kind: "study", start: "07:30", end: "08:00" },
  { title: "School", kind: "school", start: "09:00", end: "15:30" },
  { title: "After-school study", kind: "study", start: "16:00", end: "17:00" },
  { title: "Free time", kind: "free", start: "17:30", end: "18:30" },
  { title: "Reading", kind: "study", start: "19:30", end: "20:00" },
];
const plannerView = { day: null };
const newBlockId = () => (crypto.randomUUID ? crypto.randomUUID() : "b-" + Date.now() + "-" + Math.random().toString(16).slice(2));

// Times are "HH:MM" text (24-hour), shown as 9:30 am.
const timeToMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "")); return m ? +m[1] * 60 + +m[2] : null; };
const fmtTime = (t) => { const mins = timeToMin(t); if (mins === null) return ""; const h = Math.floor(mins / 60), m = mins % 60; return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const fmtSpan = (min) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`; };
const blockMinutes = (b) => { const s = timeToMin(b.start), e = timeToMin(b.end); return s !== null && e !== null && e > s ? e - s : 0; };
const cmpBlocks = (a, b) => a.date.localeCompare(b.date) || (a.start || "~").localeCompare(b.start || "~") || (a.createdAt || "").localeCompare(b.createdAt || "");
const fromBlockRow = (r) => ({
  id: r.id, date: String(r.date).slice(0, 10), start: String(r.start_time || "").slice(0, 5), end: String(r.end_time || "").slice(0, 5),
  title: r.title || "", kind: PLAN_KINDS[r.kind] ? r.kind : "other", subject: r.subject || "", details: r.details || "", done: !!r.done,
  createdAt: r.created_at, updatedAt: r.updated_at, synced: true,
});
const toBlockRow = (b) => ({
  id: b.id, user_id: authUser.id, date: b.date, start_time: b.start || "", end_time: b.end || "", title: b.title, kind: b.kind,
  subject: b.subject || "", details: b.details || "", done: !!b.done, created_at: b.createdAt, updated_at: b.updatedAt,
});

// ---------------------------------------------------------------- Saving and loading
async function loadDayPlan() {
  const since = ymd(new Date(Date.now() - 45 * 86400000));
  const byId = new Map((store(plannerKey()) || []).map((b) => [b.id, b]));
  if (cloudPlanner) {
    try {
      const { data, error } = await sb.from("day_plans").select("*").eq("user_id", authUser.id).gte("date", since);
      if (error) throw error;
      const inCloud = new Set();
      (data || []).forEach((r) => {
        inCloud.add(r.id);
        const mine = byId.get(r.id);
        if (mine && (mine.updatedAt || "") >= (r.updated_at || "")) return;
        byId.set(r.id, fromBlockRow(r));
      });
      byId.forEach((b, id) => { if (b.synced && !inCloud.has(id) && b.date >= since) byId.delete(id); }); // deleted on another device
    } catch (e) { cloudPlanner = false; }
  }
  planBlocks = [...byId.values()].filter((b) => isYmd(b.date)).sort(cmpBlocks);
  store(plannerKey(), planBlocks);
  const waiting = planBlocks.filter((b) => !b.synced);
  if (cloudPlanner && waiting.length) saveDayBlocks(waiting); // things made while the table was missing
  return planBlocks;
}
const ensureDayPlan = () => (planBlocks ? Promise.resolve(planBlocks) : loadDayPlan());

async function saveDayBlocks(list) {
  const now = new Date().toISOString();
  list.forEach((b) => { b.updatedAt = now; b.createdAt ||= now; });
  const ids = new Set(list.map((b) => b.id));
  planBlocks = [...(planBlocks || []).filter((b) => !ids.has(b.id)), ...list].sort(cmpBlocks);
  store(plannerKey(), planBlocks);
  if (!cloudPlanner) return;
  try {
    const { error } = await sb.from("day_plans").upsert(list.map(toBlockRow));
    if (error) throw error;
    list.forEach((b) => { b.synced = true; });
    store(plannerKey(), planBlocks);
  } catch (e) { cloudPlanner = false; console.warn("Apex: day_plans table unavailable, saving the day plan on this device only —", e.message || e); }
}
async function deleteDayBlock(id) {
  planBlocks = (planBlocks || []).filter((b) => b.id !== id);
  store(plannerKey(), planBlocks);
  if (cloudPlanner) try { await sb.from("day_plans").delete().eq("id", id); } catch (e) { /* the device copy is already gone */ }
}
function forgetDayPlan() { planBlocks = null; cloudPlanner = true; }

// ---------------------------------------------------------------- Showing a day (also used, read-only, by parents)
function planSummary(blocks) {
  const study = blocks.filter((b) => b.kind === "study");
  return {
    total: blocks.length, done: blocks.filter((b) => b.done).length,
    studyMin: study.reduce((s, b) => s + blockMinutes(b), 0), studyDoneMin: study.filter((b) => b.done).reduce((s, b) => s + blockMinutes(b), 0),
  };
}
function planSummaryHTML(blocks) {
  if (!blocks.length) return "";
  const s = planSummary(blocks), pct = Math.round((s.done / s.total) * 100);
  return `<div class="pl-summary-in">
    <div class="row between small"><span><b>${s.done} of ${s.total}</b> done${s.studyMin ? ` · 📚 ${fmtSpan(s.studyMin)} of study planned${s.studyDoneMin ? ` (${fmtSpan(s.studyDoneMin)} done)` : ""}` : ""}</span><span class="muted">${pct}%</span></div>
    <div class="pc-bar ${pct >= 75 ? "good" : pct >= 40 ? "mid" : "low"}"><span style="width:${pct}%"></span></div>
  </div>`;
}
function planRowsHTML(blocks, { readOnly = false } = {}) {
  let prevEnd = -1;
  return `<div class="pl-list">${blocks.map((b) => {
    const s = timeToMin(b.start), e = timeToMin(b.end), dur = blockMinutes(b), k = PLAN_KINDS[b.kind];
    const overlap = s !== null && prevEnd > s;
    if (s !== null) prevEnd = Math.max(prevEnd, e !== null && e > s ? e : s);
    return `<div class="pl-row k-${b.kind}${b.done ? " done" : ""}" data-bid="${esc(b.id)}">
      <div class="pl-time"><b>${esc(fmtTime(b.start) || "Any time")}</b>${b.end ? `<small>to ${esc(fmtTime(b.end))}</small>` : ""}</div>
      <div class="pl-main">
        <div class="pl-title">${k.icon} ${esc(b.title)}</div>
        <div class="muted small">${k.name}${b.subject ? ` · ${esc(b.subject)}` : ""}${dur ? ` · ${fmtSpan(dur)}` : ""}${overlap ? ` · <span class="pl-warn">⚠️ overlaps</span>` : ""}</div>
        ${b.details ? `<div class="pl-details">${esc(b.details)}</div>` : ""}
      </div>
      <div class="pl-actions">${readOnly
        ? (b.done ? `<span class="tag good">✓ Done</span>` : "")
        : `<label class="pl-check"><input type="checkbox" data-act="done"${b.done ? " checked" : ""}> Done</label>
           <button type="button" class="btn ghost sm" data-act="edit" aria-label="Edit ${esc(b.title)}">✏️</button>
           <button type="button" class="btn ghost sm" data-act="del" aria-label="Delete ${esc(b.title)}">🗑</button>`}</div>
    </div>`;
  }).join("")}</div>`;
}

// ---------------------------------------------------------------- The Day planner tab
function mondayOf(day) { const d = fromYmd(day); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
function repeatDates(day, mode) {
  if (mode === "weekly") return [0, 1, 2, 3].map((i) => { const d = fromYmd(day); d.setDate(d.getDate() + 7 * i); return ymd(d); });
  if (mode === "week" || mode === "weekdays") {
    const mon = mondayOf(day);
    return Array.from({ length: mode === "week" ? 7 : 5 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return ymd(d); });
  }
  return [day];
}

function wirePlanner(host) {
  plannerView.day ||= todayYmd();
  host.innerHTML = `
    <div class="pl-wrap">
      <div class="card pl-card">
        <div class="pl-head">
          <div class="cal-nav">
            <button type="button" class="btn ghost pl-prev" aria-label="Previous day">‹</button>
            <div class="pl-dayname" aria-live="polite"></div>
            <button type="button" class="btn ghost pl-next" aria-label="Next day">›</button>
          </div>
          <div class="row" style="gap:6px;">
            <button type="button" class="btn secondary sm pl-today">Today</button>
            <button type="button" class="btn sm pl-add">＋ Add to my day</button>
          </div>
        </div>
        <div class="pl-week"></div>
        <div class="pl-events"></div>
        <div class="pl-summary"></div>
        <div class="pl-listbox"></div>
        <form class="pl-form hidden" autocomplete="off"></form>
      </div>
      <p class="muted small pl-note">👨‍👩‍👧 A parent or guardian you link with your code (Settings → Parent access) can see your day plan and calendar, but they can't change them.</p>
    </div>`;
  const $in = (sel) => $(sel, host);
  const form = $in(".pl-form");
  let editing = null;

  const dayBlocks = () => (planBlocks || []).filter((b) => b.date === plannerView.day);
  function drawWeek() {
    const mon = mondayOf(plannerView.day), today = todayYmd(), counts = {};
    (planBlocks || []).forEach((b) => { counts[b.date] = (counts[b.date] || 0) + 1; });
    $in(".pl-week").innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i); const key = ymd(d);
      return `<button type="button" class="pl-wk${key === plannerView.day ? " sel" : ""}${key === today ? " today" : ""}" data-day="${key}" aria-label="${fmtDay(key, true)}${counts[key] ? `, ${counts[key]} planned` : ""}">
        <small>${d.toLocaleDateString(uiLocale(), { weekday: "short" })}</small><b>${d.getDate()}</b><i class="pl-wk-dot${counts[key] ? " on" : ""}"></i></button>`;
    }).join("");
  }
  function drawDay() {
    const day = plannerView.day, blocks = dayBlocks();
    $in(".pl-dayname").innerHTML = `<b>${fmtDay(day, true)}</b><span class="muted small">${whenText(day)}</span>`;
    const evs = (calEvents || []).filter((e) => e.date === day);
    $in(".pl-events").innerHTML = evs.length
      ? `<div class="pl-evrow"><span class="muted small">On your calendar:</span>${evs.map((e) => `<span class="pl-evchip k-${e.kind}${e.done ? " done" : ""}">${CAL_KINDS[e.kind].icon} ${esc(e.title)}</span>`).join("")}</div>` : "";
    $in(".pl-summary").innerHTML = planSummaryHTML(blocks);
    if (blocks.length) { $in(".pl-listbox").innerHTML = planRowsHTML(blocks); return; }
    const yesterday = ymd(new Date(fromYmd(day).getTime() - 86400000));
    const canCopy = (planBlocks || []).some((b) => b.date === yesterday);
    $in(".pl-listbox").innerHTML = `
      <div class="pl-empty">
        <div class="pl-empty-ico" aria-hidden="true">🕒</div>
        <h3>Nothing planned for this day yet</h3>
        <p class="muted">Plan what happens and when you'll study. Tap one to add it, or use <b>＋ Add to my day</b> for your own.</p>
        <div class="pl-quick">${PLAN_QUICK.map((q, i) => `<button type="button" class="btn secondary sm" data-quick="${i}">${PLAN_KINDS[q.kind].icon} ${esc(q.title)} <small>${esc(fmtTime(q.start))}</small></button>`).join("")}</div>
        ${canCopy ? `<button type="button" class="btn ghost sm" data-copy="${yesterday}">⧉ Copy yesterday's plan</button>` : ""}
      </div>`;
  }
  const drawAll = () => { if (!document.body.contains(host)) return; drawWeek(); drawDay(); };
  const select = (day) => { plannerView.day = day; closeForm(); drawAll(); };
  const shift = (by) => { const d = fromYmd(plannerView.day); d.setDate(d.getDate() + by); select(ymd(d)); };

  function openForm(b) {
    editing = b || null;
    const v = b || { title: "", kind: "study", subject: "", start: "", end: "", details: "" };
    form.innerHTML = `
      <h3 style="margin:0;">${b ? "Edit this block" : "Add to my day"}</h3>
      <label class="field" for="pl-title">What's happening?</label>
      <input id="pl-title" type="text" maxlength="80" value="${esc(v.title)}" placeholder="e.g. Maths homework">
      <div class="pl-form-grid">
        <div><label class="field" for="pl-kind">Kind</label><select id="pl-kind">${Object.entries(PLAN_KINDS).map(([k, x]) => `<option value="${k}"${k === v.kind ? " selected" : ""}>${x.icon} ${x.name}</option>`).join("")}</select></div>
        <div><label class="field" for="pl-subject">Subject (optional)</label><select id="pl-subject"><option value="">None</option>${CAL_SUBJECTS.map((s) => `<option${s === v.subject ? " selected" : ""}>${s}</option>`).join("")}</select></div>
        <div><label class="field" for="pl-start">Starts</label><input id="pl-start" type="time" value="${esc(v.start)}"></div>
        <div><label class="field" for="pl-end">Finishes</label><input id="pl-end" type="time" value="${esc(v.end)}"></div>
      </div>
      <label class="field" for="pl-details">Notes (optional)</label>
      <input id="pl-details" type="text" maxlength="200" value="${esc(v.details)}" placeholder="e.g. Chapter 4 questions 1–10">
      ${b ? "" : `<label class="field" for="pl-repeat">Repeat</label><select id="pl-repeat">${PLAN_REPEATS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select>`}
      <div class="pl-form-msg small error" role="alert"></div>
      <div class="row" style="gap:8px;"><button class="btn" type="submit">${b ? "Save" : "Add"}</button><button class="btn ghost" type="button" data-cancel>Cancel</button></div>`;
    form.classList.remove("hidden");
    $("#pl-title", form).focus();
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function closeForm() { editing = null; form.classList.add("hidden"); form.innerHTML = ""; }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const g = (id) => $(`#${id}`, form), msg = $(".pl-form-msg", form);
    const title = g("pl-title").value.trim(), start = g("pl-start").value, end = g("pl-end").value;
    if (!title) return (msg.textContent = "Give it a name, like “Maths homework”.");
    if (!start) return (msg.textContent = "Choose a start time.");
    if (end && timeToMin(end) <= timeToMin(start)) return (msg.textContent = "The finish time has to be after the start time.");
    const fields = { title, kind: g("pl-kind").value, subject: g("pl-subject").value, start, end, details: g("pl-details").value.trim() };
    if (editing) await saveDayBlocks([Object.assign(editing, fields)]);
    else {
      const dates = repeatDates(plannerView.day, g("pl-repeat").value);
      await saveDayBlocks(dates.map((date) => ({ id: newBlockId(), date, done: false, ...fields })));
    }
    closeForm(); drawAll();
    toast(cloudPlanner ? "🕒 Saved" : "🕒 Saved on this device (the day planner isn't set up for sharing yet)");
  });
  form.addEventListener("click", (e) => { if (e.target.closest("[data-cancel]")) closeForm(); });

  $in(".pl-prev").addEventListener("click", () => shift(-1));
  $in(".pl-next").addEventListener("click", () => shift(1));
  $in(".pl-today").addEventListener("click", () => select(todayYmd()));
  $in(".pl-add").addEventListener("click", () => openForm(null));
  $in(".pl-week").addEventListener("click", (e) => { const b = e.target.closest("[data-day]"); if (b) select(b.dataset.day); });
  $in(".pl-listbox").addEventListener("click", async (e) => {
    const quick = e.target.closest("[data-quick]"), copy = e.target.closest("[data-copy]");
    if (quick) {
      const q = PLAN_QUICK[+quick.dataset.quick];
      await saveDayBlocks([{ id: newBlockId(), date: plannerView.day, done: false, subject: "", details: "", ...q }]);
      return drawAll();
    }
    if (copy) {
      const from = (planBlocks || []).filter((b) => b.date === copy.dataset.copy);
      await saveDayBlocks(from.map((b) => ({ id: newBlockId(), date: plannerView.day, title: b.title, kind: b.kind, subject: b.subject, start: b.start, end: b.end, details: b.details, done: false })));
      return drawAll();
    }
    const row = e.target.closest("[data-bid]"), act = e.target.closest("[data-act]")?.dataset.act;
    if (!row || !act) return;
    const b = (planBlocks || []).find((x) => x.id === row.dataset.bid);
    if (!b) return;
    if (act === "done") { b.done = e.target.checked; await saveDayBlocks([b]); drawAll(); }
    else if (act === "edit") openForm(b);
    else if (act === "del") { if (confirm(`Delete “${b.title}”?`)) { await deleteDayBlock(b.id); drawAll(); } }
  });

  drawAll();
  Promise.all([ensureDayPlan(), ensureCalendar()]).then(drawAll);
}
