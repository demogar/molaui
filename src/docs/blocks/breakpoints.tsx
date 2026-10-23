import type * as React from 'react'

import { useScrollEdge } from '../../lib/scroll-edge'
import { BREAKPOINT_JOBS, BREAKPOINT_USES, componentName, scaleRows } from './responsive'
import { themeScale } from './tokens-source'

/**
 * The viewport breakpoints and the container steps, read from theme.css, so
 * the page cannot quote a width the CSS no longer has (`nav` was 920px, in
 * pixels, until ADR 0007 moved every breakpoint to rem).
 */

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  const edge = useScrollEdge<HTMLDivElement>()
  return (
    <div
      ref={edge}
      role="region"
      aria-label={label}
      tabIndex={0}
      className="sb-unstyled not-prose relative my-6 overflow-x-auto scroll-edge bg-cloth-pale font-ui text-sm text-ink shadow-cut"
    >
      {children}
    </div>
  )
}

const cell = 'rule-t p-3 text-start align-top'

/**
 * The utility's name, built rather than written: bridge.test.ts reads every
 * class-like word in the docs sources and would take a literal `max-w-` here
 * for a class with no value behind it.
 */
const MAX_W = 'max-w'

export function BreakpointTable() {
  const rows = scaleRows(themeScale, 'breakpoint')
  return (
    <Frame label="Viewport breakpoints">
      <table className="w-full min-w-[36rem] border-collapse">
        <caption className="sr-only">Viewport breakpoints, read from theme.css</caption>
        <thead>
          <tr className="bg-cloth-shade">
            <th scope="col" className="etiqueta text-xs p-3 text-start">Variant</th>
            <th scope="col" className="etiqueta text-xs p-3 text-end">From</th>
            <th scope="col" className="etiqueta text-xs p-3 text-start">What changes there</th>
            <th scope="col" className="etiqueta text-xs p-3 text-start">Components that use it</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const uses = BREAKPOINT_USES[r.name] ?? []
            return (
              <tr key={r.name}>
                <th scope="row" className={`${cell} font-normal`}>
                  <code className="literal text-xs">{r.name}:</code>
                </th>
                <td className={`${cell} text-end tabular whitespace-nowrap`}>
                  {r.value}
                  {r.px !== null ? <span className="block text-xs text-ink-muted">{r.px}px</span> : null}
                </td>
                <td className={`${cell} text-ink-2`}>{BREAKPOINT_JOBS[r.name] ?? ''}</td>
                <td className={`${cell} text-ink-2`}>{uses.length ? uses.map(componentName).join(', ') : 'None'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Frame>
  )
}

export function ContainerTable() {
  const rows = scaleRows(themeScale, 'container')
  return (
    <Frame label="Container steps">
      <table className="w-full min-w-[24rem] border-collapse">
        <caption className="sr-only">Container steps, read from theme.css: the widths and the container queries</caption>
        <thead>
          <tr className="bg-cloth-shade">
            <th scope="col" className="etiqueta text-xs p-3 text-start">Step</th>
            <th scope="col" className="etiqueta text-xs p-3 text-end">Width</th>
            <th scope="col" className="etiqueta text-xs p-3 text-start">Utilities</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <th scope="row" className={`${cell} font-normal`}>
                <code className="literal text-xs">{r.name}</code>
              </th>
              <td className={`${cell} text-end tabular whitespace-nowrap`}>
                {r.value}
                {r.px !== null && !r.value.endsWith('px') ? <span className="block text-xs text-ink-muted">{r.px}px</span> : null}
              </td>
              <td className={`${cell} text-ink-2`}>
                <code className="literal text-xs">{`${MAX_W}-${r.name}`}</code>
                {['page', 'wide', 'reading'].includes(r.name) ? null : (
                  <>
                    {' '}
                    <code className="literal text-xs">@{r.name}:</code>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Frame>
  )
}
