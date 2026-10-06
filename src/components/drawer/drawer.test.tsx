import { DirectionProvider } from '@base-ui/react/direction-provider'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Button } from '../button'
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger, type DrawerSide } from './drawer'

function Example({ side, defaultOpen }: { side?: DrawerSide; defaultOpen?: boolean }) {
  return (
    <Drawer side={side} defaultOpen={defaultOpen}>
      <DrawerTrigger render={<Button>Open details</Button>} />
      <DrawerContent
        title="Run details"
        description="run_5a61c5 · Support triage"
        footer={<DrawerClose render={<Button>Done</Button>} />}
      >
        <input aria-label="Note" />
      </DrawerContent>
    </Drawer>
  )
}

describe('Drawer', () => {
  it('opens from its trigger, named by its title and described by its description', async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole('button', { name: 'Open details' }))
    const drawer = await screen.findByRole('dialog', { name: 'Run details' })
    expect(drawer).toHaveAccessibleDescription('run_5a61c5 · Support triage')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open details' })
    await userEvent.click(trigger)
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('traps Tab inside the drawer', async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole('button', { name: 'Open details' }))
    const drawer = await screen.findByRole('dialog')
    await waitFor(() => expect(drawer).toContainElement(document.activeElement as HTMLElement))
    for (let i = 0; i < 6; i++) {
      await userEvent.tab()
      // Base UI's focus guards hand focus back into the popup on the next tick.
      await waitFor(() => expect(drawer).toContainElement(document.activeElement as HTMLElement))
    }
    for (let i = 0; i < 6; i++) {
      await userEvent.tab({ shift: true })
      await waitFor(() => expect(drawer).toContainElement(document.activeElement as HTMLElement))
    }
  })

  it('always renders a named close button that closes it', async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole('button', { name: 'Open details' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('renders the footer, and a close inside it works', async () => {
    render(<Example defaultOpen />)
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('omits the close button only when asked', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent title="Quick actions" hideClose footer={<DrawerClose render={<Button>Cancel</Button>} />} />
      </Drawer>,
    )
    await screen.findByRole('dialog', { name: 'Quick actions' })
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it.each([
    ['start', 'left'],
    ['end', 'right'],
    ['bottom', 'down'],
  ] as const)('side %s sets data-side and swipes %s in left-to-right', async (side, swipe) => {
    render(<Example side={side} defaultOpen />)
    const drawer = await screen.findByRole('dialog')
    expect(drawer).toHaveAttribute('data-side', side)
    expect(drawer).toHaveAttribute('data-swipe-direction', swipe)
  })

  it('defaults to the end side', async () => {
    render(<Example defaultOpen />)
    expect(await screen.findByRole('dialog')).toHaveAttribute('data-side', 'end')
  })

  it.each([
    ['start', 'right'],
    ['end', 'left'],
    ['bottom', 'down'],
  ] as const)('in right-to-left, side %s swipes %s', async (side, swipe) => {
    render(
      <DirectionProvider direction="rtl">
        <Example side={side} defaultOpen />
      </DirectionProvider>,
    )
    expect(await screen.findByRole('dialog')).toHaveAttribute('data-swipe-direction', swipe)
  })
})
