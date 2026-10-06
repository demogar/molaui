import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Where this page sits — Workspace / Agents / knowledge-agent / Run #4182.
 *
 * A `<nav>` landmark named "Breadcrumb" holding an ordered list, with the
 * current page as plain text carrying `aria-current="page"`: the last crumb
 * is where you are, and a link to where you already are is a control that
 * does nothing.
 *
 * The separator is a slash in keyline ink, drawn with CSS rather than written
 * into the list, so a screen reader reads four places and not four places and
 * three slashes. Links are ink-2 and underline on hover — in a system where
 * colour is a field rather than an accent, a crumb that only changes hue would
 * be invisible to a third of the people who can't tell rojo from ink-2.
 *
 * Long ids collapse in the middle, not at the end: `run_8f3a…c21e` keeps both
 * ends, which are the parts people compare.
 *
 * Router-agnostic: pass `renderLink` to emit your framework's `<Link>`.
 */

export interface BreadcrumbItem {
  label: React.ReactNode
  /** Omit on the current page. */
  href?: string
}

export interface BreadcrumbProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  items: BreadcrumbItem[]
  renderLink?: (props: { href: string; className: string; children: React.ReactNode }) => React.ReactNode
}

const linkClasses =
  'text-ink-2 no-underline decoration-ink-muted hover:text-ink hover:underline focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none'

export function Breadcrumb({ items, renderLink, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" data-slot="breadcrumb" className={cn('min-w-0', className)} {...props}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 font-ui text-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li
              key={i}
              className={cn(
                'flex min-w-0 items-center gap-2',
                i > 0 && "before:text-keyline before:content-['/'] before:select-none",
              )}
            >
              {item.href && !last ? (
                renderLink ? (
                  renderLink({ href: item.href, className: linkClasses, children: item.label })
                ) : (
                  <a href={item.href} className={linkClasses}>
                    {item.label}
                  </a>
                )
              ) : (
                <span aria-current={last ? 'page' : undefined} className={cn('truncate', last ? 'font-semibold text-ink' : 'text-ink-muted')}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** `run_8f3a2b91c21e` → `run_8f3a…c21e`. Both ends survive; the middle is what nobody reads. */
export function middleTruncate(text: string, max = 14): string {
  if (text.length <= max) return text
  const keep = max - 1
  const head = Math.ceil(keep / 2)
  const tail = Math.floor(keep / 2)
  return `${text.slice(0, head)}…${text.slice(text.length - tail)}`
}
