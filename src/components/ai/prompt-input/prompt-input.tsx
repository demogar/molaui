'use client'

import { ArrowUp, Square, WifiOff } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { type MessagesOverride, useMessages } from '../../../lib/messages'
import { useControllable } from '../../../lib/use-controllable'
import { Button } from '../../button'
import {
  type AttachmentChipMessages,
  type PromptInputMessages,
  attachmentChipMessages,
  promptInputMessages,
} from './messages'

export interface PromptInputProps
  extends Omit<React.ComponentProps<'form'>, 'onSubmit' | 'onChange' | 'children'> {
  /** The visible-to-assistive-tech name of the field — "Message Cayuco". */
  label: string
  /**
   * The draft, when the page owns it — to restore a draft or clear it from
   * outside. Pair with `onValueChange`.
   */
  value?: string
  /**
   * The starting draft when the composer owns it. Defaults to empty; the field
   * clears itself after a send.
   */
  defaultValue?: string
  /** Called on every keystroke with the whole draft, untrimmed. */
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
  /**
   * Defaults to "Ask anything…" (`messages.placeholder`). It is a hint, never the name: `label` is what
   * assistive tech announces.
   */
  placeholder?: string
  /** Rows before the field scrolls instead of growing. */
  maxRows?: number
  /** Attachment chips, above the field. */
  attachments?: React.ReactNode
  /** Leading controls in the footer — a model picker, a tool toggle. */
  toolbar?: React.ReactNode
  /** Show the rough token estimate. */
  showEstimate?: boolean
  /**
   * Locks the composer, for a conversation the reader may not write to. To stop
   * sending for a while, use `status="offline"` instead, which keeps the draft
   * editable and says why.
   */
  disabled?: boolean
  /** Words for translation: the placeholder, the hints, the estimate and the buttons. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<PromptInputMessages>
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
  placeholder,
  maxRows = 10,
  attachments,
  toolbar,
  showEstimate = true,
  disabled = false,
  messages,
  className,
  ...props
}: PromptInputProps) {
  const [t, f] = useMessages('promptInput', promptInputMessages, messages)
  const [value, setValue] = useControllable({ value: valueProp, defaultValue, onChange: onValueChange })
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fieldId = React.useId()
  const hintId = `${fieldId}-hint`

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

  const shortcut = submitOn === 'enter' ? t.enterToSend : t.modEnterToSend

  return (
    <form
      data-slot="prompt-input"
      data-status={status}
      className={cn(
        'flex flex-col bg-cloth-pale shadow-cut transition-shadow',
        'focus-within:focus-ring',
        disabled && 'bg-disabled',
        className,
      )}
      {...props}
      // After the spread: `onSubmit` is PromptInput's own prop (it receives
      // the text, not the event), so the form's handler is always this one.
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      {attachments ? <div data-part="attachments" className="flex flex-wrap gap-2 px-3 pt-3">{attachments}</div> : null}
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <textarea
        ref={textareaRef}
        id={fieldId}
        data-part="input"
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder ?? t.placeholder}
        aria-describedby={hintId}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          'block w-full resize-none bg-transparent px-3.5 pt-3 pb-2 font-ui text-base leading-body text-ink',
          'placeholder:text-ink-muted focus:outline-none focus-visible:shadow-none scroll-cloth',
          'disabled:cursor-not-allowed disabled:text-ink-muted',
        )}
      />
      {/* The toolbar never shrinks below its controls; when the row is too
          narrow for it and the hint and Send, the hint and Send wrap to a line
          of their own, at the end. The toolbar used to shrink as a box while
          its model picker kept its width, and at 320px the picker was painted
          over the token estimate. */}
      <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
        <div data-part="toolbar" className="flex min-w-0 max-w-full flex-[1_0_auto] flex-wrap items-center gap-2">{toolbar}</div>
        <p id={hintId} data-part="hint" className="m-0 ms-auto flex items-center gap-2 font-ui text-xs text-ink-muted">
          {offline ? (
            <span className="flex items-center gap-1.5 text-ink-warn">
              <WifiOff aria-hidden className="size-(--icon-sm)" />
              {t.offline}
            </span>
          ) : (
            <span className="hidden sm:inline">{shortcut}</span>
          )}
          {showEstimate && value.length > 0 ? (
            // The provider's locale or a fixed one, as in Chip: the runtime's
            // default differs between the server and the browser, which is a
            // hydration mismatch.
            <span className="tabular" aria-label={f.format(t.estimateSpoken, { count: f.number(estimate) })}>
              {f.format(t.estimate, { count: f.number(estimate) })}
            </span>
          ) : null}
        </p>
        {generating ? (
          <Button data-part="stop" type="button" size="sm" variant="secondary" icon={<Square className="fill-current" />} onClick={onStop}>
            {t.stop}
          </Button>
        ) : (
          <Button data-part="send" type="submit" size="sm" icon={<ArrowUp />} disabled={!canSend}>
            {t.send}
          </Button>
        )}
      </div>
    </form>
  )
}

export interface AttachmentChipProps extends React.ComponentProps<'span'> {
  /**
   * The file or item's name, set as a literal and used in the remove button's name
   * ("Remove report.csv").
   */
  name: string
  /** e.g. "CSV · 48 KB". */
  detail?: string
  /**
   * Takes the attachment off the next prompt. Shows a remove button; omit for an
   * attachment that cannot be removed.
   */
  onRemove?: () => void
  /** Words for translation: the remove button's name. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<AttachmentChipMessages>
}

/** A file or context item attached to the next prompt. The filename is a literal. */
export function AttachmentChip({ name, detail, onRemove, messages, className, ...props }: AttachmentChipProps) {
  const [t, f] = useMessages('attachmentChip', attachmentChipMessages, messages)
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
          aria-label={f.format(t.remove, { name })}
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
