import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The layout a checkbox, radio or switch takes when it has a visible label:
 * control in a fixed column, label beside it, description beneath the label.
 *
 * The description sits OUTSIDE the `<label>` element on purpose. Base UI names
 * the control from its enclosing label, so a description inside it was read
 * twice — once glued onto the name ("Retry failed tool callsUp to three
 * times…") and once more as the description. Outside, the name is the label
 * alone and the description arrives through `aria-describedby`.
 *
 * The label uses `display: contents`, so it adds no box of its own to the grid
 * while every click on the control or its text still toggles it.
 */
export interface ChoiceFieldProps {
  control: React.ReactNode
  label: React.ReactNode
  description?: React.ReactNode
  descriptionId?: string
  /** `start` puts the label first and pushes the control to the far edge — settings lists. */
  labelPosition?: 'start' | 'end'
  slot: string
  className?: string
}

export function ChoiceField({
  control,
  label,
  description,
  descriptionId,
  labelPosition = 'end',
  slot,
  className,
}: ChoiceFieldProps) {
  const start = labelPosition === 'start'
  return (
    <div
      data-slot={slot}
      className={cn(
        'inline-grid items-start gap-x-2.5 gap-y-0.5 text-base leading-snug text-ink',
        start ? 'grid-cols-[1fr_auto] gap-x-4' : 'grid-cols-[auto_1fr]',
        'has-data-disabled:text-ink-muted',
        className,
      )}
    >
      <label className="contents cursor-pointer has-data-disabled:cursor-not-allowed">
        <span className={cn('row-start-1 flex h-[1lh] items-center', start ? 'col-start-2' : 'col-start-1')}>
          {control}
        </span>
        <span className={cn('row-start-1 cursor-pointer', start ? 'col-start-1' : 'col-start-2')}>{label}</span>
      </label>
      {description ? (
        <span id={descriptionId} className={cn('row-start-2 text-xs text-ink-muted', start ? 'col-start-1' : 'col-start-2')}>
          {description}
        </span>
      ) : null}
    </div>
  )
}
