import type * as React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ChangeCount } from './change-count'
import { ChangeReview, FieldChanges } from './change-review'
import { FileDiff } from './file-diff'
import { countChanges, pairLines, parseUnifiedDiff } from './parse-diff'

const DIFF = `diff --git a/a.yaml b/a.yaml
--- a/a.yaml
+++ b/a.yaml
@@ -3,4 +3,5 @@ rollout:
 rollout:
-  percent: 50
+  percent: 100
+  review_after: 2026-10-19
 guardrails:
\\ No newline at end of file
@@ -20,2 +21,2 @@
-  on: breach
+  on: breach_or_crash
`

describe('parseUnifiedDiff', () => {
  it('numbers old and new lines from the hunk header and skips file headers', () => {
    const hunks = parseUnifiedDiff(DIFF)
    expect(hunks).toHaveLength(2)
    expect(hunks[0]).toMatchObject({ oldStart: 3, newStart: 3, section: 'rollout:' })
    expect(hunks[0]!.lines).toEqual([
      { kind: 'context', text: 'rollout:', oldNumber: 3, newNumber: 3 },
      { kind: 'remove', text: '  percent: 50', oldNumber: 4 },
      { kind: 'add', text: '  percent: 100', newNumber: 4 },
      { kind: 'add', text: '  review_after: 2026-10-19', newNumber: 5 },
      { kind: 'context', text: 'guardrails:', oldNumber: 5, newNumber: 6 },
    ])
    expect(hunks[1]!.section).toBeUndefined()
  })

  it('counts additions and removals', () => {
    expect(countChanges(parseUnifiedDiff(DIFF))).toEqual({ added: 3, removed: 2 })
  })

  it('pairs each run of removals with the additions that replace it', () => {
    const rows = pairLines(parseUnifiedDiff(DIFF)[0]!.lines)
    expect(rows.map((r) => [r.old?.text ?? null, r.new?.text ?? null])).toEqual([
      ['rollout:', 'rollout:'],
      ['  percent: 50', '  percent: 100'],
      [null, '  review_after: 2026-10-19'],
      ['guardrails:', 'guardrails:'],
    ])
  })
})

describe('ChangeCount', () => {
  it('is heard as a sentence, not as arithmetic', () => {
    render(<ChangeCount added={12} removed={1} />)
    expect(screen.getByText('12 lines added, 1 line removed')).toHaveClass('sr-only')
    expect(screen.getByText('+12').parentElement).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('FileDiff', () => {
  it('renders lines as list items with a spoken change word and hidden gutters', () => {
    render(<FileDiff path="a.yaml" diff={DIFF} />)
    expect(screen.getByRole('heading', { name: 'a.yaml' })).toBeInTheDocument()
    const lists = screen.getAllByRole('list')
    expect(lists).toHaveLength(2)
    const items = within(lists[0]!).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[1]).toHaveTextContent('Removed:')
    expect(items[2]).toHaveTextContent('Added:')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const glyph = within(items[2]!).getByText('+')
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
    expect(glyph).toHaveClass('select-none')
    expect(within(items[2]!).getByText('  percent: 100', { normalizer: (s) => s })).toHaveAttribute('dir', 'ltr')
  })

  it('folds a hunk from a toggle named by its visible text, by keyboard', async () => {
    render(<FileDiff path="a.yaml" diff={DIFF} />)
    const toggle = screen.getByRole('button', { name: /^@@ -3,3 \+3,4 @@\s*rollout:$/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).not.toHaveAttribute('aria-label')
    toggle.focus()
    await userEvent.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('list')).toHaveLength(1)
  })

  it('names a rename by both paths', () => {
    render(<FileDiff path="b.yaml" previousPath="a.yaml" kind="renamed" hunks={[]} />)
    expect(screen.getByRole('heading', { name: /^a\.yaml\s*renamed to\s*b\.yaml$/ })).toBeInTheDocument()
    expect(screen.getByText('Renamed without changes to its content.')).toBeInTheDocument()
  })
})

describe('FieldChanges', () => {
  it('reads each field as before and after, and says when a side is not set', () => {
    render(<FieldChanges title="Flag" changes={[{ field: 'rollout.percent', before: '50', after: '100' }, { field: 'review_after', after: '2026-10-19' }]} />)
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['rollout.percent', 'review_after'])
    const definitions = screen.getAllByRole('definition')
    expect(definitions[0]).toHaveTextContent('Before: 50')
    expect(definitions[0]).toHaveTextContent('After: 100')
    expect(definitions[1]).toHaveTextContent('Before: not set')
  })
})

describe('ChangeReview', () => {
  const setup = (props: Partial<React.ComponentProps<typeof ChangeReview>> = {}) => {
    const onDecide = vi.fn()
    render(<ChangeReview title="Roll out B" agent="Cayuco research agent" onDecide={onDecide} {...props} />)
    return onDecide
  }

  it('gives the three decisions the same weight', () => {
    setup()
    const group = screen.getByRole('group', { name: 'Decision' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Approve', 'Request changes', 'Reject'])
    expect(new Set(buttons.map((b) => b.className)).size).toBe(1)
  })

  it.each([
    ['Reject', 'Say why you are rejecting it'],
    ['Request changes', 'Say what needs to change'],
  ])('%s without a reason states the error, focuses the field and does not decide', async (name, message) => {
    const onDecide = setup()
    await userEvent.click(screen.getByRole('button', { name }))
    expect(onDecide).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    const field = screen.getByRole('textbox', { name: 'Reason' })
    expect(field).toHaveFocus()
    expect(field).toHaveAttribute('aria-invalid', 'true')
  })

  it('decides with a reason, then replaces the form with the outcome and focuses it', async () => {
    const onDecide = setup({ reviewer: 'M. Herrera' })
    await userEvent.type(screen.getByRole('textbox', { name: 'Reason' }), '  Guardrail moved.  ')
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
    expect(onDecide).toHaveBeenCalledWith('rejected', 'Guardrail moved.')
    expect(screen.queryByRole('group', { name: 'Decision' })).not.toBeInTheDocument()
    const outcome = screen.getByText('Rejected').closest('[data-slot="change-decision"]')
    expect(outcome).toHaveFocus()
    expect(outcome).toHaveTextContent('Rejected by M. Herrera')
    expect(outcome).toHaveTextContent('Guardrail moved.')
    expect(outcome).not.toHaveAttribute('role')
  })

  it('approves without a reason, from the keyboard', async () => {
    const onDecide = setup()
    await userEvent.tab()
    expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onDecide).toHaveBeenCalledWith('approved', undefined)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('when controlled, shows only the decision it is given', async () => {
    const onDecide = setup({ decision: null })
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onDecide).toHaveBeenCalledOnce()
    expect(screen.getByRole('group', { name: 'Decision' })).toBeInTheDocument()
  })

  it('does not take focus for a decision that arrives already made', () => {
    setup({ defaultDecision: { status: 'approved' } })
    expect(document.body).toHaveFocus()
  })
})
