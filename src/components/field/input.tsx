import { Input as InputPrimitive } from '@base-ui/react/input'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { type FieldControlSize, fieldControlClasses, fieldControlSizes } from './field-control'

export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  /** Height and type from the density tokens. */
  size?: FieldControlSize
  /** Inside the cut, before the text: an icon, a currency sign, a protocol. */
  leading?: React.ReactNode
  /** Inside the cut, after the text: a unit ("ms", "tokens"), a button. */
  trailing?: React.ReactNode
}

/**
 * A text control: an `<input>` inside a box that wears the shared control
 * classes. The box is always there, so the icon or unit of an adorned input
 * sits inside the same keyline as the text rather than beside it — a unit
 * outside the box reads as a second field.
 *
 * `className` styles the box (`data-slot="input-group"`); `ref`, `id` and
 * every other prop go to the `<input>` (`data-slot="input"`). Until 0.7.0
 * the box was drawn only with adornments, and `className` went to the
 * `<input>` without them and to the box with them, so `className="w-64"`
 * changed meaning when an icon was added.
 *
 * The box takes the focus ring with `:focus-within`, which is the one way
 * the ring can surround the adornments as well as the text. Clicking an
 * adornment is not a dead zone: the box is a `<label>`-free div, so a press
 * on it or on the leading slot is forwarded to the input instead.
 */
export function Input({ className, size = 'md', leading, trailing, disabled, ...props }: InputProps) {
  return (
    <div
      data-slot="input-group"
      data-disabled={disabled ? '' : undefined}
      onPointerDown={(event) => {
        // Pressing the box or an adornment focuses the text, as a native
        // input's padding would. Buttons inside `trailing` keep their own press.
        const target = event.target as HTMLElement
        if (target.closest('button, a, input')) return
        event.preventDefault()
        event.currentTarget.querySelector('input')?.focus()
      }}
      className={cn(
        fieldControlClasses,
        fieldControlSizes[size],
        'flex items-center gap-2 cursor-text',
        'focus-within:focus-ring focus-within:hover:focus-ring',
        'has-[[aria-invalid=true]]:band-danger has-[[aria-invalid=true]]:cut-band',
        'has-[[aria-invalid=true]]:focus-within:cut-band-focus',
        'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
        // Read-only was styled on the bare input only; the box carries it now.
        'has-[input:read-only]:bg-cloth-shade',
        '[&_svg]:size-(--icon) [&_svg]:shrink-0',
        className,
      )}
    >
      {leading ? (
        <span aria-hidden className="flex shrink-0 items-center text-ink-muted">
          {leading}
        </span>
      ) : null}
      <InputPrimitive
        data-slot="input"
        disabled={disabled}
        className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 [font-size:inherit] text-ink outline-none placeholder:text-ink-muted focus:shadow-none focus-visible:shadow-none disabled:cursor-not-allowed disabled:text-ink-muted"
        {...props}
      />
      {trailing ? <span className="flex shrink-0 items-center text-sm text-ink-muted tabular">{trailing}</span> : null}
    </div>
  )
}
