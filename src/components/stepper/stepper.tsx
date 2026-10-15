'use client'

import { Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useControllable } from '../../lib/use-controllable'
import { Button } from '../button'
import { Form } from '../form'
import { type StepperMessages, stepperMessages } from './messages'

export type { StepperMessages } from './messages'

/**
 * A task split into steps that are done in order: create an agent, connect a
 * data source, invite a team. The step list says where you are and how far
 * there is to go; the panel under it is the current step, and it is a `Form`.
 *
 * ── the panel is a form ──
 * Continue is the form's submit button, so Enter in a text field moves on,
 * and the step validates the way any form does: `onStepSubmit` runs, sets the
 * step's field errors and returns `false`, and the `Form` moves focus to a
 * `FormErrorSummary` in the step (or to the first invalid field). Only a step
 * that passes moves the wizard on. Do not put the Stepper inside another
 * `<form>`; forms cannot nest.
 *
 * ── focus between steps ──
 * When the step changes, by Continue, Back or a step in the list, focus moves
 * to the new step's heading. Without that, Continue unmounts the button that
 * had focus, focus falls to the document, and a screen reader user is left at
 * the top of the page with no word that anything happened. The heading says
 * which step this is ("Step 2 of 4, Model") and the next Tab reaches its
 * first control. On first render focus is left alone: a page that opens on a
 * wizard should not steal focus from the page's own heading.
 *
 * ── state is a glyph, a word and a colour ──
 * Each step in the list has a square marker and a word under its title:
 *
 *   to do          hollow square, its number    “To do”
 *   current        accent square, its number    “Current”, and `aria-current="step"`
 *   done           verde square, a check        “Done”
 *   needs fixing   rojo square, a “!”           “Needs fixing”
 *
 * The bar along the top of each step carries the colour; the marker's shape
 * and the word carry the same state without it, in greyscale and in forced
 * colours.
 *
 * ── which steps can be revisited ──
 * Any step up to the furthest one reached is a button: go back, change an
 * answer, return. Steps beyond it are not buttons, because skipping ahead
 * would skip the validation that Continue runs. They are not disabled
 * buttons either: a disabled control in the tab order says "you could, but
 * not now", and a future step is simply not reachable from here yet.
 *
 * ── reflow ──
 * The list is a grid of steps at least 9rem wide that fills the row, so four
 * steps sit in a row on a desktop, wrap two by two on a tablet and stack on
 * a 320px phone, in every density. A row of connected circles that shrinks
 * to fit was the first idea, and at 320px it leaves the titles one word wide.
 *
 * `className`, `ref` and the rest of the DOM props go to the root `<div>`.
 */

export type StepperStepState = 'upcoming' | 'current' | 'complete' | 'invalid'

export interface StepperStep {
  /** Stable id, used as the `step` value. */
  id: string
  /** Short noun phrase, shown in the list and as the panel's heading: “Model”, “Tools”. */
  title: React.ReactNode
  /** One sentence under the panel heading, saying what this step decides. */
  description?: React.ReactNode
  /** The step was left with problems (a server rejected it, say): its marker says “Needs fixing”. */
  invalid?: boolean
}

export interface StepperProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Names the list of steps, which is a `nav`: “Steps to create an agent”. */
  label: string
  /** The steps, in the order they are done. */
  steps: StepperStep[]
  /** The current step's id, controlled. Pair with `onStepChange`. */
  step?: string
  /** The step to open on, uncontrolled. The first step by default. */
  defaultStep?: string
  /** Called with the new step's id when Continue, Back or a step in the list changes it. */
  onStepChange?: (step: string) => void
  /**
   * Runs when Continue or Finish is pressed, with the step's id and the submit
   * event. Validate here; return `false` (or a promise of `false`) to stay on
   * the step. While a promise is pending, Continue shows it is working.
   */
  onStepSubmit?: (step: string, event: React.FormEvent<HTMLFormElement>) => boolean | void | Promise<boolean | void>
  /** Called after the last step's `onStepSubmit` passes. */
  onComplete?: () => void
  /** Renders the current step's content: its fields, and a `FormErrorSummary` if it has more than one. */
  children: (step: StepperStep, index: number) => React.ReactNode
  /** The level of the panel heading; match the page outline. `h2` by default. */
  headingLevel?: 2 | 3
  /** Words for translation: the buttons, the "Step 2 of 4" line and the state words. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<StepperMessages>
}

export function Stepper({
  label,
  steps,
  step: stepProp,
  defaultStep,
  onStepChange,
  onStepSubmit,
  onComplete,
  children,
  headingLevel = 2,
  messages: overrides,
  className,
  ...props
}: StepperProps) {
  const [t, f] = useMessages('stepper', stepperMessages, overrides)
  const [current, setCurrent] = useControllable<string>({
    value: stepProp,
    defaultValue: () => defaultStep ?? steps[0]?.id ?? '',
    onChange: onStepChange,
  })
  const index = Math.max(0, steps.findIndex((s) => s.id === current))
  const [reached, setReached] = React.useState(() => index)
  const furthest = Math.max(reached, index)
  const [busy, setBusy] = React.useState(false)
  const uid = React.useId()
  const headingId = `${uid}-heading`
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const moved = React.useRef(false)

  const go = (to: number) => {
    const target = steps[to]
    if (!target) return
    moved.current = true
    setReached((r) => Math.max(r, to))
    setCurrent(target.id)
  }

  // Focus follows the step, but only once someone has moved it. A controlled
  // parent that changes `step` itself is a move too, which is why this keys on
  // the step and not on the handlers above.
  const shown = steps[index]?.id
  const first = React.useRef(shown)
  React.useLayoutEffect(() => {
    if (shown === first.current && !moved.current) return
    first.current = undefined
    moved.current = false
    headingRef.current?.focus()
  }, [shown])

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const step = steps[index]
    if (!step || busy) return
    const advance = (result: boolean | void) => {
      if (result === false) return
      if (index === steps.length - 1) onComplete?.()
      else go(index + 1)
    }
    const result = onStepSubmit?.(step.id, event)
    if (result instanceof Promise) {
      setBusy(true)
      result.then(advance, () => {}).finally(() => setBusy(false))
    } else {
      advance(result)
    }
  }

  const step = steps[index]
  if (!step) return null
  const last = index === steps.length - 1
  const Heading = `h${headingLevel}` as const

  return (
    <div {...props} data-slot="stepper" className={cn('flex min-w-0 flex-col gap-6', className)}>
      <nav aria-label={label} data-part="steps">
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-x-3 gap-y-4 p-0">
          {steps.map((s, i) => {
            // Steps before the furthest one reached were submitted, so they are
            // done. The furthest itself was opened but not yet passed: still
            // "To do", though it can be returned to.
            const state: StepperStepState =
              i === index ? 'current' : s.invalid && i <= furthest ? 'invalid' : i < furthest ? 'complete' : 'upcoming'
            const reachable = i !== index && i <= furthest
            const body = (
              <>
                <span aria-hidden data-part="bar" className={cn('block h-1 w-full', BAR[state])} />
                <span className="flex min-w-0 items-start gap-2.5 pt-2.5">
                  <StepMarker state={state} position={i + 1} />
                  <span className="flex min-w-0 flex-col">
                    {/* The name is the visible words, "Basics Done", with a real
                        space between them: flex items are not separated in the
                        name by layout alone, so without it jsdom read
                        "BasicsDone". A hidden comma for a pause was tried and
                        failed axe's label-in-name check: the name then held
                        text that is not on screen. */}
                    <span data-part="title" className="text-sm leading-snug font-semibold text-ink [overflow-wrap:anywhere]">
                      {s.title}
                    </span>{' '}
                    <span data-part="state" className={cn('text-xs leading-snug', STATE_INK[state])}>
                      {t.states[state]}
                    </span>
                  </span>
                </span>
              </>
            )
            return (
              <li key={s.id} aria-current={i === index ? 'step' : undefined} data-state={state} className="min-w-0">
                {reachable ? (
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className="group flex w-full min-w-0 cursor-pointer flex-col pb-1 text-start hover:bg-ink-soft focus-visible:focus-ring focus-visible:outline-none"
                  >
                    {body}
                  </button>
                ) : (
                  <span className="flex min-w-0 flex-col pb-1">{body}</span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <Form data-part="panel" aria-labelledby={headingId} onSubmit={submit} className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span data-part="position" className="rotulo text-ink-muted">
            {f.format(t.stepOf, { position: index + 1, total: steps.length })}
          </span>
          <Heading
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="m-0 font-display text-xl leading-heading font-bold wdth-display tracking-display text-ink focus:outline-none focus-visible:focus-ring"
          >
            {step.title}
          </Heading>
          {step.description ? <p className="m-0 text-sm text-ink-2">{step.description}</p> : null}
        </div>

        {children(step, index)}

        <div data-part="actions" className="flex flex-wrap items-center gap-3 pt-1">
          {index > 0 ? (
            <Button type="button" variant="secondary" onClick={() => go(index - 1)}>
              {t.back}
            </Button>
          ) : null}
          <Button type="submit" loading={busy} className="ms-auto">
            {last ? t.finish : t.continue}
          </Button>
        </div>
      </Form>
    </div>
  )
}

// In forced colours every fill turns to Canvas, so the bars of the steps
// reached are drawn in CanvasText and the ones still to do disappear: the
// line of ink still says how far along the task is.
const BAR: Record<StepperStepState, string> = {
  upcoming: 'bg-keyline',
  current: 'bg-accent forced-ink',
  complete: 'bg-verde forced-ink',
  invalid: 'bg-danger forced-ink',
}

const STATE_INK: Record<StepperStepState, string> = {
  upcoming: 'text-ink-muted',
  current: 'text-ink',
  complete: 'text-ink-success',
  invalid: 'text-ink-danger',
}

const MARKER: Record<StepperStepState, string> = {
  upcoming: 'bg-cloth-pale text-ink-muted',
  current: 'bg-accent text-on-accent',
  complete: 'bg-verde text-on-layer',
  invalid: 'bg-danger text-on-layer',
}

/**
 * The square: its number while there is something to do, a check once done,
 * a “!” when it needs fixing. Not `forced-ink`: a CanvasText fill would leave
 * the number the same colour as its ground. In forced colours the fill goes
 * to Canvas, the cut becomes an outline, and the glyph carries the state.
 */
function StepMarker({ state, position }: { state: StepperStepState; position: number }) {
  return (
    <span
      aria-hidden
      data-part="marker"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center font-ui text-xs font-bold tabular-nums shadow-cut',
        MARKER[state],
      )}
    >
      {state === 'complete' ? <Check className="size-(--icon-xs)" strokeWidth={3} /> : state === 'invalid' ? '!' : position}
    </span>
  )
}
