import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from '../test/found'

/**
 * The two text registers (docs/adr/0017-the-name-register.md), held where the
 * classes are written. `rotulo` names a category; it never carries a word a
 * person acts on or reads as content. Everything else that used to wear it
 * (buttons, badges, column heads, form labels, stat names) is `etiqueta`.
 *
 * The rótulo was the default for so long that it comes back by habit, so the
 * places allowed to use it are listed here, each with the category it names.
 * A new use needs a line and a reason; a listed file that stops using it
 * fails too, so the list cannot go stale.
 */
const src = resolve(import.meta.dirname, '..')
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '_story-data' ? [] : walk(path)
    return /\.tsx?$/.test(name) && !/\.(stories|test|test-d)\.tsx?$/.test(name) ? [path] : []
  })
}
const files = found(
  [...walk(join(src, 'components')), ...walk(join(src, 'patterns'))].map((f) => relative(src, f)),
  80,
  'component and pattern sources',
)

/** The source with its comments taken out, so a comment that names a register is not a use of it. */
function code(file: string): string {
  return readFileSync(join(src, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/data-slot="rotulo"/g, '')
}

/** `rotulo` as a class: after a quote, a space or a variant's colon, and before a quote or a space. */
const ROTULO = /(?<=["'`\s:])rotulo(?=["'`\s])/

const KEEP: Record<string, string> = {
  'components/typography/rotulo.tsx': 'The Rotulo component is the register: the label that says what kind of block follows.',
  'components/typography/prose.tsx': 'A Prose h4 is a run-in heading that names the kind of passage under it.',
  'components/ai/markdown/markdown.tsx': 'The same h4 as Prose, for model output.',
  'components/app-shell/sidebar.tsx': 'A navigation group heading names the group, and is never pressed.',
  'components/app-shell/app-shell.tsx': 'The mobile navigation sheet’s title names the region.',
  'components/menu/menu.tsx': 'Menu group labels name a group of items.',
  'components/select/select.tsx': 'Select group labels name a group of options.',
  'components/combobox/combobox.tsx': 'Combobox group labels name a group of options.',
  'components/command/command.tsx': 'Command palette group headings name a group of commands.',
  'components/shortcuts/shortcuts-dialog.tsx': 'Shortcut group headings name a group of bindings.',
  'components/code/code.tsx': 'A code block’s label and language say what kind of text it holds.',
  'components/ai/agent-run/agent-run.tsx': 'A step’s kind (Reasoning, Tool call) is a category; its status word is etiqueta.',
  'components/ai/tool-call/tool-call.tsx': 'Section names inside a tool call (Arguments, Result, Error).',
  'components/ai/run-error/run-error.tsx': 'The label that says what kind of failure the panel describes.',
  'components/ai/change-review/change-review.tsx': '“Proposed change” names the block under it.',
  'components/ai/side-by-side-diff/side-by-side-diff.tsx': 'Pane labels (Before, After) name each side.',
  'patterns/list-and-detail/list-and-detail.tsx': 'The list’s heading names the collection.',
  'patterns/agent-console/agent-console.tsx': 'The product area beside the wordmark names where you are.',
}

/**
 * Words a person acts on or reads, which must be in the name register. Named
 * one by one because each was the rótulo until ADR 0017, and a rewrite that
 * dropped `etiqueta` for plain text would pass the allow-list above.
 */
const NAMES = [
  'components/button/button.tsx',
  'components/segmented/segmented-control.tsx',
  'components/badge/badge.tsx',
  'components/table/table.tsx',
  'components/table/data-table.tsx',
  'components/stat/stat.tsx',
  'components/field/label.tsx',
  'components/form/fieldset.tsx',
  'components/checkbox/checkbox.tsx',
  'components/radio/radio.tsx',
  'components/chip/chip.tsx',
  'components/slider/slider.tsx',
  'components/description-list/description-list.tsx',
  'components/ai/token-usage/token-usage.tsx',
  'components/ai/message/message.tsx',
  'components/ai/run-status/run-status.tsx',
]

describe('text registers', () => {
  it('uses the rótulo only where it names a category', () => {
    const users = files.filter((f) => ROTULO.test(code(f)))
    expect(users.filter((f) => !(f in KEEP))).toEqual([])
    expect(Object.keys(KEEP).filter((f) => !users.includes(f))).toEqual([])
  })

  it('never sets capitals or label tracking by hand', () => {
    // The register's pieces typed out (`uppercase tracking-label wdth-label`)
    // were how buttons wore the rótulo without saying so.
    const handBuilt = files.filter((f) => /(?<![\w-])(?:uppercase|tracking-label)(?![\w-])/.test(code(f)))
    expect(handBuilt).toEqual([])
  })

  it('sets the words people act on and read in the name register', () => {
    const missing = NAMES.filter((f) => !/(?<=["'`\s:])etiqueta(?=["'`\s])/.test(code(f)))
    expect(missing).toEqual([])
  })
})
