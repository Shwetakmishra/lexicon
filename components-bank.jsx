/* ============================================================
   components-bank.jsx — Word Bank: search, filter, paginated
   expandable list, add-word modal with Claude enrichment.
   ============================================================ */
const PAGE_SIZE = 6;

/* ---- single expandable word row ---- */
function WordRow({ word, open, onToggle, onMaster, onEdit, onDelete }) {
  return (
    <div className={`word-row ${open ? "open" : ""}`}>
      <div className="word-row-head" onClick={onToggle}>
        <span className="word-term">{word.word}</span>
        <span className="word-gloss">{word.definition}</span>
        <div className="word-row-meta">
          <Tag tag={word.tag} />
          <button
            className={`master-star ${word.mastered ? "on" : ""}`}
            title={word.mastered ? "Mastered" : "Mark as mastered"}
            onClick={(e) => { e.stopPropagation(); onMaster(word.id); }}
          >
            <Icon name={word.mastered ? "star-filled" : "star"} />
          </button>
          <Icon name="chevron-down" className="chev" />
        </div>
      </div>
      <div className="word-detail">
        <div className="word-detail-inner">
          <div className="word-detail-pad">
            <div className="detail-block">
              <div className="detail-label">Definition</div>
              <div className="detail-text">{word.definition}</div>
            </div>
            {word.example && (
              <div className="detail-block">
                <div className="detail-label">Example</div>
                <div className="detail-text example">“{word.example}”</div>
              </div>
            )}
            {word.memoryHook && (
              <div className="detail-block">
                <div className="detail-label">Memory hook</div>
                <div className="detail-hook">
                  <Icon name="bulb" />
                  <span>{word.memoryHook}</span>
                </div>
              </div>
            )}
            <div className="detail-foot">
              <span><Icon name="calendar-plus" style={{ marginRight: 5, fontSize: 14 }} />Added {relDate(word.addedAt)}</span>
              <span className="sep"></span>
              <span>{SR_LABELS[word.reviewLevel || 0]} · reviewed {relDate(word.lastReviewedAt)}</span>
              <div className="detail-actions">
                <button className="btn btn-ghost" onClick={() => onDelete(word.id)}>
                  <Icon name="trash" />Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Add-word modal ---- */
function AddWordModal({ tags, onClose, onAdd }) {
  const [word, setWord] = React.useState("");
  const [tag, setTag] = React.useState(tags[0] || "GRE");
  const [newTag, setNewTag] = React.useState("");
  const [showNewTag, setShowNewTag] = React.useState(false);
  const [status, setStatus] = React.useState("idle"); // idle | loading | ready | error
  const [enriched, setEnriched] = React.useState(null);
  const [error, setError] = React.useState("");
  const [savedKey, setSavedKey] = React.useState(() => getApiKey());
  const [keyInput, setKeyInput] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

  const effectiveTag = showNewTag ? newTag.trim() : tag;

  async function handleEnrich() {
    const w = word.trim();
    if (!w) return;
    setStatus("loading");
    setError("");
    setEnriched(null);
    try {
      const data = await enrichWord(w);
      if (!data.definition) throw new Error("No definition returned");
      setEnriched(data);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(
        e.message === "NO_API_KEY"
          ? "Enter your Anthropic API key above to enable AI enrichment."
          : "Couldn’t generate details. Check your API key and connection, or add the word and fill details later."
      );
    }
  }

  function handleSaveKey() {
    const k = keyInput.trim();
    if (!k) return;
    saveApiKey(k);
    setSavedKey(k);
    setKeyInput("");
  }

  function handleSave() {
    const w = word.trim();
    if (!w) return;
    onAdd({
      id: uid(),
      word: w,
      tag: effectiveTag || "GRE",
      definition: enriched?.definition || "",
      example: enriched?.example || "",
      memoryHook: enriched?.memoryHook || "",
      mastered: false,
      reviewLevel: 0,
      lastReviewedAt: null,
      addedAt: Date.now(),
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Add a word</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Word or phrase</label>
            <input
              ref={inputRef}
              className="word-input"
              value={word}
              placeholder="e.g. perspicacious"
              onChange={(e) => { setWord(e.target.value); setStatus("idle"); setEnriched(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && status !== "loading") handleEnrich(); }}
            />
          </div>

          <div className="field">
            <label>Category</label>
            <div className="tag-picker">
              {tags.map((t) => (
                <button
                  key={t}
                  className={`tag-pick ${!showNewTag && tag === t ? "active" : ""}`}
                  style={!showNewTag && tag === t ? { background: tagColor(t).bg, color: tagColor(t).fg } : null}
                  onClick={() => { setTag(t); setShowNewTag(false); }}
                >
                  {t}
                </button>
              ))}
              <button
                className={`tag-pick add-new ${showNewTag ? "active" : ""}`}
                style={showNewTag ? { background: "var(--color-accent-soft)", color: "var(--color-accent)", borderStyle: "solid" } : null}
                onClick={() => setShowNewTag(true)}
              >
                <Icon name="plus" style={{ fontSize: 13, marginRight: 4 }} />New
              </button>
            </div>
            {showNewTag && (
              <input
                style={{ marginTop: 8 }}
                value={newTag}
                placeholder="New category name"
                onChange={(e) => setNewTag(e.target.value)}
                autoFocus
              />
            )}
          </div>

          {!savedKey ? (
            <div className="field">
              <label>Anthropic API key <span style={{ fontWeight: 400, color: "var(--color-text-muted, #888)" }}>— needed for AI enrichment</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  className="word-input"
                  style={{ flex: 1 }}
                  value={keyInput}
                  placeholder="sk-ant-..."
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveKey(); }}
                />
                <button className="btn btn-secondary" onClick={handleSaveKey} disabled={!keyInput.trim()}>Save</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "right" }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "2px 6px" }}
                onClick={() => { saveApiKey(""); setSavedKey(""); setKeyInput(""); }}
              >
                Change API key
              </button>
            </div>
          )}

          {status === "idle" && (
            <button className="btn btn-secondary btn-block" onClick={handleEnrich} disabled={!word.trim()}>
              <Icon name="sparkles" />Generate definition, example &amp; hook
            </button>
          )}
          {status === "loading" && (
            <div className="enrich-loading">
              <div className="spinner"></div>
              <span>Enriching “{word.trim()}” with AI…</span>
            </div>
          )}
          {status === "error" && (
            <>
              <div className="error-banner"><Icon name="alert-triangle" />{error}</div>
              <button className="btn btn-secondary btn-block" onClick={handleEnrich}>
                <Icon name="refresh" />Try again
              </button>
            </>
          )}
          {status === "ready" && enriched && (
            <div className="enrich-preview">
              <div className="detail-block">
                <div className="detail-label">Definition</div>
                <div className="detail-text">{enriched.definition}</div>
              </div>
              {enriched.example && (
                <div className="detail-block">
                  <div className="detail-label">Example</div>
                  <div className="detail-text example">“{enriched.example}”</div>
                </div>
              )}
              {enriched.memoryHook && (
                <div className="detail-block">
                  <div className="detail-label">Memory hook</div>
                  <div className="detail-hook"><Icon name="bulb" /><span>{enriched.memoryHook}</span></div>
                </div>
              )}
              <button className="btn btn-ghost" style={{ justifySelf: "start" }} onClick={handleEnrich}>
                <Icon name="refresh" />Regenerate
              </button>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!word.trim()}>
            <Icon name="plus" />Add word
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Word Bank view ---- */
function WordBank({ words, tags, onMaster, onDelete, onAdd, openAdd, setOpenAdd }) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [openId, setOpenId] = React.useState(null);

  const filtered = React.useMemo(() => {
    let list = words;
    if (filter !== "all") list = list.filter((w) => w.tag === filter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((w) => w.word.toLowerCase().includes(q) || (w.definition || "").toLowerCase().includes(q));
    return [...list].sort((a, b) => b.addedAt - a.addedAt);
  }, [words, filter, query]);

  // reset to page 1 when filters change
  React.useEffect(() => { setPage(1); }, [query, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <PageHead
        title="Word Bank"
        subtitle={`${words.length} word${words.length === 1 ? "" : "s"} collected${query || filter !== "all" ? ` · ${filtered.length} matching` : ""}`}
        action={
          <button className="btn btn-primary" onClick={() => setOpenAdd(true)}>
            <Icon name="plus" />Add word
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            value={query}
            placeholder="Search words or definitions…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-pills" style={{ marginBottom: "calc(18px * var(--density-unit))" }}>
        <button className={`filter-pill ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All
        </button>
        {tags.map((t) => (
          <button key={t} className={`filter-pill ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        query || filter !== "all" ? (
          <EmptyState
            icon="search-off"
            title="No matches"
            body="No words match your search or filter. Try a different term."
          />
        ) : (
          <EmptyState
            icon="book"
            title="Your word bank is empty"
            body="Add your first word and let AI generate a definition, example, and a memory hook for it."
            action={<button className="btn btn-primary" onClick={() => setOpenAdd(true)}><Icon name="plus" />Add your first word</button>}
          />
        )
      ) : (
        <>
          <div className="word-list">
            {pageItems.map((w) => (
              <WordRow
                key={w.id}
                word={w}
                open={openId === w.id}
                onToggle={() => setOpenId(openId === w.id ? null : w.id)}
                onMaster={onMaster}
                onDelete={onDelete}
              />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="pagination">
              <span>Page {safePage} of {pageCount}</span>
              <div className="page-nums">
                <button className="page-num" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
                  <Icon name="chevron-left" />
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`page-num ${p === safePage ? "active" : ""}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                ))}
                <button className="page-num" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}>
                  <Icon name="chevron-right" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {openAdd && (
        <AddWordModal
          tags={tags}
          onClose={() => setOpenAdd(false)}
          onAdd={onAdd}
        />
      )}
    </>
  );
}

Object.assign(window, { WordBank, WordRow, AddWordModal, PAGE_SIZE });
