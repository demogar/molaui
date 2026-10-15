import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { deprecate } from '../../lib/deprecate'
import { type Variants } from '../../lib/variants'

/**
 * Running UI text in the system voice. Three inks and no more: ink for what
 * the reader came for, ink-2 for what explains it, muted for what they can
 * skip. A fourth grey would be a grey nobody can tell from its neighbours —
 * and muted is already the floor, at 4.83:1 on the shaded ground.
 *
 * `as` is limited to the three elements text actually lives in. A polymorphic
 * `as` that accepts anything is how a heading ends up styled as body text
 * with an `<h3>` underneath, and the outline lies.
 *
 * The three inks are `variant`, a presentation; `tone` is kept for status,
 * as on every other component (docs/adr/0010-prop-vocabulary.md). Until
 * 0.7.0 they were one prop, `tone="2"`, which put a number among the status
 * words and let `tone="muted"` and `tone="danger"` look like peers.
 */
export const textVariants = cva('m-0 font-ui', {
  variants: {
    /** A step on the type scale, which density re-scales; `md` (body) by default. */
    size: {
      xs: 'text-xs leading-snug',
      sm: 'text-sm leading-body',
      md: 'text-base leading-body',
      lg: 'text-lg leading-body',
      /** @deprecated Since 0.7.0; removed in 1.0.0. Use `md`, the same size. */
      base: 'text-base leading-body',
    },
    /** Which of the three inks: `default` for what the reader came for, `secondary` for what explains it, `muted` for what they can skip. */
    variant: {
      /** Inherits the ground's ink, so the same Text reads on cloth and on a panel. */
      default: '',
      secondary: 'text-ink-2',
      muted: 'text-ink-muted',
    },
    /** A status ink, over the variant's: `danger` or `success` for a line that reports an outcome. Pair it with words or a glyph that say the state. */
    tone: {
      /** No status: the variant's ink. */
      neutral: '',
      danger: 'text-ink-danger',
      success: 'text-ink-success',
      /** @deprecated Since 0.7.0; removed in 1.0.0. Use `neutral`, or leave `tone` out. */
      default: '',
      /** @deprecated Since 0.7.0; removed in 1.0.0. Use `variant="secondary"`. */
      2: 'text-ink-2',
      /** @deprecated Since 0.7.0; removed in 1.0.0. Use `variant="muted"`. */
      muted: 'text-ink-muted',
    },
    /** `regular` by default; `medium` or `semibold` to lift a name or a figure out of a line without changing its size. */
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    /** Tabular figures, so numbers in a column or a ticking counter keep their width. */
    tabular: { true: 'tabular', false: '' },
    /** Cut to one line with an ellipsis. Only for text whose full value is available elsewhere, such as a tooltip or a detail view. */
    truncate: { true: 'truncate', false: '' },
  },
  defaultVariants: { size: 'md', variant: 'default', tone: 'neutral', weight: 'regular', tabular: false, truncate: false },
})

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    Variants<typeof textVariants> {
  /** The element, `p` by default: `span` inside a line, `div` around block content. Headings are `Heading`, so the outline never lies. */
  as?: 'p' | 'span' | 'div'
  /** Forwarded to the rendered element, whichever `as` picks. */
  ref?: React.Ref<HTMLElement>
}

const RENAMED_TONE = { default: 'tone="neutral"', 2: 'variant="secondary"', muted: 'variant="muted"' } as const

export function Text({ as: Tag = 'p', size, variant, tone, weight, tabular, truncate, className, ref, ...props }: TextProps) {
  if (tone === 'default' || tone === 2 || tone === 'muted') {
    deprecate(`text-tone-${tone}`, {
      what: `<Text tone=${tone === 2 ? '{2}' : `"${tone}"`}>`,
      instead: `<Text ${RENAMED_TONE[tone]}>`,
      removal: '1.0.0',
    })
  }
  if (size === 'base') deprecate('text-size-base', { what: '<Text size="base">', instead: '<Text size="md">', removal: '1.0.0' })
  return (
    <Tag
      {...props}
      ref={ref as React.Ref<HTMLParagraphElement & HTMLSpanElement & HTMLDivElement>}
      data-slot="text"
      className={cn(textVariants({ size, variant, tone, weight, tabular, truncate }), className)}
    />
  )
}
