# Contributing to Mola UI

Thanks for your interest in Mola UI. This guide covers how a change gets from a
branch to a release.

## Ground rules

- Be kind. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security problems privately. See [SECURITY.md](SECURITY.md) and never open a public issue for them.
- For a new component, a new token or anything that changes how the system looks, open a
  [proposal](https://github.com/demogar/molaui/issues/new?template=proposal.yml) first so the
  design can be agreed before you write code. Check the
  [Roadmap](https://demogar.github.io/molaui/?path=/docs/mola-ui-roadmap--overview) before you
  do: it may already be planned, under consideration or decided against. The decisions so far are
  in [`docs/adr/`](docs/adr/); a change that reverses one needs a new ADR.

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

A change is ready when `npm run check:all` passes. It runs every job the ruleset requires, in
order, and `scripts/check-all.test.ts` fails if a required job ever runs a script it does not:

```bash
npm run check           # lint · typecheck · test · deps:audit · tokens:check · manifest:check · figma:check · evidence:check · build · api:check · size · build-storybook  (the Gates job)
npm run check:browser   # build-storybook · audit · visual  (Browser audit, Visual regression)
npm run check:all       # check · check:browser · consumers  (every required job)
```

On macOS, `visual` fails by design: the baselines are rendered on Linux only (see "Visual
baselines"), and font rasterisation differs. There, run `check`, `npm run audit` and
`npm run consumers` locally and let CI's `Visual regression` job decide.

Never weaken a gate to get green. If a gate is wrong, fix it in its own commit and say why.

CI runs the three browser jobs side by side with `Gates`. Each can also be run on its own:

| Job | Locally | What it holds |
|---|---|---|
| Browser audit | `npm run build-storybook && npm run audit` | axe with colour contrast in both themes, every `data-theme` subtree painting its own ground, no horizontal overflow at 390px, and reflow at 320px: no text clipped by a container that cannot scroll or painted over other text or a control, no number cut in its field, and nothing scrolling sideways without the `scroll-edge` cue; every story is measured again at spacious density at 320, and the composed screens at 1024 and 768 as well. Over every story and every docs page, plus console errors. The report lands in `reports/audit/`. |
| Visual regression | `npm run build-storybook && npm run visual` | every story in both themes (hard-states stories in light only), and each component's first story in compact density, RTL and forced colours, against the Linux baselines. |
| Consumer smoke tests | `npm run build && npm run consumers` | the packed tarball installed, built and checked in a browser in three apps: Vite on `styles.css`, Vite with its own Tailwind v4 on `tailwind.css`, and the Next.js App Router; plus script-only fixtures (`require()` from Node, and the ESLint plugin linting a bad file), the MCP bin and the ESLint plugin from a bare unpack. |

For a quick look while Storybook's dev server is running, `node scripts/audit.mjs
http://localhost:6006` still works; add `--only <story id fragment>` to audit a few pages.

### Dependencies: licences and npm audit

What the package ships is its runtime dependencies, its peer dependencies and the MCP SDK and zod
bundled into the `mola-ui-mcp` bin, each with everything it depends on. `scripts/deps.mjs` reads
that set from `package-lock.json`. The ESLint plugin (`dist/eslint/`) ships too, and bundles no
package: `scripts/deps.test.ts` holds its imports to Node's builtins and its own files.

- **Licences** are checked by `scripts/deps.test.ts`, offline, from the `license` field npm
  records in the lockfile. Shipped packages must be permissive (`SHIPPED_LICENSES`); the rest of
  the tree may also be MPL-2.0, OFL-1.1, CC-BY-4.0 or Python-2.0 (`TREE_LICENSES`), because the
  Storybook site bundles some of it. GPL, LGPL, AGPL and SSPL fail everywhere. Add a licence only
  after reading it.
- **`npm run deps:audit`** runs `npm audit` and fails on a high or critical advisory in a shipped
  package; lower severities are warnings, and findings in dev tooling are counted, not failed.
  If an advisory cannot reach a user, add its GHSA id to `ACCEPTED` with the reason. When the
  registry cannot be reached it retries twice, then warns and passes, so an npm outage does not
  block merges; any other failure to produce a report fails.

### The public API report

`etc/mola-ui.api.md` lists every export of `@demogar/mola-ui` and its type signature, generated
from `dist/` by [API Extractor](https://api-extractor.com/). If you add, remove or change an
export, `npm run api:check` fails until you regenerate the report and commit it:

```bash
npm run build && npm run api
```

The diff of that file is the API change a reviewer signs off. A removed or changed signature is
a breaking change (see [Versioning](#versioning-and-deprecation)).

Dependabot bumps change the report too, when a re-exported Base UI type changes. The
`Dependabot API report` workflow regenerates it on Dependabot's branch and commits that file
alone; anything else that changes fails it for a person to look at. Its push starts CI only if
the repository has a `DEPENDABOT_PUSH_TOKEN` **Dependabot** secret (a fine-grained token with
Contents read and write on this repository); without one, it comments on the pull request, and
closing and reopening the pull request runs the checks. Review the report diff like any other
API change before merging the bump.

### Bundle budgets

`npm run size` measures the built package with [size-limit](https://github.com/ai/size-limit):
the whole library, a typical tree-shaken import (`Button` + `Field`) and `styles.css`, minified
and brotli-compressed. The budgets live in `.size-limit.js`, set from measurements with about
10% headroom. If a change goes over, first check that it should cost that much (a new dependency,
or something that breaks tree-shaking, are the usual causes). Raise a budget only in its own
commit that says why.

### Visual baselines

The baselines in `test/visual/__screenshots__/linux/` are rendered on Linux by CI, never on a
laptop: font rasterisation differs between operating systems by more than the threshold. Running
`npm run visual` on macOS writes local baselines to an ignored `darwin/` folder, which is useful
to compare your own before and after but is never committed.

When a visual change is intended, or a new story needs a baseline:

1. Push the branch and open the pull request. The **Visual regression** job fails, and each of
   its four shards with a failure uploads a `visual-report-<shard>` artifact with the expected,
   actual and diff image of every failing story. Look at every diff.
2. If the changes are all intended, add the **`update-visual-baselines`** label to the pull
   request. The *Update visual baselines* workflow renders the baselines on Linux, commits only the
   images that changed to the branch, and removes the label. (From a branch without a pull
   request: `gh workflow run "Update visual baselines" --ref <branch>`.)
3. The bot's commit does not start CI by itself unless the `RELEASE_PLEASE_TOKEN` secret is set.
   Without it, push again (`git commit --allow-empty -m "test(visual): rerun ci"` is fine) so the
   checks run on the new baselines.

When you delete or rename a story, delete its baselines too; Playwright does not prune them, and
the visual suite fails on any baseline that no screenshot compares against.

The baselines are plain files in git, not Git LFS, and are not recompressed. Measured on
2026-10-14: 820 images, 23 MB, and 25.7 MB for every version ever committed, because an update
rewrites only the images whose pixels changed. Checking them out costs each CI job about three
seconds. LFS would need the owner to enable it, every clone and fork to install `git-lfs` (without
it the suite compares against pointer files), and every visual shard to download the whole set on
every run against a monthly bandwidth quota. Lossless recompression (`oxipng -o 2`) saves 22%, but
rewriting the existing set would add 18 MB of new versions to history to save one second per
checkout, and running it in the baseline workflow puts a downloaded binary in a job that holds a
write token. Revisit if the set passes about 50 MB.

### The Figma kit

`figma/plugin/code.js` and `figma/component-map.json` are generated from
`tokens/mola.tokens.json` and `docs/ai/components.json` by `npm run figma`. A change to a token, a
prop, a cva variant, a component summary or its do and don't changes them, and
`npm run figma:check` (and `figma/src/build.test.ts`) fails until you regenerate and commit
them. `code.js` is one generated line of data and is collapsed in diffs (`.gitattributes`);
review `component-map.json` and `figma/src/` instead.

To draw another component in Figma, add it to `figma/src/components.ts` with its variant axes
read from the manifest, bind every colour and length to a variable (the build test refuses a
literal), and rerun `npm run figma`. Its entry in the map turns from `pending` to `built`. A new
cva value on a drawn component reaches the kit by itself, or fails the build with a message
naming the look to add. After merging, the owner reruns the plugin in the kit's Figma file
(`figma/README.md`); nothing in CI can reach Figma.

### ARIA snapshots

`test/visual/aria.behaviour.ts` pins the accessibility tree of the composite components (menus,
select and combobox listboxes, the calendar grid, tabs, the data table, the command palette, the
thread) as Chromium computes it, with Playwright's `toMatchAriaSnapshot`. The snapshots are YAML in
`test/visual/__aria__/`, and unlike the screenshots they do not depend on the operating system, so
update them from any machine: `npm run build-storybook && npm run visual:update -- aria.behaviour`.
Review the diff as you would code: every changed line is something a screen reader announces
differently. Playwright writes numbers as regular expressions when it generates a snapshot, so a
changed count or time does not fail it; a changed role, name, state or nesting does.

## Anatomy of a component

```
src/components/<name>/
  <name>.tsx          the component: cva variants, cn(), a doc comment that explains WHY
  <name>.stories.tsx  every state, with docs descriptions that state the decisions
  <name>.test.tsx     behaviour by role and accessible name, keyboard included
  messages.ts         the words it says on its own, if any: an interface and the English table
  index.ts            the public exports
```

Then export it from `src/index.ts`.

A component never writes a user-visible English literal. Its words go in `messages.ts`, are read
with `useMessages()` from `src/lib/messages.tsx`, are registered in `src/lib/default-messages.ts`,
and reach the component's `messages` prop and `MessagesProvider` (docs/adr/0014-messages.md).
`src/test/messages.test.ts` fails a literal left in the JSX.

### Parts and the anatomy diagram

A component with real, separately styled parts (a label and a hint, a seam and a body, a header
and a status) marks each one in its markup with `data-part`:

```tsx
<span data-part="hint" className="text-xs text-ink-muted">{hint}</span>
```

- **Kebab-case, and stable.** `data-part` is shipped DOM: consumers can select on it, so renaming
  or removing one is a breaking change, like a prop. The root keeps its `data-slot` and needs no
  `data-part`.
- **Name it in the legend.** Add the component to `src/docs/usage/anatomy.ts`: the story the
  diagram measures, the root's `data-slot`, and each part with a name and one sentence on what it
  does. A part only another state shows (an error, a running call) names that story.
- **Do not add it everywhere.** A component that is one shape (a badge, a divider) gets no
  anatomy; a pin on a pill teaches nothing.

The docs page then renders an **Anatomy** section between Usage and Examples: the live story with
a numbered pin measured onto each part, and a legend with the system classes each part is made of,
read from the same elements. `src/docs/usage/anatomy.test.tsx` renders every story of the
component and fails if a declared part is missing, or if the component owns a `data-part` that is
not in the legend.

### Hard states

Every interactive component (every page with a keyboard table in
`src/docs/usage/accessibility.ts`) ends its stories file with a `HardStates` story, named
"Hard states" and tagged `['hard-states', '!autodocs']`. It is built from `HardStates` /
`HardState` in `src/docs/blocks/hard-states.tsx` and shows four cells side by side: a long label at
320px, the component in right to left with Arabic text, disabled, and its error state. A component
with no disabled or no error state says why in `HARD_STATE_EXEMPT` (`src/docs/usage/hard-states.ts`).
`src/docs/usage/hard-states.test.tsx` renders every one and fails a page that skips it. The sidebar's
tag filter lists them all under `hard-states`; the visual tests photograph them in the light theme
only, since each already holds its own right-to-left cell.

To show a pseudo-class state in a story (hover, pressed, focus) without a pointer, wrap the control
in `ForceState` from `src/docs/blocks/force-state.tsx`: it copies the component's own `:hover`,
`:active` and `:focus-visible` rules, so the picture is what ships. The Button `States` story is
the example.

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
- **Every public prop has a doc comment**: what it does, its default when that is not obvious,
  and when to use it. `npm run manifest:check` fails on one without. A cva variant is
  documented by a comment on its key in the `cva` call; DOM and Base UI props are exempt.

## Branches, pull requests and commits

- `main` is protected. Every change lands through a pull request that passes CI.
- Pull requests are **squash-merged**. The PR title becomes the commit on `main`, so it must
  follow [Conventional Commits](https://www.conventionalcommits.org/), scoped by area:

  ```
  <type>(<optional scope>): <lowercase subject>
  ```

  `feat(button):`, `fix(tokens):`, `docs(adr):`, `chore(ci):`. The scope is optional, but one
  you use must be declared in `src/docs/usage/changes.ts`: in `SCOPE_PAGES` if it names component
  pages (its changelog entries appear on them), or in `NON_COMPONENT_SCOPES` with what it covers.
  The `Conventional PR title` check fails a title with an undeclared scope and says so; declare
  it in the same pull request.

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
  the TypeScript compiler API, with a `meta` record and a row on the Codemods page
  (`src/docs/codemods.mdx`); see `codemods/skeleton-line-to-text.ts`. `codemods/index.test.ts`
  fails until the row, the record and the `deprecate()` call agree.

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
3. The same workflow then waits for `ci.yml`'s run on the tagged commit and stops unless it
   passed (`scripts/require-ci.ts`, up to 40 minutes), so a commit that skipped the required
   checks is never published. If it stops, make that run green (re-run its failed jobs, or fix
   `main`) and re-run the `Publish package` job. It then tests and builds the tagged commit and publishes
   [`@demogar/mola-ui`](https://www.npmjs.com/package/@demogar/mola-ui) to npm, with provenance,
   and to GitHub Packages.
4. A release that starts a new minor needs its What's new page (`src/docs/whats-new/<minor>.mdx`,
   listed in `WHATS_NEW`) on `main` **before** the release PR is merged, so the version that goes
   out has its page. The page can be written any time before: it reads "Unreleased" until
   `package.json` reaches its version. `changes.test.ts` reads `CHANGELOG.md`, so the release PR is
   red until the page exists. A patch release folds into its minor's page and is never held.
5. A release with breaking changes is different: its section on the Migration page
   (`src/docs/migration.mdx`, opened by `<ReleaseStatus version="x.y.z" />` and linking every
   breaking pull request) must land on `main` **before** the release PR is merged.
   `migration.test.ts` reads `CHANGELOG.md`, so the release PR is red until it does. A guide written
   after the release is too late for whoever upgrades on the first day. Write the section in the
   pull request that makes the breaking change, or in one right after it.
6. The release PR also bumps the playground (`examples/playground/package.json`, through
   `extra-files` in `release-please-config.json`), so the Getting started playground installs the
   version just released. `src/docs/pages.test.ts` holds the two versions equal.

### The release PR needs `RELEASE_PLEASE_TOKEN`

release-please pushes the release PR's commits with the workflow's token. Pushes made with the
default `GITHUB_TOKEN` start no workflows, so without the `RELEASE_PLEASE_TOKEN` secret the
release PR shows no checks and can only be merged through the ruleset bypass (0.5.0 and 0.6.0
were). An owner sets it once: a fine-grained personal access token limited to this repository
with **Contents** and **Pull requests** read and write (or a GitHub App token with the same
permissions), saved with `gh secret set RELEASE_PLEASE_TOKEN`. Until then, approve the pending
run on the release PR, or push an empty commit to its branch, instead of bypassing. The publish
gate above holds either way.

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
