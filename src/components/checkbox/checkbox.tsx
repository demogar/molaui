'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group'
import { Check, Minus } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { ChoiceField } from './choice-field'

/**
 * A square cut from the cloth. Unchecked, it is raised cloth inside an ink
 * keyline; checked, the square is filled with ink and the mark is cut out of
 * it in cloth — the same inversion a selected chip and a selected segment
 * make, so "on" looks the same wherever it appears.
 *
 * Indeterminate is a bar, not a dimmed check: a parent row whose children are
 * partly selected is a distinct third state, and a half-faded tick reads as a
 * rendering glitch rather than as "some".
 *
 * The box is 16px at every density on purpose. It sits inside a row whose
 * height the density tokens already set, and a box that shrank to 12px in a
 * compact table would fall under any honest reading of a target — the row is
 * the target, the label is clickable, and the square only has to be legible.
 */
export const checkboxBoxClasses = [
  'relative inline-grid size-4 shrink-0 place-items-center rounded-none',
  'bg-cloth-pale text-on-ink shadow-cut band-oro [--cut-reveal:2px]',
  'transition-[background-color,box-shadow] duration-(--motion-cut) ease-cut',
  'hover:cut-band',
  'focus-visible:shadow-[var(--focus-ring)]',
  'data-checked:bg-ink data-indeterminate:bg-ink',
  'data-invalid:band-rojo data-invalid:cut-band aria-invalid:band-rojo aria-invalid:cut-band',
  'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
  'data-disabled:data-checked:bg-cloth-deep',
] as const

export interface CheckboxProps extends Omit<CheckboxPrimitive.Root.Props, 'className'> {
  className?: string
  /** Visible label. The whole label is the press target. */
  label?: React.ReactNode
  /** Second line under the label. Linked as the control's description. */
  description?: React.ReactNode
}

export function Checkbox({ className, label, description, ...props }: CheckboxProps) {
  const uid = React.useId()
  const descriptionId = description ? `${uid}-description` : undefined

  const box = (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      aria-describedby={descriptionId}
      className={cn(checkboxBoxClasses, !label && className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex data-unchecked:hidden [&_svg]:size-3"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? (
              <Minus aria-hidden strokeWidth={3.5} />
            ) : (
              <Check aria-hidden strokeWidth={3.5} />
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  )

  if (!label) return box

  return (
    <ChoiceField
      slot="checkbox-field"
      control={box}
      label={label}
      description={description}
      descriptionId={descriptionId}
      className={className}
    />
  )
}

export interface CheckboxGroupProps extends Omit<CheckboxGroupPrimitive.Props, 'className'> {
  /** The group's name, rendered as the fieldset legend in the label register. */
  legend: React.ReactNode
  /** Copy under the legend. */
  description?: React.ReactNode
  /** Lay options out in a row rather than a column. */
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

/**
 * A set of checkboxes that share one value array, inside a real fieldset and
 * legend — so a screen reader announces "Tools, group" before the first
 * option and every option is heard in that context, which no `aria-label` on
 * a div reproduces across readers.
 */
export function CheckboxGroup({
  legend,
  description,
  orientation = 'vertical',
  className,
  children,
  ...props
}: CheckboxGroupProps) {
  return (
    <fieldset data-slot="checkbox-group" className={cn('m-0 min-w-0 border-0 p-0', className)}>
      <legend className="mb-3 p-0 rotulo text-ink-2">{legend}</legend>
      {description ? <p className="-mt-1.5 mb-3 text-xs text-ink-muted">{description}</p> : null}
      <CheckboxGroupPrimitive
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row flex-wrap gap-x-6 gap-y-3',
        )}
        {...props}
      >
        {children}
      </CheckboxGroupPrimitive>
    </fieldset>
  )
}
