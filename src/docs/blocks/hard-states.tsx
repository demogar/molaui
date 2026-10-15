import type * as React from 'react'

import { cn } from '../../lib/cn'
import { HARD_STATE_LABELS, type HardStateName } from '../usage/hard-states'

/**
 * The frame every `HardStates` story is built from (the convention is
 * src/docs/usage/hard-states.ts). One look for every page, so a reviewer
 * reads the four states the same way on each, and `data-hard-state` marks
 * each cell for the test that checks they are all there.
 */
export function HardStates({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid items-start gap-x-10 gap-y-8 md:grid-cols-2', className)}>{children}</div>
}

export interface HardStateProps {
  state: HardStateName
  children: React.ReactNode
  /** Classes for the cell. The long-label cell is a phone's width unless told otherwise. */
  className?: string
}

/**
 * One state. The right-to-left cell sets `dir="rtl"` and `lang="ar"` on
 * itself, so everything inside mirrors and Arabic text is announced as
 * Arabic; its caption stays English. The long-label cell is held to 320px,
 * the narrowest phone the system supports, because a long label only shows
 * what it does once it runs out of room.
 */
export function HardState({ state, children, className }: HardStateProps) {
  const rtl = state === 'rtl'
  return (
    <div
      data-hard-state={state}
      dir={rtl ? 'rtl' : undefined}
      lang={rtl ? 'ar' : undefined}
      className={cn('grid min-w-0 content-start gap-3', state === 'long-label' && 'max-w-80', className)}
    >
      <p lang={rtl ? 'en' : undefined} className="m-0 rotulo text-ink-muted">
        {HARD_STATE_LABELS[state]}
      </p>
      {children}
    </div>
  )
}
