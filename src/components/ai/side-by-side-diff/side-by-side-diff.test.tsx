import { fireEvent, render, screen, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { FLAG_DIFF, PROMPT_AFTER, PROMPT_BEFORE } from '../_story-data/change'
import { diffLines } from '../change-review/parse-diff'
import { SideBySideDiff } from './side-by-side-diff'

describe('diffLines', () => {
  it('finds nothing between equal texts', () => {
    expect(diffLines('a\nb\n', 'a\nb')).toEqual([])
  })

  it('puts a replaced line’s removal before its addition, with numbered context', () => {
    expect(diffLines('a\nb\nc', 'a\nB\nc')).toEqual([
      {
        oldStart: 1,
        newStart: 1,
        lines: [
          { kind: 'context', text: 'a', oldNumber: 1, newNumber: 1 },
          { kind: 'remove', text: 'b', oldNumber: 2 },
          { kind: 'add', text: 'B', newNumber: 2 },
          { kind: 'context', text: 'c', oldNumber: 3, newNumber: 3 },
        ],
      },
    ])
  })

  it('keeps `context` lines around a change and splits changes far apart into hunks', () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n')
    const after = before.replace('line 2\n', 'line two\n').replace('line 18\n', 'line eighteen\n')
    const hunks = diffLines(before, after, { context: 2 })
    expect(hunks.map((h) => [h.oldStart, h.newStart, h.lines.length])).toEqual([
      [1, 1, 5],
      [16, 16, 6],
    ])
    expect(diffLines(before, after, { context: 8 })).toHaveLength(1)
  })

  it('starts an empty side at line 0, as git does for a new file', () => {
    const [hunk] = diffLines('', 'one\ntwo')
    expect(hunk).toMatchObject({ oldStart: 0, newStart: 1 })
    expect(hunk!.lines.map((l) => l.kind)).toEqual(['add', 'add'])
  })
})

const renderPrompt = () =>
  render(<SideBySideDiff title="System prompt" before={PROMPT_BEFORE} after={PROMPT_AFTER} beforeLabel="Live" afterLabel="Proposed" />)

describe('SideBySideDiff', () => {
  it('is a section named by its title, with the change counted in words', () => {
    renderPrompt()
    const section = screen.getByRole('region', { name: 'System prompt' })
    expect(within(section).getByText('2 lines added, 1 line removed')).toBeInTheDocument()
  })

  it('names each pane by its label and the title, and makes both focusable regions', () => {
    renderPrompt()
    const live = screen.getByRole('region', { name: 'Live System prompt' })
    const proposed = screen.getByRole('region', { name: 'Proposed System prompt' })
    expect(live).toHaveAttribute('tabindex', '0')
    expect(proposed).toHaveAttribute('tabindex', '0')
    expect(live).toHaveAttribute('data-scroll-edge')
  })

  it('says Removed: and Added: on changed lines, with the glyph and gutter hidden', () => {
    renderPrompt()
    const live = screen.getByRole('region', { name: 'Live System prompt' })
    const proposed = screen.getByRole('region', { name: 'Proposed System prompt' })
    const removed = within(live).getByText(/onboarding|billing, access, data, or general/, { selector: '[dir="ltr"]' }).closest('li')!
    expect(removed).toHaveAttribute('data-kind', 'remove')
    expect(removed).toHaveTextContent('Removed:')
    expect(removed.querySelector('[data-part="gutter"]')).toHaveAttribute('aria-hidden', 'true')
    expect(removed.querySelector('[data-part="gutter"]')).toHaveTextContent('−')
    const added = within(proposed).getAllByText(/Added:/)
    expect(added).toHaveLength(2)
  })

  it('pads the shorter side with blank rows hidden from a screen reader', () => {
    const { container } = renderPrompt()
    const fillers = container.querySelectorAll('[data-part="filler"]')
    expect(fillers).toHaveLength(1)
    expect(fillers[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('moves focus to the old pane, then the new, with Tab', async () => {
    const user = userEvent.setup()
    renderPrompt()
    await user.tab()
    expect(screen.getByRole('region', { name: 'Live System prompt' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('region', { name: 'Proposed System prompt' })).toHaveFocus()
  })

  it('scrolls the two panes together', () => {
    renderPrompt()
    const live = screen.getByRole('region', { name: 'Live System prompt' })
    const proposed = screen.getByRole('region', { name: 'Proposed System prompt' })
    live.scrollLeft = 120
    fireEvent.scroll(live)
    expect(proposed.scrollLeft).toBe(120)
  })

  it('keeps the unified lines for a narrow container', () => {
    const { container } = renderPrompt()
    const unified = container.querySelector('.\\@3xl\\:hidden')
    expect(unified).not.toBeNull()
    expect(within(unified as HTMLElement).getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('takes a unified diff string, and says when nothing changed', () => {
    const { unmount } = render(<SideBySideDiff title="flags/help_panel_v2.yaml" diff={FLAG_DIFF} />)
    expect(screen.getAllByText(/@@ -1,12 @@/).length).toBeGreaterThan(0)
    unmount()
    render(<SideBySideDiff title="Same" before="a" after="a" />)
    expect(screen.getByText('No line changes.')).toBeInTheDocument()
  })
})
