import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { composeStories, setProjectAnnotations } from '@storybook/react-vite'
import { act, render } from '@/test/render'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'

import * as preview from '../../../.storybook/preview'
import { utilityReader } from '../blocks/anatomy-utilities'
import { ANATOMY, anatomyRoot, ownedParts, partElement, pinnedParts, ROOT_PART } from './anatomy'
import { isShowcase } from './showcases'

/**
 * The anatomy legend against the component it describes, rendered for real.
 *
 * Both directions are held: a part the legend names must exist in the story
 * that is meant to show it, and a `data-part` the component owns, in any of
 * its stories, must be in the legend. The first stops
 * a renamed part from leaving a dangling pin; the second stops a new part from
 * shipping undocumented, or a stray `data-part` from becoming API by accident.
 */
setProjectAnnotations(preview.default)

const styles = (name: string) => readFileSync(resolve(import.meta.dirname, '../../styles', name), 'utf8')
const { partUtilities } = utilityReader(styles('cloth.css'), styles('theme.css'))

type StoryModule = { default: { title: string } } & Record<string, unknown>
const modules = Object.values(import.meta.glob<StoryModule>('../../**/*.stories.tsx', { eager: true }))

function storiesOf(title: string) {
  const mod = modules.find((m) => m.default.title === title)
  if (!mod) throw new Error(`no stories titled ${title}`)
  return composeStories(mod as Parameters<typeof composeStories>[0]) as Record<string, React.ComponentType>
}

async function renderStory(title: string, story: string) {
  const Story = storiesOf(title)[story]
  if (!Story) throw new Error(`${title} has no story ${story}`)
  const { container, unmount } = render(<Story />)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  return { container, unmount }
}

const rootsIn = (container: HTMLElement, slot: string) => [...container.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`)]

describe('anatomy', () => {
  for (const [title, anatomy] of Object.entries(ANATOMY)) {
    describe(title, () => {
      it('is a component page', () => {
        expect(isShowcase(title)).toBe(false)
      })

      it('every pinned part is in the diagram’s story, on the first instance', async () => {
        const { container, unmount } = await renderStory(title, anatomy.story)
        const root = anatomyRoot(container, anatomy)
        expect(root, `no [data-slot="${anatomy.slot}"] in ${anatomy.story}`).not.toBeNull()
        const missing = pinnedParts(anatomy).filter(({ part, nth }) => !partElement(root!, part, nth)).map((p) => p.part)
        unmount()
        expect(missing).toEqual([])
      })

      it('every other part is in the story it names', async () => {
        const missing: string[] = []
        for (const { part, story } of anatomy.parts.filter((p) => !pinnedParts(anatomy).includes(p))) {
          const { container, unmount } = await renderStory(title, story!)
          if (!rootsIn(container, anatomy.slot).some((root) => partElement(root, part))) missing.push(`${part} in ${story}`)
          unmount()
        }
        expect(missing).toEqual([])
      })

      it('every data-part it owns, in every story, is in the legend', async () => {
        const declared = new Set(anatomy.parts.map((p) => p.part))
        const undeclared = new Set<string>()
        for (const name of Object.keys(storiesOf(title))) {
          const { container, unmount } = await renderStory(title, name)
          for (const root of rootsIn(container, anatomy.slot)) {
            for (const el of ownedParts(root)) if (!declared.has(el.dataset.part!)) undeclared.add(`${el.dataset.part} (${name})`)
          }
          unmount()
        }
        expect([...undeclared]).toEqual([])
      })
    })
  }

  it('reads the system classes a part is made of', async () => {
    const anatomy = ANATOMY['AI/Tool call']!
    const { container } = await renderStory('AI/Tool call', anatomy.story)
    const root = anatomyRoot(container, anatomy)!
    const own = partUtilities(partElement(root, ROOT_PART)!, false)
    expect(own).toEqual(expect.arrayContaining(['bg-cloth-pale', 'band-accent', 'cut-band']))
    // Layout classes are how a part is placed, not what it is made of.
    expect(own).not.toContain('relative')
    // A nested component's classes belong to its own part.
    expect(partUtilities(partElement(root, 'name')!)).toEqual(['literal', 'text-ink'])
  })
})
