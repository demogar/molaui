'use client'

import * as React from 'react'

/**
 * True inside the step whose failure a RunError above it already reports.
 *
 * A failed run used to say the same thing twice: the run's RunError panel
 * (an alert, with the error verbatim and the retries) and, a few rows down,
 * the failed ToolCall's own red error block — a second alert, announced
 * again, with a second Retry. Inside a reported step the ToolCall keeps the
 * error as its record, shown like its arguments and result, and leaves the
 * alarm and the retry to the panel. Internal: not exported from the package.
 */
export const FailureReportedContext = React.createContext(false)
