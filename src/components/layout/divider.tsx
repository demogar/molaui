import type * as React from 'react'

import { cn } from '../../lib/cn'

export type DividerBand = 'oro' | 'rojo' | 'anil' | 'verde' | 'cloth'

const BAND: Record<DividerBand, string> = {
  oro: 'band-oro',
  rojo: 'band-rojo',
  anil: 'band-anil',
  verde: 'band-verde',
  cloth: 'band-cloth',
}

export interface DividerProps extends React.ComponentProps<'div'> {
  /**
   * `keyline` — the decorative 1px rule. Between rows, between fields.
   * `relleno` — the filler slit: a band of colour cut by fine ink lines. For
   *             the seam between two parts of a page, not between list items.
   * `diente`  — the sawtooth left where one ground is cut away from another.
   *             For the major seam only, where the page gives way to a filled
   *             panel. Set `color` on the element to choose the ground.
   */
  variant?: 'keyline' | 'relleno' | 'diente'
  /** The colour of a `relleno` divider's band, gold by default. Ignored by the other variants. */
  band?: DividerBand
  /**
   * `vertical` stretches to the height of a flex row, for a seam between
   * columns or toolbar groups. `diente` is horizontal only. Announced only
   * when you also pass `role="separator"`.
   */
  orientation?: 'horizontal' | 'vertical'
  /** Teeth pointing up — for the top edge of a filled panel. */
  up?: boolean
}

/**
 * The system's three dividers, in rising order of weight and rarity.
 *
 * A hairline is the default and the commonest; relleno replaces the hairline
 * only where a hairline would be too weak — a section seam, a pull quote — and
 * in a real panel the diente is the slow, expensive cut, so there are only a
 * few. A page with relleno between every card has turned the texture into
 * wallpaper.
 *
 * Every one is decorative: a separator that carries no information is
 * `role="none"` rather than `role="separator"`, so a screen reader does not
 * announce "separator" between every pair of rows. Pass `role="separator"`
 * when the division itself is meaningful.
 */
export function Divider({
  variant = 'keyline',
  band = 'oro',
  orientation = 'horizontal',
  up = false,
  className,
  ...props
}: DividerProps) {
  const vertical = orientation === 'vertical'
  return (
    <div
      data-slot="divider"
      role="none"
      aria-orientation={props.role === 'separator' ? orientation : undefined}
      className={cn(
        'shrink-0',
        variant === 'keyline' && (vertical ? 'w-px self-stretch bg-keyline' : 'h-px w-full bg-keyline'),
        variant === 'relleno' && [
          BAND[band],
          vertical
            ? // the slits run across a vertical seam, so the gradient turns with it
              'w-[11px] self-stretch bg-(--band) bg-[repeating-linear-gradient(0deg,var(--ink)_0_2px,transparent_2px_9px)] cut-ink'
            : 'relleno w-full',
        ],
        variant === 'diente' && ['w-full text-ink', up ? 'diente-up' : 'diente'],
        className,
      )}
      {...props}
    />
  )
}
