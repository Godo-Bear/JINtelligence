/* Voice chat with the AI tutor, using the browser's own speech tools (no extra service or key):
   SpeechRecognition turns what you say into text, and speechSynthesis reads the tutor's reply aloud.
   Works in Chrome, Edge and Safari (listening isn't available in Firefox). Loaded before app.js. */

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const canListen = !!SpeechRec;
const canSpeak = "speechSynthesis" in window;

const voicePrefKey = () => `apex-voice-${authUser.id}`;
const voicePrefs = () => ({ name: "", rate: 1, ...(store(voicePrefKey()) || {}) });

let voiceList = [];
function loadVoices() {
  if (!canSpeak) return [];
  voiceList = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  return voiceList;
}
if (canSpeak) { loadVoices(); speechSynthesis.addEventListener?.("voiceschanged", () => { loadVoices(); fillVoiceSelects(); }); }

// The chosen voice, or the most natural-sounding Australian/English one available.
function pickVoice() {
  const voices = voiceList.length ? voiceList : loadVoices();
  const chosen = voices.find((v) => v.name === voicePrefs().name);
  if (chosen) return chosen;
  const score = (v) => (/en-AU/i.test(v.lang) ? 4 : /en-GB/i.test(v.lang) ? 2 : 1) + (/natural|neural|online|google|siri|premium|enhanced/i.test(v.name) ? 3 : 0);
  return voices.slice().sort((a, b) => score(b) - score(a))[0] || null;
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
function speak(text, onEnd = () => {}, onWord = () => {}) {
  if (!canSpeak) { onEnd(); return; }
  speechSynthesis.cancel();
  // Long replies are split into sentences — some browsers stop speaking long text part-way.
  const parts = speakable(text).match(/[^.!?]+[.!?]*/g) || [];
  if (!parts.length) { onEnd(); return; }
  const voice = pickVoice(), rate = voicePrefs().rate || 1;
  let i = 0, stopped = false;
  const token = {};
  speakingNow = token;
  const next = () => {
    if (stopped || speakingNow !== token) return;
    if (i >= parts.length) { speakingNow = null; onEnd(); return; }
    const u = new SpeechSynthesisUtterance(parts[i++].trim());
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-AU";
    u.rate = rate;
    u.onstart = onWord;
    u.onboundary = onWord; // each word — makes the voice orb pulse
    u.onend = next;
    u.onerror = next;
    speechSynthesis.speak(u);
  };
  next();
  return () => { stopped = true; speakingNow = null; speechSynthesis.cancel(); };
}
function stopSpeaking() { speakingNow = null; if (canSpeak) speechSynthesis.cancel(); }

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
  const voices = voiceList.length ? voiceList : loadVoices();
  const cur = voicePrefs().name || pickVoice()?.name || "";
  $$("[data-voice-name]").forEach((sel) => {
    sel.innerHTML = voices.length
      ? voices.map((v) => `<option value="${esc(v.name)}"${v.name === cur ? " selected" : ""}>${esc(v.name.replace(/\s*\(.*?\)\s*/g, " ").trim())} · ${esc(v.lang)}</option>`).join("")
      : `<option value="">Your device's default voice</option>`;
  });
}
document.addEventListener("change", (e) => {
  if (!authUser) return;
  if (e.target.matches("[data-voice-name]")) { store(voicePrefKey(), { ...voicePrefs(), name: e.target.value }); speak("Hi! This is how I'll sound."); }
  if (e.target.matches("[data-voice-rate]")) { store(voicePrefKey(), { ...voicePrefs(), rate: +e.target.value }); speak("This is my new speed."); }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-voice-test]")) speak("Hi! I'm your JINtelligence tutor. Ask me anything you're learning.");
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
