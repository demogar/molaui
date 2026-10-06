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
- The subject must start with a lowercase letter.
- Add `!` after the type (`feat(tokens)!: …`) for breaking changes — a renamed
  token or removed prop is breaking.

If `gh pr edit --title` fails, patch it through the REST API:

```bash
gh api -X PATCH repos/demogar/molaui/pulls/<n> -f title="feat: …"
```

## Before you open a pull request

- Run `npm run check` and make it green. Never weaken a gate to pass.
- Prove visual changes in a real browser, not only in jsdom: run Storybook and
  `node scripts/audit.mjs http://localhost:6006`, and screenshot the affected
  stories in both themes with `node scripts/shoot.mjs`.
- Keep one concern per PR. Fill in `## What and why` and `## How it was verified`
  from the PR template.

## Never

- Edit the version or `CHANGELOG.md` by hand — release-please owns them.
- Put a real company's name, branding or product names in stories, fixtures,
  docs or screenshots. Demo data is the fictional Cayuco platform.
- Add hex outside `src/styles/tokens.css`, a `border` on an interactive edge, a
  radius, or `opacity-*` on a disabled control.
