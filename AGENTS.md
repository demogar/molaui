# Agent guide

Context for AI agents working in this repo. `CONTRIBUTING.md` is the full
human-facing guide; this file is the short list of rules an agent must not
miss.

## Pull request titles are Conventional Commits (non-negotiable)

`main` is squash-merged: **the PR title becomes the commit on `main`**, and
release-please reads that commit to decide the next version and write the
changelog. CI runs a `Conventional PR title` check and fails the PR otherwise.

```
<type>(<optional scope>): <lowercase subject>
```

- `type` is one of: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`,
  `ci`, `chore`, `revert`. Scope by area: `feat(button):`, `fix(tokens):`.
- A scope must be declared in `src/docs/usage/changes.ts` (`SCOPE_PAGES` for
  component pages, `NON_COMPONENT_SCOPES` otherwise); the check fails an
  undeclared one. Declare a new scope in the same PR, or leave the scope out.
- A `feat` or breaking title starts a new minor, and that minor needs its What's
  new page: `src/docs/whats-new/<major>-<minor>.mdx`, its version in `WHATS_NEW`
  (`src/docs/usage/changes.ts`) and in the sidebar order in
  `.storybook/preview.tsx`. The same check fails the PR without it; a later
  `feat` in the same minor finds the page already there.
- The subject must start with a lowercase letter.
- Add `!` after the type (`feat(tokens)!: …`) for breaking changes — a renamed
  token or removed prop is breaking.

If `gh pr edit --title` fails, patch it through the REST API:

```bash
gh api -X PATCH repos/demogar/molaui/pulls/<n> -f title="feat: …"
```

## Before you open a pull request

- Run `npm run check:all` and make it green; it runs every job the ruleset
  requires (`check` is only `Gates`). Never weaken a gate to pass. On macOS the
  `visual` step fails by design (baselines are Linux-only); there, rely on CI's
  `Visual regression` job for that one.
- Prove visual changes in a real browser, not only in jsdom: run Storybook and
  `node scripts/audit.mjs http://localhost:6006`, and screenshot the affected
  stories in both themes with `node scripts/shoot.mjs`.
- Keep one concern per PR. Fill in `## What and why` and `## How it was verified`
  from the PR template.

## Never

- Edit the version or `CHANGELOG.md` by hand — release-please owns them.
- Put a real company's name, branding or product names in stories, fixtures,
  docs or screenshots. Demo data is the fictional Cayuco platform.
- Reproduce Guna mola designs, symbols or patterns, or use the mola as decoration. Mola UI
  borrows the method (layers, cut edges, revealed bands), not the motifs. The README section
  "The name, and why we use it with care" explains why. The one credited documentary photograph
  (`docs/images/molas-guna-photo-maria-molino.jpg`) explains the name. Never use it as a
  background, texture or decoration.
- Add hex outside `src/styles/tokens.css`, a `border` on an interactive edge, a
  radius, or `opacity-*` on a disabled control.
