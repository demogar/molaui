import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { QUERY_ARGS, QUERY_RESULT } from '../_story-data/fixtures'
import { HardState, HardStates as HardStatesFrame } from '../../../docs/blocks/hard-states'
import { Field } from '../../field'
import { NumberInput } from '../../number-input'

import { ToolCall, ToolCallGroup, type ToolCallDecision } from './tool-call'

const meta = {
  title: 'AI/Tool call',
  tags: ['stable'],
  component: ToolCall,
  args: { name: 'query_rollout', title: 'Rollout results', status: 'succeeded', durationMs: 1840, args: QUERY_ARGS, result: QUERY_RESULT },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component: [
          'One tool invocation: what the model asked a system to do, with what, and what came back. Everything the machine did is a **literal** — operators inspect these and paste them into tickets.',
          '',
          '- **Collapsed by default, except when it needs you.** A run can make forty calls; forty open payloads is a wall. A failed call and a call waiting for approval open themselves — hiding them would hide the only thing that matters.',
          '- **Human in the loop.** Approval says *why* in words and gives Approve and Deny the same size and variant, as Change review does for its three decisions. A consent control that nudges is not consent; for a tool that writes to production it is a bug.',
          '- **Approved with edits is its own decision.** A person who changes an argument before approving gets a third outcome with its own glyph, word and ink, and the record keeps the proposed arguments beside the ones that ran, each change before → after. Calling it “approved” would claim the agent’s call ran as proposed.',
          '- **Working** is a strip of relleno along the top edge and a ticking clock — no spinner, no percentage.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ToolCall>

export default meta
type Story = StoryObj<typeof meta>

export const Succeeded: Story = {}

export const Open: Story = { args: { defaultOpen: true } }

function RunningCall() {
  const [startedAt] = React.useState(() => Date.now())
  return <ToolCall name="search_docs" title="Search the brief archive" status="running" startedAt={startedAt} args={{ query: 'help panel v2 guardrails', top_k: 5 }} />
}

export const Running: Story = { render: () => <RunningCall /> }

export const Failed: Story = {
  args: {
    name: 'query_warehouse',
    title: 'Segment breakdown',
    status: 'failed',
    durationMs: 412,
    result: undefined,
    error: 'PermissionDenied: role "agent_readonly" lacks SELECT on analytics.ro_0412_segments',
    onRetry: fn(),
  },
}

export const TimedOut: Story = {
  args: { name: 'fetch_dashboard', title: undefined, status: 'timed_out', durationMs: 30_000, result: undefined, error: 'deadline exceeded after 30s', onRetry: fn() },
}

export const NeedsApproval: Story = {
  args: {
    name: 'update_feature_flag',
    title: 'Roll out the help panel',
    status: 'waiting',
    durationMs: undefined,
    args: { flag: 'help_panel_v2', variant: 'panel', audience: 'plan_starter', percent: 100 },
    result: undefined,
    approval: {
      reason: 'It changes a live feature flag for every new Starter workspace. The agent cannot undo this on its own.',
      onApprove: fn(),
      onDeny: fn(),
      approveLabel: 'Approve rollout',
      denyLabel: 'Deny',
    },
  },
}

const REFUND_ARGS = { charge: 'ch_31b0', amount_usd: 240, reason: 'duplicate_charge' }

function EditBeforeApprovingCall() {
  const [decision, setDecision] = React.useState<ToolCallDecision | null>(null)
  return (
    <ToolCall
      name="billing.issue_refund"
      title="Refund the duplicate charge"
      status={decision ? (decision.status === 'denied' ? 'cancelled' : 'succeeded') : 'waiting'}
      durationMs={decision && decision.status !== 'denied' ? 1_240 : undefined}
      args={REFUND_ARGS}
      decision={decision}
      approval={{
        reason: 'It moves money back to the customer’s card, and the agent cannot reverse a refund.',
        approveLabel: 'Approve refund',
        onApprove: () => setDecision({ status: 'approved', by: 'M. Herrera' }),
        onDeny: () => setDecision({ status: 'denied', by: 'M. Herrera' }),
        edit: {
          validate: (draft) => {
            const amount = draft.amount_usd
            if (typeof amount !== 'number') return 'Enter an amount.'
            if (amount <= 0) return 'The refund must be more than 0.'
            if (amount > 240) return 'The refund can be at most 240, the amount of the charge.'
            return null
          },
          render: (draft, setDraft) => (
            <Field label="Amount to refund" hint="Up to 240, the amount of the charge.">
              {(control) => (
                <NumberInput
                  {...control}
                  locale="en-US"
                  unit="USD"
                  value={typeof draft.amount_usd === 'number' ? draft.amount_usd : null}
                  onValueChange={(value) => setDraft({ ...draft, amount_usd: value })}
                />
              )}
            </Field>
          ),
          onApprove: (edited) => setDecision({ status: 'approved_with_edits', by: 'M. Herrera', editedArgs: edited }),
        },
      }}
    />
  )
}

export const EditBeforeApproving: Story = {
  name: 'Edit before approving',
  render: () => <EditBeforeApprovingCall />,
  parameters: {
    docs: {
      description: {
        story:
          'The agent proposes refunding 240; only one of the two charges was a duplicate, so the person refunds 120. **Edit and approve** opens the fields the app passes in `approval.edit.render`, here one `NumberInput`, with focus in the first. **Approve with edits** is not offered until an argument has changed and `validate` accepts the draft; the reason is said beside it, in words. Approving records `approved_with_edits`, focus moves to that record, and it says the change as one sentence.',
      },
    },
  },
}

export const ApprovedWithEdits: Story = {
  name: 'Approved with edits',
  args: {
    name: 'rollout',
    title: 'Roll out the help panel',
    status: 'succeeded',
    durationMs: 2_310,
    args: { flag: 'help_panel_v2', audience: 'plan_starter', percent: 50 },
    result: undefined,
    decision: { status: 'approved_with_edits', by: 'R. Pinzón', editedArgs: { flag: 'help_panel_v2', audience: 'plan_starter', percent: 10 } },
  },
  parameters: {
    docs: {
      description: {
        story:
          'The record of a call a person changed: the decision under the header, visible while the call is collapsed, with each changed argument before → after. Open, the details show the arguments as proposed and as approved, so a report has both.',
      },
    },
  },
}

export const Decisions: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <ToolCall
        name="update_feature_flag"
        title="Roll out the help panel"
        status="succeeded"
        durationMs={1_120}
        args={{ flag: 'help_panel_v2', percent: 100 }}
        decision={{ status: 'approved', by: 'R. Pinzón' }}
      />
      <ToolCall
        name="send_email"
        title="Reply to the customer"
        status="succeeded"
        durationMs={860}
        args={{ to: 'ana@cayuco.example', subject: 'Your refund', body: 'We refunded both charges.' }}
        decision={{
          status: 'approved_with_edits',
          by: 'M. Herrera',
          editedArgs: { to: 'ana@cayuco.example', subject: 'Your refund', body: 'We refunded the duplicate charge.' },
        }}
      />
      <ToolCall
        name="billing.close_account"
        title="Close the workspace"
        status="cancelled"
        args={{ workspace: 'ws_7c21' }}
        decision={{ status: 'denied', by: 'M. Herrera' }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The three decisions, each a glyph, a word and an ink: Approved, Approved with edits and Denied. The decision is about the person; the status beside the name is about execution, so a denied call reads as cancelled and an approved one can still fail.',
      },
    },
  },
}

export const ParallelCalls: Story = {
  render: () => (
    <ToolCallGroup count={3}>
      <ToolCall name="query_rollout" status="succeeded" durationMs={1840} args={QUERY_ARGS} result={QUERY_RESULT} />
      <ToolCall name="search_docs" status="succeeded" durationMs={620} args={{ query: 'help panel v2 guardrails' }} result="3 passages" />
      <ToolCall name="fetch_dashboard" status="failed" durationMs={30_000} error="deadline exceeded after 30s" onRetry={fn()} />
    </ToolCallGroup>
  ),
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <ToolCall
          name="query_warehouse_segments_by_plan_and_signup_cohort"
          title="Tickets per 1,000 workspaces by plan, signup cohort and help panel variant"
          status="succeeded"
          durationMs={1840}
          args={QUERY_ARGS}
          result={QUERY_RESULT}
        />
        <ToolCall
          name="send_email"
          status="succeeded"
          durationMs={860}
          args={{ body: 'We refunded both charges on invoice INV-2026-0311 to the card ending 4242; you should see them within five to ten business days.' }}
          decision={{
            status: 'approved_with_edits',
            by: 'Maria Fernanda Herrera Castillo de los Ríos',
            editedArgs: { body: 'We refunded the duplicate charge on invoice INV-2026-0311 to the card ending 4242; you should see it within five to ten business days.' },
          }}
        />
      </HardState>
      <HardState state="rtl">
        <ToolCall name="query_rollout" title="نتائج الإطلاق" status="succeeded" durationMs={1840} args={QUERY_ARGS} result={QUERY_RESULT} />
        <ToolCall
          name="rollout"
          title="إطلاق لوحة المساعدة"
          status="succeeded"
          durationMs={2_310}
          args={{ flag: 'help_panel_v2', percent: 50 }}
          decision={{ status: 'approved_with_edits', by: 'ر. بينزون', editedArgs: { flag: 'help_panel_v2', percent: 10 } }}
        />
      </HardState>
      <HardState state="disabled">
        <ToolCall
          name="update_feature_flag"
          title="Roll out the help panel"
          status="waiting"
          args={{ flag: 'help_panel_v2', percent: 100 }}
          approval={{
            reason: 'It changes a live feature flag for every new Starter workspace.',
            onApprove: fn(),
            onDeny: fn(),
            approveLabel: 'Approve rollout',
            denyLabel: 'Deny',
          }}
        />
      </HardState>
      <HardState state="error">
        <ToolCall
          name="query_warehouse"
          title="Segment breakdown"
          status="failed"
          durationMs={412}
          error='PermissionDenied: role "agent_readonly" lacks SELECT on analytics.ro_0412_segments'
          onRetry={fn()}
        />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long tool name and a long title truncate on the header’s one line, the name first, so the status and duration stay in view, and a long edited value wraps inside its before and after; in right to left the arrow between them points the other way, and the disclosure chevron and the duration change sides while the literals stay left to right; disabled is the header of a call waiting for approval, which cannot be collapsed because hiding it would hide the decision; the error opens itself with the message verbatim and a retry.',
      },
    },
  },
}
