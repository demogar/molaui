import type * as React from 'react'

import { cn } from '../../lib/cn'

export interface PullquoteProps {
  children: React.ReactNode
  /** Who said it. Rendered in the label register, under the quote. */
  cite?: string
  className?: string
}

/**
 * A voice interrupting the prose, so it keeps the reading face and takes a
 * relleno band above it rather than a hairline rule — the filler slit is this
 * system's divider, and a pull quote is exactly the seam it was made for.
 *
 * In a product it is the quoted customer, the highlighted finding in a
 * research summary, the sentence from a model's answer an operator pinned.
 */
export function Pullquote({ children, cite, className }: PullquoteProps) {
  return (
    <figure className={cn('m-0 band-oro', className)}>
      <div className="relleno" aria-hidden="true" />
      <blockquote className="m-0">
        <p className="m-0 pt-5 font-text text-[clamp(20px,2.2vw,28px)]/[1.32] italic text-ink">{children}</p>
      </blockquote>
      {cite ? <figcaption className="mt-4 rotulo text-ink-muted">{cite}</figcaption> : null}
    </figure>
  )
}
