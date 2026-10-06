'use client'

import { ArrowUp, Square, WifiOff } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { Button } from '../../button'

export interface PromptInputProps
  extends Omit<React.ComponentProps<'form'>, 'onSubmit' | 'onChange' | 'children'> {
  /** The visible-to-assistive-tech name of the field — "Message Cayuco". */
  label: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called with the trimmed prompt. The field clears itself when uncontrolled. */
  onSubmit: (value: string) => void
  /** Called by the stop button while `status` is `generating`. */
  onStop?: () => void
  /**
   * `generating`: a response is streaming. The field stays editable — the
   *   operator can draft the next prompt — and the send button becomes stop.
   * `offline`: sending is impossible. The draft is kept, and the reason is said.
   */
  status?: 'idle' | 'generating' | 'offline'
  /**
   * `enter`: Enter sends, Shift+Enter is a newline — chat convention.
   * `mod-enter`: ⌘/Ctrl+Enter sends, Enter is a newline — for long prompts,
   * where an accidental send costs a model run.
   */
  submitOn?: 'enter' | 'mod-enter'
  placeholder?: string
  /** Rows before the field scrolls instead of growing. */
  maxRows?: number
  /** Attachment chips, above the field. */
  attachments?: React.ReactNode
  /** Leading controls in the footer — a model picker, a tool toggle. */
  toolbar?: React.ReactNode
  /** Show the rough token estimate. */
  showEstimate?: boolean
  disabled?: boolean
}

/**
 * The composer.
 *
 * A cut shape like every control: a raised-cloth field bounded by an ink
 * keyline, with the whole composer — not just the textarea — taking the focus
 * ring, because the field, its attachments and its send button are one
 * object to the person using it.
 *
 * ── send becomes stop ──
 * While a response streams, the send button turns into stop in the same
 * place, at the same size. Stop is the most time-critical control in an AI
 * interface — the model is going the wrong way and every second costs tokens
 * — so it lives where the hand already is rather than appearing somewhere new.
 *
 * ── the draft is sacred ──
 * Going offline does not disable the field: an operator mid-way through a
 * long prompt keeps typing, and is told plainly why it cannot be sent. A
 * disabled textarea would also have dropped the draft out of the tab order.
 *
 * ── the estimate is labelled as one ──
 * "~120 tok" with a tilde (heard as "About 120 tokens"), from a
 * characters-÷-4 heuristic. It is there so an operator notices they pasted a whole log file, not to bill anyone; a
 * precise-looking number from a heuristic would be false precision.
 */
export function PromptInput({
  label,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onSubmit,
  onStop,
  status = 'idle',
  submitOn = 'enter',
  placeholder = 'Ask anything…',
  maxRows = 10,
  attachments,
  toolbar,
  showEstimate = true,
  disabled = false,
  className,
  ...props
}: PromptInputProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : inner
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fieldId = React.useId()
  const hintId = `${fieldId}-hint`

  const setValue = (next: string) => {
    if (!controlled) setInner(next)
    onValueChange?.(next)
  }

  // Grow with the content up to `maxRows`, then scroll. Measured from
  // scrollHeight after collapsing to auto, which is the only measurement that
  // shrinks again when text is deleted.
  React.useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const line = parseFloat(getComputedStyle(el).lineHeight) || 20
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows + 20)}px`
  }, [value, maxRows])

  const generating = status === 'generating'
  const offline = status === 'offline'
  const trimmed = value.trim()
  const canSend = !generating && !offline && !disabled && trimmed.length > 0
  const estimate = Math.ceil(value.length / 4)

  const send = () => {
    if (!canSend) return
    onSubmit(trimmed)
    setValue('')
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    const mod = event.metaKey || event.ctrlKey
    const wantsSend = submitOn === 'enter' ? !event.shiftKey : mod
    if (!wantsSend) return
    event.preventDefault()
    send()
  }

  const shortcut = submitOn === 'enter' ? 'Enter to send, Shift+Enter for a new line' : '⌘/Ctrl+Enter to send'

  return (
    <form
      data-slot="prompt-input"
      data-status={status}
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
      className={cn(
        'flex flex-col bg-cloth-pale shadow-cut transition-shadow duration-(--motion-cut) ease-cut',
        'focus-within:shadow-[var(--focus-ring)]',
        disabled && 'bg-cloth-shade',
        className,
      )}
      {...props}
    >
      {attachments ? <div className="flex flex-wrap gap-2 px-3 pt-3">{attachments}</div> : null}
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <textarea
        ref={textareaRef}
        id={fieldId}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={hintId}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          'block w-full resize-none bg-transparent px-3.5 pt-3 pb-2 font-ui text-base leading-[1.5] text-ink',
          'placeholder:text-ink-muted focus:outline-none focus-visible:shadow-none scroll-cloth',
          'disabled:cursor-not-allowed disabled:text-ink-muted',
        )}
      />
      <div className="flex items-center gap-2 px-2 pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">{toolbar}</div>
        <p id={hintId} className="m-0 flex items-center gap-2 font-ui text-xs text-ink-muted">
          {offline ? (
            <span className="flex items-center gap-1.5 text-ink-warn">
              <WifiOff aria-hidden className="size-3.5" />
              Offline — your draft is kept
            </span>
          ) : (
            <span className="hidden sm:inline">{shortcut}</span>
          )}
          {showEstimate && value.length > 0 ? (
            // A fixed locale, as in Chip: the runtime's default differs between
            // the server and the browser, which is a hydration mismatch, and the
            // words around the figure are English anyway.
            <span className="tabular" aria-label={`About ${estimate.toLocaleString('en-US')} tokens`}>
              ~{estimate.toLocaleString('en-US')} tok
            </span>
          ) : null}
        </p>
        {generating ? (
          <Button type="button" size="sm" variant="secondary" icon={<Square className="fill-current" />} onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button type="submit" size="sm" icon={<ArrowUp />} disabled={!canSend}>
            Send
          </Button>
        )}
      </div>
    </form>
  )
}

export interface AttachmentChipProps extends React.ComponentProps<'span'> {
  name: string
  /** e.g. "CSV · 48 KB". */
  detail?: string
  onRemove?: () => void
}

/** A file or context item attached to the next prompt. The filename is a literal. */
export function AttachmentChip({ name, detail, onRemove, className, ...props }: AttachmentChipProps) {
  return (
    <span
      data-slot="attachment-chip"
      className={cn('inline-flex max-w-full items-center gap-2 bg-cloth-shade py-1 pe-1 ps-2.5 shadow-cut', className)}
      {...props}
    >
      <span className="literal truncate text-xs text-ink">{name}</span>
      {detail ? <span className="font-ui text-2xs whitespace-nowrap text-ink-muted">{detail}</span> : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className="grid size-5 place-items-center text-ink-2 hover:bg-ink-soft hover:text-ink"
        >
          <svg aria-hidden viewBox="0 0 10 10" className="size-2.5">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      ) : null}
    </span>
  )
}
