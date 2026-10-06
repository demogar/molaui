'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
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
  topbar: React.ReactNode
  sidebar: React.ReactNode
  children: React.ReactNode
  /** Controlled collapse of the desktop sidebar. */
  sidebarCollapsed?: boolean
  defaultSidebarCollapsed?: boolean
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
  const [ownCollapsed, setOwnCollapsed] = React.useState(defaultSidebarCollapsed)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const collapsed = sidebarCollapsed ?? ownCollapsed
  const uid = React.useId()

  const shell: ShellState = {
    collapsed,
    setCollapsed: (next) => {
      if (sidebarCollapsed === undefined) setOwnCollapsed(next)
      onSidebarCollapsedChange?.(next)
    },
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
              'sr-only z-50 bg-ink px-3 py-2 text-sm font-semibold text-on-ink',
              'focus:not-sr-only focus:fixed focus:top-2 focus:left-2',
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
              'shadow-[inset_-1px_0_0_var(--keyline)]',
              'w-60 transition-[width] duration-(--motion-base) ease-cut data-collapsed:w-14',
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
                'fixed inset-0 z-40 bg-backdrop nav:hidden',
                'transition-opacity duration-(--motion-base) ease-cut data-ending-style:opacity-0 data-starting-style:opacity-0',
              )}
            />
            <DialogPrimitive.Popup
              className={cn(
                'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-cloth-pale text-ink nav:hidden',
                'shadow-floating',
                'transition-transform duration-(--motion-base) ease-cut',
                'data-ending-style:-translate-x-full data-starting-style:-translate-x-full',
              )}
            >
              {/* A header the height of the topbar, so the sheet's first row lines
                  up with the bar it slid over, and a visible close: Escape and a
                  backdrop tap are both invisible affordances on a phone. */}
              <div className="flex h-12 shrink-0 items-center justify-between pr-2 pl-5 shadow-[inset_0_-1.5px_0_var(--ink)]">
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

/**
 * The control that collapses the sidebar on desktop and opens the sheet on
 * mobile. Two buttons, one shown per breakpoint, rather than one button that
 * asks `matchMedia` what it is: CSS decides which exists, so the server render
 * is already right and nothing flickers on hydration.
 */
export function SidebarToggle({ className }: { className?: string }) {
  const shell = React.useContext(ShellContext)
  if (!shell) return null
  return (
    <>
      <IconButton
        variant="ghost"
        size="sm"
        label={shell.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-controls={shell.sidebarId}
        aria-expanded={!shell.collapsed}
        onClick={() => shell.setCollapsed(!shell.collapsed)}
        className={cn('hidden nav:inline-flex', className)}
      >
        {shell.collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </IconButton>
      <IconButton
        variant="ghost"
        size="sm"
        label="Open navigation"
        onClick={() => shell.setMobileOpen(true)}
        className={cn('nav:hidden', className)}
      >
        <Menu />
      </IconButton>
    </>
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
        'relative z-10 flex h-12 shrink-0 items-center gap-2 bg-cloth-pale px-2 sm:gap-3 sm:px-3',
        'shadow-[inset_0_-1.5px_0_var(--ink)]',
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
