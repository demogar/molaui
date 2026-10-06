import type * as React from 'react'

import { cn } from '../../lib/cn'

export type RotuloBand = 'oro' | 'rojo' | 'anil' | 'verde' | 'cloth'

const BAND: Record<RotuloBand, string> = {
  oro: 'band-oro',
  rojo: 'band-rojo',
  anil: 'band-anil',
  verde: 'band-verde',
  cloth: 'band-cloth',
}

export interface RotuloProps extends React.ComponentProps<'p'> {
  /**
   * The revealed band before the label. Defaults to rojo: on light cloth, gold
   * measures 1.66:1 and the mark disappears. Gold is for ink grounds.
   */
  band?: RotuloBand
  /** Drop the band and keep only the lettering — for a label inside a dense header. */
  plain?: boolean
}

/**
 * The label register — Archivo pushed out along its width axis, cut short by a
 * band of the layer beneath.
 *
 * This replaces the eyebrow, and the difference is not cosmetic: an eyebrow
 * sits above a heading and pre-announces it, which is a habit rather than a
 * hierarchy — the heading was always going to say it better. A rótulo sits
 * UNDER the block it belongs to and reads as attribution: who says this, what
 * kind of thing it is. Placing one above a heading puts the old element back
 * under a new name.
 */
export function Rotulo({ className, band = 'rojo', plain = false, ...props }: RotuloProps) {
  return (
    <p
      className={cn(
        'm-0 flex items-center gap-2.5 rotulo text-ink-muted',
        !plain && 'before:h-[3px] before:w-7 before:shrink-0 before:bg-(--band) before:content-[""]',
        BAND[band],
        className,
      )}
      {...props}
    />
  )
}
