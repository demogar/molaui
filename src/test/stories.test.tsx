import { composeStories, setProjectAnnotations } from '@storybook/react-vite'
import { act, render } from '@testing-library/react'
import axe from 'axe-core'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'

import * as preview from '../../.storybook/preview'

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
 */

setProjectAnnotations(preview.default)

type StoryModule = Record<string, unknown>
const modules = import.meta.glob<StoryModule>('../**/*.stories.tsx', { eager: true })

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
        const { container } = render(<Story />)
        await act(async () => {
          await new Promise((r) => setTimeout(r, 0))
        })
        const results = await axe.run(container, AXE_OPTIONS)
        const summary = results.violations.map(
          (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
        )
        expect(summary).toEqual([])
      })
    }
  })
}
