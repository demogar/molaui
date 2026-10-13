import { describe, expect, it } from 'vitest'

import { storyTitles } from '../../test/story-index'
import { ACCESSIBILITY, NON_INTERACTIVE } from './accessibility'
import { pageData, SECTIONS } from './contract'
import { USAGE } from './guidance'
import { phasesIn } from './lifecycle'
import { isShowcase } from './showcases'

type StoryModule = { default: { title: string; tags?: string[] } }
const modules = import.meta.glob<StoryModule>('../../**/*.stories.tsx', { eager: true })
const metas = Object.values(modules).map((mod) => mod.default)
const components = metas.filter((meta) => !isShowcase(meta.title))

describe('usage guidance', () => {
  it('covers every component page', () => {
    const missing = storyTitles.filter((title) => !isShowcase(title) && !USAGE[title])
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

  it('every component page has exactly one lifecycle phase, and showcases have none', () => {
    const wrong = metas.flatMap((meta) => {
      const phases = phasesIn(meta.tags)
      const expected = isShowcase(meta.title) ? 0 : 1
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
