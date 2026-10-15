'use client'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Check, ChevronRight } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { deprecate } from '../../lib/deprecate'
import { slotUnlessRendered } from '../../lib/slot'
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
export function MenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger {...slotUnlessRendered('menu-trigger', props.render)} {...props} />
}

export function MenuGroup(props: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="menu-group" {...props} />
}

export function MenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />
}
export const MenuSubmenu = MenuPrimitive.SubmenuRoot

const itemClasses = [
  'group/item relative flex min-h-(--control-h-sm) cursor-default items-center gap-2.5 px-2.5 py-1.5 outline-none select-none',
  'font-ui text-sm text-ink',
  'data-highlighted:bg-ink data-highlighted:text-on-ink data-highlighted:forced-selected',
  // The ink fill IS the focus indicator here; the global two-tone ring on
  // top of it would double the mark and spill past the menu's edge.
  'focus-visible:shadow-none',
  'data-disabled:pointer-events-none data-disabled:text-ink-muted',
  // Base UI keeps a disabled item reachable by the arrow keys, so it can be
  // highlighted: --ink-muted on the ink fill measures 2.99:1. Named here, the
  // pair is inverse muted ink (8.36 / 6.56) instead of a variant-order guess.
  'data-disabled:data-highlighted:text-on-ink-muted',
  '[&_svg]:size-(--icon) [&_svg]:shrink-0',
]

export interface MenuContentProps extends Omit<MenuPrimitive.Popup.Props, 'className'> {
  /** Classes for the popup, merged with `cn()`. A string, not Base UI's function of state: style a state with its `data-*` attribute. */
  className?: string
  /** Which side of the trigger the menu opens on, `bottom` by default. Base UI flips it when there is no room. */
  side?: MenuPrimitive.Positioner.Props['side']
  /** How the menu lines up along that side, `start` by default, so it hangs from the trigger's leading edge. */
  align?: MenuPrimitive.Positioner.Props['align']
  /** The gap between trigger and menu in pixels, 6 by default: enough that the menu's keyline does not merge with the trigger's. */
  sideOffset?: number
  /** A shift along the aligned edge in pixels, 0 by default. */
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
        className="z-(--z-popover) outline-none"
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

/**
 * Right-aligned key hint. The keys are left to right in every direction (see
 * Kbd): in a right-to-left menu `⌘S` would otherwise render as S⌘. `dir` is
 * on an inner span, not the root, because a logical margin resolves against
 * the element's own direction: on the root, `ms-auto ps-4` became a left
 * margin in a right-to-left row and pushed the hint against the label.
 */
export function MenuShortcut({ className, children, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="menu-shortcut"
      className={cn(
        'ms-auto ps-4 font-ui text-xs tabular-nums tracking-figures text-ink-muted group-data-highlighted/item:text-on-ink-muted',
        className,
      )}
      {...props}
    >
      <span dir="ltr">{children}</span>
    </span>
  )
}

export interface MenuItemProps extends Omit<MenuPrimitive.Item.Props, 'className'> {
  /** Classes for the item, merged with `cn()`. A string, for the reason given on `MenuContent`. */
  className?: string
  /** Leading icon; decorative. */
  icon?: React.ReactNode
  /**
   * A key hint, right-aligned in muted figures: "⌘D". It only shows the key;
   * binding it is yours, and it is read as part of the item's name.
   */
  shortcut?: string
  /**
   * `danger` destroys something: it highlights in rojo instead of ink.
   * `default` is deprecated since 0.7.0 and removed in 1.0.0: use `neutral`,
   * the status word every other `tone` uses.
   */
  tone?: 'neutral' | 'danger' | 'default'
}

export function MenuItem({ className, icon, shortcut, tone = 'neutral', children, ...props }: MenuItemProps) {
  if (tone === 'default') {
    deprecate('menu-item-tone-default', { what: '<MenuItem tone="default">', instead: '<MenuItem tone="neutral">', removal: '1.0.0' })
  }
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        itemClasses,
        tone === 'danger' && 'text-ink-danger data-highlighted:bg-danger data-highlighted:text-on-layer',
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
  /** Classes for the item, merged with `cn()`. A string, for the reason given on `MenuContent`. */
  className?: string
  /** A key hint, as on `MenuItem`: shown, not bound. */
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
          <Check className="size-(--icon-sm)!" strokeWidth={2.5} />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <MenuShortcut>{shortcut}</MenuShortcut> : null}
    </MenuPrimitive.CheckboxItem>
  )
}

export interface MenuRadioItemProps extends Omit<MenuPrimitive.RadioItem.Props, 'className'> {
  /** Classes for the item, merged with `cn()`. A string, for the reason given on `MenuContent`. */
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
        <span className="size-2.5 cut-current">
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
      data-slot="menu-group-label"
      className={cn('px-2.5 pt-2 pb-1.5 rotulo text-ink-muted', className)}
      {...props}
    />
  )
}

export function MenuSeparator({ className, ...props }: Omit<MenuPrimitive.Separator.Props, 'className'> & { className?: string }) {
  return <MenuPrimitive.Separator data-slot="menu-separator" className={cn('my-1.5 h-px bg-keyline', className)} {...props} />
}

export interface MenuSubmenuTriggerProps extends Omit<MenuPrimitive.SubmenuTrigger.Props, 'className'> {
  /** Classes for the item, merged with `cn()`. A string, for the reason given on `MenuContent`. */
  className?: string
  /** Leading icon; decorative. The trailing chevron is always drawn. */
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
      <ChevronRight aria-hidden className="-me-1 ms-auto text-ink-muted flip-rtl group-data-highlighted/item:text-on-ink-muted" />
    </MenuPrimitive.SubmenuTrigger>
  )
}
