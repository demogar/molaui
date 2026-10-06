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
npm run manifest         # regenerate docs/ai/components.json, llms.txt, llms-full.txt
npm run manifest:check   # fail if those are stale or the README/introduction counts are wrong
npm run build            # library build to dist/
npm run build-storybook  # static Storybook to storybook-static/
npm run api              # regenerate etc/mola-ui.api.md from dist/ (API Extractor; needs build)
npm run api:check        # fail if the public API changed without the report
npm run size             # size-limit budgets in .size-limit.json (needs build)
npm run check            # all gates, same list CI's Gates job runs
npm run audit            # browser audit of storybook-static/ (needs build-storybook); report in reports/audit/
npm run visual           # visual regression vs Linux baselines (needs build-storybook)
npm run visual:update    # rewrite changed baselines for this OS (only linux/ is committed)
npm run consumers        # npm pack, install into test/consumers/* apps, build, check in a browser (needs build)
```

CI (`.github/workflows/ci.yml`) runs `Gates`, `Browser audit`, `Visual regression` and `Consumer smoke tests` in parallel; all four are required by the ruleset. Visual baselines must be rendered on Linux: label the PR `update-visual-baselines` (workflow `visual-baselines.yml`) rather than committing baselines from macOS, then push again so CI reruns. Shared CI setup (Node, npm cache, cached Playwright Chromium) is the composite action `.github/actions/setup`.

A change is ready only when `npm run check` passes. Never weaken a gate to get green; if a gate is wrong, fix it in its own commit and say why.

Browser scripts (need a running Storybook, use Playwright):
- `node scripts/audit.mjs http://localhost:6006 [--only <id fragment>]` — axe *with* color contrast in both themes, 390px horizontal-overflow check, console errors, over every story and every docs page; exits non-zero on findings. Prefer the static build (`npm run audit`): the dev server stalls it.
- `node scripts/serve-static.mjs [dir] [port]` — serves `storybook-static/` (used by the audit and the visual tests).
- `node scripts/shoot.mjs <outDir> <base> <storyId[:theme[:density[:width]]]>...` — screenshots for visual review.
- `node scripts/readme-shots.mjs http://localhost:6006` — regenerates `docs/screenshots/` at 2x, except `agent-console.png`, which was captured by driving the console story by hand.

`audit.mjs` deliberately ignores Base UI focus-guard nodes (an `aria-hidden-focus` false positive) and the intentional unresolvable image request in the `broken-image` story. On docs pages it skips Storybook's args table and the landmark-uniqueness/heading-order rules (a docs page stacks several complete examples); each story is audited for those on its own page.

The visual tests (`test/visual/`) freeze time with Playwright's clock and run 15s of fake time before the screenshot, so simulated streams and countdowns finish deterministically. A story is screenshotted cropped to its content (root plus portals).

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

### `cn()` and tailwind-merge
`src/lib/cn.ts` extends tailwind-merge with the system's color tokens, text sizes and shadows; without it, unknown `text-*` colors get merged as font sizes and silently dropped. Adding a `--color-*` token to `theme.css` requires adding it to `COLORS` in `cn.ts` — `cn.test.ts` parses `theme.css` and fails otherwise.

### Tokens pipeline
`src/tokens/resolve.ts` parses `tokens.css` and resolves `light-dark()`, `var()` and OKLab `color-mix()` per theme; `src/tokens/color.ts` has the color math. Both are used by:
- `src/tokens/contract.test.ts` — the contrast contract: every promised fg/bg pairing with its minimum ratio, in both themes. A new color token needs a measured pairing here.
- `scripts/export-tokens.ts` — emits DTCG JSON to `tokens/mola.tokens.json` (derived artefact; never edit by hand, rerun `npm run tokens`).

### Stories are tests
`src/test/stories.test.tsx` globs every `*.stories.tsx`, composes them through the real `.storybook/preview.tsx` (theme/density decorator included), renders in jsdom and runs axe (contrast disabled there — owned by the contract test and `audit.mjs`). Any new story is automatically a test and must be axe-clean. The Storybook a11y addon is set to `error`.

### Components
One folder per component in `src/components/<name>/`: `<name>.tsx` (cva variants + `cn()`), `<name>.stories.tsx`, `<name>.test.tsx` (query by role/accessible name, keyboard included), `index.ts` barrel. New components must also be exported from `src/index.ts`. AI-layer stories share fixtures and a simulated agent in `src/components/ai/_story-data/`.

Library build (`vite.config.ts`): ESM with `preserveModules` for file-level tree-shaking, all deps/peers external, a single CSS file `dist/mola-ui.css`, plus raw CSS layers copied to `dist/tailwind/`. Stories, tests, `src/docs/` and `src/patterns/` are excluded from the build and from type declarations. `@/` aliases `src/`.

Storybook docs pages (introduction, principles, foundations, changelog) are MDX in `src/docs/`. Doc blocks in `src/docs/blocks/` import `tokens.css?raw` and resolve values with `src/tokens/resolve.ts`, so swatches show exactly what the contract test checks.

### Storybook and token gotchas
- MDX-only pages never run decorators, so `.storybook/preview.css` pins `:root:not([data-theme])` to light (Storybook only) to stop docs following the OS dark scheme.
- Storybook's docs styles are unlayered and beat every Tailwind `@layer` utility; custom doc blocks need the `sb-unstyled` class.
- `docs.defaultName` is `'Overview'`, so docs page ids end in `--overview` (e.g. `?path=/docs/ai-principles--overview`).
- `light-dark()` accepts only colors, so a mixed token is written as `light-dark(color-mix(...), color-mix(...))`.
- A `@theme inline` entry with the same name as its `var()` target self-references and resolves to nothing — hence `--elevation-raised` in `tokens.css` mapped to `shadow-raised`/`shadow-floating` in `theme.css`.
- The no-hex test skips fenced code blocks in MDX, because docs quote `tokens.css`.
- Exported names share one namespace via `src/index.ts`; check for collisions across folders (the AI parser's `InlineRun` exists because `Inline` is a layout component).

### Usage guidance, patterns and agent docs
- Every component has an autodocs page (`tags: ['autodocs']` in preview); `.storybook/docs-page.tsx` inserts a Usage section from `src/docs/usage/guidance.ts`, keyed by stories title. `src/docs/usage/usage.test.ts` fails if a component page has no entry; composed showcases and `Patterns/*` are exempt.
- `src/patterns/<name>/` holds whole Cayuco screens: `<name>.tsx` (the screen), stories, tests. They are excluded from the JS build and type declarations, but `src/styles/index.css` scans their non-story files, so a copied pattern finds its classes in the shipped CSS. The logical-properties guard scans them too.
- `scripts/export-manifest.ts` builds `docs/ai/components.json`, `llms.txt` and `llms-full.txt` from the TypeScript checker, react-docgen-typescript, the stories and the usage guidance. Rerun `npm run manifest` after changing props, doc comments, stories or guidance. The design rules it publishes live in `src/docs/usage/rules.ts`; `skills/mola-ui/SKILL.md` is hand-written and must agree with them.
- `src/test/links.test.ts` resolves every `?path=/docs/…` and `?path=/story/…` link in the README, MDX, sources, skill and generated docs against the ids Storybook assigns. Renaming a story or a title means fixing its links.
- Deprecations use `deprecate()` from `src/lib/deprecate.ts` plus `@deprecated` JSDoc; mechanical breaking changes get a tested codemod in `codemods/`. The policy is `src/docs/versioning.mdx`.

### Things that drift
- The README and introduction counts (components = non-AI docs pages, parts = exported React components, stories) are checked by `npm run manifest:check`; update the wording it names when it fails. Other prose claims are not checked.
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

`main` is protected by `.github/rulesets/main.json` (squash-merge only; required checks `Gates` from `ci.yml` and `Conventional PR title` from `pr-title.yml`). `ci.yml` also publishes Storybook to GitHub Pages on pushes to `main`. release-please (`release-please.yml`) owns `package.json`'s version and `CHANGELOG.md`, and when a release is cut its `publish` job tests, builds and publishes `@demogar/mola-ui` to npm (with provenance, via the `NPM_TOKEN` secret) and to GitHub Packages; the Storybook changelog page (`src/docs/changelog.mdx`) renders `CHANGELOG.md` via `?raw`, so there is no second copy to update. If you rename the `Gates` job, update the ruleset too.
