'use client'

import { Fieldset as FieldsetPrimitive } from '@base-ui/react/fieldset'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { joinIds } from '../../lib/merge-props'
import { ErrorMessage } from '../field/error-message'
import { useFormErrorEntry } from './form-context'

/**
 * Several controls that answer one question, under one legend: an address,
 * a pair of limits, a schedule. A screen reader announces the legend on the
 * way into the group, so “Minimum” and “Maximum” are heard as the minimum and
 * maximum of something.
 *
 * Built on Base UI's `Fieldset`, which renders a real `<fieldset>`, names it
 * by its legend, and carries `disabled` to every Base UI control inside.
 *
 * ── a group can fail as a group ──
 * `error` is for a rule no single control breaks: “the maximum must be above
 * the minimum”, “choose at least one”. It sits under the legend, above the
 * controls, because a group can be taller than the screen and an error under
 * its last control is one nobody scrolls to. It joins the description in the
 * fieldset's `aria-describedby`, which screen readers read on entering the
 * group, and it registers with the enclosing `Form`, so a `FormErrorSummary`
 * lists it and its link focuses the first control in the group.
 *
 * ── disabled is stated ──
 * A disabled fieldset says so in the legend's ink and leaves each control to
 * state its own disabled look. It is never faded: fading takes the keylines
 * with it.
 *
 * `className`, `ref` and the rest of the DOM props go to the `<fieldset>`.
 */
export interface FieldsetProps extends Omit<React.ComponentProps<'fieldset'>, 'children'> {
  /** The question the controls answer, in the label register. It names the group. */
  legend: React.ReactNode
  /** Copy under the legend, read when focus enters the group. */
  description?: React.ReactNode
  /** A rule the group breaks as a whole. Marks the group invalid and is listed by `FormErrorSummary`. */
  error?: React.ReactNode
  /** Disables every control in the group. */
  disabled?: boolean
  children?: React.ReactNode
}

export function Fieldset({
  legend,
  description,
  error,
  disabled = false,
  id: idProp,
  className,
  children,
  ...props
}: FieldsetProps) {
  const uid = React.useId()
  const id = idProp ?? `${uid}-fieldset`
  const descriptionId = `${uid}-description`
  const errorId = `${uid}-error`
  const { announce } = useFormErrorEntry(id, legend, error)

  return (
    <FieldsetPrimitive.Root
      {...props}
      id={id}
      disabled={disabled}
      aria-describedby={joinIds(description ? descriptionId : undefined, error ? errorId : undefined, props['aria-describedby'])}
      data-invalid={error ? '' : undefined}
      data-slot="fieldset"
      className={cn('m-0 flex min-w-0 flex-col gap-3 border-0 p-0', className)}
    >
      <FieldsetPrimitive.Legend className={cn('p-0 rotulo', disabled ? 'text-ink-muted' : 'text-ink-2')}>
        {legend}
      </FieldsetPrimitive.Legend>
      {description ? (
        <p id={descriptionId} className="-mt-1.5 mb-0 text-xs text-ink-muted">
          {description}
        </p>
      ) : null}
      {error ? (
        <ErrorMessage id={errorId} announce={announce}>
          {error}
        </ErrorMessage>
      ) : null}
      {children}
    </FieldsetPrimitive.Root>
  )
}
