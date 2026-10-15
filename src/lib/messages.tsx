'use client'

import * as React from 'react'

import type { MolaMessages } from './default-messages'

/**
 * The words the components say on their own — "Close", "Previous page",
 * "Thought for 4s" — and the locale they format numbers in. See
 * docs/adr/0014-messages.md for the decision and src/lib/default-messages.ts
 * for the English table.
 *
 * ── strings, not functions ──
 * A message with a value in it is a template, `'Step {position} of {total}'`,
 * and a message with a count is a plural object keyed by `Intl.PluralRules`
 * categories, `{ one: '{count} file', other: '{count} files' }`. The first
 * draft took functions, as Stepper and TimePicker did, and a function cannot
 * cross from a React Server Component to the client provider: a Next layout
 * that loads `es.json` on the server and passes it down is the ordinary way
 * to localise, and it would have failed on the first function. Templates are
 * also what translation tools read and write.
 *
 * ── a provider is optional ──
 * Without `MessagesProvider` every component speaks the English defaults,
 * so an app that does not localise changes nothing. With one, every key it
 * gives wins over English, and a component's own `messages` prop wins over
 * both, for the one dialog whose close button should say "Close settings".
 * Context passes through portals, so a dialog, toast or menu rendered into
 * `document.body` still reads the provider above the trigger.
 */

/** A message with a count, keyed by plural category. `other` is required; every language has it. */
export type PluralMessage = { [K in Intl.LDMLPluralRule]?: string } & { other: string }

/**
 * Any key may be left out, at any depth. A plural object is replaced whole,
 * not merged: a language with only `other` must not inherit English's `one`.
 */
export type MessagesOverride<T> = {
  [K in keyof T]?: T[K] extends string ? string : T[K] extends PluralMessage ? PluralMessage : MessagesOverride<T[K]>
}

interface MessagesContextValue {
  locale: string | undefined
  messages: MessagesOverride<MolaMessages>
}

const MessagesContext = React.createContext<MessagesContextValue>({ locale: undefined, messages: {} })

export interface MessagesProviderProps {
  /**
   * The words to use instead of English, by component: `{ dialog: { close:
   * 'Cerrar' } }`. Any key left out keeps its English default. Plain strings
   * and objects only, so a server component can pass a JSON file.
   */
  messages?: MessagesOverride<MolaMessages>
  /**
   * BCP 47 tag for numbers, plural categories and dates: `es-PA`. Components
   * with their own `locale` prop use this when it is not set. Left out,
   * counts are written as `en-US` writes them and dates use the runtime's
   * locale, as they do without a provider.
   */
  locale?: string
  children?: React.ReactNode
}

const isPlural = (value: unknown): value is PluralMessage =>
  typeof value === 'object' && value !== null && 'other' in value

function merge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base
  if (typeof base !== 'object' || base === null || isPlural(base) || typeof override !== 'object') return override as T
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value !== undefined) out[key] = key in out ? merge(out[key], value) : value
  }
  return out as T
}

/**
 * Words and a locale for every Mola component below it, portals included.
 * Nested providers merge, so a section can reword one component without
 * restating the app's whole table. Renders no element of its own.
 */
export function MessagesProvider({ messages, locale, children }: MessagesProviderProps) {
  const parent = React.useContext(MessagesContext)
  const value = React.useMemo(
    () => ({ locale: locale ?? parent.locale, messages: merge(parent.messages, messages) }),
    [parent, messages, locale],
  )
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

/** `format('Step {position} of {total}', { position: 2, total: 4 })` → `'Step 2 of 4'`. An unknown name is left as written. */
export function formatMessage(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match))
}

/**
 * The tools a component formats its messages with, bound to the locale.
 * `locale` is the provider's, `undefined` without one.
 */
export interface MessageFormat {
  locale: string | undefined
  /** Fills `{name}` placeholders. */
  format: (template: string, values?: Record<string, string | number>) => string
  /** Picks the plural category for `count` and fills `{count}` (written in the locale) and the other values. */
  plural: (message: PluralMessage, count: number, values?: Record<string, string | number>) => string
  /** A count as the locale writes it, `en-US` without a provider. */
  number: (n: number) => string
  /**
   * Fills placeholders with elements: `nodes('Retry in {time}', { time: <Countdown /> })`.
   * For a sentence with a live part, so the part can sit anywhere the language puts it.
   */
  nodes: (template: string, values: Record<string, React.ReactNode>) => React.ReactNode
}

/**
 * The messages for one component: its English defaults, then the provider's
 * keys for its namespace, then its own `messages` prop. Returns the merged
 * table and a `MessageFormat`.
 *
 * The defaults are passed in rather than read from the full table, so a page
 * that imports `Button` and `Field` does not ship the agent console's
 * sentences.
 */
export function useMessages<K extends keyof MolaMessages>(
  namespace: K,
  defaults: MolaMessages[K],
  overrides?: MessagesOverride<MolaMessages[K]>,
): [MolaMessages[K], MessageFormat] {
  const { locale, messages } = React.useContext(MessagesContext)
  const merged = merge(merge(defaults, messages[namespace]), overrides)
  return [merged, messageFormat(locale)]
}

function messageFormat(locale: string | undefined): MessageFormat {
  const numberLocale = locale ?? 'en-US'
  const number = (n: number) => n.toLocaleString(numberLocale)
  return {
    locale,
    format: formatMessage,
    number,
    plural: (message, count, values = {}) => {
      const category = new Intl.PluralRules(numberLocale).select(count)
      return formatMessage(message[category] ?? message.other, { count: number(count), ...values })
    },
    nodes: (template, values) =>
      template.split(/(\{\w+\})/).map((part, i) => {
        const name = /^\{(\w+)\}$/.exec(part)?.[1]
        return name !== undefined && name in values ? <React.Fragment key={i}>{values[name]}</React.Fragment> : part
      }),
  }
}

/** The provider's locale, for a component whose `locale` prop was not set. `undefined` without one. */
export function useMessagesLocale(): string | undefined {
  return React.useContext(MessagesContext).locale
}
