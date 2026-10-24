'use client'

import * as React from 'react'

import { cn } from '../../../lib/cn'
import { formatMessage, type MessagesOverride, useMessages } from '../../../lib/messages'

import { type TokenUsageMessages, tokenUsageMessages } from './messages'

export interface TokenUsageProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Tokens sent to the model, cached ones included. */
  input: number
  /**
   * Tokens the model produced. With `input`, the total measured against
   * `contextWindow`.
   */
  output: number
  /** Input tokens served from cache — cheaper, and worth knowing about. */
  cached?: number
  /** Cost in USD, if the platform knows it. */
  costUsd?: number
  /** The model's context window. With it, a meter shows how full the context is. */
  contextWindow?: number
  /** `full`: a definition list and meter. `inline`: one line, for a run header. */
  variant?: 'full' | 'inline'
  /** Words for translation: the terms, the warnings and the meter's name and reading. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<TokenUsageMessages>
}

// `en` without a provider locale, so the server and the browser write the
// same digits; a provider's locale replaces it on both.
const compactFormat = (locale: string) => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
const usdFormat = (locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })

export function contextLevel(ratio: number): 'ok' | 'warn' | 'danger' {
  if (ratio >= 0.95) return 'danger'
  if (ratio >= 0.8) return 'warn'
  return 'ok'
}


/**
 * What a run consumed.
 *
 * Token counts are compact (`12.4k`), because nobody compares the third
 * significant figure of a token count; cost keeps up to four decimals,
 * because a fraction of a cent multiplied by a million runs is a budget line.
 *
 * ── the context meter ──
 * How full the context window is matters more than how many tokens were
 * spent: past ~80% a model starts dropping the early conversation, and the
 * failure looks like the model "forgetting", not like a limit. So the meter
 * turns gold at 80% and red at 95%, AND says so in words — the colour alone
 * would be a signal half the readers of a dense dashboard never notice.
 * It is a real `role="meter"`, so the same reading is available without
 * sight.
 */
export function TokenUsage({
  input,
  output,
  cached,
  costUsd,
  contextWindow,
  variant = 'full',
  messages,
  className,
  ...props
}: TokenUsageProps) {
  const [t, f] = useMessages('tokenUsage', tokenUsageMessages, messages)
  const locale = f.locale ?? 'en'
  const compact = React.useMemo(() => compactFormat(locale), [locale])
  const usd = React.useMemo(() => usdFormat(locale), [locale])
  const levelWord = { ok: '', warn: t.nearLimit, danger: t.atLimit }
  const used = input + output
  const ratio = contextWindow ? Math.min(1, used / contextWindow) : undefined
  const level = ratio !== undefined ? contextLevel(ratio) : 'ok'

  if (variant === 'inline') {
    return (
      <div data-slot="token-usage" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs tabular text-ink-muted', className)} {...props}>
        <span>{f.nodes(t.inlineInput, { count: <span className="text-ink-2">{compact.format(input)}</span> })}</span>
        <span>{f.nodes(t.inlineOutput, { count: <span className="text-ink-2">{compact.format(output)}</span> })}</span>
        {costUsd !== undefined ? <span className="text-ink-2">{usd.format(costUsd)}</span> : null}
        {ratio !== undefined ? <ContextMeter ratio={ratio} level={level} messages={t} className="w-16" /> : null}
      </div>
    )
  }

  const rows: [string, string][] = [
    [t.input, compact.format(input)],
    ...(cached !== undefined ? ([[t.cached, compact.format(cached)]] as [string, string][]) : []),
    [t.output, compact.format(output)],
    ...(costUsd !== undefined ? ([[t.cost, usd.format(costUsd)]] as [string, string][]) : []),
  ]

  return (
    <div data-slot="token-usage" className={cn('flex flex-col gap-3', className)} {...props}>
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {rows.map(([term, detail]) => (
          <div key={term} className="m-0">
            <dt className="etiqueta text-sm text-ink-muted">{term}</dt>
            <dd className="m-0 mt-1 font-ui text-lg font-semibold tabular text-ink">{detail}</dd>
          </div>
        ))}
      </dl>
      {ratio !== undefined && contextWindow ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 font-ui text-xs">
            <span className="etiqueta text-ink-muted">
              {t.context}
            </span>
            <span className="tabular text-ink-2">
              {levelWord[level] ? (
                <span className={cn('me-2 font-semibold', level === 'danger' ? 'text-ink-danger' : 'text-ink-warn')}>
                  {levelWord[level]}
                </span>
              ) : null}
              {compact.format(used)} / {compact.format(contextWindow)} · {Math.round(ratio * 100)}%
            </span>
          </div>
          <ContextMeter ratio={ratio} level={level} messages={t} />
        </div>
      ) : null}
    </div>
  )
}

function ContextMeter({
  ratio,
  level,
  messages: t,
  className,
}: {
  ratio: number
  level: 'ok' | 'warn' | 'danger'
  messages: TokenUsageMessages
  className?: string
}) {
  const pct = Math.round(ratio * 100)
  const valueText = level === 'danger' ? t.meterValueAt : level === 'warn' ? t.meterValueNear : t.meterValue
  return (
    <div
      role="meter"
      aria-label={t.meterLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={formatMessage(valueText, { percent: pct })}
      className={cn('relative h-2 bg-cloth-shade shadow-cut', className)}
    >
      {/* Scaled from the inline start rather than sized, so the ease is
          moved by the compositor instead of laying the fill out each frame,
          as Progress and Meter do. */}
      <div
        className={cn(
          'absolute inset-0 origin-left rtl:origin-right transition-[scale] duration-(--motion-base)',
          level === 'danger' ? 'bg-danger' : level === 'warn' ? 'bg-oro' : 'bg-ink',
        )}
        style={{ scale: `${pct / 100} 1` }}
      />
      {/* The 80% threshold, cut into the track, so the reader sees the line before crossing it. */}
      <span aria-hidden className="absolute inset-y-0 inset-s-[80%] w-px bg-ink-muted" />
    </div>
  )
}
