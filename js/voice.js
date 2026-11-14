/* Voice chat with the AI tutor, using the browser's own speech tools (no extra service or key):
   SpeechRecognition turns what you say into text, and speechSynthesis reads the tutor's reply aloud.
   Works in Chrome, Edge and Safari (listening isn't available in Firefox). Loaded before app.js. */

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const canListen = !!SpeechRec;
const canSpeak = "speechSynthesis" in window;

const voicePrefKey = () => `apex-voice-${authUser.id}`;
// Safe to call before the rest of the site has loaded or anyone has logged in.
const voicePrefs = () => ({ name: "", rate: 1, ...((typeof store === "function" && typeof authUser !== "undefined" && authUser && store(voicePrefKey())) || {}) });

let voiceList = [];
function loadVoices() {
  if (!canSpeak) return [];
  voiceList = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  return voiceList;
}
if (canSpeak) { loadVoices(); speechSynthesis.addEventListener?.("voiceschanged", () => { loadVoices(); fillVoiceSelects(); }); }

// The chosen voice, or the smoothest natural-sounding English voice on this device:
// Edge's "Natural" voices and Apple's Enhanced/Premium voices are the best, then Google's, then the rest.
// Novelty and robotic voices are skipped.
const ROBOTIC = /espeak|compact|albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|junior|organ|princess|ralph|superstar|trinoids|whisper|wobble|zarvox|kathy|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy/i;
function voiceScore(v) {
  let s = 0;
  if (/natural/i.test(v.name) && /online|microsoft/i.test(v.name)) s += 40;   // Microsoft Edge neural voices
  if (/premium|enhanced|neural|siri/i.test(v.name)) s += 30;                    // Apple / neural voices
  if (/^google/i.test(v.name)) s += 20;                                         // Chrome's Google voices
  if (/en[-_]AU/i.test(v.lang)) s += 6; else if (/en[-_]GB/i.test(v.lang)) s += 4; else if (/en[-_]US/i.test(v.lang)) s += 3;
  if (/william|daniel|lee|gordon|ryan|guy|christopher|eric|andrew|brian|male/i.test(v.name)) s += 2; // a calm male voice, like the video ad
  if (v.localService !== false) s += 12; // installed on the device: works offline and on school networks
  if (ROBOTIC.test(v.name)) s -= 100;
  if (badVoices.has(v.name)) s -= 1000;   // didn't play last time
  return s;
}
const badVoices = new Set(); // voices that didn't play on this visit
function pickVoice() {
  const voices = voiceList.length ? voiceList : loadVoices();
  const chosen = voices.find((v) => v.name === voicePrefs().name && !badVoices.has(v.name));
  if (chosen) return chosen;
  return voices.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
}

// Turns maths symbols and markup into words so the reply sounds right.
function speakable(text) {
  return String(text || "")
    .replace(/\[DIAGRAM\][\s\S]*?\[\/DIAGRAM\]/g, "")
    .replace(/×/g, " times ").replace(/÷/g, " divided by ").replace(/−/g, " minus ")
    .replace(/(\d)\s*\/\s*(\d)/g, "$1 over $2").replace(/=/g, " equals ").replace(/²/g, " squared ").replace(/³/g, " cubed ")
    .replace(/√/g, " square root of ").replace(/%/g, " percent").replace(/°/g, " degrees")
    .replace(/[*_#`>|~]/g, " ").replace(/https?:\/\/\S+/g, "a link")
    .replace(/\s+/g, " ").trim();
}

let speakingNow = null;
function speakDevice(text, onEnd = () => {}, onWord = () => {}) {
  if (!canSpeak) { onEnd(); return; }
  // Long replies are split into sentences — some browsers stop speaking long text part-way.
  const parts = speakable(text).match(/[^.!?]+[.!?]*/g) || [];
  if (!parts.length) { onEnd(); return; }
  let voice = pickVoice(), i = 0, stopped = false, tries = 0, heard = false;
  const rate = voicePrefs().rate || 1;
  const token = {};
  speakingNow = token;
  const finish = () => { if (speakingNow === token) speakingNow = null; clearInterval(keepAlive); onEnd(); };
  // Chrome pauses speech after about 15 seconds; nudging it keeps it going.
  const keepAlive = setInterval(() => { if (speakingNow !== token) return clearInterval(keepAlive); if (speechSynthesis.speaking && !speechSynthesis.paused) { speechSynthesis.pause(); speechSynthesis.resume(); } }, 10000);
  const next = () => {
    if (stopped || speakingNow !== token) return;
    if (i >= parts.length) return finish();
    const u = new SpeechSynthesisUtterance(parts[i].trim());
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-AU";
    u.rate = rate;
    u.volume = 1;
    let done = false, started = false;
    // If a voice doesn't start (blocked online voice, stuck engine), switch to another one and try again.
    const failed = () => {
      if (done) return;
      done = true;
      if (voice) badVoices.add(voice.name);
      speechSynthesis.cancel();
      if (++tries > 2) { if (!heard) window.dispatchEvent(new CustomEvent("voice-failed")); return finish(); }
      voice = tries === 2 ? null : pickVoice(); // last try: the browser's default voice
      setTimeout(next, 120);
    };
    u.onstart = () => { started = true; heard = true; onWord(); };
    u.onboundary = onWord; // each word — makes the voice orb pulse
    u.onend = () => { if (done) return; if (!started && !heard) return failed(); done = true; i++; next(); };
    u.onerror = (e) => { if (e.error === "interrupted" || e.error === "canceled") { done = true; return; } failed(); };
    speechSynthesis.speak(u);
    setTimeout(() => { if (!started && !done && speakingNow === token) failed(); }, i === 0 ? 3000 : 6000);
  };
  // Chrome can drop speech that's queued straight after cancel(), so wait a moment first.
  speechSynthesis.cancel();
  setTimeout(next, 120);
  return () => { stopped = true; speakingNow = null; clearInterval(keepAlive); speechSynthesis.cancel(); };
}
function stopSpeaking() {
  speakingNow = null;
  if (canSpeak) speechSynthesis.cancel();
  if (voiceAudioEl) { voiceAudioEl.pause(); voiceAudioEl.onended = null; }
}

// ---------------------------------------------------------------- Natural voices (Azure, via the "tutor-voice" edge function)
// The same natural Australian voice for everyone. If it isn't set up or fails, the device's voice is used instead.
const NATURAL_VOICES = [["azure:en-AU-WilliamNeural", "William — Australian male (natural)"], ["azure:en-AU-NatashaNeural", "Natasha — Australian female (natural)"]];
let naturalOff = false;           // turned off for this visit after a failure
let voiceAudioEl = null, voiceAudioCtx = null, voiceAnalyser = null;
const usingNatural = () => !naturalOff && String(voicePrefs().name || "").startsWith("azure:");
function voiceAudio() {
  if (voiceAudioEl) return voiceAudioEl;
  voiceAudioEl = new Audio();
  voiceAudioEl.preload = "auto";
  try {
    voiceAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    voiceAnalyser = voiceAudioCtx.createAnalyser();
    voiceAnalyser.fftSize = 256;
    voiceAudioCtx.createMediaElementSource(voiceAudioEl).connect(voiceAnalyser);
    voiceAnalyser.connect(voiceAudioCtx.destination);
  } catch (e) { voiceAnalyser = null; }
  return voiceAudioEl;
}
// Phones only allow sound that starts from a tap, so voice chat calls this when the 🎙️ button is tapped.
const SILENT_MP3 = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEwAAAAAAAAAAAAEluZm8AAAAPAAAABwAAA2AAVVVVVVVVVVVVVVVVVVVxcXFxcXFxcXFxcXFxcY6Ojo6Ojo6Ojo6Ojo6Oqqqqqqqqqqqqqqqqqqqqx8fHx8fHx8fHx8fHx8fj4+Pj4+Pj4+Pj4+Pj4///////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQEIAAAAAAAAANgmVBi7QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
function unlockVoiceAudio() {
  if (canSpeak) {
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
      speechSynthesis.resume();
    } catch (e) { /* nothing to unlock */ }
  }
  if (!usingNatural()) return;
  const a = voiceAudio();
  voiceAudioCtx?.resume?.();
  a.src = SILENT_MP3;
  a.play().catch(() => {});
}
async function speakNatural(text, token, onEnd, onWord) {
  const name = (voicePrefs().name || NATURAL_VOICES[0][0]).replace("azure:", "");
  const { data, error } = await sb.functions.invoke("tutor-voice", { body: { text: speakable(text), voice: name, rate: voicePrefs().rate || 1 } });
  if (error || !data?.audio) throw error || new Error(data?.error || "No audio");
  if (speakingNow !== token) return; // stopped while it was loading
  const a = voiceAudio();
  voiceAudioCtx?.resume?.();
  a.src = `data:${data.type || "audio/mpeg"};base64,${data.audio}`;
  // Drive the voice orb from how loud the voice is right now.
  const buf = voiceAnalyser ? new Uint8Array(voiceAnalyser.fftSize) : null;
  const tick = () => {
    if (speakingNow !== token || a.paused) return;
    if (buf) {
      voiceAnalyser.getByteTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x; }
      onWord(Math.min(1, Math.sqrt(sum / buf.length) * 5));
    } else onWord();
    requestAnimationFrame(tick);
  };
  a.onplay = tick;
  a.onended = () => { if (speakingNow === token) { speakingNow = null; onEnd(); } };
  a.onerror = () => { if (speakingNow === token) { speakingNow = null; onEnd(); } };
  await a.play();
}
// Reads text aloud: the natural voice if it's chosen and working, otherwise the device's voice.
function speak(text, onEnd = () => {}, onWord = () => {}) {
  stopSpeaking();
  if (!usingNatural()) return speakDevice(text, onEnd, onWord);
  const token = {};
  speakingNow = token;
  speakNatural(text, token, onEnd, onWord).catch((err) => {
    console.warn("Apex: natural voice unavailable, using the device's voice —", err?.message || err);
    naturalOff = true;
    if (speakingNow === token) speakDevice(text, onEnd, onWord);
  });
}

// Listens for one thing the student says. onText(final text), onInterim(words so far), onEnd(heardSomething).
function listenOnce({ onText, onInterim = () => {}, onEnd = () => {}, onError = () => {} }) {
  if (!canListen) { onError("not-supported"); return () => {}; }
  const rec = new SpeechRec();
  rec.lang = "en-AU";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "", ended = false;
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    onInterim((finalText + " " + interim).trim());
  };
  rec.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") onError(e.error); };
  rec.onend = () => {
    if (ended) return;
    ended = true;
    if (finalText.trim()) onText(finalText.trim());
    onEnd(!!finalText.trim());
  };
  try { rec.start(); } catch (e) { onError("start"); }
  return () => { ended = true; try { rec.abort(); } catch (e) { /* already stopped */ } };
}

// ---------------------------------------------------------------- Settings: choose the voice
function voiceSettingsHTML() {
  const p = voicePrefs();
  queueMicrotask(fillVoiceSelects); // fill the voice list once the page is on screen
  return `<div class="stack">
    ${canSpeak ? "" : `<p class="muted small" style="margin:0;">This browser can't read answers aloud.</p>`}
    <div class="row between"><span>Tutor voice</span><select data-voice-name style="max-width:260px;"></select></div>
    <div class="row between"><span>Speed</span>
      <select data-voice-rate style="max-width:260px;">${[[0.85, "Slower"], [1, "Normal"], [1.15, "Faster"], [1.3, "Fastest"]].map(([v, l]) => `<option value="${v}"${+p.rate === v ? " selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="row"><button class="btn secondary sm" type="button" data-voice-test>🔊 Test the voice</button></div>
    ${canListen ? "" : `<p class="muted small" style="margin:0;">Talking to the tutor needs Chrome, Edge or Safari — this browser can only read answers aloud.</p>`}
  </div>`;
}
function fillVoiceSelects() {
  if (typeof $$ !== "function" || !document.querySelector("[data-voice-name]")) return;
  const voices = voiceList.length ? voiceList : loadVoices();
  const cur = voicePrefs().name || "";
  const best = pickVoice();
  const good = voices.filter((x) => !ROBOTIC.test(x.name)).sort((a, b) => voiceScore(b) - voiceScore(a));
  $$("[data-voice-name]").forEach((sel) => {
    sel.innerHTML = `<option value=""${!cur ? " selected" : ""}>✨ Smoothest voice on this device${best ? ` (${esc(best.name.replace(/\s*\(.*?\)\s*/g, " ").replace(/^Microsoft\s+/, "").trim())})` : ""}</option>
      <optgroup label="Other voices on this device">${good.length
        ? good.map((v) => `<option value="${esc(v.name)}"${v.name === cur ? " selected" : ""}>${esc(v.name.replace(/\s*\(.*?\)\s*/g, " ").trim())} · ${esc(v.lang)}</option>`).join("")
        : `<option value="device">Your device's default voice</option>`}</optgroup>`;
  });
}
document.addEventListener("change", (e) => {
  if (!authUser) return;
  if (e.target.matches("[data-voice-name]")) { store(voicePrefKey(), { ...voicePrefs(), name: e.target.value }); naturalOff = false; unlockVoiceAudio(); speak("Hi! This is how I'll sound."); }
  if (e.target.matches("[data-voice-rate]")) { store(voicePrefKey(), { ...voicePrefs(), rate: +e.target.value }); speak("This is my new speed."); }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-voice-test]")) { naturalOff = false; unlockVoiceAudio(); speak("Hi! I'm your JINtelligence tutor. Ask me anything you're learning."); }
});

// How loud the microphone is (0 to 1), for the voice orb. Returns a function that stops it.
function startMicLevel(onLevel) {
  if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) return () => {};
  let stream = null, ctx = null, frame = 0, stopped = false;
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then((s) => {
    if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
    stream = s;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(s).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let smooth = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const x = (data[i] - 128) / 128; sum += x * x; }
      const rms = Math.sqrt(sum / data.length);
      smooth = smooth * 0.7 + Math.min(1, rms * 6) * 0.3;
      onLevel(smooth);
      frame = requestAnimationFrame(tick);
    };
    tick();
  }).catch(() => { /* no mic level — the orb still animates */ });
  return () => { stopped = true; cancelAnimationFrame(frame); stream?.getTracks().forEach((t) => t.stop()); ctx?.close?.(); onLevel(0); };
}

// ---------------------------------------------------------------- Read a question aloud
// A 🔊 button on every question (next to ☆ Flag), reading the passage, prompt, visual description and
// multiple-choice options aloud with the tutor's voice. Tap it again (or tap another question) to stop.
const speakRegistry = new Map();
function speakButtonHTML(q) {
  if (!q?.prompt || !canSpeak) return "";
  const key = flagKey(q);
  speakRegistry.set(key, q);
  return `<button type="button" class="q-speak" data-speak-q="${esc(key)}" aria-label="Read this question aloud" title="Read this question aloud">🔊</button>`;
}
function questionSpeakText(q) {
  const passage = q.passage ? `${q.passage}. ` : "";
  const vis = q.visual && typeof describeVisual === "function" ? `${describeVisual(q.visual)}. ` : "";
  const opts = q.options ? ` Choices: ${q.options.join(". ")}.` : "";
  return `${passage}${vis}${q.prompt}${opts}`;
}
let readingKey = null;
function setReadingUI(key) {
  readingKey = key;
  document.querySelectorAll("[data-speak-q]").forEach((b) => {
    const on = b.dataset.speakQ === key;
    b.textContent = on ? "⏹️" : "🔊";
    b.classList.toggle("on", on);
  });
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-speak-q]");
  if (!btn) return;
  e.preventDefault();
  const key = btn.dataset.speakQ;
  if (readingKey === key) { stopSpeaking(); setReadingUI(null); return; }
  const q = speakRegistry.get(key);
  if (!q) return;
  setReadingUI(key);
  speak(questionSpeakText(q), () => { if (readingKey === key) setReadingUI(null); });
});
