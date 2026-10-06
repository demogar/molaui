import { CircleHelp } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../../lib/cn'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

const WORD: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}
const FILLED: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 }
const FILL: Record<ConfidenceLevel, string> = { high: 'bg-verde', medium: 'bg-oro', low: 'bg-rojo' }

export interface ConfidenceProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  level: ConfidenceLevel
  /** What the confidence rests on — "3 sources agree", "single source". */
  basis?: string
}

/**
 * How sure the system is, in three steps and in words.
 *
 * Three, not a percentage. "87.3% confident" claims a calibration no
 * language model has, and an operator who sees a precise number treats it as
 * a measurement. Three coarse levels say what can honestly be said — strong,
 * mixed or thin support — and the `basis` says why, which is the part an
 * operator can actually check.
 *
 * Three cut segments filled to the level, plus the word; the segments differ
 * in count, not only colour, so the meter reads in greyscale.
 */
export function Confidence({ level, basis, className, ...props }: ConfidenceProps) {
  return (
    <span data-slot="confidence" data-level={level} className={cn('inline-flex items-center gap-2 font-ui text-xs text-ink-2', className)} {...props}>
      <span aria-hidden className="inline-flex gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('h-2.5 w-[7px] shadow-cut', i < FILLED[level] ? FILL[level] : 'bg-cloth-pale')} />
        ))}
      </span>
      <span className="font-semibold text-ink">{WORD[level]}</span>
      {basis ? <span className="text-ink-muted">· {basis}</span> : null}
    </span>
  )
}

export interface UncertaintyNoteProps extends React.ComponentProps<'aside'> {
  /** The short claim — "Unverified figure". Defaults to "The model is unsure". */
  title?: string
  /** An action that resolves it — "Open the dashboard". */
  action?: React.ReactNode
}

/**
 * Where the model flags its own doubt, in the answer, next to the claim.
 *
 * Añil, the system's informational layer, on its wash — deliberately not
 * gold or red. Uncertainty is not a warning that something went wrong; it is
 * information the reader needs to weigh the answer, and dressing it as an
 * alarm teaches people to ignore it. The note says what to verify, and ideally
 * offers the action that verifies it.
 */
export function UncertaintyNote({ title = 'The model is unsure', action, className, children, ...props }: UncertaintyNoteProps) {
  return (
    <aside
      data-slot="uncertainty-note"
      aria-label={title}
      className={cn('flex gap-3 bg-anil-soft px-4 py-3 shadow-[inset_3px_0_0_var(--anil)]', className)}
      {...props}
    >
      <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-anil" />
      <div className="min-w-0 flex-1">
        <p className="m-0 font-ui text-sm font-semibold text-ink">{title}</p>
        <div className="mt-1 font-ui text-sm text-ink-on-tint">{children}</div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </aside>
  )
}
