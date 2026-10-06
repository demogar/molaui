'use client'

import * as React from 'react'

import { cn } from '../../lib/cn'
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
        aria-label={label}
        className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-2 py-3 scroll-cloth', className)}
        {...props}
      >
        {children}
      </nav>
      {footer ? (
        <div className="shrink-0 px-2 py-2 shadow-[inset_0_1px_0_var(--keyline)]">{footer}</div>
      ) : null}
    </div>
  )
}

/**
 * A titled group of items. The title is in the rótulo register; collapsed to
 * a rail it becomes a short keyline, and the words stay for screen readers so
 * the groups are still announced.
 */
export function NavSection({ title, className, children }: { title?: string; className?: string; children: React.ReactNode }) {
  const { collapsed } = React.useContext(SidebarContext)
  const id = React.useId()
  return (
    <div data-slot="nav-section" className={className}>
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

export interface NavItemProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  /** The visible label. A string, so it can also be the rail's tooltip. */
  children: string
  icon?: React.ReactNode
  /** The current page. Sets `aria-current="page"`. */
  active?: boolean
  /** A count beside the label: open items, failures. */
  count?: number
  /** Read with the count: "3 failed". Without it the number is read alone. */
  countLabel?: string
  /** `attention` fills the count in rojo — for things that need a person, not for totals. */
  countTone?: 'neutral' | 'attention'
}

/**
 * One destination. Active is an ink bar on the leading edge plus a washed
 * ground and a heavier label — three cues, so it never depends on the wash
 * alone, which nearly disappears on some displays.
 *
 * Collapsed to the rail, the label becomes screen-reader text and the native
 * `title` names the icon on hover. The count turns into a small cut mark on
 * the icon, so a failure count is still visible from the rail.
 */
export function NavItem({
  children,
  icon,
  active = false,
  count,
  countLabel,
  countTone = 'neutral',
  className,
  onClick,
  ...props
}: NavItemProps) {
  const { collapsed, onNavigate } = React.useContext(SidebarContext)
  const hasCount = count !== undefined && count > 0

  return (
    <li>
      <a
        data-slot="nav-item"
        aria-current={active ? 'page' : undefined}
        title={collapsed ? children : undefined}
        onClick={(event) => {
          onClick?.(event)
          onNavigate()
        }}
        className={cn(
          'relative flex h-(--control-h) items-center gap-2.5 px-3 text-sm text-ink-2 no-underline',
          'transition-colors duration-(--motion-cut) ease-cut',
          'hover:bg-ink-soft hover:text-ink',
          'aria-[current=page]:bg-ink-soft aria-[current=page]:font-semibold aria-[current=page]:text-ink',
          'aria-[current=page]:shadow-[inset_3px_0_0_var(--ink)]',
          'focus-visible:shadow-[var(--focus-ring)]',
          '[&_svg]:size-4 [&_svg]:shrink-0',
          collapsed && 'justify-center px-0',
          className,
        )}
        {...props}
      >
        {icon ? <span aria-hidden className="relative flex">{icon}
          {collapsed && hasCount ? (
            <span
              className={cn(
                'absolute -top-1 -right-1.5 size-1.5',
                countTone === 'attention' ? 'bg-rojo' : 'bg-ink-muted',
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
                  : countTone === 'attention'
                    ? 'bg-rojo px-1.5 py-px text-2xs font-semibold text-on-layer'
                    : 'text-xs text-ink-muted',
              )}
            >
              {count}
            </span>
          </>
        ) : null}
      </a>
    </li>
  )
}
