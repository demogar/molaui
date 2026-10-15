import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * One meaning each for `tone`, `variant`, `kind` and `size`
 * (docs/adr/0008-prop-vocabulary.md), read from the agent manifest
 * (docs/ai/components.json), which is what people and agents see.
 *
 * Each name had drifted to four or five meanings: `tone` was a status on
 * Badge, a layer of cloth on Panel, an inversion on StepList and a number on
 * Text; `size` was the t-shirt scale on Button and `default | comfortable` on
 * Chip; `variant` was a look on Badge and a category on EmptyState. Each was
 * well argued locally, and together they made `<EmptyState tone="danger">`
 * and `<Chip size="sm">` type errors that had to be looked up per component,
 * the opposite of what the manifest and the MCP server promise an agent.
 *
 * - `tone` (and `*Tone`): a status, from TONES.
 * - `size` (and `*Size`, when it is a scale and not a count): from SIZES.
 * - `variant` (and `*Variant`): a presentation, from PRESENTATION. A
 *   category is a `kind`, not a variant.
 * - `kind`: a category, which shares no word with the other three.
 *
 * A prop marked `@deprecated` is skipped: it keeps working through its
 * deprecation window and is gone in the next major. A deprecated VALUE of a
 * kept prop is listed in DEPRECATED_VALUES with its replacement, which must
 * be there too, and the entry must be deleted when the value goes.
 */
const TONES = ['neutral', 'info', 'success', 'warn', 'danger', 'accent']
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl']
const PRESENTATION = [
  'default',
  'primary',
  'secondary',
  'ghost',
  'muted',
  'solid',
  'soft',
  'outline',
  'seam',
  'flat',
  'keyline',
  'relleno',
  'diente',
  'panel',
  'bare',
  'underline',
  'pages',
  'compact',
  'full',
  'inline',
  'editorial',
]

/** A presentation word that is also a tone, where that is the point. */
const VARIANT_TONE_WORDS: Record<string, string[]> = {
  // A destructive button is a presentation of the action — the rojo fill
  // that says "this destroys" — and a button has no `tone` to carry it.
  'Button.variant': ['danger'],
  'IconButton.variant': ['danger'],
}

/** `Component.prop` → deprecated value → its replacement, which must also be accepted. */
const DEPRECATED_VALUES: Record<string, Record<string, string>> = {
  'Chip.size': { default: 'sm', comfortable: 'md' },
  'Text.size': { base: 'md' },
  'Prose.size': { base: 'md' },
  'Text.tone': { default: 'neutral', 2: 'neutral', muted: 'neutral' },
  'Progress.tone': { ink: 'neutral' },
  'MenuItem.tone': { default: 'neutral' },
  'NavItem.countTone': { attention: 'danger' },
}

interface Prop {
  name: string
  type: string
  values?: string[]
  deprecated?: string
}
interface Manifest {
  components: { exports?: { name: string; kind: string; props?: Prop[] }[] }[]
}

const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../docs/ai/components.json'), 'utf8')) as Manifest

/** The literal values a prop accepts, or null when its type is not a literal union. */
export function valuesOf(prop: Pick<Prop, 'type' | 'values'>): string[] | null {
  if (prop.values) return prop.values
  const parts = prop.type.split('|').map((part) => part.trim())
  if (!parts.every((part) => /^("[^"]*"|\d+|true|false)$/.test(part))) return null
  return parts.map((part) => part.replace(/^"|"$/g, ''))
}

type Role = 'tone' | 'size' | 'variant' | 'kind'

function roleOf(name: string): Role | null {
  if (name === 'tone' || /[a-z]Tone$/.test(name)) return 'tone'
  if (name === 'size' || /[a-z]Size$/.test(name)) return 'size'
  if (name === 'variant' || /[a-z]Variant$/.test(name)) return 'variant'
  if (name === 'kind' || /[a-z]Kind$/.test(name)) return 'kind'
  return null
}

/** Every vocabulary problem in a manifest, as `Component.prop: reason`. */
export function vocabularyProblems(m: Manifest): string[] {
  const problems: string[] = []
  for (const component of m.components) {
    for (const exp of component.exports ?? []) {
      if (exp.kind !== 'component') continue
      for (const prop of exp.props ?? []) {
        const role = roleOf(prop.name)
        if (!role || prop.deprecated !== undefined) continue
        const id = `${exp.name}.${prop.name}`
        const values = valuesOf(prop)
        if (!values) {
          // A count such as `pageSize: number` is not the size scale.
          if (role === 'size' && /^number\b/.test(prop.type)) continue
          problems.push(`${id}: cannot read the values of ${prop.type}`)
          continue
        }
        const retired = DEPRECATED_VALUES[id] ?? {}
        for (const [old, replacement] of Object.entries(retired)) {
          if (!values.includes(replacement)) problems.push(`${id}: deprecated "${old}" has no replacement "${replacement}"`)
        }
        const current = values.filter((v) => !(v in retired))
        const allowed =
          role === 'tone'
            ? TONES
            : role === 'size'
              ? SIZES
              : role === 'variant'
                ? [...PRESENTATION, ...(VARIANT_TONE_WORDS[id] ?? [])]
                : null
        if (allowed) {
          const stray = current.filter((v) => !allowed.includes(v))
          if (stray.length) problems.push(`${id}: ${stray.map((v) => `"${v}"`).join(', ')} is not a ${role}`)
        } else {
          // A kind is a category: it must not borrow a status, a size or a look.
          const borrowed = current.filter((v) => TONES.includes(v) || SIZES.includes(v) || PRESENTATION.includes(v))
          if (borrowed.length) problems.push(`${id}: ${borrowed.map((v) => `"${v}"`).join(', ')} belongs to another prop`)
        }
      }
    }
  }
  return problems
}

describe('tone, variant, kind and size each have one meaning', () => {
  it('flags the drift it is meant to catch', () => {
    const fixture: Manifest = {
      components: [
        {
          exports: [
            { name: 'Panel', kind: 'component', props: [{ name: 'tone', type: '"pale" | "ink"' }] },
            { name: 'Chip', kind: 'component', props: [{ name: 'size', type: '"default" | "comfortable"' }] },
            { name: 'EmptyState', kind: 'component', props: [{ name: 'variant', type: 'Variant', values: ['empty', 'error'] }] },
            { name: 'Odd', kind: 'component', props: [{ name: 'kind', type: '"solid" | "x"' }] },
            { name: 'Old', kind: 'component', props: [{ name: 'tone', type: '"pale"', deprecated: 'Use layer.' }] },
            { name: 'Grid', kind: 'component', props: [{ name: 'pageSize', type: 'number' }] },
          ],
        },
      ],
    }
    expect(vocabularyProblems(fixture)).toEqual([
      'Panel.tone: "pale", "ink" is not a tone',
      'Chip.size: deprecated "default" has no replacement "sm"',
      'Chip.size: deprecated "comfortable" has no replacement "md"',
      'EmptyState.variant: "empty", "error" is not a variant',
      'Odd.kind: "solid" belongs to another prop',
    ])
  })

  it('holds for every component in the manifest', () => {
    expect(vocabularyProblems(manifest)).toEqual([])
  })

  it('every deprecated value is still there to deprecate', () => {
    const props = new Map<string, Prop>(
      manifest.components.flatMap((c) => (c.exports ?? []).flatMap((e) => (e.props ?? []).map((p): [string, Prop] => [`${e.name}.${p.name}`, p]))),
    )
    for (const [id, retired] of Object.entries(DEPRECATED_VALUES)) {
      const prop = props.get(id)
      expect(prop, id).toBeDefined()
      for (const old of Object.keys(retired)) expect(valuesOf(prop!), `${id} "${old}"`).toContain(old)
    }
  })
})
