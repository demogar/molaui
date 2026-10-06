import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PromptInput } from './prompt-input'

const field = () => screen.getByRole('textbox', { name: 'Message' })

describe('PromptInput', () => {
  it('sends the trimmed prompt on Enter and clears itself', async () => {
    const onSubmit = vi.fn()
    render(<PromptInput label="Message" onSubmit={onSubmit} />)
    await userEvent.type(field(), '  hello  {Enter}')
    expect(onSubmit).toHaveBeenCalledWith('hello')
    expect(field()).toHaveValue('')
  })

  it('treats Shift+Enter as a newline', async () => {
    const onSubmit = vi.fn()
    render(<PromptInput label="Message" onSubmit={onSubmit} />)
    await userEvent.type(field(), 'a{Shift>}{Enter}{/Shift}b')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(field()).toHaveValue('a\nb')
  })

  it('in mod-enter mode, Enter is a newline and Ctrl+Enter sends', async () => {
    const onSubmit = vi.fn()
    render(<PromptInput label="Message" submitOn="mod-enter" onSubmit={onSubmit} />)
    await userEvent.type(field(), 'a{Enter}b')
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.type(field(), '{Control>}{Enter}{/Control}')
    expect(onSubmit).toHaveBeenCalledWith('a\nb')
  })

  it('turns send into stop while generating, and keeps the field editable', async () => {
    const onStop = vi.fn()
    render(<PromptInput label="Message" status="generating" onSubmit={vi.fn()} onStop={onStop} />)
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onStop).toHaveBeenCalledOnce()
    expect(field()).toBeEnabled()
  })

  it('keeps the draft offline and says why it cannot send', async () => {
    const onSubmit = vi.fn()
    render(<PromptInput label="Message" status="offline" defaultValue="draft" onSubmit={onSubmit} />)
    expect(field()).toHaveValue('draft')
    expect(screen.getByText(/Offline/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    await userEvent.type(field(), '{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
