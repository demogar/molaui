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
 * A text control. Without adornments it is the bare `<input>` wearing the
 * shared control classes; with them, the CUT moves to a wrapper and the input
 * inside goes transparent, so the icon or unit sits inside the same keyline
 * as the text rather than beside it — a unit outside the box reads as a
 * second field.
 *
 * The wrapper takes the focus ring with `:focus-within`, which is the one way
 * the ring can surround the adornments as well as the text. Clicking an
 * adornment is not a dead zone: the wrapper is a `<label>`-free div, so the
 * leading slot forwards its pointer-down to the input instead.
 */
export function Input({
  className,
  size = 'md',
  leading,
  trailing,
  disabled,
  ...props
}: InputProps) {
  if (!leading && !trailing) {
    return (
      <InputPrimitive
        data-slot="input"
        disabled={disabled}
        className={cn(fieldControlClasses, fieldControlSizes[size], className)}
        {...props}
      />
    )
  }

  return (
    <div
      data-slot="input-group"
      data-disabled={disabled ? '' : undefined}
      onPointerDown={(event) => {
        // Pressing the wrapper or an adornment focuses the text, as a native
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
        'focus-within:shadow-[var(--focus-ring)] focus-within:hover:shadow-[var(--focus-ring)]',
        'has-[[aria-invalid=true]]:band-rojo has-[[aria-invalid=true]]:cut-band',
        'has-[[aria-invalid=true]]:focus-within:shadow-[var(--focus-ring)]',
        'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
        '[&_svg]:size-4 [&_svg]:shrink-0',
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
