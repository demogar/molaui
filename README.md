# Mola UI

**A design system cut like a mola: flat layers, hard keylines, revealed bands.**
React components and design tokens for dense internal tools and AI-native interfaces —
admin consoles, knowledge bases, agent run monitors — documented in a standalone Storybook.

**[Storybook →](https://demogar.github.io/molaui/)**

![The Cayuco runs view: application shell, KPI tiles and a dense table of agent runs](docs/screenshots/app-shell-light.png)

## What's inside

| | |
| --- | --- |
| **Tokens** | One CSS file. Two themes declared once with `light-dark()`, three densities on one attribute, zero radius. Every contrast pairing — 100+ of them, in both themes — computed from the CSS and enforced by a test. Exported to W3C design-token JSON for Figma. |
| **60 components** | Actions, forms, overlays, feedback, navigation, data display, and an application shell. 130 exported parts, built on [Base UI](https://base-ui.com) for behaviour and accessibility, styled with Tailwind v4. |
| **An AI interface layer** | Streaming text, message threads, a composer whose send button becomes stop, tool-call cards with human approval, long-running agent run timelines with live elapsed time, reasoning disclosure, citations, token budgets, and confidence stated in words rather than decimals. |
| **A working demo** | *AI / Agent console* — ask a question and a simulated agent plans, calls two tools, and streams a cited answer, with the run timeline and token usage updating beside it. |

![The agent console after a run: a cited answer in the reading face, an uncertainty note, confidence in words, and the run timeline with token usage beside it](docs/screenshots/agent-console.png)

<table>
  <tr>
    <td><img src="docs/screenshots/agent-run-failed-dark.png" alt="An agent run that failed at step four, in the dark theme, with the tool's error literal and a scoped retry"></td>
    <td><img src="docs/screenshots/tool-call-approval.png" alt="A tool call waiting for human approval, its arguments shown as JSON"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/thread-light.png" alt="A thread: the operator's question, a tool call, and the model's cited answer set in the reading face"></td>
    <td><img src="docs/screenshots/app-shell-dark-compact.png" alt="The runs view in the dark theme at compact density"></td>
  </tr>
</table>

## Why it looks like this

A **mola** is the reverse-appliqué textile of the Guna people of Guna Yala, Panama: cotton layers
stacked, the top layers cut away, so what remains is bounded by a hard outline and a revealed band
of the colour beneath. That method is the system's grammar —

- **Every interactive edge is an ink keyline**, drawn with `box-shadow` so hover can *grow* a
  revealed band outward without moving a single neighbour.
- ***Relleno***, the filler slits of a mola, is the divider, the empty state, and — moving — the
  indeterminate "working" state of a long-running step.
- **Three typefaces, three speakers**: Archivo (on its width axis) for the system, Alegreya for
  prose a person or a model says to you, Martian Mono for machine literals. A transcript can be
  scanned for *what it said* versus *what it did* from the type alone.
- **State is never colour alone**: every status is a square mark, a word and a tone.

It began as the design system of [mustdopanama.com](https://www.mustdopanama.com), an editorial
travel guide, and was carried into product software — the same identity, re-argued for
information density, all-day dark mode and the states AI work produces. The decisions are written
down in [`docs/adr/`](docs/adr/).

## Quick start

```bash
npm install mola-ui @base-ui/react \
  @fontsource-variable/archivo @fontsource-variable/alegreya @fontsource-variable/martian-mono
```

```tsx
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/martian-mono/wdth.css'
import 'mola-ui/styles.css'

import { ToolCall } from 'mola-ui'

<main data-theme="dark" data-density="compact">
  <ToolCall
    name="update_feature_flag"
    status="waiting"
    args={{ flag: 'onboarding_v3', percent: 100 }}
    approval={{
      reason: 'Changes a live flag for every new player.',
      onApprove: approve,
      onDeny: deny,
    }}
  />
</main>
```

Already on Tailwind v4? Import `mola-ui/tailwind.css` into your own build instead. Not on React?
`mola-ui/tokens.css` is plain custom properties — both themes and all densities work anywhere.
Designing in Figma? Load [`tokens/mola.tokens.json`](tokens/mola.tokens.json) with Tokens Studio.

## How quality is held

```bash
npm run check   # lint · typecheck · test · tokens:check · build · build-storybook
```

- **The contrast contract** (`src/tokens/contract.test.ts`) resolves every token in both themes —
  `light-dark()`, `var()`, OKLab `color-mix()` — and asserts each promised pairing. It caught a real
  dark-theme failure during the build (muted ink on the gold wash, 4.00:1) before any screen did.
- **No hex outside `tokens.css`**, enforced by a test.
- **Every story is a test**: all 205 stories render through the real Storybook config and pass axe
  in the unit suite; `scripts/audit.mjs` re-runs axe *with colour contrast* in a real browser in both
  themes, and checks every story for horizontal overflow at 390px.
- **`tailwind-merge` knows the token vocabulary**, with a test that fails if a new colour token is
  not registered — the silent class-dropping bug this prevents shipped in the system's first home.

## Repository map

```
src/styles/      tokens.css (the only file with hex) · theme.css (Tailwind bridge) · cloth.css (the mola utilities)
src/components/  one folder per component: component, stories, tests, barrel
src/components/ai/  the AI interface layer
src/tokens/      colour math + the contrast contract
src/docs/        Storybook docs: introduction, principles, foundations
tokens/          generated DTCG tokens for Figma
docs/adr/        architecture decision records
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the gates, the rules a review holds you to, and how
releases are cut. Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md). Report
security issues privately, as described in [SECURITY.md](SECURITY.md). Changes are listed in the
[changelog](CHANGELOG.md).

## Credits

Designed, architected and directed by Demóstenes García. Built with
[Claude Code](https://claude.com/claude-code).

The mola is the textile art of the Guna people; this project borrows its method, not its motifs. Typefaces: Archivo (Omnibus-Type), Alegreya (Juan Pablo del Peral, Huerta
Tipográfica), Martian Mono (Evil Martians) — all under the SIL Open Font License.

[MIT licensed](LICENSE).
