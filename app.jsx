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
  const [state, setState] = React.useState(null);
  const [view, setView] = React.useState("bank");
  const [openAdd, setOpenAdd] = React.useState(false);
  const loaded = React.useRef(false);

  /* ---- load persisted state ---- */
  React.useEffect(() => {
    (async () => {
      const saved = await store.get(STORAGE_KEY);
      if (saved && Array.isArray(saved.words)) {
        const stripGre = (t) => (t === "GRE" || t === "gre" ? "" : t);
        setState({
          words: saved.words.map((w) => ({ ...w, tag: stripGre(w.tag || "") })),
          activityDates: saved.activityDates || [],
          tags: (saved.tags || []).filter((t) => t !== "GRE" && t !== "gre"),
        });
      } else {
        setState(defaultState());
      }
      loaded.current = true;
    })();
  }, []);

  /* ---- persist on change ---- */
  React.useEffect(() => {
    if (loaded.current && state) store.set(STORAGE_KEY, state);
  }, [state]);

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

  /* ---- helpers to record activity ---- */
  const recordActivity = (dates) => {
    const today = todayKey();
    return dates.includes(today) ? dates : [...dates, today];
  };

  /* ---- mutations ---- */
  const addWord = React.useCallback((word) => {
    setState((s) => {
      const tags = s.tags.includes(word.tag) ? s.tags : [...s.tags, word.tag];
      return { ...s, words: [word, ...s.words], tags, activityDates: recordActivity(s.activityDates) };
    });
  }, []);

  const deleteWord = React.useCallback((id) => {
    setState((s) => ({ ...s, words: s.words.filter((w) => w.id !== id) }));
  }, []);

  const editWordTag = React.useCallback((id, tag) => {
    setState((s) => {
      const tags = tag && !s.tags.includes(tag) ? [...s.tags, tag] : s.tags;
      return { ...s, words: s.words.map((w) => w.id === id ? { ...w, tag } : w), tags };
    });
  }, []);

  const toggleMaster = React.useCallback((id) => {
    setState((s) => ({
      ...s,
      words: s.words.map((w) => {
        if (w.id !== id) return w;
        const mastered = !w.mastered;
        return {
          ...w,
          mastered,
          reviewLevel: mastered ? SR_INTERVALS.length - 1 : w.reviewLevel,
          lastReviewedAt: mastered ? Date.now() : w.lastReviewedAt,
        };
      }),
      activityDates: recordActivity(s.activityDates),
    }));
  }, []);

  // advance=true bumps SR level (explicit "Reviewed"); advance=false just resets the due timer (seen in study)
  const markReviewed = React.useCallback((id, advance = true) => {
    setState((s) => ({
      ...s,
      words: s.words.map((w) => {
        if (w.id !== id) return w;
        return {
          ...w,
          lastReviewedAt: Date.now(),
          reviewLevel: advance ? Math.min((w.reviewLevel || 0) + 1, SR_INTERVALS.length - 1) : (w.reviewLevel || 0),
        };
      }),
      activityDates: recordActivity(s.activityDates),
    }));
  }, []);

  if (!state) {
    return <div style={{ display: "grid", placeItems: "center", height: "100%" }}><div className="spinner"></div></div>;
  }

  const streak = computeStreak(state.activityDates);
  const counts = { total: state.words.length, due: dueWords(state.words).length };

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} counts={counts} streak={streak} />
      <BottomNav view={view} setView={setView} counts={counts} />
      <main className="main">
        <div className="main-inner">
          {view === "bank" && (
            <WordBank
              words={state.words}
              tags={state.tags}
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
              words={state.words}
              tags={state.tags}
              onMaster={toggleMaster}
              onReview={(id) => markReviewed(id, false)}
            />
          )}
          {view === "due" && (
            <DueToday
              words={state.words}
              onReview={(id) => markReviewed(id, true)}
              onMaster={toggleMaster}
              goStudy={() => setView("study")}
            />
          )}
          {view === "progress" && (
            <Progress
              words={state.words}
              activityDates={state.activityDates}
              tags={state.tags}
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
