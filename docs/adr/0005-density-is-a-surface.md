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

## Amendment (2026-10-14): the spacing unit scales down only, and icons follow the type

The decision above says density redefines "Tailwind's `--spacing` unit". Only `compact` ever did
(3.5px); `spacious` kept the comfortable 4px, and the 2026-10-14 audit read that as a gap between
the record and the code.

It is the record that was wrong. The editorial site was laid out on a 4px unit, and `spacious`
exists to reproduce that site exactly, which is the last consequence above. A 4.5px unit would
have widened every gap and padding past the metric it is meant to preserve. So the spacing unit
scales **down** for density and stays put going up; what grows in `spacious` is the type, the
control and row heights, and the glyphs.

Glyphs are now density tokens of their own (`--icon-xs`, `--icon-sm`, `--icon`, `--icon-lg`),
because an icon follows the text beside it. As spacing steps (`size-4`) they shrank in `compact`
only by accident of the unit and stayed at 16px beside 17px text in `spacious`. The type scale's
line heights are declared beside its sizes, as ratios, so a density that re-scales a size keeps its
rhythm.

## Amendment (2026-10-14): every density reflows at 320px

Density is a reader's preference, like text size, and WCAG 1.4.10 (reflow at 320 CSS px) does
not exempt one. `spacious` is not a desktop-only presentation: someone who chose it on a phone
gets it on the phone. So every component holds at 320px in all three densities, not only the
composed screens (#130).

Where `spacious` cannot fit, the component gives way at small viewports rather than the density
being ignored: a calendar's days are capped at the comfortable 36px below the `sm` breakpoint,
and pagination drops its sibling pages ("1 … 5 … 26") below 25rem, keeping a fixed slot count.
Both still meet the 24px target size. The browser audit (`scripts/audit.mjs`) measures every
story at spacious density at 320px, and the composed screens at 1024 and 768 as well.
