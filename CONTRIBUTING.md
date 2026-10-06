# Contributing to Mola UI

Thanks for your interest in Mola UI. This guide covers how a change gets from a
branch to a release.

## Ground rules

- Be kind. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security problems privately. See [SECURITY.md](SECURITY.md) and never open a public issue for them.
- For a new component, a new token or anything that changes how the system looks, open an issue
  first so the design can be agreed before you write code. The decisions so far are in
  [`docs/adr/`](docs/adr/); a change that reverses one needs a new ADR.

## Setup

```bash
nvm use            # Node 22.23.1, pinned in .nvmrc
npm ci
npm run dev        # Storybook on :6006
```

## The gates

A change is ready when all of these pass — CI runs the same list:

```bash
npm run check   # lint · typecheck · test · tokens:check · build · build-storybook
```

Never weaken a gate to get green. If a gate is wrong, fix it in its own commit and say why.

For anything visual, also run the browser audit against a running Storybook. It checks colour
contrast in both themes and horizontal overflow at 390px, which jsdom cannot:

```bash
node scripts/audit.mjs http://localhost:6006
```

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
  and an entry in `src/lib/cn.ts` (a test enforces that too). Then run `npm run tokens`.
- **Edges are `shadow-cut`, never `border`,** on anything interactive. `border-keyline` is for
  decorative dividers only.
- **Radius is zero.** `rounded-full` is allowed only for something that is genuinely a dot.
- **State is never colour alone**: glyph, word, colour.
- **Disabled is stated, not faded** — no `opacity-*` on a disabled control.
- **No density props.** Size from `--control-h`, `--row-h`, `--control-px` and the type scale.
- **Behaviour from Base UI** where a primitive exists. Do not re-implement focus trapping or roving
  focus.
- **Stories must pass axe** (the a11y addon is set to `error`).
- **Demo data is fictional.** Stories and fixtures use the made-up Cayuco platform; no real
  company's name, branding or product names.
- **Doc comments explain the decision**, including what was tried first and why it failed. The
  code says what; the comment says why.

## Branches, pull requests and commits

- `main` is protected. Every change lands through a pull request that passes CI.
- Pull requests are **squash-merged**. The PR title becomes the commit on `main`, so it must
  follow [Conventional Commits](https://www.conventionalcommits.org/), scoped by area:

  ```
  <type>(<optional scope>): <lowercase subject>
  ```

  `feat(button):`, `fix(tokens):`, `docs(adr):`, `chore(ci):`.

  | Type | Use it for | Release effect |
  |---|---|---|
  | `feat` | a new component, state, token or prop | minor bump (patch while < 1.0) |
  | `fix` | a bug fix | patch bump |
  | `perf` | a performance improvement | patch bump |
  | `refactor`, `docs`, `test`, `build`, `ci`, `chore` | everything else | no release on its own |

  Add `!` after the type (`feat(tokens)!: ...`) or a `BREAKING CHANGE:` footer for breaking
  changes — a renamed token or a removed prop is breaking.
- Keep pull requests focused. One concern per PR makes review and the changelog clearer.
- Keep the branch up to date with `main` before merging.

## Repository settings

`main` is guarded by the ruleset in `.github/rulesets/main.json`: no direct pushes, force pushes
or deletion; changes arrive by squash-merged pull request with resolved conversations and passing
`Gates` and `Conventional PR title` checks. Admins can bypass only through a pull request. To
change it, edit the file and re-apply it:

```bash
gh api -X PUT repos/demogar/molaui/rulesets/<id> --input .github/rulesets/main.json
```

Every push to `main` that passes the gates publishes Storybook to GitHub Pages.

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please).

1. Every merge to `main` updates an open **release PR** (`chore(main): release x.y.z`) that bumps
   the version in `package.json` and writes `CHANGELOG.md` from the commit history.
2. Merging that PR tags `vx.y.z` and publishes a GitHub Release.

Never edit the version or `CHANGELOG.md` by hand. The Storybook changelog page renders
`CHANGELOG.md` directly.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
