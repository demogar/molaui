'use client'

import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'
import { cva, type VariantProps } from 'class-variance-authority'
import { Ellipsis, Search } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { buttonVariants } from '../button'
import { fieldControlClasses, fieldControlSizes } from '../field/field-control'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../menu'

/**
 * A row of related controls with `role="toolbar"` and one tab stop: Tab
 * enters the toolbar, the arrow keys move inside it, Tab leaves. In a dense
 * tool a table header can carry ten controls, and ten tab stops between the
 * page title and the first row is a keyboard user's afternoon.
 *
 * Groups are separated by a keyline, not by extra space. Space alone between
 * groups of identical ghost buttons reads as uneven spacing, not as grouping.
 *
 * Roving focus, the wrap at either end and the mirrored arrow keys in
 * right-to-left all come from Base UI's Toolbar; nothing here listens for a
 * key.
 */
const toolbarVariants = cva('flex flex-wrap items-center gap-1', {
  variants: {
    variant: {
      /** Its own cut panel, for a toolbar that stands alone over a canvas. */
      panel: 'bg-cloth-pale p-1 shadow-cut',
      /** No ground, for a toolbar inside a header or a table frame. */
      bare: '',
    },
  },
  defaultVariants: { variant: 'bare' },
})

export interface ToolbarProps
  extends Omit<ToolbarPrimitive.Root.Props, 'className'>,
    VariantProps<typeof toolbarVariants> {
  className?: string
  /** Names the toolbar: "Run actions", "Text formatting". */
  'aria-label': string
}

export function Toolbar({ variant, className, ...props }: ToolbarProps) {
  return <ToolbarPrimitive.Root data-slot="toolbar" className={cn(toolbarVariants({ variant }), className)} {...props} />
}

export function ToolbarGroup({ className, ...props }: Omit<ToolbarPrimitive.Group.Props, 'className'> & { className?: string }) {
  return <ToolbarPrimitive.Group className={cn('flex items-center gap-1', className)} {...props} />
}

export function ToolbarSeparator({ className }: { className?: string }) {
  return (
    <ToolbarPrimitive.Separator
      className={cn('mx-1 h-5 w-px self-center bg-keyline data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-5', className)}
    />
  )
}

export interface ToolbarButtonProps
  extends Omit<ToolbarPrimitive.Button.Props, 'className'>,
    VariantProps<typeof buttonVariants> {
  className?: string
  icon?: React.ReactNode
}

/** A Button that takes part in the toolbar's arrow-key focus. Ghost and small by default. */
export function ToolbarButton({
  variant = 'ghost',
  size = 'sm',
  icon,
  className,
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <ToolbarPrimitive.Button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {icon ? <span aria-hidden className="contents">{icon}</span> : null}
      {children}
    </ToolbarPrimitive.Button>
  )
}

/**
 * Pressed is the ink fill — the same cut the checked chip, the current page and
 * the highlighted menu row make — so "on" is a change of layer, not a tint a
 * reader has to compare against its neighbour. `aria-pressed` comes from Base
 * UI's Toggle, and `forced-selected` keeps the fill when the OS replaces every
 * colour.
 */
const toggleClasses = [
  'data-pressed:bg-ink data-pressed:text-on-ink data-pressed:hover:bg-ink data-pressed:forced-selected',
]

export interface ToolbarToggleProps
  extends Omit<ToolbarPrimitive.Button.Props, 'className' | 'value'>,
    Pick<VariantProps<typeof buttonVariants>, 'size'> {
  className?: string
  icon?: React.ReactNode
  /** Identifies the toggle inside a `ToolbarToggleGroup`. */
  value?: string
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

/** A two-state button: "Show archived", "Wrap lines". Inside a `ToolbarToggleGroup` it is one of a set. */
export function ToolbarToggle({
  size = 'sm',
  icon,
  value,
  pressed,
  defaultPressed,
  onPressedChange,
  className,
  children,
  ...props
}: ToolbarToggleProps) {
  return (
    <ToolbarPrimitive.Button
      data-slot="toolbar-toggle"
      render={
        <Toggle
          value={value}
          pressed={pressed}
          defaultPressed={defaultPressed}
          onPressedChange={onPressedChange ? (next) => onPressedChange(next) : undefined}
        />
      }
      className={cn(buttonVariants({ variant: 'ghost', size }), toggleClasses, className)}
      {...props}
    >
      {icon ? <span aria-hidden className="contents">{icon}</span> : null}
      {children}
    </ToolbarPrimitive.Button>
  )
}

export interface ToolbarToggleGroupProps extends Omit<ToggleGroup.Props, 'className'> {
  className?: string
  /** Names the set: "Density", "Status". */
  'aria-label': string
}

/**
 * A set of toggles: one-of (the default) or `multiple`. It sits inside the
 * toolbar's roving focus rather than adding a second arrow-key scope, so the
 * arrows walk straight through it and out the other side.
 */
export function ToolbarToggleGroup({ className, ...props }: ToolbarToggleGroupProps) {
  return <ToggleGroup data-slot="toolbar-toggle-group" className={cn('flex items-center gap-1', className)} {...props} />
}

export interface ToolbarInputProps extends Omit<ToolbarPrimitive.Input.Props, 'className' | 'size'> {
  className?: string
  /** Classes for the wrapper, e.g. a width. */
  wrapperClassName?: string
  /** A leading glyph. Defaults to the search glyph; `false` for none. */
  icon?: React.ReactNode | false
}

/**
 * A text field that is one of the toolbar's stops. The arrow keys move the
 * caret while there is text to move through and only leave the field at its
 * edges — Base UI's rule, and the one that lets a person edit a filter without
 * being thrown onto the next button.
 *
 * Needs an accessible name (`aria-label`): a toolbar has no room for a visible
 * label, so the placeholder is a hint and never the name.
 */
export function ToolbarInput({ icon, className, wrapperClassName, ...props }: ToolbarInputProps) {
  return (
    <span className={cn('relative flex min-w-0 items-center', wrapperClassName)}>
      {icon !== false ? (
        <span aria-hidden className="pointer-events-none absolute inset-s-2 grid text-ink-muted [&_svg]:size-3.5">
          {icon ?? <Search />}
        </span>
      ) : null}
      <ToolbarPrimitive.Input
        data-slot="toolbar-input"
        className={cn(
          fieldControlClasses,
          fieldControlSizes.sm,
          icon !== false && 'ps-7',
          '[&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...props}
      />
    </span>
  )
}

export interface ToolbarOverflowItem {
  key: string
  label: string
  icon?: React.ReactNode
  onSelect: () => void
  disabled?: boolean
  /** Destroys something: highlights in rojo when it lands in the menu. */
  tone?: 'default' | 'danger'
}

export interface ToolbarOverflowProps {
  /** In priority order: the first items stay visible longest. */
  items: ToolbarOverflowItem[]
  /** The name of the menu button that collects what does not fit. */
  moreLabel?: string
  /** Which end of the free space the buttons hug. */
  align?: 'start' | 'end'
  className?: string
}

const GAP = 4 // gap-1

/**
 * Actions that fold into a "More" menu when the row runs out of room.
 *
 * Items that do not fit are removed from the row, not hidden with CSS. A
 * `display: none` button is still registered with the toolbar's roving focus,
 * and the arrow keys stall on it; unmounted, it simply is not a stop. The
 * widths come from an inert measuring copy of every item, so the decision is
 * made from real label widths in the current font and density, not a guessed
 * breakpoint, and an item comes back the moment there is room for it.
 *
 * Without layout (the server, jsdom) every item renders: the safe failure is
 * a row that wraps, never an action that cannot be reached.
 */
export function ToolbarOverflow({ items, moreLabel = 'More actions', align = 'end', className }: ToolbarOverflowProps) {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const measureRef = React.useRef<HTMLDivElement>(null)
  const [visible, setVisible] = React.useState(items.length)
  // Re-measure when the labels change, not whenever the caller passes a new
  // array: items are usually an inline literal, a new reference every render.
  const signature = items.map((item) => `${item.key}:${item.label}`).join('|')
  const itemCount = items.length

  React.useLayoutEffect(() => {
    const frame = frameRef.current
    const measure = measureRef.current
    if (!frame || !measure || typeof ResizeObserver === 'undefined') return

    const fit = () => {
      const available = frame.clientWidth
      const nodes = Array.from(measure.children) as HTMLElement[]
      const more = nodes.pop()
      const widths = nodes.map((node) => node.offsetWidth)
      // Without real layout every width is 0; keep everything rather than
      // folding it all into the menu.
      if (available === 0 || widths.every((w) => w === 0)) return setVisible(itemCount)
      const total = widths.reduce((sum, w, i) => sum + w + (i ? GAP : 0), 0)
      if (total <= available) return setVisible(itemCount)
      const budget = available - (more?.offsetWidth ?? 0) - GAP
      let used = 0
      let count = 0
      for (const w of widths) {
        const next = used + w + (count ? GAP : 0)
        if (next > budget) break
        used = next
        count += 1
      }
      setVisible(count)
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [signature, itemCount])

  const shown = items.slice(0, visible)
  const folded = items.slice(visible)

  return (
    <div
      ref={frameRef}
      data-slot="toolbar-overflow"
      className={cn('relative flex min-w-0 flex-1 items-center gap-1', align === 'end' && 'justify-end', className)}
    >
      <div
        ref={measureRef}
        aria-hidden
        inert
        className="pointer-events-none invisible absolute inset-s-0 top-0 flex h-0 gap-1 overflow-hidden"
      >
        {items.map((item) => (
          <span key={item.key} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {item.icon}
            {item.label}
          </span>
        ))}
        <span className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <Ellipsis />
          More
        </span>
      </div>
      {shown.map((item) => (
        <ToolbarButton
          key={item.key}
          icon={item.icon}
          disabled={item.disabled}
          onClick={item.onSelect}
          className={cn(item.tone === 'danger' && 'text-ink-danger')}
        >
          {item.label}
        </ToolbarButton>
      ))}
      {folded.length > 0 ? (
        <Menu>
          <ToolbarButton render={<MenuTrigger />} icon={<Ellipsis />} aria-label={moreLabel}>
            More
          </ToolbarButton>
          <MenuContent align="end">
            {folded.map((item) => (
              <MenuItem key={item.key} icon={item.icon} disabled={item.disabled} tone={item.tone} onClick={item.onSelect}>
                {item.label}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      ) : null}
    </div>
  )
}
