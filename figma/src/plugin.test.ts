import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { buildKit, type Kit } from './build'
import { FakeFigma, type FakeNode } from './fake-figma'
import { main, run } from './plugin'
import type { KitData } from './spec'

/**
 * The plugin cannot be run in Figma from CI, so it is run here against a fake
 * `figma` (fake-figma.ts) with the real kit data: what it creates, that a
 * second run updates rather than duplicates, that an edited token reaches the
 * same variable, and what happens when a font is missing.
 */

const root = resolve(import.meta.dirname, '../..')
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as never

let kit: Kit
beforeAll(() => {
  kit = buildKit(read('tokens/mola.tokens.json'), read('docs/ai/components.json'))
})

const clone = (data: KitData): KitData => structuredClone(data)
const kitPage = (fake: FakeFigma) => fake.pages.find((p) => p.name === kit.data.page)!
const countNodes = (fake: FakeFigma) => fake.pages.reduce((n, p) => n + p.findAll().length, 0)

describe('a first run', () => {
  let fake: FakeFigma
  let result: Awaited<ReturnType<typeof run>>
  beforeAll(async () => {
    fake = new FakeFigma()
    result = await run(fake.api(), kit.data)
  }, 60_000)

  it('finishes with no errors', () => {
    expect(result.report.errors).toEqual([])
    expect(result.report.missingFonts).toEqual([])
  })

  it('creates the four collections with the code’s mode names', () => {
    expect(fake.collections.map((c) => [c.name, c.modes.map((m) => m.name), c.hiddenFromPublishing])).toEqual([
      ['_Primitives', ['value'], true],
      ['Color', ['light', 'dark'], false],
      ['Density', ['comfortable', 'compact', 'spacious'], false],
      ['Scale', ['value'], false],
    ])
  })

  it('writes every variable with its scopes, code syntax and a value in every mode', () => {
    const expected = kit.data.collections.flatMap((c) => c.variables.map((v) => ({ c, v })))
    expect(fake.variables).toHaveLength(expected.length)
    for (const { c, v } of expected) {
      const collection = fake.collections.find((x) => x.name === c.name)!
      const variable = fake.variables.find((x) => x.variableCollectionId === collection.id && x.name === v.name)!
      expect(variable.scopes).toEqual(v.scopes)
      expect(variable.codeSyntax.WEB).toBe(v.codeSyntax)
      expect(variable.hiddenFromPublishing).toBe(c.hidden)
      expect(Object.keys(variable.valuesByMode)).toEqual(collection.modes.map((m) => m.modeId))
    }
  })

  it('aliases each semantic colour to a primitive per theme', () => {
    const color = fake.collections.find((c) => c.name === 'Color')!
    const danger = fake.variables.find((v) => v.variableCollectionId === color.id && v.name === 'danger')!
    const [light, dark] = color.modes.map((m) => danger.valuesByMode[m.modeId] as { id: string })
    expect(fake.variables.find((v) => v.id === light!.id)?.name).toBe('light/rojo')
    expect(fake.variables.find((v) => v.id === dark!.id)?.name).toBe('dark/rojo')
  })

  it('draws every component, with one variant per combination', () => {
    const page = kitPage(fake)
    for (const spec of kit.data.components) {
      const node = page.children.find((n) => n.name === spec.name)
      expect(node, spec.name).toBeDefined()
      if (spec.axes.length) {
        expect(node!.type).toBe('COMPONENT_SET')
        expect(node!.children.map((c) => c.name).sort()).toEqual(
          spec.variants.map((v) => Object.entries(v.props).map(([k, val]) => `${k}=${val}`).join(', ')).sort(),
        )
      } else expect(node!.type).toBe('COMPONENT')
      expect(node!.description.startsWith(`import { ${spec.name} }`) || spec.hidden).toBe(true)
      expect(node!.documentationLinks).toEqual(spec.docs ? [{ uri: spec.docs }] : [])
    }
    expect(page.children.filter((n) => n.name.startsWith('Icon/'))).toHaveLength(kit.data.icons.length)
  })

  it('binds every fill, stroke and effect colour to a variable', () => {
    const unbound: string[] = []
    for (const node of kitPage(fake).findAll()) {
      for (const paint of [...node.fills, ...node.strokes]) if (!paint.boundVariables?.color) unbound.push(`${node.name} paint`)
      for (const effect of node.effects) if (!effect.boundVariables?.color) unbound.push(`${node.name} effect`)
    }
    expect(unbound).toEqual([])
  })

  it('binds padding and gap to spacing variables', () => {
    const button = kitPage(fake).children.find((n) => n.name === 'Button')!
    const md = button.children.find((c) => c.name === 'variant=primary, size=md, disabled=false, state=rest')!
    const name = (id: string | null | undefined) => fake.variables.find((v) => v.id === id)?.name
    expect(name(md.bound.paddingLeft)).toBe('control-px')
    expect(name(md.bound.itemSpacing)).toBe('space/2')
    expect(name(md.bound.height)).toBe('control-h')
    expect(name(md.effects[0]!.boundVariables?.spread?.id)).toBe('cut-w')
    const label = md.findAll((n) => n.type === 'TEXT')[0]!
    expect(name(label.bound.fontSize)).toBe('text-xs')
    expect(name(label.bound.fontFamily)).toBe('font-ui')
    expect(label.fontName).toEqual({ family: 'Archivo', style: 'SemiBold', variationSettings: { wdth: 116 } })
  })

  it('exposes props as component properties and wires every reference', () => {
    const page = kitPage(fake)
    const button = page.children.find((n) => n.name === 'Button')!
    const names = Object.entries(button.definitions).map(([k, d]) => [k.split('#')[0], d.type])
    expect(names).toEqual([
      ['children', 'TEXT'],
      ['icon', 'INSTANCE_SWAP'],
      ['has icon', 'BOOLEAN'],
      ['withArrow', 'BOOLEAN'],
    ])
    const icon = Object.entries(button.definitions).find(([k]) => k.startsWith('icon#'))![1]
    expect(icon.preferredValues?.length).toBe(4)
    const field = page.children.find((n) => n.name === 'Field')!
    const control = field.findAll((n) => n.name === 'control')[0]!
    const swap = Object.entries(field.definitions).find(([k]) => k.startsWith('children#'))!
    expect(control.componentPropertyReferences).toEqual({ mainComponent: swap[0] })
    // The default is the variant the control was drawn from.
    expect(swap[1].defaultValue).toBe(control.mainComponent!.id)
    expect(control.mainComponent!.name).toBe('size=md, aria-invalid=false, disabled=false, state=rest')
  })

  it('leaves nothing behind on the first page', () => {
    expect(fake.pages[0]!.children).toEqual([])
  })

  it('runs as the committed code.js, with only `figma` in scope', async () => {
    const other = new FakeFigma()
    const code = readFileSync(resolve(root, 'figma/plugin/code.js'), 'utf8')
    new Function('figma', code)(other.api())
    await expect.poll(() => other.closed, { timeout: 60_000 }).toMatch(/^Mola UI kit: variables \d+ created.*components \d+ created/)
    expect(other.closed).not.toContain('Failed')
  }, 60_000)

  it('closes with a summary through main()', async () => {
    const other = new FakeFigma()
    main(other.api(), kit.data)
    await expect.poll(() => other.closed, { timeout: 60_000 }).toMatch(/^Mola UI kit: variables \d+ created/)
  }, 60_000)
})

describe('a second run', () => {
  it('updates in place: the same ids, no duplicates', async () => {
    const fake = new FakeFigma()
    await run(fake.api(), kit.data)
    const ids = (nodes: FakeNode[]) => nodes.map((n) => n.id)
    const before = {
      collections: fake.collections.map((c) => c.id),
      variables: fake.variables.map((v) => v.id),
      styles: fake.effectStyles.map((s) => s.id),
      top: ids(kitPage(fake).children),
      variants: ids(kitPage(fake).children.flatMap((n) => (n.type === 'COMPONENT_SET' ? n.children : []))),
      nodes: countNodes(fake),
    }
    const { report } = await run(fake.api(), kit.data)
    expect(report.collections).toEqual({ created: 0, updated: 4 })
    expect(report.variables.created).toBe(0)
    expect(report.effectStyles.created).toBe(0)
    expect(report.components.created).toBe(0)
    expect(report.variants.created).toBe(0)
    expect(report.icons.created).toBe(0)
    expect(report.stale).toEqual([])
    expect(fake.collections.map((c) => c.id)).toEqual(before.collections)
    expect(fake.variables.map((v) => v.id)).toEqual(before.variables)
    expect(fake.effectStyles.map((s) => s.id)).toEqual(before.styles)
    expect(ids(kitPage(fake).children)).toEqual(before.top)
    expect(ids(kitPage(fake).children.flatMap((n) => (n.type === 'COMPONENT_SET' ? n.children : [])))).toEqual(before.variants)
    expect(countNodes(fake)).toBe(before.nodes)
  }, 60_000)

  it('writes a changed token to the same variable', async () => {
    const fake = new FakeFigma()
    await run(fake.api(), kit.data)
    const changed = clone(kit.data)
    const ink = changed.collections[0]!.variables.find((v) => v.name === 'light/ink')!
    ink.values = [{ r: 0.1, g: 0.1, b: 0.1, a: 1 }]
    const spacing = changed.collections[2]!.variables.find((v) => v.name === 'spacing')!
    spacing.description = 'Changed.'
    const before = fake.variables.find((v) => v.name === 'light/ink')!
    await run(fake.api(), changed)
    const after = fake.variables.find((v) => v.name === 'light/ink')!
    expect(after.id).toBe(before.id)
    expect(Object.values(after.valuesByMode)).toEqual([{ r: 0.1, g: 0.1, b: 0.1, a: 1 }])
    expect(fake.variables.find((v) => v.name === 'spacing')!.description).toBe('Changed.')
  }, 60_000)

  it('reports, and keeps, what the data no longer has', async () => {
    const fake = new FakeFigma()
    await run(fake.api(), kit.data)
    const fewer = clone(kit.data)
    fewer.collections[3]!.variables = fewer.collections[3]!.variables.filter((v) => v.name !== 'z-toast')
    const badge = fewer.components.find((c) => c.name === 'Badge')!
    badge.variants = badge.variants.filter((v) => v.props.tone !== 'accent')
    const { report, message } = await run(fake.api(), fewer)
    expect(report.stale).toEqual(expect.arrayContaining(['variable Scale/z-toast', 'variant Badge / tone=accent, variant=solid']))
    expect(fake.variables.some((v) => v.name === 'z-toast')).toBe(true)
    expect(message).toContain('left in place for you to delete')
  }, 60_000)
})

describe('fonts', () => {
  it('syncs the variables but stops before the components when Archivo is missing, and says so', async () => {
    const fake = new FakeFigma({ Alegreya: ['Regular'], 'Martian Mono': ['Regular'] })
    const { report, message } = await run(fake.api(), kit.data)
    expect(fake.variables).toHaveLength(kit.data.collections.reduce((n, c) => n + c.variables.length, 0))
    expect(kitPage(fake).children.filter((n) => n.type === 'COMPONENT_SET')).toEqual([])
    expect(report.missingFonts).toEqual(expect.arrayContaining(['Archivo SemiBold', 'Archivo Regular']))
    expect(message).toMatch(/Missing fonts: .*Install Archivo, Alegreya, Martian Mono/)
  })

  it('draws everything when only an unused voice is missing, and still names it', async () => {
    const fake = new FakeFigma({ Archivo: ['Regular', 'Medium', 'SemiBold'], Alegreya: ['Regular'] })
    const { report, message } = await run(fake.api(), kit.data)
    expect(report.errors).toEqual([])
    expect(message).toContain('Martian Mono Regular')
  }, 60_000)

  it('falls back to the static face when the installed Archivo has no width axis', async () => {
    const fake = new FakeFigma(undefined, [])
    const { report } = await run(fake.api(), kit.data)
    expect(report.errors).toEqual([])
    const label = kitPage(fake).findAll((n) => n.type === 'TEXT' && n.textCase === 'UPPER')[0]!
    expect(label.fontName).toEqual({ family: 'Archivo', style: 'SemiBold' })
  }, 60_000)
})
