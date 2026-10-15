import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { QUERY_ARGS, QUERY_RESULT } from '../_story-data/fixtures'
import { HardState, HardStates as HardStatesFrame } from '../../../docs/blocks/hard-states'

import { ToolCall, ToolCallGroup } from './tool-call'

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
      </HardState>
      <HardState state="rtl">
        <ToolCall name="query_rollout" title="نتائج الإطلاق" status="succeeded" durationMs={1840} args={QUERY_ARGS} result={QUERY_RESULT} />
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
          'A long tool name and a long title truncate on the header’s one line, the name first, so the status and duration stay in view; in right to left the disclosure chevron and the duration change sides while the literals stay left to right; disabled is the header of a call waiting for approval, which cannot be collapsed because hiding it would hide the decision; the error opens itself with the message verbatim and a retry.',
      },
    },
  },
}
