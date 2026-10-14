// @vitest-environment node
import { describe, expect, it } from 'vitest'

import * as library from '../src/index'
import { checkCode, contextFrom, type Finding } from './check'
import { loadData } from './data'

/**
 * Each check with code that breaks the rule and code that does not, and the
 * cases a regex over the raw source gets wrong: class names inside template
 * strings and cn() calls, a rule mentioned in a comment, an apostrophe in JSX
 * text, a TypeScript generic that looks like a tag.
 */
const data = loadData()
const ctx = contextFrom(data)

const check = (code: string, filename?: string) => checkCode(code, ctx, { filename })
const rules = (code: string, filename?: string) => check(code, filename).map((f) => `${f.rule} ${f.severity}`)
const only = (code: string, rule: number, filename?: string) => check(code, filename).filter((f) => f.rule === rule)

describe('check_code context', () => {
  it('reads colours and exports from the manifest', () => {
    expect(ctx.colors).toContain('ink')
    expect(ctx.colors).toContain('cloth-pale')
    expect(ctx.exports.has('Button')).toBe(true)
    expect(ctx.exports.has('cn')).toBe(true)
    expect(ctx.interactive).toContain('IconButton')
    expect(ctx.interactive).not.toContain('AccordionItem')
  })

  it('knows every runtime export of the package, so a real import is never called a guess', () => {
    const unknown = Object.keys(library).filter((name) => !ctx.exports.has(name))
    expect(unknown).toEqual([])
  })
})

describe('rule 1: interactive edges are shadow-cut, never border', () => {
  it('flags a border on a native control, a Mola control and a clickable div', () => {
    expect(rules('<button className="border border-ink px-3">Run</button>')).toEqual(['1 error', '12 warn'])
    expect(only("<Button className={cn('border-2', busy && 'bg-oro')}>Run</Button>", 1)).toHaveLength(1)
    expect(only('<div role="button" tabIndex={0} className="border">x</div>', 1)).toHaveLength(1)
    expect(only('<div onClick={open} className="border-ink border">x</div>', 1).map((f) => f.line)).toEqual([1])
  })

  it('finds it inside a template string and its expressions', () => {
    const code = "<a href=\"/runs\" className={`px-2 ${active ? 'border border-ink' : ''}`}>Runs</a>"
    expect(only(code, 1)).toHaveLength(1)
  })

  it('leaves dividers, resets and forced-colours fallbacks alone', () => {
    expect(check('<hr className="border-keyline" />')).toEqual([])
    expect(check('<div className="border-t border-keyline p-4">x</div>')).toEqual([])
    expect(check('<li className="border-b border-keyline"><Button className="border-0">Open</Button></li>')).toEqual([])
    expect(check('<Button className="shadow-cut forced-colors:border-2">Open</Button>')).toEqual([])
    // A keyline on one side of a row button divides rows; it is not the control's edge.
    expect(only('<button type="button" className="border-b border-keyline text-start">Row</button>', 1)).toEqual([])
  })

  it('does not judge a class string with no element, or a comment', () => {
    expect(check("const panel = cva('border border-keyline', { variants: {} })")).toEqual([])
    expect(check('// A border would reflow the toolbar; a shadow does not.\n<Button>Save</Button>')).toEqual([])
  })
})

describe('rule 2: radius is zero', () => {
  it('flags a radius that renders, and warns on one Mola zeroes', () => {
    expect(rules('<div className="rounded-[6px]" />')).toEqual(['2 error'])
    expect(rules('<div className="rounded-3xl" />')).toEqual(['2 error'])
    expect(rules('<div className="rounded-t-[4px]" />')).toEqual(['2 error'])
    expect(rules('<div className="rounded-t-lg" />')).toEqual(['2 warn'])
    expect(rules('<div className="rounded-md" />')).toEqual(['2 warn'])
    expect(rules('<div style={{ borderRadius: 8 }} />')).toEqual(['2 error'])
  })

  it('allows a dot, and warns on a round control', () => {
    expect(check('<span className="size-2 rounded-full bg-success" aria-hidden />')).toEqual([])
    expect(check('<Avatar className="rounded-full" name="Ana" />')).toEqual([])
    expect(check('<div className="rounded-none" />')).toEqual([])
    expect(rules('<IconButton className="rounded-full" label="Close" />')).toEqual(['2 warn'])
  })
})

describe('rule 4: disabled is stated, not faded', () => {
  it('flags opacity under a disabled variant, and on a disabled element', () => {
    expect(rules("const c = cn('shadow-cut', 'disabled:opacity-50')")).toEqual(['4 error'])
    expect(rules('<Button className="data-disabled:opacity-60">Save</Button>')).toEqual(['4 error'])
    expect(rules('<Button disabled className="opacity-50">Save</Button>')).toEqual(['4 error'])
  })

  it('allows opacity that is not a fade, or not on a disabled control', () => {
    expect(check('<Button disabled className="opacity-100">Save</Button>')).toEqual([])
    expect(check('<Button disabled={false} className="opacity-50">Save</Button>')).toEqual([])
    expect(check('<span className="opacity-0 group-hover:opacity-100">x</span>')).toEqual([])
  })
})

describe('rule 5: colours come from tokens', () => {
  it('flags literals in classes, styles, SVG attributes and constants', () => {
    expect(rules('<div className="bg-[#ff0000]" />')).toEqual(['5 error'])
    expect(rules('<p className="text-[rgb(0,0,0)]" />')).toEqual(['5 error'])
    expect(rules("<p style={{ color: '#333' }} />")).toEqual(['5 error'])
    expect(rules('<path fill="#fff" />')).toEqual(['5 error'])
    expect(rules("const BRAND = { accent: 'oklch(0.7 0.1 30)' }")).toEqual(['5 error'])
    expect(rules("<div style={{ boxShadow: '0 0 0 1px #000' }} />")).toEqual(['5 error'])
  })

  it('flags Tailwind’s palette as an error and an unknown colour name as a warning', () => {
    expect(rules('<div className="bg-blue-500 text-white" />')).toEqual(['5 error', '5 error'])
    const [primary] = only('<div className="bg-primary text-ink" />', 5)
    expect(primary).toMatchObject({ severity: 'warn' })
    expect(only('<p className="text-ink-mute" />', 5)[0]?.fix).toContain('`text-ink-muted`')
  })

  it('allows tokens, keywords, sizes, var() and anchors that look like hex', () => {
    expect(check('<div className="bg-cloth-pale text-ink-2 text-sm text-transparent bg-(--rojo) shadow-[inset_3px_0_0_var(--rojo)]" />')).toEqual([])
    expect(check('<a href="#bad">Skip</a>')).toEqual([])
    expect(check("toast.success('Run #4182 completed', { description: 'Issue #abc' })")).toEqual([])
    expect(check('<div className="border-t-2 border-x ring-2 ring-offset-2 outline-none outline-offset-2 fill-current stroke-2 bg-cover" />')).toEqual([])
  })
})

describe('rule 5: each colour token only within its scopes', () => {
  it('flags a token used for a job it is not scoped for', () => {
    const [oro] = only('<p className="text-oro">Gold words</p>', 5)
    expect(oro).toMatchObject({ severity: 'error' })
    expect(oro?.message).toContain('scoped surface, mark, edge')
    expect(oro?.fix).toContain('`bg-oro`')
    expect(rules('<div className="bg-ink-2" />')).toEqual(['5 error'])
    expect(rules('<div className="border-cloth-pale" />')).toEqual(['5 error'])
    expect(rules('<div className="shadow-ink" />')).toEqual(['5 error'])
    // The close icon is `X`: a one-letter component is still an element.
    expect(only('<X aria-hidden className="size-4 text-danger" />', 5)[0]?.fix).toContain('`text-ink-danger`')
  })

  it('allows every utility the scopes publish, and the ones they also accept', () => {
    const published = data.manifest.tokens.colors.flatMap((c) => c.utilities)
    expect(published.length).toBeGreaterThan(80)
    expect(check(`<div className="${published.join(' ')}" />`)).toEqual([])
    expect(check('<input className="placeholder:text-ink-muted caret-ink outline-ink ring-ink divide-keyline stroke-ink" />').filter((f) => f.rule === 5)).toEqual([])
  })
})

describe('rule 6: theme and density are attributes', () => {
  it('flags a density prop on a Mola component', () => {
    expect(rules('<Table density="compact" />')).toEqual(['6 error'])
    expect(check('<div data-density="compact"><Table /></div>')).toEqual([])
  })
})

describe('rule 7: logical properties', () => {
  it('flags physical utilities and style keys, with the logical fix', () => {
    const found = only('<div className="pl-4 mr-2 -ml-1 left-0 sm:right-6 text-left border-l-2" />', 7)
    expect(found.map((f) => f.fix)).toEqual([
      'Use `ps-4`.',
      'Use `me-2`.',
      'Use `-ms-1`.',
      'Use `inset-s-0`.',
      'Use `sm:inset-e-6`.',
      'Use `text-start`.',
      'Use `border-s-2`.',
    ])
    expect(rules("<div style={{ marginLeft: 8, left: '40%' }} />")).toEqual(['7 error', '7 error'])
  })

  it('reads class strings in props objects, cva compound variants and class constants', () => {
    expect(rules("const props = { className: 'pl-4' }")).toEqual(['7 error'])
    expect(rules("cva('', { compoundVariants: [{ size: 'sm', class: 'mr-1' }] })")).toEqual(['7 error'])
    expect(rules("const trackClasses = 'relative block text-left'")).toEqual(['7 error'])
    expect(rules('const rowClass = `flex ${x} ml-2`')).toEqual(['7 error'])
    // A string that is not a class list is not read as one.
    expect(check("const align = 'left'\nconst label = 'Shift left by 2'")).toEqual([])
  })

  it('allows logical classes, symmetric pairs and centring', () => {
    expect(check('<div className="ps-4 me-2 inset-s-0 text-start border-s-2" />')).toEqual([])
    expect(check('<div className="fixed left-1/2 -translate-x-1/2" />')).toEqual([])
    expect(check('<div className="absolute left-0 right-0 pl-4 pr-4" />')).toEqual([])
  })
})

describe('rule 8: typefaces have roles', () => {
  it('warns on a family outside the three roles', () => {
    expect(rules('<p className="font-serif" />')).toEqual(['8 warn'])
    expect(rules("<p className=\"font-['Inter']\" />")).toEqual(['8 warn'])
    expect(check('<p className="font-text font-semibold font-[550]" />')).toEqual([])
  })
})

describe('rule 10: no spinners', () => {
  it('flags animate-spin and spinner packages, and warns on a spinner icon', () => {
    expect(rules('<svg className="size-4 animate-spin" />')).toEqual(['10 error'])
    expect(rules("import { ClipLoader } from 'react-spinners'")).toEqual(['10 error'])
    expect(rules("import { Loader2, Plus } from 'lucide-react'")).toEqual(['10 warn'])
    expect(check("import { Plus } from 'lucide-react'\n<Button loading>Save</Button>")).toEqual([])
  })
})

describe('rule 12: use the components', () => {
  it('flags hand-rolled dialogs and composite widgets once per kind', () => {
    expect(rules('<div role="dialog" aria-modal="true">x</div>')).toEqual(['12 error'])
    expect(rules('<dialog open>x</dialog>')).toEqual(['12 error'])
    const menu = only('<ul role="menu">\n  <li role="menuitem">A</li>\n  <li role="menuitem">B</li>\n  <li role="menuitem">C</li>\n</ul>', 12)
    expect(menu.map((f) => f.line)).toEqual([1, 2])
    expect(menu[1]?.message).toContain('3 times')
    expect(menu[0]?.fix).toContain('`Menu`')
  })

  it('suggests the component for a hand-styled control, and says nothing of a role prop on a component', () => {
    const [button] = only('<button className="h-8 px-3 shadow-cut">Save</button>', 12)
    expect(button).toMatchObject({ severity: 'warn' })
    expect(button?.fix).toContain('`Button`')
    expect(only('<input type="checkbox" className="size-4" />', 12)[0]?.fix).toContain('`Checkbox`')
    expect(check('<button type="submit">Save</button>')).toEqual([])
    expect(check('<Message role="assistant" author="Cayuco">Hi</Message>')).toEqual([])
    expect(check('<p role="status" className="sr-only">Saved</p>')).toEqual([])
  })

  it('checks imports: other UI libraries, guessed names, Base UI directly', () => {
    expect(rules("import { Button } from '@mui/material'")).toEqual(['12 error'])
    const [card] = check("import { Card, Button } from '@demogar/mola-ui'")
    expect(card).toMatchObject({ rule: 12, severity: 'error' })
    expect(card?.message).toContain('`Card`')
    expect(check("import { Button, type ButtonProps, cn } from '@demogar/mola-ui'\nimport '@demogar/mola-ui/styles.css'")).toEqual([])
    expect(rules("import { Dialog } from '@base-ui/react/dialog'")).toEqual(['12 warn'])
  })
})

describe('composite roles anywhere', () => {
  it('flags a composite role on a layout component and a hand-built grid', () => {
    expect(only('<Inline role="toolbar" aria-label="Run controls"><Button>Run</Button></Inline>', 12)[0]?.fix).toContain('`Toolbar`')
    expect(only('<div role="grid" aria-label="Runs">x</div>', 12)[0]?.fix).toContain('`DataTable`')
    expect(only('<div role="tablist"><button role="tab">A</button></div>', 12)).toHaveLength(2)
  })

  it('points a Base UI import Mola re-exports at the package', () => {
    expect(only("import { DirectionProvider } from '@base-ui/react/direction-provider'", 12)[0]?.fix).toBe('Import `DirectionProvider` from @demogar/mola-ui.')
  })
})

describe('check_code: allow', () => {
  const dont = (allow: string) => `export const Dont = () => (\n  <>\n    ${allow}\n    <div className="pl-4">x</div>\n  </>\n)`

  it('honours an allow with a rule and a reason, on its own line and the next', () => {
    expect(check(dont('{/* check_code: allow rule 7 — the "don’t" half of a do/don’t pair */}'))).toEqual([])
    expect(check('const x = cn(\'pl-4\') // check_code: allow rule 7 - shows the physical class on purpose')).toEqual([])
  })

  it('rejects a bare allow: it is an error and excuses nothing', () => {
    for (const bare of ['{/* check_code: allow rule 7 */}', '{/* check_code: allow */}', '{/* check_code: allow rule 7 — ok */}']) {
      const found = check(dont(bare))
      expect(found.find((f) => f.line === 4)).toMatchObject({ rule: 7, severity: 'error' })
      expect(found.find((f) => f.line === 3)).toMatchObject({ severity: 'error', message: expect.stringContaining('without a rule number and a reason') })
    }
  })

  it('is not fooled by the syntax quoted in docs', () => {
    expect(check('Write `// check_code: allow rule N — the reason` above it.', 'page.mdx')).toEqual([])
  })

  it('excuses only the rule it names, and warns when it excuses nothing', () => {
    expect(rules(dont('{/* check_code: allow rule 2 — wrong rule named for this line */}'))).toEqual(['2 warn', '7 error'])
  })
})

describe('MDX', () => {
  it('checks live JSX, and skips prose, inline code and fenced blocks', () => {
    const page = [
      "import { Meta } from '@storybook/addon-docs/blocks'",
      '',
      "Don't write `<div role=\"dialog\">` or `bg-[#fff]` by hand.",
      '',
      '```tsx',
      '<button className="border rounded-lg">Bad</button>',
      '```',
      '',
      '<Specimen>',
      '  <div className="grid text-right">1,204</div>',
      '</Specimen>',
    ].join('\n')
    expect(check(page, 'page.mdx').map((f) => `${f.line} ${f.rule}`)).toEqual(['10 7'])
  })
})

describe('the scanner', () => {
  it('is not thrown by apostrophes in JSX text, generics, regex literals or comparisons', () => {
    const code = [
      "import * as React from 'react'",
      'const pick = <T,>(xs: T[]) => xs[0]',
      "const quote = /['\"]/g",
      'export function Screen({ n }: { n: number }) {',
      "  const [value, setValue] = React.useState<string>('')",
      '  if (n < 3 && n > 1) setValue(value)',
      '  return (',
      "    <p>Don't add a border here; it's text.</p>",
      '  )',
      '}',
      'export const Edge = () => <button className="border px-2">x</button>',
    ].join('\n')
    expect(only(code, 1).map((f) => f.line)).toEqual([11])
  })

  it('reports the line and the trimmed source', () => {
    const [f] = check('<div>\n  <p className="text-left">x</p>\n</div>') as [Finding]
    expect(f).toMatchObject({ rule: 7, line: 2, excerpt: '<p className="text-left">x</p>' })
  })

  it('is clean on a screen written the Mola way', () => {
    const screen = `import { Plus } from 'lucide-react'
import { Badge, Button, Callout, PageHeader, Stack, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@demogar/mola-ui'

export function Runs({ runs, busy }: { runs: { id: string; status: string }[]; busy: boolean }) {
  return (
    <Stack className="gap-6 ps-6 pe-6">
      <PageHeader title="Runs" actions={<Button loading={busy}><Plus aria-hidden /> Start run</Button>} />
      {runs.length === 0 ? <Callout tone="info">No runs yet.</Callout> : null}
      <Table>
        <TableHeader><TableRow><TableHead>Run</TableHead><TableHead className="text-end">Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id} className={cn('bg-cloth-pale', run.status === 'failed' && 'bg-rojo-soft')}>
              <TableCell className="literal">{run.id}</TableCell>
              <TableCell className="text-end"><Badge tone="danger">Failed</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  )
}`
    expect(check(screen)).toEqual([])
  })
})

describe('CSS', () => {
  it('checks declarations and @apply', () => {
    const css = '.card {\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  margin-left: 8px;\n}\nbutton { border: 1px solid var(--ink); }\n.x { @apply rounded-lg pl-2; }'
    expect(check(css, 'app.css').map((f) => `${f.line} ${f.rule} ${f.severity}`)).toEqual(['2 5 error', '3 2 error', '4 7 error', '6 1 error', '7 2 warn', '7 7 error'])
  })

  it('recognises CSS without a file name, and allows a dot and centring', () => {
    expect(rules('.dot { border-radius: 50%; }\n.pop { position: fixed; left: 50%; transform: translateX(-50%); }')).toEqual([])
    expect(rules('.a { color: #fff }')).toEqual(['5 error'])
  })
})
