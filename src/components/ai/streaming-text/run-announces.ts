'use client'

import * as React from 'react'

/**
 * True inside an AgentRun, which announces the run's outcome itself.
 *
 * A streamed answer inside a run said "Response complete." and the run said
 * "Run succeeded." in the same tick, from two polite regions: one piece of
 * news, heard twice. Failures were already said once (FailureReportedContext);
 * successes were not. Inside a run the stream keeps `aria-busy` while it
 * arrives and leaves the closing announcement to the run. Internal: not
 * exported from the package.
 */
export const RunAnnouncesContext = React.createContext(false)
