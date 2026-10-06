import type * as React from 'react'

import { cn } from '../../lib/cn'

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

/** One row of the type scale: the token, its size, and the face set at it. */
export function ScaleRow({ token, sample, className }: { token: string; sample: string; className: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-baseline gap-6 border-t border-keyline py-3">
      <code className="literal text-xs text-ink-muted">{token}</code>
      <span className={cn('truncate', className)}>{sample}</span>
    </div>
  )
}
