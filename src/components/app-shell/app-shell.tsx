'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { useControllable } from '../../lib/use-controllable'
import { IconButton } from '../button'

/**
 * The frame an internal tool lives in: a bar across the top, navigation down
 * the side, and one scrolling region for the work.
 *
 * ── one scroll container ──
 * The shell is exactly the viewport tall and only `<main>` scrolls. Bars that
 * scroll away mean an operator twenty rows into a table has lost the product
 * switcher, the search and the way back; a page that scrolls *under* fixed
 * bars means every anchor link lands beneath them. One scroll region avoids
 * both.
 *
 * ── the sidebar collapses to a rail, then becomes a sheet ──
 * From 920px up — the breakpoint the editorial site collapsed its own nav at —
 * the sidebar is in the layout and collapses to an icon rail on demand. Below
 * it, there is no room for a rail beside a dense table, so the same sidebar
 * renders in a modal sheet instead. It is the same element tree in both
 * places, so the navigation cannot drift between desktop and mobile.
 *
 * The collapse is a width transition on the aside, not a remount, so focus
 * survives it and the labels stay in the DOM as screen-reader text.
 */

interface ShellState {
  collapsed: boolean
  setCollapsed: (next: boolean) => void
  setMobileOpen: (next: boolean) => void
  sidebarId: string
  mainId: string
}

const ShellContext = React.createContext<ShellState | null>(null)

/** What a nav item needs to know about where it is drawn. */
export interface SidebarContextValue {
  collapsed: boolean
  /** Called when an item is chosen — closes the sheet on mobile, nothing on desktop. */
  onNavigate: () => void
}

export const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  onNavigate: () => {},
})

export interface AppShellProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /**
   * The bar across the top, usually a `Topbar`. It stays put while `<main>`
   * scrolls, so the switcher and search are never lost.
   */
  topbar: React.ReactNode
  /**
   * The navigation, usually a `Sidebar`. The same tree is drawn in the layout from
   * 920px and in a modal sheet below it, so desktop and mobile navigation cannot
   * drift.
   */
  sidebar: React.ReactNode
  children: React.ReactNode
  /** Controlled collapse of the desktop sidebar. */
  sidebarCollapsed?: boolean
  /**
   * Start with the desktop sidebar collapsed to its icon rail. Defaults to
   * `false`; ignored below 920px, where the sidebar is a sheet.
   */
  defaultSidebarCollapsed?: boolean
  /**
   * Called when the desktop sidebar collapses or expands — to remember the choice
   * between visits.
   */
  onSidebarCollapsedChange?: (collapsed: boolean) => void
}

export function AppShell({
  topbar,
  sidebar,
  children,
  sidebarCollapsed,
  defaultSidebarCollapsed = false,
  onSidebarCollapsedChange,
  className,
  ...props
}: AppShellProps) {
  const [collapsed, setCollapsed] = useControllable({
    value: sidebarCollapsed,
    defaultValue: defaultSidebarCollapsed,
    onChange: onSidebarCollapsedChange,
  })
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const uid = React.useId()

  const shell: ShellState = {
    collapsed,
    setCollapsed,
    setMobileOpen,
    sidebarId: `${uid}-sidebar`,
    mainId: `${uid}-main`,
  }

  return (
    <ShellContext.Provider value={shell}>
      <div
        data-slot="app-shell"
        className={cn('flex h-dvh flex-col overflow-hidden bg-cloth text-ink', className)}
        {...props}
      >
        {/* In a landmark of its own, so it is not the one piece of the page
            outside every region — axe's `region` rule, and a screen reader's
            landmark list, both treat a stray link as lost content. */}
        <nav aria-label="Skip links" className="contents">
          <a
            href={`#${shell.mainId}`}
            className={cn(
              'sr-only z-(--z-overlay) bg-ink px-3 py-2 text-sm font-semibold text-on-ink',
              'focus:not-sr-only focus:fixed focus:top-2 focus:inset-s-2',
            )}
          >
            Skip to content
          </a>
        </nav>
        {topbar}
        <div className="flex min-h-0 flex-1">
          <aside
            id={shell.sidebarId}
            data-collapsed={collapsed || undefined}
            className={cn(
              'hidden shrink-0 flex-col overflow-hidden bg-cloth-pale nav:flex',
              'rule-e',
              // A layout transition kept on purpose: the content takes the
              // room the rail gives up, and that is what collapsing means.
              // Measured, it lays out in about a millisecond a frame; the
              // 57 ms of style work the collapse used to cost was a table
              // beside it restyling every cell on each frame (see Table).
              // `contain: layout` on the rail, the audit's suggestion,
              // changed nothing measurable, because the cost is <main>
              // reflowing, which containment on the rail cannot stop.
              'w-60 transition-[width] duration-(--motion-base) data-collapsed:w-14',
            )}
          >
            <SidebarContext.Provider value={{ collapsed, onNavigate: () => {} }}>{sidebar}</SidebarContext.Provider>
          </aside>
          <main id={shell.mainId} tabIndex={-1} className="min-w-0 flex-1 overflow-auto scroll-cloth focus:shadow-none">
            {children}
          </main>
        </div>

        <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop
              className={cn(
                'fixed inset-0 z-(--z-shell) bg-backdrop nav:hidden',
                'transition-opacity duration-(--motion-base) data-ending-style:opacity-0 data-starting-style:opacity-0',
              )}
            />
            <DialogPrimitive.Popup
              className={cn(
                'fixed inset-y-0 inset-s-0 z-(--z-shell) flex w-72 max-w-[85vw] flex-col bg-cloth-pale text-ink nav:hidden',
                'shadow-overlay',
                'transition-transform duration-(--motion-base)',
                'data-ending-style:-translate-x-full data-starting-style:-translate-x-full',
                'rtl:data-ending-style:translate-x-full rtl:data-starting-style:translate-x-full',
              )}
            >
              {/* A header the height of the topbar, so the sheet's first row lines
                  up with the bar it slid over, and a visible close: Escape and a
                  backdrop tap are both invisible affordances on a phone. */}
              <div className="flex h-12 shrink-0 items-center justify-between pe-2 ps-5 cut-b">
                <DialogPrimitive.Title className="m-0 rotulo text-ink-2">Navigation</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  render={
                    <IconButton label="Close navigation" variant="ghost" size="sm">
                      <X />
                    </IconButton>
                  }
                />
              </div>
              <SidebarContext.Provider value={{ collapsed: false, onNavigate: () => setMobileOpen(false) }}>
                {sidebar}
              </SidebarContext.Provider>
            </DialogPrimitive.Popup>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </ShellContext.Provider>
  )
}

export type SidebarToggleProps = Omit<React.ComponentProps<'span'>, 'children'>

/**
 * The control that collapses the sidebar on desktop and opens the sheet on
 * mobile. Two buttons, one shown per breakpoint, rather than one button that
 * asks `matchMedia` what it is: CSS decides which exists, so the server render
 * is already right and nothing flickers on hydration.
 *
 * The two sit in one `<span>` (`data-slot="sidebar-toggle"`), which takes
 * `className`, `ref` and the rest of the DOM props: there is one element to
 * place, measure or test, whichever button the breakpoint shows.
 */
export function SidebarToggle({ className, ...props }: SidebarToggleProps) {
  const shell = React.useContext(ShellContext)
  if (!shell) return null
  return (
    <span {...props} data-slot="sidebar-toggle" className={cn('inline-flex', className)}>
      <IconButton
        variant="ghost"
        size="sm"
        label={shell.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-controls={shell.sidebarId}
        aria-expanded={!shell.collapsed}
        onClick={() => shell.setCollapsed(!shell.collapsed)}
        className="hidden nav:inline-flex"
      >
        {shell.collapsed ? <PanelLeftOpen className="flip-rtl" /> : <PanelLeftClose className="flip-rtl" />}
      </IconButton>
      <IconButton
        variant="ghost"
        size="sm"
        label="Open navigation"
        onClick={() => shell.setMobileOpen(true)}
        className="nav:hidden"
      >
        <Menu />
      </IconButton>
    </span>
  )
}

export interface TopbarProps extends Omit<React.ComponentProps<'header'>, 'children'> {
  /** The product mark or switcher. */
  start?: React.ReactNode
  /** Search, or a command-palette trigger. Centred in the free space. */
  center?: React.ReactNode
  /** Notifications, help, the signed-in user. */
  end?: React.ReactNode
}

/**
 * The bar across the top. Raised cloth bounded by one ink rule — the single
 * structural edge in the frame; the sidebar's edge is a quiet keyline, so the
 * eye reads one horizontal plane over the work rather than a box around it.
 *
 * Inside an AppShell it carries the sidebar toggle itself, so a shell cannot
 * be assembled without one on mobile.
 */
export function Topbar({ start, center, end, className, ...props }: TopbarProps) {
  return (
    <header
      data-slot="topbar"
      className={cn(
        'relative z-(--z-sticky) flex h-12 shrink-0 items-center gap-2 bg-cloth-pale px-2 sm:gap-3 sm:px-3',
        'cut-b',
        className,
      )}
      {...props}
    >
      <SidebarToggle />
      {start ? <div className="flex min-w-0 shrink-0 items-center gap-2">{start}</div> : null}
      <div className="flex min-w-0 flex-1 justify-center">{center}</div>
      {end ? <div className="flex shrink-0 items-center gap-1.5">{end}</div> : null}
    </header>
  )
}
