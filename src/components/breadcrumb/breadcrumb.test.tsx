import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
})

describe('middleTruncate', () => {
  it('keeps both ends', () => {
    expect(middleTruncate('run_8f3a2b91c21e', 11)).toBe('run_8…1c21e')
  })
  it('leaves short text alone', () => {
    expect(middleTruncate('run_1')).toBe('run_1')
  })
})
