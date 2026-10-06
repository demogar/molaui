import type * as React from 'react'

import { cn } from '../../lib/cn'

export interface SkeletonProps extends React.ComponentProps<'div'> {
  /** `block` keeps the keyline; `line` is a bare bar for text that has not arrived. */
  shape?: 'block' | 'line'
}

/**
 * Loading is a cut shape whose content has not arrived, so a block keeps the
 * keyline every other shape has and carries the same relleno as the empty
 * state.
 *
 * That texture is the point. Without it the state ladder inverts: a hollow
 * grey rectangle for LOADING beside a textured, captioned placeholder for
 * EMPTY makes loading look emptier than empty. A slot waiting for content
 * should read as at least as furnished as one that has given up on it.
 *
 * Decorative to assistive tech: the region that is loading announces that
 * fact once (`aria-busy` on the container), rather than every bar in it
 * saying "loading" in turn.
 */
export function Skeleton({ shape = 'block', className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        'animate-mola-pulse rounded-none bg-cloth-shade',
        shape === 'block' ? 'relleno-field shadow-cut' : 'h-[0.8em] w-full',
        className,
      )}
      {...props}
    />
  )
}

export interface SkeletonTextProps extends React.ComponentProps<'div'> {
  lines?: number
}

/**
 * Lines of text that have not arrived. The last line is short, because a
 * paragraph ends ragged; a block of equal bars reads as a table.
 */
export function SkeletonText({ lines = 3, className, ...props }: SkeletonTextProps) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-[0.6em]', className)} {...props}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} shape="line" className={i === lines - 1 && lines > 1 ? 'w-3/5' : undefined} />
      ))}
    </div>
  )
}
