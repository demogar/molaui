import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '../button'
import { AlertDialog, Dialog, DialogClose, DialogContent, DialogTrigger } from './dialog'

function Example() {
  return (
    <Dialog>
      <DialogTrigger render={<Button>Open</Button>} />
      <DialogContent title="Rename" description="Pick a name" footer={<DialogClose render={<Button>Save</Button>} />}>
        <input aria-label="Name" />
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('opens from its trigger, named by its title and described by its description', async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = await screen.findByRole('dialog', { name: 'Rename' })
    expect(dialog).toHaveAccessibleDescription('Pick a name')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await userEvent.click(trigger)
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('always renders a named close button', async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('AlertDialog', () => {
  it('is an alertdialog that focuses Cancel first', async () => {
    render(
      <AlertDialog defaultOpen title="Delete?" description="Gone for good" confirmLabel="Delete" onConfirm={() => {}} />,
    )
    await screen.findByRole('alertdialog', { name: 'Delete?' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus())
  })

  it('stays disarmed until the confirmation text is typed exactly', async () => {
    const onConfirm = vi.fn()
    render(
      <AlertDialog
        defaultOpen
        title="Purge?"
        description="Irreversible"
        confirmLabel="Purge"
        confirmationText="kb-prod"
        onConfirm={onConfirm}
      />,
    )
    const confirm = await screen.findByRole('button', { name: 'Purge' })
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox'), 'kb-pro')
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox'), 'd')
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('stays open when an async confirm rejects', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('nope'))
    render(<AlertDialog defaultOpen title="Delete?" description="x" confirmLabel="Delete" onConfirm={onConfirm} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
