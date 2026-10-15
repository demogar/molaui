import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The package boundary: what an app gets when it installs the library. The
 * repo pins every version exactly, which is right for the toolchain and wrong
 * for a library's own requirements, and the two were mixed up.
 *
 * The consumer fixture test/consumers/node-require proves the same things in
 * a real install (`require()` works, `npm ls` finds one Base UI). It cannot
 * fail the Base UI arrangement today, though: 1.9.0 is both the newest Base
 * UI and the library's pin, so a dependency would be deduped by luck. This
 * test fails the arrangement itself.
 */
const root = resolve(import.meta.dirname, '../..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  exports: Record<string, string | Record<string, string>>
  engines?: { node?: string }
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  bin?: Record<string, string>
}

const version = (v: string) => v.replace(/^[\^~>=\s]+/, '').split('.').map(Number) as [number, number, number]
const atLeast = (a: number[], b: number[]) => {
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  return true
}

describe('package boundary', () => {
  it('takes @base-ui/react as a peer, so the app and the library share one copy', () => {
    // As a pinned dependency, any app on a newer 1.x got a second copy nested
    // under the package, and DirectionProvider from Mola (src/lib/direction.ts
    // exists to prevent exactly this) no longer reached Slider, Tabs or Drawer.
    expect(pkg.dependencies?.['@base-ui/react']).toBeUndefined()
    const peer = pkg.peerDependencies?.['@base-ui/react']
    const dev = pkg.devDependencies?.['@base-ui/react']
    expect(peer).toMatch(/^\^\d+\.\d+\.\d+$/)
    // The exact pin stays in devDependencies, and must satisfy the range the
    // package promises, or the repo would test against a version no user can have.
    expect(dev).toMatch(/^\d+\.\d+\.\d+$/)
    const [floor, pinned] = [version(peer!), version(dev!)]
    expect(pinned[0]).toBe(floor[0])
    expect(atLeast(pinned, floor)).toBe(true)
  })

  it('declares its runtime dependencies as ranges, so npm can dedupe them with the app', () => {
    for (const [name, range] of Object.entries(pkg.dependencies ?? {})) {
      expect(range, `${name} is pinned exactly in dependencies`).toMatch(/^\^/)
    }
  })

  it('resolves the root entry for require() as well as import', () => {
    // Without a `default` condition, Jest in CommonJS mode and any Node script
    // using require() failed with ERR_PACKAGE_PATH_NOT_EXPORTED.
    const entry = pkg.exports['.'] as Record<string, string>
    expect(entry.default).toBe(entry.import)
    // `default` must be last: conditions are matched in order.
    expect(Object.keys(entry).at(-1)).toBe('default')
  })

  it('tells every reader to install each peer the app must add itself', () => {
    // A peer that an install line leaves out is a missing dependency under
    // yarn or a strict pnpm, and a silent second copy where it is auto-installed.
    // llms.txt is generated from package.json (scripts/export-manifest.ts).
    const peers = Object.keys(pkg.peerDependencies ?? {}).filter((name) => !['react', 'react-dom'].includes(name))
    expect(peers.length).toBeGreaterThan(0)
    for (const file of ['README.md', 'src/docs/getting-started.mdx', 'skills/mola-ui/SKILL.md']) {
      const text = readFileSync(resolve(root, file), 'utf8')
      const lines = [...text.matchAll(/npm install @demogar\/mola-ui[^\n]*(?:\\\n[^\n]*)*/g)].map((m) => m[0])
      expect(lines.length, `${file} has no install line`).toBeGreaterThan(0)
      for (const line of lines) for (const peer of peers) expect(line, `${file}: ${line}`).toContain(peer)
    }
  })

  it('asks for a Node that can require() it, not the toolchain pin', () => {
    // require(esm) is unflagged from Node 22.12, the floor the `default`
    // condition needs. The old floor was .nvmrc's exact patch, copied from the
    // toolchain, which refused installs on 22.22 under engine-strict.
    const nvmrc = readFileSync(resolve(root, '.nvmrc'), 'utf8').trim()
    const floor = pkg.engines?.node
    expect(floor).toMatch(/^>=\d+\.\d+\.\d+$/)
    expect(floor).not.toBe(`>=${nvmrc}`)
    expect(atLeast(version(floor!), [22, 12, 0])).toBe(true)
  })
})

describe('bin', () => {
  // npm normalises a bin path on publish and logs the original as "invalid and
  // removed" when it starts with "./" (0.7.1's publish log), though the bin
  // still works. Written the way npm writes it, the publish log stays quiet,
  // so a real warning there is not lost among false ones.
  it('is written the way npm normalises it', () => {
    const bins = Object.entries(pkg.bin ?? {})
    expect(bins.length).toBeGreaterThan(0)
    expect(bins.filter(([, path]) => path.startsWith('./'))).toEqual([])
  })
})
