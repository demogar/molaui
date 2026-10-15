import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { type Variants } from '../../lib/variants'

/**
 * A colour key: the small square before a legend entry, a filter chip's label
 * or a flat callout's title, that ties the words to a colour used elsewhere —
 * map pins, a column of urgencies, a chart series.
 *
 * ── why not StatusDot ──
 * StatusDot is a state mark: 7px, one size, inside a badge, able to pulse and
 * to stand alone with a label. A key is a different job. It sits beside text
 * at two sizes, it may need to be round because the thing it keys is round
 * (a map pin), and it is ALWAYS decorative: the label beside it carries the
 * meaning, so it is `aria-hidden` and takes no label. Products kept
 * hand-rolling `<span aria-hidden className="size-2.5 bg-…">` for this, each
 * with its own size and its own idea of which gold to use.
 *
 * ── colour ──
 * The tones are the badge tones, so a key and a status for the same thing
 * agree. A key is a graphic, so it owes 3:1 against what it sits on:
 *
 *   warn     --warn, the darkened gold, not --oro. --oro on light cloth is
 *            1.66:1; --warn clears 4.5:1 on cloth and 3:1 on --oro-soft.
 *   accent   --oro itself, for when the key must match a gold field
 *            exactly, with the ink keyline StatusDot uses to make it visible.
 *   neutral  --ink-muted, which clears 4.5:1 on every ground and wash.
 *
 * ── shape ──
 * Square by default: it is a scrap of cut cloth, and the system has no radius.
 * `round` exists only for keying something that is itself a dot — the one case
 * where `rounded-full` is allowed.
 *
 * It never stretches: `shrink-0` in a flex row, a fixed size everywhere.
 */
export const swatchVariants = cva('inline-block shrink-0 forced-ink', {
  variants: {
    tone: {
      neutral: 'bg-ink-muted',
      info: 'bg-anil',
      success: 'bg-verde',
      warn: 'bg-warn',
      danger: 'bg-rojo',
      accent: 'bg-oro shadow-[0_0_0_1px_var(--ink)]',
    },
    size: {
      sm: 'size-2',
      md: 'size-2.5',
    },
    shape: {
      square: 'rounded-none',
      round: 'rounded-full',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md', shape: 'square' },
})

export type SwatchTone = NonNullable<Variants<typeof swatchVariants>['tone']>

export interface SwatchProps
  extends Omit<React.ComponentProps<'span'>, 'children'>,
    Variants<typeof swatchVariants> {}

/**
 * Decorative by contract: a swatch is always hidden from assistive technology,
 * so it can never be the only carrier of a meaning (SC 1.4.1). Put the word
 * beside it.
 */
export function Swatch({ tone, size, shape, className, ...props }: SwatchProps) {
  return (
    <span
      data-slot="swatch"
      data-tone={tone ?? 'neutral'}
      {...props}
      aria-hidden
      className={cn(swatchVariants({ tone, size, shape }), className)}
    />
  )
}
