import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Callout } from './callout'

describe('Callout', () => {
  it('is a region named by its title', () => {
    render(<Callout title="Budget at 86%">Body</Callout>)
    expect(screen.getByRole('region', { name: 'Budget at 86%' })).toHaveTextContent('Body')
  })

  it('is not a landmark when it has no title', () => {
    render(<Callout>Just a note</Callout>)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('renders a dismiss button only when dismissible', async () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<Callout title="x" />)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
    rerender(<Callout title="x" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})

describe('Callout flat', () => {
  it('keeps the region, its name and the heading level', () => {
    render(
      <Callout variant="flat" tone="warn" title="Nobody here will ask for money" headingLevel={2}>
        Report it from the centre’s page.
      </Callout>,
    )
    const region = screen.getByRole('region', { name: 'Nobody here will ask for money' })
    expect(region).toHaveAttribute('data-variant', 'flat')
    expect(screen.getByRole('heading', { level: 2, name: 'Nobody here will ask for money' })).toBeInTheDocument()
  })

  it('draws a swatch in its tone instead of the seam and the icon', () => {
    const { container } = render(<Callout variant="flat" tone="warn" title="x" />)
    expect(container.querySelector('.relleno')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('[data-slot="swatch"]')).toHaveAttribute('data-tone', 'warn')
  })

  it('does not stretch to the height of its grid row', () => {
    render(<Callout variant="flat" title="x" />)
    expect(screen.getByRole('region').className).toContain('h-fit')
  })

  it('drops the swatch with icon={false}', () => {
    const { container } = render(<Callout variant="flat" title="x" icon={false} />)
    expect(container.querySelector('[data-slot="swatch"]')).toBeNull()
  })

  it('leaves the default callout seamed', () => {
    const { container } = render(<Callout title="x" />)
    expect(container.querySelector('.relleno')).not.toBeNull()
    expect(screen.getByRole('region')).toHaveAttribute('data-variant', 'seam')
  })
})
