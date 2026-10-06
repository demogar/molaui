'use client'

import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { ChoiceField } from '../checkbox/choice-field'

/**
 * A radio here is a SQUARE, and that is the most argued-with decision in the
 * form set, so the argument is written down.
 *
 * The round radio is a convention, not an affordance: what tells a person
 * "one of these" is the grouping, the legend and the behaviour — arrow keys
 * move the choice, Tab leaves the group — not the circle. A circle is also
 * the only curve that would exist anywhere in this system, and a single
 * rounded control in a world cut with a blade reads as a component imported
 * from somewhere else.
 *
 * So the radio is distinguished from the checkbox by its MARK instead of its
 * outline. A checkbox fills completely and has a check cut out of it; a radio
 * keeps its cloth and has a smaller solid square set inside, inset by a ring
 * of the ground — a mola's concentric layers, read from the top. At 16px the
 * two are unmistakable side by side, which is the only test that matters.
 *
 * Semantics are untouched by any of this: Base UI renders `role="radio"`
 * inside `role="radiogroup"`, so every screen reader announces "radio button,
 * 2 of 4" regardless of the shape on screen.
 */
const radioClasses = [
  'relative inline-grid size-4 shrink-0 place-items-center rounded-none',
  'bg-cloth-pale shadow-cut band-oro [--cut-reveal:2px]',
  'transition-[box-shadow,background-color] duration-(--motion-cut) ease-cut',
  'hover:cut-band focus-visible:shadow-[var(--focus-ring)]',
  'data-invalid:band-rojo data-invalid:cut-band',
  'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:hover:shadow-cut',
] as const

export interface RadioProps extends Omit<RadioPrimitive.Root.Props, 'className'> {
  className?: string
  label?: React.ReactNode
  description?: React.ReactNode
}

export function Radio({ className, label, description, ...props }: RadioProps) {
  const uid = React.useId()
  const descriptionId = description ? `${uid}-description` : undefined

  const control = (
    <RadioPrimitive.Root
      data-slot="radio"
      aria-describedby={descriptionId}
      className={cn(radioClasses, !label && className)}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2 bg-ink data-unchecked:hidden data-disabled:bg-ink-muted" />
    </RadioPrimitive.Root>
  )

  if (!label) return control

  return (
    <ChoiceField
      slot="radio-field"
      control={control}
      label={label}
      description={description}
      descriptionId={descriptionId}
      className={className}
    />
  )
}

export interface RadioGroupProps extends Omit<RadioGroupPrimitive.Props, 'className'> {
  /** The question the options answer. Names the radiogroup. */
  label: React.ReactNode
  description?: React.ReactNode
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

/**
 * The group, named by a visible label in the rótulo register via
 * `aria-labelledby` — a radiogroup with no name is announced as "group" and
 * nothing else, which leaves a screen reader user choosing between options to
 * a question they never heard.
 */
export function RadioGroup({
  label,
  description,
  orientation = 'vertical',
  className,
  children,
  ...props
}: RadioGroupProps) {
  const uid = React.useId()
  const labelId = `${uid}-label`
  const descriptionId = description ? `${uid}-description` : undefined
  return (
    <div data-slot="radio-group-field" className={cn('flex flex-col', className)}>
      <span id={labelId} className="mb-3 rotulo text-ink-2">
        {label}
      </span>
      {description ? (
        <p id={descriptionId} className="-mt-1.5 mb-3 text-xs text-ink-muted">
          {description}
        </p>
      ) : null}
      <RadioGroupPrimitive
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row flex-wrap gap-x-6 gap-y-3',
        )}
        {...props}
      >
        {children}
      </RadioGroupPrimitive>
    </div>
  )
}
