import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * A key, as a cut shape: raised cloth, ink keyline, and a heavier foot where
 * the keycap sits on the board — the one place a solid offset is honest,
 * because a key really is a block that moves down when pressed.
 *
 * Set in Archivo, not a monospace: `⌘K` is a label for a physical object, not
 * a machine literal. Tabular figures keep F1–F12 the same width.
 *
 * For a chord, nest them inside one outer `<kbd>` — that is what the HTML
 * spec means by keyboard input made of several keys — and use `KbdChord`.
 */
export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-[1.6em] min-w-[1.6em] items-center justify-center rounded-none px-[0.4em]',
        'bg-cloth-pale font-ui text-[0.78em] font-semibold leading-none text-ink-2 tabular',
        'shadow-[0_0_0_1px_var(--ink-muted),0_2px_0_0_var(--ink-muted)]',
        className,
      )}
      {...props}
    />
  )
}

export interface KbdChordProps extends React.ComponentProps<'kbd'> {
  /** The keys, in order: `['⌘', 'K']`. */
  keys: string[]
}

export function KbdChord({ keys, className, ...props }: KbdChordProps) {
  return (
    <kbd className={cn('inline-flex items-center gap-1 font-ui', className)} {...props}>
      {keys.map((key, i) => (
        <Kbd key={`${key}-${i}`}>{key}</Kbd>
      ))}
    </kbd>
  )
}
