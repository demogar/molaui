import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '../button'
import { Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuTrigger } from './menu'

describe('Menu', () => {
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
