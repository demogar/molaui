'use client'

import { Form as FormPrimitive } from '@base-ui/react/form'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { FormErrorContext, FormErrorStore, focusEntry } from './form-context'

/**
 * A `<form>` that knows which of its fields are failing, so it can do the one
 * thing a field cannot: decide where focus goes when Save finds problems.
 *
 * ── what it does on submit ──
 * Your `onSubmit` runs first and validates (set each `Field`'s `error`). Then,
 * once those errors have rendered:
 *
 *   - with a `FormErrorSummary` inside, focus moves to the summary, which
 *     lists every error as a link to its field. One announcement, made by the
 *     focus move, instead of one alert per field.
 *   - without one, focus moves to the first invalid control, in document
 *     order. This is what the settings pattern and the form example used to
 *     write by hand, with a `requestAnimationFrame` and an
 *     `[aria-invalid="true"]` query.
 *
 * A submit that finds nothing wrong moves nothing.
 *
 * ── why the timing is a component, not a timer ──
 * The errors are React state set inside the submit handler, so they are not
 * in the DOM when the handler returns. The settings pattern waited a frame,
 * which works until a field renders a frame late. Here the focus move runs in
 * a layout effect of an element rendered after every field, so it sees the
 * registrations those fields made in the same commit, and it runs before the
 * browser paints: no frame where the errors are visible and focus is still on
 * the Save button.
 *
 * Errors that arrive later (a server answering after the request) are not a
 * submit, so focus is left alone: call `focus()` on the summary's ref then.
 *
 * ── Base UI underneath ──
 * Base UI's `Form` renders the element, sets `noValidate` (the browser's own
 * bubbles would race the summary and never match the design), and focuses
 * the first invalid Base UI `Field.Root` if you use those directly. Mola's
 * `Field` registers with this component instead, because Base UI's register
 * only knows its own `Field.Root`.
 *
 * `className`, `ref` and the rest of the DOM props go to the `<form>`.
 */
export interface FormProps extends React.ComponentProps<'form'> {
  /**
   * Runs on submit, before focus is moved. Validate here and set your fields'
   * errors; call `event.preventDefault()` unless you want the browser to post
   * the form.
   */
  onSubmit?: React.FormEventHandler<HTMLFormElement>
}

export function Form({ className, onSubmit, children, ...props }: FormProps) {
  const [store] = React.useState(() => new FormErrorStore())
  const [submits, setSubmits] = React.useState(0)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    onSubmit?.(event)
    setSubmits((n) => n + 1)
  }

  return (
    <FormErrorContext.Provider value={store}>
      <FormPrimitive
        {...props}
        data-slot="form"
        onSubmit={submit}
        className={cn(className)}
      >
        {children}
        <FocusAfterSubmit store={store} submits={submits} />
      </FormPrimitive>
    </FormErrorContext.Provider>
  )
}

/**
 * Rendered last inside the form, so its layout effect runs after every field's
 * in the same commit (effects run in tree order) and reads their errors fresh.
 */
function FocusAfterSubmit({ store, submits }: { store: FormErrorStore; submits: number }) {
  const handled = React.useRef(submits)
  React.useLayoutEffect(() => {
    if (handled.current === submits) return
    handled.current = submits
    const entries = store.current()
    if (entries.length === 0) return
    if (store.hasSummary()) {
      store.requestFocus()
      return
    }
    const first = entries[0]
    if (first) focusEntry(first.id)
  }, [store, submits])
  return null
}
