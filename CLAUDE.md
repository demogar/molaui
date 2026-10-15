# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Mola UI is a React 19 design system (Base UI for behaviour, Tailwind v4 for styling) published as the `@demogar/mola-ui` package, with an AI interface layer in `src/components/ai/` and a Storybook that is both the documentation site and the test corpus. Design decisions are recorded in `docs/adr/` — read the relevant ADR before changing color roles, themes, density or typography.

The system was ported from the Mola styles of the `mustdopanama` project (read-only origin; do not modify it from here). Demo data uses a fictional platform called **Cayuco** — never put a real company's name, branding or product names into stories, fixtures or docs.

## Commands

Node is pinned in `.nvmrc` (22.23.1).

```bash
npm run dev              # Storybook on :6006 (alias: npm run storybook)
npm test                 # vitest run (jsdom)
npx vitest run src/components/button            # one component's tests
npx vitest run src/test/stories.test.tsx -t "button"   # story/axe tests matching a name
npm run lint             # eslint
npm run typecheck        # tsc --noEmit
npm run tokens           # regenerate tokens/mola.tokens.json from tokens.css
npm run tokens:check     # fail if tokens/mola.tokens.json is stale
npm run manifest         # regenerate docs/ai/components.json, llms*.txt, the Markdown twins in docs/ai/md and snippets/mola-ui.code-snippets
npm run manifest:check   # fail if those are stale, the README/introduction counts are wrong, or a public prop has no doc comment
npm run evidence         # regenerate docs/accessibility/evidence.json (testing status on each component page)
npm run evidence:check   # fail if it is stale
npm run build            # library build to dist/, then dist/mola-ui-components.css (vite.css.config.ts), then the mola-ui-mcp bin to dist/mcp/ and the ESLint plugin to dist/eslint/
npm run build-storybook  # static Storybook to storybook-static/
npm run api              # regenerate etc/mola-ui.api.md from dist/ (API Extractor; needs build)
npm run api:check        # fail if the public API changed without the report
npm run size             # size-limit budgets in .size-limit.js (needs build)
npm run deps:audit       # npm audit of what ships (deps, peers, the bundled MCP SDK); warns, not fails, if the registry is down
npm run check            # all gates, same list CI's Gates job runs
npm run check:browser    # build-storybook, then audit and visual (the two browser jobs)
npm run check:all        # check + check:browser + consumers: every job the ruleset requires
npm run audit            # browser audit of storybook-static/ (needs build-storybook); report in reports/audit/
npm run visual           # visual regression vs Linux baselines (needs build-storybook)
npm run visual:update    # rewrite changed baselines for this OS (only linux/ is committed)
npm run consumers        # npm pack, install into test/consumers/* apps, build, check in a browser (needs build)
```

CI (`.github/workflows/ci.yml`) runs `Gates`, `Browser audit`, `Visual regression` and `Consumer smoke tests` in parallel; all four are required by the ruleset. `Browser audit` and `Visual regression` are each a matrix of four shards (`audit.mjs --shard i/n`; `VISUAL_SHARD=i/n`, dealt round-robin by `test/visual/shard.ts` rather than Playwright's contiguous `--shard`) plus a small job with the required name that passes only if every shard did, so changing the shard count does not touch the ruleset. The whole run should stay within three to four minutes; the non-required `CI budget` job (`scripts/ci-budget.mjs`) fails when the critical path of job execution through ci.yml's `needs` passes four minutes (time waiting for a runner is not counted) and writes each job's time and the shard spread to the run summary. Visual baselines must be rendered on Linux: label the PR `update-visual-baselines` (workflow `visual-baselines.yml`) rather than committing baselines from macOS, then push again so CI reruns. Shared CI setup (Node, `node_modules` cached on the lockfile with `npm ci` only on a miss, cached Playwright Chromium) is the composite action `.github/actions/setup`.

A change is ready only when `npm run check:all` passes, which runs every job the ruleset requires (`scripts/check-all.test.ts` fails if it stops covering one). `npm run check` alone is only the `Gates` job. On macOS `visual` fails by design, because baselines are Linux-only: there, treat `Visual regression` in CI as the authority and use `check` plus `audit` and `consumers` locally. Never weaken a gate to get green; if a gate is wrong, fix it in its own commit and say why.

Browser scripts (need a running Storybook, use Playwright):
- `node scripts/audit.mjs http://localhost:6006 [--only <id fragment>] [--shard i/n]` — axe *with* color contrast in both themes, 390px horizontal-overflow check (the light page, narrowed after axe, not a third load), console errors, over every story and every docs page, plus a focus-visibility scan on every story (`scripts/focus-scan.mjs`: tabs through it and fails any stop whose focused paint equals its resting paint); exits non-zero on findings. Prefer the static build (`npm run audit`): the dev server stalls it.
- `node scripts/serve-static.mjs [dir] [port]` — serves `storybook-static/` (used by the audit and the visual tests).
- `node scripts/shoot.mjs <outDir> <base> <storyId[:theme[:density[:width]]]>...` — screenshots for visual review.
- `node scripts/readme-shots.mjs http://localhost:6006` — regenerates `docs/screenshots/` at 2x, except `agent-console.png`, which was captured by driving the console story by hand.

`audit.mjs` deliberately ignores Base UI focus-guard nodes (an `aria-hidden-focus` false positive) and the intentional unresolvable image request in the `broken-image` story. On docs pages it skips Storybook's args table and the landmark-uniqueness/heading-order rules (a docs page stacks several complete examples); each story is audited for those on its own page.

The visual tests (`test/visual/`) freeze time with Playwright's clock and run 15s of fake time before the screenshot, so simulated streams and countdowns finish deterministically. A story is screenshotted cropped to its content (root plus portals). Behaviour that needs real layout and cannot be screenshotted stably (Thread's stick-to-bottom) is a `*.behaviour.ts` Playwright test in the same folder, run by the same config and CI job on the real clock. `aria.behaviour.ts` pins the accessibility tree of the composite components (menus, listboxes, the calendar grid, tabs, the data table, the command palette, the thread) with `toMatchAriaSnapshot`; the snapshots are platform-independent YAML in `test/visual/__aria__/`, so update them on any machine with `npm run visual:update -- aria.behaviour` and review the diff as a change to what a screen reader hears.

Clocks and reader-local times render after hydration (`useHydrated` in `src/lib/use-hydrated.ts`); `src/test/ssr.test.tsx` server-renders and hydrates each clock-bearing component with the browser in a different zone and a moment later, and fails on any mismatch.

### Dependency gotchas
- `npm install` of many packages in one command has crashed with `Cannot read properties of null (reading 'edgesOut')`; install in smaller groups.
- TypeScript is pinned to 5.9.x for `vite-plugin-dts` compatibility; ESLint is pinned to 9 with `@eslint/js` 9 (`@eslint/js` 10 requires ESLint 10). Versions are exact-pinned throughout.

## Architecture

### Styles: one source of truth, layered
- `src/styles/tokens.css` — the **only** file allowed to contain hex (a test in `src/tokens/contract.test.ts` walks the tree and enforces it). Every color is a `light-dark()` pair; theme is selected by `[data-theme]` setting `color-scheme`, density by `[data-density]` re-scaling `--control-h`, `--row-h`, `--control-px` and the type scale.
- `src/styles/theme.css` — Tailwind v4 bridge. Literal scale values go in `@theme` (several names sit in Tailwind's reserved namespaces, so `var()` self-references would break); colors go in `@theme inline` as `var()` refs so `light-dark()` resolves on the using element.
- `src/styles/cloth.css` — the mola-specific `@utility`s: `cut`/`cut-band` (keyline edges via `box-shadow`), `relleno`, `diente`, `rotulo`, `band-*`.
- `src/styles/mola.css` imports tokens → theme → cloth → base (shipped as `@demogar/mola-ui/tailwind.css` for consumers running their own Tailwind). `src/styles/index.css` adds Tailwind itself with `source(none)` and explicit `@source` that excludes stories/tests/mdx, so the shipped CSS contains only classes components use — a class that exists only in a story won't be in the library CSS.

Theme and density are document/element **attributes, not React context** (portaled dialogs must inherit them). Components take no density props.

### `cn()` and the class merger
`src/lib/cn.ts` is `clsx` plus `src/lib/merge.ts`, Mola's own merger: tailwind-merge's rules restated as a table for the families the components write (plus Mola's names: `shadow-cut`, `leading-body`, `max-w-page`, `literal`…), so the library does not ship tailwind-merge (it was 63% of `{ Button, Field }`). Families no component writes (masks, snap, backdrop filters…) are left alone: kept, never merged. `merge.test.ts` keeps tailwind-merge as a devDependency configured as `cn()` used to, and fails if the two disagree on any pair of utilities the source writes or Tailwind compiles under Mola's theme, or if a utility the source writes is left alone; when it fails after you write a new kind of utility, add its family to the table. `cn.test.ts` parses `theme.css` and fails if a colour token would be read as something other than a colour. `.size-limit.js` budgets `cn` on its own.

### Tokens pipeline
`src/tokens/resolve.ts` parses `tokens.css` and resolves `light-dark()`, `var()` and OKLab `color-mix()` per theme; `src/tokens/color.ts` has the color math. Both are used by:
- `src/tokens/contract.test.ts` — the contrast contract: every promised fg/bg pairing with its minimum ratio, in both themes. A new color token needs a measured pairing here.
- `scripts/export-tokens.ts` — emits DTCG JSON to `tokens/mola.tokens.json` (derived artefact; never edit by hand, rerun `npm run tokens`).

### Stories are tests
`src/test/stories.test.tsx` globs every `*.stories.tsx`, composes them through the real `.storybook/preview.tsx` (theme/density decorator included), renders in jsdom and runs axe (contrast disabled there — owned by the contract test and `audit.mjs`). Any new story is automatically a test and must be axe-clean. The Storybook a11y addon is set to `error`. `src/test/ssr-stories.test.tsx` renders every story again with `renderToString` in the node environment, so a component that reads `window` or `document` while rendering fails there; it composes them through `.storybook/mola-context.tsx` (the decorator and initial globals that `preview.tsx` uses), because `preview.tsx` loads Storybook's doc blocks, which need a `document` to import.

Every test that globs or walks the filesystem passes the result through `found(list, min, what)` (`src/test/found.ts`), which throws at collection when the glob matches too little, so a moved folder cannot turn a gate into a loop over nothing; `src/test/sentinels.test.ts` fails a test file that enumerates files without it. Licences are checked offline from `package-lock.json` by `scripts/deps.test.ts` (a permissive allow-list for what ships, a looser one for dev tooling, both in `scripts/deps.mjs`).

### Components
One folder per component in `src/components/<name>/`: `<name>.tsx` (cva variants + `cn()`), `<name>.stories.tsx`, `<name>.test.tsx` (query by role/accessible name, keyboard included), `index.ts` barrel. New components must also be exported from `src/index.ts`. AI-layer stories share fixtures and a simulated agent in `src/components/ai/_story-data/`.

The MCP server (`mcp/`) is a read-only server over `docs/ai/components.json` and `docs/ai/tokens.json`. `vite.mcp.config.ts` bundles it, SDK and zod included, into `dist/mcp/mola-ui-mcp.js`, the package's `mola-ui-mcp` bin. The SDK stays a devDependency, so the library gains no runtime dependency. `mcp/server.test.ts` drives it through the SDK client over an in-memory transport, and `npm run consumers` starts the packed bin over stdio with no `node_modules`.

The ESLint plugin (`eslint/plugin.ts`, shipped as `@demogar/mola-ui/eslint`) wraps the same `checkCode` from `mcp/check.ts` over `sourceCode.text`, so the rules are never duplicated: rule `design-rules` reports its errors, `design-advice` its warnings. `vite.eslint.config.ts` bundles it into `dist/eslint/index.js`; it imports only Node builtins (held by `scripts/deps.test.ts`). What check_code may report on this repo is listed once, in `mcp/check.allowed.ts`, for both `mcp/check.library.test.ts` and `eslint/plugin.test.ts`; the `eslint` consumer fixture lints a bad file through the packed tarball. Why it is a subpath and not a separate package: ADR 0011.

Library build (`vite.config.ts`): ESM with `preserveModules` for file-level tree-shaking, all deps/peers external, a single CSS file `dist/mola-ui.css`, plus raw CSS layers copied to `dist/tailwind/`; a second pass (`vite.css.config.ts`) then builds `dist/mola-ui-components.css`, the `components.css` entry for apps that already have page styles (no preflight or base). Stories, tests, `src/docs/` and `src/patterns/` are excluded from the build and from type declarations. `@/` aliases `src/`.

Storybook docs pages (introduction, principles, foundations, migration, changelog) are MDX in `src/docs/`. Doc blocks in `src/docs/blocks/` import `tokens.css?raw` and resolve values with `src/tokens/resolve.ts`, so swatches show exactly what the contract test checks. A block's logic that the Markdown twins also need lives in a plain `.ts` module beside it with no `?raw` import (`css-block.ts`, `override.ts`, `responsive.ts`, `dataviz.ts`), and `scripts/agent-docs.ts` renders the same data. `src/docs/pages.test.ts` holds the page contract: Getting started's section order, every Foundations and Mola UI page in `storySort`, and the playground. Foundations/Theming measures its override examples live (`checkOverride`); Foundations/Responsive's breakpoint table is checked against the components' source.

`examples/playground/` is a small Vite app that installs the published package from npm; Getting started opens it on StackBlitz. release-please bumps its `@demogar/mola-ui` version (`extra-files`), and it is not part of the build or the tests.

### Storybook and token gotchas
- MDX-only pages never run decorators, so `.storybook/preview.css` pins `:root:not([data-theme])` to light (Storybook only) to stop docs following the OS dark scheme.
- Storybook's docs styles are unlayered and beat every Tailwind `@layer` utility; custom doc blocks need the `sb-unstyled` class.
- `docs.defaultName` is `'Overview'`, so docs page ids end in `--overview` (e.g. `?path=/docs/ai-principles--overview`).
- `light-dark()` accepts only colors, so a mixed token is written as `light-dark(color-mix(...), color-mix(...))`.
- A `@theme inline` entry with the same name as its `var()` target self-references and resolves to nothing — hence `--elevation-raised` in `tokens.css` mapped to `shadow-raised`/`shadow-floating` in `theme.css`.
- The no-hex test skips fenced code blocks in MDX, because docs quote `tokens.css`.
- Exported names share one namespace via `src/index.ts`; check for collisions across folders (the AI parser's `InlineRun` exists because `Inline` is a layout component).

### Usage guidance, patterns and agent docs
- Every component has an autodocs page (`tags: ['autodocs']` in preview); `.storybook/docs-page.tsx` inserts a Usage section from `src/docs/usage/guidance.ts`, keyed by stories title. `src/docs/usage/usage.test.ts` fails if a component page has no entry; composed showcases are exempt. `Patterns/*` pages have their own guidance in `src/docs/usage/patterns.ts` (when to use, each part's job, the empty/loading/error/no-permission states, accessibility), rendered by `src/docs/blocks/pattern.tsx` and required by the same test.
- "Built from" on a pattern page and "Used in" on a component page are read from the imports: `scripts/export-manifest.ts` parses each pattern's screen files and each showcase's stories file (`src/docs/usage/composition.ts`) into `docs/ai/composition.json`. `composition.test.ts` fails if that file, or the parts described in `patterns.ts`, drift from the imports; rerun `npm run manifest` after changing a pattern's imports. Patterns may import only names the package exports.
- Component pages follow one contract, `SECTIONS` in `src/docs/usage/contract.ts`: summary and lifecycle phase → usage → examples → accessibility → related. The phase is a stories `tags` entry (`stable`, `experimental` or `deprecated`; exactly one per component page); keyboard tables and the "Mola handles / you handle" lists are in `src/docs/usage/accessibility.ts` (`NON_INTERACTIVE` lists pages with no keyboard table); the testing status is generated into `docs/accessibility/evidence.json` by `npm run evidence`. `usage.test.ts` fails a component page that cannot fill a section. A new component needs all of these.
- `src/patterns/<name>/` holds whole Cayuco screens: `<name>.tsx` (the screen), stories, tests. They are excluded from the JS build and type declarations, but `src/styles/index.css` scans their non-story files, so a copied pattern finds its classes in the shipped CSS. The logical-properties guard scans them too.
- `scripts/export-manifest.ts` builds `docs/ai/components.json`, `llms.txt`, `llms-full.txt`, the per-topic `llms-components.txt`/`llms-tokens.txt`/`llms-patterns.txt`/`llms-rules.txt` and a Markdown twin of every docs page in `docs/ai/md/<page id>.md` (served at `md/<id>.md`, copied by the Copy for LLM button; `scripts/agent-docs.ts`) from the TypeScript checker, react-docgen-typescript, the stories and the usage guidance. It also writes `snippets/mola-ui.code-snippets` (shipped in the package): one VS Code snippet per component page, taken from the first story whose JSX uses only package exports (`scripts/snippets.ts`), else built from the required props. Rerun `npm run manifest` after changing props, doc comments, stories or guidance. It fails on a public prop with no description (DOM and Base UI props are exempt, named in `inherits`); a cva variant takes its description from a doc comment on its key in the `cva` call, which TypeScript carries through `Variants<…>`. The design rules it publishes live in `src/docs/usage/rules.ts`; `skills/mola-ui/SKILL.md` is hand-written and must agree with them.
- Parts: components with real parts mark them `data-part="kebab-name"` (shipped DOM, so stable; the root keeps `data-slot`), and `src/docs/usage/anatomy.ts` names them. The docs page's Anatomy section (`src/docs/blocks/anatomy.tsx`, between Usage and Examples) renders the story, measures each `[data-part]` and pins it; `anatomy.test.tsx` fails if the legend and the rendered parts disagree in either direction. A part belongs to the nearest ancestor whose `data-slot` has anatomy, so nested components keep their own parts.
- `src/test/links.test.ts` resolves every `?path=/docs/…` and `?path=/story/…` link in the README, MDX, sources, skill and generated docs against the ids Storybook assigns. Renaming a story or a title means fixing its links.
- Deprecations use `deprecate()` from `src/lib/deprecate.ts` plus `@deprecated` JSDoc; mechanical breaking changes get a tested codemod in `codemods/` that exports a `meta` record and has a row on the Codemods page (`src/docs/codemods.mdx`); `codemods/index.test.ts` fails if the row, the record and the `deprecate()` call disagree, or if a `deprecate()` has neither a codemod nor a line under "Deprecations without a codemod". The policy is `src/docs/versioning.mdx`. The Roadmap page (`src/docs/roadmap.mdx`, no dates, held by `roadmap.test.ts`) lists planned / under consideration / not planned; an item comes off it in the PR that ships it. New components and tokens start as an issue from `.github/ISSUE_TEMPLATE/proposal.yml`.

### Things that drift
- The README and introduction counts (components = non-AI docs pages, parts = exported React components, stories) are checked by `npm run manifest:check`; update the wording it names when it fails. Other prose claims are not checked.
- A breaking release needs its section on the Migration page (`src/docs/migration.mdx`) on `main` before the release PR merges; `src/docs/usage/migration.test.ts` reads `CHANGELOG.md` and fails the release PR otherwise. Write it with the breaking change.
- The agent docs (`docs/ai/components.json`, the Markdown twins, the llms files) embed each component's `changes`, parsed from CHANGELOG.md, which only release-please writes. So the release PR regenerates them itself: the `agent-docs` job in `release-please.yml` runs `npm run manifest` on the release branch and pushes the result, and main's `manifest:check` still holds after a release. If that job fails, run `npm run manifest` on the release branch and push before merging it.
- Composed demos live under AI/Agent console, Components/Layout/App shell, Components/Forms/Form example and Patterns/*.

## Design rules (enforced in review)

- Interactive edges use `shadow-cut`, never `border`; `border-keyline` is for decorative dividers only.
- Radius is zero; `rounded-full` only for genuine dots.
- State is never color alone: glyph + word + color.
- Disabled is stated, not faded — no `opacity-*` on disabled controls.
- Use Base UI primitives for behaviour (focus trapping, roving focus) rather than re-implementing.
- Typefaces have roles: Archivo for system UI, Alegreya for prose from a person or model, Martian Mono only for machine literals.
- Doc comments explain *why* (including what was tried first and why it failed); the code says what. Story docs descriptions state the decisions.
- TypeScript: strict with `noUncheckedIndexedAccess`; ESLint requires inline `type` imports and allows unused vars only with a `_` prefix.

## Pull requests and releases

@AGENTS.md

`main` is protected by `.github/rulesets/main.json` (squash-merge only; required checks `Gates` from `ci.yml` and `Conventional PR title` from `pr-title.yml`, which also fails a scope not declared in `SCOPE_PAGES`/`NON_COMPONENT_SCOPES` in `src/docs/usage/changes.ts`, via `scripts/pr-scope.mjs`). `ci.yml` also publishes Storybook to GitHub Pages on pushes to `main`. release-please (`release-please.yml`) owns `package.json`'s version and `CHANGELOG.md`, and when a release is cut its `publish` job tests, builds and publishes `@demogar/mola-ui` to npm (with provenance, via the `NPM_TOKEN` secret) and to GitHub Packages; the Storybook changelog page (`src/docs/changelog.mdx`) renders `CHANGELOG.md` via `?raw`, so there is no second copy to update. If you rename the `Gates` job, update the ruleset too.
