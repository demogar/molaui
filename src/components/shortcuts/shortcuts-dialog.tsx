'use client'

import * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useControllable } from '../../lib/use-controllable'
import { Dialog, DialogContent, type DialogContentProps, DialogTrigger } from '../dialog'
import { Kbd } from '../typography'
import { describeHotkey, formatHotkey } from './hotkeys'
import { type ShortcutsDialogMessages, hotkeysMessages, shortcutsDialogMessages } from './messages'
import { type RegisteredHotkey, useHotkeyPlatform, useHotkeys, useRegisteredHotkeys } from './use-hotkeys'

/**
 * Every keyboard shortcut the page binds, in one modal list, opened with `?`.
 *
 * It lists the `HotkeysProvider` registry and nothing else: each row is a live
 * `useHotkeys` binding, and its keys are printed from the same string the
 * listener matches, for this platform (⌘ on a Mac, Ctrl elsewhere). There is
 * no `shortcuts` prop to hand-write a table into, because a hand-written table
 * is the thing that drifts from what the keys actually do.
 *
 * The keys are drawn as keycaps and hidden from assistive technology; each row
 * carries its keys again in words ("Command K", "G, then D"), because ⌘ is
 * read as "place of interest sign", or not at all.
 *
 * Groups keep the order their first shortcut was bound in, and `General` comes
 * first: the page-wide keys are the ones a reader is looking for.
 */

export interface ShortcutsDialogProps extends Omit<DialogContentProps, 'title' | 'children' | 'messages'> {
  /** Whether the dialog is open, when the page owns that. */
  open?: boolean
  /** Open on first render. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes: the hotkey, the trigger, Escape, Close. */
  onOpenChange?: (open: boolean) => void
  /** Rendered as the button that opens the dialog, e.g. a help `IconButton` in the top bar. */
  trigger?: React.ReactElement
  /** The key that opens it, listed with the rest; `?` by default. `false` binds none. */
  hotkey?: string | false
  /** The dialog's title and accessible name. Defaults to “Keyboard shortcuts” (`messages.title`). */
  title?: React.ReactNode
  /**
   * Words for translation: the title, its own binding's label and the empty
   * sentence. Keys left out come from `MessagesProvider`, then English. The
   * key names come from the provider's `hotkeys` table.
   */
  messages?: MessagesOverride<ShortcutsDialogMessages>
}

/** `className`, `ref` and the rest go to the dialog popup, as on `DialogContent`. */
export function ShortcutsDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  hotkey = '?',
  title,
  size = 'sm',
  messages,
  className,
  ...props
}: ShortcutsDialogProps) {
  const [t] = useMessages('shortcutsDialog', shortcutsDialogMessages, messages)
  const [open, setOpen] = useControllable({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange })
  useHotkeys(hotkey || '?', () => setOpen(!open), { label: t.show, enabled: hotkey !== false })
  return (
    <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent {...props} size={size} title={title ?? t.title} data-slot="shortcuts-dialog" className={cn(className)}>
        <ShortcutList empty={t.empty} />
      </DialogContent>
    </Dialog>
  )
}

function grouped(entries: RegisteredHotkey[], general: string) {
  const groups = new Map<string, RegisteredHotkey[]>()
  for (const entry of entries) groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry])
  return [...groups].sort(([a], [b]) => Number(b === general) - Number(a === general))
}

function ShortcutList({ empty }: { empty: string }) {
  const entries = useRegisteredHotkeys()
  const platform = useHotkeyPlatform()
  const [words] = useMessages('hotkeys', hotkeysMessages)
  if (entries.length === 0) {
    return <p className="m-0 text-sm text-ink-2">{empty}</p>
  }
  return (
    <div className="grid gap-5">
      {grouped(entries, words.general).map(([group, rows]) => (
        // Not a <section> with a name: a landmark per group inside a dialog is
        // landmark noise, and the heading already gives each group its place.
        <div key={group} className="grid gap-1.5">
          <h3 className="m-0 rotulo text-ink-muted">{group}</h3>
          <dl className="m-0 grid">
            {rows.map((row) => (
              <div key={row.keys} className="flex min-h-(--row-h) items-center justify-between gap-4 py-1 rule-b-soft last:shadow-none">
                <dt className="min-w-0 text-sm text-ink">{row.label}</dt>
                <dd className="m-0 flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
                  <span className="sr-only">{describeHotkey(row.keys, platform, words)}</span>
                  {/* Left to right in every direction (see Kbd): G then E is
                      typed G first, so a right-to-left page must not show it
                      as E then G. The steps are a row of their own because the
                      dd's flex order follows the page. */}
                  <span dir="ltr" aria-hidden className="flex items-center gap-1.5">
                    {formatHotkey(row.keys, platform, words).map((step, i) => (
                      <React.Fragment key={i}>
                        {i > 0 ? <span>{words.thenShort}</span> : null}
                        <kbd dir="ltr" className="inline-flex items-center gap-1 font-ui">
                          {step.map((key, k) => (
                            <Kbd key={k}>{key}</Kbd>
                          ))}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
