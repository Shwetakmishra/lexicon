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
   Enrichment — direct Anthropic API call (key stored in localStorage)
   ============================================================ */
const API_KEY_STORAGE = "lexicon-anthropic-key";

function getApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ""; } catch (e) { return ""; }
}
function saveApiKey(key) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch (e) { /* ignore */ }
}

/* ---- recent hook themes: keep the last few so we can ask for variety ---- */
const RECENT_THEMES_STORAGE = "lexicon-recent-themes";
function getRecentThemes() {
  try { return JSON.parse(localStorage.getItem(RECENT_THEMES_STORAGE) || "[]"); } catch (e) { return []; }
}
function pushRecentTheme(theme) {
  if (!theme) return;
  try {
    const next = [theme.toLowerCase().trim(), ...getRecentThemes().filter((t) => t !== theme.toLowerCase().trim())].slice(0, 4);
    localStorage.setItem(RECENT_THEMES_STORAGE, JSON.stringify(next));
  } catch (e) { /* ignore */ }
}

async function enrichWord(word) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const w = word.trim();
  const recentThemes = getRecentThemes();
  const prompt = `You are a vocabulary tutor helping Indian students. For the word "${w}", return a JSON object with exactly these keys:
- "definition": a clear, concise definition (one sentence, no more than 22 words). Do not restate the word at the start.
- "example": one natural example sentence that uses the word "${w}" in context.
- "memoryHook": a mnemonic that helps the reader permanently remember "${w}". Build it in this order:
  1. SOUND FIRST: Break "${w}" into syllables or sound-alike chunks (e.g., castigate → CASTLE + GATE, gregarious → GREG + AREA). The chunks must be obvious enough that hearing the image brings the word back.
  2. IMAGE SECOND: Turn those chunks into ONE concrete, visual scene — something you can see, hear, or taste. Absurd, exaggerated, or funny images stick better than sensible ones.
  3. MEANING LAST: The scene must demonstrate the word's meaning, not just rhyme with it. End by tying the image back to the definition in a few words.

  Example: "castigate" → "Picture a CASTLE GATE slamming shut in your face while the king yells at you from the wall — to castigate is to harshly scold and shut someone down."

  Theme palette (pick whatever fits the SOUND best): food (biryani, espresso, street chaat), travel (Jaipur, Tokyo metro, airport chaos), music and art (a sitar riff, a Van Gogh sky), movies, cricket and sports, animals, everyday objects (a stuck zipper, a leaking pen). Indian references are great when the sound naturally calls for one — never force-fit.
  ${recentThemes.length ? `Recent hooks used these themes: ${recentThemes.join(", ")}. Pick a DIFFERENT theme this time.` : ""}

  Rules:
  - 1–2 sentences max. CAPITALIZE the sound chunks.
  - No abstract framing ("imagine feeling sad") — always a physical scene.
  - Never reuse the word's own definition as the image (circular hooks don't work).
- "hookTheme": one word naming the theme you used for the memoryHook (e.g., "food", "travel", "music").

Respond with ONLY the raw JSON object, no markdown, no code fences, no commentary.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    if (resp.status === 401) throw new Error("INVALID_KEY");
    throw new Error(err?.error?.message || `API error ${resp.status}`);
  }

  const data = await resp.json();
  let txt = (data.content?.[0]?.text || "").trim();

  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) txt = fence[1].trim();
  const first = txt.indexOf("{");
  const last = txt.lastIndexOf("}");
  if (first !== -1 && last !== -1) txt = txt.slice(first, last + 1);

  const parsed = JSON.parse(txt);
  const hookTheme = (parsed.hookTheme || "").trim();
  pushRecentTheme(hookTheme);
  return {
    definition: (parsed.definition || "").trim(),
    example: (parsed.example || "").trim(),
    memoryHook: (parsed.memoryHook || parsed.hook || "").trim(),
    hookTheme,
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
      word: "castigate", tag: "", addedAt: d(2),
      definition: "To reprimand or criticize someone severely.",
      example: "The coach castigated the team for their careless mistakes in the final minutes.",
      memoryHook: "Sounds like ‘cast a gate’ down on someone — slamming criticism on them.",
    }),
    mk({
      word: "capricious", tag: "", addedAt: d(2), reviewLevel: 2, lastReviewedAt: d(3),
      definition: "Given to sudden, unpredictable changes of mood or behavior.",
      example: "The capricious weather shifted from sunshine to hail within the hour.",
      memoryHook: "A ‘Capri-cious’ goat (Capricorn) leaping unpredictably from rock to rock.",
    }),
    mk({
      word: "construe", tag: "", addedAt: d(1),
      definition: "To interpret or assign a meaning to something.",
      example: "Her silence was construed as agreement, though she had meant the opposite.",
      memoryHook: "‘Con-STRUE’ → how you STRUCTURE the meaning you draw from words.",
    }),
    mk({
      word: "contrite", tag: "", addedAt: d(1),
      definition: "Feeling or showing sincere remorse for a wrongdoing.",
      example: "He sent a contrite apology, admitting the whole mess was his fault.",
      memoryHook: "‘Con-TRITE’ → after doing wrong, you TRY to make it right.",
    }),
    mk({
      word: "chicanery", tag: "", addedAt: d(4),
      definition: "The use of clever but deceptive talk or action to trick or evade.",
      example: "The deal collapsed once the investors uncovered his financial chicanery.",
      memoryHook: "‘Chicanery’ hides a sly ‘chicken’ that tricks its way out of the coop.",
    }),
    mk({
      word: "craven", tag: "", addedAt: d(4), reviewLevel: 1, lastReviewedAt: d(2),
      definition: "Showing a complete lack of courage; contemptibly cowardly.",
      example: "His craven retreat left his teammates to face the blame alone.",
      memoryHook: "A ‘craven’ raven flies off at the first hint of danger.",
    }),
    mk({
      word: "desultory", tag: "", addedAt: d(5),
      definition: "Lacking a plan or purpose; moving aimlessly from one thing to another.",
      example: "She made a few desultory attempts at studying before giving up.",
      memoryHook: "‘De-SULT-ory’ effort scatters around like spilled salt.",
    }),
    mk({
      word: "arcane", tag: "", addedAt: d(6), mastered: true, reviewLevel: 3, lastReviewedAt: d(2),
      definition: "Understood by only a few; mysterious or secret.",
      example: "The manual was full of arcane symbols only the experts could decode.",
      memoryHook: "‘Arcane’ knowledge is sealed in an ancient ‘arc’ (ark).",
    }),
    mk({
      word: "incredulous", tag: "", addedAt: d(7), reviewLevel: 2, lastReviewedAt: d(8),
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
    tags: [],
  };
}

Object.assign(window, {
  store, STORAGE_KEY, defaultState, seedWords,
  todayKey, dayDiff, fmtDate, relDate, DAY_MS,
  SR_INTERVALS, SR_LABELS, intervalDays, isDue, dueWords,
  computeStreak, addedThisWeek,
  tagColor, TAG_PALETTE, uid, enrichWord, getApiKey, saveApiKey, API_KEY_STORAGE,
});
