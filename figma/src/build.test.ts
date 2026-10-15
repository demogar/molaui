import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { generate, OUT } from '../../scripts/export-figma'
import { type Manifest, unionValues } from './components'
import type { EffectLayer, NodeSpec, Num, Paint } from './spec'
import { tokenPaths } from './tokens'

/**
 * The Figma kit's drift gate. The kit is a plugin the owner runs in their own
 * file (Figma's REST API cannot create components), so what can drift is the
 * committed plugin: its data inlined in code.js, and the component map. This
 * rebuilds both from tokens/mola.tokens.json and docs/ai/components.json and
 * fails on any difference, then holds the rules the kit is built to:
 * every token reaches Figma with scopes and code syntax, every component
 * export is either drawn or listed as pending, and a drawn component speaks
 * the code's names.
 */

const root = resolve(import.meta.dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const { kit, code, map } = generate()
const tokens = JSON.parse(read('tokens/mola.tokens.json')) as Record<string, unknown>
const manifest = JSON.parse(read('docs/ai/components.json')) as Manifest

describe('the committed plugin', () => {
  it('is what the tokens and the manifest build (run `npm run figma`)', () => {
    expect(read(OUT.code) === code, `${OUT.code} is stale: run \`npm run figma\``).toBe(true)
    expect(read(OUT.map), `${OUT.map} is stale: run \`npm run figma\``).toBe(map)
  })

  it('has a manifest Figma can import', () => {
    const manifestJson = JSON.parse(read('figma/plugin/manifest.json')) as Record<string, unknown>
    expect(manifestJson).toMatchObject({ main: 'code.js', api: '1.0.0', editorType: ['figma'], documentAccess: 'dynamic-page' })
    expect(manifestJson.networkAccess).toEqual({ allowedDomains: ['none'] })
  })

  it('is plain script for the plugin sandbox: no imports, no module syntax', () => {
    expect(code).not.toMatch(/^\s*(import|export)\s/m)
    expect(code).not.toMatch(/\brequire\(/)
    expect(code).toContain('exports.main(figma, DATA)')
  })
})

describe('variables', () => {
  const variables = kit.data.collections.flatMap((c) => c.variables.map((v) => ({ collection: c.name, ...v })))

  it('carry every exported token: a variable for each value, an effect style for each shadow', () => {
    const carried = new Set([...variables.flatMap((v) => v.tokens), ...kit.data.effectStyles.flatMap((s) => s.tokens)])
    const missing = tokenPaths(tokens).map(([path]) => path).filter((path) => !carried.has(path))
    expect(missing).toEqual([])
  })

  it('each have code syntax and scopes; only primitives and values Figma cannot apply hide from pickers', () => {
    for (const v of variables) {
      expect(v.codeSyntax, `${v.collection}/${v.name}`).toMatch(/^(var\(--[a-z0-9-]+\)|calc\(var\(--[a-z-]+\) \* [\d.]+\))$/)
      expect(Array.isArray(v.scopes)).toBe(true)
      if (v.scopes.length === 0) {
        expect(v.collection === '_Primitives' || /Figma (cannot|reads|has no)/.test(v.description), `${v.collection}/${v.name} hides from pickers without saying why`).toBe(true)
      }
    }
  })

  it('carry the token export’s own Figma scopes and code syntax for every colour', () => {
    const light = (tokens.color as Record<string, Record<string, { $extensions: Record<string, unknown> }>>).light!
    for (const [name, token] of Object.entries(light)) {
      if (name.startsWith('$')) continue
      const v = variables.find((x) => x.collection === 'Color' && x.name === name)!
      expect(v.scopes).toEqual(token.$extensions['com.figma.scopes'])
      expect(v.codeSyntax).toBe((token.$extensions['com.figma.codeSyntax'] as { WEB: string }).WEB)
    }
  })

  it('are named so Figma accepts them, and unique per collection', () => {
    for (const c of kit.data.collections) {
      const names = c.variables.map((v) => v.name)
      expect(new Set(names).size).toBe(names.length)
      for (const n of names) expect(n).not.toMatch(/[.{}]/)
      for (const v of c.variables) expect(v.values).toHaveLength(c.modes.length)
    }
  })
})

describe('components', () => {
  const exports = manifest.components.flatMap((c) => c.exports.filter((e) => e.kind === 'component').map((e) => ({ page: c, e })))
  const built = new Set(kit.data.components.map((c) => c.name))
  const keys = new Set(kit.data.collections.flatMap((c) => c.variables.map((v) => `${c.name}/${v.name}`)))

  it('map every component export, as built or pending', () => {
    expect(Object.keys(kit.map.components).sort()).toEqual(exports.map(({ e }) => e.name).sort())
    for (const [name, entry] of Object.entries(kit.map.components)) {
      expect(entry.status === 'built', name).toBe(built.has(name))
    }
    for (const name of built) if (!name.startsWith('_')) expect(kit.map.components[name]?.status, name).toBe('built')
  })

  it('include the core set', () => {
    for (const name of ['Button', 'IconButton', 'Input', 'Field', 'Checkbox', 'Radio', 'Switch', 'SelectTrigger', 'Badge', 'Chip', 'Callout', 'TabsTab', 'Panel']) {
      expect(kit.map.components[name]?.status, name).toBe('built')
    }
  })

  it('name their variant axes after props, with the code’s exact values, or say where an axis comes from', () => {
    for (const spec of kit.data.components) {
      if (spec.hidden) continue
      const entry = kit.map.components[spec.name]!
      const e = exports.find((x) => x.e.name === spec.name)!.e
      for (const axis of spec.axes) {
        const mapped = entry.variants?.[axis.name]
        const nonApi = entry.nonApi?.[axis.name]
        expect(Boolean(mapped) !== Boolean(nonApi), `${spec.name}.${axis.name} must be a variant or nonApi, not both or neither`).toBe(true)
        if (nonApi) continue
        expect(mapped!.values).toEqual(axis.values)
        if (mapped!.inherited) continue
        const prop = e.props?.find((p) => p.name === axis.name)
        const code = e.variants?.[axis.name]?.values ?? prop?.values ?? (prop ? unionValues(prop.type) : null)
        expect(code, `${spec.name}.${axis.name} is not a prop of ${spec.name}`).not.toBeNull()
        for (const value of axis.values) expect(code, `${spec.name}.${axis.name}=${value}`).toContain(value)
      }
      for (const prop of spec.properties) {
        if (prop.nonApi) continue
        const known = e.props?.some((p) => p.name === prop.name) || prop.name === 'children' || prop.name === 'value'
        expect(known, `${spec.name} property ${prop.name} is not a prop; mark it nonApi`).toBe(true)
      }
    }
  })

  it('bind every colour and length to a variable that exists', () => {
    const problems: string[] = []
    const num = (n: Num | undefined, where: string) => {
      if (n !== undefined && typeof n !== 'number' && !keys.has(n.var)) problems.push(`${where}: ${n.var}`)
    }
    const paint = (p: Paint | undefined, where: string) => {
      if (p && !keys.has(p.var)) problems.push(`${where}: ${p.var}`)
    }
    const effect = (e: EffectLayer, where: string) => {
      if (!('var' in e.color)) problems.push(`${where}: a literal effect colour`)
      else paint(e.color, where)
      num(e.spread, where)
    }
    const walk = (node: NodeSpec, where: string) => {
      const at = `${where}/${node.name}`
      if (node.kind === 'frame') {
        paint(node.fill, at)
        num(node.width, at)
        num(node.height, at)
        num(node.gap, at)
        Object.values(node.padding ?? {}).forEach((p) => num(p, at))
        node.effects?.forEach((e) => effect(e, at))
        node.children.forEach((c) => walk(c, at))
      } else if (node.kind === 'text') {
        paint(node.text.fill, at)
        num(node.text.size, at)
        if (!keys.has(node.text.family.var)) problems.push(`${at}: ${node.text.family.var}`)
      } else {
        num(node.size, at)
        paint(node.color, at)
        if (!built.has(node.of) && !kit.data.icons.some((i) => i.name === node.of)) problems.push(`${at}: instances unknown ${node.of}`)
      }
    }
    for (const c of kit.data.components) for (const v of c.variants) walk(v.root, c.name)
    expect(problems).toEqual([])
  })

  it('build what they instance first', () => {
    const order = kit.data.components.map((c) => c.name)
    const uses = (node: NodeSpec): string[] => (node.kind === 'instance' ? [node.of] : node.kind === 'frame' ? node.children.flatMap(uses) : [])
    kit.data.components.forEach((c, i) => {
      for (const used of c.variants.flatMap((v) => uses(v.root))) {
        if (used.startsWith('Icon/')) continue
        expect(order.indexOf(used), `${c.name} uses ${used}`).toBeLessThan(i)
        expect(order.indexOf(used)).toBeGreaterThanOrEqual(0)
      }
    })
  })

  it('describe themselves with the import line, the props and a Storybook link', () => {
    for (const c of kit.data.components) {
      if (c.hidden) continue
      expect(c.description).toMatch(new RegExp(`^import \\{ ${c.name} \\} from '@demogar/mola-ui'`))
      expect(c.description).toContain(`Storybook: ${c.docs}`)
      expect(c.docs).toMatch(/^https:\/\/demogar\.github\.io\/molaui\/\?path=\/docs\//)
    }
  })

  it('reference only properties they define', () => {
    for (const c of kit.data.components) {
      const names = new Set(c.properties.map((p) => p.name))
      const refs = (node: NodeSpec): string[] => [
        ...Object.values(node.prop ?? {}),
        ...(node.kind === 'frame' ? node.children.flatMap(refs) : []),
      ]
      for (const v of c.variants) for (const r of refs(v.root)) expect(names.has(r), `${c.name} references ${r}`).toBe(true)
    }
  })
})

describe('unionValues', () => {
  it('reads a string-literal union and a boolean, and refuses anything else', () => {
    expect(unionValues('"sm" | "md" | "lg"')).toEqual(['sm', 'md', 'lg'])
    expect(unionValues('boolean')).toEqual(['false', 'true'])
    expect(unionValues('2 | 3 | 4')).toEqual(['2', '3', '4'])
    expect(unionValues('TabsVariant')).toBeNull()
    expect(unionValues('string')).toBeNull()
  })
})
