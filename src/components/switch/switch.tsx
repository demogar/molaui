'use client'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { joinIds } from '../../lib/merge-props'
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
  /**
   * Classes for the switch itself, with or without a `label`. A string, not Base
   * UI's state function: use the `data-checked` and `data-disabled` variants for
   * state.
   */
  className?: string
  /** Classes for the label row a `label` adds around the control. `className` always styles the switch itself. */
  wrapperClassName?: string
  /** Visible label. The whole label is the press target and names the switch. */
  label?: React.ReactNode
  /** Second line under the label: what turning it on does. Linked as the switch's description. */
  description?: React.ReactNode
  /** Put the label before the switch — for settings lists, where labels align left and switches right. */
  labelPosition?: 'start' | 'end'
}

/** `className`, `ref` and the DOM props go to the switch, with or without a `label`; see `Checkbox`. */
export function Switch({
  className,
  wrapperClassName,
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
      className={cn(
        'group/switch relative inline-flex h-5 w-9 shrink-0 items-center rounded-none p-[3px]',
        'bg-cloth-shade shadow-cut band-accent [--cut-reveal:2px]',
        'transition-[background-color,box-shadow]',
        'hover:cut-band active:cut-band active:band-ink focus-visible:focus-ring',
        'data-checked:bg-verde data-checked:forced-selected',
        'data-disabled:cursor-not-allowed data-disabled:bg-disabled data-disabled:hover:shadow-cut',
        className,
      )}
      {...props}
      // Joined, not replaced: Field passes its hint and error here, and the
      // control's own description comes first because it is drawn first.
      aria-describedby={joinIds(descriptionId, props['aria-describedby'])}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-3.5 rounded-none bg-ink forced-ink',
          'transition-transform duration-(--motion-base)',
          'data-checked:translate-x-4 rtl:data-checked:-translate-x-4 data-checked:bg-on-layer data-checked:cut-ink data-checked:forced-on-selected',
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
      className={wrapperClassName}
    />
  )
}
