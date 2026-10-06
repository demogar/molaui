import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { type CommandGroup, CommandPalette, filterCommands, useCommandShortcut } from './command'

const make = (onSelect: () => void = vi.fn()): CommandGroup[] => [
  {
    heading: 'Actions',
    items: [
      { id: 'run', label: 'Start a new run', keywords: ['execute'], onSelect },
      { id: 'purge', label: 'Purge index', disabled: true, onSelect },
      { id: 'theme', label: 'Toggle theme', onSelect },
    ],
  },
  { heading: 'Go to', items: [{ id: 'settings', label: 'Settings', onSelect }] },
]

describe('filterCommands', () => {
  it('matches every word across label and keywords', () => {
    const result = filterCommands(make(), 'new execute')
    expect(result.flatMap((g) => g.items.map((i) => i.id))).toEqual(['run'])
  })
  it('drops empty groups', () => {
    expect(filterCommands(make(), 'settings').map((g) => g.heading)).toEqual(['Go to'])
  })
  it('ranks label-prefix matches first', () => {
    const groups: CommandGroup[] = [
      { heading: 'x', items: [{ id: 'a', label: 'Open theme', onSelect() {} }, { id: 'b', label: 'Theme', onSelect() {} }] },
    ]
    expect(filterCommands(groups, 'theme')[0]!.items.map((i) => i.id)).toEqual(['b', 'a'])
  })
})

function Harness({ onSelect }: { onSelect: () => void }) {
  const [open, setOpen] = useState(true)
  return <CommandPalette open={open} onOpenChange={setOpen} groups={make(onSelect)} />
}

describe('CommandPalette', () => {
  it('wires the combobox to the listbox and highlights the first match', async () => {
    render(<Harness onSelect={() => {}} />)
    const input = await screen.findByRole('combobox')
    const listbox = screen.getByRole('listbox')
    expect(input).toHaveAttribute('aria-controls', listbox.id)
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Start a new run' }).id)
  })

  it('skips disabled options with the arrow keys, wraps, and selects with Enter', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Toggle theme' }).id)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Start a new run' }).id)
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument())
  })

  it('filters as you type and shows an empty state', async () => {
    render(<Harness onSelect={() => {}} />)
    const input = await screen.findByRole('combobox')
    await userEvent.type(input, 'sett')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await userEvent.type(input, 'zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument()
  })
})

describe('useCommandShortcut', () => {
  function Probe({ onTrigger }: { onTrigger: () => void }) {
    useCommandShortcut(onTrigger)
    return null
  }
  it('fires on Ctrl-K and ⌘K', async () => {
    const onTrigger = vi.fn()
    render(<Probe onTrigger={onTrigger} />)
    await userEvent.keyboard('{Control>}k{/Control}')
    await userEvent.keyboard('{Meta>}k{/Meta}')
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })
})
