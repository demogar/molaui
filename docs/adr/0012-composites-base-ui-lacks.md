# 0012 — Composite widgets Base UI does not provide follow the APG, written out

**Date:** 2026-10-14 · **Status:** accepted

## Context

The rule is "Base UI for behaviour": focus trapping, roving focus and type-ahead come from its
primitives rather than being written again. The 2026-10-14 audit asked for three selection
components — Listbox (#108), Tag group (#109) and Tree (#107) — and Base UI 1.9 has none of them.
Its listbox lives inside the Select and Combobox popups; it has no grid and no tree.

Three ways were open:

1. **Import Base UI's internal composite list** (`@base-ui/react/internals/composite`). It is in
   the package's export map, but it is internal: undocumented, and free to change shape in any
   release. Base UI is a peer dependency (`^1.9.0`), so the copy a consumer installs, not the one
   this repository pins, is what would run. A patch release could break the three components in a
   consumer's app with nothing in our CI able to see it.
2. **Bend a public primitive.** ToggleGroup gives roving focus over buttons, but its semantics are
   `aria-pressed` buttons, not options, rows or tree items, and it has no levels, no expansion, no
   range selection and no removal. The result would be the wrong tree for a screen reader with the
   right keys.
3. **Write the WAI-ARIA APG pattern out**, once per widget, and hold it to the same gates the
   Base UI components meet.

## Decision

The third. Listbox follows the APG listbox (single: selection follows focus; multiple: the
recommended model where arrows move and Space toggles, with Shift and Control+Shift ranges and
Control+A). Tag group follows the APG grid as the major React tag groups do: a `grid` of `row`s,
one tab stop, Delete and Backspace to remove. Tree follows the APG tree view, rendered as a flat run
of `treeitem`s with `aria-level`, `aria-setsize` and `aria-posinset` (so a branch is not named by
its descendants' text, and a focus ring does not frame a subtree).

What they share is shared: type-ahead is one hook, `src/lib/typeahead.ts`. Each uses
`useControllable`, `mergeProps` and the direction from Base UI's `DirectionProvider`, so
right-to-left mirrors the arrows the way the Base UI components do.

They meet the gates a primitive would have given us for free:

- every key in each keyboard table is pressed by the component's unit tests
  (`keyboard-coverage.test.ts`);
- each has an ARIA snapshot from Chromium in `test/visual/aria.behaviour.ts`, so the roles, names,
  levels and states a screen reader is handed are pinned;
- the stories run through axe, and through the browser audit in both themes.

## Consequences

- About 600 lines of behaviour Mola owns, and must fix itself, instead of inheriting fixes.
- The three ship as `experimental`, so their API can still move.
- When Base UI ships a public listbox, tree or grid, the component moves onto it in a minor
  release, keeping its props; the keyboard tests and ARIA snapshots are what prove the move changed
  nothing a person can notice.
- "Base UI for behaviour" still holds for anything Base UI has. A fourth hand-written composite
  needs the same reason: no public primitive.
