import * as React from 'react'

import { cn } from '../../../lib/cn'

import { parseBlocks, type InlineRun } from './parse'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface StreamingTextProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Everything received so far. Grows; never rewritten from the top. */
  text: string
  status?: StreamStatus
  /** Spoken once when a stream that was running completes. */
  doneAnnouncement?: string
  /** Spoken once when a stream that was running fails. */
  errorAnnouncement?: string
  /** How an inline `[n]` marker renders. Without it the marker stays as text. */
  renderCitation?: (n: number) => React.ReactNode
  /** `muted` for text the reader may skim — reasoning, not the answer. */
  tone?: 'default' | 'muted'
}

/**
 * Text that arrives a token at a time.
 *
 * ── the reading voice ──
 * A model's answer is set in Alegreya, the system's reading face, because it
 * is read: often several paragraphs, at the operator's pace, with attention.
 * The chrome around it is Archivo, and anything the machine DID — a tool name,
 * an argument, an id — is a Martian Mono literal, because it is inspected
 * rather than read. Three voices, three jobs; a reader can tell from the
 * letterforms alone whether they are looking at the model talking, the model
 * acting, or the product.
 *
 * ── no layout shift ──
 * The text only ever grows at its end. The caret is an inline block of fixed
 * width that sits after the last glyph, so it moves exactly as far as the
 * text does and nothing above it reflows. Blocks are keyed by position, so a
 * paragraph that is still arriving is updated in place rather than replaced.
 *
 * ── announced once ──
 * A live region on the text itself would read every token aloud, which turns
 * a screen reader into a ticker that cannot be interrupted. Instead the text
 * is `aria-busy` while it streams (assistive tech is told to wait), and a
 * separate polite status says "Response complete" once, at the end. The
 * answer itself is ordinary content, read when the reader chooses to.
 *
 * Under reduced motion the caret stops blinking and stays, which is still
 * true: the text is still arriving.
 */
export function StreamingText({
  text,
  status = 'done',
  doneAnnouncement = 'Response complete.',
  errorAnnouncement = 'Response stopped with an error.',
  renderCitation,
  tone = 'default',
  className,
  ...props
}: StreamingTextProps) {
  const blocks = React.useMemo(() => parseBlocks(text), [text])
  const streaming = status === 'streaming'

  // "Adjust state when a prop changes", done during render rather than in an
  // effect: the announcement is derived from the transition, not the value,
  // and a static `done` on first mount must not announce anything.
  const [prevStatus, setPrevStatus] = React.useState(status)
  const [announcement, setAnnouncement] = React.useState('')
  if (status !== prevStatus) {
    setPrevStatus(status)
    if (status === 'streaming') setAnnouncement('')
    else if (prevStatus === 'streaming' && status === 'done') setAnnouncement(doneAnnouncement)
    else if (prevStatus === 'streaming' && status === 'error') setAnnouncement(errorAnnouncement)
  }

  const caret = streaming ? <Caret /> : null

  return (
    <div
      data-slot="streaming-text"
      data-status={status}
      aria-busy={streaming || undefined}
      className={cn(
        'font-text text-lg leading-[1.55] [overflow-wrap:anywhere]',
        tone === 'muted' ? 'text-ink-muted' : 'text-ink',
        '[&>*+*]:mt-[0.75em]',
        className,
      )}
      {...props}
    >
      {blocks.map((block, i) => {
        const last = i === blocks.length - 1
        switch (block.kind) {
          case 'p':
            return (
              <p key={i} className="m-0">
                <Inlines inlines={block.inlines} renderCitation={renderCitation} />
                {last ? caret : null}
              </p>
            )
          case 'ul':
            return (
              <ul key={i} className="m-0 list-[square] ps-[1.25em] marker:text-rojo">
                {block.items.map((item, j) => (
                  <li key={j} className="ps-1 [&+li]:mt-1">
                    <Inlines inlines={item} renderCitation={renderCitation} />
                    {last && j === block.items.length - 1 ? caret : null}
                  </li>
                ))}
              </ul>
            )
          case 'pre':
            return (
              <pre
                key={i}
                className="m-0 overflow-x-auto bg-cloth-shade px-3 py-2.5 text-ink shadow-cut scroll-cloth"
              >
                <code className="literal text-sm leading-[1.6]">
                  {block.text}
                  {last ? caret : null}
                </code>
              </pre>
            )
        }
      })}
      {blocks.length === 0 && streaming ? <p className="m-0">{caret}</p> : null}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}

function Inlines({
  inlines,
  renderCitation,
}: {
  inlines: InlineRun[]
  renderCitation?: (n: number) => React.ReactNode
}) {
  return inlines.map((inline, i) => {
    switch (inline.kind) {
      case 'text':
        return <React.Fragment key={i}>{inline.text}</React.Fragment>
      case 'strong':
        return (
          <strong key={i} className="font-bold">
            {inline.text}
          </strong>
        )
      case 'code':
        return (
          <code key={i} className="literal bg-ink-soft px-[0.3em] py-[0.1em] text-ink">
            {inline.text}
          </code>
        )
      case 'cite':
        return <React.Fragment key={i}>{renderCitation ? renderCitation(inline.n) : `[${inline.n}]`}</React.Fragment>
    }
  })
}

/**
 * The block caret: ink, half an em wide, the height of the x-height plus
 * ascenders. A thin bar caret reads as a text field waiting for input; a block
 * reads as output being written, which is the opposite thing.
 */
export function Caret({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="caret"
      className={cn(
        'ms-[0.08em] inline-block h-[0.95em] w-[0.5em] translate-y-[0.14em] bg-current animate-mola-caret',
        className,
      )}
    />
  )
}
