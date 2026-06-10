/* ============================================================
   helpers.jsx — storage, spaced-repetition, streak, seed data
   Exposes everything on window for sibling babel scripts.
   ============================================================ */

const STORAGE_KEY = "wordbank-platform-v2";

/* ---- storage abstraction: window.storage if present, else localStorage ---- */
const store = {
  async get(key) {
    try {
      if (window.storage && typeof window.storage.getItem === "function") {
        const v = await window.storage.getItem(key);
        return v == null ? null : (typeof v === "string" ? JSON.parse(v) : v);
      }
    } catch (e) { /* fall through */ }
    try {
      const v = localStorage.getItem(key);
      return v == null ? null : JSON.parse(v);
    } catch (e) { return null; }
  },
  async set(key, value) {
    const json = JSON.stringify(value);
    try {
      if (window.storage && typeof window.storage.setItem === "function") {
        await window.storage.setItem(key, json);
        return;
      }
    } catch (e) { /* fall through */ }
    try { localStorage.setItem(key, json); } catch (e) { /* ignore */ }
  },
};

/* ---- date utilities ---- */
const DAY_MS = 86400000;
function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (local-ish, fine for prototype)
}
function dayDiff(a, b) {
  // whole days between two ms timestamps
  return Math.floor((b - a) / DAY_MS);
}
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function relDate(ts) {
  if (!ts) return "never";
  const diff = dayDiff(ts, Date.now());
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7) return diff + " days ago";
  if (diff < 30) return Math.floor(diff / 7) + "w ago";
  return Math.floor(diff / 30) + "mo ago";
}

/* ---- spaced repetition: bucket-based ----
   reviewLevel 0..3 maps to review intervals of 1 / 3 / 7 / 14 days.
   A word is "due" if never reviewed, or elapsed >= its bucket interval. */
const SR_INTERVALS = [1, 3, 7, 14]; // days
const SR_LABELS = ["New", "Learning", "Familiar", "Strong"];

function intervalDays(level) {
  return SR_INTERVALS[Math.min(level, SR_INTERVALS.length - 1)];
}
function isDue(word, now = Date.now()) {
  if (!word.lastReviewedAt) return true;
  return dayDiff(word.lastReviewedAt, now) >= intervalDays(word.reviewLevel || 0);
}
function dueWords(words, now = Date.now()) {
  return words.filter((w) => isDue(w, now));
}

/* ---- streak: consecutive days (ending today/yesterday) with activity ---- */
function computeStreak(activityDates) {
  if (!activityDates || activityDates.length === 0) return 0;
  const set = new Set(activityDates);
  let streak = 0;
  let cursor = new Date();
  // allow streak to count from today; if no activity today but yes yesterday, still count from yesterday
  if (!set.has(todayKey(cursor))) {
    cursor = new Date(Date.now() - DAY_MS);
    if (!set.has(todayKey(cursor))) return 0;
  }
  while (set.has(todayKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
function addedThisWeek(words) {
  const cutoff = Date.now() - 7 * DAY_MS;
  return words.filter((w) => w.addedAt >= cutoff).length;
}

/* ---- tag colors: stable palette keyed by tag name ---- */
const TAG_PALETTE = [
  { bg: "#EEEDFB", fg: "#4B40D6", dot: "#4B40D6" }, // indigo
  { bg: "#E3F2E9", fg: "#2E7D52", dot: "#2E7D52" }, // green
  { bg: "#FBF1DC", fg: "#9A6A0F", dot: "#B07A12" }, // gold
  { bg: "#FBEAE4", fg: "#C0492F", dot: "#C0492F" }, // terracotta
  { bg: "#E5EEF6", fg: "#2B6098", dot: "#2B6098" }, // blue
  { bg: "#F3E8F5", fg: "#8E3C9E", dot: "#8E3C9E" }, // plum
  { bg: "#E8F1F1", fg: "#1E7C7C", dot: "#1E7C7C" }, // teal
  { bg: "#F0EEE8", fg: "#6B675E", dot: "#8A8678" }, // neutral
];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function tagColor(tag) {
  if (!tag) return TAG_PALETTE[7];
  return TAG_PALETTE[hashStr(tag.toLowerCase()) % TAG_PALETTE.length];
}

/* ---- id ---- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   API key storage
   ============================================================ */
const API_KEY_STORAGE = "lexicon-gemini-key";

function getApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ""; } catch (e) { return ""; }
}
function saveApiKey(key) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch (e) { /* ignore */ }
}

/* ============================================================
   Enrichment — calls Gemini API directly with user's key
   ============================================================ */
async function enrichWord(word) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const prompt = `You are a vocabulary tutor. For the word "${word}", return a JSON object with exactly these keys:
- "definition": a clear, concise definition (one sentence, no more than 22 words). Do not restate the word at the start.
- "example": one natural example sentence that uses the word "${word}" in context.
- "memoryHook": a short, vivid mnemonic or memory trick (one sentence) to help remember the meaning.

Respond with ONLY the raw JSON object, no markdown, no code fences, no commentary.`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${resp.status}`);
  }

  const data = await resp.json();
  let txt = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) txt = fence[1].trim();
  const first = txt.indexOf("{");
  const last = txt.lastIndexOf("}");
  if (first !== -1 && last !== -1) txt = txt.slice(first, last + 1);

  const parsed = JSON.parse(txt);
  return {
    definition: (parsed.definition || "").trim(),
    example: (parsed.example || "").trim(),
    memoryHook: (parsed.memoryHook || parsed.hook || "").trim(),
  };
}

/* ============================================================
   Seed data — ~12 realistic words across tags.
   First five requested by the user (GRE set), then a spread.
   ============================================================ */
function seedWords() {
  const now = Date.now();
  const d = (daysAgo) => now - daysAgo * DAY_MS;
  const mk = (o) => ({
    id: uid(),
    mastered: false,
    reviewLevel: 0,
    lastReviewedAt: null,
    ...o,
  });
  return [
    mk({
      word: "castigate", tag: "GRE", addedAt: d(2),
      definition: "To reprimand or criticize someone severely.",
      example: "The coach castigated the team for their careless mistakes in the final minutes.",
      memoryHook: "Sounds like ‘cast a gate’ down on someone — slamming criticism on them.",
    }),
    mk({
      word: "capricious", tag: "GRE", addedAt: d(2), reviewLevel: 2, lastReviewedAt: d(3),
      definition: "Given to sudden, unpredictable changes of mood or behavior.",
      example: "The capricious weather shifted from sunshine to hail within the hour.",
      memoryHook: "A ‘Capri-cious’ goat (Capricorn) leaping unpredictably from rock to rock.",
    }),
    mk({
      word: "construe", tag: "GRE", addedAt: d(1),
      definition: "To interpret or assign a meaning to something.",
      example: "Her silence was construed as agreement, though she had meant the opposite.",
      memoryHook: "‘Con-STRUE’ → how you STRUCTURE the meaning you draw from words.",
    }),
    mk({
      word: "contrite", tag: "GRE", addedAt: d(1),
      definition: "Feeling or showing sincere remorse for a wrongdoing.",
      example: "He sent a contrite apology, admitting the whole mess was his fault.",
      memoryHook: "‘Con-TRITE’ → after doing wrong, you TRY to make it right.",
    }),
    mk({
      word: "chicanery", tag: "GRE", addedAt: d(4),
      definition: "The use of clever but deceptive talk or action to trick or evade.",
      example: "The deal collapsed once the investors uncovered his financial chicanery.",
      memoryHook: "‘Chicanery’ hides a sly ‘chicken’ that tricks its way out of the coop.",
    }),
    mk({
      word: "craven", tag: "GRE", addedAt: d(4), reviewLevel: 1, lastReviewedAt: d(2),
      definition: "Showing a complete lack of courage; contemptibly cowardly.",
      example: "His craven retreat left his teammates to face the blame alone.",
      memoryHook: "A ‘craven’ raven flies off at the first hint of danger.",
    }),
    mk({
      word: "desultory", tag: "GRE", addedAt: d(5),
      definition: "Lacking a plan or purpose; moving aimlessly from one thing to another.",
      example: "She made a few desultory attempts at studying before giving up.",
      memoryHook: "‘De-SULT-ory’ effort scatters around like spilled salt.",
    }),
    mk({
      word: "arcane", tag: "GRE", addedAt: d(6), mastered: true, reviewLevel: 3, lastReviewedAt: d(2),
      definition: "Understood by only a few; mysterious or secret.",
      example: "The manual was full of arcane symbols only the experts could decode.",
      memoryHook: "‘Arcane’ knowledge is sealed in an ancient ‘arc’ (ark).",
    }),
    mk({
      word: "incredulous", tag: "GRE", addedAt: d(7), reviewLevel: 2, lastReviewedAt: d(8),
      definition: "Unwilling or unable to believe something.",
      example: "She gave an incredulous look when he claimed he had run a marathon.",
      memoryHook: "‘In-credulous’ → not credible to you, so you refuse to believe it.",
    }),
  ];
}

/* ---- default state ---- */
function defaultState() {
  return {
    words: seedWords(),
    activityDates: [todayKey(), todayKey(new Date(Date.now() - DAY_MS)), todayKey(new Date(Date.now() - 2 * DAY_MS))],
    tags: ["GRE"],
  };
}

Object.assign(window, {
  store, STORAGE_KEY, defaultState, seedWords,
  todayKey, dayDiff, fmtDate, relDate, DAY_MS,
  SR_INTERVALS, SR_LABELS, intervalDays, isDue, dueWords,
  computeStreak, addedThisWeek,
  tagColor, TAG_PALETTE, uid, enrichWord,
  getApiKey, saveApiKey,
});
