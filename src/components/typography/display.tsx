import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Archivo at full weight, set wide. A heading here is a shape cut to fill its
 * panel, and at the drawn width a bold grotesque set tight in near-black on
 * off-white is the most common display register of the last five years — the
 * register this system was built to escape. The width does that work, not a
 * different colour underneath.
 *
 * ── the leading cannot be lost ──
 * `tailwind-merge` treats any arbitrary `text-[…]` as possibly carrying a
 * line-height, so a caller who overrides the size with a bare `text-[40px]`
 * silently discards the heading's leading — the page then inherits the body
 * leading and a three-line heading opens up by half its own height, with
 * nothing failing. In the product this was extracted from, the fix was a
 * comment asking callers to use the paired form. Here the component checks:
 * if the merged classes no longer set a leading, it puts its own back.
 *
 * In a product, there is usually one of these per screen at most: the empty
 * state, the onboarding panel, the page that introduces a tool. Page titles in
 * a working view are `Heading level={1}`.
 */
export interface DisplayProps extends React.ComponentProps<'h1'> {
  /** The heading element. Defaults to h1; the visual register does not change. */
  as?: 'h1' | 'h2' | 'p'
}

export function Display({ as: Tag = 'h1', className, ...props }: DisplayProps) {
  const merged = cn(
    'm-0 font-display text-[clamp(40px,5.4vw,76px)]/[1.02] font-bold tracking-display wdth-display',
    className,
  )
  const hasLeading = /(^|\s)leading-|(^|\s)text-\S+\/\S/.test(merged)
  return <Tag className={hasLeading ? merged : `${merged} leading-[1.02]`} {...props} />
}
