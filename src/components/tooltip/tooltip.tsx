'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useControllable } from '../../lib/use-controllable'
import { type TooltipMessages, tooltipMessages } from './messages'

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
 * exist on touch. Pair it with an `IconButton`'s `label`, not instead of it.
 *
 * ── what a screen reader gets ──
 * The popup is `role="tooltip"` and, while it is open, the trigger is
 * `aria-describedby` it — the APG tooltip pattern. Base UI renders neither,
 * so "Re-run from this step ⌘⇧R" used to exist only for sighted users. The
 * description is wired only while open because the popup is unmounted when
 * closed, and an `aria-describedby` that points at nothing is worse than none.
 *
 * Shortcut glyphs are drawn as keys but spoken as words: "⌘⇧R" read aloud is
 * "R", or nothing, so the keys are hidden and a sentence ("Command Shift R")
 * stands in for them.
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
  /** Overrides the words the tooltip says on its own: the spoken names of shortcut keys. */
  messages?: MessagesOverride<TooltipMessages>
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
  messages,
  className,
  ...props
}: TooltipProps) {
  const [t] = useMessages('tooltip', tooltipMessages, messages)
  const generatedId = React.useId()
  const popupId = props.id ?? generatedId
  // Base UI owns the open state; this mirrors it so the trigger is described
  // only while the popup it points at exists.
  // Base UI's own `onOpenChange` is called below with its details, so the
  // hook is told nothing to report.
  const [isOpen, setIsOpen] = useControllable({ value: open, defaultValue: defaultOpen ?? false })
  // Joined with the trigger's own description, not replacing it.
  const ownDescription = (children.props as { 'aria-describedby'?: string })['aria-describedby']
  const describedBy = [ownDescription, isOpen ? popupId : undefined].filter(Boolean).join(' ') || undefined

  return (
    <TooltipPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      disabled={disabled}
      onOpenChange={(next, details) => {
        setIsOpen(next)
        onOpenChange?.(next, details)
      }}
    >
      {/* Set on the element rather than on Trigger: Base UI lets the rendered
          element's own props win, so a trigger with its own description
          would have dropped the tooltip's. */}
      <TooltipPrimitive.Trigger
        delay={delay}
        render={React.cloneElement(children, { 'aria-describedby': describedBy } as React.HTMLAttributes<HTMLElement>)}
      />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} align={align} sideOffset={6} className="z-(--z-popover)">
          <TooltipPrimitive.Popup
            {...props}
            id={popupId}
            role="tooltip"
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
              <>
                <span aria-hidden dir="ltr" className="flex items-center gap-0.5">
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
                <span className="sr-only">, {shortcut.map((key) => t.keys[key] ?? key).join(' ')}</span>
              </>
            ) : null}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
