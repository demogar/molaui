import { PreviewCard } from '@base-ui/react/preview-card'
import { ArrowUpRight } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { floatingSurface } from '../../popover/surface'

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
  /** The source's title, for the accessible name. "[2]" alone tells a screen reader nothing. Defaults to `source.title`. */
  title?: string
  /**
   * The source this marker points at. With it, hovering or focusing the
   * marker opens a preview card — title, domain, the passage used — so the
   * claim can be checked without leaving the sentence.
   */
  source?: Source
  /** Which side of the marker the card opens on. */
  cardSide?: 'top' | 'bottom'
}

const markerClass = cn(
  'relative -top-[0.1em] mx-[0.1em] inline-flex h-[1.3em] min-w-[1.3em] items-center justify-center px-[0.3em] align-baseline',
  'bg-cloth-pale font-ui text-[0.62em] font-semibold tabular text-ink no-underline shadow-cut band-oro [--cut-reveal:2px]',
  'transition-[box-shadow,background-color] duration-(--motion-cut) ease-cut hover:cut-band data-[popup-open]:cut-band',
)

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
 *
 * ── the preview card ──
 * With `source`, the marker opens a card on hover and on keyboard focus:
 * number, title, domain, the passage used and when it was read, with a link
 * to the document. Checking a claim then costs no click at all, and the
 * reader's place in the paragraph is never lost. It is Base UI's PreviewCard,
 * which already opens on focus as well as hover, so keyboard readers get the
 * same card mouse readers do. The card is supplementary, never the only
 * route: the marker is still a link to the full source card below, and the
 * card's content is a copy of it, so a reader who never sees the card (a
 * screen reader user tabbing past) loses nothing.
 *
 * ── touch ──
 * There is no hover on touch, and PreviewCard opens on hover for mice only, so
 * left alone a tap would follow the link and the card would never be seen.
 * The first tap on a marker opens the card instead of navigating; a second
 * tap on the open marker follows the link as before, and a tap outside
 * closes it. Tried first: opening on focus, which a tap also gives — but the
 * focus delay is longer than the click, so the page had already jumped.
 */
export function Citation({ n, title, source, cardSide = 'top', href, className, ...props }: CitationProps) {
  const name = title ?? source?.title
  const markerProps = {
    'data-slot': 'citation',
    href: href ?? `#source-${n}`,
    'aria-label': name ? `Source ${n}: ${name}` : `Source ${n}`,
    className: cn(markerClass, className),
    ...props,
  }

  if (!source) return <a {...markerProps}>{n}</a>
  return <CitationWithCard n={n} source={source} side={cardSide} markerProps={markerProps} />
}

function CitationWithCard({
  n,
  source,
  side,
  markerProps,
}: {
  n: number
  source: Source
  side: 'top' | 'bottom'
  markerProps: React.ComponentProps<'a'>
}) {
  const [open, setOpen] = React.useState(false)
  // The pointer that started the current press. `click` does not say whether
  // it came from a finger, and `pointerdown` does.
  const pointerType = React.useRef('')

  return (
    <PreviewCard.Root open={open} onOpenChange={setOpen}>
      <PreviewCard.Trigger
        delay={300}
        closeDelay={200}
        {...markerProps}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType
          markerProps.onPointerDown?.(event)
        }}
        onClick={(event) => {
          if (pointerType.current === 'touch' && !open) {
            event.preventDefault()
            setOpen(true)
          }
          markerProps.onClick?.(event)
        }}
      >
        {n}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner side={side} align="start" sideOffset={6} collisionPadding={16} className="z-50">
          <PreviewCard.Popup
            data-slot="citation-card"
            className={cn(floatingSurface, 'w-80 max-w-[calc(100vw-2rem)] p-0')}
          >
            <SourcePreview source={source} />
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  )
}

function SourcePreview({ source }: { source: Source }) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 p-3">
        <SourceNumber id={source.id} className="row-span-2" />
        <p className="m-0 font-ui text-sm leading-snug font-semibold text-ink">{source.title}</p>
        <SourceMeta source={source} />
      </div>
      {source.snippet ? (
        <p className="m-0 border-t border-keyline px-3 py-2.5 font-text text-sm leading-[1.45] text-ink-2 [overflow-wrap:anywhere]">
          “{source.snippet}”
        </p>
      ) : null}
      <a
        href={source.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group/open flex min-h-(--control-h) items-center justify-between gap-2 border-t border-keyline px-3',
          'font-ui text-sm font-medium text-ink no-underline',
          'transition-colors duration-(--motion-cut) ease-cut hover:bg-ink-soft',
        )}
      >
        <span>
          Open source{' '}
          <span className="sr-only">{source.id} (opens in a new tab)</span>
        </span>
        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-ink-muted group-hover/open:text-ink" />
      </a>
    </div>
  )
}

function SourceNumber({ id, className }: { id: number; className?: string }) {
  return (
    <span
      dir="ltr"
      className={cn(
        'grid h-6 min-w-6 place-items-center self-start bg-ink px-1 font-ui text-xs font-semibold tabular text-on-ink',
        className,
      )}
    >
      {id}
    </span>
  )
}

/** Domain and read time: what a reader judges a source by before opening it. */
function SourceMeta({ source }: { source: Source }) {
  const retrieved = source.retrievedAt ? new Date(source.retrievedAt) : undefined
  return (
    <span className="flex flex-wrap gap-x-2 font-ui text-xs text-ink-muted">
      <span dir="ltr">{source.domain}</span>
      {retrieved ? (
        <time dateTime={retrieved.toISOString()} className="tabular">
          read{' '}
          <span dir="ltr">
            {retrieved.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </time>
      ) : null}
    </span>
  )
}

/**
 * A `renderCitation` for `StreamingText`, built from the same array the
 * `SourceList` renders, so marker [2] opens source 2 and links to its card.
 *
 * Call it once per sources array (module scope, or `useMemo` on the array):
 * StreamingText skips re-rendering finished blocks only while the function it
 * is given stays the same. A marker with no matching source renders as a
 * plain marker rather than a card with nothing in it.
 */
export function citationRenderer(sources: readonly Source[]): (n: number) => React.ReactNode {
  const byId = new Map(sources.map((source) => [source.id, source]))
  return function renderCitation(n) {
    return <Citation n={n} source={byId.get(n)} />
  }
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
      {sources.map((source) => (
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
            <SourceNumber id={source.id} className="row-span-3" />
            <span className="flex items-start justify-between gap-2">
              <span className="font-ui text-sm font-semibold leading-snug">{source.title}</span>
              <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-ink-muted group-hover/source:text-ink" />
            </span>
            <SourceMeta source={source} />
            {source.snippet ? (
              <span className="font-text text-sm leading-[1.45] text-ink-2 [overflow-wrap:anywhere]">“{source.snippet}”</span>
            ) : null}
          </a>
        </li>
      ))}
    </ol>
  )
}
