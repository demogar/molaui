import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { render, screen, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { found } from '../../test/found'
import { toHex } from '../../tokens/color'
import { promisedPairs } from '../../tokens/pairings'
import { resolveColor } from '../../tokens/resolve'
import { ROJO_TOKENS } from '../../tokens/scopes'
import { defaultMessages } from '../../lib/default-messages'
import { USAGE } from '../usage/guidance'
import { WORDS } from './content'
import { CHART_GROUNDS, SERIES, worstOnGrounds } from './dataviz'
import { ICONS } from './icons'
import { checkOverride } from './override'
import { BREAKPOINT_JOBS, BREAKPOINT_USES, scaleRows } from './responsive'
import { TokenTable } from './token-table'
import { decls, densityValue, themeScale, tokenRows } from './tokens-source'

// The unit suite runs with `css: false`, so a `?raw` stylesheet import comes
// back empty here; the blocks read the real files, as Storybook gives them.
vi.mock('../../styles/tokens.css?raw', async () => {
  const fs = await import('node:fs')
  return { default: fs.readFileSync(`${import.meta.dirname}/../../styles/tokens.css`, 'utf8') }
})
vi.mock('../../styles/theme.css?raw', async () => {
  const fs = await import('node:fs')
  return { default: fs.readFileSync(`${import.meta.dirname}/../../styles/theme.css`, 'utf8') }
})

const root = resolve(import.meta.dirname, '../../..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.tsx?$/.test(name) && !/\.(stories|test)\.tsx?$/.test(name) ? [path] : []
  })
}

describe('Tokens page', () => {
  const rows = tokenRows()

  it('has a row for every token in tokens.css, in order, with a section', () => {
    expect(rows.map((r) => r.name)).toEqual([...decls.keys()])
    for (const row of rows) expect(row.group, row.name).not.toBe('')
  })

  it('resolves colours per theme through the contract resolver', () => {
    const cloth = rows.find((r) => r.name === '--cloth')!
    const hex = (theme: 'light' | 'dark') => toHex(resolveColor(decls.get('--cloth')!, theme, decls)!)
    expect(cloth).toMatchObject({ isColor: true, light: hex('light'), dark: hex('dark'), group: 'cloth' })
    expect(cloth.light).not.toBe(cloth.dark)
    const motion = rows.find((r) => r.name === '--motion-base')!
    expect(motion).toMatchObject({ isColor: false, light: '220ms', dark: '220ms' })
  })

  it('is a labelled search over a real table, and copying is announced politely', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    // After setup: user-event installs its own clipboard stub.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<TokenTable />)

    const table = screen.getByRole('table', { name: /design tokens/i })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(`${rows.length} tokens.`)

    await user.type(screen.getByRole('searchbox', { name: 'Filter tokens' }), 'motion')
    const shown = within(table).getAllByRole('rowheader').map((cell) => cell.textContent)
    expect(shown).toEqual(['--motion-cut', '--motion-base', '--motion-slow'])
    expect(status).toHaveTextContent(/3 of \d+ tokens match “motion”/)

    await user.click(screen.getByRole('button', { name: 'Copy var(--motion-base)' }))
    expect(writeText).toHaveBeenCalledWith('var(--motion-base)')
    expect(status).toHaveTextContent('Copied var(--motion-base).')
  })

  it('says so when nothing matches', async () => {
    const user = userEvent.setup()
    render(<TokenTable />)
    await user.type(screen.getByRole('searchbox', { name: 'Filter tokens' }), 'zzz')
    expect(screen.getByText(/No token matches “zzz”/)).toBeInTheDocument()
  })
})

describe('Spacing page', () => {
  it('reads each density from tokens.css, falling back to the base value', () => {
    expect(densityValue('--spacing', 'compact')).toBe('0.21875rem')
    expect(densityValue('--spacing', 'comfortable')).toBe('0.25rem')
    expect(densityValue('--control-h', 'comfortable')).toBe('36px')
    expect(densityValue('--row-h', 'spacious')).toBe('52px')
    expect(densityValue('--text-base', 'comfortable')).toBe('14px')
    expect(densityValue('--text-2xs', 'spacious')).toBe('11px')
  })
})

describe('Theming page', () => {
  const mdx = readFileSync(join(root, 'src/docs/foundations/theming.mdx'), 'utf8')
  const examples = found(
    [...mdx.matchAll(/<OverrideCheck[^>]*>\s*```css\n([\s\S]*?)```\s*<\/OverrideCheck>/g)].map((m) => m[1]!),
    2,
    'override examples on the Theming page',
  )

  it('measures the worked example and finds every pairing it reaches holding', () => {
    const result = checkOverride(examples[0]!, decls)
    expect(result.changed).toEqual(expect.arrayContaining(['--accent', '--accent-soft']))
    // --selected is not in the override; it moves because it is var(--accent-soft).
    expect(result.affected).toContain('--selected')
    expect(result.rows.some((r) => r.bg === '--selected')).toBe(true)
    expect(result.failing.map((r) => `${r.fg} on ${r.bg} (${r.theme}) = ${r.ratio.toFixed(2)}`)).toEqual([])
  })

  it('shows a "don\'t" that really fails', () => {
    const donts = examples.filter((css) => css.startsWith("/* Don't"))
    expect(donts.length).toBeGreaterThan(0)
    for (const css of donts) expect(checkOverride(css, decls).failing.length, css).toBeGreaterThan(0)
  })

  it('writes every example on :root and [data-theme], with both themes per colour', () => {
    for (const css of examples) {
      expect(css).toMatch(/:root,\s*\[data-theme\]\s*\{/)
      for (const m of css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{3,6})/gi)) throw new Error(`${m[1]} is one colour for both themes: ${m[2]}`)
    }
  })

  it('refuses a name that is not a token', () => {
    expect(() => checkOverride(':root, [data-theme] { --brand: red; }', decls)).toThrow(/Not a Mola token: --brand/)
  })
})

describe('Responsive page', () => {
  const breakpoints = scaleRows(themeScale, 'breakpoint')

  it('reads every breakpoint from theme.css, in rem, smallest first', () => {
    expect(found(breakpoints, 6, 'breakpoints in theme.css').map((b) => b.name)).toEqual(['sm', 'md', 'nav', 'lg', 'xl', '2xl'])
    for (const b of breakpoints) expect(b.value, b.name).toMatch(/rem$/)
  })

  it('says what each breakpoint is for', () => {
    expect(Object.keys(BREAKPOINT_JOBS).sort()).toEqual(breakpoints.map((b) => b.name).sort())
  })

  it('names exactly the components that use each breakpoint', () => {
    const uses: Record<string, string[]> = Object.fromEntries(breakpoints.map((b) => [b.name, []]))
    const files = found(walk(join(root, 'src/components')), 100, 'component sources').filter((f) => !f.includes('_story-data'))
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const b of breakpoints) {
        // A class prefix, not a cva key: `sm:flex-row` but not `sm: 'h-7'`.
        if (new RegExp(`["'\`\\s](?:max-)?${b.name}:[a-z[(-]`).test(text)) uses[b.name]!.push(relative(join(root, 'src/components'), file))
      }
    }
    for (const list of Object.values(uses)) list.sort()
    expect(uses).toEqual(Object.fromEntries(Object.entries(BREAKPOINT_USES).map(([k, v]) => [k, [...v].sort()])))
  })
})

describe('Data visualisation page', () => {
  const promised = promisedPairs()

  it('offers only series the contrast contract promises at 3:1 on every chart ground, in both themes', () => {
    const unmeasured = SERIES.flatMap((s) =>
      CHART_GROUNDS.filter((g) => !promised.some(([fg, bg, min, themes]) => fg === s.token && bg === g && min >= 3 && !themes)).map(
        (g) => `${s.token} on ${g}`,
      ),
    )
    expect(unmeasured).toEqual([])
    for (const s of SERIES) for (const theme of ['light', 'dark'] as const) expect(worstOnGrounds(s.token, theme, decls)).toBeGreaterThanOrEqual(3)
  })

  it('never offers rojo or the danger role as a series (ADR 0008)', () => {
    const tokens: string[] = SERIES.map((s) => s.token)
    expect(tokens.filter((t) => ROJO_TOKENS.includes(t) || t.startsWith('--danger'))).toEqual([])
  })
})

describe('Iconography page', () => {
  it('lists exactly the Lucide icons the shipped components import', () => {
    const imported = new Set<string>()
    for (const file of found(walk(join(root, 'src/components')), 100, 'component sources')) {
      if (file.includes('_story-data')) continue
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/import \{([^}]+)\} from 'lucide-react'/g)) {
        for (const name of m[1]!.split(',')) {
          const clean = name.replace(/\btype\b/, '').trim()
          if (clean && !clean.endsWith('Icon') && clean !== 'LucideProps') imported.add(clean)
        }
      }
    }
    expect(ICONS.map((i) => i.name).sort()).toEqual([...imported].sort())
  })
})

describe('Content page word list', () => {
  // The key is the place a translation changes the word, so it must exist
  // and must hold the word the row is about (its first word, any case:
  // "Retry from step {n}" for Retry, the actions record for Approve).
  it('names a messages key that holds each word', () => {
    const wrong = WORDS.flatMap((g) =>
      g.words.flatMap((w) =>
        w.where
          .filter((p) => p.key)
          .filter((p) => {
            const value = p.key!.split('.').reduce<unknown>((at, k) => (at as Record<string, unknown> | undefined)?.[k], defaultMessages)
            const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
            return !text.toLowerCase().includes(w.say.split(/[ ,]/)[0]!.toLowerCase())
          })
          .map((p) => `${w.say} → messages.${p.key}`),
      ),
    )
    expect(wrong).toEqual([])
  })

  it('points every word at a documented component', () => {
    const missing = WORDS.flatMap((g) => g.words.flatMap((w) => w.where.filter((p) => !USAGE[p.title]).map((p) => `${w.say} → ${p.title}`)))
    expect(missing).toEqual([])
  })
})
