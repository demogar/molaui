import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { deprecate } from '../../lib/deprecate'

/**
 * Four levels, and the visual size follows the level unless told otherwise.
 *
 * In a working tool, headings are wayfinding rather than voice: a page title,
 * a panel title, a group inside a panel, a label over a cluster of fields. So
 * the scale is steep at the top and flat at the bottom — level 4 is barely
 * larger than body text and is distinguished by weight and width, because a
 * dense panel cannot spend 20px on every group label.
 *
 * `visualLevel` decouples the look from the outline when the document
 * outline and the visual hierarchy disagree — a dialog's title is an h2 in
 * the outline but should not look like a page section. Never skip a level in
 * the outline to get a smaller heading; change `visualLevel` instead.
 *
 * It was `size` until 0.7.0. `size` is the t-shirt scale on every other
 * component; this value is a heading level ("look like an h3"), so it is
 * named for that and takes the same values as `level`.
 */
export const headingVariants = cva('m-0 font-display wdth-display', {
  variants: {
    visualLevel: {
      1: 'text-2xl font-bold leading-heading tracking-display',
      2: 'text-xl font-bold leading-heading tracking-heading',
      3: 'text-lg font-semibold leading-snug tracking-heading',
      4: 'text-base font-semibold leading-snug',
    },
  },
})

export type HeadingLevel = 1 | 2 | 3 | 4

export interface HeadingProps extends React.ComponentProps<'h2'> {
  /** The outline level, `h1` to `h4`. Required, and set from the document outline: never skip one to get a smaller look; use `visualLevel`. */
  level: HeadingLevel
  /** The level it should look like, when that must differ from the outline level. */
  visualLevel?: HeadingLevel
  /**
   * @deprecated Since 0.7.0; removed in 1.0.0. Use `visualLevel`, which takes
   * the same values. `codemods/prop-vocabulary.ts` rewrites call sites.
   */
  size?: HeadingLevel
}

export function Heading({ level, visualLevel, size, className, ...props }: HeadingProps) {
  if (size !== undefined) {
    deprecate('heading-size', { what: '<Heading size>', instead: '<Heading visualLevel>', removal: '1.0.0' })
  }
  const Tag = `h${level}` as const
  return (
    <Tag
      data-slot="heading"
      className={cn(headingVariants({ visualLevel: visualLevel ?? size ?? level }), className)}
      {...props}
    />
  )
}
