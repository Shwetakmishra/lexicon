# Reshuffle words — design

**Date:** 2026-06-15
**Status:** Approved, ready for implementation plan

## Goal

Let the user reshuffle the order of words in two places: the **Study** flashcard
deck and the **Word Bank** list. Both currently show words in a fixed order
(Bank: newest-first by `addedAt`; Study: the filtered word array as-is).

## Behavior

A `🔀 Shuffle` control in each view:

- **Default (off):** existing order — Bank newest-first, Study bank order.
- **First click:** randomize the current list. Label becomes `🔀 Shuffled ✕`.
- **Click body while active:** reshuffle (a fresh random order).
- **Click `✕` while active:** reset to default order.

State is **per-session and per-view**: held in in-memory React state, not
persisted to Supabase or localStorage, and the two views shuffle independently.

## Core mechanism — order by stable id list

Each view holds `shuffleOrder` state: either `null` (default order) or an
**array of word ids** in random order.

The display `useMemo` filters/searches as it does today, then:

- `shuffleOrder === null` → existing sort (Bank: `addedAt` desc; Study: as-is).
- otherwise → sort the filtered list by each word's index in `shuffleOrder`;
  ids not present in `shuffleOrder` sort to the end.

Storing an **id order** (not a shuffled array of word objects) is the key
detail: when a word object mutates mid-session (mark mastered, review, edit
tag), the `useMemo` recomputes but the order stays put. Shuffling the array
directly would reorder cards on every flip/master. Words added during the
session land at the end until the next reshuffle.

## Shared pieces

- `shuffleIds(ids)` — Fisher-Yates helper in `helpers.jsx`, returns a new
  randomized array.
- `<ShuffleButton active onToggle onReset />` — small presentational component
  in `components-shell.jsx`, reused by both views for a consistent look.
  `onToggle` shuffles/reshuffles; `onReset` clears to default.
- A `shuffle` icon added to `icons.jsx`.

## Per-view placement

### Word Bank (`components-bank.jsx`)
- Button lives in the existing `.toolbar`, next to search.
- `shuffleOrder` is computed over the full `words` list, so it stays stable as
  the user changes filter/search/page.
- Toggling/reshuffling resets to page 1. `✕` returns to newest-first.

### Study (`components-study.jsx`)
- Button lives in the `study-controls` row.
- Reshuffle and reset both set `index` to 0 and unflip.
- Order stays stable while the user marks cards mastered/reviewed.
- Shuffle remains active across category-filter changes (reconciled by id),
  consistent with Bank.

## Edge cases

- Empty deck/bank → control hidden or disabled (nothing to shuffle).
- Filter/search change while shuffled → shuffle stays on; the id-indexed sort
  naturally reconciles the new visible subset.

## Testing

This codebase is plain browser JSX with no build/test tooling, so there is no
test harness to extend. Verification is manual in the browser:

- Shuffle changes order; reshuffle changes it again; reset restores default.
- Marking a card mastered / reviewing does not reorder a shuffled deck.
- Paging through a shuffled Bank keeps a stable order.
- Study and Bank shuffle states are independent.
- Reload clears shuffle (per-session only).
