import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The cut surface: a region of one ground, bounded by a hard edge.
 *
 * Tones are grounds, and grounds decide the ink. That is why tone is the
 * Panel's prop and not a background class the caller adds: a filled layer
 * (rojo, añil, verde) applies `on-layer`, which redefines the whole ink ramp —
 * a child's own `text-ink-muted` beats an inherited `color`, so a panel that
 * only set `color` would render every secondary line dark-on-dark. Measured,
 * not guessed: --on-layer is the only ink that clears 4.5:1 on all three
 * layers, so on a layer panel, hierarchy is size and weight, not lightness.
 *
 * Gold takes dark type (9.34:1), so `oro` sets --on-oro and leaves the ramp.
 *
 * `edge`:
 *   cut   the ink keyline. The default; a region in a working tool.
 *   band  keyline, revealed band, keyline — the signature, for the ONE panel
 *         on a screen that is the point of the screen.
 *   none  a ground with no edge, for a region that sits inside another.
 */
export const panelVariants = cva('relative min-w-0 rounded-none', {
  variants: {
    tone: {
      pale: 'bg-cloth-pale text-ink',
      cloth: 'bg-cloth text-ink',
      shade: 'bg-cloth-shade text-ink',
      ink: 'on-ink',
      rojo: 'bg-rojo on-layer',
      anil: 'bg-anil on-layer',
      verde: 'bg-verde on-layer',
      oro: 'bg-oro text-on-oro [--ink-2:var(--on-oro)] [--ink-muted:var(--on-oro)]',
    },
    edge: {
      cut: 'shadow-cut',
      band: 'cut-band',
      none: '',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    },
    band: {
      oro: 'band-oro',
      rojo: 'band-rojo',
      anil: 'band-anil',
      verde: 'band-verde',
      cloth: 'band-cloth',
    },
  },
  compoundVariants: [
    // An ink panel's keyline is its own ground: the edge has to be cloth to exist.
    { tone: 'ink', edge: 'cut', class: 'shadow-[0_0_0_1.5px_var(--keyline-on-ink)]' },
  ],
  defaultVariants: { tone: 'pale', edge: 'cut', padding: 'md', band: 'oro' },
})

export type PanelTone = NonNullable<VariantProps<typeof panelVariants>['tone']>

export interface PanelProps extends React.ComponentProps<'div'>, VariantProps<typeof panelVariants> {
  /** Render as a landmark-free `section` (named by its heading) instead of a `div`. */
  as?: 'div' | 'section' | 'article' | 'aside'
}

export function Panel({ as: Tag = 'div', className, tone, edge, padding, band, ...props }: PanelProps) {
  return (
    <Tag
      data-slot="panel"
      data-tone={tone ?? 'pale'}
      className={cn(panelVariants({ tone, edge, padding, band }), className)}
      {...props}
    />
  )
}
