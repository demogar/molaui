import * as React from 'react'

import { Badge } from '../../components/badge'
import { Progress } from '../../components/progress'
import { useScrollEdge } from '../../lib/scroll-edge'
import { checkOverride, textOf } from './override'
import { decls } from './tokens-source'

/**
 * A worked override and what the contrast contract says about it.
 *
 * The CSS is the fenced block written inside the element in the MDX, so the
 * code a reader copies and the code this measures are the same text: there
 * is no second copy to drift. (A fenced block is also the one place the
 * no-hex test lets a docs page write a colour, because it defines nothing the
 * library ships.) Each row is a promised pairing the override can reach, with
 * the ratio before and after; a failure is a word and a mark, not only red.
 */
export function OverrideCheck({
  children,
  label,
  preview = false,
}: {
  children: React.ReactNode
  label: string
  /** Paint a few accent surfaces with the override, in both themes side by side. */
  preview?: boolean
}) {
  const css = textOf(children)
  const result = checkOverride(css, decls)
  const edge = useScrollEdge<HTMLDivElement>()
  const cell = 'rule-t p-3 text-start align-top'
  return (
    <>
      {/* Outside sb-unstyled, so Storybook draws the code block as it draws every other one. */}
      {children}
      {preview ? <Preview css={css} /> : null}
      <figure className="sb-unstyled not-prose my-6">
        <div
          ref={edge}
          role="region"
          aria-label={`Contrast of the override: ${label}`}
          tabIndex={0}
          className="relative overflow-x-auto scroll-edge bg-cloth-pale font-ui text-sm text-ink shadow-cut"
        >
          <table className="w-full min-w-[34rem] border-collapse">
            <caption className="p-3 text-start text-sm text-ink-2">
              {result.failing.length
                ? `${result.failing.length} of ${result.rows.length} measurements fail.`
                : `All ${result.rows.length} measurements hold.`}{' '}
              {label}
            </caption>
            <thead>
              <tr className="bg-cloth-shade">
                <th scope="col" className="etiqueta text-xs p-3 text-start">Text or mark</th>
                <th scope="col" className="etiqueta text-xs p-3 text-start">On</th>
                <th scope="col" className="etiqueta text-xs p-3 text-start">Theme</th>
                <th scope="col" className="etiqueta text-xs p-3 text-end">Shipped</th>
                <th scope="col" className="etiqueta text-xs p-3 text-end">Yours</th>
                <th scope="col" className="etiqueta text-xs p-3 text-start">Result</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={`${r.fg} ${r.bg} ${r.theme}`}>
                  <th scope="row" className={`${cell} font-normal`}>
                    <code className="literal text-xs">{r.fg}</code>
                  </th>
                  <td className={cell}>
                    <code className="literal text-xs">{r.bg}</code>
                  </td>
                  <td className={cell}>{r.theme}</td>
                  <td className={`${cell} text-end tabular text-ink-2`}>{r.shipped.toFixed(2)}</td>
                  <td className={`${cell} text-end tabular`}>
                    {r.ratio.toFixed(2)} <span className="text-ink-muted">/ {r.min}</span>
                  </td>
                  <td className={cell}>
                    {r.holds ? (
                      <Badge tone="success" dot>
                        Holds
                      </Badge>
                    ) : (
                      <Badge tone="danger" variant="solid" dot>
                        Fails
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    </>
  )
}

/**
 * The override applied to two panes, one per theme. The declarations are
 * re-scoped from `:root, [data-theme]` to the panes, and each pane carries
 * `data-theme`, so tokens.css re-declares the derived tokens on it
 * (`--selected: var(--accent-soft)`) and they follow the override, as they do
 * on an app's root. A custom property that refers to another is resolved
 * where it is declared, so an override on a plain wrapper would leave
 * `--selected` holding the root's gold.
 */
function Preview({ css }: { css: string }) {
  const scope = React.useId()
  const body = css.slice(css.indexOf('{') + 1, css.lastIndexOf('}'))
  return (
    <div className="sb-unstyled not-prose my-6 grid gap-4 md:grid-cols-2">
      <style>{`[data-override="${scope}"] {${body}}`}</style>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-override={scope} data-theme={theme} className="grid content-start gap-4 bg-cloth p-4 font-ui text-ink shadow-cut">
          <p className="m-0 rotulo text-ink-muted">{theme}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent" variant="solid">
              Cayuco
            </Badge>
            <Badge tone="accent">Pinned</Badge>
          </div>
          <div className="flex items-center justify-between gap-3 bg-selected px-3 py-2 text-sm bar-start-ink">
            <span className="literal text-ink">run_8f2a</span>
            <span className="text-ink-muted">Selected, 2 of 40</span>
          </div>
          <Progress label="Indexing runs" value={null} />
        </div>
      ))}
    </div>
  )
}
