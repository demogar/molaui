import { cva } from 'class-variance-authority'
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { Button, IconButton } from '../../button'

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

const ROLE_LABEL: Record<MessageRole, string> = {
  user: 'You',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
}

/**
 * The band before each role label — the rótulo's cut mark — is the only place
 * a role gets a colour, and the word beside it always says the role, so the
 * colour is a second signal rather than the only one.
 */
const roleBand = cva('', {
  variants: {
    role: {
      user: 'band-cloth before:bg-ink',
      assistant: 'band-rojo',
      system: 'band-anil',
      tool: 'band-verde',
    },
  },
})

export interface MessageProps extends Omit<React.ComponentProps<'article'>, 'role'> {
  role: MessageRole
  /** Who is speaking, if more specific than the role — "Cayuco", "M. Herrera". */
  author?: string
  /** The model that produced it. A machine identifier, so it is set as a literal. */
  model?: string
  timestamp?: Date | string
  /** `error`: the message failed partway. Content so far stays; the error is stated under it. */
  status?: 'streaming' | 'done' | 'error'
  /** The error, verbatim from the system. Shown as a literal — operators paste it into tickets. */
  error?: string
  /** Copies this text. Omit to hide the copy action. */
  copyText?: string
  onRetry?: () => void
  /** Called with the reader's rating. Omit to hide the rating actions. */
  onFeedback?: (value: 'up' | 'down') => void
  /** The rating already given, if any. */
  feedback?: 'up' | 'down'
}

/**
 * One turn of a conversation.
 *
 * ── a ledger, not bubbles ──
 * Chat bubbles are a messaging idiom: short turns between two equals, read
 * on a phone. A transcript in an internal tool is neither — answers run to
 * paragraphs, tables and code, and an operator reads the transcript as a
 * RECORD: who said what, when, with which model. Bubbles would give a long
 * answer 70% of the column and push the code inside it into horizontal
 * scroll. So every turn takes the full measure; the role sits in a gutter in
 * the label register, cut short by its band; turns are separated by a rule.
 * On a narrow container the gutter stacks above the content.
 *
 * ── the operator's words vs the model's ──
 * The operator's prompt is set in Archivo — it is an instruction, scanned
 * like the rest of the product. The model's reply is set in Alegreya by the
 * content passed in (`StreamingText`), because it is read. The asymmetry is
 * deliberate and it is what lets a reader find the answers in a long thread
 * at a glance.
 *
 * ── actions ──
 * Copy, retry and rating appear on hover or keyboard focus within the turn,
 * and are always visible on touch devices where there is no hover to find
 * them with. They are real buttons in the tab order either way: hidden by
 * opacity, never by `display`, so a keyboard user can reach them.
 */
export function Message({
  role,
  author,
  model,
  timestamp,
  status = 'done',
  error,
  copyText,
  onRetry,
  onFeedback,
  feedback,
  className,
  children,
  ...props
}: MessageProps) {
  const name = author ?? ROLE_LABEL[role]
  const time = timestamp ? new Date(timestamp) : undefined
  const hasActions = status !== 'streaming' && (copyText !== undefined || onRetry || onFeedback)

  return (
    <article
      data-slot="message"
      data-role={role}
      data-status={status}
      aria-label={`${name}${time ? `, ${formatTime(time)}` : ''}`}
      className={cn('group/message @container border-t border-keyline py-5 first:border-t-0', className)}
      {...props}
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 @lg:grid-cols-[8.5rem_minmax(0,1fr)]">
        <header className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 @lg:flex-col @lg:gap-1.5">
          <span
            className={cn(
              'flex min-w-0 items-center gap-2 rotulo text-ink-2',
              'before:h-[3px] before:w-4 before:shrink-0 before:bg-[var(--band)] before:content-[""]',
              roleBand({ role }),
              // A tool's name is a machine literal, not a label: set in mono,
              // in its own case, and allowed to break — `query_experiment` in
              // expanded caps overran the 8.5rem column into the message.
              role === 'tool' && 'literal text-xs normal-case tracking-normal',
            )}
          >
            {/* Break a tool name only at its own seams: a zero-width space after
                each underscore, so `query_experiment` wraps as two words rather
                than mid-word. */}
            {role === 'tool' ? name.replace(/_/g, '_\u200b') : name}
          </span>
          {time ? (
            <time dateTime={time.toISOString()} className="font-ui text-xs tabular text-ink-muted">
              {formatTime(time)}
            </time>
          ) : null}
          {model ? <span className="literal text-2xs text-ink-muted">{model}</span> : null}
        </header>

        <div className="min-w-0">
          <div className={cn(role === 'user' && 'font-ui text-base text-ink', role === 'tool' && 'text-sm')}>
            {children}
          </div>

          {status === 'error' ? (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 bg-rojo-soft px-4 py-3 shadow-[inset_3px_0_0_var(--rojo)]"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 font-ui text-sm font-semibold text-ink">The response stopped before it finished.</p>
                {error ? <p className="m-0 mt-1 literal text-xs text-ink-on-tint [overflow-wrap:anywhere]">{error}</p> : null}
              </div>
              {onRetry ? (
                <Button size="sm" variant="secondary" icon={<RotateCcw />} onClick={onRetry}>
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}

          {hasActions ? (
            <MessageActions
              copyText={copyText}
              onRetry={status === 'error' ? undefined : onRetry}
              onFeedback={onFeedback}
              feedback={feedback}
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}

function MessageActions({
  copyText,
  onRetry,
  onFeedback,
  feedback,
}: Pick<MessageProps, 'copyText' | 'onRetry' | 'onFeedback' | 'feedback'>) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(id)
  }, [copied])

  return (
    <div
      className={cn(
        '-ml-1.5 mt-3 flex items-center gap-1',
        'transition-opacity duration-(--motion-cut) ease-cut',
        '[@media(hover:hover)]:opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100',
      )}
    >
      {copyText !== undefined ? (
        <IconButton
          size="sm"
          variant="ghost"
          label={copied ? 'Copied' : 'Copy response'}
          onClick={() => {
            void navigator.clipboard?.writeText(copyText).then(() => setCopied(true))
          }}
        >
          {copied ? <Check /> : <Copy />}
        </IconButton>
      ) : null}
      {onRetry ? (
        <IconButton size="sm" variant="ghost" label="Regenerate" onClick={onRetry}>
          <RotateCcw />
        </IconButton>
      ) : null}
      {onFeedback ? (
        <>
          <IconButton
            size="sm"
            variant="ghost"
            label="Good response"
            aria-pressed={feedback === 'up'}
            className="aria-pressed:bg-ink-soft aria-pressed:text-ink-success"
            onClick={() => onFeedback('up')}
          >
            <ThumbsUp />
          </IconButton>
          <IconButton
            size="sm"
            variant="ghost"
            label="Bad response"
            aria-pressed={feedback === 'down'}
            className="aria-pressed:bg-ink-soft aria-pressed:text-ink-danger"
            onClick={() => onFeedback('down')}
          >
            <ThumbsDown />
          </IconButton>
        </>
      ) : null}
      {/* Copy confirmation for screen readers: the icon swap alone is silent. */}
      <span role="status" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  )
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
