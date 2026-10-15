import { render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

describe('Popover', () => {
  it.each([
    ['Enter', () => userEvent.keyboard('{Enter}')],
    ['Space', () => userEvent.keyboard(' ')],
  ])('opens from its trigger with %s and stays open', async (_name, press) => {
    render(
      <Popover>
        <PopoverTrigger render={<Button>Status</Button>} />
        <PopoverContent title="Filter by status">
          <input aria-label="Running" type="checkbox" />
        </PopoverContent>
      </Popover>,
    )
    const trigger = screen.getByRole('button', { name: 'Status' })
    trigger.focus()
    await press()
    const dialog = await screen.findByRole('dialog', { name: 'Filter by status' })
    // Past the keystroke, so a popup that opened and was dismissed by the same key would show.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(dialog).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens from its trigger, is named by its title, and closes on Escape', async () => {
    render(
      <Popover>
        <PopoverTrigger render={<Button>Status</Button>} />
        <PopoverContent title="Filter by status">
          <input aria-label="Running" type="checkbox" />
        </PopoverContent>
      </Popover>,
    )
    const trigger = screen.getByRole('button', { name: 'Status' })
    await userEvent.click(trigger)
    expect(await screen.findByRole('dialog', { name: 'Filter by status' })).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('moves focus into the popover, tabs through its controls, then on to the page after the trigger', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Popover>
          <PopoverTrigger render={<Button>Status</Button>} />
          <PopoverContent title="Filter by status">
            <input aria-label="Running" type="checkbox" />
            <input aria-label="Failed" type="checkbox" />
          </PopoverContent>
        </Popover>
        <button type="button">After</button>
      </>,
    )
    screen.getByRole('button', { name: 'Status' }).focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Filter by status' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    screen.getByRole('checkbox', { name: 'Running' }).focus()
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Failed' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })
})
