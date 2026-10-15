'use client'

import { useRender } from '@base-ui/react/use-render'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { mergeProps } from '../../lib/merge-props'
import { deprecate } from '../../lib/deprecate'
import { SidebarContext } from './app-shell'

/**
 * The navigation inside the shell's aside. It reads whether it is collapsed
 * from the shell rather than taking a prop, because the same tree is drawn
 * twice — rail on desktop, sheet on mobile — and only the shell knows which.
 */
export interface SidebarProps extends Omit<React.ComponentProps<'nav'>, 'aria-label'> {
  /** Names the navigation landmark: "Main", "Settings". */
  label: string
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function Sidebar({ label, header, footer, className, children, ...props }: SidebarProps) {
  return (
    <div data-slot="sidebar" className="flex h-full min-h-0 flex-col">
      {header ? (
        <div className="shrink-0 px-2 pt-3 pb-1">{header}</div>
      ) : null}
      <nav
        data-slot="sidebar-nav"
        aria-label={label}
        className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-2 py-3 scroll-cloth', className)}
        {...props}
      >
        {children}
      </nav>
      {footer ? (
        <div className="shrink-0 px-2 py-2 rule-t">{footer}</div>
      ) : null}
    </div>
  )
}

/**
 * A titled group of items. The title is in the rótulo register; collapsed to
 * a rail it becomes a short keyline, and the words stay for screen readers so
 * the groups are still announced.
 */
export interface NavSectionProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** The group's title, in the rótulo register. Names the list. */
  title?: string
  children: React.ReactNode
}

export function NavSection({ title, className, children, ...props }: NavSectionProps) {
  const { collapsed } = React.useContext(SidebarContext)
  const id = React.useId()
  return (
    <div {...props} data-slot="nav-section" className={className}>
      {title ? (
        <p
          id={id}
          className={cn(
            'm-0 mb-1.5 px-3 rotulo text-ink-muted',
            collapsed && 'sr-only',
          )}
        >
          {title}
        </p>
      ) : null}
      {title && collapsed ? <span aria-hidden className="mx-auto mb-2 block h-px w-6 bg-keyline" /> : null}
      <ul aria-labelledby={title ? id : undefined} className="m-0 flex list-none flex-col gap-px p-0">
        {children}
      </ul>
    </div>
  )
}

export interface NavItemProps extends Omit<useRender.ComponentProps<'a'>, 'children'> {
  /** The visible label. A string, so it can also be the rail's tooltip. */
  children: string
  icon?: React.ReactNode
  /** The current page. Sets `aria-current="page"`. */
  active?: boolean
  /** A count beside the label: open items, failures. */
  count?: number
  /** Read with the count: "3 failed". Without it the number is read alone. */
  countLabel?: string
  /**
   * `danger` fills the count in the danger colour — for failures that need a
   * person, not for totals. `attention` is deprecated since 0.7.0 and removed
   * in 1.0.0: use `danger`, the same fill under the status word every `tone`
   * uses.
   */
  countTone?: 'neutral' | 'danger' | 'attention'
}

/**
 * One destination. Active is an ink bar on the leading edge plus a washed
 * ground and a heavier label — three cues, so it never depends on the wash
 * alone, which nearly disappears on some displays.
 *
 * Collapsed to the rail, the label becomes screen-reader text and the native
 * `title` names the icon on hover. The count turns into a small cut mark on
 * the icon, so a failure count is still visible from the rail.
 *
 * ── your router's link ──
 * It renders an `<a>` by default, and `render` swaps that for the app's own
 * link — `render={<Link to="/runs" />}` — with the classes, `aria-current`,
 * handlers and ref merged onto it, as every Base UI part's `render` does. A
 * hard `<a>` made the app shell's own sidebar, the one place client routing
 * matters most, reload the whole document on every click in Next or React
 * Router.
 */
export function NavItem({
  children,
  icon,
  active = false,
  count,
  countLabel,
  countTone = 'neutral',
  className,
  render,
  ref,
  ...props
}: NavItemProps) {
  const { collapsed, onNavigate } = React.useContext(SidebarContext)
  const hasCount = count !== undefined && count > 0
  if (countTone === 'attention') {
    deprecate('nav-item-count-tone-attention', {
      what: '<NavItem countTone="attention">',
      instead: '<NavItem countTone="danger">',
      removal: '1.0.0',
    })
  }
  const urgent = countTone === 'danger' || countTone === 'attention'

  const classes = cn(
    'relative flex h-(--control-h) items-center gap-2.5 px-3 text-sm text-ink-2 no-underline',
    'transition-colors',
    'hover:bg-ink-soft hover:text-ink',
    'aria-[current=page]:bg-ink-soft aria-[current=page]:font-semibold aria-[current=page]:text-ink',
    'aria-[current=page]:bar-start-ink',
    'aria-[current=page]:forced-selected',
    // The bar and the ring are separate edge slots, so a focused current
    // item shows both. As one box-shadow string each, the bar (a state
    // variant, emitted after `focus-visible:`) replaced the ring, and a
    // pair of combined strings per direction had to put it back.
    'focus-visible:focus-ring',
    '[&_svg]:size-(--icon) [&_svg]:shrink-0',
    collapsed && 'justify-center px-0',
    className,
  )

  const content = (
    <>
      {icon ? <span aria-hidden className="relative flex">{icon}
        {collapsed && hasCount ? (
          <span
            className={cn(
              'absolute -top-1 -inset-e-1.5 size-1.5',
              urgent ? 'bg-danger' : 'bg-ink-muted',
            )}
          />
        ) : null}
      </span> : null}
      <span className={cn('min-w-0 flex-1 truncate', collapsed && 'sr-only')}>{children}</span>
      {hasCount ? (
        <>
          {/* One sr-only string rather than spaced fragments: accessible-name
              computation trims each element's own text, so ", " + "3" + " failed"
              in three spans is read as ",3failed". */}
          <span className="sr-only">{`, ${count}${countLabel ? ` ${countLabel}` : ''}`}</span>
          <span
            aria-hidden
            className={cn(
              'tabular-nums',
              collapsed
                ? 'hidden'
                : urgent
                  ? 'bg-danger px-1.5 py-px text-2xs font-semibold text-on-layer'
                  : 'text-xs text-ink-muted',
            )}
          >
            {count}
          </span>
        </>
      ) : null}
    </>
  )

  const element = useRender({
    defaultTagName: 'a',
    render,
    ref,
    props: {
      'data-slot': 'nav-item',
      // Base UI's merge: the consumer's onClick runs first, then the sidebar
      // closes on a phone; `event.preventBaseUIHandler()` can stop that.
      ...mergeProps<'a'>(
        {
          'aria-current': active ? 'page' : undefined,
          title: collapsed ? children : undefined,
          onClick: () => onNavigate(),
        },
        props,
      ),
      className: classes,
      children: content,
    },
  })

  return <li>{element}</li>
}
