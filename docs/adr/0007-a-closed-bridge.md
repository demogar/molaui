# 0007 — The Tailwind bridge is closed

**Date:** 2026-10-14 · **Status:** accepted

## Context

`theme.css` added Mola's names to Tailwind's theme but never took Tailwind's away. The 2026-10-14
audit found what that cost:

- Components had drifted onto defaults nobody chose: seven `max-w-*` steps, `leading-relaxed`,
  `tracking-normal`. `rounded-3xl`, `shadow-lg`, `ease-in` and the whole default palette
  (`bg-red-500`) compiled. The no-hex test could not see them, because a default colour has no hex
  in this repository, and the scope test only knew bridged Mola tokens.
- `--container-prose: 38rem` never reached an element. Tailwind ships a static `max-w-prose`
  (`65ch`) that outranks a theme key with the same name, so `Prose`, `Lead` and
  `Container size="prose"` used Tailwind's measure.
- `--breakpoint-nav: 920px` sat beside rem breakpoints. Tailwind cannot sort mixed units, so it
  emitted `nav:` before `sm:`.
- A `transition-*` utility that did not repeat `duration-(--motion-cut) ease-cut` ran on
  Tailwind's 150ms ease-in-out. At least thirteen did not repeat it.

## Decision

- **Close the namespaces Mola has an answer for.** Before Mola declares its own names, `@theme`
  resets colour, radius, shadow (including inset, drop and text shadow), blur, ease, animate,
  leading, tracking, container, breakpoint, font, perspective and aspect to `initial`.
- **Re-declare what is genuinely used, as Mola's own scale.** Container steps `xs` to `5xl` keep
  Tailwind's values, because dialogs, the drawer, the tooltip and the pattern screens' `@sm` to
  `@4xl` container queries are built on them. The steps above `5xl` were never used and stay
  closed. The breakpoints are declared in rem with `nav` at `57.5rem`, so they sort by width.
  `--spacing: 0.25rem` and `--tracking-normal: 0em` (the way back out of the label register)
  are declared too.
- **The reading measure is `max-w-reading`, backed by `--container-reading: 65ch`.** The `prose`
  name cannot be reclaimed, because no namespace reset removes a static utility. The value is the
  one every prose block has actually been set at, not the 38rem the dead token held. Measured in
  Chromium, 65ch holds about 89 average Alegreya characters at 15, 16 and 17px, because Alegreya's
  zero is wide. 38rem would have held 92 at the 17px document size and widened the 15px chat column
  to 104. A measure in `ch` follows the type size, which a reading column should. The old claim of
  "about 70 characters" was true of neither value and has been corrected. Narrowing the measure
  towards 70 characters is a separate typographic decision, not part of wiring the token.
- **Transitions default to Mola's motion:** `--default-transition-duration: var(--motion-cut)`
  and `--default-transition-timing-function: var(--ease-cut)`. The cut, not the base, because
  most transitions here are a hover or a press. The per-site repeats are gone, and a slower
  transition says `duration-(--motion-base)`.
- **Left open:** `--text-*`, because the defaults carry line-height companions that every
  component's rhythm was tuned against, so closing them is a change of its own. Also
  `--font-weight-*`, because weights belong to the typeface.

## Consequences

- `src/styles/bridge.test.ts` compiles the stylesheet with Tailwind's own compiler, as a
  consumer's build does. It holds both halves: the defaults compile to nothing, and every class in
  those families that the components, patterns, stories and docs write still compiles to a Mola
  token (`var(--…)`), with only keywords such as `max-w-none` allowed as literals. The second
  half is what catches a returning `max-w-prose`.
- This reaches consumers too. An app that imports `@demogar/mola-ui/tailwind.css` into its own
  Tailwind build loses `bg-red-500`, `shadow-lg` and the rest. That is a breaking change, and it
  shipped as one. An app that needs the defaults imports `tokens.css` alone and bridges the names
  it wants.
