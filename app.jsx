/* ============================================================
   app.jsx — root: state, persistence, routing, tweaks
   ============================================================ */

const ACCENT_PALETTES = {
  // [accent, hover, soft]
  "Indigo":     ["#4B40D6", "#3D33B8", "#EEEDFB"],
  "Forest":     ["#1F7A5C", "#176046", "#E1F1E9"],
  "Cobalt":     ["#2B6098", "#23507F", "#E5EEF6"],
  "Plum":       ["#8E3C9E", "#763285", "#F4E9F6"],
  "Terracotta": ["#BD4A30", "#9F3C26", "#FBEBE5"],
};
const DISPLAY_FONTS = {
  "Newsreader": '"Newsreader", Georgia, serif',
  "Lora": '"Lora", Georgia, serif',
  "Spectral": '"Spectral", Georgia, serif',
};
const DENSITY = { compact: 0.78, regular: 1, comfy: 1.22 };

function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": ["#4B40D6", "#3D33B8", "#EEEDFB"],
  "displayFont": "Newsreader",
  "density": "regular"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [words, setWords] = React.useState(null); // null = still loading
  const [activityDates, setActivityDates] = React.useState(getActivityDates);
  const [view, setView] = React.useState("bank");
  const [openAdd, setOpenAdd] = React.useState(false);

  // tags are derived from whatever words exist — no separate store needed
  const tags = React.useMemo(() => {
    const out = [];
    for (const w of words || []) if (w.tag && !out.includes(w.tag)) out.push(w.tag);
    return out;
  }, [words]);

  const refetch = React.useCallback(async () => {
    try { setWords(await dbFetchWords()); } catch (e) { /* keep prior state */ }
  }, []);

  /* ---- load shared words from Supabase + subscribe to live changes ---- */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      let rows = [];
      try { rows = await dbFetchWords(); } catch (e) { rows = []; }
      // First-ever load: seed the shared bank from this device's old local
      // data if present, otherwise the starter set. Runs once (table empty).
      if (rows.length === 0) {
        const saved = await store.get(STORAGE_KEY);
        const seed = (saved && Array.isArray(saved.words) && saved.words.length) ? saved.words : seedWords();
        await dbUpsertWords(seed);
        try { rows = await dbFetchWords(); } catch (e) { rows = seed; }
      }
      if (alive) setWords(rows);
    })();

    const channel = window.SB
      .channel("words-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "words" }, () => { refetch(); })
      .subscribe();

    return () => { alive = false; window.SB.removeChannel(channel); };
  }, [refetch]);

  /* ---- persist streak/activity locally (per device) ---- */
  React.useEffect(() => { saveActivityDates(activityDates); }, [activityDates]);

  /* ---- apply tweaks to CSS vars ---- */
  React.useEffect(() => {
    const root = document.documentElement;
    const [accent, hover, soft] = Array.isArray(t.accent) ? t.accent : ACCENT_PALETTES.Indigo;
    root.style.setProperty("--color-accent", accent);
    root.style.setProperty("--color-accent-hover", hover);
    root.style.setProperty("--color-accent-soft", soft);
    root.style.setProperty("--color-accent-ring", hexToRgba(accent, 0.18));
    root.style.setProperty("--font-display", DISPLAY_FONTS[t.displayFont] || DISPLAY_FONTS.Newsreader);
    root.style.setProperty("--density-unit", String(DENSITY[t.density] || 1));
  }, [t.accent, t.displayFont, t.density]);

  /* ---- record today's activity (local streak) ---- */
  const recordActivity = React.useCallback(() => {
    setActivityDates((dates) => {
      const today = todayKey();
      return dates.includes(today) ? dates : [...dates, today];
    });
  }, []);

  // apply a change to one word locally (optimistic) and persist it to the cloud
  const updateWordLocal = React.useCallback((id, fn) => {
    setWords((ws) => {
      const next = (ws || []).map((w) => w.id === id ? fn(w) : w);
      const changed = next.find((w) => w.id === id);
      if (changed) dbUpsertWord(changed);
      return next;
    });
  }, []);

  /* ---- mutations ---- */
  const addWord = React.useCallback((word) => {
    setWords((ws) => [word, ...(ws || [])]);
    dbUpsertWord(word);
    recordActivity();
  }, [recordActivity]);

  const deleteWord = React.useCallback((id) => {
    setWords((ws) => (ws || []).filter((w) => w.id !== id));
    dbDeleteWord(id);
  }, []);

  const editWordTag = React.useCallback((id, tag) => {
    updateWordLocal(id, (w) => ({ ...w, tag }));
  }, [updateWordLocal]);

  const toggleMaster = React.useCallback((id) => {
    updateWordLocal(id, (w) => {
      const mastered = !w.mastered;
      return {
        ...w,
        mastered,
        reviewLevel: mastered ? SR_INTERVALS.length - 1 : w.reviewLevel,
        lastReviewedAt: mastered ? Date.now() : w.lastReviewedAt,
      };
    });
    recordActivity();
  }, [updateWordLocal, recordActivity]);

  // advance=true bumps SR level (explicit "Reviewed"); advance=false just resets the due timer (seen in study)
  const markReviewed = React.useCallback((id, advance = true) => {
    updateWordLocal(id, (w) => ({
      ...w,
      lastReviewedAt: Date.now(),
      reviewLevel: advance ? Math.min((w.reviewLevel || 0) + 1, SR_INTERVALS.length - 1) : (w.reviewLevel || 0),
    }));
    recordActivity();
  }, [updateWordLocal, recordActivity]);

  if (!words) {
    return <div style={{ display: "grid", placeItems: "center", height: "100%" }}><div className="spinner"></div></div>;
  }

  const streak = computeStreak(activityDates);
  const counts = { total: words.length, due: dueWords(words).length };

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} counts={counts} streak={streak} />
      <BottomNav view={view} setView={setView} counts={counts} />
      <main className="main">
        <div className="main-inner">
          {view === "bank" && (
            <WordBank
              words={words}
              tags={tags}
              onMaster={toggleMaster}
              onDelete={deleteWord}
              onAdd={addWord}
              onEditTag={editWordTag}
              openAdd={openAdd}
              setOpenAdd={setOpenAdd}
            />
          )}
          {view === "study" && (
            <StudyMode
              words={words}
              tags={tags}
              onMaster={toggleMaster}
              onReview={(id) => markReviewed(id, false)}
            />
          )}
          {view === "due" && (
            <DueToday
              words={words}
              onReview={(id) => markReviewed(id, true)}
              onMaster={toggleMaster}
              goStudy={() => setView("study")}
            />
          )}
          {view === "progress" && (
            <Progress
              words={words}
              activityDates={activityDates}
              tags={tags}
              streak={streak}
            />
          )}
        </div>
      </main>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={Object.values(ACCENT_PALETTES)}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakSection label="Typography" />
        <TweakRadio
          label="Word font"
          value={t.displayFont}
          options={Object.keys(DISPLAY_FONTS)}
          onChange={(v) => setTweak("displayFont", v)}
        />
        <TweakSection label="Layout" />
        <TweakRadio
          label="Density"
          value={t.density}
          options={["compact", "regular", "comfy"]}
          onChange={(v) => setTweak("density", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
