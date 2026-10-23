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
 *   cut   the ink keyline. The default; a region in a working tool. Inside
 *         another frame (a Panel, an agent run) it draws the decorative
 *         keyline instead: one cut per nesting level (`cut-frame`, cloth.css).
 *   band  keyline, revealed band, keyline — the signature, for the ONE panel
 *         on a screen that is the point of the screen.
 *   none  a ground with no edge, for a region that sits inside another.
 *
 * The prop was `tone` until 0.7.0. Everywhere else `tone` is a status
 * (neutral, info, success, warn, danger, accent), and a Panel's value is a
 * layer of cloth, so the same word meant two unrelated things; see
 * docs/adr/0010-prop-vocabulary.md.
 */
export const panelVariants = cva('relative min-w-0 rounded-none', {
  variants: {
    /**
     * The ground the panel is cut from, `pale` by default. A filled layer
     * (`rojo`, `anil`, `verde`, `ink`) re-inks everything inside it, so pick
     * it here rather than with a background class.
     */
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
    /**
     * `cut` (default) is the ink keyline, or the decorative keyline when the
     * panel sits inside another framed container; `band` reveals a band of `band`'s
     * colour between two keylines, for the one panel that is the point of the
     * screen; `none` for a ground inside another.
     */
    edge: {
      cut: 'cut-frame',
      band: 'cut-band',
      none: '',
    },
    /** Inner padding on the spacing scale, so it moves with density; `md` by default, `none` for a table or a list that runs edge to edge. */
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    },
    /** The colour revealed by `edge="band"`, gold by default. Has no effect on the other edges. */
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
      // Read by `cut-frame` (cloth.css): a frame inside an edged Panel is
      // nested and draws a keyline, one inside an edgeless one is not.
      data-edge={edge ?? 'cut'}
      // Kept beside data-layer until the `tone` prop goes, for selectors
      // written against it.
      data-tone={layer}
      className={cn(panelVariants({ layer, edge, padding, band }), className)}
      {...props}
    />
  )
}
