import { describe, expect, it } from 'vitest'

import { storyTitles } from '../../test/story-index'
import { USAGE } from './guidance'

/**
 * Composed screens document their decisions, not when to use them: they are
 * the answer to "how do these fit together", not a part to pick.
 */
const SHOWCASES = new Set(['AI/Agent console', 'Components/Forms/Form example'])
const isShowcase = (title: string) => SHOWCASES.has(title) || title.startsWith('Patterns/')

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
