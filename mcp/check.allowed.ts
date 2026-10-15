import { readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { found } from '../src/test/found'
import type { Finding } from './check'

/**
 * What check_code may report on the library's own source, file by file and
 * rule by rule, with the reason. Shared by the two runs of the same rules
 * over the repo: mcp/check.library.test.ts calls checkCode directly, and
 * eslint/plugin.test.ts runs them through the ESLint plugin. One list, so the
 * MCP tool and the plugin cannot drift into disagreeing about this repo.
 *
 * There is no blanket exemption. A deliberate "don't" example in a story
 * carries its own `check_code: allow rule N — reason` comment instead, which
 * the checker honours only with a reason.
 *
 * One allowance is by kind rather than by file: in the shipped source of
 * src/components, rule 12's two building-block findings (importing Base UI,
 * styling a native element) are how a component is made, so button.tsx may
 * write `<button>`. A hand-rolled composite role there is not exempt; each
 * one is listed below. Stories get no such allowance, even for the component
 * they document.
 */
export const root = resolve(import.meta.dirname, '..')

export interface Allowed {
  rule: number
  /** Matches the finding's message or its source line. */
  match: RegExp
  why: string
}

const TABLE_IN_DOCS = 'Storybook docs chrome, not product UI: a reference table inside the docs page, unstyled for Storybook rather than a Mola Table a screen would ship.'

export const ALLOWED: Record<string, Allowed[]> = {
  /* Shipped components: composite roles a component owns because it is that component. */
  'src/components/date-picker/calendar.tsx': [
    { rule: 12, match: /role="grid(?:cell)?"/, why: 'This file is Calendar: the date grid is the component, and Base UI has no calendar primitive to build it on.' },
  ],
  'src/components/command/command.tsx': [
    {
      rule: 12,
      match: /role="(?:combobox|listbox|option)"/,
      why: 'This file is CommandPalette: the input stays focused and the highlight moves by aria-activedescendant, a pattern Combobox does not have (see its doc comment).',
    },
  ],
  'src/components/listbox/listbox.tsx': [
    {
      rule: 12,
      match: /role="(?:listbox|option)"/,
      why: 'This file is Listbox: the list is the component, and Base UI has no standalone listbox primitive to build it on (ADR 0012).',
    },
  ],
  'src/components/tag-group/tag-group.tsx': [
    {
      rule: 12,
      match: /role="(?:grid|row|gridcell)"/,
      why: 'This file is TagGroup: the grid of tags is the component, and Base UI has no grid primitive to build it on (ADR 0012).',
    },
  ],
  'src/components/tabs/tabs.tsx': [
    { rule: 7, match: /`left-0` is a physical/, why: "The indicator is translated by Base UI's measured offset, which is physical: from the list's left edge, in either direction." },
  ],

  /* Patterns: the hand-styled-button suggestion is a warning because sometimes the native element is right. */
  'src/patterns/filtered-table/filtered-table.tsx': [
    { rule: 12, match: /hand-styled `<button/, why: 'The run id in a table cell, styled as an underlined literal that opens the drawer: a Button would put a control in every row.' },
  ],
  'src/patterns/list-and-detail/list-and-detail.tsx': [
    { rule: 12, match: /hand-styled `<button/, why: 'A whole list row that selects the record, with aria-current: a row, not a Button, and Mola has no list-row component.' },
  ],

  /* Stories and their fixtures. */
  'src/components/ai/agent-console.stories.tsx': [
    { rule: 12, match: /hand-styled `<button/, why: 'The empty thread\'s suggested prompts: multi-line cards with a revealed band, which no Button variant draws; each is still a real button.' },
  ],
  'src/components/app-shell/_story-data/cayuco-chrome.tsx': [
    { rule: 12, match: /hand-styled `<button/, why: 'A search-field-shaped trigger that opens the command palette; it is a button, but it must read as an input, which Button does not.' },
  ],
  'src/components/ai/run-status/run-status.stories.tsx': [
    { rule: 12, match: /hand-styled `<table>`/, why: 'A specimen sheet laying every status out in both registers for comparison, not a data table a screen would ship.' },
  ],
  'src/components/badge/badge.stories.tsx': [
    { rule: 12, match: /hand-styled `<table>`/, why: 'A specimen sheet laying every tone out side by side for comparison, not a data table a screen would ship.' },
  ],

  /* Docs blocks: the docs site's own chrome. */
  'src/docs/blocks/anatomy.tsx': [
    { rule: 7, match: /`left` in a style/, why: 'Pins are placed at coordinates measured with getBoundingClientRect, which are physical viewport pixels in either direction.' },
  ],
  'src/docs/blocks/breakpoints.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/content.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/decisions.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/override-check.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/page.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/pattern.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/scopes.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/series.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/spacing.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/swatches.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/token-table.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],

  /* MDX pages. */
  'src/docs/foundations/the-cut.mdx': [
    { rule: 12, match: /hand-styled `<button>`/, why: 'A static specimen of the focus band drawn on a bare element, so the band shows without focusing anything; not a control to copy.' },
  ],
}

/** Rule 12 findings that are how a component is built, allowed only in src/components' shipped source. */
export const BUILDING_BLOCK = /^`@base-ui\/react|from `@base-ui\/react[^`]*`|^A hand-styled `</

export function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(?:tsx?|mdx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

export const files = found(walk(join(root, 'src')), 200, 'sources under src/')
  .map((path) => relative(root, path))
  .filter((rel) => /^src\/(?:components|patterns)\//.test(rel) || /\.stories\.tsx$/.test(rel) || /^src\/docs\/.*\.(?:tsx|mdx)$/.test(rel))

export const isShippedComponent = (rel: string) => rel.startsWith('src/components/') && !/\.stories\.tsx$/.test(rel) && !rel.includes('/_story-data/')

/**
 * The findings left once the allowances are applied. `used` collects the
 * allowances that excused something, for the stale-entry check.
 */
export function unexcused<F extends Pick<Finding, 'rule' | 'message' | 'excerpt'>>(rel: string, findings: F[], used: Set<Allowed>): F[] {
  return findings.filter((f) => {
    if (isShippedComponent(rel) && f.rule === 12 && BUILDING_BLOCK.test(f.message)) return false
    const allowed = (ALLOWED[rel] ?? []).find((a) => a.rule === f.rule && (a.match.test(f.message) || a.match.test(f.excerpt)))
    if (allowed) used.add(allowed)
    return !allowed
  })
}
