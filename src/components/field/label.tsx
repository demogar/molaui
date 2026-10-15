'use client'

import type * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { type LabelMessages, labelMessages } from './messages'

/**
 * A field label in the rótulo register: Archivo pushed out along its width
 * axis, in caps, at 11px. It reads as lettering stitched onto the panel the
 * control sits in, not as a sentence about it.
 *
 * The required asterisk and the "Optional" tag sit inside the label rather
 * than being left for every caller to re-assemble from two spans.
 *
 * The asterisk is kept out of the accessible name: it is a visual convention,
 * and `required` on the control is what makes the requirement
 * programmatically determinable (see `Field`). It is drawn as generated
 * content with empty alternative text (`content: '*' / ''`), not as an
 * `aria-hidden` span. The span was the first version, and it leaked: while a
 * combobox popup is open Base UI hides everything outside it, the label's
 * wrapper included, and a name computed from a hidden label takes its hidden
 * children too, so the field was announced as "Reviewer*". Text that is not
 * in the DOM cannot leak.
 *
 * "Optional" is not hidden — it carries meaning no attribute does. It is
 * preceded by a real space as a text node in the label itself, because the
 * gap drawn between them is a margin, and margins are invisible to name
 * computation: without it the accessible name concatenates to "URLOptional",
 * one word to a screen reader.
 */
export interface LabelProps extends React.ComponentProps<'label'> {
  /** Renders the required asterisk. Does NOT set `required` on any control. */
  required?: boolean
  /** Renders the "Optional" tag. */
  optional?: boolean
  /** Words for translation: the "Optional" tag. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<LabelMessages>
}

export function Label({
  className,
  required = false,
  optional = false,
  messages,
  children,
  ...props
}: LabelProps) {
  const [t] = useMessages('label', labelMessages, messages)
  return (
    <label
      data-slot="label"
      className={cn(
        'block rotulo text-ink-2',
        required && "after:ms-0.5 after:text-ink after:content-['*'_/_'']",
        className,
      )}
      {...props}
    >
      {children}
      {optional ? (
        <>
          {' '}
          <span className="ms-1.5 rotulo font-medium tracking-figures text-ink-muted normal-case">
            {t.optional}
          </span>
        </>
      ) : null}
    </label>
  )
}
