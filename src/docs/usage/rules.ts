/**
 * The design rules a review holds every screen to, each with the reason it
 * exists. CLAUDE.md, CONTRIBUTING.md and the Principles page say the same in
 * prose; this is the copy the agent manifest and llms.txt are generated from,
 * so an agent reads the rules in the same words a reviewer applies them.
 */
export interface Rule {
  rule: string
  why: string
}

export const RULES: Rule[] = [
  {
    rule: 'Interactive edges use `shadow-cut` (`shadow-floating` on popups, `shadow-overlay` on dialogs and drawers), never `border`. `border-keyline` is for decorative dividers only. Every other edge is a named utility (`rule-b`, `cut-t`, `bar-start-ink`, `cut-anil`, `focus-ring`), never an arbitrary `shadow-[…]` or an `rtl:` twin.',
    why: 'A box-shadow edge can grow a revealed band on hover without moving its neighbours; the named edges flip for right-to-left by themselves and keep an edge in forced-colours mode.',
  },
  {
    rule: 'Radius is zero. `rounded-full` only for something that is genuinely a dot.',
    why: 'The system is cut cloth: nothing in it is rounded.',
  },
  {
    rule: 'State is never colour alone: glyph, word and colour, in that order of importance.',
    why: 'It has to survive colour blindness, a greyscale screenshot and forced colours.',
  },
  {
    rule: 'Disabled is stated, not faded. No `opacity-*` on a disabled control.',
    why: 'Opacity fades the keyline and the label to about 2:1, a failure axe does not report because disabled controls are exempt.',
  },
  {
    rule: 'Colours come from tokens, each through a utility its scope allows (surface `bg-`, text `text-`, edge `border-`/`decoration-`, mark `bg-`/`fill-`). No hex, rgb or arbitrary colour values outside `tokens.css`.',
    why: 'Every token pairing has a measured contrast ratio in both themes; a colour outside the token file, or a token outside its scope (`text-cloth-pale` compiles), was never measured.',
  },
  {
    rule: 'Theme and density are attributes (`data-theme`, `data-density`) on `<html>` or a subtree, not props or React context.',
    why: 'Dialogs and menus portal to `<body>` and must inherit them. No component takes a density prop.',
  },
  {
    rule: 'Lay out with logical properties: `ps-`/`pe-`, `ms-`/`me-`, `inset-s-`/`inset-e-`, `text-start`/`text-end`.',
    why: '`dir="rtl"` then mirrors the layout with no second set of classes.',
  },
  {
    rule: 'Typefaces have roles: Archivo (`font-ui`) for the interface, Alegreya (`font-text`) for prose from a person or a model, Martian Mono (`literal`) only for machine literals.',
    why: 'A reader can tell from the letterforms whether the product, a person or the machine is speaking.',
  },
  {
    rule: 'Labels are sentence case; buttons start with a verb and name the object (“Cancel run”, not “OK”).',
    why: 'A button that names its consequence can be chosen without reading the surrounding text.',
  },
  {
    rule: 'Unknown duration is the relleno working state, never a spinner; elapsed time counts up instead of a progress bar inventing a percentage.',
    why: 'Model work has no knowable total, and a bar that stalls at 90% is a lie.',
  },
  {
    rule: 'Anything that writes to the world waits for a person, with the choices given equal weight (`ToolCall` approval, `ChangeReview`).',
    why: 'An agent’s action is only as safe as the decision in front of it.',
  },
  {
    rule: 'Use the components for behaviour. Do not re-implement focus trapping, roving focus or typeahead; the components are built on Base UI.',
    why: 'A maintained primitive gets keyboard and screen-reader behaviour right in more cases than a local copy.',
  },
  {
    rule: 'Check a component’s lifecycle phase before building on it. Stable is covered by semver, Experimental may change in a minor release, and Deprecated names its replacement: use that instead.',
    why: 'A screen built on a component that is about to change or go is built twice.',
  },
  {
    rule: 'Do what each component’s accessibility section leaves to you, usually an accessible name or a label. The component handles roles, focus and announcements.',
    why: 'Axe catches a missing name only on the screens it is run on; the component cannot know what its button is for.',
  },
  {
    rule: 'On a product screen, rojo means danger and is used only through the danger role (`bg-danger`, `bg-danger-soft`, `text-ink-danger`, `band-danger`). The accent is gold, by name (`band-accent`).',
    why: 'A red label band or bullet beside a red FAILED mark makes the failure one red thing among several (ADR 0008).',
  },
  {
    rule: 'A screen reflows at 320px: only a region meant to scroll sideways (a table, code, a tab or chip row) may, and it carries the `scroll-edge` utility with `useScrollEdge()` as its ref. Table, Tabs and CodeBlock already do.',
    why: 'WCAG 1.4.10 is measured at 320px, and a region that scrolls with no cue reads as complete: a table hid its Status column and its only action that way.',
  },
  {
    rule: 'Props share one vocabulary: `tone` is a status (`neutral`, `info`, `success`, `warn`, `danger`, `accent`), `variant` a presentation (`solid`, `outline`, `seam`), `kind` a category (`EmptyState kind="no-results"`), and `size` the t-shirt scale (`xs` to `xl`).',
    why: 'A word that means one thing on every component can be guessed instead of looked up, by a person or an agent.',
  },
  {
    rule: 'Every component takes `ref`, `id`, `data-*` and the other DOM props of the element it documents. `className` and `style` style the box you see (the element with the cut); `ref` and the rest go to the control you focus. A wrapper around a label has `wrapperClassName`.',
    why: 'A `className` that moved to another element when a `label` was added changed meaning silently.',
  },
]
