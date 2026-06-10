/* ============================================================
   components-study.jsx — Flashcard study mode + Due Today queue
   ============================================================ */

/* ---- Study mode ---- */
function StudyMode({ words, tags, onMaster, onReview }) {
  const [filter, setFilter] = React.useState("all");
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);

  const deck = React.useMemo(() => {
    let list = filter === "all" ? words : words.filter((w) => w.tag === filter);
    return list;
  }, [words, filter]);

  // keep index valid when deck changes
  React.useEffect(() => { setIndex(0); setFlipped(false); }, [filter]);
  React.useEffect(() => {
    if (index > deck.length - 1) setIndex(Math.max(0, deck.length - 1));
  }, [deck.length, index]);

  const card = deck[index];

  const go = React.useCallback((dir) => {
    setFlipped(false);
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return 0;
      if (next > deck.length - 1) return deck.length - 1;
      return next;
    });
  }, [deck.length]);

  const flip = React.useCallback(() => {
    setFlipped((f) => {
      const nf = !f;
      // mark as reviewed when revealing the back
      if (nf && card) onReview(card.id);
      return nf;
    });
  }, [card, onReview]);

  // keyboard support
  React.useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === " ") { e.preventDefault(); flip(); }
      else if ((e.key === "m" || e.key === "M") && card) { e.preventDefault(); onMaster(card.id); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, flip, card, onMaster]);

  if (words.length === 0) {
    return (
      <>
        <PageHead title="Study" subtitle="Flip cards to test your recall" />
        <EmptyState icon="cards" title="Nothing to study yet" body="Add some words to your bank, then come back to review them as flashcards." />
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Study"
        subtitle="Tap the card or press space to flip · arrow keys to navigate"
      />

      <div className="filter-pills" style={{ marginBottom: 28, justifyContent: "center" }}>
        <button className={`filter-pill ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All ({words.length})
        </button>
        {tags.map((t) => {
          const n = words.filter((w) => w.tag === t).length;
          if (n === 0) return null;
          return (
            <button key={t} className={`filter-pill ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
              {t} ({n})
            </button>
          );
        })}
      </div>

      {deck.length === 0 || !card ? (
        <EmptyState icon="filter-off" title="No cards in this category" body="Pick a different category to study." />
      ) : (
        <div className="study-wrap">
          {/* progress dots */}
          <div className="study-progress">
            {deck.map((w, i) => (
              <div
                key={w.id}
                className={`progress-dot ${i === index ? "current" : w.mastered ? "done" : ""}`}
                title={w.word}
              ></div>
            ))}
          </div>

          {/* the card */}
          <div className="card-stage">
            <div className={`flashcard ${flipped ? "flipped" : ""}`} onClick={flip}>
              {/* front */}
              <div className="card-face front">
                <div className="card-corner">
                  <Tag tag={card.tag} />
                  <button
                    className={`master-star ${card.mastered ? "on" : ""}`}
                    title="Mark as mastered (M)"
                    onClick={(e) => { e.stopPropagation(); onMaster(card.id); }}
                  >
                    <Icon name={card.mastered ? "star-filled" : "star"} />
                  </button>
                </div>
                <div className="card-front-center">
                  <div className="card-word">{card.word}</div>
                  <div className="muted" style={{ fontSize: 13 }}>What does this mean?</div>
                </div>
                <div className="card-flip-hint">
                  <Icon name="rotate-2" />Tap to reveal
                </div>
              </div>
              {/* back */}
              <div className="card-face back">
                <div className="card-corner">
                  <span className="card-back-word">{card.word}</span>
                  <button
                    className={`master-star ${card.mastered ? "on" : ""}`}
                    title="Mark as mastered (M)"
                    onClick={(e) => { e.stopPropagation(); onMaster(card.id); }}
                  >
                    <Icon name={card.mastered ? "star-filled" : "star"} />
                  </button>
                </div>
                <div className="card-back-body">
                  <div className="card-def">{card.definition}</div>
                  {card.example && <div className="card-eg">“{card.example}”</div>}
                  {card.memoryHook && (
                    <div className="card-hook"><Icon name="bulb" /><span>{card.memoryHook}</span></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="study-controls">
            <button className="study-nav-btn" disabled={index === 0} onClick={() => go(-1)}>
              <Icon name="arrow-left" />
            </button>
            <span className="study-counter">{index + 1} / {deck.length}</span>
            <button className="study-nav-btn" disabled={index === deck.length - 1} onClick={() => go(1)}>
              <Icon name="arrow-right" />
            </button>
          </div>

          <button
            className={card.mastered ? "btn btn-secondary" : "btn btn-primary"}
            onClick={() => onMaster(card.id)}
          >
            <Icon name={card.mastered ? "check" : "star"} />
            {card.mastered ? "Mastered" : "Mark as mastered"}
          </button>

          <div className="study-keys">
            <span><kbd>←</kbd><kbd>→</kbd>Navigate</span>
            <span><kbd>Space</kbd>Flip</span>
            <span><kbd>M</kbd>Master</span>
          </div>
        </div>
      )}
    </>
  );
}

/* ---- Due Today (spaced repetition queue) ---- */
function DueToday({ words, onReview, onMaster, goStudy }) {
  const now = Date.now();
  const due = React.useMemo(() => dueWords(words, now).sort((a, b) => (a.reviewLevel || 0) - (b.reviewLevel || 0)), [words]);

  return (
    <>
      <PageHead title="Due Today" subtitle="Spaced repetition — words ready for another look" />

      {due.length === 0 ? (
        <EmptyState
          icon="checks"
          title="All caught up"
          body="Nothing is due for review right now. New words and words you’ve seen recently will resurface here on a 1 / 3 / 7 / 14-day schedule."
        />
      ) : (
        <>
          <div className="due-banner">
            <div className="due-banner-icon"><Icon name="calendar-due" /></div>
            <div className="due-banner-text">
              <h3>{due.length} word{due.length === 1 ? "" : "s"} due for review</h3>
              <p>Review each one, or jump into a focused study session.</p>
            </div>
            <button className="btn btn-primary" onClick={goStudy}><Icon name="cards" />Study now</button>
          </div>

          {due.map((w) => (
            <div className="due-card" key={w.id}>
              <span className="due-word">{w.word}</span>
              <span className="due-gloss">{w.definition}</span>
              <span className="due-level">
                <Icon name="circles" style={{ fontSize: 14 }} />{SR_LABELS[w.reviewLevel || 0]}
              </span>
              <div className="due-actions">
                <button className="btn btn-secondary" onClick={() => onReview(w.id)}>
                  <Icon name="check" />Reviewed
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}

Object.assign(window, { StudyMode, DueToday });
