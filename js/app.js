/* =========================================================
   JINtelligence — app logic
   Pages: Home · Practice · Test · Tutor · Progress · Admin
   Accounts, progress and the AI tutor live in Supabase.
   © 2026 Jayden Narayan. All rights reserved. Copying or
   re-publishing this site without permission is not allowed.
========================================================= */
try { console.log("%cJINtelligence — © 2026 Jayden Narayan. All rights reserved.", "font-weight:700"); } catch (e) {}

// ---------------- Supabase ----------------
const SUPABASE_URL = "https://dozlkmoaaskaulejkiiw.supabase.co";
const SUPABASE_KEY = "sb_publishable_yEYj6LwjIAzXkTfgJx9v6w_DTnZqXk_";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------- Constants ----------------
const DIFF_POINTS = { 1: 10, 2: 20, 3: 30 };
const DIFF_NAMES = { 1: "Easy", 2: "Medium", 3: "Hard" };
// Device preferences set on the Settings page.
const PREFS_KEY = "apex-prefs";
const prefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; } };
function setPref(key, value) {
  const p = prefs(); p[key] = value;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) {}
}
const practiceSetSize = () => [5, 10, 15].includes(prefs().setSize) ? prefs().setSize : 5;

// XP ranks — XP is earned alongside points and never spent.
const XP_LEVELS = [
  { name: "Rookie", min: 0, icon: "🌱" },
  { name: "Apprentice", min: 100, icon: "📘" },
  { name: "Scholar", min: 300, icon: "🎓" },
  { name: "Ace", min: 600, icon: "⭐" },
  { name: "Master", min: 1000, icon: "🏅" },
  { name: "Grandmaster", min: 2000, icon: "👑" },
  { name: "Legend", min: 4000, icon: "💎" },
];
const ADMIN_RANK_ICON_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:1em; height:1em; vertical-align:-0.15em; overflow:visible;">
  <defs>
    <radialGradient id="inevGlow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#FFF6D8" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#FFD34D" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#FFD34D" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="inevGold" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#FFEBA8"/>
      <stop offset="50%" stop-color="#F0B23A"/>
      <stop offset="100%" stop-color="#B87A15"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="42" r="46" fill="url(#inevGlow)"/>
  <g stroke="#FFD34D" stroke-width="2.5" stroke-linecap="round" opacity="0.7">
    <line x1="50" y1="42" x2="50" y2="4"/>
    <line x1="50" y1="42" x2="80" y2="14"/>
    <line x1="50" y1="42" x2="96" y2="40"/>
    <line x1="50" y1="42" x2="88" y2="68"/>
    <line x1="50" y1="42" x2="20" y2="14"/>
    <line x1="50" y1="42" x2="4" y2="40"/>
    <line x1="50" y1="42" x2="12" y2="68"/>
  </g>
  <rect x="33" y="66" width="34" height="18" rx="5" fill="url(#inevGold)" stroke="#7A4E10" stroke-width="2.5"/>
  <rect x="33" y="70" width="34" height="4" fill="#7A4E10" opacity="0.4"/>
  <rect x="27" y="38" width="46" height="32" rx="12" fill="url(#inevGold)" stroke="#7A4E10" stroke-width="2.5"/>
  <circle cx="37" cy="34" r="9" fill="url(#inevGold)" stroke="#7A4E10" stroke-width="2.5"/>
  <circle cx="50" cy="30" r="10" fill="url(#inevGold)" stroke="#7A4E10" stroke-width="2.5"/>
  <circle cx="63" cy="34" r="9" fill="url(#inevGold)" stroke="#7A4E10" stroke-width="2.5"/>
  <path d="M22 46 Q14 44 14 54 Q14 63 24 64 L28 64 L28 46 Z" fill="url(#inevGold)" stroke="#7A4E10" stroke-width="2.5" stroke-linejoin="round"/>
</svg>`;
const ADMIN_RANK = { name: "Inevitable", icon: ADMIN_RANK_ICON_SVG };

function levelInfo(xp, isAdmin) {
  if (isAdmin) return { current: ADMIN_RANK, next: null, pct: 100 };
  let i = 0;
  while (i + 1 < XP_LEVELS.length && xp >= XP_LEVELS[i + 1].min) i++;
  const current = XP_LEVELS[i];
  const next = XP_LEVELS[i + 1] || null;
  const pct = next ? Math.round(((xp - current.min) / (next.min - current.min)) * 100) : 100;
  return { current, next, pct };
}

const NAV = [
  { route: "home", label: "Home", icon: "🏠" },
  { route: "practice", label: "Practice", icon: "📚" },
  { route: "test", label: "Test", icon: "📝" },
  { route: "tutor", label: "Tutor", icon: "🤖" },
  { route: "games", label: "Games", icon: "🎮" },
  { route: "progress", label: "Progress", icon: "📈" },
];

// ---------------- Topics ----------------
YEAR_LEVELS.forEach((y) => y.topics.forEach((t) => { t.subject = "maths"; t.yearId = y.id; }));
ENGLISH_TOPICS.forEach((t) => { t.subject = "english"; });
SCIENCE_TOPICS.forEach((t) => { t.subject = "science"; });
const MATHS_TOPICS = YEAR_LEVELS.flatMap((y) => y.topics);
const ALL_TOPICS = [...MATHS_TOPICS, ...ENGLISH_TOPICS, ...SCIENCE_TOPICS];
const QUIZ_TOPICS = ALL_TOPICS.filter((t) => !t.special);
const findTopic = (id) => ALL_TOPICS.find((t) => t.id === id);

function pointsFor(q, topic) {
  const mult = topic.yearId ? yearMultiplier(topic.yearId) : 1;
  return Math.round(DIFF_POINTS[q.difficulty] * mult);
}

// ---------------- Helpers ----------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
// Dates are shown day/month/year, e.g. 13/11/2026.
const fmtDate = (d) => new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDateTime = (d) => `${fmtDate(d)} ${new Date(d).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { return null; }
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function setMsg(el, text, kind) {
  el.className = kind;
  el.textContent = text;
  show(el);
}

function isAnswerCorrect(q, raw) {
  if (isVisualInput(q)) return visualCorrect(q, raw);
  if (q.answerType === "point") return pointCorrect(q, raw);
  if (q.answerType === "text") {
    if (typeof raw !== "string" || raw.trim() === "") return false;
    const normalized = raw.trim().toLowerCase();
    const accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
    return accepted.some((a) => String(a).trim().toLowerCase() === normalized);
  }
  const val = parseFloat(String(raw).replace(/,/g, ""));
  const tol = q.tolerance ?? 0.01;
  return !isNaN(val) && Math.abs(val - q.answer) <= tol;
}
const displayAnswer = (q) => (isVisualInput(q) ? visualAnswerText(q) : Array.isArray(q.answer) ? q.answer[0] : q.answer);
// The student's answer in words, for "You answered: …".
const yourAnswerText = (q, raw) => (isVisualInput(q) ? visualYourAnswer(q, raw)
  : q.answerType === "point" ? (raw ? `(${String(raw).split(",").join(", ")})` : "(blank)") : raw || "(blank)");

function cleanTutorAnswer(text) {
  return text
    .replace(/\$\$(.*?)\$\$/g, "$1")
    .replace(/\$(.*?)\$/g, "$1")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "×")
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Why an AI request failed, in words a student understands, and whether trying again could help.
async function aiErrorInfo(err) {
  const status = err?.context?.status || 0;
  let detail = err?.aiDetail || "";
  try { if (!detail && typeof err?.context?.json === "function") detail = (await err.context.clone().json())?.error || ""; } catch (e) { /* not JSON */ }
  const text = `${detail} ${err?.message || ""}`;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { retry: false, message: "You seem to be offline. Check your internet connection, then try again." };
  if (status === 401) return { retry: false, message: "Your login has run out. Refresh the page (and log in again if it asks), then try again." };
  if (/too long/i.test(text)) return { retry: false, message: "That's too much for the AI in one go. Remove a file or ask for a bit less, then try again." };
  if (status === 504 || status === 546 || /timed? ?out|time limit|WORKER_LIMIT/i.test(text)) return { retry: false, message: "The AI took too long to answer. Try asking for fewer questions at once (like 5), then ask for more." };
  if (status === 429 || /busy|overload|rate.?limit|quota|exhausted/i.test(text)) return { retry: true, message: "The AI is really busy right now (lots of people are using it). Wait about 30 seconds, then try again." };
  if (/stuck/i.test(text)) return { retry: true, message: "The AI got stuck on that one. Try asking in a different way, or for fewer questions at once." };
  return { retry: true, message: "Sorry, I couldn't reach the AI. Check your internet, then try again in a moment." };
}
const AI_TRIES = 3;
// The tutor's answer exactly as written (for replies that are JSON). If the AI is busy or the connection
// drops, it tries again by itself (up to 3 tries in all); onRetry(n) lets the page say so.
// Errors it throws have a .userMessage saying what went wrong.
async function askTutorRaw(body, { onRetry } = {}) {
  const payload = typeof body === "string" ? { question: body } : body;
  let failure;
  for (let attempt = 1; attempt <= AI_TRIES; attempt++) {
    try {
      const { data, error } = await sb.functions.invoke("ask-tutor", { body: payload });
      if (error) throw error;
      if (data?.error) throw Object.assign(new Error(data.error), { aiDetail: data.error });
      const answer = String(data?.answer || "");
      // The AI ran out of room before writing anything (the edge function sends this as an answer).
      if (!answer || /^Sorry, I couldn't come up with an answer/.test(answer)) throw Object.assign(new Error("Empty answer"), { aiDetail: "stuck" });
      return answer;
    } catch (err) {
      const info = await aiErrorInfo(err);
      console.warn(`Apex: AI request failed (try ${attempt} of ${AI_TRIES}) —`, err?.context?.status || "", err?.aiDetail || err?.message || err);
      failure = Object.assign(err instanceof Error ? err : new Error(String(err)), { userMessage: info.message });
      if (!info.retry || attempt === AI_TRIES) break;
      onRetry?.(attempt);
      await new Promise((r) => setTimeout(r, attempt * 2500));
    }
  }
  throw failure;
}
async function askTutor(body, opts) {
  return cleanTutorAnswer(await askTutorRaw(body, opts));
}

// ---------------- User state ----------------
let authUser = null; // { id, email }
let me = null;       // { name, points, testPoints, progress, friends, isAdmin }

function topicStats(topicId) {
  return me.progress[topicId] || { correct: 0, attempted: 0 };
}
function totals() {
  let correct = 0, attempted = 0;
  Object.values(me.progress).forEach((p) => { correct += p.correct || 0; attempted += p.attempted || 0; });
  return { correct, attempted, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0 };
}
function mastery(topicId) {
  const s = topicStats(topicId);
  return s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0;
}

// Streak is kept on this device (the database has no streak column).
function streakKey() { return "apex-streak-" + authUser.id; }
function currentStreak() {
  const s = store(streakKey()) || {};
  return s.last === todayStr() || s.last === yesterdayStr() ? s.streak || 0 : 0;
}
function bumpStreak() {
  const s = store(streakKey()) || {};
  if (s.last === todayStr()) return;
  store(streakKey(), { streak: s.last === yesterdayStr() ? (s.streak || 0) + 1 : 1, last: todayStr() });
  saveGameSoon(); // keep the streak on your account too
}

function recordResults(results, { isTest = false } = {}) {
  // results: [{ q, topic, correct }]
  let earned = 0;
  const boost = eventBoost(isTest);
  results.forEach(({ q, topic, correct }) => {
    // AI-generated test questions have no topic id, so they earn points but don't count toward mastery.
    if (topic.id) {
      const p = (me.progress[topic.id] ||= { correct: 0, attempted: 0 });
      p.attempted += 1;
      if (correct) p.correct += 1;
    }
    if (correct) earned += pointsFor(q, topic);
  });
  const xp = earned * boost.xp;
  earned *= boost.points;
  me.points += earned;
  me.xp += xp;
  if (isTest) me.testPoints += earned;
  bumpStreak();
  saveProgress();
  renderMeBox();
  return earned;
}

let syncTimer = null;
function saveProgress() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const base = { points: me.points, xp: me.xp, progress: me.progress };
    const { error } = await sb.from("profiles").update({ ...base, test_points: me.testPoints, last_seen: new Date().toISOString() }).eq("id", authUser.id);
    if (error) {
      console.error("Apex: full sync failed, retrying with core fields —", error);
      const { error: e2 } = await sb.from("profiles").update(base).eq("id", authUser.id);
      if (e2) { console.error("Apex: sync failed —", e2); toast("Couldn't save progress — check your connection."); }
    }
  }, 400);
}

// ---------------- Screens ----------------
function showScreen(name) {
  ["loading", "auth", "paywall", "app"].forEach((s) => $(`#screen-${s}`).classList.toggle("hidden", s !== name));
}

// Large spots (login, paywall) get the full crest; everywhere else the compact shield.
document.querySelectorAll("[data-logo]").forEach((el) => {
  const tpl = el.classList.contains("logo-stack") ? "#crest-tpl" : "#logo-tpl";
  el.prepend($(tpl).content.cloneNode(true));
});

// ---------------- Theme ----------------
function toggleTheme() {
  const root = document.documentElement;
  const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("apex-theme", next); } catch (e) {}
}
function setTheme(mode) { // "light" | "dark" | "system"
  const root = document.documentElement;
  if (mode === "system") { delete root.dataset.theme; try { localStorage.removeItem("apex-theme"); } catch (e) {} }
  else { root.dataset.theme = mode; try { localStorage.setItem("apex-theme", mode); } catch (e) {} }
}
const currentThemeSetting = () => { try { return localStorage.getItem("apex-theme") || "system"; } catch (e) { return "system"; } };
$("#theme-toggle-m").addEventListener("click", toggleTheme);

// ---------------- Modals ----------------
function openModal(name) {
  $$(".modal").forEach(hide);
  show($(`#modal-${name}`));
  if (name === "feedback") loadMyFeedback();
}

// Shows the user's past messages and any admin replies inside the feedback modal.
async function loadMyFeedback(box = $("#my-feedback")) {
  const { data, error } = await sb.from("feedback").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(10);
  if (error || !data?.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="section-label" style="margin-top:8px;">Your messages</div>` + data.map((f) => `
    <div class="list-row" style="display:block;">
      <div class="row between"><span class="tag ${f.completed ? "good" : ""}">${f.completed ? "Resolved" : "Pending"}</span><span class="muted small">${fmtDate(f.created_at)}</span></div>
      <div class="small" style="margin-top:4px; white-space:pre-wrap;">${esc(f.message)}</div>
      ${f.admin_reply ? `<div class="explain"><strong>Reply:</strong> ${esc(f.admin_reply)}</div>` : ""}
    </div>`).join("");
}
document.addEventListener("click", (e) => {
  const opener = e.target.closest("[data-open]");
  if (opener) { e.preventDefault(); openModal(opener.dataset.open); return; }
  if (e.target.closest("[data-close]") || (e.target.classList.contains("modal") && !e.target.dataset.sticky)) {
    const modal = e.target.closest(".modal");
    if (modal) hide(modal);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $$(".modal:not([data-sticky])").forEach(hide);
});
$("#menu-admin").addEventListener("click", () => hide($("#modal-menu")));
$("#menu-settings").addEventListener("click", () => hide($("#modal-menu")));
$("#menu-notes").addEventListener("click", () => hide($("#modal-menu")));

// Sends feedback from a form with a category select, a message box and a send button.
async function sendFeedback(catEl, msgEl, btn, listBox) {
  const message = msgEl.value.trim();
  if (!message) return toast("Write a message first.");
  btn.disabled = true;
  const { error } = await sb.from("feedback").insert({
    user_id: authUser.id, username: me.name, avatar: "🎓",
    category: catEl.value, message, completed: false,
  });
  btn.disabled = false;
  if (error) { console.error(error); return toast("Couldn't send — try again."); }
  msgEl.value = "";
  toast("Thanks — feedback sent!");
  loadMyFeedback(listBox);
}
$("#feedback-send").addEventListener("click", () => sendFeedback($("#feedback-category"), $("#feedback-message"), $("#feedback-send"), $("#my-feedback")));

// ---------------- Auth ----------------
let authMode = "login";
$$("[data-auth-mode]").forEach((btn) => btn.addEventListener("click", () => {
  authMode = btn.dataset.authMode;
  $$("[data-auth-mode]").forEach((b) => b.classList.toggle("active", b === btn));
  const signup = authMode === "signup";
  $("#auth-name-field").classList.toggle("hidden", !signup);
  $("#auth-terms-field").classList.toggle("hidden", !signup);
  $("#auth-submit").textContent = signup ? "Create account" : "Log in";
  $("#auth-password").autocomplete = signup ? "new-password" : "current-password";
  hide($("#auth-msg"));
}));

$("#auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;
  const name = $("#auth-name").value.trim();
  const msg = $("#auth-msg");
  const btn = $("#auth-submit");
  hide(msg);

  if (authMode === "signup") {
    if (name.length < 3) return setMsg(msg, "Display name needs at least 3 characters.", "error");
    if (!$("#auth-terms").checked) return setMsg(msg, "Please agree to the Terms & Conditions.", "error");
  }

  btn.disabled = true;
  try {
    if (authMode === "signup") {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      store(`apex-terms-seen-${email}`, TERMS_VERSION);
      if (data.session && data.user) {
        await sb.from("profiles").insert({ id: data.user.id, email, username: name, has_paid: false, agreed_to_terms: true });
        await handleAuthenticatedUser(data.user);
      } else {
        $$("[data-auth-mode]")[0].click();
        setMsg(msg, "Account created! Check your email to confirm it, then log in.", "success");
      }
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await handleAuthenticatedUser(data.user);
    }
  } catch (err) {
    setMsg(msg, err.message || "Something went wrong.", "error");
  }
  btn.disabled = false;
});

function showAuthPanel(which) {
  $("#auth-main").classList.toggle("hidden", which !== "main");
  $("#forgot-form").classList.toggle("hidden", which !== "forgot");
  $("#reset-form").classList.toggle("hidden", which !== "reset");
  showScreen("auth");
}
$("#forgot-link").addEventListener("click", () => showAuthPanel("forgot"));
$("#forgot-back").addEventListener("click", () => showAuthPanel("main"));

$("#forgot-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#forgot-msg");
  const { error } = await sb.auth.resetPasswordForEmail($("#forgot-email").value.trim(), {
    redirectTo: location.origin + location.pathname,
  });
  if (error) setMsg(msg, "Couldn't send a reset email — check the address and try again.", "error");
  else setMsg(msg, "Check your email for a reset link.", "success");
});

$("#reset-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await sb.auth.updateUser({ password: $("#reset-password").value });
  if (error) return setMsg($("#reset-msg"), "The reset link may have expired — request a new one.", "error");
  history.replaceState(null, "", location.pathname);
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) handleAuthenticatedUser(session.user);
  else showAuthPanel("main");
});

async function logout() {
  await sb.auth.signOut();
  authUser = null;
  me = null;
  // Shared computers: don't leave this student's AI chats on screen for the next person.
  tutorChatId = null;
  forgetLocalAIState();
  forgetLocalCalendar();
  calView.month = calView.day = null;
  aiTest.log.length = 0;
  aiTest.draft = [];
  aiTest.types = [];
  aiTestOwner = null;
  $$(".modal").forEach(hide);
  history.replaceState(null, "", location.pathname);
  showAuthPanel("main");
}
$("#paywall-logout").addEventListener("click", logout);
$("#paywall-recheck").addEventListener("click", async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) handleAuthenticatedUser(session.user);
  else showAuthPanel("main");
});

async function handleAuthenticatedUser(user) {
  authUser = { id: user.id, email: user.email };
  let { data: profile, error } = await sb.from("profiles")
    .select("username, has_paid, paid_until, points, xp, test_points, progress, friends, is_admin, show_points")
    .eq("id", user.id).single();
  if (error && error.code !== "PGRST116") {
    // Older databases may not have test_points yet.
    ({ data: profile, error } = await sb.from("profiles")
      .select("username, has_paid, paid_until, points, xp, progress, friends, is_admin")
      .eq("id", user.id).single());
  }
  if (error?.code === "PGRST116") {
    await sb.from("profiles").insert({ id: user.id, email: user.email, has_paid: false, points: 0, progress: {} });
    return showPaywall();
  }
  if (error) { console.error("Apex: profile fetch failed —", error); return showPaywall(); }

  const active = profile.has_paid && (!profile.paid_until || new Date(profile.paid_until) > new Date());
  if (!active) return showPaywall();

  me = {
    name: (profile.username || "").trim() || user.email.split("@")[0],
    points: profile.points || 0,
    xp: profile.xp || 0,
    testPoints: profile.test_points || 0,
    progress: profile.progress || {},
    friends: profile.friends || [],
    isAdmin: !!profile.is_admin,
    paidUntil: profile.paid_until || null,
    showPoints: profile.show_points !== false,
  };
  try { await fetchGameData(user.id); cloudGame = true; } catch (e) { cloudGame = false; } // needs supabase/game-data.sql
  await loadCustomQuestions();
  enterApp();
}

function showPaywall() {
  $("#paywall-email").textContent = authUser?.email || "";
  showScreen("paywall");
}

async function loadCustomQuestions() {
  QUIZ_TOPICS.forEach((t) => { t.questions = t.questions.filter((q) => !q.isCustom); });
  const { data, error } = await sb.from("custom_questions").select("id, topic_id, prompt, answer, explanation, difficulty");
  if (error) return; // table is optional
  (data || []).forEach((row) => {
    const topic = QUIZ_TOPICS.find((t) => t.id === row.topic_id);
    if (!topic) return;
    topic.questions.push({
      id: `custom-${row.id}`, prompt: row.prompt, answer: row.answer, explanation: row.explanation || "",
      difficulty: row.difficulty, answerType: "text", isCustom: true,
    });
  });
}

// ---------------- App shell & routing ----------------
function enterApp() {
  const items = [...NAV, { route: "notes", label: "Notes & calendar", icon: "🗓️" }];
  $("#nav").innerHTML = items.map((n) =>
    `<a class="nav-link" href="#/${n.route}" data-route="${n.route}"><span class="ico">${n.icon}</span><span>${n.label}</span></a>`).join("");
  $("#tabbar").innerHTML = NAV.map((n) =>
    `<a href="#/${n.route}" data-route="${n.route}"><span class="ico">${n.icon}</span><span>${n.label}</span></a>`).join("");
  $("#menu-admin").classList.toggle("hidden", !me.isAdmin);
  $("#foot-admin").classList.toggle("hidden", !me.isAdmin);
  renderMeBox();
  showScreen("app");
  route();
  showLoginNotices();
  loadEvents();
  watchForUpdates();
}

// ---------------- Updates ----------------
// The site's version is the ?v= on the script links in index.html (bumped on every publish).
const SITE_VERSION = ([...document.scripts].map((s) => s.src.match(/js\/app\.js\?v=([^&]+)/)).find(Boolean) || [])[1] || "";
async function checkForUpdates() {
  const res = await fetch(`${location.origin}${location.pathname}?update-check=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const latest = ((await res.text()).match(/js\/app\.js\?v=([^"'&]+)/) || [])[1] || "";
  return { latest, newer: !!latest && latest !== SITE_VERSION };
}
function installUpdate(latest) {
  location.replace(`${location.pathname}?updated=${encodeURIComponent(latest || Date.now())}${location.hash}`);
}
// After updating, tidy the address bar and say so.
if (/[?&]updated=/.test(location.search)) {
  history.replaceState(null, "", location.pathname + location.hash);
  setTimeout(() => toast("✓ You're on the latest version"), 800);
}
// Quietly checks every 30 minutes and offers the update.
function watchForUpdates() {
  if (location.protocol === "file:") return;
  const tick = async () => {
    if (document.hidden || $(".update-bar")) return;
    try {
      const { newer, latest } = await checkForUpdates();
      if (!newer) return;
      const bar = document.createElement("div");
      bar.className = "update-bar";
      bar.innerHTML = `<span>✨ A new version of JINtelligence is ready.</span><button class="btn sm" type="button">Update</button><button class="btn ghost sm" type="button" aria-label="Later" style="color:inherit;">✕</button>`;
      $$("button", bar)[0].addEventListener("click", () => { if (!leaveWarning || confirm(leaveWarning)) installUpdate(latest); });
      $$("button", bar)[1].addEventListener("click", () => bar.remove());
      document.body.appendChild(bar);
    } catch (e) { /* offline — try again later */ }
  };
  setInterval(tick, 30 * 60 * 1000);
}

// ---------------- Login notices ----------------
// When the Terms and Conditions change: bump TERMS_VERSION and update TERMS_CHANGES.
// Everyone then sees the "terms have changed" pop-up once and must agree.
const TERMS_VERSION = "2026-10-16b";
const TERMS_CHANGES = [
  "New name: Apex Academy is now called JINtelligence. Everything else (your account, progress and payments) stays the same.",
  "New — ownership: JINtelligence (its name, logos, design, code, lessons and questions) belongs to Jayden Narayan. You must not copy it, re-publish it or claim it as your own.",
  "New — calendar: put your tests, assignments and reminders on the calendar (Notes & calendar). It's saved to your account, and the AI can see what's coming up so it can help you prepare (you can turn this off).",
  "New — AI memory: your AI tutor chats are saved to your account, and the AI can remember short notes about you (like topics you find tricky) to help you next time. You can see, delete or turn this off in Settings.",
  "New — public tests: you can share tests with everyone on JINtelligence. Shared tests show your name (unless you turn it off), must follow the behaviour rules, and can be removed by the site owner.",
  "Access is $10 AUD every 6 months, paid cash in hand to the site owner.",
  "Accounts are unlocked by hand, so it may take a while after paying. No refunds.",
  "Using the AI: it's for learning. Don't hand in AI-written work as your own.",
  "Behaviour: be respectful, or your account may be suspended.",
  "Leaderboard: if you hide your points, your name is hidden too (you show as 'Hidden player').",
  "Safety and privacy: under 18s need a parent or guardian's OK; you can ask for your data to be deleted.",
  "No guarantees: practice doesn't guarantee marks, and the site may sometimes be down for updates.",
]
const RENEW_WARNING_DAYS = 14;
const termsKey = () => `apex-terms-seen-${authUser.id}`;

function showLoginNotices() {
  const queue = [];
  const seen = store(termsKey()) || store(`apex-terms-seen-${authUser.email}`);
  if (seen !== TERMS_VERSION) queue.push(showTermsChanged);
  queue.push((next) => checkAnnouncement(next));
  if (me.paidUntil) {
    const daysLeft = Math.ceil((new Date(me.paidUntil) - new Date()) / 86400000);
    const shownKey = `apex-renew-shown-${authUser.id}`;
    if (daysLeft > 0 && daysLeft <= RENEW_WARNING_DAYS && store(shownKey) !== todayStr()) {
      queue.push((next) => { store(shownKey, todayStr()); showRenewReminder(daysLeft, next); });
    }
  }
  queue.push((next) => giftsNotice(next));
  queue.push((next) => showComingUp(next));
  const run = () => { const fn = queue.shift(); if (fn) fn(run); };
  run();
}

// ---------------- Announcements ----------------
// The admin's latest active announcement shows once to each user as a big slide-in message. Needs supabase/announcements.sql.
const announceSeenKey = () => `apex-announce-seen-${authUser.id}`;

async function latestAnnouncement() {
  const { data, error } = await sb.from("announcements").select("id, message, created_at").eq("active", true)
    .order("created_at", { ascending: false }).limit(1);
  if (error) return null; // table not set up yet
  return (data || [])[0] || null;
}

// Announcements never interrupt: they slide in at the top and fade away.
// While a test is running (leaveWarning is set) they wait until it's finished.
let pendingAnnouncement = null;

async function checkAnnouncement(next = () => {}) {
  next(); // never hold up other notices
  const a = await latestAnnouncement();
  if (!a || store(announceSeenKey()) === a.id) return;
  if (leaveWarning) { pendingAnnouncement = a; return; }
  showAnnouncementPop(a);
}

function flushPendingAnnouncement() {
  if (pendingAnnouncement && !leaveWarning) {
    const a = pendingAnnouncement;
    pendingAnnouncement = null;
    setTimeout(() => showAnnouncementPop(a), 800);
  }
}

function showAnnouncementPop(a) {
  store(announceSeenKey(), a.id);
  $("#announce-pop")?.remove();
  const el = document.createElement("div");
  el.id = "announce-pop";
  el.setAttribute("role", "status");
  el.innerHTML = `
    <button class="announce-x" aria-label="Close">✕</button>
    <div class="announce-label">📢 Announcement · ${fmtDate(a.created_at)}</div>
    <div class="announce-big">${esc(a.message)}</div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 400); };
  $(".announce-x", el).addEventListener("click", close);
  setTimeout(close, 12000);
}

// Pick up new announcements for people who keep the site open.
setInterval(() => { if (me) checkAnnouncement(); }, 5 * 60 * 1000);

// ---------------- Events ----------------
// Admins run boost events (double points, triple XP, ...). Needs supabase/events.sql.
const EVENT_KINDS = {
  both: { label: "Points & XP", note: "everywhere" },
  points: { label: "Points", note: "everywhere" },
  xp: { label: "XP", note: "everywhere" },
  tests: { label: "Points & XP", note: "in tests" },
  practice: { label: "Points & XP", note: "in practice" },
};
const multName = (m) => ({ 2: "Double", 3: "Triple", 4: "Quadruple" }[m] || `${m}×`);
const eventName = (e) => e.title || `${multName(e.multiplier)} ${EVENT_KINDS[e.kind]?.label || "Points"}`;
let events = [];

async function loadEvents() {
  const { data, error } = await sb.from("events").select("*").gt("ends_at", new Date().toISOString()).order("starts_at");
  events = error ? [] : data || [];
  drawEventBar();
}
const liveEvents = () => { const now = Date.now(); return events.filter((e) => new Date(e.starts_at) <= now && new Date(e.ends_at) > now); };

// The best multiplier from any live event, for points and XP separately.
function eventBoost(isTest) {
  const boost = { points: 1, xp: 1 };
  liveEvents().forEach((e) => {
    if ((e.kind === "tests" && !isTest) || (e.kind === "practice" && isTest)) return;
    if (e.kind !== "xp") boost.points = Math.max(boost.points, e.multiplier);
    if (e.kind !== "points") boost.xp = Math.max(boost.xp, e.multiplier);
  });
  return boost;
}
// "(2× event!)" after points earned, when a boost applied.
function boostNote(isTest) {
  const b = eventBoost(isTest);
  const m = Math.max(b.points, b.xp);
  return m > 1 ? ` <span class="tag event-tag">⚡ ${m}× event</span>` : "";
}

function timeLeft(ms) {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), d = Math.floor(h / 24);
  if (d >= 1) return `${d} day${d > 1 ? "s" : ""}${h % 24 ? ` ${h % 24} h` : ""}`;
  return `${h} h${mins % 60 ? ` ${mins % 60} min` : ""}`;
}

function drawEventBar() {
  const bar = $("#event-bar");
  if (!bar) return;
  const live = liveEvents();
  if (!live.length) { hide(bar); bar.innerHTML = ""; return; }
  bar.innerHTML = live.map((e) => `
    <div class="event-row"><span class="event-bolt">⚡</span>
      <span class="grow"><b>${esc(eventName(e))}</b> is on ${EVENT_KINDS[e.kind]?.note || ""}!</span>
      <span class="event-time">Ends in ${timeLeft(new Date(e.ends_at) - Date.now())}</span></div>`).join("");
  show(bar);
}
setInterval(() => { if (me) drawEventBar(); }, 30 * 1000);
setInterval(() => { if (me) loadEvents(); }, 2 * 60 * 1000);

function showTermsChanged(next) {
  $("#terms-changes").innerHTML = TERMS_CHANGES.map((c) => `<li>${esc(c)}</li>`).join("");
  show($("#modal-terms-update"));
  $("#terms-agree").onclick = () => {
    store(termsKey(), TERMS_VERSION);
    hide($("#modal-terms-update"));
    next();
  };
  $("#terms-read").onclick = () => {
    hide($("#modal-terms-update"));
    show($("#modal-terms"));
    // come back to the agree pop-up when the full terms are closed
    const back = () => { if ($("#modal-terms").classList.contains("hidden")) { show($("#modal-terms-update")); clearInterval(t); } };
    const t = setInterval(back, 300);
  };
}

function showRenewReminder(daysLeft, next) {
  const date = fmtDate(me.paidUntil);
  $("#renew-text").innerHTML = `Your access ends in <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong> (on ${esc(date)}).`;
  show($("#modal-renew"));
  $("#renew-ok").onclick = () => { hide($("#modal-renew")); next(); };
}

function renderMeBox() {
  const line = `✦ ${me.points} pts · 🔥 ${currentStreak()}`;
  const { current } = levelInfo(me.xp, me.isAdmin);
  $("#me-name").textContent = me.name;
  $("#me-avatar").textContent = (me.name || "?").trim().charAt(0).toUpperCase();
  $("#me-rank").innerHTML = `${current.icon} ${esc(current.name)} · ${me.xp} XP`;
  $("#me-stats").textContent = line;
  $("#me-stats-mobile").textContent = line;
}

let cleanup = null;      // called before leaving the current page (stops timers)
let leaveWarning = null; // set while a test is running
let lastHash = "";

window.addEventListener("hashchange", () => {
  if (!me) return;
  if (leaveWarning && location.hash !== lastHash) {
    if (!confirm(leaveWarning)) { history.replaceState(null, "", lastHash); return; }
    leaveWarning = null;
  }
  route();
});
window.addEventListener("beforeunload", (e) => { if (leaveWarning) { e.preventDefault(); e.returnValue = ""; } });
// Clicking a menu link for the page you're already on (e.g. Games after a game) reopens that page.
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[data-route]");
  if (!me || !a || a.getAttribute("href") !== location.hash || e.defaultPrevented) return;
  e.preventDefault();
  if (leaveWarning && !confirm(leaveWarning)) return;
  route();
});

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  leaveWarning = null;
  flushPendingAnnouncement();
  lastHash = location.hash;
  const [page = "home", arg, arg2] = location.hash.replace(/^#\/?/, "").split("/");
  const view = $("#view");
  const pages = { home: pageHome, practice: pagePractice, test: pageTest, games: pageGames, tutor: pageTutor, progress: pageProgress, notes: pageNotes, admin: pageAdmin, settings: pageSettings };
  const render = pages[page] || pageHome;
  const navRoute = pages[page] ? page : "home";
  $$("[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === navRoute));
  view.innerHTML = "";
  view.closest("main").classList.remove("with-notes", "wide");
  render(view, arg, arg2);
  window.scrollTo(0, 0);
}

// ---------------- Leaderboard data ----------------
// People who hide their points are shown to others as "Hidden player" (name and points).
const lbHidden = (r, isMe) => !isMe && r.show_points === false;
const lbName = (r, isMe) => (lbHidden(r, isMe) ? "🙈 Hidden player" : esc(r.username) + (isMe ? " (you)" : ""));
async function loadLeaderboard() {
  let { data, error } = await sb.from("public_profiles").select("username, points, show_points, deleted").order("points", { ascending: false }).limit(100);
  if (error) ({ data, error } = await sb.from("public_profiles").select("username, points, show_points").order("points", { ascending: false }).limit(100));
  if (error) throw error;
  return (data || []).filter((r) => r.username && !r.deleted);
}

// ---------------- Home ----------------
function suggestTopic() {
  const attempted = QUIZ_TOPICS.filter((t) => topicStats(t.id).attempted >= 5);
  const weak = attempted.filter((t) => mastery(t.id) < 70).sort((a, b) => mastery(a.id) - mastery(b.id))[0];
  if (weak) return { topic: weak, reason: `Your accuracy here is ${mastery(weak.id)}% — a bit more practice will help.` };
  const fresh = QUIZ_TOPICS.find((t) => topicStats(t.id).attempted === 0);
  if (fresh) return { topic: fresh, reason: "You haven't tried this topic yet." };
  const lowest = [...QUIZ_TOPICS].sort((a, b) => mastery(a.id) - mastery(b.id))[0];
  return { topic: lowest, reason: "Your lowest-scoring topic — keep it sharp." };
}

function pageHome(view) {
  const t = totals();
  const { topic, reason } = suggestTopic();
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  view.innerHTML = `
    <div class="card brand-hero">
      ${$("#logo-tpl").innerHTML.replace("logo-mark", "logo-crest")}
      <div>
        <h2><b>JIN</b>telligence</h2>
        <p>Year 7 Maths, English &amp; Science · AI help for any subject, any level</p>
      </div>
    </div>
    <div class="page-head">
      <h1>${greet}, ${esc(me.name)}</h1>
      <p>Pick up where you left off, or try something new.</p>
    </div>
    <div class="grid cols-3">
      ${statCard("Points", me.points)}
      ${statCard("Accuracy", t.accuracy + "%")}
      ${statCard("Day streak", currentStreak())}
    </div>
    <div style="margin-top:12px;">${rankCard()}</div>

    <div id="home-cal" style="margin-top:12px;"></div>

    <div class="section-label">Suggested next</div>
    <div class="card suggest">
      <div class="row" style="gap:14px;">
        <span class="emoji">${topic.icon}</span>
        <div><h3 style="margin:0;">${esc(topic.name)}</h3><div class="muted small">${esc(reason)}</div></div>
      </div>
      <a class="btn" href="#/practice/${topic.id}">Practise →</a>
    </div>

    <div class="section-label row between" style="margin-bottom:10px;">
      <span>🏆 Leaderboard</span><a class="btn ghost sm" href="#/progress">See all →</a>
    </div>
    <div class="card" id="home-lb"><p class="muted" style="margin:0;">Loading…</p></div>

    <div class="section-label">Jump in</div>
    <div class="grid topics">
      ${quickCard("#/practice", "📚", "Practice", "Work through topics at your own pace.")}
      ${quickCard("#/test", "📝", "Take a test", "Mix topics against the clock.")}
      ${quickCard("#/games", "🎮", "Play a game", "Beat the clock or survive with 3 lives.")}
      ${quickCard("#/tutor", "🤖", "Ask the tutor", "Stuck? Get a friendly explanation.")}
    </div>
  `;

  homeCalendarCard($("#home-cal", view));

  // Top 5, plus your own place if you're further down.
  loadLeaderboard().then((rows) => {
    const box = $("#home-lb", view);
    if (!box) return;
    if (!rows.length) { box.innerHTML = `<p class="muted" style="margin:0;">No one on the leaderboard yet.</p>`; return; }
    const myIndex = rows.findIndex((r) => r.username === me.name);
    const shown = rows.slice(0, 5).map((r, i) => ({ r, i }));
    if (myIndex >= 5) shown.push({ r: rows[myIndex], i: myIndex, gap: true });
    const medal = (i) => ["🥇", "🥈", "🥉"][i] || String(i + 1);
    box.innerHTML = shown.map(({ r, i, gap }) => {
      const isMe = i === myIndex;
      const pts = isMe ? `${me.points} pts` : r.show_points === false ? "hidden" : `${r.points || 0} pts`;
      return `${gap ? `<div class="muted small" style="text-align:center; padding:2px 0;">⋯</div>` : ""}
        <div class="list-row ${isMe ? "me" : ""}">
          <span class="rank">${medal(i)}</span>
          <span class="grow ${lbHidden(r, isMe) ? "muted" : ""}">${lbName(r, isMe)}</span>
          <span class="muted small">${pts}</span>
        </div>`;
    }).join("");
  }).catch(() => {
    const box = $("#home-lb", view);
    if (box) box.innerHTML = `<p class="muted" style="margin:0;">Couldn't load the leaderboard.</p>`;
  });
}
function rankCard() {
  const { current, next, pct } = levelInfo(me.xp, me.isAdmin);
  return `
    <div class="card rank-card">
      <span class="rank-icon">${current.icon}</span>
      <div style="flex:1;">
        <div class="row between"><strong>${esc(current.name)}</strong><span class="muted small">${me.xp} XP</span></div>
        <div class="bar" style="margin:8px 0 4px;"><span style="width:${pct}%"></span></div>
        <div class="muted small">${next ? `${next.min - me.xp} XP to ${next.icon} ${next.name}` : "Top rank reached"}</div>
      </div>
    </div>`;
}

const statCard = (label, value) => `<div class="card stat"><div class="label">${label}</div><div class="value">${value}</div></div>`;
const quickCard = (href, icon, title, text) => `
  <a class="card topic-card" href="${href}">
    <div class="title"><span class="emoji">${icon}</span>${title}</div>
    <div class="muted small">${text}</div>
  </a>`;

// ---------------- Practice ----------------
function topicCard(t) {
  const s = topicStats(t.id);
  const footer = t.special
    ? `<div class="muted small">Writing practice with AI feedback</div>`
    : `<div class="bar"><span style="width:${mastery(t.id)}%"></span></div>
       <div class="muted small">${s.attempted ? `${mastery(t.id)}% · ${s.attempted} answered` : "Not started"}</div>`;
  return `
    <a class="card topic-card" href="#/practice/${t.id}">
      <div class="title"><span class="emoji">${t.icon}</span>${esc(t.name)}</div>
      ${footer}
    </a>`;
}

function pagePractice(view, topicId) {
  if (topicId) {
    const t = findTopic(topicId);
    if (!t) { location.hash = "#/practice"; return; }
    return t.special ? pageWriting(view, t) : pageTopic(view, t);
  }
  view.innerHTML = `
    <div class="page-head"><h1>Practice</h1><p>Choose a topic. Each set has ${practiceSetSize()} questions.</p></div>
    ${YEAR_LEVELS.map((y) => `
      <div class="section-label">Maths · ${esc(y.label)}</div>
      <div class="grid topics">${y.topics.map(topicCard).join("")}</div>`).join("")}
    <div class="section-label">English</div>
    <div class="grid topics">${ENGLISH_TOPICS.map(topicCard).join("")}</div>
    <div class="section-label">Science</div>
    <div class="grid topics">${SCIENCE_TOPICS.map(topicCard).join("")}</div>
  `;
}

function pageTopic(view, t) {
  let difficulty = 1;
  let set = [];

  const worked = t.workedExample ? [1, 2, 3].filter((d) => t.workedExample[d]) : [];
  view.closest("main").classList.add("with-notes");
  view.innerHTML = `<div class="topic-layout"><div class="topic-main">
    <a class="back" href="#/practice">← All topics</a>
    <div class="page-head">
      <h1>${t.icon} ${esc(t.name)}</h1>
      <p>${esc(t.recap || t.blurb || "")}</p>
    </div>
    <div class="segmented" id="tabs" style="margin-bottom:16px;">
      <button type="button" data-tab="learn">📖 Learn</button>
      <button type="button" data-tab="practice">✏️ Practice</button>
    </div>

    <div id="tab-learn" class="stack">
      ${lessonHTML(t.id)}
      ${videosHTML(t)}
      ${explorerHTML(t.id)}
      ${t.example || t.diagram ? `
        <div class="card lesson">
          <h3>In real life</h3>
          ${t.example ? `<p>${esc(t.example)}</p>` : ""}
          ${t.diagram ? `<div class="diagram-box">${t.diagram}</div>` : ""}
        </div>` : ""}
      ${worked.length ? `
        <div class="card lesson">
          <h3>Worked examples</h3>
          ${worked.map((d) => `
            <p style="margin:14px 0 6px;"><span class="tag">${DIFF_NAMES[d]}</span> ${esc(t.workedExample[d].question)}</p>
            <div class="explain" style="margin-top:0;">${esc(t.workedExample[d].walkthrough)}</div>`).join("")}
        </div>` : ""}
      <button class="btn block" type="button" id="go-practice">Start practising →</button>
    </div>

    <div class="card" id="tab-practice">
      <div class="row between" style="margin-bottom:18px;">
        <div class="segmented" id="diff">
          ${[1, 2, 3].map((d) => `<button type="button" data-d="${d}">${DIFF_NAMES[d]}</button>`).join("")}
        </div>
        <span class="muted small" id="pts-each"></span>
      </div>
      <form id="qset" autocomplete="off"></form>
    </div>
    </div>${notesPanelHTML()}</div>
  `;
  const notes = wireNotesPanel(view, t);
  cleanup = () => notes.flush();

  wireExplorer($("#tab-learn", view));
  $$("#diff button", view).forEach((b) => b.addEventListener("click", () => { difficulty = +b.dataset.d; newSet(); }));

  function showTab(name) {
    $$("#tabs button", view).forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    $("#tab-learn", view).classList.toggle("hidden", name !== "learn");
    $("#tab-practice", view).classList.toggle("hidden", name !== "practice");
    if (name === "practice") $(FOCUS_SEL, $("#qset", view))?.focus({ preventScroll: true });
  }
  $$("#tabs button", view).forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("#go-practice", view).addEventListener("click", () => { showTab("practice"); window.scrollTo(0, 0); });

  function newSet() {
    $$("#diff button", view).forEach((b) => b.classList.toggle("active", +b.dataset.d === difficulty));
    set = groupPassages(nextPracticeSet(t, difficulty));
    const boosted = eventBoost(false).points;
    $("#pts-each", view).textContent = set.length ? `+${pointsFor(set[0], t) * boosted} pts each${boosted > 1 ? ` (⚡ ${boosted}× event)` : ""}` : "";

    const form = $("#qset", view);
    delete form.dataset.checked; // a fresh set can always be checked
    if (!set.length) { form.innerHTML = `<p class="muted">No questions at this level yet — try another.</p>`; return; }
    const shown = passageFlags(set);
    form.innerHTML = set.map((q, i) => questionHTML(q, i, "", shown[i])).join("") +
      `<div class="row" style="margin-top:18px;">
        <button class="btn" type="submit" id="check">Check answers</button>
        <button class="btn secondary" type="button" id="skip-set">New set ↻</button>
      </div>`;
    wireQuestions(form, set);
    $("#skip-set", form).addEventListener("click", () => {
      const typed = $$(ANSWER_SEL, form).some((i) => i.value.trim());
      if (typed && !confirm("Get new questions? Your answers here won't be checked.")) return;
      newSet();
    });
    if (!$("#tab-practice", view).classList.contains("hidden")) $(FOCUS_SEL, form)?.focus({ preventScroll: true });
  }

  $("#qset", view).addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.dataset.checked === "true") return;
    const blanks = set.filter((q) => !$(`input[data-qid="${q.id}"]`, form).value.trim()).length;
    if (blanks && !confirm(`You've left ${blanks} blank. Check anyway?`)) return;
    form.dataset.checked = "true";

    const results = set.map((q) => {
      const input = $(`input[data-qid="${q.id}"]`, form);
      const correct = isAnswerCorrect(q, input.value);
      markQuestion(input.closest(".question"), q, correct);
      return { q, topic: t, correct };
    });
    const right = results.filter((r) => r.correct).length;
    const earned = recordResults(results);
    const kind = right === set.length ? "good" : right === 0 ? "bad" : "info";
    const actions = $(".row:last-child", form);
    actions.innerHTML = `
      <div class="banner ${kind}" style="flex:1;">${right}/${set.length} correct · +${earned} points${earned ? boostNote(false) : ""}</div>
      <button class="btn" type="button" id="next-set">Next set →</button>`;
    $("#next-set", form).addEventListener("click", () => { delete form.dataset.checked; newSet(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  });

  newSet();
  showTab(topicStats(t.id).attempted ? "practice" : "learn");
}

// Deals practice questions like a shuffled deck: every question at a difficulty
// is shown once before any repeats. The deck is remembered on this device.
function nextPracticeSet(t, difficulty) {
  const pool = t.questions.filter((q) => q.difficulty === difficulty);
  const key = `apex-deck-${authUser.id}`;
  const decks = store(key) || {};
  const deckId = `${t.id}-${difficulty}`;
  const ids = new Set(pool.map((q) => q.id));
  let deck = (decks[deckId] || []).filter((id) => ids.has(id));
  const set = [];
  while (set.length < Math.min(practiceSetSize(), pool.length)) {
    if (!deck.length) {
      // Reshuffle, keeping this set's questions out of the start of the new deck.
      const taken = new Set(set.map((q) => q.id));
      deck = shuffle(pool.filter((q) => !taken.has(q.id)).map((q) => q.id));
      if (!deck.length) break;
    }
    const id = deck.shift();
    set.push(pool.find((q) => q.id === id));
  }
  decks[deckId] = deck;
  store(key, decks);
  return set;
}

// Renders a topic's lesson sections from TOPIC_LESSONS (js/lessons.js).
function lessonHTML(topicId, { flat = false } = {}) {
  const sections = (typeof TOPIC_LESSONS !== "undefined" && TOPIC_LESSONS[topicId]) || [];
  return sections.map((sec) => `
    <div class="${flat ? "lesson" : "card lesson"}">
      <h3>${esc(sec.title)}</h3>
      ${sec.text ? `<p>${esc(sec.text)}</p>` : ""}
      ${sec.points ? `<ul>${sec.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul>` : ""}
      ${sec.visual ? visualHTML({ visual: sec.visual }) : ""}
      ${sec.tip ? `<div class="tip">💡 ${esc(sec.tip)}</div>` : ""}
    </div>`).join("");
}

// Video links for a topic (js/challenge.js). Each opens one explainer video on YouTube.
function videosHTML(t) {
  const list = (typeof TOPIC_VIDEOS !== "undefined" && TOPIC_VIDEOS[t.id]) || [];
  if (!list.length) return "";
  return `<div class="card lesson videos">
      <h3>🎬 Videos to help</h3>
      <p class="muted small">Short videos that explain this topic. They open on YouTube.</p>
      <div class="video-links">
        ${list.map(([title, id]) => `<a class="video-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener"><span class="video-play">▶</span><span>${esc(title)}</span></a>`).join("")}
      </div>
    </div>`;
}

// Keeps questions about the same reading passage next to each other (in the order they first appear).
function groupPassages(list, getQ = (x) => x) {
  const groups = new Map();
  list.forEach((item, i) => {
    const p = getQ(item).passage;
    const key = p ? `p:${p}` : `i:${i}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.values()].flat();
}
// Shows a passage only above the first of the questions in a row that use it.
const passageFlags = (qs) => qs.map((q, i) => !!q.passage && (i === 0 || qs[i - 1].passage !== q.passage));

function questionHTML(q, i, topicLabel = "", showPassage = q.showPassage) {
  return `
    <div class="question" data-qid="${q.id}">
      ${topicLabel ? `<div class="tag" style="display:inline-block; margin-bottom:6px;">${esc(topicLabel)}</div>` : ""}
      ${q.style ? `<div class="tag q-style q-style-${esc(q.style.toLowerCase().replace(/[^a-z]/g, ""))}">${esc(q.style)}</div>` : ""}
      ${showPassage ? `<div class="passage">${esc(q.passage)}</div>` : q.passage ? `<div class="muted small passage-ref">📖 Use the information above.</div>` : ""}
      <div class="prompt"><span class="num">${i + 1}.</span>${esc(q.prompt)}</div>
      ${q.table ? visualHTML({ visual: { type: "table", rows: q.table } }) : ""}
      ${isVisualInput(q) ? `<input type="hidden" data-qid="${q.id}" value="">${visualHTML(q)}`
      : `${visualHTML(q)}${q.answerType === "written" ? `<textarea data-qid="${q.id}" rows="3" placeholder="Write your answer in your own words"></textarea>`
      : q.answerType === "point" ? pointInputHTML(q)
      : q.options ? `<input type="hidden" data-qid="${q.id}" value="">
      <div class="mc">${q.options.map((o) => `<label class="mc-opt"><input type="radio" name="mc-${q.id}" value="${esc(o)}"> <span>${esc(o)}</span></label>`).join("")}</div>`
      : `<input type="text" data-qid="${q.id}" placeholder="Your answer" inputmode="${q.answerType === "text" ? "text" : "decimal"}">`}`}
      <div class="q-feedback"></div>
    </div>`;
}

// Turns on tapping, plotting, dragging etc. for questions just rendered into `root`.
function wireQuestions(root, qs) {
  qs.forEach((q) => {
    const row = $(`.question[data-qid="${CSS.escape(String(q.id))}"]`, root);
    if (row) wireQuestion(row, q);
  });
}

// Shows right/wrong, plus explanation and AI step-by-step buttons.
function markQuestion(row, q, correct, { yourAnswer, feedback } = {}) {
  const input = $("input, textarea", row);
  if (input) { input.disabled = true; input.classList.add(correct ? "correct" : "wrong"); }
  if (q.options) {
    $$(".mc-opt", row).forEach((label) => {
      const radio = $("input", label);
      radio.disabled = true;
      if (yourAnswer !== undefined) radio.checked = radio.value === yourAnswer;
      if (radio.value === String(displayAnswer(q))) label.classList.add("right");
      else if (radio.checked) label.classList.add("wrong");
    });
  }
  const raw = yourAnswer !== undefined ? yourAnswer : $("input[type=hidden][data-qid]", row)?.value;
  markVisual(row, q, raw, correct);
  const fb = $(".q-feedback", row);
  const yours = yourAnswer !== undefined ? `You answered: ${esc(yourAnswerText(q, yourAnswer))}. ` : "";
  fb.innerHTML = `
    ${q.answerType === "written"
      ? `<div class="q-result ${correct ? "correct" : "wrong"}">${correct ? "✓ Good answer" : "✕ Not quite"}</div>
         ${feedback ? `<div class="explain">${esc(feedback)}</div>` : ""}
         <div class="explain"><b>Example answer:</b> ${esc(displayAnswer(q))}</div>`
      : `<div class="q-result ${correct ? "correct" : "wrong"}">${correct ? "✓ Correct" : `✕ ${yours}The answer is ${esc(displayAnswer(q))}`}</div>`}
    <div class="q-tools">
      ${q.explanation ? `<button type="button" class="btn ghost sm" data-act="explain">Explanation</button>` : ""}
      <button type="button" class="btn ghost sm" data-act="steps">Step-by-step (AI)</button>
      <button type="button" class="btn ghost sm" data-ask-ai>🤖 Ask the AI</button>
    </div>
    <div class="explain hidden" data-box="explain">${esc(q.explanation)}</div>
    <div class="explain hidden" data-box="steps"></div>`;

  $("[data-ask-ai]", fb).addEventListener("click", () => askTutorAbout(q));
  $$("[data-act]", fb).forEach((btn) => btn.addEventListener("click", async () => {
    const box = $(`[data-box="${btn.dataset.act}"]`, fb);
    box.classList.toggle("hidden");
    if (btn.dataset.act !== "steps" || box.dataset.loaded || box.classList.contains("hidden")) return;
    box.textContent = "Working through the steps…";
    btn.disabled = true;
    try {
      box.textContent = await askTutor(`You are a friendly tutor. Give a clear, numbered, step-by-step walkthrough for solving this question:
"${q.prompt}"
${q.passage ? `It is about this passage: "${q.passage}"\n` : ""}${q.visual ? `(The question shows: ${describeVisual(q.visual)}.)\n` : ""}
The correct answer is: "${displayAnswer(q)}"

Break the solution into short numbered steps the student could follow easily. Keep it concise, no markdown formatting.
${learnerLine("Year 7")}`);
      box.dataset.loaded = "1";
    } catch (err) {
      console.error(err);
      box.textContent = err.userMessage || "Couldn't reach the tutor — try again in a moment.";
    }
    btn.disabled = false;
  }));
}

// ---------------- Saved writing ----------------
// Pieces are always kept on this device. If the Supabase `writings` table exists
// (see supabase/writings.sql) they're saved there too, so they follow the student
// between devices.
let cloudWritings = true;
const writingsKey = () => `apex-writings-${authUser.id}`;
const localWritings = () => store(writingsKey()) || [];
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : "w-" + Date.now() + "-" + Math.random().toString(16).slice(2));

function writingText(piece) {
  return piece.parts ? piece.parts.map((p) => p.trim()).filter(Boolean).join("\n\n") : piece.text || "";
}
const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);

function putLocalWriting(piece) {
  store(writingsKey(), [piece, ...localWritings().filter((p) => p.id !== piece.id)].slice(0, 200));
}

async function saveWriting(piece) {
  piece.updatedAt = new Date().toISOString();
  piece.text = writingText(piece);
  putLocalWriting(piece);
  if (!cloudWritings) return;
  const { error } = await sb.from("writings").upsert({
    id: piece.id, user_id: authUser.id, topic_id: piece.topicId, prompt: piece.prompt,
    text: piece.text, parts: piece.parts || null, settings: { ...piece.settings, evidence: piece.evidence || null, plan: piece.plan || null, stage: piece.stage || null, chat: (piece.chat || []).filter((m) => m.role !== "err").slice(-40) }, feedback: piece.feedback || null,
    word_count: countWords(piece.text), created_at: piece.createdAt, updated_at: piece.updatedAt,
  });
  if (error) { cloudWritings = false; console.warn("Apex: writings table unavailable, saving on this device only —", error.message); }
}

async function listWritings(topicId) {
  const byId = new Map(localWritings().map((p) => [p.id, p]));
  if (cloudWritings) {
    const { data, error } = await sb.from("writings").select("*").eq("user_id", authUser.id);
    if (error) cloudWritings = false;
    else (data || []).forEach((r) => {
      const local = byId.get(r.id);
      if (local && local.updatedAt >= r.updated_at) return;
      byId.set(r.id, {
        id: r.id, topicId: r.topic_id, prompt: r.prompt, text: r.text, parts: r.parts || undefined,
        settings: r.settings || {}, evidence: r.settings?.evidence || undefined, plan: r.settings?.plan || undefined, stage: r.settings?.stage || undefined, chat: r.settings?.chat || undefined,
        feedback: r.feedback || "", createdAt: r.created_at, updatedAt: r.updated_at,
      });
    });
  }
  const all = [...byId.values()].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  store(writingsKey(), all.slice(0, 200));
  return topicId ? all.filter((p) => p.topicId === topicId) : all;
}

async function deleteWriting(id) {
  store(writingsKey(), localWritings().filter((p) => p.id !== id));
  if (cloudWritings) await sb.from("writings").delete().eq("id", id);
}

// ---------------- Writing (creative + essay) ----------------
const ESSAY_TYPES = {
  persuasive: { label: "Persuasive", hint: "argue for one side" },
  discussion: { label: "Discussion", hint: "weigh up both sides" },
  informative: { label: "Informative", hint: "explain a topic clearly" },
};
// ---------------- AI feedback style ----------------
// How the AI talks when it checks your work: chill and supportive, balanced, or very critical.
// Chosen on the Test page, in writing practice or in Settings; the same choice is used everywhere.
const FEEDBACK_STYLES = {
  chill: { label: "😌 Chill", long: "Chill & supportive" },
  balanced: { label: "⚖️ Balanced", long: "Balanced" },
  critical: { label: "🔥 Critical", long: "Very critical" },
  brutal: { label: "💀 Super critical", long: "Very, very critical" },
};
const feedbackStyleKey = () => `apex-feedback-style-${authUser.id}`;
const feedbackStyle = () => (FEEDBACK_STYLES[store(feedbackStyleKey())] ? store(feedbackStyleKey()) : "balanced");
// Extra instructions added to every AI prompt that checks or comments on the student's work.
function feedbackTone(task = "feedback") {
  const style = feedbackStyle();
  if (style === "chill") return `FEEDBACK STYLE — CHILL AND SUPPORTIVE: Be relaxed, warm and upbeat, like a friendly coach. Start with what they did well and celebrate it. Keep criticism gentle and short: at most one or two small, kind suggestions, worded as "you could try…". Never sound harsh.${task === "marking" ? " Mark generously: if the answer shows the key idea, count it as correct, and ignore small spelling or wording slips." : ""}`;
  if (style === "brutal") return `FEEDBACK STYLE — VERY, VERY CRITICAL: Be the toughest examiner possible. Hunt down every single error, however small: spelling, punctuation, grammar, word choice, missing steps, missing units, vague wording, weak reasoning, structure. List them bluntly and explain exactly how to fix each one. No praise at all unless the work is truly flawless. Hold them to a top-of-the-class standard and tell them plainly when the work isn't good enough yet. Stay respectful: criticise the work, never the person, and never be rude, insulting or mean.${task === "marking" ? " Mark extremely strictly, like a strict exam: an answer is only correct if it is complete, precise, uses the right terms and fully matches the example answer's key points; anything vague, incomplete or with a factual slip is wrong." : ""}`;
  if (style === "critical") return `FEEDBACK STYLE — VERY CRITICAL: Be a strict, demanding teacher who pushes the student hard. Point out every mistake and weakness directly and specifically, with how to fix it. Don't sugar-coat and keep praise to a minimum (only for things that are genuinely excellent). Stay respectful: never rude, insulting or mean.${task === "marking" ? " Mark strictly: only count an answer as correct if it is complete, precise and clearly explained; vague or half-right answers are wrong." : ""}`;
  return `FEEDBACK STYLE — BALANCED: Be fair and encouraging: mention what they did well and give clear, specific suggestions to improve.`;
}
function feedbackPickerHTML(note = "") {
  const cur = feedbackStyle();
  return `<div class="fb-style">
    <span class="fb-style-label">AI feedback</span>
    <div class="segmented" role="radiogroup" aria-label="AI feedback style">
      ${Object.entries(FEEDBACK_STYLES).map(([k, v]) => `<button type="button" role="radio" aria-checked="${k === cur}" class="${k === cur ? "active" : ""}" data-fb-style="${k}">${v.label}</button>`).join("")}
    </div>
    ${note ? `<span class="muted small">${note}</span>` : ""}
  </div>`;
}
// One handler for every picker on the page, so they all stay in step.
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-fb-style]");
  if (!btn || !authUser) return;
  store(feedbackStyleKey(), btn.dataset.fbStyle);
  $$("[data-fb-style]").forEach((b) => { const on = b.dataset.fbStyle === btn.dataset.fbStyle; b.classList.toggle("active", on); b.setAttribute("aria-checked", String(on)); });
  toast(`AI feedback: ${FEEDBACK_STYLES[btn.dataset.fbStyle].long}`);
});

// ---------------- Learning level ----------------
// The AI can help with any subject at any level. "Any level" lets it work out the level from what you ask;
// or pick your year level so every explanation, question and piece of feedback is pitched at it.
const LEARN_LEVELS = {
  auto: { label: "✨ Any level (AI works it out)", short: "Any level" },
  p2: { label: "Prep – Year 2", who: "in Prep to Year 2 (about 5–8 years old)", how: "use very simple words, short sentences, everyday examples and lots of encouragement" },
  y34: { label: "Years 3–4", who: "in Year 3 or 4 (about 8–10 years old)", how: "use simple, clear language and fun, relatable examples" },
  y56: { label: "Years 5–6", who: "in Year 5 or 6 (about 10–12 years old)", how: "use clear language and relatable examples, and introduce proper terms gently" },
  y7: { label: "Year 7", who: "in Year 7 (about 12–13 years old)", how: "follow the Victorian Curriculum for Year 7" },
  y8: { label: "Year 8", who: "in Year 8 (about 13–14 years old)", how: "follow the Victorian Curriculum for Year 8" },
  y9: { label: "Year 9", who: "in Year 9 (about 14–15 years old)", how: "follow the Victorian Curriculum for Year 9" },
  y10: { label: "Year 10", who: "in Year 10 (about 15–16 years old)", how: "follow the Victorian Curriculum for Year 10, and prepare them for VCE where it fits" },
  y11: { label: "Year 11 (VCE)", who: "in Year 11, studying VCE (about 16–17 years old)", how: "follow the VCE study designs (Units 1–2): exam-style detail, correct subject terms and well-structured answers" },
  y12: { label: "Year 12 (VCE)", who: "in Year 12, studying VCE (about 17–18 years old)", how: "follow the VCE study designs (Units 3–4): exam-style detail, correct subject terms, and what examiners look for" },
  uni: { label: "University / TAFE", who: "at university or TAFE", how: "assume solid background knowledge, use proper terminology and go into real depth" },
  adult: { label: "Adult learner", who: "an adult learner, who may be new to the topic", how: "be clear and respectful, never talk down, and give real-world examples" },
};
const learnLevelKey = () => `apex-learn-level-${authUser.id}`;
const learnLevel = () => (LEARN_LEVELS[store(learnLevelKey())] ? store(learnLevelKey()) : "auto");
// The site's question bank is Year 7, so it's used on Year 7 or "Any level"; other levels get AI-written tests.
const bankLevel = () => ["auto", "y7"].includes(learnLevel());
// Added to AI prompts so answers suit the student. `fallback` is the level to use on "Any level" when the work
// itself is pitched at a set level (e.g. the Year 7 questions and writing prompts on this site).
function learnerLine(fallback = "") {
  const lvl = LEARN_LEVELS[learnLevel()];
  if (!lvl.who) return fallback
    ? `LEVEL: Pitch everything at about a ${fallback} level, unless the student has said (or it's clear) they're at a different level — then match theirs.`
    : `LEVEL: The student could be at any level: primary school, high school, VCE, university, TAFE or an adult learner. Work out their level from what they ask, how they write and anything they've told you (or that you remember) about their year level or course, and pitch your answer to match. If you can't tell, aim at about a Year 8 level and offer to make it simpler or go deeper. If they ask for a different level ("explain it like I'm in Year 3", "give me VCE-level detail"), do that.`;
  return `LEVEL: The student is ${lvl.who}, in Victoria, Australia. Pitch every explanation, example, question and piece of feedback at that level: ${lvl.how}. If they ask for something simpler or harder, do that.`;
}
// Any learning topic, at any level — used in the open-ended AI chats.
const ANY_SUBJECT = "They can ask about ANY subject or learning topic, at any level: maths (from counting to calculus), English and literature, every science, history, geography, economics, business, legal studies, psychology, health and PE, languages, the arts, music, drama, digital technologies and coding, VCE subjects, uni and TAFE topics, study skills, general knowledge and how things work.";
function levelPickerHTML(note = "") {
  const cur = learnLevel();
  return `<label class="lvl-pick">
    <span class="fb-style-label">🎓 Your level</span>
    <select data-learn-level aria-label="Your learning level">
      ${Object.entries(LEARN_LEVELS).map(([k, v]) => `<option value="${k}"${k === cur ? " selected" : ""}>${v.label}</option>`).join("")}
    </select>
    ${note ? `<span class="muted small">${note}</span>` : ""}
  </label>`;
}
document.addEventListener("change", (e) => {
  const sel = e.target.closest("[data-learn-level]");
  if (!sel || !authUser || !LEARN_LEVELS[sel.value]) return;
  store(learnLevelKey(), sel.value);
  $$("[data-learn-level]").forEach((s) => { s.value = sel.value; });
  toast(`Your level: ${LEARN_LEVELS[sel.value].short || LEARN_LEVELS[sel.value].label}`);
});

// ---------------------------------------------------------------- Test options
// On the two test tabs you can tick several year levels to focus on, and how hard the questions should be.
// No year levels ticked = use "Your level".
const testLevelsKey = () => `apex-test-levels-${authUser.id}`;
const testLevels = () => (store(testLevelsKey()) || []).filter((k) => k !== "auto" && LEARN_LEVELS[k]);
const testDiffKey = () => `apex-test-diff-${authUser.id}`;
const testDiffs = () => { const d = (store(testDiffKey()) || []).filter((x) => [1, 2, 3].includes(x)); return d.length ? d : [1, 2, 3]; };
const levelNames = (list) => list.map((k) => LEARN_LEVELS[k].label).join(", ");
// Pick topics: the question bank is Year 7, so it's used when Year 7 is the only focus (or nothing is ticked and
// your level is Year 7 / Any level). Anything else gets an AI-written test.
const useBank = () => { const lv = testLevels(); return lv.length ? lv.length === 1 && lv[0] === "y7" : bankLevel(); };
// The level instructions for AI-written test questions.
function testLevelLine(fallback = "") {
  const lv = testLevels();
  if (!lv.length) return learnerLine(fallback);
  if (lv.length === 1) { const l = LEARN_LEVELS[lv[0]]; return `LEVEL: Write every question for a student ${l.who}, in Victoria, Australia: ${l.how}.`; }
  return `LEVELS: The student wants a test covering several year levels: ${levelNames(lv)} (Victoria, Australia). Spread the questions evenly across these levels, pitch each question clearly at one of them using the right curriculum for that level, and start each topicName with its level, e.g. "${LEARN_LEVELS[lv[0]].label} – Fractions".`;
}
const testDiffLine = () => { const d = testDiffs(); return d.length === 3 ? "DIFFICULTY: mix easier, medium and harder questions." : `DIFFICULTY: only write ${d.map((x) => DIFF_NAMES[x].toLowerCase()).join(" and ")} questions (for the year level), and set each question's difficulty to match (1 = easy, 2 = medium, 3 = hard).`; };
function testLevelsHTML(note = "") {
  const on = new Set(testLevels());
  return `<div class="test-opt">
    <span class="fb-style-label">🎓 Year levels to focus on</span>
    <div class="checklist test-levels">${Object.entries(LEARN_LEVELS).filter(([k]) => k !== "auto").map(([k, v]) => `<label class="chip-check"><input type="checkbox" data-test-level value="${k}"${on.has(k) ? " checked" : ""}> ${esc(v.label)}</label>`).join("")}</div>
    <span class="muted small">${note || "Tick one or more. Leave them all unticked to use your level."} <span data-test-level-now>${testLevelsNow()}</span></span>
  </div>`;
}
const testLevelsNow = () => { const lv = testLevels(); return lv.length ? `Focusing on: <b>${esc(levelNames(lv))}</b>.` : `Using your level: <b>${esc(LEARN_LEVELS[learnLevel()].short || LEARN_LEVELS[learnLevel()].label)}</b>.`; };
function testDiffHTML() {
  const on = new Set(testDiffs());
  return `<div class="test-opt">
    <span class="fb-style-label">💪 How hard</span>
    <div class="checklist">${[1, 2, 3].map((d) => `<label class="chip-check"><input type="checkbox" data-test-diff value="${d}"${on.has(d) ? " checked" : ""}> ${DIFF_NAMES[d]}</label>`).join("")}</div>
  </div>`;
}
document.addEventListener("change", (e) => {
  if (!authUser) return;
  if (e.target.matches("[data-test-level]")) {
    const lv = [...new Set($$("[data-test-level]:checked").map((b) => b.value))];
    store(testLevelsKey(), lv);
    $$("[data-test-level]").forEach((b) => { b.checked = lv.includes(b.value); });
    $$("[data-test-level-now]").forEach((el) => { el.innerHTML = testLevelsNow(); });
  }
  if (e.target.matches("[data-test-diff]")) {
    let d = [...new Set($$("[data-test-diff]:checked").map((b) => +b.value))];
    if (!d.length) { e.target.checked = true; d = [+e.target.value]; toast("Pick at least one difficulty."); }
    store(testDiffKey(), d);
    $$("[data-test-diff]").forEach((b) => { b.checked = d.includes(+b.value); });
  }
});

function writingFeedbackPrompt(t, piece) {
  const s = piece.settings || {};
  const text = writingText(piece);
  const target = s.target ? ` They were aiming for about ${s.target} words and wrote ${countWords(text)}.` : "";
  if (t.special === "creative-writing") {
    return `You are an English teacher marking a piece of creative writing. The writing prompt was: "${piece.prompt}".${target}

Here is the student's writing:
"""
${text}
"""

Give feedback a teacher would give on a creative writing piece, covering:
1. Punctuation and capital letters — point out any missing or incorrect ones with brief examples.
2. Spelling — flag any misspelled words.
3. Sentence variety and flow — are sentences too repetitive or choppy?
4. Word choice — suggest a few stronger or more interesting words to replace plain ones.
5. Things they did well.
6. One clear, specific suggestion for how to improve the piece overall.

Keep it specific and easy for the student to understand. Use short paragraphs or a simple list, not markdown formatting.
${learnerLine("Year 7")}

${feedbackTone()}`;
  }
  const type = ESSAY_TYPES[s.essayType] || ESSAY_TYPES.persuasive;
  return `You are an English teacher marking a piece of essay writing. The essay prompt was: "${piece.prompt}"

The student chose to write a ${type.label.toLowerCase()} essay (${type.hint})${s.side === "for" ? ", arguing FOR the topic" : s.side === "against" ? ", arguing AGAINST the topic" : ""}, with an introduction, ${s.paragraphs || 3} body paragraph${s.paragraphs === 1 ? "" : "s"} and a conclusion.${target}

Here is the student's essay:
"""
${text}
"""

Give feedback a teacher would give on an essay, covering:
1. Structure — did they follow the structure they chose (introduction, ${s.paragraphs || 3} body paragraph${s.paragraphs === 1 ? "" : "s"}, conclusion)?
2. Thesis/argument — is their position or main point clear and consistent, and does it suit a ${type.label.toLowerCase()} essay?
3. Paragraphing — does each paragraph focus on one main idea, with a topic sentence?
4. Evidence and reasoning — do they support their points with examples or reasons, not just opinions?
5. Punctuation, capital letters, and spelling — point out any clear errors with brief examples.
6. Sentence variety and word choice — suggest a few stronger words or sentence structures.
7. Things they did well.
8. One clear, specific suggestion for how to improve the essay overall.

Keep it specific and easy for the student to understand. Use short paragraphs or a simple list, not markdown formatting.
${learnerLine("Year 7")}

${feedbackTone()}`;
}

const DEFAULT_WRITING_SETTINGS = {
  "essay-writing": { essayType: "persuasive", paragraphs: 3, target: 350, planMinutes: 10, writeMinutes: 30, planner: true },
  "creative-writing": { target: 300, planMinutes: 5, writeMinutes: 20 },
};

// A countdown with Start/Pause, −1 / +1 minute and Reset. Renders into `el`.
function makeTimer(el, minutes, { label = "", doneMessage = "Time's up!" } = {}) {
  let total = minutes * 60;
  let left = total;
  let interval = null;
  el.innerHTML = `
    <div class="timer-box">
      ${label ? `<span class="muted small">${esc(label)}</span>` : ""}
      <span class="timer" data-t="clock"></span>
      <button class="btn ghost sm" data-t="minus" title="One minute less">−1</button>
      <button class="btn secondary sm" data-t="toggle">Start</button>
      <button class="btn ghost sm" data-t="plus" title="One minute more">+1</button>
      <button class="btn ghost sm" data-t="reset" title="Reset">↺</button>
    </div>`;
  const q = (k) => $(`[data-t="${k}"]`, el);
  const draw = () => {
    q("clock").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    q("clock").classList.toggle("low", left <= 60);
    q("toggle").textContent = interval ? "Pause" : left === total ? "Start" : left === 0 ? "Done" : "Resume";
  };
  const stop = () => { clearInterval(interval); interval = null; draw(); };
  q("toggle").addEventListener("click", () => {
    if (interval) return stop();
    if (left === 0) return;
    interval = setInterval(() => {
      left = Math.max(0, left - 1);
      if (left === 0) { stop(); toast(doneMessage); }
      draw();
    }, 1000);
    draw();
  });
  q("minus").addEventListener("click", () => { left = Math.max(0, left - 60); total = Math.max(60, total - 60); draw(); });
  q("plus").addEventListener("click", () => { left += 60; total += 60; draw(); });
  q("reset").addEventListener("click", () => { stop(); total = minutes * 60; left = total; draw(); });
  draw();
  return { stop };
}

function planFields(t, piece) {
  const s = piece.settings || {};
  if (t.special === "essay-writing") {
    const n = s.paragraphs || 3;
    return [
      { key: "thesis", label: "Your thesis (main argument)", hint: s.side === "against" ? "In one sentence: why you disagree." : s.side === "for" ? "In one sentence: why you agree." : "In one sentence: your overall view." },
      ...Array.from({ length: n }, (_, i) => ({ key: `body${i + 1}`, label: `Body paragraph ${i + 1}`, hint: "The main point, and the evidence or example you'll use." })),
      { key: "conclusion", label: "Conclusion", hint: "How you'll sum up, and your final thought." },
    ];
  }
  return [
    { key: "character", label: "Main character", hint: "Who are they? What do they want?" },
    { key: "setting", label: "Setting", hint: "Where and when? What does it look, sound and feel like?" },
    { key: "problem", label: "The problem", hint: "What goes wrong or changes?" },
    { key: "climax", label: "Climax", hint: "The most tense moment." },
    { key: "ending", label: "Ending", hint: "How is it resolved?" },
  ];
}

function pageWriting(view, t) {
  const isEssay = t.special === "essay-writing";
  const settingsKey = `apex-writing-settings-${t.special}`;
  const saved = store(settingsKey) || {};
  if (saved.minutes && !saved.writeMinutes) saved.writeMinutes = saved.minutes; // older single-timer setting
  const settings = { ...DEFAULT_WRITING_SETTINGS[t.special], ...saved };

  // One-time move of the old single draft into the saved-writing list.
  const oldDraftKey = `apex-draft-${authUser.id}-${t.id}`;
  const oldDraft = store(oldDraftKey);
  if (oldDraft?.text) {
    const now = new Date().toISOString();
    saveWriting({ id: newId(), topicId: t.id, prompt: oldDraft.prompt, text: oldDraft.text, stage: "write", settings: { ...settings, planner: false }, createdAt: now });
  }
  if (oldDraft) store(oldDraftKey, null);

  view.innerHTML = `
    <a class="back" href="#/practice">← All topics</a>
    <div class="page-head"><h1>${t.icon} ${esc(t.name)}</h1><p>${esc(t.recap || "")}</p></div>
    ${lessonHTML(t.id) ? `
      <details class="card" style="margin-bottom:16px;">
        <summary>📖 How to write ${isEssay ? "a strong essay" : "a great story"}</summary>
        <div class="stack" style="margin-top:12px;">${lessonHTML(t.id, { flat: true })}${videosHTML(t)}</div>
      </details>` : ""}
    <div class="segmented" id="w-tabs" style="margin-bottom:16px;">
      <button type="button" data-tab="new">✏️ New piece</button>
      <button type="button" data-tab="mine">📁 My writing <span id="w-count"></span></button>
    </div>
    <div id="writing"></div>`;
  const root = $("#writing", view);
  const setTab = (name) => $$("#w-tabs button", view).forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  const leaveStage = () => { if (cleanup) { cleanup(); cleanup = null; } };
  $$("#w-tabs button", view).forEach((b) => b.addEventListener("click", () => {
    leaveStage();
    b.dataset.tab === "new" ? setup() : mine();
  }));
  const refreshCount = async () => {
    const n = (await listWritings(t.id)).length;
    const el = $("#w-count", view);
    if (el) el.textContent = n ? `(${n})` : "";
  };

  const option = (value, label, current) => `<option value="${value}" ${String(value) === String(current) ? "selected" : ""}>${label}</option>`;
  // A minutes picker with preset choices plus "Custom…" that reveals a number box.
  const minutesPicker = (id, label, presets, current, noneLabel) => {
    const isCustom = current && !presets.includes(current);
    return `
      <div><label class="field" for="${id}">${label}</label>
        <select id="${id}">
          ${noneLabel ? option(0, noneLabel, current) : ""}
          ${presets.map((n) => option(n, `${n} minutes`, current)).join("")}
          <option value="custom" ${isCustom ? "selected" : ""}>Custom…</option>
        </select>
        <input type="number" id="${id}-custom" min="1" max="180" value="${isCustom ? current : ""}" placeholder="Minutes" class="${isCustom ? "" : "hidden"}" style="margin-top:6px;">
      </div>`;
  };

  // ----- Set up -----
  function setup() {
    setTab("new");
    root.innerHTML = `
      <div class="card stack">
        <h3>1. Set it up</h3>
        <div class="grid settings-grid">
          ${isEssay ? `
            <div><label class="field" for="s-type">Essay type</label>
              <select id="s-type">${Object.entries(ESSAY_TYPES).map(([k, v]) => option(k, v.label, settings.essayType)).join("")}</select>
              <div class="muted small" id="s-type-hint" style="margin-top:4px;"></div></div>
            <div><label class="field" for="s-paras">Body paragraphs</label>
              <select id="s-paras">${[1, 2, 3, 4, 5, 6].map((n) => option(n, n, settings.paragraphs)).join("")}</select></div>` : ""}
          <div><label class="field" for="s-target">Target length</label>
            <select id="s-target">${option(0, "No target", settings.target)}${[150, 250, 300, 350, 500, 750, 1000].map((n) => option(n, `${n} words`, settings.target)).join("")}</select></div>
          ${minutesPicker("s-plan", "Planning time", [3, 5, 10, 15], settings.planMinutes, "Skip planning")}
          ${minutesPicker("s-write", "Writing time", [10, 15, 20, 30, 45, 60], settings.writeMinutes || DEFAULT_WRITING_SETTINGS[t.special].writeMinutes, null)}
        </div>
        ${isEssay ? `
          <label class="small" style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" id="s-planner" ${settings.planner ? "checked" : ""}>
            Write in paragraph boxes (a separate box for the introduction, each body paragraph and the conclusion)
          </label>` : ""}
      </div>
      <div class="card stack" style="margin-top:16px;">
        <h3>2. Pick a prompt</h3>
        <div class="prompt-list">${t.prompts.map((p, i) => `<button type="button" data-i="${i}">${esc(p)}</button>`).join("")}</div>
        <div>
          <label class="field" for="own-prompt">Or write your own</label>
          <div class="row" style="flex-wrap:nowrap;">
            <input type="text" id="own-prompt" placeholder="Your own prompt…">
            <button class="btn" id="own-go">Start</button>
          </div>
        </div>
      </div>`;

    const readMinutes = (id) => {
      const sel = $(`#${id}`, root).value;
      $(`#${id}-custom`, root).classList.toggle("hidden", sel !== "custom");
      if (sel !== "custom") return +sel;
      return Math.max(1, Math.min(180, parseInt($(`#${id}-custom`, root).value, 10) || 0)) || 0;
    };
    const readSettings = () => {
      if (isEssay) {
        settings.essayType = $("#s-type", root).value;
        settings.paragraphs = +$("#s-paras", root).value;
        settings.planner = $("#s-planner", root).checked;
        $("#s-type-hint", root).textContent = `You ${ESSAY_TYPES[settings.essayType].hint}${settings.essayType === "persuasive" ? " — you'll pick for or against" : ""}.`;
      }
      settings.target = +$("#s-target", root).value;
      settings.planMinutes = readMinutes("s-plan");
      settings.writeMinutes = readMinutes("s-write");
      store(settingsKey, settings);
    };
    $$("select, input", root).forEach((el) => el.addEventListener("change", readSettings));
    $$("input[type=number]", root).forEach((el) => el.addEventListener("input", readSettings));
    readSettings();

    const start = (prompt) => {
      readSettings();
      const s = { ...settings };
      const piece = {
        id: newId(), topicId: t.id, prompt, settings: s, plan: {}, feedback: "",
        stage: s.planMinutes ? "plan" : "write", createdAt: new Date().toISOString(),
      };
      if (isEssay && s.planner) piece.parts = Array(s.paragraphs + 2).fill("");
      else piece.text = "";
      if (isEssay && s.essayType === "persuasive") return chooseSide(piece);
      if (isEssay && s.essayType === "discussion") piece.settings.side = "both";
      open(piece, { isNew: true });
    };
    $$(".prompt-list button", root).forEach((b) => b.addEventListener("click", () => start(t.prompts[+b.dataset.i])));
    $("#own-go", root).addEventListener("click", () => {
      const p = $("#own-prompt", root).value.trim();
      if (p) start(p);
    });
  }

  // ----- Persuasive essays: pick a side -----
  function chooseSide(piece) {
    root.innerHTML = `
      <div class="card stack" style="text-align:center;">
        <div class="writing-prompt">${esc(piece.prompt)}</div>
        <p class="muted" style="margin:0;">Which side will you argue? You'll get 4 strong pieces of evidence for each side to help you plan.</p>
        <div class="side-pick">
          <button class="btn" data-side="for">👍 For</button>
          <button class="btn secondary" data-side="against">👎 Against</button>
        </div>
        <button class="btn ghost" id="side-back">← Pick a different prompt</button>
      </div>`;
    $$("[data-side]", root).forEach((b) => b.addEventListener("click", () => {
      piece.settings.side = b.dataset.side;
      open(piece, { isNew: true });
    }));
    $("#side-back", root).addEventListener("click", setup);
  }

  // Asks the tutor for 4 pieces of evidence on each side of the prompt.
  async function fetchEvidence(prompt) {
    const raw = await askTutor(`A student is writing an essay on this topic:
"${prompt}"

Give exactly 4 strong pieces of evidence FOR the statement/position and exactly 4 strong pieces of evidence AGAINST it. If the topic isn't really a for/against question, interpret "for" as supporting the main idea and "against" as challenging it.

For each piece give:
- "point": one or two sentences the student can understand and use in a paragraph — a clear reason backed by a concrete example, fact or real-world situation. Only use well-known, accurate facts; don't invent statistics or studies.
- "source": the real organisation, official body or well-known publication most associated with this information (prefer Australian ones where they fit, e.g. Australian Bureau of Statistics, eSafety Commissioner, Australian Institute of Health and Welfare, Raising Children Network; otherwise e.g. World Health Organization, UNICEF). Name the organisation only.
- "expert": one sentence paraphrasing what professionals in this field generally say, e.g. "Paediatric sleep researchers recommend…". Describe the type of expert — never name a specific person and never use quotation marks.
- "search": a short web search phrase (5–8 words) a student could use to find this information from that source.

Never invent URLs, page titles, people's names or direct quotes.
${learnerLine("Year 7")}

Respond with ONLY valid JSON, no other text, in exactly this format:
{"for": [{"point": "...", "source": "...", "expert": "...", "search": "..."}, ...4 items], "against": [...4 items in the same format]}`);
    const json = raw.replace(/```json/gi, "").replace(/```/g, "");
    const parsed = JSON.parse(json.slice(json.indexOf("{"), json.lastIndexOf("}") + 1));
    const item = (x) => (typeof x === "string"
      ? { point: x.trim() }
      : { point: String(x?.point || "").trim(), source: String(x?.source || "").trim(), expert: String(x?.expert || "").trim(), search: String(x?.search || "").trim() });
    const clean = (arr) => (Array.isArray(arr) ? arr.map(item).filter((x) => x.point).slice(0, 4) : []);
    const evidence = { for: clean(parsed.for), against: clean(parsed.against) };
    if (!evidence.for.length || !evidence.against.length) throw new Error("Missing evidence");
    return evidence;
  }

  // ----- Shared by both stages -----
  function open(piece, { isNew = false } = {}) {
    setTab("new");
    leaveStage();
    (piece.stage === "plan" ? planStage : writeStage)(piece, { isNew });
  }

  // Wires autosave for a stage; returns { scheduleSave, saveNow, setState }.
  function autosave(piece, isNew) {
    let timer = null;
    const setState = (text) => { const el = $("#save-state", root); if (el) el.textContent = text; };
    const hasContent = () => countWords(writingText(piece)) || Object.values(piece.plan || {}).some((v) => String(v).trim()) || piece.feedback;
    const saveNow = async () => {
      clearTimeout(timer);
      timer = null;
      if (!hasContent()) return;
      await saveWriting(piece);
      setState(cloudWritings ? "Saved ✓" : "Saved on this device ✓");
      refreshCount();
    };
    const scheduleSave = () => { setState("Saving…"); clearTimeout(timer); timer = setTimeout(saveNow, 800); };
    setState(isNew ? "" : "Saved ✓");
    return { scheduleSave, saveNow, pending: () => !!timer };
  }

  function evidenceBank(piece, saver, { open: isOpen }) {
    const s = piece.settings || {};
    if (!s.side) return;
    const host = $("#evidence-host", root);
    host.innerHTML = `<details class="evidence" ${isOpen ? "open" : ""}><summary>🧾 Evidence bank</summary><div id="evidence"></div></details>`;
    const box = $("#evidence", host);
    const draw = (state) => {
      if (state === "loading") { box.innerHTML = `<p class="muted small">Finding evidence for both sides…</p>`; return; }
      if (state === "error") {
        box.innerHTML = `<p class="muted small">Couldn't load evidence right now. <button class="btn ghost sm" id="ev-retry">Try again</button></p>`;
        $("#ev-retry", box).addEventListener("click", load);
        return;
      }
      const col = (side, title) => `
        <div class="ev-col ${s.side === side ? "mine" : ""}">
          <strong>${title}${s.side === side ? " — your side" : ""}</strong>
          <ol>${piece.evidence[side].map(evidenceItemHTML).join("")}</ol>
        </div>`;
      const old = [...piece.evidence.for, ...piece.evidence.against].some((e) => typeof e === "string");
      box.innerHTML = `
        ${old ? `<p class="small banner info" style="margin:10px 0 0;">This evidence was made before sources were added. Click <strong>↻ New evidence</strong> to get sources and Check it links.</p>` : ""}
        <div class="ev-grid">${col("for", "👍 For")}${col("against", "👎 Against")}</div>
        <div class="row between" style="margin-top:8px; flex-wrap:nowrap; align-items:flex-start;">
          <p class="muted small" style="margin:0;">Tip: use your side's evidence in your body paragraphs, and knock down the strongest point from the other side. Evidence is written by AI — click "Check it" to find the real source before you quote it.</p>
          <button class="btn ghost sm" id="ev-new" title="Get different evidence">↻ New evidence</button>
        </div>`;
      $("#ev-new", box).addEventListener("click", () => {
        if (confirm("Replace this evidence with a new set?")) load();
      });
    };
    async function load() {
      draw("loading");
      try {
        piece.evidence = await fetchEvidence(piece.prompt);
        if (!document.body.contains(box)) return;
        draw();
        saver.saveNow();
      } catch (err) {
        console.error("Apex: evidence request failed —", err);
        if (document.body.contains(box)) draw("error");
      }
    }
    piece.evidence ? draw() : load();
  }

  // Evidence items are { point, source, expert, search } (older pieces stored plain strings).
  function evidenceItemHTML(e) {
    if (typeof e === "string") return `<li>${esc(e)}</li>`;
    const query = encodeURIComponent([e.source, e.search || e.point].filter(Boolean).join(" "));
    return `<li>
      <div>${esc(e.point)}</div>
      ${e.source ? `<div class="ev-meta">📚 Source: ${esc(e.source)} · <a href="https://www.google.com/search?q=${query}" target="_blank" rel="noopener">Check it ↗</a></div>` : ""}
      ${e.expert ? `<div class="ev-meta">🎓 ${esc(e.expert)}</div>` : ""}
    </li>`;
  }

  const summaryTags = (piece) => {
    const s = piece.settings || {};
    return [
      isEssay ? `${(ESSAY_TYPES[s.essayType] || ESSAY_TYPES.persuasive).label} essay` : "",
      isEssay ? `${s.paragraphs} body paragraph${s.paragraphs === 1 ? "" : "s"}` : "",
      s.side === "for" ? "Arguing FOR" : s.side === "against" ? "Arguing AGAINST" : "",
      s.target ? `aim for ${s.target} words` : "",
    ].filter(Boolean).map((x) => `<span class="tag">${esc(x)}</span>`).join("");
  };
  // Plan / Write switcher shown on every piece, so older pieces can still be planned.
  const stepper = (active) => `
    <div class="stepper">
      <button type="button" data-stage="plan" class="${active === "plan" ? "on" : ""}">1. Plan</button>
      <button type="button" data-stage="write" class="${active === "write" ? "on" : ""}">2. Write</button>
    </div>`;
  const wireStepper = (piece, saver) => $$("[data-stage]", root).forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.stage === piece.stage) return;
    piece.stage = b.dataset.stage;
    saver.saveNow();
    open(piece);
  }));

  // ----- Stage 1: plan -----
  function planStage(piece, { isNew }) {
    piece.stage = "plan";
    piece.plan ||= {};
    const s = piece.settings || {};
    const fields = planFields(t, piece);
    root.innerHTML = `
      <div class="card stack">
        ${stepper("plan")}
        <div>
          <div class="writing-prompt">${esc(piece.prompt)}</div>
          <div class="row" style="gap:6px; margin-top:8px;">${summaryTags(piece)}</div>
        </div>
        <div class="row between"><div id="timer-host"></div><span class="muted small" id="save-state"></span></div>
        <div id="evidence-host"></div>
        <div class="plan-grid">
          ${fields.map((f) => `
            <div>
              <label class="field" for="plan-${f.key}">${esc(f.label)}</label>
              <div class="muted small" style="margin-bottom:6px;">${esc(f.hint)}</div>
              <textarea id="plan-${f.key}" data-plan="${f.key}" rows="3"></textarea>
            </div>`).join("")}
        </div>
        <div class="row between">
          <button class="btn ghost" id="back">← My writing</button>
          <button class="btn" id="to-write">Start writing →</button>
        </div>
      </div>`;

    const saver = autosave(piece, isNew);
    const timer = makeTimer($("#timer-host", root), s.planMinutes || 5, { label: "Planning", doneMessage: "Planning time's up! Start writing when you're ready." });
    cleanup = () => { timer.stop(); if (saver.pending()) saver.saveNow(); };
    evidenceBank(piece, saver, { open: true });
    wireStepper(piece, saver);

    $$("[data-plan]", root).forEach((box) => {
      box.value = piece.plan[box.dataset.plan] || "";
      box.addEventListener("input", () => { piece.plan[box.dataset.plan] = box.value; saver.scheduleSave(); });
    });
    $("[data-plan]", root).focus();
    $("#back", root).addEventListener("click", () => { leaveStage(); mine(); });
    $("#to-write", root).addEventListener("click", () => {
      piece.stage = "write";
      saver.saveNow();
      open(piece);
    });
  }

  // ----- Stage 2: write -----
  function writeStage(piece, { isNew }) {
    piece.stage = "write";
    const s = piece.settings || {};
    const planEntries = planFields(t, piece).filter((f) => String(piece.plan?.[f.key] || "").trim());
    const partLabel = (i, n) => (i === 0 ? "Introduction" : i === n - 1 ? "Conclusion" : `Body paragraph ${i}`);
    const partHint = (i, n) => (i === 0
      ? "Hook the reader, give some background, and state your main argument (thesis)."
      : i === n - 1
        ? "Restate your thesis in new words, sum up your points, and finish with a strong final thought."
        : "Topic sentence → Explain → Evidence (an example or fact) → Link back to your thesis.");

    root.innerHTML = `
      <div class="card stack">
        ${stepper("write")}
        <div>
          <div class="writing-prompt">${esc(piece.prompt)}</div>
          <div class="row" style="gap:6px; margin-top:8px;">${summaryTags(piece)}</div>
        </div>
        <div class="row between"><div id="timer-host"></div><span class="muted small" id="save-state"></span></div>
        ${planEntries.length ? `
          <details class="evidence" open><summary>🗺️ Your plan</summary>
            <dl class="plan-view">${planEntries.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(piece.plan[f.key])}</dd>`).join("")}</dl>
          </details>` : ""}
        <div id="evidence-host"></div>
        <div id="editor-area">
          ${piece.parts
            ? piece.parts.map((_, i) => `
                <div class="planner-part">
                  <label class="field" for="part-${i}">${partLabel(i, piece.parts.length)}</label>
                  <div class="muted small" style="margin-bottom:6px;">${partHint(i, piece.parts.length)}</div>
                  <textarea id="part-${i}" data-part="${i}" rows="5"></textarea>
                </div>`).join("")
            : `<textarea class="editor" id="editor" placeholder="Start writing…"></textarea>`}
        </div>
        <div>
          <div class="row between small"><span id="words"></span><span class="muted" id="target-note"></span></div>
          ${s.target ? `<div class="bar" style="margin-top:6px;"><span id="target-bar"></span></div>` : ""}
        </div>
        <div class="row between">
          <div class="row">
            <button class="btn ghost" id="back">← My writing</button>
            <button class="btn ghost" id="to-plan">← Back to plan</button>
          </div>
          <div class="row">
            <button class="btn secondary" id="copy">Copy text</button>
            <button class="btn" id="get-fb">Get AI feedback</button>
          </div>
        </div>
        ${feedbackPickerHTML()}
        <div id="fb" class="explain ${piece.feedback ? "" : "hidden"}"></div>
        <div id="chat-host"></div>
      </div>`;

    const saver = autosave(piece, isNew);
    // Always show a writing timer; older pieces only stored a single `minutes` value.
    const writeMinutes = s.writeMinutes || s.minutes || DEFAULT_WRITING_SETTINGS[t.special].writeMinutes;
    const timer = makeTimer($("#timer-host", root), writeMinutes, { label: "Writing", doneMessage: "Time's up! Finish your sentence and get feedback." });
    cleanup = () => { timer.stop(); if (saver.pending()) saver.saveNow(); };
    evidenceBank(piece, saver, { open: !planEntries.length });
    wireStepper(piece, saver);

    const boxes = piece.parts ? $$("[data-part]", root) : [$("#editor", root)];
    if (piece.parts) boxes.forEach((b, i) => { b.value = piece.parts[i] || ""; });
    else boxes[0].value = piece.text || "";
    if (piece.feedback) $("#fb", root).textContent = piece.feedback;
    boxes[0].focus();

    const drawWords = () => {
      const n = countWords(writingText(piece));
      $("#words", root).textContent = `${n} words`;
      if (s.target) {
        $("#target-note", root).textContent = n >= s.target ? "Target reached ✓" : `${s.target - n} to go`;
        $("#target-bar", root).style.width = Math.min(100, Math.round((n / s.target) * 100)) + "%";
      }
    };
    drawWords();
    boxes.forEach((b) => b.addEventListener("input", () => {
      if (piece.parts) piece.parts = boxes.map((x) => x.value);
      else piece.text = boxes[0].value;
      drawWords();
      saver.scheduleSave();
    }));

    $("#back", root).addEventListener("click", () => { leaveStage(); mine(); });
    $("#to-plan", root).addEventListener("click", () => { piece.stage = "plan"; saver.saveNow(); open(piece); });
    $("#copy", root).addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(writingText(piece)); toast("Copied to clipboard"); }
      catch (e) { toast("Couldn't copy — select the text and copy it instead."); }
    });
    $("#get-fb", root).addEventListener("click", async () => {
      if (countWords(writingText(piece)) < 15) return toast("Write a few more sentences first.");
      const btn = $("#get-fb", root);
      const box = $("#fb", root);
      btn.disabled = true;
      btn.textContent = "Reading…";
      show(box);
      box.textContent = "Reading your writing…";
      try {
        piece.feedback = await askTutor(writingFeedbackPrompt(t, piece));
        box.textContent = piece.feedback;
        await saver.saveNow();
        const chatBox = $("#chat-details", root);
        if (chatBox && !chatBox.open) { chatBox.open = true; chatBox.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
      } catch (err) {
        console.error(err);
        box.textContent = err.userMessage || "Couldn't get feedback right now — try again in a moment.";
      }
      if (document.body.contains(btn)) { btn.disabled = false; btn.textContent = "Get AI feedback"; }
    });
    writingChat(piece, saver);
  }

  // ----- Chat with the AI about this piece -----
  function writingChat(piece, saver) {
    piece.chat ||= [];
    const kind = isEssay ? "essay" : "story";
    const host = $("#chat-host", root);
    host.innerHTML = `
      <details class="evidence" id="chat-details" open>
        <summary>💬 Chat with the AI about your ${kind}</summary>
        <div class="chat" id="w-chat" style="min-height:120px; margin-top:10px;"></div>
        <form class="chat-form" id="w-chat-form" autocomplete="off">
          <textarea class="chat-input" rows="1" id="w-chat-input" placeholder="Ask about your ${kind}…"></textarea>
          <button class="btn" type="submit" id="w-chat-send">Send</button>
        </form>
        ${piece.chat.length ? `<button class="btn ghost sm" id="w-chat-clear" style="margin-top:6px;">Clear chat</button>` : ""}
      </details>`;
    const log = $("#w-chat", host);
    const suggestions = isEssay
      ? ["Is my argument convincing?", "How can I make my introduction stronger?", "Which paragraph is weakest, and why?", "Explain my feedback in simpler words"]
      : ["What's the best part of my story?", "How can I make my opening more exciting?", "Where should I add more description?", "Explain my feedback in simpler words"];

    const draw = () => {
      if (!piece.chat.length) {
        log.innerHTML = `<div class="chat-empty small">Ask anything about your ${kind} — the AI has read it${piece.feedback ? " and your feedback" : ""}.
          <div class="chips">${suggestions.map((x) => `<button type="button" class="btn secondary sm">${esc(x)}</button>`).join("")}</div></div>`;
        $$(".chips button", log).forEach((b) => b.addEventListener("click", () => send(b.textContent)));
        return;
      }
      log.innerHTML = piece.chat.map((m) => `<div class="bubble ${m.role}">${esc(m.text)}</div>`).join("");
      log.scrollTop = log.scrollHeight;
    };

    const buildPrompt = (question) => {
      const st = piece.settings || {};
      const setup = isEssay
        ? `a ${(ESSAY_TYPES[st.essayType] || ESSAY_TYPES.persuasive).label.toLowerCase()} essay${st.side === "for" ? " arguing FOR" : st.side === "against" ? " arguing AGAINST" : ""} with ${st.paragraphs || 3} body paragraphs`
        : "a creative story";
      const history = piece.chat.slice(-10).map((m) => `${m.role === "me" ? "Student" : "Tutor"}: ${m.text}`).join("\n");
      return `You are an English tutor chatting with a student about their own writing. Help them understand and improve it: answer their questions, explain feedback, point to specific sentences, and suggest concrete improvements with short examples (a sentence or two at most). Do NOT rewrite whole paragraphs or the whole piece for them — guide them to make the changes themselves. Keep replies under 150 words, clear, with no markdown formatting.
${learnerLine("Year 7")}
${feedbackTone()}

The student is writing ${setup}. The prompt was: "${piece.prompt}"

Their ${kind} so far:
"""
${writingText(piece) || "(nothing written yet)"}
"""
${piece.feedback ? `
Feedback they were given earlier:
"""
${piece.feedback}
"""
` : ""}
${history ? `Conversation so far:\n${history}\n` : ""}Student: ${question}
Tutor:`;
    };

    async function send(question) {
      question = question.trim();
      if (!question) return;
      const input = $("#w-chat-input", host);
      const btn = $("#w-chat-send", host);
      const prompt = buildPrompt(question);
      piece.chat.push({ role: "me", text: question });
      const pending = { role: "bot", text: "Thinking…" };
      piece.chat.push(pending);
      input.value = "";
      btn.disabled = true;
      draw();
      try {
        pending.text = await askTutor(prompt);
      } catch (err) {
        console.error(err);
        piece.chat.pop();
        piece.chat.push({ role: "err", text: err.userMessage || "Sorry, I couldn't reach the tutor. Please try again in a moment." });
      }
      if (!document.body.contains(log)) return;
      piece.chat = piece.chat.filter((m) => m.role !== "err" || m === piece.chat[piece.chat.length - 1]);
      draw();
      btn.disabled = false;
      input.focus();
      saver.saveNow();
    }

    $("#w-chat-form", host).addEventListener("submit", (e) => { e.preventDefault(); send($("#w-chat-input", host).value); });
    $("#w-chat-clear", host)?.addEventListener("click", () => {
      if (!confirm("Clear this chat?")) return;
      piece.chat = [];
      saver.saveNow();
      writingChat(piece, saver);
    });
    draw();
  }

  // ----- My writing list -----
  async function mine() {
    setTab("mine");
    root.innerHTML = `<div class="card"><p class="muted">Loading…</p></div>`;
    const pieces = await listWritings(t.id);
    refreshCount();
    if (!document.body.contains(root)) return;
    if (!pieces.length) {
      root.innerHTML = `<div class="card"><p class="muted" style="margin:0;">Nothing saved yet. Start a new piece and it will save here automatically.</p></div>`;
      return;
    }
    root.innerHTML = `<div class="card">${pieces.map((p) => {
      const s = p.settings || {};
      const words = countWords(writingText(p));
      const bits = [
        fmtDate(p.updatedAt || p.createdAt),
        `${words} word${words === 1 ? "" : "s"}${s.target ? ` / ${s.target}` : ""}`,
        isEssay && s.essayType ? `${(ESSAY_TYPES[s.essayType] || {}).label}${s.side === "for" ? " (for)" : s.side === "against" ? " (against)" : ""} · ${s.paragraphs} body ¶` : "",
      ].filter(Boolean);
      return `
        <div class="list-row">
          <div class="grow">
            <strong>${esc(p.prompt)}</strong>
            <div class="muted small">${bits.map(esc).join(" · ")}
              ${p.stage === "plan" ? `<span class="tag">Planning</span>` : ""}
              ${p.feedback ? `<span class="tag good">Has feedback</span>` : ""}</div>
          </div>
          <button class="btn secondary sm" data-piece="${p.id}">Open</button>
          <button class="btn ghost sm" data-del="${p.id}" title="Delete">Delete</button>
        </div>`;
    }).join("")}</div>`;
    $$("[data-piece]", root).forEach((b) => b.addEventListener("click", () => open(pieces.find((p) => p.id === b.dataset.piece))));
    $$("[data-del]", root).forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this piece? This can't be undone.")) return;
      await deleteWriting(b.dataset.del);
      mine();
    }));
  }

  refreshCount();
  setup();
}

// ---------------- Test ----------------
// ---------------- Test & study ----------------
// Four ways in: a test from the question bank, plus three AI modes from js/study.js —
// an AI-built test, flashcards, and info & ideas pages, each with a full chat.
let testMode = "pick";
const TEST_MODES = [
  { id: "pick", icon: "🧩", name: "Pick topics" },
  { id: "chat", icon: "💬", name: "AI test" },
  { id: "cards", icon: "🃏", name: "Flashcards" },
  { id: "info", icon: "💡", name: "Info & ideas" },
  { id: "public", icon: "🌍", name: "Public tests" },
];
let switchStudyMode = null; // set while the Test page is showing

// #/test/public/<id> opens Public tests with that test at the top (for shared links).
function pageTest(view, arg, focusId) {
  if (arg === "public") testMode = "public";
  view.innerHTML = `
    <div class="page-head"><h1>Test & study</h1><p>Build a test, chat with the AI, make flashcards, or get info and ideas on anything.</p></div>
    <div class="mode-grid" id="t-mode" role="tablist">
      ${TEST_MODES.map((m) => `<button type="button" role="tab" class="mode-btn" data-mode="${m.id}"><span class="mode-ico">${m.icon}</span><span class="mode-txt"><b>${m.name}</b>${m.text ? `<small>${m.text}</small>` : ""}</span></button>`).join("")}
    </div>
    <div id="mode-host"></div>`;
  const host = $("#mode-host", view);
  const openMode = (id) => {
    testMode = id;
    $$("#t-mode .mode-btn", view).forEach((b) => { const on = b.dataset.mode === id; b.classList.toggle("active", on); b.setAttribute("aria-selected", String(on)); });
    host.innerHTML = "";
    ({ pick: pickBuilder, chat: aiTestMode, cards: flashcardsMode, info: infoMode, public: (v, h) => publicTestsMode(v, h, focusId) })[id](view, host);
  };
  switchStudyMode = openMode;
  $$("#t-mode .mode-btn", view).forEach((b) => b.addEventListener("click", () => openMode(b.dataset.mode)));
  openMode(TEST_MODES.some((m) => m.id === testMode) ? testMode : "pick");
}

// A test from the question bank (optionally rewritten by the AI from example questions).
function pickBuilder(view, host) {
  const checklist = (topics) => topics.map((t) =>
    `<label class="chip-check"><input type="checkbox" value="${t.id}"> ${t.icon} ${esc(t.name)}</label>`).join("");
  const englishQuiz = ENGLISH_TOPICS.filter((t) => !t.special);
  host.innerHTML = `
    <div class="card stack" id="builder">
      <div id="t-bank">
      <div>
        <div class="row between"><label class="field">Maths topics</label><button class="btn ghost sm" data-all="maths">Select all</button></div>
        <div class="checklist" data-group="maths">${checklist(MATHS_TOPICS)}</div>
      </div>
      <div>
        <div class="row between"><label class="field">English topics</label><button class="btn ghost sm" data-all="english">Select all</button></div>
        <div class="checklist" data-group="english">${checklist(englishQuiz)}</div>
      </div>
      <div>
        <div class="row between"><label class="field">Science topics</label><button class="btn ghost sm" data-all="science">Select all</button></div>
        <div class="checklist" data-group="science">${checklist(SCIENCE_TOPICS)}</div>
      </div>
      <div>
        <label class="field">Difficulty</label>
        <div class="checklist" id="t-diff">
          ${[1, 2, 3].map((d) => `<label class="chip-check"><input type="checkbox" data-test-diff value="${d}"${testDiffs().includes(d) ? " checked" : ""}> ${DIFF_NAMES[d]}</label>`).join("")}
        </div>
      </div>
      </div>
      <div>
        <label class="field" for="t-examples">Example questions <span class="muted">(optional)</span></label>
        <p class="muted small" style="margin-bottom:8px;">Paste one or more questions and the AI will write a fresh test in the same style. Leave blank to use the question bank.</p>
        <textarea id="t-examples" rows="3" style="min-height:80px;" placeholder="e.g. What is 15% of 240?"></textarea>
        <label class="field" style="margin-top:12px;">Your files <span class="muted">(optional)</span></label>
        <p class="muted small" style="margin-bottom:8px;">Upload a worksheet, notes, a past test or photos of your textbook. The AI writes new questions like the ones in your files.</p>
        <div id="t-files">${uploadBoxHTML()}</div>
        <label class="small" style="display:flex; gap:8px; align-items:center; margin-top:8px;">
          <input type="checkbox" id="t-examples-only"> Base the whole test on my examples and files only (ignore the topics and difficulty above)
        </label>
      </div>
      <div class="grid" style="grid-template-columns: 1fr 1fr;">
        <div><label class="field" for="t-count">Questions</label><input type="number" id="t-count" min="1" max="50" value="10"></div>
        <div><label class="field" for="t-time">Time limit</label>
          <select id="t-time">${timeOptions(20)}</select>
        </div>
      </div>
      ${testLevelsHTML("Year 7 on its own uses the question bank. Tick other year levels (or several) and the AI writes new questions on your topics for them.")}
      ${feedbackPickerHTML("How the AI marks written answers and talks about your mistakes.")}
      <div id="t-error" class="error hidden"></div>
      <div class="t-go">
        <button class="btn" id="t-start" type="button">Start test →</button>
        <button class="btn secondary" id="t-public" type="button">🌍 Make public</button>
      </div>
      <p class="muted small" style="margin:0;">“Make public” builds the same test and shares it so everyone can find it in 🌍 Public tests.</p>
    </div>`;

  $$("[data-all]", host).forEach((btn) => btn.addEventListener("click", () => {
    const boxes = $$(`[data-group="${btn.dataset.all}"] input`, host);
    const allOn = boxes.every((b) => b.checked);
    boxes.forEach((b) => { b.checked = !allOn; });
    btn.textContent = allOn ? "Select all" : "Clear";
  }));

  const testFiles = [];
  const uploads = wireUploadBox($("#t-files", host), testFiles);
  const examplesOnly = $("#t-examples-only", host);
  examplesOnly.addEventListener("change", () => {
    $("#t-bank", host).style.opacity = examplesOnly.checked ? ".4" : "";
    $("#t-bank", host).style.pointerEvents = examplesOnly.checked ? "none" : "";
  });

  // Builds the test, then either starts it or (share = true) opens the share box.
  const buildTest = async (share) => {
    const startBtn = $(share ? "#t-public" : "#t-start", host), label = startBtn.textContent;
    const go = (items, minutes) => (share ? openShareTest(items, { minutes }) : runTest(view, items, minutes));
    const topicIds = $$("[data-group] input:checked", host).map((b) => b.value);
    const diffs = $$("#t-diff input:checked", host).map((b) => +b.value);
    const count = Math.max(1, Math.min(50, parseInt($("#t-count", host).value, 10) || 10));
    const minutes = +$("#t-time", host).value;
    const examples = $("#t-examples", host).value.trim();
    const err = $("#t-error", host);
    hide(err);
    if (uploads.busy()) return setMsg(err, "Your files are still loading — wait a moment, then try again.", "error");
    const files = uploadsReady(testFiles);
    // With files and no topics ticked, the test is just about the files.
    const filesOnly = examplesOnly.checked || (files.length && !topicIds.length);

    if (examplesOnly.checked && !examples && !files.length) return setMsg(err, "Type at least one example question or add a file.", "error");
    if (!filesOnly) {
      if (!topicIds.length) return setMsg(err, "Pick at least one topic.", "error");
      if (!diffs.length) return setMsg(err, "Pick at least one difficulty.", "error");
    }

    // The question bank is Year 7, so for any other level the AI writes the test at that level.
    const atLevel = !useBank();
    if (examples || files.length || atLevel) {
      const btn = startBtn;
      btn.disabled = true;
      btn.textContent = "Writing your test…";
      try {
        const topics = filesOnly ? null : topicIds.map(findTopic);
        const qs = await generateAIQuestions(examples, count, topics, diffs.length ? diffs : [1, 2, 3], testFiles);
        if (!qs.length) throw new Error("No usable questions");
        if (share) { btn.disabled = false; btn.textContent = label; }
        go(qs.map((q) => ({ q, topic: { id: null, name: q.topicName, icon: "🤖" } })), minutes);
      } catch (e) {
        console.error("Apex: AI test generation failed —", e);
        btn.disabled = false;
        btn.textContent = label;
        setMsg(err, e.userMessage || (files.length ? "Couldn't write a test from those files. Try fewer or smaller files, or add an example question." : examples ? "Couldn't write a test from those examples. Try rewording them, or clear the box to use the question bank." : "Couldn't write a test at that level — try again, or set your level to Year 7 to use the question bank."), "error");
      }
      return;
    }

    const pool = topicIds.flatMap((id) => {
      const topic = findTopic(id);
      return topic.questions.filter((q) => diffs.includes(q.difficulty)).map((q) => ({ q, topic }));
    });
    if (!pool.length) return setMsg(err, "No questions match those choices.", "error");
    go(shuffle(pool).slice(0, count), minutes);
  };
  $("#t-start", host).addEventListener("click", () => buildTest(false));
  $("#t-public", host).addEventListener("click", () => buildTest(true));
}

const timeOptions = (selected) => `<option value="0"${selected === 0 ? " selected" : ""}>No limit</option>` +
  [5, 10, 15, 20, 30, 45, 60].map((m) => `<option value="${m}"${m === selected ? " selected" : ""}>${m} minutes</option>`).join("");

// How the AI should write test questions (used by the AI test chat and the example-based generator).
const AI_QUESTION_RULES = `Question formats:
- Short answer, fill in the blank, worded problems: ONE short, clearly correct answer (a number, word or short phrase), because answers are checked by exact match. Show a gap as "____".
- Multiple choice, odd one out, spot the mistake: 4 choices in "options"; "answer" must be exactly one of them.
- True or false: "options": ["True", "False"].
- Explain in your own words: "type": "written"; "answer" is a short example answer (1–3 sentences). The AI marks these.
- Reading passage: put the passage (80–200 words, or the student's own text) in "passage" on EVERY question about it, copied exactly.
- Reading coordinates: "type": "point", "answer": "(3, -2)", plus a "plane" visual showing the point.

Interactive and picture questions — use them where they suit the topic (especially maths, about a third of the questions) by adding "visual":
- Plot points: {"type":"plot","targets":[[2,-3]]} (whole numbers from -6 to 6). The student taps the grid.
- Place a number on a number line: {"type":"place","min":0,"max":1,"step":0.1,"target":0.7} (the target must sit on a step).
- Shade part of a shape: {"type":"shade","shape":"bar","parts":8,"target":6} (shape: bar, circle or grid).
- Make an angle with a protractor: {"type":"angleMake","target":135}.
- Put things in order: {"type":"order","items":["smallest","middle","largest"],"first":"Smallest","last":"Largest"} — list the items in the CORRECT order; the site shuffles them.
- Match pairs: {"type":"match","pairs":[["word","its meaning"],["word","its meaning"],["word","its meaning"]]} (3–5 pairs).
- Tap words in a sentence: {"type":"tapword","text":"The dog *barked* loudly."} — put * around each correct word.
For those, "answer" can be "".
Diagrams shown above a typed or multiple-choice question: {"type":"plane","points":[{"x":3,"y":-2,"label":"A"}]}, {"type":"numberline","min":-5,"max":5,"step":1,"marks":[{"v":-3,"label":"A"}]}, {"type":"fraction","parts":5,"shaded":2}, {"type":"bars","labels":["Mon","Tue"],"values":[4,7],"title":"Rainy days"}, {"type":"spinner","sections":["red","blue","red"]}, {"type":"triangle","angles":["50°","60°","?"]}, {"type":"rect","w":8,"h":5,"unit":"cm"}, {"type":"circle","r":7,"unit":"cm"}, {"type":"angle","deg":120}, {"type":"table","rows":[["x",1,2,3],["y",3,5,"?"]]}.

Each question: {"prompt":"...","options":[...],"type":"written or point","passage":"...","visual":{...},"answer":"...","explanation":"a worked explanation showing each step or the reason (1–3 sentences)","difficulty":1,"topicName":"Subject: topic"} — leave out keys that don't apply. difficulty: 1 easy, 2 medium, 3 hard. Make sure every fact and answer is correct.`;

// Asks the tutor for new questions modelled on the student's examples.
// With topics: stays within those topics/difficulties. Without: matches the examples' own subject and level.
async function generateAIQuestions(examples, count, topics, diffs, files = []) {
  const rules = `${AI_QUESTION_RULES}

Respond with ONLY a valid JSON array of question objects — no other text, no markdown code fences.`;

  const hasFiles = uploadsReady(files).length > 0;
  const examplesBlock = examples ? `Here are example questions to match the style and structure of:
"""
${examples}
"""
` : "";
  const bank = useBank();
  const prompt = topics
    ? `You are writing exam questions for a ${bank ? "Year 7 Australian curriculum" : "Victorian Curriculum"} test covering these topics: ${topics.map((t) => t.name).join(", ")}.
${bank ? "" : `These topic names come from a Year 7 course, but write questions on the same topic areas for the year level(s) below (easier or harder than Year 7 as needed), following the right curriculum for each level.
${testLevelLine("Year 7")}
`}Difficulty level(s) to write at${bank ? "" : " (relative to the year level)"}: ${diffs.map((d) => DIFF_NAMES[d].toLowerCase()).join("/")}.

${examplesBlock}${hasFiles ? "Also use the student's uploaded files (above): base questions on their content where it fits these topics, and copy the style of any questions in them.\n" : ""}
Write exactly ${count} new original questions${examples || hasFiles ? " in that same style" : " with a good mix of question types"}, spread across the topics listed above and matching the requested difficulty level(s). Set topicName to whichever listed topic each question belongs to.

${rules}`
    : `You are writing exam questions based on ${hasFiles ? `the student's uploaded files (above)${examples ? " and these example questions" : ""}` : "example questions a student has given you"}.
${examplesBlock}
${testLevels().length ? `First, work out what subject/topic this material covers. Then write questions on it for the chosen year level(s).
${testLevelLine()}

Then write exactly ${count} new original questions on that same subject.` : learnLevel() === "auto"
    ? `First, work out what subject/topic this material covers and what level it is pitched at — judge this from the material itself, not from any assumed year level, and match that same level.

Then write exactly ${count} new original questions on that same subject, at that same level.`
    : `First, work out what subject/topic this material covers. The student has chosen their year level: they are ${LEARN_LEVELS[learnLevel()].who}. Pitch the questions at that level.

Then write exactly ${count} new original questions on that same subject, at that level.`} If the material contains questions (a worksheet, test or textbook exercise), write NEW questions in a similar style and format — don't copy them. If it's notes or a textbook page, test the key facts and ideas in it. Set topicName to the subject you identified, and difficulty to 1 (easier than the material), 2 (about the same) or 3 (harder).

${rules}`;

  return parseAIQuestions(await askTutorRaw(await withUploads(prompt, files, "The student uploaded these files to make a practice test from.")), count);
}

// Reads JSON out of an AI reply: ignores text and code fences around it, and repairs a reply that was cut off
// (keeping every complete item). Returns null when there's no usable JSON.
function parseLooseJSON(text) {
  const s = String(text || "").replace(/```(?:json)?/gi, "");
  const start = s.search(/[[{]/);
  if (start < 0) return null;
  const body = s.slice(start);
  const stack = [];
  let inStr = false, escaped = false, lastSafe = -1, safeStack = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      stack.pop();
      if (!stack.length) { try { return JSON.parse(body.slice(0, i + 1)); } catch (e) { return null; } }
      lastSafe = i;
      safeStack = [...stack];
    }
  }
  if (lastSafe < 0) return null;
  try { return JSON.parse(body.slice(0, lastSafe + 1) + safeStack.reverse().join("")); } catch (e) { return null; }
}

// Turns question objects written by the AI into test questions, dropping any that aren't usable.
function normaliseAIQuestions(list, count = 50) {
  const stamp = Date.now().toString(36);
  let lastPassage = "";
  return (Array.isArray(list) ? list : []).filter((q) => q && typeof q === "object" && q.prompt).slice(0, count).map((q, i) => {
    const out = {
      id: `ai-${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      prompt: String(q.prompt).trim().slice(0, 800),
      explanation: String(q.explanation || "").slice(0, 500),
      difficulty: [1, 2, 3].includes(Number(q.difficulty)) ? Number(q.difficulty) : 2,
      topicName: String(q.topicName || "AI question").slice(0, 60),
    };
    const passage = q.passage ? String(q.passage).trim().slice(0, 3000) : "";
    if (passage) { out.passage = passage; out.showPassage = passage !== lastPassage; }
    lastPassage = passage;
    if (q.visual) {
      const v = cleanVisual(q.visual);
      if (!v) return null; // the question needs its picture
      out.visual = v;
      if (isVisualInput(out)) { out.answer = visualAnswerText(out); return out; }
    }
    const type = String(q.type || "").toLowerCase();
    let answer = q.answer === undefined || q.answer === null ? "" : String(q.answer).trim();
    if (type === "point") {
      const m = answer.replace(/[−–]/g, "-").match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
      if (!m) return null;
      out.answerType = "point";
      out.point = [Number(m[1]), Number(m[2])];
      out.answer = `(${m[1]}, ${m[2]})`.replace(/-/g, "−");
      return out;
    }
    if (!answer) return null;
    let options = Array.isArray(q.options) ? [...new Set(q.options.map((o) => String(o).trim()).filter(Boolean))].slice(0, 6) : null;
    if (options) {
      const match = options.find((o) => o.toLowerCase() === answer.toLowerCase());
      if (options.length >= 2 && match) {
        answer = match;
        if (options.length > 2) options = shuffle(options);
      } else options = null;
    }
    const written = !options && type === "written";
    const numeric = !options && !written && /^-?\d+(\.\d+)?$/.test(answer);
    out.answer = numeric ? parseFloat(answer) : answer;
    out.answerType = written ? "written" : numeric ? undefined : "text";
    if (options) out.options = options;
    return out;
  }).filter(Boolean);
}

// The AI's reply as test questions (a JSON array, or an object with "questions"/"add").
function parseAIQuestions(reply, count) {
  const data = parseLooseJSON(reply);
  const list = Array.isArray(data) ? data : data?.questions || data?.add || [];
  if (!list.length) throw new Error("Unexpected AI response");
  return normaliseAIQuestions(list, count);
}

const ANSWER_SEL = "input[data-qid], textarea[data-qid]";
// The first box a student can type in (skips hidden answer fields and tap-to-answer questions).
const FOCUS_SEL = "input[type=text], textarea";

// Asks the AI to mark "explain in your own words" answers. Returns { [index]: { correct, feedback } }.
async function markWrittenAnswers(list) {
  const out = {};
  const blank = list.filter((w) => !w.answer.trim());
  blank.forEach((w) => { out[w.i] = { correct: false, feedback: "You left this one blank." }; });
  const todo = list.filter((w) => w.answer.trim());
  if (!todo.length) return out;
  try {
    const reply = await askTutorRaw(`You are a teacher marking short written answers. For each one, decide if the student's answer is correct: it shows the key idea of the example answer, even if worded differently or with small spelling mistakes. Then give one or two short sentences of feedback written to the student.
${learnerLine("Year 7")}
${feedbackTone("marking")}

${todo.map((w, n) => `Answer ${n + 1}
Question: ${w.q.prompt}${w.q.passage ? `\nPassage: ${w.q.passage}` : ""}
Example answer: ${w.q.answer}
Student's answer: ${w.answer}`).join("\n\n")}

Respond with ONLY a valid JSON array with one item per answer, in order, no other text:
[{"correct": true, "feedback": "..."}]`);
    const marks = parseLooseJSON(reply);
    if (!Array.isArray(marks)) throw new Error("Unexpected AI response");
    todo.forEach((w, n) => {
      const m = marks[n] || {};
      out[w.i] = { correct: m.correct === true || m.correct === "true", feedback: String(m.feedback || "") };
    });
  } catch (e) {
    console.error("Apex: AI marking failed —", e);
    todo.forEach((w) => { out[w.i] = { correct: false, feedback: "Couldn't reach the AI to mark this one. Compare your answer with the example answer below." }; });
  }
  return out;
}

// opts.noPoints: practice only (e.g. a quiz from your own flashcards). opts.again: label for the button after.
function runTest(view, items, minutes, opts = {}) {
  items = groupPassages(items, (x) => x.q);
  const shown = passageFlags(items.map((x) => x.q));
  let secondsLeft = minutes * 60;
  let timer = null;
  leaveWarning = "Leave the test? Your answers won't be saved.";

  view.innerHTML = `
    <div class="page-head row between">
      <div><h1 style="margin:0;">Test</h1><p id="answered"></p></div>
      <span class="timer" id="t-clock"></span>
    </div>
    <form class="card" id="t-form" autocomplete="off">
      ${items.map(({ q, topic }, i) => questionHTML(q, i, topic.name, shown[i])).join("")}
      ${items.some(({ q }) => q.answerType === "written") ? `<div style="margin-top:18px;">${feedbackPickerHTML("Used when the AI marks your written answers.")}</div>` : ""}
      <div class="row between" style="margin-top:18px;">
        <button class="btn ghost" type="button" id="t-quit">Quit</button>
        <button class="btn" type="submit">Submit test</button>
      </div>
    </form>`;

  const form = $("#t-form", view);
  const drawAnswered = () => {
    const n = $$(ANSWER_SEL, form).filter((i) => i.value.trim()).length;
    $("#answered", view).textContent = `${n} of ${items.length} answered`;
  };
  drawAnswered();
  wireQuestions(form, items.map(({ q }) => q));
  form.addEventListener("input", drawAnswered);

  const clock = $("#t-clock", view);
  if (minutes) {
    const draw = () => {
      clock.textContent = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
      clock.classList.toggle("low", secondsLeft <= 60);
    };
    draw();
    timer = setInterval(() => {
      secondsLeft -= 1;
      draw();
      if (secondsLeft <= 0) { toast("Time's up!"); finish(); }
    }, 1000);
  }
  cleanup = () => clearInterval(timer);
  $(FOCUS_SEL, form)?.focus({ preventScroll: true });
  $("#t-quit", view).addEventListener("click", () => {
    if (confirm(leaveWarning)) route(); // route() clears the timer and warning
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const blanks = $$(ANSWER_SEL, form).filter((i) => !i.value.trim()).length;
    if (blanks && !confirm(`You've left ${blanks} blank. Submit anyway?`)) return;
    finish();
  });

  let finished = false;
  async function finish() {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    const answers = items.map(({ q }) => $(`input[data-qid="${q.id}"], textarea[data-qid="${q.id}"]`, form).value);
    const feedback = {};
    const written = items.map(({ q }, i) => ({ q, i, answer: answers[i] })).filter((w) => w.q.answerType === "written");
    if (written.length) {
      $$("button, input, textarea", form).forEach((el) => { el.disabled = true; });
      $("#answered", view).textContent = "The AI is marking your written answers…";
      Object.assign(feedback, await markWrittenAnswers(written));
      if (!document.body.contains(form)) return;
    }
    leaveWarning = null;
    flushPendingAnnouncement();
    const results = items.map(({ q, topic }, i) => ({ q, topic,
      correct: q.answerType === "written" ? !!feedback[i]?.correct : isAnswerCorrect(q, answers[i]) }));
    const right = results.filter((r) => r.correct).length;
    const earned = opts.noPoints ? 0 : recordResults(results, { isTest: true });
    const pct = Math.round((right / items.length) * 100);

    view.innerHTML = `
      <div class="page-head"><h1>Results</h1></div>
      <div class="grid cols-3" style="margin-bottom:16px;">
        ${statCard("Score", `${right}/${items.length}`)}
        ${statCard("Percent", pct + "%")}
        ${opts.noPoints ? statCard("Points", `<span class="muted small" style="font-size:15px;">Practice only</span>`) : statCard("Points" + (earned ? boostNote(true) : ""), "+" + earned)}
      </div>
      <div class="card" id="review">
        ${items.map(({ q, topic }, i) => questionHTML(q, i, topic.name, shown[i])).join("")}
      </div>
      <div class="row" style="margin-top:16px;"><a class="btn" href="#/test" id="again">${esc(opts.again || "Build another test")}</a>
        ${opts.noPoints || opts.publicId ? "" : `<button class="btn secondary" type="button" id="share-test">🌍 Share this test</button>`}
        <button class="btn secondary" type="button" id="save-test">💾 Save test</button>
        <button class="btn ghost" type="button" id="pdf-test">🖨️ Save as PDF</button></div>
      <p class="muted small" style="margin:8px 0 0;">Saving keeps the questions in 📂 My tests (on the AI test tab), with the ones you got wrong ⭐ highlighted to work on.</p>`;

    items.forEach(({ q }, i) => {
      const row = $(`.question[data-qid="${q.id}"]`, view);
      $("input, textarea", row).value = answers[i];
      markQuestion(row, q, results[i].correct, { yourAnswer: answers[i], feedback: feedback[i]?.feedback });
    });
    // Already on #/test, so re-render the builder directly.
    $("#again", view).addEventListener("click", (e) => { e.preventDefault(); route(); });
    $("#share-test", view)?.addEventListener("click", () => openShareTest(items, { minutes }));
    const qsOnly = items.map(({ q, topic }) => { const { showPassage, ...rest } = q; return { ...rest, topicName: rest.topicName || topic.name }; });
    const wrong = results.map((r, i) => (r.correct ? -1 : i)).filter((i) => i >= 0);
    let savedId = null;
    $("#save-test", view).addEventListener("click", (e) => {
      const n = prompt("Name this test so you can find it in 📂 My tests:", testName(qsOnly));
      if (n === null) return;
      const t = saveTest({ id: savedId, name: n.trim().slice(0, 80) || testName(qsOnly), questions: qsOnly, minutes, marked: wrong });
      savedId = t.id;
      e.target.textContent = "✓ Saved";
      toast(`💾 Saved "${t.name}" — find it in 📂 My tests on the AI test tab.`);
    });
    $("#pdf-test", view).addEventListener("click", () => printTestDialog(testName(qsOnly), qsOnly, wrong));
    window.scrollTo(0, 0);
  }
}

// Chat boxes: Enter sends, Shift+Enter starts a new line, and the box grows with the message.
function fitChatInput(el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; }
document.addEventListener("keydown", (e) => {
  const el = e.target;
  if (!el.matches?.("textarea.chat-input") || e.key !== "Enter" || e.shiftKey || e.isComposing) return;
  e.preventDefault();
  el.form?.requestSubmit();
});
document.addEventListener("input", (e) => { if (e.target.matches?.("textarea.chat-input")) fitChatInput(e.target); });
// Shrink the box back after a message is sent (the value is cleared in code, which fires no input event).
document.addEventListener("submit", (e) => { const el = e.target.querySelector?.("textarea.chat-input"); if (el) setTimeout(() => fitChatInput(el), 0); });

// ---------------- Tutor ----------------
// Chats are saved (js/ai-memory.js), so the tutor sees the earlier messages in a chat, you can go back to
// old chats, and it remembers short notes about you across all chats.
let tutorChatId = null; // the chat that was open, so switching pages comes back to it
const TUTOR_HISTORY = 12; // earlier messages sent with each question

function tutorPrompt(earlier, question, hasPhoto) {
  const recent = earlier.slice(-TUTOR_HISTORY);
  const lines = recent.map((m) => `${m.role === "me" ? "Student" : "Tutor"}: ${m.photo ? "[sent a photo] " : ""}${String(m.text).slice(0, 1500)}`);
  return `You are chatting with a student as their tutor. ${ANY_SUBJECT}
${learnerLine()}
${calendarPrompt()}${memoryPrompt()}
${recent.length ? `The conversation so far${earlier.length > recent.length ? " (the most recent messages)" : ""}:\n${lines.join("\n\n")}\n\n` : ""}Student's new message: ${question || "(no words, just the photo)"}${hasPhoto ? `\n(The student attached a photo, which is included.${question ? "" : " Look at their handwritten working and explain whether it's correct, and how to fix it if not."})` : ""}

When you check the student's work or answers (including photos of their working), follow this:
${feedbackTone()}

Answer the student's new message, carrying on naturally from the conversation — they may refer back to earlier messages (like "the second one" or "explain that again"). In the reply write plain text with no Markdown or LaTeX, use × and ÷, and keep it fairly short unless they ask for more detail.

Reply with ONLY valid JSON, no markdown:
{"reply":"your answer to the student","title":"a 2–5 word title for this chat","remember":[],"forget":[],"calendar":[]}
${memoryRules()}
${calendarRules()}`;
}

function pageTutor(view) {
  let pendingImage = null, chats = [], current = null, busy = false;
  const blankChat = () => ({ id: newChatId(), title: "New chat", messages: [], createdAt: new Date().toISOString() });
  view.innerHTML = `
    <div class="page-head"><h1>AI Tutor</h1><p>Ask about anything you're learning — any subject, at any level from Prep to VCE, uni and beyond. Set your level so answers are pitched just right. You can send a photo of your working too, and your chats are saved.</p></div>
    <div class="tutor-wrap">
      <aside class="card tutor-side" id="t-side" aria-label="Your chats">
        <button class="btn" type="button" data-new-chat>＋ New chat</button>
        <div class="tutor-chats" id="t-chats"><p class="muted small" style="margin:0;">Loading your chats…</p></div>
        <button class="btn ghost sm" type="button" id="t-mem">🧠 What the AI remembers</button>
      </aside>
      <div class="card tutor-main">
        <div class="tutor-bar">
          <button class="btn ghost sm tutor-toggle" type="button" id="t-toggle" aria-expanded="false" aria-controls="t-side">☰ Chats</button>
          <strong class="tutor-title" id="t-title"></strong>
          <button class="btn ghost sm tutor-new" type="button" data-new-chat title="Start a new chat">＋ New</button>
        </div>
        <div class="tutor-fb">${levelPickerHTML()}${feedbackPickerHTML("How the tutor talks when it checks your work or a photo of your working.")}</div>
        <div class="chat" id="chat"><p class="muted small" style="margin:auto;">Loading your chats…</p></div>
        <div class="attach-preview hidden" id="attach"><img alt=""><button class="btn ghost sm" id="attach-x">Remove photo</button></div>
        <form class="chat-form" id="chat-form" autocomplete="off">
          <button type="button" class="btn secondary" id="photo" title="Add a photo of your working">📷</button>
          <input type="file" id="photo-input" accept="image/*" class="hidden">
          <textarea class="chat-input" rows="1" id="ask" placeholder="Ask a question…" maxlength="4000"></textarea>
          <button class="btn" type="submit" id="send">Ask</button>
        </form>
      </div>
    </div>`;

  const chatBox = $("#chat", view), side = $("#t-side", view), send = $("#send", view);
  const draw = () => {
    if (!current) return;
    $("#t-title", view).textContent = current.title;
    if (!current.messages.length) {
      const examples = ["How do I simplify 12/18?", "Explain photosynthesis simply", "Help me with VCE derivatives", "How do loops work in Python?"];
      const welcome = aiMemory?.enabled && aiMemory.items.length ? "Welcome back! What would you like help with today?" : "What would you like help with?";
      chatBox.innerHTML = `<div class="chat-empty">${welcome}
        <div class="chips">${examples.map((x) => `<button type="button" class="btn secondary sm">${esc(x)}</button>`).join("")}</div></div>`;
      $$(".chips button", chatBox).forEach((b) => b.addEventListener("click", () => { $("#ask", view).value = b.textContent; $("#chat-form", view).requestSubmit(); }));
      return;
    }
    chatBox.innerHTML = current.messages.map((m) => `<div class="bubble ${m.role}${m.pending ? " pending" : ""}">${m.image ? `<img src="${m.image}" alt="Your photo">` : m.photo ? `<span class="bubble-photo">📷 Photo</span>` : ""}${esc(m.text)}${m.note ? `<div class="bubble-note">${esc(m.note)}</div>` : ""}</div>`).join("");
    chatBox.scrollTop = chatBox.scrollHeight;
  };
  const drawList = () => {
    const list = $("#t-chats", view);
    const saved = chats.filter((c) => c.messages.length);
    list.innerHTML = saved.length
      ? saved.map((c) => `<div class="tutor-chat${c === current ? " on" : ""}">
          <button type="button" class="tutor-chat-open" data-chat-id="${esc(c.id)}"><span>${esc(c.title)}</span><span class="muted small">${c.updatedAt ? fmtDate(c.updatedAt) : "Now"}</span></button>
          <button type="button" class="btn ghost sm" data-del-chat="${esc(c.id)}" aria-label="Delete this chat" title="Delete this chat">✕</button>
        </div>`).join("")
      : `<p class="muted small" style="margin:0;">Your chats will show here, so you can go back to them.</p>`;
    const n = aiMemory?.enabled ? aiMemory.items.length : 0;
    $("#t-mem", view).textContent = `🧠 What the AI remembers${n ? ` (${n})` : ""}`;
  };
  const toggleSide = (open) => { side.classList.toggle("open", open); $("#t-toggle", view).setAttribute("aria-expanded", String(open)); };
  function openChat(chat) {
    current = chat;
    tutorChatId = chat.id;
    draw(); drawList();
    toggleSide(false);
  }

  $("#t-toggle", view).addEventListener("click", () => toggleSide(!side.classList.contains("open")));
  $$("[data-new-chat]", view).forEach((b) => b.addEventListener("click", () => {
    if (!current) return;
    openChat(current.messages.length ? blankChat() : current);
    $("#ask", view).focus();
  }));
  $("#t-chats", view).addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del-chat]");
    if (del) {
      const chat = chats.find((c) => c.id === del.dataset.delChat);
      if (!chat || !confirm(`Delete "${chat.title}"? This can't be undone.`)) return;
      chats = chats.filter((c) => c !== chat);
      await deleteChat(chat.id);
      if (chat === current) openChat(blankChat()); else drawList();
      toast("Chat deleted");
      return;
    }
    const pick = e.target.closest("[data-chat-id]");
    if (pick) openChat(chats.find((c) => c.id === pick.dataset.chatId) || current);
  });
  $("#t-mem", view).addEventListener("click", () => openMemoryModal({
    onChange: drawList,
    onChatsDeleted: () => { chats = []; openChat(blankChat()); },
  }));

  $("#photo", view).addEventListener("click", () => $("#photo-input", view).click());
  $("#photo-input", view).addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Please choose an image.");
    if (file.size > 5 * 1024 * 1024) return toast("Image must be under 5MB.");
    const reader = new FileReader();
    reader.onload = () => {
      pendingImage = { base64: reader.result, mimeType: file.type };
      $("#attach img", view).src = reader.result;
      show($("#attach", view));
    };
    reader.readAsDataURL(file);
  });
  const clearImage = () => { pendingImage = null; $("#photo-input", view).value = ""; hide($("#attach", view)); };
  $("#attach-x", view).addEventListener("click", clearImage);

  $("#chat-form", view).addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#ask", view);
    const question = input.value.trim();
    if (!current || busy || (!question && !pendingImage)) return;
    const image = pendingImage, chat = current; // the student may switch chats while the tutor is thinking
    const earlier = chat.messages.filter((m) => !m.pending && m.role !== "err");
    chat.messages.push({ role: "me", text: question || "Can you check my working?", image: image?.base64, photo: !!image });
    const pending = { role: "bot", text: "Thinking…", pending: true };
    chat.messages.push(pending);
    if (!chats.includes(chat)) chats.unshift(chat);
    busy = true; send.disabled = true;
    input.value = "";
    clearImage();
    draw(); drawList();
    const say = (t) => { if (pending.pending) { pending.text = t; if (chat === current && document.body.contains(chatBox)) draw(); } };
    const slow = setTimeout(() => say("Still working on it…"), 15000);

    try {
      await Promise.all([loadMemory(), ensureCalendar()]);
      const body = { question: tutorPrompt(earlier, question, !!image) };
      if (image) { body.image = image.base64; body.imageMimeType = image.mimeType; }
      const raw = await askTutorRaw(body, { onRetry: (n) => say(`The AI is busy — trying again (${n + 1} of ${AI_TRIES})…`) });
      const data = parseLooseJSON(raw);
      const obj = data && !Array.isArray(data) ? data : {};
      pending.text = cleanTutorAnswer(aiReplyText(raw, data)) || "Sorry, I couldn't come up with an answer. Try asking another way.";
      if (chat.title === "New chat") chat.title = plainText(obj.title || "").slice(0, 50) || (question || "Checking my working").slice(0, 50);
      const note = [memoryNote(applyMemoryUpdates(obj)), calendarNote(addEventsFromAI(obj.calendar))].filter(Boolean).join(" · ");
      if (note) pending.note = note;
    } catch (err) {
      console.error(err);
      pending.role = "err";
      pending.text = err.userMessage || "Something went wrong reading the tutor's answer. Please try again.";
    }
    clearTimeout(slow);
    delete pending.pending;
    saveChat(chat);
    chats.sort((a, b) => (a === chat ? -1 : b === chat ? 1 : 0));
    busy = false;
    if (document.body.contains(chatBox)) {
      send.disabled = false;
      if (chat === current) { draw(); input.focus(); }
      drawList();
    }
  });

  Promise.all([listChats(), loadMemory()]).then(([all]) => {
    if (!document.body.contains(chatBox)) return;
    chats = all;
    const message = takeTutorMessage(); // e.g. "Help me make a study plan…" from the calendar
    // Come back to the chat that was open, or carry on the most recent one.
    openChat(message ? blankChat() : (tutorChatId ? chats.find((c) => c.id === tutorChatId) : chats[0]) || blankChat());
    if (message) { $("#ask", view).value = message; $("#chat-form", view).requestSubmit(); }
  });
}

// ---------------- Progress ----------------
function pageProgress(view) {
  const t = totals();
  view.innerHTML = `
    <div class="page-head"><h1>Progress</h1><p>How you're going, and how you compare.</p></div>
    <div class="grid cols-3">
      ${statCard("Points", me.points)}
      ${statCard("Accuracy", t.accuracy + "%")}
      ${statCard("Answered", t.attempted)}
    </div>
    <div style="margin-top:12px;">${rankCard()}</div>

    <div class="section-label">Ranks</div>
    <div class="card">
      ${XP_LEVELS.map((l) => {
        const reached = me.xp >= l.min;
        const isCurrent = !me.isAdmin && levelInfo(me.xp).current === l;
        return `<div class="list-row ${isCurrent ? "me" : ""}" style="${reached ? "" : "opacity:.55;"}">
          <span style="font-size:20px;">${l.icon}</span>
          <span class="grow">${l.name}${isCurrent ? " (you)" : ""}</span>
          <span class="muted small">${l.min} XP</span>
        </div>`;
      }).join("")}
    </div>

    <div class="section-label">Mastery by topic</div>
    <div class="card">
      ${QUIZ_TOPICS.map((tp) => {
        const s = topicStats(tp.id);
        return `<div class="mastery-row">
          <a href="#/practice/${tp.id}" style="color:inherit; text-decoration:none;">${tp.icon} ${esc(tp.name)}</a>
          <div class="bar"><span style="width:${mastery(tp.id)}%"></span></div>
          <span class="pct">${s.attempted ? mastery(tp.id) + "%" : "—"}</span>
        </div>`;
      }).join("")}
    </div>

    <div class="section-label">Leaderboard</div>
    <div class="card">
      <div class="row between" style="margin-bottom:12px;">
        <div class="segmented" id="lb-mode">
          <button type="button" class="active" data-mode="all">Everyone</button>
          <button type="button" data-mode="friends">Friends</button>
        </div>
      </div>
      <form id="add-friend" class="row hidden" style="flex-wrap:nowrap; margin-bottom:12px;">
        <input type="text" id="friend-name" placeholder="Add a friend by username">
        <button class="btn" type="submit">Add</button>
      </form>
      <div id="lb"><p class="muted">Loading…</p></div>
    </div>`;

  let mode = "all";
  let rows = [];
  $$("#lb-mode button", view).forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    $$("#lb-mode button", view).forEach((x) => x.classList.toggle("active", x === b));
    $("#add-friend", view).classList.toggle("hidden", mode !== "friends");
    drawBoard();
  }));

  function drawBoard() {
    const list = mode === "friends" ? rows.filter((r) => me.friends.includes(r.username) || r.username === me.name) : rows;
    const lb = $("#lb", view);
    if (!list.length) { lb.innerHTML = `<p class="muted">No one here yet.</p>`; return; }
    lb.innerHTML = list.map((r, i) => {
      const isMe = r.username === me.name;
      const pts = isMe ? me.points : r.show_points === false ? "hidden" : `${r.points || 0} pts`;
      return `<div class="list-row ${isMe ? "me" : ""}">
        <span class="rank">${i + 1}</span>
        <span class="grow ${lbHidden(r, isMe) ? "muted" : ""}">${lbName(r, isMe)}</span>
        <span class="muted small">${isMe ? pts + " pts" : pts}</span>
        ${mode === "friends" && !isMe ? `<button class="btn ghost sm" data-unfriend="${esc(r.username)}" title="Remove friend">✕</button>` : ""}
      </div>`;
    }).join("");
    $$("[data-unfriend]", lb).forEach((b) => b.addEventListener("click", () => saveFriends(me.friends.filter((f) => f !== b.dataset.unfriend))));
  }

  async function saveFriends(list) {
    const { error } = await sb.from("profiles").update({ friends: list }).eq("id", authUser.id);
    if (error) return toast("Couldn't update friends.");
    me.friends = list;
    drawBoard();
  }

  $("#add-friend", view).addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#friend-name", view).value.trim();
    if (!name || name === me.name) return;
    if (me.friends.includes(name)) return toast("Already a friend.");
    const { data } = await sb.from("public_profiles").select("username, points, show_points").eq("username", name).maybeSingle();
    if (!data) return toast("No one with that username.");
    if (!rows.some((r) => r.username === name)) rows.push(data);
    $("#friend-name", view).value = "";
    await saveFriends([...me.friends, name]);
    toast(`Added ${name}`);
  });

  (async () => {
    try { rows = await loadLeaderboard(); }
    catch (e) { $("#lb", view).innerHTML = `<p class="muted">Couldn't load the leaderboard.</p>`; return; }
    drawBoard();
  })();
}

// ---------------- Settings ----------------
function pageSettings(view) {
  const until = me.paidUntil ? new Date(me.paidUntil) : null;
  const daysLeft = until ? Math.ceil((until - new Date()) / 86400000) : null;
  const subText = me.isAdmin && !until
    ? "Admin account."
    : until
      ? (daysLeft > 0
        ? `Active until <strong>${esc(fmtDate(until))}</strong> (${daysLeft} day${daysLeft === 1 ? "" : "s"} left).`
        : "Your access has ended.")
      : "Active.";
  const choice = (name, options, current) => `
    <div class="segmented" data-choice="${name}">
      ${options.map(([v, label]) => `<button type="button" data-v="${v}" class="${String(v) === String(current) ? "active" : ""}">${label}</button>`).join("")}
    </div>`;

  view.innerHTML = `
    <div class="page-head"><h1>⚙️ Settings</h1><p>Your account, how the site looks, and more.</p></div>

    <div class="section-label">Account</div>
    <div class="card stack">
      <div class="muted small">Logged in as <strong>${esc(authUser.email)}</strong></div>
      <div>
        <label class="field" for="set-name">Display name</label>
        <div class="row" style="flex-wrap:nowrap;">
          <input type="text" id="set-name" maxlength="24" value="${esc(me.name)}">
          <button class="btn secondary" id="save-name">Save</button>
        </div>
        <div class="muted small" style="margin-top:4px;">This is shown on the leaderboard. Friends who added you by your old name will need to add you again.</div>
      </div>
      <div>
        <label class="field" for="set-pass">New password</label>
        <div class="row" style="flex-wrap:nowrap;">
          <input type="password" id="set-pass" minlength="6" autocomplete="new-password" placeholder="At least 6 characters">
          <button class="btn secondary" id="save-pass">Change</button>
        </div>
      </div>
    </div>

    <div class="section-label">My subscription</div>
    <div class="card stack">
      <p style="margin:0;">${subText}</p>
      <p class="muted small" style="margin:0;">To renew, pay <strong>$10 cash in hand</strong> to the site owner for another 6 months. Accounts are unlocked by hand, so it may take a while.</p>
    </div>

    <div class="section-label">Your level</div>
    <div class="card stack">
      <p class="muted small" style="margin:0;">The AI can help with any subject at any level — from Prep to VCE, uni, TAFE and beyond. Pick your level so explanations, practice questions and feedback are pitched just right, or leave it on <b>Any level</b> and the AI works it out from what you ask.</p>
      ${levelPickerHTML()}
    </div>

    <div class="section-label">AI feedback</div>
    <div class="card stack">
      <p class="muted small" style="margin:0;">Choose how the AI talks when it marks your tests, checks your writing or looks at your working. <b>Chill</b> is relaxed and supportive, <b>Balanced</b> is fair and encouraging, <b>Critical</b> is strict and points out your mistakes, and <b>Super critical</b> is as tough as a strict exam marker and picks up every tiny error.</p>
      ${feedbackPickerHTML()}
    </div>

    <div class="section-label">Appearance</div>
    <div class="card stack">
      <div class="row between"><span>Theme</span>${choice("theme", [["light", "☀️ Light"], ["dark", "🌙 Dark"], ["system", "📱 Device"]], currentThemeSetting())}</div>
      <div class="row between"><span>Text size</span>${choice("text", [["normal", "Normal"], ["large", "Large"]], prefs().textSize || "normal")}</div>
    </div>

    <div class="section-label">Practice</div>
    <div class="card stack">
      <div class="row between"><span>Questions per practice set</span>${choice("setSize", [[5, "5"], [10, "10"], [15, "15"]], practiceSetSize())}</div>
    </div>

    <div class="section-label">Privacy</div>
    <div class="card stack">
      <label class="row between" style="cursor:pointer;">
        <span>Show me on the leaderboard<br><span class="muted small">If you turn this off, other people see "Hidden player" instead of your name and points.</span></span>
        <input type="checkbox" id="set-showpoints" ${me.showPoints ? "checked" : ""} style="width:20px; height:20px;">
      </label>
    </div>

    <div class="section-label">AI memory</div>
    <div class="card stack" id="set-memory">${memoryManagerHTML()}</div>

    <div class="section-label">Feedback</div>
    <div class="card stack" id="set-feedback">
      <p class="muted small" style="margin:0;">Found a bug, have an idea, or a question? Send it to the site owner. Replies show up below.</p>
      <select id="set-fb-category">
        <option value="bug">Bug report</option>
        <option value="suggestion">Suggestion</option>
        <option value="question">Question</option>
        <option value="other">Other</option>
      </select>
      <textarea id="set-fb-message" placeholder="What's on your mind?"></textarea>
      <button class="btn" id="set-fb-send" style="align-self:flex-start;">Send feedback</button>
      <div id="set-fb-list"></div>
    </div>

    <div class="section-label">App updates</div>
    <div class="card stack">
      <div class="row between">
        <span>Version <strong>${esc(SITE_VERSION || "unknown")}</strong><br><span class="muted small" id="upd-status">Updates come out often. Check here to make sure you have the newest one.</span></span>
        <button class="btn secondary" id="upd-check">🔄 Check for updates</button>
      </div>
    </div>

    <div class="section-label">Help &amp; legal</div>
    <div class="card stack">
      <div class="row">
        <button class="btn secondary" data-open="terms">📄 Terms and Conditions</button>
        <button class="btn ghost" id="req-delete">Request account deletion</button>
      </div>
      <button class="btn secondary" id="set-logout" style="align-self:flex-start;">⏻ Log out</button>
    </div>`;

  wireMemoryManager($("#set-memory", view), { onChatsDeleted: () => { tutorChatId = null; } });

  // segmented choices
  $$("[data-choice]", view).forEach((group) => group.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-v]");
    if (!btn) return;
    $$("button", group).forEach((b) => b.classList.toggle("active", b === btn));
    const v = btn.dataset.v;
    if (group.dataset.choice === "theme") setTheme(v);
    if (group.dataset.choice === "text") { setPref("textSize", v); applyTextSize(); }
    if (group.dataset.choice === "setSize") setPref("setSize", +v);
    toast("Saved");
  }));

  $("#save-name", view).addEventListener("click", async () => {
    const name = $("#set-name", view).value.trim();
    if (name === me.name) return;
    if (name.length < 3) return toast("Display name needs at least 3 characters.");
    const { data: taken } = await sb.from("public_profiles").select("username").eq("username", name).maybeSingle();
    if (taken) return toast("That name is already taken.");
    const { error } = await sb.from("profiles").update({ username: name }).eq("id", authUser.id);
    if (error) return toast("Couldn't change your name.");
    me.name = name;
    renderMeBox();
    toast("Name updated");
  });

  $("#save-pass", view).addEventListener("click", async () => {
    const pass = $("#set-pass", view).value;
    if (pass.length < 6) return toast("Password needs at least 6 characters.");
    const { error } = await sb.auth.updateUser({ password: pass });
    if (error) return toast(error.message || "Couldn't change your password.");
    $("#set-pass", view).value = "";
    toast("Password changed");
  });

  $("#set-showpoints", view).addEventListener("change", async (e) => {
    const { error } = await sb.from("profiles").update({ show_points: e.target.checked }).eq("id", authUser.id);
    if (error) { e.target.checked = !e.target.checked; return toast("Couldn't save that."); }
    me.showPoints = e.target.checked;
    toast(e.target.checked ? "You're visible on the leaderboard" : "Your name and points are hidden");
  });

  $("#upd-check", view).addEventListener("click", async () => {
    const btn = $("#upd-check", view), status = $("#upd-status", view);
    if (btn.dataset.latest) return installUpdate(btn.dataset.latest);
    btn.disabled = true; btn.textContent = "Checking…";
    try {
      const { newer, latest } = await checkForUpdates();
      if (newer) {
        status.innerHTML = `<strong style="color:var(--accent);">A new version (${esc(latest)}) is ready.</strong>`;
        btn.dataset.latest = latest;
        btn.className = "btn"; btn.textContent = "⬇️ Update now";
      } else {
        status.textContent = "✓ You're on the latest version.";
        btn.textContent = "🔄 Check again";
      }
    } catch (e) {
      status.textContent = "Couldn't check right now — are you online?";
      btn.textContent = "🔄 Try again";
    }
    btn.disabled = false;
  });

  const fbList = $("#set-fb-list", view);
  $("#set-fb-send", view).addEventListener("click", () => sendFeedback($("#set-fb-category", view), $("#set-fb-message", view), $("#set-fb-send", view), fbList));
  loadMyFeedback(fbList);

  $("#req-delete", view).addEventListener("click", () => {
    $("#set-fb-category", view).value = "other";
    $("#set-fb-message", view).value = "Please delete my account and data.";
    $("#set-feedback", view).scrollIntoView({ behavior: "smooth", block: "center" });
    $("#set-fb-message", view).focus({ preventScroll: true });
  });
  $("#set-logout", view).addEventListener("click", logout);
}

function applyTextSize() {
  document.documentElement.dataset.text = prefs().textSize === "large" ? "large" : "normal";
}
applyTextSize();

// ---------------- Admin ----------------
function timeAgo(iso) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  const days = Math.round(mins / 1440);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
const attemptedOf = (progress) => Object.values(progress || {}).reduce((n, t) => n + (t.attempted || 0), 0);

function pageAdmin(view) {
  if (!me.isAdmin) { location.hash = "#/home"; return; }
  view.innerHTML = `
    <div class="page-head"><h1>Admin</h1><p>Manage accounts, feedback and questions.</p></div>
    <div class="grid cols-3" id="admin-stats"></div>

    <div class="section-label">📢 Announcements</div>
    <div class="card stack">
      <p class="muted small" style="margin:0;">Send a message to everyone. It slides in once at the top of the screen in big, bold text for each person (after they finish any test they're doing). Remove it to stop people who haven't seen it yet from getting it.</p>
      <textarea id="ann-text" maxlength="300" rows="2" style="min-height:70px;" placeholder="e.g. No school holidays break — new questions added this week!"></textarea>
      <div class="row"><button class="btn" id="ann-send">Send to everyone</button><span class="small muted" id="ann-status"></span></div>
      <div id="ann-list"></div>
    </div>

    <div class="section-label">⚡ Events</div>
    <div class="card stack">
      <p class="muted small" style="margin:0;">Run a boost event like Double Points or Triple XP. Everyone sees a banner at the top while it's on, and earns extra for correct answers.</p>
      <div class="grid" style="grid-template-columns: 1fr 1fr;">
        <div><label class="field" for="ev-mult">Boost</label>
          <select id="ev-mult">${[2, 3, 4, 5].map((m) => `<option value="${m}">${multName(m)} (${m}×)</option>`).join("")}</select></div>
        <div><label class="field" for="ev-kind">On</label>
          <select id="ev-kind">
            <option value="both">Points and XP</option>
            <option value="points">Points only</option>
            <option value="xp">XP only</option>
            <option value="tests">Tests only</option>
            <option value="practice">Practice only</option>
          </select></div>
        <div><label class="field" for="ev-start">Starts</label>
          <select id="ev-start"><option value="now">Now</option><option value="later">Later…</option></select>
          <input type="datetime-local" id="ev-start-at" class="hidden" style="margin-top:6px;"></div>
        <div><label class="field" for="ev-len">Lasts</label>
          <select id="ev-len">
            ${[[30, "30 minutes"], [60, "1 hour"], [120, "2 hours"], [180, "3 hours"], ["day", "Until midnight"], [1440, "24 hours"], [2880, "2 days (weekend)"], [10080, "1 week"]]
              .map(([v, l]) => `<option value="${v}" ${v === 60 ? "selected" : ""}>${l}</option>`).join("")}
          </select></div>
      </div>
      <div><label class="field" for="ev-title">Name <span class="muted">(optional)</span></label>
        <input type="text" id="ev-title" maxlength="60" placeholder="e.g. Friday Frenzy (leave blank for “Double Points & XP”)"></div>
      <label class="small" style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="ev-announce" checked> Also send an announcement about it</label>
      <div class="row"><button class="btn" id="ev-go">Start event</button></div>
      <div id="ev-list"></div>
    </div>

    <div class="section-label">🎁 Give to lots of people</div>
    <div class="card stack">
      <p class="muted small" style="margin:0;">Give or take points, XP, badges, a rank, a day streak or extra time. Each person sees a gift pop-up. To give to just one person, use <b>Manage → 🎁 Give / take</b> below.</p>
      <div class="segmented" id="give-who" role="radiogroup" aria-label="Who gets it">
        <button type="button" class="active" data-who="all">Everyone</button>
        <button type="button" data-who="ticked">People I tick below (<span id="give-n">0</span>)</button>
      </div>
      ${giveFormHTML("all")}
    </div>

    <div class="section-label">Accounts</div>
    <div class="card">
      <input type="text" id="acct-search" placeholder="Search name or email" style="margin-bottom:10px;">
      <div id="accts"><p class="muted">Loading…</p></div>
    </div>

    <div class="section-label row between" style="margin-bottom:10px;">
      <span>Feedback</span><button class="btn ghost sm" id="fb-clear">Clear all</button>
    </div>
    <div class="card"><div id="fb-list"><p class="muted">Loading…</p></div></div>

    <div class="section-label">Import questions</div>
    <div class="card stack">
      <p class="small muted" style="margin:0;">Paste rows from a spreadsheet (comma or tab separated), one question per line:
        <code>subject, topic_id, prompt, answer, explanation, difficulty</code>. Subject is <code>maths</code> or <code>english</code>; difficulty is 1, 2 or 3.</p>
      <details><summary>Topic IDs</summary>
        <div class="small muted" style="margin-top:6px;">${QUIZ_TOPICS.map((t) => `<code>${t.id}</code> ${esc(t.name)}`).join("<br>")}</div>
      </details>
      <textarea id="import-text" style="font-family:monospace; font-size:13px;" placeholder="maths,y7-computation,What is 12 + 8?,20,Add the ones then the tens.,1"></textarea>
      <div class="row"><button class="btn" id="import-btn">Import</button><span class="small muted" id="import-status"></span></div>
      <div id="import-errors" class="small error"></div>
    </div>`;

  // ----- Accounts -----
  let accounts = [];
  const open = new Set(); // account ids with their action panel expanded
  const giving = new Set(); // account ids with the give form open
  const picked = new Set(); // account ids ticked for "Give to lots of people"
  let giveWho = "all";

  function statusTag(a) {
    if (a.deleted) return `<span class="tag bad">Deleted</span>`;
    if (!a.has_paid) return `<span class="tag bad">Not paid</span>`;
    if (!a.paid_until) return `<span class="tag good">Paid</span>`;
    const until = new Date(a.paid_until);
    return until > new Date()
      ? `<span class="tag good">Paid until ${fmtDate(until)}</span>`
      : `<span class="tag bad">Expired ${fmtDate(until)}</span>`;
  }

  function drawStats() {
    const live = accounts.filter((a) => !a.deleted);
    $("#admin-stats", view).innerHTML =
      statCard("Accounts", live.length) +
      statCard("Points awarded", live.reduce((n, a) => n + (a.points || 0), 0)) +
      statCard("Questions answered", live.reduce((n, a) => n + attemptedOf(a.progress), 0));
  }

  function drawAccounts() {
    const q = $("#acct-search", view).value.trim().toLowerCase();
    const list = accounts.filter((a) => !q || (a.username || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q));
    $("#accts", view).innerHTML = list.length ? list.map((a) => {
      const isMe = a.id === authUser.id;
      const btn = (act, label, cls = "secondary") => `<button class="btn ${cls} sm" data-act="${act}" data-id="${a.id}">${label}</button>`;
      return `
        <div class="list-row" style="${a.deleted ? "opacity:.5;" : ""}">
          ${a.deleted ? "" : `<input type="checkbox" class="pick-acct" data-pick="${a.id}" aria-label="Tick ${esc(a.username || a.email)} for gifts"${picked.has(a.id) ? " checked" : ""}>`}
          <div class="grow">
            <strong>${esc(a.username || "(no name)")}</strong>${isMe ? " (you)" : ""}${a.is_admin ? ` <span class="tag">admin</span>` : ""}
            <div class="muted small">${esc(a.email)} · ${a.points || 0} pts · ${a.xp || 0} XP${a.game_data ? ` · 🏅 ${Object.keys(a.game_data.badges || {}).length} badges` : ""} · ${attemptedOf(a.progress)} answered · seen ${timeAgo(a.last_seen)}</div>
          </div>
          ${statusTag(a)}
          <button class="btn ghost sm" data-toggle="${a.id}">${open.has(a.id) ? "Close" : "Manage"}</button>
          ${open.has(a.id) ? `
            <div class="row" style="flex-basis:100%; gap:6px;">
              ${btn("give", giving.has(a.id) ? "Close gifts" : "🎁 Give / take", "")}
              ${btn("add-points", "+10 pts")}${btn("set-points", "Set pts…")}
              ${btn("add-xp", "+10 XP")}${btn("set-xp", "Set XP…")}
              ${btn("renew", "Renew 6 months")}
              ${btn("toggle-admin", a.is_admin ? "Remove admin" : "Make admin")}
              ${btn("reset", "Reset progress")}
              ${isMe ? "" : btn("kick", a.has_paid ? "Kick" : "Unkick", "ghost")}
              ${isMe ? "" : btn("delete", "Delete account", "ghost")}
            </div>
            ${giving.has(a.id) ? `<div style="flex-basis:100%;">${giveFormHTML(a.id)}</div>` : ""}` : ""}
        </div>`;
    }).join("") : `<p class="muted">No accounts found.</p>`;
    $$("#accts [data-give]", view).forEach(wireGiveForm);
  }
  $("#acct-search", view).addEventListener("input", drawAccounts);

  // ----- Gifts -----
  const giveFail = (e) => (/game_data/.test(e?.message || "") ? GAME_DATA_SQL_HINT : e?.message || "Something went wrong.");
  async function runGive(box, targets) {
    const { items, note } = readGiveForm(box), status = $(".give-status", box), go = $("[data-give-go]", box);
    if (!items.length) return toast("Tick at least one thing to give.");
    if (items.some((g) => ["points", "xp"].includes(g.kind) && !g.amount)) return toast("Enter an amount for points or XP.");
    if (!targets.length) return toast("Tick at least one person in the list below.");
    const who = targets.length === 1 ? targets[0].username || targets[0].email : `${targets.length} people`;
    const label = giveLabel(items);
    if (!confirm(`Give ${who}: ${label}?`)) return;
    go.disabled = true;
    let done = 0;
    for (const a of targets) {
      try {
        Object.assign(a, await adminGive(a, items, note));
        done += 1;
        status.textContent = `Given to ${done} of ${targets.length}…`;
      } catch (e) {
        go.disabled = false;
        status.textContent = "";
        return alert(`Couldn't give to ${a.username || a.email}: ${giveFail(e)}`);
      }
    }
    go.disabled = false;
    toast(`🎁 Done! ${who}: ${label}`);
    if (targets.some((a) => a.id === authUser.id)) { const mine = targets.find((a) => a.id === authUser.id); me.points = mine.points ?? me.points; me.xp = mine.xp ?? me.xp; renderMeBox(); }
    drawStats();
    drawAccounts();
    status.textContent = "";
  }
  wireGiveForm($('[data-give="all"]', view));
  $('[data-give-go="all"]', view).addEventListener("click", (e) =>
    runGive(e.target.closest("[data-give]"), accounts.filter((a) => !a.deleted && (giveWho === "all" || picked.has(a.id)))));
  $$("#give-who [data-who]", view).forEach((b) => b.addEventListener("click", () => {
    giveWho = b.dataset.who;
    $$("#give-who [data-who]", view).forEach((x) => x.classList.toggle("active", x === b));
  }));
  $("#accts", view).addEventListener("change", (e) => {
    const box = e.target.closest("[data-pick]");
    if (!box) return;
    box.checked ? picked.add(box.dataset.pick) : picked.delete(box.dataset.pick);
    $("#give-n", view).textContent = picked.size;
    if (picked.size && giveWho !== "ticked") $('#give-who [data-who="ticked"]', view).click();
  });

  const sixMonthsFrom = (d) => { const x = new Date(d); x.setMonth(x.getMonth() + 6); return x.toISOString(); };
  const askNumber = (label) => {
    const val = prompt(label);
    if (val === null) return null;
    const n = parseInt(val, 10);
    if (isNaN(n)) { alert("Please enter a whole number."); return null; }
    return n;
  };

  $("#accts", view).addEventListener("click", async (e) => {
    const toggle = e.target.closest("[data-toggle]");
    if (toggle) {
      const id = toggle.dataset.toggle;
      open.has(id) ? open.delete(id) : open.add(id);
      return drawAccounts();
    }
    const giveGo = e.target.closest("[data-give-go]");
    if (giveGo) return runGive(giveGo.closest("[data-give]"), accounts.filter((x) => x.id === giveGo.dataset.giveGo));
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const a = accounts.find((x) => x.id === btn.dataset.id);
    if (btn.dataset.act === "give") { giving.has(a.id) ? giving.delete(a.id) : giving.add(a.id); return drawAccounts(); }
    const name = a.username || a.email;
    // Your own row may be stale if you've practised since this page loaded.
    if (a.id === authUser.id) { a.points = me.points; a.xp = me.xp; }
    let update = null;

    switch (btn.dataset.act) {
      case "add-points": update = { points: (a.points || 0) + 10 }; break;
      case "set-points": { const n = askNumber(`Set points for ${name}:`); if (n !== null) update = { points: n }; break; }
      case "add-xp": update = { xp: (a.xp || 0) + 10 }; break;
      case "set-xp": { const n = askNumber(`Set XP for ${name}:`); if (n !== null) update = { xp: n }; break; }
      case "renew": {
        // Extend from the later of today or the current expiry.
        const from = a.paid_until && new Date(a.paid_until) > new Date() ? a.paid_until : new Date();
        const until = sixMonthsFrom(from);
        if (confirm(`Renew ${name} until ${fmtDate(until)}?`)) update = { has_paid: true, paid_until: until, deleted: false };
        break;
      }
      case "toggle-admin":
        if (confirm(`${a.is_admin ? "Remove admin from" : "Make admin:"} ${name}?`)) update = { is_admin: !a.is_admin };
        break;
      case "reset":
        if (confirm(`Reset all points and progress for ${name}? This can't be undone.`)) update = { points: 0, progress: {} };
        break;
      case "kick":
        if (confirm(`${a.has_paid ? "Suspend" : "Reinstate"} ${name}?`)) update = a.has_paid ? { has_paid: false } : { has_paid: true, paid_until: sixMonthsFrom(new Date()) };
        break;
      case "delete":
        if (!confirm(`Delete ${name}'s account? They'll be removed from the leaderboard and lose access.`)) break;
        if (prompt(`To confirm, type "${name}" exactly:`) !== name) { alert("Name didn't match — nothing was deleted."); break; }
        update = { deleted: true, has_paid: false, is_admin: false };
        break;
    }
    if (!update) return;

    btn.disabled = true;
    const { error } = await sb.from("profiles").update(update).eq("id", a.id);
    if (error) { btn.disabled = false; return alert(`Couldn't update ${name}: ${error.message}`); }
    Object.assign(a, update);
    if (a.id === authUser.id) {
      if ("points" in update) me.points = update.points;
      if ("xp" in update) me.xp = update.xp;
      if ("progress" in update) me.progress = {};
      if ("is_admin" in update) { me.isAdmin = update.is_admin; return enterApp(); }
      renderMeBox();
    }
    drawStats();
    drawAccounts();
  });

  (async () => {
    let { data, error } = await sb.from("profiles").select("id, username, email, points, xp, has_paid, paid_until, is_admin, progress, last_seen, deleted, game_data");
    if (error) ({ data, error } = await sb.from("profiles").select("id, username, email, points, xp, has_paid, paid_until, is_admin, progress, last_seen, deleted"));
    if (error) ({ data, error } = await sb.from("profiles").select("id, username, email, points, xp, has_paid, paid_until, is_admin, progress"));
    if (error) { $("#accts", view).innerHTML = `<p class="muted">Couldn't load accounts.</p>`; return; }
    accounts = (data || []).sort((x, y) => (!!x.deleted - !!y.deleted) || (y.points || 0) - (x.points || 0));
    drawStats();
    drawAccounts();
  })();

  // ----- Announcements -----
  async function loadAnnouncements() {
    const box = $("#ann-list", view);
    const { data, error } = await sb.from("announcements").select("id, message, created_at, active").order("created_at", { ascending: false }).limit(10);
    if (error) {
      box.innerHTML = `<p class="small banner info" style="margin:0;">To turn on announcements, run <code>supabase/announcements.sql</code> once in Supabase (SQL Editor → New query → paste → Run).</p>`;
      $("#ann-send", view).disabled = true;
      return;
    }
    box.innerHTML = (data || []).map((a) => `
      <div class="list-row" style="${a.active ? "" : "opacity:.55;"}">
        <div class="grow"><strong>${esc(a.message)}</strong><div class="muted small">${fmtDateTime(a.created_at)}</div></div>
        ${a.active ? `<span class="tag good">Showing</span><button class="btn ghost sm" data-ann-off="${a.id}">Remove</button>` : `<span class="tag">Removed</span>`}
      </div>`).join("") || `<p class="muted small" style="margin:0;">No announcements yet.</p>`;
    $$("[data-ann-off]", box).forEach((b) => b.addEventListener("click", async () => {
      const { error: e2 } = await sb.from("announcements").update({ active: false }).eq("id", b.dataset.annOff);
      if (e2) return toast("Couldn't remove it.");
      loadAnnouncements();
    }));
  }
  $("#ann-send", view).addEventListener("click", async () => {
    const message = $("#ann-text", view).value.trim();
    if (!message) return toast("Type a message first.");
    if (!confirm(`Send this to everyone?\n\n"${message}"`)) return;
    // only one announcement shows at a time: retire the old ones
    await sb.from("announcements").update({ active: false }).eq("active", true);
    const { error } = await sb.from("announcements").insert({ message, created_by: authUser.id });
    if (error) return toast("Couldn't send — check announcements.sql has been run.");
    $("#ann-text", view).value = "";
    toast("Announcement sent");
    loadAnnouncements();
  });
  loadAnnouncements();

  // ----- Events -----
  const evStart = $("#ev-start", view);
  evStart.addEventListener("change", () => $("#ev-start-at", view).classList.toggle("hidden", evStart.value !== "later"));
  async function loadAdminEvents() {
    const box = $("#ev-list", view);
    const { data, error } = await sb.from("events").select("*").order("starts_at", { ascending: false }).limit(10);
    if (error) {
      box.innerHTML = `<p class="small banner info" style="margin:0;">To turn on events, run <code>supabase/events.sql</code> once in Supabase (SQL Editor → New query → paste → Run).</p>`;
      $("#ev-go", view).disabled = true;
      return;
    }
    const now = Date.now();
    box.innerHTML = (data || []).map((e) => {
      const start = new Date(e.starts_at), end = new Date(e.ends_at);
      const state = end <= now ? "ended" : start > now ? "soon" : "live";
      return `<div class="list-row" style="${state === "ended" ? "opacity:.55;" : ""}">
        <div class="grow"><strong>⚡ ${esc(eventName(e))}</strong> <span class="muted small">(${e.multiplier}× ${EVENT_KINDS[e.kind]?.label || ""} ${EVENT_KINDS[e.kind]?.note || ""})</span>
          <div class="muted small">${fmtDateTime(e.starts_at)} → ${fmtDateTime(e.ends_at)}</div></div>
        ${state === "live" ? `<span class="tag good">On now</span>` : state === "soon" ? `<span class="tag">Starts later</span>` : `<span class="tag">Ended</span>`}
        ${state !== "ended" ? `<button class="btn ghost sm" data-ev-end="${e.id}">${state === "live" ? "End now" : "Cancel"}</button>` : ""}
      </div>`;
    }).join("") || `<p class="muted small" style="margin:0;">No events yet.</p>`;
    $$("[data-ev-end]", box).forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("End this event now?")) return;
      const { error: e2 } = await sb.from("events").update({ ends_at: new Date().toISOString() }).eq("id", b.dataset.evEnd);
      if (e2) return toast("Couldn't end it.");
      toast("Event ended");
      loadAdminEvents();
      loadEvents();
    }));
  }
  $("#ev-go", view).addEventListener("click", async () => {
    const multiplier = +$("#ev-mult", view).value;
    const kind = $("#ev-kind", view).value;
    let start = new Date();
    if (evStart.value === "later") {
      const v = $("#ev-start-at", view).value;
      if (!v) return toast("Pick when the event starts.");
      start = new Date(v);
    }
    const len = $("#ev-len", view).value;
    let end;
    if (len === "day") { end = new Date(start); end.setHours(23, 59, 59, 0); }
    else end = new Date(start.getTime() + +len * 60000);
    if (end <= Date.now()) return toast("That event would already be over.");
    const title = $("#ev-title", view).value.trim() || null;
    const ev = { kind, multiplier, title, starts_at: start.toISOString(), ends_at: end.toISOString(), created_by: authUser.id };
    if (!confirm(`Start "${eventName(ev)}" (${multiplier}× ${EVENT_KINDS[kind].label} ${EVENT_KINDS[kind].note})\n${fmtDateTime(ev.starts_at)} → ${fmtDateTime(ev.ends_at)}?`)) return;
    const { error } = await sb.from("events").insert(ev);
    if (error) return toast("Couldn't start it — check events.sql has been run.");
    if ($("#ev-announce", view).checked) {
      const soon = start > Date.now() ? ` starts ${fmtDateTime(ev.starts_at)}` : " is ON now";
      await sb.from("announcements").update({ active: false }).eq("active", true);
      await sb.from("announcements").insert({ message: `⚡ ${eventName(ev)}${soon}! ${multiplier}× ${EVENT_KINDS[kind].label} ${EVENT_KINDS[kind].note} until ${fmtDateTime(ev.ends_at)}.`, created_by: authUser.id });
      loadAnnouncements();
    }
    $("#ev-title", view).value = "";
    toast("Event started");
    loadAdminEvents();
    loadEvents();
  });
  loadAdminEvents();

  // ----- Feedback -----
  async function loadFeedback() {
    const box = $("#fb-list", view);
    const { data, error } = await sb.from("feedback").select("*").order("created_at", { ascending: false });
    if (error) { box.innerHTML = `<p class="muted">Couldn't load feedback.</p>`; return; }
    if (!data.length) { box.innerHTML = `<p class="muted">No feedback yet.</p>`; return; }
    box.innerHTML = data.map((f) => `
      <div class="list-row" style="align-items:flex-start; ${f.completed ? "opacity:.6;" : ""}">
        <input type="checkbox" data-done="${f.id}" ${f.completed ? "checked" : ""} title="Mark done" style="margin-top:4px;">
        <div class="grow">
          <div><span class="tag">${esc(f.category)}</span> <strong>${esc(f.username)}</strong> <span class="muted small">${fmtDateTime(f.created_at)}</span></div>
          <div style="white-space:pre-wrap; margin-top:4px;">${esc(f.message)}</div>
          ${f.admin_reply ? `<div class="explain"><strong>Your reply:</strong> ${esc(f.admin_reply)}</div>` : ""}
          <div class="row" style="flex-wrap:nowrap; margin-top:8px;">
            <input type="text" data-reply-input="${f.id}" placeholder="${f.admin_reply ? "Update your reply…" : "Write a reply…"}">
            <button class="btn secondary sm" data-reply="${f.id}">Reply</button>
          </div>
        </div>
      </div>`).join("");
  }
  $("#fb-list", view).addEventListener("change", async (e) => {
    const cb = e.target.closest("[data-done]");
    if (!cb) return;
    const { error } = await sb.from("feedback").update({ completed: cb.checked }).eq("id", cb.dataset.done);
    if (error) { cb.checked = !cb.checked; return toast("Update failed."); }
    loadFeedback();
  });
  $("#fb-list", view).addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-reply]");
    if (!btn) return;
    const text = $(`[data-reply-input="${btn.dataset.reply}"]`, view).value.trim();
    if (!text) return toast("Write a reply first.");
    btn.disabled = true;
    const { error } = await sb.from("feedback").update({ admin_reply: text, replied_at: new Date().toISOString() }).eq("id", btn.dataset.reply);
    if (error) { btn.disabled = false; return toast("Couldn't send reply."); }
    toast("Reply sent");
    loadFeedback();
  });
  $("#fb-clear", view).addEventListener("click", async () => {
    if (!confirm("Delete all feedback? This can't be undone.")) return;
    const { error } = await sb.from("feedback").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return toast("Couldn't clear feedback.");
    loadFeedback();
  });
  loadFeedback();

  // ----- Bulk import -----
  $("#import-btn", view).addEventListener("click", async () => {
    const status = $("#import-status", view);
    const errBox = $("#import-errors", view);
    const rows = [];
    const errors = [];
    $("#import-text", view).value.split("\n").map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
      const parts = line.split(line.includes("\t") ? "\t" : ",").map((x) => x.trim());
      const [subject, topic_id, prompt, answer, explanation, diff] = parts;
      const difficulty = parseInt(diff, 10);
      if (parts.length < 6) return errors.push(`Line ${i + 1}: needs 6 columns, found ${parts.length}.`);
      if (!["maths", "english"].includes(subject)) return errors.push(`Line ${i + 1}: subject must be maths or english.`);
      if (!QUIZ_TOPICS.some((t) => t.id === topic_id)) return errors.push(`Line ${i + 1}: unknown topic_id "${topic_id}".`);
      if (![1, 2, 3].includes(difficulty)) return errors.push(`Line ${i + 1}: difficulty must be 1, 2 or 3.`);
      if (!prompt || !answer) return errors.push(`Line ${i + 1}: prompt and answer can't be empty.`);
      rows.push({ subject, topic_id, prompt, answer, explanation: explanation || "", difficulty, created_by: authUser.id });
    });
    errBox.innerHTML = errors.map(esc).join("<br>");
    if (!rows.length) { status.textContent = "No valid rows to import."; return; }
    status.textContent = `Importing ${rows.length}…`;
    const { error } = await sb.from("custom_questions").insert(rows);
    if (error) { console.error(error); status.textContent = "Import failed — see the browser console."; return; }
    status.textContent = `Imported ${rows.length} question${rows.length === 1 ? "" : "s"}.`;
    $("#import-text", view).value = "";
    loadCustomQuestions();
  });
}

// ---------------- Start ----------------
(function init() {
  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") showAuthPanel("reset");
  });
  if (location.hash.includes("type=recovery")) return showAuthPanel("reset");

  sb.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) handleAuthenticatedUser(session.user);
    else showAuthPanel("main");
  });
})();
