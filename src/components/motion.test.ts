import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { LAYOUT, LAYOUT_TRANSITIONS_ALLOWED } from '../../scripts/runtime-scan.mjs'
import { found } from '../test/found'

/**
 * Motion in this system says what changed (Foundations/Motion); it does not
 * move the layout. A transition or keyframe on a layout property (width,
 * height, the insets, margin, padding, or `all`, which reaches them) lays the
 * page out again on every frame. The app shell's rail eased `width`, kept on
 * purpose and exempted in the browser audit, and every frame of its collapse
 * reflowed the data table beside it; it snaps now.
 *
 * The browser audit (scripts/runtime-scan.mjs) reads computed transitions,
 * but only on the stories it visits and only in CI's browser job. This holds
 * the source, everywhere, in the unit tests. Both read one list of exemptions,
 * LAYOUT_TRANSITIONS_ALLOWED in runtime-scan.mjs, each with its reason.
 */
const root = resolve(import.meta.dirname, '..')
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    // Tests are left out: they quote the very classes they fail.
    return /\.(tsx?|css|mdx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}
const files = found(walk(root), 300, 'sources and stylesheets under src/')

/** Words a transition shorthand can hold that are not a property name. */
const NOT_A_PROPERTY = new Set([
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'linear',
  'step-start',
  'step-end',
  'normal',
  'allow-discrete',
  'initial',
  'inherit',
  'unset',
  'none',
])

/** Splits on `sep` outside parentheses, so `var(--a, 1px)` stays whole. */
function splitTop(value: string, sep: RegExp): string[] {
  const parts: string[] = []
  let depth = 0
  let part = ''
  for (const ch of value) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (depth === 0 && sep.test(ch)) {
      parts.push(part)
      part = ''
    } else part += ch
  }
  parts.push(part)
  return parts.map((p) => p.trim()).filter(Boolean)
}

/** The properties a `transition` or `transition-property` value names. */
function transitioned(value: string): string[] {
  return splitTop(value, /,/).flatMap((item) => {
    const name = splitTop(item, /\s/).find((t) => /^-?[a-z][a-z-]*$/.test(t) && !NOT_A_PROPERTY.has(t))
    return name ? [name] : []
  })
}

/** The properties each `@keyframes` block sets. */
function keyframed(text: string): string[] {
  const props: string[] = []
  for (const match of text.matchAll(/@keyframes\s+[\w-]+\s*\{/g)) {
    let depth = 1
    let i = match.index + match[0].length
    const start = i
    for (; i < text.length && depth > 0; i++) {
      if (text[i] === '{') depth++
      if (text[i] === '}') depth--
    }
    for (const decl of text.slice(start, i).matchAll(/([a-z-]+)\s*:/g)) props.push(decl[1]!)
  }
  return props
}

/** Every layout property a source file transitions or animates. */
function layoutMotion(source: string): string[] {
  // Comments explain what was removed and why; only code counts.
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
  const props: string[] = []
  if (/(?<![\w-])transition-all(?![\w-])/.test(text)) props.push('all')
  // Tailwind's arbitrary value: transition-[width], transition-[opacity,height].
  for (const m of text.matchAll(/(?<![\w-])transition-\[([^\]]+)\]/g)) props.push(...transitioned(m[1]!.replace(/_/g, ' ')))
  // Tailwind's arbitrary property, CSS, and a style object (camelCase key).
  for (const m of text.matchAll(/\btransition(?:-property|Property)?\s*:\s*([^;{}\]\n]+)/g)) {
    props.push(...transitioned(m[1]!.replace(/_/g, ' ').replace(/['"`]/g, ' ')))
  }
  props.push(...keyframed(text))
  return [...new Set(props.filter((p) => LAYOUT.test(p)))]
}

const motion = new Map(files.map((f) => [relative(root, f), layoutMotion(readFileSync(f, 'utf8'))]))

describe('layout is not animated', () => {
  it('reads the transitions it is meant to read', () => {
    // The parser itself, on the shapes the source uses, so a regex that stops
    // matching cannot pass the gate below by finding nothing.
    expect(layoutMotion("'w-60 transition-[width] duration-(--motion-base)'")).toEqual(['width'])
    expect(layoutMotion("'transition-all'")).toEqual(['all'])
    expect(layoutMotion("'[transition:transform_var(--motion-slow)_var(--ease-cut),height_var(--motion-cut)]'")).toEqual([
      'height',
    ])
    expect(layoutMotion('.x { transition: inset-inline-start 200ms ease; }')).toEqual(['inset-inline-start'])
    expect(layoutMotion("style={{ transitionProperty: 'margin-top' }}")).toEqual(['margin-top'])
    expect(layoutMotion('@keyframes grow { from { width: 0; } to { width: 10px; } }')).toEqual(['width'])
    expect(layoutMotion("'transition-[translate,scale] transition-colors'")).toEqual([])
    expect(layoutMotion('// was transition-[width]\n')).toEqual([])
  })

  it('no source transitions or animates a layout property outside the reasoned exemptions', () => {
    const findings = [...motion].flatMap(([file, props]) =>
      props
        .filter((p) => !LAYOUT_TRANSITIONS_ALLOWED.some((a) => a.property === p && a.files.includes(file)))
        .map((p) => `${file}: ${p} (snap it, or move it to translate, scale or opacity)`),
    )
    expect(findings).toEqual([])
  })

  it('every exemption is still needed by each file it names', () => {
    const stale = LAYOUT_TRANSITIONS_ALLOWED.flatMap((a) =>
      a.files.filter((f) => !motion.get(f)?.includes(a.property)).map((f) => `${f}: ${a.property}`),
    )
    expect(stale).toEqual([])
  })
})
