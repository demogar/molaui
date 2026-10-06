import type * as React from 'react'

import { cn } from '../../lib/cn'
import { fieldControlClasses } from './field-control'

export interface TextareaProps extends React.ComponentProps<'textarea'> {
  /**
   * Grow with the content instead of scrolling inside a fixed box, using
   * `field-sizing: content` — no script, no resize observer, and it still
   * respects `rows` as the minimum and `max-h-*` as the ceiling. Browsers
   * without it fall back to the normal resizable textarea, which is the
   * correct degradation rather than a broken one.
   */
  autosize?: boolean
}

/**
 * Multi-line text: a system prompt, a note on a run, a JSON override.
 * Same cut and states as `Input`; padding comes from the density tokens so
 * the first line sits where a single-line input's text would.
 */
export function Textarea({ className, autosize = false, rows = 4, style, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      // `field-sizing: content` ignores `rows`, so the minimum is restated as
      // a height: that many lines plus the vertical padding.
      style={
        autosize
          ? { minHeight: `calc(${rows}lh + var(--control-px) * 1.3)`, ...style }
          : style
      }
      className={cn(
        fieldControlClasses,
        'block px-(--control-px) py-[calc(var(--control-px)*0.65)] text-base leading-body scroll-cloth',
        autosize ? '[field-sizing:content] max-h-[24lh] resize-none' : 'resize-y',
        className,
      )}
      {...props}
    />
  )
}
