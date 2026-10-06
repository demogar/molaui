import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button } from '../../button'
import { CHANGE_SUMMARY, DASHBOARD_DIFF, FLAG_CHANGES, FLAG_DIFF } from '../_story-data/change'

import { ChangeCount } from './change-count'
import { ChangeReview, FieldChanges, type ChangeDecision } from './change-review'
import { FileDiff } from './file-diff'

const meta = {
  title: 'AI/Change review',
  component: ChangeReview,
  args: {
    title: 'Roll variant B out to beginners',
    agent: 'Cayuco research agent',
    model: 'cayuco-deep-3',
    summary: <p className="m-0">{CHANGE_SUMMARY}</p>,
    onDecide: fn(),
  },
  decorators: [(Story) => <div className="max-w-5xl">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component: [
          'An agent proposes a change; a person reviews it and decides. The change is shown as the reviewer needs it — files as diffs, records as fields before → after — and the decision sits under it.',
          '',
          '- **Three decisions, one weight.** Approve, Request changes and Reject are the same size and variant, in one row, each a glyph and a word. A review screen that makes Approve the ink button has decided for the reviewer; on a change an agent will apply, that is a defect. Reject is not red: rejecting is the safe choice.',
          '- **A no needs a reason.** The agent acts on it — it revises the change or stops proposing it. With the reason empty, Reject and Request changes say what is missing in words, move focus to the field and do not call `onDecide`. The hint says so before anyone fails it.',
          '- **The outcome replaces the form** and takes focus, so it is heard once. It is not also a live region; that would say it twice.',
          '- **Diff lines are a list, not a table.** A table made a screen reader say "row 14 of 52, column 3" before every line. Each line has a +/− glyph, a wash and visually hidden "Added:"/"Removed:". Line numbers and glyphs are `select-none` and `aria-hidden`, so a copied hunk is code.',
          '- **Hunk toggles are named by their visible text.** An `aria-label` failed axe’s label-content-name-mismatch: a voice-control user says what they see.',
          '- **Split is a container query.** `layout="split"` sets old against new once the diff itself is 48rem wide, so a diff in a side panel stays unified.',
          '- Paths, values and ranges are literals with `dir="ltr"`. Under forced colours the frames keep a 1px inset so their outline is not painted over.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ChangeReview>

export default meta
type Story = StoryObj<typeof meta>

const files = (layout: 'unified' | 'split' = 'unified') => (
  <>
    <FieldChanges title="Feature flag onboarding_puzzle_rush" changes={FLAG_CHANGES} />
    <FileDiff path="flags/onboarding_puzzle_rush.yaml" diff={FLAG_DIFF} layout={layout} />
    <FileDiff path="dashboards/onboarding.yaml" previousPath="dashboards/onboarding-v2.yaml" kind="renamed" diff={DASHBOARD_DIFF} layout={layout} />
  </>
)

export const Pending: Story = { args: { children: files() } }

export const Split: Story = {
  args: { children: files('split') },
  parameters: {
    docs: {
      description: {
        story: 'The same change with `layout="split"`. Wide enough, removals sit opposite the additions that replace them; at phone width it falls back to one column.',
      },
    },
  },
}

export const Approved: Story = {
  args: { children: files(), defaultDecision: { status: 'approved' }, reviewer: 'M. Herrera' },
}

export const ChangesRequested: Story = {
  args: {
    children: files(),
    reviewer: 'M. Herrera',
    defaultDecision: {
      status: 'changes_requested',
      reason: 'Keep the 28-day window on the dashboard and add the 14-day one beside it; the weekly review compares against 28.',
    },
  },
}

export const Rejected: Story = {
  args: {
    children: files(),
    reviewer: 'M. Herrera',
    defaultDecision: {
      status: 'rejected',
      reason: 'The guardrail already moved the wrong way. We ship nothing until the first-game delay is understood.',
    },
  },
}

function Controlled() {
  const [decision, setDecision] = React.useState<ChangeDecision | null>(null)
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button size="sm" variant="secondary" onClick={() => setDecision(null)} disabled={!decision}>
          Reset decision
        </Button>
      </div>
      <ChangeReview
        title="Roll variant B out to beginners"
        agent="Cayuco research agent"
        model="cayuco-deep-3"
        reviewer="M. Herrera"
        decision={decision}
        onDecide={(status, reason) => setDecision({ status, ...(reason ? { reason } : {}) })}
      >
        <FieldChanges title="Feature flag onboarding_puzzle_rush" changes={FLAG_CHANGES} />
      </ChangeReview>
    </div>
  )
}

export const TryIt: Story = {
  render: () => <Controlled />,
  parameters: {
    docs: {
      description: {
        story: 'Controlled. Press **Reject** with the reason empty: the error is stated, focus moves to the field and nothing is decided. Write a reason and decide; the outcome takes the form’s place and focus.',
      },
    },
  },
}

export const DiffOnly: StoryObj<typeof FileDiff> = {
  render: () => (
    <div className="flex flex-col gap-3">
      <FileDiff path="flags/onboarding_puzzle_rush.yaml" diff={FLAG_DIFF} headingLevel={3} />
      <FileDiff path="alerts/crash_free.yaml" kind="added" headingLevel={3} hunks={[{ oldStart: 0, newStart: 1, lines: [
        { kind: 'add', text: 'metric: crash_free_sessions' },
        { kind: 'add', text: 'threshold: 0.996' },
        { kind: 'add', text: 'channel: growth-onboarding-alerts' },
      ] }]} />
      <FileDiff path="flags/onboarding_v2_tooltip.yaml" kind="deleted" headingLevel={3} defaultCollapsed hunks={[{ oldStart: 1, newStart: 0, lines: [
        { kind: 'remove', text: 'flag: onboarding_v2_tooltip' },
        { kind: 'remove', text: 'owner: growth-onboarding' },
      ] }]} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '`FileDiff` on its own: a unified diff string, then structured `hunks` for an added file and a deleted one (collapsed). Added, Modified, Deleted and Renamed are each a mark and a word.',
      },
    },
  },
}

export const Counts: StoryObj<typeof ChangeCount> = {
  render: () => (
    <div className="flex flex-col gap-2">
      <ChangeCount added={12} removed={3} />
      <ChangeCount added={1} removed={0} />
      <ChangeCount added={1_204} removed={88} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Seen as “+12 −3”, heard as “12 lines added, 3 lines removed” — not “twelve minus three”.',
      },
    },
  },
}
