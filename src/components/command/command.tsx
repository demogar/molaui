'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Search } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { Kbd } from '../typography'

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
 */

export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  /** Keys shown at the end of the row: `['⌘', 'R']`. Display only — bind them yourself. */
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
 * Opens the palette on ⌘K / Ctrl-K, anywhere on the page. Ctrl as well as ⌘,
 * because half of every internal team is on Windows or Linux and a shortcut
 * that silently does nothing there is worse than none.
 */
export function useCommandShortcut(onTrigger: () => void, { key = 'k' }: { key?: string } = {}) {
  const callback = React.useRef(onTrigger)
  React.useEffect(() => {
    callback.current = onTrigger
  })
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === key) {
        event.preventDefault()
        callback.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key])
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: CommandGroup[]
  placeholder?: string
  /** Shown when nothing matches. Receives the query. */
  renderEmpty?: (query: string) => React.ReactNode
  /** Accessible name of the dialog. */
  label?: string
}

export function CommandPalette({
  open,
  onOpenChange,
  groups,
  placeholder = 'Type a command or search…',
  renderEmpty,
  label = 'Command palette',
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState('')
  // The highlight is held by id, not position, so it survives the list
  // re-sorting under it; `null` means "the first enabled match".
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const uid = React.useId()
  const listId = `${uid}-list`
  const listRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => filterCommands(groups, query), [groups, query])
  const flat = React.useMemo(() => filtered.flatMap((g) => g.items), [filtered])
  const enabledIndexes = React.useMemo(
    () => flat.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0),
    [flat],
  )
  const heldIndex = flat.findIndex((item) => item.id === activeId && !item.disabled)
  const activeIndex = heldIndex >= 0 ? heldIndex : (enabledIndexes[0] ?? -1)
  const active = flat[activeIndex]
  const optionId = (i: number) => `${uid}-option-${i}`

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
    onOpenChange(false)
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
      onOpenChange={(next) => onOpenChange(next)}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          setQuery('')
          setActiveId(null)
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-backdrop transition-opacity duration-(--motion-base) ease-cut data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <DialogPrimitive.Popup
          data-slot="command-palette"
          className={cn(
            'fixed top-[12dvh] left-1/2 z-50 flex max-h-[min(34rem,76dvh)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 flex-col',
            'bg-cloth-pale text-ink rounded-none outline-none shadow-floating',
            'transition-[opacity,scale] duration-(--motion-base) ease-cut',
            'data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-(--motion-cut)',
          )}
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          <div className="flex items-center gap-3 px-4 shadow-[inset_0_-1.5px_0_var(--ink)]">
            <Search aria-hidden className="size-[18px] shrink-0 text-ink-muted" />
            <input
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
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
            <Kbd>esc</Kbd>
          </div>
          <div ref={listRef} id={listId} role="listbox" aria-label="Commands" className="scroll-cloth min-h-0 flex-1 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div role="presentation" className="px-4 py-10 text-center text-sm text-ink-2">
                {renderEmpty ? (
                  renderEmpty(query)
                ) : (
                  <>
                    Nothing matches <span className="font-semibold text-ink">“{query}”</span>.
                  </>
                )}
              </div>
            ) : (
              filtered.map((group) => {
                const headingId = `${uid}-group-${group.heading}`
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
                            'font-ui text-sm text-ink [&_svg]:size-4 [&_svg]:shrink-0',
                            'aria-selected:bg-ink aria-selected:text-on-ink aria-selected:forced-selected',
                            'aria-disabled:cursor-default aria-disabled:text-ink-muted',
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
                          {item.shortcut ? (
                            <span className="flex shrink-0 gap-1 text-xs tabular-nums text-ink-muted group-aria-selected/option:text-on-ink-muted">
                              {item.shortcut.map((key) => (
                                <span key={key} className="min-w-4 text-center">
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
          <div aria-hidden className="flex items-center gap-4 bg-cloth-shade px-4 py-2 text-xs text-ink-muted shadow-[inset_0_1px_0_var(--keyline)]">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> move
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> select
            </span>
            <span className="ms-auto tabular-nums">
              {flat.length} {flat.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
