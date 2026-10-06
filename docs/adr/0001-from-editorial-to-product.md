# 0001 — Carrying Mola from an editorial site into product software

**Date:** 2026-10-05 · **Status:** accepted

## Context

Mola began as the design system of mustdopanama.com, a curated travel guide. Its identity — the
reverse-appliqué *mola* of the Guna of Guna Yala: flat saturated layers, hard ink keylines, a
revealed band of colour under every cut edge, zero radius — was chosen to escape the house style
of machine-generated editorial design (warm cream, display serif, copper accent, soft radii).

An editorial site and an internal tool want different things from the same identity. The guide
had one call to action per screen, 17px reading copy, generous rhythm and no dark mode. An
operator console has a primary action in every panel, tables of a hundred rows, eight-hour
sessions, and states the guide never had: streaming, long-running, waiting for approval, failed
with a retry.

## Decision

Keep the identity whole; re-argue the metrics.

| Kept as is | Re-argued |
| --- | --- |
| The cut, the band, relleno, diente, rótulo | Type scale: 14px product base, density-dependent |
| Zero radius, ink keylines via `box-shadow` | Primary action is ink, not red (ADR 0002) |
| Archivo on its width axis, Alegreya for reading | A third voice for machine literals (ADR 0003) |
| The contrast discipline, now enforced by test | A dark theme, declared in the same tokens (ADR 0004) |
| | Density as a surface attribute (ADR 0005) |
| | Relleno, moving, as the indeterminate "working" state |

## Consequences

The editorial metric survives as `data-density="spacious"`, so the lineage is one attribute away
and the original site could adopt the library without re-tuning.
