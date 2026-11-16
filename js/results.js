/* Test results history: every finished test is remembered (score, date, topics, and the questions you got
   wrong), and shown on the Progress page under "Your test results". Stored on this device and in the
   student's account (same "flashcards" row as decks, saved tests and review — see js/saved-tests.js),
   so it's the same on every device. Loaded after review.js, before app.js. */

const MAX_TEST_HISTORY = 100;
const historyKey = () => `apex-test-history-${authUser.id}`;
const loadTestHistory = () => { const h = store(historyKey()); return Array.isArray(h) ? h : []; };

function recordTestResult({ name, results, minutes }) {
  if (!results?.length) return;
  const right = results.filter((r) => r.correct).length;
  const entry = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    name: String(name || "Test").slice(0, 80),
    score: right, total: results.length, minutes: minutes || 0,
    topics: [...new Set(results.map((r) => r.topic?.name || r.q.topicName).filter(Boolean))].slice(0, 6),
    wrong: results.filter((r) => !r.correct).slice(0, 25).map((r) => ({
      prompt: String(r.q.prompt || "").slice(0, 300),
      answer: String(displayAnswer(r.q) ?? "").slice(0, 120),
    })),
  };
  const all = [entry, ...loadTestHistory()].slice(0, MAX_TEST_HISTORY);
  store(historyKey(), all);
  if (typeof syncSavedTests === "function") syncSavedTests();
}

// Merges results saved from other devices (by id, newest first).
async function pullTestHistory() {
  if (typeof cloudDecks === "undefined" || !cloudDecks) return false;
  let row;
  try {
    const { data, error } = await sb.from("flashcards").select("data").eq("user_id", authUser.id).maybeSingle();
    if (error) throw error;
    row = data?.data;
  } catch (e) { return false; }
  const theirs = Array.isArray(row?.testHistory) ? row.testHistory : [];
  if (!theirs.length) return false;
  const mine = loadTestHistory();
  const seen = new Set(mine.map((h) => h.id));
  const added = theirs.filter((h) => h?.id && !seen.has(h.id));
  if (!added.length) return false;
  store(historyKey(), [...mine, ...added].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, MAX_TEST_HISTORY));
  return true;
}

function testHistoryHTML() {
  const list = loadTestHistory();
  if (!list.length) return `<p class="muted small" style="margin:0;">Finish a test and your result will show up here, so you can look back at how you went.</p>`;
  const avg = Math.round(list.reduce((n, h) => n + (h.total ? h.score / h.total : 0), 0) / list.length * 100);
  return `<p class="muted small" style="margin:0 0 8px;">${list.length} test${list.length === 1 ? "" : "s"} · average ${avg}%</p>` + list.slice(0, 30).map((h) => {
    const pct = h.total ? Math.round((h.score / h.total) * 100) : 0;
    return `<details class="result-row">
      <summary><span class="grow"><b>${esc(h.name)}</b><span class="muted small"> · ${fmtDate(h.date)}</span></span><span class="tag ${pct >= 70 ? "good" : pct < 40 ? "bad" : ""}">${h.score}/${h.total} · ${pct}%</span></summary>
      <div class="muted small" style="margin:6px 0;">${h.topics?.length ? esc(h.topics.join(", ")) : ""}</div>
      ${h.wrong?.length ? `<div class="small"><b>Missed:</b><ul style="margin:4px 0 0; padding-left:18px;">${h.wrong.map((w) => `<li>${esc(w.prompt)} <span class="muted">— answer: ${esc(w.answer)}</span></li>`).join("")}</ul></div>` : `<div class="small">Full marks. 🎉</div>`}
    </details>`;
  }).join("");
}
