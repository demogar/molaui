'use client'

import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { type Variants } from '../../lib/variants'
import { type RecommendationBadgeMessages, recommendationBadgeMessages } from './messages'

/**
 * A status mark. Small, flat, cut — a scrap of the layer that says what state
 * something is in.
 *
 * Tones are the system's layers mapped onto meaning, not a second palette:
 * info is añil, success verde, danger rojo, warn and accent gold. There is no
 * purple "running" and no teal "queued", because every hue that is not one of
 * the four layers is a hue this world does not own.
 *
 * Three variants, three weights of claim:
 *
 *   solid    the layer itself. For the one state on a row that must be seen
 *            from across the room — failed, live.
 *   soft     a wash of the layer, the default. A table column of fifty
 *            statuses in solid colour is a quilt, not a column.
 *   outline  a keyline in the tone. For metadata that is categorical rather
 *            than urgent.
 *
 * Text contrast, measured with src/tokens/color.ts (light / dark), all at
 * the 12px badge size, so every pairing must clear 4.5:1:
 *
 *   solid    on-ink on ink 16.82 / 13.79 · on-layer on añil 7.96 / 6.80 ·
 *            on verde 6.06 / 7.40 · on rojo 5.46 / 5.31 · on-oro on oro 9.34 / 9.19
 *   soft     ink on ink-soft 14.30 / 11.82 · añil on añil-soft 6.52 / 5.64 ·
 *            verde on verde-soft 5.07 / 6.08 · rojo-deep on rojo-soft 6.19 / 6.02 ·
 *            ink-2 on oro-soft 8.56 / 6.34
 *   outline  añil 7.96 / 6.80 · verde 6.06 / 7.40 · rojo-deep 7.32 / 7.06 ·
 *            warn 4.99 / 8.34 on cloth-pale
 *
 * Two pairings were rejected by measurement rather than taste: --warn on
 * --oro-soft is 4.47:1 in the light theme, and plain --rojo on --rojo-soft is
 * 4.53:1 in the dark one — both one rounding error from failing. So a soft
 * warning is set in --ink-2 with the gold carried by the dot, and a soft
 * danger in --rojo-deep. Gold is never text on light cloth: the accent and
 * warn outlines put the gold in the edge and keep the label in ink.
 */
export const badgeVariants = cva(
  [
    'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-none',
    // The name register (ADR 0017): a status is a word a person reads, in
    // the case it was written in.
    'etiqueta text-xs leading-none px-2 py-[5px]',
  ],
  {
    variants: {
      /**
       * The status the badge states, as one of the four layers. Say the state
       * in the label too: the tone colours it, the words carry it.
       */
      tone: {
        neutral: '',
        info: '',
        success: '',
        warn: '',
        danger: '',
        accent: '',
      },
      /**
       * How loud the claim is: `soft` (default) for a column of statuses,
       * `solid` for the one state that must be seen from across the room,
       * `outline` for categorical metadata.
       */
      variant: {
        solid: '',
        soft: '',
        outline: 'bg-cloth-pale',
      },
    },
    compoundVariants: [
      // solid — the layer itself, bounded by the ink keyline every cut shape has
      { variant: 'solid', tone: 'neutral', class: 'bg-ink text-on-ink' },
      { variant: 'solid', tone: 'info', class: 'bg-anil text-on-layer shadow-cut' },
      { variant: 'solid', tone: 'success', class: 'bg-verde text-on-layer shadow-cut' },
      { variant: 'solid', tone: 'danger', class: 'bg-danger text-on-layer shadow-cut' },
      { variant: 'solid', tone: 'warn', class: 'bg-oro text-on-oro shadow-cut' },
      { variant: 'solid', tone: 'accent', class: 'bg-accent text-on-accent shadow-cut' },
      // soft — a wash, no keyline: it belongs to the row, it is not a control
      { variant: 'soft', tone: 'neutral', class: 'bg-ink-soft text-ink' },
      { variant: 'soft', tone: 'info', class: 'bg-anil-soft text-anil' },
      { variant: 'soft', tone: 'success', class: 'bg-verde-soft text-verde' },
      { variant: 'soft', tone: 'danger', class: 'bg-danger-soft text-ink-danger' },
      { variant: 'soft', tone: 'warn', class: 'bg-oro-soft text-ink-2' },
      { variant: 'soft', tone: 'accent', class: 'bg-accent-soft text-ink' },
      // outline — the tone moves into the edge
      { variant: 'outline', tone: 'neutral', class: 'text-ink-2 cut-ink-muted' },
      { variant: 'outline', tone: 'info', class: 'text-anil cut-anil' },
      { variant: 'outline', tone: 'success', class: 'text-verde cut-verde' },
      { variant: 'outline', tone: 'danger', class: 'text-ink-danger cut-danger' },
      { variant: 'outline', tone: 'warn', class: 'text-ink-warn cut-warn' },
      {
        variant: 'outline',
        tone: 'accent',
        class: 'text-ink cut-ink bar-bottom-accent',
      },
    ],
    defaultVariants: { tone: 'neutral', variant: 'soft' },
  },
)

export type BadgeTone = NonNullable<Variants<typeof badgeVariants>['tone']>

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    Variants<typeof badgeVariants> {
  /** A leading StatusDot in the badge's tone. */
  dot?: boolean
  /** Pulse the dot — for a state that is live right now (running, streaming). */
  pulse?: boolean
}

export function Badge({ className, tone, variant, dot = false, pulse = false, children, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? 'soft'}
      className={cn('group/badge', badgeVariants({ tone, variant }), className)}
      {...props}
    >
      {dot ? <StatusDot tone={tone ?? 'neutral'} pulse={pulse} /> : null}
      {children}
    </span>
  )
}

/**
 * The shape each tone is cut as. Every tone has its own, so the six survive
 * greyscale, a colour-blind reader and a screenshot pasted into a monochrome
 * ticket. The set is RunStatus's, keyed by tone, so a run's "Failed" in the
 * runs table and in the run's own header are the same mark:
 *
 *   neutral  hollow    cut, nothing revealed yet       (RunStatus: queued)
 *   info     striped   slits: work is under way         (running, streaming)
 *   success  filled    the layer fully revealed         (succeeded)
 *   warn     half      holding, half revealed           (waiting)
 *   danger   crossed   filled and struck through        (failed)
 *   accent   diamond   the one tone that is not a state
 *
 * Every badge used to draw the same filled square, so the only difference
 * between "Failed" and "Succeeded" was hue, and warn and accent, both gold,
 * were the same mark in solid and soft. Accent is a diamond rather than a
 * second filled square because a filled square already means "succeeded".
 */
export const STATUS_GLYPH = {
  neutral: 'hollow',
  info: 'striped',
  success: 'filled',
  warn: 'half',
  danger: 'crossed',
  accent: 'diamond',
} as const satisfies Record<BadgeTone, string>

export type StatusGlyph = (typeof STATUS_GLYPH)[BadgeTone]

export interface StatusDotProps extends React.ComponentProps<'span'> {
  /** The status, in the same tones as Badge. Defaults to `neutral`. */
  tone?: BadgeTone
  /** The state is live. Respects reduced motion: the pulse stills, the dot stays. */
  pulse?: boolean
  /**
   * Announced text for a dot used on its own. Omit when the dot sits beside a
   * label that already says the state — then it is decorative and hidden.
   */
  label?: string
}

// Inside a solid badge the ground is the tone itself, so a mark in the tone
// would vanish into it. There every part of the glyph takes the label's ink
// (`currentColor`) and the shape alone says which state it is.
const ON_SOLID_STROKE = 'group-data-[variant=solid]/badge:stroke-current'
const ON_SOLID_FILL = 'group-data-[variant=solid]/badge:fill-current'
const ON_SOLID_EMPTY = 'group-data-[variant=solid]/badge:fill-none'
// Forced colours leave SVG paint alone, so a gold mark could sit on a black
// Canvas with a black keyline. The shape is repainted in the user's palette.
const FORCED_STROKE = 'forced-colors:stroke-[CanvasText]'
const FORCED_FILL = 'forced-colors:fill-[CanvasText]'
const FORCED_KNOCK = 'forced-colors:stroke-[Canvas]'

/**
 * A square, not a circle. It is a scrap of cut cloth, and a round dot is the
 * one shape a blade cannot make. Each tone is cut as its own shape (see
 * STATUS_GLYPH), and every shape carries an ink keyline, because gold on light
 * cloth is 1.66:1 — under the 3:1 a graphic mark needs to be seen.
 *
 * The fills are the status roles (--success, --warn, --danger, --info), not
 * the layers: the roles are what the scopes give to marks, and --warn is the
 * gold darkened until it clears 3:1 on cloth. Accent is not a state, so it
 * keeps the gold layer.
 *
 * A dot is never the only carrier of a state: colour alone fails SC 1.4.1, so
 * either a label sits beside it or `label` names it. The shape is the second
 * carrier, not a replacement for the word.
 */
export function StatusDot({ tone = 'neutral', pulse = false, label, className, ...props }: StatusDotProps) {
  const glyph = STATUS_GLYPH[tone]
  const keyline = cn('stroke-ink', ON_SOLID_STROKE, FORCED_STROKE)
  return (
    <span
      data-slot="status-dot"
      data-glyph={glyph}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex size-[9px] shrink-0 rounded-none', pulse && 'animate-mola-pulse', className)}
      {...props}
    >
      <svg viewBox="0 0 10 10" className="size-full overflow-visible" strokeWidth={1.5}>
        {glyph === 'hollow' ? (
          <rect x="0.75" y="0.75" width="8.5" height="8.5" className={cn('fill-none', keyline)} />
        ) : null}
        {glyph === 'filled' ? (
          <rect x="0.75" y="0.75" width="8.5" height="8.5" className={cn('fill-success', ON_SOLID_FILL, FORCED_FILL, keyline)} />
        ) : null}
        {glyph === 'striped' ? (
          <>
            <rect x="0.75" y="0.75" width="8.5" height="8.5" className={cn('fill-info', ON_SOLID_EMPTY, FORCED_FILL, keyline)} />
            <path d="M3.75 1.5v7M6.25 1.5v7" strokeWidth={1.2} className={cn('stroke-on-layer', ON_SOLID_STROKE, FORCED_KNOCK)} />
          </>
        ) : null}
        {glyph === 'half' ? (
          <>
            <rect x="0.75" y="5" width="8.5" height="4.25" className={cn('fill-warn stroke-none', ON_SOLID_FILL, FORCED_FILL)} />
            <rect x="0.75" y="0.75" width="8.5" height="8.5" className={cn('fill-none', keyline)} />
          </>
        ) : null}
        {glyph === 'crossed' ? (
          <>
            <rect x="0.75" y="0.75" width="8.5" height="8.5" className={cn('fill-danger', ON_SOLID_EMPTY, FORCED_FILL, keyline)} />
            <path d="M3 3l4 4M7 3l-4 4" strokeWidth={1.4} className={cn('stroke-on-layer', ON_SOLID_STROKE, FORCED_KNOCK)} />
          </>
        ) : null}
        {glyph === 'diamond' ? (
          <path d="M5 0.6L9.4 5L5 9.4L0.6 5Z" className={cn('fill-accent', ON_SOLID_FILL, FORCED_FILL, keyline)} />
        ) : null}
      </svg>
    </span>
  )
}

/**
 * The editorial recommendation scale of the editorial system this grew out
 * of — kept as lineage, and because "how strongly do we stand behind
 * this" is a scale a support or knowledge tool also has. Gold is the layer a
 * mola reveals last and least, so gold is `essential`.
 */
export const recommendationVariants = cva('inline-flex items-center etiqueta text-xs leading-none px-2.5 py-[6px] rounded-none shadow-cut', {
  variants: {
    /**
     * How strongly the recommendation is made, from `essential` (gold) down to
     * `time`. Each level brings its own label; pass children only to reword it.
     */
    level: {
      essential: 'bg-oro text-on-oro',
      highly: 'bg-cloth-pale text-ink',
      detour: 'bg-verde text-on-layer',
      time: 'bg-cloth-shade text-ink-2',
    },
  },
  defaultVariants: { level: 'essential' },
})

export type RecommendationLevel = NonNullable<Variants<typeof recommendationVariants>['level']>

// The English label of each level, kept as an export for code that read it;
// the badge itself reads `messages.recommendationBadge`, so a translation
// reaches it. A line comment and a copy, for the reason RUN_STATUS_LABEL
// gives: Storybook's docgen writes into a documented exported object.
export const RECOMMENDATION_LABELS: Record<RecommendationLevel, string> = { ...recommendationBadgeMessages }

export interface RecommendationBadgeProps
  extends React.ComponentProps<'span'>,
    Variants<typeof recommendationVariants> {
  /** Words for translation: the label of each level. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<RecommendationBadgeMessages>
}

export function RecommendationBadge({ className, level, children, messages, ...props }: RecommendationBadgeProps) {
  const [t] = useMessages('recommendationBadge', recommendationBadgeMessages, messages)
  return (
    <span data-slot="recommendation-badge" className={cn(recommendationVariants({ level }), className)} {...props}>
      {children ?? t[level ?? 'essential']}
    </span>
  )
}
