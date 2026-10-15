import { composeStories, setProjectAnnotations } from '@storybook/react-vite'
import { act, render } from '@/test/render'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'

import * as preview from '../../../.storybook/preview'
import { foundModules } from '../../test/found'
import { ACCESSIBILITY, NON_INTERACTIVE } from './accessibility'
import { HARD_STATE_EXEMPT, HARD_STATES, type HardStateName } from './hard-states'

/**
 * Every interactive component page has a hard-states story, and it shows what
 * it claims (the convention is in ./hard-states.ts). Interactive means a
 * keyboard table in accessibility.ts, read here rather than listed, so the
 * page that adds a component's keys is the page that owes its hard states.
 */
setProjectAnnotations(preview.default)

type Meta = { title: string; tags?: string[] }
type StoryModule = { default: Meta; HardStates?: { name?: string; tags?: string[] } } & Record<string, unknown>
const modules = Object.values(foundModules(import.meta.glob<StoryModule>('../../**/*.stories.tsx', { eager: true }), 40, 'stories files'))

const interactive = Object.entries(ACCESSIBILITY)
  .filter(([title, a]) => !NON_INTERACTIVE.has(title) && (a.keyboard?.length ?? 0) > 0)
  .map(([title]) => title)

const DISABLED = ':disabled, [aria-disabled="true"], [data-disabled]'

describe('hard states', () => {
  it('finds the interactive pages', () => {
    expect(interactive.length).toBeGreaterThan(30)
  })

  it('exempts only interactive pages, with a reason', () => {
    for (const [title, states] of Object.entries(HARD_STATE_EXEMPT)) {
      expect(interactive, `${title} is exempted but has no keyboard table`).toContain(title)
      for (const [state, why] of Object.entries(states)) expect(why?.trim().length, `${title} ${state}`).toBeGreaterThan(20)
    }
  })

  for (const title of interactive) {
    describe(title, () => {
      const mod = modules.find((m) => m.default.title === title)

      it('exports a HardStates story tagged hard-states', () => {
        expect(mod, `no stories titled ${title}`).toBeDefined()
        expect(mod!.HardStates, `${title} has no \`export const HardStates\``).toBeDefined()
        expect(mod!.HardStates!.tags ?? []).toContain('hard-states')
      })

      it('shows every hard state it owes, and none it is exempt from', async () => {
        if (!mod?.HardStates) return
        const Story = (composeStories(mod as Parameters<typeof composeStories>[0]) as Record<string, React.ComponentType>)
          .HardStates!
        const { container, unmount } = render(<Story />)
        await act(async () => {
          await new Promise((r) => setTimeout(r, 0))
        })
        const cell = (state: HardStateName) => container.querySelector<HTMLElement>(`[data-hard-state="${state}"]`)
        const exempt = HARD_STATE_EXEMPT[title] ?? {}
        for (const state of HARD_STATES) {
          const owed = !(state in exempt)
          expect(!!cell(state), owed ? `${title} has no ${state} cell` : `${title} is exempt from ${state} but shows it`).toBe(owed)
        }
        expect(cell('rtl')?.getAttribute('dir')).toBe('rtl')
        // Something visible besides the caption: a cell is a state, not a heading.
        for (const state of HARD_STATES) {
          const c = cell(state)
          if (c) expect(c.children.length, `${title} ${state} cell is empty`).toBeGreaterThan(1)
        }
        const disabled = cell('disabled')
        if (disabled) expect(disabled.querySelector(DISABLED), `${title}: nothing disabled in the disabled cell`).not.toBeNull()
        unmount()
      })
    })
  }
})
