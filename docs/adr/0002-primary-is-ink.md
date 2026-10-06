# 0002 — The primary action is ink; red means danger

**Date:** 2026-10-05 · **Status:** accepted

## Context

The editorial system's primary button was rojo. A travel guide has one CTA per screen and it should
be the loudest thing on it.

An internal tool has a primary action in nearly every panel — Save, Run, Apply, Approve. Forty red
buttons a day teach an operator that red means "the usual button", and the one place red must keep
its meaning — *this deletes, cancels, or overwrites something* — loses it.

## Decision

- `primary` is the top layer itself: an ink field with cloth lettering. Hover reveals the gold band
  beneath — the same gesture as every other cut shape.
- `danger` is rojo, and is the only red button.
- `secondary` is raised cloth with an ink keyline; `ghost` has no edge until hovered.

## Consequences

Red appears in a session only when something can be lost, or has failed. Status uses the same
mapping (`--danger` is rojo), so a failed run and a destructive button speak the same colour —
deliberately.
