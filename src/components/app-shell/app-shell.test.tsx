import { render, screen } from '@testing-library/react'
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
