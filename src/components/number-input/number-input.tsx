'use client'

import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field'
import { Minus, Plus } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { mergeProps } from '../../lib/merge-props'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useControllable } from '../../lib/use-controllable'
import { type FieldControlSize, fieldControlClasses, fieldControlSizes } from '../field/field-control'
import { Label } from '../field/label'
import { type NumberInputMessages, numberInputMessages } from './messages'

/**
 * A number you can type, step and trust: a token budget, a retry count, a
 * timeout in milliseconds.
 *
 * ── Base UI's NumberField, not `<input type="number">` ──
 * The native control was the first draft, and it fails three ways in a tool:
 * it formats nothing (12000 tokens reads as 12000, not 12,000), its spinner is
 * a pair of browser-styled arrows from no design system, and Chrome changes
 * the value when the page is scrolled over a focused field. NumberField
 * parses and formats with `Intl.NumberFormat` for the `locale` passed (so
 * `de-DE` types 1.500,5 and `ar-EG` shows Arabic-Indic digits), clamps to
 * `min`/`max`, and owns the keyboard: ArrowUp/Down by `step`, Shift by
 * `largeStep`, Alt by `smallStep`, Home/End to the bounds. PageUp/PageDown
 * are added here, by `largeStep`, because the APG spinbutton pattern lists
 * them and operators reach for them on long ranges.
 *
 * ── the wheel is off unless asked for ──
 * `allowWheelScrub` lets the wheel change a focused, hovered field. It is
 * opt-in: in a long settings form the wheel is how people scroll, and a
 * value that changed under the pointer on the way down is a silent edit.
 * Turn it on for a field that IS the focus of its screen.
 *
 * ── the steppers sit at the end, inside the cut ──
 * − and + share the field's keyline, split from the text by a hairline, so a
 * number field is one shape the height of every other control. They are not
 * tab stops (Base UI keeps them out of the order, as the APG does): the
 * keyboard already has the arrows, and two extra stops per number field
 * double the Tab presses through a form. At a bound the stepper that would
 * cross it is disabled — shaded, not faded, like every disabled control.
 *
 * ── a unit is part of the field's description ──
 * `unit` draws a short suffix inside the cut ("tokens", "ms") and adds it to
 * the input's accessible description, so "Timeout, 30" is heard as "30, ms".
 * For units Intl knows, prefer `format={{ style: 'unit', unit: 'millisecond' }}`
 * or a currency format: the unit is then in the value itself, localised.
 *
 * ── the DOM props go to the input ──
 * `ref`, `id`, `data-*`, `aria-*`, focus, key and clipboard props all go to
 * the `<input>`, the element that takes focus and the value; `className`
 * styles the box around it (the element with the cut), with or without a
 * `label`; the wrapper a `label` adds takes `wrapperClassName`. The rest
 * used to land on Base UI's Root, a `<div>`, so a ref held the wrapper,
 * autofocus did nothing and a key handler saw the div as its target. Only
 * the number field's own settings (`min`, `step`, `format`, `name`…) go to
 * the Root, and a consumer's `onKeyDown` is merged with the PageUp/PageDown
 * handler rather than replacing it.
 */
export interface NumberInputProps
  extends Omit<
    React.ComponentProps<'input'>,
    'value' | 'defaultValue' | 'onChange' | 'size' | 'children' | 'min' | 'max' | 'step' | 'type'
  > {
  /** Visible label above the field. Omit inside `Field`, which renders its own. */
  label?: React.ReactNode
  /**
   * Control height, shared with Input and Select so the field lines up in a form
   * row. Defaults to `md`; density rescales every size.
   */
  size?: FieldControlSize
  /** Classes for the wrapper that holds `label` and the field. Only rendered with a `label`. */
  wrapperClassName?: string
  /** Short unit suffix inside the cut: "tokens", "ms", "%". Also added to the accessible description. */
  unit?: string
  /** The number, controlled. `null` is an empty field; leave it `undefined` to let the field hold its own state. */
  value?: number | null
  /** The number on first render, uncontrolled. Omitted, the field starts empty. */
  defaultValue?: number
  /**
   * Called as the number changes, typed or stepped, with `null` when the field is
   * emptied. For a save or a request, use `onValueCommitted`, which does not fire
   * per keystroke.
   */
  onValueChange?: (value: number | null) => void
  /** Called when the value is committed: on blur, Enter or a stepper press, not per keystroke. */
  onValueCommitted?: NumberFieldPrimitive.Root.Props['onValueCommitted']
  /**
   * The lowest value. Stepping and committed values clamp to it, and the decrease
   * stepper is disabled there; Home jumps to it.
   */
  min?: number
  /**
   * The highest value. Stepping and committed values clamp to it, and the increase
   * stepper is disabled there; End jumps to it.
   */
  max?: number
  /** ArrowUp/Down step. */
  step?: number | 'any'
  /** Shift+Arrow and PageUp/PageDown step. */
  largeStep?: number
  /** Alt+Arrow step. */
  smallStep?: number
  /**
   * Keep a typed value outside `min`/`max` instead of clamping it on commit, so form
   * validation can say why it is wrong. Off by default; the steppers still stop at
   * the bounds.
   */
  allowOutOfRange?: boolean
  /** Let the wheel change a focused, hovered field. Off by default; see above. */
  allowWheelScrub?: boolean
  /**
   * Round to the nearest multiple of the step when stepping, so 13 stepped by 5 goes
   * to 15 rather than 18. Off by default.
   */
  snapOnStep?: boolean
  /** `Intl.NumberFormat` options: grouping, decimals, a unit or a currency. */
  format?: Intl.NumberFormatOptions
  /** BCP 47 tag for parsing and formatting. `undefined` uses the runtime's locale. */
  locale?: Intl.LocalesArgument
  /** Accessible names of the steppers. */
  incrementLabel?: string
  /** Accessible name of the − stepper. Defaults to "Decrease"; translate it with the page. */
  decrementLabel?: string
  /** Words for translation: the steppers' default names. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<NumberInputMessages>
}

const stepperClasses = [
  'grid h-full aspect-square shrink-0 place-items-center text-ink-2 select-none',
  'transition-colors',
  // Pressed was an ink fill, which is what a chosen value looks like
  // (Foundations/Layers); a stepper chooses nothing, so it takes the pressed
  // cut every edgeless control takes.
  'hover:bg-ink-soft hover:text-ink active:bg-ink-soft active:cut-press',
  'data-disabled:cursor-not-allowed data-disabled:bg-disabled data-disabled:text-ink-muted data-disabled:hover:bg-disabled data-disabled:active:bg-disabled data-disabled:active:shadow-none',
  '[&_svg]:size-(--icon-sm)',
] as const

export function NumberInput({
  label,
  size = 'md',
  className,
  style,
  wrapperClassName,
  unit,
  id,
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  min,
  max,
  step,
  largeStep = 10,
  smallStep,
  allowOutOfRange,
  allowWheelScrub,
  snapOnStep,
  format,
  locale: localeProp,
  incrementLabel,
  decrementLabel,
  messages,
  'aria-describedby': ariaDescribedBy,
  required,
  disabled,
  readOnly,
  name,
  form,
  ...inputProps
}: NumberInputProps) {
  const [t, f] = useMessages('numberInput', numberInputMessages, messages)
  const locale = localeProp ?? f.locale
  const uid = React.useId()
  const inputId = id ?? `${uid}-input`
  const unitId = `${uid}-unit`

  // Held here as well as in Base UI so PageUp/PageDown can step from the
  // current value; Base UI gets it back as a controlled `value`.
  const [current, commit] = useControllable<number | null>({
    value,
    defaultValue: defaultValue ?? null,
    onChange: onValueChange,
  })

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'PageUp' && event.key !== 'PageDown') return
    if (disabled || readOnly) return
    event.preventDefault()
    const delta = event.key === 'PageUp' ? largeStep : -largeStep
    let next = (current ?? min ?? 0) + delta
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    // Steps like 0.1 accumulate float error; round to the step's precision.
    const decimals = Math.max(decimalPlaces(largeStep), decimalPlaces(typeof step === 'number' ? step : 1))
    commit(Number(next.toFixed(decimals)))
  }

  const describedBy = [ariaDescribedBy, unit ? unitId : undefined].filter(Boolean).join(' ') || undefined

  // The input never gets narrower than the longest number it will show: `max`
  // when there is one, else the current value or `min`, formatted the way the
  // field formats it. It was `min-w-0 flex-1`, so the unit and the steppers
  // kept their width and the number took what was left; at spacious density
  // that left a 21px input showing "40,0" of 40,000. In `ch`, because
  // tabular figures are each exactly one `ch` wide, plus one for the
  // separators and the caret. Measured in en-US when no locale is given: the
  // runtime default differs between server and browser, which would make the
  // style a hydration mismatch, and grouping changes the length by nothing
  // that one spare `ch` does not cover. The input is also `w-0` (it grows
  // with `flex-1`): an input's intrinsic width is about twenty characters,
  // and that, not the number, set the field's minimum, which ran 14–26px past
  // a 320px phone on Linux, where the default size measures wider.
  const longest = [max, current, min]
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    .map((n) => {
      try {
        return new Intl.NumberFormat(locale ?? 'en-US', format).format(n).length
      } catch {
        return String(n).length
      }
    })
  const minChars = longest.length ? Math.max(...longest) + 1 : undefined

  const field = (
    <NumberFieldPrimitive.Group
      data-slot="number-input"
      style={style}
      className={cn(
        fieldControlClasses,
        fieldControlSizes[size],
        'flex items-center gap-2 pe-0 cursor-text',
        'focus-within:focus-ring focus-within:hover:focus-ring',
        'has-[[aria-invalid=true]]:band-danger has-[[aria-invalid=true]]:cut-band',
        'has-[[aria-invalid=true]]:focus-within:cut-band-focus',
        'data-disabled:cursor-not-allowed data-disabled:bg-disabled data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
        className,
      )}
    >
      <NumberFieldPrimitive.Input
        // The consumer's handlers sit to the right, so they run first and
        // can call event.preventBaseUIHandler() to stop PageUp/PageDown.
        {...mergeProps<'input'>({ onKeyDown }, inputProps)}
        aria-describedby={describedBy}
        style={minChars ? { minWidth: `${minChars}ch` } : undefined}
        className={cn(
          'h-full w-0 min-w-0 flex-1 border-0 bg-transparent p-0 [font-size:inherit] text-ink tabular-nums outline-none placeholder:text-ink-muted focus:shadow-none focus-visible:shadow-none disabled:cursor-not-allowed disabled:text-ink-muted',
          // A figure carries its unit (Foundations/Content), so with one the
          // value sits against it: "12 runs", not "12" at one end of the field
          // and "runs" at the other. Tabular, so the digits do not jitter as it
          // steps.
          unit && 'text-end',
        )}
      />
      {unit ? (
        <span id={unitId} className="shrink-0 text-sm text-ink-muted">
          {unit}
        </span>
      ) : null}
      <span className="flex h-full shrink-0 items-stretch">
        <span aria-hidden className="w-px bg-keyline forced-ink" />
        <NumberFieldPrimitive.Decrement aria-label={decrementLabel ?? t.decrease} className={cn(stepperClasses)}>
          <Minus aria-hidden strokeWidth={2.5} />
        </NumberFieldPrimitive.Decrement>
        <span aria-hidden className="w-px bg-keyline forced-ink" />
        <NumberFieldPrimitive.Increment aria-label={incrementLabel ?? t.increase} className={cn(stepperClasses)}>
          <Plus aria-hidden strokeWidth={2.5} />
        </NumberFieldPrimitive.Increment>
      </span>
    </NumberFieldPrimitive.Group>
  )

  return (
    <NumberFieldPrimitive.Root
      // Base UI puts the Root's id on the input and points the steppers'
      // aria-controls at it; an id set on the input itself breaks that link.
      id={inputId}
      value={current}
      onValueChange={(next) => commit(next)}
      onValueCommitted={onValueCommitted}
      min={min}
      max={max}
      step={step}
      largeStep={largeStep}
      smallStep={smallStep}
      allowOutOfRange={allowOutOfRange}
      allowWheelScrub={allowWheelScrub}
      snapOnStep={snapOnStep}
      format={format}
      locale={locale}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      name={name}
      form={form}
      data-slot={label ? 'number-input-field' : undefined}
      className={label ? cn('flex flex-col gap-2', wrapperClassName) : 'contents'}
    >
      {label ? (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      ) : null}
      {field}
    </NumberFieldPrimitive.Root>
  )
}

function decimalPlaces(n: number) {
  const text = String(n)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}
