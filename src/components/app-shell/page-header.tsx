import type * as React from 'react'

import { cn } from '../../lib/cn'
import { Heading } from '../typography'

/**
 * The top of a page inside the shell: where am I, what is this, what can I do.
 *
 * Breadcrumbs sit above the title because they are navigation, not a label —
 * the rule against eyebrows (a small label pre-announcing the heading) does
 * not apply to a trail you can click back along.
 *
 * Actions sit right of the title and wrap below it on a narrow screen, rather
 * than being hidden in an overflow menu: the primary action of a page is the
 * last thing that should cost an extra click.
 *
 * Meta is a row of short facts — owner, last updated, version — divided by
 * keylines. It is a list, so a screen reader hears "list, 3 items".
 */
export interface PageHeaderProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  meta?: React.ReactNode[]
  /** A Tabs list. Sits on the header's bottom edge so the active tab cuts into it. */
  tabs?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  meta,
  tabs,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-3 px-4 pt-5 sm:px-6',
        tabs ? 'pb-0' : 'pb-5 shadow-[inset_0_-1px_0_var(--keyline)]',
        className,
      )}
      {...props}
    >
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          <Heading level={1}>{title}</Heading>
          {description ? <p className="mt-1.5 mb-0 text-sm text-ink-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta && meta.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap items-center gap-y-1 p-0 text-xs text-ink-muted">
          {meta.map((item, i) => (
            <li key={i} className={cn('flex items-center gap-1.5', i > 0 && 'ms-3 ps-3 shadow-[inset_1px_0_0_var(--keyline)] rtl:shadow-[inset_-1px_0_0_var(--keyline)]')}>
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {tabs ? <div className="mt-1">{tabs}</div> : null}
    </header>
  )
}
