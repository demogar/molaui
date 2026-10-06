# 0004 — Two themes in one declaration, with `light-dark()`

**Date:** 2026-10-05 · **Status:** accepted

## Context

The editorial ADR noted a dark theme would be "one more block redefining the same names". That is
the usual approach — and it duplicates every colour token, lets one theme silently lack a token
the other has, and needs JavaScript to follow the OS preference.

## Decision

Every colour token is a `light-dark(light, dark)` pair. `color-scheme` selects the value; it
defaults to `light dark` (follow the OS) and `data-theme` pins it on any element.

In the dark theme the cloth is **dyed, not inverted**: the ground is the near-black base layer of
a mola, the keyline becomes bleached cotton, and the four layers are lifted until they carry text.
`--ink` keeps its *role* — foreground and keyline — not its hue.

## Consequences

- No script, no flash: the browser resolves the theme before first paint.
- A subtree can re-theme itself (a dark log viewer inside a light page) with one attribute.
- Washes that were legal at 20% in light failed in dark (`--ink-muted` on `--oro-soft` measured
  4.00); the contract test caught it, and the dark wash is mixed thinner. This is the kind of
  regression the single declaration makes testable: both values sit side by side, and the test
  resolves both.
- Custom properties keep `light-dark()` unresolved until a real property uses them, so composite
  tokens (`--cut`, `--focus-ring`) follow the subtree's scheme without redeclaration.
