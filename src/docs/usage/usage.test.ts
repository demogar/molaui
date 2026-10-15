import { describe, expect, it } from 'vitest'

import { foundModules } from '../../test/found'
import { storyTitles } from '../../test/story-index'
import { ACCESSIBILITY, NON_INTERACTIVE } from './accessibility'
import { pageData, SECTIONS } from './contract'
import { USAGE } from './guidance'
import { phasesIn } from './lifecycle'
import { isPattern, PATTERNS } from './patterns'

type StoryModule = { default: { title: string; tags?: string[] } } & Record<string, unknown>
const modules = foundModules(import.meta.glob<StoryModule>('../../**/*.stories.tsx', { eager: true }), 40, 'stories files')
const metas = Object.values(modules).map((mod) => mod.default)
const components = metas.filter((meta) => !isPattern(meta.title))

describe('usage guidance', () => {
  // There is no exemption list: a page outside Patterns/ is a component page
  // and needs guidance, so a composed demo cannot sit outside the contract.
  it('covers every component page', () => {
    const missing = storyTitles.filter((title) => !isPattern(title) && !USAGE[title])
    expect(missing).toEqual([])
  })

  it('names only pages that exist, and points only at pages that exist', () => {
    const titles = new Set(storyTitles)
    const unknown = Object.entries(USAGE).flatMap(([title, usage]) => [
      ...(titles.has(title) ? [] : [title]),
      ...usage.avoid.flatMap((alt) => (alt.use && !titles.has(alt.use) ? [`${title} -> ${alt.use}`] : [])),
    ])
    expect(unknown).toEqual([])
  })

  it('never sends a reader back to the page they are on', () => {
    const circular = Object.entries(USAGE).flatMap(([title, usage]) =>
      usage.avoid.filter((alt) => alt.use === title && !alt.label).map((alt) => `${title}: ${alt.when}`),
    )
    expect(circular).toEqual([])
  })
})

/**
 * The component page contract (contract.ts): every section a component page
 * renders must have the data to render. A page that would show an empty
 * heading fails here, by name and by section.
 */
describe('component page contract', () => {
  const known = new Set(storyTitles)

  it('every component page can fill every section, in order', () => {
    const gaps = components.flatMap((meta) => {
      const page = pageData(meta.title, meta.tags)
      return SECTIONS.flatMap((section) => section.missing(page, known).map((need) => `${meta.title} › ${section.heading}: needs ${need}`))
    })
    expect(gaps).toEqual([])
  })

  it('every component page has exactly one lifecycle phase, and patterns have none', () => {
    const wrong = metas.flatMap((meta) => {
      const phases = phasesIn(meta.tags)
      const expected = isPattern(meta.title) ? 0 : 1
      return phases.length === expected ? [] : [`${meta.title}: ${phases.join(', ') || 'no phase'}`]
    })
    expect(wrong).toEqual([])
  })

  it('accessibility data names only component pages', () => {
    const titles = new Set(components.map((meta) => meta.title))
    const stray = [...Object.keys(ACCESSIBILITY), ...NON_INTERACTIVE].filter((title) => !titles.has(title))
    expect(stray).toEqual([])
  })
})

/**
 * Patterns are not component pages, but they are not exempt from guidance:
 * each says when to use it, what it is built from (checked against its
 * imports in composition.test.ts), where its empty, loading, error and
 * no-permission states are, and what it does for accessibility.
 */
describe('pattern guidance', () => {
  const titles = new Set(storyTitles)
  const patterns = storyTitles.filter(isPattern)

  it('covers every pattern page, and names only pattern pages', () => {
    expect(patterns.filter((title) => !PATTERNS[title])).toEqual([])
    expect(Object.keys(PATTERNS).filter((title) => !patterns.includes(title))).toEqual([])
  })

  it('fills every section', () => {
    const gaps = Object.entries(PATTERNS).flatMap(([title, p]) => [
      ...(p.summary ? [] : [`${title}: a summary`]),
      ...(p.use.length ? [] : [`${title}: at least one "When to use"`]),
      ...(p.avoid.length ? [] : [`${title}: at least one "When not to"`]),
      ...(p.accessibility.length ? [] : [`${title}: at least one accessibility note`]),
      ...Object.entries(p.states).flatMap(([id, state]) => (state.note.trim() ? [] : [`${title}: a note for the ${id} state`])),
    ])
    expect(gaps).toEqual([])
  })

  it('shows every state that applies in a story, and marks the rest as not applying', () => {
    const gaps = Object.entries(PATTERNS).flatMap(([title, p]) =>
      Object.entries(p.states).flatMap(([id, state]) => {
        if (state.applies === false) return state.story ? [`${title} › ${id}: marked as not applying, but points at ${state.story}`] : []
        return state.story ? [] : [`${title} › ${id}: not shown; add a story for it, or mark it \`applies: false\` if it cannot happen`]
      }),
    )
    expect(gaps).toEqual([])
  })

  it('points each state at a story that exists, and each alternative at a page that exists', () => {
    const broken = Object.entries(PATTERNS).flatMap(([title, p]) => {
      const mod = Object.values(modules).find((m) => m.default.title === title)
      return [
        ...Object.entries(p.states).flatMap(([id, state]) =>
          state.story && !(mod && state.story in mod) ? [`${title} › ${id}: no story exported as ${state.story}`] : [],
        ),
        ...p.avoid.flatMap((alt) => (alt.use && !titles.has(alt.use) ? [`${title} -> ${alt.use}`] : [])),
      ]
    })
    expect(broken).toEqual([])
  })
})
