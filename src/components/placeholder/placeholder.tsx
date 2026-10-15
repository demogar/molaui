'use client'

import type * as React from 'react'

import { cn } from '../../lib/cn'
import { deprecate } from '../../lib/deprecate'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { type PlaceholderMessages, placeholderMessages } from './messages'

export interface PlaceholderProps extends React.ComponentProps<'div'> {
  /** The kind of thing that goes here — "Image", "Chart", "Preview". */
  label?: string
  /** What it would show — "Account logo", "Tickets by plan". */
  name: string
  /** Announced in place of the missing content. */
  alt: string
  /** The cloth it is cut from: `shade` by default, `deep` on a shaded panel, where `shade` would vanish. */
  layer?: 'shade' | 'deep'
  /**
   * @deprecated Since 0.7.0; removed in 1.0.0. Use `layer`: `default` is
   * `shade`, `deep` is `deep`. A ground is a layer, as on `Panel`; `tone` is
   * a status.
   */
  tone?: 'default' | 'deep'
  /** Words for translation: the default label. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<PlaceholderMessages>
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
  label: labelProp,
  messages,
  name,
  alt,
  layer: layerProp,
  tone,
  className,
  ...props
}: PlaceholderProps) {
  const [t] = useMessages('placeholder', placeholderMessages, messages)
  const label = labelProp ?? t.label
  if (tone !== undefined) {
    deprecate('placeholder-tone', { what: '<Placeholder tone>', instead: '<Placeholder layer>', removal: '1.0.0' })
  }
  const layer = layerProp ?? (tone === 'deep' ? 'deep' : 'shade')
  return (
    <div
      role="img"
      aria-label={alt}
      data-slot="placeholder"
      className={cn(
        'relative grid place-items-center overflow-hidden rounded-none relleno-field shadow-cut',
        layer === 'deep' ? 'bg-cloth-deep' : 'bg-cloth-shade',
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
