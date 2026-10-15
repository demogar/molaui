// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from '../test/found'

/**
 * ADR 0005: nothing drops below 11px, even in `compact`. The type scale holds
 * that (its smallest step, text-2xs, is 11px in every density), so the only
 * way under it is an arbitrary size written into a component. Avatar's
 * initials did exactly that, at 9 and 10px. This reads every component and
 * pattern for `text-[Npx]` / `text-[Nrem]` and fails on any under 11px.
 */
const root = resolve(import.meta.dirname, '..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : []
  })
}

describe('the type floor', () => {
  it('writes no arbitrary text size under 11px', () => {
    const under = found([...files(join(root, 'components')), ...files(join(root, 'patterns'))], 100, 'component and pattern sources').flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/\btext-\[([\d.]+)(px|rem)\]/g)]
        .filter((m) => Number(m[1]) * (m[2] === 'rem' ? 16 : 1) < 11)
        .map((m) => `${relative(root, path)}: ${m[0]}`),
    )
    expect(under).toEqual([])
  })
})
