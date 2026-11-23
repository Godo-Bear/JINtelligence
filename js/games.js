/* =========================================================
   JINtelligence — Games
   Pick a subject (or General = every subject mixed), optionally some topics, and a game:
   · Against the clock: choose how many questions, how long, and how hard.
   · 3 Lives / Sudden death: questions get harder; run out of lives and it's over.
   · Survival clock: start with 30 seconds; right answers add time, wrong ones take it away.
   · Boss battle: right answers hit the boss, wrong answers hit you.
   · Millionaire ladder: 15 questions to a million, with 50:50 and Ask the AI.
   Extras: combo bonuses, badges, pause, fix-your-mistakes rounds, and friend challenge links.
   Uses the same questions, marking and points as Practice.
========================================================= */

const GAME_SUBJECTS = [
  { id: "general", name: "General", icon: "🌐", desc: "Every subject mixed together" },
  { id: "maths", name: "Maths", icon: "➗", desc: "Numbers, algebra, shapes and more" },
  { id: "english", name: "English", icon: "📖", desc: "Grammar, reading and words" },
  { id: "science", name: "Science", icon: "🔬", desc: "Forces, space, living things and more" },
];
const GAME_MODES = [
  { id: "clock", name: "Against the clock", icon: "⏱️", desc: "Pick how many questions, how long and how hard. Then challenge a friend!" },
  { id: "lives", name: "3 Lives", icon: "❤️", desc: "Questions get harder and harder. Three wrong answers and it's game over." },
  { id: "sudden", name: "Sudden death", icon: "💀", desc: "One life. One mistake and it's over. How far can you go?" },
  { id: "survival", name: "Survival clock", icon: "⌛", desc: "Start with 30 seconds. Right answers add 5 s, wrong ones take 5 s away." },
  { id: "boss", name: "Boss battle", icon: "👾", desc: "Right answers hit the boss. Wrong answers hit you. Who falls first?" },
  { id: "millionaire", name: "Millionaire ladder", icon: "💰", desc: "15 questions to a million coins, with 50:50 and Ask the AI lifelines." },
];
const MODE_NAMES = { ...Object.fromEntries(GAME_MODES.map((m) => [m.id, m.name])), mistakes: "Fix your mistakes", challenge: "Friend challenge" };
const MODE_ICONS = { ...Object.fromEntries(GAME_MODES.map((m) => [m.id, m.icon])), mistakes: "📚", challenge: "🤝" };
const GAME_COUNTS = [5, 10, 15, 20, 30, 50];
// "q" = seconds for each question, "t" = seconds for the whole game.
const GAME_TIMES = [
  { v: "q10", label: "10 seconds a question" }, { v: "q20", label: "20 seconds a question" },
  { v: "q30", label: "30 seconds a question" }, { v: "q60", label: "1 minute a question" },
  { v: "t60", label: "1 minute in total" }, { v: "t120", label: "2 minutes in total" },
  { v: "t180", label: "3 minutes in total" }, { v: "t300", label: "5 minutes in total" }, { v: "t600", label: "10 minutes in total" },
];
const GAME_DIFFS = [{ v: "mixed", label: "Mixed" }, { v: "1", label: "Easy" }, { v: "2", label: "Medium" }, { v: "3", label: "Hard" }];
const LEVEL_UP_EVERY = 3; // right answers needed to move up a difficulty
const LEVEL_NAMES = { 1: "Easy", 2: "Medium", 3: "Hard" };
const SURVIVAL_START = 30, SURVIVAL_STEP = 5;
const BOSS_HP = 100, PLAYER_HP = 100, BOSS_HIT = { 1: 10, 2: 15, 3: 20 }, PLAYER_HIT = 25;
const LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
const SAFE_STEPS = [5, 10]; // reaching these questions banks the prize
const COMBO_BONUS = (combo) => (combo % 5 ? 0 : combo >= 10 ? 50 : 25); // bonus points at 5, 10, 15… in a row

const GAME_BADGES = [
  { id: "first", icon: "🎮", name: "First game", desc: "Finish any game." },
  { id: "combo5", icon: "🔥", name: "On fire", desc: "Get 5 right in a row." },
  { id: "combo10", icon: "⚡", name: "Unstoppable", desc: "Get 10 right in a row." },
  { id: "perfect", icon: "🎯", name: "Perfect run", desc: "Get every question right in Against the clock (10 or more questions)." },
  { id: "speed", icon: "🏎️", name: "Speed demon", desc: "Score 80% or more with 10 seconds a question (10 or more questions)." },
  { id: "survivor", icon: "❤️", name: "Survivor", desc: "Reach Hard level in 3 Lives." },
  { id: "fearless", icon: "💀", name: "Fearless", desc: "Get 10 right in Sudden death." },
  { id: "timelord", icon: "⌛", name: "Time lord", desc: "Last 2 minutes in Survival clock." },
  { id: "slayer", icon: "👾", name: "Boss slayer", desc: "Defeat the boss." },
  { id: "million", icon: "💰", name: "Millionaire", desc: "Win the million in Millionaire ladder." },
  { id: "allrounder", icon: "🌐", name: "All-rounder", desc: "Get 10 right in one General game." },
  { id: "challenger", icon: "🤝", name: "Challenger", desc: "Beat a friend's challenge." },
  { id: "learner", icon: "📚", name: "Learner", desc: "Finish a Fix your mistakes round." },
];

const gameKey = (name) => `apex-game-${name}-${authUser.id}`;
const timeLabel = (v) => (GAME_TIMES.find((t) => t.v === v) || GAME_TIMES[1]).label;
const fmtCoins = (n) => "🪙 " + n.toLocaleString(uiLocale());
const clockText = (sec) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;
const lowerIsBetter = (mode) => mode === "boss"; // boss: fewest questions to win
function bestId(s) {
  const t = s.topics?.length ? ":" + [...s.topics].sort().join(",") : "";
  return s.mode === "clock" ? `clock:${s.subject}${t}:${s.count}:${s.time}:${s.diff}` : `${s.mode}:${s.subject}${t}`;
}
function bestText(mode, v, s) {
  if (mode === "clock") return `${v}/${s.count}`;
  if (mode === "millionaire") return fmtCoins(v);
  if (mode === "boss") return `won in ${v} questions`;
  return `${v} right`;
}

// Topics for a subject ("general" = all), then every bank question in them that suits a game.
const subjectTopics = (subject) => QUIZ_TOPICS.filter((t) => (subject === "general" || t.subject === subject) && (typeof topicAllowed !== "function" || topicAllowed(t)));
function gamePool(s) {
  const topics = subjectTopics(s.subject).filter((t) => !s.topics?.length || s.topics.includes(t.id));
  const diff = s.mode === "clock" && s.diff && s.diff !== "mixed" ? +s.diff : 0;
  return topics.flatMap((topic) => topic.questions
    .filter((q) => q.answerType !== "written" && (!diff || q.difficulty === diff))
    .map((q) => ({ q, topic })));
}
function findBankQuestion(id) {
  for (const topic of QUIZ_TOPICS) { const q = topic.questions.find((x) => x.id === id); if (q) return { q, topic }; }
  return null;
}

// Friend challenge links: the same questions, in the same order, with the same time.
function challengeCode(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function readChallenge(code) {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch (e) { return null; }
}
const challengeLink = (code) => `${location.origin}${location.pathname}#/games/challenge/${code}`;

function badgesHTML(earned) {
  return `<div class="badge-grid">${GAME_BADGES.map((b) => `
    <div class="g-badge${earned[b.id] ? " on" : ""}" title="${esc(b.desc)}">
      <span class="g-badge-ico">${earned[b.id] ? b.icon : "🔒"}</span><b>${b.name}</b><span>${b.desc}</span>
    </div>`).join("")}</div>`;
}

// ---------------- Setup page ----------------
function pageGames(view, arg, arg2) {
  if (arg === "challenge" && arg2) return challengeIntro(view, arg2);
  const saved = store(gameKey("settings")) || {};
  const s = {
    subject: GAME_SUBJECTS.some((x) => x.id === saved.subject) ? saved.subject : "general",
    topics: Array.isArray(saved.topics) ? saved.topics : [],
    mode: GAME_MODES.some((x) => x.id === saved.mode) ? saved.mode : "clock",
    count: GAME_COUNTS.includes(saved.count) ? saved.count : 10,
    time: GAME_TIMES.some((t) => t.v === saved.time) ? saved.time : "q20",
    diff: GAME_DIFFS.some((d) => d.v === saved.diff) ? saved.diff : "mixed",
  };
  const best = store(gameKey("best")) || {};
  const earned = store(gameKey("badges")) || {};
  const nBadges = GAME_BADGES.filter((b) => earned[b.id]).length;

  view.innerHTML = `
    <div class="page-head"><h1>Games</h1><p>Pick a subject and a game. Every right answer earns points, and 5 in a row earns a bonus.</p></div>
    <div class="card stack game-setup">
      <div>
        <label class="field">1. Choose a subject</label>
        <div class="game-pick cols-4" id="g-subjects">
          ${GAME_SUBJECTS.map((x) => `<button type="button" class="game-opt" data-subject="${x.id}" aria-pressed="false">
            <span class="g-ico">${x.icon}</span><b>${x.name}</b><span class="muted small">${x.desc}</span></button>`).join("")}
        </div>
        <div class="g-topics">
          <div class="row between"><span class="small" id="g-topic-summary"></span>
            <button class="btn ghost sm" type="button" id="g-topic-toggle" aria-expanded="false">Choose topics</button></div>
          <div class="hidden" id="g-topic-list"></div>
        </div>
      </div>
      <div>
        <label class="field">2. Choose a game</label>
        <div class="game-pick cols-3" id="g-modes">
          ${GAME_MODES.map((x) => `<button type="button" class="game-opt" data-mode="${x.id}" aria-pressed="false">
            <span class="g-ico">${x.icon}</span><b>${x.name}</b><span class="muted small">${x.desc}</span></button>`).join("")}
        </div>
      </div>
      <div id="g-clock-opts" class="grid game-opts">
        <div><label class="field" for="g-count">Questions</label>
          <select id="g-count">${GAME_COUNTS.map((n) => `<option value="${n}"${n === s.count ? " selected" : ""}>${n} questions</option>`).join("")}</select></div>
        <div><label class="field" for="g-time">Time</label>
          <select id="g-time">
            <optgroup label="For each question">${GAME_TIMES.filter((t) => t.v[0] === "q").map((t) => `<option value="${t.v}"${t.v === s.time ? " selected" : ""}>${t.label}</option>`).join("")}</optgroup>
            <optgroup label="For the whole game">${GAME_TIMES.filter((t) => t.v[0] === "t").map((t) => `<option value="${t.v}"${t.v === s.time ? " selected" : ""}>${t.label}</option>`).join("")}</optgroup>
          </select></div>
        <div><label class="field" for="g-diff">Difficulty</label>
          <select id="g-diff">${GAME_DIFFS.map((d) => `<option value="${d.v}"${d.v === s.diff ? " selected" : ""}>${d.label}</option>`).join("")}</select></div>
      </div>
      <div id="g-rules" class="game-rules"></div>
      <div class="row between">
        <span class="muted small" id="g-best"></span>
        <button class="btn" type="button" id="g-start">Start game →</button>
      </div>
      <p class="error hidden" id="g-error"></p>
    </div>
    <h2 class="g-section">Badges <span class="muted small">${nBadges} of ${GAME_BADGES.length} earned</span></h2>
    <div class="card">${badgesHTML(earned)}</div>`;

  const RULES = {
    lives: [`❤️❤️❤️ You start with 3 lives.`, `📈 Every ${LEVEL_UP_EVERY} right answers, the questions level up: Easy → Medium → Hard.`, `💀 Lose all 3 lives and the game ends.`],
    sudden: [`🖤 Just one life.`, `📈 Questions level up every ${LEVEL_UP_EVERY} right answers.`, `💀 One wrong answer ends the game.`],
    survival: [`⌛ You start with ${SURVIVAL_START} seconds.`, `✅ Right answer: +${SURVIVAL_STEP} s. ❌ Wrong answer: −${SURVIVAL_STEP} s.`, `📈 Questions get harder as you go. Keep the clock alive!`],
    boss: [`👾 The boss has ${BOSS_HP} HP. Right answers hit it: Easy 10, Medium 15, Hard 20.`, `💥 Each wrong answer costs you ${PLAYER_HIT} of your ${PLAYER_HP} HP.`, `🏆 Knock the boss out before it knocks you out.`],
    millionaire: [`💰 15 questions, from 🪙 100 up to 🪙 1,000,000. They get harder as you climb.`, `🛟 Question 5 and question 10 are safe: you keep that prize even if you slip later.`, `🎁 Lifelines: 50:50 (multiple choice only) and Ask the AI for a hint. One of each.`],
  };
  const topicSummary = () => {
    const all = subjectTopics(s.subject);
    $("#g-topic-summary", view).innerHTML = s.topics.length ? `Topics: <b>${s.topics.length} of ${all.length}</b> chosen` : `Topics: <b>all ${all.length}</b>`;
  };
  const drawTopicList = () => {
    const groups = s.subject === "general" ? ["maths", "english", "science"] : [s.subject];
    $("#g-topic-list", view).innerHTML = groups.map((g) => {
      const ts = subjectTopics(s.subject).filter((t) => t.subject === g);
      return `<div class="g-topic-group">${s.subject === "general" ? `<span class="field">${GAME_SUBJECTS.find((x) => x.id === g).name}</span>` : ""}
        <div class="checklist">${ts.map((t) => `<label class="chip-check"><input type="checkbox" value="${t.id}"${s.topics.includes(t.id) ? " checked" : ""}> ${t.icon} ${esc(t.name)}</label>`).join("")}</div></div>`;
    }).join("") + `<button class="btn ghost sm" type="button" id="g-topic-all">Use all topics</button>`;
    $$("#g-topic-list input", view).forEach((b) => b.addEventListener("change", () => {
      s.topics = $$("#g-topic-list input:checked", view).map((x) => x.value); topicSummary(); draw();
    }));
    $("#g-topic-all", view).addEventListener("click", () => { s.topics = []; drawTopicList(); topicSummary(); draw(); });
  };
  const draw = () => {
    $$("[data-subject]", view).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.subject === s.subject)));
    $$("[data-mode]", view).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === s.mode)));
    $("#g-clock-opts", view).classList.toggle("hidden", s.mode !== "clock");
    $("#g-rules", view).classList.toggle("hidden", s.mode === "clock");
    $("#g-rules", view).innerHTML = (RULES[s.mode] || []).map((r) => `<span>${r}</span>`).join("");
    const b = best[bestId(s)];
    $("#g-best", view).textContent = b == null ? "No best score yet for this game." : `🏆 Your best: ${bestText(s.mode, b, s)}`;
  };
  $$("[data-subject]", view).forEach((b) => b.addEventListener("click", () => {
    if (s.subject !== b.dataset.subject) { s.subject = b.dataset.subject; s.topics = []; drawTopicList(); topicSummary(); }
    draw();
  }));
  $("#g-topic-toggle", view).addEventListener("click", (e) => {
    const list = $("#g-topic-list", view), open = list.classList.toggle("hidden") === false;
    e.target.setAttribute("aria-expanded", String(open));
    e.target.textContent = open ? "Hide topics" : "Choose topics";
  });
  $$("[data-mode]", view).forEach((b) => b.addEventListener("click", () => { s.mode = b.dataset.mode; draw(); }));
  $("#g-count", view).addEventListener("change", (e) => { s.count = +e.target.value; draw(); });
  $("#g-time", view).addEventListener("change", (e) => { s.time = e.target.value; draw(); });
  $("#g-diff", view).addEventListener("change", (e) => { s.diff = e.target.value; draw(); });
  $("#g-start", view).addEventListener("click", () => {
    if (!gamePool(s).length) return setMsg($("#g-error", view), "No questions match those choices. Try more topics or a different difficulty.", "error");
    store(gameKey("settings"), s);
    playGame(view, { ...s });
  });
  drawTopicList(); topicSummary(); draw();
}

// Opening a friend's challenge link.
function challengeIntro(view, code) {
  const c = readChallenge(code);
  const items = (c?.ids || []).map(findBankQuestion).filter(Boolean);
  if (!c || !items.length) {
    view.innerHTML = `<div class="page-head"><h1>Friend challenge</h1></div>
      <div class="card stack"><p>That challenge link didn't work. Ask your friend to send it again.</p><a class="btn" href="#/games">Go to Games</a></div>`;
    return;
  }
  const subject = GAME_SUBJECTS.find((x) => x.id === c.s) || GAME_SUBJECTS[0];
  view.innerHTML = `
    <div class="page-head"><h1>🤝 Friend challenge</h1><p>Same questions, same time. Can you beat them?</p></div>
    <div class="card game-over">
      <div class="g-big">${esc(c.n || "A friend")} scored ${c.sc}/${items.length}</div>
      <div class="muted">${subject.icon} ${subject.name} · ${items.length} questions · ${timeLabel(c.t)}</div>
      <div class="row" style="justify-content:center; margin-top:10px;"><button class="btn" type="button" id="g-accept">Accept the challenge →</button>
        <a class="btn secondary" href="#/games">Not now</a></div>
    </div>`;
  $("#g-accept", view).addEventListener("click", () =>
    playGame(view, { subject: subject.id, topics: [], mode: "challenge", count: items.length, time: c.t, diff: "mixed" }, { items, challenge: c }));
}

// ---------------- Playing ----------------
function playGame(view, s, extra = {}) {
  const subject = GAME_SUBJECTS.find((x) => x.id === s.subject) || GAME_SUBJECTS[0];
  const mode = s.mode;
  const fixed = ["clock", "mistakes", "challenge"].includes(mode);
  const progressive = ["lives", "sudden", "survival", "boss"].includes(mode);
  const timedQ = (mode === "clock" || mode === "challenge") && s.time[0] === "q" ? +s.time.slice(1) : 0;
  const timedTotal = (mode === "clock" || mode === "challenge") && s.time[0] === "t" ? +s.time.slice(1) : 0;
  const pool = extra.items || gamePool(s);
  if (!pool.length) { toast("No questions match those choices."); return pageGames(view); }

  // Question order: a fixed list, a queue per difficulty that levels up, or the millionaire ladder.
  const list = fixed ? (extra.items || shuffle(pool).slice(0, s.count)) : null;
  const queues = { 1: [], 2: [], 3: [] };
  if (progressive) shuffle(pool).forEach((x) => (queues[x.q.difficulty] || queues[2]).push(x));
  let ladder = null;
  if (mode === "millionaire") {
    const pick = (d, n) => {
      const ofDiff = shuffle(pool.filter((x) => x.q.difficulty === d));
      const mc = ofDiff.filter((x) => x.q.options), rest = ofDiff.filter((x) => !x.q.options);
      return [...mc, ...rest].slice(0, n);
    };
    ladder = [...pick(1, 5), ...pick(2, 5), ...pick(3, 5)];
    // Top up from any difficulty if a topic is small.
    if (ladder.length < 15) ladder.push(...shuffle(pool.filter((x) => !ladder.includes(x))).slice(0, 15 - ladder.length));
    ladder = ladder.slice(0, 15);
  }

  const st = {
    right: 0, combo: 0, bestCombo: 0, bonus: 0, results: [], answers: [], over: false, current: null, paused: false,
    lives: mode === "lives" ? 3 : 1, level: 1, i: 0,
    left: timedQ, total: mode === "survival" ? SURVIVAL_START : timedTotal, survived: 0,
    bossHP: BOSS_HP, hp: PLAYER_HP, boss: GAME_BOSSES[Math.floor(Math.random() * GAME_BOSSES.length)],
    step: 0, fifty: true, ai: true, won: false,
  };
  const pausable = !!(timedQ || timedTotal || mode === "survival");
  let tick = null, waiting = false, nextTimer = null;
  leaveWarning = "Leave the game? Your score won't be saved.";

  view.innerHTML = `
    <div class="game-hud card">
      <div class="g-title"><span class="g-ico">${MODE_ICONS[mode]}</span><div><b>${MODE_NAMES[mode]}</b><span class="muted small">${subject.icon} ${subject.name}</span></div></div>
      <div class="g-stats" id="g-stats"></div>
    </div>
    ${mode === "boss" ? `
    <div class="boss-scene" id="g-boss">
      <svg class="bs-bg" viewBox="0 0 800 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path class="bs-far" d="M0 170 L60 120 L110 150 L170 70 L230 140 L300 95 L360 150 L430 60 L500 130 L560 90 L620 145 L690 75 L760 130 L800 110 V300 H0 Z"/>
        <path class="bs-mid" d="M0 230 L70 180 L120 210 L190 160 L260 220 L640 225 L700 170 L760 200 L800 185 V300 H0 Z"/>
        <defs><linearGradient id="bs-mist-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--bs-mist)" stop-opacity="0"/><stop offset="1" stop-color="var(--bs-mist)" stop-opacity=".9"/></linearGradient></defs>
        <path class="bs-cliff-side" d="M78 222 Q360 206 652 214 L640 236 Q610 262 560 276 Q500 300 420 300 L300 300 Q220 292 170 270 Q120 252 92 238 Z"/>
        <path class="bs-cliff-shade" d="M180 262 Q300 284 420 282 Q520 280 600 252 L560 276 Q500 300 420 300 L300 300 Q220 292 170 270 Z"/>
        <path class="bs-cliff-top" d="M66 216 Q360 186 664 204 L656 220 Q360 204 76 232 Z"/>
        <path class="bs-crack" d="M300 226 L292 252 L304 272 M480 220 L488 246 L478 264"/>
        <rect x="0" y="200" width="800" height="100" fill="url(#bs-mist-g)"/>
      </svg>
      <div class="bs-hud you"><b>You</b><div class="hp"><div class="hp-fill you" id="g-hp-you"></div></div><span id="g-hp-you-n"></span></div>
      <div class="bs-hud boss"><b>${st.boss.name}</b><div class="hp"><div class="hp-fill boss" id="g-hp-boss"></div></div><span id="g-hp-boss-n"></span></div>
      <div class="bs-char bs-player" id="g-player">${GAME_PLAYER_SVG}</div>
      <div class="bs-char bs-enemy" id="g-enemy">${st.boss.svg}</div>
      <div class="bs-msg" id="g-bs-msg">Answer questions to attack!</div>
    </div>` : ""}
    ${mode === "millionaire" ? `<div class="card ladder-bar" id="g-ladder"></div>` : ""}
    <div class="time-bar hidden" id="g-bar"><div></div></div>
    <div class="game-stage">
      <form class="card game-card" id="g-form" autocomplete="off"></form>
      <div class="pause-cover hidden" id="g-pause-cover"><b>⏸ Paused</b><span class="muted">The question is hidden while you're paused.</span><button class="btn" type="button" id="g-resume">▶ Resume</button></div>
    </div>
    <div class="row between" style="margin-top:12px;">
      <button class="btn ghost" type="button" id="g-quit">End game</button>
      <span class="muted small">Press Enter to check your answer.</span>
    </div>`;
  const form = $("#g-form", view), stats = $("#g-stats", view), bar = $("#g-bar", view);
  window.scrollTo(0, 0);
  if (mode === "boss") drawBoss();

  function drawStats() {
    const combo = st.combo >= 2 ? `<span class="pill-stat combo">🔥 x${st.combo}</span>` : "";
    const pause = pausable ? `<button class="btn ghost sm" type="button" id="g-pause">${st.paused ? "▶ Resume" : "⏸ Pause"}</button>` : "";
    const timer = (sec, low) => `<span class="timer pill-stat${sec <= low ? " low" : ""}">⏱ ${clockText(sec)}</span>`;
    const score = `<span class="pill-stat">Score <b>${st.right}</b></span>`;
    let html = "";
    if (fixed) html = `<span class="pill-stat">Question <b>${Math.min(st.i + 1, list.length)}/${list.length}</b></span>${score}${combo}${timedQ || timedTotal ? timer(timedQ ? st.left : st.total, 5) : ""}`;
    else if (mode === "lives" || mode === "sudden") html = `<span class="hearts" aria-label="${st.lives} ${st.lives === 1 ? "life" : "lives"} left">${"❤️".repeat(st.lives)}<span class="lost">${"🖤".repeat((mode === "lives" ? 3 : 1) - st.lives)}</span></span>
      <span class="pill-stat">Level <b>${LEVEL_NAMES[st.level]}</b></span>${score}${combo}`;
    else if (mode === "survival") html = `${timer(st.total, 10)}<span class="pill-stat">Level <b>${LEVEL_NAMES[st.level]}</b></span>${score}${combo}`;
    else if (mode === "boss") html = `<span class="pill-stat">Level <b>${LEVEL_NAMES[st.level]}</b></span>${score}${combo}`;
    else if (mode === "millionaire") html = `<span class="pill-stat">Question <b>${Math.min(st.step + 1, 15)}/15</b></span><span class="pill-stat">For <b>${fmtCoins(LADDER[Math.min(st.step, 14)])}</b></span>${combo}`;
    stats.innerHTML = html + pause;
    $("#g-pause", stats)?.addEventListener("click", togglePause);
    if (mode === "millionaire") drawLadder();
  }
  function drawBar() {
    const frac = timedQ ? st.left / timedQ : timedTotal ? st.total / timedTotal : mode === "survival" ? Math.min(1, st.total / 60) : 0;
    $("div", bar).style.width = `${Math.max(0, frac) * 100}%`;
    bar.classList.toggle("low", timedQ || timedTotal ? frac <= 0.25 : st.total <= 10);
  }
  function drawBoss() {
    if (!$("#g-hp-boss", view)) return; // the game has already ended
    $("#g-hp-boss", view).style.width = `${(st.bossHP / BOSS_HP) * 100}%`;
    $("#g-hp-you", view).style.width = `${(st.hp / PLAYER_HP) * 100}%`;
    $("#g-hp-boss-n", view).textContent = `${st.bossHP} HP`;
    $("#g-hp-you-n", view).textContent = `${st.hp} HP`;
  }
  // Throws something from one fighter to the other in an arc, then shows the hit.
  function throwAt(fromEl, toEl, label, cls, damage) {
    const scene = $("#g-boss", view);
    if (!scene) return;
    const sr = scene.getBoundingClientRect(), a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    const p = document.createElement("span");
    p.className = `bs-shot ${cls}`;
    p.textContent = label;
    scene.appendChild(p);
    const x0 = a.left + a.width / 2 - sr.left, y0 = a.top + a.height * 0.35 - sr.top;
    const x1 = b.left + b.width / 2 - sr.left, y1 = b.top + b.height * 0.4 - sr.top;
    const lift = Math.max(40, Math.abs(x1 - x0) * 0.25);
    const at = (x, y, r) => `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${r}deg)`;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anim = p.animate([
      { transform: at(x0, y0, 0), opacity: 0 },
      { transform: at(x0, y0, 0), opacity: 1, offset: 0.08 },
      { transform: at((x0 + x1) / 2, Math.min(y0, y1) - lift, 180), offset: 0.5 },
      { transform: at(x1, y1, 360), opacity: 1 },
    ], { duration: reduce ? 1 : 650, easing: "cubic-bezier(.3,.1,.5,1)", fill: "forwards" });
    fromEl.classList.remove("throw"); void fromEl.offsetWidth; fromEl.classList.add("throw");
    anim.onfinish = () => {
      p.remove();
      if (!scene.isConnected) return; // the results are already showing
      toEl.classList.remove("hurt"); void toEl.offsetWidth; toEl.classList.add("hurt");
      const dmg = document.createElement("span");
      dmg.className = `bs-dmg ${cls}`;
      dmg.textContent = `−${damage}`;
      dmg.style.left = `${x1}px`; dmg.style.top = `${y1 - 30}px`;
      scene.appendChild(dmg);
      setTimeout(() => dmg.remove(), 1000);
      drawBoss();
      if (st.bossHP <= 0) $("#g-enemy", view)?.classList.add("ko");
      if (st.hp <= 0) $("#g-player", view)?.classList.add("ko");
    };
  }
  function drawLadder() {
    const safe = SAFE_STEPS.filter((n) => st.step >= n).pop();
    $("#g-ladder", view).innerHTML = `
      <div class="ladder">${LADDER.map((v, i) => `<span class="rung${i < st.step ? " done" : ""}${i === st.step && !st.over ? " now" : ""}${SAFE_STEPS.includes(i + 1) ? " safe" : ""}" title="Question ${i + 1}: ${v.toLocaleString(uiLocale())}">${i + 1}</span>`).join("")}</div>
      <div class="row between small"><span>Banked: <b>${safe ? fmtCoins(LADDER[safe - 1]) : "🪙 0"}</b></span>
        <span class="lifelines">
          <button class="btn ghost sm" type="button" id="g-fifty"${st.fifty && !waiting ? "" : " disabled"}>50:50</button>
          <button class="btn ghost sm" type="button" id="g-ai"${st.ai && !waiting ? "" : " disabled"}>🤖 Ask the AI</button>
          <button class="btn ghost sm" type="button" id="g-walk"${st.step > 0 && !waiting ? "" : " disabled"}>💰 Walk away</button>
        </span></div>`;
    $("#g-fifty", view).addEventListener("click", useFifty);
    $("#g-ai", view).addEventListener("click", useAI);
    $("#g-walk", view).addEventListener("click", () => endGame(`You walked away with ${fmtCoins(LADDER[st.step - 1])}.`, { walked: true }));
  }

  function nextProgressive() {
    for (const lv of [st.level, st.level + 1, st.level - 1, 3, 2, 1]) if (queues[lv]?.length) return queues[lv].shift();
    return null;
  }
  function nextQuestion() {
    clearTimeout(nextTimer);
    waiting = false;
    if (st.over) return;
    const item = fixed ? list[st.i] : mode === "millionaire" ? ladder[st.step] : nextProgressive();
    if (!item) return endGame(fixed ? "" : mode === "millionaire" ? "There weren't enough questions for the whole ladder." : "You answered every question. Legend!");
    st.current = item;
    form.classList.remove("flash-good", "flash-bad");
    form.innerHTML = `
      ${questionHTML(item.q, st.results.length, `${item.topic.icon || ""} ${item.topic.name} · ${DIFF_NAMES[item.q.difficulty]}`, !!item.q.passage)}
      <div class="explain hidden" id="g-hint"></div>
      <div class="row" style="margin-top:14px;" id="g-actions"><button class="btn" type="submit" id="g-check">Check</button></div>`;
    wireQuestions(form, [item.q]);
    $(FOCUS_SEL, form)?.focus({ preventScroll: true });
    if (timedQ) st.left = timedQ;
    if (timedQ || timedTotal || mode === "survival") show(bar);
    drawStats(); drawBar();
  }

  function useFifty() {
    const q = st.current?.q;
    if (!st.fifty || waiting) return;
    if (!q?.options || q.options.length < 3) return toast("50:50 only works on multiple choice questions.");
    st.fifty = false;
    const right = String(displayAnswer(q));
    shuffle($$(".mc-opt", form).filter((l) => $("input", l).value !== right)).slice(0, q.options.length - 2)
      .forEach((l) => { l.classList.add("gone"); $("input", l).disabled = true; });
    drawLadder();
  }
  async function useAI() {
    const q = st.current?.q;
    if (!st.ai || waiting || !q) return;
    st.ai = false; drawLadder();
    const box = $("#g-hint", form);
    show(box); box.textContent = "🤖 Thinking of a hint…";
    try {
      const hint = await askTutor(`Give the student ONE short hint (one or two sentences) for this question. Do NOT give the answer or say which option is right. ${learnerLine("Year 7")}\nQuestion: ${q.prompt}${q.options ? "\nOptions: " + q.options.join(" | ") : ""}${q.passage ? "\nPassage: " + q.passage : ""}`);
      if (box.isConnected) box.textContent = "🤖 Hint: " + hint;
    } catch (e) {
      if (box.isConnected) box.textContent = "🤖 " + (e.userMessage || "The AI couldn't give a hint right now.");
    }
  }

  function togglePause() {
    if (st.over) return;
    st.paused = !st.paused;
    $("#g-pause-cover", view).classList.toggle("hidden", !st.paused);
    form.classList.toggle("paused", st.paused);
    drawStats();
    if (st.paused) $("#g-resume", view).focus();
    else $(FOCUS_SEL, form)?.focus({ preventScroll: true });
  }
  $("#g-resume", view).addEventListener("click", togglePause);

  function answerOf() { return $("input[data-qid], textarea[data-qid]", form)?.value ?? ""; }
  function check(timedOut = false) {
    if (waiting || st.over || st.paused || !st.current) return;
    const raw = answerOf();
    if (!timedOut && !String(raw).trim()) { toast("Pick or type an answer first."); return; }
    waiting = true;
    const { q, topic } = st.current;
    const correct = !timedOut && isAnswerCorrect(q, raw);
    st.results.push({ q, topic, correct });
    st.answers.push(raw);
    const row = $(".question", form);
    markQuestion(row, q, correct, { yourAnswer: raw });
    if (timedOut) $(".q-result", row).textContent = `⏰ Time's up! The answer is ${displayAnswer(q)}`;
    form.classList.add(correct ? "flash-good" : "flash-bad");

    // Combo bonus: extra points at 5, 10, 15… right in a row.
    if (correct) {
      st.right += 1; st.combo += 1; st.bestCombo = Math.max(st.bestCombo, st.combo);
      const bonus = COMBO_BONUS(st.combo);
      if (bonus) { st.bonus += bonus; toast(`🔥 ${st.combo} in a row! +${bonus} bonus points`); }
    } else st.combo = 0;

    let done = false, why = "";
    if (fixed) { st.i += 1; done = st.i >= list.length; }
    if (progressive && correct && st.right % LEVEL_UP_EVERY === 0 && st.level < 3) { st.level += 1; toast(`Level up! Now ${LEVEL_NAMES[st.level]} ⬆️`); }
    if (mode === "lives" || mode === "sudden") { if (!correct) st.lives -= 1; done = st.lives <= 0; why = "Out of lives!"; }
    if (mode === "survival") {
      st.total = Math.max(0, st.total + (correct ? SURVIVAL_STEP : -SURVIVAL_STEP));
      floatText(correct ? `+${SURVIVAL_STEP}s` : `−${SURVIVAL_STEP}s`, correct);
      done = st.total <= 0; why = "The clock ran out!";
    }
    if (mode === "boss") {
      if (correct) st.bossHP = Math.max(0, st.bossHP - (BOSS_HIT[q.difficulty] || 15));
      else st.hp = Math.max(0, st.hp - PLAYER_HIT);
      const shot = correct ? (isVisualInput(q) ? "⭐" : String(yourAnswerText(q, raw) || "⭐")) : "🔥";
      throwAt(correct ? $("#g-player", view) : $("#g-enemy", view), correct ? $("#g-enemy", view) : $("#g-player", view),
        correct ? (shot.length > 18 ? shot.slice(0, 17) + "…" : shot) : "🔥", correct ? "good" : "bad",
        correct ? (BOSS_HIT[q.difficulty] || 15) : PLAYER_HIT);
      $("#g-bs-msg", view).textContent = correct ? "Direct hit!" : "Ouch! The boss hit back.";
      if (st.bossHP <= 0) { done = true; st.won = true; why = "You defeated the boss! 🎉"; }
      else if (st.hp <= 0) { done = true; why = "The boss knocked you out. Try again!"; }
    }
    if (mode === "millionaire") {
      if (correct) { st.step += 1; if (st.step >= 15) { done = true; st.won = true; why = "You won the million! 🎉"; } }
      else { done = true; why = "Wrong answer. The ladder ends here."; }
    }
    drawStats(); drawBar();
    const actions = $("#g-actions", form);
    actions.innerHTML = `<button class="btn" type="button" id="g-next">${done ? "See results →" : "Next question →"}</button>`;
    $("#g-next", form).addEventListener("click", () => (done ? endGame(why) : nextQuestion()));
    $("#g-next", form).focus({ preventScroll: true });
    // Right answers move on by themselves; wrong ones wait so you can read the answer.
    if (correct && !done) nextTimer = setTimeout(nextQuestion, 900);
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); waiting ? $("#g-next", form)?.click() : check(); });

  function floatText(text, good) {
    const el = document.createElement("span");
    el.className = `float-text ${good ? "good" : "bad"}`;
    el.textContent = text;
    stats.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  tick = setInterval(() => {
    if (st.over || st.paused) return;
    if (timedTotal) {
      st.total -= 1; // the whole-game clock keeps running, even while you read an answer
      if (st.total <= 0) { drawStats(); drawBar(); return endGame("Time's up!"); }
    }
    if (mode === "survival" && !waiting) {
      st.total -= 1; st.survived += 1;
      if (st.total <= 0) { drawStats(); drawBar(); return endGame("The clock ran out!"); }
    }
    if (timedQ && !waiting) {
      st.left -= 1;
      if (st.left <= 0) { st.left = 0; check(true); }
    }
    if (pausable) { drawStats(); drawBar(); }
  }, 1000);
  cleanup = () => { clearInterval(tick); clearTimeout(nextTimer); };

  $("#g-quit", view).addEventListener("click", () => {
    if (!st.results.length) { leaveWarning = null; return route(); }
    if (confirm("End the game now? You'll still get points for what you've answered.")) endGame("You ended the game.", { quit: true });
  });

  function endGame(message, { walked = false, quit = false } = {}) {
    if (st.over) return;
    st.over = true;
    clearInterval(tick); clearTimeout(nextTimer);
    leaveWarning = null;
    flushPendingAnnouncement();
    const answered = st.results.length;
    let earned = answered ? recordResults(st.results) : 0;
    if (st.bonus) { me.points += st.bonus; me.xp += st.bonus; earned += st.bonus; saveProgress(); renderMeBox(); }
    const pct = answered ? Math.round((st.right / answered) * 100) : 0;
    const safe = SAFE_STEPS.filter((n) => st.step >= n).pop();
    const coins = mode === "millionaire" ? (st.won || walked ? LADDER[st.step - 1] : safe ? LADDER[safe - 1] : 0) : 0;

    // Best score (not for mistakes rounds or challenges).
    let score = mode === "millionaire" ? coins : mode === "boss" ? (st.won ? answered : null) : st.right;
    const bests = store(gameKey("best")) || {};
    const key = bestId(s), prev = bests[key];
    const counts = !["mistakes", "challenge"].includes(mode) && answered > 0 && score != null && !(quit && mode === "boss");
    const isBest = counts && (prev == null || (lowerIsBetter(mode) ? score < prev : score > prev));
    if (isBest) { bests[key] = score; store(gameKey("best"), bests); }

    // Badges.
    const earnedBadges = store(gameKey("badges")) || {};
    const fresh = [];
    const give = (id, ok) => { if (ok && !earnedBadges[id]) { earnedBadges[id] = new Date().toISOString(); fresh.push(GAME_BADGES.find((b) => b.id === id)); } };
    const beatFriend = mode === "challenge" && st.right > (extra.challenge?.sc ?? Infinity);
    give("first", answered > 0);
    give("combo5", st.bestCombo >= 5);
    give("combo10", st.bestCombo >= 10);
    give("perfect", mode === "clock" && list.length >= 10 && st.right === list.length);
    give("speed", mode === "clock" && s.time === "q10" && list.length >= 10 && st.right / list.length >= 0.8);
    give("survivor", mode === "lives" && st.level >= 3);
    give("fearless", mode === "sudden" && st.right >= 10);
    give("timelord", mode === "survival" && st.survived >= 120);
    give("slayer", mode === "boss" && st.won);
    give("million", mode === "millionaire" && st.won);
    give("allrounder", s.subject === "general" && st.right >= 10);
    give("challenger", beatFriend);
    give("learner", mode === "mistakes" && answered === list.length);
    if (fresh.length) store(gameKey("badges"), earnedBadges);
    saveGameSoon(); // badges, best scores and streak go to your account too

    const headline =
      mode === "millionaire" ? fmtCoins(coins)
      : mode === "boss" ? (st.won ? `${st.boss.name} defeated! 🏆` : `The ${st.boss.name} won`)
      : fixed ? `${st.right}/${list.length}` : `${st.right} right`;
    const sub =
      mode === "survival" ? `You lasted ${clockText(st.survived)}.`
      : mode === "lives" || mode === "sudden" ? `You reached <b>${LEVEL_NAMES[st.level]}</b> level.`
      : mode === "boss" ? `Boss HP left: ${st.bossHP} · Your HP left: ${st.hp}`
      : mode === "challenge" ? (beatFriend ? `🎉 You beat ${esc(extra.challenge.n || "your friend")} (${extra.challenge.sc}/${list.length})!`
        : st.right === extra.challenge.sc ? `🤝 It's a draw with ${esc(extra.challenge.n || "your friend")}!`
        : `${esc(extra.challenge.n || "Your friend")} wins this time with ${extra.challenge.sc}/${list.length}. Try again!`) : "";
    const wrongItems = st.results.map((r, i) => ({ ...r, i })).filter((r) => !r.correct).map(({ q, topic }) => ({ q, topic }));
    const canChallenge = mode === "clock" || mode === "challenge";

    view.innerHTML = `
      <div class="page-head"><h1>${mode === "boss" || mode === "millionaire" ? (st.won ? "You won!" : "Game over") : fixed ? "Finished!" : "Game over"}</h1><p>${esc(message || "")}</p></div>
      <div class="card game-over">
        <div class="g-big">${headline}</div>
        ${sub ? `<div class="muted">${sub}</div>` : ""}
        ${isBest ? `<div class="g-best">🏆 New best score!</div>` : counts && prev != null ? `<div class="muted">Your best: ${bestText(mode, prev, s)}</div>` : ""}
        ${st.bestCombo >= 3 ? `<div class="muted">🔥 Best streak: ${st.bestCombo} in a row${st.bonus ? ` · +${st.bonus} bonus points` : ""}</div>` : ""}
      </div>
      ${fresh.length ? `<div class="card new-badges"><b>New badge${fresh.length > 1 ? "s" : ""}!</b>
        <div class="badge-grid">${fresh.map((b) => `<div class="g-badge on"><span class="g-badge-ico">${b.icon}</span><b>${b.name}</b><span>${b.desc}</span></div>`).join("")}</div></div>` : ""}
      <div class="grid cols-3" style="margin:16px 0;">
        ${statCard("Answered", answered)}
        ${statCard("Accuracy", pct + "%")}
        ${statCard("Points" + (earned ? boostNote(false) : ""), "+" + earned)}
      </div>
      <div class="row" style="margin-bottom:16px;">
        <button class="btn" type="button" id="g-again">↻ Play again</button>
        ${wrongItems.length ? `<button class="btn secondary" type="button" id="g-mistakes">📚 Fix my mistakes (${wrongItems.length})</button>` : ""}
        ${canChallenge && answered ? `<button class="btn secondary" type="button" id="g-challenge">🤝 Challenge a friend</button>` : ""}
        <a class="btn ghost" href="#/games" id="g-change">Change game</a>
      </div>
      <div class="card stack hidden" id="g-share">
        <b>Send this link to a friend</b>
        <p class="muted small" style="margin:0;">They'll get the same ${list?.length || ""} questions with the same time, and see your score to beat. They need a JINtelligence account.</p>
        <div class="row"><input type="text" id="g-share-link" readonly style="flex:1; min-width:0;"><button class="btn" type="button" id="g-copy">Copy link</button></div>
      </div>
      ${answered ? `<h2 class="g-section">Your answers</h2><div class="card" id="g-review">
        ${st.results.map(({ q, topic }, i) => questionHTML(q, i, topic.name, !!q.passage)).join("")}</div>` : ""}`;

    st.results.forEach(({ q, correct }, i) => {
      const row = $$("#g-review .question", view)[i];
      const input = $("input[data-qid], textarea[data-qid]", row);
      if (input) input.value = st.answers[i];
      markQuestion(row, q, correct, { yourAnswer: st.answers[i] });
    });
    fresh.forEach((b, i) => setTimeout(() => toast(`${b.icon} New badge: ${b.name}`), 600 + i * 2000)); // one at a time
    $("#g-again", view).addEventListener("click", () => playGame(view, s, mode === "challenge" || mode === "mistakes" ? extra : {}));
    $("#g-mistakes", view)?.addEventListener("click", () => playGame(view, { ...s, mode: "mistakes" }, { items: wrongItems }));
    $("#g-change", view).addEventListener("click", (e) => { e.preventDefault(); location.hash === "#/games" ? route() : (location.hash = "#/games"); });
    $("#g-challenge", view)?.addEventListener("click", () => {
      const code = challengeCode({ v: 1, s: s.subject, t: s.time, n: me.name, sc: st.right, ids: list.map((x) => x.q.id) });
      $("#g-share-link", view).value = challengeLink(code);
      show($("#g-share", view));
      $("#g-share-link", view).select();
    });
    $("#g-copy", view)?.addEventListener("click", () => {
      const input = $("#g-share-link", view);
      navigator.clipboard.writeText(input.value).then(() => toast("Link copied! Send it to a friend."), () => { input.select(); toast("Press Ctrl+C (or long-press) to copy the link."); });
    });
    window.scrollTo(0, 0);
  }

  nextQuestion();
}
