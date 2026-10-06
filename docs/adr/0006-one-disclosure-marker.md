# 0006 — One disclosure marker: a plus that turns into a cross

**Date:** 2026-10-06 · **Status:** accepted

## Context

The system had two markers for the same behaviour. Accordion and Collapsible used a plus that
turns 45° into a cross, and argued for it in their docs. The AI layer — Reasoning, ToolCall,
AgentRun steps and FileDiff hunks — used a chevron that rotated 90° to point down, and needed a
mirrored variant with the opposite rotation in right-to-left pages. An operator sees both kinds in
one agent console, a few rows apart, and has to learn that they mean the same thing.

## Decision

Every disclosure uses the plus. A chevron says "this goes somewhere": it is already the marker of
a submenu, a pager and a calendar month, all of which move you. A plus says "there is more of this
here", and the cross it becomes is the obvious way to put it back.

The marker turns at `--motion-base`, the duration the panels it opens use, and it is drawn in the
trigger's secondary ink (`ink-2` in a document, `ink-muted` in the quieter AI rows).

## Consequences

- One marker to learn across the library and the AI layer.
- A plus is symmetric, so the RTL mirroring and the counter-rotation it needed are gone.
- A chevron in this system now always means navigation. A new disclosure that reaches for one is
  a review comment.
