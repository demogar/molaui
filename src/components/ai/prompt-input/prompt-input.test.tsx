import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AttachmentChip, PromptInput } from './prompt-input'

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

  it('in mod-enter mode, Cmd+Enter sends too', async () => {
    const onSubmit = vi.fn()
    render(<PromptInput label="Message" submitOn="mod-enter" onSubmit={onSubmit} />)
    await userEvent.type(field(), 'ship it')
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}')
    expect(onSubmit).toHaveBeenCalledWith('ship it')
  })

  it('tabs through remove, the field, the toolbar and Send, and Enter or Space activates them', async () => {
    const onSubmit = vi.fn()
    const onRemove = vi.fn()
    render(
      <PromptInput
        label="Message"
        defaultValue="Summarise the export"
        onSubmit={onSubmit}
        attachments={<AttachmentChip name="export.csv" onRemove={onRemove} />}
        toolbar={<button type="button">Attach</button>}
      />,
    )
    // The attachments sit above the field in the DOM, so their remove buttons come first.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Remove export.csv' })).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(onRemove).toHaveBeenCalledOnce()
    await userEvent.tab()
    expect(field()).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Attach' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Send' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('Summarise the export')
  })

  it('stops the run from the keyboard', async () => {
    const onStop = vi.fn()
    render(<PromptInput label="Message" status="generating" onSubmit={vi.fn()} onStop={onStop} />)
    screen.getByRole('button', { name: 'Stop' }).focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{Enter}')
    expect(onStop).toHaveBeenCalledTimes(2)
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

  it('groups the token estimate in a fixed locale, whatever the runtime default', () => {
    render(<PromptInput label="Message" onSubmit={vi.fn()} defaultValue={'x'.repeat(5000)} />)
    expect(screen.getByLabelText('About 1,250 tokens')).toHaveTextContent('~1,250 tok')
  })
})
