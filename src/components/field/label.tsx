import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * A field label in the rótulo register: Archivo pushed out along its width
 * axis, in caps, at 11px. It reads as lettering stitched onto the panel the
 * control sits in, not as a sentence about it.
 *
 * The required asterisk and the "Optional" tag sit inside the label rather
 * than being left for every caller to re-assemble from two spans.
 *
 * The asterisk is `aria-hidden`: it is a visual convention, and `required` on
 * the control is what makes the requirement programmatically determinable
 * (see `Field`). "Optional" is not hidden — it carries meaning no attribute
 * does. It is preceded by a real space as a text node in the label itself,
 * because the gap drawn between them is a margin, and margins are invisible to
 * name computation: without it the accessible name concatenates to
 * "URLOptional", one word to a screen reader.
 */
export interface LabelProps extends React.ComponentProps<'label'> {
  /** Renders the required asterisk. Does NOT set `required` on any control. */
  required?: boolean
  /** Renders the "Optional" tag. */
  optional?: boolean
}

export function Label({
  className,
  required = false,
  optional = false,
  children,
  ...props
}: LabelProps) {
  return (
    <label data-slot="label" className={cn('block rotulo text-ink-2', className)} {...props}>
      {children}
      {required ? (
        <span aria-hidden className="ml-0.5 text-rojo">
          *
        </span>
      ) : null}
      {optional ? (
        <>
          {' '}
          <span className="ml-1.5 rotulo font-medium tracking-[0.08em] text-ink-muted normal-case">
            Optional
          </span>
        </>
      ) : null}
    </label>
  )
}
