'use client'

import * as React from 'react'

const subscribe = () => () => {}
const onClient = () => true
const onServer = () => false

/**
 * `false` on the server and during hydration, `true` from the first render
 * after it, and `true` straight away on a client-only mount.
 *
 * For text that depends on where or when it renders: a clock, or a time in
 * the reader's own zone. The server's `Date.now()` and time zone are not the
 * browser's, and React 19 answers mismatched text by throwing the server HTML
 * away and re-rendering the whole root on the client. The clocks first seeded
 * `Date.now()` into `useState`, which the server and the browser each ran for
 * themselves, so the two never agreed.
 *
 * `useSyncExternalStore` with a server snapshot rather than a `mounted` flag
 * set in an effect: React uses the server snapshot while hydrating and
 * re-renders straight after with the client one, but a client-only mount
 * reads the client snapshot on its first render, so a clock outside SSR
 * appears in the first frame, as it always did, instead of one effect late.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(subscribe, onClient, onServer)
}
