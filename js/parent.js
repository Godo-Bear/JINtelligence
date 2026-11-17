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
  try { await sb.from("parent_links").insert({ student_id: authUser.id, code: randomJoinCode() }); } catch (e) { /* best effort */ }
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

function childGradesHTML(children) {
  if (!children.length) {
    return `<div class="card"><p class="muted" style="margin:0;">No children linked yet. Ask your child to open <b>Settings → Parent access</b> on their account to get a code, then enter it below.</p></div>`;
  }
  return children.map((c) => {
    const t = totalsForProgress(c.progress);
    const weak = weakTopicsForProgress(c.progress);
    const rows = QUIZ_TOPICS.filter((tp) => statsForProgress(c.progress, tp.id).attempted > 0)
      .sort((a, b) => masteryForProgress(c.progress, a.id) - masteryForProgress(c.progress, b.id));
    return `<div class="card stack">
      <div class="row between"><strong style="font-size:18px;">${esc(c.username || "(no name)")}</strong>
        <span class="tag">${t.accuracy}% overall</span></div>
      <div class="muted small">${t.attempted} questions answered · ${t.correct} correct${weak.length ? ` · needs help with: ${weak.map((w) => esc(w.name)).join(", ")}` : ""}</div>
      ${rows.length ? rows.map((tp) => {
        const s = statsForProgress(c.progress, tp.id), m = masteryForProgress(c.progress, tp.id);
        return `<div><div class="row between small"><span>${tp.icon} ${esc(tp.name)}</span><span class="muted">${m}% · ${s.attempted} answered</span></div>
          <div class="bar"><span style="width:${m}%"></span></div></div>`;
      }).join("") : `<p class="muted small" style="margin:0;">They haven't answered any questions yet.</p>`}
    </div>`;
  }).join("");
}

function parentLinkFormHTML() {
  return `<div class="card stack">
    <div class="row" style="flex-wrap:nowrap;">
      <input id="par-link-code" placeholder="Child's code" maxlength="12" autocomplete="off" style="text-transform:uppercase;">
      <button class="btn" id="par-link-btn">Link</button>
    </div>
    <div id="par-link-status" class="small"></div>
  </div>`;
}

function wireParentLink(view, after) {
  $("#par-link-btn", view)?.addEventListener("click", async () => {
    const btn = $("#par-link-btn", view), status = $("#par-link-status", view);
    btn.disabled = true;
    const result = await linkToChild($("#par-link-code", view).value);
    btn.disabled = false;
    status.textContent = result.message;
    status.className = result.ok ? "small" : "small error";
    if (result.ok) { $("#par-link-code", view).value = ""; after && after(); }
  });
}

function drawChildGrades(view) {
  const el = $("#parent-kids", view);
  if (!el) return;
  myChildren().then((children) => { if (view.contains(el)) el.innerHTML = childGradesHTML(children); });
}

function pageParentHome(view) {
  view.innerHTML = `
    <div class="page-head"><h1>Hi ${esc(me.name)} 👨‍👩‍👧</h1><p>Follow your child's progress and see what they can learn on JINtelligence.</p></div>
    <div class="banner info">Parent accounts are <b>view-only</b>: you can see the topics and your child's grades. The questions, tests, AI tutor and games are for students, on their own accounts.</div>
    <div class="section-label">📈 Your child's grades</div>
    <div id="parent-kids" style="display:grid; gap:12px;"></div>
    <div class="section-label">🔗 Link a child</div>
    ${parentLinkFormHTML()}
    <div class="section-label">📚 Topics</div>
    <div class="card"><a href="#/practice">See every topic your child can practise →</a></div>`;
  drawChildGrades(view);
  wireParentLink(view, () => drawChildGrades(view));
}

function pageParentProgress(view) {
  view.innerHTML = `
    <div class="page-head"><h1>Your child's grades</h1><p>Accuracy by topic, and where they need more help.</p></div>
    <div id="parent-kids" style="display:grid; gap:12px;"></div>
    <div class="section-label">🔗 Link another child</div>
    ${parentLinkFormHTML()}`;
  drawChildGrades(view);
  wireParentLink(view, () => drawChildGrades(view));
}

// The Practice page for a parent: the topic list only — the cards don't open and show no personal progress.
function lockTopicsForParent(view) {
  $(".page-head p", view) && ($(".page-head p", view).textContent = "Here's everything your child can practise. Only students can answer the questions.");
  view.querySelectorAll("a.topic-card").forEach((a) => {
    const d = document.createElement("div");
    d.className = a.className + " locked";
    d.innerHTML = a.innerHTML;
    d.querySelectorAll(".bar").forEach((x) => x.remove());
    d.querySelectorAll(".muted.small").forEach((x) => { if (!/Writing practice/.test(x.textContent)) x.remove(); });
    a.replaceWith(d);
  });
}
