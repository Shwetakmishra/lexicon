/* ============================================================
   components-progress.jsx — Progress dashboard
   ============================================================ */

function StatCard({ icon, iconBg, iconFg, value, label }) {
  return (
    <div className="stat-card">
      <div className="ti-wrap" style={{ display: "contents" }}>
        <Icon name={icon} style={{ background: iconBg, color: iconFg }} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Progress({ words, activityDates, tags, streak }) {
  const total = words.length;
  const mastered = words.filter((w) => w.mastered).length;
  const thisWeek = addedThisWeek(words);
  const masterPct = total ? Math.round((mastered / total) * 100) : 0;
  const dueCount = dueWords(words).length;

  // last 14 days streak calendar
  const cal = React.useMemo(() => {
    const set = new Set(activityDates);
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS);
      out.push({
        key: todayKey(d),
        active: set.has(todayKey(d)),
        today: i === 0,
        dow: d.toLocaleDateString("en-US", { weekday: "narrow" }),
      });
    }
    return out;
  }, [activityDates]);

  // per-tag breakdown
  const tagBreakdown = React.useMemo(() => {
    const counts = {};
    words.forEach((w) => { counts[w.tag] = (counts[w.tag] || 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count, pct: (count / max) * 100 }));
  }, [words]);

  return (
    <>
      <PageHead title="Progress" subtitle="Your vocabulary journey at a glance" />

      <div className="stat-grid">
        <StatCard icon="books" iconBg="var(--color-accent-soft)" iconFg="var(--color-accent)" value={total} label="Total words" />
        <StatCard icon="star-filled" iconBg="var(--color-mastered-soft)" iconFg="var(--color-mastered)" value={mastered} label="Mastered" />
        <StatCard icon="calendar-plus" iconBg="var(--color-success-soft)" iconFg="var(--color-success)" value={thisWeek} label="Added this week" />
        <StatCard icon="flame" iconBg="var(--color-due-soft)" iconFg="var(--color-due)" value={streak} label="Day streak" />
      </div>

      <div className="panel">
        <div className="panel-title">Mastery</div>
        <div className="panel-sub">{mastered} of {total} words mastered · {dueCount} due for review</div>
        <div className="mastery-bar">
          <div className="mastery-fill" style={{ width: masterPct + "%" }}></div>
        </div>
        <div className="mastery-legend">
          <span>{masterPct}% mastered</span>
          <span>{total - mastered} still learning</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Activity</div>
        <div className="panel-sub">Days with at least one word added or reviewed — last 14 days</div>
        <div className="streak-cal">
          {cal.map((c) => (
            <div className="cal-cell" key={c.key}>
              <div className={`cal-box ${c.active ? "active" : ""} ${c.today ? "today" : ""}`} title={c.key}></div>
              <div className="cal-day">{c.dow}</div>
            </div>
          ))}
        </div>
      </div>

      {tagBreakdown.length > 0 && (
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-title">By category</div>
          <div className="panel-sub">How your words are distributed</div>
          <div className="tag-stats">
            {tagBreakdown.map(({ tag, count, pct }) => {
              const c = tagColor(tag);
              return (
                <div className="tag-stat-row" key={tag}>
                  <Tag tag={tag} />
                  <div className="tag-stat-bar">
                    <div className="tag-stat-fill" style={{ width: pct + "%", background: c.dot }}></div>
                  </div>
                  <span className="tag-stat-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { Progress, StatCard });
