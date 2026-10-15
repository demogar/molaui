import { render, screen, waitFor, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AppShell, Topbar } from './app-shell'
import { PageHeader } from './page-header'
import { NavItem, NavSection, Sidebar } from './sidebar'

function Shell(props: { defaultSidebarCollapsed?: boolean }) {
  return (
    <AppShell
      {...props}
      topbar={<Topbar start={<span>Cayuco</span>} />}
      sidebar={
        <Sidebar label="Main">
          <NavSection title="Platform">
            <NavItem href="#runs" active count={3} countLabel="failed" icon={<svg />}>
              Runs
            </NavItem>
            <NavItem href="#agents" icon={<svg />}>
              Agents
            </NavItem>
          </NavSection>
        </Sidebar>
      }
    >
      <p>Work</p>
    </AppShell>
  )
}

describe('AppShell', () => {
  it('has a banner, a named navigation and a main region, with a skip link to main', () => {
    render(<Shell />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', `#${main.id}`)
  })

  it('marks the active item as the current page and reads its count with words', () => {
    render(<Shell />)
    const runs = screen.getByRole('link', { name: /Runs/ })
    expect(runs).toHaveAttribute('aria-current', 'page')
    expect(runs).toHaveAccessibleName('Runs, 3 failed')
  })

  it('collapses the sidebar, keeping labels for screen readers', async () => {
    render(<Shell />)
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Agents')).toHaveClass('sr-only')
    expect(screen.getByRole('link', { name: /Agents/ })).toHaveAttribute('title', 'Agents')
  })

  it('opens the navigation sheet on mobile and closes it on navigate', async () => {
    render(<Shell />)
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    const sheet = await screen.findByRole('dialog', { name: 'Navigation' })
    const agents = Array.from(sheet.querySelectorAll('a')).find((a) => a.textContent?.includes('Agents'))!
    await userEvent.click(agents)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('AppShell keyboard', () => {
  it('starts with the skip link, which Enter follows to the main region', async () => {
    render(<Shell />)
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(window.location.hash).toBe(`#${screen.getByRole('main').id}`)
  })

  it('toggles the sidebar with Enter and Space, then reaches the navigation links, which Enter follows', async () => {
    render(<Shell />)
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute('aria-expanded', 'true')
    // The narrow-screen sheet button is next in the DOM; CSS hides one of the two.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveFocus()
    await userEvent.tab()
    await userEvent.tab()
    const agents = screen.getByRole('link', { name: 'Agents' })
    expect(agents).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(window.location.hash).toBe('#agents')
  })

  it('opens the navigation sheet from the keyboard, and Escape closes it and returns focus', async () => {
    render(<Shell />)
    const open = screen.getByRole('button', { name: 'Open navigation' })
    open.focus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(open).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  it('renders the title as the page heading and meta as a list', () => {
    render(<PageHeader title="Runs" meta={['Live', 'Updated 12s ago']} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Runs' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('AppShell sheet', () => {
  it('has a visible close button', async () => {
    render(<Shell />)
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Close navigation' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

/**
 * The shape of React Router's and Next's `<Link>`: it takes `to`, renders an
 * anchor, and turns a plain click into a client-side navigation by
 * preventing the browser's.
 */
function RouterLink({
  to,
  navigate,
  onClick,
  ...props
}: React.ComponentProps<'a'> & { to: string; navigate: (to: string) => void }) {
  return (
    <a
      {...props}
      href={to}
      onClick={(event) => {
        onClick?.(event)
        event.preventDefault()
        navigate(to)
      }}
    />
  )
}

describe('NavItem with a router link', () => {
  it('renders the router link with the item classes, current page and ref, and routes without a document load', async () => {
    const navigate = vi.fn()
    const onClick = vi.fn()
    const ref = React.createRef<HTMLAnchorElement>()
    render(
      <Sidebar label="Main">
        <NavSection title="Platform">
          <NavItem render={<RouterLink to="/runs" navigate={navigate} />} active ref={ref} onClick={onClick} data-testid="runs">
            Runs
          </NavItem>
        </NavSection>
      </Sidebar>,
    )
    const link = screen.getByRole('link', { name: 'Runs' })
    expect(link).toHaveAttribute('href', '/runs')
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link).toHaveAttribute('data-slot', 'nav-item')
    expect(link).toHaveAttribute('data-testid', 'runs')
    expect(link.className).toContain('aria-[current=page]:bg-ink-soft')
    expect(ref.current).toBe(link)

    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/runs')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('still closes the mobile sheet after a routed click', async () => {
    const navigate = vi.fn()
    const user = userEvent.setup()
    render(
      <AppShell
        topbar={<Topbar start={<span>Cayuco</span>} />}
        sidebar={
          <Sidebar label="Main">
            <NavItem render={<RouterLink to="/agents" navigate={navigate} />}>Agents</NavItem>
          </Sidebar>
        }
      >
        <p>Work</p>
      </AppShell>,
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('link', { name: 'Agents' }))
    expect(navigate).toHaveBeenCalledWith('/agents')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
