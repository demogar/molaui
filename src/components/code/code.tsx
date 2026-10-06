'use client'

import { Check, Copy, WrapText } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { IconButton } from '../button'
import { JSON_TOKEN_CLASS, tokenizeJson } from './highlight-json'

/**
 * An inline machine literal: an id, a field name, a flag.
 *
 * Martian Mono, narrowed, on a wash of ink — the one place the system admits a
 * monospace, because `run_8f2c` has to read as eight exact characters, not as
 * a word. It is never a label and never a number in a table: tabular figures
 * in Archivo do that job.
 */
export function Code({ className, ...props }: React.ComponentProps<'code'>) {
  return (
    <code
      data-slot="code"
      className={cn('literal rounded-none bg-ink-soft px-[0.35em] py-[0.12em] text-ink', className)}
      {...props}
    />
  )
}

export type CodeLanguage = 'json' | 'text' | 'shell' | 'sql' | 'ts' | 'python' | 'markdown'

export interface CodeBlockProps extends Omit<React.ComponentProps<'figure'>, 'children'> {
  code: string
  /** Shown as a tag in the header. Only `json` is tokenized; everything else is plain. */
  language?: CodeLanguage
  /** A filename or a role — "arguments", "result", "query.sql". */
  label?: string
  lineNumbers?: boolean
  /** Scroll inside after this height (any CSS length). */
  maxHeight?: string
  /** Start with long lines wrapped. The reader can toggle it. */
  wrap?: boolean
  /** Hide the copy button — for payloads that must not leave the page. */
  copyable?: boolean
}

/**
 * A block of machine text — a tool call's arguments, a query, a log tail.
 *
 * The header is the label register on cloth-shade, and the body is raised
 * cloth inside one ink keyline: a cut panel, like everything else. Not a dark
 * "terminal" box. A black code block in a light interface is a costume
 * borrowed from editors; here code is just another kind of content sitting on
 * the same cloth, and in the dark theme it is dark because everything is.
 *
 * ── copy ──
 * Copy confirms in place (the icon becomes a check) AND through a polite live
 * region, because a changed icon is invisible to a screen reader and a toast
 * for a copy is noise. The region is always mounted — a live region inserted
 * at the moment it speaks is not reliably announced.
 *
 * ── wrap ──
 * Off by default: in JSON and SQL, indentation is structure, and wrapping a
 * long string breaks the column the eye follows. It is a toggle rather than a
 * prop-only choice because which is right depends on the payload, and only
 * the reader can see the payload.
 *
 * ── the scroll region is focusable ──
 * A scrolling region with no focusable content cannot be scrolled with a
 * keyboard (axe: scrollable-region-focusable), so the `<pre>` takes
 * `tabIndex={0}` and is named by the block's label.
 */
export function CodeBlock({
  code,
  language = 'text',
  label,
  lineNumbers = false,
  maxHeight,
  wrap: initialWrap = false,
  copyable = true,
  className,
  ...props
}: CodeBlockProps) {
  const [wrap, setWrap] = React.useState(initialWrap)
  const [copied, setCopied] = React.useState(false)
  const labelId = React.useId()

  React.useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      // Clipboard can be denied (insecure context, permissions). Saying nothing
      // is wrong, but a copy failure is not worth an error state either: the
      // text is selectable, which is the fallback every reader already knows.
      setCopied(false)
    }
  }

  const lines = code.replace(/\n$/, '').split('\n')
  const tokens = language === 'json' ? tokenizeJson(code.replace(/\n$/, '')) : null

  const body = tokens
    ? tokens.map((t, i) =>
        JSON_TOKEN_CLASS[t.kind] ? (
          <span key={i} className={JSON_TOKEN_CLASS[t.kind]}>
            {t.text}
          </span>
        ) : (
          t.text
        ),
      )
    : code.replace(/\n$/, '')

  const title = label ?? language

  return (
    <figure
      data-slot="code-block"
      className={cn('m-0 min-w-0 rounded-none bg-cloth-pale shadow-cut', className)}
      {...props}
    >
      <figcaption className="flex min-h-(--control-h-sm) items-center gap-3 bg-cloth-shade py-1 pr-1 pl-3 shadow-[inset_0_-1px_0_var(--keyline)]">
        <span id={labelId} className="min-w-0 truncate rotulo text-ink-2">
          {title}
        </span>
        {label && language !== 'text' ? (
          <span className="rotulo text-ink-muted">{language}</span>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          <IconButton
            label={wrap ? 'Do not wrap lines' : 'Wrap lines'}
            variant="ghost"
            size="sm"
            aria-pressed={wrap}
            onClick={() => setWrap((w) => !w)}
            className={cn(wrap && 'bg-ink-soft')}
          >
            <WrapText />
          </IconButton>
          {copyable ? (
            <IconButton label={copied ? 'Copied' : 'Copy to clipboard'} variant="ghost" size="sm" onClick={copy}>
              {copied ? <Check className="text-verde" /> : <Copy />}
            </IconButton>
          ) : null}
        </span>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? 'Copied to clipboard' : ''}
        </span>
      </figcaption>
      <div
        className="flex overflow-auto scroll-cloth [--code-lh:calc(var(--text-xs)*1.7)]"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {lineNumbers ? (
          <div
            aria-hidden
            className="sticky left-0 shrink-0 bg-cloth-pale py-3 pr-3 pl-3 text-right font-ui text-xs leading-(--code-lh) text-ink-muted tabular select-none shadow-[inset_-1px_0_0_var(--keyline-soft)]"
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        ) : null}
        <pre
          tabIndex={0}
          aria-labelledby={labelId}
          className={cn(
            'm-0 min-w-0 flex-1 p-3 literal text-xs leading-(--code-lh) text-ink',
            'focus-visible:shadow-[inset_0_0_0_2px_var(--ink)]',
            wrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
          )}
        >
          <code>{body}</code>
        </pre>
      </div>
    </figure>
  )
}
