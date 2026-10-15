'use client'

import * as React from 'react'

import { cn } from '../../lib/cn'
import { useMergedRefs } from '../../lib/merge-props'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { FormErrorContext, focusEntry } from './form-context'
import { type FormErrorSummaryMessages, formErrorSummaryMessages } from './messages'

/**
 * Every error in the form, at the top of it, each one a link to its field.
 *
 * ── announced once, by focus ──
 * The summary takes focus on the submit that produced errors (`Form` asks it
 * to), and that focus move is the announcement: a screen reader reads the
 * summary's name, "3 fields need fixing", and the list is right there to read
 * on. It is deliberately NOT a live region as well. GOV.UK's summary was both
 * an alert and focused for years, and some screen readers read it twice; the
 * per-field `role="alert"`s it replaces made that worse, firing three to six
 * announcements in one tick. While a summary is mounted, each field's error
 * drops its alert and stays in the control's description.
 *
 * As fields are fixed the list shrinks without a word: the person is typing
 * in the field, and an announcement about the summary would interrupt the
 * field they are in. When the last error goes, the summary goes.
 *
 * ── links that move focus, not only the scroll ──
 * Each entry is a real link to `#<control id>`, so it works as a link (copy,
 * middle-click, read as "link"), but a fragment link only scrolls; it does not
 * focus an `<input>`, and a fieldset cannot take focus at all. The click is
 * handled: it scrolls the whole field into view, label included, and focuses
 * the control, or the first control in a fieldset.
 *
 * ── the look ──
 * A danger callout's material: the rojo relleno seam along the top, the
 * danger wash, the keyline. Each link reads "Label: message", because "Must be
 * between 1 and 900" means nothing in a list that has left the field behind.
 *
 * It lists what the form's `Field`s, `Fieldset`s and `CheckboxGroup`s
 * register, so it must be inside a `Form`; outside one it renders nothing.
 *
 * `className`, `ref` and the rest of the DOM props go to the root `<div>`,
 * which is what takes focus.
 */
export interface FormErrorSummaryProps extends Omit<React.ComponentProps<'div'>, 'title' | 'children'> {
  /**
   * The heading, which is also the summary's accessible name and what a
   * screen reader says when it takes focus. Pass a function to word it for
   * the count. Defaults to “1 field needs fixing” / “3 fields need fixing”
   * (`messages.title`, which is where a translation goes).
   */
  title?: React.ReactNode | ((count: number) => React.ReactNode)
  /** A sentence under the heading: what happens next, or what is kept. */
  description?: React.ReactNode
  /** The heading element. Match the form's outline; `h2` by default. */
  headingLevel?: 2 | 3 | 4
  /** Words for translation: the default heading, by count. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<FormErrorSummaryMessages>
}

export function FormErrorSummary({
  title,
  description,
  headingLevel = 2,
  messages,
  className,
  ref,
  ...props
}: FormErrorSummaryProps) {
  const [t, f] = useMessages('formErrorSummary', formErrorSummaryMessages, messages)
  const store = React.useContext(FormErrorContext)
  const own = React.useRef<HTMLDivElement>(null)
  const mergedRef = useMergedRefs(own, ref)
  const titleId = React.useId()
  const snapshot = React.useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.getSnapshot ?? emptySnapshot,
    emptySnapshot,
  )

  React.useLayoutEffect(() => store?.addSummary(), [store])

  if (process.env.NODE_ENV !== 'production' && !store) {
    console.error('Mola UI: <FormErrorSummary> lists the errors of the <Form> it is in, and renders nothing outside one.')
  }

  const handled = React.useRef(snapshot.focusRequest)
  const count = snapshot.entries.length
  React.useLayoutEffect(() => {
    if (handled.current === snapshot.focusRequest) return
    handled.current = snapshot.focusRequest
    if (count > 0) own.current?.focus()
  }, [snapshot.focusRequest, count])

  if (count === 0) return null

  const Heading = `h${headingLevel}` as const
  return (
    <div
      role="region"
      aria-labelledby={titleId}
      tabIndex={-1}
      {...props}
      ref={mergedRef}
      data-slot="form-error-summary"
      className={cn('bg-danger-soft band-danger text-ink shadow-cut', className)}
    >
      <div aria-hidden data-part="seam" className="relleno h-2" />
      <div className="px-4 pt-3.5 pb-4">
        <Heading id={titleId} data-part="title" className="m-0 font-ui text-sm font-semibold leading-snug text-ink">
          {typeof title === 'function' ? title(count) : (title ?? f.plural(t.title, count))}
        </Heading>
        {description ? (
          <p data-part="description" className="mt-1 mb-0 text-sm leading-body text-ink-2">
            {description}
          </p>
        ) : null}
        <ul data-part="list" className="mt-2 mb-0 flex list-none flex-col gap-1.5 p-0">
          {snapshot.entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2 text-sm leading-snug">
              <span aria-hidden className="mt-[0.4em] size-2 shrink-0 bg-danger shadow-cut" />
              <a
                href={`#${entry.id}`}
                onClick={(event) => {
                  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
                  if (focusEntry(entry.id)) event.preventDefault()
                }}
                // At least 24px tall, the WCAG 2.5.8 floor: one line of text
                // is 16px, and the links are stacked 6px apart, too close for
                // the spacing exception.
                className="min-h-[24px] min-w-0 text-ink underline decoration-ink-muted underline-offset-2 hover:decoration-ink focus-visible:focus-ring focus-visible:outline-none"
              >
                <span className="font-semibold">{entry.label}</span>: {entry.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const noopSubscribe = () => () => {}
const EMPTY = { entries: [], focusRequest: 0 }
const emptySnapshot = () => EMPTY
