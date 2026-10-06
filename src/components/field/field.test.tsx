import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Field } from './field'
import { Input } from './input'
import { Label } from './label'
import { SearchInput } from './search-input'
import { Textarea } from './textarea'

describe('Label', () => {
  it('keeps "Optional" a separate word in the accessible name', () => {
    render(
      <>
        <Label htmlFor="url" optional>
          URL
        </Label>
        <input id="url" />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'URL Optional' })).toBeInTheDocument()
  })

  it('hides the required asterisk from assistive technology', () => {
    render(
      <>
        <Label htmlFor="n" required>
          Name
        </Label>
        <input id="n" />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
  })
})

describe('Field', () => {
  it('names the control from its label and describes it with the hint', () => {
    render(
      <Field label="Run name" hint="Shown in alerts.">
        {(control) => <Input {...control} />}
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Run name' })
    expect(input).toHaveAccessibleDescription('Shown in alerts.')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('accepts `description` as an alias for `hint`', () => {
    render(
      <Field label="Owner" description="Who gets paged.">
        {(control) => <Input {...control} />}
      </Field>,
    )
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Who gets paged.')
  })

  it('marks the control invalid and announces the error, after the hint', () => {
    render(
      <Field label="Timeout" hint="Seconds." error="Too long.">
        {(control) => <Input {...control} />}
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Timeout' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Seconds. Too long.')
    expect(screen.getByRole('alert')).toHaveTextContent('Too long.')
  })

  it('passes required to the control, not just the asterisk', () => {
    render(
      <Field label="Name" required>
        {(control) => <Input {...control} />}
      </Field>,
    )
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeRequired()
  })
})

describe('Input', () => {
  it('keeps adornments out of the accessible name', () => {
    render(<Input aria-label="Budget" leading={<svg />} trailing="seconds" />)
    expect(screen.getByRole('textbox', { name: 'Budget' })).toBeInTheDocument()
  })

  it('focuses the text when the adornment area is pressed', async () => {
    render(<Input aria-label="Budget" leading={<svg data-testid="icon" />} />)
    await userEvent.pointer({ keys: '[MouseLeft]', target: screen.getByTestId('icon') })
    expect(screen.getByRole('textbox')).toHaveFocus()
  })
})

describe('Textarea', () => {
  it('is a multi-line textbox', () => {
    render(<Textarea aria-label="Prompt" />)
    expect(screen.getByRole('textbox', { name: 'Prompt' }).tagName).toBe('TEXTAREA')
  })
})

describe('SearchInput', () => {
  it('shows the shortcut while empty, and a named clear button once typed in', async () => {
    render(<SearchInput aria-label="Search runs" shortcut="⌘K" />)
    expect(screen.getByText('⌘K')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox'), 'eval')
    expect(screen.queryByText('⌘K')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument()
  })

  it('clears, notifies a controlled parent, and returns focus to the field', async () => {
    const onClear = vi.fn()
    function Controlled() {
      const [q, setQ] = useState('eval')
      return (
        <>
          <SearchInput aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} onClear={onClear} />
          <output>{q || 'empty'}</output>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent('empty')
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(onClear).toHaveBeenCalledOnce()
  })
})
