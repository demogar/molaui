import { ArrowDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { Button } from '../../button'

export interface ThreadProps extends React.ComponentProps<'section'> {
  /** Names the region. Required: a transcript is a landmark worth finding. */
  label: string
  /** Distance from the bottom, in px, that still counts as "at the bottom". */
  stickThreshold?: number
}

/**
 * The scrolling transcript.
 *
 * ── stick to the bottom only if the reader is there ──
 * Auto-scrolling on every token is the most common streaming bug there is: a
 * reader scrolls up to re-read the second paragraph and the page drags them
 * back down twenty times a second. So the thread follows new content only
 * while the reader is already at the bottom. The moment they scroll away it
 * stops following and offers "Jump to latest" instead, and scrolling back
 * down resumes following. Content growth is observed with a ResizeObserver,
 * not on each render, so it works however the content changes.
 *
 * ── not a live region ──
 * `role="log"` would be the textbook choice, and it would read every token
 * of a streaming answer aloud. The thread is a plain labelled region; the
 * streaming text inside announces its own completion once.
 */
export function Thread({ label, stickThreshold = 48, className, children, ...props }: ThreadProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const atBottomRef = React.useRef(true)
  const [atBottom, setAtBottom] = React.useState(true)

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  React.useEffect(() => {
    const content = contentRef.current
    if (!content || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) scrollToBottom()
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [scrollToBottom])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const next = el.scrollHeight - el.scrollTop - el.clientHeight <= stickThreshold
    atBottomRef.current = next
    setAtBottom(next)
  }

  return (
    <section aria-label={label} data-slot="thread" className={cn('relative flex min-h-0 flex-col', className)} {...props}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        tabIndex={0}
        aria-label={`${label} transcript`}
        className="scroll-cloth min-h-0 flex-1 overflow-y-auto [overflow-anchor:none] focus-visible:shadow-[var(--focus-ring-inset)]"
      >
        <div ref={contentRef} className="px-1">
          {children}
        </div>
      </div>
      {!atBottom ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            size="sm"
            variant="secondary"
            icon={<ArrowDown />}
            className="pointer-events-auto shadow-floating"
            onClick={() => {
              atBottomRef.current = true
              setAtBottom(true)
              scrollToBottom('smooth')
            }}
          >
            Jump to latest
          </Button>
        </div>
      ) : null}
    </section>
  )
}
