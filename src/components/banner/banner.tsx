'use client'

import { cva } from 'class-variance-authority'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type Variants } from '../../lib/variants'
import { IconButton } from '../button'

/**
 * A condition of the whole application, said once across the top of it:
 * maintenance tonight, the workspace is read-only, the connection dropped.
 *
 * ── banner, callout, toast, notification centre ──
 * Four answers to "where does this message go", by what it is about and how
 * long it is true:
 *   - Banner: the whole app, for as long as the condition holds. One at a time.
 *   - Callout: one page or region, for as long as the condition holds.
 *   - Toast: something that just happened, for a few seconds.
 *   - Notification centre: the record of what happened, for later.
 * A banner that reports an event ("Deploy finished") is a toast in the wrong
 * place; a toast about a standing condition ("Read-only mode") disappears
 * while the condition is still true.
 *
 * ── the strip ──
 * Full bleed, above the top bar, in the AppShell's `banner` slot, so it
 * pushes the frame down rather than covering it: an operator twenty rows into
 * a table must not lose the bar's search under a notice. It sits at
 * `--z-sticky`, the app bar's own step, so the bar's ink rule never draws
 * over it. The wash is the tone's, mixed at the percentage tokens.css
 * measured for the ink ramp, and its foot is a `--bar-w` edge in the status
 * colour: "the region a status owns", which is that token's one job. A
 * callout's top seam was tried first; a seam reads as the opening of a panel,
 * and a strip across the whole frame is not one.
 *
 * ── quiet by default ──
 * A banner that is there when the page loads is content, read in order after
 * the skip link: it is a landmark named "Announcement" (`label`), not a live
 * region. Only a banner that appears during the session, because something
 * changed (the connection dropped), should be announced, and it asks with
 * `announce`: its message is then said once, politely, from a status region
 * that mounts empty and is filled a tick later, because a region that mounts
 * with its text is never announced. Never assertive: the operator is in the
 * middle of something, and a banner does not need them to stop.
 */
export const bannerVariants = cva('relative z-(--z-sticky) flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-ink sm:px-4', {
  variants: {
    /** The status of the condition, carried by the wash, the foot edge and the icon; `info` by default. The message still says it in words. */
    tone: {
      neutral: 'bg-ink-soft bar-bottom-ink',
      info: 'bg-anil-soft bar-bottom-info',
      success: 'bg-verde-soft bar-bottom-success',
      warn: 'bg-oro-soft bar-bottom-warn',
      danger: 'bg-danger-soft bar-bottom-danger',
    },
  },
  defaultVariants: { tone: 'info' },
})

export type BannerTone = NonNullable<Variants<typeof bannerVariants>['tone']>

const ICON: Record<BannerTone, React.ComponentType<{ className?: string }>> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warn: TriangleAlert,
  danger: CircleAlert,
}

/** The same inks as Callout's icons, on the same washes: each measured at 3:1 or more as a graphic. */
const ICON_INK: Record<BannerTone, string> = {
  neutral: 'text-ink-2',
  info: 'text-anil',
  success: 'text-verde',
  warn: 'text-ink-warn',
  danger: 'text-ink-danger',
}

/** Said before the message, hidden: the icon is not read, and the tone has to be heard as well as seen. */
const SR_TONE: Record<BannerTone, string | null> = {
  neutral: null,
  info: null,
  success: 'Success: ',
  warn: 'Warning: ',
  danger: 'Error: ',
}

export interface BannerProps extends Omit<React.ComponentProps<'section'>, 'title'>, Variants<typeof bannerVariants> {
  /** A few words in bold before the message: “Scheduled maintenance”. */
  title?: React.ReactNode
  /** One follow-up, usually a `Button` at `size="sm"` or a link: “View status”. */
  action?: React.ReactNode
  /** Renders a Dismiss button. The caller owns whether the banner comes back, and when. */
  onDismiss?: () => void
  /** Replace the tone's icon, or `false` for none. */
  icon?: React.ReactNode | false
  /**
   * Say the message once, politely, when the banner appears. Only for a
   * banner that appears during the session because something changed; one
   * that is there when the page loads is read in order, and announcing it
   * talks over the page's own title.
   */
  announce?: boolean
  /** The landmark's name, “Announcement” by default. Name it for what it is when there is more than one kind: “Maintenance”. */
  label?: string
}

/** `className`, `ref` and the rest of the DOM props go to the `<section>`, the strip itself. */
export function Banner({
  tone,
  title,
  action,
  onDismiss,
  icon,
  announce = false,
  label = 'Announcement',
  className,
  children,
  ...props
}: BannerProps) {
  const t = tone ?? 'info'
  const Icon = ICON[t]
  const message = React.useRef<HTMLParagraphElement>(null)
  const [spoken, setSpoken] = React.useState('')
  React.useEffect(() => {
    if (!announce) return
    const timer = window.setTimeout(() => setSpoken(message.current?.textContent ?? ''), 50)
    return () => window.clearTimeout(timer)
  }, [announce])

  return (
    <section
      aria-label={label}
      {...props}
      data-slot="banner"
      data-tone={t}
      className={cn(bannerVariants({ tone: t }), className)}
    >
      {icon === false ? null : (
        <span aria-hidden data-part="icon" className={cn('flex shrink-0 [&_svg]:size-(--icon)', ICON_INK[t])}>
          {icon ?? <Icon />}
        </span>
      )}
      <p ref={message} data-part="message" className="m-0 min-w-0 flex-1 basis-60 text-sm leading-snug">
        {SR_TONE[t] ? <span className="sr-only">{SR_TONE[t]}</span> : null}
        {/* A real space after the title, not a margin: the text is read and
            announced as one string, and a margin reads as "lostChanges". */}
        {title ? (
          <>
            <strong data-part="title" className="font-semibold">
              {title}
            </strong>{' '}
          </>
        ) : null}
        {children}
      </p>
      {action ? (
        <div data-part="action" className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      ) : null}
      {onDismiss ? (
        <IconButton data-part="dismiss" label="Dismiss" variant="ghost" size="sm" onClick={onDismiss} className="-me-1 shrink-0">
          <X />
        </IconButton>
      ) : null}
      {announce ? (
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {spoken}
        </div>
      ) : null}
    </section>
  )
}
