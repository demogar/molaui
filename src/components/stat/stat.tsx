'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * A KPI tile: label, figure, change, and optionally the shape of the recent
 * past.
 *
 * ── direction is not sentiment ──
 * A delta carries two independent facts: which way the number moved, and
 * whether that is good. Latency going up is bad; cost going down is good. So
 * the glyph follows `direction` and the colour follows `sentiment`, and the
 * caller states both. A tile that infers "up is green" is wrong on half the
 * dashboards it is dropped into.
 *
 * Colour is never the only carrier: the arrow says which way, and the
 * visually hidden sentence ("Up 12% versus last week, an improvement") says
 * both facts to a screen reader in one breath.
 *
 * ── semantics ──
 * A tile is a term and its value, so it is a `<dt>`/`<dd>` pair. Inside a
 * `StatGroup` the group is the `<dl>`; a tile on its own wraps itself in one.
 */

const StatGroupContext = React.createContext(false)

export interface StatDelta {
  /** As displayed, e.g. "12%" or "−0.4s". */
  value: string
  direction: 'up' | 'down' | 'flat'
  /** Whether the movement is good news. Defaults to neutral, which is ink. */
  sentiment?: 'positive' | 'negative' | 'neutral'
  /** The comparison, e.g. "vs last week". Shown, and read out. */
  period?: string
}

export interface StatProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  label: React.ReactNode
  value: React.ReactNode
  /** Set smaller beside the figure: "ms", "runs", "%". */
  unit?: React.ReactNode
  delta?: StatDelta
  /** The recent series, oldest first. Drawn in ink with the latest point cut out in rojo. */
  trend?: number[]
  /** A line of context under the figure. */
  hint?: React.ReactNode
}

const SENTIMENT_TONE = {
  positive: 'text-ink-success',
  negative: 'text-ink-danger',
  neutral: 'text-ink-2',
} as const

const SENTIMENT_WORD = {
  positive: 'an improvement',
  negative: 'a regression',
  neutral: '',
} as const

export function Stat({ label, value, unit, delta, trend, hint, className, ...props }: StatProps) {
  const inGroup = React.useContext(StatGroupContext)

  const tile = (
    <div
      data-slot="stat"
      className={cn(
        'flex min-w-0 flex-col gap-2 p-4',
        !inGroup && 'bg-cloth-pale shadow-cut',
        className,
      )}
      {...props}
    >
      <dt className="rotulo text-ink-muted">{label}</dt>
      <dd className="m-0 flex flex-col gap-2">
        <span className="flex items-end justify-between gap-4">
          {/* A figure and its unit are one literal: `dir="auto"` keeps "97.8 %"
              and "0.4 pt" in order in a right-to-left page. */}
          <span dir="auto" className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-display text-2xl leading-none font-bold tracking-display tabular-nums wdth-display text-ink">
              {value}
            </span>
            {unit ? <span className="text-sm text-ink-muted">{unit}</span> : null}
          </span>
          {trend && trend.length > 1 ? <Sparkline values={trend} /> : null}
        </span>
        {delta ? <StatDeltaLine delta={delta} /> : null}
        {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
      </dd>
    </div>
  )

  return inGroup ? tile : <dl className="m-0">{tile}</dl>
}

function StatDeltaLine({ delta }: { delta: StatDelta }) {
  const sentiment = delta.sentiment ?? 'neutral'
  const Glyph = delta.direction === 'up' ? ArrowUpRight : delta.direction === 'down' ? ArrowDownRight : Minus
  const word = delta.direction === 'up' ? 'Up' : delta.direction === 'down' ? 'Down' : 'Unchanged at'
  const spoken = [`${word} ${delta.value}`, delta.period, SENTIMENT_WORD[sentiment]].filter(Boolean).join(', ')

  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={cn('inline-flex items-center gap-0.5 font-semibold tabular-nums', SENTIMENT_TONE[sentiment])}>
        <Glyph aria-hidden className="size-3.5" strokeWidth={2.5} />
        <span aria-hidden dir="auto">
          {delta.value}
        </span>
      </span>
      {delta.period ? (
        <span aria-hidden className="text-ink-muted">
          {delta.period}
        </span>
      ) : null}
      <span className="sr-only">{spoken}</span>
    </span>
  )
}

/**
 * An ink polyline — no fill, no gradient, no axis. A sparkline is the shape of
 * the recent past and nothing more; the moment it grows a gridline it is a
 * chart pretending to be a glyph. The last point is a square cut out in rojo
 * (it is the "now" the figure beside it states), drawn as a square because a
 * blade does not cut circles.
 *
 * Decorative: the figure and the delta already say what it shows.
 */
export function Sparkline({
  values,
  width = 72,
  height = 24,
  className,
}: {
  values: number[]
  width?: number
  height?: number
  className?: string
}) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 3
  const points = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ])
  const last = points.at(-1)!

  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0 overflow-visible', className)}
    >
      <polyline
        points={points.map(([x, y]) => `${x!.toFixed(1)},${y!.toFixed(1)}`).join(' ')}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={1.5}
        strokeLinejoin="miter"
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
      <rect x={last[0]! - 2.5} y={last[1]! - 2.5} width={5} height={5} fill="var(--rojo)" stroke="var(--ink)" strokeWidth={1} />
    </svg>
  )
}

export interface StatGroupProps extends React.ComponentProps<'dl'> {
  /** Columns when there is room for them. Tiles wrap down to two, then one. */
  columns?: 2 | 3 | 4 | 5
}

// Container widths, not viewport breakpoints: about 11rem a tile before the
// next column is added.
const COLUMNS = {
  2: '@md:grid-cols-2',
  3: '@md:grid-cols-2 @2xl:grid-cols-3',
  4: '@md:grid-cols-2 @3xl:grid-cols-4',
  5: '@xl:grid-cols-3 @4xl:grid-cols-5',
} as const

/**
 * Tiles cut from one panel rather than four floating cards: one ink keyline
 * around the group, decorative keylines between tiles. Four separate cut
 * shapes in a row would put eight ink edges where the eye needs one.
 *
 * The dividers are a 1px gap over a keyline ground rather than per-tile
 * borders, so they stay correct whatever the column count wraps to.
 *
 * Columns follow the width the group is given, not the window: a group in a
 * side panel or a two-column page used to keep four columns at a desktop
 * width and squeeze each tile to a sliver. The wrapper is the query
 * container, because a grid cannot query its own width.
 */
export function StatGroup({ columns = 4, className, children, ...props }: StatGroupProps) {
  return (
    <StatGroupContext.Provider value={true}>
      <div className="@container">
        <dl
          data-slot="stat-group"
          className={cn(
            'm-0 grid grid-cols-1 gap-px bg-keyline shadow-cut',
            '[&>[data-slot=stat]]:bg-cloth-pale',
            COLUMNS[columns],
            className,
          )}
          {...props}
        >
          {children}
        </dl>
      </div>
    </StatGroupContext.Provider>
  )
}
