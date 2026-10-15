import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Breadcrumb, middleTruncate } from './breadcrumb'

describe('Breadcrumb', () => {
  it('is a named nav whose last item is the current page, not a link', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Agents', href: '/agents' },
          { label: 'Run #1', href: '/runs/1' },
        ]}
      />,
    )
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Agents' })).toHaveAttribute('href', '/agents')
    expect(screen.queryByRole('link', { name: 'Run #1' })).not.toBeInTheDocument()
    expect(screen.getByText('Run #1')).toHaveAttribute('aria-current', 'page')
  })

  it('uses renderLink for router links', () => {
    render(
      <Breadcrumb
        items={[{ label: 'Home', href: '/' }, { label: 'Here' }]}
        renderLink={({ href, className, children }) => (
          <a data-router href={href} className={className}>
            {children}
          </a>
        )}
      />,
    )
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('data-router')
  })

  it('moves through the links with Tab and follows the focused one with Enter', async () => {
    const follow = vi.fn()
    render(
      <Breadcrumb
        items={[{ label: 'Agents', href: '/agents' }, { label: 'Runs', href: '/runs' }, { label: 'Run #1' }]}
        renderLink={({ href, className, children }) => (
          <a
            href={href}
            className={className}
            onClick={(event) => {
              // jsdom does not navigate; record where the link would go.
              event.preventDefault()
              follow(href)
            }}
          >
            {children}
          </a>
        )}
      />,
    )
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Agents' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Runs' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(follow).toHaveBeenCalledWith('/runs')
  })
})

describe('middleTruncate', () => {
  it('keeps both ends', () => {
    expect(middleTruncate('run_8f3a2b91c21e', 11)).toBe('run_8…1c21e')
  })
  it('leaves short text alone', () => {
    expect(middleTruncate('run_1')).toBe('run_1')
  })
})
