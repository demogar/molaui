'use client'

import * as React from 'react'

const subscribe = () => () => {}

/**
 * The id of the `<label for={id}>` on the page, giving it one if it has none.
 *
 * For a control made of several focusable parts (the hour and minute of a
 * time): `Field` names its control with `<label for>`, which names one
 * element, so it names the first part and leaves the rest as a bare "Minute".
 * The parts reference the label through `aria-labelledby` instead, and are
 * heard as "Departure Hour", "Departure Minute".
 *
 * Changing `Field` to hand out its label's id was the other option. It is the
 * contract every control spreads (`Input`, `Select`, a bare `<select>`), and
 * for all of them `<label for>` already works; one composite should not add a
 * prop to all of them.
 *
 * The label is read with `useSyncExternalStore`, not found in an effect and
 * stored in state: React re-reads the snapshot once after committing, which is
 * when a label rendered beside the control first exists in the document, and
 * re-renders if it changed. The server snapshot is `undefined`, so the server
 * HTML names the parts by their own words and the label joins after
 * hydration. The id, when the label has none, is written in a layout effect,
 * before the first paint that references it.
 */
export function useLabelFor(id: string | undefined): string | undefined {
  const label = React.useSyncExternalStore(
    subscribe,
    () => (id ? ([...document.querySelectorAll('label')].find((el) => el.htmlFor === id) ?? null) : null),
    () => null,
  )
  const labelId = label ? label.id || `${id}-label` : undefined
  React.useLayoutEffect(() => {
    if (label && labelId && !label.id) label.setAttribute('id', labelId)
  }, [label, labelId])
  return labelId
}
