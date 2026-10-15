'use client'

import * as React from 'react'

import { useHydrated } from '../../lib/use-hydrated'
import {
  type Chord,
  detectPlatform,
  formatHotkey,
  type HotkeyPlatform,
  isCommandChord,
  isTypingTarget,
  matchesChord,
  normalizeHotkey,
  parseHotkey,
} from './hotkeys'

/**
 * One registry of the page's keyboard shortcuts, and the hook that binds
 * them.
 *
 * ── one source of truth ──
 * Every `useHotkeys` call carries the words that describe it (`label`, and a
 * `group`), and registers them with the nearest `HotkeysProvider` while it is
 * bound. The shortcuts dialog lists that registry and nothing else, so a
 * shortcut cannot exist without being listed, a listed shortcut cannot be one
 * the page stopped binding, and the keys it prints are parsed from the same
 * string the listener matches. A hand-written help table was the alternative,
 * and it is the thing that drifts.
 *
 * A key some other part of the system already binds (Base UI's F6 for the
 * toast region) is listed by passing `null` as the handler: it is described
 * without being bound twice.
 *
 * ── restraint ──
 * A shortcut never fires while someone is typing: not in a text field, a
 * select, a contenteditable region, and not during IME composition (a
 * Japanese or Chinese input method sends keydowns for every key of a word it
 * has not committed yet). A chord with ⌘ or Ctrl does fire from inside a
 * field, because it types nothing: that is how ⌘K reaches the palette from a
 * search box. Key repeat is ignored, so holding `?` does not strobe a dialog,
 * and an event a component has already handled (`defaultPrevented`, such as a
 * menu's typeahead) is left alone.
 *
 * Without a provider the hook still binds; it is just not listed.
 */

export interface RegisteredHotkey {
  /** The binding as written, normalised: `mod+k`, `g d`. */
  keys: string
  /** What it does, starting with a verb: “Open the command palette”. */
  label: string
  /** The heading it is listed under. */
  group: string
}

interface Registry {
  add: (entry: RegisteredHotkey) => () => void
  subscribe: (listener: () => void) => () => void
  snapshot: () => RegisteredHotkey[]
}

// Declared here rather than taken from @types/node; see lib/deprecate.ts.
declare const process: { env: { NODE_ENV?: string } } | undefined
const isProduction = () => typeof process !== 'undefined' && process.env.NODE_ENV === 'production'

function createRegistry(): Registry {
  let entries: RegisteredHotkey[] = []
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  return {
    add(entry) {
      // Two live bindings for one key both run, which is never what either
      // author meant. Said in development, where it can be fixed.
      if (!isProduction() && entries.some((e) => e.keys === entry.keys)) {
        console.warn(`[mola-ui] "${entry.keys}" is bound twice: “${entries.find((e) => e.keys === entry.keys)!.label}” and “${entry.label}”.`)
      }
      entries = [...entries, entry]
      emit()
      return () => {
        entries = entries.filter((e) => e !== entry)
        emit()
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    snapshot: () => entries,
  }
}

const RegistryContext = React.createContext<{ registry: Registry; platform: HotkeyPlatform | undefined } | null>(null)

export interface HotkeysProviderProps {
  children: React.ReactNode
  /**
   * Which modifier `mod` means: `apple` for ⌘, `other` for Ctrl. Detected from
   * the browser by default; set it to pin a story, a test, or a server render.
   */
  platform?: HotkeyPlatform
}

/**
 * Mount once near the root, around `ToastProvider`, so the toast region's F6
 * is listed too. Renders no element.
 */
export function HotkeysProvider({ children, platform }: HotkeysProviderProps) {
  const [registry] = React.useState(createRegistry)
  const value = React.useMemo(() => ({ registry, platform }), [registry, platform])
  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>
}

const EMPTY: RegisteredHotkey[] = []
const noSubscribe = () => () => {}

/** Every shortcut bound under the nearest provider, in the order they were bound. Empty without one. */
export function useRegisteredHotkeys(): RegisteredHotkey[] {
  const registry = React.useContext(RegistryContext)?.registry
  return React.useSyncExternalStore(
    registry?.subscribe ?? noSubscribe,
    registry?.snapshot ?? (() => EMPTY),
    () => EMPTY,
  )
}

/**
 * The platform the nearest provider pins, or the browser's. Until hydration
 * it is `other`, the answer a server can give, so the first client render
 * matches the server's HTML and a Mac swaps Ctrl for ⌘ a frame later rather
 * than failing hydration.
 */
export function useHotkeyPlatform(): HotkeyPlatform {
  const pinned = React.useContext(RegistryContext)?.platform
  const hydrated = useHydrated()
  return pinned ?? (hydrated ? detectPlatform() : 'other')
}

/**
 * The keys of a binding as this platform prints them, flattened: `['⌘', 'K']`
 * on a Mac, `['Ctrl', 'K']` elsewhere. For the display-only `shortcut` props
 * on `Tooltip`, `MenuItem` and `SearchInput`, so the hint and the binding are
 * one string.
 */
export function useHotkeyKeys(keys: string): string[] {
  const platform = useHotkeyPlatform()
  return React.useMemo(() => formatHotkey(keys, platform).flat(), [keys, platform])
}

export interface UseHotkeysOptions {
  /** What it does, starting with a verb. Listed in the shortcuts dialog. Required: a shortcut nobody can find is a shortcut nobody has. */
  label: string
  /** The heading it is listed under, `General` by default. */
  group?: string
  /** Bind it only while true. A disabled hotkey is also unlisted. `true` by default. */
  enabled?: boolean
  /**
   * Whether it fires while focus is in a text field. By default a chord with
   * `mod`, `ctrl` or `meta` does (it types nothing) and every other key does
   * not (it would eat the letter).
   */
  inFields?: boolean
}

/**
 * How long the next key of a sequence is waited for. Long enough to type
 * `g d` at a thinking pace; short enough that a stray `g` an hour ago does not
 * turn the next `d` into a jump.
 */
export const SEQUENCE_MS = 1000

/**
 * Bind `keys` (see hotkeys.ts for the grammar) to `handler` on the window,
 * and list it under the nearest `HotkeysProvider`. Pass `null` to list a key
 * something else already binds.
 *
 *   useHotkeys('mod+k', () => setOpen(true), { label: 'Open the command palette' })
 *   useHotkeys('g r', () => navigate('/runs'), { label: 'Go to runs', group: 'Navigation' })
 */
export function useHotkeys(keys: string, handler: ((event: KeyboardEvent) => void) | null, options: UseHotkeysOptions) {
  const { label, group = 'General', enabled = true, inFields } = options
  const context = React.useContext(RegistryContext)
  const registry = context?.registry
  const pinned = context?.platform
  const normalized = React.useMemo(() => normalizeHotkey(keys), [keys])

  const latest = React.useRef(handler)
  React.useLayoutEffect(() => {
    latest.current = handler
  })

  React.useEffect(() => {
    if (!enabled || !registry) return
    return registry.add({ keys: normalized, label, group })
  }, [registry, normalized, label, group, enabled])

  const bound = handler !== null
  React.useEffect(() => {
    if (!enabled || !bound) return
    const steps: Chord[] = parseHotkey(normalized)
    const allowInFields = inFields ?? (steps.length === 1 && isCommandChord(steps[0]!))
    let step = 0
    let timer: number | undefined
    const reset = () => {
      step = 0
      window.clearTimeout(timer)
    }
    function onKeyDown(event: KeyboardEvent) {
      // 229 is the keyCode every browser sends for a key an IME is holding.
      if (event.isComposing || event.keyCode === 229 || event.repeat || event.defaultPrevented) return
      if (!allowInFields && isTypingTarget(event.composedPath?.()[0] ?? event.target)) return reset()
      // A bare modifier press is not a step, so ⇧ on the way to `?` does not break `g ?`.
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return
      const platform = pinned ?? detectPlatform()
      if (matchesChord(event, steps[step]!, platform)) step += 1
      else {
        reset()
        if (matchesChord(event, steps[0]!, platform)) step = 1
      }
      if (step === 0) return
      if (step < steps.length) {
        // Hold the key: `g` on its own means nothing yet, and should not also do
        // whatever the page does with a G.
        event.preventDefault()
        window.clearTimeout(timer)
        timer = window.setTimeout(reset, SEQUENCE_MS)
        return
      }
      reset()
      event.preventDefault()
      latest.current?.(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      reset()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [normalized, enabled, bound, inFields, pinned])
}
