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
