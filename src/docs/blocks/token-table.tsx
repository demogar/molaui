import { Copy } from 'lucide-react'
import * as React from 'react'

import { IconButton } from '../../components/button'
import { Field, SearchInput } from '../../components/field'
import { tokenRows, type TokenRow } from './tokens-source'

const ROWS = tokenRows()

function matches(row: TokenRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.name, row.group, row.note ?? '', row.light, row.dark].some((text) => text.toLowerCase().includes(q))
}

/**
 * A two-part chip, painted with the resolved value for each theme rather than
 * from a nested `data-theme` subtree, so both halves show exactly the hex in
 * the row.
 */
function Chip({ light, dark }: { light: string; dark: string }) {
  return (
    <span aria-hidden className="inline-grid size-5 shrink-0 grid-cols-2 shadow-cut">
      <span style={{ background: light }} />
      <span style={{ background: dark }} />
    </span>
  )
}

function Value({ value, isColor }: { value: string; isColor: boolean }) {
  return <code className={`literal break-all text-ink-2 ${isColor ? '' : 'text-xs'}`}>{value}</code>
}

/**
 * Every token in tokens.css, searchable, with a copy button per row.
 *
 * Built for a screen reader as much as for the eye: the search field is a
 * labelled Field, the result is a real table with a caption and column
 * headers, each copy button names the token it copies, and both the result
 * count and the copy confirmation are polite status messages, so typing in
 * the field and pressing copy are each confirmed without moving focus.
 *
 * The row values come from the resolver the contrast contract uses: a colour
 * that is a mix is shown as the hex it flattens to in each theme, and a value
 * the resolver cannot flatten (a translucent mix, a shadow, a duration) is
 * shown as written, in both columns.
 */
export function TokenTable({ rows = ROWS }: { rows?: TokenRow[] }) {
  const [query, setQuery] = React.useState('')
  const [copied, setCopied] = React.useState('')
  const shown = rows.filter((row) => matches(row, query))

  async function copy(name: string) {
    const text = `var(${name})`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(`Copied ${text}.`)
    } catch {
      setCopied(`Could not copy ${text}. Select the name and copy it instead.`)
    }
  }

  const cell = 'border-t border-keyline p-3 align-top text-start'
  return (
    <div className="sb-unstyled not-prose my-6 grid gap-4 font-ui text-sm text-ink">
      <div className="grid gap-2 sm:max-w-md">
        <Field label="Filter tokens" hint="By name, section, note or value: “oro”, “motion”, “220ms”.">
          {(control) => <SearchInput {...control} value={query} onChange={(event) => setQuery(event.target.value)} />}
        </Field>
      </div>
      <p className="m-0 text-ink-2" role="status">
        {shown.length === rows.length ? `${rows.length} tokens.` : `${shown.length} of ${rows.length} tokens match “${query.trim()}”.`}{' '}
        <span>{copied}</span>
      </p>
      <div className="relative min-w-0 overflow-x-auto bg-cloth-pale shadow-cut">
        <table className="w-full min-w-[44rem] border-collapse">
          <caption className="sr-only">Design tokens in tokens.css, with role and the value in each theme</caption>
          <thead>
            <tr className="bg-cloth-shade">
              <th scope="col" className="rotulo p-3 text-start">Token</th>
              <th scope="col" className="rotulo p-3 text-start">Role</th>
              <th scope="col" className="rotulo p-3 text-start">Light</th>
              <th scope="col" className="rotulo p-3 text-start">Dark</th>
              <th scope="col" className="rotulo p-3 text-start">
                <span className="sr-only">Copy</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.name}>
                <th scope="row" className={`${cell} font-normal`}>
                  <span className="flex items-center gap-2">
                    {row.isColor ? <Chip light={row.light} dark={row.dark} /> : null}
                    <code className="literal font-semibold text-ink">{row.name}</code>
                  </span>
                </th>
                <td className={`${cell} text-ink-2`}>
                  <span className="rotulo text-ink-muted">{row.group}</span>
                  {row.note ? <span className="mt-1 block">{row.note}</span> : null}
                </td>
                <td className={cell}>
                  <Value value={row.light} isColor={row.isColor} />
                </td>
                <td className={cell}>
                  <Value value={row.dark} isColor={row.isColor} />
                </td>
                <td className={`${cell} w-12`}>
                  <IconButton label={`Copy var(${row.name})`} variant="ghost" size="sm" onClick={() => copy(row.name)}>
                    <Copy aria-hidden />
                  </IconButton>
                </td>
              </tr>
            ))}
            {shown.length === 0 ? (
              <tr>
                <td colSpan={5} className={`${cell} text-ink-2`}>
                  No token matches “{query.trim()}”. Try a shorter word, or clear the filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
