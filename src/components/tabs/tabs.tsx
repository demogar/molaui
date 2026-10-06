'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Two variants, for two jobs.
 *
 * `underline` switches views of one thing — a run's Trace / Output / Cost /
 * Logs. The selected tab is marked by a 3px ink bar that SLIDES to it (Base
 * UI publishes the active tab's geometry as CSS variables, so the bar is one
 * element moving rather than one per tab appearing), set on a decorative
 * keyline that runs the width of the list. The bar is ink, not red: it is
 * where you are, not a warning.
 *
 * `panel` is for tabs that ARE containers — a settings sheet, a code sample
 * in three languages. The selected tab is a cut tab joined to the panel below
 * it: raised cloth, keyline on three sides, and its cloth paints over the
 * panel's top keyline for exactly its own width, so the two read as one shape
 * cut from one layer. A gold band along its top is the revealed layer.
 *
 * Tab labels are set in the UI voice at sentence case, not the button's caps
 * register: a row of six capitalised, expanded labels reads as six buttons.
 * Arrow keys move between tabs, Home/End jump, and activation follows focus
 * only when `activateOnFocus` is set — a tab that loads a trace should not
 * start loading because a keyboard user passed over it.
 */

type Variant = 'underline' | 'panel'
const VariantContext = React.createContext<Variant>('underline')

export interface TabsProps extends Omit<TabsPrimitive.Root.Props, 'className'> {
  className?: string
  variant?: Variant
}

export function Tabs({ className, variant = 'underline', ...props }: TabsProps) {
  return (
    <VariantContext.Provider value={variant}>
      <TabsPrimitive.Root data-slot="tabs" data-variant={variant} className={cn('flex flex-col', className)} {...props} />
    </VariantContext.Provider>
  )
}

export interface TabsListProps extends Omit<TabsPrimitive.List.Props, 'className'> {
  className?: string
}

export function TabsList({ className, children, ...props }: TabsListProps) {
  const variant = React.useContext(VariantContext)
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'scroll-cloth relative z-[1] flex items-end overflow-x-auto overflow-y-hidden',
        variant === 'underline' && 'gap-1 shadow-[inset_0_-1px_0_var(--keyline)]',
        variant === 'panel' && 'gap-0.5 px-[1.5px] pt-[6.5px]',
        className,
      )}
      {...props}
    >
      {children}
      {variant === 'underline' ? (
        <TabsPrimitive.Indicator
          className={cn(
            'absolute bottom-0 left-(--active-tab-left) h-[3px] w-(--active-tab-width) bg-ink',
            'transition-[left,width] duration-(--motion-base) ease-cut',
          )}
        />
      ) : null}
    </TabsPrimitive.List>
  )
}

export interface TabsTabProps extends Omit<TabsPrimitive.Tab.Props, 'className'> {
  className?: string
  /** Trailing count, e.g. the number of tool calls. Tabular. */
  count?: number
  icon?: React.ReactNode
}

export function TabsTab({ className, count, icon, children, ...props }: TabsTabProps) {
  const variant = React.useContext(VariantContext)
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        'group/tab relative inline-flex h-(--control-h) shrink-0 items-center gap-2 whitespace-nowrap px-(--control-px) outline-none select-none',
        'font-ui text-sm font-semibold text-ink-muted',
        'transition-[color,background-color,box-shadow] duration-(--motion-cut) ease-cut',
        'hover:text-ink data-active:text-ink',
        'data-disabled:pointer-events-none data-disabled:text-ink-muted/60',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        // The focus ring sits inside the tab so the list's overflow clip does
        // not shave it off at either end of a scrolling row.
        'focus-visible:shadow-[inset_0_0_0_1.5px_var(--ink),inset_0_0_0_3.5px_var(--cloth-pale)]',
        variant === 'panel' && [
          // Resting tabs stop 3px short of the list's foot, clear of the
          // panel's keyline; the active one runs to the foot and its cloth
          // paints over that keyline (the panel is pulled up under the list,
          // and the list sits above it), so tab and panel are one shape.
          'mb-[3px] bg-cloth-shade band-oro hover:bg-cloth-deep',
          'data-active:mb-0 data-active:bg-cloth-pale',
          'data-active:shadow-[-1.5px_0_0_0_var(--ink),1.5px_0_0_0_var(--ink),0_-1.5px_0_0_var(--ink)]',
          "data-active:before:absolute data-active:before:inset-x-0 data-active:before:-top-[6.5px] data-active:before:h-[5px] data-active:before:bg-(--band) data-active:before:shadow-[0_-1.5px_0_0_var(--ink),-1.5px_0_0_0_var(--ink),1.5px_0_0_0_var(--ink)] data-active:before:content-['']",
        ],
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden className="contents">
          {icon}
        </span>
      ) : null}
      {children}
      {count !== undefined ? (
        <span className="min-w-5 bg-ink-soft px-1.5 py-0.5 text-center text-2xs tabular-nums text-ink-2 group-data-active/tab:bg-ink group-data-active/tab:text-on-ink">
          {count.toLocaleString('en-US')}
        </span>
      ) : null}
    </TabsPrimitive.Tab>
  )
}

export interface TabsPanelProps extends Omit<TabsPrimitive.Panel.Props, 'className'> {
  className?: string
}

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  const variant = React.useContext(VariantContext)
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn(
        'outline-none',
        variant === 'underline' && 'pt-5',
        variant === 'panel' && 'relative -mt-[1.5px] bg-cloth-pale p-5 shadow-cut',
        className,
      )}
      {...props}
    />
  )
}
