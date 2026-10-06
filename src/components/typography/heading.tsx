import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Four levels, and the visual size follows the level unless told otherwise.
 *
 * In a working tool, headings are wayfinding rather than voice: a page title,
 * a panel title, a group inside a panel, a label over a cluster of fields. So
 * the scale is steep at the top and flat at the bottom — level 4 is barely
 * larger than body text and is distinguished by weight and width, because a
 * dense panel cannot spend 20px on every group label.
 *
 * `size` decouples the look from the outline when the document outline and
 * the visual hierarchy disagree — a dialog's title is an h2 in the outline
 * but should not look like a page section. Never skip a level in the outline
 * to get a smaller heading; change `size` instead.
 */
export const headingVariants = cva('m-0 font-display wdth-display', {
  variants: {
    size: {
      1: 'text-2xl font-bold leading-[1.1] tracking-display',
      2: 'text-xl font-bold leading-[1.15] tracking-[-0.015em]',
      3: 'text-lg font-semibold leading-snug tracking-[-0.01em]',
      4: 'text-base font-semibold leading-snug',
    },
  },
})

export type HeadingLevel = 1 | 2 | 3 | 4

export interface HeadingProps extends React.ComponentProps<'h2'> {
  level: HeadingLevel
  /** Visual size, when it must differ from the outline level. */
  size?: HeadingLevel
}

export function Heading({ level, size, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const
  return <Tag className={cn(headingVariants({ size: size ?? level }), className)} {...props} />
}
