'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'
import { Plus } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Disclosure: sections of one document that can be opened one or several at a
 * time — FAQ answers, the advanced settings of an agent, the arguments of a
 * tool call.
 *
 * Items are ruled with the decorative keyline, and the list opens and closes
 * with an ink rule, the same heavy-top / light-rows rhythm the editorial
 * system used for its step lists. The marker is a plus that turns 45° into a
 * cross, not a chevron that flips: a chevron says "this goes somewhere", a
 * plus says "there is more of this here", and the cross is the obvious way to
 * put it back.
 *
 * The panel animates its height through Base UI's measured
 * `--accordion-panel-height`, so nothing is guessed at and reduced motion
 * just snaps. `hiddenUntilFound` is on by default: browser find-in-page opens
 * the section that contains the match, which a closed accordion otherwise
 * hides from Cmd-F entirely.
 */

export interface AccordionProps extends Omit<AccordionPrimitive.Root.Props, 'className'> {
  className?: string
}

export function Accordion({ className, ...props }: AccordionProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('shadow-[inset_0_1.5px_0_var(--ink),inset_0_-1.5px_0_var(--ink)]', className)}
      {...props}
    />
  )
}

export interface AccordionItemProps extends Omit<AccordionPrimitive.Item.Props, 'className'> {
  className?: string
}

export function AccordionItem({ className, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-keyline last:border-b-0', className)}
      {...props}
    />
  )
}

const triggerClasses = [
  'group/trigger flex w-full cursor-pointer items-center gap-3 py-3.5 text-left outline-none',
  'font-ui text-base font-semibold text-ink',
  'hover:text-rojo-deep',
  'focus-visible:shadow-[var(--focus-ring)]',
  'data-disabled:cursor-default data-disabled:text-ink-muted',
]

const markerClasses =
  'ml-auto size-4 shrink-0 text-ink-2 transition-transform duration-(--motion-base) ease-cut group-data-panel-open/trigger:rotate-45'

export interface AccordionTriggerProps extends Omit<AccordionPrimitive.Trigger.Props, 'className'> {
  className?: string
  /** Secondary text on the same line, right of the title — a count, a status. */
  meta?: React.ReactNode
}

export function AccordionTrigger({ className, meta, children, ...props }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="m-0">
      <AccordionPrimitive.Trigger data-slot="accordion-trigger" className={cn(triggerClasses, className)} {...props}>
        <span className="min-w-0 flex-1">{children}</span>
        {meta ? <span className="shrink-0 text-sm font-normal tabular-nums text-ink-muted">{meta}</span> : null}
        <Plus aria-hidden className={markerClasses} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

const panelClasses = [
  'h-(--accordion-panel-height) overflow-hidden text-sm text-ink-2',
  'transition-[height] duration-(--motion-base) ease-cut',
  'data-starting-style:h-0 data-ending-style:h-0',
]

export interface AccordionPanelProps extends Omit<AccordionPrimitive.Panel.Props, 'className'> {
  className?: string
}

export function AccordionPanel({ className, children, hiddenUntilFound = true, ...props }: AccordionPanelProps) {
  return (
    <AccordionPrimitive.Panel data-slot="accordion-panel" hiddenUntilFound={hiddenUntilFound} className={cn(panelClasses)} {...props}>
      <div className={cn('pb-4', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  )
}

/**
 * One disclosure on its own — "Show 12 more fields", "Raw response". No rules,
 * no heading semantics: it is a control inside something else, not a section.
 */
export const Collapsible = CollapsiblePrimitive.Root

export interface CollapsibleTriggerProps extends Omit<CollapsiblePrimitive.Trigger.Props, 'className'> {
  className?: string
}

export function CollapsibleTrigger({ className, children, ...props }: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        'group/trigger inline-flex cursor-pointer items-center gap-1.5 py-1 font-ui text-sm font-semibold text-ink outline-none hover:text-rojo-deep',
        'focus-visible:shadow-[var(--focus-ring)]',
        className,
      )}
      {...props}
    >
      <Plus
        aria-hidden
        className="size-3.5 shrink-0 text-ink-2 transition-transform duration-(--motion-base) ease-cut group-data-panel-open/trigger:rotate-45"
      />
      {children}
    </CollapsiblePrimitive.Trigger>
  )
}

export interface CollapsiblePanelProps extends Omit<CollapsiblePrimitive.Panel.Props, 'className'> {
  className?: string
}

export function CollapsiblePanel({ className, children, ...props }: CollapsiblePanelProps) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-panel"
      className={cn(
        'h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-(--motion-base) ease-cut',
        'data-starting-style:h-0 data-ending-style:h-0',
      )}
      {...props}
    >
      <div className={cn('pt-2', className)}>{children}</div>
    </CollapsiblePrimitive.Panel>
  )
}
