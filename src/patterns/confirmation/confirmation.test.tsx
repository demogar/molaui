import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '../../components/toast'
import { ApiKeysScreen, type ApiKeysScreenProps } from './confirmation'

const setup = (props: ApiKeysScreenProps = {}) => {
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <ApiKeysScreen {...props} />
    </ToastProvider>,
  )
  return user
}

// `hidden`, because a modal makes the page behind it inert, rows included.
const rowOf = (name: string) => screen.getByRole('row', { name: new RegExp(`^${name}`), hidden: true })

describe('ApiKeysScreen', () => {
  it('lists keys with their state in words; a revoked key’s button stays, disabled but focusable', () => {
    setup()
    expect(screen.getByRole('table', { name: '3 active keys' })).toBeInTheDocument()
    expect(within(rowOf('Quarterly export')).getByText('Revoked')).toBeInTheDocument()
    const revoked = screen.getByRole('button', { name: 'Revoke Quarterly export' })
    expect(revoked).toHaveAttribute('aria-disabled', 'true')
    revoked.focus()
    expect(revoked).toHaveFocus()
  })

  it('asks first, with Cancel focused; Escape keeps the key and returns focus to the row', async () => {
    const revoke = vi.fn(() => Promise.resolve())
    const user = setup({ revoke })
    const button = screen.getByRole('button', { name: 'Revoke Staging tests' })
    button.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('alertdialog', { name: 'Revoke Staging tests?' })
    expect(dialog).toHaveAccessibleDescription(/The staging test suite stops working at once/)
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(revoke).not.toHaveBeenCalled()
    await waitFor(() => expect(button).toHaveFocus())
  })

  it('a live key arms only once its name is typed, then revokes and says so', async () => {
    const revoke = vi.fn(() => Promise.resolve())
    const user = setup({ revoke })
    await user.click(screen.getByRole('button', { name: 'Revoke Support widget' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Revoke Support widget?' })
    const confirm = within(dialog).getByRole('button', { name: 'Revoke key' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByRole('textbox'), 'Support widget{Enter}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(revoke).toHaveBeenCalledWith(expect.objectContaining({ id: 'key_widget' }))
    expect(within(rowOf('Support widget')).getByText('Revoked')).toBeInTheDocument()
    expect(await screen.findByText('Support widget revoked')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '2 active keys' })).toBeInTheDocument()
  })

  it('a failed revoke keeps the dialog open, says why, and the same button tries again', async () => {
    const revoke = vi
      .fn<(key: unknown) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Cayuco didn’t answer within 10 seconds.'))
      .mockResolvedValueOnce()
    const user = setup({ revoke })
    await user.click(screen.getByRole('button', { name: 'Revoke Staging tests' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Revoke key' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Not revoked. Cayuco didn’t answer within 10 seconds.')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(within(rowOf('Staging tests')).getByText('Active')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Revoke key' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(within(rowOf('Staging tests')).getByText('Revoked')).toBeInTheDocument()
  })

  it('a member sees the keys, no action to fail at, and who can act', () => {
    setup({ canRevoke: false })
    expect(screen.queryByRole('button', { name: /^Revoke/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create key' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Only workspace admins can create or revoke keys' })).toHaveTextContent(
      'Ask Ana Ruiz or Kai Morales',
    )
  })

  it('with no keys, says why to make one per service', () => {
    setup({ keys: [] })
    expect(screen.getByRole('heading', { level: 2, name: 'No API keys yet' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
