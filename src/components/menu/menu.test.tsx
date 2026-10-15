import { render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '../button'
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuTrigger,
} from './menu'

describe('Menu', () => {
  // The keys are written out, not passed in, so the keyboard-table gate
  // (src/docs/usage/keyboard-coverage.ts) can see that each is pressed.
  it.each(['Enter', 'Space', 'ArrowDown'])('opens from its trigger with %s and stays open', async (key) => {
    render(
      <Menu>
        <MenuTrigger render={<Button>Actions</Button>} />
        <MenuContent>
          <MenuItem>Rename</MenuItem>
        </MenuContent>
      </Menu>,
    )
    const trigger = screen.getByRole('button', { name: 'Actions' })
    trigger.focus()
    if (key === 'Enter') await userEvent.keyboard('{Enter}')
    else if (key === 'Space') await userEvent.keyboard(' ')
    else await userEvent.keyboard('{ArrowDown}')
    const menu = await screen.findByRole('menu')
    // Past the keystroke, so a popup that opened and was dismissed by the same key would show.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(menu).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens from the keyboard and moves through items with the arrow keys', async () => {
    const onRename = vi.fn()
    render(
      <Menu>
        <MenuTrigger render={<Button>Actions</Button>} />
        <MenuContent>
          <MenuItem onClick={onRename}>Rename</MenuItem>
          <MenuItem tone="danger">Delete</MenuItem>
        </MenuContent>
      </Menu>,
    )
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('menu')
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus())
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}{Enter}')
    expect(onRename).toHaveBeenCalledOnce()
  })

  it('renders shortcuts beside the label without changing its name', async () => {
    render(
      <Menu defaultOpen>
        <MenuTrigger render={<Button>Actions</Button>} />
        <MenuContent>
          <MenuItem shortcut="⌘D">Duplicate</MenuItem>
        </MenuContent>
      </Menu>,
    )
    expect(await screen.findByRole('menuitem', { name: /Duplicate/ })).toHaveTextContent('⌘D')
  })

  it('keeps the menu open while toggling checkbox items', async () => {
    const onChange = vi.fn()
    render(
      <Menu defaultOpen>
        <MenuTrigger render={<Button>View</Button>} />
        <MenuContent>
          <MenuCheckboxItem onCheckedChange={onChange}>Cost</MenuCheckboxItem>
        </MenuContent>
      </Menu>,
    )
    const item = await screen.findByRole('menuitemcheckbox', { name: 'Cost' })
    await userEvent.click(item)
    expect(onChange).toHaveBeenCalledWith(true, expect.anything())
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(item).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Menu keyboard', () => {
  function Actions({ onDuplicate = () => {} }: { onDuplicate?: () => void }) {
    return (
      <Menu>
        <MenuTrigger render={<Button>Actions</Button>} />
        <MenuContent>
          <MenuItem>Rename</MenuItem>
          <MenuItem onClick={onDuplicate}>Duplicate</MenuItem>
          <MenuCheckboxItem>Pin</MenuCheckboxItem>
          <MenuSubmenu>
            <MenuSubmenuTrigger>Move to</MenuSubmenuTrigger>
            <MenuContent>
              <MenuItem>Archive</MenuItem>
              <MenuItem>Backlog</MenuItem>
            </MenuContent>
          </MenuSubmenu>
        </MenuContent>
      </Menu>
    )
  }

  async function open() {
    const user = userEvent.setup()
    render(<Actions />)
    await user.tab()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus())
    return user
  }

  it('moves to the last item with End and the first with Home', async () => {
    const user = await open()
    await user.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Move to' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus()
  })

  it('runs the focused item with Space, and toggles a checkbox item with Space', async () => {
    const user = userEvent.setup()
    const onDuplicate = vi.fn()
    render(<Actions onDuplicate={onDuplicate} />)
    await user.tab()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus())
    await user.keyboard('{ArrowDown}{ArrowDown}')
    const pin = screen.getByRole('menuitemcheckbox', { name: 'Pin' })
    expect(pin).toHaveFocus()
    await user.keyboard(' ')
    expect(pin).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowUp}')
    await user.keyboard(' ')
    expect(onDuplicate).toHaveBeenCalledOnce()
  })

  it('opens a submenu with ArrowRight and closes it with ArrowLeft', async () => {
    const user = await open()
    await user.keyboard('{End}')
    const parent = screen.getByRole('menuitem', { name: 'Move to' })
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveFocus())
    expect(parent).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Archive' })).not.toBeInTheDocument())
    expect(parent).toHaveFocus()
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = await open()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus()
  })
})
