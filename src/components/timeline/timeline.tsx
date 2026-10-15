import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { deprecate } from '../../lib/deprecate'

/**
 * A vertical sequence drawn as a spine beside the events it connects: an
 * audit log, a deploy history, the stages of a rollout.
 *
 * Always an `<ol>`. The order is the content, and a screen reader should say
 * "3 of 7" while a sighted reader follows the line.
 *
 * The spine is two real elements per row rather than `::before`/`::after`, so
 * the connector can be dropped after the last event — a line running past the
 * final stop is the one detail that makes a timeline look unfinished.
 *
 * Nodes are squares, toned by what happened, and an `active` node carries the
 * working relleno: the step that is happening now, as opposed to one that is
 * merely the latest. The tone is never the only signal — each event's title
 * and meta say what happened in words.
 *
 * For a live agent run, use the AI run timeline instead: this one is for
 * events that have already been written down.
 */

export type TimelineTone = 'neutral' | 'success' | 'danger' | 'warn' | 'info' | 'active'

export interface TimelineItem {
  id?: string
  title: React.ReactNode
  description?: React.ReactNode
  /** When or where: "14:02", "Day 1–2", "Deploy #212". Read before the title. */
  meta?: React.ReactNode
  tone?: TimelineTone
}

const NODE: Record<TimelineTone, string> = {
  neutral: 'bg-cloth-pale shadow-cut',
  success: 'bg-verde',
  danger: 'bg-danger',
  warn: 'bg-oro cut-thin',
  info: 'bg-anil',
  active: 'band-accent relleno-working shadow-cut',
}

export interface TimelineProps extends Omit<React.ComponentProps<'ol'>, 'children'> {
  /** The events, in the order they happened, one node on the spine each. A `tone` on an item states its outcome. */
  items: TimelineItem[]
  /** Names the list, since the spine carries no heading of its own. */
  label: string
  /**
   * `spaced`   separate events, a gap between rows.
   * `flush`    one continuous journey, carried by the connector alone.
   */
  gap?: 'spaced' | 'flush'
  /**
   * `default`   product scale: semibold titles at body size.
   * `editorial` the travel-guide scale it was born at, for a narrative.
   */
  variant?: TimelineVariant
  /**
   * @deprecated Since 0.7.0; removed in 1.0.0. Use `variant`, which takes the
   * same values: a type scale is a presentation, and `size` is the t-shirt
   * scale everywhere else.
   */
  size?: TimelineVariant
  /** The element each title renders as. Defaults to a non-heading, since most logs are not outlines. */
  titleAs?: 'h3' | 'h4' | 'p'
}

export type TimelineVariant = 'default' | 'editorial'

/** `className`, `ref` and the rest of the DOM props go to the `<ol>`. */
export function Timeline({
  items,
  label,
  gap = 'spaced',
  variant: variantProp,
  size: sizeProp,
  titleAs: TitleTag = 'p',
  className,
  ...props
}: TimelineProps) {
  if (sizeProp !== undefined) {
    deprecate('timeline-size', { what: '<Timeline size>', instead: '<Timeline variant>', removal: '1.0.0' })
  }
  const variant = variantProp ?? sizeProp ?? 'default'
  return (
    <ol aria-label={label} {...props} data-slot="timeline" className={cn('m-0 list-none p-0', className)}>
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <li key={item.id ?? i} className="grid grid-cols-[16px_1fr] gap-x-3">
            <span aria-hidden className="flex flex-col items-center">
              <span className={cn('mt-[0.45em] size-2.5 flex-none rounded-none', NODE[item.tone ?? 'neutral'])} />
              {!last ? <span className="my-1 w-px flex-1 bg-keyline" /> : null}
            </span>
            <div className={cn(!last && (gap === 'spaced' ? 'pb-5' : 'pb-2'))}>
              {item.meta ? (
                <span className="block text-xs tabular-nums text-ink-muted">{item.meta}</span>
              ) : null}
              <TitleTag
                className={cn(
                  'm-0 font-display wdth-display text-ink',
                  variant === 'editorial'
                    ? 'mt-1 text-xl leading-heading font-normal tracking-heading'
                    : 'text-sm leading-snug font-semibold',
                )}
              >
                {item.title}
              </TitleTag>
              {item.description ? (
                <div
                  className={cn(
                    'mt-1 text-ink-2',
                    variant === 'editorial' ? 'font-text text-base leading-body' : 'text-sm',
                  )}
                >
                  {item.description}
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export interface StepListItem {
  /** "Step 1", "Day 1–2", "Before launch". Omit to number by position. */
  label?: React.ReactNode
  title: React.ReactNode
  note?: React.ReactNode
  id?: string
}

const stepListVariants = cva('m-0 list-none p-0', {
  variants: {
    inverse: {
      false: 'cut-t',
      true: 'on-ink rule-t px-5',
    },
  },
})

export interface StepListProps extends Omit<React.ComponentProps<'ol'>, 'children'> {
  /** The steps, in order. An item without a `label` is numbered by position; one authored label widens the column for every row. */
  items: StepListItem[]
  /** Set the list on an ink panel. */
  inverse?: boolean
  /**
   * @deprecated Since 0.7.0; removed in 1.0.0. Use `inverse`: `tone` is a
   * status everywhere else, and this was a ground.
   */
  tone?: 'default' | 'inverse'
  /** The element each step title renders as, `h3` by default: a runbook's steps are its outline. Use `p` when they are not. */
  titleAs?: 'h3' | 'h4' | 'p'
}

/**
 * Ruled, ordered steps — a runbook, an onboarding checklist, the stages of a
 * rollout. Where `Timeline` is a spine with a node per event, this is a stack
 * of ruled bands with a label column, and merging the two would mean a
 * component whose every rule is conditional.
 *
 * An authored label ("Before launch") is content and is read out; a
 * positional numeral is decoration the `<ol>` already announces, so it is
 * hidden. One authored label widens the whole column: a ragged label column
 * down a single list reads as a mistake.
 *
 * `className`, `ref` and the rest of the DOM props go to the `<ol>`.
 */
export function StepList({ items, inverse: inverseProp, tone, titleAs: TitleTag = 'h3', className, ...props }: StepListProps) {
  if (tone !== undefined) {
    deprecate('step-list-tone', { what: '<StepList tone>', instead: '<StepList inverse>', removal: '1.0.0' })
  }
  const inverse = inverseProp ?? tone === 'inverse'
  const wideLabel = items.some((item) => item.label !== undefined)
  return (
    <ol {...props} data-slot="step-list" className={cn(stepListVariants({ inverse }), className)}>
      {items.map((item, i) => (
        <li
          key={item.id ?? i}
          className={cn(
            'grid grid-cols-1 gap-1 py-4 sm:gap-4',
            // On the inverse panel `on-ink` has already turned --keyline
            // into --keyline-on-ink, so one rule serves both.
            'rule-b',
            wideLabel ? 'sm:grid-cols-[7rem_1fr]' : 'sm:grid-cols-[2.5rem_1fr]',
          )}
        >
          <span
            aria-hidden={item.label === undefined ? true : undefined}
            className={cn(
              'pt-0.5 font-ui text-sm font-semibold tabular-nums tracking-figures',
              // Not gold on the inverse panel: in the dark theme that panel is
              // bleached cotton, where gold measures 1.49:1. Full --on-ink is
              // the only ink measured on the inverse ground in both themes.
              inverse ? 'text-on-ink' : 'text-ink',
              item.label !== undefined && 'pt-1 text-xs uppercase tracking-label wdth-label',
            )}
          >
            {item.label ?? String(i + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <TitleTag className="m-0 font-display text-base leading-snug font-semibold wdth-display">
              {item.title}
            </TitleTag>
            {item.note ? <p className="mt-1 mb-0 text-sm text-ink-2">{item.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
