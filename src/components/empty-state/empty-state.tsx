import { cva, type VariantProps } from 'class-variance-authority'
import { Inbox, Lock, SearchX, TriangleAlert } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The state a panel is in when it has nothing to show — designed as a
 * condition rather than as an apology.
 *
 * A blank rectangle with grey text reads as something that failed to load. A
 * cut panel filled with relleno reads as a slot cut and waiting, which is
 * what relleno is FOR in a real mola: packing the area that has nothing in it
 * yet. The texture sits at 9% ink, under the content rather than competing
 * with it, and the copy sits on a raised-cloth plate so it never reads across
 * the slits.
 *
 * Four variants, because they are four different conversations with the
 * operator and conflating them is how an empty filter result ends up telling
 * someone to "create your first saved reply":
 *
 *   empty          nothing exists yet — the action creates the first one
 *   no-results     things exist, the filter hides them — the action clears it
 *   error          the panel could not load — the action retries; rojo seam
 *   no-permission  it exists and is not yours to see — say who can grant it
 *
 * The icon is a small ink square-cut glyph, not an illustration. An
 * illustration in an internal tool is charm the operator scrolls past on the
 * fortieth visit; the words have to do the work either way.
 */
export const emptyStateVariants = cva(
  'relative grid place-items-center rounded-none bg-cloth-shade relleno-field shadow-cut px-6',
  {
    variants: {
      variant: {
        empty: 'band-cloth',
        'no-results': 'band-cloth',
        error: 'band-rojo',
        'no-permission': 'band-oro',
      },
      size: {
        sm: 'py-8',
        md: 'py-14',
        lg: 'py-24',
      },
    },
    defaultVariants: { variant: 'empty', size: 'md' },
  },
)

type Variant = NonNullable<VariantProps<typeof emptyStateVariants>['variant']>

const ICON: Record<Variant, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  empty: Inbox,
  'no-results': SearchX,
  error: TriangleAlert,
  'no-permission': Lock,
}

export interface EmptyStateProps
  extends Omit<React.ComponentProps<'div'>, 'title'>,
    VariantProps<typeof emptyStateVariants> {
  title: React.ReactNode
  description?: React.ReactNode
  /** One or two buttons. The first is the way forward. */
  actions?: React.ReactNode
  /** Replace the variant's icon, or `false` for none. */
  icon?: React.ReactNode | false
  headingLevel?: 2 | 3 | 4
}

export function EmptyState({
  variant,
  size,
  title,
  description,
  actions,
  icon,
  headingLevel = 3,
  className,
  ...props
}: EmptyStateProps) {
  const v = variant ?? 'empty'
  const Icon = ICON[v]
  const Heading = `h${headingLevel}` as const
  return (
    <div
      data-slot="empty-state"
      data-variant={v}
      role={v === 'error' ? 'alert' : undefined}
      className={cn(emptyStateVariants({ variant: v, size }), className)}
      {...props}
    >
      {v === 'error' || v === 'no-permission' ? (
        <div aria-hidden className="relleno absolute inset-x-0 top-0" />
      ) : null}
      <div className="flex max-w-sm flex-col items-center bg-cloth-pale px-6 py-5 text-center shadow-cut">
        {icon !== false ? (
          <span aria-hidden className="mb-3 grid size-9 place-items-center bg-ink text-on-ink [&_svg]:size-[18px]">
            {icon ?? <Icon strokeWidth={2} />}
          </span>
        ) : null}
        <Heading className="m-0 font-display text-lg font-bold leading-snug tracking-display wdth-display">{title}</Heading>
        {description ? <p className="mt-1.5 mb-0 text-sm text-ink-2">{description}</p> : null}
        {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
