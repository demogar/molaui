import type * as React from 'react'

import { cn } from '../../../lib/cn'

export interface TokenUsageProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  input: number
  output: number
  /** Input tokens served from cache — cheaper, and worth knowing about. */
  cached?: number
  /** Cost in USD, if the platform knows it. */
  costUsd?: number
  /** The model's context window. With it, a meter shows how full the context is. */
  contextWindow?: number
  /** `full`: a definition list and meter. `inline`: one line, for a run header. */
  variant?: 'full' | 'inline'
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const usd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })

export function contextLevel(ratio: number): 'ok' | 'warn' | 'danger' {
  if (ratio >= 0.95) return 'danger'
  if (ratio >= 0.8) return 'warn'
  return 'ok'
}

const LEVEL_WORD = { ok: '', warn: 'Near the limit', danger: 'At the limit' } as const

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
  className,
  ...props
}: TokenUsageProps) {
  const used = input + output
  const ratio = contextWindow ? Math.min(1, used / contextWindow) : undefined
  const level = ratio !== undefined ? contextLevel(ratio) : 'ok'

  if (variant === 'inline') {
    return (
      <div data-slot="token-usage" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs tabular text-ink-muted', className)} {...props}>
        <span>
          <span className="text-ink-2">{compact.format(input)}</span> in
        </span>
        <span>
          <span className="text-ink-2">{compact.format(output)}</span> out
        </span>
        {costUsd !== undefined ? <span className="text-ink-2">{usd.format(costUsd)}</span> : null}
        {ratio !== undefined ? <ContextMeter ratio={ratio} level={level} className="w-16" /> : null}
      </div>
    )
  }

  const rows: [string, string][] = [
    ['Input', compact.format(input)],
    ...(cached !== undefined ? ([['Cached', compact.format(cached)]] as [string, string][]) : []),
    ['Output', compact.format(output)],
    ...(costUsd !== undefined ? ([['Cost', usd.format(costUsd)]] as [string, string][]) : []),
  ]

  return (
    <div data-slot="token-usage" className={cn('flex flex-col gap-3', className)} {...props}>
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {rows.map(([term, detail]) => (
          <div key={term} className="m-0">
            <dt className="rotulo text-ink-muted">{term}</dt>
            <dd className="m-0 mt-1 font-ui text-lg font-semibold tabular text-ink">{detail}</dd>
          </div>
        ))}
      </dl>
      {ratio !== undefined && contextWindow ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 font-ui text-xs">
            <span className="rotulo text-ink-muted">
              Context
            </span>
            <span className="tabular text-ink-2">
              {LEVEL_WORD[level] ? (
                <span className={cn('me-2 font-semibold', level === 'danger' ? 'text-ink-danger' : 'text-ink-warn')}>
                  {LEVEL_WORD[level]}
                </span>
              ) : null}
              {compact.format(used)} / {compact.format(contextWindow)} · {Math.round(ratio * 100)}%
            </span>
          </div>
          <ContextMeter ratio={ratio} level={level} />
        </div>
      ) : null}
    </div>
  )
}

function ContextMeter({ ratio, level, className }: { ratio: number; level: 'ok' | 'warn' | 'danger'; className?: string }) {
  const pct = Math.round(ratio * 100)
  return (
    <div
      role="meter"
      aria-label="Context window used"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${pct}% of the context window${LEVEL_WORD[level] ? `, ${LEVEL_WORD[level].toLowerCase()}` : ''}`}
      className={cn('relative h-2 bg-cloth-shade shadow-cut', className)}
    >
      <div
        className={cn(
          'absolute inset-y-0 inset-s-0 transition-[width] duration-(--motion-base) ease-cut',
          level === 'danger' ? 'bg-rojo' : level === 'warn' ? 'bg-oro' : 'bg-ink',
        )}
        style={{ width: `${pct}%` }}
      />
      {/* The 80% threshold, cut into the track, so the reader sees the line before crossing it. */}
      <span aria-hidden className="absolute inset-y-0 inset-s-[80%] w-px bg-ink-muted" />
    </div>
  )
}
