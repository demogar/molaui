import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The validation message every form part shows: `Field`, `Fieldset` and
 * `CheckboxGroup`. One element, so the mark, the ink and the announcement rule
 * cannot drift between the three.
 *
 * It is marked, not only coloured: a rojo message on cloth measures 5.04:1,
 * so colour alone would pass contrast and still fail 1.4.1. The small cut
 * square is the mark an invalid step uses in an agent run, so the state
 * survives greyscale and forced colours.
 *
 * `announce` decides `role="alert"`. It is on when this message is the only
 * announcement there is, and off inside a `Form` with a `FormErrorSummary`,
 * which announces every error once by taking focus (form-context.ts).
 *
 * @internal Not exported from the package.
 */
export function ErrorMessage({
  announce,
  className,
  children,
  ...props
}: React.ComponentProps<'span'> & { announce: boolean }) {
  return (
    <span
      role={announce ? 'alert' : undefined}
      {...props}
      className={cn('flex items-start gap-2 text-xs leading-snug font-medium text-ink-danger', className)}
    >
      <span aria-hidden className="mt-[0.3em] size-2 shrink-0 bg-danger shadow-cut" />
      <span>{children}</span>
    </span>
  )
}
