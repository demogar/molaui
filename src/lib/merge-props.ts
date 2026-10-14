'use client'

import * as React from 'react'

// When a component sets a ref, a handler or a description AND spreads the
// consumer's props onto the same element, both sides have something to say.
// Writing the internal one first let the consumer's replace it (SearchInput's
// clear button and TableCheckbox's indeterminate died when a ref was passed);
// writing it last would erase the consumer's instead. These merge.
// src/test/prop-order.test.ts fails on the first shape.

// Base UI's own merge, so handlers chain the way they do inside its
// primitives: rightmost first, and `event.preventBaseUIHandler()` lets the
// consumer stop the component's handler. It does not merge `ref` (hence
// `useMergedRefs`) and treats `aria-describedby` as a plain string to
// overwrite (hence `joinIds`).
export { mergeProps } from '@base-ui/react/merge-props'

type AnyRef<T> = React.Ref<T> | undefined

/**
 * One callback ref that feeds every ref given. Uses React 19's ref cleanup,
 * so a callback ref that returns its own cleanup gets it called, and the
 * others are reset to null on detach.
 */
export function mergeRefs<T>(...refs: AnyRef<T>[]): React.RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === 'function') {
        const cleanup = ref(node)
        return typeof cleanup === 'function' ? cleanup : () => ref(null)
      }
      if (ref) {
        ref.current = node
        return () => {
          ref.current = null
        }
      }
      return undefined
    })
    return () => {
      for (const cleanup of cleanups) cleanup?.()
    }
  }
}

/**
 * `mergeRefs`, memoised on the refs themselves. A fresh callback every render
 * would make React detach and re-attach the node on each one, which calls a
 * consumer's callback ref with null and back for no reason.
 */
export function useMergedRefs<T>(a: AnyRef<T>, b: AnyRef<T>): React.RefCallback<T> {
  return React.useMemo(() => mergeRefs(a, b), [a, b])
}

/**
 * `aria-describedby` is an id list, so two descriptions are joined rather
 * than one replacing the other. Order is the caller's: pass ids in the order
 * they appear on screen, so a screen reader reads them that way. Duplicates
 * and empty values are dropped; no ids gives `undefined`, not `""`.
 */
export function joinIds(...ids: (string | undefined | null | false)[]): string | undefined {
  const unique = [...new Set(ids.flatMap((id) => (id ? id.split(/\s+/).filter(Boolean) : [])))]
  return unique.length > 0 ? unique.join(' ') : undefined
}
