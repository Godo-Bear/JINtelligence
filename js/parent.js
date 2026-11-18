/* Parent accounts: a student generates a code (Settings → Parent access) that a parent enters on their own
   account to see that student's progress, read-only — no writing, notes or AI chats. Reuses randomJoinCode()
   and totalsForProgress()/weakTopicsForProgress() from teacher.js. Needs the parent_links/parent_children
   tables (see the setup notes) — every query fails gracefully if they don't exist yet. */

// ---------------- Student side: generating/revoking a code ----------------
// Returns the student's current code, "" if they don't have one yet, or null if the feature isn't set up.
async function myParentCode() {
  try {
    const { data, error } = await sb.from("parent_links").select("code").eq("student_id", authUser.id).maybeSingle();
    if (error) return null;
    return data?.code || "";
  } catch (e) { return null; }
}
async function makeParentCode() {
  // A few tries in case a random code happens to be taken already.
  for (let i = 0; i < 4; i++) {
    try {
      const { error } = await sb.from("parent_links").insert({ student_id: authUser.id, code: randomJoinCode() });
      if (!error) return true;
    } catch (e) { return false; }
  }
  return false;
}
// Every student account gets a parent code automatically, so a parent can always link without the child having to set anything up.
async function ensureParentCode() {
  try {
    if ((await myParentCode()) === "") await makeParentCode();
  } catch (e) { /* best effort */ }
}
async function revokeParentCode() {
  try {
    await sb.from("parent_links").delete().eq("student_id", authUser.id);
    await sb.from("parent_children").delete().eq("student_id", authUser.id);
  } catch (e) { /* best effort */ }
}

// ---------------- Parent side: linking to a child, and viewing them ----------------
async function linkToChild(rawCode) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, message: "Enter a code first." };
  const { data: link, error } = await sb.from("parent_links").select("student_id").eq("code", code).maybeSingle();
  if (error) return { ok: false, message: "Couldn't look that up — parent access may not be set up on this site yet." };
  if (!link) return { ok: false, message: "No code matches that — check it and try again." };
  if (link.student_id === authUser.id) return { ok: false, message: "You can't link to your own account." };
  const { error: linkError } = await sb.from("parent_children").upsert({ parent_id: authUser.id, student_id: link.student_id }, { onConflict: "parent_id,student_id" });
  if (linkError) return { ok: false, message: "Couldn't link — try again." };
  return { ok: true, message: "Linked! Their progress now shows up on your Progress page." };
}
async function myChildren() {
  try {
    const { data: links, error } = await sb.from("parent_children").select("student_id").eq("parent_id", authUser.id);
    if (error || !links?.length) return [];
    const { data } = await sb.from("profiles").select("id, username, progress").in("id", links.map((l) => l.student_id));
    return data || [];
  } catch (e) { return []; }
}
function linkedChildrenHTML(children) {
  if (!children.length) return "";
  return `
    <div class="section-label">👨‍👩‍👧 Linked children</div>
    <div class="card stack">
      ${children.map((c) => {
        const t = totalsForProgress(c.progress);
        const weak = weakTopicsForProgress(c.progress);
        return `<div class="list-row">
          <div class="grow">
            <strong>${esc(c.username || "(no name)")}</strong>
            <div class="muted small">${t.attempted} answered · ${t.accuracy}% accuracy${weak.length ? ` · weakest: ${weak.map((w) => esc(w.name)).join(", ")}` : ""}</div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
}

// ---------------- Parent accounts are VIEW-ONLY ----------------
// A parent account can see the topics that are covered, link to their child, and read their child's grades.
// It can't answer questions, use the AI tutor, make tests or play games — those are for student accounts —
// so a parent can't hand their account to a child as a way round paying. (The AI tutor function also refuses
// parent accounts on the server: see supabase/functions/ask-tutor.)
const isParent = () => !!(typeof me !== "undefined" && me && me.accountType === "parent" && !me.isAdmin);
const PARENT_PAGES = ["home", "practice", "progress", "schedule", "settings"];

// ---- The parent's pages (Home and Grades) ----
const pcTone = (pct) => (pct >= 75 ? "good" : pct >= 50 ? "mid" : "low");
const pcInitial = (name) => esc((String(name || "?").trim()[0] || "?").toUpperCase());

// Progress for each subject: accuracy, how many topics they've started, and how many questions they've answered.
const PC_SUBJECTS = [
  { id: "maths", icon: "➗", name: "Maths" }, { id: "english", icon: "📖", name: "English" }, { id: "science", icon: "🔬", name: "Science" },
  { id: "history", icon: "🏛️", name: "History" }, { id: "geography", icon: "🌏", name: "Geography" },
];
function subjectProgress(progress) {
  return PC_SUBJECTS.map((s) => {
    const topics = QUIZ_TOPICS.filter((t) => t.subject === s.id);
    let correct = 0, attempted = 0, started = 0;
    topics.forEach((t) => { const st = statsForProgress(progress, t.id); correct += st.correct || 0; attempted += st.attempted || 0; if (st.attempted > 0) started += 1; });
    return { ...s, total: topics.length, started, attempted, correct, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0 };
  }).filter((s) => s.total > 0);
}
function subjectTilesHTML(list) {
  return `<div class="pc-subj-grid">${list.map((s) => `
    <div class="pc-subj ${s.attempted ? pcTone(s.accuracy) : "none"}">
      <div class="pc-subj-top"><span class="pc-subj-name">${s.icon} ${esc(s.name)}</span><b>${s.attempted ? `${s.accuracy}%` : "–"}</b></div>
      <div class="pc-bar ${s.attempted ? pcTone(s.accuracy) : ""}"><span style="width:${s.attempted ? s.accuracy : 0}%"></span></div>
      <div class="muted small">${s.attempted ? `${s.started} of ${s.total} topic${s.total === 1 ? "" : "s"} started · ${s.attempted} answered` : "Not started yet"}</div>
    </div>`).join("")}</div>`;
}

function childCardHTML(c) {
  const t = totalsForProgress(c.progress);
  const weak = weakTopicsForProgress(c.progress);
  const rows = QUIZ_TOPICS.filter((tp) => statsForProgress(c.progress, tp.id).attempted > 0)
    .map((tp) => ({ tp, s: statsForProgress(c.progress, tp.id), m: masteryForProgress(c.progress, tp.id) }))
    .sort((a, b) => a.m - b.m);
  const strong = rows.filter((r) => r.s.attempted >= 3 && r.m >= 70).sort((a, b) => b.m - a.m).slice(0, 3);
  return `<div class="card pc-child">
    <div class="pc-child-top">
      <div class="pc-avatar" aria-hidden="true">${pcInitial(c.username)}</div>
      <div class="grow">
        <div class="pc-name">${esc(c.username || "(no name)")}</div>
        <div class="muted small">${t.attempted ? `${t.attempted} question${t.attempted === 1 ? "" : "s"} answered · ${t.correct} correct` : "Hasn't answered any questions yet"}</div>
      </div>
      <div class="pc-ring ${pcTone(t.accuracy)}" style="--p:${t.accuracy}" role="img" aria-label="${t.accuracy}% accuracy"><span>${t.accuracy}%</span></div>
    </div>
    <div class="pc-today" data-today-for="${esc(c.id)}"></div>
    ${t.attempted ? `
    <div class="pc-sec-title">Progress by subject</div>
    ${subjectTilesHTML(subjectProgress(c.progress))}
    <div class="pc-pills">
      ${strong.length ? `<div class="pc-pill good"><b>💪 Doing well</b><span>${strong.map((r) => esc(r.tp.name)).join(", ")}</span></div>` : ""}
      ${weak.length ? `<div class="pc-pill low"><b>🎯 Could use help</b><span>${weak.map((w) => esc(w.name)).join(", ")}</span></div>` : ""}
    </div>
    <div class="pc-sec-title">Every topic they've tried</div>
    <div class="pc-topics">
      ${rows.map(({ tp, s, m }) => `<div class="pc-topic">
        <div class="row between small"><span>${tp.icon} ${esc(tp.name)}</span><span class="muted">${m}% · ${s.attempted} answered</span></div>
        <div class="pc-bar ${pcTone(m)}"><span style="width:${m}%"></span></div>
      </div>`).join("")}
    </div>` : `<p class="muted small" style="margin:12px 0 0;">Their grades will show up here as soon as they start doing practice questions.</p>`}
  </div>`;
}

function childGradesHTML(children) {
  return children.length ? children.map(childCardHTML).join("") : "";
}

// Shown when no child is linked yet: clear steps, the code box, and a preview of what they'll get.
function parentConnectHTML(first = true) {
  return `<div class="card pc-connect">
    <div class="pc-connect-head">
      <div class="pc-connect-ico" aria-hidden="true">🔗</div>
      <div>
        <h2>${first ? "Connect to your child's account" : "Link another child"}</h2>
        <p class="muted" style="margin:2px 0 0;">${first ? "It takes about a minute, and you only do it once." : "Enter their code to add them."}</p>
      </div>
    </div>
    ${first ? `<ol class="pc-steps">
      <li><b>1</b><div><strong>Your child logs in</strong><span>to their own JINtelligence student account.</span></div></li>
      <li><b>2</b><div><strong>They open Settings → Parent access</strong><span>Every student already has a code there. It looks like <code>AB12CD</code>.</span></div></li>
      <li><b>3</b><div><strong>You type that code below</strong><span>Then their grades appear on this page.</span></div></li>
    </ol>` : ""}
    <div class="pc-code-row">
      <input id="par-link-code" placeholder="Enter code" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Your child's code">
      <button class="btn" id="par-link-btn">Link</button>
    </div>
    <div id="par-link-status" class="small" role="status"></div>
    ${first ? `<p class="muted small" style="margin:10px 0 0;">Your child doesn't have an account yet? They need to sign up as a <b>Student</b> first. Parent accounts are free, and you can't do the questions yourself.</p>` : ""}
  </div>`;
}
const parentLinkFormHTML = () => parentConnectHTML(false);

function wireParentLink(view, after) {
  $("#par-link-btn", view)?.addEventListener("click", async () => {
    const btn = $("#par-link-btn", view), status = $("#par-link-status", view);
    btn.disabled = true;
    const result = await linkToChild($("#par-link-code", view).value);
    btn.disabled = false;
    status.textContent = result.message;
    status.className = result.ok ? "small good" : "small error";
    if (result.ok) { $("#par-link-code", view).value = ""; after && after(); }
  });
  $("#par-link-code", view)?.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#par-link-btn", view).click(); });
}

// A faded example so parents can see what they're about to get.
function parentPreviewHTML() {
  return `<div class="pc-preview" aria-hidden="true">
    <span class="pc-example-tag">Example</span>
    <div class="card pc-child">
      <div class="pc-child-top">
        <div class="pc-avatar">A</div>
        <div class="grow"><div class="pc-name">Alex</div><div class="muted small">48 questions answered · 33 correct</div></div>
        <div class="pc-ring mid" style="--p:69"><span>69%</span></div>
      </div>
      <div class="pc-sec-title">Progress by subject</div>
      ${subjectTilesHTML([
        { icon: "➗", name: "Maths", total: 24, started: 5, attempted: 38, accuracy: 74 },
        { icon: "📖", name: "English", total: 12, started: 2, attempted: 10, accuracy: 60 },
        { icon: "🔬", name: "Science", total: 13, started: 0, attempted: 0, accuracy: 0 },
      ])}
      <div class="pc-pills">
        <div class="pc-pill good"><b>💪 Doing well</b><span>Fractions and Percentages, Decimals</span></div>
        <div class="pc-pill low"><b>🎯 Could use help</b><span>Geometry</span></div>
      </div>
      <div class="pc-topics">
        <div class="pc-topic"><div class="row between small"><span>➗ Fractions and Percentages</span><span class="muted">86% · 14 answered</span></div><div class="pc-bar good"><span style="width:86%"></span></div></div>
        <div class="pc-topic"><div class="row between small"><span>📐 Geometry</span><span class="muted">40% · 10 answered</span></div><div class="pc-bar low"><span style="width:40%"></span></div></div>
      </div>
    </div>
  </div>`;
}

function parentSubjectsHTML() {
  const subjects = [
    { icon: "➗", name: "Maths", n: MATHS_TOPICS.length, note: "Years 7 to 10 and VCE" },
    { icon: "📖", name: "English", n: ENGLISH_TOPICS.length, note: "Reading, grammar, writing" },
    { icon: "🔬", name: "Science", n: SCIENCE_TOPICS.length, note: "Forces, space, living things" },
    { icon: "🏛️", name: "History", n: HISTORY_TOPICS.length, note: "Ancient to modern" },
    { icon: "🌏", name: "Geography", n: GEOGRAPHY_TOPICS.length, note: "Places and environments" },
  ];
  return `<div class="pc-subjects">${subjects.map((s) => `
    <a class="card pc-subject" href="#/practice"><span class="pc-subject-ico">${s.icon}</span>
      <span><strong>${s.name}</strong><span class="muted small">${s.n} topics · ${s.note}</span></span></a>`).join("")}</div>`;
}

function drawChildGrades(view) {
  const el = $("#parent-kids", view);
  if (!el) return;
  myChildren().then((children) => {
    if (!view.contains(el)) return;
    const slot = $("#parent-connect", view);
    if (children.length) {
      el.innerHTML = childGradesHTML(children);
      fillParentToday(view, children);
      if (slot) slot.innerHTML = `<details class="pc-more"><summary>🔗 Link another child</summary>${parentConnectHTML(false)}</details>`;
      const prev = $("#parent-preview", view); if (prev) prev.innerHTML = "";
      const hero = $("#parent-hero-sub", view);
      if (hero) hero.textContent = children.length === 1 ? `Here's how ${children[0].username || "your child"} is going.` : `Here's how your ${children.length} children are going.`;
    } else {
      el.innerHTML = "";
      if (slot) slot.innerHTML = parentConnectHTML(true);
      const prev = $("#parent-preview", view); if (prev) prev.innerHTML = `<div class="section-label">👀 What you'll see once you're connected</div>${parentPreviewHTML()}`;
      const hero = $("#parent-hero-sub", view);
      if (hero) hero.textContent = "Connect to your child's account to follow their progress.";
    }
    wireParentLink(view, () => drawChildGrades(view));
  });
}

function pageParentHome(view) {
  view.innerHTML = `
    <div class="card parent-hero">
      <div class="parent-hero-ico" aria-hidden="true">👨‍👩‍👧</div>
      <div>
        <h1>Hi ${esc(me.name)}</h1>
        <p id="parent-hero-sub">Loading your family…</p>
      </div>
    </div>
    <div class="pc-note">👀 Parent accounts are view-only: you can see your child's grades and the topics. Questions, tests, the AI tutor and games are for students.</div>
    <div id="parent-kids" class="pc-kids"></div>
    <div id="parent-connect"></div>
    <div id="parent-preview"></div>
    <div class="section-label">📚 What your child can learn</div>
    ${parentSubjectsHTML()}`;
  drawChildGrades(view);
}

function pageParentProgress(view) {
  view.innerHTML = `
    <div class="page-head"><h1>Your child's grades</h1><p>Accuracy by topic, and where they could use some help.</p></div>
    <div id="parent-kids" class="pc-kids"></div>
    <div id="parent-connect"></div>
    <div id="parent-preview"></div>`;
  drawChildGrades(view);
}

// The Practice page for a parent: the topic list only — the cards don't open and show no personal progress.
function lockTopicsForParent(view) {
  $(".page-head p", view) && ($(".page-head p", view).textContent = "Here's everything your child can learn. Only students can answer the questions.");
  view.querySelectorAll("a.topic-card").forEach((a) => {
    const d = document.createElement("div");
    d.className = a.className + " locked";
    d.innerHTML = a.innerHTML;
    d.querySelectorAll(".bar").forEach((x) => x.remove());
    d.querySelectorAll(".muted.small").forEach((x) => { if (!/Writing practice/.test(x.textContent)) x.remove(); });
    a.replaceWith(d);
  });
}

// ---------------- A child's calendar and day plan (read-only) ----------------
// Parents can read these because of the "linked parent can read" policies in supabase/day-planner.sql.
const parentSched = { childId: null, month: null, day: null };
async function childSchedule(studentId, from, to) {
  const out = { events: [], blocks: [], eventsOk: true, blocksOk: true };
  try {
    const r = await sb.from("calendar_events").select("*").eq("user_id", studentId).gte("date", from).lte("date", to);
    if (r.error) out.eventsOk = false; else out.events = (r.data || []).map(fromCalRow);
  } catch (e) { out.eventsOk = false; }
  try {
    const r = await sb.from("day_plans").select("*").eq("user_id", studentId).gte("date", from).lte("date", to);
    if (r.error) out.blocksOk = false; else out.blocks = (r.data || []).map(fromBlockRow).sort(cmpBlocks);
  } catch (e) { out.blocksOk = false; }
  return out;
}
const parentEventHTML = (e) => `<div class="cal-event k-${e.kind}${e.done ? " done" : ""}">
    <div class="cal-event-top"><span class="cal-kind">${CAL_KINDS[e.kind].icon} ${CAL_KINDS[e.kind].name}${e.subject ? ` · ${esc(e.subject)}` : ""}</span>${e.done ? `<span class="cal-when">✓ Done</span>` : ""}</div>
    <div class="cal-event-title">${esc(e.title)}</div>${e.details ? `<div class="cal-event-details">${esc(e.details)}</div>` : ""}</div>`;

// On the parent Home: a peek at each child's day.
async function fillParentToday(view, children) {
  const today = todayYmd();
  await Promise.all(children.map(async (c) => {
    const slot = view.querySelector(`[data-today-for="${c.id}"]`);
    if (!slot) return;
    const data = await childSchedule(c.id, today, today);
    if (!view.contains(slot)) return;
    const blocks = data.blocks, evs = data.events;
    slot.innerHTML = `<div class="pc-sec-title">Today · ${esc(fmtDay(today, true))}</div>
      ${evs.length ? `<div class="pl-evrow">${evs.map((e) => `<span class="pl-evchip k-${e.kind}${e.done ? " done" : ""}">${CAL_KINDS[e.kind].icon} ${esc(e.title)}</span>`).join("")}</div>` : ""}
      ${blocks.length ? `${planSummaryHTML(blocks)}${planRowsHTML(blocks.slice(0, 4), { readOnly: true })}${blocks.length > 4 ? `<p class="muted small" style="margin:6px 0 0;">+${blocks.length - 4} more</p>` : ""}`
        : `<p class="muted small" style="margin:0;">${data.blocksOk ? "Nothing planned for today." : "Their day plan isn't available yet."}</p>`}
      <a class="btn secondary sm" href="#/schedule" style="margin-top:10px;">🗓️ See the full schedule →</a>`;
  }));
}

async function pageParentSchedule(view) {
  view.innerHTML = `
    <div class="page-head"><h1>🗓️ Schedule</h1><p>Your child's calendar and day plan. You can look but not change anything.</p></div>
    <div id="ps-kids"></div>
    <div id="ps-body"><p class="muted">Loading…</p></div>`;
  view.closest("main").classList.add("wide");
  const children = await myChildren();
  if (!view.isConnected) return;
  const body = $("#ps-body", view);
  if (!children.length) {
    body.innerHTML = `<div class="banner info" style="margin-bottom:12px;">Link to your child's account to see their schedule.</div><div id="parent-connect">${parentConnectHTML(true)}</div>`;
    wireParentLink(view, () => pageParentSchedule(view));
    return;
  }
  parentSched.childId = children.find((c) => c.id === parentSched.childId)?.id || children[0].id;
  parentSched.day ||= todayYmd();
  parentSched.month ||= parentSched.day.slice(0, 7);
  $("#ps-kids", view).innerHTML = children.length > 1
    ? `<div class="segmented" role="tablist" style="margin-bottom:14px;">${children.map((c) => `<button type="button" role="tab" data-child="${esc(c.id)}" class="${c.id === parentSched.childId ? "active" : ""}">${esc(c.username || "Child")}</button>`).join("")}</div>` : "";
  $("#ps-kids", view).addEventListener("click", (e) => { const b = e.target.closest("[data-child]"); if (b) { parentSched.childId = b.dataset.child; pageParentSchedule(view); } });

  const child = children.find((c) => c.id === parentSched.childId);
  async function draw() {
    if (!view.isConnected) return;
    const [y, m] = parentSched.month.split("-").map(Number);
    const first = new Date(y, m - 1, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m, 0).getDate(), weeks = Math.ceil((lead + days) / 7);
    const gridStart = new Date(y, m - 1, 1 - lead), gridEnd = new Date(y, m - 1, 1 - lead + weeks * 7 - 1);
    const today = todayYmd(), soonEnd = ymd(new Date(Date.now() + 30 * 86400000));
    const from = [ymd(gridStart), today].sort()[0], to = [ymd(gridEnd), soonEnd].sort().reverse()[0];
    const data = await childSchedule(child.id, from, to);
    if (!view.isConnected) return;
    const evByDay = {}, blByDay = {};
    data.events.forEach((e) => (evByDay[e.date] ||= []).push(e));
    data.blocks.forEach((b) => (blByDay[b.date] ||= []).push(b));
    let grid = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="cal-dow">${d}</div>`).join("");
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(y, m - 1, 1 - lead + i), key = ymd(d), evs = evByDay[key] || [], bl = blByDay[key] || [];
      const cls = ["cal-day", d.getMonth() !== m - 1 && "out", key === today && "today", key === parentSched.day && "sel", key < today && "past", (d.getDay() === 0 || d.getDay() === 6) && "wkend"].filter(Boolean).join(" ");
      grid += `<button type="button" class="${cls}" data-date="${key}" aria-label="${fmtDay(key, true)}${evs.length ? `, ${evs.length} on the calendar` : ""}${bl.length ? `, ${bl.length} planned` : ""}">
        <span class="cal-num">${d.getDate()}</span>
        ${evs.length ? `<span class="cal-chips">${evs.slice(0, 2).map((e) => `<span class="cal-chip k-${e.kind}${e.done ? " done" : ""}">${esc(e.title)}</span>`).join("")}${evs.length > 2 ? `<span class="cal-more">+${evs.length - 2}</span>` : ""}</span>` : ""}
        ${bl.length ? `<span class="ps-plan-count" title="Day plan">🕒 ${bl.length}</span>` : ""}
      </button>`;
    }
    const dayEvs = evByDay[parentSched.day] || [], dayBlocks = blByDay[parentSched.day] || [];
    const soon = data.events.filter((e) => !e.done && e.date >= today && e.date <= soonEnd).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
    $("#ps-body", view).innerHTML = `
      <div class="cal-wrap">
        <div class="card cal-card">
          <div class="cal-head"><div class="cal-nav">
            <button type="button" class="btn ghost" data-shift="-1" aria-label="Previous month">‹</button>
            <h2 class="cal-month">${first.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</h2>
            <button type="button" class="btn ghost" data-shift="1" aria-label="Next month">›</button></div>
            <button type="button" class="btn secondary sm" data-today>Today</button></div>
          <div class="cal-grid">${grid}</div>
          <div class="cal-legend">${Object.entries(CAL_KINDS).map(([k, v]) => `<span><i class="cal-dot k-${k}"></i>${v.name}</span>`).join("")}<span>🕒 Day plan</span></div>
        </div>
        <div class="cal-side">
          <div class="card ps-day">
            <div class="cal-dayname">${esc(fmtDay(parentSched.day, true))}</div><div class="muted small" style="margin-bottom:10px;">${esc(whenText(parentSched.day))}</div>
            <h3 class="cal-side-h">📅 Calendar</h3>
            ${dayEvs.length ? `<div class="cal-events">${dayEvs.map(parentEventHTML).join("")}</div>` : `<p class="muted small" style="margin:0 0 8px;">${data.eventsOk ? "Nothing on the calendar." : "Their calendar isn't available yet."}</p>`}
            <h3 class="cal-side-h" style="margin-top:14px;">🕒 Day plan</h3>
            ${dayBlocks.length ? `${planSummaryHTML(dayBlocks)}${planRowsHTML(dayBlocks, { readOnly: true })}` : `<p class="muted small" style="margin:0;">${data.blocksOk ? "No plan for this day." : "Their day plan isn't available yet."}</p>`}
          </div>
          <div class="card cal-soon"><h3 class="cal-side-h">⏰ Coming up</h3>
            ${soon.length ? `<div class="cal-rows">${soon.map((e) => `<button type="button" class="cal-row k-${e.kind}" data-go="${e.date}"><span class="cal-date"><b>${fromYmd(e.date).getDate()}</b><small>${fromYmd(e.date).toLocaleDateString("en-AU", { month: "short" })}</small></span><span class="cal-row-main"><span class="cal-row-title">${CAL_KINDS[e.kind].icon} ${esc(e.title)}</span><span class="muted small">${CAL_KINDS[e.kind].name}${e.subject ? ` · ${esc(e.subject)}` : ""}</span></span><span class="cal-when${daysUntil(e.date) <= 2 ? " soon" : ""}">${esc(whenText(e.date))}</span></button>`).join("")}</div>` : `<p class="muted small" style="margin:0;">Nothing in the next 30 days.</p>`}
          </div>
          <p class="muted small">Only what ${esc(child.username || "your child")} adds to their own calendar and day plan shows here.</p>
        </div>
      </div>`;
  }
  body.addEventListener("click", (e) => {
    const cell = e.target.closest("[data-date]"), go = e.target.closest("[data-go]"), sh = e.target.closest("[data-shift]"), td = e.target.closest("[data-today]");
    if (cell || go) { parentSched.day = (cell || go).dataset.date || (cell || go).dataset.go; parentSched.month = parentSched.day.slice(0, 7); draw(); }
    else if (sh) { const [yy, mm] = parentSched.month.split("-").map(Number); parentSched.month = ymd(new Date(yy, mm - 1 + +sh.dataset.shift, 1)).slice(0, 7); draw(); }
    else if (td) { parentSched.day = todayYmd(); parentSched.month = parentSched.day.slice(0, 7); draw(); }
  });
  draw();
}
