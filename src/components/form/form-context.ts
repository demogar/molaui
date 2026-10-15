'use client'

import * as React from 'react'

/**
 * The register a `Form` keeps of every error its fields are showing, so a
 * `FormErrorSummary` can list them, link each one to its control, and take
 * focus on the submit that produced them.
 *
 * ── a store, not React state ──
 * Fields register from a layout effect. Keeping the register in `Form`'s state
 * would re-render the whole form, every field in it, each time one error came
 * or went, and a field whose label is a JSX element registers on every render.
 * A small external store (read with `useSyncExternalStore`) re-renders only
 * what subscribes: the summary, and each field's one boolean, "is there a
 * summary?".
 *
 * ── DOM order, not registration order ──
 * The list is sorted by where each control sits in the document. Effects run
 * in tree order, which is close, but a field that mounts late (a section that
 * opens, a row added) registers last while sitting first, and a summary that
 * reads in a different order from the form sends people up and down the page.
 */
export interface FormErrorEntry {
  /** The id of the element the summary links to: the control, or a fieldset around several. */
  id: string
  /** What the field is called, as its label says it. */
  label: React.ReactNode
  /** The error, as the field shows it. */
  message: React.ReactNode
}

type Listener = () => void

export interface FormErrorSnapshot {
  entries: readonly FormErrorEntry[]
  /** Bumped each time a submit asks the summary to take focus. */
  focusRequest: number
}

export class FormErrorStore {
  private map = new Map<string, FormErrorEntry>()
  private listeners = new Set<Listener>()
  private snapshot: FormErrorSnapshot = { entries: [], focusRequest: 0 }
  private summaries = 0

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  /** How many `FormErrorSummary`s are mounted; a field's error stops being an alert while there is one. */
  hasSummary = () => this.summaries > 0

  set(entry: FormErrorEntry) {
    const prev = this.map.get(entry.id)
    if (prev && prev.label === entry.label && prev.message === entry.message) return
    this.map.set(entry.id, entry)
    this.publish()
  }

  delete(id: string) {
    if (!this.map.delete(id)) return
    this.publish()
  }

  addSummary() {
    this.summaries += 1
    this.emit()
    return () => {
      this.summaries -= 1
      this.emit()
    }
  }

  /** The entries in document order, read fresh (a submit handler runs before the summary re-renders). */
  current(): FormErrorEntry[] {
    return sortByDocument([...this.map.values()])
  }

  requestFocus() {
    this.snapshot = { ...this.snapshot, focusRequest: this.snapshot.focusRequest + 1 }
    this.emit()
  }

  private publish() {
    this.snapshot = { ...this.snapshot, entries: this.current() }
    this.emit()
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }
}

function sortByDocument(entries: FormErrorEntry[]) {
  if (typeof document === 'undefined') return entries
  const node = (id: string) => document.getElementById(id)
  return entries.sort((a, b) => {
    const na = node(a.id)
    const nb = node(b.id)
    if (!na || !nb) return 0
    return na.compareDocumentPosition(nb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  })
}

export const FormErrorContext = React.createContext<FormErrorStore | null>(null)

const NO_SUMMARY = () => false
const noop = () => () => {}

/**
 * Registers one error with the enclosing `Form`, and says whether the error
 * should still announce itself. Outside a `Form`, or in one with no summary,
 * the field's own `role="alert"` is the only announcement there is, so it
 * stays. With a summary, the summary is announced once, by taking focus, and
 * an alert per field on top of it is the pile-up the summary exists to stop.
 *
 * @internal Shared by `Field`, `Fieldset` and `CheckboxGroup`; not exported
 * from the package.
 */
export function useFormErrorEntry(id: string, label: React.ReactNode, message: React.ReactNode): { announce: boolean } {
  const store = React.useContext(FormErrorContext)
  const summarised = React.useSyncExternalStore(store?.subscribe ?? noop, store?.hasSummary ?? NO_SUMMARY, NO_SUMMARY)
  const has = message !== undefined && message !== null && message !== false && message !== ''
  React.useLayoutEffect(() => {
    if (!store || !has) return
    store.set({ id, label, message })
    return () => store.delete(id)
  }, [store, id, label, message, has])
  return { announce: !summarised }
}

/** The element to focus for an entry: the control itself, or the first control inside a fieldset. */
export function focusTargetFor(id: string): HTMLElement | null {
  const node = typeof document === 'undefined' ? null : document.getElementById(id)
  if (!node) return null
  if (isFocusable(node)) return node
  return node.querySelector<HTMLElement>(FOCUSABLE)
}

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

function isFocusable(node: HTMLElement) {
  return node.matches(FOCUSABLE)
}

/**
 * Moves focus to an entry's control and scrolls its whole field into view.
 * Focusing the control alone scrolls only the control into view, which can
 * leave its label, the thing that says what to type, above the fold or under
 * a sticky header.
 */
export function focusEntry(id: string) {
  const target = focusTargetFor(id)
  if (!target) return false
  const field = target.closest<HTMLElement>('[data-slot="field"], fieldset') ?? target
  field.scrollIntoView?.({ block: 'center' })
  target.focus({ preventScroll: true })
  return true
}
