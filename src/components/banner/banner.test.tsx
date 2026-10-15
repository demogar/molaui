import { render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AppShell, Topbar } from '../app-shell'
import { Banner } from './banner'

describe('Banner', () => {
  it('is a landmark named Announcement, or its label', () => {
    const { rerender } = render(<Banner title="Scheduled maintenance">Saturday, 02:00 UTC.</Banner>)
    expect(screen.getByRole('region', { name: 'Announcement' })).toHaveTextContent('Scheduled maintenance')
    rerender(<Banner label="Maintenance">Saturday, 02:00 UTC.</Banner>)
    expect(screen.getByRole('region', { name: 'Maintenance' })).toBeInTheDocument()
  })

  it('says its tone in words before the message, so the tone is not colour alone', () => {
    render(
      <Banner tone="danger" title="Payment failed">
        Agents stop on 21 October.
      </Banner>,
    )
    expect(screen.getByRole('region')).toHaveTextContent(/^Error: Payment failed/)
    expect(screen.getByRole('region')).toHaveAttribute('data-tone', 'danger')
  })

  it('is quiet by default: no live region', () => {
    render(<Banner>Read-only workspace.</Banner>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('with announce, fills a status region that mounted empty, once', async () => {
    render(
      <Banner tone="danger" title="Connection lost" announce>
        Changes are kept on this device.
      </Banner>,
    )
    const status = screen.getByRole('status')
    // Empty on mount: a region that mounts with its text is never announced.
    expect(status).toBeEmptyDOMElement()
    await waitFor(() => expect(status).toHaveTextContent('Error: Connection lost Changes are kept on this device.'))
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('reaches its action and Dismiss with Tab, and runs them with Enter and Space', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    const onAction = vi.fn()
    render(
      <Banner
        title="Payment failed"
        onDismiss={onDismiss}
        action={
          <button type="button" onClick={onAction}>
            Update card
          </button>
        }
      >
        Agents stop on 21 October.
      </Banner>,
    )
    await user.tab()
    expect(screen.getByRole('button', { name: 'Update card' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onAction).toHaveBeenCalledOnce()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveFocus()
    await user.keyboard(' ')
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('sits in the AppShell banner slot after the skip link and before the top bar', () => {
    render(
      <AppShell banner={<Banner>Maintenance tonight.</Banner>} topbar={<Topbar />} sidebar={null}>
        Work
      </AppShell>,
    )
    const skip = screen.getByRole('link', { name: 'Skip to content' })
    const banner = screen.getByRole('region', { name: 'Announcement' })
    const bar = screen.getByRole('banner')
    expect(skip.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(banner.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
