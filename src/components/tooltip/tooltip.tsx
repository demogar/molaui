'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * A tooltip is the inverse panel at its smallest: ink ground, cloth type. It
 * is the one floating surface that is NOT raised cloth, on purpose — a
 * tooltip is a label, not a place, and it should never be mistaken for
 * something you can move the pointer into and click. The ink ground also makes
 * it the only thing on screen at that value, so a 12px label is found at a
 * glance against a dense table.
 *
 * No blur: a label does not float, it is pinned. The keyline is unnecessary
 * on a dark panel against light cloth, and in the dark theme the panel turns
 * to cloth itself — still the inverse, still found at a glance.
 *
 * `shortcut` is part of the API rather than left to children because the
 * single most useful thing a tooltip in a tool can say, after the name, is how
 * to do it without the pointer. The keys are drawn on the ink ground with the
 * on-ink keyline, so they read as keys rather than as more words.
 *
 * Wrap a region in `TooltipProvider` so moving along a toolbar shows the next
 * tooltip instantly after the first one's delay — the delay is for the first
 * hover, not for every icon in a row.
 *
 * A tooltip must never be the only place information lives: it does not
 * exist on touch, and it is not reachable by a screen reader except as the
 * trigger's description. Pair it with an `IconButton`'s `label`, not instead
 * of it.
 */

export function TooltipProvider({ delay = 500, closeDelay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} closeDelay={closeDelay} {...props} />
}

export interface TooltipProps {
  /** The element that triggers it. Must be focusable — usually a Button or IconButton. */
  children: React.ReactElement
  content: React.ReactNode
  /** Keys, in order: `['⌘', 'K']`. */
  shortcut?: string[]
  side?: TooltipPrimitive.Positioner.Props['side']
  align?: TooltipPrimitive.Positioner.Props['align']
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: TooltipPrimitive.Root.Props['onOpenChange']
  /** Overrides the provider's delay for this tooltip. */
  delay?: number
  className?: string
}

export function Tooltip({
  children,
  content,
  shortcut,
  side = 'top',
  align = 'center',
  open,
  defaultOpen,
  onOpenChange,
  delay,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger delay={delay} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} align={align} sideOffset={6} className="z-50">
          <TooltipPrimitive.Popup
            data-slot="tooltip"
            className={cn(
              'on-ink flex max-w-xs items-center gap-2 rounded-none px-2 py-1.5',
              'font-ui text-xs leading-snug font-medium',
              'origin-(--transform-origin) transition-[opacity,transform] duration-(--motion-cut) ease-cut',
              'data-starting-style:opacity-0 data-starting-style:scale-[0.97]',
              'data-ending-style:opacity-0',
              // Moving from one trigger to the next inside a provider swaps
              // content instantly; animating that would make the label lag.
              'data-instant:transition-none',
              className,
            )}
          >
            <span>{content}</span>
            {shortcut && shortcut.length > 0 ? (
              <span className="flex items-center gap-0.5">
                {shortcut.map((key) => (
                  <kbd
                    key={key}
                    className="inline-grid h-[18px] min-w-[18px] place-items-center px-1 font-ui text-2xs font-semibold text-on-ink-muted shadow-[0_0_0_1px_var(--keyline-on-ink)]"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            ) : null}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
