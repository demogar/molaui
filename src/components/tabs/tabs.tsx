'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { useMessagesLocale } from '../../lib/messages'
import { useMergedRefs } from '../../lib/merge-props'
import { useScrollEdge } from '../../lib/scroll-edge'

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

export type TabsVariant = 'underline' | 'panel'
const VariantContext = React.createContext<TabsVariant>('underline')

export interface TabsProps extends Omit<TabsPrimitive.Root.Props, 'className'> {
  /**
   * Classes for the root, merged with `cn()`. A string, not Base UI's
   * function of state: style a state with its `data-*` attribute.
   */
  className?: string
  /**
   * `underline` (default) switches views of one thing, a run's Trace / Output
   * / Logs. `panel` is for tabs that are containers, a settings sheet or a
   * code sample in three languages: the active tab joins the panel below.
   * Every part inside reads it, so set it here only.
   */
  variant?: TabsVariant
}

export function Tabs({ className, variant = 'underline', ...props }: TabsProps) {
  return (
    <VariantContext.Provider value={variant}>
      <TabsPrimitive.Root data-slot="tabs" data-variant={variant} className={cn('flex flex-col', className)} {...props} />
    </VariantContext.Provider>
  )
}

export interface TabsListProps extends Omit<TabsPrimitive.List.Props, 'className'> {
  /** Classes for the row of tabs, which scrolls sideways when the tabs outgrow it. A string, for the reason given on `Tabs`. */
  className?: string
  ref?: React.Ref<HTMLDivElement>
}

export function TabsList({ className, children, ref, ...props }: TabsListProps) {
  const variant = React.useContext(VariantContext)
  // The list scrolls sideways when the tabs outgrow it, and says so with the
  // scroll-edge cue; "Guard|" cut flat at the edge was the only hint before.
  const setRef = useMergedRefs(ref, useScrollEdge<HTMLDivElement>())
  return (
    <TabsPrimitive.List
      {...props}
      ref={setRef}
      data-slot="tabs-list"
      data-part="list"
      className={cn(
        'scroll-cloth scroll-edge relative z-(--z-lift) flex items-end overflow-x-auto overflow-y-hidden',
        variant === 'underline' && 'gap-1 rule-b',
        variant === 'panel' && 'gap-0.5 px-(--cut-w) pt-[6.5px]',
        className,
      )}
    >
      {children}
      {variant === 'underline' ? (
        // The bar slides and stretches with transforms, not `left` and
        // `width`: those are layout properties, so every frame of the slide
        // laid out the bar again, and the audit's layout-transition check
        // fails them. A one-pixel bar scaled to the tab's width is the same
        // shape, moved by the compositor. Base UI hands over the measured
        // position and size as numbers in the indicator's state; its CSS
        // variables are lengths, and CSS cannot divide a length by a length to
        // get a scale factor.
        <TabsPrimitive.Indicator
          data-part="indicator"
          className={cn(
            'absolute bottom-0 left-0 h-(--bar-w) w-px origin-left bg-ink forced-ink',
            'transition-[translate,scale] duration-(--motion-base)',
          )}
          style={({ activeTabPosition, activeTabSize }) =>
            activeTabPosition && activeTabSize
              ? { translate: `${activeTabPosition.left}px 0`, scale: `${activeTabSize.width} 1` }
              : {}
          }
        />
      ) : null}
    </TabsPrimitive.List>
  )
}

export interface TabsTabProps extends Omit<TabsPrimitive.Tab.Props, 'className'> {
  /** Classes for the tab, merged with `cn()`. A string, for the reason given on `Tabs`. */
  className?: string
  /** Trailing count, e.g. the number of tool calls. Tabular. */
  count?: number
  /** Leading icon; decorative, so the label still has to name the tab. */
  icon?: React.ReactNode
}

export function TabsTab({ className, count, icon, children, ...props }: TabsTabProps) {
  const variant = React.useContext(VariantContext)
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      data-part="tab"
      className={cn(
        'group/tab relative inline-flex h-(--control-h) shrink-0 items-center gap-2 whitespace-nowrap px-(--control-px) outline-none select-none',
        'font-ui text-sm font-semibold text-ink-2',
        'transition-[color,background-color,box-shadow]',
        'hover:text-ink data-active:text-ink',
        // Pressed is the inward cut every edgeless control takes; not on the
        // active panel tab, whose own edge is the same slot.
        'not-data-active:active:cut-press',
        // Disabled steps down to the floor of the text ramp, as in Segmented and
        // Menu; it was a 60% fade of that floor, which drops below 3:1. Muted
        // text alone still read as a quiet tab rather than one that cannot be
        // opened, so it takes the disabled ground every other disabled
        // control has. The reason belongs beside it (`aria-describedby`), as
        // the Underline story does.
        'data-disabled:pointer-events-none data-disabled:bg-disabled data-disabled:text-ink-muted',
        '[&_svg]:size-(--icon) [&_svg]:shrink-0',
        // The focus ring sits inside the tab so the list's overflow clip does
        // not shave it off at either end of a scrolling row.
        'focus-visible:focus-ring-inset',
        // The edgeless hover every other edgeless control has: a wash behind
        // it as well as the text stepping up to ink. Tabs did only the second.
        variant === 'underline' && 'hover:bg-ink-soft active:bg-ink-soft',
        variant === 'panel' && [
          // Resting tabs stop 3px short of the list's foot, clear of the
          // panel's keyline; the active one runs to the foot and its cloth
          // paints over that keyline (the panel is pulled up under the list,
          // and the list sits above it), so tab and panel are one shape.
          'mb-(--bar-w) bg-cloth-shade band-accent hover:bg-cloth-deep',
          'data-active:mb-0 data-active:bg-cloth-pale data-active:forced-selected',
          'data-active:cut-tab',
          // The active tab's edges are a state variant, which comes after
          // `focus-visible:`; as one box-shadow string they replaced the ring,
          // and a focused active tab looked exactly like an unfocused one. As
          // edge slots they add up, but the variant order still means the
          // ring has to be named under `data-active:` too.
          'data-active:focus-visible:focus-ring-inset',
          "data-active:before:absolute data-active:before:inset-x-0 data-active:before:-top-[6.5px] data-active:before:h-[5px] data-active:before:bg-(--band) data-active:before:cut-tab data-active:before:content-['']",
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
        <span data-part="count" className="min-w-5 bg-ink-soft px-1.5 py-0.5 text-center text-2xs tabular-nums text-ink-2 group-data-active/tab:bg-ink group-data-active/tab:text-on-ink">
          <Count value={count} />
        </span>
      ) : null}
    </TabsPrimitive.Tab>
  )
}

export interface TabsPanelProps extends Omit<TabsPrimitive.Panel.Props, 'className'> {
  /** Classes for the panel, merged with `cn()`. A string, for the reason given on `Tabs`. */
  className?: string
}

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  const variant = React.useContext(VariantContext)
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      data-part="panel"
      className={cn(
        'outline-none',
        variant === 'underline' && 'pt-5',
        variant === 'panel' && 'relative -mt-(--cut-w) bg-cloth-pale p-5 shadow-cut',
        className,
      )}
      {...props}
    />
  )
}

// A count in the provider's locale, `en-US` without one: a fixed locale, not
// the runtime's, so the server and the browser write the same digits.
function Count({ value }: { value: number }) {
  return value.toLocaleString(useMessagesLocale() ?? 'en-US')
}
