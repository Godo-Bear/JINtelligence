/* Language: each person picks the language they want (Settings → Language), including Australian, British and American English.
   - The AI (tutor, AI tests, flashcards, info pages, writing feedback) writes in that language, via learnerLine().
   - American English also changes the spelling in the menus and built-in text (colour → color, maths → math…).
   - Dates use that language's format, and voice chat listens and speaks in it.
   - The menus and the built-in practice questions stay in English (they're written for the Victorian Curriculum).
   The choice is kept on this device (prefs.lang). Uses prefs() / setPref() from app.js at run time. */

const LANGUAGES = [
  { code: "en-AU", label: "English (Australia)", ai: "Australian English", speech: "en-AU" },
  { code: "en-GB", label: "English (United Kingdom)", ai: "British English", speech: "en-GB" },
  { code: "en-US", label: "English (United States)", ai: "American English", speech: "en-US" },
  { code: "es", label: "Español (Spanish)", ai: "Spanish", speech: "es-ES" },
  { code: "fr", label: "Français (French)", ai: "French", speech: "fr-FR" },
  { code: "de", label: "Deutsch (German)", ai: "German", speech: "de-DE" },
  { code: "it", label: "Italiano (Italian)", ai: "Italian", speech: "it-IT" },
  { code: "pt", label: "Português (Portuguese)", ai: "Portuguese", speech: "pt-BR" },
  { code: "nl", label: "Nederlands (Dutch)", ai: "Dutch", speech: "nl-NL" },
  { code: "el", label: "Ελληνικά (Greek)", ai: "Greek", speech: "el-GR" },
  { code: "tr", label: "Türkçe (Turkish)", ai: "Turkish", speech: "tr-TR" },
  { code: "ru", label: "Русский (Russian)", ai: "Russian", speech: "ru-RU" },
  { code: "ar", label: "العربية (Arabic)", ai: "Arabic", speech: "ar-SA" },
  { code: "hi", label: "हिन्दी (Hindi)", ai: "Hindi", speech: "hi-IN" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)", ai: "Punjabi", speech: "pa-IN" },
  { code: "ta", label: "தமிழ் (Tamil)", ai: "Tamil", speech: "ta-IN" },
  { code: "ur", label: "اردو (Urdu)", ai: "Urdu", speech: "ur-PK" },
  { code: "zh-CN", label: "中文 (Chinese, Simplified)", ai: "Simplified Chinese", speech: "zh-CN" },
  { code: "zh-TW", label: "中文 (Chinese, Traditional)", ai: "Traditional Chinese", speech: "zh-TW" },
  { code: "ja", label: "日本語 (Japanese)", ai: "Japanese", speech: "ja-JP" },
  { code: "ko", label: "한국어 (Korean)", ai: "Korean", speech: "ko-KR" },
  { code: "vi", label: "Tiếng Việt (Vietnamese)", ai: "Vietnamese", speech: "vi-VN" },
  { code: "id", label: "Bahasa Indonesia (Indonesian)", ai: "Indonesian", speech: "id-ID" },
  { code: "fil", label: "Filipino", ai: "Filipino (Tagalog)", speech: "fil-PH" },
];
const langInfo = () => {
  let want = "en-AU";
  try { want = (typeof prefs === "function" && prefs().lang) || "en-AU"; } catch (e) { /* default */ }
  return LANGUAGES.find((l) => l.code === want) || LANGUAGES[0];
};
const isEnglish = () => langInfo().code.startsWith("en");
const uiLocale = () => langInfo().code;       // for dates and numbers
const speechLang = () => langInfo().speech;   // for voice chat

// Added to every AI prompt (through learnerLine), so the AI writes in the chosen language.
function languageLine() {
  const l = langInfo();
  if (l.code === "en-AU") return "";
  if (l.code === "en-GB") return "LANGUAGE: Write in British English, with British spelling and words (colour, centre, maths, programme, mum), not American. Keep the Victorian Curriculum content.";
  if (l.code === "en-US") return "LANGUAGE: Write in American English, with American spelling and words (color, center, math, program, mom, organize), not Australian. Keep the Victorian Curriculum content, and you may mention the US grade level beside the Year level where it helps.";
  return `LANGUAGE: The student's chosen language is ${l.ai}. Write everything the student will read in ${l.ai}: replies, explanations, feedback, questions, answer options, flashcards and page text. Keep any JSON keys, field names and the exact output format in English, and keep numbers and maths notation as they are. If the student types in another language, still reply in ${l.ai} unless they ask for a translation or the task is about learning another language.`;
}
// The level line used by every AI prompt, plus the language.
function learnerLine(fallback = "") {
  const lang = languageLine();
  return learnerLineBase(fallback) + (lang ? `\n${lang}` : "");
}

// ---------------------------------------------------------------- American spelling for the menus and built-in text
const US_SPELLING = {
  colour: "color", colours: "colors", coloured: "colored", favourite: "favorite", favourites: "favorites", organise: "organize", organised: "organized",
  organising: "organizing", organisation: "organization", centre: "center", centres: "centers", maths: "math", behaviour: "behavior", practise: "practice",
  practising: "practicing", practised: "practiced", analyse: "analyze", analysing: "analyzing", recognise: "recognize", recognising: "recognizing",
  summarise: "summarize", summarising: "summarizing", emphasise: "emphasize", apologise: "apologize", memorise: "memorize", memorised: "memorized",
  metre: "meter", metres: "meters", litre: "liter", litres: "liters", centimetre: "centimeter", centimetres: "centimeters", kilometre: "kilometer",
  kilometres: "kilometers", millimetre: "millimeter", millimetres: "millimeters", grey: "gray", defence: "defense", licence: "license", programme: "program",
  mum: "mom", theatre: "theater", jewellery: "jewelry", travelled: "traveled", cancelled: "canceled", labelled: "labeled", modelling: "modeling",
  judgement: "judgment", learnt: "learned", whilst: "while", aluminium: "aluminum", tyre: "tire", pyjamas: "pajamas", enrol: "enroll", fulfil: "fulfill",
  ageing: "aging", mould: "mold", neighbour: "neighbor", neighbours: "neighbors", honour: "honor", labour: "labor", humour: "humor", flavour: "flavor",
  harbour: "harbor", rumour: "rumor", realise: "realize", realised: "realized", customise: "customize", minimise: "minimize", maximise: "maximize",
  prioritise: "prioritize", visualise: "visualize", categorise: "categorize", specialise: "specialize", criticise: "criticize", authorise: "authorize",
};
const US_RE = new RegExp(`\\b(${Object.keys(US_SPELLING).join("|")})\\b`, "gi");
const toUS = (text) => text.replace(US_RE, (m) => {
  const to = US_SPELLING[m.toLowerCase()];
  return m === m.toUpperCase() && m.length > 1 ? to.toUpperCase() : m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
});
function localiseTree(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const p = n.parentElement;
      if (!p || !n.nodeValue.trim() || p.closest("script, style, textarea, input, [contenteditable], .bubble.me, .editor, [data-keep-spelling]")) return NodeFilter.FILTER_REJECT;
      return US_RE.test(n.nodeValue) ? (US_RE.lastIndex = 0, NodeFilter.FILTER_ACCEPT) : (US_RE.lastIndex = 0, NodeFilter.FILTER_REJECT);
    },
  });
  const hits = [];
  while (walker.nextNode()) hits.push(walker.currentNode);
  hits.forEach((n) => { n.nodeValue = toUS(n.nodeValue); });
}
function startLanguage() {
  const l = langInfo();
  document.documentElement.lang = l.code;
  if (l.code !== "en-US") return;
  localiseTree(document.body);
  let pending = null;
  new MutationObserver(() => { clearTimeout(pending); pending = setTimeout(() => localiseTree(document.body), 40); })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
}
window.addEventListener("DOMContentLoaded", startLanguage);

// ---------------------------------------------------------------- Settings → Language
function languageCardHTML() {
  const cur = langInfo().code;
  return `
    <div class="section-label">🌐 Language</div>
    <div class="card stack">
      <p class="muted small" style="margin:0;">Choose the language you want. The AI tutor, AI tests, flashcards, info pages and writing feedback will use it, including British, American or Australian English spelling. Dates, and voice chat, follow it too. English (United States) also switches the menus to American spelling. The menus and the built-in practice questions are otherwise in English.</p>
      <select id="set-lang" aria-label="Language">${LANGUAGES.map((l) => `<option value="${l.code}"${l.code === cur ? " selected" : ""}>${l.label}</option>`).join("")}</select>
    </div>`;
}
function wireLanguageCard(view) {
  $("#set-lang", view)?.addEventListener("change", (e) => {
    setPref("lang", e.target.value);
    const l = LANGUAGES.find((x) => x.code === e.target.value);
    toast(`Language: ${l.label}`);
    setTimeout(() => location.reload(), 500); // so the menus, dates and voice all switch over
  });
}
