import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CodeBlock } from './code'
import { tokenizeJson } from './highlight-json'

describe('tokenizeJson', () => {
  it('separates keys from string values', () => {
    const kinds = tokenizeJson('{"id": "run_1", "n": 3, "ok": true, "x": null}')
      .filter((t) => t.kind !== 'plain' && t.kind !== 'punct')
      .map((t) => `${t.kind}:${t.text}`)
    expect(kinds).toEqual([
      'key:"id"',
      'string:"run_1"',
      'key:"n"',
      'number:3',
      'key:"ok"',
      'literal:true',
      'key:"x"',
      'literal:null',
    ])
  })

  it('reproduces its input exactly, even when the JSON is truncated mid-stream', () => {
    const partial = '{"query": "SELECT * FROM ev'
    expect(tokenizeJson(partial).map((t) => t.text).join('')).toBe(partial)
  })

  it('handles escaped quotes inside strings', () => {
    const src = '{"q": "say \\"hi\\""}'
    expect(tokenizeJson(src).find((t) => t.kind === 'string')?.text).toBe('"say \\"hi\\""')
  })
})

describe('CodeBlock', () => {
  it('names the scrollable region by its label so keyboard users can reach it', () => {
    render(<CodeBlock code="SELECT 1" language="sql" label="query.sql" />)
    const region = screen.getByLabelText('query.sql')
    expect(region.tagName).toBe('PRE')
    expect(region).toHaveAttribute('tabindex', '0')
  })

  it('copies the code and announces it', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<CodeBlock code='{"a":1}' language="json" />)
    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }))
    expect(writeText).toHaveBeenCalledWith('{"a":1}')
    expect(await screen.findByRole('status')).toHaveTextContent('Copied to clipboard')
  })

  it('toggles wrapping and reports it as a pressed state', async () => {
    render(<CodeBlock code="x" />)
    const toggle = screen.getByRole('button', { name: 'Wrap lines' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Do not wrap lines' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('CodeBlock keyboard', () => {
  it('tabs to the wrap toggle, the copy button, then the code, and the buttons take Enter and Space', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<CodeBlock code="SELECT 1" language="sql" label="query.sql" />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Wrap lines' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Do not wrap lines' })).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Wrap lines' })).toHaveAttribute('aria-pressed', 'false')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toHaveFocus()
    await user.keyboard(' ')
    expect(writeText).toHaveBeenCalledWith('SELECT 1')
    await user.keyboard('{Enter}')
    expect(writeText).toHaveBeenCalledTimes(2)
    await user.tab()
    expect(screen.getByLabelText('query.sql')).toHaveFocus()
  })

  it('keeps focus on the code while the arrow keys scroll it', async () => {
    // jsdom does not lay out or scroll, so this checks the part it can see:
    // the focusable <pre> holds focus through every arrow key (nothing traps or
    // reroutes them), which is what lets the browser scroll it natively.
    const user = userEvent.setup()
    render(<CodeBlock code="SELECT 1" language="sql" label="query.sql" />)
    const pre = screen.getByLabelText('query.sql')
    pre.focus()
    await user.keyboard('{ArrowDown}{ArrowUp}{ArrowRight}{ArrowLeft}')
    expect(pre).toHaveFocus()
    expect(pre).toHaveAttribute('tabindex', '0')
  })
})
