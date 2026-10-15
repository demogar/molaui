import type * as React from 'react'

import { cn } from '../../lib/cn'
import { DENSITIES, densityValue, themeScale } from './tokens-source'

/** A labelled frame for a live example on a docs page. */
export function Specimen({
  label,
  children,
  className,
  ground = 'cloth',
}: {
  label?: string
  children: React.ReactNode
  className?: string
  ground?: 'cloth' | 'pale' | 'ink'
}) {
  return (
    <figure className="sb-unstyled not-prose my-6">
      <div
        className={cn(
          'p-6 shadow-cut',
          ground === 'cloth' && 'bg-cloth',
          ground === 'pale' && 'bg-cloth-pale',
          ground === 'ink' && 'on-ink',
          className,
        )}
      >
        {children}
      </div>
      {label ? <figcaption className="mt-2.5 rotulo text-ink-muted">{label}</figcaption> : null}
    </figure>
  )
}

/** `calc(1.25 / 0.875)` → 1.43, `1.5` → 1.5: the ratio theme.css writes a line height as. */
function ratio(value: string | undefined): string | null {
  if (!value) return null
  const m = value.match(/^calc\(\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)$/)
  const n = m ? Number(m[1]) / Number(m[2]) : Number(value)
  return Number.isFinite(n) ? String(+n.toFixed(2)) : null
}

/**
 * One row of the type scale: the token, its size in each density and its
 * line height, read from tokens.css and theme.css, and a sample set at it.
 * The sample is drawn by the real utility, so it is the size the page is in.
 */
export function ScaleRow({ token, sample, className }: { token: string; sample: string; className: string }) {
  const name = `--${token}`
  const sizes = DENSITIES.map((d) => densityValue(name, d) ?? '')
  const same = sizes.every((s) => s === sizes[0])
  const leading = ratio(themeScale.get(`${name}--line-height`))
  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-baseline gap-4 border-t border-keyline py-3 sm:gap-6">
      <span className="min-w-0">
        <code className="literal text-xs text-ink-muted">{token}</code>
        <span className="block text-xs text-ink-2 tabular">
          {same ? sizes[0] : sizes.map((s) => s.replace('px', '')).join(' · ') + 'px'}
          {leading ? `, ×${leading}` : ''}
        </span>
      </span>
      <span className={cn('truncate', className)}>{sample}</span>
    </div>
  )
}
