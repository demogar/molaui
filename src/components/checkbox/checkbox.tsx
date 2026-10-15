'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group'
import { Check, Minus } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { joinIds } from '../../lib/merge-props'
import { ErrorMessage } from '../field/error-message'
import { useFormErrorEntry } from '../form/form-context'
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
  'bg-cloth-pale shadow-cut band-accent [--cut-reveal:2px]',
  'transition-[background-color,box-shadow]',
  // Pressed closes the band with ink: "the states a cut shape can be in", cloth.css.
  'hover:cut-band active:cut-band active:band-ink',
  'focus-visible:focus-ring',
  'data-checked:bg-ink data-checked:text-on-ink data-indeterminate:bg-ink data-indeterminate:text-on-ink',
  'data-invalid:band-danger data-invalid:cut-band aria-invalid:band-danger aria-invalid:cut-band',
  'data-disabled:cursor-not-allowed data-disabled:bg-disabled data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
  // A disabled box that is still checked keeps a deeper ground than an
  // unchecked one, so the state survives. --ink-muted, the disabled ink
  // everywhere else, measures 4.29:1 on --cloth-deep in light, so the mark
  // takes --ink-2 there (7.28 / 8.02). The pair is named for both checked
  // states: with only `data-disabled:` and `data-indeterminate:` competing,
  // which won was left to Tailwind's variant order.
  'data-disabled:data-checked:bg-cloth-deep data-disabled:data-checked:text-ink-2',
  'data-disabled:data-indeterminate:bg-cloth-deep data-disabled:data-indeterminate:text-ink-2',
] as const

export interface CheckboxProps extends Omit<CheckboxPrimitive.Root.Props, 'className'> {
  /**
   * Classes for the box itself, with or without a `label`. A string, not Base UI's
   * state function: use the `data-checked` and `data-disabled` variants for state.
   */
  className?: string
  /** Classes for the label row a `label` adds around the control. `className` always styles the control itself. */
  wrapperClassName?: string
  /** Visible label. The whole label is the press target. */
  label?: React.ReactNode
  /** Second line under the label. Linked as the control's description. */
  description?: React.ReactNode
}

/**
 * `className`, `ref` and the DOM props go to the control, with or without a
 * `label`; the row a `label` adds takes `wrapperClassName`. `className` used
 * to move to that row when a label was set.
 */
export function Checkbox({ className, wrapperClassName, label, description, ...props }: CheckboxProps) {
  const uid = React.useId()
  const descriptionId = description ? `${uid}-description` : undefined

  const box = (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxBoxClasses, className)}
      {...props}
      // Joined, not replaced: Field passes its hint and error here, and the
      // control's own description comes first because it is drawn first.
      aria-describedby={joinIds(descriptionId, props['aria-describedby'])}
    >
      <CheckboxPrimitive.Indicator
        className="flex data-unchecked:hidden [&_svg]:size-(--icon-xs)"
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
      className={wrapperClassName}
    />
  )
}

export interface CheckboxGroupProps extends Omit<CheckboxGroupPrimitive.Props, 'className'> {
  /** The group's name, rendered as the fieldset legend in the label register. */
  legend: React.ReactNode
  /** Copy under the legend. */
  description?: React.ReactNode
  /**
   * A rule the group breaks as a whole, such as “choose at least one”. Shown
   * under the legend, joined to the group's description, and listed by a
   * `FormErrorSummary` in the same `Form`.
   */
  error?: React.ReactNode
  /** Lay options out in a row rather than a column. */
  orientation?: 'vertical' | 'horizontal'
  /** Classes for the `<fieldset>` that holds the legend, the description and the options. */
  className?: string
}

/**
 * A set of checkboxes that share one value array, inside a real fieldset and
 * legend — so a screen reader announces "Tools, group" before the first
 * option and every option is heard in that context, which no `aria-label` on
 * a div reproduces across readers.
 *
 * An `error` is drawn and registered exactly as `Fieldset`'s is (one
 * ErrorMessage, one register), so a group of checkboxes fails the way any
 * other group does.
 */
export function CheckboxGroup({
  legend,
  description,
  error,
  orientation = 'vertical',
  className,
  children,
  ...props
}: CheckboxGroupProps) {
  const uid = React.useId()
  const id = `${uid}-group`
  const descriptionId = `${uid}-description`
  const errorId = `${uid}-error`
  const { announce } = useFormErrorEntry(id, legend, error)
  return (
    <fieldset
      id={id}
      data-slot="checkbox-group"
      data-invalid={error ? '' : undefined}
      aria-describedby={joinIds(description ? descriptionId : undefined, error ? errorId : undefined)}
      className={cn('m-0 min-w-0 border-0 p-0', className)}
    >
      <legend className="mb-3 p-0 rotulo text-ink-2">{legend}</legend>
      {description ? <p id={descriptionId} className="-mt-1.5 mb-3 text-xs text-ink-muted">{description}</p> : null}
      {error ? (
        <ErrorMessage id={errorId} announce={announce} className="mb-3">
          {error}
        </ErrorMessage>
      ) : null}
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
