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

export interface TooltipProps extends Omit<React.ComponentProps<'div'>, 'children' | 'content' | 'role'> {
  /** The element that triggers it. Must be focusable — usually a Button or IconButton. */
  children: React.ReactElement
  /**
   * The label: a few words, no interactive content. It reaches a screen reader
   * only as the trigger's description, and not at all on touch, so it must
   * repeat something said elsewhere rather than be the only place it lives.
   */
  content: React.ReactNode
  /** Keys, in order: `['⌘', 'K']`. */
  shortcut?: string[]
  /** Which side of the trigger it appears on, `top` by default. Base UI flips it when there is no room. */
  side?: TooltipPrimitive.Positioner.Props['side']
  /** How it lines up along that side, `center` by default. */
  align?: TooltipPrimitive.Positioner.Props['align']
  /** Whether it is showing, when you control it. Rarely needed: hover and focus open it already. */
  open?: boolean
  /** Shows it on first render without controlling it afterwards. */
  defaultOpen?: boolean
  /** Called when hover, focus or Escape would open or close it, with the next state. */
  onOpenChange?: TooltipPrimitive.Root.Props['onOpenChange']
  /** Overrides the provider's delay for this tooltip. */
  delay?: number
  /** Never open: for a trigger whose label is already visible in this state. */
  disabled?: boolean
}

/**
 * `className`, `ref` and the rest of the DOM props go to the tooltip popup;
 * the trigger is `children`, which keeps its own.
 */
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
  disabled,
  className,
  ...props
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} disabled={disabled}>
      <TooltipPrimitive.Trigger delay={delay} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} align={align} sideOffset={6} className="z-(--z-popover)">
          <TooltipPrimitive.Popup
            {...props}
            data-slot="tooltip"
            className={cn(
              'on-ink flex max-w-xs items-center gap-2 rounded-none px-2 py-1.5',
              'font-ui text-xs leading-snug font-medium',
              'origin-(--transform-origin) transition-[opacity,transform]',
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
              <span dir="ltr" className="flex items-center gap-0.5">
                {/* Keyed by position: the same glyph can appear twice (⇧ ⇧), and
                    a shortcut's keys never reorder, not even in a right-to-left
                    page (see Kbd), hence `dir="ltr"` on the row and each key. */}
                {shortcut.map((key, i) => (
                  <kbd
                    key={i}
                    dir="ltr"
                    className="inline-grid h-[18px] min-w-[18px] place-items-center px-1 font-ui text-2xs font-semibold text-on-ink-muted rule-ring"
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
