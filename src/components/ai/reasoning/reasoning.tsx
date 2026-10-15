'use client'

import { Collapsible } from '@base-ui/react/collapsible'
import { Plus } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../../lib/cn'
import { type MessagesOverride, useMessages } from '../../../lib/messages'
import { formatDuration, useElapsed } from '../run-status'
import { StreamingText } from '../streaming-text'
import { type ReasoningMessages, reasoningMessages } from './messages'

export interface ReasoningProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** The reasoning text so far. */
  text: string
  /** `streaming` while the model is still thinking. */
  status?: 'streaming' | 'done'
  /**
   * When the thinking started. Gives the summary line its clock: live while
   * streaming, "Thought for 12.4s" once done.
   */
  startedAt?: number | Date
  /**
   * When the thinking ended. Freezes the clock; omit while the model is still
   * thinking.
   */
  endedAt?: number | Date
  /** A known duration, when there are no timestamps. */
  durationMs?: number
  /**
   * Start with the reasoning shown. Closed by default, because reasoning is
   * evidence for when the answer looks wrong, not the answer.
   */
  defaultOpen?: boolean
  /** Words for translation: the summary line and the announcement when it finishes. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<ReasoningMessages>
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
  messages,
  className,
  ...props
}: ReasoningProps) {
  const [t, f] = useMessages('reasoning', reasoningMessages, messages)
  const thinking = status === 'streaming'
  const elapsed = useElapsed(startedAt, thinking ? endedAt : (endedAt ?? startedAt))
  const ms = durationMs ?? (startedAt !== undefined && (thinking || endedAt !== undefined) ? elapsed : undefined)
  const summary = thinking ? t.thinking : ms !== undefined ? f.format(t.thoughtFor, { duration: formatDuration(ms) }) : t.reasoning

  return (
    <Collapsible.Root defaultOpen={defaultOpen} render={<div data-slot="reasoning" data-status={status} className={cn('flex flex-col', className)} {...props} />}>
      <Collapsible.Trigger
        className={cn(
          'group/trigger -mx-1.5 flex w-fit items-center gap-2 px-1.5 py-1 font-ui text-sm text-ink-muted',
          'transition-colors hover:bg-ink-soft hover:text-ink',
        )}
      >
        <Plus
          aria-hidden
          className="size-(--icon-sm) shrink-0 transition-transform duration-(--motion-base) group-data-[panel-open]/trigger:rotate-45"
        />
        {thinking ? <span aria-hidden className="inline-block h-[9px] w-5 band-accent relleno-working shadow-cut" /> : null}
        <span>
          {summary}
          {thinking && ms !== undefined ? <span className="tabular"> · {formatDuration(ms)}</span> : null}
        </span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="overflow-hidden">
        <div className="mt-2 border-s-(length:--bar-w) border-keyline ps-4">
          <StreamingText
            text={text}
            status={thinking ? 'streaming' : 'done'}
            variant="muted"
            doneAnnouncement={t.complete}
            className="text-base"
          />
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
