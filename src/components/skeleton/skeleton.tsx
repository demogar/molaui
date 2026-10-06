import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The sweep every bone shares: a band of raised cloth passing over the slot,
 * left to right in left-to-right text and mirrored in right-to-left, so it
 * moves the way the content will be read.
 *
 * A sweep rather than the old opacity pulse. A pulse fades the keyline with
 * the fill, and a block whose edge breathes reads as unstable; the sweep moves
 * over a shape that stays put.
 *
 * Under reduced motion there is no sweep at all — the band is removed, not
 * slowed — and the bone is a still, textured slot. In forced colours the band
 * goes too, and a text bone (which has no keyline) is painted GrayText so the
 * shape of what is coming is still there.
 */
export const skeletonShimmer = [
  'relative isolate overflow-hidden',
  "after:pointer-events-none after:absolute after:inset-0 after:content-['']",
  'after:bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--cloth-pale)_75%,transparent),transparent)]',
  'after:animate-mola-shimmer rtl:after:[animation-direction:reverse]',
  'motion-reduce:after:hidden forced-colors:after:hidden',
]

const skeletonVariants = cva(['rounded-none bg-cloth-shade', skeletonShimmer], {
  variants: {
    shape: {
      /** A card, a chart, an image: keeps the keyline every other shape has. */
      block: 'relleno-field shadow-cut',
      /** A line of text that has not arrived. Sized in `em`, so it follows the type around it. */
      text: 'h-[0.8em] w-full forced-colors:bg-[GrayText] forced-colors:forced-color-adjust-none',
      /** @deprecated Use `text`. Kept so existing call sites do not break. */
      line: 'h-[0.8em] w-full forced-colors:bg-[GrayText] forced-colors:forced-color-adjust-none',
      /** A person or agent mark, square-cut like `Avatar`. */
      avatar: 'shrink-0 shadow-cut',
    },
    size: {
      xs: '',
      sm: '',
      md: '',
      lg: '',
      xl: '',
    },
  },
  compoundVariants: [
    // The same steps as Avatar, so the bone is exactly the mark it stands in for.
    { shape: 'avatar', size: 'xs', className: 'size-5' },
    { shape: 'avatar', size: 'sm', className: 'size-6' },
    { shape: 'avatar', size: 'md', className: 'size-8' },
    { shape: 'avatar', size: 'lg', className: 'size-10' },
    { shape: 'avatar', size: 'xl', className: 'size-14' },
  ],
  defaultVariants: { shape: 'block', size: 'md' },
})

export interface SkeletonProps extends React.ComponentProps<'div'>, VariantProps<typeof skeletonVariants> {}

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
 * fact once (`aria-busy` on the container, see `SkeletonGroup`), rather than
 * every bone in it saying "loading" in turn.
 */
export function Skeleton({ shape, size, className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      data-shape={shape ?? 'block'}
      aria-hidden
      className={cn(skeletonVariants({ shape, size }), className)}
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
        <Skeleton key={i} shape="text" className={i === lines - 1 && lines > 1 ? 'w-3/5' : undefined} />
      ))}
    </div>
  )
}

export interface SkeletonGroupProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** While true the bones show and the region is busy. */
  loading: boolean
  /** What is loading, said once: "Loading agent", "Loading runs". */
  label: string
  /** The bones, shown while loading. */
  fallback: React.ReactNode
  /** The real content, shown once loaded. */
  children?: React.ReactNode
}

/**
 * The region that is loading, and the one place that says so.
 *
 * `aria-busy` sits on this container — not on each bone — so assistive tech
 * treats the region as one thing in flux and holds back its half-built
 * contents. The label is spoken through a polite status that is in the DOM
 * from the first render: a live region that appears together with its text
 * is not reliably announced, so the region stays and only its words change.
 * When loading ends the status empties rather than saying "loaded"; the
 * content arriving is the news.
 */
export function SkeletonGroup({ loading, label, fallback, children, className, ...props }: SkeletonGroupProps) {
  return (
    <div data-slot="skeleton-group" aria-busy={loading || undefined} className={className} {...props}>
      <span role="status" className="sr-only">
        {loading ? label : ''}
      </span>
      {loading ? fallback : children}
    </div>
  )
}
