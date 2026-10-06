import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { QUERY_ARGS, QUERY_RESULT } from '../_story-data/fixtures'

import { ToolCall, ToolCallGroup } from './tool-call'

const meta = {
  title: 'AI/Tool call',
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
