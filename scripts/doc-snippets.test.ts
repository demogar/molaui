import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { docSnippets } from './doc-snippets.mjs'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

/**
 * The compile itself happens in `npm run consumers` (the Next fixture's
 * `next build` type-checks every block). These are the fast half: the page
 * still has the first-run recipes the audit found missing, every block can
 * be placed in the fixture, and the setup every surface teaches includes
 * ToastProvider, without which `useToast()` throws.
 */
describe('Getting started snippets', () => {
  const snippets = docSnippets()
  const paths = snippets.map((s) => s.path)

  it('names a file for every tsx block', () => {
    expect(paths).toEqual(expect.arrayContaining(['snippets/main.tsx', 'snippets/theme-switcher.tsx', 'app/layout.tsx', 'app/fonts.ts']))
  })

  it('refuses a tsx block without a file name', () => {
    expect(() => docSnippets('```tsx\nconst a = 1\n```\n')).toThrow(/must start with/)
  })

  it('the app root and the Next.js layout mount every provider', () => {
    for (const path of ['snippets/main.tsx', 'app/layout.tsx']) {
      const code = snippets.find((s) => s.path === path)!.code
      for (const provider of ['DirectionProvider', 'ToastProvider', 'TooltipProvider']) expect(code, `${path} ${provider}`).toContain(`<${provider}`)
    }
  })

  it('the Next.js fixture renders the documented theme switcher and field', () => {
    const page = read('test/consumers/next/app/page.tsx')
    expect(page).toContain("from '../snippets/theme-switcher'")
    expect(page).toContain("from '../snippets/agent-name-field'")
  })

  it('every setup surface names ToastProvider and the stylesheet for an existing app', () => {
    for (const file of ['src/docs/getting-started.mdx', 'skills/mola-ui/SKILL.md', 'llms.txt', 'README.md']) {
      const text = read(file)
      expect(text, file).toContain('ToastProvider')
      expect(text, file).toContain('components.css')
    }
  })
})
