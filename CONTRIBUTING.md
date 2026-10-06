# Contributing to Mola UI

Thanks for your interest in Mola UI. This guide covers how a change gets from a
branch to a release.

## Ground rules

- Be kind. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security problems privately. See [SECURITY.md](SECURITY.md) and never open a public issue for them.
- For a new component, a new token or anything that changes how the system looks, open an issue
  first so the design can be agreed before you write code. The decisions so far are in
  [`docs/adr/`](docs/adr/); a change that reverses one needs a new ADR.

## What belongs in the system

Mola UI is the canon: the components, tokens and patterns that every product built on it should
share. Not everything belongs here. A component that only one screen needs should live in that
product, the "expanded universe", until it proves itself. These rules come from Dan Mall's
*Design That Scales* (chapters 5 and 6):

- **Three times is a pattern.** Propose a new component when at least three distinct use cases
  need it, and name them in the issue. One or two is a local component.
- **Extract, don't invent.** Bring the version that already works in a real screen, with the states
  that screen needed, rather than a component designed for every case anyone might imagine.
- **Reconcile variants with all, most, some, few.** When several versions of a component exist,
  every trait they *all* share is mandatory; what *most* share is the default; what only *some*
  share is settled in the issue before code; what only a *few* have waits.

## Setup

```bash
nvm use            # Node 22.23.1, pinned in .nvmrc
npm ci
npm run dev        # Storybook on :6006
```

## The gates

A change is ready when all of these pass — CI runs the same list in its `Gates` job:

```bash
npm run check   # lint · typecheck · test · tokens:check · manifest:check · build · api:check · size · build-storybook
```

Never weaken a gate to get green. If a gate is wrong, fix it in its own commit and say why.

CI also runs three browser jobs side by side with `Gates`. Each can be run locally:

| Job | Locally | What it holds |
|---|---|---|
| Browser audit | `npm run build-storybook && npm run audit` | axe with colour contrast in both themes and no horizontal overflow at 390px, over every story and every docs page, plus console errors. The report lands in `reports/audit/`. |
| Visual regression | `npm run build-storybook && npm run visual` | every story in both themes, and each component's first story in compact density, RTL and forced colours, against the Linux baselines. |
| Consumer smoke tests | `npm run build && npm run consumers` | the packed tarball installed, built and checked in a browser in three apps: Vite on `styles.css`, Vite with its own Tailwind v4 on `tailwind.css`, and the Next.js App Router. |

For a quick look while Storybook's dev server is running, `node scripts/audit.mjs
http://localhost:6006` still works; add `--only <story id fragment>` to audit a few pages.

### The public API report

`etc/mola-ui.api.md` lists every export of `@demogar/mola-ui` and its type signature, generated
from `dist/` by [API Extractor](https://api-extractor.com/). If you add, remove or change an
export, `npm run api:check` fails until you regenerate the report and commit it:

```bash
npm run build && npm run api
```

The diff of that file is the API change a reviewer signs off. A removed or changed signature is
a breaking change (see [Versioning](#versioning-and-deprecation)).

### Bundle budgets

`npm run size` measures the built package with [size-limit](https://github.com/ai/size-limit):
the whole library, a typical tree-shaken import (`Button` + `Field`) and `styles.css`, minified
and brotli-compressed. The budgets live in `.size-limit.json`, set from measurements with about
10% headroom. If a change goes over, first check that it should cost that much (a new dependency,
or something that breaks tree-shaking, are the usual causes). Raise a budget only in its own
commit that says why.

### Visual baselines

The baselines in `test/visual/__screenshots__/linux/` are rendered on Linux by CI, never on a
laptop: font rasterisation differs between operating systems by more than the threshold. Running
`npm run visual` on macOS writes local baselines to an ignored `darwin/` folder, which is useful
to compare your own before and after but is never committed.

When a visual change is intended, or a new story needs a baseline:

1. Push the branch and open the pull request. The **Visual regression** job fails and uploads a
   `visual-report` artifact with the expected, actual and diff image of every failing story. Look
   at every diff.
2. If the changes are all intended, add the **`update-visual-baselines`** label to the pull
   request. The *Update visual baselines* workflow renders the baselines on Linux, commits only the
   images that changed to the branch, and removes the label. (From a branch without a pull
   request: `gh workflow run "Update visual baselines" --ref <branch>`.)
3. The bot's commit does not start CI by itself unless the `RELEASE_PLEASE_TOKEN` secret is set.
   Without it, push again (`git commit --allow-empty -m "test(visual): rerun ci"` is fine) so the
   checks run on the new baselines.

When you delete or rename a story, delete its baselines too; Playwright does not prune them.

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
  | `feat` | a new component, state, token or prop | minor bump |
  | `fix` | a bug fix | patch bump |
  | `perf` | a performance improvement | patch bump |
  | `refactor`, `docs`, `test`, `build`, `ci`, `chore` | everything else | no release on its own |

  Add `!` after the type (`feat(tokens)!: ...`) or a `BREAKING CHANGE:` footer for breaking
  changes — a renamed token or a removed prop is breaking. Before 1.0.0 a breaking change bumps
  the minor version; from 1.0.0 it bumps the major.
- Keep pull requests focused. One concern per PR makes review and the changelog clearer.
- Keep the branch up to date with `main` before merging.

## Versioning and deprecation

The full policy is the [Versioning](https://demogar.github.io/molaui/?path=/docs/mola-ui-versioning--overview)
page in Storybook. In short:

- **The public API is more than the exports.** Props and their values, token names and the
  utilities built on them, the `styles.css`/`tailwind.css`/`tokens.css` entry points, the
  `data-*` attributes components write, roles and keyboard behaviour, and the per-density metrics
  are all covered. Changing any of them in a way that breaks a consumer is a breaking change.
- **Deprecate before you remove.** Ship the replacement in a minor release, mark the old API
  `@deprecated` (since, instead, removal), call `deprecate()` from `src/lib/deprecate.ts` where it
  is used, and keep it working. Remove it in the next major, no sooner than one minor later.
- **Ship a codemod for mechanical changes.** Renames get a tested script in `codemods/` built on
  the TypeScript compiler API; see `codemods/skeleton-line-to-text.ts`.

## Repository settings

`main` is guarded by the ruleset in `.github/rulesets/main.json`: no direct pushes, force pushes
or deletion; changes arrive by squash-merged pull request with resolved conversations and passing
`Gates`, `Browser audit`, `Visual regression`, `Consumer smoke tests` and `Conventional PR title`
checks. Admins can bypass only through a pull request. To change it, edit the file and re-apply
it (an edit to the file alone changes nothing on GitHub):

```bash
gh api -X PUT repos/demogar/molaui/rulesets/<id> --input .github/rulesets/main.json
```

Every push to `main` that passes all the CI jobs publishes Storybook to GitHub Pages.

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please).

1. Every merge to `main` updates an open **release PR** (`chore(main): release x.y.z`) that bumps
   the version in `package.json` and writes `CHANGELOG.md` from the commit history.
2. Merging that PR tags `vx.y.z` and publishes a GitHub Release.
3. The same workflow then tests and builds the tagged commit and publishes
   [`@demogar/mola-ui`](https://www.npmjs.com/package/@demogar/mola-ui) to npm, with provenance,
   and to GitHub Packages.

### Publishing to npm with trusted publishing

The publish job uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers): npm
trades the job's GitHub OIDC token for a short-lived token, so no long-lived secret can leak, and
provenance is attached automatically. Until a trusted publisher is configured, npm falls back to
the `NPM_TOKEN` repository secret. To switch over (a package owner on npmjs.com does this once):

1. Sign in to [npmjs.com](https://www.npmjs.com/) and open
   **@demogar/mola-ui → Settings → Trusted Publisher**.
2. Choose **GitHub Actions** and enter: organization or user `demogar`, repository `molaui`,
   workflow filename `release-please.yml`, environment left empty. Save.
3. Optionally, under **Publishing access**, choose *Require two-factor authentication and
   disallow tokens*, so only the trusted workflow can publish.
4. After the next release has published successfully, delete the `NPM_TOKEN` repository secret
   (`gh secret delete NPM_TOKEN`) and revoke the token on npmjs.com.

Never edit the version or `CHANGELOG.md` by hand. The Storybook changelog page renders
`CHANGELOG.md` directly.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
