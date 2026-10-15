// @vitest-environment node
import { composeStories, setProjectAnnotations } from '@storybook/react-vite'
import type * as React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { initialGlobals, withMolaContext } from '../../.storybook/mola-context'
import { foundModules } from './found'

/**
 * Every story, rendered on a server.
 *
 * The consumer fixtures (test/consumers) server-render a handful of
 * components, so a component that reads `window`, `document` or
 * `localStorage` while rendering could ship as long as no fixture used it,
 * and every Next.js or Remix consumer would then crash on its first request.
 * The stories are the documented states of the system, so each one is
 * composed the way src/test/stories.test.tsx composes it (through the
 * preview's own theme, density and direction decorator) and rendered with `renderToString` in the node
 * environment, where those globals do not exist: a render-time access throws
 * here exactly as it would on a server. Effects do not run on a server, so a
 * component that touches the DOM from `useEffect` passes, as it should.
 *
 * React's server renderer reports some problems through `console.error`
 * rather than by throwing (an invalid hook call, a key warning, a bad prop),
 * so anything written there fails the story too.
 *
 * Hydration is not repeated per story: in jsdom the browser globals exist, so
 * it would not catch this, and the components whose server and client text
 * can disagree (clocks and dates) are hydrated across two time zones in
 * src/test/ssr.test.tsx.
 */

// The decorator and globals of .storybook/preview.tsx, which itself cannot be
// imported without a document (it loads Storybook's doc blocks).
setProjectAnnotations({ decorators: [withMolaContext], initialGlobals })

type StoryModule = Record<string, unknown>
const modules = foundModules(import.meta.glob<StoryModule>('../**/*.stories.tsx', { eager: true }), 40, 'stories files')

let errors: string[] = []
beforeEach(() => {
  errors = []
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('the harness', () => {
  it('runs without browser globals', () => {
    // If the environment ever became jsdom, every story below would pass
    // whether it touched `window` or not.
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    const Naive = () => <p>{window.innerWidth}</p>
    expect(() => renderToString(<Naive />)).toThrow(/window is not defined/)
  })
})

for (const [path, mod] of Object.entries(modules)) {
  const stories = composeStories(mod as Parameters<typeof composeStories>[0])
  describe(path.replace('../', ''), () => {
    for (const [name, Story] of Object.entries(stories) as [string, React.ComponentType][]) {
      it(`${name} renders on a server`, () => {
        // A closed dialog or palette renders nothing on a server; that is
        // correct, so only a throw or a reported error fails.
        renderToString(<Story />)
        expect(errors).toEqual([])
      })
    }
  })
}
