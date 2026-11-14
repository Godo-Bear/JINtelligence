/* "Today's review" — a lightweight spaced-repetition queue, shown as a card on Home.
   Any question you flag (☆ Flag, anywhere) or get wrong (in practice, a test, or a game) joins this queue,
   due today. Get it right in a review session and it comes back in 3 days, then 7, then 14, then a month —
   get it right again at a month and it's retired (you've learnt it). Get it wrong at any point and it resets
   to "due today". The queue also mixes in a couple of fresh questions from topics you haven't touched in a
   while, so Home always has something useful to do.
   Stored on this device and in the student's account (the same "flashcards" table row as decks and saved
   tests — see js/saved-tests.js), so it's the same on every device.
   Loaded after saved-tests.js and study.js, before app.js. */

const REVIEW_STEPS = [1, 3, 7, 14, 30]; // days until the next review, growing each time you get it right
const MAX_REVIEW_ITEMS = 80; // oldest items are dropped past this, so the queue can't grow forever
const addDaysStr = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const reviewKey = () => `apex-review-${authUser.id}`;
function loadReview() {
  const r = store(reviewKey());
  return { items: (r && typeof r.items === "object" && r.items) || {}, deleted: Array.isArray(r?.deleted) ? r.deleted : [] };
}
function storeReview(state) {
  store(reviewKey(), { items: state.items, deleted: state.deleted.slice(-300) });
  if (typeof syncSavedTests === "function") syncSavedTests(); // same cloud row as decks/tests — one combined sync
}

// When a topic was last practised (any correct/incorrect answer), so Home can suggest stale ones.
const topicLastKey = () => `apex-topic-last-${authUser.id}`;
const loadTopicLast = () => store(topicLastKey()) || {};
function bumpTopicLast(topicId) {
  const last = loadTopicLast();
  last[topicId] = todayStr();
  store(topicLastKey(), last);
}
function daysSince(dateStr) {
  if (!dateStr) return Infinity; // never tracked — treat as very stale
  return Math.floor((Date.now() - new Date(dateStr + "T00:00:00Z").getTime()) / 86400000);
}

// Brings in review items saved from other devices (same merge style as pullSavedTests): the item with the
// later "updated" wins; explicitly removed items stay removed.
async function pullReview() {
  if (typeof cloudDecks === "undefined" || !cloudDecks) return false;
  let row;
  try {
    const { data, error } = await sb.from("flashcards").select("data").eq("user_id", authUser.id).maybeSingle();
    if (error) throw error;
    row = data?.data;
  } catch (e) { return false; }
  if (!row) return false;
  const state = loadReview();
  const deleted = [...new Set([...state.deleted, ...(row.reviewDeleted || [])])];
  let changed = deleted.length !== state.deleted.length;
  const items = { ...state.items };
  Object.entries(row.review || {}).forEach(([key, item]) => {
    if (!item?.q) return;
    if (!items[key] || (item.updated || 0) > (items[key].updated || 0)) { items[key] = item; changed = true; }
  });
  deleted.forEach((key) => { if (items[key]) { delete items[key]; changed = true; } });
  if (changed) store(reviewKey(), { items, deleted: deleted.slice(-300) });
  const last = loadTopicLast(), theirLast = row.topicLast || {};
  let lastChanged = false;
  Object.entries(theirLast).forEach(([id, date]) => { if (!last[id] || date > last[id]) { last[id] = date; lastChanged = true; } });
  if (lastChanged) store(topicLastKey(), last);
  return changed || lastChanged;
}

function snapshotQ(q) {
  const { showPassage, ...copy } = q;
  return copy;
}
// Adds (or resets) a question in the review queue, due today. Used when you flag a question, or get one wrong.
function addToReview(q, topic) {
  if (!q?.prompt) return;
  const key = flagKey(q);
  const state = loadReview();
  const existing = state.items[key];
  state.items[key] = {
    q: existing?.q || snapshotQ(q),
    topicId: topic?.id || existing?.topicId || null,
    topicName: topic?.name || q.topicName || existing?.topicName || "",
    step: 0, due: todayStr(), updated: Date.now(),
  };
  state.deleted = state.deleted.filter((k) => k !== key);
  // Keep the queue from growing forever: drop the oldest-added item past the cap (insertion order).
  const keys = Object.keys(state.items);
  if (keys.length > MAX_REVIEW_ITEMS) delete state.items[keys[0]];
  storeReview(state);
}
function removeFromReview(key) {
  const state = loadReview();
  if (!state.items[key]) return;
  delete state.items[key];
  state.deleted.push(key);
  storeReview(state);
}
// Called for every answered question (practice, test or game) — see recordResults() in app.js.
function reviewOnAnswer(q, correct, topic) {
  if (!q?.prompt) return;
  const key = flagKey(q);
  const state = loadReview();
  const existing = state.items[key];
  if (!existing && correct) return; // a fresh correct answer doesn't need reviewing
  if (correct) {
    const step = (existing.step ?? 0) + 1;
    if (step >= REVIEW_STEPS.length) { delete state.items[key]; state.deleted.push(key); } // mastered — retire it
    else state.items[key] = { ...existing, step, due: addDaysStr(REVIEW_STEPS[step]), updated: Date.now() };
    storeReview(state);
  } else {
    addToReview(q, topic); // wrong — (re)join the queue, due today
  }
}

const dueReviewEntries = () => Object.entries(loadReview().items).filter(([, it]) => it.due <= todayStr());
// Up to `limit` questions that are due, oldest-due first.
function dueReviewItems(limit = 8) {
  return dueReviewEntries().sort((a, b) => (a[1].due < b[1].due ? -1 : 1)).slice(0, limit).map(([key, it]) => ({
    key, q: it.q, topic: { id: it.topicId || null, name: it.topicName || "Review", icon: "🔁" },
  }));
}
// A few fresh questions from topics you haven't touched in a while (never-tracked topics count as stale).
function staleTopicPicks(limit = 3) {
  const last = loadTopicLast();
  const candidates = QUIZ_TOPICS
    .filter((t) => topicStats(t.id).attempted > 0 && daysSince(last[t.id]) >= 3)
    .sort((a, b) => daysSince(last[b.id]) - daysSince(last[a.id]));
  const out = [];
  for (const t of candidates) {
    if (out.length >= limit) break;
    const m = mastery(t.id);
    const diff = m < 50 ? 1 : m < 80 ? 2 : 3;
    const picked = nextPracticeSet(t, diff)[0];
    if (picked) out.push({ q: picked, topic: t });
  }
  return out;
}
function todaysReviewQueue() {
  const due = dueReviewItems(8);
  return [...due, ...staleTopicPicks(Math.max(0, 10 - due.length))];
}

function renderTodayReview(el) {
  if (!el) return;
  const due = dueReviewEntries().length;
  const queue = todaysReviewQueue();
  if (!queue.length) {
    el.innerHTML = `<div class="card review-card">
      <div class="row" style="gap:14px;"><span class="emoji">📅</span>
        <div><h3 style="margin:0;">Today's review</h3><div class="muted small">Nothing to review yet — flag a question (☆ on any question) or get one wrong, and it'll turn up here to practise again.</div></div>
      </div></div>`;
    return;
  }
  el.innerHTML = `<div class="card review-card">
    <div class="row between" style="gap:14px;">
      <div class="row" style="gap:14px;"><span class="emoji">📅</span>
        <div><h3 style="margin:0;">Today's review</h3><div class="muted small">${due ? `${due} question${due === 1 ? "" : "s"} due` : "A few topics you haven't practised in a while"}${queue.length > due ? ` · ${queue.length} question${queue.length === 1 ? "" : "s"} total` : ""}</div></div>
      </div>
      <button class="btn" type="button" id="start-review">Start →</button>
    </div></div>`;
  $("#start-review", el).addEventListener("click", () => startTodayReview());
}
function startTodayReview() {
  const queue = todaysReviewQueue();
  if (!queue.length) return toast("Nothing due right now — nice work!");
  runTest($("#view"), queue.map(({ q, topic }) => ({ q, topic })), 0, { again: "Back to Home", againHref: "#/home" });
}
