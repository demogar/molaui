import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { type IconButtonProps } from '../components/button'
import { type ToolbarButtonProps, type ToolbarProps } from '../components/toolbar'

/**
 * cva's `VariantProps` puts `null` into every variant's type; spread into a
 * props interface it leaked into the public API (see `variants.ts`). Two
 * gates: no component file reaches for the raw type, and the compiler refuses
 * `null` for the props the audit found leaking (this file is type-checked by
 * `npm run typecheck`, so an unused `@ts-expect-error` fails it).
 */
describe('variant props', () => {
  const root = join(import.meta.dirname, '..')
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return files(path)
      return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : []
    })

  it('takes variants through Variants<>, never the raw cva VariantProps', () => {
    const offenders = [...files(join(root, 'components')), ...files(join(root, 'patterns'))]
      .filter((path) => /\bVariantProps\b/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(root, path))
    expect(offenders).toEqual([])
  })

  it('does not accept null for a variant', () => {
    const icon: IconButtonProps = {
      label: 'Close',
      children: null,
      // @ts-expect-error null is not a size
      size: null,
      // @ts-expect-error null is not a variant
      variant: null,
    }
    // @ts-expect-error null is not a toolbar variant
    const toolbar: ToolbarProps = { 'aria-label': 'Run actions', variant: null }
    // @ts-expect-error null is not a size
    const button: ToolbarButtonProps = { size: null }
    expect([icon, toolbar, button]).toHaveLength(3)
  })
})
