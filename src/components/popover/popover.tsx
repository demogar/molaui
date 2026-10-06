'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { floatingSurface } from './surface'

/**
 * A non-modal panel anchored to the control that opened it — filters on a
 * table column, the details of a run step, a share sheet.
 *
 * It is the system's floating surface in its plainest form: raised cloth, the
 * ink keyline, the one blur. No arrow. An arrow is a tail drawn to say "I
 * came from there", and the transform origin already says it with motion; a
 * zero-radius panel with a triangle bolted on also reads as a speech bubble,
 * which is a different world's vocabulary.
 *
 * `title` and `description` are optional props rather than mandatory parts,
 * but when given they are wired to `aria-labelledby`/`aria-describedby` by
 * Base UI — a popover with a heading should be named by it.
 */

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close

export interface PopoverContentProps extends Omit<PopoverPrimitive.Popup.Props, 'className' | 'title'> {
  className?: string
  side?: PopoverPrimitive.Positioner.Props['side']
  align?: PopoverPrimitive.Positioner.Props['align']
  sideOffset?: number
  /** Heading, wired as the popover's accessible name. */
  title?: React.ReactNode
  description?: React.ReactNode
}

export function PopoverContent({
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  title,
  description,
  children,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <PopoverPrimitive.Popup
          data-slot="popover"
          className={cn(floatingSurface, 'w-72 max-w-[calc(100vw-2rem)] p-4', className)}
          {...props}
        >
          {title ? (
            <PopoverPrimitive.Title className="m-0 font-display text-base font-semibold leading-snug wdth-display">
              {title}
            </PopoverPrimitive.Title>
          ) : null}
          {description ? (
            <PopoverPrimitive.Description className="mt-1 mb-0 text-sm text-ink-2">
              {description}
            </PopoverPrimitive.Description>
          ) : null}
          {title || description ? <div className={children ? 'mt-3' : undefined}>{children}</div> : children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}
