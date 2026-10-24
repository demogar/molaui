// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { extendTailwindMerge } from 'tailwind-merge'
import { __unstable__loadDesignSystem } from 'tailwindcss'
import { beforeAll, describe, expect, it } from 'vitest'

import { found } from '../test/found'
import { merge } from './merge'

/**
 * merge.ts restates tailwind-merge's decisions as data so the library can
 * stop shipping tailwind-merge. This file is what makes that safe: it keeps
 * tailwind-merge as a dev dependency, configured exactly as `cn()` configured
 * it before, and asks both the same questions.
 *
 * Pairs are enough. Both run the same loop (right to left, a class is dropped
 * when a kept class to its right already claimed its group or a group that
 * covers it), so if they agree on whether `b` drops `a` for every pair, they
 * agree on every list.
 *
 * merge.ts knows fewer families than tailwind-merge on purpose (the comment at
 * its top says why). A class it leaves alone is held to a different rule:
 * tailwind-merge must not relate it to any class merge.ts knows either, or
 * leaving it alone would change an answer. And every utility the source writes
 * must be known.
 *
 * The pairs come from two places:
 *   - every utility the components, patterns, stories, docs and Storybook files
 *     write, variants included, as Tailwind's own compiler recognises them;
 *   - every utility Tailwind compiles under Mola's theme, one per shape, plus
 *     the arbitrary and variable forms its class list does not enumerate.
 */

const root = resolve(import.meta.dirname, '../..')
const styles = resolve(root, 'src/styles')
const theme = readFileSync(resolve(styles, 'theme.css'), 'utf8')
const COLORS = [...theme.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]!)

/** The edge slots of cloth.css, one group per side; an edge and a shadow replace each other. */
const EDGES = {
  'edge-focus': ['focus-ring', 'focus-ring-inset'],
  'edge-ring': [{ cut: [...COLORS, 'current', 'thin', 'press', 'tab', 'gap', 'frame'] }, 'rule-ring', 'keycap'],
  'edge-s': [{ 'bar-start': COLORS }, 'rule-s', 'rule-s-soft', 'cut-s'],
  'edge-e': ['rule-e', 'rule-e-soft', 'cut-e'],
  'edge-t': ['rule-t', 'rule-t-soft', 'cut-t'],
  'edge-b': [{ 'bar-bottom': COLORS }, 'rule-b', 'rule-b-soft', 'cut-b'],
}
const EDGE_IDS = Object.keys(EDGES) as (keyof typeof EDGES)[]

/** `cn()` as tailwind-merge would configure it: before merge.ts, plus Mola's own utilities. */
const reference = extendTailwindMerge<keyof typeof EDGES | 'band' | 'panel' | 'relleno' | 'diente' | 'wdth' | 'register' | 'forced-role'>({
  extend: {
    classGroups: {
      'font-size': [{ text: ['2xs', '5xl'] }],
      'text-color': [{ text: COLORS }],
      'bg-color': [{ bg: COLORS }],
      'border-color': [{ border: COLORS }],
      'ring-color': [{ ring: COLORS }],
      'outline-color': [{ outline: COLORS }],
      fill: [{ fill: COLORS }],
      stroke: [{ stroke: COLORS }],
      'font-family': [{ font: ['display', 'ui', 'text', 'mono'] }, 'literal'],
      'fvn-spacing': ['tabular'],
      leading: [{ leading: ['reading', 'body', 'snug', 'heading', 'tight'] }],
      tracking: [{ tracking: ['display', 'heading', 'label', 'figures', 'normal'] }],
      shadow: [{ shadow: ['cut', 'raised', 'floating', 'overlay'] }, 'cut', 'cut-band', 'cut-band-focus', 'cut-inner'],
      ease: [{ ease: ['cut'] }],
      'max-w': [{ 'max-w': ['page', 'wide', 'reading'] }],
      ...EDGES,
      band: [{ band: ['oro', 'rojo', 'anil', 'verde', 'ink', 'cloth', 'accent', 'danger', 'ink-accent'] }],
      panel: ['on-ink', 'on-layer'],
      relleno: ['relleno', 'relleno-field', 'relleno-working'],
      diente: ['diente', 'diente-up'],
      wdth: ['wdth-display', 'wdth-label'],
      register: ['rotulo', 'etiqueta'],
      'forced-role': ['forced-ink', 'forced-selected', 'forced-on-selected'],
    },
    conflictingClassGroups: {
      shadow: EDGE_IDS,
      ...Object.fromEntries(EDGE_IDS.map((id) => [id, ['shadow' as const]])),
    },
  },
})

/** The forms Tailwind's class list leaves out: arbitrary values, variables, modifiers, variants. */
const FORMS = [
  'p-[3px]', 'p-(--x)', '-mt-2', '-inset-x-2', '!p-2', 'p-2!', 'hover:!p-3',
  'text-[11px]', 'text-(--x)', 'text-(length:--x)', 'text-[var(--x)]', 'text-[color:var(--x)]',
  'text-sm/6', 'text-base/7', 'text-[clamp(1px,2vw,3px)]/[1.2]', 'bg-rojo/50', 'w-1/2', 'basis-1/2',
  'bg-[url(a.png)]', 'bg-(image:--x)', 'bg-[length:2px]', 'bg-[position:top]', 'bg-size-[2px]', 'bg-position-[2px]',
  'shadow-[0_0_0_1px_var(--ink)]', 'shadow-[inset_0_1px_0_var(--ink)]', 'shadow-[var(--x)]', 'shadow-(--x)', 'shadow-(shadow:--x)',
  'inset-shadow-[inset_0_1px_var(--ink)]', 'drop-shadow-[0_1px_var(--ink)]', 'text-shadow-[0_1px_var(--ink)]',
  'font-[600]', 'font-(--x)', 'font-[family-name:x]', 'font-(family-name:--x)', 'font-stretch-50%', 'font-features-["x"]',
  'border-[3px]', 'border-(--x)', 'border-[var(--ink)]', 'border-x-[3px]', 'border-t-(--x)',
  'ring-[2px]', 'ring-(--x)', 'ring-offset-2', 'outline-[2px]', 'outline-(--x)', 'stroke-[2]', 'stroke-(--x)', 'stroke-(length:--x)',
  'decoration-(--x)', 'decoration-[3px]', 'from-[10%]', 'from-(--x)', 'from-(length:--x)',
  '@container', '@container/main', '@container-size', '@container-normal/x', '[mask-type:alpha]', '[color:var(--ink)]',
  'z-[1]', 'grid-cols-[1fr_auto]', 'leading-[1.5]', 'tracking-[0.1em]', 'opacity-[0.5]', 'blur-[2px]',
  'col-span-2', 'col-span-full', 'row-span-[2]', 'col-[1/3]', 'translate-x-1/2', '-translate-y-full',
  'size-[18px]', 'max-w-screen-md', 'aspect-[4/3]', 'line-clamp-[3]', 'animate-[x_1s]', 'ease-[cubic-bezier(0,0,1,1)]',
  'duration-[1s]', 'delay-(--x)', 'content-[""]', 'list-[square]', 'align-[-2px]', 'object-[50%_50%]',
  'origin-[10%]', 'cursor-[url(x)]', 'will-change-[top]', 'bg-linear-to-r', 'bg-linear-45', 'bg-radial', 'bg-conic-90',
  'bg-blend-multiply', 'bg-clip-text', 'mask-linear-50', 'mask-t-from-50%', 'text-shadow-sm',
  'w-xs', 'min-w-xs', 'columns-xs', 'inline-full', 'block-full',
  'hover:p-2', 'focus:hover:p-3', 'hover:focus:p-4', 'md:hover:p-1', 'before:hover:p-1', 'hover:before:p-1',
  '[&>*]:p-1', '[&>*]:hover:p-2', 'hover:[&>*]:p-3', 'group-hover/item:p-2', 'dark:md:text-sm', 'md:dark:text-xs',
  'data-[x]:p-2', 'cut', 'relleno', 'rotulo', 'etiqueta', 'forced-ink', 'not-a-utility',
  'cut-band', 'cut-ink', 'cut-t', 'rule-b', 'bar-start-danger', 'bar-bottom-accent', 'focus-ring', 'band-accent', 'on-layer', 'wdth-label', 'tabular',
]

let compiled: (candidates: string[]) => (string | null)[]
let classList: string[]

beforeAll(async () => {
  const ds = await __unstable__loadDesignSystem(`@import 'tailwindcss';\n@import './mola.css';`, {
    base: styles,
    async loadStylesheet(id: string, base: string) {
      const path = id === 'tailwindcss' ? resolve(root, 'node_modules/tailwindcss/index.css') : resolve(base, id)
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
    },
  })
  compiled = (c) => ds.candidatesToCss(c)
  classList = ds.getClassList().map(([name]) => name)
})

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(tsx?|mdx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

/** Every utility the source writes, variants included. */
function sourceUtilities() {
  const words = new Set<string>()
  for (const file of found([...walk(join(root, 'src')), ...walk(join(root, '.storybook'))], 200, 'sources under src/ and .storybook/')) {
    for (const word of readFileSync(file, 'utf8').match(/[\w\-:/[\]!.&()=,@>*~+%#'"]+/g) ?? []) {
      const trimmed = word.replace(/^['"`]+|['",`]+$/g, '')
      if (trimmed) words.add(trimmed)
    }
  }
  const candidates = [...words]
  const css = compiled(candidates)
  return candidates.filter((_, i) => css[i])
}

/**
 * One class per shape: numbers collapsed, and Mola's colours collapsed, since
 * forty colours behave as one. Pairs grow with the square, and the full class
 * list is ten thousand names.
 */
const COLOR_WORD = new RegExp(`-(${[...COLORS].sort((a, b) => b.length - a.length).join('|')})(?=$|/)`, 'g')
function onePerShape(classes: string[]) {
  const shapes = new Map<string, string>()
  for (const name of classes) {
    const shape = name.replace(/\d+(\.\d+)?/g, '0').replace(COLOR_WORD, '-C')
    if (!shapes.has(shape)) shapes.set(shape, name)
  }
  return [...shapes.values()]
}

/** A utility to tailwind-merge (it drops a duplicate) that merge.ts leaves alone. */
const leftAlone = (c: string) => reference(`${c} ${c}`) === c && merge(`${c} ${c}`) !== c

/** Every pair, both orders, where the two disagree, or where leaving a class alone changes an answer. */
function disagreements(classes: string[]) {
  const found: string[] = []
  const alone = new Set(classes.filter(leftAlone))
  for (const c of classes) {
    if (merge(`${c} ${c}`) === c && reference(`${c} ${c}`) !== c) found.push(`"${c}": merge.ts claims a class tailwind-merge does not`)
  }
  for (const a of classes) {
    for (const b of classes) {
      if (a === b || (alone.has(a) && alone.has(b))) continue
      const list = `${a} ${b}`
      const ours = merge(list)
      const theirs = reference(list)
      if (alone.has(a) || alone.has(b)) {
        if (theirs !== list) found.push(`"${list}": tailwind-merge gives "${theirs}", but merge.ts leaves ${alone.has(a) ? a : b} alone`)
      } else if (ours !== theirs) found.push(`"${list}": merge gives "${ours}", tailwind-merge "${theirs}"`)
    }
  }
  return found
}

describe('merge agrees with tailwind-merge', () => {
  it('knows every utility the source writes', () => {
    const utilities = sourceUtilities()
    // Some eleven hundred today: a tokenizer that matched nothing would pass.
    expect(utilities.length).toBeGreaterThan(800)
    expect(utilities.filter(leftAlone)).toEqual([])
  }, 60_000)

  it('on every pair of utilities the source writes', () => {
    expect(disagreements(onePerShape(sourceUtilities())).slice(0, 20)).toEqual([])
  }, 60_000)

  it('on every family Tailwind compiles under Mola’s theme, and the forms it does not list', () => {
    const classes = [...onePerShape(classList), ...FORMS]
    expect(classes.length).toBeGreaterThan(1000)
    expect(disagreements(classes).slice(0, 20)).toEqual([])
  }, 60_000)
})

describe('merge', () => {
  it('keeps what is not a utility, in place', () => {
    expect(merge('display-cut p-2 group p-4 display-cut')).toBe('display-cut group p-4 display-cut')
  })

  it('scopes a group by its variants, in any order, and by !', () => {
    expect(merge('hover:md:p-2 md:hover:p-4')).toBe('md:hover:p-4')
    expect(merge('hover:p-2 p-4')).toBe('hover:p-2 p-4')
    expect(merge('!p-2 p-4')).toBe('!p-2 p-4')
  })

  it('lets a shorthand clear its sides, but not the reverse', () => {
    expect(merge('px-2 py-1 p-3')).toBe('p-3')
    expect(merge('p-3 px-2')).toBe('p-3 px-2')
  })

  it('leaves a family no component writes alone, rather than guess', () => {
    expect(merge('mask-t-from-10% mask-t-from-20%')).toBe('mask-t-from-10% mask-t-from-20%')
    expect(merge('text-shadow-sm text-ink')).toBe('text-shadow-sm text-ink')
  })

  it('returns the empty string for nothing', () => {
    expect(merge('')).toBe('')
    expect(merge('   ')).toBe('')
  })
})
