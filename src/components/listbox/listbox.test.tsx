import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Listbox } from './listbox'

const options = [
  { value: 'pty', label: 'Panama City', description: 'pty-1' },
  { value: 'dav', label: 'David' },
  { value: 'col', label: 'Colón', disabled: true },
  { value: 'san', label: 'Santiago' },
]

const option = (name: string) => screen.getByRole('option', { name })

describe('Listbox', () => {
  it('is a named listbox of options, with the value selected and descriptions wired', () => {
    render(<Listbox aria-label="Region" options={options} defaultValue="dav" />)
    const list = screen.getByRole('listbox', { name: 'Region' })
    expect(list).not.toHaveAttribute('aria-multiselectable')
    expect(option('David')).toHaveAttribute('aria-selected', 'true')
    expect(option('Panama City')).toHaveAttribute('aria-selected', 'false')
    expect(option('Panama City')).toHaveAccessibleDescription('pty-1')
    expect(option('Colón')).toHaveAttribute('aria-disabled', 'true')
  })

  it('single: one tab stop on the value; arrows, Home and End move and choose, skipping no option', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <>
        <Listbox aria-label="Region" options={options} defaultValue="dav" onValueChange={onValueChange} />
        <button type="button">After</button>
      </>,
    )
    await user.tab()
    expect(option('David')).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(option('Panama City')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith('pty')
    await user.keyboard('{End}')
    expect(option('Santiago')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith('san')
    // The disabled option is focusable, and is not chosen.
    await user.keyboard('{ArrowUp}')
    expect(option('Colón')).toHaveFocus()
    expect(onValueChange).toHaveBeenCalledTimes(2)
    expect(option('Santiago')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Home}')
    expect(option('Panama City')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith('pty')
    await user.keyboard('{ArrowDown}')
    expect(option('David')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith('dav')
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(option('David')).toHaveFocus()
  })

  it('single: Space chooses the focused option when nothing is chosen yet', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Listbox aria-label="Region" options={options} onValueChange={onValueChange} />)
    await user.tab()
    expect(option('Panama City')).toHaveFocus()
    expect(onValueChange).not.toHaveBeenCalled()
    await user.keyboard(' ')
    expect(onValueChange).toHaveBeenCalledWith('pty')
  })

  it('multiple: arrows move without choosing, Space toggles', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Listbox aria-label="Region" multiple options={options} onValueChange={onValueChange} />)
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true')
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(option('David')).toHaveFocus()
    expect(onValueChange).not.toHaveBeenCalled()
    await user.keyboard(' ')
    expect(onValueChange).toHaveBeenLastCalledWith(['dav'])
    await user.keyboard('{ArrowUp}[Space]')
    // Reported in the order of the options, not the order chosen.
    expect(onValueChange).toHaveBeenLastCalledWith(['pty', 'dav'])
    await user.keyboard(' ')
    expect(onValueChange).toHaveBeenLastCalledWith(['dav'])
  })

  it('multiple: Shift with an arrow moves and toggles; Shift+Space selects the run from the last chosen', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Listbox aria-label="Region" multiple options={options} onValueChange={onValueChange} />)
    await user.tab()
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(option('David')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith(['dav'])
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(option('Panama City')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith(['pty', 'dav'])

    // Clear David, so the run below has a gap to fill.
    await user.keyboard('{ArrowDown}[Space]{ArrowUp}[Space][Space]')
    expect(onValueChange).toHaveBeenLastCalledWith(['pty'])
    await user.keyboard('{End}')
    expect(option('Santiago')).toHaveFocus()
    await user.keyboard('{Shift>}[Space]{/Shift}')
    // From Panama City, the last chosen, to Santiago, filling David; Colón is disabled.
    expect(onValueChange).toHaveBeenLastCalledWith(['pty', 'dav', 'san'])
  })

  it('multiple: Control+Shift+Home and End select to either end and move there', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Listbox aria-label="Region" multiple options={options} onValueChange={onValueChange} />)
    await user.tab()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Control>}{Shift>}{End}{/Shift}{/Control}')
    expect(option('Santiago')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith(['dav', 'san'])
    await user.keyboard('{Control>}{Shift>}{Home}{/Shift}{/Control}')
    expect(option('Panama City')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith(['pty', 'dav', 'san'])
  })

  it('multiple: Control+A and Meta+A choose every enabled option, then clear them', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Listbox aria-label="Region" multiple options={options} onValueChange={onValueChange} />)
    await user.tab()
    await user.keyboard('{Control>}a{/Control}')
    expect(onValueChange).toHaveBeenLastCalledWith(['pty', 'dav', 'san'])
    await user.keyboard('{Meta>}a{/Meta}')
    expect(onValueChange).toHaveBeenLastCalledWith([])
  })

  it('moves by type-ahead, and a repeated letter cycles', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const many = [...options, { value: 'dar', label: 'Darién' }]
    render(<Listbox aria-label="Region" options={many} onValueChange={onValueChange} />)
    await user.tab()
    await user.keyboard('s')
    expect(option('Santiago')).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith('san')
    const pause = () => new Promise((resolve) => setTimeout(resolve, 600))
    await pause()
    await user.keyboard('d')
    expect(option('Darién')).toHaveFocus()
    await pause()
    await user.keyboard('d')
    expect(option('David')).toHaveFocus()
    // Letters typed together are one word: "dar" passes David.
    await pause()
    await user.keyboard('dar')
    expect(option('Darién')).toHaveFocus()
  })

  it('a click chooses in a single list, toggles in a multiple one, and Shift+click extends', async () => {
    const user = userEvent.setup()
    const single = vi.fn()
    const { unmount } = render(<Listbox aria-label="Region" options={options} onValueChange={single} />)
    await user.click(option('Santiago'))
    expect(single).toHaveBeenLastCalledWith('san')
    expect(option('Santiago')).toHaveFocus()
    await user.click(option('Colón'))
    expect(single).toHaveBeenCalledTimes(1)
    unmount()

    const multi = vi.fn()
    render(<Listbox aria-label="Region" multiple options={options} onValueChange={multi} />)
    await user.click(option('Panama City'))
    expect(multi).toHaveBeenLastCalledWith(['pty'])
    await user.keyboard('{Shift>}')
    await user.click(option('Santiago'))
    await user.keyboard('{/Shift}')
    expect(multi).toHaveBeenLastCalledWith(['pty', 'dav', 'san'])
    await user.click(option('David'))
    expect(multi).toHaveBeenLastCalledWith(['pty', 'san'])
  })

  it('controlled: shows the value it is given and reports changes only', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Listbox aria-label="Region" options={options} value="pty" onValueChange={onValueChange} />)
    await user.click(option('David'))
    expect(onValueChange).toHaveBeenCalledWith('dav')
    // The parent did not accept it.
    expect(option('Panama City')).toHaveAttribute('aria-selected', 'true')
  })

  it('a disabled list leaves the tab order and chooses nothing', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <>
        <Listbox aria-label="Region" options={options} defaultValue="pty" disabled onValueChange={onValueChange} />
        <button type="button">After</button>
      </>,
    )
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-disabled', 'true')
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    await user.click(option('David'))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps the consumer’s key handler alongside its own', async () => {
    const user = userEvent.setup()
    const onKeyDown = vi.fn()
    render(<Listbox aria-label="Region" options={options} onKeyDown={onKeyDown} />)
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(onKeyDown).toHaveBeenCalled()
    expect(option('David')).toHaveFocus()
  })
})
