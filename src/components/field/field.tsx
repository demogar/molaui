'use client'

import * as React from 'react'

import { cn } from '../../lib/cn'
import { Label } from './label'

/**
 * Label, control, and either a hint or an error — wired together so the
 * caller cannot forget the half of it a screen reader depends on.
 *
 * ── children is a render prop, not `React.cloneElement` ──
 * cloneElement would silently overwrite an `id` or `aria-describedby` the
 * caller had already set, and it type-checks against nothing: a `<div>` child
 * that cannot accept `aria-invalid` compiles and ships broken. The render prop
 * costs one line at the call site and puts the wiring in the JSX where a
 * reviewer can see it:
 *
 *   <Field label="Email" required error={errors.email}>
 *     {(control) => <Input {...control} type="email" name="email" />}
 *   </Field>
 *
 * The props are named as the DOM attributes they become, so `{...control}`
 * spreads onto any control — `Input`, `Textarea`, a `Select` trigger, a bare
 * `<select>` — without the caller re-mapping three names by hand.
 *
 * ── the error is announced with role="alert" ──
 * The error element is mounted only when `error` is set, and `role="alert"`
 * announces on insertion. That matches how validation actually runs: on
 * submit, focus moves to the FIRST invalid control, and every other field's
 * error would otherwise appear in silence. A polite region would queue those
 * behind the announcement the focus move is already making.
 *
 * The known limit, stated rather than hidden: several fields failing at once
 * fires several alerts, and screen readers coalesce or clobber them. The fix
 * is an error summary at the top of the form that takes focus — a form-level
 * concern, deliberately not owned by `Field`.
 *
 * ── the error is marked, not only coloured ──
 * A rojo message on cloth measures 5.04:1, so colour alone would pass contrast
 * — and still fail 1.4.1, which forbids colour being the only signal. The
 * message carries a small cut square, the same mark an invalid step uses in
 * an agent run, so the state survives greyscale and forced colours.
 */

/** The wiring `Field` computes, ready to spread onto the control. */
export interface FieldControlProps {
  id: string
  required: boolean
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

export interface FieldProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  label: React.ReactNode
  /** Supporting copy under the control. */
  hint?: React.ReactNode
  /** Alias of `hint`, for callers who think of it as a description. `hint` wins if both are set. */
  description?: React.ReactNode
  /** Validation message under the control. Its presence is what marks the field invalid. */
  error?: React.ReactNode
  required?: boolean
  /** Renders the "Optional" tag. Ignored when `required`. */
  optional?: boolean
  /** Something to the right of the label: a character count, a "Reset" link. */
  labelAside?: React.ReactNode
  children: (control: FieldControlProps) => React.ReactNode
}

export function Field({
  label,
  hint,
  description,
  error,
  required = false,
  optional = false,
  labelAside,
  className,
  children,
  ...props
}: FieldProps) {
  const uid = React.useId()
  const id = `${uid}-control`
  const hintId = `${uid}-hint`
  const errorId = `${uid}-error`
  const help = hint ?? description

  // DOM order, so a screen reader reads the description in the order it is
  // rendered rather than in an order only this file knows about.
  const describedBy: string[] = []
  if (help) describedBy.push(hintId)
  if (error) describedBy.push(errorId)

  return (
    <div data-slot="field" className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id} required={required} optional={optional && !required}>
          {label}
        </Label>
        {labelAside ? <span className="text-xs text-ink-muted tabular">{labelAside}</span> : null}
      </div>
      {children({
        id,
        required,
        'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {help ? (
        <span id={hintId} className="block text-xs leading-snug text-ink-muted">
          {help}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="flex items-start gap-2 text-xs leading-snug font-medium text-ink-danger"
        >
          <span aria-hidden className="mt-[0.3em] size-2 shrink-0 bg-rojo shadow-cut" />
          <span>{error}</span>
        </span>
      ) : null}
    </div>
  )
}
