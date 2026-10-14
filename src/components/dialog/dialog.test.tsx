import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
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
  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('opens from its trigger with %s and stays open', async (_name, key) => {
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    trigger.focus()
    await userEvent.keyboard(key)
    const dialog = await screen.findByRole('dialog', { name: 'Rename' })
    // Past the keystroke, so a popup that opened and was dismissed by the same key would show.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(dialog).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

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

  it('passes finalFocus through to Base UI, so focus can return somewhere other than the trigger', async () => {
    function Elsewhere() {
      const target = React.useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={target}>Next row</button>
          <Dialog>
            <DialogTrigger render={<Button>Open</Button>} />
            <DialogContent title="Rename" finalFocus={target} />
          </Dialog>
        </>
      )
    }
    render(<Elsewhere />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next row' })).toHaveFocus())
  })

  it('always renders a named close button', async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('AlertDialog', () => {
  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('opens from its trigger with %s and stays open', async (_name, key) => {
    render(
      <AlertDialog
        trigger={<Button>Delete run</Button>}
        title="Delete?"
        description="Gone for good"
        confirmLabel="Delete"
        onConfirm={() => {}}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Delete run' })
    trigger.focus()
    await userEvent.keyboard(key)
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete?' })
    // Past the keystroke, so a popup that opened and was dismissed by the same key would show.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(dialog).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

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

  it('shows an error as one alert, over the buttons, describing the confirm but not the dialog', async () => {
    render(
      <AlertDialog
        defaultOpen
        title="Delete?"
        description="Gone for good"
        confirmLabel="Delete"
        error="Not deleted. The server didn’t answer."
        onConfirm={() => {}}
      />,
    )
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete?' })
    expect(within(dialog).getAllByRole('alert')).toHaveLength(1)
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Not deleted. The server didn’t answer.')
    expect(dialog).toHaveAccessibleDescription('Gone for good')
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toHaveAccessibleDescription(
      'Not deleted. The server didn’t answer.',
    )
  })

  it('hides the error while a retry is pending, so a repeated failure is announced again', async () => {
    let reject: (reason: Error) => void = () => {}
    const onConfirm = vi.fn(() => new Promise<void>((_, r) => (reject = r)))
    render(
      <AlertDialog defaultOpen title="Delete?" description="x" confirmLabel="Delete" error="Not deleted." onConfirm={onConfirm} />,
    )
    const dialog = await screen.findByRole('alertdialog')
    const first = within(dialog).getByRole('alert')
    const confirm = within(dialog).getByRole('button', { name: 'Delete' })
    confirm.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument())
    expect(confirm).not.toHaveAttribute('aria-describedby')
    reject(new Error('again'))
    const second = await within(dialog).findByRole('alert')
    expect(second).not.toBe(first)
    expect(confirm).toHaveFocus()
  })

  it('returns focus to the trigger by default, and to finalFocus when given', async () => {
    function Example({ moveFocus }: { moveFocus: boolean }) {
      const next = React.useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={next}>Next row</button>
          <AlertDialog
            trigger={<Button>Delete row</Button>}
            title="Delete?"
            description="x"
            confirmLabel="Delete"
            onConfirm={() => Promise.resolve()}
            finalFocus={moveFocus ? next : undefined}
          />
        </>
      )
    }
    const { unmount } = render(<Example moveFocus={false} />)
    const trigger = screen.getByRole('button', { name: 'Delete row' })
    trigger.focus()
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('alertdialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
    unmount()

    render(<Example moveFocus />)
    screen.getByRole('button', { name: 'Delete row' }).focus()
    await userEvent.keyboard('{Enter}')
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next row' })).toHaveFocus())
  })
})
