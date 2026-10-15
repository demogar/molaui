import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { deprecate } from '../../lib/deprecate'
import { type Variants } from '../../lib/variants'

/**
 * The cut surface: a region of one ground, bounded by a hard edge.
 *
 * Layers are grounds, and grounds decide the ink. That is why `layer` is the
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
 *
 * The prop was `tone` until 0.7.0. Everywhere else `tone` is a status
 * (neutral, info, success, warn, danger, accent), and a Panel's value is a
 * layer of cloth, so the same word meant two unrelated things; see
 * docs/adr/0008-prop-vocabulary.md.
 */
export const panelVariants = cva('relative min-w-0 rounded-none', {
  variants: {
    layer: {
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
    { layer: 'ink', edge: 'cut', class: 'cut-keyline-on-ink' },
  ],
  defaultVariants: { layer: 'pale', edge: 'cut', padding: 'md', band: 'oro' },
})

export type PanelLayer = NonNullable<Variants<typeof panelVariants>['layer']>

/** @deprecated Since 0.7.0; removed in 1.0.0. Use `PanelLayer`. */
export type PanelTone = PanelLayer

export interface PanelProps extends React.ComponentProps<'div'>, Variants<typeof panelVariants> {
  /** Render as a landmark-free `section` (named by its heading) instead of a `div`. */
  as?: 'div' | 'section' | 'article' | 'aside'
  /**
   * @deprecated Since 0.7.0; removed in 1.0.0. Use `layer`, which takes the
   * same values. `codemods/prop-vocabulary.ts` rewrites call sites.
   */
  tone?: PanelLayer
}

export function Panel({ as: Tag = 'div', className, layer: layerProp, tone, edge, padding, band, ...props }: PanelProps) {
  if (tone !== undefined) {
    deprecate('panel-tone', { what: '<Panel tone>', instead: '<Panel layer>', removal: '1.0.0' })
  }
  const layer = layerProp ?? tone ?? 'pale'
  return (
    <Tag
      data-slot="panel"
      data-layer={layer}
      // Kept beside data-layer until the `tone` prop goes, for selectors
      // written against it.
      data-tone={layer}
      className={cn(panelVariants({ layer, edge, padding, band }), className)}
      {...props}
    />
  )
}
