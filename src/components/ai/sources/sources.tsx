import { ArrowUpRight } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../../lib/cn'

export interface Source {
  id: number
  title: string
  href: string
  /** Where it lives — shown so a reader can judge the source before opening it. */
  domain: string
  /** The passage the answer actually used. */
  snippet?: string
  /** When the system read it. Knowledge goes stale; the date says how stale. */
  retrievedAt?: Date | string
}

export interface CitationProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  n: number
  /** The source's title, for the accessible name. "[2]" alone tells a screen reader nothing. */
  title?: string
}

/**
 * An inline citation marker: a small cut chip with the source's number.
 *
 * Tabular, keylined, the size of a lowercase letter, so a paragraph dense with
 * citations still reads as a paragraph. It links to the source card in the
 * list below by default (`#source-n`), which keeps the reader on the page;
 * pass `href` to send them to the document instead.
 *
 * A knowledge platform lives or dies on whether people check its sources, so
 * checking one has to cost one click and no context switch.
 */
export function Citation({ n, title, href, className, ...props }: CitationProps) {
  return (
    <a
      data-slot="citation"
      href={href ?? `#source-${n}`}
      aria-label={title ? `Source ${n}: ${title}` : `Source ${n}`}
      className={cn(
        'relative -top-[0.1em] mx-[0.1em] inline-flex h-[1.3em] min-w-[1.3em] items-center justify-center px-[0.3em] align-baseline',
        'bg-cloth-pale font-ui text-[0.62em] font-semibold tabular text-ink no-underline shadow-cut band-oro [--cut-reveal:2px]',
        'transition-[box-shadow,background-color] duration-(--motion-cut) ease-cut hover:cut-band',
        className,
      )}
      {...props}
    >
      {n}
    </a>
  )
}

export interface SourceListProps extends Omit<React.ComponentProps<'ol'>, 'children'> {
  sources: readonly Source[]
}

/**
 * The sources an answer drew on, as an ordered list whose numbers match the
 * inline citations. Each card says what it is (title), where it lives
 * (domain), what was used (the snippet, in the reading voice — it is quoted
 * prose) and when it was read.
 */
export function SourceList({ sources, className, ...props }: SourceListProps) {
  return (
    <ol data-slot="source-list" className={cn('m-0 grid list-none gap-2 p-0 sm:grid-cols-2', className)} {...props}>
      {sources.map((source) => {
        const retrieved = source.retrievedAt ? new Date(source.retrievedAt) : undefined
        return (
          <li key={source.id} id={`source-${source.id}`} className="scroll-mt-4 target:[&>a]:cut-band">
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'group/source grid h-full grid-cols-[auto_1fr] gap-x-3 gap-y-1 bg-cloth-pale p-3 text-ink no-underline shadow-cut band-oro [--cut-reveal:3px]',
                'transition-[box-shadow] duration-(--motion-cut) ease-cut hover:cut-band',
              )}
            >
              <span className="row-span-3 grid h-6 min-w-6 place-items-center bg-ink px-1 font-ui text-xs font-semibold tabular text-on-ink">
                {source.id}
              </span>
              <span className="flex items-start justify-between gap-2">
                <span className="font-ui text-sm font-semibold leading-snug">{source.title}</span>
                <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-ink-muted group-hover/source:text-ink" />
              </span>
              <span className="flex flex-wrap gap-x-2 font-ui text-xs text-ink-muted">
                <span>{source.domain}</span>
                {retrieved ? (
                  <time dateTime={retrieved.toISOString()} className="tabular">
                    read {retrieved.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </time>
                ) : null}
              </span>
              {source.snippet ? (
                <span className="font-text text-sm leading-[1.45] text-ink-2 [overflow-wrap:anywhere]">“{source.snippet}”</span>
              ) : null}
            </a>
          </li>
        )
      })}
    </ol>
  )
}
