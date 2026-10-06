# Contributing to Mola UI

## Setup

```bash
nvm use            # Node 22.23.1, pinned in .nvmrc
npm install
npm run dev        # Storybook on :6006
```

## The gates

A change is ready when all of these pass — CI runs the same list:

```bash
npm run lint && npm run typecheck && npm test && npm run tokens:check && npm run build && npm run build-storybook
```

Never weaken a gate to get green. If a gate is wrong, fix it in its own commit and say why.

## Anatomy of a component

```
src/components/<name>/
  <name>.tsx          the component: cva variants, cn(), a doc comment that explains WHY
  <name>.stories.tsx  every state, with docs descriptions that state the decisions
  <name>.test.tsx     behaviour by role and accessible name, keyboard included
  index.ts            the public exports
```

Then export it from `src/index.ts`.

## Rules a review will hold you to

- **No hex outside `src/styles/tokens.css`.** A test enforces it.
- **A new colour token needs a measured pairing** in `src/tokens/contract.test.ts`, in both themes,
  and an entry in `src/lib/cn.ts` (a test enforces that too).
- **Edges are `shadow-cut`, never `border`,** on anything interactive. `border-keyline` is for
  decorative dividers only.
- **Radius is zero.** `rounded-full` is allowed only for something that is genuinely a dot.
- **State is never colour alone**: glyph, word, colour.
- **Disabled is stated, not faded** — no `opacity-*` on a disabled control.
- **No density props.** Size from `--control-h`, `--row-h`, `--control-px` and the type scale.
- **Behaviour from Base UI** where a primitive exists. Do not re-implement focus trapping or roving
  focus.
- **Stories must pass axe** (the a11y addon is set to `error`).
- **Doc comments explain the decision**, including what was tried first and why it failed. The
  code says what; the comment says why.

## Commits

Conventional Commits scoped by area: `feat(button):`, `fix(tokens):`, `docs(adr):`,
`chore(ci):`.
