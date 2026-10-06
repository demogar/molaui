import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The first thing someone says, so it is set in the reading voice rather than
 * the system one. Alegreya from here down; Archivo above and around.
 *
 * In a tool, that is the paragraph under a page title that explains what this
 * screen is for — the one sentence an operator reads on their first visit and
 * never again. It earns the reading face because it is the one place the tool
 * speaks in prose.
 */
export function Lead({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('m-0 max-w-prose font-text text-lg leading-[1.5] text-ink-2', className)}
      {...props}
    />
  )
}
