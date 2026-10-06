# 0005 — Density is a property of the surface, not the component

**Date:** 2026-10-05 · **Status:** accepted

## Context

Dense tools need compact tables; settings pages need breathing room. The common solution is a
`size` or `density` prop on every component, which drifts: a compact table ends up with a
comfortable toolbar above it because one prop was forgotten.

## Decision

`data-density="compact | comfortable | spacious"` on any element. It redefines control height,
row height, horizontal control padding, the small end of the type scale and Tailwind's
`--spacing` unit. Because Tailwind v4 emits utilities as `var()` references, every `p-3`,
`text-sm` and `h-(--control-h)` in the subtree re-scales with no component involvement.

Components keep a `size` prop only for *relative* emphasis within a surface (a small button
beside a large one), and those sizes are themselves density tokens.

## Consequences

- No component takes a density prop, and none should.
- Nothing drops below 11px or a 24px target, even in `compact`.
- `spacious` reproduces the original editorial metric exactly.
