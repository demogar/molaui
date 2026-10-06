import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Duration, cost, count, timestamp — facts that are compared down a column,
 * so they carry tabular figures. This is the role a monospace usually plays in
 * tool UIs, minus the costume: Archivo's tabular figures line up exactly as
 * well and keep the row in one voice.
 */
export function Meta({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('m-0 font-ui text-xs tabular tracking-[0.02em] text-ink-muted', className)} {...props} />
  )
}
