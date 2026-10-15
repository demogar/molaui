# 0008 — Rojo means danger on a product screen

**Date:** 2026-10-14 · **Status:** accepted

## Context

ADR 0002 moved the primary action off rojo so that red would keep one meaning: something can be
lost, or has failed. The components honoured it where they spoke about danger (the danger button,
failed states, error bands), but the editorial lineage kept rojo as the system's default accent in
places that say nothing about danger. The 2026-10-14 audit found both meanings on the same screens:

- **The agent hand-off pattern, refund fails** (`patterns-agent-hand-off--refund-fails`): the
  agent's name in each message wore a red dash, a few lines from the red FAILED mark of the tool
  call that failed. The failure was one red thing among several.
- **Rótulo**, the label under nearly every block, defaulted to a red band, because gold measures
  1.66:1 on light cloth. Every run panel, form and card carried a red mark beside its status.
- **Timeline steps** numbered in red, and **list markers** red by a document-wide `::marker` rule,
  so a runbook beside a failed step put its numerals in the failure's colour.
- **The Stat sparkline** ended in a red square on every stat, including the good news.
- **Avatar** picked one of five layers by name, so one person in five was drawn in the danger
  colour, beside the failed runs they owned.
- **The JSON highlighter** coloured `true`, `false` and `null` red; in a failed tool call's payload
  a red `false` read as a second error.
- The caret in every text field and the native `accent-color` were red, and so was the Storybook
  chrome's selected item (that one was put right on its own, in #135).

Nothing enforced the line. The danger role existed (`--danger`, `--ink-danger`), but `--danger` was
`--rojo-deep`, the one status tone that was not its own layer, and components drew their danger
marks in `--rojo` directly. Roles: 33 uses. Primitives: 99.

## Decision

On a product surface, rojo is danger and nothing else, and it is used through the danger role.

- **The role has a full set**: `--danger` (= `--rojo`: a mark, a bar, a band, or a filled region
  carrying `--on-layer`), `--danger-strong` (pressed), `--danger-soft` (a region that belongs to the
  failure), `--ink-danger` (the words, a step deeper so they also read on the wash), and the
  `band-danger` utility. `--danger` is now the layer itself, as `--success` and `--info` are.
- **The editorial accent is gold or ink**: Rótulo's band defaults to ink; the agent's name dash is
  gold with an ink keyline, as gold marks on light cloth already are; step numerals are ink; the
  sparkline's last point is the accent; JSON literals are bold ink; Avatar draws from four layers;
  the caret and `accent-color` are ink and list markers are muted ink.
- **Rojo stays editorial in Prose**, whose links and list markers are rojo, and is still offered by
  name where a component offers the layers (`Divider`, `Panel`, `Rotulo`, `Drawer` and `Dialog`
  take `band="rojo"`). Choosing it there is the caller saying "this is dangerous".
- **Gold is the accent by name**: `--accent`, `--accent-soft`, `--on-accent` and `band-accent`, so
  the hover reveal and the working texture say what they are rather than naming a hue, and an app
  can re-accent without repainting a layer.

## Consequences

- `src/tokens/scopes.test.ts` reads the shipped components and patterns and fails on any rojo token
  (`ROJO_TOKENS` in `src/tokens/scopes.ts`), `band-rojo` or `var(--rojo…)` outside the editorial
  files (`EDITORIAL`), skipping only the entry of a colour-named prop map (`rojo: 'band-rojo'`). It
  also keeps rojo out of the document-wide base styles.
- Visible changes: Rótulo's default band, the agent's name dash, step numerals, list markers
  outside Prose, the sparkline's last point, JSON literals, some avatars' colour and the caret.
  Danger itself paints as before: the role resolves to the
  same rojo the components were writing by hand.
- `--rojo-on-shade` is no longer used by any component (`--ink-danger` has the same value). It
  stays exported; removing a token is breaking.
- Low confidence and a context window past 95% stay in the danger colour: both say that something
  is about to be lost.
