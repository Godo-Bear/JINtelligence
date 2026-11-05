/* AI memory: the AI remembers your chats and what you've told it.
   - Tutor chats are saved (the "ai_chats" table, supabase/ai-memory.sql, with a copy on this device),
     so you can go back to any chat, and the tutor sees the earlier messages in it.
   - The AI also keeps short notes about you ("memories", e.g. "Has a fractions test on Friday"), which
     every AI chat on the site can see (the "ai_memory" table). You can see, delete or turn them off in Settings.
   Everything still works on this device only if the tables haven't been set up.
   Uses helpers from app.js ($, $$, esc, store, toast, sb, authUser, fmtDate). */

let cloudChats = true, cloudMemory = true;
const chatsKey = () => `apex-chats-${authUser.id}`;
const memoryKey = () => `apex-memory-${authUser.id}`;
const newChatId = () => (crypto.randomUUID ? crypto.randomUUID()
  : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16)));
const MEMORY_MAX = 40;

// ---------------------------------------------------------------- Saved tutor chats
// A chat: { id, title, messages: [{ role: "me" | "bot", text, photo? }], createdAt, updatedAt }
const localChats = () => store(chatsKey()) || [];
const chatTimers = {};
// Saves a copy without photos (just "📷 Photo"), unfinished replies or error messages.
function saveChat(chat) {
  chat.updatedAt = new Date().toISOString();
  const messages = chat.messages.filter((m) => !m.pending && m.role !== "err").slice(-100)
    .map((m) => ({ role: m.role, text: m.text, ...(m.photo ? { photo: true } : {}), ...(m.files?.length ? { files: m.files.slice(0, 10) } : {}), ...(m.note ? { note: m.note } : {}) }));
  const saved = { id: chat.id, title: chat.title, messages, createdAt: chat.createdAt, updatedAt: chat.updatedAt };
  store(chatsKey(), [saved, ...localChats().filter((c) => c.id !== chat.id)].slice(0, 60));
  if (!cloudChats) return;
  clearTimeout(chatTimers[chat.id]);
  chatTimers[chat.id] = setTimeout(async () => {
    try {
      const { error } = await sb.from("ai_chats").upsert({
        id: saved.id, user_id: authUser.id, title: saved.title, messages: saved.messages,
        created_at: saved.createdAt, updated_at: saved.updatedAt,
      });
      if (error) throw error;
    } catch (e) { cloudChats = false; console.warn("Apex: ai_chats table unavailable, saving chats on this device only —", e.message || e); }
  }, 600);
}
async function listChats() {
  const byId = new Map(localChats().map((c) => [c.id, c]));
  if (cloudChats) {
    try {
      const { data, error } = await sb.from("ai_chats").select("*").eq("user_id", authUser.id).order("updated_at", { ascending: false }).limit(60);
      if (error) throw error;
      (data || []).forEach((r) => {
        const mine = byId.get(r.id);
        if (mine && mine.updatedAt >= r.updated_at) return;
        byId.set(r.id, { id: r.id, title: r.title, messages: Array.isArray(r.messages) ? r.messages : [], createdAt: r.created_at, updatedAt: r.updated_at });
      });
    } catch (e) { cloudChats = false; }
  }
  const all = [...byId.values()].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  store(chatsKey(), all.slice(0, 60));
  return all;
}
async function deleteChat(id) {
  store(chatsKey(), localChats().filter((c) => c.id !== id));
  clearTimeout(chatTimers[id]);
  if (cloudChats) try { await sb.from("ai_chats").delete().eq("id", id); } catch (e) { /* the device copy is already gone */ }
}
async function deleteAllChats() {
  store(chatsKey(), []);
  if (cloudChats) try { await sb.from("ai_chats").delete().eq("user_id", authUser.id); } catch (e) { /* device copy is gone */ }
}

// ---------------------------------------------------------------- Memories about the student
// { enabled, items: [{ id, text, at }] } — kept in memory here once loaded.
let aiMemory = null;
async function loadMemory() {
  if (aiMemory) return aiMemory;
  const local = store(memoryKey());
  aiMemory = { enabled: local?.enabled !== false, items: Array.isArray(local?.items) ? local.items : [], updatedAt: local?.updatedAt || "" };
  if (cloudMemory) {
    try {
      const { data, error } = await sb.from("ai_memory").select("enabled, items, updated_at").eq("user_id", authUser.id).maybeSingle();
      if (error) throw error;
      if (data && (data.updated_at || "") > (aiMemory.updatedAt || "")) {
        aiMemory = { enabled: data.enabled !== false, items: Array.isArray(data.items) ? data.items : [], updatedAt: data.updated_at };
        store(memoryKey(), aiMemory);
      }
    } catch (e) { cloudMemory = false; }
  }
  return aiMemory;
}
let memoryTimer = null;
function saveMemory() {
  aiMemory.updatedAt = new Date().toISOString();
  aiMemory.items = aiMemory.items.slice(-MEMORY_MAX);
  store(memoryKey(), aiMemory);
  if (!cloudMemory) return;
  clearTimeout(memoryTimer);
  memoryTimer = setTimeout(async () => {
    try {
      const { error } = await sb.from("ai_memory").upsert({ user_id: authUser.id, enabled: aiMemory.enabled, items: aiMemory.items, updated_at: aiMemory.updatedAt });
      if (error) throw error;
    } catch (e) { cloudMemory = false; console.warn("Apex: ai_memory table unavailable, keeping memories on this device only —", e.message || e); }
  }, 500);
}
const normalise = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

// Text added to AI prompts so the AI knows what it remembers (numbered, so it can ask to forget one).
function memoryPrompt() {
  if (!aiMemory || !aiMemory.enabled || !aiMemory.items.length) return "";
  return `What you remember about this student from earlier chats (use it when it helps, e.g. to pitch things at the right level or follow up on a test they mentioned; don't list it back to them):
${aiMemory.items.map((m, i) => `${i + 1}. ${m.text}`).join("\n")}
`;
}
// Instructions for the "remember"/"forget" parts of a JSON reply.
function memoryRules() {
  if (aiMemory && !aiMemory.enabled) return `Set "remember" to [] and "forget" to [] (the student has turned memory off).`;
  return `Memory: in "remember", list up to 3 SHORT new facts (under 15 words each) worth remembering for future chats — only things the student actually said about themselves, like what they find hard or easy, tests or assignments coming up, goals, interests, how they like things explained, or the name they like to be called. Don't repeat what you already remember, and never store private or sensitive details (full name, address, phone, passwords, school name, health, family problems). Usually this is []. If the student asks you to forget something, put that memory's number in "forget".`;
}
// Applies the AI's "remember"/"forget" lists. Returns what changed, to show the student.
function applyMemoryUpdates(obj) {
  if (!aiMemory || !aiMemory.enabled || !obj || typeof obj !== "object" || Array.isArray(obj)) return { added: [], forgot: 0 };
  const before = aiMemory.items.length;
  const forget = new Set((Array.isArray(obj.forget) ? obj.forget : []).map(Number).filter((n) => n >= 1));
  if (forget.size) aiMemory.items = aiMemory.items.filter((_, i) => !forget.has(i + 1));
  const forgot = before - aiMemory.items.length;
  const known = new Set(aiMemory.items.map((m) => normalise(m.text)));
  const added = (Array.isArray(obj.remember) ? obj.remember : [])
    .map((t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, 140))
    .filter((t) => t.length >= 4 && !known.has(normalise(t)))
    .slice(0, 3);
  added.forEach((text) => aiMemory.items.push({ id: newChatId(), text, at: new Date().toISOString() }));
  if (added.length || forgot) saveMemory();
  return { added, forgot };
}
const memoryNote = ({ added, forgot }) => [added.length ? `🧠 Remembered: ${added.join(" · ")}` : "", forgot ? `🧠 Forgot ${forgot} thing${forgot === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");

// ---------------------------------------------------------------- Memory manager (Settings and the Tutor page)
function memoryManagerHTML() {
  return `
    <div class="mem-box">
      <label class="row between" style="cursor:pointer; gap:12px;">
        <span>Let the AI remember things about me<br><span class="muted small">It saves short notes from your chats (like topics you find tricky or a test coming up) so it can help you better next time.</span></span>
        <input type="checkbox" class="mem-on" style="width:20px; height:20px; flex:none;">
      </label>
      <div class="mem-list"></div>
      <div class="row" style="gap:8px;">
        <button type="button" class="btn ghost sm mem-clear">Forget everything</button>
        <button type="button" class="btn ghost sm mem-chats">Delete all my tutor chats</button>
      </div>
      <p class="muted small" style="margin:0;">You can also tell the AI "forget that…" in any chat. Only you (and the site owner, who runs the database) can see your memories and chats.</p>
    </div>`;
}
async function wireMemoryManager(root, { onChatsDeleted, onChange } = {}) {
  const box = $(".mem-box", root), list = $(".mem-list", box), on = $(".mem-on", box);
  const draw = () => {
    onChange?.();
    on.checked = aiMemory.enabled;
    const off = aiMemory.enabled ? "" : `<p class="muted small" style="margin:0;">Memory is off — the AI won't use${aiMemory.items.length ? " these notes" : " memories"} or remember anything new.</p>`;
    list.innerHTML = aiMemory.items.length
      ? `${off}<ul class="mem-items${aiMemory.enabled ? "" : " off"}">${aiMemory.items.map((m) => `<li><span>${esc(m.text)}</span><button type="button" class="btn ghost sm" data-forget="${esc(m.id)}" aria-label="Forget this">✕</button></li>`).join("")}</ul>`
      : off || `<p class="muted small" style="margin:0;">Nothing remembered yet. Chat with the AI and it will remember useful things you tell it.</p>`;
  };
  list.innerHTML = `<p class="muted small" style="margin:0;">Loading…</p>`;
  await loadMemory();
  draw();
  on.addEventListener("change", () => { aiMemory.enabled = on.checked; saveMemory(); draw(); toast(on.checked ? "The AI will remember things about you" : "Memory turned off"); });
  list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-forget]");
    if (!b) return;
    aiMemory.items = aiMemory.items.filter((m) => m.id !== b.dataset.forget);
    saveMemory(); draw();
  });
  $(".mem-clear", box).addEventListener("click", () => {
    if (!aiMemory.items.length || !confirm("Forget everything the AI remembers about you?")) return;
    aiMemory.items = []; saveMemory(); draw(); toast("Memories cleared");
  });
  $(".mem-chats", box).addEventListener("click", async () => {
    if (!confirm("Delete all your saved tutor chats? This can't be undone.")) return;
    await deleteAllChats(); toast("Tutor chats deleted"); onChatsDeleted?.();
  });
}
function openMemoryModal(opts) {
  $("#modal-memory")?.remove();
  const m = document.createElement("div");
  m.id = "modal-memory";
  m.className = "modal";
  m.innerHTML = `<div class="card stack" style="max-width:520px;">
    <div class="row between"><h2 style="margin:0;">🧠 What the AI remembers</h2><button class="btn ghost" data-close>✕</button></div>
    ${memoryManagerHTML()}</div>`;
  document.body.appendChild(m);
  wireMemoryManager(m, opts);
}
function forgetLocalAIState() { aiMemory = null; cloudChats = true; cloudMemory = true; }
