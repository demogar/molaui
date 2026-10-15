'use client'

import { useDirection } from '@base-ui/react/direction-provider'
import { Plus } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { useTypeahead } from '../../lib/typeahead'
import { useControllable } from '../../lib/use-controllable'

/**
 * A hierarchy you move through and pick from: the files of a change an
 * agent proposes, the sections of a Cayuco knowledge base, the folders of a
 * dataset. One item is selected, the place you are, and the branches above
 * it open and close.
 *
 * Base UI has no tree, and its composite list is internal (importing it
 * would tie the library to a peer dependency's file layout), so this is the
 * WAI-ARIA APG tree view written out and tested key by key: one tab stop,
 * ArrowUp and ArrowDown through the visible items, ArrowRight opens a
 * branch and then enters it, ArrowLeft closes it and then climbs to its
 * parent (both mirrored in right-to-left), Home and End, `*` to open every
 * sibling, and type-ahead.
 *
 * ── flat, with levels, rather than nested groups ──
 * The APG's examples nest each branch's children in a `group` inside its
 * `treeitem`. Two things go wrong with that here. A treeitem's name is
 * computed from its content, so a branch would be announced with the text
 * of everything inside it; and the focused element would be the whole
 * subtree, so a focus ring drawn on it would frame every descendant. So the
 * visible items are rendered as one flat run of `treeitem`s, each with
 * `aria-level`, `aria-setsize` and `aria-posinset`, which ARIA allows and
 * screen readers read as the same tree ("level 2, 3 of 5"). A closed
 * branch's children are not rendered at all, so the DOM order is exactly
 * the order the arrows move in.
 *
 * ── selection does not follow focus ──
 * Choosing an item in a tree usually loads something: a file's diff, a
 * page. Moving through ten items to reach the eleventh must not load ten
 * things, so the arrows only move, and Enter, Space or a click selects. On
 * a branch they also open or close it, as a click on a folder does.
 *
 * The selected item is the current location, and in this system a location
 * is a shade with an ink bar at its start (the sidebar's current page), not
 * the ink fill of a chosen value. The open/closed marker is the system's one
 * disclosure marker, the plus that turns into a cross (ADR 0006): a branch
 * reveals more of itself here, it does not take you anywhere.
 */
export interface TreeNode {
  value: string
  /** The item's name. Its text is what type-ahead matches. */
  label: React.ReactNode
  /** A leading icon, hidden from assistive technology: a folder, a file type. */
  icon?: React.ReactNode
  /** Makes it a branch. An empty array is a branch with nothing in it yet. */
  children?: TreeNode[]
  /** Shown and focusable, never selected. A disabled branch still opens. */
  disabled?: boolean
}

export interface TreeBaseProps
  extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children' | 'aria-label' | 'aria-labelledby'> {
  /** The top level of the tree; branches carry their own `children`. */
  items: TreeNode[]
  /** The selected item, when you control it; `null` is none. */
  value?: string | null
  /** The item selected at first, when the tree keeps its own selection. */
  defaultValue?: string | null
  /** Called when Enter, Space or a click selects a different item. Never called as focus moves. */
  onValueChange?: (value: string | null) => void
  /** The open branches, by `value`, when you control them. */
  expanded?: string[]
  /** The branches open at first: open the ones down to the selected item. */
  defaultExpanded?: string[]
  /** Called with every open branch when one opens or closes. */
  onExpandedChange?: (expanded: string[]) => void
}

/**
 * A name is required: "Files changed", "Knowledge base". An
 * `aria-labelledby` pointing at the visible heading above the tree is
 * better than a second, invisible name.
 */
export type TreeProps = TreeBaseProps &
  ({ 'aria-label': string; 'aria-labelledby'?: string } | { 'aria-label'?: string; 'aria-labelledby': string })

interface Row {
  node: TreeNode
  level: number
  setSize: number
  posInSet: number
  parent: string | null
  branch: boolean
}

/** The items a person can see, in order: closed branches hide their children. */
function visibleRows(nodes: TreeNode[], open: ReadonlySet<string>, level = 1, parent: string | null = null): Row[] {
  return nodes.flatMap((node, i) => {
    const branch = node.children !== undefined
    const row: Row = { node, level, setSize: nodes.length, posInSet: i + 1, parent, branch }
    return branch && open.has(node.value) ? [row, ...visibleRows(node.children ?? [], open, level + 1, node.value)] : [row]
  })
}

/** Every item's parent, open or not, so a hidden item can be traced to the branch that hides it. */
function parents(nodes: TreeNode[], parent: string | null = null, into = new Map<string, string | null>()) {
  for (const node of nodes) {
    into.set(node.value, parent)
    if (node.children) parents(node.children, node.value, into)
  }
  return into
}

const itemClasses = [
  'group/item relative flex min-h-(--control-h) cursor-default items-center gap-1.5 pe-2 text-sm text-ink-2 outline-none select-none',
  // Indented by level from a custom property, so the step is one number and
  // the padding is logical: it moves to the right in right-to-left.
  'ps-[calc((var(--tree-level)-1)*1.25rem+0.5rem)]',
  'transition-colors hover:bg-ink-soft hover:text-ink',
  'aria-selected:bg-ink-soft aria-selected:font-semibold aria-selected:text-ink aria-selected:bar-start-ink aria-selected:forced-selected',
  // Inside: a tree usually sits in a scrolling sidebar or panel, whose
  // overflow would cut an outer ring down to one edge. Focus and the bar
  // are separate edge slots, so a focused selected item shows both.
  'focus-visible:focus-ring-inset',
  'aria-disabled:cursor-not-allowed aria-disabled:text-ink-muted aria-disabled:hover:bg-transparent aria-disabled:hover:text-ink-muted',
  '[&_svg]:size-(--icon) [&_svg]:shrink-0',
]

/** `className`, `ref` and the rest of the DOM props go to the tree. */
export function Tree({
  items,
  value,
  defaultValue,
  onValueChange,
  expanded,
  defaultExpanded,
  onExpandedChange,
  className,
  onKeyDown: onKeyDownProp,
  ...props
}: TreeProps) {
  const direction = useDirection()
  const [selected, setSelected] = useControllable<string | null>({
    value,
    defaultValue: () => defaultValue ?? null,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllable<string[]>({
    value: expanded,
    defaultValue: () => defaultExpanded ?? [],
    onChange: onExpandedChange,
  })

  const openSet = React.useMemo(() => new Set(open), [open])
  const rows = React.useMemo(() => visibleRows(items, openSet), [items, openSet])
  const parentOf = React.useMemo(() => parents(items), [items])
  const elements = React.useRef(new Map<string, HTMLDivElement>())
  const typeahead = useTypeahead()

  // The item holding the tab stop: the last one focused, else the selected
  // one, else the first. One hidden inside a closed branch hands the stop to
  // the nearest open ancestor, so Tab never lands nowhere.
  const [active, setActive] = React.useState<string | null>(null)
  const visible = new Set(rows.map((r) => r.node.value))
  let tabStop: string | null = active ?? selected
  while (tabStop !== null && !visible.has(tabStop)) tabStop = parentOf.get(tabStop) ?? null
  if (tabStop === null) tabStop = rows[0]?.node.value ?? null
  const current = rows.findIndex((r) => r.node.value === tabStop)

  function focus(index: number) {
    const row = rows[index]
    if (!row) return
    setActive(row.node.value)
    elements.current.get(row.node.value)?.focus()
  }

  function setBranch(node: TreeNode, isOpen: boolean) {
    if (isOpen === openSet.has(node.value)) return
    setOpen(isOpen ? [...open, node.value] : open.filter((v) => v !== node.value))
  }

  /** Enter, Space and a click: select it, and open or close a branch. */
  function activate(index: number) {
    const row = rows[index]
    if (!row) return
    if (!row.node.disabled) setSelected(row.node.value)
    if (row.branch) setBranch(row.node, !openSet.has(row.node.value))
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const row = rows[current]
    if (!row || event.altKey || event.ctrlKey || event.metaKey) return
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const isOpen = row.branch && openSet.has(row.node.value)
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focus(Math.min(current + 1, rows.length - 1))
        return
      case 'ArrowUp':
        event.preventDefault()
        focus(Math.max(current - 1, 0))
        return
      case forward:
        event.preventDefault()
        // Closed: open it. Open: step onto its first child, if it has one.
        if (row.branch && !isOpen) setBranch(row.node, true)
        else if (isOpen && rows[current + 1]?.parent === row.node.value) focus(current + 1)
        return
      case back:
        event.preventDefault()
        // Open: close it. Otherwise climb to the parent.
        if (isOpen) setBranch(row.node, false)
        else if (row.parent !== null) focus(rows.findIndex((r) => r.node.value === row.parent))
        return
      case 'Home':
        event.preventDefault()
        focus(0)
        return
      case 'End':
        event.preventDefault()
        focus(rows.length - 1)
        return
      case 'Enter':
      case ' ':
        event.preventDefault()
        activate(current)
        return
      case '*': {
        event.preventDefault()
        const siblings = rows.filter((r) => r.parent === row.parent && r.branch).map((r) => r.node.value)
        setOpen([...open, ...siblings.filter((v) => !openSet.has(v))])
        return
      }
    }
    const match = typeahead(
      event,
      rows.map((r) => elements.current.get(r.node.value)?.querySelector('[data-part="label"]')?.textContent ?? ''),
      current,
    )
    if (match >= 0) {
      event.preventDefault()
      focus(match)
    }
  }


  // The consumer's handler runs first, and `preventDefault()` in it keeps
  // this one from running: the order and the escape hatch `mergeProps`
  // gives, written out because the React compiler's ref rule refuses to let
  // a handler that reads refs be passed through a function during render.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDownProp?.(event)
    if (!event.defaultPrevented) onKeyDown(event)
  }
  return (
    <div
      role="tree"
      data-slot="tree"
      className={cn('flex min-w-0 flex-col', className)}
      {...props}
      onKeyDown={handleKeyDown}
    >
      {rows.map((row, index) => {
        const { node } = row
        const isOpen = row.branch && openSet.has(node.value)
        return (
          <div
            key={node.value}
            ref={(el) => {
              if (el) elements.current.set(node.value, el)
              else elements.current.delete(node.value)
            }}
            role="treeitem"
            data-part="item"
            aria-level={row.level}
            aria-setsize={row.setSize}
            aria-posinset={row.posInSet}
            aria-expanded={row.branch ? isOpen : undefined}
            aria-selected={node.disabled ? undefined : selected === node.value}
            aria-disabled={node.disabled || undefined}
            tabIndex={node.value === tabStop ? 0 : -1}
            className={cn(itemClasses)}
            style={{ '--tree-level': row.level } as React.CSSProperties}
            onFocus={() => setActive(node.value)}
            onClick={() => {
              setActive(node.value)
              activate(index)
            }}
          >
            {/* A leaf keeps the marker's width, so labels at one level line up. */}
            <span aria-hidden data-part={row.branch ? 'marker' : undefined} className="flex size-(--icon) shrink-0 text-ink-muted">
              {row.branch ? (
                <Plus className="transition-transform duration-(--motion-base) group-aria-expanded/item:rotate-45" />
              ) : null}
            </span>
            {node.icon ? (
              <span aria-hidden data-part="icon" className="flex text-ink-muted group-aria-selected/item:text-ink">
                {node.icon}
              </span>
            ) : null}
            <span data-part="label" className="min-w-0 truncate">
              {node.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
