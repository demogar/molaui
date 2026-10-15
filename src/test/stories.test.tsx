import { composeStories, setProjectAnnotations } from '@storybook/react-vite'
import { act, render } from '@/test/render'
import axe from 'axe-core'
import type * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { resetDeprecations } from '@/lib/deprecate'

import * as preview from '../../.storybook/preview'
import { foundModules } from './found'

/**
 * Every story is a test.
 *
 * Each one is rendered through the real Storybook project annotations (the
 * theme/density decorator included) and audited with axe. The stories are the
 * documented states of the system, so a state that throws or ships an
 * accessibility violation fails CI here — not in a reviewer's browser.
 *
 * Colour contrast is disabled only because jsdom does not lay out or paint:
 * axe cannot compute it there. Contrast is owned by the token contract
 * (src/tokens/contract.test.ts), which resolves every pairing from the CSS
 * itself, and by the a11y addon in the browser.
 *
 * A story also may not use a deprecated prop or value. Stories are the
 * examples people and agents copy, so one written with `<Panel tone>` after
 * `layer` replaced it would teach the old API for as long as it warned.
 */

setProjectAnnotations(preview.default)

type StoryModule = Record<string, unknown>
const modules = foundModules(import.meta.glob<StoryModule>('../**/*.stories.tsx', { eager: true }), 40, 'stories files')

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    'color-contrast': { enabled: false },
    // A story renders a fragment, not a page.
    region: { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
  },
}

for (const [path, mod] of Object.entries(modules)) {
  const stories = composeStories(mod as Parameters<typeof composeStories>[0])
  describe(path.replace('../', ''), () => {
    for (const [name, Story] of Object.entries(stories) as [string, React.ComponentType][]) {
      it(`${name} renders without axe violations`, async () => {
        resetDeprecations()
        const warn = vi.spyOn(console, 'warn')
        const { container } = render(<Story />)
        await act(async () => {
          await new Promise((r) => setTimeout(r, 0))
        })
        const deprecated = warn.mock.calls.map((call) => String(call[0])).filter((m) => m.startsWith('[mola-ui]'))
        warn.mockRestore()
        expect(deprecated).toEqual([])
        const results = await axe.run(container, AXE_OPTIONS)
        const summary = results.violations.map(
          (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
        )
        expect(summary).toEqual([])
      })
    }
  })
}
