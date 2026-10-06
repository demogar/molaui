'use client'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { ChoiceField } from '../checkbox/choice-field'

/**
 * A switch is a cut rectangle with a square that slides along it. It is for
 * settings that take effect immediately — streaming on, a tool enabled, a flag
 * live — and never for a choice that waits for a Save button; that is a
 * checkbox, and mixing the two in one form tells the operator something has
 * already happened when it has not.
 *
 * ── why "on" is verde, not ink ──
 * Ink is already "selected" everywhere in the system: a checked box, a chosen
 * segment, a pressed chip. A switch is not a selection, it is a state of
 * something running, and verde is the layer the system reserves for "live" —
 * the same green as a succeeded agent step and a healthy service. So a column
 * of switches reads at a glance as which things are on, not which rows are
 * selected. Colour is never the only signal: the square also moves end to end,
 * and the track's ink keyline is kept in both states.
 */
export interface SwitchProps extends Omit<SwitchPrimitive.Root.Props, 'className'> {
  className?: string
  label?: React.ReactNode
  description?: React.ReactNode
  /** Put the label before the switch — for settings lists, where labels align left and switches right. */
  labelPosition?: 'start' | 'end'
}

export function Switch({
  className,
  label,
  description,
  labelPosition = 'end',
  ...props
}: SwitchProps) {
  const uid = React.useId()
  const descriptionId = description ? `${uid}-description` : undefined

  const control = (
    <SwitchPrimitive.Root
      data-slot="switch"
      aria-describedby={descriptionId}
      className={cn(
        'group/switch relative inline-flex h-5 w-9 shrink-0 items-center rounded-none p-[3px]',
        'bg-cloth-shade shadow-cut band-oro [--cut-reveal:2px]',
        'transition-[background-color,box-shadow] duration-(--motion-cut) ease-cut',
        'hover:cut-band focus-visible:shadow-[var(--focus-ring)]',
        'data-checked:bg-verde data-checked:forced-selected',
        'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:hover:shadow-cut',
        !label && className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-3.5 rounded-none bg-ink forced-ink',
          'transition-transform duration-(--motion-base) ease-cut',
          'data-checked:translate-x-4 data-checked:bg-on-layer data-checked:shadow-[0_0_0_1.5px_var(--ink)] data-checked:forced-on-selected',
          'data-disabled:bg-ink-muted',
        )}
      />
    </SwitchPrimitive.Root>
  )

  if (!label) return control

  return (
    <ChoiceField
      slot="switch-field"
      control={control}
      label={label}
      description={description}
      descriptionId={descriptionId}
      labelPosition={labelPosition}
      className={className}
    />
  )
}
