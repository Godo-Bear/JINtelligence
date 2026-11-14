/* Teacher accounts: classes with join codes, assigning tests/writing with due dates, and a class dashboard
   showing each student's scores and weak topics. Needs the classes/class_members/assignments/assignment_results
   tables (see the SQL in the setup notes) — every query below fails gracefully with a clear message if they
   don't exist yet. Runs after app.js (uses $, esc, toast, fmtDate, runTest, findTopic, QUIZ_TOPICS, etc.). */

function randomJoinCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L — easy to read and type
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// A progress-object-scoped copy of mastery()/weakTopics() from app.js, so we can score a STUDENT's progress
// (fetched by the teacher) without disturbing the `me`-bound versions used everywhere else.
function statsForProgress(progress, topicId) { return (progress || {})[topicId] || { correct: 0, attempted: 0 }; }
function masteryForProgress(progress, topicId) {
  const s = statsForProgress(progress, topicId);
  return s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0;
}
function totalsForProgress(progress) {
  let correct = 0, attempted = 0;
  Object.values(progress || {}).forEach((p) => { correct += p.correct || 0; attempted += p.attempted || 0; });
  return { correct, attempted, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0 };
}
function weakTopicsForProgress(progress, limit = 3) {
  return QUIZ_TOPICS.filter((t) => statsForProgress(progress, t.id).attempted >= 3)
    .sort((a, b) => masteryForProgress(progress, a.id) - masteryForProgress(progress, b.id)).slice(0, limit);
}

// ---------------- Teacher dashboard ----------------
function pageTeacher(view) {
  if (!me.isTeacher) { location.hash = "#/home"; return; }
  view.innerHTML = `
    <div class="page-head"><h1>🍎 Teacher</h1><p>Create classes, assign work, and see how your students are going.</p></div>
    <div class="section-label">Create a class</div>
    <div class="card stack">
      <div class="row" style="flex-wrap:nowrap;">
        <input type="text" id="tc-name" maxlength="60" placeholder="e.g. 7A Maths">
        <button class="btn" id="tc-create">Create class</button>
      </div>
    </div>
    <div class="section-label">My classes</div>
    <div id="tc-list"><p class="muted">Loading…</p></div>`;

  let classes = [];
  const open = new Set(); // class ids with the roster/assignments expanded
  const assignOpen = new Set(); // class ids with the "assign work" form open
  const resultsOpen = new Set(); // assignment ids with results expanded

  async function loadClasses() {
    const { data, error } = await sb.from("classes").select("*").eq("teacher_id", authUser.id).order("created_at", { ascending: false });
    if (error) {
      $("#tc-list", view).innerHTML = `<p class="muted">Couldn't load classes — the classes table may not be set up yet. See the setup note for the SQL to run.</p>`;
      return;
    }
    classes = data || [];
    await Promise.all(classes.map(loadClassDetail));
    draw();
  }

  async function loadClassDetail(cls) {
    const { data: members } = await sb.from("class_members").select("student_id").eq("class_id", cls.id);
    const ids = (members || []).map((m) => m.student_id);
    cls.students = ids.length ? (await sb.from("profiles").select("id, username, progress").in("id", ids)).data || [] : [];
    const oldResultsById = Object.fromEntries((cls.assignments || []).map((a) => [a.id, a.results]));
    const { data: assigns } = await sb.from("assignments").select("*").eq("class_id", cls.id).order("created_at", { ascending: false });
    cls.assignments = (assigns || []).map((a) => ({ ...a, results: oldResultsById[a.id] }));
  }

  function assignFormHTML(cls) {
    return `
      <div class="card stack" style="margin:8px 0;">
        <div class="segmented" id="af-kind-${cls.id}">
          <button type="button" class="active" data-kind="test">Test</button>
          <button type="button" data-kind="writing">Writing</button>
        </div>
        <div id="af-test-${cls.id}">
          <label class="field">Topic</label>
          <select id="af-topic-${cls.id}">${QUIZ_TOPICS.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select>
          <label class="field" style="margin-top:8px;">Difficulty</label>
          <select id="af-diff-${cls.id}"><option value="0">Mixed</option><option value="1">Easy</option><option value="2">Medium</option><option value="3">Hard</option></select>
          <label class="field" style="margin-top:8px;">Number of questions</label>
          <input type="number" id="af-count-${cls.id}" min="1" max="30" value="10">
        </div>
        <div id="af-writing-${cls.id}" class="hidden">
          <label class="field">Writing prompt</label>
          <textarea id="af-prompt-${cls.id}" rows="3" placeholder="e.g. Write a persuasive essay: should school start later?"></textarea>
        </div>
        <label class="field" style="margin-top:8px;">Title</label>
        <input type="text" id="af-title-${cls.id}" maxlength="60" placeholder="e.g. Week 4 ratios test">
        <label class="field" style="margin-top:8px;">Due date <span class="muted">(optional)</span></label>
        <input type="date" id="af-due-${cls.id}">
        <div class="row"><button class="btn" data-create-assign="${cls.id}">Create assignment</button><span class="small muted" id="af-status-${cls.id}"></span></div>
      </div>`;
  }

  function resultsHTML(cls, a) {
    if (!a.results) return `<p class="muted small">Loading…</p>`;
    const byStudent = Object.fromEntries(a.results.map((r) => [r.student_id, r]));
    if (!cls.students.length) return `<p class="muted small">No students yet.</p>`;
    return cls.students.map((s) => {
      const r = byStudent[s.id];
      if (!r) return `<div class="small muted">${esc(s.username || "Unknown")} — not done yet</div>`;
      return a.kind === "test"
        ? `<div class="small">${esc(s.username || "Unknown")} — <strong>${r.score}/${r.total}</strong> (${r.total ? Math.round((r.score / r.total) * 100) : 0}%)</div>`
        : `<details class="small"><summary>${esc(s.username || "Unknown")} — submitted ${fmtDate(r.completed_at)}</summary><div class="muted" style="white-space:pre-wrap; margin:4px 0 0;">${esc(r.content || "")}</div></details>`;
    }).join("");
  }

  function assignmentRowHTML(cls, a) {
    const doneCount = a.results ? a.results.length : null;
    return `
      <div class="list-row" style="display:block;">
        <div class="row between">
          <div><strong>${a.kind === "test" ? "📝" : "✍️"} ${esc(a.title)}</strong> ${a.due_at ? `<span class="muted small">· due ${fmtDate(a.due_at)}</span>` : ""}</div>
          <button class="btn ghost sm" data-results="${a.id}">${resultsOpen.has(a.id) ? "Hide results" : doneCount === null ? `Results (${cls.students.length} students)` : `Results (${doneCount}/${cls.students.length})`}</button>
        </div>
        ${resultsOpen.has(a.id) ? `<div style="margin-top:6px;">${resultsHTML(cls, a)}</div>` : ""}
      </div>`;
  }

  function classCardHTML(cls) {
    const isOpen = open.has(cls.id);
    return `
      <div class="card stack" style="margin-bottom:12px;">
        <div class="row between">
          <div>
            <strong>${esc(cls.name)}</strong> <span class="muted small">· code <code style="font-size:15px; letter-spacing:1px;">${esc(cls.join_code)}</code></span>
            <div class="muted small">${cls.students.length} student${cls.students.length === 1 ? "" : "s"} · ${cls.assignments.length} assignment${cls.assignments.length === 1 ? "" : "s"}</div>
          </div>
          <div class="row" style="flex-wrap:nowrap; gap:6px;">
            <button class="btn ghost sm" data-copy-code="${esc(cls.join_code)}">Copy code</button>
            <button class="btn ghost sm" data-toggle-class="${cls.id}">${isOpen ? "Close" : "Manage"}</button>
          </div>
        </div>
        ${isOpen ? `
          <div class="section-label" style="margin-top:4px;">Students</div>
          ${cls.students.length ? cls.students.map((s) => {
            const t = totalsForProgress(s.progress);
            const weak = weakTopicsForProgress(s.progress);
            return `<div class="list-row">
              <div class="grow">
                <strong>${esc(s.username || "(no name)")}</strong>
                <div class="muted small">${t.attempted} answered · ${t.accuracy}% accuracy${weak.length ? ` · weakest: ${weak.map((w) => esc(w.name)).join(", ")}` : ""}</div>
              </div>
            </div>`;
          }).join("") : `<p class="muted small">No students have joined yet — share the join code above.</p>`}

          <div class="section-label row between" style="margin-top:10px;"><span>Assignments</span><button class="btn ghost sm" data-assign="${cls.id}">${assignOpen.has(cls.id) ? "Cancel" : "+ Assign work"}</button></div>
          ${assignOpen.has(cls.id) ? assignFormHTML(cls) : ""}
          ${cls.assignments.length ? cls.assignments.map((a) => assignmentRowHTML(cls, a)).join("") : `<p class="muted small">No assignments yet.</p>`}
        ` : ""}
      </div>`;
  }

  function draw() {
    $("#tc-list", view).innerHTML = classes.length ? classes.map(classCardHTML).join("") : `<p class="muted">You haven't created a class yet — make one above.</p>`;
    wire();
  }

  function wire() {
    $$("[data-toggle-class]", view).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.toggleClass;
      open.has(id) ? open.delete(id) : open.add(id);
      draw();
    }));
    $$("[data-copy-code]", view).forEach((b) => b.addEventListener("click", () => {
      const code = b.dataset.copyCode;
      (navigator.clipboard?.writeText(code).then(() => toast(`Copied ${code}`)) || Promise.reject()).catch(() => toast(`Join code: ${code}`));
    }));
    $$("[data-assign]", view).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.assign;
      assignOpen.has(id) ? assignOpen.delete(id) : assignOpen.add(id);
      draw();
    }));
    $$('[id^="af-kind-"]', view).forEach((seg) => seg.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-kind]");
      if (!btn) return;
      const clsId = seg.id.replace("af-kind-", "");
      $$("button", seg).forEach((b) => b.classList.toggle("active", b === btn));
      $(`#af-test-${clsId}`, view).classList.toggle("hidden", btn.dataset.kind !== "test");
      $(`#af-writing-${clsId}`, view).classList.toggle("hidden", btn.dataset.kind !== "writing");
    }));
    $$("[data-results]", view).forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.results;
      if (resultsOpen.has(id)) { resultsOpen.delete(id); return draw(); }
      resultsOpen.add(id);
      draw(); // show "Loading…" immediately
      const { data } = await sb.from("assignment_results").select("*").eq("assignment_id", id);
      const a = classes.flatMap((c) => c.assignments).find((x) => x.id === id);
      if (a) a.results = data || [];
      draw();
    }));
    $$("[data-create-assign]", view).forEach((b) => b.addEventListener("click", async () => {
      const clsId = b.dataset.createAssign;
      const cls = classes.find((c) => c.id === clsId);
      const kindBtn = $(`#af-kind-${clsId} button.active`, view);
      const kind = kindBtn ? kindBtn.dataset.kind : "test";
      const title = $(`#af-title-${clsId}`, view).value.trim();
      const dueRaw = $(`#af-due-${clsId}`, view).value;
      const due_at = dueRaw ? new Date(`${dueRaw}T23:59:59`).toISOString() : null;
      const status = $(`#af-status-${clsId}`, view);
      if (!title) { status.textContent = "Give it a title."; return; }
      const payload = { class_id: clsId, kind, title, due_at };
      if (kind === "test") {
        const topic = findTopic($(`#af-topic-${clsId}`, view).value);
        const diff = +$(`#af-diff-${clsId}`, view).value;
        const count = Math.max(1, Math.min(30, parseInt($(`#af-count-${clsId}`, view).value, 10) || 10));
        const pool = diff ? topic.questions.filter((q) => q.difficulty === diff) : topic.questions;
        const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
        if (!chosen.length) { status.textContent = "No questions at that difficulty — try Mixed."; return; }
        payload.questions = chosen.map((q) => ({ ...q, topicName: topic.name }));
      } else {
        const prompt = $(`#af-prompt-${clsId}`, view).value.trim();
        if (!prompt) { status.textContent = "Write a prompt first."; return; }
        payload.prompt = prompt;
      }
      b.disabled = true;
      const { error } = await sb.from("assignments").insert(payload);
      b.disabled = false;
      if (error) { status.textContent = "Couldn't create the assignment — is the assignments table set up?"; return; }
      toast("Assignment created");
      assignOpen.delete(clsId);
      await loadClassDetail(cls);
      draw();
    }));
  }

  $("#tc-create", view).addEventListener("click", async () => {
    const nameInput = $("#tc-name", view);
    const name = nameInput.value.trim();
    if (name.length < 2) return toast("Give the class a name.");
    const btn = $("#tc-create", view);
    btn.disabled = true;
    let code = randomJoinCode(), error;
    for (let i = 0; i < 5; i++) {
      code = randomJoinCode();
      ({ error } = await sb.from("classes").insert({ teacher_id: authUser.id, name, join_code: code }));
      if (!error || !/duplicate|unique/i.test(error.message || "")) break;
    }
    btn.disabled = false;
    if (error) return toast("Couldn't create the class — is the classes table set up? See the setup note.");
    nameInput.value = "";
    toast(`Class created — join code ${code}`);
    loadClasses();
  });

  loadClasses();
}

// ---------------- Student: join a class ----------------
// Called from Settings. Looks up a class by its join code and adds the current student to it.
async function joinClassByCode(code) {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, message: "Enter a join code first." };
  const { data: cls, error } = await sb.from("classes").select("id, name").eq("join_code", clean).maybeSingle();
  if (error) return { ok: false, message: "Couldn't look that up — classes may not be set up on this site yet." };
  if (!cls) return { ok: false, message: "No class has that code — check it and try again." };
  const { error: joinError } = await sb.from("class_members").upsert({ class_id: cls.id, student_id: authUser.id }, { onConflict: "class_id,student_id" });
  if (joinError) return { ok: false, message: "Couldn't join that class — try again." };
  return { ok: true, message: `Joined "${cls.name}"!` };
}

// ---------------- Student: assigned work on Home ----------------
// Returns [{ assignment, className, done, result }], due soonest first, for the "Assigned work" card on Home.
async function myAssignments() {
  try {
    const { data: memberships, error: e1 } = await sb.from("class_members").select("class_id").eq("student_id", authUser.id);
    if (e1 || !memberships?.length) return [];
    const classIds = memberships.map((m) => m.class_id);
    const { data: classesData } = await sb.from("classes").select("id, name").in("id", classIds);
    const classNameById = Object.fromEntries((classesData || []).map((c) => [c.id, c.name]));
    const { data: assignments, error: e2 } = await sb.from("assignments").select("*").in("class_id", classIds).order("due_at", { ascending: true, nullsFirst: false });
    if (e2) return [];
    const { data: results } = await sb.from("assignment_results").select("*").eq("student_id", authUser.id);
    const resultByAssignment = Object.fromEntries((results || []).map((r) => [r.assignment_id, r]));
    return (assignments || []).map((a) => ({
      assignment: a, className: classNameById[a.class_id] || "Class",
      done: !!resultByAssignment[a.id], result: resultByAssignment[a.id] || null,
    }));
  } catch (e) { return []; }
}
function assignedWorkHTML(list) {
  if (!list.length) return "";
  const overdue = (a) => a.due_at && new Date(a.due_at) < new Date();
  return `
    <div class="section-label">📋 Assigned work</div>
    <div class="card stack" id="home-assignments">
      ${list.map(({ assignment: a, className, done, result }) => `
        <div class="list-row">
          <div class="grow">
            <strong>${a.kind === "test" ? "📝" : "✍️"} ${esc(a.title)}</strong> <span class="muted small">· ${esc(className)}</span>
            <div class="muted small">${a.due_at ? `Due ${fmtDate(a.due_at)}${overdue(a) && !done ? " — overdue" : ""}` : "No due date"}${done ? (a.kind === "test" ? ` · done (${result.score}/${result.total})` : " · submitted") : ""}</div>
          </div>
          <a class="btn ${done ? "ghost" : "secondary"} sm" href="#/assignment/${a.id}">${done ? "Review" : "Start"}</a>
        </div>`).join("")}
    </div>`;
}

// ---------------- Student: doing an assignment ----------------
async function pageAssignment(view, id) {
  view.innerHTML = `<div class="page-head"><h1>Assignment</h1></div><p class="muted">Loading…</p>`;
  if (!id) { view.innerHTML = `<div class="page-head"><h1>Assignment</h1></div><p class="muted">Missing assignment.</p>`; return; }
  const { data: a, error } = await sb.from("assignments").select("*").eq("id", id).maybeSingle();
  if (error || !a) { view.innerHTML = `<div class="page-head"><h1>Assignment</h1></div><p class="muted">Couldn't find that assignment — ask your teacher for a fresh link.</p>`; return; }
  const { data: existing } = await sb.from("assignment_results").select("*").eq("assignment_id", id).eq("student_id", authUser.id).maybeSingle();

  if (a.kind === "test") {
    if (existing) {
      view.innerHTML = `
        <div class="page-head"><h1>📝 ${esc(a.title)}</h1></div>
        <div class="card"><p>You've already done this one — you got <strong>${existing.score}/${existing.total}</strong> (${existing.total ? Math.round((existing.score / existing.total) * 100) : 0}%).</p>
        <a class="btn secondary" href="#/home">← Back home</a></div>`;
      return;
    }
    const items = (a.questions || []).map((q) => ({ q, topic: { id: null, name: q.topicName, icon: "📋" } }));
    if (!items.length) { view.innerHTML = `<div class="page-head"><h1>📝 ${esc(a.title)}</h1></div><p class="muted">This test has no questions — ask your teacher to recreate it.</p>`; return; }
    runTest(view, items, 0, {
      againHref: "#/home", again: "← Back home",
      onFinish: async (results) => {
        const score = results.filter((r) => r.correct).length;
        try { await sb.from("assignment_results").upsert({ assignment_id: id, student_id: authUser.id, score, total: results.length }, { onConflict: "assignment_id,student_id" }); } catch (e) { /* best effort */ }
      },
    });
    return;
  }

  // Writing assignment: a self-contained prompt + textarea, kept separate from the main essay/feedback flow.
  view.innerHTML = `
    <div class="page-head"><h1>✍️ ${esc(a.title)}</h1>${a.due_at ? `<p class="muted">Due ${fmtDate(a.due_at)}</p>` : ""}</div>
    <div class="card stack">
      <p style="white-space:pre-wrap;">${esc(a.prompt || "")}</p>
      <textarea id="asg-text" rows="10" placeholder="Write your answer here…">${esc(existing?.content || "")}</textarea>
      <div class="row"><button class="btn" id="asg-submit">${existing ? "Update submission" : "Submit"}</button><span class="small muted" id="asg-status">${existing ? `Submitted ${fmtDate(existing.completed_at)}` : ""}</span></div>
      <a class="small" href="#/home">← Back home</a>
    </div>`;
  $("#asg-submit", view).addEventListener("click", async () => {
    const content = $("#asg-text", view).value.trim();
    if (!content) return toast("Write something first.");
    const btn = $("#asg-submit", view);
    btn.disabled = true;
    const { error: subError } = await sb.from("assignment_results").upsert(
      { assignment_id: id, student_id: authUser.id, content, completed_at: new Date().toISOString() },
      { onConflict: "assignment_id,student_id" },
    );
    btn.disabled = false;
    if (subError) return toast("Couldn't submit — try again.");
    toast("Submitted!");
    $("#asg-status", view).textContent = "Submitted just now";
    btn.textContent = "Update submission";
  });
}
