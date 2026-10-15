import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from '../../test/found'
import { ADR_FILES, DECISIONS, DECISIONS_INDEX, parseRecord } from './decisions'

/**
 * Every record in docs/adr/ has a page in Storybook, and every foundation it
 * governs links back to it. Without this, a new ADR would sit in the
 * repository where only people reading the source find it, which is the gap
 * the Decisions section exists to close.
 */
const root = resolve(import.meta.dirname, '../../..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return name.endsWith('.mdx') ? [path] : []
  })
}

/** MDX title → its source, for every docs page in src/. */
const pages = new Map(
  found(walk(join(root, 'src')), 15, 'MDX pages under src/').flatMap((path) => {
    const text = readFileSync(path, 'utf8')
    const title = text.match(/<Meta\s+title="([^"]+)"/)?.[1]
    return title ? [[title, { file: relative(root, path), text }] as const] : []
  }),
)

const onDisk = found(
  readdirSync(join(root, 'docs/adr')).filter((name) => name.endsWith('.md')),
  4,
  'records in docs/adr/',
).map((name) => `docs/adr/${name}`)

describe('decision records', () => {
  it('the docs see every file in docs/adr/', () => {
    expect([...ADR_FILES].sort()).toEqual(onDisk.sort())
  })

  it('every record has notes, and so a page title', () => {
    expect(onDisk.filter((file) => !DECISIONS.some((d) => d.file === file))).toEqual([])
  })

  it('every record has a Storybook page that renders it', () => {
    const missing = DECISIONS.filter((d) => {
      const page = pages.get(d.page)
      return !page || !page.text.includes(`<DecisionRecord number="${d.number}"`)
    }).map((d) => `${d.file} → no page titled "${d.page}" rendering <DecisionRecord number="${d.number}" />`)
    expect(missing).toEqual([])
  })

  it('has an index page', () => {
    expect(pages.get(DECISIONS_INDEX)?.text).toContain('<DecisionIndex')
  })

  it('every foundation a record governs exists and links back', () => {
    const broken = DECISIONS.flatMap((d) =>
      Object.keys(d.governs).flatMap((title) => {
        const page = pages.get(title)
        if (!page) return [`${d.file} governs "${title}", which is not a docs page`]
        if (!page.text.includes(`<DecisionsBehind foundation="${title}"`))
          return [`${page.file} is governed by ${d.number} but does not render <DecisionsBehind foundation="${title}" />`]
        return []
      }),
    )
    expect(broken).toEqual([])
  })

  it('a foundation page that shows decisions names itself', () => {
    const wrong = [...pages].flatMap(([title, page]) => {
      const named = page.text.match(/<DecisionsBehind foundation="([^"]+)"/)?.[1]
      return named && named !== title ? [`${page.file} is "${title}" but asks for the decisions of "${named}"`] : []
    })
    expect(wrong).toEqual([])
  })

  it('every record governs at least one foundation, and says what it decided', () => {
    for (const d of DECISIONS) {
      expect(Object.keys(d.governs).length, d.file).toBeGreaterThan(0)
      expect(d.decided.length, d.file).toBeGreaterThan(0)
    }
  })
})

describe('parseRecord', () => {
  const ok = '# 0009 — A title\n\n**Date:** 2026-10-13 · **Status:** proposed\n\n## Context\n\nBody.'

  it('reads the number, title, date and status from the file', () => {
    expect(parseRecord('../docs/adr/0009-a-title.md', ok)).toMatchObject({
      number: '0009',
      title: 'A title',
      date: '2026-10-13',
      status: 'proposed',
      body: '## Context\n\nBody.',
    })
  })

  it('refuses a record off the template, rather than showing a blank status', () => {
    expect(() => parseRecord('0009-a-title.md', '# A title\n\nBody')).toThrow(/template/)
    expect(() => parseRecord('0009-a-title.md', ok.replace('proposed', 'maybe'))).toThrow(/status/)
    expect(() => parseRecord('0010-a-title.md', ok)).toThrow(/file name/)
  })
})
