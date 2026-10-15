'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Search } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useControllable } from '../../lib/use-controllable'
import { formatHotkey } from '../shortcuts/hotkeys'
import { useHotkeyPlatform, useHotkeys } from '../shortcuts/use-hotkeys'
import { Kbd } from '../typography'
import { type CommandPaletteMessages, commandPaletteMessages } from './messages'

/**
 * The keyboard's front door to the whole tool: jump to a run, switch agent,
 * toggle the theme, open a document — without the pointer.
 *
 * Built by hand on a Base UI Dialog rather than on a combobox primitive,
 * because the ARIA pattern is specific and worth owning: the input is a
 * `combobox` that never leaves focus; the results are a `listbox` of
 * `option`s in labelled `group`s; and the highlighted option is conveyed with
 * `aria-activedescendant`, so arrow keys move the highlight while the caret
 * stays in the input and typing never has to be re-focused.
 *
 * The highlight is the ink fill, as in `Menu` — one answer to "where am I in
 * this list" across the system. It wraps at both ends: in a palette you are
 * usually looking for the last thing as often as the first.
 *
 * It opens from the top third of the viewport, not the centre. Results grow
 * downward as you type; a centred box would jump upward with every keystroke
 * that removed a result.
 *
 * Filtering is plain substring matching on every word typed, across the
 * label, the description and the item's keywords, with label-prefix matches
 * ranked first. It is deliberately not fuzzy: in an admin tool the commands
 * are known by name, and a fuzzy matcher that offers "Delete agent" for
 * "dagent" is a liability, not a convenience.
 *
 * The result count is spoken from a polite status region, debounced, so a
 * screen-reader user hears "3 results" or "No matches" once they pause rather
 * than a count per keystroke. The visible count in the footer stays
 * `aria-hidden`: the status region is its spoken twin.
 */

export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  /**
   * A shortcut that runs this command without opening the palette, in
   * `useHotkeys` grammar: `g r`, `mod+shift+p`. Bound while the palette is
   * mounted, printed at the end of the row for this platform, and listed in
   * the shortcuts dialog under the item's group.
   */
  hotkey?: string
  /** Keys shown at the end of the row: `['⌘', 'R']`. Display only, for a key bound elsewhere; prefer `hotkey`, which binds and prints the same string. */
  shortcut?: string[]
  /** Extra words this item answers to: synonyms, ids. Not displayed. */
  keywords?: string[]
  disabled?: boolean
  onSelect: () => void
}

export interface CommandGroup {
  heading: string
  items: CommandItem[]
}

/** The groups and items that match `query`, empty groups dropped, label-prefix matches first within each group. */
export function filterCommands(groups: CommandGroup[], query: string): CommandGroup[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return groups.filter((g) => g.items.length > 0)
  const q = query.toLowerCase().trim()
  return groups
    .map((group) => {
      const matches = group.items.filter((item) => {
        const haystack = [item.label, item.description ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase()
        return terms.every((term) => haystack.includes(term))
      })
      const prefix = matches.filter((m) => m.label.toLowerCase().startsWith(q))
      const rest = matches.filter((m) => !m.label.toLowerCase().startsWith(q))
      return { ...group, items: [...prefix, ...rest] }
    })
    .filter((group) => group.items.length > 0)
}

/**
 * Opens the palette on ⌘K on a Mac and Ctrl-K everywhere else, from anywhere
 * on the page, a search field included. Ctrl as well as ⌘, because half of
 * every internal team is on Windows or Linux and a shortcut that silently
 * does nothing there is worse than none.
 *
 * It is `useHotkeys('mod+k')`, so it is listed in the shortcuts dialog under
 * a `HotkeysProvider`. It used to answer both ⌘K and Ctrl-K on every
 * platform; on a Mac, Ctrl-K deletes to the end of the line in every native
 * text field, so it now follows each platform's convention (see hotkeys.ts).
 */
export function useCommandShortcut(
  onTrigger: () => void,
  { key = 'k', label = 'Open the command palette' }: { key?: string; label?: string } = {},
) {
  useHotkeys(`mod+${key}`, () => onTrigger(), { label })
}

/**
 * Binds one command's `hotkey` while the palette is mounted, open or not:
 * the point of a command's shortcut is not having to open the palette.
 * A component per item because a hook cannot be called in a loop.
 */
function CommandHotkey({ item, group }: { item: CommandItem & { hotkey: string }; group: string }) {
  useHotkeys(item.hotkey, () => item.onSelect(), { label: item.label, group, enabled: !item.disabled })
  return null
}

/**
 * How long typing must pause before the count is announced. Long enough that a
 * word typed at speed is one announcement, short enough to feel like an answer.
 */
const ANNOUNCE_DELAY_MS = 350

export interface CommandPaletteProps extends Omit<React.ComponentProps<'div'>, 'children' | 'role'> {
  /** Whether the palette is open, when the page owns that (it usually does, to bind ⌘K). */
  open?: boolean
  /** Open on first render, for a palette that owns its own state. */
  defaultOpen?: boolean
  /**
   * Called when the palette opens or closes: the trigger, Escape, a press outside,
   * or choosing an item, which closes it before the item runs.
   */
  onOpenChange?: (open: boolean) => void
  /** Rendered as the button that opens the palette, e.g. a `SearchInput`-shaped `Button`. */
  trigger?: React.ReactElement
  /**
   * The commands, in headed groups. Filtered as the person types; label-prefix
   * matches come first within a group, and empty groups are dropped.
   */
  groups: CommandGroup[]
  /** Shown in the empty search input. Defaults to "Type a command or search…" (`messages.placeholder`). */
  placeholder?: string
  /** Shown when nothing matches. Receives the query. */
  renderEmpty?: (query: string) => React.ReactNode
  /** Accessible name of the dialog. Defaults to "Command palette" (`messages.label`). */
  label?: string
  /** Words for translation: the defaults above, the key hints, the empty sentence and the result count. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<CommandPaletteMessages>
}

/**
 * `className`, `ref` and the rest of the DOM props go to the dialog popup,
 * the element that is the palette. Controlled or not: every other overlay
 * offered `defaultOpen`, and a palette that was controlled-only made the
 * simplest case — a button that opens it — need a state hook in the page.
 */
export function CommandPalette({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  groups,
  placeholder: placeholderProp,
  renderEmpty,
  label: labelProp,
  messages,
  className,
  ...props
}: CommandPaletteProps) {
  const [t, f] = useMessages('commandPalette', commandPaletteMessages, messages)
  const placeholder = placeholderProp ?? t.placeholder
  const label = labelProp ?? t.label
  const [open, setOpen] = useControllable({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange })
  const [query, setQuery] = React.useState('')
  const platform = useHotkeyPlatform()
  // The highlight is held by id, not position, so it survives the list
  // re-sorting under it; `null` means "the first enabled match".
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const uid = React.useId()
  const listId = `${uid}-list`
  const listRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => filterCommands(groups, query), [groups, query])
  const flat = React.useMemo(() => filtered.flatMap((g) => g.items), [filtered])
  const hasResults = filtered.length > 0
  const enabledIndexes = React.useMemo(
    () => flat.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0),
    [flat],
  )
  const heldIndex = flat.findIndex((item) => item.id === activeId && !item.disabled)
  const activeIndex = heldIndex >= 0 ? heldIndex : (enabledIndexes[0] ?? -1)
  const active = flat[activeIndex]
  const optionId = (i: number) => `${uid}-option-${i}`

  // What the status region says. Set after a pause, never on open (an empty
  // query is not a search), and cleared when the palette closes.
  const [announcement, setAnnouncement] = React.useState('')
  const trimmed = query.trim()
  const results = f.plural(t.results, flat.length)
  const spoken = trimmed === '' ? '' : flat.length === 0 ? f.format(t.noMatches, { query: trimmed }) : results
  React.useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncement(spoken), ANNOUNCE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [spoken])

  React.useEffect(() => {
    if (activeIndex < 0) return
    const node = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-option-${activeIndex}`)}`)
    node?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, uid])

  function move(delta: 1 | -1) {
    if (enabledIndexes.length === 0) return
    const pos = enabledIndexes.indexOf(activeIndex)
    const next = (pos + delta + enabledIndexes.length) % enabledIndexes.length
    setActiveId(flat[enabledIndexes[next]!]!.id)
  }

  function select(item: CommandItem | undefined) {
    if (!item || item.disabled) return
    setOpen(false)
    item.onSelect()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      select(active)
    }
  }

  let index = -1

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => setOpen(next)}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          setQuery('')
          setActiveId(null)
          setAnnouncement('')
        }
      }}
    >
      {trigger ? <DialogPrimitive.Trigger render={trigger} /> : null}
      {groups.flatMap((group) =>
        group.items.map((item) =>
          item.hotkey ? <CommandHotkey key={item.id} item={item as CommandItem & { hotkey: string }} group={group.heading} /> : null,
        ),
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-(--z-overlay) bg-backdrop transition-opacity duration-(--motion-base) data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <DialogPrimitive.Popup
          {...props}
          data-slot="command-palette"
          className={cn(
            'fixed top-[12dvh] left-1/2 z-(--z-overlay) flex max-h-[min(34rem,76dvh)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 flex-col',
            'bg-cloth-pale text-ink rounded-none outline-none shadow-overlay',
            'transition-[opacity,scale] duration-(--motion-base)',
            'data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-(--motion-cut)',
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          <div className="flex items-center gap-3 px-4 cut-b">
            <Search aria-hidden className="size-(--icon-lg) shrink-0 text-ink-muted" />
            <input
              role="combobox"
              aria-expanded={hasResults}
              aria-controls={hasResults ? listId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={active && !active.disabled ? optionId(activeIndex) : undefined}
              aria-label={label}
              autoComplete="off"
              spellCheck={false}
              value={query}
              placeholder={placeholder}
              onChange={(event) => {
                setQuery(event.target.value)
                // A new query starts the highlight at the best match.
                setActiveId(null)
              }}
              onKeyDown={onKeyDown}
              className="h-14 min-w-0 flex-1 border-0 bg-transparent font-ui text-lg text-ink outline-none placeholder:text-ink-muted focus:shadow-none focus-visible:shadow-none"
            />
            <Kbd>{t.escape}</Kbd>
          </div>
          {/* With nothing to list there is no listbox: an empty one is an
              ARIA error, and text inside it is presentational. The combobox
              reports itself collapsed, the sentence is plain text, and the
              status region below says it. */}
          <div
            ref={listRef}
            id={hasResults ? listId : undefined}
            role={hasResults ? 'listbox' : undefined}
            aria-label={hasResults ? t.commands : undefined}
            className="scroll-cloth min-h-0 flex-1 overflow-y-auto py-2"
          >
            {!hasResults ? (
              <div className="px-4 py-10 text-center text-sm text-ink-2">
                {renderEmpty ? (
                  renderEmpty(query)
                ) : (
                  <>
                    {/* The same words as Combobox's empty filter, with the query. */}
                    {f.nodes(t.noMatches, { query: <span className="font-semibold text-ink">{query}</span> })}
                  </>
                )}
              </div>
            ) : (
              filtered.map((group, groupIndex) => {
                // From the position, never the heading text: an id is one
                // token, so a heading with a space ("Go to") split into two
                // unresolvable references and left the group nameless.
                const headingId = `${uid}-group-${groupIndex}`
                return (
                  <div key={group.heading} role="group" aria-labelledby={headingId} className="pb-1">
                    <div id={headingId} role="presentation" className="px-4 pt-2.5 pb-1.5 rotulo text-ink-muted">
                      {group.heading}
                    </div>
                    {group.items.map((item) => {
                      index += 1
                      const i = index
                      const isActive = i === activeIndex && !item.disabled
                      return (
                        <div
                          key={item.id}
                          id={optionId(i)}
                          role="option"
                          aria-selected={isActive}
                          aria-disabled={item.disabled || undefined}
                          onMouseMove={() => !item.disabled && i !== activeIndex && setActiveId(item.id)}
                          onClick={() => select(item)}
                          className={cn(
                            'group/option mx-2 flex min-h-(--control-h) cursor-pointer items-center gap-3 px-2.5 py-2',
                            'font-ui text-sm text-ink [&_svg]:size-(--icon) [&_svg]:shrink-0',
                            'aria-selected:bg-ink aria-selected:text-on-ink aria-selected:forced-selected',
                            'aria-disabled:cursor-default aria-disabled:text-ink-muted',
                            // Selected and disabled at once: muted ink on the ink fill is 2.99:1. See Menu.
                            'aria-disabled:aria-selected:text-on-ink-muted',
                          )}
                        >
                          {item.icon ? (
                            <span aria-hidden className="contents text-ink-2 group-aria-selected/option:text-on-ink">
                              {item.icon}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{item.label}</span>
                            {item.description ? (
                              <span className="block truncate text-xs text-ink-muted group-aria-selected/option:text-on-ink-muted">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                          {item.hotkey || item.shortcut ? (
                            <span className="flex shrink-0 gap-1 text-xs tabular-nums text-ink-muted group-aria-selected/option:text-on-ink-muted">
                              {/* By position, not glyph: G G repeats a key. */}
                              {(item.hotkey ? formatHotkey(item.hotkey, platform).flat() : item.shortcut!).map((key, i) => (
                                <span key={i} className="min-w-4 text-center">
                                  {key}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
          {/* Mounted with the popup and filled later: a region that mounts
              with its text is never announced. */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </div>
          <div aria-hidden className="flex items-center gap-4 bg-cloth-shade px-4 py-2 text-xs text-ink-muted rule-t">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> {t.move}
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> {t.select}
            </span>
            <span className="ms-auto tabular-nums">
              {results}
            </span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
