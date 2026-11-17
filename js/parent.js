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
const PARENT_PAGES = ["home", "practice", "progress", "settings"];

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
