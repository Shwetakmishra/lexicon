# Reshuffle Words Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-view "Shuffle" control to the Study deck and the Word Bank list that randomizes word order, reshuffles on demand, and resets to default order.

**Architecture:** Each view holds a `shuffleOrder` state — either `null` (default order) or an array of word ids in random order. The existing display `useMemo` sorts the filtered list by each word's index in `shuffleOrder` when active, leaving order stable across word-object mutations. A shared `shuffleIds` helper and a `<ShuffleButton>` atom are reused by both views.

**Tech Stack:** Plain browser React (no JSX build step, no bundler) loaded as global `<script>` files via Babel-in-browser. No test framework exists, so each task is verified manually in the browser.

> **Verification note:** This project has no test runner. "Verify" steps mean: serve the app and check behavior in the browser. To serve locally, run `python3 -m http.server 8000` from the repo root and open `http://localhost:8000`. The shared Supabase bank already has words; if empty, add one via the "Add word" button (no API key needed to add a bare word). Each task ends with a commit.

---

### Task 1: Foundation — icon, helper, and shared ShuffleButton

**Files:**
- Modify: `icons.jsx:6-35` (add a `shuffle` entry to `ICON_PATHS`)
- Modify: `helpers.jsx` (add `shuffleIds` near `uid`, ~line 119)
- Modify: `components-shell.jsx` (add `ShuffleButton` + export on `window`)

- [ ] **Step 1: Add the shuffle icon**

In `icons.jsx`, add this entry to the `ICON_PATHS` object (e.g. right after the `"book"` entry on line 34, before the closing `};` on line 35). Mind the trailing comma on the line above.

```js
  "shuffle": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M18 4l3 3l-3 3" /> <path d="M18 20l3 -3l-3 -3" /> <path d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h4" /> <path d="M21 7h-4a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-4" />',
```

- [ ] **Step 2: Add the `shuffleIds` helper**

In `helpers.jsx`, directly after the `uid` function (the one returning `Date.now().toString(36) + ...` around line 119), add:

```js
// Fisher-Yates shuffle — returns a NEW array of the given ids in random order.
function shuffleIds(ids) {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

If `helpers.jsx` has an `Object.assign(window, { ... })` export block, add `shuffleIds` to it. If helpers are plain top-level globals (no export block), no further action — top-level `function` is already global.

- [ ] **Step 3: Add the `ShuffleButton` component**

In `components-shell.jsx`, add this component (e.g. after the `Tag` component, before the `Sidebar`/`NAV` block):

```jsx
/* ---- Shuffle toggle button (shared by Bank + Study) ----
   active=false → "Shuffle" (click = onToggle to shuffle)
   active=true  → "Shuffled ✕" (click body = onToggle to reshuffle, ✕ = onReset) */
function ShuffleButton({ active, onToggle, onReset }) {
  return (
    <div className={`shuffle-btn ${active ? "active" : ""}`}>
      <button className="shuffle-main" onClick={onToggle} title={active ? "Reshuffle" : "Shuffle order"}>
        <Icon name="shuffle" />
        {active ? "Shuffled" : "Shuffle"}
      </button>
      {active && (
        <button className="shuffle-reset" onClick={onReset} title="Reset to default order">
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}
```

Then add `ShuffleButton` to the `Object.assign(window, { ... })` export at the bottom of `components-shell.jsx`. (Check the file's last line for the existing export block and append the name.)

- [ ] **Step 4: Add styles for the shuffle button**

In `styles.css`, append:

```css
.shuffle-btn { display: inline-flex; align-items: stretch; gap: 0; }
.shuffle-btn .shuffle-main {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 14px; cursor: pointer;
  font: inherit; font-size: 14px; color: var(--color-text-secondary);
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 10px;
}
.shuffle-btn.active .shuffle-main {
  color: var(--color-accent); background: var(--color-accent-soft);
  border-color: var(--color-accent); border-top-right-radius: 0; border-bottom-right-radius: 0;
}
.shuffle-btn .shuffle-reset {
  display: inline-flex; align-items: center; cursor: pointer;
  padding: 0 9px; color: var(--color-accent);
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent); border-left: 0;
  border-top-right-radius: 10px; border-bottom-right-radius: 10px;
}
.shuffle-btn .shuffle-main:hover, .shuffle-btn .shuffle-reset:hover { filter: brightness(0.97); }
```

If any of these CSS variables don't exist in the file, open `styles.css`, find the `:root` block, and substitute the nearest existing equivalents (e.g. an existing surface/border/text variable). Do not invent new variable names.

- [ ] **Step 5: Verify it loads**

Serve the app (`python3 -m http.server 8000`, open `http://localhost:8000`). Open the browser devtools console.
Expected: no errors. The app renders as before (the button isn't wired into any view yet). The icon/helper/component are defined globally.

- [ ] **Step 6: Commit**

```bash
git add icons.jsx helpers.jsx components-shell.jsx styles.css
git commit -m "Add shuffle icon, shuffleIds helper, and ShuffleButton atom

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Wire shuffle into the Word Bank

**Files:**
- Modify: `components-bank.jsx:323-372` (`WordBank` — add state, update `useMemo`, render button in toolbar)

- [ ] **Step 1: Add shuffle state**

In `WordBank` (`components-bank.jsx`), alongside the existing `useState` hooks near line 324-327, add:

```jsx
  const [shuffleOrder, setShuffleOrder] = React.useState(null); // null = default order; else array of ids
```

- [ ] **Step 2: Apply the order in the `filtered` useMemo**

Replace the return line of the `filtered` useMemo (currently line 335, `return [...list].sort((a, b) => b.addedAt - a.addedAt);`) with:

```jsx
    if (shuffleOrder) {
      const pos = new Map(shuffleOrder.map((id, i) => [id, i]));
      return [...list].sort((a, b) => (pos.has(a.id) ? pos.get(a.id) : Infinity) - (pos.has(b.id) ? pos.get(b.id) : Infinity));
    }
    return [...list].sort((a, b) => b.addedAt - a.addedAt);
```

Then add `shuffleOrder` to the `useMemo` dependency array (currently `[words, filter, query]` on line 336) so it becomes `[words, filter, query, shuffleOrder]`.

- [ ] **Step 3: Add toggle/reset handlers**

Just below the `filtered` useMemo (after line 336), add:

```jsx
  const onShuffle = React.useCallback(() => {
    setShuffleOrder(shuffleIds(words.map((w) => w.id)));
    setPage(1);
  }, [words]);
  const onResetOrder = React.useCallback(() => { setShuffleOrder(null); setPage(1); }, []);
```

- [ ] **Step 4: Render the button in the toolbar**

In the `.toolbar` block (lines 363-372), add the button after the `.search` div, before the toolbar's closing `</div>`:

```jsx
        {words.length > 1 && (
          <ShuffleButton active={!!shuffleOrder} onToggle={onShuffle} onReset={onResetOrder} />
        )}
```

The `.toolbar` rule in `styles.css` (line ~291) is already `display: flex; align-items: center; gap: 12px; flex-wrap: wrap`, so the button will sit beside the search box with no layout change needed.

- [ ] **Step 5: Verify in the browser**

Serve and open the Word Bank.
Expected:
- A "Shuffle" button appears next to search (only when there are 2+ words).
- Click it → list reorders randomly; button reads "Shuffled" with an ✕; page resets to 1.
- Click "Shuffled" again → order changes again.
- Page through results (desktop pagination or mobile "Load more") → order stays stable across pages.
- Apply a category filter or type a search → the visible subset stays in shuffled order (no reset).
- Click ✕ → returns to newest-first.
- Mark a word mastered while shuffled → its position does NOT change.

- [ ] **Step 6: Commit**

```bash
git add components-bank.jsx styles.css
git commit -m "Word Bank: add shuffle/reshuffle/reset order control

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire shuffle into Study mode

**Files:**
- Modify: `components-study.jsx:6-85` (`StudyMode` — add state, update `deck` useMemo, reset index on shuffle, render button)

- [ ] **Step 1: Add shuffle state**

In `StudyMode` (`components-study.jsx`), alongside the existing `useState` hooks (lines 7-9), add:

```jsx
  const [shuffleOrder, setShuffleOrder] = React.useState(null); // null = bank order; else array of ids
```

- [ ] **Step 2: Apply the order in the `deck` useMemo**

Replace the body of the `deck` useMemo (lines 11-14) with:

```jsx
  const deck = React.useMemo(() => {
    let list = filter === "all" ? words : words.filter((w) => w.tag === filter);
    if (shuffleOrder) {
      const pos = new Map(shuffleOrder.map((id, i) => [id, i]));
      return [...list].sort((a, b) => (pos.has(a.id) ? pos.get(a.id) : Infinity) - (pos.has(b.id) ? pos.get(b.id) : Infinity));
    }
    return list;
  }, [words, filter, shuffleOrder]);
```

- [ ] **Step 3: Add toggle/reset handlers**

After the `deck` useMemo, add:

```jsx
  const onShuffle = React.useCallback(() => {
    setShuffleOrder(shuffleIds(words.map((w) => w.id)));
    setIndex(0); setFlipped(false);
  }, [words]);
  const onResetOrder = React.useCallback(() => {
    setShuffleOrder(null);
    setIndex(0); setFlipped(false);
  }, []);
```

- [ ] **Step 4: Render the button in study-controls**

In the `study-controls` div (lines 149-157), add the shuffle button after the closing of the right-nav `<button>` (after line 156, before the `</div>` on line 157):

```jsx
            <ShuffleButton active={!!shuffleOrder} onToggle={onShuffle} onReset={onResetOrder} />
```

If `study-controls` is centered and adding the button looks cramped, give the new button a `style={{ marginLeft: 16 }}` — but check it visually first; adjust only if needed.

- [ ] **Step 5: Verify in the browser**

Serve and open Study mode (needs 2+ words; add via Word Bank if empty).
Expected:
- A "Shuffle" button appears in the controls row.
- Click it → deck order changes, card resets to 1/N, card is unflipped; button reads "Shuffled".
- Click "Shuffled" again → new order; resets to card 1.
- Flip a card / mark it mastered while shuffled → deck order does NOT change.
- Switch the category filter while shuffled → remaining cards keep shuffled order (reconciled by id).
- Click ✕ → returns to bank order, resets to card 1.
- The Word Bank's shuffle state is independent (shuffling Study does not affect the Bank, and vice versa).

- [ ] **Step 6: Commit**

```bash
git add components-study.jsx
git commit -m "Study mode: add shuffle/reshuffle/reset deck control

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review notes

- **Spec coverage:** Task 1 → `shuffleIds` helper, `ShuffleButton`, shuffle icon. Task 2 → Word Bank placement, stable-across-filter/search/page, reset to newest-first. Task 3 → Study placement, index reset on shuffle/reset, stable across master/review, active across filter change. Per-session (in-memory state, no persistence) — satisfied by using component `useState` only, no Supabase/localStorage writes. Independent per-view — separate state in each component. ✓
- **Type consistency:** `shuffleOrder` is `null | string[]` in both views; `shuffleIds(ids)` takes/returns string arrays; `ShuffleButton` props `active`/`onToggle`/`onReset` are identical at both call sites. ✓
- **No placeholders:** all steps contain concrete code/commands. CSS-variable fallback instructions are explicit (substitute existing vars, don't invent). ✓
