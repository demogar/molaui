// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { checkCode, contextFrom, type Finding } from './check'
import { loadData } from './data'

/**
 * check_code run over the library's own source: every shipped file in
 * src/components and src/patterns, every story, every docs block and every
 * MDX page. The library is reviewed against the same rules as an agent's
 * code, and stories most of all, because stories are what people and agents
 * copy. A finding here is either a false positive (fix the check) or a real
 * break (fix the source). Either way the two cannot disagree silently.
 *
 * There is no blanket exemption. What is allowed is listed below, per file
 * and per rule, with the reason; a deliberate "don't" example in a story
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
const root = resolve(import.meta.dirname, '..')
const ctx = contextFrom(loadData(root))

interface Allowed {
  rule: number
  /** Matches the finding's message or its source line. */
  match: RegExp
  why: string
}

const TABLE_IN_DOCS = 'Storybook docs chrome, not product UI: a reference table inside the docs page, unstyled for Storybook rather than a Mola Table a screen would ship.'

const ALLOWED: Record<string, Allowed[]> = {
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
  'src/components/tabs/tabs.tsx': [
    { rule: 7, match: /left-\(--active-tab-left\)/, why: "Base UI measures --active-tab-left as a physical offset from the list's left edge, in either direction." },
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
  'src/docs/blocks/content.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/decisions.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/page.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/pattern.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/spacing.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/swatches.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],
  'src/docs/blocks/token-table.tsx': [{ rule: 12, match: /hand-styled `<table>`/, why: TABLE_IN_DOCS }],

  /* MDX pages. */
  'src/docs/foundations/the-cut.mdx': [
    { rule: 12, match: /hand-styled `<button>`/, why: 'A static specimen of the focus band drawn on a bare element, so the band shows without focusing anything; not a control to copy.' },
  ],
}

/** Rule 12 findings that are how a component is built, allowed only in src/components' shipped source. */
const BUILDING_BLOCK = /^`@base-ui\/react|from `@base-ui\/react[^`]*`|^A hand-styled `</

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(?:tsx?|mdx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

const files = walk(join(root, 'src'))
  .map((path) => relative(root, path))
  .filter((rel) => /^src\/(?:components|patterns)\//.test(rel) || /\.stories\.tsx$/.test(rel) || /^src\/docs\/.*\.(?:tsx|mdx)$/.test(rel))

const isShippedComponent = (rel: string) => rel.startsWith('src/components/') && !/\.stories\.tsx$/.test(rel) && !rel.includes('/_story-data/')

const used = new Set<Allowed>()
function findings(rel: string): Finding[] {
  return checkCode(readFileSync(join(root, rel), 'utf8'), ctx, { filename: rel }).filter((f) => {
    if (isShippedComponent(rel) && f.rule === 12 && BUILDING_BLOCK.test(f.message)) return false
    const allowed = (ALLOWED[rel] ?? []).find((a) => a.rule === f.rule && (a.match.test(f.message) || a.match.test(f.excerpt)))
    if (allowed) used.add(allowed)
    return !allowed
  })
}

describe('check_code on the library itself', () => {
  it('covers shipped source, every story, docs blocks and MDX', () => {
    expect(files.filter(isShippedComponent).length).toBeGreaterThan(100)
    const everywhere = walk(join(root, 'src')).map((path) => relative(root, path))
    expect(files.filter((f) => f.endsWith('.stories.tsx'))).toEqual(everywhere.filter((f) => f.endsWith('.stories.tsx')))
    expect(files.filter((f) => f.endsWith('.mdx'))).toEqual(everywhere.filter((f) => f.endsWith('.mdx')))
    expect(files.filter((f) => f.endsWith('.stories.tsx')).length).toBeGreaterThan(70)
    expect(files.some((f) => f.startsWith('src/patterns/') && f.endsWith('.stories.tsx'))).toBe(true)
    expect(files.some((f) => f.startsWith('src/docs/blocks/'))).toBe(true)
  })

  it('reads the source rather than passing it over: the components do what only a component may', () => {
    const baseUi = files.filter(isShippedComponent).flatMap((rel) => checkCode(readFileSync(join(root, rel), 'utf8'), ctx, { filename: rel }).filter((f) => f.rule === 12 && BUILDING_BLOCK.test(f.message)))
    expect(baseUi.length).toBeGreaterThan(20)
  })

  it('finds nothing that is not allowed, with a reason, file by file', () => {
    const found = files.flatMap((rel) => findings(rel).map((f) => `${rel}:${f.line} rule ${f.rule} ${f.severity}: ${f.message}`))
    expect(found).toEqual([])
  })

  it('has no stale allowance: each entry still excuses a finding', () => {
    for (const rel of files) findings(rel)
    const stale = Object.entries(ALLOWED).flatMap(([rel, entries]) => entries.filter((a) => !used.has(a)).map((a) => `${rel} rule ${a.rule} ${a.match}`))
    expect(stale).toEqual([])
    for (const entries of Object.values(ALLOWED)) for (const a of entries) expect(a.why.split(/\s+/).length).toBeGreaterThan(8)
  })
})
