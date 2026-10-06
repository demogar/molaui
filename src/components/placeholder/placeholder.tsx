import type * as React from 'react'

import { cn } from '../../lib/cn'

export interface PlaceholderProps extends React.ComponentProps<'div'> {
  /** The kind of thing that goes here — "Photography", "Chart", "Preview". */
  label?: string
  /** What it would show — "Panama Canal", "Retention by cohort". */
  name: string
  /** Announced in place of the missing content. */
  alt: string
  tone?: 'default' | 'deep'
}

/**
 * The slot where something will go and has not yet: a photograph that has not
 * been shot, a chart with no data, a preview that cannot render.
 *
 * Designed as a condition rather than an apology. A blank grey rectangle reads
 * as something that failed to load; a cut panel filled with relleno reads as a
 * slot cut and waiting for its content — which is what relleno is for in a
 * real panel: the area that has nothing in it yet.
 *
 * Contrast, at the 11px label: --ink-2 measures 8.19:1 on --cloth-shade and
 * 7.09:1 on --cloth-deep in the light theme. --ink-muted does not clear 4.5:1
 * on --cloth-deep, which is why it is not used here.
 */
export function Placeholder({
  label = 'Placeholder',
  name,
  alt,
  tone = 'default',
  className,
  ...props
}: PlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      data-slot="placeholder"
      className={cn(
        'relative grid place-items-center overflow-hidden rounded-none relleno-field shadow-cut',
        tone === 'deep' ? 'bg-cloth-deep' : 'bg-cloth-shade',
        className,
      )}
      {...props}
    >
      <span aria-hidden className="flex flex-col items-center gap-2 p-5 text-center">
        <span className="rotulo text-ink-2">{label}</span>
        <span className="font-display text-lg font-semibold text-ink-2 wdth-display">{name}</span>
      </span>
    </div>
  )
}
