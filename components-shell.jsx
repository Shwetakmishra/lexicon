/* ============================================================
   components-shell.jsx — Sidebar, Tag, shared atoms
   ============================================================ */

/* ---- Tag pill ---- */
function Tag({ tag, onClick, style }) {
  if (!tag) return null;
  const c = tagColor(tag);
  return (
    <span
      className="tag"
      onClick={onClick}
      style={{ background: c.bg, color: c.fg, cursor: onClick ? "pointer" : "default", ...style }}
    >
      <span className="tag-dot" style={{ background: c.dot }}></span>
      {tag}
    </span>
  );
}

/* ---- Sidebar nav ---- */
const NAV = [
  { id: "bank", label: "Word Bank", icon: "books" },
  { id: "study", label: "Study", icon: "cards" },
  { id: "due", label: "Due Today", icon: "calendar-due" },
  { id: "progress", label: "Progress", icon: "chart-arcs" },
];

function Sidebar({ view, setView, counts, streak }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">L</div>
        <div>
          <div className="brand-name">Lexicon</div>
          <div className="brand-sub">Vocabulary</div>
        </div>
      </div>

      <div className="nav-section-label">Library</div>
      {NAV.map((n) => (
        <button
          key={n.id}
          className={`nav-item ${view === n.id ? "active" : ""}`}
          onClick={() => setView(n.id)}
        >
          <Icon name={n.icon} />
          <span>{n.label}</span>
          {n.id === "bank" && counts.total > 0 && (
            <span className="nav-count">{counts.total}</span>
          )}
          {n.id === "due" && counts.due > 0 && (
            <span className="nav-count due">{counts.due}</span>
          )}
        </button>
      ))}

      <div className="sidebar-footer">
        <div className="streak-chip">
          <div className="streak-flame"><Icon name="flame" /></div>
          <div>
            <div className="streak-num">{streak} day{streak === 1 ? "" : "s"}</div>
            <div className="streak-label">Current streak</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ---- Empty state ---- */
function EmptyState({ icon, title, body, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

/* ---- Page header ---- */
function PageHead({ title, subtitle, action }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function BottomNav({ view, setView, counts }) {
  return (
    <nav className="bottom-nav">
      {NAV.map((n) => (
        <button key={n.id} className={`bottom-nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
          {n.id === "bank" && counts.total > 0 && <span className="nav-count">{counts.total}</span>}
          {n.id === "due" && counts.due > 0 && <span className="nav-count due">{counts.due}</span>}
        </button>
      ))}
    </nav>
  );
}

Object.assign(window, { Tag, Sidebar, BottomNav, EmptyState, PageHead, NAV });
