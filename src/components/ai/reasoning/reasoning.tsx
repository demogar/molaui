import { Collapsible } from '@base-ui/react/collapsible'
import { ChevronRight } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../../lib/cn'
import { formatDuration, useElapsed } from '../run-status'
import { StreamingText } from '../streaming-text'

export interface ReasoningProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** The reasoning text so far. */
  text: string
  /** `streaming` while the model is still thinking. */
  status?: 'streaming' | 'done'
  startedAt?: number | Date
  endedAt?: number | Date
  /** A known duration, when there are no timestamps. */
  durationMs?: number
  defaultOpen?: boolean
}

/**
 * The model's thinking, behind a disclosure.
 *
 * Reasoning is evidence, not the answer: useful when the answer looks wrong,
 * noise when it looks right. So it is closed by default and summarised in one
 * line — "Thought for 12.4s" — which is the fact most readers want from it.
 * While the model is still thinking the line says so and carries the working
 * texture and a live clock; open it and the thought streams in the muted
 * reading voice, a step quieter than the answer it leads to.
 */
export function Reasoning({
  text,
  status = 'done',
  startedAt,
  endedAt,
  durationMs,
  defaultOpen = false,
  className,
  ...props
}: ReasoningProps) {
  const thinking = status === 'streaming'
  const elapsed = useElapsed(startedAt, thinking ? endedAt : (endedAt ?? startedAt))
  const ms = durationMs ?? (startedAt !== undefined && (thinking || endedAt !== undefined) ? elapsed : undefined)
  const summary = thinking ? 'Thinking' : ms !== undefined ? `Thought for ${formatDuration(ms)}` : 'Reasoning'

  return (
    <Collapsible.Root defaultOpen={defaultOpen} render={<div data-slot="reasoning" data-status={status} className={cn('flex flex-col', className)} {...props} />}>
      <Collapsible.Trigger
        className={cn(
          'group/trigger -mx-1.5 flex w-fit items-center gap-2 px-1.5 py-1 font-ui text-sm text-ink-muted',
          'transition-colors duration-(--motion-cut) ease-cut hover:bg-ink-soft hover:text-ink',
        )}
      >
        <ChevronRight
          aria-hidden
          className="size-3.5 transition-transform duration-(--motion-cut) ease-cut rtl:-scale-x-100 group-data-[panel-open]/trigger:rotate-90 rtl:group-data-[panel-open]/trigger:-rotate-90"
        />
        {thinking ? <span aria-hidden className="inline-block h-[9px] w-5 band-oro relleno-working shadow-cut" /> : null}
        <span>
          {summary}
          {thinking && ms !== undefined ? <span className="tabular"> · {formatDuration(ms)}</span> : null}
        </span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="overflow-hidden">
        <div className="mt-2 border-s-[3px] border-keyline ps-4">
          <StreamingText
            text={text}
            status={thinking ? 'streaming' : 'done'}
            tone="muted"
            doneAnnouncement="Reasoning complete."
            className="text-base"
          />
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
