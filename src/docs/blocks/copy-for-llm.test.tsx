import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CopyForLlm } from './copy-for-llm'

const root = resolve(import.meta.dirname, '../../..')
const TWIN = 'components-actions-button--overview'

/** Serves md/<id>.md from docs/ai/md, the way Storybook's staticDirs does. */
function serveTwins() {
  return vi.fn(async (url: string) => {
    const id = /^md\/([a-z0-9-]+)\.md$/.exec(url)?.[1]
    try {
      return new Response(readFileSync(resolve(root, `docs/ai/md/${id}.md`), 'utf8'), { status: 200 })
    } catch {
      return new Response('', { status: 404 })
    }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Copy for LLM', () => {
  it('copies the page’s Markdown twin, and says so with a glyph, a word and a polite status', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', serveTwins())
    // jsdom has no ClipboardItem, so this exercises the writeText fallback.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<CopyForLlm title="Components/Actions/Button" />)

    const button = screen.getByRole('button', { name: 'Copy for LLM' })
    expect(button).toHaveAccessibleDescription(/this page as markdown/i)
    await user.click(button)

    expect(writeText).toHaveBeenCalledWith(readFileSync(resolve(root, `docs/ai/md/${TWIN}.md`), 'utf8'))
    expect(screen.getByRole('button', { name: 'Copied' })).toHaveAttribute('data-state', 'copied')
    expect(screen.getByRole('status')).toHaveTextContent('Copied the Button page as Markdown.')
    expect(screen.getByRole('link', { name: 'Open as Markdown' })).toHaveAttribute('href', `md/${TWIN}.md`)
  })

  it('says it did not copy when the twin cannot be fetched', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', serveTwins())
    render(<CopyForLlm title="Components/Actions/No such page" />)

    await user.click(screen.getByRole('button', { name: 'Copy for LLM' }))

    expect(screen.getByRole('button', { name: 'Not copied' })).toHaveAttribute('data-state', 'failed')
    expect(screen.getByRole('status')).toHaveTextContent(/could not copy/i)
  })

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', serveTwins())
    render(<CopyForLlm title="Components/Actions/Button" />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Copy for LLM' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('button', { name: 'Copied' })).toHaveFocus()
  })
})
