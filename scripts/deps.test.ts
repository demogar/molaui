import { builtinModules } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from '../src/test/found'
import {
  BUNDLED,
  closure,
  isRegistryFailure,
  judge,
  licenseAllowed,
  SHIPPED_LICENSES,
  shipped,
  TREE_LICENSES,
  type AuditReport,
  type AuditVulnerability,
  type Lock as DepsLock,
} from './deps.mjs'

/**
 * The licence half of #100, offline: every package in package-lock.json
 * carries an allowed licence, and what ships carries a permissive one. The
 * lockfile records each package's `license`, so this needs no registry and
 * cannot flake. The audit half (scripts/deps.mjs, run by Gates) is tested
 * here through its pure parts.
 */
const root = resolve(import.meta.dirname, '..')
type Lock = DepsLock
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8')) as Lock
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>
  peerDependencies: Record<string, string>
}
const installed = found(
  Object.keys(lock.packages).filter((path) => path !== ''),
  300,
  'packages in package-lock.json',
)
const ships = shipped(lock, pkg)

describe('licences', () => {
  it('finds what ships: dependencies, peers and the bundled MCP SDK', () => {
    for (const name of [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies), ...BUNDLED]) {
      expect(ships.has(`node_modules/${name}`), name).toBe(true)
    }
    // Transitive packages are followed (Base UI's own dependencies, the SDK's).
    expect(ships.has('node_modules/@base-ui/utils')).toBe(true)
    expect(ships.size).toBeGreaterThan(20)
  })

  it('every shipped package has a permissive licence', () => {
    const offenders = [...ships]
      .filter((path) => !licenseAllowed(lock.packages[path]?.license, SHIPPED_LICENSES))
      .map((path) => `${path}: ${lock.packages[path]?.license ?? 'no licence'}`)
    expect(offenders, 'read the licence; add it to SHIPPED_LICENSES in scripts/deps.mjs only if it is permissive').toEqual([])
  })

  it('every installed package, dev tooling included, has an allowed licence', () => {
    const offenders = installed
      .filter((path) => !licenseAllowed(lock.packages[path]?.license, TREE_LICENSES))
      .map((path) => `${path}: ${lock.packages[path]?.license ?? 'no licence'}`)
    expect(offenders, 'read the licence; add it to TREE_LICENSES in scripts/deps.mjs with why').toEqual([])
  })

  it('reads SPDX expressions', () => {
    expect(licenseAllowed('MIT', ['MIT'])).toBe(true)
    expect(licenseAllowed('(MIT OR GPL-3.0)', ['MIT'])).toBe(true)
    expect(licenseAllowed('MIT AND GPL-3.0', ['MIT'])).toBe(false)
    expect(licenseAllowed('GPL-3.0-only', TREE_LICENSES)).toBe(false)
    expect(licenseAllowed('SEE LICENSE IN LICENSE.md', TREE_LICENSES)).toBe(false)
    expect(licenseAllowed(undefined, TREE_LICENSES)).toBe(false)
  })
})

describe('BUNDLED matches what the MCP server imports', () => {
  it('lists exactly the non-dependency packages mcp/ imports', () => {
    const sources = ['bin.ts', 'check.ts', 'data.ts', 'format.ts', 'server.ts'].map((file) => readFileSync(resolve(root, 'mcp', file), 'utf8'))
    const imported = new Set(
      sources.flatMap((text) =>
        [...text.matchAll(/^import [^'\n]*'([^'.][^']*)'/gm)].map((m) => {
          const spec = m[1] as string
          return spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : (spec.split('/')[0] as string)
        }),
      ),
    )
    const outside = [...imported].filter(
      (name) => !name.startsWith('node:') && !builtinModules.includes(name) && !(name in pkg.dependencies),
    )
    expect(outside.sort()).toEqual([...BUNDLED].sort())
  })
})

describe('the ESLint plugin ships no package', () => {
  /**
   * vite.eslint.config.ts bundles eslint/plugin.ts with everything it imports
   * into dist/eslint/index.js. A package it imported would ship inside that
   * file, outside `shipped()` and so outside the licence and audit gates. So
   * it may import nothing but Node's builtins and its own files (mcp/check.ts,
   * mcp/data.ts); a type-only import (`eslint`'s types) is erased. To bundle
   * a package, add it to the audit first, as BUNDLED does for the MCP bin.
   */
  it('imports only Node builtins and its own files, followed through every relative import', () => {
    const seen = new Set<string>()
    const packages = new Set<string>()
    const visit = (file: string) => {
      if (seen.has(file)) return
      seen.add(file)
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/^import\s+(type\s+)?[^'\n]*?from\s+'([^']+)'/gm)) {
        const spec = m[2] as string
        if (m[1]) continue
        if (spec.startsWith('.')) visit(resolve(file, '..', `${spec}.ts`))
        else if (!spec.startsWith('node:') && !builtinModules.includes(spec)) packages.add(spec)
      }
    }
    visit(resolve(root, 'eslint/plugin.ts'))
    expect([...seen].map((file) => file.slice(root.length + 1)).sort()).toEqual(['eslint/plugin.ts', 'mcp/check.ts', 'mcp/data.ts'])
    expect([...packages]).toEqual([])
  })
})

describe('closure', () => {
  it('resolves a nested copy before the top-level one', () => {
    const fake = {
      packages: {
        'node_modules/a': { dependencies: { b: '1' } },
        'node_modules/a/node_modules/b': { dependencies: { c: '1' } },
        'node_modules/b': {},
        'node_modules/c': {},
      },
    }
    expect([...closure(fake, ['a'])].sort()).toEqual(['node_modules/a', 'node_modules/a/node_modules/b', 'node_modules/c'])
  })

  it('throws on a root that is not installed', () => {
    expect(() => closure({ packages: {} }, ['missing'])).toThrow(/missing/)
  })
})

describe('judge', () => {
  const advisory = (severity: string, id = 'GHSA-xxxx-yyyy-zzzz') => ({
    title: 'Prototype pollution',
    url: `https://github.com/advisories/${id}`,
    severity,
  })
  const ships = new Set(['node_modules/shipped'])
  const report = (name: string, severity: string, via: AuditVulnerability['via']): AuditReport => ({
    vulnerabilities: { [name]: { name, severity, nodes: [`node_modules/${name}`], via } },
  })

  it('fails a high or critical advisory on a shipped package', () => {
    expect(judge(report('shipped', 'high', [advisory('high')]), ships, {}).failures).toHaveLength(1)
    expect(judge(report('shipped', 'critical', [advisory('critical')]), ships, {}).failures).toHaveLength(1)
  })

  it('warns on a moderate advisory on a shipped package', () => {
    const result = judge(report('shipped', 'moderate', [advisory('moderate')]), ships, {})
    expect(result).toMatchObject({ failures: [], warnings: [expect.stringContaining('shipped (moderate)')] })
  })

  it('counts, but never fails, findings in dev tooling', () => {
    expect(judge(report('devtool', 'critical', [advisory('critical')]), ships, {})).toEqual({ failures: [], warnings: [], devOnly: 1 })
  })

  it('passes an advisory accepted by GHSA id', () => {
    const result = judge(report('shipped', 'high', [advisory('high', 'GHSA-aaaa-bbbb-cccc')]), ships, {
      'GHSA-aaaa-bbbb-cccc': 'only the HTTP transport, which the bin does not bundle',
    })
    expect(result.failures).toEqual([])
  })

  it('leaves an inherited finding to the package with the advisory', () => {
    expect(judge(report('shipped', 'high', ['other']), ships, {}).failures).toEqual([])
  })
})

describe('isRegistryFailure', () => {
  it('recognises npm failing to reach the registry', () => {
    expect(isRegistryFailure('request to https://registry.npmjs.org/-/npm/v1/security/audits/quick failed, reason: connect ECONNREFUSED')).toBe(true)
    expect(isRegistryFailure('npm error audit endpoint returned an error')).toBe(true)
    expect(isRegistryFailure('getaddrinfo EAI_AGAIN registry.npmjs.org')).toBe(true)
  })

  it('does not excuse other failures', () => {
    expect(isRegistryFailure('npm error code ENOLOCK\nnpm error audit This command requires an existing lockfile.')).toBe(false)
    expect(isRegistryFailure('Unexpected token < in JSON')).toBe(false)
  })
})
