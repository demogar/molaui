import { cva, type VariantProps } from 'class-variance-authority'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { IconButton } from '../button'

/**
 * A message that belongs to a region of the page — "this agent is using a
 * deprecated model", "billing is in read-only mode" — rather than to a moment,
 * which is a toast's job.
 *
 * ── why a relleno seam, not a left bar ──
 * The thick coloured left border is the default callout of every admin
 * template of the last decade, and in this system it would be a soft-edged
 * stripe with nothing to do with the material. The mola answer is the
 * relleno: the layer colour as a field, slit with ink, along the TOP edge —
 * the same seam that opens a dialog. It reads as "a layer of this colour was
 * cut back here", it is the first thing the eye crosses on the way into the
 * message, and it carries tone in a mark that is 11px of solid colour rather
 * than a 4px sliver that disappears on a dim screen.
 *
 * Below the seam the ground is the layer's WASH, mixed into raised cloth at
 * the percentage tokens.css measured to keep the whole ink ramp legal, and the
 * whole thing is bounded by the ink keyline like every other cut shape. The
 * icon is coloured; the title and body never are — colour owns the region,
 * never the reading column.
 *
 * A callout is static. One that appears in response to something the operator
 * did should be rendered inside a live region, or be a toast.
 */
export const calloutVariants = cva('relative rounded-none shadow-cut text-ink', {
  variants: {
    tone: {
      neutral: 'bg-ink-soft band-cloth',
      info: 'bg-anil-soft band-anil',
      success: 'bg-verde-soft band-verde',
      warn: 'bg-oro-soft band-oro',
      danger: 'bg-rojo-soft band-rojo',
    },
  },
  defaultVariants: { tone: 'info' },
})

export type CalloutTone = NonNullable<VariantProps<typeof calloutVariants>['tone']>

const ICON: Record<CalloutTone, React.ComponentType<{ className?: string }>> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warn: TriangleAlert,
  danger: CircleAlert,
}

/**
 * The icon reads against its wash, and a graphic needs 3:1. Each of these
 * measures above it on its own wash; `--rojo-on-shade` rather than `--rojo`
 * because the wash eats the margin `--rojo` had on cloth.
 */
const ICON_INK: Record<CalloutTone, string> = {
  neutral: 'text-ink-2',
  info: 'text-anil',
  success: 'text-verde',
  warn: 'text-warn',
  danger: 'text-rojo-on-shade',
}

export interface CalloutProps
  extends Omit<React.ComponentProps<'div'>, 'title'>,
    VariantProps<typeof calloutVariants> {
  title?: React.ReactNode
  /** Buttons under the body. Usually one secondary, at `size="sm"`. */
  actions?: React.ReactNode
  /** Renders a dismiss button. The caller owns whether it comes back. */
  onDismiss?: () => void
  /** Replace the tone's default icon, or `false` for none. */
  icon?: React.ReactNode | false
  /** The heading element for `title`. */
  headingLevel?: 2 | 3 | 4 | 5
}

export function Callout({
  tone,
  title,
  actions,
  onDismiss,
  icon,
  headingLevel = 3,
  className,
  children,
  ...props
}: CalloutProps) {
  const t = tone ?? 'info'
  const Icon = ICON[t]
  const Heading = `h${headingLevel}` as const
  const titleId = React.useId()
  return (
    <div
      data-slot="callout"
      data-tone={t}
      aria-labelledby={title ? titleId : undefined}
      role={title ? 'region' : undefined}
      className={cn(calloutVariants({ tone: t }), className)}
      {...props}
    >
      <div aria-hidden className="relleno h-2" />
      <div className="flex gap-3 px-4 pt-3.5 pb-4">
        {icon !== false ? (
          <span aria-hidden className={cn('mt-px shrink-0 [&_svg]:size-[18px]', ICON_INK[t])}>
            {icon ?? <Icon />}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? (
            <Heading id={titleId} className="m-0 font-ui text-sm font-semibold leading-snug text-ink">
              {title}
            </Heading>
          ) : null}
          {children ? (
            <div className={cn('text-sm leading-body text-ink-2 [&_a]:text-rojo-on-shade [&_a]:underline', title && 'mt-1')}>
              {children}
            </div>
          ) : null}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {onDismiss ? (
          <IconButton label="Dismiss" variant="ghost" size="sm" onClick={onDismiss} className="-mt-1 -mr-1.5">
            <X />
          </IconButton>
        ) : null}
      </div>
    </div>
  )
}
