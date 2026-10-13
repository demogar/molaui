import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { toHex } from '../../tokens/color'
import { resolveColor } from '../../tokens/resolve'
import { USAGE } from '../usage/guidance'
import { WORDS } from './content'
import { ICONS } from './icons'
import { TokenTable } from './token-table'
import { decls, densityValue, tokenRows } from './tokens-source'

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

describe('Iconography page', () => {
  it('lists exactly the Lucide icons the shipped components import', () => {
    const imported = new Set<string>()
    for (const file of walk(join(root, 'src/components'))) {
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
  it('points every word at a documented component', () => {
    const missing = WORDS.flatMap((g) => g.words.flatMap((w) => w.where.filter((p) => !USAGE[p.title]).map((p) => `${w.say} → ${p.title}`)))
    expect(missing).toEqual([])
  })
})
