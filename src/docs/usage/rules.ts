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
    rule: 'Interactive edges use `shadow-cut` (or `shadow-floating` on overlays), never `border`. `border-keyline` is for decorative dividers only.',
    why: 'A box-shadow edge can grow a revealed band on hover without moving its neighbours, and the named utilities keep an outline in forced-colours mode.',
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
    rule: 'Colours come from tokens. No hex, rgb or arbitrary colour values outside `tokens.css`.',
    why: 'Every token pairing has a measured contrast ratio in both themes; a colour outside the token file was never measured.',
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
]
