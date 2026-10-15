import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

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
