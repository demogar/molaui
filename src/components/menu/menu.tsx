'use client'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Check, ChevronRight } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { floatingSurface } from '../popover/surface'

/**
 * Actions on a thing — a run, a row, a document — that do not each deserve a
 * button.
 *
 * The highlighted item fills with ink and its label turns to cloth. That is
 * the same gesture a checked `Chip` makes, and it is the system's answer to
 * "where am I" in a list: not a pale tint (which disappears on a laptop in
 * sunlight and is a different hue in every theme) but the top layer itself,
 * cut out around the one row the pointer or the arrow keys are on. In the
 * dark theme ink is cloth, so the highlight inverts with everything else.
 *
 * A destructive item highlights in rojo, not ink. The colour arrives at the
 * last moment — when the item is about to be chosen — so a menu with a
 * "Delete" at the bottom does not shout at rest, and still cannot be chosen
 * without the operator seeing red.
 *
 * Shortcuts are right-aligned in tabular figures and the label register's
 * muted ink; they are reference, not content. Keyboard behaviour, typeahead,
 * submenus and focus return all come from Base UI.
 */

export const Menu = MenuPrimitive.Root
export const MenuTrigger = MenuPrimitive.Trigger
export const MenuGroup = MenuPrimitive.Group
export const MenuRadioGroup = MenuPrimitive.RadioGroup
export const MenuSubmenu = MenuPrimitive.SubmenuRoot

const itemClasses = [
  'group/item relative flex min-h-(--control-h-sm) cursor-default items-center gap-2.5 px-2.5 py-1.5 outline-none select-none',
  'font-ui text-sm text-ink',
  'data-highlighted:bg-ink data-highlighted:text-on-ink data-highlighted:forced-selected',
  // The ink fill IS the focus indicator here; the global two-tone ring on
  // top of it would double the mark and spill past the menu's edge.
  'focus-visible:shadow-none',
  'data-disabled:pointer-events-none data-disabled:text-ink-muted',
  '[&_svg]:size-4 [&_svg]:shrink-0',
]

export interface MenuContentProps extends Omit<MenuPrimitive.Popup.Props, 'className'> {
  className?: string
  side?: MenuPrimitive.Positioner.Props['side']
  align?: MenuPrimitive.Positioner.Props['align']
  sideOffset?: number
  alignOffset?: number
}

export function MenuContent({
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  alignOffset = 0,
  ...props
}: MenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup
          data-slot="menu"
          className={cn(floatingSurface, 'min-w-52 max-w-[calc(100vw-2rem)] py-1.5', className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

/** Right-aligned key hint. */
export function MenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'ms-auto ps-4 font-ui text-xs tabular-nums tracking-[0.04em] text-ink-muted group-data-highlighted/item:text-on-ink-muted',
        className,
      )}
      {...props}
    />
  )
}

export interface MenuItemProps extends Omit<MenuPrimitive.Item.Props, 'className'> {
  className?: string
  /** Leading icon; decorative. */
  icon?: React.ReactNode
  shortcut?: string
  /** Destroys something: highlights in rojo instead of ink. */
  tone?: 'default' | 'danger'
}

export function MenuItem({ className, icon, shortcut, tone = 'default', children, ...props }: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        itemClasses,
        tone === 'danger' && 'text-ink-danger data-highlighted:bg-rojo data-highlighted:text-on-layer',
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden className="contents">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <MenuShortcut>{shortcut}</MenuShortcut> : null}
    </MenuPrimitive.Item>
  )
}

export interface MenuCheckboxItemProps extends Omit<MenuPrimitive.CheckboxItem.Props, 'className'> {
  className?: string
  shortcut?: string
}

/**
 * The check sits in a fixed leading column, so checked and unchecked labels
 * stay aligned down the menu. Toggling does not close the menu: a set of
 * column toggles is chosen several at a time.
 */
export function MenuCheckboxItem({ className, shortcut, children, closeOnClick = false, ...props }: MenuCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menu-checkbox-item"
      closeOnClick={closeOnClick}
      className={cn(itemClasses, className)}
      {...props}
    >
      <span aria-hidden className="grid size-4 shrink-0 place-items-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <Check className="size-3.5!" strokeWidth={2.5} />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <MenuShortcut>{shortcut}</MenuShortcut> : null}
    </MenuPrimitive.CheckboxItem>
  )
}

export interface MenuRadioItemProps extends Omit<MenuPrimitive.RadioItem.Props, 'className'> {
  className?: string
}

/** One-of-N. The mark is a filled square — a radio dot would be the only round thing in the system. */
export function MenuRadioItem({ className, children, closeOnClick = false, ...props }: MenuRadioItemProps) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      closeOnClick={closeOnClick}
      className={cn(itemClasses, className)}
      {...props}
    >
      <span aria-hidden className="grid size-4 shrink-0 place-items-center">
        <span className="size-2.5 shadow-[0_0_0_1.5px_currentColor]">
          <MenuPrimitive.RadioItemIndicator className="block size-full bg-current" />
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </MenuPrimitive.RadioItem>
  )
}

export function MenuGroupLabel({ className, ...props }: Omit<MenuPrimitive.GroupLabel.Props, 'className'> & { className?: string }) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn('px-2.5 pt-2 pb-1.5 rotulo text-ink-muted', className)}
      {...props}
    />
  )
}

export function MenuSeparator({ className, ...props }: Omit<MenuPrimitive.Separator.Props, 'className'> & { className?: string }) {
  return <MenuPrimitive.Separator className={cn('my-1.5 h-px bg-keyline', className)} {...props} />
}

export interface MenuSubmenuTriggerProps extends Omit<MenuPrimitive.SubmenuTrigger.Props, 'className'> {
  className?: string
  icon?: React.ReactNode
}

export function MenuSubmenuTrigger({ className, icon, children, ...props }: MenuSubmenuTriggerProps) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menu-submenu-trigger"
      className={cn(itemClasses, 'data-popup-open:bg-ink-soft data-popup-open:data-highlighted:bg-ink', className)}
      {...props}
    >
      {icon ? (
        <span aria-hidden className="contents">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRight aria-hidden className="-me-1 ms-auto text-ink-muted rtl:-scale-x-100 group-data-highlighted/item:text-on-ink-muted" />
    </MenuPrimitive.SubmenuTrigger>
  )
}
