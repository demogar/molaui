# Accessibility statement

Mola UI is a component library: it ships inside other people's applications. What it can
promise is that each component, used as documented, does not put a barrier in front of the
people using that application. The application around it is the integrator's to get right, and
the [Foundations/Accessibility](https://demogar.github.io/molaui/?path=/docs/foundations-accessibility--overview)
page says where that line falls.

## Goal

We aim for [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA. That is a target, not a
conformance claim: no one has evaluated Mola UI against WCAG as a whole, and a conformance claim
would need that evaluation, with its scope, date, method and evaluator. What we can show instead
is what is checked on every pull request, and what is not checked yet.

## What is checked on every pull request

A change cannot merge unless all of these pass. None of them can be switched off to get a
pull request green (`CONTRIBUTING.md`).

- **Colour contrast is a tested contract.** `src/tokens/contract.test.ts` resolves every colour
  token in both themes and asserts each promised pairing: text at 4.5:1, control edges at 3:1.
  No colour may be written outside `src/styles/tokens.css`, so none escapes the measurement.
- **Every story is audited with axe**, in the unit suite and again in a real browser in both
  themes with colour contrast on, over every docs page as well. The browser audit also checks
  every story for reflow at 320px and 390px, and tabs through every story to fail any focus stop
  that does not look different when focused.
- **Keyboard behaviour is tested.** Each interactive component has a keyboard table on its page,
  and its tests press those keys. The accessibility tree of the composite components (menus,
  listboxes, the calendar grid, tabs, the data table, the command palette, the thread) is pinned
  as a snapshot, so a change to what a screen reader is given shows up in review as a diff.
- **Forced colours and right-to-left** are screenshotted for each component and compared against
  baselines.
- **Behaviour comes from [Base UI](https://base-ui.com/)** for focus trapping, roving focus and
  ARIA state. Where Base UI has no primitive (Listbox, Tag group, Tree) the WAI-ARIA Authoring
  Practices pattern is written out and held to the same tests.

The design rules behind this (state is never colour alone, disabled is stated rather than faded,
icon-only controls must have a label, touch targets never fall below 24px) are in `AGENTS.md`
and on the Foundations/Accessibility page. Each component page ends with a testing status,
generated from the tests into `docs/accessibility/evidence.json`, so the page cannot claim more
than the tests do.

## Supported environments

- **Browsers:** Chrome 123, Edge 123, Firefox 128 and Safari 17.5, or later.
- **Input:** keyboard, pointer and touch.
- **Display modes:** light and dark themes, three densities, right-to-left, Windows forced
  colours (High Contrast) and `prefers-reduced-motion`.
- **Assistive technologies:** components are built to expose correct roles, names and states,
  but they have **not yet been tested by hand** with a screen reader. See below.

## Known limitations

The full list, kept against the code, is the
[Known gaps](https://demogar.github.io/molaui/?path=/docs/mola-ui-known-gaps--overview) page. The
accessibility gaps today:

- **No component has been tested by hand with VoiceOver, NVDA or JAWS** and the result written
  down. Automated checks can tell that a role and a name exist, not how the page sounds.
- **Thread's "Jump to latest"** has not been tested by hand with a keyboard or a screen reader.
  Nothing automated can drive it.
- **The two smallest avatars** (`xs`, `sm`) set their initials at 9px and 10px. Assistive
  technology hears the full name; sighted readers with low vision may not read the letters. Use
  `md` or larger where the initials must be read.

When a gap is closed, it comes off the Known gaps page and this list in the same pull request.

## Reporting a barrier

If something in Mola UI, or in its documentation site, is hard or impossible to use for you,
please [report an accessibility barrier](https://github.com/demogar/molaui/issues/new?template=accessibility.yml).

- You do not have to tell us anything about yourself or about a disability.
- You do not need a screenshot or a minimal reproduction. Telling us where you were and what
  went wrong is enough; we will do the rest.
- If you would rather not report it in public, write to the maintainer privately, at the email
  address on their [GitHub profile](https://github.com/demogar).

## How reports are handled

Mola UI is maintained by one person, so this is what we aim for rather than a service level.
A report is labelled `accessibility`, acknowledged, and checked against the component. A barrier
in a shipped component is treated as a bug, not a feature request, and is fixed before new work
on that component. If it cannot be fixed soon, it goes on the Known gaps page with a workaround,
and the issue stays open until it is fixed.

## For contributors and coding agents

A change must keep every check above green; it may not lower a contrast pairing, skip an axe
rule or remove a key from a keyboard test to pass. A new component needs its keyboard table, its
accessibility notes and a hard-states story (long label, right-to-left, disabled, error) before
it can merge. The rules a review holds you to are in `CONTRIBUTING.md`, and the short list for
coding agents is in `AGENTS.md`.

## Changing this statement

This statement is maintained with the code. If it is wrong, out of date or missing something,
open an issue or a pull request against `ACCESSIBILITY.md`.
