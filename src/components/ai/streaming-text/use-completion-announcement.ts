'use client'

import * as React from 'react'

import type { StreamStatus } from './streaming-text'

/**
 * The one sentence a stream says when it ends: `done` after `streaming`
 * gives `doneAnnouncement`, `error` after `streaming` gives
 * `errorAnnouncement`, and anything else says nothing.
 *
 * "Adjust state when a prop changes", done during render rather than in an
 * effect: the announcement is derived from the transition, not the value,
 * and a static `done` on first mount must not announce anything. Shared by
 * `StreamingText` and `Markdown`, so the two cannot disagree about when a
 * response is complete.
 */
export function useCompletionAnnouncement(status: StreamStatus, doneAnnouncement: string, errorAnnouncement: string) {
  const [prevStatus, setPrevStatus] = React.useState(status)
  const [announcement, setAnnouncement] = React.useState('')
  if (status !== prevStatus) {
    setPrevStatus(status)
    if (status === 'streaming') setAnnouncement('')
    else if (prevStatus === 'streaming' && status === 'done') setAnnouncement(doneAnnouncement)
    else if (prevStatus === 'streaming' && status === 'error') setAnnouncement(errorAnnouncement)
  }
  return announcement
}
