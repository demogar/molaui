// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import { beforeAll, describe, expect, it } from 'vitest'

import { found } from '../test/found'

/**
 * The Tailwind bridge (theme.css), held to what it compiles to rather than to
 * what it says. Two of the bugs this file exists for read correctly in the
 * source and were wrong only in the output: `--container-prose` was declared
 * and `max-w-prose` still emitted Tailwind's static 65ch, and `nav:` at 920px
 * was emitted before `sm:` at 40rem because Tailwind cannot sort mixed units.
 *
 * So it compiles the real stylesheet with Tailwind's own compiler, as the
 * library build and a consumer's build do (`@import 'tailwindcss'` then
 * mola.css, which is what `tailwind.css` ships), and asks it. Parsing
 * dist/mola-ui.css was the first idea, but dist only holds the utilities the
 * components already use: an open namespace (`bg-red-500`) cannot show up
 * there until someone uses it, which is the moment it is too late.
 */

const root = resolve(import.meta.dirname, '../..')
const styles = resolve(root, 'src/styles')

async function loadStylesheet(id: string, base: string) {
  const path = id === 'tailwindcss' ? resolve(root, 'node_modules/tailwindcss/index.css') : resolve(base, id)
  return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
}

/** What a consumer running their own Tailwind writes, per mola.css. */
const CONSUMER = `@import 'tailwindcss';\n@import './mola.css';`

let toCss: (candidates: string[]) => (string | null)[]
let build: (candidates: string[]) => string

beforeAll(async () => {
  const ds = await __unstable__loadDesignSystem(CONSUMER, { base: styles, loadStylesheet })
  toCss = (c) => ds.candidatesToCss(c)
  const compiler = await compile(CONSUMER, { base: styles, loadStylesheet })
  build = (c) => compiler.build(c)
})

const px = (length: string) => {
  const m = /^([\d.]+)(px|rem)$/.exec(length.trim())
  if (!m) throw new Error(`Not a px or rem length: ${length}`)
  return Number(m[1]) * (m[2] === 'rem' ? 16 : 1)
}

describe('the bridge is closed', () => {
  /** One of each Tailwind default that Mola has its own answer for. */
  const DEFAULTS = [
    'bg-red-500', 'text-blue-600', 'border-gray-200', 'bg-white', 'text-black', 'fill-slate-900',
    'rounded-3xl', 'rounded-4xl',
    'shadow-sm', 'shadow-lg', 'inset-shadow-sm', 'drop-shadow-md', 'text-shadow-sm', 'blur-sm',
    'ease-in', 'ease-out', 'ease-in-out',
    'animate-spin', 'animate-pulse', 'animate-bounce',
    'leading-relaxed', 'leading-loose', 'tracking-wide', 'tracking-tight',
    'max-w-6xl', 'max-w-7xl', 'max-w-3xs', '@6xl:flex',
    'font-sans', 'font-serif',
    'perspective-near', 'aspect-video',
  ]

  it.each(DEFAULTS)('%s compiles to nothing', (candidate) => {
    expect(toCss([candidate])[0]).toBeNull()
  })

  it('still compiles every Mola name', () => {
    const MOLA = [
      'bg-cloth', 'text-ink', 'shadow-cut', 'shadow-floating', 'rounded-md', 'ease-cut', 'animate-mola-pulse',
      'font-ui', 'font-text', 'font-mono', 'leading-body', 'tracking-label', 'tracking-normal',
      'max-w-page', 'max-w-wide', 'max-w-reading', 'max-w-sm', 'max-w-5xl', '@3xl:hidden', 'nav:flex',
    ]
    const missing = MOLA.filter((c, i) => toCss(MOLA)[i] === null)
    expect(missing).toEqual([])
  })

  it('routes the reading measure through its token, not a static Tailwind literal', () => {
    const [css] = toCss(['max-w-reading'])
    expect(css).toContain('max-width: var(--container-reading)')
    expect(build(['max-w-reading'])).toMatch(/--container-reading:\s*65ch/)
  })

  it('sorts the viewport breakpoints by width, nav included', () => {
    const css = build(['sm:flex', 'md:flex', 'nav:flex', 'lg:flex', 'xl:flex', '2xl:flex'])
    const widths = [...css.matchAll(/@media \(width >= ([^)]+)\)/g)].map((m) => m[1]!)
    expect(widths).toHaveLength(6)
    expect(widths.every((w) => w.endsWith('rem'))).toBe(true)
    const sorted = [...widths].sort((a, b) => px(a) - px(b))
    expect(widths).toEqual(sorted)
  })

  it('runs a bare transition on Mola’s motion, not Tailwind’s 150ms ease-in-out', () => {
    const css = build(['transition-colors'])
    expect(css).toMatch(/--default-transition-duration:\s*var\(--motion-cut\)/)
    expect(css).toMatch(/--default-transition-timing-function:\s*var\(--ease-cut\)/)
  })
})

describe('every utility the code writes has a Mola token behind it', () => {
  /**
   * Closing a namespace makes a default utility compile to nothing, which is
   * silent: `max-w-md` would simply stop constraining a dialog. So every
   * class in the families the bridge closes must still compile, and must
   * compile to a token (`var(--…)`) rather than to a literal Tailwind
   * invented. A literal is allowed only for the keywords below, which are
   * not scale steps. That second rule is what catches `max-w-prose`: it is a
   * static Tailwind utility, so no namespace reset can remove it.
   *
   * Read: components, patterns, their stories, the docs blocks and pages, and
   * Storybook's own files. In MDX, code (fenced and inline) is dropped: a
   * page may name a utility in order to forbid it.
   */
  const FAMILY =
    /^-?(max-w|leading|tracking|rounded(?:-[a-z]{1,2})?|shadow|inset-shadow|drop-shadow|text-shadow|blur|ease|animate|font|aspect|perspective)-|^(bg|text|border(?:-[a-z]{1,2})?|ring|outline|fill|stroke|decoration|divide|accent|caret|from|via|to|placeholder)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|white|black)(-\d+)?$/
  const KEYWORDS = new Set([
    'max-w-none', 'max-w-0', 'max-w-px', 'max-w-full', 'max-w-min', 'max-w-max', 'max-w-fit', 'max-w-screen',
    'leading-none', 'ease-linear', 'ease-initial', 'animate-none', 'shadow-none', 'blur-none',
    'rounded-none', 'rounded-full', 'aspect-auto', 'aspect-square', 'font-normal', 'font-medium', 'font-semibold', 'font-bold',
  ])

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return walk(path)
      return /\.(tsx?|mdx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
    })
  }
  const files = found(
    [
      ...walk(join(root, 'src/components')),
      ...walk(join(root, 'src/patterns')),
      ...walk(join(root, 'src/docs')),
      ...walk(join(root, '.storybook')),
    ],
    150,
    'component, pattern, docs and Storybook sources',
  )
  const text = (file: string) => {
    const raw = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
    return file.endsWith('.mdx') ? raw.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '') : raw
  }

  it('reads the source', () => {
    expect(files.length).toBeGreaterThan(150)
  })

  it('finds no utility the closed namespaces would silently drop, or a literal Tailwind invented', () => {
    const found = new Map<string, string>()
    for (const file of files) {
      for (const word of text(file).match(/[\w\-:/[\]!.&()=,@>*~+%]+/g) ?? []) {
        const utility = word.split(':').at(-1)!.replace(/^!/, '').replace(/\/[\d.]+$/, '')
        if (utility.includes('[') || utility.includes('(')) continue // arbitrary: the value is written in place
        if (!FAMILY.test(utility)) continue
        if (!found.has(word)) found.set(word, relative(root, file))
      }
    }
    const words = [...found.keys()]
    const css = toCss(words)
    const problems = words.flatMap((word, i) => {
      const utility = word.split(':').at(-1)!.replace(/^!/, '').replace(/\/[\d.]+$/, '')
      const out = css[i]
      if (out === null || out === undefined) return [`${found.get(word)}: ${word} compiles to nothing`]
      if (KEYWORDS.has(utility.replace(/^-/, ''))) return []
      if (!out.includes('var(--')) return [`${found.get(word)}: ${word} is a Tailwind literal with no token behind it`]
      return []
    })
    // Some sixty distinct shadow-cut, font-ui and max-w-* classes: a tokenizer that matched nothing would pass.
    expect(words.length).toBeGreaterThan(40)
    expect(problems).toEqual([])
  })
})
