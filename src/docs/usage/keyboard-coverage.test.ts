import { globSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ACCESSIBILITY } from './accessibility'
import { chordsInKeyboardText, pressedKeys, untestedKeys } from './keyboard-coverage'
import { isShowcase } from './showcases'

type StoryModule = { default: { title: string } }
const modules = import.meta.glob<StoryModule>('../../**/*.stories.tsx', { eager: true })

/**
 * The gate for #82: every key a component page's keyboard table names is
 * pressed by that component's unit tests (the *.test.tsx files beside its
 * stories). A table row nobody presses is a claim nobody checks, so a page
 * that documents a key must test it, or stop documenting it.
 */
describe('keyboard tables are pressed by the tests', () => {
  it('every documented key of every component page is pressed in its unit tests', () => {
    const gaps = Object.entries(modules).flatMap(([path, mod]) => {
      const title = mod.default.title
      const rows = ACCESSIBILITY[title]?.keyboard
      if (isShowcase(title) || !rows?.length) return []
      const dir = dirname(resolve(import.meta.dirname, path))
      const sources = globSync('*.test.tsx', { cwd: dir }).map((name) => readFileSync(resolve(dir, name), 'utf8'))
      const missing = untestedKeys(rows, sources)
      return missing.length ? [`${title}: ${missing.join(', ')}`] : []
    })
    expect(gaps).toEqual([])
  })
})

describe('reading pressed keys from test source', () => {
  it('parses user-event key syntax, held modifiers included', () => {
    expect(chordsInKeyboardText('{Shift>}{Tab}{/Shift}')).toEqual(['Shift+Tab'])
    expect(chordsInKeyboardText('{Control>}k{/Control}')).toEqual(['Control+K'])
    expect(chordsInKeyboardText('ab{Enter}')).toEqual(['A', 'B', 'Enter'])
    expect(chordsInKeyboardText(' [Space]{Escape}')).toEqual(['Space', 'Space', 'Escape'])
  })

  it('reads keyboard, type, tab and fireEvent calls, only literal text, and only named keys in type()', () => {
    const source = `
      await user.keyboard('{ArrowDown}')
      await user.type(screen.getByRole('textbox', { name: 'Ask' }), 'h i{Enter}')
      await user.tab({ shift: true })
      await user.tab()
      fireEvent.keyDown(el, { key: 'k', metaKey: true })
      await user.keyboard(key)
      await user.keyboard(\`{\${key}}\`)
    `
    expect([...pressedKeys(source)].sort()).toEqual(
      ['ArrowDown', 'Enter', 'Meta+K', 'Shift+Tab', 'Tab'].sort(),
    )
  })

  it('reports documented keys that nothing presses', () => {
    const rows = [{ keys: ['Enter', 'Space'], action: 'Activates.' }, { keys: ['Shift+Tab'], action: 'Moves back.' }]
    expect(untestedKeys(rows, ["await user.keyboard('{Enter}')"])).toEqual(['Space', 'Shift+Tab'])
  })
})
